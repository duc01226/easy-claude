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
// Each run is a fresh headless host process in the current project, read-only by intent:
// Claude runs with --permission-mode plan, Codex with --sandbox read-only. Live runs cost model tokens
// and need the host's existing authentication; results are stochastic, so use several runs and treat
// rates, not single answers, as evidence. Set SKILL_EVAL_HOST_BIN to the host executable when it is not
// on PATH (on Windows, point it at claude.exe / codex.exe).
// PORTABILITY CONTRACT: node: built-ins only.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require('./lib/project-root.cjs');

const SKILL_FILE = /(?:^|[\s"'`/\\])\.(?:claude|agents)[/\\]skills[/\\]([a-z0-9][a-z0-9-]*)[/\\]SKILL\.md/g;

/** Skill names a block of text reads by path. Pure. */
export function skillFilesIn(text) {
    const names = new Set();
    for (const match of String(text).matchAll(SKILL_FILE)) names.add(match[1]);
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
            else for (const name of skillFilesIn(JSON.stringify(item.input ?? {}))) started.add(name);
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
        for (const name of skillFilesIn(JSON.stringify(item))) started.add(name);
    }
    return started;
}

/** Score runs: per case pass rate, per expected skill hit rate, false triggers. Pure. */
export function score(results) {
    const cases = results.map(({ id, expect, runs }) => {
        const passes = runs.filter(started => (expect === null ? started.length === 0 : started.includes(expect) && started.every(name => name === expect))).length;
        const hits = expect === null ? null : runs.filter(started => started.includes(expect)).length;
        const falseTriggers = runs.filter(started => started.some(name => name !== expect)).length;
        return { id, expect, runs: runs.length, passes, hits, falseTriggers, started: runs };
    });
    const positive = cases.filter(item => item.expect !== null);
    const totalRuns = cases.reduce((sum, item) => sum + item.runs, 0);
    const hitRuns = positive.reduce((sum, item) => sum + item.runs, 0);
    return {
        cases,
        hitRate: hitRuns ? positive.reduce((sum, item) => sum + item.hits, 0) / hitRuns : null,
        falseTriggerRate: totalRuns ? cases.reduce((sum, item) => sum + item.falseTriggers, 0) / totalRuns : null
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

function hostArgv(host, prompt) {
    if (host === 'claude') return ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'plan', '--max-turns', '3'];
    return ['exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', prompt];
}

export function runOnce({ host, prompt, cwd, timeoutMs, env = process.env }) {
    const bin = env.SKILL_EVAL_HOST_BIN || host;
    const result = spawnSync(bin, hostArgv(host, prompt), { cwd, env, encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (result.error) throw new Error(`${bin}: ${result.error.message}`);
    const started = host === 'claude' ? claudeStartedSkills(result.stdout) : codexStartedSkills(result.stdout);
    return [...started].sort();
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
    const results = cases.map(item => ({ id: item.id, expect: item.expect, runs: Array.from({ length: options.runs }, () => runOnce({ host: options.host, prompt: item.prompt, cwd, timeoutMs: options.timeoutMs, env })) }));
    const report = { host: options.host, runsPerCase: options.runs, ...score(results) };
    const pct = value => (value === null ? 'n/a' : `${Math.round(value * 100)}%`);
    if (options.json) log(JSON.stringify(report, null, 2));
    else {
        for (const item of report.cases) log(`${item.id}\texpect ${item.expect ?? '(none)'}\tpass ${item.passes}/${item.runs}\tstarted ${item.started.map(run => run.join('+') || '-').join(' | ')}`);
        log(`hit rate ${pct(report.hitRate)} · false-trigger rate ${pct(report.falseTriggerRate)} · ${options.runs} run(s) per case on ${options.host}`);
    }
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
