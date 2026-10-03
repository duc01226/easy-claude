'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const releases = require('./review-provider-releases.json');
const { resolveAcquisitionPolicy } = require('./review-acquisition-policy.cjs');
const { classifySensitivePath } = require('../../hooks/lib/sensitive-path-policy.cjs');
const { finiteLimit, runNative, readPinnedBinary, findNativeCandidates, readCache, acquireNative } = require('./review-tool-process.cjs');

const SOURCES = new Set(['system', 'project', 'global', 'custom']);
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const result = (status, reason, criteria = []) => ({ id: 'open-code-review', status, reason, version: status === 'ready' ? releases.version : null, criteria });

function targetPath(value) {
    return typeof value === 'string' && value !== '' && value.length <= 4096 && !/[\0\r\n\\]/.test(value) &&
        !path.posix.isAbsolute(value) && !/^[a-z]:/i.test(value) && value.split('/').every(part => part !== '' && part !== '.' && part !== '..') &&
        !classifySensitivePath(value).sensitive && classifySensitivePath(value).valid;
}

function requestedPaths(target, maximum = 500) {
    if (!target || target.schemaVersion !== 1 || !Array.isArray(target.entries) || target.entries.length > 2000) throw new Error('provider-target-invalid');
    const memberships = new Map();
    const ids = new Set();
    for (const entry of target.entries) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) throw new Error('provider-target-invalid');
        ids.add(entry.id);
        let found = false;
        for (const value of new Set([entry.path, entry.oldPath].filter(value => value !== null && value !== undefined))) {
            if (!targetPath(value)) throw new Error('provider-target-invalid');
            if (!memberships.has(value)) memberships.set(value, []);
            memberships.get(value).push(entry.id);
            found = true;
        }
        if (!found) throw new Error('provider-target-invalid');
    }
    if (memberships.size > maximum || [...memberships.keys()].reduce((n, value) => n + Buffer.byteLength(value) + 1, 0) > 24000) throw new Error('provider-target-limit');
    return memberships;
}

function parseCriteria(stdout, target, { maxProviderPaths, maxProviderBytes } = {}) {
    const maximum = finiteLimit(maxProviderPaths, 500, 2000);
    const bytes = finiteLimit(maxProviderBytes, 2 * 1024 * 1024, 16 * 1024 * 1024);
    if (typeof stdout !== 'string' || Buffer.byteLength(stdout) > bytes) throw new Error('provider-output-limit');
    const memberships = requestedPaths(target, maximum);
    const output = JSON.parse(stdout);
    if (!output || output.schema_version !== '1' || !Array.isArray(output.groups) || Object.keys(output).some(key => !['schema_version', 'groups'].includes(key))) throw new Error('provider-output-invalid');
    if (output.groups.length > memberships.size) throw new Error('provider-output-invalid');
    const covered = new Set(), groups = new Set(), criteria = [];
    for (const group of output.groups) {
        if (!group || !Number.isSafeInteger(group.group_id) || group.group_id < 1 || groups.has(group.group_id) ||
            !SOURCES.has(group.source) || typeof group.pattern !== 'string' || group.pattern.length > 4096 ||
            typeof group.rule !== 'string' || !Array.isArray(group.files) || !group.files.length ||
            Object.keys(group).some(key => !['group_id', 'source', 'pattern', 'files', 'rule'].includes(key))) throw new Error('provider-output-invalid');
        groups.add(group.group_id);
        const entries = new Set();
        for (const file of group.files) {
            if (!memberships.has(file) || covered.has(file)) throw new Error('provider-coverage-invalid');
            covered.add(file);
            for (const id of memberships.get(file)) entries.add(id);
        }
        // Empty criteria still accounts for coverage, but adds no instruction artifact.
        if (group.rule.trim()) criteria.push({
            id: `ocr-${digest(group.source + '\0' + group.pattern + '\0' + group.rule).slice(0, 24)}`,
            source: `open-code-review:${group.source}:${group.pattern}`,
            contentHash: digest(group.rule), entryIds: [...entries], text: group.rule,
        });
    }
    if (covered.size !== memberships.size) throw new Error('provider-coverage-invalid');
    return criteria;
}

function compatibleVersion(stdout, platform, arch) {
    const nativePlatform = platform === 'win32' ? 'windows' : platform;
    const nativeArch = arch === 'x64' ? 'amd64' : arch;
    return typeof stdout === 'string' && stdout.split(/\r?\n/)[0] === `open-code-review v${releases.version} (${releases.upstreamRevision.slice(0, 8)}) ${nativePlatform}/${nativeArch}`;
}

/** Concrete local delegate adapter. No policy, grouping, verdict, receipt or model-call authority. */
async function prepareSupplementalCriteria({ rootDir, target, machinePolicy, limits = {}, env = process.env } = {}) {
    let timer, controller, abortExternal;
    try {
        const policy = machinePolicy || resolveAcquisitionPolicy({ rootDir, env });
        if (policy.status !== 'ready' || !policy.execution) return result('fallback', policy.reason || 'execution-denied');
        const platform = process.platform, arch = process.arch;
        const release = releases.packages[`${platform}-${arch}`];
        if (!release) return result('fallback', 'platform-unsupported');
        const timeoutMs = finiteLimit(limits.providerTimeoutMs, 30000, 120000);
        controller = new AbortController();
        abortExternal = () => controller.abort();
        if (limits.signal) {
            if (limits.signal.aborted) controller.abort();
            else limits.signal.addEventListener('abort', abortExternal, { once: true });
        }
        const ownDeadline = Date.now() + timeoutMs;
        const deadline = Number.isFinite(limits.deadline) ? Math.min(ownDeadline, limits.deadline) : ownDeadline;
        timer = setTimeout(abortExternal, Math.max(0, deadline - Date.now()));
        const activeLimits = { ...limits, timeoutMs, signal: controller.signal, deadline };
        const assertActive = () => { if (controller.signal.aborted || Date.now() >= deadline) throw new Error('provider-timeout'); };
        assertActive();
        const maximum = finiteLimit(limits.maxProviderPaths, 500, 2000);
        const outputBytes = finiteLimit(limits.maxProviderBytes, 2 * 1024 * 1024, 16 * 1024 * 1024);
        const memberships = requestedPaths(target, maximum);
        if (!memberships.size) return result('disabled', 'target-empty');
        if (!path.isAbsolute(rootDir)) return result('fallback', 'provider-target-invalid');
        // Remove paid-provider keys from the child environment; delegate itself performs no model call.
        const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !/^(OPENAI_|ANTHROPIC_|GEMINI_|DEEPSEEK_|OCR_API_|OCR_MODEL)/i.test(key)));
        childEnv.OCR_NO_UPDATE = '1';
        const validate = async binary => {
            const run = await runNative(binary, ['--version'], { cwd: rootDir, env: childEnv, signal: controller.signal, timeoutMs: Math.min(timeoutMs, 3000), maxOutputBytes: 8192 });
            return run.ok && compatibleVersion(run.stdout, platform, arch);
        };
        let selected = null;
        if (policy.binaryPath) {
            selected = readPinnedBinary(policy.binaryPath, release, platform, arch);
            if (!selected || !(await validate(selected.binary))) return result('fallback', 'provisioned-tool-invalid');
        }
        if (!selected) {
            const cached = readCache(policy.cacheDir, release, platform, arch, activeLimits);
            if (cached && await validate(cached.binary)) selected = cached;
        }
        if (!selected) for (const candidate of findNativeCandidates(env, platform)) {
            assertActive();
            const pinned = readPinnedBinary(candidate, release, platform, arch);
            if (pinned && await validate(pinned.binary)) { selected = pinned; break; }
        }
        if (!selected) {
            const acquired = await acquireNative({ policy, release, platform, arch, limits: activeLimits, validate });
            if (!acquired.ok) return result('fallback', acquired.reason);
            selected = acquired;
        }
        // Recheck bytes immediately before the delegate invocation, even after a version probe.
        assertActive();
        if (!readPinnedBinary(selected.binary, release, platform, arch)) return result('fallback', 'tool-integrity-invalid');
        const run = await runNative(selected.binary, ['delegate', 'rule', '--repo', rootDir, '--format', 'json', '--', ...memberships.keys()], { cwd: rootDir, env: childEnv, signal: controller.signal, timeoutMs, maxOutputBytes: outputBytes });
        if (!run.ok) return result('fallback', run.reason);
        return result('ready', null, parseCriteria(run.stdout, target, limits));
    } catch {
        return result('fallback', 'provider-unavailable');
    } finally {
        clearTimeout(timer);
        if (limits.signal && abortExternal) limits.signal.removeEventListener('abort', abortExternal);
    }
}

module.exports = { prepareSupplementalCriteria, parseCriteria, requestedPaths, compatibleVersion };
