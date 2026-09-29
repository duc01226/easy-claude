'use strict';

/**
 * Plan-speed contract — plans are shaped and executed for the shortest wall time.
 *
 * Business intent: a plan carries no per-phase or per-release test/review/close phases and no per-phase
 * test RUN; each implementation phase ends with type-check/compile only and writes its tests with its code,
 * and the plan ends with ONE final gate: static review fix-loop, then ONE verify (full suite + mutation
 * check), fix-and-re-run to green, re-review only if that edited anything (`SYNC:verify-last-order`).
 * Big plans run as critical-path waves, and a multi-phase `plan-execute` run batches its reviewer and
 * tester once after the last wave, review first. The rules live only in prompt text, so an edit that drops
 * one silently brings back the slow, repeatedly-gated plan shape.
 * Invariants guarded:
 *   - plan/SKILL.md § Plan Parallelism Metadata: verify-last final gate, critical-path waves, serial chains,
 *     releases only on request;
 *   - plan/references/engine-plan-organization.md: agrees (no test phase in its examples);
 *   - plan-execute/SKILL.md: Step 3 = static review, Step 4 = the one verify, both once over the whole
 *     changeset; workflow-nested runs stop after implementation;
 *   - plan-review/SKILL.md: flags test/review sub-phases, per-phase test runs and unjustified SEQ tags;
 *   - the verify-last protocol reaches every owner skill and the review workflow defers its tests.
 *
 * Portability: reads only skill files that ship inside `.claude/`, resolved from this file's own
 * location. It spawns no process and reads no environment, home-dir, project config or git state,
 * so it holds unchanged in any adopting project on Windows, macOS and Linux.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');

const read = rel => fs.readFileSync(path.join(SKILLS_DIR, ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');

/** Body of the `## {heading}` section, up to the next level-2 heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}`);
    assert.ok(start >= 0, `section "## ${heading}" must exist`);
    const next = text.indexOf('\n## ', start + 4);
    return text.slice(start, next < 0 ? text.length : next);
}

const PLAN_SECTION = 'Plan Parallelism Metadata';

const tests = [
    {
        name: 'TC-PSC-001 plan skill requires ONE final gate phase and no test/review sub-phases',
        fn: () => {
            // Given the plan skill's parallelism-metadata section
            const body = section(read('plan/SKILL.md'), PLAN_SECTION);
            // When its phase-structure rules are read
            // Then per-phase and per-release test/review/close phases are ruled out
            assert.match(body, /no per-phase or per-release test, review, or "close" phase/);
            assert.match(body, /and no per-phase test RUN/);
            // And each implementation phase ends with compile/type-check only and writes its tests with its code
            assert.match(body, /type-check or compile only: its tests are WRITTEN with its code/);
            // And the plan ends with one final gate: docs and mirrors, static review, the single verify, re-review only if it edited
            assert.match(body, /ONE `SEQ` final gate phase, in this order: docs and counts, generated mirrors → one static review fix-loop over the whole changeset \(no test run\) → the single verify/);
            assert.match(body, /re-review only if that fixed anything/);
        }
    },
    {
        name: 'TC-PSC-002 plan skill lays big plans out as critical-path waves with serial chains',
        fn: () => {
            // Given the same section
            const body = section(read('plan/SKILL.md'), PLAN_SECTION);
            // Then SEQ is reserved for real dependencies and the rest goes into PAR waves
            assert.match(body, /compute the critical path/);
            assert.match(body, /`SEQ` only where a real data or write-set dependency forces it/);
            // And a dependent phase starts when ITS dependencies return, not the whole wave
            assert.match(body, /starts as soon as THOSE return, not when its whole wave does/);
            // And wall time is the critical-path length, not the hour sum
            assert.match(body, /critical-path length, not the sum of phase hours/);
            // And phases sharing a file form one serial chain; releases only on request
            assert.match(body, /share a file form one serial chain owned by one executor/);
            assert.match(body, /releases only when the owner asks/);
        }
    },
    {
        name: 'TC-PSC-003 plan-organization engine agrees: final gate example, no test phase',
        fn: () => {
            // Given the engine reference the planner follows
            const engine = read('plan/references/engine-plan-organization.md');
            // Then it states the no-test/review-phase rule and shows a final gate phase
            assert.match(engine, /No test, review, or "close" phase per phase or per release/);
            assert.match(engine, /phase-07-final-gate\.md/);
            // And the final gate is ordered review-first, verify once
            assert.match(engine, /one static review fix-loop → the single verify: full suite \+ mutation check → fix and re-run to green → re-review only if that fixed anything/);
            // And no example re-introduces a standalone test phase or per-wave review boundary
            assert.doesNotMatch(engine, /phase-\d+-write-tests\.md|\|\s*Testing\s*\|/);
            assert.doesNotMatch(engine, /approval, review, and migration phases are always/);
        }
    },
    {
        name: 'TC-PSC-004 plan-execute reviews statically first, then verifies once; nested runs leave both to the parent workflow',
        fn: () => {
            // Given plan-execute
            const text = read('plan-execute/SKILL.md');
            // When a multi-phase run executes
            // Then per phase only compile runs, no test run of any kind
            assert.match(text, /\*\*Multi-phase run\*\*[^\n]*per phase, run only type-check\/compile — no test run of any kind/);
            // And Step 3 (static review) and Step 4 (the one verify) run once after the last wave over the whole changeset
            assert.match(text, /Step 3 and Step 4 run ONCE after the last wave, over the whole changeset/);
            assert.match(section(text, 'Step 3: Code Review (static)'), /multi-phase run: once, after the last wave, over the whole changeset[\s\S]*runs NO test suite/);
            const verify = section(text, 'Step 4: Verify (tests + mutation check, once)');
            assert.match(verify, /ONCE over the whole changeset \(multi-phase run: once, after Step 3\)/);
            // And the verify owns the mutation check and re-runs the review only when it edited something
            assert.match(verify, /main session runs the mutation check[^\n]*on every changed core-logic line/);
            assert.match(verify, /if fixing in this step edited ANY source or test file, re-run Step 3/);
            // And the review comes before the verify in the file's own order
            assert.ok(text.indexOf('## Step 3: Code Review (static)') < text.indexOf('## Step 4: Verify (tests + mutation check, once)'), 'Step 3 review precedes Step 4 verify');
            // And the --approval=off flag bullet carries the same batching
            assert.match(text, /`--approval=off` → Step 5[^\n]*after the last phase, run Step 3 and Step 4 once over the whole changeset/);
            // And a one-phase run keeps its per-phase gates
            assert.match(text, /A one-phase run is unchanged\./);
            // And inside a parent workflow it runs Steps 0-2 and 6 only — the parent's review and verify are Steps 3-4
            const nested = section(text, 'Workflow-Nested Mode');
            assert.match(nested, /Run Steps 0–2[^\n]*and Step 6/);
            assert.match(nested, /SKIP Step 3 \(`code-reviewer`\), Step 4 \(`tester`\) and Step 5 \(approval\)/);
        }
    },
    {
        name: 'TC-PSC-005 plan-review flags test/review sub-phases and unjustified SEQ tags',
        fn: () => {
            // Given plan-review's checklist
            const text = read('plan-review/SKILL.md');
            // Then one checklist line flags both plan-speed defects as findings
            assert.match(text, /- \[ \] \*\*Plan speed\*\* — flag as a finding any per-phase or per-release test, review, or "close" sub-phase[^\n]*any per-phase test RUN or mutation run[^\n]*any `SEQ` tag without a real data or write-set dependency/);
        }
    },
    {
        name: 'TC-PSC-006 the verify-last protocol is defined once and reaches every owner skill and the review workflow',
        fn: () => {
            // Given the shipped protocol projection
            const protocol = read('shared/protocols/verify-last-order.md');
            // Then it orders build, static review, one verify with mutation check, fix-and-re-run, conditional re-review
            assert.match(protocol, /Build[\s\S]*Review and fix, static[\s\S]*Verify once[\s\S]*Fix and re-run until green[\s\S]*Re-review only if step 4 edited anything/);
            assert.match(protocol, /Green counts only on the final tree/);
            // And the verify <-> re-review alternation is bounded, and the mutation check never uses destructive git
            assert.match(protocol, /alternation is capped at 2 turns[^\n]*escalates via `AskUserQuestion`/);
            assert.match(protocol, /NEVER `git checkout`, `restore`, `reset` or `stash` on the working tree/);
            // And the skills that run tests on their own initiative defer to the single verify
            assert.match(read('integration-test/SKILL.md'), /Verify-last exception[\s\S]*WRITES the tests and does NOT run them/);
            assert.match(read('code-simplifier/SKILL.md'), /verify statically instead[\s\S]*run none/);
            // And every owner skill carries it (guide line or inline body)
            for (const skill of ['plan', 'plan-execute', 'feature-implement', 'fix', 'test', 'integration-test-verify',
                'workflow-review-changes', 'workflow-feature', 'workflow-bugfix', 'workflow-refactor',
                'workflow-implement-spec', 'workflow-big-feature', 'workflow-greenfield-init', 'start-workflow']) {
                assert.match(read(`${skill}/SKILL.md`), /verify-last-order/, `${skill} must reference the verify-last protocol`);
            }
            // And the review workflow can defer its own test run to the parent's single verify
            assert.match(read('workflow-review-changes/SKILL.md'), /`--tests=\{prove\|defer\}` \(default `prove`\)/);
            // And the close refuses a green run older than the last edit
            assert.match(read('workflow-end/SKILL.md'), /green run must be on the final tree/);
        }
    },
    {
        name: 'TC-PSC-007 the verify-last gaps found in review stay closed: refactor pre-change run, mutation safety and evidence, approval trigger, fix order, final-gate mapping',
        fn: () => {
            // Given the canonical protocol
            const protocol = read('shared/protocols/verify-last-order.md');
            // Then a refactor may run its characterization tests once on the unrefactored tree
            assert.match(protocol, /ONE targeted run of any characterization tests written before the code moves/);
            // And the mutation check snapshots the file, proves a clean restore, and never uses destructive git
            assert.match(protocol, /copy the file to `tmp\/` and restore from that copy[^\n]*clean diff/);
            assert.match(protocol, /NEVER `git checkout`, `restore`, `reset` or `stash`/);
            // And the main session owns the mutation check when no editing verify step runs
            assert.match(protocol, /the main session when no such step runs/);
            // And integration-test carries the same characterization exception
            assert.match(read('integration-test/SKILL.md'), /characterization tests written BEFORE a refactor moves code get ONE targeted run/);
            // And the mutation result is part of the verify report and of the close evidence
            assert.match(read('integration-test-verify/SKILL.md'), /mutation-check result \(mutants killed n\/n/);
            assert.match(read('workflow-end/SKILL.md'), /cite the mutation-check result/);
            // And the approval prompt at the close keys on a nested plan-execute in the task list, never on the deviation log
            assert.match(read('workflow-end/SKILL.md'), /ran nested in this run[^\n]*NOT the deviation log/);
            // And standalone /fix orders the verify after the reviews in every place it states the order
            const fix = read('fix/SKILL.md');
            const fixLine = re => fix.split('\n').find(line => re.test(line)) || '';
            assert.match(fixLine(/^- \*\*No-flag spine:\*\*/), /verify once/, 'fix no-flag spine states the verify-once step');
            assert.match(fixLine(/\*\*Final standalone order:\*\*/), /verify once/, 'fix final standalone order states the verify-once step');
            assert.match(fixLine(/^> \*\*Standalone Review Gate/), /verify once/, 'fix standalone review gate states the verify-once step');
            assert.match(fixLine(/standalone \(no parent workflow\) self-assembles the spine/), /verify once/, 'fix closing reminder states the verify-once step');
            // And the numbered standalone todo spine ends with the verify-once item after the reviews
            assert.match(fixLine(/^> 6\. \*\*Verify once\*\*/), /final todo, after every review[^\n]*regression tests once, then the mutation check/, 'fix numbered spine has a verify-once item');
            // And the review-fix step re-runs its tests only when no later verify step exists
            assert.match(fix, /NOT run here when the caller has a later verify step or passes `--tests=defer`[^\n]*re-run the affected tests/);
            // And the custom-simple route examples put the review before the test
            assert.doesNotMatch(read('start-workflow/SKILL.md'), /investigate → fix → test → changes-review/);
            assert.doesNotMatch(read('shared/workflow-first-gate.md'), /investigate → fix → test → changes-review/);
            // And plan-execute maps the plan's final gate phase onto Steps 3-4 instead of running a second review/verify in Step 2
            assert.match(read('plan-execute/SKILL.md'), /ONE final gate phase[^\n]*never a second run inside Step 2/);
        }
    }
];

module.exports = { name: 'plan-speed-contract', tests };
