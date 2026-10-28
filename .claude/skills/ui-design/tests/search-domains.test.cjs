/**
 * Tests for the option-discovery search domains of scripts/search.py:
 *   - --domain family ranks style families by the subject's quality words;
 *   - --domain layout ranks layout archetypes by page type;
 *   - the shared win_compat helper is imported from this checkout's .claude/scripts, never from the
 *     user's home directory (a fresh HOME without it still prints UTF-8 results).
 * Python is found through the framework's launcher (python3/python on POSIX, python/py -3 on
 * Windows); without Python 3 the cases skip as ENVIRONMENT-BLOCKED.
 *
 * Run: node .claude/skills/ui-design/tests/search-domains.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SEARCH = path.resolve(__dirname, '..', 'scripts', 'search.py');
const { resolvePythonCommand } = require('../../../hooks/tests/lib/python-command.cjs');
const { osEssentialsEnv } = require('../../../hooks/tests/lib/os-essentials-env.cjs');

function python(t) {
  try {
    return resolvePythonCommand();
  } catch (error) {
    t.skip(`ENVIRONMENT-BLOCKED: ${error.message}`);
    return null;
  }
}

function search(t, args) {
  const py = python(t);
  if (!py) return null;
  // A fresh HOME: the script must not depend on anything under the user's home directory.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-search-'));
  try {
    // OS essentials only (Portable Test Contract), with home and temp in the case's own dir.
    const env = osEssentialsEnv({ HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root });
    const result = spawnSync(py.command, [...py.baseArgs, SEARCH, ...args, '--json'], { env, cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('--domain family ranks style families by the subject\'s quality words', (t) => {
  const result = search(t, ['playful bright friendly youthful', '--domain', 'family', '-n', '3']);
  if (!result) return;
  assert.equal(result.domain, 'family');
  assert.equal(result.file, 'style-families.csv');
  assert.equal(result.results[0].id, 'colour-pop');
  for (const field of ['divergenceAxes', 'tellRisk', 'showcaseQueries', 'styleRows']) {
    assert.ok(Object.prototype.hasOwnProperty.call(result.results[0], field), `result lacks ${field}`);
  }
});

test('--domain layout ranks layout archetypes for a page type', (t) => {
  const result = search(t, ['wizard onboarding steps', '--domain', 'layout', '-n', '2']);
  if (!result) return;
  assert.equal(result.file, 'layout-archetypes.csv');
  assert.deepEqual(result.results.map((row) => row.pageType), ['wizard-onboarding', 'wizard-onboarding']);
});

test('search.py loads win_compat from this checkout, not from the home directory', () => {
  const source = fs.readFileSync(SEARCH, 'utf8');
  assert.doesNotMatch(source, /Path\.home\(\)/);
  assert.match(source, /Path\(__file__\)\.resolve\(\)\.parents\[3\] \/ 'scripts'/);
  assert.ok(fs.existsSync(path.resolve(__dirname, '..', '..', '..', 'scripts', 'win_compat.py')));
});
