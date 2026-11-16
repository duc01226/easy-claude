'use strict';

/**
 * Verify baseline: the committed, durable proof record of the verify commands.
 *
 * One JSON file at the repository root, `.verify-baseline.json`, committed with the code. For each
 * verify command key it records the hash of the command that was proven and the failures that were
 * already there when the baseline was taken: failure items with counts and the failing exit code when
 * the output is parseable (see verify-output-parsers.cjs), otherwise one command-level fingerprint. A
 * key whose command passed has an empty item set. "Proven" means the current command's hash is
 * recorded. `keyVersion` names how the parsers formed the keys; a baseline from another key version
 * reads as stale, never as a pile of new failures or an accidental match.
 *
 * The file has no timestamps and changes only in deliberate steps: baseline initialization and an
 * explicit prune. A verify run reads it and never writes it, so verification stays read-only and a
 * verify receipt keeps binding the exact tree it measured. It is a ratchet: a prune only removes
 * entries a verify run saw passing, and initialization refuses to re-freeze a key whose command is
 * already proven unless asked to replace it. It holds failure keys only, never output or values.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { KEY_VERSION } = require('./verify-output-parsers.cjs');

const BASELINE_FILE = '.verify-baseline.json';
const SCHEMA_VERSION = 1;
const MAX_BASELINE_BYTES = 4 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const commandHash = command => sha256(String(command));

function baselinePath(repository) {
    return path.join(repository, BASELINE_FILE);
}

function validSlot(slot) {
    if (!slot || typeof slot !== 'object' || Array.isArray(slot) || !HASH.test(slot.commandHash)) return false;
    const keys = Object.keys(slot);
    if (slot.fingerprint !== undefined) {
        return HASH.test(slot.fingerprint) && keys.every(key => key === 'commandHash' || key === 'fingerprint');
    }
    const items = slot.items;
    if (!items || typeof items !== 'object' || Array.isArray(items) || !keys.every(key => ['commandHash', 'exitCode', 'items'].includes(key))) return false;
    if (slot.exitCode !== undefined && (!Number.isSafeInteger(slot.exitCode) || slot.exitCode === 0)) return false;
    return Object.entries(items).every(([key, count]) => key.length > 0 && Number.isSafeInteger(count) && count > 0);
}

const emptyBaseline = () => ({ schemaVersion: SCHEMA_VERSION, keyVersion: KEY_VERSION, commands: {} });

function validBaseline(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value.schemaVersion === SCHEMA_VERSION &&
        Number.isSafeInteger(value.keyVersion) &&
        value.keyVersion > 0 &&
        value.commands &&
        typeof value.commands === 'object' &&
        !Array.isArray(value.commands) &&
        Object.values(value.commands).every(validSlot)
    );
}

/** `{ status: 'absent' | 'ok' | 'invalid', baseline, reason? }`; an invalid file is never read as empty. */
function readBaseline(repository) {
    const file = baselinePath(repository);
    let text;
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) return { status: 'invalid', baseline: null, reason: `${BASELINE_FILE} is not a regular file` };
        if (stat.size > MAX_BASELINE_BYTES) return { status: 'invalid', baseline: null, reason: `${BASELINE_FILE} exceeds ${MAX_BASELINE_BYTES} bytes` };
        text = fs.readFileSync(file, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') return { status: 'absent', baseline: emptyBaseline() };
        return { status: 'invalid', baseline: null, reason: `${BASELINE_FILE} could not be read: ${error.code || error.message}` };
    }
    let value;
    try {
        value = JSON.parse(text);
    } catch {
        return { status: 'invalid', baseline: null, reason: `${BASELINE_FILE} is not valid JSON` };
    }
    if (!validBaseline(value)) return { status: 'invalid', baseline: null, reason: `${BASELINE_FILE} does not match schema ${SCHEMA_VERSION}` };
    return { status: 'ok', baseline: value };
}

/** Deterministic text: sorted keys, two-space indent, trailing newline. Same content, same bytes. */
function serializeBaseline(baseline) {
    const commands = {};
    for (const slot of Object.keys(baseline.commands).sort()) {
        const entry = baseline.commands[slot];
        commands[slot] =
            entry.fingerprint !== undefined
                ? { commandHash: entry.commandHash, fingerprint: entry.fingerprint }
                : {
                      commandHash: entry.commandHash,
                      ...(entry.exitCode === undefined ? {} : { exitCode: entry.exitCode }),
                      items: Object.fromEntries(
                          Object.keys(entry.items)
                              .sort()
                              .map(key => [key, entry.items[key]])
                      )
                  };
    }
    return `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, keyVersion: baseline.keyVersion, commands }, null, 2)}\n`;
}

/** Atomic replace (temp file + rename in the same directory): a concurrent reader sees old or new, never half. */
function writeBaseline(repository, baseline) {
    if (!validBaseline(baseline)) throw new Error('Refusing to write an invalid verify baseline');
    const text = serializeBaseline(baseline);
    if (Buffer.byteLength(text, 'utf8') > MAX_BASELINE_BYTES) throw new Error(`The verify baseline would exceed ${MAX_BASELINE_BYTES} bytes`);
    writeBaselineText(repository, text);
    return text;
}

const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const RENAME_ATTEMPTS = 20;

/**
 * Atomic replace that tolerates Windows sharing: a rename onto a file another process is reading or
 * replacing at the same moment fails with EPERM, EACCES or EBUSY there. Retry the same atomic rename
 * with a short growing pause (about 1 s at most) instead of falling back to copy-and-delete, which a
 * reader could observe half-written. Any other error, or the last failed attempt, is thrown.
 */
function renameWithRetry(from, to) {
    for (let attempt = 1; ; attempt++) {
        try {
            fs.renameSync(from, to);
            return;
        } catch (error) {
            if (!RENAME_RETRY_CODES.has(error.code) || attempt >= RENAME_ATTEMPTS) throw error;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(5 * attempt, 100));
        }
    }
}

/** Put back exact earlier bytes (`null` = the file was absent): used to undo a refused write. */
function writeBaselineText(repository, text) {
    const file = baselinePath(repository);
    if (text === null) {
        fs.rmSync(file, { force: true });
        return;
    }
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    try {
        fs.writeFileSync(temporary, text, { flag: 'wx' });
        renameWithRetry(temporary, file);
    } catch (error) {
        try {
            fs.unlinkSync(temporary);
        } catch {
            /* the temp file was renamed or never created */
        }
        throw error;
    }
}

/** The file's exact bytes, or null when it is absent (for an undo). */
function readBaselineText(repository) {
    try {
        return fs.readFileSync(baselinePath(repository));
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

const COMMAND_LEVEL = '(command-level failure)';
const total = items => Object.values(items).reduce((sum, count) => sum + count, 0);

/**
 * Compare one command's result with its baseline entry.
 * `result` is `{ status: 'passed' | 'failed', exitCode, items: {key: count} | null, fingerprint: hash | null,
 * truncated? }`. `keysCurrent` is false when the baseline was taken by another parser key version.
 * Returns the new failures (beyond the baselined count), the known count, the entries that now pass
 * and `baselineState`: `none` (no entry), `stale` (recorded for another command text), `stale-keys`
 * (recorded by another key version) or `current`. A stale entry reads as no baseline.
 *
 * A failure is known only when everything identifying it matches: each item within its baselined
 * count AND the same failing exit code, or the same command-level fingerprint. Output cut at the
 * capture limit is never known, because the part that was not kept may hold a new failure.
 */
function compareSlot(entry, hash, result, keysCurrent = true) {
    const baselineState = !entry ? 'none' : entry.commandHash !== hash ? 'stale' : keysCurrent ? 'current' : 'stale-keys';
    const usable = baselineState === 'current' ? entry : null;
    const knownItems = usable && usable.fingerprint === undefined ? usable.items : {};
    const out = { baselineState, newItems: {}, knownCount: 0, nowPassing: {} };
    if (result.status === 'passed') {
        out.nowPassing = { ...knownItems };
        if (usable?.fingerprint !== undefined) out.nowPassing[COMMAND_LEVEL] = 1;
        return out;
    }
    if (result.truncated) {
        out.newItems['(output over the capture limit)'] = 1;
        return out;
    }
    if (result.items) {
        for (const [key, count] of Object.entries(result.items)) {
            const known = Math.min(count, knownItems[key] || 0);
            out.knownCount += known;
            if (count > known) out.newItems[key] = count - known;
        }
        for (const [key, count] of Object.entries(knownItems)) {
            const now = result.items[key] || 0;
            if (count > now) out.nowPassing[key] = count - now;
        }
        if (usable?.exitCode !== undefined && result.exitCode !== usable.exitCode) {
            out.newItems[`(exit code ${result.exitCode}, baseline ${usable.exitCode})`] = 1;
        }
        // A run that also failed in a new way may have stopped early (a syntax error hides the type errors
        // behind it), so a known failure it did not print has not been seen passing.
        if (Object.keys(out.newItems).length) out.nowPassing = {};
        return out;
    }
    if (usable?.fingerprint !== undefined && usable.fingerprint === result.fingerprint) {
        out.knownCount = 1;
        return out;
    }
    out.newItems[COMMAND_LEVEL] = 1;
    return out;
}

/** The baseline entry that freezes `result` as it is now (initialization); null when it cannot be frozen. */
function entryFromResult(hash, result) {
    if (result.status === 'passed') return { commandHash: hash, items: {} };
    if (result.truncated) return null;
    if (result.items) return { commandHash: hash, exitCode: result.exitCode, items: { ...result.items } };
    return { commandHash: hash, fingerprint: result.fingerprint };
}

/**
 * Remove what a verify run saw passing, by the one rule `compareSlot` applies: per key, the baselined
 * count drops by what the run reports as now passing. A slot whose run failed in a new way, did not
 * run, was cut at the capture limit or ran another command keeps its entry; a baseline from another
 * key version is left alone. Returns `{ baseline, removed }`; `removed` counts item occurrences plus
 * cleared fingerprints.
 */
function pruneBaseline(baseline, results) {
    if (baseline.keyVersion !== KEY_VERSION) return { baseline, removed: 0 };
    const next = emptyBaseline();
    let removed = 0;
    for (const [slot, entry] of Object.entries(baseline.commands)) {
        const result = results[slot];
        if (!result || result.commandHash !== entry.commandHash || !['passed', 'failed'].includes(result.status) || result.truncated) {
            next.commands[slot] = entry;
            continue;
        }
        const { nowPassing } = compareSlot(entry, entry.commandHash, result);
        if (entry.fingerprint !== undefined) {
            if (nowPassing[COMMAND_LEVEL]) {
                next.commands[slot] = { commandHash: entry.commandHash, items: {} };
                removed++;
            } else next.commands[slot] = entry;
            continue;
        }
        const items = {};
        for (const [key, count] of Object.entries(entry.items)) {
            const kept = count - (nowPassing[key] || 0);
            removed += count - kept;
            if (kept > 0) items[key] = kept;
        }
        const keepExit = Object.keys(items).length > 0 && entry.exitCode !== undefined;
        next.commands[slot] = { commandHash: entry.commandHash, ...(keepExit ? { exitCode: entry.exitCode } : {}), items };
    }
    return { baseline: next, removed };
}

/** Remaining baselined failures: item occurrences plus one per command-level fingerprint. */
function remainingEntries(baseline) {
    let count = 0;
    for (const entry of Object.values(baseline?.commands || {})) count += entry.fingerprint !== undefined ? 1 : total(entry.items);
    return count;
}

module.exports = {
    BASELINE_FILE,
    SCHEMA_VERSION,
    KEY_VERSION,
    MAX_BASELINE_BYTES,
    emptyBaseline,
    commandHash,
    baselinePath,
    validBaseline,
    readBaseline,
    serializeBaseline,
    writeBaseline,
    writeBaselineText,
    renameWithRetry,
    readBaselineText,
    compareSlot,
    entryFromResult,
    pruneBaseline,
    remainingEntries
};
