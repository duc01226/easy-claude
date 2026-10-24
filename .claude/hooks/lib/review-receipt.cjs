#!/usr/bin/env node
'use strict';

/**
 * Review-before-commit receipt store — a bounded, short-lived proof that a
 * review fix-loop converged over the CURRENT changeset.
 *
 * This is bookkeeping, NEVER proof of user consent, a native permission, or a
 * security boundary. The store is an ordinary directory any process with write
 * access can forge. It exists so `review-commit-gate.cjs` can stop the agent
 * from committing a changeset no review fix-loop ever saw, while leaving an
 * explicit, recorded way to skip.
 *
 * Schema 2 receipts bind exact repository storage + base tree + candidate tree.
 * A pre-review snapshot names its target (`worktree`, `staged`, or a supported
 * per-statement commit descriptor); issuance recomputes that same target and
 * refuses drift. Matching is target-independent, so identical content can move
 * from worktree to index without invalidating review. Every index/tree write is
 * isolated under repository `tmp/`; candidate errors remain ERROR, never CLEAN.
 *
 * Kinds that satisfy the gate: `commit-review`, `changes-review`, `why-review`,
 * `workflow-review-changes`. `skip` is the recorded override: the `commit`
 * skill's Low-risk decision or the user's explicit request, named in `reason`.
 *
 * Target `branch` measures a whole pull-request branch: base = the tree of the merge-base of HEAD
 * and the named base ref, candidate = the working tree (a review before the commit) or, with
 * `committed: true`, HEAD's tree (the head a pull request publishes). Matching compares trees, so a
 * review of the working tree matches the committed head exactly when everything reviewed was committed.
 *
 * Under `reviewGate.mode: enforce` (project config) a review receipt needs an ATTESTATION: a record
 * that a review skill of that kind started (written by the review protocol hook) before the reviewed
 * snapshot was captured. Issuance consumes one attestation; matching ignores review receipts without
 * one. Skip receipts are unchanged: they stay explicit, recorded overrides.
 *
 * CLI (args, real clock):
 *   node review-receipt.cjs snapshot [--target=worktree|staged|commit-descriptor|branch] [--base=<ref>]
 *   node review-receipt.cjs issue --kind=... --scope=full-changeset --snapshot-json=<json>
 *   node review-receipt.cjs skip [--reason=...]
 *   node review-receipt.cjs check [--target=... --kind=...]
 *   node review-receipt.cjs clear
 *   node review-receipt.cjs publish-status --pr=<n> [--base=<ref>] [--repository=owner/repo]
 * `publish-status` (reviewGate.status.enabled) posts a success commit status on the pull request's
 * head from a matching whole-branch review receipt or an explicit committed review bypass.
 * The CLI resolves the repository from the current working directory and the
 * store from CK_REVIEW_RECEIPT_STORE (default os.tmpdir()/ck/review-receipts).
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REVIEW_KINDS = Object.freeze(['commit-review', 'changes-review', 'why-review', 'workflow-review-changes']);
const SKIP_KIND = 'skip';
const KINDS = Object.freeze([...REVIEW_KINDS, SKIP_KIND]);
const DEFAULT_LIFETIME_MS = 2 * 60 * 60 * 1000;
// Bounded like the git lease, but longer: a review can precede the commit by
// many turns in one working session, unlike the 15-minute destructive window.
const MAX_LIFETIME_MS = 4 * 60 * 60 * 1000;
const RECEIPT_ID_PATTERN = /^[a-f0-9]{32}$/;
const TREE_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const REVIEW_TARGETS = Object.freeze(['worktree', 'staged', 'commit-descriptor', 'branch']);
// A ref name for the branch target's base: no option-shaped, range or revision-expression input.
const BASE_REF_PATTERN = /^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]{1,200}$/;
const ATTESTATION_ID_PATTERN = RECEIPT_ID_PATTERN;
const ATTESTATION_PREFIX = 'attest.';
const MAX_RECORD_BYTES = 8192;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function canonicalDirectory(value) {
    if (typeof value !== 'string' || value.length === 0 || !path.isAbsolute(value)) {
        throw new Error('An existing absolute repository directory is required');
    }
    const resolved = fs.realpathSync.native(value);
    if (!fs.statSync(resolved).isDirectory()) throw new Error('Directory required');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function boundedText(value, label, max = 512) {
    if (typeof value !== 'string' || value.length === 0 || value.length > max ||
        value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) {
        throw new Error(`${label} must be a bounded printable string`);
    }
    return value;
}

function validKind(value) {
    if (!KINDS.includes(value)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
    return value;
}

function clock(options) {
    const now = options?.now === undefined ? Date.now() : options.now;
    if (!Number.isSafeInteger(now) || now <= 0) throw new Error('now must be a positive safe integer');
    return now;
}

function storeDirectory(options, repositoryHash) {
    // The env override lets a host relocate the store and lets tests isolate it;
    // the hook and the CLI must resolve the SAME default or the gate never clears.
    const configured = process.env.CK_REVIEW_RECEIPT_STORE;
    const store = options.storeDir === undefined
        ? (configured && configured.length > 0 ? configured : path.join(os.tmpdir(), 'ck', 'review-receipts'))
        : options.storeDir;
    if (typeof store !== 'string' || store.length === 0 || !path.isAbsolute(store)) {
        throw new Error('storeDir must be an absolute path');
    }
    return path.join(store, repositoryHash);
}

function candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree }) {
    return sha256(JSON.stringify({ repository, storageIdentity, baseTree, candidateTree }));
}

function context(options) {
    const repository = canonicalDirectory(options.repository);
    const repositoryHash = sha256(repository);
    const storageIdentity = canonicalDirectory(options.storageIdentity);
    const baseTree = boundedText(options.baseTree, 'baseTree', 64);
    const candidateTree = boundedText(options.candidateTree, 'candidateTree', 64);
    if (!TREE_PATTERN.test(baseTree) || !TREE_PATTERN.test(candidateTree)) throw new Error('baseTree and candidateTree must be Git tree IDs');
    const fingerprint = candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree });
    if (options.fingerprint !== undefined && options.fingerprint !== fingerprint) throw new Error('fingerprint does not match repository/storage/base/candidate identity');
    return {
        repository,
        repositoryHash,
        storageIdentity,
        baseTree,
        candidateTree,
        fingerprint,
        now: clock(options),
        directory: storeDirectory(options, repositoryHash)
    };
}

function receiptPath(ctx, kind, fingerprint) {
    return path.join(ctx.directory, `${kind}.${fingerprint}.json`);
}

function readRecord(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_RECORD_BYTES) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
        return null;
    }
}

function validRecord(record, ctx, kind, active = true) {
    return record && record.schemaVersion === 2 && RECEIPT_ID_PATTERN.test(record.receiptId) &&
        record.repository === ctx.repository && record.repositoryHash === ctx.repositoryHash &&
        record.storageIdentity === ctx.storageIdentity && record.baseTree === ctx.baseTree &&
        record.candidateTree === ctx.candidateTree && record.fingerprint === ctx.fingerprint &&
        record.kind === kind && record.scope === 'full-changeset' && REVIEW_TARGETS.includes(record.target) &&
        (record.descriptor === null || (record.descriptor && typeof record.descriptor === 'object' && !Array.isArray(record.descriptor))) &&
        Number.isSafeInteger(record.issuedAt) && record.issuedAt > 0 &&
        Number.isSafeInteger(record.expiresAt) && record.expiresAt > record.issuedAt &&
        record.expiresAt - record.issuedAt <= MAX_LIFETIME_MS &&
        (!active || (record.revokedAt === undefined && record.issuedAt <= ctx.now && ctx.now < record.expiresAt));
}

function writeRecord(ctx, kind, fingerprint, record) {
    fs.mkdirSync(ctx.directory, { recursive: true, mode: 0o700 });
    const file = receiptPath(ctx, kind, fingerprint);
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    const contents = JSON.stringify(record);
    if (Buffer.byteLength(contents, 'utf8') > MAX_RECORD_BYTES) throw new Error('Receipt metadata exceeds the supported bound');
    fs.writeFileSync(temporary, contents, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
    return record;
}

const FORBIDDEN_GIT_ENV = /^(?:GIT_(?:INDEX_FILE|DIR|WORK_TREE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|REPLACE_REF_BASE|NO_REPLACE_OBJECTS|PREFIX|CEILING_DIRECTORIES|DISCOVERY_ACROSS_FILESYSTEM|NAMESPACE|ATTR_NOSYSTEM|ATTR_SOURCE|SHALLOW_FILE|INDEX_VERSION|LITERAL_PATHSPECS|GLOB_PATHSPECS|NOGLOB_PATHSPECS|ICASE_PATHSPECS)|GIT_CONFIG(?:_|$))/i;

// Command-scoped config (GIT_CONFIG_COUNT with KEY_n/VALUE_n pairs) that a host
// injects for remote access — e.g. a cloud container's GitHub proxy — cannot
// change what a commit contains. It is accepted only when the set is well
// formed and EVERY key is one of these; any other key (core.worktree, filters,
// hooksPath, ...) still fails closed, as do GIT_CONFIG_GLOBAL/SYSTEM/NOSYSTEM/
// PARAMETERS. The capture itself still runs with the pairs stripped.
const INJECTED_GIT_CONFIG_ENV = /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/i;
const CONTENT_NEUTRAL_CONFIG_KEY = /^(?:credential\.interactive|url\.[^\s]+\.(?:insteadof|pushinsteadof))$/i;

function contentNeutralInjectedConfig(env) {
    const count = env.GIT_CONFIG_COUNT;
    if (typeof count !== 'string' || !/^[1-9]\d?$/.test(count)) return false;
    const expected = new Set(['GIT_CONFIG_COUNT']);
    for (let i = 0; i < Number(count); i++) expected.add(`GIT_CONFIG_KEY_${i}`).add(`GIT_CONFIG_VALUE_${i}`);
    const present = Object.keys(env).filter(name => INJECTED_GIT_CONFIG_ENV.test(name));
    if (present.length !== expected.size || present.some(name => !expected.has(name))) return false;
    for (let i = 0; i < Number(count); i++) {
        const key = env[`GIT_CONFIG_KEY_${i}`];
        if (typeof key !== 'string' || !CONTENT_NEUTRAL_CONFIG_KEY.test(key)) return false;
    }
    return true;
}

function gitEnvironmentError(env) {
    const vars = env || {};
    const neutral = contentNeutralInjectedConfig(vars);
    return Object.keys(vars).find(name => FORBIDDEN_GIT_ENV.test(name) &&
        !(neutral && INJECTED_GIT_CONFIG_ENV.test(name))) || null;
}

function gitEnvironmentWithoutContext(env = process.env) {
    const clean = { ...env };
    for (const name of Object.keys(clean)) if (FORBIDDEN_GIT_ENV.test(name)) delete clean[name];
    return clean;
}

function runGit(exec, cwd, args, env, extra = {}) {
    const result = exec('git', args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(env ? { env } : {}),
        ...extra
    });
    return Buffer.isBuffer(result) ? result.toString('utf8') : String(result ?? '');
}

function pathIsInside(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function gitPath(repository, value) {
    const resolved = path.resolve(repository, value);
    if (fs.existsSync(resolved)) return fs.realpathSync.native(resolved);
    return resolved;
}

function treeId(value, label) {
    const id = String(value || '').trim();
    if (!TREE_PATTERN.test(id)) throw Object.assign(new Error(`${label} is not a Git tree ID`), { code: 'INVALID_TREE_ID' });
    return id;
}

function boolConfig(run, key) {
    try {
        return run(['config', '--bool', '--get', key]).trim() === 'true';
    } catch (error) {
        if (error.status === 1) return false;
        throw error;
    }
}

function fileState(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw Object.assign(new Error('Git index must be a regular file'), { code: 'UNSAFE_INDEX_FILE' });
        return { exists: true, hash: sha256(fs.readFileSync(file)) };
    } catch (error) {
        if (error.code === 'ENOENT') return { exists: false, hash: null };
        throw error;
    }
}

function sameFileState(a, b) {
    return a?.exists === b?.exists && a?.hash === b?.hash;
}

function validateLiteralPaths(repository, cwd, paths) {
    if (!Array.isArray(paths) || paths.length === 0) throw Object.assign(new Error('Literal-path mode requires at least one file'), { code: 'INVALID_LITERAL_PATHS' });
    if (paths.length > 128 || paths.reduce((size, item) => size + (typeof item === 'string' ? item.length : 0), 0) > 4096) {
        throw Object.assign(new Error('Literal path list exceeds the supported bound'), { code: 'INVALID_LITERAL_PATHS' });
    }
    for (const value of paths) {
        if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\x00-\x1f\x7f]/.test(value) || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
            throw Object.assign(new Error('Only relative, literal file paths are supported'), { code: 'INVALID_LITERAL_PATHS' });
        }
        if (value.startsWith(':') || /[*?\[\]]/.test(value)) {
            throw Object.assign(new Error('Magic and wildcard pathspecs are unsupported; name an exact file'), { code: 'UNSUPPORTED_PATHSPEC' });
        }
        const absolute = path.resolve(cwd, value);
        if (!pathIsInside(repository, absolute)) throw Object.assign(new Error('Literal path resolves outside the repository'), { code: 'PATH_OUTSIDE_REPOSITORY' });
        let parent;
        try {
            parent = fs.realpathSync.native(path.dirname(absolute));
        } catch (_) {
            throw Object.assign(new Error('Literal path parent must exist'), { code: 'INVALID_LITERAL_PATHS' });
        }
        if (!pathIsInside(repository, parent)) throw Object.assign(new Error('Literal path follows a directory symlink outside the repository'), { code: 'PATH_OUTSIDE_REPOSITORY' });
        try {
            if (fs.statSync(absolute).isDirectory()) throw Object.assign(new Error('Literal paths must name files, not directories'), { code: 'INVALID_LITERAL_PATHS' });
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

function descriptorForCapture(repository, storageIdentity, cwd, indexPath, descriptor) {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
        throw Object.assign(new Error('A commit descriptor is required'), { code: 'INVALID_DESCRIPTOR' });
    }
    const mode = descriptor.mode;
    if (!['staged', 'all', 'literal-paths'].includes(mode)) throw Object.assign(new Error('Unsupported commit mode'), { code: 'UNSUPPORTED_COMMIT_MODE' });
    for (const [key, actual] of [['repository', repository], ['storageIdentity', storageIdentity], ['indexPath', indexPath]]) {
        if (descriptor[key] !== undefined && path.resolve(String(descriptor[key])) !== path.resolve(actual)) {
            throw Object.assign(new Error(`Commit descriptor ${key} changed`), { code: 'DESCRIPTOR_CONTEXT_CHANGED' });
        }
    }
    if (descriptor.cwd !== undefined && path.resolve(String(descriptor.cwd)) !== path.resolve(cwd)) {
        throw Object.assign(new Error('Commit descriptor cwd changed'), { code: 'DESCRIPTOR_CONTEXT_CHANGED' });
    }
    const literalPaths = descriptor.literalPaths === undefined ? [] : descriptor.literalPaths;
    if (!Array.isArray(literalPaths) || literalPaths.some(item => typeof item !== 'string')) {
        throw Object.assign(new Error('literalPaths must be an array of strings'), { code: 'INVALID_LITERAL_PATHS' });
    }
    if (mode === 'literal-paths') validateLiteralPaths(repository, cwd, literalPaths);
    else if (literalPaths.length !== 0) throw Object.assign(new Error('Literal paths cannot be mixed with staged or -a mode'), { code: 'MIXED_COMMIT_MODE' });
    if (descriptor.amend !== undefined && typeof descriptor.amend !== 'boolean') {
        throw Object.assign(new Error('amend must be a boolean'), { code: 'INVALID_DESCRIPTOR' });
    }
    // `amend` is recorded only when true so every non-amend descriptor keeps its prior identity.
    return { repository, storageIdentity, cwd, indexPath, mode, literalPaths: [...literalPaths], ...(descriptor.amend ? { amend: true } : {}) };
}

function branchDescriptor(descriptor) {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor) || typeof descriptor.base !== 'string' || !BASE_REF_PATTERN.test(descriptor.base)) {
        throw Object.assign(new Error('A branch review needs a base ref name (for example origin/main)'), { code: 'INVALID_BRANCH_BASE' });
    }
    if (descriptor.committed !== undefined && typeof descriptor.committed !== 'boolean') {
        throw Object.assign(new Error('committed must be a boolean'), { code: 'INVALID_DESCRIPTOR' });
    }
    return { base: descriptor.base, ...(descriptor.committed ? { committed: true } : {}) };
}

/** The remote-tracking ref first (what a pull request merges into), then a local branch, then the name as given. */
function resolveBaseCommit(run, base) {
    for (const ref of [`refs/remotes/origin/${base}`, `refs/heads/${base}`, base]) {
        try {
            const commit = run(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
            if (/^[a-f0-9]{40,64}$/.test(commit)) return commit;
        } catch (_) { /* try the next spelling */ }
    }
    throw Object.assign(new Error(`Base ref ${base} does not resolve to a commit; fetch it first`), { code: 'BASE_UNRESOLVED' });
}

function errorSnapshot(target, error, repository = null, cwd = null) {
    return {
        status: 'ERROR', repository, storageIdentity: null, cwd, indexPath: null,
        baseTree: null, candidateTree: null, fingerprint: null, target,
        descriptor: null,
        errorCode: typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'CANDIDATE_COMPUTATION_FAILED',
        errorMessage: String(error?.message || 'Candidate computation failed').slice(0, 500)
    };
}

/**
 * Capture the exact content a review or supported commit invocation targets.
 * Every Git write runs against a throwaway index and object directory under the
 * repository's `tmp/`; the user's index and object database remain read-only.
 */
function captureReviewTarget(options = {}) {
    const target = options.target;
    let repository = null;
    let cwd = null;
    let actualIndexPath = null;
    let indexBefore = null;
    let temporaryDirectory = null;
    let result = null;
    const exec = options.exec || execFileSync;
    try {
        if (!REVIEW_TARGETS.includes(target)) throw Object.assign(new Error('target must be worktree, staged, commit-descriptor or branch'), { code: 'INVALID_TARGET' });
        const sourceRepository = canonicalDirectory(options.repository);
        const sourceCwd = options.descriptor?.cwd || options.cwd || sourceRepository;
        repository = canonicalDirectory(sourceRepository);
        cwd = canonicalDirectory(sourceCwd);
        if (!pathIsInside(repository, cwd)) throw Object.assign(new Error('Effective cwd must be inside the repository'), { code: 'CWD_OUTSIDE_REPOSITORY' });
        const unsafeVariable = gitEnvironmentError(process.env);
        if (unsafeVariable) throw Object.assign(new Error(`Unsupported ambient Git context: ${unsafeVariable}`), { code: 'UNSUPPORTED_GIT_ENVIRONMENT' });
        const cleanEnv = gitEnvironmentWithoutContext(process.env);
        const run = (args, extra = {}) => runGit(exec, repository, args, cleanEnv, extra);

        const discoveredRoot = canonicalDirectory(run(['rev-parse', '--show-toplevel']).trim());
        if (discoveredRoot !== repository) throw Object.assign(new Error('Repository identity changed during candidate capture'), { code: 'REPOSITORY_IDENTITY_CHANGED' });
        const storageRaw = run(['rev-parse', '--git-common-dir']).trim();
        const storageIdentity = canonicalDirectory(path.isAbsolute(storageRaw) ? storageRaw : path.resolve(repository, storageRaw));
        const rawIndexPath = run(['rev-parse', '--git-path', 'index']).trim();
        if (!rawIndexPath) throw Object.assign(new Error('Git did not resolve its default index path'), { code: 'INDEX_PATH_UNRESOLVED' });
        actualIndexPath = gitPath(repository, rawIndexPath);
        const rawObjectsPath = run(['rev-parse', '--git-path', 'objects']).trim();
        const objectsPath = canonicalDirectory(path.isAbsolute(rawObjectsPath) ? rawObjectsPath : path.resolve(repository, rawObjectsPath));
        if (fs.existsSync(path.join(objectsPath, 'info', 'alternates'))) {
            throw Object.assign(new Error('Alternate object stores are unsupported'), { code: 'UNSUPPORTED_ALTERNATE_OBJECT_STORE' });
        }
        let descriptor = target === 'commit-descriptor'
            ? descriptorForCapture(repository, storageIdentity, cwd, actualIndexPath, options.descriptor)
            : null;
        if (target === 'branch') descriptor = branchDescriptor(options.descriptor);
        indexBefore = fileState(actualIndexPath);
        const sharedIndex = run(['rev-parse', '--shared-index-path']).trim();
        if (sharedIndex) throw Object.assign(new Error('Split indexes are unsupported'), { code: 'UNSUPPORTED_SPLIT_INDEX' });
        if (boolConfig(run, 'core.splitIndex')) throw Object.assign(new Error('Split-index mode is unsupported'), { code: 'UNSUPPORTED_SPLIT_INDEX' });
        if (boolConfig(run, 'core.sparseCheckout')) throw Object.assign(new Error('Sparse checkouts are unsupported'), { code: 'UNSUPPORTED_SPARSE_INDEX' });
        if (run(['ls-files', '-u', '-z']).length !== 0) throw Object.assign(new Error('Unmerged index entries must be resolved first'), { code: 'UNMERGED_INDEX' });
        const sparseEntries = run(['ls-files', '--sparse', '--stage', '-z']);
        if (sparseEntries.split('\0').some(entry => entry.startsWith('040000 '))) {
            throw Object.assign(new Error('Sparse index entries are unsupported'), { code: 'UNSUPPORTED_SPARSE_INDEX' });
        }

        let headCommit = null;
        let baseTree;
        try {
            headCommit = run(['rev-parse', '--verify', 'HEAD']).trim();
            baseTree = treeId(run(['rev-parse', `${headCommit}^{tree}`]), 'baseTree');
        } catch (headError) {
            let headRef;
            try {
                headRef = run(['symbolic-ref', '-q', 'HEAD']).trim();
            } catch (_) {
                throw Object.assign(new Error('HEAD is not a confirmed unborn branch'), { code: 'HEAD_UNRESOLVED' });
            }
            try {
                run(['show-ref', '--verify', '--quiet', headRef]);
                throw Object.assign(new Error('HEAD ref exists but could not be resolved'), { code: 'HEAD_UNRESOLVED' });
            } catch (refError) {
                if (refError.code === 'HEAD_UNRESOLVED' || refError.status !== 1) throw refError;
            }
            baseTree = treeId(run(['hash-object', '-t', 'tree', '--stdin'], { input: '' }), 'empty baseTree');
        }
        if (target === 'branch') {
            if (!headCommit) throw Object.assign(new Error('A branch review needs a commit on HEAD'), { code: 'BRANCH_WITHOUT_HEAD' });
            const baseCommit = resolveBaseCommit(run, descriptor.base);
            let mergeBase = '';
            try {
                mergeBase = run(['merge-base', headCommit, baseCommit]).trim();
            } catch (_) { /* exit 1: no common ancestor, reported below */ }
            if (!/^[a-f0-9]{40,64}$/.test(mergeBase)) throw Object.assign(new Error(`No merge-base between HEAD and ${descriptor.base}`), { code: 'NO_MERGE_BASE' });
            baseTree = treeId(run(['rev-parse', `${mergeBase}^{tree}`]), 'branch baseTree');
            descriptor = { ...descriptor, mergeBase };
        }
        if (descriptor?.amend) {
            // An amend replaces HEAD, so the commit it produces is reviewed against HEAD's parent —
            // the same base `git reset --soft HEAD~1 && git commit` would have.
            if (!headCommit) throw Object.assign(new Error('Cannot amend: HEAD has no commit'), { code: 'AMEND_WITHOUT_HEAD' });
            const parents = run(['rev-list', '--parents', '-n', '1', headCommit]).trim().split(/\s+/).slice(1);
            if (parents.length > 1) throw Object.assign(new Error('Amending a merge commit is unsupported for receipt matching'), { code: 'UNSUPPORTED_AMEND_MERGE' });
            baseTree = parents.length === 1
                ? treeId(run(['rev-parse', `${parents[0]}^{tree}`]), 'amend baseTree')
                : treeId(run(['hash-object', '-t', 'tree', '--stdin'], { input: '' }), 'empty amend baseTree');
        }

        const projectTmp = path.join(repository, 'tmp');
        fs.mkdirSync(projectTmp, { recursive: true });
        const canonicalTmp = fs.realpathSync.native(projectTmp);
        if (!pathIsInside(repository, canonicalTmp)) throw Object.assign(new Error('Repository tmp directory resolves outside the repository'), { code: 'TEMP_DIRECTORY_OUTSIDE_REPOSITORY' });
        temporaryDirectory = fs.mkdtempSync(path.join(canonicalTmp, 'ck-review-candidate-'));
        const tempIndex = path.join(temporaryDirectory, 'index');
        const tempObjects = path.join(temporaryDirectory, 'objects');
        fs.mkdirSync(tempObjects);
        const candidateEnv = {
            ...cleanEnv,
            GIT_INDEX_FILE: tempIndex,
            GIT_OBJECT_DIRECTORY: tempObjects,
            GIT_ALTERNATE_OBJECT_DIRECTORIES: objectsPath
        };
        const candidateRun = (args, extra = {}) => runGit(exec, repository, args, candidateEnv, extra);
        const mode = target === 'commit-descriptor' ? descriptor.mode
            : target === 'branch' ? (descriptor.committed ? 'committed' : 'worktree') : target;
        if (mode === 'committed') {
            candidateRun(['read-tree', headCommit]);
        } else if (mode === 'staged' || mode === 'all') {
            if (indexBefore.exists) fs.copyFileSync(actualIndexPath, tempIndex);
            else candidateRun(headCommit ? ['read-tree', headCommit] : ['read-tree', '--empty']);
        } else {
            candidateRun(headCommit ? ['read-tree', headCommit] : ['read-tree', '--empty']);
        }
        if (mode === 'worktree') {
            candidateRun(['add', '-A']);
        } else if (mode === 'all') {
            candidateRun(['add', '-u']);
        } else if (mode === 'literal-paths') {
            candidateRun(['--literal-pathspecs', 'add', '-A', '--', ...descriptor.literalPaths], { cwd });
        }
        const candidateTree = treeId(candidateRun(['write-tree']), 'candidateTree');
        const fingerprint = candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree });
        result = {
            status: candidateTree === baseTree ? 'CLEAN' : 'CHANGED',
            repository, storageIdentity, cwd, indexPath: actualIndexPath,
            baseTree, candidateTree, fingerprint, target, descriptor,
            capturedAt: clock(options)
        };
    } catch (error) {
        result = errorSnapshot(target, error, repository, cwd);
    } finally {
        if (actualIndexPath && indexBefore) {
            try {
                if (!sameFileState(indexBefore, fileState(actualIndexPath))) {
                    result = errorSnapshot(target, Object.assign(new Error('The real Git index changed during candidate capture'), { code: 'INDEX_CHANGED_DURING_CAPTURE' }), repository, cwd);
                }
            } catch (error) {
                result = errorSnapshot(target, error, repository, cwd);
            }
        }
        if (temporaryDirectory) {
            try {
                fs.rmSync(temporaryDirectory, { recursive: true, force: true });
            } catch (error) {
                result = errorSnapshot(target, Object.assign(new Error(`Could not remove throwaway candidate state: ${error.message}`), { code: 'TEMP_CLEANUP_FAILED' }), repository, cwd);
            }
        }
    }
    return result || errorSnapshot(target, new Error('Candidate capture produced no result'), repository, cwd);
}

function sameSnapshotIdentity(a, b) {
    return a.repository === b.repository && a.storageIdentity === b.storageIdentity &&
        a.indexPath === b.indexPath && a.cwd === b.cwd && a.target === b.target &&
        a.baseTree === b.baseTree && a.candidateTree === b.candidateTree &&
        a.fingerprint === b.fingerprint && JSON.stringify(a.descriptor ?? null) === JSON.stringify(b.descriptor ?? null);
}

/** Legacy helper: returns null only for a confirmed clean worktree; Git errors throw. */
function computeChangeFingerprint(repository, exec = execFileSync) {
    const snapshot = captureReviewTarget({ repository, cwd: repository, target: 'worktree', exec });
    if (snapshot.status === 'ERROR') throw Object.assign(new Error(snapshot.errorMessage), { code: snapshot.errorCode });
    return snapshot.status === 'CLEAN' ? null : snapshot.fingerprint;
}

/** `reviewGate.mode` for the repository's project config; an unreadable policy never relaxes the gate. */
function reviewGateMode(repository, options = {}) {
    if (options.reviewGateMode !== undefined) return options.reviewGateMode;
    let policy;
    try {
        policy = require('../../scripts/lib/commit-review-policy.cjs');
    } catch (_) {
        return 'off'; // no policy module beside this copy: no team setting can be read, so none applies
    }
    if (typeof policy.resolveReviewGateMode !== 'function') return 'off'; // a policy module older than the switch
    try {
        return policy.resolveReviewGateMode({ rootDir: repository }).mode;
    } catch (_) {
        return 'enforce'; // an unreadable or invalid team setting never relaxes the gate
    }
}

/**
 * Record that a review skill of `kind` started in this repository. Written by the review protocol
 * hook when the host reports the skill (a Skill call, a typed command, or a read of its SKILL.md);
 * never by the skill itself. One attestation backs one issued receipt.
 */
function recordAttestation(options) {
    const kind = options.kind;
    if (!REVIEW_KINDS.includes(kind)) throw new Error(`An attestation kind must be one of ${REVIEW_KINDS.join(', ')}`);
    const repository = canonicalDirectory(options.repository);
    const directory = storeDirectory(options, sha256(repository));
    const record = {
        schemaVersion: 1,
        attestationId: crypto.randomBytes(16).toString('hex'),
        kind,
        repository,
        invokedAt: clock(options),
        source: boundedText(String(options.source || 'skill-start'), 'source', 64)
    };
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(directory, `${ATTESTATION_PREFIX}${kind}.${record.attestationId}.json`), JSON.stringify(record), { flag: 'wx', mode: 0o600 });
    return record;
}

/**
 * Hook side of attestation: called by the review protocol hook with its event input. Records one
 * attestation per review skill the event starts (a Skill call, a typed command, or a read of the
 * skill's SKILL.md), only when the repository's reviewGate.mode is enforce. A subagent start is not
 * a review run. `deps` carries the protocol runner's event helpers.
 */
function attestReviewStart(input, deps) {
    if (!input || typeof input !== 'object' || input.hook_event_name === 'SubagentStart') return [];
    const root = deps.resolveRoot(input);
    if (!root) return [];
    const resolved = deps.resolveEvent(input, { root, host: deps.detectHost(input), read: deps.read });
    const kinds = [...new Set((resolved?.names || []).filter(name => REVIEW_KINDS.includes(name)))];
    if (!kinds.length) return [];
    // Filesystem discovery, not a git process: protocol-delivery hooks run without the Git helper some hosts need.
    const start = typeof input.cwd === 'string' && path.isAbsolute(input.cwd) ? input.cwd : root;
    const found = require('./git-statement.cjs').findRepository(start);
    const repository = found ? canonicalDirectory(found) : null;
    if (!repository || reviewGateMode(repository) !== 'enforce') return [];
    const source = `${input.hook_event_name || 'event'}:${input.tool_name || input.command_name || 'prompt'}`.replace(/[^\w:./-]/g, '').slice(0, 64) || 'skill-start';
    return kinds.map(kind => recordAttestation({ repository, kind, source, ...(deps.now ? { now: deps.now } : {}) }));
}

/** Take the newest unused attestation of `kind` made no later than `notAfter`; claiming removes it. */
function claimAttestation(ctx, kind, notAfter) {
    let names;
    try {
        names = fs.readdirSync(ctx.directory);
    } catch (_) {
        return null;
    }
    const prefix = `${ATTESTATION_PREFIX}${kind}.`;
    const candidates = [];
    for (const name of names) {
        if (!name.startsWith(prefix) || !name.endsWith('.json')) continue;
        const record = readRecord(path.join(ctx.directory, name));
        if (!record || record.schemaVersion !== 1 || record.kind !== kind || record.repository !== ctx.repository ||
            !ATTESTATION_ID_PATTERN.test(record.attestationId) || name !== `${prefix}${record.attestationId}.json`) continue;
        if (!Number.isSafeInteger(record.invokedAt) || ctx.now - record.invokedAt > MAX_LIFETIME_MS) {
            try { fs.unlinkSync(path.join(ctx.directory, name)); } catch (_) { /* expired: best-effort prune */ }
            continue;
        }
        if (record.invokedAt > notAfter) continue;
        candidates.push({ name, record });
    }
    candidates.sort((a, b) => b.record.invokedAt - a.record.invokedAt);
    for (const { name, record } of candidates) {
        const file = path.join(ctx.directory, name);
        const claimed = `${file}.${crypto.randomBytes(8).toString('hex')}.claimed`;
        try {
            fs.renameSync(file, claimed);
        } catch (_) {
            continue; // another issuance claimed it first
        }
        try { fs.unlinkSync(claimed); } catch (_) { /* a leftover claimed file is inert */ }
        return { attestationId: record.attestationId, invokedAt: record.invokedAt, source: record.source };
    }
    return null;
}

function attestedRecord(record) {
    const attestation = record?.attestation;
    return Boolean(attestation && typeof attestation === 'object' && ATTESTATION_ID_PATTERN.test(attestation.attestationId) &&
        Number.isSafeInteger(attestation.invokedAt) && attestation.invokedAt <= record.issuedAt);
}

function issueReceipt(options) {
    const kind = validKind(options.kind);
    if (options.scope !== 'full-changeset') throw new Error("scope must be 'full-changeset'");
    const snapshot = options.snapshot;
    if (!snapshot || snapshot.status !== 'CHANGED' || !REVIEW_TARGETS.includes(snapshot.target)) {
        throw new Error('A CHANGED pre-review snapshot is required');
    }
    if (options.repository !== undefined && canonicalDirectory(options.repository) !== snapshot.repository) {
        throw new Error('The receipt repository does not match the pre-review snapshot');
    }
    if (options.fingerprint !== undefined && options.fingerprint !== snapshot.fingerprint) {
        throw new Error('The supplied fingerprint does not match the pre-review snapshot');
    }
    const current = captureReviewTarget({
        repository: snapshot.repository,
        cwd: snapshot.cwd,
        target: snapshot.target,
        ...(snapshot.descriptor ? { descriptor: snapshot.descriptor } : {}),
        ...(options.exec ? { exec: options.exec } : {})
    });
    if (current.status === 'ERROR') throw new Error(`Cannot issue receipt: candidate capture failed (${current.errorCode})`);
    if (current.status !== 'CHANGED' || !sameSnapshotIdentity(snapshot, current)) {
        throw new Error('Cannot issue receipt: the reviewed target changed; capture and review the final full changeset');
    }
    const ctx = context({
        ...options,
        repository: current.repository,
        storageIdentity: current.storageIdentity,
        baseTree: current.baseTree,
        candidateTree: current.candidateTree,
        fingerprint: current.fingerprint
    });
    const ttlMs = options.ttlMs === undefined ? DEFAULT_LIFETIME_MS : options.ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_LIFETIME_MS) {
        throw new Error(`Lifetime must be 1..${MAX_LIFETIME_MS} ms`);
    }
    let attestation = null;
    if (REVIEW_KINDS.includes(kind) && reviewGateMode(ctx.repository, options) === 'enforce') {
        if (!Number.isSafeInteger(snapshot.capturedAt)) {
            throw new Error('reviewGate.mode is enforce: the pre-review snapshot has no capture time; take a new snapshot');
        }
        attestation = claimAttestation(ctx, kind, Math.min(snapshot.capturedAt, ctx.now));
        if (!attestation) {
            throw new Error(`reviewGate.mode is enforce: no ${kind} run was attested for ${ctx.repository} before this snapshot. Run /${kind} --fix-loop, which snapshots, reviews and issues the receipt, from a session whose working directory is inside this repository (the attestation is recorded for that repository); a receipt is not minted by hand. If the review did run, its review protocol hook did not: Codex runs project hooks only after they are trusted (review them in /hooks; a new checkout path or a changed hook asks again), and a session can run hooks from an older checkout that predates attestation.`);
        }
    }
    return writeRecord(ctx, kind, ctx.fingerprint, {
        schemaVersion: 2,
        receiptId: crypto.randomBytes(16).toString('hex'),
        repository: ctx.repository,
        repositoryHash: ctx.repositoryHash,
        storageIdentity: ctx.storageIdentity,
        baseTree: ctx.baseTree,
        candidateTree: ctx.candidateTree,
        kind,
        scope: 'full-changeset',
        target: current.target,
        descriptor: current.descriptor,
        fingerprint: ctx.fingerprint,
        issuedAt: ctx.now,
        expiresAt: ctx.now + ttlMs,
        ...(options.reason === undefined ? {} : { reason: boundedText(String(options.reason), 'reason', 512) }),
        ...(attestation ? { attestation } : {})
    });
}

function checkReceipt(options) {
    try {
        const kind = validKind(options.kind);
        const snapshot = options.snapshot || options;
        if (snapshot.status !== undefined && snapshot.status !== 'CHANGED') return false;
        if (options.repository !== undefined && canonicalDirectory(options.repository) !== snapshot.repository) return false;
        if (options.storageIdentity !== undefined && canonicalDirectory(options.storageIdentity) !== snapshot.storageIdentity) return false;
        if (options.baseTree !== undefined && options.baseTree !== snapshot.baseTree) return false;
        if (options.candidateTree !== undefined && options.candidateTree !== snapshot.candidateTree) return false;
        const ctx = context({ ...snapshot, ...options,
            repository: snapshot.repository,
            storageIdentity: snapshot.storageIdentity,
            baseTree: snapshot.baseTree,
            candidateTree: snapshot.candidateTree,
            fingerprint: snapshot.fingerprint
        });
        const record = readRecord(receiptPath(ctx, kind, ctx.fingerprint));
        // `validRecord` short-circuits to the null record; normalize to a real boolean.
        if (validRecord(record, ctx, kind) !== true) return false;
        // Under enforce, a review receipt counts only when a review skill run backs it.
        if (REVIEW_KINDS.includes(kind) && reviewGateMode(ctx.repository, options) === 'enforce') return attestedRecord(record);
        return true;
    } catch (_) {
        return false;
    }
}

/** Return the first matching declared review kind or null. */
function matchReviewReceipt(options) {
    const repository = options.snapshot?.repository || options.repository;
    const mode = options.reviewGateMode !== undefined || !repository ? options.reviewGateMode : reviewGateMode(repository);
    for (const kind of REVIEW_KINDS) {
        if (checkReceipt({ ...options, kind, ...(mode === undefined ? {} : { reviewGateMode: mode }) })) return kind;
    }
    return null;
}

function matchSkipReceipt(options) {
    return checkReceipt({ ...options, kind: SKIP_KIND }) ? SKIP_KIND : null;
}

/** True when the store holds any receipt for the repository: a cheap check before an expensive capture. */
function hasAnyReceipt(repository, options = {}) {
    try {
        const directory = storeDirectory(options, sha256(canonicalDirectory(repository)));
        const now = clock(options);
        // Unexpired only: the store keeps expired receipts until `clear`, and they cannot match.
        return fs.readdirSync(directory).some(name => {
            if (!name.endsWith('.json') || name.startsWith(ATTESTATION_PREFIX)) return false;
            try {
                return now - fs.statSync(path.join(directory, name)).mtimeMs <= MAX_LIFETIME_MS;
            } catch (_) {
                return false;
            }
        });
    } catch (_) {
        return false;
    }
}

function clearReceipts(options) {
    const repository = canonicalDirectory(options.repository);
    const directory = storeDirectory(options, sha256(repository));
    let removed = 0;
    let names = [];
    try {
        names = fs.readdirSync(directory);
    } catch (_) {
        return 0;
    }
    for (const name of names) {
        if (!/\.json$/.test(name)) continue;
        try {
            fs.unlinkSync(path.join(directory, name));
            removed++;
        } catch (_) { /* Best-effort cleanup; a held file is not an error. */ }
    }
    return removed;
}

function resolveRepository(cwd, exec = execFileSync) {
    try {
        if (gitEnvironmentError(process.env)) return null;
        const out = runGit(exec, cwd, ['rev-parse', '--show-toplevel'], gitEnvironmentWithoutContext(process.env)).trim();
        return out || null;
    } catch (_) {
        return null;
    }
}

/** The checked-out branch name, or null on a detached HEAD or any Git error. */
function currentBranch(repository, exec = execFileSync) {
    try {
        if (gitEnvironmentError(process.env)) return null;
        return runGit(exec, repository, ['symbolic-ref', '--quiet', '--short', 'HEAD'], gitEnvironmentWithoutContext(process.env)).trim() || null;
    } catch (_) {
        return null;
    }
}

// ---- Review status (reviewGate.status) ---------------------------------------------------------
// A CI-visible record that the review policy ran: a commit status on the pull request's head that
// branch protection can require. Published by a command, never by a hook, so it works on hosts
// whose hooks are untrusted or stale. GitHub keeps statuses per commit: any new commit needs a
// fresh review or a fresh bypass before it can carry the status.

const STATUS_DESCRIPTION_MAX = 140;
const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const PR_NUMBER_PATTERN = /^[1-9]\d{0,9}$/;
const COMMIT_PATTERN = TREE_PATTERN;
const BYPASS_KEYS = Object.freeze(['Review-Bypass', 'Review-Bypass-Reason', 'Review-Bypass-PR', 'Review-Bypass-Parent']);
const BYPASS_REASON_MIN = 10;
const BYPASS_REASON_MAX = 500;

/** GitHub caps a status description; longer text is cut with a visible ellipsis. */
function statusDescription(text) {
    return text.length <= STATUS_DESCRIPTION_MAX ? text : `${text.slice(0, STATUS_DESCRIPTION_MAX - 3)}...`;
}

function reviewStatusPolicy(repository, options) {
    if (options.reviewStatus !== undefined) return options.reviewStatus;
    return require('../../scripts/lib/commit-review-policy.cjs').resolveReviewStatus({ rootDir: repository });
}

/** Trailers of the commit's final trailer block, as Git reads them; a marker in the body is not one. */
function commitTrailers(run, commit) {
    return run(['log', '-1', '--format=%(trailers:only,unfold)', commit]).split('\n')
        .map(line => /^([A-Za-z0-9-]+):[ \t]*(.*)$/.exec(line))
        .filter(Boolean)
        .map(match => ({ key: match[1], value: match[2].trim() }));
}

/**
 * An explicit review bypass on `head`: null when it carries no Review-Bypass trailer, else
 * `{ valid, reason }`. A valid bypass is the latest commit of the pull request, names that pull
 * request and its real single parent, leaves the parent's tree unchanged, and carries each of the
 * four trailers exactly once with a 10-500 character reason.
 */
function reviewBypass(run, head, pr) {
    const trailers = commitTrailers(run, head).filter(item => /^review-bypass(?:-|$)/i.test(item.key));
    if (trailers.length === 0) return null;
    const invalid = reason => ({ valid: false, reason });
    const unknown = trailers.find(item => !BYPASS_KEYS.some(key => key.toLowerCase() === item.key.toLowerCase()));
    if (unknown) return invalid(`unknown trailer ${unknown.key}`);
    const values = {};
    for (const key of BYPASS_KEYS) {
        const found = trailers.filter(item => item.key.toLowerCase() === key.toLowerCase());
        if (found.length !== 1) return invalid(`it needs exactly one ${key} trailer (found ${found.length})`);
        values[key] = found[0].value;
    }
    if (values['Review-Bypass'] !== 'true') return invalid('Review-Bypass must be true');
    const reason = values['Review-Bypass-Reason'];
    if (reason.length < BYPASS_REASON_MIN || reason.length > BYPASS_REASON_MAX || /[\x00-\x1f\x7f]/.test(reason)) {
        return invalid(`Review-Bypass-Reason must be ${BYPASS_REASON_MIN}-${BYPASS_REASON_MAX} printable characters (got ${reason.length})`);
    }
    if (values['Review-Bypass-PR'] !== pr) return invalid(`Review-Bypass-PR is ${values['Review-Bypass-PR'] || '(empty)'}, not pull request ${pr}`);
    const parents = run(['rev-list', '--parents', '-n', '1', head]).trim().split(/\s+/).slice(1);
    if (parents.length !== 1) return invalid('a review bypass is a commit with exactly one parent');
    if (values['Review-Bypass-Parent'] !== parents[0]) {
        return invalid(`Review-Bypass-Parent ${values['Review-Bypass-Parent'] || '(empty)'} is not the commit's parent ${parents[0]} (use the full SHA)`);
    }
    if (run(['rev-parse', `${head}^{tree}`]).trim() !== run(['rev-parse', `${parents[0]}^{tree}`]).trim()) {
        return invalid('the bypass commit changes files; it must be an empty commit on top of the branch (git commit --allow-empty)');
    }
    return { valid: true, reason };
}

function noReceiptMessage({ pr, head, base, snapshot, attested }) {
    const measured = snapshot.status === 'CHANGED'
        ? `branch tree ${snapshot.candidateTree} against its merge-base with ${base}`
        : `the branch has no change against its merge-base with ${base}`;
    return `no ${attested ? 'attested ' : ''}review receipt matches pull request #${pr} at ${head} (${measured}). ` +
        `Review the whole branch from this checkout: the pull-request skill's review step, or /changes-review --fix-loop ` +
        `over the branch (snapshot --target=branch --base=${base}); commit everything it reviewed, push, and publish again ` +
        `while the receipt is live (${DEFAULT_LIFETIME_MS / 3600000} hours by default). To skip the review on purpose, make the ` +
        `branch's last commit an empty one with the trailers Review-Bypass: true, Review-Bypass-Reason: <${BYPASS_REASON_MIN}-${BYPASS_REASON_MAX} characters>, ` +
        `Review-Bypass-PR: ${pr} and Review-Bypass-Parent: ${head}, push it, and publish again.`;
}

/**
 * Post the `reviewGate.status` commit status on a pull request's head when the review policy ran:
 * a matching whole-branch review receipt (any kind but skip) for exactly the committed head
 * against its merge-base with the pull request's base, or an explicit committed review bypass.
 * Refusals return `{ status: 'REFUSED', reason }`; nothing is posted. `gh` and `exec` are
 * injectable so tests never reach GitHub.
 */
function publishReviewStatus(options = {}) {
    const exec = options.exec || execFileSync;
    const gh = options.gh || (args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }));
    const ghText = (args, what) => {
        try {
            const out = gh(args);
            return Buffer.isBuffer(out) ? out.toString('utf8') : String(out ?? '');
        } catch (error) {
            const detail = String(error?.stderr || error?.message || 'gh failed').trim().slice(0, 300);
            throw new Error(`${what} failed (gh ${args.slice(0, 2).join(' ')} ...): ${detail}`);
        }
    };
    const refuse = reason => ({ status: 'REFUSED', valid: false, reason });
    const repository = canonicalDirectory(options.repository);
    const policy = reviewStatusPolicy(repository, options);
    if (!policy.enabled) return refuse('reviewGate.status.enabled is not true in the project config; nothing was published');
    const pr = typeof options.pr === 'number' ? String(options.pr) : options.pr;
    if (typeof pr !== 'string' || !PR_NUMBER_PATTERN.test(pr)) return refuse('--pr=<pull request number> is required');
    const unsafeVariable = gitEnvironmentError(process.env);
    if (unsafeVariable) return refuse(`unsupported ambient Git context: ${unsafeVariable}`);
    const run = args => runGit(exec, repository, args, gitEnvironmentWithoutContext(process.env));

    const slug = options.githubRepository === undefined
        ? ghText(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], 'Resolving the GitHub repository').trim()
        : options.githubRepository;
    if (typeof slug !== 'string' || !GITHUB_REPOSITORY_PATTERN.test(slug)) return refuse('--repository must be owner/name');
    let pull;
    try {
        pull = JSON.parse(ghText(['api', `repos/${slug}/pulls/${pr}`], `Reading pull request #${pr}`));
    } catch (error) {
        if (error instanceof SyntaxError) return refuse(`GitHub returned no readable pull request #${pr} for ${slug}`);
        throw error;
    }
    const head = pull?.head?.sha;
    const baseRef = pull?.base?.ref;
    if (pull?.state !== 'open') return refuse(`pull request #${pr} in ${slug} is not open`);
    if (typeof head !== 'string' || !COMMIT_PATTERN.test(head) || typeof baseRef !== 'string' || !BASE_REF_PATTERN.test(baseRef)) {
        return refuse(`GitHub returned no usable head or base for pull request #${pr}`);
    }
    const localHead = run(['rev-parse', '--verify', 'HEAD']).trim();
    if (head !== localHead) {
        return refuse(`pull request #${pr} head is ${head} but this checkout's committed HEAD is ${localHead}; check out the pull request branch, push or pull so both match, and publish again`);
    }
    const base = options.base === undefined ? baseRef : options.base;
    // Another base would measure another diff (the branch itself measures none), so only spellings of the PR's base count.
    if (typeof base !== 'string' || !BASE_REF_PATTERN.test(base) || !(base === baseRef || base.endsWith(`/${baseRef}`))) {
        return refuse(`--base must name the pull request's base branch ${baseRef} (for example ${baseRef} or origin/${baseRef})`);
    }

    const snapshot = captureReviewTarget({ repository, cwd: repository, target: 'branch', descriptor: { base, committed: true }, exec,
        ...(options.now === undefined ? {} : { now: options.now }) });
    if (snapshot.status === 'ERROR') return refuse(`the branch snapshot failed (${snapshot.errorCode}): ${snapshot.errorMessage}`);
    if (run(['rev-parse', '--verify', 'HEAD']).trim() !== localHead) return refuse('HEAD moved while the branch was measured; publish again');
    // Off by default because a host may run without trusted hooks; enforce never accepts what its own gate would refuse.
    const attested = policy.requireAttestation === true || reviewGateMode(repository, options) === 'enforce';
    const kind = snapshot.status === 'CHANGED'
        ? matchReviewReceipt({ repository, snapshot, reviewGateMode: attested ? 'enforce' : 'off',
            ...(options.storeDir === undefined ? {} : { storeDir: options.storeDir }),
            ...(options.now === undefined ? {} : { now: options.now }) })
        : null;
    let description;
    if (kind) {
        description = `reviewed: ${kind}; tree=${snapshot.candidateTree}`;
    } else {
        const bypass = reviewBypass(run, localHead, pr);
        if (!bypass) return refuse(noReceiptMessage({ pr, head: localHead, base, snapshot, attested }));
        if (!bypass.valid) return refuse(`the review bypass on ${localHead} is invalid: ${bypass.reason}`);
        description = `skipped review: ${bypass.reason}`;
    }
    description = statusDescription(description);
    ghText(['api', '--method', 'POST', `repos/${slug}/statuses/${localHead}`,
        '-f', 'state=success', '-f', `context=${policy.context}`, '-f', `description=${description}`], 'Posting the review status');
    return { status: 'PUBLISHED', valid: true, state: 'success', context: policy.context, description,
        sha: localHead, pr: Number(pr), repository: slug, base, via: kind ? 'review' : 'bypass', kind };
}

function parseArgs(argv) {
    const options = {};
    for (const arg of argv) {
        const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
        if (!match) throw new Error(`Unsupported argument: ${arg}`);
        options[match[1]] = match[2] === undefined ? true : match[2];
    }
    return options;
}

function runCli(argv) {
    const command = argv[0];
    const allowed = new Set(['snapshot', 'issue', 'skip', 'check', 'clear', 'publish-status']);
    if (!allowed.has(command)) {
        throw new Error('Use snapshot|issue|skip|check|clear|publish-status with explicit options');
    }
    const flags = parseArgs(argv.slice(1));
    const storeDir = process.env.CK_REVIEW_RECEIPT_STORE || undefined;
    const repository = resolveRepository(process.cwd());
    if (!repository) throw new Error('Not inside a resolvable Git repository');
    const base = { repository, ...(storeDir ? { storeDir } : {}) };
    let descriptor = flags['descriptor-json'] === undefined ? undefined : JSON.parse(flags['descriptor-json']);
    if (flags.target === 'branch' && descriptor === undefined) {
        descriptor = { base: typeof flags.base === 'string' ? flags.base : '', ...(flags.committed === true ? { committed: true } : {}) };
    }
    if (command === 'snapshot') {
        return captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree', ...(descriptor ? { descriptor } : {}) });
    }
    if (command === 'issue') {
        if (typeof flags['snapshot-json'] !== 'string') throw new Error('issue requires --snapshot-json=<pre-review snapshot>');
        const snapshot = JSON.parse(flags['snapshot-json']);
        return issueReceipt({ ...base, snapshot, scope: flags.scope, kind: flags.kind,
            ttlMs: flags['ttl-ms'] === undefined ? undefined : Number(flags['ttl-ms']), reason: flags.reason });
    }
    if (command === 'skip') {
        const snapshot = captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree' });
        return issueReceipt({ ...base, snapshot, scope: 'full-changeset', kind: SKIP_KIND, reason: flags.reason });
    }
    if (command === 'clear') {
        return { removed: clearReceipts(base) };
    }
    if (command === 'publish-status') {
        return publishReviewStatus({ ...base, pr: flags.pr,
            ...(flags.base === undefined ? {} : { base: flags.base }),
            ...(flags.repository === undefined ? {} : { githubRepository: flags.repository }) });
    }
    // check the requested review target; CLEAN needs no receipt, ERROR is never clean.
    const snapshot = captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree', ...(descriptor ? { descriptor } : {}) });
    if (snapshot.status === 'ERROR') return { status: 'ERROR', errorCode: snapshot.errorCode, valid: false };
    if (snapshot.status === 'CLEAN') return { status: 'CLEAN', fingerprint: snapshot.fingerprint, valid: true, review: null, skip: null };
    if (flags.kind !== undefined) {
        return { status: snapshot.status, kind: flags.kind, fingerprint: snapshot.fingerprint,
            valid: checkReceipt({ ...base, snapshot, kind: flags.kind }) };
    }
    return { status: snapshot.status, fingerprint: snapshot.fingerprint,
        review: matchReviewReceipt({ ...base, snapshot }), skip: matchSkipReceipt({ ...base, snapshot }) };
}

module.exports = {
    REVIEW_KINDS,
    SKIP_KIND,
    REVIEW_TARGETS,
    KINDS,
    DEFAULT_LIFETIME_MS,
    MAX_LIFETIME_MS,
    canonicalDirectory,
    captureReviewTarget,
    candidateFingerprint,
    computeChangeFingerprint,
    issueReceipt,
    checkReceipt,
    matchReviewReceipt,
    matchSkipReceipt,
    clearReceipts,
    hasAnyReceipt,
    recordAttestation,
    attestReviewStart,
    reviewGateMode,
    publishReviewStatus,
    currentBranch,
    resolveRepository
};

if (require.main === module) {
    try {
        const result = runCli(process.argv.slice(2));
        process.stdout.write(`${JSON.stringify(result)}\n`);
        if (result?.status === 'REFUSED') process.stderr.write(`Review status refused: ${result.reason}\n`);
        process.exitCode = result?.status === 'ERROR' ? 2 : (result && result.valid === false ? 1 : 0);
    } catch (error) {
        process.stderr.write(`Review receipt failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
