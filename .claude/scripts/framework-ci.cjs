#!/usr/bin/env node
'use strict';

/**
 * framework-ci — run the framework's own test lanes, for the whole tree or only for what a change affects.
 *
 * Usage:
 *   node .claude/scripts/framework-ci.cjs                       # changed scope against origin/main, working tree included
 *   node .claude/scripts/framework-ci.cjs --scope=full          # every lane; the hook aggregate runs unfiltered (count guard)
 *   node .claude/scripts/framework-ci.cjs --base=<rev> --head=<rev>   # a commit range: one commit is --base=<sha>~1 --head=<sha>
 *   node .claude/scripts/framework-ci.cjs --plan [--json]      # print what would run; nothing executes
 *   node .claude/scripts/framework-ci.cjs --plan --github-output=<file> [--github-summary=<file>]   # CI gate job
 *   node .claude/scripts/framework-ci.cjs --lane=hook-suites --suites=<all|a,b>   # CI lane job: run one lane as planned
 *
 * Lanes (one owner: LANES below; `.github/workflows/ci.yml` runs the same commands, pinned by framework-ci.test.cjs):
 *   static      static-checks.cjs: ESLint with its frozen baseline, then prettier --check (any JS change)
 *   sync        Codex sync verify: mirrors, codex/scripts/OpenCode tests, count drift, parity
 *   hook-unit   test-all-hooks.cjs
 *   hook-suites run-all-tests.cjs — every suite (full) or the selected suites, one `--filter` run each
 *
 * Changed scope maps each changed file to lanes through RULES (first match wins). Shared harness and manifests
 * escalate to full; a hook no suite names escalates to full; more than half of the suites selected escalates to
 * full. Selection is a heuristic: it is advisory, and only the full scope is merge evidence.
 *
 * Exit codes: 0 every selected lane passed (or nothing to run) · 1 a lane failed · 2 usage or git error.
 * Paths are repository-relative with `/` separators on every OS; processes start from literal argv, never a shell.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SUITE_RE = /^\.claude\/hooks\/tests\/suites\/([^/]+)\.test\.cjs$/;
const CODE_RE = /\.(?:c|m)?js$/;
const SUITE_NAME_RE = /^[A-Za-z0-9._-]+$/;

const LANES = [
    { id: 'static', title: 'Static checks (ESLint baseline, prettier)', argv: ['.claude/scripts/static-checks.cjs'] },
    { id: 'sync', title: 'Codex sync verify', argv: ['.claude/skills/sync-codex/scripts/run-codex-sync.mjs', '--verify-only'] },
    { id: 'hook-unit', title: 'Hook unit tests', argv: ['.claude/hooks/tests/test-all-hooks.cjs'] },
    { id: 'hook-suites', title: 'Hook suites', argv: ['.claude/hooks/tests/run-all-tests.cjs'] }
];

// Files every lane depends on: a change here can break any test, so the change runs the full scope.
const FULL_PATTERNS = [
    /^\.github\//,
    /^package(?:-lock)?\.json$/,
    /^\.gitattributes$/,
    /^\.claude\/settings\.json$/,
    /^\.claude\/\.ck\.json$/,
    /^docs\/project-config\.json$/,
    /^\.claude\/scripts\/requirements\.txt$/,
    /^\.claude\/scripts\/framework-ci\.cjs$/,
    /^\.claude\/hooks\/tests\/run-all-tests\.cjs$/,
    /^\.claude\/hooks\/tests\/(?:lib|helpers|docs)\//
];

// Files no test reads.
const NONE_PATTERNS = [/^LICENSE$/, /^NOTICE$/, /^\.vscode\//, /^[^/]+\.cmd$/];

// Basenames too common to identify one file; their parent directory names them instead (a skill's SKILL.md).
const GENERIC_BASENAMES = new Set(['SKILL.md', 'README.md', 'INDEX.md', 'index.js', 'index.cjs', 'index.mjs', 'package.json', 'package-lock.json']);

// A suite that lists directories checks every file under the areas it names, not only the files it names.
const SCANS_DIRECTORIES_RE = /readdirSync|readdir\(|globSync|\bglob\(|\bwalk[A-Z(]/;

const RULES = [
    { id: 'full', match: file => FULL_PATTERNS.some(re => re.test(file)) },
    { id: 'none', match: file => NONE_PATTERNS.some(re => re.test(file)) },
    { id: 'suite', match: file => SUITE_RE.test(file) },
    { id: 'hook-unit', match: file => file === '.claude/hooks/tests/test-all-hooks.cjs' },
    { id: 'hook-code', match: file => file.startsWith('.claude/hooks/') && CODE_RE.test(file) && !file.startsWith('.claude/hooks/tests/') },
    { id: 'framework', match: () => true }
];

class UsageError extends Error {}

function toPosix(file) {
    return file.split(path.sep).join('/');
}

function git(root, args) {
    const result = childProcess.spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (result.error) throw new UsageError(`git could not start: ${result.error.message}`);
    return result;
}

function gitOut(root, args) {
    const result = git(root, args);
    if (result.status !== 0) throw new UsageError(`git ${args[0]} failed: ${(result.stderr || '').trim()}`);
    return result.stdout;
}

/** Resolve a user-supplied revision to a commit SHA; an option-like or unknown value is refused, never passed on. */
function resolveCommit(root, rev, label) {
    if (typeof rev !== 'string' || rev.trim() === '' || rev.startsWith('-') || /[\s\0]/.test(rev)) {
        throw new UsageError(`${label} must be a branch, tag, SHA or ref (got ${JSON.stringify(rev)})`);
    }
    for (const candidate of [rev, `origin/${rev}`]) {
        const result = git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${candidate}^{commit}`]);
        if (result.status === 0) return result.stdout.trim();
    }
    throw new UsageError(`${label} ${JSON.stringify(rev)} is not a commit in this repository`);
}

function safeDefaultBase(root) {
    try {
        return defaultBase(root);
    } catch {
        return null;
    }
}

function defaultBase(root) {
    for (const candidate of ['origin/main', 'main']) {
        if (git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${candidate}^{commit}`]).status === 0) return candidate;
    }
    throw new UsageError('no origin/main or main to compare with; pass --base=<rev>');
}

function parseNameStatus(output) {
    const parts = output.split('\0').filter(Boolean);
    const changes = [];
    for (let i = 0; i + 1 < parts.length; i += 2) changes.push({ status: parts[i][0], file: toPosix(parts[i + 1]) });
    return changes;
}

/**
 * Files changed between the merge-base of `base` and `head`. Without `head`, the working tree is compared instead,
 * so staged, unstaged and untracked files count. Renames count as a delete plus an add.
 */
function collectChanges({ root = REPO_ROOT, base, head } = {}) {
    const baseRev = base ?? defaultBase(root);
    const baseSha = resolveCommit(root, baseRev, 'base');
    const headSha = head ? resolveCommit(root, head, 'head') : resolveCommit(root, 'HEAD', 'HEAD');
    const mergeBase = gitOut(root, ['merge-base', baseSha, headSha]).trim();
    const range = head ? [mergeBase, headSha] : [mergeBase];
    const byFile = new Map();
    for (const change of parseNameStatus(gitOut(root, ['diff', '--name-status', '--no-renames', '-z', ...range, '--']))) byFile.set(change.file, change);
    if (!head) {
        for (const file of gitOut(root, ['ls-files', '-z', '--others', '--exclude-standard']).split('\0').filter(Boolean)) {
            byFile.set(toPosix(file), { status: 'A', file: toPosix(file) });
        }
    }
    return {
        base: baseRev,
        baseSha,
        head: head ?? 'working tree',
        headSha,
        mergeBase,
        changes: [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file))
    };
}

/** Suite texts, the reverse require graph of `.claude/` code and the suites that read hook registrations. */
function buildIndex(root = REPO_ROOT) {
    const listed = gitOut(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.claude'])
        .split('\0')
        .filter(Boolean)
        .map(toPosix)
        .filter(file => !file.includes('/node_modules/'));
    const texts = new Map();
    for (const file of listed) {
        if (!CODE_RE.test(file)) continue;
        try {
            texts.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
        } catch {
            /* listed but deleted in the working tree */
        }
    }
    const requiredBy = new Map();
    const requireRe = /(?:require\s*\(\s*|\bfrom\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
    for (const [file, text] of texts) {
        for (const match of text.matchAll(requireRe)) {
            let target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
            if (!texts.has(target)) target = ['.cjs', '.js', '.mjs'].map(ext => target + ext).find(candidate => texts.has(candidate)) ?? target;
            if (!requiredBy.has(target)) requiredBy.set(target, new Set());
            requiredBy.get(target).add(file);
        }
    }
    const suites = [];
    for (const [file, text] of texts) {
        const match = SUITE_RE.exec(file);
        if (match)
            suites.push({ name: match[1], file, text, scansDirectories: SCANS_DIRECTORIES_RE.test(text), readsRegistrations: text.includes('settings.json') });
    }
    suites.sort((a, b) => a.name.localeCompare(b.name));
    return { suites, requiredBy };
}

function tokensFor(file) {
    const base = path.posix.basename(file);
    if (GENERIC_BASENAMES.has(base)) {
        const dir = path.posix.basename(path.posix.dirname(file));
        return dir && dir !== '.' ? [`'${dir}'`, `"${dir}"`, `/${dir}/`] : [];
    }
    const tokens = [base];
    const stem = base.replace(CODE_RE, '');
    if (stem !== base) tokens.push(`'${stem}'`, `"${stem}"`, `/${stem}'`, `/${stem}"`);
    return tokens;
}

/** The changed file plus every non-test module that requires it, directly or through other modules. */
function dependents(file, requiredBy) {
    const seen = new Set([file]);
    const queue = [file];
    while (queue.length > 0) {
        for (const parent of requiredBy.get(queue.shift()) ?? []) {
            if (seen.has(parent) || parent.includes('/tests/')) continue;
            seen.add(parent);
            queue.push(parent);
        }
    }
    return [...seen];
}

function targetedSuites(file, index) {
    const closure = CODE_RE.test(file) ? dependents(file, index.requiredBy) : [file];
    const tokens = closure.flatMap(tokensFor);
    return index.suites.filter(
        suite => tokens.some(token => suite.text.includes(token)) || closure.some(member => index.requiredBy.get(member)?.has(suite.file))
    );
}

function areaTokens(file) {
    const segments = file.split('/');
    const area = segments[0] === '.claude' || segments[0] === '.agents' || segments[0] === '.codex' ? segments[1] : segments.length > 1 ? segments[0] : null;
    return area ? [`'${area}'`, `"${area}"`] : [];
}

/**
 * Decide lanes and hook suites for a scope. Pure: no git, no file reads.
 * @returns {{ scope, effectiveScope, lanes: { sync: boolean, 'hook-unit': boolean, 'hook-suites': 'all' | string[] }, escalations: object[], decisions: object[] }}
 */
function planScope({ scope, changes = [], index }) {
    const full = fullLanes();
    if (scope === 'full') return { scope, effectiveScope: 'full', lanes: full, escalations: [], decisions: [] };
    const lanes = { static: false, sync: false, 'hook-unit': false };
    const selected = new Set();
    const escalations = [];
    const decisions = [];
    for (const { file, status } of changes) {
        const rule = RULES.find(candidate => candidate.match(file)).id;
        const decision = { file, status, rule, suites: [] };
        decisions.push(decision);
        if (rule === 'full') {
            escalations.push({ file, reason: 'shared harness, manifest or CI definition' });
            continue;
        }
        if (rule === 'none') continue;
        // Any JavaScript change can break lint or formatting, wherever it lives.
        if (CODE_RE.test(file) || /^eslint/.test(file)) lanes.static = true;
        if (rule === 'suite') {
            if (status === 'A' || status === 'D')
                escalations.push({ file, reason: 'a suite was added or removed: the documented test totals need the full count guard' });
            else decision.suites.push(SUITE_RE.exec(file)[1]);
        } else if (rule === 'hook-unit') {
            lanes['hook-unit'] = true;
        } else {
            lanes.sync = true;
            const targeted = targetedSuites(file, index);
            if (rule === 'hook-code') {
                lanes['hook-unit'] = true;
                if (targeted.length === 0) escalations.push({ file, reason: 'no hook suite names this hook or a hook that requires it' });
                if (!file.startsWith('.claude/hooks/lib/')) targeted.push(...index.suites.filter(suite => suite.readsRegistrations));
            }
            const areas = areaTokens(file);
            targeted.push(...index.suites.filter(suite => suite.scansDirectories && areas.some(token => suite.text.includes(token))));
            decision.suites.push(...new Set(targeted.map(suite => suite.name)));
        }
        for (const name of decision.suites) selected.add(name);
    }
    if (escalations.length === 0 && index.suites.length > 0 && selected.size * 2 > index.suites.length) {
        escalations.push({ file: null, reason: `${selected.size} of ${index.suites.length} suites selected; the full aggregate is cheaper to reason about` });
    }
    if (escalations.length > 0) return { scope, effectiveScope: 'full', lanes: full, escalations, decisions };
    return { scope, effectiveScope: 'changed', lanes: { ...lanes, 'hook-suites': [...selected].sort() }, escalations, decisions };
}

/** Every lane, every suite: derived from LANES so a lane added there is part of the full scope. */
function fullLanes() {
    return Object.fromEntries(LANES.map(lane => [lane.id, lane.id === 'hook-suites' ? 'all' : true]));
}

function outputKey(id) {
    return `run_${id.replace(/-/g, '_')}`;
}

function laneSelected(lanes, id) {
    const value = lanes[id];
    return value === 'all' || value === true || (Array.isArray(value) && value.length > 0);
}

function githubOutputLines(plan) {
    const suites = plan.lanes['hook-suites'];
    return [
        `scope=${plan.effectiveScope}`,
        ...LANES.map(lane => `${outputKey(lane.id)}=${laneSelected(plan.lanes, lane.id)}`),
        `hook_suites=${suites === 'all' ? 'all' : suites.join(',')}`
    ];
}

function describePlan(plan, range) {
    const lines = [];
    if (range) lines.push(`Changes: ${range.changes.length} file(s), ${range.base} (${range.mergeBase.slice(0, 12)}) .. ${range.head}`);
    lines.push(`Scope: ${plan.scope}${plan.effectiveScope !== plan.scope ? ` → ${plan.effectiveScope}` : ''}`);
    for (const escalation of plan.escalations) lines.push(`  escalated to full: ${escalation.file ?? '(selection size)'} — ${escalation.reason}`);
    for (const lane of LANES) {
        const value = plan.lanes[lane.id];
        const detail =
            value === 'all' ? 'every suite' : Array.isArray(value) ? (value.length ? value.join(', ') : 'not selected') : value ? 'selected' : 'not selected';
        lines.push(`  ${lane.id.padEnd(12)} ${detail}`);
    }
    if (range && range.changes.length === 0) lines.push('No changes between base and head: nothing to run.');
    if (plan.effectiveScope === 'changed')
        lines.push('Changed scope is advisory: it can miss a test that scans whole directories. Only --scope=full is merge evidence.');
    return lines.join('\n');
}

/** Run one `--filter` per suite not already covered by an earlier filter (the runner matches a substring). */
function suiteRuns(names, allNames) {
    const covered = new Set();
    const runs = [];
    for (const name of names) {
        if (covered.has(name)) continue;
        runs.push(name);
        for (const other of allNames) if (other.toLowerCase().includes(name.toLowerCase())) covered.add(other);
    }
    return runs;
}

function runNode(root, argv) {
    const started = Date.now();
    const result = childProcess.spawnSync(process.execPath, argv, { cwd: root, stdio: 'inherit', env: process.env });
    return { ok: result.status === 0, status: result.error ? result.error.message : result.status, seconds: Math.round((Date.now() - started) / 1000) };
}

function runLanes(root, lanes, allSuiteNames) {
    const results = [];
    for (const lane of LANES) {
        const value = lanes[lane.id];
        if (!laneSelected(lanes, lane.id)) continue;
        if (lane.id === 'hook-suites' && value !== 'all') {
            for (const name of suiteRuns(value, allSuiteNames)) {
                console.log(`\n[framework-ci] ${lane.title}: --filter=${name}`);
                results.push({ lane: `${lane.id}:${name}`, ...runNode(root, [...lane.argv, `--filter=${name}`]) });
            }
            continue;
        }
        console.log(`\n[framework-ci] ${lane.title}: node ${lane.argv.join(' ')}`);
        results.push({ lane: lane.id, ...runNode(root, lane.argv) });
    }
    console.log('\n[framework-ci] Summary');
    for (const result of results)
        console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.lane}  (${result.seconds}s${result.ok ? '' : `, exit ${result.status}`})`);
    if (results.length === 0) console.log('  nothing selected');
    return results.every(result => result.ok);
}

/** The commit under test and whether the working tree adds uncommitted changes to it. */
function treeLine(root, workingTree, base) {
    const head = git(root, ['rev-parse', 'HEAD']);
    const status = git(root, ['status', '--porcelain', '--untracked-files=normal']);
    const dirty = workingTree && status.status === 0 ? status.stdout.split('\n').filter(Boolean).length : null;
    const sha = head.status === 0 ? head.stdout.trim() : 'unknown';
    let line = `Tree: ${sha}${dirty === null ? '' : dirty === 0 ? ' (clean)' : ` + ${dirty} uncommitted change(s) — commit them so the evidence names one tree`}`;
    if (workingTree && base) {
        const contains = git(root, ['merge-base', '--is-ancestor', '--end-of-options', base, 'HEAD']);
        if (contains.status === 1) line += `\nBehind ${base}: merge it first, so the evidence covers what will merge`;
    }
    return line;
}

function parseArgs(argv) {
    const options = { scope: 'changed', plan: false, json: false };
    for (const arg of argv) {
        const [key, ...rest] = arg.split('=');
        const value = rest.join('=');
        if (arg === '--plan') options.plan = true;
        else if (arg === '--json') options.json = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (key === '--scope' && (value === 'changed' || value === 'full')) options.scope = value;
        else if (key === '--base' && rest.length) options.base = value;
        else if (key === '--head' && rest.length) options.head = value;
        else if (key === '--github-output' && value) options.githubOutput = value;
        else if (key === '--github-summary' && value) options.githubSummary = value;
        else if (key === '--lane' && LANES.some(lane => lane.id === value)) options.lane = value;
        else if (key === '--suites' && rest.length) options.suites = value;
        else throw new UsageError(`unknown or invalid argument: ${arg}`);
    }
    if (options.suites !== undefined && options.lane !== 'hook-suites') throw new UsageError('--suites is valid only with --lane=hook-suites');
    if (options.lane && (options.plan || options.base || options.head))
        throw new UsageError('--lane runs one planned lane; it takes no --plan, --base or --head');
    return options;
}

function laneOnlyPlan(options, allSuiteNames) {
    const lanes = Object.fromEntries(LANES.map(lane => [lane.id, lane.id === 'hook-suites' ? [] : lane.id === options.lane]));
    if (options.lane === 'hook-suites') {
        const raw = options.suites ?? 'all';
        if (raw === 'all') lanes['hook-suites'] = 'all';
        else {
            const names = raw.split(',').filter(Boolean);
            const unknown = names.filter(name => !SUITE_NAME_RE.test(name) || !allSuiteNames.includes(name));
            if (unknown.length > 0 || names.length === 0) throw new UsageError(`--suites names no existing suite: ${unknown.join(', ') || '(empty)'}`);
            lanes['hook-suites'] = names;
        }
    }
    return lanes;
}

function main(argv = process.argv.slice(2), root = REPO_ROOT) {
    const options = parseArgs(argv);
    if (options.help) {
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
        return 0;
    }
    const index = buildIndex(root);
    const allSuiteNames = index.suites.map(suite => suite.name);
    if (options.lane) return runLanes(root, laneOnlyPlan(options, allSuiteNames), allSuiteNames) ? 0 : 1;

    const range = options.scope === 'full' ? null : collectChanges({ root, base: options.base, head: options.head });
    const plan = planScope({ scope: options.scope, changes: range ? range.changes : [], index });
    if (options.githubOutput) fs.appendFileSync(options.githubOutput, `${githubOutputLines(plan).join('\n')}\n`);
    if (options.githubSummary) fs.appendFileSync(options.githubSummary, `### framework-ci plan\n\n\`\`\`\n${describePlan(plan, range)}\n\`\`\`\n`);
    if (options.json) console.log(JSON.stringify({ ...plan, range: range && { ...range } }, null, 2));
    else console.log(`${treeLine(root, !options.head, options.head ? null : (options.base ?? safeDefaultBase(root)))}\n${describePlan(plan, range)}`);
    // W-F3: an empty comparison passes without testing anything; make that visible on the run page.
    if (range && range.changes.length === 0 && process.env.GITHUB_ACTIONS === 'true') {
        console.log('::warning::No changes between base and head, so nothing was tested. Pass base=<sha>~1 for one commit, or scope=full.');
    }
    if (options.plan) return 0;
    return runLanes(root, plan.lanes, allSuiteNames) ? 0 : 1;
}

module.exports = {
    LANES,
    RULES,
    FULL_PATTERNS,
    fullLanes,
    collectChanges,
    buildIndex,
    planScope,
    suiteRuns,
    githubOutputLines,
    parseArgs,
    resolveCommit,
    tokensFor,
    main,
    UsageError
};

if (require.main === module) {
    try {
        process.exitCode = main();
    } catch (error) {
        if (!(error instanceof UsageError)) throw error;
        console.error(`[framework-ci] ${error.message}`);
        process.exitCode = 2;
    }
}
