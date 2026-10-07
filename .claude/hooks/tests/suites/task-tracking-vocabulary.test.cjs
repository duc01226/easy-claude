/**
 * Vocabulary contract (BR-TPT-30, INV-TPT-08).
 *
 * A project stores its records in exactly one vocabulary. One written before the current vocabulary is read in the
 * current words with the progress it had, and is read-only until its explicit migration; a project whose vocabulary
 * cannot be settled is refused, never counted; a save request written for the earlier vocabulary is refused, never
 * reinterpreted; and a record that arrives in the earlier vocabulary inside a current project earns no count.
 *
 * Expected earlier words are spelled out here and in the fixture as test data, on purpose: they are the independent
 * record of what earlier releases stored, so these cases fail when the owner's map between the vocabularies is broken.
 *
 * Portability: every case builds its own temp project; location spelling is asserted against what the disk itself does.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, earlierProject, git, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const vocabulary = require('../../lib/task-tracking-vocabulary.cjs');
const { validateTaskTracking } = require('../../lib/task-tracking-config.cjs');
const { inspectRecords, inspectStoredRecords, patchRecord, parseRecord } = require('../../lib/task-artifact-store.cjs');
const { OPERATION_KEYS, operationCatalogue } = require('../../lib/task-tracking.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');
const { hash } = require('../../lib/task-tracking-files.cjs');
const { stableValue } = require('../../lib/task-artifact-store.cjs');

const EARLIER_WORD = /\b(?:pbis?|ideas?|epics?|backlog)\b/i;
const numbers = snapshot => ({ total: snapshot.metrics.total, accepted: snapshot.metrics.accepted, remaining: snapshot.metrics.remaining, eligibleIds: snapshot.metrics.eligibleIds });
const recorded = project => ({ total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
const codes = snapshot => snapshot.diagnostics.map(finding => finding.code);
// A record as an earlier release stored it, written by hand: the tracker never writes these words itself.
const earlierRecord = (id, kind, extra = '') => `---\nid: ${id}\ntitle: Work written before the vocabulary change\nintent: Keep an earlier outcome readable\nstatus: draft\n`
    + `tracking: {schemaVersion: 1, revision: 1, kind: ${kind}${extra}}\n---\nAuthored body stays as written.\n`;
const untracked = id => `---\nid: ${id}\ntitle: Hand-written work\nintent: Keep an authored outcome\nstatus: draft\n---\nAuthored body stays as written.\n`;

/** The project as TC-TPT-242 describes it, shown in the current words. */
function assertCurrentWords(snapshot, project) {
    const { ids } = project;
    const item = id => snapshot.items.find(value => value.id === id);
    assert.deepEqual(Object.fromEntries(snapshot.items.map(value => [value.id, value.kind])), { [ids.accepted]: 'task', [ids.remaining]: 'task',
        [ids.supporting]: 'subtask', [ids.intent]: 'initiative', [ids.story]: 'story', [ids.group]: 'project' });
    assert.equal(item(ids.remaining).state, 'planned'); assert.equal(item(ids.accepted).state, 'done');
    assert.equal(item(ids.group).groupRole, 'program'); assert.deepEqual(item(ids.group).memberItemIds, [ids.accepted, ids.remaining]);
    assert.deepEqual(item(ids.accepted).links, [{ relation: 'initiative', itemId: ids.intent }]);
    assert.ok(item(ids.accepted).history.some(entry => entry.afterState === 'planned') && item(ids.accepted).history.some(entry => entry.beforeState === 'planned'), 'history passed through the planned state');
    assert.equal(item(ids.accepted).acceptance.accepted, true); assert.equal(item(ids.accepted).verification.status, 'current');
    // Every kind, state, purpose, relation and history state shown is a current word; identities and locations keep their stored names.
    const words = snapshot.items.flatMap(value => [value.kind, value.state, value.groupRole, ...value.links.map(link => link.relation),
        ...value.history.flatMap(entry => [entry.beforeState, entry.afterState])]).filter(word => word !== null);
    assert.deepEqual([...new Set(words)].sort(), ['done', 'draft', 'in_progress', 'initiative', 'parent', 'plan', 'planned', 'program', 'project', 'ready', 'story', 'subtask', 'task', 'verifying']);
    assert.deepEqual(snapshot.items.map(value => value.ownerPath).sort(), ['work/epics/EPIC-E.md', 'work/ideas/IDEA-D.md', 'work/pbis/PBI-1.md', 'work/pbis/PBI-2.md', 'work/pbis/stories/STORY-S.md', 'work/tasks/TASK-K.md']);
    assert.equal(snapshot.metrics.unit, 'unique-task');
    assert.deepEqual(numbers(snapshot), recorded(project));
    assert.deepEqual(numbers(snapshot), { total: 2, accepted: 1, remaining: 1, eligibleIds: [ids.accepted, ids.remaining] });
}

module.exports = { name: 'Task tracking vocabulary integration', tests: [
    test('TC-TPT-242', 'an earlier-vocabulary project reads in the current words with the progress it had and nothing is written', async f => {
        const project = await earlierProject(f); const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'complete'); assert.deepEqual(snapshot.diagnostics, []);
        assertCurrentWords(snapshot, project);
        assert.equal(snapshot.metrics.percentage, 50);
        assert.deepEqual(snapshot.scope.eligibleTaskIds, [project.ids.accepted, project.ids.remaining]);
        // The label the project wrote under the earlier purpose key is shown for the current purpose.
        assert.deepEqual(snapshot.hierarchy.labels, { area: 'Area', capability: 'Feature', program: 'Bet' });
        const group = f.progress({ groupId: project.ids.group });
        assert.deepEqual(numbers(group), recorded(project)); assert.deepEqual(group.scope.taskIds, [project.ids.accepted, project.ids.remaining]);
        // The read says the project is read-only and why; the project itself still stores the earlier vocabulary.
        assert.deepEqual(snapshot.vocabulary.project, { state: 'earlier', storedVersion: 1, declared: true, readOnly: true, code: 'MIGRATION_REQUIRED',
            reason: vocabulary.REFUSALS.MIGRATION_REQUIRED, earlierLocations: ['ideas', 'pbis', 'epics'], currentLocations: [] });
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-242', 'a pinned read uses the pinned commit\'s own vocabulary and reports the numbers that commit had', async f => {
        const project = await earlierProject(f, { commit: true });
        const pinned = f.progress({ ref: project.oid });
        assert.equal(pinned.coverage, 'complete'); assertCurrentWords(pinned, project);
        assert.equal(pinned.vocabulary.project.state, 'earlier'); assert.equal(pinned.source.kind, 'shared');
        // The working copy later holds the current vocabulary; the commit made before that is still read by its own marker.
        fs.rmSync(path.join(f.root, 'work'), { recursive: true });
        f.config.taskTracking = { ...f.config.taskTracking, schemaVersion: 2, groupLabels: { program: 'Bet' } }; f.saveConfig();
        await f.create('TASK-new');
        assert.equal(f.progress().vocabulary.project.state, 'current'); assert.equal(f.progress().metrics.total, 1);
        const afterwards = f.progress({ ref: project.oid });
        assertCurrentWords(afterwards, project); assert.equal(afterwards.vocabulary.project.state, 'earlier');
        assert.deepEqual(afterwards.hierarchy.labels, { area: 'Area', capability: 'Feature', program: 'Bet' });
    }),
    test('TC-TPT-242', 'an undeclared project is recognised by an earlier-only location and reads the same numbers locally and pinned', async f => {
        const project = await earlierProject(f, { declared: false, commit: true }); const stored = f.storedState();
        assert.equal(f.context().enrolled, false);
        for (const snapshot of [f.progress(), f.progress({ ref: project.oid })]) {
            assertCurrentWords(snapshot, project);
            assert.equal(snapshot.vocabulary.project.state, 'earlier'); assert.equal(snapshot.vocabulary.project.declared, false);
        }
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-242', 'only the shared supporting-work location cannot show the earlier vocabulary until the project declares it', async f => {
        // Empty earlier project: nothing tracked, read-only, no percentage.
        f.config.taskTracking.schemaVersion = 1; f.saveConfig();
        const empty = f.progress();
        assert.equal(empty.vocabulary.project.state, 'earlier'); assert.equal(empty.metrics.total, 0); assert.equal(empty.metrics.percentage, null); assert.deepEqual(empty.items, []);
        // Undeclared, a hand-written file in the location both vocabularies use reads as the current kind kept there: it
        // carries no earlier mark and sits in no earlier-only location, which is all that can show a record to be earlier.
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/tasks/K-untracked.md', untracked('K-untracked')); f.write('work/tasks/K-tracked.md', earlierRecord('K-tracked', 'task'));
        const undeclared = f.progress();
        assert.equal(undeclared.vocabulary.project.state, 'current'); assert.equal(undeclared.items.find(item => item.id === 'K-untracked').kind, 'task');
        assert.equal(undeclared.metrics.total, 1);
        // A record that carries the earlier stamp is still never counted there.
        assert.deepEqual(undeclared.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD').map(finding => finding.itemId), ['K-tracked']);
        // With the explicit declaration both read as supporting work and earn no delivery credit.
        f.config.taskTracking = { schemaVersion: 1 }; f.saveConfig();
        const declared = f.progress();
        assert.deepEqual(Object.fromEntries(declared.items.map(item => [item.id, item.kind])), { 'K-tracked': 'subtask', 'K-untracked': 'subtask' });
        assert.equal(declared.metrics.total, 0); assert.deepEqual(codes(declared), []);
    }),
    test('TC-TPT-242', 'a location spelled in another letter case is recognised exactly when the disk reads it as the same location', async f => {
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/PBIs/P.md', earlierRecord('P', 'pbi'));
        // Windows and macOS disks usually ignore letter case; Linux disks usually do not. Recognition follows the disk.
        const sameLocation = fs.existsSync(path.join(f.root, 'work', 'pbis'));
        const snapshot = f.progress();
        assert.equal(snapshot.vocabulary.project.state, sameLocation ? 'earlier' : 'current');
        assert.deepEqual(snapshot.items.map(item => [item.id, item.kind]), sameLocation ? [['P', 'task']] : []);
        assert.equal(snapshot.metrics.total, sameLocation ? 1 : 0); assert.deepEqual(codes(snapshot), []);
    }),
    test('TC-TPT-243', 'every save operation and its preview on an earlier-vocabulary project is refused as migration required and changes nothing', async f => {
        const project = await earlierProject(f); const stored = f.storedState(); const before = numbers(f.progress());
        const authority = { canAttest: true, canDelete: true, canDeleteEnded: true, canCorrectState: true };
        assert.deepEqual(Object.keys(OPERATION_KEYS).sort(), ['accept', 'activity', 'adopt', 'assign', 'attest', 'create', 'delete', 'group', 'link', 'proof', 'restore', 'retire', 'transition', 'update']);
        for (const operation of Object.keys(OPERATION_KEYS)) for (const preview of [false, true]) {
            const target = operation === 'create' ? undefined : operation === 'group' ? project.ids.group : project.ids.remaining;
            const patch = operation === 'create' ? { title: 'New work', intent: 'Capture a new outcome' } : operation === 'update' ? { title: 'Changed title' }
                : operation === 'transition' ? { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } } : operation === 'assign' ? { assigneeId: 'peer' } : {};
            const result = await f.perform(operation, target, patch, preview ? { preview: true } : {}, authority);
            refused(result, 'MIGRATION_REQUIRED');
            assert.equal(result.primary.reason, vocabulary.REFUSALS.MIGRATION_REQUIRED); assert.match(result.primary.reason, /migration/i, `${operation} names the next step`);
        }
        // A retry of a save that completed before the upgrade is refused too; no second change.
        const replay = f.record(project.ids.remaining).tracking.receipts.at(-1).operationId;
        refused(await f.perform('transition', project.ids.remaining, { state: 'planned' }, { operationId: replay }), 'MIGRATION_REQUIRED');
        assert.deepEqual(f.storedState(), stored); assert.deepEqual(numbers(f.progress()), before);
    }),
    test('TC-TPT-243', 'an automatic checkpoint on an earlier-vocabulary project is skipped with the same reason and the primary result is kept', async f => {
        const project = await earlierProject(f); f.write('src/export.js', 'export const saved = true;\n');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        assert.equal((await upkeep.linkSession({ ...session, itemIds: [project.ids.remaining] })).status, 'linked');
        const stored = f.storedState(); const primary = { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' };
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary,
            observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.deepEqual(result.primary, primary);
        assert.deepEqual(result.secondary, [{ kind: 'tracking', status: 'skipped', code: 'MIGRATION_REQUIRED', reason: vocabulary.REFUSALS.MIGRATION_REQUIRED }]);
        assert.deepEqual(f.record(project.ids.remaining).tracking.activity, undefined); assert.deepEqual(f.storedState(), stored);
        // Upkeep that is switched off stays silent as before: no migration prompt is forced.
        f.config.taskTracking.mode = 'off'; f.saveConfig();
        const off = await upkeep.checkpoint({ ...session, checkpointId: 'second-checkpoint', primary, observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.deepEqual(off.secondary, [{ kind: 'tracking', status: 'skipped', reason: 'Automatic tracking is off' }]);
    }),
    test('TC-TPT-243', 'the save an earlier-vocabulary project refuses succeeds on a project stored in the current vocabulary', async f => {
        await f.create('TASK-current'); const saved = await f.saved('update', 'TASK-current', { title: 'Changed title' });
        assert.equal(saved.primary.kind, 'task'); assert.equal(f.record('TASK-current').data.title, 'Changed title');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        f.write('src/export.js', 'export const saved = true;\n'); await upkeep.linkSession({ ...session, itemIds: ['TASK-current'] });
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary: { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' },
            observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.equal(result.secondary[0].status, 'saved'); assert.equal(f.record('TASK-current').tracking.activity.length, 1);
    }),
    test('TC-TPT-244', 'an undeclared project holding locations of both vocabularies is refused as mixed and nothing is counted', async f => {
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/pbis/P.md', earlierRecord('P', 'pbi')); f.write('work/subtasks/S.md', untracked('S'));
        const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.equal(snapshot.hierarchy, null); assert.equal(snapshot.scope, null);
        assert.deepEqual(snapshot.items, []); assert.deepEqual(snapshot.ready, []);
        assert.deepEqual(snapshot.vocabulary.project, { state: 'mixed', storedVersion: null, declared: false, readOnly: true, code: 'MIXED_VOCABULARY',
            reason: snapshot.diagnostics[0].reason, earlierLocations: ['pbis'], currentLocations: ['subtasks'] });
        assert.deepEqual(codes(snapshot), ['MIXED_VOCABULARY']);
        // The refusal names the locations found from each vocabulary.
        assert.match(snapshot.diagnostics[0].reason, /^Mixed vocabularies: .*\(earlier: pbis; current: subtasks\)$/);
        assert.equal(f.progress({ groupId: 'P' }).metrics, null);
        for (const preview of [false, true]) refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }, preview ? { preview: true } : {}), 'MIXED_VOCABULARY');
        assert.throws(() => inspectRecords(f.context()), error => error.code === 'MIXED_VOCABULARY');
        assert.deepEqual(f.storedState(), stored);
        // Either family's location present but empty is still mixed.
        fs.rmSync(path.join(f.root, 'work/pbis/P.md')); fs.rmSync(path.join(f.root, 'work/subtasks/S.md'));
        assert.equal(f.progress().vocabulary.project.state, 'mixed'); assert.equal(f.progress().metrics, null);
        // The location both vocabularies use, beside an earlier-only one, is the earlier vocabulary, not a mix.
        fs.rmSync(path.join(f.root, 'work/subtasks'), { recursive: true }); f.write('work/tasks/K.md', earlierRecord('K', 'task')); f.write('work/pbis/P.md', earlierRecord('P', 'pbi'));
        const earlier = f.progress();
        assert.equal(earlier.vocabulary.project.state, 'earlier'); assert.equal(earlier.metrics.total, 1); assert.deepEqual(earlier.metrics.eligibleIds, ['P']);
    }),
    test('TC-TPT-244', 'a project declared as earlier that holds a current-only location is refused as mixed, locally and pinned', async f => {
        const project = await earlierProject(f); f.write('work/projects/G.md', untracked('G'));
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Combined copies']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
            assert.deepEqual(codes(snapshot), ['MIXED_VOCABULARY']);
            assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared, snapshot.vocabulary.project.currentLocations], ['mixed', true, ['projects']]);
        }
        refused(await f.core.executeOperation({ schemaVersion: 2, operation: 'update', operationId: 'edit-in-mixed-project', target: { kind: 'task', itemId: project.ids.remaining },
            actor: { memberId: 'owner' }, patch: { title: 'Changed title' }, expected: { revision: 3, contentHash: 'a'.repeat(64) } }, f.authority()), 'MIXED_VOCABULARY');
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-244', 'one rule settles a project\'s vocabulary from its declaration, its locations and a migration progress record', async () => {
        const settle = (declaredVersion, folderNames, journalPresent = false) => vocabulary.resolveVocabulary({ declaredVersion, folderNames, journalPresent }).state;
        const shared = ['tasks', 'visions'];
        assert.deepEqual([settle(undefined, []), settle(undefined, shared), settle(undefined, ['subtasks']), settle(2, []), settle(2, ['initiatives', 'projects'])], ['current', 'current', 'current', 'current', 'current']);
        assert.deepEqual([settle(undefined, ['pbis']), settle(undefined, ['ideas', ...shared]), settle(undefined, ['epics']), settle(1, []), settle(1, shared), settle(1, ['pbis'])],
            ['earlier', 'earlier', 'earlier', 'earlier', 'earlier', 'earlier']);
        assert.deepEqual([settle(undefined, ['pbis', 'subtasks']), settle(undefined, ['epics', 'projects']), settle(1, ['initiatives']), settle(1, ['pbis', 'subtasks'])], ['mixed', 'mixed', 'mixed', 'mixed']);
        // Declared current, an earlier-only location is a place for flagged records (TC-TPT-250), not a mixed project.
        assert.equal(settle(2, ['pbis', 'subtasks']), 'current');
        for (const [declared, folders] of [[undefined, []], [1, ['pbis']], [2, ['tasks']], [undefined, ['pbis', 'subtasks']]]) assert.equal(settle(declared, folders, true), 'migrating');
        // Names are taken as given: a differently spelled name is a location only where the disk says so (asserted against the disk above).
        assert.equal(settle(undefined, ['PBIs']), 'current');
        // The project marker accepts both vocabularies and nothing else; label keys are the purposes of the declared one.
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 1, groupLabels: { initiative: 'Bet' } } }), []);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 2, groupLabels: { program: 'Bet' } } }), []);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 1, groupLabels: { program: 'Bet' } } }), ['taskTracking.groupLabels.program: unknown field']);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 2, groupLabels: { initiative: 'Bet' } } }), ['taskTracking.groupLabels.initiative: unknown field']);
        for (const version of [0, 3, '2', null]) assert.equal(validateTaskTracking({ taskTracking: { schemaVersion: version } }).length, 1, `marker ${version}`);
    }),
    test('TC-TPT-249', 'while a migration progress record exists every read, save and preview answers migration in progress', async f => {
        const project = await earlierProject(f, { commit: true });
        f.write(vocabulary.journalPath('work'), JSON.stringify({ steps: [] }));
        const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
        assert.deepEqual(codes(snapshot), ['MIGRATION_IN_PROGRESS']);
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code, snapshot.vocabulary.project.reason], ['migrating', 'MIGRATION_IN_PROGRESS', vocabulary.REFUSALS.MIGRATION_IN_PROGRESS]);
        for (const preview of [false, true]) refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }, preview ? { preview: true } : {}), 'MIGRATION_IN_PROGRESS');
        assert.throws(() => inspectRecords(f.context()), error => error.code === 'MIGRATION_IN_PROGRESS');
        // A commit holding the progress record answers the same; the commit made before it still reads.
        git(f, ['add', '--', 'work']); git(f, ['commit', '-m', 'Interrupted migration']);
        assert.deepEqual(codes(f.progress({ ref: 'HEAD' })), ['MIGRATION_IN_PROGRESS']);
        assert.deepEqual(numbers(f.progress({ ref: project.oid })), recorded(project));
        assert.deepEqual(f.storedState(), stored);
        // The stored read stays available to the migration that owns the progress record.
        assert.equal(inspectStoredRecords(f.context(), { version: 1 }).records.length, 6);
    }),
    test('TC-TPT-245', 'a save request written for the earlier vocabulary is refused whole and never carried out under the current meaning', async f => {
        await f.create('T'); assert.equal(f.progress().metrics.total, 1);
        const stored = f.storedState();
        const earlier = (operation, target, patch, extra = {}) => ({ schemaVersion: 1, operation, operationId: `earlier-${operation}-${target.itemId}`, target, actor: { memberId: 'owner' }, patch, ...extra });
        const current = f.record('T'); const expected = { expected: { revision: current.revision, contentHash: current.contentHash } };
        const requests = [
            // "task" asked for supporting work when this request was written; carried out now it would add delivery work.
            earlier('create', { kind: 'task', itemId: 'K' }, { title: 'Supporting work', intent: 'Enable the delivery item' }),
            earlier('create', { kind: 'pbi', itemId: 'P' }, { title: 'Delivery item', intent: 'Deliver an outcome' }),
            earlier('transition', { kind: 'pbi', itemId: 'T' }, { state: 'backlog' }, expected),
            // A request naming only unchanged words is still out of date as a whole.
            earlier('create', { kind: 'story', itemId: 'S' }, { title: 'A story', intent: 'Describe one slice' })];
        for (const request of [...requests, requests[0]]) {
            const result = await f.core.executeOperation(request, f.authority());
            refused(result, 'UNSUPPORTED'); assert.equal(result.primary.reason, vocabulary.REFUSALS.EARLIER_VOCABULARY_REQUEST);
            assert.match(result.primary.reason, /^Request uses the earlier vocabulary/);
            refused(await f.core.executeOperation({ ...request, preview: true }, f.authority()), 'UNSUPPORTED');
        }
        assert.deepEqual(f.storedState(), stored); assert.equal(f.progress().metrics.total, 1); assert.deepEqual(f.progress().items.map(item => item.id), ['T']);
        // The same intent written for the current vocabulary creates one subtask; the total still stays 1.
        const saved = await f.saved('create', 'K', { title: 'Supporting work', intent: 'Enable the delivery item' }, { target: { kind: 'subtask', itemId: 'K' } });
        assert.equal(saved.primary.ownerPath, 'work/subtasks/K.md'); assert.equal(f.progress().metrics.total, 1);
        // A current request naming an earlier word is refused by the ordinary checks, with the prior state unchanged.
        refused(await f.perform('transition', 'T', { state: 'backlog' }), 'INVALID_TRANSITION'); assert.equal(f.view('T').state, 'draft');
        refused(await f.perform('create', 'P', { title: 'Delivery item', intent: 'Deliver an outcome' }, { target: { kind: 'pbi', itemId: 'P' } }), 'INVALID_INPUT');
        refused(await f.perform('link', 'T', { links: [{ relation: 'idea', itemId: 'K' }] }), 'INVALID_RECORD');
        refused(await f.core.executeOperation({ ...f.request('update', 'T', { title: 'Later' }), schemaVersion: 3 }, f.authority()), 'UNSUPPORTED');
    }),
    test('TC-TPT-245', 'a checkpoint request retained from before the vocabulary change is never replayed', async f => {
        await f.create('T'); f.write('src/export.js', 'export const saved = true;\n');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        await upkeep.linkSession({ ...session, itemIds: ['T'] });
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] };
        // The retry state an earlier release left behind for this same checkpoint: a version-1 request naming the earlier kind.
        const operationId = `checkpoint-${hash(stableValue({ sessionId: session.sessionId, producer: session.producer, checkpointId: 'actual-checkpoint', itemId: 'T' })).slice(0, 48)}`;
        const record = f.record('T'); const bytes = f.bytes('T');
        f.write(`tmp/task-tracking/checkpoints/${operationId}.json`, JSON.stringify({ schemaVersion: 1, operation: 'activity', operationId, target: { kind: 'pbi', itemId: 'T' },
            expected: { revision: record.revision, contentHash: record.contentHash }, actor: { memberId: 'owner' }, patch: { observation } }));
        const primary = { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' };
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary, observation });
        assert.deepEqual(result.primary, primary);
        assert.deepEqual(result.secondary.map(entry => [entry.status, entry.code]), [['pending', 'STALE_LINK']]);
        assert.deepEqual(f.bytes('T'), bytes);
        // A new checkpoint for the same work is recorded normally.
        const next = await upkeep.checkpoint({ ...session, checkpointId: 'next-checkpoint', primary, observation });
        assert.equal(next.secondary[0].status, 'saved'); assert.equal(f.record('T').tracking.activity.length, 1);
    }),
    test('TC-TPT-250', 'a record is flagged as earlier exactly when it carries the earlier mark or sits in an earlier-only location, so an unmarked record arriving in the shared tasks location of a declared-current project is counted as a task', async f => {
        // The fixture project declares the current vocabulary.
        assert.equal(f.context().config.taskTracking.schemaVersion, 2);
        await f.create('P1');
        assert.deepEqual(numbers(f.progress()), { total: 1, accepted: 0, remaining: 1, eligibleIds: ['P1'] });
        // An older branch brings three hand-written files.
        f.write('work/tasks/K-marked.md', earlierRecord('K-marked', 'task'));   // the earlier mark, in the location both vocabularies use
        f.write('work/pbis/P-unmarked.md', untracked('P-unmarked'));            // no mark, in a location only the earlier vocabulary used
        f.write('work/tasks/K-unmarked.md', untracked('K-unmarked'));           // no mark, in the location both vocabularies use
        const snapshot = f.progress();
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared], ['current', true]);
        // The mark or the location is what shows a record to be earlier: those two are flagged and never counted.
        assert.deepEqual(snapshot.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD').map(finding => [finding.itemId, finding.path]).sort(),
            [['K-marked', 'work/tasks/K-marked.md'], ['P-unmarked', 'work/pbis/P-unmarked.md']]);
        // Nothing shows the third to be earlier. It is read as what its location now holds, a task, and counted: the rule
        // flags by evidence, and an unmarked file among the tasks carries none. This is the stated limit of the rule.
        assert.deepEqual(snapshot.items.map(item => [item.id, item.kind]).sort(), [['K-unmarked', 'task'], ['P1', 'task']]);
        assert.deepEqual(numbers(snapshot), { total: 2, accepted: 0, remaining: 2, eligibleIds: ['K-unmarked', 'P1'] });
        assert.equal(snapshot.diagnostics.some(finding => finding.itemId === 'K-unmarked'), false);
    }),
    test('TC-TPT-250', 'an earlier-vocabulary record arriving in a current project is flagged, left out of every count and makes coverage incomplete', async f => {
        await f.create('P1'); await f.accepted('P1'); await f.create('P2');
        const before = f.progress(); assert.equal(before.coverage, 'complete'); assert.equal(before.metrics.percentage, 50);
        const views = JSON.stringify(before.items);
        // An older branch brings supporting work to where tasks are now kept, and a delivery item to an earlier-only location.
        f.write('work/tasks/K2.md', earlierRecord('K2', 'task')); f.write('work/pbis/P3.md', earlierRecord('P3', 'pbi')); f.write('work/pbis/stories/S3.md', untracked('S3'));
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Combined with an older branch']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            assert.equal(snapshot.vocabulary.project.state, 'current');
            const flagged = snapshot.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD');
            assert.deepEqual(flagged.map(finding => [finding.itemId, finding.path, finding.reason]).sort(), [['K2', 'work/tasks/K2.md', 'Earlier-vocabulary record: not counted'],
                ['P3', 'work/pbis/P3.md', 'Earlier-vocabulary record: not counted'], ['S3', 'work/pbis/stories/S3.md', 'Earlier-vocabulary record: not counted']]);
            assert.deepEqual(numbers(snapshot), { total: 2, accepted: 1, remaining: 1, eligibleIds: ['P1', 'P2'] });
            assert.deepEqual(snapshot.items.map(item => item.id).sort(), ['P1', 'P2']);
            // Incomplete coverage is stated; no complete percentage is presented.
            assert.equal(snapshot.coverage, 'partial'); assert.equal(snapshot.metrics.percentage, null);
        }
        assert.equal(JSON.stringify(f.progress().items), views);
        // A flagged record cannot be changed through the tracker, and nothing else is saved while coverage is incomplete.
        refused(await f.core.executeOperation({ schemaVersion: 2, operation: 'update', operationId: 'edit-flagged', target: { kind: 'task', itemId: 'K2' }, actor: { memberId: 'owner' },
            patch: { title: 'Changed title' }, expected: { revision: 1, contentHash: 'a'.repeat(64) } }, f.authority()), 'EARLIER_VOCABULARY_RECORD');
        refused(await f.perform('update', 'P2', { title: 'Changed title' }), 'INCOMPLETE_SCOPE');
        assert.deepEqual(f.storedState(), stored);
        // Once the team removes the stray records the next read counts normally again.
        fs.rmSync(path.join(f.root, 'work/tasks/K2.md')); fs.rmSync(path.join(f.root, 'work/pbis'), { recursive: true });
        const repaired = f.progress(); assert.equal(repaired.coverage, 'complete'); assert.equal(repaired.metrics.percentage, 50);
    }),
    test('TC-TPT-252', 'new work is stored, located, identified and reported in the current vocabulary', async f => {
        f.config.taskTracking.groupLabels = { program: 'Bet' }; f.saveConfig();
        const created = {};
        for (const kind of ['initiative', 'task', 'subtask', 'story', 'project']) {
            created[kind] = (await f.saved('create', undefined, { title: `New ${kind}`, intent: 'Capture a new outcome' }, { target: { kind } })).primary;
        }
        const day = created.task.itemId.slice(5, 13);
        // Each new identity follows the current naming for its kind, in the current location for that kind.
        assert.deepEqual(Object.fromEntries(Object.entries(created).map(([kind, saved]) => [kind, [saved.itemId, saved.kind, saved.ownerPath]])), {
            initiative: [`initiative-${day}-0001`, 'initiative', `work/initiatives/initiative-${day}-0001.md`], task: [`task-${day}-0001`, 'task', `work/tasks/task-${day}-0001.md`],
            subtask: [`subtask-${day}-0001`, 'subtask', `work/subtasks/subtask-${day}-0001.md`], story: [`story-${day}-0001`, 'story', `work/tasks/stories/story-${day}-0001.md`],
            project: [`project-${day}-0001`, 'project', `work/projects/project-${day}-0001.md`] });
        const task = created.task.itemId;
        await f.saved('link', task, { links: [{ relation: 'initiative', itemId: created.initiative.itemId }] });
        await f.saved('group', created.project.itemId, { memberItemIds: [task], groupRole: 'program' });
        await f.saved('transition', task, { state: 'planned' });
        // Stored: the current words and the mark that says so.
        for (const saved of Object.values(created)) {
            const record = parseRecord(fs.readFileSync(path.join(f.root, saved.ownerPath)), saved.ownerPath, saved.kind);
            assert.equal(record.tracking.schemaVersion, 2); assert.equal(record.tracking.kind, saved.kind);
            assert.equal(EARLIER_WORD.test(record.text), false, saved.ownerPath);
        }
        assert.equal(f.record(task).data.status, 'planned'); assert.equal(f.record(created.project.itemId).tracking.groupRole, 'program');
        // Reported: only the task is delivery; identities are named as task identities; the read states its own version.
        const snapshot = f.progress();
        assert.equal(snapshot.schemaVersion, 2); assert.equal(snapshot.coverage, 'complete');
        assert.deepEqual([snapshot.metrics.unit, snapshot.metrics.total, snapshot.metrics.eligibleIds], ['unique-task', 1, [task]]);
        assert.deepEqual([snapshot.scope.taskIds, snapshot.scope.eligibleTaskIds, snapshot.scope.excludedTaskIds, snapshot.hierarchy.ungroupedTaskIds], [[task], [task], [], []]);
        assert.equal(snapshot.items.find(item => item.id === task).state, 'planned');
        assert.deepEqual(snapshot.hierarchy.labels, { area: 'Area', capability: 'Feature', program: 'Bet' });
        assert.equal(snapshot.vocabulary.project.state, 'current'); assert.equal(snapshot.vocabulary.project.readOnly, false);
        assert.equal(EARLIER_WORD.test(JSON.stringify(snapshot)), false);
        // The words and labels every view uses come with the read and with discovery, and they agree.
        const catalogue = operationCatalogue(); const { project, ...block } = snapshot.vocabulary;
        assert.deepEqual(block, catalogue.vocabulary);
        assert.deepEqual([block.version, block.kinds, block.states, block.groupRoles, block.linkRoles, block.deliveryKind, block.groupKinds], [2,
            ['initiative', 'task', 'story', 'subtask', 'project', 'vision'], ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'],
            ['area', 'capability', 'program'], ['dependency', 'parent', 'initiative', 'spec', 'plan', 'source'], 'task', ['project', 'vision']]);
        assert.deepEqual([block.labels.kinds.task, block.labels.kinds.subtask, block.labels.kinds.initiative, block.labels.kinds.project, block.labels.states.planned, block.labels.groupRoles.program, block.labels.linkRoles.initiative],
            ['Task', 'Subtask', 'Initiative', 'Project group', 'Planned', 'Program', 'Initiative']);
        for (const [words, labels] of [[block.kinds, block.labels.kinds], [block.kinds, block.labels.kindsPlural], [block.states, block.labels.states], [block.groupRoles, block.labels.groupRoles], [block.linkRoles, block.labels.linkRoles]]) {
            assert.deepEqual(Object.keys(labels).sort(), [...words].sort());
        }
        assert.deepEqual([catalogue.kinds, catalogue.states, catalogue.linkRoles, catalogue.request.schemaVersion], [block.kinds, block.states, block.linkRoles, 2]);
        assert.equal(EARLIER_WORD.test(JSON.stringify(catalogue)), false);
    }),
    test('TC-TPT-248', 'the stored read hands migration every record in the words it stores, whatever state the project is in', async f => {
        const project = await earlierProject(f);
        const raw = inspectStoredRecords(f.context());
        assert.equal(raw.coverage, 'complete'); assert.deepEqual(raw.diagnostics, []);
        assert.deepEqual(Object.fromEntries(raw.records.map(record => [record.id, [record.kind, record.storedVersion, record.data.status]])), { [project.ids.accepted]: ['pbi', 1, 'done'],
            [project.ids.remaining]: ['pbi', 1, 'backlog'], [project.ids.supporting]: ['task', 1, 'draft'], [project.ids.intent]: ['idea', 1, 'draft'], [project.ids.story]: ['story', 1, 'draft'], [project.ids.group]: ['epic', 1, 'draft'] });
        const byId = id => raw.records.find(record => record.id === id);
        assert.equal(byId(project.ids.group).tracking.groupRole, 'initiative'); assert.equal(byId(project.ids.accepted).tracking.links[0].relation, 'idea');
        assert.ok(byId(project.ids.accepted).tracking.history.some(entry => entry.afterState === 'backlog'));
        // Path-bearing owned values, as stored: one link into each earlier location and the location named in each receipt.
        assert.deepEqual(byId(project.ids.supporting).tracking.links.filter(link => link.path).map(link => link.path),
            ['work/pbis/PBI-1.md', 'work/tasks/TASK-K.md', 'work/ideas/IDEA-D.md', 'work/epics/EPIC-E.md', 'work/pbis/stories/STORY-S.md']);
        assert.ok(byId(project.ids.accepted).tracking.receipts.every(receipt => receipt.result.kind === 'pbi' && receipt.result.ownerPath === 'work/pbis/PBI-1.md'));
        // A record read in the current words is never a base for writing; the stored one is.
        assert.throws(() => patchRecord(f.record(project.ids.remaining), { status: 'ready' }, {}), error => error.code === 'MIGRATION_REQUIRED');
        // After its location moved, a record is still handed over as stored, and one already rewritten is told apart by its stamp.
        fs.renameSync(path.join(f.root, 'work/tasks'), path.join(f.root, 'work/subtasks')); fs.renameSync(path.join(f.root, 'work/pbis'), path.join(f.root, 'work/tasks'));
        const earlierKindAt = { pbi: 'tasks', task: 'subtasks', idea: 'ideas', epic: 'epics', story: 'tasks/stories', vision: 'visions' };
        const moved = inspectStoredRecords(f.context(), { version: 1, folders: earlierKindAt });
        assert.deepEqual(moved.diagnostics, []); assert.deepEqual(moved.records.map(record => [record.id, record.kind, record.storedVersion]).sort(), raw.records.map(record => [record.id, record.kind, 1]).sort());
        const source = moved.records.find(record => record.id === project.ids.remaining);
        const rewritten = patchRecord({ ...source, kind: 'task' }, { status: 'planned' }, { schemaVersion: 2, kind: 'task',
            history: source.tracking.history.map(entry => ({ ...entry, beforeState: entry.beforeState === 'backlog' ? 'planned' : entry.beforeState, afterState: entry.afterState === 'backlog' ? 'planned' : entry.afterState })),
            receipts: source.tracking.receipts.map(receipt => ({ ...receipt, result: { ...receipt.result, kind: 'task', ownerPath: 'work/tasks/PBI-2.md' } })) });
        assert.equal(rewritten.body, source.body); assert.equal(rewritten.id, source.id); assert.equal(rewritten.revision, source.revision);
        fs.writeFileSync(path.join(f.root, source.ownerPath), rewritten.bytes);
        const partly = inspectStoredRecords(f.context(), { version: 1, folders: earlierKindAt });
        assert.deepEqual(partly.diagnostics, []);
        assert.deepEqual(partly.records.filter(record => record.storedVersion === 2).map(record => [record.id, record.kind, record.data.status]), [[project.ids.remaining, 'task', 'planned']]);
        assert.equal(partly.records.filter(record => record.storedVersion === 1).length, 5);
    }),
    test('TC-TPT-248', 'a record without tracking metadata can have its recorded state rewritten without gaining tracking metadata', async f => {
        f.config.taskTracking.schemaVersion = 1; f.saveConfig();
        const original = '---\nid: LEGACY\ntitle: "Hand-written work" # authored comment\nintent: Keep an authored outcome\nstatus: backlog\nowner_note: keep\n---\n# Authored body\nKept exactly.\n';
        f.write('work/pbis/LEGACY.md', original);
        // Read in the current words while the project stores the earlier vocabulary.
        assert.equal(f.view('LEGACY').state, 'planned'); assert.equal(f.view('LEGACY').kind, 'task'); assert.equal(f.view('LEGACY').legacy, true);
        const [source] = inspectStoredRecords(f.context()).records;
        assert.deepEqual([source.storedVersion, source.kind, source.data.status], [null, 'pbi', 'backlog']);
        const rewritten = patchRecord(source, { status: 'planned' }, {});
        assert.equal(rewritten.bytes.toString(), original.replace('status: backlog', 'status: "planned"'));
        assert.equal(rewritten.tracking, null); assert.equal(rewritten.body, source.body);
    })
] };
