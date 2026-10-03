'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { classifySensitivePath } = require('../../hooks/lib/sensitive-path-policy.cjs');

const DEFAULT_LIMITS = Object.freeze({ maxEntries: 5000, maxFileBytes: 8 * 1024 * 1024, maxTargetBytes: 128 * 1024 * 1024, gitTimeoutMs: 30000 });
const HASH = /^[a-f0-9]{64}$/;
const OWNER = 'portable-review-preparation-v1';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { const error = new Error(code); error.code = code; throw error; };

function within(root, absolute) {
    const relative = path.relative(root, absolute);
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function safeRelative(value) {
    if (typeof value !== 'string' || !value || value.includes('\0')) fail('unsafe-path');
    // Filesystem UTF-8 encoding must not replace an unpaired surrogate with another filename.
    if (Buffer.from(value, 'utf8').toString('utf8') !== value) fail('unsupported-target-path');
    // POSIX treats backslash as a filename byte; converting it would select a slash neighbor.
    if (process.platform !== 'win32' && value.includes('\\')) fail('unsupported-target-path');
    const normalized = value.replace(/\\/g, '/');
    if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe-path');
    if (normalized.split('/').includes('.git') || classifySensitivePath(normalized).sensitive) fail('sensitive-path');
    return normalized;
}

function containedPath(rootDir, relative) {
    const root = fs.realpathSync.native(rootDir);
    const absolute = path.resolve(root, safeRelative(relative));
    if (!within(root, absolute)) fail('unsafe-path');
    let cursor = absolute;
    while (!fs.existsSync(cursor)) {
        const parent = path.dirname(cursor);
        if (parent === cursor) fail('unsafe-path');
        cursor = parent;
    }
    if (!within(root, fs.realpathSync.native(cursor))) fail('unsafe-link');
    return absolute;
}

function limitsOf(overrides = {}) {
    const limits = { ...DEFAULT_LIMITS, ...overrides };
    for (const key of Object.keys(DEFAULT_LIMITS)) {
        if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > DEFAULT_LIMITS[key]) fail('invalid-target-limit');
    }
    return limits;
}

function rejectWriteLinks(root, absolute) {
    let cursor = absolute;
    while (cursor !== root) {
        try { if (fs.lstatSync(cursor).isSymbolicLink()) fail('unsafe-output-link'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        const parent = path.dirname(cursor);
        if (parent === cursor) fail('unsafe-output-directory');
        cursor = parent;
    }
}

function ensureOutputDirectory(rootDir, outputDir) {
    const root = fs.realpathSync.native(rootDir);
    const relative = path.relative(root, path.resolve(root, outputDir)).split(path.sep).join('/');
    safeRelative(relative);
    if (!/^(tmp|temp)\/.+/.test(relative)) fail('unsafe-output-directory');
    const absolute = containedPath(root, relative);
    rejectWriteLinks(root, absolute);
    if (fs.existsSync(absolute)) {
        if (!fs.lstatSync(absolute).isDirectory() || fs.lstatSync(absolute).isSymbolicLink()) fail('unsafe-output-directory');
        const marker = path.join(absolute, '.review-owner.json');
        if (fs.readdirSync(absolute).length && !fs.existsSync(marker)) fail('unowned-output-directory');
        if (fs.existsSync(marker)) {
            if (fs.lstatSync(marker).isSymbolicLink()) fail('unsafe-output-directory');
            let declaration;
            try { declaration = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch { fail('unowned-output-directory'); }
            if (declaration.owner !== OWNER || declaration.root !== root) fail('unowned-output-directory');
        }
    } else fs.mkdirSync(absolute, { recursive: true, mode: 0o700 });
    const marker = path.join(absolute, '.review-owner.json');
    if (!fs.existsSync(marker)) fs.writeFileSync(marker, JSON.stringify({ owner: OWNER, root }), { flag: 'wx', mode: 0o600 });
    return absolute;
}

function writeArtifact(rootDir, outputDir, category, bytes) {
    if (!['target-content', 'rule-content', 'criteria-content'].includes(category)) fail('invalid-artifact-category');
    const dir = ensureOutputDirectory(rootDir, outputDir);
    const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const hash = digest(content);
    const relative = path.relative(rootDir, path.join(dir, category, `${hash}.bin`)).split(path.sep).join('/');
    const absolute = containedPath(rootDir, relative);
    rejectWriteLinks(fs.realpathSync.native(rootDir), absolute);
    fs.mkdirSync(path.dirname(absolute), { recursive: true, mode: 0o700 });
    if (fs.existsSync(absolute)) {
        if (!fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink() || digest(fs.readFileSync(absolute)) !== hash) fail('artifact-integrity');
    } else fs.writeFileSync(absolute, content, { flag: 'wx', mode: 0o600 });
    return { contentHash: hash, contentRef: relative };
}

function readArtifact(rootDir, contentRef, expectedHash, maxBytes = DEFAULT_LIMITS.maxFileBytes) {
    if (!HASH.test(expectedHash || '') || typeof contentRef !== 'string' || !/^(tmp|temp)\/.+\/(target-content|rule-content|criteria-content)\/[a-f0-9]{64}\.bin$/.test(contentRef)) fail('unsafe-content-reference');
    if (path.posix.basename(contentRef) !== `${expectedHash}.bin`) fail('artifact-integrity');
    const absolute = containedPath(rootDir, contentRef);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) fail('artifact-integrity');
    const content = fs.readFileSync(absolute);
    if (digest(content) !== expectedHash) fail('artifact-integrity');
    return content;
}

function git(root, args, limits) {
    try {
        return execFileSync('git', args, { cwd: root, shell: false, windowsHide: true, timeout: limits.gitTimeoutMs,
            maxBuffer: limits.maxTargetBytes, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch { fail('git-target-unresolved'); }
}

function decodeGitPaths(bytes) {
    const text = bytes.toString('utf8');
    // Git's verbatim path bytes must survive the string manifest without replacement.
    if (!Buffer.from(text, 'utf8').equals(bytes)) fail('unsupported-target-path');
    return text;
}

function entryIdentity(entry) {
    return digest(JSON.stringify([entry.layer, entry.status, entry.oldPath, entry.path, entry.beforeId, entry.afterId]));
}

function targetIdentity(target) {
    return digest(JSON.stringify({ schemaVersion: 1, scope: target.scope, base: target.base, repositoryIdentity: target.repositoryIdentity,
        entries: target.entries.map(entry => [entry.id, entry.layer, entry.status, entry.oldPath, entry.path, entry.beforeId, entry.afterId]) }));
}

function captureTarget({ rootDir = process.cwd(), scope = 'local', base, files = [], outputDir, limits: overrides, persist = true } = {}) {
    const limits = limitsOf(overrides);
    const root = fs.realpathSync.native(rootDir);
    if (!['local', 'staged', 'branch', 'files'].includes(scope)) fail('invalid-target-scope');
    if (scope !== 'branch' && base !== undefined && base !== null) fail('invalid-target-base');
    if (scope !== 'files' && files.length) fail('invalid-target-files');
    if (scope === 'files' && (!Array.isArray(files) || files.length === 0)) fail('empty-named-target');
    const output = persist ? ensureOutputDirectory(root, outputDir || `tmp/reviews/capture-${crypto.randomUUID()}`) : null;
    let gitDir = null;
    let head = null;
    try { gitDir = fs.realpathSync.native(path.resolve(root, decodeGitPaths(git(root, ['rev-parse', '--absolute-git-dir'], limits)).trim())); }
    catch (error) { if (error.code === 'unsupported-target-path') throw error; if (scope !== 'files') fail('git-target-unresolved'); }
    if (gitDir) {
        const top = fs.realpathSync.native(decodeGitPaths(git(root, ['rev-parse', '--show-toplevel'], limits)).trim());
        if (top !== root) fail('project-root-is-not-git-root');
        try { head = git(root, ['rev-parse', '--verify', 'HEAD'], limits).toString().trim(); } catch { /* unborn repository */ }
    }
    const target = { schemaVersion: 1, scope, base: { head }, repositoryIdentity: { root, gitDir }, fingerprint: '', entries: [] };
    let totalBytes = 0;
    const loadWorking = relative => {
        const absolute = containedPath(root, relative);
        const stat = fs.lstatSync(absolute);
        if (!stat.isFile() || stat.isSymbolicLink()) fail('unsupported-target-file');
        if (stat.size > limits.maxFileBytes) fail('target-content-budget');
        return fs.readFileSync(absolute);
    };
    const loadBlob = id => {
        const bytes = git(root, ['cat-file', 'blob', id], limits);
        if (bytes.length > limits.maxFileBytes) fail('target-content-budget');
        return bytes;
    };
    const add = (layer, status, oldPath, currentPath, before, after) => {
        if (target.entries.length >= limits.maxEntries) fail('target-entry-budget');
        oldPath = oldPath === null ? null : safeRelative(oldPath);
        currentPath = currentPath === null ? null : safeRelative(currentPath);
        const entry = { id: '', layer, status, oldPath, path: currentPath, beforeId: null, afterId: null, beforeContentRef: null, afterContentRef: null };
        for (const [side, bytes] of [['before', before], ['after', after]]) {
            if (bytes === null) continue;
            totalBytes += bytes.length;
            if (bytes.length > limits.maxFileBytes || totalBytes > limits.maxTargetBytes) fail('target-content-budget');
            entry[`${side}Id`] = digest(bytes);
            if (persist) entry[`${side}ContentRef`] = writeArtifact(root, output, 'target-content', bytes).contentRef;
        }
        entry.id = entryIdentity(entry);
        target.entries.push(entry);
    };
    const rawDiff = (layer, args) => {
        const parts = decodeGitPaths(git(root, ['-c', 'core.quotepath=false', 'diff', '--raw', '-z', '--no-abbrev', '--no-ext-diff', '--no-textconv', '--find-renames', ...args, '--'], limits)).split('\0');
        for (let index = 0; index < parts.length && parts[index];) {
            const header = parts[index++].match(/^:(\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([A-Z])\d*$/);
            if (!header) fail('unsupported-git-diff');
            const [, beforeMode, afterMode, beforeBlob, afterBlob, status] = header;
            const first = safeRelative(parts[index++]);
            const second = status === 'R' || status === 'C' ? safeRelative(parts[index++]) : first;
            if (![beforeMode, afterMode].every(mode => ['000000', '100644', '100755'].includes(mode))) fail('unsupported-target-file');
            const before = /^0+$/.test(beforeBlob) ? null : loadBlob(beforeBlob);
            const after = afterMode === '000000' ? null : (layer === 'worktree' ? loadWorking(second) : loadBlob(afterBlob));
            add(layer, status, before === null ? null : first, after === null ? null : second, before, after);
        }
    };
    if (scope === 'files') {
        const selected = files.map(file => {
            if (typeof file !== 'string' || file.split(/[\\/]/).includes('..')) fail('unsafe-path');
            const absolute = path.isAbsolute(file) ? file : path.resolve(root, file);
            if (!within(root, absolute)) fail('unsafe-path');
            return safeRelative(path.relative(root, absolute).split(path.sep).join('/'));
        });
        if (new Set(selected).size !== selected.length) fail('duplicate-named-target');
        target.base.files = selected;
        for (const relative of selected) add('files', 'F', null, relative, null, loadWorking(relative));
    } else {
        if (scope === 'branch') {
            if (typeof base !== 'string' || !/^[A-Za-z0-9_@+#=,][A-Za-z0-9._+#=,/@~^{}:-]*$/.test(base) || base.includes('..') || !head) fail('invalid-target-base');
            const mergeBase = git(root, ['merge-base', base, 'HEAD'], limits).toString().trim();
            target.base = { ref: base, mergeBase, head };
            rawDiff('branch', [mergeBase, 'HEAD']);
        }
        rawDiff('staged', ['--cached']);
        if (scope !== 'staged') {
            rawDiff('worktree', []);
            const untracked = decodeGitPaths(git(root, ['ls-files', '--others', '--exclude-standard', '-z'], limits)).split('\0').filter(Boolean);
            for (const relative of untracked) {
                // Disposable review artifacts are never source target entries.
                if (/^(tmp|temp)\//.test(relative)) continue;
                add('untracked', 'A', null, relative, null, loadWorking(relative));
            }
        }
    }
    target.fingerprint = targetIdentity(target);
    return target;
}

function validateTarget(target, { rootDir, verifyContent = true } = {}) {
    try {
        if (!target || Object.keys(target).some(key => !['schemaVersion', 'scope', 'base', 'repositoryIdentity', 'fingerprint', 'entries'].includes(key)) || target.schemaVersion !== 1 || !['local', 'staged', 'branch', 'files'].includes(target.scope) || !target.base || !Array.isArray(target.entries)) fail('invalid-target-manifest');
        const root = fs.realpathSync.native(target.repositoryIdentity?.root);
        if (root !== target.repositoryIdentity.root || (rootDir && root !== fs.realpathSync.native(rootDir))) fail('wrong-repository-target');
        if (typeof target.repositoryIdentity.gitDir !== 'string' && target.repositoryIdentity.gitDir !== null) fail('invalid-target-manifest');
        if (Object.keys(target.repositoryIdentity).some(key => !['root', 'gitDir'].includes(key)) || Object.keys(target.base).some(key => !['head', 'ref', 'mergeBase', 'files'].includes(key))) fail('invalid-target-manifest');
        if (target.base.head !== null && (typeof target.base.head !== 'string' || !/^[a-f0-9]{40,64}$/.test(target.base.head))) fail('invalid-target-manifest');
        if (target.entries.length > DEFAULT_LIMITS.maxEntries || !HASH.test(target.fingerprint || '')) fail('invalid-target-manifest');
        if (target.scope === 'branch' && (typeof target.base.ref !== 'string' || typeof target.base.mergeBase !== 'string')) fail('invalid-target-manifest');
        if (target.scope === 'files' && (!Array.isArray(target.base.files) || target.base.files.length === 0)) fail('invalid-target-manifest');
        const ids = new Set();
        let total = 0;
        for (const entry of target.entries) {
            if (!entry || Object.keys(entry).some(key => !['id', 'layer', 'status', 'oldPath', 'path', 'beforeId', 'afterId', 'beforeContentRef', 'afterContentRef'].includes(key)) || !['branch', 'staged', 'worktree', 'untracked', 'files'].includes(entry.layer) || !['A', 'M', 'D', 'R', 'C', 'T', 'F'].includes(entry.status)) fail('invalid-target-entry');
            if (entry.path === null && entry.oldPath === null) fail('invalid-target-entry');
            for (const location of [entry.path, entry.oldPath]) if (location !== null) safeRelative(location);
            for (const side of ['before', 'after']) {
                const id = entry[`${side}Id`], ref = entry[`${side}ContentRef`];
                if (id === null) { if (ref !== null) fail('invalid-target-entry'); }
                else if (!HASH.test(id || '') || typeof ref !== 'string') fail('invalid-target-entry');
                if (id !== null && verifyContent) total += readArtifact(root, ref, id).length;
            }
            if (total > DEFAULT_LIMITS.maxTargetBytes || entry.id !== entryIdentity(entry) || ids.has(entry.id)) fail('invalid-target-entry');
            if ((entry.beforeId === null) !== (entry.oldPath === null) || (entry.afterId === null) !== (entry.path === null)) fail('invalid-target-entry');
            ids.add(entry.id);
        }
        if (target.fingerprint !== targetIdentity(target)) fail('target-fingerprint-mismatch');
        return { valid: true, reasons: [] };
    } catch (error) { return { valid: false, reasons: [{ code: error.code || 'invalid-target-manifest', entryIds: [], sourceIds: [] }] }; }
}

function readTargetContent(target, entryId, side) {
    if (!['before', 'after'].includes(side)) fail('invalid-target-side');
    const entry = target.entries.find(item => item.id === entryId);
    if (!entry) fail('unknown-target-entry');
    return entry[`${side}Id`] === null ? null : readArtifact(target.repositoryIdentity.root, entry[`${side}ContentRef`], entry[`${side}Id`]);
}

function checkTargetFreshness(target) {
    const validation = validateTarget(target);
    if (!validation.valid) return { fresh: false, reasons: validation.reasons };
    try {
        const current = captureTarget({ rootDir: target.repositoryIdentity.root, scope: target.scope, base: target.scope === 'branch' ? target.base.ref : undefined,
            files: target.scope === 'files' ? target.base.files : [], persist: false });
        return { fresh: current.fingerprint === target.fingerprint, reasons: current.fingerprint === target.fingerprint ? [] : [{ code: 'target-changed', entryIds: target.entries.map(entry => entry.id), sourceIds: [] }] };
    } catch { return { fresh: false, reasons: [{ code: 'target-unresolved', entryIds: [], sourceIds: [] }] }; }
}

module.exports = { captureTarget, validateTarget, readTargetContent, checkTargetFreshness, DEFAULT_LIMITS, digest, safeRelative, containedPath, ensureOutputDirectory, rejectWriteLinks, writeArtifact, readArtifact, targetIdentity };
