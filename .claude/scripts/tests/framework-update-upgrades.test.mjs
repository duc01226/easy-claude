// framework-update.mjs upgrade entries: after an update the project's agent is told every upgrade action
// or notice it has not resolved yet, whatever path wrote the lock, and never one it already resolved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseUpgradeEntry, orderUpgrades, pendingUpgrades, mergeNotesFor, LOCK_PATH } from '../framework-update.mjs';

const ENGINE = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'framework-update.mjs');
const DIR = '.claude/upgrades/actions';
// A done or applicability check that looks at the project the way a real one would: does a file exist?
const exists = file => ['node', '-e', `process.exit(require('fs').existsSync(${JSON.stringify(file)}) ? 0 : 1)`];
// An applicability check: exit 0 when the action applies, 3 (the reserved code) when it does not.
const appliesIf = file => ['node', '-e', `process.exit(require('fs').existsSync(${JSON.stringify(file)}) ? 0 : 3)`];

const git = (cwd, ...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};

function action(id, { level = 'required', after = [], applies, done, writesState, added = '2026-11-16', mergeNotes = [] } = {}) {
    return [
        '---',
        `id: ${id}`,
        'kind: action',
        `title: Do ${id}`,
        `added: ${added}`,
        `level: ${level}`,
        ...(after.length ? ['after:', ...after.map(dep => `  - ${dep}`)] : []),
        ...(applies ? [`applies: ${JSON.stringify(applies)}`] : []),
        ...(done ? [`done: ${JSON.stringify(done)}`] : []),
        ...(writesState ? ['writesState: true'] : []),
        ...(mergeNotes.length ? ['mergeNotes:', ...mergeNotes.map(note => `  - ${note}`)] : []),
        '---',
        '',
        `Why ${id} exists.`,
        '',
        '## Steps',
        '',
        `1. Run \`/project-config\` to set up ${id} (consent: yes).`,
        ''
    ].join('\n');
}

const notice = (id, added = '2026-11-16') => `---\nid: ${id}\nkind: notice\ntitle: About ${id}\nadded: ${added}\n---\n\nTell the user about ${id}.\n`;

function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-upgrades-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const upstream = path.join(dir, 'upstream');
    const project = path.join(dir, 'project');
    const write = (root, file, text) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), text);
    };
    const remove = (root, file) => fs.rmSync(path.join(root, file), { force: true });
    const read = (root, file) => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : null);
    const commit = (root, message) => {
        git(root, 'add', '-A');
        git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', message);
        return git(root, 'rev-parse', 'HEAD');
    };
    for (const root of [upstream, project]) {
        fs.mkdirSync(root, { recursive: true });
        git(root, 'init', '-q');
    }
    const v1 = { '.claude/hooks/a.cjs': 'one\ntwo\nthree\n', '.claude/hooks/b.cjs': 'alpha\nbeta\ngamma\n' };
    for (const [file, text] of Object.entries(v1)) {
        write(upstream, file, text);
        write(project, file, text);
    }
    const base = commit(upstream, 'v1');
    commit(project, 'install v1');
    /** Run the engine as a process, the way the wrapper does; `json` parses the report. */
    const run = (...args) => {
        const result = spawnSync(process.execPath, [ENGINE, ...args, `--project=${project}`], { cwd: project, encoding: 'utf8' });
        return { code: result.status, out: result.stdout, err: result.stderr };
    };
    const update = (...args) => run(upstream, '--no-sync', ...args);
    const json = (...args) => {
        const result = run(...args, '--json');
        assert.notEqual(result.code, 1, result.err);
        return JSON.parse(result.out);
    };
    const lock = () => JSON.parse(read(project, LOCK_PATH));
    const ids = report => report.upgrades.pending.map(entry => entry.id);
    return { dir, upstream, project, write, remove, read, commit, base, run, update, json, lock, ids };
}

test('two successive updates: an action left unfinished is listed again with the new ones, a resolved one never [TC-FWU-002]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/first.md`, action('first'));
    f.write(f.upstream, `${DIR}/second.md`, action('second'));
    f.commit(f.upstream, 'v2 with two actions');
    const one = f.update(`--base=${f.base}`);
    assert.equal(one.code, 0, one.err);
    assert.match(one.out, /NEXT 2 upgrade entries to handle/);
    assert.match(one.out, /first \[action, required\][\s\S]*second \[action, required\]/);
    assert.match(one.out, /--mark=<id> --status=done\|not-applicable\|declined\|failed/, 'the block says how to record each entry');
    assert.equal(f.run('--mark=first', '--status=done').code, 0);
    f.commit(f.project, 'take v2; first done; second left unfinished');
    f.write(f.upstream, `${DIR}/third.md`, action('third', { added: '2026-11-17' }));
    f.commit(f.upstream, 'v3 with a third action');
    const report = f.json(f.upstream, '--no-sync');
    assert.deepEqual(f.ids(report), ['second', 'third'], 'the unfinished action carries forward; the done one is not asked again');
    assert.equal(f.lock().upgrades.first.status, 'done', 'the next lock keeps the resolution');
});

test('record-only and a working-tree lock list and keep the same pending entries as a merge [TC-FWU-003]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/fill.md`, action('fill'));
    const v2 = f.commit(f.upstream, 'v2');
    f.write(f.project, `${DIR}/fill.md`, action('fill'));
    f.commit(f.project, 'hand sync of v2');
    const recorded = f.json(f.upstream, '--record-only', `--ref=${v2}`, `--base=${f.base}`);
    assert.deepEqual(f.ids(recorded), ['fill'], 'record-only lists what the hand sync brought');
    assert.equal(f.run('--mark=fill', '--status=declined', '--reason=the team configures this itself').code, 0);
    const again = f.json(f.upstream, '--record-only', `--ref=${v2}`, '--allow-dirty-project');
    assert.deepEqual(f.ids(again), [], 'record-only on an existing lock keeps the decision');
    assert.equal(f.lock().upgrades.fill.status, 'declined');
    f.commit(f.project, 'record v2');
    f.write(f.upstream, `${DIR}/later.md`, notice('later'));
    const tree = f.json(f.upstream, '--no-sync', '--working-tree');
    assert.deepEqual(f.ids(tree), ['later'], 'a working-tree update lists only the new entry');
    assert.equal(f.lock().source.workingTree, true);
    assert.equal(f.lock().upgrades.fill.status, 'declined', 'the working-tree lock keeps the earlier decision');
    assert.equal(f.lock().upgrades.fill.reason, 'the team configures this itself');
});

test('a project already current still lists the entries it has not resolved [TC-FWU-003]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/fill.md`, action('fill'));
    f.commit(f.upstream, 'v2');
    assert.equal(f.update(`--base=${f.base}`).code, 0);
    f.commit(f.project, 'take v2, leave the action for later');
    const again = f.json(f.upstream, '--no-sync');
    assert.equal(again.taken + again.merged + again.deleted, 0, 'nothing left to merge');
    assert.deepEqual(f.ids(again), ['fill'], 'the open action is listed although the files are current');
});

test('a lock written by an engine without upgrade entries lists every entry again, and a done check skips the finished ones [TC-FWU-007]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/init-state.md`, action('init-state', { done: exists('state.txt'), writesState: true }));
    f.write(f.upstream, `${DIR}/fill.md`, action('fill'));
    f.commit(f.upstream, 'v2');
    assert.equal(f.update(`--base=${f.base}`).code, 0);
    f.write(f.project, 'state.txt', 'baseline\n');
    assert.equal(f.run('--mark=init-state', '--status=done').code, 0);
    assert.equal(f.run('--mark=fill', '--status=done').code, 0);
    // An older engine (--engine=local before upgrade entries) rewrites the lock without them.
    const old = f.lock();
    delete old.upgrades;
    f.write(f.project, LOCK_PATH, `${JSON.stringify(old, null, 2)}\n`);
    f.commit(f.project, 'v2 taken, then an old engine rewrote the lock');
    f.commit(f.upstream, 'v3 changes nothing');
    const report = f.json(f.upstream, '--no-sync');
    assert.deepEqual(f.ids(report), ['fill'], 'only the action without a done check is asked again');
    assert.deepEqual(
        report.upgrades.settled.map(item => [item.id, item.status]),
        [['init-state', 'done']],
        'the state-writing action is recorded done by its check'
    );
    assert.equal(f.read(f.project, 'state.txt'), 'baseline\n', 'the done check left the state alone');
});

test('a first update without a lock resolves the entries its base already had and lists the newer ones [TC-FWU-004]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/old-action.md`, action('old-action'));
    f.write(f.upstream, `${DIR}/old-notice.md`, notice('old-notice'));
    const v2 = f.commit(f.upstream, 'v2: the version the project copied by hand');
    f.write(f.project, `${DIR}/old-action.md`, action('old-action'));
    f.write(f.project, `${DIR}/old-notice.md`, notice('old-notice'));
    f.commit(f.project, 'copy v2 by hand, no lock');
    f.write(f.upstream, `${DIR}/new-action.md`, action('new-action', { added: '2026-11-18' }));
    f.commit(f.upstream, 'v3');
    const report = f.json(f.upstream, '--no-sync', '--base=auto');
    assert.equal(report.base, v2, 'auto found the copied version');
    assert.deepEqual(f.ids(report), ['new-action'], 'only the entry added after the base is pending');
    const records = f.lock().upgrades;
    assert.equal(records['old-action'].status, 'not-applicable');
    assert.match(records['old-action'].reason, /^predates the base [0-9a-f]{10}$/);
    assert.equal(records['old-notice'].status, 'not-applicable');
});

test('without a lock, --record-only needs an explicit --base; with it the entries added since then stay pending [TC-FWU-005]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/at-base.md`, notice('at-base'));
    const v2 = f.commit(f.upstream, 'v2');
    f.write(f.upstream, `${DIR}/after-base.md`, action('after-base'));
    const v3 = f.commit(f.upstream, 'v3');
    for (const [file, text] of [
        [`${DIR}/at-base.md`, notice('at-base')],
        [`${DIR}/after-base.md`, action('after-base')]
    ])
        f.write(f.project, file, text);
    f.commit(f.project, 'hand sync of v3');
    const missing = f.run(f.upstream, '--record-only', `--ref=${v3}`);
    assert.equal(missing.code, 1);
    assert.match(missing.err, /--record-only needs --base=<the upstream commit this project held before the hand sync>/);
    assert.equal(f.read(f.project, LOCK_PATH), null, 'nothing recorded');
    assert.match(f.run(f.upstream, '--record-only', `--ref=${v3}`, '--base=auto').err, /--base=auto cannot find it/);
    const report = f.json(f.upstream, '--record-only', `--ref=${v3}`, `--base=${v2}`);
    assert.deepEqual(f.ids(report), ['after-base']);
    assert.equal(f.lock().upgrades['at-base'].status, 'not-applicable');
});

test('conflicts defer the list: a pointer and the merge notes of the conflicted files, then the full list once resolved [TC-FWU-006]', t => {
    const f = fixture(t);
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project)\nbeta\ngamma\n');
    f.commit(f.project, 'project edit');
    f.write(f.upstream, '.claude/hooks/b.cjs', 'alpha (upstream)\nbeta\ngamma\n');
    f.write(f.upstream, `${DIR}/fill.md`, action('fill', { mergeNotes: ['.claude/hooks/*.cjs: keep the project fix on the first line'] }));
    f.write(f.upstream, `${DIR}/heads-up.md`, notice('heads-up'));
    f.write(f.upstream, `${DIR}/ready.md`, action('ready', { done: exists('.claude/hooks/a.cjs') }));
    f.commit(f.upstream, 'v2');
    const stopped = f.update(`--base=${f.base}`);
    assert.equal(stopped.code, 2);
    assert.match(stopped.out, /MERGE-NOTE \.claude\/hooks\/b\.cjs \(fill\): keep the project fix on the first line/);
    assert.match(
        stopped.out,
        /NEXT 3 upgrade entries pending\. After settling what stopped the update \(conflicts or mirror clashes\) and running the sync, list them with: node \.claude\/scripts\/framework-update\.mjs --list-upgrades/
    );
    assert.doesNotMatch(stopped.out, /to handle, in this order/, 'the full list waits until the files are final');
    assert.doesNotMatch(stopped.out, /SETTLED/, 'no check judges a project with conflicts left');
    assert.equal(f.lock().upgrades.ready, undefined);
    f.write(f.project, '.claude/hooks/b.cjs', 'alpha (project and upstream)\nbeta\ngamma\n');
    const lockBefore = f.read(f.project, LOCK_PATH);
    const preview = f.run('--list-upgrades', '--dry-run');
    assert.match(preview.out, /NEXT 3 upgrade entries to handle/);
    assert.equal(f.read(f.project, LOCK_PATH), lockBefore, 'a dry run runs no check and writes nothing');
    const listed = f.run('--list-upgrades');
    assert.equal(listed.code, 0, listed.err);
    assert.match(listed.out, /SETTLED ready: done \(done check passed\)/);
    assert.match(listed.out, /NEXT 2 upgrade entries to handle[\s\S]*fill \[action, required\][\s\S]*heads-up \[notice\]/);
});

test('checks settle what they can: a done check passes, an applicability check fails, a failed action stays pending with its reason [TC-FWU-007]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/baseline.md`, action('baseline', { done: exists('baseline.json'), writesState: true }));
    f.write(f.upstream, `${DIR}/needs-config.md`, action('needs-config', { applies: appliesIf('docs/project-config.json') }));
    f.write(f.upstream, `${DIR}/install.md`, action('install'));
    // A check that crashes (exit 1) must not drop a required action as not applicable.
    f.write(f.upstream, `${DIR}/crashes.md`, action('crashes', { applies: ['node', '-e', 'throw new Error("broken check")'] }));
    // Checked only once its prerequisite is resolved: until then the project is not ready to be judged.
    f.write(f.upstream, `${DIR}/after-install.md`, action('after-install', { after: ['install'], applies: appliesIf('never-there') }));
    f.commit(f.upstream, 'v2');
    f.write(f.project, 'baseline.json', '{}\n');
    f.commit(f.project, 'the project already has a baseline');
    const first = f.json(f.upstream, '--no-sync', `--base=${f.base}`);
    assert.deepEqual(f.ids(first), ['crashes', 'install', 'after-install']);
    assert.deepEqual(first.upgrades.settled.map(item => `${item.id}:${item.status}`).sort(), ['baseline:done', 'needs-config:not-applicable']);
    assert.deepEqual(first.upgrades.notRun, ['crashes: applies check did not run (exited 1)']);
    const failed = f.run('--mark=install', '--status=failed', '--reason=npm registry unreachable');
    assert.equal(failed.code, 0, failed.err);
    assert.match(failed.out, /3 upgrade entries still pending: crashes, install, after-install/, 'failed is recorded but not resolved');
    const listed = f.run('--list-upgrades');
    assert.match(listed.out, /install \[action, required\][\s\S]*last attempt failed: npm registry unreachable/);
    assert.match(f.run('--mark=install', '--status=declined').err, /needs --reason=/, 'a decline says why');
    assert.match(f.run('--mark=nope', '--status=done').err, /No upgrade entry nope/);
    assert.match(f.run('--mark=install', '--status=done', '--dry-run').err, /--mark records an outcome in the lock; it has no dry run/);
    assert.equal(f.lock().upgrades['after-install'], undefined, 'not checked while install is pending');
    assert.equal(f.run('--mark=install', '--status=done').code, 0);
    assert.match(f.run('--list-upgrades').out, /SETTLED after-install: not-applicable/, 'checked once its prerequisite is resolved');
});

test('actions run in the order their "after" lists give, oldest first otherwise [TC-FWU-008]', () => {
    const entry = (id, added, after = []) => ({ id, added, after, kind: 'action' });
    const ordered = orderUpgrades([entry('baseline', '2026-11-16', ['commands']), entry('commands', '2026-11-17'), entry('notice', '2026-11-15')]);
    assert.deepEqual(
        ordered.map(item => item.id),
        ['notice', 'commands', 'baseline']
    );
    const pending = pendingUpgrades([entry('baseline', '2026-11-16', ['commands']), entry('commands', '2026-11-17')], {
        commands: { status: 'failed', reason: 'x' }
    });
    assert.deepEqual(pending[1].waitsFor, ['commands'], 'a failed prerequisite still holds its dependent back');
    const resolved = pendingUpgrades([entry('baseline', '2026-11-16', ['commands']), entry('commands', '2026-11-17')], { commands: { status: 'declined' } });
    assert.deepEqual(resolved[0].waitsFor, [], 'a resolved prerequisite releases it');
    const cycle = orderUpgrades([entry('a', '2026-11-16', ['b']), entry('b', '2026-11-16', ['a'])]);
    assert.deepEqual(
        cycle.map(item => [item.id, item.cycle]),
        [
            ['a', true],
            ['b', true]
        ]
    );
});

test('the parser rejects an entry that would leave the agent guessing, and says how to fix it [TC-FWU-009]', () => {
    const file = `${DIR}/fill.md`;
    assert.equal(parseUpgradeEntry(action('fill'), file).steps[0].consent, true);
    const cases = [
        [action('fill').replace('kind: action', 'kind: task'), /kind must be action or notice/],
        [action('other'), /id other must match the file name fill\.md/],
        [action('fill').replace('level: required', 'level: urgent'), /level must be one of required, recommended, optional/],
        [action('fill').replace(' (consent: yes)', ''), /step 1 must name its skill or command in backticks and end with \(consent: yes\) or \(consent: no\)/],
        [action('fill').replace('## Steps', '## Notes'), /an action needs a "## Steps" section/],
        [action('fill', { done: ['npm', 'test'] }), /done must be an argv array that starts with "node" or "git"/],
        [action('fill').replace('level: required', 'level: required\nwritesState: true'), /an action that writes state needs a done check/],
        [action('fill').replace('level: required', 'level: required\nmergenotes: x'), /mergenotes is not a field of an action/],
        [notice('fill').replace('Tell the user about fill.\n', ''), /a notice needs a body/],
        [notice('fill').replace('kind: notice', 'kind: notice\nlevel: required'), /level is not a field of a notice/],
        [action('fill').replace('added: 2026-11-16', 'added: soon'), /added must be a date, YYYY-MM-DD/],
        [action('fill').replace('level: required', 'level: required\ncovers:\n  - skills'), /covers must be a list of surface@hash values/],
        [action('fill').replace('level: required', 'level: required\nmergeNotes:\n  - hooks/a.cjs keep it'), /mergeNotes must be a list of/],
        [action('fill', { mergeNotes: ['.claude/**/x/**/y.cjs: keep it'] }), /with at most one \*\* and four \* in the path/],
        [action('fill', { mergeNotes: ['.claude/*a*b*c*d*e.cjs: keep it'] }), /with at most one \*\* and four \* in the path/],
        ['no frontmatter', /no frontmatter/]
    ];
    for (const [text, message] of cases) assert.throws(() => parseUpgradeEntry(text, file), message);
    assert.deepEqual(
        mergeNotesFor(
            [parseUpgradeEntry(action('fill', { mergeNotes: ['.claude/hooks/**/x.cjs: keep it'] }), file)],
            ['.claude/hooks/x.cjs', '.claude/hooks/lib/deep/x.cjs', '.claude/other/x.cjs']
        ).map(note => note.path),
        ['.claude/hooks/x.cjs', '.claude/hooks/lib/deep/x.cjs']
    );
});

test('an entry that cannot be read is still listed, so nothing is silently dropped [TC-FWU-009]', t => {
    const f = fixture(t);
    f.write(f.upstream, `${DIR}/broken.md`, 'not an entry\n');
    f.commit(f.upstream, 'v2');
    const result = f.update(`--base=${f.base}`);
    assert.equal(result.code, 0, result.err);
    assert.match(result.out, /broken \[cannot be read\] .*no frontmatter/);
});

test('the engine copied alone, as the wrapper runs it, parses entries and prints the NEXT block [TC-FWU-001]', t => {
    const f = fixture(t);
    const alone = path.join(f.dir, 'engine-only', 'framework-update.mjs');
    fs.mkdirSync(path.dirname(alone), { recursive: true });
    fs.copyFileSync(ENGINE, alone);
    f.write(f.upstream, `${DIR}/fill.md`, action('fill'));
    f.commit(f.upstream, 'v2');
    const result = spawnSync(process.execPath, [alone, f.upstream, '--no-sync', `--base=${f.base}`, `--project=${f.project}`], {
        cwd: f.dir,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /NEXT 1 upgrade entry to handle[\s\S]*fill \[action, required\] Do fill \(\.claude\/upgrades\/actions\/fill\.md\)/);
    const listed = spawnSync(process.execPath, [alone, '--list-upgrades', `--project=${f.project}`], { cwd: f.dir, encoding: 'utf8' });
    assert.equal(listed.status, 0, listed.stderr);
    assert.match(listed.stdout, /fill \[action, required\]/);
});

test('with nothing pending the NEXT block says so, and the list and mark commands need a lock [TC-FWU-001]', t => {
    const f = fixture(t);
    assert.match(f.run('--list-upgrades').err, /No \.claude\/framework-lock\.json: run a framework update first/);
    f.write(f.upstream, '.claude/hooks/a.cjs', 'one\ntwo (v2)\nthree\n');
    f.commit(f.upstream, 'v2 without entries');
    assert.match(f.update(`--base=${f.base}`).out, /NEXT no upgrade actions or notices pending\./);
    assert.match(f.run('--status=done').err, /--status and --reason go with --mark=<id>/);
});

test('the update guidance sends every update to its upgrade entries, with consent and recorded outcomes [TC-FWU-010]', () => {
    const skill = path.join(path.dirname(ENGINE), '..', 'skills', 'framework-update');
    const body = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
    const reference = fs.readFileSync(path.join(skill, 'references', 'upgrade-actions.md'), 'utf8');
    assert.match(body, /### 7\. Upgrade entries/, 'the skill has the step');
    assert.match(body, /already current\. Say so, then go to step 7/, 'an already current project still reaches the entries');
    assert.match(body, /references\/upgrade-actions\.md/);
    assert.match(reference, /Handle the entries only inside the update the user asked for/);
    assert.match(reference, /Ask the user before every step marked `\(consent: yes\)`/);
    assert.match(reference, /Record every entry, whatever happened/);
    for (const status of ['done', 'not-applicable', 'declined', 'failed']) assert.match(reference, new RegExp(`--status=${status}`));
});

test('an entry as a Markdown formatter leaves it parses: a long list wrapped over lines with a trailing comma [TC-FWU-009]', () => {
    // The shape Prettier's default settings give a long `applies:` list in frontmatter (wrapped, trailing comma).
    const wrapped = [
        '---',
        'id: fill',
        'kind: action',
        'title: Fill the new fields',
        'added: 2026-11-17',
        'level: required',
        'applies:',
        '  [',
        '    "node",',
        '    "-e",',
        `    "process.exit(require('fs').existsSync('docs/project-config.json') ? 0 : 3)",`,
        '  ]',
        'covers:',
        '  - config:testing@0123456789ab',
        '---',
        '',
        '## Steps',
        '',
        '1. Run `/project-config` (consent: yes).',
        ''
    ].join('\n');
    const entry = parseUpgradeEntry(wrapped, `${DIR}/fill.md`);
    assert.deepEqual(entry.applies, ['node', '-e', "process.exit(require('fs').existsSync('docs/project-config.json') ? 0 : 3)"]);
    assert.deepEqual(entry.covers, ['config:testing@0123456789ab'], 'the next key is read normally');
    const comma = parseUpgradeEntry(wrapped.replace('"-e",', '"keep, ]",'), `${DIR}/fill.md`);
    assert.equal(comma.applies[1], 'keep, ]', 'a comma inside a value is kept');
    assert.equal(entry.level, 'required');
});

test("an entry saved through this repository's Prettier settings parses: single-quoted values, indented list items [TC-FWU-009]", () => {
    // Exact output of `prettier --write` on an entry under .claude/upgrades/actions/ with this repo's .prettierrc.
    const formatted = [
        '---',
        'id: fill',
        'kind: action',
        'title: Fill the new fields',
        'added: 2026-11-17',
        'level: required',
        `applies: ['node', '-e', 'process.exit(require("fs").existsSync("docs/project-config.json") ? 0 : 3)', "it's"]`,
        'covers:',
        "    - 'config:testing@0123456789ab'",
        '---',
        '',
        '## Steps',
        '',
        '1. Run `/project-config` (consent: yes).',
        ''
    ].join('\n');
    const entry = parseUpgradeEntry(formatted, `${DIR}/fill.md`);
    assert.deepEqual(entry.applies, ['node', '-e', 'process.exit(require("fs").existsSync("docs/project-config.json") ? 0 : 3)', "it's"]);
    assert.deepEqual(entry.covers, ['config:testing@0123456789ab']);
    const escaped = parseUpgradeEntry(formatted.replace(`"it's"`, `'it''s'`), `${DIR}/fill.md`);
    assert.equal(escaped.applies[3], "it's", 'a doubled single quote is one quote');
});
