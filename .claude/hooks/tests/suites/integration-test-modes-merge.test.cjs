/**
 * Integration-Test Modes Merge Test Suite
 *
 * The integration-test skill owns three roles: default test generation/authoring, `--mode=review` (one
 * evidence-backed, read-only review pass over tests, source and governing specs) and `--mode=verify`
 * (prove reviewed tests pass with real runner evidence; `--fix-loop` converges failures). Each merged
 * mode body lives in `integration-test/references/mode-<x>.md` (the loop in `references/fix-loop.md`);
 * `integration-test/SKILL.md` detects the mode first and carries a BLOCKING "read the mode file in full
 * FIRST" line, so default generation never loads a mode body. The two modes have no skill folder of
 * their own.
 *
 * Coverage:
 *   TC-ITM-001 — mode detection sits at the top; both modes have a BLOCKING read line and an existing reference.
 *   TC-ITM-002 — default generation text stays free of the review and verify mode bodies.
 *   TC-ITM-003 — the review mode keeps the one-round cap, read-only boundary, eight gates, verdicts and flags.
 *   TC-ITM-004 — the verify mode keeps the precondition gate, repeat policy, flake adjudication, the
 *                --fix-loop pointer and the G1 Next-Steps nested=true rule.
 *   TC-ITM-005 — the old skill folders stay deleted and no workflow step or id references them.
 *   TC-ITM-006 — every workflow occurrence of integration-test passes a mode the skill supports, and every
 *                outcome gate satisfied by it names the mode.
 *   TC-ITM-007 — a gate satisfied by "integration-test --mode=verify" needs that invocation, not any
 *                integration-test step (fixture workflows; portable).
 *   TC-ITM-008 — mode-only protocols live as inline bodies in the mode references, never as guide lines in
 *                integration-test/SKILL.md; the AI floor is one conditional pointer, never a guide line.
 *   TC-ITM-009 — no live source names the removed skills (allow-list: the "formerly" lines and the review
 *                report filename prefix).
 *   TC-ITM-010 — the description keeps the step-skill form and advertises both modes.
 *   TC-ITM-011 — the review workflow's test-prover step and the why-review recursion guard name the review mode.
 *   TC-ITM-012 — the shared verify-convergence-loop contract names the merged verify modes once for both tiers.
 *
 * Portability: TC-ITM-007 runs on in-memory fixture registries. Every other row asserts this framework
 * repository's own skills and registry and is skipped in any other project (framework-repo signal). Paths
 * use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own integration-test skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = () => read(SKILLS, 'integration-test', 'SKILL.md');
const modeReview = () => read(SKILLS, 'integration-test', 'references', 'mode-review.md');
const modeVerify = () => read(SKILLS, 'integration-test', 'references', 'mode-verify.md');
const fixLoop = () => read(SKILLS, 'integration-test', 'references', 'fix-loop.md');

// The removed skill names, assembled so this file never contains the literal token it guards against.
const REMOVED = ['integration-test' + '-review', 'integration-test' + '-verify'];

/** Tags of the guide lines inside the PROTOCOL-GUIDES block(s) of `text`, in order. */
function guideTags(text) {
    const tags = [];
    for (const block of text.matchAll(/<!-- PROTOCOL-GUIDES:START -->([\s\S]*?)<!-- PROTOCOL-GUIDES:END -->/g)) {
        for (const line of block[1].split('\n')) {
            const match = /^- `([a-z0-9-]+)` — /.exec(line);
            if (match) tags.push(match[1]);
        }
    }
    return tags;
}

const fixtureDocument = (entry) => ({ version: '1', workflows: { fixture: entry } });
const resolveFixture = (entry) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['integration-test', 'spec'] });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/integration-test-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

/** A line that names a removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (rel === '.claude/skills/integration-test/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/integration-test/references/mode-review.md' && line.includes('tmp/reports/' + REMOVED[0] + '-{YYMMDD}')) return true;
    return false;
}

const occurrencesOf = (document, name) => {
    const found = [];
    for (const id of Object.keys(document.workflows)) {
        for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
            for (const occurrence of manifest.occurrences) if (occurrence.skill === name) found.push({ workflow: id, mode: manifest.mode, occurrence });
        }
    }
    return found;
};

const tests = [
    {
        name: 'TC-ITM-001 integration-test keeps the review and verify modes, each with a BLOCKING read-first line and its reference file',
        skip: SKIP,
        fn: () => {
            const text = skill();
            // Mode detection comes before the first content section
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            assert.match(text, /## Mode Dispatch/);
            // Each merged mode has a mandatory full-read line naming an existing reference
            for (const mode of ['review', 'verify']) {
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`), `mandatory read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'integration-test', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            assert.ok(fs.existsSync(path.join(SKILLS, 'integration-test', 'references', 'fix-loop.md')), 'references/fix-loop.md exists');
            assert.match(text, /read `references\/fix-loop\.md` in full before any loop work/);
            // The removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
            // The existing positional branches keep their place (default behavior unchanged)
            assert.match(text, /# REVIEW Mode — Test Quality Audit/);
            assert.match(text, /# VERIFY-TRACEABILITY Mode/);
        }
    },
    {
        name: 'TC-ITM-002 default generation text does not carry the review or verify mode bodies',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const reviewOnly = ['`round = 1`, `maxRounds = 1`', '## One-Round Contract', '## Single Review Pass — Eight Gates', '### 1. Assertion value', 'Finding Validation and Verdict'];
            const verifyOnly = ['## Step 1: Read Project Config + Reference Docs', '### Step 1b: Harvest the Environment Precondition Checklist', '## Fallback Mode (No Project Config)', '## On Test Failure Protocol', 'Intermittent (flaky) failure adjudication', '### Step 3b: Test Architecture Contract Scope'];
            const loopOnly = ['FL-0 — Resolve Verification Scope + Goal Contract', 'FL-1 — Round Loop'];
            for (const marker of [...reviewOnly, ...verifyOnly, ...loopOnly]) assert.ok(!text.includes(marker), `integration-test/SKILL.md must not inline mode text: ${marker}`);
            for (const marker of reviewOnly) assert.ok(modeReview().includes(marker), `mode-review.md holds ${marker}`);
            for (const marker of verifyOnly) assert.ok(modeVerify().includes(marker), `mode-verify.md holds ${marker}`);
            for (const marker of loopOnly) assert.ok(fixLoop().includes(marker), `fix-loop.md holds ${marker}`);
            // Default generation still runs its own contract
            assert.match(text, /# Integration Test Generation/);
            assert.match(text, /## Step 3: Generate Test File/);
            assert.match(text, /Verify-last exception/);
            // Every bullet starts its own line: a closing-reminder bullet never trails on the previous bullet's line (merged-bullet rendering glitch)
            const merged = text.split('\n').filter((line) => /\S.*[^\s`]- \*\*MANDATORY IMPORTANT MUST ATTENTION\*\*/.test(line));
            assert.deepEqual(merged, [], 'a "- **MANDATORY IMPORTANT MUST ATTENTION**" bullet is glued to the previous bullet');
        }
    },
    {
        name: 'TC-ITM-003 --mode=review keeps the one-round cap, read-only boundary, eight gates, verdict set and execution flags',
        skip: SKIP,
        fn: () => {
            const text = modeReview();
            assert.match(text, /`round = 1`, `maxRounds = 1`, `minRounds = 1`/);
            assert.match(text, /\*\*ONE ROUND MAXIMUM per invocation\.\*\*/);
            assert.match(text, /Never fix tests\/source or re-review inside this skill/);
            assert.match(text, /another pass requires a new explicit invocation/i);
            assert.match(text, /Read-only on source, tests, specs, and config\. Write only the review report under `tmp\/reports\/`/);
            assert.match(text, /Never weaken assertions, add skips, widen timeouts, or rewrite source\/tests to force green/);
            // Eight gates
            for (const gate of ['1. Assertion value', '2. Owned outcome', '3. Repeatability and isolation', '4. Behavior ownership', '5. Spec/case traceability', '6. Spec ↔ tests ↔ code consistency', '7. Change coverage', '8. Real-world fidelity']) {
                assert.ok(text.includes(`### ${gate}`), `gate ${gate}`);
            }
            // Flags and execution evidence
            assert.match(text, /`--report-only`: do not run tests/);
            assert.match(text, /`--prove-tests`: run the configured relevant suite once/);
            // Verdicts and the terminal validation route that cannot open another round
            for (const verdict of ['PASS', 'PASS_WITH_NOTES', 'CHANGES_REQUESTED', 'BLOCKED']) assert.ok(text.includes(`\`${verdict}\``), `verdict ${verdict}`);
            assert.match(text, /\/why-review --validate-findings <report-path>/);
            assert.match(text, /terminal validation is part of round 1 and never opens another review round/);
            // No convergence loop and no second review round
            assert.doesNotMatch(text, /SYNC:double-round-trip-review|OVERRIDE:double-round-trip-review|extendable ONCE|fresh full re-review/i);
            // The AI-surface lens stays inside the single pass
            assert.match(text, /### Conditional AI-surface lens/);
            // And the parent skill states the cap at the point of dispatch
            assert.match(skill(), /its one-round cap and read-only rules govern/);
        }
    },
    {
        name: 'TC-ITM-004 --mode=verify keeps the precondition gate, repeat policy, flake rule, --fix-loop pointer and the nested=true Next-Steps rule',
        skip: SKIP,
        fn: () => {
            const text = modeVerify();
            // Contract first, preconditions settled before any test command
            assert.match(text, /### Step 1b: Harvest the Environment Precondition Checklist \(BLOCKING — before any command\)/);
            assert.match(text, /### Precondition gate \(BLOCKING — every harvested item, evidence-backed\)/);
            assert.match(text, /Any `UNMET` → STOP before the first test command/);
            for (let step = 1; step <= 5; step += 1) assert.match(text, new RegExp(`\\n## Step ${step}: `), `Step ${step} exists`);
            // Repeat policy and runner evidence
            assert.match(text, /two fresh successful runs for each relevant persistent\/shared-state suite/);
            assert.match(text, /Always report exact failure counts and names/);
            assert.match(text, /RECOMMEND `\/workflow-integration-test --mode=green` whenever this run ends with ANY failure/);
            // Flake adjudication points at the shared owner
            assert.match(text, /MUST ATTENTION READ `\.claude\/skills\/shared\/verify-convergence-loop\.md` § 1 whenever a required test is red in one run and green in another/);
            // --fix-loop is optional and loads its reference first
            assert.match(text, /## Mode: `--fix-loop` — Read `references\/fix-loop\.md` First \(BLOCKING\)/);
            assert.match(text, /When the flag is present, read `references\/fix-loop\.md` in full FIRST \(BLOCKING\)/);
            assert.match(text, /a sub-agent that receives `--fix-loop` refuses the flag and runs the default pass/);
            // Next Steps: skipped only for THIS run's own nested phase tasks, never an ambient [Workflow] row
            for (const [label, body] of [['mode-verify', text], ['SKILL', skill()]]) {
                const line = body.split('\n').find(l => l.includes('**Inside a workflow**'));
                assert.ok(line, `${label} keeps its Inside-a-workflow line`);
                assert.match(line, /THIS run is a step of a `\[Workflow\]` row: its own phase tasks are linked to that parent row, `nested=true`/, `${label} conditions the skip on nested=true`);
                assert.match(line, /abandoned one, does not count/, `${label} says an abandoned row does not count`);
                assert.match(line, /\*\*Otherwise \(standalone, or only an unrelated `\[Workflow\]` row exists\):\*\*/, `${label} asks when only an unrelated row exists`);
            }
            // The loop reference keeps its own gates
            const loop = fixLoop();
            assert.match(loop, /<!-- FIX-LOOP-MODE:START -->/);
            assert.match(loop, /<!-- FIX-LOOP-MODE:END -->/);
            assert.match(loop, /Round Integrity Check \(no fake green\) — BLOCKING/);
            assert.match(loop, /NEVER self-invoke with the flag/);
            assert.match(loop, /verify-convergence-loop\.md` — read it before round 1/);
        }
    },
    {
        name: 'TC-ITM-005 the removed skill folders stay deleted and no workflow step or id references them',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill: name } of manifest.occurrences) skills.add(name);
                }
            }
            for (const name of REMOVED) assert.ok(!skills.has(name), `no resolved workflow step runs ${name}`);
            assert.ok(skills.has('integration-test'), 'tripwire: the registry still runs the integration-test skill');
        }
    },
    {
        name: 'TC-ITM-006 every workflow occurrence of integration-test passes a mode the skill supports; gates satisfied by it name the mode',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = skill();
            const counts = { review: 0, verify: 0 };
            for (const { workflow, mode, occurrence } of occurrencesOf(document, 'integration-test')) {
                const args = occurrence.args.trim();
                if (!args) continue;
                const match = /^--mode=(review|verify)(?: (?:--report-only|--prove-tests|--fix-loop))*$/.exec(args);
                assert.ok(match, `${workflow}/${mode}/${occurrence.id}: unsupported integration-test arguments "${args}"`);
                assert.ok(dispatch.includes(`\`--mode=${match[1]}`), `${workflow}/${occurrence.id}: integration-test has no --mode=${match[1]}`);
                counts[match[1]] += 1;
            }
            assert.ok(counts.review >= 3, `tripwire: the registry runs the review mode as a step (${counts.review})`);
            assert.ok(counts.verify >= 8, `tripwire: the registry runs the verify mode as a step (${counts.verify})`);
            // A gate satisfied by the integration-test skill must name the mode: a bare name would be satisfied by the generation step
            for (const [id, workflow] of Object.entries(document.workflows)) {
                const gates = [...(workflow.outcomeGates || []), ...Object.values(workflow.variants || {}).flatMap(variant => variant.outcomeGates || [])];
                for (const gate of gates) {
                    for (const satisfier of gate.satisfiedBy) {
                        if (satisfier === 'integration-test') assert.fail(`${id}/${gate.id}: a bare "integration-test" satisfier is satisfied by test generation`);
                    }
                }
            }
            const gateOf = (workflowId, gateId) => document.workflows[workflowId].outcomeGates.find(gate => gate.id === gateId);
            assert.ok(gateOf('workflow-bugfix', 'tests-pass').satisfiedBy.includes('integration-test --mode=verify'));
            assert.ok(gateOf('workflow-review-changes', 'tests-pass').satisfiedBy.includes('integration-test --mode=review'));
            const integrationTestWorkflow = document.workflows['workflow-integration-test'];
            assert.ok(integrationTestWorkflow.variants.write.outcomeGates.find(gate => gate.id === 'review-converged').satisfiedBy.includes('integration-test --mode=review'));
            assert.ok(gateOf('workflow-integration-test', 'tests-pass').satisfiedBy.includes('integration-test --mode=verify'));
        }
    },
    {
        name: 'TC-ITM-007 a gate satisfied by "integration-test --mode=verify" needs that invocation, not any integration-test step',
        fn: () => {
            const gate = args => [{ id: 'tests-pass', satisfiedBy: [args] }];
            const generate = { id: 'g', skill: 'integration-test' };
            const verify = { id: 'v', skill: 'integration-test', args: '--mode=verify --fix-loop' };
            // Given a sequence with a verify step, the gate resolves
            const ok = resolveFixture({ sequence: [generate, verify], outcomeGates: gate('integration-test --mode=verify') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['integration-test --mode=verify']);
            // And a workflow with only generation steps cannot prove the gate
            assert.throws(() => resolveFixture({ sequence: [generate], outcomeGates: gate('integration-test --mode=verify') }), /names a skill not in the sequence/);
            // And the review mode does not satisfy the verify gate
            assert.throws(() => resolveFixture({ sequence: [generate, { id: 'r', skill: 'integration-test', args: '--mode=review' }], outcomeGates: gate('integration-test --mode=verify') }), /names a skill not in the sequence/);
        }
    },
    {
        name: 'TC-ITM-008 mode-only protocols live as inline bodies in the mode references, never as guide lines in integration-test/SKILL.md',
        skip: SKIP,
        fn: () => {
            const skillText = skill();
            const skillTags = guideTags(skillText);
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const reviewOnly = ['category-review-thinking', 'severity-rubric', 'evidence-based-reasoning'];
            const verifyOnly = ['environment-fault-hypothesis', 'goal-contract-satisfaction-loop', 'trade-off-interrogation-gate'];
            for (const [label, text, tags] of [['mode-review', modeReview(), reviewOnly], ['mode-verify', modeVerify(), verifyOnly]]) {
                for (const tag of tags) {
                    assert.ok(bodyOf(text, tag), `${label} carries the full ${tag} body`);
                    assert.ok(!skillTags.includes(tag), `integration-test/SKILL.md must not carry a guide for ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `${label} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `${label} carries no retired pointer line`);
                // Fences stay balanced (bodies and reminders)
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `${label} fences balanced`);
            }
            // The AI floor is one conditional pointer in the review reference, never a guide line or body
            assert.match(modeReview(), /\*\*AI surface\?\*\* Only if the tested path calls a model[^\n]*\.claude\/skills\/shared\/protocols\/ai-engineering-gate\.md[^\n]*otherwise skip this line/);
            assert.ok(!modeReview().includes('SYNC:ai-engineering-gate') && !skillTags.includes('ai-engineering-gate'), 'default generation pays nothing for the AI floor guide');
            // And the skill keeps the protocols test generation shares with the modes
            for (const tag of ['integration-test-execution-discipline', 'test-failure-fault-adjudication', 'test-architecture-execution-contract', 'verify-last-order', 'nested-task-creation', 'real-world-fidelity-testing', 'repeatable-test-principle']) {
                assert.ok(skillTags.includes(tag), `integration-test/SKILL.md carries ${tag}`);
            }
            for (const tag of skillTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
            const reminders = text => (text.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length;
            assert.ok(reminders(modeVerify()) >= 4, `tripwire: the verify reminders survive (${reminders(modeVerify())})`);
        }
    },
    {
        name: 'TC-ITM-009 no live source names the removed skills',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            let scanned = 0;
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    scanned += 1;
                    const lines = fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf8').split(/\r?\n/);
                    lines.forEach((line, index) => {
                        if (REMOVED.some(name => line.includes(name)) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `integration-test --mode=review` / `integration-test --mode=verify`');
            const formerly = skill().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(formerly.length >= 1 && formerly.every(line => /former/i.test(line)), 'integration-test/SKILL.md names the removed commands only as "formerly"');
        }
    },
    {
        name: 'TC-ITM-010 the description keeps the step-skill form and advertises both merged modes',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Testing\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=review/);
            assert.match(description, /--mode=verify/);
            assert.match(description, /--fix-loop/);
            assert.match(description, /integration tests/);
        }
    },
    {
        name: 'TC-ITM-011 the review workflow test-prover step and the why-review recursion guard name the review mode',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const review = document.workflows['workflow-review-changes'];
            // The specialist wave runs the review mode as a read-only prover, dispatched with the other specialists
            const prover = review.sequence.find(step => step && step.id === 'integration-tests-review');
            assert.ok(prover, 'the integration-test review specialist step exists');
            assert.equal(prover.skill, 'integration-test');
            assert.equal(prover.args, '--mode=review --report-only --prove-tests');
            assert.equal(prover.role, 'gate');
            assert.ok(review.parallelGroups.some(group => group.members.includes('integration-tests-review')), 'the specialist is a barrier member');
            // why-review: the linkage reads the review mode's gates and keeps its recursion-guard rows
            const linkage = read(SKILLS, 'why-review', 'references', 'full-mode.md');
            assert.match(linkage, /### Integration-Test-Review Linkage/);
            assert.match(linkage, /\| Invoked by `\/integration-test --mode=review` finding validation \|/);
            assert.match(linkage, /Read `\.claude\/skills\/integration-test\/references\/mode-review\.md` §"Single Review Pass — Eight Gates"/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'integration-test', 'references', 'mode-review.md')));
            assert.match(modeReview(), /## Finding Validation and Verdict/);
            for (const rowStart of ['| Mode is `validate-findings` |', '| Invoked by `changes-review` in ANY phase', "| Invoked by `/investigate --mode=debug`'s Root Cause Validation gate |"]) {
                assert.ok(linkage.includes(rowStart), `the recursion guard keeps the row ${rowStart}`);
            }
            // changes-review Phase 3.7 routes the coverage gate to the review mode
            assert.match(read(SKILLS, 'changes-review', 'SKILL.md'), /Phase 3\.7 — test coverage[^\n]*`\/integration-test --mode=review --report-only`/);
        }
    },
    {
        name: 'TC-ITM-012 the shared verify-convergence-loop contract names the merged verify modes',
        skip: SKIP,
        fn: () => {
            const shared = read(SKILLS, 'shared', 'verify-convergence-loop.md');
            assert.match(shared, /`integration-test --mode=verify`/);
            assert.match(shared, /`e2e-test --mode=verify --fix-loop`/);
            for (const name of REMOVED) assert.ok(!shared.includes(name), `the shared contract must not name ${name}`);
            // Both verify tiers still read it where their MUST ATTENTION READ line says to
            // — as a MANDATORY read line (a plain mention would let a reader skip the three-way flake verdict and the round-integrity rules)
            assert.match(modeVerify(), /MUST ATTENTION READ `\.claude\/skills\/shared\/verify-convergence-loop\.md`/);
            assert.match(read(SKILLS, 'e2e-test', 'references', 'mode-verify.md'), /MUST ATTENTION READ `\.claude\/skills\/shared\/verify-convergence-loop\.md`/);
            assert.match(read(SKILLS, 'integration-test', 'references', 'fix-loop.md'), /shared\/verify-convergence-loop\.md` — read it before round 1/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'verify-convergence-loop.md')), 'the shared contract the read lines name exists');
        }
    }
];

module.exports = { name: 'integration-test-modes-merge', tests };
