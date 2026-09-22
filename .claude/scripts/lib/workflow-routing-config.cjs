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

function isWorkflowAutoDetectEnabled(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        return readWorkflowAutoDetect(options.config);
    }
    return resolveWorkflowAutoDetect(options).enabled;
}

module.exports = {
    DEFAULT_PROJECT_CONFIG_PATH,
    LOCAL_OVERRIDE_PATH,
    MAX_PROTOCOL_FILE_BYTES,
    SOURCE_DEFAULT,
    SOURCE_PROJECT_CONFIG,
    SOURCE_LOCAL_OVERRIDE,
    SCOPE_TEAM,
    SCOPE_EFFECTIVE,
    isWorkflowAutoDetectEnabled,
    readWorkflowAutoDetect,
    readWorkflowRouteProtocol,
    resolveLocalOverridePath,
    resolveProjectConfigPath,
    resolveWorkflowAutoDetect,
    resolveWorkflowRouteProtocol
};
