import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Reuse the repo's single owner of EOL normalization rather than hand-rolling a second one.
// `extract-sync-block.cjs` documents why this matters: the canonical markdown is committed LF
// but a Windows checkout (`core.autocrlf=true`) materializes CRLF, so any comparison that
// normalizes only ONE side reports a checkout-format artifact as canonical drift.
const { normalizeEol } = createRequire(import.meta.url)('../../lib/extract-sync-block.cjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..', '..');
const canonicalPath = path.join(root, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const consumers = [
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md',
    '.claude/skills/workflow-review-changes-loop/SKILL.md',
    '.claude/skills/plan-review/SKILL.md'
];
// These are the canonical carriers that embed the shared severity-rubric
// block. Keep this inventory explicit: adding a review-family consumer without
// adding it here would allow a locally-reworded severity scale to drift.
const severityConsumers = [
    '.claude/skills/architecture-review-full/SKILL.md',
    '.claude/skills/architecture-review/SKILL.md',
    '.claude/skills/artifact-review/SKILL.md',
    '.claude/skills/changes-review-loop/SKILL.md',
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/code-review/SKILL.md',
    '.claude/skills/code-simplifier/SKILL.md',
    '.claude/skills/domain-entities-review/SKILL.md',
    '.claude/skills/architecture-scalability-review/SKILL.md',
    '.claude/skills/feature-implement/SKILL.md',
    '.claude/skills/plan-execute/SKILL.md',
    '.claude/skills/fix/SKILL.md',
    '.claude/skills/integration-test-review/SKILL.md',
    '.claude/skills/knowledge-review/SKILL.md',
    '.claude/skills/performance-review/SKILL.md',
    '.claude/skills/workflow-review-changes-loop/SKILL.md',
    '.claude/skills/plan-review/SKILL.md',
    '.claude/skills/production-readiness-review/SKILL.md',
    '.claude/skills/quality-gate-review/SKILL.md',
    '.claude/skills/security-review/SKILL.md',
    '.claude/skills/spec-clarify/SKILL.md',
    '.claude/skills/ui-review/SKILL.md',
    '.claude/skills/why-review-loop/SKILL.md',
    '.claude/skills/why-review/SKILL.md',
    '.claude/skills/workflow-bugfix/SKILL.md',
    '.claude/skills/workflow-feature/SKILL.md',
    '.claude/skills/workflow-write-integration-test/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md'
];

function body(text, tag) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalizeEol(text).match(new RegExp(`<!--\\s*SYNC:${escaped}\\s*-->\\s*([\\s\\S]*?)\\s*<!--\\s*/SYNC:${escaped}\\s*-->`));
    return match ? match[1].trim() : null;
}

// Normalize on BOTH sides. `body()` normalized the consumer but this side did not, so an LF string
// was compared against a CRLF one and every multi-line block failed — a checkout-format artifact
// reported as canonical drift, which is the false alarm that trains a maintainer to distrust the
// guard. The contract is byte-exact BODY TEXT; the line ending is a property of the working copy,
// not of the protocol. Boundary detection is left as-is deliberately: this matcher stops at
// `\n---\n` OR `\n## SYNC:`, which is not the same span as extract-sync-block's combined
// `\n---\n\n## SYNC:` delimiter, so adopting that extractor wholesale would change WHAT is compared
// rather than just how line endings are read.
function canonicalBody(text, tag) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalizeEol(text)
        .match(new RegExp(`^## SYNC:${escaped}\\s*\\n([\\s\\S]*?)(?=\\n---\\s*\\n|\\n## SYNC:)`, 'm'));
    return match ? match[1].trim() : null;
}

test('TC-HARNESS-006: all canonical review consumers use exact policy body and required anchors', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'review-policy');
    assert.ok(expected && expected.includes('blockingFindings(round, findings, hardGates)'));
    for (const relative of consumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.equal(body(text, 'review-policy'), expected, `${relative} must match canonical policy body`);
        assert.match(text, /review-policy\.cjs/);
        assert.match(text, /target fingerprint/);
        assert.match(text, /deferred LOW/i);
    }
});

test('TC-HARNESS-006: shared severity rubric normalizes domain vocabularies', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'severity-rubric');
    assert.ok(expected, 'canonical severity rubric must exist');
    assert.match(expected, /Domain-vocabulary normalization/i);
    assert.match(expected, /Finding vs observation/i);
    assert.match(expected, /Consequence decision tree/i);
    assert.match(expected, /Boundary examples/i);
    assert.match(expected, /Scorecards.*\/20/i);
    assert.match(expected, /BLOCKED.*HARD FAIL.*FAIL/i);
    assert.match(expected, /P0.*P1.*P2.*P3.*P4/i);
    assert.match(expected, /INFO.*advisory/i);
    for (const relative of severityConsumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.equal(body(text, 'severity-rubric'), expected, `${relative} must carry the canonical severity rubric`);
    }
});

test('TC-HARNESS-006: consumer-specific anchors preserve loop ownership and independent-pass semantics', async () => {
    const [changes, workflow, outer, plan] = await Promise.all(consumers.map(relative =>
        fs.readFile(path.join(root, relative), 'utf8')));
    assert.match(changes, /Phase 6.*Why-Review Findings Validation/s);
    assert.match(workflow, /all-return barrier/i);
    assert.match(outer, /zero fixes|Convergence/i);
    assert.match(plan, /explicitly.*minRounds|independent second pass/i);
});

test('TC-HARNESS-006: changes-review fix prose cannot reopen a round for LOW-only findings', async () => {
    const changes = await fs.readFile(path.join(root, '.claude', 'skills', 'changes-review', 'SKILL.md'), 'utf8');
    assert.match(changes, /SELF-FIX each validated finding that blocks the current round/);
    assert.match(changes, /round-2\+ LOW-only findings are recorded and deferred, not fixed/);
    assert.match(changes, /fixing only findings that block the current round and re-running until that bar is clear/);
    assert.doesNotMatch(changes, /SELF-FIX each validated finding →|fixing and re-running until it is clean/);
});

test('TC-HARNESS-006: fix preserves explicit LOW requests while honoring the loop floor', async () => {
    const fix = await fs.readFile(path.join(root, '.claude', 'skills', 'fix', 'SKILL.md'), 'utf8');
    assert.match(fix, /Review-loop severity floor/);
    assert.match(fix, /CRITICAL.*immediate material.*failed binary gate/i);
    assert.match(fix, /HIGH.*material supported-path correctness/i);
    assert.match(fix, /MEDIUM.*bounded but consequential/i);
    assert.match(fix, /LOW.*non-blocking polish/i);
    assert.match(fix, /Round 1 is strict \(CRITICAL\/HIGH\/MEDIUM\/LOW\)/);
    assert.match(fix, /from round 2 onward only CRITICAL\/HIGH\/MEDIUM reopen a fix or re-review round/);
    assert.match(fix, /standalone user request to fix a LOW-severity issue remains valid/);
});

test('TC-HARNESS-006: simplifier loop uses the shared round floor', async () => {
    const simplifier = await fs.readFile(path.join(root, '.claude', 'skills', 'code-simplifier', 'SKILL.md'), 'utf8');
    assert.match(simplifier, /Self-Recursive Check.*current round's exit bar/s);
    assert.match(simplifier, /Round 1 requires zero validated findings at any severity/s);
    assert.match(simplifier, /from Round 2 onward only validated CRITICAL\/HIGH\/MEDIUM findings reopen the loop/s);
    assert.match(simplifier, /LOW findings are recorded as deferred and do not justify another cycle/s);
    assert.doesNotMatch(simplifier, /Self-Recursive Check.*until no simplification findings remain/);
});

test('TC-HARNESS-006: plan-execute does not collapse review acceptance to critical-only', async () => {
    const planExecute = await fs.readFile(path.join(root, '.claude', 'skills', 'plan-execute', 'SKILL.md'), 'utf8');
    assert.match(planExecute, /current severity bar/);
    assert.match(planExecute, /Round 1[^\n]*zero validated findings/);
    assert.match(planExecute, /Round 2\+[^\n]*zero validated CRITICAL\/HIGH\/MEDIUM/);
    assert.match(planExecute, /LOW findings (?:recorded|deferred)/i);
    assert.doesNotMatch(planExecute, /Repeat until no critical issues/);
    assert.doesNotMatch(planExecute, /Critical issues must be 0 \(Step 4 gate\)/);
    assert.doesNotMatch(planExecute, /tests 100% · 0 critical · explicit approval/);
});

test('TC-HARNESS-006: integration-test review and workflow handoff use the same round floor', async () => {
    const review = await fs.readFile(path.join(root, '.claude', 'skills', 'integration-test-review', 'SKILL.md'), 'utf8');
    const workflow = await fs.readFile(path.join(root, '.claude', 'skills', 'workflow-write-integration-test', 'SKILL.md'), 'utf8');
    for (const [relative, text] of [
        ['.claude/skills/integration-test-review/SKILL.md', review],
        ['.claude/skills/workflow-write-integration-test/SKILL.md', workflow]
    ]) {
        assert.match(text, /round 1[^\n]*(?:every validated finding|every validated severity)/i, `${relative} must keep round-1 strictness`);
        assert.match(text, /round 2[^\n]*CRITICAL\/HIGH\/MEDIUM/i, `${relative} must keep C/H/M blocking from round 2`);
        assert.match(text, /LOW-only[^\n]*(?:deferred|recorded)/i, `${relative} must defer LOW-only round-2 results`);
        assert.doesNotMatch(text, /NEVER proceed with CRITICAL\/HIGH issues outstanding/i, `${relative} must not omit MEDIUM`);
    }
    assert.match(review, /MEDIUM cannot be silently converted to tech debt/i);
    assert.match(review, /blocking_findings\(round, findings\)/);
});

test('TC-HARNESS-006: implementation and quality-gate surfaces use normalized severity terms', async () => {
    const feature = await fs.readFile(path.join(root, '.claude', 'skills', 'feature-implement', 'SKILL.md'), 'utf8');
    const gate = await fs.readFile(path.join(root, '.claude', 'skills', 'quality-gate-review', 'SKILL.md'), 'utf8');
    for (const [relative, text] of [
        ['.claude/skills/feature-implement/SKILL.md', feature],
        ['.claude/skills/quality-gate-review/SKILL.md', gate]
    ]) {
        assert.match(text, /SYNC:severity-rubric/);
        assert.match(text, /CRITICAL.*HIGH.*MEDIUM.*LOW/s, `${relative} must expose the canonical four-tier vocabulary`);
        assert.match(text, /failed binary gate|binary gates.*blocking/i, `${relative} must preserve hard-gate precedence`);
    }
    assert.match(feature, /Round 2\+ fixes only validated CRITICAL\/HIGH\/MEDIUM findings/);
    assert.match(feature, /LOW-only findings are recorded as deferred and do not reopen the loop/);
    assert.match(gate, /No open CRITICAL\/HIGH\/MEDIUM findings/);
});

test('TC-HARNESS-006: seeded stale-policy mutant is rejected by exact-body parity', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'review-policy');
    const mutant = '<!-- SYNC:review-policy -->\n> maxRounds=2; LOW findings are discarded\n<!-- /SYNC:review-policy -->';
    assert.notEqual(body(mutant, 'review-policy'), expected);
    assert.match(expected, /MAX_ROUNDS.*3/);
    assert.match(expected, /Full reports remain on disk/);
});

function assertDurableReview(text) {
    assert.match(text, /Persist completed rounds, repeated blockers, findings and the explicit minimum/);
    assert.match(text, /owning run's `review-policy\.cjs` record/);
    assert.match(text, /Resume that record after interruption/);
    assert.match(text, /preserve the bounded round budget/);
    assert.match(text, /In-flight attempt IDs may be session-local/);
    assert.doesNotMatch(text, /session-scoped, no persistent files|repeats 3 times/);
}

test('R3-PROMPT-023: canonical completed-round state is durable, distinct from attempts', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    for (const tag of ['double-round-trip-review', 'fresh-context-review']) {
        const source = canonicalBody(canonical, tag);
        assertDurableReview(source);
        assert.match(source, /minRounds/);
        const old = source.replace(/> - Persist completed rounds[^\n]+/, '> - Track iteration count in conversation context (session-scoped, no persistent files)');
        assert.notEqual(old, source);
        assert.throws(() => assertDurableReview(old), { code: 'ERR_ASSERTION' });
        for (const anchor of ['Resume that record after interruption', 'preserve the bounded round budget', 'In-flight attempt IDs may be session-local']) {
            const mutant = source.replace(anchor, 'omitted state obligation');
            assert.notEqual(mutant, source);
            assert.throws(() => assertDurableReview(mutant), { code: 'ERR_ASSERTION' });
        }
    }
    const loop = canonicalBody(canonical, 'double-round-trip-review');
    assert.match(loop, /minRounds=2` requires the independent second pass/);
    assert.doesNotMatch(loop, /A clean Round 1 ENDS the review — no mandatory Round 2/);
    const fresh = canonicalBody(canonical, 'fresh-context-review');
    assert.match(fresh, /same validated blocker repeats across 2 full invocations/);
    assert.match(fresh, /AND the persisted `minRounds` is met/);
});

test('R3-PROMPT-023/030: every existing carrier has exact updated body and balanced fences', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const tags = ['double-round-trip-review', 'double-round-trip-review:reminder', 'fresh-context-review', 'incremental-persistence'];
    const skillsRoot = path.join(root, '.claude', 'skills');
    const agentsRoot = path.join(root, '.claude', 'agents');
    const candidates = (await fs.readdir(skillsRoot, { withFileTypes: true }))
        .filter(entry => entry.isDirectory()).map(entry => path.join(skillsRoot, entry.name, 'SKILL.md'));
    candidates.push(...(await fs.readdir(agentsRoot)).filter(name => name.endsWith('.md')).map(name => path.join(agentsRoot, name)));
    const seen = new Map(tags.map(tag => [tag, 0]));
    for (const file of candidates) {
        let source;
        try { source = await fs.readFile(file, 'utf8'); } catch (error) {
            if (error.code === 'ENOENT') continue; // shared/support directories are not skills
            throw error;
        }
        for (const tag of tags) {
            const open = `<!-- SYNC:${tag} -->`;
            const close = `<!-- /SYNC:${tag} -->`;
            if (!source.includes(open) && !source.includes(close)) continue;
            assert.equal(source.split(open).length - 1, 1, `${file}: exactly one ${tag} open`);
            assert.equal(source.split(close).length - 1, 1, `${file}: exactly one ${tag} close`);
            assert.ok(source.indexOf(open) < source.indexOf(close), `${file}: ${tag} fence order`);
            assert.equal(body(source, tag), canonicalBody(canonical, tag), `${file}: exact ${tag} body`);
            seen.set(tag, seen.get(tag) + 1);
        }
    }
    for (const [tag, count] of seen) assert.ok(count > 0, `non-vacuous carrier inventory for ${tag}`);
});

test('R3-PROMPT-031: visual review consumers persist one artifact result before opening the next', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'incremental-persistence');
    assert.match(expected, /MANDATORY for every visual-artifact review/);
    assert.match(expected, /open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact/);
    assert.match(expected, /an explicit `none` when no issue exists/);
    assert.match(expected, /derive processed and remaining artifacts from the ordered inventory/);
    assert.match(expected, /a missing record is incomplete review, never a clean result/);

    const visualConsumers = [
        '.claude/skills/experience-review/SKILL.md',
        '.claude/skills/test-ui/SKILL.md',
        '.claude/skills/e2e-test-verify-loop/SKILL.md',
        '.claude/skills/workflow-e2e/SKILL.md',
        '.claude/skills/workflow-e2e-green/SKILL.md'
    ];
    for (const relative of visualConsumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.equal(body(text, 'incremental-persistence'), expected, `${relative} must carry the canonical per-artifact persistence contract`);
    }
});

test('R3-PROMPT-023: specialist overrides preserve role and durable budget', async () => {
    for (const [name, role] of [['architecture-review', /`architect` subagent_type/], ['integration-test-review', /`integration-tester` subagent_type/], ['ui-review', /UI\/UX-specialized subagent_type/]]) {
        const source = await fs.readFile(path.join(root, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
        const override = source.match(/<!-- OVERRIDE:fresh-context-review -->([\s\S]*?)<!-- \/OVERRIDE:fresh-context-review -->/);
        assert.ok(override, `${name} keeps specialist override`);
        assertDurableReview(override[1]);
        assert.match(override[1], role);
        assert.match(override[1], /current round's exit bar and persisted `minRounds`/);
        const mutant = override[1].replace(/> - Persist completed rounds[^\n]+/, '> - Track iteration count in conversation context (session-scoped, no persistent files)');
        assert.throws(() => assertDurableReview(mutant), { code: 'ERR_ASSERTION' });
    }
    const planner = await fs.readFile(path.join(root, '.claude', 'agents', 'planner.md'), 'utf8');
    assert.doesNotMatch(planner, /repeats 3 times/);
    assert.match(planner, /Resume the owning durable review record; never reset completed rounds/);
});

test('R3-PROMPT-023: local clean-pass summaries cannot override an explicit minimum', async () => {
    const files = [
        ...['code-review', 'domain-entities-review', 'knowledge-review', 'plan', 'plan-review', 'production-readiness-review', 'security-review', 'seed-test-data']
            .map(name => `.claude/skills/${name}/SKILL.md`),
        '.claude/agents/code-reviewer.md', '.claude/agents/quality-gate-review.md',
    ];
    const assertMinimum = line => assert.match(line, /persisted `minRounds` is met/, 'clean-pass termination retains explicit minimum');
    for (const relative of files) {
        const source = (await fs.readFile(path.join(root, relative), 'utf8'))
            .replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
        const lines = source.split(/\r?\n/).filter(line => /clean.{0,60}(?:ENDS|ends)/.test(line));
        assert.ok(lines.length > 0, `${relative}: non-vacuous local termination carriers`);
        for (const line of lines) {
            assertMinimum(line);
            const mutant = line.replace('persisted `minRounds` is met', 'current round is clean');
            assert.throws(() => assertMinimum(mutant), { code: 'ERR_ASSERTION' });
        }
    }
});
