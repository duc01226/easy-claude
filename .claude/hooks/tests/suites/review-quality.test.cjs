/**
 * Review Quality Test Suite
 *
 * Guards the Review Quality capability: one shared list of review dimensions worked as
 * evidence-closed todos, plan review scaled by plan profile, fresh context left to the
 * reviewer, proportionate fixes in fix rounds, and a bounded meaning-level drift pass in the
 * specification audit, plus an offer of a deeper check after a consequential answer.
 *
 * Coverage:
 *   TC-RVQ-001 — one list owns the review dimensions; the rationale and plan reviews point to it.
 *   TC-RVQ-002 — every applicable dimension is a todo closed with tool evidence; the list carries
 *                outsider read, decision readiness and the extended change-cost dimension.
 *   TC-RVQ-003 — plan review scales with the plan profile and keeps its plan-only checks.
 *   TC-RVQ-004 — plan validation and execution load no review dimension text.
 *   TC-RVQ-005 — no review rule forces a helper agent; a helper is the reviewer's choice.
 *   TC-RVQ-006 — fix rounds make the smallest proportionate fix; the published copy matches its owner.
 *   TC-RVQ-007 — the specification audit runs a bounded, read-only meaning-level drift pass.
 *   TC-RVQ-008 — a rationale review maps its required sections onto a /plan plan's sections.
 *   TC-RVQ-009 — a consequential answer is offered grill / why-review / skip in one question, and the
 *                grill, brainstorm and rationale-review skills point to the interview where it fits.
 *   TC-RVQ-010 — advice asks get the answer self-review: judgement-integrity-route.test.cjs, TC-JIR-012.
 *   TC-RVQ-011 — a standalone plan creation ends with one question: execute, deeper review or stop;
 *                workflows, calling skills and headless runs ask nothing.
 *
 * Portability: every row asserts this framework repository's own skills and is skipped in any
 * other project (framework-repo signal). Paths use node:path; text is read with LF line endings.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own review skills (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const OWNER_REL = '.claude/skills/shared/review-dimensions.md';
const owner = () => read(SKILLS, 'shared', 'review-dimensions.md');
const fullMode = () => read(SKILLS, 'why-review', 'references', 'full-mode.md');
const planReview = () => read(SKILLS, 'plan', 'references', 'mode-review.md');

/** Every Markdown file under the skills tree, as [relative path, text]. */
function skillMarkdown() {
    const out = [];
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) out.push([path.relative(REPO_ROOT, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n')]);
        }
    };
    walk(SKILLS);
    return out;
}

/** The names in the first column of the `## Review Dimensions` table. */
function dimensionNames(text) {
    const start = text.indexOf('\n## Review Dimensions\n');
    assert.ok(start >= 0, 'the owner holds a ## Review Dimensions section');
    return text.slice(start).split('\n')
        .filter(line => line.startsWith('|') && !/^\|\s*-/.test(line))
        .map(line => line.split('|')[1].trim())
        .filter(name => name && name !== 'Dimension');
}

/** The canonical body of `tag` in sync-inline-versions.md, without its heading. */
function canonical(tag) {
    const text = read(SKILLS, 'shared', 'sync-inline-versions.md');
    const head = `\n## SYNC:${tag}\n`;
    const start = text.indexOf(head);
    assert.ok(start >= 0, `canonical SYNC:${tag} exists`);
    const from = start + head.length;
    return text.slice(from, text.indexOf('\n---\n', from)).trim();
}

const tests = [
    {
        name: 'TC-RVQ-001 one list owns the review dimensions and both reviews point to it',
        skip: SKIP,
        fn: () => {
            // Given every skill Markdown file, When looking for a dimension table, Then only the owner holds one
            const holders = skillMarkdown().filter(([, text]) => /^\|\s*Target fit\s*\|/m.test(text) || /^\|\s*Future change cost\s*\|/m.test(text)).map(([rel]) => rel);
            assert.deepEqual(holders, [OWNER_REL], 'exactly one file holds the review dimension table');
            // Both reviews point to it with a read-before-review instruction
            assert.match(fullMode(), /\*\*\[BLOCKING\]\*\* Read `\.claude\/skills\/shared\/review-dimensions\.md` in full before the first review pass/);
            assert.match(planReview(), /\*\*\[BLOCKING\]\*\* Read `\.claude\/skills\/shared\/review-dimensions\.md` in full and work its dimensions as todos/);
            // Boundary: the plan review names the profile rule of the owner instead of copying the light set
            assert.match(planReview(), /scaled by the plan profile as its "A plan's profile picks the set" rule states/);
            assert.doesNotMatch(planReview(), /Goal alignment, Future change cost, Decision readiness/, 'the light set has one owner');
        }
    },
    {
        name: 'TC-RVQ-002 every applicable dimension is a todo closed with tool evidence, and the list carries the new angles',
        skip: SKIP,
        fn: () => {
            const text = owner();
            assert.match(text, /\*\*One todo per applicable dimension, created before judging\.\*\*/);
            assert.match(text, /A dimension applies when its subject exists in the artifact; otherwise close its todo `N\/A` with a one-line reason/);
            assert.match(text, /Close each todo with its verdict \(`PASS` \/ `FINDING` \/ `N\/A`\) and the evidence a tool returned/);
            assert.match(text, /A todo closed without evidence counts as unchecked/);
            assert.match(text, /Re-read it from disk; never judge it from memory of the conversation/);
            const names = dimensionNames(text);
            for (const name of ['Target fit', 'Goal alignment', 'Rationale depth', 'Trade-off honesty', 'Behavioral risk', 'Cross-boundary impact', 'Test/spec/doc sync', 'Future change cost', 'Outsider read', 'Decision readiness']) {
                assert.ok(names.includes(name), `the list holds ${name}`);
            }
            assert.equal(new Set(names).size, names.length, 'no dimension appears twice');
            assert.match(text, /\| Future change cost \|[^\n]*smallest change at the root cause[^\n]*searched for \(cite the search and 3 siblings\)/);
            assert.match(text, /\| Outsider read \|[^\n]*relies on but does not define or link[^\n]*Each item is a finding; its fix adds the item to the artifact or links it/);
            assert.match(text, /\| Decision readiness \|[^\n]*settled or explicitly blocked[^\n]*Local mechanics stay with the builder/);
        }
    },
    {
        name: 'TC-RVQ-003 plan review scales with the plan profile and keeps its plan-only checks',
        skip: SKIP,
        fn: () => {
            const text = planReview();
            // The profile split has one owner, the dimension list both plan review and plan creation's review read
            assert.match(owner(), /\*\*A plan's profile picks the set\.\*\* For a `\/plan` plan, the light profile works Goal alignment, Future change cost, Decision readiness and Test\/spec\/doc sync; a full profile, or no profile declared, works every applicable dimension, Outsider read included in any session\./);
            assert.match(owner(), /Any other artifact works every applicable dimension\./);
            // The three plan-only checks live in the owner too, so plan creation's own review reaches them
            assert.match(owner(), /Every plan profile also runs three plan-only checks: Is the outcome governed by a clear owner\/spec, with non-goals and no silent expansion\?/);
            assert.match(text, /\*\*Plan-only checks \(every profile\):\*\* the three the same rule names/);
            assert.match(owner(), /Is discovery bounded, with a named way to settle each uncertainty\?/);
            assert.match(owner(), /Does the `Not yet specified` list hold only items that cannot yet be stated as a precise question, and no product-intent, public-contract or irreversible decision parked there\?/);
            // Plan creation's Self-Review Pass works the same dimensions, scaled by the plan profile
            assert.match(read(SKILLS, 'plan', 'SKILL.md'), /That pass works the shared review dimensions as todos, scaled by the plan profile as `\.claude\/skills\/shared\/review-dimensions\.md` states \(the `\/why-review` pass reads that file, so plan creation loads no mode file for it\), and records each dimension's verdict under `## Self-Review`/);
            // And the high-attention summary lines name the same risk-scaled self-review and the standalone close
            assert.equal((read(SKILLS, 'plan', 'SKILL.md').match(/`\/why-review` self-review[^\n]*\(one round; up to three for a high-risk full-profile plan\)[^\n]*a standalone run ends with the one Standalone Close question/g) || []).length, 3, 'Summary, Workflow and Main steps lines name the risk-scaled self-review and the close');
            assert.doesNotMatch(read(SKILLS, 'plan', 'SKILL.md'), /one `\/why-review` fix pass/);
            // And its depth follows the plan's risk: a high-risk full plan gets a fix loop, every other plan one round
            assert.match(read(SKILLS, 'plan', 'SKILL.md'), /A full-profile plan with a one-way, cross-module, public-contract, data or security decision runs the pass as a fix loop: review, fix, then freshly review the fixed plan, up to three rounds, stopping when a fresh pass finds no MEDIUM or higher finding\. For every other plan the loop runs one round/);
            // Boundary: outsider read is never limited to the session that drafted the plan
            assert.doesNotMatch(text, /Outsider read[^\n]*only (when|in) (this|the) session/i);
            assert.doesNotMatch(owner(), /Outsider read[^\n]*only (when|in) (this|the) session/i);
        }
    },
    {
        name: 'TC-RVQ-004 plan validation and execution load no review dimension text',
        skip: SKIP,
        fn: () => {
            for (const parts of [['plan', 'references', 'plan-quality-checklist.md'], ['plan', 'references', 'mode-validate.md'], ['plan', 'references', 'mode-execute.md']]) {
                const text = read(SKILLS, ...parts);
                const rel = parts.join('/');
                assert.doesNotMatch(text, /review-dimensions\.md/, `${rel} loads no pointer to the dimension list`);
                assert.doesNotMatch(text, /^\|\s*(Outsider read|Decision readiness|Target fit)\s*\|/m, `${rel} carries no dimension rows`);
            }
            // Boundary: the plan review guidance is the one plan load that points to the list
            assert.match(planReview(), /review-dimensions\.md/);
        }
    },
    {
        name: 'TC-RVQ-005 no review rule forces a helper agent; starting one is the reviewer\'s choice',
        skip: SKIP,
        fn: () => {
            // Property: no skill file still requires a new helper agent for every round or re-review
            for (const [rel, text] of skillMarkdown()) {
                assert.doesNotMatch(text, /every round spawns a NEW `Agent` call/, `${rel} forces a new agent every round`);
                assert.doesNotMatch(text, /fully restart with a fresh zero-memory/, `${rel} forces a fresh zero-memory reviewer`);
                assert.doesNotMatch(text, /fix → fresh sub-agent re-review/, `${rel} forces a sub-agent re-review`);
                assert.doesNotMatch(text, /run the review as a fresh sub-agent built as in/, `${rel} forces a fresh sub-agent task review`);
                assert.doesNotMatch(text, /each round uses a NEW fresh sub-agent/, `${rel} forces a new sub-agent every round`);
                assert.doesNotMatch(text, /Spawn `performance-optimizer` as Round 1/, `${rel} forces a Round 1 sub-agent`);
                assert.doesNotMatch(text, /Round 2 uses a fresh sub-agent/, `${rel} forces a Round 2 sub-agent`);
            }
            const guide = read(SKILLS, 'shared', 'sub-agent-selection-guide.md');
            assert.match(guide, /When a round uses a sub-agent, never reuse one from an earlier round/);
            assert.match(guide, /fix → fresh re-review of the settled target: re-read it from disk; a sub-agent is your call when the risk justifies its cost/);
            assert.doesNotMatch(guide, /\|\s*NEW fresh domain-specific agent\s*\|/);
            assert.match(read(SKILLS, 'work-item', 'references', 'review-type-task.md'), /Review the task from the saved file, not from memory of drafting it\.[^\n]*a fresh sub-agent is your call when the risk justifies its cost/);
            assert.match(read(SKILLS, 'work-item', 'references', 'mode-review.md'), /fully re-review the settled artifact, re-read from disk; when you choose a sub-agent for it, use a fresh `general-purpose` reviewer/);
            assert.match(owner(), /\*\*Fresh context is your call, never required\.\*\*[^\n]*A helper started for a round is never one reused from an earlier round/);
            // The optional outsider-read probe is not a review round, so the review-round prompt template does not bind it
            assert.match(owner(), /This probe is a comprehension check, not a review round: it returns the unresolved terms and contradictions it found and no findings or verdict/);
            // The probe is briefed with its reader and a cap, so repository vocabulary does not drown the real gaps
            assert.match(owner(), /Tell it who the reader is \(someone with the repository open\) and ask for at most 10 items, most misleading first: what neither the page nor a file it names resolves, and statements on the page that contradict each other/);
            // Boundary: the prompt template for a reviewer that does choose a helper agent remains
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', 'review-protocol-injection.md')), 'the helper prompt template remains');
        }
    },
    {
        name: 'TC-RVQ-006 fix rounds make the smallest proportionate fix, and the published copy matches its owner',
        skip: SKIP,
        fn: () => {
            const body = canonical('review-policy');
            assert.match(body, /fix validated findings at the evidenced owner with the smallest fix proportionate to each finding’s severity →/);
            const published = read(SKILLS, 'shared', 'protocols', 'review-policy.md').trim();
            assert.equal(published, body, 'the published review-policy copy is identical to its owner');
        }
    },
    {
        name: 'TC-RVQ-007 the specification audit runs a bounded, read-only meaning-level drift pass',
        skip: SKIP,
        fn: () => {
            const author = read(SKILLS, 'spec', 'references', 'author.md');
            const start = author.indexOf('### Mode: AUDIT (Staleness Detection)');
            assert.ok(start >= 0, 'the audit mode section exists');
            const audit = author.slice(start, author.indexOf('\n## ', start));
            assert.match(audit, /\*\*Meaning-level drift pass \(stale sections only\)\.\*\* For each module or section step 3 flagged stale, open one todo/);
            assert.match(audit, /Record each rule `PASS`, `MISSING` \(no enforcement found\) or `VIOLATED` \(the code does the opposite\)/);
            assert.match(audit, /ends each section with `N rules checked, M divergent`/);
            assert.match(audit, /The pass edits no spec/);
            // Boundary: an unchanged module is not checked
            assert.match(audit, /A module with no change since `last_updated` is not checked \(`0 rules checked`\)/);
            // One owner: the code-to-spec audit reaches the pass through the spec audit
            assert.match(audit, /`workflow-code-to-spec` audit reaches this pass through its `\/spec \[mode=audit\]` step/);
            assert.match(read(SKILLS, 'workflow-code-to-spec', 'SKILL.md'), /Mode `audit`:[^\n]*`\/spec \[mode=audit\]`/);
            assert.match(read(SKILLS, 'spec', 'SKILL.md'), /staleness report per section plus a bounded meaning-level drift pass over stale sections \(never mutates docs\)/);
        }
    },
    {
        name: 'TC-RVQ-008 a rationale review maps its required sections onto a /plan plan',
        skip: SKIP,
        fn: () => {
            const text = fullMode();
            assert.match(text, /\*\*A `\/plan` plan\*\* maps these rows onto its own sections: Problem Statement → §1 Outcome and boundaries, Alternatives Considered and Design Rationale → §2 Important technical decisions/);
            assert.match(text, /Risk Assessment → §7 Risks, Ownership → §3 Areas and owners/);
            // Boundary: other plans keep the generic rows, and the output checklist keeps every row
            assert.match(text, /A plan from another source keeps the rows as written/);
            for (const row of ['| 1   | Problem Statement', '| 2   | Alternatives Considered', '| 3   | Design Rationale', '| 4   | Risk Assessment', '| 5   | Ownership']) {
                assert.ok(text.includes(row), `output checklist keeps ${row}`);
            }
        }
    },
    {
        name: 'TC-RVQ-009 a consequential answer offers grill, review or skip; grill, brainstorm and rationale review point to the interview',
        skip: SKIP,
        fn: () => {
            // The answer-review rule owns the offer: one question, three options, and where it never fires
            const rule = read(SKILLS, 'shared', 'protocols', 'judgement-integrity.md');
            assert.match(rule, /7\. \*\*Offer a deeper check on a consequential answer\.\*\*/);
            assert.match(rule, /close it with ONE question through the host's question tool, with three options: \*\*grill it\*\* \(`\/grill`/);
            assert.match(rule, /\*\*skip\*\* \(keep the answer as it is\)/);
            assert.match(rule, /Put grill first when the answer rests on the user's preferences or constraints, and why-review first when it rests on evidence and reasoning\./);
            assert.match(rule, /or on a turn where the mid-session plan question applies, which replaces this offer\./);
            assert.match(rule, /Never ask after a lookup, a trivial answer or a routine edit; inside a running workflow, or at the end of a skill whose procedure owns its closing question or next step, since those cover it; from a sub-agent or headless run/);
            // Grill takes an earlier answer as its subject and names why-review as its complement
            const grill = read(SKILLS, 'grill', 'SKILL.md');
            assert.match(grill, /\| An answer, advice or plan you gave earlier in this conversation \| this skill: that answer is the subject, and the user decides each choice it made \|/);
            assert.match(grill, /this one puts the choices to the user by interview, `\/why-review` has the agent critique the rationale without interviewing the user/);
            assert.match(grill, /every assumption it made about the user's constraints; each assumption is a decision to ask/);
            // Brainstorm and a standalone rationale review offer the interview; workflow steps and sub-agents never do
            const brainstorm = read(SKILLS, 'brainstorm', 'SKILL.md');
            assert.match(brainstorm, /\*\*Stress-test offer:\*\* when run standalone with a user present, the next-steps question below lists grill the recommended option[^\n]*so the session still ends with one question\. Discovery mode has no single recommended option and lists no grill option\./);
            assert.match(brainstorm, /^\| `\/grill <report-path>` \| Stress-test the recommended option/m);
            assert.match(brainstorm, /A workflow step or a sub-agent run makes no offer/);
            const review = fullMode();
            assert.match(review, /\*\*Standalone review, material trade-offs left to the user:\*\* the completed report lists them and offers `\/grill` with the report path/);
            assert.match(review, /The offer is a pointer in the report, not a question, so the review still returns its report and asks nothing more\./);
            assert.match(review, /A review run by a workflow step, another skill or a sub-agent never offers it\./);
        }
    },
    {
        name: 'TC-RVQ-011 a standalone plan ends with one question: execute, deeper review or stop',
        skip: SKIP,
        fn: () => {
            const plan = read(SKILLS, 'plan', 'SKILL.md');
            const close = plan.slice(plan.indexOf('\n## Standalone Close\n'), plan.indexOf('\n<!-- PROTOCOL-GUIDES:START -->'));
            assert.ok(close.length > 40, 'the plan skill holds a Standalone Close section');
            // One question with three options, after the validation chain ran or exited
            assert.match(close, /ends with one question through the host's question tool, after the validation chain ran or took one of its exits: \*\*execute now\*\* \(`\/plan --mode=execute <plan-path>`\) · \*\*deeper review first\*\* \(`\/plan --mode=review --fix-loop <plan-path>`, up to three rounds\) · \*\*stop here\*\*/);
            // A reasoned recommendation, and only the answer starts the next run
            assert.match(close, /Recommend execute when the self-review left no open finding and validation passed; recommend the deeper review when a finding stayed open, validation was skipped, or the plan is full-profile with a one-way or cross-module decision whose self-review ran one round or none/);
            assert.match(close, /Act only on the answer\./);
            // Boundary: workflows, calling skills and contexts that cannot ask never get the question
            assert.match(close, /Ask nothing when a workflow owns this run, when another skill runs plan creation as one of its steps, or when this context cannot reach the user/);
            // And plan creation still never runs review or execute on its own
            assert.match(plan, /plan creation never chains into them; the Standalone Close question offers them, and the user's answer starts one/);
        }
    }
];

module.exports = { name: 'review-quality', tests };
