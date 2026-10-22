import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { toEvent, readStream, childEnv, hookCommand, runSettings, ancestorContext, preflight, runArgs, runEnv, passNames } from '../context-evaluation-adapters/claude-code.mjs';
import { snapshot, changed } from '../context-evaluation-adapters/claude-code-observer.mjs';
import { removeHostScratch } from '../context-evaluation-adapters/adapter-common.mjs';

const made = [];
after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const world = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cea-')));
  made.push(dir);
  fs.writeFileSync(path.join(dir, 'README.md'), 'line one\nline two\n');
  return dir;
};

// Invariant: a read event carries the file's raw text, because the evaluator grades a prerequisite read by
// finding the original text in the observed output; escaped or truncated JSON would fail every multi-line read.
test('a Read event carries the raw file text and its job-relative path', () => {
  const cwd = world();
  const event = toEvent({ tool_name: 'Read', tool_input: { file_path: path.join(cwd, 'README.md') }, tool_response: { type: 'text', file: { content: 'line one\nline two\n' } }, changedPaths: [] }, cwd);
  assert.deepEqual(event.readPaths, ['README.md']);
  assert.ok(event.output.includes('line one\nline two'));
  assert.equal(event.action, 'read');
  assert.equal(event.exitCode, 0);
});

test('a simple shell reader counts as a read; a compound or writing command does not', () => {
  const cwd = world();
  const cat = toEvent({ tool_name: 'Bash', tool_input: { command: 'cat README.md' }, tool_response: { stdout: 'line one\nline two\n' } }, cwd);
  assert.deepEqual([cat.action, cat.readPaths, cat.output], ['local-exec', ['README.md'], 'line one\nline two\n']);
  const piped = toEvent({ tool_name: 'Bash', tool_input: { command: 'cat README.md | wc -l' }, tool_response: { stdout: '2' } }, cwd);
  assert.deepEqual(piped.readPaths, []);
  const outside = toEvent({ tool_name: 'Bash', tool_input: { command: 'cat ../secret.txt' }, tool_response: { stdout: '' } }, cwd);
  assert.deepEqual(outside.readPaths, [], 'a path outside the world is never reported');
});

test('writes, network tools and failures map to their evaluator actions', () => {
  const cwd = world();
  assert.equal(toEvent({ tool_name: 'Edit', tool_input: { file_path: 'README.md' }, tool_response: {}, changedPaths: ['README.md'] }, cwd).action, 'local-write');
  assert.equal(toEvent({ tool_name: 'WebFetch', tool_input: {}, tool_response: {} }, cwd).action, 'network');
  assert.equal(toEvent({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'false' }, tool_response: null }, cwd).exitCode, 1);
});

test('stream parsing reads the model, success and total input tokens including cache', () => {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', model: 'some-model' }),
    'not json',
    JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 4, cache_creation_input_tokens: 10, cache_read_input_tokens: 100, output_tokens: 7 } })
  ].join('\n');
  assert.deepEqual(readStream(lines), { model: 'some-model', ok: true, inputTokens: 114, outputTokens: 7 });
  assert.equal(readStream('').ok, false);
});

// Invariant: the observer attributes exactly the files a tool call changed, added or removed.
test('the observer snapshot diff reports added, changed and removed files only', () => {
  const cwd = world();
  const before = snapshot(cwd);
  fs.writeFileSync(path.join(cwd, 'README.md'), 'changed\n');
  fs.mkdirSync(path.join(cwd, 'out'));
  fs.writeFileSync(path.join(cwd, 'out', 'new.json'), '{}');
  assert.deepEqual(changed(before, snapshot(cwd)), ['README.md', 'out/new.json']);
  const after = snapshot(cwd);
  fs.rmSync(path.join(cwd, 'out', 'new.json'));
  assert.deepEqual(changed(after, snapshot(cwd)), ['out/new.json']);
});

// Invariant: the run under test can never publish or reach the user's tokens. It gets a strict shell
// sandbox with no network and no unsandboxed fallback, and an environment that carries no credential.
test('the run is contained: strict sandbox settings and an environment without tokens', () => {
  const { sandbox } = runSettings('"node" "observer.mjs"', passNames(' VERTEX_X ,'));
  assert.deepEqual(sandbox, {
    enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true,
    network: { allowedDomains: [], strictAllowlist: true },
    credentials: { envVars: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'VERTEX_X'].map(name => ({ name, mode: 'deny' })) }
  });
  const env = childEnv({ PATH: '/bin', HOME: '/h', GH_TOKEN: 't', GITHUB_TOKEN: 't', NPM_TOKEN: 't', AWS_SECRET_ACCESS_KEY: 's', ANTHROPIC_API_KEY: 'k', VERTEX_X: 'v' }, 'VERTEX_X');
  assert.deepEqual(Object.keys(env).sort(), ['ANTHROPIC_API_KEY', 'HOME', 'PATH', 'VERTEX_X']);
});

// Invariant: the host runs with no permission bypass and no web tools, and git cannot climb out of the world.
test('the host argv never bypasses permissions and the child cannot reach an outer repository', () => {
  const args = runArgs({ prompt: 'do it', policy: 'P' }, 'small', '/s/settings.json');
  assert.equal(args[args.indexOf('--permission-mode') + 1], 'acceptEdits');
  assert.ok(!args.join(' ').includes('bypassPermissions'), 'permission bypass is back');
  assert.equal(args[args.indexOf('--disallowedTools') + 1], 'WebFetch,WebSearch');
  assert.deepEqual([args[args.indexOf('--model') + 1], args[args.indexOf('--settings') + 1], args.at(-1)], ['small', '/s/settings.json', 'P']);
  const env = runEnv({ PATH: '/bin', GH_TOKEN: 't' }, '/state', '/x/world');
  assert.deepEqual([env.GIT_CEILING_DIRECTORIES, env.CTX_EVAL_STATE_DIR, env.CTX_EVAL_WORLD_DIR, env.GH_TOKEN], ['/x', '/state', '/x/world', undefined]);
});

// Invariant: the adapter refuses every setup where the sandbox cannot contain the run.
test('preflight refuses native Windows, an unverified Linux sandbox and a world under a project', () => {
  const root = world();
  const inside = path.join(root, 'w');
  assert.match(preflight('win32', {}, inside), /native Windows/);
  assert.match(preflight('linux', {}, inside), /seccomp/);
  assert.equal(preflight('linux', { CTX_EVAL_LINUX_SANDBOX_VERIFIED: '1' }, inside), null);
  assert.equal(preflight('darwin', {}, inside), null);
  fs.mkdirSync(path.join(root, '.git'));
  assert.match(preflight('darwin', {}, inside), /another project or repository/);
});

test('the observer hook command quotes its paths and refuses a shell-active character', () => {
  assert.equal(hookCommand('/usr/bin/node', '/a b/observer.mjs'), '"/usr/bin/node" "/a b/observer.mjs"');
  for (const bad of ['/x$(id)/node', '/x`id`/node', '/x"y/node', '/x%PATH%/node']) {
    assert.throws(() => hookCommand(bad, '/o.mjs'), /unsafe character/, bad);
  }
});

// Invariant: guidance outside the profile under test never reaches the run, so an ancestor CLAUDE.md is found.
test('an ancestor CLAUDE.md is reported; a world outside any project has none', () => {
  const root = world();
  const inner = path.join(root, 'a', 'b');
  fs.mkdirSync(inner, { recursive: true });
  assert.equal(ancestorContext(path.join(inner, 'w')), null);
  fs.writeFileSync(path.join(root, 'a', 'CLAUDE.md'), 'outer project');
  assert.equal(ancestorContext(path.join(inner, 'w')), path.join(root, 'a', 'CLAUDE.md'));
});

// Invariant: the host's own empty write-staging folder is never graded as the run's output, while anything
// the run actually left in it stays for the grader.
test('an empty host staging folder is removed; a non-empty one stays', () => {
  const cwd = world();
  const scratch = path.join(cwd, '.claude', '.cc-writes');
  fs.mkdirSync(scratch, { recursive: true });
  assert.deepEqual(removeHostScratch(cwd), ['.claude/.cc-writes']);
  assert.equal(fs.existsSync(scratch), false);
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(path.join(scratch, 'left.tmp'), 'x');
  assert.deepEqual(removeHostScratch(cwd), []);
  assert.equal(fs.existsSync(path.join(scratch, 'left.tmp')), true);
  assert.deepEqual(removeHostScratch(path.join(cwd, 'absent')), []);
});
