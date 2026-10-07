'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Protective budgets, not measured capacity. Oversize input must be disclosed. There is no budget on the total bytes a
// project's records and linked evidence add up to: a project is read whole, however large its specs and sources are.
const LIMITS = Object.freeze({ records: 2000, recordBytes: 2 * 1024 * 1024,
    membershipEdges: 20000, queue: 64, receipts: 128, lockWaitMs: 3000, lockPollMs: 100, readRetries: 1, processTimeoutMs: 10000 });
const KINDS = Object.freeze(['idea', 'pbi', 'story', 'task', 'epic', 'vision']);
const GROUP_ROLES = Object.freeze(['area', 'capability', 'initiative']);
const DEFAULT_GROUP_LABELS = Object.freeze({ area: 'Area', capability: 'Feature', initiative: 'Initiative' });
const FOLDERS = Object.freeze({ idea: 'ideas', pbi: 'pbis', story: 'pbis/stories', task: 'tasks', epic: 'epics', vision: 'visions' });
const CUSTOM_MEMBER_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
// An author address is a bounded local identifier, not mailbox verification.
const EMAIL_ID = /^[\x21-\x3f\x41-\x7e]+@[\x21-\x3f\x41-\x7e]+$/;
const isEmailId = value => typeof value === 'string' && value.length <= 254 && EMAIL_ID.test(value);
const MEMBER_ID = Object.freeze({ test: value => typeof value === 'string' && (CUSTOM_MEMBER_ID.test(value) || isEmailId(value)) });
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const TASK_TRACKING_SCHEMA = {
    type: 'object', required: false, describe: 'Optional local work tracking policy; absence leaves automation off.',
    properties: {
        schemaVersion: { type: 'number', required: true, describe: 'Tracking configuration version; supported value is 1.' },
        mode: { type: 'string', required: false, describe: 'Automatic upkeep: off, observe, or linked. Default off.' },
        healthOwnerId: { type: 'string', required: false, describe: 'Exact existing item owning explicit project health attestations; never inferred from delivery.' },
        groupLabels: { type: 'object', required: false, describe: 'Optional inert group vocabulary; omitted labels use defaults.', properties:
            Object.fromEntries(GROUP_ROLES.map(role => [role, { type: 'string', required: false, describe: 'Nonblank display text, at most 160 characters, without control characters.' }])) },
        profile: { type: 'object', required: false, describe: 'One canonical record authority; default portable Markdown.', properties: {
            kind: { type: 'string', required: true, describe: 'portable-markdown or native.' },
            version: { type: 'number', required: true, describe: 'Positive capability contract version; portable supports 1.' },
            registration: { type: 'string', required: false, describe: 'Native trusted registration identity; never an executable path.' },
            sources: { type: 'array', required: false, describe: 'Explicit native source inventory; no permission or executable authority.' }
        } },
        members: { type: 'arrayOf', required: false, describe: 'Stable team identities; no account or permission grants.', itemSchema: {
            id: { type: 'string', required: true, describe: 'Stable identity retained across display-name changes.' },
            displayName: { type: 'string', required: true, describe: 'Human-readable member name.' },
            active: { type: 'boolean', required: true, describe: 'Inactive members retain attribution but cannot receive new assignments.' },
            aliases: { type: 'array', required: false, describe: 'Unambiguous previous names or alternative identifiers.' }
        } },
        report: { type: 'object', required: false, describe: 'Disposable report policy, independent of automatic work upkeep.', properties: {
            enabled: { type: 'boolean', required: false, describe: 'Allow explicit report generation; default true.' },
            autoRefresh: { type: 'boolean', required: false, describe: 'Refresh an already initialized report after successful supported saves; default true.' }
        } }
    }
};

function exactKeys(value, keys, label, errors) {
    if (!object(value)) { errors.push(`${label}: expected an object`); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) errors.push(`${label}.${key}: unknown field`);
    return true;
}

function relativePath(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 1024
        && !/[\u0000-\u001f]/.test(value) && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value)
        && !value.replace(/\\/g, '/').split('/').some(part => part === '..' || part === '.' || part === '')
        && !value.includes(':');
}

function validateTaskTracking(config, errors = []) {
    const value = config?.taskTracking;
    if (value === undefined) return errors;
    if (!exactKeys(value, ['schemaVersion', 'mode', 'healthOwnerId', 'groupLabels', 'profile', 'members', 'report'], 'taskTracking', errors)) return errors;
    if (value.schemaVersion !== 1) errors.push('taskTracking.schemaVersion: supported version is 1');
    if (value.mode !== undefined && !['off', 'observe', 'linked'].includes(value.mode)) errors.push('taskTracking.mode: expected off, observe, or linked');
    if (value.healthOwnerId !== undefined && (typeof value.healthOwnerId !== 'string' || !ITEM_ID.test(value.healthOwnerId))) errors.push('taskTracking.healthOwnerId: expected exact item identity');
    if (value.groupLabels !== undefined && exactKeys(value.groupLabels, GROUP_ROLES, 'taskTracking.groupLabels', errors)) {
        for (const role of GROUP_ROLES) if (Object.hasOwn(value.groupLabels, role)) {
            const label = value.groupLabels[role];
            if (typeof label !== 'string' || !label.trim() || label.length > 160 || /[\u0000-\u001f\u007f-\u009f]/.test(label))
                errors.push(`taskTracking.groupLabels.${role}: group label invalid`);
        }
    }
    if (value.profile !== undefined && exactKeys(value.profile, ['kind', 'version', 'registration', 'sources'], 'taskTracking.profile', errors)) {
        const p = value.profile;
        if (!['portable-markdown', 'native'].includes(p.kind) || !Number.isSafeInteger(p.version) || p.version < 1
            || (p.kind === 'portable-markdown' && p.version !== 1)) errors.push('taskTracking.profile: unsupported kind/version');
        if (p.kind === 'native' && (typeof p.registration !== 'string' || !CUSTOM_MEMBER_ID.test(p.registration))) errors.push('taskTracking.profile.registration: native identity required');
        if (p.kind === 'portable-markdown' && (p.registration !== undefined || p.sources !== undefined)) errors.push('taskTracking.profile: native fields do not belong to portable records');
        if (p.sources !== undefined && (!Array.isArray(p.sources) || p.sources.length > LIMITS.records || p.sources.some(v => !relativePath(v)))) errors.push('taskTracking.profile.sources: expected bounded project-relative paths');
    }
    const identities = new Map();
    if (value.members !== undefined) {
        if (!Array.isArray(value.members) || value.members.length > LIMITS.records) errors.push('taskTracking.members: expected bounded member list');
        else for (const m of value.members) {
            if (!exactKeys(m, ['id', 'displayName', 'active', 'aliases'], 'taskTracking.members[]', errors)) continue;
            if (typeof m.id !== 'string' || !MEMBER_ID.test(m.id) || typeof m.displayName !== 'string' || !m.displayName.trim()
                || m.displayName.length > 160 || typeof m.active !== 'boolean') errors.push('taskTracking.members[]: invalid identity, name, or availability');
            if (m.aliases !== undefined && (!Array.isArray(m.aliases) || m.aliases.length > 32 || m.aliases.some(a => typeof a !== 'string' || !a.trim()
                || (a.length > 160 && !isEmailId(a))))) errors.push('taskTracking.members[].aliases: invalid aliases');
            for (const identity of [m.id, m.displayName, ...(Array.isArray(m.aliases) ? m.aliases : [])]) {
                if (typeof identity !== 'string') continue;
                const key = identity.trim().toLocaleLowerCase('en-US');
                if (identities.has(key) && identities.get(key) !== m) errors.push('taskTracking.members: ambiguous member identity or alias');
                identities.set(key, m);
            }
        }
    }
    if (value.report !== undefined && exactKeys(value.report, ['enabled', 'autoRefresh'], 'taskTracking.report', errors)) {
        for (const key of ['enabled', 'autoRefresh']) if (value.report[key] !== undefined && typeof value.report[key] !== 'boolean') errors.push(`taskTracking.report.${key}: expected boolean`);
    }
    return errors;
}

// Resolve from the selected snapshot config, never from a local convenience field.
function groupLabels(config) {
    return Object.fromEntries(GROUP_ROLES.map(role => [role, config?.taskTracking?.groupLabels?.[role]?.trim() ?? DEFAULT_GROUP_LABELS[role]]));
}

function trackingContext(rootDir) {
    const root = fs.realpathSync(rootDir);
    const { readProjectConfigAt, getDocsRoot } = require('./project-config-loader.cjs');
    const loaded = readProjectConfigAt(root);
    if (loaded.state === 'invalid') throw Object.assign(new Error('Project configuration is invalid'), { code: 'INVALID_CONFIG', details: loaded.errors });
    const errors = validateTaskTracking(loaded.config);
    if (errors.length) throw Object.assign(new Error('Tracking configuration is invalid'), { code: 'INVALID_CONFIG', details: errors });
    const declared = loaded.config.taskTracking || {};
    return { root, config: loaded.config, configPath: loaded.filePath, enrolled: loaded.config.taskTracking !== undefined,
        mode: declared.mode || 'off', profile: declared.profile || { kind: 'portable-markdown', version: 1 },
        members: declared.members || [], report: { enabled: true, autoRefresh: true, ...declared.report },
        artifactsRoot: getDocsRoot('teamArtifacts', loaded.config), limits: LIMITS };
}

module.exports = { LIMITS, KINDS, GROUP_ROLES, DEFAULT_GROUP_LABELS, groupLabels, FOLDERS, MEMBER_ID, CUSTOM_MEMBER_ID, isEmailId, ITEM_ID, TASK_TRACKING_SCHEMA, validateTaskTracking, trackingContext, relativePath };
