'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const target = require('../lib/review-target.cjs');
const { gitBytes, writeOpaqueFile, moveOpaqueMetadata, indexBlob, gitOutputTarget, privateSource } = require('./review-target-fixture.cjs');

function fixture(fn) {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-target-')));
    const original = { ...process.env };
    try {
        for (const key of Object.keys(process.env)) if (/^(CK_|CLAUDE_|OCR_|OPENAI_|ANTHROPIC_|GIT_)/.test(key)) delete process.env[key];
        for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) process.env[key] = root;
        const git = args => execFileSync('git', args, { cwd: root, shell: false, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
        git(['init']); git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
        fs.writeFileSync(path.join(root, '.gitignore'), 'tmp/\ntemp/\n.claude/\n');
        fs.writeFileSync(path.join(root, 'item.txt'), 'before');
        fs.writeFileSync(path.join(root, 'removed.txt'), 'removed');
        fs.writeFileSync(path.join(root, 'moved.txt'), 'moved');
        git(['add', '.']); git(['commit', '-m', 'fixture']);
        return fn(root, git);
    } finally {
        for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
        Object.assign(process.env, original);
        fs.rmSync(root, { recursive: true, force: true });
    }
}

const capture = (root, options = {}) => target.captureTarget({ rootDir: root, outputDir: 'tmp/review/frozen', ...options });

test('TC-RVP-001 layered changes retain staged/worktree/delete/recreate/rename sides', () => fixture((root, git) => {
    // Given separate selected and live bytes, a staged removal followed by new work, and a move.
    fs.writeFileSync(path.join(root, 'item.txt'), 'selected'); git(['add', 'item.txt']);
    fs.writeFileSync(path.join(root, 'item.txt'), 'live');
    git(['rm', 'removed.txt']); fs.writeFileSync(path.join(root, 'removed.txt'), 'recreated');
    git(['mv', 'moved.txt', 'renamed.txt']);
    // When the full local target is frozen.
    const frozen = capture(root);
    // Then the exact layers and content identities survive independently.
    assert.equal(target.validateTarget(frozen).valid, true);
    assert.deepEqual(frozen.entries.filter(e => e.path === 'item.txt').map(e => e.layer), ['staged', 'worktree']);
    const staged = frozen.entries.find(e => e.path === 'item.txt' && e.layer === 'staged');
    const working = frozen.entries.find(e => e.path === 'item.txt' && e.layer === 'worktree');
    assert.equal(target.readTargetContent(frozen, staged.id, 'after').toString(), 'selected');
    assert.equal(target.readTargetContent(frozen, working.id, 'before').toString(), 'selected');
    assert.equal(target.readTargetContent(frozen, working.id, 'after').toString(), 'live');
    assert.equal(frozen.entries.filter(e => e.oldPath === 'removed.txt' || e.path === 'removed.txt').length, 2);
    const renamed = frozen.entries.find(e => e.status === 'R');
    assert.equal(renamed.oldPath, 'moved.txt'); assert.equal(renamed.path, 'renamed.txt');
    assert.equal(new Set(frozen.entries.map(e => e.id)).size, frozen.entries.length);
}));

test('TC-RVP-002 exact scopes include branch+local and named files without unrelated work', () => fixture((root, git) => {
    // Given one recorded branch change and unrelated local work.
    const ancestor = git(['rev-parse', 'HEAD']).trim();
    fs.writeFileSync(path.join(root, 'item.txt'), 'recorded'); git(['add', 'item.txt']); git(['commit', '-m', 'recorded']);
    fs.writeFileSync(path.join(root, 'item.txt'), 'selected'); git(['add', 'item.txt']);
    fs.writeFileSync(path.join(root, 'other.txt'), 'new');
    // When each supported scope is selected.
    const branch = capture(root, { scope: 'branch', base: ancestor });
    const staged = capture(root, { scope: 'staged' });
    const named = capture(root, { scope: 'files', files: ['other.txt'] });
    // Then scopes cannot substitute or absorb unrelated layers.
    assert.deepEqual(branch.entries.map(e => e.layer), ['branch', 'staged', 'untracked']);
    assert.deepEqual(staged.entries.map(e => e.layer), ['staged']);
    assert.deepEqual(named.entries.map(e => e.path), ['other.txt']);
    assert.throws(() => capture(root, { scope: 'branch', base: 'missing-ref' }), /git-target-unresolved/);
    assert.throws(() => capture(root, { scope: 'files', files: ['missing'] }));
    assert.throws(() => capture(root, { scope: 'files', files: [] }), /empty-named-target/);
}));

test('TC-RVP-032 unchanged replay is stable while selected content drift invalidates it', () => fixture(root => {
    // Given frozen named work.
    const first = capture(root, { scope: 'files', files: ['item.txt'] });
    // When replayed without changes, then artifact locations do not alter identity.
    const replay = capture(root, { scope: 'files', files: ['item.txt'], outputDir: 'tmp/other/capture' });
    assert.equal(first.fingerprint, replay.fingerprint);
    assert.equal(target.checkTargetFreshness(first).fresh, true);
    // When work changes, then old frozen bytes remain readable but freshness fails.
    fs.writeFileSync(path.join(root, 'item.txt'), 'later');
    assert.equal(target.readTargetContent(first, first.entries[0].id, 'after').toString(), 'before');
    assert.equal(target.checkTargetFreshness(first).fresh, false);
}));

test('TC-RVP-071 empty, added, modified and deleted scope conservation', () => fixture((root, git) => {
    // Given the finite existence/layer domain including no selected work.
    assert.deepEqual(capture(root, { scope: 'staged' }).entries, []);
    for (const [name, bytes] of [['new.txt', 'new'], ['item.txt', 'changed']]) fs.writeFileSync(path.join(root, name), bytes);
    git(['add', 'new.txt', 'item.txt']); git(['rm', 'removed.txt']);
    // When preparation freezes this domain, then every selected existence state is represented.
    const frozen = capture(root, { scope: 'staged' });
    assert.deepEqual(frozen.entries.map(e => e.status).sort(), ['A', 'D', 'M']);
    for (const entry of frozen.entries) {
        assert.equal(entry.id.length, 64);
        assert.equal(entry.oldPath === null, entry.beforeId === null);
        assert.equal(entry.path === null, entry.afterId === null);
    }
    assert.equal(target.validateTarget(frozen).valid, true);
}));

test('TC-RVP-082 captured artifacts and manifest identities reject tampering', () => fixture(root => {
    // Given current frozen work.
    const frozen = capture(root, { scope: 'files', files: ['item.txt'] });
    // When a content reference or manifest identity is altered, then validation refuses reuse.
    const altered = JSON.parse(JSON.stringify(frozen)); altered.entries[0].layer = 'staged';
    assert.equal(target.validateTarget(altered).valid, false);
    // Deliberate manifest corruption: a valid outer identity cannot hide a changed entry layer.
    altered.fingerprint = target.targetIdentity(altered);
    assert.equal(target.validateTarget(altered).valid, false);
    // Isolate the outer identity check while every entry/content remains valid.
    const outer = { ...frozen, fingerprint: frozen.fingerprint === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64) };
    assert.equal(target.validateTarget(outer).valid, false);
    assert.equal(target.validateTarget(outer).reasons[0].code, 'target-fingerprint-mismatch');
    // TC083: even a newly fingerprinted outer manifest cannot admit no-side or duplicate entries.
    for (const entries of [
        [{ ...frozen.entries[0], oldPath: null, path: null, beforeId: null, afterId: null, beforeContentRef: null, afterContentRef: null }],
        [frozen.entries[0], { ...frozen.entries[0] }]
    ]) {
        const malformed = { ...frozen, entries };
        // Give no-side corruption a valid checksum so the semantic guard owns the rejection.
        if (entries.length === 1) {
            const entry = entries[0];
            entry.id = target.digest(JSON.stringify([entry.layer, entry.status, null, null, null, null]));
        }
        malformed.fingerprint = target.targetIdentity(malformed);
        assert.equal(target.validateTarget(malformed).valid, false);
    }
    const artifact = path.join(root, frozen.entries[0].afterContentRef);
    fs.writeFileSync(artifact, 'tampered');
    assert.equal(target.validateTarget(frozen).valid, false);
    assert.throws(() => target.readTargetContent(frozen, frozen.entries[0].id, 'after'), /artifact-integrity/);
}));

test('TC-RVP-071 existence/layer/move metamorphism conserves every selected side', () => {
    // Given a finite state table with literal expected Git-layer and before/after side contracts.
    const cases = [
        { name: 'unchanged', apply() {}, expected: [] },
        { name: 'working', apply(root) { fs.writeFileSync(path.join(root, 'item.txt'), 'working'); }, expected: [['worktree', 'M', 'item.txt', 'item.txt', 'before', 'working']] },
        { name: 'staged', apply(root, git) { fs.writeFileSync(path.join(root, 'item.txt'), 'selected'); git(['add', 'item.txt']); }, expected: [['staged', 'M', 'item.txt', 'item.txt', 'before', 'selected']] },
        { name: 'two-layers', apply(root, git) { fs.writeFileSync(path.join(root, 'item.txt'), 'selected'); git(['add', 'item.txt']); fs.writeFileSync(path.join(root, 'item.txt'), 'working'); }, expected: [['staged', 'M', 'item.txt', 'item.txt', 'before', 'selected'], ['worktree', 'M', 'item.txt', 'item.txt', 'selected', 'working']] },
        { name: 'added', apply(root) { fs.writeFileSync(path.join(root, 'new.txt'), 'added'); }, expected: [['untracked', 'A', null, 'new.txt', null, 'added']] },
        { name: 'deleted-recreated', apply(root, git) { git(['rm', 'removed.txt']); fs.writeFileSync(path.join(root, 'removed.txt'), 'recreated'); }, expected: [['staged', 'D', 'removed.txt', null, 'removed', null], ['untracked', 'A', null, 'removed.txt', null, 'recreated']] },
        { name: 'moved', apply(root, git) { git(['mv', 'moved.txt', 'renamed.txt']); }, expected: [['staged', 'R', 'moved.txt', 'renamed.txt', 'moved', 'moved']] },
        { name: 'moved-two-layers', apply(root, git) { git(['mv', 'moved.txt', 'renamed.txt']); fs.writeFileSync(path.join(root, 'renamed.txt'), 'working move'); }, expected: [['staged', 'R', 'moved.txt', 'renamed.txt', 'moved', 'moved'], ['worktree', 'M', 'renamed.txt', 'renamed.txt', 'moved', 'working move']] }
    ];
    for (const row of cases) fixture((root, git) => {
        row.apply(root, git);
        // When identical work is captured into independent artifact directories.
        const first = capture(root), replay = capture(root, { outputDir: 'tmp/replayed/frozen' });
        const observe = frozen => frozen.entries.map(entry => [entry.layer, entry.status, entry.oldPath, entry.path, ...['before', 'after'].map(side => target.readTargetContent(frozen, entry.id, side)?.toString() ?? null)]);
        // Then identities/counts/bytes are conserved, including removed/recreated and moved layer intersections.
        assert.deepEqual(observe(first), row.expected, row.name);
        assert.deepEqual(observe(replay), row.expected, row.name);
        assert.equal(first.entries.length, row.expected.length, row.name);
        assert.equal(new Set(first.entries.map(entry => entry.id)).size, row.expected.length, row.name);
        assert.deepEqual(first.entries.map(entry => entry.id), replay.entries.map(entry => entry.id), row.name);
        assert.equal(first.fingerprint, replay.fingerprint, row.name);
        assert.equal(target.validateTarget(first).valid, true, row.name);
    });
});

test('TC-RVP-082 byte-transform metamorphism changes identity while frozen content remains immutable', () => fixture(root => {
    // Given UTF-8, line-ending, empty and binary content transformations at the same named path.
    const variants = [Buffer.from('text'), Buffer.from('TEXT'), Buffer.from('text\r\n'), Buffer.from('服务'), Buffer.alloc(0), Buffer.from([0, 255, 65])];
    const fingerprints = new Set();
    for (const [index, bytes] of variants.entries()) {
        fs.writeFileSync(path.join(root, 'item.txt'), bytes);
        const first = capture(root, { scope: 'files', files: ['item.txt'], outputDir: `tmp/bytes-${index}/frozen` });
        const replay = capture(root, { scope: 'files', files: ['item.txt'], outputDir: `tmp/bytes-${index}/replay` });
        // When only bytes change after an unchanged replay, then new work cannot masquerade as frozen evidence.
        assert.equal(first.fingerprint, replay.fingerprint);
        assert.deepEqual(target.readTargetContent(first, first.entries[0].id, 'after'), bytes);
        assert.equal(first.entries.length, 1); assert.equal(first.entries[0].beforeId, null);
        fingerprints.add(first.fingerprint);
        fs.writeFileSync(path.join(root, 'item.txt'), Buffer.concat([bytes, Buffer.from([1])]));
        assert.equal(target.checkTargetFreshness(first).fresh, false);
        assert.deepEqual(target.readTargetContent(first, first.entries[0].id, 'after'), bytes);
    }
    // Then every different byte input has a different target identity without changing path or entry count.
    assert.equal(fingerprints.size, variants.length);
}));

test('TC-RVP-023 private/traversing paths and unowned output cannot expose or overwrite work', () => fixture(root => {
    // Given a private source and an output directory owned by someone else.
    fs.writeFileSync(path.join(root, '.env'), 'synthetic-private-marker');
    fs.mkdirSync(path.join(root, 'tmp', 'unowned'), { recursive: true });
    fs.writeFileSync(path.join(root, 'tmp', 'unowned', 'keep.txt'), 'keep');
    // When rejected paths are requested, then no capture succeeds and the sentinel is untouched.
    for (const file of ['.env', '../outside', 'x/../item.txt', '.git/config']) assert.throws(() => capture(root, { scope: 'files', files: [file] }));
    assert.throws(() => capture(root, { outputDir: 'tmp/unowned' }), /unowned-output/);
    assert.equal(fs.readFileSync(path.join(root, 'tmp', 'unowned', 'keep.txt'), 'utf8'), 'keep');
    assert.equal(fs.existsSync(path.join(root, 'tmp', 'unowned', '.review-owner.json')), false);
}));

test('TC-RVP-052 literal unusual names survive and budgets never truncate a ready target', () => fixture(root => {
    // Given names legal on all platforms, including case distinctions and command-looking text.
    const names = ['Upper.txt', 'lower.txt', 'space ; dollar $.txt'];
    for (const name of names) fs.writeFileSync(path.join(root, name), name);
    // When names are passed literally, then every selected identity remains distinct.
    const frozen = capture(root, { scope: 'files', files: names });
    assert.deepEqual(frozen.entries.map(e => e.path), names);
    assert.throws(() => capture(root, { scope: 'files', files: names, limits: { maxEntries: 2 } }), /target-entry-budget/);
    assert.throws(() => capture(root, { scope: 'files', files: names, limits: { maxFileBytes: 1 } }), /target-content-budget/);
    assert.throws(() => capture(root, { scope: 'files', files: names, limits: { maxTargetBytes: 2 } }), /target-content-budget/);
    // The working-file ceiling also rejects before allocating the selected oversized contents.
    const oversized = path.join(root, names[0]);
    let selectedReads = 0;
    const bounded = privateSource('../lib/review-target.cjs', new Map([['node:fs', {
        ...fs, readFileSync(file, ...args) {
            if (file === oversized) selectedReads++;
            return fs.readFileSync(file, ...args);
        }
    }]])).exports;
    assert.throws(() => bounded.captureTarget({ rootDir: root, scope: 'files', files: [names[0]], persist: false, limits: { maxFileBytes: 1 } }), /target-content-budget/);
    assert.equal(selectedReads, 0, 'oversized selected bytes are not read before budget refusal');
}));

test('TC-RVP-023 symlink/junction escape and output links are refused', t => fixture(root => {
    // Given a link to a sibling directory, where OS permits creation.
    const outside = fs.mkdtempSync(path.join(path.dirname(root), 'review-outside-'));
    try {
        fs.writeFileSync(path.join(outside, 'private.txt'), 'synthetic-outside-marker');
        try { fs.symlinkSync(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
        catch (error) { if (error.code === 'EPERM') { t.skip('OS forbids test link creation'); return; } throw error; }
        // When a linked read/write is requested, then the boundary denies it.
        assert.throws(() => capture(root, { scope: 'files', files: ['linked/private.txt'] }), /unsafe-link/);
        fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
        fs.symlinkSync(outside, path.join(root, 'tmp', 'out'), process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => capture(root, { outputDir: 'tmp/out/run' }), /unsafe-link/);
        assert.equal(fs.readFileSync(path.join(outside, 'private.txt'), 'utf8'), 'synthetic-outside-marker');
        // An in-root ancestor link cannot redirect writes even when containment alone permits it.
        const contained = path.join(root, 'tmp', 'contained');
        fs.mkdirSync(contained);
        fs.symlinkSync(contained, path.join(root, 'tmp', 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => capture(root, { outputDir: 'tmp/alias/run' }), /unsafe-output-link/);
        assert.deepEqual(fs.readdirSync(contained), [], 'linked output destination receives no owner or artifacts');
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
}));

test('TC-RVP-052 POSIX backslash names cannot alias a slash neighbor in any selected layer', () => {
    // Given different bytes at the literal POSIX name and its slash neighbor; Windows uses real separators.
    if (process.platform === 'win32') return fixture(root => {
        fs.mkdirSync(path.join(root, 'a')); fs.writeFileSync(path.join(root, 'a', 'b.js'), 'slash neighbor');
        // When a Windows separator is selected, then it identifies the real nested file.
        const frozen = capture(root, { scope: 'files', files: ['a\\b.js'] });
        assert.equal(frozen.entries[0].path, 'a/b.js');
        assert.equal(target.readTargetContent(frozen, frozen.entries[0].id, 'after').toString(), 'slash neighbor');
    });
    for (const layer of ['named', 'worktree', 'staged', 'branch', 'untracked']) fixture((root, git) => {
        fs.mkdirSync(path.join(root, 'a')); fs.writeFileSync(path.join(root, 'a', 'b.js'), 'slash neighbor');
        git(['add', 'a/b.js']); git(['commit', '-m', 'neighbor']);
        const base = git(['rev-parse', 'HEAD']).trim();
        fs.writeFileSync(path.join(root, 'a\\b.js'), 'literal before');
        if (layer !== 'untracked') { git(['add', '--', ':(literal)a\\b.js']); git(['commit', '-m', 'literal baseline']); }
        fs.writeFileSync(path.join(root, 'a\\b.js'), 'literal selected');
        if (layer === 'staged' || layer === 'branch') git(['add', '--', ':(literal)a\\b.js']);
        if (layer === 'branch') git(['commit', '-m', 'literal branch']);
        const request = layer === 'named' ? { scope: 'files', files: ['a\\b.js'] } : layer === 'staged' ? { scope: 'staged' } : layer === 'branch' ? { scope: 'branch', base } : { scope: 'local' };
        // When any supported ingress selects this unrepresentable path, then it refuses instead of substituting a neighbor.
        assert.throws(() => capture(root, request), /unsupported-target-path/, layer);
        const neighbor = capture(root, { scope: 'files', files: ['a/b.js'] });
        assert.equal(neighbor.entries[0].path, 'a/b.js');
        assert.equal(target.readTargetContent(neighbor, neighbor.entries[0].id, 'after').toString(), 'slash neighbor');
        assert.equal(target.checkTargetFreshness(neighbor).fresh, true);
    });
});

test('TC-RVP-052 opaque POSIX filename bytes refuse every Git layer without selecting a Unicode neighbor', () => {
    // Given malformed UTF-8 filename partitions and distinct legitimate replacement-character neighbors.
    const names = [
        { bytes: [0x80], neighbor: 'raw-\uFFFD.js' },
        { bytes: [0xc0, 0xaf], neighbor: 'raw-\uFFFD\uFFFD.js' },
        { bytes: [0xed, 0xa0, 0x80], neighbor: 'raw-\uFFFD\uFFFD\uFFFD.js' }
    ];
    for (const layer of ['staged', 'branch', 'worktree', 'untracked']) for (const name of names) fixture((root, git) => {
        fs.writeFileSync(path.join(root, name.neighbor), 'valid Unicode neighbor');
        git(['add', '.']); git(['commit', '-m', 'neighbor baseline']);
        const rawName = Buffer.concat([Buffer.from('raw-'), Buffer.from(name.bytes), Buffer.from('.js')]);
        const rawSnapshot = Buffer.from(rawName);
        const before = Buffer.from('opaque before'), selected = Buffer.from('opaque selected');
        const rawPath = writeOpaqueFile(root, rawName, before);
        let blobId, seam, base;
        if (rawPath) {
            // Capable filesystems retain real native modification/untracked filename coverage.
            if (layer !== 'untracked') { git(['add', '.']); git(['commit', '-m', 'opaque baseline']); }
            base = git(['rev-parse', 'HEAD']).trim();
            fs.writeFileSync(rawPath, selected);
            if (layer === 'staged' || layer === 'branch') git(['add', '.']);
            if (layer === 'branch') git(['commit', '-m', 'opaque selected']);
        } else if (layer !== 'untracked') {
            // Rejecting hosts still use real binary Git index/tree records. Worktree is a real deletion,
            // not a simulated native modification: the committed opaque path has no materialized file.
            indexBlob(root, rawName, before); git(['commit', '-m', 'opaque baseline']);
            base = git(['rev-parse', 'HEAD']).trim();
            blobId = layer === 'worktree' ? indexBlob(root, rawName, before) : indexBlob(root, rawName, selected);
            if (layer === 'branch') git(['commit', '-m', 'opaque selected']);
            const diffArgs = layer === 'staged' ? ['--cached'] : layer === 'branch' ? [base, 'HEAD'] : [];
            const diff = gitBytes(root, ['diff', '--raw', '-z', '--no-abbrev', ...diffArgs, '--']);
            assert.ok(diff.includes(rawName), `${layer}: actual Git carries opaque bytes`);
            if (layer === 'worktree') assert.match(diff.toString('latin1'), / D\0/);
        } else {
            // Windows and EILSEQ hosts prove the actual untracked decoder boundary, not native filenames.
            const args = ['ls-files', '--others', '--exclude-standard', '-z'];
            seam = gitOutputTarget(root, args, Buffer.concat([gitBytes(root, args), rawName, Buffer.from([0])]));
            blobId = gitBytes(root, ['hash-object', '-w', '--stdin'], selected).toString().trim();
        }
        const carrier = path.join(root, 'tmp', 'opaque-carrier.bin');
        fs.mkdirSync(path.dirname(carrier), { recursive: true }); fs.writeFileSync(carrier, selected);
        const carrierSnapshot = fs.readFileSync(carrier);
        const indexSnapshot = gitBytes(root, ['ls-files', '--stage', '-z']);
        const blobSnapshot = blobId && gitBytes(root, ['cat-file', 'blob', blobId]);
        if (blobSnapshot) assert.deepEqual(blobSnapshot, layer === 'worktree' ? before : selected);
        const seamSnapshot = seam && Buffer.from(seam.raw);
        const request = layer === 'staged' ? { scope: 'staged' } : layer === 'branch' ? { scope: 'branch', base } : { scope: 'local' };
        const refuse = () => (seam?.target || target).captureTarget({ rootDir: root, outputDir: 'tmp/review/frozen', ...request });
        // When selected names cannot survive the manifest encoding, then no substituted or partial target is returned.
        assert.throws(refuse, { code: 'unsupported-target-path' }, `${layer}: ${name.bytes}`);
        // Then the real legitimate neighbor retains exact content and freshness without any injected Git output.
        const neighbor = capture(root, { scope: 'files', files: [name.neighbor] });
        assert.equal(neighbor.entries[0].path, name.neighbor);
        assert.equal(target.readTargetContent(neighbor, neighbor.entries[0].id, 'after').toString(), 'valid Unicode neighbor');
        assert.equal(target.checkTargetFreshness(neighbor).fresh, true);
        if (rawPath) assert.deepEqual(fs.readFileSync(rawPath), selected);
        fs.unlinkSync(path.join(root, name.neighbor));
        assert.throws(refuse, { code: 'unsupported-target-path' }, `${layer}: absent neighbor`);
        assert.deepEqual(rawName, rawSnapshot); assert.deepEqual(fs.readFileSync(carrier), carrierSnapshot);
        assert.deepEqual(gitBytes(root, ['ls-files', '--stage', '-z']), indexSnapshot);
        if (blobId) assert.deepEqual(gitBytes(root, ['cat-file', 'blob', blobId]), blobSnapshot);
        if (rawPath) assert.deepEqual(fs.readFileSync(rawPath), selected);
        if (seam) {
            assert.equal(seam.hits.length, 2); assert.ok(seam.hits.every(hit => hit.shell === false));
            assert.deepEqual(seam.raw, seamSnapshot); assert.deepEqual(fs.readFileSync(seam.filename), seam.source);
        }
        assert.match(git(['rev-parse', '--verify', 'HEAD']).trim(), /^[a-f0-9]{40,64}$/);
    });
});

test('TC-RVP-052 malformed named surrogates refuse before filesystem replacement with or without a neighbor', () => fixture(root => {
    // Given high/low surrogate boundaries, interior errors and reversed pairs beside literal valid neighbors.
    const names = [
        ['bad-\uD800.js', 'bad-\uFFFD.js'], ['bad-\uDBFF.js', 'bad-\uFFFD.js'],
        ['bad-\uDC00.js', 'bad-\uFFFD.js'], ['bad-\uDFFF.js', 'bad-\uFFFD.js'],
        ['bad-\uD800x.js', 'bad-\uFFFDx.js'], ['bad-x\uDC00.js', 'bad-x\uFFFD.js'],
        ['bad-\uDC00\uD800.js', 'bad-\uFFFD\uFFFD.js']
    ];
    for (const [malformed, neighborName] of names) {
        fs.writeFileSync(path.join(root, neighborName), 'literal Unicode neighbor');
        // When a named target cannot round-trip through filesystem encoding, then it cannot read that neighbor.
        assert.throws(() => capture(root, { scope: 'files', files: [malformed] }), { code: 'unsupported-target-path' });
        const neighbor = capture(root, { scope: 'files', files: [neighborName] });
        assert.equal(neighbor.entries[0].path, neighborName);
        assert.equal(target.readTargetContent(neighbor, neighbor.entries[0].id, 'after').toString(), 'literal Unicode neighbor');
        fs.unlinkSync(path.join(root, neighborName));
        // Then refusal does not depend on an accidental missing-file failure.
        assert.throws(() => capture(root, { scope: 'files', files: [malformed] }), { code: 'unsupported-target-path' });
    }
}));

test('TC-RVP-071 valid replacement characters emoji and Unicode retain exact identity in every scope', () => {
    // Given valid Unicode partitions, including the replacement character and an actual surrogate pair.
    const names = ['replacement-\uFFFD.js', 'emoji-\uD83D\uDE80.js', '服务.js'];
    for (const layer of ['named', 'staged', 'branch', 'worktree', 'untracked']) fixture((root, git) => {
        for (const name of names) fs.writeFileSync(path.join(root, name), `before ${name}`);
        if (layer !== 'untracked') { git(['add', '.']); git(['commit', '-m', 'Unicode baseline']); }
        const base = git(['rev-parse', 'HEAD']).trim();
        for (const name of names) fs.writeFileSync(path.join(root, name), `selected ${name}`);
        if (layer === 'staged' || layer === 'branch') git(['add', '.']);
        if (layer === 'branch') git(['commit', '-m', 'Unicode selected']);
        const request = layer === 'named' ? { scope: 'files', files: names } : layer === 'staged' ? { scope: 'staged' } : layer === 'branch' ? { scope: 'branch', base } : { scope: 'local' };
        // When representable work is selected, then encoding guards preserve every side, identity and byte.
        const frozen = capture(root, request);
        assert.deepEqual(frozen.entries.map(entry => entry.path).sort(), names.slice().sort());
        assert.equal(new Set(frozen.entries.map(entry => entry.id)).size, names.length);
        for (const entry of frozen.entries) {
            assert.equal(entry.layer, layer === 'named' ? 'files' : layer);
            assert.equal(target.readTargetContent(frozen, entry.id, 'after').toString(), `selected ${entry.path}`);
            if (layer !== 'named' && layer !== 'untracked') assert.equal(target.readTargetContent(frozen, entry.id, 'before').toString(), `before ${entry.path}`);
        }
        assert.equal(target.validateTarget(frozen).valid, true);
        assert.equal(target.checkTargetFreshness(frozen).fresh, true);
        const replay = capture(root, { ...request, outputDir: 'tmp/Unicode-replay/frozen' });
        assert.equal(replay.fingerprint, frozen.fingerprint);
    });
});

test('TC-RVP-052 opaque Git repository path identity is refused even for named scope', () => {
    fixture((root, git) => {
        // Given actual valid Git metadata and a distinct valid Unicode directory sentinel.
        const rawName = Buffer.concat([Buffer.from('metadata-'), Buffer.from([0x80])]);
        const rawDirectory = moveOpaqueMetadata(root, rawName);
        const sentinel = path.join(root, 'metadata-\uFFFD', 'keep.txt');
        fs.mkdirSync(path.dirname(sentinel)); fs.writeFileSync(sentinel, 'Neighbor metadata sentinel');
        const metadataSentinel = rawDirectory ? Buffer.concat([rawDirectory, Buffer.from(`${path.sep}keep.txt`)]) : path.join(root, '.git', 'keep.txt');
        fs.writeFileSync(metadataSentinel, 'Actual Git metadata sentinel');
        const sentinelBytes = fs.readFileSync(sentinel), metadataBytes = fs.readFileSync(metadataSentinel);
        if (rawDirectory) fs.writeFileSync(path.join(root, '.git'), Buffer.concat([Buffer.from('gitdir: '), rawDirectory, Buffer.from('\n')]));
        // The real HEAD proof remains independent from any impossible-host output injection.
        const head = git(['rev-parse', '--verify', 'HEAD']).trim();
        assert.match(head, /^[a-f0-9]{40,64}$/);
        const variants = rawDirectory ? [null] : ['--absolute-git-dir', '--show-toplevel'];
        for (const option of variants) {
            // On Windows/EILSEQ hosts only exact path-bearing stdout is injected into unchanged owner source.
            const seam = option && gitOutputTarget(root, ['rev-parse', option], Buffer.concat([Buffer.from(`${root}${path.sep}`), rawName, Buffer.from('\n')]));
            const rawSnapshot = seam && Buffer.from(seam.raw);
            const refuse = request => (seam?.target || target).captureTarget({ rootDir: root, outputDir: 'tmp/review/frozen', ...request });
            // When opaque metadata reaches either root ingress, then named mode cannot swallow it as absent Git.
            for (const request of [{ scope: 'local' }, { scope: 'files', files: ['item.txt'] }]) {
                assert.throws(() => refuse(request), { code: 'unsupported-target-path' });
            }
            // Then both real metadata and neighboring Unicode sentinel retain their exact bytes.
            assert.deepEqual(fs.readFileSync(sentinel), sentinelBytes);
            assert.deepEqual(fs.readFileSync(metadataSentinel), metadataBytes);
            if (seam) {
                assert.equal(seam.hits.length, 2); assert.ok(seam.hits.every(hit => hit.shell === false));
                assert.deepEqual(seam.raw, rawSnapshot); assert.deepEqual(fs.readFileSync(seam.filename), seam.source);
            }
        }
        assert.equal(git(['rev-parse', '--verify', 'HEAD']).trim(), head);
        assert.deepEqual(fs.readFileSync(metadataSentinel), metadataBytes);
    });
});
