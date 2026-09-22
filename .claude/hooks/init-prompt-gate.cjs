#!/usr/bin/env node
/**
 * init-prompt-gate.cjs - UserPromptSubmit project-context router
 *
 * Handles the advisory reference-doc, graph and agent-file setup gates, and
 * reports on the state of the project config.
 *
 * PORTABILITY CONTRACT: the project config is OPTIONAL. A project that has none
 * is a supported, first-class state — the framework runs on the loader's neutral
 * defaults plus repository evidence, so an absent config emits a once-a-day
 * notice and the prompt proceeds. A config that EXISTS but does not validate is
 * a different thing: its author declared those sections authoritative, so
 * falling back silently would hand the model wrong project facts. That case,
 * and an indeterminate read, stay fail-closed with a narrow allowlist for the
 * explicit project-config repair commands.
 *
 * Optional setup gates may route to their setup skills or accept a dismissal.
 *
 * Exit Codes:
 *   0 - Prompt allowed, or blocked through the UserPromptSubmit JSON decision.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const {
    isConfigPopulated: _isConfigPopulated,
    getProjectConfigStatus,
    getConfiguredProjectConfigPath
} = require('./lib/project-config-loader.cjs');
const { hasProjectContent } = require('./lib/session-init-helpers.cjs');
const {
    getAgentFileIssues,
    isAgentFilesDismissed,
    writeAgentFilesDismissFlag,
    isAgentFilesDismissRequest,
    buildOfferMessage
} = require('./lib/agent-files-state.cjs');

// Plane 3 accelerator — NON-LOAD-BEARING. See the deletability contract in the lib header.
const { buildOverlayContext } = require('./lib/skill-protocol-overlay.cjs');

const {
    INIT_DISMISSED_PATH: DISMISS_FLAG,
    SCAN_STALE_DISMISSED_PATH: SCAN_DISMISS_FLAG,
    GRAPH_DISMISSED_PATH: GRAPH_DISMISS_FLAG,
    SCAN_STALE_PATH: SCAN_STALE_FLAG,
    ensureProjectTmpDir
} = require('./lib/ck-paths.cjs');

const rootResolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
const PROJECT_DIR = rootResolution.rootDir;
// Honor the configured portability.projectConfigPath (fail-open to docs/project-config.json).
// Must match where session-init creates the config, else a custom-path project is told its
// config is absent while it sits validated at the configured path.
const CONFIG_PATH = getConfiguredProjectConfigPath();
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const SCAN_DISMISS_TTL_DAYS = 7;
const SCAN_DISMISS_TTL_MS = SCAN_DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000;

// Graph gate constants
const GRAPH_DB_PATH = path.join(PROJECT_DIR, '.code-graph', 'graph.db');
const GRAPH_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Emit UserPromptSubmit guidance.
 * Claude and Codex both accept plaintext stdout as prompt context for this event.
 * Prefix JSON-looking text so Codex does not route it through its JSON parser.
 * @param {string} message
 */
function emitPromptContext(message) {
    const text = String(message || '');
    if (!text) return;
    const trimmedStart = text.trimStart();
    if (trimmedStart.startsWith('{') || trimmedStart.startsWith('[')) {
        console.log(`Hook context:\n${trimmedStart}`);
        return;
    }
    console.log(text);
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIONAL SETUP ALLOWLIST — applies only after the required project config
// validates. Missing/invalid config uses CONFIG_REPAIR_PATTERNS below.
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWLIST_PATTERNS = [
    /\/project-init/i, // Unified project bootstrap/re-evaluation route
    /\/init-project/i, // Alias phrase for the unified bootstrap route
    /\/project-config/i, // The skill that populates config
    /\/scan[-\w]*/i, // The /scan host (incl. /scan --target=<key>) + /scan-* orchestrators that populate reference docs
    /\/graph-build/i, // The skill that builds the knowledge graph
    /\/ai-context-refresh/i, // Generates root AI context (fixes missing-agent-file state)
    /\/sync-codex/i, // Generates AGENTS.md mirror (fixes missing-agent-file state)
    /\/init/i, // Any init-related command
    /skip\s*init/i, // User wants to dismiss the gate
    /skip\s*setup/i, // Alternative dismiss phrase
    /skip\s*graph/i // User wants to dismiss the graph gate
];

// An invalid (present but non-validating) config may only be repaired through an
// explicit top-level project-init/project-config skill invocation. Mentioning one
// inside an unrelated prompt must not bypass that gate. Both Claude
// slash commands and Codex skill invocations are accepted.
const CONFIG_REPAIR_PATTERNS = [
    /^\s*(?:\/|\$)project-init\b/i,
    /^\s*(?:\/|\$)init-project\b/i,
    /^\s*(?:\/|\$)project-config\b/i
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the required project config exists and is schema-valid.
 * Delegates to the shared config validator from project-config-loader.cjs.
 * @returns {boolean}
 */
function isConfigPopulated() {
    return _isConfigPopulated();
}

/** @param {string} prompt */
function isConfigRepairPrompt(prompt) {
    return CONFIG_REPAIR_PATTERNS.some(pattern => pattern.test(prompt || ''));
}

/**
 * The configured config path, relative to the project root, for display.
 * @returns {string}
 */
function configDisplayPath() {
    return path.relative(PROJECT_DIR, CONFIG_PATH).replace(/\\/g, '/') || path.basename(CONFIG_PATH);
}

/**
 * An ABSENT project config is a supported adopter state, never a block. Emit a
 * once-a-day notice telling the model to fall back to repository evidence, and
 * let the prompt through. Suppressed by the shared dismiss flag so a config-less
 * project is not lectured on every prompt.
 * @returns {void}
 */
function noticeMissingConfig() {
    if (isDismissed()) return;
    emitPromptContext(
        `No project config at \`${configDisplayPath()}\` — a supported state, not an error. ` +
        'The framework is running on its portable defaults: resolve project facts (paths, run ' +
        'commands, conventions, architecture) from repository evidence — manifests, lockfiles, ' +
        'scripts, directory layout — and state the assumption when one is material. Optional: ' +
        'run /project-init or /project-config to record those facts once instead of re-deriving ' +
        'them each session. This notice repeats at most once a day.'
    );
    writeDismissFlag();
}

/**
 * Emit a host-supported UserPromptSubmit block for a config that EXISTS but does
 * not validate, or whose state could not be determined. Both Claude Code and
 * Codex support this event's JSON `decision: block` output.
 * @param {{state: string, errors?: string[]}} status
 */
function blockRequiredConfig(status) {
    const displayPath = configDisplayPath();
    // `missing` never reaches here: main() routes an absent config to noticeMissingConfig().
    const issue = status.state === 'unavailable'
        ? `Unable to verify the project config at \`${displayPath}\`: ${(status.errors || []).slice(0, 3).join('; ')}`
        : `Project config at \`${displayPath}\` is invalid: ${(status.errors || []).slice(0, 3).join('; ')}`;
    const reason = `${issue} The config is optional \u2014 but this one EXISTS and its author declared those sections authoritative, so falling back to defaults would hand you wrong project facts. Run /project-init to repair it, /project-config to rewrite it, or delete it to run on portable defaults. The minimum is a non-empty project.name; capability sections may be omitted, but any declared section must satisfy its schema.`;
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

/**
 * Check if the dismiss flag exists and is still valid (< DISMISS_TTL_MS old).
 * @returns {boolean}
 */
function isDismissed() {
    try {
        if (!fs.existsSync(DISMISS_FLAG)) return false;
        const stat = fs.statSync(DISMISS_FLAG);
        const ageMs = Date.now() - stat.mtimeMs;
        return ageMs < DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the dismiss flag file with current timestamp.
 */
function writeDismissFlag() {
    if (rootResolution.error) return;
    try {
        ensureProjectTmpDir();
        fs.writeFileSync(DISMISS_FLAG, new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt matches any allowlisted pattern.
 * @param {string} prompt
 * @returns {boolean}
 */
function isAllowlistedPrompt(prompt) {
    return ALLOWLIST_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * Check if the user's prompt is a dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isDismissRequest(prompt) {
    return /skip\s*(init|setup)/i.test(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the scan-stale dismiss flag exists and is still valid.
 * @returns {boolean}
 */
function isScanDismissed() {
    try {
        if (!fs.existsSync(SCAN_DISMISS_FLAG)) return false;
        const content = fs.readFileSync(SCAN_DISMISS_FLAG, 'utf-8').trim();
        if (content) {
            try {
                const data = JSON.parse(content);
                const dismissedAt = Date.parse(data.dismissedAt || '');
                if (!Number.isNaN(dismissedAt)) {
                    return Date.now() - dismissedAt < SCAN_DISMISS_TTL_MS;
                }
            } catch {
                const dismissedAt = Date.parse(content);
                if (!Number.isNaN(dismissedAt)) {
                    return Date.now() - dismissedAt < SCAN_DISMISS_TTL_MS;
                }
            }
        }
        const stat = fs.statSync(SCAN_DISMISS_FLAG);
        return Date.now() - stat.mtimeMs < SCAN_DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the scan-stale dismiss flag.
 */
function writeScanDismissFlag() {
    if (rootResolution.error) return;
    try {
        ensureProjectTmpDir();
        const dismissedAt = new Date();
        const expiresAt = new Date(dismissedAt.getTime() + SCAN_DISMISS_TTL_MS);
        fs.writeFileSync(
            SCAN_DISMISS_FLAG,
            JSON.stringify({
                dismissedAt: dismissedAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
                ttlDays: SCAN_DISMISS_TTL_DAYS
            }, null, 2) + '\n',
            'utf-8'
        );
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt is a scan dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isScanDismissRequest(prompt) {
    return /skip\s*scan/i.test(prompt);
}

/**
 * Check if reference docs are flagged as stale.
 * @returns {{ isStale: boolean, docs: Array }}
 */
function checkScanStaleFlag() {
    try {
        if (!fs.existsSync(SCAN_STALE_FLAG)) return { isStale: false, docs: [] };
        const data = JSON.parse(fs.readFileSync(SCAN_STALE_FLAG, 'utf-8'));
        return { isStale: true, docs: data.docs || [] };
    } catch {
        return { isStale: false, docs: [] };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS GATE — extracted to reduce cognitive complexity of main()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check staleness gate after the required config validates.
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Emits guidance when stale docs exist; returns otherwise
 */
function handleStalenessGate(userPrompt) {
    const staleState = checkScanStaleFlag();
    if (!staleState.isStale) return; // No stale docs → pass through

    // Stale docs exist — check escape hatches
    if (isScanDismissed()) return;

    if (isScanDismissRequest(userPrompt)) {
        writeScanDismissFlag();
        emitPromptContext('Reference doc scan skipped. Gate dismissed for 7 days.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // WARN — stale docs, no escape hatch. Allow the model to auto-route.
    const docList = staleState.docs.map(d => `  - ${d.filename} (${d.ageDays}d old) -> /${d.scanSkill}`).join('\n');
    emitPromptContext(
        [
            '',
            '[project-context] Reference docs are stale.',
            '',
            "The following reference docs haven't been scanned recently:",
            docList,
            '',
            'Auto-route before ordinary project-specific work:',
            '  /scan-all             — Refresh all reference docs',
            '  /scan-<name>          — Refresh a specific doc when scope is narrow',
            '',
            'Continue after the relevant scan completes.',
            ''
        ].join('\n')
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT-FILES ROUTER — guides when CLAUDE.md / AGENTS.md are missing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check the agent-files gate after the required config validates.
 *
 * Runs only in the schema-valid-config branch by design: /ai-context-refresh reads
 * the project config to generate CLAUDE.md, so offering it before config
 * validates would produce a meaningless file. Empty/uninitialized projects
 * are already short-circuited by the hasProjectContent() guard in main().
 *
 * Missing CLAUDE.md → /ai-context-refresh (AI-runnable).
 * Missing AGENTS.md → /sync-codex (AI-runnable mirror generator with script fallback).
 *
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Emits guidance when files need attention; returns otherwise
 */
function handleAgentFilesGate(userPrompt) {
    const issues = getAgentFileIssues();
    if (issues.length === 0) return; // Both root agent files present + complete → pass through

    if (isAgentFilesDismissed()) return;

    if (isAgentFilesDismissRequest(userPrompt)) {
        writeAgentFilesDismissFlag();
        emitPromptContext('Agent-file init skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // WARN — root agent file(s) missing or incomplete. Allow the model to auto-route.
    emitPromptContext(buildOfferMessage(issues));
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the graph dismiss flag exists and is still valid.
 * @returns {boolean}
 */
function isGraphDismissed() {
    try {
        if (!fs.existsSync(GRAPH_DISMISS_FLAG)) return false;
        const stat = fs.statSync(GRAPH_DISMISS_FLAG);
        return Date.now() - stat.mtimeMs < GRAPH_DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the graph dismiss flag.
 */
function writeGraphDismissFlag() {
    if (rootResolution.error) return;
    try {
        ensureProjectTmpDir();
        fs.writeFileSync(GRAPH_DISMISS_FLAG, new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt is a graph dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isGraphDismissRequest(prompt) {
    return /skip\s*graph/i.test(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH ROUTER — guides when graph.db doesn't exist
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check graph gate after config + staleness gates pass.
 * Guides when graph.db doesn't exist. If Python is not available,
 * tells the model which setup route or prerequisite remains.
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Emits guidance when graph is missing; returns otherwise
 */
function handleGraphGate(userPrompt) {
    // Only guide graph setup after the required project config validates.
    if (!isConfigPopulated()) return;

    // Graph already built → pass through
    if (fs.existsSync(GRAPH_DB_PATH)) return;

    // Graph missing — check escape hatches
    if (isGraphDismissed()) return;

    if (isGraphDismissRequest(userPrompt)) {
        writeGraphDismissFlag();
        emitPromptContext('Graph build skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // Detect Python availability to provide targeted instructions
    let hasPython = false;
    try {
        const { isGraphAvailable } = require('./lib/graph-utils.cjs');
        const status = isGraphAvailable();
        hasPython = status.python && status.deps;
    } catch {
        /* graph-utils not available — assume no Python */
    }

    const instructions = hasPython
        ? ['  /graph-build          — Build the knowledge graph before structural investigation']
        : [
              'Python 3.10+ with tree-sitter is required. Install first:',
              '  pip install tree-sitter tree-sitter-language-pack networkx',
              '',
              'Then run:',
              '  /graph-build          — Build the knowledge graph'
          ];

    // WARN — graph not built. Allow the model to continue or auto-route.
    emitPromptContext(
        [
            '',
            '[project-context] Knowledge graph not built.',
            '',
            'The code knowledge graph (.code-graph/graph.db) does not exist.',
            'Graph enables: frontend↔backend tracing, blast radius analysis,',
            'cross-service flow detection, and structural code intelligence.',
            '',
            'Auto-route before graph-dependent investigation:',
            ...instructions,
            ''
        ].join('\n')
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT PROTOCOL OVERLAY GATE (Plane 3 accelerator — DELETABLE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inject the project's protocol overlays for a user-typed `/skill-name`.
 *
 * NON-LOAD-BEARING: Planes 1 (CLAUDE.md CK:PROJECT-PROTOCOLS) and 2 (the SYNC block in every
 * SKILL.md) deliver the same rules on both hosts without any hook. Deleting this function, its
 * single call site, and lib/skill-protocol-overlay.cjs removes the whole plane cleanly.
 *
 * Emits nothing and NEVER throws: no leading `/name`, no registry, or no match resolves to a
 * silent no-op. An invalid required config/path emits a fixed diagnostic without reading files,
 * so the accelerator remains fail-soft while explicit bad declarations stay visible.
 */
function handleProtocolOverlayGate(userPrompt) {
    try {
        const configStatus = getProjectConfigStatus();
        const projectConfig = configStatus.valid ? configStatus.config : null;
        const text = buildOverlayContext(userPrompt, PROJECT_DIR, projectConfig);
        if (text) emitPromptContext(text);
    } catch {
        // Accelerator only — never block.
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    // An unresolvable project root is a host/environment problem, not a project one.
    // Every other hook skips in that state (see session-init); blocking every prompt
    // here would brick a session over a relative CLAUDE_PROJECT_DIR. Report and allow.
    if (rootResolution.error) {
        emitPromptContext(
            `[init-prompt-gate] Skipped: project root resolution failed (${rootResolution.error}). ` +
            'Project config and setup gates were not evaluated this turn.'
        );
        process.exit(0);
    }
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        // Parse stdin — UserPromptSubmit provides { prompt: "..." }
        let userPrompt = '';
        try {
            const payload = JSON.parse(stdin);
            userPrompt = payload.prompt || '';
        } catch {
            // Fail-open if we can't parse
            process.exit(0);
        }

        if (!userPrompt.trim()) process.exit(0);

        // Project config is OPTIONAL. Absent → notice and continue on portable
        // defaults. Present-but-invalid, or unreadable → fail closed, because the
        // author declared those sections authoritative and a silent fallback would
        // hand the model wrong project facts.
        let configStatus;
        try {
            configStatus = getProjectConfigStatus({ refresh: true });
        } catch (error) {
            blockRequiredConfig({ state: 'unavailable', errors: [error.message] });
            process.exit(0);
        }
        if (!configStatus.valid) {
            if (isConfigRepairPrompt(userPrompt)) process.exit(0);
            if (configStatus.state !== 'missing') {
                blockRequiredConfig(configStatus);
                process.exit(0);
            }
            noticeMissingConfig();
        }

        // The remaining setup gates apply to content-bearing projects only.
        if (!hasProjectContent()) process.exit(0);

        // Plane 3 accelerator: a user-typed /skill-name gets its project protocol overlays
        // injected only after required project configuration has been verified.
        handleProtocolOverlayGate(userPrompt);

        // Schema-valid config → check agent-files, staleness and optional graph gates.
        // Agent-files first: CLAUDE.md/AGENTS.md are the most foundational artifacts and
        // /ai-context-refresh depends on the (now-populated) config.
        handleAgentFilesGate(userPrompt);
        handleStalenessGate(userPrompt);
        handleGraphGate(userPrompt);
        process.exit(0);
    } catch {
        // Optional setup guidance remains fail-open. Required-config verification
        // has its own fail-closed error boundary above.
        process.exit(0);
    }
}

// Export for testing
module.exports = {
    emitPromptContext,
    isConfigPopulated,
    isConfigRepairPrompt,
    blockRequiredConfig,
    noticeMissingConfig,
    configDisplayPath,
    isDismissed,
    writeDismissFlag,
    isAllowlistedPrompt,
    isDismissRequest,
    ALLOWLIST_PATTERNS,
    DISMISS_TTL_MS,
    // Staleness gate
    isScanDismissed,
    writeScanDismissFlag,
    isScanDismissRequest,
    checkScanStaleFlag,
    SCAN_DISMISS_TTL_DAYS,
    SCAN_DISMISS_TTL_MS,
    // Graph gate
    isGraphDismissed,
    writeGraphDismissFlag,
    isGraphDismissRequest,
    GRAPH_DISMISS_TTL_MS,
    // Agent-files gate
    handleAgentFilesGate,
    // Project protocol overlay gate (Plane 3 accelerator — deletable)
    handleProtocolOverlayGate
};

if (require.main === module) {
    main();
}
