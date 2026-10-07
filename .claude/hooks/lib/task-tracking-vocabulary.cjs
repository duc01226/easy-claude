'use strict';

/**
 * The one owner of the tracker's words: kinds, record locations, lifecycle states, group purposes and link relations,
 * in the current vocabulary and in the earlier one, with the map between them. Nothing else in the tracker spells an
 * earlier word. A project stores exactly one vocabulary; a project in the earlier one is read in the current words and
 * is read-only until its explicit migration.
 *
 * Removing earlier-vocabulary support later means removing RENAMED, EARLIER and the non-current branches of
 * resolveVocabulary; version 1 then fails like any unsupported version.
 */

const CURRENT_VERSION = 2;
const EARLIER_VERSION = 1;
/** Durable migration progress record, kept in the record root so it travels with the project. */
const JOURNAL_NAME = '.vocabulary-migration.json';

const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
};

const CURRENT = freeze({
    version: CURRENT_VERSION,
    kinds: ['initiative', 'task', 'story', 'subtask', 'project', 'vision'],
    folders: { initiative: 'initiatives', task: 'tasks', story: 'tasks/stories', subtask: 'subtasks', project: 'projects', vision: 'visions' },
    states: ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'],
    groupRoles: ['area', 'capability', 'program'],
    linkRoles: ['dependency', 'parent', 'initiative', 'spec', 'plan', 'source']
});

/** Earlier word -> current word, per dimension. A word that is not listed is the same in both vocabularies. */
const RENAMED = freeze({
    kinds: { pbi: 'task', task: 'subtask', idea: 'initiative', epic: 'project' },
    states: { backlog: 'planned' },
    groupRoles: { initiative: 'program' },
    linkRoles: { idea: 'initiative' }
});
const DIMENSIONS = Object.freeze(Object.keys(RENAMED));
const INVERSE = freeze(Object.fromEntries(DIMENSIONS.map(dimension =>
    [dimension, Object.fromEntries(Object.entries(RENAMED[dimension]).map(([earlier, current]) => [current, earlier]))])));

const EARLIER = freeze({
    version: EARLIER_VERSION,
    ...Object.fromEntries(DIMENSIONS.map(dimension => [dimension, CURRENT[dimension].map(word => INVERSE[dimension][word] || word)])),
    folders: { idea: 'ideas', pbi: 'pbis', story: 'pbis/stories', task: 'tasks', epic: 'epics', vision: 'visions' }
});
const VOCABULARIES = Object.freeze({ [EARLIER_VERSION]: EARLIER, [CURRENT_VERSION]: CURRENT });

const KINDS = CURRENT.kinds;
const FOLDERS = CURRENT.folders;
const STATES = CURRENT.states;
const GROUP_ROLES = CURRENT.groupRoles;
const LINK_ROLES = CURRENT.linkRoles;
/** The one kind that earns delivery credit, and the kinds that hold members. */
const DELIVERY_KIND = 'task';
const GROUP_KINDS = Object.freeze(['project', 'vision']);
/** The state a draft enters when it is planned. */
const PLANNED_STATE = 'planned';
/** Item-to-item relations whose chains must stay free of cycles. */
const ACYCLIC_LINK_ROLES = Object.freeze(['dependency', 'parent', 'initiative']);

const LABELS = freeze({
    kinds: { initiative: 'Initiative', task: 'Task', story: 'Story', subtask: 'Subtask', project: 'Project group', vision: 'Vision' },
    kindsPlural: { initiative: 'Initiatives', task: 'Tasks', story: 'Stories', subtask: 'Subtasks', project: 'Project groups', vision: 'Visions' },
    states: { draft: 'Draft', planned: 'Planned', ready: 'Ready', in_progress: 'In progress', blocked: 'Blocked', verifying: 'Verifying', done: 'Done', canceled: 'Canceled' },
    groupRoles: { area: 'Area', capability: 'Feature', program: 'Program' },
    linkRoles: { dependency: 'Depends on', parent: 'Parent', initiative: 'Initiative', spec: 'Spec', plan: 'Plan', source: 'Source' }
});
const DEFAULT_GROUP_LABELS = LABELS.groupRoles;

const topLevel = folders => [...new Set(Object.values(folders).map(folder => folder.split('/')[0]))];
/** Top-level record locations that exist in one vocabulary only; a location both share cannot tell them apart. */
const EARLIER_ONLY_LOCATIONS = Object.freeze(topLevel(EARLIER.folders).filter(name => !topLevel(CURRENT.folders).includes(name)));
const CURRENT_ONLY_LOCATIONS = Object.freeze(topLevel(CURRENT.folders).filter(name => !topLevel(EARLIER.folders).includes(name)));

const REFUSALS = freeze({
    MIGRATION_REQUIRED: 'Migration required: this project stores the earlier vocabulary and is read-only; preview and run the tracker migration, then retry',
    MIGRATION_IN_PROGRESS: 'Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving',
    MIXED_VOCABULARY: 'Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains',
    EARLIER_VOCABULARY_RECORD: 'Earlier-vocabulary record: not counted',
    EARLIER_VOCABULARY_REQUEST: `Request uses the earlier vocabulary (version ${EARLIER_VERSION}); update the procedure that produced it and send a version ${CURRENT_VERSION} request in the current words`
});

// A version is a number; a string that merely looks like one is not a declaration.
const supportedVersion = version => typeof version === 'number' && Object.hasOwn(VOCABULARIES, version);
const wordsFor = version => (supportedVersion(version) ? VOCABULARIES[version] : null);

/** A stored word of the given version, in the current vocabulary. Only words stored by the earlier version are mapped. */
function toCurrent(dimension, word, version) {
    return version === EARLIER_VERSION && typeof word === 'string' && Object.hasOwn(RENAMED[dimension], word) ? RENAMED[dimension][word] : word;
}

/** A current word as the given version stores it. Only the earlier version stores a different word. */
function toStored(dimension, word, version) {
    return version === EARLIER_VERSION && typeof word === 'string' && Object.hasOwn(INVERSE[dimension], word) ? INVERSE[dimension][word] : word;
}

/**
 * Decides a project's vocabulary from facts alone, so a working copy and a pinned commit share one rule.
 * `folderNames` are the record locations present directly under the record root, spelled as the tracker reads them.
 * A location is present exactly when the tracker would read it, so recognition and reading can never disagree.
 */
function resolveVocabulary({ declaredVersion, folderNames = [], journalPresent = false } = {}) {
    const names = new Set(folderNames);
    const earlierLocations = EARLIER_ONLY_LOCATIONS.filter(name => names.has(name));
    const currentLocations = CURRENT_ONLY_LOCATIONS.filter(name => names.has(name));
    const declared = declaredVersion !== undefined;
    const found = { declared, earlierLocations, currentLocations };
    const blocked = (state, code, reason) => freeze({ state, storedVersion: null, readOnly: true, code, reason, ...found });
    if (journalPresent) return blocked('migrating', 'MIGRATION_IN_PROGRESS', REFUSALS.MIGRATION_IN_PROGRESS);
    // A declaration wins over what the locations suggest. Undeclared, an earlier-only location means earlier.
    const earlier = declared ? declaredVersion === EARLIER_VERSION : earlierLocations.length > 0;
    if (earlier && currentLocations.length) return blocked('mixed', 'MIXED_VOCABULARY',
        `${REFUSALS.MIXED_VOCABULARY} (earlier: ${earlierLocations.join(', ') || 'declared by the project'}; current: ${currentLocations.join(', ')})`);
    if (earlier) return freeze({ state: 'earlier', storedVersion: EARLIER_VERSION, readOnly: true, code: 'MIGRATION_REQUIRED', reason: REFUSALS.MIGRATION_REQUIRED, ...found });
    return freeze({ state: 'current', storedVersion: CURRENT_VERSION, readOnly: false, code: null, reason: null, ...found });
}

const journalPath = artifactsRoot => `${artifactsRoot}/${JOURNAL_NAME}`;

/**
 * Resolves a working copy. Each location is asked of the file system by the exact path the record walk reads, never
 * matched against a directory listing: on a disk that ignores letter case `Tasks` and `tasks` are one location and
 * are found as one, and on a disk that does not, a differently spelled folder is not a tracker location at all.
 */
function projectVocabulary(root, artifactsRoot, declaredVersion) {
    const fs = require('node:fs');
    const path = require('node:path');
    // Required here, not at load: the configuration owner depends on this module.
    const { relativePath } = require('./task-tracking-config.cjs');
    if (!relativePath(artifactsRoot)) return resolveVocabulary({ declaredVersion });
    const base = path.join(root, ...artifactsRoot.replace(/\\/g, '/').split('/'));
    const entry = name => { try { return fs.lstatSync(path.join(base, name)); } catch { return null; } };
    // A linked location is still a location: the record walk refuses to follow it and says so.
    const present = name => { const found = entry(name); return !!found && (found.isDirectory() || found.isSymbolicLink()); };
    return resolveVocabulary({ declaredVersion, folderNames: [...EARLIER_ONLY_LOCATIONS, ...CURRENT_ONLY_LOCATIONS].filter(present),
        journalPresent: entry(JOURNAL_NAME) !== null });
}

/** Refuses anything but a project in the current vocabulary, with the outcome the project state names. */
function requireCurrentVocabulary(vocabulary) {
    if (vocabulary?.code) throw Object.assign(new Error(vocabulary.reason), { code: vocabulary.code });
}

/**
 * One record parsed as the earlier vocabulary stored it, in the current words. Only tracker-owned vocabulary values
 * are mapped; bytes, text, content identity and location stay exactly as stored, so nothing here can be saved.
 */
function normalizeRecord(record, version) {
    if (version !== EARLIER_VERSION) return record;
    const kind = toCurrent('kinds', record.kind, version);
    const state = value => toCurrent('states', value, version);
    const stored = record.tracking;
    const tracking = stored ? { ...stored, kind,
        ...(Array.isArray(stored.history) ? { history: stored.history.map(entry => entry && typeof entry === 'object'
            ? { ...entry, beforeState: state(entry.beforeState), afterState: state(entry.afterState) } : entry) } : {}),
        ...(typeof stored.groupRole === 'string' ? { groupRole: toCurrent('groupRoles', stored.groupRole, version) } : {}),
        ...(Array.isArray(stored.links) ? { links: stored.links.map(link => link && typeof link === 'object'
            ? { ...link, relation: toCurrent('linkRoles', link.relation, version) } : link) } : {}),
        ...(Array.isArray(stored.receipts) ? { receipts: stored.receipts.map(receipt => receipt?.result && typeof receipt.result === 'object'
            ? { ...receipt, result: { ...receipt.result, kind: toCurrent('kinds', receipt.result.kind, version) } } : receipt) } : {})
    } : null;
    return { ...record, kind, tracking, data: { ...record.data, status: state(record.data.status), ...(tracking ? { tracking } : {}) }, storedVocabulary: version };
}

/** Words and display labels for every view; the same block is offered by discovery and carried by each read. */
function vocabularyBlock() {
    return { version: CURRENT_VERSION, kinds: [...KINDS], states: [...STATES], groupRoles: [...GROUP_ROLES], linkRoles: [...LINK_ROLES],
        deliveryKind: DELIVERY_KIND, groupKinds: [...GROUP_KINDS],
        labels: Object.fromEntries(Object.entries(LABELS).map(([name, labels]) => [name, { ...labels }])) };
}

/** What a read states about the selected project's stored vocabulary. */
function projectVocabularyView(vocabulary) {
    return vocabulary ? { state: vocabulary.state, storedVersion: vocabulary.storedVersion, declared: vocabulary.declared, readOnly: vocabulary.readOnly,
        code: vocabulary.code, reason: vocabulary.reason, earlierLocations: [...vocabulary.earlierLocations], currentLocations: [...vocabulary.currentLocations] } : null;
}

// How a person may name a kind in a prompt. Recognising a typed earlier word is compatibility, not vocabulary use.
const PROMPT_FORMS = Object.freeze({ story: 'stor(?:y|ies)', project: 'project groups?' });
/** Regular-expression sources for the work words of both vocabularies. */
function promptTerms() {
    const kinds = [...new Set([...CURRENT.kinds, ...EARLIER.kinds])];
    return [...kinds.map(kind => PROMPT_FORMS[kind] || `${kind}s?`), ...Object.keys(RENAMED.states), `${PLANNED_STATE} work`];
}

module.exports = { CURRENT_VERSION, EARLIER_VERSION, JOURNAL_NAME, CURRENT, EARLIER, VOCABULARIES, RENAMED,
    KINDS, FOLDERS, STATES, GROUP_ROLES, LINK_ROLES, DELIVERY_KIND, GROUP_KINDS, PLANNED_STATE, ACYCLIC_LINK_ROLES,
    LABELS, DEFAULT_GROUP_LABELS, EARLIER_ONLY_LOCATIONS, CURRENT_ONLY_LOCATIONS, REFUSALS,
    wordsFor, supportedVersion, toCurrent, toStored, resolveVocabulary, projectVocabulary, journalPath, requireCurrentVocabulary,
    normalizeRecord, vocabularyBlock, projectVocabularyView, promptTerms };
