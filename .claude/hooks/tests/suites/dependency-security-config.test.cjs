/**
 * Dependency Security Config Test Suite
 *
 * Guards the optional `dependencySecurity` project setting of the Dependency Remediation capability
 * (docs/specs/WorkflowExecution/README.DependencyRemediation.md, BR-DPR-13): a well-formed or absent
 * policy loads, a malformed one is refused with the bad setting named, and every policy field has
 * help text.
 *
 * Coverage:
 *   TC-DPR-013 — the policy fails closed: wrong types, unknown keys and missing required scanner
 *                fields are errors naming the field; absent and empty policies load; every field
 *                carries help text.
 *
 * Portability: the schema ships inside `.claude/`, so every row runs in any project. No file I/O
 * beyond requiring the schema module; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const { validateConfig, SCHEMA } = require(path.join(__dirname, '..', '..', 'lib', 'project-config-schema.cjs'));

const BASE = { project: { name: 'sample-project' } };
const policyErrors = config => (validateConfig(config).errors || []).filter(e => e.startsWith('dependencySecurity'));

const WELL_FORMED = {
    scanners: [{ name: 'lock scanner', command: 'scan-tool --lockfile app.lock', lockfiles: ['app.lock'], configFile: 'scan-tool.toml' }],
    acceptedEntries: { maxDays: 90 },
    deadlinesDays: { critical: 7, high: 30, medium: 90, low: 180 },
    alertOwner: 'platform team',
    scheduledScan: { workflow: 'scheduled-scan.yml', issueLabel: 'scan-failure' }
};

/** Every field of a schema node with its help text, as [dotted path, describe]. */
function fields(node, prefix) {
    const out = [];
    const props = node.properties || node.itemSchema || {};
    for (const [key, child] of Object.entries(props)) {
        const at = node.itemSchema ? `${prefix}[].${key}` : `${prefix}.${key}`;
        out.push([at, child.describe]);
        out.push(...fields(child, at));
    }
    return out;
}

const tests = [
    {
        name: 'TC-DPR-013 a well-formed, empty or absent policy loads',
        fn: () => {
            assert.deepEqual(policyErrors(BASE), [], 'absent policy loads');
            assert.deepEqual(policyErrors({ ...BASE, dependencySecurity: {} }), [], 'empty policy loads (every key is optional)');
            assert.deepEqual(policyErrors({ ...BASE, dependencySecurity: WELL_FORMED }), [], 'well-formed policy loads');
            assert.equal(validateConfig({ ...BASE, dependencySecurity: WELL_FORMED }).valid, true);
        }
    },
    {
        name: 'TC-DPR-013 a malformed policy is refused with the bad setting named',
        fn: () => {
            const cases = [
                [{ deadlinesDays: { critical: '7' } }, 'dependencySecurity.deadlinesDays.critical: expected number'],
                [{ scaners: [] }, 'dependencySecurity.scaners: unknown property'],
                [{ scanners: [{ name: 'a', command: 'b', cmd: 'c' }] }, 'dependencySecurity.scanners[0].cmd: unknown property'],
                [{ scanners: [{ name: 'a' }] }, 'dependencySecurity.scanners[0].command: required field is missing'],
                [{ acceptedEntries: { maxDays: 'ninety' } }, 'dependencySecurity.acceptedEntries.maxDays: expected number'],
                [{ scheduledScan: { workflow: 'x', label: 'y' } }, 'dependencySecurity.scheduledScan.label: unknown property'],
                [{ scanners: { name: 'a' } }, 'dependencySecurity.scanners: expected array']
            ];
            for (const [policy, expected] of cases) {
                const result = validateConfig({ ...BASE, dependencySecurity: policy });
                assert.equal(result.valid, false, `refused: ${JSON.stringify(policy)}`);
                assert.ok(result.errors.some(e => e.startsWith(expected)), `names the setting: ${expected} — got ${JSON.stringify(result.errors)}`);
            }
        }
    },
    {
        name: 'TC-DPR-013 every policy field carries help text',
        fn: () => {
            const node = SCHEMA.dependencySecurity;
            assert.ok(node, 'the schema declares dependencySecurity');
            assert.equal(node.required, false, 'the policy is optional');
            assert.ok(typeof node.describe === 'string' && node.describe.length > 0, 'the section has help text');
            const all = fields(node, 'dependencySecurity');
            assert.ok(all.length >= 12, 'every documented field is walked');
            for (const [at, describe] of all) assert.ok(typeof describe === 'string' && describe.trim().length > 0, `${at} has help text`);
        }
    }
];

module.exports = { name: 'dependency-security-config', tests };
