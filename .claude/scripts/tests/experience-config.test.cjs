'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { SCHEMA, validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
const { SKELETON } = require('../../hooks/lib/session-init-helpers.cjs');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const realConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/project-config.json'), 'utf8'));

test('TC-EXP-CONFIG-001: the optional experienceVerification contract is declared and real config validates', () => {
    assert.equal(SCHEMA.experienceVerification.type, 'object');
    assert.equal(validateConfig(realConfig).valid, true);
    assert.equal(validateConfig(SKELETON).valid, true);
});

test('TC-EXP-CONFIG-002: a configured surface carries project facts without a framework-specific enum', () => {
    const config = {
        ...realConfig,
        experienceVerification: {
            enabled: true,
            evidenceRoot: 'artifacts/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [{
                id: 'operator-transcript',
                kind: 'terminal',
                runner: 'existing-cli-harness',
                entryPoints: ['bin/tool'],
                changeTriggers: ['bin/**'],
                states: ['default', 'error']
            }]
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, true, result.errors.join('; '));
});

test('TC-EXP-CONFIG-003: incomplete configured experience block is rejected', () => {
    const config = { ...realConfig, experienceVerification: { enabled: true, surfaces: [] } };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('experienceVerification.evidenceRoot')));
    assert.ok(result.errors.some(error => error.includes('experienceVerification.baselineRoot')));
    assert.ok(result.errors.some(error => error.includes('experienceVerification.acceptancePolicy')));
});

test('TC-EXP-CONFIG-004: an empty disabled contract requires an honest reason', () => {
    const config = {
        ...realConfig,
        experienceVerification: {
            enabled: false,
            evidenceRoot: 'artifacts/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: []
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('notApplicableReason')));
});

test('TC-EXP-CONFIG-005: enabled experience verification requires a configured surface', () => {
    const config = {
        ...realConfig,
        experienceVerification: {
            enabled: true,
            evidenceRoot: 'artifacts/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [],
            notApplicableReason: 'The surface is not runnable yet.'
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('at least one observable surface')));
});

test('TC-EXP-CONFIG-006: malformed object-array entries produce path-specific errors instead of throwing', () => {
    for (const item of [null, [], 'surface', 17, false]) {
        const config = {
            ...realConfig,
            experienceVerification: { ...realConfig.experienceVerification, surfaces: [item] }
        };
        const result = validateConfig(config);
        assert.equal(result.valid, false);
        assert.ok(result.errors.includes('experienceVerification.surfaces[0]: expected object item'));
    }
    // The shared predicate also owns existing object-array clients.
    for (const field of ['modules', 'contextGroups', 'referenceDocs']) {
        const result = validateConfig({ ...realConfig, [field]: [null] });
        assert.equal(result.valid, false);
        assert.ok(result.errors.includes(`${field}[0]: expected object item`));
    }
    assert.equal(validateConfig(realConfig).valid, true);
});

function surfaceConfig(enabled = true) {
    return {
        ...realConfig,
        experienceVerification: {
            enabled,
            evidenceRoot: 'artifacts/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [{ id: 'operator', kind: 'terminal', runner: 'cli-harness', entryPoints: ['bin/tool'] }]
        }
    };
}

function expectSurfaceError(result, field, detail) {
    assert.equal(result.valid, false);
    assert.deepEqual(Array.from(result.errors), [`experienceVerification.surfaces[0].${field}: ${detail}`]);
}

test('TC-EXP-CONFIG-007: each surface identity and entry-point field is independently required and typed', () => {
    // Invariant: an otherwise valid surface must not conceal a missing or malformed field.
    assert.equal(validateConfig(surfaceConfig()).valid, true);
    for (const field of ['id', 'kind', 'runner', 'entryPoints']) {
        for (const state of ['missing', 'null', 'wrong-type']) {
            const config = surfaceConfig();
            const surface = config.experienceVerification.surfaces[0];
            if (state === 'missing') delete surface[field];
            else surface[field] = state === 'null' ? null : 42;
            const detail = state === 'wrong-type'
                ? `expected ${field === 'entryPoints' ? 'array' : 'string'}, got number`
                : 'required field is missing';
            expectSurfaceError(validateConfig(config), field, detail);
        }
    }
});

const disabledWarning = 'experienceVerification: surfaces are configured while the contract is disabled; conditional experience review routing is off until enabled';
function expectDisabledWarning(result) {
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.includes(disabledWarning), result.warnings.join('; '));
}

test('TC-EXP-CONFIG-008: disabled configured surfaces warn without rejecting valid configuration', () => {
    expectDisabledWarning(validateConfig(surfaceConfig(false)));
    const enabled = validateConfig(surfaceConfig(true));
    assert.equal(enabled.valid, true);
    assert.equal(enabled.warnings.includes(disabledWarning), false, 'enabled routing must not report disabled');
});

function loadSchemaSource(source) {
    const module = { exports: {} };
    vm.runInNewContext(source, { module, exports: module.exports, require: { main: null } }, { filename: 'project-config-schema.cjs', timeout: 5000 });
    return module.exports.validateConfig;
}

test('TC-EXP-CONFIG-009: actual required-field and type weakenings are killed by surface oracles', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../hooks/lib/project-config-schema.cjs'), 'utf8');
    const start = source.indexOf('    experienceVerification: {');
    const end = source.indexOf('            notApplicableReason:', start);
    assert.ok(start >= 0 && end > start, 'the owning schema block must exist');
    const block = source.slice(start, end);
    for (const field of ['id', 'kind', 'runner', 'entryPoints']) {
        const type = field === 'entryPoints' ? 'array' : 'string';
        const anchor = `${field}: { type: '${type}', required: true }`;
        assert.equal(block.split(anchor).length, 2, `one ${field} mutation site`);
        for (const change of ['required', 'type']) {
            const replacement = change === 'required'
                ? `${field}: { type: '${type}', required: false }`
                : `${field}: { type: 'unchecked', required: true }`;
            const mutant = loadSchemaSource(source.slice(0, start) + block.replace(anchor, replacement) + source.slice(end));
            assert.equal(mutant(surfaceConfig()).valid, true, 'mutant must still execute valid configuration');
            const config = surfaceConfig();
            if (change === 'required') delete config.experienceVerification.surfaces[0][field];
            else config.experienceVerification.surfaces[0][field] = 42;
            const result = mutant(config);
            assert.equal(result.valid, true, `${field}/${change} mutation must actually weaken the contract`);
            const detail = change === 'required' ? 'required field is missing' : `expected ${type}, got number`;
            assert.throws(() => expectSurfaceError(result, field, detail), { code: 'ERR_ASSERTION' });
        }
    }
});

test('TC-EXP-CONFIG-010: actual disabled-warning deletion is killed by its diagnostic oracle', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../hooks/lib/project-config-schema.cjs'), 'utf8');
    const anchor = `warnings.push('${disabledWarning}');`;
    assert.equal(source.split(anchor).length, 2, 'one warning mutation site');
    const mutant = loadSchemaSource(source.replace(anchor, '/* warning removed */'));
    const result = mutant(surfaceConfig(false));
    assert.equal(result.valid, true, 'warning removal must not prevent schema execution');
    assert.equal(result.warnings.includes(disabledWarning), false);
    assert.throws(() => expectDisabledWarning(result), { code: 'ERR_ASSERTION' });
});

const validLocalRun = {
    dependencyCommand: 'docker compose up -d',
    startCommand: 'npm run dev',
    workingDir: 'apps/web',
    readyCheck: 'curl -fsS http://127.0.0.1:5173/healthz',
    readyTimeoutSeconds: 120,
    teardownCommand: 'docker compose down',
    logSources: ['docker compose logs api', 'var/log/app.log'],
    credentialsRef: 'REVIEW_FIXTURE_USER'
};

function localRunConfig(localRun) {
    const config = surfaceConfig();
    config.experienceVerification.surfaces[0].localRun = localRun;
    return config;
}

test('TC-EXP-CONFIG-011: the optional local bring-up recipe is accepted whole and absent', () => {
    // Invariant: a review can record how to run the surface locally, and every
    // pre-existing surface without a recipe keeps validating unchanged.
    assert.equal(validateConfig(surfaceConfig()).valid, true, 'absent localRun must stay valid');
    const result = validateConfig(localRunConfig(validLocalRun));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(result.warnings.filter(warning => warning.includes('localRun')), [], 'declared fields must not warn as unknown');
});

test('TC-EXP-CONFIG-012: each local bring-up field is type-checked at its own path', () => {
    // Invariant: a malformed command accepted here becomes an unrunnable recipe
    // the review only discovers against a dead environment, one round too late.
    for (const field of Object.keys(validLocalRun)) {
        const expected = field === 'readyTimeoutSeconds' ? 'number' : field === 'logSources' ? 'array' : 'string';
        const wrongValue = expected === 'number' ? 'soon' : 42;
        const got = expected === 'number' ? 'string' : 'number';
        const result = validateConfig(localRunConfig({ ...validLocalRun, [field]: wrongValue }));
        assert.equal(result.valid, false, `${field} must be type-checked`);
        assert.deepEqual(
            Array.from(result.errors),
            [`experienceVerification.surfaces[0].localRun.${field}: expected ${expected}, got ${got}`]
        );
    }
    const unknown = validateConfig(localRunConfig({ ...validLocalRun, startCmd: 'npm start' }));
    assert.equal(unknown.valid, true, 'an unknown recipe field warns, never rejects');
    assert.ok(unknown.warnings.includes('experienceVerification.surfaces[0].localRun.startCmd: unknown property (not in schema)'));
});

test('TC-EXP-CONFIG-013: actual freeform weakening of the bring-up recipe is killed by its type oracle', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../hooks/lib/project-config-schema.cjs'), 'utf8');
    const anchor = "                    localRun: {\n                        type: 'object',\n                        required: false,";
    assert.equal(source.split(anchor).length, 2, 'one localRun mutation site');
    const mutant = loadSchemaSource(source.replace(anchor, `${anchor}\n                        freeform: true,`));
    assert.equal(mutant(surfaceConfig()).valid, true, 'mutant must still execute valid configuration');
    const result = mutant(localRunConfig({ ...validLocalRun, startCommand: 42 }));
    assert.equal(result.valid, true, 'the freeform mutation must actually weaken the contract');
    assert.equal(result.errors.length, 0);
});

function e2eConfig(execution, surface = {}) {
    return {
        ...SKELETON,
        e2eTesting: {
            framework: 'playwright',
            language: 'typescript',
            execution
        },
        experienceVerification: {
            ...SKELETON.experienceVerification,
            enabled: true,
            surfaces: [{
                id: 'web',
                kind: 'web',
                runner: 'playwright-cli',
                entryPoints: ['apps/web'],
                ...surface
            }]
        }
    };
}

const validE2eExecution = {
    surfaceIds: ['web'],
    auth: {
        mode: 'fixture',
        credentialsRef: 'env:E2E_REVIEW_USER',
        loginPath: '/login'
    },
    data: {
        seedCommand: 'npm run seed:e2e',
        workingDir: 'apps/web',
        mode: 'idempotent',
        cleanupPolicy: 'current-run ephemeral data only after evidence capture'
    },
    browser: {
        runner: 'playwright-cli',
        engine: 'chromium',
        headed: true,
        actionDelayMs: 250
    },
    evidence: {
        root: 'plans/reports/e2e',
        capture: ['screenshot', 'console', 'requests', 'trace', 'video'],
        redaction: 'project-configured redactor'
    },
    convergence: {
        maxAttempts: 3,
        consecutiveGreen: 2,
        settleTimeoutSeconds: 120
    }
};

test('TC-E2E-CONFIG-014: a complete optional E2E execution profile validates and is discoverable', () => {
    const result = validateConfig(e2eConfig(validE2eExecution));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(result.warnings, []);
    assert.equal(SCHEMA.e2eTesting.properties.execution.type, 'object');
    assert.equal(SCHEMA.e2eTesting.properties.execution.properties.browser.properties.runner.type, 'string');
    const description = require('../../hooks/lib/project-config-schema.cjs').describeSchema();
    for (const field of ['surfaceIds', 'auth', 'data', 'browser', 'evidence', 'convergence', 'actionDelayMs', 'redaction', 'consecutiveGreen']) {
        assert.ok(description.includes(field), `--describe output must include ${field}`);
    }
});

test('TC-E2E-CONFIG-015: a partial profile remains valid but exposes unresolved capability as a warning', () => {
    const config = e2eConfig({
        surfaceIds: ['not-configured-yet'],
        browser: { headed: true }
    });
    const result = validateConfig(config);
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.some(warning => warning.includes('surfaceIds[0]')));
    assert.equal(config.e2eTesting.execution.browser.headed, true);
    assert.equal(config.e2eTesting.execution.auth, undefined);
});

test('TC-E2E-CONFIG-016: declared nested fields keep path-specific type validation', () => {
    const mutations = [
        ['surfaceIds', 42, 'e2eTesting.execution.surfaceIds: expected array, got number'],
        ['auth', 'fixture', 'e2eTesting.execution.auth: expected object, got string'],
        ['browser', [], 'e2eTesting.execution.browser: expected object, got array'],
        ['evidence', { capture: [42] }, 'e2eTesting.execution.evidence.capture[0]: expected string, got number'],
        ['convergence', { maxAttempts: 'three' }, 'e2eTesting.execution.convergence.maxAttempts: expected number, got string']
    ];
    for (const [field, value, expected] of mutations) {
        const result = validateConfig(e2eConfig({ [field]: value }));
        assert.equal(result.valid, false, `${field} mutation must fail`);
        assert.ok(result.errors.includes(expected), `${field}: ${result.errors.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-017: unsafe paths, unsupported modes, invalid pacing, and unbounded convergence are rejected', () => {
    const config = e2eConfig({
        surfaceIds: ['web'],
        auth: { mode: 'unknown' },
        data: { mode: 'reset-all', workingDir: '../shared' },
        browser: { actionDelayMs: 2501 },
        evidence: { root: '../outside', capture: ['dom-dump'] },
        convergence: { maxAttempts: 0, consecutiveGreen: 4, settleTimeoutSeconds: 601 }
    });
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    for (const fragment of [
        'auth.mode: unsupported mode',
        'data.mode: unsupported mode',
        'data.workingDir: must be a project-relative path',
        'browser.actionDelayMs: expected an integer from 0 through 2000',
        'evidence.root: must be a project-relative path',
        'evidence.capture[0]: unsupported capture',
        'convergence.maxAttempts: expected an integer from 1 through 10',
        'convergence.settleTimeoutSeconds: expected an integer from 1 through 600'
    ]) {
        assert.ok(result.errors.some(error => error.includes(fragment)), `${fragment}: ${result.errors.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-018: credential-looking literals in references and commands are warned', () => {
    const result = validateConfig(e2eConfig({
        auth: {
            mode: 'fixture',
            credentialsRef: 'password=not-a-reference',
            registrationCommand: 'npm run register -- --password hunter2'
        },
        data: { seedCommand: 'npm run seed -- --token abc123' },
        evidence: { capture: ['requests'] }
    }, { localRun: { credentialsRef: 'password=inline' } }));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.some(warning => warning.includes('credentialsRef') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('registrationCommand') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('seedCommand') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('localRun.credentialsRef') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('evidence.redaction')));
});

test('TC-E2E-CONFIG-019: blank conditional capabilities remain unresolved', () => {
    const cases = [
        [{ auth: { mode: 'fixture', credentialsRef: ' ' } }, 'auth.credentialsRef'],
        [{ auth: { mode: 'storage-state', storageStateRef: ' ' } }, 'auth.storageStateRef'],
        [{ auth: { mode: 'registration', registrationCommand: ' ' } }, 'auth.registrationCommand'],
        [{ data: { mode: 'idempotent', seedCommand: ' ' } }, 'data.seedCommand'],
        [{ evidence: { capture: ['requests'], redaction: ' ' } }, 'evidence.redaction'],
        [{ evidence: { capture: ['screenshot'], redaction: ' ' } }, 'evidence.redaction']
    ];
    for (const [execution, fragment] of cases) {
        const result = validateConfig(e2eConfig(execution));
        assert.equal(result.valid, true, result.errors.join('; '));
        assert.ok(result.warnings.some(warning => warning.includes(fragment)), `${fragment}: ${result.warnings.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-020: the real project configuration keeps its explicit E2E state', () => {
    const e2e = realConfig.e2eTesting;
    if (e2e === undefined) {
        assert.equal(validateConfig(realConfig).valid, true);
        return;
    }

    assert.equal(typeof e2e, 'object');
    assert.equal(typeof e2e.framework, 'string');
    assert.ok(e2e.framework.trim().length > 0);

    if (e2e.framework === 'none') {
        assert.deepEqual(e2e.entryPoints, []);
        assert.deepEqual(e2e.runCommands, {});
    } else {
        assert.ok(Array.isArray(e2e.entryPoints));
        assert.ok(e2e.runCommands && typeof e2e.runCommands === 'object' && !Array.isArray(e2e.runCommands));
    }

    assert.equal(validateConfig(realConfig).valid, true);
});
