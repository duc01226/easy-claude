'use strict';

/**
 * Plan-speed contract — plans are shaped and executed for the shortest wall time.
 *
 * Business intent: a plan carries no per-phase or per-release test/review/close phases; each
 * implementation phase ends with a cheap targeted check and the plan ends with ONE final gate.
 * Big plans run as critical-path waves, and a multi-phase `plan-execute` run batches its tester
 * and reviewer once after the last wave. The rules live only in prompt text, so an edit that drops
 * one silently brings back the slow, repeatedly-gated plan shape.
 * Invariants guarded:
 *   - plan/SKILL.md § Plan Parallelism Metadata: final-gate-only, critical-path waves, serial chains,
 *     releases only on request;
 *   - plan/references/engine-plan-organization.md: agrees (no test phase in its examples);
 *   - plan-execute/SKILL.md: multi-phase runs Step 3 and Step 4 once over the whole changeset;
 *   - plan-review/SKILL.md: flags test/review sub-phases and unjustified SEQ tags.
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
            // And each implementation phase ends with its targeted check
            assert.match(body, /targeted check: its own suites plus one mutation check per new rule/);
            // And the plan ends with one final gate covering docs, mirrors, full suite and one review loop
            assert.match(body, /ONE `SEQ` final gate phase: docs and counts, generated mirrors, the full suite, and one review fix-loop over the whole changeset/);
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
            // And no example re-introduces a standalone test phase or per-wave review boundary
            assert.doesNotMatch(engine, /phase-\d+-write-tests\.md|\|\s*Testing\s*\|/);
            assert.doesNotMatch(engine, /approval, review, and migration phases are always/);
        }
    },
    {
        name: 'TC-PSC-004 plan-execute batches tester and reviewer once in a multi-phase run',
        fn: () => {
            // Given plan-execute
            const text = read('plan-execute/SKILL.md');
            // When a multi-phase run executes
            // Then per phase only compile and the targeted check run
            assert.match(text, /\*\*Multi-phase run\*\*[^\n]*per phase, run only type-check\/compile plus the phase's targeted check/);
            // And Step 3 and Step 4 run once after the last wave over the whole changeset
            assert.match(text, /Step 3 and Step 4 run ONCE after the last wave, over the whole changeset/);
            assert.match(section(text, 'Step 3: Testing'), /multi-phase run: once, after the last wave, over the whole changeset/);
            assert.match(section(text, 'Step 4: Code Review'), /multi-phase run: once, after Step 3, over the whole changeset/);
            // And the --approval=off flag bullet carries the same batching
            assert.match(text, /`--approval=off` → Step 5[^\n]*after the last phase, run Step 3 and Step 4 once over the whole changeset/);
            // And a one-phase run keeps its per-phase gates
            assert.match(text, /A one-phase run is unchanged\./);
        }
    },
    {
        name: 'TC-PSC-005 plan-review flags test/review sub-phases and unjustified SEQ tags',
        fn: () => {
            // Given plan-review's checklist
            const text = read('plan-review/SKILL.md');
            // Then one checklist line flags both plan-speed defects as findings
            assert.match(text, /- \[ \] \*\*Plan speed\*\* — flag as a finding any per-phase or per-release test, review, or "close" sub-phase[^\n]*any `SEQ` tag without a real data or write-set dependency/);
        }
    }
];

module.exports = { name: 'plan-speed-contract', tests };
