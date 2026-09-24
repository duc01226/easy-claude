/**
 * Project Reference Gate Coverage Test Suite
 *
 * Guards the static JIT delivery of `SYNC:project-reference-docs-guide` — the gate that
 * tells the model WHICH project-reference doc to read BEFORE each phase (plan, edit,
 * test, spec/doc, review) and when an earlier read still counts (the ~200K-token dedup
 * window). The gate reaches a phase only through the skill loaded for that phase, so a
 * step skill without the block silently runs on generic defaults instead of the
 * project's conventions.
 *
 * Adoption list = `.claude/scripts/inject_project_reference_prefetch.py` (SKILL_NAMES +
 * EXEMPT_WORKFLOW_STEPS). Parsed, never copied, so the injector and this suite cannot
 * disagree.
 *
 * Tests:
 *   TC-PRG-001 — every workflow step skill is an adoption target or an exemption with a reason.
 *   TC-PRG-002 — every adoption target carries the top block AND the reminder, each byte-equal
 *                to canonical (exactly once).
 *   TC-PRG-003 — every carrier anywhere (skills + agents) is byte-equal to canonical; no
 *                exempt step skill carries the block.
 *   TC-PRG-004 — the canonical gate states the phase routing and the ~200K-token dedup rule,
 *                and that window matches the file-convention hook's default distance.
 *   TC-PRG-005 — refreshing carried blocks after successive canonical edits (injector AND
 *                sync script) rewrites only the block bodies: the text around every marker,
 *                blank lines included, stays byte-identical.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const ROOT = path.resolve(process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..', '..', '..'));
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const INJECTOR = path.join(ROOT, '.claude', 'scripts', 'inject_project_reference_prefetch.py');
const CANONICAL = path.join(SKILLS_DIR, 'shared', 'sync-inline-versions.md');
const TAG = 'SYNC:project-reference-docs-guide';
const REMINDER_TAG = `${TAG}:reminder`;

const normalizeEol = text => text.replace(/\r\n?/g, '\n');
const read = file => normalizeEol(fs.readFileSync(file, 'utf8'));

/** Canonical body, parsed the same way as sync_blocks.load_sync_body. */
function canonicalWrapped(tag) {
    const text = read(CANONICAL);
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^---\\s*$)`, 'm').exec(text);
    if (!match) throw new Error(`canonical block not found: ${tag}`);
    return `<!-- ${tag} -->\n\n${match[1].trim()}\n\n<!-- /${tag} -->`;
}

function parseInjector() {
    const py = read(INJECTOR).split('\n').map(line => line.replace(/#.*$/, '')).join('\n');
    const list = /^SKILL_NAMES = \[([\s\S]*?)^\]/m.exec(py);
    const exempt = /^EXEMPT_WORKFLOW_STEPS = \{([\s\S]*?)^\}/m.exec(py);
    if (!list || !exempt) throw new Error('injector lists not found');
    const targets = [...list[1].matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]);
    const exemptions = new Map([...exempt[1].matchAll(/"([a-z0-9-]+)":\s*"([^"]+)"/g)].map(m => [m[1], m[2].trim()]));
    return { targets, exemptions };
}

function workflowStepSkills() {
    const { resolvedModeSequences, baseSkill } = require(path.join(ROOT, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'workflows.json'), 'utf8'));
    const skills = new Set();
    for (const [id, wf] of Object.entries(doc.workflows || {})) {
        for (const { sequence } of resolvedModeSequences(ROOT, id, wf)) {
            for (const step of sequence) skills.add(baseSkill(step));
        }
    }
    return [...skills].filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'))).sort();
}

const count = (text, needle) => text.split(needle).length - 1;

/**
 * Run a Python snippet with the scripts dir on sys.path; return parsed JSON stdout.
 * Same interpreter order as sync-carrier-parity (`python3` last: on Windows it can be
 * a Store alias that exits non-zero, which simply falls through). Fails loud — an
 * unavailable interpreter must never read as a pass.
 */
function runPythonJson(snippet) {
    const { spawnSync } = require('child_process');
    const scriptsDir = path.join(ROOT, '.claude', 'scripts');
    const program = `import json, sys\nsys.path.insert(0, ${JSON.stringify(scriptsDir)})\n${snippet}`;
    const candidates = [
        { command: 'python', baseArgs: [] },
        { command: 'py', baseArgs: ['-3'] },
        { command: 'python3', baseArgs: [] },
    ];
    const errors = [];
    for (const c of candidates) {
        const r = spawnSync(c.command, [...c.baseArgs, '-c', program], { encoding: 'utf8', timeout: 30000 });
        if (r.status === 0 && r.stdout) return JSON.parse(r.stdout);
        errors.push(`${c.command}: ${r.error ? r.error.code : `exit ${r.status} ${String(r.stderr).trim().split('\n').pop()}`}`);
    }
    throw new Error(`could not run the Python refresh driver (${errors.join('; ')})`);
}

/** Collapse every SYNC block to a placeholder so only the surrounding text is compared. */
const skeleton = text => text.replace(/<!-- (SYNC:[^\s]+) -->[\s\S]*?<!-- \/\1 -->/g, '<<$1>>');

function carrierFiles() {
    const files = [];
    for (const dir of fs.readdirSync(SKILLS_DIR)) {
        const file = path.join(SKILLS_DIR, dir, 'SKILL.md');
        if (fs.existsSync(file)) files.push({ label: dir, file });
    }
    for (const name of fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))) {
        files.push({ label: `agent:${name}`, file: path.join(AGENTS_DIR, name) });
    }
    return files.filter(({ file }) => read(file).includes(`<!-- ${TAG}`));
}

function blockProblems(label, text, top, reminder) {
    const problems = [];
    if (count(text, `<!-- ${TAG} -->`) !== 1) problems.push(`${label}: top block must appear exactly once`);
    if (count(text, `<!-- ${REMINDER_TAG} -->`) !== 1) problems.push(`${label}: reminder block must appear exactly once`);
    if (!text.includes(top)) problems.push(`${label}: top block differs from canonical (run inject_project_reference_prefetch.py)`);
    if (!text.includes(reminder)) problems.push(`${label}: reminder differs from canonical (run sync_project_reference_block.py)`);
    return problems;
}

module.exports = {
    name: 'project-reference-gate-coverage',
    tests: [
        {
            name: 'TC-PRG-001 every workflow step skill is an adoption target or a reasoned exemption',
            fn: () => {
                // Given: the injector's adoption targets + reasoned exemptions and the live workflow catalog.
                const { targets, exemptions } = parseInjector();
                // When: every workflow step skill is resolved from the catalog.
                const steps = workflowStepSkills();
                // Then: each step has exactly one gate decision, no exemption is stale, and every exemption says why.
                assertTrue(steps.length > 20, `expected the workflow catalog to resolve step skills, got ${steps.length}`);
                const targetSet = new Set(targets);
                const unclassified = steps.filter(skill => !targetSet.has(skill) && !exemptions.has(skill));
                assertEqual(unclassified.length, 0, `workflow step skills with no gate decision (add to SKILL_NAMES or EXEMPT_WORKFLOW_STEPS): ${unclassified.join(', ')}`);
                const both = targets.filter(skill => exemptions.has(skill));
                assertEqual(both.length, 0, `skills both targeted and exempt: ${both.join(', ')}`);
                const stale = [...exemptions.keys()].filter(skill => !steps.includes(skill));
                assertEqual(stale.length, 0, `exemptions that are no longer workflow steps: ${stale.join(', ')}`);
                for (const [skill, reason] of exemptions) assertTrue(reason.length >= 10, `${skill}: exemption needs a real reason`);
            },
        },
        {
            name: 'TC-PRG-002 every adoption target carries top + reminder blocks equal to canonical',
            fn: () => {
                const top = canonicalWrapped(TAG);
                const reminder = canonicalWrapped(REMINDER_TAG);
                const problems = [];
                // Given: the canonical top + reminder blocks. When: every adoption target's SKILL.md is read.
                for (const skill of parseInjector().targets) {
                    const file = path.join(SKILLS_DIR, skill, 'SKILL.md');
                    if (!fs.existsSync(file)) {
                        problems.push(`${skill}: SKILL.md missing`);
                        continue;
                    }
                    problems.push(...blockProblems(skill, read(file), top, reminder));
                }
                // Then: every target exists and carries both blocks byte-equal to canonical, exactly once.
                assertEqual(problems.length, 0, problems.join('\n  '));
            },
        },
        {
            name: 'TC-PRG-003 every carrier is canonical and exempt step skills carry no copy',
            fn: () => {
                const top = canonicalWrapped(TAG);
                const reminder = canonicalWrapped(REMINDER_TAG);
                const problems = [];
                // Given: the canonical blocks. When: every skill/agent carrier and every exempt step skill is read.
                for (const { label, file } of carrierFiles()) problems.push(...blockProblems(label, read(file), top, reminder));
                for (const skill of parseInjector().exemptions.keys()) {
                    const file = path.join(SKILLS_DIR, skill, 'SKILL.md');
                    if (fs.existsSync(file) && read(file).includes(`<!-- ${TAG}`)) problems.push(`${skill}: exempt but carries the block (an unrefreshed copy)`);
                }
                // Then: every agent carries the gate, every carrier is canonical, and no exempt skill keeps a copy.
                const agents = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
                const agentCarriers = carrierFiles().filter(c => c.label.startsWith('agent:')).length;
                assertEqual(agentCarriers, agents.length, 'every agent must carry the gate (Core-6 tier)');
                assertEqual(problems.length, 0, problems.join('\n  '));
            },
        },
        {
            name: 'TC-PRG-004 canonical gate routes by phase and dedups on the hook window',
            fn: () => {
                const top = canonicalWrapped(TAG);
                const reminder = canonicalWrapped(REMINDER_TAG);
                // Given/When: the canonical gate and reminder read from sync-inline-versions.md.
                // Then: the gate routes all five phases to their docs and states the dedup rule.
                for (const phase of ['investigate, explain, plan', 'edit or write code', 'tests or test data', 'specs, test cases, or docs', 'review a diff']) {
                    assertTrue(top.includes(phase), `phase routing row missing: ${phase}`);
                }
                for (const doc of ['project-structure-reference.md', 'code-review-rules.md', 'backend-patterns-reference.md', 'frontend-patterns-reference.md', 'integration-test-reference.md', 'e2e-test-reference.md', 'seed-test-data-reference.md', 'feature-spec-reference.md']) {
                    assertTrue(top.includes(doc), `routing table must name ${doc}`);
                }
                assertTrue(top.includes('file-conventions.cjs --lookup'), 'gate must point hookless hosts at the per-file convention lookup');
                assertTrue(/Dedup within ~200K tokens/.test(top) && /~200K tokens/.test(reminder), 'gate and reminder must state the ~200K-token dedup window');
                assertTrue(/hook reminder, a summary/.test(top), 'dedup must refuse hook reminders and summaries as proof of loading');

                // The prose window must equal the hook's default distance, so the static and hook
                // carriers dedup on the same horizon (22 transcript bytes per token).
                // Given: the file-convention hook's default settings. When: its re-inject distance is converted to tokens.
                const conventions = require(path.join(ROOT, '.claude', 'hooks', 'lib', 'file-conventions.cjs'));
                const tokens = conventions.resolveSettings({ conventionInjection: { enabled: true }, contextGroups: [] }).reinjectAfterBytes / conventions.BYTES_PER_TOKEN;
                // Then: it matches the gate's stated ~200K window.
                assertTrue(Math.abs(tokens - 200000) <= 10000, `hook default window is ~${Math.round(tokens)} tokens, gate says ~200K`);
            },
        },
        {
            // INTENT: a canonical edit changes only what is INSIDE the markers. Each refresh used to
            // splice a newline-terminated block over a match ending at `-->`, adding one blank line
            // per canonical edit to every carrier — unbounded whitespace drift the byte-equal checks
            // above cannot see, because they compare only the block bodies.
            name: 'TC-PRG-005 refresh after successive canonical edits leaves the text around every marker unchanged',
            fn: () => {
                // Given: a carrier (one blank line around each block) and a skill without the blocks,
                // and three successive canonical versions A, B, C.
                const out = runPythonJson([
                    'from inject_project_reference_prefetch import inject, TAG, REMINDER_TAG',
                    'from sync_project_reference_block import refresh',
                    'wrap = lambda tag, body: f"<!-- {tag} -->\\n\\n{body}\\n\\n<!-- /{tag} -->\\n"',
                    'v = {k: (wrap(TAG, f"> gate {k}"), wrap(REMINDER_TAG, f"- reminder {k}")) for k in "ABC"}',
                    'carrier = ("# Skill\\n\\nBody.\\n\\n" + wrap(TAG, "> old gate") + "\\n<!-- SYNC:other -->\\n\\nx\\n\\n<!-- /SYNC:other -->\\n\\n"',
                    '           + wrap(REMINDER_TAG, "- old reminder") + "\\n## Closing Reminders\\n\\n- keep\\n")',
                    'bare = "# Skill\\n\\nBody.\\n\\n<!-- SYNC:other:reminder -->\\n\\n- r\\n\\n<!-- /SYNC:other:reminder -->\\n\\n## Closing Reminders\\n\\n- keep\\n"',
                    // When: the injector refreshes A then B; the sync script refreshes C; a fresh
                    // injection is then refreshed to B.
                    'a = inject(carrier, *v["A"])[0]; b = inject(a, *v["B"])[0]; c = refresh(b, *v["C"])[0]',
                    'fresh = inject(bare, *v["A"])[0]; fresh_b = inject(fresh, *v["B"])[0]; fresh_c = refresh(fresh_b, *v["C"])[0]',
                    'print(json.dumps({"carrier": carrier, "a": a, "b": b, "c": c, "fresh": fresh, "fresh_b": fresh_b, "fresh_c": fresh_c}))',
                ].join('\n'));

                // Then: only block bodies changed — the surrounding text, blank lines included, is
                // byte-identical across every refresh, and each refresh carried the new body.
                for (const key of ['a', 'b', 'c']) {
                    assertEqual(skeleton(out[key]), skeleton(out.carrier), `carrier refresh "${key}" changed text outside the blocks`);
                }
                for (const key of ['fresh_b', 'fresh_c']) {
                    assertEqual(skeleton(out[key]), skeleton(out.fresh), `fresh-injection refresh "${key}" changed text outside the blocks`);
                }
                assertTrue(out.b.includes('> gate B') && out.b.includes('- reminder B') && !out.b.includes('gate A'), 'injector refresh must carry version B');
                assertTrue(out.c.includes('> gate C') && out.c.includes('- reminder C'), 'sync-script refresh must carry version C');
                assertTrue(/Body\.\n\n<!-- SYNC:project-reference-docs-guide -->/.test(out.fresh), 'fresh injection places the gate after one blank line');
                assertEqual(count(out.fresh_c, `<!-- ${TAG} -->`), 1, 'refresh must not duplicate the gate');
            },
        },
    ],
};
