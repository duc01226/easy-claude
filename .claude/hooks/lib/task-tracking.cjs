'use strict';

const { trackingContext, KINDS, GROUP_ROLES, LIMITS, MEMBER_ID, relativePath } = require('./task-tracking-config.cjs');
const { fail, hash, readBytes } = require('./task-tracking-files.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { resolveTrackingProfile } = require('./task-tracking-profile.cjs');
const { ITEM_ID, inspectRecords, patchRecord, newRecord, saveRecord, stableValue } = require('./task-artifact-store.cjs');
const policy = require('./task-tracking-policy.cjs');
const { actorContext } = require('./task-tracking-identity.cjs');
const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');
const { redactSecrets } = require('./prompt-ledger-store.cjs');

const operation = (patchKeys, purpose, authority = 'Explicit write action') => Object.freeze({ patchKeys: Object.freeze(patchKeys), purpose, authority });
const OPERATIONS = Object.freeze({
    create: operation(['title', 'intent', 'criteria'], 'Capture one item with its own intent'),
    update: operation(['title', 'intent', 'priority', 'criteria', 'optOut'], 'Refine requested supported fields'),
    adopt: operation([], 'Preview and adopt preserved legacy content'),
    assign: operation(['assigneeId', 'collaboratorIds'], 'Assign stable responsible members'),
    link: operation(['links'], 'Save canonical relationships; separate from session linkage'),
    group: operation(['memberItemIds', 'groupRole'], 'Maintain exact epic or vision members and optional purpose'),
    transition: operation(['state', 'reason', 'resolution', 'readiness', 'correction'], 'Apply a permitted lifecycle transition, or with correction place work in any other recorded state', 'Readiness needs actual review; raw Done is refused; a correction needs its own explicit action and a reason'),
    proof: operation(['proof'], 'Record an actual scoped observation', 'Manual needs explicit manual-proof action; test/review needs trusted observedProof'),
    accept: operation(['reason'], 'Accept current complete proof on verifying work', 'Separate actual human accepting decision'),
    retire: operation(['reason'], 'Retain history outside active scope'),
    restore: operation(['reason'], 'Restore an explicitly retired item'),
    activity: operation(['observation'], 'Record actual caller activity', 'Trusted matching observation; ordinary CLI cannot supply it'),
    attest: operation(['health'], 'Record explicit dated owner health', 'Explicit owner attestation action'),
    delete: operation(['reason'], 'Preview and delete an eligible unreferenced draft, or canceled or retired work that no record links to', 'Explicit draft deletion action and current preview; ended work needs its own explicit action')
});
// An older hand-written record may hold a label or other text where the ordering number belongs. It is ordered last,
// like a record with no priority; the authored value stays in the file untouched.
const orderingPriority = value => Number.isSafeInteger(value) && value >= 1 && value <= 999 ? value : 999;
const OPERATION_KEYS = Object.freeze(Object.fromEntries(Object.entries(OPERATIONS).map(([name, value]) => [name, value.patchKeys])));
const REQUEST_FIELDS = Object.freeze(['schemaVersion', 'operation', 'operationId', 'target', 'expected', 'actor', 'patch', 'context', 'preview', 'previewToken']);
const SHAPE_KEYS = Object.freeze({ target: Object.freeze(['kind', 'itemId']), actor: Object.freeze(['memberId']),
    expected: Object.freeze(['revision', 'contentHash']), context: Object.freeze(['runId', 'occurrenceId']),
    criterion: Object.freeze(['id', 'text']), relationship: Object.freeze(['relation', 'itemId', 'path']),
    proof: Object.freeze(['id', 'kind', 'result', 'observedAt', 'criteriaIds', 'criteriaIdentity', 'sourceIdentity', 'summary']),
    observation: Object.freeze(['kind', 'observedAt', 'summary', 'paths']) });
const CLI_ACTION_FLAGS = Object.freeze({ accept: '--accept', attest: '--attest-health', delete: '--delete-draft' });
// Canceled or retired work is deleted entirely under its own flag, so the draft flag keeps its narrow meaning.
const CLI_ENDED_DELETE_FLAG = '--delete-item';
// Placing work in a state outside the usual steps is a person's own decision, so it has its own flag as well.
const CLI_STATE_CORRECTION_FLAG = '--change-state';

function operationCatalogue() {
    // Discovery describes the actual validator/authority boundary; it never grants permission.
    return { schemaVersion: 1, defaultPurpose: 'inspect', kinds: [...KINDS], states: [...policy.STATES], linkRoles: [...policy.LINK_ROLES],
        request: { fields: [...REQUEST_FIELDS], required: ['schemaVersion', 'operation', 'operationId', 'target', 'actor', 'patch'],
            shapes: Object.fromEntries(Object.entries(SHAPE_KEYS).map(([name, keys]) => [name, [...keys]])),
            existingItem: 'Exact itemId and expected revision/contentHash; creation forbids expected',
            context: 'Both actual runId and occurrenceId, matching caller authority',
            semanticValidation: 'Fields are not a complete JSON schema; current value, relationship, lifecycle, preview and authority guards still apply' },
        operations: Object.entries(OPERATIONS).map(([name, value]) => ({ name, purpose: value.purpose, patchKeys: [...value.patchKeys],
            authority: value.authority, cli: name === 'activity' ? { available: false, reason: 'No trusted observation path in ordinary apply CLI' }
                : name === 'proof' ? { available: true, kinds: ['manual'], flag: '--manual-proof', unavailableKinds: ['test', 'review'] }
                    : { available: true, ...(CLI_ACTION_FLAGS[name] ? { flag: CLI_ACTION_FLAGS[name] } : {}), ...(name === 'delete' ? { endedWorkFlag: CLI_ENDED_DELETE_FLAG } : {}), ...(name === 'transition' ? { correctionFlag: CLI_STATE_CORRECTION_FLAG } : {}) } })),
        limits: { requestBytes: LIMITS.recordBytes, batchOperations: 64 },
        preservation: 'Discovery and verification do not save, transition or accept work; request identity is retained on retry' };
}

function exact(value, keys, label) {
    if (!policy.object(value) || Object.keys(value).some(key => !keys.includes(key))) fail('INVALID_INPUT', `${label} contains unsupported fields`);
}

function validateRequest(request) {
    exact(request, REQUEST_FIELDS, 'Request');
    // Omitting the version or the operation is malformed input; naming one this tool does not have is unsupported.
    if (request.schemaVersion === undefined || request.operation === undefined) fail('INVALID_INPUT', 'A request states its schema version and operation');
    if (request.schemaVersion !== 1 || !Object.hasOwn(OPERATION_KEYS, request.operation)) fail('UNSUPPORTED', 'Unsupported tracking operation/version');
    if (!policy.string(request.operationId, 120) || !ITEM_ID.test(request.operationId)) fail('INVALID_INPUT', 'An exact stable operation identity is required');
    exact(request.target, SHAPE_KEYS.target, 'Target');
    if (!KINDS.includes(request.target.kind) || (request.target.itemId !== undefined && (typeof request.target.itemId !== 'string' || !ITEM_ID.test(request.target.itemId)))) fail('INVALID_INPUT', 'Target kind or identity is invalid');
    if (request.operation !== 'create' && typeof request.target.itemId !== 'string') fail('INVALID_INPUT', 'Select one exact item');
    exact(request.actor, SHAPE_KEYS.actor, 'Actor');
    if (typeof request.actor.memberId !== 'string' || !MEMBER_ID.test(request.actor.memberId)) fail('INVALID_INPUT', 'An explicit actor identity is required');
    exact(request.patch, OPERATION_KEYS[request.operation], 'Change');
    if (request.preview !== undefined && typeof request.preview !== 'boolean') fail('INVALID_INPUT', 'Preview must be boolean');
    if (request.previewToken !== undefined && !policy.HASH.test(request.previewToken)) fail('INVALID_INPUT', 'Preview token is invalid');
    if (request.operation !== 'create') {
        exact(request.expected, SHAPE_KEYS.expected, 'Expected record');
        if (!Number.isSafeInteger(request.expected.revision) || request.expected.revision < 0 || !policy.HASH.test(request.expected.contentHash)) fail('INVALID_INPUT', 'Reread the current revision and content identity');
    } else if (request.expected !== undefined) fail('INVALID_INPUT', 'Creation must not replace an existing record');
    if (request.context !== undefined) {
        exact(request.context, SHAPE_KEYS.context, 'Work context');
        if (!policy.string(request.context.runId, 120) || !policy.string(request.context.occurrenceId, 120)) fail('INVALID_INPUT', 'A workflow context needs both actual identities');
    }
    const serialized = stableValue(request);
    if (Buffer.byteLength(serialized) > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Request exceeds the byte budget');
    return hash(stableValue(Object.fromEntries(Object.entries(request).filter(([key]) => !['preview', 'previewToken'].includes(key)))));
}

function authorize(request, authority, context) {
    if (!authority || authority.actor !== request.actor.memberId || authority.canWrite !== true) fail('NOT_PERMITTED', 'Operation is not permitted for this workspace actor');
    if (request.context && (request.context.runId !== authority.context?.runId || request.context.occurrenceId !== authority.context?.occurrenceId)) fail('NOT_PERMITTED', 'Work context is not the actual caller context');
    if (authority.automatic) {
        if (context.mode !== 'linked') return { status: 'skipped', reason: context.mode === 'observe' ? 'Observe mode; no optional changes saved' : 'Automatic tracking is off' };
        if (!authority.linkedItemIds?.includes(request.target.itemId)) return { status: 'skipped', reason: 'No exact linked item selected; continue untracked' };
        if (!['activity', 'proof', 'transition'].includes(request.operation)) fail('NOT_PERMITTED', 'Automatic upkeep cannot create, assign, accept, or retire work');
        if (request.operation === 'transition' && !['blocked', 'verifying', 'in_progress'].includes(request.patch.state)) fail('NOT_PERMITTED', 'Automatic upkeep cannot approve readiness or acceptance');
        if (request.operation === 'transition' && stableValue(authority.observedTransition) !== stableValue(request.patch)) fail('NOT_PERMITTED', 'Automatic transition is not the actual caller observation');
    }
    Object.assign(context, actorContext(context, authority));
    if (context.members.length) policy.member(context, authority.actor, false);
    return null;
}

function metadata(kind) {
    return { schemaVersion: 1, revision: 1, kind, assigneeId: null, collaboratorIds: [], criteria: [], links: [], proofs: [],
        acceptanceHistory: [], history: [], receipts: [], optOut: false, retired: null };
}

function criteria(value) {
    if (!policy.list(value, c => policy.object(c) && Object.keys(c).every(k => SHAPE_KEYS.criterion.includes(k))
        && typeof c.id === 'string' && ITEM_ID.test(c.id) && policy.string(c.text, 8000)) || new Set(value.map(c => c.id)).size !== value.length) fail('INVALID_INPUT', 'Criteria need unique identities and defined outcomes');
    return value;
}

function update({ request, record }) {
    const p = request.patch;
    const fields = {};
    const tracking = {};
    for (const key of ['title', 'intent']) if (p[key] !== undefined) {
        if (!policy.string(p[key], key === 'title' ? 500 : 8000)) fail('INVALID_INPUT', `${key} needs a defined value`);
        fields[key] = p[key];
    }
    if (p.priority !== undefined) {
        if (!Number.isSafeInteger(p.priority) || p.priority < 1 || p.priority > 999) fail('INVALID_INPUT', 'Priority must be 1 through 999; lower comes first');
        fields.priority = p.priority;
    }
    if (p.criteria !== undefined) tracking.criteria = criteria(p.criteria);
    if (p.optOut !== undefined) { if (typeof p.optOut !== 'boolean') fail('INVALID_INPUT', 'Opt-out must be boolean'); tracking.optOut = p.optOut; }
    if (record.data.status === 'done' && (p.intent !== undefined || p.criteria !== undefined)) fail('REOPEN_REQUIRED', 'Reopen accepted work before changing its delivered scope');
    return { fields, tracking };
}

const handlers = {
    update, adopt: () => ({ fields: {}, tracking: {} }),
    attest({ request, context, authority, at }) {
        const health = request.patch.health;
        if (authority.automatic || !authority.canAttest || !policy.validHealth(health)
            || health.ownerId !== authority.actor || health.observedAt > at) fail('NOT_PERMITTED', 'Health needs an explicit current owner attestation with its actual date and reason');
        policy.member(context, health.ownerId);
        return { fields: {}, tracking: { health } };
    },
    assign({ request, context }) {
        if (!Object.hasOwn(request.patch, 'assigneeId')) fail('INVALID_INPUT', 'Select an assignee or explicit unassignment');
        const assigneeId = policy.member(context, request.patch.assigneeId)?.id || null;
        const tracking = { assigneeId };
        if (request.patch.collaboratorIds !== undefined) {
            if (!policy.list(request.patch.collaboratorIds, id => typeof id === 'string')) fail('INVALID_INPUT', 'Collaborators must be member identities');
            tracking.collaboratorIds = [...new Set(request.patch.collaboratorIds.map(id => policy.member(context, id).id))];
        }
        return { fields: { assigned_to: assigneeId }, tracking };
    },
    link({ request }) {
        if (!Array.isArray(request.patch.links)) fail('INVALID_INPUT', 'Select explicit relationships');
        for (const link of request.patch.links) {
            exact(link, SHAPE_KEYS.relationship, 'Relationship');
            if (link.path && (!relativePath(link.path) || isPrivacySensitive(link.path))) fail('UNSAFE_PATH', 'Relationship needs a permitted public project path');
        }
        return { fields: {}, tracking: { links: request.patch.links } };
    },
    group({ request, record }) {
        const patch = request.patch;
        if (!['epic', 'vision'].includes(record.kind)) fail('INVALID_INPUT', 'Group purpose and membership require an epic or vision');
        if (!Object.keys(patch).length) fail('INVALID_INPUT', 'No group change requested');
        const tracking = {};
        if (Object.hasOwn(patch, 'memberItemIds')) {
            if (!policy.list(patch.memberItemIds, id => typeof id === 'string' && ITEM_ID.test(id))) fail('INVALID_INPUT', 'Select exact work-group members');
            tracking.memberItemIds = patch.memberItemIds;
        }
        if (Object.hasOwn(patch, 'groupRole')) {
            if (patch.groupRole !== null && !GROUP_ROLES.includes(patch.groupRole)) fail('INVALID_INPUT', 'Group purpose is invalid');
            tracking.groupRole = patch.groupRole;
        }
        return { fields: {}, tracking };
    },
    transition({ request, record, records, context, authority, at }) { return policy.transition(record, request.patch, records, context, authority, at); },
    proof({ request, record, context, authority, at }) {
        const proof = request.patch.proof;
        exact(proof, SHAPE_KEYS.proof, 'Proof');
        if (!policy.validProof(proof) || proof.observedAt > at) fail('INVALID_INPUT', 'Proof needs actual scoped observations and identities');
        if (authority.automatic || proof.kind !== 'manual') {
            if (stableValue(authority.observedProof) !== stableValue(proof)) fail('NOT_PERMITTED', 'Proof is not the actual caller observation');
        } else if (!authority.canRecordManual) fail('NOT_PERMITTED', 'Manual proof requires an explicit observation action');
        const current = policy.identities(record, context);
        if (proof.criteriaIdentity !== current.criteriaIdentity || proof.sourceIdentity !== current.sourceIdentity
            || proof.criteriaIds.some(id => !current.criteriaIds.includes(id))) fail('STALE_PROOF', 'Proof does not apply to the current criteria and declared source');
        if ((record.tracking.proofs || []).some(p => p.id === proof.id)) fail('CONFLICT', 'Proof identity already exists; use the original operation receipt');
        return { fields: {}, tracking: { proofs: [...(record.tracking.proofs || []), proof] } };
    },
    accept({ request, record, context, authority, at }) {
        if (authority.automatic || !authority.canAccept || record.data.status !== 'verifying' || !policy.string(request.patch.reason)) fail('NOT_PERMITTED', 'Acceptance needs an actual scoped decision on verifying work');
        const proof = policy.proofStatus(record, context);
        if (proof.status !== 'current') fail('MISSING_PROOF', proof.reason);
        const acceptance = { id: request.operationId, itemId: record.id, actor: authority.actor, acceptedAt: at,
            reason: request.patch.reason, criteriaIdentity: proof.criteriaIdentity, sourceIdentity: proof.sourceIdentity,
            criteriaIds: proof.criteriaIds, proofIds: proof.proofIds };
        return { fields: { status: 'done' }, tracking: { acceptanceHistory: [...(record.tracking.acceptanceHistory || []), acceptance] } };
    },
    retire({ request, authority, at }) {
        if (!policy.string(request.patch.reason)) fail('INVALID_INPUT', 'Retirement needs a reason');
        return { fields: {}, tracking: { retired: { reason: request.patch.reason, actor: authority.actor, at } } };
    },
    restore({ request, record }) {
        if (!record.tracking.retired || !policy.string(request.patch.reason)) fail('INVALID_INPUT', 'Restore needs an existing retirement and a reason');
        return { fields: {}, tracking: { retired: null } };
    },
    activity({ request, record, authority }) {
        const observation = request.patch.observation;
        exact(observation, SHAPE_KEYS.observation, 'Observation');
        if (!['saved', 'started', 'handoff', 'failed', 'interrupted'].includes(observation.kind) || !policy.instant(observation.observedAt)
            || !policy.string(observation.summary) || !policy.list(observation.paths, p => relativePath(p) && !isPrivacySensitive(p), 64)) fail('INVALID_INPUT', 'Activity needs bounded exact observed facts');
        if (stableValue(observation) !== stableValue(authority.observation)) fail('NOT_PERMITTED', 'Activity is not the actual caller observation');
        return { fields: {}, tracking: { activity: [...(Array.isArray(record.tracking.activity) ? record.tracking.activity : []).slice(-63), observation] } };
    }
};

const acceptanceStatus = policy.acceptanceStatus;

function sanitized(value) {
    if (typeof value === 'string') return redactSecrets(value).text;
    if (Array.isArray(value)) return value.map(sanitized);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, sanitized(v)]));
    return value;
}

function recordView(record, context) {
    const proof = policy.proofStatus(record, context);
    const acceptance = acceptanceStatus(record);
    return { id: record.id, kind: record.kind, ownerPath: record.ownerPath, title: record.data.title, intent: record.data.intent || '',
        state: record.data.status, priority: orderingPriority(record.data.priority), revision: record.revision, contentHash: record.contentHash,
        assigneeId: record.tracking?.assigneeId || record.data.assigned_to || null, collaboratorIds: record.tracking?.collaboratorIds || [],
        criteria: record.tracking?.criteria || [], links: record.tracking?.links || [], memberItemIds: record.tracking?.memberItemIds || [],
        groupRole: GROUP_ROLES.includes(record.tracking?.groupRole) ? record.tracking.groupRole : null,
        blocker: record.tracking?.blocker || null, retired: record.tracking?.retired || null, optOut: record.tracking?.optOut || false,
        legacy: !record.tracking, acceptance, verification: proof, health: policy.healthStatus(record, context), activity: record.tracking?.activity || [],
        history: record.tracking?.history || [], proofs: record.tracking?.proofs || [], acceptanceHistory: record.tracking?.acceptanceHistory || [] };
}

function allocateId(records, kind, at) {
    const prefix = `${kind}-${at.slice(0, 10).replace(/-/g, '')}-`;
    const ids = new Set(records.map(record => record.id));
    for (let n = 1; n <= LIMITS.records + 1; n++) { const id = `${prefix}${String(n).padStart(4, '0')}`; if (!ids.has(id)) return id; }
    fail('LIMIT_EXCEEDED', 'No identity available within the allocation budget');
}

async function apply(request, authority, digest) {
    let context = trackingContext(authority.root);
    const skipped = authorize(request, authority, context);
    if (skipped) return { schemaVersion: 1, primary: skipped, secondary: [] };
    const profile = resolveTrackingProfile(context);
    if (!profile.available) fail(profile.code, profile.reason);
    const deletion = require('./task-tracking-deletion.cjs');
    const deletedReceipt = deletion.completedRecovery(context, request, digest);
    if (deletedReceipt) return deletedReceipt;
    if (request.operation === 'delete') return deletion.deleteDraft(context, request, digest, authority, recordView);
    const scan = inspectRecords(context);
    if (scan.coverage !== 'complete') fail('INCOMPLETE_SCOPE', 'Canonical scope is incomplete; inspect diagnostics before saving');
    context = policy.bindRecordContext(context, scan.records);
    const matches = scan.records.filter(r => r.id === request.target.itemId);
    let record = matches[0];
    for (const owner of scan.records) for (const receipt of owner.tracking?.receipts || []) if (receipt.operationId === request.operationId) {
        policy.validateMetadata(owner);
        if (receipt.digest !== digest || owner.kind !== request.target.kind || (request.target.itemId && owner.id !== request.target.itemId)) fail('REUSED_OPERATION', 'Operation identity was already used for a different request');
        return { schemaVersion: 1, primary: { ...receipt.result, replayed: true, receiptRevision: receipt.afterRevision },
            current: recordView(owner, context), secondary: [] };
    }
    for (const owner of scan.records) if (owner.tracking?.history?.some(entry => entry.operationId === request.operationId)) {
        policy.validateMetadata(owner);
        fail('REPLAY_HORIZON', 'This operation already completed but its receipt expired; reread before proposing a new operation');
    }
    const at = new Date().toISOString();
    if (request.operation === 'create') {
        if (record) fail('CONFLICT', 'Identity already has an authoritative home');
        if (scan.records.length >= LIMITS.records) fail('LIMIT_EXCEEDED', 'Record count reaches the selected budget');
        if (!policy.string(request.patch.title, 500) || !policy.string(request.patch.intent, 8000)) fail('INVALID_INPUT', 'Capture needs a title and intent');
        const id = request.target.itemId || allocateId(scan.records, request.target.kind, at);
        const tracking = metadata(request.target.kind);
        tracking.criteria = request.patch.criteria === undefined ? [] : criteria(request.patch.criteria);
        record = { ...newRecord({ id, kind: request.target.kind, title: request.patch.title, intent: request.patch.intent, tracking }, context), revision: 0 };
    } else {
        if (matches.length !== 1 || record.kind !== request.target.kind) fail('NOT_FOUND', 'Exact item has no unique owner in this workspace');
        policy.validateMetadata(record);
        if (authority.automatic && record.tracking?.optOut) return { schemaVersion: 1, primary: { status: 'skipped', reason: 'Item opted out of automatic upkeep' }, secondary: [] };
        if (record.revision !== request.expected.revision || record.contentHash !== request.expected.contentHash) fail('CONFLICT', 'Current item changed; reread and retain your draft');
        if (!record.tracking && request.operation !== 'adopt') fail('ADOPTION_REQUIRED', 'Legacy content preserved; preview explicit metadata adoption first');
        if (record.tracking?.retired && !['restore', 'retire'].includes(request.operation)) fail('RETIRED', 'Restore retired work before changing it');
    }
    const previous = record;
    if (!record.tracking) record = { ...record, tracking: metadata(record.kind) };
    let change = request.operation === 'create' ? { fields: {}, tracking: {} }
        : handlers[request.operation]({ request, record, records: scan.records, context, authority, at });
    const tracking = { ...record.tracking, ...change.tracking, revision: previous.revision + 1 };
    if (context.localActor && !(tracking.memberProfiles || []).some(person => person.id === context.localActor.id)) {
        if ((tracking.memberProfiles || []).length >= LIMITS.records) fail('LIMIT_EXCEEDED', 'Historical contributor attribution exceeds the record budget');
        tracking.memberProfiles = [...(tracking.memberProfiles || []), { id: context.localActor.id, displayName: context.localActor.displayName }];
    }
    const workContext = request.context || { operationId: request.operationId, kind: 'direct' };
    tracking.context = workContext;
    tracking.history = [...(tracking.history || []), { operationId: request.operationId, operation: request.operation, actor: authority.actor,
        at, beforeState: previous.data.status, afterState: change.fields.status || previous.data.status,
        beforeAssigneeId: previous.tracking?.assigneeId || null, afterAssigneeId: tracking.assigneeId || null, reason: request.patch.reason || null, context: workContext,
        ...(request.operation === 'transition' && previous.data.status === 'blocked' && change.fields.status === previous.tracking?.blocker?.resumeState
            ? { resolution: request.patch.resolution } : {}),
        ...(request.operation === 'attest' ? { health: tracking.health, previousHealth: previous.tracking?.health || null } : {}) }];
    const primary = { status: 'saved', operationId: request.operationId, itemId: record.id, kind: record.kind, ownerPath: record.ownerPath, revision: tracking.revision };
    tracking.receipts = [...(tracking.receipts || []), { operationId: request.operationId, digest, afterRevision: tracking.revision, result: primary }].slice(-LIMITS.receipts);
    const candidate = patchRecord(previous, change.fields, tracking);
    policy.validateMetadata(candidate);
    const others = scan.records.filter(r => r.id !== candidate.id);
    const beforeFindings = context.recordAnalysis.findings;
    const candidateContext = policy.bindRecordContext(context, [...others, candidate]);
    const afterFindings = candidateContext.recordAnalysis.findings;
    if (afterFindings.some(f => !beforeFindings.some(b => b.itemId === f.itemId && b.code === f.code && b.reason === f.reason))) fail('INVALID_RELATIONSHIP', 'Change introduces an unresolved relationship or cycle');
    // Every declared public link must be inspectable before it becomes authority.
    for (const link of candidate.tracking.links || []) if (link.path) readBytes(context.root, link.path);
    const previewToken = hash(stableValue({ digest, itemId: candidate.id,
        scope: scan.records.map(r => [r.id, r.contentHash]).sort(), config: context.config }));
    if (request.preview) return { schemaVersion: 1, primary: { status: 'preview', itemId: record.id, kind: record.kind, revision: tracking.revision },
        current: recordView(previous, context), proposed: recordView(candidate, candidateContext), previewToken, secondary: [] };
    if (request.previewToken !== undefined && request.previewToken !== previewToken) fail('CONFLICT', 'Preview scope changed; reread before saving');
    if (previous.revision === 0 && request.operation === 'adopt' && request.previewToken !== previewToken) fail('PREVIEW_REQUIRED', 'Explicit legacy adoption requires a current preview');
    if ((previous.tracking?.receipts || []).length >= LIMITS.receipts && request.previewToken !== previewToken) fail('REPLAY_HORIZON', 'Older retry history is unknown; inspect a current preview before applying');
    const persisted = saveRecord(context, candidate, request.operation === 'create' ? null : previous.contentHash);
    return { schemaVersion: 1, primary: { ...primary, contentHash: persisted.contentHash, replayed: false },
        current: recordView(candidate, candidateContext), secondary: [], durability: { atomicUnit: 'one-record-and-receipt', cooperatingWriters: true,
            directoryFlushed: persisted.directoryFlushed, arbitraryEditorCAS: false, powerLoss: 'unproved' } };
}

async function executeOperation(request, authority) {
    try {
        const digest = validateRequest(request);
        const context = trackingContext(authority?.root);
        const skipped = authorize(request, authority, context);
        if (skipped) return { schemaVersion: 1, primary: skipped, secondary: [] };
        const profile = resolveTrackingProfile(context);
        if (!profile.available) fail(profile.code, profile.reason);
        const result = request.preview ? await apply(request, authority, digest) : await withTrackingLock(context.root, () => apply(request, authority, digest));
        if (result.primary.status === 'saved' && !request.preview) {
            try {
                const { refreshInitializedReport } = require('./task-tracking-report.cjs');
                result.secondary.push(await refreshInitializedReport(context.root));
            } catch { result.secondary.push({ kind: 'report', status: 'pending', reason: 'Item saved; report refresh unavailable. Run report explicitly to recover' }); }
        }
        return sanitized(result);
    } catch (error) {
        return sanitized({ schemaVersion: 1, primary: { status: 'refused', code: error.code || 'IO_FAILURE',
            reason: error.code ? error.message : 'Tracking operation failed; inspect current content before retrying' }, secondary: [] });
    }
}

async function executeBatch(requests, authority) {
    if (!Array.isArray(requests) || requests.length > 64) fail('LIMIT_EXCEEDED', 'Select at most 64 exact operations per batch');
    const results = [];
    for (const request of requests) results.push(await executeOperation(request, authority));
    return { schemaVersion: 1, atomicity: 'per-record', results };
}

module.exports = { OPERATION_KEYS, operationCatalogue, validateRequest, executeOperation, executeBatch, acceptanceStatus, recordView, sanitized };
