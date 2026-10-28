'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = steps => {
    const run = spawnSync(process.execPath, [path.join(__dirname, 'probe.cjs')], {
        input: JSON.stringify(steps), encoding: 'utf8', timeout: 5000, maxBuffer: 8 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe', 'pipe']
    });
    assert.equal(run.status, 0, run.stderr || run.error?.message || 'Candidate process failed');
    assert(!run.signal && !run.error, 'Candidate process did not complete');
    const value = JSON.parse(run.output[3]);
    assert.deepEqual(Object.keys(value).sort(), steps.filter(step => step.id).map(step => step.id).sort(), 'Missing or extra candidate observations');
    return value;
};
