'use strict';

/**
 * One full test run per checkout at a time, and no more full runs per machine than it can hold.
 *
 * The hook suite (`.claude/hooks/tests/run-all-tests.cjs`) and the Codex sync pipeline
 * (`.claude/skills/sync-codex/scripts/run-codex-sync.mjs`, which runs the Codex and scripts tests)
 * share the live tree: fixtures, mirrors and temp folders. Run together, they fail with false
 * ENOENT errors that look like product defects. Each runner (and `framework-ci.cjs`, for its whole
 * run) calls `admitTestRun`: it waits for this checkout's lock, then for a machine-wide slot
 * (test-run-slots.cjs), printing what it waits for, and fails only after the wait bound.
 *
 * - A run nested inside a lock holder (a child that inherits `CK_TEST_RUN_LOCK_HELD`) never takes
 *   the lock or a machine slot, so the pipeline's own hook-suite stages still run. A test that starts
 *   a full runner must pass that variable on: a stripped environment would queue the child behind
 *   its own parent's slot until the wait bound.
 * - A lock whose holder process is gone is stale and is taken over.
 * - The lock file lives at `<project root>/tmp/test-run.lock` (local-only, never committed).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HELD_ENV = 'CK_TEST_RUN_LOCK_HELD';
// A lock file this young with no readable holder is being written right now: treat it as held.
const FRESH_UNREADABLE_MS = 5000;
// Wait bound when the slots module is absent; test-run-slots.cjs owns CK_TEST_RUN_WAIT_MINUTES otherwise.
const DEFAULT_WAIT_MS = 120 * 60 * 1000;

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSlots() {
    try {
        return require('./test-run-slots.cjs');
    } catch (error) {
        // A bundle copied without the slots module still serializes per checkout.
        if (error && error.code === 'MODULE_NOT_FOUND' && String(error.message).includes('test-run-slots')) return null;
        throw error;
    }
}

/**
 * Admit one full test run: wait for this checkout's lock, then for a machine-wide slot. Children
 * inherit `CK_TEST_RUN_LOCK_HELD` and are admitted at once (`nested`).
 * @returns {Promise<{ admitted: boolean, nested?: boolean, message?: string, release: () => void }>}
 *   `admitted` false (not nested) means the wait bound passed; `message` says what was held.
 */
async function admitTestRun({
    rootDir,
    command,
    env = process.env,
    log = message => console.error(message),
    pollMs = 2000,
    slots = loadSlots(),
    waitMs = slots ? slots.waitBoundMs(env) : DEFAULT_WAIT_MS,
    readState
} = {}) {
    if (env[HELD_ENV]) return { admitted: true, nested: true, release() {} };
    const deadline = Date.now() + waitMs;
    let lock;
    let lastNotice = 0;
    for (;;) {
        lock = acquireTestRunLock({ rootDir, command, env });
        if (lock.acquired) break;
        if (Date.now() >= deadline) return { admitted: false, message: conflictMessage(lock), release() {} };
        if (Date.now() - lastNotice >= 60 * 1000) {
            const holder = lock.holder || {};
            log(
                `[test-run] waiting for this checkout: ${holder.command || 'another run'} (pid ${holder.pid ?? 'unknown'}) is running its tests here; runs in one checkout go one after another.`
            );
            lastNotice = Date.now();
        }
        await sleep(pollMs + Math.floor(Math.random() * pollMs));
    }
    // The checkout lock comes first, so a run queued behind its own checkout never holds a machine slot.
    const remainingMs = Math.max(0, deadline - Date.now());
    const slot = slots
        ? await slots.acquireMachineSlot({ command, rootDir, env, log, pollMs, waitMs: remainingMs, ...(readState ? { readState } : {}) })
        : { acquired: false, release() {} };
    if (slot.timedOut) {
        lock.release();
        return { admitted: false, message: slots.waitMessage(slot.last), release() {} };
    }
    const release = () => {
        slot.release();
        lock.release();
    };
    return { admitted: true, nested: false, slot, release };
}

const TERMINATION_SIGNALS = process.platform === 'win32' ? ['SIGINT', 'SIGBREAK'] : ['SIGINT', 'SIGTERM', 'SIGHUP'];
const SIGNAL_EXIT = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143, SIGBREAK: 149 };

/**
 * Pass a termination signal on to the runner's children and exit once they have stopped, so a killed
 * runner leaves no test process behind in a checkout whose lock is then free (an orphan would collide
 * with the next run). `children` is a live Set the runner adds to and removes from.
 */
function forwardTerminationSignals(children, { graceMs = 10000 } = {}) {
    let stopping = false;
    const onSignal = signal => {
        if (stopping) return;
        stopping = true;
        const live = [...children].filter(child => child.exitCode === null && child.signalCode === null);
        for (const child of live) {
            try {
                // Windows has no POSIX signals: SIGTERM there terminates the child, which is the intent.
                child.kill(process.platform === 'win32' ? 'SIGTERM' : signal);
            } catch {
                /* already gone */
            }
        }
        const exit = () => process.exit(SIGNAL_EXIT[signal] || 1);
        if (live.length === 0) return exit();
        let pending = live.length;
        for (const child of live)
            child.once('exit', () => {
                if (--pending === 0) exit();
            });
        setTimeout(() => {
            for (const child of live) {
                try {
                    child.kill('SIGKILL');
                } catch {
                    /* already gone */
                }
            }
            exit();
        }, graceMs).unref();
    };
    for (const signal of TERMINATION_SIGNALS) process.on(signal, onSignal);
    return () => {
        for (const signal of TERMINATION_SIGNALS) process.off(signal, onSignal);
    };
}

module.exports = { acquireTestRunLock, admitTestRun, forwardTerminationSignals, conflictMessage, lockPath, HELD_ENV };
