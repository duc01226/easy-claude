'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const MAX_CONTEXT_CHARS = 96_000;
const digest = value => createHash('sha256').update(value).digest('hex');

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return fallback;
        throw error;
    }
}

function writeJson(file, value) {
    const staging = `${file}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(staging, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
        fs.renameSync(staging, file);
    } finally {
        fs.rmSync(staging, { force: true });
    }
}

function boundMessages(messages) {
    const result = [];
    const seen = new Set();
    let size = 0;
    for (const message of messages) {
        if (seen.has(message)) continue;
        if (size + message.length > MAX_CONTEXT_CHARS) {
            result.push('easy-claude: Additional Antigravity hook context exceeded the delivery limit.');
            break;
        }
        seen.add(message);
        result.push(message);
        size += message.length;
    }
    return result;
}

function conversationState(root, conversationId) {
    const dir = path.join(root, 'tmp', 'antigravity-hooks', digest(conversationId));
    const turn = path.join(dir, 'turn.json');
    function ensureDirectory() {
        // Never follow a local state-directory symlink out of the workspace (or into another session).
        for (const folder of [path.dirname(path.dirname(dir)), path.dirname(dir), dir]) {
            fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
            if (!fs.lstatSync(folder).isDirectory()) throw new Error('Antigravity state path is not a local directory');
        }
    }
    return {
        isNewPrompt(prompt, invocation) {
            if (typeof prompt !== 'string' || !prompt.trim()) return false;
            ensureDirectory();
            const previous = readJson(turn, null);
            const hash = digest(prompt);
            const sequence = Number.isSafeInteger(invocation) && invocation >= 0 ? invocation : null;
            const restarted = sequence === 0 && previous?.sequence > 0;
            writeJson(turn, { hash, sequence });
            return previous?.hash !== hash || restarted;
        },
        clearTurn() {
            ensureDirectory();
            fs.rmSync(turn, { force: true });
        },
        enqueue(messages) {
            if (!messages.length) return;
            ensureDirectory();
            // One batch per tool callback; no competing read/modify/write across parallel tools.
            writeJson(path.join(dir, `pending-${Date.now()}-${randomUUID()}.json`), boundMessages(messages));
        },
        drain() {
            ensureDirectory();
            const messages = [];
            let size = 0;
            let truncated = false;
            for (const name of fs.readdirSync(dir).sort()) {
                if (!/^pending-\d+-[a-f\d-]+\.json$/.test(name)) continue;
                const file = path.join(dir, name);
                const claimed = `${file}.${randomUUID()}.claimed`;
                try {
                    fs.renameSync(file, claimed);
                } catch (error) {
                    if (error.code === 'ENOENT') continue;
                    throw error;
                }
                try {
                    if (truncated || !fs.lstatSync(claimed).isFile()) continue;
                    for (const message of readJson(claimed, [])) {
                        if (typeof message !== 'string') continue;
                        if (size + message.length > MAX_CONTEXT_CHARS) {
                            truncated = true;
                            messages.push('easy-claude: Additional Antigravity hook context exceeded the delivery limit.');
                            break;
                        }
                        messages.push(message);
                        size += message.length;
                    }
                } finally {
                    fs.rmSync(claimed, { force: true });
                }
            }
            return messages;
        }
    };
}

module.exports = { boundMessages, conversationState };
