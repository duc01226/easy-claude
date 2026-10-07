'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const { recoveryPath } = require('../../lib/task-tracking-deletion.cjs');

// Finite portable witnesses through the actual core and reader. No native adapter
// is invented; supported-native and visual evidence belong to their own owners.
function owners(f) {
    return new Map(f.records().map(record => [record.ownerPath, {
        bytes: record.bytes, id: record.id, kind: record.kind, revision: record.revision,
        contentHash: record.contentHash, data: record.data, tracking: record.tracking
    }]));
}
function projection(f, options) {
    const snapshot = f.progress(options);
    const { asOf, ...stable } = snapshot;
    return stable;
}
function retained(f, options) { return { owners: owners(f), projection: projection(f, options) }; }
function conserved(f, before, options) {
    // Exact bytes include history/receipts; the census catches an unintended new owner.
    assert.deepEqual(owners(f), before.owners);
    assert.deepEqual(projection(f, options), before.projection);
}
function preservedOwners(f, before, except = []) {
    for (const [relative, record] of before) if (!except.includes(relative)) {
        assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), record.bytes, relative);
    }
}
function maintenanceOnly(f, id, before, result, operation, fields = {}, tracking = {}) {
    const after = f.record(id);
    assert.equal(result.primary.status, 'saved'); assert.equal(result.primary.itemId, id);
    assert.equal(result.current.revision, after.revision); assert.equal(result.primary.contentHash, after.contentHash);
    assert.equal(after.ownerPath, before.ownerPath); assert.equal(after.kind, before.kind); assert.equal(after.body, before.body);
    const { tracking: oldTracking, ...oldData } = before.data;
    const { tracking: newTracking, ...newData } = after.data;
    assert.deepEqual(newData, { ...oldData, ...fields });
    assert.equal(after.revision, before.revision + 1);
    const changed = new Set(['revision', 'history', 'receipts', 'context', ...Object.keys(tracking)]);
    for (const key of new Set([...Object.keys(oldTracking), ...Object.keys(newTracking)])) {
        if (!changed.has(key)) assert.deepEqual(newTracking[key], oldTracking[key], key);
    }
    for (const [key, expected] of Object.entries(tracking)) assert.deepEqual(newTracking[key], expected, key);
    assert.deepEqual(newTracking.history.slice(0, -1), oldTracking.history);
    assert.deepEqual(newTracking.receipts.slice(0, -1), oldTracking.receipts);
    const history = newTracking.history.at(-1); const receipt = newTracking.receipts.at(-1);
    assert.equal(history.operation, operation); assert.equal(history.operationId, result.primary.operationId);
    assert.equal(history.actor, 'owner'); assert.equal(history.beforeState, before.data.status); assert.equal(history.afterState, after.data.status);
    assert.equal(history.beforeAssigneeId, oldTracking.assigneeId); assert.equal(history.afterAssigneeId, newTracking.assigneeId);
    assert.deepEqual(newTracking.context, { operationId: result.primary.operationId, kind: 'direct' });
    assert.equal(receipt.operationId, result.primary.operationId); assert.equal(receipt.afterRevision, after.revision);
    assert.equal(receipt.result.status, 'saved'); assert.equal(receipt.result.itemId, id);
    assert.equal(result.current.acceptance.accepted, false);
    return after;
}
async function readyMaya(f, id = 'PBI-142-ready', kind = 'pbi') {
    if (!f.config.taskTracking.members.some(member => member.id === 'member-maya')) {
        f.config.taskTracking.members.push({ id: 'member-maya', displayName: 'Maya', active: true }); f.saveConfig();
    }
    f.write('docs/contracts/selected.md', 'Only selected rows belong to this export.\n');
    await f.create(id, kind); await f.saved('link', id, { links: [{ relation: 'spec', path: 'docs/contracts/selected.md' }] });
    await f.saved('assign', id, { assigneeId: 'Maya' }); await f.ready(id);
    assert.equal(f.view(id).state, 'ready'); assert.equal(f.view(id).assigneeId, 'member-maya');
    assert.equal(f.view(id).acceptance.accepted, false);
}
async function teammatePriority(f, id, priority = 2) {
    return f.saved('update', id, { priority }, { actor: { memberId: 'peer' } }, { actor: 'peer' });
}

module.exports = { name: 'Task tracking maintenance contracts', tests: [
    test('TC-TPT-142', 'capture creates exactly the requested Draft without promoting reviewed Maya work or claiming a denied capture', async f => {
        // Given reviewed Ready work and a separate explicit request for a new outcome.
        await readyMaya(f); const before = retained(f);
        const patch = { title: 'Export selected rows as CSV', intent: 'Save only the operator selection',
            criteria: [{ id: 'csv-selection', text: 'The CSV contains exactly the selected records' }] };
        const request = f.request('create', 'PBI-142-capture', patch);
        refused(await f.core.executeOperation(request, f.authority({ canWrite: false })), 'NOT_PERMITTED'); conserved(f, before);
        // When permission exists, capture adds one unaccepted owner and no other changes.
        const saved = await f.core.executeOperation(request, f.authority()); const captured = f.record('PBI-142-capture');
        assert.equal(saved.primary.status, 'saved'); assert.equal(saved.current.state, 'draft'); assert.equal(captured.revision, 1);
        assert.equal(captured.data.title, patch.title); assert.equal(captured.data.intent, patch.intent); assert.deepEqual(captured.tracking.criteria, patch.criteria);
        assert.equal(saved.current.assigneeId, null); assert.equal(saved.current.acceptance.accepted, false); assert.equal(saved.current.verification.status, 'missing');
        assert.deepEqual(captured.tracking.proofs, []); assert.deepEqual(captured.tracking.acceptanceHistory, []);
        assert.deepEqual(captured.tracking.history.map(entry => entry.operation), ['create']); assert.equal(captured.tracking.receipts[0].operationId, request.operationId);
        assert.equal(f.progress().metrics.total, before.projection.metrics.total + 1); assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.records().length, before.owners.size + 1); preservedOwners(f, before.owners);
        // A second request for this exact identity cannot overwrite the successful capture.
        const current = retained(f); const duplicate = f.request('create', 'PBI-142-capture', { ...patch, title: 'Conflicting capture' });
        refused(await f.core.executeOperation(duplicate, f.authority()), 'CONFLICT'); conserved(f, current);
    }),
    test('TC-TPT-142', 'refine changes requested Draft outcome criteria while lineage, Maya work and lifecycle remain conserved', async f => {
        // Refinement owns a Draft, not an implied readiness approval or acceptance.
        await readyMaya(f); await f.create('IDEA-142', 'idea'); await f.create('PBI-142-refine');
        await f.saved('link', 'PBI-142-refine', { links: [{ relation: 'idea', itemId: 'IDEA-142' }] });
        const patch = { title: 'Download the selected rows', intent: 'Download a CSV limited to the selected rows',
            criteria: [{ id: 'download-selection', text: 'Only selected rows appear in the downloaded CSV' }] };
        const before = retained(f);
        refused(await f.perform('update', 'PBI-142-refine', patch, {}, { canWrite: false }), 'NOT_PERMITTED'); conserved(f, before);
        const stale = f.request('update', 'PBI-142-refine', patch); const draft = JSON.stringify(stale);
        await teammatePriority(f, 'PBI-142-refine'); const newer = retained(f);
        refused(await f.core.executeOperation(stale, f.authority()), 'CONFLICT'); conserved(f, newer); assert.equal(JSON.stringify(stale), draft);
        const old = f.record('PBI-142-refine'); const metrics = f.progress().metrics; const controls = owners(f);
        const saved = await f.saved('update', 'PBI-142-refine', patch);
        maintenanceOnly(f, 'PBI-142-refine', old, saved, 'update', { title: patch.title, intent: patch.intent }, { criteria: patch.criteria });
        assert.equal(saved.current.state, 'draft'); assert.deepEqual(saved.current.links, [{ relation: 'idea', itemId: 'IDEA-142' }]);
        assert.equal(saved.current.verification.status, 'missing'); assert.deepEqual(f.progress().metrics, metrics);
        preservedOwners(f, controls, [old.ownerPath]);
    }),
    test('TC-TPT-142', 'adopt previews legacy ownership without rewriting authored intent and rejects a changed preview scope', async f => {
        await readyMaya(f);
        // Existing manual content is a real adoption prerequisite, not generated tracking metadata.
        f.write('work/pbis/PBI-142-legacy.md', '---\nid: PBI-142-legacy\ntitle: Authored legacy outcome\nintent: Keep the selected export contract\nstatus: draft\nassigned_to: member-maya\ncustom_owner: keep-original\n---\nAuthored body and notes stay exact.\n');
        const old = f.record('PBI-142-legacy'); assert.equal(old.tracking, null); assert.equal(old.revision, 0);
        const request = f.request('adopt', old.id, {}); let before = retained(f);
        refused(await f.core.executeOperation(request, f.authority({ canWrite: false })), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.core.executeOperation(request, f.authority()), 'PREVIEW_REQUIRED'); conserved(f, before);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.equal(preview.current.legacy, true); assert.equal(preview.proposed.legacy, false); conserved(f, before);
        // A separately authorized teammate update changes the actually reviewed scope.
        await teammatePriority(f, 'PBI-142-ready'); before = retained(f);
        refused(await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority()), 'CONFLICT'); conserved(f, before);
        const fresh = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(fresh.primary.status, 'preview'); conserved(f, before);
        const saved = await f.core.executeOperation({ ...request, previewToken: fresh.previewToken }, f.authority()); const adopted = f.record(old.id);
        assert.equal(saved.primary.status, 'saved'); assert.equal(saved.current.legacy, false); assert.equal(adopted.revision, 1);
        const { tracking, ...data } = adopted.data; assert.deepEqual(data, old.data); assert.equal(adopted.body, old.body); assert.equal(adopted.ownerPath, old.ownerPath);
        assert.equal(saved.current.state, 'draft'); assert.equal(saved.current.assigneeId, 'member-maya'); assert.equal(saved.current.acceptance.accepted, false);
        assert.deepEqual(tracking.criteria, []); assert.deepEqual(tracking.proofs, []); assert.deepEqual(tracking.acceptanceHistory, []);
        assert.deepEqual(tracking.history.map(entry => entry.operation), ['adopt']); assert.equal(tracking.history[0].actor, 'owner');
        assert.equal(tracking.receipts[0].operationId, request.operationId); assert.equal(f.progress().metrics.accepted, 0);
        preservedOwners(f, before.owners, [old.ownerPath]);
    }),
    test('TC-TPT-142', 'group previews exact membership without changing child responsibility and conserves a denied or stale maintenance draft', async f => {
        await readyMaya(f, 'EPIC-142', 'epic'); await readyMaya(f); await f.create('PBI-142-other');
        const patch = { memberItemIds: ['PBI-142-ready'], groupRole: 'capability' }; const before = retained(f);
        refused(await f.perform('group', 'EPIC-142', patch, {}, { canWrite: false }), 'NOT_PERMITTED'); conserved(f, before);
        const stale = f.request('group', 'EPIC-142', patch); const draft = JSON.stringify(stale);
        const preview = await f.core.executeOperation({ ...stale, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.deepEqual(preview.proposed.memberItemIds, patch.memberItemIds); conserved(f, before);
        await teammatePriority(f, 'EPIC-142'); const newer = retained(f);
        refused(await f.core.executeOperation({ ...stale, previewToken: preview.previewToken }, f.authority()), 'CONFLICT'); conserved(f, newer); assert.equal(JSON.stringify(stale), draft);
        const request = f.request('group', 'EPIC-142', patch); const reviewed = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(reviewed.primary.status, 'preview'); conserved(f, newer);
        const old = f.record('EPIC-142'); const saved = await f.core.executeOperation({ ...request, previewToken: reviewed.previewToken }, f.authority());
        maintenanceOnly(f, old.id, old, saved, 'group', {}, patch);
        assert.equal(saved.current.state, 'ready'); assert.equal(saved.current.assigneeId, 'member-maya'); assert.equal(saved.current.verification.status, 'missing');
        const scope = f.progress({ groupId: old.id }); assert.deepEqual(scope.scope.eligiblePbiIds, ['PBI-142-ready']); assert.equal(scope.metrics.total, 1); assert.equal(scope.metrics.accepted, 0);
        assert.deepEqual(f.progress().metrics, newer.projection.metrics); preservedOwners(f, newer.owners, [old.ownerPath]);
        const valid = retained(f); refused(await f.perform('group', old.id, { memberItemIds: ['PBI-missing'] }), 'INVALID_RELATIONSHIP'); conserved(f, valid);
    }),
    test('TC-TPT-142', 'retire retains Ready Maya intent and history while changing only explicit retirement and active delivery eligibility', async f => {
        await readyMaya(f); await f.create('PBI-142-other'); const reason = 'Keep the superseded outcome for historical inspection'; let before = retained(f);
        refused(await f.perform('retire', 'PBI-142-ready', { reason }, {}, { canWrite: false }), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.perform('retire', 'PBI-142-ready', { reason: '' }), 'INVALID_INPUT'); conserved(f, before);
        const stale = f.request('retire', 'PBI-142-ready', { reason }); await teammatePriority(f, 'PBI-142-ready'); before = retained(f);
        refused(await f.core.executeOperation(stale, f.authority()), 'CONFLICT'); conserved(f, before);
        const old = f.record('PBI-142-ready'); const saved = await f.saved('retire', old.id, { reason });
        assert.match(saved.current.retired.at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
        const after = maintenanceOnly(f, old.id, old, saved, 'retire', {}, { retired: { reason, actor: 'owner', at: saved.current.retired.at } });
        assert.equal(after.tracking.history.at(-1).reason, reason); assert.equal(saved.current.state, 'ready'); assert.equal(saved.current.assigneeId, 'member-maya');
        assert.equal(saved.current.verification.status, 'missing'); assert.deepEqual(f.progress().metrics.eligibleIds, ['PBI-142-other']);
        assert.equal(f.progress().metrics.total, 1); assert.equal(f.progress().metrics.retired, 1); assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.progress().ready.includes(old.id), false); preservedOwners(f, before.owners, [old.ownerPath]);
        const retired = retained(f); refused(await f.perform('update', old.id, { priority: 3 }), 'RETIRED'); conserved(f, retired);
    }),
    test('TC-TPT-142', 'restore needs an actual retirement and conserves a newer retirement before explicitly restoring eligible Ready work', async f => {
        await readyMaya(f); await f.create('PBI-142-other'); await f.saved('retire', 'PBI-142-ready', { reason: 'Outcome temporarily outside active delivery' });
        assert.notEqual(f.view('PBI-142-ready').retired, null); const reason = 'The reviewed outcome is active again'; let before = retained(f);
        refused(await f.perform('restore', 'PBI-142-ready', { reason }, {}, { canWrite: false }), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.perform('restore', 'PBI-142-ready', { reason: '' }), 'INVALID_INPUT'); conserved(f, before);
        const stale = f.request('restore', 'PBI-142-ready', { reason });
        await f.saved('retire', 'PBI-142-ready', { reason: 'Teammate retained a more recent retirement decision' }, { actor: { memberId: 'peer' } }, { actor: 'peer' }); before = retained(f);
        refused(await f.core.executeOperation(stale, f.authority()), 'CONFLICT'); conserved(f, before);
        const old = f.record('PBI-142-ready'); const saved = await f.saved('restore', old.id, { reason });
        const after = maintenanceOnly(f, old.id, old, saved, 'restore', {}, { retired: null });
        assert.equal(after.tracking.history.at(-1).reason, reason); assert.equal(saved.current.retired, null); assert.equal(saved.current.state, 'ready');
        assert.equal(saved.current.assigneeId, 'member-maya'); assert.equal(saved.current.verification.status, 'missing');
        assert.deepEqual(f.progress().metrics.eligibleIds, ['PBI-142-other', 'PBI-142-ready']); assert.equal(f.progress().metrics.retired, 0); assert.equal(f.progress().metrics.accepted, 0);
        assert.ok(f.progress().ready.includes(old.id)); preservedOwners(f, before.owners, [old.ownerPath]);
        const restored = retained(f); refused(await f.perform('restore', old.id, { reason }), 'INVALID_INPUT'); conserved(f, restored);
    }),
    test('TC-TPT-142', 'health assessment needs the actual dated owner authority and cannot substitute acceptance or overwrite a newer save', async f => {
        await readyMaya(f); await f.create('PBI-142-other'); f.config.taskTracking.healthOwnerId = 'PBI-142-ready'; f.saveConfig();
        assert.equal(f.progress().health.status, 'unknown');
        const health = { assessment: 'Watch the export dependency', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'The upstream schema decision remains pending' };
        let before = retained(f);
        refused(await f.perform('attest', 'PBI-142-ready', { health }), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.perform('attest', 'PBI-142-ready', { health }, {}, { canAttest: true, canWrite: false }), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.perform('attest', 'PBI-142-ready', { health: { ...health, ownerId: 'peer' } }, {}, { canAttest: true }), 'NOT_PERMITTED'); conserved(f, before);
        const old = f.record('PBI-142-ready'); const saved = await f.saved('attest', old.id, { health }, {}, { canAttest: true });
        const after = maintenanceOnly(f, old.id, old, saved, 'attest', {}, { health });
        assert.deepEqual(after.tracking.history.at(-1).health, health); assert.equal(after.tracking.history.at(-1).previousHealth, null);
        assert.deepEqual(saved.current.health, { status: 'attested', ...health, displayName: 'Owner', itemId: old.id });
        assert.deepEqual(f.progress().health, saved.current.health); assert.equal(saved.current.state, 'ready'); assert.equal(saved.current.assigneeId, 'member-maya');
        assert.equal(saved.current.verification.status, 'missing'); assert.deepEqual(f.progress().metrics, before.projection.metrics); preservedOwners(f, before.owners, [old.ownerPath]);
        const stale = f.request('attest', old.id, { health: { ...health, assessment: 'Retained assessment draft' } }); const draft = JSON.stringify(stale);
        await teammatePriority(f, old.id); before = retained(f);
        refused(await f.core.executeOperation(stale, f.authority({ canAttest: true })), 'CONFLICT'); conserved(f, before); assert.equal(JSON.stringify(stale), draft);
    }),
    test('TC-TPT-142', 'eligible Draft deletion previews exact recoverable bytes while referenced work, denied authority and stale drafts remain intact', async f => {
        await readyMaya(f); await f.create('PBI-142-delete'); await f.create('PBI-142-referenced'); await f.create('EPIC-142-keeper', 'epic');
        await f.saved('group', 'EPIC-142-keeper', { memberItemIds: ['PBI-142-referenced'] });
        let before = retained(f);
        refused(await f.perform('delete', 'PBI-142-referenced', { reason: 'Requested exact removal' }, {}, { canDelete: true }), 'USE_RETIREMENT'); conserved(f, before);
        const request = f.request('delete', 'PBI-142-delete', { reason: 'Accidental unreferenced Draft' });
        assert.equal(f.view('PBI-142-delete').state, 'draft'); assert.equal(f.view('PBI-142-delete').assigneeId, null);
        refused(await f.core.executeOperation(request, f.authority()), 'NOT_PERMITTED'); conserved(f, before);
        refused(await f.core.executeOperation(request, f.authority({ canDelete: true })), 'PREVIEW_REQUIRED'); conserved(f, before);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDelete: true }));
        assert.equal(preview.primary.status, 'preview'); assert.equal(preview.proposed.deleted, true); conserved(f, before);
        await teammatePriority(f, 'PBI-142-delete'); before = retained(f);
        refused(await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDelete: true })), 'CONFLICT'); conserved(f, before);
        const fresh = f.request('delete', 'PBI-142-delete', request.patch); const reviewed = await f.core.executeOperation({ ...fresh, preview: true }, f.authority({ canDelete: true }));
        assert.equal(reviewed.primary.status, 'preview'); conserved(f, before);
        refused(await f.core.executeOperation({ ...fresh, previewToken: reviewed.previewToken }, f.authority({ canDelete: true, canWrite: false })), 'NOT_PERMITTED'); conserved(f, before);
        const old = f.record('PBI-142-delete'); const recovery = path.join(f.root, recoveryPath(fresh.operationId)); assert.equal(fs.existsSync(recovery), false);
        const saved = await f.core.executeOperation({ ...fresh, previewToken: reviewed.previewToken }, f.authority({ canDelete: true }));
        assert.equal(saved.primary.status, 'saved'); assert.equal(saved.primary.deleted, true); assert.equal(saved.current, null);
        assert.equal(fs.existsSync(path.join(f.root, old.ownerPath)), false); assert.equal(f.records().some(record => record.id === old.id), false);
        const retainedDeletion = JSON.parse(fs.readFileSync(recovery, 'utf8'));
        assert.equal(retainedDeletion.phase, 'complete'); assert.equal(retainedDeletion.itemId, old.id); assert.equal(retainedDeletion.sourcePath, old.ownerPath);
        assert.equal(retainedDeletion.original, old.text); assert.equal(retainedDeletion.expectedHash, old.contentHash); assert.equal(retainedDeletion.primary.deleted, true);
        assert.equal(f.progress().metrics.total, before.projection.metrics.total - 1); assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.records().length, before.owners.size - 1); preservedOwners(f, before.owners, [old.ownerPath]);
        assert.deepEqual(f.view('EPIC-142-keeper').memberItemIds, ['PBI-142-referenced']); assert.equal(f.view('PBI-142-ready').state, 'ready');
    }),
    test('TC-TPT-135', 'completed stories and groups add no PBI credit and retirement changes an overlapping unique union exactly once', async f => {
        // A finite, valid-domain supplement to the existing six membership orders:
        // accepted story/group records and retired/restored accepted PBIs are distinct inputs.
        for (const id of ['PBI-135-accepted', 'PBI-135-open', 'PBI-135-retired']) await f.create(id);
        await f.accepted('PBI-135-accepted'); await f.accepted('PBI-135-retired');
        await f.saved('retire', 'PBI-135-retired', { reason: 'Preserve historical delivery outside active scope' });
        for (const [id, kind] of [['STORY-135', 'story'], ['EPIC-135-leaf', 'epic'], ['VISION-135-support', 'vision'], ['VISION-135-selected', 'vision']]) await f.create(id, kind);
        await f.saved('group', 'EPIC-135-leaf', { memberItemIds: ['PBI-135-accepted', 'PBI-135-open', 'PBI-135-retired', 'STORY-135'] });
        await f.saved('group', 'VISION-135-support', { memberItemIds: ['PBI-135-accepted', 'PBI-135-retired'] });
        await f.saved('group', 'VISION-135-selected', { memberItemIds: ['EPIC-135-leaf', 'VISION-135-support', 'PBI-135-accepted', 'STORY-135'] });
        const selected = { groupId: 'VISION-135-selected' }; const base = f.progress(selected); const project = f.progress().metrics;
        assert.equal(base.coverage, 'complete'); assert.deepEqual(base.scope.pbiIds, ['PBI-135-accepted', 'PBI-135-open', 'PBI-135-retired']);
        assert.deepEqual(base.scope.eligiblePbiIds, ['PBI-135-accepted', 'PBI-135-open']); assert.deepEqual(base.scope.excludedPbiIds, ['PBI-135-retired']);
        assert.equal(base.metrics.total, 2); assert.equal(base.metrics.accepted, 1); assert.equal(base.metrics.retired, 1); assert.equal(base.metrics.percentage, 50);
        for (const id of ['STORY-135', 'EPIC-135-leaf', 'VISION-135-support']) {
            const before = owners(f); const target = f.record(id);
            await f.accepted(id); assert.equal(f.view(id).acceptance.accepted, true);
            assert.deepEqual(f.progress(selected).metrics, base.metrics); assert.deepEqual(f.progress(selected).scope, base.scope);
            assert.deepEqual(f.progress().metrics, project); preservedOwners(f, before, [target.ownerPath]);
        }
        // Restoring the multiply referenced accepted PBI adds one eligible/accepted credit.
        await f.saved('restore', 'PBI-135-retired', { reason: 'Reviewed historical outcome returns to active scope' });
        const restored = f.progress(selected);
        assert.deepEqual(restored.scope.eligiblePbiIds, ['PBI-135-accepted', 'PBI-135-open', 'PBI-135-retired']); assert.deepEqual(restored.scope.excludedPbiIds, []);
        assert.equal(restored.metrics.total, 3); assert.equal(restored.metrics.accepted, 2); assert.equal(restored.metrics.currentlyVerified, 2); assert.equal(restored.metrics.retired, 0);
        assert.equal(restored.metrics.percentage, 2 / 3 * 100); assert.equal(restored.scope.memberIds.filter(id => id === 'PBI-135-retired').length, 1);
        await f.saved('retire', 'PBI-135-retired', { reason: 'Retain the same excluded outcome after inspection' });
        assert.deepEqual(f.progress(selected).metrics, base.metrics); assert.deepEqual(f.progress(selected).scope, base.scope);
        // Permission revoked after this graph was reviewed cannot rewrite its union.
        const reviewed = retained(f, selected);
        refused(await f.perform('group', selected.groupId, { memberItemIds: ['PBI-135-open'] }, {}, { canWrite: false }), 'NOT_PERMITTED');
        conserved(f, reviewed, selected);
    }),
    test('TC-TPT-137', 'selected group confidence partitions retain accepted history without borrowing passing proof or delivery from outside scope', async f => {
        for (const id of ['PBI-137-current', 'PBI-137-failed', 'PBI-137-skipped', 'PBI-137-outside']) { await f.create(id); await f.accepted(id); }
        const history = new Map(['PBI-137-failed', 'PBI-137-skipped'].map(id => [id, f.record(id).tracking.acceptanceHistory]));
        for (const [id, result] of [['PBI-137-failed', 'failed'], ['PBI-137-skipped', 'skipped']]) {
            await f.saved('proof', id, { proof: f.proof(id, { result, observedAt: '2026-01-03T00:00:00.000Z', summary: `Later actual manual observation was ${result}` }) });
        }
        await f.create('PBI-137-partial', 'pbi', { criteria: [{ id: 'rows', text: 'Only selected rows are exported' }, { id: 'header', text: 'The CSV contains the agreed header' }] });
        await f.verifying('PBI-137-partial'); const partialProof = f.proof('PBI-137-partial', { criteriaIds: ['rows'] });
        await f.saved('proof', 'PBI-137-partial', { proof: partialProof });
        await f.create('PBI-137-unaccepted'); await f.verifying('PBI-137-unaccepted');
        await f.saved('proof', 'PBI-137-unaccepted', { proof: f.proof('PBI-137-unaccepted') });
        await f.create('PBI-137-missing'); await f.create('EPIC-137-selected', 'epic');
        const members = ['PBI-137-current', 'PBI-137-failed', 'PBI-137-skipped', 'PBI-137-partial', 'PBI-137-unaccepted', 'PBI-137-missing'];
        await f.saved('group', 'EPIC-137-selected', { memberItemIds: members }); const options = { groupId: 'EPIC-137-selected' }; const before = retained(f, options);
        const snapshot = f.progress(options); const item = id => snapshot.items.find(row => row.id === id);
        assert.equal(snapshot.profile.kind, 'portable-markdown'); assert.equal(snapshot.source.kind, 'worktree'); assert.equal(snapshot.project.root, f.root);
        assert.equal(snapshot.coverage, 'complete'); assert.equal(snapshot.scope.kind, 'group'); assert.equal(snapshot.scope.itemId, options.groupId);
        assert.deepEqual(snapshot.scope.eligiblePbiIds, [...members].sort()); assert.equal(snapshot.scope.pbiIds.includes('PBI-137-outside'), false);
        for (const [id, accepted, verification] of [
            ['PBI-137-current', true, 'current'], ['PBI-137-failed', true, 'stale'], ['PBI-137-skipped', true, 'stale'],
            ['PBI-137-partial', false, 'stale'], ['PBI-137-unaccepted', false, 'current'], ['PBI-137-missing', false, 'missing']
        ]) { assert.equal(item(id).acceptance.accepted, accepted, id); assert.equal(item(id).verification.status, verification, id); }
        for (const id of ['PBI-137-failed', 'PBI-137-skipped']) {
            assert.deepEqual(item(id).verification.proofIds, []); assert.deepEqual(item(id).acceptanceHistory, history.get(id));
        }
        assert.deepEqual(item('PBI-137-partial').verification.proofIds, [partialProof.id]); assert.deepEqual(item('PBI-137-partial').verification.criteriaIds, ['rows', 'header']);
        assert.equal(snapshot.metrics.total, 6); assert.equal(snapshot.metrics.accepted, 3); assert.equal(snapshot.metrics.currentlyVerified, 1); assert.equal(snapshot.metrics.percentage, 50);
        assert.equal(f.progress().metrics.total, 7); assert.equal(f.progress().metrics.accepted, 4); assert.equal(f.progress().metrics.currentlyVerified, 2);
        assert.equal(snapshot.health.status, 'unknown'); conserved(f, before, options);
    }),
    test('TC-TPT-137', 'known empty, absent selected and partially inspectable scopes disclose distinct coverage without optimistic precision or source repair', async f => {
        await f.create('PBI-137-known'); await f.accepted('PBI-137-known'); await f.create('PBI-137-outside'); await f.accepted('PBI-137-outside');
        await f.create('EPIC-137-known', 'epic'); await f.create('EPIC-137-empty', 'epic');
        await f.saved('group', 'EPIC-137-known', { memberItemIds: ['PBI-137-known'] }); const controls = owners(f);
        const known = f.progress({ groupId: 'EPIC-137-known' }); const empty = f.progress({ groupId: 'EPIC-137-empty' });
        assert.equal(known.coverage, 'complete'); assert.deepEqual(known.metrics.eligibleIds, ['PBI-137-known']); assert.equal(known.metrics.percentage, 100);
        assert.equal(empty.coverage, 'complete'); assert.equal(empty.scope.itemId, 'EPIC-137-empty'); assert.deepEqual(empty.scope.pbiIds, []);
        assert.equal(empty.metrics.total, 0); assert.equal(empty.metrics.accepted, 0); assert.equal(empty.metrics.percentage, null);
        const absent = f.progress({ groupId: 'EPIC-137-absent' });
        assert.equal(absent.coverage, 'unavailable'); assert.equal(absent.metrics, null); assert.equal(absent.scope.coverage, 'unavailable');
        assert.equal(absent.scope.itemId, 'EPIC-137-absent'); assert.deepEqual(absent.scope.eligiblePbiIds, []);
        assert.ok(absent.diagnostics.some(row => row.code === 'UNAVAILABLE_SCOPE' && row.itemId === 'EPIC-137-absent')); assert.equal(absent.health.status, 'unknown');
        // Deliberate fail-safe input: an ordinary incomplete manual/imported Markdown
        // owner is reachable after an interrupted author edit; it must not be repaired by projection.
        const relative = 'work/pbis/PBI-137-incomplete.md'; const imported = Buffer.from('---\nid: PBI-137-incomplete\ntitle: Interrupted imported owner\n'); f.write(relative, imported);
        const partial = f.progress({ groupId: 'EPIC-137-known' });
        assert.equal(partial.profile.kind, 'portable-markdown'); assert.equal(partial.source.kind, 'worktree'); assert.equal(partial.project.root, f.root);
        assert.equal(partial.coverage, 'partial'); assert.equal(partial.scope.coverage, 'partial'); assert.equal(partial.metrics.coverage, 'partial');
        assert.equal(partial.scope.itemId, 'EPIC-137-known'); assert.deepEqual(partial.scope.eligiblePbiIds, ['PBI-137-known']);
        assert.equal(partial.metrics.total, 1); assert.equal(partial.metrics.accepted, 1); assert.equal(partial.metrics.currentlyVerified, 1); assert.equal(partial.metrics.percentage, null);
        assert.ok(partial.diagnostics.some(row => row.path === relative && row.code === 'UNSUPPORTED')); assert.notEqual(partial.fingerprint, known.fingerprint);
        assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), imported); preservedOwners(f, controls);
        const unavailable = f.progress({ groupId: 'EPIC-137-absent' }); assert.equal(unavailable.coverage, 'unavailable'); assert.equal(unavailable.metrics, null);
        assert.equal(unavailable.scope.itemId, 'EPIC-137-absent'); assert.deepEqual(unavailable.scope.eligiblePbiIds, []);
        assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), imported); preservedOwners(f, controls);
    })
] };
