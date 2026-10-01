/**
 * Plan Modes Merge Test Suite
 *
 * The plan skill owns four roles: default plan creation, `--mode=review` (one evidence-backed
 * review pass of an existing plan), `--mode=validate` (critical-questions interview) and
 * `--mode=execute` (code and test an existing plan), plus the `--mode={ci|cro}` intakes. Each merged
 * mode body lives in `plan/references/mode-<x>.md`; `plan/SKILL.md` detects the mode first and carries
 * a BLOCKING "read the mode file in full FIRST" line, so default plan creation never loads a mode
 * body. The three modes have no skill folder of their own.
 *
 * Coverage:
 *   TC-PMM-001 — plan keeps the three merged modes, each with its mandatory read line and a reference file.
 *   TC-PMM-002 — default plan text stays free of the three mode bodies.
 *   TC-PMM-003 — the review mode keeps the one-round cap, read-only boundary, verdicts and the Goal
 *                Satisfaction matrix.
 *   TC-PMM-004 — the validate mode keeps the mandatory AskUserQuestion interview and the
 *                plan.md-only Validation Summary.
 *   TC-PMM-005 — the old skill directories stay deleted and no workflow step references them.
 *   TC-PMM-006 — every workflow occurrence of `plan` passes a mode the skill supports.
 *   TC-PMM-007 — a gate satisfied by `plan --mode=validate` needs that invocation, not any plan step
 *                (fixture workflows; portable).
 *   TC-PMM-008 — mode-only protocol guides live in the mode reference, never in plan/SKILL.md.
 *   TC-PMM-009 — no live source names the removed skills (allow-list: the "formerly" lines and the
 *                review report filename prefix).
 *   TC-PMM-010 — plan's description keeps the step-skill form and advertises the merged modes.
 *   TC-PMM-011 — the execute mode keeps every flag with its default, the three BLOCKING gates, the
 *                verify-last order and the no-implicit-Git rule.
 *
 * Portability: TC-PMM-007 runs on in-memory fixture registries. Every other row asserts this
 * framework repository's own skills and registry and is skipped in any other project (framework-repo
 * signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own plan skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const planSkill = () => read(SKILLS, 'plan', 'SKILL.md');
const modeReview = () => read(SKILLS, 'plan', 'references', 'mode-review.md');
const modeValidate = () => read(SKILLS, 'plan', 'references', 'mode-validate.md');
const modeExecute = () => read(SKILLS, 'plan', 'references', 'mode-execute.md');

// The removed skill names, assembled so this file never contains the literal token it guards against.
const REMOVED = ['plan' + '-review', 'plan' + '-validate', 'plan' + '-execute'];

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
const resolveFixture = (entry, mode) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['plan', 'spec'], ...(mode ? { mode } : {}) });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/plan-modes-merge.test.cjs'
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
    if (rel === '.claude/skills/plan/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/plan/references/mode-review.md' && line.includes('tmp/reports/' + REMOVED[0] + '-{YYMMDD}')) return true;
    return false;
}

const tests = [
    {
        name: 'TC-PMM-001 plan keeps the review, validate and execute modes, each with a BLOCKING read-first line and its reference file',
        skip: SKIP,
        fn: () => {
            // Given the plan skill
            const text = planSkill();
            // Then mode detection comes before the first content section and lists all four modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const mode of ['review', 'validate', 'execute', 'ci', 'cro']) assert.match(text, new RegExp(`--mode=${mode}`), `--mode=${mode} is documented`);
            // And each of the two merged modes has a mandatory full-read line naming an existing reference
            for (const mode of ['review', 'validate', 'execute']) {
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`), `mandatory read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'plan', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            // And the two intake modes carry their own BLOCKING full-read line naming an existing reference (the table column alone is not a read instruction)
            for (const mode of ['ci', 'cro']) {
                assert.match(text, new RegExp(`when \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`, 'i'), `read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'plan', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            assert.match(text, /\*\*\[BLOCKING\]\*\* When `--mode=ci`, read/, 'the intake read line is BLOCKING');
            // And the removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z-]+`, `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
        }
    },
    {
        name: 'TC-PMM-002 default plan text does not carry the review, validate or execute mode bodies',
        skip: SKIP,
        fn: () => {
            // Given the default plan skill text (what a plain /plan loads)
            const text = planSkill();
            // Then none of the mode-only contract markers appear in it
            const reviewOnly = ['`round = 1`, `maxRounds = 1`', 'ONE ROUND MAXIMUM', '## Report Shape', 'Finding validation and verdict', '### Conditional lenses'];
            const validateOnly = ['## Phase 0: Detect Plan Type', 'Phase 0.5: Applicability / Plan Gate', 'Follow-up rules', '### Step 4: Interview User'];
            const executeOnly = ['## Step 4: Verify (tests + mutation check, once)', '## Pre-Implementation Granularity Gate', '### Step 2 Wave Dispatch', '## Spec-Loop Gate', '## Step 5: User Approval'];
            for (const marker of [...reviewOnly, ...validateOnly, ...executeOnly]) assert.ok(!text.includes(marker), `plan/SKILL.md must not inline mode text: ${marker}`);
            // And the mode bodies do live in their reference files
            for (const marker of reviewOnly) assert.ok(modeReview().includes(marker), `mode-review.md holds ${marker}`);
            for (const marker of validateOnly) assert.ok(modeValidate().includes(marker), `mode-validate.md holds ${marker}`);
            for (const marker of executeOnly) assert.ok(modeExecute().includes(marker), `mode-execute.md holds ${marker}`);
            // And default plan creation still runs its own contract
            assert.match(text, /Write `plan\.md` under the configured plans root/);
        }
    },
    {
        name: 'TC-PMM-003 --mode=review keeps the one-round cap, the read-only boundary, the verdict set and the Goal Satisfaction matrix',
        skip: SKIP,
        fn: () => {
            const text = modeReview();
            // One round, stop after the verdict, no fixing or re-review
            assert.match(text, /`round = 1`, `maxRounds = 1`, `minRounds = 1`/);
            assert.match(text, /\*\*ONE ROUND MAXIMUM per invocation\.\*\*/);
            assert.match(text, /Stop\. Do not apply fixes or re-review/);
            assert.match(text, /Another review requires a new explicit invocation/i);
            assert.match(text, /never edit the plan, fix findings, or start a fresh re-review inside this mode/i);
            assert.match(text, /Read-only on plan\/source\/spec artifacts\. Write only the review report under `tmp\/reports\/`/);
            // No convergence loop and no second review round
            assert.doesNotMatch(text, /SYNC:double-round-trip-review|OVERRIDE:double-round-trip-review|extendable ONCE|fresh full re-review/i);
            // Every verdict and the Goal Satisfaction matrix survive
            for (const verdict of ['PASS', 'PASS_WITH_NOTES', 'CHANGES_REQUESTED', 'BLOCKED']) assert.ok(text.includes(`\`${verdict}\``), `verdict ${verdict}`);
            assert.match(text, /\| Success Criterion \| Evidence \| Status \|/);
            // And the parent skill states the cap at the point of dispatch
            assert.match(planSkill(), /one-round cap and read-only rules govern/);
        }
    },
    {
        name: 'TC-PMM-004 --mode=validate keeps the mandatory AskUserQuestion interview and the plan.md-only Validation Summary',
        skip: SKIP,
        fn: () => {
            const text = modeValidate();
            assert.match(text, /MUST ATTENTION use `AskUserQuestion` — NEVER auto-decide on behalf of user/);
            assert.match(text, /Completing without asking ≥1 question = violation/);
            assert.match(text, /NEVER modify phase files/);
            assert.match(text, /## Validation Summary/);
            assert.match(text, /Bugfix detection is BLOCKING/);
            assert.match(text, /Option 4 selected → return BLOCKED status/);
            assert.match(text, /Treat both as hard constraints/);
            assert.match(text, /\*\*"\/feature-implement \(Recommended\)"\*\*/);
        }
    },
    {
        name: 'TC-PMM-005 the removed skill folders stay deleted and no workflow step references them',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill } of manifest.occurrences) skills.add(skill);
                }
            }
            for (const name of REMOVED) assert.ok(!skills.has(name), `no resolved workflow step runs ${name}`);
            assert.ok(skills.has('plan'), 'tripwire: the registry still runs the plan skill');
        }
    },
    {
        name: 'TC-PMM-006 every workflow occurrence of plan passes a mode the plan skill supports',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = planSkill();
            let modeSteps = 0;
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences.filter(step => step.skill === 'plan')) {
                        const args = occurrence.args.trim();
                        if (!args) continue;
                        const mode = /^--mode=([a-z]+)$/.exec(args);
                        assert.ok(mode, `${id}/${manifest.mode}/${occurrence.id}: unsupported plan arguments "${args}"`);
                        assert.ok(dispatch.includes(`\`--mode=${mode[1]}`), `${id}/${occurrence.id}: plan has no --mode=${mode[1]}`);
                        modeSteps += 1;
                    }
                }
            }
            assert.ok(modeSteps >= 12, `tripwire: the registry runs the merged modes as plan steps (${modeSteps})`);
        }
    },
    {
        name: 'TC-PMM-007 a gate satisfied by "plan --mode=validate" needs that invocation, not any plan step',
        fn: () => {
            const gate = args => [{ id: 'plan-approved', satisfiedBy: [args] }];
            const plain = { id: 'p', skill: 'plan' };
            const validate = { id: 'v', skill: 'plan', args: '--mode=validate' };
            // Given a sequence with a validate step, the gate resolves
            const ok = resolveFixture({ sequence: [plain, validate], outcomeGates: gate('plan --mode=validate') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['plan --mode=validate']);
            // And a workflow with plan steps but no validate step cannot prove the gate
            assert.throws(() => resolveFixture({ sequence: [plain], outcomeGates: gate('plan --mode=validate') }), /names a skill not in the sequence/);
            // And a different mode does not satisfy it
            assert.throws(() => resolveFixture({ sequence: [plain, { id: 'r', skill: 'plan', args: '--mode=review' }], outcomeGates: gate('plan --mode=validate') }), /names a skill not in the sequence/);
            // And a mode variant that drops the validate step fails for that mode
            const variants = {
                defaultMode: 'full',
                variants: { full: { sequence: [plain, validate] }, lean: { sequence: [plain] } },
                outcomeGates: gate('plan --mode=validate')
            };
            assert.equal(resolveFixture(variants, 'full').mode, 'full');
            assert.throws(() => resolveFixture(variants, 'lean'), /has no satisfying step in fixture\/lean/);
            // And a bare skill name still matches every occurrence of that skill
            assert.doesNotThrow(() => resolveFixture({ sequence: [plain], outcomeGates: gate('plan') }));
        }
    },
    {
        name: 'TC-PMM-008 mode-only protocols live as inline bodies in the mode reference, never in plan/SKILL.md; default plan keeps its own guides',
        skip: SKIP,
        fn: () => {
            const planText = planSkill();
            const planTags = guideTags(planText);
            const reviewText = modeReview();
            const validateText = modeValidate();
            const executeText = modeExecute();
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const reviewOnly = ['category-review-thinking', 'graph-assisted-investigation', 'severity-rubric', 'trade-off-interrogation-gate'];
            const validateOnly = ['nested-task-creation', 'sequential-thinking-protocol', 'task-tracking-external-report', 'understand-code-first'];
            const executeOnly = ['design-distinctiveness-gate', 'design-review-checklist', 'end-to-start-debugger-trace', 'nested-task-creation', 'severity-rubric', 'source-test-drift-check', 'ui-copywriting', 'understand-code-first'];
            // Each mode-only tag is an inline body in its reference and absent from the default skill
            for (const [label, text, tags] of [['mode-review', reviewText, reviewOnly], ['mode-validate', validateText, validateOnly], ['mode-execute', executeText, executeOnly]]) {
                for (const tag of tags) {
                    assert.ok(bodyOf(text, tag), `${label} carries the full ${tag} body`);
                    assert.ok(!planText.includes(`SYNC:${tag}`) && !planTags.includes(tag), `plan/SKILL.md must not carry ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `${label} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `${label} carries no retired pointer line`);
            }
            // The review mode's AI-feature depth is one conditional pointer, never a body or a guide line
            assert.match(reviewText, /\*\*AI surface\?\*\* Only if the plan creates or changes a model call[^\n]*\.claude\/skills\/shared\/protocols\/ai-engineering-gate\.md[^\n]*otherwise skip this line/);
            assert.ok(!reviewText.includes('SYNC:ai-engineering-gate') && !planText.includes('ai-engineering-gate'), 'default plan creation pays nothing for the AI floor');
            // And plan keeps every protocol the modes share with plan creation
            for (const tag of ['core-engineering-principles', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'plan-granularity', 'plan-quality', 'verify-last-order', 'cross-service-check', 'parallel-subagent-dispatch']) {
                assert.ok(planTags.includes(tag), `plan/SKILL.md carries ${tag}`);
            }
            for (const tag of planTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
            // And every mode's SYNC fences stay balanced (bodies and reminders)
            for (const [label, text] of [['mode-review', reviewText], ['mode-validate', validateText], ['mode-execute', executeText]]) {
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `${label} fences balanced`);
            }
            const reminders = text => (text.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length;
            assert.ok(reminders(validateText) >= 8, `tripwire: the validate reminders survive (${reminders(validateText)})`);
            assert.ok(reminders(executeText) >= 10, `tripwire: the execute reminders survive (${reminders(executeText)})`);
        }
    },
    {
        name: 'TC-PMM-009 no live source names the removed skills',
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
            assert.deepEqual(offenders, [], 'replace each with `plan --mode=review` / `plan --mode=validate`');
            // The allow-list is live: each allowed mention still exists and is the only one in its file
            const formerly = planSkill().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(formerly.length >= 1 && formerly.every(line => /former/i.test(line)), 'plan/SKILL.md names the removed commands only as "formerly"');
        }
    },
    {
        name: 'TC-PMM-010 plan description keeps the step-skill form and advertises the three merged modes',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(planSkill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Planning\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=review/);
            assert.match(description, /--mode=validate/);
            assert.match(description, /--mode=execute/);
            assert.match(description, /--mode=\{ci\|cro\}/);
        }
    },
    {
        name: 'TC-PMM-011 --mode=execute keeps every flag with its default, the BLOCKING gates, the verify-last order and the no-implicit-Git rule',
        skip: SKIP,
        fn: () => {
            const text = modeExecute();
            // Every flag, default off: no flags = the full spine run sequentially
            assert.match(text, /\| `--approval=\{on\\\|off\}` \| `on` \|/);
            assert.match(text, /\| `--tests=\{on\\\|off\}` \| `on` \|/);
            assert.match(text, /\| `--parallel=\{auto\\\|on\\\|off\}` \| `off` \|/);
            assert.match(text, /No flags = full 7-step spine/);
            assert.match(text, /Step 2 is SEQUENTIAL by default; wave fan-out is OPT-IN/);
            // The BLOCKING gates and the ordered spine survive
            assert.match(text, /## Step 5: User Approval ⏸ BLOCKING GATE/);
            assert.match(text, /Tests must be 100% passing with the mutation check clean, run ONCE after the static review/);
            assert.match(text, /\*\*Stop and wait\*\* - do not proceed until user responds/);
            for (let step = 0; step <= 6; step += 1) assert.match(text, new RegExp(`\\n## Step ${step}: `), `Step ${step} exists`);
            // Parallel metadata gating: a derived write set is never trusted under auto
            assert.match(text, /NEVER derives a write set from the plan's prose|NEVER derive write sets optimistically/);
            assert.match(text, /`--parallel=auto` fans out ONLY when every in-scope phase carries the `## Parallel Execution` block/);
            // Finishing never implies Git authority
            assert.match(text, /never authorize staging, committing, or pushing/);
            // Nested runs leave review and verify to the parent workflow
            assert.match(text, /Run Steps 0–2[^\n]*and Step 6/);
            // The parent skill states the flags and their defaults at the point of dispatch
            assert.match(planSkill(), /owns the `--approval`, `--tests` and `--parallel` flags \(no flag is set by default/);
        }
    }
];

module.exports = { name: 'plan-modes-merge', tests };
