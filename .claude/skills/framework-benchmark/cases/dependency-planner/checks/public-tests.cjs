'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

module.exports = (root, files) => {
    assert(files.length > 0 && files.length <= 200, 'Discover bounded public test files');
    let passed = 0;
    for (const file of [...files].sort()) {
        const run = spawnSync(process.execPath, [`--test-reporter=${path.join(__dirname, 'public-test-reporter.cjs')}`, '--require', path.join(__dirname, 'public-test-preload.cjs'), file], {
            cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe', 'pipe']
        });
        assert.equal(run.status, 0, run.stderr || run.error?.message);
        assert(!run.error && !run.signal, 'Public test process must complete');
        const receipts = String(run.output[3] || '').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
        assert.equal(receipts.length, 2, 'Require normal process and native reporter completion');
        assert.equal(receipts.filter(row => row.event === 'completed' && Object.keys(row).length === 1).length, 1, 'Test process must drain normally');
        const result = receipts.find(row => row.event === 'tests');
        assert(result?.complete === true && Object.keys(result).length === 4, 'Native test reporting must complete');
        assert(Number.isSafeInteger(result.passed) && result.passed >= 0 && Number.isSafeInteger(result.failed) && result.failed >= 0);
        assert.equal(result.failed, 0, 'Public tests must pass');
        passed += result.passed;
    }
    assert(passed > 0, 'At least one non-skipped, non-todo public test must execute and pass');
    console.log(`Public tests: ${passed} completed passes, 0 failures`);
};
