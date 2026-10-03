#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { containedPath } = require('./lib/review-target.cjs');
const { normalizeRequiredDocuments, MAX_ACTIVE_DOCUMENTS } = require('./lib/review-rule-policy.cjs');
const { prepareReview } = require('./lib/review-preparation.cjs');

function parseArgs(argv) {
    const options = { files: [], requiredDocs: [] };
    const names = { '--scope': 'scope', '--base': 'base', '--file': 'files', '--target-file': 'targetFile', '--skill': 'skillName', '--skill-mode': 'skillMode', '--required-doc': 'requiredDocs', '--output-dir': 'outputDir', '--acquire': 'acquire', '--provider-decision': 'providerDecision' };
    for (let index = 0; index < argv.length; index++) {
        const name = argv[index], field = names[name];
        if (!field || !argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error('invalid-cli-arguments');
        const value = argv[++index];
        if (field === 'files' || field === 'requiredDocs') {
            options[field].push(value);
            if (field === 'requiredDocs' && options[field].length > MAX_ACTIVE_DOCUMENTS) throw new Error('required-document-budget');
        } else { if (Object.prototype.hasOwnProperty.call(options, field)) throw new Error('duplicate-cli-argument'); options[field] = value; }
    }
    options.requiredDocs = normalizeRequiredDocuments(options.requiredDocs);
    if (options.skillMode !== undefined && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.skillMode)) throw new Error('invalid-cli-arguments');
    if (options.providerDecision !== undefined && options.providerDecision !== 'skip') throw new Error('invalid-cli-arguments');
    if (!options.outputDir || (options.acquire !== undefined && options.acquire !== 'never')) throw new Error('invalid-cli-arguments');
    if (options.targetFile && (options.scope !== undefined || options.base !== undefined || options.files.length)) throw new Error('mixed-target-capture');
    if (!options.targetFile) {
        options.scope ||= 'local';
        if (!['local', 'staged', 'branch', 'files'].includes(options.scope) || (options.scope === 'branch') !== (options.base !== undefined) || (options.scope === 'files') !== (options.files.length > 0)) throw new Error('invalid-cli-scope');
    }
    return options;
}

async function main(argv) {
    let options, rootDir;
    try {
        options = parseArgs(argv);
        const root = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env, preferCwdFallback: true });
        if (root.error) throw new Error('invalid-project-root');
        rootDir = fs.realpathSync.native(root.rootDir);
        if (options.targetFile) {
            const relative = path.relative(rootDir, path.resolve(rootDir, options.targetFile)).split(path.sep).join('/');
            const absolute = containedPath(rootDir, relative);
            if (fs.statSync(absolute).size > 8 * 1024 * 1024) throw new Error('invalid-target-file');
            options.target = JSON.parse(fs.readFileSync(absolute, 'utf8'));
        }
    } catch {
        process.stderr.write('review-prepare: invalid arguments, root or target manifest\n');
        return 1;
    }
    try {
        const result = await prepareReview({ rootDir, ...options });
        process.stdout.write(`${JSON.stringify({ schemaVersion: 1, manifest: path.relative(rootDir, path.resolve(rootDir, options.outputDir, 'manifest.json')).split(path.sep).join('/'), targetFingerprint: result.targetFingerprint, policyFingerprint: result.policyFingerprint, policySelection: result.policySelection, providerDecision: result.providerDecision, routing: result.routing, provider: { id: result.provider.id, status: result.provider.status, reason: result.provider.reason, version: result.provider.version, ...(result.provider.choices ? { choices: result.provider.choices } : {}) } })}\n`);
        return result.routing.status === 'ready' ? 0 : result.routing.status === 'policy-error' ? 2 : 3;
    } catch {
        process.stderr.write('review-prepare: unsafe or unavailable output directory\n');
        return 1;
    }
}

module.exports = { parseArgs, main };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
