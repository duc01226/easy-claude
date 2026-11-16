'use strict';

/**
 * One full test run per checkout at a time.
 *
 * The hook suite (`.claude/hooks/tests/run-all-tests.cjs`) and the Codex sync pipeline
 * (`.claude/skills/sync-codex/scripts/run-codex-sync.mjs`, which runs the Codex and scripts tests)
 * share the live tree: fixtures, mirrors and temp folders. Run together, they fail with false
 * ENOENT errors that look like product defects. Each runner takes this lock before it starts and
 * refuses to run while another live run holds it.
 *
 * - A run nested inside a lock holder (a child that inherits `CK_TEST_RUN_LOCK_HELD`) never takes
 *   the lock, so the pipeline's own hook-suite stages still run.
 * - A lock whose holder process is gone is stale and is taken over.
 * - The lock file lives at `<project root>/tmp/test-run.lock` (local-only, never committed).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HELD_ENV = 'CK_TEST_RUN_LOCK_HELD';
// A lock file this young with no readable holder is being written right now: treat it as held.
const FRESH_UNREADABLE_MS = 5000;

function lockPath(rootDir) {
    return path.join(rootDir, 'tmp', 'test-run.lock');
}

function isAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        // EPERM: the process exists but belongs to someone else.
        return error.code === 'EPERM';
    }
}

function readHolder(file) {
    try {
        const holder = JSON.parse(fs.readFileSync(file, 'utf8'));
        return holder && typeof holder === 'object' ? holder : null;
    } catch {
        return null;
    }
}

function isHeld(file, holder, now) {
    if (holder) return isAlive(holder.pid) && (!holder.host || holder.host === os.hostname());
    try {
        return now - fs.statSync(file).mtimeMs < FRESH_UNREADABLE_MS;
    } catch {
        return false;
    }
}

/**
 * Take the checkout's test-run lock.
 * @returns {{ acquired: boolean, nested: boolean, file?: string, holder?: object, release: () => void }}
 *   `acquired` false with `nested` false means another live run holds the lock (`holder`).
 */
function acquireTestRunLock({ rootDir, command, env = process.env, pid = process.pid, now = Date.now } = {}) {
    if (env[HELD_ENV]) return { acquired: false, nested: true, release() {} };
    const file = lockPath(rootDir);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    for (let attempt = 0; attempt < 2; attempt++) {
        let fd;
        try {
            fd = fs.openSync(file, 'wx');
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            const holder = readHolder(file);
            if (isHeld(file, holder, now())) return { acquired: false, nested: false, file, holder: holder || { pid: null, command: 'unknown' }, release() {} };
            fs.rmSync(file, { force: true }); // stale: its holder is gone
            continue;
        }
        try {
            fs.writeSync(fd, JSON.stringify({ pid, command, startedAt: new Date(now()).toISOString(), host: os.hostname() }));
        } finally {
            fs.closeSync(fd);
        }
        env[HELD_ENV] = String(pid);
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            if (env[HELD_ENV] === String(pid)) delete env[HELD_ENV];
            const holder = readHolder(file);
            if (holder && holder.pid === pid) fs.rmSync(file, { force: true });
        };
        return { acquired: true, nested: false, file, release };
    }
    return { acquired: false, nested: false, file, holder: readHolder(file) || { pid: null, command: 'unknown' }, release() {} };
}

function conflictMessage(result) {
    const holder = result.holder || {};
    return [
        `Another test run is already using this checkout: ${holder.command || 'unknown'} (pid ${holder.pid ?? 'unknown'}, started ${holder.startedAt || 'unknown'}).`,
        'The hook suite and the Codex/scripts tests share the live tree, so running them at the same time gives false ENOENT failures.',
        'Wait for that run to finish, then start this one; run the test families one after another.',
        `If no run is active, delete ${result.file}.`
    ].join('\n');
}

module.exports = { acquireTestRunLock, conflictMessage, lockPath, HELD_ENV };
