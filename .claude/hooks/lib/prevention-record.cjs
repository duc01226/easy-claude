#!/usr/bin/env node
'use strict';

/**
 * Bug-class prevention record: did the fix ask why its whole class of bug can happen, and guard it?
 *
 * After every fix, the `fix --mode=prevent` task (`.claude/skills/fix/references/mode-prevent.md`) names
 * the bug class from a closed vocabulary, sweeps the project for sibling instances, chooses the
 * strongest affordable guard (impossible by design > automatic check > test > hook > prose) and writes
 * ONE prevention record: a small JSON file under `tmp/prevention/records/` in the repository. This
 * module is the single checker of that record. `workflow-end` runs it for the `recurrence-guarded`
 * outcome gate, `/fix` runs it before its verify, and the commit gate uses it for its one warning line.
 *
 * A record is one of three outcomes:
 *   guarded           a guard exists in the tree: `guard.tier` and `guard.path` (an existing, tracked
 *                     or trackable path, never a git-ignored one);
 *   no-guard          no affordable guard: `reason` and `owner` (who decides on the class later);
 *   not-a-code-defect the cause was the environment, not the code: `evidence`;
 *   not-applicable    the fix repaired no behavior defect (style, naming, documentation, coverage only):
 *                     `reason`. It clears the commit reminder but never proves the `recurrence-guarded`
 *                     gate (`provesRecurrenceGuard` is false), so it cannot stand in for a guard.
 * Every record names `bugClass`, `rootCause` and `why` (why this class can happen at all); a code
 * defect (guarded or no-guard) also names its sibling sweep: `siblings.query`, `.count`, `.locations`.
 * A record holds no secrets: any value shaped like a secret is rejected (BR-GWF-25).
 *
 * Fix marker: when the `fix` skill activates (a Skill tool call, a typed `/fix`, or Codex `$fix`), the
 * existing `skill-overlay-remind.cjs` hook records the session's latest fix time under
 * `tmp/prevention/markers/`. The commit gate (`review-commit-gate.cjs`) reads it: a marker with no valid
 * record written after it gets one warning line under `reviewGate.verify: warn` (the default), a refusal
 * under `enforce`, nothing under `off`. A marker older than MARKER_TTL_MS is ignored, so an abandoned
 * fix cannot nag for ever; a one-line `no-guard` record clears it sooner.
 *
 * CLI (run from inside the repository; JSON on stdout):
 *   node prevention-record.cjs check [--file=<path>] [--since=<ISO time or epoch ms>] [--proof]
 *                                       validate the given record, or the newest record (written at or
 *                                       after --since); --proof skips not-applicable records in that scan,
 *                                       so it finds the record that proves recurrence-guarded;
 *                                       exit 0 VALID, 1 MISSING or INVALID, 2 error
 *   node prevention-record.cjs classes  the closed bug-class vocabulary, guard tiers and outcomes
 *   node prevention-record.cjs template a record skeleton to fill in (its placeholders never validate)
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCHEMA = 1;

/** The closed bug-class vocabulary. Counted later through the opt-in `Bug-Class:` commit trailer. */
const BUG_CLASSES = Object.freeze({
    'state-transition': 'an entity moved through a lifecycle change its rules forbid, or skipped one they require',
    'concurrency-ordering': 'two operations raced, or code assumed an order (await, event, lock, callback) that nothing guarantees',
    'idempotency-replay': 'a retry, replay or duplicate delivery applied an effect twice, or lost one',
    'missing-value': 'an absent value (null, undefined, empty lookup, optional field) reached code that assumed it',
    boundary: 'a limit, range, off-by-one, empty or overflow case was handled wrong',
    'error-handling': 'an error was swallowed, misreported or routed to the wrong handler',
    'contract-drift': 'code disagrees with its spec, API, schema or caller',
    'duplicated-rule': 'one rule lives in two places and the copies diverged',
    'data-integrity': 'stored data was lost, corrupted or left inconsistent',
    security: 'an access, injection, secret or trust-boundary rule was broken',
    performance: 'work grows with total data instead of the request (an unbounded loop or query, a query per row)',
    'test-reliability': 'a test depends on order, timing, shared state or the environment',
    configuration: 'behavior depends on configuration, environment or platform that the code does not handle',
    'build-tooling': 'the build, dependency set or toolchain produced the fault',
    other: 'none of the above; `classNote` names the class in a few words'
});

/** Guard tiers, strongest first: the order the prevention task walks. */
const GUARD_TIERS = Object.freeze({
    impossible: 'a type, structure or wrapper makes the bug impossible to write',
    check: 'a lint, boundary or schema rule whose message names the fix, with a frozen baseline of the swept siblings',
    test: 'a test that fails when the class recurs (for state-transition: a stateful property test)',
    hook: 'a hook that stops the mistake when it is made',
    prose: 'a lesson saved through /learn, with the user agreeing'
});

const OUTCOMES = Object.freeze(['guarded', 'no-guard', 'not-a-code-defect', 'not-applicable']);
/** Outcomes that prove the `recurrence-guarded` outcome gate; `not-applicable` only clears the commit reminder. */
const GUARD_PROOF_OUTCOMES = Object.freeze(['guarded', 'no-guard', 'not-a-code-defect']);

const RECORDS_SEGMENTS = Object.freeze(['tmp', 'prevention', 'records']);
const MARKERS_SEGMENTS = Object.freeze(['tmp', 'prevention', 'markers']);
const MAX_RECORD_BYTES = 64 * 1024;
const MAX_SCANNED_RECORDS = 50;
const MIN_TEXT = 10;
const MAX_TEXT = 2000;
const MAX_LOCATIONS = 200;
// A fix marker older than this is ignored: an abandoned fix stops warning after a working day.
const MARKER_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PRUNED_MARKERS = 500;
const SESSION_FILE = /^[A-Za-z0-9._-]{1,128}$/;
const PLACEHOLDER = /^\s*<[^<>]*>\s*$/;

const CHECK_COMMAND = 'node .claude/hooks/lib/prevention-record.cjs check';
const RECORD_HOME = 'tmp/prevention/records/';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordsDirectory(repository) {
    return path.join(repository, ...RECORDS_SEGMENTS);
}

function markersDirectory(repository) {
    return path.join(repository, ...MARKERS_SEGMENTS);
}

// ---- Validation -----------------------------------------------------------------------------------

function problem(field, issue, fix) {
    return { field, problem: issue, fix };
}

/** A required free-text field: a real sentence, not empty, not a template placeholder, bounded. */
function textProblem(record, field, label) {
    const value = record[field];
    if (typeof value !== 'string' || value.trim() === '') return problem(field, `${label} is missing`, `Write ${label} as a sentence.`);
    if (PLACEHOLDER.test(value)) return problem(field, `${label} is still the template placeholder`, `Replace the placeholder with ${label}.`);
    const length = value.trim().length;
    if (length < MIN_TEXT)
        return problem(field, `${label} is too short to explain anything (${length} characters)`, `Give ${label} in at least ${MIN_TEXT} characters.`);
    if (length > MAX_TEXT) return problem(field, `${label} is longer than ${MAX_TEXT} characters`, `Shorten ${label}; the details belong in the fix report.`);
    return null;
}

/** Every string value of the record, with its field path, for the secret check. */
function stringValues(value, prefix, out) {
    if (typeof value === 'string') out.push([prefix, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => stringValues(item, `${prefix}[${index}]`, out));
    else if (isPlainObject(value)) for (const [key, item] of Object.entries(value)) stringValues(item, prefix ? `${prefix}.${key}` : key, out);
    return out;
}

function secretProblems(record) {
    const { findSecretLines } = require('./knowledge-pack.cjs');
    return stringValues(record, '', [])
        .map(([field, text]) => ({ field, hits: findSecretLines(text) }))
        .filter(item => item.hits.length)
        .map(item =>
            problem(
                item.field,
                `looks like it holds a secret (${item.hits[0].kind})`,
                'Remove the value; a prevention record names files and classes, never credentials.'
            )
        );
}

/** A repository-relative guard path (an optional `:line` suffix is allowed) that must exist in the tree. */
function guardPathProblem(guardPath, repository, options) {
    if (typeof guardPath !== 'string' || guardPath.trim() === '' || PLACEHOLDER.test(guardPath)) {
        return problem('guard.path', 'the guard has no location', 'Name the file that holds the guard, relative to the repository root.');
    }
    const bare = guardPath
        .trim()
        .replace(/:\d+(?::\d+)?$/, '')
        .replace(/\\/g, '/');
    if (path.isAbsolute(bare) || /^[A-Za-z]:\//.test(bare) || bare.split('/').includes('..')) {
        return problem('guard.path', 'the guard path is not inside the repository', 'Use a path relative to the repository root, with no "..".');
    }
    if (!repository) return null;
    let isFile;
    try {
        isFile = fs.statSync(path.join(repository, bare)).isFile();
    } catch {
        isFile = false;
    }
    if (!isFile) {
        return problem('guard.path', 'the guard path is not a file in the tree', 'Add the guard first, or record outcome no-guard with a reason and an owner.');
    }
    const ignored = typeof options.isIgnored === 'function' ? options.isIgnored(repository, bare) : isGitIgnored(repository, bare);
    if (ignored) {
        return problem('guard.path', 'the guard path is git-ignored, so the guard would never reach the repository', 'Put the guard in a tracked file.');
    }
    return null;
}

function isGitIgnored(repository, relative) {
    try {
        execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: repository, stdio: 'ignore', timeout: 5000 });
        return true; // exit 0: ignored
    } catch {
        return false; // exit 1 (not ignored), no git, or not a repository: the existence check above already holds
    }
}

function siblingProblems(siblings) {
    if (!isPlainObject(siblings)) {
        return [
            problem(
                'siblings',
                'the sibling sweep is missing',
                'Search the project for the same pattern (not the same feature) and record the query, the count and each location.'
            )
        ];
    }
    const found = [];
    if (typeof siblings.query !== 'string' || siblings.query.trim() === '' || PLACEHOLDER.test(siblings.query)) {
        found.push(problem('siblings.query', 'the sweep query is missing', 'Record the exact search you ran, so the sweep can be repeated.'));
    }
    const count = siblings.count;
    if (!Number.isInteger(count) || count < 0) {
        found.push(problem('siblings.count', 'the sibling count is not a whole number', 'Record how many other instances the sweep found (0 when none).'));
    }
    const locations = siblings.locations;
    if (!Array.isArray(locations) || locations.some(item => typeof item !== 'string' || item.trim() === '')) {
        found.push(
            problem(
                'siblings.locations',
                'the sibling locations are not a list of file:line strings',
                'List each sibling as "path:line" ([] when the count is 0).'
            )
        );
    } else if (Number.isInteger(count)) {
        if (count > 0 && locations.length === 0) {
            found.push(
                problem(
                    'siblings.locations',
                    `the sweep counted ${count} siblings but lists none`,
                    'List each sibling as "path:line" so it can be reported to the user.'
                )
            );
        }
        if (locations.length > count) {
            found.push(
                problem('siblings.locations', `${locations.length} locations are listed for a count of ${count}`, 'Make the count match the listed siblings.')
            );
        }
        if (locations.length > MAX_LOCATIONS) {
            found.push(
                problem(
                    'siblings.locations',
                    `more than ${MAX_LOCATIONS} locations`,
                    'List the first locations and keep the full count; the guard baseline holds the rest.'
                )
            );
        }
    }
    return found;
}

/**
 * Validate one parsed record. Returns { valid, problems: [{ field, problem, fix }] }.
 * options: repository (absolute; enables the guard-path checks), isIgnored (tests).
 */
function validateRecord(record, options = {}) {
    if (!isPlainObject(record)) {
        return {
            valid: false,
            problems: [
                problem(
                    '(record)',
                    'the record is not a JSON object',
                    `Write the record as a JSON object (see \`${CHECK_COMMAND.replace(' check', ' template')}\`).`
                )
            ]
        };
    }
    const problems = [];
    if (record.schema !== SCHEMA) problems.push(problem('schema', `schema must be ${SCHEMA}`, `Set "schema": ${SCHEMA}.`));
    if (record.outcome === 'not-applicable') {
        // No behavior defect was repaired: no class, sweep or guard to name, only the reason.
        const reason = textProblem(record, 'reason', 'why this fix repaired no behavior defect');
        if (reason) problems.push(reason);
        problems.push(...secretProblems(record));
        return { valid: problems.length === 0, problems };
    }

    if (typeof record.bugClass !== 'string' || record.bugClass.trim() === '') {
        problems.push(
            problem(
                'bugClass',
                'the bug class is missing, so the class cannot be counted or guarded',
                `Name one class from the vocabulary: ${Object.keys(BUG_CLASSES).join(', ')}.`
            )
        );
    } else if (!Object.hasOwn(BUG_CLASSES, record.bugClass)) {
        problems.push(problem('bugClass', 'the bug class is not in the closed vocabulary', `Use one of: ${Object.keys(BUG_CLASSES).join(', ')}.`));
    } else if (record.bugClass === 'other') {
        const note = textProblem(record, 'classNote', 'the class name for "other"');
        if (note) problems.push(note);
    }
    for (const [field, label] of [
        ['rootCause', 'the root cause (file:line from the investigation)'],
        ['why', 'why this class of bug can happen at all']
    ]) {
        const found = textProblem(record, field, label);
        if (found) problems.push(found);
    }

    if (!OUTCOMES.includes(record.outcome)) {
        problems.push(
            problem(
                'outcome',
                `outcome must be one of ${OUTCOMES.join(', ')}`,
                'Record guarded (a guard exists), no-guard (with a reason and an owner), not-a-code-defect (with evidence) or not-applicable (no behavior defect was repaired, with a reason).'
            )
        );
    } else if (record.outcome === 'not-a-code-defect') {
        const found = textProblem(record, 'evidence', 'the evidence that the cause was the environment, not the code');
        if (found) problems.push(found);
    } else {
        problems.push(...siblingProblems(record.siblings));
        if (record.outcome === 'guarded') {
            const guard = isPlainObject(record.guard) ? record.guard : null;
            if (!guard) {
                problems.push(problem('guard', 'outcome guarded names no guard', 'Add "guard": { "tier": ..., "path": ... }, or record outcome no-guard.'));
            } else {
                if (!Object.hasOwn(GUARD_TIERS, guard.tier)) {
                    problems.push(
                        problem(
                            'guard.tier',
                            `guard tier must be one of ${Object.keys(GUARD_TIERS).join(', ')}`,
                            'Name the tier the guard belongs to, strongest first.'
                        )
                    );
                }
                const pathProblem = guardPathProblem(guard.path, options.repository, options);
                if (pathProblem) problems.push(pathProblem);
            }
        } else {
            const reason = textProblem(record, 'reason', 'the reason no guard is affordable');
            if (reason) problems.push(reason);
            if (typeof record.owner !== 'string' || record.owner.trim() === '' || PLACEHOLDER.test(record.owner)) {
                problems.push(
                    problem(
                        'owner',
                        'a no-guard record names no owner, so nobody decides on the class later',
                        'Name the person, team or ticket that owns the follow-up.'
                    )
                );
            }
        }
    }
    problems.push(...secretProblems(record));
    return { valid: problems.length === 0, problems };
}

// ---- Record files -------------------------------------------------------------------------------

function parseSince(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = String(value).trim();
    const time = /^\d+$/.test(text) ? Number(text) : Date.parse(text);
    if (!Number.isFinite(time)) throw new Error(`--since is not a time: ${text}`);
    return time;
}

function readRecordFile(file, options) {
    let stat;
    try {
        stat = fs.statSync(file);
    } catch {
        return { file, missing: true };
    }
    if (!stat.isFile()) return { file, missing: true };
    if (stat.size > MAX_RECORD_BYTES) {
        return {
            file,
            mtimeMs: stat.mtimeMs,
            valid: false,
            problems: [problem('(file)', `the record is larger than ${MAX_RECORD_BYTES} bytes`, 'Keep the record short; details belong in the fix report.')]
        };
    }
    let record;
    try {
        record = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return {
            file,
            mtimeMs: stat.mtimeMs,
            valid: false,
            problems: [problem('(file)', 'the record is not valid JSON', 'Rewrite the file as one JSON object.')]
        };
    }
    return { file, mtimeMs: stat.mtimeMs, record, ...validateRecord(record, options) };
}

/** Record files, newest first, bounded. */
function listRecordFiles(repository) {
    const directory = recordsDirectory(repository);
    let names;
    try {
        names = fs.readdirSync(directory).filter(name => name.endsWith('.json'));
    } catch {
        return [];
    }
    return names
        .map(name => {
            const file = path.join(directory, name);
            try {
                return { file, mtimeMs: fs.statSync(file).mtimeMs };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, MAX_SCANNED_RECORDS);
}

function relativeTo(repository, file) {
    const relative = path.relative(repository, file);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.split(path.sep).join('/') : file;
}

function verdictMessage(result, repository) {
    if (result.verdict === 'VALID') {
        const record = result.record;
        const outcome =
            record.outcome === 'guarded'
                ? `guarded by a ${record.guard.tier} guard at ${record.guard.path}`
                : record.outcome === 'no-guard'
                  ? `no-guard, owned by ${record.owner}`
                  : 'not a code defect';
        if (record.outcome === 'not-applicable') {
            return `Prevention record ${relativeTo(repository, result.file)}: not applicable (${record.reason.trim()}). It clears the commit reminder but does not prove recurrence-guarded.`;
        }
        return `Prevention record ${relativeTo(repository, result.file)}: ${record.bugClass}, ${outcome}.`;
    }
    if (result.verdict === 'MISSING') {
        return `No prevention record${result.since !== null ? ' written since the fix' : ''} under ${RECORD_HOME}. A fix that guards only its own instance lets the same class of bug return elsewhere. Run the prevention task (/fix --mode=prevent) and write its record there; a fix that repaired no behavior defect records outcome not-applicable with a reason; an abandoned or trivial defect fix records outcome no-guard with a reason and an owner.`;
    }
    const lines = result.problems.map(item => `${item.field}: ${item.problem}. Fix: ${item.fix}`);
    return `Prevention record ${relativeTo(repository, result.file)} is invalid, so the bug class is not proven guarded:\n- ${lines.join('\n- ')}`;
}

/**
 * Check the prevention record. options: repository (absolute), file (one record to validate, relative
 * to the repository or absolute), since (epoch ms or ISO: only records written at or after it count),
 * proof (scan only: skip records that cannot prove recurrence-guarded, so a newer not-applicable record
 * from a style-only fix never hides the run's guard), isIgnored (tests).
 * Returns { verdict: VALID|MISSING|INVALID, file, record, problems, since, provesRecurrenceGuard, message }.
 */
function checkPrevention(options = {}) {
    const repository = options.repository;
    if (!repository) throw new Error('checkPrevention needs a repository');
    const since = parseSince(options.since);
    let result;
    if (options.file) {
        const file = path.isAbsolute(options.file) ? options.file : path.join(repository, options.file);
        const read = readRecordFile(file, options);
        if (read.missing) result = { verdict: 'MISSING', file, record: null, problems: [] };
        else if (since !== null && read.mtimeMs < since) result = { verdict: 'MISSING', file, record: null, problems: [], stale: true };
        else result = { verdict: read.valid ? 'VALID' : 'INVALID', file, record: read.record || null, problems: read.problems };
    } else {
        const candidates = listRecordFiles(repository).filter(item => since === null || item.mtimeMs >= since);
        let firstInvalid = null;
        for (const candidate of candidates) {
            const read = readRecordFile(candidate.file, options);
            if (read.missing) continue;
            if (options.proof && read.record && !GUARD_PROOF_OUTCOMES.includes(read.record.outcome)) continue;
            if (read.valid) {
                result = { verdict: 'VALID', file: read.file, record: read.record, problems: [] };
                break;
            }
            if (!firstInvalid) firstInvalid = read;
        }
        if (!result) {
            result = firstInvalid
                ? { verdict: 'INVALID', file: firstInvalid.file, record: firstInvalid.record || null, problems: firstInvalid.problems }
                : { verdict: 'MISSING', file: null, record: null, problems: [] };
        }
    }
    result.since = since;
    result.provesRecurrenceGuard = result.verdict === 'VALID' && GUARD_PROOF_OUTCOMES.includes(result.record.outcome);
    result.message = verdictMessage(result, repository);
    return result;
}

// ---- Fix marker (written by skill-overlay-remind.cjs, read by the commit gate) -------------------

function markerFile(repository, sessionId) {
    if (typeof sessionId !== 'string' || sessionId.trim() === '') return null;
    const name = SESSION_FILE.test(sessionId) ? sessionId : require('node:crypto').createHash('sha256').update(sessionId).digest('hex').slice(0, 32);
    return path.join(markersDirectory(repository), `${name}.json`);
}

/** Remove markers past their lifetime (bounded), so one file per session never piles up. */
function pruneExpiredMarkers(directory, now) {
    let names;
    try {
        names = fs.readdirSync(directory).slice(0, MAX_PRUNED_MARKERS);
    } catch {
        return;
    }
    for (const name of names) {
        const file = path.join(directory, name);
        try {
            if (now - fs.statSync(file).mtimeMs > MARKER_TTL_MS) fs.rmSync(file, { force: true });
        } catch {
            /* another process removed it */
        }
    }
}

/** Record that a fix started in this session (overwrites: the latest fix is the one to guard). */
function recordFixMarker({ repository, sessionId, now = Date.now() } = {}) {
    const file = repository ? markerFile(repository, sessionId) : null;
    if (!file) return null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
    try {
        fs.writeFileSync(temporary, `${JSON.stringify({ schema: SCHEMA, since: now })}\n`, { flag: 'wx' });
        fs.renameSync(temporary, file);
    } catch (error) {
        fs.rmSync(temporary, { force: true });
        throw error;
    }
    pruneExpiredMarkers(path.dirname(file), now);
    return file;
}

function readFixMarker({ repository, sessionId, now = Date.now() } = {}) {
    const file = repository ? markerFile(repository, sessionId) : null;
    if (!file) return null;
    try {
        const marker = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!isPlainObject(marker) || !Number.isFinite(marker.since)) return null;
        if (now - marker.since > MARKER_TTL_MS) return null;
        return { file, since: marker.since };
    } catch {
        return null;
    }
}

/**
 * The commit gate's finding: null (nothing to say), or { level: 'warn'|'block', message }.
 * mode is `reviewGate.verify` (off | warn | enforce); a marker with a valid record written after it is silent.
 */
function preventionGateFinding({ repository, sessionId, mode = 'warn', now = Date.now(), isIgnored } = {}) {
    if (mode === 'off' || !repository) return null;
    const marker = readFixMarker({ repository, sessionId, now });
    if (!marker) return null;
    const result = checkPrevention({ repository, since: marker.since, isIgnored });
    if (result.verdict === 'VALID') return null;
    const when = new Date(marker.since).toISOString();
    const state =
        result.verdict === 'INVALID'
            ? `its prevention record ${relativeTo(repository, result.file)} is invalid (${result.problems.map(item => `${item.field}: ${item.problem}`).join('; ')})`
            : 'no prevention record was written after it';
    const body = `a /fix ran in this session at ${when} and ${state}. A fix that guards only its own instance lets the same class of bug return elsewhere. Fix: run /fix --mode=prevent to write ${RECORD_HOME}<name>.json and check it with \`${CHECK_COMMAND}\`; a fix that repaired no behavior defect (style, naming, docs) records outcome not-applicable with a reason; an abandoned or trivial defect fix records outcome no-guard with a reason and an owner.`;
    if (mode === 'enforce') return { level: 'block', message: `[BLOCKED] Commit refused (reviewGate.verify is enforce): ${body}` };
    return { level: 'warn', message: `[prevention] Warning: ${body}` };
}

// ---- CLI ----------------------------------------------------------------------------------------

function template() {
    return {
        schema: SCHEMA,
        bugClass: '<one of: classes>',
        rootCause: '<path:line of the root cause>',
        why: '<why this class of bug can happen at all>',
        siblings: { query: '<the search you ran>', count: 0, locations: [] },
        outcome: '<guarded | no-guard | not-a-code-defect | not-applicable>',
        guard: { tier: '<impossible | check | test | hook | prose>', path: '<repository-relative path of the guard>' },
        reason: '<no-guard: why no guard is affordable; not-applicable: why no behavior defect was repaired>',
        owner: '<no-guard only: who owns the follow-up>',
        evidence: '<not-a-code-defect only: the environment evidence>'
    };
}

function parseArgs(argv) {
    const flags = {};
    for (const arg of argv) {
        const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
        if (!match) throw new Error(`Unsupported argument: ${arg}`);
        flags[match[1]] = match[2] === undefined ? true : match[2];
    }
    return flags;
}

const ALLOWED_FLAGS = { check: ['file', 'since', 'proof'], classes: [], template: [] };

function resolveRepository(cwd) {
    try {
        return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || cwd;
    } catch {
        return cwd;
    }
}

function runCli(argv, cwd = process.cwd()) {
    const command = argv[0];
    if (!Object.hasOwn(ALLOWED_FLAGS, command)) throw new Error(`Use ${Object.keys(ALLOWED_FLAGS).join('|')}`);
    const flags = parseArgs(argv.slice(1));
    const unknown = Object.keys(flags).filter(flag => !ALLOWED_FLAGS[command].includes(flag));
    if (unknown.length) throw new Error(`${command} does not take --${unknown.join(', --')}`);
    if (command === 'classes') return { status: 'CLASSES', classes: BUG_CLASSES, tiers: GUARD_TIERS, outcomes: OUTCOMES, home: RECORD_HOME };
    if (command === 'template') return template();
    if (flags.file === true || flags.since === true) throw new Error('--file and --since need a value (--file=<path>, --since=<time>)');
    const repository = resolveRepository(cwd);
    const result = checkPrevention({ repository, file: flags.file, since: flags.since, proof: flags.proof === true });
    // An invalid record may hold a rejected secret: report its problems, never its content.
    return {
        status: result.verdict,
        ...result,
        record: result.verdict === 'INVALID' ? null : result.record,
        file: result.file ? relativeTo(repository, result.file) : null
    };
}

module.exports = {
    SCHEMA,
    BUG_CLASSES,
    GUARD_TIERS,
    OUTCOMES,
    GUARD_PROOF_OUTCOMES,
    RECORDS_SEGMENTS,
    MARKERS_SEGMENTS,
    MARKER_TTL_MS,
    CHECK_COMMAND,
    validateRecord,
    checkPrevention,
    recordFixMarker,
    readFixMarker,
    preventionGateFinding,
    template,
    runCli
};

if (require.main === module) {
    try {
        const result = runCli(process.argv.slice(2));
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exitCode = result.status === 'MISSING' || result.status === 'INVALID' ? 1 : 0;
    } catch (error) {
        process.stderr.write(`Prevention record check failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
