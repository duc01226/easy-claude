'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePythonCommand } = require('../../hooks/tests/lib/python-command.cjs');

test('edit-video repairs protect source, execution, timeline and model-result contracts offline', t => {
    const root = path.resolve(__dirname, '../../..');
    const parent = path.join(root, 'tmp', 'edit-video-tests');
    fs.mkdirSync(parent, { recursive: true });
    const scratch = fs.mkdtempSync(path.join(parent, 'run-'));
    t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
    const env = Object.fromEntries(
        Object.entries(process.env).filter(
            ([key]) => !/^(?:CK_|CLAUDE_|CODEX_|OPENROUTER_|EDIT_VIDEO_|HYPERFRAMES_|PYTHON)|(?:KEY|TOKEN|SECRET|PASSWORD)$/i.test(key)
        )
    );
    Object.assign(env, { HOME: scratch, USERPROFILE: scratch, TMPDIR: scratch, TEMP: scratch, TMP: scratch, PYTHONDONTWRITEBYTECODE: '1' });
    const python = resolvePythonCommand({ env, cwd: scratch });
    assert.ok(python, 'Python 3 is required for the offline video contracts');
    const result = spawnSync(python.command, [...python.baseArgs, path.join(root, '.claude/skills/edit-video/tests/test_regressions.py')], {
        cwd: scratch,
        env,
        encoding: 'utf8',
        timeout: 30000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /Ran \d+ tests/);
});
