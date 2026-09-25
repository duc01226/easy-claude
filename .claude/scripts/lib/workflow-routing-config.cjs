'use strict';

/**
 * Runtime workflow-routing preference resolver.
 *
 * Automatic route selection is enabled by default. Later valid booleans win:
 *   1. framework default: true
 *   2. tracked team config: <projectConfigPath> -> portability.workflowAutoDetect
 *   3. ignored developer config: .claude/.ck.local.json -> the same key
 *
 * Missing, unreadable, malformed, and non-boolean values express no opinion. The local file
 * stays inside the portable `.claude` bundle and is ignored by `.claude/.gitignore`.
 * Static context generators carry the default gate; this resolver controls runtime refresh injection.
 *
 * The same two-layer cascade resolves the OPTIONAL custom route protocol
 * (`portability.workflowRouteProtocol`): framework default (none) -> team -> local, later
 * valid layer replaces the earlier one. A value is a string (inline markdown) or an object
 * carrying inline `text` and/or a repo-relative `path` to a markdown file read at runtime.
 * It is advisory text appended to the runtime route reminder — never a blocking decision, and
 * never stamped into tracked CLAUDE.md/AGENTS.md, which stay team-only.
 *
 * The same cascade also resolves per-project workflow activation tiers
 * (`portability.workflowActivation`: `{ default?, overrides? }`). Each setting is its own value:
 * a later valid `default` wins, and each `overrides[<workflowId>]` wins per workflow id (the
 * deep-merge rule `.claude/.ck.local.json` already follows). A workflow's effective tier is its
 * override when one is set, otherwise the stricter of its framework tier and the default
 * (tier order auto < confirm < manual) — a broad default only tightens; an override may loosen.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT_CONFIG_PATH = path.join('docs', 'project-config.json');
const LOCAL_OVERRIDE_PATH = path.join('.claude', '.ck.local.json');
// A protocol file is injected into model context on every prompt, so its size is bounded like
// the convention-injection payload. Oversized files are truncated with a visible marker rather
// than silently dropped, so a mis-sized protocol is debuggable.
const MAX_PROTOCOL_FILE_BYTES = 20000;
// Fallback used only when the canonical privacy predicate cannot be loaded (a stripped portable
// tree carries `.claude/scripts/**` without `.claude/hooks/lib/**`).
const SENSITIVE_PROTOCOL_PATTERN = /(?:^|\/)\.env(?:$|\.)|credentials|secrets?\.ya?ml$|\.(?:pem|key)$|(?:^|\/)id_(?:rsa|ed25519)(?:$|[./])/i;
const SOURCE_DEFAULT = 'default';
const SOURCE_PROJECT_CONFIG = 'project-config';
const SOURCE_LOCAL_OVERRIDE = 'local-override';
// Tracked generators consume the team scope; runtime hooks consume the effective scope.
const SCOPE_TEAM = 'team';
const SCOPE_EFFECTIVE = 'effective';
// Activation tiers in strictness order (auto < confirm < manual). Lockstep with the schema enum
// `WORKFLOW_ACTIVATION_TIERS` in .claude/hooks/lib/project-config-schema.cjs (asserted by the
// catalog suite); the ORDER is owned here because only the resolver ranks tiers.
const ACTIVATION_TIERS = Object.freeze(['auto', 'confirm', 'manual']);
// A workflow without a valid `activation` in .claude/workflows.json behaves as before tiers existed.
const DEFAULT_ACTIVATION_TIER = 'auto';

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function readConfiguredProjectConfigPath(rootDir) {
    const ck = readJson(path.join(rootDir, '.claude', '.ck.json'));
    const configured = ck?.portability?.projectConfigPath;
    return typeof configured === 'string' && configured.trim() ? configured.trim() : null;
}

function resolveProjectConfigPath(rootDir) {
    const configured = readConfiguredProjectConfigPath(rootDir) || DEFAULT_PROJECT_CONFIG_PATH;
    return path.isAbsolute(configured) ? configured : path.join(rootDir, configured);
}

function resolveLocalOverridePath(rootDir) {
    return path.join(rootDir, LOCAL_OVERRIDE_PATH);
}

function readLayer(filePath) {
    const value = readJson(filePath)?.portability?.workflowAutoDetect;
    return typeof value === 'boolean' ? value : undefined;
}

function readWorkflowAutoDetect(config) {
    return config?.portability?.workflowAutoDetect !== false;
}

function resolveWorkflowAutoDetect(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);

    let enabled = true;
    let decidedBy = SOURCE_DEFAULT;
    const team = readLayer(configPath);
    if (team !== undefined) {
        enabled = team;
        decidedBy = SOURCE_PROJECT_CONFIG;
    }
    const teamEnabled = enabled;

    const local = scope === SCOPE_EFFECTIVE ? readLayer(localPath) : undefined;
    if (local !== undefined) {
        enabled = local;
        decidedBy = SOURCE_LOCAL_OVERRIDE;
    }

    return {
        enabled,
        source: decidedBy,
        scope,
        configPath,
        localPath,
        teamEnabled,
        overriddenLocally: local !== undefined && local !== teamEnabled
    };
}

/**
 * Normalize a declared `workflowRouteProtocol` value into `{ text?, path? }`.
 * A bare string is inline text; an object may carry `text` and/or `path`. Blank,
 * malformed, and empty values return null, which the layer reader treats as "no opinion".
 */
function normalizeProtocolValue(value) {
    if (typeof value === 'string') {
        const text = value.trim();
        return text ? { text } : null;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const text = typeof value.text === 'string' && value.text.trim() ? value.text.trim() : null;
        const refPath = typeof value.path === 'string' && value.path.trim() ? value.path.trim() : null;
        if (!text && !refPath) return null;
        return { text, path: refPath };
    }
    return null;
}

/** Repo-escaping check mirrored from the schema's fail-closed plane (absolute or `..`). */
function isEscapingProtocolPath(value) {
    if (typeof value !== 'string' || !value.trim()) return true;
    if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) return true;
    return value.replace(/\\/g, '/').split('/').includes('..');
}

function isPathWithin(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolvePhysicalPath(candidate) {
    if (typeof fs.realpathSync.native === 'function') return fs.realpathSync.native(candidate);
    return fs.realpathSync(candidate);
}

/**
 * Reject privacy-sensitive protocol files. A committed team config could otherwise point `path`
 * at `.env`/credentials and have the hook read the developer's working tree into model context on
 * every prompt. Uses the framework's canonical privacy predicate when available; the inline
 * fallback covers a stripped portable tree where `.claude/hooks/lib` is absent.
 */
function isSensitiveProtocolPath(relativePath) {
    try {
        const { isPrivacySensitive } = require('../../hooks/lib/sensitive-path-policy.cjs');
        if (typeof isPrivacySensitive === 'function') return isPrivacySensitive(relativePath);
    } catch {
        /* portable fallback below */
    }
    return SENSITIVE_PROTOCOL_PATTERN.test(String(relativePath || '').replace(/\\/g, '/'));
}

/**
 * Read a repo-relative protocol file, fail-soft: an escaping or privacy-sensitive path, a missing
 * file, a non-file, or a blank body returns null so the layer expresses no opinion and the cascade
 * falls through. An oversized file is truncated at MAX_PROTOCOL_FILE_BYTES with a visible marker.
 */
function readProtocolFile(rootDir, relativePath) {
    if (isEscapingProtocolPath(relativePath)) return null;
    if (isSensitiveProtocolPath(relativePath)) return null;
    const resolvedRoot = path.resolve(rootDir);
    const resolved = path.resolve(resolvedRoot, relativePath);
    if (!isPathWithin(resolvedRoot, resolved)) return null;
    try {
        // Lexical containment does not stop a symlink, junction, or other reparse point from
        // redirecting the read outside the project. Resolve both sides physically and read the
        // resolved candidate so the checked path is also the path consumed by the reader.
        const physicalRoot = resolvePhysicalPath(resolvedRoot);
        const physicalCandidate = resolvePhysicalPath(resolved);
        if (!isPathWithin(physicalRoot, physicalCandidate)) return null;

        const stat = fs.statSync(physicalCandidate);
        if (!stat.isFile()) return null;
        if (stat.size > MAX_PROTOCOL_FILE_BYTES) {
            const body = fs.readFileSync(physicalCandidate, 'utf8').slice(0, MAX_PROTOCOL_FILE_BYTES).trim();
            return body
                ? `${body}\n\n[workflowRouteProtocol: truncated at ${MAX_PROTOCOL_FILE_BYTES} bytes]`
                : null;
        }
        const body = fs.readFileSync(physicalCandidate, 'utf8').trim();
        return body || null;
    } catch {
        return null;
    }
}

/** Resolve one config layer's protocol text, or undefined when that layer expresses no opinion. */
function readProtocolLayer(filePath, rootDir) {
    const entry = normalizeProtocolValue(readJson(filePath)?.portability?.workflowRouteProtocol);
    if (!entry) return undefined;
    const parts = [];
    if (entry.text) parts.push(entry.text);
    if (entry.path) {
        const body = readProtocolFile(rootDir, entry.path);
        if (body) parts.push(body);
    }
    const text = parts.join('\n\n').trim();
    return text ? text : undefined;
}

/**
 * Resolve the effective custom route protocol text across the same cascade as the enable
 * switch: framework default (none) -> team project config -> local `.ck.local.json`, later
 * valid layer winning. Returns the text and the layer that decided it.
 *
 * @param {string|object} [source] rootDir string, or { rootDir, scope, configPath, localPath }
 * @returns {{text: string|null, source: string, scope: string, configPath: string, localPath: string, teamText: string|null, overriddenLocally: boolean}}
 */
function resolveWorkflowRouteProtocol(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);

    let text = null;
    let decidedBy = SOURCE_DEFAULT;
    const team = readProtocolLayer(configPath, rootDir);
    if (team !== undefined) {
        text = team;
        decidedBy = SOURCE_PROJECT_CONFIG;
    }
    const teamText = text;

    const local = scope === SCOPE_EFFECTIVE ? readProtocolLayer(localPath, rootDir) : undefined;
    if (local !== undefined) {
        text = local;
        decidedBy = SOURCE_LOCAL_OVERRIDE;
    }

    return {
        text,
        source: decidedBy,
        scope,
        configPath,
        localPath,
        teamText,
        overriddenLocally: local !== undefined && local !== teamText
    };
}

/** Convenience: the resolved protocol text, or '' when none is configured. */
function readWorkflowRouteProtocol(source) {
    const resolved = resolveWorkflowRouteProtocol(source);
    return resolved.text || '';
}

/** A configured tier: exactly one of ACTIVATION_TIERS, otherwise undefined (no opinion). */
function readConfiguredTier(value) {
    return typeof value === 'string' && ACTIVATION_TIERS.includes(value) ? value : undefined;
}

/** A workflow's framework tier from its `.claude/workflows.json` entry; absent or unknown = auto. */
function frameworkActivationTier(workflow) {
    const value = workflow && typeof workflow.activation === 'string' ? workflow.activation.trim().toLowerCase() : '';
    return ACTIVATION_TIERS.includes(value) ? value : DEFAULT_ACTIVATION_TIER;
}

function stricterTier(left, right) {
    return ACTIVATION_TIERS.indexOf(left) >= ACTIVATION_TIERS.indexOf(right) ? left : right;
}

/**
 * Read one config layer's `portability.workflowActivation`, keeping only valid values: an invalid
 * `default` or override entry expresses no opinion, so a typo never changes a tier silently (the
 * schema validators report it by name). `overrides` is prototype-free so a workflow id can never
 * resolve through an inherited key.
 * @param {object|null} config parsed config object
 * @returns {{default: string|undefined, overrides: Record<string, string>}}
 */
function readWorkflowActivation(config) {
    const layer = { default: undefined, overrides: Object.create(null) };
    const block = config?.portability?.workflowActivation;
    if (!block || typeof block !== 'object' || Array.isArray(block)) return layer;
    layer.default = readConfiguredTier(block.default);
    const overrides = block.overrides;
    if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
        for (const [workflowId, tier] of Object.entries(overrides)) {
            const valid = readConfiguredTier(tier);
            if (valid !== undefined) layer.overrides[workflowId] = valid;
        }
    }
    return layer;
}

/**
 * Resolve the activation settings across the cascade: framework (none) -> team project config ->
 * local `.ck.local.json` (effective scope only). `default` takes the later valid layer; overrides
 * merge per workflow id with the later valid layer winning. Passing `config` (a parsed project
 * config object) reads that object alone as the team layer, like `isWorkflowAutoDetectEnabled`.
 *
 * @param {string|object} [source] rootDir string, or { rootDir, scope, config, configPath, localPath }
 * @returns {{default: string|null, overrides: Record<string, string>, defaultSource: string, scope: string, configPath: string|null, localPath: string|null}}
 */
function resolveWorkflowActivation(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        const team = readWorkflowActivation(options.config);
        return {
            default: team.default || null,
            overrides: team.overrides,
            defaultSource: team.default ? SOURCE_PROJECT_CONFIG : SOURCE_DEFAULT,
            scope: SCOPE_TEAM,
            configPath: null,
            localPath: null
        };
    }
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);

    const layers = [[readWorkflowActivation(readJson(configPath)), SOURCE_PROJECT_CONFIG]];
    if (scope === SCOPE_EFFECTIVE) layers.push([readWorkflowActivation(readJson(localPath)), SOURCE_LOCAL_OVERRIDE]);

    let tierDefault = null;
    let defaultSource = SOURCE_DEFAULT;
    const overrides = Object.create(null);
    for (const [layer, layerSource] of layers) {
        if (layer.default !== undefined) {
            tierDefault = layer.default;
            defaultSource = layerSource;
        }
        Object.assign(overrides, layer.overrides);
    }
    return { default: tierDefault, overrides, defaultSource, scope, configPath, localPath };
}

/**
 * A workflow's effective tier: its override when the project names it, otherwise the stricter of
 * its framework tier and the project default. No settings = the framework tier unchanged.
 * @param {string} workflowId
 * @param {object} workflow its `.claude/workflows.json` entry
 * @param {{default?: string|null, overrides?: object}|null} activation resolved settings
 * @returns {'auto'|'confirm'|'manual'}
 */
function effectiveActivationTier(workflowId, workflow, activation) {
    const framework = frameworkActivationTier(workflow);
    if (!activation) return framework;
    const overrides = activation.overrides;
    if (overrides && typeof workflowId === 'string' && Object.prototype.hasOwnProperty.call(overrides, workflowId)) {
        const pinned = readConfiguredTier(overrides[workflowId]);
        if (pinned !== undefined) return pinned;
    }
    const floor = readConfiguredTier(activation.default);
    return floor === undefined ? framework : stricterTier(framework, floor);
}

/**
 * Resolve one workflow's effective tier from project settings. Pass `activation` (from
 * `resolveWorkflowActivation`) to resolve many workflows against one read of the settings.
 * @param {{rootDir?: string, workflowId: string, workflow: object, scope?: string, config?: object, configPath?: string, localPath?: string, activation?: object|null}} options
 * @returns {'auto'|'confirm'|'manual'}
 */
function resolveActivationTier(options = {}) {
    const activation = options.activation !== undefined ? options.activation : resolveWorkflowActivation(options);
    return effectiveActivationTier(options.workflowId, options.workflow, activation);
}

function isWorkflowAutoDetectEnabled(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        return readWorkflowAutoDetect(options.config);
    }
    return resolveWorkflowAutoDetect(options).enabled;
}

module.exports = {
    ACTIVATION_TIERS,
    DEFAULT_ACTIVATION_TIER,
    DEFAULT_PROJECT_CONFIG_PATH,
    LOCAL_OVERRIDE_PATH,
    MAX_PROTOCOL_FILE_BYTES,
    SOURCE_DEFAULT,
    SOURCE_PROJECT_CONFIG,
    SOURCE_LOCAL_OVERRIDE,
    SCOPE_TEAM,
    SCOPE_EFFECTIVE,
    effectiveActivationTier,
    frameworkActivationTier,
    isWorkflowAutoDetectEnabled,
    readWorkflowActivation,
    resolveActivationTier,
    resolveWorkflowActivation,
    readWorkflowAutoDetect,
    readWorkflowRouteProtocol,
    resolveLocalOverridePath,
    resolveProjectConfigPath,
    resolveWorkflowAutoDetect,
    resolveWorkflowRouteProtocol
};
