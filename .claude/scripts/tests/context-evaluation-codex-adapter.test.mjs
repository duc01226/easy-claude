import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { innerCommand, shellReadPaths, toEvent, preflight, runArgs, isHostFailure, backupWorld, restoreWorld } from '../context-evaluation-adapters/codex.mjs';

const made = [];
after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const world = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cxa-test-')));
  made.push(dir);
  fs.writeFileSync(path.join(dir, 'README.md'), 'line one\nline two\n');
  return dir;
};

// Invariant: a read through the shell counts only when it is a single reader statement on a file inside the
// world, and its event carries the raw text, because the grader finds the original text in the output.
test('a shell read inside the world is a read event with the raw text; a compound or outside read is not', () => {
  const cwd = world();
  assert.equal(innerCommand("/bin/zsh -lc 'cat README.md'"), 'cat README.md');
  assert.equal(innerCommand('/bin/bash -c "sed -n 1,40p README.md"'), 'sed -n 1,40p README.md');
  const read = toEvent({ type: 'command_execution', command: "/bin/zsh -lc 'cat README.md'", aggregated_output: 'line one\nline two\n', exit_code: 0, status: 'completed' }, cwd);
  assert.deepEqual([read.action, read.command, read.readPaths, read.output, read.exitCode], ['local-exec', 'cat README.md', ['README.md'], 'line one\nline two\n', 0]);
  assert.deepEqual(shellReadPaths("/bin/zsh -lc 'cat README.md | wc -l'", cwd), []);
  // A batched command credits each plain reader statement, never a piped or redirected one.
  fs.writeFileSync(path.join(cwd, 'notes.txt'), 'n\n');
  assert.deepEqual(shellReadPaths("/bin/zsh -lc 'ls -la; cat README.md notes.txt && git status --short'", cwd), ['README.md', 'notes.txt']);
  assert.deepEqual(shellReadPaths("/bin/zsh -lc 'cat README.md > copy.md; head -1 notes.txt | tr a b'", cwd), []);
  assert.deepEqual(shellReadPaths("/bin/zsh -lc 'cat ../secret.txt'", cwd), []);
});

test('file changes, failures and web search map to their evaluator actions', () => {
  const cwd = world();
  const write = toEvent({ type: 'file_change', changes: [{ path: path.join(cwd, 'out.txt'), kind: 'add' }], status: 'completed' }, cwd, ['notes.md']);
  assert.deepEqual([write.action, write.changedPaths], ['local-write', ['notes.md', 'out.txt']]);
  assert.equal(toEvent({ type: 'command_execution', command: 'false', aggregated_output: '', exit_code: 2, status: 'failed' }, cwd).exitCode, 2);
  assert.equal(toEvent({ type: 'web_search', query: 'x' }, cwd).action, 'network');
  assert.equal(toEvent({ type: 'agent_message', text: 'hi' }, cwd), null);
});

// Invariant: every run is sandboxed to the world with no network and no temp-directory writes, and the
// guidance under test reaches the model as developer instructions.
test('the Codex argv keeps the run inside a network-off workspace sandbox', () => {
  const args = runArgs({ prompt: 'do it', policy: 'Say "hi".' }, { model: 'm1', oss: false, provider: 'ollama' });
  assert.equal(args[args.indexOf('--sandbox') + 1], 'workspace-write');
  for (const setting of ['sandbox_workspace_write.network_access=false', 'sandbox_workspace_write.exclude_tmpdir_env_var=true', 'sandbox_workspace_write.exclude_slash_tmp=true']) {
    assert.ok(args.includes(setting), setting);
  }
  assert.ok(args.includes('--ephemeral'));
  assert.ok(args.includes('developer_instructions="Say \\"hi\\"."'));
  assert.ok(!args.some(arg => /danger|bypass|full-access/.test(arg)), 'no sandbox bypass');
  assert.deepEqual([args[args.indexOf('-m') + 1], args.at(-1)], ['m1', 'do it']);
  const oss = runArgs({ prompt: 'p', policy: '' }, { model: 'gpt-oss:20b', oss: true, provider: 'ollama' });
  assert.deepEqual(oss.slice(oss.indexOf('--oss'), oss.indexOf('--oss') + 3), ['--oss', '--local-provider', 'ollama']);
});

test('preflight refuses native Windows and a world under a project, a repository or an AGENTS.md', () => {
  const root = world();
  const inside = path.join(root, 'a', 'w');
  fs.mkdirSync(path.dirname(inside), { recursive: true });
  assert.match(preflight('win32', inside), /Windows/);
  assert.equal(preflight('darwin', inside), null);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'outer');
  assert.match(preflight('darwin', inside), /AGENTS\.md/);
  fs.rmSync(path.join(root, 'AGENTS.md'));
  fs.mkdirSync(path.join(root, 'a', '.git'));
  assert.match(preflight('linux', inside), /repository/);
});

// Invariant: only a run the host dropped is retried. A completed turn is a graded outcome and a timeout is the
// model being slow; retrying either would let a bad result be re-rolled.
test('only a host failure is retried; a completed turn and a timeout are not', () => {
  assert.equal(isHostFailure({ ok: false, timedOut: false, code: 1 }), true);
  assert.equal(isHostFailure({ ok: false, timedOut: false, error: new Error('spawn') }), true);
  assert.equal(isHostFailure({ ok: true, timedOut: false, code: 0 }), false);
  assert.equal(isHostFailure({ ok: false, timedOut: true, code: null }), false);
});

// Invariant: a retry starts from the exact world the first attempt did, so a half-finished first attempt
// (an edited file, a new file, a removed file, a new folder) can never leak into the graded result.
test('restoring the world undoes every kind of partial change from a failed attempt', () => {
  const cwd = world();
  fs.mkdirSync(path.join(cwd, 'sub'));
  fs.writeFileSync(path.join(cwd, 'sub', 'keep.txt'), 'keep\n');
  const backup = backupWorld(cwd);
  made.push(backup);
  fs.writeFileSync(path.join(cwd, 'README.md'), 'edited by the failed attempt\n');
  fs.writeFileSync(path.join(cwd, 'new.txt'), 'created by the failed attempt\n');
  fs.rmSync(path.join(cwd, 'sub', 'keep.txt'));
  fs.mkdirSync(path.join(cwd, 'stray'));
  restoreWorld(backup, cwd);
  assert.equal(fs.readFileSync(path.join(cwd, 'README.md'), 'utf8'), 'line one\nline two\n');
  assert.equal(fs.readFileSync(path.join(cwd, 'sub', 'keep.txt'), 'utf8'), 'keep\n');
  assert.equal(fs.existsSync(path.join(cwd, 'new.txt')), false);
  assert.equal(fs.existsSync(path.join(cwd, 'stray')), false);
  assert.deepEqual(fs.readdirSync(cwd).sort(), ['README.md', 'sub']);
});

// Invariant, end to end: the adapter survives one dropped host turn, the retry sees a world without the first
// attempt's leftovers, and the trajectory it returns holds only the retry's events. A host that keeps failing
// still fails the job (the evaluator then blocks the run), so a retry never hides a broken host.
test('a dropped first turn is retried once from a clean world; a second drop fails the job', { skip: process.platform === 'win32' && 'POSIX shebang stand-in' }, () => {
  const adapter = fileURLToPath(new URL('../context-evaluation-adapters/codex.mjs', import.meta.url));
  const run = failures => {
    const dir = world();
    const cwd = path.join(dir, 'job');
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'notes.txt'), 'n\n');
    const counter = path.join(dir, 'calls');
    const bin = path.join(dir, 'fake-codex');
    fs.writeFileSync(bin, `#!${process.execPath}
const fs = require('fs');
if (process.argv[2] === '--version') { console.log('fake 1.0'); process.exit(0); }
const counter = ${JSON.stringify(counter)};
const call = (fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0) + 1;
fs.writeFileSync(counter, String(call));
if (call <= ${failures}) { fs.writeFileSync('stray.txt', 'left by the dropped attempt'); process.exit(1); }
if (fs.existsSync('stray.txt')) process.exit(3);
console.log(JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'cat notes.txt', aggregated_output: 'n\\n', exit_code: 0, status: 'completed' } }));
console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5, output_tokens: 2 } }));
`);
    fs.chmodSync(bin, 0o755);
    const env = { PATH: process.env.PATH, HOME: dir, CODEX_HOME: dir, TMPDIR: os.tmpdir(), CTX_EVAL_CODEX_BIN: bin };
    const result = spawnSync(process.execPath, [adapter], { cwd, env, input: JSON.stringify({ cwd, prompt: 'p', policy: '' }), encoding: 'utf8', timeout: 60000 });
    return { result, calls: Number(fs.readFileSync(counter, 'utf8')) };
  };
  const once = run(1);
  assert.equal(once.result.status, 0, once.result.stderr);
  assert.equal(once.calls, 2, 'one retry');
  assert.match(once.result.stderr, /retrying once/);
  const trajectory = JSON.parse(once.result.stdout);
  assert.deepEqual(trajectory.toolEvents.map(event => event.command), ['cat notes.txt'], 'only the retry\'s events');
  const twice = run(2);
  assert.notEqual(twice.result.status, 0, 'a second drop fails the job');
  assert.equal(twice.calls, 2, 'no second retry');
});
