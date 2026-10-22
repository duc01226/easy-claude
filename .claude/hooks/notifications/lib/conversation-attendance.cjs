/**
 * Whether a developer attends the conversation behind a hook event.
 *
 * An alert asks the developer to look. A conversation nobody drives — a headless
 * run that another agent, a script or an evaluation harness started, such as
 * `claude -p` or `codex exec` in a throwaway workspace — has nobody to look, and
 * its parent picks up its result anyway, so it must not raise alerts. Each host
 * reports attendance differently; this module is the only reader of those reports.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Codex session sources (codex-rs SessionSource, lowercase) that no developer drives:
// a headless `codex exec` run and Codex serving another agent over MCP. `cli` and
// `vscode` (the Codex app and IDE extension) are attended; a custom or unknown source
// keeps its alert because nothing proves it unattended.
const UNATTENDED_CODEX_SOURCES = ['exec', 'mcp'];
// Object-valued sources Codex gives the threads it spawns itself.
const UNATTENDED_CODEX_SOURCE_KINDS = ['subagent', 'internal'];
// Codex names every session transcript rollout-<timestamp>-<id>.jsonl.
const CODEX_TRANSCRIPT_NAME = /^rollout-.+\.jsonl$/;
// The session header is the transcript's first line and embeds the base instructions,
// so read up to this bound; a longer header is treated as unreadable.
const MAX_HEADER_BYTES = 1024 * 1024;
const READ_CHUNK_BYTES = 64 * 1024;

/**
 * Read a file's first line without loading the whole transcript.
 * @param {string} filePath - File to read
 * @returns {string|null} First line, or null when unreadable or longer than the bound
 */
function readFirstLine(filePath) {
    let fd;
    try {
        fd = fs.openSync(filePath, 'r');
        const chunks = [];
        let total = 0;
        while (total < MAX_HEADER_BYTES) {
            const buffer = Buffer.alloc(Math.min(READ_CHUNK_BYTES, MAX_HEADER_BYTES - total));
            const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, total);
            if (bytesRead === 0) break;
            const newline = buffer.subarray(0, bytesRead).indexOf(0x0a);
            if (newline >= 0) {
                chunks.push(buffer.subarray(0, newline));
                return Buffer.concat(chunks).toString('utf8');
            }
            chunks.push(buffer.subarray(0, bytesRead));
            total += bytesRead;
        }
        // End of file inside the bound: the header is the whole file.
        return total < MAX_HEADER_BYTES ? Buffer.concat(chunks).toString('utf8') : null;
    } catch {
        return null;
    } finally {
        if (fd !== undefined) {
            try { fs.closeSync(fd); } catch { /* already closed */ }
        }
    }
}

/**
 * Session source recorded in a Codex transcript header.
 * Codex hook payloads carry the transcript path but not the source, so the header
 * is the one place that tells a headless run from the developer's own session.
 * @param {*} transcriptPath - transcript_path from the hook payload
 * @returns {string|Object|undefined} The recorded source, or undefined when the
 *   path is not a Codex transcript or its header cannot be read
 */
function readCodexSessionSource(transcriptPath) {
    if (typeof transcriptPath !== 'string' || !CODEX_TRANSCRIPT_NAME.test(path.basename(transcriptPath))) {
        return undefined;
    }
    const header = readFirstLine(transcriptPath);
    if (!header) return undefined;
    try {
        const record = JSON.parse(header);
        if (record && record.type === 'session_meta' && record.payload && typeof record.payload === 'object') {
            return record.payload.source;
        }
    } catch {
        // A malformed header proves nothing about attendance.
    }
    return undefined;
}

/**
 * Explain why nobody attends the conversation behind an event.
 * @param {Object} input - Hook payload
 * @param {Object} hostEnv - Environment the host started the hook with
 * @returns {string|null} Reason the conversation is unattended, or null when it is
 *   attended or attendance cannot be proven (the alert then stays eligible)
 */
function getUnattendedReason(input, hostEnv) {
    if (!input || typeof input !== 'object') return null;
    const env = hostEnv && typeof hostEnv === 'object' ? hostEnv : {};

    // Claude exports to every hook it runs whether a developer attends that session:
    // '1' for the interactive terminal and the desktop and IDE apps, '0' for a print-mode,
    // SDK or background run and for a session another Claude session started. The flag
    // belongs to the session in CLAUDE_CODE_SESSION_ID; another host's hook can inherit
    // both variables from an ancestor Claude terminal, so they count only when that id
    // is the payload's own session.
    if (env.CLAUDE_CODE_SESSION_ATTENDED === '0' &&
        typeof input.session_id === 'string' && input.session_id !== '' &&
        env.CLAUDE_CODE_SESSION_ID === input.session_id) {
        return 'unattended Claude session (headless, SDK, background or started by another agent)';
    }

    const codexSource = readCodexSessionSource(input.transcript_path);
    if (typeof codexSource === 'string' && UNATTENDED_CODEX_SOURCES.includes(codexSource)) {
        return `unattended Codex ${codexSource} session`;
    }
    if (codexSource && typeof codexSource === 'object') {
        const kind = UNATTENDED_CODEX_SOURCE_KINDS.find(name => Object.prototype.hasOwnProperty.call(codexSource, name));
        if (kind) return `unattended Codex ${kind} thread`;
    }

    return null;
}

module.exports = { getUnattendedReason, readCodexSessionSource };
