'use strict';

/**
 * Bug-class prevention record — `.claude/hooks/lib/prevention-record.cjs`, the fix marker recorded by
 * `skill-overlay-remind.cjs` and the prevention line of `review-commit-gate.cjs`
 * (spec WorkflowExecution/README.GuidedWorkflow.md, US-GWF-10, BR-GWF-24, BR-GWF-25, TC-GWF-092..098).
 *
 * Guards: a record names its bug class from the closed vocabulary, why the class can happen, the sibling
 * sweep and either a guard that exists in the tree, a no-guard with a reason and an owner, or a
 * not-a-code-defect with evidence; anything else is INVALID with the field, the problem and the fix. A
 * value shaped like a secret is rejected. The checker runs directly (CLI, JSON, exit codes). A real `fix`
 * activation records a marker, a read of fix/SKILL.md does not; the commit gate adds one warning line for
 * a marker with no valid record written after it, stays silent with a valid record or no fix, refuses
 * under `reviewGate.verify: enforce` and says nothing under `off`.
 *
 * Portability: every case builds its own temp git repository (or plain folder) and removes it in
 * `finally`; the CLI runs through `process.execPath` with a literal argv, so it behaves the same on
 * Windows, macOS and Linux. Cases that need git skip when git is missing.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const LIB = path.join(HOOKS_DIR, 'lib', 'prevention-record.cjs');
const prevention = require(LIB);
const C_WORD = `c${'ommit'}`;

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

/** A throwaway repository with `.gitignore` ignoring tmp/, a guard file and one base commit. */
function withRepo(fn, { gitRepo = true } = {}) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'prevention-record-test-')));
    const repo = path.join(root, 'repo');
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.gitignore'), '/tmp/\n');
    fs.writeFileSync(path.join(repo, 'src', 'order-state.test.js'), '// guard\n');
    if (gitRepo) {
        git(repo, ['init', '-q']);
        git(repo, ['config', 'user.email', 'test@example.com']);
        git(repo, ['config', 'user.name', 'Test']);
        git(repo, ['config', 'commit.gpgsign', 'false']);
        git(repo, ['config', 'core.hooksPath', path.join(repo, '.no-hooks')]);
        git(repo, ['add', '-A']);
        git(repo, [C_WORD, '-q', '-m', 'base']);
    }
    const cleanup = () => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    let result;
    try {
        result = fn(repo);
    } catch (error) {
        cleanup();
        throw error;
    }
    if (result && typeof result.then === 'function') return result.finally(cleanup);
    cleanup();
    return result;
}

const guarded = (extra = {}) => ({
    schema: 1,
    bugClass: 'state-transition',
    rootCause: 'src/order.js:42 lets any caller set status',
    why: 'The order status is a plain string field any caller may assign, so a cancelled order can be marked shipped.',
    siblings: { query: 'rg -n "\\.status = " src', count: 2, locations: ['src/invoice.js:10', 'src/refund.js:31'] },
    outcome: 'guarded',
    guard: { tier: 'test', path: 'src/order-state.test.js' },
    ...extra
});

const noGuard = (extra = {}) => ({
    schema: 1,
    bugClass: 'boundary',
    rootCause: 'src/page.js:7 used <= for the last page',
    why: 'Paging limits are computed by hand at each call site instead of one helper.',
    siblings: { query: 'rg -n "pageCount" src', count: 0, locations: [] },
    outcome: 'no-guard',
    reason: 'A paging helper is a larger refactor than this fix; planned separately.',
    owner: 'team-web (ticket WEB-12)',
    ...extra
});

function writeRecord(repo, name, record, mtimeMs) {
    const dir = path.join(repo, ...prevention.RECORDS_SEGMENTS);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    fs.writeFileSync(file, typeof record === 'string' ? record : JSON.stringify(record));
    if (mtimeMs !== undefined) fs.utimesSync(file, mtimeMs / 1000, mtimeMs / 1000);
    return file;
}

const fields = result => result.problems.map(item => item.field);
const notIgnored = () => false;

function cli(repo, ...args) {
    return spawnSync(process.execPath, [LIB, ...args], { cwd: repo, encoding: 'utf8', windowsHide: true });
}

const tests = [
    {
        name: 'TC-GWF-092 a guarded record and a no-guard record with an owner are valid',
        fn: () =>
            withRepo(
                repo => {
                    // Given a record whose guard exists in the tree, and a no-guard record with a reason and an owner
                    // When each is validated, Then both are valid
                    assert.deepEqual(prevention.validateRecord(guarded(), { repository: repo, isIgnored: notIgnored }), { valid: true, problems: [] });
                    assert.deepEqual(prevention.validateRecord(noGuard(), { repository: repo }), { valid: true, problems: [] });
                    // And an environment-only cause is valid with its evidence and no sibling sweep
                    const environment = {
                        schema: 1,
                        bugClass: 'configuration',
                        rootCause: 'CI image lacks the locale',
                        why: 'Tests read the machine locale.',
                        outcome: 'not-a-code-defect',
                        evidence: 'Passes with LANG=C.UTF-8; fails only on the runner without it.'
                    };
                    assert.equal(prevention.validateRecord(environment, { repository: repo }).valid, true);
                    // And a fix that repaired no behavior defect is valid with only its reason, but never proves the gate
                    const style = { schema: 1, outcome: 'not-applicable', reason: 'Renamed two variables a review flagged; no behavior changed.' };
                    assert.equal(prevention.validateRecord(style, { repository: repo }).valid, true);
                    assert.deepEqual(fields(prevention.validateRecord({ schema: 1, outcome: 'not-applicable' }, { repository: repo })), ['reason']);
                    assert.ok(!prevention.GUARD_PROOF_OUTCOMES.includes('not-applicable'), 'not-applicable never proves recurrence-guarded');
                    // And the three classes the plan requires are in the closed vocabulary
                    for (const id of ['state-transition', 'concurrency-ordering', 'idempotency-replay'])
                        assert.ok(Object.hasOwn(prevention.BUG_CLASSES, id), id);
                },
                { gitRepo: false }
            )
    },
    {
        name: 'TC-GWF-093 a record without a bug class, an owner, a guard in the tree or evidence is invalid and says why and how to fix it',
        fn: () =>
            withRepo(
                repo => {
                    const check = record => prevention.validateRecord(record, { repository: repo, isIgnored: notIgnored });
                    // Given a no-guard record without an owner, Then the owner is named as the problem
                    const missingOwner = check(noGuard({ owner: '' }));
                    assert.deepEqual(fields(missingOwner), ['owner']);
                    assert.match(missingOwner.problems[0].problem, /nobody decides/);
                    assert.match(missingOwner.problems[0].fix, /Name the person, team or ticket/);
                    // Given a guard path absent from the tree, Then the path is the problem and the fix names the way out
                    const missingGuard = check(guarded({ guard: { tier: 'check', path: 'eslint-rules/no-raw-status.js' } }));
                    assert.deepEqual(fields(missingGuard), ['guard.path']);
                    assert.match(missingGuard.problems[0].problem, /is not a file in the tree/);
                    assert.match(missingGuard.problems[0].fix, /record outcome no-guard with a reason and an owner/);
                    // Given a directory (even the repository root) as the guard, Then it is not a guard
                    assert.deepEqual(fields(check(guarded({ guard: { tier: 'test', path: '.' } }))), ['guard.path']);
                    assert.deepEqual(fields(check(guarded({ guard: { tier: 'test', path: 'src' } }))), ['guard.path']);
                    // Given no bug class, an unknown class, or a placeholder, Then each is rejected
                    const noClass = guarded();
                    delete noClass.bugClass;
                    assert.deepEqual(fields(check(noClass)), ['bugClass']);
                    assert.match(check(noClass).problems[0].problem, /cannot be counted or guarded/);
                    assert.deepEqual(fields(check(guarded({ bugClass: 'race' }))), ['bugClass']);
                    assert.deepEqual(fields(check(guarded({ why: '<why this class of bug can happen at all>' }))), ['why']);
                    assert.deepEqual(fields(check(guarded({ bugClass: 'other' }))), ['classNote']);
                    // Given an environment cause without evidence, a missing sweep, or a path that escapes the repository
                    assert.deepEqual(fields(check({ ...noGuard(), outcome: 'not-a-code-defect', evidence: '' })), ['evidence']);
                    const noSweep = guarded();
                    delete noSweep.siblings;
                    assert.deepEqual(fields(check(noSweep)), ['siblings']);
                    assert.deepEqual(fields(check(guarded({ siblings: { query: 'rg x', count: 3, locations: [] } }))), ['siblings.locations']);
                    assert.deepEqual(fields(check(guarded({ guard: { tier: 'test', path: '../outside.js' } }))), ['guard.path']);
                    assert.deepEqual(fields(check(guarded({ guard: { tier: 'stronger', path: 'src/order-state.test.js' } }))), ['guard.tier']);
                },
                { gitRepo: false }
            )
    },
    {
        name: 'TC-GWF-094 a git-ignored guard and a secret-shaped value are rejected',
        skip: !GIT,
        fn: () =>
            withRepo(repo => {
                // Given a guard written under the git-ignored tmp/ folder, Then it never reaches the repository and is rejected
                fs.mkdirSync(path.join(repo, 'tmp'), { recursive: true });
                fs.writeFileSync(path.join(repo, 'tmp', 'guard.test.js'), '// lost\n');
                const ignored = prevention.validateRecord(guarded({ guard: { tier: 'test', path: 'tmp/guard.test.js' } }), { repository: repo });
                assert.deepEqual(fields(ignored), ['guard.path']);
                assert.match(ignored.problems[0].problem, /git-ignored/);
                // And the tracked guard is accepted by the real git check
                assert.equal(prevention.validateRecord(guarded(), { repository: repo }).valid, true);
                // Given a value shaped like a secret, Then the record is rejected without echoing it
                const token = `ghp_${'a'.repeat(36)}`;
                const leaked = prevention.validateRecord(guarded({ rootCause: `src/order.js:42 used ${token}` }), { repository: repo });
                assert.deepEqual(fields(leaked), ['rootCause']);
                assert.ok(!JSON.stringify(leaked).includes(token), 'the finding never repeats the secret');
                // And a rejected class, guard path or JSON text never repeats the value either
                const echoes = [
                    prevention.validateRecord(guarded({ bugClass: token }), { repository: repo }),
                    prevention.validateRecord(guarded({ guard: { tier: 'test', path: `../${token}` } }), { repository: repo }),
                    prevention.validateRecord(guarded({ guard: { tier: 'test', path: `src/${token}.js` } }), { repository: repo })
                ];
                for (const result of echoes) assert.ok(result.valid === false && !JSON.stringify(result.problems).includes(token), 'no value echoed');
            })
    },
    {
        name: 'TC-GWF-095 the checker CLI runs directly: MISSING exits 1, the newest valid record exits 0, an invalid file lists its problems',
        skip: !GIT,
        fn: () =>
            withRepo(repo => {
                // Given no record, When the checker runs, Then MISSING with the why and the fix, exit 1
                const missing = cli(repo, 'check');
                assert.equal(missing.status, 1, missing.stderr);
                const missingJson = JSON.parse(missing.stdout);
                assert.equal(missingJson.status, 'MISSING');
                assert.match(missingJson.message, /lets the same class of bug return elsewhere/);
                assert.match(missingJson.message, /\/fix --mode=prevent/);
                // Given an older invalid record and a newer valid one, Then the newest valid record wins
                const now = Date.now();
                writeRecord(repo, 'old.json', noGuard({ owner: '' }), now - 60_000);
                writeRecord(repo, 'new.json', guarded(), now);
                const valid = cli(repo, 'check');
                assert.equal(valid.status, 0, valid.stdout);
                assert.equal(JSON.parse(valid.stdout).file, 'tmp/prevention/records/new.json');
                // Given --file on the invalid record, Then INVALID names the field, the problem and the fix, exit 1
                const invalid = cli(repo, 'check', '--file=tmp/prevention/records/old.json');
                assert.equal(invalid.status, 1);
                const invalidJson = JSON.parse(invalid.stdout);
                assert.equal(invalidJson.status, 'INVALID');
                assert.match(invalidJson.message, /owner: .*Fix: Name the person, team or ticket/);
                assert.equal(invalidJson.record, null, 'an invalid record is never echoed back');
                // And a rejected secret never reaches the output
                const token = `ghp_${'b'.repeat(36)}`;
                writeRecord(repo, 'leak.json', noGuard({ owner: `ops ${token}` }), now - 30_000);
                const leaked = cli(repo, 'check', '--file=tmp/prevention/records/leak.json');
                assert.equal(JSON.parse(leaked.stdout).status, 'INVALID');
                assert.ok(!leaked.stdout.includes(token), 'the CLI output never repeats the secret');
                // Given --since after both records, Then MISSING
                assert.equal(JSON.parse(cli(repo, 'check', `--since=${new Date(now + 60_000).toISOString()}`).stdout).status, 'MISSING');
                // And classes and template run directly; an unknown flag is an error (exit 2)
                const classes = JSON.parse(cli(repo, 'classes').stdout);
                assert.ok(classes.classes['idempotency-replay'] && classes.tiers.impossible);
                assert.equal(prevention.validateRecord(JSON.parse(cli(repo, 'template').stdout)).valid, false, 'the template never validates as is');
                assert.equal(cli(repo, 'check', '--force').status, 2);
                // Given the run's guarded record and a newer not-applicable record from a style-only review fix,
                // Then the plain scan returns the newer record, and --proof returns the guard that proves the gate
                writeRecord(repo, 'run-guard.json', guarded(), now + 2_000);
                writeRecord(
                    repo,
                    'style-only.json',
                    { schema: 1, outcome: 'not-applicable', reason: 'Renamed two variables; no behavior changed.' },
                    now + 3_000
                );
                const plain = JSON.parse(cli(repo, 'check').stdout);
                assert.equal(plain.file, 'tmp/prevention/records/style-only.json');
                assert.equal(plain.provesRecurrenceGuard, false);
                const proof = JSON.parse(cli(repo, 'check', '--proof', `--since=${now + 1_000}`).stdout);
                assert.equal(proof.file, 'tmp/prevention/records/run-guard.json');
                assert.equal(proof.provesRecurrenceGuard, true);
                fs.rmSync(path.join(repo, ...prevention.RECORDS_SEGMENTS, 'run-guard.json'));
                fs.rmSync(path.join(repo, ...prevention.RECORDS_SEGMENTS, 'style-only.json'));
                // And a file that is not JSON is invalid, not a crash
                writeRecord(repo, 'broken.json', '{ not json', now + 1000);
                assert.equal(JSON.parse(cli(repo, 'check', '--file=tmp/prevention/records/broken.json').stdout).status, 'INVALID');
            })
    },
    {
        name: 'TC-GWF-096 a real fix activation records the marker; a read of fix/SKILL.md, another skill or no session records nothing',
        fn: async () => {
            const hook = require(path.join(HOOKS_DIR, 'skill-overlay-remind.cjs'));
            const calls = [];
            const deps = {
                projectRoot: os.tmpdir(),
                readFile: () => null,
                config: {},
                now: 1000,
                recordFixMarker: options => calls.push(options),
                write: (_text, done) => done(true)
            };
            const run = input => hook.run({ session_id: 's-1', ...input }, deps);
            // Given a Skill tool call of fix, a typed /fix and a Codex $fix prompt, Then each records the marker
            await run({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'fix', args: '--target=test' } });
            await run({ hook_event_name: 'UserPromptExpansion', command_name: '/fix' });
            await run({ hook_event_name: 'UserPromptSubmit', prompt: 'please $fix the crash', turn_id: 't' });
            assert.equal(calls.length, 3);
            assert.deepEqual(calls[0], { repository: path.resolve(os.tmpdir()), sessionId: 's-1', now: 1000 });
            // Given a maintainer reading fix/SKILL.md, another skill, or no session id, Then nothing is recorded
            await run({
                hook_event_name: 'PostToolUse',
                tool_name: 'Read',
                tool_input: { file_path: path.join(os.tmpdir(), '.claude', 'skills', 'fix', 'SKILL.md') }
            });
            await run({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'test' } });
            await hook.run({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'fix' } }, deps);
            assert.equal(calls.length, 3);
            // And a review's fix of its validated findings records too: the prevention step's record, or the fix step's
            // one-line not-applicable record after style-only findings, clears it
            await run({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'fix', args: '--target=review tmp/reports/review.md' } });
            assert.equal(calls.length, 4);
            // And a failing recorder never breaks the hook
            const failing = {
                ...deps,
                recordFixMarker: () => {
                    throw new Error('disk full');
                }
            };
            assert.equal(await hook.run({ session_id: 's-1', hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'fix' } }, failing), '');
        }
    },
    {
        name: 'TC-GWF-097 the commit line: no record after the fix warns, a valid record or no fix is silent, enforce refuses, off says nothing',
        fn: () =>
            withRepo(
                repo => {
                    const now = Date.now();
                    const finding = (extra = {}) =>
                        prevention.preventionGateFinding({ repository: repo, sessionId: 'sess-1', now, isIgnored: notIgnored, ...extra });
                    // Given no fix in this session, Then the gate is silent
                    assert.equal(finding(), null);
                    // Given a fix marker and no record, Then one warning line names why it matters and the fix
                    prevention.recordFixMarker({ repository: repo, sessionId: 'sess-1', now: now - 10_000 });
                    const warn = finding();
                    assert.equal(warn.level, 'warn');
                    assert.equal(warn.message.split('\n').length, 1, 'one line');
                    assert.match(warn.message, /^\[prevention\] Warning: a \/fix ran in this session/);
                    assert.match(warn.message, /same class of bug return elsewhere/);
                    assert.match(warn.message, /run \/fix --mode=prevent/);
                    assert.match(warn.message, /no-guard with a reason and an owner/);
                    assert.match(
                        warn.message,
                        /records outcome not-applicable with a reason/,
                        'a style-only fix is pointed at not-applicable, never at an invented class'
                    );
                    // Given a valid record written BEFORE the fix, Then it does not count
                    writeRecord(repo, 'earlier.json', noGuard(), now - 20_000);
                    assert.equal(finding().level, 'warn');
                    // Given an invalid record after the fix, Then the line names the record's problem
                    writeRecord(repo, 'bad.json', noGuard({ owner: '' }), now - 5_000);
                    assert.match(finding().message, /invalid \(owner: /);
                    // Given a valid record after the fix, Then the gate is silent
                    writeRecord(repo, 'good.json', guarded(), now - 1_000);
                    assert.equal(finding(), null);
                    // Given enforce, a pending marker refuses; off says nothing; another session's marker never applies
                    prevention.recordFixMarker({ repository: repo, sessionId: 'sess-1', now });
                    assert.equal(finding({ mode: 'enforce' }).level, 'block');
                    assert.match(finding({ mode: 'enforce' }).message, /^\[BLOCKED\] Commit refused \(reviewGate\.verify is enforce\)/);
                    assert.equal(finding({ mode: 'off' }), null);
                    assert.equal(finding({ sessionId: 'sess-2' }), null);
                    // And a marker older than its lifetime is ignored, so an abandoned fix stops warning
                    assert.equal(finding({ now: now + prevention.MARKER_TTL_MS + 1 }), null);
                    // And a not-applicable record after the fix (style-only repair) clears the reminder
                    prevention.recordFixMarker({ repository: repo, sessionId: 'sess-3', now });
                    writeRecord(
                        repo,
                        'style.json',
                        { schema: 1, outcome: 'not-applicable', reason: 'Only renamed variables; no behavior changed.' },
                        now + 1_000
                    );
                    assert.equal(finding({ sessionId: 'sess-3' }), null);
                    // And recording a marker prunes expired ones, so marker files never pile up
                    const markers = path.join(repo, ...prevention.MARKERS_SEGMENTS);
                    const stale = path.join(markers, 'stale-session.json');
                    fs.writeFileSync(stale, JSON.stringify({ schema: 1, since: 0 }));
                    const old = (Date.now() - prevention.MARKER_TTL_MS - 60_000) / 1000;
                    fs.utimesSync(stale, old, old);
                    prevention.recordFixMarker({ repository: repo, sessionId: 'sess-4' });
                    assert.ok(!fs.existsSync(stale), 'an expired marker is pruned');
                    assert.ok(
                        fs.readdirSync(markers).every(name => !name.endsWith('.tmp')),
                        'no temporary file is left behind'
                    );
                },
                { gitRepo: false }
            )
    },
    {
        name: 'TC-GWF-098 the commit gate adds the prevention line after the review check, and a fault in it never blocks',
        skip: !GIT,
        fn: () => {
            const gate = require(path.join(HOOKS_DIR, 'review-commit-gate.cjs'));
            const review = require(path.join(HOOKS_DIR, 'lib', 'review-receipt.cjs'));
            return withRepo(repo => {
                const store = fs.mkdtempSync(path.join(os.tmpdir(), 'prevention-store-'));
                const saved = process.env.CK_REVIEW_RECEIPT_STORE;
                process.env.CK_REVIEW_RECEIPT_STORE = store;
                try {
                    fs.writeFileSync(path.join(repo, 'change.txt'), 'x\n');
                    git(repo, ['add', '-A']);
                    const staged = review.captureReviewTarget({ repository: repo, cwd: repo, target: 'staged' });
                    review.issueReceipt({ repository: repo, snapshot: staged, scope: 'full-changeset', kind: 'changes-review' });
                    const input = { tool_name: 'Bash', session_id: 'sess-9', tool_input: { command: `git ${C_WORD} -m change`, cwd: repo } };
                    const quietVerify = { verifyGateFinding: () => null };
                    // Given a reviewed commit and no fix in the session, Then the gate allows it with nothing to say
                    assert.equal(gate.evaluate(input, quietVerify), undefined);
                    // Given a fix marker in this session and no record, Then the commit is allowed with the warning line
                    prevention.recordFixMarker({ repository: repo, sessionId: 'sess-9' });
                    const warned = gate.evaluate(input, quietVerify);
                    assert.equal(warned.code, 0);
                    assert.equal(warned.decision, 'warn');
                    assert.match(JSON.parse(warned.stdout).hookSpecificOutput.additionalContext, /\[prevention\] Warning: a \/fix ran in this session/);
                    // Given a fault in the prevention check, Then the commit is never blocked by it
                    const broken = {
                        ...quietVerify,
                        preventionGateFinding: () => {
                            throw new Error('corrupt marker');
                        }
                    };
                    assert.equal(gate.evaluate(input, broken), undefined);
                    // Given an injected enforce finding, Then the gate refuses with its message
                    const enforce = { ...quietVerify, preventionGateFinding: () => ({ level: 'block', message: '[BLOCKED] fixture' }) };
                    assert.equal(gate.evaluate(input, enforce).code, 2);
                    // Given the project config opting into reviewGate.verify: enforce, Then the real mode refuses the commit
                    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
                    fs.writeFileSync(
                        path.join(repo, 'docs', 'project-config.json'),
                        JSON.stringify({ project: { name: 'fixture' }, reviewGate: { verify: 'enforce' } })
                    );
                    const refused = gate.evaluate(input, quietVerify);
                    assert.equal(refused.code, 2);
                    assert.match(refused.stderr, /^\[BLOCKED\] Commit refused \(reviewGate\.verify is enforce\): a \/fix ran in this session/);
                } finally {
                    if (saved === undefined) delete process.env.CK_REVIEW_RECEIPT_STORE;
                    else process.env.CK_REVIEW_RECEIPT_STORE = saved;
                    fs.rmSync(store, { recursive: true, force: true });
                }
            });
        }
    }
];

module.exports = { name: 'prevention-record', tests };
