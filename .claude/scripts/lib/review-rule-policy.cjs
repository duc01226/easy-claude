'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const conventions = require('../../hooks/lib/file-conventions.cjs');
const overlays = require('../../hooks/lib/skill-protocol-overlay.cjs');
const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
const { digest, safeRelative, containedPath, readTargetContent } = require('./review-target.cjs');

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_POLICY_BYTES = 64 * 1024 * 1024;
const MAX_CLASSIFICATIONS = 1000000;
// A declaration is metadata, not a second procedure body. Bound parse work and active fan-out.
const MAX_DECLARATION_BYTES = 64 * 1024;
const MAX_DECLARED_MODES = 32;
const MAX_ACTIVE_DOCUMENTS = 128;
const MODE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DECLARATION_START = '<!-- REVIEW-POLICY-SOURCES:START -->';
const DECLARATION_END = '<!-- REVIEW-POLICY-SOURCES:END -->';
const DEFAULT_BATCH_LIMITS = Object.freeze({ maxBatchEntries: 50, maxBatchBytes: 2 * 1024 * 1024 });
const reason = (code, entryIds = [], sourceIds = []) => ({ code, entryIds, sourceIds });

/** Ask the existing root-bound loaders in a scoped child; no process-global root/cache mutation. */
function loadPolicyConfiguration(rootDir) {
    const loader = require.resolve('../../hooks/lib/project-config-loader.cjs');
    const helper = require.resolve('../../hooks/lib/session-init-helpers.cjs');
    const script = `const fs=require('node:fs'),l=require(process.argv[1]);const p=l.getConfiguredProjectConfigPath();let c=null;if(fs.existsSync(p))c=JSON.parse(fs.readFileSync(p,'utf8'));const h=require(process.argv[2]);process.stdout.write(JSON.stringify({configPath:p,indexPath:l.getConfiguredDocsIndexPath(),config:c,selected:h.getReferenceDocs(c||{})}));`;
    const bytes = execFileSync(process.execPath, ['-e', script, loader, helper], {
        cwd: rootDir, env: { ...process.env, CLAUDE_PROJECT_DIR: rootDir }, shell: false, windowsHide: true,
        timeout: 30000, maxBuffer: MAX_SOURCE_BYTES, stdio: ['ignore', 'pipe', 'pipe']
    });
    const loaded = JSON.parse(bytes.toString());
    for (const field of ['configPath', 'indexPath']) {
        const relative = path.relative(rootDir, loaded[field]).split(path.sep).join('/');
        containedPath(rootDir, relative);
    }
    return loaded;
}

function sourceBytes(rootDir, relative) {
    const absolute = containedPath(rootDir, safeRelative(relative));
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SOURCE_BYTES) throw new Error('required-source-unavailable');
    return fs.readFileSync(absolute);
}

function normalizeRequiredDocuments(values) {
    if (!Array.isArray(values) || values.length > MAX_ACTIVE_DOCUMENTS) throw new Error('required-document-budget');
    const normalized = values.map(value => {
        // Declarations and argv use one canonical project-relative spelling on every OS.
        if (typeof value !== 'string' || value.length > 1024 || /[\\\x00-\x1f\x7f]/.test(value)) throw new Error('invalid-required-document');
        try { return safeRelative(value); } catch { throw new Error('invalid-required-document'); }
    });
    return [...new Set(normalized)].sort();
}

function resolveProcedureSources(text, requestedMode) {
    const starts = text.split(DECLARATION_START).length - 1;
    const ends = text.split(DECLARATION_END).length - 1;
    let declaration = { version: 1, defaultMode: 'default', modes: { default: [] } };
    let dispatcherText = text;
    if (starts || ends) {
        if (starts !== 1 || ends !== 1) throw new Error('invalid-procedure-declaration');
        const start = text.indexOf(DECLARATION_START) + DECLARATION_START.length;
        const end = text.indexOf(DECLARATION_END);
        const body = text.slice(start, end);
        dispatcherText = text.slice(0, start - DECLARATION_START.length) + text.slice(end + DECLARATION_END.length);
        if (end < start || Buffer.byteLength(body) > MAX_DECLARATION_BYTES) throw new Error('invalid-procedure-declaration');
        const block = body.match(/^\s*```json\r?\n([\s\S]*?)\r?\n```\s*$/);
        if (!block) throw new Error('invalid-procedure-declaration');
        try { declaration = JSON.parse(block[1]); } catch { throw new Error('invalid-procedure-declaration'); }
        if (!declaration || Array.isArray(declaration) || Object.keys(declaration).some(key => !['version', 'defaultMode', 'modes'].includes(key)) || declaration.version !== 1 ||
            !(declaration.defaultMode === null || (typeof declaration.defaultMode === 'string' && MODE_NAME.test(declaration.defaultMode))) ||
            !declaration.modes || typeof declaration.modes !== 'object' || Array.isArray(declaration.modes)) throw new Error('invalid-procedure-declaration');
        const modes = Object.keys(declaration.modes);
        if (!modes.length || modes.length > MAX_DECLARED_MODES || modes.some(mode => !MODE_NAME.test(mode)) ||
            (declaration.defaultMode !== null && !Object.prototype.hasOwnProperty.call(declaration.modes, declaration.defaultMode))) throw new Error('invalid-procedure-declaration');
        // Validate every declaration shape/path, but read bytes only for the active mode.
        for (const mode of modes) declaration.modes[mode] = normalizeRequiredDocuments(declaration.modes[mode]);
    }
    const mode = requestedMode === undefined ? declaration.defaultMode : requestedMode;
    if (mode === null) throw new Error('review-skill-mode-required');
    if (typeof mode !== 'string' || !MODE_NAME.test(mode) || !Object.prototype.hasOwnProperty.call(declaration.modes, mode)) throw new Error('unknown-review-skill-mode');
    return { skillMode: mode, procedureDocs: declaration.modes[mode], dispatcherText };
}

function classifyEntry(target, entry, group, contentCache) {
    const locations = [['before', entry.oldPath], ['after', entry.path]].filter(([, relative]) => relative !== null);
    let matched = false;
    let incomplete = false;
    for (const [side, relative] of locations) {
        let unavailable = false;
        let prefixOnly = false;
        const before = conventions.contentGuardStats();
        const result = conventions.explainGroupMatch(group, relative, { readContent: () => {
            try {
                if (!contentCache.has(side)) {
                    const bytes = readTargetContent(target, entry.id, side);
                    contentCache.set(side, { unavailable: !bytes || bytes.includes(0), prefixOnly: Boolean(bytes && bytes.length > 16 * 1024), text: bytes ? bytes.toString('utf8', 0, 64 * 1024) : null });
                }
                const captured = contentCache.get(side);
                unavailable = captured.unavailable;
                prefixOnly = captured.prefixOnly;
                return unavailable ? null : captured.text;
            } catch { contentCache.set(side, { unavailable: true, prefixOnly: false, text: null }); unavailable = true; return null; }
        } }, true);
        const after = conventions.contentGuardStats();
        matched ||= result.member;
        incomplete ||= result.incomplete || unavailable || (!result.member && prefixOnly) || after.timeouts > before.timeouts || after.skipped > before.skipped;
    }
    return { matched, incomplete };
}

function resolveReviewPolicy({ rootDir, config, target, skillName = 'changes-review', skillMode, requiredDocs = [] }) {
    const root = fs.realpathSync.native(rootDir);
    const policy = { status: 'ready', reasons: [], fingerprint: null, ruleSources: [], groups: [], memberships: {}, overlaps: [], unmatched: [], classificationUnknowns: [], config: {}, sourceTexts: {} };
    const allIds = target.entries.map(entry => entry.id);
    let totalBytes = 0;
    const sourcesByOrigin = new Map();
    const sourceEntrySets = new Map();
    const addBytes = (origin, bytes, entryIds = allIds) => {
        const existing = sourcesByOrigin.get(origin);
        if (existing) { for (const entryId of entryIds) sourceEntrySets.get(existing.id).add(entryId); return existing; }
        totalBytes += bytes.length;
        if (bytes.length > MAX_SOURCE_BYTES || totalBytes > MAX_POLICY_BYTES) throw new Error('required-policy-budget');
        const contentHash = digest(bytes);
        const id = `rule-${digest(origin).slice(0, 24)}`;
        const source = { id, authority: 'required', origin, contentHash, entryIds: entryIds.slice(), contentRef: null };
        policy.ruleSources.push(source);
        sourcesByOrigin.set(origin, source);
        sourceEntrySets.set(id, new Set(entryIds));
        policy.sourceTexts[id] = bytes;
        return source;
    };
    const addDocument = (relative, entryIds = allIds) => {
        try { return addBytes(safeRelative(relative), sourceBytes(root, relative), entryIds); }
        catch { policy.reasons.push(reason('required-source-unavailable', entryIds, [typeof relative === 'string' ? relative.replace(/[\x00-\x1f\x7f]/g, '?').slice(0, 300) : 'invalid-source'])); return null; }
    };
    try {
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(skillName)) throw new Error('invalid-review-skill');
        const selectedDocuments = normalizeRequiredDocuments(requiredDocs);
        const loaded = loadPolicyConfiguration(root);
        const declared = config === undefined ? loaded.config : config;
        if (declared !== null && declared !== undefined) {
            const validation = validateConfig(declared);
            if (!validation.valid) {
                policy.reasons.push(reason('declared-policy-invalid', [], validation.errors.map(error => error.split(':')[0].slice(0, 160)).slice(0, 100)));
                throw new Error('declared-policy-invalid');
            }
            policy.config = declared;
        }
        const cfg = policy.config;
        const effective = declared === null || declared === undefined ? conventions.builtinFallbackConfig() : cfg;
        policy.groups = cfg.reviewGroups || [];
        // Bind grouping and selection, not just rule bytes, to the policy identity.
        addBytes('accepted-project-policy', Buffer.from(JSON.stringify(cfg)));
        if (loaded.config !== null) addDocument(path.relative(root, loaded.configPath).split(path.sep).join('/'));
        const protocolIndexPath = '.claude/skills/shared/protocol-groups.json';
        const protocolIndex = sourceBytes(root, protocolIndexPath);
        addBytes(protocolIndexPath, protocolIndex);
        const registry = JSON.parse(protocolIndex.toString('utf8'));
        const tags = Object.keys(registry.groups?.universal?.tags || {});
        if (!tags.length) throw new Error('universal-policy-unavailable');
        for (const tag of tags) {
            if (!/^[a-z0-9][a-z0-9-]*$/.test(tag)) throw new Error('universal-policy-invalid');
            addDocument(`.claude/skills/shared/protocols/${tag}.md`);
        }
        const skillSource = addDocument(`.claude/skills/${skillName}/SKILL.md`);
        if (skillSource) {
            const text = policy.sourceTexts[skillSource.id].toString('utf8');
            const procedure = resolveProcedureSources(text, skillMode);
            const activeDocuments = normalizeRequiredDocuments([...new Set([...procedure.procedureDocs, ...selectedDocuments])]);
            policy.selection = { skillName, skillMode: procedure.skillMode, requiredDocs: selectedDocuments, procedureDocs: procedure.procedureDocs };
            for (const relative of activeDocuments) addDocument(relative);
            for (const match of procedure.dispatcherText.matchAll(/\.claude\/skills\/shared\/protocols\/[a-z0-9-]+\.md/g)) addDocument(match[0]);
            const recipe = '.claude/skills/shared/review-preparation.md';
            if (text.includes(recipe)) addDocument(recipe);
        }
        const referenceRoot = cfg.docsRoots?.projectReference?.path || 'docs/project-reference'; // docs/project-config.json overrides
        const selected = config === undefined ? loaded.selected : (() => {
            const { getReferenceDocs } = require('../../hooks/lib/session-init-helpers.cjs');
            return getReferenceDocs(cfg);
        })();
        const reviewRefs = selected.filter(doc => /review|quality|standards|convention/i.test(`${doc.filename} ${doc.purpose || ''}`) && !/not applicable|\bN\/A\b/i.test(doc.purpose || ''));
        for (const doc of reviewRefs) addDocument(`${referenceRoot}/${doc.filename}`);
        for (const relative of cfg.reviewPreparation?.ruleDocs || []) addDocument(relative);
        // These inputs are independent of referenceDocs, and optional only when absent.
        const indexRelative = path.relative(root, loaded.indexPath).split(path.sep).join('/');
        for (const relative of [indexRelative, `${referenceRoot}/lessons.md`, `${referenceRoot}/skill-protocols-reference.md`]) {
            const absolute = containedPath(root, relative);
            if (fs.existsSync(absolute)) addDocument(relative);
        }
        const overlayRows = overlays.readRegistry(root, cfg);
        const overlayRegistry = policy.ruleSources.find(source => source.origin === `${referenceRoot}/skill-protocols-reference.md`);
        if (overlayRegistry) {
            const registryText = policy.sourceTexts[overlayRegistry.id].toString('utf8');
            if (!overlayRows.length && /\|\s*(?:exact|glob|all)\s*\|/i.test(registryText) && !registryText.includes('_(none yet)_')) throw new Error('overlay-policy-invalid');
        }
        const selectedOverlays = overlays.resolveOverlays(skillName, overlayRows);
        for (const row of selectedOverlays) {
            if (!/^[a-z0-9][a-z0-9-]*$/.test(row.name) || !row.bodyRootRel) throw new Error('overlay-policy-invalid');
            const relative = `${row.bodyRootRel.replace(/\\/g, '/').replace(/\/$/, '')}/${row.name}.md`;
            const overlaySource = addDocument(relative);
            if (overlaySource) {
                const text = policy.sourceTexts[overlaySource.id].toString('utf8');
                if (!/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(text) || !new RegExp(`^name:\\s*['"]?${row.name}['"]?\\s*$`, 'm').test(text)) throw new Error('overlay-policy-invalid');
            }
        }
        const contextGroups = effective.contextGroups || [];
        const modules = cfg.modules || [];
        if (target.entries.length * (contextGroups.length + modules.length) > MAX_CLASSIFICATIONS) throw new Error('classification-budget');
        for (const entry of target.entries) {
            const membership = { contextGroups: [], modules: [] };
            const contentCache = new Map();
            policy.memberships[entry.id] = membership;
            for (const group of contextGroups) {
                const classification = classifyEntry(target, entry, group, contentCache);
                if (classification.incomplete) policy.classificationUnknowns.push({ entryId: entry.id, classificationId: group.name, kind: 'contextGroup' });
                if (!classification.matched && !classification.incomplete) continue;
                membership.contextGroups.push(group.name);
                const docs = [...new Set([group.guideDoc, group.patternsDoc, ...(group.referenceDocs || [])].filter(Boolean))];
                for (const doc of docs) addDocument(doc, [entry.id]);
                if (group.rules?.length || group.skills?.length) addBytes(`context-group:${group.name}`, Buffer.from(JSON.stringify({ rules: group.rules || [], skills: group.skills || [] })), [entry.id]);
            }
            for (const module of modules) {
                let matched = false, incomplete = false;
                for (const relative of [...new Set([entry.oldPath, entry.path].filter(Boolean))]) {
                    const verdict = conventions.guardedPathRegexTest(module.pathRegex, `/${relative}`, { remainingMs: conventions.PATH_REGEX_BUDGET_MS });
                    matched ||= verdict.matched;
                    incomplete ||= verdict.incomplete;
                }
                if (incomplete) policy.classificationUnknowns.push({ entryId: entry.id, classificationId: module.name, kind: 'module' });
                if (matched || incomplete) membership.modules.push(module.name);
            }
        }
        policy.ruleSources.sort((left, right) => left.origin < right.origin ? -1 : left.origin > right.origin ? 1 : 0);
        for (const source of policy.ruleSources) source.entryIds = [...sourceEntrySets.get(source.id)].sort();
        policy.fingerprint = digest(JSON.stringify({ groups: policy.groups, memberships: policy.memberships,
            selection: policy.selection, unknowns: policy.classificationUnknowns, sources: policy.ruleSources.map(source => [source.id, source.origin, source.contentHash, source.entryIds]) }));
    } catch (error) {
        const allowed = ['invalid-review-skill', 'declared-policy-invalid', 'universal-policy-unavailable', 'universal-policy-invalid', 'overlay-policy-invalid', 'classification-budget', 'required-policy-budget', 'required-document-budget', 'invalid-required-document', 'invalid-procedure-declaration', 'review-skill-mode-required', 'unknown-review-skill-mode'];
        policy.reasons.push(reason(allowed.includes(error.message) ? error.message : 'required-policy-unresolved'));
    }
    if (policy.reasons.length) policy.status = 'policy-error';
    if (policy.reasons.length > 100) policy.reasons = policy.reasons.slice(0, 99).concat(reason('additional-policy-errors'));
    return policy;
}

function assignPrimaryGroups(target, policy) {
    if (policy.status !== 'ready') throw new Error('review-policy-not-ready');
    const assignments = [];
    policy.overlaps = [];
    policy.unmatched = [];
    for (const entry of target.entries) {
        const membership = policy.memberships[entry.id];
        const candidates = policy.groups.map((group, order) => ({ group, order })).filter(({ group }) =>
            (group.modules || []).some(name => membership.modules.includes(name)) || (group.contextGroups || []).some(name => membership.contextGroups.includes(name)));
        candidates.sort((left, right) => (left.group.priority ?? 500) - (right.group.priority ?? 500) || left.order - right.order);
        assignments.push({ entryId: entry.id, groupId: candidates[0]?.group.id || 'general' });
        if (candidates.length > 1) policy.overlaps.push({ entryId: entry.id, groupIds: candidates.map(item => item.group.id) });
        if (!candidates.length) policy.unmatched.push(entry.id);
    }
    return assignments;
}

function buildReviewBatches(target, policy, assignments, limits = {}) {
    const bounds = { ...DEFAULT_BATCH_LIMITS, ...limits };
    for (const key of Object.keys(DEFAULT_BATCH_LIMITS)) if (!Number.isSafeInteger(bounds[key]) || bounds[key] <= 0 || bounds[key] > DEFAULT_BATCH_LIMITS[key]) throw new Error('invalid-batch-limit');
    const assignedIds = new Set(assignments.map(item => item.entryId));
    if (assignments.length !== target.entries.length || assignedIds.size !== target.entries.length || target.entries.some(entry => !assignedIds.has(entry.id))) throw new Error('incomplete-assignment-coverage');
    const batches = [];
    const byGroup = new Map();
    for (const assignment of assignments) {
        if (!byGroup.has(assignment.groupId)) byGroup.set(assignment.groupId, []);
        byGroup.get(assignment.groupId).push(assignment.entryId);
    }
    for (const [groupId, entryIds] of byGroup) {
        let batchEntries = [], batchBytes = 0;
        const flush = () => {
            if (!batchEntries.length) return;
            const related = policy.groups.find(group => group.id === groupId)?.relatedGroups || [];
            const batchIds = new Set(batchEntries);
            const ruleSourceIds = policy.ruleSources.filter(source => source.entryIds.some(id => batchIds.has(id))).map(source => source.id);
            const id = `batch-${digest(JSON.stringify([groupId, batchEntries])).slice(0, 24)}`;
            batches.push({ id, groupId, entryIds: batchEntries, ruleSourceIds, relatedGroupIds: related.slice() });
            batchEntries = []; batchBytes = 0;
        };
        for (const entryId of entryIds) {
            const bytes = ['before', 'after'].reduce((sum, side) => sum + (readTargetContent(target, entryId, side)?.length || 0), 0);
            if (bytes > bounds.maxBatchBytes) throw new Error('oversized-batch-entry');
            if (batchEntries.length >= bounds.maxBatchEntries || batchBytes + bytes > bounds.maxBatchBytes) flush();
            batchEntries.push(entryId); batchBytes += bytes;
        }
        flush();
    }
    return batches;
}

module.exports = { resolveReviewPolicy, assignPrimaryGroups, buildReviewBatches, loadPolicyConfiguration, DEFAULT_BATCH_LIMITS, MAX_SOURCE_BYTES, MAX_POLICY_BYTES, MAX_CLASSIFICATIONS, MAX_DECLARATION_BYTES, MAX_DECLARED_MODES, MAX_ACTIVE_DOCUMENTS, normalizeRequiredDocuments };
