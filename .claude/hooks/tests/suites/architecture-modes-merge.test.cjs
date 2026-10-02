/**
 * Architecture Modes Merge Test Suite
 *
 * The architecture skill owns four independent modes: `--mode=design` (solution architecture design),
 * `--mode=review` (architecture compliance review), `--mode=scalability` (architecture + scalability
 * grade) and `--mode=full` (whole-project audit that composes the other faces). Each mode body lives in
 * `architecture/references/mode-<x>.md`; `architecture/SKILL.md` detects the mode first and carries a
 * BLOCKING "read the mode file in full FIRST" line, so a no-mode call loads no mode body and never guesses
 * an expensive audit. The four modes have no skill folder of their own.
 *
 * Coverage:
 *   TC-AMM-001 — SKILL.md keeps the four modes, each with its mandatory read line and a reference file;
 *                no mode shows the table and asks nothing.
 *   TC-AMM-002 — SKILL.md carries none of the mode bodies; each mode body lives in its reference.
 *   TC-AMM-003 — the review mode keeps --report-only, the 13 categories, the Phase-5 validation gate, the
 *                verdict set and the report path.
 *   TC-AMM-004 — the scalability mode keeps the /20 scorecard, G1-G7, the run types, the report path, the
 *                scorecard reference and the grader boundary (no fix-loop engine).
 *   TC-AMM-005 — the design mode keeps its 12 steps, the ADR output and the Step-12 interview.
 *   TC-AMM-006 — the full mode composes the review and scalability modes (and production-readiness-review)
 *                instead of copying their bodies, and keeps its report path and all-return barrier.
 *   TC-AMM-007 — the old skill folders stay deleted and no resolved workflow step runs them.
 *   TC-AMM-008 — every workflow occurrence of `architecture` passes a mode the skill supports, the
 *                specialist wave runs review mode as a read-only leaf, and an outcome gate satisfied by
 *                `architecture --mode=full` needs that invocation (fixture workflows; portable).
 *   TC-AMM-009 — mode-only protocols are inline bodies in the mode reference, never guide lines; SKILL.md
 *                carries no guide entry; SYNC fences stay balanced.
 *   TC-AMM-010 — no live source names the removed skills (allow-list: the "formerly" lines and the
 *                report/output file names).
 *   TC-AMM-011 — the description keeps the step-skill form and advertises every mode.
 *
 * Portability: TC-AMM-008's gate row runs on in-memory fixture registries. Every other row asserts this
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
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own architecture skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = () => read(SKILLS, 'architecture', 'SKILL.md');
const mode = name => read(SKILLS, 'architecture', 'references', `mode-${name}.md`);

// The removed skill names, assembled so this file never contains the literal tokens it guards against.
const REMOVED = ['architecture' + '-design', 'architecture' + '-review-full', 'architecture' + '-scalability-review', 'architecture' + '-review'];
const MODES = ['design', 'review', 'scalability', 'full'];

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
const resolveFixture = (entry, modeName) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['architecture', 'plan'], ...(modeName ? { mode: modeName } : {}) });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/architecture-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);
// A removed name counts only as a whole token: `plan-architecture-review` style workflow step ids are not the skill.
const REMOVED_TOKEN = new RegExp(`(?<![\\w-])(?:${REMOVED.map(name => name.replace(/-/g, '\\-')).join('|')})(?![\\w])`);

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
    // The "formerly /old-name" mapping lines: the skill file and the one-line header of each mode reference.
    if (rel.startsWith('.claude/skills/architecture/') && /former/i.test(line)) return true;
    // Output and report file names are kept so every path is identical to the standalone skill it came from.
    if (rel === '.claude/skills/architecture/references/mode-design.md' && line.includes('research/' + REMOVED[0] + '.md')) return true;
    if (rel === '.claude/skills/architecture/references/mode-scalability.md' && line.includes('tmp/reports/' + REMOVED[2] + '-{YYMMDD}')) return true;
    return false;
}

const tests = [
    {
        name: 'TC-AMM-001 architecture keeps the four modes, each with a BLOCKING read-first line and its reference file; no mode shows the table and asks nothing',
        skip: SKIP,
        fn: () => {
            // Given the architecture skill
            const text = skill();
            // Then mode detection comes before the first content section and lists all four modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            // And each mode has a mandatory full-read line naming an existing reference
            for (const name of MODES) {
                assert.match(text, new RegExp(`--mode=${name}`), `--mode=${name} is documented`);
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${name}\`, read \`references/mode-${name}\\.md\` in full FIRST`), `mandatory read line for ${name}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'architecture', 'references', `mode-${name}.md`)), `references/mode-${name}.md exists`);
            }
            // And a call with no mode never guesses: it shows the table and asks nothing
            assert.match(text, /No mode: show the mode table below and stop — ask nothing, run nothing, never guess a mode/);
            assert.match(text, /\| _\(none\)_ \| Show this table; ask nothing; run nothing \|/);
            // And the removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z-]+`, `\/[a-z-]+`, `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
            for (const old of REMOVED) assert.ok(text.includes(`\`/${old}\``), `${old} resolves through the formerly mapping`);
        }
    },
    {
        name: 'TC-AMM-002 architecture/SKILL.md carries none of the mode bodies; each body lives in its reference',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const markers = {
                design: ['## Step 2: Derive Architecture Requirements', '## Step 12: User Validation Interview', '## Best Practices Audit'],
                review: ['## Phase 3: Architecture Review', '## Phase 5: Why-Review Self-Validation Gate', '## Sub-Agent Type Override'],
                scalability: ['### Step 3: Score The 10 Areas', '## Scorecard Validation Gate', '### Testability & Verification Contract'],
                full: ['## Step 3: Parallel Fan-Out (ALL-RETURN BARRIER)', '## Step 4: Progressive Synthesis', '## Step 6: Finalize (status `FINISHED`)']
            };
            for (const [name, list] of Object.entries(markers)) {
                for (const marker of list) {
                    assert.ok(!text.includes(marker), `SKILL.md must not inline the ${name} body: ${marker}`);
                    assert.ok(mode(name).includes(marker), `mode-${name}.md holds ${marker}`);
                }
            }
            assert.ok(Buffer.byteLength(text) < 12000, `SKILL.md stays lean (${Buffer.byteLength(text)} bytes)`);
        }
    },
    {
        name: 'TC-AMM-003 --mode=review keeps --report-only, the 13 categories, the Phase-5 validation gate, the verdict set and the report path',
        skip: SKIP,
        fn: () => {
            const text = mode('review');
            assert.match(text, /## Report-Only Mode \(`--report-only`\)/);
            assert.match(text, /\*\*Run Phases 0–5 only\.\*\*/);
            assert.match(text, /read `\.claude\/skills\/workflow-review-changes\/references\/caller-mode\.md` § `--report-only` in full FIRST/);
            for (const phase of ['## Phase 0: Load Architecture Rules', '## Phase 1: Determine Scope', '## Phase 2: Blast Radius', '## Phase 3: Architecture Review', '## Phase 4: Finalize', '## Phase 5: Why-Review Self-Validation Gate']) {
                assert.ok(text.includes(phase), phase);
            }
            assert.match(text, /13 categories/);
            assert.match(text, /BLOCKED = must fix before merge \| WARN = review and decide \| PASS = compliant/);
            assert.match(text, /tmp\/reports\/arch-review-\{date\}-\{slug\}\.md/);
            assert.match(text, /<!-- OVERRIDE:review-protocol-injection -->/);
            assert.match(text, /Round 1 clears only at zero open findings; Round 2 clears at zero CRITICAL\/HIGH\/MEDIUM/);
        }
    },
    {
        name: 'TC-AMM-004 --mode=scalability keeps the /20 scorecard, G1-G7, the run types, the report path, the scorecard reference and the grader boundary',
        skip: SKIP,
        fn: () => {
            const text = mode('scalability');
            assert.match(text, /`\/20` verdict/);
            assert.match(text, /### `mode=init`/);
            assert.match(text, /### `mode=audit`/);
            for (const gate of ['G1 Evidence Integrity', 'G2 Build & CI Scalability', 'G3 Distributed-Monolith Risk', 'G4 Boundary Enforcement', 'G5 Horizontal Scaling Bottlenecks', 'G6 Reuse Without Coupling', 'G7 Secrets And Sensitive Output']) {
                assert.ok(text.includes(gate), gate);
            }
            assert.match(text, /\| 17-20 \| STRONG \|/);
            assert.match(text, /\| 11-16 \| NEEDS WORK \|/);
            assert.match(text, /\| 0-10 \| HIGH RISK \|/);
            assert.match(text, /Write `tmp\/reports\/architecture-scalability-review-\{YYMMDD\}-\{HHmm\}-\{slug\}\.md`\./);
            assert.match(text, /Read `references\/scorecard\.md`/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'architecture', 'references', 'scorecard.md')), 'references/scorecard.md exists');
            // A grader validates and never self-converges: no fix-loop engine in the mode reference
            assert.ok(!/double-round-trip-review/.test(text), 'the scalability grader must not embed the fix-loop engine');
            assert.match(text, /why-review --validate-findings/);
            assert.match(text, /maximum 3 passes/);
        }
    },
    {
        name: 'TC-AMM-005 --mode=design keeps its 12 steps, the ADR output and the Step-12 validation interview',
        skip: SKIP,
        fn: () => {
            const text = mode('design');
            for (const heading of ['## Step 1: Load Context', '## Step 2: Derive Architecture Requirements', '## Step 3: Backend Architecture', '## Step 4: Frontend Architecture', '## Step 5: Library Ecosystem Research', '## Step 6: Testing Architecture', '## Step 7: CI/CD & Deployment', '## Step 8: Observability & Monitoring', '## Step 9: Code Quality & Clean Code Enforcement', '## Step 10: Dependency Risk Assessment', '## Step 11: Generate Report', '## Step 12: User Validation Interview']) {
                assert.ok(text.includes(heading), heading);
            }
            assert.match(text, /\{plan-dir\}\/research\/architecture-design\.md/);
            assert.match(text, /\{adr-root\}\/\{NNNN\}-\{slug\}\.md/);
            assert.match(text, /run user validation interview at end \(never skip\)/);
        }
    },
    {
        name: 'TC-AMM-006 --mode=full composes the review and scalability modes and production-readiness-review instead of copying their bodies',
        skip: SKIP,
        fn: () => {
            const text = mode('full');
            // Composition: the faces run as sub-agents of the other modes, reading those references
            assert.match(text, /Composition, not copy/);
            assert.match(text, /`\/architecture --mode=scalability`/);
            assert.match(text, /`\/architecture --mode=review`/);
            assert.match(text, /`references\/mode-scalability\.md`, `references\/mode-review\.md`/);
            assert.match(text, /`production-readiness-review`/);
            // Each face brief names the reference FILE PATH to read (the architect agent preloads no mode reference)
            for (const file of ['.claude/skills/architecture/references/mode-scalability.md', '.claude/skills/architecture/references/mode-review.md', '.claude/skills/production-readiness-review/SKILL.md']) {
                assert.ok(text.includes('`' + file + '`'), `the face brief names the file path ${file}`);
                assert.ok(fs.existsSync(path.join(REPO_ROOT, ...file.split('/'))), `${file} exists`);
            }
            // No copied body of the faces
            for (const marker of ['## Phase 3: Architecture Review', '### Step 3: Score The 10 Areas', '## Scorecard Validation Gate', '## Report-Only Mode']) {
                assert.ok(!text.includes(marker), `full mode must not copy a face body: ${marker}`);
            }
            // Its own contract: THIN orchestrator, all-return barrier, one report, worst-case verdict
            assert.match(text, /THIN orchestrator/);
            assert.match(text, /tmp\/reports\/architecture-full-review-\{YYMMDD\}-\{HHmm\}-\{slug\}\.md/);
            assert.match(text, /Spawn ALL THREE sub-agents in ONE message/);
            assert.match(text, /worst-case rollup/);
            assert.match(text, /Step 5: Fix-Report-Per-Review `\/why-review` Gate/);
        }
    },
    {
        name: 'TC-AMM-007 the removed skill folders stay deleted and no resolved workflow step runs them',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            assert.ok(fs.existsSync(path.join(SKILLS, 'architecture', 'SKILL.md')), 'the architecture skill exists');
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            assert.ok(!REMOVED_TOKEN.test(raw.replace(/\r\n/g, '\n')), 'workflows.json must not name a removed skill');
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill: stepSkill } of manifest.occurrences) skills.add(stepSkill);
                }
            }
            for (const name of REMOVED) assert.ok(!skills.has(name), `no resolved workflow step runs ${name}`);
            assert.ok(skills.has('architecture'), 'tripwire: the registry still runs the architecture skill');
        }
    },
    {
        name: 'TC-AMM-008 every workflow occurrence of architecture passes a supported mode; the specialist wave runs review as a read-only leaf; a gate satisfied by "architecture --mode=full" needs that invocation',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = skill();
            const seen = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences.filter(step => step.skill === 'architecture')) {
                        const match = /^--mode=(design|review|scalability|full)(?: --report-only)?$/.exec(occurrence.args.trim());
                        assert.ok(match, `${id}/${manifest.mode}/${occurrence.id}: unsupported architecture arguments "${occurrence.args}"`);
                        assert.ok(dispatch.includes(`\`--mode=${match[1]}`), `${id}/${occurrence.id}: architecture has no --mode=${match[1]}`);
                        seen.add(match[1]);
                        // The review-changes specialist wave runs review mode as a read-only leaf
                        if (id === 'workflow-review-changes') assert.equal(occurrence.args.trim(), '--mode=review --report-only');
                    }
                }
            }
            assert.deepEqual([...seen].sort(), ['design', 'full', 'review', 'scalability'], 'tripwire: the registry runs all four modes');
            // The architecture audit workflow's review gate is proved by the full mode only
            const audit = resolveAllWorkflowManifests(document, 'workflow-architecture-audit', { rootDir: REPO_ROOT })[0];
            assert.deepEqual(audit.outcomeGates.find(gate => gate.id === 'review-converged').satisfiedBy, ['architecture --mode=full']);
            // Fixture: the gate needs the named invocation, not any architecture step
            const gate = args => [{ id: 'review-converged', satisfiedBy: [args] }];
            const plain = { id: 'a', skill: 'architecture', args: '--mode=design' };
            const full = { id: 'f', skill: 'architecture', args: '--mode=full' };
            assert.deepEqual(resolveFixture({ sequence: [plain, full], outcomeGates: gate('architecture --mode=full') }).outcomeGates[0].satisfiedBy, ['architecture --mode=full']);
            assert.throws(() => resolveFixture({ sequence: [plain], outcomeGates: gate('architecture --mode=full') }), /names a skill not in the sequence/);
        }
    },
    {
        name: 'TC-AMM-009 mode-only protocols live as inline bodies in the mode reference, never as guide lines; SKILL.md carries no guide entry; SYNC fences stay balanced',
        skip: SKIP,
        fn: () => {
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const expected = {
                design: ['core-engineering-principles', 'engineering-foundation-gate', 'scale-technique-gate', 'scenario-stress-eval', 'sequential-thinking-protocol', 'test-architecture-execution-contract'],
                review: ['ai-agent-as-user-access', 'category-review-thinking', 'core-engineering-principles', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'graph-assisted-investigation', 'review-principle-awareness', 'scale-technique-gate', 'scenario-stress-eval', 'sequential-thinking-protocol', 'severity-rubric', 'source-test-drift-check', 'sub-agent-selection', 'systematic-review-batching', 'task-tracking-external-report', 'trade-off-interrogation-gate'],
                scalability: ['engineering-foundation-gate', 'goal-contract-satisfaction-loop', 'review-principle-awareness', 'scale-technique-gate', 'scenario-stress-eval', 'severity-rubric', 'test-architecture-execution-contract', 'trade-off-interrogation-gate'],
                full: ['category-review-thinking', 'engineering-foundation-gate', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'graph-assisted-investigation', 'review-principle-awareness', 'review-protocol-injection', 'severity-rubric', 'subagent-return-contract', 'systematic-review-batching', 'task-tracking-external-report', 'test-architecture-execution-contract', 'trade-off-interrogation-gate']
            };
            const skillText = skill();
            assert.deepEqual(guideTags(skillText), [], 'architecture/SKILL.md carries no protocol guide entry (each mode reference is self-contained)');
            assert.ok(!/<!-- SYNC:[a-z-]+/.test(skillText), 'architecture/SKILL.md carries no SYNC block');
            for (const [name, tags] of Object.entries(expected)) {
                const text = mode(name);
                for (const tag of tags) {
                    assert.ok(bodyOf(text, tag), `mode-${name}.md carries the full ${tag} body`);
                    assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `mode-${name}.md carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `mode-${name}.md carries no retired pointer line`);
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `mode-${name}.md fences balanced`);
            }
            // The scalability grader keeps the validate-only boundary: no fix-loop body or reminder
            assert.ok(!mode('scalability').includes('SYNC:double-round-trip-review'), 'the grader carries no fix-loop block');
            // The review mode keeps its routed fresh-reviewer override
            assert.doesNotMatch(mode('review'), /<!-- OVERRIDE:fresh-context-review -->/);
        }
    },
    {
        name: 'TC-AMM-010 no live source names the removed skills',
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
                        if (REMOVED_TOKEN.test(line) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `architecture --mode=<design|review|scalability|full>`');
            // The allow-list is live: SKILL.md names the removed commands only as "formerly"
            const named = skill().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(named.length >= 1 && named.every(line => /former/i.test(line)), 'architecture/SKILL.md names the removed commands only as "formerly"');
        }
    },
    {
        name: 'TC-AMM-011 architecture description keeps the step-skill form and advertises every mode',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Architecture\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            for (const name of MODES) assert.match(description, new RegExp(`--mode=${name}`), `description names --mode=${name}`);
            // The routing keywords of the four former descriptions survive
            for (const keyword of ['solution architecture', 'compliance', 'layers', 'boundaries', 'CQRS', 'tenancy', 'scale grade', 'coupling', 'whole-project audit']) {
                assert.ok(description.includes(keyword), `description keeps the routing keyword "${keyword}"`);
            }
        }
    }
];

module.exports = { name: 'architecture-modes-merge', tests };
