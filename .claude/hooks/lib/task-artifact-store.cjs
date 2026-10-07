'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { LIMITS, KINDS, FOLDERS, ITEM_ID, relativePath } = require('./task-tracking-config.cjs');
const { fail, hash, scopedPath, readBytes, publishBytes } = require('./task-tracking-files.cjs');

const TRACKING_FIELDS = ['schemaVersion', 'revision', 'kind', 'assigneeId', 'collaboratorIds', 'criteria', 'readiness',
    'links', 'memberItemIds', 'groupRole', 'blocker', 'proofs', 'acceptanceHistory', 'history', 'receipts', 'context', 'activity', 'optOut', 'retired', 'health', 'memberProfiles'];
let yaml;
function parser() {
    if (yaml) return yaml;
    try {
        const base = path.resolve(__dirname, '../../skills/task-track/node_modules/yaml');
        if (require(path.join(base, 'package.json')).version !== '2.9.1') fail('MISSING_PARSER', 'Install the pinned task-track dependency');
        yaml = require(base);
        return yaml;
    } catch (error) { fail('MISSING_PARSER', 'Run npm ci --ignore-scripts in the task-track package before tracking operations'); }
}

function mappingField(map, name) {
    return parser().isMap(map) ? map.items.find(pair => parser().isScalar(pair.key) && pair.key.value === name) : undefined;
}

function parseRecord(bytes, ownerPath, kind) {
    if (!Buffer.isBuffer(bytes) || bytes.length > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Record exceeds the byte budget');
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { fail('UNSUPPORTED', 'Record is not valid UTF-8; original bytes preserved'); }
    const opening = /^(?:\uFEFF)?---\r?\n/.exec(text);
    if (!opening) fail('UNSUPPORTED', 'Record has no supported Markdown frontmatter');
    const closing = /^---(?:\r?\n|$)/m.exec(text.slice(opening[0].length));
    if (!closing) fail('UNSUPPORTED', 'Record frontmatter is incomplete');
    const start = opening[0].length;
    const end = start + closing.index;
    const header = text.slice(start, end);
    const y = parser();
    const document = y.parseDocument(header, { uniqueKeys: true, prettyErrors: false });
    if (document.errors.length || document.warnings.length || !y.isMap(document.contents)) fail('UNSUPPORTED', 'Ambiguous or malformed YAML; original bytes preserved');
    let unsupported = false;
    y.visit(document, {
        Node(_key, node) { if (y.isAlias(node) || node.anchor || node.tag) { unsupported = true; return y.visit.BREAK; } },
        Pair(_key, pair) {
            if (!y.isScalar(pair.key) || typeof pair.key.value !== 'string' || pair.key.value === '<<') { unsupported = true; return y.visit.BREAK; }
        }
    });
    if (unsupported) fail('UNSUPPORTED', 'YAML tags, anchors, aliases, merge keys, or complex keys are unsupported');
    const data = document.toJS({ maxAliasCount: 0 });
    if (typeof data.id !== 'string' || !ITEM_ID.test(data.id) || typeof data.title !== 'string' || !data.title.trim()
        || typeof data.status !== 'string') fail('UNSUPPORTED', 'Record identity, title, or recorded status is missing');
    const tracking = data.tracking;
    if (tracking !== undefined && (!tracking || typeof tracking !== 'object' || Array.isArray(tracking)
        || tracking.schemaVersion !== 1 || !Number.isSafeInteger(tracking.revision) || tracking.revision < 1
        || !KINDS.includes(tracking.kind) || (kind && tracking.kind !== kind))) fail('UNSUPPORTED', 'Custom or unsupported tracking metadata is preserved without adoption');
    const newline = header.includes('\r\n') ? '\r\n' : '\n';
    return { id: data.id, kind: tracking?.kind || kind, ownerPath, data, tracking: tracking || null,
        revision: tracking?.revision || 0, contentHash: hash(bytes), bytes, text, header, start, end,
        body: text.slice(end + closing[0].length), document, newline };
}

function valueEdit(header, map, name, value, newline) {
    const pair = mappingField(map, name);
    const encoded = JSON.stringify(value);
    if (encoded === undefined) fail('INVALID_INPUT', 'Undefined metadata values are unsupported');
    if (pair) {
        const range = pair.value?.range;
        if (!range || !Number.isInteger(range[0]) || !Number.isInteger(range[1])) fail('UNSUPPORTED', 'Owned YAML value has no safe replacement range');
        return { start: range[0], end: range[1], value: encoded + (header[range[1] - 1] === '\n' ? newline : '') };
    }
    if (map.flow) {
        const end = map.range[1] - 1;
        if (header[end] !== '}') fail('UNSUPPORTED', 'Flow mapping cannot be safely extended');
        return { start: end, end, value: `${map.items.length ? ', ' : ''}${JSON.stringify(name)}: ${encoded}` };
    }
    const firstKey = map.items[0]?.key?.range?.[0];
    const indent = firstKey === undefined ? '' : header.slice(header.lastIndexOf('\n', firstKey - 1) + 1, firstKey);
    if (!/^ *$/.test(indent)) fail('UNSUPPORTED', 'Mapping indentation cannot be safely extended');
    let end = map.range[1];
    if (end > 0 && header[end - 1] !== '\n') {
        const lineEnd = header.indexOf('\n', end);
        if (lineEnd < 0) return { start: end, end, value: `${newline}${indent}${name}: ${encoded}${newline}` };
        end = lineEnd + 1;
    }
    return { start: end, end, value: `${indent}${name}: ${encoded}${newline}` };
}

/** Patch owned values only. Authored body and every untouched interval remain exact bytes. */
function patchRecord(record, fields, tracking) {
    const edits = [];
    const root = record.document.contents;
    for (const [key, value] of Object.entries(fields)) {
        if (!['title', 'intent', 'status', 'priority', 'assigned_to'].includes(key)) fail('INVALID_INPUT', 'Field is not owned by the tracking writer');
        if (JSON.stringify(record.data[key]) !== JSON.stringify(value)) edits.push(valueEdit(record.header, root, key, value, record.newline));
    }
    const node = mappingField(root, 'tracking')?.value;
    // Retained extensions carry no write authority; only existing equal values pass.
    for (const [key, value] of Object.entries(tracking)) {
        if (!TRACKING_FIELDS.includes(key) && (!record.tracking || !Object.hasOwn(record.tracking, key)
            || stableValue(record.tracking[key]) !== stableValue(value))) fail('INVALID_INPUT', 'Tracking field is not owned');
    }
    if (record.tracking) {
        if (!parser().isMap(node)) fail('UNSUPPORTED', 'Tracking metadata is not a writable mapping');
        for (const [key, value] of Object.entries(tracking)) {
            if (stableValue(record.tracking[key]) !== stableValue(value)) edits.push(valueEdit(record.header, node, key, value, record.newline));
        }
    } else edits.push(valueEdit(record.header, root, 'tracking', tracking, record.newline));
    const combined = [];
    for (const edit of edits.sort((a, b) => a.start - b.start || a.end - b.end)) {
        const previous = combined[combined.length - 1];
        if (previous && previous.start === edit.start && previous.end === edit.end && edit.start === edit.end) previous.value += edit.value;
        else { if (previous && previous.end > edit.start) fail('UNSUPPORTED', 'Overlapping owned fields cannot be safely patched'); combined.push({ ...edit }); }
    }
    let header = record.header;
    for (const edit of combined.reverse()) header = header.slice(0, edit.start) + edit.value + header.slice(edit.end);
    const bytes = Buffer.from(record.text.slice(0, record.start) + header + record.text.slice(record.end), 'utf8');
    const candidate = parseRecord(bytes, record.ownerPath, record.kind);
    if (candidate.body !== record.body) fail('UNSUPPORTED', 'Candidate changed authored body');
    const expected = { ...record.data, ...fields, tracking: { ...(record.tracking || {}), ...tracking } };
    if (JSON.stringify(candidate.data) !== JSON.stringify(expected)) {
        // YAML key order is not authority; compare sorted semantic values.
        if (stableValue(candidate.data) !== stableValue(expected)) fail('UNSUPPORTED', 'Candidate does not preserve the expected record semantics');
    }
    return candidate;
}

function stableValue(value, depth = 0) {
    if (depth > 32) fail('LIMIT_EXCEEDED', 'Metadata nesting exceeds the supported budget');
    if (Array.isArray(value)) return `[${value.map(v => stableValue(v, depth + 1)).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key], depth + 1)}`).join(',')}}`;
    return JSON.stringify(value);
}

function newRecord({ id, kind, title, intent, tracking }, context) {
    if (!ITEM_ID.test(id) || !KINDS.includes(kind)) fail('INVALID_INPUT', 'Invalid item identity or kind');
    const ownerPath = `${context.artifactsRoot}/${FOLDERS[kind]}/${id}.md`;
    const header = { id, title, intent, status: 'draft', tracking };
    const bytes = Buffer.from(`---\n${Object.entries(header).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n`, 'utf8');
    return parseRecord(bytes, ownerPath, kind);
}

function inspectRecords(context) {
    const records = [];
    const diagnostics = [];
    let entries = 0;
    for (const kind of KINDS) {
        const base = `${context.artifactsRoot}/${FOLDERS[kind]}`;
        const pending = [base];
        while (pending.length) {
            const directory = pending.pop();
            let children;
            try { children = fs.readdirSync(scopedPath(context.root, directory), { withFileTypes: true }); }
            catch (error) { if (error.code !== 'ENOENT') diagnostics.push({ path: directory, code: error.code, reason: 'Owner directory cannot be inspected' }); continue; }
            for (const child of children.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
                if (++entries > LIMITS.records * 4) return { records, diagnostics: [...diagnostics, { code: 'LIMIT_EXCEEDED', reason: 'Owner enumeration budget exceeded' }], coverage: 'partial' };
                const ownerPath = `${directory}/${child.name}`;
                if (child.isDirectory()) {
                    if (!(kind === 'pbi' && ownerPath === `${base}/stories`)) pending.push(ownerPath);
                    continue;
                }
                if (!child.name.endsWith('.md')) continue;
                if (records.length >= LIMITS.records) return { records, diagnostics: [...diagnostics, { code: 'LIMIT_EXCEEDED', reason: 'Record count exceeds selected budget' }], coverage: 'partial' };
                try {
                    const bytes = readBytes(context.root, ownerPath);
                    records.push(parseRecord(bytes, ownerPath, kind));
                } catch (error) {
                    // One unreadable or oversize file is disclosed by its path and the rest of the project is still read;
                    // only the two enumeration budgets above end the walk.
                    diagnostics.push({ path: ownerPath, code: error.code || 'IO_FAILURE', reason: error.message });
                }
            }
        }
    }
    const counts = new Map();
    for (const record of records) counts.set(record.id, (counts.get(record.id) || 0) + 1);
    for (const [id, count] of counts) if (count > 1) diagnostics.push({ itemId: id, code: 'DUPLICATE_ID', reason: 'Identity has multiple authoritative homes' });
    return { records, diagnostics, coverage: diagnostics.length ? 'partial' : 'complete' };
}

function saveRecord(context, candidate, expectedHash) {
    if (!relativePath(candidate.ownerPath)) fail('UNSAFE_PATH', 'Invalid owner path');
    return publishBytes(context.root, candidate.ownerPath, candidate.bytes, expectedHash);
}

module.exports = { ITEM_ID, TRACKING_FIELDS, parser, parseRecord, patchRecord, newRecord, inspectRecords, saveRecord, stableValue };
