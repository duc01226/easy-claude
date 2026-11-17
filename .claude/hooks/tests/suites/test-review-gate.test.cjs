/**
 * Test Review Gate Test Suite
 *
 * Guards the Test Review capability (docs/specs/WorkflowExecution/README.TestReview.md): every review
 * entry point reaches one test review that owns test-layer routing, maps each changed behavior to its
 * tests per layer, judges test quality and flaky patterns, triangulates spec, tests and code, and hands
 * a pull request its `Test review:` and `Spec sync:` lines.
 *
 * Coverage:
 *   TC-TRV-001 — one routing owner: every review entry point reaches test-review; none dispatches a layer review itself.
 *   TC-TRV-002 — changes-review calls it on every pass; deferral lands on the `tests-review` gate in every workflow mode.
 *   TC-TRV-003 — each of the five layers has an existing owner with a static review mode, e2e-test --mode=review included.
 *   TC-TRV-004 — the shared gate owns the per-behavior, per-layer coverage matrix and is registered under its size cap.
 *   TC-TRV-005 — a covering test names the break it must catch; one that survives it is a weak test.
 *   TC-TRV-006 — the flaky-pattern catalogue fixes each pattern at its cause and refuses masking fixes.
 *   TC-TRV-007 — test review is static; each review-workflow mode has exactly one test-execution owner.
 *   TC-TRV-008 — pull-request and pr-review record the `Test review:` and `Spec sync:` lines.
 *   TC-TRV-009 — harness setup and the greenfield route wire the test review in as the per-change test sensor.
 *   TC-TRV-010 — this repository's project overlay for test-review is registered and additive.
 *   TC-TRV-011 — the routing reminder names test-review, and its skill map links every test skill that exists.
 *
 * Portability: every row asserts this framework repository's own skills, registry and project overlay and is
 * skipped in any other project (framework-repo signal). Paths use node:path; text is read with LF line endings.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : "asserts the framework repo's own review and test skills (framework-repo signal)";

const CLAUDE = path.join(REPO_ROOT, '.claude');
const SKILLS = path.join(CLAUDE, 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = name => read(SKILLS, name, 'SKILL.md');
const hub = () => skill('test-review');
const registry = () => JSON.parse(read(CLAUDE, 'workflows.json'));
const reviewManifests = () => resolveAllWorkflowManifests(registry(), 'workflow-review-changes', { rootDir: REPO_ROOT });

/** The text of one `## Heading` section, up to the next `## ` heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}\n`);
    assert.ok(start >= 0, `section "## ${heading}" exists`);
    const end = text.indexOf('\n## ', start + 4);
    return text.slice(start, end < 0 ? text.length : end);
}

/** Rows of the first Markdown table in a text, as arrays of trimmed cells (header and divider dropped). */
function tableRows(text) {
    const lines = text.split('\n').filter(line => line.startsWith('|'));
    return lines.slice(2).map(line =>
        line
            .split(/(?<!\\)\|/)
            .slice(1, -1)
            .map(cell => cell.trim())
    );
}

// No `g` flag: a global regex keeps `lastIndex` between `.test()` calls and would skip lines. The prefix class
// catches `/name`, `$name` (Codex), a backtick or a bare word, so dropping the slash cannot hide a dispatch.
const LAYER_SKILLS = ['integration-test', 'e2e-test', 'performance-test', 'seed-test-data'];
const LAYER_REVIEW = /(?:^|[\s`/$(])(?:integration-test|e2e-test|performance-test|seed-test-data) --mode=review/;
// Every file a review entry point reads: its SKILL.md and its references.
const ENTRY_POINTS = ['changes-review', 'workflow-review-changes', 'pr-review', 'pull-request', 'commit-review'];
function entryPointFiles() {
    const files = [];
    for (const name of ENTRY_POINTS) {
        files.push(path.join(SKILLS, name, 'SKILL.md'));
        const refs = path.join(SKILLS, name, 'references');
        if (fs.existsSync(refs)) for (const file of fs.readdirSync(refs).sort()) if (file.endsWith('.md')) files.push(path.join(refs, file));
    }
    return files;
}

const tests = [
    {
        name: 'TC-TRV-001 every review entry point reaches the one test review, and none routes a test layer itself',
        skip: SKIP,
        fn: () => {
            // Given the hub's routing table, the single owner of test-layer routing
            const rows = tableRows(section(hub(), 'Step 3 — Layer reviews'));
            assert.deepEqual(
                rows.map(row => row[0]),
                ['Unit', 'Integration', 'E2E', 'Performance', 'Seed data'],
                'one row per test layer'
            );
            // When each review entry point is read
            const changes = skill('changes-review');
            assert.match(changes, /\*\*Test review \(mandatory skill call\):\*\* always invoke `\/test-review`/);
            assert.match(skill('pr-review'), /Run `\/test-review` over the whole branch/);
            assert.match(skill('pull-request'), /That review runs `\/test-review` on the whole branch in every round/);
            assert.match(skill('commit-review'), /Apply `test-review`'s gate at commit scale/);
            for (const manifest of reviewManifests()) {
                assert.ok(
                    manifest.occurrences.some(step => step.skill === 'test-review'),
                    `workflow-review-changes ${manifest.mode} runs test-review`
                );
            }
            // Then no entry-point file names a layer review mode: only the hub's routing table does
            for (const file of entryPointFiles()) {
                const offenders = read(file)
                    .split('\n')
                    .filter(line => LAYER_REVIEW.test(line));
                assert.deepEqual(offenders, [], `${path.relative(REPO_ROOT, file)} routes test layers only through test-review`);
            }
            assert.doesNotMatch(changes, /Performance-test quality \(conditional task\)/, 'the old per-layer task is gone');
            // And no review-workflow mode dispatches a layer review as its own step
            for (const manifest of reviewManifests()) {
                const direct = manifest.occurrences.filter(step => LAYER_SKILLS.includes(step.skill) && /--mode=review/.test(step.args || ''));
                assert.deepEqual(
                    direct.map(step => step.id),
                    [],
                    `${manifest.mode}: layer reviews run only through tests-review`
                );
            }
        }
    },
    {
        name: 'TC-TRV-002 changes-review runs the test review on every pass, and a deferral lands on a gate step in every mode',
        skip: SKIP,
        fn: () => {
            // Given the standalone review
            const changes = skill('changes-review');
            assert.match(changes, /in every review and re-review pass/);
            assert.match(changes, /including documentation-only and zero-finding passes, where it records `N\/A — no testable change`/);
            assert.match(changes, /`--defer=tests` may hand the call only to a named caller step that runs it as a gate/);
            assert.match(hub(), /record `N\/A — no testable change` with the inspected paths/);
            // When the review workflow defers the tests duty in each mode
            for (const manifest of reviewManifests()) {
                const first = manifest.occurrences.find(step => step.id === 'initial-changes-review');
                assert.match(first.args, /--defer=[^ ]*\btests\b/, `${manifest.mode}: changes-review defers its tests duty`);
                // Then the duty lands on the tests-review gate
                const gate = manifest.occurrences.find(step => step.id === 'tests-review');
                assert.ok(gate, `${manifest.mode}: the tests-review step exists`);
                assert.equal(gate.skill, 'test-review');
                assert.equal(gate.role, 'gate', `${manifest.mode}: tests-review can never be skipped`);
            }
            // And the caller-mode reference names the gate as the owner of the deferred duty
            assert.match(read(SKILLS, 'workflow-review-changes', 'references', 'caller-mode.md'), /\| `tests` \| The `tests-review` gate \(`\/test-review`\)/);
        }
    },
    {
        name: 'TC-TRV-003 each test layer routes to an existing owner that has a static review mode',
        skip: SKIP,
        fn: () => {
            const rows = new Map(tableRows(section(hub(), 'Step 3 — Layer reviews')).map(row => [row[0], row]));
            // Given the unit row, owned by the hub's own gates
            assert.match(rows.get('Unit')[2], /references\/unit-test-review\.md/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'test-review', 'references', 'unit-test-review.md')));
            // When each other row is followed to its owner
            const owners = { Integration: 'integration-test', E2E: 'e2e-test', Performance: 'performance-test', 'Seed data': 'seed-test-data' };
            for (const [layer, owner] of Object.entries(owners)) {
                const cell = rows.get(layer)[2];
                assert.match(cell, new RegExp(`\\/${owner} --mode=review`), `${layer} routes to ${owner} --mode=review`);
                assert.match(cell, new RegExp(`\\.\\./${owner}/SKILL\\.md`), `${layer} links its owner`);
                // Then the owner exists and declares its review mode
                assert.match(skill(owner), /--mode=review/, `${owner} declares --mode=review`);
            }
            // And the E2E review mode is static: it routes first, reads the shared protocol and never runs the runner
            const e2e = skill('e2e-test');
            assert.match(e2e, /explicit `--mode=review` selects the static test-quality review/);
            assert.match(e2e, /\*\*\[BLOCKING\]\*\* When `--mode=review`, read `references\/mode-review\.md` in full FIRST/);
            const e2eReview = read(SKILLS, 'e2e-test', 'references', 'mode-review.md');
            assert.match(e2eReview, /never starts the application, never runs the E2E runner and never edits/);
            assert.match(e2eReview, /`\.claude\/skills\/shared\/e2e-quality-protocol\.md`/);
            assert.match(read(SKILLS, 'shared', 'e2e-quality-protocol.md'), /\| `e2e-test --mode=review` \| Static, read-only test-quality review/);
            // And a layer that applies but cannot be judged is never a pass
            assert.match(hub(), /A layer that applies but cannot be judged is `UNVERIFIED` or `ENVIRONMENT-BLOCKED`, never PASS/);
        }
    },
    {
        name: 'TC-TRV-004 the shared gate owns the per-behavior coverage matrix and stays registered under its size cap',
        skip: SKIP,
        fn: () => {
            // Given the projected shared protocol and its registration
            const gate = read(SKILLS, 'shared', 'protocols', 'test-review-gate.md');
            const index = JSON.parse(read(SKILLS, 'shared', 'protocols', 'index.json'));
            const entry = index.tags.find(tag => tag.tag === 'test-review-gate');
            assert.ok(entry, 'the tag is projected');
            assert.equal(entry.group, 'spec-test');
            assert.ok(entry.chars <= 9000, `the gate body is ${entry.chars} chars, over the 9,000 cap`);
            // Then it states the coverage matrix per changed behavior and layer
            assert.match(gate, /\*\*Coverage matrix per changed behavior\.\*\*/);
            assert.match(gate, /or to a named `TEST-GAP` with reason and owner/);
            assert.match(gate, /A bug fix names its regression test/);
            assert.match(gate, /Line coverage is a diagnostic, never proof/);
            // And the hub writes one row per behavior with a cell per layer
            assert.match(hub(), /`behavior \| source \(file:line \/ AC \/ BR \/ TC\) \| unit \| integration \| E2E \| performance \| seed \| verdict`/);
        }
    },
    {
        name: 'TC-TRV-005 a covering test names the break it must catch, and one that survives it is a weak test',
        skip: SKIP,
        fn: () => {
            const unit = read(SKILLS, 'test-review', 'references', 'unit-test-review.md');
            // Given the unit gates
            const gates = unit.match(/^## U\d — /gm) || [];
            assert.deepEqual(
                gates.map(heading => heading.slice(3, 5)),
                ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8']
            );
            // Then the assertion-value gate names the break and the weak-test verdict
            assert.match(unit, /Name the break \(mutant\) the test must catch[^\n]*If the test would still pass, it is `WEAK-TEST`/);
            assert.match(unit, /Each \[HARD\] rule the unit enforces is tested as a property/);
            // And the shared gate refuses padding as coverage
            const gate = read(SKILLS, 'shared', 'protocols', 'test-review-gate.md');
            assert.match(gate, /a test that would survive it is `WEAK-TEST`/);
            assert.match(gate, /Assertion-free, duplicate or padding tests do not count/);
        }
    },
    {
        name: 'TC-TRV-006 every flaky pattern is fixed at its cause, and masking fixes are refused',
        skip: SKIP,
        fn: () => {
            const catalogue = read(SKILLS, 'test-review', 'references', 'flaky-test-patterns.md');
            assert.match(catalogue, /A retry around an assertion, a skip, a widened timeout or a weakened assertion is never an accepted fix/);
            assert.match(catalogue, /"Flaky" is a symptom, never a verdict/);
            // Severity scope (user decision 2026-11-17): blocking where the change relies on the test, advisory elsewhere
            const gate = read(SKILLS, 'shared', 'protocols', 'test-review-gate.md');
            assert.match(
                gate,
                /It blocks \(HIGH\) in a new or changed test and in an unchanged test that is the only proof of a changed behavior; in any other pre-existing test it is an observation with an owner/
            );
            assert.match(catalogue, /It blocks in a new or changed test and in an unchanged test that is the only proof of a changed behavior/);
            // The commit-scale check keeps the flaky rule for new tests
            assert.match(skill('commit-review'), /no new test relies on sleeps, real time, randomness or test order/);
            const rows = tableRows(catalogue);
            const patterns = rows.map(row => row[0]);
            // Given the patterns every review must check
            for (const required of [
                'Fixed sleep used for readiness',
                'Wall clock, timezone or DST',
                'Unseeded randomness',
                'Real network or external service',
                'Order dependence',
                'Shared mutable state',
                'Parallel collisions',
                'Unawaited asynchronous work',
                'Unbounded wait or poll',
                'Retry around an assertion'
            ]) {
                assert.ok(patterns.includes(required), `the catalogue covers "${required}"`);
            }
            // Then no fix column offers a mask
            // Only two phrasings may name a retry or a timeout: removing the retry, and a bounded wait that reports
            const ALLOWED = [/\bRemove the retry\b/g, /\bBound it with a timeout that reports what never happened\b/g];
            for (const [pattern, , fix] of rows) {
                const rest = ALLOWED.reduce((text, allowed) => text.replace(allowed, ''), fix);
                assert.doesNotMatch(rest, /retr(?:y|ies|ied)|re-?run|timeout|\bskip|quarantin|\bignore/i, `"${pattern}" is fixed at its cause`);
            }
            // No review text restates a blanket "flaky patterns are HIGH": the scope lives in the gate's items 6 and 9
            for (const file of [
                path.join(SKILLS, 'test-review', 'SKILL.md'),
                path.join(SKILLS, 'test-review', 'references', 'flaky-test-patterns.md'),
                path.join(SKILLS, 'e2e-test', 'references', 'mode-review.md')
            ]) {
                assert.doesNotMatch(read(file), /flaky patterns? (?:is|are) HIGH/i, `${path.relative(REPO_ROOT, file)} keeps the blocking scope`);
            }
        }
    },
    {
        name: 'TC-TRV-007 test review is static, and each review-workflow mode has exactly one test-execution owner',
        skip: SKIP,
        fn: () => {
            assert.match(hub(), /MUST ATTENTION static only: it reads tests and never runs a suite/);
            // With --prove-tests it owns the one run even when the project has no integration layer
            assert.match(
                hub(),
                /then run `\/test --proven=<that owner's report>` for every other applicable layer; when it does not, run `\/test` for the applicable layers/
            );
            assert.match(hub(), /with no applicable layer record `tests-pass: N\/A — <evidence>`/);
            for (const manifest of reviewManifests()) {
                // Given every occurrence that can run the suites in this mode
                const runners = manifest.occurrences.filter(
                    step => (step.skill === 'integration-test' && /--mode=verify/.test(step.args || '')) || /--prove-tests/.test(step.args || '')
                );
                // Then exactly one step owns execution
                assert.equal(runners.length, 1, `${manifest.mode}: one test-execution owner`);
                if (manifest.mode === 'fix-loop') assert.equal(runners[0].id, 'verify-settled-tests');
                else {
                    assert.equal(runners[0].id, 'tests-review', 'review-only proves through the test review');
                    const gate = manifest.outcomeGates.find(item => item.id === 'tests-pass');
                    assert.deepEqual(gate.satisfiedBy, ['test-review --prove-tests']);
                }
            }
        }
    },
    {
        name: 'TC-TRV-008 a pull request records the test review verdict and the spec sync result',
        skip: SKIP,
        fn: () => {
            const pr = skill('pull-request');
            // Given the PR body rule
            assert.match(
                pr,
                /the `Test review:` line \(verdict per test layer, gaps with their owners\) and the `Spec sync:` line from the final review round/
            );
            assert.match(pr, /keep the final round's `Test review:` and `Spec sync:` lines for the PR body/);
            assert.match(pr, /an open test gap or spec drift blocks Ready unless the user accepted it with an owner/);
            // And the final branch review reports both
            const review = skill('pr-review');
            assert.match(review, /spec ↔ tests ↔ code drift it reports is a finding/);
            assert.match(review, /the `Test review:` and `Spec sync:` lines/);
            // And the hub defines the lines, including the no-behavior-change case
            const hubText = hub();
            assert.match(hubText, /`Spec sync: N\/A — no behavior change`/);
            assert.match(hubText, /`Test review: <verdict> — unit <covered>\/<behaviors>/);
        }
    },
    {
        name: 'TC-TRV-009 harness setup and the greenfield route wire the test review in as the per-change test sensor',
        skip: SKIP,
        fn: () => {
            const harness = skill('harness-setup');
            assert.match(harness, /\*\*Every change and pull request \(mandatory\):\*\* `\/test-review` is the per-change test sensor/);
            assert.match(harness, /a project with no test layer yet still records it/);
            assert.match(
                read(SKILLS, 'harness-setup', 'references', 'harness-inventory.md'),
                /^\| Every change \+ PR\s*\| \/test-review \(through the required change review\)/m
            );
            const greenfield = skill('workflow-greenfield-init');
            assert.match(greenfield, /\*\*Test review gate \(before the hand-off\)\*\* — the foundation's own tests pass `\/test-review`/);
            assert.match(greenfield, /records `\/test-review` as the per-change test sensor every later change and pull request runs/);
        }
    },
    {
        name: 'TC-TRV-010 the project overlay for test-review is registered, matches its body and only adds rules',
        skip: SKIP,
        fn: () => {
            const index = read(REPO_ROOT, 'docs', 'project-reference', 'skill-protocols-reference.md');
            const cells = index
                .split('\n')
                .filter(line => line.startsWith('|'))
                .map(line =>
                    line
                        .split('|')
                        .slice(1, -1)
                        .map(cell => cell.trim())
                );
            const row = cells.find(cell => cell[0] === 'test-review' && cell[2] === 'test-review-framework-tests');
            assert.ok(row, 'the registry row targets test-review');
            assert.equal(row[1], 'exact');
            const body = read(REPO_ROOT, 'docs', 'project-protocols', 'test-review-framework-tests.md');
            const description = /^description: (.*)$/m.exec(body);
            assert.ok(description, 'the body has a description');
            assert.equal(row[3], description[1], 'the row copies the body description verbatim');
            assert.match(body, /^target: test-review$/m);
            assert.ok(Buffer.byteLength(body) <= 4096, 'body soft cap 4 KB');
            // Then its rules add constraints and never relax a framework rule
            const rules = section(body, 'Rules');
            assert.doesNotMatch(rules, /\b(?:ignore|skip|relax|waive|bypass)\b[^.\n]*\b(?:rule|gate|review|test)s?\b/i);
        }
    },
    {
        name: 'TC-TRV-011 the routing reminder names test-review, and its skill map links every test skill that exists',
        skip: SKIP,
        fn: () => {
            // Given the delivered routing protocol and its reminder
            const canonical = read(SKILLS, 'shared', 'sync-inline-versions.md');
            assert.match(canonical, /- \*\*Tests:\*\* `test-review` reviews the tests of a change/);
            assert.match(canonical, /tests → `test-review` \(coverage and quality of a change's tests\), `test`/);
            // Load the hook itself: a fallback that no longer parses fails here, not only in its own suite
            const { FALLBACK_BODY } = require(path.join(CLAUDE, 'hooks', 'quality-skill-remind.cjs'));
            assert.match(FALLBACK_BODY, /tests → `test-review` \(coverage and quality of a change's tests\)/);
            // The hub keeps the description form and length every skill description follows
            const description = /^description: '([^']*)'$/m.exec(hub());
            assert.ok(description && description[1].startsWith('[Testing] Use when'), 'step-skill description form');
            assert.ok(description[1].length <= 250, `description is ${description[1].length} chars, over 250`);
            // When the hub's skill map is followed
            const map = section(hub(), 'Test skill map');
            const links = [...map.matchAll(/\]\((\.\.\/[^)]+)\)/g)].map(match => match[1]);
            assert.ok(links.length >= 25, `the map links the test skills (${links.length})`);
            for (const link of links) {
                // Then every link resolves to a real skill or agent definition
                assert.ok(fs.existsSync(path.join(SKILLS, 'test-review', link)), `${link} resolves`);
            }
            // And every [Testing] skill is on the map, so a new test skill cannot be left out
            for (const name of fs.readdirSync(SKILLS)) {
                const file = path.join(SKILLS, name, 'SKILL.md');
                if (name === 'test-review' || !fs.existsSync(file)) continue;
                if (/^description: '\[Testing\]/m.test(read(file))) {
                    assert.ok(links.includes(`../${name}/SKILL.md`), `the map links the [Testing] skill ${name}`);
                }
            }
        }
    }
];

module.exports = { name: 'test-review-gate', tests };
