'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sourceHooks = path.resolve(__dirname, '../../hooks');

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-install-bootstrap-'));
  const hooks = path.join(root, '.claude', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.copyFileSync(path.join(sourceHooks, 'verify-install.cjs'), path.join(hooks, 'verify-install.cjs'));
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/verify-install.cjs' }] }] },
  }));
  try { run({ root, hooks }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function invoke(root, cwd = root, explicit) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.NODE_TEST_CONTEXT;
  if (explicit !== undefined) env.CLAUDE_PROJECT_DIR = explicit;
  return spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', 'verify-install.cjs')], {
    cwd, env, encoding: 'utf8', timeout: 10000,
  });
}

function assertWarning(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Install incomplete/);
  assert.match(result.stderr, /Repair: re-export/);
  assert.doesNotMatch(result.stderr, /node:internal|Require stack:|\n\s+at /);
  assert.equal((result.stderr.match(/Install incomplete/g) || []).length, 1);
}

test('partial install without the root helper emits one actionable warning and exits zero', () => fixture(({ root }) => {
  assertWarning(invoke(root));
}));

test('partial install without a transitive root-helper dependency remains diagnosable', () => fixture(({ root, hooks }) => {
  fs.mkdirSync(path.join(hooks, 'lib'));
  fs.copyFileSync(path.join(sourceHooks, 'lib', 'project-root.cjs'), path.join(hooks, 'lib', 'project-root.cjs'));
  assertWarning(invoke(root));
}));

test('bootstrap fallback locates the project from nested cwd and explicit root', () => fixture(({ root }) => {
  const nested = path.join(root, 'src', 'nested');
  fs.mkdirSync(nested, { recursive: true });
  for (const [cwd, explicit] of [[nested, undefined], [os.tmpdir(), root], [path.parse(root).root, undefined]]) {
    const result = invoke(root, cwd, explicit);
    assertWarning(result);
    assert.ok(result.stderr.includes(root), result.stderr);
  }
}));

test('bootstrap fallback respects the consuming cwd project before its own script project', () => fixture(({ root }) => {
  const consuming = path.join(root, 'consumer');
  fs.mkdirSync(path.join(consuming, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(consuming, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/missing-consumer.cjs' }] }] },
  }));
  const result = invoke(root, consuming);
  assertWarning(result);
  assert.ok(result.stderr.includes(consuming), result.stderr);
  assert.match(result.stderr, /missing-consumer\.cjs/);
}));

test('complete root helper still reports a missing registered hook', () => fixture(({ root, hooks }) => {
  fs.cpSync(path.join(sourceHooks, 'lib'), path.join(hooks, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/missing.cjs' }] }] },
  }));
  const result = invoke(root);
  assertWarning(result);
  assert.match(result.stderr, /missing\.cjs/);
  assert.doesNotMatch(result.stderr, /Root helper unavailable/);
}));

test('complete installation stays silent from root and nested cwd', () => fixture(({ root, hooks }) => {
  fs.cpSync(path.join(sourceHooks, 'lib'), path.join(hooks, 'lib'), { recursive: true });
  const nested = path.join(root, 'src');
  fs.mkdirSync(nested);
  for (const cwd of [root, nested]) {
    const result = invoke(root, cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
}));
