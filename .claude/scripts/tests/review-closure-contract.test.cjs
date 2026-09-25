'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const policy = require('../lib/review-policy.cjs');
const baseline = require('../lib/workflow-baseline.cjs');
const { spawnSync } = require('node:child_process');
// A skill's contract is its SKILL.md plus every `references/*.md` (sorted), read as one text: a mode
// section moved to a point-of-use reference is still the skill's contract, so every pinned phrase
// must hold wherever it lives. `readSkillParts` keeps the files apart for position-aware checks.
function readSkillParts(name) {
    const dir = path.resolve(__dirname, '../../skills', name);
    const parts = [['SKILL.md', fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')]];
    const refs = path.join(dir, 'references');
    if (fs.existsSync(refs)) {
        for (const file of fs.readdirSync(refs).filter(entry => entry.endsWith('.md')).sort()) {
            parts.push([`references/${file}`, fs.readFileSync(path.join(refs, file), 'utf8')]);
        }
    }
    return parts;
}
const joinParts = parts => parts.map(([, text]) => text).join('\n');
const readSkill = name => joinParts(readSkillParts(name));
const whyParts = readSkillParts('why-review');
const why = joinParts(whyParts);
const workflow = readSkill('workflow-review-changes');
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const FIX_LOOP_BLOCK = /<!-- FIX-LOOP-MODE:START -->[\s\S]*?<!-- FIX-LOOP-MODE:END -->/g;
// The opt-in `--fix-loop` mode legitimately owns target clearance (it is the fixing caller), so
// the report-only closure contract binds every DEFAULT-mode carrier outside its delimited blocks.
// assertFixLoopMode pins that those blocks stay few, flagged, and confined to the mode.
const defaultMode = text => local(text).replace(FIX_LOOP_BLOCK, '');

// Static source contracts, not measured model execution. Runtime scenarios below
// exercise the real policy separately: a valid report is not target acceptance.
function assertReportClosure(text) {
    const body = defaultMode(text);
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
        const lines = defaultMode(why).split(/\r?\n/).filter(line => line.startsWith(anchor));
        assert.equal(lines.length, 1, `one closure carrier: ${anchor}`);
        const mutant = why.replace(lines[0], `${lines[0]} Repeat until no CRITICAL/HIGH/MEDIUM remain.`);
        assert.notEqual(mutant, why);
        assert.throws(() => assertReportClosure(mutant), { code: 'ERR_ASSERTION' });
    }
});

// `parts` is the skill as [relative path, text] pairs (see readSkillParts). The mode section lives in
// `references/fix-loop.md` (read at point of use); the summary and closing blocks stay in SKILL.md, so
// the position checks run per file while the fence count runs over the whole contract.
function assertFixLoopMode(parts) {
    const files = new Map(parts.map(([rel, text]) => [rel, local(text).replace(/\r\n/g, '\n')]));
    const router = files.get('SKILL.md') ?? '';
    const reference = files.get('references/fix-loop.md') ?? '';
    const source = [...files.values()].join('\n');
    // Balanced, non-nested fences across every file: an extra opener would silently swallow default-mode prose.
    assert.equal(source.split('<!-- FIX-LOOP-MODE:START -->').length - 1, 3, 'exactly three openers');
    assert.equal(source.split('<!-- FIX-LOOP-MODE:END -->').length - 1, 3, 'exactly three closers');
    const routerBlocks = router.match(FIX_LOOP_BLOCK) ?? [];
    const referenceBlocks = reference.match(FIX_LOOP_BLOCK) ?? [];
    assert.equal(routerBlocks.length, 2, 'quick summary and closing reminders are the only delimited blocks in SKILL.md');
    assert.equal(referenceBlocks.length, 1, 'the mode section is the only delimited block in references/fix-loop.md');
    const blocks = [...routerBlocks, ...referenceBlocks];
    for (const block of blocks) assert.match(block, /--fix-loop/, 'every delimited block belongs to the flag');
    const [summary, closing] = routerBlocks;
    const [section] = referenceBlocks;
    // Primacy and recency: the mode is announced before the mission body and restated at the end.
    assert.ok(router.indexOf(summary) < router.indexOf('## Your Mission'), 'mode summary sits in the Quick Summary');
    assert.ok(router.indexOf(closing) > router.indexOf('## Closing Reminders'), 'mode reminders sit in Closing Reminders');
    // Point of use: a --fix-loop run reads the reference before anything else, and SKILL.md holds no mode section.
    assert.match(summary, /`references\/fix-loop\.md` — read it FIRST when the flag is present \(BLOCKING\)/);
    assert.doesNotMatch(router, /^## Fix-Loop Mode/m, 'the mode section moved to references/fix-loop.md');
    assert.match(parts[0][1], /^description: '[^'\n]*--fix-loop[^'\n]*'\r?$/m);
    // Opt-in: explicit detection row, terminal-mode precedence, and a no-flag scope gate.
    assert.match(source, /\| \*\*fix-loop\*\* \(opt-in\)\s*\| `\$ARGUMENTS` contains `--fix-loop` AND no `validate-findings` token/);
    assert.match(source, /`validate-findings` beats `--fix-loop`/);
    assert.match(section, /^<!-- FIX-LOOP-MODE:START -->\s*## Fix-Loop Mode \(`--fix-loop`/);
    assert.match(section, /Without the flag NOTHING here applies/);
    // The gates of the retired standalone loop skill survive inside the mode.
    assert.match(section, /Resolve\/create the Goal Contract/);
    assert.match(section, /\*\*1\. Protocol loop — ALWAYS binding/);
    assert.match(section, /If `\/goal` is unavailable, unregistered, or not permitted/);
    assert.match(section, /Trade-Off Gate on the blocking fix set \(BLOCKING — before any edit lands\)/);
    assert.match(section, /Fix ONLY validated findings that block this round/);
    assert.match(section, /re-run a FRESH full review pass over the CHANGED target/);
    assert.match(section, /did not shrink across 2 consecutive rounds → STOP & escalate/);
    assert.match(section, /## Deferred LOW Findings \(severity floor, round ≥2\)/);
    assert.match(section, /### Step FL-3 — Recap/);
    // Each round is plain full mode in the main session — never a nested flag or a sub-agent.
    assert.match(section, /NEVER self-invoke with the flag/);
    assert.match(section, /NEVER the `Agent` tool/);
    // Read-only callers never enable it; the plan-review wave member stays report-only.
    assert.match(source, /These callers NEVER pass `--fix-loop`[^\n]*`\/plan-review` wave member is ALWAYS plain full mode/);
    assert.match(source, /`\/plan-review`'s Parallel Review Wave \([^|\n]*NEVER `--fix-loop`\)/);
    assert.match(closing, /NEVER let a read-only caller pass the flag/);
}

test('R2-14/FL: why-review --fix-loop is opt-in, delimited, and carries the outer loop gates', () => {
    // Given the skill's files (SKILL.md + references/*.md) with LF line endings.
    const parts = whyParts.map(([rel, text]) => [rel, text.replace(/\r\n/g, '\n')]);
    const source = joinParts(parts);
    const mutate = (before, after) => parts.map(([rel, text]) => [rel, text.split(before).join(after)]);
    // When the mode contract and the unchanged default-mode closure are evaluated.
    assertFixLoopMode(parts);
    assertReportClosure(source);
    // Then each weakened clause is rejected by the same assertion used on the real source.
    for (const [before, after] of [
        ['Without the flag NOTHING here applies', 'The flag is implied'],
        ['NEVER self-invoke with the flag', 'Self-invoke with the flag when helpful'],
        ['These callers NEVER pass `--fix-loop`', 'These callers may pass `--fix-loop`'],
        ['Trade-Off Gate on the blocking fix set (BLOCKING — before any edit lands)', 'Apply the fix set'],
        ['did not shrink across 2 consecutive rounds → STOP & escalate', 'did not shrink → keep looping'],
        ['`validate-findings` beats `--fix-loop`', '`--fix-loop` beats `validate-findings`'],
        ['## Deferred LOW Findings (severity floor, round ≥2)', 'LOW findings may be dropped'],
        ['<!-- FIX-LOOP-MODE:END -->\n\n**Workflow:**', '\n\n**Workflow:**'],
    ]) {
        assert.ok(source.includes(before), `mutation anchor exists: ${before}`);
        assert.throws(() => assertFixLoopMode(mutate(before, after)), { code: 'ERR_ASSERTION' }, before);
    }
    // Wrapping default-mode closure prose in a mode block cannot hide it from the closure contract,
    // whichever file of the skill holds that prose.
    assert.ok(source.includes('3. **CLEAN**'), 'mutation anchor exists: 3. **CLEAN**');
    assert.throws(() => assertFixLoopMode(mutate('3. **CLEAN**', '<!-- FIX-LOOP-MODE:START -->\n3. **CLEAN**')), { code: 'ERR_ASSERTION' });
    // Moving the mode section back into SKILL.md, or dropping the point-of-use pointer, is rejected.
    const inlined = [[parts[0][0], `${parts[0][1]}\n${parts.find(([rel]) => rel === 'references/fix-loop.md')[1]}`],
        ...parts.filter(([rel]) => rel !== 'SKILL.md' && rel !== 'references/fix-loop.md')];
    assert.throws(() => assertFixLoopMode(inlined), { code: 'ERR_ASSERTION' });
    assert.throws(() => assertFixLoopMode(mutate('`references/fix-loop.md` — read it FIRST when the flag is present (BLOCKING)', 'the **Fix-Loop Mode** section')), { code: 'ERR_ASSERTION' });
});

test('R2-15: CLEAN report with a retained HIGH hands off without clearing the outer target', () => {
    assertReportClosure(why);
    const findings = [{ id: 'supported-path', severity: 'HIGH', summary: 'validated defect' }];
    for (const round of [1, 2, 3]) {
        assert.equal(policy.evaluateRound({ round, findings }).canComplete, false);
        assert.equal(policy.blockingFindings(round, findings).length, 1);
    }
    // A retained HIGH buys the single extension round at the base cap, and
    // nothing at the hard cap: round 3 hands off to a human instead.
    assert.equal(policy.evaluateRound({ round: 2, findings }).status, 'CONTINUE');
    assert.equal(policy.evaluateRound({ round: 3, findings }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 4, findings }).status, 'ESCALATE');
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
    // Resolve the OS temp root (macOS: /var -> /private/var): a supplied store beneath a link is refused by design.
    const fixtureDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'owned-run-closure-')));
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
