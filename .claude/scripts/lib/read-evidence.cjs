'use strict';

const MAX_OBSERVED_OUTPUT_BYTES = 4 * 1024 * 1024;

/** Complete raw reads may span events; trusted byte ranges also support overlap/out-of-order reads. */
function completedRead(events, file, original, firstWrite) {
    if (typeof original !== 'string' || firstWrite < 0) return { complete: false };
    const expected = Buffer.from(original); const outputs = []; const ranges = []; const observedAt = [];
    let bytes = 0; let chunks = 0;
    for (let index = 0; index < firstWrite; index++) {
        const row = events[index];
        if (row.exitCode !== 0 || !row.readPaths?.includes(file) || typeof row.output !== 'string') continue;
        bytes += Buffer.byteLength(row.output);
        if (bytes > MAX_OBSERVED_OUTPUT_BYTES) return { complete: false, error: 'Read evidence limit' };
        outputs.push(row.output);
        observedAt.push(index);
        if (row.readChunks === undefined) continue;
        if (!Array.isArray(row.readChunks) || row.readChunks.length > 4096) return { complete: false, error: 'Invalid observer read chunks' };
        for (const chunk of row.readChunks) {
            if (!chunk || typeof chunk !== 'object' || !row.readPaths.includes(chunk.path)
                || !Number.isSafeInteger(chunk.offset) || chunk.offset < 0 || typeof chunk.text !== 'string') return { complete: false, error: 'Invalid observer read chunks' };
            if (chunk.path !== file) continue;
            const content = Buffer.from(chunk.text); const end = chunk.offset + content.length;
            bytes += content.length;
            if (++chunks > 4096 || bytes > MAX_OBSERVED_OUTPUT_BYTES) return { complete: false, error: 'Read evidence limit' };
            if (end > expected.length || !expected.subarray(chunk.offset, end).equals(content)
                || !row.output.includes(chunk.text)) return { complete: false, error: 'Invalid observer read chunks' };
            ranges.push([chunk.offset, end]);
        }
    }
    // Only actual successful reads of THIS file contribute; unrelated or late output cannot fill gaps.
    const needle = original.trim(); const joined = outputs.join(''); const start = joined.indexOf(needle);
    if (outputs.length && start >= 0) {
        let offset = 0;
        for (let index = 0; index < outputs.length; index++) {
            offset += outputs[index].length;
            if (offset >= start + needle.length) return { complete: true, completedAt: observedAt[index] };
        }
    }
    let covered = 0;
    for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
        if (start > covered) break;
        covered = Math.max(covered, end);
    }
    return { complete: ranges.length > 0 && covered === expected.length };
}

module.exports = { completedRead, MAX_OBSERVED_OUTPUT_BYTES };
