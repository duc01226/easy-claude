'use strict';

/**
 * Round-3 skill-text pins (fix R3-B) — business intent guarded:
 *
 *   no-route-question   a skill called directly NEVER asks a "workflow vs standalone" question: the route
 *                       gate decides routing, ask-mode asks only when the assistant itself chooses to start
 *                       a catalog workflow. No skill (SKILL.md, references, shared text) may keep a closing
 *                       reminder, summary line or body that tells the model to ask it. Each skill keeps its
 *                       own Next Steps hand-off prompt.
 *   chain-next-steps    the research chain skips its Next Steps only when THIS run is a step of a `[Workflow]`
 *                       row (nested=true), never because a `[Workflow]` row merely exists in the task list.
 *   nested-key          retired nesting protocol and the four skills that skip their standalone gates
 *                       (plan execute, fix, feature-implement, investigate debug) decide "inside a workflow" from
 *                       nested=true, never from a stale or unrelated `[Workflow]` row that merely exists.
 *   ui-lens             workflow-review-changes states the UI-review row from the real contract: step 1 runs
 *                       with `--defer=specialists`, so it does not also run a UI dimension.
 *   defer-contract      the `--defer=review` deferral has an owner on every side: code-simplifier defines it,
 *                       the caller-mode contract names the duty the caller must run, workflow-review-changes
 *                       passes it, and the registry's post-fix `why-review` occurrence is applicable when the
 *                       simplifier changed a file. Dropping any side silently drops the simplifier's review.
 *
 * Portable Test Contract: reads only the framework repo's own shipped sources (framework-repo guard); no
 * process, env, project config or git state, so it holds on Windows, macOS and Linux.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SKIP_REASON = 'reads the framework repo\'s own shipped skills and registry (framework-repo signal)';
const guarded = fn => ({ skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON, fn });

const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...rel) => fs.readFileSync(path.join(REPO_ROOT, ...rel), 'utf8').replace(/\r\n?/g, '\n');
const skillText = (...rel) => read('.claude', 'skills', ...rel);

/** Every markdown file under `.claude/skills` as `{ rel, text }` (POSIX-style rel). */
function skillMarkdown() {
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(abs);
            else if (entry.name.endsWith('.md')) files.push({ rel: path.relative(SKILLS_DIR, abs).split(path.sep).join('/'), text: fs.readFileSync(abs, 'utf8').replace(/\r\n?/g, '\n') });
        }
    };
    walk(SKILLS_DIR);
    return files;
}

// Leftover wording of the removed `## Workflow Recommendation` blocks. Next-Steps option lines such as
// "/workflow-review-changes (Recommended)" are legitimate hand-offs and are not in this list.
const LEFTOVER_ROUTE_QUESTIONS = [
    [/workflow vs standalone/i, '"workflow vs standalone" decision'],
    [/ask the user to choose[^.\n]{0,60}workflow/i, 'ask the user to choose a workflow'],
    [/validate (?:the )?(?:workflow|route)(?:\/| choice| decisions| with)/i, 'validate the workflow/route with the user'],
    [/never auto-decide (?:a |the )?workflow/i, 'never auto-decide a workflow'],
    [/## Workflow Recommendation/i, 'a Workflow Recommendation section'],
    [/Activate [^\n]{0,60}workflow[^\n]{0,20}\(Recommended\)/i, 'an "Activate ... workflow (Recommended)" option'],
    [/standalone — run this skill/i, '"standalone — run this skill" option'],
    [/auto-decide complexity/i, 'auto-decide complexity']
];

/** `{ rel, line, label }` for every leftover phrase in `files`. */
function leftoverHits(files) {
    const hits = [];
    for (const { rel, text } of files) {
        text.split('\n').forEach((line, index) => {
            for (const [pattern, label] of LEFTOVER_ROUTE_QUESTIONS) {
                if (pattern.test(line)) hits.push({ rel, line: index + 1, label });
            }
        });
    }
    return hits;
}

const tests = [
    {
        name: '[review-fix-r3] TC-RF3-001 no skill text asks the model to pick workflow vs standalone; direct calls ask no workflow question',
        ...guarded(() => {
            const hits = leftoverHits(skillMarkdown());
            assert.deepEqual(hits, [], `leftover route-question wording (the route gate owns routing; keep only the Next Steps prompt): ${JSON.stringify(hits)}`);
            // And the previously stale carriers state the replacement rule or simply no longer carry the clause
            assert.match(skillText('investigate', 'references', 'mode-debug.md'), /a direct call asks no workflow question/);
            assert.match(skillText('production-readiness-review', 'SKILL.md'), /a direct call asks no workflow question/);
            for (const rel of [['test', 'SKILL.md'], ['security-audit', 'SKILL.md'], ['integration-test', 'SKILL.md'], ['code-simplifier', 'SKILL.md']]) {
                assert.ok(skillText(...rel).includes('AskUserQuestion'), `${rel.join('/')} keeps its own Next Steps AskUserQuestion prompt`);
            }
        })
    },
    {
        name: '[review-fix-r3] TC-RF3-002 the leftover-phrase scan fails when a stale route question returns (mutation check on the scanner, in memory)',
        ...guarded(() => {
            const sample = [{ rel: 'x/SKILL.md', text: 'a\n**MANDATORY** validate route/decisions with the user via `AskUserQuestion` — NEVER auto-decide a workflow vs standalone run.\nb' }];
            assert.ok(leftoverHits(sample).length >= 2, 'the old test-skill closing reminder is detected');
            for (const stale of [
                'outside a workflow ask the user to choose `workflow-bugfix` or direct `/investigate --mode=debug`',
                'validate workflow choice via `AskUserQuestion` — never auto-decide.',
                '- `AskUserQuestion` — validate workflow/route decisions with the user. NEVER auto-decide complexity.',
                '## Workflow Recommendation'
            ]) assert.ok(leftoverHits([{ rel: 'x.md', text: stale }]).length >= 1, `detected: ${stale}`);
            // A legitimate Next-Steps option and the route-gate rule itself are not flagged
            for (const fine of ['- **"/workflow-review-changes (Recommended)"** — Review all changes', 'never ask the user to choose. When the route matched a catalog workflow']) {
                assert.deepEqual(leftoverHits([{ rel: 'x.md', text: fine }]), [], `not flagged: ${fine}`);
            }
        })
    },
    {
        name: '[review-fix-r3] TC-RF3-003 the research chain skips Next Steps only when THIS run is a linked step of a [Workflow] row',
        ...guarded(() => {
            const text = skillText('web-research', 'references', 'research-chain.md');
            const table = text.slice(text.indexOf('## Routing questions'), text.indexOf('## Boundaries'));
            assert.match(table, /THIS run is a step of a `\[Workflow\]` row \(its own phase tasks are linked to that parent row, `nested=true`/);
            assert.match(table, /merely exists in `TaskList`, such as an abandoned one, does not count/);
            assert.doesNotMatch(table, /Parent workflow row active in `TaskList`/, 'no ambient-state skip rule');
            // The same rule the Next-Steps owners use
            assert.match(skillText('integration-test', 'SKILL.md'), /a `\[Workflow\]` row that merely exists in `TaskList`, such as an abandoned one, does not count/);
        })
    },
    {
        name: '[review-fix-r3] TC-RF3-004 workflow-review-changes states the UI lens from the real contract (step 1 defers specialists)',
        ...guarded(() => {
            const text = skillText('workflow-review-changes', 'SKILL.md');
            const row = text.split('\n').find(line => line.startsWith('| `/ui-design --mode=review --report-only`'));
            assert.ok(row, 'the UI specialist row exists');
            assert.match(row, /step 1 runs with `--defer=specialists`, so this is the only UI lens/);
            assert.doesNotMatch(text, /also runs inside step 1's UI dimension/, 'no claim that step 1 also runs the UI lens');
            assert.match(text, /Step 1 `\/changes-review` gets `--report-only --defer=whole-target,specialists,/, 'step 1 really does defer specialists');
        })
    },
    {
        name: '[review-fix-r3] TC-RF3-005 the code-simplifier --defer=review deferral has an owner on every side: skill, caller-mode contract, caller, registry applicability',
        ...guarded(() => {
            // The skill defines the deferral and records it
            const simplifier = skillText('code-simplifier', 'SKILL.md');
            assert.match(simplifier, /\*\*Caller deferral\.\*\* `--defer=review` in `\$ARGUMENTS` means the caller runs a FULL review of the settled whole target after this skill returns/);
            assert.match(simplifier, /return the exact list of files this skill changed so that review covers them/);
            assert.match(simplifier, /Only an explicit `--defer=review` from a caller that runs a FULL review of the settled state afterwards skips it/);
            // The contract names the duty the caller must run
            const contract = skillText('workflow-review-changes', 'references', 'caller-mode.md');
            const row = contract.split('\n').find(line => /^\| `review` \| `code-simplifier` \|/.test(line));
            assert.ok(row, 'the caller-mode table lists the review deferral for code-simplifier');
            assert.match(row, /a FULL `\/why-review` over the settled whole target after the simplifier returns/);
            assert.match(contract, /a caller that skips or merges the owning step omits the value, so the duty stays with the skill/);
            // The caller passes it and omits it when the owning step is skipped or merged
            const caller = skillText('workflow-review-changes', 'SKILL.md');
            assert.match(caller, /`\/code-simplifier --defer=review`/);
            assert.match(caller, /If the orchestrator skips or merges step 5, it omits the flag so the simplifier reviews itself/);
            // The registry's post-fix why-review occurrence is applicable exactly when the simplifier changed a file
            const registry = JSON.parse(read('.claude', 'workflows.json'));
            const sequence = registry.workflows['workflow-review-changes'].sequence;
            const postFix = sequence.find(entry => entry.id === 'why-review');
            assert.ok(postFix, 'the post-fix why-review occurrence exists');
            assert.match(postFix.applicability.when, /fix step or code-simplifier changed files/, 'the owner step covers a simplifier edit');
            assert.ok(sequence.findIndex(entry => entry.id === 'code-simplifier') < sequence.findIndex(entry => entry.id === 'why-review'), 'the simplifier runs before the post-fix review that covers it');
            // The registry itself carries the flags as `args`: a runner that builds its tasks from the registry (not from the SKILL.md prose)
            // must still run step 1 report-only and the simplifier with its review deferred to the post-fix why-review
            const initialReview = sequence.find(entry => entry.id === 'initial-changes-review');
            assert.ok(initialReview, 'the initial changes-review occurrence exists');
            assert.equal(initialReview.args, '--report-only --defer=whole-target,specialists,tests,entities', 'step 1 carries its caller-mode flags in the registry args');
            assert.equal(sequence.find(entry => entry.id === 'code-simplifier').args, '--defer=review', 'the simplifier occurrence carries --defer=review in the registry args');
            assert.match(caller, /registry occurrences carry these flags as their `args`/, 'the skill states that the registry args are the flags the runner passes');
            // And the SKILL.md mandatory step line equals the flagged manifest (the verifier compares the two)
            assert.ok(caller.includes('**IMPORTANT MANDATORY Steps:** /changes-review --report-only --defer=whole-target,specialists,tests,entities -> /why-review --target=whole-review-target'), 'the step line names step 1 with its flags');
            assert.ok(caller.includes('/fix --target=review -> /code-simplifier --defer=review -> /why-review'), 'the step line names the simplifier with its flag');
        })
    },
    {
        name: '[review-fix-r5] TC-RF5-001 retired nesting protocol and injector cannot reintroduce phase expansion',
        ...guarded(() => {
            const canonical = read('.claude', 'skills', 'shared', 'sync-inline-versions.md');
            assert.doesNotMatch(canonical, /^## SYNC:nested-task-creation(?::reminder)?$/m);
            assert.ok(!fs.existsSync(path.join(REPO_ROOT, '.claude', 'skills', 'shared', 'protocols', 'nested-task-creation.md')));
            assert.ok(!fs.existsSync(path.join(REPO_ROOT, '.claude', 'scripts', 'inject_nested_task_creation.py')));
        })
    },
    {
        name: '[review-fix-r5] TC-RF5-002 plan execute, fix, feature-implement and investigate debug decide "inside a workflow" from nested=true, never from a row that merely exists',
        ...guarded(() => {
            // Wording that treats ANY [Workflow] row / "being inside a workflow" as the skip condition for the standalone gates
            const AMBIENT = [
                [/if a parent `\[Workflow\]` row exists/i, 'skip when "a parent [Workflow] row exists"'],
                [/when a parent `\[Workflow\]` row exists/i, 'parent owns review when "a parent [Workflow] row exists"'],
                [/\(a parent `\[Workflow\]` row exists\)/i, 'nested defined as "a parent [Workflow] row exists"'],
                [/\(no parent `\[Workflow\]` row via `TaskList`\)/i, 'standalone defined as "no parent [Workflow] row via TaskList"'],
                [/an active parent workflow row [—–-] or a/i, 'fix skip keyed on "an active parent workflow row"'],
                [/skip (?:entirely )?if invoked inside a workflow/i, 'skip if invoked inside a workflow'],
                [/skip if inside workflow/i, 'skip if inside workflow'],
                [/if already inside a workflow/i, 'if already inside a workflow'],
                [/approval may skip only inside a workflow/i, 'approval may skip only inside a workflow'],
                [/skip only inside a workflow/i, 'skip ONLY inside a workflow'],
                [/inside a workflow skip the contract/i, 'inside a workflow SKIP the contract'],
                [/a matching active workflow task exists/i, 'plan workflow invocation keyed on a matching active workflow task'],
                [/\(no parent workflow\) self-assembles/i, 'standalone defined as "no parent workflow"']
            ];
            const targets = [
                ['plan', 'references', 'mode-execute.md'],
                ['fix', 'SKILL.md'],
                ['feature-implement', 'SKILL.md'],
                ['investigate', 'references', 'mode-debug.md'],
                ['plan', 'SKILL.md']
            ];
            const scan = files => {
                const hits = [];
                for (const { rel, text } of files) {
                    text.split('\n').forEach((line, index) => {
                        for (const [pattern, label] of AMBIENT) if (pattern.test(line)) hits.push({ rel, line: index + 1, label });
                    });
                }
                return hits;
            };
            const files = targets.map(rel => ({ rel: rel.join('/'), text: skillText(...rel) }));
            assert.deepEqual(scan(files), [], 'ambient "a [Workflow] row exists" nesting rule returned');
            // Each of the four decision sites states the positive rule: nested=true, and a row that merely exists does not count
            for (const { rel, text } of files) {
                assert.match(text, /merely exists in `TaskList`/, `${rel} states that a [Workflow] row that merely exists does not count`);
                assert.match(text, /nested=true/, `${rel} keys the skip on nested=true`);
            }
            // The skipped-steps list of plan execute is unchanged: the nested run still skips exactly Steps 3, 4 and 5
            assert.match(skillText('plan', 'references', 'mode-execute.md'), /skip Step 3 \(`code-reviewer`\), Step 4 \(`tester`\) and Step 5 \(approval\)|SKIP Step 3 \(`code-reviewer`\), Step 4 \(`tester`\) and Step 5 \(approval\)/i);
            // Mutation check on the scanner (in memory): each old wording is detected
            for (const stale of [
                'SKIP this section: if a parent `[Workflow]` row exists, the surrounding workflow',
                '> **When a parent `[Workflow]` row exists (`TaskList`), the parent owns review**',
                '## Next Steps (Standalone only — skip if inside workflow)',
                '> If already inside a workflow, skip both the contract and this menu',
                '## Standalone Mode Pipeline (skip entirely if invoked inside a workflow)',
                'An active parent workflow row — or a `--target=review` call'
            ]) assert.ok(scan([{ rel: 'x.md', text: stale }]).length >= 1, `detected: ${stale}`);
        })
    }
];

module.exports = { name: 'review-fix-r3-skill-pins', tests };
