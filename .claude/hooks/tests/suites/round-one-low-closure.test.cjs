'use strict';

/**
 * Round-1 LOW closure — carrier consistency guard.
 *
 * Business intent guarded: a round-1 fix set of LOW findings closed by a scoped check (or deferred)
 * does not buy a full review round. The rule lives in `SYNC:double-round-trip-review` and in
 * `review-policy.cjs` (`resolution`), but review skills also restate the round-1 bar in their own
 * prose. A restated bar that says "round 1: zero findings" or "never skip the full re-review after a
 * fix" with no closure silently re-imposes the old, costlier rule — the stricter line wins.
 *
 * Contracts:
 *   carriers   no hand-written line (outside SYNC fences) in a shipped skill, reference or agent states
 *              the round-1 bar without "open"/the closure, or forbids skipping the re-review without
 *              the closure exception (framework repo only: it reads this repo's shipped carriers);
 *   detector   the checker flags seeded stale lines and passes compliant ones (non-vacuous);
 *   agreement  the protocol text names exactly the resolutions the executable policy accepts.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SKIP_REASON = 'reads the framework repo\'s own shipped carriers (framework-repo signal)';

// A round-1 bar restated without "open", in either word order: "round 1 ... zero/no (validated)
// findings", "zero findings in round 1", "zero-finding pass", an empty validated-finding set, or
// round 1 fixing/clearing/blocking on "every validated finding|severity".
const STALE_BAR = new RegExp([
    /round[ -]?1\b[^\n]{0,80}?\b(?:zero|no)(?! open)(?: validated)? findings?\b/.source,
    /\b(?:zero|no)(?! open)(?: validated)? findings?\b[^\n]{0,40}?\bin round[ -]?1\b/.source,
    /zero-finding pass/.source,
    /round[ -]?1\b[^\n]{0,60}?\bempty (?:validated-)?finding set/.source,
    /round[ -]?1\b[^\n]{0,40}?\b(?:fix(?:es)?|clears?|blocks? on|treats) every validated\b/.source
].join('|'), 'i');
// An unconditional demand for a full re-review after any fix.
const STALE_SKIP = new RegExp([
    /never skip the full (?:re-?review|review restart)[^\n]{0,40}?after (?:a|any|every)(?: validated)? fix/.source,
    /never skip (?:the )?fresh-context phase 4 re-?review after (?:a|any|every) fix/.source,
    /restart the full review (?:wave )?after (?:the|a|any|every) fix cycle/.source,
    /restart the full review wave/.source,
    /re-?run the full review from the start/.source,
    /after (?:each|every|any)(?: validated)? fix cycle\W{0,6}re-?run the full/.source,
    /every (?:validated )?fix restarts (?:the full )?review/.source,
    /re-?review (?:is )?mandatory after (?:a|any|every) fix/.source,
    /never optional after (?:a|any|every) fix/.source
].join('|'), 'i');
// A line that itself carries the closure is compliant even when it quotes the strict bar.
const CLOSURE = /LOW closure|closed by scoped check|closes by a local fix|sole exception|one exception/i;
const FENCE = /<!-- (\/?)SYNC:[^>]*-->/g;

/** Stale statements in one markdown text, outside SYNC fences (those are canonical copies). */
function staleLines(text) {
    const hits = [];
    let depth = 0;
    text.replace(/\r\n?/g, '\n').split('\n').forEach((line, index) => {
        for (const match of line.matchAll(FENCE)) depth += match[1] ? -1 : 1;
        if (depth > 0 || CLOSURE.test(line)) return;
        if (STALE_BAR.test(line) || STALE_SKIP.test(line)) hits.push(`${index + 1}: ${line.trim().slice(0, 140)}`);
    });
    return hits;
}

function markdownUnder(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // The protocols folder is a generated projection of the canonical file.
            if (entry.name !== 'protocols' && entry.name !== 'node_modules') out.push(...markdownUnder(full));
        } else if (entry.name.endsWith('.md')) {
            out.push(full);
        }
    }
    return out;
}

const tests = [
    {
        name: '[round-one-low-closure] TC-R1LC-001 no shipped carrier restates the round-1 bar without the LOW closure (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON,
        fn: () => {
            const files = [
                ...markdownUnder(path.join(REPO_ROOT, '.claude', 'skills')),
                ...markdownUnder(path.join(REPO_ROOT, '.claude', 'agents')),
                // Framework docs restate the loop for readers too.
                ...markdownUnder(path.join(REPO_ROOT, '.claude', 'docs'))
            ];
            assert.ok(files.length > 50, 'the carrier scan found the shipped skills and agents');
            const offenders = [];
            for (const file of files) {
                const hits = staleLines(fs.readFileSync(file, 'utf8'));
                if (hits.length) offenders.push(`${path.relative(REPO_ROOT, file)}\n    ${hits.join('\n    ')}`);
            }
            assert.deepEqual(offenders, [], `round-1 statements without the LOW closure:\n${offenders.join('\n')}`);
        }
    },
    {
        name: '[round-one-low-closure] TC-R1LC-002 the detector flags stale statements and passes compliant ones',
        fn: () => {
            // Given stale restatements of the old rule
            for (const stale of [
                '- Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM.',
                'Round 1 requires zero validated findings at any severity.',
                'PASS needs a zero-finding pass.',
                '> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict',
                'Fix validated findings, then restart the full review after the fix cycle.',
                // Reversed word order and "no finding" / empty-set forms of the round-1 bar
                'Converge once a fresh pass has zero validated findings in round 1.',
                'The bar is clear (PASS with zero findings in round 1, or LOW-only from round 2).',
                'Step 4 has no blocking finding under the current bar (round 1: no finding; round 2: no CRITICAL/HIGH/MEDIUM).',
                '**round 1** no validated findings of any severity, **round 2** no validated CRITICAL/HIGH/MEDIUM',
                'Zero fixes if the workflow reported no validated findings in round 1.',
                'Round 1 converge on an **empty validated-finding set** (any severity).',
                // Round 1 fixing / clearing / blocking on every validated finding without "open"
                '- **Loop bounds:** round 1 fixes every validated finding; from round 2 only CRITICAL/HIGH/MEDIUM block.',
                'Review loops keep the framework bar: round 1 clears every validated finding; round 2 onward defers LOW.',
                'Round 1 fix every validated severity.',
                'Classify by consequence; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM.',
                // A full re-review demanded after any fix, with no closure exception
                'Fix only validated findings, then restart the FULL review wave with fresh sub-agents.',
                'fix only validated blocking plan issues, then **re-run the FULL review from the start**.',
                '7. **After each validated fix cycle** — rerun the full plan-review protocol from the first review step',
                'Validate via `/why-review` first, then route the fix; every fix restarts review from Phase 0.',
                'Fresh-context re-review MANDATORY after any fix cycle.',
                '- Double round-trip MANDATORY — Phase 4 never optional after a fix cycle'
            ]) {
                // Then each is flagged
                assert.equal(staleLines(stale).length, 1, `must flag: ${stale}`);
            }
            // Given compliant statements
            for (const ok of [
                '- Review loop: round 1 exits on zero open findings (Round-1 LOW closure, `SYNC:double-round-trip-review`).',
                'Round 1 requires zero validated findings at any severity (a LOW closes by a local fix plus scoped check).',
                '> - NEVER skip the full review restart after a fix cycle (sole exception: a round-1 LOW-only fix set closed by scoped check)',
                'Restart the full review after the fix cycle (sole exception: a round-1 LOW-only fix set closed by scoped check).',
                'Round 2 needs zero validated CRITICAL/HIGH/MEDIUM findings.',
                // Compliant forms of the newly guarded phrasings: "open" bar, or the closure on the line
                'Converge once a fresh pass has zero open validated findings in round 1.',
                '- **Loop bounds:** round 1 exits on zero open validated findings (Round-1 LOW closure, `SYNC:double-round-trip-review`).',
                'Classify by consequence; round 1 blocks on every open validated finding (Round-1 LOW closure), round 2 blocks only CRITICAL/HIGH/MEDIUM.',
                'Step 4 has no blocking finding under the current bar (round 1: no open finding — Round-1 LOW closure; round 2: no CRITICAL/HIGH/MEDIUM).',
                'Fix only validated findings, then restart the FULL review wave (not for a round-1 LOW-only fix set — Round-1 LOW closure).',
                '7. **After each validated fix cycle** (except a round-1 LOW-only fix set — Round-1 LOW closure) — rerun the full protocol',
                // Round-2+ statements are outside the round-1 bar
                'From round 2 a round with no validated CRITICAL/HIGH/MEDIUM findings ends the loop.',
                'Round 3 is granted only when round 2 leaves a validated CRITICAL/HIGH open.'
            ]) {
                // Then none is flagged
                assert.deepEqual(staleLines(ok), [], `must pass: ${ok}`);
            }
            // And a SYNC-fenced canonical copy is never scanned
            assert.deepEqual(staleLines('<!-- SYNC:x -->\nround 1: zero findings;\n<!-- /SYNC:x -->'), []);
        }
    },
    {
        name: '[round-one-low-closure] TC-R1LC-003 the protocol text names exactly the resolutions the executable policy accepts (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON,
        fn: () => {
            const { LOW_RESOLUTIONS } = require(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'review-policy.cjs'));
            const canonical = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', 'shared', 'sync-inline-versions.md'), 'utf8')
                .replace(/\r\n?/g, '\n');
            const start = canonical.indexOf('## SYNC:double-round-trip-review\n');
            const body = canonical.slice(start, canonical.indexOf('\n---\n', start));
            assert.match(body, /Round-1 LOW closure/, 'the canonical round protocol defines the closure');
            for (const resolution of LOW_RESOLUTIONS) assert.ok(body.includes(resolution), `protocol names resolution ${resolution}`);
            assert.match(body, /never mints a commit review receipt/, 'a scoped check never stands in for a receipt-bearing full pass');
        }
    },
    {
        name: '[round-one-low-closure] TC-R1LC-004 the post-fix re-review skip for a round-1 LOW-only fix set requires that no simplification landed (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON,
        fn: () => {
            // Given the canonical closure: a LOW-only fix set skips the full re-review, a simplification never does
            const workflows = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8')).workflows;
            const postFix = workflows['workflow-review-changes'].sequence
                .find(occurrence => typeof occurrence === 'object' && occurrence.id === 'why-review');
            assert.ok(postFix && postFix.applicability, 'the post-fix why-review occurrence is conditional');
            // Then the registry exemption names the no-simplification condition in both applicability fields
            for (const field of ['when', 'skipReason']) {
                const text = postFix.applicability[field];
                assert.match(text, /round-1[^.]*LOWs? closed by scoped check/i, `${field} states the round-1 LOW exemption`);
                assert.match(text, /no simplification landed/i, `${field} limits the exemption to runs where no simplification landed`);
            }
            // And every workflow-review-changes line that states the exemption carries the same condition
            const skill = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
                .replace(/\r\n?/g, '\n');
            const exemptions = skill.split('\n').filter(line => /round-1 (?:LOW-only )?fix set|only findings were LOWs closed/i.test(line)
                && !/^> /.test(line));
            assert.ok(exemptions.length >= 3, 'the skill states the post-fix exemption in its step table and rules');
            for (const line of exemptions) assert.match(line, /no simplification/i, `exemption without the simplification condition: ${line.slice(0, 120)}`);
        }
    }
];

module.exports = { name: 'round-one-low-closure', tests, staleLines };
