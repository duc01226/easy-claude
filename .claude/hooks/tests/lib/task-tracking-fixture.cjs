'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createTempDir, cleanupTempDir, createEnvSaver } = require('./test-utils.cjs');
const core = require('../../lib/task-tracking.cjs');
const { trackingContext } = require('../../lib/task-tracking-config.cjs');
const { inspectRecords, parseRecord } = require('../../lib/task-artifact-store.cjs');
const { identities, bindRecordContext } = require('../../lib/task-tracking-policy.cjs');
const { readProgress } = require('../../lib/task-progress-reader.cjs');

const CRITERIA = [{ id: 'selected-rows', text: 'Export contains exactly the selected rows' }];
const OBSERVED_AT = '2026-01-02T00:00:00.000Z';

// Each test owns its whole adopter checkout. No authoring-repository metadata is copied.
async function withFixture(callback) {
    const temporaryRoot = createTempDir('tracking-adopter-');
    const root = fs.realpathSync(temporaryRoot);
    const neutralKeys = new Set(['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP', 'NODE_OPTIONS', 'CLAUDE_PROJECT_DIR', 'CK_NO_AUTO_OPEN', 'CK_AUTO_INSTALL_DEPENDENCIES',
        ...Object.keys(process.env).filter(key => /^(CK_|CLAUDE_|CODEX_|OPENCODE_)|TOKEN|SECRET|API_KEY/.test(key))]);
    const environment = createEnvSaver();
    environment.save([...neutralKeys]);
    for (const key of neutralKeys) delete process.env[key];
    for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) process.env[key] = root;
    process.env.CLAUDE_PROJECT_DIR = root;
    // A tracker command installs its missing package by itself. No test, in this process or a child, may reach the
    // registry or write into the bundle: a copy without its package must refuse, not repair itself mid-suite.
    process.env.CK_AUTO_INSTALL_DEPENDENCIES = '0';
    let counter = 0;
    const fixture = {
        root, core,
        config: { project: { name: 'Fixture workspace' }, docsRoots: { teamArtifacts: { path: 'work' } },
            taskTracking: { schemaVersion: 2, mode: 'linked', members: [
                { id: 'owner', displayName: 'Owner', active: true, aliases: ['Previous owner'] },
                { id: 'peer', displayName: 'Peer', active: true },
                { id: 'inactive', displayName: 'Inactive', active: false }
            ], report: { enabled: true, autoRefresh: false } } },
        write(relative, value) {
            const target = path.join(root, relative);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, value);
            return target;
        },
        saveConfig() { this.write('docs/project-config.json', JSON.stringify(this.config)); },
        context() { return trackingContext(root); },
        records() { return inspectRecords(this.context()).records; },
        record(id) {
            const matches = this.records().filter(record => record.id === id);
            assert.equal(matches.length, 1, `Expected one canonical owner for ${id}`);
            return matches[0];
        },
        bytes(id) { return fs.readFileSync(path.join(root, this.record(id).ownerPath)); },
        progress(options) { return readProgress(root, options); },
        // Every stored byte of the record root and the project configuration, for "nothing changed" assertions.
        storedState() {
            const found = [];
            const visit = relative => {
                for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
                    const child = `${relative}/${entry.name}`;
                    if (entry.isDirectory()) { found.push([`${child}/`, 'directory']); visit(child); }
                    else found.push([child, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, child))).digest('hex')]);
                }
            };
            for (const top of ['work', 'docs']) if (fs.existsSync(path.join(root, top))) visit(top);
            return found;
        },
        view(id) { return this.progress().items.find(item => item.id === id); },
        authority(overrides = {}) { return { root, actor: 'owner', canWrite: true, canReview: true, canAccept: true, canRecordManual: true, ...overrides }; },
        request(operation, id, patch, overrides = {}) {
            const record = operation === 'create' ? null : this.record(id);
            return { schemaVersion: 2, operation, operationId: `operation-${++counter}`,
                target: { kind: record?.kind || 'task', ...(id ? { itemId: id } : {}) }, actor: { memberId: 'owner' }, patch,
                ...(record ? { expected: { revision: record.revision, contentHash: record.contentHash } } : {}), ...overrides };
        },
        async perform(operation, id, patch, requestOverrides = {}, authorityOverrides = {}) {
            return core.executeOperation(this.request(operation, id, patch, requestOverrides), this.authority(authorityOverrides));
        },
        async saved(operation, id, patch, requestOverrides = {}, authorityOverrides = {}) {
            const result = await this.perform(operation, id, patch, requestOverrides, authorityOverrides);
            assert.equal(result.primary.status, 'saved', JSON.stringify(result.primary));
            return result;
        },
        async create(id = 'TASK-101', kind = 'task', patch = {}) {
            return this.saved('create', id, { title: 'Export selected rows', intent: 'Let an operator export a selected subset', criteria: CRITERIA, ...patch }, { target: { kind, ...(id ? { itemId: id } : {}) } });
        },
        async ready(id = 'TASK-101') {
            await this.saved('transition', id, { state: 'planned' });
            await this.saved('transition', id, { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } });
        },
        async active(id = 'TASK-101') {
            await this.saved('assign', id, { assigneeId: 'owner' });
            await this.ready(id);
            await this.saved('transition', id, { state: 'in_progress' });
        },
        async verifying(id = 'TASK-101') { await this.active(id); await this.saved('transition', id, { state: 'verifying' }); },
        proof(id = 'TASK-101', overrides = {}) {
            const context = this.context(); const { records } = inspectRecords(context);
            const matches = records.filter(record => record.id === id);
            assert.equal(matches.length, 1, `Expected one canonical owner for ${id}`);
            const { criteriaIds, criteriaIdentity, sourceIdentity } = identities(matches[0], bindRecordContext(context, records));
            return { id: `proof-${++counter}`, kind: 'manual', result: 'passed', observedAt: OBSERVED_AT,
                criteriaIds, criteriaIdentity, sourceIdentity, summary: 'Observed the selected rows outcome', ...overrides };
        },
        async accepted(id = 'TASK-101') {
            await this.verifying(id);
            const proof = this.proof(id);
            await this.saved('proof', id, { proof });
            await this.saved('accept', id, { reason: 'Observed criteria are accepted' });
        }
    };
    try {
        // Config loaders may capture the personal home at module import. Pin the
        // fixture's owner explicitly instead of disabling personal precedence.
        fixture.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'docs/project-config.json' } }));
        fixture.saveConfig();
        return await callback(fixture);
    }
    finally {
        environment.restore();
        cleanupTempDir(temporaryRoot);
    }
}

function trackingTest(caseId, intent, callback) {
    return { name: `${caseId}: ${intent}`, TestSpec: caseId, fn: () => withFixture(callback) };
}

function refused(result, code) {
    assert.equal(result.primary.status, 'refused', JSON.stringify(result.primary));
    if (code) assert.equal(result.primary.code, code);
}

// Literal Git commands operate only on the disposable adopter root supplied by a test.
function git(fixture, args) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' });
    const result = spawnSync('git', ['--no-pager', '-C', fixture.root, '-c', 'core.hooksPath=', '-c', 'core.fsmonitor=false',
        '-c', 'commit.gpgSign=false', '-c', 'user.name=Fixture author', '-c', 'user.email=fixture@example.invalid', ...args],
    { env, shell: false, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(result.error, undefined, result.error?.message); assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}

// The earlier vocabulary, spelled out as test data. It is deliberately independent of the vocabulary owner: a project
// built from the owner's own map would still read correctly after that map was broken.
const EARLIER_WORDS = Object.freeze({
    kinds: { task: 'pbi', subtask: 'task', initiative: 'idea', project: 'epic', story: 'story', vision: 'vision' },
    folders: { task: 'pbis', subtask: 'tasks', initiative: 'ideas', project: 'epics', story: 'pbis/stories', vision: 'visions' },
    currentFolders: { task: 'tasks', subtask: 'subtasks', initiative: 'initiatives', project: 'projects', story: 'tasks/stories', vision: 'visions' },
    states: { planned: 'backlog' }, groupRoles: { program: 'initiative' }, linkRoles: { initiative: 'idea' }
});
const EARLIER_IDS = Object.freeze({ accepted: 'PBI-1', remaining: 'PBI-2', supporting: 'TASK-K', intent: 'IDEA-D', story: 'STORY-S', group: 'EPIC-E' });

/**
 * Turns the fixture into a project that stores the earlier vocabulary, as a release before the vocabulary change wrote
 * it. Saves are refused in such a project, so the same work is first saved in the current words, its progress is
 * captured, and every record file is then rewritten directly: earlier locations, earlier kind, state, history states,
 * group purpose, link relation, receipt kind and paths, and record stamp 1. Authored bodies and identities are kept.
 *
 * Work written (identities in `ids`): an accepted delivery item whose history passed through the earlier planned state
 * and which holds receipts and a link to the captured intent; a remaining delivery item in the earlier planned state;
 * supporting work under it, holding one link path into each earlier location; a captured intent; a story under the
 * accepted item; and a group with the earlier finite-scope purpose whose members are both delivery items.
 *
 * Options: `declared` (default true) keeps the tracker block with marker 1 and a custom label under the earlier purpose
 * key; false removes the tracker block, leaving an unconfigured project recognised by its locations. `commit` (default
 * false) initialises a Git repository and commits the result, for pinned reads.
 * Returns { ids, expected: { total, accepted, remaining, eligibleIds, states, kinds }, folders, oid }, where `expected`
 * is what the same data reported while stored in the current words under the same configuration.
 */
async function earlierProject(fixture, { declared = true, commit = false } = {}) {
    const ids = EARLIER_IDS;
    fixture.config.taskTracking.groupLabels = { program: 'Bet' };
    fixture.saveConfig();
    await fixture.create(ids.intent, 'initiative');
    await fixture.create(ids.accepted);
    await fixture.saved('link', ids.accepted, { links: [{ relation: 'initiative', itemId: ids.intent }] });
    await fixture.accepted(ids.accepted);
    await fixture.create(ids.remaining);
    await fixture.saved('transition', ids.remaining, { state: 'planned' });
    await fixture.create(ids.story, 'story');
    await fixture.saved('link', ids.story, { links: [{ relation: 'parent', itemId: ids.accepted }] });
    await fixture.create(ids.group, 'project');
    await fixture.saved('group', ids.group, { memberItemIds: [ids.accepted, ids.remaining], groupRole: 'program' });
    await fixture.create(ids.supporting, 'subtask');
    const current = id => fixture.record(id).ownerPath;
    await fixture.saved('link', ids.supporting, { links: [{ relation: 'parent', itemId: ids.remaining },
        ...[ids.accepted, ids.supporting, ids.intent, ids.group, ids.story].map(id => ({ relation: 'plan', path: current(id) }))] });
    if (!declared) { delete fixture.config.taskTracking; fixture.saveConfig(); }
    const before = fixture.progress();
    const expected = { total: before.metrics.total, accepted: before.metrics.accepted, remaining: before.metrics.remaining,
        eligibleIds: [...before.metrics.eligibleIds], states: Object.fromEntries(before.items.map(item => [item.id, item.state])),
        kinds: Object.fromEntries(before.items.map(item => [item.id, item.kind])) };
    // Longest location first, so a story is moved as a story and never as part of its parent location.
    const moved = Object.entries(EARLIER_WORDS.currentFolders).sort((a, b) => b[1].length - a[1].length)
        .map(([kind, folder]) => [`work/${folder}/`, `work/${EARLIER_WORDS.folders[kind]}/`]);
    // Each path is mapped once from its original value; the two families share a location name, so mapping is never chained.
    const earlierPath = value => { const pair = moved.find(([from]) => value.startsWith(from)); return pair ? pair[1] + value.slice(pair[0].length) : value; };
    const word = (table, value) => (Object.hasOwn(table, value) ? table[value] : value);
    const files = fixture.records().map(record => {
        const stored = parseRecord(fs.readFileSync(path.join(fixture.root, record.ownerPath)), record.ownerPath, record.kind);
        const t = stored.tracking;
        const tracking = { ...t, schemaVersion: 1, kind: EARLIER_WORDS.kinds[t.kind],
            history: t.history.map(entry => ({ ...entry, beforeState: word(EARLIER_WORDS.states, entry.beforeState), afterState: word(EARLIER_WORDS.states, entry.afterState) })),
            links: t.links.map(link => ({ ...link, relation: word(EARLIER_WORDS.linkRoles, link.relation), ...(link.path ? { path: earlierPath(link.path) } : {}) })),
            receipts: t.receipts.map(receipt => ({ ...receipt, result: { ...receipt.result, kind: EARLIER_WORDS.kinds[receipt.result.kind], ownerPath: earlierPath(receipt.result.ownerPath) } })),
            ...(typeof t.groupRole === 'string' ? { groupRole: word(EARLIER_WORDS.groupRoles, t.groupRole) } : {}) };
        const header = { ...stored.data, status: word(EARLIER_WORDS.states, stored.data.status), tracking };
        return [earlierPath(record.ownerPath), `---\n${Object.entries(header).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n${stored.body}`];
    });
    for (const folder of new Set(Object.values(EARLIER_WORDS.currentFolders).map(value => value.split('/')[0]))) fs.rmSync(path.join(fixture.root, 'work', folder), { recursive: true, force: true });
    for (const [relative, text] of files) fixture.write(relative, text);
    if (declared) {
        fixture.config.taskTracking = { ...fixture.config.taskTracking, schemaVersion: 1, groupLabels: { initiative: 'Bet' } };
        fixture.saveConfig();
    }
    let oid;
    if (commit) { git(fixture, ['init']); git(fixture, ['add', '--', 'docs', 'work']); git(fixture, ['commit', '-m', 'Earlier vocabulary project']); oid = git(fixture, ['rev-parse', 'HEAD']); }
    return { ids, expected, folders: { ...EARLIER_WORDS.folders }, oid };
}

module.exports = { withFixture, trackingTest, refused, CRITERIA, OBSERVED_AT, git, earlierProject, EARLIER_WORDS, EARLIER_IDS };
