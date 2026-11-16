'use strict';

// Business intent: many agents run full test runs at once, in one checkout and across many worktrees of
// one machine. Each machine admits only as many full runs as its hardware holds, sized from the machine
// as it is when a run starts; a run that cannot start yet waits and says why instead of failing; a dead
// or abandoned holder never blocks for long; and the first run always starts, however small or busy the
// machine is. Inside a run, test-file workers follow the same live budget.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const slots = require('../lib/test-run-slots.cjs');
const { admitTestRun, HELD_ENV } = require('../lib/test-run-lock.cjs');

const GIB = 1024 ** 3;
const ROOMY = { cores: 16, totalBytes: 64 * GIB, availableBytes: 40 * GIB, load1: 1 };

function tempDir(t, prefix = 'test-run-slots-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
}

function envFor(dir, extra = {}) {
    return { [slots.SLOTS_DIR_ENV]: dir, ...extra };
}

function liveProcess(t) {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore', windowsHide: true });
    t.after(() => child.kill());
    return child.pid;
}

function deadPid() {
    return Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8', windowsHide: true }).stdout);
}

function writeSlot(dir, index, holder) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, `slot-${index}.json`),
        JSON.stringify({ command: 'run-all-tests', root: '/elsewhere', token: `t${index}`, startedAt: new Date().toISOString(), ...holder })
    );
}

test('capacity follows the hardware: cores and memory, a container limit included, never below one', () => {
    const capacity = state => slots.slotCapacity({ availableBytes: 1, load1: 0, ...state }, {});
    assert.equal(capacity({ cores: 18, totalBytes: 64 * GIB }), 6, 'many cores, ample memory: cores decide');
    assert.equal(capacity({ cores: 64, totalBytes: 8 * GIB }), 2, 'many cores, little memory: memory decides');
    assert.equal(capacity({ cores: 2, totalBytes: 4 * GIB }), 1, 'a small CI runner holds one run');
    assert.equal(capacity({ cores: 1, totalBytes: 1 * GIB }), 1, 'even a tiny machine runs one');
    assert.equal(slots.slotCapacity({ cores: 2, totalBytes: 4 * GIB }, { [slots.SLOTS_ENV]: '5' }), 5, 'a fixed count wins');
    assert.equal(slots.slotCapacity({ cores: 18, totalBytes: 64 * GIB }, { [slots.SLOTS_ENV]: 'zero' }), 6, 'an invalid override is ignored');
});

test('the machine state reads usable cores and memory that never exceeds the total', () => {
    const state = slots.readMachineState();
    assert.ok(Number.isInteger(state.cores) && state.cores >= 1);
    assert.ok(state.totalBytes > 0 && state.availableBytes > 0 && state.availableBytes <= state.totalBytes);
    if (process.platform === 'win32') assert.equal(state.load1, null, 'Windows has no load average');
    else assert.equal(typeof state.load1, 'number');
});

test('a run takes a slot with its identity and releases only its own slot', t => {
    const dir = tempDir(t);
    const first = slots.tryAcquireSlot({ command: 'framework-ci', rootDir: '/checkout-a', env: envFor(dir), state: ROOMY });
    assert.equal(first.acquired, true);
    const holder = JSON.parse(fs.readFileSync(first.file, 'utf8'));
    assert.equal(holder.pid, process.pid);
    assert.equal(holder.root, '/checkout-a');
    assert.equal(holder.command, 'framework-ci');
    // Another run replaced the file (after a stale reclaim): releasing must not remove it.
    fs.writeFileSync(first.file, JSON.stringify({ ...holder, token: 'someone-else' }));
    first.release();
    assert.equal(fs.existsSync(first.file), true);
    fs.rmSync(first.file);
    const second = slots.tryAcquireSlot({ command: 'framework-ci', rootDir: '/checkout-a', env: envFor(dir), state: ROOMY });
    second.release();
    assert.equal(fs.existsSync(second.file), false);
});

test('a full machine refuses another run and names who holds the slots', t => {
    const dir = tempDir(t);
    writeSlot(dir, 0, { pid: liveProcess(t), root: '/checkout-a' });
    writeSlot(dir, 1, { pid: liveProcess(t), root: '/checkout-b' });
    const result = slots.tryAcquireSlot({ command: 'run-all-tests', rootDir: '/checkout-c', env: envFor(dir, { [slots.SLOTS_ENV]: '2' }), state: ROOMY });
    assert.equal(result.acquired, false);
    assert.equal(result.reason, 'full');
    assert.match(slots.waitMessage(result), /all 2 machine slot\(s\) are in use.*checkout-a.*checkout-b/);
    assert.match(slots.waitMessage(result), /CK_TEST_RUN_SLOTS=<n>/);
});

test('a slot whose holder died, or that outlived any run, is reclaimed', t => {
    const dir = tempDir(t);
    writeSlot(dir, 0, { pid: deadPid() });
    writeSlot(dir, 1, { pid: liveProcess(t), startedAt: new Date(Date.now() - slots.MAX_SLOT_AGE_MS - 1000).toISOString() });
    assert.equal(slots.liveHolders(dir).length, 0);
    assert.deepEqual(
        fs.readdirSync(dir).filter(name => name.startsWith('slot-')),
        [],
        'both stale slots are removed'
    );
    const result = slots.tryAcquireSlot({ command: 'x', rootDir: '/c', env: envFor(dir, { [slots.SLOTS_ENV]: '1' }), state: ROOMY });
    assert.equal(result.acquired, true);
    result.release();
});

test('a slot file still being written counts as held, not stale', t => {
    const dir = tempDir(t);
    fs.writeFileSync(path.join(dir, 'slot-0.json'), '');
    assert.equal(slots.liveHolders(dir).length, 1);
    assert.equal(fs.existsSync(path.join(dir, 'slot-0.json')), true);
});

test('a second run waits while memory available now is short or the machine is overloaded; the first never does', t => {
    const dir = tempDir(t);
    const lowMemory = { ...ROOMY, availableBytes: 1 * GIB };
    const overloaded = { ...ROOMY, load1: ROOMY.cores * 2 };
    const first = slots.tryAcquireSlot({ command: 'a', rootDir: '/a', env: envFor(dir), state: { ...lowMemory, load1: ROOMY.cores * 3 } });
    assert.equal(first.acquired, true, 'with no live holder the run starts even on a starved machine');
    assert.equal(slots.tryAcquireSlot({ command: 'b', rootDir: '/b', env: envFor(dir), state: lowMemory }).reason, 'memory');
    assert.equal(slots.tryAcquireSlot({ command: 'b', rootDir: '/b', env: envFor(dir), state: overloaded }).reason, 'cpu');
    assert.equal(
        slots.tryAcquireSlot({ command: 'b', rootDir: '/b', env: envFor(dir), state: { ...overloaded, load1: null } }).acquired,
        true,
        'no load average (Windows): no CPU gate'
    );
    const fixed = slots.tryAcquireSlot({ command: 'c', rootDir: '/c', env: envFor(dir, { [slots.SLOTS_ENV]: '4' }), state: lowMemory });
    assert.equal(fixed.acquired, true, 'a fixed slot count is the user sizing: live checks do not second-guess it');
    first.release();
});

test('a waiting run starts as soon as a slot frees, and says once what it waits for', async t => {
    const dir = tempDir(t);
    const env = envFor(dir, { [slots.SLOTS_ENV]: '1' });
    const holder = slots.tryAcquireSlot({ command: 'run-all-tests', rootDir: '/a', env, state: ROOMY });
    const messages = [];
    setTimeout(holder.release, 300);
    const waited = await slots.acquireMachineSlot({
        command: 'framework-ci',
        rootDir: '/b',
        env,
        log: m => messages.push(m),
        pollMs: 20,
        readState: () => ROOMY
    });
    assert.equal(waited.acquired, true);
    assert.match(messages[0], /^\[test-run\] waiting for a machine slot: all 1 machine slot\(s\) are in use/);
    assert.match(messages.at(-1), /machine slot taken after waiting/);
    waited.release();
});

test('a run that cannot start within the wait bound gives up and reports the holders', async t => {
    const dir = tempDir(t);
    writeSlot(dir, 0, { pid: liveProcess(t), root: '/busy' });
    const result = await slots.acquireMachineSlot({
        command: 'x',
        rootDir: '/c',
        env: envFor(dir, { [slots.SLOTS_ENV]: '1' }),
        log: () => {},
        pollMs: 10,
        waitMs: 50,
        readState: () => ROOMY
    });
    assert.equal(result.acquired, false);
    assert.equal(result.timedOut, true);
    assert.match(slots.waitMessage(result.last), /\/busy/);
});

test('admission can be switched off, and an unusable slot directory turns it off with a notice', async t => {
    const dir = tempDir(t);
    const off = await slots.acquireMachineSlot({
        command: 'x',
        rootDir: '/c',
        env: envFor(dir, { [slots.SLOTS_ENV]: 'off' }),
        log: () => assert.fail('no notice when off')
    });
    assert.equal(off.disabled, true);
    assert.deepEqual(fs.readdirSync(dir), []);
    const notDirectory = path.join(dir, 'a-file');
    fs.writeFileSync(notDirectory, '');
    const messages = [];
    const blocked = await slots.acquireMachineSlot({
        command: 'x',
        rootDir: '/c',
        env: envFor(path.join(notDirectory, 'slots')),
        log: m => messages.push(m),
        readState: () => ROOMY
    });
    assert.equal(blocked.disabled, true);
    assert.match(messages[0], /machine-wide admission is off/);
});

test('the default slot directory is per user and outside any checkout', () => {
    const dir = slots.slotsDir({});
    assert.ok(path.isAbsolute(dir));
    assert.ok(dir.startsWith(os.userInfo().homedir), dir);
    assert.ok(!dir.startsWith(path.resolve(__dirname, '..', '..', '..')), 'not inside this checkout');
});

test('test-file workers share the cores among active runs and shrink with load and memory', () => {
    const workers = (state, runs, env = {}) => slots.testWorkerCount({ env, state: { ...ROOMY, ...state }, runs });
    assert.equal(workers({ load1: 0 }, 1), 15, 'one run on an idle machine: every core but one');
    assert.equal(workers({ load1: 0 }, 4), 4, 'four runs: a quarter each');
    assert.equal(workers({ load1: 12 }, 1), 5, 'a busy machine: only the idle cores');
    assert.equal(workers({ load1: 40 }, 1), 1, 'an overloaded machine: one at a time, never zero');
    assert.equal(workers({ load1: 0, availableBytes: 0.5 * GIB }, 1), 2, 'little free memory: fewer workers');
    assert.equal(workers({ cores: 1, load1: 0 }, 1), 1, 'a single core still runs');
    assert.equal(workers({ load1: null }, 2), 8, 'Windows: no load average, share the cores');
    assert.equal(workers({ load1: 40 }, 1, { [slots.WORKERS_ENV]: '6' }), 6, 'a fixed count wins');
});

test('a nested run is admitted at once and takes no slot', async t => {
    const dir = tempDir(t);
    const admission = await admitTestRun({ rootDir: tempDir(t), command: 'run-all-tests', env: envFor(dir, { [HELD_ENV]: '1' }) });
    assert.equal(admission.admitted, true);
    assert.equal(admission.nested, true);
    assert.deepEqual(fs.readdirSync(dir), []);
});

test('admission holds the checkout lock and a slot, marks children, and releases both', async t => {
    const dir = tempDir(t);
    const root = tempDir(t);
    const env = envFor(dir);
    const admission = await admitTestRun({ rootDir: root, command: 'framework-ci', env, readState: () => ROOMY, log: () => {} });
    assert.equal(admission.admitted, true);
    assert.equal(env[HELD_ENV], String(process.pid));
    assert.equal(fs.existsSync(path.join(root, 'tmp', 'test-run.lock')), true);
    assert.equal(slots.liveHolders(dir).length, 1);
    admission.release();
    assert.equal(fs.existsSync(path.join(root, 'tmp', 'test-run.lock')), false);
    assert.equal(slots.liveHolders(dir).length, 0);
    assert.equal(env[HELD_ENV], undefined);
});

test('a run in a busy checkout waits for it instead of failing, and then runs', async t => {
    const dir = tempDir(t);
    const root = tempDir(t);
    const holderEnv = envFor(dir);
    const first = await admitTestRun({ rootDir: root, command: 'run-codex-sync', env: holderEnv, readState: () => ROOMY, log: () => {} });
    const messages = [];
    setTimeout(first.release, 300);
    const second = await admitTestRun({
        rootDir: root,
        command: 'run-all-tests',
        env: envFor(dir),
        pollMs: 20,
        readState: () => ROOMY,
        log: m => messages.push(m)
    });
    assert.equal(second.admitted, true);
    assert.match(messages[0], /waiting for this checkout: run-codex-sync \(pid \d+\)/);
    second.release();
});

test('a busy checkout past the wait bound fails with the lock holder named', async t => {
    const root = tempDir(t);
    fs.mkdirSync(path.join(root, 'tmp'));
    fs.writeFileSync(path.join(root, 'tmp', 'test-run.lock'), JSON.stringify({ pid: liveProcess(t), command: 'run-codex-sync', host: os.hostname() }));
    const result = await admitTestRun({ rootDir: root, command: 'run-all-tests', env: envFor(tempDir(t)), pollMs: 10, waitMs: 50, log: () => {} });
    assert.equal(result.admitted, false);
    assert.match(result.message, /run-codex-sync \(pid \d+/);
});

// The worker below is a stand-in full run: it is admitted, records when it ran, holds briefly, exits.
const WORKER = `
const fs = require('node:fs');
const { admitTestRun } = require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'test-run-lock.cjs'))});
const [root, log, holdMs] = process.argv.slice(1);
(async () => {
    const admission = await admitTestRun({ rootDir: root, command: 'worker', pollMs: 25, log: () => {} });
    if (!admission.admitted) process.exit(3);
    process.on('exit', admission.release);
    fs.appendFileSync(log, JSON.stringify({ root, event: 'start', at: Date.now(), pid: process.pid }) + '\\n');
    await new Promise(resolve => setTimeout(resolve, Number(holdMs)));
    fs.appendFileSync(log, JSON.stringify({ root, event: 'end', at: Date.now(), pid: process.pid }) + '\\n');
})();
`;

function maxOverlap(events, filter = () => true) {
    let live = 0;
    let peak = 0;
    const ordered = events.filter(filter).sort((a, b) => a.at - b.at || (a.event === 'end' ? -1 : 1));
    for (const event of ordered) {
        live += event.event === 'start' ? 1 : -1;
        peak = Math.max(peak, live);
    }
    return peak;
}

test('parallel runners across checkouts and within one checkout never exceed their limits, and all finish', async t => {
    const dir = tempDir(t);
    const log = path.join(tempDir(t), 'events.jsonl');
    const checkouts = [tempDir(t), tempDir(t), tempDir(t)];
    // Seven runs at once: two in each of three checkouts and one more in the first, sharing two machine slots.
    const roots = [...checkouts, ...checkouts, checkouts[0]];
    const env = { ...process.env, [slots.SLOTS_DIR_ENV]: dir, [slots.SLOTS_ENV]: '2' };
    delete env[HELD_ENV];
    const codes = await Promise.all(
        roots.map(
            root =>
                new Promise(resolve => {
                    const child = spawn(process.execPath, ['-e', WORKER, root, log, '150'], { env, stdio: 'ignore', windowsHide: true });
                    child.on('exit', code => resolve(code));
                })
        )
    );
    assert.deepEqual(
        codes,
        roots.map(() => 0),
        'every run was admitted and finished'
    );
    const events = fs
        .readFileSync(log, 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
    assert.equal(events.filter(event => event.event === 'start').length, roots.length);
    assert.ok(maxOverlap(events) <= 2, `at most two runs at once on the machine (saw ${maxOverlap(events)})`);
    for (const root of checkouts)
        assert.equal(
            maxOverlap(events, event => event.root === root),
            1,
            'one run at a time in one checkout'
        );
    assert.deepEqual(
        fs.readdirSync(dir).filter(name => name.startsWith('slot-')),
        [],
        'every slot was released'
    );
});

test('a killed runner stops its child processes instead of leaving them running', { skip: process.platform === 'win32' && 'POSIX signals' }, async t => {
    const marker = path.join(tempDir(t), 'child.pid');
    const parent = `
const { spawn } = require('node:child_process');
const { forwardTerminationSignals } = require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'test-run-lock.cjs'))});
const children = new Set();
forwardTerminationSignals(children, { graceMs: 5000 });
const child = spawn(process.execPath, ['-e', 'require("node:fs").writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)', ${JSON.stringify(marker)}], { stdio: 'ignore' });
children.add(child);
`;
    const runner = spawn(process.execPath, ['-e', parent], { stdio: 'ignore' });
    t.after(() => runner.kill('SIGKILL'));
    const started = Date.now();
    while (!fs.existsSync(marker) || !fs.readFileSync(marker, 'utf8')) {
        if (Date.now() - started > 20000) assert.fail('the child never started');
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    const childPid = Number(fs.readFileSync(marker, 'utf8'));
    const exit = new Promise(resolve => runner.on('exit', (code, signal) => resolve({ code, signal })));
    runner.kill('SIGTERM');
    assert.deepEqual(await exit, { code: 143, signal: null }, 'the runner exits as terminated');
    assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' }, 'the child is gone too');
});
