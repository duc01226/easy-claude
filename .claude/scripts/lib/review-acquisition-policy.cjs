'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { validateCkConfig } = require('../../hooks/lib/ck-config-schema.cjs');

const MACHINE_KEYS = new Set(['execution', 'acquisition', 'network', 'binaryPath', 'cacheDir']);
const MAX_POLICY_BYTES = 64 * 1024;

function absoluteMachinePath(value) {
    return typeof value === 'string' && value.trim() === value && value !== '' &&
        !/[\0\r\n]/.test(value) && path.isAbsolute(value) && path.resolve(value) !== path.parse(value).root;
}

/** Read the personal and ignored local declarations separately: a merged team config is not permission. */
function readMachineDeclaration(file) {
    let stat;
    try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_POLICY_BYTES) throw new Error('machine-policy-invalid');
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('machine-policy-invalid');
    if (!Object.hasOwn(config, 'reviewTools')) return null;
    const tools = config.reviewTools;
    if (!tools || typeof tools !== 'object' || Array.isArray(tools) || Object.keys(tools).some(key => key !== 'openCodeReview')) {
        throw new Error('machine-policy-invalid');
    }
    if (!Object.hasOwn(tools, 'openCodeReview')) return null;
    const declared = tools.openCodeReview;
    if (!declared || typeof declared !== 'object' || Array.isArray(declared) || Object.keys(declared).some(key => !MACHINE_KEYS.has(key))) {
        throw new Error('machine-policy-invalid');
    }
    const result = validateCkConfig({ reviewTools: { openCodeReview: declared } });
    if (result.errors.length ||
        ['execution', 'network'].some(key => Object.hasOwn(declared, key) && typeof declared[key] !== 'boolean') ||
        (Object.hasOwn(declared, 'acquisition') && !['auto', 'never'].includes(declared.acquisition)) ||
        ['binaryPath', 'cacheDir'].some(key => Object.hasOwn(declared, key) && !absoluteMachinePath(declared[key]))) {
        throw new Error('machine-policy-invalid');
    }
    return declared;
}

function resolveAcquisitionPolicy({ rootDir, env = process.env, acquire } = {}) {
    const refused = { status: 'invalid', reason: 'machine-policy-invalid', execution: false, acquisition: 'never', network: false, binaryPath: null, cacheDir: null };
    try {
        if (!absoluteMachinePath(rootDir) || (acquire !== undefined && !['auto', 'never'].includes(acquire))) return refused;
        const home = process.platform === 'win32' ? env.USERPROFILE || env.HOME || os.homedir() : env.HOME || os.homedir();
        if (!absoluteMachinePath(home)) return refused;
        const declarations = [
            readMachineDeclaration(path.join(home, '.claude', '.ck.json')),
            readMachineDeclaration(path.join(rootDir, '.claude', '.ck.local.json')),
        ].filter(Boolean);
        const value = { status: 'ready', reason: null, execution: true, acquisition: 'auto', network: true, binaryPath: null, cacheDir: path.join(home, '.claude', 'cache', 'review-tools') };
        for (const declared of declarations) {
            if (declared.execution === false) value.execution = false;
            if (declared.acquisition === 'never') value.acquisition = 'never';
            if (declared.network === false) value.network = false;
            for (const key of ['binaryPath', 'cacheDir']) if (declared[key]) value[key] = declared[key];
        }
        if (env.CK_REVIEW_TOOL_EXECUTE === '0') value.execution = false;
        if (env.CK_REVIEW_TOOL_INSTALL === '0' || acquire === 'never') value.acquisition = 'never';
        if (env.CK_REVIEW_TOOL_NETWORK === '0') value.network = false;
        for (const [key, variable] of [['binaryPath', 'CK_REVIEW_TOOL_BINARY'], ['cacheDir', 'CK_REVIEW_TOOL_CACHE']]) {
            if (env[variable] !== undefined && env[variable] !== '') {
                if (!absoluteMachinePath(env[variable])) return refused;
                value[key] = env[variable];
            }
        }
        if (!value.execution) value.reason = 'execution-denied';
        else if (value.acquisition === 'never') value.reason = 'acquisition-denied';
        else if (!value.network) value.reason = 'network-denied';
        return value;
    } catch {
        return refused;
    }
}

module.exports = { resolveAcquisitionPolicy, absoluteMachinePath };
