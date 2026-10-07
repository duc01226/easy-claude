'use strict';

const { trackingContext, LIMITS, ITEM_ID, groupLabels } = require('./task-tracking-config.cjs');
const { inspectRecords, stableValue } = require('./task-artifact-store.cjs');
const { readBytes, hash, fail } = require('./task-tracking-files.cjs');
const { resolveTrackingProfile, nativeInventory } = require('./task-tracking-profile.cjs');
const { bindRecordContext, prerequisiteReasons, requireReady, healthStatus } = require('./task-tracking-policy.cjs');
const { recordView, sanitized } = require('./task-tracking.cjs');

function evidenceReader(context) {
    const observed = new Map();
    return { observed, read(relative) {
        if (observed.has(relative)) return observed.get(relative).bytes;
        const bytes = context.readSource ? context.readSource(relative) : readBytes(context.root, relative);
        observed.set(relative, { bytes, contentHash: hash(bytes) });
        return bytes;
    } };
}

function inspectSnapshot(root, pinned) {
    let context = { ...(pinned?.context || trackingContext(root)) };
    const profile = resolveTrackingProfile(context);
    if (!profile.available) {
        const native = nativeInventory(context);
        return { context, profile, records: [], items: [], diagnostics: native.diagnostics, coverage: 'unavailable', native,
            fingerprint: hash(stableValue({ config: context.config, inventory: native.inventory })) };
    }
    const scan = pinned?.scan || inspectRecords(context);
    const evidence = evidenceReader(context);
    context.readEvidence = relative => evidence.read(relative);
    context = bindRecordContext(context, scan.records, { memoizeProof: true });
    const findings = context.recordAnalysis.findings;
    const items = [];
    const diagnostics = [...scan.diagnostics, ...findings];
    for (const record of scan.records) {
        try {
            const item = recordView(record, context);
            item.prerequisiteReasons = prerequisiteReasons(record, scan.records, context, findings);
            if (item.state === 'ready') {
                try { requireReady(record, scan.records, context, !!record.tracking?.readiness?.reviewed); }
                catch (error) { item.prerequisiteReasons.push(error.code ? error.message : 'Current readiness cannot be established'); }
            }
            if (item.verification.status === 'unknown') diagnostics.push({ itemId: item.id, code: item.verification.code, reason: item.verification.reason });
            if (item.assigneeId && !context.attributionMembers.some(m => m.id === item.assigneeId)) diagnostics.push({ itemId: item.id, code: 'UNKNOWN_MEMBER', reason: 'Recorded responsibility has no configured member or historical contributor label' });
            items.push(item);
        } catch (error) { diagnostics.push({ itemId: record.id, code: error.code || 'UNSUPPORTED', reason: 'Work metadata cannot be safely projected' }); }
    }
    const input = { config: context.config, source: context.source || 'worktree', owners: scan.records.map(r => [r.ownerPath, r.contentHash]).sort(),
        sources: [...evidence.observed].map(([relative, v]) => [relative, v.contentHash]).sort(), diagnostics,
        applicability: items.map(item => [item.id, item.verification.status, item.verification.proofIds, item.health.status]) };
    return { context, profile, records: scan.records, items, diagnostics, coverage: diagnostics.length ? 'partial' : scan.coverage,
        fingerprint: hash(stableValue(input)) };
}

function scopeProjection(snapshot, groupId) {
    const diagnostics = [];
    let coverage = snapshot.coverage;
    const diagnose = (code, reason, itemId) => {
        if (diagnostics.length < LIMITS.records) diagnostics.push({ code, reason, ...(itemId ? { itemId } : {}) });
        else if (['LIMIT_EXCEEDED', 'UNAVAILABLE_SCOPE'].includes(code)) diagnostics[diagnostics.length - 1] = {
            code, reason: `${reason}; additional scope findings were omitted`, ...(itemId ? { itemId } : {}) };
        if (coverage !== 'unavailable') coverage = 'partial';
    };
    const isGroup = item => item && ['epic', 'vision'].includes(item.kind);
    const items = new Map();
    // A duplicate remains ambiguous even if a later owner cannot be projected.
    const owners = snapshot.context?.recordAnalysis?.index;
    for (const item of snapshot.items) {
        if (items.has(item.id) || (owners?.has(item.id) && !owners.get(item.id))) {
            items.set(item.id, null); diagnose('DUPLICATE_ID', 'Scope identity has no unique owner', item.id);
        } else items.set(item.id, item);
    }
    const admitted = [...items.values()].filter(Boolean);
    const groups = admitted.filter(isGroup);
    const adjacency = new Map(groups.map(item => [item.id, []]));
    const parents = new Map(admitted.map(item => [item.id, []]));
    let edges = 0;
    let omitted = false;
    for (const item of groups) {
        const seen = new Set();
        if (!Array.isArray(item.memberItemIds)) { diagnose('INVALID_RECORD', 'Group members cannot be safely inspected', item.id); continue; }
        for (const id of item.memberItemIds) {
            if (typeof id !== 'string') { diagnose('INVALID_RECORD', 'Group member identity cannot be safely inspected', item.id); continue; }
            if (seen.has(id)) continue;
            seen.add(id);
            if (edges >= LIMITS.membershipEdges) { omitted = true; break; }
            edges++;
            if (!items.get(id)) { diagnose('UNRESOLVED_MEMBER', 'Declared member has no unique admitted owner', id); continue; }
            adjacency.get(item.id).push(id);
            parents.get(id).push(item.id);
        }
        if (omitted) break;
    }
    if (omitted) diagnose('LIMIT_EXCEEDED', 'Membership or affiliation edges were omitted at the projection budget');
    // Linear topological check: sharing is valid, a remaining cycle is not.
    const indegree = new Map(groups.map(item => [item.id, 0]));
    for (const members of adjacency.values()) for (const id of members) if (indegree.has(id)) indegree.set(id, indegree.get(id) + 1);
    const roots = groups.filter(item => indegree.get(item.id) === 0).map(item => item.id);
    const pendingGroups = [...roots];
    for (let position = 0; position < pendingGroups.length; position++) {
        for (const id of adjacency.get(pendingGroups[position])) if (indegree.has(id)) {
            indegree.set(id, indegree.get(id) - 1);
            if (indegree.get(id) === 0) pendingGroups.push(id);
        }
    }
    if (pendingGroups.length !== groups.length) diagnose('CYCLE', 'Declared group membership contains a cycle');
    const sort = values => [...values].sort();
    const hierarchy = { labels: groupLabels(snapshot.context?.config), groups: groups.map(item => ({ id: item.id, groupRole: item.groupRole ?? null,
        directGroupIds: sort(adjacency.get(item.id).filter(id => isGroup(items.get(id)))), parentGroupIds: sort(parents.get(item.id)) })),
        ungroupedPbiIds: omitted ? [] : sort(admitted.filter(item => item.kind === 'pbi' && !parents.get(item.id).length).map(item => item.id)), coverage };
    if (groupId && !isGroup(items.get(groupId))) {
        diagnose('UNAVAILABLE_SCOPE', 'Selected group has no unique epic or vision owner', groupId);
        return { hierarchy: { ...hierarchy, coverage }, scope: { kind: 'group', itemId: groupId, memberIds: [], pbiIds: [], eligiblePbiIds: [],
            excludedPbiIds: [], directGroupIds: [], affiliations: [], coverage: 'unavailable' }, metrics: null, diagnostics, coverage: 'unavailable' };
    }
    const selected = new Set();
    const visited = new Set();
    const pending = groupId ? [groupId] : admitted.map(item => item.id);
    while (pending.length) {
        const id = pending.pop();
        if (visited.has(id)) continue;
        visited.add(id);
        if (!items.get(id)) continue;
        if (id !== groupId) selected.add(id);
        if (adjacency.has(id)) pending.push(...adjacency.get(id));
    }
    const all = [...selected].map(id => items.get(id)).filter(item => item.kind === 'pbi');
    const canceled = all.filter(item => item.state === 'canceled').length;
    const retired = all.filter(item => item.retired && item.state !== 'canceled').length;
    const eligible = all.filter(item => item.state !== 'canceled' && !item.retired);
    const accepted = eligible.filter(item => item.acceptance.accepted);
    const currentlyVerified = accepted.filter(item => item.verification.status === 'current').length;
    const metrics = { unit: 'unique-pbi', scope: groupId ? { kind: 'group', itemId: groupId } : { kind: 'project' }, coverage,
        scopeRevision: hash(stableValue(eligible.map(i => i.id).sort())), eligibleIds: eligible.map(i => i.id).sort(),
        total: eligible.length, accepted: accepted.length, remaining: eligible.length - accepted.length, currentlyVerified,
        canceled, retired, percentage: coverage === 'complete' && eligible.length ? accepted.length / eligible.length * 100 : null };
    const affiliations = sort(groupId ? new Set([...selected, groupId]) : selected)
        .filter(id => items.get(id).kind === 'pbi' || isGroup(items.get(id)))
        .map(itemId => ({ itemId, groupIds: sort(parents.get(itemId)) }));
    const scope = { ...metrics.scope, memberIds: sort(selected), pbiIds: sort(all.map(item => item.id)), eligiblePbiIds: [...metrics.eligibleIds],
        excludedPbiIds: sort(all.filter(item => item.state === 'canceled' || item.retired).map(item => item.id)),
        directGroupIds: groupId ? sort(adjacency.get(groupId).filter(id => isGroup(items.get(id)))) : omitted ? [] : sort(roots), affiliations, coverage };
    // The additive navigation payload has its own existing record-byte ceiling.
    // Conserve known identities/counts, omit navigation explicitly, never label it complete.
    if (Buffer.byteLength(JSON.stringify({ hierarchy, scope })) > LIMITS.recordBytes) {
        diagnose('LIMIT_EXCEEDED', 'Navigation affiliations were omitted at the projection byte budget');
        hierarchy.groups = hierarchy.groups.map(item => ({ ...item, directGroupIds: [], parentGroupIds: [] }));
        hierarchy.ungroupedPbiIds = []; scope.directGroupIds = []; scope.affiliations = [];
        hierarchy.coverage = scope.coverage = metrics.coverage = coverage;
        metrics.percentage = null;
    }
    return { hierarchy, scope, metrics, diagnostics, coverage };
}

function scopeMetrics(snapshot, groupId) { return scopeProjection(snapshot, groupId).metrics; }

function readProgress(root, options = {}) {
    try {
        if (options.groupId !== undefined && (typeof options.groupId !== 'string' || !ITEM_ID.test(options.groupId))) fail('INVALID_INPUT', 'Select one exact group identity');
        const pinned = options.ref !== undefined ? require('../../skills/task-track/lib/shared-snapshot.cjs').loadSharedSnapshot(root, options.ref) : undefined;
        let snapshot;
        let consistent = false;
        for (let attempt = 0; attempt <= LIMITS.readRetries; attempt++) {
            const before = inspectSnapshot(root, pinned);
            const after = inspectSnapshot(root, pinned);
            snapshot = after;
            if (before.fingerprint === after.fingerprint) { consistent = true; break; }
        }
        if (!consistent) { snapshot.coverage = 'partial'; snapshot.diagnostics.push({ code: 'SOURCE_CHANGED', reason: 'Selected sources changed during inspection; reread before relying on this snapshot' }); }
        const projection = snapshot.profile.available ? scopeProjection(snapshot, options.groupId) : null;
        const metrics = projection?.metrics || null;
        const healthOwnerId = options.groupId || snapshot.context.config.taskTracking?.healthOwnerId;
        const healthOwners = snapshot.records.filter(record => record.id === healthOwnerId);
        const health = snapshot.profile.available && projection?.scope.coverage !== 'unavailable' && healthOwners.length === 1 ? healthStatus(healthOwners[0], snapshot.context)
            : { status: 'unknown', reason: healthOwnerId ? 'Exact health owner is unavailable or ambiguous' : 'No explicit project health owner selected' };
        const ready = snapshot.items.filter(i => i.state === 'ready' && !i.retired && !i.prerequisiteReasons.length)
            .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en')).map(i => i.id);
        const excluded = snapshot.items.filter(i => !ready.includes(i.id)).map(i => ({ itemId: i.id, reasons:
            [...(i.state !== 'ready' ? [`Recorded state is ${i.state}`] : []), ...(i.retired ? ['Retired'] : []), ...i.prerequisiteReasons] }));
        return sanitized({ schemaVersion: 1, project: { name: snapshot.context.config.project?.name || 'Selected project', root: snapshot.context.root },
            source: snapshot.context.source || { kind: 'worktree', label: 'Local working copy; proposals may be unshared', remoteFreshness: 'unknown' },
            asOf: new Date().toISOString(), coverage: projection?.coverage || snapshot.coverage, fingerprint: snapshot.fingerprint,
            profile: snapshot.profile, mode: snapshot.context.mode, enrolled: snapshot.context.enrolled,
            members: snapshot.context.attributionMembers || snapshot.context.members, reportPolicy: snapshot.context.report, metrics,
            health, ready, excluded, hierarchy: projection?.hierarchy || null, scope: projection?.scope || null,
            items: snapshot.items, diagnostics: [...snapshot.diagnostics, ...(projection?.diagnostics || [])], native: snapshot.native || null });
    } catch (error) {
        return { schemaVersion: 1, coverage: 'unavailable', profile: { available: false, capabilities: [] }, metrics: null,
            items: [], members: [], ready: [], excluded: [], diagnostics: [{ code: error.code || 'IO_FAILURE',
                reason: error.code ? error.message : 'Selected project cannot be inspected' }] };
    }
}

module.exports = { inspectSnapshot, readProgress, scopeMetrics, scopeProjection, sanitized };
