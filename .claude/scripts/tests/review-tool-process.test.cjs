'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const Module = require('node:module');
const { spawn } = require('node:child_process');
const { runNative, nativeHeaderMatches, readPinnedBinary, findNativeCandidates, unpackPublication, downloadPublication, safeCacheDirectory, readCache, acquireNative, cacheLocation } = require('../lib/review-tool-process.cjs');

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sri = value => 'sha512-' + crypto.createHash('sha512').update(value).digest('base64');

function fixture(t) {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-process-')));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return { root, env: { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, PATH: '' }, cacheDir: path.join(root, 'cache') };
}

// Synthetic headers prove parsing/identity rejection, not native Windows/Linux execution.
function nativeHeader(platform = 'linux', arch = 'x64') {
    const buffer = Buffer.alloc(256);
    if (platform === 'darwin') { Buffer.from('cffaedfe', 'hex').copy(buffer); buffer.writeUInt32LE(arch === 'arm64' ? 0x100000c : 0x1000007, 4); }
    if (platform === 'linux') { Buffer.from('7f454c46', 'hex').copy(buffer); buffer[4] = 2; buffer[5] = 1; buffer.writeUInt16LE(arch === 'arm64' ? 183 : 62, 18); }
    if (platform === 'win32') { buffer.write('MZ'); buffer.writeUInt32LE(128, 60); Buffer.from('50450000', 'hex').copy(buffer, 128); buffer.writeUInt16LE(arch === 'arm64' ? 0xaa64 : 0x8664, 132); }
    return buffer;
}

function archiveOf(members) {
    const blocks = [];
    for (const { name, body, type = '0' } of members) {
        const header = Buffer.alloc(512);
        header.write(name, 0, 100, 'utf8');
        header.write('0000700\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
        header.write(body.length.toString(8).padStart(11, '0') + '\0', 124);
        header.write('00000000000\0', 136); header.fill(32, 148, 156); header.write(type, 156);
        header.write('ustar\0', 257); header.write('00', 263);
        const sum = header.reduce((total, byte) => total + byte, 0);
        header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
        blocks.push(header, body, Buffer.alloc((512 - body.length % 512) % 512));
    }
    return zlib.gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

function publication(mutateMembers) {
    const binary = nativeHeader();
    const release = { name: '@fixture/native-review', version: '1.2.3', binaryName: 'opencodereview', binarySize: binary.length, binarySha256: sha(binary) };
    const members = [{ name: 'package/bin/opencodereview', body: binary }, { name: 'package/package.json', body: Buffer.from(JSON.stringify({ name: release.name, version: release.version })) }];
    const archive = archiveOf(mutateMembers ? mutateMembers(members) : members);
    release.integrity = sri(archive);
    return { binary, release, archive };
}

const allow = cacheDir => ({ status: 'ready', execution: true, acquisition: 'auto', network: true, cacheDir });
const acquire = (policy, published, extras = {}) => acquireNative({ policy, release: published.release, platform: 'linux', arch: 'x64', download: async () => published.archive, validate: async () => true, ...extras });

// Private module dependencies simulate Windows branches; no global process, loader or require cache changes.
function windowsProcess(spawnSync, env = {}) {
    const filename = path.resolve(__dirname, '../lib/review-tool-process.cjs');
    const local = new Module(filename, module);
    local.filename = filename;
    local.paths = Module._nodeModulePaths(path.dirname(filename));
    const requireReal = local.require.bind(local);
    local.require = name => name === 'node:process'
        ? { platform: 'win32', arch: process.arch, execPath: process.execPath, pid: process.pid, env }
        : name === 'node:child_process' ? { ...requireReal(name), spawnSync } : requireReal(name);
    local._compile(fs.readFileSync(filename, 'utf8'), filename);
    return local.exports;
}

const privateProbe = () => ({ status: 0, signal: null, stdout: 'review-cache-private-v1', stderr: '' });

function seedCache(cacheDir, published) {
    fs.mkdirSync(cacheDir, { mode: 0o700 });
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
    fs.mkdirSync(location, { mode: 0o700 });
    fs.writeFileSync(path.join(location, published.release.binaryName), published.binary, { mode: 0o700 });
    fs.writeFileSync(path.join(location, 'manifest.json'), JSON.stringify({ schemaVersion: 1, name: published.release.name, version: published.release.version, integrity: published.release.integrity, binarySha256: published.release.binarySha256 }), { mode: 0o600 });
    return location;
}

test('TC-RVP-051: simulated Windows privacy proof permits exact pinned warm reuse without writes', t => {
    // Given a warm fixture and an explicit successful native privacy proof seam on every test OS.
    const { cacheDir } = fixture(t), published = publication();
    const location = seedCache(cacheDir, published), manifest = fs.readFileSync(path.join(location, 'manifest.json'));
    let probes = 0;
    const owner = windowsProcess(() => { probes++; return privateProbe(); });
    // When the shared guard and warm reader validate privacy, independently of the synthetic release platform.
    assert.equal(owner.safeCacheDirectory(cacheDir), fs.realpathSync.native(cacheDir));
    const cached = owner.readCache(cacheDir, published.release, 'linux', 'x64');
    // Then compatibility remains available, with exact immutable identity and untouched publication bytes.
    assert.equal(probes, 2);
    assert.equal(cached.hash, published.release.binarySha256);
    assert.equal(fs.readFileSync(cached.binary).equals(published.binary), true);
    assert.equal(fs.readFileSync(path.join(location, 'manifest.json')).equals(manifest), true);
    assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(location)]);
});

test('TC-RVP-051: simulated Windows unsafe or unprovable privacy never authorizes warm or cold state', async t => {
    const variants = {
        denied: { status: 1, signal: null, stdout: '', stderr: '' },
        unprovable: { status: 0, signal: null, stdout: '', stderr: '' },
        absent: null,
        malformed: {},
        error: { ...privateProbe(), error: new Error('synthetic-private-marker') },
        timeout: { ...privateProbe(), error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) },
        signal: { ...privateProbe(), signal: 'SIGTERM' },
        status: { ...privateProbe(), status: 2 },
        stdout: { ...privateProbe(), stdout: 'review-cache-private-v1\n' },
        stderr: { ...privateProbe(), stderr: 'unexpected-private-output' },
        overflow: { ...privateProbe(), error: Object.assign(new Error('overflow'), { code: 'ENOBUFS' }) },
        thrown: () => { throw new Error('probe-unavailable'); },
    };
    for (const [kind, response] of Object.entries(variants)) await t.test(kind, async t => {
        // Given reachable native denials, unreadable facts and failed/uncertain subprocess outcomes.
        const { cacheDir, root } = fixture(t), published = publication();
        const location = seedCache(cacheDir, published), record = fs.readFileSync(path.join(location, 'manifest.json'));
        const owner = windowsProcess(typeof response === 'function' ? response : () => response);
        const coldDir = path.join(root, 'cold-cache');
        fs.mkdirSync(coldDir, { mode: 0o700 });
        fs.writeFileSync(path.join(coldDir, 'owner.txt'), 'existing-owner');
        let downloads = 0, validations = 0;
        // When existing warm and cold paths meet the same privacy boundary.
        assert.throws(() => owner.safeCacheDirectory(cacheDir), kind === 'thrown' ? /probe-unavailable/ : /cache-unsafe/);
        const cached = owner.readCache(cacheDir, published.release, 'linux', 'x64');
        const acquired = await owner.acquireNative({ policy: allow(coldDir), release: published.release, platform: 'linux', arch: 'x64', download: async () => { downloads++; return published.archive; }, validate: async () => { validations++; return true; } });
        const freshDir = path.join(root, 'fresh-cache');
        const fresh = await owner.acquireNative({ policy: allow(freshDir), release: published.release, platform: 'linux', arch: 'x64', download: async () => { downloads++; return published.archive; }, validate: async () => { validations++; return true; } });
        // Then no selection, download, lock, stage, manifest or failure publication gains authority.
        assert.equal(cached, null);
        assert.equal(acquired.reason, 'acquisition-unavailable');
        assert.equal(fresh.reason, 'acquisition-unavailable');
        assert.equal(downloads, 0);
        assert.equal(validations, 0);
        assert.deepEqual(fs.readdirSync(coldDir), ['owner.txt']);
        assert.deepEqual(fs.readdirSync(freshDir), []);
        assert.equal(fs.readFileSync(path.join(coldDir, 'owner.txt'), 'utf8'), 'existing-owner');
        assert.equal(fs.readFileSync(path.join(location, 'manifest.json')).equals(record), true);
        assert.equal(fs.readFileSync(path.join(location, published.release.binaryName)).equals(published.binary), true);
        assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(location)]);
        assert.equal(JSON.stringify(acquired).includes('synthetic-private-marker'), false);
    });
});

test('TC-RVP-052: simulated Windows privacy probe uses fixed literal argv and minimal bounded environment', t => {
    // Given a punctuation/Unicode cache pathname and hostile inherited runtime/provider switches.
    const { root, env } = fixture(t), cacheDir = path.join(root, 'cache ; Échange --leading');
    fs.mkdirSync(cacheDir, { mode: 0o700 });
    let observed;
    const owner = windowsProcess((binary, args, settings) => { observed = { binary, args, settings }; return privateProbe(); }, { ...env, SystemRoot: root, windir: root, NODE_OPTIONS: '--require=hostile', NODE_PATH: root, OPENAI_API_KEY: 'synthetic-provider-key', CK_LOCK_PROBE_PATH: 'foreign' });
    // When the native privacy policy is consulted through its bounded Node child.
    assert.equal(owner.safeCacheDirectory(cacheDir), fs.realpathSync.native(cacheDir));
    // Then path data follows -- as separate absolute argv; no shell or inherited code/provider authority exists.
    assert.equal(observed.binary, process.execPath);
    assert.equal(observed.args[0], '-e');
    assert.equal(observed.args[2], '--');
    assert.equal(observed.args.length, 5);
    assert.equal(path.isAbsolute(observed.args[3]), true);
    assert.equal(observed.args[3], path.resolve(__dirname, '../../hooks/lib/startup-install-lock.cjs'));
    assert.equal(observed.args[4], fs.realpathSync.native(cacheDir));
    assert.equal(observed.args[1].includes(cacheDir), false);
    assert.equal(observed.settings.shell, false);
    assert.equal(observed.settings.windowsHide, true);
    assert.equal(observed.settings.timeout, 10000);
    assert.equal(observed.settings.maxBuffer, 1024);
    assert.equal(observed.settings.encoding, 'utf8');
    assert.deepEqual(observed.settings.stdio, ['ignore', 'pipe', 'pipe']);
    assert.deepEqual(observed.settings.env, { SystemRoot: root, windir: root });
    // The captured fixed child source must call the existing policy and emit its marker only for strict true.
    for (const proof of [{ ok: true }, { ok: false }, { ok: 1 }, null]) {
        let stdout = '', received;
        const childProcess = { argv: [process.execPath, observed.args[3], observed.args[4]], stdout: { write: text => { stdout += text; } }, exitCode: undefined };
        const requireHelper = helper => {
            assert.equal(helper, observed.args[3]);
            return { DEFAULT_SEAMS: { probeChildPrivacy: (...args) => { received = args; return proof; } } };
        };
        new Function('process', 'require', observed.args[1])(childProcess, requireHelper);
        assert.deepEqual(received, [observed.args[4], 'win32']);
        assert.equal(stdout, proof && proof.ok === true ? 'review-cache-private-v1' : '');
        assert.equal(childProcess.exitCode, proof && proof.ok === true ? undefined : 1);
    }
});

test('TC-RVP-033: simulated Windows privacy proof cannot outlive abort or absolute deadline', t => {
    // Given a private cache and synchronous probe seams that can consume time or deliver cancellation.
    const { cacheDir } = fixture(t);
    fs.mkdirSync(cacheDir, { mode: 0o700 });
    let calls = 0;
    const owner = windowsProcess(() => { calls++; return privateProbe(); });
    const aborted = new AbortController(); aborted.abort();
    // When the request is already aborted, expired or has an unprovable budget.
    for (const limits of [{ signal: aborted.signal }, { deadline: Date.now() - 1 }, { deadline: NaN }, { deadline: Infinity }, { timeoutMs: 0 }, { timeoutMs: null }, { timeoutMs: 120001 }]) {
        // Then no native proof is started, and warm trust remains unavailable.
        assert.throws(() => owner.safeCacheDirectory(cacheDir, false, limits));
    }
    assert.equal(calls, 0);
    const controller = new AbortController();
    const aborting = windowsProcess(() => { controller.abort(); return privateProbe(); });
    assert.throws(() => aborting.safeCacheDirectory(cacheDir, false, { signal: controller.signal }), /cache-unsafe/);
    let capturedTimeout;
    let deadline;
    const expiring = windowsProcess((binary, args, settings) => {
        capturedTimeout = settings.timeout;
        // Simulated synchronous native work consumes its absolute budget; event-loop timers cannot run here.
        while (Date.now() <= deadline) {}
        return privateProbe();
    });
    deadline = Date.now() + 30;
    assert.throws(() => expiring.safeCacheDirectory(cacheDir, false, { deadline }), /cache-unsafe/);
    assert.equal(capturedTimeout >= 1 && capturedTimeout <= 30, true);
    const bounded = windowsProcess((binary, args, settings) => { capturedTimeout = settings.timeout; return privateProbe(); });
    assert.equal(bounded.safeCacheDirectory(cacheDir, false, { timeoutMs: 7 }), fs.realpathSync.native(cacheDir));
    assert.equal(capturedTimeout, 7);
});

test('TC-RVP-052: actual fixed privacy child preserves argv and fails closed on denied or missing helper', async t => {
    // Given the actual captured fixed child source and isolated policy fixtures, without native PowerShell.
    const { root, env, cacheDir } = fixture(t);
    fs.mkdirSync(cacheDir, { mode: 0o700 });
    let source;
    windowsProcess((binary, args) => { source = args[1]; return privateProbe(); }).safeCacheDirectory(cacheDir);
    const permitted = path.join(root, 'helper ; Échange.cjs'), denied = path.join(root, 'denied.cjs'), missing = path.join(root, 'missing.cjs');
    fs.writeFileSync(permitted, "module.exports={DEFAULT_SEAMS:{probeChildPrivacy:(directory,platform)=>({ok:require('node:fs').statSync(directory).isDirectory()&&platform==='win32'})}};");
    fs.writeFileSync(denied, 'module.exports={DEFAULT_SEAMS:{probeChildPrivacy:()=>({ok:false})}};');
    const childEnv = { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(SystemRoot|WINDIR)$/i.test(key))) };
    // When trusted process.execPath evaluates the fixed source with absolute literal helper/cache arguments.
    const allowed = await runNative(process.execPath, ['-e', source, '--', permitted, cacheDir], { cwd: root, env: childEnv, timeoutMs: 3000, maxOutputBytes: 1024 });
    const refused = await runNative(process.execPath, ['-e', source, '--', denied, cacheDir], { cwd: root, env: childEnv, timeoutMs: 3000, maxOutputBytes: 1024 });
    const unavailable = await runNative(process.execPath, ['-e', source, '--', missing, cacheDir], { cwd: root, env: childEnv, timeoutMs: 3000, maxOutputBytes: 8192 });
    // Then only strict permitted proof emits the exact marker, while denial/helper absence cannot imply trust.
    assert.equal(allowed.ok, true);
    assert.equal(allowed.stdout, 'review-cache-private-v1');
    for (const result of [refused, unavailable]) {
        assert.equal(result.ok, false);
        assert.equal(result.reason, 'process-failed');
        assert.equal(result.code, 1);
        assert.equal(result.stdout, '');
    }
});

test('TC-RVP-077: simulated Windows cold and contender cache checks retain one active privacy budget', async t => {
    // Given a permitted isolated acquisition and an independently bounded unknown-lock contender.
    for (const contender of [false, true]) await t.test(contender ? 'contender' : 'publisher', async t => {
        const { cacheDir } = fixture(t), published = publication(), timeouts = [];
        fs.mkdirSync(cacheDir, { mode: 0o700 });
        const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
        if (contender) fs.writeFileSync(location + '.lock', 'unknown-owner');
        const owner = windowsProcess((binary, args, settings) => { timeouts.push(settings.timeout); return privateProbe(); });
        const limits = { timeoutMs: 7, deadline: Date.now() + 10000, signal: new AbortController().signal, lockWaitMs: 1 };
        let downloads = 0;
        // When initial/create, warm miss and postlock/contender checks invoke the shared privacy owner.
        const result = await owner.acquireNative({ policy: allow(cacheDir), release: published.release, platform: 'linux', arch: 'x64', limits, download: async () => { downloads++; return published.archive; }, validate: async () => true });
        // Then every probe receives the same tighter bound; no default10s fallback hides a lost limits carrier.
        assert.equal(timeouts.length >= 3, true);
        assert.equal(timeouts.every(timeout => timeout === 7), true);
        if (contender) {
            assert.equal(result.reason, 'acquisition-busy');
            assert.equal(downloads, 0);
            assert.equal(fs.readFileSync(location + '.lock', 'utf8'), 'unknown-owner');
            assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(location) + '.lock']);
        } else {
            assert.equal(result.ok, true);
            assert.equal(downloads, 1);
            assert.equal(fs.readFileSync(result.binary).equals(published.binary), true);
            assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(location)]);
        }
    });
});

test('TC-RVP-052: exact platform/header/hash identity excludes wrappers and tampered candidates', t => {
    // Given six supported native headers and a private executable fixture.
    const { root } = fixture(t);
    for (const platform of ['darwin', 'linux', 'win32']) for (const arch of ['x64', 'arm64']) {
        // When testing native identity against both architectures.
        assert.equal(nativeHeaderMatches(nativeHeader(platform, arch), platform, arch), true);
        assert.equal(nativeHeaderMatches(nativeHeader(platform, arch), platform, arch === 'x64' ? 'arm64' : 'x64'), false);
    }
    const published = publication(), file = path.join(root, 'opencodereview');
    fs.writeFileSync(file, published.binary, { mode: 0o700 });
    // Then exact pin is accepted, but altered bytes and a shell wrapper never become executable candidates.
    assert.equal(readPinnedBinary(file, published.release, 'linux', 'x64').hash, published.release.binarySha256);
    const altered = Buffer.from(published.binary); altered[200] = 1; fs.writeFileSync(file, altered);
    assert.equal(readPinnedBinary(file, published.release, 'linux', 'x64'), null);
    const wrapper = Buffer.from('#!/bin/sh\necho fake\n'); fs.writeFileSync(file, wrapper);
    assert.equal(readPinnedBinary(file, { ...published.release, binarySha256: sha(wrapper), binarySize: wrapper.length }, 'linux', 'x64'), null);
    const windowsCandidates = findNativeCandidates({ Path: 'relative;C:\\Tools With Spaces;\\\\server\\tools' }, 'win32');
    assert.equal(windowsCandidates.length, 8);
    assert.equal(windowsCandidates.every(candidate => /\.(exe|com)$/.test(candidate)), true);
    assert.equal(windowsCandidates.some(candidate => candidate.includes('relative') || candidate.endsWith('.cmd')), false);
    assert.deepEqual(findNativeCandidates({ PATH: 'relative:/absolute' }, 'linux'), ['/absolute/opencodereview', '/absolute/ocr']);
});

test('TC-RVP-052: actual child argv preserves punctuation, Unicode and leading option names', async t => {
    // Given an absolute Node executable and no inherited provider/PATH configuration.
    const { root, env } = fixture(t), values = ['Item with spaces', 'Échange', '; literal', '--leading-name'];
    // When the process boundary receives literal argv without a shell.
    const result = await runNative(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '--', ...values], { cwd: root, env });
    // Then all names remain indivisible arguments and no shell side effects appear.
    assert.equal(result.ok, true); assert.deepEqual(JSON.parse(result.stdout), values);
    assert.deepEqual(fs.readdirSync(root), []);
});

test('TC-RVP-013: failed, noisy and hanging children return bounded redacted fallback reasons', async t => {
    // Given actual child programs that fail, exceed output limits, or never finish.
    const { root, env } = fixture(t);
    const options = { cwd: root, env, timeoutMs: 1000, maxOutputBytes: 128 };
    // When each failure reaches the process boundary.
    const failed = await runNative(process.execPath, ['-e', 'console.error("synthetic-private-marker");process.exit(3)'], options);
    const noisy = await runNative(process.execPath, ['-e', 'console.log("x".repeat(10000))'], options);
    const hanging = await runNative(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ...options, timeoutMs: 50 });
    // Then failure text cannot expose stderr or unbounded output.
    assert.equal(failed.reason, 'process-failed'); assert.equal(noisy.reason, 'process-output-limit'); assert.equal(hanging.reason, 'process-timeout');
    for (const result of [failed, noisy, hanging]) { assert.equal(result.ok, false); assert.equal(result.stdout, ''); assert.equal(JSON.stringify(result).includes('synthetic-private-marker'), false); }
});

test('TC-RVP-023: publication integrity and narrow USTAR membership prevent unsafe extraction', () => {
    // Given a fixed synthetic native publication with a matching SRI/digest.
    const published = publication();
    // When unpacking valid bytes, only the fixed binary is returned.
    assert.deepEqual(unpackPublication(published.archive, published.release), published.binary);
    // Then corruption, foreign members, links, extensions and duplicate paths are rejected even if archive SRI is repinned.
    const corrupt = Buffer.from(published.archive); corrupt[20] ^= 1;
    assert.throws(() => unpackPublication(corrupt, published.release), /publication-integrity/);
    assert.throws(() => unpackPublication(published.archive, { ...published.release, binarySha256: '0'.repeat(64) }), /binary-integrity/);
    for (const transform of [
        members => [{ ...members[0], name: '../../escape' }, members[1]],
        members => [{ ...members[0], type: '2' }, members[1]],
        members => [{ ...members[0], type: 'x' }, members[1]],
        members => [members[0], members[0], members[1]],
        members => [members[0]],
        members => [members[0], { ...members[1], body: Buffer.from('{"name":"foreign","version":"1.2.3"}') }],
    ]) {
        const invalid = publication(transform);
        assert.throws(() => unpackPublication(invalid.archive, invalid.release));
    }
    assert.throws(() => unpackPublication(published.archive, published.release, { maxUnpackedBytes: 64 }));
});

test('TC-RVP-022: permission denial blocks all acquisition/cache writes and URL escape is refused', async t => {
    // Given each independent machine denial and an absent cache.
    const { cacheDir } = fixture(t), published = publication();
    let downloads = 0;
    for (const denied of [{ execution: false }, { acquisition: 'never' }, { network: false }, { status: 'invalid' }]) {
        // When automatic acquisition is requested.
        const result = await acquire({ ...allow(cacheDir), ...denied }, published, { download: async () => { downloads++; return published.archive; } });
        // Then neither network nor cache creation occurs.
        assert.equal(result.ok, false); assert.equal(downloads, 0); assert.equal(fs.existsSync(cacheDir), false);
    }
    for (const tarball of ['http://registry.npmjs.org/file', 'https://foreign.example/file', 'https://registry.npmjs.org/file?token=secret']) {
        await assert.rejects(downloadPublication({ tarball }), /download-unavailable/);
    }
});

test('TC-RVP-024: isolated atomic publication is reused only with the original immutable binary pin', async t => {
    // Given a private cache and an unrelated adopter dependency file.
    const { root, cacheDir } = fixture(t), published = publication();
    const dependencyFile = path.join(root, 'package-lock.json'); fs.writeFileSync(dependencyFile, 'unchanged');
    // When acquisition validates identity/version before publication and warm reuse follows.
    const result = await acquire(allow(cacheDir), published);
    // Then publication contains only the fixed executable/record and adopter files remain unchanged.
    assert.equal(result.ok, true); assert.equal(fs.readFileSync(dependencyFile, 'utf8'), 'unchanged');
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
    assert.deepEqual(fs.readdirSync(location).sort(), ['manifest.json', 'opencodereview']);
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64').hash, published.release.binarySha256);
    const altered = Buffer.from(published.binary); altered[220] = 1; fs.writeFileSync(result.binary, altered);
    const record = JSON.parse(fs.readFileSync(path.join(location, 'manifest.json'), 'utf8')); record.binarySha256 = sha(altered);
    fs.writeFileSync(path.join(location, 'manifest.json'), JSON.stringify(record));
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64'), null);
    assert.equal((await acquire(allow(cacheDir), published)).reason, 'cache-invalid');
    assert.equal(fs.readFileSync(result.binary).equals(altered), true);
});

test('TC-RVP-033: concurrent owners share one publication and never reclaim an unknown lock', async t => {
    // Given two callers synchronized on the download promise, rather than assertion sleeps.
    const { cacheDir } = fixture(t), published = publication();
    let completeDownload, downloads = 0;
    const download = () => { downloads++; return new Promise(resolve => { completeDownload = resolve; }); };
    // When the first owns acquisition and the second waits for its publication signal.
    const first = acquire(allow(cacheDir), published, { download });
    const second = acquire(allow(cacheDir), published, { download });
    completeDownload(published.archive);
    const results = await Promise.all([first, second]);
    // Then a single download serves both and owner lock is released.
    assert.equal(downloads, 1); assert.equal(results.every(result => result.ok), true);
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
    assert.equal(fs.existsSync(location + '.lock'), false);
    fs.rmSync(location, { recursive: true });
    fs.writeFileSync(location + '.lock', 'unknown-owner');
    fs.utimesSync(location + '.lock', new Date(0), new Date(0));
    assert.equal((await acquire(allow(cacheDir), published, { limits: { lockWaitMs: 1 } })).reason, 'acquisition-busy');
    assert.equal(fs.readFileSync(location + '.lock', 'utf8'), 'unknown-owner');
});

test('TC-RVP-077: interrupted acquisition cleans only owned staging and cooldown bounds retries', async t => {
    // Given an unrelated earlier staging directory and a failing current download.
    const { cacheDir } = fixture(t), published = publication();
    safeCacheDirectory(cacheDir, true);
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), unknownStage = location + '.staging-earlier';
    fs.mkdirSync(unknownStage); fs.writeFileSync(path.join(unknownStage, 'owner.txt'), 'earlier-owner');
    let downloads = 0;
    const download = async () => { downloads++; throw new Error('synthetic-private-marker'); };
    // When failure is followed immediately by another attempt.
    const failed = await acquire(allow(cacheDir), published, { download });
    const repeated = await acquire(allow(cacheDir), published, { download });
    // Then only the current lock/stage are removed, unknown data survives, and retry does no network work.
    assert.equal(failed.reason, 'acquisition-unavailable'); assert.equal(repeated.reason, 'acquisition-cooldown'); assert.equal(downloads, 1);
    assert.equal(fs.existsSync(location), false); assert.equal(fs.existsSync(location + '.lock'), false);
    assert.equal(fs.readFileSync(path.join(unknownStage, 'owner.txt'), 'utf8'), 'earlier-owner');
    assert.deepEqual(fs.readdirSync(cacheDir).sort(), [path.basename(location) + '.failed.json', path.basename(unknownStage)].sort());
    assert.equal(JSON.stringify(failed).includes('synthetic-private-marker'), false);
});

test('TC-RVP-077: loss of current lock ownership prevents publication and preserves the replacement lock', async t => {
    // Given an acquisition paused at its actual download seam under an owned lock.
    const { cacheDir } = fixture(t), published = publication();
    let completeDownload;
    const active = acquire(allow(cacheDir), published, { download: () => new Promise(resolve => { completeDownload = resolve; }) });
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
    const original = fs.readFileSync(lock, 'utf8');
    const foreign = JSON.stringify({ token: 'replacement-owner-token', pid: process.pid });
    assert.notEqual(JSON.parse(original).token, JSON.parse(foreign).token);
    // When another owner replaces the lock before the first download completes.
    fs.writeFileSync(lock, foreign);
    completeDownload(published.archive);
    const result = await active;
    // Then uncertain ownership cannot become ready or delete the replacement owner's state.
    assert.equal(result.ok, false);
    assert.equal(fs.existsSync(location), false);
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64'), null);
    assert.equal(fs.existsSync(lock), true, 'replacement owner lock remains present');
    assert.equal(fs.readFileSync(lock, 'utf8'), foreign);
    assert.equal(fs.readdirSync(cacheDir).some(name => name.includes('.staging-')), false);
});

test('TC-RVP-077: lock replacement during version validation preserves foreign lock and cooldown state', async t => {
    // Given a compatible publication paused at the actual validation continuation.
    const { cacheDir } = fixture(t), published = publication();
    let completeValidation, enteredValidation;
    const validationStarted = new Promise(resolve => { enteredValidation = resolve; });
    const active = acquire(allow(cacheDir), published, {
        validate: () => {
            enteredValidation();
            return new Promise(resolve => { completeValidation = resolve; });
        },
    });
    await validationStarted;
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
    const foreign = JSON.stringify({ token: 'validation-replacement-owner', pid: process.pid });
    const cooldown = JSON.stringify({ schemaVersion: 1, at: Date.now() - 60000, owner: 'foreign' });
    // When ownership changes before the delayed validator reports success.
    fs.writeFileSync(lock, foreign);
    fs.writeFileSync(location + '.failed.json', cooldown);
    completeValidation(true);
    const result = await active;
    // Then compatibility grants no publication authority and no foreign state is rewritten.
    assert.equal(result.ok, false);
    assert.equal(fs.existsSync(location), false);
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64'), null);
    assert.equal(fs.readFileSync(lock, 'utf8'), foreign);
    assert.equal(fs.readFileSync(location + '.failed.json', 'utf8'), cooldown);
    assert.deepEqual(fs.readdirSync(cacheDir).sort(), [path.basename(lock), path.basename(location) + '.failed.json'].sort());
});

test('TC-RVP-077: rejected download and validation continuations cannot overwrite a replacement owner cooldown or cache', async t => {
    for (const phase of ['download', 'validate']) await t.test(phase, async t => {
        // Given acquisition paused at either fallible awaited continuation.
        const { cacheDir } = fixture(t), published = publication();
        let rejectContinuation, entered;
        const started = new Promise(resolve => { entered = resolve; });
        const pause = () => {
            entered();
            return new Promise((resolve, reject) => { rejectContinuation = reject; });
        };
        const active = acquire(allow(cacheDir), published, { [phase]: pause });
        await started;
        const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
        const foreign = JSON.stringify({ token: 'rejection-replacement-owner', pid: process.pid });
        const cooldown = JSON.stringify({ schemaVersion: 1, at: Date.now() - 60000, owner: 'foreign' });
        fs.writeFileSync(lock, foreign);
        fs.writeFileSync(location + '.failed.json', cooldown);
        fs.mkdirSync(location);
        fs.writeFileSync(path.join(location, 'owner.txt'), 'foreign-cache');
        // When the earlier owner's continuation rejects after replacement state exists.
        rejectContinuation(new Error('synthetic-private-marker'));
        const result = await active;
        // Then fallback cleans only the earlier staging and preserves every foreign authoritative artifact.
        assert.equal(result.reason, 'acquisition-unavailable');
        for (const file of [lock, location + '.failed.json', path.join(location, 'owner.txt')]) {
            assert.equal(fs.existsSync(file), true, 'replacement owner artifact remains present');
        }
        assert.equal(fs.readFileSync(lock, 'utf8'), foreign);
        assert.equal(fs.readFileSync(location + '.failed.json', 'utf8'), cooldown);
        assert.equal(fs.readFileSync(path.join(location, 'owner.txt'), 'utf8'), 'foreign-cache');
        assert.deepEqual(fs.readdirSync(cacheDir).sort(), [path.basename(location), path.basename(lock), path.basename(location) + '.failed.json'].sort());
        assert.equal(JSON.stringify(result).includes('synthetic-private-marker'), false);
    });
});

test('TC-RVP-077: missing, invalid, nonregular, oversized, linked and unreadable current locks refuse resumed authority', async t => {
    for (const kind of ['missing', 'invalid', 'directory', 'oversized', 'symlink', 'unreadable']) await t.test(kind, async t => {
        // Given an acquisition paused at download and a same-token lock whose current proof becomes uncertain.
        const { root, cacheDir } = fixture(t), published = publication();
        let completeDownload, validations = 0;
        const active = acquire(allow(cacheDir), published, {
            download: () => new Promise(resolve => { completeDownload = resolve; }),
            validate: async () => { validations++; return true; },
        });
        const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
        const original = fs.readFileSync(lock, 'utf8'), target = path.join(root, 'lock-target');
        const open = fs.openSync;
        let linked = false;
        try {
            // When a supported filesystem uncertainty replaces the current proof before bytes arrive.
            if (kind === 'missing') fs.unlinkSync(lock);
            if (kind === 'invalid') fs.writeFileSync(lock, '{unreadable-json');
            if (kind === 'directory') { fs.unlinkSync(lock); fs.mkdirSync(lock); fs.writeFileSync(path.join(lock, 'owner.txt'), 'foreign-directory'); }
            if (kind === 'oversized') fs.writeFileSync(lock, original + ' '.repeat(4097));
            if (kind === 'symlink') {
                fs.writeFileSync(target, original);
                fs.unlinkSync(lock);
                try { fs.symlinkSync(target, lock, 'file'); linked = true; }
                catch (error) {
                    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
                    t.diagnostic('Windows denied fixture file symlink creation; this seam is not proven on this host.');
                    t.skip('Windows file symlink permission unavailable');
                }
            }
            if (kind === 'unreadable') fs.openSync = (file, ...args) => {
                if (file === lock) throw Object.assign(new Error('fixture access denied'), { code: 'EACCES' });
                return open(file, ...args);
            };
            completeDownload(published.archive);
            const result = await active;
            fs.openSync = open;
            // Then no validator, publication or cooldown can be authorized by an uncertain lock.
            assert.equal(result.ok, false);
            assert.equal(validations, 0);
            assert.equal(fs.existsSync(location), false);
            assert.equal(fs.existsSync(location + '.failed.json'), false);
            assert.equal(fs.readdirSync(cacheDir).some(name => name.includes('.staging-')), false);
            if (kind === 'missing' || (kind === 'symlink' && !linked)) assert.equal(fs.existsSync(lock), false);
            if (kind === 'invalid') assert.equal(fs.readFileSync(lock, 'utf8'), '{unreadable-json');
            if (kind === 'directory') assert.equal(fs.readFileSync(path.join(lock, 'owner.txt'), 'utf8'), 'foreign-directory');
            if (kind === 'oversized') assert.equal(fs.readFileSync(lock, 'utf8'), original + ' '.repeat(4097));
            if (kind === 'unreadable') assert.equal(fs.readFileSync(lock, 'utf8'), original);
            if (linked) {
                assert.equal(fs.lstatSync(lock).isSymbolicLink(), true);
                assert.equal(fs.readlinkSync(lock), target);
                assert.equal(fs.readFileSync(target, 'utf8'), original);
            }
        } finally {
            fs.openSync = open;
            completeDownload(published.archive);
            await active;
        }
    });
});

test('TC-RVP-077: a bounded regular same-token lock retains acquisition and cleanup authority', async t => {
    // Given the actual owner lock padded to the inclusive record ceiling during paused download.
    const { cacheDir } = fixture(t), published = publication();
    let completeDownload;
    const active = acquire(allow(cacheDir), published, { download: () => new Promise(resolve => { completeDownload = resolve; }) });
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
    const original = fs.readFileSync(lock, 'utf8');
    fs.writeFileSync(lock, original.padEnd(4096, ' '));
    // When the valid current owner completes compatible acquisition.
    completeDownload(published.archive);
    const result = await active;
    // Then the regular same-token boundary still publishes a pinned tool and releases only its own lock.
    assert.equal(result.ok, true);
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64').hash, published.release.binarySha256);
    assert.equal(fs.existsSync(lock), false);
    assert.equal(fs.existsSync(location + '.failed.json'), false);
    assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(location)]);
});

test('TC-RVP-033: current ownership is rechecked between ready manifest emission and publication', async t => {
    // Given an acquisition whose manifest is written while ownership still belongs to it.
    const { cacheDir } = fixture(t), published = publication();
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock';
    const foreign = JSON.stringify({ token: 'publication-replacement-owner', pid: process.pid });
    const write = fs.writeFileSync;
    let replaced = false;
    fs.writeFileSync = (file, ...args) => {
        const result = write(file, ...args);
        if (typeof file === 'string' && path.basename(file) === 'manifest.json') {
            replaced = true;
            write(lock, foreign);
        }
        return result;
    };
    try {
        // When another actor replaces the lock after manifest emission but before authoritative rename.
        const result = await acquire(allow(cacheDir), published);
        // Then the staged manifest cannot make assistance ready and the replacement remains untouched.
        assert.equal(replaced, true);
        assert.equal(result.ok, false);
        assert.equal(fs.existsSync(location), false);
        assert.equal(fs.existsSync(location + '.failed.json'), false);
        assert.equal(fs.readFileSync(lock, 'utf8'), foreign);
        assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(lock)]);
    } finally { fs.writeFileSync = write; }
});

test('TC-RVP-077: ownership loss during cooldown staging cannot replace a foreign failure record', async t => {
    // Given an owned failed acquisition about to stage its bounded cooldown record.
    const { cacheDir } = fixture(t), published = publication();
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64'), lock = location + '.lock', failed = location + '.failed.json';
    const foreign = JSON.stringify({ token: 'cooldown-replacement-owner', pid: process.pid });
    const cooldown = JSON.stringify({ schemaVersion: 1, at: Date.now() - 60000, owner: 'foreign' });
    const open = fs.openSync, write = fs.writeFileSync;
    let cooldownDescriptor, replaced = false;
    fs.openSync = (file, ...args) => {
        const descriptor = open(file, ...args);
        if (typeof file === 'string' && file.startsWith(failed + '.')) cooldownDescriptor = descriptor;
        return descriptor;
    };
    fs.writeFileSync = (file, ...args) => {
        const result = write(file, ...args);
        if (file === cooldownDescriptor) {
            replaced = true;
            write(lock, foreign);
            write(failed, cooldown);
        }
        return result;
    };
    try {
        // When a foreign owner takes over after cooldown staging and before failure-record publication.
        const result = await acquire(allow(cacheDir), published, { download: async () => { throw new Error('download-failed'); } });
        // Then the earlier temporary is removed while the foreign lock and cooldown remain exact.
        assert.equal(replaced, true);
        assert.equal(result.reason, 'acquisition-unavailable');
        assert.equal(fs.existsSync(location), false);
        assert.equal(fs.readFileSync(lock, 'utf8'), foreign);
        assert.equal(fs.readFileSync(failed, 'utf8'), cooldown);
        assert.deepEqual(fs.readdirSync(cacheDir).sort(), [path.basename(lock), path.basename(failed)].sort());
    } finally { fs.openSync = open; fs.writeFileSync = write; }
});

test('TC-RVP-033: cancellation during delayed version validation cannot publish late readiness', async t => {
    // Given a completed download whose version validation has begun but remains unresolved.
    const { cacheDir } = fixture(t), published = publication(), controller = new AbortController();
    let completeValidation, enteredValidation, validations = 0;
    const validationStarted = new Promise(resolve => { enteredValidation = resolve; });
    const active = acquire(allow(cacheDir), published, {
        limits: { signal: controller.signal },
        validate: () => {
            validations++;
            enteredValidation();
            return new Promise(resolve => { completeValidation = resolve; });
        },
    });
    await validationStarted;
    // When the request is cancelled and the delayed validator subsequently reports compatibility.
    controller.abort();
    completeValidation(true);
    const result = await active;
    // Then cancellation remains authoritative and the late result cannot create a usable publication.
    assert.equal(validations, 1);
    assert.equal(result.ok, false);
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
    assert.equal(fs.existsSync(location), false);
    assert.equal(readCache(cacheDir, published.release, 'linux', 'x64'), null);
    assert.equal(fs.existsSync(location + '.lock'), false);
    assert.equal(fs.readdirSync(cacheDir).some(name => name.includes('.staging-')), false);
});

test('TC-RVP-013: cancellation destroys actual child work and cannot publish a late download', async t => {
    // Given an external abort and a controlled late download.
    const { root, env, cacheDir } = fixture(t), published = publication(), controller = new AbortController();
    const childController = new AbortController(), marker = path.join(root, 'late-child-write');
    let closed;
    const spawnObserved = (...args) => {
        const processChild = spawn(...args);
        closed = new Promise(resolve => processChild.once('close', resolve));
        processChild.stdout.once('data', () => childController.abort());
        return processChild;
    };
    const child = await runNative(process.execPath, ['-e', 'console.log("ready");setTimeout(()=>require("fs").writeFileSync(process.argv[1],"late"),1000);setInterval(()=>{},1000)', marker], { cwd: root, env, timeoutMs: 1000, signal: childController.signal, spawnImpl: spawnObserved });
    await closed;
    assert.equal(child.reason, 'process-timeout');
    assert.equal(fs.existsSync(marker), false);
    let completeDownload, validations = 0;
    const active = acquire(allow(cacheDir), published, { limits: { signal: controller.signal }, download: () => new Promise(resolve => { completeDownload = resolve; }), validate: async () => { validations++; return true; } });
    // When timeout arrives before bytes and the injected transport finishes late.
    controller.abort(); completeDownload(published.archive);
    const result = await active;
    // Then neither version execution nor atomic publication is allowed after cancellation.
    assert.equal(result.ok, false); assert.equal(validations, 0);
    const location = cacheLocation(cacheDir, published.release, 'linux', 'x64');
    assert.equal(fs.existsSync(location), false); assert.equal(fs.existsSync(location + '.lock'), false);
});

test('TC-RVP-051: unsafe cache permissions cannot become machine authority', t => {
    // Given a private fixture whose POSIX cache is accidentally public.
    const { cacheDir } = fixture(t);
    if (process.platform === 'win32') { t.skip('POSIX mode boundary; Windows native ACL verification is not asserted'); return; }
    fs.mkdirSync(cacheDir, { mode: 0o777 }); fs.chmodSync(cacheDir, 0o777);
    // When cache reuse/acquisition checks its machine boundary.
    // Then the existing unsafe directory is rejected rather than silently chmodded.
    assert.throws(() => safeCacheDirectory(cacheDir, true), /cache-unsafe/);
    assert.equal(fs.statSync(cacheDir).mode & 0o777, 0o777);
});
