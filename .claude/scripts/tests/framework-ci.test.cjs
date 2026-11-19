'use strict';

// framework-ci: which lanes and hook suites a change selects, how changed files are collected, and the
// manual-only CI workflow contract (upstream framework repository only).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const ci = require('../framework-ci.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(REPO_ROOT, '.claude', 'scripts', 'framework-ci.cjs');

function suite(name, text = '', extra = {}) {
    return { name, file: `.claude/hooks/tests/suites/${name}.test.cjs`, text, scansDirectories: false, readsRegistrations: false, ...extra };
}

function index(suites, edges = {}) {
    const requiredBy = new Map(Object.entries(edges).map(([target, parents]) => [target, new Set(parents)]));
    return { suites, requiredBy };
}

const FIXTURE = index(
    [
        suite('alpha', "runHook('alpha-hook.cjs')"),
        suite('beta', "const target = path.join(SKILLS, 'beta-skill', 'SKILL.md');"),
        suite('registrations', "readJson('.claude/settings.json')", { readsRegistrations: true }),
        suite('skill-scan', "for (const d of fs.readdirSync(path.join(ROOT, '.claude', 'skills'))) {}", { scansDirectories: true }),
        suite('gamma'),
        suite('delta'),
        suite('epsilon'),
        suite('zeta'),
        suite('eta'),
        suite('theta')
    ],
    { '.claude/hooks/lib/shared-lib.cjs': ['.claude/hooks/alpha-hook.cjs'] }
);

function plan(files, scope = 'changed', idx = FIXTURE) {
    const changes = files.map(entry => (typeof entry === 'string' ? { status: 'M', file: entry } : entry));
    return ci.planScope({ scope, changes, index: idx });
}

test('full scope runs every lane and every suite', () => {
    const result = plan([], 'full');
    assert.equal(result.effectiveScope, 'full');
    assert.deepEqual(result.lanes, { static: true, sync: true, 'hook-unit': true, 'hook-suites': 'all' });
    assert.deepEqual(
        Object.keys(result.lanes),
        ci.LANES.map(lane => lane.id),
        'a lane added to LANES is part of the full scope'
    );
    assert.deepEqual(
        Object.keys(ci.fullLanes()),
        ci.LANES.map(lane => lane.id)
    );
});

test('harness files escalate to full', () => {
    for (const file of [
        '.github/workflows/ci.yml',
        'package.json',
        'package-lock.json',
        '.claude/settings.json',
        'docs/project-config.json',
        '.claude/hooks/tests/run-all-tests.cjs',
        '.claude/hooks/tests/lib/test-utils.cjs',
        '.claude/scripts/framework-ci.cjs'
    ]) {
        const result = plan([file]);
        assert.equal(result.effectiveScope, 'full', file);
        assert.equal(result.lanes['hook-suites'], 'all', file);
        assert.equal(result.escalations[0].file, file);
    }
});

test('files no test reads select nothing', () => {
    const result = plan(['LICENSE', '.vscode/settings.json', 'claude-start.cmd']);
    assert.equal(result.effectiveScope, 'changed');
    assert.deepEqual(result.lanes, { static: false, sync: false, 'hook-unit': false, 'hook-suites': [] });
});

test('a changed suite selects only itself', () => {
    const result = plan(['.claude/hooks/tests/suites/gamma.test.cjs']);
    // A suite is JavaScript, so lint and formatting run too; no other test lane does.
    assert.deepEqual(result.lanes, { static: true, sync: false, 'hook-unit': false, 'hook-suites': ['gamma'] });
});

test('an added or removed suite escalates to full for the count guard', () => {
    assert.equal(plan([{ status: 'A', file: '.claude/hooks/tests/suites/new-one.test.cjs' }]).effectiveScope, 'full');
    assert.equal(plan([{ status: 'D', file: '.claude/hooks/tests/suites/gamma.test.cjs' }]).effectiveScope, 'full');
});

test('a hook change selects the suites naming it, hook unit tests, sync and the registration suites', () => {
    const result = plan(['.claude/hooks/alpha-hook.cjs']);
    assert.equal(result.effectiveScope, 'changed');
    assert.equal(result.lanes.sync, true);
    assert.equal(result.lanes['hook-unit'], true);
    assert.deepEqual(result.lanes['hook-suites'], ['alpha', 'registrations']);
});

test('a library change selects suites of the hooks that require it', () => {
    const result = plan(['.claude/hooks/lib/shared-lib.cjs']);
    assert.equal(result.effectiveScope, 'changed');
    assert.ok(result.lanes['hook-suites'].includes('alpha'), JSON.stringify(result.lanes));
    assert.ok(!result.lanes['hook-suites'].includes('registrations'), 'a library is not a registered hook');
});

test('an unreferenced hook escalates to full', () => {
    const result = plan(['.claude/hooks/nobody-names-me.cjs']);
    assert.equal(result.effectiveScope, 'full');
    assert.match(result.escalations[0].reason, /no hook suite names/);
});

test('a skill file selects suites naming the skill and directory scanners of that area', () => {
    const result = plan(['.claude/skills/beta-skill/SKILL.md']);
    assert.equal(result.effectiveScope, 'changed');
    assert.equal(result.lanes.sync, true);
    assert.equal(result.lanes['hook-unit'], false);
    assert.deepEqual(result.lanes['hook-suites'], ['beta', 'skill-scan']);
});

test('a framework file no suite names still runs the sync lane', () => {
    const result = plan(['docs/specs/Some/README.Thing.md']);
    assert.equal(result.effectiveScope, 'changed');
    assert.deepEqual(result.lanes, { static: false, sync: true, 'hook-unit': false, 'hook-suites': [] });
});

test('selecting more than half of the suites escalates to full', () => {
    const many = ['gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'].map(name => `.claude/hooks/tests/suites/${name}.test.cjs`);
    const result = plan(many);
    assert.equal(result.effectiveScope, 'full');
    assert.match(result.escalations[0].reason, /6 of 10 suites/);
});

test('one filter run per suite not already covered by a longer name match', () => {
    assert.deepEqual(ci.suiteRuns(['session-init', 'session-init-docs', 'other'], ['session-init', 'session-init-docs', 'other']), ['session-init', 'other']);
    assert.deepEqual(ci.suiteRuns(['session-init-docs', 'session-init'], ['session-init', 'session-init-docs']), ['session-init-docs', 'session-init']);
});

test('GitHub outputs name every lane decision', () => {
    assert.deepEqual(ci.githubOutputLines(plan(['.claude/hooks/tests/suites/gamma.test.cjs'])), [
        'scope=changed',
        'run_static=true',
        'run_sync=false',
        'run_hook_unit=false',
        'run_hook_suites=true',
        'hook_suites=gamma'
    ]);
    assert.deepEqual(ci.githubOutputLines(plan([], 'full')), [
        'scope=full',
        'run_static=true',
        'run_sync=true',
        'run_hook_unit=true',
        'run_hook_suites=true',
        'hook_suites=all'
    ]);
});

test('arguments are validated', () => {
    assert.throws(() => ci.parseArgs(['--scope=everything']), ci.UsageError);
    assert.throws(() => ci.parseArgs(['--suites=a']), ci.UsageError);
    assert.throws(() => ci.parseArgs(['--lane=hook-suites', '--base=main']), ci.UsageError);
    assert.throws(() => ci.parseArgs(['--unknown']), ci.UsageError);
    assert.deepEqual(ci.parseArgs(['--scope=full', '--plan']), { scope: 'full', plan: true, json: false });
});

// ---- changed-file collection, on a throwaway git repository ----

function makeRepo() {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'framework-ci-')));
    const run = (...args) => {
        const result = childProcess.spawnSync(
            'git',
            ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...args],
            {
                encoding: 'utf8'
            }
        );
        assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
        return result.stdout.trim();
    };
    const write = (file, text) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), text);
    };
    run('init', '-q', '-b', 'main');
    write('keep.md', 'keep\n');
    write('old-name.md', 'old\n');
    write('.claude/hooks/lib/shared-lib.cjs', 'module.exports = 1;\n');
    write('.claude/hooks/alpha-hook.cjs', "require('./lib/shared-lib.cjs');\n");
    write('.claude/hooks/tests/suites/alpha.test.cjs', "runHook('alpha-hook.cjs');\n");
    for (const name of ['bravo', 'charlie', 'delta']) write(`.claude/hooks/tests/suites/${name}.test.cjs`, '// unrelated\n');
    run('add', '-A');
    run('commit', '-q', '-m', 'base');
    return { root, run, write, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('a commit range counts a rename as a deletion plus an addition', () => {
    const repo = makeRepo();
    try {
        repo.run('switch', '-q', '-c', 'feature');
        repo.run('mv', 'old-name.md', 'new-name.md');
        repo.write('keep.md', 'changed\n');
        repo.run('commit', '-q', '-am', 'change');
        const range = ci.collectChanges({ root: repo.root, base: 'main', head: 'feature' });
        assert.deepEqual(range.changes, [
            { status: 'M', file: 'keep.md' },
            { status: 'A', file: 'new-name.md' },
            { status: 'D', file: 'old-name.md' }
        ]);
    } finally {
        repo.cleanup();
    }
});

test('TC-GWF-101 the static lane runs native tools on the selected paths and widens when their inputs change', t => {
    const repo = makeRepo();
    try {
        for (const name of ['framework-ci.cjs', 'static-checks.cjs']) {
            const relative = `.claude/scripts/${name}`;
            repo.write(relative, fs.readFileSync(path.join(REPO_ROOT, relative)));
        }
        repo.write('.gitignore', 'node_modules/\n');
        repo.write('eslint.config.cjs', 'module.exports = [];\n');
        repo.write(
            'node_modules/eslint/index.js',
            `
            exports.loadESLint = async () => class {
                async isPathIgnored(file) { return file.endsWith('ignored.cjs') || file.endsWith('formatter-only.cjs'); }
            };
        `
        );
        repo.write(
            'node_modules/prettier/index.js',
            `
            exports.getFileInfo = async file => ({ ignored: file.endsWith('ignored.cjs') });
        `
        );
        const switchAwayAndBack = `
            execFileSync('git', ['switch', '-q', '--detach', 'HEAD^']);
            console.log('alternate checkout');
            execFileSync('git', ['switch', '-q', 'main']);
        `;
        repo.write(
            '.claude/scripts/lib/test-run-lock.cjs',
            `
            const { execFileSync } = require('node:child_process');
            const { writeFileSync } = require('node:fs');
            exports.forwardTerminationSignals = () => {};
            exports.admitTestRun = async () => {
                if (process.env.CK_STATIC_FIXTURE_DIRTIES === 'admission') writeFileSync('keep.md', 'edited while waiting');
                if (process.env.CK_STATIC_FIXTURE_DIRTIES === 'admission-main') execFileSync('git', ['switch', '-q', 'main']);
                if (process.env.CK_STATIC_FIXTURE_DIRTIES === 'admission-restore') { ${switchAwayAndBack} }
                return { admitted: true, release() {} };
            };
        `
        );
        // Observe the two tool invocations at their normal bin paths without requiring them in an adopter project.
        repo.write(
            'node_modules/eslint/bin/eslint.js',
            `
            const args = process.argv.slice(2);
            console.log('lint ' + JSON.stringify(args));
            if (process.env.CK_STATIC_FIXTURE_DIRTIES === 'lint') require('node:fs').writeFileSync('keep.md', 'edited during lint');
            if (process.env.CK_STATIC_FIXTURE_DIRTIES === 'switch') {
                const { execFileSync } = require('node:child_process');
                ${switchAwayAndBack}
            }
            if (args.includes('./forbidden.cjs') || (args.includes('.') && require('node:fs').existsSync('forbidden.cjs'))) process.exitCode = 1;
        `
        );
        repo.write('node_modules/prettier/bin/prettier.cjs', "console.log('format ' + JSON.stringify(process.argv.slice(2)));");
        repo.write('prior file.cjs', '// existing\n');
        repo.run('add', '-A');
        repo.run('commit', '-q', '-m', 'tools');
        const base = repo.run('rev-parse', 'HEAD');
        const execute = (args, dirties = '') =>
            childProcess.spawnSync(process.execPath, [path.join(repo.root, '.claude/scripts/framework-ci.cjs'), '--lane=static', ...args], {
                cwd: repo.root,
                encoding: 'utf8',
                env: { ...process.env, CK_STATIC_FIXTURE_DIRTIES: dirties }
            });
        const focused = ['--scope=changed', `--base=${base}`];

        repo.write('keep.md', 'only documentation\n');
        const skipped = execute(focused);
        assert.equal(skipped.status, 0);
        assert.match(skipped.stdout, /SKIP static/);
        assert.doesNotMatch(skipped.stdout, /^(lint|format) /m);

        repo.write('ignored.cjs', '// both tools ignore this\n');
        const allIgnored = execute(focused);
        assert.equal(allIgnored.status, 0, allIgnored.stderr);
        assert.match(allIgnored.stdout, /SKIP {2}static {2}\(no applicable JS files\)/);
        assert.doesNotMatch(allIgnored.stdout, /^(lint|format) /m);
        fs.unlinkSync(path.join(repo.root, 'ignored.cjs'));

        repo.write('formatter-only.cjs', '// only the formatter checks this\n');
        const oneApplies = execute(focused);
        assert.equal(oneApplies.status, 0, oneApplies.stderr);
        assert.match(oneApplies.stdout, /^format .*formatter-only\.cjs/m);
        assert.doesNotMatch(oneApplies.stdout, /SKIP {2}static/);
        fs.unlinkSync(path.join(repo.root, 'formatter-only.cjs'));

        repo.run('mv', 'prior file.cjs', 'allowed file.cjs');
        repo.run('commit', '-q', '-am', 'move source');
        const head = repo.run('rev-parse', 'HEAD');
        const pinned = [...focused, `--head=${head}`];
        const allowed = execute(pinned);
        assert.equal(allowed.status, 0, `a stable pinned checkout must pass: ${allowed.stderr}`);
        assert.match(allowed.stdout, /PASS {2}static/);
        assert.match(allowed.stdout, /^lint \["--max-warnings=0","--no-warn-ignored","--","\.\/allowed file\.cjs"\]$/m);
        assert.match(allowed.stdout, /^format \["--check","--ignore-path=\.gitignore","--ignore-path=\.prettierignore","--","\.\/allowed file\.cjs"\]$/m);
        assert.doesNotMatch(allowed.stdout, /prior file\.cjs/);

        repo.run('switch', '-q', '--detach', base);
        const wrongAtStart = execute(pinned, 'admission-main');
        assert.equal(wrongAtStart.status, 2, 'the requested head must be checked out before waiting');
        assert.match(wrongAtStart.stderr, /require that commit checked out with a clean working tree/);
        assert.doesNotMatch(wrongAtStart.stdout, /^lint /m);
        assert.equal(repo.run('rev-parse', 'HEAD'), base, 'the admission callback was never invoked');
        repo.run('switch', '-q', 'main');

        const restoredAfterAdmission = execute(pinned, 'admission-restore');
        assert.equal(restoredAfterAdmission.status, 2, 'restoring the requested head while waiting cannot earn pinned proof');
        assert.match(restoredAfterAdmission.stdout, /alternate checkout/);
        assert.match(restoredAfterAdmission.stderr, /detected a checkout change during admission/);
        assert.doesNotMatch(restoredAfterAdmission.stdout, /^lint /m);

        const queued = execute(pinned, 'admission');
        assert.equal(queued.status, 2, 'a changed checkout after admission is refused');
        assert.doesNotMatch(queued.stdout, /^lint /m);
        repo.write('keep.md', 'only documentation\n');
        const changedDuringLint = execute(pinned, 'lint');
        assert.equal(changedDuringLint.status, 2, 'a changed checkout during lint cannot earn proof');
        assert.match(changedDuringLint.stdout, /^lint /m);
        assert.doesNotMatch(changedDuringLint.stdout, /PASS {2}static/);
        repo.write('keep.md', 'only documentation\n');
        const switched = execute(pinned, 'switch');
        assert.equal(switched.status, 2, 'changing the checkout and then restoring its head cannot earn pinned proof');
        assert.match(switched.stdout, /alternate checkout/);
        assert.match(switched.stderr, /detected a checkout change during execution/);
        assert.equal(repo.run('rev-parse', 'HEAD'), head);

        for (const flag of ['assume-unchanged', 'skip-worktree']) {
            const file = 'allowed file.cjs';
            repo.run('update-index', `--${flag}`, file);
            if (flag === 'assume-unchanged') repo.write(file, '// changed with a clean status\n');
            else fs.unlinkSync(path.join(repo.root, file));
            assert.equal(repo.run('status', '--porcelain'), '', `${flag} fixture must hide the change from porcelain`);
            const hidden = execute(pinned);
            assert.equal(hidden.status, 2);
            assert.match(hidden.stderr, /complete checkout without hidden index entries/);
            assert.doesNotMatch(hidden.stdout, /^(lint|format) /m);
            repo.run('update-index', `--no-${flag}`, file);
            repo.write(file, '// existing\n');
        }

        const link = path.join(repo.root, 'linked.cjs');
        try {
            fs.symlinkSync('allowed file.cjs', link, 'file');
        } catch (error) {
            if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
            t.diagnostic('fixture cannot create a symlink without Windows symlink privileges');
        }
        if (fs.existsSync(link)) {
            const linked = execute(focused);
            assert.equal(linked.status, 0, linked.stderr);
            assert.match(linked.stdout, /Static scope widened to full/);
            assert.doesNotMatch(linked.stdout, /linked\.cjs/);
            fs.unlinkSync(link);
        }

        repo.write('forbidden.cjs', '// new violation\n');
        const blocked = execute(focused);
        assert.equal(blocked.status, 1, blocked.stderr);
        assert.match(blocked.stdout, /FAIL {2}static/);
        assert.match(blocked.stdout, /^format /m, 'format still runs when lint rejects a change');

        repo.write('.prettierignore', '# input change\n');
        const widened = execute(focused);
        assert.equal(widened.status, 1, widened.stderr);
        assert.match(widened.stdout, /Static scope widened to full/);
        assert.match(widened.stdout, /^lint \["--max-warnings=0","\."\]$/m);

        const full = execute(['--scope=full']);
        assert.equal(full.status, 1, full.stderr);
        assert.match(full.stdout, /scope: full/);
        assert.match(full.stdout, /^format \["--check","\*\*\/\*\.\{cjs,mjs,js\}"\]$/m);
    } finally {
        repo.cleanup();
    }
});

test('TC-GWF-101 a changed suppressions file or large path list cannot narrow the static check', () => {
    for (const script of ['framework-ci.cjs', 'static-checks.cjs']) {
        assert.equal(ci.staticFiles([{ status: 'M', file: `.claude/scripts/${script}` }]), null);
    }
    assert.equal(ci.staticFiles([{ status: 'D', file: 'eslint-suppressions.json' }]), null);
    assert.equal(ci.staticFiles([{ status: 'T', file: 'src/check.cjs' }]), null);
    assert.equal(ci.staticFiles(Array.from({ length: 80 }, (_, i) => ({ status: 'M', file: `src/${'x'.repeat(100)}${i}.cjs` }))), null);
    assert.deepEqual(
        ci.staticFiles([
            { status: 'D', file: 'old.cjs' },
            { status: 'A', file: 'new.cjs' }
        ]),
        ['./new.cjs']
    );
    assert.equal(plan(['.prettierignore']).lanes.static, true);
});

test('without a head, staged, unstaged and untracked work counts', () => {
    const repo = makeRepo();
    try {
        repo.write('keep.md', 'unstaged\n');
        repo.write('staged.md', 'staged\n');
        repo.run('add', 'staged.md');
        repo.write('untracked.md', 'untracked\n');
        const files = ci.collectChanges({ root: repo.root, base: 'main' }).changes.map(change => change.file);
        assert.deepEqual(files, ['keep.md', 'staged.md', 'untracked.md']);
    } finally {
        repo.cleanup();
    }
});

test('an option-like or unknown revision is refused before git sees it as an option', () => {
    const repo = makeRepo();
    try {
        assert.throws(() => ci.collectChanges({ root: repo.root, base: '--output=x' }), /must be a branch, tag, SHA or ref/);
        assert.throws(() => ci.collectChanges({ root: repo.root, base: 'no-such-branch' }), /is not a commit/);
        assert.equal(fs.existsSync(path.join(repo.root, 'x')), false);
    } finally {
        repo.cleanup();
    }
});

test('a branch name resolves through its origin remote-tracking ref when no local branch exists', () => {
    const repo = makeRepo();
    try {
        const sha = repo.run('rev-parse', 'HEAD');
        repo.run('update-ref', 'refs/remotes/origin/develop', sha);
        assert.equal(ci.resolveCommit(repo.root, 'develop', 'base'), sha);
    } finally {
        repo.cleanup();
    }
});

test('a full-scope plan needs no diff, so an unusable base cannot fail it', () => {
    const repo = makeRepo();
    try {
        const output = path.join(repo.root, 'gh-output.txt');
        assert.equal(ci.main(['--plan', '--scope=full', '--base=no-such-branch', `--github-output=${output}`], repo.root), 0);
        assert.match(
            fs.readFileSync(output, 'utf8'),
            /^scope=full\nrun_static=true\nrun_sync=true\nrun_hook_unit=true\nrun_hook_suites=true\nhook_suites=all\n$/
        );
    } finally {
        repo.cleanup();
    }
});

test('a local run says when the branch lacks the base, so its evidence would not cover what merges', () => {
    const repo = makeRepo();
    const lines = [];
    const original = console.log;
    try {
        repo.run('switch', '-q', '-c', 'feature');
        repo.run('switch', '-q', 'main');
        repo.write('keep.md', 'main moved\n');
        repo.run('commit', '-q', '-am', 'main moves');
        repo.run('switch', '-q', 'feature');
        console.log = (...args) => lines.push(args.join(' '));
        assert.equal(ci.main(['--plan', '--base=main'], repo.root), 0);
        assert.match(lines.join('\n'), /Behind main: merge it first/);
        lines.length = 0;
        repo.run('merge', '-q', '--no-edit', 'main');
        assert.equal(ci.main(['--plan', '--base=main'], repo.root), 0);
        assert.doesNotMatch(lines.join('\n'), /Behind/);
        assert.match(lines.join('\n'), /^Tree: [0-9a-f]{40} \(clean\)$/m);
    } finally {
        console.log = original;
        repo.cleanup();
    }
});

test('the index links a library to the suites of the hooks that require it', () => {
    const repo = makeRepo();
    try {
        const idx = ci.buildIndex(repo.root);
        assert.deepEqual(
            idx.suites.map(entry => entry.name),
            ['alpha', 'bravo', 'charlie', 'delta']
        );
        assert.deepEqual([...idx.requiredBy.get('.claude/hooks/lib/shared-lib.cjs')], ['.claude/hooks/alpha-hook.cjs']);
        const result = ci.planScope({ scope: 'changed', changes: [{ status: 'M', file: '.claude/hooks/lib/shared-lib.cjs' }], index: idx });
        assert.deepEqual(result.lanes['hook-suites'], ['alpha']);
    } finally {
        repo.cleanup();
    }
});

test('the gate writes its plan as GitHub outputs and runs nothing', () => {
    const repo = makeRepo();
    try {
        repo.write('.claude/hooks/tests/suites/alpha.test.cjs', "runHook('alpha-hook.cjs'); // edited\n");
        const output = path.join(repo.root, 'gh-output.txt');
        const code = ci.main(['--plan', '--base=main', `--github-output=${output}`], repo.root);
        assert.equal(code, 0);
        assert.equal(
            fs.readFileSync(output, 'utf8'),
            `scope=changed\nrun_static=true\nrun_sync=false\nrun_hook_unit=false\nrun_hook_suites=true\nhook_suites=alpha\nstatic_base=${repo.run('rev-parse', 'HEAD')}\n`
        );
    } finally {
        repo.cleanup();
    }
});

test('the CLI exits 2 on a usage error', () => {
    const result = childProcess.spawnSync(process.execPath, [SCRIPT, '--lane=hook-suites', '--suites=no-such-suite'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /names no existing suite: no-such-suite/);
});

// ---- the upstream repository's manual-only CI workflow ----

const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');
// Same gate as the pinned CI test in startup-install.test.cjs: an adopting project's own workflows are its business.
const UPSTREAM_SKIP = (() => {
    let name = null;
    try {
        name = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).name;
    } catch {
        /* no root package */
    }
    if (name !== 'easy-claude-tooling') return 'asserts the upstream framework repo CI workflow only';
    return fs.existsSync(CI_WORKFLOW) ? false : 'upstream CI workflow .github/workflows/ci.yml is not present in this checkout';
})();

/** Event names under a workflow's top-level `on:` key, for the list, map and scalar forms. */
function workflowEvents(text) {
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex(line => /^(?:on|"on"|'on')\s*:/.test(line));
    assert.ok(start >= 0, 'workflow has a top-level on: key');
    const inline = lines[start]
        .replace(/^[^:]+:\s*/, '')
        .replace(/\s+#.*$/, '')
        .trim();
    if (inline.startsWith('['))
        return inline
            .slice(1, -1)
            .split(',')
            .map(part => part.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
    if (inline) return [inline.replace(/^["']|["']$/g, '')];
    const events = [];
    for (const line of lines.slice(start + 1)) {
        if (/^\S/.test(line)) break;
        const match = /^ {2}([A-Za-z_]+)\s*:/.exec(line) || /^ {2}-\s*([A-Za-z_]+)/.exec(line);
        if (match) events.push(match[1]);
    }
    return events;
}

function jobBlock(text, job) {
    const start = text.indexOf(`\n  ${job}:\n`);
    assert.ok(start >= 0, `job ${job} exists`);
    const next = text.slice(start + 1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
}

test('workflow event parsing reads the list, map and scalar forms', () => {
    assert.deepEqual(workflowEvents('on: push\njobs:\n'), ['push']);
    assert.deepEqual(workflowEvents('"on": [push, workflow_dispatch]\n'), ['push', 'workflow_dispatch']);
    assert.deepEqual(workflowEvents('on:\n  pull_request:\n  workflow_dispatch:\n    inputs:\n      scope:\njobs:\n'), ['pull_request', 'workflow_dispatch']);
});

test('workflows trigger only on manual dispatch', { skip: UPSTREAM_SKIP }, () => {
    for (const file of fs.readdirSync(WORKFLOWS_DIR).filter(name => /\.ya?ml$/.test(name))) {
        assert.deepEqual(
            workflowEvents(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')),
            ['workflow_dispatch'],
            `${file} must run only when dispatched by hand`
        );
    }
});

test('ci jobs run only commands the lane table owns', { skip: UPSTREAM_SKIP }, () => {
    const text = fs.readFileSync(CI_WORKFLOW, 'utf8');
    const owned = new Set(ci.LANES.map(lane => `node ${lane.argv.join(' ')}`));
    const setup = /^(?:npm ci\b|python -m pip install\b)/;
    for (const job of ['repo-checks', 'unit-tests', 'integration-test-shards']) {
        const runs = [...jobBlock(text, job).matchAll(/^\s+(?:- )?run:\s*(.+)$/gm)].map(match => match[1].trim()).filter(command => !setup.test(command));
        assert.ok(runs.length > 0, `${job} runs a lane`);
        for (const command of runs) {
            assert.ok(
                owned.has(command) || command.startsWith('node .claude/scripts/framework-ci.cjs '),
                `${job} runs "${command}", which framework-ci's LANES table does not own; add it there so local --scope=full runs it too`
            );
        }
    }
});

test('the gate plans the run and every lane job is gated on its plan output', { skip: UPSTREAM_SKIP }, () => {
    const text = fs.readFileSync(CI_WORKFLOW, 'utf8');
    assert.match(jobBlock(text, 'gate'), /node \.claude\/scripts\/framework-ci\.cjs --plan .*--github-output="\$GITHUB_OUTPUT"/);
    const gate = jobBlock(text, 'gate');
    const repoChecks = jobBlock(text, 'repo-checks');
    assert.match(gate, /run_repo_checks: .*run_sync == 'true' \|\| steps\.plan\.outputs\.run_static == 'true'/);
    assert.match(repoChecks, /if: \$\{\{ needs\.gate\.outputs\.run_repo_checks == 'true' \}\}/);
    assert.match(repoChecks, /CHECK_BASE: \$\{\{ needs\.gate\.outputs\.static_base \}\}/);
    assert.match(repoChecks, /run_static == 'true' && needs\.gate\.outputs\.scope == 'changed' && needs\.gate\.outputs\.static_base != ''/);
    assert.match(repoChecks, /--lane=static --scope=changed --base="\$CHECK_BASE" --head="\$CHECK_HEAD"/);
    assert.match(
        repoChecks,
        /run_static == 'true' && \(needs\.gate\.outputs\.scope != 'changed' \|\| needs\.gate\.outputs\.static_base == ''\) \}\}\r?\n +run: node \.claude\/scripts\/static-checks\.cjs/,
        'the old planner without a static_base still reaches the compatible full command'
    );
    assert.match(jobBlock(text, 'unit-tests'), /if: \$\{\{ needs\.gate\.outputs\.run_hook_unit == 'true' \}\}/);
    // Regression: with a bare `if:` the implicit success() skipped a selected leg whenever an unselected lane upstream was skipped.
    assert.match(
        jobBlock(text, 'integration-test-shards'),
        /if: \$\{\{ !cancelled\(\) && needs\.gate\.result == 'success' && needs\.static-and-unit\.result == 'success' && needs\.gate\.outputs\.run_hook_suites == 'true' \}\}/
    );
    assert.match(text, /group: ci-\$\{\{ github\.workflow \}\}-\$\{\{ inputs\.ref \|\| github\.ref \}\}-\$\{\{ inputs\.scope \}\}-\$\{\{ inputs\.base \}\}/);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
        if (!/\$\{\{[^}]*\binputs\./.test(line)) return;
        assert.match(
            line,
            /^\s+(?:ref|group|[A-Z_]+):/,
            `line ${i + 1} may pass an input only as a checkout ref, the concurrency group or an env value: ${line.trim()}`
        );
    });
});

// W-F2: a lane the plan selected must succeed; a lane it did not select must be skipped; a failed gate is red.
test('the summary jobs fail closed: selected lanes must succeed and unselected ones must be skipped', { skip: UPSTREAM_SKIP }, () => {
    const text = fs.readFileSync(CI_WORKFLOW, 'utf8');
    const staticAndUnit = jobBlock(text, 'static-and-unit');
    assert.match(staticAndUnit, /needs: \[gate, repo-checks, unit-tests, startup-install-platform-security\]/);
    assert.match(staticAndUnit, /RUN_REPO_CHECKS: \$\{\{ needs\.gate\.outputs\.run_repo_checks \}\}/);
    assert.match(staticAndUnit, /RUN_HOOK_UNIT: \$\{\{ needs\.gate\.outputs\.run_hook_unit \}\}/);
    assert.match(staticAndUnit, /expect\(\) \{ if \[ "\$3" = true \]; then want=success; else want=skipped; fi; test "\$2" = "\$want"/);
    assert.match(staticAndUnit, /test "\$\{\{ needs\.gate\.result \}\}" = success/);
    assert.match(staticAndUnit, /expect repo-checks "\$\{\{ needs\.repo-checks\.result \}\}" "\$RUN_REPO_CHECKS"/);
    assert.match(staticAndUnit, /expect unit-tests "\$\{\{ needs\.unit-tests\.result \}\}" "\$RUN_HOOK_UNIT"/);
    const required = jobBlock(text, 'ci-required');
    assert.match(required, /needs: \[gate, static-and-unit, integration-test-shards\]/);
    assert.match(required, /if: \$\{\{ always\(\) \}\}/);
    assert.match(required, /test "\$\{\{ needs\.gate\.result \}\}" = success/);
    assert.match(required, /test "\$\{\{ needs\.static-and-unit\.result \}\}" = success/);
    assert.match(required, /if \[ "\$RUN_HOOK_SUITES" = true \]; then want=success; else want=skipped; fi/);
    assert.match(required, /test "\$\{\{ needs\.integration-test-shards\.result \}\}" = "\$want"/);
    assert.doesNotMatch(text, /^\s+continue-on-error\s*:/m, 'no job may tolerate a failure');
});
