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
