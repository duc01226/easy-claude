'use strict';

const fs = require('fs');
const path = require('path');
const { extractSyncBlock, extractSyncBody } = require('./extract-sync-block.cjs');
const { isWorkflowAutoDetectEnabled } = require('./workflow-routing-config.cjs');

const DEFAULT_SHARED_AI_SDD_SYNC_TAGS = ['ai-sdd-artifact-contract', 'ai-sdd-artifact-contract:reminder'];
// The filename is retained for portable-consumer compatibility. The protocol itself is
// static and hook-independent: hooks may accelerate loading, but are never authoritative.
const DEFAULT_SOURCE_LINE =
    'Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)';

function normalizePromptProtocolText(text) {
    if (!text || typeof text !== 'string') return null;
    const normalized = text.trim();
    return normalized.length > 0 ? normalized : null;
}

function loadCkConfig(rootDir) {
    const ckConfigPath = path.join(rootDir, '.claude', '.ck.json');
    try {
        return JSON.parse(fs.readFileSync(ckConfigPath, 'utf8'));
    } catch {
        return {};
    }
}

function sharedSyncInlinePath(rootDir) {
    return path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
}

function readSharedSyncInline(rootDir) {
    return fs.readFileSync(sharedSyncInlinePath(rootDir), 'utf8');
}

function buildPortabilityBoundary(portability = {}) {
    const projectConfigPath = portability.projectConfigPath || 'docs/project-config.json';
    const docsIndexPath = portability.docsIndexPath || 'docs/project-reference/docs-index-reference.md';
    const rule =
        portability.rule ||
        'Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/.';

    return `**Generic portability boundary:** ${rule} Apply shared AI-SDD from \`shared/sdd-artifact-contract.md\`. Read \`${projectConfigPath}\` and \`${docsIndexPath}\`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or \`docs/specs/\` work, route through the local spec docs named by the docs index: \`feature-spec-reference.md\`, \`spec-system-reference.md\`, \`spec-principles.md\`, and \`workflow-spec-test-code-cycle-reference.md\` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run \`$project-init\` (or the narrow lower-level route such as \`$project-config\`, \`$docs-init\`, \`$scan-all\`, or \`$scan --target=<key>\`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state \`Reference docs read: ... | Not applicable: ...\`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.`;
}

const WORKFLOW_PROTOCOL_HEADING =
    '## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.';

// Steps 5-7 are about EXECUTING a chosen path, not choosing one. They stay in both variants:
// task tracking, wave planning and the all-return barrier are quality rules the routing switch
// has no business relaxing.
const WORKFLOW_PROTOCOL_EXECUTION_STEPS = [
    '**CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.',
    '**PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave\'s sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent\'s own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.',
    '**EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)'
];

// Steps 1-4 ARE the auto-detect router: match the prompt against the catalog, pick a path,
// activate it. These are what `portability.workflowAutoDetect: false` removes.
const WORKFLOW_PROTOCOL_ROUTING_STEPS = [
    '**DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.',
    '**ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.',
    '**AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.',
    '**ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.'
];

// Replaces steps 1-4 when routing is off. It is a positive instruction, not a silence: the model
// still needs to know what to do first, and an explicit invocation must keep working.
const WORKFLOW_PROTOCOL_ROUTING_DISABLED_STEP =
    '**EXECUTE DIRECTLY:** Workflow auto-detect is OFF for this project (`portability.workflowAutoDetect: false`). ' +
    'Do not match the prompt against a workflow catalog or skill list, and do not infer a route. Execute the ' +
    'request directly. Run a workflow or skill ONLY when the user names one explicitly (`$skill`, `$workflow-*`, ' +
    '`$start-workflow <id>`) — then follow that definition exactly.';

// Appended when routing is off for THIS DEVELOPER but the git-tracked context files still carry
// the team's router. Those files cannot be rewritten for a local preference without dirtying the
// repository, so the contradiction is real and must be resolved out loud — a model that reads a
// WORKFLOW-GATE in CLAUDE.md with nothing contradicting it will route from it.
const WORKFLOW_PROTOCOL_STATIC_ROUTER_OVERRIDE =
    ' NOTE: your context files (`CLAUDE.md` / `AGENTS.md` / `.codex/CODEX_CONTEXT.md`) still contain a ' +
    'WORKFLOW-GATE and a workflow catalog. That is intentional — they are git-tracked and hold the TEAM ' +
    'default, which a local preference must not modify. THIS INSTRUCTION OVERRIDES THEM: ignore that gate ' +
    'and that catalog, and do not route from them.';

/**
 * Build the static workflow-execution protocol.
 *
 * @param {object} portability `.ck.json` portability block (path/rule overrides)
 * @param {{workflowAutoDetect?: boolean, staticRouterOverride?: boolean}} [options]
 *        `workflowAutoDetect: false` replaces the routing steps with a direct-execution
 *        instruction (default true, matching the fail-open contract in
 *        `workflow-routing-config.cjs`). `staticRouterOverride: true` additionally declares that
 *        this instruction overrides a router still present in the tracked context files — set it
 *        only when routing is off AND those files still carry the gate.
 * @returns {string}
 */
function buildWorkflowProtocolText(portability = {}, options = {}) {
    const routingOff = options.workflowAutoDetect === false;
    const disabledStep = routingOff && options.staticRouterOverride
        ? `${WORKFLOW_PROTOCOL_ROUTING_DISABLED_STEP}${WORKFLOW_PROTOCOL_STATIC_ROUTER_OVERRIDE}`
        : WORKFLOW_PROTOCOL_ROUTING_DISABLED_STEP;
    const steps = routingOff
        ? [disabledStep, ...WORKFLOW_PROTOCOL_EXECUTION_STEPS]
        : [...WORKFLOW_PROTOCOL_ROUTING_STEPS, ...WORKFLOW_PROTOCOL_EXECUTION_STEPS];
    const numbered = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');

    return `${WORKFLOW_PROTOCOL_HEADING}

${buildPortabilityBoundary(portability)}

${numbered}`;
}

function buildSharedAiSddMarkerSection(rootDir, tags = DEFAULT_SHARED_AI_SDD_SYNC_TAGS) {
    try {
        const content = readSharedSyncInline(rootDir);
        const blocks = tags.map((tag) => extractSyncBlock(content, tag)).filter(Boolean);
        if (blocks.length === 0) return null;

        return [
            '## Shared AI-SDD Protocol Markers',
            '',
            'Source: `.claude/skills/shared/sync-inline-versions.md`',
            '',
            blocks.join('\n\n---\n\n')
        ].join('\n');
    } catch {
        return null;
    }
}

function buildCanonicalProtocolText(rootDir, tag) {
    try {
        return extractSyncBody(readSharedSyncInline(rootDir), tag);
    } catch {
        return null;
    }
}

function buildTaskPlanningProtocolText() {
    return '**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes.';
}

function buildLessonLearnedReminderText() {
    return `## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip \`$learn\`.
6. **Auto-fix gate:** "Could \`$code-review\`/\`$code-simplifier\`/\`$security-review\`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run \`$learn\`.`;
}

function buildPromptProtocolSections(rootDir, options = {}) {
    const ckConfig = loadCkConfig(rootDir);
    const portability = ckConfig?.portability ?? {};
    const includeAiSdd = options.includeAiSdd !== false;
    const includeUniversalRules = options.includeUniversalRules !== false;
    const includeLessonReminder = options.includeLessonReminder === true;
    const includeSessionGoalLedger = options.includeSessionGoalLedger !== false;

    // Resolved from the project config unless the caller already decided (tests, and callers
    // that hold the flag). Same fail-open default as everywhere else.
    //
    // SCOPE matters: this builder serves BOTH the runtime prompt (nothing written — full
    // cascade, the developer's local override applies) AND the Codex mirror written into the
    // git-tracked .codex/CODEX_CONTEXT.md, which must pass `scope: 'team'` so a local
    // preference never reaches a shared file.
    const workflowAutoDetect = options.workflowAutoDetect !== undefined
        ? options.workflowAutoDetect
        : isWorkflowAutoDetectEnabled({ rootDir, scope: options.scope });

    return [
        normalizePromptProtocolText(buildWorkflowProtocolText(portability, {
            workflowAutoDetect,
            staticRouterOverride: options.staticRouterOverride
        })),
        includeAiSdd ? normalizePromptProtocolText(buildSharedAiSddMarkerSection(rootDir, options.sharedAiSddTags)) : null,
        normalizePromptProtocolText(buildTaskPlanningProtocolText()),
        // Hookless goal tracking: pin the original request, track every prompt, verify against all of them.
        includeSessionGoalLedger
            ? normalizePromptProtocolText(buildCanonicalProtocolText(rootDir, 'session-goal-ledger:reminder'))
            : null,
        includeLessonReminder ? normalizePromptProtocolText(buildLessonLearnedReminderText()) : null,
        includeUniversalRules
            ? normalizePromptProtocolText(buildCanonicalProtocolText(rootDir, 'critical-thinking-mindset:full'))
            : null,
        includeUniversalRules
            ? normalizePromptProtocolText(buildCanonicalProtocolText(rootDir, 'ai-mistake-prevention:full'))
            : null
    ].filter(Boolean);
}

function buildPromptProtocolMirrorSection(rootDir, options = {}) {
    const heading = options.heading || 'Prompt Protocol Mirror (Auto-Synced)';
    const sourceLine = options.sourceLine || DEFAULT_SOURCE_LINE;
    const sections = buildPromptProtocolSections(rootDir, options);

    return [`## ${heading}`, '', sourceLine, '', ...sections].join('\n');
}

function buildCodexPromptProtocolBlock(rootDir, options = {}) {
    const startMarker = options.startMarker || '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->';
    const endMarker = options.endMarker || '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->';
    const section = buildPromptProtocolMirrorSection(rootDir, {
        ...options,
        heading: options.heading || 'Static Prompt Protocol Mirror (Auto-Synced)',
        includeLessonReminder: options.includeLessonReminder ?? true
    });

    return [startMarker, section, '', endMarker].join('\n');
}

module.exports = {
    DEFAULT_SOURCE_LINE,
    buildCanonicalProtocolText,
    buildCodexPromptProtocolBlock,
    buildLessonLearnedReminderText,
    buildPortabilityBoundary,
    buildPromptProtocolMirrorSection,
    buildPromptProtocolSections,
    buildSharedAiSddMarkerSection,
    buildTaskPlanningProtocolText,
    buildWorkflowProtocolText,
    loadCkConfig,
    normalizePromptProtocolText
};
