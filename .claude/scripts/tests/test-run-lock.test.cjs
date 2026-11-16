'use strict';

// Business intent: the hook suite and the Codex/scripts tests share the live tree, so two full runs at
// once fail with false ENOENT errors. One full run per checkout holds the test-run lock; a second one
// stops at once and says to run the families one after another. A dead holder never blocks forever.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const { acquireTestRunLock, conflictMessage, lockPath, HELD_ENV } = require('../lib/test-run-lock.cjs');

function tempRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-run-lock-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function liveProcess(t) {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore', windowsHide: true });
    t.after(() => child.kill());
    return child.pid;
}

function deadPid() {
    const child = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8', windowsHide: true });
    return Number(child.stdout);
}

test('a first full run takes the lock and releases it on exit', t => {
    const root = tempRoot(t);
    const env = {};
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-all-tests', env });
    assert.equal(lock.acquired, true);
    assert.equal(JSON.parse(fs.readFileSync(lockPath(root), 'utf8')).pid, process.pid);
    assert.equal(env[HELD_ENV], String(process.pid), 'children inherit the holder marker');
    lock.release();
    assert.equal(fs.existsSync(lockPath(root)), false);
    assert.equal(env[HELD_ENV], undefined);
});

test('a second run is refused while a live run holds the lock, with a teaching message', t => {
    const root = tempRoot(t);
    const holderPid = liveProcess(t);
    fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
    fs.writeFileSync(lockPath(root), JSON.stringify({ pid: holderPid, command: 'run-codex-sync', startedAt: '2026-11-16T00:00:00.000Z', host: os.hostname() }));
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-all-tests', env: {} });
    assert.equal(lock.acquired, false);
    assert.equal(lock.nested, false);
    assert.equal(lock.holder.pid, holderPid);
    const message = conflictMessage(lock);
    assert.match(message, /run-codex-sync \(pid \d+/);
    assert.match(message, /false ENOENT/);
    assert.match(message, /one after another/);
    assert.equal(JSON.parse(fs.readFileSync(lockPath(root), 'utf8')).pid, holderPid, 'the holder keeps its lock');
});

test('a lock left by a process that no longer exists is taken over', t => {
    const root = tempRoot(t);
    fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
    fs.writeFileSync(lockPath(root), JSON.stringify({ pid: deadPid(), command: 'run-all-tests', host: os.hostname() }));
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-codex-sync', env: {} });
    assert.equal(lock.acquired, true);
    assert.equal(JSON.parse(fs.readFileSync(lockPath(root), 'utf8')).command, 'run-codex-sync');
    lock.release();
});

test('a run nested inside a lock holder never takes or touches the lock', t => {
    const root = tempRoot(t);
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-all-tests', env: { [HELD_ENV]: '123' } });
    assert.equal(lock.nested, true);
    assert.equal(lock.acquired, false);
    assert.equal(fs.existsSync(lockPath(root)), false);
});

test("release never removes another run's lock", t => {
    const root = tempRoot(t);
    const env = {};
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-all-tests', env });
    const otherPid = liveProcess(t);
    fs.writeFileSync(lockPath(root), JSON.stringify({ pid: otherPid, command: 'run-codex-sync', host: os.hostname() }));
    lock.release();
    assert.equal(JSON.parse(fs.readFileSync(lockPath(root), 'utf8')).pid, otherPid);
});

test('a lock file still being written (no readable holder yet) counts as held', t => {
    const root = tempRoot(t);
    fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
    fs.writeFileSync(lockPath(root), '');
    const lock = acquireTestRunLock({ rootDir: root, command: 'run-all-tests', env: {} });
    assert.equal(lock.acquired, false);
    assert.equal(lock.nested, false);
});

test('both runners take the lock before running tests', () => {
    // The hook runner: full runs only (a --filter run is a nested or targeted selection; --list runs nothing).
    const hooks = fs.readFileSync(path.join(repoRoot, '.claude', 'hooks', 'tests', 'run-all-tests.cjs'), 'utf8');
    assert.match(hooks, /flags\.filter \|\| flags\.list \? null : loadTestRunLock\([\s\S]{0,600}acquireTestRunLock\(/);
    // The sync runner: whenever a selected stage runs tests and the lock library is present.
    const sync = fs.readFileSync(path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs'), 'utf8');
    assert.match(sync, /if \(active\.some\(stage => stage\.test\) && require\("node:fs"\)\.existsSync\(lockFile\)\) \{[\s\S]{0,400}acquireTestRunLock\(/);
});
