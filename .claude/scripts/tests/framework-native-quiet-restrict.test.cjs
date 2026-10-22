'use strict';

// The opt-in quiet restriction (frameworkRuntime.quietNative: restrict) with its session-start
// apply (frameworkRuntime.autoApplyNative). Every call in this file opts in through an explicit
// environment layer, never process.env, because test files can share one process;
// framework-native-skills.test.cjs covers the defaults (quiet leaves native visibility alone,
// off disables framework skills).
const RESTRICT = Object.freeze({ CK_QUIET_NATIVE: 'restrict' });

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { planNativeSkills, applyNativeSkills, nativeStatus, registryPath, atomic } = require('../lib/framework-native-skills.cjs');
const repo = path.resolve(__dirname, '../../..');
const cli = path.join(repo, '.claude/scripts/framework-mode.cjs');

function fixture(t) {
    fs.mkdirSync(path.join(repo, 'tmp'), { recursive: true });
    const dir = fs.mkdtempSync(path.join(repo, 'tmp/native-quiet-'));
    const homeDir = path.join(dir, 'home');
    const write = (file, value) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    };
    const project = name => {
        const root = path.join(dir, name);
        for (const skill of ['commit', 'why-review', 'workflow-feature']) {
            write(path.join(root, '.claude/skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\nFixture`);
            write(path.join(root, '.agents/skills', skill, 'SKILL.md'), 'Fixture');
        }
        write(path.join(root, '.claude/agents/reviewer.md'), '---\nname: reviewer\n---\nFixture');
        write(path.join(root, '.claude/settings.json'), { skillOverrides: { 'workflow-feature': 'user-invocable-only' } });
        write(path.join(root, '.gitignore'), '.claude/*.local.json\n');
        spawnSync('git', ['init', '-q', root]);
        return root;
    };
    const rootDir = project('project');
    fs.mkdirSync(homeDir, { recursive: true });
    const user = path.join(homeDir, '.claude/.ck.json');
    const local = path.join(rootDir, '.claude/.ck.local.json');
    const claude = path.join(rootDir, '.claude/settings.local.json');
    const codex = path.join(homeDir, '.codex/config.toml');
    const apply = (scope = 'checkout', root = rootDir) => applyNativeSkills(planNativeSkills({ rootDir: root, homeDir, env: { CK_QUIET_NATIVE: 'restrict' }, scope }));
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: homeDir, USERPROFILE: homeDir,
        CLAUDE_PROJECT_DIR: rootDir, CK_AUTO_INSTALL_DEPENDENCIES: '0', CK_QUIET_NATIVE: 'restrict', CK_AUTO_APPLY_NATIVE: 'true' };
    const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: rootDir, env, encoding: 'utf8', timeout: 15000 });
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return { dir, homeDir, rootDir, write, project, user, local, claude, codex, apply, run };
}

function linkSettings(t, target, file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try { fs.symlinkSync(target, file, 'file'); }
    catch (error) {
        if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
        t.skip('File symlinks require Windows Developer Mode or symlink privilege.');
        return false;
    }
    return true;
}

for (const scope of ['checkout', 'user', 'team']) {
    for (const dangling of [false, true]) {
        test(`${scope} mode saves preserve ${dangling ? 'dangling' : 'live'} preference links before any native writes`, t => {
            const f = fixture(t);
            const file = { checkout: f.local, user: f.user, team: path.join(f.rootDir, 'docs/project-config.json') }[scope];
            const target = path.join(f.dir, 'shared-preference.json');
            const original = JSON.stringify(scope === 'team' ? { project: { name: 'Fixture' } } : { locale: { responseLanguage: 'en' } });
            if (!dangling) f.write(target, original);
            if (!linkSettings(t, target, file)) return;
            for (const command of ['on', 'quiet', 'off', 'reset']) {
                const result = f.run([command, `--scope=${scope}`]);
                assert.equal(result.status, 1, `${command}: ${result.stderr}`);
                assert.match(result.stderr, /symlink/);
                assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
                assert.equal(fs.readlinkSync(file), target);
                if (dangling) assert.equal(fs.existsSync(target), false);
                else assert.equal(fs.readFileSync(target, 'utf8'), original);
                assert.equal(fs.existsSync(f.claude), false);
                assert.equal(fs.existsSync(f.codex), false);
                assert.equal(fs.existsSync(registryPath(f.homeDir)), false);
            }
        });
    }
}

for (const native of ['claude', 'codex', 'registry']) {
    test(`quiet refuses a dangling ${native} settings link before saving preferences`, t => {
        const f = fixture(t);
        const file = native === 'registry' ? registryPath(f.homeDir) : f[native];
        const target = path.join(f.dir, 'missing-settings');
        if (!linkSettings(t, target, file)) return;
        const result = f.run(['quiet']);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /symlink/);
        assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
        assert.equal(fs.existsSync(target), false);
        assert.equal(fs.existsSync(f.local), false);
    });
}

test('show and apply can read linked preferences without detaching their owner', t => {
    const f = fixture(t);
    const target = path.join(f.dir, 'shared-preference.json');
    const original = JSON.stringify({ frameworkRuntime: { mode: 'quiet' } });
    f.write(target, original);
    if (!linkSettings(t, target, f.local)) return;
    for (const command of ['show', 'apply']) {
        const result = f.run([command, '--json']);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).mode, 'quiet');
        assert.equal(fs.lstatSync(f.local).isSymbolicLink(), true);
        assert.equal(fs.readFileSync(target, 'utf8'), original);
    }
});

test('native atomic writes and removals preserve dangling settings links', t => {
    const f = fixture(t);
    const target = path.join(f.dir, 'missing-settings');
    if (!linkSettings(t, target, f.claude)) return;
    for (const value of ['{}', null]) {
        assert.throws(() => atomic(f.claude, value), /symlink/);
        assert.equal(fs.lstatSync(f.claude).isSymbolicLink(), true);
        assert.equal(fs.existsSync(target), false);
    }
});

const quietOverride = 'user-invocable-only';

test('quiet hides framework skills except kept ones, denies framework agents, and on restores prior native policy without touching team projections', t => {
    const f = fixture(t);
    const team = fs.readFileSync(path.join(f.rootDir, '.claude/settings.json'), 'utf8');
    const original = { permissions: { allow: ['Read'] }, skillOverrides: { commit: 'name-only', unrelated: 'on' } };
    f.write(f.claude, original);
    const codexText = '# personal settings\nmodel = "fixture"';
    f.write(f.codex, codexText);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    f.apply();
    const quiet = JSON.parse(fs.readFileSync(f.claude));
    assert.deepEqual(quiet.skillOverrides, {
        commit: 'name-only', unrelated: 'on', 'why-review': quietOverride, 'workflow-feature': quietOverride
    }, 'the commit gate keeps commit; everything else leaves automatic use');
    assert.deepEqual(quiet.permissions, { allow: ['Read'], deny: ['Agent(reviewer)'] });
    const restricted = fs.readFileSync(f.codex, 'utf8');
    assert.equal((restricted.match(/enabled = false/g) || []).length, 2);
    assert.doesNotMatch(restricted, /\/commit\/SKILL\.md/);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, true);
    f.apply();
    assert.equal(fs.readFileSync(f.codex, 'utf8'), restricted, 'quiet is idempotent');
    f.write(f.local, { frameworkRuntime: { mode: 'quiet', quietSkills: ['why-review'] } });
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).needsApply, true);
    f.apply();
    assert.equal(JSON.parse(fs.readFileSync(f.claude)).skillOverrides['why-review'], undefined, 'a listed skill gets its prior policy back');
    assert.equal((fs.readFileSync(f.codex, 'utf8').match(/enabled = false/g) || []).length, 1);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, true);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, false, 'on never reports the quiet profile');
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).needsApply, true);
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), original);
    assert.equal(fs.readFileSync(f.codex, 'utf8'), codexText);
    assert.equal(fs.readFileSync(path.join(f.rootDir, '.claude/settings.json'), 'utf8'), team);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, false);
});

test('quiet keeps the reviews a risk-based commit gate asks for and never removes a user-owned agent rule', t => {
    const f = fixture(t);
    f.write(f.claude, { permissions: { deny: ['Agent(reviewer)'] } });
    f.write(f.local, { commit: { reviewMode: 'risk-based' }, frameworkRuntime: { mode: 'quiet' } });
    f.apply();
    const quiet = JSON.parse(fs.readFileSync(f.claude));
    assert.deepEqual(quiet.skillOverrides, { 'workflow-feature': quietOverride });
    assert.deepEqual(quiet.permissions.deny, ['Agent(reviewer)']);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), { permissions: { deny: ['Agent(reviewer)'] } });
});

test('global toggles cover registered checkouts and honor a checkout opt-out', t => {
    const f = fixture(t);
    const second = f.project('second');
    f.apply(); f.apply('checkout', second);
    f.write(f.user, { frameworkRuntime: { mode: 'quiet' } });
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    const results = f.apply('user');
    assert.equal(results.find(row => row.root === f.rootDir).mode, 'on');
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, false);
    assert.equal(nativeStatus(second, f.homeDir, RESTRICT).restricted, true);
    f.write(f.user, { frameworkRuntime: { mode: 'on' } });
    f.apply('user');
    assert.equal(nativeStatus(second, f.homeDir, RESTRICT).restricted, false);
    assert.equal(fs.existsSync(path.join(second, '.claude/settings.local.json')), false);
    assert.equal(fs.existsSync(f.codex), false);
});

test('multiple checkout blocks coexist and restoring one preserves the other and unrelated edits', t => {
    const f = fixture(t);
    const second = f.project('second');
    f.write(f.user, { frameworkRuntime: { mode: 'quiet' } });
    f.apply(); f.apply('checkout', second);
    fs.appendFileSync(f.codex, '\n[tui]\nnotifications = false\n');
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    f.apply();
    assert.ok(!fs.readFileSync(f.codex, 'utf8').includes(`${f.rootDir}/.agents`));
    assert.ok(fs.readFileSync(f.codex, 'utf8').includes(`${second}/.agents`));
    assert.match(fs.readFileSync(f.codex, 'utf8'), /notifications = false/);
    assert.equal(nativeStatus(second, f.homeDir, RESTRICT).restricted, true);
});

test('existing user Codex skill policy fails before the requested preference or native settings are written', t => {
    const f = fixture(t);
    f.write(f.codex, '[[skills.config]]\npath = "/unrelated/SKILL.md"\nenabled = false\n');
    const before = fs.readFileSync(f.codex, 'utf8');
    const result = f.run(['quiet', '--json']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /user-owned/);
    assert.equal(fs.existsSync(f.local), false);
    assert.equal(fs.existsSync(f.claude), false);
    assert.equal(fs.readFileSync(f.codex, 'utf8'), before);
});

test('restore refuses changed owned overrides while preserving unrelated settings', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } }); f.apply();
    const config = JSON.parse(fs.readFileSync(f.claude));
    config.skillOverrides['why-review'] = 'on';
    config.language = 'en'; f.write(f.claude, config);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    assert.throws(() => f.apply(), /changed while quiet/);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), config);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, false);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).recoveryPending, true);
});

test('interrupted restriction and restore recover from the ledger without losing the original policy', t => {
    const f = fixture(t);
    f.write(f.claude, { skillOverrides: { 'why-review': 'name-only' } });
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    const plan = planNativeSkills({ rootDir: f.rootDir, homeDir: f.homeDir, env: RESTRICT });
    atomic(plan.registryPath, JSON.stringify(plan.interim));
    atomic(plan.changes[0].file, plan.changes[0].after);
    f.apply();
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    const restore = planNativeSkills({ rootDir: f.rootDir, homeDir: f.homeDir, env: RESTRICT });
    atomic(restore.changes[0].file, restore.changes[0].after);
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), { skillOverrides: { 'why-review': 'name-only' } });
    assert.equal(fs.existsSync(f.codex), false);
});

test('a user override or deny-rule removal while quiet stops the reconcile instead of being absorbed', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } }); f.apply();
    let config = JSON.parse(fs.readFileSync(f.claude));
    config.skillOverrides['why-review'] = 'off';
    f.write(f.claude, config);
    assert.throws(() => f.apply(), /changed while quiet/);
    config.skillOverrides['why-review'] = quietOverride;
    config.permissions.deny = [];
    f.write(f.claude, config);
    assert.throws(() => f.apply(), /was removed while quiet/);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), config);
});

test('an interrupted release keeps the released override in the interim ledger', t => {
    const f = fixture(t);
    f.write(f.claude, { skillOverrides: { 'why-review': 'name-only' } });
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } }); f.apply();
    f.write(f.local, { frameworkRuntime: { mode: 'quiet', quietSkills: ['why-review'] } });
    const plan = planNativeSkills({ rootDir: f.rootDir, homeDir: f.homeDir, env: RESTRICT });
    assert.equal(plan.interim.projects[f.rootDir].disabled.claudeBefore['why-review'], 'name-only');
    assert.equal(plan.registry.projects[f.rootDir].disabled.claudeBefore['why-review'], undefined);
    atomic(plan.registryPath, JSON.stringify(plan.interim));
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)), { skillOverrides: { 'why-review': 'name-only' } });
});

test('an interrupted first quiet apply that stopped before the settings write recovers on the next apply', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    const plan = planNativeSkills({ rootDir: f.rootDir, homeDir: f.homeDir, env: RESTRICT });
    atomic(plan.registryPath, JSON.stringify(plan.interim));
    assert.equal(fs.existsSync(f.claude), false, 'the settings write never happened');
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)).permissions.deny, ['Agent(reviewer)']);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, true);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    f.apply();
    assert.equal(fs.existsSync(f.claude), false);
});

test('quiet keeps the agents risk-based reviews dispatch and denies them under lightweight review', t => {
    const f = fixture(t);
    for (const name of ['code-reviewer', 'security-auditor']) f.write(path.join(f.rootDir, '.claude/agents', `${name}.md`), `---\nname: ${name}\n---\nFixture`);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)).permissions.deny.sort(), ['Agent(code-reviewer)', 'Agent(reviewer)', 'Agent(security-auditor)']);
    f.write(f.local, { commit: { reviewMode: 'risk-based' }, frameworkRuntime: { mode: 'quiet' } });
    f.apply();
    assert.deepEqual(JSON.parse(fs.readFileSync(f.claude)).permissions.deny, ['Agent(reviewer)'], 'the review agents are released, the rest stay denied');
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, true);
});

test('the session-start sync applies the mode in a main checkout, reports once, and leaves a linked worktree alone', t => {
    const f = fixture(t);
    const hook = path.join(repo, '.claude/hooks/framework-native-sync.cjs');
    const run = (root, env = {}) => {
        const result = spawnSync(process.execPath, [hook], { cwd: root, encoding: 'utf8', timeout: 30000,
            input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd: root }),
            env: { PATH: process.env.PATH, HOME: f.homeDir, USERPROFILE: f.homeDir, CLAUDE_PROJECT_DIR: root, CK_QUIET_NATIVE: 'restrict', CK_AUTO_APPLY_NATIVE: 'true', ...env } });
        assert.equal(result.status, 0, result.stderr);
        return result.stdout ? JSON.parse(result.stdout) : null;
    };
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    // A linked worktree (a `.git` file) is never written, even when it is out of step.
    const worktree = f.project('worktree');
    fs.rmSync(path.join(worktree, '.git'), { recursive: true, force: true });
    f.write(path.join(worktree, '.git'), 'gitdir: /elsewhere/.git/worktrees/worktree\n');
    f.write(path.join(worktree, '.claude/.ck.local.json'), { frameworkRuntime: { mode: 'quiet' } });
    assert.equal(run(worktree), null);
    assert.equal(fs.existsSync(path.join(worktree, '.claude/settings.local.json')), false);
    // The main checkout is applied once and reported; the next session finds nothing to do.
    assert.match(run(f.rootDir).systemMessage, /quiet: skill and agent visibility updated/);
    assert.equal(JSON.parse(fs.readFileSync(f.claude)).skillOverrides['why-review'], quietOverride);
    assert.equal(run(f.rootDir), null);
    // Switching to on by editing the preference is reconciled at the next start too.
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    assert.match(run(f.rootDir).systemMessage, /on: skill and agent visibility updated/);
    assert.equal(fs.existsSync(f.claude), false);
});

test('with the team offMode as-quiet, CLI off applies the quiet restriction and reset restores, preserving personal preferences', t => {
    const f = fixture(t);
    f.write(path.join(f.rootDir, 'docs/project-config.json'), { project: { name: 'Fixture' }, frameworkRuntime: { offMode: 'as-quiet' } });
    f.write(f.user, { locale: { responseLanguage: 'en' } });
    let result = f.run(['off', '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).mode, 'quiet');
    assert.equal(JSON.parse(result.stdout).offReadAsQuiet, true, 'the team policy, not the saved value, made off quiet');
    assert.equal(JSON.parse(result.stdout).nativeSkills.restricted, true);
    result = f.run(['reset', '--json']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).nativeSkills.restricted, false);
    assert.equal(fs.existsSync(f.claude), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.user)), { locale: { responseLanguage: 'en' } });
});

test('missing mirrors and malformed registries fail closed with no native writes', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    fs.rmSync(path.join(f.rootDir, '.agents/skills/why-review/SKILL.md'));
    assert.throws(() => f.apply(), /mirrors are missing/);
    assert.equal(fs.existsSync(f.claude), false);
    f.write(registryPath(f.homeDir), '{broken');
    assert.throws(() => f.apply(), SyntaxError);
    assert.equal(fs.existsSync(f.codex), false);
});

test('project Codex skill policy and tracked Claude settings cannot silently mask a personal quiet switch', t => {
    const f = fixture(t);
    f.write(path.join(f.rootDir, '.codex/config.toml'), '[skills]\nconfig = []\n');
    let result = f.run(['quiet']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /inline skills configuration/);
    assert.equal(fs.existsSync(f.local), false);
    fs.rmSync(path.join(f.rootDir, '.codex/config.toml'));
    f.write(path.join(f.rootDir, '.gitignore'), '.claude/.ck.local.json\n');
    result = f.run(['quiet']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must be git-ignored/);
    assert.equal(fs.existsSync(f.local), false);
});

test('a concurrent native operation cannot overwrite settings or a recovery ledger', t => {
    const f = fixture(t);
    f.write(`${registryPath(f.homeDir)}.lock`, 'running');
    const result = f.run(['quiet']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /operation may be active/);
    assert.equal(fs.existsSync(f.local), false);
    assert.equal(fs.existsSync(f.codex), false);
});

test('quiet includes nested template skills discovered by the native host', t => {
    const f = fixture(t);
    const relative = '_templates/template-skill/SKILL.md';
    f.write(path.join(f.rootDir, '.claude/skills', relative), '---\nname: template-skill\ndescription: Native nested fixture\n---\nFixture');
    f.write(path.join(f.rootDir, '.agents/skills', relative), 'Fixture');
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    f.apply();
    assert.equal(JSON.parse(fs.readFileSync(f.claude)).skillOverrides['template-skill'], quietOverride);
    assert.ok(fs.readFileSync(f.codex, 'utf8').includes('_templates/template-skill/SKILL.md'));
    assert.equal((fs.readFileSync(f.codex, 'utf8').match(/enabled = false/g) || []).length, 3);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } });
    f.apply();
    assert.equal(fs.existsSync(f.claude), false);
});

test('an interrupted switch from off to the quiet restriction recovers from the interim ledger', t => {
    const f = fixture(t);
    f.write(f.local, { frameworkRuntime: { mode: 'off' } }); f.apply();
    assert.equal(JSON.parse(fs.readFileSync(f.claude)).skillOverrides['why-review'], 'off');
    f.write(f.local, { frameworkRuntime: { mode: 'quiet' } });
    const plan = planNativeSkills({ rootDir: f.rootDir, homeDir: f.homeDir, env: RESTRICT });
    assert.deepEqual([plan.interim.projects[f.rootDir].disabled.value, plan.interim.projects[f.rootDir].disabled.valuePrevious], [quietOverride, 'off']);
    // The run stops after the interim ledger, before any settings write: the settings still hold off.
    atomic(plan.registryPath, JSON.stringify(plan.interim));
    f.apply();
    assert.equal(JSON.parse(fs.readFileSync(f.claude)).skillOverrides['why-review'], quietOverride);
    assert.equal(nativeStatus(f.rootDir, f.homeDir, RESTRICT).restricted, true);
    f.write(f.local, { frameworkRuntime: { mode: 'on' } }); f.apply();
    assert.equal(fs.existsSync(f.claude), false, 'on restores the original absence of local settings');
});
