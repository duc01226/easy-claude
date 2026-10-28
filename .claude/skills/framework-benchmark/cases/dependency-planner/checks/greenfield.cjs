'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = process.env.BENCH_WORKSPACE || '/workspace';
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(typeof metadata.name === 'string' && metadata.name.trim());
assert(typeof metadata.version === 'string' && metadata.version.trim());
assert(/\bnode\s+--test\b/.test(metadata.scripts?.test || ''), 'Declare the requested Node test command');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert(readme.includes('createPlanner') && readme.includes('plan.cjs'), 'Document both API and CLI usage');
const tests = [];
function discover(dir) {
    for (const row of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'tmp', 'temp'].includes(row.name)) continue;
        const file = path.join(dir, row.name);
        if (row.isDirectory()) discover(file);
        else if (/\.test\.(?:cjs|mjs|js)$/.test(row.name)) tests.push(file);
    }
}
discover(root);
require('./public-tests.cjs')(root, tests);
require('./acceptance.cjs');
// The new project's public CLI must accept a complete JSON request, emit only the order and reject errors.
const good = spawnSync(process.execPath, [path.join(root, 'bin/plan.cjs')], {
    input: JSON.stringify({ tasks: [{ id: 'ship', requires: ['build'] }, { id: 'build' }], targets: ['ship'] }), encoding: 'utf8', timeout: 5000
});
assert.equal(good.status, 0, good.stderr);
assert.deepEqual(JSON.parse(good.stdout), ['build', 'ship']);
for (const [input, expected] of [['not-json', 'INVALID_INPUT'], [JSON.stringify({ tasks: [{ id: 'a', requires: ['missing'] }] }), 'UNKNOWN_TASK']]) {
    const bad = spawnSync(process.execPath, [path.join(root, 'bin/plan.cjs')], { input, encoding: 'utf8', timeout: 5000 });
    assert.notEqual(bad.status, 0); assert.equal(bad.stderr.trim(), expected);
}
console.log('Greenfield API and CLI acceptance passed');
