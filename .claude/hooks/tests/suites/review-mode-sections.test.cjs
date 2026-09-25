/**
 * Review Mode Sections Test Suite
 *
 * The inline review skills keep every protocol body (`SYNC:*` block) in SKILL.md, because they are
 * listed in `inlineSkills` (BR-PDL-11), but their mode-only prose moves to point-of-use references:
 * why-review's full mode lives in `references/full-mode.md` and its `--fix-loop` mode in
 * `references/fix-loop.md`. SKILL.md is a router: mode detection, the terminal validate-findings
 * routine, and a BLOCKING first read of the reference for the mode that runs. Validate calls load the
 * router only.
 *
 * Coverage:
 *   TC-PDL-043 — the router stays under its byte cap, keeps the validate routine and the recursion
 *                guard, holds none of the moved full-mode sections and no `## Fix-Loop Mode`
 *                section, and still carries every SYNC body and `:reminder` digest it carried before
 *                the split; the references hold the moved sections and no SYNC body.
 *   TC-PDL-044 — full mode's first action is the read of `references/full-mode.md`: the router's
 *                first section after mode detection is the pointer, the Quick Summary step says so,
 *                and the reference opens with the loop binding (the first action after the read).
 *   TC-PDL-045 — the coverage verifier and the four suites that pin why-review text pass after the
 *                split (spawned; every original assertion and mutant is theirs, unchanged).
 *   TC-PDL-046 — changes-review and workflow-review-changes moved their `--fix-loop` mode to
 *                `references/fix-loop.md` (one FIX-LOOP-MODE block, no SYNC body); SKILL.md holds a
 *                BLOCKING first-read pointer and no mode section, stays under its byte cap, and still
 *                carries every SYNC body and `:reminder` digest it carried before the split. The
 *                suites that pin the moved text and the wf-cycle verifier pass (spawned).
 *   TC-PDL-064 — the reviewer-injection template is ONE generated file,
 *                `shared/protocols/review-protocol-injection.md`, byte-equal to the canonical
 *                `SYNC:review-protocol-injection` body, with all 11 protocol sections carrying their
 *                bodies (none replaced by a path). workflow-review-changes' spawn step names that
 *                file and says copy it WHOLESALE; changes-review keeps the full inline body.
 *
 * Portability: the rule rows run the checkers on a temp fixture skill, so they pass in any project.
 * The live rows assert this framework's own review skills and run only in the framework repo, through
 * the synchronous guard (the runner reads `skip` while it builds the test list; an async guard would
 * report a false pass). The spawned run scrubs inherited switches and points HOME, USERPROFILE,
 * TMPDIR, TEMP and TMP at a temp dir. Paths are built with node:path; no OS-specific behavior.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { childEnv, removeTempDir } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { extractSyncBody, normalizeEol } = require('../../../scripts/lib/extract-sync-block.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.resolve(HOOKS_DIR, '..');
const REPO_ROOT = path.resolve(CLAUDE_DIR, '..');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const SPAWN_TIMEOUT_MS = 300000;

// Computed synchronously at load: the runner reads `skip` before it runs a test.
const LIVE_SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own review skills (framework-repo signal)';

// ── why-review split contract ────────────────────────────────────────────────────────────────────
const WHY_REVIEW = {
    maxRouterBytes: 140000,
    // The terminal validate body and the recursion guard must load with the router alone.
    routerPhrases: [
        '## Findings Validation Routine (validate-findings mode body — TERMINAL)',
        '> **Recursion guard (NON-NEGOTIABLE):**',
        '`validate-findings` beats `--fix-loop`',
    ],
    // Full-mode sections that live in references/full-mode.md, never in the router.
    movedHeadings: [
        '## Bind the Self-Recursive Review Loop',
        '## Task Bootstrap',
        '## Adversarial Review Mindset',
        '## Trade-Off Interrogation Gate',
        '## Target Resolution',
        '### Code-Change Review Path',
        '### Integration-Test-Review Linkage',
        '## Validation Checklist',
        '## Residual Risk Gate',
        '## Output Format',
        '## Round 2: Adversarial Re-Review',
        '## Report Closure Contract',
        '## Findings Validation Gate',
    ],
    // Every protocol block why-review carried before the split (R2-01: all stay in SKILL.md).
    syncTags: [
        'end-to-start-debugger-trace', 'behavioral-delta-matrix', 'nested-task-creation',
        'project-reference-docs-guide', 'cross-stack-impact-trace', 'cross-service-check',
        'task-tracking-external-report', 'critical-thinking-mindset', 'sequential-thinking-protocol',
        'ai-mistake-prevention', 'evidence-based-reasoning', 'double-round-trip-review',
        'fresh-context-review', 'review-protocol-injection', 'graph-impact-analysis', 'severity-rubric',
        'goal-contract-satisfaction-loop', 'trade-off-interrogation-gate', 'parallel-subagent-dispatch',
        'project-protocol-overlay', 'review-principle-awareness',
        'task-tracking-external-report:reminder', 'project-reference-docs-guide:reminder',
        'cross-stack-impact-trace:reminder', 'cross-service-check:reminder',
        'end-to-start-debugger-trace:reminder', 'nested-task-creation:reminder',
        'goal-contract-satisfaction-loop:reminder', 'severity-rubric:reminder',
        'double-round-trip-review:reminder', 'trade-off-interrogation-gate:reminder',
        'parallel-subagent-dispatch:reminder', 'project-protocol-overlay:reminder',
        'review-principle-awareness:reminder', 'critical-thinking-mindset:reminder',
        'sequential-thinking-protocol:reminder', 'ai-mistake-prevention:reminder',
    ],
};

const FIX_LOOP_START = '<!-- FIX-LOOP-MODE:START -->';
const FIX_LOOP_END = '<!-- FIX-LOOP-MODE:END -->';
const POINTER_HEADING = '## Mode References';
const FIRST_READ = /FIRST action after mode detection is to read `references\/full-mode\.md` in full \(BLOCKING\)/;

const lf = text => String(text).replace(/\r\n?/g, '\n');
const stripSync = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const count = (text, needle) => text.split(needle).length - 1;
const headingLines = (text, prefix) => text.split('\n').filter(line => line === prefix || line.startsWith(`${prefix} `) || line.startsWith(`${prefix}(`) || line.startsWith(`${prefix}:`));

/** Read a skill directory as { router, references: { 'full-mode.md': text, ... } }, LF line endings. */
function loadSkill(dir) {
    const refsDir = path.join(dir, 'references');
    const references = {};
    if (fs.existsSync(refsDir)) {
        for (const name of fs.readdirSync(refsDir).filter(entry => entry.endsWith('.md')).sort()) {
            references[name] = lf(fs.readFileSync(path.join(refsDir, name), 'utf8'));
        }
    }
    return { router: lf(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')), references };
}

/** TC-PDL-043 rule: returns one problem line per broken clause of the router/reference split. */
function checkRouterSplit(skill, spec) {
    const problems = [];
    const { router, references } = skill;
    const bytes = Buffer.byteLength(router, 'utf8');
    if (bytes > spec.maxRouterBytes) problems.push(`router is ${bytes} B, over the ${spec.maxRouterBytes} B cap`);
    for (const phrase of spec.routerPhrases) {
        if (!router.includes(phrase)) problems.push(`router lacks: ${phrase}`);
    }
    const localRouter = stripSync(router);
    const refText = Object.values(references).join('\n');
    const fullMode = references['full-mode.md'] ?? '';
    for (const heading of spec.movedHeadings) {
        if (headingLines(localRouter, heading).length > 0) problems.push(`router still holds the moved section: ${heading}`);
        if (headingLines(fullMode, heading).length !== 1) problems.push(`references/full-mode.md must hold exactly one: ${heading}`);
    }
    if (/^## Fix-Loop Mode/m.test(localRouter)) problems.push('router still holds a `## Fix-Loop Mode` section');
    const fixLoop = references['fix-loop.md'] ?? '';
    if (!/^<!-- FIX-LOOP-MODE:START -->\s*## Fix-Loop Mode \(`--fix-loop`/m.test(fixLoop) || count(fixLoop, FIX_LOOP_START) !== 1 || count(fixLoop, FIX_LOOP_END) !== 1) {
        problems.push('references/fix-loop.md must hold the one delimited `## Fix-Loop Mode` section');
    }
    for (const tag of spec.syncTags) {
        if (count(router, `<!-- SYNC:${tag} -->`) !== 1 || count(router, `<!-- /SYNC:${tag} -->`) !== 1) {
            problems.push(`router must carry exactly one SYNC:${tag} block`);
        }
    }
    if (/<!-- \/?SYNC:/.test(refText)) problems.push('a reference carries a SYNC block (protocol bodies stay in SKILL.md)');
    return problems;
}

/** TC-PDL-044 rule: full mode's first action is the read of references/full-mode.md. */
function checkFirstRead(skill) {
    const problems = [];
    const local = stripSync(skill.router);
    const h2 = local.split('\n').filter(line => line.startsWith('## '));
    const modeIndex = h2.findIndex(line => line.startsWith('## Review Mode'));
    if (modeIndex < 0 || !(h2[modeIndex + 1] || '').startsWith(POINTER_HEADING)) {
        problems.push(`the first section after mode detection must be ${POINTER_HEADING}`);
    }
    const start = local.indexOf(`\n${POINTER_HEADING}`);
    const end = start < 0 ? -1 : local.indexOf('\n## ', start + 1);
    const pointer = start < 0 ? '' : local.slice(start, end < 0 ? undefined : end);
    if (!FIRST_READ.test(pointer)) problems.push('the pointer section does not make the reference read the BLOCKING first action');
    if (!/^- \*\*STEP 2 — FULL-MODE FIRST ACTION\*\* → read `references\/full-mode\.md` in full \(BLOCKING/m.test(local)) {
        problems.push('the Quick Summary STEP 2 does not start with the reference read');
    }
    const firstRefHeading = (skill.references['full-mode.md'] || '').split('\n').find(line => line.startsWith('## ')) || '';
    if (!firstRefHeading.startsWith('## Bind the Self-Recursive Review Loop')) {
        problems.push('references/full-mode.md must open with the loop binding (the first action after the read)');
    }
    return problems;
}

// ── fix-loop split contract (changes-review, workflow-review-changes) ──────────────────────────────
const FIX_LOOP_POINTER_HEADING = '## `--fix-loop` Mode — Read `references/fix-loop.md` First (BLOCKING)';
const FIX_LOOP_FIRST_READ = /read `references\/fix-loop\.md` in full FIRST \(BLOCKING\)/;
const FIX_LOOP_SPLITS = {
    'changes-review': {
        // Pre-split 319,284 B; re-inlining the ~24 KB mode would break the cap.
        maxRouterBytes: 305000,
        modeHeading: '## Mode: Fix-Loop (`--fix-loop`)',
        // Every protocol block the skill carried before the split (none sat in the moved range).
        syncTags: [
            'review-policy', 'cross-stack-impact-trace', 'cross-service-check', 'systematic-review-batching',
            'end-to-start-debugger-trace', 'critical-thinking-mindset', 'sequential-thinking-protocol',
            'understand-code-first', 'design-patterns-quality', 'complexity-prevention', 'double-round-trip-review',
            'fresh-context-review', 'review-protocol-injection', 'logic-and-intention-review', 'bug-detection',
            'test-spec-verification', 'integration-test-sync-check', 'translation-sync-check',
            'category-review-thinking', 'graph-assisted-investigation', 'nested-task-creation',
            'project-reference-docs-guide', 'task-tracking-external-report', 'source-test-drift-check',
            'spec-drift-adjudication', 'ai-mistake-prevention', 'severity-rubric', 'goal-contract-satisfaction-loop',
            'trade-off-interrogation-gate', 'domain-entity-change-gate', 'design-review-checklist',
            'parallel-subagent-dispatch', 'project-protocol-overlay', 'review-principle-awareness',
            'domain-entity-change-gate:reminder', 'understand-code-first:reminder', 'evidence-based-reasoning:reminder',
            'design-patterns-quality:reminder', 'complexity-prevention:reminder', 'graph-assisted-investigation:reminder',
            'logic-and-intention-review:reminder', 'bug-detection:reminder', 'test-spec-verification:reminder',
            'integration-test-sync-check:reminder', 'translation-sync-check:reminder', 'cross-stack-impact-trace:reminder',
            'cross-service-check:reminder', 'critical-thinking-mindset:reminder', 'sequential-thinking-protocol:reminder',
            'ai-mistake-prevention:reminder', 'task-tracking-external-report:reminder',
            'project-reference-docs-guide:reminder', 'end-to-start-debugger-trace:reminder',
            'nested-task-creation:reminder', 'goal-contract-satisfaction-loop:reminder',
            'systematic-review-batching:reminder', 'severity-rubric:reminder', 'category-review-thinking:reminder',
            'double-round-trip-review:reminder', 'trade-off-interrogation-gate:reminder',
            'parallel-subagent-dispatch:reminder', 'project-protocol-overlay:reminder',
            'design-review-checklist:reminder', 'review-principle-awareness:reminder',
        ],
    },
    'workflow-review-changes': {
        // Pre-split 160,124 B.
        maxRouterBytes: 150000,
        modeHeading: '## Mode: `--fix-loop` (OPTIONAL outer convergence loop)',
        syncTags: [
            'review-policy', 'parallel-phase-advancement', 'end-to-start-debugger-trace', 'fresh-context-review',
            'incremental-persistence', 'subagent-return-contract', 'ai-mistake-prevention', 'nested-task-creation',
            'task-tracking-external-report', 'critical-thinking-mindset', 'project-reference-docs-guide',
            'goal-contract-satisfaction-loop', 'trade-off-interrogation-gate', 'parallel-subagent-dispatch',
            'project-protocol-overlay', 'severity-rubric', 'session-goal-ledger', 'workflow-registry-binding',
            'review-principle-awareness',
            'critical-thinking-mindset:reminder', 'ai-mistake-prevention:reminder',
            'task-tracking-external-report:reminder', 'project-reference-docs-guide:reminder',
            'end-to-start-debugger-trace:reminder', 'nested-task-creation:reminder',
            'goal-contract-satisfaction-loop:reminder', 'trade-off-interrogation-gate:reminder',
            'parallel-subagent-dispatch:reminder', 'project-protocol-overlay:reminder', 'severity-rubric:reminder',
            'review-principle-awareness:reminder', 'session-goal-ledger:reminder',
        ],
    },
};

/** TC-PDL-046 rule: the fix-loop mode lives in references/fix-loop.md; SKILL.md points at it and keeps every SYNC body. */
function checkFixLoopSplit(skill, spec) {
    const problems = [];
    const { router, references } = skill;
    const bytes = Buffer.byteLength(router, 'utf8');
    if (bytes > spec.maxRouterBytes) problems.push(`SKILL.md is ${bytes} B, over the ${spec.maxRouterBytes} B cap`);
    const local = stripSync(router);
    if (/^## Mode: (?:Fix-Loop|`--fix-loop`)/m.test(local)) problems.push('SKILL.md still holds the fix-loop mode section');
    if (local.includes(FIX_LOOP_START) || local.includes(FIX_LOOP_END)) problems.push('SKILL.md still holds a FIX-LOOP-MODE block');
    const pointers = local.split('\n').filter(line => line === FIX_LOOP_POINTER_HEADING);
    if (pointers.length !== 1) {
        problems.push(`SKILL.md must hold exactly one pointer section: ${FIX_LOOP_POINTER_HEADING}`);
    } else {
        const start = local.indexOf(`\n${FIX_LOOP_POINTER_HEADING}`);
        const end = local.indexOf('\n## ', start + 1);
        if (!FIX_LOOP_FIRST_READ.test(local.slice(start, end < 0 ? undefined : end))) {
            problems.push('the pointer section does not make the reference read the BLOCKING first action');
        }
    }
    for (const tag of spec.syncTags) {
        if (count(router, `<!-- SYNC:${tag} -->`) !== 1 || count(router, `<!-- /SYNC:${tag} -->`) !== 1) {
            problems.push(`SKILL.md must carry exactly one SYNC:${tag} block`);
        }
    }
    const fixLoop = references['fix-loop.md'] ?? '';
    const open = fixLoop.indexOf(FIX_LOOP_START);
    const close = fixLoop.indexOf(FIX_LOOP_END);
    if (count(fixLoop, FIX_LOOP_START) !== 1 || count(fixLoop, FIX_LOOP_END) !== 1 || open > close) {
        problems.push('references/fix-loop.md must hold exactly one FIX-LOOP-MODE:START … END block');
    } else if (headingLines(fixLoop.slice(open, close), spec.modeHeading).length !== 1) {
        problems.push(`the FIX-LOOP-MODE block must hold the mode section: ${spec.modeHeading}`);
    }
    if (/<!-- \/?SYNC:/.test(Object.values(references).join('\n'))) problems.push('a reference carries a SYNC block (protocol bodies stay in SKILL.md)');
    return problems;
}

// ── reviewer-injection template (one generated file) ─────────────────────────────────────────────
const INJECTION_TAG = 'review-protocol-injection';
const INJECTION_FILE = '.claude/skills/shared/protocols/review-protocol-injection.md';
const INJECTION_SECTIONS = 11;
const MIN_SECTION_BODY_CHARS = 200;

/** Inner text of a carrier's `<!-- SYNC:tag -->` block, trimmed; null when absent. */
function carrierBody(text, tag) {
    const open = `<!-- SYNC:${tag} -->`;
    const start = text.indexOf(open);
    const end = text.indexOf(`<!-- /SYNC:${tag} -->`, start + 1);
    return start < 0 || end < 0 ? null : text.slice(start + open.length, end).trim();
}

/** TC-PDL-064 rule: the template file equals canonical, embeds 11 full bodies, and both spawn steps copy it WHOLESALE. */
function checkInjectionTemplate({ canonical, projection, workflowRouter, changesRouter }) {
    const problems = [];
    const body = extractSyncBody(canonical, INJECTION_TAG);
    if (!body) return [`canonical has no SYNC:${INJECTION_TAG} block`];
    const template = normalizeEol(projection);
    if (template !== `${body}\n`) problems.push(`${INJECTION_FILE} does not byte-match the canonical SYNC:${INJECTION_TAG} body`);
    const start = template.indexOf('\n## Protocols');
    const end = start < 0 ? -1 : template.indexOf('\n## Reference Docs', start + 1);
    if (start < 0 || end < 0) {
        problems.push('the template lacks its `## Protocols` … `## Reference Docs` region');
    } else {
        const sections = template.slice(start, end).split(/\n(?=### )/).slice(1);
        if (sections.length !== INJECTION_SECTIONS) problems.push(`the template holds ${sections.length} protocol sections, expected ${INJECTION_SECTIONS}`);
        for (const section of sections) {
            const [heading, ...rest] = section.split('\n');
            const text = rest.join('\n').trim();
            const pathOnly = /^(?:read |see )?`?[^\s`]+\.md`?\.?$/i.test(text);
            if (pathOnly || text.length < MIN_SECTION_BODY_CHARS) problems.push(`protocol section is not a full body: ${heading}`);
        }
    }
    const workflowLocal = stripSync(normalizeEol(workflowRouter));
    if (!workflowLocal.includes(`\`${INJECTION_FILE}\``)) problems.push(`workflow-review-changes' spawn step does not name ${INJECTION_FILE}`);
    if (!/copy it WHOLESALE into each reviewer prompt, replacing only the `\{placeholders\}`/.test(workflowLocal)) {
        problems.push('workflow-review-changes\' spawn step does not say copy it WHOLESALE, replacing only the {placeholders}');
    }
    if (!/NEVER paraphrase, summarize or drop a protocol section/.test(workflowLocal)) {
        problems.push('workflow-review-changes\' spawn step does not forbid paraphrasing or dropping a protocol section');
    }
    const inline = carrierBody(normalizeEol(changesRouter), INJECTION_TAG);
    if (inline !== body) problems.push(`changes-review's inline SYNC:${INJECTION_TAG} body is missing or differs from canonical`);
    else if (!/WHOLESALE/.test(inline)) problems.push(`changes-review's inline SYNC:${INJECTION_TAG} body does not say copy WHOLESALE`);
    return problems;
}

// ── fixture skill (rule rows) ────────────────────────────────────────────────────────────────────
const FIXTURE_SPEC = {
    maxRouterBytes: 4000,
    routerPhrases: ['## Findings Validation Routine (validate-findings mode body — TERMINAL)', '> **Recursion guard (NON-NEGOTIABLE):**'],
    movedHeadings: ['## Bind the Self-Recursive Review Loop', '## Adversarial Review Mindset'],
    syncTags: ['severity-rubric', 'severity-rubric:reminder'],
};

function fixtureFiles() {
    return {
        'SKILL.md': [
            '---', 'name: fixture-review', "description: 'Fixture.'", '---', '',
            '## Quick Summary', '',
            '- **STEP 2 — FULL-MODE FIRST ACTION** → read `references/full-mode.md` in full (BLOCKING), then bind the loop.', '',
            '## Review Mode (DETECT FIRST)', '',
            '> **Recursion guard (NON-NEGOTIABLE):** validate-findings is terminal.', '',
            '## Mode References (read at point of use — BLOCKING)', '',
            '- **Full mode (default):** your FIRST action after mode detection is to read `references/full-mode.md` in full (BLOCKING).', '',
            '## Findings Validation Routine (validate-findings mode body — TERMINAL)', '',
            'Validate each finding.', '',
            '<!-- SYNC:severity-rubric -->', '> Rubric body.', '<!-- /SYNC:severity-rubric -->', '',
            '<!-- SYNC:severity-rubric:reminder -->', '- Rubric reminder.', '<!-- /SYNC:severity-rubric:reminder -->', '',
        ].join('\n'),
        'references/full-mode.md': [
            '# Fixture — Full Mode', '',
            '## Bind the Self-Recursive Review Loop (FIRST ACTION)', '', 'Bind it.', '',
            '## Adversarial Review Mindset', '', 'Be a skeptic.', '',
        ].join('\n'),
        'references/fix-loop.md': [
            '# Fixture — Fix-Loop Mode', '', FIX_LOOP_START, '', '## Fix-Loop Mode (`--fix-loop` — fixture)', '', 'Loop.', '', FIX_LOOP_END, '',
        ].join('\n'),
    };
}

const FIXTURE_FIX_LOOP_SPEC = {
    maxRouterBytes: 4000,
    modeHeading: '## Mode: Fix-Loop (`--fix-loop`)',
    syncTags: ['severity-rubric', 'severity-rubric:reminder'],
};

function fixLoopFixtureFiles() {
    return {
        'SKILL.md': [
            '---', 'name: fixture-review', "description: 'Fixture.'", '---', '',
            '## Review Scope', '', 'The diff.', '',
            FIX_LOOP_POINTER_HEADING, '',
            'When the flag is present, read `references/fix-loop.md` in full FIRST (BLOCKING).', '',
            '## Next Steps', '', 'Done.', '',
            '<!-- SYNC:severity-rubric -->', '> Rubric body.', '<!-- /SYNC:severity-rubric -->', '',
            '<!-- SYNC:severity-rubric:reminder -->', '- Rubric reminder.', '<!-- /SYNC:severity-rubric:reminder -->', '',
        ].join('\n'),
        'references/fix-loop.md': [
            '# Fixture — Fix-Loop Mode', '', FIX_LOOP_START, '', '## Mode: Fix-Loop (`--fix-loop`)', '', 'Loop until zero fixes.', '', FIX_LOOP_END, '',
        ].join('\n'),
    };
}

/** An in-memory injection fixture: canonical, its projection, and the two spawn-step carriers. */
function injectionFixture() {
    const sections = Array.from({ length: INJECTION_SECTIONS }, (_, i) => `### Protocol ${i + 1}\n\n${`Rule ${i + 1} body text. `.repeat(12).trim()}`);
    const body = [
        '> **Review Protocol Injection** — copy the template WHOLESALE into every reviewer prompt.', '',
        '## Task', '', 'Review {target}.', '',
        '## Protocols (follow VERBATIM)', '', sections.join('\n\n'), '',
        '## Reference Docs (READ before reviewing)', '', '- {docs}',
    ].join('\n');
    return {
        canonical: `# Canonical\n\n---\n\n## SYNC:${INJECTION_TAG}\n\n${body}\n\n---\n\n## SYNC:other\n\nOther.\n`,
        projection: `${body}\n`,
        workflowRouter: [
            '## Spawn', '',
            `- Full review protocols per \`SYNC:${INJECTION_TAG}\`, verbatim in the prompt. The whole template is the generated file \`${INJECTION_FILE}\`: read it ONCE per batch and copy it WHOLESALE into each reviewer prompt, replacing only the \`{placeholders}\`. NEVER paraphrase, summarize or drop a protocol section.`, '',
        ].join('\n'),
        changesRouter: `## Spawn\n\nCopy the template.\n\n<!-- SYNC:${INJECTION_TAG} -->\n\n${body}\n\n<!-- /SYNC:${INJECTION_TAG} -->\n`,
    };
}

/** Write the fixture skill (optionally mutated per file) to a temp dir, load it, remove it. */
function withFixtureSkill(mutate, fn, make = fixtureFiles) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-mode-sections-'));
    try {
        const files = make();
        if (mutate) mutate(files);
        const dir = path.join(temp, '.claude', 'skills', 'fixture-review');
        for (const [rel, text] of Object.entries(files)) {
            const file = path.join(dir, ...rel.split('/'));
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, text);
        }
        return fn(loadSkill(dir));
    } finally {
        removeTempDir(temp);
    }
}

/** A child env with inherited switches removed and HOME/USERPROFILE/TMPDIR/TEMP/TMP at `temp`. */
function scrubbedEnv(temp) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined, NODE_TEST_CONTEXT: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv(overrides);
}

const tests = [
    {
        name: '[review-mode-sections] TC-PDL-043: a valid fixture split passes; each broken clause is named',
        fn: () => {
            // Given a fixture router with its references, When checked, Then no problem is reported
            withFixtureSkill(null, skill => assert.deepEqual(checkRouterSplit(skill, FIXTURE_SPEC), []));
            // When a moved section comes back into the router, Then it is named
            withFixtureSkill(files => { files['SKILL.md'] += '\n## Adversarial Review Mindset\n\nBack.\n'; },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('router still holds the moved section: ## Adversarial Review Mindset'))));
            // When the fix-loop section is inlined into the router, Then it is named
            withFixtureSkill(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('`## Fix-Loop Mode` section'))));
            // When a SYNC body leaves the router for a reference, Then both halves are named
            withFixtureSkill(files => {
                const block = '<!-- SYNC:severity-rubric -->\n> Rubric body.\n<!-- /SYNC:severity-rubric -->\n';
                files['SKILL.md'] = files['SKILL.md'].replace(block, '');
                files['references/full-mode.md'] += `\n${block}`;
            }, skill => {
                const problems = checkRouterSplit(skill, FIXTURE_SPEC);
                assert.ok(problems.some(p => p.includes('exactly one SYNC:severity-rubric block')), problems.join('\n'));
                assert.ok(problems.some(p => p.includes('a reference carries a SYNC block')), problems.join('\n'));
            });
            // When the router grows past its cap or loses the validate routine, Then it is named
            withFixtureSkill(files => { files['SKILL.md'] += `\n${'x'.repeat(5000)}\n`; },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('over the 4000 B cap'))));
            withFixtureSkill(files => { files['SKILL.md'] = files['SKILL.md'].replace('## Findings Validation Routine', '## Validation'); },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('router lacks: ## Findings Validation Routine'))));
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-044: the fixture pointer is the first full-mode action; a late or soft pointer is named',
        fn: () => {
            // Given the fixture, When checked, Then the first-read rule holds
            withFixtureSkill(null, skill => assert.deepEqual(checkFirstRead(skill), []));
            // When the pointer is no longer the first section after mode detection, Then it is named
            withFixtureSkill(files => {
                files['SKILL.md'] = files['SKILL.md'].replace('## Mode References', '## Other\n\nText.\n\n## Mode References');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('first section after mode detection'))));
            // When the read is no longer BLOCKING, Then it is named
            withFixtureSkill(files => {
                files['SKILL.md'] = files['SKILL.md'].replace('`references/full-mode.md` in full (BLOCKING).', '`references/full-mode.md` when useful.');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('BLOCKING first action'))));
            // When the reference no longer opens with the loop binding, Then it is named
            withFixtureSkill(files => {
                files['references/full-mode.md'] = files['references/full-mode.md'].replace('## Bind the Self-Recursive Review Loop (FIRST ACTION)', '## Notes');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('open with the loop binding'))));
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-043: why-review router is under 140,000 B and keeps every protocol body',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's why-review skill, When the split is checked, Then no clause is broken
            const skill = loadSkill(path.join(SKILLS_DIR, 'why-review'));
            const problems = checkRouterSplit(skill, WHY_REVIEW);
            assert.deepEqual(problems, [], `why-review split:\n  ${problems.join('\n  ')}`);
            // And the check is not vacuous: the router is real and the references exist
            assert.ok(Buffer.byteLength(skill.router, 'utf8') > 50000, 'router looks truncated');
            assert.ok(skill.references['full-mode.md'] && skill.references['fix-loop.md'], 'both references exist');
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-044: why-review full mode reads references/full-mode.md first',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's why-review skill, When the first-read rule is checked, Then it holds
            const problems = checkFirstRead(loadSkill(path.join(SKILLS_DIR, 'why-review')));
            assert.deepEqual(problems, [], `why-review first read:\n  ${problems.join('\n  ')}`);
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-045: the coverage verifier and the four pinned why-review suites pass after the split',
        skip: LIVE_SKIP,
        fn: () => runPinnedChecks({
            // Given the read-only verifier and the four suites that pin why-review text
            verifiers: [path.join(CLAUDE_DIR, 'scripts', 'codex', 'verify-review-validate-coverage.mjs')],
            suites: [
                path.join(CLAUDE_DIR, 'scripts', 'tests', 'review-closure-contract.test.cjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'review-policy-consumers.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'prompt-contracts.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'framework-policy-regressions.test.mjs'),
            ],
        }),
    },
    {
        name: '[review-mode-sections] TC-PDL-046: a valid fixture fix-loop split passes; each broken clause is named',
        fn: () => {
            const check = skill => checkFixLoopSplit(skill, FIXTURE_FIX_LOOP_SPEC);
            const named = (mutate, needle) => withFixtureSkill(mutate, skill => {
                const problems = check(skill);
                assert.ok(problems.some(p => p.includes(needle)), `expected "${needle}" in:\n  ${problems.join('\n  ')}`);
            }, fixLoopFixtureFiles);
            // Given a fixture SKILL.md with its fix-loop reference, When checked, Then no problem is reported
            withFixtureSkill(null, skill => assert.deepEqual(check(skill), []), fixLoopFixtureFiles);
            // When the mode section is inlined back into SKILL.md, Then both the section and the block are named
            named(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; }, 'still holds the fix-loop mode section');
            named(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; }, 'still holds a FIX-LOOP-MODE block');
            // When the pointer is removed or no longer BLOCKING, Then it is named
            named(files => { files['SKILL.md'] = files['SKILL.md'].replace(`${FIX_LOOP_POINTER_HEADING}\n`, ''); }, 'exactly one pointer section');
            named(files => { files['SKILL.md'] = files['SKILL.md'].replace('in full FIRST (BLOCKING)', 'when useful'); }, 'BLOCKING first action');
            // When a SYNC body leaves SKILL.md for the reference, Then both halves are named
            named(files => {
                const block = '<!-- SYNC:severity-rubric -->\n> Rubric body.\n<!-- /SYNC:severity-rubric -->\n';
                files['SKILL.md'] = files['SKILL.md'].replace(block, '');
                files['references/fix-loop.md'] += `\n${block}`;
            }, 'exactly one SYNC:severity-rubric block');
            named(files => { files['references/fix-loop.md'] += '\n<!-- SYNC:x -->\nx\n<!-- /SYNC:x -->\n'; }, 'a reference carries a SYNC block');
            // When the reference loses its markers or its mode section, Then it is named
            named(files => { files['references/fix-loop.md'] = files['references/fix-loop.md'].replace(FIX_LOOP_END, ''); }, 'exactly one FIX-LOOP-MODE:START');
            named(files => { files['references/fix-loop.md'] = files['references/fix-loop.md'].replace('## Mode: Fix-Loop', '## Loop'); }, 'must hold the mode section');
            // When SKILL.md grows past its cap, Then it is named
            named(files => { files['SKILL.md'] += `\n${'x'.repeat(5000)}\n`; }, 'over the 4000 B cap');
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-046: changes-review and workflow-review-changes read references/fix-loop.md first and keep every protocol body',
        skip: LIVE_SKIP,
        fn: () => {
            for (const [name, spec] of Object.entries(FIX_LOOP_SPLITS)) {
                // Given the framework's skill, When the fix-loop split is checked, Then no clause is broken
                const skill = loadSkill(path.join(SKILLS_DIR, name));
                const problems = checkFixLoopSplit(skill, spec);
                assert.deepEqual(problems, [], `${name} fix-loop split:\n  ${problems.join('\n  ')}`);
                // And the check is not vacuous: SKILL.md is real and the reference holds the mode
                assert.ok(Buffer.byteLength(skill.router, 'utf8') > 50000, `${name} SKILL.md looks truncated`);
                assert.ok(Buffer.byteLength(skill.references['fix-loop.md'] || '', 'utf8') > 10000, `${name} references/fix-loop.md looks truncated`);
            }
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-046: the suites that pin the moved fix-loop text and the wf-cycle verifier pass',
        skip: LIVE_SKIP,
        // The three shared pinned suites already run under TC-PDL-045; these are the other two plus wf-cycle.
        fn: () => runPinnedChecks({
            verifiers: [path.join(CLAUDE_DIR, 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs')],
            suites: [
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'review-workflow-tooling-regressions.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'round3-prompt-contract.test.mjs'),
            ],
        }),
    },
    {
        name: '[review-mode-sections] TC-PDL-064: a valid fixture injection template passes; each broken clause is named',
        fn: () => {
            // Given a canonical template, its projection and both spawn steps, When checked, Then no problem is reported
            assert.deepEqual(checkInjectionTemplate(injectionFixture()), []);
            const named = (mutate, needle) => {
                const input = injectionFixture();
                mutate(input);
                const problems = checkInjectionTemplate(input);
                assert.ok(problems.some(p => p.includes(needle)), `expected "${needle}" in:\n  ${problems.join('\n  ')}`);
            };
            // When the projection drifts from canonical, Then it is named
            named(input => { input.projection = input.projection.replace('Rule 3 body', 'Rule three body'); }, 'does not byte-match');
            // When a protocol section is replaced by a path (in canonical and projection alike), Then it is named
            named(input => {
                const section = /### Protocol 4\n\n[^\n]+/;
                input.canonical = input.canonical.replace(section, '### Protocol 4\n\n`.claude/skills/shared/protocols/protocol-4.md`');
                input.projection = input.projection.replace(section, '### Protocol 4\n\n`.claude/skills/shared/protocols/protocol-4.md`');
            }, 'not a full body: ### Protocol 4');
            // When a protocol section is dropped, Then the count is named
            named(input => {
                const section = /\n\n### Protocol 11\n\n[^\n]+/;
                input.canonical = input.canonical.replace(section, '');
                input.projection = input.projection.replace(section, '');
            }, 'holds 10 protocol sections, expected 11');
            // When workflow-review-changes stops naming the file or stops saying WHOLESALE, Then it is named
            named(input => { input.workflowRouter = input.workflowRouter.replace(INJECTION_FILE, 'the template'); }, 'does not name');
            named(input => { input.workflowRouter = input.workflowRouter.replace('copy it WHOLESALE', 'summarize it'); }, 'copy it WHOLESALE');
            named(input => { input.workflowRouter = input.workflowRouter.replace('NEVER paraphrase, summarize or drop', 'You may trim'); }, 'forbid paraphrasing');
            // When changes-review's inline body drifts or is removed, Then it is named
            named(input => { input.changesRouter = input.changesRouter.replace('Rule 5 body', 'Rule five body'); }, 'differs from canonical');
            named(input => { input.changesRouter = '## Spawn\n\nRead the template file.\n'; }, 'missing or differs from canonical');
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-064: the generated injection template equals canonical and both spawn steps copy it WHOLESALE',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's canonical source, its projection and the two review skills
            const input = {
                canonical: fs.readFileSync(path.join(SKILLS_DIR, 'shared', 'sync-inline-versions.md'), 'utf8'),
                projection: fs.readFileSync(path.join(REPO_ROOT, ...INJECTION_FILE.split('/')), 'utf8'),
                workflowRouter: fs.readFileSync(path.join(SKILLS_DIR, 'workflow-review-changes', 'SKILL.md'), 'utf8'),
                changesRouter: fs.readFileSync(path.join(SKILLS_DIR, 'changes-review', 'SKILL.md'), 'utf8'),
            };
            // When the template contract is checked, Then no clause is broken
            const problems = checkInjectionTemplate(input);
            assert.deepEqual(problems, [], `review-protocol-injection template:\n  ${problems.join('\n  ')}`);
            // And the projection is one whole file (the index parts are hook-bin offsets, not files)
            assert.ok(Buffer.byteLength(input.projection, 'utf8') > 10000, 'the template file looks truncated');
        },
    },
];

/** Spawn read-only verifiers and node:test suites with a scrubbed env; assert every one passes, non-vacuously. */
function runPinnedChecks({ verifiers, suites }) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-mode-sections-run-'));
    try {
        const env = scrubbedEnv(temp);
        const run = args => spawnSync(process.execPath, args, { cwd: REPO_ROOT, env, encoding: 'utf8', windowsHide: true, timeout: SPAWN_TIMEOUT_MS });
        // When each verifier runs, Then it exits 0
        for (const verifier of verifiers) {
            const result = run([verifier]);
            assert.equal(result.status, 0, `${path.basename(verifier)} failed:\n${result.stdout}\n${result.stderr}`);
        }
        // When the suites run, Then every test passes and at least one ran
        const result = run(['--test', '--test-reporter=tap', ...suites]);
        assert.equal(result.status, 0, `pinned suites failed:\n${result.stdout.slice(-6000)}\n${result.stderr.slice(-2000)}`);
        assert.match(result.stdout, /# fail 0/, 'node:test reports zero failures');
        assert.doesNotMatch(result.stdout, /# pass 0\b/, 'node:test ran at least one test (not vacuous)');
    } finally {
        removeTempDir(temp);
    }
}

module.exports = { name: 'review-mode-sections', tests };
