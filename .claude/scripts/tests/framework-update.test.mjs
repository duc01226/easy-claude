// framework-update.mjs: a newer framework is merged into a project, never copied over it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { main, planUpdate, normalizeCounts, LOCK_PATH } from '../framework-update.mjs';

const git = (cwd, ...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};

function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-update-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const upstream = path.join(dir, 'upstream');
    const project = path.join(dir, 'project');
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
    // Version 1 of the framework, installed into the project as-is.
    const v1 = {
        '.claude/hooks/a.cjs': 'one\ntwo\nthree\n',
        '.claude/hooks/b.cjs': 'alpha\nbeta\ngamma\n',
        '.claude/hooks/gone.cjs': 'old\n',
        '.claude/docs/README.md': 'Skills: <!-- COUNT:skills -->10<!-- /COUNT -->\nintro\nmiddle\nend\n',
        '.claude/SKILLS.yaml': 'generated v1\n',
    };
    for (const [file, text] of Object.entries(v1)) { write(upstream, file, text); write(project, file, text); }
    const base = commit(upstream, 'v1');
    commit(project, 'install v1');
    const run = (...args) => main([upstream, '--no-sync', ...args], project);
    return { dir, upstream, project, write, read, commit, base, run };
}

test('unchanged project files take upstream, project-only changes stay, and project-owned files are never touched', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha\nbeta (project fix)\ngamma\n');
    f.write(f.project, '.claude/skills/own/SKILL.md', 'project skill\n');
    f.commit(f.project, 'project changes');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (upstream)\nthree\n');
    f.write(f.upstream, '.claude/hooks/new.cjs', 'new\n');
    f.commit(f.upstream, 'v2');
    const head = git(f.upstream, 'rev-parse', 'HEAD');
    assert.equal(f.run(`--base=${f.base}`), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (upstream)\nthree\n', 'upstream change taken');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha\nbeta (project fix)\ngamma\n', 'project change kept');
    assert.equal(f.read(f.project, '.claude/hooks/new.cjs'), 'new\n', 'new upstream file added');
    assert.equal(f.read(f.project, '.claude/skills/own/SKILL.md'), 'project skill\n', 'project-owned file untouched');
    const lock = JSON.parse(f.read(f.project, LOCK_PATH));
    assert.equal(lock.source.commit, head, 'the lock records the upstream commit taken');
    assert.equal(lock.files['.claude/skills/own/SKILL.md'], undefined, 'the lock lists only framework files');
});

test('changes on both sides merge; an overlapping change leaves conflict markers and exit code 2', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/hooks/a.cjs', 'one (project)\ntwo\nthree\n');
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project)\nbeta\ngamma\n');
    f.commit(f.project, 'project changes');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo\nthree (upstream)\n');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha (upstream)\nbeta\ngamma\n');
    f.commit(f.upstream, 'v2');
    assert.equal(f.run(`--base=${f.base}`), 2);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one (project)\ntwo\nthree (upstream)\n', 'non-overlapping edits merge');
    assert.match(f.read(f.project, '.claude/hooks/b.cjs'), /<<<<<<< project[\s\S]*alpha \(project\)[\s\S]*alpha \(upstream\)[\s\S]*>>>>>>> upstream/);
});

test('an upstream deletion removes only an unchanged file; a changed one is kept and reported', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha\nbeta (project)\ngamma\n');
    f.commit(f.project, 'project change');
    fs.rmSync(path.join(f.upstream, '.claude/hooks/gone.cjs'));
    fs.rmSync(path.join(f.upstream, '.claude/hooks/b.cjs'));
    f.commit(f.upstream, 'v2 deletes');
    assert.equal(f.run(`--base=${f.base}`), 2);
    assert.equal(f.read(f.project, '.claude/hooks/gone.cjs'), null, 'unchanged file deleted');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha\nbeta (project)\ngamma\n', 'changed file kept');
});

test('count markers and generated catalogs never conflict', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/docs/README.md', 'Skills: <!-- COUNT:skills -->12<!-- /COUNT -->\nintro (project)\nmiddle\nend\n');
    f.write(f.project, '.claude/SKILLS.yaml', 'generated for the project\n');
    f.commit(f.project, 'project counts');
    f.write(f.upstream, '.claude/docs/README.md', 'Skills: <!-- COUNT:skills -->11<!-- /COUNT -->\nintro\nmiddle\nend (upstream)\n');
    f.write(f.upstream, '.claude/SKILLS.yaml', 'generated v2\n');
    f.commit(f.upstream, 'v2');
    assert.equal(f.run(`--base=${f.base}`), 0);
    assert.equal(f.read(f.project, '.claude/docs/README.md').replace(/-->\d+</, '-->N<'), 'Skills: <!-- COUNT:skills -->N<!-- /COUNT -->\nintro (project)\nmiddle\nend (upstream)\n', 'both edits kept; the differing counts did not conflict');
    assert.equal(f.read(f.project, '.claude/SKILLS.yaml'), 'generated for the project\n', 'regenerated, never merged');
    assert.equal(normalizeCounts(Buffer.from('<!-- COUNT:hooks:total -->37<!-- /COUNT -->'), 'x.md').toString(), '<!-- COUNT:hooks:total -->0<!-- /COUNT -->');
});

test('a dry run writes nothing; a first run needs --base; an uncommitted project is refused', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'changed\n');
    f.commit(f.upstream, 'v2');
    assert.throws(() => f.run(), /--base=/);
    assert.equal(f.run(`--base=${f.base}`, '--dry-run'), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo\nthree\n');
    assert.equal(f.read(f.project, LOCK_PATH), null);
    f.write(f.project, '.claude/hooks/a.cjs', 'uncommitted\n');
    assert.throws(() => f.run(`--base=${f.base}`), /uncommitted/);
});

test('the lock carries the base forward: the next update needs no --base', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo\nthree (v2)\n');
    f.commit(f.upstream, 'v2');
    assert.equal(f.run(`--base=${f.base}`), 0);
    f.write(f.project, '.claude/hooks/a.cjs', 'one (project)\ntwo\nthree (v2)\n');
    f.commit(f.project, 'take v2 and change it');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha\nbeta\ngamma (v3)\n');
    f.commit(f.upstream, 'v3');
    assert.equal(f.run(), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one (project)\ntwo\nthree (v2)\n', 'v3 did not touch a.cjs, so the project change stays');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha\nbeta\ngamma (v3)\n');
});

test('a working-tree update records hashes, and the next update still tells unchanged files from changed ones', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'uncommitted upstream\n');
    assert.equal(f.run(`--base=${f.base}`, '--working-tree'), 0);
    assert.equal(JSON.parse(f.read(f.project, LOCK_PATH)).source.workingTree, true);
    f.commit(f.project, 'take working tree');
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project)\nbeta\ngamma\n');
    f.commit(f.project, 'project change');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'committed later\n');
    f.commit(f.upstream, 'v2');
    const plan = planUpdate({ project: f.project, upstream: f.upstream });
    const kind = file => plan.actions.find(a => a.path === file).kind;
    assert.deepEqual([kind('.claude/hooks/a.cjs'), kind('.claude/hooks/b.cjs')], ['take', 'keep']);
});

test('record-only marks a hand-made sync as the base, so later project changes are kept and upstream ones taken', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    const v2 = f.commit(f.upstream, 'v2');
    // The project took v2 by hand and changed b.cjs on top; nothing recorded which version it took.
    f.write(f.project, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project)\nbeta\ngamma\n');
    f.commit(f.project, 'manual sync');
    assert.equal(f.run('--record-only', `--ref=${v2}`), 0);
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha (project)\nbeta\ngamma\n', 'record-only changes no file');
    f.commit(f.project, 'record lock');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v3)\nthree\n');
    f.commit(f.upstream, 'v3');
    assert.equal(f.run(), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v3)\nthree\n');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha (project)\nbeta\ngamma\n');
});

test('count-marker text inside code is data: a script containing it is taken byte for byte', t => {
    const f = fixture(t);
    const code = "const sample = '<!-- COUNT:skills -->12<!-- /COUNT -->';\n";
    f.write(f.upstream, '.claude/scripts/sample.test.mjs', code);
    f.commit(f.upstream, 'v2 adds a script with marker text');
    assert.equal(f.run(`--base=${f.base}`), 0);
    assert.equal(f.read(f.project, '.claude/scripts/sample.test.mjs'), code);
    assert.equal(normalizeCounts(Buffer.from(code), '.claude/scripts/sample.test.mjs').toString(), code);
});
