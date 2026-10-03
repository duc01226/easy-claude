'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const zlib = require('node:zlib');
const process = require('node:process');
const { spawn, spawnSync } = require('node:child_process');

const DEFAULT_LIMITS = Object.freeze({ timeoutMs: 30000, maxOutputBytes: 2 * 1024 * 1024, maxArchiveBytes: 80 * 1024 * 1024, maxUnpackedBytes: 120 * 1024 * 1024, lockWaitMs: 5000, failureCooldownMs: 30000 });
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const CACHE_PRIVACY_MARKER = 'review-cache-private-v1';
const CACHE_PRIVACY_SOURCE = "const [helper,directory]=process.argv.slice(1);const proof=require(helper).DEFAULT_SEAMS.probeChildPrivacy(directory,'win32');if(proof&&proof.ok===true)process.stdout.write('review-cache-private-v1');else process.exitCode=1;";

function finiteLimit(value, fallback, maximum) {
    if (value === undefined) return fallback;
    if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error('invalid-budget');
    return value;
}

/** The process result exposes fixed reasons only; child stderr can contain project secrets. */
function runNative(binary, args, { cwd, env = process.env, timeoutMs, maxOutputBytes, signal, spawnImpl = spawn } = {}) {
    return new Promise(resolve => {
        let child, timer, done = false, bytes = 0;
        const chunks = [];
        const finish = (ok, reason, code = null) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (signal) signal.removeEventListener('abort', aborted);
            if (!ok && child) { try { child.kill('SIGKILL'); } catch {} }
            resolve({ ok, reason, code, stdout: ok ? Buffer.concat(chunks).toString('utf8') : '' });
        };
        const aborted = () => finish(false, 'process-timeout');
        try {
            const budget = finiteLimit(timeoutMs, DEFAULT_LIMITS.timeoutMs, 120000);
            const ceiling = finiteLimit(maxOutputBytes, DEFAULT_LIMITS.maxOutputBytes, 16 * 1024 * 1024);
            if (typeof binary !== 'string' || !path.isAbsolute(binary) || !Array.isArray(args) || args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) return finish(false, 'invalid-process-request');
            if (signal && signal.aborted) return aborted();
            if (signal) signal.addEventListener('abort', aborted, { once: true });
            child = spawnImpl(binary, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
            timer = setTimeout(() => finish(false, 'process-timeout'), budget);
            child.stdout.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > ceiling) return finish(false, 'process-output-limit');
                chunks.push(Buffer.from(chunk));
            });
            child.stderr.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > ceiling) finish(false, 'process-output-limit');
            });
            child.once('error', () => finish(false, 'process-unavailable'));
            child.once('close', code => finish(code === 0, code === 0 ? null : 'process-failed', code));
        } catch {
            finish(false, 'process-unavailable');
        }
    });
}

function nativeHeaderMatches(buffer, platform, arch) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 64 || !['arm64', 'x64'].includes(arch)) return false;
    if (platform === 'darwin') return buffer.subarray(0, 4).toString('hex') === 'cffaedfe' && buffer.readUInt32LE(4) === (arch === 'arm64' ? 0x100000c : 0x1000007);
    if (platform === 'linux') return buffer.subarray(0, 4).toString('hex') === '7f454c46' && buffer[4] === 2 && buffer[5] === 1 && buffer.readUInt16LE(18) === (arch === 'arm64' ? 183 : 62);
    if (platform === 'win32') {
        const offset = buffer.readUInt32LE(60);
        return buffer.subarray(0, 2).toString() === 'MZ' && offset >= 64 && offset + 6 <= buffer.length &&
            buffer.subarray(offset, offset + 4).toString('hex') === '50450000' && buffer.readUInt16LE(offset + 4) === (arch === 'arm64' ? 0xaa64 : 0x8664);
    }
    return false;
}

function readPinnedBinary(binary, release, platform, arch) {
    try {
        if (typeof binary !== 'string' || !path.isAbsolute(binary) || /[\0\r\n]/.test(binary)) return null;
        if (platform === 'win32' && !/\.(exe|com)$/i.test(binary)) return null;
        const stat = fs.lstatSync(binary);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== release.binarySize || stat.size > DEFAULT_LIMITS.maxUnpackedBytes) return null;
        if (platform !== 'win32') fs.accessSync(binary, fs.constants.X_OK);
        const buffer = fs.readFileSync(binary);
        if (hash(buffer) !== release.binarySha256 || !nativeHeaderMatches(buffer, platform, arch)) return null;
        return { binary: fs.realpathSync.native(binary), hash: release.binarySha256 };
    } catch { return null; }
}

function findNativeCandidates(env, platform) {
    const api = platform === 'win32' ? path.win32 : path.posix;
    const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH');
    const extensions = platform === 'win32' ? ['.exe', '.com'] : [''];
    const names = ['opencodereview', 'ocr'];
    const result = [];
    for (const entry of String(env[pathKey] || '').split(api.delimiter)) {
        const dir = entry.trim().replace(/^"(.*)"$/, '$1');
        if (!(platform === 'win32' ? /^(?:[a-z]:[\\/]|\\\\)/i.test(dir) : api.isAbsolute(dir))) continue;
        for (const name of names) for (const extension of extensions) result.push(api.join(dir, name + extension));
        if (result.length >= 128) break;
    }
    return result.slice(0, 128);
}

function verifyPublication(buffer, release) {
    const expected = String(release.integrity || '');
    if (!/^sha512-[A-Za-z0-9+/]+=*$/.test(expected) || expected !== 'sha512-' + crypto.createHash('sha512').update(buffer).digest('base64')) throw new Error('publication-integrity');
}

/** Parse, never broadly extract: this pinned publication consists only of a native binary and manifest. */
function unpackPublication(archive, release, { maxUnpackedBytes, maxArchiveBytes } = {}) {
    if (!Buffer.isBuffer(archive) || archive.length > finiteLimit(maxArchiveBytes, DEFAULT_LIMITS.maxArchiveBytes, DEFAULT_LIMITS.maxArchiveBytes)) throw new Error('archive-limit');
    verifyPublication(archive, release);
    const tar = zlib.gunzipSync(archive, { maxOutputLength: finiteLimit(maxUnpackedBytes, DEFAULT_LIMITS.maxUnpackedBytes, DEFAULT_LIMITS.maxUnpackedBytes) });
    const allowed = new Set(['package/package.json', `package/bin/${release.binaryName}`]);
    const members = new Map();
    let cursor = 0, terminated = false;
    while (cursor + 512 <= tar.length) {
        const header = tar.subarray(cursor, cursor + 512);
        if (header.every(byte => byte === 0)) { terminated = true; break; }
        const text = (start, size) => header.subarray(start, start + size).toString('utf8').split('\0')[0];
        const octal = text(124, 12).trim();
        const checksumText = text(148, 8).trim();
        if (!/^[0-7]+$/.test(octal) || !/^[0-7]+$/.test(checksumText) || text(257, 6) !== 'ustar') throw new Error('archive-format');
        const size = Number.parseInt(octal, 8);
        let checksum = 0;
        for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
        if (checksum !== Number.parseInt(checksumText, 8)) throw new Error('archive-checksum');
        const prefix = text(345, 155);
        const name = (prefix ? prefix + '/' : '') + text(0, 100);
        const type = header[156];
        if (![0, 48].includes(type) || !allowed.has(name) || members.has(name) || cursor + 512 + size > tar.length) throw new Error('archive-members');
        members.set(name, tar.subarray(cursor + 512, cursor + 512 + size));
        cursor += 512 + Math.ceil(size / 512) * 512;
        if (members.size > 2) throw new Error('archive-members');
    }
    if (!terminated || tar.subarray(cursor).some(byte => byte !== 0) || members.size !== 2) throw new Error('archive-incomplete');
    const manifest = JSON.parse(members.get('package/package.json').toString('utf8'));
    if (manifest.name !== release.name || manifest.version !== release.version) throw new Error('publication-manifest');
    const binary = members.get(`package/bin/${release.binaryName}`);
    if (binary.length !== release.binarySize || hash(binary) !== release.binarySha256) throw new Error('binary-integrity');
    return binary;
}

function downloadPublication(release, { timeoutMs, maxArchiveBytes, signal } = {}) {
    return new Promise((resolve, reject) => {
        let request, responseStream, timer;
        const clean = () => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', fail); };
        const fail = () => { clean(); if (responseStream) responseStream.destroy(); if (request) request.destroy(); reject(new Error('download-unavailable')); };
        try {
            const url = new URL(release.tarball);
            if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || url.username || url.password || url.search || url.hash || url.port) return fail();
            if (signal && signal.aborted) return fail();
            if (signal) signal.addEventListener('abort', fail, { once: true });
            const maximum = finiteLimit(maxArchiveBytes, DEFAULT_LIMITS.maxArchiveBytes, DEFAULT_LIMITS.maxArchiveBytes);
            timer = setTimeout(fail, finiteLimit(timeoutMs, DEFAULT_LIMITS.timeoutMs, 120000));
            request = https.get(url, { headers: { 'Accept': 'application/octet-stream' } }, response => {
                responseStream = response;
                if (response.statusCode !== 200) { response.resume(); return fail(); }
                const chunks = [];
                let bytes = 0;
                response.on('data', chunk => {
                    bytes += chunk.length;
                    if (bytes > maximum) { response.destroy(); return fail(); }
                    chunks.push(chunk);
                });
                response.once('end', () => { clean(); resolve(Buffer.concat(chunks)); });
                response.once('error', fail);
            });
            request.once('error', fail);
        } catch { fail(); }
    });
}

/** Reuse the native privacy policy without letting its synchronous probes outlive this request's budget. */
function assertWindowsCachePrivacy(directory, limits) {
    const assertActive = () => {
        if ((limits.signal && limits.signal.aborted) || (limits.deadline !== undefined && (!Number.isFinite(limits.deadline) || Date.now() >= limits.deadline))) throw new Error('cache-unsafe');
    };
    assertActive();
    const budget = Math.min(10000, finiteLimit(limits.timeoutMs, 10000, 120000));
    const timeout = limits.deadline === undefined ? budget : Math.min(budget, Math.floor(limits.deadline - Date.now()));
    if (timeout < 1) throw new Error('cache-unsafe');
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(SystemRoot|WINDIR)$/i.test(key)));
    const helper = path.resolve(__dirname, '../../hooks/lib/startup-install-lock.cjs');
    // Killing the Node probe bounds this wait, not descendant cleanup. Its PowerShell work is read-only.
    const probe = spawnSync(process.execPath, ['-e', CACHE_PRIVACY_SOURCE, '--', helper, directory], {
        env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout, maxBuffer: 1024,
    });
    assertActive();
    if (!probe || probe.error || probe.status !== 0 || probe.signal || probe.stdout !== CACHE_PRIVACY_MARKER || probe.stderr !== '') throw new Error('cache-unsafe');
}

function safeCacheDirectory(directory, create = false, limits = {}) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || directory === path.parse(directory).root) throw new Error('cache-unsafe');
    const missing = [];
    let current = path.resolve(directory);
    while (!fs.existsSync(current)) { missing.push(current); current = path.dirname(current); }
    if (!fs.statSync(current).isDirectory()) throw new Error('cache-unsafe');
    const ancestor = fs.realpathSync.native(current);
    if (create) for (const item of missing.reverse()) fs.mkdirSync(path.join(ancestor, path.relative(current, item)), { mode: 0o700 });
    if (!fs.existsSync(directory)) return null;
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077))) throw new Error('cache-unsafe');
    if (process.getuid && stat.uid !== process.getuid()) throw new Error('cache-unsafe');
    const canonical = fs.realpathSync.native(directory);
    if (process.platform === 'win32') assertWindowsCachePrivacy(canonical, limits);
    return canonical;
}

function cacheLocation(cacheDir, release, platform, arch) {
    return path.join(cacheDir, `ocr-${release.version}-${platform}-${arch}`);
}

function readCache(cacheDir, release, platform, arch, limits = {}) {
    try {
        const base = safeCacheDirectory(cacheDir, false, limits);
        if (!base) return null;
        const location = cacheLocation(base, release, platform, arch);
        const stat = fs.lstatSync(location);
        if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
        const recordFile = path.join(location, 'manifest.json');
        const recordStat = fs.lstatSync(recordFile);
        if (!recordStat.isFile() || recordStat.isSymbolicLink() || recordStat.size > 4096) return null;
        const record = JSON.parse(fs.readFileSync(recordFile, 'utf8'));
        if (record.schemaVersion !== 1 || record.name !== release.name || record.version !== release.version || record.integrity !== release.integrity || record.binarySha256 !== release.binarySha256) return null;
        return readPinnedBinary(path.join(location, release.binaryName), release, platform, arch);
    } catch { return null; }
}

function recentFailure(file) {
    let stat;
    try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw new Error('cache-unsafe');
    const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (previous.schemaVersion !== 1 || !Number.isFinite(previous.at)) throw new Error('cache-unsafe');
    return Date.now() - previous.at < DEFAULT_LIMITS.failureCooldownMs;
}

function ownsCurrentLock(file, token) {
    let descriptor;
    try {
        const expected = fs.lstatSync(file);
        if (!expected.isFile() || expected.isSymbolicLink() || expected.size > 4096) return false;
        descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
        const opened = fs.fstatSync(descriptor);
        if (!opened.isFile() || opened.size > 4096 || opened.dev !== expected.dev || opened.ino !== expected.ino) return false;
        const buffer = Buffer.alloc(4097);
        let length = 0, read;
        while (length < buffer.length && (read = fs.readSync(descriptor, buffer, length, buffer.length - length, length)) > 0) length += read;
        if (length > 4096 || length !== opened.size) return false;
        const current = fs.lstatSync(file);
        if (!current.isFile() || current.isSymbolicLink() || current.dev !== opened.dev || current.ino !== opened.ino || current.size !== length) return false;
        return JSON.parse(buffer.subarray(0, length).toString('utf8')).token === token;
    } catch { return false; }
    finally { if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch {} } }
}

/** A lock is released only by its creator. Unknown/stale locks never earn authority by aging. */
async function acquireNative({ policy, release, platform = process.platform, arch = process.arch, limits = {}, download = downloadPublication, validate } = {}) {
    if (policy.status !== 'ready' || !policy.execution || policy.acquisition !== 'auto' || !policy.network) return { ok: false, reason: policy.reason || 'acquisition-denied' };
    let base, lock, stage, cooldownStage, token, hasLock = false;
    const failure = reason => ({ ok: false, reason });
    const assertActive = () => { if ((limits.signal && limits.signal.aborted) || (limits.deadline && Date.now() >= limits.deadline)) throw new Error('acquisition-timeout'); };
    const assertOwned = () => { assertActive(); if (!ownsCurrentLock(lock, token)) throw new Error('acquisition-ownership-lost'); };
    try {
        assertActive();
        base = safeCacheDirectory(policy.cacheDir, true, limits);
        const location = cacheLocation(base, release, platform, arch);
        lock = location + '.lock';
        const failed = location + '.failed.json';
        const cached = readCache(base, release, platform, arch, limits);
        if (cached) return { ok: true, ...cached };
        if (recentFailure(failed)) return failure('acquisition-cooldown');
        const wait = finiteLimit(limits.lockWaitMs, DEFAULT_LIMITS.lockWaitMs, 30000);
        const deadline = Date.now() + wait;
        token = crypto.randomBytes(16).toString('hex');
        while (!hasLock) {
            assertActive();
            try { fs.writeFileSync(lock, JSON.stringify({ token, pid: process.pid }), { flag: 'wx', mode: 0o600 }); hasLock = true; }
            catch (error) {
                if (error.code !== 'EEXIST') throw error;
                const ready = readCache(base, release, platform, arch, limits);
                if (ready) return { ok: true, ...ready };
                if (Date.now() >= deadline) return failure('acquisition-busy');
                // Poll the published-ready signal; this is bounded acquisition coordination, not assertion retry.
                await new Promise(resolve => setTimeout(resolve, Math.min(50, deadline - Date.now())));
            }
        }
        const ready = readCache(base, release, platform, arch, limits);
        if (ready) return { ok: true, ...ready };
        if (recentFailure(failed)) return failure('acquisition-cooldown');
        // Refuse an invalid existing publication instead of deleting a directory with uncertain ownership.
        if (fs.existsSync(location)) return failure('cache-invalid');
        assertOwned();
        stage = fs.mkdtempSync(location + '.staging-');
        fs.chmodSync(stage, 0o700);
        const archive = await download(release, limits);
        assertOwned();
        const binary = unpackPublication(archive, release, limits);
        const file = path.join(stage, release.binaryName);
        fs.writeFileSync(file, binary, { flag: 'wx', mode: 0o700 });
        const pinned = readPinnedBinary(file, release, platform, arch);
        if (!pinned || !validate) throw new Error('binary-incompatible');
        const compatible = await validate(pinned.binary);
        assertOwned();
        if (!compatible) throw new Error('binary-incompatible');
        fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify({ schemaVersion: 1, name: release.name, version: release.version, integrity: release.integrity, binarySha256: release.binarySha256 }), { flag: 'wx', mode: 0o600 });
        assertOwned();
        fs.renameSync(stage, location);
        stage = null;
        return { ok: true, binary: path.join(location, release.binaryName), hash: release.binarySha256 };
    } catch {
        if (hasLock && base && ownsCurrentLock(lock, token)) {
            try {
                const file = cacheLocation(base, release, platform, arch) + '.failed.json';
                recentFailure(file); // Validate existing owned record before replacing it.
                const temporary = file + '.' + token;
                if (!ownsCurrentLock(lock, token)) throw new Error('acquisition-ownership-lost');
                const descriptor = fs.openSync(temporary, 'wx', 0o600);
                cooldownStage = temporary;
                try { fs.writeFileSync(descriptor, JSON.stringify({ schemaVersion: 1, at: Date.now() })); }
                finally { fs.closeSync(descriptor); }
                if (!ownsCurrentLock(lock, token)) throw new Error('acquisition-ownership-lost');
                fs.renameSync(temporary, file);
                cooldownStage = null;
            } catch {}
        }
        return failure('acquisition-unavailable');
    } finally {
        if (stage) { try { fs.rmSync(stage, { recursive: true, force: true }); } catch {} }
        if (cooldownStage) { try { fs.unlinkSync(cooldownStage); } catch {} }
        if (hasLock) {
            try { if (ownsCurrentLock(lock, token)) fs.unlinkSync(lock); } catch {}
        }
    }
}

module.exports = { DEFAULT_LIMITS, finiteLimit, runNative, nativeHeaderMatches, readPinnedBinary, findNativeCandidates, verifyPublication, unpackPublication, downloadPublication, safeCacheDirectory, readCache, acquireNative, cacheLocation };
