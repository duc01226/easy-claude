#!/usr/bin/env node
// Routing evals: does a prompt reach the route the framework intends — a catalog workflow, a skill, a
// custom-simple route or a direct answer — for novice phrasing and for follow-ups mid-session?
//
//   node .claude/skills/shared/skill-evals/run-routing-evals.mjs                 # dry plan: nothing runs, no cost
//   node .claude/skills/shared/skill-evals/run-routing-evals.mjs --run [--host=claude|codex] [--max-cases=3]
//        [--case=<id>[,<id>]] [--runs=1] [--timeout-ms=240000] [--keep-fixtures] [--json]
//
// On demand only: never in the hook suite or CI (each run costs model tokens on the operator's logged-in host CLI).
// - Cases: the corpus cases that carry a `routing` object (corpus.v1.json). `routing.acceptedRoutes` lists the
//   routes that pass; `routing.priorPrompts` are earlier turns of the same session (mid-session cases).
// - Cap: at most --max-cases cases (default 3) and at most MAX_RUNS host runs per invocation (cases × runs).
// - Fixtures: each case runs in a synthetic throwaway project made in the OS temporary folder (outside every
//   repository, so no ancestor CLAUDE.md or AGENTS.md reaches the run): the framework's tracked `.claude/`
//   files (tests excluded; plus `.agents/`, `.codex/` for Codex) and the case's synthetic files. No project
//   data, no project config, no Git repository. Fixtures are deleted after the run unless --keep-fixtures.
// - Suggest-only: the host runs read-only (skill-activation-eval.mjs argv: Claude plan mode with Skill, Read,
//   Glob and Grep only; Codex read-only sandbox). A wrong route is reported, never acted on.
// - Host unavailable (no executable, or `--version` fails): status ENVIRONMENT-BLOCKED, exit 3, nothing runs.
// - Report: printed, and written to <project>/tmp/reports/skill-evals/routing-<timestamp>.json, with the host
//   version, model, token use and cost when the host reports them. Exit 0 whatever the accuracy (report-only),
//   2 for invalid input, 3 for ENVIRONMENT-BLOCKED.
// The observed route: a workflow the run started (Skill `start-workflow <id>` or a `workflow-*` skill), else the
// `Route:` line the gate asks the assistant to declare in its final turn, else a skill it started, else
// `undeclared`. Mid-session cases need several turns in one session: Claude only (stream-json input); on Codex
// they are reported as skipped.
// PORTABILITY CONTRACT: node: built-ins only; literal argv, never a shell.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { claudeStartedSkills, codexStartedSkills, hostArgv, hostVersion, runHost } from '../../../scripts/skill-activation-eval.mjs';
import { validateCorpus } from './validate.mjs';

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require('../../../scripts/lib/project-root.cjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FRAMEWORK_ROOT = path.resolve(HERE, '..', '..', '..', '..');
export const DEFAULT_MAX_CASES = 3;
/** Hard ceiling on host runs per invocation (cases × runs), whatever the flags say. */
export const MAX_RUNS = 12;
export const STATUS = Object.freeze({ PLANNED: 'PLANNED', COMPLETED: 'COMPLETED', ENVIRONMENT_BLOCKED: 'ENVIRONMENT-BLOCKED' });
/** A synthetic project used when a case supplies no files of its own. */
const DEFAULT_FIXTURE = Object.freeze({
    'package.json': '{\n  "name": "fixture-app",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": { "start": "node src/app.js" }\n}\n',
    'README.md': '# Fixture app\n\nA small synthetic app used only for routing evaluations.\n',
    'src/app.js': "'use strict';\n\nfunction total(items) {\n    return items.reduce((sum, item) => sum + item.price, 0);\n}\n\nmodule.exports = { total };\n"
});
// Test folders are plural (`tests/`); the singular `skills/test/` is the shipped `test` skill and must stay.
const EXCLUDED_FRAMEWORK_PATH = /(?:^|\/)(?:tests|node_modules|__pycache__)\//;

/** Routing cases of a validated corpus, filtered by id and capped. Pure. */
export function selectCases(corpus, { ids = [], maxCases = DEFAULT_MAX_CASES } = {}) {
    const routing = corpus.cases.filter(item => item.routing);
    const unknown = ids.filter(id => !routing.some(item => item.id === id));
    if (unknown.length) throw new Error(`not a routing case: ${unknown.join(', ')}`);
    const chosen = ids.length ? routing.filter(item => ids.includes(item.id)) : routing;
    return { cases: chosen.slice(0, maxCases), skipped: chosen.slice(maxCases).map(item => item.id) };
}

/** The route token a `Route:` declaration names, lower-cased, or null. Pure. */
export function declaredRoute(text) {
    let found = null;
    for (const match of String(text).matchAll(/Route:\s*[*_`{]*\s*([a-z0-9][a-z0-9-]*)/gi)) found = match[1].toLowerCase();
    return found;
}

function events(jsonl) {
    return String(jsonl)
        .split(/\r?\n/)
        .filter(line => line.trim().startsWith('{'))
        .flatMap(line => {
            try {
                return [JSON.parse(line)];
            } catch {
                return [];
            }
        });
}

/** Events of the last turn: after the second-to-last turn end (Claude `result`, Codex `turn.completed`). Pure. */
export function lastTurn(host, jsonl) {
    const all = events(jsonl);
    const ends = all.map((event, index) => ((host === 'claude' ? event.type === 'result' : event.type === 'turn.completed') ? index : -1)).filter(i => i >= 0);
    const start = ends.length >= 2 ? ends.at(-2) + 1 : 0;
    return all.slice(start);
}

/**
 * The route a run took, from the last turn's events. Pure.
 * @returns {{route: string, source: 'workflow-start'|'declared'|'skill'|'none', started: string[]}}
 */
export function observedRoute(host, jsonl) {
    const turn = lastTurn(host, jsonl);
    const text = [];
    const workflows = [];
    for (const event of turn) {
        if (host === 'claude') {
            for (const block of Array.isArray(event?.message?.content) ? event.message.content : []) {
                if (event.type !== 'assistant') continue;
                if (block?.type === 'text' && typeof block.text === 'string') text.push(block.text);
                if (block?.type === 'tool_use' && block.name === 'Skill' && typeof block.input?.skill === 'string') {
                    const skill = block.input.skill.replace(/^\//, '').split(/\s/)[0];
                    const args = typeof block.input.args === 'string' ? block.input.args : '';
                    const viaStart = skill === 'start-workflow' ? /^\s*(workflow-[a-z0-9-]+)/.exec(args)?.[1] : null;
                    if (viaStart) workflows.push(viaStart);
                    else if (/^workflow-[a-z0-9-]+$/.test(skill)) workflows.push(skill);
                }
            }
        } else {
            const item = event?.item ?? event?.msg;
            if (item?.type === 'agent_message' && typeof item.text === 'string') text.push(item.text);
        }
    }
    const lines = turn.map(event => JSON.stringify(event)).join('\n');
    const started = [...(host === 'claude' ? claudeStartedSkills(lines) : codexStartedSkills(lines))].sort();
    if (host === 'codex') for (const name of started) if (/^workflow-/.test(name)) workflows.push(name);
    if (workflows.length) return { route: workflows[0], source: 'workflow-start', started };
    const declared = declaredRoute(text.join('\n'));
    if (declared) return { route: declared, source: 'declared', started };
    const skill = started.find(name => name !== 'start-workflow');
    if (skill) return { route: skill, source: 'skill', started };
    return { route: 'undeclared', source: 'none', started };
}

/** Tokens and cost a run reported, when the host exposes them; null fields when it does not. Pure. */
export function usageOf(host, jsonl) {
    const usage = { inputTokens: null, outputTokens: null, costUsd: null };
    const add = (key, value) => {
        if (Number.isFinite(value)) usage[key] = (usage[key] ?? 0) + value;
    };
    for (const event of events(jsonl)) {
        if (host === 'claude' && event.type === 'result') {
            add('inputTokens', event.usage?.input_tokens);
            add('outputTokens', event.usage?.output_tokens);
            add('costUsd', event.total_cost_usd);
        }
        if (host === 'codex' && event.type === 'turn.completed') {
            add('inputTokens', event.usage?.input_tokens);
            add('outputTokens', event.usage?.output_tokens);
        }
    }
    return usage;
}

/** The argv and stdin for one case. Claude replays earlier turns through stream-json input. Pure. */
export function caseInvocation(host, item, model) {
    const prior = item.routing.priorPrompts || [];
    if (!prior.length) return { argv: hostArgv(host, item.prompt, model), input: undefined };
    if (host !== 'claude') return null;
    const argv = hostArgv(host, '', model);
    argv.splice(argv.indexOf('-p') + 1, 1);
    // Scale the turn limit by the number of prompts, so the limit never ends the session before its last prompt.
    const turns = argv.indexOf('--max-turns');
    argv[turns + 1] = String(Number(argv[turns + 1]) * (prior.length + 1));
    argv.push('--input-format', 'stream-json');
    const input = [...prior, item.prompt].map(text => JSON.stringify({ type: 'user', message: { role: 'user', content: text } })).join('\n') + '\n';
    return { argv, input };
}

/** Repository-relative paths of the framework files a fixture receives (tracked files only; tests excluded). */
export function frameworkFiles(host, root = FRAMEWORK_ROOT) {
    const folders = host === 'codex' ? ['.claude', '.agents', '.codex'] : ['.claude'];
    const listed = spawnSync('git', ['ls-files', '-z', '--', ...folders], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (listed.status !== 0) throw new Error(`cannot list framework files: ${String(listed.stderr || listed.error?.message || '').trim()}`);
    return listed.stdout
        .split('\0')
        .filter(Boolean)
        .filter(file => !EXCLUDED_FRAMEWORK_PATH.test(file));
}

function safeRelative(file) {
    const normal = path.posix.normalize(file);
    return !path.posix.isAbsolute(normal) && !normal.startsWith('../') && normal !== '..' && !/^\.(?:claude|agents|codex)(?:\/|$)/.test(normal);
}

/** Materialize one synthetic throwaway project for a case; returns its folder. */
export function materializeFixture(item, { host, parent, root = FRAMEWORK_ROOT, files = frameworkFiles(host, root) }) {
    const folder = fs.mkdtempSync(path.join(parent, `${item.id}-`));
    for (const file of files) {
        const target = path.join(folder, ...file.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(root, ...file.split('/')), target);
    }
    for (const [file, content] of Object.entries(item.routing.fixtureFiles || DEFAULT_FIXTURE)) {
        if (!safeRelative(file)) throw new Error(`${item.id}: unsafe fixture path ${file}`);
        const target = path.join(folder, ...file.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    }
    return folder;
}

function parseArgs(argv) {
    const options = { run: false, host: 'claude', maxCases: DEFAULT_MAX_CASES, runs: 1, timeoutMs: 240000, ids: [], keepFixtures: false, json: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const [key, inline] = arg.includes('=') ? arg.split(/=(.*)/s) : [arg, undefined];
        const value = () => inline ?? argv[++index];
        if (key === '--run') options.run = true;
        else if (key === '--dry-run') options.run = false;
        else if (key === '--host') options.host = value();
        else if (key === '--max-cases') options.maxCases = Number(value());
        else if (key === '--runs') options.runs = Number(value());
        else if (key === '--timeout-ms') options.timeoutMs = Number(value());
        else if (key === '--case') options.ids.push(...String(value()).split(',').filter(Boolean));
        else if (key === '--corpus') options.corpus = value();
        else if (key === '--keep-fixtures') options.keepFixtures = true;
        else if (key === '--json') options.json = true;
        else throw new Error(`unknown option ${arg}`);
    }
    if (!['claude', 'codex'].includes(options.host)) throw new Error('--host must be claude or codex');
    for (const key of ['maxCases', 'runs', 'timeoutMs'])
        if (!Number.isInteger(options[key]) || options[key] < 1) throw new Error(`--${key} must be a positive integer`);
    if (options.maxCases * options.runs > MAX_RUNS) throw new Error(`at most ${MAX_RUNS} host runs per invocation (cases × runs)`);
    return options;
}

function stamp(now) {
    return new Date(now).toISOString().replace(/[:.]/g, '-');
}

/**
 * Plan, or with --run execute, the routing evals.
 * @returns {{report: object, exitCode: number}}
 */
export function main(
    argv = process.argv.slice(2),
    { cwd = process.cwd(), env = process.env, log = console.log, now = Date.now(), frameworkRoot = FRAMEWORK_ROOT } = {}
) {
    const options = parseArgs(argv);
    const corpusFile = options.corpus ? path.resolve(cwd, options.corpus) : path.join(HERE, 'corpus.v1.json');
    const corpus = validateCorpus(JSON.parse(fs.readFileSync(corpusFile, 'utf8')));
    const { cases, skipped } = selectCases(corpus, { ids: options.ids, maxCases: options.maxCases });
    const base = { corpusVersion: corpus.corpusVersion, host: options.host, runsPerCase: options.runs, cappedOut: skipped };
    const print = report => {
        if (options.json) log(JSON.stringify(report, null, 2));
        else {
            for (const item of report.cases)
                log(
                    `${item.id}\t${item.audience}\taccepts ${item.acceptedRoutes.join('|')}${item.observed ? `\tobserved ${item.observed.join(' | ')}\tpass ${item.passes}/${item.measured}` : ''}${item.skipped ? `\tskipped: ${item.skipped}` : ''}`
                );
            log(
                `${report.status}${report.accuracy !== undefined ? ` · route accuracy ${report.accuracy === null ? 'n/a' : `${Math.round(report.accuracy * 100)}%`}` : ''}${report.reason ? ` · ${report.reason}` : ''}${report.reportFile ? ` · report ${report.reportFile}` : ''}`
            );
        }
    };
    const summary = item => ({
        id: item.id,
        audience: item.routing.audience,
        acceptedRoutes: item.routing.acceptedRoutes,
        priorTurns: (item.routing.priorPrompts || []).length
    });
    if (!options.run) {
        const report = {
            ...base,
            status: STATUS.PLANNED,
            reason: 'dry plan: pass --run to call the host (costs model tokens)',
            cases: cases.map(item => ({ ...summary(item), invocation: caseInvocation(options.host, item, env.SKILL_EVAL_MODEL)?.argv ?? null }))
        };
        print(report);
        return { report, exitCode: 0 };
    }
    const version = (() => {
        try {
            return hostVersion(options.host, env);
        } catch {
            return null;
        }
    })();
    if (!version) {
        const report = {
            ...base,
            status: STATUS.ENVIRONMENT_BLOCKED,
            reason: `${env.SKILL_EVAL_HOST_BIN || options.host} is not available (no --version)`,
            cases: cases.map(summary)
        };
        print(report);
        return { report, exitCode: 3 };
    }
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-eval-'));
    const results = [];
    try {
        const files = frameworkFiles(options.host, frameworkRoot);
        for (const item of cases) {
            const invocation = caseInvocation(options.host, item, env.SKILL_EVAL_MODEL);
            if (!invocation) {
                results.push({ ...summary(item), skipped: `${options.host} cannot replay earlier turns of a session` });
                continue;
            }
            const folder = materializeFixture(item, { host: options.host, parent, root: frameworkRoot, files });
            const runs = [];
            for (let run = 0; run < options.runs; run += 1) {
                const outcome = runHost({
                    host: options.host,
                    argv: invocation.argv,
                    input: invocation.input,
                    cwd: folder,
                    timeoutMs: options.timeoutMs,
                    env: { ...env, CLAUDE_PROJECT_DIR: folder }
                });
                if (outcome.outcome !== 'ok') runs.push({ outcome: outcome.outcome, detail: outcome.detail });
                else runs.push({ outcome: 'ok', ...observedRoute(options.host, outcome.stdout), usage: usageOf(options.host, outcome.stdout) });
            }
            const measured = runs.filter(run => run.outcome === 'ok');
            results.push({
                ...summary(item),
                promptHash: crypto
                    .createHash('sha256')
                    .update([...(item.routing.priorPrompts || []), item.prompt].join('\n'))
                    .digest('hex'),
                observed: measured.map(run => run.route),
                measured: measured.length,
                passes: measured.filter(run => item.routing.acceptedRoutes.includes(run.route)).length,
                runs
            });
        }
    } finally {
        if (!options.keepFixtures) fs.rmSync(parent, { recursive: true, force: true });
    }
    const measured = results.reduce((sum, item) => sum + (item.measured || 0), 0);
    const report = {
        ...base,
        status: STATUS.COMPLETED,
        hostVersion: version,
        model: env.SKILL_EVAL_MODEL || 'host-default',
        fixtures: options.keepFixtures ? parent : 'deleted',
        accuracy: measured ? results.reduce((sum, item) => sum + (item.passes || 0), 0) / measured : null,
        cases: results
    };
    const reportDir = path.join(cwd, 'tmp', 'reports', 'skill-evals');
    fs.mkdirSync(reportDir, { recursive: true });
    report.reportFile = path.join(reportDir, `routing-${stamp(now)}.json`);
    fs.writeFileSync(report.reportFile, JSON.stringify(report, null, 2) + '\n');
    print(report);
    return { report, exitCode: 0 };
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    try {
        process.exitCode = main().exitCode;
    } catch (error) {
        console.error(`[run-routing-evals] ${error.message}`);
        process.exitCode = 2;
    }
}
