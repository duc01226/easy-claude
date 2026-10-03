#!/usr/bin/env node
'use strict';

// Project preference only. Native readiness/acquisition belongs to review preparation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
// Generated skill copies execute the same canonical framework owners.
const frameworkDir = path.resolve(__dirname, '../../../../.claude');
const { resolveMutationProjectRoot } = require(path.join(frameworkDir, 'scripts/lib/project-root.cjs'));
const { containedPath, rejectWriteLinks, digest } = require(path.join(frameworkDir, 'scripts/lib/review-target.cjs'));
const { validateConfig } = require(path.join(frameworkDir, 'hooks/lib/project-config-schema.cjs'));

const MAX_CONFIG_BYTES = 4 * 1024 * 1024;
const MAX_TOKEN_BYTES = 16 * 1024;
const fail = code => { throw new Error(code); };
const identity = stat => ({ dev: stat.dev, ino: stat.ino, mode: stat.mode, nlink: stat.nlink });

function resolveLocation(rootDir, env) {
    const selected = resolveMutationProjectRoot({ cwd: rootDir || process.cwd(), scriptPath: __filename, env, preferCwdFallback: true });
    const root = fs.realpathSync.native(selected.rootDir);
    const loader = require.resolve(path.join(frameworkDir, 'hooks/lib/project-config-loader.cjs'));
    // Only resolve the full configured path. Do not read/parse project config in this child.
    const script = "const l=require(process.argv[1]);process.stdout.write(JSON.stringify(l.getConfiguredProjectConfigPath()));";
    let configured;
    try {
        configured = JSON.parse(execFileSync(process.execPath, ['-e', script, loader], {
            cwd: root, env: { ...env, CLAUDE_PROJECT_DIR: root }, shell: false, windowsHide: true,
            timeout: 30000, maxBuffer: MAX_TOKEN_BYTES, stdio: ['ignore', 'pipe', 'pipe']
        }).toString('utf8'));
    } catch { fail('config-path-unavailable'); }
    if (typeof configured !== 'string' || !path.isAbsolute(configured)) fail('unsafe-config-path');
    const relative = path.relative(root, configured).split(path.sep).join('/');
    if (relative.length > 1024 || relative.split('/').length > 64) fail('unsafe-config-path');
    let absolute;
    try { absolute = containedPath(root, relative); rejectWriteLinks(root, absolute); }
    catch { fail('unsafe-config-path'); }
    return { root, relative, absolute };
}

function snapshot(location) {
    const { root, absolute, relative } = location;
    try { rejectWriteLinks(root, absolute); containedPath(root, relative); }
    catch { fail('unsafe-config-path'); }
    const parents = [];
    for (let cursor = path.dirname(absolute);; cursor = path.dirname(cursor)) {
        try {
            const stat = fs.lstatSync(cursor);
            if (!stat.isDirectory() || stat.isSymbolicLink()) fail('unsafe-config-path');
            parents.push({ path: path.relative(root, cursor).split(path.sep).join('/'), dev: stat.dev, ino: stat.ino, mode: stat.mode });
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (cursor === root) break;
        if (path.dirname(cursor) === cursor) fail('unsafe-config-path');
    }
    let stat;
    try { stat = fs.lstatSync(absolute); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!stat) return { root, configPath: relative, parents, exists: false, config: null, file: null, hash: null };
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail('unsafe-config-file');
    if (stat.size > MAX_CONFIG_BYTES) fail('config-byte-budget');
    // Bound the actual read even if the file grows after lstat; fstat binds the opened regular file.
    let fd, bytes, opened;
    try {
        fd = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
        opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.nlink !== 1 || opened.size > MAX_CONFIG_BYTES) fail('unsafe-config-file');
        const buffer = Buffer.alloc(MAX_CONFIG_BYTES + 1);
        let length = 0;
        while (length < buffer.length) {
            const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
            if (!count) break;
            length += count;
        }
        if (length > MAX_CONFIG_BYTES) fail('config-byte-budget');
        bytes = buffer.subarray(0, length);
        const after = fs.fstatSync(fd), current = fs.lstatSync(absolute);
        if (current.isSymbolicLink() || JSON.stringify(identity(stat)) !== JSON.stringify(identity(opened)) ||
            JSON.stringify(identity(current)) !== JSON.stringify(identity(opened)) || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) fail('config-source-changed');
    } finally { if (fd !== undefined) fs.closeSync(fd); }
    let config;
    try { config = JSON.parse(bytes.toString('utf8')); } catch { fail('config-invalid'); }
    if (!validateConfig(config).valid) fail('config-invalid');
    return { root, configPath: relative, parents, exists: true, config, file: { ...identity(opened), size: opened.size, mtimeMs: opened.mtimeMs, ctimeMs: opened.ctimeMs }, hash: digest(bytes) };
}

function sourceToken(source) {
    const { config, ...bound } = source;
    const token = Buffer.from(JSON.stringify({ version: 1, ...bound })).toString('base64url');
    if (token.length > MAX_TOKEN_BYTES) fail('config-byte-budget');
    return token;
}

function inspectReviewSetup({ rootDir, env = process.env } = {}) {
    const source = snapshot(resolveLocation(rootDir, env));
    return { schemaVersion: 1, status: 'inspected', configPath: source.configPath,
        provider: source.config?.reviewPreparation?.provider || null, expectedSource: sourceToken(source) };
}

function projectName(root) {
    try {
        const relative = 'package.json', file = containedPath(root, relative);
        rejectWriteLinks(root, file);
        const stat = fs.lstatSync(file);
        if (stat.isFile() && stat.size <= MAX_TOKEN_BYTES) {
            const name = JSON.parse(fs.readFileSync(file, 'utf8')).name;
            if (typeof name === 'string' && name.trim() && name.length <= 256 && !/[\x00-\x1f\x7f]/.test(name)) return name.trim();
        }
    } catch {}
    const name = path.basename(root);
    if (!name.trim() || /[\x00-\x1f\x7f]/.test(name)) fail('project-name-unavailable');
    return name;
}

function saveReviewSetup({ rootDir, env = process.env, action, expectedSource } = {}) {
    if (!['enable', 'off'].includes(action)) fail('invalid-setup-action');
    if (typeof expectedSource !== 'string' || !expectedSource || expectedSource.length > MAX_TOKEN_BYTES || !/^[A-Za-z0-9_-]+$/.test(expectedSource)) fail('expected-source-required');
    const location = resolveLocation(rootDir, env);
    const source = snapshot(location);
    if (sourceToken(source) !== expectedSource) fail('config-source-changed');
    if (source.file && !(source.file.mode & 0o222)) fail('config-save-unavailable');
    const provider = action === 'enable' ? 'open-code-review' : 'none';
    const config = source.config || { project: { name: projectName(location.root) } };
    const candidate = { ...config, reviewPreparation: { ...config.reviewPreparation, provider } };
    if (!validateConfig(candidate).valid) fail('config-invalid');
    const bytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
    if (bytes.length > MAX_CONFIG_BYTES) fail('config-byte-budget');
    // Existing parent identity must still match consent before creating only absent directories.
    if (sourceToken(snapshot(location)) !== expectedSource) fail('config-source-changed');
    fs.mkdirSync(path.dirname(location.absolute), { recursive: true });
    rejectWriteLinks(location.root, location.absolute);
    const lock = `${location.absolute}.review-setup.lock`;
    let lockFd, lockIdentity, temporary, temporaryIdentity, published = false;
    const unlinkOwned = (file, owned) => {
        if (!file || !owned) return;
        try {
            const current = fs.lstatSync(file);
            if (current.isFile() && !current.isSymbolicLink() && current.dev === owned.dev && current.ino === owned.ino) fs.unlinkSync(file);
        } catch {}
    };
    try {
        lockFd = fs.openSync(lock, 'wx', 0o600);
        lockIdentity = fs.fstatSync(lockFd);
        const current = snapshot(location);
        // Creating previously missing parents is this helper's own operation; compare consent's existing parents.
        const currentParents = new Map(current.parents.map(parent => [parent.path, parent]));
        if (source.parents.some(parent => JSON.stringify(parent) !== JSON.stringify(currentParents.get(parent.path)))) fail('config-source-changed');
        const normalizeParents = value => ({ ...value, parents: source.parents });
        if (sourceToken(normalizeParents(current)) !== expectedSource) fail('config-source-changed');
        temporary = `${location.absolute}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
        const tempFd = fs.openSync(temporary, 'wx', source.file ? source.file.mode & 0o777 : 0o600);
        temporaryIdentity = fs.fstatSync(tempFd);
        try { fs.writeFileSync(tempFd, bytes); } finally { fs.closeSync(tempFd); }
        const readback = fs.readFileSync(temporary);
        if (!readback.equals(bytes) || !validateConfig(JSON.parse(readback.toString('utf8'))).valid) fail('config-readback-invalid');
        const beforePublish = snapshot(location);
        if (JSON.stringify(beforePublish.parents) !== JSON.stringify(current.parents) || sourceToken(normalizeParents(beforePublish)) !== expectedSource) fail('config-source-changed');
        rejectWriteLinks(location.root, temporary);
        if (source.exists) fs.renameSync(temporary, location.absolute);
        // Exclusive publication for missing destinations cannot overwrite a newly created owner file.
        else fs.linkSync(temporary, location.absolute);
        // Publication can succeed even when later cleanup or confirmation fails.
        published = true;
        if (!source.exists) fs.unlinkSync(temporary);
        temporary = undefined;
        const saved = snapshot(location);
        if (saved.hash !== digest(bytes) || saved.config.reviewPreparation.provider !== provider) fail('config-readback-invalid');
        return { schemaVersion: 1, status: 'saved', configPath: saved.configPath, provider, expectedSource: sourceToken(saved) };
    } catch (error) {
        // Never delete/replace the destination to work around Windows locks, permissions, or a race.
        if (published) fail('config-publication-unverified');
        if (/^(config-|unsafe-|expected-|invalid-)/.test(error.message)) throw error;
        fail('config-save-unavailable');
    } finally {
        unlinkOwned(temporary, temporaryIdentity);
        if (lockFd !== undefined) { fs.closeSync(lockFd); unlinkOwned(lock, lockIdentity); }
    }
}

function parseArgs(argv) {
    const options = {};
    const fields = { '--action': 'action', '--expected-source': 'expectedSource' };
    for (let index = 0; index < argv.length; index++) {
        const field = fields[argv[index]], value = argv[++index];
        if (!field || !value || value.startsWith('--') || Object.prototype.hasOwnProperty.call(options, field)) fail('invalid-setup-arguments');
        options[field] = value;
    }
    if (!['inspect', 'enable', 'off'].includes(options.action) || (options.action === 'inspect' && options.expectedSource !== undefined) || (options.action !== 'inspect' && !options.expectedSource)) fail('invalid-setup-arguments');
    return options;
}

function main(argv) {
    try {
        const options = parseArgs(argv);
        const result = options.action === 'inspect' ? inspectReviewSetup() : saveReviewSetup(options);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        return 0;
    } catch (error) {
        const allowed = /^(config-[a-z-]+|unsafe-config-[a-z-]+|expected-source-required|invalid-setup-[a-z-]+|project-name-unavailable)$/;
        const reason = allowed.test(error.message) ? error.message : 'config-save-unavailable';
        process.stdout.write(`${JSON.stringify({ schemaVersion: 1, status: 'refused', reason })}\n`);
        return 2;
    }
}

module.exports = { inspectReviewSetup, saveReviewSetup, parseArgs, main, MAX_CONFIG_BYTES, MAX_TOKEN_BYTES };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
