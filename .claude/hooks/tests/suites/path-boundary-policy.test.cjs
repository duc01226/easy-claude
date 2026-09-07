'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { inspectCommand } = require('../../lib/command-inspection.cjs');
const { evaluateBoundary, unwrapCommand } = require('../../lib/path-boundary-policy.cjs');

const ROOT = path.resolve(__dirname, '../../..', '..');
const HOOK = path.resolve(__dirname, '../../path-boundary-block.cjs');

function lexicalResolver() {
  return { resolve(value, base) { return path.resolve(base, value); } };
}

function evaluate(command, extra = {}) {
  return evaluateBoundary({
    toolName: 'Bash',
    toolInput: command === undefined ? {} : { command },
    eventCwd: ROOT,
    projectRoot: ROOT,
    allowlist: [],
    inspect: inspectCommand,
    resolver: lexicalResolver(),
    ...extra
  });
}

function runHook(command, toolInput = { command }, event = {}) {
  const input = { tool_name: 'Bash', cwd: ROOT, ...event, tool_input: toolInput };
  return spawnSync(process.execPath, [HOOK], {
    cwd: ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 10000
  });
}

const tests = [
  {
    name: 'R05 wrapper grammar is explicit, bounded and preserves child scope',
    fn() {
      for (const prefix of ['env', 'env.exe -i', 'env --ignore-environment', 'env -0', 'env --null', 'env -u NAME', 'env -uNAME', 'env --unset=NAME', 'env NAME=value', 'env --', 'sudo', 'sudo -n -E -H', 'sudo --non-interactive --preserve-env --set-home', 'sudo -u user', 'sudo -uuser', 'sudo --user=user', 'sudo -gstaff', 'sudo --group staff', 'command -p', 'builtin', 'exec -c -l -a name', 'env sudo -g staff']) {
        assert.equal(evaluate(`${prefix} cat ../outside.txt`).status, 'BLOCK', prefix);
        assert.equal(evaluate(`${prefix} cat README.md`).status, 'ALLOW', prefix);
      }
      for (const command of ['env', 'env -u', 'env -C "" cat README.md', 'env --chdir . --chdir . cat README.md', 'sudo -g "$GROUP" cat README.md', 'env "$COMMAND" README.md', 'env -S "cat README.md"', 'env --split-string="cat README.md"', 'env -i env -i env -i env -i env cat README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
      }
      const wrapper = unwrapCommand(inspectCommand('env --chdir=docs cat README.md > result.txt').statements[0]);
      assert.deepEqual(wrapper.cwdChanges, ['docs']);
      assert.equal(wrapper.inner.command.value, 'cat');
      assert.equal(wrapper.inner.redirects[0].target.value, 'result.txt');
      assert.equal(unwrapCommand(inspectCommand('echo data').statements[0]), null);
      const nested = evaluate('env -C docs git -C .. diff -- README.md; cat CLAUDE.md');
      assert.equal(nested.status, 'ALLOW');
      assert.equal(path.relative(ROOT, nested.paths.find(row => row.role === 'git-diff-pathspec').resolved), 'README.md');
      assert.equal(evaluate('env -C .. echo ok').status, 'BLOCK', 'cwd itself stays boundary checked');
      assert.equal(evaluate('env cat README.md > ../outside.txt').status, 'BLOCK', 'outer redirect remains checked');
      assert.equal(evaluate('env -C docs cat README.md > ../outside.txt').status, 'BLOCK', 'outer redirect precedes chdir');
      assert.equal(evaluate('env -C docs cat README.md > result.txt').paths.find(row => row.role === 'output-redirect').resolved.toLowerCase(), path.join(ROOT, 'result.txt').toLowerCase());
      assert.equal(evaluate('env -C docs cat README.md > "$OUTPUT"').status, 'UNKNOWN');
    }
  },
  {
    name: 'R03-R06 command roles preserve directory transitions, optional values and wrapper operands',
    fn() {
      for (const option of ['--unified', '--abbrev', '--color', '--word-diff', '--ignore-submodules', '--relative', '--submodule']) {
        assert.equal(evaluate(`git diff --no-index ${option} ../outside.txt README.md`).status, 'BLOCK', option);
        assert.equal(evaluate(`git diff --no-index ${option} README.md CLAUDE.md`).status, 'ALLOW', option);
      }
      for (const command of [
        'tar -c -f archive.tar -C .. outside.txt',
        'tar -c -f archive.tar --directory=.. outside.txt',
        'git diff --no-index --color ../outside.txt README.md',
        'git diff --no-index --word-diff ../outside.txt README.md',
        'bash.exe -c "cat ../outside.txt"',
        'sudo -g staff cat ../outside.txt',
        'env --chdir .. cat outside.txt',
        'env -C.. cat outside.txt'
      ]) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of [
        'tar -c -f archive.tar -C . README.md',
        'tar -c -f archive.tar --directory=. README.md',
        'git diff --no-index --color README.md CLAUDE.md',
        'git diff --no-index --color=always README.md CLAUDE.md',
        'bash.exe -c "cat README.md"',
        'sudo -g staff cat README.md',
        'env --chdir . cat README.md',
        'env -C. cat README.md'
      ]) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      const scoped = evaluate('tar -c -f archive.tar -C docs one.txt -C .. README.md; cat CLAUDE.md');
      assert.equal(scoped.status, 'ALLOW');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.role === 'tar-archive').resolved), 'archive.tar');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('one.txt')).resolved), path.join('docs', 'one.txt'));
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('README.md')).resolved), 'README.md');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('CLAUDE.md')).resolved), 'CLAUDE.md');
      for (const command of ['env -S "cat ../outside.txt"', 'env -S "cat README.md"', 'sudo --unknown staff cat README.md', 'tar -c -f archive.tar -C "$DIR" README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
    }
  },
  {
    name: 'R06 inspector resource uncertainty cannot be an empty allow',
    fn() {
      for (const length of [65535, 65536]) assert.equal(evaluate(' '.repeat(length)).status, 'ALLOW');
      for (const command of [' '.repeat(65537), ' '.repeat(65536) + 'cat ../outside.txt']) {
        const result = evaluate(command);
        assert.equal(result.status, 'UNKNOWN');
        assert.ok(result.diagnostics.some(item => item.code === 'INPUT_LIMIT'));
        assert.equal(runHook(command).status, 2);
      }
      assert.equal(evaluate('echo hi', { inspect: () => ({ status: 'UNKNOWN', statements: [], diagnostics: [] }) }).status, 'UNKNOWN');
    }
  },
  {
    name: 'R2-05 Git global cwd options scope every diff operand',
    fn() {
      const outside = path.dirname(ROOT).replace(/\\/g, '/');
      for (const command of [`git -C "${outside}" diff -- README.md`, 'git -C .. diff -- README.md', 'git -C . -C .. diff -- README.md', 'git -C.. diff -- README.md', 'bash -c \'git -C .. diff -- README.md\'', 'git -C .. diff --output=patch.diff']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['git diff -- README.md', 'git -C . diff -- README.md', 'git -C docs -C .. diff -- README.md', 'git -C "" diff -- README.md']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      assert.equal(evaluate('git -C "$DIR" diff -- README.md').status, 'UNKNOWN');
      assert.equal(runHook('git -C "$DIR" diff -- README.md').status, 2);
      for (const command of ['git -c core.worktree=.. diff -- README.md', 'git --work-tree=.. diff -- README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
      assert.equal(evaluate('git -C docs diff -- README.md; cat README.md').status, 'ALLOW');
      const scoped = evaluate('git -C docs diff -- README.md; cat README.md');
      assert.equal(path.relative(path.resolve(ROOT, 'docs', 'README.md'), scoped.paths.find(item => item.role === 'git-diff-pathspec').resolved), '');
      assert.equal(path.relative(path.resolve(ROOT, 'README.md'), scoped.paths.find(item => item.role === 'operand').resolved), '');
      const missingCwd = evaluate('git -C absent diff -- README.md', { resolver: { resolve() { throw new Error('missing cwd'); } } });
      assert.equal(missingCwd.status, 'UNKNOWN');
    }
  },
  {
    name: 'TC-HARNESS-016 relative read and input redirect are classified',
    fn() {
      assert.equal(evaluate('cat ../../outside.txt').status, 'BLOCK');
      assert.equal(evaluate('cat < ../../outside.txt').status, 'BLOCK');
      assert.equal(evaluate('cat docs/project-reference/docs-index-reference.md').status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-017 cwd transition cannot re-scope later relative access',
    fn() {
      const navigation = evaluate('cd D:/outside');
      assert.equal(navigation.status, 'ALLOW');
      const access = evaluate('cd D:/outside && cat secret.txt');
      assert.equal(access.status, 'UNKNOWN');
      assert.ok(access.diagnostics.some(item => item.code === 'CWD_TRANSITION_UNKNOWN'));
      for (const command of [
        'bash -c "cd ../../outside && cat secret.txt"',
        'sh -c "pushd ../../outside; cat secret.txt"',
        'bash -c "popd; cat secret.txt"',
        'bash -c \'sh -c "cd ../../outside && cat secret.txt"\''
      ]) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
      assert.equal(evaluate('bash -c "cat README.md"').status, 'ALLOW');
      assert.equal(runHook('bash -c "cat README.md"').status, 0);
      assert.equal(evaluate('bash -c "cd ../../outside"; cat README.md').status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-018 visible bind sources are host paths',
    fn() {
      assert.equal(evaluate('docker run -v D:/outside:/data alpine').status, 'BLOCK');
      assert.equal(evaluate(`docker run -v ${ROOT.replace(/\\/g, '/')}/tmp:/data alpine`).status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-019 container exec without host metadata is unknown',
    fn() {
      assert.equal(evaluate('docker exec container cat /etc/passwd').status, 'UNKNOWN');
      assert.equal(evaluate('kubectl exec pod -- cat /etc/passwd').status, 'UNKNOWN');
    }
  },
  {
    // Regression: shell and container operand collection reads argv only, so both returned
    // before the redirect loop. A fully covered nested body then suppressed the legacy
    // fallback and the outer target escaped the boundary unchecked.
    name: 'invocation-scope redirects survive shell and container operand collection',
    fn() {
      for (const command of [
        'bash -c "cat README.md" > ../outside.txt',
        'sh -c "echo hi" > ../outside.txt',
        'bash -c "cat README.md" >> ../outside.txt',
        'bash -c "cat README.md" < ../outside.txt',
        'docker run --rm alpine > ../outside.txt',
        `docker run -v ${ROOT.replace(/\\/g, '/')}/tmp:/data alpine > ../outside.txt`
      ]) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      // The redirect is resolved in the invocation scope, never the nested body's scope.
      assert.equal(evaluate('bash -c "cd docs && cat README.md" > result.txt').paths
        .find(row => row.role === 'output-redirect').resolved.toLowerCase(),
      path.join(ROOT, 'result.txt').toLowerCase());
      assert.equal(evaluate('bash -c "cat README.md" > "$OUTPUT"').status, 'UNKNOWN');
      // Control: an in-project target stays allowed, so the guard adds no false denials.
      assert.equal(evaluate('bash -c "cat README.md" > result.txt').status, 'ALLOW');
      assert.equal(evaluate('docker run --rm alpine > result.txt').status, 'ALLOW');
      assert.equal(runHook('bash -c "cat README.md" > result.txt').status, 0);
    }
  },
  {
    name: 'TC-HARNESS-020 aggregation is outside-wins over unknown',
    fn() {
      const value = evaluate('cat ../../outside.txt && ${UNKNOWN_PATH}');
      assert.equal(value.status, 'BLOCK');
      assert.ok(value.paths.some(item => item.outcome === 'OUTSIDE'));
    }
  },
  {
    name: 'TC-HARNESS-021 invalid protected context is unknown while malformed envelope is visible and fail-closed',
    fn() {
      assert.equal(evaluate('cat file.txt', { eventCwd: 'relative/cwd' }).status, 'UNKNOWN');
      const malformed = runHook(undefined, null);
      assert.equal(malformed.status, 2, malformed.stderr);
      assert.ok(malformed.stderr.length > 0, 'malformed envelope must be visible');
    }
  },
  {
    name: 'entrypoint denies relative traversal and container scope without executing payloads',
    fn() {
      assert.equal(runHook('rm ../../outside.txt').status, 2);
      assert.equal(runHook('docker exec c cat /etc/passwd').status, 2);
      assert.equal(runHook('cat docs/project-reference/docs-index-reference.md').status, 0);
      for (const command of ['cat -n ../../outside.txt', 'cat -v ../../outside.txt', 'grep -n needle ../../outside.txt', 'grep -e needle ../../outside.txt', 'grep --regexp=needle ../../outside.txt', 'grep -f ../../outside.txt README.md']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['cat -n README.md', 'cat -v README.md', 'grep -e ../../outside.txt README.md', 'grep --regexp=../../outside.txt README.md', 'head -n 2 README.md']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      for (const command of ['grep -o needle ../../outside.txt', 'awk -F: x ../../outside.txt', 'grep -F needle ../../outside.txt']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['grep -o needle README.md', 'awk -F: x README.md', 'grep -F needle README.md']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      for (const command of ['grep --unknown-arity needle ../../outside.txt', 'awk --unknown-arity x ../../outside.txt', 'find . -exec cat ../../outside.txt \\;']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['grep needle "$FILE"', 'grep -e "$PATTERN" "$FILE"', 'awk x "$FILE"']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['grep "$PATTERN" README.md', 'grep -e "$PATTERN" README.md', 'awk "$PROGRAM" README.md', 'grep -c "<!-- /SYNC:" README.md 2>/dev/null', "grep -c '<!-- /SYNC:' README.md"]) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
    }
  },
  {
    name: 'file-capable interpreter bodies and Git diff file options remain boundary-protected',
    fn() {
      assert.equal(evaluate("python -c \"open('/etc/passwd').read()\"").status, 'UNKNOWN');
      assert.equal(evaluate("node -e \"require('fs').readFileSync('/etc/passwd')\"").status, 'UNKNOWN');
      assert.equal(evaluate("node -e \"console.log('/v2/users')\"").status, 'ALLOW');
      assert.equal(evaluate("bash -c 'cat /etc/passwd'").status, 'BLOCK');
      assert.equal(evaluate('bash -c "$SCRIPT"').status, 'UNKNOWN');
      assert.equal(evaluate('git diff --no-index D:/outside/one.txt README.md').status, 'BLOCK');
      assert.equal(evaluate('git diff --output D:/outside/patch.diff README.md').status, 'BLOCK');
      assert.equal(evaluate('git diff -- README.md').status, 'ALLOW');
    }
  },
  {
    name: 'read paths that do not exist are unknown, while new structured writes stay compatible',
    fn() {
      const missingAwareResolver = {
        resolve(value, base, metadata) {
          if (metadata?.requiresExisting) throw new Error('missing path');
          return path.resolve(base, value);
        }
      };
      assert.equal(evaluate('cat .review-link/secret.txt', { resolver: missingAwareResolver }).status, 'UNKNOWN');
      const write = evaluate(undefined, { toolName: 'Write', toolInput: { file_path: 'new-file.txt' } });
      assert.equal(write.status, 'ALLOW');
    }
  },
  {
    name: 'same-command link mutation cannot race a later relative read',
    fn() {
      const result = evaluate('rm -f .review-link && ln -s ../../outside .review-link && cat .review-link/secret.txt');
      assert.equal(result.status, 'UNKNOWN');
      assert.ok(result.diagnostics.some(item => item.code === 'LINK_MUTATION_UNSUPPORTED'));
    }
  },
  {
    name: 'structured path input is bounded and fails closed',
    fn() {
      const tooLong = evaluate(undefined, { toolName: 'Read', toolInput: { file_path: 'x'.repeat(4097) } });
      assert.equal(tooLong.status, 'UNKNOWN');
      const tooMany = evaluate(undefined, { toolName: 'mcp__filesystem__read_multiple_files', toolInput: { paths: Array.from({ length: 257 }, () => 'inside.txt') } });
      assert.equal(tooMany.status, 'UNKNOWN');
    }
  },
  {
    name: 'entrypoint honors synthetic config root instead of the caller checkout',
    fn() {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-policy-root-'));
      try {
        fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
        fs.writeFileSync(path.join(root, '.claude', '.ck.json'), JSON.stringify({ pathBoundary: true }));
        // Isolate root selection from intentional global temp allowlisting;
        // CI checkouts themselves may live under /tmp. The real hook callback,
        // transport, config resolver and path resolver still run unchanged.
        const boot = `require(${JSON.stringify(path.resolve(__dirname, '../../lib/ck-path-utils.cjs'))}).buildBoundaryAllowlist = () => []; require(${JSON.stringify(path.resolve(__dirname, '../../lib/hook-runner.cjs'))}).runPreToolHookSync('path-boundary-block', require(${JSON.stringify(HOOK)}).evaluate, { inputErrorCode: 2, errorExitCode: 2 });`;
        const invoke = filePath => spawnSync(process.execPath, ['-e', boot], {
          cwd: ROOT,
          env: { ...process.env, CLAUDE_PROJECT_DIR: root },
          input: JSON.stringify({ tool_name: 'Write', cwd: ROOT, tool_input: { file_path: filePath } }),
          encoding: 'utf8',
          timeout: 10000
        });
        const inside = invoke(path.join(root, 'inside.txt'));
        assert.equal(inside.status, 0, inside.stderr);
        assert.equal(inside.stdout, '');
        // The checkout operand is outside the explicit fixture root, with no
        // allowlist escape. Substituting caller cwd would allow it.
        const outside = invoke(path.join(ROOT, 'README.md'));
        assert.equal(outside.status, 2, outside.stderr);
        assert.match(outside.stderr, /Path outside project boundary/);
        assert.equal(outside.stdout, '');
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'invalid explicit project metadata is visible and denied closed',
    fn() {
      const result = spawnSync(process.execPath, [HOOK], {
        cwd: ROOT,
        env: { ...process.env, CLAUDE_PROJECT_DIR: 'relative-project-root' },
        input: JSON.stringify({ tool_name: 'Bash', cwd: ROOT, tool_input: { command: 'echo hi' } }),
        encoding: 'utf8',
        timeout: 10000
      });
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /Unable to resolve project root/);
    }
  }
];

module.exports = { name: 'path-boundary-policy', tests };
