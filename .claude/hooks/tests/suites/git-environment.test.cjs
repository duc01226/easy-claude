'use strict';

// TechnicalSpec=git-candidate-environment: transport config must not change reviewed content or hide failures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const receipts = require('../../lib/review-receipt.cjs');
const gate = require('../../review-commit-gate.cjs');
const { withGitEnvironment, fixtureEnvironment, fixtureGitEnvironment } = require('../lib/git-fixture.cjs');
const REVIEW = path.resolve(__dirname, '../../lib/review-receipt.cjs');
const VERIFY = path.resolve(__dirname, '../../lib/verify-receipt.cjs');
const GIT = cp.spawnSync('git', ['--version'], { stdio: 'ignore', windowsHide: true }).status === 0;
const pairs = entries =>
    Object.fromEntries([
        ['GIT_CONFIG_COUNT', String(entries.length)],
        ...entries.flatMap(([key, value], i) => [
            [`GIT_CONFIG_KEY_${i}`, key],
            [`GIT_CONFIG_VALUE_${i}`, value]
        ])
    ]);
const profile = () =>
    pairs([
        ['credential.https://example.invalid/git/.helper', ''],
        ['credential.https://example.invalid/git/.helper', '!exit 91'],
        ['credential.https://example.invalid/git/.useHttpPath', 'true'],
        ['http.https://example.invalid/git/.proactiveAuth', 'true'],
        ['http.https://example.invalid/git/.followRedirects', 'false'],
        ['credential.https://staging.example.invalid/git/.helper', ''],
        ['credential.https://staging.example.invalid/git/.helper', '!exit 91'],
        ['credential.https://staging.example.invalid/git/.useHttpPath', 'true'],
        ['http.https://staging.example.invalid/git/.proactiveAuth', 'true'],
        ['http.https://staging.example.invalid/git/.followRedirects', 'false']
    ]);

function fixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'candidate-env-')));
    try {
        return withGitEnvironment({}, () => {
            const env = fixtureEnvironment(root);
            for (const name of Object.keys(process.env)) if (!(name in env)) delete process.env[name];
            Object.assign(process.env, env);
            const git = args => cp.execFileSync('git', args, { cwd: root, env: fixtureGitEnvironment(), encoding: 'utf8', stdio: 'pipe', windowsHide: true });
            git(['init', '-q']);
            git(['config', 'user.name', 'Fixture']);
            git(['config', 'user.email', 'fixture@example.invalid']);
            git(['config', 'commit.gpgsign', 'false']);
            git(['config', 'core.hooksPath', path.join(root, 'empty-hooks')]);
            fs.writeFileSync(path.join(root, '.gitignore'), '/tmp/\n/temp/\n');
            fs.writeFileSync(path.join(root, 'file.txt'), 'base\n');
            git(['add', '--', '.gitignore', 'file.txt']);
            git(['commit', '-qm', 'baseline']);
            git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
            fs.writeFileSync(path.join(root, 'file.txt'), 'candidate\n');
            git(['add', '--', 'file.txt']);
            process.env.CK_REVIEW_RECEIPT_STORE = path.join(root, 'store');
            return fn({ root, git });
        });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

const tests = [
    {
        name: 'TC-FIT-013 documented transport families and complete empty or bounded vectors are content-neutral',
        fn: () => {
            for (const env of [{}, { GIT_CONFIG_COUNT: '' }, { GIT_CONFIG_COUNT: '0' }, profile()]) assert.equal(receipts.gitEnvironmentError(env), null);
            for (const count of [1, 3, 10, 99]) {
                const env = pairs(
                    Array.from({ length: count }, (_, i) => [
                        i % 2 ? 'credential.HTTP://example.invalid/.HELPER' : 'http.https://example.invalid/.followRedirects',
                        ''
                    ])
                );
                assert.equal(receipts.gitEnvironmentError(env), null, `complete ${count}-pair profile`);
                assert.equal(receipts.gitEnvironmentError(Object.fromEntries(Object.entries(env).reverse())), null, 'iteration order cannot change support');
                assert.equal(
                    receipts.gitEnvironmentError({ ...env, GIT_CONFIG_KEY_0: 'url.https://example.invalid/.insteadOf' }),
                    null,
                    'legacy support remains'
                );
                assert.equal(receipts.gitEnvironmentError({ ...env, GIT_CONFIG_KEY_0: 'credential.interactive' }), null);
                assert.equal(
                    receipts.gitEnvironmentError(Object.fromEntries(Object.entries(env).map(([k, v]) => [k.toLowerCase(), v]))),
                    null,
                    'field names are case-insensitive'
                );
            }
        }
    },
    {
        name: 'TC-FIT-013 unknown mixed keys and malformed context still fail closed without exposing values',
        fn: () => {
            for (const key of [
                'core.worktree',
                'core.hooksPath',
                'filter.fixture.clean',
                'include.path',
                'http.sslVerify',
                'credential.unknown',
                'http.https://example.invalid/.unknown',
                'credential.interactive\n',
                'credential.https://example.invalid/\u0000.helper'
            ]) {
                assert.ok(receipts.gitEnvironmentError({ ...profile(), GIT_CONFIG_KEY_8: key }), key);
            }
            for (const env of [
                pairs(Array.from({ length: 100 }, () => ['credential.interactive', 'false'])),
                { GIT_CONFIG_COUNT: '100' },
                { GIT_CONFIG_COUNT: '01' },
                { GIT_CONFIG_COUNT: '-1' },
                { GIT_CONFIG_COUNT: 'one' },
                { GIT_CONFIG_COUNT: '1\n', GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: '' },
                { GIT_CONFIG_COUNT: '0', git_config_count: '0' },
                { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.interactive' },
                { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: undefined },
                { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 42, GIT_CONFIG_VALUE_0: '' },
                { ...profile(), GIT_CONFIG_COUNT: '3' },
                { ...profile(), GIT_CONFIG_COUNT: '0' },
                { ...profile(), GIT_CONFIG_COUNT: '' },
                { GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: '' },
                { ...profile(), GIT_CONFIG_PARAMETERS: 'forbidden' },
                { ...profile(), GIT_INDEX_FILE: 'forbidden' },
                { ...profile(), GIT_CONFIG_GLOBAL: 'forbidden' },
                { ...profile(), GIT_WORK_TREE: 'forbidden' }
            ])
                assert.ok(receipts.gitEnvironmentError(env), JSON.stringify(Object.keys(env)));
        }
    },
    {
        name: 'TC-FIT-014 accepted host settings preserve each supported candidate and never reach capture Git',
        skip: !GIT,
        fn: () =>
            fixture(({ root }) => {
                const variants = [
                    { target: 'worktree' },
                    { target: 'staged' },
                    { target: 'commit-descriptor', descriptor: { mode: 'staged', literalPaths: [] } },
                    { target: 'commit-descriptor', descriptor: { mode: 'all', literalPaths: [] } },
                    { target: 'commit-descriptor', descriptor: { mode: 'literal-paths', literalPaths: ['file.txt'] } },
                    { target: 'branch', descriptor: { base: 'origin/main', staged: true } }
                ];
                const indexPath = path.join(root, '.git/index');
                const before = fs.readFileSync(indexPath);
                for (const variant of variants) {
                    const clean = receipts.captureReviewTarget({ repository: root, cwd: root, ...variant });
                    assert.equal(clean.status, 'CHANGED');
                    let calls = 0;
                    const observed = withGitEnvironment(profile(), () =>
                        receipts.captureReviewTarget({
                            repository: root,
                            cwd: root,
                            ...variant,
                            exec: (command, args, options) => {
                                calls++;
                                assert.equal(
                                    Object.keys(options.env).some(k => /^GIT_CONFIG/i.test(k)),
                                    false,
                                    'transport configuration stays outside snapshot execution'
                                );
                                assert.equal(
                                    args.some(a => ['fetch', 'push', 'pull', 'clone', 'credential'].includes(a)),
                                    false,
                                    'snapshot is local'
                                );
                                return cp.execFileSync(command, args, options);
                            }
                        })
                    );
                    assert.ok(calls > 0);
                    for (const key of ['status', 'repository', 'storageIdentity', 'baseTree', 'candidateTree', 'fingerprint'])
                        assert.equal(observed[key], clean[key], `${variant.target}:${key}`);
                    assert.deepEqual(fs.readFileSync(indexPath), before, 'snapshot cannot change the real index');
                }
            })
    },
    {
        name: 'TC-FIT-014 supported authentication never bypasses review and unsafe context denies before execution',
        skip: !GIT,
        fn: () =>
            fixture(({ root }) =>
                withGitEnvironment(profile(), () => {
                    const input = { tool_name: 'Bash', cwd: root, tool_input: { command: 'git commit -m candidate' } };
                    assert.equal(gate.evaluate(input).code, 2, 'supported config does not manufacture review proof');
                    const reviewed = receipts.captureReviewTarget({ repository: root, cwd: root, target: 'staged' });
                    assert.equal(reviewed.status, 'CHANGED');
                    receipts.issueReceipt({ repository: root, snapshot: reviewed, kind: 'changes-review', scope: 'full-changeset' });
                    assert.notEqual(gate.evaluate(input)?.code, 2, 'matching reviewed candidate is allowed with supported config');
                    withGitEnvironment({ ...profile(), GIT_INDEX_FILE: path.join(root, 'other-index') }, () => {
                        let calls = 0;
                        const result = receipts.captureReviewTarget({
                            repository: root,
                            cwd: root,
                            target: 'staged',
                            exec: () => {
                                calls++;
                                throw new Error('must not run');
                            }
                        });
                        assert.equal(result.status, 'ERROR');
                        assert.equal(result.errorCode, 'UNSUPPORTED_GIT_ENVIRONMENT');
                        assert.equal(calls, 0);
                        assert.equal(gate.evaluate(input).code, 2, 'even a valid receipt cannot approve an unsupported index');
                    });
                    fs.writeFileSync(path.join(root, 'file.txt'), 'new candidate\n');
                    assert.equal(gate.evaluate({ ...input, tool_input: { command: 'git commit -a -m changed' } }).code, 2, 'a stale receipt still denies');
                })
            )
    },
    {
        name: 'TC-FIT-015 checked readers strip admitted config and real CLIs preserve error causes',
        skip: !GIT,
        fn: () =>
            fixture(({ root, git }) => {
                const expectedRepository = receipts.canonicalDirectory(root);
                const expectedBranch = git(['symbolic-ref', '--quiet', '--short', 'HEAD']).trim();
                withGitEnvironment(profile(), () => {
                    const cleanExec = (command, args, options) => {
                        assert.ok(options.env, 'discovery must supply an explicit child environment');
                        assert.equal(
                            Object.keys(options.env).some(k => /^GIT_CONFIG/i.test(k)),
                            false,
                            'transport configuration stays outside discovery execution'
                        );
                        return cp.execFileSync(command, args, options);
                    };
                    const repository = receipts.requireRepository(root, cleanExec);
                    assert.equal(typeof repository, 'string');
                    assert.equal(receipts.canonicalDirectory(repository), expectedRepository);
                    const legacyRepository = receipts.resolveRepository(root, cleanExec);
                    assert.equal(typeof legacyRepository, 'string', 'legacy repository reader retains its string contract');
                    assert.equal(receipts.canonicalDirectory(legacyRepository), expectedRepository);
                    assert.equal(receipts.readCurrentBranch(root, cleanExec), expectedBranch);
                    assert.equal(receipts.currentBranch(root, cleanExec), expectedBranch, 'legacy branch reader retains its branch-name contract');
                });
                const gitFailure = status => () => {
                    throw Object.assign(new Error('SYNTHETIC_PRIVATE_STDERR'), { status });
                };
                assert.equal(receipts.readCurrentBranch(root, gitFailure(1)), null, 'only detached HEAD maps to null in the checked reader');
                assert.throws(() => receipts.readCurrentBranch(root, gitFailure(128)), {
                    code: 'BRANCH_UNAVAILABLE',
                    message: 'Cannot determine the current Git branch safely'
                });
                assert.equal(receipts.currentBranch(root, gitFailure(128)), null, 'legacy branch reader retains its null-on-error contract');
                const secret = 'SYNTHETIC_DIAGNOSTIC_SENTINEL';
                const bad = pairs([[`http.https://user:${secret}@example.invalid/.unknown`, secret]]);
                for (const [file, args] of [
                    [REVIEW, ['snapshot', '--target=staged']],
                    [VERIFY, ['plan']]
                ]) {
                    const r = cp.spawnSync(process.execPath, [file, ...args], {
                        cwd: root,
                        env: { ...process.env, ...bad },
                        encoding: 'utf8',
                        windowsHide: true
                    });
                    assert.equal(r.status, 2);
                    assert.match(r.stderr, /UNSUPPORTED_GIT_ENVIRONMENT/);
                    assert.doesNotMatch(r.stderr, /Not inside a resolvable Git repository/);
                    assert.ok(!r.stderr.includes(secret), 'diagnostics cannot reveal key URL credentials or values');
                }
                const absent = fs.mkdtempSync(path.join(os.tmpdir(), 'no-candidate-repo-'));
                try {
                    // A missing worktree store stops upward discovery even when the temp root is inside a repository.
                    fs.writeFileSync(path.join(absent, '.git'), `gitdir: ${path.join(absent, 'missing-storage')}\n`);
                    const r = cp.spawnSync(process.execPath, [VERIFY, 'plan'], { cwd: absent, env: { ...process.env }, encoding: 'utf8', windowsHide: true });
                    assert.equal(r.status, 2);
                    assert.match(r.stderr, /Not inside a resolvable Git repository/);
                    assert.doesNotMatch(r.stderr, /UNSUPPORTED_GIT_ENVIRONMENT/);
                } finally {
                    fs.rmSync(absent, { recursive: true, force: true });
                }
            })
    },
    {
        name: 'TC-FIT-015 PR and commit denial preserve environment cause and actionable recovery',
        skip: !GIT,
        fn: () =>
            fixture(({ root }) =>
                withGitEnvironment({ GIT_INDEX_FILE: path.join(root, 'other-index') }, () => {
                    let calls = 0;
                    const mustNotRun = () => {
                        calls++;
                        throw new Error('unsupported context must deny before Git execution');
                    };
                    for (const read of [receipts.requireRepository, receipts.readCurrentBranch]) {
                        assert.throws(() => read(root, mustNotRun), { code: 'UNSUPPORTED_GIT_ENVIRONMENT' });
                    }
                    assert.equal(receipts.resolveRepository(root, mustNotRun), null, 'legacy repository reader retains its null-on-error contract');
                    assert.equal(receipts.currentBranch(root, mustNotRun), null, 'legacy branch reader retains its null-on-error contract');
                    assert.equal(calls, 0);
                    const input = { tool_name: 'Bash', cwd: root, tool_input: { command: 'git commit -m candidate' } };
                    const denied = gate.evaluate(input);
                    assert.equal(denied.code, 2);
                    assert.match(denied.stderr, /UNSUPPORTED_GIT_ENVIRONMENT/);
                    assert.doesNotMatch(denied.stderr, /has no matching review fix-loop receipt/);
                    assert.doesNotMatch(denied.stderr, /Skip —|Then retry/);
                    const pr = gate.evaluate({ ...input, tool_input: { command: 'gh pr create --title candidate' } }, { reviewGateMode: () => 'enforce' });
                    assert.equal(pr.code, 2);
                    assert.match(pr.stderr, /UNSUPPORTED_GIT_ENVIRONMENT/);
                    assert.match(pr.stderr, /Git environment cannot be validated/);
                    assert.match(pr.stderr, /Fix the unsupported host Git context/);
                    assert.doesNotMatch(pr.stderr, /has no whole-branch review receipt|Review the staged branch candidate|issue --kind=skip/);
                    assert.doesNotMatch(pr.stderr, /HEAD is detached/);
                })
            )
    }
];

module.exports = { name: 'Git candidate environment contract', tests };
