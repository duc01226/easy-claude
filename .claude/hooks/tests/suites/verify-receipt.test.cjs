'use strict';

// TC-VRC: a verify receipt records whether the configured lint, type and test commands passed on the
// exact commit tree; the commit gate warns by default and reports only failures not in the baseline.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const { runHook } = require('../lib/hook-runner.cjs');

const LIB_DIR = path.resolve(__dirname, '../../lib');
const VERIFY = path.join(LIB_DIR, 'verify-receipt.cjs');
const HOOK = path.resolve(__dirname, '../../review-commit-gate.cjs');
const POLICY = path.resolve(__dirname, '../../../scripts/lib/commit-review-policy.cjs');
const ROUTING = path.resolve(__dirname, '../../../scripts/lib/workflow-routing-config.cjs');
const ACTIONS = path.resolve(__dirname, '../../../upgrades/actions');
const verify = () => require(VERIFY);
const receipts = () => require(path.join(LIB_DIR, 'review-receipt.cjs'));
const parsers = () => require(path.join(LIB_DIR, 'verify-output-parsers.cjs'));
const baselines = () => require(path.join(LIB_DIR, 'verify-baseline.cjs'));
const schema = () => require(path.join(LIB_DIR, 'project-config-schema.cjs'));
const gate = () => require(HOOK);
const C_WORD = `c${'ommit'}`;
const POSIX = process.platform !== 'win32';

const GIT = (() => {
    try {
        return spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
    } catch {
        return false;
    }
})();

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

// A detached grandchild that inherits stdout keeps the command's output pipe open after its parent exits.
// Its working directory lies outside the fixture, so Windows can remove the fixture while it still runs.
const GRANDCHILD =
    "require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 6000)'], { detached: true, stdio: 'inherit', cwd: require('path').dirname(process.execPath) }).unref();";

// Fixture tools: each is a small Node script, so one command string runs the same under sh and cmd.exe.
const TOOLS = {
    // eslint --format json: the errors listed in lint-state.json, exit 1 when there is any.
    'eslint.js':
        "const fs = require('fs'); const errors = fs.existsSync('lint-state.json') ? JSON.parse(fs.readFileSync('lint-state.json', 'utf8')) : [];\n" +
        "console.log(JSON.stringify([{ filePath: require('path').join(process.cwd(), 'src', 'a.js'), messages: errors.map(ruleId => ({ ruleId, severity: 2 })) }]));\n" +
        'process.exit(errors.length ? 1 : 0);\n',
    // TAP: one failing test per name in test-state.json.
    'tap.js':
        "const fs = require('fs'); const failing = fs.existsSync('test-state.json') ? JSON.parse(fs.readFileSync('test-state.json', 'utf8')) : [];\n" +
        "console.log('TAP version 13'); console.log('ok 1 - stays green');\n" +
        "failing.forEach((name, i) => console.log('not ok ' + (i + 2) + ' - ' + name));\n" +
        'process.exit(failing.length ? 1 : 0);\n',
    // Prints out.txt and exits with the code in code.txt: any output shape, any exit code.
    'emit.js':
        "const fs = require('fs'); process.stdout.write(fs.existsSync('out.txt') ? fs.readFileSync('out.txt', 'utf8') : '');\n" +
        "process.exit(fs.existsSync('code.txt') ? Number(fs.readFileSync('code.txt', 'utf8')) : 0);\n",
    'pass.js': 'process.exit(0);\n',
    'sleep.js': 'setTimeout(() => {}, 120000);\n',
    // Writes its pid, then sleeps: lets a test check the command is gone after the runner is stopped.
    'pidsleep.js': "require('fs').writeFileSync('pid.txt', String(process.pid)); setTimeout(() => {}, 60000);\n",
    // Leaves a process holding the output open, then passes at once.
    'bgpass.js': `${GRANDCHILD}\nprocess.exit(0);\n`,
    // Leaves a process holding the output open, then runs far past any budget.
    'bghang.js': `${GRANDCHILD}\nsetTimeout(() => {}, 60000);\n`,
    // A fixer that writes a file git does not ignore: the tree changes under the run.
    'touch.js': "require('fs').writeFileSync('generated.txt', String(Date.now())); process.exit(0);\n",
    // Echo a secret from the environment and a credential URL, then fail.
    'leak.js':
        "console.log('TAP version 13'); console.log('not ok 1 - leaks ' + process.env.VERIFY_TEST_API_TOKEN);\n" +
        "console.log('not ok 2 - uses postgres://app:pw12345678@db.local/app'); process.exit(1);\n"
};

function writeConfig(repo, config) {
    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'docs', 'project-config.json'), JSON.stringify({ project: { name: 'fixture' }, ...config }, null, 2));
}

const TEMP_VARS = ['TMPDIR', 'TEMP', 'TMP'];

/**
 * A throwaway root holding the repository, the receipt store and the OS temp directory the runner's
 * logs go to (TMPDIR/TEMP/TMP point inside it), so nothing reaches the real temp directory.
 */
function fixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'verify-receipt-test-')));
    const repo = path.join(root, 'repo');
    const store = path.join(root, 'store');
    const temp = path.join(root, 'ostmp');
    for (const dir of [repo, store, temp]) fs.mkdirSync(dir);
    const saved = Object.fromEntries(['CK_REVIEW_RECEIPT_STORE', ...TEMP_VARS].map(name => [name, process.env[name]]));
    process.env.CK_REVIEW_RECEIPT_STORE = store;
    for (const name of TEMP_VARS) process.env[name] = temp;
    const cleanup = () => {
        for (const [name, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    };
    let result;
    try {
        result = fn({ root, repo, store, temp });
    } catch (error) {
        cleanup();
        throw error;
    }
    if (result && typeof result.then === 'function') return result.finally(cleanup);
    cleanup();
    return result;
}

/** A repository with the fixture tools, a project config and one base commit. */
function makeRepo(repo, config) {
    git(repo, ['init', '-q']);
    git(repo, ['config', 'user.email', 'test@example.com']);
    git(repo, ['config', 'user.name', 'Test']);
    git(repo, ['config', 'commit.gpgsign', 'false']);
    git(repo, ['config', 'core.hooksPath', path.join(repo, '.no-hooks')]);
    fs.writeFileSync(path.join(repo, '.gitignore'), '/tmp/\n/temp/\n/pid.txt\n');
    for (const [name, text] of Object.entries(TOOLS)) fs.writeFileSync(path.join(repo, name), text);
    if (config) writeConfig(repo, config);
    git(repo, ['add', '-A']);
    git(repo, [C_WORD, '-q', '-m', 'base']);
}

const commands = values => ({ testing: { commands: values } });
const run = (repo, store, extra = {}) => verify().runVerify({ repository: repo, storeDir: store, ...extra });
const statusOf = (report, slot) => report.commands.find(command => command.slot === slot)?.status;
const commandOf = (report, slot) => report.commands.find(command => command.slot === slot);
const emit = (repo, output, code) => {
    fs.writeFileSync(path.join(repo, 'out.txt'), output);
    fs.writeFileSync(path.join(repo, 'code.txt'), String(code));
};
const readSkill = relative => fs.readFileSync(path.resolve(__dirname, '../../../skills', relative), 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const alive = pid => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

function stageAndReview(repo) {
    git(repo, ['add', '-A']);
    const api = receipts();
    const staged = api.captureReviewTarget({ repository: repo, cwd: repo, target: 'staged' });
    assert.equal(staged.status, 'CHANGED', 'the fixture has a change to commit');
    api.issueReceipt({ repository: repo, snapshot: staged, scope: 'full-changeset', kind: 'changes-review' });
    return staged;
}

const commitInput = (repo, extra = '') => ({ tool_name: 'Bash', tool_input: { command: `git ${C_WORD}${extra} -m change`, cwd: repo } });
const contextOf = result => JSON.parse(result.stdout).hookSpecificOutput.additionalContext;

function cli(repo, store, ...args) {
    return spawnSync(process.execPath, [VERIFY, ...args], {
        cwd: repo,
        encoding: 'utf8',
        windowsHide: true,
        env: { ...process.env, CK_REVIEW_RECEIPT_STORE: store }
    });
}

/** The single-line JSON argv an upgrade action declares for `field`. */
function actionArgv(id, field) {
    const text = fs.readFileSync(path.join(ACTIONS, `${id}.md`), 'utf8');
    const match = new RegExp(`^${field}: (\\[.*\\])$`, 'm').exec(text.split('\n---')[0]);
    assert.ok(match, `${id} declares ${field} as one JSON line`);
    return JSON.parse(match[1]);
}

const tests = [
    // ---- Runner -----------------------------------------------------------------------------------
    {
        name: 'TC-VRC-001 a missing or unusable command never counts as passing',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                // Given lint passes and typecheck/affected are absent (an object under a reserved key predates the reservation)
                makeRepo(repo, commands({ lint: 'node pass.js', typecheck: { strict: true } }));
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                // When the runner runs
                const report = await run(repo, store);
                // Then the verdict is INCOMPLETE, naming each unproven key, never PASS
                assert.equal(report.verdict, 'INCOMPLETE');
                assert.equal(statusOf(report, 'lint'), 'passed');
                assert.equal(statusOf(report, 'typecheck'), 'invalid');
                assert.equal(statusOf(report, 'affected'), 'missing');
                assert.match(report.summary.join('\n'), /affected: no command configured \(testing\.commands\.affected\)/);
                // And a missing command alone, with everything else proven or declared not applicable, is still not a pass
                writeConfig(repo, commands({ lint: 'node pass.js', typecheck: 'none' }));
                const onlyMissing = await run(repo, store);
                assert.equal(statusOf(onlyMissing, 'affected'), 'missing');
                assert.equal(onlyMissing.verdict, 'INCOMPLETE', 'the tests that were never configured are not proven');
                // And with no command at all the verdict is UNAVAILABLE
                writeConfig(repo, {});
                assert.equal((await run(repo, store)).verdict, 'UNAVAILABLE');
                // And "none" is the only way to declare a key not applicable
                writeConfig(repo, commands({ lint: 'node pass.js', typecheck: 'none', affected: 'node pass.js' }));
                const declared = await run(repo, store);
                assert.equal(statusOf(declared, 'typecheck'), 'not-applicable');
                assert.equal(declared.verdict, 'PASS');
            })
    },
    {
        name: 'TC-VRC-002 failures in the baseline are known; only new ones fail the run, counted per key',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                // Given an existing repo with one lint error and one failing test, frozen as the baseline
                makeRepo(repo, commands({ lint: 'node eslint.js', typecheck: 'none', affected: 'node tap.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['legacy flaky']));
                const init = await verify().initBaseline({ repository: repo, storeDir: store });
                assert.equal(init.status, 'INITIALIZED');
                assert.equal(init.verdict, 'PASS', 'known failures alone do not fail');
                // When the same failures run again
                const known = await run(repo, store);
                assert.equal(known.verdict, 'PASS');
                assert.equal(statusOf(known, 'lint'), 'baselined');
                assert.equal(statusOf(known, 'affected'), 'baselined');
                // And a second occurrence of the known rule in the same file is new: counts are compared
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'no-undef']));
                const twice = await run(repo, store);
                assert.equal(twice.verdict, 'FAIL');
                assert.deepEqual(commandOf(twice, 'lint').newItems, ['eslint|src/a.js|no-undef']);
                assert.equal(commandOf(twice, 'lint').knownCount, 1);
                // And a new lint rule and a new failing test appear: only those are reported
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'eqeqeq']));
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['legacy flaky', 'login works']));
                const fresh = await run(repo, store);
                assert.equal(fresh.verdict, 'FAIL');
                assert.deepEqual(commandOf(fresh, 'lint').newItems, ['eslint|src/a.js|eqeqeq']);
                assert.deepEqual(commandOf(fresh, 'affected').newItems, ['test|login works']);
            })
    },
    {
        name: 'TC-VRC-002 a jest suite that fixes one file and breaks another reports the new file, not a known failure',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node emit.js' }));
                emit(repo, ' FAIL  src/a.test.js\n  ● Test suite failed to run\n', 1);
                await verify().initBaseline({ repository: repo, storeDir: store });
                emit(repo, ' FAIL  src/b.test.js\n  ● Test suite failed to run\n', 1);
                const moved = await run(repo, store);
                assert.equal(moved.verdict, 'FAIL');
                assert.deepEqual(commandOf(moved, 'verify').newItems, ['test|src/b.test.js › Test suite failed to run']);
                assert.deepEqual(commandOf(moved, 'verify').nowPassing, [], 'a failing run sees nothing passing');
            })
    },
    {
        name: 'TC-VRC-002 a combined command reports every format it prints, and a different failing exit code is new',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node emit.js' }));
                emit(repo, 'TAP version 13\nnot ok 1 - adds\n', 1);
                await verify().initBaseline({ repository: repo, storeDir: store });
                // A type error printed next to the known TAP failure is new
                emit(repo, "src/x.ts(3,5): error TS2304: Cannot find name 'y'.\nTAP version 13\nnot ok 1 - adds\n", 1);
                const mixed = await run(repo, store);
                assert.equal(mixed.verdict, 'FAIL');
                assert.deepEqual(commandOf(mixed, 'verify').newItems, ['diag|src/x.ts|TS2304']);
                // The known failure with another exit code (a crash, a coverage gate) is new
                emit(repo, 'TAP version 13\nnot ok 1 - adds\n', 3);
                const exit = await run(repo, store);
                assert.equal(exit.verdict, 'FAIL');
                assert.deepEqual(commandOf(exit, 'verify').newItems, ['(exit code 3, baseline 1)']);
            })
    },
    {
        name: 'TC-VRC-003 a baselined failure that now passes is reported, pruned on request, and a later regression is new',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'semi']));
                await verify().initBaseline({ repository: repo, storeDir: store });
                const file = path.join(repo, '.verify-baseline.json');
                const frozen = fs.readFileSync(file, 'utf8');
                // Given one baselined failure is fixed
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                const report = await run(repo, store);
                // Then verify reports it as now passing and writes nothing
                assert.deepEqual(report.commands[0].nowPassing, ['eslint|src/a.js|semi']);
                assert.equal(report.baseline.remaining, 2);
                assert.equal(report.baseline.prunable, 1);
                assert.match(report.summary.join('\n'), /2 entries remain; 1 now pass \(prune would leave 1\)/);
                assert.equal(fs.readFileSync(file, 'utf8'), frozen, 'verify never writes the baseline');
                // When it is pruned
                const pruned = verify().pruneVerify({ repository: repo, storeDir: store });
                assert.equal(pruned.status, 'PRUNED');
                assert.equal(pruned.pruned, 1);
                assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(file, 'utf8')).commands.verify.items), ['eslint|src/a.js|no-undef']);
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'PASS', 'the prune re-issued the receipt for the pruned tree');
                // And the fixed failure comes back: it is new now
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'semi']));
                const regressed = await run(repo, store);
                assert.equal(regressed.verdict, 'FAIL');
                assert.deepEqual(regressed.commands[0].newItems, ['eslint|src/a.js|semi']);
            })
    },
    {
        name: 'TC-VRC-003 a run that also failed in a new way sees nothing passing and prunes nothing',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'semi']));
                await verify().initBaseline({ repository: repo, storeDir: store });
                const file = path.join(repo, '.verify-baseline.json');
                const frozen = fs.readFileSync(file, 'utf8');
                // A new failure that hides the known ones (a parse error stops the linter early)
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['parse-error']));
                const report = await run(repo, store);
                assert.equal(report.verdict, 'FAIL');
                assert.deepEqual(report.commands[0].nowPassing, [], 'absent from a failing run is not passing');
                assert.equal(report.baseline.prunable, 0);
                assert.equal(verify().pruneVerify({ repository: repo, storeDir: store }).status, 'NOTHING_TO_PRUNE');
                assert.equal(fs.readFileSync(file, 'utf8'), frozen, 'the baseline keeps both entries');
            })
    },
    {
        name: 'TC-VRC-003 a prune during which another file changed is undone and issues no receipt',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'semi']));
                await verify().initBaseline({ repository: repo, storeDir: store });
                const file = path.join(repo, '.verify-baseline.json');
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                await run(repo, store);
                const before = fs.readFileSync(file, 'utf8');
                // Another session edits a file right after the baseline write (the second capture)
                let calls = 0;
                const capture = options => {
                    calls++;
                    if (calls === 2) fs.writeFileSync(path.join(repo, 'intruder.txt'), 'unverified\n');
                    return receipts().captureReviewTarget(options);
                };
                const result = verify().pruneVerify({ repository: repo, storeDir: store, captureReviewTarget: capture });
                assert.equal(result.status, 'REFUSED');
                assert.match(result.reason, /Another change landed/);
                assert.equal(fs.readFileSync(file, 'utf8'), before, 'the baseline write was undone byte for byte');
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'NO_RECEIPT', 'the unverified tree has no receipt');
            })
    },
    {
        name: 'TC-VRC-004 a command that cannot start is unrunnable, not failed and not passed',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'verify-tool-that-does-not-exist-9f3 --all' }));
                const report = await run(repo, store);
                assert.equal(statusOf(report, 'verify'), 'unrunnable');
                assert.equal(report.verdict, 'INCOMPLETE');
                assert.match(report.summary.join('\n'), /could not run .*not installed or not on PATH/);
            })
    },
    {
        name: 'TC-VRC-005 a command over its time budget is stopped and reported ENVIRONMENT-BLOCKED',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, { ...commands({ verify: 'node sleep.js' }), reviewGate: { verifyTimeouts: { verify: 1 } } });
                const started = Date.now();
                const report = await run(repo, store);
                assert.equal(statusOf(report, 'verify'), 'timed-out');
                assert.equal(report.verdict, 'INCOMPLETE', 'an overrun is never a pass');
                assert.ok(Date.now() - started < 30000, 'the child was stopped near its 1 s budget, not left to run 120 s');
                assert.match(
                    report.summary.join('\n'),
                    /ENVIRONMENT-BLOCKED: overran its 1 s budget and was stopped; raise reviewGate\.verifyTimeouts\.verify/
                );
            })
    },
    {
        name: 'TC-VRC-005 a process that holds the output open cannot hold the run: a hang stops near the budget, a pass stays a pass',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, { ...commands({ verify: 'node bghang.js' }), reviewGate: { verifyTimeouts: { verify: 1 } } });
                let started = Date.now();
                const hung = await run(repo, store);
                assert.equal(statusOf(hung, 'verify'), 'timed-out');
                assert.ok(Date.now() - started < 5900, `settled on the budget plus the kill grace, not the 6 s grandchild (${Date.now() - started} ms)`);
                writeConfig(repo, commands({ verify: 'node bgpass.js' }));
                started = Date.now();
                const passed = await run(repo, store);
                assert.equal(statusOf(passed, 'verify'), 'passed', 'the command itself exited 0');
                assert.equal(commandOf(passed, 'verify').lingered, true);
                assert.ok(Date.now() - started < 5900, `settled on the exit plus the drain grace (${Date.now() - started} ms)`);
                assert.match(passed.summary.join('\n'), /left processes holding its output after it exited/);
            })
    },
    {
        name: 'TC-VRC-005 stopping the runner stops the command it started (POSIX signals)',
        skip: !GIT || !POSIX,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node pidsleep.js' }));
                const runner = spawn(process.execPath, [VERIFY, 'run'], {
                    cwd: repo,
                    stdio: 'ignore',
                    env: { ...process.env, CK_REVIEW_RECEIPT_STORE: store }
                });
                const pidFile = path.join(repo, 'pid.txt');
                for (let i = 0; i < 100 && !fs.existsSync(pidFile); i++) await sleep(100);
                const pid = Number(fs.readFileSync(pidFile, 'utf8'));
                assert.ok(alive(pid), 'the command is running');
                const exited = new Promise(resolve => runner.on('exit', resolve));
                runner.kill('SIGTERM');
                await exited;
                for (let i = 0; i < 30 && alive(pid); i++) await sleep(100);
                assert.equal(alive(pid), false, 'the command did not outlive the runner');
            })
    },
    {
        name: 'TC-VRC-006 runner precedence: verify alone; else lint, typecheck, affected; build only when opted in',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node pass.js', lint: 'node eslint.js', build: 'node pass.js' }));
                const policy = require(POLICY);
                const plan = () => verify().buildPlan(policy.resolveVerifyGate({ rootDir: repo }));
                assert.deepEqual(
                    plan().slots.map(slot => slot.slot),
                    ['verify']
                );
                writeConfig(repo, commands({ lint: 'node eslint.js', build: 'node pass.js', affected: 'node tap.js' }));
                assert.deepEqual(
                    plan().slots.map(slot => slot.slot),
                    ['lint', 'typecheck', 'affected'],
                    'build waits for the opt-in'
                );
                writeConfig(repo, { ...commands({ lint: 'node eslint.js', build: 'node pass.js' }), reviewGate: { verifyBuild: true } });
                assert.deepEqual(
                    plan().slots.map(slot => slot.slot),
                    ['lint', 'typecheck', 'affected', 'build']
                );
                const report = await run(repo, store);
                assert.equal(statusOf(report, 'build'), 'passed', 'the opted-in build ran');
            })
    },
    {
        name: 'TC-VRC-007 a run that changes the tree gets no receipt and never reports success',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node touch.js' }));
                const report = await run(repo, store);
                assert.equal(report.verdict, 'PASS', 'the commands themselves passed');
                assert.equal(report.status, 'TREE_CHANGED');
                assert.equal(report.receipt, null);
                assert.match(report.notes.join('\n'), /working tree changed while the commands ran/);
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'NO_RECEIPT');
                fs.rmSync(path.join(repo, 'generated.txt'));
                assert.equal(cli(repo, store, 'run').status, 1, 'the CLI exits as not proven');
            })
    },
    {
        name: 'TC-VRC-008 unparseable output is fingerprinted strictly: timings are ignored, any other change is new, a cut capture is never known',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node emit.js' }));
                emit(repo, 'Build failed: 3 errors in module alpha (took 812ms) at 10:42:07\n', 2);
                await verify().initBaseline({ repository: repo, storeDir: store });
                const entry = JSON.parse(fs.readFileSync(path.join(repo, '.verify-baseline.json'), 'utf8')).commands.verify;
                assert.match(entry.fingerprint, /^[a-f0-9]{64}$/);
                // The same failure with another duration and clock time is known
                emit(repo, 'Build failed: 3 errors in module alpha (took 97ms) at 11:03:55\n', 2);
                const same = await run(repo, store);
                assert.equal(same.verdict, 'PASS');
                assert.equal(statusOf(same, 'verify'), 'baselined');
                // A different count, or a repeated line, is new
                for (const output of [
                    'Build failed: 4 errors in module alpha (took 97ms)\n',
                    'Build failed: 3 errors in module alpha (took 1ms)\nBuild failed: 3 errors in module alpha\n'
                ]) {
                    emit(repo, output, 2);
                    const changed = await run(repo, store);
                    assert.equal(changed.verdict, 'FAIL', output);
                    assert.deepEqual(changed.commands[0].newItems, ['(command-level failure)']);
                    assert.equal(changed.commands[0].format, 'fingerprint');
                }
                // Output with no failure-word line never collapses to one constant
                const fingerprint = parsers().fingerprintOutput;
                assert.notEqual(fingerprint('> app lint\n1 problem\n', 1), fingerprint('> app lint\n3 problems\n', 1));
                // A capture cut at the limit is never matched against the baseline
                const truncated = await run(repo, store, {
                    runCommand: async () => ({ status: 'failed', exitCode: 2, durationMs: 5, stdout: 'Build failed: 3 errors', stderr: '', truncated: true })
                });
                assert.equal(truncated.verdict, 'FAIL');
                assert.deepEqual(truncated.commands[0].newItems, ['(output over the capture limit)']);
            })
    },
    {
        name: 'TC-VRC-009 parsers key failures by what failed, stable across line moves, free of message text and linear on hostile output',
        fn: () => {
            const { extractFailureItems, fingerprintOutput } = parsers();
            const root = path.join(os.tmpdir(), 'repo-root');
            const eslint = JSON.stringify([
                {
                    filePath: path.join(root, 'src', 'a.js'),
                    messages: [
                        { ruleId: 'no-undef', severity: 2, line: 3 },
                        { ruleId: 'no-undef', severity: 2, line: 9 },
                        { ruleId: 'semi', severity: 1 }
                    ]
                }
            ]);
            assert.deepEqual(
                extractFailureItems(eslint, { root }),
                { format: 'eslint-json', items: { 'eslint|src/a.js|no-undef': 2 } },
                'warnings never count'
            );
            assert.deepEqual(
                extractFailureItems(`> app@1.0.0 lint\n> eslint . -f json\n\n${eslint}\n`, { root }),
                { format: 'eslint-json', items: { 'eslint|src/a.js|no-undef': 2 } },
                'a package-manager banner before the JSON is skipped'
            );
            const junit =
                '<testsuites><testsuite><testcase classname="auth" name="logs in"><failure/></testcase><testcase classname="auth" name="ok"/><testcase name="c"><error/></testcase></testsuite></testsuites>';
            assert.deepEqual(extractFailureItems(junit), { format: 'junit-xml', items: { 'test|auth::logs in': 1, 'test|c': 1 } });
            const tap = 'TAP version 13\nok 1 - a\nnot ok 2 - b fails\nnot ok 3 - c # SKIP later\nnot ok 4 - d # TODO\n';
            assert.deepEqual(extractFailureItems(tap), { format: 'tap', items: { 'test|b fails': 1 } }, 'skip and todo are not failures');
            assert.deepEqual(extractFailureItems('  ● Cart › adds item\n\n  ● Console\n\n  ● Cart › removes item\n'), {
                format: 'jest',
                items: { 'test|Cart › adds item': 1, 'test|Cart › removes item': 1 }
            });
            // jest: the same heading in two files is two failures, and the summary repeat is not counted again
            const jestRun = [
                ' FAIL  src/a.test.js',
                '  ● Test suite failed to run',
                '',
                ' FAIL  src/b.test.js',
                '  ● Test suite failed to run',
                '  ● Cart › adds item',
                '',
                'Summary of all failing tests',
                ' FAIL  src/b.test.js',
                '  ● Cart › adds item'
            ].join('\n');
            assert.deepEqual(extractFailureItems(jestRun, { root }), {
                format: 'jest',
                items: {
                    'test|src/a.test.js › Test suite failed to run': 1,
                    'test|src/b.test.js › Test suite failed to run': 1,
                    'test|src/b.test.js › Cart › adds item': 1
                }
            });
            assert.deepEqual(extractFailureItems('FAILED tests/test_math.py::test_add[1-2] - assert 3 == 4\nFAILED tests/test_math.py::test_add[5-6] - x\n'), {
                format: 'pytest',
                items: { 'test|tests/test_math.py::test_add[1-2]': 1, 'test|tests/test_math.py::test_add[5-6]': 1 }
            });
            const diagnostics = [
                "src/x.ts(12,5): error TS2304: Cannot find name 'secretValue'.",
                'pkg/m.py:40: error: Incompatible types in assignment  [assignment]',
                'pkg/m.py:7:1: F401 `os` imported but unused',
                "lib/c.c:3:5: error: 'y' undeclared (first use in this function)",
                'pkg/m.py:9: note: this is only a note'
            ].join('\n');
            const parsed = extractFailureItems(diagnostics);
            assert.equal(parsed.format, 'diagnostics');
            assert.deepEqual(
                Object.keys(parsed.items)
                    .filter(key => !key.startsWith('diag|lib/'))
                    .sort(),
                ['diag|pkg/m.py|F401', 'diag|pkg/m.py|assignment', 'diag|src/x.ts|TS2304'],
                'codes key tsc, mypy and ruff diagnostics; the note is not a failure'
            );
            assert.ok(
                Object.keys(parsed.items).some(key => /^diag\|lib\/c\.c\|msg-[a-f0-9]{12}$/.test(key)),
                'a diagnostic with no code keys on a hash'
            );
            assert.ok(!JSON.stringify(parsed).includes('secretValue') && !JSON.stringify(parsed).includes('undeclared'), 'no message text in keys');
            assert.deepEqual(extractFailureItems(diagnostics.replace('(12,5)', '(80,1)').replace(':40:', ':41:')), parsed, 'a line move keeps every key');
            assert.equal(extractFailureItems('Segmentation fault\n'), null, 'unknown output yields no items');
            // Control characters in a test name never reach a key (or the hook context that lists keys)
            assert.deepEqual(
                Object.keys(extractFailureItems('TAP version 13\nnot ok 1 - a\u0007b\u001b[2Jc\n').items),
                ['test|a bc'],
                'a control character becomes a space; an escape sequence is removed whole'
            );
            // Windows prints the repository root in its own case; the fingerprint removes it either way
            assert.equal(
                fingerprintOutput('C:\\Users\\Ann\\Repo\\a.js failed', 1, { root: 'c:\\users\\ann\\repo' }),
                fingerprintOutput('C:\\Users\\Bob\\Work\\Repo\\a.js failed', 1, { root: 'c:\\users\\bob\\work\\repo' })
            );
            // Hostile output stays linear: long whitespace runs and unclosed test cases
            const started = Date.now();
            extractFailureItems(`not ok 1 - a${' '.repeat(60000)}x\n  ● y${' '.repeat(60000)}z\n`);
            extractFailureItems(`<testsuites>${'<testcase name="a">'.repeat(20000)}${'x'.repeat(2000000)}`);
            assert.ok(Date.now() - started < 3000, `parsing hostile output took ${Date.now() - started} ms`);
        }
    },
    {
        name: 'TC-VRC-010 receipts, results, reports and the committed baseline hold no secret values and stay within the record cap',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node leak.js' }));
                const secret = 'tok-4f9c2a7e1b8d6c3a';
                const saved = { token: process.env.VERIFY_TEST_API_TOKEN, author: process.env.GIT_AUTHOR_NAME };
                process.env.VERIFY_TEST_API_TOKEN = secret;
                // An AUTHOR variable equal to a path segment must not be scrubbed out of the receipt's identity fields
                process.env.GIT_AUTHOR_NAME = path.basename(path.dirname(repo)); // 8+ characters, part of the repository path
                try {
                    const report = await run(repo, store);
                    assert.equal(report.verdict, 'FAIL');
                    assert.ok(!JSON.stringify(report).includes(secret), 'the report carries no secret');
                    assert.ok(!JSON.stringify(report).includes('pw12345678'), 'the report carries no URL credential');
                    assert.ok(verify().checkVerify({ repository: repo, storeDir: store }).receipt, 'identity fields survived redaction');
                    const directory = receipts().receiptStoreDirectory(repo, { storeDir: store });
                    const written = fs.readdirSync(directory).filter(name => name.startsWith('verify'));
                    assert.equal(written.length, 2, 'one receipt and one results record');
                    for (const name of written) {
                        const text = fs.readFileSync(path.join(directory, name), 'utf8');
                        assert.ok(!text.includes(secret) && !text.includes('pw12345678'), `${name} carries no secret`);
                        if (name.startsWith('verify.')) assert.ok(Buffer.byteLength(text) <= 8192);
                    }
                    const stdout = cli(repo, store, 'run').stdout;
                    assert.ok(stdout.length > 0 && !stdout.includes(secret), 'CLI output carries no secret');
                    await verify().initBaseline({ repository: repo, storeDir: store });
                    const baselineText = fs.readFileSync(path.join(repo, '.verify-baseline.json'), 'utf8');
                    assert.ok(!baselineText.includes(secret) && !baselineText.includes('pw12345678'), 'the committed baseline carries no secret');
                    assert.match(baselineText, /\[redacted\]/);
                } finally {
                    for (const [name, value] of [
                        ['VERIFY_TEST_API_TOKEN', saved.token],
                        ['GIT_AUTHOR_NAME', saved.author]
                    ]) {
                        if (value === undefined) delete process.env[name];
                        else process.env[name] = value;
                    }
                }
                // Many failures still fit the 8,192-byte receipt: the failure lists are trimmed, counts kept
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(Array.from({ length: 400 }, (_, i) => `case ${i} ${'x'.repeat(120)}`)));
                writeConfig(repo, commands({ verify: 'node tap.js' }));
                const big = await run(repo, store);
                assert.equal(big.commands[0].newCount, 400);
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).receipt.commands[0].newCount, 400);
            })
    },
    {
        name: 'TC-VRC-011 concurrent baseline writers leave a whole, valid file',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, null);
                const script = [
                    `const b = require(${JSON.stringify(path.join(LIB_DIR, 'verify-baseline.cjs'))});`,
                    'const tag = process.argv[1]; const items = {};',
                    'for (let i = 0; i < 400; i++) items[`eslint|src/${tag}${i}.js|rule`] = 1;',
                    "for (let n = 0; n < 25; n++) b.writeBaseline(process.argv[2], { schemaVersion: 1, keyVersion: b.KEY_VERSION, commands: { lint: { commandHash: 'a'.repeat(64), exitCode: 1, items } } });"
                ].join('\n');
                const writer = tag =>
                    new Promise((resolve, reject) => {
                        const child = spawn(process.execPath, ['-e', script, tag, repo], { stdio: 'ignore', windowsHide: true });
                        child.on('error', reject);
                        child.on('close', code => (code === 0 ? resolve() : reject(new Error(`writer ${tag} exited ${code}`))));
                    });
                await Promise.all([writer('a'), writer('b'), writer('c')]);
                const read = baselines().readBaseline(repo);
                assert.equal(read.status, 'ok', 'the last writer wins whole; nothing is torn');
                assert.equal(Object.keys(read.baseline.commands.lint.items).length, 400);
                assert.deepEqual(
                    fs.readdirSync(repo).filter(name => name.endsWith('.tmp')),
                    [],
                    'no temp file is left'
                );
            })
    },
    {
        name: 'TC-VRC-011 a rename refused by Windows sharing (EPERM, EACCES, EBUSY) is retried atomically; other errors are not',
        fn: () =>
            fixture(({ root }) => {
                const { renameWithRetry } = baselines();
                const target = path.join(root, 'target.json');
                const original = fs.renameSync;
                let calls = 0;
                fs.renameSync = (from, to) => {
                    calls++;
                    if (calls <= 2) throw Object.assign(new Error('busy'), { code: calls === 1 ? 'EPERM' : 'EBUSY' });
                    return original(from, to);
                };
                try {
                    fs.writeFileSync(path.join(root, 'next.tmp'), 'new');
                    renameWithRetry(path.join(root, 'next.tmp'), target);
                    assert.equal(calls, 3, 'two refusals, then the same atomic rename succeeds');
                    assert.equal(fs.readFileSync(target, 'utf8'), 'new');
                    calls = 10;
                    fs.renameSync = () => {
                        calls++;
                        throw Object.assign(new Error('gone'), { code: 'ENOENT' });
                    };
                    assert.throws(() => renameWithRetry(path.join(root, 'missing.tmp'), target), /gone/);
                    assert.equal(calls, 11, 'an error that is not a sharing refusal is not retried');
                } finally {
                    fs.renameSync = original;
                }
            })
    },
    {
        name: 'TC-VRC-012 baseline initialization is a ratchet; stale entries say why; slots are checked before anything runs',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                await verify().initBaseline({ repository: repo, storeDir: store });
                const file = path.join(repo, '.verify-baseline.json');
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'eqeqeq']));
                const frozen = fs.readFileSync(file, 'utf8');
                const again = await verify().initBaseline({ repository: repo, storeDir: store });
                assert.equal(again.status, 'UNCHANGED');
                assert.deepEqual(again.refused, ['verify']);
                assert.match(again.reason, /only shrinks/);
                assert.equal(fs.readFileSync(file, 'utf8'), frozen, 'a refused re-freeze leaves the file byte for byte');
                // A changed command makes the recorded entry stale: it reads as no baseline, with the reason
                writeConfig(repo, commands({ verify: 'node eslint.js --strict' }));
                const stale = await run(repo, store);
                assert.equal(stale.commands[0].baselineState, 'stale');
                assert.equal(stale.commands[0].newCount, 2);
                assert.match(stale.summary.join('\n'), /its baseline does not apply: the command text changed/);
                assert.equal((await verify().initBaseline({ repository: repo, storeDir: store })).status, 'INITIALIZED', 'a stale entry may be re-frozen');
                assert.equal(
                    (await verify().initBaseline({ repository: repo, storeDir: store, replace: true })).status,
                    'INITIALIZED',
                    '--replace re-freezes on purpose'
                );
                // A baseline taken by another key version reads as stale and is re-frozen only with --replace
                const other = JSON.parse(fs.readFileSync(file, 'utf8'));
                fs.writeFileSync(file, JSON.stringify({ ...other, keyVersion: 99 }));
                const keys = await run(repo, store);
                assert.equal(keys.commands[0].baselineState, 'stale-keys');
                assert.match(keys.summary.join('\n'), /another key version/);
                assert.equal((await verify().initBaseline({ repository: repo, storeDir: store })).status, 'UNCHANGED');
                assert.equal((await verify().initBaseline({ repository: repo, storeDir: store, replace: true })).status, 'INITIALIZED');
                // An unknown slot is refused before any command runs
                writeConfig(repo, commands({ verify: 'node touch.js' }));
                await assert.rejects(verify().initBaseline({ repository: repo, storeDir: store, slots: ['lnit'] }), /Not in the verify plan: lnit/);
                assert.equal(fs.existsSync(path.join(repo, 'generated.txt')), false, 'nothing ran');
            })
    },
    {
        name: 'TC-VRC-012 an unreadable or symlinked baseline is never read as empty',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store, root }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                const file = path.join(repo, '.verify-baseline.json');
                fs.writeFileSync(file, '{ not json');
                assert.equal(baselines().readBaseline(repo).status, 'invalid');
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                const report = await run(repo, store);
                assert.equal(report.verdict, 'FAIL', 'every failure counts as new');
                assert.match(report.summary.join('\n'), /Baseline unreadable/);
                await assert.rejects(verify().initBaseline({ repository: repo, storeDir: store }), /fix or remove it before initializing/);
                fs.rmSync(file);
                const target = path.join(root, 'elsewhere.json');
                fs.writeFileSync(target, JSON.stringify({ schemaVersion: 1, keyVersion: 1, commands: {} }));
                try {
                    fs.symlinkSync(target, file);
                } catch (error) {
                    if (error.code === 'EPERM') return; // Windows without symlink rights: the lstat guard is exercised on POSIX
                    throw error;
                }
                assert.equal(baselines().readBaseline(repo).status, 'invalid', 'a symlinked baseline is refused');
            })
    },
    {
        name: 'TC-VRC-013 a skip needs a reason, covers only its tree, and over found failures needs the user to ask for the bypass',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node tap.js' }));
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                assert.throws(() => verify().skipVerify({ repository: repo, storeDir: store, reason: 'short' }), /10-500 printable characters/);
                const skipped = verify().skipVerify({ repository: repo, storeDir: store, reason: 'CI image has no browser for e2e' });
                assert.equal(skipped.receipt.verdict, 'SKIPPED');
                assert.equal(skipped.receipt.reason, 'CI image has no browser for e2e');
                fs.writeFileSync(path.join(repo, 'change.txt'), 'y\n');
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'NO_RECEIPT', 'the skip covers only its tree');
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['checkout total']));
                assert.equal((await run(repo, store)).verdict, 'FAIL');
                assert.throws(
                    () => verify().skipVerify({ repository: repo, storeDir: store, reason: 'the tests are slow on this laptop' }),
                    /found new failures; skip is for an environment that cannot run verification/
                );
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'FAIL', 'the FAIL receipt stays');
                const bypass = verify().skipVerify({
                    repository: repo,
                    storeDir: store,
                    reason: 'user asked to bypass verify for this hotfix',
                    userRequested: true
                });
                assert.equal(bypass.receipt.verdict, 'SKIPPED', 'an explicit user bypass is honored over found failures');
                assert.equal(bypass.receipt.userRequested, true);
                assert.equal(bypass.receipt.overrode, 'FAIL', 'the bypass records the verdict it overrode');
                assert.equal(verify().checkVerify({ repository: repo, storeDir: store }).status, 'SKIPPED');
            })
    },
    {
        name: 'TC-VRC-014 the CLI runs standalone: every command reports JSON with meaningful exit codes; receipts expire',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ lint: 'node eslint.js', typecheck: 'none', affected: 'node tap.js' }));
                const plan = cli(repo, store, 'plan');
                assert.equal(plan.status, 0, plan.stderr);
                const planned = JSON.parse(plan.stdout);
                assert.deepEqual(
                    planned.commands.map(slot => `${slot.slot}:${slot.state}`),
                    ['lint:configured', 'typecheck:not-applicable', 'affected:configured']
                );
                assert.equal(planned.commands[0].command, 'node eslint.js', 'plan shows what will run');
                assert.equal(planned.totalBudgetSeconds, 600 + 1800);
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['broken']));
                const failed = cli(repo, store, 'run');
                assert.equal(failed.status, 1);
                assert.equal(JSON.parse(failed.stdout).verdict, 'FAIL');
                assert.equal(cli(repo, store, 'skip', '--reason=no browser on this machine').status, 2, 'a skip over found failures is an error');
                const bypassed = cli(repo, store, 'skip', '--reason=user asked to bypass verify here', '--user-requested');
                assert.equal(bypassed.status, 0, bypassed.stderr);
                assert.equal(JSON.parse(bypassed.stdout).receipt.userRequested, true, 'the CLI passes the user bypass through');
                assert.equal(cli(repo, store, 'run').status, 1, 'a fresh run replaces the bypass with the found failures');
                fs.writeFileSync(path.join(repo, 'test-state.json'), '[]');
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                assert.equal(cli(repo, store, 'baseline-init', '--slot=lint').status, 0);
                assert.deepEqual(
                    Object.keys(JSON.parse(fs.readFileSync(path.join(repo, '.verify-baseline.json'), 'utf8')).commands),
                    ['lint'],
                    '--slot froze only lint'
                );
                const check = cli(repo, store, 'check');
                assert.equal(check.status, 0, check.stdout);
                assert.equal(JSON.parse(check.stdout).status, 'PASS');
                fs.writeFileSync(path.join(repo, 'lint-state.json'), '[]');
                assert.equal(cli(repo, store, 'run').status, 0);
                const prune = cli(repo, store, 'prune');
                assert.equal(prune.status, 0, prune.stdout);
                assert.equal(JSON.parse(prune.stdout).status, 'PRUNED');
                assert.equal(
                    verify().checkVerify({ repository: repo, storeDir: store, now: Date.now() + receipts().MAX_LIFETIME_MS + 1 }).status,
                    'NO_RECEIPT',
                    'an expired receipt never matches'
                );
                const bad = cli(repo, store, 'run', '--everything');
                assert.equal(bad.status, 2);
                assert.match(bad.stderr, /run does not take --everything/);
            })
    },

    // ---- Commit gate ------------------------------------------------------------------------------
    {
        name: 'TC-VRC-020 warn (default): a reviewed commit without a verify receipt proceeds with a warning that names the fix',
        skip: !GIT,
        fn: () =>
            fixture(({ repo }) => {
                makeRepo(repo, commands({ verify: 'node pass.js' }));
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                stageAndReview(repo);
                const result = gate().evaluate(commitInput(repo));
                assert.equal(result.code, 0);
                assert.equal(result.decision, 'warn');
                const text = contextOf(result);
                assert.match(text, /reviewGate\.verify is warn: this commit may proceed/);
                assert.match(text, /No verify receipt matches this exact tree/);
                assert.match(text, /Why it matters:/);
                assert.match(text, /node \.claude\/hooks\/lib\/verify-receipt\.cjs run/);
            })
    },
    {
        name: 'TC-VRC-021 warn lists only the new failures, never the baselined ones; a passing receipt is silent',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                await verify().initBaseline({ repository: repo });
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'eqeqeq']));
                await verify().runVerify({ repository: repo });
                stageAndReview(repo);
                const text = contextOf(gate().evaluate(commitInput(repo)));
                assert.match(text, /Verdict FAIL/);
                assert.match(text, /verify: 1 new: "eslint\|src\/a\.js\|eqeqeq"/);
                assert.ok(!text.includes('no-undef'), 'the baselined failure is not reported');
                // Fixed: a passing run on the same staged tree is silent
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                await verify().runVerify({ repository: repo });
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)), undefined);
            })
    },
    {
        name: 'TC-VRC-022 enforce refuses a candidate without a passing receipt and accepts PASS or a reasoned skip',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, { ...commands({ verify: 'node tap.js' }), reviewGate: { verify: 'enforce' } });
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['checkout total']));
                stageAndReview(repo);
                const missing = gate().evaluate(commitInput(repo));
                assert.equal(missing.code, 2);
                assert.match(missing.stderr, /\[BLOCKED\] Commit refused: reviewGate\.verify is enforce/);
                await verify().runVerify({ repository: repo });
                stageAndReview(repo);
                const failing = gate().evaluate(commitInput(repo));
                assert.equal(failing.code, 2);
                assert.match(failing.stderr, /verify: 1 new: "test\|checkout total"/);
                assert.match(failing.stderr, /skip --reason=/, 'enforce names the recorded escape');
                // The environment cannot run the suite (a fresh change, no failing run on it): a reasoned skip passes
                fs.writeFileSync(path.join(repo, 'test-state.json'), '[]');
                stageAndReview(repo);
                verify().skipVerify({ repository: repo, reason: 'payment sandbox is down for maintenance' });
                assert.equal(gate().evaluate(commitInput(repo)), undefined, 'a reasoned skip lets the commit through');
                fs.writeFileSync(path.join(repo, 'change.txt'), 'passing now\n');
                await verify().runVerify({ repository: repo });
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)), undefined, 'PASS lets the commit through');
            })
    },
    {
        name: 'TC-VRC-023 off skips the verify check entirely',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, { ...commands({ verify: 'node tap.js' }), reviewGate: { verify: 'off' } });
                fs.writeFileSync(path.join(repo, 'test-state.json'), JSON.stringify(['broken']));
                await verify().runVerify({ repository: repo });
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)), undefined);
            })
    },
    {
        name: 'TC-VRC-024 no configured command: warn stays silent, enforce refuses because missing is not passing',
        skip: !GIT,
        fn: () =>
            fixture(({ repo }) => {
                makeRepo(repo, {});
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)), undefined, 'warn: readiness setup owns the nudge');
                writeConfig(repo, { reviewGate: { verify: 'enforce' } });
                stageAndReview(repo);
                const blocked = gate().evaluate(commitInput(repo));
                assert.equal(blocked.code, 2);
                assert.match(blocked.stderr, /No verify command is configured .* a missing command never counts as passing/);
                assert.match(blocked.stderr, /\/project-config/);
            })
    },
    {
        name: 'TC-VRC-025 an invalid verify setting reads as enforce and names the field',
        skip: !GIT,
        fn: () =>
            fixture(({ repo }) => {
                makeRepo(repo, { ...commands({ verify: 'node pass.js' }), reviewGate: { verify: 'sometimes' } });
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                stageAndReview(repo);
                const blocked = gate().evaluate(commitInput(repo));
                assert.equal(blocked.code, 2);
                assert.match(blocked.stderr, /invalid, so they read as enforce: Invalid reviewGate\.verify/);
            })
    },
    {
        name: 'TC-VRC-026 verify, prune, commit matches; any other edit after the prune is warned or refused by mode',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, commands({ verify: 'node eslint.js' }));
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef', 'semi']));
                await verify().initBaseline({ repository: repo });
                fs.writeFileSync(path.join(repo, 'lint-state.json'), JSON.stringify(['no-undef']));
                await verify().runVerify({ repository: repo });
                assert.equal(verify().pruneVerify({ repository: repo }).status, 'PRUNED');
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)), undefined, 'the pruned tree has a matching receipt');
                // Another edit after the prune
                fs.writeFileSync(path.join(repo, 'change.txt'), 'later\n');
                stageAndReview(repo);
                assert.match(contextOf(gate().evaluate(commitInput(repo))), /No verify receipt matches this exact tree/);
                writeConfig(repo, { ...commands({ verify: 'node eslint.js' }), reviewGate: { verify: 'enforce' } });
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo)).code, 2);
            })
    },
    {
        name: 'TC-VRC-027 a verify receipt never stands in for review: an unreviewed commit is still refused for review',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, commands({ verify: 'node pass.js' }));
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                git(repo, ['add', '-A']);
                await verify().runVerify({ repository: repo });
                const result = gate().evaluate(commitInput(repo));
                assert.equal(result.code, 2);
                assert.match(result.stderr, /no matching review fix-loop receipt/);
            })
    },
    {
        name: 'TC-VRC-028 the hook process emits the warning as context with exit 0, and refuses with exit 2 under enforce',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo, store }) => {
                makeRepo(repo, commands({ verify: 'node pass.js' }));
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                stageAndReview(repo);
                const env = { CK_REVIEW_RECEIPT_STORE: store };
                const warned = await runHook(HOOK, commitInput(repo), { cwd: repo, env });
                assert.equal(warned.code, 0, warned.stderr);
                assert.match(JSON.parse(warned.stdout).hookSpecificOutput.additionalContext, /reviewGate\.verify is warn/);
                writeConfig(repo, { ...commands({ verify: 'node pass.js' }), reviewGate: { verify: 'enforce' } });
                stageAndReview(repo);
                const refused = await runHook(HOOK, commitInput(repo), { cwd: repo, env });
                assert.equal(refused.code, 2);
                assert.match(refused.stderr, /reviewGate\.verify is enforce/);
            })
    },
    {
        name: 'TC-VRC-029 a fault in the verify check refuses under enforce and only loses the advisory under warn; amends match',
        skip: !GIT,
        fn: () =>
            fixture(async ({ repo }) => {
                makeRepo(repo, { ...commands({ verify: 'node pass.js' }), reviewGate: { verify: 'enforce' } });
                fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                stageAndReview(repo);
                const broken = {
                    verifyGateFinding: () => {
                        throw new Error("Cannot find module './verify-baseline.cjs'");
                    }
                };
                const refused = gate().evaluate(commitInput(repo), broken);
                assert.equal(refused.code, 2);
                assert.match(refused.stderr, /verify check could not run/);
                assert.match(refused.stderr, /Cannot find module/);
                writeConfig(repo, commands({ verify: 'node pass.js' }));
                stageAndReview(repo);
                assert.equal(gate().evaluate(commitInput(repo), broken), undefined, 'warn: the fault only loses the advisory');
                // An amend candidate (measured against HEAD's parent) matches a run measured against HEAD
                git(repo, ['add', '-A']);
                git(repo, [C_WORD, '-q', '-m', 'first']);
                fs.writeFileSync(path.join(repo, 'change.txt'), 'amended\n');
                git(repo, ['add', '-A']);
                await verify().runVerify({ repository: repo });
                const api = receipts();
                const descriptor = { repository: repo, cwd: repo, mode: 'staged', literalPaths: [], amend: true };
                const candidate = api.captureReviewTarget({ repository: repo, cwd: repo, target: 'commit-descriptor', descriptor });
                api.issueReceipt({ repository: repo, snapshot: candidate, scope: 'full-changeset', kind: 'changes-review' });
                assert.equal(gate().evaluate(commitInput(repo, ' --amend')), undefined, 'the amend is reviewed and verified');
            })
    },

    {
        name: 'TC-VRC-029 a framework copy whose schema cannot load refuses under verify enforce and keeps the review gate mode',
        skip: !GIT,
        fn: () =>
            fixture(async ({ root, store }) => {
                // A project that holds its own copy of the hooks and script libraries, with the schema broken by a bad merge
                const project = path.join(root, 'project');
                fs.mkdirSync(project);
                const claude = path.resolve(__dirname, '../../..');
                for (const part of ['hooks', 'scripts/lib']) {
                    fs.cpSync(path.join(claude, part), path.join(project, '.claude', part), {
                        recursive: true,
                        filter: source => !/[\\/](?:tests|node_modules|__pycache__)$/.test(source)
                    });
                }
                fs.appendFileSync(path.join(project, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'), '\n<<<<<<< ours\n');
                makeRepo(project, { ...commands({ verify: 'node pass.js' }), reviewGate: { verify: 'enforce' } });
                fs.writeFileSync(path.join(project, 'change.txt'), 'x\n');
                stageAndReview(project);
                const refused = await runHook(path.join(project, '.claude', 'hooks', 'review-commit-gate.cjs'), commitInput(project), {
                    cwd: project,
                    env: { CK_REVIEW_RECEIPT_STORE: store }
                });
                assert.equal(refused.code, 2, refused.stderr);
                assert.match(refused.stderr, /verify check could not run/);
                // The review gate's own mode still reads from the policy module, which no longer needs the schema
                writeConfig(project, { reviewGate: { mode: 'enforce' } });
                const mode = spawnSync(
                    process.execPath,
                    [
                        '-e',
                        `process.stdout.write(require(${JSON.stringify(path.join(project, '.claude', 'hooks', 'lib', 'review-receipt.cjs'))}).reviewGateMode(process.argv[1]))`,
                        project
                    ],
                    { encoding: 'utf8', windowsHide: true }
                );
                assert.equal(mode.stdout, 'enforce', mode.stderr);
            })
    },

    // ---- Configuration and upgrade ----------------------------------------------------------------
    {
        name: 'TC-VRC-030 config: invalid verify settings fail validation by name; an old reserved-key value still validates',
        fn: () => {
            const { validateConfig } = schema();
            const old = validateConfig({ project: { name: 'x' }, testing: { commands: { lint: { web: 'npm run lint' }, unit: 'npm test' } } });
            assert.equal(old.valid, true, 'a nested map under a newly reserved key predates the reservation');
            assert.ok(old.warnings.some(text => /testing\.commands\.lint: reserved verify key holds an object/.test(text)));
            const bad = validateConfig({
                project: { name: 'x' },
                testing: { commands: { lintFile: 'eslint' } },
                reviewGate: { verify: 'strict', verifyBuild: 'yes', verifyTimeouts: { lint: 0, deploy: 60 } }
            });
            assert.equal(bad.valid, false);
            assert.ok(bad.errors.some(text => /^reviewGate\.verify: expected one of off\|warn\|enforce/.test(text)));
            assert.ok(bad.errors.some(text => /^reviewGate\.verifyBuild: expected boolean/.test(text)));
            assert.ok(bad.errors.some(text => /^reviewGate\.verifyTimeouts\.lint: expected whole seconds/.test(text)));
            assert.ok(bad.errors.some(text => /^reviewGate\.verifyTimeouts\.deploy: unknown verify command key/.test(text)));
            assert.ok(bad.warnings.some(text => /testing\.commands\.lintFile: expected a \{file\} placeholder/.test(text)));
            const good = validateConfig({
                project: { name: 'x' },
                testing: { commands: { lint: 'eslint .', lintFile: 'eslint {file}', typecheck: 'none' } },
                reviewGate: { verify: 'enforce', verifyBuild: true, verifyTimeouts: { lint: 120 } }
            });
            assert.equal(good.valid, true, good.errors.join('; '));
            // One owner for the key list: the policy reads exactly the schema's reserved keys
            assert.deepEqual(Object.keys(require(POLICY).resolveVerifyGate({ rootDir: os.tmpdir() }).commands), []);
            assert.deepEqual(schema().VERIFY_COMMAND_KEYS, [...schema().VERIFY_SLOTS, 'lintFile']);
        }
    },
    {
        name: 'TC-VRC-031 policy: default warn; unreadable config is the default with no commands; invalid settings throw',
        fn: () =>
            fixture(({ repo }) => {
                const { resolveVerifyGate } = require(POLICY);
                assert.deepEqual(resolveVerifyGate({ rootDir: repo }), { mode: 'warn', source: 'default', build: false, timeouts: {}, commands: {} });
                fs.mkdirSync(path.join(repo, 'docs'));
                fs.writeFileSync(path.join(repo, 'docs', 'project-config.json'), '{ not json');
                assert.equal(resolveVerifyGate({ rootDir: repo }).source, 'unreadable-project-config');
                writeConfig(repo, { ...commands({ verify: 'make check', unit: 'npm test' }), reviewGate: { verify: 'off', verifyTimeouts: { verify: 7200 } } });
                const read = resolveVerifyGate({ rootDir: repo });
                assert.equal(read.mode, 'off');
                assert.deepEqual(read.commands, { verify: 'make check' }, 'only reserved keys are read');
                assert.deepEqual(read.timeouts, { verify: 7200 });
                writeConfig(repo, { reviewGate: { verify: 'block' } });
                assert.throws(() => resolveVerifyGate({ rootDir: repo }), /Invalid reviewGate\.verify/);
                writeConfig(repo, { reviewGate: { verifyTimeouts: { verify: 0 } } });
                assert.throws(() => resolveVerifyGate({ rootDir: repo }), /Invalid reviewGate\.verifyTimeouts\.verify/);
            })
    },
    {
        name: 'TC-VRC-032 the fill-verify-commands action applies only with a project config (exit 3 otherwise) and is done only once the user chose a mode',
        fn: () =>
            fixture(({ repo }) => {
                fs.mkdirSync(path.join(repo, '.claude', 'scripts', 'lib'), { recursive: true });
                fs.copyFileSync(ROUTING, path.join(repo, '.claude', 'scripts', 'lib', 'workflow-routing-config.cjs'));
                const runArgv = argv =>
                    spawnSync(argv[0] === 'node' ? process.execPath : argv[0], argv.slice(1), { cwd: repo, encoding: 'utf8', windowsHide: true }).status;
                const applies = actionArgv('fill-verify-commands', 'applies');
                const done = actionArgv('fill-verify-commands', 'done');
                assert.equal(runArgv(applies), 3, 'no project config: not applicable');
                writeConfig(repo, commands({ lint: 'npm run lint' }));
                assert.equal(runArgv(applies), 0);
                assert.equal(runArgv(done), 1, 'pre-existing commands alone never mark it done');
                writeConfig(repo, { ...commands({ lint: 'npm run lint' }), reviewGate: { verify: 'warn' } });
                assert.equal(runArgv(done), 0, 'the recorded choice marks it done');
                assert.match(
                    JSON.stringify(actionArgv('init-verify-baseline', 'applies')),
                    /\? 0 : 3/,
                    'the baseline action also reports not-applicable as exit 3'
                );
            })
    },

    // ---- Skills route verification through the runner (prose pins) --------------------------------
    {
        name: 'TC-VRC-040 commit verifies the staged tree, fixes new failures and prunes before its review',
        fn: () => {
            const body = readSkill('commit/SKILL.md');
            assert.match(body, /Run applicable checks \(verify: `references\/verify-receipt\.md`\)/);
            const reference = readSkill('commit/references/verify-receipt.md');
            assert.match(reference, /never passed/);
            assert.match(reference, /Never add a new failure to the baseline to make the gate quiet/);
            assert.match(reference, /run `verify-receipt\.cjs prune`, then stage `\.verify-baseline\.json` with the change/);
            assert.match(reference, /Prune before the review snapshot/);
            assert.match(reference, /skip --reason=/);
            assert.match(reference, /start `run` in the background \(or with a timeout at least that long\)/);
            assert.match(reference, /show those commands to the user once before the first run/);
        }
    },
    {
        name: 'TC-VRC-041 pull-request never skips the verify runner as a small change and cites its receipt in the PR body',
        fn: () => {
            const policy = readSkill('pull-request/references/check-policy.md');
            assert.match(policy, /The verify runner is the exception to the skip rows/);
            assert.match(policy, /reuse only a current `PASS` receipt for the exact tree/);
            assert.match(policy, /size never skips it/);
            const skill = readSkill('pull-request/SKILL.md');
            assert.match(skill, /is never skipped as really small/);
            assert.match(skill, /prune now-passing baseline entries before Step 4/);
            assert.match(
                skill,
                /the verify receipt: its verdict, the commands it ran, new versus baselined failures, and the baseline entries remaining and pruned/
            );
        }
    },
    {
        name: 'TC-VRC-042 fix, test and workflow-end report baseline entries and never prune; high-risk review gets a fresh-context reviewer',
        fn: () => {
            assert.match(readSkill('fix/SKILL.md'), /reports its verdict, any new failures and the baselined entries that now pass; it never prunes them/);
            assert.match(readSkill('test/SKILL.md'), /Report only: never prune or re-baseline here/);
            assert.match(readSkill('workflow-end/SKILL.md'), /report them only, never prune at close/);
            const review = readSkill('workflow-review-changes/SKILL.md');
            assert.match(review, /When the change is high-risk \(a one-way door, a public contract, data or schema, security, or a cross-module change\)/);
            assert.match(
                review,
                /at least one reviewer in each pass is a fresh-context agent given only the diff, the governing spec and rules, and file paths, never the author's reasoning or summary/
            );
            assert.match(readSkill('feature-implement/SKILL.md'), /route the RED\/GREEN proof through the verify runner/);
        }
    }
];

module.exports = { name: 'verify-receipt', tests };
