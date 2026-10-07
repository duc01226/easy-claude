'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused } = require('../lib/task-tracking-fixture.cjs');
const { recoveryPath } = require('../../lib/task-tracking-deletion.cjs');
const { LIMITS } = require('../../lib/task-tracking-config.cjs');

// Deletion has a prepared recovery plus path-removal unit; it does not claim
// the ordinary one-record receipt transaction or power-loss/editor CAS proof.
async function preparedRequest(f) {
    const request = f.request('delete', 'TASK-101', { reason: 'Requested exact draft removal' });
    const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDelete: true }));
    assert.equal(preview.primary.status, 'preview');
    return { ...request, previewToken: preview.previewToken };
}

// Explicit integration fault injection at one owned filesystem publication
// call. All unaffected filesystem work remains real; restore before teardown.
async function withFsFailure(method, applies, callback) {
    const original = fs[method];
    fs[method] = (...args) => {
        if (applies(args)) throw Object.assign(new Error('Test-owned injected filesystem interruption'), { code: 'EIO' });
        return original.apply(fs, args);
    };
    try { return await callback(); }
    finally { fs[method] = original; }
}

module.exports = { name: 'Task tracking deletion integration', tests: [
    test('TC-TPT-130', 'exact unreferenced draft deletion needs preview and preserves recoverable bytes and retry identity', async f => {
        await f.create(); const record = f.record('TASK-101'); const original = f.bytes('TASK-101');
        const request = f.request('delete', 'TASK-101', { reason: 'Accidental unreferenced draft' });
        refused(await f.core.executeOperation(request, f.authority()), 'NOT_PERMITTED');
        refused(await f.core.executeOperation(request, f.authority({ canDelete: true })), 'PREVIEW_REQUIRED'); assert.deepEqual(f.bytes('TASK-101'), original);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDelete: true })); assert.equal(preview.primary.status, 'preview'); assert.equal(preview.proposed.deleted, true);
        const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDelete: true }));
        assert.equal(saved.primary.status, 'saved'); assert.equal(saved.primary.deleted, true); assert.equal(fs.existsSync(path.join(f.root, record.ownerPath)), false); assert.equal(f.progress().metrics.total, 0);
        const recovery = path.join(f.root, recoveryPath(request.operationId)); const retained = fs.readFileSync(recovery); const value = JSON.parse(retained);
        assert.equal(value.phase, 'complete'); assert.equal(value.original, original.toString('utf8')); assert.equal(value.itemId, 'TASK-101');
        const replay = await f.core.executeOperation(request, f.authority({ canDelete: true })); assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.deleted, true); assert.deepEqual(fs.readFileSync(recovery), retained);
        refused(await f.core.executeOperation({ ...request, patch: { reason: 'Different deletion request' } }, f.authority({ canDelete: true })), 'REUSED_OPERATION'); assert.deepEqual(fs.readFileSync(recovery), retained);
    }),
    test('TC-TPT-130', 'referenced assigned and non-draft work refuses hard deletion without cascading', async f => {
        await f.create('TASK-REF'); await f.create('TASK-OWNER'); await f.saved('link', 'TASK-OWNER', { links: [{ relation: 'dependency', itemId: 'TASK-REF' }] });
        await f.create('TASK-ASSIGNED'); await f.saved('assign', 'TASK-ASSIGNED', { assigneeId: 'owner' });
        await f.create('TASK-HISTORY'); await f.saved('assign', 'TASK-HISTORY', { assigneeId: 'owner' }); await f.saved('assign', 'TASK-HISTORY', { assigneeId: null });
        await f.create('TASK-PLANNED'); await f.saved('transition', 'TASK-PLANNED', { state: 'planned' });
        for (const id of ['TASK-REF', 'TASK-ASSIGNED', 'TASK-HISTORY', 'TASK-PLANNED']) {
            const before = f.bytes(id); refused(await f.perform('delete', id, { reason: 'Requested removal' }, {}, { canDelete: true }), 'USE_RETIREMENT'); assert.deepEqual(f.bytes(id), before);
        }
        assert.deepEqual(f.record('TASK-OWNER').tracking.links, [{ relation: 'dependency', itemId: 'TASK-REF' }]); assert.equal(f.records().length, 5);
    }),
    test('TC-TPT-130', 'deletion preview conflicts with a later draft edit and prepared recovery survives interrupted completion', async f => {
        await f.create(); const request = f.request('delete', 'TASK-101', { reason: 'Exact draft removal' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDelete: true })); assert.equal(preview.primary.status, 'preview');
        await f.saved('update', 'TASK-101', { title: 'Later actor edit' }); const before = f.bytes('TASK-101');
        refused(await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDelete: true })), 'CONFLICT'); assert.deepEqual(f.bytes('TASK-101'), before);
        const fresh = f.request('delete', 'TASK-101', { reason: 'Reviewed later exact draft' });
        const current = await f.core.executeOperation({ ...fresh, preview: true }, f.authority({ canDelete: true })); assert.equal(current.primary.status, 'preview');
        assert.equal((await f.core.executeOperation({ ...fresh, previewToken: current.previewToken }, f.authority({ canDelete: true }))).primary.deleted, true);
        const recovery = path.join(f.root, recoveryPath(fresh.operationId)); const value = JSON.parse(fs.readFileSync(recovery, 'utf8'));
        // Deliberate crash-state fixture: unlink succeeded but completion marker
        // was not saved. The retained exact source bytes must make retry safe.
        value.phase = 'prepared'; value.primary.status = 'pending'; fs.writeFileSync(recovery, JSON.stringify(value));
        const repaired = await f.core.executeOperation(fresh, f.authority({ canDelete: true })); assert.equal(repaired.primary.status, 'saved'); assert.equal(repaired.primary.replayed, true);
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).phase, 'complete'); assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).original, before.toString('utf8'));
    }),
    test('TC-TPT-130', 'failure before prepared recovery publication preserves the exact original draft', async f => {
        await f.create(); const original = f.bytes('TASK-101'); const request = await preparedRequest(f); const recovery = path.join(f.root, recoveryPath(request.operationId));
        const failed = await withFsFailure('linkSync', args => args[1] === recovery,
            () => f.core.executeOperation(request, f.authority({ canDelete: true })));
        refused(failed, 'EIO'); assert.deepEqual(f.bytes('TASK-101'), original); assert.equal(fs.existsSync(recovery), false);
        const retry = await f.core.executeOperation(request, f.authority({ canDelete: true })); assert.equal(retry.primary.deleted, true);
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).original, original.toString('utf8'));
    }),
    test('TC-TPT-130', 'interrupted physical unlink retains prepared bytes and resumes the exact original request', async f => {
        await f.create(); const record = f.record('TASK-101'); const original = f.bytes('TASK-101'); const request = await preparedRequest(f);
        const target = path.join(f.root, record.ownerPath); const recovery = path.join(f.root, recoveryPath(request.operationId));
        const failed = await withFsFailure('unlinkSync', args => args[0] === target,
            () => f.core.executeOperation(request, f.authority({ canDelete: true })));
        refused(failed, 'EIO'); assert.deepEqual(fs.readFileSync(target), original); assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).phase, 'prepared');
        const retry = await f.core.executeOperation(request, f.authority({ canDelete: true })); assert.equal(retry.primary.deleted, true); assert.equal(fs.existsSync(target), false);
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).phase, 'complete'); assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).original, original.toString('utf8'));
    }),
    test('TC-TPT-111', 'completion journal failure retains successful deletion as primary and exposes recoverable pending work', async f => {
        await f.create(); const record = f.record('TASK-101'); const original = f.bytes('TASK-101'); const request = await preparedRequest(f); const recovery = path.join(f.root, recoveryPath(request.operationId));
        const result = await withFsFailure('renameSync', args => args[1] === recovery,
            () => f.core.executeOperation(request, f.authority({ canDelete: true })));
        assert.equal(result.primary.status, 'saved'); assert.equal(result.primary.deleted, true); assert.equal(fs.existsSync(path.join(f.root, record.ownerPath)), false);
        assert.ok(result.secondary.some(value => value.kind === 'deletion-recovery' && value.status === 'pending' && value.code === 'EIO'));
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).phase, 'prepared'); assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).original, original.toString('utf8'));
        assert.equal(result.durability.atomicUnit, 'draft-path-removal-with-prepared-recovery'); assert.equal(result.durability.powerLoss, 'unproved'); assert.equal(result.durability.arbitraryEditorCAS, false);
        const recovered = await f.core.executeOperation(request, f.authority({ canDelete: true })); assert.equal(recovered.primary.status, 'saved'); assert.equal(recovered.primary.replayed, true);
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).phase, 'complete');
    }),
    test('TC-TPT-130', 'prepared recovery refuses changed replacements and completed replay never removes a new replacement', async f => {
        await f.create(); const record = f.record('TASK-101'); const original = f.bytes('TASK-101'); const request = await preparedRequest(f);
        const target = path.join(f.root, record.ownerPath); const recovery = path.join(f.root, recoveryPath(request.operationId));
        refused(await withFsFailure('unlinkSync', args => args[0] === target, () => f.core.executeOperation(request, f.authority({ canDelete: true }))), 'EIO');
        const replacement = Buffer.concat([original, Buffer.from('Later external authored note\n')]); fs.writeFileSync(target, replacement);
        refused(await f.core.executeOperation(request, f.authority({ canDelete: true })), 'CONFLICT'); assert.deepEqual(fs.readFileSync(target), replacement);
        // Restore only this owned interrupted fixture to its retained original.
        fs.writeFileSync(target, original); assert.equal((await f.core.executeOperation(request, f.authority({ canDelete: true }))).primary.deleted, true);
        fs.writeFileSync(target, replacement); const replay = await f.core.executeOperation(request, f.authority({ canDelete: true })); assert.equal(replay.primary.replayed, true); assert.deepEqual(fs.readFileSync(target), replacement);
        assert.equal(JSON.parse(fs.readFileSync(recovery, 'utf8')).original, original.toString('utf8'));
    }),
    test('TC-TPT-130', 'expired deletion recovery discloses unknown replay rather than inventing completion', async f => {
        await f.create(); const request = await preparedRequest(f); assert.equal((await f.core.executeOperation(request, f.authority({ canDelete: true }))).primary.deleted, true);
        fs.unlinkSync(path.join(f.root, recoveryPath(request.operationId)));
        refused(await f.core.executeOperation(request, f.authority({ canDelete: true })), 'REPLAY_UNKNOWN'); assert.equal(f.records().length, 0);
    }),
    test('TC-TPT-130', 'canceled or retired work is deleted entirely by its own explicit action with reason and preview, and stays recoverable', async f => {
        await f.create('TASK-OPEN'); await f.active('TASK-OPEN');
        await f.create('TASK-CANCELED'); await f.active('TASK-CANCELED'); await f.saved('transition', 'TASK-CANCELED', { state: 'canceled', reason: 'No longer needed' });
        await f.create('TASK-RETIRED'); await f.accepted('TASK-RETIRED'); await f.saved('retire', 'TASK-RETIRED', { reason: 'Superseded outcome' });
        const open = f.bytes('TASK-OPEN'); const scopeBefore = f.progress().metrics.total;
        for (const [id, expected] of [['TASK-CANCELED', { state: 'canceled', retired: false, proofs: 0, acceptanceDecisions: 0 }], ['TASK-RETIRED', { state: 'done', retired: true, proofs: 1, acceptanceDecisions: 1 }]]) {
            const record = f.record(id); const original = f.bytes(id); const request = f.request('delete', id, { reason: 'Ended work no longer needs a record' });
            // The draft action keeps its narrow meaning; ended work needs its own action, a reason and a current preview.
            refused(await f.core.executeOperation(request, f.authority({ canDelete: true })), 'USE_RETIREMENT');
            refused(await f.core.executeOperation({ ...request, patch: { reason: '' } }, f.authority({ canDeleteEnded: true })), 'NOT_PERMITTED');
            refused(await f.core.executeOperation(request, f.authority({ canDeleteEnded: true, automatic: true, linkedItemIds: [id] })), 'NOT_PERMITTED');
            refused(await f.core.executeOperation(request, f.authority({ canDeleteEnded: true })), 'PREVIEW_REQUIRED'); assert.deepEqual(f.bytes(id), original);
            const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDeleteEnded: true }));
            assert.equal(preview.primary.status, 'preview'); assert.equal(preview.proposed.deleted, true); assert.deepEqual(f.bytes(id), original);
            // The preview states what leaves the checkout with the record.
            assert.equal(preview.primary.removes.state, expected.state); assert.equal(preview.primary.removes.retired, expected.retired);
            assert.equal(preview.primary.removes.proofs, expected.proofs); assert.equal(preview.primary.removes.acceptanceDecisions, expected.acceptanceDecisions);
            assert.equal(preview.primary.removes.historyEntries, record.tracking.history.length); assert.ok(preview.primary.removes.historyEntries > 3);
            const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDeleteEnded: true }));
            assert.equal(saved.primary.status, 'saved'); assert.equal(saved.primary.deleted, true); assert.equal(saved.primary.ended, true);
            assert.equal(fs.existsSync(path.join(f.root, record.ownerPath)), false);
            const value = JSON.parse(fs.readFileSync(path.join(f.root, recoveryPath(request.operationId)), 'utf8'));
            assert.equal(value.phase, 'complete'); assert.equal(value.original, original.toString('utf8'));
            const replay = await f.core.executeOperation(request, f.authority({ canDeleteEnded: true })); assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.deleted, true);
        }
        // Ended work was already outside the delivery scope, so the scope and every other record are unchanged.
        assert.deepEqual(f.records().map(record => record.id), ['TASK-OPEN']); assert.deepEqual(f.bytes('TASK-OPEN'), open); assert.equal(f.progress().metrics.total, scopeBefore);
    }),
    test('TC-TPT-130', 'open, started and accepted work is refused for entire deletion until it is canceled or retired', async f => {
        await f.create('TASK-PLANNED'); await f.saved('transition', 'TASK-PLANNED', { state: 'planned' });
        await f.create('TASK-ACTIVE'); await f.active('TASK-ACTIVE');
        await f.create('TASK-VERIFYING'); await f.verifying('TASK-VERIFYING');
        await f.create('TASK-ACCEPTED'); await f.accepted('TASK-ACCEPTED');
        await f.create('TASK-ASSIGNED'); await f.saved('assign', 'TASK-ASSIGNED', { assigneeId: 'owner' });
        for (const id of ['TASK-PLANNED', 'TASK-ACTIVE', 'TASK-VERIFYING', 'TASK-ACCEPTED', 'TASK-ASSIGNED']) {
            const before = f.bytes(id);
            for (const preview of [true, false]) refused(await f.perform('delete', id, { reason: 'Requested removal' }, preview ? { preview: true } : {}, { canDeleteEnded: true, canDelete: true }), 'USE_RETIREMENT');
            assert.deepEqual(f.bytes(id), before);
        }
        assert.equal(f.records().length, 5); assert.equal(f.progress().metrics.accepted, 1);
        // The wider action still covers an untouched draft, and adds nothing to its preview or result.
        await f.create('TASK-DRAFT'); const request = f.request('delete', 'TASK-DRAFT', { reason: 'Accidental draft' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal(preview.primary.removes, undefined);
        const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDeleteEnded: true }));
        assert.equal(saved.primary.deleted, true); assert.equal(saved.primary.ended, undefined); assert.equal(f.records().length, 5);
    }),
    test('TC-TPT-130', 'ended work that another record still points to is refused without cascading and is deletable once that link is removed', async f => {
        await f.create('TASK-REF'); await f.create('TASK-OWNER'); await f.saved('link', 'TASK-OWNER', { links: [{ relation: 'dependency', itemId: 'TASK-REF' }] });
        await f.saved('retire', 'TASK-REF', { reason: 'Superseded' });
        await f.create('TASK-MEMBER'); await f.create('PROJECT-1', 'project'); await f.saved('group', 'PROJECT-1', { memberItemIds: ['TASK-MEMBER'] });
        await f.saved('retire', 'TASK-MEMBER', { reason: 'Out of scope' });
        for (const [id, referrer] of [['TASK-REF', 'TASK-OWNER'], ['TASK-MEMBER', 'PROJECT-1']]) {
            const before = f.bytes(id); const referrerBefore = f.bytes(referrer);
            const result = await f.perform('delete', id, { reason: 'Requested removal' }, { preview: true }, { canDeleteEnded: true });
            refused(result, 'REFERENCED_WORK'); assert.ok(result.primary.reason.includes(referrer), result.primary.reason);
            assert.deepEqual(f.bytes(id), before); assert.deepEqual(f.bytes(referrer), referrerBefore);
        }
        // The person removes the link at its owner; the deletion itself never edits another record.
        await f.saved('link', 'TASK-OWNER', { links: [] }); const owner = f.bytes('TASK-OWNER');
        const request = f.request('delete', 'TASK-REF', { reason: 'Requested removal' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal((await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDeleteEnded: true }))).primary.deleted, true);
        assert.deepEqual(f.bytes('TASK-OWNER'), owner);
        // A retired group that lists members is deleted without touching them; the configured project health owner is not.
        await f.saved('retire', 'PROJECT-1', { reason: 'Grouping no longer used' }); const member = f.bytes('TASK-MEMBER');
        const group = f.request('delete', 'PROJECT-1', { reason: 'Requested removal' });
        const groupPreview = await f.core.executeOperation({ ...group, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal(groupPreview.primary.removes.members, 1);
        assert.equal((await f.core.executeOperation({ ...group, previewToken: groupPreview.previewToken }, f.authority({ canDeleteEnded: true }))).primary.deleted, true);
        assert.deepEqual(f.bytes('TASK-MEMBER'), member);
        await f.create('PROJECT-HEALTH', 'project'); await f.saved('retire', 'PROJECT-HEALTH', { reason: 'Replaced' });
        f.config.taskTracking.healthOwnerId = 'PROJECT-HEALTH'; f.saveConfig();
        const health = await f.perform('delete', 'PROJECT-HEALTH', { reason: 'Requested removal' }, { preview: true }, { canDeleteEnded: true });
        refused(health, 'REFERENCED_WORK'); assert.match(health.primary.reason, /project health owner/);
    }),
    test('TC-TPT-130', 'an untouched draft named as the configured project health owner is refused by both deletion actions until another owner is chosen', async f => {
        await f.create(); const original = f.bytes('TASK-101');
        f.config.taskTracking.healthOwnerId = 'TASK-101'; f.saveConfig();
        for (const action of [{ canDelete: true }, { canDeleteEnded: true }]) for (const preview of [true, false]) {
            const result = await f.perform('delete', 'TASK-101', { reason: 'Accidental draft' }, preview ? { preview: true } : {}, action);
            refused(result, 'REFERENCED_WORK'); assert.match(result.primary.reason, /project health owner/); assert.deepEqual(f.bytes('TASK-101'), original);
        }
        delete f.config.taskTracking.healthOwnerId; f.saveConfig();
        const request = f.request('delete', 'TASK-101', { reason: 'Accidental draft' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDelete: true }));
        assert.equal((await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDelete: true }))).primary.deleted, true);
    }),
    test('TC-TPT-130', 'a path link written with the other separator still counts as a reference to the work it names', async f => {
        // Both spellings name one file for every path reader, so neither may hide a reference from a deletion.
        await f.create('TASK-REF'); await f.saved('retire', 'TASK-REF', { reason: 'Superseded' }); await f.create('TASK-DRAFT');
        const other = id => f.record(id).ownerPath.replace(/\//g, '\\');
        await f.create('TASK-OWNER'); await f.saved('link', 'TASK-OWNER', { links: [{ relation: 'plan', path: other('TASK-REF') }, { relation: 'plan', path: other('TASK-DRAFT') }] });
        assert.ok(f.record('TASK-OWNER').tracking.links.every(link => link.path.includes('\\') && !link.path.includes('/')));
        const ended = f.bytes('TASK-REF'); const draft = f.bytes('TASK-DRAFT'); const owner = f.bytes('TASK-OWNER');
        const result = await f.perform('delete', 'TASK-REF', { reason: 'Requested removal' }, { preview: true }, { canDeleteEnded: true });
        refused(result, 'REFERENCED_WORK'); assert.ok(result.primary.reason.includes('TASK-OWNER'), result.primary.reason);
        refused(await f.perform('delete', 'TASK-DRAFT', { reason: 'Requested removal' }, { preview: true }, { canDelete: true }), 'USE_RETIREMENT');
        assert.deepEqual(f.bytes('TASK-REF'), ended); assert.deepEqual(f.bytes('TASK-DRAFT'), draft); assert.deepEqual(f.bytes('TASK-OWNER'), owner);
    }),
    test('TC-TPT-130', 'ended work as large as the per-record budget allows is deleted and its recovery journal keeps the exact original', async f => {
        await f.create(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'No longer needed' });
        // Control characters are the worst case for the journal: one byte in the record, six once embedded as JSON text.
        const record = f.record('TASK-101'); const saved = f.bytes('TASK-101');
        f.write(record.ownerPath, Buffer.concat([saved, Buffer.alloc(LIMITS.recordBytes - saved.length, 1)]));
        const original = f.bytes('TASK-101'); assert.equal(original.length, LIMITS.recordBytes);
        const request = f.request('delete', 'TASK-101', { reason: 'Ended work no longer needs a record' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal(preview.primary.status, 'preview', JSON.stringify(preview.primary));
        const result = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDeleteEnded: true }));
        assert.equal(result.primary.status, 'saved', JSON.stringify(result.primary)); assert.equal(result.primary.deleted, true);
        assert.equal(result.secondary.some(entry => entry.kind === 'deletion-recovery'), false, JSON.stringify(result.secondary));
        assert.equal(fs.existsSync(path.join(f.root, record.ownerPath)), false);
        const journal = fs.readFileSync(path.join(f.root, recoveryPath(request.operationId))); const value = JSON.parse(journal);
        assert.ok(journal.length > LIMITS.recordBytes * 5); assert.equal(value.phase, 'complete'); assert.ok(Buffer.from(value.original).equals(original));
        const replay = await f.core.executeOperation(request, f.authority({ canDeleteEnded: true }));
        assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.deleted, true);
    }),
    test('TC-TPT-130', 'a preview of ended work conflicts with a later saved change to that work and leaves it in place', async f => {
        await f.create(); await f.active(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'No longer needed' });
        const request = f.request('delete', 'TASK-101', { reason: 'Ended work no longer needs a record' });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal(preview.primary.status, 'preview'); assert.equal(preview.primary.removes.state, 'canceled');
        await f.saved('update', 'TASK-101', { title: 'Later actor edit' }); const before = f.bytes('TASK-101');
        refused(await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority({ canDeleteEnded: true })), 'CONFLICT');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(fs.existsSync(path.join(f.root, recoveryPath(request.operationId))), false);
        // A fresh review of the changed work is what removes it.
        const fresh = f.request('delete', 'TASK-101', { reason: 'Reviewed the later change' });
        const current = await f.core.executeOperation({ ...fresh, preview: true }, f.authority({ canDeleteEnded: true }));
        assert.equal((await f.core.executeOperation({ ...fresh, previewToken: current.previewToken }, f.authority({ canDeleteEnded: true }))).primary.deleted, true);
    })
] };
