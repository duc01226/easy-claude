#!/usr/bin/env node
'use strict';

/**
 * Verify receipt: did the project's configured lint, type and test commands pass on THIS tree?
 *
 * The runner reads the verify command fields (`testing.commands` reserved keys, resolved by
 * `scripts/lib/commit-review-policy.cjs resolveVerifyGate`), runs them in the repository root with a
 * time budget each, sorts every failure into known (in the committed baseline, `verify-baseline.cjs`)
 * or new, and writes a short-lived verify receipt bound to the same trees a review receipt binds
 * (repository + storage + base tree + candidate tree, see `review-receipt.cjs`). The commit gate reads
 * it: `reviewGate.verify` warn (default) names missing proof and new failures; enforce refuses the
 * commit; off skips the check.
 *
 * Runner precedence: `verify` when declared; else `lint`, `typecheck` and `affected`, plus `build` only
 * with `reviewGate.verifyBuild`. A key set to "none" is declared not applicable. A key that is absent,
 * holds no command string, cannot be started or overruns its budget is reported as such: a missing
 * command never counts as passing.
 *
 * Process lifetime: a command runs in its own process group (POSIX) and is stopped with its whole tree
 * when it overruns its budget or when the runner itself is interrupted (SIGINT, SIGTERM, SIGHUP); on
 * Windows the budget kill walks the live shell's tree. Processes a command leaves behind after it exits
 * are stopped when they are still in its group (POSIX only: an exited Windows shell's tree cannot be
 * walked). A process that escapes cannot hold the run open: the result is settled a short grace after
 * the exit or the kill, and the report says when something was left behind.
 *
 * Verification is read-only: a run never writes the baseline. A run that changes the tree (a fixer, a
 * generated file that is not ignored) gets no receipt, because the receipt would name a tree nobody
 * verified. Receipts hold command keys, statuses, counts and failure keys (scrubbed of secrets where
 * they are parsed), never output or environment values. Full output goes to a private per-run log
 * directory under the OS temp directory, capped in size.
 *
 * CLI (run from inside the repository; JSON on stdout):
 *   node verify-receipt.cjs plan                      resolved commands and total budget, nothing runs
 *   node verify-receipt.cjs run                       run, compare with the baseline, issue the receipt
 *   node verify-receipt.cjs check                     the receipt for the current working tree, if any
 *   node verify-receipt.cjs skip --reason=<text> [--user-requested]
 *                                                     record why verification is not run (10-500 chars);
 *                                                     --user-requested marks a bypass the user explicitly asked for
 *   node verify-receipt.cjs prune                     drop baseline entries the current receipt saw passing,
 *                                                     then re-issue the receipt for the pruned tree
 *   node verify-receipt.cjs baseline-init [--slot=lint,affected] [--replace]
 *                                                     run, then freeze today's failures as the baseline
 * Exit codes: 0 = PASS (or SKIPPED for check, or a successful plan/prune/init), 1 = not proven, 2 = error.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync, execFileSync } = require('node:child_process');

const receipts = require('./review-receipt.cjs');
const parsers = require('./verify-output-parsers.cjs');
const baselines = require('./verify-baseline.cjs');
const { DEFAULT_VERIFY_TIMEOUT_SECONDS } = require('./project-config-schema.cjs');

const VERDICTS = Object.freeze(['PASS', 'FAIL', 'INCOMPLETE', 'UNAVAILABLE', 'SKIPPED']);
const PASSING_VERDICTS = Object.freeze(['PASS', 'SKIPPED']);
const NOT_PROVEN = Object.freeze(['missing', 'invalid', 'unrunnable', 'timed-out']);
const RECEIPT_PREFIX = receipts.VERIFY_RECEIPT_PREFIX;
const RESULTS_PREFIX = receipts.VERIFY_RESULTS_PREFIX;
const RESULTS_SCHEMA = 1;
const RECEIPT_SCHEMA = 1;
const MAX_RESULTS_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_LOG_BYTES = 64 * 1024 * 1024;
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
const DRAIN_GRACE_MS = 2000; // after the command exits: how long left-behind processes may hold its output open
const KILL_GRACE_MS = 3000; // after a budget kill: how long an escaped process may hold the output open
const LIST_LIMIT = 10;
const REASON_MIN = 10;
const REASON_MAX = 500;
const FINGERPRINT = /^[a-f0-9]{64}$/;
const RECEIPT_ID = /^[a-f0-9]{32}$/;
const LIVE_CHILDREN = new Set();

// ---- Policy and plan ---------------------------------------------------------------------------

/** `reviewGate.verify` + command fields; a missing policy module reads as off, like the review gate. */
function loadPolicy(repository, options = {}) {
    if (options.policy) return options.policy;
    let policy;
    try {
        policy = require('../../scripts/lib/commit-review-policy.cjs');
    } catch {
        return { mode: 'off', source: 'no-policy-module', build: false, timeouts: {}, commands: {} };
    }
    if (typeof policy.resolveVerifyGate !== 'function') return { mode: 'off', source: 'policy-predates-verify', build: false, timeouts: {}, commands: {} };
    return policy.resolveVerifyGate({ rootDir: repository });
}

function classifyCommand(value) {
    if (value === undefined) return { state: 'missing', command: null };
    if (typeof value !== 'string' || value.trim() === '') return { state: 'invalid', command: null };
    if (value.trim() === 'none') return { state: 'not-applicable', command: null };
    return { state: 'configured', command: value };
}

/** The commands a run executes, in order, each with its state, command hash and time budget. */
function buildPlan(policy) {
    const commands = policy.commands || {};
    const notes = [];
    const verify = classifyCommand(commands.verify);
    let keys;
    if (verify.state === 'configured') keys = ['verify'];
    else {
        if (verify.state === 'invalid') notes.push('testing.commands.verify is not a command string, so lint, typecheck and affected are used');
        keys = ['lint', 'typecheck', 'affected', ...(policy.build ? ['build'] : [])];
    }
    const slots = keys.map(slot => {
        const entry = classifyCommand(commands[slot]);
        const seconds = policy.timeouts?.[slot] || DEFAULT_VERIFY_TIMEOUT_SECONDS[slot];
        return {
            slot,
            state: entry.state,
            command: entry.command,
            commandHash: entry.command ? baselines.commandHash(entry.command) : null,
            timeoutMs: seconds * 1000
        };
    });
    return { source: keys[0] === 'verify' ? 'verify' : 'affected+fast', slots, notes };
}

const configuredCount = plan => plan.slots.filter(slot => slot.state === 'configured').length;
const totalBudgetSeconds = plan => plan.slots.filter(slot => slot.state === 'configured').reduce((sum, slot) => sum + slot.timeoutMs / 1000, 0);

// ---- Running one command -----------------------------------------------------------------------

function killTree(child) {
    if (!child?.pid) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        return;
    }
    try {
        process.kill(-child.pid, 'SIGKILL'); // the whole process group: a shell's children too
    } catch {
        try {
            child.kill('SIGKILL');
        } catch {
            /* already gone */
        }
    }
}

/** Stop every command this process started (the CLI's signal handlers call it). */
function stopAllCommands() {
    for (const child of LIVE_CHILDREN) killTree(child);
    LIVE_CHILDREN.clear();
}

/** A size-capped log that never follows a planted file: the directory is private and the file new. */
function openLog(file) {
    let fd = null;
    let written = 0;
    if (file) {
        try {
            fd = fs.openSync(file, 'wx', 0o600);
        } catch {
            fd = null;
        }
    }
    return {
        write(chunk) {
            if (fd === null || written > MAX_LOG_BYTES) return;
            try {
                if (written + chunk.length > MAX_LOG_BYTES) {
                    fs.writeSync(fd, `\n[verify-receipt: log cut at ${MAX_LOG_BYTES} bytes]\n`);
                    written = MAX_LOG_BYTES + 1;
                    return;
                }
                fs.writeSync(fd, chunk);
                written += chunk.length;
            } catch {
                /* a full disk loses the log, not the run */
            }
        },
        close() {
            if (fd === null) return;
            try {
                fs.closeSync(fd);
            } catch {
                /* already closed */
            }
            fd = null;
        }
    };
}

function classifyExit(code, stderr) {
    if (code === 0) return 'passed';
    // 126/127: the shell could not execute or find the command; 9009 and the message: cmd.exe's equivalent.
    if (code === 126 || code === 127 || code === 9009 || /is not recognized as an internal or external command/i.test(stderr)) return 'unrunnable';
    return 'failed';
}

/**
 * Run one command string through the platform shell (sh on POSIX, cmd.exe on Windows), the same way a
 * person types it. Output is kept up to MAX_OUTPUT_BYTES for parsing and streamed to `logFile`.
 * Settles on the command's exit plus DRAIN_GRACE_MS (stopping anything it left behind), or on a budget
 * kill plus KILL_GRACE_MS, whichever comes first; a process holding the output open cannot hang it.
 * Resolves `{ status: passed|failed|timed-out|unrunnable, exitCode, durationMs, stdout, stderr, truncated, lingered? }`.
 */
function runCommand(command, options) {
    return new Promise(resolve => {
        const started = Date.now();
        const log = openLog(options.logFile);
        const streams = { stdout: [], stderr: [] };
        let kept = 0;
        let truncated = false;
        let child = null;
        let timer = null;
        let grace = null;
        let settled = false;
        let timedOut = false;
        let exitCode = null;
        let lingered = false;
        const text = name => Buffer.concat(streams[name]).toString('utf8');
        const finish = (status, extra = {}) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearTimeout(grace);
            if (child) {
                LIVE_CHILDREN.delete(child);
                child.stdout?.destroy();
                child.stderr?.destroy();
            }
            log.close();
            const stderr = extra.stderr ?? text('stderr');
            const resolved = status === 'exit' ? classifyExit(exitCode, stderr) : status;
            resolve({
                status: resolved,
                exitCode,
                durationMs: Date.now() - started,
                stdout: text('stdout'),
                stderr,
                truncated,
                ...(lingered ? { lingered } : {})
            });
        };
        const collect = name => chunk => {
            log.write(chunk);
            if (kept + chunk.length <= MAX_OUTPUT_BYTES) {
                streams[name].push(chunk);
                kept += chunk.length;
            } else truncated = true;
        };
        try {
            child = spawn(command, {
                cwd: options.cwd,
                shell: true,
                env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
                windowsHide: true,
                detached: process.platform !== 'win32',
                stdio: ['ignore', 'pipe', 'pipe']
            });
        } catch (error) {
            finish('unrunnable', { stderr: String(error.message) });
            return;
        }
        LIVE_CHILDREN.add(child);
        timer = setTimeout(() => {
            timedOut = true;
            killTree(child);
            grace = setTimeout(() => finish('timed-out'), options.killGraceMs ?? KILL_GRACE_MS);
        }, options.timeoutMs);
        child.stdout.on('data', collect('stdout'));
        child.stderr.on('data', collect('stderr'));
        child.on('error', error => {
            if (child.pid !== undefined) return; // a started child reports through exit and close
            finish('unrunnable', { stderr: String(error.message) });
        });
        child.on('exit', code => {
            exitCode = Number.isInteger(code) ? code : null;
            if (timedOut) return;
            clearTimeout(timer);
            // Something the command left behind may still hold its output: give it a moment, then stop its
            // process group (POSIX). On Windows the shell has exited, so its tree can no longer be walked and
            // its pid may already belong to another process: nothing is killed there, the output is just closed.
            grace = setTimeout(() => {
                lingered = true;
                if (process.platform !== 'win32') killTree(child);
                finish('exit');
            }, options.drainGraceMs ?? DRAIN_GRACE_MS);
        });
        child.on('close', code => {
            if (exitCode === null && Number.isInteger(code)) exitCode = code;
            finish(timedOut ? 'timed-out' : 'exit');
        });
    });
}

// ---- Logs -----------------------------------------------------------------------------------------

/**
 * A fresh private log directory for one run (`mkdtemp`: unpredictable name, mode 0700), after removing
 * this repository's run directories older than a day. Null when the temp directory is unusable.
 */
function createLogDirectory(repository) {
    const prefix = `ck-verify-${crypto.createHash('sha256').update(repository).digest('hex').slice(0, 16)}-`;
    const root = os.tmpdir();
    try {
        for (const name of fs.readdirSync(root)) {
            if (!name.startsWith(prefix)) continue;
            const candidate = path.join(root, name);
            const stat = fs.lstatSync(candidate);
            if (stat.isDirectory() && !stat.isSymbolicLink() && Date.now() - stat.mtimeMs > LOG_RETENTION_MS)
                fs.rmSync(candidate, { recursive: true, force: true });
        }
    } catch {
        /* best-effort cleanup */
    }
    try {
        return fs.mkdtempSync(path.join(root, prefix));
    } catch {
        return null;
    }
}

// ---- Results, comparison and summary ------------------------------------------------------------

/** One planned slot's result record: what the results sidecar keeps (no output). */
async function executeSlot(slot, repository, logDirectory, options) {
    if (slot.state !== 'configured') return { slot: slot.slot, status: slot.state };
    const logFile = logDirectory ? path.join(logDirectory, `${slot.slot}.log`) : null;
    const run = await (options.runCommand || runCommand)(slot.command, { cwd: repository, timeoutMs: slot.timeoutMs, logFile });
    const result = {
        slot: slot.slot,
        status: run.status,
        commandHash: slot.commandHash,
        exitCode: Number.isInteger(run.exitCode) ? run.exitCode : null,
        durationMs: run.durationMs,
        timeoutMs: slot.timeoutMs,
        ...(logFile ? { logFile } : {}),
        ...(run.lingered ? { lingered: true } : {})
    };
    if (run.status === 'failed') {
        if (run.truncated) {
            // Parsing a cut capture could miss a new failure in the part that was not kept.
            Object.assign(result, { truncated: true, format: 'truncated', items: null, fingerprint: null });
            return result;
        }
        const parseOptions = { root: repository, secrets: parsers.secretValues() };
        const parts = [parsers.extractFailureItems(run.stdout, parseOptions), parsers.extractFailureItems(run.stderr, parseOptions)].filter(Boolean);
        if (parts.length) {
            const items = {};
            for (const part of parts) for (const [key, count] of Object.entries(part.items)) items[key] = (items[key] || 0) + count;
            Object.assign(result, { format: [...new Set(parts.flatMap(part => part.format.split('+')))].join('+'), items, fingerprint: null });
        } else {
            Object.assign(result, {
                format: 'fingerprint',
                items: null,
                fingerprint: parsers.fingerprintOutput(`${run.stdout}\n${run.stderr}`, run.exitCode, { root: repository })
            });
        }
    }
    return result;
}

const sortedKeys = items => Object.keys(items).sort();
const sum = items => Object.values(items).reduce((total, count) => total + count, 0);
const STALE_REASONS = Object.freeze({
    stale: 'the command text changed after the baseline was taken; re-freeze it with baseline-init',
    'stale-keys': 'the baseline was taken by another key version; re-freeze it with baseline-init --replace'
});

/**
 * Compare the results with the baseline. Returns per-command summaries, the verdict and the baseline
 * figures the report and receipt carry (remaining entries and how many a prune would remove).
 */
function summarize(results, baselineRead) {
    const baseline = baselineRead.status === 'ok' ? baselineRead.baseline : baselines.emptyBaseline();
    const keysCurrent = baseline.keyVersion === baselines.KEY_VERSION;
    let prunable = 0;
    const commands = results.map(result => {
        const summary = { slot: result.slot, status: result.status };
        for (const key of ['exitCode', 'durationMs', 'timeoutMs', 'format', 'truncated', 'lingered']) {
            if (result[key] !== undefined && result[key] !== null) summary[key] = result[key];
        }
        if (result.status !== 'passed' && result.status !== 'failed') return summary;
        const comparison = baselines.compareSlot(baseline.commands[result.slot], result.commandHash, result, keysCurrent);
        summary.baselineState = comparison.baselineState;
        if (STALE_REASONS[comparison.baselineState]) summary.baselineReason = STALE_REASONS[comparison.baselineState];
        summary.newCount = sum(comparison.newItems);
        summary.knownCount = comparison.knownCount;
        summary.nowPassingCount = sum(comparison.nowPassing);
        summary.newItems = sortedKeys(comparison.newItems);
        summary.nowPassing = sortedKeys(comparison.nowPassing);
        prunable += summary.nowPassingCount;
        if (result.status === 'failed' && summary.newCount === 0) summary.status = 'baselined';
        return summary;
    });
    let verdict;
    if (!results.some(result => !['missing', 'invalid', 'not-applicable'].includes(result.status))) verdict = 'UNAVAILABLE';
    else if (commands.some(command => command.status === 'failed')) verdict = 'FAIL';
    else if (commands.some(command => NOT_PROVEN.includes(command.status))) verdict = 'INCOMPLETE';
    else verdict = 'PASS';
    return {
        verdict,
        commands,
        baseline: {
            file: baselines.BASELINE_FILE,
            status: baselineRead.status,
            ...(baselineRead.reason ? { reason: baselineRead.reason } : {}),
            remaining: baselines.remainingEntries(baseline),
            prunable
        }
    };
}

/** Human lines for the report: the failures that are new, what was not proven, and the baseline trend. */
function summaryLines(summary, plan) {
    const lines = [`Verdict ${summary.verdict} (${plan.source === 'verify' ? 'testing.commands.verify' : 'lint + typecheck + affected'}).`];
    for (const command of summary.commands) {
        if (command.status === 'failed') {
            lines.push(`${command.slot}: ${command.newCount} new failure(s) not in the baseline: ${command.newItems.slice(0, LIST_LIMIT).join(', ')}`);
            if (command.baselineReason) lines.push(`${command.slot}: its baseline does not apply: ${command.baselineReason}`);
        } else if (command.status === 'baselined') {
            lines.push(`${command.slot}: failed only on ${command.knownCount} baselined failure(s); no new failure`);
        } else if (command.status === 'timed-out') {
            lines.push(
                `${command.slot}: ENVIRONMENT-BLOCKED: overran its ${Math.round(command.timeoutMs / 1000)} s budget and was stopped; raise reviewGate.verifyTimeouts.${command.slot} or narrow the command`
            );
        } else if (command.status === 'unrunnable') {
            lines.push(`${command.slot}: could not run (exit ${command.exitCode ?? 'none'}): the tool or script is not installed or not on PATH`);
        } else if (command.status === 'missing') {
            lines.push(`${command.slot}: no command configured (testing.commands.${command.slot}); set one, or "none" when it does not apply`);
        } else if (command.status === 'invalid') {
            lines.push(`${command.slot}: testing.commands.${command.slot} is not a command string`);
        }
        if (command.lingered) {
            lines.push(
                `${command.slot}: it left processes holding its output after it exited; the runner stopped the ones still in its process group, and a process that left the group (on Windows, any of them) may still be running`
            );
        }
    }
    if (summary.baseline.status === 'invalid') lines.push(`Baseline unreadable (${summary.baseline.reason}); every failure counts as new.`);
    lines.push(
        `Baseline ${summary.baseline.file}: ${summary.baseline.remaining} entr${summary.baseline.remaining === 1 ? 'y' : 'ies'} remain; ${summary.baseline.prunable} now pass (prune would leave ${summary.baseline.remaining - summary.baseline.prunable}).`
    );
    return lines;
}

// ---- Receipt store --------------------------------------------------------------------------------

function storeDirectory(repository, options) {
    return receipts.receiptStoreDirectory(repository, options.storeDir === undefined ? {} : { storeDir: options.storeDir });
}

function writeAtomic(directory, name, text, maxBytes) {
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error(`${name} exceeds ${maxBytes} bytes`);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, name);
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, text, { flag: 'wx', mode: 0o600 });
    baselines.renameWithRetry(temporary, file);
    return file;
}

function readBounded(file, maxBytes) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

/** Remove this repository's expired verify records (best effort): they can never match again. */
function pruneExpiredRecords(directory, now) {
    try {
        for (const name of fs.readdirSync(directory)) {
            if (!name.startsWith(RECEIPT_PREFIX) && !name.startsWith(RESULTS_PREFIX)) continue;
            const file = path.join(directory, name);
            if (now - fs.lstatSync(file).mtimeMs > receipts.MAX_LIFETIME_MS) fs.rmSync(file, { force: true });
        }
    } catch {
        /* best-effort cleanup */
    }
}

/** The receipt record, shrunk to the record cap by trimming failure-key lists first. */
function receiptRecord(identity, summary, plan, extra, options) {
    const now = options.now === undefined ? Date.now() : options.now;
    const ttlMs = options.ttlMs === undefined ? receipts.DEFAULT_LIFETIME_MS : options.ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > receipts.MAX_LIFETIME_MS) throw new Error(`Lifetime must be 1..${receipts.MAX_LIFETIME_MS} ms`);
    const receiptId = crypto.randomBytes(16).toString('hex');
    for (const limit of [LIST_LIMIT, 3, 0]) {
        const record = {
            schemaVersion: RECEIPT_SCHEMA,
            kind: 'verify',
            receiptId,
            repository: identity.repository,
            repositoryHash: crypto.createHash('sha256').update(identity.repository).digest('hex'),
            storageIdentity: identity.storageIdentity,
            baseTree: identity.baseTree,
            candidateTree: identity.candidateTree,
            fingerprint: identity.fingerprint,
            target: 'worktree',
            issuedAt: now,
            expiresAt: now + ttlMs,
            verdict: summary.verdict,
            plan: plan ? plan.source : null,
            commands: summary.commands.map(({ newItems, nowPassing, ...rest }) => ({
                ...rest,
                ...(newItems ? { newItems: newItems.slice(0, limit) } : {}),
                ...(nowPassing ? { nowPassing: nowPassing.slice(0, limit) } : {})
            })),
            baseline: summary.baseline,
            ...extra
        };
        if (Buffer.byteLength(JSON.stringify(record), 'utf8') <= receipts.MAX_RECORD_BYTES) return record;
    }
    throw new Error('The verify receipt exceeds the record bound even without failure lists');
}

function resultsText(receiptId, identity, plan, results) {
    return JSON.stringify({ schemaVersion: RESULTS_SCHEMA, receiptId, fingerprint: identity.fingerprint, plan: plan.source, results });
}

function issueReceipt(repository, identity, summary, plan, results, extra, options) {
    const directory = storeDirectory(repository, options);
    const record = receiptRecord(identity, summary, plan, extra, options);
    pruneExpiredRecords(directory, record.issuedAt);
    if (results)
        writeAtomic(directory, `${RESULTS_PREFIX}${identity.fingerprint}.json`, resultsText(record.receiptId, identity, plan, results), MAX_RESULTS_BYTES);
    writeAtomic(directory, `${RECEIPT_PREFIX}${identity.fingerprint}.json`, JSON.stringify(record), receipts.MAX_RECORD_BYTES);
    return record;
}

function validCommandEntry(entry) {
    return Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof entry.slot === 'string' &&
        typeof entry.status === 'string' &&
        (entry.newItems === undefined || (Array.isArray(entry.newItems) && entry.newItems.every(item => typeof item === 'string')))
    );
}

function validReceipt(record, identity, now) {
    return Boolean(
        record &&
        record.schemaVersion === RECEIPT_SCHEMA &&
        record.kind === 'verify' &&
        RECEIPT_ID.test(record.receiptId) &&
        record.repository === identity.repository &&
        record.storageIdentity === identity.storageIdentity &&
        record.baseTree === identity.baseTree &&
        record.candidateTree === identity.candidateTree &&
        record.fingerprint === identity.fingerprint &&
        VERDICTS.includes(record.verdict) &&
        Array.isArray(record.commands) &&
        record.commands.every(validCommandEntry) &&
        Number.isSafeInteger(record.issuedAt) &&
        Number.isSafeInteger(record.expiresAt) &&
        record.expiresAt > record.issuedAt &&
        record.expiresAt - record.issuedAt <= receipts.MAX_LIFETIME_MS &&
        record.issuedAt <= now &&
        now < record.expiresAt
    );
}

function identityFor(snapshot, baseTree = snapshot.baseTree) {
    const identity = {
        repository: snapshot.repository,
        storageIdentity: snapshot.storageIdentity,
        baseTree,
        candidateTree: snapshot.candidateTree
    };
    identity.fingerprint = receipts.candidateFingerprint(identity);
    return identity;
}

/**
 * The live verify receipt for a captured snapshot (any target: matching is by trees, like review
 * receipts), or null. `alternateBaseTrees` lets an amend candidate, measured against HEAD's parent,
 * match a run measured against HEAD.
 */
function matchVerifyReceipt(options) {
    try {
        const snapshot = options.snapshot;
        if (!snapshot || !['CHANGED', 'CLEAN'].includes(snapshot.status) || !FINGERPRINT.test(snapshot.fingerprint || '')) return null;
        const now = options.now === undefined ? Date.now() : options.now;
        const directory = storeDirectory(snapshot.repository, options);
        for (const baseTree of [snapshot.baseTree, ...(options.alternateBaseTrees || [])]) {
            const identity = identityFor(snapshot, baseTree);
            const record = readBounded(path.join(directory, `${RECEIPT_PREFIX}${identity.fingerprint}.json`), receipts.MAX_RECORD_BYTES);
            if (validReceipt(record, identity, now)) return record;
        }
        return null;
    } catch {
        return null;
    }
}

function readResults(directory, record) {
    const sidecar = readBounded(path.join(directory, `${RESULTS_PREFIX}${record.fingerprint}.json`), MAX_RESULTS_BYTES);
    return sidecar && sidecar.schemaVersion === RESULTS_SCHEMA && sidecar.receiptId === record.receiptId && Array.isArray(sidecar.results) ? sidecar : null;
}

// ---- Operations -----------------------------------------------------------------------------------

function captureWorktree(repository, options, extra = {}) {
    return (options.captureReviewTarget || receipts.captureReviewTarget)({ repository, cwd: repository, target: 'worktree', ...extra });
}

function requireSnapshot(snapshot, when) {
    if (snapshot.status === 'ERROR')
        throw Object.assign(new Error(`Cannot capture the working tree ${when} (${snapshot.errorCode}): ${snapshot.errorMessage}`), {
            code: snapshot.errorCode
        });
    return snapshot;
}

/** Run every planned command against the working tree; the tree must not change while they run. */
async function executePlan(repository, options) {
    const policy = loadPolicy(repository, options);
    const plan = buildPlan(policy);
    const before = requireSnapshot(captureWorktree(repository, options), 'before verification');
    const logDirectory = createLogDirectory(repository);
    const results = [];
    for (const slot of plan.slots) results.push(await executeSlot(slot, repository, logDirectory, options));
    const after = captureWorktree(repository, options);
    const treeChanged = after.status === 'ERROR' || after.candidateTree !== before.candidateTree || after.baseTree !== before.baseTree;
    return { policy, plan, before, results, treeChanged, logDirectory };
}

/** `run`: execute, compare with the baseline, issue the receipt unless the run changed the tree. */
async function runVerify(options = {}) {
    const repository = receipts.canonicalDirectory(options.repository);
    const { policy, plan, before, results, treeChanged, logDirectory } = await executePlan(repository, options);
    const summary = summarize(results, baselines.readBaseline(repository));
    const report = { status: summary.verdict, mode: policy.mode, plan: plan.source, ...summary, notes: plan.notes, logDirectory };
    if (treeChanged) {
        // The verdict describes commands that ran on a tree that no longer exists: never a success.
        report.status = 'TREE_CHANGED';
        report.receipt = null;
        report.notes = [
            ...plan.notes,
            'The working tree changed while the commands ran (a fixer or a generated file that is not git-ignored), so no receipt was issued. Commit or ignore those changes and run again.'
        ];
    } else {
        const record = issueReceipt(repository, identityFor(before), summary, plan, results, {}, options);
        report.receipt = { receiptId: record.receiptId, candidateTree: record.candidateTree, expiresAt: record.expiresAt };
    }
    report.summary = summaryLines(summary, plan);
    return report;
}

/** `check`: the receipt for the current working tree. */
function checkVerify(options = {}) {
    const repository = receipts.canonicalDirectory(options.repository);
    const snapshot = requireSnapshot(captureWorktree(repository, options), 'for the check');
    const record = matchVerifyReceipt({ ...options, snapshot });
    if (!record) return { status: 'NO_RECEIPT', valid: false, candidateTree: snapshot.candidateTree };
    return { status: record.verdict, valid: PASSING_VERDICTS.includes(record.verdict), receipt: record };
}

function validReason(reason) {
    return (
        typeof reason === 'string' &&
        reason.length >= REASON_MIN &&
        reason.length <= REASON_MAX &&
        reason.trim() === reason &&
        [...reason].every(char => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127)
    );
}

/**
 * `skip`: a recorded, reasoned SKIPPED receipt for the current tree, for an environment that cannot
 * verify or for a bypass the user explicitly asked for (`userRequested`). Without that request it is
 * refused when a live run on this tree found new failures: those are fixed, not skipped. A user-requested
 * skip over such a run records which verdict it overrode, so the bypass stays visible.
 */
function skipVerify(options = {}) {
    const repository = receipts.canonicalDirectory(options.repository);
    if (!validReason(options.reason))
        throw new Error(`skip needs --reason with ${REASON_MIN}-${REASON_MAX} printable characters naming why verification cannot run`);
    const snapshot = requireSnapshot(captureWorktree(repository, options), 'for the skip');
    const existing = matchVerifyReceipt({ ...options, snapshot });
    const userRequested = options.userRequested === true;
    if (existing?.verdict === 'FAIL' && !userRequested) {
        throw new Error(
            'A verify run on this exact tree found new failures; skip is for an environment that cannot run verification, not for failures it found. Fix them and run verify again, or pass --user-requested only when the user explicitly asked to bypass verification.'
        );
    }
    const summary = { verdict: 'SKIPPED', commands: [], baseline: { file: baselines.BASELINE_FILE, status: 'not-read', remaining: 0, prunable: 0 } };
    const reason = parsers.scrubText(options.reason);
    const extra = userRequested ? { reason, userRequested: true, ...(existing?.verdict === 'FAIL' ? { overrode: 'FAIL' } : {}) } : { reason };
    const record = issueReceipt(repository, identityFor(snapshot), summary, null, null, extra, options);
    return { status: 'SKIPPED', valid: true, receipt: record };
}

/**
 * Prove that writing the baseline changed nothing else: the tree as it is now, with the baseline file
 * put back to its old bytes, must be exactly the verified tree. On a mismatch (another change landed
 * meanwhile) the old bytes are restored and null is returned; otherwise the new tree's snapshot.
 */
function settleBaselineWrite(repository, options, verified, oldText) {
    const written = captureWorktree(repository, options);
    const asBefore = captureWorktree(repository, options, { replaceEntry: { path: baselines.BASELINE_FILE, content: oldText } });
    const intact =
        written.status !== 'ERROR' &&
        asBefore.status !== 'ERROR' &&
        asBefore.candidateTree === verified.candidateTree &&
        asBefore.baseTree === verified.baseTree &&
        written.baseTree === verified.baseTree;
    if (intact) return written;
    baselines.writeBaselineText(repository, oldText);
    return null;
}

const CONCURRENT_CHANGE =
    'Another change landed in the working tree while the baseline was being written, so the write was undone and no receipt was issued. Run verify again.';

/**
 * `prune`: remove the baseline entries the current tree's receipt saw passing, write the baseline,
 * and re-issue the receipt for the pruned tree from the same results. Any other edit after the prune
 * still invalidates the receipt.
 */
function pruneVerify(options = {}) {
    const repository = receipts.canonicalDirectory(options.repository);
    const snapshot = requireSnapshot(captureWorktree(repository, options), 'before the prune');
    const record = matchVerifyReceipt({ ...options, snapshot });
    if (!record || record.verdict === 'SKIPPED') {
        return { status: 'NO_RECEIPT', pruned: 0, reason: 'No verify run matches the current working tree; run verify first, then prune.' };
    }
    const directory = storeDirectory(repository, options);
    const sidecar = readResults(directory, record);
    if (!sidecar) return { status: 'NO_RESULTS', pruned: 0, reason: 'The results of the matching run are gone; run verify again, then prune.' };
    const current = baselines.readBaseline(repository);
    if (current.status !== 'ok')
        return { status: 'NO_BASELINE', pruned: 0, reason: current.reason || `${baselines.BASELINE_FILE} is absent; nothing to prune.` };
    const bySlot = Object.fromEntries(sidecar.results.map(result => [result.slot, result]));
    const { baseline, removed } = baselines.pruneBaseline(current.baseline, bySlot);
    if (removed === 0) return { status: 'NOTHING_TO_PRUNE', pruned: 0, remaining: baselines.remainingEntries(current.baseline) };
    const oldText = baselines.readBaselineText(repository);
    baselines.writeBaseline(repository, baseline);
    const pruned = settleBaselineWrite(repository, options, snapshot, oldText);
    if (!pruned) return { status: 'REFUSED', pruned: 0, reason: CONCURRENT_CHANGE };
    const summary = summarize(sidecar.results, { status: 'ok', baseline });
    const plan = { source: sidecar.plan, notes: [] };
    const next = issueReceipt(repository, identityFor(pruned), summary, plan, sidecar.results, { prunedFrom: record.receiptId, pruned: removed }, options);
    return {
        status: 'PRUNED',
        pruned: removed,
        remaining: summary.baseline.remaining,
        file: baselines.BASELINE_FILE,
        receipt: { receiptId: next.receiptId, verdict: next.verdict, candidateTree: next.candidateTree, expiresAt: next.expiresAt },
        next: `Stage ${baselines.BASELINE_FILE} with the change it belongs to.`
    };
}

/**
 * `baseline-init`: run, then freeze each selected command's current failures. A command already proven
 * for the same command text is refused unless `replace`: a ratchet only re-freezes on purpose. A
 * baseline taken by another key version is re-frozen only with `replace`, and then as a whole.
 */
async function initBaseline(options = {}) {
    const repository = receipts.canonicalDirectory(options.repository);
    const current = baselines.readBaseline(repository);
    if (current.status === 'invalid') throw new Error(`${current.reason}; fix or remove it before initializing`);
    const policy = loadPolicy(repository, options);
    const planned = buildPlan(policy).slots.map(slot => slot.slot);
    const selected = options.slots && options.slots.length ? options.slots : planned;
    const unknown = selected.filter(slot => !planned.includes(slot));
    if (unknown.length) throw new Error(`Not in the verify plan: ${unknown.join(', ')} (planned: ${planned.join(', ')})`);
    const keysCurrent = current.baseline.keyVersion === baselines.KEY_VERSION;
    if (!keysCurrent && !options.replace) {
        return {
            status: 'UNCHANGED',
            written: [],
            refused: selected,
            skipped: [],
            reason: `${baselines.BASELINE_FILE} was taken by another key version; pass --replace to re-freeze every selected command.`
        };
    }
    const { plan, before, results, treeChanged } = await executePlan(repository, { ...options, policy });
    if (treeChanged) throw new Error('The working tree changed while the commands ran; commit or ignore those changes and initialize again');
    const baseline = { ...baselines.emptyBaseline(), commands: keysCurrent ? { ...current.baseline.commands } : {} };
    const written = [];
    const refused = [];
    const skipped = [];
    for (const result of results) {
        if (!selected.includes(result.slot)) continue;
        if (result.status !== 'passed' && result.status !== 'failed') {
            skipped.push(`${result.slot} (${result.status})`);
            continue;
        }
        const existing = baseline.commands[result.slot];
        if (existing && existing.commandHash === result.commandHash && !options.replace) {
            refused.push(result.slot);
            continue;
        }
        const entry = baselines.entryFromResult(result.commandHash, result);
        if (!entry) {
            skipped.push(`${result.slot} (output over the capture limit: narrow the command or use a machine-readable reporter)`);
            continue;
        }
        baseline.commands[result.slot] = entry;
        written.push(result.slot);
    }
    if (!written.length) {
        return {
            status: 'UNCHANGED',
            written,
            refused,
            skipped,
            reason: refused.length
                ? `Already proven for the same command: ${refused.join(', ')}. A baseline only shrinks (prune); pass --replace to re-freeze on purpose.`
                : 'No selected command ran to a pass or a failure that can be frozen.'
        };
    }
    // Everything that can fail is checked before the baseline is written, so a refusal leaves no half-done state.
    const summary = summarize(results, { status: 'ok', baseline });
    if (Buffer.byteLength(resultsText('0'.repeat(32), identityFor(before), plan, results), 'utf8') > MAX_RESULTS_BYTES) {
        throw new Error(`The run's results exceed ${MAX_RESULTS_BYTES} bytes; narrow the commands before taking a baseline`);
    }
    const oldText = baselines.readBaselineText(repository);
    baselines.writeBaseline(repository, baseline);
    const after = settleBaselineWrite(repository, options, before, oldText);
    if (!after) return { status: 'REFUSED', written: [], refused, skipped, reason: CONCURRENT_CHANGE };
    const record = issueReceipt(repository, identityFor(after), summary, plan, results, {}, options);
    return {
        status: 'INITIALIZED',
        written,
        refused,
        skipped,
        file: baselines.BASELINE_FILE,
        remaining: summary.baseline.remaining,
        verdict: summary.verdict,
        receipt: { receiptId: record.receiptId, candidateTree: record.candidateTree, expiresAt: record.expiresAt },
        next: `Commit ${baselines.BASELINE_FILE}; the commit gate then reports only failures it does not list.`
    };
}

// ---- Commit gate --------------------------------------------------------------------------------

function headTree(repository) {
    try {
        if (receipts.gitEnvironmentError(process.env)) return null;
        const out = execFileSync('git', ['rev-parse', '--verify', 'HEAD^{tree}'], {
            cwd: repository,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            env: receipts.gitEnvironmentWithoutContext(process.env),
            windowsHide: true
        }).trim();
        return /^[a-f0-9]{40,64}$/.test(out) ? out : null;
    } catch {
        return null;
    }
}

const RUN = 'node .claude/hooks/lib/verify-receipt.cjs run';

function findingLines(mode, record, plan, snapshot, invalidPolicy) {
    const short = String(snapshot?.candidateTree || '').slice(0, 12);
    const lines = [
        mode === 'enforce'
            ? `[BLOCKED] Commit refused: reviewGate.verify is enforce and commit tree ${short} has no passing verify receipt.`
            : `[VERIFY] reviewGate.verify is warn: this commit may proceed, but tree ${short} has no passing verify receipt.`
    ];
    if (invalidPolicy) {
        lines.push(
            `The verify settings are invalid, so they read as enforce: ${invalidPolicy}`,
            'Fix the reviewGate or testing.commands entry in the project config (/project-config), then retry.'
        );
        return lines;
    }
    if (!configuredCount(plan) && !record) {
        lines.push(
            'No verify command is configured (testing.commands.verify, or lint, typecheck and affected), and a missing command never counts as passing.',
            'Fill them from the project evidence with /project-config, or set reviewGate.verify to off when the project proves merges another way.'
        );
        return lines;
    }
    if (!record) {
        lines.push(`No verify receipt matches this exact tree: none was run, it ran on another tree (an edit came after it) or it expired. Run: ${RUN}`);
    } else if (record.verdict === 'FAIL') {
        lines.push(`Verdict FAIL. New failures not in the committed baseline ${baselines.BASELINE_FILE}:`);
        for (const command of record.commands.filter(entry => entry.status === 'failed')) {
            const listed = (command.newItems || []).map(item => JSON.stringify(item)).join(', ');
            lines.push(`  - ${command.slot}: ${command.newCount} new${listed ? `: ${listed}` : ''}`);
            if (typeof command.baselineReason === 'string') lines.push(`    (its baseline does not apply: ${command.baselineReason})`);
        }
    } else {
        lines.push(`Verdict ${record.verdict}. Not proven:`);
        for (const command of record.commands.filter(entry => NOT_PROVEN.includes(entry.status))) lines.push(`  - ${command.slot}: ${command.status}`);
    }
    lines.push(
        'Why it matters: nothing has shown that lint, types and tests pass on what this commit records, and an unproven failure lands on top of the baseline instead of being fixed while its cause is fresh.',
        `Fix: fix the root cause of each new failure (the run prints each command's log path), configure any missing command or set it to "none", then run ${RUN} and retry the commit.`
    );
    if (mode === 'enforce') {
        lines.push(
            'Only when the environment cannot run verification (a timeout, a tool that cannot be installed here), or the user explicitly asked to bypass it: record it with node .claude/hooks/lib/verify-receipt.cjs skip --reason="<10-500 characters>" (add --user-requested for the user\'s bypass, with their words as the reason) and retry.'
        );
    } else lines.push('reviewGate.verify: enforce refuses such commits; off turns this check off for projects with their own merge proof.');
    return lines;
}

/**
 * The commit gate's verify check for one commit candidate the review gate already allows. Returns
 * null (proven, skipped with a reason, mode off, or warn mode with nothing configured) or
 * `{ level: 'warn' | 'block', message }`.
 */
function verifyGateFinding(options) {
    const { repository, snapshot, descriptor } = options;
    let policy;
    let invalidPolicy = null;
    try {
        policy = loadPolicy(repository, options);
    } catch (error) {
        invalidPolicy = String(error.message || error);
        policy = { mode: 'enforce', build: false, timeouts: {}, commands: {} };
    }
    if (policy.mode === 'off') return null;
    const plan = buildPlan(policy);
    const record = invalidPolicy
        ? null
        : matchVerifyReceipt({ ...options, snapshot, alternateBaseTrees: descriptor?.amend ? [headTree(repository)].filter(Boolean) : [] });
    if (record && PASSING_VERDICTS.includes(record.verdict)) return null;
    if (!invalidPolicy && policy.mode === 'warn' && !configuredCount(plan)) return null;
    const level = policy.mode === 'enforce' ? 'block' : 'warn';
    return { level, message: findingLines(policy.mode, record, plan, snapshot, invalidPolicy).join('\n') };
}

// ---- CLI ----------------------------------------------------------------------------------------

function parseArgs(argv) {
    const flags = {};
    for (const arg of argv) {
        const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
        if (!match) throw new Error(`Unsupported argument: ${arg}`);
        flags[match[1]] = match[2] === undefined ? true : match[2];
    }
    return flags;
}

const ALLOWED_FLAGS = { plan: [], run: [], check: [], skip: ['reason', 'user-requested'], prune: [], 'baseline-init': ['slot', 'replace'] };

async function runCli(argv) {
    const command = argv[0];
    if (!Object.hasOwn(ALLOWED_FLAGS, command)) throw new Error(`Use ${Object.keys(ALLOWED_FLAGS).join('|')}`);
    const flags = parseArgs(argv.slice(1));
    const unknown = Object.keys(flags).filter(flag => !ALLOWED_FLAGS[command].includes(flag));
    if (unknown.length) throw new Error(`${command} does not take --${unknown.join(', --')}`);
    const repository = receipts.resolveRepository(process.cwd());
    if (!repository) throw new Error('Not inside a resolvable Git repository');
    const storeDir = process.env.CK_REVIEW_RECEIPT_STORE || undefined;
    const base = { repository, ...(storeDir ? { storeDir } : {}) };
    if (command === 'plan') {
        const policy = loadPolicy(receipts.canonicalDirectory(repository));
        const plan = buildPlan(policy);
        return { status: 'PLAN', mode: policy.mode, plan: plan.source, totalBudgetSeconds: totalBudgetSeconds(plan), commands: plan.slots, notes: plan.notes };
    }
    if (command === 'run') return runVerify(base);
    if (command === 'check') return checkVerify(base);
    if (command === 'skip') return skipVerify({ ...base, reason: flags.reason, userRequested: flags['user-requested'] === true });
    if (command === 'prune') return pruneVerify(base);
    const slots = typeof flags.slot === 'string' ? flags.slot.split(',').filter(Boolean) : [];
    return initBaseline({ ...base, slots, replace: flags.replace === true });
}

const SUCCESS = new Set(['PASS', 'SKIPPED', 'PLAN', 'PRUNED', 'NOTHING_TO_PRUNE', 'INITIALIZED']);

module.exports = {
    VERDICTS,
    RECEIPT_PREFIX,
    RESULTS_PREFIX,
    buildPlan,
    runCommand,
    stopAllCommands,
    summarize,
    runVerify,
    checkVerify,
    skipVerify,
    pruneVerify,
    initBaseline,
    matchVerifyReceipt,
    verifyGateFinding,
    runCli
};

if (require.main === module) {
    // An interrupted runner stops the commands it started instead of leaving them running.
    for (const [signal, code] of [
        ['SIGINT', 130],
        ['SIGTERM', 143],
        ['SIGHUP', 129]
    ]) {
        process.on(signal, () => {
            stopAllCommands();
            process.exit(code);
        });
    }
    runCli(process.argv.slice(2)).then(
        result => {
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
            process.exitCode = SUCCESS.has(result?.status) ? 0 : 1;
        },
        error => {
            process.stderr.write(`Verify receipt failed: ${error.message}\n`);
            process.exitCode = 2;
        }
    );
}
