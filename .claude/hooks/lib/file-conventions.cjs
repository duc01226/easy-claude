#!/usr/bin/env node
/**
 * File Conventions — shared matcher + renderer for per-file convention classes.
 *
 * One source of truth for three carriers (spec BR-PFCI-13 static parity):
 *   1. file-convention-inject.cjs hook (PostToolUse additionalContext accelerator)
 *   2. CLAUDE.md "Automatic Skill Activation" table (section-builders.cjs)
 *   3. `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` (hookless hosts)
 *
 * Pure functions only (no delivery memory): target extraction, membership,
 * ordering, rendering, content hash and the size-capped digest.
 * Config contract: docs/project-config.json `contextGroups[]` + `conventionInjection`
 * (schema: project-config-schema.cjs). Design: plans/260916-per-file-convention-injection.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// pfci-2: the content version also covers membership (includes, excludes, extension filter).
const RENDERER_VERSION = 'pfci-2';
const PATH_CAP = 1024;
const DEFAULT_PRIORITY = 500;
const LOOKUP_COMMAND = 'node .claude/hooks/lib/file-conventions.cjs --lookup';

const DEFAULTS = Object.freeze({
    enabled: false,
    maxChars: 4000,
    maxClassesPerEdit: 4,
    // Transcript bytes, not tokens: history files store roughly 5-6 bytes per visible character
    // (measured; about 22 bytes per token), so 4500000 bytes is about two hundred thousand
    // tokens of conversation (BR-PFCI-05). 4500000 is also the enforced floor below, so a
    // re-injection can never be requested closer than ~200K tokens of conversation growth.
    reinjectAfterBytes: 4500000,
    reinjectAfterMinutes: 30,
    // Used only when the working context is BLIND: its size cannot be measured AND no condensation was ever
    // observed for it, so the condensation test is vacuous and age is the only signal left. A much shorter
    // window bounds how long an unseen condensation can suppress a reminder (BR-PFCI-15).
    blindReinjectAfterMinutes: 5,
    onRead: true,
    compactionMarkers: Object.freeze([])
});

// Accepted integer ranges. The config validator (project-config-schema.cjs, kept
// dependency-free) mirrors these; TC-PFCI-013 fails on any drift so a value the validator
// accepts is never silently replaced by a default at runtime (BR-PFCI-11).
const RANGES = Object.freeze({
    maxChars: Object.freeze([500, 10000]),
    maxClassesPerEdit: Object.freeze([1, 10]),
    // Floor = the ~200K-token distance (BR-PFCI-05/15): a shorter window would re-inject too near.
    reinjectAfterBytes: Object.freeze([4500000, Number.MAX_SAFE_INTEGER]),
    reinjectAfterMinutes: Object.freeze([1, 1440]),
    blindReinjectAfterMinutes: Object.freeze([1, 1440])
});

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonBlankString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value) {
    return Array.isArray(value) ? value.filter(nonBlankString).map(v => v.trim()) : [];
}

function unique(list) {
    return Array.from(new Set(list));
}

/** Settings with defaults; out-of-range or wrong-typed values fall back to defaults. */
function resolveSettings(config) {
    const raw = isPlainObject(config) && isPlainObject(config.conventionInjection) ? config.conventionInjection : {};
    const settings = { ...DEFAULTS, compactionMarkers: [] };
    settings.enabled = raw.enabled === true;
    for (const [field, [min, max]] of Object.entries(RANGES)) {
        const value = raw[field];
        if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
            settings[field] = value;
        }
    }
    if (typeof raw.onRead === 'boolean') settings.onRead = raw.onRead;
    settings.compactionMarkers = stringList(raw.compactionMarkers);
    return settings;
}

/** BR-PFCI-01: explicit opt-in only. */
function isEnabled(config) {
    return isPlainObject(config) && isPlainObject(config.conventionInjection) && config.conventionInjection.enabled === true;
}

const regexCache = new Map();

/** Compile a config regex (case-insensitive); invalid → null (skipped at runtime, reported by the validator). */
function safeRegExp(source) {
    if (typeof source !== 'string') return null;
    if (regexCache.has(source)) return regexCache.get(source);
    let compiled = null;
    try {
        compiled = new RegExp(source, 'i');
    } catch {
        compiled = null;
    }
    regexCache.set(source, compiled);
    return compiled;
}

/**
 * Glob dialect: `**` any segments, `*` within a segment, `?` one char; anchored, case-insensitive.
 * Repeated `**` segments mean the same as one and are collapsed, so a pathological pattern
 * cannot nest optional groups (matching cost stays linear in the path).
 */
function globToRegExp(glob) {
    if (typeof glob !== 'string') return null;
    const cacheKey = `glob:${glob}`;
    if (regexCache.has(cacheKey)) return regexCache.get(cacheKey);
    const normalized = glob.replace(/\\/g, '/').replace(/^\.\//, '').replace(/(?:\*\*\/)+/g, '**/');
    let out = '';
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        if (ch === '*') {
            if (normalized[i + 1] === '*') {
                const followedBySlash = normalized[i + 2] === '/';
                out += followedBySlash ? '(?:.*/)?' : '.*';
                i += followedBySlash ? 2 : 1;
            } else {
                out += '[^/]*';
            }
        } else if (ch === '?') {
            out += '[^/]';
        } else {
            out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    let compiled = null;
    try {
        compiled = new RegExp(`^${out}$`, 'i');
    } catch {
        compiled = null;
    }
    regexCache.set(cacheKey, compiled);
    return compiled;
}

/**
 * Repo-relative forward-slash path, or null when blank, over the length cap,
 * or outside the project root (segment-aware: a sibling folder sharing the
 * root's name prefix is outside).
 */
function toRepoRelative(filePath, projectDir, cwd) {
    if (!nonBlankString(filePath) || filePath.length > PATH_CAP || !nonBlankString(projectDir)) return null;
    const base = nonBlankString(cwd) ? cwd : projectDir;
    const absolute = path.resolve(base, filePath);
    const relative = path.relative(path.resolve(projectDir), absolute);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return relative.split(path.sep).join('/');
}

function defaultIsDirectory(absolutePath) {
    try {
        return fs.statSync(absolutePath).isDirectory();
    } catch {
        return false; // stat failure ⇒ treat as a file (plan P2, L6)
    }
}

const PATCH_TARGET = /^\*\*\* (Add File|Update File|Move to): (.+)$/;

/**
 * Relevant target files of a trigger (BR-PFCI-14).
 * - Claude: Read/Edit/Write/MultiEdit `tool_input.file_path`, NotebookEdit `tool_input.notebook_path`.
 * - Codex: `apply_patch` `tool_input.command` Add/Update/Move-to lines (grammar INFERRED); Delete ignored;
 *   a moved file counts only at its destination.
 * - A `tool_response` object whose `success` is boolean false is ignored (defensive, UNVERIFIED shape;
 *   Claude routes failures to PostToolUseFailure, which this hook does not register).
 * @returns {string[]} unique repo-relative paths
 */
function extractTargets(input, projectDir, opts = {}) {
    if (!isPlainObject(input)) return [];
    if (isPlainObject(input.tool_response) && input.tool_response.success === false) return [];
    const toolInput = isPlainObject(input.tool_input) ? input.tool_input : {};
    const isDirectory = typeof opts.isDirectory === 'function' ? opts.isDirectory : defaultIsDirectory;
    const raw = [];
    switch (input.tool_name) {
        case 'Read':
        case 'Edit':
        case 'Write':
        case 'MultiEdit':
            raw.push(toolInput.file_path);
            break;
        case 'NotebookEdit':
            raw.push(toolInput.notebook_path);
            break;
        case 'apply_patch': {
            const patch = typeof toolInput.command === 'string' ? toolInput.command
                : typeof toolInput.patch === 'string' ? toolInput.patch : '';
            // A move's source no longer exists afterwards (like a removal): `Move to` replaces the
            // path of the `Update File` header it belongs to, so only the destination counts.
            let updateIndex = -1;
            for (const line of patch.split(/\r?\n/)) {
                const trimmed = line.trim();
                const match = PATCH_TARGET.exec(trimmed);
                if (!match) {
                    if (trimmed.startsWith('*** ')) updateIndex = -1;
                    continue;
                }
                const [, kind, rawTarget] = match;
                const target = rawTarget.trim();
                if (kind === 'Move to' && updateIndex >= 0) {
                    raw[updateIndex] = target;
                    updateIndex = -1;
                } else {
                    updateIndex = kind === 'Update File' ? raw.length : -1;
                    raw.push(target);
                }
            }
            break;
        }
        default:
            return [];
    }
    const cwd = nonBlankString(input.cwd) ? input.cwd : projectDir;
    const targets = [];
    for (const candidate of raw) {
        const rel = toRepoRelative(candidate, projectDir, cwd);
        if (!rel) continue;
        if (isDirectory(path.join(projectDir, rel))) continue;
        targets.push(rel);
    }
    return unique(targets);
}

function normalizedExtensions(group) {
    return stringList(group.fileExtensions).map(ext => (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase());
}

/** BR-PFCI-02 membership: extension filter AND any include AND no exclude. */
function groupMatches(group, rel) {
    if (!isPlainObject(group) || !nonBlankString(rel)) return false;
    const extensions = normalizedExtensions(group);
    if (extensions.length > 0 && !extensions.includes(path.posix.extname(rel).toLowerCase())) return false;
    const slashPath = `/${rel}`;
    const baseName = path.posix.basename(rel);
    const testRegexes = (list, subject) => stringList(list).some(source => {
        const re = safeRegExp(source);
        return re ? re.test(subject) : false;
    });
    const testGlobs = list => stringList(list).some(glob => {
        const re = globToRegExp(glob);
        return re ? re.test(rel) : false;
    });
    const included = testRegexes(group.pathRegexes, slashPath) || testGlobs(group.pathGlobs) ||
        testRegexes(group.fileNameRegexes, baseName);
    if (!included) return false;
    const excluded = testRegexes(group.excludePathRegexes, slashPath) || testGlobs(group.excludePathGlobs);
    return !excluded;
}

function docsOf(group) {
    return unique([group.guideDoc, group.patternsDoc].filter(nonBlankString).map(d => d.trim())
        .concat(stringList(group.referenceDocs)));
}

/** BR-PFCI-03: deliverable only with rules, skills, reference docs, guide or patterns doc. */
function isInjectable(group) {
    if (!isPlainObject(group) || !nonBlankString(group.name)) return false;
    return stringList(group.rules).length > 0 || stringList(group.skills).length > 0 || docsOf(group).length > 0;
}

function priorityOf(group) {
    return typeof group.priority === 'number' && Number.isFinite(group.priority) ? group.priority : DEFAULT_PRIORITY;
}

/** Normalized, deliverable groups in declaration order (first occurrence of a name wins). */
function injectableEntries(config) {
    const groups = isPlainObject(config) && Array.isArray(config.contextGroups) ? config.contextGroups : [];
    const seen = new Set();
    const entries = [];
    groups.forEach((group, index) => {
        if (!isInjectable(group)) return;
        const name = group.name.trim();
        if (seen.has(name)) return;
        seen.add(name);
        entries.push({
            name,
            index,
            priority: priorityOf(group),
            rules: stringList(group.rules),
            skills: stringList(group.skills),
            docs: docsOf(group),
            group
        });
    });
    return entries;
}

function sortEntries(entries) {
    return entries.slice().sort((a, b) => (a.priority - b.priority) || (a.index - b.index));
}

/**
 * BR-PFCI-04: union of groups matching any target, ordered by priority asc then
 * declaration index, capped to maxClassesPerEdit (cap applies before presence).
 */
function matchGroups(config, rels, settings) {
    const resolved = settings || resolveSettings(config);
    const targets = Array.isArray(rels) ? rels : [rels];
    const matched = injectableEntries(config).filter(entry => targets.some(rel => groupMatches(entry.group, rel)));
    return sortEntries(matched).slice(0, resolved.maxClassesPerEdit);
}

function defaultFileExists(projectDir) {
    return relPath => {
        try {
            return fs.existsSync(path.join(projectDir || process.cwd(), relPath));
        } catch {
            return false;
        }
    };
}

function skillPath(name) {
    return `.claude/skills/${name}/SKILL.md`;
}

function skillDisplay(name, opts) {
    const exists = typeof opts.fileExists === 'function' ? opts.fileExists : defaultFileExists(opts.projectDir);
    const relPath = skillPath(name);
    return exists(relPath) ? relPath : name;
}

/**
 * Content version: stable across machines (skill names, not resolved paths). Covers the
 * deliverable items AND membership (includes, excludes, extension filter), because the static
 * instructions render both: a membership edit without regeneration must withdraw static credit.
 */
function groupHash(entry) {
    const group = isPlainObject(entry.group) ? entry.group : {};
    const payload = JSON.stringify({
        v: RENDERER_VERSION,
        name: entry.name,
        priority: entry.priority,
        rules: entry.rules,
        docs: entry.docs,
        skills: entry.skills,
        pathRegexes: stringList(group.pathRegexes),
        pathGlobs: stringList(group.pathGlobs),
        fileNameRegexes: stringList(group.fileNameRegexes),
        excludePathRegexes: stringList(group.excludePathRegexes),
        excludePathGlobs: stringList(group.excludePathGlobs),
        fileExtensions: normalizedExtensions(group)
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8);
}

function conventionTag(entry) {
    return `[[convention:${entry.name}@${groupHash(entry)}]]`;
}

/**
 * One class section. form 'full' | 'references'. `seenRules` (Set) suppresses a
 * rule already shown under an earlier class in the same digest (BR-PFCI-09).
 */
function renderGroupSection(entry, form, opts = {}, seenRules) {
    const lines = [`${conventionTag(entry)} ${entry.name} (priority ${entry.priority})`];
    if (form === 'full') {
        for (const rule of entry.rules) {
            if (seenRules && seenRules.has(rule)) continue;
            if (seenRules) seenRules.add(rule);
            lines.push(`- ${rule}`);
        }
    }
    for (const doc of entry.docs) lines.push(`- read: ${doc}`);
    for (const skill of entry.skills) lines.push(`- skill: ${skillDisplay(skill, opts)}`);
    return lines;
}

/** A path as shown in a digest: control characters (e.g. a newline in a file name) become `?`. */
function displayPath(rel) {
    return String(rel).replace(/[\u0000-\u001f\u007f]/g, '?');
}

function targetLabel(rels) {
    if (!rels.length) return '(file)';
    const first = displayPath(rels[0]);
    return rels.length > 1 ? `${first} (+${rels.length - 1} more)` : first;
}

function frameLines(activeEntries, rels, opts) {
    const docs = unique(activeEntries.flatMap(e => e.docs));
    const skills = unique(activeEntries.flatMap(e => e.skills)).map(s => skillDisplay(s, opts));
    const label = targetLabel(rels);
    const parts = [];
    if (docs.length) parts.push(`MUST read first: ${docs.join(', ')}`);
    if (skills.length) parts.push(`follow skill protocol: ${skills.join(', ')}`);
    const opening = `[conventions] ${label} — ${parts.length ? parts.join('; ') : 'follow the conventions below'}`;
    const reread = docs.length ? ` Re-read before editing: ${docs.join(', ')}.` : '';
    // State the delivery boundary explicitly. This digest is produced by a
    // PostToolUse hook matched on the file TOOLS (Read/Edit/Write/MultiEdit/
    // NotebookEdit, plus Codex `apply_patch`). A file opened or rewritten through
    // the shell — `cat`, `sed -n`, a heredoc — is not one of those events, so no
    // digest is produced and nothing records the omission: the agent simply never
    // learns the conventions exist. That is invisible from inside the session
    // unless the boundary is named, and some hosts actively steer toward shell
    // file access, so name it every time rather than let silence imply coverage.
    const closing = `[conventions] Earlier section wins on conflict.${reread} A file read or edited via Bash gets NO digest — run the lookup for those. Lookup: ${LOOKUP_COMMAND} ${rels.length ? displayPath(rels[0]) : '<path>'}`;
    return { opening, closing };
}

function composeText(entries, forms, rels, opts) {
    const active = entries.filter(e => forms[e.name] !== 'omitted');
    if (!active.length) return '';
    const { opening, closing } = frameLines(active, rels, opts);
    const seenRules = new Set();
    const lines = [opening];
    for (const entry of active) lines.push(...renderGroupSection(entry, forms[entry.name], opts, seenRules));
    lines.push(closing);
    return lines.join('\n');
}

/**
 * BR-PFCI-08/09 digest with deterministic reduction:
 * all full → while too long: lowest-precedence full → references, else lowest non-omitted → omitted.
 * Never re-expands; all omitted ⇒ empty text (no delivery).
 * @returns {{ text: string, forms: Object<string, 'full'|'references'|'omitted'> }}
 */
function buildDigest(entries, rels, settings, opts = {}) {
    const ordered = Array.isArray(entries) ? entries : [];
    const targets = Array.isArray(rels) ? rels : [rels];
    const maxChars = (settings && settings.maxChars) || DEFAULTS.maxChars;
    const forms = {};
    for (const entry of ordered) forms[entry.name] = 'full';
    const lowestFirst = [...ordered].reverse();
    let text = composeText(ordered, forms, targets, opts);
    while (text.length > maxChars) {
        const lowestFull = lowestFirst.find(e => forms[e.name] === 'full');
        if (lowestFull) {
            forms[lowestFull.name] = 'references';
        } else {
            const lowestActive = lowestFirst.find(e => forms[e.name] !== 'omitted');
            if (!lowestActive) break;
            forms[lowestActive.name] = 'omitted';
        }
        text = composeText(ordered, forms, targets, opts);
    }
    return { text, forms };
}

/** Fresh-context digest for one path (no delivery memory) — parity with the hook. */
function lookup(config, filePath, opts = {}) {
    const projectDir = opts.projectDir || process.cwd();
    const rel = toRepoRelative(filePath, projectDir, opts.cwd || projectDir);
    if (!rel) return { rel: null, entries: [], text: '', forms: {} };
    const settings = resolveSettings(config);
    const entries = matchGroups(config, [rel], settings);
    const { text, forms } = buildDigest(entries, [rel], settings, { ...opts, projectDir });
    return { rel, entries, text, forms };
}

module.exports = {
    RENDERER_VERSION,
    DEFAULTS,
    RANGES,
    PATH_CAP,
    LOOKUP_COMMAND,
    resolveSettings,
    isEnabled,
    extractTargets,
    toRepoRelative,
    globToRegExp,
    normalizedExtensions,
    groupMatches,
    isInjectable,
    injectableEntries,
    sortEntries,
    matchGroups,
    skillPath,
    renderGroupSection,
    groupHash,
    conventionTag,
    buildDigest,
    lookup
};

function runCli(argv) {
    const index = argv.indexOf('--lookup');
    if (index < 0 || !argv[index + 1]) {
        process.stdout.write('Usage: node .claude/hooks/lib/file-conventions.cjs --lookup <path> [--json]\n');
        return 2;
    }
    const { resolveProjectRoot } = require('./project-root.cjs');
    const { loadProjectConfig } = require('./project-config-loader.cjs');
    const projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
    const config = loadProjectConfig();
    const result = lookup(config, argv[index + 1], { projectDir, cwd: process.cwd() });
    // The lookup shows what a file WOULD receive; whether the hook delivers it is separate.
    const settings = resolveSettings(config);
    if (argv.includes('--json')) {
        process.stdout.write(JSON.stringify({
            rel: result.rel,
            enabled: settings.enabled,
            onRead: settings.onRead,
            classes: result.entries.map(e => ({ name: e.name, priority: e.priority, tag: conventionTag(e), form: result.forms[e.name] })),
            text: result.text
        }, null, 2) + '\n');
    } else {
        process.stdout.write((result.text || `[conventions] No convention classes match ${result.rel || argv[index + 1]}`) + '\n');
        if (!settings.enabled) {
            process.stderr.write('[conventions] note: automatic delivery is off (conventionInjection.enabled is not true); static instructions still apply.\n');
        }
    }
    return 0;
}

// Launcher-aware entry: Codex runs hooks via `node -e … require()`, where require.main is undefined.
if (require.main === module || (!require.main && path.resolve(process.argv[1] || '') === __filename)) {
    try {
        process.exitCode = runCli(process.argv.slice(2));
    } catch (err) {
        process.stderr.write(`file-conventions: ${err && err.message ? err.message : err}\n`);
        process.exitCode = 1;
    }
}
