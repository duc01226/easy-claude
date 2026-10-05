'use strict';
// Business intent: LOW deferral cannot waive post-fix review or failed gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const policy = require('../../../scripts/lib/review-policy.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const tests = [
    { name: 'TC-R1LC-001 a scoped LOW fix cannot claim a fresh whole-target review', fn: () => {
        assert.throws(() => policy.evaluateRound({ round: 1, findings: [{ id: 'low', severity: 'LOW', resolution: 'scoped-fix-verified' }] }), /resolution/);
        assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'low', severity: 'LOW' }] }).canComplete, true);
        assert.equal(policy.evaluateRound({ round: 3, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', kind: 'test', status: 'FAIL' }] }).status, 'ESCALATE');
    } },
    { name: 'TC-R1LC-004 every post-fix edit requires fresh review including simplification', skip: isFrameworkRepo(root) ? false : 'authoring source contract', fn: () => {
        const w = JSON.parse(fs.readFileSync(path.join(root,'.claude/workflows.json'),'utf8')).workflows['workflow-review-changes'];
        const post = w.sequence.find(step => step.id === 'why-review');
        assert.match(post.applicability.when, /Any fix, simplification, spec\/doc\/test repair/);
        assert.doesNotMatch(post.applicability.skipReason, /LOW.*scoped check/);
    } }
];
module.exports = { name: 'round-one-low-closure', tests };
