import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claudeStartedSkills, codexStartedSkills, score, readCases, main } from '../skill-activation-eval.mjs';

const claudeLine = content => JSON.stringify({ type: 'assistant', message: { content } });

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
test('end to end with a stand-in host: thresholds decide the exit code', { skip: process.platform === 'win32' && 'POSIX shebang stand-in' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const bin = path.join(dir, 'fake-claude');
  fs.writeFileSync(bin, `#!${process.execPath}\nconst p = process.argv[3];\nif (p.includes('test')) console.log(${JSON.stringify(claudeLine([{ type: 'tool_use', name: 'Skill', input: { skill: 'tests' } }]))});\nelse console.log(${JSON.stringify(claudeLine([{ type: 'text', text: 'ok' }]))});\n`);
  fs.chmodSync(bin, 0o755);
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
  assert.equal(main(['--cases', 'cases.json', '--runs=1', '--min-hit-rate=0.8'], { cwd: dir, env, log: () => {} }).exitCode, 1);
});

// Invariant: the chosen model reaches the host, so a frontier and a smaller model can be compared on one case file.
test('SKILL_EVAL_MODEL is passed to the host as its model flag', { skip: process.platform === 'win32' && 'POSIX shebang stand-in' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-'));
  const bin = path.join(dir, 'fake-host');
  const argvFile = path.join(dir, 'argv.json');
  fs.writeFileSync(bin, `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n`);
  fs.chmodSync(bin, 0o755);
  fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify({ cases: [{ id: 'q', prompt: 'hello', expect: null }] }));
  try {
    for (const [host, flag] of [['claude', '--model'], ['codex', '-m']]) {
      main(['--cases', 'cases.json', `--host=${host}`, '--runs=1'], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin, SKILL_EVAL_MODEL: 'small-model' }, log: () => {} });
      const argv = JSON.parse(fs.readFileSync(argvFile, 'utf8'));
      assert.equal(argv[argv.indexOf(flag) + 1], 'small-model', `${host} model flag`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
