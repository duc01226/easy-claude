'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('./project-root.cjs');
const { scopedPath, readBytes, ensureDirectory } = require('./task-tracking-files.cjs');
const { resolveProjectConfigPath, resolveSessionStoreRoot, decodeConfigText } = require('../../scripts/lib/workflow-routing-config.cjs');

const OFF = { policy: 'off', available: false, source: 'default' };
const MARKER = '<!-- CK:GUIDED-WORK-CLAIM -->';
const GROUP = 'guided-work-claim';
const STATE = 'guided-work-claim-binding';
const MAX_BINDING_BYTES = 4096;
const MAX_CONFIG_BYTES = 1024 * 1024;
const reviewStatuses = ['unsupported', 'not-requested', 'pending', 'unknown', 'confirmed'];
const exactId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,159}$/.test(value) && !value.includes('://');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');

/** Follow the active framework checkout, even when a host was launched from another worktree. */
function guidedRoot(cwd) {
    try {
        const active = fs.realpathSync.native(path.resolve(cwd));
        if (!fs.statSync(active).isDirectory()) return null;
        const { rootDir, source } = resolveProjectRoot({ cwd: active, env: {} });
        return source === 'cwd-ancestor' ? rootDir : null;
    } catch {
        return null;
    }
}

/** Team config only. A personal config-location override must not opt a project in. */
function guidedProfile(root) {
    try {
        const configPath = resolveProjectConfigPath(root);
        const config = JSON.parse(decodeConfigText(readBytes(root, relative(root, configPath), MAX_CONFIG_BYTES)));
        const policy = config?.workTracking?.guided;
        if (policy === undefined) return OFF;
        if (policy === 'off') return { ...OFF, source: 'project-config' };
        const available = require('./project-config-schema.cjs').validateConfig(config).valid;
        return { policy: ['optional', 'required'].includes(policy) ? policy : 'invalid', available, source: 'project-config' };
    } catch (error) {
        return error.code === 'ENOENT' ? OFF : { policy: 'invalid', available: false, source: 'project-config' };
    }
}

function guidedNotice(profile) {
    if (profile.policy === 'off' || profile.policy === 'invalid') return '';
    const policy =
        profile.policy === 'required'
            ? 'Pause governed edits if the claim is unavailable.'
            : 'With an unavailable claim, authorized local work can stay pending or untracked.';
    if (!profile.available) return `${MARKER}\nGuided work claim: the project profile cannot be validated. ${policy} Read-only work can proceed.`;
    return `${MARKER}\nGuided work claim: before starting delivery or when the objective or exact task changes, read \`.claude/skills/task-track/references/guided-claim.md\`. Continue an exact matching task without re-claiming. Skip read-only and scratch-only work. ${policy} This notice grants no write authority.`;
}

/** A bounded local candidate, never authority. Keep opaque IDs and factual statuses only. */
function validBinding(binding) {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return false;
    const allowed = ['provider', 'project', 'actor', 'item', 'operation', 'claimStatus', 'reviewStatus', 'review'];
    if (Object.keys(binding).some(key => !allowed.includes(key))) return false;
    if (!['provider', 'project', 'actor', 'operation'].every(key => exactId(binding[key]))) return false;
    if (binding.claimStatus === 'claimed') {
        if (!exactId(binding.item) || !reviewStatuses.includes(binding.reviewStatus)) return false;
    } else if (binding.claimStatus !== 'unknown' || (binding.item !== undefined && !exactId(binding.item)) || binding.reviewStatus !== 'not-requested') {
        return false;
    }
    return binding.reviewStatus === 'confirmed' ? exactId(binding.review) : binding.review === undefined;
}

function bindingLocation(root, sessionId) {
    const ledger = require('./convention-ledger.cjs');
    const store = resolveSessionStoreRoot(root);
    const session = hash(sessionId);
    const directory = ledger.sessionDir(store, session);
    const workspace = hash(root);
    return { ledger, store, session, directory, workspace, file: relative(root, path.join(directory, `_${STATE}.json`)) };
}

function readBinding(root, location) {
    let bytes;
    try {
        bytes = readBytes(root, location.file, MAX_BINDING_BYTES);
    } catch (error) {
        if (error.code === 'ENOENT') return { revision: null, binding: null };
        throw error;
    }
    const record = JSON.parse(bytes.toString('utf8'));
    if (record?.workspace !== location.workspace || !validBinding(record.binding)) throw new Error('Unusable guided claim binding');
    return { revision: hash(bytes), binding: record.binding };
}

/** Context is also usable without hooks or a session id. Only the explicit remember action writes local state. */
function claimContext(root, sessionId) {
    const profile = guidedProfile(root);
    const empty = { revision: null, binding: null };
    if (!profile.available || profile.policy === 'off' || !sessionId) return { ...profile, ...empty, memory: 'unavailable' };
    try {
        return { ...profile, ...readBinding(root, bindingLocation(root, sessionId)), memory: 'available' };
    } catch {
        return { ...profile, ...empty, memory: 'unavailable' };
    }
}

function rememberClaim(root, sessionId, request) {
    const profile = guidedProfile(root);
    if (!profile.available || profile.policy === 'off' || !sessionId) return { status: 'unavailable' };
    if (!validBinding(request?.binding) || (request.revision !== null && !/^[\da-f]{64}$/.test(request.revision))) return { status: 'invalid' };
    const location = bindingLocation(root, sessionId);
    const { ledger, store, session, directory, workspace } = location;
    const lock = ledger.lockFile(store, session, ledger.MAIN_SCOPE, GROUP);
    ensureDirectory(root, relative(root, path.dirname(lock)));
    scopedPath(root, relative(root, path.join(directory, '_owner.json')));
    scopedPath(root, relative(root, lock));
    // This lock protects only a disposable local candidate. Reuse the ledger's
    // stale-lock recovery so a terminated helper cannot strand the session.
    const token = ledger.acquireLock(lock);
    if (!token) return { status: 'conflict' };
    try {
        if (readBinding(root, location).revision !== request.revision) return { status: 'conflict' };
        const saved = ledger.writeSessionState(store, session, STATE, { workspace, binding: request.binding });
        return { status: saved ? 'remembered' : 'unavailable' };
    } finally {
        ledger.releaseLock(lock, token);
    }
}

module.exports = { GROUP, MARKER, guidedRoot, guidedProfile, guidedNotice, claimContext, rememberClaim };
