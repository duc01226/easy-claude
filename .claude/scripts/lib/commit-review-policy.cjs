'use strict';

// Review selection only: no Git authority, test waiver, receipt or review execution.
const fs = require('node:fs');
const routing = require('./workflow-routing-config.cjs');

const MODES = Object.freeze(['lightweight', 'risk-based']);
const RISKS = Object.freeze(['low', 'medium', 'high']);

function readMode(file) {
    if (!file) return undefined;
    let config;
    try {
        config = JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw new Error(`Cannot read commit review settings: ${file}`);
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error(`Expected a config object: ${file}`);
    }
    if (config.commit === undefined) return undefined;
    if (!config.commit || typeof config.commit !== 'object' || Array.isArray(config.commit)) {
        throw new Error(`Expected commit settings object: ${file}`);
    }
    const mode = config.commit.reviewMode;
    if (mode !== undefined && !MODES.includes(mode)) {
        throw new Error(`Invalid commit.reviewMode in ${file}; expected ${MODES.join(' or ')}`);
    }
    return mode;
}

function resolveCommitReviewMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const layers = [{ source: 'default', mode: 'lightweight' }];
    for (const [source, file] of [
        ['project-config', routing.resolveProjectConfigPath(rootDir)],
        ['user-config', routing.resolveUserConfigPath(options.homeDir)],
        ['local-override', routing.resolveLocalOverridePath(rootDir)]
    ]) {
        layers.push({ source, file, mode: readMode(file) });
    }
    const value = env.CK_COMMIT_REVIEW_MODE;
    if (value !== undefined && value.trim() !== '') {
        const mode = value.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase();
        if (!MODES.includes(mode)) throw new Error(`Invalid CK_COMMIT_REVIEW_MODE; expected ${MODES.join(' or ')}`);
        layers.push({ source: 'environment', mode });
    }
    const winner = layers.filter(layer => layer.mode !== undefined).at(-1);
    return { mode: winner.mode, source: winner.source, layers };
}

const GATE_MODES = Object.freeze(['off', 'enforce']);

/**
 * `reviewGate.mode`, a team policy read from the project config only: a personal layer can neither
 * relax nor enable it. `enforce` makes `gh pr create` / `gh pr ready` need a whole-branch receipt and
 * makes a review receipt count only when a review skill run was attested before its snapshot.
 * A config file that cannot be read or parsed reads as off: a team that never opted in is never
 * blocked by an unrelated mistake. A readable `reviewGate` entry that is not a valid object or mode
 * throws; callers that gate read that as enforce, so a team that opted in with a typo keeps the gate.
 */
function resolveReviewGateMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const file = routing.resolveProjectConfigPath(rootDir);
    let config;
    try {
        config = JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch (error) {
        return { mode: 'off', source: error.code === 'ENOENT' ? 'default' : 'unreadable-project-config' };
    }
    const gate = config && typeof config === 'object' && !Array.isArray(config) ? config.reviewGate : undefined;
    if (gate === undefined) return { mode: 'off', source: 'default' };
    if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new Error(`Invalid reviewGate in ${file}; expected an object such as { "mode": "enforce" }`);
    if (gate.mode === undefined) return { mode: 'off', source: 'default' };
    if (!GATE_MODES.includes(gate.mode)) throw new Error(`Invalid reviewGate.mode in ${file}; expected ${GATE_MODES.join(' or ')}`);
    return { mode: gate.mode, source: 'project-config' };
}

const DEFAULT_STATUS_CONTEXT = 'Review validation';

/**
 * `reviewGate.status`, the commit status `review-receipt.cjs publish-status` posts on a pull
 * request's head for branch protection to require. A team policy read from the project config only,
 * off by default. Unreadable config reads as off (nothing is published); a readable but invalid
 * entry throws, so the publisher refuses rather than guess the team's settings.
 */
function resolveReviewStatus(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const file = routing.resolveProjectConfigPath(rootDir);
    const off = source => ({ enabled: false, context: DEFAULT_STATUS_CONTEXT, requireAttestation: false, source });
    let config;
    try {
        config = JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch (error) {
        return off(error.code === 'ENOENT' ? 'default' : 'unreadable-project-config');
    }
    const gate = config && typeof config === 'object' && !Array.isArray(config) ? config.reviewGate : undefined;
    if (gate === undefined) return off('default');
    if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new Error(`Invalid reviewGate in ${file}; expected an object`);
    const status = gate.status;
    if (status === undefined) return off('default');
    if (!status || typeof status !== 'object' || Array.isArray(status)) throw new Error(`Invalid reviewGate.status in ${file}; expected an object such as { "enabled": true }`);
    for (const key of ['enabled', 'requireAttestation']) {
        if (status[key] !== undefined && typeof status[key] !== 'boolean') throw new Error(`Invalid reviewGate.status.${key} in ${file}; expected true or false`);
    }
    const context = status.context === undefined ? DEFAULT_STATUS_CONTEXT : status.context;
    if (typeof context !== 'string' || context.length === 0 || context.length > 100 || context.trim() !== context || /[\x00-\x1f\x7f]/.test(context)) {
        throw new Error(`Invalid reviewGate.status.context in ${file}; expected 1-100 printable characters`);
    }
    return { enabled: status.enabled === true, context, requireAttestation: status.requireAttestation === true, source: 'project-config' };
}

function selectReview(risk, mode) {
    if (!RISKS.includes(risk)) throw new Error(`Expected risk: ${RISKS.join(', ')}`);
    if (!MODES.includes(mode)) throw new Error(`Expected review mode: ${MODES.join(', ')}`);
    const skill = mode === 'lightweight' ? 'commit-review' : risk === 'medium' ? 'why-review'
        : risk === 'high' ? 'changes-review' : null;
    return { action: skill ? 'review' : 'skip', skill, maxRounds: skill ? 2 : 0 };
}

function decideReview(options = {}) {
    const operation = options.operation || 'commit';
    if (!['commit', 'pull-request'].includes(operation)) throw new Error('Expected operation: commit or pull-request');
    // A local commit preference never downgrades the PR's whole-branch review.
    const settings = operation === 'pull-request'
        ? { mode: 'risk-based', source: 'pull-request', layers: [] }
        : resolveCommitReviewMode(options);
    return { operation, risk: options.risk, ...settings, ...selectReview(options.risk, settings.mode) };
}

function main(argv = process.argv.slice(2)) {
    try {
        const options = {};
        for (const arg of argv) {
            const match = /^--(risk|operation)=(.+)$/.exec(arg);
            if (!match || options[match[1]] !== undefined) throw new Error(`Unsupported or repeated argument: ${arg}`);
            options[match[1]] = match[2];
        }
        if (options.operation && !options.risk) throw new Error('--operation requires --risk');
        // Run from the requested checkout root, as the commit and PR skills require.
        console.log(JSON.stringify(options.risk ? decideReview(options) : resolveCommitReviewMode(options), null, 2));
        return 0;
    } catch (error) {
        console.error(error.message);
        return 1;
    }
}

module.exports = { MODES, RISKS, GATE_MODES, DEFAULT_STATUS_CONTEXT, resolveCommitReviewMode, resolveReviewGateMode, resolveReviewStatus, selectReview, decideReview, main };
if (require.main === module) process.exitCode = main();
