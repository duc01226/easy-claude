/**
 * Authored work-record contract.
 *
 * Other skills write initiative, task and story files into the folders the tracker reads. The tracker owns the record
 * shape (`task-track/references/integration-guide.md`, "Records another skill authors"); these cases prove that
 * every template those skills ship still fits it, so a competing status list, a label in `priority` or a
 * hand-written assignee cannot return unnoticed.
 *
 * Portability: reads only files that ship inside the framework folder and writes only to the temp fixture.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test } = require('../lib/task-tracking-fixture.cjs');
const { inspectRecords } = require('../../lib/task-artifact-store.cjs');
const { STATES } = require('../../lib/task-tracking-policy.cjs');

const FRAMEWORK = path.resolve(__dirname, '../../..');
const read = relative => fs.readFileSync(path.join(FRAMEWORK, relative), 'utf8');
const GUIDE = 'skills/task-track/references/integration-guide.md';
const GUIDE_ANCHOR = 'task-track/references/integration-guide.md#records-another-skill-authors';
// The fields `patchRecord` writes for the tracker; an authoring template may not give them another meaning.
const TRACKER_OWNED = ['title', 'intent', 'status', 'priority', 'assigned_to'];

// Every artifact template a skill ships: its source, the heading that introduces a fenced template (none when
// the file is the template), the record kind and the file name the authoring skill uses.
const TEMPLATES = [
    { name: 'initiative template', source: 'docs/team-artifacts/templates/initiative-template.md', kind: 'initiative', file: 'initiatives/261007-po-initiative-sample.md' },
    { name: 'task template', source: 'docs/team-artifacts/templates/task-template.md', kind: 'task', file: 'tasks/261007-task-sample.md' },
    { name: 'user story template', source: 'docs/team-artifacts/templates/user-story-template.md', kind: 'story', file: 'tasks/stories/261007-us-sample.md' },
    { name: 'refine-mode task template', source: 'skills/work-item/references/mode-refine.md', heading: '### Task Template', kind: 'task', file: 'tasks/261007-task-refined-sample.md' },
    { name: 'story-mode template', source: 'skills/work-item/references/mode-story.md', heading: '## Story Artifact Template', kind: 'story', file: 'tasks/stories/261007-us-refined-sample.md' }
];

/** The frontmatter lines of a template: the first `---` pair after the heading, or at the top of the file. */
function frontmatterLines(text, heading) {
    const lines = text.split(/\r?\n/);
    const from = heading ? lines.indexOf(heading) : 0;
    assert.notEqual(from, -1, `Template heading is missing: ${heading}`);
    const open = lines.indexOf('---', from);
    const close = lines.indexOf('---', open + 1);
    assert.ok(open !== -1 && close > open, 'Template frontmatter is missing');
    return lines.slice(open + 1, close);
}

/** Top-level `key: value` pairs as the template states them, comment removed. */
function templateFields(lines) {
    const fields = new Map();
    for (const line of lines) {
        const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)(?:\s+#.*)?$/.exec(line);
        if (match) fields.set(match[1], match[2]);
    }
    return fields;
}

const options = raw => (/^['"]/.test(raw) ? [raw] : raw.split(/\s+\|\s+/));

/** What in a template would make the tracker and the authoring skill disagree about the same field. */
function shapeViolations(lines) {
    const fields = templateFields(lines);
    const found = [];
    for (const key of ['id', 'title', 'intent', 'status']) if (!fields.has(key)) found.push(`${key} is missing`);
    if (fields.has('status')) {
        const states = options(fields.get('status'));
        if (states[0] !== 'draft') found.push(`a generated record starts as draft, not ${states[0]}`);
        for (const state of states) if (!STATES.includes(state)) found.push(`status ${state} is not a tracker state`);
    }
    if (fields.has('priority') && !/^(?:1-999|\{[^}]*\b1-999\b[^}]*\})$/.test(fields.get('priority'))) found.push('priority is not the integer 1-999 the tracker writes');
    for (const key of ['assigned_to', 'tracking']) if (fields.has(key)) found.push(`${key} is written only by the tracker`);
    for (const key of ['sprint', 'story_points']) if (fields.has(key)) found.push(`${key} is not used in new work records`);
    return found;
}

/** A file as the authoring skill would save it: the template's own keys with each placeholder filled. */
function sample(lines, sequence, status) {
    const filled = lines.map(line => {
        const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)(\s+#.*)?$/.exec(line);
        if (!match) return line;
        const key = match[1];
        let value = options(match[2])[0]
            .replace(/\{\s*YYYY-MM-DD\s*\}/g, '2026-10-07').replace(/\{YYMMDD\}/g, '261007').replace(/\{NNN\}/g, String(sequence).padStart(3, '0'));
        if (key === 'status' && status) value = status;
        else if (key === 'priority' && /^(?:1-999|\{[^}]*\b1-999\b[^}]*\})$/.test(value)) value = '3';
        else if (/^\{/.test(value)) value = "'sample'";
        return `${key}: ${value}`;
    });
    return `---\n${filled.join('\n')}\n---\n\n# Sample\n\n## Acceptance Criteria\n\n#### AC-01: First outcome\n\nAuthored body stays as written.\n`;
}

const idOf = text => /^id: (.+)$/m.exec(text)[1];

async function adopt(f, kind, id) {
    const request = f.request('adopt', id, {}, { target: { kind, itemId: id } });
    const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
    assert.equal(preview.primary.status, 'preview', `${id}: ${JSON.stringify(preview.primary)}`);
    const result = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
    assert.equal(result.primary.status, 'saved', `${id}: ${JSON.stringify(result.primary)}`);
}

/** Writes one record per shipped template and returns each template with its saved text and id. */
function writeAll(f) {
    return TEMPLATES.map((template, index) => {
        const text = sample(frontmatterLines(read(template.source), template.heading), index + 1);
        f.write(`work/${template.file}`, text);
        return { ...template, text, id: idOf(text) };
    });
}

module.exports = { name: 'Task tracking authored records integration', tests: [
    { name: 'TC-ARS-001: every shipped initiative, task and story template keeps the tracker-owned fields in the tracker vocabulary',
        fn: () => {
            for (const template of TEMPLATES) {
                assert.deepEqual(shapeViolations(frontmatterLines(read(template.source), template.heading)), [], `${template.name} (${template.source})`);
            }
        } },
    { name: 'TC-ARS-002: a competing status list, a priority label or a hand-written assignee is reported as drift',
        fn: () => {
            const drifted = lines => shapeViolations(['id: TASK-{YYMMDD}-{NNN}', "title: '{Title}'", "intent: '{Outcome}'", ...lines]);
            assert.deepEqual(drifted(['status: draft']), []);
            for (const key of ['sprint', 'story_points']) assert.deepEqual(drifted(['status: draft', `${key}: 1`]), [`${key} is not used in new work records`]);
            assert.deepEqual(drifted(['status: draft', 'delivery_wave: foundation', 'effort_points: 3']), []);
            assert.deepEqual(drifted(['status: draft | refined | ready']), ['status refined is not a tracker state']);
            assert.deepEqual(drifted(['status: planned | ready']), ['a generated record starts as draft, not planned']);
            assert.deepEqual(drifted(['status: draft', "priority: Must Have | Should Have"]), ['priority is not the integer 1-999 the tracker writes']);
            assert.deepEqual(drifted(['status: draft', "assigned_to: '{Name or Unassigned}'"]), ['assigned_to is written only by the tracker']);
            assert.deepEqual(shapeViolations(['id: TASK-1', "title: 'T'", 'status: draft']), ['intent is missing']);
        } },
    test('TC-ARS-003', 'a record written from each shipped template is read without a diagnostic and adopted without loss', async f => {
        const written = writeAll(f);
        const scan = inspectRecords(f.context());
        assert.deepEqual(scan.diagnostics, []); assert.equal(scan.coverage, 'complete');
        assert.deepEqual(scan.records.map(record => record.id).sort(), written.map(item => item.id).sort());
        for (const item of written) {
            const before = f.view(item.id);
            assert.equal(before.kind, item.kind, item.name); assert.equal(before.legacy, true, item.name);
            assert.equal(before.state, 'draft', item.name); assert.equal(before.assigneeId, null, item.name);
            assert.ok(Number.isSafeInteger(before.priority) && before.priority >= 1 && before.priority <= 999, `${item.name}: priority ${before.priority}`);
            assert.ok(before.intent.trim(), `${item.name}: intent`);
            await adopt(f, item.kind, item.id);
            const saved = f.bytes(item.id).toString();
            const header = text => text.slice(0, text.indexOf('\n---\n', 4));
            assert.equal(saved.slice(header(saved).length), item.text.slice(header(item.text).length), `${item.name}: authored body kept`);
            for (const line of header(item.text).split('\n')) assert.ok(header(saved).includes(line), `${item.name}: authored key kept: ${line}`);
            const after = f.view(item.id);
            assert.equal(after.legacy, false, item.name); assert.equal(after.state, 'draft', item.name); assert.equal(after.assigneeId, null, item.name);
            assert.equal(f.record(item.id).tracking.readiness, undefined, `${item.name}: adoption records no readiness`);
        }
        assert.deepEqual(f.progress().diagnostics.filter(entry => entry.path), []);
    }),
    test('TC-ARS-004', 'every state a template offers is one an adopted record may hold', async f => {
        let sequence = 0;
        for (const template of TEMPLATES) {
            const lines = frontmatterLines(read(template.source), template.heading);
            for (const state of options(templateFields(lines).get('status'))) {
                const text = sample(lines, ++sequence, state); const id = idOf(text);
                f.write(`work/${template.file.replace('.md', `-${sequence}.md`)}`, text);
                await adopt(f, template.kind, id);
                assert.equal(f.view(id).state, state, template.name);
            }
        }
    }),
    test('TC-ARS-005', 'the documented hand-off records intent, criteria, priority and links on template-written records without readiness or assignment', async f => {
        const written = writeAll(f);
        const first = kind => written.find(item => item.kind === kind);
        for (const item of written) await adopt(f, item.kind, item.id);
        const task = first('task'); const initiative = first('initiative'); const story = first('story');
        const target = item => ({ target: { kind: item.kind, itemId: item.id } });
        await f.saved('update', task.id, { intent: 'Let an operator export a selected subset', priority: 2,
            criteria: [{ id: 'AC-01', text: 'Export contains exactly the selected rows' }] }, target(task));
        await f.saved('link', task.id, { links: [{ relation: 'initiative', itemId: initiative.id }] }, target(task));
        await f.saved('link', story.id, { links: [{ relation: 'parent', itemId: task.id }] }, target(story));
        await f.saved('transition', task.id, { state: 'planned' }, target(task));
        const view = f.view(task.id);
        assert.equal(view.state, 'planned'); assert.equal(view.priority, 2); assert.deepEqual(view.criteria.map(entry => entry.id), ['AC-01']);
        assert.equal(view.assigneeId, null); assert.equal(f.record(task.id).tracking.readiness, undefined);
        assert.ok(f.bytes(task.id).toString().includes('Authored body stays as written.'));
        assert.equal(inspectRecords(f.context()).coverage, 'complete');
    }),
    { name: 'TC-ARS-006: every skill that writes or orders these records names the tracker reference as the shape owner',
        fn: () => {
            const guide = read(GUIDE);
            // Line endings follow the checkout, so the heading is matched on either form.
            const heading = /\r?\n## Records another skill authors\r?\n/.exec(guide);
            assert.ok(heading, 'the owner section exists');
            const section = guide.slice(heading.index);
            for (const field of [...TRACKER_OWNED, 'tracking']) assert.ok(section.includes(`\`${field}\``), `owner section names ${field}`);
            for (const surface of ['skills/initiative/SKILL.md', 'skills/work-item/SKILL.md', 'skills/work-item/references/mode-refine.md', 'skills/work-item/references/mode-story.md',
                'skills/work-item/references/mode-dor.md', 'skills/prioritize/SKILL.md', 'skills/workflow-initiative-to-task/SKILL.md', 'skills/workflow-spec-to-task/SKILL.md',
                'skills/workflow-initiative-to-spec/SKILL.md']) {
                assert.ok(read(surface).includes(GUIDE_ANCHOR), `${surface} points to the record shape owner`);
            }
            for (const template of TEMPLATES.filter(item => !item.heading)) assert.ok(read(template.source).includes('task-track/references/integration-guide.md'), `${template.source} points to the owner`);
        } },
    test('TC-ARS-007', 'an older record holding a label where the ordering number belongs is ordered last and keeps its authored value', async f => {
        // Real scenario: planned work written before the label moved to its own key. It must still read, and must not sort as a number.
        f.write('work/tasks/older-planned-item.md', '---\nid: TASK-OLDER\ntitle: Older planned item\nintent: Keep older planned work readable\nstatus: draft\npriority: Must Have\nrank: 3\n---\nAuthored body.\n');
        await f.create('TASK-RANKED'); await f.saved('update', 'TASK-RANKED', { priority: 5 });
        const snapshot = f.progress(); assert.equal(snapshot.coverage, 'complete');
        assert.equal(f.view('TASK-OLDER').priority, 999); assert.equal(f.view('TASK-RANKED').priority, 5);
        // The ready list is the tracker's own priority order. By identity alone the older record would come first, so
        // this order holds only when its label reads as the last place and never as a number.
        await adopt(f, 'task', 'TASK-OLDER'); await f.saved('update', 'TASK-OLDER', { criteria: [{ id: 'AC-1', text: 'Older planned work stays readable' }] });
        await f.ready('TASK-OLDER'); await f.ready('TASK-RANKED');
        assert.deepEqual(f.progress().ready, ['TASK-RANKED', 'TASK-OLDER']);
        assert.ok(fs.readFileSync(path.join(f.root, 'work/tasks/older-planned-item.md'), 'utf8').includes('priority: Must Have'));
    }),
    { name: 'TC-ARS-008: skills that read these records find one whatever its file is named, including a record the tracker created',
        fn: () => {
            // A tracker-created record is saved under its identity, without the date prefix the generating skills use.
            const mockup = read('skills/work-item/references/mode-mockup.md');
            assert.ok(mockup.includes('glob `tasks/*.md`'), 'mock-up auto-detect reads every task file in the folder');
            assert.equal(/auto-detect the most recent task: glob `tasks\/\*-task-\*\.md`/.test(mockup), false, 'mock-up auto-detect is not limited to the date-named pattern');
            const accumulation = read('skills/feature-presentation/references/artifact-accumulation.md');
            assert.match(accumulation, /Never skip a record only because its file name lacks the date prefix/);
        } }
] };
