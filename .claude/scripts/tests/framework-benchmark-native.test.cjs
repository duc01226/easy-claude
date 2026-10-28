'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const files = require('../../skills/framework-benchmark/lib/files.cjs');
const contract = require('../../skills/framework-benchmark/lib/contract.cjs');
const worktrees = require('../../skills/framework-benchmark/lib/worktrees.cjs');
const login = require('../../skills/framework-benchmark/lib/native-login.cjs');
const native = require('../../skills/framework-benchmark/lib/native-cli.cjs');
const host = require('../../skills/framework-benchmark/lib/host.cjs');
const privateFiles = require('../../skills/framework-benchmark/lib/private-files.cjs');
const experiment = require('../../skills/framework-benchmark/lib/experiment.cjs');
const evaluation = require('../../skills/framework-benchmark/lib/evaluation.cjs');
const cli = require('../../skills/framework-benchmark/scripts/benchmark.cjs');
const journey = require('../../skills/framework-benchmark/lib/journey.cjs');

const scratch = path.resolve(__dirname, '../../..', 'tmp', 'tests');
function fixture() {
    fs.mkdirSync(scratch, { recursive: true });
    const root = fs.mkdtempSync(path.join(scratch, 'benchmark-native-'));
    const write = (name, value) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); return file; };
    write('login/.codex/auth.json', { auth_mode: 'chatgpt', tokens: { access_token: 'synthetic-native-access-token-123456', refresh_token: 'synthetic-native-refresh-token-123456' } });
    const runtime = { schemaVersion: 1, backend: 'host', host: 'codex', cliVersion: 'codex-cli synthetic-1', model: 'synthetic-pinned-model', judgeModel: 'synthetic-pinned-judge', repeats: 1, seed: 42, timeoutMs: 2000, maxTurns: 20 };
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG|LC_ALL)$/i.test(key)));
    Object.assign(env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root });
    return { root, write, runtime, env, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
const row = (name, value) => ({ path: name, data: Buffer.from(value), executable: false });

test('TC-FBM-082: private native storage verifies Windows ACLs before credentials and never shells a path', () => {
    const f = fixture();
    try {
        const directory = path.join(f.root, 'private space'); fs.mkdirSync(directory);
        const calls = [];
        privateFiles.protect(directory, { platform: 'win32', env: { PATH: 'tools', OPENAI_API_KEY: 'not-for-acl-helper' }, runCommand(bin, args, options) { calls.push({ bin, args, options }); return 'VERIFIED\r\n'; } });
        assert.equal(calls[0].bin, 'powershell.exe'); assert(calls[0].args.includes('-EncodedCommand')); assert(!calls[0].args.some(arg => arg.includes(directory)));
        assert.equal(calls[0].options.env.CK_BENCH_PRIVATE_DIR, directory); assert.equal(calls[0].options.env.OPENAI_API_KEY, undefined);
        assert.throws(() => privateFiles.protect(directory, { platform: 'win32', runCommand() { return 'NOT VERIFIED'; } }), /ENVIRONMENT-BLOCKED/);
        assert.throws(() => privateFiles.protect(directory, { platform: 'win32', runCommand() { throw new Error('Access denied'); } }), /ENVIRONMENT-BLOCKED/);
    } finally { f.cleanup(); }
});

test('TC-FBM-005: native runtime needs no image, API key or dollar charge and old image runtimes remain Docker', () => {
    const f = fixture();
    try {
        assert.equal(contract.validateRuntime(f.runtime), f.runtime);
        assert.equal(contract.runtimeBackend(f.runtime), 'host');
        const implicit = { ...f.runtime }; delete implicit.backend;
        assert.equal(contract.runtimeBackend(implicit), 'host');
        assert.equal(contract.runtimeBackend({ image: 'declared' }), 'docker');
        for (const backend of ['', null, false, 'unknown']) assert.throws(() => contract.validateRuntime({ ...f.runtime, backend }));
        for (const extra of [{ image: 'image' }, { memoryMb: 512 }, { cpus: 1 }, { apiKey: 'not-allowed' }, { host: 'unknown' }, { cliVersion: '' }, { budgetUsd: 0 }, { budgetUsd: 1 }, { judgeBudgetUsd: 0.2 }]) assert.throws(() => contract.validateRuntime({ ...f.runtime, ...extra }));
        assert.deepEqual(contract.measurements({ costUsd: undefined, inputTokens: 0 }), { inputTokens: 0, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, costUsd: null });
        assert.equal(cli.parseArgs(['prepare', '--case', 'case.json']).command, 'prepare');
        assert.equal(cli.parseArgs(['prepare', '--case', 'case.json', '--host', 'codex', '--model', 'pinned']).host, 'codex');
        assert.throws(() => cli.parseArgs(['prepare', '--case', 'case.json', '--runtime', 'runtime.json', '--host', 'codex']));
    } finally { f.cleanup(); }
});

test('TC-FBM-005: actual native session identity is fresh and correlated without inventing the requested session id', () => {
    const f = fixture();
    try {
        const packet = { sessionId: 'actual-native-session', requestId: 'request', host: 'codex', hostVersion: f.runtime.cliVersion };
        assert.equal(contract.runtimeIdentity(f.runtime, packet, 'request'), true);
        for (const change of [{ requestId: 'other' }, { sessionId: null }, { sessionId: '' }, { host: 'claude' }, { hostVersion: 'changed' }]) assert.equal(contract.runtimeIdentity(f.runtime, { ...packet, ...change }, 'request'), false);
        assert.equal(contract.runtimeIdentity(f.runtime, null, 'request'), false);
    } finally { f.cleanup(); }
});

test('TC-FBM-082: native profiles copy only login and never inherit personal guidance, provider keys or Git selectors', () => {
    const f = fixture();
    try {
        const original = fs.readFileSync(path.join(f.root, 'login/.codex/auth.json'));
        const credential = login.credentials('codex', { home: path.join(f.root, 'login'), env: {} });
        const profile = path.join(f.root, 'profile'); fs.mkdirSync(profile);
        const env = login.environment(profile, credential, { PATH: 'synthetic-path', OPENAI_API_KEY: 'withheld', ANTHROPIC_API_KEY: 'withheld', GH_TOKEN: 'withheld', GIT_DIR: 'foreign', CLAUDE_CONFIG_DIR: 'personal', CODEX_HOME: 'personal', CLAUDECODE: 'parent', CK_FRAMEWORK_MODE: 'off' });
        assert.equal(env.PATH, 'synthetic-path'); assert.equal(env.CK_FRAMEWORK_MODE, 'on');
        assert.equal(env.HOME, profile); assert.equal(env.USERPROFILE, profile);
        for (const name of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GH_TOKEN', 'GIT_DIR', 'CLAUDECODE']) assert.equal(env[name], undefined, name);
        assert.equal(env.CODEX_HOME, path.join(profile, '.codex'));
        assert.equal(env.CLAUDE_CONFIG_DIR, path.join(profile, '.claude'));
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(env.CODEX_HOME, 'auth.json'))), credential.auth);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'login/.codex/auth.json')), original);
        assert(!fs.existsSync(path.join(env.CODEX_HOME, 'config.toml')));
        for (const secret of credential.secrets) assert(!login.redact(`before ${secret} after`, credential.secrets).includes(secret));
        assert.throws(() => login.credentials('codex', { home: path.join(f.root, 'missing'), env: {} }), /ENVIRONMENT-BLOCKED/);
    } finally { f.cleanup(); }
});

test('TC-FBM-082: Claude native OAuth uses the existing cache or keychain without API-key fallback or secret logs', () => {
    const f = fixture();
    try {
        const token = 'synthetic-claude-oauth-123456789';
        f.write('claude-home/.claude/.credentials.json', { claudeAiOauth: { accessToken: token } });
        assert.equal(login.credentials('claude', { home: path.join(f.root, 'claude-home'), env: {} }).token, token);
        const calls = [];
        const value = login.credentials('claude', { home: path.join(f.root, 'missing'), env: {}, platform: 'darwin', runCommand(bin, args) { calls.push([bin, args]); return JSON.stringify({ claudeAiOauth: { accessToken: token } }); } });
        assert.equal(value.token, token); assert.equal(calls[0][0], 'security'); assert.deepEqual(calls[0][1].slice(0, 3), ['find-generic-password', '-s', 'Claude Code-credentials']);
        assert.throws(() => login.credentials('claude', { home: path.join(f.root, 'missing'), env: { ANTHROPIC_API_KEY: 'must-not-switch-billing' }, platform: 'linux' }), /ENVIRONMENT-BLOCKED/);
        assert.throws(() => login.credentials('claude', { home: path.join(f.root, 'missing'), env: {}, platform: 'darwin', runCommand() { throw new Error(token); } }), error => !error.message.includes(token) && /ENVIRONMENT-BLOCKED/.test(error.message));
    } finally { f.cleanup(); }
});

test('TC-FBM-082: an expiring Claude login is refreshed by the user CLI before a session and never reused stale', () => {
    const f = fixture();
    try {
        const now = () => 1_000_000;
        const stored = (token, expiresAt) => JSON.stringify({ claudeAiOauth: { accessToken: token, refreshToken: 'synthetic-refresh-123456789', expiresAt } });
        const window = { home: path.join(f.root, 'missing'), env: { HOME: 'user-home' }, platform: 'darwin', now, minValidityMs: 60_000, refreshModel: 'exact-model' };
        // Stale token: the user's own CLI runs once, then the rotated token is re-read.
        let current = stored('synthetic-stale-123456789', 1_030_000);
        const calls = [];
        const refreshed = login.credentials('claude', { ...window, runCommand(bin, args, options) {
            calls.push({ bin, args, options });
            if (bin === 'claude') { current = stored('synthetic-fresh-123456789', 9_000_000); return '{}'; }
            return current;
        } });
        assert.equal(refreshed.token, 'synthetic-fresh-123456789'); assert.equal(refreshed.refreshed, true);
        const refresh = calls.find(call => call.bin === 'claude');
        assert.deepEqual(refresh.args.slice(0, 1), ['-p']); assert.equal(refresh.args[refresh.args.indexOf('--model') + 1], 'exact-model');
        assert.equal(refresh.options.env.HOME, 'user-home', 'refresh runs in the user environment so the CLI persists the rotation');
        assert(!fs.existsSync(refresh.options.cwd), 'the refresh working directory is removed');
        // A token that outlives the window is used without any refresh call.
        const quiet = [];
        const valid = login.credentials('claude', { ...window, runCommand(bin) { quiet.push(bin); return stored('synthetic-valid-123456789', 9_000_000); } });
        assert.equal(valid.refreshed, false); assert.deepEqual(quiet, ['security']);
        // A refresh that does not rotate the token blocks instead of starting a doomed session.
        assert.throws(() => login.credentials('claude', { ...window, runCommand(bin) { return bin === 'claude' ? '{}' : stored('synthetic-stale-123456789', 1_030_000); } }),
            error => /ENVIRONMENT-BLOCKED: .*expires before this session/.test(error.message) && !error.message.includes('synthetic-stale'));
        // Discovery has no session window: an expired stored token is still only a presence check.
        assert.equal(login.credentials('claude', { ...window, minValidityMs: 0, runCommand() { return stored('synthetic-expired-123456789', 1); } }).token, 'synthetic-expired-123456789');
    } finally { f.cleanup(); }
});

test('TC-FBM-082: raw and reviewer CLI arguments disable external customization while treatment keeps native hooks and skills', () => {
    const f = fixture();
    try {
        const profile = path.join(f.root, 'profile'); fs.mkdirSync(profile);
        const workspace = path.join(f.root, 'work'); fs.mkdirSync(workspace);
        const job = { role: 'solve', arm: 'raw', sessionId: 'request', treatment: 'Use installed workflow.' };
        const raw = native.argsFor(f.runtime, job, { workspace, profile });
        assert(raw.includes('--ignore-user-config') && raw.includes('--ignore-rules') && raw.includes('project_doc_max_bytes=0'));
        assert(!raw.includes('--dangerously-bypass-approvals-and-sandbox')); assert(!raw.includes('--dangerously-bypass-hook-trust'));
        const treatment = native.argsFor(f.runtime, { ...job, arm: 'framework' }, { workspace, profile });
        assert(treatment.includes('--dangerously-bypass-hook-trust')); assert(!treatment.includes('--ignore-rules')); assert(!treatment.includes('project_doc_max_bytes=0'));
        assert(treatment.includes(`developer_instructions=${JSON.stringify(job.treatment)}`));
        // Native project admission needs a TOML table VALUE: quoted dotted CLI keys are ignored.
        // Literal argv protects POSIX/Windows path characters without adding shell interpretation.
        for (const trustedWorkspace of [workspace, '/fixture.with.dots/a space', '/fixture/"quoted"', String.raw`C:\consumer.with.dots\a space`]) {
            const args = native.argsFor(f.runtime, { ...job, arm: 'framework' }, { workspace: trustedWorkspace, profile });
            const trust = args.filter(arg => arg.startsWith('projects'));
            assert.equal(trust.length, 1);
            const table = /^projects=\{ ("(?:[^"\\]|\\.)*") = \{ trust_level = "trusted" \} \}$/.exec(trust[0]);
            assert(table, 'declared framework project trust must be a literal TOML table value');
            assert.equal(JSON.parse(table[1]), trustedWorkspace, 'the admitted project path must round-trip literally');
        }
        assert(!raw.some(arg => arg.startsWith('projects')), 'raw must not activate project hooks through trust');
        const review = native.argsFor(f.runtime, { ...job, role: 'review', reviewSchema: { type: 'object' } }, { workspace, profile });
        assert.equal(review[review.indexOf('--sandbox') + 1], 'read-only'); assert(review.includes('--output-schema'));
        assert(!review.some(arg => arg.startsWith('projects')), 'review must retain isolated control settings');
        for (const arm of ['raw', 'framework']) {
            const args = native.argsFor({ ...f.runtime, host: 'claude' }, { ...job, arm }, { workspace, profile });
            assert.equal(args.includes('--safe-mode'), arm === 'raw'); assert(!args.includes('--bare'));
            // Safe mode still lists the CLI's built-in skills; raw must see no skill at all.
            assert.equal(args.includes('--disable-slash-commands'), arm === 'raw');
            assert(args.includes('--strict-mcp-config') && args.includes('--no-session-persistence'));
            const settings = JSON.parse(args[args.indexOf('--settings') + 1]);
            assert(settings.sandbox.enabled && settings.sandbox.failIfUnavailable && !settings.sandbox.allowUnsandboxedCommands);
            // Both arms may bind loopback for real HTTP tests, while every outbound domain stays blocked.
            assert.equal(settings.sandbox.network.allowLocalBinding, true); assert.deepEqual(settings.sandbox.network.allowedDomains, []); assert.equal(settings.sandbox.network.strictAllowlist, true);
            assert(settings.claudeMdExcludes.includes(path.join(path.dirname(workspace), 'CLAUDE.md').split(path.sep).join('/')));
            assert(!settings.claudeMdExcludes.includes(path.join(workspace, 'CLAUDE.md').split(path.sep).join('/')));
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-081: detached owned worktrees preserve source bytes, ignore inherited Git redirects and reject forged cleanup', () => {
    const f = fixture(); let session;
    try {
        const input = [row('app.cjs', 'original\r\n'), row('README.md', 'ordinary docs')];
        session = worktrees.create(input, f.root);
        assert(fs.existsSync(path.join(session.work, '.git')));
        assert.equal(fs.readFileSync(path.join(session.work, 'app.cjs'), 'utf8'), 'original\r\n');
        fs.writeFileSync(path.join(session.work, 'app.cjs'), 'candidate');
        assert.equal(fs.readFileSync(path.join(session.repo, 'app.cjs'), 'utf8'), 'original\r\n');
        assert.equal(worktrees.gitEnv({ GIT_DIR: 'bad', git_work_tree: 'bad', PATH: 'good' }).GIT_DIR, undefined);
        assert.equal(worktrees.gitEnv({ GIT_DIR: 'bad', git_work_tree: 'bad', PATH: 'good' }).git_work_tree, undefined);
        assert.throws(() => worktrees.remove({ ...session }), /unowned/);
        const cleanup = worktrees.remove(session); session = null;
        assert(cleanup.worktreeRemoved && cleanup.temporaryRootRemoved); assert(!fs.existsSync(cleanup.root || path.join(f.root, 'not-created')));
        assert(fs.existsSync(path.join(f.root, 'login/.codex/auth.json')));
    } finally { if (session) worktrees.remove(session); f.cleanup(); }
});

test('TC-FBM-081: owned worktree Git calls allow a slow large checkout instead of failing at 30 seconds', () => {
    const calls = [];
    worktrees.git('/synthetic/repository', ['status'], (bin, args, options) => { calls.push({ bin, args, options }); return ''; });
    // A 6,343-file consumer checkout on a loaded machine with antivirus scanning took longer than 30 s.
    assert.equal(calls[0].bin, 'git');
    assert(calls[0].options.timeout >= 120000, 'checkout time for consumer-scale snapshots');
    assert.equal(calls[0].options.env.GIT_CONFIG_NOSYSTEM, '1');
});

test('TC-FBM-081: changed ownership markers prevent deletion and recovery retention removes credentials only', () => {
    const f = fixture(); let session;
    try {
        session = worktrees.create([row('app.cjs', 'original')], f.root);
        const marker = path.join(session.root, 'owner.json'); const original = fs.readFileSync(marker);
        fs.writeFileSync(marker, JSON.stringify({ owner: 'foreign', id: session.id }));
        assert.throws(() => worktrees.remove(session), /owner changed/); assert(fs.existsSync(session.work));
        fs.writeFileSync(marker, original);
        fs.mkdirSync(path.join(session.root, 'profile')); fs.writeFileSync(path.join(session.root, 'profile', 'credential'), 'private');
        const retained = worktrees.retain(session);
        assert(retained.credentialsRemoved && fs.existsSync(session.work)); assert(!fs.existsSync(path.join(session.root, 'profile')));
        assert(worktrees.remove(session).retainedForRecovery); assert(fs.existsSync(session.work));
        session.retained = false; worktrees.remove(session); session = null;
    } finally { if (session) { session.retained = false; worktrees.remove(session); } f.cleanup(); }
});

test('TC-FBM-005: Codex parser obtains actual model from the matching private session and preserves unknown subscription charge', async () => {
    const f = fixture();
    try {
        const profile = path.join(f.root, 'profile'); const workspace = path.join(f.root, 'work');
        fs.mkdirSync(workspace); fs.mkdirSync(profile);
        f.write('profile/.codex/sessions/day/session.jsonl', [{ type: 'session_meta', payload: { id: 'actual' } }, { type: 'turn_context', payload: { model: f.runtime.model } }].map(JSON.stringify).join('\n'));
        const stream = [{ type: 'thread.started', thread_id: 'actual' }, { type: 'item.completed', item: { type: 'agent_message', text: '{"scores":{}}' } }, { type: 'turn.completed', usage: { input_tokens: 110, cached_input_tokens: 100, cache_write_input_tokens: 0, output_tokens: 7 } }].map(JSON.stringify).join('\n');
        const parsed = await native.parse(f.runtime, { role: 'review' }, { exitCode: 0, stdout: stream }, workspace, profile);
        assert.equal(parsed.sessionId, 'actual'); assert.equal(parsed.rootModel, f.runtime.model); assert(parsed.ok);
        assert.equal(parsed.measurements.inputTokens, 10); assert.equal(parsed.measurements.cacheReadTokens, 100); assert.equal(parsed.measurements.outputTokens, 7); assert.equal(parsed.measurements.costUsd, null);
        assert.equal(native.observedModel(profile, 'other-session'), null);
        f.write('profile/.codex/sessions/day/other.jsonl', [{ type: 'session_meta', payload: { id: 'mixed' } }, { type: 'turn_context', payload: { model: 'a' } }, { type: 'turn_context', payload: { model: 'b' } }].map(JSON.stringify).join('\n'));
        assert.equal(native.observedModel(profile, 'mixed'), null);
        const invalid = await native.parse(f.runtime, { role: 'review' }, { exitCode: 1, stdout: stream + '\n' + JSON.stringify({ type: 'turn.failed' }) }, workspace, profile);
        assert.equal(invalid.ok, false);
    } finally { f.cleanup(); }
});

test('TC-FBM-082: only successful native read events engage a required installed skill', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'work'); const profile = path.join(f.root, 'profile');
        f.write('work/.agents/skills/feature-implement/SKILL.md', 'Follow the installed protocol.');
        const message = (command, code) => ({ type: 'item.completed', item: { type: 'command_execution', command, aggregated_output: code ? 'read failed' : 'Follow the installed protocol.', exit_code: code, status: 'completed' } });
        const stream = [message('cat .agents/skills/feature-implement/SKILL.md', 1), message('cat .agents/skills/feature-implement/SKILL.md', 0), message('echo feature-implement', 0), { type: 'turn.completed', usage: {} }].map(JSON.stringify).join('\n');
        const parsed = await native.parse(f.runtime, { role: 'solve' }, { exitCode: 0, stdout: stream }, workspace, profile);
        assert.deepEqual(parsed.selectedSkills, ['feature-implement']); assert.match(parsed.engagementEvidence, /not workflow completion/);
        const falseReceipt = await native.parse(f.runtime, { role: 'solve' }, { exitCode: 0, stdout: JSON.stringify({ ...message('cat .agents/skills/feature-implement/SKILL.md || true', 0), item: { ...message('x', 0).item, command: 'cat .agents/skills/feature-implement/SKILL.md || true', aggregated_output: 'File not found' } }) }, workspace, profile);
        assert.deepEqual(falseReceipt.selectedSkills, [], 'Exit0 without matching supplied content is not a load receipt');
    } finally { f.cleanup(); }
});

test('TC-FBM-082: partial native skill reads cannot substitute for a complete successful protocol load', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'work'); const profile = path.join(f.root, 'profile');
        const body = 'Protocol header\n' + 'Required behavior and ownership rules.\n'.repeat(100);
        f.write('work/.agents/skills/feature-implement/SKILL.md', body); f.write('work/README.md', body);
        const event = (output, command = 'cat .agents/skills/feature-implement/SKILL.md', exit_code = 0) => ({ type: 'item.completed', item: { type: 'command_execution', command, aggregated_output: output, exit_code, status: 'completed' } });
        const parse = events => native.parse(f.runtime, { role: 'solve' }, { exitCode: 0, stdout: events.map(JSON.stringify).join('\n') }, workspace, profile);
        assert.deepEqual((await parse([event(body.slice(0, 256), 'head -c 256 .agents/skills/feature-implement/SKILL.md')])).selectedSkills, []);
        assert.deepEqual((await parse([event(body.slice(0, 256)), event(body.slice(256), 'cat README.md')])).selectedSkills, [], 'Another file cannot complete this load');
        assert.deepEqual((await parse([event(body, undefined, 1)])).selectedSkills, []);
        assert.deepEqual((await parse([event(body.slice(0, 256)), event(body.slice(256))])).selectedSkills, ['feature-implement']);
        assert.deepEqual((await parse([event(body)])).selectedSkills, ['feature-implement']);
        f.write('work/.agents/skills/project-init/SKILL.md', body);
        assert.deepEqual((await parse([event(body.slice(0, 256), 'cat .agents/skills/project-init/SKILL.md'), event(body), event(body.slice(256), 'cat .agents/skills/project-init/SKILL.md')])).selectedSkills, ['feature-implement', 'project-init'], 'Load order follows completed reads, not first partial attempts');
    } finally { f.cleanup(); }
});

test('TC-FBM-082: literal PowerShell skill reads preserve complete-load evidence across wrappers and line endings', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'work space'); const profile = path.join(f.root, 'profile');
        const body = 'Protocol header\n' + 'Every required behavior must be read.\n'.repeat(100);
        const relative = '.agents/skills/feature-implement/SKILL.md';
        f.write('work space/' + relative, body);
        const parse = (command, output = body.replace(/\n/g, '\r\n'), exit_code = 0) => native.parse(f.runtime, { role: 'solve' }, { exitCode: 0, stdout: JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command, aggregated_output: output, exit_code } }) }, workspace, profile);
        const absolute = path.join(workspace, relative);
        for (const command of [`Get-Content -Raw -LiteralPath '${relative}'`, `Get-Content -Encoding UTF8 -Path '${absolute}'`, `powershell.exe -NoProfile -Command "Get-Content -Raw -LiteralPath '${relative}'"`, `"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoLogo -NoProfile -Command "Get-Content -Raw '${absolute}'"`]) {
            assert.deepEqual((await parse(command)).selectedSkills, ['feature-implement'], command);
        }
        assert.deepEqual((await parse(`Get-Content -TotalCount 1 '${relative}'`, body.slice(0, 256))).selectedSkills, []);
        assert.deepEqual((await parse(`Get-Content -Raw '${relative}'`, body, 1)).selectedSkills, []);
        for (const command of [`Write-Output '${relative}'`, `Get-Content '${relative}' | Select-Object -First 1`, `Get-Content '${relative}' > out.txt`, `Get-Content '../outside/SKILL.md'`]) assert.deepEqual((await parse(command)).selectedSkills, [], command);
        f.write('work space/' + relative, body.replace(/\n/g, '\r\n'));
        assert.deepEqual((await parse(`Get-Content -Raw '${relative}'`, body)).selectedSkills, ['feature-implement'], 'Supplied CRLF text and observed LF text still prove the complete same protocol');
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: Claude required-role receipts require complete successful matching Read results across native framing', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'role-work'), profile = path.join(f.root, 'role-profile');
        const role = '.claude/agents/code-reviewer.md', skill = '.claude/skills/why-review/SKILL.md';
        const body = 'Review role header\n\nInspect the complete candidate.\nPreserve the stated invariant.\nReturn independent evidence.\n';
        f.write('role-work/' + role, body.replace(/\n/g, '\r\n'));
        f.write('role-work/' + skill, 'Synthetic why-review complete protocol\n');
        f.write('role-work/.claude/agents/architect.md', body);
        const read = (id, file, content, failed = false) => [
            { type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: file } }] } },
            { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: failed, content }] } }
        ];
        const framed = body.split('\n').slice(0, -1).map((line, i) => ` ${i + 1}→${line}`).join('\r\n') + '\r\n';
        const parse = events => native.parse({ ...f.runtime, host: 'claude' }, { role: 'review', assessment: true, requiredReads: [role], workspace }, { exitCode: 0, stdout: events.map(JSON.stringify).join('\n') }, workspace, profile);
        const positive = await parse([...read('role', path.join(workspace, role), [{ type: 'text', text: framed }]),
            { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'skill', name: 'Skill', input: { skill: 'why-review' } }] } },
            { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'skill', is_error: false, content: 'Successful native skill load' }] } },
            { type: 'result', subtype: 'success', session_id: 'actual-role-session', model: f.runtime.judgeModel, structured_output: {} }
        ]);
        assert.deepEqual(positive.readReceipts.map(receipt => receipt.path), [role]);
        assert.deepEqual(positive.selectedSkills, ['why-review']);
        assert.deepEqual((await parse(read('lf', role, framed.replace(/\r\n/g, '\n')))).readReceipts.map(receipt => receipt.path), [role], 'Native framing preserves internal blank lines with LF or CRLF');
        for (const events of [read('partial', role, framed.slice(0, 30)), read('failed', role, framed, true), read('wrong', '.claude/agents/architect.md', framed),
            [{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'unfinished', name: 'Read', input: { file_path: role } }] } }],
            [{ type: 'assistant', message: { content: [{ type: 'text', text: framed }] } }]]) assert.deepEqual((await parse(events)).readReceipts, []);
        const split = body.indexOf('Preserve');
        assert.deepEqual((await parse([...read('first', role, body.slice(0, split)), ...read('second', role, body.slice(split))])).readReceipts.map(receipt => receipt.path), [role]);
        const bash = [
            { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'shell', name: 'Bash', input: { command: `cat ${role}` } }] } },
            { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'shell', is_error: false, content: body }] } }
        ];
        assert.deepEqual((await parse(bash)).readReceipts, [], 'Claude assessor instructions require native Read for role receipts');
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: Claude tab-numbered Read parts prove a complete role read only when contiguous and in order', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'tab-work'), profile = path.join(f.root, 'tab-profile');
        const role = '.claude/agents/code-reviewer.md';
        const lines = ['Review role header', '', 'Inspect the complete candidate.', 'Preserve the stated invariant.', 'Return independent evidence.'];
        f.write('tab-work/' + role, lines.join('\n') + '\n');
        // Claude Code 2.1.x frames each line as "N<TAB>text" and a ranged Read part ends without a newline.
        const part = (from, to) => lines.slice(from, to).map((line, i) => `${from + i + 1}\t${line}`).join('\n');
        const read = (id, content) => [
            { type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: role } }] } },
            { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: false, content }] } }
        ];
        const parse = events => native.parse({ ...f.runtime, host: 'claude' }, { role: 'review', assessment: true, requiredReads: [role], workspace }, { exitCode: 0, stdout: events.map(JSON.stringify).join('\n') }, workspace, profile);
        const receipts = async events => (await parse(events)).readReceipts.map(receipt => receipt.path);
        assert.deepEqual(await receipts(read('whole', part(0, 5))), [role], 'one tab-framed read is complete');
        assert.deepEqual(await receipts([...read('a', part(0, 3)), ...read('b', part(3, 5))]), [role], 'contiguous parts join at line boundaries');
        assert.deepEqual(await receipts([...read('a', part(0, 3)), ...read('c', part(4, 5))]), [], 'a skipped line is not a complete read');
        assert.deepEqual(await receipts([...read('b', part(3, 5)), ...read('a', part(0, 3))]), [], 'reversed parts do not reassemble the file');
    } finally { f.cleanup(); }
});

test('TC-FBM-079: Claude reviewers must start every citation with path:line, matching the controller check exactly', () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'cite-work'), profile = path.join(f.root, 'cite-profile');
        const review = evaluation.schema(experiment.reviewSchema(), true);
        const job = { role: 'review', assessment: true, sessionId: 'cite-session', reviewSchema: review };
        const sent = args => JSON.parse(args[args.indexOf('--json-schema') + 1]);
        const claude = sent(native.argsFor({ ...f.runtime, host: 'claude' }, job, { workspace, profile }));
        const fields = [...Object.values(claude.properties.scores.properties).map(dimension => dimension.properties.evidence),
            claude.properties.findings.items.properties.evidence, claude.properties.decisions.items.properties.reason];
        assert(fields.every(field => field.pattern === native.CITATION_PATTERN), 'every score, finding and decision citation is constrained');
        assert.equal(review.properties.findings.items.properties.evidence.pattern, undefined, 'the shared schema object is not mutated');
        // The journey observer cites its trace differently and keeps its own schema.
        const observerSchema = { type: 'object', properties: { story: { type: 'string' } } };
        assert.deepEqual(sent(native.argsFor({ ...f.runtime, host: 'claude' }, { role: 'review', sessionId: 'obs', reviewSchema: observerSchema }, { workspace, profile })), observerSchema);
        // The schema pattern accepts exactly what the controller accepts, so a conforming answer is never rejected later.
        const pattern = new RegExp(native.CITATION_PATTERN);
        const entries = [{ path: 'service.py', data: Buffer.from('a\nb\nc\n') }];
        for (const evidence of ['service.py:2 reason', 'service.py:1-3 reason', 'Prose first (service.py:2)', 'service.py:2. reason', 'service.py:0 reason']) {
            const sample = { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 3, evidence }])), findings: [] };
            let accepted = true; try { experiment.validateEvidence(sample, entries); } catch { accepted = false; }
            assert.equal(pattern.test(evidence), accepted, evidence);
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-007: Codex completed literal readers independently prove required role and skill receipts', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'role work'), profile = path.join(f.root, 'role profile');
        const role = '.claude/agents/architect.md', skill = '.claude/skills/why-review/SKILL.md';
        const body = 'Architect protocol\nCheck alternatives and factual evidence.\nPreserve all required constraints.\n';
        const skillBody = 'Complete why-review protocol\nValidate alleged causes independently.\n';
        f.write('role work/' + role, body); f.write('role work/' + skill, skillBody);
        f.write('role work/unrelated.md', body);
        const event = (command, aggregated_output, exit_code = 0, type = 'item.completed') => ({ type, item: { type: 'command_execution', command, aggregated_output, exit_code } });
        const parse = events => native.parse(f.runtime, { role: 'review', assessment: true, requiredReads: [role], workspace }, { exitCode: 0, stdout: events.map(JSON.stringify).join('\r\n') }, workspace, profile);
        for (const command of [`cat ${role}`, `Get-Content -Raw -LiteralPath '${role}'`, `powershell.exe -NoProfile -Command "Get-Content -Raw '${role}'"`]) {
            const observed = await parse([event(command, body.replace(/\n/g, '\r\n')), event(`cat ${skill}`, skillBody)]);
            assert.deepEqual(observed.readReceipts.map(receipt => receipt.path), [role], command);
            assert.deepEqual(observed.selectedSkills, ['why-review']);
        }
        for (const events of [[event(`cat ${role}`, body, 1)], [event(`cat ${role}`, body, 0, 'item.started')], [event('cat unrelated.md', body)],
            [event(`head -c 12 ${role}`, body.slice(0, 12))], [event(`echo '${role}'`, body)]]) assert.deepEqual((await parse(events)).readReceipts, []);
        const split = body.indexOf('Preserve');
        assert.deepEqual((await parse([event(`cat ${role}`, body.slice(0, split)), event(`cat ${role}`, body.slice(split))])).readReceipts.map(receipt => receipt.path), [role]);
        assert.deepEqual((await parse([event(`cat ${role}`, body.slice(0, split)), event('cat unrelated.md', body.slice(split))])).readReceipts, []);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: equipped assessment uses normal bounded native report-write permissions while legacy observers stay read-only', () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'work'), profile = path.join(f.root, 'profile'); fs.mkdirSync(workspace); fs.mkdirSync(profile);
        for (const hostName of ['claude', 'codex']) {
            const runtime = { ...f.runtime, host: hostName };
            const job = { role: 'review', assessment: true, sessionId: 'fresh', reviewSchema: experiment.reviewSchema() };
            const args = native.argsFor(runtime, job, { workspace, profile });
            if (hostName === 'codex') {
                assert.equal(args[args.indexOf('--sandbox') + 1], 'workspace-write');
                assert(args.includes('--ignore-user-config') && args.includes('--ignore-rules') && args.includes('project_doc_max_bytes=0'));
                assert(args.includes('approval_policy="never"') && args.includes('sandbox_workspace_write.network_access=false'));
                assert(!args.includes('--dangerously-bypass-approvals-and-sandbox') && !args.includes('--dangerously-bypass-hook-trust'));
                const observer = native.argsFor(runtime, { ...job, assessment: false }, { workspace, profile });
                assert.equal(observer[observer.indexOf('--sandbox') + 1], 'read-only');
            } else {
                assert(!args.includes('--safe-mode'));
                const tools = args[args.indexOf('--tools') + 1].split(',');
                for (const tool of ['Read', 'Bash', 'Skill', 'Write', 'Edit']) assert(tools.includes(tool));
                const settings = JSON.parse(args[args.indexOf('--settings') + 1]);
                assert(settings.sandbox.enabled && settings.sandbox.failIfUnavailable && !settings.sandbox.allowUnsandboxedCommands);
                assert.deepEqual(settings.sandbox.network.allowedDomains, []);
                const observer = native.argsFor(runtime, { ...job, assessment: false }, { workspace, profile });
                assert(observer.includes('--safe-mode')); assert.equal(observer[observer.indexOf('--tools') + 1], 'Read,Glob,Grep');
            }
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: native assessment retains public reports and real parser receipts before cleanup without modifying candidate or toolkit', async () => {
    const f = fixture();
    try {
        const job = { ...jobFor(f, 'review'), assessment: true, requiredReads: ['.claude/agents/code-reviewer.md'] };
        f.write('input/.claude/agents/code-reviewer.md', 'Complete synthetic reviewer role\nProtect the candidate and cite observed evidence.\n');
        f.write('input/.claude/skills/why-review/SKILL.md', 'Complete synthetic why-review protocol\nValidate retained alleged causes.\n');
        job.inputHash = files.fingerprint(files.inventory(job.workspace));
        const original = files.fingerprint(files.inventory(job.workspace));
        let work;
        const ports = portsFor(f, async (bin, args, options) => {
            work = options.cwd;
            assert.equal(args[args.indexOf('--sandbox') + 1], 'workspace-write');
            assert.equal(options.env.OPENAI_API_KEY, undefined); assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
            assert(!fs.existsSync(path.join(work, '.claude/settings.json')) && !fs.existsSync(path.join(work, '.codex/hooks.json')));
            const metadata = path.join(options.env.CODEX_HOME, 'sessions', 'current.jsonl'); fs.mkdirSync(path.dirname(metadata), { recursive: true });
            fs.writeFileSync(metadata, [{ type: 'session_meta', payload: { id: 'actual-assessor-session' } }, { type: 'turn_context', payload: { model: f.runtime.judgeModel } }].map(JSON.stringify).join('\n'));
            const events = [{ type: 'thread.started', thread_id: 'actual-assessor-session' }];
            for (const file of [job.requiredReads[0], '.claude/skills/why-review/SKILL.md']) events.push({ type: 'item.completed', item: { type: 'command_execution', command: `cat ${file}`, aggregated_output: fs.readFileSync(path.join(work, file), 'utf8'), exit_code: 0 } });
            fs.mkdirSync(path.join(work, 'tmp/reports'), { recursive: true }); fs.writeFileSync(path.join(work, 'tmp/reports/review.md'), 'app.cjs:1 inspected public result\n');
            events.push({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify({ scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 3, evidence: 'app.cjs:1 inspected artifact' }])), findings: [], decisions: [] }) } }, { type: 'turn.completed', usage: { input_tokens: 8, cached_input_tokens: 0, output_tokens: 4 } });
            for (const event of events) options.onEvent(JSON.stringify(event));
            return { exitCode: 0, failure: null, stdout: events.map(JSON.stringify).join('\n'), stderr: '' };
        });
        delete ports.parse;
        ports.worktreeOptions = { runCommand: (bin, args, options) => execFileSync(bin, args, { ...options, env: { ...f.env, ...Object.fromEntries(Object.entries(options.env || {}).filter(([key]) => /^GIT_/i.test(key))) } }) };
        const result = await host.execute(f.runtime, job, ports);
        assert.equal(result.packet.ok, true); assert.equal(result.packet.rootModel, f.runtime.judgeModel);
        assert.equal(result.packet.sessionId, 'actual-assessor-session'); assert.deepEqual(result.packet.readReceipts.map(receipt => receipt.path), job.requiredReads);
        assert.deepEqual(result.packet.selectedSkills, ['why-review']); assert.equal(result.packet.candidateIntact, true); assert.equal(result.packet.treatmentIntact, true);
        assert.equal(Buffer.from(result.packet.reviewReports.entries[0].base64, 'base64').toString(), 'app.cjs:1 inspected public result\n');
        assert.equal(result.packet.reviewReports.entries[0].path, 'review.md');
        assert(result.collection.savedBeforeCleanup && result.cleanup.worktreeRemoved && !fs.existsSync(work));
        assert.equal(files.fingerprint(files.inventory(job.workspace)), original);
        assert(fs.existsSync(path.join(path.dirname(job.observationPath), 'review-trace/manifest.json')));
        const retained = fs.readFileSync(result.collection.path, 'utf8');
        assert(!retained.includes('synthetic-native-access-token-123456'));
    } finally { f.cleanup(); }
});

test('TC-FBM-005: default native discovery freezes version and models, falls back without inference and preserves login files', () => {
    const f = fixture();
    try {
        f.write('login/.codex/config.toml', 'model = "fixture-codex-model"\n');
        f.write('login/.claude/.credentials.json', { claudeAiOauth: { accessToken: 'synthetic-claude-discovery-token-123456' } });
        f.write('login/.claude/settings.json', { model: 'fixture-claude-model' });
        const loginRoot = path.join(f.root, 'login'); const before = files.fingerprint(files.inventory(loginRoot)); const calls = [];
        const ports = { spawnSync(bin, args) { calls.push([bin, args]); assert.deepEqual(args, ['--version']); return { status: 0, stdout: `${bin} fixture-1` }; } };
        const options = { home: loginRoot, env: {} };
        const resolved = host.discoverRuntime(options, ports);
        assert.equal(resolved.host, 'codex'); assert.equal(resolved.cliVersion, 'codex fixture-1'); assert.equal(resolved.model, 'fixture-codex-model'); assert.equal(resolved.judgeModel, resolved.model);
        const fallback = host.discoverRuntime(options, { spawnSync: (bin, args) => bin === 'codex' ? { status: 1 } : ports.spawnSync(bin, args) });
        assert.equal(fallback.host, 'claude'); assert.equal(fallback.model, 'fixture-claude-model');
        const explicit = host.discoverRuntime({ ...options, host: 'claude', model: 'explicit-model', judgeModel: 'explicit-judge' }, ports);
        assert.equal(explicit.model, 'explicit-model'); assert.equal(explicit.judgeModel, 'explicit-judge'); assert.equal(explicit.host, 'claude');
        assert.throws(() => host.discoverRuntime({ ...options, model: 'latest' }, ports), /ENVIRONMENT-BLOCKED/);
        assert.equal(files.fingerprint(files.inventory(loginRoot)), before, 'Discovery leaves actual login/config bytes unchanged');
        fs.rmSync(path.join(loginRoot, '.codex/auth.json'));
        assert.equal(host.discoverRuntime(options, ports).host, 'claude', 'Unavailable first login falls back');
        fs.rmSync(path.join(loginRoot, '.claude/settings.json'));
        assert.throws(() => host.discoverRuntime(options, ports), /exact claude model/);
        // Version probes and reads made no mutation; restore only this test's deliberate removals for identity comparison.
        f.write('login/.codex/auth.json', { auth_mode: 'chatgpt', tokens: { access_token: 'synthetic-native-access-token-123456', refresh_token: 'synthetic-native-refresh-token-123456' } });
        f.write('login/.claude/settings.json', { model: 'fixture-claude-model' });
        assert.equal(files.fingerprint(files.inventory(loginRoot)), before); assert(calls.length >= 3);
    } finally { f.cleanup(); }
});

test('TC-FBM-074: Claude subscription estimate is retained separately and never called an actual charged cost', async () => {
    const f = fixture();
    try {
        const observed = await native.parse({ ...f.runtime, host: 'claude' }, { role: 'solve' }, { exitCode: 0, stdout: JSON.stringify({ type: 'result', subtype: 'success', is_error: false, usage: { input_tokens: 5, output_tokens: 2 }, total_cost_usd: 0.25 }) }, f.root, f.root);
        assert.equal(observed.measurements.costUsd, null); assert.equal(observed.billing.apiEquivalentEstimateUsd, 0.25); assert(observed.ok);
        assert.equal((await native.parse({ ...f.runtime, host: 'claude' }, { role: 'solve' }, { exitCode: 0, stdout: JSON.stringify({ type: 'result', subtype: 'success', is_error: true }) }, f.root, f.root)).ok, false);
    } finally { f.cleanup(); }
});

function jobFor(f, role = 'solve', arm = 'raw') {
    const workspace = path.join(f.root, 'input'); fs.mkdirSync(workspace, { recursive: true }); f.write('input/app.cjs', 'original');
    return { role, arm, sessionId: crypto.randomUUID(), workspace, contextRoots: ['docs/project-config.json', 'docs/project-reference', 'CLAUDE.md', 'AGENTS.md'], inputHash: files.fingerprint(files.inventory(workspace)), observationPath: path.join(f.root, 'observations', `${role}.json`), prompt: 'Synthetic task', treatment: 'Synthetic protocol', ...(role === 'review' ? { reviewSchema: experiment.reviewSchema() } : {}) };
}
function portsFor(f, capture) {
    return { loginOptions: { home: path.join(f.root, 'login'), env: {} }, spawnSync: () => ({ status: 0, stdout: f.runtime.cliVersion }), capture,
        parse: async (runtime, job) => ({ ok: true, sessionId: 'native-session', rootModel: runtime.model, selectedSkills: [], measurements: { costUsd: null } }) };
}

test('TC-FBM-005: native preflight rejects logged-out status, changed versions and missing isolation capabilities', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'input'); fs.mkdirSync(workspace);
        const runtime = { ...f.runtime, host: 'claude', cliVersion: 'claude synthetic-1' };
        f.write('login/.claude/.credentials.json', { claudeAiOauth: { accessToken: 'synthetic-claude-native-token-123456' } });
        const ports = { loginOptions: { home: path.join(f.root, 'login'), env: {} }, spawnSync: () => ({ status: 0, stdout: runtime.cliVersion }), capture: async () => ({ exitCode: 0, stdout: '{"loggedIn":false}' }) };
        await assert.rejects(host.preflight(runtime, { workspace }, ports), /login is unavailable/);
        ports.spawnSync = () => ({ status: 0, stdout: 'changed-version' });
        await assert.rejects(host.preflight(runtime, { workspace }, ports), /changed after preparation/);
        ports.spawnSync = () => ({ status: 0, stdout: runtime.cliVersion });
        ports.capture = async (bin, args) => ({ exitCode: 0, stdout: args[0] === 'auth' ? '{"loggedIn":true}' : 'old help without required flags' });
        await assert.rejects(host.preflight(runtime, { workspace }, ports), /lacks required isolation/);
        ports.capture = async (bin, args) => ({ exitCode: 0, stdout: args[0] === 'auth' ? '{"loggedIn":true}' : '--safe-mode --session-id --json-schema --setting-sources --permission-prompts' });
        await assert.rejects(host.preflight(runtime, { workspace }, ports), /lacks required isolation/, 'a CLI that cannot disable built-in skills cannot run a raw arm');
        ports.capture = async (bin, args) => ({ exitCode: 0, stdout: args[0] === 'auth' ? '{"loggedIn":true}' : '--safe-mode --disable-slash-commands --session-id --json-schema --setting-sources --permission-prompts' });
        assert.equal((await host.preflight(runtime, { workspace }, ports)).authentication, 'native-claude-login');
        assert(!fs.readdirSync(f.root).some(name => name.startsWith('native-auth-')), 'Every preflight profile is removed on success and failure');
    } finally { f.cleanup(); }
});

test('TC-FBM-081: native collection is persisted before exact worktree removal and source stays unchanged', async () => {
    const f = fixture(); let work;
    try {
        const job = jobFor(f);
        const ports = portsFor(f, async (bin, args, options) => {
            work = options.cwd;
            assert.equal(options.env.ANTHROPIC_API_KEY, undefined); assert.equal(options.env.GH_TOKEN, undefined);
            assert(!options.env.CODEX_HOME.startsWith(options.env.TMPDIR + path.sep));
            fs.writeFileSync(path.join(work, 'app.cjs'), 'implemented');
            return { exitCode: 0, failure: null, stdout: 'synthetic native trajectory', stderr: '' };
        });
        ports.persistCollection = (file, value) => {
            assert(fs.existsSync(work), 'Collection happens while owned worktree still exists');
            assert(fs.existsSync(path.join(path.dirname(work), 'profile/.codex/auth.json')));
            host.persistCollection(file, value);
        };
        const result = await host.execute(f.runtime, job, ports);
        assert.equal(fs.readFileSync(path.join(job.workspace, 'app.cjs'), 'utf8'), 'original');
        assert.equal(Buffer.from(result.packet.delta.entries[0].base64, 'base64').toString(), 'implemented');
        assert(result.collection.savedBeforeCleanup && fs.existsSync(result.collection.path));
        assert(result.cleanup.worktreeRemoved && result.cleanup.temporaryRootRemoved); assert(!fs.existsSync(work));
        const collected = fs.readFileSync(result.collection.path, 'utf8');
        assert(!collected.includes('synthetic-native-access-token-123456')); assert(collected.includes('synthetic native trajectory'));
    } finally { f.cleanup(); }
});

test('TC-FBM-077: native solve and review forward their distinct frozen output allowances', async () => {
    const f = fixture();
    try {
        for (const role of ['solve', 'review']) {
            const ports = portsFor(f, async (bin, args, options) => {
                assert.equal(options.maxOutput, (role === 'solve' ? 64 : 8) * 1024 * 1024);
                return { exitCode: 0, failure: null, stdout: '', stderr: '' };
            });
            await host.execute(f.runtime, jobFor(f, role), ports);
        }
        const env = login.environment(path.join(f.root, 'bounds-profile'), { secrets: [] });
        const exact = await host.capture(process.execPath, ['-e', 'process.stdout.write("x".repeat(100))'], { cwd: f.root, env, maxOutput: 100 });
        const exceeded = await host.capture(process.execPath, ['-e', 'process.stdout.write("x".repeat(101))'], { cwd: f.root, env, maxOutput: 100 });
        assert.equal(exact.stdout.length, 100); assert.equal(exact.failure, null); assert.equal(exceeded.failure, 'output-limit');
    } finally { f.cleanup(); }
});

test('TC-FBM-081: failed collection preserves recoverable work while removing its private credentials', async () => {
    const f = fixture(); let work;
    try {
        const job = jobFor(f);
        const ports = portsFor(f, async (bin, args, options) => { work = options.cwd; fs.writeFileSync(path.join(work, 'app.cjs'), 'valuable output'); return { exitCode: 0, failure: null, stdout: '', stderr: '' }; });
        ports.persistCollection = () => { throw new Error('synthetic disk full'); };
        await assert.rejects(host.execute(f.runtime, job, ports), /disk full/);
        assert.equal(fs.readFileSync(path.join(work, 'app.cjs'), 'utf8'), 'valuable output'); assert(!fs.existsSync(path.join(path.dirname(work), 'profile')));
        assert((await host.cleanup()).some(row => row.retainedForRecovery === work)); assert(fs.existsSync(work));
    } finally { f.cleanup(); }
});

test('TC-FBM-082: adding or editing native runtime controls invalidates treatment while generated setup is separate', async () => {
    const f = fixture();
    try {
        const job = jobFor(f, 'solve', 'framework');
        f.write('input/.agents/skills/feature-implement/SKILL.md', 'original protocol'); job.inputHash = files.fingerprint(files.inventory(job.workspace));
        const ports = portsFor(f, async (bin, args, options) => {
            const write = (name, text) => { const file = path.join(options.cwd, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
            write('.agents/skills/feature-implement/SKILL.md', 'changed protocol'); write('.codex/hooks.json', '{}');
            write('docs/project-config.json', '{"project":{"name":"Synthetic"}}'); write('docs/project-reference/rules.md', 'generated context');
            return { exitCode: 0, failure: null, stdout: '', stderr: '' };
        });
        const result = await host.execute(f.runtime, job, ports);
        assert.equal(result.packet.treatmentIntact, false); assert(result.packet.treatmentChanges.includes('.codex/hooks.json')); assert(result.packet.treatmentChanges.includes('.agents/skills/feature-implement/SKILL.md'));
        assert(result.packet.setupDelta.entries.some(row => row.path === 'docs/project-config.json')); assert(!result.packet.delta.entries.some(row => row.path.startsWith('docs/project-')));
        assert(files.withheldBenchmarkAsset('.claude/scripts/tests/framework-benchmark-native.test.cjs'));
        assert(files.withheldBenchmarkAsset('.agents/skills/framework-benchmark/cases/answers.cjs'));
    } finally { f.cleanup(); }
});

test('TC-FBM-072: native secret-bearing candidate output is refused and no exported packet can retain login tokens', async () => {
    const f = fixture(); let work;
    try {
        const job = jobFor(f);
        const ports = portsFor(f, async (bin, args, options) => { work = options.cwd; fs.writeFileSync(path.join(options.cwd, 'leaked.txt'), 'synthetic-native-access-token-123456'); return { exitCode: 0, failure: null, stdout: '', stderr: '' }; });
        await assert.rejects(host.execute(f.runtime, job, ports), /credential; export refused/);
        const refusal = fs.readFileSync(path.join(f.root, 'observations', 'solve.native-collected.json'), 'utf8');
        assert(!refusal.includes('synthetic-native-access-token-123456')); assert(refusal.includes('credential-output'));
        assert(!fs.existsSync(work), 'Discard credential-bearing candidate instead of retaining secrets');
    } finally { f.cleanup(); }
});

test('TC-FBM-077: native captures bound output and time and never expose known credential values', async () => {
    const f = fixture();
    try {
        const env = login.environment(path.join(f.root, 'profile'), { secrets: [] }, process.env);
        const timeout = await host.capture(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: f.root, env, timeoutMs: 100 });
        assert.equal(timeout.failure, 'timeout');
        const output = await host.capture(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { cwd: f.root, env, maxOutput: 100 });
        assert.equal(output.failure, 'output-limit'); assert(output.stdout.length <= 100);
        const defaultBound = await host.capture(process.execPath, ['-e', 'process.stdout.write("x".repeat(9*1024*1024))'], { cwd: f.root, env });
        assert.equal(defaultBound.failure, 'output-limit'); assert(Buffer.byteLength(defaultBound.stdout) <= 8 * 1024 * 1024);
        const items = JSON.stringify({ type: 'item.completed', item: { type: 'file_change' } }) + '\n';
        const actions = await host.capture(process.execPath, ['-e', `process.stdout.write(${JSON.stringify(items.repeat(3))})`], { cwd: f.root, env, maxActions: 1 });
        assert.equal(actions.failure, 'action-limit', 'File/tool actions consume the native work allowance too');
        const secret = 'synthetic-secret-123456';
        const redacted = await host.capture(process.execPath, ['-e', `console.log(${JSON.stringify(secret)})`], { cwd: f.root, env, secrets: [secret] });
        assert.equal(redacted.exitCode, 0); assert(!redacted.stdout.includes(secret)); assert(redacted.stdout.includes('[REDACTED]'));
    } finally { f.cleanup(); }
});

test('TC-FBM-078: native check execution has no login and uses a fresh candidate copy and actual mapped check argv', async () => {
    const f = fixture();
    try {
        const job = jobFor(f, 'check');
        const checksDir = path.join(f.root, 'checks');
        f.write('checks/check.cjs', "const fs=require('node:fs');if(process.env.CLAUDE_CODE_OAUTH_TOKEN||process.env.OPENAI_API_KEY||process.argv[2]!==process.cwd()||process.argv[3]!==__dirname)process.exit(2);fs.writeFileSync('app.cjs','checker mutation');console.log(process.env.BENCH_WORKSPACE);\n");
        Object.assign(job, { checksDir, argv: [process.execPath, '/checks/check.cjs', '/workspace', '/checks'], timeoutMs: 2000 });
        const result = await host.execute(f.runtime, job);
        assert.equal(result.exitCode, 0); assert.equal(result.failure, null); assert(result.stdout.includes('native-'));
        assert.equal(fs.readFileSync(path.join(job.workspace, 'app.cjs'), 'utf8'), 'original');
        assert(result.cleanup.worktreeRemoved && result.collection.savedBeforeCleanup);
    } finally { f.cleanup(); }
});

function campaignFixture(mode) {
    const f = fixture();
    f.write('framework/.claude/settings.json', { hooks: {} });
    f.write('framework/.claude/skills/feature-implement/SKILL.md', 'Synthetic task skill');
    f.write('framework/.agents/skills/feature-implement/SKILL.md', 'Synthetic native task skill');
    f.write('framework/.codex/config.toml', '# Synthetic native settings');
    f.write('case/checks/acceptance.cjs', 'Synthetic heldout acceptance'); f.write('case/checks/regression.cjs', 'Synthetic heldout regression');
    if (mode !== 'greenfield') f.write('case/fixture/app.cjs', 'baseline application');
    if (mode === 'brownfield-configured') { f.write('case/fixture/docs/project-config.json', { project: { name: 'Synthetic consumer' } }); f.write('case/fixture/docs/project-reference/rules.md', 'Synthetic project rules'); }
    const spec = { schemaVersion: 1, id: 'native-case', kind: mode === 'greenfield' ? 'greenfield' : 'feature', assessment: { profile: 'legacy' }, projectMode: mode, prompt: 'Deliver the stated synthetic capability.', treatment: 'Use installed feature-implement.',
        expectedSkills: ['feature-implement'], checksDir: 'checks', ...(mode === 'greenfield' ? {} : { fixture: 'fixture' }), checks: [
            { id: 'acceptance', kind: 'acceptance', baseline: 'fail', argv: ['node', '/checks/acceptance.cjs'], timeoutMs: 1000 },
            { id: 'regression', kind: 'regression', baseline: 'pass', argv: ['node', '/checks/regression.cjs'], timeoutMs: 1000 }
        ] };
    f.write('case/case.json', spec); f.write('runtime.json', f.runtime); fs.mkdirSync(path.join(f.root, 'tmp'));
    const prepare = () => experiment.prepare({ caseFile: path.join(f.root, 'case/case.json'), runtimeFile: path.join(f.root, 'runtime.json'), frameworkRoot: path.join(f.root, 'framework'), outputRoot: path.join(f.root, 'tmp') });
    const transport = mismatch => ({
        async preflight() { return { backend: 'synthetic-native', actualLoginUsed: false }; },
        async execute(runtime, job) {
            if (job.role === 'check') { const acceptance = job.argv[1].includes('acceptance'); const file = path.join(job.workspace, 'app.cjs'); const completed = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('implemented'); return { exitCode: acceptance && !completed ? 1 : 0, stdout: '', stderr: '' }; }
            const identity = { sessionId: `native-${job.sessionId}`, requestId: mismatch ? 'wrong-request' : job.sessionId, host: 'codex', hostVersion: runtime.cliVersion, rootModel: job.role === 'review' ? runtime.judgeModel : runtime.model };
            if (job.role === 'review') return { exitCode: 0, stdout: '', stderr: '', packet: { ...identity, ok: true, candidateIntact: true, review: job.purpose === 'journey' ? journeyFixture() : { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 3, evidence: 'app.cjs:1 synthetic inspected artifact' }])), findings: [] } } };
            const input = files.inventory(job.workspace);
            if (job.arm === 'raw') assert(!input.some(row => files.agentSurface(row.path) || row.path.startsWith('docs/project-')));
            else assert(input.some(row => row.path === '.agents/skills/feature-implement/SKILL.md'));
            const selectedSkills = job.arm === 'raw' ? [] : [...(mode === 'brownfield-bootstrap' ? ['project-init'] : mode === 'greenfield' ? ['workflow-greenfield-init'] : []), 'feature-implement'];
            return { exitCode: 0, stdout: '', stderr: '', packet: { ...identity, ok: true, selectedSkills, discoveredSkills: [], treatmentIntact: true, measurements: { inputTokens: 15, outputTokens: 7, costUsd: null },
                delta: { entries: [{ path: 'app.cjs', base64: Buffer.from('implemented application').toString('base64') }], deleted: [] },
                setupDelta: job.arm === 'framework' ? { entries: [{ path: 'docs/project-config.json', base64: Buffer.from(JSON.stringify({ project: { name: 'Synthetic consumer' } })).toString('base64') }, { path: 'docs/project-reference/rules.md', base64: Buffer.from('Synthetic project rules').toString('base64') }], deleted: [] } : undefined } };
        }
    });
    return { ...f, prepare, transport };
}

function journeyFixture(evidence = 'manifest.json:1 synthetic capture coverage') {
    return { story: [{ phase: 'Observed synthetic control', account: 'Fixture events only; no live behavior inferred', evidence: [evidence] }],
        aspects: Object.fromEntries(journey.ASPECTS.map(key => [key, { summary: 'Unavailable activity is explicitly unknown', evidence: [evidence], basis: 'unknown' }])),
        limitations: ['Synthetic mechanics control; citations establish locations, not semantic truth'] };
}

test('TC-FBM-083: public Codex actions preserve order, correlation and errors while hidden reasoning is excluded', () => {
    const stream = [
        { type: 'thread.started', thread_id: 'session' },
        { type: 'item.completed', item: { type: 'reasoning', text: 'PRIVATE_REASONING_SENTINEL' } },
        { type: 'item.started', item: { id: 'c1', type: 'command_execution', command: 'node --test' } },
        { type: 'item.completed', item: { id: 'c1', type: 'command_execution', command: 'node --test', aggregated_output: '1 failed case', exit_code: 1, status: 'completed' } },
        { type: 'item.completed', item: { id: 'f1', type: 'file_change', changes: [{ path: 'app.cjs', kind: 'update' }] } },
        { type: 'item.completed', item: { type: 'agent_message', text: 'I will repair the failing invariant' } },
        { type: 'error', message: 'Observed error' }, { type: 'turn.completed', usage: { input_tokens: 7 } }
    ];
    const trace = journey.collect('codex', stream.map(row => JSON.stringify(row)).join('\n'));
    assert.deepEqual(trace.records.map(row => row.sequence), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(trace.records.filter(row => row.kind === 'command').map(row => [row.toolId, row.exitCode]), [['c1', null], ['c1', 1]]);
    assert.deepEqual(JSON.parse(trace.records[0].detail), { threadId: 'session' });
    assert.deepEqual(JSON.parse(trace.records[2].detail), { command: 'node --test', output: '1 failed case', status: 'completed' });
    assert.deepEqual(JSON.parse(trace.records[3].detail).changes, [{ path: 'app.cjs', kind: 'update' }]);
    assert.equal(trace.records[4].detail, 'I will repair the failing invariant'); assert.equal(trace.records[5].detail, 'Observed error');
    assert.deepEqual(JSON.parse(trace.records[6].detail).usage, { input_tokens: 7 });
    assert.equal(trace.manifest.hiddenReasoningExcluded, 1); assert(!JSON.stringify(trace).includes('PRIVATE_REASONING_SENTINEL'));
    assert.equal(trace.manifest.complete, true); assert.equal(trace.manifest.counts['file-change'], 1); assert.equal(trace.manifest.counts.error, 1);
    assert(trace.records.every(row => row.elapsedMs === null), 'Completed-stream timestamps are not invented');
});

test('TC-FBM-083: Claude public skill requests/results and hook receipts stay observations, not inferred gates', () => {
    const stream = [{ type: 'assistant', message: { content: [{ type: 'thinking', thinking: 'HIDDEN' }, { type: 'tool_use', id: 's1', name: 'Skill', input: { skill: 'plan' } }, { type: 'text', text: 'Plan stated' }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 's1', is_error: true, content: [{ type: 'thinking', thinking: 'HIDDEN' }, { type: 'text', text: 'Load failed' }] }] } },
        { type: 'system', subtype: 'hook_response', hook_name: 'fixture-hook', exit_code: 0 }, { type: 'result', subtype: 'success' }];
    const trace = journey.collect('claude', stream.map(row => JSON.stringify(row)).join('\n'));
    assert.equal(trace.records.find(row => row.kind === 'tool').toolId, 's1');
    assert.deepEqual(JSON.parse(trace.records.find(row => row.kind === 'tool').detail), { name: 'Skill', input: { skill: 'plan' } });
    assert.deepEqual(JSON.parse(trace.records.find(row => row.kind === 'tool-result').detail), { isError: true, content: ['Load failed'] });
    assert.deepEqual(JSON.parse(trace.records.find(row => row.kind === 'hook').detail), { subtype: 'hook_response', hookName: 'fixture-hook', exitCode: 0 });
    assert.equal(trace.records.find(row => row.kind === 'message').detail, 'Plan stated');
    assert.equal(trace.manifest.counts.hook, 1); assert(!JSON.stringify(trace).includes('HIDDEN'));
    assert.equal(trace.manifest.complete, true); assert.equal(trace.manifest.counts.message, 1);
    const unknown = journey.collect('codex', JSON.stringify({ type: 'future-event', thinking: 'HIDDEN' }) + '\nnot-json');
    assert.equal(unknown.manifest.complete, false); assert.equal(unknown.manifest.malformedLines, 1); assert.equal(unknown.manifest.counts.unrecognized, 1); assert(!JSON.stringify(unknown).includes('HIDDEN'));
});

test('TC-FBM-083: interleaved Claude children keep their public enclosing identities distinct from root and unavailable provenance', () => {
    const f = fixture();
    try {
        const stream = [
            { type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'text', text: 'Root work' }] } },
            { type: 'assistant', parent_tool_use_id: 'agent-a', message: { content: [{ type: 'tool_use', id: 'read-a', name: 'Read', input: { path: 'app.cjs' } }] } },
            { type: 'assistant', parent_tool_use_id: 'agent-b', message: { content: [{ type: 'text', text: 'Independent child work' }] } },
            { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: 'agent-a', content: 'Child completed' }] } },
            { type: 'user', parent_tool_use_id: 'agent-a', message: { content: [{ type: 'tool_result', tool_use_id: 'read-a', content: 'Public source' }] } },
            { type: 'assistant', parent_tool_use_id: 'agent-b', message: { content: [{ type: 'thinking', thinking: 'PRIVATE_CHILD_THOUGHT' }, { type: 'text', text: 'Child result' }] } },
            { type: 'assistant', message: { content: [{ type: 'text', text: 'Unavailable enclosing identity' }] } },
            { type: 'result', subtype: 'success' }
        ];
        const trace = journey.collect('claude', stream.map(value => JSON.stringify(value)).join('\n'));
        assert.deepEqual(trace.records.map(value => value.parentToolUseId), [null, 'agent-a', 'agent-b', null, 'agent-a', 'agent-b', undefined, undefined]);
        assert(Object.hasOwn(trace.records[0], 'parentToolUseId')); assert(!Object.hasOwn(trace.records[6], 'parentToolUseId'));
        assert.deepEqual(trace.records.filter(value => value.toolId).map(value => [value.parentToolUseId, value.toolId]), [['agent-a', 'read-a'], [null, 'agent-a'], ['agent-a', 'read-a']]);
        assert.equal(trace.manifest.hiddenReasoningExcluded, 1); assert(!JSON.stringify(trace).includes('PRIVATE_CHILD_THOUGHT'));
        const retained = journey.retain(path.join(f.root, 'completed'), trace, { host: 'claude' });
        const saved = retained.manifest.pages.flatMap(page => fs.readFileSync(path.join(retained.directory, page.path), 'utf8').trimEnd().split('\n').map(line => JSON.parse(line)));
        assert.deepEqual(saved, trace.records);
        const watch = journey.recorder({ host: 'claude', directory: path.join(f.root, 'live'), redact: value => value.replaceAll('SECRET', '[REDACTED]') });
        watch.accept({ type: 'assistant', parent_tool_use_id: 'SECRET-' + 'x'.repeat(250), message: { content: [{ type: 'text', text: 'Public' }] } }, 0);
        watch.accept({ type: 'result', subtype: 'success' }, 1); watch.finish();
        const live = fs.readFileSync(path.join(f.root, 'live/events-0001.jsonl'), 'utf8'); const parent = JSON.parse(live.split('\n')[0]).parentToolUseId;
        assert(parent.startsWith('[REDACTED]-')); assert.equal(parent.length, 200); assert(!live.includes('SECRET'));
    } finally { f.cleanup(); }
});

test('TC-FBM-083: pinned native todo, delegation, file status, research and tool result fields stay inspectable', () => {
    const events = [
        { type: 'item.updated', item: { id: 'p', type: 'todo_list', items: [{ text: 'Implement', completed: false }] } },
        { type: 'item.completed', item: { id: 'd', type: 'collab_tool_call', tool: 'wait', sender_thread_id: 'root', receiver_thread_ids: ['child'], agents_states: { child: { status: 'completed', message: 'Review found an edge' } }, status: 'completed' } },
        { type: 'item.completed', item: { id: 'f', type: 'file_change', changes: [{ path: 'app.cjs', kind: 'update' }], status: 'failed' } },
        { type: 'item.completed', item: { id: 'w', type: 'web_search', query: 'task evidence', action: 'search', results: [] } },
        { type: 'item.completed', item: { id: 't', type: 'mcp_tool_call', server: 'fixture', tool: 'read', arguments: { path: 'app' }, status: 'completed', result: { content: [{ type: 'text', text: 'Public result' }], _meta: 'PRIVATE_META_SENTINEL' } } },
        { type: 'item.completed', item: { id: 'e', type: 'error', message: 'Nonfatal diagnostic' } }
    ];
    const trace = journey.collect('codex', events.map(row => JSON.stringify(row)).join('\n'));
    assert.deepEqual(trace.records.map(row => row.kind), ['plan', 'delegation', 'file-change', 'research', 'tool', 'error']);
    assert.deepEqual(JSON.parse(trace.records[0].detail), [{ text: 'Implement', completed: false }]);
    assert.deepEqual(JSON.parse(trace.records[1].detail), { tool: 'wait', sender: 'root', receivers: ['child'], agentsStates: { child: { status: 'completed', message: 'Review found an edge' } }, status: 'completed' });
    assert.deepEqual(JSON.parse(trace.records[2].detail), { changes: [{ path: 'app.cjs', kind: 'update' }], status: 'failed' });
    assert.deepEqual(JSON.parse(trace.records[3].detail), { query: 'task evidence', action: 'search', results: [] });
    assert.deepEqual(JSON.parse(trace.records[4].detail), { server: 'fixture', tool: 'read', arguments: { path: 'app' }, result: { content: [{ type: 'text', text: 'Public result' }] }, status: 'completed' });
    assert.equal(trace.records[5].detail, 'Nonfatal diagnostic'); assert(!JSON.stringify(trace).includes('PRIVATE_META_SENTINEL'));
});

test('TC-FBM-083: passive native records exist before completion, stay redacted and bounded, and disclose every omission', () => {
    const f = fixture();
    try {
        const directory = path.join(f.root, 'trace');
        const watch = journey.recorder({ host: 'codex', directory, captureMode: 'live-native-stream', redact: text => text.replaceAll('SECRET', '[REDACTED]'), limits: { ...journey.LIMITS, detailChars: 20, events: 2 } });
        watch.accept({ type: 'item.completed', item: { type: 'agent_message', text: 'SECRET visible message is long' } }, 0);
        const live = fs.readFileSync(path.join(directory, 'events-0001.jsonl'), 'utf8'); assert(live.includes('[REDACTED]')); assert(!live.includes('SECRET')); assert(live.includes('"elapsedMs":0'));
        const persisted = JSON.parse(live.trim()); assert.equal(persisted.detail, '[REDACTED] visible m'); assert.equal(persisted.detail.length, 20);
        assert.equal(persisted.truncated, true); assert.equal(persisted.originalChars, '[REDACTED] visible message is long'.length);
        watch.accept({ type: 'turn.completed' }, 1); watch.accept({ type: 'error', message: 'over limit' }, 2);
        const finished = watch.finish({ failure: 'timeout' }); assert.equal(finished.manifest.events, 2); assert.equal(finished.manifest.omittedEvents, 1); assert.equal(finished.manifest.clippedEvents, 1); assert.equal(finished.manifest.complete, false);
        assert.equal(finished.manifest.pages[0].sha256, files.sha(fs.readFileSync(path.join(directory, 'events-0001.jsonl'))));
        assert.throws(() => watch.accept({ type: 'error' }), /closed/); assert.throws(() => watch.finish(), /closed/);
        const byteBound = journey.recorder({ host: 'codex', limits: { ...journey.LIMITS, bytes: 1 } }); byteBound.accept({ type: 'turn.completed' }); assert.equal(byteBound.finish().manifest.omittedEvents, 1);
        const rowBound = journey.recorder({ host: 'codex', limits: { ...journey.LIMITS, pageBytes: 1 } }); rowBound.accept({ type: 'turn.completed' }); assert.equal(rowBound.finish().manifest.omittedEvents, 1);
    } finally { f.cleanup(); }
});

test('TC-FBM-083: persisted trace details preserve the exact boundary and expose the first clipped character', () => {
    const f = fixture();
    try {
        for (const size of [20, 21]) {
            const directory = path.join(f.root, `boundary-${size}`), watch = journey.recorder({ host: 'codex', directory, limits: { ...journey.LIMITS, detailChars: 20 } });
            watch.accept({ type: 'item.completed', item: { type: 'agent_message', text: 'x'.repeat(size) } }); watch.accept({ type: 'turn.completed' });
            const result = watch.finish(), first = JSON.parse(fs.readFileSync(path.join(directory, 'events-0001.jsonl'), 'utf8').split('\n')[0]);
            assert.equal(first.detail, 'x'.repeat(20)); assert.equal(first.originalChars, size); assert.equal(first.truncated, size > 20);
            assert.equal(result.manifest.clippedEvents, size > 20 ? 1 : 0); assert.equal(result.manifest.complete, size === 20);
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-083: each independent coverage gap prevents a complete trace even when a terminal event was retained', () => {
    const completion = { type: 'turn.completed' }, message = { type: 'item.completed', item: { type: 'agent_message', text: 'public message' } };
    const scenarios = [
        { name: 'missing terminal', events: [message] },
        { name: 'unknown event', events: [completion, { type: 'future-event' }], count: 'unrecognized' },
        { name: 'malformed line', events: [completion], malformed: true },
        { name: 'omitted event', events: [completion, message], limits: { ...journey.LIMITS, events: 1 } },
        { name: 'clipped detail', events: [message, completion], limits: { ...journey.LIMITS, detailChars: 8 } },
        { name: 'capture failure after terminal', events: [completion], outcome: { failure: 'timeout' } }
    ];
    assert.equal(journey.collect('codex', JSON.stringify(completion)).manifest.complete, true);
    for (const scenario of scenarios) {
        const watch = journey.recorder({ host: 'codex', limits: scenario.limits });
        for (const event of scenario.events) watch.accept(event);
        if (scenario.malformed) watch.line('not-json');
        const { manifest } = watch.finish(scenario.outcome); assert.equal(manifest.complete, false, scenario.name);
        if (scenario.count) assert.equal(manifest.counts[scenario.count], 1);
        if (scenario.malformed) assert.equal(manifest.malformedLines, 1);
    }
});

test('TC-FBM-083: streamed UTF8 split across arbitrary chunks preserves public evidence and observer failures stay visible', async () => {
    const { EventEmitter } = require('node:events');
    const data = Buffer.from(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: '予約🙂' } }));
    const spawnProcess = () => {
        const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
        child.stdin = { on() {}, end() { queueMicrotask(() => { for (const byte of data) child.stdout.emit('data', Buffer.from([byte])); child.emit('close', 0, null); }); } };
        return child;
    };
    const lines = []; const good = await host.capture('fixture', [], { spawnProcess, onEvent: line => lines.push(JSON.parse(line)) });
    assert.equal(good.failure, null); assert.equal(lines.length, 1); assert.equal(lines[0].item.text, '予約🙂'); assert.equal(good.stdout, data.toString('utf8'));
    const failed = await host.capture('fixture', [], { spawnProcess, onEvent() { throw new Error('Synthetic disk failure'); } }); assert.equal(failed.failure, 'observation-write');
});

test('TC-FBM-083: completed container records retain page hashes, explicit coverage and no hidden input', () => {
    const f = fixture();
    try {
        const collected = journey.collect('claude', JSON.stringify({ type: 'result', subtype: 'success' }));
        const retained = journey.retain(path.join(f.root, 'trace'), collected, { host: 'claude' });
        assert.equal(retained.manifest.captureMode, 'completed-stream'); assert.equal(retained.manifest.terminalObserved, true);
        assert.equal(retained.hash, files.fingerprint(files.inventory(retained.directory)));
        assert.equal(retained.manifest.pages[0].sha256, files.sha(fs.readFileSync(path.join(retained.directory, retained.manifest.pages[0].path))));
        const longStream = Array.from({ length: 20 }, (_, index) => JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: String(index).padStart(2, '0') + 'x'.repeat(59998) } })).concat(JSON.stringify({ type: 'turn.completed' })).join('\n');
        const complete = journey.collect('codex', longStream), paged = journey.retain(path.join(f.root, 'large-completed'), complete, { host: 'codex' });
        assert(paged.manifest.pages.length > 1); assert(paged.manifest.pages.every(page => page.bytes <= journey.LIMITS.pageBytes));
        const saved = paged.manifest.pages.flatMap(page => fs.readFileSync(path.join(paged.directory, page.path), 'utf8').trimEnd().split('\n').map(line => JSON.parse(line))); assert.deepEqual(saved, complete.records);
        assert.throws(() => journey.retain(path.join(f.root, 'oversized'), { records: Array(journey.LIMITS.events + 1).fill({}), manifest: {} }, { host: 'claude' }), /Invalid journey/);
        // Corrupt completed-adapter packets exercise the collector trust boundary; normal recorder output already enforces these limits.
        const tooManyBytes = { records: Array.from({ length: 280 }, () => ({ detail: 'x'.repeat(60000) })), manifest: {} };
        assert.throws(() => journey.retain(path.join(f.root, 'oversized-bytes'), tooManyBytes, { host: 'claude' }), /Journey record limit/);
        assert.throws(() => journey.retain(path.join(f.root, 'oversized-row'), { records: [{ detail: 'x'.repeat(journey.LIMITS.pageBytes) }], manifest: {} }, { host: 'claude' }), /Journey row too large/);
        const unavailable = journey.retain(path.join(f.root, 'missing'), null, { host: 'codex', stdout: '' }); assert.equal(unavailable.manifest.complete, false); assert.equal(unavailable.manifest.events, 0);
    } finally { f.cleanup(); }
});

test('TC-FBM-083: trace pagination preserves ordered records within the per-file collection boundary', () => {
    const f = fixture();
    try {
        const directory = path.join(f.root, 'pages'), watch = journey.recorder({ host: 'codex', directory, limits: { ...journey.LIMITS, pageBytes: 512 } });
        for (let i = 0; i < 10; i++) watch.accept({ type: 'item.completed', item: { type: 'agent_message', text: String(i) + 'x'.repeat(150) } });
        watch.accept({ type: 'turn.completed' }); const { manifest } = watch.finish();
        assert(manifest.pages.length > 1); assert(manifest.pages.every(page => page.bytes <= 512)); assert.equal(manifest.omittedEvents, 0); assert.equal(manifest.complete, true);
        const rows = manifest.pages.flatMap(page => fs.readFileSync(path.join(directory, page.path), 'utf8').trimEnd().split('\n').map(text => JSON.parse(text)));
        assert.deepEqual(rows.map(row => row.sequence), Array.from({ length: 11 }, (_, i) => i + 1)); assert.equal(rows.at(-1).kind, 'completion');
    } finally { f.cleanup(); }
});

test('TC-FBM-083: stories require all aspects, bounded real citations, supported uncertainty and no extra output', () => {
    const entries = [row('manifest.json', '{"events":0}\n')], accepted = journeyFixture(); assert.equal(journey.validate(accepted, entries), accepted);
    const corruptions = [value => delete value.aspects.testing, value => { value.extra = true; }, value => { value.story = []; }, value => { value.story[0].evidence = ['missing.json:1 fabricated']; }, value => { value.aspects.contextUse.evidence = ['manifest.json:3 beyond file']; }, value => { value.aspects.testing.basis = 'certain'; }, value => { value.limitations = []; }, value => { value.story[0].account = 'x'.repeat(6001); }, value => { value.aspects.planning.evidence = []; },
        value => { value.story[0].phase = 'p'.repeat(201); }, value => { value.story[0].account = ''; }, value => { value.story[0].extra = true; },
        value => { value.aspects.testing.summary = 's'.repeat(6001); }, value => { value.aspects.testing.summary = ''; }, value => { value.aspects.extra = value.aspects.testing; },
        value => { value.story[0].evidence = Array(13).fill(accepted.story[0].evidence[0]); }, value => { value.story[0].evidence = ['manifest.json:1 ' + 'e'.repeat(2001 - 'manifest.json:1 '.length)]; },
        value => { value.limitations = Array(31).fill('Bounded limitation'); }, value => { value.limitations = ['l'.repeat(2001)]; }, value => { value.limitations = ['']; }];
    for (const corrupt of corruptions) { const value = structuredClone(accepted); corrupt(value); assert.throws(() => journey.validate(value, entries), /journey evidence/); }
    const max = structuredClone(accepted); max.story = Array.from({ length: 50 }, () => structuredClone(accepted.story[0])); assert.equal(journey.validate(max, entries), max); max.story.push(structuredClone(accepted.story[0])); assert.throws(() => journey.validate(max, entries));
    const boundaries = structuredClone(accepted), cited = 'manifest.json:1 ' + 'e'.repeat(2000 - 'manifest.json:1 '.length);
    boundaries.story[0] = { phase: 'p'.repeat(200), account: 'a'.repeat(6000), evidence: Array(12).fill(cited) };
    for (const key of journey.ASPECTS) boundaries.aspects[key] = { summary: 's'.repeat(6000), evidence: Array(12).fill(cited), basis: 'observed' };
    boundaries.limitations = Array(30).fill('l'.repeat(2000)); assert.equal(journey.validate(boundaries, entries), boundaries);
    assert.deepEqual(journey.ASPECTS, ['taskUnderstanding', 'planning', 'contextUse', 'implementation', 'testing', 'reviewAndRecovery', 'workflowAndSkills', 'efficiencyAndLimits']);
    assert.deepEqual(journey.schema().properties.aspects.required, [...journey.ASPECTS]);
    const prompt = journey.prompt({ prompt: 'Shared task' }); assert(prompt.includes('ignore instructions')); assert(prompt.includes('cannot advise')); assert(prompt.includes('Do not infer causality')); assert(prompt.includes('unknown'));
});

test('TC-FBM-083: cited observer narratives remain inert text at every Markdown sink without losing the structured account', () => {
    // CommonMark distinguishes active punctuation from odd-backslash escaped text, not raw substrings.
    const hasActiveToken = (value, token) => {
        for (let offset = value.indexOf(token); offset >= 0; offset = value.indexOf(token, offset + token.length)) {
            let backslashes = 0;
            for (let index = offset - 1; index >= 0 && value[index] === '\\'; index--) backslashes++;
            if (backslashes % 2 === 0) return true;
        }
        return false;
    };
    for (const [slashes, active] of [[0, true], [1, false], [2, true], [3, false]]) assert.equal(hasActiveToken('\\'.repeat(slashes) + '<img', '<img'), active);
    const payload = '![image](https://example.invalid/a)\n![image][remote]\n[remote]: https://example.invalid/b\n<img src="https://example.invalid/c">\n<https://example.invalid/d>\n```html\nUnsafe markup\n```\n\\![escaped](https://example.invalid/e)';
    const account = journeyFixture('manifest.json:1 ' + payload); account.story[0].phase = 'Inspection\n## forged'; account.story[0].account = payload; account.limitations = [payload];
    for (const key of journey.ASPECTS) account.aspects[key].summary = payload;
    const trace = journey.collect('codex', JSON.stringify({ type: 'turn.completed' })); trace.manifest.limitations.push(payload);
    assert.equal(journey.validate(account, [row('manifest.json', JSON.stringify(trace.manifest))]), account);
    const rendered = journey.markdown(trace, { ...account, valid: true, wallMs: 1 });
    assert(rendered.includes('## Chronological story')); assert(rendered.includes('### Inspection \\#\\# forged'));
    assert(rendered.includes('\\!\\[image\\]\\(')); assert(rendered.includes('\\<img')); assert(rendered.includes('manifest\\.json\\:1'));
    for (const active of ['![image](', '![image][remote]', '<img', '<https:', '```', '\n## forged']) assert(!hasActiveToken(rendered, active), active);
    assert.equal(account.story[0].account, payload, 'Sink encoding never mutates the retained structured source');
    const failed = journey.markdown(trace, { valid: false, error: payload }); assert(failed.includes('ungraded')); assert(!hasActiveToken(failed, '![image](')); assert(!hasActiveToken(failed, '<img'));
});

test('TC-FBM-083: native journal privacy and model/session/load receipts survive exact owned cleanup', async () => {
    const f = fixture();
    try {
        const job = jobFor(f);
        const result = await host.execute(f.runtime, job, portsFor(f, async (bin, args, options) => {
            options.onEvent(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: options.env.HOME + ' synthetic-native-access-token-123456' } }));
            options.onEvent(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 3 } }));
            return { exitCode: 0, failure: null, stdout: '', stderr: '' };
        }));
        const directory = path.join(path.dirname(job.observationPath), 'journey-trace'), trace = files.inventory(directory).map(value => value.data.toString('utf8')).join('\n');
        assert(trace.includes('[PRIVATE_PROFILE]')); assert(trace.includes('[REDACTED]')); assert(!trace.includes('synthetic-native-access-token-123456'));
        assert(result.cleanup.worktreeRemoved && result.collection.savedBeforeCleanup); assert.equal(result.packet.journey.manifest.sessionId, 'native-session'); assert.deepEqual(result.packet.journey.manifest.selectedSkills, []);
        assert.equal(result.packet.journey.manifest.complete, true); assert(result.packet.journey.manifest.workflowGateCompletion.includes('unknown'));
    } finally { f.cleanup(); }
});

test('TC-FBM-083: every arm gets a fresh read-only observer without leaking its story to the blind outcome assessor', async () => {
    const f = campaignFixture('brownfield-bootstrap'); const calls = [];
    try {
        const driver = f.transport(false), execute = driver.execute;
        driver.execute = async (runtime, job) => { calls.push(job); if (job.purpose === 'journey') {
            assert(files.inventory(job.workspace).some(value => value.path === 'manifest.json')); assert(!fs.existsSync(path.join(job.workspace, 'app.cjs')));
            const args = native.argsFor(runtime, job, { workspace: job.workspace, profile: f.root }); assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only'); assert(args.includes('--ignore-rules'));
        } else if (job.role === 'review') { assert(!files.inventory(job.workspace).some(value => /journey|manifest|events-/.test(value.path))); assert(!job.prompt.includes('PUBLIC ACTIONS/MESSAGES')); }
        return execute(runtime, job); };
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver }); assert.equal(state.phase, 'complete');
        const sessions = calls.filter(job => job.role !== 'check').map(job => job.sessionId); assert.equal(sessions.length, 6); assert.equal(new Set(sessions).size, 6);
        for (const name of ['raw', 'framework']) { const arm = state.pairs[0][name]; assert(arm.journey.observer.valid && arm.review.valid && arm.success); const text = fs.readFileSync(path.join(prepared.root, arm.artifactDir, 'journey.md'), 'utf8'); assert(text.includes('Chronological story')); assert(text.includes('workflowAndSkills')); assert(text.includes('manifest\\.json\\:1')); }
        const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json'))); assert.equal(summary.campaign.journey.observedAttempts, 2); assert.equal(summary.campaign.journey.knownCostUsd, null); assert.equal(summary.campaign.journey.usage.inputTokens.total, null);
        assert(fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8').includes('Detailed story'));
    } finally { f.cleanup(); }
});

test('TC-FBM-083: maximum repeated campaigns retain complete detailed accounts while saved state and public reports stay reloadable', async () => {
    const f = campaignFixture('brownfield-bootstrap');
    try {
        f.write('runtime.json', { ...f.runtime, repeats: 20 });
        const citation = 'manifest.json:1 ' + 'e'.repeat(2000 - 'manifest.json:1 '.length);
        const detailed = journeyFixture(citation);
        detailed.story = Array.from({ length: 50 }, (_, index) => ({ phase: `Observed phase ${index}`, account: 'a'.repeat(6000), evidence: [citation] }));
        for (const key of journey.ASPECTS) detailed.aspects[key].summary = 's'.repeat(6000);
        detailed.limitations = Array.from({ length: 30 }, () => 'l'.repeat(2000));
        const driver = f.transport(false), execute = driver.execute;
        driver.execute = async (runtime, job) => {
            const result = await execute(runtime, job);
            if (job.purpose === 'journey') { result.packet.review = detailed; result.packet.measurements = { inputTokens: 4, outputTokens: 2, costUsd: null }; }
            return result;
        };
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver });
        assert.equal(state.phase, 'complete'); assert.equal(state.pairs.length, 20);
        assert(Buffer.byteLength(JSON.stringify(detailed)) * 40 > 16 * 1024 * 1024, 'Fixture exceeds the aggregate reader bound if stories are embedded');
        assert(fs.statSync(path.join(prepared.root, 'result.json')).size < 16 * 1024 * 1024);
        const loaded = experiment.load(prepared.root); assert.equal(loaded.state.phase, 'complete'); assert.equal(loaded.state.pairs.length, 20);
        for (const pair of loaded.state.pairs) for (const name of ['raw', 'framework']) {
            const arm = pair[name], observer = arm.journey.observer; assert(observer.valid && arm.success && arm.review.valid);
            for (const key of ['story', 'aspects', 'limitations']) assert(!Object.hasOwn(observer, key), 'Central state keeps bounded metadata and artifact identity only');
            assert.equal(observer.artifact.path, `${arm.artifactDir}/journey-story.json`);
            const stored = fs.readFileSync(path.join(prepared.root, observer.artifact.path)); assert.equal(files.sha(stored), observer.artifact.sha256); assert.deepEqual(JSON.parse(stored), detailed);
            assert(fs.readFileSync(path.join(prepared.root, arm.artifactDir, 'journey.md'), 'utf8').includes('Observed phase 49'));
            assert.equal(observer.measurements.inputTokens, 4); assert.equal(observer.measurements.costUsd, null); assert(observer.sessionId);
        }
        assert.equal(await cli.main(['report', '--run', prepared.root], { log() {} }), 0);
        const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json'))); assert.equal(summary.campaign.journey.observedAttempts, 40); assert.equal(summary.campaign.journey.usage.inputTokens.total, 160); assert.equal(summary.campaign.journey.knownCostUsd, null);
        assert(fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8').includes('Detailed story'));
    } finally { f.cleanup(); }
});

test('TC-FBM-083: malformed, reused, unavailable and tampering observers stay ungraded without rewriting solver outcomes', async () => {
    for (const fault of ['citation', 'aspect', 'model', 'session', 'request', 'completion', 'intact', 'throw', 'tamper']) {
        const f = campaignFixture('greenfield');
        try {
            const driver = f.transport(false), execute = driver.execute; let solves = 0, observers = 0; let solverId;
            driver.execute = async (runtime, job) => {
                if (job.role === 'solve') solves++;
                if (job.purpose === 'journey' && fault === 'throw') { observers++; throw new Error('Synthetic observer outage'); }
                const result = await execute(runtime, job);
                if (job.role === 'solve') solverId = result.packet.sessionId;
                if (job.purpose === 'journey') { observers++;
                    if (fault === 'citation') result.packet.review.story[0].evidence = ['missing:1 fabricated'];
                    if (fault === 'aspect') delete result.packet.review.aspects.testing;
                    if (fault === 'model') result.packet.rootModel = 'other';
                    if (fault === 'session') result.packet.sessionId = solverId;
                    if (fault === 'request') result.packet.requestId = 'another-request';
                    if (fault === 'completion') { result.packet.ok = false; result.packet.failureClass = 'infrastructure'; }
                    if (fault === 'intact') result.packet.candidateIntact = false;
                    if (fault === 'tamper') fs.appendFileSync(path.join(job.workspace, 'manifest.json'), '\n ');
                }
                return result;
            };
            const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver }); assert.equal(state.phase, 'inconclusive', fault); assert.equal(solves, 2); assert.equal(observers, 2); assert(state.pairs[0].valid);
            for (const name of ['raw', 'framework']) { const arm = state.pairs[0][name]; assert(arm.success && arm.review.valid); assert.equal(arm.journey.observer.valid, false); assert(arm.journey.observer.error);
                // The error names the failed condition, so a provider refusal is not mistaken for tampering.
                const named = { model: /observed model differs/, session: /reused session|identity mismatch/, request: /identity mismatch/, completion: /session failed: infrastructure/, intact: /evidence modified/ }[fault];
                if (named) assert.match(arm.journey.observer.error, named, fault); assert(fs.existsSync(path.join(prepared.root, arm.artifactDir, 'journey.md'))); }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-079: maximum repeated multilingual quality assessments retain every finding while saved reports remain reloadable', async () => {
    const f = campaignFixture('brownfield-bootstrap');
    try {
        f.write('runtime.json', { ...f.runtime, repeats: 20 });
        const prefix = 'app.cjs:1 ', citation = prefix + '€'.repeat(2000 - prefix.length);
        const detailed = { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 3, evidence: citation }])),
            findings: Array.from({ length: 50 }, () => ({ severity: 'medium', evidence: citation, consequence: '€'.repeat(2000) })) };
        assert.equal(Object.keys(detailed.scores).length, 8);
        const driver = f.transport(false), execute = driver.execute;
        driver.execute = async (runtime, job) => {
            const result = await execute(runtime, job);
            if (job.role === 'review' && job.purpose !== 'journey') { result.packet.review = detailed; result.packet.measurements = { inputTokens: 6, outputTokens: 4, costUsd: null }; }
            return result;
        };
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver });
        assert.equal(state.phase, 'complete'); assert.equal(state.pairs.length, 20);
        assert(Buffer.byteLength(JSON.stringify(detailed)) * 40 > 16 * 1024 * 1024, 'Valid quality narratives exceed the state reader when embedded across all admitted pairs');
        assert(fs.statSync(path.join(prepared.root, 'result.json')).size < 16 * 1024 * 1024);
        const loaded = experiment.load(prepared.root); assert.equal(loaded.state.phase, 'complete');
        for (const pair of loaded.state.pairs) for (const name of ['raw', 'framework']) {
            const arm = pair[name], review = arm.review; assert(review.valid && arm.success && arm.journey.observer.valid);
            assert(!Object.hasOwn(review, 'findings'), 'Full findings are retained outside central campaign state');
            assert.deepEqual(review.scores, Object.fromEntries(contract.DIMENSIONS.map(dimension => [dimension, { score: 3 }])));
            assert.equal(review.artifact.path, `${arm.artifactDir}/quality-assessment.json`);
            const stored = fs.readFileSync(path.join(prepared.root, review.artifact.path)); assert.equal(files.sha(stored), review.artifact.sha256); assert.deepEqual(JSON.parse(stored), detailed);
            assert.equal(review.measurements.inputTokens, 6); assert.equal(review.measurements.outputTokens, 4); assert.equal(review.measurements.costUsd, null); assert(review.sessionId);
        }
        assert.equal(await cli.main(['report', '--run', prepared.root], { log() {} }), 0);
        const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json'))); assert.equal(summary.validPairs, 20); assert.equal(summary.qualityPairs, 20);
        assert.equal(summary.arms.raw.meanQuality, 75); assert.equal(summary.arms.framework.meanQuality, 75); assert.equal(summary.qualityDelta, 0);
        assert.equal(summary.campaign.review.observedAttempts, 40); assert.equal(summary.campaign.review.usage.inputTokens.total, 240); assert.equal(summary.campaign.review.knownCostUsd, null);
        const report = fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8');
        for (const pair of loaded.state.pairs) for (const name of ['raw', 'framework']) assert(report.includes(`[Full assessment](${pair[name].review.artifact.path})`));
    } finally { f.cleanup(); }
});

test('TC-FBM-083: maximum repeated native engagement keeps every receipt externally and bounded state reloads without changing fidelity', async () => {
    const f = campaignFixture('brownfield-configured');
    try {
        const runtime = { ...f.runtime, repeats: 20, maxTurns: 500 }; f.write('runtime.json', runtime);
        const names = Array.from({ length: 2000 }, (_, index) => (`skill-${String(index).padStart(4, '0')}-`).padEnd(64, 'x'));
        const paths = names.map(name => `.agents/skills/${name}/SKILL.md`);
        for (let index = 0; index < names.length; index++) f.write(`framework/${paths[index]}`, `---\nname: ${names[index]}\ndescription: Synthetic independent capability\n---\nUse this synthetic capability for its declared task.\n`);
        paths.push('.agents/skills/feature-implement/SKILL.md');
        const events = [{ type: 'thread.started', thread_id: 'synthetic-bulk-reader' }];
        for (let index = 0; index < paths.length; index += 100) {
            const batch = paths.slice(index, index + 100), output = batch.map(file => fs.readFileSync(path.join(f.root, 'framework', file), 'utf8')).join('');
            events.push({ type: 'item.completed', item: { type: 'command_execution', command: `cat ${batch.join(' ')}`, aggregated_output: output, exit_code: 0, status: 'completed' } });
        }
        events.push({ type: 'turn.completed', usage: { input_tokens: 15, cached_input_tokens: 0, output_tokens: 7 } });
        const stdout = events.map(event => JSON.stringify(event)).join('\n'), workspace = path.join(f.root, 'framework');
        assert(events.filter(event => event.type === 'item.completed').length < 500); assert(Buffer.byteLength(stdout) < 64 * 1024 * 1024);
        assert(files.inventory(workspace).length < files.LIMITS.files);
        const parsed = await native.parse(runtime, { role: 'solve', workspace, frameworkRoot: workspace }, { exitCode: 0, stdout }, workspace, path.join(f.root, 'no-private-session'));
        assert.deepEqual(parsed.selectedSkills, [...names, 'feature-implement']); assert.deepEqual(parsed.attemptedSkills, parsed.selectedSkills); assert.equal(parsed.skillReceipts.length, 2001);
        const complete = journey.collect('codex', stdout);
        Object.assign(complete.manifest, { selectedSkills: parsed.selectedSkills, attemptedSkills: parsed.attemptedSkills, skillReceipts: parsed.skillReceipts });
        assert(Buffer.byteLength(JSON.stringify(complete.manifest, null, 2)) < files.LIMITS.fileBytes);
        const oldShape = { pairs: Array.from({ length: 20 }, () => ({ framework: { solver: { selectedSkills: parsed.selectedSkills, attemptedSkills: parsed.attemptedSkills }, journey: { trace: complete } } })) };
        assert(Buffer.byteLength(JSON.stringify(oldShape)) > 16 * 1024 * 1024, 'Actual native engagement alone breaks the old aggregate layout even without pretty whitespace');
        const usage = { 'synthetic-pinned-model': { inputTokens: 15, outputTokens: 7 } }, driver = f.transport(false), execute = driver.execute;
        driver.execute = async (runtime, job) => {
            const result = await execute(runtime, job);
            if (job.role === 'solve' && job.arm === 'framework') Object.assign(result.packet, { selectedSkills: parsed.selectedSkills, attemptedSkills: parsed.attemptedSkills, modelUsage: usage, journey: complete });
            return result;
        };
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver }); assert.equal(state.phase, 'complete'); assert.equal(state.pairs.length, 20);
        assert(fs.statSync(path.join(prepared.root, 'result.json')).size < 16 * 1024 * 1024);
        const loaded = experiment.load(prepared.root);
        for (const pair of loaded.state.pairs) {
            const arm = pair.framework; assert(arm.valid && arm.success && arm.treatmentFidelity && arm.review.valid && arm.journey.observer.valid);
            assert.equal(arm.solver.selectedSkills.length, 64); assert.equal(arm.solver.attemptedSkills.length, 64); assert(!arm.solver.selectedSkills.includes('feature-implement'), 'Fidelity uses complete receipts beyond the central preview');
            assert.deepEqual(arm.solver.engagement, { selectedCount: 2001, attemptedCount: 2001, listedLimit: 64, complete: false, artifact: arm.solver.engagement.artifact });
            assert.equal(arm.solver.engagement.artifact.path, `${arm.artifactDir}/solver-observation.json`);
            const observedBytes = fs.readFileSync(path.join(prepared.root, arm.solver.engagement.artifact.path)); assert.equal(files.sha(observedBytes), arm.solver.engagement.artifact.sha256);
            const observation = JSON.parse(observedBytes); assert.deepEqual(observation.packet.selectedSkills, parsed.selectedSkills); assert.deepEqual(observation.packet.attemptedSkills, parsed.attemptedSkills); assert.deepEqual(observation.packet.modelUsage, usage);
            assert.deepEqual(arm.solver.modelUsage, { artifact: arm.solver.engagement.artifact });
            for (const key of ['selectedSkills', 'attemptedSkills', 'skillReceipts', 'pages']) assert(!Object.hasOwn(arm.journey.trace.manifest, key), 'Central trace is a declared summary, not growing engagement detail');
            assert.equal(arm.journey.trace.manifestArtifact.path, `${arm.artifactDir}/journey-trace/manifest.json`);
            const manifestBytes = fs.readFileSync(path.join(prepared.root, arm.journey.trace.manifestArtifact.path)); assert.equal(files.sha(manifestBytes), arm.journey.trace.manifestArtifact.sha256);
            const manifest = JSON.parse(manifestBytes); assert.deepEqual(manifest.selectedSkills, parsed.selectedSkills); assert.deepEqual(manifest.attemptedSkills, parsed.attemptedSkills); assert.deepEqual(manifest.skillReceipts, parsed.skillReceipts);
            assert.equal(arm.journey.trace.manifest.events, manifest.events); assert.equal(arm.journey.trace.manifest.complete, manifest.complete);
            assert.deepEqual(pair.raw.solver.selectedSkills, []); assert.equal(pair.raw.solver.engagement.selectedCount, 0); assert.equal(pair.raw.solver.engagement.complete, true);
            assert.equal(arm.solver.measurements.inputTokens, 15); assert.equal(arm.solver.measurements.costUsd, null);
        }
        assert.equal(await cli.main(['report', '--run', prepared.root], { log() {} }), 0);
        const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json'))); assert.equal(summary.validPairs, 20); assert.equal(summary.arms.framework.passed, 20); assert.equal(summary.campaign.solver.usage.inputTokens.total, 600); assert.equal(summary.campaign.solver.knownCostUsd, null);
    } finally { f.cleanup(); }
});

test('TC-FBM-079: an assessment that cannot be retained stays ungraded while its observation and objective outcome survive', async () => {
    const f = campaignFixture('greenfield');
    try {
        const driver = f.transport(false), execute = driver.execute;
        driver.execute = async (runtime, job) => {
            const result = await execute(runtime, job);
            // A local filesystem collision models failed artifact retention without OS-specific permissions or injected globals.
            if (job.role === 'review' && job.purpose !== 'journey') fs.mkdirSync(path.join(path.dirname(job.observationPath), 'quality-assessment.json'));
            return result;
        };
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: driver }); assert.equal(state.phase, 'inconclusive'); assert(state.pairs[0].valid);
        for (const name of ['raw', 'framework']) {
            const arm = state.pairs[0][name]; assert(arm.success && arm.journey.observer.valid); assert.equal(arm.review.valid, false); assert(arm.review.error); assert.equal(arm.review.artifact, undefined);
            const observation = JSON.parse(fs.readFileSync(path.join(prepared.root, arm.artifactDir, 'review-observation.json'))); assert.equal(observation.packet.review.scores.correctness.score, 3);
        }
        assert.equal(await cli.main(['report', '--run', prepared.root], { log() {} }), 0);
        const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json'))); assert.equal(summary.qualityPairs, 0); assert.equal(summary.arms.raw.meanQuality, null); assert.equal(summary.arms.framework.meanQuality, null);
    } finally { f.cleanup(); }
});

test('TC-FBM-079: saved embedded assessments remain readable with the same scores and explicit evidence location', async () => {
    const f = campaignFixture('greenfield');
    try {
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: f.transport(false) }); assert.equal(state.phase, 'complete');
        const legacy = structuredClone(state);
        for (const name of ['raw', 'framework']) {
            const arm = legacy.pairs[0][name], full = JSON.parse(fs.readFileSync(path.join(prepared.root, arm.review.artifact.path)));
            arm.review = { ...arm.review, ...full }; delete arm.review.artifact; delete arm.journey;
        }
        f.write('legacy/result.json', legacy);
        assert.equal(await cli.main(['report', '--run', path.join(f.root, 'legacy')], { log() {} }), 0);
        const summary = JSON.parse(fs.readFileSync(path.join(f.root, 'legacy/summary.json'))); assert.equal(summary.qualityPairs, 1); assert.equal(summary.arms.raw.meanQuality, 75); assert.equal(summary.arms.framework.meanQuality, 75);
        assert(fs.readFileSync(path.join(f.root, 'legacy/report.md'), 'utf8').includes('embedded in result.json'));
    } finally { f.cleanup(); }
});

for (const mode of ['greenfield', 'brownfield-bootstrap', 'brownfield-configured']) {
    test(`TC-FBM-005: full native ${mode} experiment preserves matched inputs, true sessions, fidelity, grading and nullable cost`, async () => {
        const f = campaignFixture(mode);
        try {
            const prepared = f.prepare(); assert.equal(prepared.configuredModelBudgetUsd, null);
            const state = await experiment.run(prepared.root, { transport: f.transport(false) });
            assert.equal(state.phase, 'complete'); assert.equal(state.pairs.length, 1); assert(state.pairs[0].valid);
            for (const name of ['raw', 'framework']) {
                const arm = state.pairs[0][name]; assert(arm.success && arm.valid && arm.review.valid); assert(arm.solver.sessionId.startsWith('native-'));
                assert.equal(arm.solver.measurements.costUsd, null); assert.equal(arm.solver.measurements.inputTokens, 15); assert.equal(arm.checks.filter(row => row.passed).length, 2);
            }
            const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json')));
            assert.equal(summary.measuredCostPairs, 0); assert.equal(summary.arms.raw.knownSolverCostUsd, null);
            assert.throws(() => experiment.verifyFrozen(prepared.root, { ...state, runtime: { ...state.runtime, cliVersion: 'changed' } }), /Frozen/);
            await assert.rejects(experiment.run(prepared.root, { transport: f.transport(false) }), /already attempted/);
        } finally { f.cleanup(); }
    });
}

test('TC-FBM-005: mismatched native request correlation cannot become a valid paired comparison or assessment', async () => {
    const f = campaignFixture('brownfield-bootstrap');
    try {
        const prepared = f.prepare(); const state = await experiment.run(prepared.root, { transport: f.transport(true) });
        assert.equal(state.phase, 'inconclusive'); assert.equal(state.pairs[0].valid, false);
        for (const name of ['raw', 'framework']) { assert.equal(state.pairs[0][name].valid, false); assert.equal(state.pairs[0][name].review.valid, false); }
    } finally { f.cleanup(); }
});

test('TC-FBM-072 TC-FBM-082: recognized private Claude cache never enters either backend frozen inputs', () => {
    const f = campaignFixture('greenfield');
    try {
        const sentinel = 'synthetic-framework-cache-secret-123456';
        f.write('framework/.claude/.credentials.json', { claudeAiOauth: { accessToken: sentinel } });
        assert(files.secretFile('.claude/.credentials.json'));
        const docker = { schemaVersion: 1, image: 'fixture@sha256:' + 'a'.repeat(64), model: 'fixture-model', judgeModel: 'fixture-judge', claudeVersion: 'fixture-1', repeats: 1, seed: 42, timeoutMs: 2000, maxTurns: 20, memoryMb: 512, cpus: 1, budgetUsd: 1, judgeBudgetUsd: 1 };
        for (const runtime of [f.runtime, docker]) {
            f.write('runtime.json', runtime); const prepared = f.prepare();
            for (const folder of ['base', 'framework']) assert(!files.inventory(path.join(prepared.root, folder)).some(row => row.path.endsWith('.credentials.json') || row.data.includes(Buffer.from(sentinel))));
        }
        assert(fs.existsSync(path.join(f.root, 'framework/.claude/.credentials.json')), 'Source cache is preserved, not deleted');
    } finally { f.cleanup(); }
});

test('TC-FBM-071: changing executing shared observation code rejects a sealed run before any solver', () => {
    const f = campaignFixture('greenfield');
    const read = fs.readFileSync;
    try {
        const prepared = f.prepare(); const { state } = experiment.load(prepared.root);
        const helper = path.resolve(__dirname, '../lib/read-evidence.cjs');
        fs.readFileSync = function(file, ...args) {
            const value = read.call(fs, file, ...args);
            if (typeof file !== 'string' || path.resolve(file) !== helper) return value;
            return Buffer.isBuffer(value) ? Buffer.concat([value, Buffer.from('\n// synthetic observer change')]) : value + '\n// synthetic observer change';
        };
        assert.throws(() => experiment.verifyFrozen(prepared.root, state), /Frozen benchmark inputs changed/);
        fs.readFileSync = read;
        assert.doesNotThrow(() => experiment.verifyFrozen(prepared.root, state));
    } finally { fs.readFileSync = read; f.cleanup(); }
});

test('TC-FBM-073: known native task failure stays in the paired denominator while provider failures remain invalid', async () => {
    for (const [message, valid] of [['Codex ran out of room in the model\'s context window. Start a new thread or clear earlier history before retrying.', true], ['Unauthorized: login expired', false], ['Unrecognized native failure', false]]) {
        const f = campaignFixture('greenfield');
        try {
            const prepared = f.prepare(); const transport = f.transport(false); const original = transport.execute;
            transport.execute = async (runtime, job) => {
                if (job.role !== 'solve' || job.arm !== 'framework') return original(runtime, job);
                const ports = portsFor(f, async (bin, args, options) => {
                    const sessionId = `failed-${job.sessionId}`;
                    const metadata = path.join(options.env.CODEX_HOME, 'sessions', 'current.jsonl'); fs.mkdirSync(path.dirname(metadata), { recursive: true });
                    fs.writeFileSync(metadata, [{ type: 'session_meta', payload: { id: sessionId } }, { type: 'turn_context', payload: { model: runtime.model } }].map(JSON.stringify).join('\n'));
                    fs.writeFileSync(path.join(options.cwd, 'app.cjs'), 'implemented task output');
                    return { exitCode: 1, failure: null, stdout: [{ type: 'thread.started', thread_id: sessionId }, { type: 'turn.failed', error: { message } }].map(JSON.stringify).join('\n'), stderr: '' };
                });
                delete ports.parse;
                return host.execute(runtime, job, ports);
            };
            const state = await experiment.run(prepared.root, { transport });
            assert.equal(state.pairs[0].framework.valid, valid); assert.equal(state.pairs[0].framework.success, false);
            const summary = JSON.parse(fs.readFileSync(path.join(prepared.root, 'summary.json')));
            assert.equal(summary.validPairs, valid ? 1 : 0); assert.equal(summary.invalidPairs, valid ? 0 : 1);
            assert.equal(summary.successDelta, valid ? -1 : null);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-005: public prepare without a runtime file discovers a fixture native version and no inference', () => {
    const f = campaignFixture('greenfield');
    try {
        const bin = path.join(f.root, 'bin'); fs.mkdirSync(bin);
        const executable = path.join(bin, process.platform === 'win32' ? 'codex.exe' : 'codex');
        if (process.platform === 'win32') fs.copyFileSync(process.execPath, executable); else fs.symlinkSync(process.execPath, executable);
        f.write('login/.codex/config.toml', 'model = "fixture-configured-model"\n');
        const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../skills/framework-benchmark/scripts/benchmark.cjs'), 'prepare', '--case', 'case/case.json', '--framework', 'framework', '--out', 'tmp/public', '--host', 'codex'], {
            cwd: f.root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
            env: { ...f.env, PATH: bin + path.delimiter + (process.env.PATH || ''), HOME: path.join(f.root, 'login'), USERPROFILE: path.join(f.root, 'login'), CODEX_HOME: path.join(f.root, 'login/.codex'), CLAUDE_CONFIG_DIR: path.join(f.root, 'login/.claude'), CLAUDE_PROJECT_DIR: f.root,
                TMPDIR: f.root, TEMP: f.root, TMP: f.root, NODE_OPTIONS: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' }
        });
        assert.equal(run.status, 0, run.stderr || run.error?.message);
        const prepared = JSON.parse(run.stdout); const { state } = experiment.load(prepared.root);
        assert.equal(state.phase, 'prepared'); assert.equal(state.baseline, null); assert.deepEqual(state.pairs, []);
        assert.equal(state.runtime.model, 'fixture-configured-model'); assert.equal(state.runtime.judgeModel, 'fixture-configured-model'); assert.equal(state.runtime.cliVersion, process.version);
    } finally { f.cleanup(); }
});

test('TC-FBM-081: controller SIGTERM retains in-flight work, removes credentials and stops owned descendants', async () => {
    const f = campaignFixture('greenfield'); let child; let descendant;
    try {
        const prepared = f.prepare();
        const marker = path.join(f.root, 'ready.json');
        const worker = f.write('worker.cjs', `const fs=require('node:fs'),cp=require('node:child_process');
const descendant=cp.spawn(process.execPath,['-e','console.log("DESCENDANT_READY");process.send("ready");setInterval(()=>{},1000)'],{stdio:['ignore','inherit','inherit','ipc']});
descendant.once('message',()=>{fs.writeFileSync('valuable.cjs','retained work');fs.writeFileSync(process.argv[2],JSON.stringify({work:process.cwd(),pid:descendant.pid}));console.log('WORKER_READY');});
setInterval(()=>{},1000);`);
        const controller = f.write('controller.cjs', `const host=require(${JSON.stringify(require.resolve('../../skills/framework-benchmark/lib/host.cjs'))});
const cli=require(${JSON.stringify(require.resolve('../../skills/framework-benchmark/scripts/benchmark.cjs'))});
const execute=host.execute;host.preflight=async()=>({fixture:true});
host.execute=(runtime,job)=>job.role==='check'?Promise.resolve({exitCode:job.argv[1].includes('acceptance')?1:0,stdout:'',stderr:''}):execute(runtime,job,{
loginOptions:{home:${JSON.stringify(path.join(f.root, 'login'))},env:{}},spawnSync:()=>({status:0,stdout:runtime.cliVersion}),
capture:(bin,args,options)=>host.capture(process.execPath,[${JSON.stringify(worker)},${JSON.stringify(marker)}],options),
parse:async(runtime,job,run)=>({ok:false,sessionId:'interrupted-native',rootModel:runtime.model,selectedSkills:[],measurements:{}})});
let completion;cli.installSignalHandlers(()=>completion);completion=cli.main(['run','--run',${JSON.stringify(prepared.root)}]);
if(process.platform==='win32'){const timer=setInterval(()=>{if(require('node:fs').existsSync(${JSON.stringify(path.join(f.root, 'signal'))})){clearInterval(timer);process.emit('SIGTERM');}},20);}
completion.then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});`);
        child = spawn(process.execPath, [controller], { cwd: f.root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...f.env, HOME: path.join(f.root, 'login'), USERPROFILE: path.join(f.root, 'login'), NODE_OPTIONS: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' } });
        let diagnostics = ''; child.stdout.on('data', chunk => { diagnostics += chunk; }); child.stderr.on('data', chunk => { diagnostics += chunk; });
        const exited = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); });
        await new Promise((resolve, reject) => {
            const deadline = setTimeout(() => { clearInterval(poll); reject(new Error('No observable native worker readiness: ' + diagnostics)); }, 15000);
            const poll = setInterval(() => { if (fs.existsSync(marker)) { clearTimeout(deadline); clearInterval(poll); resolve(); } }, 20);
            child.once('close', () => { if (!fs.existsSync(marker)) { clearTimeout(deadline); clearInterval(poll); reject(new Error('Controller exited before readiness: ' + diagnostics)); } });
        });
        const ready = JSON.parse(fs.readFileSync(marker)); descendant = ready.pid;
        // Windows terminates a process for Node kill(SIGTERM); exercise the identical public handler with an IPC-free event bridge there.
        if (process.platform === 'win32') {
            // Native OS signals cannot be delivered as POSIX events: use a controller-owned file observed by the fixture event bridge.
            fs.writeFileSync(path.join(f.root, 'signal'), 'SIGTERM');
        } else child.kill('SIGTERM');
        let watchdog;
        const result = await Promise.race([exited, new Promise((resolve, reject) => { watchdog = setTimeout(() => reject(new Error('Interrupted controller did not finish: ' + diagnostics)), 20000); })]).finally(() => clearTimeout(watchdog));
        assert.equal(result.code, 143, diagnostics);
        assert.equal(fs.readFileSync(path.join(ready.work, 'valuable.cjs'), 'utf8'), 'retained work');
        assert(!fs.existsSync(path.join(path.dirname(ready.work), 'profile')));
        const receipt = JSON.parse(fs.readFileSync(path.join(prepared.root, 'interruption.json')));
        assert.equal(receipt.signal, 'SIGTERM'); assert(receipt.cleanup.some(row => row.status === 'fulfilled' && row.value?.some?.(entry => entry.retainedForRecovery === ready.work && entry.credentialsRemoved)));
        const state = experiment.load(prepared.root).state; assert.equal(state.phase, 'blocked');
        const arm = state.pairs[0][state.pairs[0].order[0]];
        const observation = JSON.parse(fs.readFileSync(arm.solver.collection.path));
        assert(observation.stdout.includes('DESCENDANT_READY'));
        assert.notEqual(observation.nativeOutcome.exitCode, 0);
        // The descendant inherited captured stdout and never closes it: capture can finish only after the whole tree stops.
        assert(arm.solver.collection.savedBeforeCleanup && arm.solver.cleanup.retainedForRecovery === ready.work);
        descendant = null;
    } finally {
        if (child && child.exitCode === null) child.kill('SIGKILL');
        if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch { /* already exited */ } }
        f.cleanup();
    }
});
