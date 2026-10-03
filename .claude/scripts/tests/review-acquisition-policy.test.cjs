'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { resolveAcquisitionPolicy } = require('../lib/review-acquisition-policy.cjs');

function fixture(t) {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-machine-')));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const home = path.join(root, 'home'), project = path.join(root, 'project');
    for (const dir of [home, project]) fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    const env = { HOME: home, USERPROFILE: home, TMPDIR: root, TEMP: root, TMP: root, PATH: '' };
    const write = (owner, value, raw = false) => fs.writeFileSync(path.join(owner === 'personal' ? home : project, '.claude', owner === 'local' ? '.ck.local.json' : '.ck.json'), raw ? value : JSON.stringify(value));
    return { root, home, project, env, write, resolve: overrides => resolveAcquisitionPolicy({ rootDir: project, env, ...overrides }) };
}

test('TC-RVP-022: only machine declarations control acquisition; team preferences do not reverse refusal', t => {
    // Given a personal refusal and conflicting committed team/local allowances.
    const f = fixture(t);
    f.write('personal', { reviewTools: { openCodeReview: { execution: false, acquisition: 'never', network: false } } });
    f.write('team', { reviewTools: { openCodeReview: { execution: true, acquisition: 'auto', network: true } } });
    f.write('local', { reviewTools: { openCodeReview: { execution: true, acquisition: 'auto', network: true } } });
    // When explicit review resolves machine authority.
    const policy = f.resolve();
    // Then every refusal survives and source declarations are unchanged.
    assert.equal(policy.execution, false);
    assert.equal(policy.acquisition, 'never');
    assert.equal(policy.network, false);
    assert.equal(policy.reason, 'execution-denied');
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.home, '.claude', '.ck.json'), 'utf8')).reviewTools.openCodeReview.execution, false);
});

test('TC-RVP-077: refusal is monotonic across every machine authority combination', t => {
    // Given the bounded full boolean declaration domain, no property library is required for this exhaustive table.
    const f = fixture(t);
    for (const execute of [true, false]) for (const install of ['auto', 'never']) for (const network of [true, false]) {
        f.write('personal', { reviewTools: { openCodeReview: { execution: execute, acquisition: install, network } } });
        f.write('local', { reviewTools: { openCodeReview: { execution: true, acquisition: 'auto', network: true } } });
        // When more permissive local/env declarations are added.
        const policy = f.resolve({ env: { ...f.env, CK_REVIEW_TOOL_EXECUTE: '1', CK_REVIEW_TOOL_INSTALL: '1', CK_REVIEW_TOOL_NETWORK: '1' } });
        // Then grants never erase a denial.
        assert.equal(policy.execution, execute);
        assert.equal(policy.acquisition, install);
        assert.equal(policy.network, network);
    }
    // Given the opposite orientation: personal permits while ignored local independently denies.
    f.write('personal', { reviewTools: { openCodeReview: { execution: true, acquisition: 'auto', network: true } } });
    f.write('team', { reviewTools: { openCodeReview: { execution: true, acquisition: 'auto', network: true } } });
    for (const execute of [true, false]) for (const install of ['auto', 'never']) for (const network of [true, false]) {
        f.write('local', { reviewTools: { openCodeReview: { execution: execute, acquisition: install, network } } });
        const files = [path.join(f.home, '.claude', '.ck.json'), path.join(f.project, '.claude', '.ck.local.json'), path.join(f.project, '.claude', '.ck.json')];
        const before = files.map(file => fs.readFileSync(file, 'utf8'));
        // When team and deny-only environment controls attempt to grant all three dimensions.
        const policy = f.resolve({ env: { ...f.env, CK_REVIEW_TOOL_EXECUTE: '1', CK_REVIEW_TOOL_INSTALL: '1', CK_REVIEW_TOOL_NETWORK: '1' } });
        // Then the exact local denial combination survives without rewriting any declaration.
        assert.equal(policy.status, 'ready');
        assert.equal(policy.execution, execute);
        assert.equal(policy.acquisition, install);
        assert.equal(policy.network, network);
        assert.equal(policy.reason, !execute ? 'execution-denied' : install === 'never' ? 'acquisition-denied' : !network ? 'network-denied' : null);
        assert.deepEqual(files.map(file => fs.readFileSync(file, 'utf8')), before);
    }
    // And deny-only environment/CLI controls can further restrict portable defaults.
    f.write('personal', {});
    f.write('local', {});
    for (const [key, field, expected] of [['CK_REVIEW_TOOL_EXECUTE', 'execution', false], ['CK_REVIEW_TOOL_INSTALL', 'acquisition', 'never'], ['CK_REVIEW_TOOL_NETWORK', 'network', false]]) {
        assert.equal(f.resolve({ env: { ...f.env, [key]: '0' } })[field], expected);
    }
    assert.equal(f.resolve({ acquire: 'never' }).acquisition, 'never');
});

test('TC-RVP-051: absence permits isolated defaults, while malformed declared machine policy refuses safely', t => {
    // Given an isolated machine with no policy file or global package requirement.
    const f = fixture(t);
    // When preparation resolves defaults.
    const allowed = f.resolve();
    // Then it permits optional native execution/acquisition in the private home only.
    assert.equal(allowed.status, 'ready');
    assert.equal(allowed.execution, true);
    assert.equal(allowed.acquisition, 'auto');
    assert.equal(allowed.cacheDir, path.join(f.home, '.claude', 'cache', 'review-tools'));
    for (const invalid of ['{bad-json synthetic-private-marker', { reviewTools: null }, { reviewTools: { openCodeReview: null } }, { reviewTools: { openCodeReview: { execution: 'yes' } } }, { reviewTools: { openCodeReview: { acquisition: 'always' } } }, { reviewTools: { openCodeReview: { installation: true } } }]) {
        f.write('personal', invalid, typeof invalid === 'string');
        // When a declared refusal cannot be interpreted reliably.
        const refused = f.resolve();
        // Then no execution/acquisition/network is authorized and diagnostics reveal no raw declaration.
        assert.equal(refused.status, 'invalid');
        assert.equal(refused.execution, false);
        assert.equal(refused.acquisition, 'never');
        assert.equal(refused.network, false);
        assert.ok(!JSON.stringify(refused).includes('synthetic-private-marker'));
    }
});

test('TC-RVP-052: machine tool locations must be explicit safe absolute paths', t => {
    // Given an isolated personal tool preference and a later ignored local preference.
    const f = fixture(t);
    const personal = path.join(f.home, 'provided'), local = path.join(f.project, 'native');
    f.write('personal', { reviewTools: { openCodeReview: { binaryPath: personal } } });
    f.write('local', { reviewTools: { openCodeReview: { binaryPath: local } } });
    // When preference resolves.
    const policy = f.resolve();
    // Then the local path wins without a global install or manifest edit.
    assert.equal(policy.binaryPath, local);
    for (const unsafe of ['ocr', '../native', path.parse(f.root).root, f.root + '\0suffix']) {
        assert.equal(f.resolve({ env: { ...f.env, CK_REVIEW_TOOL_BINARY: unsafe } }).status, 'invalid');
        assert.equal(f.resolve({ env: { ...f.env, CK_REVIEW_TOOL_CACHE: unsafe } }).status, 'invalid');
    }
});
