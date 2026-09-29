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
 *     every branch commit ∪ uncommitted), forbids latest-commit and working-tree-only scope, and a CI fix
 *     is re-reviewed over the whole branch diff, not the fix alone;
 *   - changes-review and both fix-loop references treat a PR/branch review as always having a
 *     `<target>...HEAD` base.
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
            // Then Step 4 states the invariant: three-dot base ref, every branch commit, plus uncommitted changes
            assert.match(text, /\*\*Review scope invariant\.\*\* A pull-request review covers the TOTAL net change of the branch against the target/);
            assert.match(text, /`git diff <base-ref>\.\.\.HEAD` \(three-dot, from the merge-base, every branch commit\) ∪ uncommitted changes/);
            // And the shrunken scopes are explicitly forbidden
            assert.match(text, /NEVER only the latest commit \(`HEAD~1\.\.HEAD`, `git show`\), never only the current working-tree changes/);
            // And reviewing an existing PR uses the same scope from the PR base, with a recorded scope proof
            assert.match(text, /Reviewing an existing PR \(no local edits\) uses the same scope from the PR's base/);
            assert.match(text, /Record the scope proof in the report: base ref, merge-base SHA/);
            // And a CI fix is re-reviewed over the whole branch diff, not the fix alone
            assert.match(text, /Re-run Step 4 over the WHOLE branch diff again[^\n]*never the fix alone/);
            assert.doesNotMatch(text, /scope = current uncommitted changes; the branch is already reviewed/);
            assert.doesNotMatch(text, /CI-fix rounds narrow to the new diff/);
            assert.match(text, /CI-fix rounds re-review the whole branch too/);
            // And the rule is repeated in the must-rules and the closing reminders
            assert.match(text, /MUST ATTENTION review the WHOLE branch: scope is always `<base-ref>\.\.\.HEAD` ∪ uncommitted/);
            assert.match(text, /REVIEW THE TOTAL BRANCH DIFF:/);
        }
    },
    {
        name: 'TC-PRS-002 the review skills treat a PR or branch review as always carrying a target...HEAD base',
        fn: () => {
            // Given the review skills and their fix-loop references
            const carriers = ['changes-review/SKILL.md', 'changes-review/references/fix-loop.md', 'workflow-review-changes/references/fix-loop.md'];
            for (const rel of carriers) {
                // Then each says a pull-request or branch review is scoped `<target>...HEAD` ∪ uncommitted, never the latest commit alone
                assert.match(read(rel), /pull-request or branch review[^\n]*<target>\.\.\.HEAD[^\n]*never only the latest commit or the working tree/i, `${rel} must pin the PR review scope`);
            }
        }
    }
];

module.exports = { name: 'pr-review-scope', tests };
