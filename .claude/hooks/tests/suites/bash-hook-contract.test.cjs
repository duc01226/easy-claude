'use strict';

/**
 * Process-boundary regression suite for every hook in the Bash PreToolUse
 * chain. The assertions intentionally inspect both streams and the real child
 * exit status: a hook that silently calls process.exit(0) cannot pass this
 * contract.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SETTINGS = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
const HOOKS = SETTINGS.hooks.PreToolUse
  .filter(group => String(group.matcher || '').split('|').includes('Bash'))
  .flatMap(group => group.hooks || [])
  .map(entry => String(entry.command || '').match(/\.claude[\\/]hooks[\\/]([^"']+\.cjs)/)?.[1])
  .filter(Boolean);
const HOOK_NAMES = HOOKS.map(file => file.replace('.cjs', ''));
const BENIGN = createPreToolUseInput('Bash', { command: 'echo hi' });

function runHook(file, input, options = {}) {
  return new Promise(resolve => {
    const env = { ...process.env, ...(options.env || {}) };
    for (const key of options.unsetEnv || []) delete env[key];
    const proc = spawn(process.execPath, [getHookPath(file)], {
      cwd: options.cwd || ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, options.timeout || 10000);
    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    proc.on('error', error => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}${error.message}`, timedOut: false });
    });

    if (options.raw !== undefined) proc.stdin.end(options.raw);
    else if (input !== undefined) proc.stdin.end(typeof input === 'string' ? input : JSON.stringify(input));
    else proc.stdin.end();
  });
}

function runLongChild() {
  const runnerPath = path.join(ROOT, '.claude', 'hooks', 'lib', 'hook-runner.cjs').replace(/\\/g, '/');
  const script = `const { runHook } = require(${JSON.stringify(runnerPath)}); runHook('timeout-probe', () => new Promise(() => {}), { parseEvent: false, timeout: 40 });`;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000
  });
  assert.equal(result.status, 0, result.stderr || 'long-running child failed');
  assert.match(result.stderr, /timed out after 40ms/, 'Referenced timeout must report before the child exits');
}

function assertCleanAllow(result, label) {
  assert.equal(result.code, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stdout, '', `${label}: unexpected stdout ${JSON.stringify(result.stdout)}`);
  assert.equal(result.stderr, '', `${label}: unexpected stderr ${JSON.stringify(result.stderr)}`);
  assert.equal(result.timedOut, false, `${label}: timed out`);
}

function assertVisibleBlock(result, label) {
  assert.equal(result.code, 2, `${label}: expected exit 2, got ${result.code}`);
  assert.equal(result.stdout, '', `${label}: block leaked stdout`);
  assert.ok(result.stderr.trim().length > 0, `${label}: block had no stderr diagnostic`);
  assert.equal(result.timedOut, false, `${label}: timed out`);
}

const tests = [
  {
    name: 'R08 Node-looking quoted data and unsupported option roles are never rewritten',
    fn: async () => {
      const commands = [
        String.raw`echo 'node -e "console.log(\!true)"'`,
        String.raw`printf '%s' 'node -e "console.log(\!true)"'`,
        String.raw`cat <<'EOF'
node -e "console.log(\!true)"
EOF`,
        String.raw`node --require -e "console.log(\!true)"`,
        String.raw`node script.js -e "console.log(\!true)"`,
        String.raw`node -e "console.log(\!true, $VALUE)"`,
        String.raw`node -e "console.log(\!true)"suffix`,
        String.raw`node -e 'console.log(\!true)'`,
        String.raw`echo $(node -e "console.log(\!true)")`,
        String.raw`$(pwd)/node -e "console.log(\!true)"`,
        String.raw`node -e "console.log(\!true)" &&`,
        String.raw`node -e`,
        String.raw`node -e "console.log(true)"`,
        String.raw`echo -e "console.log(\!true)"`,
        String.raw`node -p "console.log(\!true)"`
      ];
      for (const command of commands) {
        assertCleanAllow(await runHook('windows-command-detector.cjs', createPreToolUseInput('Bash', { command })), command);
      }
      const command = String.raw`  echo 'node -e "console.log(\!data)"'; node --experimental-vm-modules -e "if(\!a && \!b) {}" && echo '\!tail'`;
      const input = { command, timeout: 123, description: 'preserve all fields', cwd: ROOT };
      const result = await runHook('windows-command-detector.cjs', createPreToolUseInput('Bash', input));
      assert.equal(result.code, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.timedOut, false);
      assert.deepEqual(JSON.parse(result.stdout), { hookSpecificOutput: {
        hookEventName: 'PreToolUse', updatedInput: {
          ...input, command: command.replace('if(\\!a && \\!b)', 'if(!a && !b)')
        }
      } });
      const executablePath = String.raw`"/tools/node.exe" --no-warnings -e "console.log(\!true)"`;
      const pathResult = await runHook('windows-command-detector.cjs', createPreToolUseInput('Bash', { command: executablePath }));
      assert.equal(pathResult.code, 0);
      assert.equal(pathResult.stderr, '');
      assert.equal(JSON.parse(pathResult.stdout).hookSpecificOutput.updatedInput.command, executablePath.replace('\\!true', '!true'));
    }
  },
  {
    // Regression: the detector returned only the FIRST eligible eval argument and rewrote
    // just that span, leaving every later `node -e` in a compound command still carrying the
    // invalid unicode escape. Each statement is modeled independently, so each eligible
    // argument must be repaired — and nothing else may move.
    name: 'R08b compound Node eval repair covers every eligible argument, not just the first',
    fn: async () => {
      const command = String.raw`echo 'node -e "console.log(\!data)"'; node -e "console.log(\!true)" && node --no-warnings -e "console.log(\!false)"; echo '\!tail'`;
      const input = { command, timeout: 321, description: 'every field preserved', cwd: ROOT };
      const result = await runHook('windows-command-detector.cjs', createPreToolUseInput('Bash', input));
      assert.equal(result.code, 0);
      assert.equal(result.stderr, '');
      assert.equal(result.timedOut, false);
      assert.deepEqual(JSON.parse(result.stdout), { hookSpecificOutput: {
        hookEventName: 'PreToolUse', updatedInput: {
          ...input,
          command: command
            .replace('console.log(\\!true)', 'console.log(!true)')
            .replace('console.log(\\!false)', 'console.log(!false)')
        }
      } });
      const fixed = JSON.parse(result.stdout).hookSpecificOutput.updatedInput.command;
      assert.ok(fixed.includes(String.raw`'node -e "console.log(\!data)"'`), 'quoted Node-looking data stays escaped');
      assert.ok(fixed.includes(String.raw`echo '\!tail'`), 'non-Node tail stays escaped');
    }
  },
  {
    name: 'R37 valid Windows block diagnoses category without reflecting command secrets',
    fn: async () => {
      const secret = 'SYNTHETIC_WINDOWS_BLOCK_SECRET';
      const command = `  type ${secret}.txt`;
      const result = await runHook('windows-command-detector.cjs', createPreToolUseInput('Bash', { command }));
      assertVisibleBlock(result, 'valid secret-bearing block');
      assert.match(result.stderr, /Windows CMD Syntax Detected/);
      assert.match(result.stderr, /type \(view file\)/);
      assert.equal(result.stderr.includes(secret), false);
      assert.equal(result.stderr.includes(command.trim()), false);
    }
  },
  {
    name: 'R2 timeout terminates active work after draining and input diagnostics never reflect payloads',
    fn: async () => {
      const runner = JSON.stringify(path.join(ROOT, '.claude/hooks/lib/hook-runner.cjs'));
      for (const wrapper of ['runHook', 'runBlockingHook']) {
        const result = spawnSync(process.execPath, ['-e', `
          const { ${wrapper} } = require(${runner});
          ${wrapper}('active-timeout', () => {
            process.stdout.write('x'.repeat(1024 * 1024));
            process.stderr.write('z'.repeat(1024 * 1024));
            setInterval(() => {}, 100);
            setTimeout(() => process.stdout.write('LATE-HANDLER'), 3000);
            return new Promise(() => {});
          }, { timeout: 40, parseEvent: false, errorExitCode: 2 });
        `], { input: '{}', encoding: 'utf8', timeout: 2000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
        assert.equal(result.error, undefined, 'Timed-out wrapper must end despite active handles');
        assert.equal(result.status, wrapper === 'runHook' ? 2 : 0);
        assert.equal(result.stdout, 'x'.repeat(1024 * 1024), 'Queued output must drain without late handler output');
        assert.match(result.stderr, /timed out after 40ms/);
        assert.ok(result.stderr.startsWith('z'.repeat(1024 * 1024)), 'Queued stderr must drain too');
      }
      const stalled = spawnSync(process.execPath, ['-e', `
        const { runHook } = require(${runner});
        const write = process.stdout.write.bind(process.stdout);
        process.stdout.write = (chunk, callback) => chunk === '' ? false : write(chunk, callback);
        runHook('stalled-drain', () => new Promise(() => {}), { timeout: 40, errorExitCode: 2 });
      `], { input: '{}', encoding: 'utf8', timeout: 2000, windowsHide: true });
      assert.equal(stalled.error, undefined, 'Missing drain callback must not hang timeout finalization');
      assert.equal(stalled.status, 2);
      assert.match(stalled.stderr, /timed out after 40ms/);
      const success = spawnSync(process.execPath, ['-e', `
        const { runHook } = require(${runner});
        runHook('drain-success', () => 'y'.repeat(1024 * 1024), { outputResult: true });
      `], { input: '{}', encoding: 'utf8', timeout: 5000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
      assert.equal(success.status, 0);
      assert.equal(success.stdout, 'y'.repeat(1024 * 1024));

      const secret = 'R2SECRET'; // Short enough to catch JSON parser excerpt reflection.
      for (const raw of [secret, JSON.stringify({ ...BENIGN, hook_event_name: secret })]) {
        const result = await runHook('windows-command-detector.cjs', undefined, { raw });
        assert.equal(result.code, 0);
        assert.equal(result.stdout, '');
        assert.ok(result.stderr.length > 0, 'Input errors must remain visible');
        assert.equal(result.stderr.includes(secret), false, 'Input errors must not reflect payload data');
      }
      const parser = JSON.stringify(path.join(ROOT, '.claude/hooks/lib/stdin-parser.cjs'));
      for (const throwOnError of [false, true]) {
        const result = spawnSync(process.execPath, ['-e', `
          const { parseStdinSync } = require(${parser});
          try { parseStdinSync({ throwOnError: ${throwOnError} }); }
          catch (error) { process.stderr.write(error.message); }
        `], { input: secret, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0);
        assert.match(result.stderr, /invalid JSON/i);
        assert.equal(result.stderr.includes(secret), false);
      }
      for (const raw of ['null', '[]', JSON.stringify(secret)]) {
        const result = spawnSync(process.execPath, ['-e', `
          const { parseHookEvent } = require(${parser});
          process.stdout.write(JSON.stringify(parseHookEvent()));
        `], { input: raw, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0);
        assert.match(result.stderr, /must be a JSON object/);
        assert.equal(result.stderr.includes(secret), false);
        assert.deepEqual(JSON.parse(result.stdout).raw, {});
      }
    }
  },
  {
    name: 'D4 every Bash-path hook allows echo hi with empty stdout/stderr',
    fn: async () => {
      for (const file of HOOKS) assertCleanAllow(await runHook(file, BENIGN), file);
    }
  },
  {
    name: 'D4 each blocking hook emits exit 2 and a visible stderr message',
    fn: async () => {
      const cases = [
        ['windows-command-detector.cjs', createPreToolUseInput('Bash', { command: 'type file.txt' })],
        ['bash-shell-guard.cjs', createPreToolUseInput('Bash', { command: "$text = @'\nhello\n'@" })],
        ['git-commit-block.cjs', { ...BENIGN, tool_input: { command: 'git commit -m x' } }],
        ['scout-block.cjs', createPreToolUseInput('Bash', { command: 'ls node_modules' })],
        ['privacy-block.cjs', createPreToolUseInput('Bash', { command: 'cat .env' })],
        ['privacy-block.cjs', createPreToolUseInput('Bash', { command: 'echo $(cat .env)' })],
        ['path-boundary-block.cjs', createPreToolUseInput('Bash', { command: 'cat ../outside.txt' })]
      ];
      for (const [file, input] of cases) assertVisibleBlock(await runHook(file, input), file);
      assertCleanAllow(await runHook('doc-sync-gate.cjs', BENIGN), 'doc-sync-gate advisory');
    }
  },
  {
    name: 'D4 malformed delivery is visible and security hooks deny closed',
    fn: async () => {
      for (const file of ['windows-command-detector.cjs', 'bash-shell-guard.cjs', 'doc-sync-gate.cjs', 'scout-block.cjs']) {
        const result = await runHook(file, undefined, { raw: '{not-json' });
        assert.equal(result.code, 0, `${file}: advisory parse failure should preserve allow`);
        assert.ok(result.stderr.includes(file.replace('.cjs', '')), `${file}: missing parse breadcrumb`);
        assert.equal(result.stdout, '', `${file}: parse failure leaked stdout`);
      }
      for (const file of ['git-commit-block.cjs', 'privacy-block.cjs', 'path-boundary-block.cjs']) {
        const result = await runHook(file, undefined, { raw: '{not-json' });
        assertVisibleBlock(result, `${file} malformed JSON`);
      }
      for (const file of ['git-commit-block.cjs', 'privacy-block.cjs', 'path-boundary-block.cjs']) {
        const result = await runHook(file, { ...BENIGN, tool_input: { command: 42 } });
        assertVisibleBlock(result, `${file} invalid Bash command`);
      }
    }
  },
  {
    name: 'D4 rewrite uses the documented PreToolUse envelope and preserves tool input fields',
    fn: async () => {
      const escapedBang = String.raw`node -e "console.log(\!true)" && echo unrelated-tail`;
      const input = createPreToolUseInput('Bash', {
        command: escapedBang,
        timeout: 12000,
        cwd: ROOT
      });
      const result = await runHook('windows-command-detector.cjs', input);
      assert.equal(result.code, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.deepEqual(output.hookSpecificOutput?.updatedInput, {
        command: 'node -e "console.log(!true)" && echo unrelated-tail',
        timeout: 12000,
        cwd: ROOT
      });
      assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
      assert.equal(Object.hasOwn(output.hookSpecificOutput, 'permissionDecision'), false,
        'Syntax correction must not auto-approve the command or its unrelated compound tail');
    }
  },
  {
    name: 'D4 all hooks allow benign input with CLAUDE_PROJECT_DIR unset and an unexpected cwd',
    fn: async () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-cwd-'));
      try {
        for (const file of HOOKS) {
          const result = await runHook(file, BENIGN, { cwd, unsetEnv: ['CLAUDE_PROJECT_DIR'] });
          assert.equal(result.code, 0, `${file}: ${result.stderr}`);
          assert.equal(result.stdout, '', `${file}: unexpected stdout`);
          assert.equal(result.stderr, '', `${file}: unexpected stderr ${JSON.stringify(result.stderr)}`);
          assert.equal(result.timedOut, false, `${file}: timed out`);
        }
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'D4 repeated calls remain identical after a long-running child command',
    fn: async () => {
      for (const file of HOOKS) {
        const first = await runHook(file, BENIGN);
        runLongChild();
        const second = await runHook(file, BENIGN);
        assert.deepEqual(
          { code: second.code, stdout: second.stdout, stderr: second.stderr, timedOut: second.timedOut },
          { code: first.code, stdout: first.stdout, stderr: first.stderr, timedOut: first.timedOut },
          file
        );
      }
    }
  },
  {
    name: 'D3 CLAUDE_HOOK_DEBUG records every hook decision and rotates bounded logs',
    fn: async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-debug-'));
      const logPath = path.join(dir, 'debug', 'bash-hooks.log');
      try {
        assert.equal(HOOKS.length, 7, 'Settings must expose all seven Bash PreToolUse hooks');
        assert.equal(new Set(HOOKS).size, HOOKS.length, 'Bash hook registration must not duplicate a hook');
        for (const file of HOOKS) {
          const result = await runHook(file, BENIGN, {
            env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
          });
          assertCleanAllow(result, `${file} debug run`);
        }
        const records = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(records.length, HOOKS.length, 'One debug record is required per Bash hook invocation');
        assert.deepEqual(new Set(records.map(record => record.hook)), new Set(HOOK_NAMES));
        for (const record of records) {
          assert.equal(record.decision, 'allow');
          assert.equal(record.code, 0);
          assert.equal(typeof record.durationMs, 'number');
          assert.ok(record.durationMs >= 0);
          assert.equal(record.event, 'PreToolUse');
          assert.equal(record.tool, 'Bash');
          assert.equal(Object.hasOwn(record, 'command'), false);
          assert.equal(Object.hasOwn(record, 'path'), false);
        }

        const blocked = await runHook('privacy-block.cjs', createPreToolUseInput('Bash', { command: 'cat .env' }), {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
        });
        assertVisibleBlock(blocked, 'debug block run');
        const blockRecord = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line)).at(-1);
        assert.equal(blockRecord.decision, 'block');
        assert.equal(blockRecord.code, 2);
        assert.equal(Object.hasOwn(blockRecord, 'command'), false);
        assert.equal(Object.hasOwn(blockRecord, 'path'), false);

        const malformed = await runHook('windows-command-detector.cjs', undefined, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
        });
        assert.equal(malformed.code, 0);
        const errorRecord = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line)).at(-1);
        assert.equal(errorRecord.decision, 'error-allow');
        assert.equal(errorRecord.code, 0);
        assert.equal(errorRecord.error.name, 'Error');
        assert.equal(typeof errorRecord.error.code, 'string');
        assert.equal(Object.hasOwn(errorRecord.error, 'message'), false);
        assert.equal(Object.hasOwn(errorRecord, 'command'), false);
        assert.equal(Object.hasOwn(errorRecord, 'path'), false);

        const concurrentLogPath = path.join(dir, 'debug', 'concurrent.log');
        const concurrent = await Promise.all(HOOKS.map(file => runHook(file, BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: concurrentLogPath }
        })));
        for (const result of concurrent) assertCleanAllow(result, 'concurrent debug run');
        const concurrentRecords = fs.readFileSync(concurrentLogPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(concurrentRecords.length, HOOKS.length);
        assert.deepEqual(new Set(concurrentRecords.map(record => record.hook)), new Set(HOOK_NAMES));

        fs.writeFileSync(logPath, 'x'.repeat(1024 * 1024));
        const rotated = await runHook('windows-command-detector.cjs', BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
        });
        assertCleanAllow(rotated, 'rotation run');
        assert.ok(fs.existsSync(`${logPath}.1`), 'debug log did not rotate');
        assert.equal(JSON.parse(fs.readFileSync(logPath, 'utf8').trim()).hook, 'windows-command-detector');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'D3 debug sink failure is visible without changing a benign decision',
    fn: async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-debug-sink-'));
      try {
        const result = await runHook('windows-command-detector.cjs', BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: dir }
        });
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /CLAUDE_HOOK_DEBUG log failure/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }
];

module.exports = {
  name: 'bash-hook-contract',
  tests
};
