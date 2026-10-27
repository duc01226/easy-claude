#!/usr/bin/env node
// Skill activation evals: does each prompt start the skill it should, and only that skill?
//
//   node .claude/scripts/skill-activation-eval.mjs --cases <file.json> [--host=claude|codex] [--runs=3]
//        [--min-hit-rate=0.8] [--max-false-rate=0.1] [--timeout-ms=180000] [--json]
//
// Cases file: { "cases": [ { "id": "tests-1", "prompt": "add a test for ...", "expect": "skill-name" },
//                          { "id": "chat-1", "prompt": "what does this regex do?", "expect": null } ] }
// `expect: null` means no framework skill should start. A skill "started" when the host called it
// (Claude `Skill` tool) or the agent read its SKILL.md (Codex, or the read-the-file fallback).
//
// Each run is a fresh headless host process in the current project, kept read-only:
// - Claude runs with --permission-mode plan and only the tools an activation needs (--tools Skill,Read,Glob,Grep;
//   a skill starts through the Skill tool or a Read), the mutating tools also disallowed as a second guard (Bash,
//   Edit, Write, MultiEdit, NotebookEdit), only project and local settings
//   (--setting-sources project,local, so personal plugins, skills and allow rules stay out; a provider set
//   only in personal settings must come through SKILL_EVAL_PASS_ENV) and no MCP servers (--strict-mcp-config);
// - Codex runs with --sandbox read-only and --ephemeral (no session is kept);
// - the host receives an allowlisted environment (the evaluation adapters' `childEnv`; Codex also keeps
//   CODEX_HOME) plus the framework switches its hooks read (FRAMEWORK_SWITCHES: the framework mode, quiet
//   project rules, quiet native policy, native auto-apply, route and auto-trigger preferences, commit review
//   mode, the prompt ledger switch and each router's kill switch), and SKILL_EVAL_PASS_ENV=NAME,NAME adds names
//   such as a provider key. The report
//   records the effective framework mode, skill auto-trigger policy and workflow route mode with the layer that
//   decided each (default, project config, personal config, local override or environment), and each passed
//   switch with its normalized value (a short mode word, or `(unrecognized)`), so runs under two modes or two
//   personal policies can be told apart. It never records a config path, a SKILL_EVAL_PASS_ENV value or any
//   other CK_ value.
// Live runs cost model tokens and need the host's existing authentication; results are stochastic, so use
// several runs and treat rates, not single answers, as evidence. Set SKILL_EVAL_HOST_BIN to the host
// executable when it is not on PATH (on Windows, point it at claude.exe / codex.exe).
// SKILL_EVAL_MODEL selects the model (`--model` on Claude, `-m` on Codex); compare a frontier and a smaller
// or open-weight model to see whether activation holds across them. The report records the host version and
// model, so rates from two machines or host versions can be told apart.
//
// A run that measured nothing is never scored as "no skill started": a host that exits without a completed
// turn (Claude: no successful `result` event; Codex: a non-zero exit or no `turn.completed`) is an error, and a
// run that outlives --timeout-ms is a timeout. Both are reported per case, kept out of the hit and
// false-trigger rates, and the remaining runs continue. Exit code: 0 measured and within the thresholds,
// 1 a threshold missed, 2 invalid input, a missing host executable, or any run that errored or timed out.
// PORTABILITY CONTRACT: node: built-ins only.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { childEnv } from './context-evaluation-adapters/adapter-common.mjs';

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require('./lib/project-root.cjs');
const frameworkRuntime = require('../hooks/lib/framework-runtime.cjs');
const workflowRoutingConfig = require('./lib/workflow-routing-config.cjs');

const SKILL_FILE = /(?:^|[\s"'`/\\])\.(?:claude|agents)[/\\]skills[/\\]([a-z0-9][a-z0-9-]*)[/\\]SKILL\.md/g;

/** Skill names a block of text reads by path. Pure. */
export function skillFilesIn(text) {
    const names = new Set();
    for (const match of String(text).matchAll(SKILL_FILE)) names.add(match[1]);
    return names;
}

/** Fields that carry what a command printed, not what the agent asked to read. */
const OUTPUT_FIELDS = new Set(['aggregated_output', 'output', 'stdout', 'stderr']);

/** Every string value in a parsed JSON value, read raw (a Windows `\` separator stays single), skipping
 * command output fields. Pure. */
export function stringsIn(value, out = []) {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) for (const item of value) stringsIn(item, out);
    else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) if (!OUTPUT_FIELDS.has(key)) stringsIn(item, out);
    }
    return out;
}

/** Skill names that any string value of a parsed JSON value reads by path. Pure. */
function skillFilesInValue(value) {
    const names = new Set();
    for (const text of stringsIn(value)) for (const name of skillFilesIn(text)) names.add(name);
    return names;
}

/** Skills started in one Claude `--output-format stream-json` transcript. Pure. */
export function claudeStartedSkills(jsonl) {
    const started = new Set();
    for (const line of String(jsonl).split(/\r?\n/)) {
        if (!line.trim().startsWith('{')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        for (const item of event?.message?.content || []) {
            if (item?.type !== 'tool_use') continue;
            if (item.name === 'Skill' && typeof item.input?.skill === 'string') started.add(item.input.skill.replace(/^\//, '').split(/\s/)[0]);
            else for (const name of skillFilesInValue(item.input ?? {})) started.add(name);
        }
    }
    return started;
}

/** Skills started in one Codex `exec --json` transcript (it loads a skill by reading its file). Pure. */
export function codexStartedSkills(jsonl) {
    const started = new Set();
    for (const line of String(jsonl).split(/\r?\n/)) {
        if (!line.trim().startsWith('{')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        const item = event?.item ?? event?.msg ?? event;
        if (item?.type === 'agent_message' || item?.type === 'reasoning') continue;
        for (const name of skillFilesInValue(item)) started.add(name);
    }
    return started;
}

/** One run's outcome: `{ outcome: 'ok', started }`, or `{ outcome: 'error' | 'timeout', detail }`. A bare array of
 * skill names is read as an ok run. Pure. */
function asRun(run) {
    return Array.isArray(run) ? { outcome: 'ok', started: run } : run;
}

/** Score runs: per case pass rate, per expected skill hit rate, false triggers. Only measured (ok) runs count
 * toward the rates; errored and timed-out runs are counted apart, never as "no skill started". Pure. */
export function score(results) {
    const cases = results.map(({ id, expect, runs }) => {
        const all = runs.map(asRun);
        const measured = all.filter(run => run.outcome === 'ok').map(run => run.started);
        const passes = measured.filter(started => (expect === null ? started.length === 0 : started.includes(expect) && started.every(name => name === expect))).length;
        const hits = expect === null ? null : measured.filter(started => started.includes(expect)).length;
        const falseTriggers = measured.filter(started => started.some(name => name !== expect)).length;
        const errors = all.filter(run => run.outcome === 'error').length;
        const timeouts = all.filter(run => run.outcome === 'timeout').length;
        return { id, expect, runs: measured.length, errors, timeouts, passes, hits, falseTriggers, started: measured, failures: all.filter(run => run.outcome !== 'ok') };
    });
    const positive = cases.filter(item => item.expect !== null);
    const totalRuns = cases.reduce((sum, item) => sum + item.runs, 0);
    const hitRuns = positive.reduce((sum, item) => sum + item.runs, 0);
    return {
        cases,
        hitRate: hitRuns ? positive.reduce((sum, item) => sum + item.hits, 0) / hitRuns : null,
        falseTriggerRate: totalRuns ? cases.reduce((sum, item) => sum + item.falseTriggers, 0) / totalRuns : null,
        unmeasuredRuns: cases.reduce((sum, item) => sum + item.errors + item.timeouts, 0)
    };
}

export function readCases(file) {
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cases = document?.cases;
    if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${file}: "cases" must be a non-empty array`);
    const ids = new Set();
    for (const item of cases) {
        if (typeof item?.id !== 'string' || !item.id || ids.has(item.id)) throw new Error(`${file}: every case needs a unique string id`);
        if (typeof item.prompt !== 'string' || !item.prompt.trim()) throw new Error(`${file}: case ${item.id} needs a prompt`);
        if (item.expect !== null && (typeof item.expect !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(item.expect))) {
            throw new Error(`${file}: case ${item.id} expect must be a skill folder name or null`);
        }
        ids.add(item.id);
    }
    return cases;
}

/** The only Claude tools a run has: an activation starts through the Skill tool or a read. */
export const CLAUDE_TOOLS = ['Skill', 'Read', 'Glob', 'Grep'];
/** Claude tools a run may not use; kept beside the allowlist as a second guard. */
export const CLAUDE_DISALLOWED_TOOLS = ['Bash', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

/** The host argv for one run. Pure. */
export function hostArgv(host, prompt, model) {
    const pick = model ? (host === 'claude' ? ['--model', model] : ['-m', model]) : [];
    if (host === 'claude') {
        return ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'plan',
            '--tools', CLAUDE_TOOLS.join(','), '--disallowedTools', CLAUDE_DISALLOWED_TOOLS.join(','), '--setting-sources', 'project,local', '--strict-mcp-config',
            '--max-turns', '3', ...pick];
    }
    return ['exec', '--json', '--sandbox', 'read-only', '--ephemeral', '--skip-git-repo-check', ...pick, prompt];
}

/** Framework switches the host's hooks read from the environment, passed by name so a run measures the mode the
 * operator chose: the framework mode, quiet project rules, quiet native policy and native auto-apply
 * (`framework-runtime.cjs`), the workflow route mode, decision-support mode and skill auto-trigger preference
 * (`workflow-routing-config.cjs`), the commit review mode
 * (`commit-review-policy.cjs`), the prompt ledger switch (`prompt-ledger-store.cjs`) and each prompt router's
 * `ENV_SWITCH` kill switch. Every one is a mode word or a boolean. Never a `CK_` prefix: other CK_ names, such as
 * CK_GIT_URL, can carry a credential-bearing URL. */
export const FRAMEWORK_SWITCHES = Object.freeze([
    'CK_FRAMEWORK_MODE', 'CK_QUIET_PROJECT_RULES', 'CK_QUIET_NATIVE', 'CK_AUTO_APPLY_NATIVE', 'CK_WORKFLOW_ROUTE_MODE', 'CK_DECISION_SUPPORT_MODE',
    'CK_SKILL_AUTO_TRIGGER', 'CK_COMMIT_REVIEW_MODE', 'CK_PROMPT_LEDGER', 'CK_KNOWLEDGE_ROUTE', 'CK_QUALITY_SKILL_REMINDER',
    'CK_CORE_PRINCIPLES_INJECT', 'CK_AI_FEATURE_ROUTE', 'CK_COMMIT_SKILL_ROUTE', 'CK_JUDGEMENT_INTEGRITY_ROUTE'
]);

/** A switch value as the report records it: trimmed, wrapping quotes removed (`set NAME="quiet"` in cmd.exe keeps
 * them), lower-cased, and kept only when it is a short mode word; anything else, which a mis-set switch could make
 * an arbitrary string, is `(unrecognized)`. Pure. */
export function switchValue(raw) {
    const value = String(raw).trim().replace(/^(["'])(.*)\1$/, '$2').trim().toLowerCase();
    return /^[a-z0-9_-]{1,20}$/.test(value) ? value : '(unrecognized)';
}

/** The host's environment: the adapters' allowlist, the framework switches, CODEX_HOME for Codex, plus
 * SKILL_EVAL_PASS_ENV names. Pure. */
export function hostEnv(host, env) {
    const extra = [env.SKILL_EVAL_PASS_ENV || '', ...FRAMEWORK_SWITCHES, host === 'codex' ? 'CODEX_HOME' : ''].filter(Boolean).join(',');
    return childEnv(env, extra);
}

/** The framework state a run sees, read from the same config layers and environment as the hooks: the effective
 * framework mode, skill auto-trigger policy and workflow route mode, each with the layer that decided it, quiet
 * project rules, and each framework switch the host received with its normalized value (`switchValue`).
 * Records no resolver path (they carry the home directory) and no value outside FRAMEWORK_SWITCHES.
 * `switchesPassed` (names only) is kept for one release beside `switches`. */
export function frameworkState(host, cwd, env) {
    const seen = hostEnv(host, env);
    const options = { rootDir: cwd, env: seen, homeDir: seen.HOME || seen.USERPROFILE || undefined };
    const mode = frameworkRuntime.resolveFrameworkMode(options);
    const autoTrigger = workflowRoutingConfig.resolveSkillAutoTrigger(options);
    const routeMode = workflowRoutingConfig.resolveWorkflowRouteMode(options);
    const passed = FRAMEWORK_SWITCHES.filter(name => Object.hasOwn(seen, name));
    return {
        mode: mode.mode,
        modeSource: mode.source,
        quietProjectRules: frameworkRuntime.resolveQuietProjectRules(options).enabled,
        skillAutoTrigger: { enabled: autoTrigger.enabled, source: autoTrigger.source },
        workflowRouteMode: { mode: routeMode.mode, source: routeMode.source },
        switches: Object.fromEntries(passed.map(name => [name, switchValue(seen[name])])),
        switchesPassed: passed
    };
}

/** Whether a finished transcript shows a completed turn, so its start set is a measurement. Pure.
 * Claude: a `result` event that succeeded or stopped at the turn limit (what started before it is real).
 * Codex: a `turn.completed` event and a zero exit. */
export function transcriptCompleted(host, jsonl, status) {
    let completed = false;
    for (const line of String(jsonl).split(/\r?\n/)) {
        if (!line.trim().startsWith('{')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (host === 'claude' && event?.type === 'result') completed = event.subtype === 'error_max_turns' || (event.subtype === 'success' && event.is_error !== true);
        if (host === 'codex' && event?.type === 'turn.completed') completed = true;
        if (host === 'codex' && (event?.type === 'turn.failed' || event?.type === 'error')) return false;
    }
    return host === 'codex' ? completed && status === 0 : completed;
}

/** Spawn errors that mean the host cannot run at all, so every later run would fail the same way. */
const SETUP_ERRORS = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOEXEC']);

/** One host run: `{ outcome: 'ok', started }`, or `{ outcome: 'error' | 'timeout', detail }`. Throws only when
 * the host executable cannot be started. */
export function runOnce({ host, prompt, cwd, timeoutMs, env = process.env }) {
    const bin = env.SKILL_EVAL_HOST_BIN || host;
    const result = spawnSync(bin, hostArgv(host, prompt, env.SKILL_EVAL_MODEL), { cwd, env: hostEnv(host, env), encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (result.error && SETUP_ERRORS.has(result.error.code)) throw new Error(`${bin}: ${result.error.message}`);
    if (result.error?.code === 'ETIMEDOUT') return { outcome: 'timeout', detail: `no result within ${timeoutMs} ms` };
    if (result.error || result.signal || !transcriptCompleted(host, result.stdout, result.status)) {
        const reason = result.error?.message || (result.signal ? `signal ${result.signal}` : `status ${result.status}, no completed turn`);
        return { outcome: 'error', detail: `${reason}${result.stderr ? `: ${String(result.stderr).trim().slice(-300)}` : ''}` };
    }
    const started = host === 'claude' ? claudeStartedSkills(result.stdout) : codexStartedSkills(result.stdout);
    return { outcome: 'ok', started: [...started].sort() };
}

/** The host's `--version` line, or null; part of the report so runs on two machines can be compared. */
function hostVersion(host, env) {
    const result = spawnSync(env.SKILL_EVAL_HOST_BIN || host, ['--version'], { env: hostEnv(host, env), encoding: 'utf8', timeout: 30000, windowsHide: true });
    return result.error || result.status !== 0 ? null : String(result.stdout).trim().split(/\r?\n/)[0] || null;
}

function parseArgs(argv) {
    const options = { host: 'claude', runs: 3, timeoutMs: 180000, json: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const [key, inline] = arg.includes('=') ? arg.split(/=(.*)/s) : [arg, undefined];
        const value = () => inline ?? argv[++index];
        if (key === '--cases') options.cases = value();
        else if (key === '--host') options.host = value();
        else if (key === '--runs') options.runs = Number(value());
        else if (key === '--timeout-ms') options.timeoutMs = Number(value());
        else if (key === '--min-hit-rate') options.minHitRate = Number(value());
        else if (key === '--max-false-rate') options.maxFalseRate = Number(value());
        else if (key === '--json') options.json = true;
        else throw new Error(`unknown option ${arg}`);
    }
    if (!options.cases) throw new Error('--cases <file.json> is required');
    if (!['claude', 'codex'].includes(options.host)) throw new Error('--host must be claude or codex');
    if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
    for (const key of ['minHitRate', 'maxFalseRate']) {
        if (options[key] !== undefined && !(options[key] >= 0 && options[key] <= 1)) throw new Error(`--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)} must be between 0 and 1`);
    }
    return options;
}

export function main(argv = process.argv.slice(2), { cwd = process.cwd(), env = process.env, log = console.log } = {}) {
    const options = parseArgs(argv);
    const cases = readCases(path.resolve(cwd, options.cases));
    const version = hostVersion(options.host, env);
    const results = cases.map(item => ({ id: item.id, expect: item.expect, runs: Array.from({ length: options.runs }, () => runOnce({ host: options.host, prompt: item.prompt, cwd, timeoutMs: options.timeoutMs, env })) }));
    const framework = frameworkState(options.host, cwd, env);
    const report = { host: options.host, hostVersion: version, model: env.SKILL_EVAL_MODEL || 'host-default', framework, runsPerCase: options.runs, ...score(results) };
    const pct = value => (value === null ? 'n/a' : `${Math.round(value * 100)}%`);
    if (options.json) log(JSON.stringify(report, null, 2));
    else {
        for (const item of report.cases) {
            const unmeasured = item.errors + item.timeouts ? `\tunmeasured ${item.errors} error(s), ${item.timeouts} timeout(s): ${item.failures.map(run => run.detail).join(' | ')}` : '';
            log(`${item.id}\texpect ${item.expect ?? '(none)'}\tpass ${item.passes}/${item.runs}\tstarted ${item.started.map(run => run.join('+') || '-').join(' | ')}${unmeasured}`);
        }
        log(`hit rate ${pct(report.hitRate)} · false-trigger rate ${pct(report.falseTriggerRate)} · ${options.runs} run(s) per case on ${options.host} ${report.hostVersion ?? '(version unknown)'}, model ${report.model}, framework mode ${framework.mode} (${framework.modeSource}${framework.quietProjectRules ? ', quiet project rules' : ''}${framework.switchesPassed.length ? `; switches ${Object.entries(framework.switches).map(([name, value]) => `${name}=${value}`).join(',')}` : ''}), auto-trigger ${framework.skillAutoTrigger.enabled ? 'on' : 'off'} (${framework.skillAutoTrigger.source})${report.unmeasuredRuns ? ` · ${report.unmeasuredRuns} run(s) unmeasured` : ''}`);
    }
    // A run that measured nothing cannot support a pass, whatever the rates of the other runs say.
    if (report.unmeasuredRuns > 0) return { report, exitCode: 2 };
    const failed = (options.minHitRate !== undefined && report.hitRate !== null && report.hitRate < options.minHitRate) ||
        (options.maxFalseRate !== undefined && report.falseTriggerRate !== null && report.falseTriggerRate > options.maxFalseRate);
    return { report, exitCode: failed ? 1 : 0 };
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    try {
        process.exitCode = main().exitCode;
    } catch (error) {
        console.error(`[skill-activation-eval] ${error.message}`);
        process.exitCode = 2;
    }
}
