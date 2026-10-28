'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { agentSurface, disposable, secretFile, withheldBenchmarkAsset, inventory, validateEntries } = require('./files.cjs');
const { runtimeBackend } = require('./contract.cjs');

// The same installation boundary serves paired preparation and reusable context setup.
function frameworkInstallation({ sourceEntries = [], frameworkRoot, runtime }) {
    const permitted = file => !disposable(file) && !secretFile(file) && !withheldBenchmarkAsset(file);
    const installed = sourceEntries.filter(row => agentSurface(row.path) && !withheldBenchmarkAsset(row.path));
    const root = fs.realpathSync(frameworkRoot);
    const bundle = installed.some(row => row.path === '.claude/settings.json') ? installed : inventory(path.join(root, '.claude'), { filter: permitted }).map(row => ({ ...row, path: `.claude/${row.path}` }));
    const projections = [];
    if (runtimeBackend(runtime) === 'host' && runtime.host === 'codex' && !installed.some(row => row.path.startsWith('.agents/skills/'))) {
        for (const folder of ['.agents', '.codex']) {
            const directory = path.join(root, folder);
            if (!fs.existsSync(directory)) throw new Error('Native Codex requires generated framework projections; run sync-codex first');
            projections.push(...inventory(directory, { filter: permitted }).map(row => ({ ...row, path: `${folder}/${row.path}` })));
        }
    }
    return validateEntries([...new Map([...bundle, ...projections, ...installed].map(row => [row.path, row])).values()]);
}

module.exports = { frameworkInstallation };
