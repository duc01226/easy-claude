'use strict';

/**
 * Transcript measure — how much of a conversation transcript is conversation, in bytes.
 *
 * The re-send ledgers (convention-ledger, universal and protocol delivery) re-arm a reminder after
 * the transcript has grown by a byte distance that stands in for a token distance. Two kinds of
 * bytes grow the file without growing the conversation the model reads, so they must not count:
 *   1. Host request bookkeeping: whole records whose top-level type is `api-request`,
 *      `api-request-blob` or `api-request-shape` (Claude Code stores the outgoing request beside
 *      the messages it repeats; one pasted image appears again inside the request blob).
 *   2. Image payloads: the base64 `data` of an `{"type":"image","source":{...}}` block (at any
 *      depth, so images inside tool results count too) and any `data:image/...` URL string (Codex
 *      `input_image`). Each image still counts as IMAGE_EQUIVALENT_BYTES, the byte distance of
 *      about the tokens an image costs, so an image is measured like the text it replaces.
 *
 * measured size = file size - excluded bytes. Only complete lines (ending in a newline) are
 * classified; a partial last line counts in full until it completes.
 *
 * Incremental: a per-transcript checkpoint `{ offset, base, excluded, fingerprint, dev, ino }` is kept
 * under `<ck tmp>/transcript-measure/<sha256 of the path>.json` (CK_TRANSCRIPT_MEASURE_DIR
 * overrides the folder). Each call reads only the bytes appended since `offset`. `base` is where
 * counting started: bytes before it were never classified and count in full.
 *   - First measure of a transcript larger than SCAN_CAP_BYTES, or an append larger than it:
 *     counting restarts at the current end (base = offset = size, excluded = 0). The measure can
 *     only jump UP there, which costs one extra reminder, never a missed one.
 *   - A shorter file, another file at the same path (device or inode changed), or a file
 *     rewritten in place (the 64 bytes before `offset` no longer match `fingerprint`): counting
 *     restarts from 0 (or at the end, past the cap).
 * Any write is a self-consistent checkpoint, so concurrent hooks may overwrite each other safely.
 * Every function is fail-safe: an IO failure returns the raw file size (or null), never throws.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CK_TMP_DIR } = require('./ck-paths.cjs');
const { BYTES_PER_TOKEN } = require('./file-conventions.cjs');
const { sameFileIdentity } = require('./ck-path-utils.cjs');

const SCAN_CAP_BYTES = 8 * 1024 * 1024;
/** Tokens an image costs the model, rounded up (a full-size image is about 1,600 tokens). */
const IMAGE_TOKENS = 1600;
const IMAGE_EQUIVALENT_BYTES = IMAGE_TOKENS * BYTES_PER_TOKEN;
const HOST_REQUEST_RECORD = /^\{"type":"api-request(?:-blob|-shape)?"/;
const IMAGE_MARKERS = ['"type":"image"', 'data:image/'];
const WALK_DEPTH_LIMIT = 16;
const FINGERPRINT_BYTES = 64;
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PRUNE_LIMIT = 200;

function measureDir(env = process.env) {
    const override = env && typeof env.CK_TRANSCRIPT_MEASURE_DIR === 'string' ? env.CK_TRANSCRIPT_MEASURE_DIR.trim() : '';
    return override || path.join(CK_TMP_DIR, 'transcript-measure');
}

function stateFileFor(file, env) {
    const key = crypto.createHash('sha256').update(path.resolve(file)).digest('hex').slice(0, 32);
    return path.join(measureDir(env), `${key}.json`);
}

function readState(file) {
    try {
        const value = JSON.parse(fs.readFileSync(file, 'utf8'));
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function writeState(file, value) {
    let temp = null;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(value));
        fs.renameSync(temp, file);
        return true;
    } catch {
        if (temp) {
            try {
                fs.unlinkSync(temp);
            } catch {
                /* nothing left to clean */
            }
        }
        return false;
    }
}

/** Bytes of one image payload beyond what the image is measured as. */
function imageExcess(data) {
    return Math.max(0, data.length - IMAGE_EQUIVALENT_BYTES);
}

function walkImages(value, depth) {
    if (depth > WALK_DEPTH_LIMIT || value === null) return 0;
    if (typeof value === 'string') return value.startsWith('data:image/') ? imageExcess(value) : 0;
    if (typeof value !== 'object') return 0;
    if (Array.isArray(value)) return value.reduce((sum, item) => sum + walkImages(item, depth + 1), 0);
    if (value.type === 'image' && value.source && typeof value.source.data === 'string') return imageExcess(value.source.data);
    let sum = 0;
    for (const item of Object.values(value)) sum += walkImages(item, depth + 1);
    return sum;
}

/**
 * Bytes of one complete transcript line (newline excluded from `line`) that are not conversation.
 * Pure. A host request record excludes the whole line and its newline; an image line excludes the
 * payload bytes above the image's measured equivalent; anything unparseable excludes nothing.
 */
function excludedLineBytes(line) {
    if (typeof line !== 'string' || !line) return 0;
    if (HOST_REQUEST_RECORD.test(line)) return Buffer.byteLength(line, 'utf8') + 1;
    if (!IMAGE_MARKERS.some(marker => line.includes(marker))) return 0;
    try {
        return walkImages(JSON.parse(line), 0);
    } catch {
        return 0;
    }
}

/** Device and inode as decimal strings: JSON keeps them exact, and `storedIdentity` restores the bigints. */
function identity(stat) {
    return { dev: String(stat.dev), ino: String(stat.ino) };
}

/** The checkpoint's file identity as bigints for `sameFileIdentity`, or null when it is missing or malformed. */
function storedIdentity(stored) {
    try {
        return { dev: BigInt(stored.dev), ino: BigInt(stored.ino) };
    } catch {
        return null;
    }
}

let lastPruneCheck = 0;
/** Remove checkpoints untouched for a week, at most once a day per process and a bounded count per sweep. */
function maybePrune(dir, now = Date.now()) {
    if (now - lastPruneCheck < PRUNE_INTERVAL_MS) return 0;
    lastPruneCheck = now;
    const marker = path.join(dir, '_prune.json');
    const last = readState(marker);
    if (last && typeof last.at === 'number' && now >= last.at && now - last.at < PRUNE_INTERVAL_MS) return 0;
    if (!writeState(marker, { at: now })) return 0;
    let removed = 0;
    try {
        for (const name of fs.readdirSync(dir)) {
            if (removed >= PRUNE_LIMIT) break;
            if (!/^[a-f0-9]{32}\.json$/.test(name)) continue;
            const file = path.join(dir, name);
            try {
                if (now - fs.statSync(file).mtimeMs > PRUNE_AGE_MS) {
                    fs.unlinkSync(file);
                    removed++;
                }
            } catch {
                /* a peer removed or replaced it */
            }
        }
    } catch {
        /* folder missing or unreadable: nothing to prune */
    }
    return removed;
}

/** Fingerprint of the FINGERPRINT_BYTES before `offset`: a file rewritten in place (same inode) no longer matches. */
function fingerprintAt(fd, offset) {
    const length = Math.min(offset, FINGERPRINT_BYTES);
    if (length === 0) return '';
    const buffer = Buffer.alloc(length);
    const read = fs.readSync(fd, buffer, 0, length, offset - length);
    return crypto.createHash('sha256').update(buffer.subarray(0, read)).digest('hex').slice(0, 16);
}

/**
 * Bring the checkpoint up to the current end of the file and return it.
 * @returns {{size: number, offset: number, base: number, excluded: number}|null} null when the file is missing.
 */
function measureTranscript(file, opts = {}) {
    if (typeof file !== 'string' || !file.trim()) return null;
    let stat;
    try {
        stat = fs.statSync(file, { bigint: true });
    } catch {
        return null;
    }
    if (!stat.isFile()) return null;
    const size = Number(stat.size);
    const env = opts.env || process.env;
    const capBytes = Number.isInteger(opts.capBytes) && opts.capBytes > 0 ? opts.capBytes : SCAN_CAP_BYTES;
    const stateFile = stateFileFor(file, env);
    const stored = readState(stateFile);
    const id = identity(stat);
    let state;
    try {
        const fd = fs.openSync(file, 'r');
        try {
            const valid =
                stored &&
                sameFileIdentity(storedIdentity(stored), stat) &&
                [stored.offset, stored.base, stored.excluded].every(value => Number.isInteger(value) && value >= 0) &&
                stored.base <= stored.offset &&
                stored.offset <= size &&
                stored.fingerprint === fingerprintAt(fd, stored.offset);
            state = valid ? { offset: stored.offset, base: stored.base, excluded: stored.excluded } : null;
            if (!state) state = size > capBytes ? { offset: size, base: size, excluded: 0 } : { offset: 0, base: 0, excluded: 0 };
            else if (size - state.offset > capBytes) state = { offset: size, base: size, excluded: 0 };
            if (size > state.offset) {
                const buffer = Buffer.alloc(size - state.offset);
                const read = fs.readSync(fd, buffer, 0, buffer.length, state.offset);
                const chunk = buffer.subarray(0, read);
                const lastNewline = chunk.lastIndexOf(0x0a);
                if (lastNewline >= 0) {
                    const complete = chunk.subarray(0, lastNewline + 1).toString('utf8');
                    for (const line of complete.split('\n')) state.excluded += excludedLineBytes(line.replace(/\r$/, ''));
                    state.offset += lastNewline + 1;
                }
            }
            state.fingerprint = fingerprintAt(fd, state.offset);
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return { size, offset: size, base: size, excluded: 0 };
    }
    const changed =
        !stored || ['offset', 'base', 'excluded', 'fingerprint'].some(key => stored[key] !== state[key]) || !sameFileIdentity(storedIdentity(stored), stat);
    if (changed) writeState(stateFile, { ...state, ...id });
    maybePrune(measureDir(env), opts.now);
    return { size, offset: state.offset, base: state.base, excluded: state.excluded };
}

/** Conversation bytes of the transcript: its size minus non-conversation bytes; null when it does not exist. */
function measuredSize(file, opts = {}) {
    const measure = measureTranscript(file, opts);
    return measure ? Math.max(0, measure.size - measure.excluded) : null;
}

/**
 * Convert a raw byte position of a complete line into the measured scale of `measure`.
 * `excludedFrom` is the excluded bytes of the complete lines from `rawOffset` up to `measure.offset`;
 * positions before `measure.base` were never classified and are returned unchanged.
 */
function measuredAt(measure, rawOffset, excludedFrom) {
    if (!measure || rawOffset < measure.base) return rawOffset;
    return Math.max(0, rawOffset - Math.max(0, measure.excluded - excludedFrom));
}

module.exports = {
    SCAN_CAP_BYTES,
    IMAGE_EQUIVALENT_BYTES,
    measureDir,
    stateFileFor,
    excludedLineBytes,
    measureTranscript,
    measuredSize,
    measuredAt,
    _resetPruneClock: () => {
        lastPruneCheck = 0;
    }
};
