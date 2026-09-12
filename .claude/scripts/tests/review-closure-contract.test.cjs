'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const policy = require('../lib/review-policy.cjs');
const baseline = require('../lib/workflow-baseline.cjs');
const { spawnSync } = require('node:child_process');
const readSkill = name => fs.readFileSync(path.resolve(__dirname, '../../skills', name, 'SKILL.md'), 'utf8');
const why = readSkill('why-review');
const workflow = readSkill('workflow-review-changes');
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');

// Static source contracts, not measured model execution. Runtime scenarios below
// exercise the real policy separately: a valid report is not target acceptance.
function assertReportClosure(text) {
    const body = local(text);
    assert.doesNotMatch(body, /(?:until|pass clears|Repeat until)[^\n]*(?:current round severity bar|no CRITICAL\/HIGH\/MEDIUM|zero CRITICAL\/HIGH\/MEDIUM)/i);
    assert.match(body, /CLEAN validates the report, not the target/);
    assert.match(body, /retained target findings[^\n]+handoff/i);
    assert.match(body, /Review only — do NOT modify target files/);
    assert.match(body, /both Adversarial Rounds/);
    assert.match(body, /at most 1 re-do round/);
    assert.doesNotMatch(body, /Max 2 re-do rounds|re-do validation until the findings set is reconciled \(max 2\)/i);
    assert.match(body, /TERMINAL[^\n]+NEVER[^\n]+sub-agent/);
    assert.match(body, /≥85%/);
    assert.match(body, /spec-drift verdict/);
    assert.match(body, /test-feedback action/);
}

function assertDurableBudget(text) {
    const body = local(text);
    assert.doesNotMatch(body, /conversation context only|no persistent files|not persistent files|starts fresh at round 0|repeats 3 times/i);
    assert.match(body, /resume[^\n]+completed rounds/i);
    assert.match(body, /target[^\n]+preserve[^\n]+budget/i);
    assert.match(body, /2 full invocations with no progress/);
    assert.match(body, /2 rounds MAX/);
}

test('R2-14/15: local closure anchors preserve report handoff and durable rounds', () => {
    assertReportClosure(why);
    assertDurableBudget(workflow);
    assertReportClosure(why.replace(/\r?\n/g, '\r\n'));
    assertDurableBudget(workflow.replace(/\r?\n/g, '\r\n'));
});

test('R2-14/15: contradictory closure and session-reset mutants are rejected', () => {
    assertReportClosure(why);
    assertDurableBudget(workflow);
    for (const clause of ['Repeat until no CRITICAL/HIGH/MEDIUM remain.', 'A complete pass clears the current round severity bar.']) {
        assert.throws(() => assertReportClosure(`${why}\n${clause}`), { code: 'ERR_ASSERTION' });
    }
    for (const clause of ['Each conversation starts fresh at round 0.', 'Track in conversation context only.', 'Stop when the blocker repeats 3 times.']) {
        assert.throws(() => assertDurableBudget(`${workflow}\n${clause}`), { code: 'ERR_ASSERTION' });
    }
    // Restore a target-clearance obligation at each local closure carrier, not
    // only in the authoritative body: contradictory summaries also misroute.
    const anchors = [
        '- **STEP 2', '- **STEP 5', '**Workflow:**', '> **MUST ATTENTION:** In **full mode only**',
        '> Run the full adversarial review', '/goal why-review', '3. **CLEAN**', '5. **RE-DO holistically**',
        '**IMPORTANT MUST ATTENTION Main steps', '- **Double Round-Trip Review:**',
        '**IMPORTANT MUST ATTENTION** execute the review loop:',
    ];
    for (const anchor of anchors) {
        const lines = local(why).split(/\r?\n/).filter(line => line.startsWith(anchor));
        assert.equal(lines.length, 1, `one closure carrier: ${anchor}`);
        const mutant = why.replace(lines[0], `${lines[0]} Repeat until no CRITICAL/HIGH/MEDIUM remain.`);
        assert.notEqual(mutant, why);
        assert.throws(() => assertReportClosure(mutant), { code: 'ERR_ASSERTION' });
    }
});

test('R2-15: CLEAN report with a retained HIGH hands off without clearing the outer target', () => {
    assertReportClosure(why);
    const findings = [{ id: 'supported-path', severity: 'HIGH', summary: 'validated defect' }];
    for (const round of [1, 2]) {
        assert.equal(policy.evaluateRound({ round, findings }).canComplete, false);
        assert.equal(policy.blockingFindings(round, findings).length, 1);
    }
    assert.throws(() => policy.evaluateRound({ round: 3, findings }), /round/);
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'polish', severity: 'LOW' }] }).canComplete, true);
    assert.equal(policy.evaluateRound({ round: 2, hardGates: [{ id: 'coverage', status: 'FAIL' }] }).canComplete, false);
});

test('R2-14: interruption and target revision retain spent rounds and reject stale acceptance', t => {
    assertDurableBudget(workflow);
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-closure-'));
    t.after(() => fs.rmSync(storeDir, { recursive: true, force: true }));
    const run = { storeDir, runId: 'resume', targetFingerprint: 'before' };
    policy.startRun(run);
    policy.recordRound({ ...run, round: 1, findings: [{ id: 'fix', severity: 'HIGH' }] });
    policy.interruptRun({ ...run, reason: 'context interruption' });
    assert.equal(policy.resumeRun(run).roundsCompleted, 1);
    const changed = { ...run, targetFingerprint: 'after' };
    assert.equal(policy.invalidateRun(changed).roundsCompleted, 1);
    assert.throws(() => policy.acceptRun({ ...changed, round: 1 }));
    assert.equal(policy.recordRound({ ...changed, round: 2, findings: [] }).roundsCompleted, 2);
    assert.equal(policy.acceptRun({ ...changed, round: 2 }).acceptedRound, 2);
});

function closureFixture(t) {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'owned-run-closure-'));
    t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
    const rootDir = path.join(fixtureDir, 'project');
    const storeDir = path.join(fixtureDir, 'private-store');
    fs.mkdirSync(rootDir);
    // Git availability is not required for exact run cleanup; no real repository
    // or shared default store participates in this lifecycle fixture.
    for (const runId of ['parent', 'sibling']) baseline.captureBaseline({ rootDir, storeDir, runId });
    baseline.captureBaseline({ rootDir, storeDir, runId: 'child', parentRunId: 'parent' });
    const retained = ['parent', 'sibling'].map(runId => ({
        file: path.join(storeDir, runId, 'baseline.json'),
        bytes: fs.readFileSync(path.join(storeDir, runId, 'baseline.json')),
    }));
    const close = () => spawnSync(process.execPath, [path.resolve(__dirname, '../lib/workflow-baseline.cjs'), 'close'], {
        input: JSON.stringify({ rootDir, storeDir, runId: 'child' }), encoding: 'utf8', windowsHide: true,
        timeout: 10000, env: { ...process.env, CLAUDE_PROJECT_DIR: rootDir },
    });
    return { rootDir, storeDir, retained, close };
}

test('R3-41: exact child close removes only its record and preserves parent/sibling bytes', t => {
    const fx = closureFixture(t);
    const result = fx.close();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), { runId: 'child', closed: true, deletionFailures: [] });
    assert.equal(fs.existsSync(path.join(fx.storeDir, 'child')), false);
    for (const retained of fx.retained) assert.deepEqual(fs.readFileSync(retained.file), retained.bytes);
    assert.equal(fs.existsSync(fx.rootDir), true);
});

test('R3-41: zero-exit close with deletion failures is not successful closure', t => {
    const fx = closureFixture(t);
    const extra = path.join(fx.storeDir, 'child', 'unrecorded.txt');
    fs.writeFileSync(extra, 'MUST_NOT_BE_BROADLY_DELETED');
    const result = fx.close();
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.runId, 'child');
    assert.equal(output.closed, false);
    assert.ok(output.deletionFailures.some(failure => failure.label === 'run-directory'));
    assert.equal(fs.readFileSync(extra, 'utf8'), 'MUST_NOT_BE_BROADLY_DELETED');
    for (const retained of fx.retained) assert.deepEqual(fs.readFileSync(retained.file), retained.bytes);
});
