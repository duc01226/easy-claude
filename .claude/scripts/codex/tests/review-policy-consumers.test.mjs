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
// Carriers that embed the canonical `SYNC:review-policy` body byte-exact.
// `plan-review` is deliberately NOT here: it carries `OVERRIDE:review-policy` instead, because its
// round budget is a HARD 2 with no extension while canonical mandates `HARD_MAX_ROUNDS` of 3 and the
// conditional round-3 grant. The helper exposes no caller-declarable maximum — the only caller-settable
// value is `minRounds`, which may not exceed 2 — so the cap is not expressible through the mandated
// executable and the divergence is declared rather than hidden. The OVERRIDE is pinned from both
// directions by `TC-HARNESS-006: plan-review declares its review-policy divergence` below; dropping it
// from this array therefore removes a byte-parity check it cannot satisfy, not a guard.
const consumers = [
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md'
];
const planReviewPath = '.claude/skills/plan-review/SKILL.md';
// These are the canonical carriers that embed the shared severity-rubric
// block. Keep this inventory explicit: adding a review-family consumer without
// adding it here would allow a locally-reworded severity scale to drift.
const severityConsumers = [
    '.claude/skills/architecture-review-full/SKILL.md',
    '.claude/skills/architecture-review/SKILL.md',
    '.claude/skills/artifact-review/SKILL.md',
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
    '.claude/skills/plan-review/SKILL.md',
    '.claude/skills/production-readiness-review/SKILL.md',
    '.claude/skills/security-review/SKILL.md',
    '.claude/skills/spec-clarify/SKILL.md',
    '.claude/skills/ui-review/SKILL.md',
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

// Splits a review-policy body into its four blockquote paragraphs. Both the canonical block and the
// plan-review override are structured the same way, so the two can be compared paragraph by
// paragraph — which is what lets an OVERRIDE be pinned as tightly as a SYNC everywhere it did not
// declare a divergence.
function policyParagraphs(blockBody) {
    return blockBody.slice(blockBody.indexOf('> **Executable')).split(/\n>\s*\n/);
}

test('TC-HARNESS-006: plan-review declares its review-policy divergence', async () => {
    const text = await fs.readFile(path.join(root, planReviewPath), 'utf8');

    // Bidirectional: the SYNC fence must be GONE, not merely accompanied by an OVERRIDE. A file
    // carrying both would satisfy a one-sided check while leaving the byte-parity claim live.
    assert.doesNotMatch(text, /<!-- SYNC:review-policy -->/, 'plan-review must not carry SYNC:review-policy');
    assert.match(text, /<!-- OVERRIDE:review-policy -->/, 'plan-review must carry OVERRIDE:review-policy');
    assert.match(text, /<!-- \/OVERRIDE:review-policy -->/, 'plan-review must close OVERRIDE:review-policy');

    const override = normalizeEol(text)
        .match(/<!-- OVERRIDE:review-policy -->\s*([\s\S]*?)\s*<!-- \/OVERRIDE:review-policy -->/)[1];
    // plan-review's own convention — NOT a repo-wide contract. The OVERRIDE contract
    // (`sync-skills-shared-protocols/SKILL.md:101-112`) lists four bullets and a declaration comment
    // is not among them; the other six OVERRIDE carriers legitimately carry none. This pins the
    // convention where it exists, so a reader of THIS carrier alone learns what moved and why.
    assert.match(override, /Diverges from canonical `SYNC:review-policy`/);

    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = policyParagraphs(canonicalBody(canonical, 'review-policy'));
    const actual = policyParagraphs(override.trim());
    assert.equal(actual.length, 4, 'override keeps the canonical four-paragraph shape');
    assert.equal(expected.length, 4, 'canonical is still four paragraphs');

    // The declared divergence is the ROUND BUDGET and nothing else. Paragraphs 1, 3 and 4 stay
    // byte-exact, so this guard is no weaker than the SYNC parity it replaced outside that one point
    // — an undeclared edit hiding inside a declared override is precisely what OVERRIDE must not buy.
    for (const i of [0, 2, 3]) {
        assert.equal(actual[i], expected[i], `override paragraph ${i + 1} must stay byte-exact with canonical`);
    }
    assert.notEqual(actual[1], expected[1], 'paragraph 2 is the declared divergence');

    // The divergence must say what it actually is. Presence checks alone cannot see text that is
    // ADDED: a mutant keeping all four phrases and appending "…the conditional extension ARE
    // honored" reads as the opposite policy while satisfying every positive check. So ¶2 — the ONE
    // paragraph allowed to diverge, and therefore the one carrying the actual budget — is pinned in
    // BOTH directions.
    const REQUIRED = [
        /HARD 2 with NO extension/,
        /round 2 is the LAST review round/,
        /STOPS and escalates via `AskUserQuestion`/,
        // The cap must never be a force-green lever: failing test gates stay outside the budget.
        /Failing test gates stay outside the budget/
    ];
    const FORBIDDEN = [
        /\bextendable\b/i,
        /\bare honored\b/i,
        /\bround 3\b/i,
        /minRounds[^.]{0,40}\b(?:3|three)\b/i
    ];
    // ONE oracle, used on the real source AND on every mutant below. Routing the mutants through
    // THIS function is what makes the mutation guard non-vacuous: delete a pattern from either list
    // and the mutant it existed to catch now survives, so the matching `assert.throws` fails. The
    // earlier form asserted a bare regex against a string built by inserting that very regex's own
    // text — a guard that could not go red, and so proved nothing about the assertions above.
    const assertParagraph2Policy = paragraph => {
        for (const required of REQUIRED) {
            assert.match(paragraph, required, `paragraph 2 must state the budget (${required})`);
        }
        for (const forbidden of FORBIDDEN) {
            assert.doesNotMatch(paragraph, forbidden, `paragraph 2 must not re-admit an extension (${forbidden})`);
        }
    };

    assertParagraph2Policy(actual[1]);

    // Mutation guard. Every pattern gets its OWN discriminating mutant, and each mutant is designed
    // so that exactly ONE pattern can catch it — asserted below. That per-pattern isolation is the
    // whole point: a single mutant tripping several patterns at once keeps passing after any one of
    // them is deleted, so the list as a whole looks guarded while individual patterns rot unnoticed.
    // With one mutant per pattern, deleting a pattern strands its mutant and turns this test red.
    const FORBIDDEN_PROBES = [
        [/\bextendable\b/i, ' The budget is extendable by agreement.'],
        [/\bare honored\b/i, ' The cap and its conditions are honored.'],
        [/\bround 3\b/i, ' A validated HIGH takes round 3.'],
        [/minRounds[^.]{0,40}\b(?:3|three)\b/i, ' Set minRounds to 3 for deep reviews.']
    ];
    assert.equal(FORBIDDEN_PROBES.length, FORBIDDEN.length, 'every forbidden pattern carries its own mutant');

    for (const [pattern, suffix] of FORBIDDEN_PROBES) {
        const added = `${actual[1]}${suffix}`;
        // The additive mutant keeps every required phrase — so REQUIRED cannot be what catches it.
        for (const required of REQUIRED) assert.match(added, required, `additive mutant keeps: ${required}`);
        // …and exactly one FORBIDDEN pattern fires, so this mutant tests THAT pattern alone.
        const firing = FORBIDDEN.filter(f => f.test(added));
        assert.equal(firing.length, 1, `mutant must isolate a single pattern, fired ${firing.length}: ${suffix}`);
        assert.ok(pattern.test(added), `the firing pattern is the intended one: ${pattern}`);
        assert.throws(() => assertParagraph2Policy(added), { code: 'ERR_ASSERTION' });
    }

    // The same discipline for the positive list: each required phrase is removed on its own, with
    // replacement text that trips no forbidden pattern, so only REQUIRED can catch the result.
    const REMOVAL_PROBES = [
        ['HARD 2 with NO extension', 'a negotiable budget'],
        ['round 2 is the LAST review round', 'rounds continue as needed'],
        ['STOPS and escalates via `AskUserQuestion`', 'continues quietly'],
        ['Failing test gates stay outside the budget', 'everything counts toward the budget']
    ];
    assert.equal(REMOVAL_PROBES.length, REQUIRED.length, 'every required pattern carries its own mutant');

    for (const [phrase, replacement] of REMOVAL_PROBES) {
        const removed = actual[1].replace(phrase, replacement);
        assert.notEqual(removed, actual[1], `removal mutant anchor exists: ${phrase}`);
        for (const forbidden of FORBIDDEN) {
            assert.doesNotMatch(removed, forbidden, `removal mutant must not trip a forbidden pattern: ${forbidden}`);
        }
        const missing = REQUIRED.filter(r => !r.test(removed));
        assert.equal(missing.length, 1, `removal must isolate a single pattern, broke ${missing.length}: ${phrase}`);
        assert.throws(() => assertParagraph2Policy(removed), { code: 'ERR_ASSERTION' });
    }

    // Anchors the SYNC loop enforced on every carrier still bind here.
    assert.match(text, /review-policy\.cjs/);
    assert.match(text, /target fingerprint/);
    assert.match(text, /deferred LOW/i);
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
    // plan-review is read by explicit path, not from `consumers` — it is an OVERRIDE carrier, so it is
    // absent from that array, but its anchor obligation is unchanged by the fence it uses.
    const [changes, workflow, plan] = await Promise.all(
        [...consumers, planReviewPath].map(relative => fs.readFile(path.join(root, relative), 'utf8')));
    assert.match(changes, /Phase 6.*Why-Review Findings Validation/s);
    assert.match(workflow, /all-return barrier/i);
    // The outer zero-fix loop is workflow-review-changes' optional `--fix-loop` mode.
    assert.match(workflow, /--fix-loop[\s\S]*zero fixes/i);
    assert.match(plan, /explicitly.*minRounds|independent second pass/i);
});

test('TC-HARNESS-006: changes-review fix prose cannot reopen a round for LOW-only findings', async () => {
    const changes = await fs.readFile(path.join(root, '.claude', 'skills', 'changes-review', 'SKILL.md'), 'utf8');
    assert.match(changes, /SELF-FIX each validated finding that blocks the current round/);
    assert.match(changes, /round-2 LOW-only findings are recorded and deferred, not fixed/);
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
    assert.match(planExecute, /Round 2[^\n]*zero validated CRITICAL\/HIGH\/MEDIUM/);
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

test('TC-HARNESS-006: implementation surfaces use normalized severity terms', async () => {
    const feature = await fs.readFile(path.join(root, '.claude', 'skills', 'feature-implement', 'SKILL.md'), 'utf8');
    for (const [relative, text] of [
        ['.claude/skills/feature-implement/SKILL.md', feature]
    ]) {
        assert.match(text, /SYNC:severity-rubric/);
        assert.match(text, /CRITICAL.*HIGH.*MEDIUM.*LOW/s, `${relative} must expose the canonical four-tier vocabulary`);
        assert.match(text, /failed binary gate|binary gates.*blocking/i, `${relative} must preserve hard-gate precedence`);
    }
    assert.match(feature, /Round 2 fixes only validated CRITICAL\/HIGH\/MEDIUM findings/);
    assert.match(feature, /LOW-only findings are recorded as deferred and do not reopen the loop/);
});

test('TC-HARNESS-006: seeded stale-policy mutant is rejected by exact-body parity', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'review-policy');
    const mutant = '<!-- SYNC:review-policy -->\n> maxRounds=2; LOW findings are discarded\n<!-- /SYNC:review-policy -->';
    assert.notEqual(body(mutant, 'review-policy'), expected);
    assert.match(expected, /MAX_ROUNDS.*2/);
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
        '.claude/skills/e2e-test-verify/SKILL.md',
        '.claude/skills/workflow-e2e/SKILL.md',
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
        '.claude/agents/code-reviewer.md',
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
