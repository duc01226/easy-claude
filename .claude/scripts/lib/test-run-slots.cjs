'use strict';

/**
 * Machine-wide admission for full test runs, sized from the machine as it is when the run starts.
 *
 * Many agents run this framework's tests at once, in one checkout and across many git worktrees. Each
 * checkout already serializes its own runs (test-run-lock.cjs). Nothing limited runs across checkouts,
 * so a dozen full runs could start together and push the machine into swap or out of memory, and their
 * per-test timeouts then fail as false negatives. This module is a counting semaphore shared by every
 * checkout of every project that carries the framework, for one OS user on one host:
 *
 * - Slots are files `slot-<n>.json` created with O_EXCL (`wx`), so two runs never take the same slot.
 * - Capacity comes from the hardware: cores, and total memory capped by a container limit.
 * - Admission also reads the live state: a run waits while memory available now is below what one run
 *   needs, or while the load average is far above the core count. The first run is always admitted
 *   (no live holder), so a busy or small machine still makes progress, one run at a time.
 * - A slot whose holder process is gone, or that is older than MAX_SLOT_AGE_MS, is stale and reclaimed.
 *   Reclaim happens under a short directory mutex, and re-reads the holder first.
 * - The slot directory is in the OS user's real home (from the account database, not $HOME or $TMPDIR,
 *   which differ per test run or per agent session); it is never inside a checkout.
 * - An unwritable slot directory turns admission off with a notice: it guards throughput, never correctness.
 *
 * Overrides (environment): CK_TEST_RUN_SLOTS=<n> fixes the slot count (`off` disables admission);
 * CK_TEST_CONCURRENCY=<n> fixes the test-file workers of one run; CK_TEST_RUN_WAIT_MINUTES=<n> bounds the
 * wait (default 120); CK_TEST_RUN_SLOTS_DIR=<dir> moves the slot directory.
 *
 * Only `node:` built-ins: the sync pipeline loads this module (PORT-001).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const SLOTS_ENV = 'CK_TEST_RUN_SLOTS';
const WORKERS_ENV = 'CK_TEST_CONCURRENCY';
const WAIT_ENV = 'CK_TEST_RUN_WAIT_MINUTES';
const SLOTS_DIR_ENV = 'CK_TEST_RUN_SLOTS_DIR';

const GIB = 1024 ** 3;
// Measured on an 18-core, 64 GiB machine: one full `framework-ci.cjs --scope=full` run peaked at 1.9 to
// 2.0 GiB of resident memory across its process tree (36 to 38 processes), during the Codex test stage
// with node's default of one test file per core. Most of a run is serial (hook suites one at a time,
// scripts tests one file at a time), so three cores per run leave room for its parallel Codex stage.
// The memory budget keeps headroom over the measured peak, so a run admitted on it does not swap.
const RUN_MEMORY_BYTES = 3 * GIB;
const RUN_CORES = 3;
// One `node --test` file worker, peak resident memory with headroom.
const WORKER_MEMORY_BYTES = 0.25 * GIB;
// Share of total memory test runs may plan to use; the rest stays with the OS and the user's other work.
const MEMORY_SHARE = 0.75;
// Above this load per core, a second run waits: the machine has no idle CPU to give it.
const MAX_LOAD_PER_CORE = 1.5;
const MAX_SLOT_AGE_MS = 3 * 60 * 60 * 1000;
const MUTEX_STALE_MS = 10 * 1000;
const DEFAULT_WAIT_MINUTES = 120;

function positiveInt(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function userHome() {
    try {
        const home = os.userInfo().homedir;
        if (home) return home;
    } catch {
        /* no account database entry (some containers) */
    }
    return os.homedir() || os.tmpdir();
}

function slotsDir(env = process.env) {
    return env[SLOTS_DIR_ENV] || path.join(userHome(), '.cache', 'easy-claude', 'test-run-slots', os.hostname());
}

/** macOS reports only never-used pages as free; inactive, speculative and purgeable pages are reclaimable too. */
function darwinAvailableBytes() {
    try {
        const out = childProcess.execFileSync('vm_stat', { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] });
        const pageSize = Number((/page size of (\d+) bytes/.exec(out) || [])[1]);
        const pages = name => Number((new RegExp(`Pages ${name}:\\s+(\\d+)`).exec(out) || [])[1] || 0);
        const total = pages('free') + pages('inactive') + pages('speculative') + pages('purgeable');
        return pageSize > 0 && total > 0 ? total * pageSize : null;
    } catch {
        return null;
    }
}

/** The machine now: usable cores, memory (capped by a container limit) and the 1-minute load (null on Windows). */
function readMachineState() {
    const cores = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length || 1;
    let totalBytes = os.totalmem();
    const constrained = typeof process.constrainedMemory === 'function' ? process.constrainedMemory() : 0;
    if (constrained > 0 && constrained < totalBytes) totalBytes = constrained;
    let availableBytes = process.platform === 'darwin' ? darwinAvailableBytes() : null;
    if (availableBytes === null && typeof process.availableMemory === 'function') availableBytes = process.availableMemory();
    if (!(availableBytes > 0)) availableBytes = os.freemem();
    return {
        cores: Math.max(1, cores),
        totalBytes,
        availableBytes: Math.min(availableBytes, totalBytes),
        load1: process.platform === 'win32' ? null : os.loadavg()[0]
    };
}

/** How many full runs this machine can hold at once, from its hardware (not its current load). */
function slotCapacity(state, env = process.env) {
    const fixed = positiveInt(env[SLOTS_ENV]);
    if (fixed) return fixed;
    const byCores = Math.floor(state.cores / RUN_CORES);
    const byMemory = Math.floor((state.totalBytes * MEMORY_SHARE) / RUN_MEMORY_BYTES);
    return Math.max(1, Math.min(byCores, byMemory));
}

function admissionDisabled(env = process.env) {
    return String(env[SLOTS_ENV] || '').toLowerCase() === 'off';
}

function isAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

function readJson(file) {
    try {
        const value = JSON.parse(fs.readFileSync(file, 'utf8'));
        return value && typeof value === 'object' ? value : null;
    } catch {
        return null;
    }
}

function slotFiles(dir) {
    try {
        return fs
            .readdirSync(dir)
            .filter(name => /^slot-\d+\.json$/.test(name))
            .map(name => path.join(dir, name));
    } catch {
        return [];
    }
}

function isLiveHolder(file, holder, now) {
    if (holder) return isAlive(holder.pid) && now - Date.parse(holder.startedAt || 0) < MAX_SLOT_AGE_MS;
    try {
        // Created but not written yet: its creator is writing it right now.
        return now - fs.statSync(file).mtimeMs < MUTEX_STALE_MS;
    } catch {
        return false;
    }
}

/** Run `fn` while holding the slot directory's reclaim mutex; returns false when another process holds it. */
function withReclaimMutex(dir, now, fn) {
    const mutex = path.join(dir, '.reclaim');
    try {
        fs.mkdirSync(mutex);
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        try {
            if (now - fs.statSync(mutex).mtimeMs > MUTEX_STALE_MS) fs.rmSync(mutex, { recursive: true, force: true });
        } catch {
            /* removed by its holder meanwhile */
        }
        return false;
    }
    try {
        fn();
        return true;
    } finally {
        fs.rmSync(mutex, { recursive: true, force: true });
    }
}

/** Live holders of the slot directory; stale slots are removed on the way. */
function liveHolders(dir, now = Date.now()) {
    const holders = [];
    const stale = [];
    for (const file of slotFiles(dir)) {
        const holder = readJson(file);
        if (isLiveHolder(file, holder, now)) holders.push({ file, ...(holder || { pid: null, command: 'starting' }) });
        else stale.push({ file, token: holder && holder.token });
    }
    if (stale.length > 0) {
        withReclaimMutex(dir, now, () => {
            for (const { file, token } of stale) {
                const current = readJson(file);
                // Remove only the stale holder that was read, never a slot a live run has taken since.
                if ((current && current.token) === token && !isLiveHolder(file, current, now)) fs.rmSync(file, { force: true });
            }
        });
    }
    return holders;
}

/**
 * One admission attempt. `acquired` false carries `reason`: `full` (every slot taken), `memory` (too
 * little available memory for another run) or `cpu` (load far above the core count).
 */
function tryAcquireSlot({ command, rootDir, env = process.env, pid = process.pid, now = Date.now, state = readMachineState() } = {}) {
    const dir = slotsDir(env);
    fs.mkdirSync(dir, { recursive: true });
    const capacity = slotCapacity(state, env);
    const holders = liveHolders(dir, now());
    const base = { capacity, holders, state, dir };
    if (holders.length >= capacity) return { acquired: false, reason: 'full', ...base };
    // A fixed slot count is the user's own sizing: the live-state checks never second-guess it.
    if (holders.length > 0 && !positiveInt(env[SLOTS_ENV])) {
        if (state.availableBytes < RUN_MEMORY_BYTES) return { acquired: false, reason: 'memory', ...base };
        if (state.load1 !== null && state.load1 > state.cores * MAX_LOAD_PER_CORE) return { acquired: false, reason: 'cpu', ...base };
    }
    const token = `${pid}-${now()}-${Math.random().toString(36).slice(2)}`;
    for (let index = 0; index < capacity; index++) {
        const file = path.join(dir, `slot-${index}.json`);
        let fd;
        try {
            fd = fs.openSync(file, 'wx');
        } catch (error) {
            if (error.code === 'EEXIST') continue;
            throw error;
        }
        try {
            fs.writeSync(fd, JSON.stringify({ pid, command, root: rootDir, startedAt: new Date(now()).toISOString(), host: os.hostname(), token }));
        } finally {
            fs.closeSync(fd);
        }
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            const holder = readJson(file);
            if (holder && holder.token === token) fs.rmSync(file, { force: true });
        };
        return { acquired: true, file, release, ...base };
    }
    // Every free-looking slot was taken between the count and the create.
    return { acquired: false, reason: 'full', ...base };
}

function formatGiB(bytes) {
    return `${(bytes / GIB).toFixed(1)} GiB`;
}

function waitMessage(result) {
    const { state, capacity, holders, reason } = result;
    const who = holders.map(holder => `${holder.command || 'run'} pid ${holder.pid ?? '?'} in ${holder.root || 'unknown checkout'}`).join('; ');
    const why =
        reason === 'memory'
            ? `${formatGiB(state.availableBytes)} of memory is available and one run needs about ${formatGiB(RUN_MEMORY_BYTES)}`
            : reason === 'cpu'
              ? `load ${state.load1.toFixed(1)} is above ${MAX_LOAD_PER_CORE} per core on ${state.cores} cores`
              : `all ${capacity} machine slot(s) are in use`;
    return `[test-run] waiting for a machine slot: ${why}. Running: ${who || 'none'}. Override with ${SLOTS_ENV}=<n> or ${SLOTS_ENV}=off.`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Take a machine slot, waiting while the machine is full. Resolves `{ acquired: true, release }`,
 * `{ acquired: false, disabled: true }` when admission is off or its directory is unusable, or
 * `{ acquired: false, timedOut: true, last }` after the wait bound.
 */
function waitBoundMs(env = process.env) {
    return (positiveInt(env[WAIT_ENV]) ?? DEFAULT_WAIT_MINUTES) * 60 * 1000;
}

async function acquireMachineSlot({
    command,
    rootDir,
    env = process.env,
    log = message => console.error(message),
    pollMs = 2000,
    waitMs = waitBoundMs(env),
    readState = readMachineState
} = {}) {
    if (admissionDisabled(env)) return { acquired: false, disabled: true, release() {} };
    const deadline = Date.now() + waitMs;
    let lastNotice = 0;
    let lastReason = null;
    for (;;) {
        let result;
        try {
            result = tryAcquireSlot({ command, rootDir, env, state: readState() });
        } catch (error) {
            log(`[test-run] machine-wide admission is off: ${slotsDir(env)} is not usable (${error.code || error.message}).`);
            return { acquired: false, disabled: true, release() {} };
        }
        if (result.acquired) {
            if (lastNotice) log(`[test-run] machine slot taken after waiting (${result.holders.length + 1} of ${result.capacity} in use).`);
            return result;
        }
        if (Date.now() >= deadline) return { acquired: false, timedOut: true, last: result, release() {} };
        if (Date.now() - lastNotice >= 60 * 1000 || result.reason !== lastReason) {
            log(waitMessage(result));
            lastNotice = Date.now();
            lastReason = result.reason;
        }
        await sleep(pollMs + Math.floor(Math.random() * pollMs));
    }
}

/**
 * Test-file workers for one `node --test` stage, sized from the machine now: an even share of the cores
 * among the runs holding slots, no more than the idle cores, and no more than available memory holds.
 */
function testWorkerCount({ env = process.env, state = readMachineState(), runs } = {}) {
    const fixed = positiveInt(env[WORKERS_ENV]);
    if (fixed) return fixed;
    let active = runs;
    if (!positiveInt(active)) {
        try {
            active = admissionDisabled(env) ? 1 : liveHolders(slotsDir(env)).length;
        } catch {
            active = 1;
        }
    }
    active = Math.max(1, active);
    const share = Math.floor(state.cores / active);
    const idle = state.load1 === null ? state.cores : Math.floor(state.cores - state.load1) + 1;
    const byMemory = Math.floor(state.availableBytes / WORKER_MEMORY_BYTES);
    return Math.max(1, Math.min(state.cores - 1, share, idle, byMemory));
}

module.exports = {
    acquireMachineSlot,
    tryAcquireSlot,
    liveHolders,
    slotCapacity,
    slotsDir,
    testWorkerCount,
    readMachineState,
    waitMessage,
    waitBoundMs,
    SLOTS_ENV,
    WORKERS_ENV,
    WAIT_ENV,
    SLOTS_DIR_ENV,
    RUN_MEMORY_BYTES,
    RUN_CORES,
    WORKER_MEMORY_BYTES,
    MAX_SLOT_AGE_MS
};
