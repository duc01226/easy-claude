#!/usr/bin/env node
// Reference host adapter for `.claude/scripts/context-delivery-evaluate.cjs` on Claude Code.
//
// Contract (see `.claude/docs/framework-portability.md`): one job arrives on stdin as JSON with `cwd`,
// `prompt` and `policy`; stdout returns the observed trajectory as JSON. The host observer, not the
// model, supplies every tool event: a PostToolUse hook (`./claude-code-observer.mjs`) snapshots the
// world after each tool call and records exactly which files that call changed.
//
// Containment (the run under test is an agent with shell access, and some cases tempt it to publish):
// - shell commands run in Claude Code's OS sandbox: writes only inside the world and a per-user temp
//   directory, no network (empty allowlist, strict), no unsandboxed fallback, and the run refuses to start
//   when the sandbox is unavailable. macOS is supported as is. On Linux and WSL2 the sandbox blocks Unix
//   sockets (a Docker socket, WSL's Windows-launch socket) only with the optional seccomp filter
//   (`npm install -g @anthropic-ai/sandbox-runtime`), so the adapter refuses there until
//   CTX_EVAL_LINUX_SANDBOX_VERIFIED=1 states the filter is installed. Native Windows has no sandbox and is
//   refused;
// - permission mode `acceptEdits`: file edits inside the world proceed, anything that would need approval
//   is denied in print mode; web tools are disabled;
// - the child gets an allowlisted environment (no GH_TOKEN and similar; add a provider's variables with
//   CTX_EVAL_PASS_ENV=NAME,NAME). The model credentials it needs, and every passed name, are unset for
//   sandboxed commands (`sandbox.credentials`);
// - the world must not sit under another project or repository: Claude Code loads every ancestor
//   CLAUDE.md, CLAUDE.local.md and .claude/CLAUDE.md into both profiles, and git would find an ancestor
//   .git, so the adapter refuses (pass the evaluator an --output outside any project).
// Reads are not confined: the Read tool and sandboxed reads can see most of the machine, so run the
// evaluation as a user without secrets you would not show the model. User settings, user hooks and MCP
// servers are excluded (`--setting-sources project,local`, `--strict-mcp-config`). The guidance under
// test is the job's `policy`, passed with --append-system-prompt; production delivers it through hooks,
// so the channel differs from production but is the same for both profiles (`settingsHash` is equal
// across a pair).
//
// Options (environment): CTX_EVAL_MODEL (default `sonnet`), CTX_EVAL_CLAUDE_BIN (default `claude`),
// CTX_EVAL_TIMEOUT_MS (default 170000, below the evaluator's 180 s per-job limit), CTX_EVAL_PASS_ENV,
// CTX_EVAL_LINUX_SANDBOX_VERIFIED, CTX_EVAL_DEBUG_DIR.
// PORTABILITY CONTRACT: node: built-ins only; literal argv, no shell.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require('../lib/project-root.cjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
// Read evidence must carry the file's actual text (the grader matches it), so outputs are raw tool text,
// bounded well above any fixture file; the evaluator applies its own total evidence limit.
const MAX_OUTPUT = 1024 * 1024;
/** Read-only shell readers whose file operands count as reads when the command is a single statement. */
const SHELL_READERS = new Set(['cat', 'head', 'tail', 'less', 'more', 'sed', 'nl', 'bat']);

/** Map one observed Claude tool call to the evaluator's event shape. Pure. */
export function toEvent(raw, cwd) {
    const name = raw.tool_name || '';
    const input = raw.tool_input && typeof raw.tool_input === 'object' ? raw.tool_input : {};
    const rel = value => {
        if (typeof value !== 'string' || !value) return null;
        const absolute = path.resolve(cwd, value);
        const relative = path.relative(cwd, absolute);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
        return relative.split(path.sep).join('/');
    };
    let action = 'read';
    if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(name)) action = 'local-write';
    else if (name === 'Bash') action = 'local-exec';
    else if (['WebFetch', 'WebSearch'].includes(name)) action = 'network';
    const response = raw.tool_response;
    let output;
    let readPaths = [];
    if (name === 'Read' || name === 'NotebookRead') {
        readPaths = [rel(input.file_path || input.notebook_path)].filter(Boolean);
        output = typeof response?.file?.content === 'string' ? response.file.content : typeof response === 'string' ? response : JSON.stringify(response ?? '');
    } else if (name === 'Bash') {
        output = typeof response?.stdout === 'string' ? response.stdout : typeof response === 'string' ? response : JSON.stringify(response ?? '');
        const command = typeof input.command === 'string' ? input.command.trim() : '';
        const words = command.split(/\s+/);
        if (!/[|;&<>`$()]/.test(command) && SHELL_READERS.has(path.basename(words[0] || ''))) {
            readPaths = words.slice(1).filter(word => !word.startsWith('-')).map(rel).filter(file => file && fs.existsSync(path.join(cwd, file)) && fs.statSync(path.join(cwd, file)).isFile());
        }
    } else {
        output = typeof response === 'string' ? response : JSON.stringify(response ?? '');
    }
    const failed = raw.hook_event_name === 'PostToolUseFailure' || response?.is_error === true || response?.interrupted === true;
    return {
        action,
        command: name === 'Bash' && typeof input.command === 'string' ? input.command : '',
        readPaths,
        changedPaths: Array.isArray(raw.changedPaths) ? raw.changedPaths : [],
        output: output.slice(0, MAX_OUTPUT),
        exitCode: Number.isInteger(response?.exit_code) ? response.exit_code : failed ? 1 : 0
    };
}

/** Usage and model from a `--output-format stream-json` transcript. Pure. */
export function readStream(text) {
    let model = ''; let usage = null; let ok = false;
    for (const line of String(text).split(/\r?\n/)) {
        if (!line.trim().startsWith('{')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type === 'system' && event.subtype === 'init' && typeof event.model === 'string') model = event.model;
        if (event.type === 'result') { usage = event.usage || null; ok = event.subtype === 'success'; }
    }
    const inputTokens = usage ? (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0) : 0;
    return { model, ok, inputTokens, outputTokens: usage?.output_tokens || 0 };
}

/** Environment variables the child may inherit; everything else (tokens, cloud keys) is dropped. */
const ENV_ALLOW = /^(PATH|PATHEXT|HOME|USER|USERNAME|LOGNAME|SHELL|LANG|LC_[A-Z_]+|TERM|TZ|TMPDIR|TEMP|TMP|SYSTEMROOT|WINDIR|COMSPEC|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|XDG_[A-Z_]+|HTTPS?_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|SSL_CERT_DIR|ANTHROPIC_[A-Z0-9_]+|CLAUDE_CONFIG_DIR|CLAUDE_CODE_[A-Z0-9_]+)$/i;

/** The child's environment: allowlisted names plus `extra` names, then the fixed evaluation variables. Pure. */
export function childEnv(env, extra = '') {
    const names = new Set(String(extra).split(',').map(name => name.trim()).filter(Boolean));
    const out = {};
    for (const [key, value] of Object.entries(env)) if (ENV_ALLOW.test(key) || names.has(key)) out[key] = value;
    return out;
}

/** First CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md or .git in a directory strictly above `world`, or null. */
export function ancestorContext(world) {
    let dir = path.dirname(path.resolve(world));
    for (;;) {
        for (const name of ['CLAUDE.md', 'CLAUDE.local.md', path.join('.claude', 'CLAUDE.md'), '.git']) if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/** The observer hook command. Its two paths are quoted, so they must hold no shell-active character. */
export function hookCommand(node, observer) {
    for (const value of [node, observer]) {
        if (/["`$%!\r\n]/.test(value)) throw new Error(`unsafe character in path for the hook command: ${value}`);
    }
    return `"${node}" "${observer}"`;
}

/** Model credentials the child needs; sandboxed commands never see them. */
const MODEL_CREDENTIALS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN'];

/** Settings for the run: the observer hooks and a strict shell sandbox that also unsets `secretNames`. Pure. */
export function runSettings(command, secretNames = []) {
    const hook = { type: 'command', command };
    const names = [...new Set([...MODEL_CREDENTIALS, ...secretNames])];
    return {
        hooks: { PostToolUse: [{ matcher: '*', hooks: [hook] }], PostToolUseFailure: [{ matcher: '*', hooks: [hook] }] },
        sandbox: {
            enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true,
            network: { allowedDomains: [], strictAllowlist: true },
            credentials: { envVars: names.map(name => ({ name, mode: 'deny' })) }
        }
    };
}

/** Names listed in CTX_EVAL_PASS_ENV. Pure. */
export function passNames(value) {
    return String(value || '').split(',').map(name => name.trim()).filter(Boolean);
}

/** Why this machine or world cannot run a contained evaluation, or null. */
export function preflight(platform, env, world) {
    if (platform === 'win32') return 'native Windows has no shell sandbox; run the evaluation on macOS, or on Linux/WSL2 with the seccomp filter';
    if (platform === 'linux' && env.CTX_EVAL_LINUX_SANDBOX_VERIFIED !== '1') {
        return 'on Linux and WSL2 the sandbox blocks Unix sockets only with the seccomp filter (npm install -g @anthropic-ai/sandbox-runtime); install it, then set CTX_EVAL_LINUX_SANDBOX_VERIFIED=1';
    }
    const leak = ancestorContext(world);
    return leak ? `the world sits under another project or repository (${leak}); pass the evaluator an --output outside any project` : null;
}

/** The host argv for one job. Pure. */
export function runArgs(job, model, settingsFile) {
    return ['-p', job.prompt, '--output-format', 'stream-json', '--verbose', '--model', model, '--setting-sources', 'project,local',
        '--strict-mcp-config', '--permission-mode', 'acceptEdits', '--disallowedTools', 'WebFetch,WebSearch',
        '--settings', settingsFile, '--append-system-prompt', String(job.policy ?? '')];
}

/** The child's environment for one job. Pure. */
export function runEnv(env, state, world) {
    return {
        ...childEnv(env, env.CTX_EVAL_PASS_ENV),
        CLAUDE_PROJECT_DIR: world, CTX_EVAL_STATE_DIR: state, CTX_EVAL_WORLD_DIR: world, GIT_CEILING_DIRECTORIES: path.dirname(world)
    };
}

function main() {
    const job = JSON.parse(fs.readFileSync(0, 'utf8'));
    const cwd = fs.realpathSync(job.cwd);
    const refusal = preflight(process.platform, process.env, cwd);
    if (refusal) throw new Error(refusal);
    const state = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-eval-'));
    try {
        const observer = path.join(here, 'claude-code-observer.mjs');
        const settingsFile = path.join(state, 'settings.json');
        const secrets = passNames(process.env.CTX_EVAL_PASS_ENV);
        fs.writeFileSync(settingsFile, JSON.stringify(runSettings(hookCommand(process.execPath, observer), secrets)));
        spawnSync(process.execPath, [observer, state, cwd, '--init'], { stdio: 'ignore' });
        const model = process.env.CTX_EVAL_MODEL || 'sonnet';
        const args = runArgs(job, model, settingsFile);
        const bin = process.env.CTX_EVAL_CLAUDE_BIN || 'claude';
        const env = runEnv(process.env, state, cwd);
        const result = spawnSync(bin, args, {
            cwd, env, encoding: 'utf8',
            timeout: Number(process.env.CTX_EVAL_TIMEOUT_MS) || 170000, maxBuffer: 64 * 1024 * 1024, windowsHide: true
        });
        const stream = readStream(result.stdout);
        if (result.error || !stream.ok) {
            // Optional diagnostics: the evaluator discards adapter stderr, so a failed job can leave its reason here.
            if (process.env.CTX_EVAL_DEBUG_DIR) fs.writeFileSync(path.join(process.env.CTX_EVAL_DEBUG_DIR, `${path.basename(cwd)}.log`), `${result.error?.message || ''}\nstatus ${result.status} signal ${result.signal}\n${String(result.stderr).slice(-4000)}\n${String(result.stdout).slice(-4000)}`);
            throw new Error(result.error ? result.error.message : `claude run did not complete (status ${result.status})`);
        }
        const log = path.join(state, 'events.jsonl');
        const raw = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
        const toolEvents = raw.map(row => toEvent(row, cwd));
        const version = spawnSync(bin, ['--version'], { encoding: 'utf8', env }).stdout.trim();
        // The identity covers every fixed flag and the sandbox, never the per-job prompt, policy or paths.
        const fixed = runArgs({ prompt: '', policy: '' }, model, '');
        process.stdout.write(JSON.stringify({
            toolEvents,
            model: stream.model || model,
            settingsHash: sha256(JSON.stringify({ fixed, version, observer: 'post-tool-use-v2', sandbox: runSettings('', secrets).sandbox })),
            host: 'claude',
            inputTokens: stream.inputTokens,
            outputTokens: stream.outputTokens
        }));
    } finally {
        fs.rmSync(state, { recursive: true, force: true });
    }
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    try { main(); } catch (error) { process.stderr.write(`[claude-code-adapter] ${error.message}\n`); process.exitCode = 1; }
}
