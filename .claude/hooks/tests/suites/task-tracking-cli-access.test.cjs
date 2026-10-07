'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { trackingTest: test } = require('../lib/task-tracking-fixture.cjs');

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
        await f.create('PBI-145'); await f.saved('link', 'PBI-145', { links: [{ relation: 'source', path: 'src/145-export.js' }] });
        await f.accepted('PBI-145'); await f.create('PBI-145-unrelated');
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const controls = new Map(['docs/project-config.json', '.claude/.ck.local.json', 'src/145-export.js']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const work = f.record('PBI-145'); const view = f.view('PBI-145'); const metrics = f.progress().metrics;
        const conserved = () => {
            for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
            for (const [relative, bytes] of controls) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.deepEqual(f.record('PBI-145').tracking, work.tracking);
            assert.deepEqual(f.view('PBI-145'), view); assert.deepEqual(f.progress().metrics, metrics);
        };
        const inspected = invoke(f, 'inspect');
        assert.equal(inspected.project.root, f.root); assert.equal(inspected.source.kind, 'worktree');
        assert.equal(inspected.source.remoteFreshness, 'unknown'); assert.equal(inspected.coverage, 'complete');
        assert.equal(inspected.profile.available, true); assert.deepEqual(inspected.metrics, metrics);
        assert.equal(inspected.items.find(item => item.id === 'PBI-145').verification.status, 'current');
        assert.equal(inspected.items.find(item => item.id === 'PBI-145').acceptance.accepted, true);
        assert.equal(inspected.health.status, 'unknown'); conserved();
        // Inspect only the public nonvisual report result, never its generated markup.
        const generated = invoke(f, 'report');
        assert.equal(generated.kind, 'report'); assert.equal(generated.status, 'generated');
        assert.equal(generated.coverage, 'complete'); assert.equal(generated.fingerprint, inspected.fingerprint);
        assert.equal(typeof generated.path, 'string'); assert.ok(generated.path.length > 0);
        assert.equal(generated.viewer, undefined); assert.equal(generated.launch, undefined); conserved();
        const current = invoke(f, 'report'); assert.equal(current.status, 'current');
        assert.equal(current.path, generated.path); assert.equal(current.fingerprint, generated.fingerprint); conserved();
        const pendingDraft = f.request('update', 'PBI-145', { title: 'Read-only session cannot save this draft' });
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
            assert.deepEqual(session.body.snapshot.items.find(item => item.id === 'PBI-145'), view); conserved();
            const scoped = await request(listening, '/api/inspect', {});
            assert.equal(scoped.status, 200); assert.equal(scoped.body.project.root, f.root);
            assert.equal(scoped.body.source.kind, 'worktree'); assert.equal(scoped.body.source.remoteFreshness, 'unknown');
            assert.equal(scoped.body.coverage, 'complete'); assert.deepEqual(scoped.body.metrics, metrics);
            const readReport = await request(listening, '/api/report', {});
            assert.equal(readReport.status, 200); assert.equal(readReport.body.status, 'current');
            assert.equal(readReport.body.path, generated.path); assert.equal(readReport.body.fingerprint, generated.fingerprint); conserved();
            const deniedSave = await request(listening, '/api/operation', pendingDraft);
            assert.equal(deniedSave.status, 403); assert.deepEqual(deniedSave.body, { status: 'refused', code: 'READ_ONLY' });
            assert.ok(!f.record('PBI-145').tracking.receipts.some(receipt => receipt.operationId === pendingDraft.operationId));
            assert.ok(!f.record('PBI-145').tracking.history.some(entry => entry.operationId === pendingDraft.operationId));
            assert.equal(JSON.stringify(pendingDraft), draft); conserved();
            const unavailable = await request(listening, '/api/inspect', { groupId: 'EPIC-145-missing' });
            assert.equal(unavailable.status, 200); assert.equal(unavailable.body.coverage, 'unavailable');
            assert.equal(unavailable.body.scope.coverage, 'unavailable'); assert.deepEqual(unavailable.body.scope.memberIds, []);
            assert.equal(unavailable.body.metrics, null); assert.ok(unavailable.body.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
            assert.equal(unavailable.body.primary, undefined); conserved();
        });
        conserved(); assert.equal(JSON.stringify(pendingDraft), draft);
    })
] };
