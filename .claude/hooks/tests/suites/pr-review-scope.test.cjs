'use strict';

/**
 * PR review scope — a pull-request review covers the WHOLE branch against its target.
 *
 * Business intent: a defect introduced by any commit of the branch ships in the pull request exactly
 * like one in the latest commit, so a review that sees only the latest commit or only the current
 * working-tree changes gives false assurance. The rule lives only in prompt text; this suite fails
 * when an edit lets the review scope shrink again.
 * Invariants guarded:
 *   - pull-request/SKILL.md: Step 4 states the total-branch-diff invariant (three-dot from the merge-base,
 *     every branch commit plus pending staged work), forbids latest-commit and working-tree-only scope, and a CI fix
 *     is re-reviewed over the whole branch diff, not the fix alone;
 *   - changes-review and both fix-loop references preserve the current PR/branch whole-diff base;
 *     explicit historical assessments remain immutable and report-only, never live fix-loop targets.
 *   - the reviewer sees what was exercised (TC-PCI-084/085): the PR body carries runtime evidence as text or
 *     states why none exists, media is attached only after a per-PR yes, pr-review flags missing or stale
 *     evidence, and experience-review records the tree it exercised and keeps run commands only on a yes.
 *
 * Portability: reads only skill files that ship inside `.claude/`, resolved from this file's location;
 * no process, environment, home-dir, project config or git state.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');
const read = rel => fs.readFileSync(path.join(SKILLS_DIR, ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');

const tests = [
    {
        name: 'TC-PRS-001 pull-request review scope is the total branch diff from the merge-base, never the latest commit or the working tree alone',
        fn: () => {
            // Given the pull-request skill
            const text = read('pull-request/SKILL.md');
            const stage = text.slice(text.indexOf('### Step 3 —'), text.indexOf('### Step 3.3'));
            const review = text.slice(text.indexOf('### Step 4'), text.indexOf('### Step 5'));
            assert.match(review, /all branch commits plus pending staged changes/);
            assert.match(review, /Pass `--target=branch --base=<base-ref> --staged` on every live PR review, including an existing PR with no pending edits/);
            assert.match(review, /snapshot's merge-base with `git diff --cached <merge-base>`/);
            assert.match(review, /Exclude intentionally unstaged work/);
            assert.doesNotMatch(stage, /--target=staged|default `worktree` target/);
            assert.match(review, /Record the base ref, merge-base SHA/);
            assert.match(review, /pending merge parents included in the merge-base calculation/);
            const ci = text.slice(text.indexOf('### Step 8'), text.indexOf('### Step 9'));
            assert.match(ci, /run Step 4 over the whole staged branch candidate/);
            assert.match(text, /CI-fix rounds re-review the whole branch too/);
            assert.match(text, /REVIEW THE TOTAL BRANCH DIFF:/);
        }
    },
    {
        name: 'TC-PRS-002 current PR reviews retain the whole branch while explicit historical assessments preserve immutable scope',
        fn: () => {
            // Given the review skills and their fix-loop references
            const carriers = ['changes-review/SKILL.md', 'changes-review/references/fix-loop.md', 'workflow-review-changes/references/fix-loop.md'];
            const text = read('changes-review/SKILL.md');
            assert.match(text, /Current branch\/PR review includes `git diff <base>\.\.\.HEAD` plus local changes/);
            assert.match(text, /pin the merge-base/);
            assert.match(text, /Historical assessment is review-only/);
            assert.match(text, /fixing current files requires an agreed current target/);
            assert.match(text, /cannot make an immutable historical diff converge/);
            for (const rel of [
                'changes-review/references/fix-loop.md',
                'why-review/references/fix-loop.md',
                'workflow-review-changes/references/fix-loop.md'
            ]) {
                const receipt = read(rel);
                assert.match(receipt, /historical targets are not eligible for a live fix-loop receipt/);
                assert.match(receipt, /original pre-review snapshot/);
                if (!rel.startsWith('why-review/')) {
                    assert.match(receipt, /--target=branch --base=<base-ref> --staged/);
                    assert.match(receipt, /Preserve that scope for nested reviewers/);
                }
            }
            // A merged/squashed PR needs an explicit commit or verified range, not inferred current branch membership
            assert.match(read('changes-review/SKILL.md'), /merged or squashed PR[^\n]*explicit commit or verified range/i);
            const recipe = read('changes-review/SKILL.md');
            assert.match(recipe, /Historical commits compare their first parent \(empty tree for a root\)/);
            assert.match(recipe, /ranges compare the named endpoints/);
            assert.match(recipe, /Do not infer[^\n]*PR membership/);
        }
    },
    {
        // US-PCI-04: a human reviewer sees runtime evidence as text, and media leaves the machine only after a yes.
        name: 'TC-PCI-084 PR bodies carry runtime evidence as text, state its absence, attach media only on a per-PR yes, and pr-review flags missing or stale evidence',
        fn: () => {
            // Given the pull-request skill's PR body step
            const text = read('pull-request/SKILL.md');
            const body = text.slice(text.indexOf('4. **PR body**'), text.indexOf('5. **Review status**'));
            assert.match(body, /the runtime evidence below/);
            assert.match(body, /experience-verification\.cjs pr-evidence/);
            assert.match(body, /`candidateTree` is the Step 4 snapshot's `candidateTree`/);
            assert.match(body, /No runtime evidence: <reason>/);
            assert.match(body, /`records` is the `evidence-records\.json` array beside this branch's latest `experience-review` report/);
            assert.match(
                body,
                /untracked or intentionally unstaged files give it a different tree than the staged candidate; its evidence then counts as stale/
            );
            assert.match(body, /An observable change never omits the section, and the body never links `tmp\/` or a capture path/);
            assert.match(body, /a change with no observable surface gets no section/);
            assert.match(
                body,
                /only when the user explicitly asks to skip or bypass runtime evidence for this pull request, pass their reason as `skippedByUser`/
            );
            assert.match(body, /Never skip on your own judgment/);
            assert.match(body, /\*\*Media needs a per-PR yes\.\*\*/);
            assert.match(body, /only read and redacted screenshots or video/);
            assert.match(body, /gh pr edit <n> --attach '<path>#<alt text>'/);
            assert.match(body, /leaves the captures local-only, and the body says so\. No setting replaces the question/);
            // And the final branch review treats missing or stale evidence as a finding
            const review = read('pr-review/SKILL.md');
            assert.match(
                review,
                /A behavior change on an observable surface whose PR carries no runtime or test evidence, or whose evidence predates the reviewed tree[^\n]*is a finding — unless the PR body records the user's explicit skip/
            );
        }
    },
    {
        // US-PCI-03, BR-PCI-09: run commands persist only with consent; records name the tree they exercised.
        name: 'TC-PCI-085 runtime review keeps derived run commands only on a yes, reads the feature map and records the tree it exercised',
        fn: () => {
            // Given the experience-review skill
            const text = read('experience-review/SKILL.md');
            assert.match(text, /\*\*Keep derived commands:\*\*[^\n]*through `\/project-config` \(consent: yes\)/);
            assert.match(text, /never a secret value\. A decline is recorded in the report/);
            assert.match(text, /When `feature-map-reference\.md` is selected, read the entries for the impacted stories or features/);
            assert.match(text, /Each record carries `candidateTree`/);
            assert.match(text, /a record without `candidateTree` never counts as current/);
            assert.match(text, /Save the records as one JSON array in `evidence-records\.json` in the report's own folder/);
            // And the debug and docs-upkeep routes use the map without guessing
            assert.match(read('investigate/references/mode-debug.md'), /read `feature-map-reference\.md` under the reference-docs root when it is selected/);
            assert.match(
                read('docs-manager/references/mode-update.md'),
                /run `node \.claude\/scripts\/lib\/feature-map\.cjs audit`[^\n]*never re-link an entry by guess/
            );
        }
    }
];

module.exports = { name: 'pr-review-scope', tests };
