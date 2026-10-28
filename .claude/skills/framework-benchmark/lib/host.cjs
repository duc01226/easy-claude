'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { StringDecoder } = require('node:string_decoder');
const { spawn, execFileSync, spawnSync } = require('node:child_process');
const { inventory, fingerprint, disposable, secretFile, agentSurface, projectInstruction, runtimeControl, sha, contained } = require('./files.cjs');
const worktrees = require('./worktrees.cjs');
const login = require('./native-login.cjs');
const cli = require('./native-cli.cjs');
const journey = require('./journey.cjs');
const { exportedDelta } = require('../scripts/container-session.cjs');
const active = new Set();
const profiles = new Set();
const closed = new WeakMap();
let cancelled = false;

function persistCollection(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const descriptor = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(descriptor, JSON.stringify(value)); fs.fsyncSync(descriptor); }
    finally { fs.closeSync(descriptor); }
}

function stop(child, signal = 'SIGKILL') {
    if (!child?.pid) return;
    if (process.platform === 'win32') {
        try { execFileSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { timeout: 10000, stdio: 'ignore', windowsHide: true }); } catch { child.kill(signal); }
    } else { try { process.kill(-child.pid, signal); } catch { child.kill(signal); } }
}

function capture(bin, args, { cwd, env, input = '', timeoutMs = 15000, maxOutput = 8 * 1024 * 1024, maxActions = Infinity, secrets = [], onEvent, spawnProcess = spawn } = {}) {
    return new Promise(resolve => {
        const child = spawnProcess(bin, args, { cwd, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        active.add(child);
        let settled;
        closed.set(child, new Promise(done => { settled = done; }));
        const output = { stdout: [], stderr: [] }; const decoder = new StringDecoder('utf8'); let size = 0; let actions = 0; let pending = ''; let failure = null;
        const timer = setTimeout(() => { failure = 'timeout'; stop(child); }, timeoutMs);
        for (const key of ['stdout', 'stderr']) child[key].on('data', chunk => {
            size += chunk.length;
            if (size > maxOutput) { failure = 'output-limit'; stop(child); return; }
            output[key].push(chunk);
            if (key === 'stdout' && (Number.isFinite(maxActions) || onEvent)) {
                pending += decoder.write(chunk); const lines = pending.split(/\r?\n/); pending = lines.pop();
                if (onEvent) try { for (const line of lines.filter(Boolean)) onEvent(line); } catch { failure = 'observation-write'; stop(child); }
                for (const row of cli.events(lines.join('\n'))) if (row.type === 'item.completed' && !['agent_message', 'reasoning', 'plan'].includes(row.item?.type) && ++actions > maxActions) { failure = 'action-limit'; stop(child); }
            }
        });
        child.on('error', error => { failure = `launch:${error.code || 'unknown'}`; });
        child.stdin.on('error', () => {});
        child.once('close', (exitCode, signal) => {
            pending += decoder.end();
            if (pending && onEvent) try { onEvent(pending); } catch { failure = 'observation-write'; }
            clearTimeout(timer); stop(child); active.delete(child); settled();
            resolve({ exitCode, signal, failure, stdout: login.redact(Buffer.concat(output.stdout).toString('utf8'), secrets), stderr: login.redact(Buffer.concat(output.stderr).toString('utf8'), secrets) });
        });
        child.stdin.end(input);
    });
}

function version(host, runCommand = spawnSync) {
    const result = runCommand(host, ['--version'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    if (result.status !== 0 || result.error) throw new Error(`ENVIRONMENT-BLOCKED: ${host} CLI unavailable`);
    return String(result.stdout).trim();
}

function discoverRuntime({ host, model, judgeModel, env = process.env, home = os.homedir() } = {}, ports = {}) {
    const choices = host ? [host] : ['codex', 'claude'];
    const errors = [];
    for (const choice of choices) {
        try {
            if (!['codex', 'claude'].includes(choice)) throw new Error('Native host must be codex or claude');
            const cliVersion = version(choice, ports.spawnSync || spawnSync); login.credentials(choice, { env, home });
            let configured = model;
            if (!configured && choice === 'codex') {
                const file = path.join(env.CODEX_HOME || path.join(home, '.codex'), 'config.toml');
                if (fs.existsSync(file) && fs.statSync(file).size <= 2 * 1024 * 1024) configured = /^model\s*=\s*"([^"\r\n]+)"/m.exec(fs.readFileSync(file, 'utf8'))?.[1];
            } else if (!configured) {
                const file = path.join(env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), 'settings.json');
                if (fs.existsSync(file)) configured = JSON.parse(fs.readFileSync(file, 'utf8')).model;
            }
            if (!configured || /^(?:default|latest|opus|sonnet|haiku)$/i.test(configured)) throw new Error(`Set an exact ${choice} model with --model or a native runtime file; no mutable default is frozen`);
            return { schemaVersion: 1, backend: 'host', host: choice, cliVersion, model: configured, judgeModel: judgeModel || configured, repeats: 1, seed: 42, timeoutMs: 1800000, maxTurns: 200 };
        } catch (error) { errors.push(error.message); }
    }
    throw new Error(`ENVIRONMENT-BLOCKED: ${errors.join('; ')}`);
}

// Every model session must hold a login that outlives its own time limit.
const LOGIN_MARGIN_MS = 5 * 60 * 1000;
function sessionLogin(runtime, ports) {
    return login.credentials(runtime.host, { ...ports.loginOptions, minValidityMs: runtime.timeoutMs + LOGIN_MARGIN_MS, refreshModel: runtime.model });
}

async function preflight(runtime, { workspace } = {}, ports = {}) {
    const runCommand = ports.capture || capture;
    const observed = version(runtime.host, ports.spawnSync || spawnSync);
    if (observed !== runtime.cliVersion) throw new Error('ENVIRONMENT-BLOCKED: native CLI changed after preparation');
    const auth = sessionLogin(runtime, ports);
    const profile = fs.mkdtempSync(path.join(path.dirname(workspace), 'native-auth-')); fs.chmodSync(profile, 0o700); profiles.add(profile);
    try {
        const env = login.environment(profile, auth);
        const status = await runCommand(runtime.host, runtime.host === 'codex' ? ['login', 'status'] : ['auth', 'status'], { env, cwd: profile, secrets: auth.secrets });
        let authenticated = status.exitCode === 0 && !status.failure;
        if (runtime.host === 'claude') { try { authenticated &&= JSON.parse(status.stdout).loggedIn === true; } catch { authenticated = false; } }
        if (!authenticated) throw new Error(`ENVIRONMENT-BLOCKED: native ${runtime.host} login is unavailable`);
        const help = await runCommand(runtime.host, runtime.host === 'codex' ? ['exec', '--help'] : ['--help'], { env, cwd: profile, secrets: auth.secrets });
        const flags = runtime.host === 'codex' ? ['--json', '--ignore-user-config', '--ignore-rules', '--output-schema', '--sandbox', '--dangerously-bypass-hook-trust'] : ['--safe-mode', '--disable-slash-commands', '--session-id', '--json-schema', '--setting-sources', '--permission-prompts'];
        if (help.exitCode !== 0 || help.failure || flags.some(flag => !help.stdout.includes(flag))) throw new Error('ENVIRONMENT-BLOCKED: native CLI lacks required isolation/output capabilities');
        return { backend: 'host', host: runtime.host, cliVersion: observed, platform: process.platform, node: process.version, authentication: auth.source,
            workspaces: 'owned synthetic Git worktrees', containment: 'native CLI permissions/sandbox; trusted task code, not container isolation', billing: 'actual subscription charge unknown', flags };
    } finally { fs.rmSync(profile, { recursive: true, force: true }); profiles.delete(profile); }
}

async function execute(runtime, job, ports = {}) {
    if (cancelled) throw new Error('Native benchmark interrupted; no further stages launched');
    if (typeof job.observationPath !== 'string' || !path.isAbsolute(job.observationPath)) throw new Error('Native execution requires an owned observation destination before cleanup');
    const source = inventory(job.workspace);
    if (fingerprint(source) !== job.inputHash) throw new Error('Native input differs from frozen snapshot');
    const session = worktrees.create(source, path.dirname(job.workspace), ports.worktreeOptions);
    const profile = path.join(session.root, 'profile'); fs.mkdirSync(profile, { mode: 0o700 });
    const runCommand = ports.capture || capture;
    let response; let retained = false; let discardUnsafe = false;
    const collected = path.join(path.dirname(job.observationPath), `${path.basename(job.observationPath, '.json')}.native-collected.json`);
    try {
        const isContext = file => (job.contextRoots || []).some(root => file === root || file.startsWith(`${root}/`));
        const application = file => !disposable(file) && !secretFile(file) && !agentSurface(file) && !isContext(file);
        const auth = job.role === 'check' ? { source: 'none', secrets: [] } : sessionLogin(runtime, ports);
        const env = login.environment(profile, auth);
        const temp = path.join(session.work, 'tmp', 'native-runtime'); fs.mkdirSync(temp, { recursive: true });
        Object.assign(env, { TMPDIR: temp, TEMP: temp, TMP: temp, BENCH_WORKSPACE: session.work, CLAUDE_PROJECT_DIR: session.work, GIT_CEILING_DIRECTORIES: path.dirname(session.work) });
        if (job.role === 'check') {
            const mapped = job.argv.map(value => value === '/workspace' ? session.work : value === '/checks' ? job.checksDir : value.startsWith('/workspace/') ? contained(session.work, value.slice(11)) : value.startsWith('/checks/') ? contained(job.checksDir, value.slice(8)) : value);
            response = await runCommand(mapped[0], mapped.slice(1), { cwd: session.work, env, timeoutMs: job.timeoutMs, secrets: [], maxOutput: 8 * 1024 * 1024 });
        } else {
            if (version(runtime.host, ports.spawnSync || spawnSync) !== runtime.cliVersion) throw new Error('Native CLI changed during campaign');
            const args = cli.argsFor(runtime, job, { workspace: session.work, profile });
            const watch = job.role === 'solve' || job.assessment ? journey.recorder({ host: runtime.host, directory: path.join(path.dirname(job.observationPath), job.assessment ? 'review-trace' : 'journey-trace'), captureMode: 'live-native-stream',
                redact: value => login.redact(value, auth.secrets).split(profile).join('[PRIVATE_PROFILE]').split(session.work).join('[WORKSPACE]') }) : null;
            const observed = await runCommand(runtime.host, args, { cwd: session.work, env, input: job.prompt, timeoutMs: runtime.timeoutMs,
                maxOutput: job.role === 'solve' ? 64 * 1024 * 1024 : 8 * 1024 * 1024, maxActions: runtime.host === 'codex' ? runtime.maxTurns : Infinity, secrets: auth.secrets,
                ...(watch ? { onEvent: line => watch.line(line, true) } : {}) });
            const trace = watch?.finish({ exitCode: observed.exitCode, failure: observed.failure, signal: observed.signal });
            const parsed = await (ports.parse || cli.parse)(runtime, job, observed, session.work, profile);
            if (trace) {
                Object.assign(trace.manifest, { sessionId: parsed.sessionId, observedModel: parsed.rootModel, selectedSkills: parsed.selectedSkills || [], attemptedSkills: parsed.attemptedSkills || [], skillReceipts: parsed.skillReceipts || [], workflowGateCompletion: 'unknown unless evidenced by public actions' });
                require('./files.cjs').json(path.join(path.dirname(job.observationPath), job.assessment ? 'review-trace' : 'journey-trace', 'manifest.json'), trace.manifest);
                parsed.journey = trace;
            }
            const snapshot = inventory(session.work, { filter: file => !disposable(file) });
            const finalFiles = snapshot.filter(row => row.path.split('/').every(part => !secretFile(part)));
            const reportRoot = path.join(session.work, 'tmp', 'reports');
            const reviewReports = job.assessment && fs.existsSync(reportRoot) ? inventory(reportRoot, { filter: file => !secretFile(file),
                limits: { files: 64, bytes: 2 * 1024 * 1024, fileBytes: 1024 * 1024, depth: 8 } }) : [];
            if ([...finalFiles, ...reviewReports].some(row => auth.secrets.some(secret => secret && row.data.includes(Buffer.from(secret))))) {
                discardUnsafe = true;
                (ports.persistCollection || persistCollection)(collected, { failure: 'credential-output', error: 'Native credential export refused; candidate discarded' });
                retained = true;
                throw new Error('Candidate contains a native login credential; export refused');
            }
            const current = finalFiles.filter(row => application(row.path));
            const expectedControls = new Set(source.filter(row => runtimeControl(row.path) && !isContext(row.path)).map(row => row.path));
            const treatmentChanges = snapshot.filter(row => runtimeControl(row.path) && !isContext(row.path) && !expectedControls.has(row.path)).map(row => row.path);
            for (const row of source.filter(row => agentSurface(row.path) && !projectInstruction(row.path) && !isContext(row.path))) {
                const file = contained(session.work, row.path);
                if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || sha(fs.readFileSync(file)) !== sha(row.data)) treatmentChanges.push(row.path);
            }
            const packet = { ...parsed, ok: parsed.ok && !observed.failure, requestId: job.sessionId, host: runtime.host, hostVersion: runtime.cliVersion,
                failureClass: observed.failure && ['timeout', 'action-limit', 'output-limit'].includes(observed.failure) ? 'task' : parsed.failureClass || (parsed.ok ? null : 'infrastructure'),
                treatmentIntact: treatmentChanges.length === 0, treatmentChanges,
                candidateIntact: fingerprint(source.filter(row => application(row.path))) === fingerprint(current),
                ...(job.assessment ? { reviewReports: exportedDelta([], reviewReports, { sha }) } : {}),
                delta: job.role === 'solve' ? exportedDelta(source.filter(row => application(row.path)), current, { sha }) : undefined,
                setupDelta: job.role === 'solve' && job.arm === 'framework' ? exportedDelta([], finalFiles.filter(row => isContext(row.path)), { sha }) : undefined };
            response = { ...observed, failure: null, packet, stdout: JSON.stringify({ type: 'started', sessionId: packet.sessionId, requestId: job.sessionId, host: runtime.host, hostVersion: runtime.cliVersion }) + '\n' + observed.stdout,
                stderr: observed.stderr, nativeOutcome: { exitCode: observed.exitCode, failure: observed.failure } };
            // A task failure still has a complete transport packet and remains in the denominator.
            response.exitCode = 0;
        }
        (ports.persistCollection || persistCollection)(collected, response);
        retained = true;
        response.collection = { path: collected, savedBeforeCleanup: true };
        return response;
    } finally {
        const receipt = retained || discardUnsafe ? worktrees.remove(session, ports.worktreeOptions) : worktrees.retain(session);
        if (response) response.cleanup = receipt;
    }
}

async function cleanup({ cancel = false } = {}) {
    if (cancel) cancelled = true;
    // Global teardown has no collection receipt: preserve every in-flight workspace first.
    const receipts = worktrees.cleanup({ preserveUncollected: true });
    const children = [...active];
    for (const child of children) stop(child);
    let timer;
    try { await Promise.race([Promise.allSettled(children.map(child => closed.get(child))), new Promise(resolve => { timer = setTimeout(resolve, 5000); })]); }
    finally { clearTimeout(timer); }
    for (const profile of profiles) {
        try { fs.rmSync(profile, { recursive: true, force: true }); profiles.delete(profile); }
        catch (error) { receipts.push({ remainingPrivateProfile: profile, credentialsRemoved: false, error: error.code || 'cleanup failed' }); }
    }
    return receipts;
}

module.exports = { stop, capture, version, discoverRuntime, preflight, execute, cleanup, persistCollection };
