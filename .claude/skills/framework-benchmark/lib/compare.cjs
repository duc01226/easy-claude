'use strict';

// Cross-run comparison: turns several saved runs into one task-level verdict.
// Repeats of one task stay correlated, so each task counts once; runs with
// different runtimes are never pooled. No model call happens here.

const fs = require('node:fs');
const path = require('node:path');
const { mean, median, quality } = require('./report.cjs');
const { runtimeBackend } = require('./contract.cjs');
const { inertMarkdown } = require('./journey.cjs');

// Quality scores move in 3.125-point steps (one dimension point of 32);
// a gap under 5/100 is reviewer noise, not a task-level win.
const QUALITY_TIE_BAND = 5;
// Below this many non-tied tasks even a clean sweep cannot reach p < 0.05 (5-0 gives 0.0625).
const MIN_DECISIVE_TASKS = 6;
const SIGNIFICANCE = 0.05;
const MAX_RUNS = 200;

// Two-sided 95% Student t quantiles for 1..30 degrees of freedom; 1.96 beyond (normal approximation).
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
    2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];

// Paired mean difference with a 95% t interval over tasks (each task is one cluster); null below two tasks.
function pairedInterval(deltas) {
    const values = deltas.filter(Number.isFinite);
    const n = values.length;
    if (n < 2) return null;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1));
    const half = (T975[n - 2] ?? 1.96) * sd / Math.sqrt(n);
    return { tasks: n, mean, low: mean - half, high: mean + half };
}

// A task treatment is a workflow when it requires any workflow-* skill (greenfield always starts one), else a single skill.
function treatmentKind(spec) {
    const skills = [...(spec.expectedSkills || []), ...(spec.projectMode === 'greenfield' ? ['workflow-greenfield-init'] : [])];
    return skills.some(skill => /^workflow-/.test(skill)) ? 'workflow' : 'skill';
}

function binomial(n, k) {
    let value = 1;
    for (let i = 1; i <= k; i += 1) value = value * (n - k + i) / i;
    return value;
}

// Exact two-sided sign test over non-tied tasks; null when nothing is decisive.
function signTest(wins, losses) {
    const n = wins + losses;
    if (!n) return null;
    let tail = 0;
    for (let k = 0; k <= Math.min(wins, losses); k += 1) tail += binomial(n, k);
    return Math.min(1, 2 * tail / 2 ** n);
}

// Null when nothing was measured, so an unreported cost never reads as zero.
function sum(values) { return values.length ? values.reduce((a, b) => a + b, 0) : null; }

function ratio(numerator, denominator) {
    return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
}

function tokens(arm, keys) {
    const values = keys.map(key => arm.solver?.measurements?.[key]);
    return values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) : null;
}

function runtimeKey(runtime) {
    return JSON.stringify([runtimeBackend(runtime), runtime.host || 'claude', runtime.cliVersion || runtime.claudeVersion || null, runtime.model, runtime.judgeModel]);
}

function outcome(delta, band = 0) {
    if (delta === null) return 'unknown';
    if (delta > band) return 'framework';
    if (delta < -band) return 'raw';
    return 'tie';
}

// One row per task: all valid pairs of every run that froze the same case and base.
function taskRow(entries) {
    const first = entries[0].state;
    const pairs = entries.flatMap(({ state }) => (state.pairs || []).filter(pair => pair.valid === true));
    const recorded = entries.reduce((sum, { state }) => sum + (state.pairs || []).length, 0);
    const arm = name => {
        const arms = pairs.map(pair => pair[name]);
        const known = (values) => values.filter(Number.isFinite);
        return {
            successRate: arms.length ? arms.filter(a => a.success).length / arms.length : null,
            meanQuality: mean(known(arms.map(quality))),
            medianSolverWallMs: median(known(arms.map(a => a.solver?.wallMs))),
            meanUncachedTokens: mean(known(arms.map(a => tokens(a, ['inputTokens', 'outputTokens'])))),
            meanCacheReadTokens: mean(known(arms.map(a => a.solver?.measurements?.cacheReadTokens))),
            knownCostUsd: sum(known(arms.map(a => a.solver?.measurements?.costUsd)))
        };
    };
    const raw = arm('raw'); const framework = arm('framework');
    const sub = (a, b) => (a === null || b === null ? null : b - a);
    const successDelta = sub(raw.successRate, framework.successRate);
    const qualityDelta = sub(raw.meanQuality, framework.meanQuality);
    return {
        caseId: first.case.id, taskKind: first.case.kind, projectMode: first.case.projectMode, treatment: treatmentKind(first.case),
        runs: entries.map(entry => entry.label), frameworkHash: first.identity?.frameworkHash || null,
        recordedPairs: recorded, validPairs: pairs.length, invalidPairs: recorded - pairs.length,
        raw, framework, successDelta, qualityDelta,
        successOutcome: outcome(successDelta), qualityOutcome: outcome(qualityDelta, QUALITY_TIE_BAND),
        wallRatio: ratio(framework.medianSolverWallMs, raw.medianSolverWallMs),
        tokenRatio: ratio(framework.meanUncachedTokens, raw.meanUncachedTokens),
        cacheReadRatio: ratio(framework.meanCacheReadTokens, raw.meanCacheReadTokens)
    };
}

function tally(rows, key) {
    const count = value => rows.filter(row => row[key] === value).length;
    const wins = count('framework'); const losses = count('raw');
    const p = signTest(wins, losses);
    const decisive = wins + losses;
    const verdict = decisive < MIN_DECISIVE_TASKS ? 'insufficient-evidence'
        : p < SIGNIFICANCE ? (wins > losses ? 'framework-better' : 'raw-better') : 'no-detected-difference';
    return { frameworkWins: wins, rawWins: losses, ties: count('tie'), unknown: count('unknown'), signTestP: p, verdict };
}

function groupSummary(rows, { breakdown = true } = {}) {
    const scored = rows.filter(row => row.validPairs > 0);
    const known = values => values.filter(Number.isFinite);
    const kinds = [...new Set(rows.map(row => row.treatment))];
    return {
        qualityInterval: pairedInterval(scored.map(row => row.qualityDelta)),
        ...(breakdown ? { byTreatment: Object.fromEntries(kinds.map(kind => {
            const { rows: _rows, byTreatment: _nested, ...summary } = groupSummary(rows.filter(row => row.treatment === kind), { breakdown: false });
            return [kind, summary];
        })) } : {}),
        tasks: rows.length, scoredTasks: scored.length, unscoredTasks: rows.filter(row => !row.validPairs).map(row => row.caseId),
        success: tally(scored, 'successOutcome'), quality: tally(scored, 'qualityOutcome'),
        medianQualityDelta: median(known(scored.map(row => row.qualityDelta))),
        medianWallRatio: median(known(scored.map(row => row.wallRatio))),
        medianTokenRatio: median(known(scored.map(row => row.tokenRatio))),
        frameworkHashes: [...new Set(rows.map(row => row.frameworkHash))],
        rows
    };
}

function compareRuns(loaded) {
    if (!loaded.length) throw new Error('Provide at least one saved run');
    if (loaded.length > MAX_RUNS) throw new Error(`Compare at most ${MAX_RUNS} runs at once`);
    const groups = new Map();
    for (const entry of loaded) {
        const { state } = entry;
        const runtime = runtimeKey(state.runtime);
        const task = `${state.case.id}\u0000${state.identity?.caseHash}\u0000${state.identity?.baseHash}`;
        if (!groups.has(runtime)) groups.set(runtime, new Map());
        const tasks = groups.get(runtime);
        if (!tasks.has(task)) tasks.set(task, []);
        tasks.get(task).push(entry);
    }
    return {
        schemaVersion: 1,
        comparison: 'framework minus raw; each task counts once; repeats of a task are pooled, never counted as separate tasks',
        rules: { qualityTieBand: QUALITY_TIE_BAND, minDecisiveTasks: MIN_DECISIVE_TASKS, significance: SIGNIFICANCE, test: 'exact two-sided sign test over non-tied tasks',
            interval: 'paired mean quality difference with a 95% t interval over tasks (one cluster per task)', treatment: 'workflow when a workflow-* skill is required, otherwise single skill' },
        groups: [...groups.entries()].map(([key, tasks]) => {
            const [backend, host, cliVersion, model, judgeModel] = JSON.parse(key);
            return { runtime: { backend, host, cliVersion, model, judgeModel }, ...groupSummary([...tasks.values()].map(taskRow)) };
        }),
        limitations: [
            'Task-level verdicts need several independent realistic tasks; fewer than six decisive tasks is reported as insufficient evidence whatever the direction.',
            'Runs with different host, CLI, solver or judge models are reported as separate groups and never pooled.',
            'Quality is a blinded model-review proxy; time and token ratios describe this sample only. Unknown usage and billing stay null.',
            'Invalid pairs (infrastructure or identity failures) are excluded from outcomes and counted separately; they are not raw or framework results.'
        ]
    };
}

const fmt = (value, digits = 2) => (value === null || value === undefined ? 'unknown' : Number(value).toFixed(digits));
const pct = value => (value === null ? 'unknown' : `${Math.round(value * 100)}%`);

function comparisonMarkdown(result) {
    // Fixed prose is trusted; only values read from saved runs pass through inertMarkdown.
    const lines = ['# Framework benchmark comparison', '', `${result.comparison}.`, '',
        `Rules: quality tie band ±${result.rules.qualityTieBand}/100; at least ${result.rules.minDecisiveTasks} non-tied tasks before any verdict; ${result.rules.test}, p < ${result.rules.significance}.`];
    for (const group of result.groups) {
        const r = group.runtime;
        lines.push('', `## ${inertMarkdown(`${r.host} ${r.cliVersion || ''}`.trim())} — solver ${inertMarkdown(r.model)}, reviewer ${inertMarkdown(r.judgeModel)}`, '',
            `Tasks: ${group.tasks} (${group.scoredTasks} with valid pairs${group.unscoredTasks.length ? `; unscored: ${group.unscoredTasks.map(inertMarkdown).join(', ')}` : ''}).`, '',
            '| Measure | Framework wins | Raw wins | Ties | Sign test p | Verdict |', '|---|---:|---:|---:|---:|---|');
        for (const [name, t] of [['Task success', group.success], ['Review quality', group.quality]]) {
            lines.push(`| ${name} | ${t.frameworkWins} | ${t.rawWins} | ${t.ties} | ${fmt(t.signTestP, 3)} | ${t.verdict} |`);
        }
        const ci = group.qualityInterval;
        lines.push('', ci ? `Paired quality difference: ${fmt(ci.mean, 1)}/100, 95% interval ${fmt(ci.low, 1)} to ${fmt(ci.high, 1)} over ${ci.tasks} graded tasks${ci.low <= 0 && ci.high >= 0 ? ' (includes no difference)' : ''}.` : 'Paired quality difference: needs at least two graded tasks.');
        lines.push('', '| Treatment | Tasks | Success F/R/T | Quality F/R/T | Quality verdict | Median time × | Median tokens × |', '|---|---:|---|---|---|---:|---:|');
        for (const [kind, sub] of Object.entries(group.byTreatment || {})) {
            lines.push(`| ${kind === 'workflow' ? 'workflow' : 'single skill'} | ${sub.tasks} | ${sub.success.frameworkWins}/${sub.success.rawWins}/${sub.success.ties} | ${sub.quality.frameworkWins}/${sub.quality.rawWins}/${sub.quality.ties} | ${sub.quality.verdict} | ${fmt(sub.medianWallRatio)} | ${fmt(sub.medianTokenRatio)} |`);
        }
        lines.push('', `Median quality delta: ${fmt(group.medianQualityDelta, 1)}/100. Median framework/raw solver time: ${fmt(group.medianWallRatio)}×. Median framework/raw uncached tokens: ${fmt(group.medianTokenRatio)}×.`,
            '', '| Task | Kind | Mode | Treatment | Valid/invalid pairs | Success raw → framework | Quality raw → framework | Time × | Tokens × | Cache read × |', '|---|---|---|---|---|---|---|---:|---:|---:|');
        for (const row of group.rows) {
            lines.push(`| ${inertMarkdown(row.caseId)} | ${inertMarkdown(row.taskKind)} | ${inertMarkdown(row.projectMode)} | ${row.treatment} | ${row.validPairs}/${row.invalidPairs} | ${pct(row.raw.successRate)} → ${pct(row.framework.successRate)} | ${fmt(row.raw.meanQuality, 1)} → ${fmt(row.framework.meanQuality, 1)} | ${fmt(row.wallRatio)} | ${fmt(row.tokenRatio)} | ${fmt(row.cacheReadRatio)} |`);
        }
        if (group.frameworkHashes.length > 1) lines.push('', `Framework installations differ across tasks (${group.frameworkHashes.length} identities); the verdict covers each task's own installed framework.`);
    }
    lines.push('', '## Limits', '', ...result.limitations.map(item => `- ${item}`), '',
        'Bias check: framework-better, raw-better and no-difference verdicts use the same test; insufficient evidence is reported as such rather than as a lean in either direction.', '');
    return lines.join('\n');
}

function writeComparison(outputRoot, loaded) {
    const result = compareRuns(loaded);
    fs.mkdirSync(outputRoot, { recursive: true });
    const jsonPath = path.join(outputRoot, 'comparison.json');
    const mdPath = path.join(outputRoot, 'COMPARISON.md');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(mdPath, comparisonMarkdown(result));
    return { comparison: jsonPath, report: mdPath, groups: result.groups.map(g => ({ runtime: g.runtime, tasks: g.tasks, success: g.success.verdict, quality: g.quality.verdict })) };
}

module.exports = { QUALITY_TIE_BAND, MIN_DECISIVE_TASKS, signTest, pairedInterval, treatmentKind, compareRuns, comparisonMarkdown, writeComparison };
