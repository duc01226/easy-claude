#!/usr/bin/env node
// Reference host adapter for `.claude/scripts/context-delivery-evaluate.cjs` on Codex CLI, for a hosted
// model or an open-weight model served locally (`--oss`).
//
// Contract (see `.claude/docs/framework-portability.md`): one job arrives on stdin as JSON with `cwd`,
// `prompt` and `policy`; stdout returns the observed trajectory as JSON. Events come from the host, never
// the model: `codex exec --json` reports every command and file change, and the adapter snapshots the
// world after each completed item to record exactly which files that item changed.
//
// Containment (the run under test is an agent with a shell, and some cases tempt it to publish):
// - Codex's own sandbox in `workspace-write` mode, with the system temp directories excluded, so commands
//   write only inside the world, and with network access off;
// - a private, temporary CODEX_HOME holding only a copy of the sign-in file, so the operator's config, hooks,
//   rules and global AGENTS.md never reach the run; `--ephemeral` keeps no session. It and the world backup
//   live under the job's `scratchDir`, are removed after the job, and are removed by a SIGTERM/SIGINT handler
//   too (which also kills the Codex process group); the evaluator removes `scratchDir` even after a SIGKILL;
// - an allowlisted environment (`CTX_EVAL_PASS_ENV=NAME,NAME` adds a provider's variables);
// - the world must not sit under another project or repository: Codex reads AGENTS.md files above the
//   working directory, and git would find an ancestor .git, so the adapter refuses (pass the evaluator an
//   --output outside any project). Native Windows is refused.
// Limits: reads are not confined, so run it as a user without secrets you would not show the model; a
// command the sandbox refuses before it starts may not appear as an event. The guidance under test is the
// job's `policy`, passed as developer instructions; production delivers it through hooks, so the channel
// differs from production but is the same for both profiles.
//
// Options (environment): CTX_EVAL_MODEL (passed as `-m`; default: the Codex default model, recorded as
// `codex-default`, or `gpt-oss:20b` with --oss), CTX_EVAL_CODEX_OSS=1 (use a local open-weight model through `--oss`; provider from
// CTX_EVAL_OSS_PROVIDER, default `ollama`), CTX_EVAL_CODEX_BIN (default `codex`), CTX_EVAL_TIMEOUT_MS
// (cap of one Codex run, default 170000), CTX_EVAL_PASS_ENV, CTX_EVAL_DEBUG_DIR.
// Time: every run, a retry and the cleanup fit inside the job's `jobTimeoutMs` (sent by the evaluator), so the
// evaluator never has to stop the adapter mid-run; a run past its limit gets SIGTERM, then SIGKILL after a grace.
// Retry: a host or transport failure (Codex could not start, exited without reporting a failed turn, or
// reported a dropped connection, server error, overload or rate limit) is retried once from the world's
// starting state when at least RETRY_FLOOR_MS remain. A completed turn, a timeout or any other failed turn (for
// example a context overflow) is a result and is never retried. The output reports `attempts`, and the
// evaluator keeps it in the record.
// PORTABILITY CONTRACT: node: built-ins only; literal argv, no shell.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MAX_OUTPUT, innerCommand, shellReadPaths, childEnv, ancestorContext, removeHostScratch, jobClock, runTimeout, makeTempDir } from './adapter-common.mjs';

export { innerCommand, shellReadPaths };
import { snapshot, changed } from './claude-code-observer.mjs';

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require('../lib/project-root.cjs');

const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
/** Map one completed Codex item to the evaluator's event shape, or null for a non-tool item. */
export function toEvent(item, cwd, changedPaths = []) {
    if (!item || typeof item !== 'object') return null;
    if (item.type === 'command_execution') {
        const output = typeof item.aggregated_output === 'string' ? item.aggregated_output : '';
        return {
            action: 'local-exec', command: innerCommand(item.command), readPaths: shellReadPaths(item.command, cwd), changedPaths,
            output: output.slice(0, MAX_OUTPUT), exitCode: Number.isInteger(item.exit_code) ? item.exit_code : item.status === 'completed' ? 0 : 1
        };
    }
    if (item.type === 'file_change') {
        const declared = (Array.isArray(item.changes) ? item.changes : []).map(change => change && change.path).filter(p => typeof p === 'string')
            .map(p => path.relative(cwd, path.resolve(cwd, p)).split(path.sep).join('/')).filter(p => p && !p.startsWith('..'));
        return { action: 'local-write', command: '', readPaths: [], changedPaths: [...new Set([...changedPaths, ...declared])].sort(), output: '', exitCode: item.status === 'failed' ? 1 : 0 };
    }
    if (item.type === 'web_search') return { action: 'network', command: '', readPaths: [], changedPaths, output: '', exitCode: 0 };
    if (item.type === 'mcp_tool_call') return { action: 'local-exec', command: `${item.server || ''}.${item.tool || ''}`, readPaths: [], changedPaths, output: '', exitCode: item.status === 'failed' ? 1 : 0 };
    return null;
}

/** Why this machine or world cannot run a contained evaluation, or null. */
export function preflight(platform, world) {
    if (platform === 'win32') return 'native Windows is not supported by this adapter; run the evaluation on macOS or Linux';
    const leak = ancestorContext(world, ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md', '.git']);
    return leak ? `the world sits under another project or repository (${leak}); pass the evaluator an --output outside any project` : null;
}

/** The host argv for one job. Pure. */
export function runArgs(job, { model, oss, provider }) {
    return ['exec', '--json', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'workspace-write',
        '-c', 'sandbox_workspace_write.network_access=false',
        '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true',
        '-c', 'sandbox_workspace_write.exclude_slash_tmp=true',
        '-c', `developer_instructions=${JSON.stringify(String(job.policy ?? ''))}`,
        ...(oss ? ['--oss', '--local-provider', provider] : []),
        ...(model ? ['-m', model] : []),
        job.prompt];
}

/** Attempts per job: the first run and at most one retry. */
export const MAX_ATTEMPTS = 2;
/** A retry starts only when at least this much of the job's time is left. */
export const RETRY_FLOOR_MS = 30000;
/** Time a run past its limit gets between SIGTERM and SIGKILL. */
export const KILL_GRACE_MS = 3000;
/** Failure messages of the host or its model server, never of the model's own work. */
const TRANSPORT_FAILURE = /stream (?:disconnected|closed|error)|disconnected|connection (?:reset|refused|closed|error|lost)|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|network error|internal server error|bad gateway|service unavailable|gateway time-?out|\b50[0-4]\b|\b529\b|overloaded|rate.?limit|too many requests|\b429\b/i;

/** True when a run failed in the host or its transport rather than in the model's work, so a retry cannot
 * re-roll a result: Codex could not start, exited without reporting a failed turn, or its last reported failure
 * is a transport fault. A timeout (a slow model), a completed turn and any other failed turn (for example a
 * context overflow) are results. Pure. */
export function isHostFailure(result) {
    if (result.ok || result.timedOut) return false;
    if (result.error) return true;
    const failures = Array.isArray(result.failures) ? result.failures : [];
    return failures.length === 0 || TRANSPORT_FAILURE.test(failures.at(-1));
}

/** Copy the world aside so a retry can start from exactly the state the first attempt did. */
export function backupWorld(world, makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-eval-world-'))) {
    const copy = makeDir();
    fs.cpSync(world, copy, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
    return copy;
}

/** Put the world back to the backed-up state: remove everything in it, then copy the backup in. */
export function restoreWorld(backup, world) {
    for (const entry of fs.readdirSync(world)) fs.rmSync(path.join(world, entry), { recursive: true, force: true });
    fs.cpSync(backup, world, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
}

/** Signal a Codex run and the commands it started: the run leads its own process group (POSIX). */
function signalRun(child, signal) {
    try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch { /* already gone */ } }
}

/** The Codex run in progress, so a SIGTERM/SIGINT handler can stop it. */
let activeRun = null;

/** Run Codex on one job, snapshotting the world after each completed item. */
function runJob(bin, args, { cwd, env, timeout }) {
    return new Promise(resolve => {
        const child = spawn(bin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
        activeRun = child;
        const events = []; const failures = []; let usage = null; let ok = false; let stderr = ''; let timedOut = false;
        let before = snapshot(cwd);
        let escalation = null;
        const timer = setTimeout(() => {
            timedOut = true;
            signalRun(child, 'SIGTERM');
            escalation = setTimeout(() => signalRun(child, 'SIGKILL'), KILL_GRACE_MS);
        }, timeout);
        const settle = value => { clearTimeout(timer); clearTimeout(escalation); activeRun = null; resolve({ ...value, events, failures, usage, timedOut, stderr }); };
        child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8000); });
        readline.createInterface({ input: child.stdout }).on('line', line => {
            let event;
            try { event = JSON.parse(line); } catch { return; }
            if (event.type === 'item.completed') {
                const now = snapshot(cwd);
                const mapped = toEvent(event.item, cwd, changed(before, now));
                before = now;
                if (mapped) events.push(mapped);
            } else if (event.type === 'turn.completed') { usage = event.usage || null; ok = true; }
            else if (event.type === 'turn.failed') { ok = false; failures.push(String(event.error?.message || event.message || 'turn failed')); }
            else if (event.type === 'error') { ok = false; failures.push(String(event.message || event.error?.message || 'error')); }
        });
        child.on('error', error => settle({ error, ok: false }));
        child.on('close', code => settle({ code, ok: ok && code === 0 }));
    });
}

/** Paths the adapter must remove however it ends. */
const ownedPaths = new Set();
function removeOwned() {
    for (const owned of ownedPaths) { try { fs.rmSync(owned, { recursive: true, force: true }); } catch { /* the evaluator removes the scratch folder */ } }
    ownedPaths.clear();
}

/** On SIGTERM (the evaluator's job limit) or SIGINT: stop the Codex run, remove the private home and the world
 * backup, then exit. Without this, Node would exit without running `finally`. */
function stopOnSignal(signal) {
    if (activeRun) signalRun(activeRun, 'SIGKILL');
    removeOwned();
    try { fs.writeSync(2, `[codex-adapter] stopped by ${signal}\n`); } catch { /* stderr closed */ }
    process.exit(signal === 'SIGINT' ? 130 : 143);
}

async function main() {
    const job = JSON.parse(fs.readFileSync(0, 'utf8'));
    const clock = jobClock(job, process.env);
    const cwd = fs.realpathSync(job.cwd);
    const refusal = preflight(process.platform, cwd);
    if (refusal) throw new Error(refusal);
    const oss = process.env.CTX_EVAL_CODEX_OSS === '1';
    const options = { model: process.env.CTX_EVAL_MODEL || (oss ? 'gpt-oss:20b' : ''), oss, provider: process.env.CTX_EVAL_OSS_PROVIDER || 'ollama' };
    process.once('SIGTERM', stopOnSignal);
    process.once('SIGINT', stopOnSignal);
    const home = makeTempDir(job, 'ctx-eval-codex-');
    ownedPaths.add(home);
    try {
        const sourceHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
        const auth = path.join(sourceHome, 'auth.json');
        if (!oss && fs.existsSync(auth)) { fs.copyFileSync(auth, path.join(home, 'auth.json')); fs.chmodSync(path.join(home, 'auth.json'), 0o600); }
        const bin = process.env.CTX_EVAL_CODEX_BIN || 'codex';
        const env = { ...childEnv(process.env, process.env.CTX_EVAL_PASS_ENV), CODEX_HOME: home, GIT_CEILING_DIRECTORIES: path.dirname(cwd) };
        // A host or transport failure produces no graded outcome, so it is retried once from the world's starting
        // state; a timeout, a completed turn or a failed turn the model caused is never retried (isHostFailure).
        const backup = backupWorld(cwd, () => makeTempDir(job, 'ctx-eval-world-'));
        ownedPaths.add(backup);
        let result; let attempts = 0;
        try {
            for (;;) {
                const timeout = runTimeout(clock);
                if (timeout <= 0) throw new Error('the job time limit left no time for a Codex run');
                attempts++;
                result = await runJob(bin, runArgs(job, options), { cwd, env, timeout });
                if (!isHostFailure(result) || attempts >= MAX_ATTEMPTS) break;
                const status = result.code ?? result.error?.code;
                if (runTimeout(clock) < RETRY_FLOOR_MS) {
                    process.stderr.write(`[codex-adapter] host failure (status ${status}); not retried, less than ${RETRY_FLOOR_MS} ms of the job limit left\n`);
                    break;
                }
                process.stderr.write(`[codex-adapter] host failure (status ${status}); retrying once from the starting world\n`);
                restoreWorld(backup, cwd);
            }
        } finally {
            fs.rmSync(backup, { recursive: true, force: true });
            ownedPaths.delete(backup);
        }
        if (result.error || !result.ok) {
            if (process.env.CTX_EVAL_DEBUG_DIR) fs.writeFileSync(path.join(process.env.CTX_EVAL_DEBUG_DIR, `${path.basename(cwd)}.log`), `${result.error?.message || ''}\nstatus ${result.code} attempts ${attempts}\n${result.failures.join('\n')}\n${result.stderr}`);
            throw new Error(result.error ? result.error.message : `codex run did not complete (status ${result.code}, ${attempts} attempt(s))`);
        }
        removeHostScratch(cwd);
        const version = String(spawnSync(bin, ['--version'], { encoding: 'utf8', env, timeout: 15000 }).stdout || '').trim();
        const fixed = runArgs({ prompt: '', policy: '' }, options);
        process.stdout.write(JSON.stringify({
            toolEvents: result.events,
            model: options.model || 'codex-default',
            settingsHash: sha256(JSON.stringify({ fixed, version, observer: 'codex-json-items-v3' })),
            host: 'codex',
            attempts,
            inputTokens: result.usage?.input_tokens || 0,
            outputTokens: result.usage?.output_tokens || 0
        }));
    } finally {
        removeOwned();
    }
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    main().catch(error => { process.stderr.write(`[codex-adapter] ${error.message}\n`); process.exitCode = 1; });
}
