// Routing evals runner (skills/shared/skill-evals/run-routing-evals.mjs): proven without a model call.
// A stand-in host executable plays the host CLI; no case here costs tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    DEFAULT_MAX_CASES,
    MAX_RUNS,
    STATUS,
    caseInvocation,
    declaredRoute,
    frameworkFiles,
    main,
    materializeFixture,
    observedRoute,
    selectCases,
    usageOf
} from '../../skills/shared/skill-evals/run-routing-evals.mjs';
import { validateCorpus } from '../../skills/shared/skill-evals/validate.mjs';

const claudeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const corpus = JSON.parse(fs.readFileSync(path.join(claudeRoot, 'skills/shared/skill-evals/corpus.v1.json'), 'utf8'));
const posixStandIn = { skip: process.platform === 'win32' && 'POSIX shebang stand-in' };
const assistant = content => JSON.stringify({ type: 'assistant', message: { content } });
const result = (extra = {}) => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, ...extra });

function standIn(dir, body) {
    const bin = path.join(dir, 'fake-host');
    fs.writeFileSync(bin, `#!${process.execPath}\n${body}\n`);
    fs.chmodSync(bin, 0o755);
    return bin;
}

// Invariant: the shipped corpus has novice and mid-session routing cases on both sides of the workflow boundary.
test('the corpus carries novice and mid-session routing cases, each expecting and refusing a workflow', () => {
    const routing = validateCorpus(corpus).cases.filter(item => item.routing);
    for (const audience of ['novice', 'mid-session']) {
        const group = routing.filter(item => item.routing.audience === audience);
        assert.ok(
            group.some(item => item.routing.acceptedRoutes.some(route => route.startsWith('workflow-'))),
            `${audience}: a case expects a workflow`
        );
        assert.ok(
            group.some(item => item.routing.acceptedRoutes.every(route => !route.startsWith('workflow-'))),
            `${audience}: a case refuses every workflow`
        );
    }
    for (const item of routing.filter(entry => entry.routing.audience === 'mid-session')) assert.ok(item.routing.priorPrompts.length > 0, item.id);
});

// Invariant: a malformed routing case is rejected before any run, so a run never measures against a broken expectation.
test('the validator rejects inconsistent routing cases', () => {
    const base = structuredClone(corpus.cases.find(item => item.id === 'activation-novice-bugfix-readiness'));
    const mutate = change => {
        const copy = structuredClone(corpus);
        const item = structuredClone(base);
        change(item);
        copy.cases = [item];
        return () => validateCorpus(copy);
    };
    assert.doesNotThrow(mutate(() => {}));
    assert.throws(
        mutate(item => (item.routing.audience = 'expert')),
        /audience/
    );
    assert.throws(
        mutate(item => (item.routing.priorPrompts = ['earlier'])),
        /earlier turns/
    );
    assert.throws(
        mutate(item => (item.routing.acceptedRoutes = ['fix'])),
        /expected activation must be an accepted route/
    );
    assert.throws(
        mutate(item => (item.routing.acceptedRoutes = ['Workflow Bugfix'])),
        /unique route names/
    );
    assert.throws(
        mutate(item => (item.routing.fixtureFiles = { '../escape.js': 'x' })),
        /relative path outside framework folders/
    );
    assert.throws(
        mutate(item => (item.routing.fixtureFiles = { '.claude/settings.json': '{}' })),
        /relative path outside framework folders/
    );
    assert.throws(
        mutate(item => {
            item.expectedActivation = null;
            item.routing.acceptedRoutes = ['workflow-bugfix'];
        }),
        /cannot accept one/
    );
    assert.throws(
        mutate(item => {
            item.kind = 'repair';
        }),
        /activation case/
    );
});

// Invariant: a run never exceeds its case cap or the hard run ceiling.
test('case selection is capped and filters by id; the run ceiling is enforced', () => {
    const { cases, skipped } = selectCases(corpus);
    assert.equal(cases.length, DEFAULT_MAX_CASES);
    assert.ok(skipped.length > 0, 'the rest is reported as capped out');
    assert.deepEqual(
        selectCases(corpus, { ids: ['routing-mid-session-bug'] }).cases.map(item => item.id),
        ['routing-mid-session-bug']
    );
    assert.throws(() => selectCases(corpus, { ids: ['activation-positive'] }), /not a routing case/);
    assert.throws(() => main(['--max-cases', String(MAX_RUNS), '--runs', '2'], { log: () => {} }), /at most 12 host runs/);
});

// Invariant: the route is read from what the run did, in a fixed order, and only from the last turn.
test('observed route: workflow start, then declared route, then a started skill, from the last turn only', () => {
    const start = assistant([{ type: 'tool_use', name: 'Skill', input: { skill: 'start-workflow', args: 'workflow-bugfix' } }]);
    assert.equal(observedRoute('claude', [start, result()].join('\n')).route, 'workflow-bugfix');
    const direct = assistant([{ type: 'tool_use', name: 'Skill', input: { skill: 'workflow-feature' } }]);
    assert.equal(observedRoute('claude', [direct, result()].join('\n')).source, 'workflow-start');
    const declared = assistant([{ type: 'text', text: 'Route: `custom-simple` [investigate → fix] — because one module' }]);
    assert.equal(observedRoute('claude', [declared, result()].join('\n')).route, 'custom-simple');
    const skill = assistant([{ type: 'tool_use', name: 'Skill', input: { skill: 'fix' } }]);
    assert.deepEqual(observedRoute('claude', [skill, result()].join('\n')), { route: 'fix', source: 'skill', started: ['fix'] });
    assert.equal(observedRoute('claude', [assistant([{ type: 'text', text: 'Sure.' }]), result()].join('\n')).route, 'undeclared');
    // An earlier turn's workflow never counts for the measured prompt.
    const twoTurns = [start, result(), assistant([{ type: 'text', text: '**Route:** direct — a question' }]), result()].join('\n');
    assert.equal(observedRoute('claude', twoTurns).route, 'direct');
    const codex = [
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Route: workflow-feature — new capability' } }),
        JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 3 } })
    ].join('\n');
    assert.equal(observedRoute('codex', codex).route, 'workflow-feature');
    assert.equal(declaredRoute('no route here'), null);
});

test('token use and cost are reported when the host exposes them, null otherwise', () => {
    assert.deepEqual(usageOf('claude', result({ usage: { input_tokens: 100, output_tokens: 20 }, total_cost_usd: 0.01 })), {
        inputTokens: 100,
        outputTokens: 20,
        costUsd: 0.01
    });
    assert.deepEqual(usageOf('claude', result()), { inputTokens: null, outputTokens: null, costUsd: null });
});

// Invariant: mid-session cases replay earlier turns in one session on Claude, and are skipped (not faked) on Codex.
test('mid-session invocation replays earlier turns through stream-json input on Claude only', () => {
    const item = corpus.cases.find(entry => entry.id === 'routing-mid-session-bug');
    const claude = caseInvocation('claude', item);
    assert.ok(claude.argv.includes('--input-format'));
    assert.ok(!claude.argv.includes(item.prompt), 'the prompt travels on stdin');
    assert.equal(claude.argv.filter(arg => arg === '--max-turns').length, 1);
    assert.equal(claude.argv[claude.argv.indexOf('--permission-mode') + 1], 'plan', 'read-only');
    const lines = claude.input
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
    assert.deepEqual(
        lines.map(line => line.message.content),
        [...item.routing.priorPrompts, item.prompt]
    );
    assert.equal(caseInvocation('codex', item), null);
    const novice = corpus.cases.find(entry => entry.id === 'routing-novice-question');
    assert.equal(caseInvocation('claude', novice).input, undefined);
});

// Invariant: a fixture holds only the framework and synthetic files, never project data or tests.
test('fixtures are synthetic: framework files without tests plus the case files; unsafe paths are refused', () => {
    const files = frameworkFiles('claude');
    assert.ok(files.includes('.claude/settings.json'));
    assert.ok(files.every(file => file.startsWith('.claude/') && !/(?:^|\/)tests\//.test(file)));
    assert.ok(files.includes('.claude/skills/test/SKILL.md'), 'the shipped test skill is not a test folder');
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-fixture-'));
    try {
        const item = corpus.cases.find(entry => entry.id === 'activation-novice-bugfix-readiness');
        const folder = materializeFixture(item, { host: 'claude', parent, files: ['.claude/settings.json'] });
        const listed = fs.readdirSync(folder, { recursive: true }).map(file => file.split(path.sep).join('/'));
        assert.deepEqual(
            listed.filter(file => !fs.statSync(path.join(folder, file)).isDirectory()).sort(),
            ['.claude/settings.json', ...Object.keys(item.routing.fixtureFiles)].sort()
        );
        assert.ok(!fs.existsSync(path.join(folder, 'docs', 'project-config.json')), 'no project config');
        assert.ok(!fs.existsSync(path.join(folder, '.git')), 'no Git repository');
        const unsafe = { ...item, routing: { ...item.routing, fixtureFiles: { '/etc/x': 'x' } } };
        assert.throws(() => materializeFixture(unsafe, { host: 'claude', parent, files: [] }), /unsafe fixture path/);
    } finally {
        fs.rmSync(parent, { recursive: true, force: true });
    }
});

// Invariant: the default is a dry plan that calls nothing; an unavailable host is ENVIRONMENT-BLOCKED, never a score.
test('dry plan calls no host; a missing host is ENVIRONMENT-BLOCKED with exit 3', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-dry-'));
    try {
        const bin = path.join(dir, 'never-called');
        const dry = main([], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin }, log: () => {} });
        assert.equal(dry.report.status, STATUS.PLANNED);
        assert.equal(dry.exitCode, 0);
        assert.equal(dry.report.cases.length, DEFAULT_MAX_CASES);
        assert.ok(!fs.existsSync(path.join(dir, 'tmp')), 'a dry plan writes nothing');
        const blocked = main(['--run'], { cwd: dir, env: { ...process.env, SKILL_EVAL_HOST_BIN: bin }, log: () => {} });
        assert.equal(blocked.report.status, 'ENVIRONMENT-BLOCKED');
        assert.equal(blocked.exitCode, 3);
        assert.equal(blocked.report.accuracy, undefined, 'no accuracy without a run');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

// Invariant: a capped run measures each case in its own throwaway fixture, scores routes, reports and cleans up.
test('a capped run with a stand-in host scores routes, writes the report and deletes the fixtures', posixStandIn, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-run-'));
    try {
        const seen = path.join(dir, 'seen.log');
        const bin = standIn(
            dir,
            [
                "const fs = require('fs');",
                "if (process.argv.includes('--version')) { console.log('9.9.9 (stand-in)'); process.exit(0); }",
                `fs.appendFileSync(${JSON.stringify(seen)}, process.cwd() + '\\n');`,
                "const prompt = process.argv[process.argv.indexOf('-p') + 1] || '';",
                "const route = prompt.includes('save button') ? 'workflow-bugfix' : 'direct';",
                `console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Route: ' + route }] } }));`,
                "console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, usage: { input_tokens: 5, output_tokens: 2 } }));"
            ].join('\n')
        );
        const { report, exitCode } = main(['--run', '--case', 'activation-novice-bugfix-readiness,activation-novice-feature-readiness'], {
            cwd: dir,
            env: { ...process.env, SKILL_EVAL_HOST_BIN: bin },
            log: () => {},
            now: Date.UTC(2026, 10, 17)
        });
        assert.equal(exitCode, 0);
        assert.equal(report.status, STATUS.COMPLETED);
        assert.deepEqual(
            report.cases.map(item => [item.id, item.observed[0], item.passes]),
            [
                ['activation-novice-feature-readiness', 'direct', 0],
                ['activation-novice-bugfix-readiness', 'workflow-bugfix', 1]
            ]
        );
        assert.equal(report.accuracy, 0.5);
        assert.equal(report.cases[1].runs[0].usage.inputTokens, 5);
        assert.ok(fs.existsSync(report.reportFile) && report.reportFile.startsWith(path.join(dir, 'tmp', 'reports', 'skill-evals')));
        const folders = fs.readFileSync(seen, 'utf8').trim().split('\n');
        assert.equal(new Set(folders).size, 2, 'each case ran in its own fixture');
        for (const folder of folders) {
            assert.ok(!folder.startsWith(dir) && !folder.startsWith(claudeRoot), 'fixtures live outside every repository');
            assert.ok(!fs.existsSync(folder), 'fixture deleted after the run');
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
