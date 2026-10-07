'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { trackingTest: test, earlierProject, git } = require('../lib/task-tracking-fixture.cjs');
const { migrate } = require('../../lib/task-tracking-migration.cjs');

const CLI_PATH = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');

// Use the shipped CLI against the fixture's selected adopter root. Automatic
// dependency installation is disabled by withFixture; a missing pinned parser
// is a real setup failure, never a skipped case or a fake successful response.
function invoke(f, command, options = [], expectedExit = 0) {
    const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, ...options],
        { cwd: f.root, env: { ...process.env }, shell: false, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, expectedExit, child.stderr || child.stdout);
    assert.equal(child.stderr, '', 'A provisioned read command emits only its one stdout result');
    const lines = child.stdout.trim().split('\n'); assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
}

// One command exactly as typed, with the exit status it must end with. `invoke` adds the selected root.
function command(f, argv, expectedExit = 0) {
    const child = spawnSync(process.execPath, [CLI_PATH, ...argv],
        { cwd: f.root, env: { ...process.env }, shell: false, encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, expectedExit, child.stderr || child.stdout);
    assert.equal(child.stderr, ''); const lines = child.stdout.trim().split('\n'); assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
}

async function withBareServe(f, callback) {
    const child = spawn(process.execPath, [CLI_PATH, 'serve', '--root', f.root],
        { cwd: f.root, env: { ...process.env }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let settled = false; let timer;
    const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
    const listening = new Promise((resolve, reject) => {
        const finish = (error, value) => {
            if (settled) return; settled = true; clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        timer = setTimeout(() => finish(new Error(`CLI serve did not publish readiness: ${stdout} ${stderr}`)), 10000);
        child.once('error', error => finish(error));
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
            if (Buffer.byteLength(stdout) > 65536) return finish(new Error('CLI serve readiness output exceeded its budget'));
            const end = stdout.indexOf('\n'); if (end < 0) return;
            try {
                const result = JSON.parse(stdout.slice(0, end));
                if (result.status !== 'listening') return finish(new Error(`CLI serve refused before readiness: ${stdout} ${stderr}`));
                finish(null, result);
            } catch (error) { finish(error); }
        });
        closed.then(result => finish(new Error(`CLI serve stopped before readiness: ${JSON.stringify(result)} ${stdout} ${stderr}`)));
    });
    try { return await callback(await listening); }
    finally {
        clearTimeout(timer);
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        let stopTimer;
        try {
            const result = await Promise.race([closed, new Promise((_, reject) => {
                stopTimer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Owned CLI serve child did not stop')); }, 10000);
            })]);
            // POSIX runs the CLI's shutdown handler; Windows may terminate this
            // owned process directly for SIGTERM. Neither outcome claims browser observation.
            assert.ok(result.code === 0 || result.signal === 'SIGTERM', `Unexpected CLI stop: ${JSON.stringify(result)} ${stderr}`);
            assert.equal(stderr, '', 'Bare read-only serve must not install, launch or emit an error');
            assert.equal(stdout.trim().split('\n').length, 1);
        } finally { clearTimeout(stopTimer); }
    }
}

async function request(listening, route, value, authenticated = true) {
    const selected = new URL(listening.url); const token = selected.hash.slice('#session='.length);
    const headers = { ...(authenticated ? { 'x-workspace-session': token } : {}) };
    if (value !== undefined) Object.assign(headers, { origin: selected.origin, 'content-type': 'application/json' });
    const response = await fetch(new URL(route, selected.origin), { method: value === undefined ? 'GET' : 'POST', headers,
        ...(value === undefined ? {} : { body: JSON.stringify(value) }), signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json() };
}

module.exports = { name: 'Task tracking CLI read-only access integration', tests: [
    test('TC-TPT-145', 'report and bare serve disclose actual local read capabilities and confidence without changing canonical work or claiming an opening', async f => {
        assert.ok(Number(process.versions.node.split('.')[0]) >= 20, 'The declared optional workspace requires Node 20+');
        f.write('src/145-export.js', 'The selected source has the currently observed outcome.\n');
        await f.create('TASK-145'); await f.saved('link', 'TASK-145', { links: [{ relation: 'source', path: 'src/145-export.js' }] });
        await f.accepted('TASK-145'); await f.create('TASK-145-unrelated');
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const controls = new Map(['docs/project-config.json', '.claude/.ck.local.json', 'src/145-export.js']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const work = f.record('TASK-145'); const view = f.view('TASK-145'); const metrics = f.progress().metrics;
        const conserved = () => {
            for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
            for (const [relative, bytes] of controls) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.deepEqual(f.record('TASK-145').tracking, work.tracking);
            assert.deepEqual(f.view('TASK-145'), view); assert.deepEqual(f.progress().metrics, metrics);
        };
        const inspected = invoke(f, 'inspect');
        assert.equal(inspected.project.root, f.root); assert.equal(inspected.source.kind, 'worktree');
        assert.equal(inspected.source.remoteFreshness, 'unknown'); assert.equal(inspected.coverage, 'complete');
        assert.equal(inspected.profile.available, true); assert.deepEqual(inspected.metrics, metrics);
        assert.equal(inspected.items.find(item => item.id === 'TASK-145').verification.status, 'current');
        assert.equal(inspected.items.find(item => item.id === 'TASK-145').acceptance.accepted, true);
        assert.equal(inspected.health.status, 'unknown'); conserved();
        // Inspect only the public nonvisual report result, never its generated markup.
        const generated = invoke(f, 'report');
        assert.equal(generated.kind, 'report'); assert.equal(generated.status, 'generated');
        assert.equal(generated.coverage, 'complete'); assert.equal(generated.fingerprint, inspected.fingerprint);
        assert.equal(typeof generated.path, 'string'); assert.ok(generated.path.length > 0);
        assert.equal(generated.viewer, undefined); assert.equal(generated.launch, undefined); conserved();
        const current = invoke(f, 'report'); assert.equal(current.status, 'current');
        assert.equal(current.path, generated.path); assert.equal(current.fingerprint, generated.fingerprint); conserved();
        const pendingDraft = f.request('update', 'TASK-145', { title: 'Read-only session cannot save this draft' });
        const draft = JSON.stringify(pendingDraft);
        await withBareServe(f, async listening => {
            assert.equal(listening.status, 'listening'); assert.equal(listening.root, f.root); assert.equal(listening.writable, false);
            assert.equal(listening.launch, undefined);
            const url = new URL(listening.url);
            assert.equal(url.protocol, 'http:'); assert.equal(url.hostname, '127.0.0.1'); assert.ok(url.hash.startsWith('#session='));
            // Before a session is supplied, no selected work is returned or cached.
            const deniedRead = await request(listening, '/api/session', undefined, false);
            assert.equal(deniedRead.status, 403); assert.deepEqual(deniedRead.body, { status: 'refused', code: 'SESSION_REQUIRED' });
            const launcher = await request(listening, '/api/launcher');
            assert.equal(launcher.status, 200); assert.deepEqual(launcher.body, { reopen: false });
            const session = await request(listening, '/api/session');
            assert.equal(session.status, 200); assert.equal(session.body.root, f.root); assert.equal(session.body.actor, null);
            assert.equal(session.body.writable, false); assert.equal(session.body.profile.available, true);
            assert.equal(session.body.snapshot.source.kind, 'worktree'); assert.equal(session.body.snapshot.coverage, 'complete');
            assert.deepEqual(session.body.snapshot.metrics, metrics);
            assert.deepEqual(session.body.snapshot.items.find(item => item.id === 'TASK-145'), view); conserved();
            const scoped = await request(listening, '/api/inspect', {});
            assert.equal(scoped.status, 200); assert.equal(scoped.body.project.root, f.root);
            assert.equal(scoped.body.source.kind, 'worktree'); assert.equal(scoped.body.source.remoteFreshness, 'unknown');
            assert.equal(scoped.body.coverage, 'complete'); assert.deepEqual(scoped.body.metrics, metrics);
            const readReport = await request(listening, '/api/report', {});
            assert.equal(readReport.status, 200); assert.equal(readReport.body.status, 'current');
            assert.equal(readReport.body.path, generated.path); assert.equal(readReport.body.fingerprint, generated.fingerprint); conserved();
            const deniedSave = await request(listening, '/api/operation', pendingDraft);
            assert.equal(deniedSave.status, 403); assert.deepEqual(deniedSave.body, { status: 'refused', code: 'READ_ONLY' });
            assert.ok(!f.record('TASK-145').tracking.receipts.some(receipt => receipt.operationId === pendingDraft.operationId));
            assert.ok(!f.record('TASK-145').tracking.history.some(entry => entry.operationId === pendingDraft.operationId));
            assert.equal(JSON.stringify(pendingDraft), draft); conserved();
            const unavailable = await request(listening, '/api/inspect', { groupId: 'PROJECT-145-missing' });
            assert.equal(unavailable.status, 200); assert.equal(unavailable.body.coverage, 'unavailable');
            assert.equal(unavailable.body.scope.coverage, 'unavailable'); assert.deepEqual(unavailable.body.scope.memberIds, []);
            assert.equal(unavailable.body.metrics, null); assert.ok(unavailable.body.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
            assert.equal(unavailable.body.primary, undefined); conserved();
        });
        conserved(); assert.equal(JSON.stringify(pendingDraft), draft);
    }),
    test('TC-TPT-247', 'the shipped command lists migrate, previews it without changing anything and accepts the preview and abandon flags for migrate alone, never both', async f => {
        const help = command(f, ['help']);
        assert.ok(help.commands.includes('migrate')); assert.match(help.usage.migrate, /^migrate --root CHECKOUT \[--dry-run \| --abandon\]; .*never abandons one; .*--abandon is the only way to abandon an unfinished migration/);
        assert.ok(help.boundaries.some(line => /MIGRATION_REQUIRED/.test(line) && /migrate is run explicitly/.test(line) && /one-way/.test(line)));
        const project = await earlierProject(f);
        const stored = f.storedState();
        const preview = invoke(f, 'migrate', ['--dry-run']);
        assert.deepEqual([preview.kind, preview.status, preview.dryRun], ['migration', 'preview', true]);
        assert.deepEqual(preview.moves.map(move => [move.from, move.to]), [['work/tasks', 'work/subtasks'], ['work/pbis', 'work/tasks'], ['work/ideas', 'work/initiatives'], ['work/epics', 'work/projects']]);
        assert.deepEqual(preview.progress, { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
        // Migration is never a side effect: a read, a status request and a preview leave an earlier project as it was.
        assert.equal(invoke(f, 'inspect').vocabulary.project.code, 'MIGRATION_REQUIRED');
        // An actor or another command's option on migrate, the preview or abandon flag on any other command, and both flags at once are refused as typed.
        for (const argv of [['migrate', '--root', f.root, '--dry-run', '--actor', 'owner'], ['migrate', '--root', f.root, '--write'], ['inspect', '--root', f.root, '--dry-run'], ['migrate', '--dry-run'],
            ['inspect', '--root', f.root, '--abandon'], ['migrate', '--root', f.root, '--abandon', '--actor', 'owner'], ['migrate', '--root', f.root, '--abandon', '--dry-run'], ['migrate', '--abandon']]) {
            const refusal = command(f, argv, 1);
            assert.deepEqual([refusal.status, refusal.code], ['refused', 'INVALID_INPUT'], argv.join(' '));
        }
        assert.deepEqual(f.storedState(), stored); assert.ok(!fs.existsSync(path.join(f.root, 'work/.vocabulary-migration.json')));
    }),
    test('TC-TPT-248', 'the shipped command migrates only when asked without the preview flag and ends with a failing status whenever the migration did not finish', async f => {
        const project = await earlierProject(f);
        const expected = { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds };
        const stored = f.storedState();
        // Refused: nothing changed, failing status.
        f.write('work/pbis/BROKEN.md', 'No frontmatter here.\n');
        const refusal = invoke(f, 'migrate', [], 1);
        assert.deepEqual([refusal.kind, refusal.status, refusal.code], ['migration', 'refused', 'INCOMPLETE_SCOPE']); assert.ok(!JSON.stringify(refusal).includes(f.root));
        fs.rmSync(path.join(f.root, 'work/pbis/BROKEN.md')); assert.deepEqual(f.storedState(), stored);
        // Unfinished: a progress record this migration did not write stops the command with a failing status.
        f.write('work/.vocabulary-migration.json', '{}');
        assert.deepEqual([invoke(f, 'migrate', [], 1).status, invoke(f, 'migrate', ['--dry-run'], 1).code], ['interrupted', 'MIGRATION_IN_PROGRESS']);
        assert.equal(invoke(f, 'inspect', [], 1).diagnostics[0].code, 'MIGRATION_IN_PROGRESS');
        fs.rmSync(path.join(f.root, 'work/.vocabulary-migration.json')); assert.deepEqual(f.storedState(), stored);
        const migrated = invoke(f, 'migrate');
        assert.deepEqual([migrated.status, migrated.verified], ['migrated', true]); assert.deepEqual(migrated.progress, expected);
        const inspected = invoke(f, 'inspect');
        assert.deepEqual([inspected.vocabulary.project.state, inspected.metrics.total, inspected.metrics.accepted, inspected.metrics.eligibleIds], ['current', expected.total, expected.accepted, expected.eligibleIds]);
        assert.ok(fs.existsSync(path.join(f.root, 'work/subtasks/TASK-K.md')) && fs.existsSync(path.join(f.root, 'work/tasks/PBI-1.md')));
        // Repeated: nothing to migrate is a successful answer, for the run and for its preview.
        const after = f.storedState();
        for (const options of [[], ['--dry-run']]) assert.deepEqual([invoke(f, 'migrate', options).status, invoke(f, 'migrate', options).code], ['current', 'NOTHING_TO_MIGRATE']);
        assert.deepEqual(f.storedState(), after);
    }),
    test('TC-TPT-249', 'the shipped command abandons an unfinished migration only when asked to: asked, it ends with success once the earlier project is back whole and with a failing status before that, and unasked it never abandons', async f => {
        const project = await earlierProject(f, { commit: true });
        const expected = { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds };
        const earlier = f.storedState();
        const journal = path.join(f.root, 'work/.vocabulary-migration.json');
        // No migration is unfinished: there is nothing to abandon, which is a successful answer that changes nothing.
        assert.deepEqual([invoke(f, 'migrate', ['--abandon']).status, invoke(f, 'migrate', ['--abandon']).code], ['current', 'NOTHING_TO_ABANDON']); assert.deepEqual(f.storedState(), earlier);
        // A migration stopped just before verification, as a closed terminal would leave it.
        assert.equal((await migrate(f.root, { checkpoint: name => { if (name === 'before-verify') throw new Error('simulated interruption'); } })).status, 'interrupted');
        // Asked to abandon before anything is back: refused with a failing status, nothing changed.
        const stopped = f.storedState();
        const tooEarly = invoke(f, 'migrate', ['--abandon'], 1);
        assert.deepEqual([tooEarly.kind, tooEarly.status, tooEarly.code], ['migration', 'interrupted', 'RESTORE_INCOMPLETE']); assert.ok(tooEarly.notRestored.includes('work/pbis is not back'));
        assert.deepEqual(f.storedState(), stopped);
        git(f, ['checkout', '--', 'work', 'docs']);
        // Unasked, the command neither carries the restored project further nor abandons it, and states both ways on.
        const restored = f.storedState();
        const undecided = invoke(f, 'migrate', [], 1);
        assert.deepEqual([undecided.status, undecided.code], ['interrupted', 'RESTORED_FROM_OUTSIDE']); assert.ok(!JSON.stringify(undecided).includes(f.root));
        assert.match(undecided.abandon[1], /^remove the folders this migration created: work\/subtasks, work\/initiatives, work\/projects$/);
        assert.match(undecided.abandon.at(-1), /^run migrate --root <checkout> --abandon: it checks that the project is back whole and removes the progress record/);
        assert.match(undecided.reason, /To complete the migration instead, undo that restore: /);
        assert.equal(invoke(f, 'migrate', ['--abandon'], 1).code, 'RESTORE_INCOMPLETE'); assert.deepEqual(f.storedState(), restored);
        // The stated steps, then the request itself as the last one.
        for (const created of ['work/subtasks', 'work/initiatives', 'work/projects']) fs.rmSync(path.join(f.root, created), { recursive: true });
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/tasks']);
        assert.match(invoke(f, 'migrate', ['--dry-run'], 1).reason, /earlier project is back as it was before the migration began\. To end the migration run migrate --root <checkout> --abandon/);
        // Whole, and still not abandoned by the command without the flag.
        assert.equal(invoke(f, 'migrate', [], 1).code, 'RESTORED_FROM_OUTSIDE'); assert.ok(fs.existsSync(journal));
        const ended = invoke(f, 'migrate', ['--abandon']);
        assert.deepEqual([ended.kind, ended.status, ended.code, ended.progress], ['migration', 'abandoned', 'MIGRATION_ABANDONED', expected]);
        assert.deepEqual(f.storedState(), earlier); assert.ok(!fs.existsSync(journal));
        const inspected = invoke(f, 'inspect');
        assert.deepEqual([inspected.vocabulary.project.code, inspected.metrics.total, inspected.metrics.accepted, inspected.metrics.eligibleIds], ['MIGRATION_REQUIRED', expected.total, expected.accepted, expected.eligibleIds]);
        // A progress record the migration did not write is acted on by neither form of the command.
        f.write('work/.vocabulary-migration.json', '{}');
        for (const options of [[], ['--abandon']]) assert.deepEqual([invoke(f, 'migrate', options, 1).status, invoke(f, 'migrate', options, 1).code], ['interrupted', 'INVALID_MIGRATION_RECORD']);
        assert.equal(fs.readFileSync(journal, 'utf8'), '{}');
    }),
    test('TC-TPT-244', 'the shipped report command refuses a project that holds both vocabularies or an unfinished migration with that project\'s own reason', async f => {
        await earlierProject(f);
        const made = invoke(f, 'report'); const kept = fs.readFileSync(path.join(f.root, made.path));
        const stored = f.storedState();
        fs.mkdirSync(path.join(f.root, 'work/projects'));
        const mixed = invoke(f, 'report', [], 1);
        assert.deepEqual([mixed.status, mixed.code], ['refused', 'MIXED_VOCABULARY']); assert.match(mixed.reason, /^Mixed vocabularies: .*current: projects\); prior output preserved$/);
        fs.rmdirSync(path.join(f.root, 'work/projects')); f.write('work/.vocabulary-migration.json', '{}');
        const migrating = invoke(f, 'report', [], 1);
        assert.deepEqual([migrating.status, migrating.code], ['refused', 'MIGRATION_IN_PROGRESS']); assert.match(migrating.reason, /^Migration in progress: .*; prior output preserved$/);
        fs.rmSync(path.join(f.root, 'work/.vocabulary-migration.json'));
        assert.deepEqual(fs.readFileSync(path.join(f.root, made.path)), kept); assert.deepEqual(f.storedState(), stored);
    })
] };
