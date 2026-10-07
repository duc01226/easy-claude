'use strict';

/**
 * The one explicit action that moves a project from the earlier vocabulary to the current one. It never runs as a side
 * effect of a read, a save or upkeep, needs no actor, and adds no history entry, revision or receipt of its own.
 *
 * Order of work, each step recorded in a progress record kept in the record root before the next one starts:
 * the record locations move in a fixed order, every record not yet stamped current has its tracker-owned vocabulary
 * values rewritten, the project declaration is changed, the result is compared with the progress captured before the
 * first change, and only then is the progress record removed. While that record exists every read and save is refused,
 * and running the migration again completes it from the recorded step. The migration is one-way: returning to the
 * earlier vocabulary means restoring the record root and the project configuration from version control or a backup.
 * An unfinished migration can be abandoned that way too, and only on an explicit abandon request: every interrupted or
 * failed result states the steps, and the abandon request removes the progress record once it finds the earlier project
 * back whole. A plain repeated run only ever completes: what a person wants cannot be read from the disk.
 *
 * What a migration cannot conserve is said, never repaired: a proof names the location and content of the record it
 * was checked against, so work linked to a moved or rewritten record stops being currently verified. The preview and
 * the result name that work. No proof is altered.
 *
 * Removing earlier-vocabulary support later removes this module, its command and its suite together.
 */

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { TextDecoder } = require('node:util');
const { trackingContext, validateTaskTracking, LIMITS, ITEM_ID } = require('./task-tracking-config.cjs');
const { fail, hash, scopedPath, readBytes, publishBytes, replaceRootFile, removeBytes } = require('./task-tracking-files.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { resolveTrackingProfile } = require('./task-tracking-profile.cjs');
const store = require('./task-artifact-store.cjs');
const vocabulary = require('./task-tracking-vocabulary.cjs');

const { CURRENT, EARLIER, CURRENT_VERSION, EARLIER_VERSION } = vocabulary;
const JOURNAL_KIND = 'vocabulary-migration';
const STEP_STATES = Object.freeze(['pending', 'started', 'done', 'skipped']);
const TAIL_STEPS = Object.freeze(['rewrite', 'config', 'verify']);
// The values a migration must leave equal. Verification currency is reported beside them, never required.
const CONSERVED = Object.freeze(['total', 'accepted', 'remaining', 'eligibleIds', 'acceptedIds', 'records', 'recordIdentity']);
// How many paths one refusal names before it says there are more.
const NAMED = 10;

const topLevel = folder => folder.split('/')[0];
// The location that holds supporting work moves first: its name is the one delivery work then moves into. A location
// nested in another (stories) travels with its parent, and a location both vocabularies share does not move.
const MOVE_ORDER = Object.freeze(['subtask', 'task', 'initiative', 'project']);
const MOVES = Object.freeze(MOVE_ORDER.map(kind => Object.freeze({
    from: topLevel(EARLIER.folders[vocabulary.toStored('kinds', kind, EARLIER_VERSION)]), to: topLevel(CURRENT.folders[kind]) })));
// Where each earlier kind is found once every location has moved.
const MOVED_FOLDERS = Object.freeze(Object.fromEntries(EARLIER.kinds.map(kind =>
    [kind, CURRENT.folders[vocabulary.toCurrent('kinds', kind, EARLIER_VERSION)]])));

const toCurrent = (dimension, word) => vocabulary.toCurrent(dimension, word, EARLIER_VERSION);
const slashed = value => value.replace(/\\/g, '/');
const named = paths => `${paths.slice(0, NAMED).join(', ')}${paths.length > NAMED ? ` and ${paths.length - NAMED} more` : ''}`;
const journalOf = context => vocabulary.journalPath(context.artifactsRoot);
// Paths are held in forward-slash form, the form stored paths are compared in.
const rootOf = context => slashed(context.artifactsRoot);
const movesFor = context => MOVES.map(move => ({ id: `move:${move.from}>${move.to}`,
    from: `${rootOf(context)}/${move.from}`, to: `${rootOf(context)}/${move.to}` }));

/** What is at a project-relative path, or null. A linked path is refused by the scoped lookup, never followed. */
function entryAt(context, relative) {
    try { return fs.lstatSync(scopedPath(context.root, relative)); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
}

const sameEntry = (a, b) => a.dev === b.dev && a.ino === b.ino && a.ino !== 0n;
const otherCase = name => (name === name.toUpperCase() ? name.toLowerCase() : name.toUpperCase());
const diskRules = new WeakMap();
/**
 * Whether the disk that holds the record root ignores letter case, asked of the disk itself and never assumed from the
 * platform: a record location that exists is looked up under another spelling and must come back as the same folder.
 * No location to ask, or no usable answer, means letter case matters: the answer that changes no stored path.
 */
function ignoresCase(context) {
    if (diskRules.has(context)) return diskRules.get(context);
    let answer = false;
    for (const relative of movesFor(context).flatMap(move => [move.from, move.to])) {
        const location = path.join(context.root, ...relative.split('/'));
        let found;
        try { found = fs.statSync(location, { bigint: true }); } catch { continue; }
        if (!found.isDirectory()) continue;
        try { answer = sameEntry(found, fs.statSync(path.join(path.dirname(location), otherCase(path.basename(location))), { bigint: true })); } catch { answer = false; }
        break;
    }
    diskRules.set(context, answer);
    return answer;
}

/** Whether a forward-slash path is a location or lies inside it; `blind` compares the location's letters without case. */
function within(original, location, blind) {
    const head = original.slice(0, location.length);
    return (head === location || (blind && head.toLowerCase() === location.toLowerCase())) && (original.length === location.length || original[location.length] === '/');
}

/**
 * A stored path into a moved location, in forward-slash form. It is mapped once from its original value: the two
 * vocabularies share a location name, so a mapped path is never mapped again. Any other path is returned as stored.
 * A path that spells the location in another letter case is the same path only on a disk that ignores case; there it is
 * mapped, and on a disk that tells the spellings apart it names another folder and is left exactly as written.
 */
function movedPath(context, value) {
    if (typeof value !== 'string') return value;
    const original = slashed(value);
    const blind = ignoresCase(context);
    const move = movesFor(context).find(candidate => within(original, candidate.from, blind));
    return move ? move.to + original.slice(move.from.length) : value;
}

/**
 * Stored link and receipt paths that match a moved location only when letter case is ignored. Where the disk ignores
 * case none remain after mapping; where it does not, they are named so a person can decide whether they were meant.
 */
function caseOnlyPaths(context, records) {
    const moves = movesFor(context);
    const found = [];
    for (const record of records) {
        const stored = [...(Array.isArray(record.tracking?.links) ? record.tracking.links.map(link => link?.path) : []),
            ...(Array.isArray(record.tracking?.receipts) ? record.tracking.receipts.map(receipt => receipt?.result?.ownerPath) : [])];
        for (const value of new Set(stored.filter(entry => typeof entry === 'string'))) {
            const original = slashed(value);
            if (moves.some(move => within(original, move.from, true)) && !moves.some(move => within(original, move.from, false))) found.push({ itemId: record.id, path: value });
        }
    }
    return found.sort((a, b) => a.itemId.localeCompare(b.itemId, 'en') || a.path.localeCompare(b.path, 'en'));
}
/** Those paths as the migration leaves them: none on a disk that ignores case, where each is mapped with its folder. */
const unmappedPaths = (context, records) => (ignoresCase(context) ? [] : caseOnlyPaths(context, records));
const linkPathsView = (context, paths) => ({ diskIgnoresCase: ignoresCase(context), leftAsWritten: paths.slice(0, NAMED), ...(paths.length ? { count: paths.length,
    note: 'These stored paths differ from a moved folder only in letter case. This disk tells such spellings apart, so they name another folder: they are left exactly as written and do not point into the moved folder. Correct each by hand if it was meant to' } : {}) });

const withMember = (value, key, change) => (value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, key)
    ? { ...value, [key]: change(value[key]) } : value);
const TRACKING_VALUES = Object.freeze(['schemaVersion', 'kind', 'history', 'groupRole', 'links', 'receipts']);

/**
 * One stored record with its tracker-owned vocabulary values in the current words: kind, recorded state, states in
 * history, group purpose, link relation, link paths and receipt kind and location, plus the current stamp. A record
 * without tracking metadata gains none; only its recorded state can change. Everything else must come back equal.
 */
function currentRecord(context, record, ownerPath = record.ownerPath) {
    const kind = toCurrent('kinds', record.kind);
    const state = value => toCurrent('states', value);
    const stored = record.tracking;
    const fields = state(record.data.status) === record.data.status ? {} : { status: state(record.data.status) };
    const tracking = stored ? { schemaVersion: CURRENT_VERSION, kind,
        ...(Array.isArray(stored.history) ? { history: stored.history.map(entry => withMember(withMember(entry, 'beforeState', state), 'afterState', state)) } : {}),
        ...(typeof stored.groupRole === 'string' ? { groupRole: toCurrent('groupRoles', stored.groupRole) } : {}),
        ...(Array.isArray(stored.links) ? { links: stored.links.map(link =>
            withMember(withMember(link, 'relation', relation => toCurrent('linkRoles', relation)), 'path', value => movedPath(context, value))) } : {}),
        ...(Array.isArray(stored.receipts) ? { receipts: stored.receipts.map(receipt => withMember(receipt, 'result', result =>
            withMember(withMember(result, 'kind', value => toCurrent('kinds', value)), 'ownerPath', value => movedPath(context, value)))) } : {})
    } : {};
    const candidate = store.patchRecord({ ...record, kind, ownerPath }, fields, tracking);
    // Checked here as well as by the record writer: a migration touches every record, so it proves its own conservation.
    const rest = (value, owned) => store.stableValue(Object.fromEntries(Object.entries(value || {}).filter(([key]) => !owned.includes(key))));
    if (candidate.id !== record.id || candidate.revision !== record.revision || candidate.body !== record.body
        || candidate.text.slice(0, candidate.start) !== record.text.slice(0, record.start) || candidate.text.slice(candidate.end) !== record.text.slice(record.end)
        || rest(candidate.data, ['status', 'tracking']) !== rest(record.data, ['status', 'tracking'])
        || rest(candidate.tracking, TRACKING_VALUES) !== rest(stored, TRACKING_VALUES)) fail('UNSUPPORTED', 'Rewrite would change authored content, identity or revision; the record is left as stored');
    return candidate;
}

/** What a preview states about one record: which owned values change, never their content. */
function recordChange(context, record, candidate) {
    const before = record.tracking;
    const after = candidate.tracking;
    const differing = (earlier, current) => (Array.isArray(earlier) ? earlier.filter((value, index) => store.stableValue(value) !== store.stableValue(current[index])).length : 0);
    return { itemId: record.id, path: record.ownerPath, movedTo: movedPath(context, record.ownerPath), tracked: !!before, kind: [record.kind, candidate.kind],
        ...(candidate.data.status !== record.data.status ? { state: [record.data.status, candidate.data.status] } : {}),
        ...(before ? { stamp: [before.schemaVersion, after.schemaVersion], historyEntries: differing(before.history, after.history),
            links: differing(before.links, after.links), receipts: differing(before.receipts, after.receipts),
            ...(before.groupRole !== after.groupRole ? { groupRole: [before.groupRole, after.groupRole] } : {}) } : {}) };
}

/**
 * Whether version control can restore what the migration is about to change: the record root, and the project
 * configuration when its declaration will be rewritten. A project outside any Git checkout is allowed and said to be
 * so; inside one, those paths must hold no uncommitted or untracked file. `clean: null` means Git could not answer,
 * with the cause. A path Git ignores is not a change, and is not protected either: it is named with a note.
 */
function versionControl(context, configPath) {
    let inside = false;
    for (let directory = context.root; ; directory = path.dirname(directory)) {
        if (fs.existsSync(path.join(directory, '.git'))) { inside = true; break; }
        if (path.dirname(directory) === directory) break;
    }
    if (!inside) return { kind: 'none', note: 'Not a Git checkout: nothing here can restore the earlier records, so keep your own backup of the record root and the project configuration before migrating' };
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    env.GIT_TERMINAL_PROMPT = '0';
    // Called through its owner so a slow, absent or overflowing Git can be stood in for where it is tested.
    const result = childProcess.spawnSync('git', ['--no-pager', '--no-optional-locks', '--literal-pathspecs', '-C', context.root, '-c', 'core.fsmonitor=false', '-c', 'core.quotePath=false',
        'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored', '--', slashed(context.artifactsRoot), ...(configPath ? [configPath] : [])],
    { env, shell: false, windowsHide: true, timeout: LIMITS.processTimeoutMs, maxBuffer: LIMITS.recordBytes, stdio: ['ignore', 'pipe', 'ignore'] });
    const unanswered = answer => (answer.error || answer.status !== 0 ? { kind: 'git', clean: null,
        cause: { ETIMEDOUT: 'timeout', ENOBUFS: 'output-limit', ENOENT: 'git-missing' }[answer.error?.code] || 'git-failed' } : null);
    if (unanswered(result)) return unanswered(result);
    const tokens = result.stdout.toString('utf8').split('\0').filter(Boolean);
    // Git names paths from the top of its checkout. A project in a sub-folder of a larger checkout is asked where it
    // sits, so every path is classified and named as the project itself names it.
    let prefix = '';
    if (tokens.length) {
        const asked = childProcess.spawnSync('git', ['--no-pager', '--no-optional-locks', '-C', context.root, 'rev-parse', '--show-prefix'],
            { env, shell: false, windowsHide: true, timeout: LIMITS.processTimeoutMs, maxBuffer: LIMITS.recordBytes, stdio: ['ignore', 'pipe', 'ignore'] });
        if (unanswered(asked)) return unanswered(asked);
        prefix = asked.stdout.toString('utf8').replace(/\r?\n$/, '');
    }
    const inProject = changed => (prefix && changed.startsWith(prefix) ? changed.slice(prefix.length) : changed);
    const paths = [];
    const ignored = [];
    // A rename or copy is followed by its earlier path as a token of its own.
    for (let index = 0; index < tokens.length; index++) {
        (tokens[index].startsWith('!!') ? ignored : paths).push(inProject(tokens[index].slice(3)));
        if (/[RC]/.test(tokens[index].slice(0, 2))) index++;
    }
    return { kind: 'git', clean: paths.length === 0, ...(paths.length ? { paths } : {}),
        ...(ignored.length ? { ignored: ignored.slice(0, NAMED), note: `Git ignores ${named(ignored)}: version control cannot restore what it does not track, so keep your own backup of it before migrating` } : {}) };
}

/** Why Git could not say whether the paths are clean, worded by its cause, with what resolves it. */
const UNANSWERED = Object.freeze({
    timeout: `Git did not answer within ${LIMITS.processTimeoutMs / 1000} seconds whether the record root is clean; nothing is wrong with the records. Retry, and if it repeats, run git status in the checkout to see what is slow`,
    'output-limit': 'Git listed more changed, untracked or ignored paths under the record root than can be inspected, so it is not known to be clean; commit them or set them aside, then retry',
    'git-missing': 'This is a Git checkout but the git command could not be started, so it is not known whether the record root is clean; make git available on the PATH, then retry',
    'git-failed': 'Git could not report whether the record root is clean; run git status in the checkout, repair what it reports, then retry'
});

/** Where the named object members sit in JSON text that has already parsed: `[start, end)` of each key and value. */
function jsonMembers(text, wanted) {
    const found = new Map();
    let at = 0;
    const space = () => { while (at < text.length && ' \t\r\n'.includes(text[at])) at++; };
    const string = () => { const start = at++; while (text[at] !== '"') at += text[at] === '\\' ? 2 : 1; return [start, ++at]; };
    const value = trail => {
        space();
        const start = at;
        if (text[at] === '{') {
            at++; space();
            while (text[at] !== '}') {
                const key = string();
                const member = [...trail, JSON.parse(text.slice(key[0], key[1]))];
                space(); at++;
                const range = value(member);
                if (wanted.has(JSON.stringify(member))) found.set(JSON.stringify(member), { key, value: range });
                space(); if (text[at] === ',') at++;
                space();
            }
            at++;
        } else if (text[at] === '[') {
            at++; space();
            for (let index = 0; text[at] !== ']'; index++) { value([...trail, index]); space(); if (text[at] === ',') at++; space(); }
            at++;
        } else if (text[at] === '"') string();
        else while (at < text.length && !' \t\r\n,]}'.includes(text[at])) at++;
        return [start, at];
    };
    value([]);
    return found;
}

/**
 * The project configuration with its declaration moved to the current vocabulary: the marker, and each group-label key
 * the vocabulary renamed. Only those characters change; the rest of a hand-formatted file stays byte for byte.
 * Returns null for a project with no tracker block: migration leaves it unconfigured, and its locations then say current.
 */
function configEdit(context) {
    if (!context.enrolled || context.config.taskTracking.schemaVersion === CURRENT_VERSION) return null;
    const relative = slashed(path.relative(context.root, context.configPath));
    const refuse = reason => fail('CONFIG_NOT_REWRITABLE', `${reason} (${relative})`);
    const before = readBytes(context.root, relative);
    let text;
    let members;
    let expected;
    const marker = JSON.stringify(['taskTracking', 'schemaVersion']);
    const labels = Object.entries(vocabulary.RENAMED.groupRoles).map(([from, to]) => ({ from, to, member: JSON.stringify(['taskTracking', 'groupLabels', from]) }));
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(before);
        expected = JSON.parse(text);
        members = jsonMembers(text, new Set([marker, ...labels.map(label => label.member)]));
    } catch { refuse('The project configuration cannot be located value by value'); }
    if (!members.has(marker)) refuse('The vocabulary declaration cannot be located');
    expected.taskTracking.schemaVersion = CURRENT_VERSION;
    const changes = [{ field: 'taskTracking.schemaVersion', from: EARLIER_VERSION, to: CURRENT_VERSION }];
    const edits = [{ range: members.get(marker).value, text: String(CURRENT_VERSION) }];
    for (const label of labels) if (members.has(label.member)) {
        const group = expected.taskTracking.groupLabels;
        expected.taskTracking.groupLabels = Object.fromEntries(Object.entries(group).map(([key, value]) => [key === label.from ? label.to : key, value]));
        changes.push({ field: 'taskTracking.groupLabels', renamedKey: [label.from, label.to] });
        edits.push({ range: members.get(label.member).key, text: JSON.stringify(label.to) });
    }
    let after = text;
    for (const edit of edits.sort((a, b) => b.range[0] - a.range[0])) after = after.slice(0, edit.range[0]) + edit.text + after.slice(edit.range[1]);
    let reread;
    try { reread = JSON.parse(after); } catch { refuse('The changed project configuration would not parse'); }
    if (store.stableValue(reread) !== store.stableValue(expected) || validateTaskTracking(reread).length) refuse('The changed project configuration would not declare exactly the current vocabulary');
    return { relative, before, after: Buffer.from(after, 'utf8'), changes };
}

/** Replaces the declaration atomically against the bytes it was computed from, wherever in the project the file sits. */
function writeConfig(context, edit) {
    const write = edit.relative.includes('/') ? publishBytes : replaceRootFile;
    write(context.root, edit.relative, edit.after, hash(edit.before));
}

/** The project's vocabulary as its locations and declaration state it, leaving the migration's own progress record aside. */
function settledVocabulary(context) {
    const found = context.vocabulary;
    return vocabulary.resolveVocabulary({ declaredVersion: context.config.taskTracking?.schemaVersion,
        folderNames: [...found.earlierLocations, ...found.currentLocations], journalPresent: false });
}

const reasonMark = reason => hash(reason).slice(0, 16);
/**
 * Progress through the ordinary reader, so the comparison uses the same arithmetic every view uses. `scan` stands in
 * for the stored records when a result is rehearsed. `standing` is who is currently verified, who is ready to start and
 * a mark per unresolved-prerequisite reason, as identities only; `reasons` are those reasons as read, never kept.
 */
function progressOf(context, scan) {
    const { inspectSnapshot, scopeProjection, readyIds } = require('./task-progress-reader.cjs');
    const snapshot = inspectSnapshot(context.root, { context, ...(scan ? { scan } : {}) });
    if (!snapshot.profile.available || snapshot.unreadable) fail('INCOMPLETE_SCOPE', 'Progress cannot be read from this project');
    const { metrics } = scopeProjection(snapshot);
    const eligible = new Set(metrics.eligibleIds);
    return { total: metrics.total, accepted: metrics.accepted, remaining: metrics.remaining, eligibleIds: [...metrics.eligibleIds],
        acceptedIds: [...new Set(snapshot.items.filter(item => eligible.has(item.id) && item.acceptance.accepted).map(item => item.id))].sort(),
        records: snapshot.records.length, recordIdentity: hash(JSON.stringify(snapshot.records.map(record => record.id).sort())),
        currentlyVerified: metrics.currentlyVerified,
        standing: { verified: snapshot.items.filter(item => item.verification.status === 'current').map(item => item.id).sort(), ready: readyIds(snapshot.items).sort(),
            unresolved: Object.fromEntries(snapshot.items.filter(item => item.prerequisiteReasons.length).map(item => [item.id, item.prerequisiteReasons.map(reasonMark)])) },
        reasons: Object.fromEntries(snapshot.items.map(item => [item.id, item.prerequisiteReasons])) };
}
/** The part of a progress reading that is kept in the progress record. */
const captured = ({ reasons, ...kept }) => kept;

const STANDING_NOTE = Object.freeze({
    preview: 'These items need verifying again after migration: a proof names the location and content of the record it was checked against, and that record moves or is rewritten. Migration alters no proof; record a new observation for each named item afterwards',
    result: 'These items need verifying again: a proof names the location and content of the record it was checked against, and that record moved or was rewritten. No proof was altered; record a new observation for each named item'
});
/**
 * The work whose standing differs between two readings: no longer currently verified, no longer ready to start, and
 * newly held by a prerequisite that is no longer currently verified. Null when the earlier reading kept no standing.
 */
function standingChange(before, after, tense) {
    if (!before || !Array.isArray(before.verified) || !Array.isArray(before.ready)) return null;
    const lost = (earlier, current) => earlier.filter(id => !current.includes(id));
    const verificationStale = lost(before.verified, after.standing.verified);
    const newlyBlocked = [];
    for (const [itemId, reasons] of Object.entries(after.reasons)) {
        // A valid ID such as constructor is data, never an inherited Object property.
        const known = Object.hasOwn(before.unresolved || {}, itemId) ? before.unresolved[itemId] : [];
        const gained = reasons.filter(reason => !known.includes(reasonMark(reason)));
        const prerequisiteIds = verificationStale.filter(id => gained.some(reason => reason.split(/\s+/).includes(id)));
        if (prerequisiteIds.length) newlyBlocked.push({ itemId, prerequisiteIds });
    }
    newlyBlocked.sort((a, b) => a.itemId.localeCompare(b.itemId, 'en'));
    const leavingReady = lost(before.ready, after.standing.ready);
    return { verificationStale, leavingReady, newlyBlocked, ...(verificationStale.length || leavingReady.length || newlyBlocked.length ? { note: STANDING_NOTE[tense] } : {}) };
}

/**
 * What the reader would report once the planned rewrite was stored, without storing anything: every record as it would
 * be rewritten, under its moved location, with the declaration as it would be changed. A linked file that is not a
 * record is read from where it is now.
 */
function rehearse(context, planned) {
    const moves = movesFor(context);
    const rewritten = new Map(planned.candidates.map(candidate => [slashed(candidate.ownerPath), candidate.bytes]));
    const readSource = relative => {
        const asked = slashed(relative);
        if (rewritten.has(asked)) return rewritten.get(asked);
        const move = moves.find(candidate => within(asked, candidate.to, false));
        return readBytes(context.root, move ? move.from + asked.slice(move.to.length) : relative);
    };
    const config = planned.config ? JSON.parse(planned.config.after.toString('utf8')) : context.config;
    return progressOf({ ...context, config, readSource, vocabulary: vocabulary.resolveVocabulary({ declaredVersion: config.taskTracking?.schemaVersion }) },
        { records: planned.candidates, diagnostics: [], coverage: 'complete' });
}

/**
 * Everything a migration needs to know before it may start, gathered without changing anything. Every unmet
 * precondition is named, not only the first. The rewrite of every record and of the declaration is computed here,
 * so a record or configuration that cannot be rewritten refuses the migration before a location moves.
 */
function plan(context) {
    const refusals = [];
    const refuse = (code, reason, extra = {}) => refusals.push({ code, reason, ...extra });
    const profile = resolveTrackingProfile(context);
    if (!profile.available) return { refusals: [{ code: profile.code, reason: `Migration supports the portable record profile only: ${profile.reason}` }] };
    const moves = movesFor(context);
    const linked = [...new Set([context.artifactsRoot, journalOf(context), ...moves.flatMap(move => [move.from, move.to])].filter(relative => {
        try { scopedPath(context.root, relative); return false; } catch (error) { if (error.code !== 'UNSAFE_PATH') throw error; return true; }
    }))];
    if (linked.length) return { refusals: [{ code: 'UNSAFE_PATH', reason: `Linked or escaping record locations are unsupported: ${named(linked)}`, paths: linked }] };
    for (const move of moves) move.present = !!entryAt(context, move.from)?.isDirectory();

    const scan = store.inspectStoredRecords(context, { version: EARLIER_VERSION });
    if (scan.coverage !== 'complete') refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(scan.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record; repair or remove it, then retry`,
        { diagnostics: scan.diagnostics.slice(0, NAMED).map(finding => ({ ...(finding.path ? { path: finding.path } : {}), ...(finding.itemId ? { itemId: finding.itemId } : {}), code: finding.code })) });
    const stamped = scan.records.filter(record => record.storedVersion === CURRENT_VERSION).map(record => record.ownerPath);
    if (stamped.length) refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(stamped)} is already stamped current inside an earlier-vocabulary project; settle it by hand, then retry`, { paths: stamped });

    const recoveries = require('./task-tracking-deletion.cjs').unfinishedRecoveries(context).map(recovery => recovery.path);
    if (recoveries.length) refuse('DELETION_RECOVERY_UNFINISHED', `Deletion recovery unfinished: ${named(recoveries)}; finish that deletion with the tracker version that started it, or remove the recovery file once the record's fate is confirmed, then retry`, { paths: recoveries });

    // Names are compared without regard to letter case: a differently spelled folder is the same folder on many disks.
    let names = [];
    try { names = fs.readdirSync(scopedPath(context.root, context.artifactsRoot)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const same = (name, wanted) => name.toLowerCase() === wanted.toLowerCase();
    const freed = new Set();
    const taken = [];
    for (const move of moves) {
        const [source, destination] = [move.from, move.to].map(relative => relative.slice(rootOf(context).length + 1));
        taken.push(...names.filter(name => same(name, destination) && !freed.has(name)).map(name => `${rootOf(context)}/${name}`));
        // The source is the folder the disk answers to under the expected name; an exact name wins where case matters.
        if (move.present) for (const name of names.includes(source) ? [source] : names.filter(candidate => same(candidate, source))) freed.add(name);
    }
    if (taken.length) refuse('DESTINATION_PRESENT', `Destination already present: ${named(taken)}; move or remove it, then retry`, { paths: taken });

    let config = null;
    let unwritable = null;
    try { config = configEdit(context); }
    catch (error) { if (error.code !== 'CONFIG_NOT_REWRITABLE') throw error; unwritable = error; }

    // The declaration is restored from version control too, so an uncommitted edit to it would be lost with the records.
    const control = versionControl(context, config?.relative);
    if (control.kind === 'git' && control.clean === null) refuse('VERSION_CONTROL_UNAVAILABLE', UNANSWERED[control.cause], { cause: control.cause });
    if (control.kind === 'git' && control.clean === false) {
        const declaration = control.paths.filter(changed => changed === config?.relative);
        const inRoot = control.paths.filter(changed => changed !== config?.relative);
        refuse('RECORD_ROOT_NOT_CLEAN', `${[...(inRoot.length ? [`Record root has uncommitted changes: ${named(inRoot)}`] : []),
            ...(declaration.length ? [`Project configuration has uncommitted changes: ${named(declaration)}`] : [])].join('; ')}; commit or set them aside so version control can restore the earlier records${declaration.length ? ' and configuration' : ''}, then retry`,
        { paths: control.paths.slice(0, NAMED) });
    }

    const changes = [];
    const candidates = [];
    const blocked = [];
    const records = [...scan.records].sort((a, b) => a.ownerPath.localeCompare(b.ownerPath, 'en'));
    for (const record of records) if (record.storedVersion !== CURRENT_VERSION) {
        try { const candidate = currentRecord(context, record, movedPath(context, record.ownerPath)); candidates.push(candidate); changes.push(recordChange(context, record, candidate)); }
        catch (error) { if (!error.code || error.syscall) throw error; blocked.push({ path: record.ownerPath, itemId: record.id, code: error.code, reason: error.message }); }
    }
    if (blocked.length) refuse('RECORD_NOT_REWRITABLE', `Record cannot be rewritten safely: ${named(blocked.map(finding => finding.path))}; nothing was changed`, { records: blocked.slice(0, NAMED) });
    if (unwritable) refuse(unwritable.code, unwritable.message);
    for (const move of moves) move.records = records.filter(record => slashed(record.ownerPath).startsWith(`${move.from}/`)).length;
    return { refusals, moves, changes, candidates, config, control, records: records.length, linkPaths: unmappedPaths(context, records), reading: refusals.length ? null : progressOf(context) };
}

const envelope = context => ({ schemaVersion: 1, kind: 'migration', from: EARLIER_VERSION, to: CURRENT_VERSION, recordRoot: context?.artifactsRoot ?? null });
const refused = (context, refusals) => ({ ...envelope(context), status: 'refused', code: refusals[0].code, reason: refusals[0].reason, refusals });
const progressView = capture => ({ total: capture.total, accepted: capture.accepted, remaining: capture.remaining, eligibleIds: [...capture.eligibleIds] });
const configView = (context, config) => (config ? { path: config.relative, changes: config.changes }
    : { path: slashed(path.relative(context.root, context.configPath)), changes: [], note: 'No tracker block is declared: the project stays unconfigured and is recognised as current by its record locations' });

function preview(context, planned) {
    const byKind = {};
    for (const change of planned.changes) byKind[change.kind[1]] = (byKind[change.kind[1]] || 0) + 1;
    const after = rehearse(context, planned);
    return { ...envelope(context), status: 'preview', dryRun: true, versionControl: planned.control,
        moves: planned.moves.map(move => ({ from: move.from, to: move.to, present: move.present, records: move.records })),
        records: { total: planned.records, byKind, changes: planned.changes }, config: configView(context, planned.config),
        progress: progressView(planned.reading), currentlyVerified: { before: planned.reading.currentlyVerified, after: after.currentlyVerified },
        standing: standingChange(planned.reading.standing, after, 'preview'), linkPaths: linkPathsView(context, planned.linkPaths),
        preserved: 'Authored bodies, titles, intents, reasons, identities, file names, members, actors, times and revisions stay exactly as stored; no history entry, revision or receipt is added',
        oneWay: 'There is no reverse action: returning to the earlier vocabulary means restoring the record root and the project configuration from version control or your backup',
        next: 'Run the same command without --dry-run to migrate' };
}

function loadJournal(context) {
    const invalid = () => fail('INVALID_MIGRATION_RECORD', `Migration progress record ${journalOf(context)} is unreadable or was not written by this migration, so the tracker will not act on it: it neither completes nor abandons a migration from that file, and asking again gives this same answer`);
    const bytes = readBytes(context.root, journalOf(context));
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { invalid(); }
    const moves = movesFor(context);
    const capture = value?.capture;
    const validIds = ids => Array.isArray(ids) && ids.every((id, index) => typeof id === 'string' && ITEM_ID.test(id)
        && (index === 0 || ids[index - 1] < id));
    const mapping = item => item !== null && typeof item === 'object' && !Array.isArray(item);
    const standing = capture?.standing;
    // The steps are this migration's own, in its own order: a record naming other paths is never acted on.
    // Captured IDs must match the writer's valid, sorted form: conservation compares their order,
    // so accepting an impossible capture could change files before resume or abandon can reject it.
    if (value?.schemaVersion !== 1 || value.kind !== JOURNAL_KIND || value.from !== EARLIER_VERSION || value.to !== CURRENT_VERSION
        || !Array.isArray(value.steps) || value.steps.length !== moves.length + TAIL_STEPS.length
        || value.steps.some((step, index) => !step || !STEP_STATES.includes(step.status) || (index < moves.length
            ? step.id !== moves[index].id || step.from !== moves[index].from || step.to !== moves[index].to || typeof step.present !== 'boolean'
                || (step.records !== undefined && !(Number.isSafeInteger(step.records) && step.records >= 0))
            : step.id !== TAIL_STEPS[index - moves.length]))
        || !capture || !['total', 'accepted', 'remaining', 'records'].every(key => Number.isSafeInteger(capture[key]) && capture[key] >= 0)
        || capture.accepted > capture.total || capture.remaining !== capture.total - capture.accepted || capture.records < capture.total
        || ![capture.eligibleIds, capture.acceptedIds].every(validIds)
        || capture.eligibleIds.length !== capture.total || capture.acceptedIds.length !== capture.accepted
        || capture.acceptedIds.some(id => !capture.eligibleIds.includes(id))
        || typeof capture.recordIdentity !== 'string' || !/^[a-f0-9]{64}$/.test(capture.recordIdentity)
        || (capture.currentlyVerified !== undefined && (!Number.isSafeInteger(capture.currentlyVerified)
            || capture.currentlyVerified < 0 || capture.currentlyVerified > capture.accepted))
        || (standing !== undefined && (!mapping(standing) || ![standing.verified, standing.ready].every(validIds)
            || (standing.unresolved !== undefined && (!mapping(standing.unresolved)
                || Object.entries(standing.unresolved).some(([id, reasons]) => !ITEM_ID.test(id) || !Array.isArray(reasons)
                    || reasons.some(reason => typeof reason !== 'string' || !/^[a-f0-9]{16}$/.test(reason)))))))) invalid();
    // Validate the captured baseline before resume OR abandon can write: rebuilding it from
    // today's files would bless corrupt recovery state and destroy the conservation check.
    // Optional standing/count fields may be absent in older captures. When present, validate
    // their writer shape now: the success projection consumes them after the journal is removed.
    return { value, bytes };
}

/** One atomic replacement per recorded fact; the previous bytes are the expected content, so a foreign change is a conflict. */
function writeJournal(context, value, previous) {
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    publishBytes(context.root, journalOf(context), bytes, previous ? hash(previous.bytes) : null);
    return { value, bytes };
}

const stepOf = (journal, id) => journal.value.steps.find(step => step.id === id);
const settled = step => step.status === 'done' || step.status === 'skipped';
const mark = (context, journal, id, status) => writeJournal(context,
    { ...journal.value, steps: journal.value.steps.map(step => (step.id === id ? { ...step, status } : step)) }, journal);

// The two requests a person can make of an unfinished migration, as they are typed. The checkout is theirs to name.
const COMPLETE_COMMAND = 'migrate --root <checkout>';
const ABANDON_COMMAND = `${COMPLETE_COMMAND} --abandon`;
const numbered = steps => steps.map((step, index) => `(${index + 1}) ${step}`).join('; ');
const configOf = context => slashed(path.relative(context.root, context.configPath));

/**
 * The way out of a migration that will not be completed, in the order it must be done. It names only what this
 * migration made: the folders it created, read from the progress record and still on disk. A destination that is also
 * an earlier record location holds the restored earlier records after a restore, so it is never named for removal.
 * The last step is the explicit abandon request; a plain repeated run is never offered as a way to abandon.
 */
function abandonment(context, journal) {
    const sources = new Set(movesFor(context).map(move => move.from));
    const at = relative => { try { return !!entryAt(context, relative); } catch { return true; } };
    // A step recorded as begun whose source and destination both exist moved nothing: that destination is someone else's.
    const made = journal.value.steps.slice(0, MOVES.length).filter(step => step.present && (step.status === 'done' || (step.status === 'started' && !at(step.from))))
        .filter(step => at(step.to));
    const created = made.filter(step => !sources.has(step.to)).map(step => step.to);
    const steps = [`restore ${rootOf(context)} and ${configOf(context)} from version control or your backup`,
        ...(created.length ? [`remove the ${created.length === 1 ? 'folder' : 'folders'} this migration created: ${created.join(', ')}`] : []),
        ...made.filter(step => sources.has(step.to)).map(step => `in ${step.to}, which is also an earlier record location, keep the restored earlier records and remove only what this migration moved in from ${step.from}: whatever your version control or backup does not hold there`),
        `run ${ABANDON_COMMAND}: it checks that the project is back whole and removes the progress record ${journalOf(context)} itself, and it never removes or moves a folder. Do not remove that file by hand`];
    return { steps, text: `To abandon this migration instead of completing it: ${numbered(steps)}` };
}

/**
 * The way out when the progress record cannot be read or was not written by this migration. Its contents are never
 * trusted, so nothing is named from it and no request is promised to work: the person restores the project and sets
 * the file aside themselves.
 */
function byHand(context) {
    const steps = [`if a migration was under way here, restore ${rootOf(context)} and ${configOf(context)} from version control or your backup, so that the project is whole in one vocabulary`,
        `then set ${journalOf(context)} aside by hand: move it out of ${rootOf(context)} and keep it for inspection. The tracker does not check that restore and does not remove that file`];
    return { steps, text: `The project stays unavailable while that file is in ${rootOf(context)}. The way out is by hand: ${numbered(steps)}` };
}

/**
 * Whether the disk contradicts the progress record: a change the record says was finished and the disk no longer
 * shows, which is a moved location that is back or a declaration that reads earlier again. An interruption alone never
 * looks like this, because the migration puts nothing back. Null when nothing contradicts, and the migration resumes.
 */
function restoredOutside(context, journal) {
    const moves = journal.value.steps.slice(0, MOVES.length);
    const back = move => !!entryAt(context, move.from)?.isDirectory();
    // The location both vocabularies share is filled again when delivery work moves into it; that is no restore.
    const refilled = move => moves.some(other => other.to === move.from && other.present && (other.status === 'done' || (other.status === 'started' && !back(other))));
    const returned = moves.filter(move => move.present && move.status === 'done' && back(move) && !refilled(move)).map(move => move.from);
    const redeclared = stepOf(journal, 'config').status === 'done' && context.enrolled && context.config.taskTracking.schemaVersion === EARLIER_VERSION;
    if (!returned.length && !redeclared) return null;
    return { returned, redeclared, back: [...returned, ...(redeclared ? [`the earlier declaration in ${configOf(context)}`] : [])] };
}

/**
 * Whether the earlier project is back whole, asked in every state a migration can stop in, also before its first move.
 * `restored` is the progress it reads, equal to the values captured before the first change; otherwise `pending` names
 * each thing that is not back or still remains. Whole means every condition holds: each earlier location that held a
 * record is present, nothing remains under a name only the current vocabulary uses, the declaration does not say
 * current, the project reads as the earlier vocabulary, every record reads as the earlier vocabulary stored it, and
 * progress equals the capture. A moved record left beside the restored ones fails one of the last two: it cannot be
 * read as the earlier kind its location holds, or it is a second home of an identity.
 */
function wholeRestore(context, journal) {
    const moves = journal.value.steps.slice(0, MOVES.length);
    const sources = new Set(moves.map(move => move.from));
    // A location that held no record is not waited for: version control cannot bring an empty folder back.
    const pending = [...moves.filter(move => move.present && move.records !== 0 && !entryAt(context, move.from)?.isDirectory()).map(move => `${move.from} is not back`),
        ...moves.filter(move => !sources.has(move.to) && entryAt(context, move.to)).map(move => `${move.to} is still present (remove it if this migration created it, or move it out of ${rootOf(context)} if it is yours)`),
        ...(context.enrolled && context.config.taskTracking.schemaVersion === CURRENT_VERSION ? [`${configOf(context)} still declares the current vocabulary`] : [])];
    if (pending.length) return { pending };
    const view = settledVocabulary(context);
    if (view.state !== 'earlier') return { pending: [`the project does not read as the earlier vocabulary (${view.reason})`] };
    const scan = store.inspectStoredRecords(context, { version: EARLIER_VERSION });
    if (scan.coverage !== 'complete') return { pending: [`${named(scan.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record of the earlier vocabulary`] };
    const stamped = scan.records.filter(record => record.storedVersion === CURRENT_VERSION).map(record => record.ownerPath);
    if (stamped.length) return { pending: [`${named(stamped)} is still stored in the current vocabulary`] };
    let actual;
    try { actual = progressOf({ ...context, vocabulary: view }); }
    catch (error) { if (!error.code || error.syscall) throw error; return { pending: ['progress cannot be read from the project'] }; }
    const differing = CONSERVED.filter(key => store.stableValue(actual[key]) !== store.stableValue(journal.value.capture[key]));
    return differing.length ? { pending: [`${differing.join(', ')} differ from the values captured before the migration began, as they do while a moved record is still left beside a restored one or a record is missing`] } : { restored: actual };
}

const RESTORED_PREVIEW = `Migration in progress: its progress record remains, but the earlier project is back as it was before the migration began. To end the migration run ${ABANDON_COMMAND}: it removes only the progress record, and the project then reads as the earlier vocabulary again. A preview changes nothing`;

/** Ends a migration on request once the earlier project is back whole. Only the progress record is removed; no folder is touched. */
function abandoned(context, journal, actual) {
    removeBytes(context.root, journalOf(context), hash(journal.bytes));
    return { ...envelope(context), status: 'abandoned', code: 'MIGRATION_ABANDONED',
        reason: `Migration abandoned: the earlier record locations and the project configuration are back as they were before the migration began and nothing the migration created remains, so the progress record ${journalOf(context)} was removed. The project stores the earlier vocabulary again and is read-only; preview and run the migration to start over`,
        progress: progressView(actual) };
}

const nothingToAbandon = context => ({ ...envelope(context), status: 'current', code: 'NOTHING_TO_ABANDON',
    reason: `Nothing to abandon: no migration is unfinished in this project (it holds no progress record ${journalOf(context)}). Nothing was changed` });

/** Refuses an abandon request for a project that is not back whole. Nothing is moved, rewritten or removed. */
function notAbandoned(context, journal, pending) {
    const exit = abandonment(context, journal);
    return { ...envelope(context), status: 'interrupted', code: 'RESTORE_INCOMPLETE',
        reason: `Not abandoned: the project is not back as it was before the migration began: ${pending.join('; ')}. Nothing was changed: the progress record ${journalOf(context)} is kept and no folder was removed or moved. ${exit.text}. To complete the migration instead, run ${COMPLETE_COMMAND} without --abandon`,
        journal: journalOf(context), notRestored: pending, abandon: exit.steps };
}

/**
 * How a migration whose disk was restored from outside is completed after all: by undoing that restore. Nothing is
 * named for removal that the progress record does not account for, and a person is asked to check before removing.
 */
function completion(context, journal, outside) {
    const moves = journal.value.steps.slice(0, MOVES.length);
    const returned = moves.filter(move => outside.returned.includes(move.from));
    const gone = returned.filter(move => !entryAt(context, move.to)).map(move => move.to);
    if (gone.length) return { steps: [], text: `This migration can no longer be completed from here: ${named(gone)}, which it created, is gone. Abandon it, then preview and run the migration afresh` };
    const steps = returned.map(move => `remove ${move.from}, which the restore put back, after checking that each of its records is also in ${move.to} as migrated`);
    // The location both vocabularies share cannot be seen to have been restored: what moved into it is still there.
    for (const move of moves.filter(candidate => candidate.present && candidate.status === 'done')) {
        const first = moves.find(candidate => candidate.from === move.to && candidate.present && candidate.status === 'done');
        if (first) steps.push(`in ${move.to} remove any earlier record the restore put back: each already sits migrated in ${first.to}`);
    }
    if (outside.redeclared) {
        let changes = 'so that it declares the current vocabulary again';
        try {
            const edit = configEdit(context);
            if (edit) changes = edit.changes.map(change => (change.renamedKey ? `rename the ${change.field} key ${change.renamedKey[0]} to ${change.renamedKey[1]}` : `set ${change.field} to ${change.to}`)).join(', ');
        } catch (error) { if (error.code !== 'CONFIG_NOT_REWRITABLE') throw error; }
        steps.push(`put the declaration this migration wrote back in ${configOf(context)}: ${changes}`);
    }
    steps.push(`run ${COMPLETE_COMMAND} again`);
    return { steps, text: `To complete the migration instead, undo that restore: ${numbered(steps)}` };
}

/**
 * Stops a plain run whose disk contradicts the progress record. Nothing is moved, rewritten or removed, and the
 * migration is neither carried further nor abandoned: which of the two a person wants cannot be read from the disk,
 * so both ways on are named.
 */
function contradicted(context, journal, outside) {
    const exit = abandonment(context, journal);
    const whole = wholeRestore(context, journal);
    const forward = whole.restored ? { steps: [], text: 'There is nothing left to complete: to migrate after all, abandon first, then preview and run the migration afresh' }
        : completion(context, journal, outside);
    return { ...envelope(context), status: 'interrupted', code: 'RESTORED_FROM_OUTSIDE',
        reason: `Restored from outside: back again after this migration changed them: ${outside.back.join(', ')}. Nothing was changed: a run without an abandon request completes a migration and never abandons one, and it does not carry a restored project further. ${whole.restored ? 'The earlier project is back whole' : `The earlier project is not back whole: ${whole.pending.join('; ')}`}. ${exit.text}. ${forward.text}`,
        journal: journalOf(context), back: outside.back, notRestored: whole.pending || [], abandon: exit.steps, complete: forward.steps };
}

/**
 * Carries a recorded migration forward from its first unsettled step. Each step is decided from what is on disk, so a
 * step that finished just before an interruption is recorded as done and never repeated. `checkpoint` is told each
 * point reached; whatever it throws stops the run there with the progress record exactly as that point left it.
 */
function advance(context, journal, checkpoint, resumed) {
    const stopped = (code, reason, step) => {
        const exit = abandonment(context, journal);
        return { ...envelope(context), status: 'interrupted', code, reason: `${reason}. ${vocabulary.REFUSALS.MIGRATION_IN_PROGRESS}. ${exit.text}`, step, journal: journalOf(context), abandon: exit.steps };
    };
    for (const move of journal.value.steps.slice(0, MOVES.length)) {
        if (settled(move)) continue;
        if (!move.present) { journal = mark(context, journal, move.id, 'skipped'); continue; }
        if (move.status !== 'started') journal = mark(context, journal, move.id, 'started');
        const [source, destination] = [entryAt(context, move.from), entryAt(context, move.to)];
        if (source && destination) return stopped('DESTINATION_PRESENT', `Destination already present: ${move.to} exists while ${move.from} still waits to move; move or remove ${move.to}`, move.id);
        if (!source && !destination) return stopped('SOURCE_MISSING', `Neither ${move.from} nor ${move.to} exists; restore the record location before continuing`, move.id);
        if (source) {
            try { fs.renameSync(scopedPath(context.root, move.from), scopedPath(context.root, move.to)); }
            catch (error) { return stopped('MOVE_FAILED', `Could not move ${move.from} to ${move.to} (${error.code || 'unknown cause'}); close anything holding the folder open`, move.id); }
            let directory;
            try { directory = fs.openSync(scopedPath(context.root, context.artifactsRoot), 'r'); fs.fsyncSync(directory); }
            catch { /* The move is visible; power-loss durability of a directory entry is not available everywhere. */ }
            finally { if (directory !== undefined) fs.closeSync(directory); }
            checkpoint(`moved:${move.id}`);
        }
        journal = mark(context, journal, move.id, 'done');
        checkpoint(`recorded:${move.id}`);
    }

    let rewritten = 0;
    if (!settled(stepOf(journal, 'rewrite'))) {
        if (stepOf(journal, 'rewrite').status !== 'started') journal = mark(context, journal, 'rewrite', 'started');
        const scan = store.inspectStoredRecords(context, { version: EARLIER_VERSION, folders: MOVED_FOLDERS });
        if (scan.coverage !== 'complete') return stopped('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(scan.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record; repair it`, 'rewrite');
        // A record stamped current was rewritten by an earlier run. Its words already mean what they say now, so it is never mapped again.
        const pending = scan.records.filter(record => record.storedVersion !== CURRENT_VERSION).sort((a, b) => a.ownerPath.localeCompare(b.ownerPath, 'en'));
        for (const record of pending) {
            const candidate = currentRecord(context, record);
            if (candidate.contentHash === record.contentHash) continue;
            store.saveRecord(context, candidate, record.contentHash);
            checkpoint('record-rewritten', { count: ++rewritten, of: pending.length });
        }
        journal = mark(context, journal, 'rewrite', 'done');
        checkpoint('records-rewritten');
    }

    let declared = trackingContext(context.root);
    if (!settled(stepOf(journal, 'config'))) {
        const edit = configEdit(declared);
        if (edit) {
            journal = mark(context, journal, 'config', 'started');
            writeConfig(context, edit);
            checkpoint('config-written');
            declared = trackingContext(context.root);
        }
        journal = mark(context, journal, 'config', edit || declared.enrolled ? 'done' : 'skipped');
    }

    checkpoint('before-verify');
    const failed = (reason, extra = {}) => {
        const exit = abandonment(context, journal);
        return { ...envelope(context), status: 'failed', code: 'MIGRATION_VERIFICATION_FAILED',
            reason: `Migration verification failed: ${reason}. The progress record ${journalOf(context)} is kept and the project stays unavailable; correct the difference and run the migration again. ${exit.text}`,
            journal: journalOf(context), abandon: exit.steps, ...extra };
    };
    const view = settledVocabulary(declared);
    if (view.state !== 'current') return failed(`the project does not read as the current vocabulary (${view.reason})`);
    const actual = progressOf({ ...declared, vocabulary: view });
    const expected = journal.value.capture;
    const differing = CONSERVED.filter(key => store.stableValue(actual[key]) !== store.stableValue(expected[key]));
    if (differing.length) return failed(`${differing.join(', ')} differ from the values captured before the first change`,
        { differing, expected: progressView(expected), actual: progressView(actual), records: { expected: expected.records, actual: actual.records } });
    if (stepOf(journal, 'verify').status !== 'done') journal = mark(context, journal, 'verify', 'done');
    checkpoint('verified');
    removeBytes(context.root, journalOf(context), hash(journal.bytes));
    return { ...envelope(context), status: 'migrated', resumed,
        moves: journal.value.steps.slice(0, MOVES.length).map(step => ({ from: step.from, to: step.to, status: step.status })),
        records: { total: actual.records, rewritten }, config: { path: slashed(path.relative(declared.root, declared.configPath)), status: stepOf(journal, 'config').status },
        progress: progressView(actual), verified: true, currentlyVerified: { before: expected.currentlyVerified ?? null, after: actual.currentlyVerified },
        standing: standingChange(expected.standing, actual, 'result'),
        linkPaths: linkPathsView(context, unmappedPaths(context, store.inspectStoredRecords({ ...declared, vocabulary: view }, { version: CURRENT_VERSION }).records)) };
}

function start(context, planned, checkpoint) {
    const journal = writeJournal(context, { schemaVersion: 1, kind: JOURNAL_KIND, from: EARLIER_VERSION, to: CURRENT_VERSION, startedAt: new Date().toISOString(),
        capture: captured(planned.reading),
        steps: [...planned.moves.map(move => ({ id: move.id, from: move.from, to: move.to, present: move.present, records: move.records, status: 'pending' })),
            ...TAIL_STEPS.map(id => ({ id, status: 'pending' }))] }, null);
    checkpoint('journal-written');
    return advance(context, journal, checkpoint, false);
}

/** Decides what a request may do from the project's present state. Changes nothing. */
function prepare(rootDir) {
    const context = trackingContext(rootDir);
    const stored = context.vocabulary;
    if (stored.state === 'current') return { context, result: { ...envelope(context), status: 'current', code: 'NOTHING_TO_MIGRATE',
        reason: `Nothing to migrate: this project already stores the current vocabulary${stored.earlierLocations.length
            ? `; files under ${stored.earlierLocations.map(name => `${context.artifactsRoot}/${name}`).join(', ')} are flagged and are not migrated, because the project declares the current vocabulary` : ''}` } };
    if (stored.state === 'migrating') return { context, migrating: true };
    if (stored.state !== 'earlier') {
        // Both vocabularies' locations are present. For a migration the obstacle is the location already standing where an earlier one must go.
        const taken = stored.currentLocations.map(name => `${context.artifactsRoot}/${name}`);
        return { context, result: refused(context, [...(taken.length ? [{ code: 'DESTINATION_PRESENT', reason: `Destination already present: ${named(taken)}; move or remove it, then retry`, paths: taken }] : []),
            { code: stored.code, reason: stored.reason }]) };
    }
    const planned = plan(context);
    return planned.refusals.length ? { context, result: refused(context, planned.refusals) } : { context, planned };
}

/**
 * `migrate(root)` migrates or completes an unfinished migration and never abandons one; `{ dryRun: true }` previews and
 * changes nothing; `{ abandon: true }` is the only way to abandon: it removes the progress record, and nothing else,
 * once the earlier project is back whole. The result always has `status`: preview, migrated, current (nothing to
 * migrate, or nothing to abandon), refused (nothing changed), interrupted (progress record kept), failed (verification
 * differed; progress record kept) or abandoned (asked for, and the earlier project was back whole).
 */
async function migrate(rootDir, { dryRun = false, abandon = false, checkpoint = () => {} } = {}) {
    let context = null;
    try {
        if (dryRun && abandon) return refused(null, [{ code: 'INVALID_INPUT', reason: 'Choose one of a preview and an abandon request: a preview describes a migration that has not started, and abandoning cannot be previewed. An abandon request changes nothing unless the earlier project is back whole' }]);
        if (abandon) {
            context = trackingContext(rootDir);
            if (context.vocabulary.state !== 'migrating') return nothingToAbandon(context);
            // Decided under the writer lock, from the disk as it is then.
            return await withTrackingLock(context.root, () => {
                context = trackingContext(rootDir);
                if (context.vocabulary.state !== 'migrating') return nothingToAbandon(context);
                const journal = loadJournal(context);
                const whole = wholeRestore(context, journal);
                return whole.restored ? abandoned(context, journal, whole.restored) : notAbandoned(context, journal, whole.pending);
            });
        }
        const first = prepare(rootDir);
        context = first.context;
        if (first.result) return first.result;
        if (dryRun && first.migrating) {
            // Read without the lock and changed by nothing: a preview only says which of the two unfinished states this is.
            let restored = false;
            try { const journal = loadJournal(context); restored = !!restoredOutside(context, journal) && !!wholeRestore(context, journal).restored; } catch { /* An unreadable progress record is still an unfinished migration. */ }
            return refused(context, [{ code: 'MIGRATION_IN_PROGRESS', reason: restored ? RESTORED_PREVIEW : vocabulary.REFUSALS.MIGRATION_IN_PROGRESS }]);
        }
        if (dryRun) return preview(context, first.planned);
        // Decided again under the writer lock: another run may have finished, started or stopped since the first look.
        return await withTrackingLock(context.root, () => {
            const held = prepare(rootDir);
            context = held.context;
            if (held.result) return held.result;
            if (!held.migrating) return start(context, held.planned, checkpoint);
            const journal = loadJournal(context);
            // A project put back from outside is never carried forward, and never abandoned here: both ways on are named.
            const outside = restoredOutside(context, journal);
            return outside ? contradicted(context, journal, outside) : advance(context, journal, checkpoint, true);
        });
    } catch (error) {
        // A failure raised by the tracker carries its own project-relative reason; a system failure is named by its code alone.
        const reason = error.code && !error.syscall ? error.message : `Migration could not continue (${error.code || 'unexpected failure'})`;
        let unfinished = false;
        try { unfinished = !!context && fs.lstatSync(path.join(context.root, ...journalOf(context).split('/'))) !== null; } catch { /* No progress record: nothing was started. */ }
        if (!unfinished) return refused(context, [{ code: error.code || 'IO_FAILURE', reason }]);
        // The steps are named from the progress record when it can be read. One that cannot be read is never acted on,
        // by a repeated run or by an abandon request, so neither is promised: the way out is by hand.
        let journal = null;
        try { journal = loadJournal(context); } catch { /* Unreadable, foreign or linked. */ }
        const exit = journal ? abandonment(context, journal) : byHand(context);
        return { ...envelope(context), status: 'interrupted', code: error.code || 'IO_FAILURE',
            reason: journal ? `${reason}. ${vocabulary.REFUSALS.MIGRATION_IN_PROGRESS}. ${exit.text}` : `${reason}. ${exit.text}`, journal: journalOf(context), abandon: exit.steps };
    }
}

module.exports = { migrate, MOVES };
