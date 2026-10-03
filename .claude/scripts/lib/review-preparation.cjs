'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { captureTarget, validateTarget, checkTargetFreshness, ensureOutputDirectory, containedPath, writeArtifact, digest, rejectWriteLinks } = require('./review-target.cjs');
const { resolveReviewPolicy, assignPrimaryGroups, buildReviewBatches } = require('./review-rule-policy.cjs');

const SETUP_CHOICES = Object.freeze(['Accept setup', 'Turn off OCR for this project', 'Skip this time']);
const fallback = reason => ({ id: 'open-code-review', status: 'fallback', reason, version: null, criteria: [] });
const resultKeys = new Set(['id', 'status', 'reason', 'version', 'criteria']);
const criterionKeys = new Set(['id', 'source', 'contentHash', 'entryIds', 'text']);

function validateSupplemental(result, target, maxBytes = 2 * 1024 * 1024) {
    if (!result || Object.keys(result).some(key => !resultKeys.has(key)) || result.id !== 'open-code-review' || !['ready', 'disabled', 'fallback'].includes(result.status) || !Array.isArray(result.criteria)) return fallback('invalid-provider-result');
    if (result.reason !== null && (typeof result.reason !== 'string' || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(result.reason))) return fallback('invalid-provider-reason');
    if (result.version !== null && (typeof result.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(result.version))) return fallback('invalid-provider-version');
    if (result.status !== 'ready') return result.criteria.length === 0 ? result : fallback('invalid-provider-result');
    const targetIds = new Set(target.entries.map(entry => entry.id));
    const covered = new Set(), ids = new Set();
    let bytes = 0;
    for (const criterion of result.criteria) {
        if (!criterion || Object.keys(criterion).some(key => !criterionKeys.has(key)) || typeof criterion.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(criterion.id) || ids.has(criterion.id) || typeof criterion.source !== 'string' || (!criterion.source || criterion.source.length > 1024 || /[\x00-\x1f\x7f]/.test(criterion.source)) || typeof criterion.text !== 'string' || !criterion.text.trim() || !Array.isArray(criterion.entryIds) || !criterion.entryIds.length || new Set(criterion.entryIds).size !== criterion.entryIds.length || criterion.entryIds.some(id => !targetIds.has(id)) || digest(Buffer.from(criterion.text)) !== criterion.contentHash) return fallback('invalid-provider-criteria');
        ids.add(criterion.id);
        bytes += Buffer.byteLength(criterion.text);
        if (bytes > maxBytes) return fallback('provider-output-budget');
        for (const id of criterion.entryIds) covered.add(id);
    }
    if (covered.size !== targetIds.size) return fallback('incomplete-provider-coverage');
    return result;
}

function writeManifest(rootDir, outputDir, filename, object) {
    const dir = ensureOutputDirectory(rootDir, outputDir);
    const relative = path.relative(rootDir, path.join(dir, filename)).split(path.sep).join('/');
    const absolute = containedPath(rootDir, relative);
    rejectWriteLinks(fs.realpathSync.native(rootDir), absolute);
    const bytes = `${JSON.stringify(object, null, 2)}\n`;
    // Immutable publication: an existing different manifest belongs to an earlier preparation.
    if (fs.existsSync(absolute)) {
        if (!fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink() || fs.readFileSync(absolute, 'utf8') !== bytes) throw new Error('output-manifest-already-published');
    } else fs.writeFileSync(absolute, bytes, { flag: 'wx', mode: 0o600 });
    return relative;
}

async function prepareReview({ rootDir = process.cwd(), target, scope = 'local', base, files = [], skillName = 'changes-review', skillMode, requiredDocs = [], outputDir, provider, machinePolicy, acquire, providerDecision, limits = {} } = {}) {
    if (providerDecision !== undefined && providerDecision !== 'skip') throw new Error('invalid-provider-decision');
    const root = fs.realpathSync.native(rootDir);
    const output = ensureOutputDirectory(root, outputDir);
    const result = { schemaVersion: 1, targetFingerprint: null, policyFingerprint: null, policySelection: null, providerDecision: providerDecision || null, routing: { status: 'ready', reasons: [] }, entries: [], ruleSources: [], assignments: [], batches: [], overlaps: [], unmatched: [], classificationUnknowns: [], provider: fallback('host-preparation-incomplete') };
    let frozen;
    try {
        frozen = target || captureTarget({ rootDir: root, scope, base, files, outputDir: output, limits });
        const validation = validateTarget(frozen, { rootDir: root });
        if (!validation.valid) throw new Error('invalid-target-manifest');
        const freshness = checkTargetFreshness(frozen);
        if (!freshness.fresh) throw new Error('target-changed');
        result.targetFingerprint = frozen.fingerprint;
        result.entries = frozen.entries;
    } catch (error) {
        result.routing = { status: 'target-incomplete', reasons: [{ code: error.code || (error.message === 'target-changed' ? 'target-changed' : 'target-unresolved'), entryIds: [], sourceIds: [] }] };
        writeManifest(root, output, 'manifest.json', result);
        return result;
    }
    const policy = resolveReviewPolicy({ rootDir: root, target: frozen, skillName, skillMode, requiredDocs });
    result.policyFingerprint = policy.fingerprint;
    result.policySelection = policy.selection || null;
    result.classificationUnknowns = policy.classificationUnknowns;
    if (policy.status !== 'ready') {
        result.routing = { status: 'policy-error', reasons: policy.reasons };
    } else {
        try {
            result.assignments = assignPrimaryGroups(frozen, policy);
            result.batches = buildReviewBatches(frozen, policy, result.assignments, limits);
            result.overlaps = policy.overlaps;
            result.unmatched = policy.unmatched;
            for (const source of policy.ruleSources) {
                const artifact = writeArtifact(root, output, 'rule-content', policy.sourceTexts[source.id]);
                result.ruleSources.push({ ...source, contentRef: artifact.contentRef });
            }
        } catch {
            result.routing = { status: 'target-incomplete', reasons: [{ code: 'batch-coverage-incomplete', entryIds: frozen.entries.map(entry => entry.id), sourceIds: [] }] };
        }
    }
    if (result.routing.status === 'ready') {
        if (!frozen.entries.length) result.provider = { id: 'open-code-review', status: 'disabled', reason: 'empty-target', version: null, criteria: [] };
        else if (providerDecision === 'skip') result.provider = { id: 'open-code-review', status: 'disabled', reason: 'invocation-provider-skipped', version: null, criteria: [] };
        else if (policy.config.reviewPreparation?.provider === undefined) result.provider = { id: 'open-code-review', status: 'setup-needed', reason: 'project-provider-unset', version: null, criteria: [], choices: SETUP_CHOICES.slice() };
        else if (policy.config.reviewPreparation?.provider === 'none') result.provider = { id: 'open-code-review', status: 'disabled', reason: 'project-provider-disabled', version: null, criteria: [] };
        else {
            try {
                const activeProvider = provider || require('./review-provider-open-code-review.cjs').prepareSupplementalCriteria;
                const permission = machinePolicy || require('./review-acquisition-policy.cjs').resolveAcquisitionPolicy({ rootDir: root, env: process.env, acquire });
                const timeout = limits.providerTimeoutMs ?? 30000;
                if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 30000) throw new Error('invalid-provider-limit');
                const controller = new AbortController();
                const cancel = () => controller.abort();
                if (limits.signal?.aborted) controller.abort();
                else limits.signal?.addEventListener('abort', cancel, { once: true });
                let timer;
                const raw = await Promise.race([
                    activeProvider({ rootDir: root, target: frozen, machinePolicy: permission, limits: { ...limits, signal: controller.signal, deadline: Date.now() + timeout } }),
                    new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('provider-timeout')); }, timeout); })
                ]).finally(() => { clearTimeout(timer); limits.signal?.removeEventListener('abort', cancel); });
                const validated = validateSupplemental(raw, frozen);
                result.provider = { ...validated, criteria: [] };
                for (const criterion of validated.criteria) {
                    const artifact = writeArtifact(root, output, 'criteria-content', criterion.text);
                    result.provider.criteria.push({ id: criterion.id, source: criterion.source, contentHash: artifact.contentHash, entryIds: criterion.entryIds.slice(), contentRef: artifact.contentRef });
                    result.ruleSources.push({ id: `supplemental:${criterion.id}`, authority: 'supplemental', origin: criterion.source, contentHash: artifact.contentHash, entryIds: criterion.entryIds.slice(), contentRef: artifact.contentRef });
                }
                // Supplemental IDs are appended to relevant batches; required source IDs remain intact.
                for (const batch of result.batches) for (const source of result.ruleSources.filter(source => source.authority === 'supplemental')) {
                    if (source.entryIds.some(id => batch.entryIds.includes(id))) batch.ruleSourceIds.push(source.id);
                }
            } catch (error) { result.provider = fallback(error.message === 'provider-timeout' ? 'provider-timeout' : 'provider-unavailable'); }
        }
        const freshness = checkTargetFreshness(frozen);
        const currentPolicy = resolveReviewPolicy({ rootDir: root, target: frozen, skillName, skillMode, requiredDocs });
        if (!freshness.fresh) result.routing = { status: 'target-incomplete', reasons: freshness.reasons };
        else if (currentPolicy.status !== 'ready' || currentPolicy.fingerprint !== policy.fingerprint) result.routing = { status: 'policy-error', reasons: [{ code: 'policy-changed', entryIds: [], sourceIds: [] }] };
    }
    writeManifest(root, output, 'target.json', frozen);
    writeManifest(root, output, 'manifest.json', result);
    return result;
}

module.exports = { prepareReview, validateSupplemental, writeManifest, SETUP_CHOICES };
