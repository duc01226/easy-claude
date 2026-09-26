import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => fs.readFileSync(path.join(root, '.claude', relative), 'utf8');
const skill = name => read(`skills/${name}/SKILL.md`);
// A loop skill's contract is SKILL.md plus its point-of-use references (sorted), joined with '\n':
// the `--fix-loop` modes of why-review, changes-review and workflow-review-changes live in
// `references/fix-loop.md`, read first when the flag is present.
const skillContract = name => {
    const refs = path.join(root, '.claude', 'skills', name, 'references');
    const parts = [skill(name)];
    if (fs.existsSync(refs)) {
        for (const file of fs.readdirSync(refs).filter(entry => entry.endsWith('.md')).sort()) parts.push(fs.readFileSync(path.join(refs, file), 'utf8'));
    }
    return parts.join('\n');
};
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const policy = createRequire(import.meta.url)('../../lib/review-policy.cjs');
const { resolveWorkflowManifest } = createRequire(import.meta.url)('../../lib/workflow-manifest.cjs');

// These checks protect instruction contracts, not claims about model execution.
// Each mutation restores an actual contradictory clause or removes an essential
// instruction. It must fail the SAME assertion used on the real source.
function rejects(check, source, before, after) {
    assert.ok(source.includes(before), `mutation anchor exists: ${before}`);
    // Replace every occurrence so repeated operational instructions cannot leave a surviving copy
    // that makes a weakened contract appear valid.
    const mutant = source.replaceAll(before, after);
    assert.notEqual(mutant, source);
    assert.throws(() => check(mutant), { code: 'ERR_ASSERTION' });
}

function assertAcceptance(text) {
    assert.match(text, /replace visual baselines ONLY after inspection and an explicit `HUMAN-ACCEPTED` record/);
    assert.match(text, /Preserve the previous accepted baseline while acceptance is missing, ambiguous, rejected, or environment-blocked/);
    assert.doesNotMatch(text, /ALWAYS update visual baselines when UI changes/);
}

test('R3-PROMPT-025: visual candidates cannot redefine expectations without acceptance', () => {
    const source = read('agents/e2e-runner.md');
    assertAcceptance(source);
    rejects(assertAcceptance, source, 'replace visual baselines ONLY after inspection and an explicit `HUMAN-ACCEPTED` record', 'ALWAYS update visual baselines when UI changes');
    rejects(assertAcceptance, source, 'Preserve the previous accepted baseline while acceptance is missing, ambiguous, rejected, or environment-blocked', 'Replace the previous baseline immediately');
});

function assertSyncHandoff(text) {
    assert.match(text, /Sync Codex Mirrors/);
    assert.match(text, /one executable pipeline/);
    assert.match(text, /--skip=claude-md/);
    assert.match(text, /not a nested `\/sync-codex` skill call/);
    assert.match(text, /TaskCreate: "Sync Codex mirrors from updated CLAUDE\.md → invoke \/sync-codex"/);
    assert.doesNotMatch(text, /Report stale Codex mirrors → instruct user/);
}

test('R3-PROMPT-026: CLAUDE.md completion invokes the shared mirror runner after final edits', () => {
    // Given the canonical AI-context source and its generated template.
    const source = local(skill('ai-context-refresh'));

    // When the source contract and mutation guards are evaluated.
    assertSyncHandoff(source);
    rejects(assertSyncHandoff, source, 'one executable pipeline', 'two unrelated pipelines');
    rejects(assertSyncHandoff, source, '--skip=claude-md', '--skip=wrong-stage');
    rejects(assertSyncHandoff, source, 'TaskCreate: "Sync Codex mirrors from updated CLAUDE.md → invoke /sync-codex"', 'TaskCreate: "Report stale Codex mirrors → instruct user"');
    const template = read('skills/ai-context-refresh/references/claude-md-template.md');
    assert.match(template, /full `\/sync-codex` run preflights `CLAUDE\.md`/);
    assert.match(template, /completed `\/ai-context-refresh` run invokes the same standalone runner/);
    assert.doesNotMatch(template, /Never auto-run `\/sync-codex`/);
    // Then final CLAUDE.md authoring has one safe, non-recursive mirror handoff.
});

function assertReadiness(text) {
    assert.match(text, /a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance/);
    assert.match(text, /round 2 blocks CRITICAL\/HIGH\/MEDIUM and defers LOW/);
    assert.match(text, /Overall PASS\/FAIL is separate from the advisory score/);
    assert.doesNotMatch(text, /unaccepted CRITICAL\/HIGH|must be resolved or owner-accepted before PASS|Proceed to commit|VERDICT is advisory/);
}

function assertUi(text) {
    assert.match(text, /any validated CRITICAL\/HIGH\/MEDIUM in round 2/);
    assert.match(text, /Record round-2 LOW findings as deferred/);
    assert.match(text, /Any failed binary gate or unresolved evidence/);
    assert.match(text, /WARN \| MEDIUM when bounded but consequential \| Blocks every round/);
    assert.doesNotMatch(text, /Medium \/ Low → WARN\/INFO|0 BLOCKED, 0 WARN — UI compliant/);
}

test('R3-PROMPT-027/031: advisory scores and category labels cannot bypass eligibility', () => {
    const readiness = local(skill('production-readiness-review'));
    const ui = local(skill('ui-review'));
    assertReadiness(readiness);
    assertUi(ui);
    rejects(assertReadiness, readiness, 'a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance', 'an unaccepted CRITICAL/HIGH fail blocks PASS');
    rejects(assertReadiness, readiness, 'round 2 blocks CRITICAL/HIGH/MEDIUM and defers LOW', 'round 2 blocks CRITICAL/HIGH only');
    rejects(assertUi, ui, 'WARN | MEDIUM when bounded but consequential | Blocks every round', 'WARN | Medium / Low → WARN/INFO | Review and decide');
    rejects(assertUi, ui, 'Any failed binary gate or unresolved evidence', 'Only category BLOCKED');
    for (const round of [1, 2]) {
        assert.equal(policy.evaluateRound({ round, findings: [{ id: 'bounded', severity: 'MEDIUM' }] }).canComplete, false);
        assert.equal(policy.evaluateRound({ round, hardGates: [{ id: 'binary', status: 'FAIL' }] }).canComplete, false);
    }
    // Round 3 exists only as the single extension a round-2 CRITICAL/HIGH earns.
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'material', severity: 'HIGH' }] }).extensionGranted, true);
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'bounded', severity: 'MEDIUM' }] }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 3, findings: [{ id: 'material', severity: 'HIGH' }] }).status, 'ESCALATE');
    // Past the hard cap a review blocker still escalates; only failing test gates continue.
    assert.equal(policy.evaluateRound({ round: 4, findings: [{ id: 'material', severity: 'HIGH' }] }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 4, hardGates: [{ id: 'suite', kind: 'test', status: 'FAIL' }] }).status, 'CONTINUE');
    assert.equal(policy.evaluateRound({ round: 1, findings: [{ id: 'polish', severity: 'LOW' }] }).canComplete, false);
    const deferred = policy.evaluateRound({ round: 2, findings: [{ id: 'polish', severity: 'LOW' }] });
    assert.equal(deferred.canComplete, true);
    assert.equal(deferred.deferredLow.length, 1);
    assert.equal(policy.evaluateRound({ round: 1, findings: [] }).canComplete, true);
    assert.equal(policy.evaluateRound({ round: 1, findings: [], minRounds: 2 }).canComplete, false);
    assert.equal(policy.evaluateRound({ round: 2, findings: [], minRounds: 2 }).canComplete, true);
});

function assertFullReport(text) {
    assert.match(text, /Main agent reads the full `tmp\/reports\/` file before synthesis, acceptance, deduplication, or repair planning/);
    assert.match(text, /including every severity and all findings beyond the envelope cap/);
    assert.doesNotMatch(text, /reads `tmp\/reports\/` file only when resolving specific blockers/);
}

test('R3-PROMPT-029: bounded nested return never limits report consumption', () => {
    const source = local(skill('start-workflow'));
    assertFullReport(source);
    rejects(assertFullReport, source, 'Main agent reads the full `tmp/reports/` file before synthesis, acceptance, deduplication, or repair planning', 'Main agent reads `tmp/reports/` file only when resolving specific blockers');
    rejects(assertFullReport, source, 'including every severity and all findings beyond the envelope cap', 'including only salient Critical/High findings');
});

function assertTeaching(text) {
    assert.match(text, /\*\*Delegated return:\*\* A sub-agent emits only the structured/);
    assert.match(text, /\*\*Inline user-facing output:\*\* Preserve the skill's requested explanation or teaching/);
    assert.match(text, /delegated transport limit does not replace that deliverable/);
}

// Sensor row N3 (P26 scratch run). A converted skill carries a shared protocol as a guide line (the
// shared P25 recognizer, never a copied line format) and the hook delivers the projection file; the
// text a model reads is then the skill plus that file. The projection joins only while the guide entry
// is present, so a skill that lost both the body and the guide still fails the same assertion.
const guideCarrier = createRequire(import.meta.url)('../../lib/protocol-guide-carrier.cjs');
function deliveredText(text, tag, skillsDir = path.join(root, '.claude', 'skills')) {
    if (text.includes(`<!-- SYNC:${tag} -->`) || !guideCarrier.hasGuideEntry(text, tag)) return text;
    const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
    return fs.existsSync(projection) ? `${text}\n${fs.readFileSync(projection, 'utf8')}` : text;
}

test('R3-PROMPT-030: inline teaching survives delegated transport constraints', () => {
    const own = skill('understand');
    const source = deliveredText(own, 'incremental-persistence');
    assertTeaching(source);
    rejects(assertTeaching, source, "**Inline user-facing output:** Preserve the skill's requested explanation or teaching", '**At return:** Emit only the structured envelope');
    const body = local(own);
    assert.match(body, /teach|explain/i);
});

test('TC-PDL-065 R3-PROMPT-030 reads a guide carrier through its projection only while the guide is present (N3)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n3-guide-'));
    try {
        // Given a projection holding the teaching rule and a skill carrying only the guide line
        const tag = 'incremental-persistence';
        const skillsDir = path.join(tmp, 'skills');
        const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
        fs.mkdirSync(path.dirname(projection), { recursive: true });
        fs.writeFileSync(projection, "> 3. **Delegated return:** A sub-agent emits only the structured envelope. **Inline user-facing output:** Preserve the skill's requested explanation or teaching; the delegated transport limit does not replace that deliverable.\n");
        const guided = ['# understand', guideCarrier.GUIDE_BLOCK_START, '',
            guideCarrier.formatGuideLine({ tag, summary: 'Persist results per file', when: 'processing many files', path: `.claude/skills/shared/protocols/${tag}.md` }),
            '', guideCarrier.GUIDE_BLOCK_END].join('\n');
        // When the delivered text is checked, Then the guide carrier passes
        assertTeaching(deliveredText(guided, tag, skillsDir));
        // When the guide entry is removed, Then the projection is not joined and the check fails
        assert.throws(() => assertTeaching(deliveredText('# understand\n', tag, skillsDir)), { code: 'ERR_ASSERTION' });
        // When the projection is missing, Then the check fails
        fs.rmSync(projection);
        assert.throws(() => assertTeaching(deliveredText(guided, tag, skillsDir)), { code: 'ERR_ASSERTION' });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

function assertDefaultOnly(text) {
    assert.match(text, /\*\*Supported mode:\*\* use the default `workflow-greenfield-init` sequence resolved from `workflows.json`/);
    assert.doesNotMatch(text, /mode=lean|Lean variant|lean path is a documented gate-skip option/);
}

test('R3-PROMPT-032: greenfield advertises only its resolved manifest mode', () => {
    const source = local(skill('workflow-greenfield-init'));
    assertDefaultOnly(source);
    rejects(assertDefaultOnly, source, '**Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`', '**Lean variant (`mode=lean`)** — a trimmed path is available');
    const registry = JSON.parse(read('workflows.json'));
    const manifest = resolveWorkflowManifest(registry, 'workflow-greenfield-init', { rootDir: root });
    assert.equal(manifest.mode, 'default');
    assert.ok(manifest.occurrences.length > 0);
    assert.throws(() => resolveWorkflowManifest(registry, 'workflow-greenfield-init', { rootDir: root, mode: 'lean' }), /Unknown workflow mode: lean/);
});

function assertOwnedClose(text) {
    const report = text.indexOf('4. **Verify workflow ownership baseline**');
    const recap = text.indexOf('6. **Explain the changes');
    const close = text.indexOf('7. **Close only the workflow-owned baseline run**');
    const announce = text.indexOf('8. Mark this task `completed` and announce');
    assert.ok(report >= 0 && recap > report && close > recap && announce > close, 'report → recap → owned close → completion');
    assert.match(text.slice(close, announce), /workflow-baseline\.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir`/);
    assert.match(text.slice(close, announce), /require `closed === true` and an empty `deletionFailures` array/);
    assert.match(text.slice(close, announce), /retain the closure task as incomplete and report each failure/);
    assert.match(text.slice(close, announce), /preserve the parent run and all sibling runs/);
    assert.match(text.slice(close, announce), /Never call `cleanup-expired` or delete a store directory/);
    assert.match(text.slice(close, announce), /N\/A — no recorded baseline run/);
}

test('R3-PROMPT-041: final report and recap precede exact owned-run close with visible failures', () => {
    const source = local(skill('workflow-end'));
    assertOwnedClose(source);
    for (const anchor of [
        '7. **Close only the workflow-owned baseline run**',
        'workflow-baseline.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir`',
        'require `closed === true` and an empty `deletionFailures` array',
        'retain the closure task as incomplete and report each failure',
        'preserve the parent run and all sibling runs',
        'Never call `cleanup-expired` or delete a store directory',
        'N/A — no recorded baseline run',
    ]) rejects(assertOwnedClose, source, anchor, 'missing closure instruction');
});

// Each loop's own convergence signal: a review loop converges on a clear bar, the workflow loop
// only on a round that applied zero fixes (a clean review whose simplifier still edits is not done).
const CONVERGENCE_ROW = {
    // why-review carries the outer review/fix loop as its optional `--fix-loop` mode.
    'why-review': '(6) the current round bar is clear',
    'changes-review': '(6) the current round bar is clear',
    // workflow-review-changes carries the outer zero-fix loop as its optional `--fix-loop` mode.
    'workflow-review-changes': '(6) the round applied ZERO fixes'
};
// The zero-fix predicate leaves "edits landed but no review blocker is open" (a simplifier-only
// round) needing its own row: the user-decided rule proves a zero-fix pass within budget and
// escalates at a spent budget, so the workflow loop has one extra row before the blocker row.
const PROOF_ROW = {
    'why-review': String.raw`\(7\)`,
    'changes-review': String.raw`\(7\)`,
    'workflow-review-changes': String.raw`\(7\) the round applied fixes but no review blocker is open and no test gate is failing [^;]+→ run the next round to prove a zero-fix pass while within budget, and STOP & escalate once the review budget is spent; \(8\)`
};
const EXTENSION_FIRST = 'checked only after the round-2 CRITICAL/HIGH extension, which is granted first';
const lineStarting = (text, prefix) => text.split(/\r?\n/).find(line => line.startsWith(prefix)) ?? '';
const convergedRows = text => text.split(/\r?\n/).filter(line => /^\|.*\| \*\*CONVERGED/.test(line));

function assertLoopBudget(text, name) {
    const loopRule = local(text);
    // The binding Step 0b protocol sentence and the /goal condition both carry the cap.
    const caps = loopRule.split(/\r?\n/).filter(line => /Cap at `?\{N=2\}`? rounds/.test(line));
    assert.equal(caps.length, 2, 'protocol loop and /goal condition both state the cap');
    for (const line of caps) {
        assert.match(line, /extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL\/HIGH open/);
        assert.match(line, /failing test gate is outside the cap/);
        assert.match(line, /checked only after the round-2 CRITICAL\/HIGH extension, which is granted first/);
        assert.doesNotMatch(line, /cap is hit with/);
    }
    assert.match(loopRule, /\*\*ONE extension round is granted\*\*[^|]*even when the blocker count did not shrink\. Granted once per loop/);
    assert.match(loopRule, /\*\*Keep looping — NO round cap\.\*\*/);
    // The Step 2 rows overlap (a repeated HIGH is both "no progress" and "round-2 HIGH"), so the
    // table is only deterministic with one stated precedence. The user-chosen precedence grants the
    // round-2 CRITICAL/HIGH extension BEFORE the loop's stricter count-based stops, which is what
    // SYNC:double-round-trip-review and review-policy.cjs grant; the list must not claim the count
    // stops come from them. Every row carries the predicate the helper enforces: a spent budget
    // escalates even beside a red suite, and failing tests continue only when no review blocker is open.
    assert.match(loopRule, /\*\*in this order — the first matching row decides\*\*/);
    assert.doesNotMatch(loopRule, /the order `SYNC:double-round-trip-review` and `review-policy\.cjs` use/);
    assert.match(loopRule, /the count-based stops \(2\) and \(3\) are this loop's stricter exit on top of them, evaluated after the extension so they never pre-empt it/);
    assert.match(loopRule, /count only review blockers — validated findings at each round's own bar plus failed non-test binary gates, never failing test gates\)/);
    assert.match(loopRule, /\(1\) round 2 left a validated CRITICAL\/HIGH review blocker open → the one extension round, even when the blocker count did not shrink; \(2\) review blockers increased vs the prior round → STOP & escalate; \(3\) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate \(the EARLIER exit before the budget\); \(4\) the review budget is spent with a review blocker still open [^;]+→ STOP & escalate, even while a test gate is also red; \(5\) a test gate is failing and no review blocker is open → keep looping with no round cap, and never converge while it is red; \(6\) [^;]+and no test gate is failing → CONVERGED; /);
    assert.match(loopRule, new RegExp(String.raw`and no test gate is failing → CONVERGED; ${PROOF_ROW[name]} review blockers are open within budget`));
    assert.ok(loopRule.includes(CONVERGENCE_ROW[name]), `${name} row (6) states its own convergence signal`);
    assert.match(loopRule, /Review blockers are still open and did \*\*not shrink\*\*[^|]*a round-2 CRITICAL\/HIGH takes the extension row first\) \|/);
    // A red suite keeps the loop open at every round, not only once the budget is spent, and no
    // CONVERGED row may be read on its own while a test gate is red.
    assert.match(loopRule, /no review blocker is open, at any round within or past the budget \| \*\*Keep looping — NO round cap\.\*\*/);
    const converged = convergedRows(loopRule);
    assert.equal(converged.length, 2, `${name} keeps a clean-pass row and a severity-floor row`);
    for (const row of converged) assert.match(row.split(' | **CONVERGED')[0], /AND no test gate is failing$/, row);
    assert.match(loopRule, /round 2 blocked by MEDIUM or an unresolved `NOT VERIFIABLE` alone/);
    // The regression stop counts the same review blockers the ordered list counts, so a LOW-only
    // round 2 after a HIGH round 1 converges instead of reading as an increase.
    assert.match(loopRule, /\*\*Increasing review blockers = STOP\.\*\* If round `R` surfaces MORE review blockers \(validated findings at its own bar plus failed non-test binary gates\)/);
    assert.match(loopRule, /A LOW-only round 2 has zero review blockers, so it is never an increase\./);
    assert.doesNotMatch(loopRule, /Increasing findings = STOP/);
    // Every summary copy an agent reads first or last carries the extension-first order too.
    assert.ok(lineStarting(loopRule, '- **Bounded:**').includes(EXTENSION_FIRST), `${name} Bounded line`);
    assert.match(lineStarting(loopRule, '- **Round cap (default 2, extendable ONCE to 3)**'), /is checked before the count-based stops/);
    assert.ok(loopRule.includes('stop shrinking, that is a signal to **escalate**, not to spin another round — except the one round-2 CRITICAL/HIGH extension, which is granted first.'), `${name} First Principle`);
    assert.ok(lineStarting(loopRule, '**IMPORTANT MUST ATTENTION** enforce the **round cap').includes(`(${EXTENSION_FIRST})`), `${name} closing reminder`);
    if (name === 'workflow-review-changes') {
        assert.match(loopRule, /\| Round applied fixes but \*\*no review blocker is open\*\* AND no test gate is failing[^|]*\| Within budget: [^|]*run round `R\+1` to prove a zero-fix pass\. At a spent review budget: \*\*STOP & escalate\*\*/);
        assert.match(loopRule, /\*\*ALL LOW\*\* \(zero CRITICAL\/HIGH\/MEDIUM\) AND the round applied zero fixes/);
    }
}

test('R3-PROMPT-042: loop skills state one budget — round-3 extension for review blockers, uncapped failing tests', () => {
    for (const name of ['why-review', 'changes-review', 'workflow-review-changes']) {
        const source = skillContract(name);
        const check = text => assertLoopBudget(text, name);
        check(source);
        rejects(check, source, 'extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open', 'with no extension');
        rejects(check, source, 'a failing test gate is outside the cap', 'a failing test gate escalates at the cap');
        rejects(check, source, '**Keep looping — NO round cap.**', '**STOP & escalate.**');
        rejects(check, source, '**in this order — the first matching row decides**', 'using any matching row');
        rejects(check, source, 'keep looping with no round cap, and never converge while it is red', 'keep looping with no round cap');
        // Each dropped predicate re-opens a wrong outcome: a red suite at round 3 looping to round 4,
        // a 0 → 0 review count with red tests stopping, or a LOW-only round 2 reading as an increase.
        rejects(check, source, '→ STOP & escalate, even while a test gate is also red; (5)', '→ STOP & escalate; (5)');
        rejects(check, source, '(5) a test gate is failing and no review blocker is open →', '(5) a test gate is failing →');
        rejects(check, source, '(3) review blockers are still open and did not shrink', '(3) review blockers did not shrink');
        rejects(check, source, 'validated findings at each round\'s own bar', 'validated findings');
        rejects(check, source, 'and no test gate is failing → CONVERGED', '→ CONVERGED');
        rejects(check, source, 'no review blocker is open, at any round within or past the budget', 'no review blocker is open at a spent budget');
        // R5-02: a CONVERGED table row without the test predicate converges on a red suite.
        rejects(check, source, ' AND no test gate is failing | **CONVERGED on the severity floor**', ' | **CONVERGED on the severity floor**');
        // R5-04: the summary copies are read first and last; each must keep the extension-first order.
        const bounded = lineStarting(source, '- **Bounded:**');
        rejects(check, source, bounded, bounded.replace(` Both count-based stops are ${EXTENSION_FIRST}.`, '').replace(` (${EXTENSION_FIRST})`, ''));
        rejects(check, source, ', is checked before the count-based stops,', ',');
        rejects(check, source, ' — except the one round-2 CRITICAL/HIGH extension, which is granted first.', '.');
        const closing = lineStarting(source, '**IMPORTANT MUST ATTENTION** enforce the **round cap');
        rejects(check, source, closing, closing.replace(` (${EXTENSION_FIRST})`, ''));
        rejects(check, source, 'MEDIUM or an unresolved `NOT VERIFIABLE` alone', 'MEDIUM alone');
        // F-1: the pre-decision order let a same-count round-2 HIGH (HIGH-A fixed, HIGH-B found)
        // stop on "no shrink" although SYNC and the helper grant round 3.
        rejects(check, source,
            '(1) round 2 left a validated CRITICAL/HIGH review blocker open → the one extension round, even when the blocker count did not shrink; (2) review blockers increased vs the prior round → STOP & escalate; (3) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate (the EARLIER exit before the budget);',
            '(1) review blockers increased vs the prior round → STOP & escalate; (2) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate (the EARLIER exit); (3) round 2 left a validated CRITICAL/HIGH review blocker open → the one extension round;');
        rejects(check, source, 'the one extension round, even when the blocker count did not shrink;', 'the one extension round;');
        rejects(check, source, '; a round-2 CRITICAL/HIGH takes the extension row first) |', ') |');
        rejects(check, source, '(checked only after the round-2 CRITICAL/HIGH extension, which is granted first)', '');
        rejects(check, source, '**in this order — the first matching row decides** (',
            '**in this order — the first matching row decides** (the order `SYNC:double-round-trip-review` and `review-policy.cjs` use; ');
        // F-3: a raw-count regression stop turns HIGH → LOW, LOW into a STOP.
        rejects(check, source, 'MORE review blockers (validated findings at its own bar plus failed non-test binary gates)', 'MORE findings');
        rejects(check, source, '(validated findings at its own bar plus failed non-test binary gates) than', '(validated findings at its own bar) than');
        rejects(check, source, 'A LOW-only round 2 has zero review blockers, so it is never an increase.', '');
    }
    // F-2: the workflow loop may not converge on a clear review bar while a round still applies fixes.
    const workflowSource = skillContract('workflow-review-changes');
    const workflowCheck = text => assertLoopBudget(text, 'workflow-review-changes');
    rejects(workflowCheck, workflowSource, '(6) the round applied ZERO fixes', '(6) the current round bar is clear');
    // R5-03: a simplifier-only round with no review blocker proves a zero-fix pass within budget and
    // escalates at a spent budget; dropping the row, converging at the cap, or letting the severity
    // floor converge over landed edits all re-open the unbounded or unreviewed outcome.
    rejects(workflowCheck, workflowSource,
        '(7) the round applied fixes but no review blocker is open and no test gate is failing (for example only `/code-simplifier` edited) → run the next round to prove a zero-fix pass while within budget, and STOP & escalate once the review budget is spent; (8)',
        '(7)');
    rejects(workflowCheck, workflowSource, 'and STOP & escalate once the review budget is spent;', 'and CONVERGED once the review budget is spent;');
    rejects(workflowCheck, workflowSource, 'At a spent review budget: **STOP & escalate**', 'At a spent review budget: **CONVERGED**');
    rejects(workflowCheck, workflowSource, ' AND the round applied zero fixes (no simplifier or other edit landed either)', '');
    // A same-count round 2 still earns the extension from the helper: it carries no prior-round count.
    const round2SameCount = policy.evaluateRound({ round: 2, findings: [{ id: 'high-b', severity: 'HIGH' }] });
    assert.equal(round2SameCount.extensionGranted, true, 'row (1): a round-2 HIGH earns the extension before any count-based stop');
    assert.equal(round2SameCount.status, 'CONTINUE');
    // The prose outcomes the ordered list promises are the helper's outcomes.
    const redSuite = [{ id: 'suite', kind: 'test', status: 'FAIL' }];
    const round3Medium = policy.evaluateRound({ round: 3, findings: [{ id: 'm', severity: 'MEDIUM' }], hardGates: redSuite });
    assert.equal(round3Medium.status, 'ESCALATE', 'row (4): a spent budget escalates even beside a red suite');
    assert.equal(round3Medium.testLoopContinues, false);
    const redOnly = policy.evaluateRound({ round: 2, findings: [], hardGates: redSuite });
    assert.equal(redOnly.status, 'CONTINUE', 'row (5): zero review blockers with a red suite keeps looping');
    assert.equal(redOnly.testLoopContinues, true);
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'l', severity: 'LOW' }] }).blocking.length, 0,
        'a LOW-only round 2 has zero review blockers at its own bar, so it is never an increase');
    // A zero-fix pass is not convergence while a test gate is still red.
    const zeroFix = /\| Round applied \*\*ZERO fixes\*\* \(clean no-op pass\) AND no test gate is failing \|/;
    const workflowLoop = skillContract('workflow-review-changes');
    assert.match(local(workflowLoop), zeroFix);
    assert.doesNotMatch(local(workflowLoop.replaceAll(' AND no test gate is failing', '')), zeroFix);
});

// The optional `--fix-loop` mode section carries the OUTER loop's own ordered gate (checked by
// R3-PROMPT-042); the inner-budget contract governs the default workflow prose outside it.
const withoutFixLoopMode = text => text.replace(/<!-- FIX-LOOP-MODE:START -->[\s\S]*?<!-- FIX-LOOP-MODE:END -->/, '');

function assertInnerBudget(text) {
    const body = local(withoutFixLoopMode(text));
    assert.match(body, /bounded at \*\*2 rounds MAX\*\*, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL\/HIGH open/);
    assert.doesNotMatch(body, /round 2 completing with CRITICAL\/HIGH\/MEDIUM still open/);
    assert.match(body, /\*\*Review blockers increasing\*\* — if round N finds MORE review blockers \(validated findings at its own bar plus failed non-test binary gates; round-2 LOWs and failing test gates never count\) than round N-1, STOP and escalate via `AskUserQuestion` — unless round 2 left a validated CRITICAL\/HIGH open, which takes the one extension round first\./);
    assert.doesNotMatch(body, /MORE issues than round N-1|issues increase/);
    // Every copy of the increase stop is ordered after the extension, like the loops that run it.
    const increaseStops = body.split(/\r?\n/).filter(line => /review blockers (increase|increasing)|MORE review blockers/.test(line));
    // A leaner wrapper may state the stop fewer times, but at least the summary budget line and the budget
    // rule carry it, and every copy that remains keeps the extension-first ordering.
    assert.ok(increaseStops.length >= 2, 'summary budget line and the budget rule both state the increase stop');
    for (const line of increaseStops) assert.match(line, new RegExp(`${EXTENSION_FIRST.replace(/[/]/g, '\\/')}|takes the one extension round first`), line.slice(0, 120));
}

test('R3-PROMPT-044: the inner review workflow orders its increase stop after the round-2 extension', () => {
    const source = skillContract('workflow-review-changes');
    assertInnerBudget(source);
    rejects(assertInnerBudget, source, 'bounded at **2 rounds MAX**, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open (', 'bounded at **2 rounds MAX** (');
    rejects(assertInnerBudget, source,
        'review blockers increasing round-over-round (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget spent with a review blocker still open — round 2 blocked by MEDIUM/`NOT VERIFIABLE` alone, or round 3 by any review blocker',
        'round 2 completing with CRITICAL/HIGH/MEDIUM still open');
    rejects(assertInnerBudget, source,
        '**Review blockers increasing** — if round N finds MORE review blockers (validated findings at its own bar plus failed non-test binary gates; round-2 LOWs and failing test gates never count) than round N-1, STOP and escalate via `AskUserQuestion` — unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first.',
        '**Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`');
    rejects(assertInnerBudget, source, ` (${EXTENSION_FIRST})`, '');
    // The helper outcomes the prose promises: HIGH → HIGH, HIGH extends; MEDIUM, LOW → LOW ×3 is clean.
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'a', severity: 'HIGH' }, { id: 'b', severity: 'HIGH' }] }).extensionGranted, true);
    assert.equal(policy.evaluateRound({ round: 2, findings: ['a', 'b', 'c'].map(id => ({ id, severity: 'LOW' })) }).canComplete, true);
});

function assertGateBudget(text) {
    assert.match(text, /record a test-green gate with `kind: 'test'`/);
    assert.match(text, /a failed non-test binary gate carried as synthetic CRITICAL/);
    assert.match(text, /\*\*Failing test gates are outside the review budget:\*\*/);
}

test('R3-PROMPT-043: SYNC:review-policy states the gate → budget rule the helper enforces', () => {
    const source = read('skills/shared/sync-inline-versions.md');
    assertGateBudget(source);
    rejects(assertGateBudget, source, '**Failing test gates are outside the review budget:**', 'Failing test gates spend the review budget:');
    rejects(assertGateBudget, source, 'a failed non-test binary gate carried as synthetic CRITICAL', 'a finding only');
    // The prose and the executable helper agree on both halves of the rule.
    assert.equal(policy.evaluateRound({ round: 2, hardGates: [{ id: 'security', status: 'FAIL' }] }).extensionGranted, true);
    const red = policy.evaluateRound({ round: 3, hardGates: [{ id: 'suite', kind: 'test', status: 'FAIL' }] });
    assert.equal(red.status, 'CONTINUE');
    assert.equal(red.extensionGranted, false);
});
