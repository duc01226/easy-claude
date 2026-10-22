import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeStartedSkills, codexStartedSkills, score, readCases, main, hostArgv, hostEnv, frameworkState, switchValue, transcriptCompleted, CLAUDE_TOOLS, CLAUDE_DISALLOWED_TOOLS, FRAMEWORK_SWITCHES } from '../skill-activation-eval.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const claudeLine = content => JSON.stringify({ type: 'assistant', message: { content } });
const claudeResult = JSON.stringify({ type: 'result', subtype: 'success', is_error: false });
const posixStandIn = { skip: process.platform === 'win32' && 'POSIX shebang stand-in' };

/** A stand-in host executable (Node script with a shebang) in `dir`. */
function standIn(dir, name, body) {
  const bin = path.join(dir, name);
  fs.writeFileSync(bin, `#!${process.execPath}\n${body}\n`);
  fs.chmodSync(bin, 0o755);
  return bin;
}

// Invariant: a skill counts as started whether the host loaded it or the agent read its SKILL.md
// (the fallback for a user-only skill), and nothing else counts.
test('Claude transcripts count Skill calls and SKILL.md reads, not mentions in prose', () => {
  const jsonl = [
    claudeLine([{ type: 'text', text: 'I could use .claude/skills/plan/SKILL.md here' }]),
    claudeLine([{ type: 'tool_use', name: 'Skill', input: { skill: 'commit', args: '--push' } }]),
    claudeLine([{ type: 'tool_use', name: 'Skill', input: { skill: 'engineering:debug' } }]),
    claudeLine([{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/.claude/skills/spec/SKILL.md' } }]),
    claudeLine([{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/src/skills/notes.md' } }]),
    'not json'
  ].join('\n');
  assert.deepEqual([...claudeStartedSkills(jsonl)].sort(), ['commit', 'engineering:debug', 'spec']);
});

// Invariant (cross-platform): a Windows path names a skill as surely as a POSIX one. The transcript is JSON,
// so a `\` separator arrives escaped; detection reads the parsed value, not the JSON text.
test('a SKILL.md read through a Windows path counts on Claude and on Codex', () => {
  const claude = claudeLine([{ type: 'tool_use', name: 'Read', input: { file_path: 'C:\\proj\\.claude\\skills\\commit\\SKILL.md' } }]);
  assert.deepEqual([...claudeStartedSkills(claude)], ['commit']);
  const codex = JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'Get-Content -Raw .agents\\skills\\commit\\SKILL.md' } });
  assert.deepEqual([...codexStartedSkills(codex)], ['commit']);
});

// Invariant: a skill starts when the agent asks to read its file; a path that only appears in what a command
// printed (a file listing, a SKILL.md that names another skill) starts nothing.
test('Codex command output that lists skill files starts no skill', () => {
  const jsonl = JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'rg --files .agents', aggregated_output: '.agents/skills/plan/SKILL.md\n.agents/skills/spec/SKILL.md\n' } });
  assert.deepEqual([...codexStartedSkills(jsonl)], []);
});

test('Codex transcripts count reads of a skill file and ignore agent prose', () => {
  const jsonl = [
    JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: "sed -n '1,200p' .agents/skills/integration-test/SKILL.md" } }),
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'see .agents/skills/plan/SKILL.md' } })
  ].join('\n');
  assert.deepEqual([...codexStartedSkills(jsonl)], ['integration-test']);
});

// Invariant: a run passes only when exactly the expected skill started (or none, for expect null);
// a second, unexpected skill is a false trigger even when the expected one also started.
test('scoring separates hits from false triggers', () => {
  const report = score([
    { id: 'a', expect: 'spec', runs: [['spec'], ['spec', 'plan'], []] },
    { id: 'b', expect: null, runs: [[], ['plan']] }
  ]);
  assert.deepEqual(report.cases.map(item => [item.id, item.passes, item.hits, item.falseTriggers]), [['a', 1, 2, 1], ['b', 1, null, 1]]);
  assert.equal(report.hitRate, 2 / 3);
  assert.equal(report.falseTriggerRate, 2 / 5);
});

// Invariant: a run that measured nothing (host error or timeout) is never scored as "no skill started";
// it is counted apart and kept out of both rates.
test('scoring keeps errored and timed-out runs out of the rates', () => {
  const report = score([
    { id: 'quiet', expect: null, runs: [{ outcome: 'error', detail: 'status 1' }, { outcome: 'ok', started: [] }] },
    { id: 'hit', expect: 'spec', runs: [{ outcome: 'timeout', detail: 'slow' }, { outcome: 'ok', started: ['spec'] }] }
  ]);
  assert.deepEqual(report.cases.map(item => [item.id, item.runs, item.errors, item.timeouts, item.passes]), [['quiet', 1, 1, 0, 1], ['hit', 1, 0, 1, 1]]);
  assert.equal(report.hitRate, 1);
  assert.equal(report.falseTriggerRate, 0);
  assert.equal(report.unmeasuredRuns, 2);
});

// Invariant: only a completed turn makes a transcript a measurement.
test('a transcript counts as measured only after a completed turn', () => {
  assert.equal(transcriptCompleted('claude', claudeResult, 0), true);
  assert.equal(transcriptCompleted('claude', JSON.stringify({ type: 'result', subtype: 'error_max_turns', is_error: true }), 1), true, 'turn limit: what started is real');
  assert.equal(transcriptCompleted('claude', JSON.stringify({ type: 'result', subtype: 'success', is_error: true }), 1), false, 'API or sign-in error');
  assert.equal(transcriptCompleted('claude', '', 1), false);
  assert.equal(transcriptCompleted('codex', JSON.stringify({ type: 'turn.completed' }), 0), true);
  assert.equal(transcriptCompleted('codex', JSON.stringify({ type: 'turn.completed' }), 1), false);
  assert.equal(transcriptCompleted('codex', [JSON.stringify({ type: 'turn.failed' }), JSON.stringify({ type: 'turn.completed' })].join('\n'), 0), false);
});

// Invariant (safety): an activation run in the live project cannot change it — Claude has only the Skill tool
// and readers (mutating tools also disallowed), no personal settings or MCP servers, Codex stays read-only —
// and the host sees no inherited secret.
test('host runs are read-only and get an allowlisted environment', () => {
  const claude = hostArgv('claude', 'p', '');
  assert.equal(claude[claude.indexOf('--tools') + 1], 'Skill,Read,Glob,Grep', 'tool allowlist, not only a deny-list');
  assert.deepEqual(CLAUDE_TOOLS, ['Skill', 'Read', 'Glob', 'Grep']);
  assert.equal(claude[claude.indexOf('--disallowedTools') + 1], 'Bash,Edit,Write,MultiEdit,NotebookEdit');
  assert.deepEqual(CLAUDE_DISALLOWED_TOOLS, ['Bash', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
  assert.equal(claude[claude.indexOf('--permission-mode') + 1], 'plan');
  assert.equal(claude[claude.indexOf('--setting-sources') + 1], 'project,local');
  assert.ok(claude.includes('--strict-mcp-config'));
  const codex = hostArgv('codex', 'p', '');
  assert.equal(codex[codex.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(codex.includes('--ephemeral'));
  const env = { PATH: '/bin', HOME: '/h', GITHUB_TOKEN: 'secret', AWS_SECRET_ACCESS_KEY: 'secret', CODEX_HOME: '/c', OPENAI_API_KEY: 'k', SKILL_EVAL_PASS_ENV: 'OPENAI_API_KEY' };
  assert.deepEqual(Object.keys(hostEnv('claude', env)).sort(), ['HOME', 'OPENAI_API_KEY', 'PATH']);
  assert.deepEqual(Object.keys(hostEnv('codex', env)).sort(), ['CODEX_HOME', 'HOME', 'OPENAI_API_KEY', 'PATH']);
});

// Invariant: a run measures the framework mode the operator chose — the framework switches the hooks read reach
// the host by name — while other CK_ names, which can carry a credential (CK_GIT_URL), stay out.
test('framework mode and kill switches reach the host; other CK_ names do not', () => {
  const env = { PATH: '/bin', HOME: '/h', CK_FRAMEWORK_MODE: 'quiet', CK_QUIET_PROJECT_RULES: '1', CK_KNOWLEDGE_ROUTE: '0', CK_GIT_URL: 'https://user:token@example.invalid/r.git', CK_SESSION_ID: 's' };
  for (const host of ['claude', 'codex']) {
    const seen = hostEnv(host, env);
    assert.equal(seen.CK_FRAMEWORK_MODE, 'quiet', `${host}: mode value reaches the host`);
    assert.equal(seen.CK_QUIET_PROJECT_RULES, '1');
    assert.equal(seen.CK_KNOWLEDGE_ROUTE, '0');
    assert.equal(seen.CK_GIT_URL, undefined, `${host}: credential-bearing CK_ name dropped`);
    assert.equal(seen.CK_SESSION_ID, undefined);
  }
});

// Environment names a hook or its config owner reads that are deliberately NOT passed to an eval run. Every other
// CK_ read must be in FRAMEWORK_SWITCHES, so a new read forces a decision here or there.
const NOT_FRAMEWORK_SWITCHES = new Map([
  // identity: the host session id; an eval run gets its own session
  ['CK_SESSION_ID', 'session identity'],
  // diagnostics: debug logging only, never a behavior an activation measures
  ['CK_DEBUG', 'debug logging'],
  // store and directory paths: path values (they can name the home directory) and test seams
  ['CK_GIT_LEASE_STORE', 'store path'], ['CK_REVIEW_RECEIPT_STORE', 'store path'],
  ['CK_CONVENTIONS_DIR', 'store path'], ['CK_PROMPT_LEDGER_DIR', 'store path'],
  // installer trust: an operator decision for dependency installs, never set for a measurement run
  ['CK_STARTUP_INSTALL_TRUST', 'installer trust'],
  // test seam: replaces a spawned graph process in hook tests
  ['CK_GRAPH_SPAWN_STUB', 'test seam']
]);

/** Every `.cjs`/`.mjs`/`.js` file under `dir`, skipping test folders and installed packages. */
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['tests', 'node_modules', '__pycache__'].includes(entry.name) ? [] : sourceFiles(full);
    return /\.(?:cjs|mjs|js)$/.test(entry.name) ? [full] : [];
  });
}

// Invariant: the passthrough list keeps step with the hooks — every environment switch any hook, hook library or
// script library reads (`env.CK_*`, `env['CK_*']`, or a `const ENV_SWITCH` / `*_ENV = 'CK_*'` name) is either in
// FRAMEWORK_SWITCHES or in the commented exclusion set above.
test('FRAMEWORK_SWITCHES names every environment switch the hooks read', () => {
  const names = new Set();
  const files = [...sourceFiles(path.join(repoRoot, '.claude', 'hooks')), ...sourceFiles(path.join(repoRoot, '.claude', 'scripts', 'lib'))];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/env(?:\.|\[['"])(CK_[A-Z0-9_]+)/g)) names.add(match[1]);
    for (const match of text.matchAll(/const (?:ENV_SWITCH|[A-Z0-9_]+_ENV(?:_ID)?) = '(CK_[A-Z0-9_]+)'/g)) names.add(match[1]);
  }
  for (const name of ['CK_FRAMEWORK_MODE', 'CK_WORKFLOW_ROUTE_MODE', 'CK_PROMPT_LEDGER', 'CK_KNOWLEDGE_ROUTE', 'CK_SESSION_ID']) {
    assert.ok(names.has(name), `scan reaches ${name} (${[...names].join(',')})`);
  }
  assert.deepEqual([...names].filter(name => !FRAMEWORK_SWITCHES.includes(name) && !NOT_FRAMEWORK_SWITCHES.has(name)).sort(), []);
  assert.deepEqual(FRAMEWORK_SWITCHES.filter(name => !names.has(name)), [], 'every listed switch is still read somewhere');
});

// Invariant: the report states the framework state the run saw — mode, skill auto-trigger policy and route mode,
// each with the layer that decided it, and each passed switch with a bounded value — and nothing that can carry a
// secret or a path.
test('the report records the effective framework state and passed switch values, never secrets or paths', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  try {
    const secret = 'https://user:t0ken@example.invalid/r.git';
    const state = frameworkState('claude', dir, { PATH: '/bin', HOME: dir, CK_FRAMEWORK_MODE: ' "Quiet" ', CK_KNOWLEDGE_ROUTE: '0', CK_GIT_URL: secret, OPENAI_API_KEY: 'sk-provider', SKILL_EVAL_PASS_ENV: 'OPENAI_API_KEY' });
    assert.deepEqual(state, {
      mode: 'quiet', modeSource: 'environment', quietProjectRules: false,
      skillAutoTrigger: { enabled: true, source: 'default' },
      workflowRouteMode: { mode: 'ask', source: 'default' },
      switches: { CK_FRAMEWORK_MODE: 'quiet', CK_KNOWLEDGE_ROUTE: '0' },
      switchesPassed: ['CK_FRAMEWORK_MODE', 'CK_KNOWLEDGE_ROUTE']
    });
    const text = JSON.stringify(state);
    for (const leak of [secret, 't0ken', 'sk-provider', dir, os.homedir(), path.sep + 'bin']) assert.ok(!text.includes(leak), `no ${leak} in the report`);
    assert.equal(frameworkState('claude', dir, { PATH: '/bin', HOME: dir }).mode, 'on', 'default mode without a switch');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Invariant: a personal or environment auto-trigger policy, which changes how often a skill starts, is visible in
// the report — two runs that differ only by it never produce the same framework state.
test('the report records which layer decided the skill auto-trigger policy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-home-'));
  try {
    const plain = frameworkState('claude', dir, { PATH: '/bin', HOME: home });
    assert.deepEqual(plain.skillAutoTrigger, { enabled: true, source: 'default' }, 'home without .ck.json');
    fs.mkdirSync(path.join(home, '.claude'));
    fs.writeFileSync(path.join(home, '.claude', '.ck.json'), JSON.stringify({ portability: { skillAutoTrigger: false, workflowRouteMode: 'off' } }));
    const personal = frameworkState('claude', dir, { PATH: '/bin', HOME: home });
    assert.deepEqual(personal.skillAutoTrigger, { enabled: false, source: 'user-config' });
    assert.deepEqual(personal.workflowRouteMode, { mode: 'off', source: 'user-config' });
    assert.notDeepEqual(personal, plain, 'the two policies are told apart');
    assert.ok(!JSON.stringify(personal).includes(home), 'no personal config path in the report');
    const environment = frameworkState('claude', dir, { PATH: '/bin', HOME: home, CK_SKILL_AUTO_TRIGGER: '0', CK_WORKFLOW_ROUTE_MODE: 'auto' });
    assert.deepEqual(environment.skillAutoTrigger, { enabled: false, source: 'environment' });
    assert.deepEqual(environment.workflowRouteMode, { mode: 'auto', source: 'environment' });
    assert.deepEqual(environment.switches, { CK_WORKFLOW_ROUTE_MODE: 'auto', CK_SKILL_AUTO_TRIGGER: '0' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

// Invariant: a switch value is recorded only as a short mode word; a mis-set switch holding an arbitrary string
// (a URL, a token) is recorded as `(unrecognized)`, never verbatim.
test('switch values are normalized and bounded', () => {
  assert.equal(switchValue(' "QUIET" '), 'quiet');
  assert.equal(switchValue("'off'"), 'off');
  assert.equal(switchValue('risk-based'), 'risk-based');
  for (const junk of ['https://t@x', 'a b', '', 'x'.repeat(21), 'tok/en']) assert.equal(switchValue(junk), '(unrecognized)', junk);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  try {
    const state = frameworkState('claude', dir, { PATH: '/bin', HOME: dir, CK_KNOWLEDGE_ROUTE: 'https://t@x' });
    assert.deepEqual(state.switches, { CK_KNOWLEDGE_ROUTE: '(unrecognized)' });
    assert.ok(!JSON.stringify(state).includes('t@x'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cases files are validated before any host runs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const file = path.join(dir, 'cases.json');
  for (const bad of [{}, { cases: [] }, { cases: [{ id: 'x', prompt: '' , expect: null }] }, { cases: [{ id: 'x', prompt: 'p', expect: 'Bad Name' }] },
    { cases: [{ id: 'x', prompt: 'p', expect: null }, { id: 'x', prompt: 'q', expect: null }] }]) {
    fs.writeFileSync(file, JSON.stringify(bad));
    assert.throws(() => readCases(file));
  }
});

// Invariant: the gate fails when the measured rates miss the thresholds the caller set.
test('end to end with a stand-in host: thresholds decide the exit code', posixStandIn, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const bin = standIn(dir, 'fake-claude', `const p = process.argv[3];\nif (p.includes('test')) console.log(${JSON.stringify(claudeLine([{ type: 'tool_use', name: 'Skill', input: { skill: 'tests' } }]))});\nelse console.log(${JSON.stringify(claudeLine([{ type: 'text', text: 'ok' }]))});\nconsole.log(${JSON.stringify(claudeResult)});`);
  fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify({ cases: [
    { id: 'hit', prompt: 'write a test', expect: 'tests' },
    { id: 'miss', prompt: 'add coverage', expect: 'tests' },
    { id: 'quiet', prompt: 'explain this', expect: null }
  ] }));
  const env = { ...process.env, SKILL_EVAL_HOST_BIN: bin };
  const lines = [];
  const loose = main(['--cases', 'cases.json', '--runs=2'], { cwd: dir, env, log: line => lines.push(line) });
  assert.equal(loose.report.hitRate, 0.5);
  assert.equal(loose.report.falseTriggerRate, 0);
  assert.equal(loose.exitCode, 0);
  assert.match(lines.at(-1), /hit rate 50%/);
  assert.match(lines.at(-1), /, auto-trigger (?:on|off) \((?:default|project-config|user-config|local-override|environment)\)/, 'summary names the auto-trigger policy and its layer');
  assert.equal(main(['--cases', 'cases.json', '--runs=1', '--json'], { cwd: dir, env: { ...env, CK_FRAMEWORK_MODE: 'quiet' }, log: () => {} }).report.framework.mode, 'quiet');
  assert.equal(main(['--cases', 'cases.json', '--runs=1', '--min-hit-rate=0.8'], { cwd: dir, env, log: () => {} }).exitCode, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

// Invariant: a host that fails (sign-in, quota, bad model or flag) measures nothing, so the gate cannot pass on
// it — not even a false-trigger gate whose quiet cases would otherwise all "pass".
test('a host that exits with an error makes the run unmeasured and the gate fail', posixStandIn, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  try {
    const bin = standIn(dir, 'broken-claude', "process.stderr.write('Invalid API key'); process.exit(1);");
    fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify({ cases: [{ id: 'quiet', prompt: 'explain this', expect: null }] }));
    const lines = [];
    const run = main(['--cases', 'cases.json', '--runs=2', '--max-false-rate=0.1'], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin }, log: line => lines.push(line) });
    assert.equal(run.exitCode, 2);
    assert.equal(run.report.falseTriggerRate, null, 'no measured run, no rate');
    assert.deepEqual([run.report.cases[0].errors, run.report.cases[0].passes], [2, 0]);
    assert.match(lines.join('\n'), /unmeasured 2 error\(s\).*Invalid API key/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Invariant: one slow run is recorded as a timeout; the runs that completed are kept and reported.
test('a run that outlives the timeout is recorded and the other runs are kept', posixStandIn, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  try {
    const bin = standIn(dir, 'slow-claude', `if (process.argv[3].includes('slow')) setTimeout(() => {}, 20000);\nelse { console.log(${JSON.stringify(claudeLine([{ type: 'tool_use', name: 'Skill', input: { skill: 'tests' } }]))}); console.log(${JSON.stringify(claudeResult)}); }`);
    fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify({ cases: [
      { id: 'slow', prompt: 'slow prompt', expect: null },
      { id: 'hit', prompt: 'write a test', expect: 'tests' }
    ] }));
    const run = main(['--cases', 'cases.json', '--runs=1', '--timeout-ms=1500'], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin }, log: () => {} });
    assert.equal(run.exitCode, 2);
    assert.deepEqual(run.report.cases.map(item => [item.id, item.timeouts, item.runs, item.hits]), [['slow', 1, 0, null], ['hit', 0, 1, 1]]);
    assert.equal(run.report.hitRate, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Invariant: the chosen model and the framework switches reach the measured host process itself (not only the
// report), so a frontier and a smaller model can be compared on one case file and the hooks run in the chosen mode;
// a credential-bearing CK_ name never reaches it.
test('SKILL_EVAL_MODEL and the framework switches reach the host run; other CK_ names do not', posixStandIn, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const bin = path.join(dir, 'fake-host');
  const argvFile = path.join(dir, 'argv.json');
  const envFile = path.join(dir, 'env.json');
  // The measured run (not the `--version` probe) records its argv and the environment it actually received.
  fs.writeFileSync(bin, `#!${process.execPath}\nconst fs = require('fs');\nif (process.argv[2] !== '--version') {\n  fs.writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n  fs.writeFileSync(${JSON.stringify(envFile)}, JSON.stringify({ CK_FRAMEWORK_MODE: process.env.CK_FRAMEWORK_MODE ?? null, CK_PROMPT_LEDGER: process.env.CK_PROMPT_LEDGER ?? null, CK_GIT_URL: process.env.CK_GIT_URL ?? null }));\n}\n`);
  fs.chmodSync(bin, 0o755);
  fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify({ cases: [{ id: 'q', prompt: 'hello', expect: null }] }));
  try {
    for (const [host, flag] of [['claude', '--model'], ['codex', '-m']]) {
      fs.rmSync(envFile, { force: true });
      main(['--cases', 'cases.json', `--host=${host}`, '--runs=1'], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin, SKILL_EVAL_MODEL: 'small-model', CK_FRAMEWORK_MODE: 'quiet', CK_PROMPT_LEDGER: '0', CK_GIT_URL: 'https://user:token@example.invalid/r.git' }, log: () => {} });
      const argv = JSON.parse(fs.readFileSync(argvFile, 'utf8'));
      assert.equal(argv[argv.indexOf(flag) + 1], 'small-model', `${host} model flag`);
      assert.deepEqual(JSON.parse(fs.readFileSync(envFile, 'utf8')), { CK_FRAMEWORK_MODE: 'quiet', CK_PROMPT_LEDGER: '0', CK_GIT_URL: null }, `${host}: the run received the switches and not CK_GIT_URL`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
