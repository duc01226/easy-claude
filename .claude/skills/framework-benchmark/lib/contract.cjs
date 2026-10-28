'use strict';

const DIMENSIONS = Object.freeze(['correctness', 'regressionSafety', 'edgeCases', 'testQuality', 'solutionDesign', 'maintainability', 'security', 'scopeDiscipline']);
const { safeRelative } = require('./files.cjs');

function integer(value, low, high, name) {
    if (!Number.isInteger(value) || value < low || value > high) throw new Error(`Invalid ${name}: expected integer ${low}..${high}`);
}

function text(value, max, name) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /\x00/.test(value)) throw new Error(`Invalid ${name}`);
}

function validateCase(spec) {
    if (!spec || spec.schemaVersion !== 1) throw new Error('Unsupported case schemaVersion');
    if (Object.keys(spec).some(key => !['schemaVersion', 'id', 'kind', 'projectMode', 'projectConfigPath', 'ref', 'fixture', 'checksDir', 'prompt', 'treatment', 'expectedSkills', 'checks', 'assessment', 'qualification'].includes(key))) throw new Error('Unsupported case field');
    text(spec.id, 80, 'case id');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(spec.id)) throw new Error('Invalid case id');
    text(spec.prompt, 64000, 'prompt');
    text(spec.treatment, 4000, 'treatment instruction');
    if (!['feature', 'plan-implement', 'refactor', 'greenfield', 'plan', 'decision', 'review'].includes(spec.kind)) throw new Error('Unsupported task kind');
    if (!['greenfield', 'brownfield-bootstrap', 'brownfield-configured'].includes(spec.projectMode)) throw new Error('Declare the projectMode under comparison');
    if ((spec.kind === 'greenfield') !== (spec.projectMode === 'greenfield')) throw new Error('Greenfield kind and projectMode must agree');
    if (spec.projectConfigPath !== undefined) safeRelative(spec.projectConfigPath);
    if (spec.ref !== undefined && (typeof spec.ref !== 'string' || !spec.ref || spec.ref.startsWith('-') || /[\x00-\x1f]/.test(spec.ref))) throw new Error('Invalid committed ref');
    safeRelative(spec.checksDir);
    if (spec.fixture !== undefined) safeRelative(spec.fixture);
    if (!Array.isArray(spec.expectedSkills) || !spec.expectedSkills.length || spec.expectedSkills.length > 32 || new Set(spec.expectedSkills).size !== spec.expectedSkills.length || spec.expectedSkills.some(s => typeof s !== 'string' || !/^[a-z0-9-]{1,64}$/.test(s))) throw new Error('Declare expectedSkills for treatment fidelity');
    if (!Array.isArray(spec.checks) || spec.checks.length < 2 || spec.checks.length > 32) throw new Error('Expected 2..32 checks');
    const ids = new Set();
    for (const check of spec.checks) {
        text(check.id, 80, 'check id');
        if (ids.has(check.id)) throw new Error('Duplicate check id');
        ids.add(check.id);
        if (!['acceptance', 'regression'].includes(check.kind) || !['pass', 'fail'].includes(check.baseline)) throw new Error('Invalid check kind/baseline');
        if (check.kind === 'regression' && check.baseline !== 'pass') throw new Error('Regression checks must pass at baseline');
        if (!Array.isArray(check.argv) || !check.argv.length || check.argv.length > 40 || check.argv.some(arg => typeof arg !== 'string' || !arg || /\x00/.test(arg) || arg.length > 2000)) throw new Error('Checks need literal argv');
        integer(check.timeoutMs, 100, 300000, 'check timeoutMs');
    }
    if (!spec.checks.some(c => c.kind === 'acceptance') || !spec.checks.some(c => c.kind === 'regression')) throw new Error('Acceptance and regression checks are both required');
    if (spec.assessment !== undefined) validateAssessmentPolicy(spec.assessment);
    if (spec.qualification !== undefined) {
        const q = spec.qualification;
        if (!q || Object.keys(q).some(key => !['rationale', 'areas', 'decisions', 'risks', 'evidence'].includes(key))) throw new Error('Invalid complexity qualification');
        text(q.rationale, 4000, 'qualification rationale');
        for (const [key, minimum] of [['areas', 3], ['decisions', 2], ['risks', 4], ['evidence', 1]]) {
            if (!Array.isArray(q[key]) || q[key].length < minimum || q[key].length > 32 || new Set(q[key]).size !== q[key].length) throw new Error(`Invalid qualification ${key}`);
            q[key].forEach(value => text(value, 2000, `qualification ${key}`));
        }
        if (spec.assessment?.profile === 'legacy') throw new Error('Qualified complex cases require skilled assessment');
    }
    return spec;
}

function validateAssessmentPolicy(policy) {
    if (!policy || Object.keys(policy).some(key => !['profile', 'maxPasses', 'skills'].includes(key)) || !['legacy', 'skilled-v1'].includes(policy.profile)) throw new Error('Unsupported assessment policy');
    if (policy.profile === 'legacy') {
        if (policy.maxPasses !== undefined || policy.skills !== undefined) throw new Error('Legacy assessment has one unskilled pass');
        return policy;
    }
    integer(policy.maxPasses, 2, 3, 'assessment maxPasses');
    if (!Array.isArray(policy.skills) || policy.skills.length < 1 || policy.skills.length > 8 || new Set(policy.skills).size !== policy.skills.length || policy.skills.some(s => typeof s !== 'string' || !/^[a-z0-9-]{1,64}$/.test(s))) throw new Error('Invalid assessment skills');
    return policy;
}

function defaultAssessmentPolicy(kind) {
    return { profile: 'skilled-v1', maxPasses: 3, skills: ['plan', 'decision', 'review'].includes(kind) ? ['why-review'] : ['code-quality-review', 'integration-test'] };
}

// Absence in an already saved case means the historical single-pass contract.
function assessmentPolicy(spec) { return spec.assessment || { profile: 'legacy' }; }

function validateRuntime(runtime) {
    if (!runtime || runtime.schemaVersion !== 1) throw new Error('Unsupported runtime schemaVersion');
    if (Object.keys(runtime).some(key => !['schemaVersion', 'backend', 'host', 'cliVersion', 'image', 'model', 'judgeModel', 'claudeVersion', 'repeats', 'seed', 'timeoutMs', 'maxTurns', 'memoryMb', 'cpus', 'budgetUsd', 'judgeBudgetUsd'].includes(key))) throw new Error('Unsupported runtime field; never put credentials in runtime settings');
    const backend = runtimeBackend(runtime);
    if (!['host', 'docker'].includes(backend)) throw new Error('Unsupported benchmark backend');
    if (backend === 'docker') {
        if (runtime.host !== undefined || runtime.cliVersion !== undefined) throw new Error('Native CLI fields cannot be used in Docker mode');
        if (!/^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(runtime.image || '')) throw new Error('Use a pre-provisioned image pinned by sha256 digest');
        text(runtime.claudeVersion, 100, 'claudeVersion');
        integer(runtime.memoryMb, 256, 32768, 'memoryMb'); integer(runtime.cpus, 1, 16, 'cpus');
    } else {
        if (!['codex', 'claude'].includes(runtime.host)) throw new Error('Choose the authenticated native host: codex or claude');
        text(runtime.cliVersion, 200, 'cliVersion');
        if (['image', 'claudeVersion', 'memoryMb', 'cpus'].some(key => runtime[key] !== undefined)) throw new Error('Container-only limits cannot be promised by the native host backend');
        if (runtime.host === 'codex' && ['budgetUsd', 'judgeBudgetUsd'].some(key => runtime[key] !== undefined)) throw new Error('Native Codex has no dollar-loop ceiling; use its wall/action bounds and account usage controls');
    }
    text(runtime.model, 200, 'pinned solver model');
    text(runtime.judgeModel, 200, 'pinned judge model');
    if ([runtime.model, runtime.judgeModel].some(value => /^(?:sonnet|opus|haiku|default|latest)$|(?:^|[-/])latest$/i.test(value) || /REPLACE_WITH/.test(value))) throw new Error('Use explicit provider model revision IDs, not mutable aliases/placeholders');
    integer(runtime.repeats, 1, 20, 'repeats');
    integer(runtime.seed, 0, 0xffffffff, 'seed');
    integer(runtime.timeoutMs, 1000, 3600000, 'timeoutMs');
    integer(runtime.maxTurns, 1, 500, 'maxTurns');
    for (const name of ['budgetUsd', 'judgeBudgetUsd']) if ((backend === 'docker' || runtime[name] !== undefined) && (!Number.isFinite(runtime[name]) || runtime[name] <= 0 || runtime[name] > 100)) throw new Error(`Invalid ${name}`);
    return runtime;
}

function runtimeBackend(runtime) { return runtime.backend === undefined ? (Object.hasOwn(runtime, 'image') ? 'docker' : 'host') : runtime.backend; }

function runtimeIdentity(runtime, observed, requestId) {
    if (runtimeBackend(runtime) === 'docker') return observed?.sessionId === requestId && observed.hostVersion?.startsWith(`${runtime.claudeVersion} `);
    return Boolean(observed?.requestId === requestId && typeof observed.sessionId === 'string' && observed.sessionId && observed.hostVersion === runtime.cliVersion && observed.host === runtime.host);
}

function validateReview(value) {
    if (!value || Object.keys(value).some(key => !['scores', 'findings'].includes(key)) || !value.scores || Object.keys(value.scores).some(key => !DIMENSIONS.includes(key)) || !Array.isArray(value.findings) || value.findings.length > 50) throw new Error('Invalid reviewer output');
    for (const name of DIMENSIONS) {
        const score = value.scores[name];
        integer(score?.score, 0, 4, `review ${name}`);
        text(score.evidence, 2000, `review evidence ${name}`);
    }
    for (const finding of value.findings) {
        if (!['critical', 'high', 'medium', 'low'].includes(finding.severity)) throw new Error('Invalid finding severity');
        text(finding.evidence, 2000, 'finding evidence');
        text(finding.consequence, 2000, 'finding consequence');
    }
    return value;
}

function measurements(value = {}) {
    const result = {};
    for (const key of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens', 'costUsd']) {
        const number = value[key];
        result[key] = Number.isFinite(number) && number >= 0 && (key === 'costUsd' || Number.isInteger(number)) ? number : null;
    }
    return result;
}

module.exports = { DIMENSIONS, validateCase, validateRuntime, validateReview, measurements, runtimeBackend, runtimeIdentity, validateAssessmentPolicy, defaultAssessmentPolicy, assessmentPolicy };
