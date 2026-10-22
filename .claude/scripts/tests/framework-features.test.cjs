'use strict';

// The feature catalog guides agents to the switches that exist. Intent: every entry names a real
// schema option (so the catalog cannot advertise a setting that does nothing) and resolves on a
// bare project without throwing, and an opt-in toggle shows the layer that turned it on.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FEATURES, catalog, renderMarkdown } = require('../framework-features.cjs');
const { CK_SCHEMA } = require('../../hooks/lib/ck-config-schema.cjs');
const { SCHEMA } = require('../../hooks/lib/project-config-schema.cjs');

const has = (schema, key) => {
    let node = { properties: schema };
    for (const part of key.split('.')) { node = node?.properties?.[part]; if (!node) return false; }
    return true;
};

test('every catalog entry names an option declared in the .ck.json or project-config schema', () => {
    for (const { key } of FEATURES) assert.ok(has(CK_SCHEMA, key) || has(SCHEMA, key), key);
    assert.equal(new Set(FEATURES.map(f => f.key)).size, FEATURES.length, 'no duplicate entries');
});

test('a bare project resolves every entry to its default, and an opt-in shows the layer that set it', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-features-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const rootDir = path.join(dir, 'project');
    const homeDir = path.join(dir, 'home');
    fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    const rows = catalog({ rootDir, homeDir, env: {} });
    for (const row of rows) assert.notEqual(row.value, 'unavailable', `${row.key}: ${row.source}`);
    assert.equal(rows.find(r => r.key === 'frameworkRuntime.quietNative').value, 'none');
    fs.writeFileSync(path.join(rootDir, 'docs/project-config.json'), JSON.stringify({ project: { name: 'Fixture' }, frameworkRuntime: { offMode: 'as-quiet' } }));
    fs.mkdirSync(path.join(homeDir, '.claude'));
    fs.writeFileSync(path.join(homeDir, '.claude/.ck.json'), JSON.stringify({ frameworkRuntime: { quietNative: 'restrict' } }));
    const after = Object.fromEntries(catalog({ rootDir, homeDir, env: {} }).map(r => [r.key, r]));
    assert.deepEqual([after['frameworkRuntime.quietNative'].value, after['frameworkRuntime.quietNative'].source], ['restrict', 'user-config']);
    assert.deepEqual([after['frameworkRuntime.offMode'].value, after['frameworkRuntime.offMode'].source], ['as-quiet', 'project-config']);
    assert.match(renderMarkdown(rows), /\| `frameworkRuntime.offMode` \|/);
});
