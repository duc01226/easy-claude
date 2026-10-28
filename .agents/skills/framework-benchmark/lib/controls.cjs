'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { inventory, fingerprint, json } = require('./files.cjs');
const { assessmentPolicy, runtimeBackend } = require('./contract.cjs');
const { load, verifyFrozen, appFilter } = require('./experiment.cjs');
const evaluation = require('./evaluation.cjs');
const host = require('./host.cjs');

// Controls use the frozen assessment instrument without launching or repairing a solver.
// Expected verdicts belong to the caller, outside these anonymous model inputs.
async function assessControl({ runRoot, candidateRoot, outputRoot }, ports = {}) {
    const { root: preparedRoot, state } = load(runRoot);
    verifyFrozen(preparedRoot, state);
    if (state.phase !== 'prepared' || fs.existsSync(path.join(preparedRoot, 'attempt.lock'))) throw new Error('Assess controls before attempting the frozen experiment');
    const policy = assessmentPolicy(state.case);
    if (policy.profile !== 'skilled-v1' || runtimeBackend(state.runtime) !== 'host') throw new Error('Reviewer controls require the native skilled assessment profile');
    const isContext = file => state.projectSetup.contextRoots.some(owner => file === owner || file.startsWith(`${owner}/`));
    const candidate = inventory(fs.realpathSync(candidateRoot), { filter: file => appFilter(file) && !isContext(file) });
    const frozenToolkit = inventory(path.join(preparedRoot, 'evaluator'));
    const root = fs.mkdtempSync(path.join(fs.realpathSync(outputRoot), 'control-'));
    const start = performance.now();
    const result = { schemaVersion: 1, owner: 'framework-benchmark-control-v1', phase: 'running', createdAt: new Date().toISOString(),
        experimentIdentity: state.identity, candidateHash: fingerprint(candidate), expectedVerdictSupplied: false,
        assessment: null, error: null, wallMs: 0 };
    const save = () => { result.wallMs = Math.round(performance.now() - start); json(path.join(root, 'result.json'), result); };
    save();
    const transport = ports.transport || host;
    try {
        result.environment = await transport.preflight(state.runtime, { workspace: preparedRoot }); save();
        result.assessment = await evaluation.assess({ root, artifactDir: 'assessment', spec: state.case, runtime: state.runtime, checks: [], candidate,
            frozenToolkit, policy, sessions: new Set(), onProgress: assessment => { result.assessment = assessment; save(); } }, transport);
        verifyFrozen(preparedRoot, state);
        result.phase = result.assessment.valid ? 'complete' : 'inconclusive';
    } catch (error) { result.phase = 'blocked'; result.error = error.message; }
    finally { save(); }
    return { root, result };
}

module.exports = { assessControl };
