/**
 * Convention Ledger — per-session, per-working-context delivery memory for the
 * file-convention-inject hook (spec BR-PFCI-05/06/07/15/16/17).
 *
 * Layout (all ids sanitized):
 *   <root>/<session>/_owner.json              { owner }                  ownership marker (see markSessionOwned)
 *   <root>/<session>/_session.json            { compactedAt }            host-reported condensation
 *   <root>/<session>/<scope>/_scan.json       { offset, lastBoundaryAt } incremental transcript scan
 *   <root>/<session>/<scope>/<group>.json     { hash, deliveredAt, transcriptBytes, form }
 *   <root>/<session>/<scope>/<group>.lock     short-lived delivery claim (wx) { pid, at, token }
 *   <root>/_prune.json                        { at }                     last retention sweep
 * root = $CK_CONVENTIONS_DIR || <os tmp>/ck/conventions
 * Group file ids never start with `_` (reserved for the ledger's own state files).
 *
 * Records are written only after the digest was handed to the host (BR-PFCI-17).
 * Every function is fail-safe: IO errors never throw to the hook.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CK_TMP_DIR } = require('./ck-paths.cjs');
const { DEFAULTS } = require('./file-conventions.cjs');

const MAIN_SCOPE = 'main';
const ID_MAX = 80;
const LOCK_STALE_MS = 10 * 1000;
const SCAN_CAP_BYTES = 8 * 1024 * 1024;
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_LIMIT = 50;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCOPE_DIR_NAME = /^(?:main|agent-[A-Za-z0-9._-]+)$/;
const SCOPE_FILE_NAME = /\.(?:json|lock|tmp)$/;
const SESSION_FILE_NAME = /^(?:_owner\.json|_session\.json|.+\.tmp)$/;
const OWNER_FILE = '_owner.json';
const OWNER_TAG = 'ck-convention-ledger';
const BUILTIN_BOUNDARY = '"subtype":"compact_boundary"';
const FILESYSTEM_SAFE_ID = /^[A-Za-z0-9._-]+$/;
// Forms that put a class in the working context. A class left out of the digest ('omitted')
// was never delivered, so it can neither be recorded nor count as present (BR-PFCI-08).
// 'evidence' = the class's protocol reached the context another way (a transcript read of its
// evidence docs or a load of an evidence skill, see scanEvidence); it ages exactly like a delivery.
const RECORDED_FORMS = new Set(['full', 'references', 'evidence']);
const PRESENT_FORMS = new Set(['full', 'references', 'static', 'evidence']);
const COMMAND_NAME = /<command-name>\/?([^<\s]+)<\/command-name>/g;

function storeRoot(env = process.env) {
    return env && typeof env.CK_CONVENTIONS_DIR === 'string' && env.CK_CONVENTIONS_DIR.trim()
        ? env.CK_CONVENTIONS_DIR
        : path.join(CK_TMP_DIR, 'conventions');
}

/**
 * Filesystem-safe id. When sanitizing changes the raw id, an 8-hex digest of the
 * raw id is appended so ids differing only in unsafe characters stay distinct.
 */
function sanitizeId(raw) {
    const text = raw === undefined || raw === null ? '' : String(raw);
    let clean = text.replace(/[^A-Za-z0-9._-]/g, '_');
    if (clean === '' || /^\.+$/.test(clean)) clean = '_';
    if (clean === text && clean.length <= ID_MAX) return clean;
    const digest = crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
    return `${clean.slice(0, ID_MAX - 9)}-${digest}`;
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Working context: helper agent when the host identifies one, else the main conversation. */
function scopeFor(input) {
    return input && nonBlank(input.agent_id) ? `agent-${sanitizeId(input.agent_id)}` : MAIN_SCOPE;
}

function sessionDir(root, sessionId) {
    return path.join(root, sanitizeId(nonBlank(sessionId) ? sessionId : 'unknown-session'));
}

function scopeDir(root, sessionId, scope) {
    return path.join(sessionDir(root, sessionId), scope);
}

function readJson(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** Atomic write (temp + rename). Returns false on any IO failure; a failed write leaves no temp file. */
function writeJsonAtomic(file, value) {
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
                /* never created, or already gone */
            }
        }
        return false;
    }
}

/**
 * Stamp the session directory with the ledger's own ownership marker, which `pruneStale`
 * requires before it deletes anything. Shape alone cannot prove ownership — a foreign
 * `<dir>/main/<name>.json` tree is shape-identical to a session — and the store root is
 * overridable, so the marker is the only positive proof. Written once (`wx`); a marker that
 * cannot be written costs a session that is never pruned, never someone else's files.
 * @returns {boolean} true when the marker is in place (freshly written or already there)
 */
function markSessionOwned(root, sessionId) {
    const dir = sessionDir(root, sessionId);
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, OWNER_FILE), JSON.stringify({ owner: OWNER_TAG }), { flag: 'wx' });
        return true;
    } catch (err) {
        return Boolean(err) && err.code === 'EEXIST';
    }
}

/** Atomic write of session-scoped state, stamping the ownership marker retention requires. */
function writeSessionJsonAtomic(root, sessionId, file, value) {
    markSessionOwned(root, sessionId);
    return writeJsonAtomic(file, value);
}

/** Group file id: sanitized name, never starting with `_` (reserved for `_scan`/`_session` state). */
function groupFileId(groupName) {
    const id = sanitizeId(groupName);
    if (!id.startsWith('_')) return id;
    const digest = crypto.createHash('sha256').update(String(groupName)).digest('hex').slice(0, 8);
    return `g${id.slice(0, ID_MAX - 10)}-${digest}`;
}

function recordFile(root, sessionId, scope, groupName) {
    return path.join(scopeDir(root, sessionId, scope), `${groupFileId(groupName)}.json`);
}

function lockFile(root, sessionId, scope, groupName) {
    return path.join(scopeDir(root, sessionId, scope), `${groupFileId(groupName)}.lock`);
}

function readRecord(root, sessionId, scope, groupName) {
    return readJson(recordFile(root, sessionId, scope, groupName));
}

function writeRecordAtomic(root, sessionId, scope, groupName, record) {
    if (!record || !RECORDED_FORMS.has(record.form)) return false;
    return writeSessionJsonAtomic(root, sessionId, recordFile(root, sessionId, scope, groupName), record);
}

function tryCreateLock(file, now) {
    const token = crypto.randomBytes(8).toString('hex');
    const fd = fs.openSync(file, 'wx');
    try {
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: now, token }));
    } finally {
        fs.closeSync(fd);
    }
    return token;
}

/**
 * Claim a group's delivery. Returns the claim token (truthy) or false.
 * A lock whose file mtime is at least LOCK_STALE_MS old is stale: unlink it and retry once.
 * Fresh peer lock ⇒ false. Any IO failure (e.g. unwritable store) ⇒ false (caller skips delivery).
 */
function acquireLock(file, now = Date.now(), staleMs = LOCK_STALE_MS) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
    } catch {
        return false;
    }
    try {
        return tryCreateLock(file, now);
    } catch (err) {
        if (!err || err.code !== 'EEXIST') return false;
    }
    try {
        // A peer could replace the stale lock between this stat and the unlink; the hook's
        // post-lock presence re-check bounds that residual race (plan P5, H1).
        if (now - fs.statSync(file).mtimeMs < staleMs) return false;
        fs.unlinkSync(file);
    } catch (err) {
        if (!err || err.code !== 'ENOENT') return false;
    }
    try {
        return tryCreateLock(file, now);
    } catch {
        return false;
    }
}

/**
 * Release a claim. With a token, only the claim that still carries it is removed: after a
 * stale takeover the original holder must not delete the new holder's live lock.
 */
function releaseLock(file, token) {
    try {
        if (token !== undefined) {
            const current = readJson(file);
            if (!current || current.token !== token) return;
        }
        fs.unlinkSync(file);
    } catch {
        /* already gone */
    }
}

function transcriptSize(file) {
    if (!nonBlank(file)) return null;
    try {
        const stat = fs.statSync(file);
        return stat.isFile() ? stat.size : null;
    } catch {
        return null;
    }
}

/**
 * Transcript for the working context: main ⇒ `transcript_path`; helper agent ⇒
 * `<dir>/<session_id>/subagents/agent-<agent_id>.jsonl` (observed Claude layout) when the
 * agent and session ids are filesystem-safe path segments (not `.`/`..`); otherwise none
 * (age re-arm applies).
 */
function isSafeSegment(value) {
    const text = String(value || '');
    return FILESYSTEM_SAFE_ID.test(text) && !/^\.+$/.test(text);
}

function transcriptPathFor(input) {
    if (!input || !nonBlank(input.transcript_path)) return null;
    if (!nonBlank(input.agent_id)) return input.transcript_path;
    if (!isSafeSegment(input.agent_id) || !isSafeSegment(input.session_id)) return null;
    return path.join(path.dirname(input.transcript_path), input.session_id, 'subagents', `agent-${input.agent_id}.jsonl`);
}

/**
 * A condensation seen without its own time is placed just before `now`, so a delivery made
 * in the same trigger (deliveredAt = now) counts as after it (no duplicate reminder).
 */
function inferredBoundary(now) {
    return now - 1;
}

function boundaryTime(line, now) {
    try {
        const parsed = JSON.parse(line);
        const ts = parsed && typeof parsed.timestamp === 'string' ? Date.parse(parsed.timestamp) : NaN;
        return Number.isFinite(ts) ? ts : inferredBoundary(now);
    } catch {
        return inferredBoundary(now);
    }
}

function compileMarkers(markers) {
    return (Array.isArray(markers) ? markers : []).map(source => {
        try {
            return new RegExp(source);
        } catch {
            return null;
        }
    }).filter(Boolean);
}

/**
 * Incremental transcript scan for condensation marks (BR-PFCI-06).
 * First scan of a large transcript (size ≥ reinjectAfterBytes) starts at EOF — any
 * earlier delivery is void by distance anyway. More than the scan cap appended ⇒
 * assume condensation. A shrunk transcript is rescanned from the start.
 *
 * `opts.owned` says the caller owns `root`, so a scan-state write also stamps the ownership
 * marker retention needs. It defaults to false because this scanner is BORROWED: the prompt
 * ledger runs it against its own store (lib/prompt-ledger-store.cjs), and stamping this
 * ledger's marker there would both mis-claim a foreign store and make that store's own
 * retention treat every session as unrecognized.
 * @returns {number|null} latest boundary time (ms) seen for this scope, or null
 */
function scanCompaction(root, sessionId, scope, transcriptFile, settings = {}, now = Date.now(), opts = {}) {
    const stateFile = path.join(scopeDir(root, sessionId, scope), '_scan.json');
    const state = readJson(stateFile);
    const size = transcriptSize(transcriptFile);
    const known = state && typeof state.lastBoundaryAt === 'number' ? state.lastBoundaryAt : null;
    if (size === null) return known;
    const capBytes = opts.scanCapBytes || SCAN_CAP_BYTES;
    const reinjectAfterBytes = settings.reinjectAfterBytes || DEFAULTS.reinjectAfterBytes;
    const storedOffset = state && Number.isInteger(state.offset) && state.offset >= 0 ? state.offset : null;
    let offset = storedOffset;
    let lastBoundaryAt = known;
    // Unchanged state is not rewritten (a no-growth trigger costs one stat and one read).
    const saveState = (nextOffset, nextBoundary) => {
        if (nextOffset !== storedOffset || nextBoundary !== known) {
            if (opts.owned) markSessionOwned(root, sessionId);
            writeJsonAtomic(stateFile, { offset: nextOffset, lastBoundaryAt: nextBoundary });
        }
    };

    if (offset === null && size >= reinjectAfterBytes) {
        saveState(size, lastBoundaryAt);
        return lastBoundaryAt;
    }
    if (offset === null || size < offset) offset = 0;
    if (size - offset > capBytes) {
        lastBoundaryAt = Math.max(lastBoundaryAt === null ? -Infinity : lastBoundaryAt, inferredBoundary(now));
        saveState(size, lastBoundaryAt);
        return lastBoundaryAt;
    }
    if (size > offset) {
        let chunk = '';
        try {
            const fd = fs.openSync(transcriptFile, 'r');
            try {
                const buffer = Buffer.alloc(size - offset);
                const read = fs.readSync(fd, buffer, 0, buffer.length, offset);
                chunk = buffer.slice(0, read).toString('utf8');
            } finally {
                fs.closeSync(fd);
            }
        } catch {
            return lastBoundaryAt;
        }
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline >= 0) {
            const complete = chunk.slice(0, lastNewline + 1);
            const markers = compileMarkers(settings.compactionMarkers);
            for (const line of complete.split('\n')) {
                if (!line) continue;
                if (line.includes(BUILTIN_BOUNDARY) || markers.some(re => re.test(line))) {
                    const at = boundaryTime(line, now);
                    lastBoundaryAt = lastBoundaryAt === null ? at : Math.max(lastBoundaryAt, at);
                }
            }
            offset += Buffer.byteLength(complete, 'utf8');
        }
    }
    saveState(offset, lastBoundaryAt);
    return lastBoundaryAt;
}

function readSessionCompaction(root, sessionId) {
    const state = readJson(path.join(sessionDir(root, sessionId), '_session.json'));
    return state && typeof state.compactedAt === 'number' ? state.compactedAt : null;
}

/** Host-reported condensation / clear for the session (the report does not say which context). Prints nothing. */
function recordSessionCompaction(root, sessionId, now = Date.now()) {
    return writeSessionJsonAtomic(root, sessionId, path.join(sessionDir(root, sessionId), '_session.json'), { compactedAt: now });
}

/**
 * Latest condensation affecting a scope (BR-PFCI-06): max(host report, the scope's own
 * history mark). The host report does not identify the condensed context, so it applies to
 * the main conversation and to any helper whose own history cannot be measured; a helper
 * with a measurable history records its own condensation marks and is not re-armed by a
 * sibling's. `-Infinity` when none was ever seen (so a session-start credit at time 0 counts).
 */
function lastCompactionAt(root, sessionId, scope, input, settings, now = Date.now(), opts = {}) {
    const history = transcriptPathFor(input);
    const measurable = transcriptSize(history) !== null;
    const session = scope === MAIN_SCOPE || !measurable ? readSessionCompaction(root, sessionId) : null;
    // This entry point is this ledger's own: `root` is the convention store, so a scan-state
    // write claims the session. Without it a context covered by static credit alone would
    // write scan state and never a record, leaving an unmarked directory retention can never
    // reclaim (BR-PFCI-18).
    const scanned = scanCompaction(root, sessionId, scope, history, settings, now, { ...opts, owned: true });
    const candidates = [session, scanned].filter(v => typeof v === 'number');
    return candidates.length ? Math.max(...candidates) : -Infinity;
}

/**
 * BR-PFCI-05 presence: delivered form ∧ current version ∧ delivered strictly after the last
 * condensation ∧ distance below limit (0 ≤ growth < reinjectAfterBytes; unknown size ⇒ age).
 * A history shorter than at delivery was replaced or rewritten, so the delivery is treated as
 * absent (an extra reminder, never a missed one).
 *
 * Which age limit applies (BR-PFCI-15): a context whose size is unknown but whose condensations
 * ARE observed (a host report, or marks in its own history) keeps the normal
 * `reinjectAfterMinutes` — age is only a distance proxy there. A context that is BLIND —
 * size unknown AND no condensation ever observed, so `lastCompactionAt` is -Infinity and the
 * test above cannot fail — uses the much shorter `blindReinjectAfterMinutes`, because an
 * unseen condensation would otherwise suppress the reminder for the whole window.
 *
 * ctx = { lastCompactionAt, transcriptSize (number|null), now }
 */
function isPresent(record, hash, ctx, settings) {
    if (!record || !PRESENT_FORMS.has(record.form)) return false;
    if (record.hash !== hash || typeof record.deliveredAt !== 'number') return false;
    if (!(record.deliveredAt > ctx.lastCompactionAt)) return false;
    if (typeof ctx.transcriptSize === 'number' && typeof record.transcriptBytes === 'number') {
        const growth = ctx.transcriptSize - record.transcriptBytes;
        return growth >= 0 && growth < settings.reinjectAfterBytes;
    }
    const blind = !Number.isFinite(ctx.lastCompactionAt);
    const minutes = blind ? settings.blindReinjectAfterMinutes : settings.reinjectAfterMinutes;
    // Some advisory injections deliberately disable age-only re-arming. When a host cannot
    // expose context size, elapsed wall time is not evidence that the context crossed a token
    // boundary. Keep the delivery present until content, session, or compaction evidence changes.
    if (minutes === null) return true;
    // A record stamped in the future (clock moved backwards, or a store carried over from
    // another machine) is treated as absent, exactly as the byte path treats negative growth:
    // an unmeasurable distance costs one extra reminder, never a missed one.
    const elapsed = ctx.now - record.deliveredAt;
    return elapsed >= 0 && elapsed < minutes * 60 * 1000;
}

function normalizedDocPath(value) {
    const slashed = String(value).replace(/\\/g, '/').replace(/^\.\//, '');
    return process.platform === 'win32' ? slashed.toLowerCase() : slashed;
}

/** Last `:`-separated segment, so a namespaced skill (`plugin:ui-review`) matches its bare name. */
function bareSkill(value) {
    const text = String(value).trim().replace(/^[/$]/, '');
    return text.slice(text.lastIndexOf(':') + 1);
}

/** Tool calls of one transcript line: [{ name, input }] from `message.content[]` tool_use items. */
function toolUses(parsed) {
    const content = parsed && parsed.message && Array.isArray(parsed.message.content) ? parsed.message.content : [];
    return content.filter(item => item && item.type === 'tool_use' && typeof item.name === 'string')
        .map(item => ({ name: item.name, input: item.input && typeof item.input === 'object' ? item.input : {} }));
}

/**
 * Transcript evidence that a class's protocol is ALREADY in the working context, so delivering its
 * digest would only duplicate it. Scans the LAST `windowBytes` of the context's history (the class's
 * re-arm distance) and keeps only evidence after the last condensation mark inside that window and
 * strictly after `lastCompactionAt` (host report): condensed content is gone, so it no longer counts.
 * Evidence (Claude transcript shapes; any other shape finds nothing — an extra reminder, never a
 * missed one):
 *   - skills: ANY listed skill loaded — a `Skill` tool call (`input.skill`) or a slash command
 *     (`<command-name>/name</command-name>`); these skills carry the protocol inline.
 *   - docs: EVERY listed doc read by a `Read` tool call (`input.file_path` ends with the repo-relative
 *     doc path); the credit dates from the OLDEST of those reads, since all must still be in context.
 * @param {string|null} transcriptFile
 * @param {{docs?: string[], skills?: string[]}} evidence
 * @param {{windowBytes: number, lastCompactionAt?: number, compactionMarkers?: string[], capBytes?: number}} opts
 * @returns {{at: number, transcriptBytes: number}|null} evidence time (ms) and absolute byte offset
 */
function scanEvidence(transcriptFile, evidence, opts = {}) {
    const docs = (evidence && Array.isArray(evidence.docs) ? evidence.docs : []).filter(nonBlank).map(normalizedDocPath);
    const skills = new Set((evidence && Array.isArray(evidence.skills) ? evidence.skills : []).filter(nonBlank).map(bareSkill));
    if (!docs.length && !skills.size) return null;
    const size = transcriptSize(transcriptFile);
    const windowBytes = Number.isInteger(opts.windowBytes) && opts.windowBytes > 0 ? opts.windowBytes : 0;
    if (!size || !windowBytes) return null;
    const length = Math.min(size, windowBytes, opts.capBytes || SCAN_CAP_BYTES);
    const start = size - length;
    let text;
    try {
        const fd = fs.openSync(transcriptFile, 'r');
        try {
            const buffer = Buffer.alloc(length);
            const read = fs.readSync(fd, buffer, 0, length, start);
            text = buffer.slice(0, read).toString('utf8');
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
    const lastCompaction = typeof opts.lastCompactionAt === 'number' ? opts.lastCompactionAt : -Infinity;
    const markers = compileMarkers(opts.compactionMarkers);
    let offset = start;
    // A window that starts mid-line skips that partial line: its evidence is (partly) outside the window.
    if (start > 0) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline < 0) return null;
        offset += Buffer.byteLength(text.slice(0, firstNewline + 1), 'utf8');
        text = text.slice(firstNewline + 1);
    }
    let docReads = new Map();
    let skillHit = null;
    for (const line of text.split('\n')) {
        const lineStart = offset;
        offset += Buffer.byteLength(line, 'utf8') + 1;
        if (!line) continue;
        if (line.includes(BUILTIN_BOUNDARY) || markers.some(re => re.test(line))) {
            docReads = new Map();
            skillHit = null;
            continue;
        }
        if (!line.includes('"tool_use"') && !line.includes('<command-name>')) continue;
        let parsed;
        try {
            parsed = JSON.parse(line);
        } catch {
            continue;
        }
        const ts = parsed && typeof parsed.timestamp === 'string' ? Date.parse(parsed.timestamp) : NaN;
        // An undated line cannot be ordered against a host-reported condensation, so it counts only
        // while none was ever observed, dated 0 so that any later condensation voids it.
        const at = Number.isFinite(ts) ? ts : (Number.isFinite(lastCompaction) ? null : 0);
        if (at === null || !(at > lastCompaction)) continue;
        const hit = { at, transcriptBytes: lineStart };
        for (const use of toolUses(parsed)) {
            if (use.name === 'Skill' && nonBlank(use.input.skill) && skills.has(bareSkill(use.input.skill))) skillHit = hit;
            if (use.name === 'Read' && nonBlank(use.input.file_path)) {
                const read = normalizedDocPath(use.input.file_path);
                for (const doc of docs) {
                    if (read === doc || read.endsWith(`/${doc}`)) docReads.set(doc, hit);
                }
            }
        }
        if (skills.size && line.includes('<command-name>')) {
            for (const match of line.matchAll(COMMAND_NAME)) {
                if (skills.has(bareSkill(match[1]))) skillHit = hit;
            }
        }
    }
    const candidates = [];
    if (skillHit) candidates.push(skillHit);
    if (docs.length && docs.every(doc => docReads.has(doc))) {
        candidates.push(docs.map(doc => docReads.get(doc)).reduce((a, b) => (a.transcriptBytes <= b.transcriptBytes ? a : b)));
    }
    if (!candidates.length) return null;
    // The most recent qualifying evidence leaves the longest remaining credit.
    return candidates.reduce((a, b) => (a.transcriptBytes >= b.transcriptBytes ? a : b));
}

const carrierCache = new Map();

/** Texts of the root static carriers that exist (each file separately; missing ones skipped). */
function carrierTexts(projectDir) {
    if (carrierCache.has(projectDir)) return carrierCache.get(projectDir);
    const texts = [];
    for (const name of ['CLAUDE.md', 'AGENTS.md']) {
        try {
            texts.push(fs.readFileSync(path.join(projectDir, name), 'utf8'));
        } catch {
            /* optional carrier */
        }
    }
    carrierCache.set(projectDir, texts);
    return texts;
}

/**
 * BR-PFCI-16 static credit (main scope only, measurable transcript only): when EVERY existing
 * root static carrier contains the group's current tag, return a synthetic record delivered at
 * session start; isPresent() then ends the credit at the first condensation or byte re-arm.
 * Requiring every carrier keeps a stale carrier (the one the host actually loaded may be
 * either) from being covered by a fresh sibling — the cost is an extra reminder, never a miss.
 */
function staticCredit(scope, tag, hash, ctx, projectDir) {
    if (scope !== MAIN_SCOPE || typeof ctx.transcriptSize !== 'number' || !projectDir) return null;
    const texts = carrierTexts(projectDir);
    return texts.length > 0 && texts.every(text => text.includes(tag))
        ? { hash, deliveredAt: 0, transcriptBytes: 0, form: 'static' }
        : null;
}

/** True only for the ledger's own marker: the reserved name AND the owner tag inside it. */
function isOwnerMarker(file) {
    const marker = readJson(file);
    return Boolean(marker) && marker.owner === OWNER_TAG;
}

/**
 * Newest modification time of a session directory the ledger owns, or null when it is not
 * ours. Ownership is decided by TWO independent tests, both required:
 *   1. the `_owner.json` marker (markSessionOwned) is present and carries the owner tag;
 *   2. the directory is exactly ledger-shaped — at least one entry, and every entry is
 *      `_owner.json`, `_session.json`, a `*.tmp` file, or a scope directory
 *      (`main` / `agent-<safe id>`) holding only `*.json` / `*.lock` / `*.tmp` files.
 * Either test failing yields null, and `pruneStale` never deletes a directory it cannot age.
 * Shape alone proves nothing: `<dir>/main/<name>.json` is an ordinary cache layout, and the
 * store root is overridable to any path, so a shape-only rule would recursively delete a
 * stranger's tree. Directories written before the marker existed therefore read as not-ours
 * and are simply never pruned — one is adopted as soon as that session writes again. An
 * unpruned directory costs a few KB in a temp store; a wrong deletion costs data.
 */
function ledgerSessionAge(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.length === 0) return null;
    let newest = fs.lstatSync(dir).mtimeMs;
    let owned = false;
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && SESSION_FILE_NAME.test(entry.name)) {
            owned = owned || (entry.name === OWNER_FILE && isOwnerMarker(full));
            newest = Math.max(newest, fs.lstatSync(full).mtimeMs);
            continue;
        }
        if (!entry.isDirectory() || !SCOPE_DIR_NAME.test(entry.name)) return null;
        newest = Math.max(newest, fs.lstatSync(full).mtimeMs);
        for (const item of fs.readdirSync(full, { withFileTypes: true })) {
            if (!item.isFile() || !SCOPE_FILE_NAME.test(item.name)) return null;
            newest = Math.max(newest, fs.lstatSync(path.join(full, item.name)).mtimeMs);
        }
    }
    return owned ? newest : null;
}

/** Remove session directories the ledger owns (marker + shape) whose newest entry is older than 7 days (bounded per run). */
function pruneStale(root, now = Date.now(), maxAgeMs = PRUNE_AGE_MS, limit = PRUNE_LIMIT) {
    let removed = 0;
    try {
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (removed >= limit) break;
            if (!entry.isDirectory()) continue;
            const dir = path.join(root, entry.name);
            try {
                const newest = ledgerSessionAge(dir);
                if (newest !== null && now - newest > maxAgeMs) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    removed++;
                }
            } catch {
                /* skip entry */
            }
        }
    } catch {
        /* no store yet */
    }
    return removed;
}

/**
 * Retention sweep at most once per interval per store (any host, any event), so sessions that
 * never condense are still cleaned. Returns the number of removed session directories.
 */
function maybePrune(root, now = Date.now(), intervalMs = PRUNE_INTERVAL_MS) {
    const marker = path.join(root, '_prune.json');
    const last = readJson(marker);
    if (last && typeof last.at === 'number' && now - last.at < intervalMs && now >= last.at) return 0;
    if (!writeJsonAtomic(marker, { at: now })) return 0;
    return pruneStale(root, now);
}

module.exports = {
    MAIN_SCOPE,
    LOCK_STALE_MS,
    SCAN_CAP_BYTES,
    PRUNE_AGE_MS,
    PRUNE_INTERVAL_MS,
    storeRoot,
    sanitizeId,
    scopeFor,
    sessionDir,
    scopeDir,
    recordFile,
    lockFile,
    readRecord,
    markSessionOwned,
    writeRecordAtomic,
    acquireLock,
    releaseLock,
    transcriptSize,
    transcriptPathFor,
    scanCompaction,
    readSessionCompaction,
    recordSessionCompaction,
    lastCompactionAt,
    isPresent,
    staticCredit,
    scanEvidence,
    pruneStale,
    maybePrune,
    _resetCarrierCache: () => carrierCache.clear()
};
