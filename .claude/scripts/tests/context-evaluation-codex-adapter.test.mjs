import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { innerCommand, shellReadPaths, toEvent, preflight, runArgs, isHostFailure, backupWorld, restoreWorld, KILL_GRACE_MS } from '../context-evaluation-adapters/codex.mjs';

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

// Invariant: a failed turn is retried only when its last reported failure is the transport's (a dropped stream,
// a server error, overload, a rate limit); a failure the model's own work caused is a result, so one profile
// cannot have a bad outcome re-rolled.
test('a failed turn is a host failure only when the transport failed', () => {
  const failed = failures => ({ ok: false, timedOut: false, code: 1, failures });
  assert.equal(isHostFailure(failed(['stream disconnected before completion: error sending request'])), true);
  assert.equal(isHostFailure(failed(['unexpected status 503 Service Unavailable'])), true);
  assert.equal(isHostFailure(failed(['Rate limit reached for requests'])), true);
  assert.equal(isHostFailure(failed(['Your input exceeds the context window of this model'])), false);
  assert.equal(isHostFailure(failed(['turn failed'])), false, 'an unexplained failed turn is not proof of a host fault');
  assert.equal(isHostFailure(failed(['stream disconnected before completion', 'Your input exceeds the context window of this model'])), false, 'the last failure decides');
  assert.equal(isHostFailure(failed([])), true, 'exited without reporting a failed turn: the host crashed');
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
  assert.equal(trajectory.attempts, 2, 'the output reports the retry');
  const twice = run(2);
  assert.notEqual(twice.result.status, 0, 'a second drop fails the job');
  assert.equal(twice.calls, 2, 'no second retry');
});

const adapterFile = fileURLToPath(new URL('../context-evaluation-adapters/codex.mjs', import.meta.url));

/** A job folder, a scratch folder and a stand-in Codex whose behaviour `body` (Node) decides. */
function codexFixture(body) {
  const dir = world();
  const cwd = path.join(dir, 'job');
  const scratch = path.join(dir, 'scratch');
  fs.mkdirSync(cwd);
  fs.mkdirSync(scratch);
  const bin = path.join(dir, 'fake-codex');
  fs.writeFileSync(bin, `#!${process.execPath}\nconst fs = require('fs');\nif (process.argv[2] === '--version') { console.log('fake 1.0'); process.exit(0); }\n${body}\n`);
  fs.chmodSync(bin, 0o755);
  const env = { PATH: process.env.PATH, HOME: dir, CODEX_HOME: dir, TMPDIR: os.tmpdir(), CTX_EVAL_CODEX_BIN: bin };
  fs.writeFileSync(path.join(dir, 'auth.json'), '{"token":"synthetic"}');
  return { dir, cwd, scratch, env };
}

const pidAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function waitFor(condition, ms, label) {
  const until = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

const posixOnly = { skip: process.platform === 'win32' && 'POSIX shebang stand-in; the Codex adapter refuses native Windows' };

// Invariant (evidence integrity): a failed turn the model caused is graded as it is, never re-rolled.
test('a failed turn the model caused is not retried', posixOnly, () => {
  const { dir, cwd, scratch, env } = codexFixture(`fs.appendFileSync(process.env.CALLS_FILE, 'x');
console.log(JSON.stringify({ type: 'turn.failed', error: { message: 'Your input exceeds the context window of this model' } }));
process.exit(1);`);
  const calls = path.join(dir, 'calls');
  const result = spawnSync(process.execPath, [adapterFile], { cwd, env: { ...env, CALLS_FILE: calls, CTX_EVAL_PASS_ENV: 'CALLS_FILE' }, input: JSON.stringify({ cwd, prompt: 'p', policy: '', scratchDir: scratch }), encoding: 'utf8', timeout: 60000 });
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(calls, 'utf8'), 'x', 'one attempt only');
  assert.doesNotMatch(result.stderr, /retrying/);
  assert.deepEqual(fs.readdirSync(scratch), [], 'the private home and the world backup are removed');
});

// Invariant: a retry never starts when it could not finish inside the job's limit, so the evaluator never has
// to stop the adapter mid-run.
test('a retry that would not fit the job time limit is skipped', posixOnly, () => {
  const { dir, cwd, scratch, env } = codexFixture(`fs.appendFileSync(process.env.CALLS_FILE, 'x'); process.exit(1);`);
  const calls = path.join(dir, 'calls');
  // 35 s minus the cleanup reserve leaves less than the retry floor after the first attempt.
  const result = spawnSync(process.execPath, [adapterFile], { cwd, env: { ...env, CALLS_FILE: calls, CTX_EVAL_PASS_ENV: 'CALLS_FILE' }, input: JSON.stringify({ cwd, prompt: 'p', policy: '', scratchDir: scratch, jobTimeoutMs: 35000 }), encoding: 'utf8', timeout: 60000 });
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(calls, 'utf8'), 'x');
  assert.match(result.stderr, /not retried, less than \d+ ms of the job limit left/);
});

// Invariant: a run past its limit is stopped even when it ignores SIGTERM, so no Codex process outlives its job.
test('a run that ignores SIGTERM is killed after the grace period', posixOnly, async () => {
  const { dir, cwd, scratch, env } = codexFixture(`process.on('SIGTERM', () => {});
fs.writeFileSync(process.env.PID_FILE, String(process.pid));
setInterval(() => {}, 1000);`);
  const pidFile = path.join(dir, 'pid');
  // The run limit must outlast the stand-in's own start-up (a loaded machine can take over 500 ms to boot node),
  // or the run is killed before it writes its pid and the escalation path is never exercised.
  const runLimitMs = 3000;
  const started = Date.now();
  const result = spawnSync(process.execPath, [adapterFile], { cwd, env: { ...env, PID_FILE: pidFile, CTX_EVAL_PASS_ENV: 'PID_FILE', CTX_EVAL_TIMEOUT_MS: String(runLimitMs) }, input: JSON.stringify({ cwd, prompt: 'p', policy: '', scratchDir: scratch }), encoding: 'utf8', timeout: 60000 });
  assert.notEqual(result.status, 0, 'a timeout is a failed job, not retried');
  assert.ok(Date.now() - started < runLimitMs + KILL_GRACE_MS + 10000, 'stopped by the escalation, not by the test limit');
  assert.ok(fs.existsSync(pidFile), 'control: the stand-in Codex started and ignored SIGTERM before the limit');
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  await waitFor(() => !pidAlive(pid), 5000, 'the stand-in Codex to exit');
  assert.deepEqual(fs.readdirSync(scratch), []);
});

// Invariant (credential hygiene): when the evaluator stops the adapter at the job limit, the copy of the sign-in
// file, the world backup and the Codex run do not outlive it.
test('a SIGTERM to the adapter kills the Codex run and removes its private files', posixOnly, async () => {
  const { dir, cwd, scratch, env } = codexFixture(`fs.writeFileSync(process.env.PID_FILE, String(process.pid));
setInterval(() => {}, 1000);`);
  const pidFile = path.join(dir, 'pid');
  const child = spawn(process.execPath, [adapterFile], { cwd, env: { ...env, PID_FILE: pidFile, CTX_EVAL_PASS_ENV: 'PID_FILE' }, stdio: ['pipe', 'ignore', 'pipe'] });
  child.stdin.end(JSON.stringify({ cwd, prompt: 'p', policy: '', scratchDir: scratch, jobTimeoutMs: 180000 }));
  const exited = new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
  await waitFor(() => fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').length > 0, 15000, 'the stand-in Codex to start');
  assert.ok(fs.readdirSync(scratch).some(name => name.startsWith('ctx-eval-codex-')), 'control: the private home exists while the run is live');
  child.kill('SIGTERM');
  const { code } = await exited;
  assert.equal(code, 143);
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  await waitFor(() => !pidAlive(pid), 5000, 'the stand-in Codex to exit');
  assert.deepEqual(fs.readdirSync(scratch), [], 'no private home and no world backup survive');
});

// Invariant: the evaluator sends each job its time limit and a scratch folder, removes that folder even when the
// adapter died without cleaning up, and keeps the adapter's attempt count in the record.
test('the evaluator sends the job limit and scratch folder, removes the folder after a kill, and records attempts', posixOnly, () => {
  const require = createRequire(import.meta.url);
  const { runEvaluation } = require('../lib/context-evaluation-world.cjs');
  const { sha256 } = require('../lib/context-delivery-evidence.cjs');
  const fixture = fileURLToPath(new URL('../../hooks/tests/fixtures/context-delivery/evaluation-tasks.json', import.meta.url));
  const full = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const manifest = { ...full, pairsPerTask: 1, cases: [full.cases.find(row => !row.heldOut)] };
  const files = { '.claude/docs/extra.md': '# Extra\n' };
  const bundle = { files, bytes: 8, hash: sha256(JSON.stringify(files)) };
  const policies = { compatible: 'a', concise: 'b' };
  const identity = { policies, policyHashes: { compatible: sha256('a'), concise: sha256('b') }, sourceHash: 'c'.repeat(64), bundleHash: bundle.hash };
  const dir = world();
  const log = path.join(dir, 'jobs.log');
  const program = path.join(dir, 'adapter.cjs');
  fs.writeFileSync(program, `const fs = require('fs'); const path = require('path');
const job = JSON.parse(fs.readFileSync(0, 'utf8'));
fs.writeFileSync(path.join(job.scratchDir, 'auth.json'), 'copy');
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ jobTimeoutMs: job.jobTimeoutMs, scratchDir: job.scratchDir }) + '\\n');
if (process.env.KILL_SELF === '1') process.kill(process.pid, 'SIGKILL');
process.stdout.write(JSON.stringify({ toolEvents: [], model: 'm', settingsHash: 'e'.repeat(64), host: 'codex', attempts: 2, inputTokens: 1, outputTokens: 1 }));`);
  const adapter = { executable: process.execPath, args: [program], isolationVerified: true, jobTimeoutMs: 60000 };
  const jobs = () => fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));

  const saved = process.env.KILL_SELF;
  try {
    const result = runEvaluation({ manifest, outputDir: path.join(dir, 'out'), bundle, identity, adapter });
    assert.deepEqual(result.records.map(row => row.attempts), [2, 2]);
    assert.deepEqual(jobs().map(row => row.jobTimeoutMs), [60000, 60000]);
    for (const row of jobs()) assert.equal(fs.existsSync(row.scratchDir), false, 'scratch removed after a completed job');
    fs.rmSync(log);
    process.env.KILL_SELF = '1';
    assert.throws(() => runEvaluation({ manifest, outputDir: path.join(dir, 'out2'), bundle, identity, adapter }), /^Error: runtime$/);
    const [killed] = jobs();
    assert.equal(fs.existsSync(killed.scratchDir), false, 'scratch removed after the adapter was killed');
  } finally {
    if (saved === undefined) delete process.env.KILL_SELF; else process.env.KILL_SELF = saved;
  }
});
