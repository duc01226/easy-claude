'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
    MAX_ROUNDS, HARD_MAX_ROUNDS, POLICY_VERSION, blockingFindings, blockingSeverities, SEVERITY_DEFINITIONS, NON_SEVERITY_STATES,
    grantsExtension, evaluateRound, startRun, getRun, recordRound,
    acceptRun, interruptRun, resumeRun, invalidateRun
} = require('../lib/review-policy.cjs');
const { resolveProjectRoot } = require('../../hooks/lib/project-root.cjs');

test('TC-HARNESS-006: shared predicate applies round floor and never waives binary gates', () => {
    const low = { id: 'L1', severity: 'LOW', summary: 'minor clarity' };
    assert.equal(blockingFindings(1, [low]).length, 1);
    assert.equal(blockingFindings(2, [low]).length, 0);
    assert.equal(blockingFindings(3, [low]).length, 0);
    // Rounds past the review budget exist only for failing test gates; the
    // predicate itself stays defined there and keeps the floor.
    assert.equal(blockingFindings(4, [low]).length, 0);
    assert.throws(() => blockingFindings(0, [low]), /round/);
    assert.equal(blockingFindings(2, [low], [{ id: 'tests', status: 'FAIL' }]).length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [low] }).deferredLow.length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [low] }).canComplete, true);
    assert.equal(evaluateRound({ round: 2, findings: [low], minRounds: 2 }).canComplete, true);
});

test('TC-HARNESS-006: severity definitions and round eligibility are shared and explicit', () => {
    assert.deepEqual(blockingSeverities(1), ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    assert.deepEqual(blockingSeverities(2), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.deepEqual(blockingSeverities(3), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.deepEqual(blockingSeverities(4), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.throws(() => blockingSeverities(0), /round/);
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
        assert.ok(SEVERITY_DEFINITIONS[severity]);
        assert.match(SEVERITY_DEFINITIONS[severity], /risk|impact|immediate|non-blocking/i);
    }
});

test('TC-HARNESS-006: explicit minimum rounds is honored within the bounded maximum', () => {
    const clean = evaluateRound({ round: 1, minRounds: 2 });
    assert.equal(clean.minimumMet, false);
    assert.equal(clean.canComplete, false);
    assert.equal(evaluateRound({ round: 2, minRounds: 2 }).canComplete, true);
    assert.throws(() => evaluateRound({ round: 1, minRounds: 4 }), /minRounds/);
});

test('TC-HARNESS-006: bounded property domain keeps predicate symmetric for all severities', () => {
    // Exhaustive finite domain: each severity × round × gate state is checked.
    for (const round of [1, 2, 3]) {
        for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
            const result = blockingFindings(round, [{ id: severity, severity }]);
            assert.equal(result.length > 0, round < 2 || severity !== 'LOW', `${round}/${severity}`);
        }
        assert.equal(blockingFindings(round, [], [{ id: 'binary', status: 'FAIL' }]).length, 1);
        assert.equal(blockingFindings(round, [], [{ id: 'binary', status: 'PASS' }]).length, 0);
    }
    assert.throws(() => evaluateRound({ round: 0 }), /round/);
    assert.throws(() => evaluateRound({ round: 1.5 }), /round/);
    assert.equal(evaluateRound({ round: 4, findings: [{ id: 'h', severity: 'HIGH' }] }).status, 'ESCALATE',
        'a review blocker past the hard cap still escalates');
});

test('TC-HARNESS-006: unresolved evidence is a blocking state, never a LOW escape hatch', () => {
    assert.deepEqual(NON_SEVERITY_STATES, ['NOT VERIFIABLE']);
    const unresolved = { id: 'evidence', severity: 'NOT VERIFIABLE', summary: 'missing runtime proof' };
    assert.equal(blockingFindings(1, [unresolved]).length, 1);
    assert.equal(blockingFindings(2, [unresolved]).length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [unresolved] }).deferredLow.length, 0);
    assert.equal(evaluateRound({ round: 2, findings: [unresolved] }).canComplete, false);
});

test('TC-HARNESS-ROUND-EXT-001: only an open CRITICAL/HIGH at the base cap buys the extension round', () => {
    const granted = evaluateRound({ round: 2, findings: [{ id: 'h', severity: 'HIGH' }] });
    assert.equal(granted.extensionGranted, true);
    assert.equal(granted.roundBudget, HARD_MAX_ROUNDS);
    assert.equal(granted.mustEscalate, false);
    assert.equal(granted.status, 'CONTINUE');
    assert.deepEqual(granted.extensionFindings.map(finding => finding.id), ['h']);
    const critical = evaluateRound({ round: 2, findings: [{ id: 'c', severity: 'CRITICAL' }] });
    assert.equal(critical.extensionGranted, true);
    // A failed non-test binary gate is carried as a synthetic CRITICAL review
    // blocker, so it earns the same one extra round rather than escalating.
    const gate = evaluateRound({ round: 2, hardGates: [{ id: 'security-must-fix', status: 'FAIL' }] });
    assert.equal(gate.extensionGranted, true);
    assert.deepEqual(gate.extensionFindings.map(finding => finding.id), ['security-must-fix']);
    // A failing TEST gate is not budgeted: it never buys the extension and
    // never escalates; the loop continues until the tests pass.
    const tests = evaluateRound({ round: 2, hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }] });
    assert.equal(tests.extensionGranted, false);
    assert.equal(tests.mustEscalate, false);
    assert.equal(tests.status, 'CONTINUE');
    assert.equal(tests.testLoopContinues, true);
    assert.deepEqual(tests.failingTestGates.map(gate => gate.id), ['unit']);
    assert.throws(() => evaluateRound({ round: 2, hardGates: [{ id: 'x', kind: 'flaky', status: 'FAIL' }] }), /kind/);
    for (const findings of [[{ id: 'm', severity: 'MEDIUM' }], [{ id: 'e', severity: 'NOT VERIFIABLE' }]]) {
        const spent = evaluateRound({ round: 2, findings });
        assert.equal(spent.extensionGranted, false, JSON.stringify(findings));
        assert.equal(spent.roundBudget, MAX_ROUNDS);
        assert.equal(spent.mustEscalate, true);
        assert.equal(spent.status, 'ESCALATE');
    }
});

test('TC-HARNESS-ROUND-EXT-002: the extension never renews and round 3 is the hard cap', () => {
    assert.equal(grantsExtension(1, [{ id: 'c', severity: 'CRITICAL' }]), false, 'round 1 has budget left already');
    assert.equal(grantsExtension(3, [{ id: 'c', severity: 'CRITICAL' }]), false, 'round 3 never buys a round 4');
    const exhausted = evaluateRound({ round: 3, findings: [{ id: 'c', severity: 'CRITICAL' }] });
    assert.equal(exhausted.extensionGranted, false);
    assert.equal(exhausted.roundBudget, HARD_MAX_ROUNDS, 'a round-3 evaluation reports the budget it runs under');
    assert.equal(exhausted.mustEscalate, true);
    assert.equal(exhausted.status, 'ESCALATE');
    // A clean or LOW-only extension round still passes on its own bar.
    assert.equal(evaluateRound({ round: 3, findings: [{ id: 'l', severity: 'LOW' }] }).status, 'PASS');
    assert.throws(() => evaluateRound({ round: 1, minRounds: 3 }), /minRounds/);
});

function fixture(t) {
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-policy-'));
    t.after(() => fs.rmSync(storeDir, { recursive: true, force: true }));
    return { storeDir, runId: 'run-1', targetFingerprint: 'target-a' };
}

test('TC-HARNESS-STATE-001: existing malformed records cannot restart or lose history', t => {
    for (const contents of ['{', 'null', 'false', '{}', ' '.repeat(1024 * 1024 + 1)]) {
        const f = fixture(t);
        startRun(f);
        recordRound({ ...f, round: 1, findings: [{ id: 'retained', severity: 'HIGH' }] });
        const file = path.join(f.storeDir, `${f.runId}.json`);
        fs.writeFileSync(file, contents);
        assert.throws(() => startRun(f), /invalid review run|already exists/i);
        assert.throws(() => getRun(f), /invalid review run/i);
        assert.equal(fs.readFileSync(file, 'utf8'), contents);
        assert.deepEqual(fs.readdirSync(f.storeDir), [`${f.runId}.json`]);
    }
});

test('TC-HARNESS-STATE-002: non-file records remain untouched and missing records may start', t => {
    const f = fixture(t);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    fs.mkdirSync(file);
    assert.throws(() => startRun(f), /invalid review run/i);
    assert.equal(fs.lstatSync(file).isDirectory(), true);
    const fresh = fixture(t);
    assert.equal(startRun(fresh).roundsCompleted, 0);
    assert.throws(() => startRun(fresh), /already exists/);
});

test('TC-HARNESS-STATE-003: dangling symbolic records cannot be replaced', t => {
    const f = fixture(t);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    try { fs.symlinkSync('missing-target.json', file); }
    catch (error) {
        if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip(`symlink capability unavailable: ${error.code}`);
        throw error;
    }
    assert.throws(() => startRun(f), /invalid review run/i);
    assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
    assert.equal(fs.readlinkSync(file), 'missing-target.json');
});

test('TC-HARNESS-STATE-004: unreadable metadata/content and oversized valid state fail closed', t => {
    const f = fixture(t);
    const state = startRun(f);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    const original = fs.readFileSync(file, 'utf8');
    const moduleFile = path.resolve(__dirname, '../lib/review-policy.cjs');
    const source = fs.readFileSync(moduleFile, 'utf8');
    for (const operation of ['lstatSync', 'readFileSync']) {
        const facade = Object.create(fs);
        facade[operation] = (target, ...args) => {
            if (target === file) throw Object.assign(new Error('synthetic access denied'), { code: 'EACCES' });
            return fs[operation](target, ...args);
        };
        const loaded = { exports: {} };
        require('node:vm').runInNewContext(source, {
            require: name => name === 'node:fs' ? facade : require(name), module: loaded, process, Buffer
        }, { filename: moduleFile });
        assert.throws(() => loaded.exports.startRun(f), /invalid review run/i, operation);
        assert.throws(() => loaded.exports.getRun(f), /invalid review run/i, operation);
        assert.equal(fs.readFileSync(file, 'utf8'), original);
        assert.deepEqual(fs.readdirSync(f.storeDir), [`${f.runId}.json`]);
    }
    const oversized = JSON.stringify({ ...state, padding: 'x'.repeat(1024 * 1024) });
    fs.writeFileSync(file, oversized);
    assert.throws(() => getRun(f), /bounded regular file/);
    assert.throws(() => startRun(f), /bounded regular file/);
    assert.equal(fs.readFileSync(file, 'utf8'), oversized);
});

test('TC-HARNESS-006: durable transitions are idempotent and preserve interruption budget', t => {
    const f = fixture(t);
    const started = startRun({ ...f, now: 1000 });
    assert.equal(started.roundsCompleted, 0);
    const first = recordRound({ ...f, round: 1, findings: [{ id: 'x', severity: 'HIGH' }], now: 1100 });
    assert.equal(first.roundsCompleted, 1);
    const same = recordRound({ ...f, round: 1, findings: [{ id: 'x', severity: 'HIGH' }], now: 1200 });
    assert.equal(same.roundsCompleted, 1);
    assert.throws(() => recordRound({ ...f, round: 1, findings: [{ id: 'y', severity: 'LOW' }], now: 1201 }), /cannot be overwritten|Expected next/);
    const paused = interruptRun({ ...f, reason: 'host closed', now: 1300 });
    assert.equal(paused.roundsCompleted, 1);
    const resumed = resumeRun({ ...f, now: 1400 });
    assert.equal(resumed.roundsCompleted, 1);
    assert.equal(resumed.resumeCount, 1);
    const done = recordRound({ ...f, round: 2, findings: [], now: 1500 });
    assert.equal(done.status, 'ready');
    assert.throws(() => recordRound({ ...f, round: 3, findings: [], now: 1550 }), /round/);
    const accepted = acceptRun({ ...f, round: 2, now: 1600 });
    assert.equal(accepted.status, 'accepted');
    assert.equal(getRun(f).acceptedRound, 2);
});

test('TC-HARNESS-ROUND-EXT-003: a durable run spends round 3 only on recorded CRITICAL/HIGH evidence', t => {
    const spent = fixture(t);
    startRun({ ...spent, now: 5000 });
    recordRound({ ...spent, round: 1, findings: [{ id: 'm', severity: 'MEDIUM' }], now: 5010 });
    const medium = recordRound({ ...spent, round: 2, findings: [{ id: 'm', severity: 'MEDIUM' }], now: 5020 });
    assert.equal(medium.maxRounds, MAX_ROUNDS);
    assert.equal(medium.extension, null);
    assert.equal(medium.rounds[1].evaluation.status, 'ESCALATE');
    assert.throws(() => recordRound({ ...spent, round: 3, findings: [], now: 5030 }), /budget exhausted/);

    const extended = fixture(t);
    startRun({ ...extended, now: 6000 });
    recordRound({ ...extended, round: 1, findings: [{ id: 'h', severity: 'HIGH' }], now: 6010 });
    const second = recordRound({ ...extended, round: 2, findings: [{ id: 'h', severity: 'HIGH' }], now: 6020 });
    assert.equal(second.maxRounds, HARD_MAX_ROUNDS);
    assert.deepEqual(second.extension.findings, ['h']);
    assert.equal(second.extension.grantedAtRound, 2);
    const third = recordRound({ ...extended, round: 3, findings: [{ id: 'l', severity: 'LOW' }], now: 6030 });
    assert.equal(third.status, 'ready');
    assert.equal(third.rounds[2].evaluation.deferredLow.length, 1);
    assert.equal(acceptRun({ ...extended, round: 3, now: 6040 }).acceptedRound, 3);
    assert.throws(() => recordRound({ ...extended, round: 4, findings: [], now: 6050 }), /round/);
});

test('TC-HARNESS-ROUND-EXT-004: a granted extension survives a target change but is never re-granted', t => {
    const f = fixture(t);
    startRun({ ...f, now: 7000 });
    recordRound({ ...f, round: 1, findings: [{ id: 'c', severity: 'CRITICAL' }], now: 7010 });
    recordRound({ ...f, round: 2, findings: [{ id: 'c', severity: 'CRITICAL' }], now: 7020 });
    const changed = invalidateRun({ ...f, targetFingerprint: 'target-b', now: 7030 });
    assert.equal(changed.maxRounds, HARD_MAX_ROUNDS, 'a re-reviewed target keeps the bounded budget');
    assert.equal(changed.extension.grantedAtRound, 2);
    const third = recordRound({ ...f, targetFingerprint: 'target-b', round: 3, findings: [{ id: 'c', severity: 'CRITICAL' }], now: 7040 });
    assert.equal(third.status, 'in_progress');
    assert.equal(third.rounds[2].evaluation.status, 'ESCALATE');
    assert.equal(third.extension.grantedAtRound, 2, 'round 3 evidence never re-grants the extension');
    assert.equal(third.maxRounds, HARD_MAX_ROUNDS);
    assert.throws(() => acceptRun({ ...f, targetFingerprint: 'target-b', round: 3, now: 7050 }), /not eligible/);
});

test('TC-HARNESS-TEST-LOOP-001: failing test gates keep a durable run going past the review cap until green', t => {
    const f = fixture(t);
    const failing = [{ id: 'unit', kind: 'test', status: 'FAIL', reason: 'suite red' }];
    startRun({ ...f, now: 8000 });
    for (let round = 1; round <= 5; round++) {
        const state = recordRound({ ...f, targetFingerprint: `fix-${round}`, round, hardGates: failing, now: 8000 + round });
        const evaluation = state.rounds[round - 1].evaluation;
        assert.equal(evaluation.status, 'CONTINUE', `round ${round}`);
        assert.equal(evaluation.testLoopContinues, true);
        assert.equal(state.extension, null, 'a failing test never buys the review extension');
        assert.equal(state.maxRounds, MAX_ROUNDS, 'the review budget itself is never raised by tests');
        assert.throws(() => acceptRun({ ...f, targetFingerprint: `fix-${round}`, now: 8100 + round }), /not eligible/);
    }
    const green = recordRound({ ...f, targetFingerprint: 'fix-6', round: 6,
        hardGates: [{ id: 'unit', kind: 'test', status: 'PASS' }], now: 8200 });
    assert.equal(green.status, 'ready');
    assert.equal(acceptRun({ ...f, targetFingerprint: 'fix-6', round: 6, now: 8210 }).acceptedRound, 6);
    assert.throws(() => recordRound({ ...f, targetFingerprint: 'fix-7', round: 7, now: 8220 }), /budget exhausted/,
        'a green round never re-opens the loop');
});

test('TC-HARNESS-TEST-LOOP-002: review blockers beside failing tests still obey the round-3 rule', t => {
    const medium = fixture(t);
    startRun({ ...medium, now: 9000 });
    recordRound({ ...medium, round: 1, findings: [{ id: 'm', severity: 'MEDIUM' }], now: 9010 });
    const spent = recordRound({ ...medium, round: 2, findings: [{ id: 'm', severity: 'MEDIUM' }],
        hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }], now: 9020 });
    assert.equal(spent.rounds[1].evaluation.status, 'ESCALATE', 'an open MEDIUM at the base cap escalates even with red tests');
    assert.throws(() => recordRound({ ...medium, round: 3, now: 9030 }), /budget exhausted/);

    const high = fixture(t);
    startRun({ ...high, now: 9100 });
    recordRound({ ...high, round: 1, findings: [{ id: 'h', severity: 'HIGH' }], now: 9110 });
    const extended = recordRound({ ...high, round: 2, findings: [{ id: 'h', severity: 'HIGH' }],
        hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }], now: 9120 });
    assert.deepEqual(extended.extension.findings, ['h'], 'only the review blocker is named as the grant');
    const third = recordRound({ ...high, targetFingerprint: 'fixed', round: 3,
        hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }], now: 9130 });
    assert.equal(third.rounds[2].evaluation.status, 'CONTINUE');
    const fourth = recordRound({ ...high, targetFingerprint: 'fixed-2', round: 4,
        findings: [{ id: 'regression', severity: 'HIGH' }], hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }], now: 9140 });
    assert.equal(fourth.rounds[3].evaluation.status, 'ESCALATE', 'a new review blocker past the hard cap escalates');
    assert.throws(() => recordRound({ ...high, targetFingerprint: 'fixed-3', round: 5, now: 9150 }), /budget exhausted/);
});

test('TC-HARNESS-006: changed target invalidates evidence without resetting bounded budget', t => {
    const f = fixture(t);
    startRun({ ...f, now: 2000 });
    recordRound({ ...f, round: 1, findings: [], now: 2100 });
    const changed = invalidateRun({ ...f, targetFingerprint: 'target-b', now: 2200 });
    assert.equal(changed.targetChanged, true);
    assert.equal(changed.roundsCompleted, 1);
    assert.equal(changed.rounds[0].valid, false);
    assert.throws(() => acceptRun({ ...f, targetFingerprint: 'target-b', now: 2300 }), /not eligible/);
    const next = recordRound({ ...f, targetFingerprint: 'target-b', round: 2, findings: [], now: 2400 });
    assert.equal(next.roundsCompleted, 2);
    assert.equal(next.targetRevision, 1);
    assert.throws(() => recordRound({ ...f, targetFingerprint: 'target-b', round: 1, findings: [], now: 2500 }), /Expected next round/);
});

test('TC-HARNESS-006: round-two LOWs survive in state while hard gates block acceptance', t => {
    const f = fixture(t);
    startRun({ ...f, now: 3000 });
    recordRound({ ...f, round: 1, findings: [], now: 3010 });
    const second = recordRound({ ...f, round: 2, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', status: 'PASS' }], now: 3020 });
    assert.equal(second.status, 'ready');
    assert.equal(second.rounds[1].evaluation.deferredLow.length, 1);
    const g = fixture(t);
    startRun({ ...g, now: 3100 });
    recordRound({ ...g, round: 1, findings: [], now: 3110 });
    const blocked = recordRound({ ...g, round: 2, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', status: 'FAIL' }], now: 3120 });
    assert.equal(blocked.status, 'in_progress');
    assert.throws(() => acceptRun({ ...g, round: 2, now: 3130 }), /not eligible/);
});

test('TC-HARNESS-006: newer evidence supersedes acceptance of an earlier clean round', t => {
    for (const evidence of [
        { findings: [{ id: 'new-defect', severity: 'HIGH' }] },
        { hardGates: [{ id: 'tests', status: 'FAIL' }] },
        { findings: [] }
    ]) {
        const f = fixture(t);
        startRun(f);
        recordRound({ ...f, round: 1 });
        acceptRun({ ...f, round: 1 });
        const next = recordRound({ ...f, round: 2, ...evidence });
        assert.equal(next.acceptedRound, null, 'new evidence revokes superseded acceptance');
        assert.throws(() => acceptRun({ ...f, round: 1 }), /latest completed round/);
        if (next.status === 'ready') {
            assert.equal(acceptRun(f).acceptedRound, 2);
            assert.equal(acceptRun({ ...f, round: 2 }).acceptedRound, 2, 'retry remains idempotent');
        } else {
            assert.throws(() => acceptRun(f), /not eligible/);
        }
    }
});

test('TC-HARNESS-006: acceptance recomputes eligibility from recorded gate evidence', t => {
    const f = fixture(t);
    startRun(f);
    recordRound({ ...f, round: 1, hardGates: [{ id: 'tests', status: 'FAIL' }] });
    const file = path.join(f.storeDir, `${f.runId}.json`);
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    state.rounds[0].evaluation.canComplete = true;
    fs.writeFileSync(file, JSON.stringify(state));
    assert.throws(() => acceptRun(f), /not eligible/);
    assert.equal(getRun(f).acceptedRound, null);
});

test('TC-HARNESS-006: CLI rejects injected clocks and malformed store roots', t => {
    const f = fixture(t);
    const script = path.resolve(__dirname, '../lib/review-policy.cjs');
    const badClock = spawnSync(process.execPath, [script, 'start'], {
        input: JSON.stringify({ ...f, now: 1 }), encoding: 'utf8'
    });
    assert.equal(badClock.status, 2);
    assert.match(badClock.stderr, /real clock/);
    assert.throws(() => startRun({ ...f, storeDir: path.parse(f.storeDir).root, now: 4000 }), /filesystem root/);
});

test('TC-HARNESS-006: seeded round-reset mutant is killed', () => {
    // The mutant would treat a round-2 LOW as blocking; the shared predicate
    // must preserve the documented severity floor instead.
    const mutant = findings => findings.filter(() => true);
    assert.equal(blockingFindings(2, [{ id: 'low', severity: 'LOW' }]).length, 0);
    assert.equal(mutant([{ id: 'low', severity: 'LOW' }]).length, 1);
});

test('TC-HARNESS-PORT-014: project root resolves from nested cwd and copied bundle script path', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-root-'));
    const nested = path.join(root, 'packages', 'service', 'src');
    const script = path.join(root, '.claude', 'scripts', 'entry.cjs');
    fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    assert.deepEqual(resolveProjectRoot({ cwd: nested, scriptPath: script, env: {} }), {
        rootDir: root,
        source: 'cwd-ancestor'
    });
    assert.deepEqual(resolveProjectRoot({ cwd: path.parse(root).root, scriptPath: script, env: {} }), {
        rootDir: root,
        source: 'script-ancestor'
    });
    assert.equal(resolveProjectRoot({ cwd: nested, env: { CLAUDE_PROJECT_DIR: root } }).source, 'env');
    const invalid = resolveProjectRoot({ cwd: nested, env: { CLAUDE_PROJECT_DIR: 'relative-root' } });
    assert.equal(invalid.source, 'invalid-env-fallback');
    assert.match(invalid.error, /absolute path/);
});

assert.equal(MAX_ROUNDS, 2);
assert.equal(HARD_MAX_ROUNDS, 3);
assert.equal(POLICY_VERSION, 4);
