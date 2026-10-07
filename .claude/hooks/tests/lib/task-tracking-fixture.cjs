'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createTempDir, cleanupTempDir, createEnvSaver } = require('./test-utils.cjs');
const core = require('../../lib/task-tracking.cjs');
const { trackingContext } = require('../../lib/task-tracking-config.cjs');
const { inspectRecords } = require('../../lib/task-artifact-store.cjs');
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
            taskTracking: { schemaVersion: 1, mode: 'linked', members: [
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
        view(id) { return this.progress().items.find(item => item.id === id); },
        authority(overrides = {}) { return { root, actor: 'owner', canWrite: true, canReview: true, canAccept: true, canRecordManual: true, ...overrides }; },
        request(operation, id, patch, overrides = {}) {
            const record = operation === 'create' ? null : this.record(id);
            return { schemaVersion: 1, operation, operationId: `operation-${++counter}`,
                target: { kind: record?.kind || 'pbi', ...(id ? { itemId: id } : {}) }, actor: { memberId: 'owner' }, patch,
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
        async create(id = 'PBI-101', kind = 'pbi', patch = {}) {
            return this.saved('create', id, { title: 'Export selected rows', intent: 'Let an operator export a selected subset', criteria: CRITERIA, ...patch }, { target: { kind, ...(id ? { itemId: id } : {}) } });
        },
        async ready(id = 'PBI-101') {
            await this.saved('transition', id, { state: 'backlog' });
            await this.saved('transition', id, { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } });
        },
        async active(id = 'PBI-101') {
            await this.saved('assign', id, { assigneeId: 'owner' });
            await this.ready(id);
            await this.saved('transition', id, { state: 'in_progress' });
        },
        async verifying(id = 'PBI-101') { await this.active(id); await this.saved('transition', id, { state: 'verifying' }); },
        proof(id = 'PBI-101', overrides = {}) {
            const context = this.context(); const { records } = inspectRecords(context);
            const matches = records.filter(record => record.id === id);
            assert.equal(matches.length, 1, `Expected one canonical owner for ${id}`);
            const { criteriaIds, criteriaIdentity, sourceIdentity } = identities(matches[0], bindRecordContext(context, records));
            return { id: `proof-${++counter}`, kind: 'manual', result: 'passed', observedAt: OBSERVED_AT,
                criteriaIds, criteriaIdentity, sourceIdentity, summary: 'Observed the selected rows outcome', ...overrides };
        },
        async accepted(id = 'PBI-101') {
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

module.exports = { withFixture, trackingTest, refused, CRITERIA, OBSERVED_AT, git };
