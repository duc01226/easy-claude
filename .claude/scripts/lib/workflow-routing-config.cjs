'use strict';

/**
 * Workflow auto-detect routing switch — the ONE resolver for
 * `portability.workflowAutoDetect`.
 *
 * WHAT IT CONTROLS. The framework's intent router is carried by three independent
 * surfaces. A project that turns the switch off must lose all three, or the mode is
 * only half-disabled (the runtime hook would keep re-injecting "match the request
 * against the workflow catalog" on every prompt while CLAUDE.md stays silent):
 *
 *   1. `CK:WORKFLOW-GATE` + `CK:WORKFLOW-SKILLS` in CLAUDE.md, stamped by
 *      `.claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs`, and mirrored
 *      into AGENTS.md by the Codex sync.
 *   2. The DETECT/ANALYZE/AUTO-SELECT/ACTIVATE half of the static workflow-execution
 *      protocol built by `hookless-prompt-protocol.cjs` — shared by the UserPromptSubmit
 *      hook and by `.codex/CODEX_CONTEXT.md`.
 *   3. The Workflow Protocol + Workflow Catalog sections of `.codex/CODEX_CONTEXT.md`,
 *      built by `.claude/scripts/codex/sync-context-workflows.mjs`.
 *
 * ── RESOLUTION CASCADE (later layer wins) ────────────────────────────────────────────
 *
 *   1. FRAMEWORK DEFAULT — `true`. Absence is never a decision: a config that does not
 *      mention the key, a config that does not exist, and a config that fails to parse
 *      all mean "auto-detect", so routing is only ever disabled ON PURPOSE.
 *   2. TEAM      — `docs/project-config.json` → `portability.workflowAutoDetect`.
 *      Committed. This is the whole team's default for the repository.
 *   3. DEVELOPER — `docs/project-config.local.json` → the same key. Git-ignored by the
 *      repo-root `.gitignore` rule `*.local.json`, so one developer can switch routing
 *      off (or back on) on their own machine WITHOUT touching the shared file. Nothing
 *      about this layer reaches the team repository.
 *
 * The developer layer is a full override, not a one-way "off" switch: a developer whose
 * team disabled routing can set `true` locally to opt back in. Each layer is read
 * independently, so a broken local file cannot erase a valid team decision — it is
 * skipped, and the team value still applies.
 *
 * ── SCOPE: WHY THE DEVELOPER LAYER IS NOT ALWAYS APPLIED ─────────────────────────────
 *
 * `CLAUDE.md`, `AGENTS.md` and `.codex/CODEX_CONTEXT.md` are GIT-TRACKED. If a developer's
 * local preference caused a generator to strip the router out of them, that preference would
 * surface as modified tracked files and could be committed onto the whole team — the precise
 * outcome a local override exists to avoid. So the switch resolves at one of two scopes:
 *
 *   `'team'`      — framework default + team config ONLY. Used by every generator that writes
 *                   a TRACKED file. Those files always describe the team's decision, so a local
 *                   override can never dirty the repository.
 *   `'effective'` — the full cascade including the developer layer (the DEFAULT). Used at
 *                   RUNTIME, where nothing is written: the UserPromptSubmit hook composes the
 *                   prompt protocol fresh each turn.
 *
 * A developer who disables routing locally therefore gets it off at runtime while the tracked
 * files keep the team's content. Because those files still carry the gate, the runtime carrier
 * must also say that it OVERRIDES them — see `staticRouterOverride` in
 * `hookless-prompt-protocol.cjs`. Without that, the model would read a gate in CLAUDE.md that
 * nothing contradicted.
 *
 * WHAT IT DOES NOT CONTROL. Turning routing off never relaxes a quality gate. The
 * task-planning, parallel-wave, evidence, git-discipline and portability-boundary rules
 * are orthogonal to route SELECTION and stay in every carrier. Explicit user invocation
 * (`/plan`, `$start-workflow <id>`, a named skill) also keeps working — the switch only
 * stops the agent from inferring a route on its own.
 *
 * FAIL-OPEN BY DESIGN. Every read is independently guarded and a failure falls through to
 * the layer below, ending at `true`. Silently stripping the router because a JSON file was
 * missing or malformed would change routing behaviour invisibly, which is exactly the
 * failure this module exists to make explicit.
 *
 * HOOK-INDEPENDENT. This module reads `.claude/.ck.json` directly rather than requiring
 * `hooks/lib/project-config-loader.cjs`, so it keeps working in a stripped portable Codex
 * tree where the hook libraries do not travel.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT_CONFIG_PATH = path.join('docs', 'project-config.json');

/** Provenance labels for `resolveWorkflowAutoDetect().source`. */
const SOURCE_DEFAULT = 'default';
const SOURCE_PROJECT_CONFIG = 'project-config';
const SOURCE_LOCAL_OVERRIDE = 'local-override';

/** Resolution scopes — see the SCOPE section of the module doc. */
const SCOPE_TEAM = 'team';
const SCOPE_EFFECTIVE = 'effective';

/** Read the `.ck.json` override for the project-config location, if the file is usable. */
function readConfiguredProjectConfigPath(rootDir) {
    try {
        const ck = JSON.parse(fs.readFileSync(path.join(rootDir, '.claude', '.ck.json'), 'utf8'));
        const configured = ck?.portability?.projectConfigPath;
        if (typeof configured === 'string' && configured.trim() !== '') return configured.trim();
    } catch {
        // No .ck.json, or an unusable one — the framework default still resolves.
    }
    return null;
}

/**
 * Absolute path of the TEAM project config for `rootDir`, honouring the `.ck.json` override.
 * @param {string} rootDir repository root
 * @returns {string}
 */
function resolveProjectConfigPath(rootDir) {
    const configured = readConfiguredProjectConfigPath(rootDir) || DEFAULT_PROJECT_CONFIG_PATH;
    return path.isAbsolute(configured) ? configured : path.join(rootDir, configured);
}

/**
 * The git-ignored developer override that sits BESIDE the team config, whatever the team
 * config is called or wherever `.ck.json` relocated it: `<name>.json` → `<name>.local.json`.
 * Deriving it keeps the pair together under a relocated `projectConfigPath` instead of
 * pinning the override to a path the project may not use.
 * @param {string} projectConfigPath absolute path of the team config
 * @returns {string}
 */
function resolveLocalOverridePath(projectConfigPath) {
    const dir = path.dirname(projectConfigPath);
    const base = path.basename(projectConfigPath);
    const stem = base.endsWith('.json') ? base.slice(0, -'.json'.length) : base;
    return path.join(dir, `${stem}.local.json`);
}

/**
 * Read one layer. Returns `undefined` when the layer expresses no opinion — the file is
 * absent, unreadable, malformed, or simply does not declare the key — so the caller falls
 * through to the layer below instead of treating a non-answer as `false`.
 * @param {string} filePath
 * @returns {boolean|undefined}
 */
function readLayer(filePath) {
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return undefined;
    }
    const value = parsed?.portability?.workflowAutoDetect;
    // Only a real boolean counts. A string "false" is a config mistake, not an off switch;
    // treating it as one would disable routing for someone who never successfully asked.
    return typeof value === 'boolean' ? value : undefined;
}

/**
 * Decide the switch from an ALREADY-LOADED config object — ONE layer, no cascade.
 * Callers that hold a parsed team config use this only when they have separately accounted
 * for the developer layer; prefer `resolveWorkflowAutoDetect` unless you know you have not.
 * @param {object|null|undefined} config parsed project-config.json
 * @returns {boolean} true when workflow auto-detect routing should be emitted
 */
function readWorkflowAutoDetect(config) {
    return config?.portability?.workflowAutoDetect !== false;
}

/**
 * Resolve the switch through the full cascade, reporting WHICH layer decided.
 * The provenance lets a generator or report say "routing is off because of YOUR local
 * override" rather than leaving a developer to wonder whether the team changed something.
 * @param {string|{rootDir?:string, configPath?:string, localPath?:string, scope?:string}} source
 *        `scope: 'team'` stops before the developer layer — REQUIRED for any caller writing a
 *        git-tracked file. Default `'effective'` applies the full cascade.
 * @returns {{enabled:boolean, source:string, scope:string, configPath:string, localPath:string,
 *            teamEnabled:boolean, overriddenLocally:boolean}}
 */
function resolveWorkflowAutoDetect(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(configPath);

    let enabled = true;
    let decidedBy = SOURCE_DEFAULT;

    const team = readLayer(configPath);
    if (team !== undefined) {
        enabled = team;
        decidedBy = SOURCE_PROJECT_CONFIG;
    }
    const teamEnabled = enabled;

    // Developer layer last, and only at 'effective' scope: it wins over the team default, in
    // BOTH directions. At 'team' scope it is not even read, so a tracked generator cannot
    // accidentally bake one developer's preference into a shared file.
    let overriddenLocally = false;
    if (scope === SCOPE_EFFECTIVE) {
        const local = readLayer(localPath);
        if (local !== undefined) {
            overriddenLocally = local !== teamEnabled;
            enabled = local;
            decidedBy = SOURCE_LOCAL_OVERRIDE;
        }
    }

    return { enabled, source: decidedBy, scope, configPath, localPath, teamEnabled, overriddenLocally };
}

/**
 * Boolean form of `resolveWorkflowAutoDetect` — the common call shape.
 * Passing `config` short-circuits to that single object and SKIPS the cascade; only do that
 * when the developer layer has already been accounted for.
 * @param {string|{rootDir?:string, config?:object, configPath?:string, localPath?:string,
 *                 scope?:string}} source
 * @returns {boolean} true when workflow auto-detect routing should be emitted
 */
function isWorkflowAutoDetectEnabled(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        return readWorkflowAutoDetect(options.config);
    }
    return resolveWorkflowAutoDetect(options).enabled;
}

module.exports = {
    DEFAULT_PROJECT_CONFIG_PATH,
    SOURCE_DEFAULT,
    SOURCE_PROJECT_CONFIG,
    SOURCE_LOCAL_OVERRIDE,
    SCOPE_TEAM,
    SCOPE_EFFECTIVE,
    isWorkflowAutoDetectEnabled,
    readWorkflowAutoDetect,
    resolveLocalOverridePath,
    resolveProjectConfigPath,
    resolveWorkflowAutoDetect
};
