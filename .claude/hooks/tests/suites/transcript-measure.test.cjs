/**
 * Transcript measure (lib/transcript-measure.cjs) — the re-send ledgers count conversation bytes,
 * not the host's request copies or image payloads, so a pasted image never re-arms a reminder early.
 *
 * Coverage:
 *   TM-001 classification: host request records excluded whole; an image payload counts as its token
 *          equivalent at any depth (tool results too); a data:image URL likewise; text and broken lines count
 *   TM-002 measured size = file size minus excluded bytes; a text-only transcript measures its raw size
 *   TM-003 incremental: a second measure reads only the appended bytes (plus a 64-byte fingerprint)
 *   TM-004 a partial last line counts in full until it completes, then is classified
 *   TM-005 a shorter file, a file replaced at the same path and a file rewritten in place recount
 *   TM-006 cap: a first measure past the cap and an append past the cap restart at the end, so the measure
 *          only jumps up (one extra reminder, never a missed one)
 *   TM-007 TC-PDL-124 ledger: a delivery stays present after a pasted image and its request blob, and is
 *          re-armed by the same distance of conversation text
 *   TM-008 TC-PDL-125 transcript evidence found after an image is placed on the measured scale
 *
 * Each test uses its own temporary transcript and its own checkpoint folder (CK_TRANSCRIPT_MEASURE_DIR).
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const measure = require(path.join(HOOKS_DIR, 'lib', 'transcript-measure.cjs'));
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));

const IMAGE = measure.IMAGE_EQUIVALENT_BYTES;
const base64 = bytes => 'A'.repeat(bytes);
const imageBlock = bytes => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64(bytes) } });
const userImageLine = bytes => JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'see this' }, imageBlock(bytes)] } });
const blobLine = bytes => JSON.stringify({ type: 'api-request-blob', sessionId: 's', hash: 'h', message: base64(bytes) });
const textLine = bytes => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'x'.repeat(bytes) }] } });

function withMeasureDir(fn) {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tm-test-')));
    const previous = process.env.CK_TRANSCRIPT_MEASURE_DIR;
    process.env.CK_TRANSCRIPT_MEASURE_DIR = path.join(dir, 'measure');
    measure._resetPruneClock();
    try {
        return fn(dir);
    } finally {
        if (previous === undefined) delete process.env.CK_TRANSCRIPT_MEASURE_DIR;
        else process.env.CK_TRANSCRIPT_MEASURE_DIR = previous;
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const tests = [
    {
        name: '[TM-001] classification: request records excluded whole; images count as their token equivalent at any depth',
        fn: () => {
            const blob = blobLine(5000);
            assert.equal(measure.excludedLineBytes(blob), Buffer.byteLength(blob) + 1, 'a request blob is excluded with its newline');
            for (const type of ['api-request', 'api-request-shape']) {
                const line = JSON.stringify({ type, sessionId: 's', shape: 'y'.repeat(100) });
                assert.equal(measure.excludedLineBytes(line), Buffer.byteLength(line) + 1, type);
            }
            assert.equal(measure.excludedLineBytes(userImageLine(IMAGE + 1000)), 1000, 'only the bytes above the equivalent are excluded');
            assert.equal(measure.excludedLineBytes(userImageLine(100)), 0, 'a small image never counts as less than its bytes');
            const nested = JSON.stringify({
                type: 'user',
                message: { content: [{ type: 'tool_result', tool_use_id: 't', content: [imageBlock(IMAGE + 50), imageBlock(IMAGE + 70)] }] }
            });
            assert.equal(measure.excludedLineBytes(nested), 120, 'images inside a tool result');
            const codex = JSON.stringify({
                type: 'response_item',
                payload: { content: [{ type: 'input_image', image_url: `data:image/png;base64,${base64(IMAGE)}` }] }
            });
            assert.equal(measure.excludedLineBytes(codex), 'data:image/png;base64,'.length, 'a data URL image');
            assert.equal(measure.excludedLineBytes(textLine(500)), 0, 'conversation text counts');
            assert.equal(measure.excludedLineBytes('{"type":"user","message":"the word \\"type\\":\\"image\\" in text'), 0, 'an unparseable line counts');
            const quoted = JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: '{"type":"api-request-blob"}' }] } });
            assert.equal(measure.excludedLineBytes(quoted), 0, 'request-record words inside a message count');
        }
    },
    {
        name: '[TM-002] measured size is the file size minus excluded bytes; text-only transcripts measure their raw size',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'a.jsonl');
                fs.writeFileSync(file, textLine(200) + '\n' + textLine(300) + '\n');
                assert.equal(measure.measuredSize(file), fs.statSync(file).size);
                const image = userImageLine(IMAGE + 400000);
                const blob = blobLine(400000);
                fs.appendFileSync(file, image + '\n' + blob + '\n');
                assert.equal(measure.measuredSize(file), fs.statSync(file).size - 400000 - (Buffer.byteLength(blob) + 1));
                assert.equal(ledger.transcriptSize(file), measure.measuredSize(file), 'the ledger reports the measured size');
                assert.equal(measure.measuredSize(path.join(dir, 'missing.jsonl')), null);
                assert.equal(ledger.transcriptSize(path.join(dir, 'missing.jsonl')), null);
            })
    },
    {
        name: '[TM-003] incremental: a second measure reads only the appended bytes',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'a.jsonl');
                fs.writeFileSync(file, textLine(2000000) + '\n');
                measure.measuredSize(file);
                const appended = textLine(1000) + '\n';
                fs.appendFileSync(file, appended);
                const nativeRead = fs.readSync;
                let bytesRead = 0;
                fs.readSync = (fd, buffer, ...rest) => {
                    const read = nativeRead(fd, buffer, ...rest);
                    bytesRead += read;
                    return read;
                };
                try {
                    assert.equal(measure.measuredSize(file), fs.statSync(file).size);
                } finally {
                    fs.readSync = nativeRead;
                }
                assert.ok(bytesRead <= Buffer.byteLength(appended) + 2 * 64, `read ${bytesRead} bytes for a ${Buffer.byteLength(appended)}-byte append`);
            })
    },
    {
        name: '[TM-004] a partial last line counts in full until it completes',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'a.jsonl');
                const image = userImageLine(IMAGE + 9000);
                fs.writeFileSync(file, textLine(10) + '\n' + image);
                assert.equal(measure.measuredSize(file), fs.statSync(file).size, 'unfinished line counted raw');
                fs.appendFileSync(file, '\n');
                assert.equal(measure.measuredSize(file), fs.statSync(file).size - 9000, 'classified once complete');
            })
    },
    {
        name: '[TM-005] a shorter file, a replaced file and a file rewritten in place are counted again from the start',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'a.jsonl');
                fs.writeFileSync(file, userImageLine(IMAGE + 5000) + '\n');
                assert.equal(measure.measuredSize(file), fs.statSync(file).size - 5000);
                fs.writeFileSync(file, textLine(20) + '\n');
                assert.equal(measure.measuredSize(file), fs.statSync(file).size, 'shorter file recounted');
                // Same inode, same length prefix replaced by different bytes, then grown: the fingerprint no longer matches.
                const longer = textLine(20).replace('x', 'y') + '\n' + userImageLine(IMAGE + 3000) + '\n';
                fs.writeFileSync(file, longer);
                assert.equal(measure.measuredSize(file), fs.statSync(file).size - 3000, 'rewritten in place recounted');
                const replacement = path.join(dir, 'b.jsonl');
                fs.writeFileSync(replacement, textLine(30) + '\n' + userImageLine(IMAGE + 7000) + '\n' + textLine(5) + '\n');
                fs.renameSync(replacement, file);
                assert.equal(measure.measuredSize(file), fs.statSync(file).size - 7000, 'replaced file recounted');
            })
    },
    {
        name: '[TM-006] past the cap counting restarts at the end, so the measure only jumps up',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'a.jsonl');
                const cap = 100000;
                fs.writeFileSync(file, userImageLine(IMAGE + 200000) + '\n');
                const first = measure.measureTranscript(file, { capBytes: cap });
                assert.deepEqual({ base: first.base, offset: first.offset, excluded: first.excluded }, { base: first.size, offset: first.size, excluded: 0 });
                fs.appendFileSync(file, userImageLine(IMAGE + 2000) + '\n');
                const second = measure.measureTranscript(file, { capBytes: cap });
                assert.equal(second.excluded, 2000, 'appends under the cap are classified');
                const before = second.size - second.excluded;
                fs.appendFileSync(file, userImageLine(IMAGE + 300000) + '\n');
                const third = measure.measureTranscript(file, { capBytes: cap });
                assert.equal(third.excluded, 0, 'an append past the cap is not classified');
                assert.ok(third.size - third.excluded > before, 'the measure never goes down past the cap');
            })
    },
    {
        name: '[TM-007] TC-PDL-124 a pasted image and its request blob do not re-arm a delivery; the same distance of text does',
        fn: () =>
            withMeasureDir(dir => {
                const file = path.join(dir, 'main.jsonl');
                fs.writeFileSync(file, textLine(5000) + '\n');
                const settings = { reinjectAfterBytes: 1000000, reinjectAfterMinutes: null, blindReinjectAfterMinutes: null };
                const record = { hash: 'h', deliveredAt: 10, transcriptBytes: ledger.transcriptSize(file), form: 'full' };
                const present = () =>
                    ledger.isPresent(record, 'h', { lastCompactionAt: -Infinity, transcriptSize: ledger.transcriptSize(file), now: 20 }, settings);
                // Observed host shape: the image in the user message, and again inside the host's request blob.
                fs.appendFileSync(file, userImageLine(1400000) + '\n' + blobLine(1400000) + '\n' + textLine(200) + '\n');
                assert.ok(fs.statSync(file).size - record.transcriptBytes > 2 * settings.reinjectAfterBytes, 'raw growth is far past the distance');
                assert.equal(present(), true, 'image bytes do not re-arm');
                fs.appendFileSync(file, textLine(settings.reinjectAfterBytes) + '\n');
                assert.equal(present(), false, 'conversation text re-arms at the distance');
            })
    },
    {
        name: '[TM-008] TC-PDL-125 transcript evidence found after an image is placed on the measured scale',
        fn: () =>
            withMeasureDir(dir => {
                const project = path.join(dir, 'project');
                fs.mkdirSync(path.join(project, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(project, 'docs', 'guide.md'), 'guide body\n');
                const file = path.join(dir, 'main.jsonl');
                const at = new Date(Date.now() - 60000).toISOString();
                const image = userImageLine(IMAGE + 50000) + '\n';
                const request = JSON.stringify({
                    type: 'assistant',
                    timestamp: at,
                    message: { content: [{ type: 'tool_use', id: 'load', name: 'Read', input: { file_path: path.join(project, 'docs', 'guide.md') } }] }
                });
                const result = JSON.stringify({
                    type: 'user',
                    timestamp: at,
                    message: { content: [{ type: 'tool_result', tool_use_id: 'load', content: 'guide body\n' }] }
                });
                fs.writeFileSync(file, image + request + '\n' + result + '\n' + userImageLine(IMAGE + 20000) + '\n');
                const found = ledger.scanEvidence(file, { docs: ['docs/guide.md'] }, { projectDir: project, windowBytes: 8 * 1024 * 1024 });
                const rawResultStart = Buffer.byteLength(image + request + '\n');
                assert.ok(found, 'evidence found');
                assert.equal(found.transcriptBytes, rawResultStart - 50000, 'the earlier image is excluded, the later one is not subtracted');
                const growth = ledger.transcriptSize(file) - found.transcriptBytes;
                assert.equal(
                    growth,
                    Buffer.byteLength(result) + 1 + Buffer.byteLength(userImageLine(IMAGE + 20000)) + 1 - 20000,
                    'growth since the evidence is conversation only'
                );
            })
    }
];

module.exports = {
    name: 'Transcript measure',
    tests
};
