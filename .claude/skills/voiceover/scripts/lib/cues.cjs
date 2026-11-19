'use strict';

/**
 * Cue input validation, pronunciation substitution, content-hash cache keying,
 * atomic file writes, and pure-Node RIFF WAV duration parsing.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { UsageError } = require('./exit-codes.cjs');

const MAX_CUES = 500;
const MAX_CUE_CHARS = 4000;
const MAX_CUE_ID_LEN = 80;
const CUE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DEFAULT_PAUSE_AFTER = 0.35;

function validateCueId(id) {
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_CUE_ID_LEN) {
        throw new UsageError(`Invalid cue id "${String(id)}": must be 1..${MAX_CUE_ID_LEN} characters.`);
    }
    if (!CUE_ID_RE.test(id) || id.includes('..')) {
        throw new UsageError(`Invalid cue id "${id}": use only ASCII letters, digits, ".", "_" or "-" (no path separators or "..").`);
    }
    return id;
}

function loadCues(filePath, options = {}) {
    const { maxCues = MAX_CUES, maxCueChars = MAX_CUE_CHARS } = options;
    if (!filePath || !fs.existsSync(filePath)) {
        throw new UsageError(`Cues file not found: ${filePath || '(empty)'}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new UsageError(`Invalid JSON in cues file "${filePath}": ${error.message}`);
    }
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cues) ? parsed.cues : null;
    if (!list || list.length === 0) {
        throw new UsageError(`Cues file "${filePath}" must contain a non-empty array (or { "cues": [...] }).`);
    }
    if (list.length > maxCues) {
        throw new UsageError(`Cues file exceeds the limit of ${maxCues} cues (got ${list.length}). Split into chapters or pass --max-cues.`);
    }
    const seen = new Set();
    const cues = [];
    for (let i = 0; i < list.length; i += 1) {
        const entry = list[i];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new UsageError(`Cue at index ${i} must be an object with "id" and "text".`);
        }
        const id = validateCueId(entry.id);
        if (seen.has(id)) {
            throw new UsageError(`Duplicate cue id "${id}" at index ${i}.`);
        }
        seen.add(id);
        const text = typeof entry.text === 'string' ? entry.text.trim() : '';
        if (!text) {
            throw new UsageError(`Cue "${id}" has empty text.`);
        }
        if (text.length > maxCueChars) {
            throw new UsageError(`Cue "${id}" exceeds ${maxCueChars} characters (${text.length}). Split long paragraphs into smaller cues.`);
        }
        let pauseAfter = DEFAULT_PAUSE_AFTER;
        if (entry.pauseAfter !== undefined) {
            if (typeof entry.pauseAfter !== 'number' || !Number.isFinite(entry.pauseAfter) || entry.pauseAfter < 0 || entry.pauseAfter > 10) {
                throw new UsageError(`Cue "${id}" pauseAfter must be a number in [0, 10]; got ${JSON.stringify(entry.pauseAfter)}.`);
            }
            pauseAfter = entry.pauseAfter;
        }
        let speed = null;
        if (entry.speed !== undefined) {
            if (typeof entry.speed !== 'number' || !Number.isFinite(entry.speed) || entry.speed < 0.5 || entry.speed > 2.0) {
                throw new UsageError(`Cue "${id}" speed must be a number in [0.5, 2.0]; got ${JSON.stringify(entry.speed)}.`);
            }
            speed = entry.speed;
        }
        cues.push({
            id,
            text,
            pauseAfter,
            speed,
            chapter: typeof entry.chapter === 'string' ? entry.chapter : null,
            instructions: typeof entry.instructions === 'string' ? entry.instructions.trim() : null
        });
    }
    return {
        language: typeof parsed?.language === 'string' ? parsed.language : null,
        cues
    };
}

function loadPronunciation(filePath) {
    if (!filePath) return {};
    if (!fs.existsSync(filePath)) {
        throw new UsageError(`Pronunciation file not found: ${filePath}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new UsageError(`Invalid JSON in pronunciation file "${filePath}": ${error.message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new UsageError(`Pronunciation file "${filePath}" must be a JSON object mapping source terms to spoken replacements.`);
    }
    const map = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (key.startsWith('_')) continue;
        if (typeof value !== 'string' || !key.trim() || !value.trim()) {
            throw new UsageError(`Pronunciation entry "${key}" must map a non-empty term to a non-empty string.`);
        }
        map[key] = value;
    }
    return map;
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyPronunciation(text, map = {}) {
    const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
    if (entries.length === 0) return String(text);
    // Single-pass longest-first alternation with Unicode letter/digit boundaries avoids both
    // Vietnamese diacritic splitting (e.g. "vi" inside "việt") and cascading double replacements.
    const branches = entries.map(([term]) => {
        const startsWord = /^[\p{L}\p{N}]/u.test(term);
        const endsWord = /[\p{L}\p{N}]$/u.test(term);
        return `${startsWord ? '(?<![\\p{L}\\p{N}])' : ''}${escapeRegExp(term)}${endsWord ? '(?![\\p{L}\\p{N}])' : ''}`;
    });
    const pattern = new RegExp(branches.join('|'), 'gu');
    return String(text).replace(pattern, matched => map[matched]);
}

function computeCueHash({ provider, model, voice, speed, instructions, spokenText }) {
    const payload = JSON.stringify({
        v: 1,
        provider: String(provider || ''),
        model: String(model || ''),
        voice: String(voice ?? ''),
        speed: Number(speed || 1),
        instructions: String(instructions || ''),
        spokenText: String(spokenText || '')
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function writeFileAtomic(targetPath, data) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(tmp, data);
        fs.renameSync(tmp, targetPath);
    } catch (error) {
        try {
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        } catch {
            // Best-effort temp cleanup after write/rename error.
        }
        throw error;
    }
}

/**
 * Pure-Node RIFF WAVE duration reader (returns seconds, or null if not a valid RIFF WAVE).
 * Lets `audition` and `--no-master` report exact cue durations even when ffprobe is absent.
 */
function readWavDuration(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    if (buf.length < 44) return null;
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
    let offset = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (offset + 8 <= buf.length) {
        const chunkId = buf.toString('ascii', offset, offset + 4);
        const chunkSize = buf.readUInt32LE(offset + 4);
        const bodyStart = offset + 8;
        if (chunkId === 'fmt ' && chunkSize >= 16 && bodyStart + 16 <= buf.length) {
            byteRate = buf.readUInt32LE(bodyStart + 8);
        } else if (chunkId === 'data') {
            dataSize = Math.min(chunkSize, Math.max(0, buf.length - bodyStart));
            break;
        }
        offset = bodyStart + chunkSize + (chunkSize % 2);
    }
    if (byteRate <= 0 || dataSize <= 0) return null;
    return Number((dataSize / byteRate).toFixed(4));
}

module.exports = {
    MAX_CUES,
    MAX_CUE_CHARS,
    DEFAULT_PAUSE_AFTER,
    validateCueId,
    loadCues,
    loadPronunciation,
    applyPronunciation,
    computeCueHash,
    writeFileAtomic,
    readWavDuration
};
