'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const MAX_OUTPUT = 8 * 1024 * 1024;
const active = new Set();

function cleanEnv(env = process.env) {
    return Object.fromEntries(Object.entries(env).filter(([key]) => /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|DOCKER_HOST|DOCKER_CONTEXT|DOCKER_CONFIG|LANG|LC_ALL|TMPDIR|TEMP|TMP|ANTHROPIC_API_KEY)$/i.test(key)));
}

function redact(value, env) {
    let result = String(value || '');
    const secret = env.ANTHROPIC_API_KEY;
    if (secret) result = result.split(secret).join('[REDACTED]');
    return result;
}

function capture(bin, args, { input = '', timeoutMs = 15000, env = cleanEnv(), maxOutput = MAX_OUTPUT, spawnProcess = spawn } = {}) {
    return new Promise(resolve => {
        const start = performance.now();
        const chunks = { stdout: [], stderr: [] }; let bytes = 0; let failure = null;
        const child = spawnProcess(bin, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        const timer = setTimeout(() => { failure = 'timeout'; child.kill('SIGKILL'); }, timeoutMs);
        const collect = key => chunk => {
            bytes += chunk.length;
            if (bytes > maxOutput) { failure = 'output-limit'; child.kill('SIGKILL'); return; }
            chunks[key].push(chunk);
        };
        child.stdout.on('data', collect('stdout'));
        child.stderr.on('data', collect('stderr'));
        child.on('error', error => { failure = `launch:${error.code || 'unknown'}`; });
        child.stdin.on('error', () => {});
        child.once('close', (exitCode, signal) => {
            clearTimeout(timer);
            resolve({ exitCode, signal, failure, wallMs: Math.round(performance.now() - start), stdout: redact(Buffer.concat(chunks.stdout).toString('utf8'), env), stderr: redact(Buffer.concat(chunks.stderr).toString('utf8'), env) });
        });
        child.stdin.end(input);
    });
}

function mount(source, target, readonly = false) {
    if (/[\r\n,]/.test(source)) throw new Error('Mount paths containing commas/newlines are unsupported');
    return ['--mount', `type=bind,source=${source},target=${target}${readonly ? ',readonly' : ''}`];
}

function runArgs(runtime, job, name) {
    const args = ['run', '--rm', '--pull=never', '--name', name, '--interactive', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges',
        '--pids-limit=256', '--memory', `${runtime.memoryMb}m`, '--cpus', String(runtime.cpus),
        '--network', job.role === 'check' ? 'none' : 'bridge', '--workdir', '/workspace',
        '--tmpfs', '/tmp:rw,nosuid,size=512m', '--tmpfs', '/workspace:rw,nosuid,size=512m', '--env', 'HOME=/tmp/bench-home', '--env', 'CLAUDE_CONFIG_DIR=/tmp/bench-home/.claude',
        '--env', 'CLAUDE_CODE_DISABLE_AUTO_MEMORY=1', '--env', 'DISABLE_AUTOUPDATER=1', '--env', 'CLAUDE_PROJECT_DIR=/workspace',
        ...mount(job.workspace, '/input', true), ...mount(path.resolve(__dirname, '..', 'scripts'), '/runner', true), ...mount(__dirname, '/runner-lib', true)];
    if (job.role === 'check') args.push(...mount(job.checksDir, '/checks', true));
    else args.push('--env', 'ANTHROPIC_API_KEY');
    args.push('--entrypoint', 'node', runtime.image, '/runner/container-session.cjs');
    return args;
}

async function preflight(runtime, { workspace } = {}, env = cleanEnv(), { runCommand = capture } = {}) {
    if (!env.ANTHROPIC_API_KEY) throw new Error('ENVIRONMENT-BLOCKED: ANTHROPIC_API_KEY is required; no subscription/home credentials are mounted');
    const daemon = await runCommand('docker', ['info', '--format', '{{.OSType}}'], { env });
    if (daemon.failure || daemon.exitCode !== 0 || daemon.stdout.trim() !== 'linux') throw new Error('ENVIRONMENT-BLOCKED: Docker with Linux containers is required');
    const image = await runCommand('docker', ['image', 'inspect', runtime.image, '--format', '{{.Id}}'], { env });
    if (image.failure || image.exitCode !== 0 || !/^sha256:[a-f0-9]{64}$/.test(image.stdout.trim())) throw new Error('ENVIRONMENT-BLOCKED: load the pinned runtime image first');
    const { inventory, fingerprint } = require('./files.cjs');
    const probe = await execute(runtime, { role: 'probe', workspace, inputHash: fingerprint(inventory(workspace)), timeoutMs: 30000 }, env, { runCommand });
    if (probe.failure || probe.exitCode !== 0 || !probe.packet?.ok) throw new Error(`ENVIRONMENT-BLOCKED: pinned runtime lacks required CLI/Node/Git capabilities: ${probe.stderr || probe.packet?.error || probe.failure || probe.exitCode}`);
    return { imageId: image.stdout.trim(), platform: process.platform, node: process.version, runtimeProbe: probe.packet };
}

async function execute(runtime, job, env = cleanEnv(), { runCommand = capture } = {}) {
    const name = `framework-bench-${crypto.randomUUID()}`;
    active.add(name);
    try {
        const result = await runCommand('docker', runArgs(runtime, job, name), { input: JSON.stringify({ ...job, workspace: undefined, checksDir: undefined, runtime }), timeoutMs: job.timeoutMs || runtime.timeoutMs, env, maxOutput: job.role === 'solve' ? 64 * 1024 * 1024 : MAX_OUTPUT });
        try {
            result.packet = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
            result.stdout = result.stdout.split(/\r?\n/).slice(0, -2).join('\n') + '\n' + JSON.stringify({ ...result.packet, delta: undefined, setupDelta: undefined,
                journey: result.packet.journey ? { manifest: result.packet.journey.manifest } : undefined });
        } catch { /* incomplete runtime output stays available for failure classification */ }
        return result;
    } finally {
        await runCommand('docker', ['rm', '--force', name], { env, timeoutMs: 10000 });
        active.delete(name);
    }
}

async function cleanup() {
    await Promise.allSettled([...active].map(name => capture('docker', ['rm', '--force', name], { timeoutMs: 10000 })));
}

module.exports = { cleanEnv, redact, capture, mount, runArgs, preflight, execute, cleanup };
