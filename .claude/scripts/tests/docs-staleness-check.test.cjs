'use strict';

// Docs-staleness check (US-PCI-05, BR-PCI-10): a pull request that can make a project doc stale
// either updates that doc, records that docs-manager verified it fresh for this exact change, or
// carries a bypass the user asked for; otherwise the check fails and names the doc and the fix.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate, staleMessage, parseArgs, changeFingerprint } = require('../docs-staleness-check.cjs');

const SCRIPT = path.resolve(__dirname, '..', 'docs-staleness-check.cjs');
const MAP_DOC = 'docs/project-reference/feature-map-reference.md';

function mappedDoc(doc, changedFiles, extra = {}) {
    return {
        doc,
        exists: true,
        heuristicOnly: false,
        reasons: ['a featureMap.sources file changed'],
        changedFiles,
        scanTarget: 'scan --target=feature-map',
        ...extra
    };
}

test('TC-PCI-091: an impacted doc this change does not update fails, naming the doc, the change and the fix', () => {
    const rows = [{ status: 'A', file: 'app/admin/users/page.tsx' }];
    const result = evaluate({ rows, mapped: { docs: [mappedDoc(MAP_DOC, ['app/admin/users/page.tsx'])] }, record: null, fingerprint: 'f1' });
    assert.equal(result.status, 'FAIL');
    assert.deepEqual(
        result.stale.map(item => item.doc),
        [MAP_DOC]
    );
    const message = staleMessage(result.stale[0]);
    assert.match(message, /^docs\/project-reference\/feature-map-reference\.md may be stale: a featureMap\.sources file changed\./);
    assert.match(message, /Changed: app\/admin\/users\/page\.tsx\./);
    assert.match(message, /run \/docs-manager --mode=update over this change, or update docs\/project-reference\/feature-map-reference\.md yourself/);
    assert.match(message, /its owner is \/scan --target=feature-map/);
});

test('TC-PCI-091: a doc updated in the same change passes; a deletion of the doc is not an update', () => {
    const changed = ['app/admin/users/page.tsx'];
    const updated = evaluate({
        rows: [
            { status: 'A', file: changed[0] },
            { status: 'M', file: MAP_DOC }
        ],
        mapped: { docs: [mappedDoc(MAP_DOC, changed)] },
        record: null,
        fingerprint: 'f1'
    });
    assert.equal(updated.status, 'PASS');
    assert.deepEqual(updated.passed, [{ doc: MAP_DOC, how: 'updated in this change' }]);

    const deleted = evaluate({
        rows: [
            { status: 'A', file: changed[0] },
            { status: 'D', file: MAP_DOC }
        ],
        mapped: { docs: [mappedDoc(MAP_DOC, changed)] },
        record: null,
        fingerprint: 'f1'
    });
    assert.equal(deleted.status, 'FAIL');
});

test('TC-PCI-091: no impacted doc, a heuristic-only route and a doc that does not exist all pass', () => {
    const rows = [{ status: 'M', file: 'notes/todo.txt' }];
    assert.equal(evaluate({ rows, mapped: { docs: [] }, record: null, fingerprint: 'f' }).status, 'PASS');
    const guesses = evaluate({
        rows,
        mapped: {
            docs: [
                mappedDoc('docs/project-reference/domain-entities-reference.md', ['src/entities/user.ts'], { heuristicOnly: true }),
                mappedDoc(MAP_DOC, ['x'], { exists: false })
            ]
        },
        record: null,
        fingerprint: 'f'
    });
    assert.equal(guesses.status, 'PASS');
    assert.equal(guesses.checked, 0, 'only existing docs on a configured route are held to the check');
});

test('TC-PCI-092: a verified-fresh record counts only for the exact change it was made for', () => {
    const rows = [{ status: 'A', file: 'app/admin/users/page.tsx' }];
    const mapped = { docs: [mappedDoc(MAP_DOC, ['app/admin/users/page.tsx'])] };
    const record = { fingerprint: 'f1', fresh: [MAP_DOC] };
    const current = evaluate({ rows, mapped, record, fingerprint: 'f1' });
    assert.equal(current.status, 'PASS');
    assert.equal(current.passed[0].how, 'verified fresh by docs-manager for this change');
    assert.equal(evaluate({ rows, mapped, record, fingerprint: 'f2' }).status, 'FAIL', 'a later edit voids the record');
});

test('TC-PCI-092: a bypass needs an explicit reason, passes and carries the line for the PR body', () => {
    const rows = [{ status: 'A', file: 'app/admin/users/page.tsx' }];
    const mapped = { docs: [mappedDoc(MAP_DOC, ['app/admin/users/page.tsx'])] };
    const bypassed = evaluate({ rows, mapped, record: null, fingerprint: 'f1', bypassReason: 'docs follow in the next PR' });
    assert.equal(bypassed.status, 'BYPASSED');
    assert.deepEqual(bypassed.bypass, {
        reason: 'docs follow in the next PR',
        prLine: 'Docs staleness: bypassed at user request — docs follow in the next PR'
    });
    assert.equal(bypassed.stale.length, 1, 'a bypass still lists what it bypassed');
    assert.equal(
        evaluate({ rows, mapped: { docs: [] }, record: null, fingerprint: 'f1', bypassReason: 'x' }).bypass,
        undefined,
        'nothing stale, nothing to bypass'
    );
    assert.throws(() => parseArgs(['--bypass-reason=']), /needs the reason the user gave/);
    assert.throws(() => parseArgs(['--bypass-reason=   ']), /needs the reason the user gave/);
    assert.throws(() => parseArgs(['record']), /at least one --fresh/);
    assert.throws(() => parseArgs(['--skip']), /Unsupported argument/);
    assert.deepEqual(parseArgs(['record', '--fresh=docs\\a.md']).fresh, ['docs/a.md'], 'a Windows-style doc path is recorded as POSIX');
});

test('TC-PCI-092: the change fingerprint follows content, not only paths', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-staleness-fp-'));
    try {
        fs.writeFileSync(path.join(root, 'a.txt'), 'one');
        const rows = [{ status: 'M', file: 'a.txt' }];
        const first = changeFingerprint(rows, root);
        assert.equal(changeFingerprint([...rows], root), first);
        fs.writeFileSync(path.join(root, 'a.txt'), 'two');
        assert.notEqual(changeFingerprint(rows, root), first);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('TC-PCI-091/092: the CLI checks a real branch: fail, record, edit voids, update passes, bypass is recorded', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-staleness-cli-'));
    try {
        // A clean machine: no user git or framework settings leak in; temp files stay in the fixture.
        const env = {
            ...process.env,
            HOME: root,
            USERPROFILE: root,
            TMPDIR: root,
            TEMP: root,
            TMP: root,
            CLAUDE_PROJECT_DIR: root,
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_AUTHOR_NAME: 'Fixture',
            GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
            GIT_COMMITTER_NAME: 'Fixture',
            GIT_COMMITTER_EMAIL: 'fixture@example.invalid'
        };
        const git = (...args) => {
            const out = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
            assert.equal(out.status, 0, `git ${args.join(' ')}: ${out.stderr}`);
        };
        const write = (rel, text) => {
            fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
            fs.writeFileSync(path.join(root, rel), text);
        };
        const check = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env, encoding: 'utf8' });

        write('.gitignore', '/tmp/\n');
        write(
            'docs/project-config.json',
            JSON.stringify({
                schemaVersion: 2,
                project: { name: 'Fixture' },
                referenceDocs: [{ filename: 'feature-map-reference.md', purpose: 'Feature map' }],
                featureMap: { sources: ['app/**/page.tsx'] }
            })
        );
        write(MAP_DOC, '# Feature Map\n');
        write('app/home/page.tsx', 'home\n');
        git('init', '-q');
        git('symbolic-ref', 'HEAD', 'refs/heads/main');
        git('add', '-A');
        git('commit', '-q', '-m', 'base');
        git('checkout', '-q', '-b', 'feature');

        // Non-doc-relevant change: passes.
        write('notes.txt', 'scratch\n');
        let out = check('--base=main');
        assert.equal(out.status, 0, out.stdout + out.stderr);
        assert.match(out.stdout, /^docs-staleness: PASS/);

        // A new page (untracked, so local changes count): the map is impacted and not updated.
        write('app/admin/page.tsx', 'admin\n');
        out = check('--base=main');
        assert.equal(out.status, 1, out.stdout + out.stderr);
        assert.match(out.stdout, /docs\/project-reference\/feature-map-reference\.md may be stale/);
        assert.match(out.stdout, /Changed: app\/admin\/page\.tsx/);

        // docs-manager verified it fresh: record it, and the check passes for this exact change.
        assert.equal(check('record', '--base=main', '--fresh=docs/project-reference/other.md').status, 2, 'a doc this change does not impact is refused');
        out = check('record', '--base=main', `--fresh=${MAP_DOC}`);
        assert.equal(out.status, 0, out.stderr);
        assert.equal(check('--base=main').status, 0);

        // Editing a changed file voids the record.
        write('app/admin/page.tsx', 'admin v2\n');
        assert.equal(check('--base=main').status, 1);

        // An explicit bypass passes and is recorded with its reason.
        out = check('--base=main', '--json', '--bypass-reason=user asked: map refresh lands next');
        assert.equal(out.status, 0, out.stderr);
        const bypassed = JSON.parse(out.stdout);
        assert.equal(bypassed.status, 'BYPASSED');
        assert.equal(bypassed.bypass.prLine, 'Docs staleness: bypassed at user request — user asked: map refresh lands next');
        const record = JSON.parse(fs.readFileSync(path.join(root, 'tmp', 'docs-staleness', 'record.json'), 'utf8'));
        assert.equal(record.bypass.reason, 'user asked: map refresh lands next');
        assert.equal(check('--base=main').status, 1, 'a bypass is never carried over to a run that did not ask for it');

        // Updating the doc in the same change passes, committed or not.
        write(MAP_DOC, '# Feature Map\n\n### FM-001 · Admin\n- Source: `app/admin/page.tsx`\n');
        git('add', '-A');
        git('commit', '-q', '-m', 'admin page and its entry');
        out = check('--base=main');
        assert.equal(out.status, 0, out.stdout);

        // An unknown base is an error, never a pass.
        out = check('--base=no-such-branch');
        assert.equal(out.status, 2);
        assert.match(out.stderr, /no merge base with no-such-branch/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('TC-PCI-091: an edit to a feature-map area doc updates the map', () => {
    const rows = [
        { status: 'A', file: 'app/admin/page.tsx' },
        { status: 'M', file: 'docs/project-reference/feature-map/admin.md' }
    ];
    const mapped = { docs: [mappedDoc(MAP_DOC, ['app/admin/page.tsx'])] };
    assert.equal(evaluate({ rows, mapped, record: null, fingerprint: 'f' }).status, 'PASS');
    const elsewhere = [rows[0], { status: 'M', file: 'docs/project-reference/feature-map/nested/admin.md' }];
    assert.equal(evaluate({ rows: elsewhere, mapped, record: null, fingerprint: 'f' }).status, 'FAIL', 'only the area docs beside the index count');
});

test('TC-PCI-091: a project in a subfolder of its repository sees committed and staged changes, unusual names included; an invalid config stops the check', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-staleness-nested-'));
    const root = path.join(repo, 'proj');
    try {
        const env = {
            ...process.env,
            HOME: repo,
            USERPROFILE: repo,
            TMPDIR: repo,
            TEMP: repo,
            TMP: repo,
            CLAUDE_PROJECT_DIR: root,
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_AUTHOR_NAME: 'Fixture',
            GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
            GIT_COMMITTER_NAME: 'Fixture',
            GIT_COMMITTER_EMAIL: 'fixture@example.invalid'
        };
        const git = (...args) => {
            const out = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' });
            assert.equal(out.status, 0, `git ${args.join(' ')}: ${out.stderr}`);
        };
        const write = (rel, text) => {
            fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
            fs.writeFileSync(path.join(root, rel), text);
        };
        const check = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env, encoding: 'utf8' });
        const config = {
            schemaVersion: 2,
            project: { name: 'Fixture' },
            referenceDocs: [{ filename: 'feature-map-reference.md', purpose: 'Feature map' }],
            featureMap: { sources: ['app/**/page.tsx'] }
        };
        write('docs/project-config.json', JSON.stringify(config));
        write(MAP_DOC, '# Feature Map\n');
        write('docs/project-reference/feature-map/admin.md', '# Admin\n');
        fs.writeFileSync(path.join(repo, 'README.md'), 'outer\n');
        git('init', '-q');
        git('symbolic-ref', 'HEAD', 'refs/heads/main');
        git('add', '-A');
        git('commit', '-q', '-m', 'base');
        git('checkout', '-q', '-b', 'feature');

        // A committed page whose name git would quote, in a project below the repository root.
        write('app/café/page.tsx', 'page\n');
        git('add', '-A');
        git('commit', '-q', '-m', 'page');
        let out = check('--base=main');
        assert.equal(out.status, 1, out.stdout + out.stderr);
        assert.match(out.stdout, /docs\/project-reference\/feature-map-reference\.md may be stale/);
        assert.match(out.stdout, /Changed: app\/café\/page\.tsx/);

        // A staged edit to the map's area doc updates the map.
        write('docs/project-reference/feature-map/admin.md', '# Admin\n\n### FM-001 · Café\n- Source: `app/café/page.tsx`\n');
        git('add', '-A');
        out = check('--base=main');
        assert.equal(out.status, 0, out.stdout + out.stderr);

        // A page moved out of the source glob still impacts the map through its old path, as docs-manager sees it.
        git('commit', '-q', '-m', 'map');
        git('checkout', '-q', '-b', 'move', 'main');
        write('app/old/page.tsx', 'page\n');
        git('add', '-A');
        git('commit', '-q', '-m', 'old page');
        git('branch', '-f', 'main');
        git('mv', 'proj/app/old/page.tsx', 'proj/old-page.tsx');
        git('commit', '-q', '-m', 'move');
        out = check('--base=main');
        assert.equal(out.status, 1, out.stdout + out.stderr);
        assert.match(out.stdout, /Changed: app\/old\/page\.tsx/, 'a rename is the old path deleted plus the new path added');
        const sync = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'pull-request', 'references', 'docs-sync.md'), 'utf8');
        assert.match(sync, /git diff --name-only --no-renames --relative/, 'docs-manager must list renames the same way the check does');

        // An unreadable config would route nothing: it stops the check instead of passing it.
        write('docs/project-config.json', '{ not json');
        out = check('--base=main');
        assert.equal(out.status, 2, out.stdout);
        assert.match(out.stderr, /project config is invalid/);
    } finally {
        fs.rmSync(repo, { recursive: true, force: true });
    }
});
