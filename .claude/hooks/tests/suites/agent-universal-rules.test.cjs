/**
 * Agent Universal-Rules Coverage Test Suite
 *
 * Guards the invariant that every custom Claude sub-agent (.claude/agents/*.md)
 * carries its tier's universal SYNC blocks — the behavioral rules propagated by
 * `.claude/scripts/sync-hooks-to-skills.py`. Without this, an agent silently
 * drops a rule on edit, or a NEW agent is added with no tier decision.
 *
 * Tiers (MUST mirror the inserter's constants exactly — single invariant, two
 * enforcers: sync-hooks-to-skills.py and this suite):
 *   - CORE  : 6 blocks — every agent.
 *   - CODE  : CORE + 4 code-investigation blocks — agents that read/review code.
 *   - CODE_STANDARDS : agent-code-standards (dev-rules + pattern pointers) — gated
 *                    on a SEPARATE axis (CODE_STANDARDS_AGENTS) from CODE_AGENTS.
 *                    An agent may be CODE (reads/locates code) yet NOT code-standards
 *                    (researcher/scout/ui-ux-designer don't author/review code).
 *
 * Tests:
 *   A (TC-UAR-003) — every agent carries all Core-6 open+close tags.
 *   B (TC-UAR-004) — each code agent carries all 4 code tags; each core-only
 *                    agent carries NONE of them.
 *   C (TC-UAR-005) — disk agent set == CODE_AGENTS ∪ CORE_ONLY_AGENTS, disjoint
 *                    (a new/renamed agent fails until classified — same fail-loud
 *                    rule as the inserter).
 *   D (TC-UAR-006) — SYNC open/close balance per agent.
 *   E (TC-UAR-007) — agent-code-standards present iff agent ∈ CODE_STANDARDS_AGENTS
 *                    (present in every code-standards agent, ABSENT from every other).
 *   F (TC-UAR-008) — SYNC open/close balance per skill (every .claude/skills SKILL.md).
 *                    Same col-0 fence invariant as D — skills inject the same shared
 *                    SYNC blocks, but no generator owns every skill block, so this
 *                    test suite is the only guard against a malformed/unbalanced fence
 *                    (e.g. a blockquote-indented open) silently shipping in a skill.
 *   G (TC-UAR-009) — code-rule pairing per skill: any SKILL.md carrying
 *                    understand-code-first (full OR :reminder) MUST also carry
 *                    evidence-based-reasoning (full OR :reminder). Code-investigation
 *                    skills hand-curate these two blocks together (the propagator caps
 *                    skills at 2 managed blocks), so this is the only guard against the
 *                    pair drifting apart on edit.
 *   H (TC-UAR-010) — web-research domain block: web-research/SKILL.md MUST carry its
 *                    own SYNC:web-research block (regression guard — the skill's
 *                    primary-behavior protocol must not silently drop on edit).
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const AGENTS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills');

// ── Tier constants — mirror sync-hooks-to-skills.py:235-267 verbatim ──────────
const CORE_TAGS = [
    'critical-thinking-mindset',
    'ai-mistake-prevention',
    'sequential-thinking-protocol',
    'task-tracking-external-report',
    'project-reference-docs-guide',
    'agent-bootstrap',
];
const CODE_TAGS = [
    'understand-code-first',
    'evidence-based-reasoning',
    'cross-service-check',
    'fix-layer-accountability',
];
const CODE_AGENTS = new Set([
    'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer', 'frontend-developer',
    'fullstack-developer', 'integration-tester', 'performance-optimizer',
    'planner', 'researcher', 'scout', 'scout-external', 'security-auditor',
    'solution-architect', 'spec-compliance-reviewer', 'tester', 'ui-ux-designer',
]);
const CORE_ONLY_AGENTS = new Set([
    'business-analyst', 'docs-manager', 'git-manager', 'journal-writer',
    'knowledge-worker', 'product-owner', 'project-manager', 'quality-gate-review',
]);
// agent-code-standards audience — SEPARATE axis (mirror sync-hooks-to-skills.py
// CODE_STANDARDS_AGENTS verbatim). NOT the same set as CODE_AGENTS.
const CODE_STANDARDS_AGENTS = new Set([
    'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer',
    'frontend-developer', 'fullstack-developer', 'integration-tester',
    'performance-optimizer', 'planner', 'security-auditor', 'solution-architect',
    'spec-compliance-reviewer', 'tester',
]);

const diskAgents = fs
    .readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));

const read = name => fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
const hasBlock = (body, tag) =>
    body.includes(`<!-- SYNC:${tag} -->`) && body.includes(`<!-- /SYNC:${tag} -->`);

// Skills carrying a SKILL.md (a subdir like `shared/` without one is excluded).
const skillNames = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map(d => d.name);
const readSkill = name => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');

// Count ONLY real fences at column 0 (multiline-anchored). A block body may
// document the fence syntax inline — e.g. the shared-protocol-duplication-policy
// body contains a backtick-wrapped `<!-- SYNC:tag -->` example mid-line. That is
// prose, not a fence, and must not skew the balance. Every authored fence is
// emitted at line-start by sync-hooks-to-skills.py / the skill+agent injectors,
// so `^` is exact — a genuinely missing or indented close is still caught.
const fenceBalance = body => ({
    opens: (body.match(/^<!-- SYNC:/gm) || []).length,
    closes: (body.match(/^<!-- \/SYNC:/gm) || []).length,
});

module.exports = {
    name: 'agent-universal-rules',
    tests: [
        {
            name: '[agent-universal-rules] TC-UAR-003 every agent carries all Core-6 open+close tags',
            fn: () => {
                const missing = [];
                for (const name of diskAgents) {
                    const body = read(name);
                    for (const tag of CORE_TAGS) {
                        if (!hasBlock(body, tag)) missing.push(`${name} → ${tag}`);
                    }
                }
                assertEqual(missing.length, 0, `agents missing Core-6 blocks:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-004 code agents carry all code tags; core-only carry none',
            fn: () => {
                const problems = [];
                for (const name of diskAgents) {
                    if (!CODE_AGENTS.has(name) && !CORE_ONLY_AGENTS.has(name)) continue; // Test C owns this
                    const body = read(name);
                    const isCode = CODE_AGENTS.has(name);
                    for (const tag of CODE_TAGS) {
                        const present = hasBlock(body, tag);
                        if (isCode && !present) problems.push(`code agent ${name} MISSING ${tag}`);
                        if (!isCode && present) problems.push(`core-only agent ${name} LEAKS ${tag}`);
                    }
                }
                assertEqual(problems.length, 0, `code-tier violations:\n  ${problems.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-005 disk agent set == classified set, disjoint (new-agent guard)',
            fn: () => {
                const both = [...CODE_AGENTS].filter(a => CORE_ONLY_AGENTS.has(a));
                assertEqual(both.length, 0, `agents in BOTH tier sets: ${both.join(', ')}`);

                const classified = new Set([...CODE_AGENTS, ...CORE_ONLY_AGENTS]);
                const unclassified = diskAgents.filter(a => !classified.has(a));
                assertEqual(
                    unclassified.length, 0,
                    `unclassified agent(s) on disk — add to CODE_AGENTS or CORE_ONLY_AGENTS in this suite AND sync-hooks-to-skills.py: ${unclassified.join(', ')}`,
                );

                const onDisk = new Set(diskAgents);
                const ghosts = [...classified].filter(a => !onDisk.has(a));
                assertEqual(
                    ghosts.length, 0,
                    `classified agent(s) not on disk (renamed/deleted?): ${ghosts.join(', ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-006 SYNC open/close tags balance per agent',
            fn: () => {
                const unbalanced = [];
                for (const name of diskAgents) {
                    const { opens, closes } = fenceBalance(read(name));
                    if (opens !== closes) unbalanced.push(`${name}: ${opens} open / ${closes} close`);
                }
                assertTrue(unbalanced.length === 0, `unbalanced SYNC tags:\n  ${unbalanced.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-008 SYNC open/close tags balance per skill',
            fn: () => {
                assertTrue(skillNames.length > 0, `no SKILL.md files found under ${SKILLS_DIR}`);
                const unbalanced = [];
                for (const name of skillNames) {
                    const { opens, closes } = fenceBalance(readSkill(name));
                    if (opens !== closes) unbalanced.push(`${name}: ${opens} open / ${closes} close`);
                }
                assertTrue(unbalanced.length === 0, `unbalanced SYNC tags in skills:\n  ${unbalanced.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-007 agent-code-standards present iff agent in CODE_STANDARDS_AGENTS',
            fn: () => {
                const problems = [];
                for (const name of diskAgents) {
                    const present = hasBlock(read(name), 'agent-code-standards');
                    const expected = CODE_STANDARDS_AGENTS.has(name);
                    if (expected && !present) problems.push(`code-standards agent ${name} MISSING agent-code-standards`);
                    if (!expected && present) problems.push(`non-code-standards agent ${name} LEAKS agent-code-standards`);
                }
                assertEqual(problems.length, 0, `agent-code-standards gating violations:\n  ${problems.join('\n  ')}`);

                // CODE_STANDARDS_AGENTS must all exist on disk (catch rename/delete).
                const onDisk = new Set(diskAgents);
                const ghosts = [...CODE_STANDARDS_AGENTS].filter(a => !onDisk.has(a));
                assertEqual(ghosts.length, 0, `CODE_STANDARDS_AGENTS not on disk: ${ghosts.join(', ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-009 skills with understand-code-first also carry evidence-based-reasoning',
            fn: () => {
                // Prefix match catches both the full block (`<!-- SYNC:tag -->`) and the
                // condensed reminder (`<!-- SYNC:tag:reminder -->`). A code-investigation
                // skill that demands code reading must also demand evidence discipline.
                const missing = [];
                for (const name of skillNames) {
                    const body = readSkill(name);
                    const hasUnderstand = body.includes('<!-- SYNC:understand-code-first');
                    if (!hasUnderstand) continue;
                    const hasEvidence = body.includes('<!-- SYNC:evidence-based-reasoning');
                    if (!hasEvidence) missing.push(name);
                }
                assertEqual(
                    missing.length, 0,
                    `skill(s) carry understand-code-first but NOT evidence-based-reasoning (add the EBR block — full or :reminder):\n  ${missing.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-010 web-research carries its own SYNC:web-research domain block',
            fn: () => {
                const body = readSkill('web-research');
                assertTrue(
                    body.includes('<!-- SYNC:web-research'),
                    'web-research/SKILL.md is missing its own SYNC:web-research domain block',
                );
            },
        },
    ],
};
