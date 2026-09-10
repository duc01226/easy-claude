import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => fs.readFileSync(path.join(root, '.claude', relative), 'utf8');
const skill = name => read(`skills/${name}/SKILL.md`);
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const policy = createRequire(import.meta.url)('../../lib/review-policy.cjs');
const { resolveWorkflowManifest } = createRequire(import.meta.url)('../../lib/workflow-manifest.cjs');

// These checks protect instruction contracts, not claims about model execution.
// Each mutation restores an actual contradictory clause or removes an essential
// instruction. It must fail the SAME assertion used on the real source.
function rejects(check, source, before, after) {
    assert.ok(source.includes(before), `mutation anchor exists: ${before}`);
    const mutant = source.replace(before, after);
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
    assert.match(text, /this skill never authorizes or auto-runs it/);
    assert.match(text, /Normal source generation is not sync authorization: NEVER auto-run the/);
    assert.match(text, /TaskCreate: "Report stale Codex mirrors → instruct user to run \/sync-codex"/);
    assert.doesNotMatch(text, /TaskCreate: "Sync Codex mirrors from updated CLAUDE.md → invoke \/sync-codex"/);
}

test('R3-PROMPT-026: normal generation prepares a user-only sync handoff', () => {
    const source = local(skill('claude-md-init'));
    assertSyncHandoff(source);
    rejects(assertSyncHandoff, source, 'this skill never authorizes or auto-runs it', 'this skill automatically invokes sync');
    rejects(assertSyncHandoff, source, 'TaskCreate: "Report stale Codex mirrors → instruct user to run /sync-codex"', 'TaskCreate: "Sync Codex mirrors from updated CLAUDE.md → invoke /sync-codex"');
    assert.match(read('skills/claude-md-init/references/claude-md-template.md'), /Never auto-run `\/sync-codex`/);
});

function assertReadiness(text) {
    assert.match(text, /a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance/);
    assert.match(text, /round 2\+ blocks CRITICAL\/HIGH\/MEDIUM and defers LOW/);
    assert.match(text, /Overall PASS\/FAIL is separate from the advisory score/);
    assert.doesNotMatch(text, /unaccepted CRITICAL\/HIGH|must be resolved or owner-accepted before PASS|Proceed to commit|VERDICT is advisory/);
}

function assertUi(text) {
    assert.match(text, /any validated CRITICAL\/HIGH\/MEDIUM in round 2\+/);
    assert.match(text, /Record round-2\+ LOW findings as deferred/);
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
    rejects(assertReadiness, readiness, 'round 2+ blocks CRITICAL/HIGH/MEDIUM and defers LOW', 'round 2+ blocks CRITICAL/HIGH only');
    rejects(assertUi, ui, 'WARN | MEDIUM when bounded but consequential | Blocks every round', 'WARN | Medium / Low → WARN/INFO | Review and decide');
    rejects(assertUi, ui, 'Any failed binary gate or unresolved evidence', 'Only category BLOCKED');
    for (const round of [1, 2, 3]) {
        assert.equal(policy.evaluateRound({ round, findings: [{ id: 'bounded', severity: 'MEDIUM' }] }).canComplete, false);
        assert.equal(policy.evaluateRound({ round, hardGates: [{ id: 'binary', status: 'FAIL' }] }).canComplete, false);
    }
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

test('R3-PROMPT-030: inline teaching survives delegated transport constraints', () => {
    const source = skill('understand');
    assertTeaching(source);
    rejects(assertTeaching, source, "**Inline user-facing output:** Preserve the skill's requested explanation or teaching", '**At return:** Emit only the structured envelope');
    const body = local(source);
    assert.match(body, /teach|explain/i);
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
