// framework-update.mjs: a newer framework is merged into a project, never copied over it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import url from 'node:url';
import { main, planUpdate, normalizeContent, prefetchBlobs, LOCK_PATH } from '../framework-update.mjs';

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
    assert.equal(normalizeContent(Buffer.from('<!-- COUNT:hooks:total -->37<!-- /COUNT -->'), 'x.md').toString(), '<!-- COUNT:hooks:total -->0<!-- /COUNT -->');
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
    assert.equal(normalizeContent(Buffer.from(code), '.claude/scripts/sample.test.mjs').toString(), code);
});

test('--base=auto finds the upstream version a hand-copied project came from, so its own edits stay and newer upstream work lands', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    const v2 = f.commit(f.upstream, 'v2');
    // The project copied v2 by hand, recorded nothing, then fixed b.cjs.
    f.write(f.project, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project fix)\nbeta\ngamma\n');
    f.commit(f.project, 'manual copy of v2 plus a fix');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v3)\nthree\n');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha\nbeta\ngamma (v3)\n');
    f.commit(f.upstream, 'v3');
    const plan = planUpdate({ project: f.project, upstream: f.upstream, base: 'auto' });
    assert.equal(plan.baseDetection.commit, v2, 'the version whose files match the project is the base');
    assert.equal(plan.baseDetection.matched, 4, 'every unchanged project file matched (SKILLS.yaml, gone.cjs, README, a.cjs)');
    assert.equal(f.run('--base=auto'), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v3)\nthree\n', 'upstream change taken');
    assert.equal(f.read(f.project, '.claude/hooks/b.cjs'), 'alpha (project fix)\nbeta\ngamma (v3)\n', 'project fix kept and merged with upstream');
});

test('a Windows checkout with CRLF line endings is not a project change', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha\r\nbeta\r\ngamma\r\n');
    f.commit(f.project, 'crlf checkout');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha\nbeta (upstream)\ngamma\n');
    f.commit(f.upstream, 'v2');
    const plan = planUpdate({ project: f.project, upstream: f.upstream, base: f.base });
    assert.equal(plan.actions.find(a => a.path === '.claude/hooks/b.cjs').kind, 'take', 'line endings alone do not make a project edit');
    assert.equal(normalizeContent(Buffer.from('a\r\nb\r\n'), 'x.cjs').toString(), 'a\nb\n');
});

// Intent: the sync keeps a Codex-only skill, so listing it is information for the user's decision, not a
// reason to stop: the update still ends with the sync, and a project that keeps such a skill (one another
// tool installed) is not left with a skipped sync on every update.
test('project-only files are listed and untouched, and a Codex-only skill in .agents/skills is listed while the sync still runs', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/skills/own/SKILL.md', 'project skill\n');
    f.write(f.project, '.claude/hooks/own-hook.cjs', 'project hook\n');
    f.write(f.project, '.agents/skills/own/SKILL.md', 'mirror of the project skill\n');
    f.write(f.project, '.agents/skills/codex-only/SKILL.md', 'written for Codex only\n');
    f.write(f.project, '.agents/skills/.codex-mirror.json', '{}\n');
    // A stand-in for the mirror sync that records that it ran.
    f.write(f.project, '.claude/skills/sync-codex/scripts/run-codex-sync.mjs', "import fs from 'node:fs';\nfs.writeFileSync('sync-ran', 'yes');\n");
    f.commit(f.project, 'project additions');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.commit(f.upstream, 'v2');
    const plan = planUpdate({ project: f.project, upstream: f.upstream, base: f.base });
    assert.deepEqual(plan.projectOnly, ['.claude/hooks/own-hook.cjs', '.claude/skills/own/SKILL.md', '.claude/skills/sync-codex/scripts/run-codex-sync.mjs']);
    assert.deepEqual(plan.mirrorOnly, ['.agents/skills/codex-only'], 'a mirrored project skill and the sync marker are not flagged');
    assert.deepEqual(plan.mirrorClashes, [], 'no framework skill takes its name');
    assert.equal(main([f.upstream, `--base=${f.base}`], f.project), 0, 'a Codex-only skill leaves nothing to resolve');
    assert.equal(f.read(f.project, 'sync-ran'), 'yes', 'the closing sync ran');
    assert.equal(f.read(f.project, '.agents/skills/codex-only/SKILL.md'), 'written for Codex only\n');
    assert.equal(f.read(f.project, '.agents/skills/own/SKILL.md'), 'mirror of the project skill\n', 'a project skill mirror is not the update\'s to remove');
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v2)\nthree\n', 'the merge itself ran');
});

// Intent: when a framework skill new in this update takes the name of a Codex-only skill, the closing sync
// would replace that skill with the new one's mirror. The update stops before the sync so the user can
// rename theirs; a project skill of the same name in .claude/ is a merge of two skills, not a mirror clash.
test('a framework skill new in this update that takes a Codex-only skill\'s name stops the sync until the user settles it', t => {
    const f = fixture(t);
    f.write(f.project, '.agents/skills/codex-only/SKILL.md', 'written for Codex only\n');
    f.write(f.project, '.agents/skills/.codex-mirror.json', '{"managedBy":"codex-sync","source":".claude/skills","generatedEntries":[]}\n');
    f.write(f.project, '.claude/skills/sync-codex/scripts/run-codex-sync.mjs', "import fs from 'node:fs';\nfs.writeFileSync('sync-ran', 'yes');\n");
    f.commit(f.project, 'a Codex-only skill');
    f.write(f.upstream, '.claude/skills/codex-only/SKILL.md', 'new framework skill\n');
    f.commit(f.upstream, 'v2 adds a skill of the same name');

    const plan = planUpdate({ project: f.project, upstream: f.upstream, base: f.base });
    assert.deepEqual(plan.mirrorClashes, ['.agents/skills/codex-only']);
    assert.deepEqual(plan.mirrorOnly, [], 'a name the framework now ships is not mirror-only');
    assert.equal(plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side').length, 0, 'the clash alone has to stop the sync');
    assert.equal(main([f.upstream, `--base=${f.base}`], f.project), 2);
    assert.equal(f.read(f.project, 'sync-ran'), null, 'the sync that would replace the Codex-only skill never started');
    assert.equal(f.read(f.project, '.agents/skills/codex-only/SKILL.md'), 'written for Codex only\n');
    assert.equal(f.read(f.project, '.claude/skills/codex-only/SKILL.md'), 'new framework skill\n', 'the merge itself ran');

    // A project skill of the same name in .claude/ meets the new one there, in the merge: not a mirror clash
    const g = fixture(t);
    g.write(g.project, '.claude/skills/both-sides/SKILL.md', 'project skill\n');
    g.write(g.project, '.agents/skills/both-sides/SKILL.md', 'mirror of the project skill\n');
    g.commit(g.project, 'a project skill');
    g.write(g.upstream, '.claude/skills/both-sides/SKILL.md', 'new framework skill\n');
    g.commit(g.upstream, 'v2 adds a skill of the same name');
    assert.deepEqual(planUpdate({ project: g.project, upstream: g.upstream, base: g.base }).mirrorClashes, []);

    // A framework skill the base already had is not new: a mirror left of it after the project removed the
    // skill is the sync's leftover, which the update removes, not a skill to protect
    const h = fixture(t);
    for (const root of [h.upstream, h.project]) h.write(root, '.claude/skills/old-skill/SKILL.md', 'framework skill\n');
    const base = h.commit(h.upstream, 'v1 with a skill');
    h.commit(h.project, 'install v1');
    fs.rmSync(path.join(h.project, '.claude/skills/old-skill'), { recursive: true });
    h.write(h.project, '.agents/skills/old-skill/SKILL.md', 'leftover mirror of the framework skill\n');
    h.commit(h.project, 'the project drops the skill; its mirror is left');
    h.write(h.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    h.commit(h.upstream, 'v2');
    assert.deepEqual(planUpdate({ project: h.project, upstream: h.upstream, base }).mirrorClashes, []);
    assert.equal(h.run(`--base=${base}`), 0);
    assert.equal(h.read(h.project, '.agents/skills/old-skill/SKILL.md'), null, 'the leftover mirror is removed');
});

// Intent: a project whose mirror an older sync wrote has a marker that records no names, so the new sync
// keeps every entry it cannot attribute. The update knows which names are the framework's, so it removes
// the mirror of a framework skill the project no longer has, and nothing of the project's.
test('the update removes the mirror of a framework skill upstream retired, and keeps every mirror the project owns', t => {
    const f = fixture(t);
    for (const root of [f.upstream, f.project]) {
        f.write(root, '.claude/skills/retired-skill/SKILL.md', 'framework skill\n');
        f.write(root, '.claude/skills/edited-skill/SKILL.md', 'framework skill\n');
    }
    const base = f.commit(f.upstream, 'v1 with skills');
    f.write(f.project, '.claude/skills/edited-skill/SKILL.md', 'framework skill, edited by the project\n');
    f.write(f.project, '.agents/skills/retired-skill/SKILL.md', 'mirror of the retired skill\n');
    f.write(f.project, '.agents/skills/edited-skill/SKILL.md', 'mirror of the edited skill\n');
    f.write(f.project, '.agents/skills/codex-only/SKILL.md', 'written for Codex only\n');
    f.write(f.project, '.agents/skills/.codex-mirror.json', '{"managedBy":"codex-sync","source":".claude/skills"}\n');
    f.commit(f.project, 'install v1, edit a skill, add a Codex-only skill');
    fs.rmSync(path.join(f.upstream, '.claude/skills'), { recursive: true });
    f.commit(f.upstream, 'v2 retires both skills');

    // The edited skill stays in the project (a conflict to settle), so 2.
    assert.equal(f.run(`--base=${base}`), 2);
    assert.equal(f.read(f.project, '.claude/skills/retired-skill/SKILL.md'), null, 'the unchanged framework skill is deleted');
    assert.equal(f.read(f.project, '.agents/skills/retired-skill/SKILL.md'), null, 'and so is its mirror');
    assert.equal(f.read(f.project, '.agents/skills/edited-skill/SKILL.md'), 'mirror of the edited skill\n', 'a skill the project kept keeps its mirror');
    assert.equal(f.read(f.project, '.agents/skills/codex-only/SKILL.md'), 'written for Codex only\n', 'the project\'s Codex-only skill stays');
    assert.ok(fs.existsSync(path.join(f.project, '.agents/skills/.codex-mirror.json')), 'the sync marker stays');
});

test('--project updates another folder from a blobless bare clone, fetching file contents in batches', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    const v2 = f.commit(f.upstream, 'v2');
    git(f.upstream, 'config', 'uploadpack.allowFilter', 'true');
    git(f.upstream, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
    const clone = path.join(f.dir, 'clone.git');
    git(f.dir, 'clone', '--quiet', '--bare', '--filter=blob:none', url.pathToFileURL(f.upstream).href, clone);
    assert.equal(git(clone, 'config', '--get', 'remote.origin.promisor'), 'true', 'a blobless clone: file contents download on demand');
    assert.equal(prefetchBlobs(clone, [f.base, v2]), 6, 'every .claude file of both versions arrives in one batch');
    assert.equal(prefetchBlobs(clone, [f.base, v2]), 0, 'nothing is downloaded twice');
    assert.equal(main([clone, `--project=${f.project}`, `--base=${f.base}`, '--no-sync', '--source-url=https://example.test/easy-claude.git'], '/nonexistent'), 0);
    assert.equal(f.read(f.project, '.claude/hooks/a.cjs'), 'one\ntwo (v2)\nthree\n');
    const lock = JSON.parse(f.read(f.project, LOCK_PATH));
    assert.deepEqual([lock.source.commit, lock.source.url], [v2, 'https://example.test/easy-claude.git']);
});

test('a skill upstream deleted leaves no empty folder behind, while a folder that still holds project files stays', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/skills/retired/SKILL.md', 'old skill\n');
    f.write(f.upstream, '.claude/skills/retired/references/guide.md', 'old guide\n');
    f.write(f.upstream, '.claude/skills/shared-dir/SKILL.md', 'old shared\n');
    const v2 = f.commit(f.upstream, 'v2 adds two skills');
    assert.equal(f.run(`--base=${f.base}`, `--ref=${v2}`), 0);
    f.write(f.project, '.claude/skills/shared-dir/project-notes.md', 'project file\n');
    f.commit(f.project, 'take v2 and add a project file');
    fs.rmSync(path.join(f.upstream, '.claude/skills/retired'), { recursive: true });
    fs.rmSync(path.join(f.upstream, '.claude/skills/shared-dir'), { recursive: true });
    f.commit(f.upstream, 'v3 retires both');
    assert.equal(f.run(), 0);
    assert.equal(fs.existsSync(path.join(f.project, '.claude/skills/retired')), false, 'the emptied skill folder is gone');
    assert.equal(f.read(f.project, '.claude/skills/shared-dir/project-notes.md'), 'project file\n', 'a folder holding a project file stays');
    assert.equal(fs.existsSync(path.join(f.project, '.claude/skills')), true);
});

const PYTHON = [['python3', []], ['py', ['-3']], ['python', []]].find(([cmd, args]) => spawnSync(cmd, [...args, '--version']).status === 0);

test('every .claude doc with count markers is recounted, including docs the update left as they were', { skip: PYTHON ? false : 'needs Python 3' }, t => {
    const f = fixture(t);
    // Stub catalog scripts (project-only files) that log each call instead of counting.
    const stub = "import sys, pathlib\npathlib.Path('tmp').mkdir(exist_ok=True)\nwith open('tmp/regen.log', 'a') as log: log.write(' '.join(sys.argv[1:]) + '\\n')\n";
    f.write(f.project, '.claude/scripts/generate_catalogs.py', stub);
    f.write(f.project, '.claude/scripts/scan_skills.py', stub);
    f.write(f.project, '.claude/skills/own/SKILL.md', 'project skill: <!-- COUNT:skills -->10<!-- /COUNT -->\n');
    f.commit(f.project, 'project skill and stubs');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.commit(f.upstream, 'v2 leaves the README as it was');
    assert.equal(f.run(`--base=${f.base}`), 0);
    const calls = f.read(f.project, 'tmp/regen.log').trim().split('\n');
    assert.ok(calls.includes('--inject-counts .claude/docs/README.md'), `an unchanged framework doc is recounted: ${calls.join(' | ')}`);
    assert.ok(calls.includes('--inject-counts .claude/skills/own/SKILL.md'), 'a project doc with markers is recounted');
    assert.ok(calls.includes('--skills --output .claude/SKILLS.yaml'), 'the catalog is rebuilt');
    fs.rmSync(path.join(f.project, 'tmp/regen.log'));
    assert.equal(main(['--regenerate', `--project=${f.project}`], '/nonexistent'), 0, '--regenerate needs no upstream');
    assert.ok(f.read(f.project, 'tmp/regen.log').includes('--inject-counts .claude/docs/README.md'));
});

test('--base=auto breaks a tie toward the older commit, so a file only the newer one added is still installed', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/added.cjs', 'added in v2\n');
    f.commit(f.upstream, 'v2 only adds a file the hand-copied project lacks');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v3)\nthree\n');
    f.commit(f.upstream, 'v3');
    // The project holds v1 exactly: v1 and v2 match it equally well.
    const plan = planUpdate({ project: f.project, upstream: f.upstream, base: 'auto' });
    assert.equal(plan.baseDetection.commit, f.base, 'the older of the tied commits is the base');
    assert.equal(plan.actions.find(a => a.path === '.claude/hooks/added.cjs').kind, 'take', 'a newer tied base would read the missing file as a project deletion');
});

test('--base=auto matches files committed with CRLF line endings', t => {
    const f = fixture(t);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    const v2 = f.commit(f.upstream, 'v2');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha\nbeta (v3)\ngamma\n');
    f.commit(f.upstream, 'v3');
    for (const [file, text] of Object.entries({ '.claude/hooks/a.cjs': 'one\ntwo (v2)\nthree\n', '.claude/hooks/b.cjs': 'alpha\nbeta\ngamma\n', '.claude/hooks/gone.cjs': 'old\n' })) {
        f.write(f.project, file, text.replace(/\n/g, '\r\n'));
    }
    git(f.project, '-c', 'core.autocrlf=false', 'add', '-A');
    git(f.project, '-c', 'core.autocrlf=false', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'v2 copied with CRLF');
    assert.equal(planUpdate({ project: f.project, upstream: f.upstream, base: 'auto' }).baseDetection.commit, v2);
});

test("conflict markers have the documented two-sided form whatever the user's merge.conflictStyle", t => {
    const f = fixture(t);
    const config = path.join(f.dir, 'gitconfig');
    fs.writeFileSync(config, '[merge]\n\tconflictStyle = zdiff3\n');
    const previous = process.env.GIT_CONFIG_GLOBAL;
    process.env.GIT_CONFIG_GLOBAL = config;
    t.after(() => { if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previous; });
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project)\nbeta\ngamma\n');
    f.commit(f.project, 'project change');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha (upstream)\nbeta\ngamma\n');
    f.commit(f.upstream, 'v2');
    assert.equal(f.run(`--base=${f.base}`), 2);
    const text = f.read(f.project, '.claude/hooks/b.cjs');
    assert.match(text, /^<<<<<<< project$/m);
    assert.doesNotMatch(text, /^\|\|\|\|\|\|\|/m, 'no base section the merge guide does not describe');
});

test('a framework folder that is a symlink out of the project stops the update before anything is written', t => {
    const f = fixture(t);
    const outside = path.join(f.dir, 'shared-hooks');
    fs.cpSync(path.join(f.project, '.claude/hooks'), outside, { recursive: true });
    fs.rmSync(path.join(f.project, '.claude/hooks'), { recursive: true });
    try { fs.symlinkSync(outside, path.join(f.project, '.claude/hooks'), 'dir'); } catch { t.skip('symlinks unavailable'); return; }
    f.commit(f.project, 'hooks shared through a symlink');
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.commit(f.upstream, 'v2');
    assert.throws(() => f.run(`--base=${f.base}`), /outside the project/);
    assert.equal(fs.readFileSync(path.join(outside, 'a.cjs'), 'utf8'), 'one\ntwo\nthree\n', 'the shared folder is untouched');
    assert.equal(f.read(f.project, LOCK_PATH), null, 'nothing was written');
});

test('a dangling symlink inside .claude is refused too, so a write never creates its target outside the project', t => {
    const f = fixture(t);
    // A path upstream is about to add holds a link to a missing file outside the project.
    const outside = path.join(f.dir, 'elsewhere.cjs');
    try { fs.symlinkSync(outside, path.join(f.project, '.claude/hooks/new.cjs')); } catch { t.skip('symlinks unavailable'); return; }
    f.commit(f.project, 'a link to a missing file');
    f.write(f.upstream, '.claude/hooks/new.cjs', 'new in v2\n');
    f.commit(f.upstream, 'v2 adds new.cjs');
    assert.throws(() => f.run(`--base=${f.base}`), /outside the project/);
    assert.equal(fs.existsSync(outside), false, 'nothing was created outside the project');
});
