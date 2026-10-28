'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DIMENSIONS, runtimeBackend } = require('./contract.cjs');
const { json } = require('./files.cjs');
const { inertMarkdown } = require('./journey.cjs');

function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function quality(arm) {
    return arm?.review?.valid ? mean(DIMENSIONS.map(name => arm.review.scores[name].score)) * 25 : null;
}
function difference(left, right) { return left === null || right === null || left === undefined || right === undefined ? null : right - left; }

function summarize(state) {
    const pairs = state.pairs || [];
    const valid = pairs.filter(pair => pair.valid === true);
    const deltas = valid.map(pair => ({
        repeat: pair.repeat,
        success: Number(pair.framework.success) - Number(pair.raw.success),
        quality: difference(quality(pair.raw), quality(pair.framework)),
        solverWallMs: difference(pair.raw.solver?.wallMs, pair.framework.solver?.wallMs),
        costUsd: difference(pair.raw.solver?.measurements?.costUsd, pair.framework.solver?.measurements?.costUsd)
    }));
    const result = {
        schemaVersion: 1, phase: state.phase, caseId: state.case.id, taskKind: state.case.kind, projectMode: state.case.projectMode, projectSetup: state.projectSetup,
        runtime: { backend: runtimeBackend(state.runtime), host: state.runtime.host || 'claude', cliVersion: state.runtime.cliVersion || state.runtime.claudeVersion, model: state.runtime.model, judgeModel: state.runtime.judgeModel },
        plannedPairs: state.runtime.repeats, recordedPairs: pairs.length, validPairs: valid.length,
        invalidPairs: pairs.filter(p => p.valid === false).length,
        uncompletedPairs: pairs.filter(p => p.valid === undefined).length + state.runtime.repeats - pairs.length,
        comparison: 'framework minus raw; descriptive within this case only',
        successDelta: mean(deltas.map(row => row.success)),
        qualityDelta: mean(deltas.map(row => row.quality).filter(value => value !== null)),
        qualityPairs: deltas.filter(row => row.quality !== null).length,
        medianSolverWallDeltaMs: median(deltas.map(row => row.solverWallMs).filter(value => value !== null)),
        measuredCostPairs: deltas.filter(row => row.costUsd !== null).length,
        meanSolverCostDeltaUsd: mean(deltas.map(row => row.costUsd).filter(value => value !== null)),
        wins: deltas.filter(row => row.success > 0).length, ties: deltas.filter(row => row.success === 0).length, losses: deltas.filter(row => row.success < 0).length,
        deltas,
        error: state.error || null,
        limitations: [
            'Repeated attempts on one task are not independent task samples; no population significance or universal framework benefit is established.',
            'Full-framework versus strict raw measures the entire treatment bundle, including instructions and orchestration; it does not attribute an effect to one skill or hook.',
            'Independent reviewer sessions are blinded to arm labels and solver traces, but artifact style can reveal workflow use. Model scores are uncalibrated proxies.',
            'Usage and cost are provider-reported, may omit internal work, and unknown values remain null. Model limits can be exceeded by an in-flight request.',
            'Check counts are frozen check commands, not an inferred count of individual test assertions. Agent-authored tests are assessed separately by the reviewer.',
            'Journeys contain public actions/messages and separately cited observer interpretations, never hidden reasoning. Missing hook/helper/workflow evidence stays unknown; longer journeys do not imply better work.'
        ]
    };
    result.arms = Object.fromEntries(['raw', 'framework'].map(name => {
        const arms = valid.map(pair => pair[name]);
        const known = arms.filter(arm => arm.solver?.measurements?.costUsd !== null && arm.solver?.measurements?.costUsd !== undefined);
        const usage = Object.fromEntries(['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens'].map(key => {
            const values = arms.map(arm => arm.solver?.measurements?.[key]).filter(value => value !== null && value !== undefined);
            return [key, { mean: mean(values), measuredAttempts: values.length }];
        }));
        const overhead = Object.fromEntries(['checks', 'review', 'journey'].map(stage => {
            const wall = arms.map(arm => stage === 'checks' ? (arm.checks || []).reduce((sum, check) => sum + check.wallMs, 0) : stage === 'journey' ? arm.journey?.observer?.wallMs : arm.review?.wallMs).filter(Number.isFinite);
            return [stage, { totalWallMs: wall.reduce((a, b) => a + b, 0), observedAttempts: wall.length }];
        }));
        return [name, { attempts: arms.length, passed: arms.filter(arm => arm.success).length, failed: arms.filter(arm => !arm.success).length, usage, overhead,
            meanQuality: mean(arms.map(quality).filter(value => value !== null)), medianSolverWallMs: median(arms.map(arm => arm.solver.wallMs)),
            knownSolverCostUsd: known.length ? known.reduce((sum, arm) => sum + arm.solver.measurements.costUsd, 0) : null, knownCostAttempts: known.length }];
    }));
    const all = pairs.flatMap(pair => [pair.raw, pair.framework]).filter(Boolean);
    result.campaign = Object.fromEntries(['solver', 'review', 'journey'].map(stage => {
        const observed = all.map(arm => stage === 'journey' ? arm.journey?.observer : arm[stage]).filter(Boolean);
        const costs = observed.map(row => row.measurements?.costUsd).filter(Number.isFinite);
        return [stage, { observedAttempts: observed.length, totalWallMs: observed.reduce((sum, row) => sum + (Number.isFinite(row.wallMs) ? row.wallMs : 0), 0), measuredWallAttempts: observed.filter(row => Number.isFinite(row.wallMs)).length,
            usage: Object.fromEntries(['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens'].map(key => {
                const values = observed.map(row => row.measurements?.[key]).filter(Number.isFinite);
                return [key, { total: values.length ? values.reduce((sum, value) => sum + value, 0) : null, measuredAttempts: values.length }];
            })),
            knownCostUsd: costs.length ? costs.reduce((sum, value) => sum + value, 0) : null, knownCostAttempts: costs.length }];
    }));
    const qualityPasses = all.flatMap(arm => arm.review?.passes || []);
    result.campaign.review.stageAttempts = qualityPasses.length ? qualityPasses.filter(pass => pass.callStarted).length : result.campaign.review.observedAttempts;
    result.campaign.review.observedSessions = qualityPasses.length ? qualityPasses.filter(pass => pass.sessionId).length : all.filter(arm => arm.review?.sessionId).length;
    result.assessment = { policy: state.case.assessment || { profile: 'legacy' }, evaluatorHash: state.identity?.evaluatorHash || null,
        qualification: state.case.qualification ? { status: 'author-declared; inspect cited qualification evidence and pre-answer controls', ...state.case.qualification } : null };
    return result;
}

function markdown(state, summary) {
    const display = value => value === null || value === undefined ? 'unknown' : typeof value === 'number' ? String(Math.round(value * 1000) / 1000) : String(value);
    const lines = [
        `# Framework benchmark: ${state.case.id}`, '',
        `Status: **${state.phase}**. Valid pairs: ${summary.validPairs}/${summary.plannedPairs}; invalid: ${summary.invalidPairs}; incomplete: ${summary.uncompletedPairs}.`, '',
        `Project mode: **${state.case.projectMode}**. Setup, configuration/reference documents, skills, hooks and workflow are the framework treatment; setup work stays inside solver time and reported usage.`, '',
        `Runtime: **${summary.runtime.backend}/${summary.runtime.host}**, CLI ${summary.runtime.cliVersion}; requested solver ${summary.runtime.model}; assessor ${summary.runtime.judgeModel}. Native account billing is unknown unless an actual charge is reported; API-equivalent estimates are separate observations.`, '',
        'A complete experiment is not a claim of framework superiority. Positive deltas favor framework quality/success; negative time/cost deltas mean less measured resource use.', '',
        '| Measure | Raw | Framework |', '|---|---:|---:|'
    ];
    for (const [label, key] of [['Passed attempts', 'passed'], ['Failed attempts', 'failed'], ['Mean reviewer quality /100', 'meanQuality'], ['Median solver wall ms', 'medianSolverWallMs'], ['Known solver cost USD (partial sum)', 'knownSolverCostUsd'], ['Attempts with known cost', 'knownCostAttempts']]) {
        lines.push(`| ${label} | ${display(summary.arms.raw[key])} | ${display(summary.arms.framework[key])} |`);
    }
    for (const key of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens']) lines.push(`| Mean ${key} (measured attempts only) | ${display(summary.arms.raw.usage[key].mean)} (${summary.arms.raw.usage[key].measuredAttempts}) | ${display(summary.arms.framework.usage[key].mean)} (${summary.arms.framework.usage[key].measuredAttempts}) |`);
    lines.push('', 'Comparative aggregates above use valid pairs. Campaign totals below include observed invalid and failed attempts too.', '',
        '| Stage | Observed attempts | Known wall ms | Wall measurements | Known cost USD | Attempts with known cost |', '|---|---:|---:|---:|---:|---:|');
    for (const [stage, totals] of Object.entries(summary.campaign)) lines.push(`| ${stage} | ${totals.observedAttempts} | ${display(totals.measuredWallAttempts === 0 && totals.observedAttempts > 0 ? null : totals.totalWallMs)} | ${totals.measuredWallAttempts} | ${display(totals.knownCostUsd)} | ${totals.knownCostAttempts} |`);
    lines.push('', '| Reviewer dimension /4 | Raw | Framework |', '|---|---:|---:|');
    for (const dimension of DIMENSIONS) {
        const averages = ['raw', 'framework'].map(name => mean(state.pairs.filter(pair => pair.valid && pair[name]?.review?.valid).map(pair => pair[name].review.scores[dimension].score)));
        lines.push(`| ${dimension} | ${display(averages[0])} | ${display(averages[1])} |`);
    }
    lines.push('', `Paired success wins/ties/losses: ${summary.wins}/${summary.ties}/${summary.losses}. Mean success delta: ${display(summary.successDelta)}. Mean quality delta: ${display(summary.qualityDelta)} (${summary.qualityPairs} graded pairs).`, '',
        '## Attempt evidence', '', '| Repeat | Arm | Outcome | Checks passed/failed | Reviewer /100 | Solver ms | Assessment evidence |', '|---|---|---|---|---|---|---|');
    for (const pair of state.pairs) for (const name of ['raw', 'framework']) {
        const arm = pair[name];
        if (!arm) continue;
        const evidence = arm.review?.valid ? (arm.review.artifact ? `[Full assessment](${arm.review.artifact.path})` : 'embedded in result.json') : 'ungraded';
        lines.push(`| ${pair.repeat} | ${name} | ${arm.status || 'pending'} | ${(arm.checks || []).filter(c => c.passed).length}/${(arm.checks || []).filter(c => !c.passed).length} | ${display(quality(arm))} | ${display(arm.solver?.wallMs)} | ${evidence} |`);
    }
    lines.push('', 'Each attempt folder retains solver observations, original checks, reviewer evidence, timing and nullable usage. result.json contains identities and exact invalid reasons. Reviewer/check overhead is stored separately from solver time and cost.', '',
        '## Execution journeys', '', 'Each linked story contains a chronological account and eight behavioral aspects with citations. The passive record never advises the solver. A separate read-only observer interprets it after execution, keeping extra model work outside solver timing. End-product assessors receive only anonymous application artifacts and frozen outcomes.', '',
        '| Repeat | Arm | Journey | Capture coverage | Public events | Commands | File changes | Errors | Observer |', '|---|---|---|---|---:|---:|---:|---:|---|');
    for (const pair of state.pairs) for (const name of ['raw', 'framework']) {
        const arm = pair[name]; if (!arm) continue;
        const trace = arm.journey?.trace?.manifest;
        const counts = trace?.counts || {};
        lines.push(`| ${pair.repeat} | ${name} | ${arm.journey ? `[Detailed story](${arm.artifactDir}/journey.md)` : 'unavailable'} | ${trace ? `${trace.captureMode}; ${trace.complete ? 'complete selected stream' : 'partial/unsupported coverage'}; omitted ${trace.omittedEvents}, clipped ${trace.clippedEvents}` : 'unknown'} | ${display(trace?.events)} | ${display(counts.command ?? null)} | ${display(counts['file-change'] ?? null)} | ${display(counts.error ?? null)} | ${arm.journey?.observer?.valid ? 'valid cited account' : 'ungraded/unavailable'} |`);
    }
    lines.push('', 'Command and file-event counts describe the selected public event dialect, not distinct tests, edits or completed workflow gates. See each trace manifest for missing/unsupported events, timestamps and bounds. Compare the stories against objective outcomes before attributing benefit or harm; these observations alone do not establish causality.', '',
        '## Limits', '', ...summary.limitations.map(value => `- ${value}`), '',
        `Bias check: framework benefit was the hypothesis; raw wins and failed attempts are retained. A broader representative task sample, calibrated reviewers, or changed runtime/framework hashes can change the conclusion.`, '');
    if (state.error) lines.push(`Run error: ${inertMarkdown(state.error)}`, '');
    if (state.case.assessment?.profile === 'skilled-v1') {
        lines.push('## Skilled outcome assessment', '',
            `Common frozen evaluator toolkit: ${summary.assessment.evaluatorHash}. At least two fresh stages, at most ${state.case.assessment.maxPasses}; an extra stage validates newly introduced consequential findings. Missing role/skill/model/integrity proof or unresolved consequential claims remain ungraded. Candidate repairs and feedback to solvers are forbidden.`, '',
            `Outcome review stage attempts: ${summary.campaign.review.stageAttempts}; observed session identities: ${summary.campaign.review.observedSessions}. The review wall/usage totals above cover all retained passes, including failed grading. Actual subscription billing remains unknown.`, '',
            '| Repeat | Arm | Pass | Purpose | Admission | Wall ms | Full evidence |', '|---|---|---:|---|---|---:|---|');
        for (const pair of state.pairs) for (const name of ['raw', 'framework']) for (const pass of pair[name]?.review?.passes || []) {
            const link = pass.artifact ? `[Assessment](${pass.artifact.path})` : pass.observation ? `[Observation](${pass.observation.path})` : 'not retained';
            lines.push(`| ${pair.repeat} | ${name} | ${pass.pass} | ${pass.purpose} | ${pass.valid ? 'valid stage' : 'ungraded stage'} | ${display(pass.wallMs)} | ${link} |`);
        }
        lines.push('', '| Repeat | Arm | Independently confirmed causes | Critical / High / Medium / Low | Rejected earlier claims | Unresolved claims | New unvalidated LOWs |', '|---|---|---:|---|---:|---:|---:|');
        for (const pair of state.pairs) for (const name of ['raw', 'framework']) {
            const finding = pair[name]?.review?.findings;
            lines.push(`| ${pair.repeat} | ${name} | ${display(finding?.confirmed)} | ${finding ? ['critical','high','medium','low'].map(key => finding.bySeverity[key]).join(' / ') : 'ungraded'} | ${display(finding?.rejected)} | ${display(finding?.unresolved)} | ${display(finding?.newUnvalidatedLow)} |`);
        }
        lines.push('', 'Full per-pass observations retain model usage, successful role/skill receipts, public review traces and reviewer reports under each quality/pass directory. Earlier rejected and ungraded assessments remain readable. Validated model judgments still require human calibration for a broader quality claim; more issues or more review prose is not automatically better.', '');
    }
    if (state.projectSetup?.template) {
        const template = state.projectSetup.template;
        lines.push('## Reusable project template', '',
            `Template ${inertMarkdown(template.id)}; upstream ${inertMarkdown(template.repository)} at ${inertMarkdown(template.commit)}; manifest ${inertMarkdown(template.manifestHash)}. Application ${inertMarkdown(template.rawHash)}. Inspect the retained template manifests, notices and declared exclusions before reuse.`, '',
            template.setupInvestment ? `Configured setup investment: ${display(template.setupInvestment.wallMs)} ms; usage ${JSON.stringify(template.setupInvestment.measurements)}. This is a separately prepared shared input cost, not free treatment. Marginal configured solver time is reported above; include this setup investment in an explicit amortization scenario. Bootstrap setup remains inside its own solver.` : 'This bootstrap input has no donated configured context or prepaid setup investment; its framework solver performs and pays for setup.', '');
    }
    return lines.join('\n');
}

function writeReport(root, state) {
    const summary = summarize(state);
    json(path.join(root, 'summary.json'), summary);
    fs.writeFileSync(path.join(root, 'report.md'), markdown(state, summary));
    return summary;
}

module.exports = { mean, median, quality, summarize, markdown, writeReport };
