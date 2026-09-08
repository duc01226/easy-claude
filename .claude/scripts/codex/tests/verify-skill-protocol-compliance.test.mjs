import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-skill-protocol-compliance.mjs');
const {
    checkDebuggerTraceCoverage,
    checkOrphanHeadings,
    formatMirrorRemediation,
    countOccurrences,
    checkCompactAgentsProjection,
    checkProtocolBodySignatureCounts,
    AGENTS_ROOT_LIMIT_BYTES
} = await import(pathToFileURL(verifierPath).href);

const joinLines = (...lines) => lines.join('\n');

const FENCED_CLAUDE = joinLines('<!-- CK:CRITICAL-THINKING -->', '<!-- CK:AI-MISTAKE-PREVENTION -->');
const BOTH_BODIES = joinLines('[CRITICAL-THINKING-MINDSET]', '## Common AI Mistake Prevention (System Lessons)');
const FENCELESS_CLAUDE = '# Portable project\n';

// The gate measures a projection it does not build, so its budget must equal the GENERATOR's. Those
// two constants cannot be collapsed into one import — the verifier is loaded from a `data:` URL and
// copied into isolated roots without its siblings, so a relative import breaks it (see
// `verifier-root-contract.test.mjs`). This cross-producer assertion is what replaces the import:
// they already drifted once, the generator raising its budget to project the anti-hallucination
// protocol into the Codex root while this gate kept the old number and failed the generator's own
// output. Reading the value from each module independently is the point — deriving one from the
// other would only ask a single source whether it agrees with itself.
test('TC-CTXP-035e: the projection budget matches the generator that produces the projection', async () => {
    const generatorPath = path.resolve(thisDir, '..', 'sync-context-workflows.mjs');
    const generator = await import(pathToFileURL(generatorPath).href);
    assert.equal(
        AGENTS_ROOT_LIMIT_BYTES,
        generator.AGENTS_ROOT_LIMIT_BYTES,
        'verify-skill-protocol-compliance.mjs and sync-context-workflows.mjs must agree on the AGENTS.md root budget'
    );
});

// The bounded root's occurrence contract is CONDITIONAL, unlike `.codex/CODEX_CONTEXT.md`'s
// unconditional exactly-once. That asymmetry is the whole point: the context file's copy is baked
// from the canonical shared source and is project-independent, while AGENTS.md's is CLAUDE.md-
// derived through the projection whitelist. An unconditional ">=1" would hard-fail every adopter
// whose CLAUDE.md carries no CK fence — this repo's own PORT-013 fixture is exactly that shape —
// because the whitelist has nothing to project. Drive every branch here: the gate itself reads real
// repo paths, so only the extracted predicate can be fixture-driven.
test('TC-CTXP-035f: the bounded-root occurrence contract follows what CLAUDE.md can source', () => {
    // Fenced CLAUDE.md → exactly one deduped copy of each block is required, and satisfies it.
    assert.deepEqual(checkProtocolBodySignatureCounts(BOTH_BODIES, FENCED_CLAUDE), []);

    // Fenced but ZERO copies → Codex lost the guardrail. This is the regression the guard exists for.
    const lost = checkProtocolBodySignatureCounts('', FENCED_CLAUDE);
    assert.equal(lost.length, 2, 'both blocks must be reported missing');
    assert.match(lost[0], /found 0×.*expected exactly 1/);

    // Fenced with a second copy → de-duplication regressed and the root pays for the block twice.
    const dupe = checkProtocolBodySignatureCounts(joinLines(BOTH_BODIES, BOTH_BODIES), FENCED_CLAUDE);
    assert.equal(dupe.length, 2);
    assert.match(dupe[0], /found 2×.*de-duplication regressed/);

    // Fence-less CLAUDE.md (the PORT-013 adopter shape) → zero copies is CORRECT, not a failure.
    // Regressing this to an unconditional >=1 turns every such adopter's `verify:all` red.
    assert.deepEqual(checkProtocolBodySignatureCounts(FENCELESS_CLAUDE, FENCELESS_CLAUDE), []);

    // A missing CLAUDE.md is treated the same way — its absence is the agent-files bootstrap gate's
    // failure to report, not this gate's.
    assert.deepEqual(checkProtocolBodySignatureCounts('', ''), []);

    // …but a fence-less root that somehow gained a copy is still wrong: nothing could have sourced it.
    const unsourced = checkProtocolBodySignatureCounts(BOTH_BODIES, FENCELESS_CLAUDE);
    assert.equal(unsourced.length, 2);
    assert.match(unsourced[0], /found 1×.*expected 0.*cannot source/);
});

test('TC-CTXP-035g: loosening the bounded-root occurrence check is killed by its own contract', async () => {
    const source = await fs.readFile(verifierPath, 'utf8');
    const guard = 'if (n === expected) continue;';
    assert.equal(source.split(guard).length, 2, 'mutation anchor must be unique');
    const mutated = source.replace(guard, 'if (true) continue;').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(verifierPath).href));
    const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
    const oracle = fn => assert.equal(fn('', FENCED_CLAUDE).length, 2);
    oracle(checkProtocolBodySignatureCounts);
    assert.throws(() => oracle(verifier.checkProtocolBodySignatureCounts), assert.AssertionError);
});

test('TC-CTXP-035d: deleting malformed-marker rejection is killed by the ordered-pair assertion', async () => {
    const source = await fs.readFile(verifierPath, 'utf8');
    const guard = "failures.push('AGENTS.md managed context mirror markers must form an ordered pair');";
    assert.equal(source.split(guard).length, 2, 'mutation anchor must be unique');
    const mutated = source.replace(guard, '').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(verifierPath).href));
    const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
    const agents = joinLines('<!-- CK:CODEX-ROOT-PROJECTION -->', '<!-- /CK:CODEX-ROOT-PROJECTION -->',
        '<!-- CODEX-CONTEXT-MIRROR:END -->', '<!-- CODEX-CONTEXT-MIRROR:START -->');
    const oracle = fn => assert.deepEqual(fn(agents, 'context'), ['AGENTS.md managed context mirror markers must form an ordered pair']);
    oracle(checkCompactAgentsProjection);
    assert.throws(() => oracle(verifier.checkCompactAgentsProjection), assert.AssertionError);
});

test('TC-CTXP-035c: reversed context markers cannot bypass pointer and fingerprint checks', () => {
    const agents = joinLines(
        '<!-- CK:CODEX-ROOT-PROJECTION -->',
        '<!-- /CK:CODEX-ROOT-PROJECTION -->',
        '<!-- CODEX-CONTEXT-MIRROR:END -->',
        '<!-- CODEX-CONTEXT-MIRROR:START -->'
    );
    assert.deepEqual(checkCompactAgentsProjection(agents, 'context'), [
        'AGENTS.md managed context mirror markers must form an ordered pair'
    ]);
});

// TC-SKILLFIX-001 — orphan: heading immediately followed by a SAME-level heading, no body.
// This is the exact class removed from plan-review/why-review (`## X` -> `## Your mission`).
test('TC-SKILLFIX-001: flags `##` immediately followed by `##` with no body', () => {
    const content = joinLines(
        '## Behavioral Delta Matrix (MANDATORY for bugfixes)',
        '',
        '## Your mission',
        '',
        'Real body here.'
    );
    const result = checkOrphanHeadings(content, '.claude/skills/example/SKILL.md');
    assert.ok(result, 'expected an orphan-heading failure');
    assert.match(result, /orphan heading\(s\)/);
    assert.match(result, /line 1:/);
});

// TC-SKILLFIX-001b — shallower transition (`##` -> `#`) is also an orphan.
test('TC-SKILLFIX-001b: flags `##` immediately followed by shallower `#`', () => {
    const content = joinLines('## Orphan Section', '', '# Top Level', '', 'body');
    assert.ok(checkOrphanHeadings(content, 'SKILL.md'));
});

// TC-SKILLFIX-002 — a heading with prose body must pass.
test('TC-SKILLFIX-002: passes a heading that has a body', () => {
    const content = joinLines(
        '## Real Section',
        '',
        'This section has prose body.',
        '',
        '## Next Section',
        '',
        'More body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-003 — section -> subsection nesting (`##` -> `###`) is legitimate. Load-bearing
// guard: the rule must NOT fire here or it would red-line most well-structured skills.
test('TC-SKILLFIX-003: passes legitimate `##` -> `###` nesting', () => {
    const content = joinLines('## Parent Section', '', '### Child Subsection', '', 'Body.');
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-004 — output-format templates document stacked `##` headers inside fenced code
// blocks (e.g. domain-entities-review, planning). Fenced headings must be skipped.
test('TC-SKILLFIX-004: skips stacked headings inside a fenced code block', () => {
    const content = joinLines(
        '## Output Format',
        '',
        '```',
        '## Critical Issues',
        '',
        '## High Priority Issues',
        '',
        '## Positive Observations',
        '```',
        '',
        'Trailing body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-005 — unfenced output templates use `{placeholder}` heading syntax
// (e.g. architecture-review/ui-review `## Verdict: {PASS | WARN | BLOCKED}`). These are
// intentional and must be skipped.
test('TC-SKILLFIX-005: skips `{placeholder}` output-template headings', () => {
    const content = joinLines(
        '## Verdict: {PASS | WARN | BLOCKED}',
        '',
        '## BLOCKED Findings (Must Fix)',
        '',
        '### {Category}: {description}',
        '',
        '- **File:** {path}:{line}'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// Multiple orphans are all reported (cap of 5 shown in the message).
test('TC-SKILLFIX-001c: reports count when several orphans exist', () => {
    const content = joinLines('## A', '', '## B', '', '## C', '', 'body');
    const result = checkOrphanHeadings(content, 'SKILL.md');
    assert.ok(result);
    assert.match(result, /2 orphan heading\(s\)/);
});

test('TC-DEBUGTRACE-001: passes required end-to-start debugger trace coverage', () => {
    const content = joinLines(
        '<!-- SYNC:end-to-start-debugger-trace -->',
        '',
        '> **End-to-Start Debugger Trace**',
        '> observed final state',
        '> Enumerate all feeder paths',
        '> hypothesis matrix',
        '> owning fix layer',
        '> forward convergence proof',
        '',
        '<!-- /SYNC:end-to-start-debugger-trace -->'
    );
    assert.equal(checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md'), null);
});

test('TC-DEBUGTRACE-002: fails when end-to-start debugger trace gate is missing', () => {
    const content = joinLines('## Debug', '', 'Trace one path from input to error.');
    const result = checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md');
    assert.ok(result);
    assert.match(result, /missing end-to-start debugger trace gate/);
    assert.match(result, /SYNC:end-to-start-debugger-trace/);
});

// TC-REMEDIATE-001 — a FAILing run always points the operator at the sync (never hand-format).
// When the prettier-drift class struck this session, the FAIL output gave NO remediation; this
// locks the actionable guidance in so it can't silently regress to a bare failure list again.
test('TC-REMEDIATE-001: remediation names the sync entrypoints and forbids hand-formatting mirrors', () => {
    const msg = formatMirrorRemediation(['some non-mirror failure']);
    assert.match(msg, /npm run codex:sync/);
    assert.match(msg, /npm run sync:all/);
    assert.match(msg, /prettier --write/);
    assert.match(msg, /AGENTS\.md/);
    assert.match(msg, /\.prettierignore/);
    // Portability: the remediation MUST also give the no-npm / no-package.json path so a project that
    // only copied `.claude` can still regenerate the mirrors. Locks the standalone runner reference in.
    assert.match(msg, /run-codex-sync\.mjs/);
});

// TC-REMEDIATE-002 — a mirror-drift failure adds the drift-specific explainer (the exact failure
// string verify-skill-protocol emits: "context mirror content drifted from ...").
test('TC-REMEDIATE-002: mirror-drift failures add the drift-specific explainer', () => {
    const drift = formatMirrorRemediation(['AGENTS.md context mirror content drifted from .codex/CODEX_CONTEXT.md']);
    assert.match(drift, /reformatted/);
    assert.match(drift, /byte-for-byte/);
    // Non-drift failures must NOT carry the drift-specific lines (keeps the message scoped).
    const nonDrift = formatMirrorRemediation(['SKILL.md missing required debugger trace target']);
    assert.doesNotMatch(nonDrift, /byte-for-byte/);
});

// TC-CTXP-034 — P6/P7 protocol-body-signature parity primitive. The mirrors term-rewrite tool nouns,
// so the gate counts a rewrite-invariant signature instead of byte-comparing. These lock the count
// primitive: a single deduped copy reads as 1; a stray duplicate (2) and a missing copy (0) both fail.
test('TC-CTXP-034a: countOccurrences counts non-overlapping matches, CRLF-normalized', () => {
    const sig = '## Common AI Mistake Prevention (System Lessons)';
    // One copy (the deduped, baked-once case the gate expects to PASS).
    assert.equal(countOccurrences(`prefix\r\n${sig}\r\n- a bullet\r\nmore`, sig), 1);
    // Two copies (an un-deduped mirror — top + bottom CK copies leaked through: gate FAILs).
    assert.equal(countOccurrences(`${sig}\nbody one\n\n${sig}\nbody two`, sig), 2);
    // Zero copies (protocol absent from the mirror entirely: gate FAILs).
    assert.equal(countOccurrences('no protocol here at all', sig), 0);
});

test('TC-CTXP-034b: countOccurrences is non-overlapping and empty-needle safe', () => {
    // Non-overlapping: 'aa' in 'aaaa' is 2, not 3 — advance by needle length, never re-scan a match.
    assert.equal(countOccurrences('aaaa', 'aa'), 2);
    // Empty / nullish needle must be 0, never throw (defensive: a stale-signature config slips through).
    assert.equal(countOccurrences('anything', ''), 0);
    assert.equal(countOccurrences('anything', undefined), 0);
});

// TC-CTXP-035 — AGENTS.md is a bounded pointer/projection, while the full protocol remains in
// CODEX_CONTEXT.md. This prevents a host-size optimisation from silently accepting a truncated
// second copy or a pointer whose context content has changed since generation.
test('TC-CTXP-035: compact AGENTS projection passes with a matching target and fingerprint', () => {
    const context = '## Full static context\n\n[CRITICAL-THINKING-MINDSET]\n';
    const fingerprint = createHash('sha256').update(context.trim(), 'utf8').digest('hex');
    const agents = joinLines(
        '# Codex Project Instructions',
        '<!-- CK:CODEX-ROOT-PROJECTION -->',
        '## Claude Instructions Mirror (Compact Auto-Synced Projection)',
        '<!-- /CK:CODEX-ROOT-PROJECTION -->',
        '<!-- CODEX-CONTEXT-MIRROR:START -->',
        '## Codex Context Mirror (Auto-Synced)',
        'Read `.codex/CODEX_CONTEXT.md` before non-trivial work.',
        `Context fingerprint (SHA-256): ${fingerprint}`,
        '<!-- CODEX-CONTEXT-MIRROR:END -->'
    );
    assert.deepEqual(checkCompactAgentsProjection(agents, context), []);
});

test('TC-CTXP-035b: compact AGENTS projection rejects stale fingerprints, missing markers and overflow', () => {
    const context = 'full context';
    const agents = joinLines(
        '<!-- CODEX-CONTEXT-MIRROR:START -->',
        'Read `.codex/CODEX_CONTEXT.md`.',
        'Context fingerprint (SHA-256): 0000000000000000000000000000000000000000000000000000000000000000',
        '<!-- CODEX-CONTEXT-MIRROR:END -->',
        // Derived from the constant, not a second copy of the number: pinning the literal here is
        // what made a deliberate budget change look like a test failure instead of a doc update.
        'x'.repeat(AGENTS_ROOT_LIMIT_BYTES + 1)
    );
    const failures = checkCompactAgentsProjection(agents, context);
    assert.ok(failures.some((failure) => new RegExp(`above the ${AGENTS_ROOT_LIMIT_BYTES}-byte`).test(failure)));
    assert.ok(failures.some((failure) => /bounded root projection markers/.test(failure)));
    assert.ok(failures.some((failure) => /fingerprint does not match/.test(failure)));
});
