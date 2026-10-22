import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { innerCommand, shellReadPaths, toEvent, preflight, runArgs } from '../context-evaluation-adapters/codex.mjs';

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
