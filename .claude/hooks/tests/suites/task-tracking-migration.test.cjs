/**
 * Vocabulary migration contract (BR-TPT-30, BR-TPT-02, INV-TPT-08).
 *
 * Migration is one explicit action. It starts only on a project it can migrate completely, previews without changing
 * anything, moves the record locations in a fixed order, rewrites only tracker-owned vocabulary values, conserves every
 * authored byte, identity and progress value, never shows or accepts work from a half-moved project, completes on a
 * repeated run from wherever it stopped, and changes nothing once it has finished.
 *
 * Expected words and locations are spelled out here as test data, independently of the vocabulary owner and of the
 * migration: these cases fail when either one maps a word or a path differently.
 *
 * Portability: every case builds its own temp project. Interruptions are injected at the migration's own checkpoints
 * and a failing folder move by replacing the move call, never by stopping a process. A location is linked with a
 * junction on Windows and a symbolic link elsewhere. Location names are compared the way each disk compares them: a
 * case that depends on whether the disk ignores letter case asks the disk, asserts what holds there, and stands in the
 * other kind of disk by answering the migration's own question the other way. Git not answering is stood in for at
 * the call that starts it. Version control is the fixture's own disposable repository, never this one.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { trackingTest: test, refused, earlierProject, git, EARLIER_WORDS } = require('../lib/task-tracking-fixture.cjs');
const { migrate } = require('../../lib/task-tracking-migration.cjs');
const store = require('../../lib/task-artifact-store.cjs');
const { hash, publishBytes, replaceRootFile } = require('../../lib/task-tracking-files.cjs');
const { withTrackingLock, LOCK_PATH } = require('../../lib/task-tracking-lock.cjs');

const JOURNAL = 'work/.vocabulary-migration.json';
const numbers = snapshot => ({ total: snapshot.metrics.total, accepted: snapshot.metrics.accepted, remaining: snapshot.metrics.remaining, eligibleIds: snapshot.metrics.eligibleIds });
const recorded = project => ({ total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
const codes = snapshot => snapshot.diagnostics.map(finding => finding.code);
const exists = (f, relative) => fs.existsSync(path.join(f.root, relative));
const text = (f, relative) => fs.readFileSync(path.join(f.root, relative), 'utf8');
const journal = f => JSON.parse(text(f, JOURNAL));

// The current word for each earlier word, and the current location of each earlier location, as independent test data.
const invert = table => Object.fromEntries(Object.entries(table).map(([current, earlier]) => [earlier, current]));
const CURRENT_WORD = { kinds: invert(EARLIER_WORDS.kinds), states: invert(EARLIER_WORDS.states), groupRoles: invert(EARLIER_WORDS.groupRoles), linkRoles: invert(EARLIER_WORDS.linkRoles) };
const word = (dimension, value) => (Object.hasOwn(CURRENT_WORD[dimension], value) ? CURRENT_WORD[dimension][value] : value);
const MOVES = [['work/tasks', 'work/subtasks'], ['work/pbis', 'work/tasks'], ['work/ideas', 'work/initiatives'], ['work/epics', 'work/projects']];
// Each stored path is mapped once from its original value, in forward-slash form; a path elsewhere stays as written.
const currentPath = value => {
    const original = value.replace(/\\/g, '/');
    const move = MOVES.find(([from]) => original.startsWith(`${from}/`));
    return move ? move[1] + original.slice(move[0].length) : value;
};
const expectedTracking = tracking => ({ ...tracking, schemaVersion: 2, kind: word('kinds', tracking.kind),
    history: tracking.history.map(entry => ({ ...entry, beforeState: word('states', entry.beforeState), afterState: word('states', entry.afterState) })),
    links: tracking.links.map(link => ({ ...link, relation: word('linkRoles', link.relation), ...(link.path ? { path: currentPath(link.path) } : {}) })),
    receipts: tracking.receipts.map(receipt => ({ ...receipt, result: { ...receipt.result, kind: word('kinds', receipt.result.kind), ownerPath: currentPath(receipt.result.ownerPath) } })),
    ...(typeof tracking.groupRole === 'string' ? { groupRole: word('groupRoles', tracking.groupRole) } : {}) });
/** The whole text a record written by the earlier-project builder must have after migration: one header line per value. */
function expectedText(stored) {
    const end = stored.indexOf('\n---\n');
    const lines = stored.slice(0, end).split('\n').map(line => {
        if (line.startsWith('status: ')) { const state = JSON.parse(line.slice(8)); return word('states', state) === state ? line : `status: ${JSON.stringify(word('states', state))}`; }
        return line.startsWith('tracking: ') ? `tracking: ${JSON.stringify(expectedTracking(JSON.parse(line.slice(10))))}` : line;
    });
    return lines.join('\n') + stored.slice(end);
}

/** Keeps the record root and the configuration as they are now; the returned function puts them back. */
function keep(f) {
    const kept = path.join(f.root, 'kept');
    for (const top of ['work', 'docs']) fs.cpSync(path.join(f.root, top), path.join(kept, top), { recursive: true });
    return () => {
        for (const top of ['work', 'docs']) { fs.rmSync(path.join(f.root, top), { recursive: true, force: true }); fs.cpSync(path.join(kept, top), path.join(f.root, top), { recursive: true }); }
        fs.rmSync(path.join(f.root, 'tmp/task-tracking/deletions'), { recursive: true, force: true });
    };
}

/** An earlier project, the state an uninterrupted migration leaves it in, and a way back to the start. `arrange` adds to the project first. */
async function migratable(f, options, arrange = () => {}) {
    const project = await earlierProject(f, options);
    arrange();
    const restore = keep(f);
    const earlier = f.storedState();
    const checkpoints = [];
    const result = await migrate(f.root, { checkpoint: name => checkpoints.push(name) });
    assert.equal(result.status, 'migrated', JSON.stringify(result));
    const migrated = f.storedState();
    restore();
    assert.deepEqual(f.storedState(), earlier);
    return { project, restore, earlier, migrated, checkpoints };
}

const stopAt = index => { let reached = 0; return () => { if (reached++ === index) throw new Error('simulated interruption'); }; };

/** Nothing is read or saved from a project whose migration is unfinished, and a preview does not describe a second one. */
async function assertUnavailable(f) {
    const stored = f.storedState();
    const snapshot = f.progress();
    assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
    assert.deepEqual(codes(snapshot), ['MIGRATION_IN_PROGRESS']);
    for (const preview of [false, true]) refused(await f.perform('create', 'TASK-during', { title: 'Work during migration', intent: 'Must not be saved' }, preview ? { preview: true } : {}), 'MIGRATION_IN_PROGRESS');
    const dry = await migrate(f.root, { dryRun: true });
    assert.deepEqual([dry.status, dry.code], ['refused', 'MIGRATION_IN_PROGRESS']);
    assert.deepEqual(f.storedState(), stored);
}

/** The progress record never claims more or less than the disk shows, and never settles a step before an earlier one. */
function assertJournalTruth(f) {
    const steps = journal(f).steps;
    const settled = steps.map(step => ['done', 'skipped'].includes(step.status));
    assert.ok(settled.every((value, index) => !value || settled.slice(0, index).every(Boolean)), JSON.stringify(steps));
    for (const step of steps.filter(candidate => candidate.from)) {
        const [source, destination] = [exists(f, step.from), exists(f, step.to)];
        if (step.status === 'pending') assert.ok(source, `${step.id} is recorded as not started but its source is gone`);
        if (step.status === 'started') assert.notEqual(source, destination, `${step.id} is recorded as started but both or neither location exists`);
        if (step.status === 'done') assert.ok(destination, `${step.id} is recorded as done but its destination is missing`);
    }
}

function link(target, location, kind) {
    // Windows junctions need no privilege; a host that still denies them leaves this evidence unavailable there.
    try { fs.symlinkSync(target, location, process.platform === 'win32' ? 'junction' : kind); }
    catch (error) {
        if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) throw new Error(`ENVIRONMENT-BLOCKED: Windows junction fixture unavailable (${error.code})`);
        throw error;
    }
}

const HAND_TRACKED = ['---', 'id: HAND-1', 'title: "Backlog grooming for the pbi list" # authored comment stays', 'intent: Keep the idea of an epic visible',
    'status: backlog', 'owner_note: keep this backlog note', 'tracking:', '  schemaVersion: 1', '  revision: 3', '  kind: pbi', '  custom_extension: { keep: "backlog pbi" }',
    '  history:', '    - { operationId: hand-1, operation: create, actor: owner, at: "2026-01-01T00:00:00.000Z", beforeState: draft, afterState: backlog, reason: "moved to the backlog by hand" }',
    '  links:', "    - { relation: plan, path: 'work\\pbis\\PBI-1.md' }", "    - { relation: plan, path: 'notes\\backlog\\ideas.md' }",
    '---', '# Body about the backlog', 'A pbi, an idea and an epic are mentioned here and stay exactly as written.', ''].join('\n');
const HAND_TRACKED_AFTER = ['---', 'id: HAND-1', 'title: "Backlog grooming for the pbi list" # authored comment stays', 'intent: Keep the idea of an epic visible',
    'status: "planned"', 'owner_note: keep this backlog note', 'tracking:', '  schemaVersion: 2', '  revision: 3', '  kind: "task"', '  custom_extension: { keep: "backlog pbi" }',
    '  history:', '    [{"operationId":"hand-1","operation":"create","actor":"owner","at":"2026-01-01T00:00:00.000Z","beforeState":"draft","afterState":"planned","reason":"moved to the backlog by hand"}]',
    '  links:', '    [{"relation":"plan","path":"work/tasks/PBI-1.md"},{"relation":"plan","path":"notes\\\\backlog\\\\ideas.md"}]',
    '---', '# Body about the backlog', 'A pbi, an idea and an epic are mentioned here and stay exactly as written.', ''].join('\n');
const HAND_UNTRACKED = '---\nid: LEGACY\ntitle: "Hand-written backlog work" # authored comment\nintent: Keep an authored outcome\nstatus: backlog\nowner_note: keep\n---\n# Authored body\nThe backlog is kept exactly.\n';
// As an editor on Windows leaves a record: a byte-order mark, CRLF line endings and block-style tracking metadata.
const HAND_CRLF = ['\uFEFF---', 'id: CR-1', 'title: Windows authored   # keep', 'intent: "Keep CRLF"', 'status: backlog', 'tracking:', '  schemaVersion: 1', '  revision: 2', '  kind: pbi',
    '  history:', '    - operationId: op-a', '      operation: create', '      actor: owner', '      at: "2026-01-01T00:00:00.000Z"', '      beforeState: draft', '      afterState: backlog',
    '  links:', '    - relation: idea', '      itemId: IDEA-D', '  receipts: []', '---', 'Body line 1', 'Body line 2', ''].join('\r\n');
const HAND_CRLF_AFTER = ['\uFEFF---', 'id: CR-1', 'title: Windows authored   # keep', 'intent: "Keep CRLF"', 'status: "planned"', 'tracking:', '  schemaVersion: 2', '  revision: 2', '  kind: "task"',
    '  history:', '    [{"operationId":"op-a","operation":"create","actor":"owner","at":"2026-01-01T00:00:00.000Z","beforeState":"draft","afterState":"planned"}]',
    '  links:', '    [{"relation":"initiative","itemId":"IDEA-D"}]', '  receipts: []', '---', 'Body line 1', 'Body line 2', ''].join('\r\n');
const HAND_UNCHANGED = '﻿---\r\nid: NOTE\r\ntitle: A note about an idea\r\nintent: Keep line endings and the mark\r\nstatus: draft\r\n---\r\nBody with its own line endings.\r\n';
// Hand-formatted on purpose: only the two declared values may change, not the layout around them.
const handConfig = config => `{\n\t"project" : ${JSON.stringify(config.project)},\n  "docsRoots":   ${JSON.stringify(config.docsRoots)},\n\n    "taskTracking": {\n`
    + `      "mode": "linked", "schemaVersion" :  1 ,\n      "groupLabels": { "area": "Area \\"A\\"" ,\n         "initiative":"Bet" },\n`
    + `      "members": ${JSON.stringify(config.taskTracking.members)},\n      "report": ${JSON.stringify(config.taskTracking.report)}\n    }\n}\n\n`;

const STANDING_UNCHANGED = { verificationStale: [], leavingReady: [], newlyBlocked: [] };
const ABANDON = {
    restore: 'restore work and docs/project-config.json from version control or your backup',
    shared: 'in work/tasks, which is also an earlier record location, keep the restored earlier records and remove only what this migration moved in from work/pbis: whatever your version control or backup does not hold there',
    request: 'run migrate --root <checkout> --abandon: it checks that the project is back whole and removes the progress record work/.vocabulary-migration.json itself, and it never removes or moves a folder. Do not remove that file by hand'
};
const STILL_PRESENT = location => `${location} is still present (remove it if this migration created it, or move it out of work if it is yours)`;

const stopAfter = (f, point) => migrate(f.root, { checkpoint: name => { if (name === point) throw new Error('simulated interruption'); } });
/** What a folder held open on Windows, or one a person may not rename, does to the first move. */
async function firstMoveFails(f) {
    const renameSync = fs.renameSync;
    fs.renameSync = (from, to) => {
        if (path.basename(from) === 'tasks' && path.basename(to) === 'subtasks') throw Object.assign(new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`), { code: 'EPERM', syscall: 'rename' });
        return renameSync(from, to);
    };
    try { return await migrate(f.root); } finally { fs.renameSync = renameSync; }
}
// Every kind of place a migration can stop in, by what the progress record and the disk then say.
const STOPPED = [['before any location moved', f => stopAfter(f, 'journal-written')], ['when the first location could not be moved', firstMoveFails],
    ['after a location moved and before that was recorded', f => stopAfter(f, 'moved:move:tasks>subtasks')],
    ['part-way through rewriting the records', f => stopAfter(f, 'record-rewritten')], ['after the declaration was rewritten', f => stopAfter(f, 'config-written')]];
/**
 * What a person does with version control to put the earlier project back. In part: the checkout alone, which leaves
 * what the migration made. Whole: also the folders the migration created and what it moved into the shared location.
 */
function restoreFromGit(f, whole) {
    git(f, ['checkout', '--', 'work', 'docs']);
    if (!whole) return;
    for (const created of ['work/subtasks', 'work/initiatives', 'work/projects']) fs.rmSync(path.join(f.root, created), { recursive: true, force: true });
    git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/tasks']);
}

/**
 * Proofs, readiness and acceptance as an earlier release would have recorded them for the earlier project: each names
 * the linked record where it then was. The builder wrote them while the project stored the current vocabulary.
 */
function recordedInEarlierProject(f, ids) {
    for (const id of ids) {
        const record = f.record(id); const now = f.proof(id);
        const pairs = [...(record.tracking.proofs || []).flatMap(proof => [[proof.criteriaIdentity, now.criteriaIdentity], [proof.sourceIdentity, now.sourceIdentity]]),
            ...(record.tracking.readiness ? [[record.tracking.readiness.criteriaIdentity, now.criteriaIdentity]] : [])];
        let stored = text(f, record.ownerPath);
        for (const [written, current] of pairs) stored = stored.split(written).join(current);
        f.write(record.ownerPath, stored);
    }
}

/** Git answers the migration's question as given here; every other process starts as usual. */
async function withGitAnswer(answer, run) {
    const spawnSync = childProcess.spawnSync;
    childProcess.spawnSync = (command, args, options) => (command === 'git' && args.includes('status') ? answer : spawnSync(command, args, options));
    try { return await run(); } finally { childProcess.spawnSync = spawnSync; }
}

/** The disk answers "is this the same folder under another spelling?" as given, for the migration's own question only. */
async function withDiskIgnoringCase(ignores, run) {
    const statSync = fs.statSync;
    fs.statSync = (target, options) => {
        const name = path.basename(String(target));
        if (!options?.bigint || name !== name.toUpperCase() || name === name.toLowerCase()) return statSync(target, options);
        if (!ignores) throw Object.assign(new Error(`ENOENT: no such file or directory, stat '${target}'`), { code: 'ENOENT', syscall: 'stat' });
        return statSync(path.join(path.dirname(String(target)), name.toLowerCase()), options);
    };
    try { return await run(); } finally { fs.statSync = statSync; }
}

module.exports = { name: 'Task tracking vocabulary migration integration', tests: [
    test('TC-TPT-246', 'migration and its preview refuse each unmet precondition by name, change nothing and leave no progress record', async f => {
        const project = await earlierProject(f);
        const restore = keep(f);
        const stored = f.storedState();
        const recovery = phase => f.write(`tmp/task-tracking/deletions/${hash(`deletion-${phase}`)}.json`, JSON.stringify({ schemaVersion: 1, phase, itemId: project.ids.remaining }));
        const variants = [
            ['an unreadable record', () => f.write('work/pbis/BROKEN.md', 'No frontmatter here.\n'), ['INCOMPLETE_SCOPE'], /Inspection incomplete: work\/pbis\/BROKEN\.md/],
            ['a record already stamped current', () => f.write('work/ideas/STAMPED.md', '---\nid: STAMPED\ntitle: Stamped\nintent: Already current\nstatus: draft\ntracking: {schemaVersion: 2, revision: 1, kind: initiative}\n---\n'), ['INCOMPLETE_SCOPE'], /work\/ideas\/STAMPED\.md is already stamped current/],
            ['an unfinished deletion recovery', () => recovery('prepared'), ['DELETION_RECOVERY_UNFINISHED'], /Deletion recovery unfinished: tmp\/task-tracking\/deletions\//],
            ['an unreadable deletion recovery', () => f.write('tmp/task-tracking/deletions/unreadable.json', '{'), ['DELETION_RECOVERY_UNFINISHED'], /deletions\/unreadable\.json/],
            ['a destination location that holds a record', () => f.write('work/subtasks/STRAY.md', 'stray'), ['DESTINATION_PRESENT', 'MIXED_VOCABULARY'], /Destination already present: work\/subtasks/],
            ['an empty destination location', () => fs.mkdirSync(path.join(f.root, 'work/projects')), ['DESTINATION_PRESENT', 'MIXED_VOCABULARY'], /Destination already present: work\/projects/],
            // Not a record location to any reader, yet the name is taken on every disk.
            ['a file under a destination name', () => f.write('work/initiatives', 'not a folder'), ['DESTINATION_PRESENT'], /Destination already present: work\/initiatives/],
            // The same folder on a disk that ignores letter case, another folder on one that does not: refused on both.
            ['a destination name in another letter case', () => fs.mkdirSync(path.join(f.root, 'work/SubTasks')), null, /Destination already present: work\/subtasks/i],
            // A file is no record location on any disk, so only the comparison of names can find this one.
            ['a file under a destination name in another letter case', () => f.write('work/Projects', 'not a folder'), ['DESTINATION_PRESENT'], /Destination already present: work\/Projects/],
            ['a native record profile', () => { f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'native-tracker' }; f.saveConfig(); }, ['UNPROVED_NATIVE_CAPABILITY'], /portable record profile only/],
            ['two unmet preconditions at once', () => { f.write('work/pbis/BROKEN.md', 'No frontmatter here.\n'); recovery('prepared'); }, ['INCOMPLETE_SCOPE', 'DELETION_RECOVERY_UNFINISHED'], /Inspection incomplete/]
        ];
        for (const [name, arrange, expected, reason] of variants) {
            arrange();
            const before = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await migrate(f.root, { dryRun });
                assert.equal(result.status, 'refused', `${name}: ${JSON.stringify(result)}`);
                if (expected) assert.deepEqual(result.refusals.map(refusal => refusal.code), expected, name);
                else assert.ok(result.refusals.some(refusal => refusal.code === 'DESTINATION_PRESENT'), name);
                assert.equal(result.code, result.refusals[0].code); assert.match(result.refusals.map(refusal => refusal.reason).join('\n'), reason, name);
                assert.ok(!JSON.stringify(result).includes(f.root), `${name}: a refusal names project-relative paths only`);
                assert.deepEqual(f.storedState(), before, `${name}: nothing changed`); assert.ok(!exists(f, JOURNAL), name);
            }
            restore(); f.config.taskTracking = JSON.parse(text(f, 'docs/project-config.json')).taskTracking;
            assert.deepEqual(f.storedState(), stored);
        }
        // Boundary: a deletion whose recovery completed is no obstacle, and the project still reads as it did.
        recovery('complete');
        assert.equal((await migrate(f.root, { dryRun: true })).status, 'preview');
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
        // Once the unmet precondition is resolved the same request proceeds.
        f.write('work/pbis/BROKEN.md', 'No frontmatter here.\n'); assert.equal((await migrate(f.root)).status, 'refused');
        fs.rmSync(path.join(f.root, 'work/pbis/BROKEN.md')); assert.equal((await migrate(f.root)).status, 'migrated');
    }),
    test('TC-TPT-246', 'a record root with uncommitted or untracked files is refused in a Git checkout, and a project outside version control is told it has no restore point', async f => {
        const project = await earlierProject(f, { commit: true });
        const clean = await migrate(f.root, { dryRun: true });
        assert.deepEqual([clean.status, clean.versionControl], ['preview', { kind: 'git', clean: true }]);
        const original = text(f, 'work/pbis/PBI-2.md');
        const dirty = [['work/pbis/PBI-2.md', () => fs.appendFileSync(path.join(f.root, 'work/pbis/PBI-2.md'), 'An uncommitted note.\n'), () => f.write('work/pbis/PBI-2.md', original)],
            ['work/unsaved notes.md', () => f.write('work/unsaved notes.md', 'never committed'), () => fs.rmSync(path.join(f.root, 'work/unsaved notes.md'))]];
        for (const [relative, arrange, undo] of dirty) {
            arrange();
            const before = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await migrate(f.root, { dryRun });
                assert.deepEqual([result.status, result.code], ['refused', 'RECORD_ROOT_NOT_CLEAN'], JSON.stringify(result));
                assert.deepEqual(result.refusals[0].paths, [relative]); assert.ok(result.reason.includes(relative));
                assert.deepEqual(f.storedState(), before); assert.ok(!exists(f, JOURNAL));
            }
            undo();
        }
        // Boundary: an uncommitted file outside the record root is not the migration's concern.
        f.write('docs/unrelated.md', 'uncommitted, elsewhere');
        const result = await migrate(f.root);
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
        assert.equal(git(f, ['status', '--porcelain', '--', 'work']).length > 0, true, 'The migration itself is the only change in the record root');
    }),
    test('TC-TPT-247', 'a preview lists the moves in order, the owned values that would change and the progress to conserve, twice alike, and changes nothing', async f => {
        const project = await earlierProject(f);
        const stored = f.storedState();
        const first = await migrate(f.root, { dryRun: true });
        const second = await migrate(f.root, { dryRun: true });
        assert.deepEqual(second, first);
        assert.equal(first.status, 'preview'); assert.equal(first.dryRun, true); assert.equal(first.recordRoot, 'work');
        assert.deepEqual(first.moves, [{ from: 'work/tasks', to: 'work/subtasks', present: true, records: 1 }, { from: 'work/pbis', to: 'work/tasks', present: true, records: 3 },
            { from: 'work/ideas', to: 'work/initiatives', present: true, records: 1 }, { from: 'work/epics', to: 'work/projects', present: true, records: 1 }]);
        assert.deepEqual(first.records.total, 6); assert.deepEqual(first.records.byKind, { task: 2, subtask: 1, initiative: 1, project: 1, story: 1 });
        const change = id => first.records.changes.find(entry => entry.itemId === id);
        const { ids } = project;
        assert.deepEqual(change(ids.remaining), { itemId: ids.remaining, path: 'work/pbis/PBI-2.md', movedTo: 'work/tasks/PBI-2.md', tracked: true, kind: ['pbi', 'task'],
            state: ['backlog', 'planned'], stamp: [1, 2], historyEntries: 1, links: 0, receipts: 2 });
        assert.deepEqual([change(ids.supporting).kind, change(ids.supporting).movedTo, change(ids.supporting).links], [['task', 'subtask'], 'work/subtasks/TASK-K.md', 5]);
        assert.deepEqual([change(ids.group).kind, change(ids.group).groupRole], [['epic', 'project'], ['initiative', 'program']]);
        assert.deepEqual([change(ids.story).kind, change(ids.story).movedTo], [['story', 'story'], 'work/tasks/stories/STORY-S.md']);
        assert.equal(change(ids.accepted).links, 1); assert.equal(change(ids.accepted).state, undefined);
        assert.deepEqual(first.config, { path: 'docs/project-config.json', changes: [{ field: 'taskTracking.schemaVersion', from: 1, to: 2 }, { field: 'taskTracking.groupLabels', renamedKey: ['initiative', 'program'] }] });
        assert.deepEqual(first.progress, recorded(project));
        // No work here is linked to a record by a spec or source link: nothing loses its verification, and nothing is said to.
        assert.deepEqual(first.currentlyVerified, { before: 1, after: 1 }); assert.deepEqual(first.standing, STANDING_UNCHANGED);
        assert.deepEqual(first.linkPaths.leftAsWritten, []);
        assert.equal(first.versionControl.kind, 'none'); assert.match(first.versionControl.note, /Not a Git checkout.*backup/);
        assert.match(first.preserved, /Authored bodies/); assert.match(first.oneWay, /no reverse action/);
        // A preview states which values change, never what a person wrote.
        assert.ok(!JSON.stringify(first).includes('Export selected rows')); assert.ok(!JSON.stringify(first).includes(f.root));
        assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL)); assert.ok(!exists(f, LOCK_PATH));
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.state, 'earlier');
        refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }), 'MIGRATION_REQUIRED');
        // A record changed after the preview: the run works from what is stored then, not from the preview.
        fs.appendFileSync(path.join(f.root, 'work/pbis/PBI-2.md'), 'Written after the preview.\n');
        assert.equal((await migrate(f.root)).status, 'migrated'); assert.ok(text(f, 'work/tasks/PBI-2.md').endsWith('Written after the preview.\n'));
    }),
    test('TC-TPT-247', 'the preview of an earlier project with no records lists only the declaration change, and of an unconfigured project no declaration change', async f => {
        f.config.taskTracking.schemaVersion = 1; f.saveConfig();
        const empty = await migrate(f.root, { dryRun: true });
        assert.equal(empty.status, 'preview'); assert.deepEqual(empty.records, { total: 0, byKind: {}, changes: [] });
        assert.ok(empty.moves.every(move => move.present === false && move.records === 0));
        assert.deepEqual(empty.config.changes, [{ field: 'taskTracking.schemaVersion', from: 1, to: 2 }]);
        assert.deepEqual(empty.progress, { total: 0, accepted: 0, remaining: 0, eligibleIds: [] });
        assert.ok(!exists(f, 'work'), 'A preview creates no record root');
        const ran = await migrate(f.root);
        assert.deepEqual([ran.status, ran.moves.map(move => move.status), ran.config.status], ['migrated', ['skipped', 'skipped', 'skipped', 'skipped'], 'done']);
        assert.equal(f.context().config.taskTracking.schemaVersion, 2); assert.ok(!exists(f, JOURNAL));
        // Unconfigured: recognised as earlier by a location alone.
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/ideas/NOTE.md', '---\nid: NOTE\ntitle: A captured thought\nintent: Keep it\nstatus: draft\n---\nBody.\n');
        const configured = text(f, 'docs/project-config.json');
        const unconfigured = await migrate(f.root, { dryRun: true });
        assert.deepEqual(unconfigured.config.changes, []); assert.match(unconfigured.config.note, /stays unconfigured/);
        assert.deepEqual(unconfigured.records.changes, [{ itemId: 'NOTE', path: 'work/ideas/NOTE.md', movedTo: 'work/initiatives/NOTE.md', tracked: false, kind: ['idea', 'initiative'] }]);
        assert.equal(text(f, 'docs/project-config.json'), configured);
    }),
    test('TC-TPT-248', 'migration moves the locations in order, rewrites only tracker-owned vocabulary values and conserves every authored byte, identity, name and progress value', async f => {
        const project = await earlierProject(f);
        const { ids } = project;
        // Written as an earlier release and a person would have left them: authored text that itself uses earlier words.
        fs.appendFileSync(path.join(f.root, 'work/pbis/PBI-1.md'), '# Notes\nThis backlog item grew from an idea inside the epic; the pbi wording stays.\n');
        f.write('work/pbis/HAND-1.md', HAND_TRACKED); f.write('work/pbis/LEGACY.md', HAND_UNTRACKED); f.write('work/ideas/NOTE.md', HAND_UNCHANGED);
        f.write('docs/project-config.json', handConfig(f.config));
        const before = f.progress();
        assert.deepEqual(before.metrics.eligibleIds, ['HAND-1', 'LEGACY', ids.accepted, ids.remaining]); assert.equal(before.metrics.accepted, 1);
        const earlierFiles = new Map(f.storedState().filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory').map(([relative]) => [relative, text(f, relative)]));
        const configBefore = text(f, 'docs/project-config.json');
        const reached = [];
        const result = await migrate(f.root, { checkpoint: (name, detail) => {
            reached.push(name);
            // The fixed order is observable on disk: supporting work has left its location before delivery work enters it.
            if (name === 'moved:move:tasks>subtasks') assert.deepEqual([exists(f, 'work/tasks'), exists(f, 'work/subtasks/TASK-K.md'), exists(f, 'work/pbis/PBI-1.md')], [false, true, true]);
            if (name === 'moved:move:pbis>tasks') assert.deepEqual(fs.readdirSync(path.join(f.root, 'work/tasks')).sort(), ['HAND-1.md', 'LEGACY.md', 'PBI-1.md', 'PBI-2.md', 'stories']);
            if (name === 'record-rewritten') assert.ok(detail.count >= 1 && detail.count <= detail.of);
        } });
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.equal(result.resumed, false); assert.equal(result.verified, true);
        // No record here is linked by a spec or source link, so the result reports the verification count the reader showed
        // before and shows after, and names no work whose standing changed.
        assert.deepEqual(result.currentlyVerified, { before: before.metrics.currentlyVerified, after: f.progress().metrics.currentlyVerified });
        assert.equal(result.currentlyVerified.after, result.currentlyVerified.before); assert.deepEqual(result.standing, STANDING_UNCHANGED); assert.deepEqual(result.linkPaths.leftAsWritten, []);
        assert.deepEqual(result.moves, MOVES.map(([from, to]) => ({ from, to, status: 'done' })));
        assert.deepEqual(result.progress, numbers(before)); assert.deepEqual(result.config, { path: 'docs/project-config.json', status: 'done' });
        assert.deepEqual(reached.filter(name => name.startsWith('moved:')), ['moved:move:tasks>subtasks', 'moved:move:pbis>tasks', 'moved:move:ideas>initiatives', 'moved:move:epics>projects']);
        assert.ok(reached.indexOf('records-rewritten') < reached.indexOf('config-written') && reached.indexOf('config-written') < reached.indexOf('verified'), 'The declaration changes after every record, and the progress record goes last');
        // Same records under the same names, each in the current location of its earlier one; nothing else in the record root.
        const after = f.storedState().filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory').map(([relative]) => relative);
        assert.deepEqual(after.sort(), [...earlierFiles.keys()].map(currentPath).sort());
        assert.ok(!exists(f, JOURNAL)); for (const name of ['pbis', 'ideas', 'epics']) assert.ok(!exists(f, `work/${name}`));
        // Whole-file expectation per record: every byte outside a tracker-owned value is the byte that was stored.
        for (const [relative, stored] of earlierFiles) {
            const expected = { 'work/pbis/HAND-1.md': HAND_TRACKED_AFTER, 'work/pbis/LEGACY.md': HAND_UNTRACKED.replace('status: backlog', 'status: "planned"'), 'work/ideas/NOTE.md': HAND_UNCHANGED }[relative] ?? expectedText(stored);
            assert.equal(text(f, currentPath(relative)), expected, relative);
        }
        // Spot checks of what the whole-file comparison proves, in the words of the case.
        const stored = id => f.record(id);
        assert.deepEqual(Object.fromEntries(f.records().map(record => [record.id, record.kind])), { ...project.expected.kinds, 'HAND-1': 'task', LEGACY: 'task', NOTE: 'initiative' });
        assert.deepEqual(f.records().filter(record => record.tracking).map(record => record.tracking.schemaVersion), Array(7).fill(2));
        assert.equal(stored('LEGACY').tracking, null, 'A record without tracking metadata gains none');
        assert.equal(stored(ids.group).tracking.groupRole, 'program'); assert.deepEqual(stored(ids.accepted).tracking.links, [{ relation: 'initiative', itemId: ids.intent }]);
        assert.ok(stored(ids.accepted).tracking.history.some(entry => entry.afterState === 'planned') && !JSON.stringify(stored(ids.accepted).tracking.history).includes('backlog'));
        // A path into the location that moved first and one into the location that took its name, in one record: each mapped once.
        assert.deepEqual(stored(ids.supporting).tracking.links.filter(entry => entry.path).map(entry => entry.path),
            ['work/tasks/PBI-1.md', 'work/subtasks/TASK-K.md', 'work/initiatives/IDEA-D.md', 'work/projects/EPIC-E.md', 'work/tasks/stories/STORY-S.md']);
        for (const entry of stored(ids.supporting).tracking.links.filter(candidate => candidate.path)) assert.ok(exists(f, entry.path), `${entry.path} still resolves`);
        assert.ok(stored(ids.accepted).tracking.receipts.every(receipt => receipt.result.kind === 'task' && receipt.result.ownerPath === 'work/tasks/PBI-1.md'));
        // The declaration: the marker and the renamed label key, and not one other character of a hand-formatted file.
        assert.equal(text(f, 'docs/project-config.json'), configBefore.replace('"schemaVersion" :  1 ,', '"schemaVersion" :  2 ,').replace('"initiative":"Bet"', '"program":"Bet"'));
        // Read back: the same progress in the current words, and the project accepts ordinary saves again.
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), numbers(before)); assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code], ['current', null]);
        assert.deepEqual(codes(snapshot), codes(before)); assert.equal(snapshot.hierarchy.labels.program, 'Bet');
        assert.deepEqual(Object.fromEntries(snapshot.items.filter(item => project.expected.states[item.id]).map(item => [item.id, item.state])), project.expected.states);
        const revision = stored(ids.remaining).revision;
        await f.saved('update', ids.remaining, { title: 'Saved after migration' }); assert.equal(stored(ids.remaining).revision, revision + 1);
        await f.saved('update', ids.supporting, { title: 'Its moved links are still inspectable' });
        await f.create('TASK-after'); assert.ok(exists(f, 'work/tasks/TASK-after.md'));
    }),
    test('TC-TPT-248', 'an unconfigured earlier project is migrated without being enrolled and then reads as current by its locations', async f => {
        const project = await earlierProject(f, { declared: false });
        const config = text(f, 'docs/project-config.json');
        const result = await migrate(f.root);
        assert.deepEqual([result.status, result.config.status], ['migrated', 'skipped'], JSON.stringify(result));
        assert.equal(text(f, 'docs/project-config.json'), config, 'No tracker block is written');
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), recorded(project)); assert.equal(snapshot.enrolled, false);
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared], ['current', false]);
        assert.deepEqual(Object.fromEntries(snapshot.items.map(item => [item.id, item.kind])), project.expected.kinds);
    }),
    test('TC-TPT-248', 'a rewrite that would alter authored content is refused before any location moves', async f => {
        const project = await earlierProject(f);
        const stored = f.storedState();
        const patchRecord = store.patchRecord;
        // The record writer is made to return a candidate whose authored body differs, as a defect in it would.
        store.patchRecord = (record, fields, tracking) => {
            const candidate = patchRecord(record, fields, tracking);
            return record.id === project.ids.remaining ? store.parseRecord(Buffer.concat([candidate.bytes, Buffer.from('altered\n')]), candidate.ownerPath, candidate.kind) : candidate;
        };
        try {
            for (const dryRun of [true, false]) {
                const result = await migrate(f.root, { dryRun });
                assert.deepEqual([result.status, result.code], ['refused', 'RECORD_NOT_REWRITABLE'], JSON.stringify(result));
                assert.deepEqual(result.refusals[0].records.map(record => [record.path, record.itemId]), [['work/pbis/PBI-2.md', project.ids.remaining]]);
                assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
            }
        } finally { store.patchRecord = patchRecord; }
        assert.equal((await migrate(f.root)).status, 'migrated');
    }),
    test('TC-TPT-248', 'a result whose progress differs from the values captured before the first change is reported as failed and its progress record is kept', async f => {
        const project = await earlierProject(f);
        let lost;
        const result = await migrate(f.root, { checkpoint: name => {
            if (name !== 'before-verify') return;
            lost = text(f, 'work/tasks/PBI-2.md'); fs.rmSync(path.join(f.root, 'work/tasks/PBI-2.md'));
        } });
        assert.deepEqual([result.status, result.code], ['failed', 'MIGRATION_VERIFICATION_FAILED'], JSON.stringify(result));
        assert.deepEqual(result.differing, ['total', 'remaining', 'eligibleIds', 'records', 'recordIdentity']);
        assert.deepEqual(result.expected, recorded(project)); assert.deepEqual(result.actual, { total: 1, accepted: 1, remaining: 0, eligibleIds: [project.ids.accepted] });
        assert.match(result.reason, /Migration verification failed.*work\/\.vocabulary-migration\.json is kept/); assert.ok(!result.reason.includes(f.root));
        assert.ok(exists(f, JOURNAL), 'The progress record stays for inspection'); await assertUnavailable(f);
        // Running again does not talk itself into success; putting the lost record back does.
        assert.equal((await migrate(f.root)).status, 'failed'); assert.ok(exists(f, JOURNAL));
        f.write('work/tasks/PBI-2.md', lost);
        const repeated = await migrate(f.root);
        assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true]); assert.deepEqual(repeated.progress, recorded(project)); assert.ok(!exists(f, JOURNAL));
    }),
    test('TC-TPT-249', 'a migration interrupted at any point blocks every read, save and preview, and one repeated run finishes with the uninterrupted result', async f => {
        // One record among the others needs no rewrite: no tracking metadata and a state both vocabularies share.
        const { project, restore, earlier, migrated, checkpoints } = await migratable(f, {}, () => f.write('work/ideas/NOTE.md', HAND_UNCHANGED));
        // Every point the migration reports: after the progress record is written, after and between the location moves,
        // after each record rewrite, after the declaration change and just before the progress record is removed.
        // A record is rewritten once and only when its stored bytes change, so the migration can be stopped after each such
        // record: as many times as record files differ between the earlier project and the migrated one.
        const fileHashes = state => new Map(state.filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory'));
        const rewritten = [...fileHashes(earlier)].filter(([relative, stored]) => fileHashes(migrated).get(currentPath(relative)) !== stored).map(([relative]) => relative);
        assert.ok(rewritten.length > 1 && rewritten.length < fileHashes(earlier).size, 'The fixture holds records that must be rewritten and one that must not');
        assert.ok(!rewritten.includes('work/ideas/NOTE.md'));
        assert.equal(checkpoints.filter(name => name === 'record-rewritten').length, rewritten.length, rewritten.join(', '));
        for (const expected of ['journal-written', 'moved:move:tasks>subtasks', 'recorded:move:tasks>subtasks', 'moved:move:pbis>tasks', 'moved:move:ideas>initiatives', 'moved:move:epics>projects', 'records-rewritten', 'config-written', 'before-verify', 'verified'])
            assert.ok(checkpoints.includes(expected), expected);
        for (let index = 0; index < checkpoints.length; index++) {
            const stopped = await migrate(f.root, { checkpoint: stopAt(index) });
            assert.equal(stopped.status, 'interrupted', `${checkpoints[index]}: ${JSON.stringify(stopped)}`);
            assert.equal(stopped.journal, JOURNAL); assert.match(stopped.reason, /run the tracker migration again/);
            assert.ok(exists(f, JOURNAL), checkpoints[index]); assertJournalTruth(f); await assertUnavailable(f);
            const repeated = await migrate(f.root);
            assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true], `${checkpoints[index]}: ${JSON.stringify(repeated)}`);
            assert.deepEqual(repeated.progress, recorded(project));
            // Byte for byte the uninterrupted result: no step repeated, none skipped, no record rewritten twice.
            assert.deepEqual(f.storedState(), migrated, checkpoints[index]);
            assert.deepEqual(numbers(f.progress()), recorded(project));
            restore();
        }
        // Interrupted again during each repeated run, at every later point in turn, until one run is left alone.
        let runs = 0;
        for (let result = await migrate(f.root, { checkpoint: stopAt(1) }); result.status !== 'migrated'; result = await migrate(f.root, runs < 12 ? { checkpoint: stopAt(1) } : {})) {
            assert.equal(result.status, 'interrupted'); assertJournalTruth(f); await assertUnavailable(f);
            assert.ok(++runs < 20, 'A repeated run makes progress');
        }
        assert.ok(runs >= 5); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a folder move that fails leaves its step unfinished with the cause named, and the repeated run resumes from it', async f => {
        const { project, migrated } = await migratable(f);
        const renameSync = fs.renameSync;
        // What a folder held open on Windows, or one a person may not rename, does to the second move.
        fs.renameSync = (from, to) => {
            if (path.basename(from) === 'pbis' && path.basename(to) === 'tasks') throw Object.assign(new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`), { code: 'EPERM', syscall: 'rename' });
            return renameSync(from, to);
        };
        let stopped;
        try { stopped = await migrate(f.root); } finally { fs.renameSync = renameSync; }
        assert.deepEqual([stopped.status, stopped.code, stopped.step], ['interrupted', 'MOVE_FAILED', 'move:pbis>tasks'], JSON.stringify(stopped));
        assert.match(stopped.reason, /Could not move work\/pbis to work\/tasks \(EPERM\)/); assert.ok(!JSON.stringify(stopped).includes(f.root));
        assert.deepEqual(journal(f).steps.map(step => step.status), ['done', 'started', 'pending', 'pending', 'pending', 'pending', 'pending']);
        assert.deepEqual(['work/subtasks/TASK-K.md', 'work/pbis/PBI-1.md', 'work/tasks', 'work/ideas/IDEA-D.md'].map(relative => exists(f, relative)), [true, true, false, true]);
        assertJournalTruth(f); await assertUnavailable(f);
        const repeated = await migrate(f.root);
        assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true]); assert.deepEqual(repeated.progress, recorded(project));
        assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a destination that appears after the check stops the move without merging into it, and the run finishes once it is gone', async f => {
        const { migrated } = await migratable(f);
        const stopped = await migrate(f.root, { checkpoint: name => { if (name === 'journal-written') f.write('work/subtasks/STRAY.md', 'made by someone else, just now'); } });
        assert.deepEqual([stopped.status, stopped.code, stopped.step], ['interrupted', 'DESTINATION_PRESENT', 'move:tasks>subtasks'], JSON.stringify(stopped));
        assert.deepEqual(fs.readdirSync(path.join(f.root, 'work/subtasks')), ['STRAY.md'], 'Nothing was merged into the foreign folder');
        assert.ok(exists(f, 'work/tasks/TASK-K.md') && exists(f, 'work/pbis/PBI-1.md'));
        // The step is recorded as begun and not as done: both folders exist, so the record claims no move.
        assert.deepEqual(journal(f).steps.map(step => step.status), ['started', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']); await assertUnavailable(f);
        assert.equal((await migrate(f.root)).status, 'interrupted', 'Still refused while the foreign folder is there');
        fs.rmSync(path.join(f.root, 'work/subtasks'), { recursive: true });
        assert.equal((await migrate(f.root)).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a migration waits for the writer lock, so it never moves a location under another tracker writer', async f => {
        const { project, earlier, migrated } = await migratable(f);
        let release;
        const writer = withTrackingLock(f.root, () => new Promise(resolve => { release = resolve; }));
        while (!exists(f, LOCK_PATH)) await new Promise(resolve => setImmediate(resolve));
        let settled = false;
        const pending = migrate(f.root).then(result => { settled = true; return result; });
        // Long enough for an unlocked migration to have finished several times over.
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.equal(settled, false); assert.deepEqual(f.storedState(), earlier); assert.ok(!exists(f, JOURNAL));
        release({}); await writer;
        const result = await pending;
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
        assert.deepEqual(f.storedState(), migrated); assert.ok(!exists(f, LOCK_PATH));
        // A second run that was waiting behind the first finds nothing left to do.
        const both = await Promise.all([migrate(f.root), migrate(f.root)]);
        assert.deepEqual(both.map(entry => entry.status), ['current', 'current']); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'the progress record lives in the record root, holds steps, paths, counts and identities only, and one naming other paths is never acted on', async f => {
        const { project, restore, earlier, migrated } = await migratable(f);
        fs.appendFileSync(path.join(f.root, 'work/pbis/PBI-1.md'), 'A private remark in an authored body.\n');
        let written;
        await migrate(f.root, { checkpoint: name => { if (name === 'journal-written') { written = text(f, JOURNAL); throw new Error('simulated interruption'); } } });
        const value = JSON.parse(written);
        assert.deepEqual(Object.keys(value).sort(), ['capture', 'from', 'kind', 'schemaVersion', 'startedAt', 'steps', 'to']);
        assert.deepEqual([value.kind, value.from, value.to], ['vocabulary-migration', 1, 2]);
        assert.deepEqual(value.steps.map(step => [step.id, step.from, step.to, step.status]), [...MOVES.map(([from, to]) => [`move:${path.basename(from)}>${path.basename(to)}`, from, to, 'pending']),
            ['rewrite', undefined, undefined, 'pending'], ['config', undefined, undefined, 'pending'], ['verify', undefined, undefined, 'pending']]);
        assert.deepEqual({ total: value.capture.total, accepted: value.capture.accepted, remaining: value.capture.remaining, eligibleIds: value.capture.eligibleIds }, recorded(project));
        assert.deepEqual(value.capture.acceptedIds, [project.ids.accepted]); assert.equal(value.capture.records, 6);
        // Standing is kept as identities and marks; the reasons a reader shows are compared from a fresh read and never stored.
        assert.deepEqual(Object.keys(value.capture).sort(), ['accepted', 'acceptedIds', 'currentlyVerified', 'eligibleIds', 'recordIdentity', 'records', 'remaining', 'standing', 'total']);
        assert.deepEqual(Object.keys(value.capture.standing).sort(), ['ready', 'unresolved', 'verified']);
        assert.ok(!written.includes('Prerequisite') && !written.includes('unresolved or not'), 'No reason text is kept');
        for (const content of ['Export selected rows', 'Let an operator export', 'private remark', 'Observed criteria are accepted', f.root]) assert.ok(!written.includes(content), content);
        assert.ok(!exists(f, 'tmp/task-tracking/.vocabulary-migration.json'));
        // A progress record that names another folder as a step is refused whole; nothing it names is touched.
        const before = f.storedState();
        for (const tampered of [{ ...value, steps: value.steps.map((step, index) => (index ? step : { ...step, from: 'docs', to: 'work/subtasks' })) }, { ...value, steps: value.steps.slice(1) }, 'not json']) {
            f.write(JOURNAL, typeof tampered === 'string' ? tampered : JSON.stringify(tampered));
            const state = f.storedState();
            const result = await migrate(f.root);
            assert.deepEqual([result.status, result.code], ['interrupted', 'INVALID_MIGRATION_RECORD'], JSON.stringify(result));
            assert.deepEqual(f.storedState(), state); assert.ok(exists(f, 'docs/project-config.json') && exists(f, 'work/tasks/TASK-K.md'));
        }
        f.write(JOURNAL, written); assert.deepEqual(f.storedState(), before);
        assert.equal((await migrate(f.root)).status, 'migrated');
        restore(); assert.deepEqual(f.storedState(), earlier); assert.equal((await migrate(f.root)).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a linked record location or a linked progress record is refused and never followed', async f => {
        await earlierProject(f);
        const restore = keep(f);
        // A record location that is a link to a folder outside the record root.
        fs.mkdirSync(path.join(f.root, 'elsewhere')); fs.renameSync(path.join(f.root, 'work/ideas'), path.join(f.root, 'elsewhere/ideas'));
        link(path.join(f.root, 'elsewhere/ideas'), path.join(f.root, 'work/ideas'), 'dir');
        const outside = text(f, 'elsewhere/ideas/IDEA-D.md');
        for (const dryRun of [true, false]) {
            const result = await migrate(f.root, { dryRun });
            assert.deepEqual([result.status, result.code], ['refused', 'UNSAFE_PATH'], JSON.stringify(result));
            assert.deepEqual(result.refusals[0].paths, ['work/ideas']); assert.ok(!exists(f, JOURNAL));
            assert.ok(fs.lstatSync(path.join(f.root, 'work/ideas')).isSymbolicLink() && exists(f, 'work/tasks/TASK-K.md') && exists(f, 'work/pbis/PBI-1.md'));
            assert.equal(text(f, 'elsewhere/ideas/IDEA-D.md'), outside);
        }
        fs.rmSync(path.join(f.root, 'work/ideas'), { recursive: true, force: true }); restore();
        // A link where the progress record belongs: nothing is read through it, written through it or moved.
        const stored = f.storedState();
        fs.mkdirSync(path.join(f.root, 'elsewhere/journal'), { recursive: true });
        link(path.join(f.root, 'elsewhere/journal'), path.join(f.root, JOURNAL), 'dir');
        for (const dryRun of [true, false]) {
            const result = await migrate(f.root, { dryRun });
            assert.notEqual(result.status, 'migrated'); assert.notEqual(result.status, 'preview');
            assert.equal(result.code, dryRun ? 'MIGRATION_IN_PROGRESS' : 'UNSAFE_PATH', JSON.stringify(result));
            assert.deepEqual(fs.readdirSync(path.join(f.root, 'elsewhere/journal')), []);
            assert.ok(fs.lstatSync(path.join(f.root, JOURNAL)).isSymbolicLink() && exists(f, 'work/tasks/TASK-K.md') && exists(f, 'work/pbis/PBI-1.md'));
        }
        fs.rmSync(path.join(f.root, JOURNAL), { recursive: true, force: true });
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-248', 'the preview and the result name the work that stops being currently verified, leaves the ready list or is newly held by an unverified prerequisite, and no proof is altered', async f => {
        // Work linked to another record: by a spec link to its identity, and by a source link to its path in a moved folder.
        await f.create('SPEC-X', 'initiative');
        const spec = [{ relation: 'spec', itemId: 'SPEC-X' }];
        await f.create('T2'); await f.saved('link', 'T2', { links: spec }); await f.accepted('T2');
        await f.create('T3'); await f.saved('link', 'T3', { links: spec }); await f.saved('assign', 'T3', { assigneeId: 'owner' }); await f.ready('T3');
        await f.create('T4'); await f.saved('link', 'T4', { links: [{ relation: 'dependency', itemId: 'T2' }] });
        await f.create('T5'); await f.saved('link', 'T5', { links: spec }); await f.verifying('T5'); await f.saved('proof', 'T5', { proof: f.proof('T5') });
        await f.create('T6'); await f.saved('link', 'T6', { links: [{ relation: 'source', path: f.record('SPEC-X').ownerPath }] }); await f.verifying('T6'); await f.saved('proof', 'T6', { proof: f.proof('T6') });
        // Boundary: evidence that neither moves nor is rewritten.
        f.write('docs/requirements.md', 'The export holds exactly the selected rows.\n');
        await f.create('T7'); await f.saved('link', 'T7', { links: [{ relation: 'source', path: 'docs/requirements.md' }] }); await f.verifying('T7'); await f.saved('proof', 'T7', { proof: f.proof('T7') });
        const project = await earlierProject(f);
        recordedInEarlierProject(f, ['T2', 'T3', 'T5', 'T6', 'T7']);
        const verified = snapshot => snapshot.items.filter(item => item.verification.status === 'current').map(item => item.id).sort();
        const before = f.progress();
        assert.deepEqual(verified(before), [project.ids.accepted, 'T2', 'T5', 'T6', 'T7']); assert.deepEqual(before.ready, ['T3']);
        assert.deepEqual(before.items.find(item => item.id === 'T4').prerequisiteReasons, []); assert.equal(before.metrics.currentlyVerified, 2);
        const proofs = Object.fromEntries(['T2', 'T5', 'T6', 'T7'].map(id => [id, JSON.stringify(f.record(id).tracking.proofs)]));
        const stored = f.storedState();
        const expected = { verificationStale: ['T2', 'T5', 'T6'], leavingReady: ['T3'], newlyBlocked: [{ itemId: 'T4', prerequisiteIds: ['T2'] }] };

        const preview = await migrate(f.root, { dryRun: true });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        assert.deepEqual(preview.currentlyVerified, { before: 2, after: 1 });
        assert.deepEqual({ ...preview.standing, note: undefined }, { ...expected, note: undefined });
        assert.equal(preview.standing.note, 'These items need verifying again after migration: a proof names the location and content of the record it was checked against, and that record moves or is rewritten. Migration alters no proof; record a new observation for each named item afterwards');
        // The preview rehearsed the result; it stored nothing, and the delivery numbers it promises to conserve are unaffected.
        assert.deepEqual(f.storedState(), stored); assert.deepEqual(preview.progress, numbers(before));

        const result = await migrate(f.root);
        assert.equal(result.status, 'migrated', JSON.stringify(result));
        assert.deepEqual(result.currentlyVerified, { before: 2, after: 1 });
        assert.deepEqual({ ...result.standing, note: undefined }, { ...expected, note: undefined });
        assert.equal(result.standing.note, 'These items need verifying again: a proof names the location and content of the record it was checked against, and that record moved or was rewritten. No proof was altered; record a new observation for each named item');
        // What was named is what every later read shows.
        const after = f.progress();
        assert.deepEqual(verified(after), [project.ids.accepted, 'T7']); assert.deepEqual(after.ready, []); assert.equal(after.metrics.currentlyVerified, 1);
        assert.deepEqual(after.items.find(item => item.id === 'T4').prerequisiteReasons, ['Prerequisite T2 is unresolved or not currently verified']);
        assert.deepEqual(numbers(after), numbers(before)); assert.equal(after.items.find(item => item.id === 'T2').acceptance.accepted, true);
        // Disclosed, never repaired: every proof is the proof that was recorded.
        for (const [id, recorded] of Object.entries(proofs)) assert.equal(JSON.stringify(f.record(id).tracking.proofs), recorded, id);
        refused(await f.perform('accept', 'T5', { reason: 'Accepted on the earlier observation' }), 'MISSING_PROOF');
        // Verifying again is an ordinary save, and it restores the standing the result named.
        await f.saved('proof', 'T5', { proof: f.proof('T5') }); assert.equal(f.view('T5').verification.status, 'current');
    }),
    test('TC-TPT-248', 'a record with Windows line endings and a byte-order mark is rewritten with both kept and no other byte changed', async f => {
        await earlierProject(f);
        f.write('work/pbis/CR-1.md', HAND_CRLF);
        assert.equal((await migrate(f.root)).status, 'migrated');
        const bytes = fs.readFileSync(path.join(f.root, 'work/tasks/CR-1.md'));
        assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'The byte-order mark is still the first three bytes');
        assert.equal(bytes.toString('utf8'), HAND_CRLF_AFTER);
        assert.equal(/(^|[^\r])\n/.test(bytes.toString('utf8')), false, 'Every line still ends as the record was written');
        assert.deepEqual([f.record('CR-1').kind, f.record('CR-1').data.status, f.record('CR-1').body], ['task', 'planned', 'Body line 1\r\nBody line 2\r\n']);
    }),
    test('TC-TPT-248', 'a project whose configuration sits in the checkout root is migrated, with its declaration replaced whole and nothing else written there', async f => {
        const project = await earlierProject(f);
        const formatted = handConfig(f.config);
        fs.rmSync(path.join(f.root, 'docs/project-config.json')); f.write('project-config.json', formatted);
        f.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'project-config.json' } }));
        assert.equal(f.progress().vocabulary.project.state, 'earlier'); assert.deepEqual(numbers(f.progress()), recorded(project));
        const inRoot = () => fs.readdirSync(f.root).filter(name => name !== 'tmp').sort();
        const names = inRoot();
        const preview = await migrate(f.root, { dryRun: true });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        assert.deepEqual(preview.config, { path: 'project-config.json', changes: [{ field: 'taskTracking.schemaVersion', from: 1, to: 2 }, { field: 'taskTracking.groupLabels', renamedKey: ['initiative', 'program'] }] });
        assert.equal(text(f, 'project-config.json'), formatted);
        // Stopped as soon as the declaration is replaced: the file is whole and current, and the repeated run finishes.
        const stopped = await migrate(f.root, { checkpoint: name => { if (name === 'config-written') throw new Error('simulated interruption'); } });
        assert.equal(stopped.status, 'interrupted', JSON.stringify(stopped));
        const current = formatted.replace('"schemaVersion" :  1 ,', '"schemaVersion" :  2 ,').replace('"initiative":"Bet"', '"program":"Bet"');
        assert.equal(text(f, 'project-config.json'), current); assert.deepEqual(inRoot(), names, 'No temporary file is left beside the configuration');
        const result = await migrate(f.root);
        assert.deepEqual([result.status, result.resumed, result.config], ['migrated', true, { path: 'project-config.json', status: 'done' }], JSON.stringify(result));
        assert.equal(text(f, 'project-config.json'), current); assert.deepEqual(inRoot(), names);
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), recorded(project)); assert.equal(snapshot.vocabulary.project.state, 'current'); assert.equal(snapshot.hierarchy.labels.program, 'Bet');
        // Replacing a root-level file is its own narrow door: one existing file, against the content that was inspected.
        const held = fs.readFileSync(path.join(f.root, 'project-config.json'));
        const unsafe = error => error.code === 'UNSAFE_PATH';
        assert.throws(() => replaceRootFile(f.root, 'docs/unrelated.json', Buffer.from('{}'), hash(held)), unsafe);
        assert.throws(() => replaceRootFile(f.root, 'created.json', Buffer.from('{}'), null), unsafe);
        assert.throws(() => replaceRootFile(f.root, 'project-config.json', Buffer.from('{}'), hash('not what is stored')), error => error.code === 'CONFLICT');
        // The record writer still refuses the checkout root, for a new file and for an existing one.
        assert.throws(() => publishBytes(f.root, 'stray.md', Buffer.from('stray'), null), unsafe);
        assert.throws(() => publishBytes(f.root, 'project-config.json', Buffer.from('{}'), hash(held)), unsafe);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'project-config.json')), held); assert.deepEqual(inRoot(), names);
    }),
    test('TC-TPT-248', 'a stored link path that spells a moved folder in another letter case follows the folder where the disk ignores case, and is left as written and named where it does not', async f => {
        const project = await earlierProject(f);
        const record = 'work/tasks/TASK-K.md';
        f.write(record, text(f, record).replace('"path":"work/pbis/PBI-1.md"', '"path":"work/PBIs/PBI-1.md"'));
        assert.ok(text(f, record).includes('"path":"work/PBIs/PBI-1.md"'));
        const restore = keep(f);
        const elsewhere = ['work/subtasks/TASK-K.md', 'work/initiatives/IDEA-D.md', 'work/projects/EPIC-E.md', 'work/tasks/stories/STORY-S.md'];
        const migrateOn = async ignoresCase => {
            const preview = await migrate(f.root, { dryRun: true });
            const result = await migrate(f.root);
            assert.equal(result.status, 'migrated', JSON.stringify(result));
            const paths = f.record(project.ids.supporting).tracking.links.filter(entry => entry.path).map(entry => entry.path);
            assert.deepEqual(paths.slice(1), elsewhere, 'Every path spelled as its folder is mapped on any disk');
            for (const view of [preview.linkPaths, result.linkPaths]) {
                assert.equal(view.diskIgnoresCase, ignoresCase);
                if (ignoresCase) assert.deepEqual(view, { diskIgnoresCase: true, leftAsWritten: [] });
                else {
                    assert.deepEqual([view.leftAsWritten, view.count], [[{ itemId: project.ids.supporting, path: 'work/PBIs/PBI-1.md' }], 1]);
                    assert.match(view.note, /differ from a moved folder only in letter case.*left exactly as written.*Correct each by hand/);
                }
            }
            // Where the two spellings are one folder the link follows it and still resolves; where they are not, not a character changes.
            assert.equal(paths[0], ignoresCase ? 'work/tasks/PBI-1.md' : 'work/PBIs/PBI-1.md');
            if (ignoresCase) assert.ok(exists(f, paths[0]));
        };
        // What this disk does, asked of the disk and not of the platform name.
        const here = fs.existsSync(path.join(f.root, 'work', 'PBIS'));
        await migrateOn(here);
        restore();
        // The other kind of disk.
        await withDiskIgnoringCase(!here, () => migrateOn(!here));
    }),
    test('TC-TPT-246', 'an uncommitted change to the project configuration that will be rewritten is refused by name', async f => {
        const project = await earlierProject(f, { commit: true });
        const committed = text(f, 'docs/project-config.json');
        f.write('docs/project-config.json', `${committed}\n`);
        const dirty = f.storedState();
        for (const dryRun of [true, false]) {
            const result = await migrate(f.root, { dryRun });
            assert.deepEqual([result.status, result.code, result.refusals[0].paths], ['refused', 'RECORD_ROOT_NOT_CLEAN', ['docs/project-config.json']], JSON.stringify(result));
            assert.match(result.reason, /^Project configuration has uncommitted changes: docs\/project-config\.json; commit or set them aside so version control can restore the earlier records and configuration, then retry$/);
            assert.deepEqual(f.storedState(), dirty); assert.ok(!exists(f, JOURNAL));
        }
        // Both at once: each is named for what it is.
        f.write('work/unsaved.md', 'never committed');
        const both = await migrate(f.root, { dryRun: true });
        assert.deepEqual(both.refusals[0].paths.sort(), ['docs/project-config.json', 'work/unsaved.md']);
        assert.match(both.reason, /^Record root has uncommitted changes: work\/unsaved\.md; Project configuration has uncommitted changes: docs\/project-config\.json; /);
        fs.rmSync(path.join(f.root, 'work/unsaved.md')); f.write('docs/project-config.json', committed);
        const result = await migrate(f.root);
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-246', 'an uncommitted change to a project configuration the migration will not rewrite is not its concern', async f => {
        await earlierProject(f, { declared: false, commit: true });
        f.write('docs/project-config.json', `${text(f, 'docs/project-config.json')}\n`);
        const preview = await migrate(f.root, { dryRun: true });
        assert.deepEqual([preview.status, preview.config.changes, preview.versionControl], ['preview', [], { kind: 'git', clean: true }], JSON.stringify(preview));
    }),
    test('TC-TPT-246', 'when Git cannot say whether the record root is clean the migration is refused with the cause and what resolves it', async f => {
        const project = await earlierProject(f, { commit: true });
        const stored = f.storedState();
        const failure = code => ({ error: Object.assign(new Error(`spawnSync git ${code}`), { code }), status: null, stdout: Buffer.alloc(0) });
        const causes = [['timeout', failure('ETIMEDOUT'), /^Git did not answer within 10 seconds whether the record root is clean; nothing is wrong with the records\. Retry/],
            ['output-limit', failure('ENOBUFS'), /^Git listed more changed, untracked or ignored paths under the record root than can be inspected.*commit them or set them aside/],
            ['git-missing', failure('ENOENT'), /^This is a Git checkout but the git command could not be started.*make git available on the PATH/],
            ['git-failed', { status: 128, stdout: Buffer.alloc(0) }, /^Git could not report whether the record root is clean; run git status in the checkout, repair what it reports/]];
        for (const [cause, answer, reason] of causes) for (const dryRun of [true, false]) {
            const result = await withGitAnswer(answer, () => migrate(f.root, { dryRun }));
            assert.deepEqual([result.status, result.code, result.refusals[0].cause], ['refused', 'VERSION_CONTROL_UNAVAILABLE', cause], JSON.stringify(result));
            assert.match(result.reason, reason, cause); assert.ok(!JSON.stringify(result).includes(f.root));
            assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        }
        // Not stood in for: a checkout whose Git data cannot be found makes the real command fail.
        fs.renameSync(path.join(f.root, '.git'), path.join(f.root, 'git-data-set-aside')); f.write('.git', 'gitdir: ./no-such-git-data\n');
        const unreadable = await migrate(f.root);
        assert.deepEqual([unreadable.status, unreadable.code, unreadable.refusals[0].cause], ['refused', 'VERSION_CONTROL_UNAVAILABLE', 'git-failed'], JSON.stringify(unreadable));
        assert.deepEqual(f.storedState(), stored);
        // Once Git answers, the same request proceeds.
        fs.rmSync(path.join(f.root, '.git')); fs.renameSync(path.join(f.root, 'git-data-set-aside'), path.join(f.root, '.git'));
        const result = await migrate(f.root);
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-246', 'a record root that Git ignores is previewed with a note that version control cannot restore it, and is not called protected', async f => {
        const project = await earlierProject(f);
        f.write('.gitignore', 'work/ideas/\n');
        git(f, ['init']); git(f, ['add', '--', '.gitignore', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project with one ignored location']);
        // One location is ignored: Git reports no change there, and holds nothing to put back.
        const partly = await migrate(f.root, { dryRun: true });
        assert.equal(partly.status, 'preview', JSON.stringify(partly));
        assert.deepEqual([partly.versionControl.kind, partly.versionControl.clean, partly.versionControl.ignored], ['git', true, ['work/ideas/IDEA-D.md']]);
        assert.equal(partly.versionControl.note, 'Git ignores work/ideas/IDEA-D.md: version control cannot restore what it does not track, so keep your own backup of it before migrating');
        // The whole record root is ignored and nothing in it is tracked.
        git(f, ['rm', '-r', '--cached', '--quiet', '--', 'work']); f.write('.gitignore', 'work/\n');
        git(f, ['add', '--', '.gitignore']); git(f, ['commit', '-m', 'Records are kept out of version control']);
        const whole = await migrate(f.root, { dryRun: true });
        assert.deepEqual([whole.status, whole.versionControl.kind, whole.versionControl.clean], ['preview', 'git', true], JSON.stringify(whole));
        assert.ok(whole.versionControl.ignored.length >= 6 && whole.versionControl.ignored.every(relative => relative.startsWith('work/')), JSON.stringify(whole.versionControl));
        assert.match(whole.versionControl.note, /^Git ignores work\/.*version control cannot restore what it does not track, so keep your own backup of it before migrating$/);
        assert.ok(!JSON.stringify(whole).includes(f.root));
        // A note, not a refusal: the person may have their own backup, as outside any checkout.
        const result = await migrate(f.root);
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-249', 'an unfinished migration is abandoned by an explicit request alone: after a restore from version control and the stated steps that request removes only the progress record, and the project reads as the earlier vocabulary again with its original numbers', async f => {
        const project = await earlierProject(f, { commit: true });
        const earlier = f.storedState();
        const readsAsEarlierAgain = () => {
            assert.ok(!exists(f, JOURNAL)); assert.deepEqual(f.storedState(), earlier);
            const snapshot = f.progress();
            assert.deepEqual(numbers(snapshot), recorded(project)); assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code], ['earlier', 'MIGRATION_REQUIRED']);
            assert.equal(git(f, ['status', '--porcelain', '--', 'work', 'docs']), '');
        };
        // The abandon request for a project that is not back whole: refused, with exactly what is not back or still remains.
        const notYet = async pending => {
            const state = f.storedState();
            const result = await migrate(f.root, { abandon: true });
            assert.deepEqual([result.status, result.code, result.journal], ['interrupted', 'RESTORE_INCOMPLETE', JOURNAL], JSON.stringify(result));
            if (Array.isArray(pending)) assert.deepEqual(result.notRestored, pending); else assert.match(result.notRestored.join('; '), pending);
            assert.ok(result.reason.startsWith(`Not abandoned: the project is not back as it was before the migration began: ${result.notRestored.join('; ')}. Nothing was changed: the progress record work/.vocabulary-migration.json is kept and no folder was removed or moved. To abandon this migration instead of completing it: (1) restore work`), result.reason);
            assert.ok(result.reason.endsWith('To complete the migration instead, run migrate --root <checkout> without --abandon'));
            assert.deepEqual(f.storedState(), state, 'A refused abandon request leaves the project exactly as it is'); assert.ok(!JSON.stringify(result).includes(f.root));
            return result;
        };
        // A run without the request on a project restored from outside: neither carried further nor abandoned.
        const neither = async back => {
            const state = f.storedState();
            const result = await migrate(f.root);
            assert.deepEqual([result.status, result.code, result.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', back], JSON.stringify(result));
            assert.ok(result.reason.startsWith(`Restored from outside: back again after this migration changed them: ${back.join(', ')}. Nothing was changed: a run without an abandon request completes a migration and never abandons one, and it does not carry a restored project further. `), result.reason);
            assert.equal(result.abandon.at(-1), ABANDON.request); assert.ok(result.reason.includes(`To abandon this migration instead of completing it: ${result.abandon.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
            assert.deepEqual(f.storedState(), state, 'A restored project is left exactly as it is'); assert.ok(exists(f, JOURNAL)); assert.ok(!JSON.stringify(result).includes(f.root));
            return result;
        };

        // Stopped after two locations moved. The result states the way out, naming only what this migration made.
        const early = await stopAfter(f, 'recorded:move:pbis>tasks');
        assert.equal(early.status, 'interrupted', JSON.stringify(early));
        assert.deepEqual(early.abandon, [ABANDON.restore, 'remove the folder this migration created: work/subtasks', ABANDON.shared, ABANDON.request]);
        assert.ok(early.reason.endsWith(`To abandon this migration instead of completing it: ${early.abandon.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
        assert.ok(!/run the migration again: it recognises/.test(early.reason), 'A repeated run is never offered as the way to abandon');
        // Asked for before anything was put back.
        await notYet(['work/pbis is not back', STILL_PRESENT('work/subtasks')]);
        // Step 1 alone ends nothing: the progress record and what the migration made are not under version control.
        restoreFromGit(f, false);
        await assertUnavailable(f);
        const afterRestore = await notYet([STILL_PRESENT('work/subtasks')]);
        assert.ok(exists(f, 'work/ideas/IDEA-D.md') && !exists(f, 'work/initiatives'), 'No further location was moved');
        // The location both vocabularies use holds the restored earlier records: no step says to remove it.
        assert.deepEqual(afterRestore.abandon, early.abandon); assert.ok(!/remove (the folders? this migration created: )?[^;]*work\/tasks(,|;|$)/.test(afterRestore.reason));
        // Without the request the same project is not abandoned and not migrated further, and is told both ways on.
        const undecided = await neither(['work/pbis']);
        assert.match(undecided.reason, /The earlier project is not back whole: work\/subtasks is still present/);
        assert.deepEqual(undecided.complete, ['remove work/pbis, which the restore put back, after checking that each of its records is also in work/tasks as migrated',
            'in work/tasks remove any earlier record the restore put back: each already sits migrated in work/subtasks', 'run migrate --root <checkout> again']);
        assert.ok(undecided.reason.endsWith(`To complete the migration instead, undo that restore: ${undecided.complete.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
        // Step 2.
        fs.rmSync(path.join(f.root, 'work/subtasks'), { recursive: true });
        // A moved record left beside the restored ones still keeps the project from being taken as restored.
        const leftover = await notYet(/work\/tasks\/PBI-1\.md/);
        assert.deepEqual(leftover.abandon, [ABANDON.restore, ABANDON.shared, ABANDON.request]); assert.ok(exists(f, JOURNAL));
        // Step 3.
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/tasks']);
        // The project is whole again; a preview says so, names the request and still changes nothing.
        const whole = f.storedState();
        const preview = await migrate(f.root, { dryRun: true });
        assert.deepEqual([preview.status, preview.code], ['refused', 'MIGRATION_IN_PROGRESS']);
        assert.match(preview.reason, /the earlier project is back as it was before the migration began\. To end the migration run migrate --root <checkout> --abandon: it removes only the progress record/);
        assert.deepEqual(f.storedState(), whole); assert.equal(f.progress().coverage, 'unavailable');
        // Whole, and still not abandoned by a run that was not asked to: what the person wants is theirs to say.
        const stillThere = await neither(['work/pbis']);
        assert.deepEqual([stillThere.notRestored, stillThere.complete], [[], []]);
        assert.match(stillThere.reason, /The earlier project is back whole\. To abandon this migration.*There is nothing left to complete: to migrate after all, abandon first, then preview and run the migration afresh$/);
        // Last step: the request checks the restore, removes only the progress record and says what it did.
        const first = await migrate(f.root, { abandon: true });
        assert.deepEqual([first.status, first.code, first.progress], ['abandoned', 'MIGRATION_ABANDONED', recorded(project)], JSON.stringify(first));
        readsAsEarlierAgain();

        // Stopped just before verification, with every location moved, every record rewritten and the declaration changed.
        const late = await stopAfter(f, 'before-verify');
        assert.equal(late.status, 'interrupted', JSON.stringify(late));
        assert.deepEqual(late.abandon, [ABANDON.restore, 'remove the folders this migration created: work/subtasks, work/initiatives, work/projects', ABANDON.shared, ABANDON.request]);
        restoreFromGit(f, false);
        await notYet(['work/subtasks', 'work/initiatives', 'work/projects'].map(STILL_PRESENT));
        await neither(['work/pbis', 'work/ideas', 'work/epics', 'the earlier declaration in docs/project-config.json']);
        for (const created of ['work/subtasks', 'work/initiatives', 'work/projects']) fs.rmSync(path.join(f.root, created), { recursive: true });
        await notYet(/work\/tasks\/PBI-1\.md/);
        // What the migration created is gone, so completing is no longer offered as removing what came back.
        const pastCompleting = await neither(['work/pbis', 'work/ideas', 'work/epics', 'the earlier declaration in docs/project-config.json']);
        assert.deepEqual(pastCompleting.complete, []);
        assert.match(pastCompleting.reason, /This migration can no longer be completed from here: work\/initiatives, work\/projects, which it created, is gone\. Abandon it, then preview and run the migration afresh$/);
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/tasks']);
        // Every location is back and nothing is left over, yet the project is not the one the migration started from.
        const held = text(f, 'work/pbis/PBI-2.md'); fs.rmSync(path.join(f.root, 'work/pbis/PBI-2.md'));
        await notYet(/^total, remaining, eligibleIds, records, recordIdentity differ from the values captured before the migration began/);
        f.write('work/pbis/PBI-2.md', held);
        const ended = await migrate(f.root, { abandon: true });
        assert.deepEqual([ended.status, ended.code, ended.progress], ['abandoned', 'MIGRATION_ABANDONED', recorded(project)], JSON.stringify(ended));
        assert.equal(ended.reason, 'Migration abandoned: the earlier record locations and the project configuration are back as they were before the migration began and nothing the migration created remains, so the progress record work/.vocabulary-migration.json was removed. The project stores the earlier vocabulary again and is read-only; preview and run the migration to start over');
        readsAsEarlierAgain();
        // An abandoned migration leaves an ordinary earlier project: it can be previewed and migrated afresh.
        assert.equal((await migrate(f.root, { dryRun: true })).status, 'preview');
        const again = await migrate(f.root);
        assert.deepEqual([again.status, again.resumed, again.progress], ['migrated', false, recorded(project)], JSON.stringify(again));
    }),
    test('TC-TPT-249', 'in every state a migration can stop in, an abandon request ends it exactly when the earlier project is back whole, and a run without that request completes it or stops and never abandons it', async f => {
        const project = await earlierProject(f, { commit: true });
        const reset = keep(f);
        const earlier = f.storedState();
        // What each request answers per state and per how far the project was put back: [without the request, with it].
        const untouched = { 'not restored': ['migrated', 'abandoned'], 'restored in part': ['migrated', 'abandoned'], 'restored whole': ['migrated', 'abandoned'] };
        const changed = { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['RESTORED_FROM_OUTSIDE', 'RESTORE_INCOMPLETE'], 'restored whole': ['RESTORED_FROM_OUTSIDE', 'abandoned'] };
        const expected = { 'before any location moved': untouched, 'when the first location could not be moved': untouched,
            // The move is on disk and not in the progress record: put back, both folders stand, and nothing says whose the new one is.
            'after a location moved and before that was recorded': { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['DESTINATION_PRESENT', 'RESTORE_INCOMPLETE'], 'restored whole': ['migrated', 'abandoned'] },
            'part-way through rewriting the records': changed, 'after the declaration was rewritten': changed };
        assert.deepEqual(Object.keys(expected), STOPPED.map(([name]) => name));
        for (const [state, stop] of STOPPED) for (const [level, outcomes] of Object.entries(expected[state])) for (const [index, options] of [{}, { abandon: true }].entries()) {
            const cell = `${state}, ${level}, ${index ? 'abandon request' : 'no abandon request'}`;
            reset(); assert.deepEqual(f.storedState(), earlier, cell);
            const stopped = await stop(f);
            assert.equal(stopped.status, 'interrupted', `${cell}: ${JSON.stringify(stopped)}`); assert.ok(exists(f, JOURNAL), cell);
            assert.equal(stopped.abandon.at(-1), ABANDON.request, cell); assert.ok(!/run the migration again: it/.test(stopped.reason), cell);
            if (level !== 'not restored') restoreFromGit(f, level === 'restored whole');
            const before = f.storedState();
            const result = await migrate(f.root, options);
            assert.equal(result.status === 'interrupted' ? result.code : result.status, outcomes[index], `${cell}: ${JSON.stringify(result)}`);
            if (result.status === 'abandoned') {
                // Only the progress record went: the project is the earlier one, byte for byte, with its original numbers.
                assert.deepEqual(f.storedState(), earlier, cell); assert.ok(!exists(f, JOURNAL), cell);
                assert.deepEqual(result.progress, recorded(project)); assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
            } else if (result.status === 'migrated') {
                assert.equal(index, 0, 'An abandon request never migrates'); assert.ok(!exists(f, JOURNAL), cell);
                assert.deepEqual(result.progress, recorded(project)); assert.equal(f.progress().vocabulary.project.state, 'current');
            } else {
                assert.deepEqual(f.storedState(), before, `${cell}: nothing changed`); assert.ok(exists(f, JOURNAL), cell);
                assert.equal(result.abandon.at(-1), ABANDON.request, cell); assert.ok(!JSON.stringify(result).includes(f.root), cell);
                assert.equal(f.progress().coverage, 'unavailable', cell);
            }
        }
    }),
    test('TC-TPT-249', 'an abandon request for a project whose records are back but whose declaration is not, or the reverse, is refused, names exactly what is not back and changes nothing', async f => {
        const project = await earlierProject(f, { commit: true });
        const refusedWith = async pending => {
            const state = f.storedState();
            const result = await migrate(f.root, { abandon: true });
            assert.deepEqual([result.status, result.code, result.notRestored], ['interrupted', 'RESTORE_INCOMPLETE', pending], JSON.stringify(result));
            assert.deepEqual(f.storedState(), state); assert.ok(exists(f, JOURNAL));
        };
        // The records are back and nothing the migration made remains, but the declaration still says current.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        const declaredCurrent = text(f, 'docs/project-config.json');
        git(f, ['checkout', '--', 'work']);
        for (const created of ['work/subtasks', 'work/initiatives', 'work/projects']) fs.rmSync(path.join(f.root, created), { recursive: true });
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/tasks']);
        await refusedWith(['docs/project-config.json still declares the current vocabulary']);
        git(f, ['checkout', '--', 'docs']);
        assert.equal((await migrate(f.root, { abandon: true })).status, 'abandoned');
        // The reverse: the declaration is back, the records are where the migration put them.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        git(f, ['checkout', '--', 'docs']);
        await refusedWith(['work/pbis is not back', 'work/ideas is not back', 'work/epics is not back', ...['work/subtasks', 'work/initiatives', 'work/projects'].map(STILL_PRESENT)]);
        // Without the request this project is not migrated further either, and is told how to complete after all.
        const state = f.storedState();
        const undecided = await migrate(f.root);
        assert.deepEqual([undecided.status, undecided.code, undecided.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', ['the earlier declaration in docs/project-config.json']], JSON.stringify(undecided));
        assert.deepEqual(undecided.complete, ['in work/tasks remove any earlier record the restore put back: each already sits migrated in work/subtasks',
            'put the declaration this migration wrote back in docs/project-config.json: set taskTracking.schemaVersion to 2, rename the taskTracking.groupLabels key initiative to program', 'run migrate --root <checkout> again']);
        assert.deepEqual(f.storedState(), state);
        // Doing so completes the migration.
        f.write('docs/project-config.json', declaredCurrent);
        const completed = await migrate(f.root);
        assert.deepEqual([completed.status, completed.resumed, completed.progress], ['migrated', true, recorded(project)], JSON.stringify(completed));
    }),
    test('TC-TPT-249', 'a run without an abandon request that finds an earlier location back names how to complete the migration after all, and completes it once that is undone', async f => {
        const { project, migrated } = await migratable(f);
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        // Someone, or a tool working from an older branch, writes into an earlier location while the migration is unfinished.
        f.write('work/pbis/LATE.md', '---\nid: LATE-1\ntitle: Written late\nintent: Arrived during the migration\nstatus: draft\n---\nBody.\n');
        const state = f.storedState();
        const stopped = await migrate(f.root);
        assert.deepEqual([stopped.status, stopped.code, stopped.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', ['work/pbis']], JSON.stringify(stopped));
        assert.deepEqual(stopped.complete, ['remove work/pbis, which the restore put back, after checking that each of its records is also in work/tasks as migrated',
            'in work/tasks remove any earlier record the restore put back: each already sits migrated in work/subtasks', 'run migrate --root <checkout> again']);
        assert.match(stopped.reason, /To abandon this migration instead of completing it: \(1\) restore work and docs\/project-config\.json.*To complete the migration instead, undo that restore: \(1\) remove work\/pbis/);
        assert.deepEqual(f.storedState(), state); assert.equal(text(f, 'work/pbis/LATE.md').includes('Written late'), true, 'Nothing is removed for the person');
        fs.rmSync(path.join(f.root, 'work/pbis'), { recursive: true });
        const completed = await migrate(f.root);
        assert.deepEqual([completed.status, completed.resumed, completed.progress], ['migrated', true, recorded(project)], JSON.stringify(completed));
        assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'an earlier location that held no record, which version control cannot bring back, does not keep a restored project from being abandoned', async f => {
        await earlierProject(f);
        // An earlier location that exists and holds nothing: Git tracks no empty folder.
        fs.rmSync(path.join(f.root, 'work/epics'), { recursive: true }); fs.mkdirSync(path.join(f.root, 'work/epics'));
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project with an empty location']);
        const before = numbers(f.progress());
        const preview = await migrate(f.root, { dryRun: true });
        assert.deepEqual(preview.moves.at(-1), { from: 'work/epics', to: 'work/projects', present: true, records: 0 }, JSON.stringify(preview));
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        assert.ok(exists(f, 'work/projects') && !exists(f, 'work/epics'));
        restoreFromGit(f, true);
        assert.ok(!exists(f, 'work/epics'), 'Version control did not bring the empty location back');
        const ended = await migrate(f.root, { abandon: true });
        assert.deepEqual([ended.status, ended.code, ended.progress], ['abandoned', 'MIGRATION_ABANDONED', before], JSON.stringify(ended));
        assert.ok(!exists(f, JOURNAL)); assert.deepEqual(numbers(f.progress()), before); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
        // Boundary: a location that held a record is still waited for.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        restoreFromGit(f, true); fs.rmSync(path.join(f.root, 'work/ideas'), { recursive: true });
        const waiting = await migrate(f.root, { abandon: true });
        assert.deepEqual([waiting.code, waiting.notRestored], ['RESTORE_INCOMPLETE', ['work/ideas is not back']], JSON.stringify(waiting));
    }),
    test('TC-TPT-249', 'a progress record that cannot be read or was not written by this migration is never acted on: no repeated run and no abandon request is promised, and the way out is stated as done by hand', async f => {
        const project = await earlierProject(f, { commit: true });
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        const written = text(f, JOURNAL);
        const byHand = ['if a migration was under way here, restore work and docs/project-config.json from version control or your backup, so that the project is whole in one vocabulary',
            'then set work/.vocabulary-migration.json aside by hand: move it out of work and keep it for inspection. The tracker does not check that restore and does not remove that file'];
        const reason = 'Migration progress record work/.vocabulary-migration.json is unreadable or was not written by this migration, so the tracker will not act on it: it neither completes nor abandons a migration from that file, and asking again gives this same answer. '
            + `The project stays unavailable while that file is in work. The way out is by hand: (1) ${byHand[0]}; (2) ${byHand[1]}`;
        const neverActedOn = async () => {
            const state = f.storedState();
            for (const options of [{}, { abandon: true }]) {
                const result = await migrate(f.root, options);
                assert.deepEqual([result.status, result.code, result.abandon], ['interrupted', 'INVALID_MIGRATION_RECORD', byHand], JSON.stringify(result));
                assert.equal(result.reason, reason);
                assert.deepEqual(f.storedState(), state, 'Neither request changes anything');
            }
        };
        // Cut short, empty, and written by something else.
        for (const foreign of [written.slice(0, 200), '{}', JSON.stringify({ ...JSON.parse(written), kind: 'another-tool' })]) { f.write(JOURNAL, foreign); await neverActedOn(); }
        // The same answer once the project is back whole: the file's contents are never trusted, not even to end the migration.
        restoreFromGit(f, true);
        await neverActedOn();
        // Set aside by hand, as stated: the project is an ordinary earlier project again.
        fs.renameSync(path.join(f.root, JOURNAL), path.join(f.root, 'set-aside-progress-record.json'));
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
    }),
    test('TC-TPT-249', 'an abandon request cannot be previewed, and where no migration is unfinished it reports nothing to abandon and changes nothing', async f => {
        const project = await earlierProject(f);
        const nothing = async () => {
            const state = f.storedState();
            const result = await migrate(f.root, { abandon: true });
            assert.deepEqual([result.status, result.code], ['current', 'NOTHING_TO_ABANDON'], JSON.stringify(result));
            assert.equal(result.reason, 'Nothing to abandon: no migration is unfinished in this project (it holds no progress record work/.vocabulary-migration.json). Nothing was changed');
            assert.deepEqual(f.storedState(), state); assert.ok(!exists(f, JOURNAL));
        };
        const both = async () => {
            const state = f.storedState();
            const result = await migrate(f.root, { dryRun: true, abandon: true });
            assert.deepEqual([result.status, result.code], ['refused', 'INVALID_INPUT'], JSON.stringify(result));
            assert.match(result.reason, /^Choose one of a preview and an abandon request/); assert.deepEqual(f.storedState(), state);
        };
        // An earlier project that no migration has touched: the request neither migrates it nor reports it migrated.
        await nothing(); await both();
        assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED'); assert.deepEqual(numbers(f.progress()), recorded(project));
        // An unfinished migration: asking for both at once is still refused and ends nothing.
        assert.equal((await stopAfter(f, 'journal-written')).status, 'interrupted');
        await both(); assert.ok(exists(f, JOURNAL));
        // A finished migration.
        assert.equal((await migrate(f.root)).status, 'migrated');
        await nothing(); await both(); assert.equal(f.progress().vocabulary.project.state, 'current');
    }),
    test('TC-TPT-246', 'a project in a sub-folder of a larger Git checkout has its uncommitted configuration and records named as the project itself names them', async f => {
        await earlierProject(f);
        // The project is the folder `nested` of the checkout; the checkout's own top holds nothing of the tracker.
        const nested = path.join(f.root, 'nested');
        fs.mkdirSync(nested);
        for (const top of ['work', 'docs']) fs.renameSync(path.join(f.root, top), path.join(nested, top));
        f.write('.gitignore', 'nested/work/ideas/\n');
        git(f, ['init']); git(f, ['add', '--', '.gitignore', 'nested']); git(f, ['commit', '-m', 'Earlier project below the top of the checkout']);
        const clean = await migrate(nested, { dryRun: true });
        assert.equal(clean.status, 'preview', JSON.stringify(clean));
        assert.deepEqual([clean.versionControl.kind, clean.versionControl.clean, clean.versionControl.ignored], ['git', true, ['work/ideas/IDEA-D.md']]);
        assert.match(clean.versionControl.note, /^Git ignores work\/ideas\/IDEA-D\.md: /);
        const config = path.join(nested, 'docs/project-config.json');
        const committed = fs.readFileSync(config, 'utf8');
        fs.writeFileSync(config, `${committed}\n`);
        fs.writeFileSync(path.join(nested, 'work/unsaved.md'), 'never committed');
        for (const dryRun of [true, false]) {
            const result = await migrate(nested, { dryRun });
            assert.deepEqual([result.status, result.code], ['refused', 'RECORD_ROOT_NOT_CLEAN'], JSON.stringify(result));
            // Each is named for what it is, by its path in the project, not by its path from the top of the checkout.
            assert.equal(result.reason, 'Record root has uncommitted changes: work/unsaved.md; Project configuration has uncommitted changes: docs/project-config.json; commit or set them aside so version control can restore the earlier records and configuration, then retry');
            assert.deepEqual([...result.refusals[0].paths].sort(), ['docs/project-config.json', 'work/unsaved.md']);
            assert.ok(!JSON.stringify(result).includes('nested/'));
        }
        fs.writeFileSync(config, committed); fs.rmSync(path.join(nested, 'work/unsaved.md'));
        assert.equal((await migrate(nested)).status, 'migrated');
    }),
    test('TC-TPT-249', 'a failed verification states the same way out as an interruption', async f => {
        const project = await earlierProject(f);
        const failed = await migrate(f.root, { checkpoint: name => { if (name === 'before-verify') fs.rmSync(path.join(f.root, 'work/tasks/PBI-2.md')); } });
        assert.deepEqual([failed.status, failed.code], ['failed', 'MIGRATION_VERIFICATION_FAILED'], JSON.stringify(failed));
        assert.deepEqual(failed.abandon, [ABANDON.restore, 'remove the folders this migration created: work/subtasks, work/initiatives, work/projects', ABANDON.shared, ABANDON.request]);
        assert.match(failed.reason, /is kept and the project stays unavailable; correct the difference and run the migration again\. To abandon this migration instead of completing it: \(1\) restore work and docs\/project-config\.json/);
        assert.deepEqual(project.expected.total, failed.expected.total);
    }),
    test('TC-TPT-249', 'a folder someone else put in the way is not named for removal by the way out of the migration', async f => {
        await earlierProject(f);
        const stopped = await migrate(f.root, { checkpoint: name => { if (name === 'journal-written') f.write('work/subtasks/STRAY.md', 'made by someone else, just now'); } });
        assert.deepEqual([stopped.status, stopped.code], ['interrupted', 'DESTINATION_PRESENT'], JSON.stringify(stopped));
        // Nothing has moved yet, so the migration made nothing: the way out is the restore and the progress record.
        assert.deepEqual(stopped.abandon, [ABANDON.restore, ABANDON.request]);
        assert.equal(text(f, 'work/subtasks/STRAY.md'), 'made by someone else, just now');
    }),
    test('TC-TPT-251', 'repeating or previewing a finished migration reports nothing to migrate and changes nothing, however it finished and whatever was saved since', async f => {
        const { project, restore, migrated } = await migratable(f);
        const repeat = async () => {
            const state = f.storedState();
            for (const dryRun of [true, false, false]) {
                const result = await migrate(f.root, { dryRun });
                assert.deepEqual([result.status, result.code], ['current', 'NOTHING_TO_MIGRATE'], JSON.stringify(result)); assert.match(result.reason, /^Nothing to migrate/);
                assert.deepEqual(f.storedState(), state); assert.ok(!exists(f, JOURNAL));
            }
            assert.equal(f.progress().vocabulary.project.state, 'current');
        };
        // Finished in one run.
        assert.equal((await migrate(f.root)).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        await repeat(); assert.deepEqual(numbers(f.progress()), recorded(project));
        // Work saved since then is not touched by a repeat either.
        await f.create('TASK-since'); await f.saved('transition', 'TASK-since', { state: 'planned' });
        const since = text(f, 'work/tasks/TASK-since.md');
        await repeat(); assert.equal(text(f, 'work/tasks/TASK-since.md'), since); assert.equal(f.progress().metrics.total, project.expected.total + 1);
        // Finished by a repeated run after an interruption in the middle of the record rewrites.
        restore();
        assert.equal((await migrate(f.root, { checkpoint: stopAt(11) })).status, 'interrupted');
        // Boundary: unfinished is not "already migrated" — the repeated run completes it.
        assert.equal((await migrate(f.root)).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        await repeat(); assert.deepEqual(numbers(f.progress()), recorded(project));
    }),
    test('TC-TPT-251', 'a project created in the current vocabulary has nothing to migrate', async f => {
        await f.create('TASK-new'); await f.create('INITIATIVE-new', 'initiative');
        const stored = f.storedState();
        for (const dryRun of [true, false]) {
            const result = await migrate(f.root, { dryRun });
            assert.deepEqual([result.status, result.code], ['current', 'NOTHING_TO_MIGRATE']); assert.deepEqual(f.storedState(), stored);
        }
        // A current project that received earlier-vocabulary files is told they are flagged, not migrated.
        f.write('work/pbis/OLD.md', '---\nid: OLD\ntitle: From an older branch\nintent: Flagged\nstatus: draft\ntracking: {schemaVersion: 1, revision: 1, kind: pbi}\n---\n');
        const flagged = await migrate(f.root);
        assert.equal(flagged.status, 'current'); assert.match(flagged.reason, /work\/pbis are flagged and are not migrated/); assert.ok(exists(f, 'work/pbis/OLD.md'));
    })
] };
