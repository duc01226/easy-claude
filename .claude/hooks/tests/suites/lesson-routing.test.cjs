/**
 * Lesson Routing Test Suite
 *
 * A recurring mistake is stopped best where nobody has to remember it. `/learn`, the universal
 * Lesson Extraction Gate and the fix's bug-class prevention task route a lesson structure-first: make the
 * mistake impossible by design, else an automatic check (a lint rule or architecture test whose
 * message names the fix, landing with a frozen baseline), else a test, else a hook, and prose last.
 * Agents also stop inheriting bad code: a workaround they find is reported, never propagated, and a
 * documented exemplar outranks the most frequent pattern (baselined or legacy-marked code is not
 * precedent).
 *
 * Coverage:
 *   TC-LRS-001 — `/learn` walks the prevention tiers strongest first, keeps its value and recurrence
 *                filters, lands a new rule with a frozen baseline, and no longer sends a catchable
 *                mistake to prose.
 *   TC-LRS-002 — the universal Lesson Extraction Gate (canonical block and its published file)
 *                states the same structure-first order.
 *   TC-LRS-003 — the universal mistake-prevention rules guard against copying: the precedent order,
 *                the workaround guard and the intentional-values carve-out, plus the search-first,
 *                the concise core (concise-profile sessions load only it) and the code reviewer.
 *   TC-LRS-004 — the bug-class prevention task (`fix --mode=prevent`, which replaced the post-fix
 *                lesson check) sweeps and reports sibling instances, then adds the strongest guard
 *                before a `/learn` lesson; `fix` and `workflow-bugfix` say so.
 *   TC-LRS-005 — the skill-eval corpus holds a behavioral case for each rule above.
 *
 * Portability: every row asserts this framework repository's own skill and protocol text and is
 * skipped in any other project (framework-repo signal). Paths use node:path; CRLF checkouts are
 * normalized; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { extractSyncBody } = require('../../../scripts/lib/extract-sync-block.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : "asserts the framework repo's own skill and protocol text (framework-repo signal)";

const read = (...parts) => fs.readFileSync(path.join(REPO_ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const SHARED = ['.claude', 'skills', 'shared'];

/** The text between a start marker and the next end marker; fails when either is missing. */
function between(text, start, end, label) {
    const from = text.indexOf(start);
    assert.ok(from >= 0, `${label}: "${start}" is present`);
    const to = text.indexOf(end, from + start.length);
    assert.ok(to >= 0, `${label}: "${end}" follows "${start}"`);
    return text.slice(from, to);
}

/** Asserts each marker appears, and after the previous one: the order is the rule. */
function assertOrdered(text, markers, label) {
    let at = -1;
    for (const marker of markers) {
        const found = text.indexOf(marker, at + 1);
        assert.ok(found > at, `${label}: "${marker}" must follow the stronger tier before it`);
        at = found;
    }
}

/** The one line that starts with `prefix`; fails when the rule's line is gone. */
function lineStartingWith(text, prefix, label) {
    const line = text.split('\n').find(row => row.startsWith(prefix));
    assert.ok(line, `${label}: a line starts with "${prefix}"`);
    return line;
}

/** A SYNC block body from the canonical source, and the same tag's published protocol file. */
function protocolTexts(tag) {
    const block = extractSyncBody(read(...SHARED, 'sync-inline-versions.md'), tag);
    assert.ok(block, `canonical SYNC:${tag} has a body`);
    const published = read(...SHARED, 'protocols', `${tag}.md`);
    return [
        ['canonical', block],
        ['published', published]
    ];
}

const tests = [
    {
        name: 'TC-LRS-001 /learn walks the prevention tiers strongest first, lands a new rule with a frozen baseline and keeps its value and recurrence filters',
        skip: SKIP,
        fn: () => {
            // Given the learn skill
            const text = read('.claude', 'skills', 'learn', 'SKILL.md');
            const depth = between(text, '### Prevention Depth Assessment (MANDATORY before saving)', '### Static Protocol Lesson Promotion', 'learn');

            // Then the tiers run from impossible-by-design down to prose, and structure replaces prose
            assertOrdered(depth, ['**1. Impossible by design**', '**2. Automatic check**', '**3. Test**', '**4. Hook**', '**5. Prose — last**'], 'tier table');
            assert.match(depth, /\*\*structure-first\*\*/);
            assert.match(depth, /A structural tier \*\*replaces\*\* the prose lesson/);
            assert.match(
                depth,
                /lint rule or architecture test in the project's own toolchain/,
                'the check lives in the project toolchain, not only in framework hooks'
            );

            // And a new rule lands green on existing code and fails on the next violation
            const baseline = lineStartingWith(depth, '**Baseline rule (tier 2):**', 'learn');
            for (const [intent, pattern] of [
                ['existing violations are frozen in a baseline', /\*\*frozen baseline\*\*[^\n]*native baseline or suppression file/],
                ['the baseline only ratchets down', /the count may only go down/],
                ['the message names the fix', /message names the root-cause fix/],
                ['a fixture proves the rule fires', /bad\/good fixture proves it fires/],
                ['green when it lands, red on the next violation', /build stays green, and violation N\+1 fails/],
                ['no scope creep and no disabled rule', /Never clear every existing violation[^\n]*never weaken or disable the rule/]
            ])
                assert.match(baseline, pattern, `baseline rule: ${intent}`);

            // And the decision walks the tiers in order, recommending the chosen tier, with prose and promotion last
            assert.match(depth, /\*\*Walk the tiers from 1 down\.\*\*[^\n]*Stop at the first yes[^\n]*why each stronger tier does not fit/);
            assert.match(depth, /Static Protocol Lesson promotion\*\* \(see below\) only when the walk ends at tier 5/);
            assertOrdered(depth, ['"Make it impossible"', '"Add a check (with a frozen baseline)"', '"Add a test"', '"Add a hook"', '"Prose only"'], 'options');
            assert.match(depth, /2–4 options, the tier the walk chose first, labelled `\(Recommended\)`/);
            assert.match(depth, /reuse it and never offer again a tier the user declined/, 'a caller-run tier walk is not asked twice');
            assert.doesNotMatch(depth, /default for most lessons/, 'prose is no longer the default carrier');

            // And a structural pick is delivered as a reviewed change, not as prose or a promise, and ends /learn there
            assert.match(depth, /the lesson is not also saved as prose unless the user asks for both/);
            assert.match(
                depth,
                /planned via `\/plan` \(or `\/fix` when it repairs a defect\) and delivered as a reviewed change, never as a note that promises one/
            );
            assert.match(depth, /`\/learn` then ends at that hand-off and reports it/);
            assert.match(text, /A structural pick that saves no prose ends at its `\/plan` hand-off instead; these end tasks do not apply to it\./);
            assert.match(
                text,
                /Why no structural tier \(impossible by design, a lint rule or architecture test, a test, a hook\) can carry it instead of prose\./
            );

            // And a mistake a check could catch becomes that check's lesson instead of being dropped or written as prose
            const autoFix = lineStartingWith(text, '| **Auto-fix**', 'learn');
            assert.match(autoFix, /already catch this/, 'only an existing check skips /learn');
            assert.match(autoFix, /could catch it but does not exist yet is no reason to skip: it becomes the carrier, ahead of prose/);
            assert.doesNotMatch(text, /update the review skill instead/);

            // And the rebuttals for the two tempting shortcuts stay
            assert.match(text, /^\| "A doc note is enough" +\| Prose is the last tier\./m);
            assert.match(text, /^\| "The new rule turns CI red, so drop it" +\| Land it with a frozen baseline/m);

            // And the summary and closing reminders repeat the order
            assert.match(
                text,
                /\*\*Assess prevention depth structure-first\*\* — make the mistake impossible by design, else an automatic check[^\n]*frozen baseline[^\n]*else a test, else a hook; prose[^\n]*only when no stronger tier fits/
            );
            assert.match(
                text,
                /route structure-first: impossible by design → lint rule or architecture test \(fix-naming message, frozen baseline\) → test → hook → prose last/
            );
        }
    },
    {
        name: 'TC-LRS-002 the universal Lesson Extraction Gate routes a recurring lesson structure-first, in the canonical block and its published file',
        skip: SKIP,
        fn: () => {
            for (const [where, text] of protocolTexts('lesson-extraction-gate')) {
                // Then a recurring lesson takes the first fitting tier, strongest first, with prose last
                assert.match(text, /Route a recurring one structure-first and take the first tier that fits/, where);
                assertOrdered(
                    text,
                    [
                        'make the mistake impossible by design',
                        'else an automatic check',
                        'names the fix',
                        'frozen baseline',
                        'else a test',
                        'else a hook',
                        'prose',
                        'comes last'
                    ],
                    `${where} lesson-extraction-gate`
                );
                assert.match(
                    text,
                    /Propose a structural tier as a change for the user to approve; for prose, ask the user to run `\/learn`; never silently self-edit instructions\./,
                    where
                );
                // And the old "improve the review skill" shortcut to prose is gone
                assert.doesNotMatch(text, /improve the review skill when mechanical review can catch the failure/, where);
            }
        }
    },
    {
        name: 'TC-LRS-003 the universal rules make a documented exemplar the precedent, rule out baselined or legacy code, and report a found workaround instead of copying it',
        skip: SKIP,
        fn: () => {
            for (const [where, text] of protocolTexts('ai-mistake-prevention')) {
                const copyRule = lineStartingWith(text, '- **Evaluate fit before copying a nearby pattern.**', where);
                // Then the precedent order puts a documented exemplar above prevalence
                assert.match(copyRule, /an exemplar the project documents beats the most frequent pattern/, where);
                // And baselined or legacy-marked code is not precedent
                assert.match(
                    copyRule,
                    /code in a file with lint or check baseline entries, or under a path a project rule marks legacy, is not precedent/,
                    where
                );
                // And a found workaround is reported, never propagated
                assert.match(
                    copyRule,
                    /Never propagate a workaround you find \(a sleep or timer used for ordering, a blind retry, a suppression or disabled check, a comment excusing a deviation\): report it to the user with `file:line` and follow the intended pattern instead; when none exists, ask\./,
                    where
                );
                // And the intentional-values rule no longer reads a justifying comment as intent
                const intentRule = lineStartingWith(text, '- **Assume existing values are intentional', where);
                assert.match(intentRule, /A workaround is the exception: its justifying comment is a claim to verify, never proof of intent\./, where);
            }
            for (const [where, text] of protocolTexts('discovery-and-first-principles')) {
                // And the search-first rule prefers the documented exemplar over the most frequent match
                assert.match(
                    text,
                    /grep 3\+ similar patterns and cite `file:line`\. Prefer an exemplar the project documents over the most frequent match/,
                    where
                );
            }
            for (const [where, text] of protocolTexts('concise-agent-core')) {
                // And a session on the concise profile, which loads only this core, still gets the rule
                const discovery = lineStartingWith(text, '- **Discovery.**', where);
                assert.match(discovery, /Prefer documented exemplars to frequent patterns; report, never copy, a workaround\./, where);
            }
            // And the code reviewer carries the same rule as a finding
            const reviewer = read('.claude', 'agents', 'code-reviewer.md');
            assert.match(
                reviewer,
                /Evaluate fit before copying a nearby pattern[^\n]*prefer an exemplar the project documents over the most frequent pattern, and report a copied workaround[^\n]*as a finding/
            );
        }
    },
    {
        name: 'TC-LRS-004 the bug-class prevention task reports sibling instances and adds the strongest guard before a /learn lesson; fix and workflow-bugfix say so',
        skip: SKIP,
        fn: () => {
            const check = read('.claude', 'skills', 'fix', 'references', 'mode-prevent.md');
            // Then the steps run defect? → class → why → sweep → guard → implement or ask → record → check → report
            assertOrdered(
                check,
                [
                    '0. **Is there a code defect to guard?**',
                    '1. **Name the bug class**',
                    '2. **Ask why this class can happen at all.**',
                    '3. **Sweep sibling instances.**',
                    '4. **Pick the strongest affordable guard, structure-first**',
                    '5. **Implement it, or record why not.**',
                    '6. **Write the prevention record**',
                    '7. **Check it**',
                    '8. **Report**'
                ],
                'prevention steps'
            );
            // And the sweep is reported with evidence and never fixed silently out of scope
            const sweep = lineStartingWith(check, '3. **Sweep sibling instances.**', 'prevention task');
            assert.match(sweep, /cite the query, the count and each `file:line`/);
            assert.match(sweep, /never fix them silently outside this change/);
            assert.match(sweep, /a workaround found on the way is reported, never copied/);
            // And the guard is chosen strongest first, its baseline holding the swept siblings, with /learn last
            const guard = lineStartingWith(check, '4. **Pick the strongest affordable guard', 'prevention task');
            assertOrdered(
                guard,
                [
                    'impossible by design',
                    'lint rule or architecture test',
                    'names the fix',
                    'frozen baseline holds the swept siblings',
                    'else a test',
                    'else a hook',
                    '`/learn` comes last'
                ],
                'prevention guard'
            );
            // And the user picks, the chosen tier recommended first; a structural pick is its own reviewed change
            assert.match(
                check,
                /the chosen tier first as `\(Recommended\)`: `Add the <tier> guard`, `Save with \/learn` or `Skip` when the tier is structural; `Save with \/learn` or `Skip` when the walk ended at prose/
            );
            assert.match(
                check,
                /A structural pick that is bigger than this fix is planned as its own reviewed change \(`\/plan`\), never folded silently into this fix/
            );
            assert.match(check, /the tier walk already done \(so it does not offer a declined guard again\)/);
            assert.match(check, /`Prevention: <class> — <count> siblings \(<query>\) — guarded by <tier> at <path>`/);
            // And both skills that run the task describe it the same way, and a nested run hands its sweep back
            const fix = read('.claude', 'skills', 'fix', 'SKILL.md');
            assert.match(
                fix,
                /sweep and report its sibling instances \(never fix them silently out of scope\), add the strongest affordable guard structure-first \(a `\/learn` lesson last, only after the user confirms\)/
            );
            assert.match(fix, /records the bug class and its sibling sweep in its report and hands them back/);
            const bugfix = read('.claude', 'skills', 'workflow-bugfix', 'SKILL.md');
            assert.match(
                bugfix,
                /its `Prevention:` line \(class, siblings, guard or `no-guard`\) into the workflow report/,
                'the sweep reaches the workflow recap'
            );
            assert.match(
                bugfix,
                /name the bug class, report its sibling instances, add the strongest affordable guard structure-first \(a `\/learn` lesson last, only after the user confirms\)/
            );
            assert.match(bugfix, /its sibling sweep is reported, never fixed silently; its guard is structure-first/);
        }
    },
    {
        name: 'TC-LRS-005 the skill-eval corpus holds a lint-first lesson case, a workaround case and a documented-exemplar case',
        skip: SKIP,
        fn: () => {
            const corpus = JSON.parse(read(...SHARED, 'skill-evals', 'corpus.v1.json'));
            const byId = id => corpus.cases.find(item => item.id === id);
            const expectations = {
                'learn-lint-first-lesson': [
                    /structure-first and recommend a lint rule before any prose lesson/,
                    /frozen baseline[^.]*names the root-cause fix[^.]*build stays green/
                ],
                'fix-workaround-not-propagated': [
                    /workaround to verify, not as the pattern to copy/,
                    /siblings, without changing them silently/,
                    /structure-first[^.]*frozen baseline holds the siblings, before a prose lesson/
                ],
                'precedent-documented-exemplar': [
                    /documented exemplar hook, not the most frequent older shape/,
                    /lint-baseline entries or under the legacy-marked path as no precedent/
                ]
            };
            for (const [id, patterns] of Object.entries(expectations)) {
                const item = byId(id);
                assert.ok(item, `${id} case exists`);
                assert.ok(item.skills.includes(item.expectedActivation), `${id} expects an available skill`);
                const assertions = item.assertions.join('\n');
                for (const pattern of patterns) assert.match(assertions, pattern, `${id} asserts ${pattern}`);
            }
        }
    }
];

module.exports = { name: 'lesson-routing', tests };
