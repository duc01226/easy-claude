'use strict';

/**
 * TC-HARNESS-002: every static sensitive operand uses one classifier and an
 * APPROVED: prefix is local to that exact operand. Commands are supplied as
 * data to a child hook; none is executed by this suite.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const policy = require('../../lib/sensitive-path-policy.cjs');
const { createTempDir, cleanupTempDir, setupMockConfig } = require('../lib/test-utils.cjs');

const HOOK = getHookPath('privacy-block.cjs');

async function code(tool, input, options) {
  return (await runHook(HOOK, createPreToolUseInput(tool, input), options)).code;
}

const tests = [
  {
    name: '[R04/R05] optional Git values and wrapper roles preserve privacy operands',
    fn: async () => {
      for (const command of ['git diff --no-index --color .env README.md', 'git diff --no-index --word-diff .env README.md', 'bash.exe -c "cat .env"', 'sudo -g staff cat .env', 'env --chdir . cat .env', 'env -C. cat .env', 'env -S "cat .env"']) {
        assert.equal(await code('Bash', { command }), 2, command);
      }
      for (const command of ['git diff --no-index --color README.md CLAUDE.md', 'git diff --no-index --color=always README.md CLAUDE.md', 'bash.exe -c "cat README.md"', 'sudo -g staff cat README.md', 'env --chdir . cat README.md', 'env -C. cat README.md', 'echo "bash.exe -c cat .env"']) {
        assert.equal(await code('Bash', { command }), 0, command);
      }
      assert.equal(await code('Bash', { command: 'env -S "cat README.md"' }), 2, 'env split-string grammar is deliberately unsupported');
    }
  },
  {
    name: '[R2-03/04] privacy and boundary compose for aliases, Git, and dynamic pattern roles',
    fn: async () => {
      const boundary = getHookPath('path-boundary-block.cjs');
      for (const command of ['gawk x .env', 'mawk x .env', 'gawk.exe x .env', 'git.exe diff -- .env', 'git diff -- .env', 'git diff --no-index README.md .env', 'git diff --output=.env README.md']) {
        const input = createPreToolUseInput('Bash', { command });
        assert.equal((await runHook(boundary, input)).code, 0, `in-project boundary: ${command}`);
        assert.equal(await code('Bash', { command }), 2, `privacy: ${command}`);
      }
      for (const command of ['gawk x README.md', 'mawk x README.md', 'git diff -- README.md', 'grep "$PATTERN" README.md', 'grep -e "$PATTERN" README.md', 'gawk "$PROGRAM" README.md']) {
        assert.equal(await code('Bash', { command }), 0, command);
        assert.equal((await runHook(boundary, createPreToolUseInput('Bash', { command }))).code, 0, command);
      }
      for (const command of ['grep needle "$FILE"', 'grep "$PATTERN" "$FILE"', 'mawk x "$FILE"', 'git diff -- "$FILE"']) {
        assert.equal(await code('Bash', { command }), 2, command);
      }
      // The two hooks answer DIFFERENT questions about the same unresolvable operand, and this is
      // where they part company. Privacy denies it because `$FILE` could name a secret and reading
      // one is the harm. The boundary hook denies it only when the statement can WRITE — an
      // unresolvable read cannot destroy anything outside the project, so denying it would be the
      // over-blocking that model removed. Both directions are pinned so neither drifts into the
      // other's job.
      for (const command of ['rm "$FILE"', 'cp README.md "$FILE"', 'git diff --output="$FILE"']) {
        assert.equal((await runHook(boundary, createPreToolUseInput('Bash', { command }))).code, 2, command);
      }
      for (const command of ['grep needle "$FILE"', 'grep "$PATTERN" "$FILE"', 'mawk x "$FILE"', 'git diff -- "$FILE"']) {
        assert.equal((await runHook(boundary, createPreToolUseInput('Bash', { command }))).code, 0, command);
      }
      assert.equal(await code('Bash', { command: 'git diff -- APPROVED:.env' }), 0);
      assert.equal(await code('Bash', { command: 'git diff -- APPROVED:.env .env.local' }), 2);
    }
  },
  {
    name: '[TC-HARNESS-002] quoted and escaped sensitive operands are blocked',
    fn: async () => {
      for (const command of ['cat ".env"', "cat '.env.local'", 'cat credentials.json', 'cat secrets.yaml', 'cat id_rsa']) {
        assert.equal(await code('Bash', { command }), 2, command);
      }
    }
  },
  {
    name: '[TC-HARNESS-002] all sensitive classes are checked through Bash operands',
    fn: async () => {
      for (const operand of ['.env', '.env.local', 'config/credentials.json', 'secret.yml', 'private.pem', 'deploy.key', '.ssh/id_rsa', '.ssh/id_ed25519']) {
        assert.equal(await code('Bash', { command: `cat "${operand}"` }), 2, operand);
      }
    }
  },
  {
    name: '[TC-HARNESS-002] approval is operand-local and does not suppress siblings',
    fn: async () => {
      assert.equal(await code('Bash', { command: 'cat APPROVED:.env' }), 0);
      assert.equal(await code('Bash', { command: 'cat APPROVED:.env; cat .env' }), 2);
      assert.equal(await code('Bash', { command: 'echo APPROVED:benign; cat credentials.json' }), 2);
      assert.equal(await code('Bash', { command: 'cat "APPROVED:.env"' }), 0);
    }
  },
  {
    name: '[TC-HARNESS-002] redirects and option file operands use the same policy',
    fn: async () => {
      assert.equal(await code('Bash', { command: 'cat < .env' }), 2);
      assert.equal(await code('Bash', { command: 'grep -f .env README.md' }), 2);
      assert.equal(await code('Bash', { command: 'grep --include=.env password .' }), 2);
      assert.equal(await code('Bash', { command: 'rg --glob .env password .' }), 2);
      assert.equal(await code('Bash', { command: 'grep -e .env README.md' }), 0);
      assert.equal(await code('Bash', { command: 'cat -- .env.example' }), 0);
      for (const command of ['cat -v .env', 'cat -n .env', 'grep -n needle .env', 'grep -e needle .env', 'grep --regexp=needle .env', 'grep --regexp=a=b .env', 'head -v .env', 'rm -f .env']) {
        assert.equal(await code('Bash', { command }), 2, command);
      }
      for (const command of ['cat -v README.md', 'grep --regexp=.env README.md', 'grep -e .env README.md', 'head -n 2 README.md', 'grep --include=README.md .env README.md']) {
        assert.equal(await code('Bash', { command }), 0, command);
      }
    }
  },
  {
    name: '[TC-HARNESS-002] wrappers and dynamic file operands cannot bypass privacy evaluation',
    fn: async () => {
      for (const command of [
        'env cat .env',
        'command cat .env',
        'sudo cat .env',
        "bash -c 'cat .env'",
        'sh -c "cat .env"',
        'cat "$FILE"',
        'bash -c "$SCRIPT"'
      ]) {
        assert.equal(await code('Bash', { command }), 2, command);
      }
      assert.equal(await code('Bash', { command: 'bash -c \'cat APPROVED:.env\'' }), 0);
      assert.equal(await code('Bash', { command: 'echo "cat .env"' }), 0);
    }
  },
  {
    name: '[TC-HARNESS-002] data-only command text is not mistaken for an operand',
    fn: async () => {
      assert.equal(await code('Bash', { command: 'echo "cat .env"' }), 0);
      assert.equal(await code('Bash', { command: 'printf "%s" .env.example' }), 0);
      assert.equal(await code('Bash', { command: 'echo x; cat .env' }), 2);
    }
  },
  {
    name: '[TC-HARNESS-002] direct fields and safe suffix controls remain intact',
    fn: async () => {
      for (const field of ['file_path', 'path', 'pattern']) {
        assert.equal(await code('Read', { [field]: 'credentials.json' }), 2, field);
        assert.equal(await code('Read', { [field]: `${field}.example` }), 0, field);
      }
      assert.equal(await code('Read', { file_path: 'APPROVED:credentials.json' }), 0);
    }
  },
  {
    name: '[TC-HARNESS-002] disabled configuration remains explicit and scoped',
    fn: async () => {
      const tmp = createTempDir();
      try {
        setupMockConfig(tmp, { privacyBlock: false });
        assert.equal(await code('Bash', { command: 'cat ".env"' }, { cwd: tmp, env: { CLAUDE_PROJECT_DIR: tmp } }), 0);
      } finally {
        cleanupTempDir(tmp);
      }
    }
  },
  {
    name: '[R11] standalone privacy fixtures override a foreign inherited root without changing it',
    fn() {
      const foreign = createTempDir();
      try {
        setupMockConfig(foreign, { privacyBlock: false });
        const config = path.join(foreign, '.claude', '.ck.json');
        const before = fs.readFileSync(config, 'utf8');
        const result = spawnSync(process.execPath, [path.resolve(__dirname, '../test-privacy-block.js')], {
          cwd: path.resolve(__dirname, '../../../..'),
          env: { ...process.env, CLAUDE_PROJECT_DIR: foreign },
          encoding: 'utf8', timeout: 30000
        });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /27 passed, 0 failed/);
        assert.equal(fs.readFileSync(config, 'utf8'), before);
      } finally { cleanupTempDir(foreign); }
    }
  },
  {
    name: '[TC-HARNESS-002] classifier property domain preserves safe/secret separation',
    fn: () => {
      const safe = ['.env.example', '.env.sample', 'config.template', 'README.md'];
      const sensitive = ['.env', '.env.local', 'credentials.json', 'secrets.yaml', 'id_rsa', 'private.pem'];
      for (const value of safe) assert.equal(policy.isPrivacySensitive(value), false, value);
      for (const value of sensitive) assert.equal(policy.isPrivacySensitive(value), true, value);
      for (const value of sensitive) {
        const result = policy.classifySensitivePath(`APPROVED:${value}`);
        assert.equal(result.sensitive, true);
        assert.equal(result.approved, true);
        assert.equal(result.valid, true);
      }
    }
  },
  {
    // Regression: the patterns were matched against the RAW operand, but the OS and every
    // path.join caller collapse '.', empty and '..' segments first — so '.env/.' opened the
    // very file '.env' is anchored against while the policy saw a different string.
    name: '[TC-HARNESS-002] no-op path segments cannot walk past a privacy pattern',
    fn: async () => {
      const evasions = ['.env/.', '.env/./.', '.env//.', '.env/', './.env/.', 'nested/../.env',
        '.env.local/.', 'credentials.json/.', 'secrets.yaml/.', 'id_rsa/.', 'private.pem/.',
        'deploy.key/.', 'config/.env/./.'];
      for (const value of evasions) assert.equal(policy.isPrivacySensitive(value), true, value);
      // Controls: collapsing must not invent sensitivity, and the safe-file exemption survives.
      for (const value of ['README.md/.', 'docs/./guide.md', '.env.example/.', './.', '.', 'src/..'])
        assert.equal(policy.isPrivacySensitive(value), false, value);
      // The entrypoint must deny the same spellings, as a direct operand and inside a command.
      for (const [tool, input] of [['Read', { file_path: '.env/.' }], ['Read', { file_path: 'private.pem/.' }],
        ['Bash', { command: 'cat .env/.' }], ['Bash', { command: 'cat .env/./.' }]]) {
        assert.equal(await code(tool, input), 2, JSON.stringify(input));
      }
      assert.equal(await code('Read', { file_path: 'README.md' }), 0);
    }
  },
  {
    name: '[TC-HARNESS-002] implementation exposes one shared policy owner',
    fn: () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../../privacy-block.cjs'), 'utf8');
      assert.match(source, /sensitive-path-policy\.cjs/);
      assert.match(source, /inspectCommand/);
      assert.match(source, /classifySensitivePath/);
      assert.doesNotMatch(source, /command\.match\(\/\\?\.env/);
    }
  }
];

module.exports = { name: 'privacy-operands', tests };
