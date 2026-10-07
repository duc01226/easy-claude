'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');

async function assignmentScope(f) {
    f.config.taskTracking.members.push({ id: 'recipient', displayName: 'Recipient', active: true }, { id: 'coordinator', displayName: 'Coordinator', active: true });
    f.saveConfig();
    for (const id of ['STORY-101', 'STORY-102', 'STORY-103']) await f.create(id, 'story');
    await f.accepted('STORY-101'); await f.verifying('STORY-102');
    await f.saved('proof', 'STORY-102', { proof: f.proof('STORY-102') });
    await f.saved('assign', 'STORY-102', { assigneeId: 'peer' }); await f.saved('assign', 'STORY-103', { assigneeId: 'peer' });
    await f.create('PROJECT-101', 'project'); await f.saved('group', 'PROJECT-101', { memberItemIds: ['STORY-101', 'STORY-102', 'STORY-103'] });
    await f.saved('assign', 'PROJECT-101', { assigneeId: 'coordinator' });
    return { selected: ['STORY-101', 'STORY-102'], controls: new Map(['STORY-103', 'PROJECT-101'].map(id => [id, f.bytes(id)])) };
}

function assignedWithoutPromotion(f, id, before) {
    const after = f.record(id);
    assert.equal(after.tracking.assigneeId, 'recipient'); assert.equal(after.data.assigned_to, 'recipient');
    assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(after.data, { ...before.data, assigned_to: 'recipient', tracking: after.tracking });
    assert.equal(after.body, before.body); assert.equal(after.ownerPath, before.ownerPath);
    for (const field of Object.keys(before.tracking).filter(key => !['revision', 'assigneeId', 'history', 'receipts', 'context'].includes(key)))
        assert.deepEqual(after.tracking[field], before.tracking[field], `${id} retains ${field}`);
    assert.equal(after.tracking.history.length, before.tracking.history.length + 1);
    assert.equal(after.tracking.receipts.length, before.tracking.receipts.length + 1);
    assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
    assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
    assert.equal(after.tracking.history.at(-1).operation, 'assign');
    assert.equal(after.tracking.history.at(-1).afterAssigneeId, 'recipient');
    assert.deepEqual(after.tracking.context, { operationId: after.tracking.receipts.at(-1).operationId, kind: 'direct' });
    assert.deepEqual(after.tracking.history.at(-1).context, after.tracking.context);
}

// Participation names describe this fixture's actors; only the real caller's
// capabilities grant authority. Each native case gets its own disposable checkout.
async function permittedScopedEdit(f, actor, displayName, id) {
    f.config.taskTracking.members.push({ id: actor, displayName, active: true }); f.saveConfig();
    await f.create(id); await f.saved('assign', id, { assigneeId: 'owner' });
    await f.create('TASK-access-control'); await f.accepted('TASK-access-control');
    const before = f.record(id); const metrics = f.progress().metrics;
    const other = f.bytes('TASK-access-control');
    const config = new Map(['docs/project-config.json', '.claude/.ck.local.json']
        .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
    const patch = { title: 'Export filtered records', intent: 'People can export only records matching current filters.' };
    const request = f.request('update', id, patch, { actor: { memberId: actor } }); const draft = JSON.stringify(request);
    const authority = f.authority({ actor, canWrite: true, canReview: false, canAccept: false });
    const result = await f.core.executeOperation(request, authority);
    assert.equal(result.primary.status, 'saved'); assert.equal(result.primary.itemId, id);
    assert.equal(result.primary.operationId, request.operationId); assert.equal(result.primary.replayed, false);
    const after = f.record(id); const view = f.view(id);
    assert.equal(after.ownerPath, before.ownerPath); assert.equal(after.body, before.body);
    assert.deepEqual(after.data, { ...before.data, ...patch, tracking: after.tracking });
    assert.equal(after.revision, before.revision + 1); assert.equal(result.primary.contentHash, after.contentHash);
    for (const field of Object.keys(before.tracking).filter(key => !['revision', 'history', 'receipts', 'context'].includes(key)))
        assert.deepEqual(after.tracking[field], before.tracking[field], `${id}:${field}`);
    assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
    assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
    assert.equal(after.tracking.history.length, before.tracking.history.length + 1);
    assert.equal(after.tracking.receipts.length, before.tracking.receipts.length + 1);
    assert.deepEqual(after.tracking.context, { operationId: request.operationId, kind: 'direct' });
    assert.equal(after.tracking.history.at(-1).actor, actor); assert.equal(after.tracking.history.at(-1).operation, 'update');
    assert.equal(after.tracking.history.at(-1).operationId, request.operationId);
    assert.deepEqual(after.tracking.history.at(-1).context, after.tracking.context);
    assert.equal(after.tracking.receipts.at(-1).operationId, request.operationId);
    assert.equal(after.tracking.receipts.at(-1).result.itemId, id);
    assert.equal(view.title, patch.title); assert.equal(view.intent, patch.intent);
    assert.equal(view.state, 'draft'); assert.equal(view.assigneeId, 'owner'); assert.equal(view.acceptance.accepted, false);
    assert.deepEqual(view.history, after.tracking.history); assert.deepEqual(f.progress().metrics, metrics);
    assert.deepEqual(f.bytes('TASK-access-control'), other);
    for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
    assert.equal(JSON.stringify(request), draft);
    // A participation label cannot rescue the same actor after write authority is absent.
    const denied = f.request('update', id, { title: 'Unpermitted broader edit' }, { actor: { memberId: actor } });
    const deniedDraft = JSON.stringify(denied); const savedBytes = f.bytes(id);
    const refusal = await f.core.executeOperation(denied, { ...authority, canWrite: false });
    refused(refusal, 'NOT_PERMITTED'); assert.deepEqual(refusal.secondary, []);
    assert.deepEqual(f.bytes(id), savedBytes); assert.deepEqual(f.view(id), view);
    assert.deepEqual(f.bytes('TASK-access-control'), other); assert.deepEqual(f.progress().metrics, metrics);
    for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
    assert.equal(JSON.stringify(denied), deniedDraft);
}

// Strict-default source carriers. These tests prove only the named boundary;
// browser, native, shared-baseline and workflow journeys have separate owners.
module.exports = { name: 'Task tracking core integration', tests: [
    test('TC-TPT-021', 'contributor saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'contributor', 'Contributor', 'TASK-021');
    }),
    test('TC-TPT-023', 'coordinator saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'coordinator', 'Coordinator', 'TASK-023');
    }),
    test('TC-TPT-024', 'coordinator without current write access receives no receipt and preserves the permitted scoped read', async f => {
        f.config.taskTracking.members.push({ id: 'coordinator', displayName: 'Coordinator', active: true }); f.saveConfig();
        await f.create('TASK-024'); await f.create('TASK-unrelated'); await f.accepted('TASK-unrelated');
        await f.create('PROJECT-024', 'project'); await f.saved('group', 'PROJECT-024', { memberItemIds: ['TASK-024'] });
        const before = f.record('TASK-024'); const view = f.view('TASK-024'); const metrics = f.progress().metrics;
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const config = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const scope = f.progress({ groupId: 'PROJECT-024' });
        assert.equal(scope.project.root, f.root); assert.equal(scope.source.kind, 'worktree');
        assert.equal(scope.coverage, 'complete'); assert.deepEqual(scope.scope.memberIds, ['TASK-024']);
        assert.deepEqual(scope.scope.eligibleTaskIds, ['TASK-024']); assert.equal(scope.metrics.total, 1);
        // A draft captured while work was readable is still refused by actual current authority.
        const request = f.request('update', 'TASK-024', { title: 'Forbidden coordinator edit' }, { actor: { memberId: 'coordinator' } });
        const draft = JSON.stringify(request);
        const result = await f.core.executeOperation(request, f.authority({ actor: 'coordinator', canWrite: false }));
        refused(result, 'NOT_PERMITTED'); assert.match(result.primary.reason, /not permitted.*workspace actor/);
        assert.deepEqual(result.secondary, []); assert.equal(result.current, undefined);
        const after = f.record('TASK-024');
        assert.equal(after.revision, before.revision); assert.equal(after.contentHash, before.contentHash);
        assert.deepEqual(after.data, before.data); assert.deepEqual(after.tracking, before.tracking);
        assert.deepEqual(after.tracking.history, before.tracking.history); assert.deepEqual(after.tracking.receipts, before.tracking.receipts);
        assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
        assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
        assert.deepEqual(f.view('TASK-024'), view); assert.deepEqual(f.progress().metrics, metrics);
        const reread = f.progress({ groupId: 'PROJECT-024' });
        assert.equal(reread.project.root, f.root); assert.equal(reread.coverage, 'complete');
        assert.deepEqual(reread.scope, scope.scope); assert.deepEqual(reread.metrics, scope.metrics);
        assert.deepEqual(reread.items.find(item => item.id === 'TASK-024'), view);
        // This selector is a read scope, not an invented per-role confidentiality policy.
        // A changed unavailable selection must not reuse the previous group's scope or totals.
        const missing = f.progress({ groupId: 'PROJECT-no-access-scope' });
        assert.equal(missing.coverage, 'unavailable'); assert.equal(missing.scope.coverage, 'unavailable');
        assert.deepEqual(missing.scope.memberIds, []); assert.equal(missing.metrics, null);
        assert.ok(missing.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
        for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
        for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
        assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-025', 'assistant saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'assistant', 'Assistant', 'TASK-025');
    }),
    test('TC-TPT-104', 'reasonless blocking immediately preserves active work, historical proof and delivery facts', async f => {
        // Given real accepted work explicitly reopened to In progress, with a
        // separate accepted owner making accidental delivery-credit changes visible.
        const id = 'TASK-104'; const controlId = 'TASK-104-control';
        await f.create(id); await f.accepted(id);
        await f.saved('transition', id, { state: 'in_progress', reason: 'Explicit follow-up work' });
        await f.create(controlId); await f.accepted(controlId);
        const before = f.record(id); const view = f.view(id); const metrics = f.progress().metrics;
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const configBytes = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        assert.equal(before.data.status, 'in_progress'); assert.equal(view.blocker, null);
        assert.equal(before.tracking.acceptanceHistory.length, 1); assert.equal(before.tracking.proofs.length, 1);
        assert.equal(view.acceptance.accepted, false); assert.equal(view.acceptance.historyCount, 1);
        assert.equal(metrics.coverage, 'complete'); assert.equal(metrics.accepted, 1); assert.equal(metrics.currentlyVerified, 1);
        assert.equal(metrics.total, 2);
        // When the real public core receives absent, empty or whitespace-only reasons.
        for (const patch of [{ state: 'blocked' }, { state: 'blocked', reason: '' }, { state: 'blocked', reason: '   ' }]) {
            const request = f.request('transition', id, patch); const draft = JSON.stringify(request);
            const result = await f.core.executeOperation(request, f.authority());
            refused(result, 'INVALID_INPUT'); assert.match(result.primary.reason, /observed reason/);
            assert.deepEqual(result.secondary, []);
            // Then inspect immediately: no later valid action can mask a refused write.
            const after = f.record(id);
            assert.equal(after.data.status, 'in_progress'); assert.equal(after.revision, before.revision);
            assert.equal(after.contentHash, before.contentHash); assert.equal(after.ownerPath, before.ownerPath);
            assert.deepEqual(after.data, before.data); assert.deepEqual(after.tracking, before.tracking);
            assert.deepEqual(after.tracking.history, before.tracking.history);
            assert.deepEqual(after.tracking.receipts, before.tracking.receipts);
            assert.deepEqual(after.tracking.proofs, before.tracking.proofs);
            assert.deepEqual(after.tracking.acceptanceHistory, before.tracking.acceptanceHistory);
            assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
            assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
            assert.deepEqual(f.view(id), view); assert.deepEqual(f.progress().metrics, metrics);
            assert.deepEqual(f.records().map(record => record.id).sort(), [...owners.keys()].sort());
            for (const [ownerId, bytes] of owners) assert.deepEqual(f.bytes(ownerId), bytes, ownerId);
            for (const [relative, bytes] of configBytes) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.equal(JSON.stringify(request), draft);
        }
    }),
    test('TC-TPT-134', 'accepted scope needs explicit reopening and copied outcomes cannot inherit another owner acceptance', async f => {
        // Given accepted work obtained through the public lifecycle/proof/accept path.
        // The bounded domain covers changed text, added criteria and replaced scope;
        // it does not claim exhaustive proof over every possible authored outcome.
        const partitions = [
            { name: 'changed-text', criteria: [{ id: 'selected-rows', text: 'Export only rows matching the new filter' }] },
            { name: 'added-criterion', criteria: [
                { id: 'selected-rows', text: 'Export contains exactly the selected rows' },
                { id: 'header', text: 'Export includes the requested header' }
            ] },
            { name: 'replaced-scope', criteria: [{ id: 'summary', text: 'Export an aggregate summary instead of selected rows' }] }
        ];
        const configBytes = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const ownerBytes = () => new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const unchangedOwners = owners => {
            for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
        };
        const unchangedConfig = () => {
            for (const [relative, bytes] of configBytes) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
        };
        const controlId = 'TASK-134-control'; await f.create(controlId); await f.accepted(controlId);
        const controlView = f.view(controlId); let importCandidate;
        for (const partition of partitions) {
            const id = `TASK-134-${partition.name}`;
            await f.create(id); await f.accepted(id);
            const done = f.record(id); const doneView = f.view(id); const doneMetrics = f.progress().metrics;
            const owners = ownerBytes();
            assert.equal(done.data.status, 'done'); assert.equal(doneView.acceptance.accepted, true);
            assert.equal(doneView.acceptance.historyCount, 1); assert.equal(doneView.verification.status, 'current');
            assert.equal(doneMetrics.coverage, 'complete'); assert.equal(doneMetrics.accepted, 2);
            assert.equal(doneMetrics.currentlyVerified, 2);
            // When a materially changed criterion is proposed while the scope is Done.
            const denied = f.request('update', id, { criteria: partition.criteria }); const deniedDraft = JSON.stringify(denied);
            const refusal = await f.core.executeOperation(denied, f.authority());
            refused(refusal, 'REOPEN_REQUIRED'); assert.deepEqual(refusal.secondary, []);
            // Then immediately conserve bytes, history, receipts and delivery facts.
            const retained = f.record(id);
            assert.equal(retained.revision, done.revision); assert.equal(retained.contentHash, done.contentHash);
            assert.deepEqual(retained.data, done.data); assert.deepEqual(retained.tracking, done.tracking);
            assert.ok(!retained.tracking.history.some(entry => entry.operationId === denied.operationId));
            assert.ok(!retained.tracking.receipts.some(entry => entry.operationId === denied.operationId));
            assert.deepEqual(f.view(id), doneView); assert.deepEqual(f.progress().metrics, doneMetrics);
            assert.deepEqual(f.records().map(record => record.id).sort(), [...owners.keys()].sort());
            unchangedOwners(owners); unchangedConfig(); assert.equal(JSON.stringify(denied), deniedDraft);
            // Explicit reopening withdraws current delivery credit but retains its history.
            const reopen = f.request('transition', id, { state: 'planned', reason: 'Explicit criteria amendment' });
            const reopenDraft = JSON.stringify(reopen); const reopenedResult = await f.core.executeOperation(reopen, f.authority());
            assert.equal(reopenedResult.primary.status, 'saved'); assert.equal(reopenedResult.primary.operationId, reopen.operationId);
            const reopened = f.record(id); const reopenedMetrics = f.progress().metrics;
            assert.equal(reopened.revision, done.revision + 1); assert.equal(reopened.ownerPath, done.ownerPath);
            assert.equal(reopened.body, done.body);
            assert.deepEqual(reopened.data, { ...done.data, status: 'planned', tracking: reopened.tracking });
            assert.deepEqual(reopened.tracking, { ...done.tracking, revision: done.revision + 1,
                context: reopened.tracking.context, history: reopened.tracking.history, receipts: reopened.tracking.receipts });
            assert.deepEqual(reopened.tracking.context, { operationId: reopen.operationId, kind: 'direct' });
            assert.deepEqual(reopened.tracking.history.slice(0, -1), done.tracking.history);
            assert.deepEqual(reopened.tracking.receipts.slice(0, -1), done.tracking.receipts);
            assert.equal(reopened.tracking.history.at(-1).operationId, reopen.operationId);
            assert.equal(reopened.tracking.history.at(-1).beforeState, 'done');
            assert.equal(reopened.tracking.history.at(-1).afterState, 'planned');
            assert.equal(reopened.tracking.history.at(-1).reason, reopen.patch.reason);
            assert.equal(reopened.tracking.receipts.at(-1).operationId, reopen.operationId);
            assert.equal(reopened.tracking.receipts.at(-1).afterRevision, reopened.revision);
            assert.equal(f.view(id).acceptance.accepted, false); assert.equal(f.view(id).acceptance.historyCount, 1);
            assert.equal(f.view(id).verification.status, 'current');
            assert.deepEqual(reopenedMetrics, { ...doneMetrics, accepted: doneMetrics.accepted - 1,
                currentlyVerified: doneMetrics.currentlyVerified - 1, remaining: doneMetrics.remaining + 1,
                percentage: (doneMetrics.accepted - 1) / doneMetrics.total * 100 });
            unchangedOwners(new Map([...owners].filter(([ownerId]) => ownerId !== id))); unchangedConfig();
            assert.equal(JSON.stringify(reopen), reopenDraft);
            // The permitted amendment retains historical certification of the old scope.
            const amendment = f.request('update', id, { criteria: partition.criteria }); const amendmentDraft = JSON.stringify(amendment);
            const amendedResult = await f.core.executeOperation(amendment, f.authority());
            assert.equal(amendedResult.primary.status, 'saved'); assert.equal(amendedResult.primary.operationId, amendment.operationId);
            const amended = f.record(id); const amendedView = f.view(id);
            assert.equal(amended.revision, done.revision + 2); assert.equal(amended.ownerPath, done.ownerPath); assert.equal(amended.body, done.body);
            assert.deepEqual(amended.data, { ...reopened.data, tracking: amended.tracking });
            assert.deepEqual(amended.tracking, { ...reopened.tracking, criteria: partition.criteria, revision: done.revision + 2,
                context: amended.tracking.context, history: amended.tracking.history, receipts: amended.tracking.receipts });
            assert.deepEqual(amended.tracking.context, { operationId: amendment.operationId, kind: 'direct' });
            assert.deepEqual(amended.tracking.history.slice(0, -1), reopened.tracking.history);
            assert.deepEqual(amended.tracking.receipts.slice(0, -1), reopened.tracking.receipts);
            assert.equal(amended.tracking.history.at(-1).operation, 'update');
            assert.equal(amended.tracking.history.at(-1).operationId, amendment.operationId);
            assert.equal(amended.tracking.receipts.at(-1).operationId, amendment.operationId);
            assert.equal(amended.tracking.receipts.at(-1).afterRevision, amended.revision);
            assert.deepEqual(amended.tracking.proofs, done.tracking.proofs);
            assert.deepEqual(amended.tracking.acceptanceHistory, done.tracking.acceptanceHistory);
            assert.equal(amendedView.acceptance.accepted, false); assert.equal(amendedView.acceptance.historyCount, 1);
            assert.equal(amendedView.verification.status, 'stale');
            assert.notEqual(amendedView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
            assert.deepEqual(f.progress().metrics, reopenedMetrics); assert.deepEqual(f.view(controlId), controlView);
            unchangedOwners(new Map([...owners].filter(([ownerId]) => ownerId !== id))); unchangedConfig();
            assert.equal(JSON.stringify(amendment), amendmentDraft);
            // Use actual CREATE, not an invented clone/split API. Identical visible
            // scope and a materially new copied outcome both start Draft/unaccepted.
            for (const copied of [
                { suffix: 'exact-copy', intent: done.data.intent, criteria: done.tracking.criteria },
                { suffix: 'new-outcome', intent: `${done.data.intent}; deliver the separately amended outcome`, criteria: partition.criteria }
            ]) {
                const beforeCreate = ownerBytes(); const metrics = f.progress().metrics; const copyId = `${id}-${copied.suffix}`;
                const createdResult = await f.create(copyId, 'task', { title: done.data.title, intent: copied.intent, criteria: copied.criteria });
                const created = f.record(copyId); const createdView = f.view(copyId); const afterCreate = f.progress().metrics;
                assert.equal(created.data.status, 'draft'); assert.equal(created.revision, 1);
                assert.equal(created.data.title, done.data.title); assert.equal(created.data.intent, copied.intent);
                assert.deepEqual(created.tracking.criteria, copied.criteria);
                assert.deepEqual(created.tracking.proofs, []); assert.deepEqual(created.tracking.acceptanceHistory, []);
                assert.equal(createdView.acceptance.accepted, false); assert.equal(createdView.acceptance.historyCount, 0);
                assert.equal(createdView.verification.status, 'missing');
                assert.equal(created.tracking.history.length, 1); assert.equal(created.tracking.history[0].operation, 'create');
                assert.equal(created.tracking.history[0].afterState, 'draft');
                assert.equal(created.tracking.history[0].operationId, createdResult.primary.operationId);
                assert.equal(created.tracking.receipts.length, 1); assert.equal(created.tracking.receipts[0].result.itemId, copyId);
                assert.equal(created.tracking.receipts[0].operationId, createdResult.primary.operationId);
                assert.equal(afterCreate.accepted, metrics.accepted); assert.equal(afterCreate.currentlyVerified, metrics.currentlyVerified);
                assert.equal(afterCreate.total, metrics.total + 1); assert.equal(afterCreate.remaining, metrics.remaining + 1);
                assert.equal(afterCreate.coverage, 'complete'); assert.equal(afterCreate.percentage, metrics.accepted / afterCreate.total * 100);
                assert.deepEqual(afterCreate.eligibleIds, [...metrics.eligibleIds, copyId].sort());
                unchangedOwners(beforeCreate); unchangedConfig();
                if (copied.suffix === 'exact-copy') {
                    assert.equal(createdView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
                    importCandidate = { created, original: done };
                } else assert.notEqual(createdView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
            }
        }
        // Deliberate corruption fixture: a hand-edited/imported file can copy another
        // owner's acceptance and proof. This is a fail-safe boundary, not a valid
        // capture sequence or an available clone API. Keep its original itemId so
        // even identical current criteria/proof cannot manufacture owner certification.
        const { patchRecord } = require('../../lib/task-artifact-store.cjs');
        const { created, original } = importCandidate; const otherOwners = ownerBytes(); otherOwners.delete(created.id);
        const beforeImportMetrics = f.progress().metrics;
        f.write(created.ownerPath, patchRecord(created, { status: 'done' }, { ...created.tracking,
            proofs: original.tracking.proofs, acceptanceHistory: original.tracking.acceptanceHistory }).bytes);
        const corrupted = f.record(created.id); const snapshot = f.progress(); const corruptedView = f.view(created.id);
        assert.equal(corrupted.tracking.acceptanceHistory[0].itemId, original.id);
        assert.notEqual(corrupted.id, original.id); assert.equal(corruptedView.verification.status, 'current');
        assert.equal(corruptedView.verification.criteriaIdentity, original.tracking.acceptanceHistory[0].criteriaIdentity);
        assert.equal(corruptedView.acceptance.accepted, false); assert.equal(corruptedView.acceptance.historyCount, 0);
        assert.equal(snapshot.coverage, 'partial'); assert.equal(snapshot.metrics.percentage, null);
        assert.ok(snapshot.diagnostics.some(diagnostic => diagnostic.code === 'INVALID_RECORD' && diagnostic.itemId === created.id));
        assert.equal(snapshot.metrics.accepted, beforeImportMetrics.accepted); assert.equal(snapshot.metrics.accepted, 1);
        assert.equal(snapshot.metrics.currentlyVerified, beforeImportMetrics.currentlyVerified);
        assert.equal(snapshot.metrics.total, beforeImportMetrics.total); assert.deepEqual(snapshot.metrics.eligibleIds, beforeImportMetrics.eligibleIds);
        unchangedOwners(otherOwners); unchangedConfig();
        const request = f.request('update', created.id, { priority: 1 }); const draft = JSON.stringify(request);
        const result = await f.core.executeOperation(request, f.authority());
        refused(result, 'INVALID_RECORD'); assert.match(result.primary.reason, /acceptance/i); assert.deepEqual(result.secondary, []);
        const after = f.record(created.id);
        assert.deepEqual(f.bytes(created.id), corrupted.bytes); assert.equal(after.revision, corrupted.revision);
        assert.equal(after.contentHash, corrupted.contentHash); assert.deepEqual(after.data, corrupted.data);
        assert.deepEqual(after.tracking, corrupted.tracking); assert.deepEqual(f.view(created.id), corruptedView);
        assert.deepEqual(f.progress().metrics, snapshot.metrics); assert.deepEqual(f.view(controlId), controlView);
        assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
        assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
        unchangedOwners(otherOwners); unchangedConfig(); assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-161', 'catalogue describes all current operation fields without granting authority or changing its validator', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        const expected = { create: ['title', 'intent', 'criteria'], update: ['title', 'intent', 'priority', 'criteria', 'optOut'],
            adopt: [], assign: ['assigneeId', 'collaboratorIds'], link: ['links'], group: ['memberItemIds', 'groupRole'],
            transition: ['state', 'reason', 'resolution', 'readiness', 'correction'], proof: ['proof'], accept: ['reason'],
            retire: ['reason'], restore: ['reason'], activity: ['observation'], attest: ['health'], delete: ['reason'] };
        const catalogue = f.core.operationCatalogue();
        assert.equal(catalogue.defaultPurpose, 'inspect');
        assert.deepEqual(Object.fromEntries(catalogue.operations.map(value => [value.name, value.patchKeys])), expected);
        assert.equal(catalogue.operations.find(value => value.name === 'transition').cli.correctionFlag, '--change-state');
        assert.deepEqual(catalogue.request.fields, ['schemaVersion', 'operation', 'operationId', 'target', 'expected', 'actor', 'patch', 'context', 'preview', 'previewToken']);
        assert.deepEqual(catalogue.request.shapes.proof, ['id', 'kind', 'result', 'observedAt', 'criteriaIds', 'criteriaIdentity', 'sourceIdentity', 'summary']);
        assert.deepEqual(catalogue.operations.find(value => value.name === 'proof').cli,
            { available: true, kinds: ['manual'], flag: '--manual-proof', unavailableKinds: ['test', 'review'] });
        assert.equal(catalogue.operations.find(value => value.name === 'activity').cli.available, false);
        // Property over every advertised key: discovery is the validator's field surface,
        // not proof that arbitrary field values satisfy semantic/authority guards.
        for (const [operation, keys] of Object.entries(expected)) {
            for (const key of keys) assert.match(f.core.validateRequest(f.request(operation, 'TASK-101', { [key]: null })), /^[a-f0-9]{64}$/);
            const invalid = f.request(operation, 'TASK-101', { inventedPermission: true });
            assert.throws(() => f.core.validateRequest(invalid), error => error.code === 'INVALID_INPUT', operation);
        }
        for (const section of ['target', 'actor', 'expected', 'context']) {
            const request = f.request('update', 'TASK-101', {});
            request[section] = { ...(request[section] || { runId: 'actual-run', occurrenceId: 'actual-step' }), inventedPermission: true };
            assert.throws(() => f.core.validateRequest(request), error => error.code === 'INVALID_INPUT', section);
        }
        catalogue.operations[0].patchKeys.push('canAccept'); catalogue.request.shapes.actor.push('canWrite');
        assert.deepEqual(f.core.operationCatalogue().operations[0].patchKeys, expected.create);
        assert.deepEqual(f.core.operationCatalogue().request.shapes.actor, ['memberId']);
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-147', 'discovered proof and activity shapes cannot manufacture an actual verifier observation', async f => {
        await f.create(); await f.verifying(); const before = f.bytes('TASK-101');
        for (const kind of ['test', 'review']) {
            const proof = f.proof('TASK-101', { kind });
            refused(await f.perform('proof', 'TASK-101', { proof }), 'NOT_PERMITTED');
            refused(await f.perform('proof', 'TASK-101', { proof }, { observedProof: proof }), 'INVALID_INPUT');
        }
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Authored statement is not an observation', paths: [] };
        refused(await f.perform('activity', 'TASK-101', { observation }), 'NOT_PERMITTED');
        refused(await f.perform('activity', 'TASK-101', { observation }, { observation }), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'done' }), 'MISSING_PROOF');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.view('TASK-101').acceptance.accepted, false);
    }),
    test('TC-TPT-128', 'exact two-leaf assignment applies both stable owners and preserves unselected work, coordinator and proof', async f => {
        const { selected, controls } = await assignmentScope(f);
        const before = new Map(selected.map(id => [id, f.record(id)])); const metrics = f.progress().metrics;
        const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.atomicity, 'per-record');
        assert.equal(result.results.length, selected.length);
        for (let n = 0; n < selected.length; n++) {
            assert.equal(result.results[n].primary.status, 'saved'); assert.equal(result.results[n].primary.itemId, selected[n]);
            assignedWithoutPromotion(f, selected[n], before.get(selected[n]));
        }
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
        assert.deepEqual(f.progress().metrics, metrics);
        const savedBytes = new Map(selected.map(id => [id, f.bytes(id)]));
        const replay = await f.core.executeBatch(requests, f.authority());
        for (let n = 0; n < selected.length; n++) {
            assert.equal(replay.results[n].primary.replayed, true); assert.equal(replay.results[n].primary.itemId, selected[n]);
            assert.deepEqual(f.bytes(selected[n]), savedBytes.get(selected[n]));
        }
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
    }),
    test('TC-TPT-128', 'stale second-leaf assignment reports its refusal and exact retries conserve the successful sibling', async f => {
        const { selected, controls } = await assignmentScope(f);
        const before = f.record(selected[0]); const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        await f.saved('update', selected[1], { priority: 2 }); const secondBytes = f.bytes(selected[1]);
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.results.length, 2);
        assert.equal(result.results[0].primary.itemId, selected[0]); assert.equal(result.results[0].primary.status, 'saved');
        assignedWithoutPromotion(f, selected[0], before); refused(result.results[1], 'CONFLICT');
        assert.equal(f.record(selected[1]).tracking.assigneeId, 'peer'); assert.deepEqual(f.bytes(selected[1]), secondBytes);
        const firstBytes = f.bytes(selected[0]); const replay = await f.core.executeBatch(requests, f.authority());
        assert.equal(replay.results.length, 2); assert.equal(replay.results[0].primary.replayed, true); refused(replay.results[1], 'CONFLICT');
        assert.deepEqual(f.bytes(selected[0]), firstBytes); assert.deepEqual(f.bytes(selected[1]), secondBytes);
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
    }),
    test('TC-TPT-128', 'unproved whole native assignment footprint refuses both leaves and preserves every affected owner', async f => {
        const { selected } = await assignmentScope(f);
        const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        const paths = f.records().map(record => record.ownerPath);
        const sources = ['trackers/index.html', 'trackers/data.json', 'trackers/notes.md'];
        for (const source of sources) { f.write(source, `Synthetic inert native owner: ${source}`); paths.push(source); }
        const originals = new Map(paths.map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources }; f.saveConfig();
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.results.length, 2);
        for (const outcome of result.results) refused(outcome, 'UNPROVED_NATIVE_CAPABILITY');
        for (const [relative, bytes] of originals) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes);
        const snapshot = f.progress(); assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null);
        assert.deepEqual(snapshot.native.inventory.map(entry => entry.ownerPath).sort(), sources.slice().sort());
    }),
    test('TC-TPT-131', 'one native source larger than the per-file budget is named while the sources after it are still inventoried', async f => {
        const { LIMITS } = require('../../lib/task-tracking-config.cjs');
        const sources = ['trackers/a-index.html', 'trackers/b-oversize.json', 'trackers/c-notes.md'];
        f.write(sources[0], 'Synthetic inert native owner: first'); f.write(sources[1], Buffer.alloc(LIMITS.recordBytes + 1, 0x20)); f.write(sources[2], 'Synthetic inert native owner: third');
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources }; f.saveConfig();
        const snapshot = f.progress();
        assert.deepEqual(snapshot.native.inventory.map(entry => entry.ownerPath), [sources[0], sources[2]]);
        assert.deepEqual(snapshot.native.diagnostics.map(d => [d.path, d.code]), [[sources[1], 'LIMIT_EXCEEDED']]);
    }),
    test('TC-TPT-105', 'newer prerequisite failure withdraws start and resume eligibility while preserving accepted history', async f => {
        for (const result of ['failed', 'skipped']) {
            const dependency = `TASK-dependency-${result}`; const ready = `TASK-ready-${result}`; const blocked = `TASK-blocked-${result}`;
            await f.create(dependency); await f.accepted(dependency);
            await f.create(ready); await f.saved('assign', ready, { assigneeId: 'owner' });
            await f.saved('link', ready, { links: [{ relation: 'dependency', itemId: dependency }] }); await f.ready(ready);
            await f.create(blocked); await f.active(blocked);
            await f.saved('link', blocked, { links: [{ relation: 'dependency', itemId: dependency }] });
            await f.saved('transition', blocked, { state: 'blocked', reason: 'Dependency needs confirmation' });
            assert.ok(f.progress().ready.includes(ready));
            const acceptance = f.record(dependency).tracking.acceptanceHistory;
            await f.saved('proof', dependency, { proof: f.proof(dependency, { result, observedAt: '2026-01-03T00:00:00.000Z' }) });
            const readyBytes = f.bytes(ready); const blockedBytes = f.bytes(blocked);
            const snapshot = f.progress(); assert.equal(snapshot.ready.includes(ready), false);
            assert.match(snapshot.excluded.find(item => item.itemId === ready).reasons.join(' '), /prerequisite/i);
            refused(await f.perform('transition', ready, { state: 'in_progress' }), 'NOT_READY');
            refused(await f.perform('transition', blocked, { state: 'in_progress', resolution: 'Old passing evidence is insufficient' }), 'NOT_READY');
            assert.deepEqual(f.bytes(ready), readyBytes); assert.deepEqual(f.bytes(blocked), blockedBytes);
            assert.equal(f.record(dependency).data.status, 'done'); assert.deepEqual(f.record(dependency).tracking.acceptanceHistory, acceptance);
            assert.equal(f.view(dependency).acceptance.accepted, true); assert.equal(f.view(dependency).verification.status, 'stale');
            await f.saved('proof', dependency, { proof: f.proof(dependency, { observedAt: '2026-01-04T00:00:00.000Z' }) });
            assert.ok(f.progress().ready.includes(ready));
            await f.saved('transition', blocked, { state: 'in_progress', resolution: 'New passing evidence confirms prerequisite' });
            assert.equal(f.record(blocked).data.status, 'in_progress'); assert.equal(f.record(blocked).tracking.blocker, null);
        }
    }),
    test('TC-TPT-107', 'newer applicable failed or skipped proof withdraws current credit without erasing delivery', async f => {
        for (const result of ['failed', 'skipped']) {
            const id = `TASK-proof-${result}`; await f.create(id); await f.accepted(id);
            const acceptance = f.record(id).tracking.acceptanceHistory;
            await f.saved('proof', id, { proof: f.proof(id, { result, observedAt: '2026-01-03T00:00:00.000Z' }) });
            assert.equal(f.view(id).verification.status, 'stale');
            assert.equal(f.view(id).acceptance.accepted, true);
            assert.deepEqual(f.record(id).tracking.acceptanceHistory, acceptance);
            await f.saved('transition', id, { state: 'in_progress', reason: 'Reverify after a contradictory observation' });
            await f.saved('transition', id, { state: 'verifying' });
            const before = f.bytes(id);
            refused(await f.perform('accept', id, { reason: 'Old pass cannot certify current work' }), 'MISSING_PROOF');
            assert.deepEqual(f.bytes(id), before);
            await f.saved('proof', id, { proof: f.proof(id, { observedAt: '2026-01-04T00:00:00.000Z' }) });
            await f.saved('accept', id, { reason: 'New passing observation accepted' });
            assert.equal(f.view(id).verification.status, 'current');
            assert.equal(f.record(id).tracking.acceptanceHistory.length, 2);
            assert.equal(f.record(id).tracking.proofs.length, 3);
        }
        assert.equal(f.progress().metrics.accepted, 2); assert.equal(f.progress().metrics.currentlyVerified, 2);
    }),
    test('TC-TPT-107', 'latest observations are criterion scoped and tied contradictions cannot borrow a pass', async f => {
        await f.create('TASK-101', 'task', { criteria: [{ id: 'rows', text: 'Selected rows match' }, { id: 'header', text: 'Header included' }] });
        await f.verifying();
        const passing = f.proof('TASK-101'); await f.saved('proof', 'TASK-101', { proof: passing });
        for (const observedAt of [OBSERVED_AT, '2026-01-03T00:00:00.000Z']) {
            await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'failed', criteriaIds: ['rows'], observedAt }) });
            assert.equal(f.view('TASK-101').verification.status, 'stale');
        }
        const recovery = f.proof('TASK-101', { criteriaIds: ['rows'], observedAt: '2026-01-04T00:00:00.000Z' });
        await f.saved('proof', 'TASK-101', { proof: recovery });
        assert.equal(f.view('TASK-101').verification.status, 'current');
        assert.deepEqual(f.view('TASK-101').verification.proofIds.sort(), [passing.id, recovery.id].sort());
        // A later inserted but older observation cannot supersede actual latest proof.
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'skipped', criteriaIds: ['rows'] }) });
        assert.equal(f.view('TASK-101').verification.status, 'current');
        await f.saved('accept', 'TASK-101', { reason: 'Both latest criterion outcomes pass' });
        assert.equal(f.progress().metrics.currentlyVerified, 1);
    }),
    test('TC-TPT-001', 'capture creates one draft and no delivery credit', async f => {
        const result = await f.create('INITIATIVE-1', 'initiative');
        assert.equal(result.primary.revision, 1);
        assert.equal(f.record('INITIATIVE-1').data.status, 'draft');
        assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.records().length, 1);
        assert.equal(f.record('INITIATIVE-1').tracking.receipts.length, 1);
    }),
    test('TC-TPT-001', 'capture needs actual actor write authority', async f => {
        refused(await f.perform('create', 'TASK-101', { title: 'Requested work', intent: 'A defined outcome' }, {}, { canWrite: false }), 'NOT_PERMITTED');
        assert.equal(f.records().length, 0);
    }),
    test('TC-TPT-002', 'refinement retains lineage and cannot approve incomplete scope', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.create('TASK-101', 'task', { criteria: [] });
        await f.saved('link', 'TASK-101', { links: [{ relation: 'initiative', itemId: 'INITIATIVE-1' }] });
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } }), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), before);
        assert.deepEqual(f.record('TASK-101').tracking.links, [{ relation: 'initiative', itemId: 'INITIATIVE-1' }]);
    }),
    test('TC-TPT-003', 'Ready ordering is priority then identity and stale readiness is excluded', async f => {
        for (const id of ['TASK-104', 'TASK-901', 'TASK-900']) {
            await f.create(id); await f.ready(id);
            await f.saved('update', id, { priority: id === 'TASK-104' ? 2 : 1 });
        }
        assert.deepEqual(f.progress().ready, ['TASK-900', 'TASK-901', 'TASK-104']);
        await f.saved('update', 'TASK-900', { intent: 'A changed delivery scope' });
        assert.deepEqual(f.progress().ready, ['TASK-901', 'TASK-104']);
        assert.match(f.progress().excluded.find(item => item.itemId === 'TASK-900').reasons.join(' '), /readiness|unresolved/i);
    }),
    test('TC-TPT-004', 'starting requires a responsible active member and reviewed Ready scope', async f => {
        await f.create(); await f.ready();
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'INVALID_MEMBER');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('assign', 'TASK-101', { assigneeId: 'owner' });
        await f.saved('transition', 'TASK-101', { state: 'in_progress' });
        assert.equal(f.view('TASK-101').state, 'in_progress');
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-005', 'blocking and resuming retain the prior active state and require resolution', async f => {
        await f.create(); await f.active();
        refused(await f.perform('transition', 'TASK-101', { state: 'blocked' }), 'INVALID_INPUT');
        await f.saved('transition', 'TASK-101', { state: 'blocked', reason: 'External prerequisite unavailable' });
        const blocked = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying', resolution: 'Available now' }), 'INVALID_TRANSITION');
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'INVALID_TRANSITION');
        assert.deepEqual(f.bytes('TASK-101'), blocked);
        await f.saved('transition', 'TASK-101', { state: 'in_progress', resolution: 'Prerequisite restored' });
        assert.equal(f.record('TASK-101').data.status, 'in_progress');
        assert.equal(f.record('TASK-101').tracking.blocker, null);
    }),
    test('TC-TPT-006', 'acceptance requires applicable proof for every criterion and an actual decision', async f => {
        await f.create('TASK-101', 'task', { criteria: [
            { id: 'selected-rows', text: 'Selection matches export' }, { id: 'header', text: 'Header is included' }
        ] });
        await f.verifying(); const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'done' }), 'MISSING_PROOF');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { criteriaIds: ['selected-rows'] }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { criteriaIds: ['header'] }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }, {}, { canAccept: false }), 'NOT_PERMITTED');
        await f.saved('accept', 'TASK-101', { reason: 'Both outcomes observed' });
        assert.equal(f.view('TASK-101').state, 'done');
        assert.equal(f.view('TASK-101').acceptance.accepted, true);
        assert.equal(f.record('TASK-101').tracking.acceptanceHistory[0].proofIds.length, 2);
    }),
    test('TC-TPT-006', 'failed observations and forged runner proof cannot produce acceptance', async f => {
        await f.create(); await f.verifying();
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'failed' }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        refused(await f.perform('proof', 'TASK-101', { proof: f.proof('TASK-101', { kind: 'test' }) }), 'NOT_PERMITTED');
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-008', 'relevant code change makes proof stale while retaining accepted delivery history', async f => {
        f.write('src/export.js', 'exports.version = 1;\n'); await f.create();
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] });
        await f.accepted(); const accepted = f.bytes('TASK-101');
        assert.equal(f.progress().metrics.currentlyVerified, 1);
        f.write('src/export.js', 'exports.version = 2;\n');
        assert.equal(f.view('TASK-101').verification.status, 'stale');
        assert.equal(f.progress().metrics.accepted, 1);
        assert.equal(f.progress().metrics.currentlyVerified, 0);
        assert.deepEqual(f.bytes('TASK-101'), accepted);
        refused(await f.perform('update', 'TASK-101', { intent: 'New scope' }), 'REOPEN_REQUIRED');
        await f.saved('transition', 'TASK-101', { state: 'planned', reason: 'Explicit follow-up work' });
        assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.record('TASK-101').tracking.acceptanceHistory.length, 1);
    }),
    test('TC-TPT-009', 'scope changes expose denominator and retain accepted count', async f => {
        for (const id of ['TASK-1', 'TASK-2', 'TASK-3']) await f.create(id);
        await f.accepted('TASK-1');
        const initial = f.progress().metrics;
        assert.equal(initial.total, 3); assert.equal(initial.accepted, 1);
        await f.create('TASK-4');
        const after = f.progress().metrics;
        assert.equal(after.total, 4); assert.equal(after.accepted, 1); assert.equal(after.remaining, 3); assert.equal(after.percentage, 25);
        assert.notEqual(after.scopeRevision, initial.scopeRevision);
    }),
    test('TC-TPT-049', 'overlapping groups count unique tasks and exclude support items', async f => {
        for (const id of ['TASK-1', 'TASK-2']) await f.create(id);
        await f.create('SUBTASK-1', 'subtask'); await f.create('STORY-1', 'story');
        for (const id of ['PROJECT-1', 'PROJECT-2']) {
            await f.create(id, 'project'); await f.saved('group', id, { memberItemIds: ['TASK-1', 'SUBTASK-1', 'STORY-1'] });
        }
        await f.create('VISION-1', 'vision');
        await f.saved('group', 'VISION-1', { memberItemIds: ['PROJECT-1', 'PROJECT-2', 'TASK-2'] });
        await f.accepted('TASK-1');
        await f.accepted('SUBTASK-1'); await f.accepted('STORY-1');
        const metrics = f.progress({ groupId: 'VISION-1' }).metrics;
        assert.deepEqual(metrics.eligibleIds, ['TASK-1', 'TASK-2']); assert.equal(metrics.total, 2); assert.equal(metrics.accepted, 1);
        assert.equal(metrics.percentage, 50);
    }),
    test('TC-TPT-049', 'retirement and cancellation expose exclusions without deleting child work', async f => {
        await f.create('TASK-1'); await f.create('TASK-2'); await f.create('PROJECT-1', 'project');
        await f.saved('group', 'PROJECT-1', { memberItemIds: ['TASK-1', 'TASK-2'] });
        const child = f.bytes('TASK-1');
        await f.saved('retire', 'PROJECT-1', { reason: 'Grouping retired' });
        assert.deepEqual(f.bytes('TASK-1'), child);
        await f.saved('retire', 'TASK-1', { reason: 'Scope removed' });
        await f.saved('transition', 'TASK-2', { state: 'canceled', reason: 'No longer requested' });
        const metrics = f.progress().metrics;
        assert.equal(metrics.total, 0); assert.equal(metrics.retired, 1); assert.equal(metrics.canceled, 1); assert.equal(metrics.percentage, null);
        refused(await f.perform('update', 'TASK-1', { title: 'Hidden change' }), 'RETIRED');
        await f.saved('restore', 'TASK-1', { reason: 'Scope restored' });
        assert.equal(f.progress().metrics.total, 1);
    }),
    test('TC-TPT-003', 'a dependency needs accepted current proof before Ready and start', async f => {
        f.write('src/dependency.js', 'version one\n');
        await f.create('TASK-DEP'); await f.saved('link', 'TASK-DEP', { links: [{ relation: 'source', path: 'src/dependency.js' }] });
        await f.create(); await f.saved('link', 'TASK-101', { links: [{ relation: 'dependency', itemId: 'TASK-DEP' }] });
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        refused(await f.perform('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } }), 'NOT_READY');
        await f.accepted('TASK-DEP');
        await f.saved('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } });
        await f.saved('assign', 'TASK-101', { assigneeId: 'owner' });
        f.write('src/dependency.js', 'changed version\n');
        assert.deepEqual(f.progress().ready, []);
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'NOT_READY');
        assert.equal(f.record('TASK-101').data.status, 'ready');
    }),
    test('TC-TPT-003', 'self, foreign and cyclic dependency links are refused without mutation', async f => {
        await f.create('TASK-1'); await f.create('TASK-2');
        for (const itemId of ['TASK-1', 'FOREIGN-1']) {
            const before = f.bytes('TASK-1');
            refused(await f.perform('link', 'TASK-1', { links: [{ relation: 'dependency', itemId }] }), 'INVALID_RELATIONSHIP');
            assert.deepEqual(f.bytes('TASK-1'), before);
        }
        await f.saved('link', 'TASK-1', { links: [{ relation: 'dependency', itemId: 'TASK-2' }] });
        const before = f.bytes('TASK-2');
        refused(await f.perform('link', 'TASK-2', { links: [{ relation: 'dependency', itemId: 'TASK-1' }] }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.bytes('TASK-2'), before);
    }),
    test('TC-TPT-133', 'assignment aliases, renames and unassignment retain attribution without credit', async f => {
        await f.create();
        // Finite metamorphic domain: 4 equivalent identities, followed by rename,
        // deactivation and two invalid identities. This is not universal proof.
        for (const assigneeId of ['owner', 'OWNER', ' Previous owner ', 'Owner']) {
            await f.saved('assign', 'TASK-101', { assigneeId, collaboratorIds: ['peer', 'PEER'] });
            assert.equal(f.record('TASK-101').tracking.assigneeId, 'owner');
            assert.deepEqual(f.record('TASK-101').tracking.collaboratorIds, ['peer']);
            assert.equal(f.record('TASK-101').data.status, 'draft'); assert.equal(f.progress().metrics.accepted, 0);
        }
        f.config.taskTracking.members[0].displayName = 'Renamed owner'; f.config.taskTracking.members[0].active = false; f.saveConfig();
        assert.equal(f.view('TASK-101').assigneeId, 'owner');
        for (const assigneeId of ['owner', 'unknown']) {
            const before = f.bytes('TASK-101');
            refused(await f.perform('assign', 'TASK-101', { assigneeId }), 'INVALID_MEMBER'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        await f.saved('assign', 'TASK-101', { assigneeId: null });
        assert.equal(f.record('TASK-101').tracking.assigneeId, null);
        assert.ok(f.record('TASK-101').tracking.history.some(entry => entry.afterAssigneeId === 'owner'));
    }),
    test('TC-TPT-123', 'identical completed requests replay once across intervening edits', async f => {
        await f.create();
        // Finite domain: title, priority, assignment and opt-out, each with one
        // replay before and after a later edit, plus changed-payload counter-case.
        for (const [operation, patch] of [['update', { title: 'Revised export' }], ['update', { priority: 2 }],
            ['assign', { assigneeId: 'peer' }], ['update', { optOut: true }]]) {
            const request = f.request(operation, 'TASK-101', patch);
            const saved = await f.core.executeOperation(request, f.authority()); assert.equal(saved.primary.status, 'saved');
            let before = f.bytes('TASK-101');
            const replay = await f.core.executeOperation(request, f.authority());
            assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.revision, saved.primary.revision); assert.deepEqual(f.bytes('TASK-101'), before);
            await f.saved('update', 'TASK-101', { priority: 3 }); before = f.bytes('TASK-101');
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true);
            assert.deepEqual(f.bytes('TASK-101'), before);
            refused(await f.core.executeOperation({ ...request, patch: operation === 'assign' ? { assigneeId: 'owner' } : { title: 'Other request' } }, f.authority()), 'REUSED_OPERATION');
            assert.deepEqual(f.bytes('TASK-101'), before);
        }
    }),
    test('TC-TPT-082', 'cooperating writers save one current revision and retain the losing draft', async f => {
        await f.create();
        const left = f.request('update', 'TASK-101', { title: 'Left draft' });
        const right = f.request('update', 'TASK-101', { title: 'Right draft' });
        const results = await Promise.all([f.core.executeOperation(left, f.authority()), f.core.executeOperation(right, f.authority())]);
        assert.equal(results.filter(result => result.primary.status === 'saved').length, 1);
        assert.equal(results.filter(result => result.primary.code === 'CONFLICT').length, 1);
        assert.equal(f.record('TASK-101').revision, 2);
        assert.ok(['Left draft', 'Right draft'].includes(f.record('TASK-101').data.title));
        assert.equal(f.record('TASK-101').tracking.history.length, 2);
        assert.deepEqual(left.patch, { title: 'Left draft' }); assert.deepEqual(right.patch, { title: 'Right draft' });
        assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking/writer.lock')), false);
    }),
    test('TC-TPT-082', 'batch results remain per record and retry does not repeat successful siblings', async f => {
        await f.create('TASK-1'); await f.create('TASK-2');
        const first = f.request('update', 'TASK-1', { title: 'First saved' });
        const second = f.request('update', 'TASK-2', { title: 'Second draft' });
        await f.saved('update', 'TASK-2', { priority: 2 });
        const batch = await f.core.executeBatch([first, second], f.authority());
        assert.equal(batch.atomicity, 'per-record'); assert.equal(batch.results[0].primary.status, 'saved'); refused(batch.results[1], 'CONFLICT');
        const before = f.bytes('TASK-1');
        const retry = await f.core.executeBatch([first, second], f.authority());
        assert.equal(retry.results[0].primary.replayed, true); refused(retry.results[1], 'CONFLICT'); assert.deepEqual(f.bytes('TASK-1'), before);
    }),
    test('TC-TPT-085', 'off and observe modes skip automatic changes while explicit edits remain available', async f => {
        await f.create();
        for (const mode of ['off', 'observe']) {
            f.config.taskTracking.mode = mode; f.saveConfig(); const before = f.bytes('TASK-101');
            const result = await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: ['TASK-101'] });
            assert.equal(result.primary.status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
            await f.saved('update', 'TASK-101', { title: `Explicit ${mode} edit` });
        }
    }),
    test('TC-TPT-085', 'unenrolled projects support explicit capture with automatic upkeep off', async f => {
        delete f.config.taskTracking; f.saveConfig(); await f.create();
        assert.equal(f.progress().enrolled, false); assert.equal(f.progress().mode, 'off');
        const before = f.bytes('TASK-101');
        assert.equal((await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true })).primary.status, 'skipped');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-026', 'linked upkeep records only actual observations and never manufactures approval', async f => {
        await f.create(); await f.active(); const linked = { automatic: true, linkedItemIds: ['TASK-101'] };
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { ...linked, canWrite: false, observedTransition: { state: 'verifying' } }), 'NOT_PERMITTED');
        assert.equal((await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: [] })).primary.status, 'skipped');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, linked), 'NOT_PERMITTED');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Automatic approval' }, {}, linked), 'NOT_PERMITTED');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('transition', 'TASK-101', { state: 'verifying' }, {}, { ...linked, observedTransition: { state: 'verifying' } });
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] };
        refused(await f.perform('activity', 'TASK-101', { observation }, {}, linked), 'NOT_PERMITTED');
        await f.saved('activity', 'TASK-101', { observation }, {}, { ...linked, observation });
        assert.deepEqual(f.record('TASK-101').tracking.activity, [observation]); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-085', 'item opt-out skips exact linked upkeep without changing current facts', async f => {
        await f.create(); await f.saved('update', 'TASK-101', { optOut: true }); const before = f.bytes('TASK-101');
        const result = await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: ['TASK-101'], observedTransition: { state: 'verifying' } });
        assert.equal(result.primary.status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-045', 'request context cannot impersonate the actual workflow occurrence', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        refused(await f.perform('update', 'TASK-101', { title: 'Forged context' }, { context: { runId: 'foreign', occurrenceId: 'foreign-step' } },
            { context: { runId: 'actual', occurrenceId: 'actual-step' } }), 'NOT_PERMITTED');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-044', 'unproved native capability preserves the complete declared source inventory', async f => {
        const native = '<html><script>throw new Error("inert content")</script><body>Native tracker</body></html>';
        const source = f.write('trackers/index.html', native);
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/index.html'] }; f.saveConfig();
        refused(await f.perform('create', 'TASK-101', { title: 'Work', intent: 'Defined outcome' }), 'UNPROVED_NATIVE_CAPABILITY');
        const progress = f.progress(); assert.equal(progress.coverage, 'unavailable'); assert.equal(progress.metrics, null);
        assert.equal(progress.native.inventory.length, 1); assert.deepEqual(progress.profile.capabilities, []);
        assert.equal(fs.readFileSync(source, 'utf8'), native); assert.equal(fs.existsSync(path.join(f.root, 'work')), false);
    }),
    test('TC-TPT-047', 'malformed and unknown policy fails closed rather than becoming an empty board', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        f.config.taskTracking.unknownPermission = true; f.saveConfig();
        const progress = f.progress(); assert.equal(progress.coverage, 'unavailable'); assert.equal(progress.metrics, null);
        assert.ok(progress.diagnostics.some(diagnostic => diagnostic.code === 'INVALID_CONFIG'));
        // Request was captured before config changed, as a real actor draft can be.
        refused(await f.core.executeOperation({ schemaVersion: 2, operation: 'create', operationId: 'bad-policy', target: { kind: 'task', itemId: 'TASK-2' },
            actor: { memberId: 'owner' }, patch: { title: 'Work', intent: 'Outcome' } }, f.authority()), 'INVALID_CONFIG');
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/tasks/TASK-101.md')), before);
    }),
    test('TC-TPT-086', 'partial or duplicate owners retain visible facts and suppress precise percentages and writes', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        // External/manual corruption is reachable through ordinary Git/editor changes.
        f.write('work/tasks/broken.md', 'Unparseable external content');
        let progress = f.progress(); assert.equal(progress.coverage, 'partial'); assert.equal(progress.metrics.percentage, null);
        assert.ok(progress.items.some(item => item.id === 'TASK-101'));
        refused(await f.perform('update', 'TASK-101', { title: 'Hidden update' }), 'INCOMPLETE_SCOPE'); assert.deepEqual(f.bytes('TASK-101'), before);
        fs.unlinkSync(path.join(f.root, 'work/tasks/broken.md')); f.write('work/tasks/duplicate.md', before);
        progress = f.progress(); assert.equal(progress.coverage, 'partial'); assert.ok(progress.diagnostics.some(item => item.code === 'DUPLICATE_ID'));
        assert.equal(progress.metrics.percentage, null);
    }),
    test('TC-TPT-086', 'status reads preserve canonical bytes and distinguish local freshness and unknown health', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        const first = f.progress(); const second = f.progress();
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(first.fingerprint, second.fingerprint);
        assert.equal(first.source.kind, 'worktree'); assert.equal(first.source.remoteFreshness, 'unknown'); assert.equal(first.health.status, 'unknown');
    }),
    test('TC-TPT-039', 'cancellation preserves history for all seven eligible states and is replay safe', async f => {
        const states = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done'];
        for (const [index, state] of states.entries()) {
            const id = `TASK-CANCEL-${index}`; await f.create(id);
            if (state === 'planned') await f.saved('transition', id, { state: 'planned' });
            if (state === 'ready') await f.ready(id);
            if (['in_progress', 'blocked'].includes(state)) await f.active(id);
            if (state === 'blocked') await f.saved('transition', id, { state: 'blocked', reason: 'Waiting on a prerequisite' });
            if (state === 'verifying') await f.verifying(id);
            if (state === 'done') await f.accepted(id);
            assert.equal(f.record(id).data.status, state);
            const history = f.record(id).tracking.history; const acceptance = f.record(id).tracking.acceptanceHistory;
            const request = f.request('transition', id, { state: 'canceled', reason: 'Requested scope removed' });
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.status, 'saved');
            assert.equal(f.record(id).data.status, 'canceled');
            assert.deepEqual(f.record(id).tracking.history.slice(0, -1), history);
            assert.deepEqual(f.record(id).tracking.acceptanceHistory, acceptance);
            const canceled = f.bytes(id);
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true);
            refused(await f.perform('transition', id, { state: 'canceled', reason: 'Redundant request' }), 'INVALID_TRANSITION');
            assert.deepEqual(f.bytes(id), canceled);
        }
        assert.equal(f.progress().metrics.accepted, 0); assert.equal(f.progress().metrics.canceled, 7);
    }),
    test('TC-TPT-039', 'canceled work returns to draft only by an explicit reasoned correction made by a person', async f => {
        // Real scenario: work canceled by mistake. Cancellation ends the usual steps, so the way back is its own decision.
        await f.create(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' });
        const canceled = f.bytes('TASK-101'); const person = { canCorrectState: true };
        refused(await f.perform('transition', 'TASK-101', { state: 'draft' }), 'INVALID_TRANSITION');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: true, reason: 'Canceled by mistake' }), 'NOT_PERMITTED');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: true }, {}, person), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: 'yes', reason: 'Canceled by mistake' }, {}, person), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'canceled', correction: true, reason: 'Same state' }, {}, person), 'INVALID_TRANSITION');
        assert.deepEqual(f.bytes('TASK-101'), canceled);
        const history = f.record('TASK-101').tracking.history;
        await f.saved('transition', 'TASK-101', { state: 'draft', correction: true, reason: 'Canceled by mistake' }, {}, person);
        const restored = f.record('TASK-101');
        assert.equal(restored.data.status, 'draft'); assert.deepEqual(restored.tracking.history.slice(0, -1), history);
        const entry = restored.tracking.history.at(-1);
        assert.equal(entry.beforeState, 'canceled'); assert.equal(entry.afterState, 'draft'); assert.equal(entry.reason, 'Canceled by mistake');
        // The usual steps continue from the corrected state.
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        assert.equal(f.progress().metrics.canceled, 0);
    }),
    test('TC-TPT-039', 'a correction reaches any recorded state except done and keeps the facts its target state requires', async f => {
        const person = { canCorrectState: true }; const move = (id, state, extra = {}) => f.perform('transition', id, { state, correction: true, reason: 'Recorded state was wrong', ...extra }, {}, person);
        await f.create(); const draft = f.bytes('TASK-101');
        // Done is reached only by acceptance; started work needs a responsible member and reviewed readiness.
        refused(await move('TASK-101', 'done'), 'MISSING_PROOF');
        for (const state of ['in_progress', 'blocked', 'verifying']) assert.equal((await move('TASK-101', state)).primary.status, 'refused', state);
        refused(await move('TASK-101', 'ready'), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), draft);
        // Accepted work goes back to draft with its acceptance history kept; it no longer counts as accepted.
        await f.accepted('TASK-101'); const acceptance = f.record('TASK-101').tracking.acceptanceHistory;
        assert.equal((await move('TASK-101', 'draft')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').data.status, 'draft'); assert.deepEqual(f.record('TASK-101').tracking.acceptanceHistory, acceptance);
        assert.equal(f.progress().metrics.accepted, 0);
        // With its member and readiness still recorded, the same work can be placed straight into verifying, or blocked with the reason.
        assert.equal((await move('TASK-101', 'verifying')).primary.status, 'saved');
        assert.equal((await move('TASK-101', 'blocked')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').tracking.blocker.reason, 'Recorded state was wrong');
        // Leaving blocked by correction clears the blocker; the usual resume rule is untouched.
        assert.equal((await move('TASK-101', 'planned')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').tracking.blocker, null);
        // Automatic upkeep can never make a correction, even for linked work and with the flag set.
        const patch = { state: 'in_progress', correction: true, reason: 'Recorded state was wrong' };
        refused(await f.perform('transition', 'TASK-101', patch, {}, { ...person, automatic: true, linkedItemIds: ['TASK-101'], observedTransition: patch }), 'NOT_PERMITTED');
        assert.equal(f.record('TASK-101').data.status, 'planned');
    }),
    test('TC-TPT-039', 'a correction out of canceled drops the blocker the cancellation kept, and a correction to blocked records a new one', async f => {
        // Real scenario: blocked work is canceled, then the cancellation turns out to be a mistake. The usual cancellation keeps the blocker as found.
        const person = { canCorrectState: true }; const move = (id, state, reason) => f.saved('transition', id, { state, correction: true, reason }, {}, person);
        for (const state of ['planned', 'draft', 'ready', 'in_progress', 'verifying']) {
            const id = `TASK-STALE-${state}`; await f.create(id); await f.active(id);
            await f.saved('transition', id, { state: 'blocked', reason: 'Waiting on a prerequisite' });
            await f.saved('transition', id, { state: 'canceled', reason: 'Requested scope removed' });
            assert.equal(f.record(id).tracking.blocker.reason, 'Waiting on a prerequisite');
            await move(id, state, 'Canceled by mistake');
            assert.equal(f.record(id).data.status, state); assert.equal(f.record(id).tracking.blocker, null, state);
        }
        await f.create(); await f.active(); await f.saved('transition', 'TASK-101', { state: 'blocked', reason: 'Waiting on a prerequisite' });
        await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' });
        await move('TASK-101', 'blocked', 'Still waiting on the supplier');
        const blocker = f.record('TASK-101').tracking.blocker;
        assert.equal(blocker.reason, 'Still waiting on the supplier'); assert.equal(blocker.resumeState, 'in_progress'); assert.equal(blocker.actor, 'owner');
        // The usual resume rule then clears it as before.
        await f.saved('transition', 'TASK-101', { state: 'in_progress', resolution: 'Supplier delivered' });
        assert.equal(f.record('TASK-101').tracking.blocker, null);
    }),
    test('TC-TPT-123', 'allocated creation identity is retained by retries and collision never overwrites', async f => {
        const request = f.request('create', null, { title: 'Captured work', intent: 'Defined delivery intent' });
        const created = await f.core.executeOperation(request, f.authority()); assert.equal(created.primary.status, 'saved');
        const id = created.primary.itemId; const before = f.bytes(id);
        const replay = await f.core.executeOperation(request, f.authority());
        assert.equal(replay.primary.itemId, id); assert.equal(replay.primary.replayed, true); assert.equal(f.records().length, 1);
        refused(await f.perform('create', id, { title: 'Duplicate capture', intent: 'Other intent' }), 'CONFLICT');
        assert.deepEqual(f.bytes(id), before);
    }),
    test('TC-TPT-123', 'receipt horizon requires fresh preview and retains bounded retry history', async f => {
        await f.create();
        for (let count = 1; count < 128; count++) await f.saved('update', 'TASK-101', { priority: count });
        assert.equal(f.record('TASK-101').tracking.receipts.length, 128);
        const before = f.bytes('TASK-101'); const request = f.request('update', 'TASK-101', { priority: 129 });
        refused(await f.core.executeOperation(request, f.authority()), 'REPLAY_HORIZON'); assert.deepEqual(f.bytes('TASK-101'), before);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority()); assert.equal(preview.primary.status, 'preview');
        const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
        assert.equal(saved.primary.status, 'saved'); assert.equal(f.record('TASK-101').revision, 129);
        assert.equal(f.record('TASK-101').tracking.receipts.length, 128); assert.equal(f.record('TASK-101').tracking.history.length, 129);
        const current = f.bytes('TASK-101');
        assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true); assert.deepEqual(f.bytes('TASK-101'), current);
    }),
    test('TC-TPT-123', 'expired allocated creation cannot create duplicate work or authorize altered retries', async f => {
        const request = f.request('create', null, { title: 'Captured work', intent: 'Defined delivery intent' });
        const created = await f.core.executeOperation(request, f.authority()); assert.equal(created.primary.status, 'saved');
        const id = created.primary.itemId;
        let lastRequest;
        for (let count = 1; count <= 128; count++) {
            lastRequest = f.request('update', id, { priority: count });
            const preview = await f.core.executeOperation({ ...lastRequest, preview: true }, f.authority());
            assert.equal(preview.primary.status, 'preview');
            assert.equal((await f.core.executeOperation({ ...lastRequest, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        }
        assert.equal(f.record(id).tracking.receipts.some(receipt => receipt.operationId === request.operationId), false);
        assert.equal(f.record(id).tracking.history.some(entry => entry.operationId === request.operationId), true);
        const before = f.bytes(id); const progress = f.progress().metrics;
        for (const retry of [request, { ...request, preview: true }, { ...request, previewToken: 'f'.repeat(64) },
            { ...request, patch: { ...request.patch, title: 'Altered retry' } },
            { ...request, target: { kind: 'project' } },
            f.request('update', id, { priority: 999 }, { operationId: request.operationId })]) {
            refused(await f.core.executeOperation(retry, f.authority()), 'REPLAY_HORIZON');
            assert.deepEqual(f.bytes(id), before); assert.equal(f.records().length, 1);
            assert.deepEqual(f.progress().metrics, progress);
        }
        assert.equal((await f.core.executeOperation(lastRequest, f.authority())).primary.replayed, true);
        assert.deepEqual(f.bytes(id), before);
        const fresh = await f.perform('create', null, { title: 'New work', intent: 'A new explicit delivery intent' });
        assert.equal(fresh.primary.status, 'saved'); assert.notEqual(fresh.primary.itemId, id);
        assert.equal(f.records().length, 2); assert.deepEqual(f.bytes(id), before);
    }),
    test('TC-TPT-047', 'priority, criteria and batch bounds reject invalid changes with no partial save', async f => {
        await f.create();
        for (const priority of [0, -1, 1000, 1.5]) {
            const before = f.bytes('TASK-101'); refused(await f.perform('update', 'TASK-101', { priority }), 'INVALID_INPUT'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        for (const priority of [1, 999]) { await f.saved('update', 'TASK-101', { priority }); assert.equal(f.record('TASK-101').data.priority, priority); }
        const before = f.bytes('TASK-101');
        refused(await f.perform('update', 'TASK-101', { criteria: [{ id: 'same', text: 'First outcome' }, { id: 'same', text: 'Other outcome' }] }), 'INVALID_INPUT');
        refused(await f.perform('update', 'TASK-101', { unknownPermission: true }), 'INVALID_INPUT');
        const request = f.request('update', 'TASK-101', { title: 'Batch draft' });
        await assert.rejects(f.core.executeBatch(Array(65).fill(request), f.authority()), error => error.code === 'LIMIT_EXCEEDED');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-107', 'future-dated and duplicated-criterion proof cannot grant current acceptance', async f => {
        await f.create(); await f.verifying(); const before = f.bytes('TASK-101');
        for (const proof of [f.proof('TASK-101', { observedAt: '9999-01-01T00:00:00.000Z' }), f.proof('TASK-101', { criteriaIds: ['selected-rows', 'selected-rows'] })]) {
            refused(await f.perform('proof', 'TASK-101', { proof }), 'INVALID_INPUT'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        await f.saved('proof', 'TASK-101', { proof: f.proof() }); assert.equal(f.view('TASK-101').verification.status, 'current');
        // A teammate/manual edit can introduce an invalid future observation;
        // inspection must not trust it merely because YAML parses successfully.
        const record = f.record('TASK-101'); f.write(record.ownerPath, record.text.replace(`"observedAt":"${OBSERVED_AT}"`, '"observedAt":"9999-01-01T00:00:00.000Z"'));
        assert.notEqual(f.view('TASK-101').verification.status, 'current');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Requested acceptance' }), 'MISSING_PROOF'); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-101', 'legacy draft without captured intent cannot become planned work', async f => {
        f.write('work/tasks/TASK-101.md', '---\nid: TASK-101\ntitle: Existing draft\nstatus: draft\n---\nAuthored body retained.\n');
        const request = f.request('adopt', 'TASK-101', {}); const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.equal((await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        const before = f.bytes('TASK-101'); refused(await f.perform('transition', 'TASK-101', { state: 'planned' }), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.record('TASK-101').data.status, 'draft');
    }),
    test('TC-TPT-048', 'health needs an explicit scoped owner date and reason and never follows delivery percentages', async f => {
        await f.create(); await f.create('PROJECT-1', 'project'); await f.saved('group', 'PROJECT-1', { memberItemIds: ['TASK-101'] });
        f.config.taskTracking.healthOwnerId = 'PROJECT-1'; f.saveConfig();
        assert.equal(f.progress().health.status, 'unknown'); await f.accepted(); assert.equal(f.progress().metrics.percentage, 100); assert.equal(f.progress().health.status, 'unknown');
        const health = { assessment: 'Watch dependency risk', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'External service decision is still pending' };
        const task = f.bytes('TASK-101'); const saved = await f.saved('attest', 'PROJECT-1', { health }, {}, { canAttest: true });
        assert.equal(saved.primary.status, 'saved'); assert.deepEqual(f.record('PROJECT-1').tracking.health, health);
        const project = f.progress().health; assert.equal(project.status, 'attested'); assert.equal(project.itemId, 'PROJECT-1'); assert.equal(project.ownerId, 'owner'); assert.equal(project.observedAt, OBSERVED_AT); assert.equal(project.reason, health.reason);
        assert.equal(f.progress({ groupId: 'PROJECT-1' }).health.assessment, health.assessment); assert.equal(f.view('TASK-101').health.status, 'unknown'); assert.deepEqual(f.bytes('TASK-101'), task);
        await f.create('TASK-2'); assert.equal(f.progress().metrics.percentage, 50); assert.deepEqual(f.progress().health, project);
        assert.equal(f.record('PROJECT-1').tracking.history.at(-1).operation, 'attest'); assert.equal(f.record('PROJECT-1').tracking.receipts.at(-1).operationId, saved.primary.operationId);
    }),
    test('TC-TPT-048', 'health cannot borrow another owner or automatic authority and retains attribution through rename', async f => {
        await f.create(); f.config.taskTracking.healthOwnerId = 'TASK-101'; f.saveConfig();
        const health = { assessment: 'Needs attention', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'Actual owner assessment' }; const before = f.bytes('TASK-101');
        refused(await f.perform('attest', 'TASK-101', { health }), 'NOT_PERMITTED');
        for (const invalid of [{ ...health, ownerId: 'peer' }, { ...health, observedAt: '9999-01-01T00:00:00.000Z' }, { ...health, reason: '' }]) {
            refused(await f.perform('attest', 'TASK-101', { health: invalid }, {}, { canAttest: true }), 'NOT_PERMITTED'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        refused(await f.perform('attest', 'TASK-101', { health }, {}, { canAttest: true, automatic: true, linkedItemIds: ['TASK-101'] }), 'NOT_PERMITTED');
        await f.saved('attest', 'TASK-101', { health }, {}, { canAttest: true });
        f.config.taskTracking.members[0].displayName = 'Renamed owner'; f.config.taskTracking.members[0].active = false; f.saveConfig();
        const existing = f.bytes('TASK-101'); assert.equal(f.progress().health.ownerId, 'owner'); assert.equal(f.progress().health.displayName, 'Renamed owner'); assert.equal(f.progress().health.observedAt, OBSERVED_AT);
        refused(await f.perform('attest', 'TASK-101', { health }, {}, { canAttest: true }), 'INVALID_MEMBER'); assert.deepEqual(f.bytes('TASK-101'), existing);
    }),
    test('TC-TPT-048', 'foreign, future and malformed imported health stays unknown without guessed correction', async f => {
        await f.create(); f.config.taskTracking.healthOwnerId = 'TASK-101'; f.saveConfig();
        const health = { assessment: 'Reviewed', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'Actual observation' };
        await f.saved('attest', 'TASK-101', { health }, {}, { canAttest: true }); const valid = f.record('TASK-101');
        const serialized = JSON.stringify(health); const healthIndex = valid.text.lastIndexOf(serialized);
        assert.notEqual(healthIndex, -1);
        // Ordinary manual/Git changes may introduce unsupported attestation facts.
        for (const invalid of [{ ...health, ownerId: 'foreign-owner' }, { ...health, observedAt: '9999-01-01T00:00:00.000Z' }, { ...health, reason: '' }]) {
            f.write(valid.ownerPath, valid.text.slice(0, healthIndex) + JSON.stringify(invalid) + valid.text.slice(healthIndex + serialized.length));
            assert.deepEqual(f.record('TASK-101').tracking.health, invalid);
            assert.deepEqual(f.record('TASK-101').tracking.history, valid.tracking.history);
            const bytes = fs.readFileSync(path.join(f.root, valid.ownerPath));
            assert.equal(f.progress().health.status, 'unknown'); assert.deepEqual(fs.readFileSync(path.join(f.root, valid.ownerPath)), bytes);
        }
        f.write(valid.ownerPath, valid.bytes); f.config.taskTracking.healthOwnerId = 'missing-owner'; f.saveConfig(); assert.equal(f.progress().health.status, 'unknown');
    }),

    // P13 hierarchy source carriers: runtime/visible navigation remain separate owners.
    test('TC-TPT-201', 'absent minimal and relocated configuration need no member enrollment or hierarchy rewrite', async f => {
        fs.unlinkSync(path.join(f.root, 'docs/project-config.json'));
        const artifactRoot = f.context().artifactsRoot;
        await f.create('F', 'project'); await f.create('P'); await f.saved('group', 'F', { memberItemIds: ['P'] });
        const child = f.bytes('P'); const missing = f.progress({ groupId: 'F' });
        assert.equal(missing.enrolled, false); assert.equal(missing.mode, 'off'); assert.deepEqual(missing.scope.eligibleTaskIds, ['P']);
        assert.deepEqual(missing.hierarchy.labels, { area: 'Area', capability: 'Feature', program: 'Program' });
        f.config = { project: { name: 'Independent fixture' }, docsRoots: { teamArtifacts: { path: artifactRoot } }, taskTracking: { schemaVersion: 2 } }; f.saveConfig();
        await f.saved('group', 'F', { groupRole: 'capability' }); assert.equal(f.view('F').groupRole, 'capability');
        f.write('metadata/project.json', JSON.stringify({ ...f.config, taskTracking: { schemaVersion: 2, groupLabels: { capability: 'Outcome' } } }));
        f.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'metadata/project.json' } }));
        const configured = fs.readFileSync(path.join(f.root, 'metadata/project.json')); const relocated = f.progress({ groupId: 'F' });
        assert.equal(relocated.hierarchy.labels.capability, 'Outcome'); assert.deepEqual(relocated.scope.eligibleTaskIds, ['P']);
        assert.deepEqual(f.bytes('P'), child); assert.deepEqual(fs.readFileSync(path.join(f.root, 'metadata/project.json')), configured);
    }),
    test('TC-TPT-201', 'optional purpose retains generic nesting and all child owners without setup or conversion', async f => {
        for (const [id, kind] of [['G', 'vision'], ['F', 'project'], ['P', 'task'], ['Q', 'task'], ['T', 'subtask']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['Q', 'T'] });
        await f.saved('group', 'G', { memberItemIds: ['F', 'P'] });
        const children = new Map(['G', 'P', 'Q', 'T'].map(id => [id, f.bytes(id)]));
        const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        assert.equal(f.view('G').groupRole, null); assert.equal(f.view('F').groupRole, null);
        await f.saved('group', 'F', { groupRole: 'capability' });
        const result = f.progress({ groupId: 'G' });
        assert.equal(result.hierarchy.labels.capability, 'Feature'); assert.equal(f.view('G').groupRole, null);
        assert.equal(f.view('F').groupRole, 'capability'); assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']);
        assert.deepEqual(result.scope.memberIds, ['F', 'P', 'Q', 'T']); assert.deepEqual(result.scope.directGroupIds, ['F']);
        for (const [id, bytes] of children) assert.deepEqual(f.bytes(id), bytes);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
    }),
    test('TC-TPT-202', 'purpose preview set change and clear conserve omitted members and external affiliation', async f => {
        for (const [id, kind] of [['A', 'vision'], ['F', 'project'], ['P', 'task'], ['T', 'subtask']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['P', 'T'] }); await f.saved('group', 'A', { memberItemIds: ['F'] });
        const controls = new Map(['A', 'P', 'T'].map(id => [id, f.bytes(id)]));
        for (const groupRole of ['area', 'program', null]) {
            const before = f.record('F'); const request = f.request('group', 'F', { groupRole });
            const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
            assert.equal(preview.primary.status, 'preview'); assert.deepEqual(f.bytes('F'), before.bytes);
            assert.deepEqual(preview.proposed.memberItemIds, ['P', 'T']); assert.equal(preview.proposed.groupRole, groupRole);
            const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
            assert.equal(saved.primary.status, 'saved'); const after = f.record('F');
            assert.deepEqual(after.tracking.memberItemIds, before.tracking.memberItemIds); assert.equal(after.tracking.groupRole, groupRole);
            assert.equal(after.body, before.body); assert.equal(after.id, before.id); assert.equal(after.kind, before.kind);
            for (const key of ['criteria', 'proofs', 'acceptanceHistory', 'health', 'assigneeId', 'links']) assert.deepEqual(after.tracking[key], before.tracking[key]);
            assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
            for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
        }
        await f.saved('group', 'F', { groupRole: 'capability' }); await f.saved('group', 'F', { memberItemIds: ['P'] });
        assert.equal(f.view('F').groupRole, 'capability'); assert.deepEqual(f.view('F').memberItemIds, ['P']);
    }),
    test('TC-TPT-203', 'selected delivery identities separate exclusions and support while proof and health keep their meanings', async f => {
        for (const [id, kind] of [['A', 'vision'], ['F', 'project'], ['P', 'task'], ['Q', 'task'], ['R', 'task'], ['S', 'task'], ['ST', 'story'], ['T', 'subtask']]) await f.create(id, kind);
        await f.accepted('Q'); await f.saved('transition', 'R', { state: 'canceled', reason: 'Outside active delivery' });
        await f.saved('retire', 'S', { reason: 'Historical scope' });
        await f.saved('group', 'F', { memberItemIds: ['P', 'Q', 'R', 'S', 'ST', 'T'], groupRole: 'capability' });
        await f.saved('group', 'A', { memberItemIds: ['F'], groupRole: 'area' });
        const q = f.record('Q'); f.write(q.ownerPath, q.text + '\nRelevant authored outcome changed after acceptance.\n');
        const bytes = new Map(f.records().map(item => [item.id, item.bytes])); const result = f.progress({ groupId: 'F' });
        assert.deepEqual(result.scope.taskIds, ['P', 'Q', 'R', 'S']); assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']);
        assert.deepEqual(result.scope.excludedTaskIds, ['R', 'S']); assert.deepEqual(result.scope.memberIds, ['P', 'Q', 'R', 'S', 'ST', 'T']);
        assert.deepEqual(result.scope.eligibleTaskIds, result.metrics.eligibleIds); assert.equal(result.metrics.total, 2);
        assert.equal(result.metrics.accepted, 1); assert.equal(result.metrics.currentlyVerified, 0); assert.equal(result.health.status, 'unknown');
        const historical = result.items.find(item => item.id === 'Q'); assert.equal(historical.acceptance.accepted, true); assert.equal(historical.verification.status, 'stale');
        assert.deepEqual(result.scope.affiliations.find(item => item.itemId === 'F').groupIds, ['A']);
        for (const [id, original] of bytes) assert.deepEqual(f.bytes(id), original);
    }),
    test('TC-TPT-204', 'shared diamonds expose direct affiliations and exact unique scopes without a permanent parent', async f => {
        for (const [id, kind] of [['A', 'vision'], ['B', 'vision'], ['F', 'project'], ['G', 'project'], ['P', 'task'], ['Q', 'task']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['P', 'Q'], groupRole: 'capability' });
        await f.saved('group', 'G', { memberItemIds: ['Q'] });
        await f.saved('group', 'A', { memberItemIds: ['F', 'G'], groupRole: 'area' }); await f.saved('group', 'B', { memberItemIds: ['F'], groupRole: 'area' });
        for (const groupId of ['A', 'B', 'F']) {
            const result = f.progress({ groupId }); assert.equal(result.coverage, 'complete'); assert.equal(result.metrics.total, 2);
            assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']); assert.equal(result.scope.memberIds.includes(groupId), false);
            assert.deepEqual(result.hierarchy.groups.find(item => item.id === 'F').parentGroupIds, ['A', 'B']);
        }
        const project = f.progress(); assert.deepEqual(project.scope.directGroupIds, ['A', 'B']);
        assert.deepEqual(project.hierarchy.groups.map(item => item.id).sort(), ['A', 'B', 'F', 'G']);
    }),
    test('TC-TPT-205', 'project retains generic and ungrouped work while selected delivery remains independent of outside records', async f => {
        for (const [id, kind] of [['A', 'vision'], ['G', 'project'], ['P', 'task'], ['U', 'task'], ['T', 'subtask']]) await f.create(id, kind);
        await f.saved('group', 'G', { memberItemIds: ['P', 'T'] }); await f.saved('group', 'A', { memberItemIds: ['G'], groupRole: 'area' });
        const project = f.progress(); assert.deepEqual(project.hierarchy.ungroupedTaskIds, ['U']);
        assert.equal(project.hierarchy.groups.find(item => item.id === 'G').groupRole, null);
        assert.deepEqual(project.scope.memberIds, ['A', 'G', 'P', 'T', 'U']); assert.deepEqual(project.scope.eligibleTaskIds, ['P', 'U']);
        const selected = f.progress({ groupId: 'A' }); const revision = selected.metrics.scopeRevision;
        assert.deepEqual(selected.scope.eligibleTaskIds, ['P']); assert.ok(selected.items.some(item => item.id === 'U'));
        await f.create('OUTSIDE'); const reread = f.progress({ groupId: 'A' });
        assert.equal(reread.metrics.scopeRevision, revision); assert.deepEqual(reread.scope.eligibleTaskIds, ['P']);
        assert.equal(reread.metrics.percentage, 0);
    }),
    test('TC-TPT-211', 'invalid purposes empty patches and nongroup changes refuse with canonical bytes preserved', async f => {
        for (const [id, kind] of [['F', 'project'], ['P', 'task'], ['ST', 'story'], ['T', 'subtask'], ['I', 'initiative']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['P'] }); const before = new Map(f.records().map(item => [item.id, item.bytes]));
        for (const groupRole of ['module', 'AREA', '', false, 7, {}, [], undefined])
            refused(await f.perform('group', 'F', { groupRole }), 'INVALID_INPUT');
        refused(await f.perform('group', 'F', {}), 'INVALID_INPUT');
        for (const id of ['P', 'ST', 'T', 'I']) refused(await f.perform('group', id, { groupRole: 'area' }), 'INVALID_INPUT');
        refused(await f.perform('update', 'F', { groupRole: 'area' }), 'INVALID_INPUT');
        refused(await f.perform('create', 'NEW', { title: 'Defined', intent: 'Defined outcome', groupRole: 'area' }, { target: { kind: 'project', itemId: 'NEW' } }), 'INVALID_INPUT');
        for (const members of [['P', 'P'], ['F'], ['MISSING']]) refused(await f.perform('group', 'F', { memberItemIds: members }));
        for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
    }),
    test('TC-TPT-211', 'declared labels share project validation and fail closed at raw length control and shape boundaries', async f => {
        const { validateTaskTracking, groupLabels, DEFAULT_GROUP_LABELS } = require('../../lib/task-tracking-config.cjs');
        const { validateConfig } = require('../../lib/project-config-schema.cjs');
        await f.create('F', 'project'); const before = f.bytes('F');
        for (const groupLabelsValue of [null, [], 'Feature', { other: 'Other' }, { area: '' }, { area: '   ' }, { area: 'x'.repeat(161) },
            { area: 'line\nfeed' }, { area: '\u0000' }, { area: '\u007f' }, { area: '\u0085' }, { area: 9 }, { area: false }]) {
            f.config.taskTracking.groupLabels = groupLabelsValue;
            assert.ok(validateTaskTracking(f.config).length); assert.equal(validateConfig(f.config).valid, false);
            f.saveConfig(); const declared = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
            const result = f.progress(); assert.equal(result.coverage, 'unavailable'); assert.equal(result.metrics, null);
            assert.ok(result.diagnostics.some(item => item.code === 'INVALID_CONFIG'));
            assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), declared);
            assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/projects/F.md')), before);
        }
        for (const value of [{}, { area: 'x'.repeat(160) }, { area: ' Module ', capability: '<script>inert()</script>' }, { area: 'Same', capability: 'Same', program: 'Same' }]) {
            f.config.taskTracking.groupLabels = value; assert.deepEqual(validateTaskTracking(f.config), []); assert.equal(validateConfig(f.config).valid, true); f.saveConfig();
            assert.deepEqual(f.progress().hierarchy.labels, { ...DEFAULT_GROUP_LABELS, ...Object.fromEntries(Object.entries(value).map(([key, label]) => [key, label.trim()])) });
            assert.deepEqual(f.bytes('F'), before);
        }
        assert.deepEqual(groupLabels({}), DEFAULT_GROUP_LABELS);
    }),
    test('TC-TPT-212', 'manual corrupt membership reads terminate honestly without selecting duplicated owners or repairing bytes', async f => {
        const { patchRecord } = require('../../lib/task-artifact-store.cjs');
        for (const [id, kind] of [['F', 'project'], ['G', 'vision'], ['P', 'task']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['P'] }); const original = new Map(f.records().map(item => [item.id, item]));
        // Deliberate outside-host imports: core writes already refuse these graphs.
        for (const variant of ['self', 'cycle', 'missing', 'duplicate']) {
            for (const item of original.values()) f.write(item.ownerPath, item.bytes);
            if (variant === 'duplicate') f.write('work/tasks/duplicate.md', original.get('P').bytes);
            else f.write(original.get('F').ownerPath, patchRecord(original.get('F'), {}, { ...original.get('F').tracking,
                memberItemIds: variant === 'self' ? ['F', 'P'] : variant === 'cycle' ? ['G', 'P'] : ['MISSING', 'P'] }).bytes);
            if (variant === 'cycle') f.write(original.get('G').ownerPath, patchRecord(original.get('G'), {}, { ...original.get('G').tracking, memberItemIds: ['F'] }).bytes);
            const imported = f.records().map(item => [item.ownerPath, item.bytes]); const result = f.progress({ groupId: 'F' });
            assert.equal(result.coverage, 'partial'); assert.equal(result.metrics.percentage, null); assert.ok(result.diagnostics.length);
            if (variant === 'duplicate') { assert.deepEqual(result.scope.eligibleTaskIds, []); assert.equal(result.scope.memberIds.includes('P'), false); }
            else assert.deepEqual(result.scope.eligibleTaskIds, ['P']);
            for (const [ownerPath, bytes] of imported) assert.deepEqual(fs.readFileSync(path.join(f.root, ownerPath)), bytes);
            if (variant === 'duplicate') fs.unlinkSync(path.join(f.root, 'work/tasks/duplicate.md'));
        }
        for (const item of original.values()) f.write(item.ownerPath, item.bytes);
        for (const groupId of ['P', 'MISSING']) {
            const result = f.progress({ groupId }); assert.equal(result.coverage, 'unavailable'); assert.equal(result.metrics, null);
            assert.equal(result.scope.coverage, 'unavailable'); assert.ok(result.items.some(item => item.id === 'P'));
            assert.ok(result.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
        }
        const group = original.get('F');
        f.write(group.ownerPath, patchRecord(group, {}, { ...group.tracking, groupRole: 'unknown' }).bytes);
        const malformed = f.progress({ groupId: 'F' }); assert.equal(malformed.coverage, 'partial'); assert.equal(malformed.metrics.percentage, null);
        assert.ok(malformed.diagnostics.some(item => item.code === 'INVALID_RECORD'));
        assert.equal(malformed.items.find(item => item.id === 'F').groupRole, null);
    }),
    test('TC-TPT-213', 'narrow scope preserves global management and exact shared-spec concern selection without inferred members', async f => {
        const { readConcerns } = require('../../lib/task-tracking-concerns.cjs');
        for (const [id, kind] of [['F', 'project'], ['P', 'task'], ['Q', 'task'], ['T', 'subtask'], ['Z', 'subtask']]) await f.create(id, kind);
        f.write('intent/shared.md', '---\nid: SPEC-SHARED\n---\nShared governing intent.\n');
        for (const id of ['P', 'Q']) await f.saved('link', id, { links: [{ relation: 'spec', path: 'intent/shared.md' }] });
        await f.saved('link', 'Z', { links: [{ relation: 'parent', itemId: 'P' }] });
        await f.saved('group', 'F', { memberItemIds: ['P', 'T'] });
        const pending = f.request('update', 'Q', { title: 'Retained pending Q draft' }); const draft = JSON.stringify(pending); const q = f.bytes('Q');
        const scoped = f.progress({ groupId: 'F' }); assert.deepEqual(scoped.scope.memberIds, ['P', 'T']); assert.deepEqual(scoped.scope.eligibleTaskIds, ['P']);
        assert.equal(scoped.metrics.total, 1); assert.ok(scoped.items.some(item => item.id === 'Q')); assert.ok(scoped.items.some(item => item.id === 'Z'));
        const onlyP = readConcerns(f.root, { schemaVersion: 1, itemIds: ['P'] });
        assert.equal(onlyP.items.some(item => item.itemId === 'Q'), false); assert.ok(onlyP.relationships.some(item => item.owner.itemId === 'P' && item.relation === 'spec'));
        const shared = readConcerns(f.root, { schemaVersion: 1, paths: ['intent/shared.md'] });
        assert.ok(shared.relationships.some(item => item.owner.itemId === 'Q' && item.owner.ownerPath === f.record('Q').ownerPath && item.relation === 'spec' && item.direction === 'incoming'));
        assert.equal(JSON.stringify(pending), draft); assert.deepEqual(f.bytes('Q'), q);
    }),
    test('TC-TPT-221', 'descriptive roles preserve independent read write automatic and profile controls', async f => {
        await f.create('F', 'project'); await f.create('P'); await f.saved('group', 'F', { memberItemIds: ['P'] });
        const before = f.bytes('F'); const denied = f.request('group', 'F', { groupRole: 'area' });
        refused(await f.core.executeOperation(denied, f.authority({ canWrite: false })), 'NOT_PERMITTED'); assert.deepEqual(f.bytes('F'), before);
        for (const mode of ['off', 'observe', 'linked']) {
            f.config.taskTracking.mode = mode; f.saveConfig(); assert.deepEqual(f.progress({ groupId: 'F' }).scope.eligibleTaskIds, ['P']);
            const automatic = await f.perform('group', 'F', { groupRole: 'area' }, {}, { automatic: true, linkedItemIds: ['F'] });
            if (mode === 'linked') refused(automatic, 'NOT_PERMITTED'); else assert.equal(automatic.primary.status, 'skipped');
            assert.deepEqual(f.bytes('F'), before);
        }
        await f.saved('group', 'F', { groupRole: 'area' }); assert.equal(f.view('F').groupRole, 'area');
        const current = f.bytes('F'); f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'unavailable', sources: [] }; f.saveConfig();
        assert.equal(f.progress().coverage, 'unavailable'); refused(await f.perform('group', 'F', { groupRole: null }));
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/projects/F.md')), current);
    }),
    test('TC-TPT-231', 'all purpose kinds and independent inert labels conserve lifecycle proof custom content and membership', async f => {
        const { GROUP_ROLES } = require('../../lib/task-tracking-config.cjs');
        await f.create('P'); await f.accepted('P'); const child = f.bytes('P');
        for (const kind of ['project', 'vision']) {
            const id = `GROUP-${kind}`; await f.create(id, kind); await f.saved('group', id, { memberItemIds: ['P'] });
            const plain = f.record(id); assert.ok(plain.text.includes('tracking: {'));
            f.write(plain.ownerPath, plain.text.replace('tracking: {', 'tracking: {"adopterExtension":{"keep":"original"},') + '\nAuthored group body stays.\n');
            const body = f.record(id).body; const baseline = f.progress({ groupId: id });
            for (const role of GROUP_ROLES) {
                const before = f.record(id); await f.saved('group', id, { groupRole: role }); const after = f.record(id);
                assert.deepEqual(after.tracking.adopterExtension, { keep: 'original' }); assert.equal(after.body, body);
                assert.deepEqual(after.tracking.memberItemIds, ['P']); assert.equal(after.data.status, before.data.status);
                assert.deepEqual(after.tracking.acceptanceHistory, before.tracking.acceptanceHistory); assert.deepEqual(after.tracking.proofs, before.tracking.proofs);
                const scoped = f.progress({ groupId: id }); assert.deepEqual(scoped.metrics, baseline.metrics); assert.deepEqual(f.bytes('P'), child);
                for (const labels of [{ area: 'One' }, { capability: 'One', area: 'One' }, { program: '<b>display</b>' }]) {
                    const ownBytes = f.bytes(id); f.config.taskTracking.groupLabels = labels; f.saveConfig(); const reread = f.progress({ groupId: id });
                    assert.deepEqual(reread.metrics, baseline.metrics); assert.deepEqual(reread.scope.eligibleTaskIds, baseline.scope.eligibleTaskIds);
                    assert.deepEqual(reread.health, baseline.health); assert.deepEqual(f.bytes(id), ownBytes); assert.deepEqual(f.bytes('P'), child);
                }
            }
            await f.saved('group', id, { groupRole: null }); assert.equal(f.view(id).groupRole, null); assert.deepEqual(f.view(id).memberItemIds, ['P']);
        }
    }),
    test('TC-TPT-232', 'finite graph permutations and portable states conserve unique identities and exclude every nonmembership edge', async () => {
        const { scopeProjection, scopeMetrics } = require('../../lib/task-progress-reader.cjs');
        const task = (id, state = 'draft', retired = null) => ({ id, kind: 'task', state, retired, memberItemIds: [], acceptance: { accepted: state === 'done' }, verification: { status: state === 'done' ? 'current' : 'missing' } });
        const outcomes = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'].map((state, n) => task(`P${n}`, state));
        outcomes.push(task('RETIRED', 'done', { reason: 'Retained exclusion' }), task('OUTSIDE'));
        const items = [...outcomes, { id: 'T', kind: 'subtask', memberItemIds: [] }, { id: 'I', kind: 'initiative', memberItemIds: [] },
            { id: 'G', kind: 'vision', groupRole: 'program', memberItemIds: ['P0', 'P0', 'P6', 'T'] },
            { id: 'F', kind: 'project', groupRole: 'capability', memberItemIds: ['G', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'RETIRED', 'I'], links: [{ relation: 'parent', itemId: 'OUTSIDE' }] }];
        for (const reverse of [false, true]) {
            const ordered = (reverse ? [...items].reverse() : items).map(item => ({ ...item, memberItemIds: reverse ? [...item.memberItemIds].reverse() : item.memberItemIds }));
            const snapshot = { items: ordered, coverage: 'complete', context: { config: {} } }; const selected = scopeProjection(snapshot, 'F');
            assert.equal(selected.coverage, 'complete'); assert.deepEqual(selected.scope.eligibleTaskIds, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
            assert.deepEqual(selected.scope.excludedTaskIds, ['P7', 'RETIRED']); assert.equal(selected.metrics.total, 7); assert.equal(selected.metrics.accepted, 1);
            assert.equal(selected.metrics.currentlyVerified, 1); assert.equal(selected.scope.memberIds.includes('OUTSIDE'), false);
            assert.deepEqual(selected.scope.directGroupIds, ['G']); assert.deepEqual(scopeMetrics(snapshot, 'F'), selected.metrics);
            assert.deepEqual(scopeProjection(snapshot).hierarchy.ungroupedTaskIds, ['OUTSIDE']);
        }
        const empty = scopeProjection({ items: [], coverage: 'complete', context: { config: {} } });
        assert.equal(empty.metrics.total, 0); assert.equal(empty.metrics.percentage, null);
        const unknown = scopeProjection({ items: [task('KNOWN')], coverage: 'partial', context: { config: {} } });
        assert.equal(unknown.metrics.total, 1); assert.equal(unknown.metrics.percentage, null); assert.deepEqual(unknown.scope.eligibleTaskIds, ['KNOWN']);
    }),
    test('TC-TPT-212', 'edge and navigation byte bounds disclose omissions without complete percentages or invented ungrouped claims', async () => {
        const { scopeProjection } = require('../../lib/task-progress-reader.cjs'); const { LIMITS } = require('../../lib/task-tracking-config.cjs');
        const task = id => ({ id, kind: 'task', state: 'draft', memberItemIds: [], acceptance: { accepted: false }, verification: { status: 'missing' } });
        const outcomes = Array.from({ length: 201 }, (_, n) => task(`P-${n}`));
        const groups = Array.from({ length: 100 }, (_, n) => ({ id: `G-${n}`, kind: 'project', groupRole: 'area', memberItemIds: outcomes.map(item => item.id) }));
        assert.ok(groups.length * outcomes.length > LIMITS.membershipEdges);
        const bounded = scopeProjection({ items: [...outcomes, ...groups], coverage: 'complete', context: { config: {} } });
        assert.equal(bounded.coverage, 'partial'); assert.equal(bounded.metrics.percentage, null);
        assert.ok(bounded.diagnostics.some(item => item.code === 'LIMIT_EXCEEDED')); assert.deepEqual(bounded.hierarchy.ungroupedTaskIds, []);
        assert.deepEqual(bounded.scope.directGroupIds, []); assert.deepEqual(bounded.scope.eligibleTaskIds, bounded.metrics.eligibleIds);
        const longOutcomes = outcomes.slice(0, 200).map((item, n) => ({ ...item, id: `P${n}-` + 'x'.repeat(110) }));
        const longGroups = groups.map((item, n) => ({ ...item, id: `G${n}-` + 'y'.repeat(110), memberItemIds: longOutcomes.map(value => value.id) }));
        const byteBound = scopeProjection({ items: [...longOutcomes, ...longGroups], coverage: 'complete', context: { config: {} } });
        assert.equal(byteBound.coverage, 'partial'); assert.ok(byteBound.diagnostics.some(item => /byte budget/.test(item.reason)));
        assert.equal(byteBound.metrics.percentage, null); assert.deepEqual(byteBound.scope.affiliations, []);
        assert.ok(Buffer.byteLength(JSON.stringify({ hierarchy: byteBound.hierarchy, scope: byteBound.scope })) <= LIMITS.recordBytes);
        assert.equal(byteBound.metrics.total, longOutcomes.length);
    }),
    test('TC-TPT-233', 'pinned labels roles and membership remain baseline-specific after local vocabulary and scope changes', async f => {
        const { git } = require('../lib/task-tracking-fixture.cjs');
        await f.create('F', 'project'); await f.create('P'); await f.create('Q'); await f.saved('group', 'F', { memberItemIds: ['P'], groupRole: 'capability' });
        f.config.taskTracking.groupLabels = { capability: 'Baseline outcome' }; f.saveConfig();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Isolated selected baseline']); const oid = git(f, ['rev-parse', 'HEAD']);
        await f.saved('group', 'F', { memberItemIds: ['Q'], groupRole: 'area' }); f.config.taskTracking.groupLabels = { area: 'Personal scope', capability: 'Local outcome' }; f.saveConfig();
        const bytes = new Map(f.records().map(item => [item.id, item.bytes])); const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        const shared = f.progress({ ref: oid, groupId: 'F' }); const local = f.progress({ groupId: 'F' });
        assert.equal(shared.source.oid, oid); assert.equal(shared.hierarchy.labels.capability, 'Baseline outcome'); assert.equal(shared.hierarchy.labels.area, 'Area');
        assert.equal(shared.hierarchy.groups.find(item => item.id === 'F').groupRole, 'capability'); assert.deepEqual(shared.scope.eligibleTaskIds, ['P']);
        assert.equal(local.hierarchy.labels.area, 'Personal scope'); assert.deepEqual(local.scope.eligibleTaskIds, ['Q']);
        assert.notEqual(shared.fingerprint, local.fingerprint);
        for (const [id, before] of bytes) assert.deepEqual(f.bytes(id), before); assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
    }),
    test('TC-TPT-234', 'group exact retries preserve newer members and changed reused payload or stale preview refuses', async f => {
        for (const [id, kind] of [['F', 'project'], ['P', 'task'], ['Q', 'task']]) await f.create(id, kind);
        await f.saved('group', 'F', { memberItemIds: ['P'] });
        const request = f.request('group', 'F', { groupRole: 'capability' }); const draft = JSON.stringify(request);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority()); assert.equal(preview.primary.status, 'preview');
        const savedRequest = { ...request, previewToken: preview.previewToken }; const saved = await f.core.executeOperation(savedRequest, f.authority()); assert.equal(saved.primary.status, 'saved');
        await f.saved('group', 'F', { memberItemIds: ['Q'] }); const newer = f.record('F');
        const replay = await f.core.executeOperation(savedRequest, f.authority()); assert.equal(replay.primary.replayed, true); assert.deepEqual(f.bytes('F'), newer.bytes);
        refused(await f.core.executeOperation({ ...savedRequest, patch: { groupRole: 'area' } }, f.authority()), 'REUSED_OPERATION'); assert.deepEqual(f.bytes('F'), newer.bytes);
        const stale = f.request('group', 'F', { groupRole: 'program' }); const stalePreview = await f.core.executeOperation({ ...stale, preview: true }, f.authority());
        await f.saved('group', 'F', { memberItemIds: ['P', 'Q'] }); const latest = f.bytes('F');
        refused(await f.core.executeOperation({ ...stale, previewToken: stalePreview.previewToken }, f.authority()), 'CONFLICT');
        assert.deepEqual(f.bytes('F'), latest); assert.equal(JSON.stringify(request), draft);
        const scope = f.progress({ groupId: 'F' }); assert.deepEqual(scope.scope.eligibleTaskIds, ['P', 'Q']); assert.equal(scope.metrics.total, 2);
        assert.equal(f.view('F').groupRole, 'capability');
    }),
    test('TC-TPT-234', 'changed actor authority or unsupported profile after preview preserves the group and original draft', async f => {
        await f.create('F', 'project'); await f.create('P'); await f.saved('group', 'F', { memberItemIds: ['P'] });
        const request = f.request('group', 'F', { groupRole: 'program' }); const draft = JSON.stringify(request);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority()); assert.equal(preview.primary.status, 'preview');
        const before = f.bytes('F'); const pending = { ...request, previewToken: preview.previewToken };
        refused(await f.core.executeOperation(pending, f.authority({ actor: 'peer' })), 'NOT_PERMITTED');
        refused(await f.core.executeOperation(pending, f.authority({ canWrite: false })), 'NOT_PERMITTED');
        assert.deepEqual(f.bytes('F'), before);
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'unproved', sources: [] }; f.saveConfig();
        refused(await f.core.executeOperation(pending, f.authority()), 'UNPROVED_NATIVE_CAPABILITY');
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/projects/F.md')), before); assert.equal(JSON.stringify(request), draft);
    }),

] };
