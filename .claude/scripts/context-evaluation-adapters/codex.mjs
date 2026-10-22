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
// - a private, temporary CODEX_HOME holding only a copy of the sign-in file (removed after the job), so the
//   operator's config, hooks, rules and global AGENTS.md never reach the run; `--ephemeral` keeps no session;
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
// (default 170000; keep it below the adapter declaration's `jobTimeoutMs`), CTX_EVAL_PASS_ENV,
// CTX_EVAL_DEBUG_DIR.
// PORTABILITY CONTRACT: node: built-ins only; literal argv, no shell.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MAX_OUTPUT, innerCommand, shellReadPaths, childEnv, ancestorContext, removeHostScratch } from './adapter-common.mjs';

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

/** Run Codex on one job, snapshotting the world after each completed item. */
function runJob(bin, args, { cwd, env, timeout }) {
    return new Promise(resolve => {
        const child = spawn(bin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        const events = []; let usage = null; let ok = false; let stderr = '';
        let before = snapshot(cwd);
        const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
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
            else if (event.type === 'turn.failed' || event.type === 'error') ok = false;
        });
        child.on('error', error => { clearTimeout(timer); resolve({ error, events, usage, ok: false, stderr }); });
        child.on('close', code => { clearTimeout(timer); resolve({ code, events, usage, ok: ok && code === 0, stderr }); });
    });
}

async function main() {
    const job = JSON.parse(fs.readFileSync(0, 'utf8'));
    const cwd = fs.realpathSync(job.cwd);
    const refusal = preflight(process.platform, cwd);
    if (refusal) throw new Error(refusal);
    const oss = process.env.CTX_EVAL_CODEX_OSS === '1';
    const options = { model: process.env.CTX_EVAL_MODEL || (oss ? 'gpt-oss:20b' : ''), oss, provider: process.env.CTX_EVAL_OSS_PROVIDER || 'ollama' };
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-eval-codex-'));
    try {
        const sourceHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
        const auth = path.join(sourceHome, 'auth.json');
        if (!oss && fs.existsSync(auth)) { fs.copyFileSync(auth, path.join(home, 'auth.json')); fs.chmodSync(path.join(home, 'auth.json'), 0o600); }
        const bin = process.env.CTX_EVAL_CODEX_BIN || 'codex';
        const env = { ...childEnv(process.env, process.env.CTX_EVAL_PASS_ENV), CODEX_HOME: home, GIT_CEILING_DIRECTORIES: path.dirname(cwd) };
        const result = await runJob(bin, runArgs(job, options), { cwd, env, timeout: Number(process.env.CTX_EVAL_TIMEOUT_MS) || 170000 });
        if (result.error || !result.ok) {
            if (process.env.CTX_EVAL_DEBUG_DIR) fs.writeFileSync(path.join(process.env.CTX_EVAL_DEBUG_DIR, `${path.basename(cwd)}.log`), `${result.error?.message || ''}\nstatus ${result.code}\n${result.stderr}`);
            throw new Error(result.error ? result.error.message : `codex run did not complete (status ${result.code})`);
        }
        removeHostScratch(cwd);
        const version = spawnSync(bin, ['--version'], { encoding: 'utf8', env }).stdout.trim();
        const fixed = runArgs({ prompt: '', policy: '' }, options);
        process.stdout.write(JSON.stringify({
            toolEvents: result.events,
            model: options.model || 'codex-default',
            settingsHash: sha256(JSON.stringify({ fixed, version, observer: 'codex-json-items-v3' })),
            host: 'codex',
            inputTokens: result.usage?.input_tokens || 0,
            outputTokens: result.usage?.output_tokens || 0
        }));
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    main().catch(error => { process.stderr.write(`[codex-adapter] ${error.message}\n`); process.exitCode = 1; });
}
