// update-from-upstream.mjs: a project updates itself from the upstream repository by address alone,
// keeping a cached blobless clone and running the upstream's own merge engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import { main, parseArgs, isRemote, selectEngine, ensureCache, CACHE_DIR } from '../../skills/framework-update/scripts/update-from-upstream.mjs';

const ENGINE = fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'framework-update.mjs'), 'utf8');
const LOCK = '.claude/framework-lock.json';

const git = (cwd, ...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};

function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-upstream-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const upstream = path.join(dir, 'easy-claude');
    const project = path.join(dir, 'consumer');
    const write = (root, file, text) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), text);
    };
    const read = (root, file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : null;
    const commit = (root, message) => {
        git(root, 'add', '-A');
        git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', message);
        return git(root, 'rev-parse', 'HEAD');
    };
    for (const root of [upstream, project]) { fs.mkdirSync(root, { recursive: true }); git(root, 'init', '-q'); }
    git(upstream, 'checkout', '-q', '-b', 'main');
    git(upstream, 'config', 'uploadpack.allowFilter', 'true');
    git(upstream, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
    const v1 = { '.claude/hooks/a.cjs': 'one\ntwo\nthree\n', '.claude/hooks/b.cjs': 'alpha\nbeta\ngamma\n' };
    for (const [file, text] of Object.entries(v1)) { write(upstream, file, text); write(project, file, text); }
    const base = commit(upstream, 'v1');
    // The consumer copied v1 by hand (no lock), then added its own skill and fixed b.cjs.
    // Upstream's merge engine arrives later, in each test's v2.
    write(project, '.claude/skills/acme/SKILL.md', 'project skill\n');
    write(project, '.claude/hooks/b.cjs', 'alpha (project fix)\nbeta\ngamma\n');
    commit(project, 'hand copy of v1 plus project work');
    return { dir, upstream, project, write, read, commit, base, remote: url.pathToFileURL(upstream).href };
}

test('an address is told from a folder', () => {
    for (const value of ['https://github.com/duc01226/easy-claude.git', 'ssh://git@host/repo.git', 'git@github.com:duc01226/easy-claude.git', 'file:///tmp/repo']) assert.equal(isRemote(value), true, value);
    for (const value of ['../easy-claude', 'C:\\src\\easy-claude', '/home/me/easy-claude', 'easy-claude']) assert.equal(isRemote(value), false, value);
});

test('options are checked before anything runs', () => {
    assert.throws(() => parseArgs(['--force']), /Unknown option/);
    assert.throws(() => parseArgs(['--ref=']), /needs a value/);
    assert.throws(() => parseArgs(['--engine=other']), /upstream or local/);
    assert.throws(() => parseArgs(['--working-tree', '--ref=main']), /drop --ref/);
    assert.deepEqual(parseArgs(['--dry-run', '--base=auto']).pass, ['--dry-run', '--base=auto']);
});

test('a hand-copied project updates from the address alone, and the next update finds the address in the lock', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha\nbeta\ngamma (v2)\n');
    f.write(f.upstream, '.claude/scripts/framework-update.mjs', ENGINE);
    const v2 = f.commit(f.upstream, 'v2');
    assert.equal(main([`--upstream=${f.remote}`, `--project=${f.project}`, '--no-sync']), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v2)\nthree\n', 'upstream change taken');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha (project fix)\nbeta\ngamma (v2)\n', 'project fix merged with upstream');
    assert.equal(f.read(f.project, '.claude/skills/acme/SKILL.md'), 'project skill\n', 'project skill untouched');
    assert.equal(f.read(f.project, '.claude/scripts/framework-update.mjs'), ENGINE, 'the engine itself arrives with the update');
    const lock = JSON.parse(f.read(f.project, LOCK));
    assert.deepEqual([lock.source.commit, lock.source.ref, lock.source.url], [v2, 'main', f.remote]);
    assert.equal(git(path.join(f.project, CACHE_DIR), 'config', '--get', 'remote.origin.promisor'), 'true', 'the cache is a blobless clone');
    assert.equal(f.read(f.project, 'tmp/framework-update/.gitignore'), '*\n', 'the cache never shows up as project changes');
    assert.equal(git(f.project, 'status', '--porcelain', '--', 'tmp'), '');

    f.commit(f.project, 'take v2');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v3)\nthree\n');
    const v3 = f.commit(f.upstream, 'v3');
    assert.equal(main([`--project=${f.project}`, '--no-sync']), 0, 'no address given: the lock supplies it');
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v3)\nthree\n');
    assert.equal(JSON.parse(f.read(f.project, LOCK)).source.commit, v3, 'the cached clone fetched the new commit');
});

test('the upstream engine runs unless it predates --project, and then the project engine runs', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/scripts/framework-update.mjs', ENGINE);
    const v2 = f.commit(f.upstream, 'v2');
    const cache = path.join(f.dir, 'cache.git');
    git(f.dir, 'clone', '--quiet', '--bare', f.remote, cache);
    const chosen = selectEngine({ project: f.project, upstreamDir: cache, commit: v2, engine: 'upstream' });
    assert.equal(fs.readFileSync(chosen, 'utf8'), ENGINE, 'the upstream version supplies the engine');
    f.write(f.upstream, '.claude/scripts/framework-update.mjs', '// an engine without the project option\n');
    const old = f.commit(f.upstream, 'old engine');
    git(cache, 'fetch', '--quiet', 'origin', '+refs/heads/*:refs/heads/*');
    f.write(f.project, '.claude/scripts/framework-update.mjs', ENGINE);
    assert.equal(selectEngine({ project: f.project, upstreamDir: cache, commit: old, engine: 'upstream' }),
        path.join(f.project, '.claude/scripts/framework-update.mjs'));
});

test('a cache left broken by an interrupted clone, or cloned from another address, is cloned again', t => {
    const f = fixture(t);
    const cache = path.join(f.project, CACHE_DIR);
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(path.join(cache, 'partial-download'), 'interrupted\n');
    git(f.project, 'remote', 'add', 'origin', f.remote);  // the enclosing project must not pass for the cache
    assert.equal(ensureCache(f.project, f.remote), cache);
    assert.equal(git(cache, 'rev-parse', 'main'), git(f.upstream, 'rev-parse', 'main'), 'a fresh clone replaced the broken folder');
    assert.equal(fs.existsSync(path.join(cache, 'partial-download')), false);
});
