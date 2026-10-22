'use strict';

/**
 * Knowledge usage records (spec KNW, BR-KNW-17): which packs were pointed at and which were then read.
 *
 * A record holds exactly five fields — pack identity, plane, trigger kind, event kind and time —
 * and never prompt text, file contents or answers. Records live in the project's disposable
 * workspace (`tmp/knowledge-base/usage.jsonl`), capped at MAX_RECORDS, oldest dropped first.
 * Every write replaces the file whole. Advisory: failures are swallowed; delivery never depends on it.
 */

const fs = require('node:fs');
const path = require('node:path');

const MAX_RECORDS = 1000;
const EVENTS = Object.freeze(['delivered', 'read']);
const TRIGGERS = Object.freeze(['prompt', 'skill', 'agent', 'none']);

function usageFile(projectDir) {
    return path.join(projectDir, 'tmp', 'knowledge-base', 'usage.jsonl');
}

function readRecords(projectDir, file = usageFile(projectDir)) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return [];
    }
    const records = [];
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
            const record = JSON.parse(line);
            if (record && typeof record.pack === 'string') records.push(record);
        } catch {
            /* a damaged line is skipped */
        }
    }
    return records;
}

/** The fixed record shape: anything else a caller passes is dropped. */
function shape(input, now) {
    return {
        pack: String(input.pack),
        plane: input.plane === 'framework' ? 'framework' : 'project',
        trigger: TRIGGERS.includes(input.trigger) ? input.trigger : 'none',
        event: EVENTS.includes(input.event) ? input.event : 'delivered',
        time: new Date(typeof now === 'number' ? now : Date.now()).toISOString()
    };
}

/**
 * Append records, keeping the newest MAX_RECORDS. Returns true when written.
 * Best-effort counts (BR-KNW-17): read, append and replace the file whole, with no lock. The replace is
 * atomic, so the file is never torn, but two hook processes writing at the same moment (parallel helper
 * starts) can drop one's records — usage is advisory and a lock would cost more than the counts are worth.
 * deps (tests): file, now.
 */
function record(projectDir, inputs, deps = {}) {
    try {
        const list = (Array.isArray(inputs) ? inputs : [inputs]).filter(item => item && typeof item.pack === 'string' && item.pack);
        if (!list.length) return false;
        const file = deps.file || usageFile(projectDir);
        const records = readRecords(projectDir, file).concat(list.map(item => shape(item, deps.now)));
        const kept = records.slice(-MAX_RECORDS);
        require('./knowledge-index.cjs').writeFileAtomic(file, `${kept.map(item => JSON.stringify(shape(item, Date.parse(item.time) || deps.now))).join('\n')}\n`);
        return true;
    } catch {
        return false;
    }
}

/** The trigger of the most recent delivery of a pack, or 'none'. */
function lastTrigger(projectDir, plane, pack, deps = {}) {
    const records = readRecords(projectDir, deps.file || usageFile(projectDir));
    for (let i = records.length - 1; i >= 0; i -= 1) {
        const item = records[i];
        if (item.event === 'delivered' && item.pack === pack && item.plane === plane) return item.trigger;
    }
    return 'none';
}

/** Delivered and read counts per `plane:pack`. */
function summarize(projectDir, deps = {}) {
    const counts = {};
    for (const item of readRecords(projectDir, deps.file || usageFile(projectDir))) {
        const key = `${item.plane}:${item.pack}`;
        counts[key] = counts[key] || { delivered: 0, read: 0 };
        if (item.event === 'read') counts[key].read += 1;
        else counts[key].delivered += 1;
    }
    return counts;
}

module.exports = { MAX_RECORDS, usageFile, readRecords, record, lastTrigger, summarize };
