import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { resolveProjectRoot, resolveMutationProjectRoot } = require('../lib/project-root.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const writers = [
    '.claude/scripts/codex/sync-hooks.mjs',
    '.claude/scripts/codex/migrate-claude-to-codex.mjs',
    '.claude/scripts/codex/sync-context-workflows.mjs',
    '.claude/skills/claude-md-init/scripts/generate-claude-md.cjs',
    '.claude/skills/tech-spec/scripts/generate-tech-specs.mjs',
];

function fixture(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-root-test-'));
    try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function cleanEnv(override) {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    return { ...env, ...override };
}

test('mutation root rejects invalid explicit targets while read-only metadata remains available', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        const options = { cwd: dir, env: { CLAUDE_PROJECT_DIR: explicit } };
        assert.match(resolveProjectRoot(options).error, /CLAUDE_PROJECT_DIR/);
        assert.throws(() => resolveMutationProjectRoot(options), /CLAUDE_PROJECT_DIR/);
    }
    assert.equal(resolveMutationProjectRoot({ cwd: dir, env: {} }).rootDir, dir);
    assert.equal(resolveMutationProjectRoot({ cwd: os.tmpdir(), env: { CLAUDE_PROJECT_DIR: dir } }).rootDir, dir);
    const bootstrap = path.join(dir, 'bootstrap');
    fs.mkdirSync(bootstrap);
    const options = { cwd: dir, env: { CLAUDE_PROJECT_DIR: bootstrap } };
    assert.throws(() => resolveMutationProjectRoot(options), /CLAUDE_PROJECT_DIR/);
    assert.equal(resolveMutationProjectRoot({ ...options, allowUnmarkedRoot: true }).rootDir, bootstrap);
}));

// Invariant: rejected explicit targets must stop before ANY writer is called.
// Instrument both fs interfaces in the child; a write attempt fails independently
// of whether later source/config checks would also have rejected this fixture.
for (const writer of writers) {
    test(`${writer}: invalid target causes no output attempt`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        for (const explicit of ['other-project', path.join(dir, 'missing')]) {
            const code = `
                const fs = require('node:fs');
                for (const name of ['mkdirSync', 'writeFileSync', 'appendFileSync', 'renameSync', 'copyFileSync', 'rmSync', 'unlinkSync']) {
                    fs[name] = () => { throw new Error('WRITE_ATTEMPT:' + name); };
                }
                for (const name of ['mkdir', 'writeFile', 'appendFile', 'rename', 'copyFile', 'rm', 'unlink']) {
                    fs.promises[name] = async () => { throw new Error('WRITE_ATTEMPT:' + name); };
                }
                require('node:module').syncBuiltinESMExports();
                import(${JSON.stringify(pathToFileURL(path.join(root, writer)).href)}).catch(error => {
                    console.error(error.message); process.exitCode = 1;
                });
            `;
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 1, result.stderr);
            assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
            assert.doesNotMatch(result.stderr, /WRITE_ATTEMPT/);
            assert.deepEqual(fs.readdirSync(dir), ['.claude']);
        }
    }));
}

test('compact generator fallback rejects invalid explicit targets too', () => fixture(dir => {
    const code = `
        const Module = require('node:module');
        const original = Module._load;
        Module._load = function (name, ...args) {
            if (name === '../../../scripts/lib/project-root.cjs') {
                const error = new Error('missing compact dependency'); error.code = 'MODULE_NOT_FOUND'; throw error;
            }
            return original.call(this, name, ...args);
        };
        require(${JSON.stringify(path.join(root, writers[3]))});
    `;
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        const result = spawnSync(process.execPath, ['-e', code], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
        assert.deepEqual(fs.readdirSync(dir), []);
    }
}));

test('hook config and state roots agree with script fallback and explicit/nested controls', () => fixture(dir => {
    const bundle = path.join(dir, 'bundle');
    // OS-temp may live beneath a user's global .claude; the filesystem root
    // has no such ancestor and exercises the actual script-fallback branch.
    const outside = path.parse(dir).root;
    assert.equal(resolveProjectRoot({ cwd: outside, env: {} }).source, 'cwd-fallback');
    const nested = path.join(bundle, 'src');
    fs.mkdirSync(path.join(bundle, '.claude', 'hooks'), { recursive: true });
    fs.mkdirSync(nested);
    fs.cpSync(path.join(root, '.claude', 'hooks', 'lib'), path.join(bundle, '.claude', 'hooks', 'lib'), { recursive: true });
    const lib = path.join(bundle, '.claude', 'hooks', 'lib');
    const code = `
        const resolver = require(${JSON.stringify(path.join(lib, 'project-root.cjs'))});
        const loader = require(${JSON.stringify(path.join(lib, 'project-config-loader.cjs'))});
        const paths = require(${JSON.stringify(path.join(lib, 'ck-paths.cjs'))});
        console.log(JSON.stringify({
            root: resolver.resolveProjectRoot({ scriptPath: ${JSON.stringify(path.join(lib, 'project-root.cjs'))} }).rootDir,
            config: loader.getConfiguredProjectConfigPath(), state: paths.PROJECT_TMP_DIR
        }));
    `;
    for (const [cwd, env] of [[outside, {}], [nested, {}], [outside, { CLAUDE_PROJECT_DIR: bundle }]]) {
        const result = spawnSync(process.execPath, ['-e', code], { cwd, env: cleanEnv(env), encoding: 'utf8', timeout: 15000 });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {
            root: bundle, config: path.join(bundle, 'docs', 'project-config.json'), state: path.join(bundle, 'tmp', 'claude-temp'),
        });
    }
}));

test('sync-hooks writes only the valid explicit or discovered target', () => fixture(dir => {
    const bundle = path.join(dir, 'bundle');
    const nested = path.join(bundle, 'src');
    fs.mkdirSync(path.join(bundle, '.claude'), { recursive: true });
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(bundle, '.claude', 'settings.json'), JSON.stringify({ hooks: {} }));
    for (const [cwd, env] of [[dir, { CLAUDE_PROJECT_DIR: bundle }], [nested, {}]]) {
        const result = spawnSync(process.execPath, [path.join(root, writers[0])], { cwd, env: cleanEnv(env), encoding: 'utf8', timeout: 15000 });
        assert.equal(result.status, 0, result.stderr);
        assert.ok(fs.existsSync(path.join(bundle, '.codex', 'hooks.json')));
        assert.equal(fs.existsSync(path.join(cwd, '.codex')), false);
    }
}));

// R2-09: a rejected explicit root never grants lifecycle mutation authority.
for (const hook of ['npm-auto-install.cjs', 'session-end.cjs']) {
    test(`${hook}: invalid roots skip every mutation; valid roots retain work`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { 'synthetic-missing': '*' } }));
        const code = `
            const Module = require('node:module');
            const original = Module._load;
            const calls = [];
            const record = name => (...args) => { calls.push([name, ...args]); return 0; };
            Module._load = function(name, ...args) {
                if (name === 'child_process') return { execSync: record('npm') };
                if (name === './lib/hook-runner.cjs') return { runHookSync: (_, handler) => handler({ reason: 'exit', session_id: 'synthetic-session', cwd: process.cwd() }) };
                if (name === './lib/debug-log.cjs') return { debug: () => {} };
                if (name === './lib/temp-file-cleanup.cjs') return { cleanupAll: record('cleanup') };
                if (name === './lib/swap-engine.cjs') return { cleanupSwapFiles: record('old-swaps'), deleteSessionSwap: record('delete-swap') };
                if (name === './lib/ck-paths.cjs') return { getSnapshotPath: () => ${JSON.stringify(path.join(dir, 'absent-snapshot'))} };
                if (name === './lib/git-operation-lease.cjs') return { canonicalDirectory: value => value, revokeSessionLeases: record('revoke') };
                return original.call(this, name, ...args);
            };
            require(${JSON.stringify(path.join(root, '.claude/hooks', hook))});
            console.log(JSON.stringify(calls));
        `;
        for (const explicit of ['other-project', path.join(dir, 'missing'), dir, '']) {
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout);
            if (explicit && explicit !== dir) assert.deepEqual(calls, [], explicit);
            else if (hook === 'npm-auto-install.cjs') {
                assert.equal(calls.length, 1);
                assert.equal(calls[0][0], 'npm');
                assert.equal(calls[0][2].cwd, dir);
            } else {
                assert.deepEqual(calls.map(call => call[0]), ['revoke', 'cleanup', 'delete-swap']);
                assert.equal(calls[0][1].projectDir, dir);
                assert.equal(calls[1][1], dir);
            }
        }
    }));
}

for (const standalone of [false, true]) {
    test(`skill validator ${standalone ? 'standalone' : 'shared'}: reject invalid --fix roots without writes`, () => fixture(dir => {
        const script = standalone ? path.join(dir, 'validate-skills.cjs') : path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs');
        if (standalone) fs.copyFileSync(path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs'), script);
        const skillDir = path.join(dir, '.claude/skills/example');
        fs.mkdirSync(skillDir, { recursive: true });
        const skill = path.join(skillDir, 'SKILL.md');
        const original = '---\nname: example\ndescription: "[Test] fixture"\ntools: Read\n---\n## Quick Summary\nFixture.\n';
        fs.writeFileSync(skill, original);
        for (const explicit of ['other-project', path.join(dir, 'missing')]) {
            const result = spawnSync(process.execPath, [script, '--fix'], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(fs.readFileSync(skill, 'utf8'), original, explicit);
            assert.equal(result.status, 2, result.stderr);
            assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
        }
        const readOnly = spawnSync(process.execPath, [script], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: 'other-project' }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(readOnly.status, 0, readOnly.stderr);
        assert.equal(fs.readFileSync(skill, 'utf8'), original);
        const valid = spawnSync(process.execPath, [script, '--fix'], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: dir }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(valid.status, 0, valid.stderr);
        assert.equal(fs.readFileSync(skill, 'utf8'), original.replace('tools:', 'allowed-tools:'));
    }));
}

test('SessionEnd real runner cannot mutate files for rejected explicit roots', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    const code = `
        const fs = require('node:fs');
        const calls = [];
        for (const name of ['mkdirSync', 'writeFileSync', 'appendFileSync', 'renameSync', 'copyFileSync', 'rmSync', 'unlinkSync', 'rmdirSync']) {
            fs[name] = () => { calls.push(name); throw new Error('WRITE_ATTEMPT:' + name); };
        }
        process.on('exit', () => console.log(JSON.stringify(calls)));
        require(${JSON.stringify(path.join(root, '.claude/hooks/session-end.cjs'))});
    `;
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        for (const reason of ['exit', 'clear', 'compact']) {
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0' }),
                input: JSON.stringify({ reason, session_id: 'synthetic-root-session', cwd: dir }),
                encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            assert.deepEqual(JSON.parse(result.stdout), [], `${explicit}: ${reason}`);
        }
    }
}));

test('standalone validator can fix an explicitly selected existing unmarked directory', () => fixture(dir => {
    const script = path.join(dir, 'validate-skills.cjs');
    fs.copyFileSync(path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs'), script);
    const skill = path.join(dir, 'SKILL.md');
    fs.writeFileSync(skill, '---\nname: fixture\ndescription: "[Test] fixture"\ntools: Read\n---\n## Quick Summary\nFixture.\n');
    const result = spawnSync(process.execPath, [script, '--fix', '--path', '.'], {
        cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: dir }), encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(skill, 'utf8'), /^allowed-tools: Read$/m);
    assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
}));

// R3-R02: execute actual entrypoints, replacing effects only. The invalid case
// must not reach an effect; valid controls prove the fixture reaches real work.
for (const hook of ['init-prompt-gate.cjs', 'session-init.cjs', 'session-init-docs.cjs']) {
    test(`${hook}: rejected roots preserve all files and processes`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        fs.mkdirSync(path.join(dir, 'src'));
        const script = path.join(root, '.claude/hooks', hook);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load;
            if (process.argv[1] === 'mutant') {
                const compile = Module._extensions['.cjs'] || Module._extensions['.js'];
                Module._extensions['.cjs'] = function(mod, filename) {
                    if (filename !== ${JSON.stringify(script)}) return compile(mod, filename);
                    const source = fs.readFileSync(filename, 'utf8');
                    if (source.split('if (rootResolution.error) {').length !== 2) throw Error('mutation anchor missing');
                    mod._compile(source.replace('if (rootResolution.error) {', 'if (false) {'), filename);
                };
            }
            for (const name of ['mkdirSync','writeFileSync','appendFileSync','renameSync','copyFileSync','rmSync','unlinkSync','rmdirSync']) {
                fs[name] = (...args) => { calls.push([name, String(args[0])]); };
            }
            Module._load = function(name, ...args) {
                if (name === './lib/temp-file-cleanup.cjs') return { cleanupAll: target => calls.push(['cleanup', target]) };
                if (name === 'child_process') return {
                    execSync: () => { calls.push(['execSync']); return ''; },
                    execFileSync: () => { calls.push(['execFileSync']); return ''; }
                };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log('ROOT_EFFECTS:' + JSON.stringify(calls)));
            process.argv[1] = ${JSON.stringify(script)};
            Module.runMain(${JSON.stringify(script)});
        `;
        for (const [explicit, mutant] of [['relative-root', false], [path.join(dir, 'missing'), false], [dir, false], ['', false], ['relative-root', true]]) {
            const result = spawnSync(process.execPath, ['-e', code, mutant ? 'mutant' : 'control'], {
                cwd: explicit === dir || explicit === '' ? path.join(dir, 'src') : dir,
                env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0', CLAUDE_ENV_FILE: path.join(dir, 'session.env') }),
                input: JSON.stringify({ prompt: 'skip init', session_id: 'root-fixture', source: 'startup' }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout.match(/ROOT_EFFECTS:(.*)/)?.[1] || 'null');
            if (mutant) {
                assert.doesNotMatch(result.stderr, /CLAUDE_PROJECT_DIR/);
                if (hook === 'init-prompt-gate.cjs') assert.match(result.stdout, /Project init skipped/);
                else assert.ok(calls.length > 0, 'main guard deletion must reach effects');
            } else if (explicit && explicit !== dir) {
                assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
                assert.deepEqual(calls, [], explicit);
            } else {
                assert.doesNotMatch(result.stderr, /CLAUDE_PROJECT_DIR/);
                const expected = hook === 'session-init.cjs' ? ['cleanup', dir] : ['writeFileSync', path.join(dir, hook === 'init-prompt-gate.cjs' ? 'tmp/claude-temp/.init-dismissed' : 'docs/project-config.json')];
                assert.ok(calls.some(call => call[0] === expected[0] && call[1] === expected[1]), JSON.stringify(calls));
            }
            assert.deepEqual(fs.readdirSync(dir).sort(), ['.claude', 'src']);
        }
    }));
}

test('graph root rejection blocks every side-effect owner with valid controls', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    const code = `
        const fs = require('node:fs'), Module = require('node:module');
        const calls = [], original = Module._load;
        for (const name of ['mkdirSync','writeFileSync','rmdirSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
        const stat = fs.statSync;
        fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ isDirectory: () => true, mtimeMs: 0 });
        fs.existsSync = () => true;
        Module._load = function(name, ...args) {
            if (name === './debug-log.cjs') return { debug() {}, debugError() {} };
            if (name === 'child_process') return { execFileSync: (bin, args) => {
                calls.push(['exec', bin, args]); return args.includes('--version') ? 'Python 3.12.0' : '{}';
            } };
            return original.call(this, name, ...args);
        };
        const graph = require(${JSON.stringify(path.join(root, '.claude/hooks/lib/graph-utils.cjs'))});
        const result = { python: graph.findPython(), deps: graph.ensurePythonDeps(), recent: graph.wasRecentlyUpdated(), lock: graph.acquireUpdateLock(), invoke: graph.invokeGraph('sync') };
        graph.releaseUpdateLock(); graph.writeLastSeenHead('fixture-head');
        console.log(JSON.stringify({ result, calls }));
    `;
    for (const explicit of ['relative-root', path.join(dir, 'missing'), dir, '']) {
        const child = spawnSync(process.execPath, ['-e', code], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000 });
        assert.equal(child.status, 0, child.stderr);
        const { result, calls } = JSON.parse(child.stdout);
        if (explicit && explicit !== dir) {
            assert.equal(result.python, null);
            assert.equal(result.deps.ok, false);
            assert.match(result.deps.message, /CLAUDE_PROJECT_DIR/);
            assert.equal(result.recent, true);
            assert.equal(result.lock, false);
            assert.equal(result.invoke, null);
            assert.deepEqual(calls, []);
        } else {
            assert.equal(result.deps.ok, true);
            assert.equal(result.recent, false);
            assert.equal(result.lock, true);
            assert.deepEqual(result.invoke, {});
            assert.ok(calls.some(call => call[0] === 'writeFileSync' && call[1] === path.join(dir, '.code-graph/.last-seen-head')));
            assert.ok(calls.some(call => call[0] === 'mkdirSync' && call[1] === path.join(dir, '.code-graph/.update-lock')));
        }
    }
}));

for (const hook of ['graph-session-init.cjs', 'graph-prompt-sync.cjs', 'graph-auto-update.cjs']) {
    test(`${hook}: real graph consumer rejects mutation roots and keeps valid work`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        const script = path.join(root, '.claude/hooks', hook);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load, stat = fs.statSync;
            fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ mtimeMs: 0 });
            fs.existsSync = () => true;
            for (const name of ['mkdirSync','writeFileSync','rmdirSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
            Module._load = function(name, ...args) {
                if (name.endsWith('/hook-runner.cjs')) return { runHook: (_, action) => action() };
                if (name.endsWith('/debug-log.cjs')) return { debug() {}, debugError() {} };
                if (name.endsWith('/project-config-loader.cjs')) return { isConfigPopulated: () => true };
                if (name === 'child_process') return { execFileSync: (bin, argv, options) => {
                    calls.push(['exec', bin, argv, options.cwd]);
                    return bin === 'git' ? 'fixture-head' : argv.includes('--version') ? 'Python 3.12.0' : '{}';
                } };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log(JSON.stringify(calls)));
            require(${JSON.stringify(script)});
        `;
        for (const explicit of ['relative-root', path.join(dir, 'missing'), dir, '']) {
            const child = spawnSync(process.execPath, ['-e', code], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000 });
            assert.equal(child.status, 0, child.stderr);
            const calls = JSON.parse(child.stdout);
            if (explicit && explicit !== dir) assert.deepEqual(calls.filter(call => !(call[0] === 'exec' && call[1] === 'git')), []);
            else assert.ok(calls.some(call => call[0] === 'exec' && call[2].includes(hook === 'graph-auto-update.cjs' ? 'update' : 'sync') && call[3] === dir), JSON.stringify(calls));
        }
    }));
}

// The exported APIs can be called without main(). Kill one guard deletion at a
// time in memory; never alter the checkout or allow an observed effect to run.
const guardedApis = [
    ['init-prompt-gate.cjs', 'writeDismissFlag', '', 'return;'],
    ['init-prompt-gate.cjs', 'writeScanDismissFlag', '', 'return;'],
    ['init-prompt-gate.cjs', 'writeGraphDismissFlag', '', 'return;'],
    ['lib/agent-files-state.cjs', 'writeAgentFilesDismissFlag', '', 'return;'],
    ['lib/session-init-helpers.cjs', 'initDesignSystemAppDocs', '', 'return [];'],
    ['lib/session-init-helpers.cjs', 'refreshScanStaleFlag', 'staleDays = 60', 'return;'],
    ['lib/graph-utils.cjs', 'findPython', '', 'return null;'],
    ['lib/graph-utils.cjs', 'ensurePythonDeps', '', 'return { ok: false, message: `[code-graph] Skipped: ${rootResolution.error}` };'],
    ['lib/graph-utils.cjs', 'wasRecentlyUpdated', '', 'return true;'],
    ['lib/graph-utils.cjs', 'acquireUpdateLock', '', 'return false;'],
    ['lib/graph-utils.cjs', 'releaseUpdateLock', '', 'return;'],
    ['lib/graph-utils.cjs', 'writeLastSeenHead', 'head', 'return;', 'fixture-head'],
];
for (const [file, method, parameters, returnStatement, argument] of guardedApis) {
    test(`${method}: standalone mutation guard has a discriminating effect oracle`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        const script = path.join(root, '.claude/hooks', file);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load, read = fs.readFileSync, stat = fs.statSync;
            const child = new Module(${JSON.stringify(script)}); child.filename = ${JSON.stringify(script)};
            child.paths = Module._nodeModulePaths(require('node:path').dirname(child.filename));
            let source = read(child.filename, 'utf8');
            if (process.argv[1] === 'mutant') {
                const from = ${JSON.stringify(`function ${method}(${parameters}) {
    if (rootResolution.error) ${returnStatement}`)};
                if (source.replaceAll('\\r\\n','\\n').split(from).length !== 2) throw Error('mutation anchor missing');
                source = source.replaceAll('\\r\\n','\\n').replace(from, ${JSON.stringify(`function ${method}(${parameters}) {`)});
            }
            for (const name of ['mkdirSync','writeFileSync','appendFileSync','rmdirSync','unlinkSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
            fs.existsSync = target => !String(target).endsWith('fixture.md');
            fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ isDirectory: () => true, mtimeMs: 0 });
            Module._load = function(name, ...args) {
                if (name.endsWith('/debug-log.cjs')) return { debug() {}, debugError() {} };
                if (name.endsWith('/agent-files-state.cjs')) return {
                    getAgentFileIssues: () => ['missing'], isAgentFilesDismissed: () => false,
                    isAgentFilesDismissRequest: () => true, writeAgentFilesDismissFlag: () => calls.push(['agent-dismiss']), buildOfferMessage: () => ''
                };
                if (name.endsWith('/project-config-loader.cjs')) return {
                    loadProjectConfig: () => ({ designSystem: { appMappings: [{ docFile: 'fixture.md' }] } }),
                    getConfiguredProjectConfigPath: () => ${JSON.stringify(path.join(dir, 'docs/project-config.json'))},
                    getConfiguredDocsIndexPath: () => ${JSON.stringify(path.join(dir, 'docs/project-reference/docs-index-reference.md'))}, isConfigPopulated: () => true
                };
                if (name === 'child_process') return { execFileSync: () => { calls.push(['exec']); return 'Python 3.12.0'; } };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log('ROOT_EFFECTS:' + JSON.stringify(calls)));
            child._compile(source, child.filename);
            child.exports[${JSON.stringify(method)}](${JSON.stringify(argument)});
        `;
        for (const variant of ['control', 'missing', 'mutant', 'valid']) {
            const explicit = variant === 'valid' ? dir : variant === 'missing' ? path.join(dir, 'missing') : 'relative-root';
            const result = spawnSync(process.execPath, ['-e', code, variant], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0' }), encoding: 'utf8', timeout: 15000 });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout.match(/ROOT_EFFECTS:(.*)/)?.[1] || 'null');
            if (variant === 'control' || variant === 'missing') assert.deepEqual(calls, []);
            else assert.ok(calls.length > 0, `${method}: deletion survived`);
        }
    }));
}

test('supervisor rejects invalid project roots before writes or agent launch', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.mkdirSync(path.join(dir, 'nested'));
    fs.writeFileSync(path.join(dir, 'prompt.txt'), 'Synthetic test prompt.');
    fs.writeFileSync(path.join(dir, 'run-config.json'), JSON.stringify({ cwd: dir, agents: [{
        name: 'claude', command: 'claude', args: ['-p', '--dangerously-skip-permissions', '--effort', 'xhigh'], promptFile: 'prompt.txt', outputFile: 'output.md'
    }] }));
    const relativeScript = '.claude/skills/dual-ai/scripts/dual-ai-runner.mjs';
    const script = path.join(dir, relativeScript);
    fs.mkdirSync(path.dirname(script), { recursive: true });
    const source = fs.readFileSync(path.join(root, relativeScript), 'utf8');
    fs.writeFileSync(script, source);
    const resolver = path.join(dir, '.claude/scripts/lib/project-root.cjs');
    fs.mkdirSync(path.dirname(resolver), { recursive: true });
    fs.copyFileSync(path.join(root, '.claude/scripts/lib/project-root.cjs'), resolver);
    const code = `
        const fs = require('node:fs'), cp = require('node:child_process');
        const calls = [];
        for (const name of ['writeFileSync','renameSync','appendFileSync']) fs[name] = () => { calls.push([name]); };
        fs.createWriteStream = () => ({ write() {}, end() {} });
        cp.spawn = (command, args, options) => {
            calls.push(['spawn', command, options.cwd]);
            const { EventEmitter } = require('node:events');
            const child = new EventEmitter(); child.pid = 123; child.exitCode = null; child.signalCode = null;
            child.stdin = new EventEmitter(); child.stdin.write = () => {}; child.stdin.end = () => {};
            child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
            setImmediate(() => { child.exitCode = 0; child.emit('close', 0, null); });
            return child;
        };
        require('node:module').syncBuiltinESMExports();
        process.on('exit', () => console.log('ROOT_EFFECTS:' + JSON.stringify(calls)));
        process.argv = [process.execPath, ${JSON.stringify(script)}, '--run-dir', ${JSON.stringify(dir)}];
        import(${JSON.stringify(pathToFileURL(script).href)});
    `;
    for (const explicit of ['relative-root', path.join(dir, 'missing'), dir, '']) {
        const result = spawnSync(process.execPath, ['-e', code], { cwd: path.join(dir, 'nested'), env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000 });
        const calls = JSON.parse(result.stdout.match(/ROOT_EFFECTS:(.*)/)?.[1] || 'null');
        if (explicit && explicit !== dir) {
            assert.equal(result.status, 2, result.stderr);
            assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
            assert.deepEqual(calls, []);
        } else {
            assert.equal(result.status, 0, result.stderr);
            assert.doesNotMatch(result.stderr, /CLAUDE_PROJECT_DIR/);
            assert.match(result.stdout, /completed.*claude:completed/);
            assert.deepEqual(calls.filter(call => call[0] === 'spawn'), [['spawn', 'claude', dir]]);
        }
        assert.deepEqual(fs.readdirSync(dir).sort(), ['.claude', 'nested', 'prompt.txt', 'run-config.json']);
    }
    assert.equal(source.split('if (rootResolution.error) {').length, 2);
    fs.writeFileSync(script, source.replace('if (rootResolution.error) {', 'if (false) {'));
    const mutant = spawnSync(process.execPath, ['-e', code], { cwd: path.join(dir, 'nested'), env: cleanEnv({ CLAUDE_PROJECT_DIR: 'relative-root' }), encoding: 'utf8', timeout: 15000 });
    assert.equal(mutant.status, 0, mutant.stderr);
    assert.doesNotMatch(mutant.stderr, /CLAUDE_PROJECT_DIR/);
    assert.deepEqual(JSON.parse(mutant.stdout.match(/ROOT_EFFECTS:(.*)/)[1]).filter(call => call[0] === 'spawn'), [['spawn', 'claude', dir]]);
}));
