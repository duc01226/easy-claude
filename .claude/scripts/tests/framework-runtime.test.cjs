'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveFrameworkMode, QUIET_HOOKS } = require('../../hooks/lib/framework-runtime.cjs');
const root = path.resolve(__dirname, '../..');
const repo = path.dirname(root);
const cli = path.join(root, 'scripts/framework-mode.cjs');
const settings = JSON.parse(fs.readFileSync(path.join(root, 'settings.json'), 'utf8'));
const hooks = [...new Set(Object.values(settings.hooks).flatMap(groups => groups.flatMap(group => group.hooks.map(hook =>
    /\.claude\/hooks\/([\w./-]+\.cjs)/.exec(hook.command)?.[1]).filter(Boolean))))];

function fixture(t) {
    const tmp = path.join(repo, 'tmp');
    fs.mkdirSync(tmp, { recursive: true });
    const dir = fs.mkdtempSync(path.join(tmp, 'framework-runtime-'));
    const homeDir = path.join(dir, 'home');
    const rootDir = path.join(dir, 'project');
    fs.mkdirSync(path.join(rootDir, '.claude'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: homeDir, USERPROFILE: homeDir,
        TMPDIR: dir, TEMP: dir, TMP: dir, CLAUDE_PROJECT_DIR: rootDir, CK_AUTO_INSTALL_DEPENDENCIES: '0' };
    const write = (file, value) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
    };
    const local = path.join(rootDir, '.claude/.ck.local.json');
    const user = path.join(homeDir, '.claude/.ck.json');
    const team = path.join(rootDir, 'docs/project-config.json');
    const resolve = extra => resolveFrameworkMode({ rootDir, homeDir, env: {}, ...extra });
    const run = (file, args = [], input = '{}', extraEnv = {}, cwd = rootDir) => spawnSync(process.execPath, [file, ...args], {
        cwd, env: { ...env, ...extraEnv }, input, encoding: 'utf8', windowsHide: true, timeout: 15000
    });
    return { dir, rootDir, homeDir, write, local, user, team, resolve, run, env };
}

test('runtime preferences resolve global, checkout and environment overrides without changing lower layers', t => {
    const f = fixture(t);
    assert.equal(f.resolve().mode, 'on');
    f.write(f.team, { project: { name: 'Fixture' }, frameworkRuntime: { mode: 'quiet' } });
    assert.equal(f.resolve().source, 'project-config');
    f.write(f.user, { frameworkRuntime: { mode: 'off' } });
    assert.equal(f.resolve().mode, 'off');
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    assert.equal(f.resolve().mode, 'on');
    assert.equal(f.resolve({ env: { CK_FRAMEWORK_MODE: '"quiet"' } }).mode, 'quiet');
    assert.equal(f.resolve({ scope: 'team' }).mode, 'quiet');
    f.write(f.local, { frameworkRuntime: { mode: false } });
    assert.equal(f.resolve().source, 'user-config');
    f.write(f.user, 'broken json');
    assert.equal(f.resolve().source, 'project-config');
});

test('relocated team configuration and Windows UTF-16 preferences retain the same precedence', t => {
    const f = fixture(t);
    f.write(path.join(f.rootDir, '.claude/.ck.json'), { portability: { projectConfigPath: 'config/project.json' } });
    f.write(path.join(f.rootDir, 'config/project.json'), { frameworkRuntime: { mode: 'off' } });
    assert.equal(f.resolve().mode, 'off');
    f.write(f.user, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('{"frameworkRuntime":{"mode":"quiet"}}', 'utf16le')]));
    assert.equal(f.resolve().mode, 'quiet');
});

test('off leaves every registered hook silent without runtime side effects', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'off' } });
    assert.ok(hooks.length > 30, 'exercise the real registry, not a vacuous fixture');
    for (const hook of hooks) {
        for (const input of ['invalid input', JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'implement the UI', cwd: f.rootDir, session_id: 'off-test' })]) {
            const result = f.run(path.join(root, 'hooks', hook), [], input);
            assert.equal(result.status, 0, `${hook}: ${result.stderr}`);
            assert.equal(result.stdout + result.stderr, '', hook);
        }
    }
    assert.deepEqual(fs.readdirSync(f.rootDir), ['.claude']);
    assert.deepEqual(fs.readdirSync(path.join(f.rootDir, '.claude')), ['.ck.local.json']);
});

test('quiet and off suppress the registered UI reminder through both native launch shapes', t => {
    const f = fixture(t);
    const hook = path.join(root, 'hooks/ui-reuse-remind.cjs');
    const input = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'implement the UI', cwd: f.rootDir, session_id: 'ui-mode-test' });
    for (const mode of ['off', 'quiet']) {
        for (const result of [f.run(hook, [], input, { CK_FRAMEWORK_MODE: mode }),
            f.run('-e', ['require(process.argv[1])', '--', hook], input, { CK_FRAMEWORK_MODE: mode })]) {
            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout + result.stderr, '', mode);
        }
    }
    assert.deepEqual(fs.readdirSync(f.rootDir), ['.claude'], 'disabled reminders create no ledger');
});

test('quiet suppresses every context hook but still blocks a commit lacking review evidence', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    for (const hook of hooks.filter(hook => !QUIET_HOOKS.has(hook))) {
        const result = f.run(path.join(root, 'hooks', hook), [], 'invalid input must remain unread');
        assert.equal(result.status, 0, `${hook}: ${result.stderr}`);
        assert.equal(result.stdout + result.stderr, '', hook);
    }
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: f.rootDir, env: f.env }).status, 0);
    f.write(path.join(f.rootDir, 'candidate.txt'), 'changed');
    assert.equal(spawnSync('git', ['add', 'candidate.txt'], { cwd: f.rootDir, env: f.env }).status, 0);
    const result = f.run(path.join(root, 'hooks/review-commit-gate.cjs'), [], JSON.stringify({
        hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit -m test' }, cwd: f.rootDir
    }));
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /review|receipt|lease|git/i);
});

test('reenabling restores real hook output through direct and Codex-style launchers', t => {
    const f = fixture(t);
    const input = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'Please commit these changes', cwd: f.rootDir });
    const hook = path.join(root, 'hooks/commit-skill-route.cjs');
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    assert.equal(f.run(hook, [], input).stdout, '');
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    const direct = f.run(hook, [], input);
    assert.equal(direct.status, 0, direct.stderr);
    assert.match(direct.stdout, /COMMIT-SKILL-ROUTE/);
    const launch = mode => f.run('-e', ['require(process.argv[1])', '--', hook], input, { CK_FRAMEWORK_MODE: mode });
    assert.equal(launch('off').stdout, '');
    assert.match(launch('on').stdout, /COMMIT-SKILL-ROUTE/);
});

test('CLI saves and resets scoped preferences, preserves unrelated keys, and reports a masking override', t => {
    const f = fixture(t);
    f.write(f.user, { locale: { responseLanguage: 'en' } });
    let result = f.run(cli, ['off', '--scope=user', '--json'], '{}', { CK_FRAMEWORK_MODE: 'on' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, 'environment');
    assert.equal(JSON.parse(result.stdout).saved.mode, 'off');
    assert.equal(JSON.parse(fs.readFileSync(f.user)).locale.responseLanguage, 'en');
    result = f.run(cli, ['reset', '--scope=user', '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.user)), { locale: { responseLanguage: 'en' } });
    f.write(f.user, '{broken');
    assert.equal(f.run(cli, ['quiet', '--scope=user']).status, 1);
    assert.equal(fs.readFileSync(f.user, 'utf8'), '{broken');
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: f.rootDir, env: f.env }).status, 0);
    assert.equal(f.run(cli, ['quiet']).status, 1, 'unignored checkout settings must not be written');
    f.write(path.join(f.rootDir, '.gitignore'), '.claude/.ck.local.json\n');
    result = f.run(cli, ['quiet', '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, 'local-override');
    const saved = fs.readFileSync(f.local, 'utf8');
    result = f.run(cli, ['off'], '{}', { CLAUDE_PROJECT_DIR: 'relative-root' });
    assert.equal(result.status, 1, 'an invalid explicit project selector must not modify the cwd checkout');
    assert.equal(fs.readFileSync(f.local, 'utf8'), saved);
});

test('both schemas reject an invalid runtime mode and configuration help exposes the real key', () => {
    const { validateCkConfig } = require('../../hooks/lib/ck-config-schema.cjs');
    const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
    for (const mode of ['on', 'quiet', 'off']) {
        assert.equal(validateCkConfig({ frameworkRuntime: { mode } }).valid, true);
        assert.equal(validateConfig({ project: { name: 'Fixture' }, frameworkRuntime: { mode } }).valid, true);
    }
    assert.equal(validateCkConfig({ frameworkRuntime: { mode: 'oops' } }).valid, false);
    assert.equal(validateConfig({ project: { name: 'Fixture' }, frameworkRuntime: { mode: 'oops' } }).valid, false);
    const { ckOptions } = require('../ck-config-help.cjs');
    assert.ok(ckOptions().some(option => option.key === 'frameworkRuntime.mode' && option.describe.includes('quiet')));
});

// Invariant: quiet stays generic-guidance-free, but a project that opts in still delivers its OWN rules
// (overlays, per-file conventions, auto-trigger policy); the opt-in follows the same layers as the mode.
test('quietProjectRules keeps only the project-rule hooks in quiet, layered like the mode', t => {
    const { resolveQuietProjectRules, isHookEnabled, QUIET_PROJECT_RULE_HOOKS } = require('../../hooks/lib/framework-runtime.cjs');
    const f = fixture(t);
    const opts = extra => ({ rootDir: f.rootDir, homeDir: f.homeDir, env: {}, ...extra });
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    for (const hook of QUIET_PROJECT_RULE_HOOKS) assert.equal(isHookEnabled(hook, opts()), false, `${hook} off by default in quiet`);
    f.write(f.team, { project: { name: 'Fixture' }, frameworkRuntime: { quietProjectRules: true } });
    assert.deepEqual([resolveQuietProjectRules(opts()).enabled, resolveQuietProjectRules(opts()).source], [true, 'project-config']);
    for (const hook of QUIET_PROJECT_RULE_HOOKS) assert.equal(isHookEnabled(hook, opts()), true, `${hook} kept by the team opt-in`);
    for (const hook of ['protocol-inject-universal-1.cjs', 'workflow-route-inject.cjs', 'core-principles-inject.cjs']) {
        assert.equal(isHookEnabled(hook, opts()), false, `${hook} stays quiet`);
    }
    f.write(f.local, { frameworkRuntime: { mode: 'quiet', quietProjectRules: false } });
    assert.equal(resolveQuietProjectRules(opts()).enabled, false, 'a checkout preference beats the team value');
    assert.equal(resolveQuietProjectRules(opts({ env: { CK_QUIET_PROJECT_RULES: 'true' } })).enabled, true, 'the environment wins last');
    f.write(f.local, { frameworkRuntime: { mode: 'off', quietProjectRules: true } });
    for (const hook of QUIET_PROJECT_RULE_HOOKS) assert.equal(isHookEnabled(hook, opts()), false, `${hook} silent in off`);
});

test('quietProjectRules delivers real hook output in quiet when opted in', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    const input = JSON.stringify({ session_id: 'qpr', hook_event_name: 'UserPromptSubmit', prompt: 'write tests', cwd: f.rootDir });
    const hook = path.join(root, 'hooks', 'skill-activation-inject.cjs');
    const off = f.run(hook, [], input, { CK_SKILL_AUTO_TRIGGER: 'false' });
    assert.equal(off.stdout, '', 'quiet alone stays silent');
    const kept = f.run(hook, [], input, { CK_SKILL_AUTO_TRIGGER: 'false', CK_QUIET_PROJECT_RULES: 'true' });
    assert.match(kept.stdout, /auto-trigger is DISABLED/, kept.stderr);
});

test('both schemas accept a boolean quietProjectRules and reject other values', () => {
    const { validateCkConfig } = require('../../hooks/lib/ck-config-schema.cjs');
    const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
    assert.equal(validateCkConfig({ frameworkRuntime: { mode: 'quiet', quietProjectRules: true } }).valid, true);
    assert.equal(validateConfig({ project: { name: 'Fixture' }, frameworkRuntime: { quietProjectRules: false } }).valid, true);
    assert.equal(validateCkConfig({ frameworkRuntime: { quietProjectRules: 'yes' } }).valid, false);
    assert.equal(validateConfig({ project: { name: 'Fixture' }, frameworkRuntime: { quietProjectRules: 1 } }).valid, false);
});
