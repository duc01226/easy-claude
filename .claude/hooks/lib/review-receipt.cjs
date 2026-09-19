#!/usr/bin/env node
'use strict';

/**
 * Review-before-commit receipt store — a bounded, short-lived proof that a
 * review fix-loop converged over the CURRENT changeset.
 *
 * This is bookkeeping, NEVER proof of user consent, a native permission, or a
 * security boundary. The store is an ordinary directory any process with write
 * access can forge. It exists so `review-commit-gate.cjs` can stop the agent
 * from committing a changeset no review fix-loop ever saw, while leaving the
 * user an explicit, recorded way to skip.
 *
 * Binding is by CHANGE FINGERPRINT, not by session: `sha256` of a tree built
 * from a THROWAWAY index over the whole working tree (tracked changes AND
 * untracked files, minus ignored). The real index is never touched, so the
 * value is identical before and after `git add` — staging a new file cannot
 * invalidate a receipt that reviewed its content — while any content edit after
 * a review changes it and forces a fresh review. A receipt minted in any
 * session remains valid for its short lifetime because it pins the exact
 * reviewed content, not who reviewed it.
 *
 * Kinds that satisfy the gate: `changes-review`, `why-review`,
 * `workflow-review-changes`. `skip` is the user-approved override.
 *
 * CLI (args, real clock):
 *   node review-receipt.cjs issue --kind=changes-review [--ttl-ms=N] [--reason=...]
 *   node review-receipt.cjs skip  [--reason=...]
 *   node review-receipt.cjs check [--kind=changes-review]
 *   node review-receipt.cjs clear
 * The CLI resolves the repository from the current working directory and the
 * store from CK_REVIEW_RECEIPT_STORE (default os.tmpdir()/ck/review-receipts).
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REVIEW_KINDS = Object.freeze(['changes-review', 'why-review', 'workflow-review-changes']);
const SKIP_KIND = 'skip';
const KINDS = Object.freeze([...REVIEW_KINDS, SKIP_KIND]);
const DEFAULT_LIFETIME_MS = 2 * 60 * 60 * 1000;
// Bounded like the git lease, but longer: a review can precede the commit by
// many turns in one working session, unlike the 15-minute destructive window.
const MAX_LIFETIME_MS = 4 * 60 * 60 * 1000;
const RECEIPT_ID_PATTERN = /^[a-f0-9]{32}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;
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

function context(options, { requireFingerprint = false } = {}) {
    const repository = canonicalDirectory(options.repository);
    const repositoryHash = sha256(repository);
    let fingerprint = null;
    if (options.fingerprint !== undefined) {
        if (typeof options.fingerprint !== 'string' || !FINGERPRINT_PATTERN.test(options.fingerprint)) {
            throw new Error('fingerprint must be a sha256 hex digest');
        }
        fingerprint = options.fingerprint;
    } else if (requireFingerprint) {
        throw new Error('fingerprint is required');
    }
    return {
        repository,
        repositoryHash,
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

function validRecord(record, ctx, kind, fingerprint, active = true) {
    return record && record.schemaVersion === 1 && RECEIPT_ID_PATTERN.test(record.receiptId) &&
        record.repository === ctx.repository && record.repositoryHash === ctx.repositoryHash &&
        record.kind === kind && record.fingerprint === fingerprint &&
        Number.isSafeInteger(record.issuedAt) && record.issuedAt > 0 &&
        Number.isSafeInteger(record.expiresAt) && record.expiresAt > record.issuedAt &&
        record.expiresAt - record.issuedAt <= MAX_LIFETIME_MS &&
        (!active || (record.revokedAt === undefined && record.issuedAt <= ctx.now && ctx.now < record.expiresAt));
}

function writeRecord(ctx, kind, fingerprint, record) {
    fs.mkdirSync(ctx.directory, { recursive: true, mode: 0o700 });
    const file = receiptPath(ctx, kind, fingerprint);
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
    return record;
}

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

/**
 * Compute the content fingerprint for a repository, or null when there is
 * nothing to review.
 *
 * Builds a git tree from a THROWAWAY index seeded with HEAD and refreshed with
 * `add -A` over the whole working tree, then hashes the tree SHA. This sees
 * tracked and untracked changes alike and is INVARIANT to the real index, so a
 * receipt survives `git add` (staging a new file cannot change the fingerprint)
 * while any content edit changes it. `add -A` respects `.gitignore`, so
 * disposable/ignored output never perturbs the fingerprint.
 */
function computeChangeFingerprint(repository, exec = execFileSync) {
    const run = (args, extra) => exec('git', args, {
        cwd: repository,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
        ...(extra || {})
    });
    let hasHead = true;
    try {
        run(['rev-parse', '--verify', 'HEAD']);
    } catch (_) {
        hasHead = false;
    }
    const tempIndex = path.join(os.tmpdir(), `ck-review-index-${process.pid}-${crypto.randomBytes(8).toString('hex')}`);
    const env = { ...process.env, GIT_INDEX_FILE: tempIndex };
    try {
        run(hasHead ? ['read-tree', 'HEAD'] : ['read-tree', '--empty'], { env });
        run(['add', '-A'], { env });
        const tree = run(['write-tree'], { env }).trim();
        if (!tree) return null;
        const baseTree = hasHead ? run(['rev-parse', 'HEAD^{tree}']).trim() : EMPTY_TREE;
        if (tree === baseTree) return null; // no local changes → nothing to review
        return sha256(tree);
    } catch (_) {
        return null;
    } finally {
        try {
            fs.unlinkSync(tempIndex);
        } catch (_) { /* the throwaway index may never have been created */ }
    }
}

function issueReceipt(options) {
    const kind = validKind(options.kind);
    const fingerprint = options.fingerprint === undefined
        ? computeChangeFingerprint(canonicalDirectory(options.repository), options.exec)
        : options.fingerprint;
    if (fingerprint === null) throw new Error('No local changes to review');
    if (typeof fingerprint !== 'string' || !FINGERPRINT_PATTERN.test(fingerprint)) {
        throw new Error('fingerprint must be a sha256 hex digest');
    }
    const ctx = context({ ...options, fingerprint });
    const ttlMs = options.ttlMs === undefined ? DEFAULT_LIFETIME_MS : options.ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_LIFETIME_MS) {
        throw new Error(`Lifetime must be 1..${MAX_LIFETIME_MS} ms`);
    }
    return writeRecord(ctx, kind, fingerprint, {
        schemaVersion: 1,
        receiptId: crypto.randomBytes(16).toString('hex'),
        repository: ctx.repository,
        repositoryHash: ctx.repositoryHash,
        kind,
        fingerprint,
        issuedAt: ctx.now,
        expiresAt: ctx.now + ttlMs,
        ...(options.reason === undefined ? {} : { reason: boundedText(String(options.reason), 'reason', 512) })
    });
}

function checkReceipt(options) {
    try {
        const kind = validKind(options.kind);
        const ctx = context(options, { requireFingerprint: true });
        const record = readRecord(receiptPath(ctx, kind, ctx.fingerprint));
        // `validRecord` short-circuits to the null record; normalize to a real boolean.
        return validRecord(record, ctx, kind, ctx.fingerprint) === true;
    } catch (_) {
        return false;
    }
}

/** Return the first matching review kind (`changes-review` | `why-review` | `workflow-review-changes`) or null. */
function matchReviewReceipt(options) {
    for (const kind of REVIEW_KINDS) {
        if (checkReceipt({ ...options, kind })) return kind;
    }
    return null;
}

function matchSkipReceipt(options) {
    return checkReceipt({ ...options, kind: SKIP_KIND }) ? SKIP_KIND : null;
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
        const out = exec('git', ['rev-parse', '--show-toplevel'], {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        return out || null;
    } catch (_) {
        return null;
    }
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
    const allowed = new Set(['issue', 'skip', 'check', 'clear']);
    if (!allowed.has(command)) {
        throw new Error('Use issue|skip|check|clear with explicit options');
    }
    const flags = parseArgs(argv.slice(1));
    const storeDir = process.env.CK_REVIEW_RECEIPT_STORE || undefined;
    const repository = resolveRepository(process.cwd());
    if (!repository) throw new Error('Not inside a resolvable Git repository');
    const base = { repository, ...(storeDir ? { storeDir } : {}) };
    if (command === 'issue') {
        return issueReceipt({ ...base, kind: flags.kind, ttlMs: flags['ttl-ms'] === undefined ? undefined : Number(flags['ttl-ms']), reason: flags.reason });
    }
    if (command === 'skip') {
        return issueReceipt({ ...base, kind: SKIP_KIND, reason: flags.reason });
    }
    if (command === 'clear') {
        return { removed: clearReceipts(base) };
    }
    // check
    if (flags.kind !== undefined) {
        const fingerprint = computeChangeFingerprint(repository);
        return { kind: flags.kind, fingerprint, valid: fingerprint !== null && checkReceipt({ ...base, kind: flags.kind, fingerprint }) };
    }
    const fingerprint = computeChangeFingerprint(repository);
    return { fingerprint, review: fingerprint === null ? null : matchReviewReceipt({ ...base, fingerprint }),
        skip: fingerprint === null ? null : matchSkipReceipt({ ...base, fingerprint }) };
}

module.exports = {
    REVIEW_KINDS,
    SKIP_KIND,
    KINDS,
    DEFAULT_LIFETIME_MS,
    MAX_LIFETIME_MS,
    canonicalDirectory,
    computeChangeFingerprint,
    issueReceipt,
    checkReceipt,
    matchReviewReceipt,
    matchSkipReceipt,
    clearReceipts
};

if (require.main === module) {
    try {
        const result = runCli(process.argv.slice(2));
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = result && result.valid === false ? 1 : 0;
    } catch (error) {
        process.stderr.write(`Review receipt failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
