'use strict';

// Intent: only consent bound to the authoritative source may persist a scalar project preference.
// Real child CLI boundaries use literal argv on Windows/macOS/Linux; native host questions remain manual.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const { inspectReviewSetup, saveReviewSetup, MAX_CONFIG_BYTES, parseArgs } = require('../../skills/project-config/scripts/review-setup.cjs');
const { prepareReview } = require('../lib/review-preparation.cjs');
const { captureTarget, digest } = require('../lib/review-target.cjs');

async function fixture(fn) {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-setup-')));
    const machine = path.join(root, 'tmp/machine'); fs.mkdirSync(machine, { recursive: true });
    const previous = { ...process.env };
    const put = (relative, value) => {
        const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
    };
    try {
        for (const key of Object.keys(process.env)) if (/^(CK_|CLAUDE_|OCR_|OPENAI_|ANTHROPIC_|CODEX_|OPENCODE_|GIT_)/i.test(key)) delete process.env[key];
        for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) process.env[key] = machine;
        process.env.CLAUDE_PROJECT_DIR = root;
        fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
        put('.claude/skills/shared/protocol-groups.json', { groups: { universal: { tags: { 'fixture-rule': {} } } } });
        put('.claude/skills/shared/protocols/fixture-rule.md', 'Preserve every required standard');
        put('.claude/skills/changes-review/SKILL.md', 'Fixture source review');
        put('item.txt', 'Selected work');
        return await fn({ root, put, env: { ...process.env }, configPath: path.join(root, 'docs/project-config.json') });
    } finally {
        for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
        Object.assign(process.env, previous); fs.rmSync(root, { recursive: true, force: true });
    }
}
const minimum = { project: { name: 'Fixture adopter' }, referenceDocs: [] };
const ready = target => ({ id: 'open-code-review', status: 'ready', reason: null, version: '1.12.11', criteria: [{ id: 'fixture', source: 'fixture-rule', contentHash: digest('Review business intent'), text: 'Review business intent', entryIds: target.entries.map(entry => entry.id) }] });

function helperWithFs(overrides) {
    const filename = path.resolve(__dirname, '../../skills/project-config/scripts/review-setup.cjs');
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
    const ordinary = mod.require.bind(mod);
    mod.require = name => name === 'node:fs' ? { ...fs, ...overrides } : ordinary(name);
    mod._compile(fs.readFileSync(filename, 'utf8'), filename);
    return mod.exports;
}

test('TC-RVP-044 absent/minimum/rule-only accept saves only preference and requires fresh selected-config capture', () => fixture(async ({ root, put, configPath }) => {
    // Given actual absent/minimum/rule-only settings, with protected manual and edited-detected groups.
    const rich = { ...minimum, customOwner: { preserve: true }, modules: [{ name: 'source', kind: 'library', pathRegex: '/item/' }],
        reviewGroups: [{ id: 'manual', modules: ['source'], origin: 'user' }, { id: 'edited', modules: ['source'], origin: 'detected', detectedFingerprint: '0123456789abcdef', priority: 1 }],
        reviewPreparation: { ruleDocs: ['standards/rules.md'] } };
    put('standards/rules.md', 'Keep the authoritative team standard');
    for (const [index, original] of [null, minimum, rich].entries()) {
        if (original) put('docs/project-config.json', original); else if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
        const inspection = inspectReviewSetup({ rootDir: root });
        assert.equal(inspection.provider, null); assert.equal(fs.existsSync(configPath), Boolean(original));
        const selected = original ? ['item.txt', 'docs/project-config.json'] : ['item.txt'];
        const before = captureTarget({ rootDir: root, scope: 'files', files: selected, outputDir: `tmp/accept-${index}/before` });
        let calls = 0;
        const provider = async ({ target }) => { calls++; return ready(target); };
        const unresolved = await prepareReview({ rootDir: root, target: before, outputDir: `tmp/accept-${index}/unresolved`, provider });
        assert.equal(unresolved.provider.status, 'setup-needed'); assert.equal(calls, 0);
        // When the owner accepts the exact inspected source, then save/readback precedes native preparation.
        const saved = saveReviewSetup({ rootDir: root, action: 'enable', expectedSource: inspection.expectedSource });
        assert.equal(saved.status, 'saved'); assert.equal(saved.provider, 'open-code-review'); assert.equal(calls, 0);
        const after = JSON.parse(fs.readFileSync(configPath));
        if (original) assert.deepEqual(after, { ...original, reviewPreparation: { ...original.reviewPreparation, provider: 'open-code-review' } });
        else assert.deepEqual(after, { project: { name: path.basename(root) }, reviewPreparation: { provider: 'open-code-review' } });
        assert.equal(inspectReviewSetup({ rootDir: root }).provider, 'open-code-review');
        const stale = await prepareReview({ rootDir: root, target: before, outputDir: `tmp/accept-${index}/old`, provider });
        if (original) { assert.equal(stale.routing.status, 'target-incomplete'); assert.equal(calls, 0); }
        const fresh = captureTarget({ rootDir: root, scope: 'files', files: ['item.txt', 'docs/project-config.json'], outputDir: `tmp/accept-${index}/fresh` });
        const prepared = await prepareReview({ rootDir: root, target: fresh, outputDir: `tmp/accept-${index}/prepared`, provider });
        assert.equal(prepared.provider.status, 'ready'); assert.equal(prepared.routing.status, 'ready');
        assert.notEqual(prepared.policyFingerprint, unresolved.policyFingerprint); assert.notEqual(fresh.fingerprint, before.fingerprint);
        assert.equal(fresh.entries.find(entry => entry.path === 'docs/project-config.json').afterId, digest(fs.readFileSync(configPath)));
        if (original === rich) assert.ok(prepared.ruleSources.some(source => source.origin === 'standards/rules.md' && source.authority === 'required'));
        const later = await prepareReview({ rootDir: root, target: fresh, outputDir: `tmp/accept-${index}/later`, provider: async () => ({ id: 'open-code-review', status: 'fallback', reason: 'execution-denied', version: null, criteria: [] }) });
        assert.equal(later.provider.status, 'fallback'); assert.equal(later.provider.choices, undefined);
    }
}));

test('TC-RVP-045 deliberate off and re-enable persist stable choices without erasing standards', () => fixture(async ({ root, put, configPath }) => {
    // Given configured enablement and selected additional standards.
    put('standards/rules.md', 'Required rule');
    const original = { ...minimum, reviewPreparation: { provider: 'open-code-review', ruleDocs: ['standards/rules.md'] } };
    put('docs/project-config.json', original);
    // When the owner saves Off, then three later parent/child/recheck preparations are quiet and have zero provider calls.
    const off = saveReviewSetup({ rootDir: root, action: 'off', expectedSource: inspectReviewSetup({ rootDir: root }).expectedSource });
    assert.equal(off.provider, 'none'); let calls = 0;
    for (let index = 0; index < 3; index++) {
        const result = await prepareReview({ rootDir: root, scope: 'files', files: ['item.txt'], outputDir: `tmp/off-${index}/prepared`, provider: async () => { calls++; throw new Error('must not run'); } });
        assert.equal(result.provider.status, 'disabled'); assert.equal(result.provider.reason, 'project-provider-disabled'); assert.equal(result.provider.choices, undefined);
        assert.ok(result.ruleSources.some(source => source.origin === 'standards/rules.md')); assert.equal(result.entries.length, 1);
    }
    assert.equal(calls, 0); assert.deepEqual(JSON.parse(fs.readFileSync(configPath)), { ...original, reviewPreparation: { ...original.reviewPreparation, provider: 'none' } });
    const repeated = saveReviewSetup({ rootDir: root, action: 'off', expectedSource: off.expectedSource });
    assert.equal(repeated.provider, 'none');
    assert.equal(saveReviewSetup({ rootDir: root, action: 'enable', expectedSource: repeated.expectedSource }).provider, 'open-code-review');
}));

test('TC-RVP-088 missing consent, changed bytes/identity/path and malformed declarations refuse unchanged', () => fixture(({ root, put, configPath }) => {
    // Given an exact consent snapshot before another owner edits, replaces or relocates its settings.
    put('docs/project-config.json', minimum);
    const inspected = inspectReviewSetup({ rootDir: root });
    assert.throws(() => saveReviewSetup({ rootDir: root, action: 'enable' }), /expected-source-required/);
    put('docs/project-config.json', { ...minimum, customOwner: 'newer owner' });
    const bytes = fs.readFileSync(configPath);
    assert.throws(() => saveReviewSetup({ rootDir: root, action: 'enable', expectedSource: inspected.expectedSource }), /config-source-changed/);
    assert.deepEqual(fs.readFileSync(configPath), bytes);
    const same = inspectReviewSetup({ rootDir: root });
    fs.renameSync(configPath, `${configPath}.owner-backup`); fs.writeFileSync(configPath, bytes);
    assert.throws(() => saveReviewSetup({ rootDir: root, action: 'off', expectedSource: same.expectedSource }), /config-source-changed/);
    assert.deepEqual(fs.readFileSync(configPath), bytes);
    put('.claude/.ck.local.json', { portability: { projectConfigPath: 'project/settings.json' } });
    put('project/settings.json', minimum);
    assert.throws(() => saveReviewSetup({ rootDir: root, action: 'off', expectedSource: same.expectedSource }), /config-source-changed/);
    assert.deepEqual(fs.readFileSync(configPath), bytes);
    fs.unlinkSync(path.join(root, '.claude/.ck.local.json'));
    for (const invalid of ['{malformed', JSON.stringify({ project: {} }), JSON.stringify({ ...minimum, reviewPreparation: { provider: 'unknown' } }), JSON.stringify({ ...minimum, reviewGroups: [{ id: 'bad', modules: ['missing'] }] })]) {
        put('docs/project-config.json', invalid);
        assert.throws(() => inspectReviewSetup({ rootDir: root }), /config-invalid/);
        assert.throws(() => saveReviewSetup({ rootDir: root, action: 'enable', expectedSource: inspected.expectedSource }), /config-invalid/);
        assert.equal(fs.readFileSync(configPath, 'utf8'), invalid);
    }
}));

test('TC-RVP-088 unsafe links, irregular/oversized sources and unwritable/publication failures preserve destination', () => fixture(({ root, put, configPath }) => {
    // Given unsafe native links where supported, plus portable deterministic refusal seams.
    put('docs/project-config.json', minimum);
    const initial = fs.readFileSync(configPath), expectedSource = inspectReviewSetup({ rootDir: root }).expectedSource;
    const refusal = helperWithFs({ renameSync: () => { const error = new Error('locked destination'); error.code = 'EPERM'; throw error; } });
    assert.throws(() => refusal.saveReviewSetup({ rootDir: root, action: 'off', expectedSource }), /config-save-unavailable/);
    assert.deepEqual(fs.readFileSync(configPath), initial);
    assert.deepEqual(fs.readdirSync(path.dirname(configPath)), ['project-config.json']);
    fs.chmodSync(configPath, 0o400);
    assert.throws(() => saveReviewSetup({ rootDir: root, action: 'enable', expectedSource: inspectReviewSetup({ rootDir: root }).expectedSource }), /config-save-unavailable/);
    assert.deepEqual(fs.readFileSync(configPath), initial); fs.chmodSync(configPath, 0o600);
    fs.unlinkSync(configPath); fs.mkdirSync(configPath);
    assert.throws(() => inspectReviewSetup({ rootDir: root }), /unsafe-config-file/);
    fs.rmdirSync(configPath); put('docs/project-config.json', Buffer.alloc(MAX_CONFIG_BYTES + 1, 0x20));
    assert.throws(() => inspectReviewSetup({ rootDir: root }), /config-byte-budget/);
    assert.equal(fs.statSync(configPath).size, MAX_CONFIG_BYTES + 1);
    put('docs/project-config.json', minimum);
    const outside = path.join(root, 'outside.json'); fs.writeFileSync(outside, initial);
    fs.unlinkSync(configPath);
    let nativeLink = false;
    try { fs.symlinkSync(outside, configPath, 'file'); nativeLink = true; } catch (error) { if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error; }
    if (nativeLink) { assert.throws(() => inspectReviewSetup({ rootDir: root }), /unsafe-config-path/); assert.deepEqual(fs.readFileSync(outside), initial); fs.unlinkSync(configPath); }
    put('docs/project-config.json', minimum);
    const hardlink = path.join(root, 'settings-alias.json');
    fs.linkSync(configPath, hardlink);
    assert.throws(() => inspectReviewSetup({ rootDir: root }), /unsafe-config-file/);
    assert.deepEqual(fs.readFileSync(hardlink), initial); fs.unlinkSync(hardlink);
    // Windows hosts without symlink privilege still execute the same no-link predicate through a scoped seam.
    const linked = helperWithFs({ lstatSync: file => {
        const stat = fs.lstatSync(file);
        return file === configPath ? new Proxy(stat, { get: (object, key) => key === 'isSymbolicLink' ? () => true : Reflect.get(object, key) }) : stat;
    } });
    put('docs/project-config.json', minimum);
    assert.throws(() => linked.inspectReviewSetup({ rootDir: root }), /unsafe-config-(path|file)/);
    assert.deepEqual(fs.readFileSync(outside), initial);
}));

test('TC-RVP-088 postpublication faults retain truthful preference state and clean only owned artifacts', async () => {
    // Intent: a published choice must never be reported as an unchanged refusal when confirmation fails.
    // Native publication succeeds first; reachable permission/readback/cleanup faults follow in a private fs seam.
    for (const action of ['enable', 'off']) {
        for (const exists of [false, true]) {
            for (const fault of exists ? ['stat', 'open'] : ['stat', 'open', 'unlink']) {
                await fixture(({ root, put, configPath }) => {
                    const lane = `${action}/${exists ? 'existing' : 'missing'}/${fault}`;
                    const original = { ...minimum, customOwner: { preserve: true },
                        modules: [{ name: 'source', kind: 'library', pathRegex: '/item/' }],
                        reviewGroups: [{ id: 'manual', modules: ['source'], origin: 'user' }],
                        reviewPreparation: { provider: action === 'enable' ? 'none' : 'open-code-review', ruleDocs: ['standards/rules.md'] } };
                    put('standards/rules.md', 'Preserve the authoritative standard');
                    put('docs/owner-note.txt', 'Unrelated owner artifact');
                    if (exists) put('docs/project-config.json', original);
                    const consent = inspectReviewSetup({ rootDir: root }).expectedSource;
                    let published = false, injected = 0;
                    const inject = () => {
                        injected++;
                        const error = new Error('fixture postpublication permission failure');
                        error.code = 'EACCES';
                        throw error;
                    };
                    const privateHelper = helperWithFs({
                        renameSync: (from, to) => { fs.renameSync(from, to); if (to === configPath) published = true; },
                        linkSync: (from, to) => { fs.linkSync(from, to); if (to === configPath) published = true; },
                        lstatSync: file => {
                            if (published && fault === 'stat' && file === configPath && injected === 0) {
                                if (action === 'enable' && exists) {
                                    // Another actor can add an alias after publication. Exercise the real
                                    // unsafe-config-file confirmation guard, whose prefix must not win over publication.
                                    injected++;
                                    return new Proxy(fs.lstatSync(file), { get: (object, key) => key === 'nlink' ? 2 : Reflect.get(object, key) });
                                }
                                inject();
                            }
                            return fs.lstatSync(file);
                        },
                        openSync: (file, ...args) => {
                            if (published && fault === 'open' && file === configPath && injected === 0) inject();
                            return fs.openSync(file, ...args);
                        },
                        unlinkSync: file => {
                            if (published && fault === 'unlink' && file.startsWith(configPath + '.') && file.endsWith('.tmp') && injected === 0) inject();
                            return fs.unlinkSync(file);
                        }
                    });
                    // When native rename/link commits and later confirmation fails, the outcome is uncertain, not saved.
                    assert.throws(() => privateHelper.saveReviewSetup({ rootDir: root, action, expectedSource: consent }), /config-publication-unverified/, lane);
                    assert.equal(published, true, lane);
                    assert.equal(injected, 1, lane);
                    // Then inspect the actual durable choice without assuming the destination stayed unchanged.
                    const provider = action === 'enable' ? 'open-code-review' : 'none';
                    const saved = JSON.parse(fs.readFileSync(configPath));
                    const expected = exists ? { ...original, reviewPreparation: { ...original.reviewPreparation, provider } }
                        : { project: { name: path.basename(root) }, reviewPreparation: { provider } };
                    assert.deepEqual(saved, expected, lane);
                    const fresh = inspectReviewSetup({ rootDir: root });
                    assert.equal(fresh.provider, provider, lane);
                    assert.notEqual(fresh.expectedSource, consent, lane);
                    assert.equal(fs.readFileSync(path.join(root, 'standards/rules.md'), 'utf8'), 'Preserve the authoritative standard', lane);
                    assert.equal(fs.readFileSync(path.join(root, 'docs/owner-note.txt'), 'utf8'), 'Unrelated owner artifact', lane);
                    assert.deepEqual(fs.readdirSync(path.dirname(configPath)).sort(), ['owner-note.txt', 'project-config.json'], lane);
                    assert.equal(fs.statSync(configPath).nlink, 1, lane);
                });
            }
        }
    }
});

test('TC-RVP-044 relocated canonical loader cascade and mirrored helper share one inspect/save boundary', () => fixture(({ root, put, env, configPath }) => {
    // Given personal path overridden by local relocation, with only shipped framework owners copied.
    const framework = path.resolve(__dirname, '../..');
    for (const relative of ['hooks/lib', 'scripts/lib']) fs.cpSync(path.join(framework, relative), path.join(root, '.claude', relative), { recursive: true });
    const source = path.join(framework, 'skills/project-config/scripts/review-setup.cjs');
    const destination = '.agents/skills/project-config/scripts/review-setup.cjs';
    fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true }); fs.copyFileSync(source, path.join(root, destination));
    put('tmp/machine/.claude/.ck.json', { portability: { projectConfigPath: 'personal/settings.json' } });
    put('.claude/.ck.local.json', { portability: { projectConfigPath: 'project/actual-settings.json' } });
    put('project/actual-settings.json', minimum);
    const run = args => spawnSync(process.execPath, [path.join(root, destination), ...args], { cwd: root, env, shell: false, windowsHide: true, timeout: 30000, encoding: 'utf8' });
    // When the generated-path helper runs, then inspect and save use the same canonical .claude loader path.
    const inspected = run(['--action', 'inspect']); assert.equal(inspected.status, 0, inspected.stderr);
    const preview = JSON.parse(inspected.stdout); assert.equal(preview.configPath, 'project/actual-settings.json'); assert.equal(preview.provider, null);
    const saved = run(['--action', 'off', '--expected-source', preview.expectedSource]); assert.equal(saved.status, 0, saved.stderr);
    assert.equal(JSON.parse(saved.stdout).provider, 'none'); assert.equal(JSON.parse(fs.readFileSync(path.join(root, preview.configPath))).reviewPreparation.provider, 'none');
    assert.equal(fs.existsSync(configPath), false); assert.equal(fs.existsSync(path.join(root, 'personal/settings.json')), false);
    assert.equal(run(['--action', 'enable', '--expected-source', preview.expectedSource]).status, 2);
    assert.equal(run(['--action', 'enable']).status, 2);
    assert.equal(JSON.parse(run(['--action', 'inspect']).stdout).provider, 'none');
}));

test('TC-RVP-088 inspect/save argument authority is explicit and unsupported actions are refused', () => {
    for (const args of [[], ['--action', 'skip'], ['--action', 'enable'], ['--action', 'inspect', '--expected-source', 'token'], ['--action', 'off', '--expected-source', 'a', '--action', 'enable'], ['--action', 'inspect', '--root', 'elsewhere']]) assert.throws(() => parseArgs(args));
    assert.deepEqual(parseArgs(['--action', 'inspect']), { action: 'inspect' });
    assert.deepEqual(parseArgs(['--action', 'enable', '--expected-source', 'opaque']), { action: 'enable', expectedSource: 'opaque' });
});
