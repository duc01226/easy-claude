'use strict';

// TECHNICAL-ONLY: test setup owns Git context and restores its caller; this is not host-policy proof.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { cleanGitEnvironment, fixtureEnvironment, fixtureGitEnvironment, withGitEnvironment, withFixtureEnvironment } = require('../lib/git-fixture.cjs');

const gitKeys = env =>
    Object.keys(env)
        .filter(key => /^GIT_/i.test(key))
        .sort();
const GIT = spawnSync('git', ['--version'], { env: fixtureGitEnvironment(), encoding: 'utf8', windowsHide: true }).status === 0;

// Exact comparison stays private: AssertionError must never retain raw parent environment values.
function assertEnvironmentEqual(actual, expected, message = 'Parent environment must be restored exactly; values withheld') {
    assert.equal(isDeepStrictEqual(actual, expected), true, message);
}

function poisonEnvironment() {
    const env = { GIT_CONFIG_COUNT: '10', GIT_DIR: '/synthetic/foreign', git_work_tree: '/synthetic/worktree', GiT_Index_File: '/synthetic/index' };
    for (let index = 0; index < 10; index++) {
        env[`GIT_CONFIG_KEY_${index}`] = 'credential.helper';
        env[`GIT_CONFIG_VALUE_${index}`] = '!synthetic-helper-must-never-run';
    }
    env.git_config_key_12 = 'core.hooksPath';
    env.Git_Config_Value_12 = '/synthetic/hooks';
    return env;
}

const tests = [
    {
        name: '[TechnicalSpec=git-fixture-clean-copy] every Git carrier spelling and trailing slot is removed without mutating the base',
        fn: () => {
            const base = { ...poisonEnvironment(), PATH: 'synthetic-path', ordinary: 'preserved' };
            const before = { ...base };
            const clean = cleanGitEnvironment(base);
            assert.deepEqual(clean, { PATH: 'synthetic-path', ordinary: 'preserved' });
            assert.deepEqual(base, before, 'building a child environment cannot mutate its parent');
            const sentinel = 'SYNTHETIC_PRIVATE_ENV_VALUE';
            assert.throws(
                () => assertEnvironmentEqual({}, { SYNTHETIC_API_TOKEN: sentinel }),
                error => {
                    assert.equal(error.actual, false);
                    assert.equal(error.expected, true);
                    for (const diagnostic of [error.message, error.stack, JSON.stringify(error)]) {
                        assert.equal(diagnostic.includes(sentinel), false, 'a failed equality check must not serialize environment values');
                    }
                    return true;
                }
            );
        }
    },
    {
        name: '[TechnicalSpec=git-fixture-setup-boundary] raw Git setup controls never leak into the clean process environment',
        fn: () =>
            withGitEnvironment(poisonEnvironment(), () => {
                const clean = cleanGitEnvironment();
                const setup = fixtureGitEnvironment();
                assert.deepEqual(gitKeys(clean), []);
                assert.deepEqual(gitKeys(setup), ['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_TERMINAL_PROMPT']);
                assert.equal(setup.GIT_CONFIG_GLOBAL, os.devNull);
                assert.equal(setup.GIT_CONFIG_NOSYSTEM, '1');
                assert.equal(setup.GIT_TERMINAL_PROMPT, '0');
                assert.equal(process.env.GIT_CONFIG_COUNT, '10', 'a child setup copy leaves the deliberate parent context intact');
            })
    },
    {
        name: '[TechnicalSpec=git-fixture-complete-vector] a short complete vector replaces every slot of a poisoned parent',
        fn: () =>
            withGitEnvironment(poisonEnvironment(), () => {
                const before = { ...process.env };
                const vector = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: 'false' };
                const value = withGitEnvironment(vector, () => {
                    assert.deepEqual(gitKeys(process.env), Object.keys(vector).sort());
                    for (const [key, expected] of Object.entries(vector)) assert.equal(process.env[key], expected);
                    process.env.GIT_CONFIG_VALUE_99 = 'synthetic-added';
                    delete process.env.GIT_CONFIG_KEY_0;
                    return 'returned';
                });
                assert.equal(value, 'returned');
                assertEnvironmentEqual({ ...process.env }, before, 'every added/deleted key is restored after success');
            })
    },
    {
        name: '[TechnicalSpec=git-fixture-throw-restoration] a thrown callback restores deleted, changed and added environment keys',
        fn: () =>
            withGitEnvironment(poisonEnvironment(), () => {
                const before = { ...process.env };
                const error = new Error('synthetic callback failure');
                assert.throws(
                    () =>
                        withGitEnvironment({}, () => {
                            delete process.env.PATH;
                            process.env.CK_FIXTURE_ADDED = 'temporary';
                            process.env.GIT_NEW_CONTEXT = 'temporary';
                            throw error;
                        }),
                    thrown => thrown === error
                );
                assertEnvironmentEqual({ ...process.env }, before);
            })
    },
    {
        name: '[TechnicalSpec=git-fixture-async-restoration] promise fulfillment and rejection restore only after the callback settles',
        fn: async () =>
            withGitEnvironment(poisonEnvironment(), async () => {
                const before = { ...process.env };
                assert.equal(
                    await withGitEnvironment({}, async () => {
                        await Promise.resolve();
                        assert.deepEqual(gitKeys(process.env), []);
                        process.env.GIT_ASYNC_ADDED = 'temporary';
                        return 'settled';
                    }),
                    'settled'
                );
                assertEnvironmentEqual({ ...process.env }, before);
                const error = new Error('synthetic async failure');
                await assert.rejects(
                    withGitEnvironment({}, async () => {
                        await Promise.resolve();
                        process.env.CK_ASYNC_ADDED = 'temporary';
                        delete process.env.PATH;
                        throw error;
                    }),
                    thrown => thrown === error
                );
                assertEnvironmentEqual({ ...process.env }, before);
            })
    },
    {
        name: '[TechnicalSpec=git-fixture-home-boundary] fixture home, config, switches and child temp belong to the caller root',
        fn: () =>
            withGitEnvironment(
                {
                    ...poisonEnvironment(),
                    CK_DEBUG: '1',
                    CODEX_FIXTURE_SWITCH: '1',
                    TELEGRAM_BOT_TOKEN: 'synthetic-only',
                    OPENAI_API_KEY: 'synthetic-only',
                    ANTHROPIC_API_KEY: 'synthetic-only',
                    GEMINI_API_KEY: 'synthetic-only',
                    FIXTURE_SECRET: 'synthetic-only',
                    OTHER_TOKEN: 'synthetic-only',
                    NODE_OPTIONS: '--no-warnings'
                },
                () => {
                    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'git-fixture-home-')));
                    const before = { ...process.env };
                    try {
                        const env = fixtureEnvironment(root);
                        assert.deepEqual(gitKeys(env), []);
                        assert.equal(env.CK_DEBUG, undefined);
                        assert.equal(env.CODEX_FIXTURE_SWITCH, undefined);
                        assert.equal(env.TELEGRAM_BOT_TOKEN, undefined);
                        for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'FIXTURE_SECRET', 'OTHER_TOKEN', 'NODE_OPTIONS']) {
                            assert.equal(env[key], undefined, `${key} cannot enter a fixture child`);
                        }
                        assert.equal(env.HOME, root);
                        assert.equal(env.USERPROFILE, root);
                        assert.equal(env.XDG_CONFIG_HOME, path.join(root, 'xdg'));
                        for (const key of ['TMPDIR', 'TEMP', 'TMP']) assert.equal(env[key], root);
                        withFixtureEnvironment(root, { CK_FIXTURE_SELECTED: 'yes' }, () => {
                            assert.equal(process.env.CK_DEBUG, undefined);
                            assert.equal(process.env.CK_FIXTURE_SELECTED, 'yes');
                            const result = spawnSync(
                                process.execPath,
                                [
                                    '-e',
                                    'process.stdout.write(JSON.stringify({git:Object.keys(process.env).filter(k=>/^GIT_/i.test(k)),home:process.env.HOME,temp:require("node:os").tmpdir()}))'
                                ],
                                {
                                    env: process.env,
                                    encoding: 'utf8',
                                    windowsHide: true
                                }
                            );
                            assert.equal(result.status, 0, result.stderr);
                            assert.deepEqual(JSON.parse(result.stdout), { git: [], home: root, temp: root });
                        });
                        assertEnvironmentEqual({ ...process.env }, before);
                    } finally {
                        fs.rmSync(root, { recursive: true, force: true });
                    }
                }
            )
    },
    {
        name: '[TechnicalSpec=git-fixture-receipt-isolation] poisoned parent cannot redirect fixture Git or its real receipt capture',
        skip: !GIT,
        fn: () =>
            withGitEnvironment(poisonEnvironment(), () => {
                const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'git-fixture-receipt-')));
                const before = { ...process.env };
                try {
                    withFixtureEnvironment(root, {}, () => {
                        const git = args =>
                            execFileSync('git', args, {
                                cwd: root,
                                env: fixtureGitEnvironment(),
                                encoding: 'utf8',
                                stdio: ['ignore', 'pipe', 'pipe'],
                                windowsHide: true
                            });
                        git(['init', '-q']);
                        git(['config', 'user.name', 'Fixture']);
                        git(['config', 'user.email', 'fixture@example.invalid']);
                        git(['config', 'commit.gpgsign', 'false']);
                        fs.writeFileSync(path.join(root, '.gitignore'), '/tmp/\n/temp/\n');
                        fs.writeFileSync(path.join(root, 'file.txt'), 'base\n');
                        git(['add', '--', '.gitignore', 'file.txt']);
                        git(['commit', '-q', '-m', 'base']);
                        fs.writeFileSync(path.join(root, 'file.txt'), 'changed\n');
                        git(['add', '--', 'file.txt']);
                        const expectedTree = git(['write-tree']).trim();
                        const receipts = require('../../lib/review-receipt.cjs');
                        const snapshot = receipts.captureReviewTarget({ repository: root, cwd: root, target: 'worktree' });
                        assert.equal(snapshot.status, 'CHANGED');
                        assert.equal(snapshot.repository, receipts.canonicalDirectory(root));
                        assert.equal(snapshot.candidateTree, expectedTree, 'capture contains the owned fixture files without scratch output');
                        assert.match(snapshot.fingerprint, /^[a-f0-9]{64}$/);
                        assert.deepEqual(gitKeys(process.env), [], 'raw setup controls never reach receipt capture');
                    });
                    assertEnvironmentEqual({ ...process.env }, before);
                } finally {
                    fs.rmSync(root, { recursive: true, force: true });
                }
            })
    }
];

module.exports = { name: 'git-fixture', tests };
