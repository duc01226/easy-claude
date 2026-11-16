'use strict';

// Business intent: the static lane (ESLint frozen baseline + prettier) never reads a missing install as a
// pass. A project without an ESLint configuration skips the lane; one that has a configuration but no
// installed tools fails with the fix.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'static-checks.cjs');

function project(t, files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'static-checks-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const script = path.join(root, '.claude', 'scripts', 'static-checks.cjs');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(SCRIPT, script);
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(root, name), text);
    return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', windowsHide: true });
}

test('a project without an ESLint configuration skips the static lane', t => {
    const result = project(t, {});
    assert.equal(result.status, 0);
    assert.match(result.stdout, /skip: this project has no ESLint configuration/);
});

test('a configured project without installed tools fails with the fix, never passes', t => {
    const result = project(t, { 'eslint.config.mjs': 'export default [];\n' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /eslint\.js is not installed; run npm ci/);
    assert.match(result.stderr, /prettier\.cjs is not installed; run npm ci/);
});
