#!/usr/bin/env node
/**
 * framework-update.mjs — take a newer easy-claude framework into a project without losing the
 * project's own framework changes. `export-claude.mjs` installs a first copy; this updates it.
 *
 * Problem this solves: copying a new `.claude/` over a project replaces every file the project
 * changed (its toggled behaviors, its fixes) and deletes nothing it should, so each refresh
 * silently reverts project work. This tool merges instead, file by file, three ways:
 *   base     = the upstream version the project last took (`.claude/framework-lock.json`)
 *   upstream = the new upstream version (a committed ref by default)
 *   project  = the project's current file
 * and records the new base in the lock.
 *
 * Usage (Windows, macOS and Linux — Node and Git only):
 *   node .claude/scripts/framework-update.mjs <easy-claude-dir> [--ref=<rev>] [--working-tree]
 *        [--base=<rev>] [--dry-run] [--no-sync] [--allow-dirty-project] [--json]
 *
 *   --ref=<rev>          upstream revision to take (default HEAD).
 *   --working-tree       take the upstream working tree, uncommitted files included. The lock then
 *                        records hashes only, so the next update compares by hash where it would
 *                        otherwise merge.
 *   --base=<rev>         upstream revision the project last took; required once, when the project
 *                        has no lock yet (for example the commit named by the last sync's PR).
 *   --dry-run            report what would change; write nothing.
 *   --no-sync            skip the sync-codex pipeline at the end.
 *   --record-only        change no file: record the upstream version (--ref or --working-tree) as the
 *                        version this project now holds. Use it once after a sync made by hand, so the
 *                        next update merges from that version instead of an older --base.
 *   --allow-dirty-project  run although the project has uncommitted `.claude/` changes.
 *
 * Per file under `.claude/` in the upstream tree:
 *   unchanged in the project      → take upstream (or delete it when upstream deleted it)
 *   changed only in the project   → keep the project's file
 *   changed on both sides         → `git merge-file`; a conflict keeps markers in the file
 *   both added, or no base text   → keep the project's file; upstream's copy goes to tmp/framework-update/
 * A file upstream never had (project skills, ledgers, project protocols) is never touched.
 * `<!-- COUNT:… -->` values (ADR-0002) in Markdown/HTML docs never conflict: they are compared and merged
 * as 0 and recomputed afterwards (any other file is compared and written byte for byte), and the generated catalogs are regenerated instead of merged.
 *
 * Exit codes: 0 updated (or nothing to do) · 1 fatal · 2 conflicts left to resolve.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

export const LOCK_PATH = '.claude/framework-lock.json';
const SCOPE = '.claude';
// Derived from the project's own skill set: regenerated after the update, never merged.
export const REGENERATED = new Set(['.claude/SKILLS.yaml', '.claude/scripts/skills_data.yaml']);
// Never taken from upstream: the lock itself and per-person files.
const NEVER_TAKEN = new Set([LOCK_PATH, '.claude/settings.local.json', '.claude/.ck.local.json']);
const COUNT_RE = /<!--\s*COUNT:([a-z][a-z0-9_-]*)(?::([a-z][a-z0-9_-]*))?\s*-->\d+<!--\s*\/COUNT\s*-->/g;
// Count markers are a documentation device (ADR-0002); a script or test that merely contains the
// marker text is code, compared and written byte for byte.
const COUNTED = /\.(md|html?)$/i;
const USAGE = 'Usage: node .claude/scripts/framework-update.mjs <easy-claude-dir> [--ref=<rev>] [--working-tree] [--base=<rev>] [--dry-run] [--no-sync] [--record-only] [--allow-dirty-project] [--json]';

function git(cwd, args, { input, allowFail = false } = {}) {
    const result = spawnSync('git', args, { cwd, input, maxBuffer: 1 << 30, windowsHide: true });
    if (result.error) throw new Error(`git is required: ${result.error.message}`);
    if (result.status !== 0 && !allowFail) throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${String(result.stderr).trim()}`);
    return result;
}

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const isText = buffer => !buffer.includes(0);

/** In a doc, count markers read as 0, so a count that differs only because the inventories differ is no change. */
export function normalizeCounts(buffer, file = 'doc.md') {
    if (buffer === null || !COUNTED.test(file) || !isText(buffer)) return buffer;
    const text = buffer.toString('utf8');
    const zeroed = text.replace(COUNT_RE, (_match, kind, filter) => `<!-- COUNT:${kind}${filter ? `:${filter}` : ''} -->0<!-- /COUNT -->`);
    return zeroed === text ? buffer : Buffer.from(zeroed, 'utf8');
}
const hasCounts = (buffer, file) => buffer !== null && COUNTED.test(file) && isText(buffer) && new RegExp(COUNT_RE.source).test(buffer.toString('utf8'));
const same = (a, b) => (a === null || b === null) ? a === b : a.equals(b);

/** Read many `<rev>:<path>` blobs through one `git cat-file --batch`; a missing object reads as null. */
function readBlobs(repo, rev, paths) {
    const out = new Map();
    if (!paths.length) return out;
    const { stdout } = git(repo, ['cat-file', '--batch'], { input: paths.map(p => `${rev}:${p}`).join('\n') + '\n' });
    let offset = 0;
    for (const p of paths) {
        const newline = stdout.indexOf(10, offset);
        const header = stdout.subarray(offset, newline).toString('utf8');
        offset = newline + 1;
        if (header.endsWith(' missing')) { out.set(p, null); continue; }
        const size = Number(header.split(' ')[2]);
        out.set(p, Buffer.from(stdout.subarray(offset, offset + size)));
        offset += size + 1;
    }
    return out;
}

function upstreamFiles(upstream, { ref, workingTree }) {
    if (workingTree) {
        const listed = git(upstream, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', SCOPE]).stdout
            .toString('utf8').split('\0').filter(Boolean);
        const files = new Map();
        for (const p of [...new Set(listed)]) {
            const file = path.join(upstream, p);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) files.set(p, fs.readFileSync(file));
        }
        return files;
    }
    const paths = git(upstream, ['ls-tree', '-r', '-z', '--name-only', ref, '--', SCOPE]).stdout.toString('utf8').split('\0').filter(Boolean);
    return readBlobs(upstream, ref, paths);
}

function readProject(project, p) {
    const file = path.join(project, p);
    return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
}

function mergeFile(ours, base, theirs) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-update-'));
    try {
        const [o, b, t] = ['project', 'base', 'upstream'].map(name => path.join(dir, name));
        fs.writeFileSync(o, ours); fs.writeFileSync(b, base); fs.writeFileSync(t, theirs);
        const result = git(dir, ['merge-file', '-p', '-L', 'project', '-L', 'base', '-L', 'upstream', o, b, t], { allowFail: true });
        if (result.status < 0 || result.status > 127) throw new Error(`git merge-file failed: ${String(result.stderr).trim()}`);
        return { merged: result.stdout, conflicts: result.status };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/**
 * Decide every file's action. Pure apart from reading the two trees: nothing is written here.
 * Each action: { path, kind, content? } with kind one of
 * take | delete | merge | keep | conflict | conflict-side | skip-regenerated | same
 */
export function planUpdate({ project, upstream, ref = 'HEAD', workingTree = false, base }) {
    const lock = fs.existsSync(path.join(project, LOCK_PATH)) ? JSON.parse(fs.readFileSync(path.join(project, LOCK_PATH), 'utf8')) : null;
    const baseRev = base || (lock && !lock.source?.workingTree ? lock.source?.commit : undefined);
    if (!lock && !base) throw new Error(`No ${LOCK_PATH} yet: pass --base=<upstream commit this project last took> once.`);
    const theirs = upstreamFiles(upstream, { ref, workingTree });
    const resolvedRef = workingTree ? null : git(upstream, ['rev-parse', '--verify', `${ref}^{commit}`]).stdout.toString('utf8').trim();
    const resolvedBase = baseRev ? git(upstream, ['rev-parse', '--verify', `${baseRev}^{commit}`]).stdout.toString('utf8').trim() : null;
    // The base tree too: a file upstream deleted since the base exists in neither the new tree nor a first lock.
    const basePaths = resolvedBase ? git(upstream, ['ls-tree', '-r', '-z', '--name-only', resolvedBase, '--', SCOPE]).stdout.toString('utf8').split('\0').filter(Boolean) : [];
    const paths = [...new Set([...theirs.keys(), ...Object.keys(lock?.files || {}), ...basePaths])].filter(p => !NEVER_TAKEN.has(p)).sort();
    const baseBlobs = resolvedBase ? readBlobs(upstream, resolvedBase, paths) : new Map();
    const actions = [];
    for (const p of paths) {
        const up = theirs.get(p) ?? null;
        const mine = readProject(project, p);
        if (REGENERATED.has(p)) { actions.push({ path: p, kind: 'skip-regenerated' }); continue; }
        const [nUp, nMine] = [normalizeCounts(up, p), normalizeCounts(mine, p)];
        // Base text when the lock names a commit; otherwise only the hash taken last time.
        const baseText = resolvedBase ? normalizeCounts(baseBlobs.get(p) ?? null, p) : undefined;
        const baseHash = lock?.files?.[p];
        const isBase = buffer => baseText !== undefined ? same(buffer, baseText) : (buffer === null ? baseHash === undefined : sha256(buffer) === baseHash);
        if (same(nMine, nUp)) { actions.push({ path: p, kind: 'same', content: up }); continue; }
        if (isBase(nMine)) { actions.push(up === null ? { path: p, kind: 'delete' } : { path: p, kind: 'take', content: up }); continue; }
        if (isBase(nUp)) { actions.push({ path: p, kind: 'keep' }); continue; }
        if (mine !== null && up !== null && baseText && isText(mine) && isText(up) && isText(baseText)) {
            const { merged, conflicts } = mergeFile(nMine, baseText, nUp);
            actions.push({ path: p, kind: conflicts ? 'conflict' : 'merge', content: merged, conflicts });
            continue;
        }
        // Added on both sides, deleted on one side and changed on the other, binary, or no base text.
        actions.push({ path: p, kind: 'conflict-side', content: up,
            reason: mine === null ? 'deleted in the project, changed upstream' : up === null ? 'changed in the project, deleted upstream'
                : !baseText && baseHash === undefined ? 'added on both sides' : 'no base text to merge' });
    }
    const lockFiles = {};
    for (const [p, buffer] of theirs) if (!NEVER_TAKEN.has(p)) lockFiles[p] = sha256(normalizeCounts(buffer, p));
    const nextLock = { schemaVersion: 1, source: { commit: resolvedRef, ref: workingTree ? null : ref, workingTree: !!workingTree,
        ...(workingTree ? { headCommit: git(upstream, ['rev-parse', 'HEAD']).stdout.toString('utf8').trim() } : {}) }, files: lockFiles };
    return { actions, nextLock, base: resolvedBase, firstLock: !lock };
}

function python() {
    for (const [cmd, args] of [['python3', []], ['py', ['-3']], ['python', []]]) {
        if (spawnSync(cmd, [...args, '--version'], { windowsHide: true }).status === 0) return [cmd, args];
    }
    return null;
}

/** Write the plan. Returns the paths written and the follow-up results. */
export function applyUpdate(project, plan, { sync = true } = {}) {
    const written = [];
    for (const action of plan.actions) {
        const file = path.join(project, action.path);
        if (action.kind === 'take' || action.kind === 'merge' || action.kind === 'conflict') {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, action.content);
            written.push(action.path);
        } else if (action.kind === 'delete') {
            fs.rmSync(file, { force: true });
            written.push(action.path);
        } else if (action.kind === 'conflict-side' && action.content) {
            const side = path.join(project, 'tmp', 'framework-update', action.path);
            fs.mkdirSync(path.dirname(side), { recursive: true });
            fs.writeFileSync(side, action.content);
        }
    }
    fs.writeFileSync(path.join(project, LOCK_PATH), `${JSON.stringify(plan.nextLock, null, 2)}\n`);
    const followUps = [];
    const py = python();
    const scripts = path.join(project, '.claude', 'scripts');
    if (!py) followUps.push('Python 3 not found: regenerate catalogs and counts with .claude/scripts/scan_skills.py and generate_catalogs.py.');
    else {
        const [cmd, args] = py;
        const run = (script, extra) => spawnSync(cmd, [...args, path.join(scripts, script), ...extra], { cwd: project, encoding: 'utf8', windowsHide: true });
        run('scan_skills.py', []);
        run('generate_catalogs.py', ['--skills', '--output', '.claude/SKILLS.yaml']);
        for (const p of written) {
            const content = readProject(project, p);
            if (hasCounts(content, p)) run('generate_catalogs.py', ['--inject-counts', p]);
        }
    }
    const conflicts = plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side');
    if (sync && !conflicts.length) {
        const result = spawnSync(process.execPath, [path.join(project, '.claude/skills/sync-codex/scripts/run-codex-sync.mjs')],
            { cwd: project, stdio: 'inherit', windowsHide: true });
        followUps.push(result.status === 0 ? 'sync-codex passed.' : `sync-codex failed (exit ${result.status}); fix it before committing.`);
    } else if (conflicts.length) followUps.push('Resolve the conflicts, then run: node .claude/skills/sync-codex/scripts/run-codex-sync.mjs');
    return { written, followUps };
}

function parseArgs(argv) {
    const options = { dryRun: false, sync: true, json: false, workingTree: false, allowDirtyProject: false, recordOnly: false, ref: 'HEAD' };
    const positional = [];
    for (const arg of argv) {
        if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--no-sync') options.sync = false;
        else if (arg === '--json') options.json = true;
        else if (arg === '--working-tree') options.workingTree = true;
        else if (arg === '--allow-dirty-project') options.allowDirtyProject = true;
        else if (arg === '--record-only') options.recordOnly = true;
        else if (arg.startsWith('--ref=')) options.ref = arg.slice(6);
        else if (arg.startsWith('--base=')) options.base = arg.slice(7);
        else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}\n${USAGE}`);
        else positional.push(arg);
    }
    if (positional.length !== 1 || (options.workingTree && options.ref !== 'HEAD')) throw new Error(USAGE);
    for (const value of [options.ref, options.base]) if (value !== undefined && (!value || value.startsWith('-'))) throw new Error(USAGE);
    return { upstream: path.resolve(positional[0]), ...options };
}

export function main(argv = process.argv.slice(2), project = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..')) {
    const options = parseArgs(argv);
    if (!fs.existsSync(path.join(options.upstream, SCOPE))) throw new Error(`No ${SCOPE}/ in ${options.upstream}`);
    if (fs.realpathSync(options.upstream) === fs.realpathSync(project)) throw new Error('The upstream directory is this project.');
    if (!options.allowDirtyProject && git(project, ['status', '--porcelain', '--', SCOPE]).stdout.length) {
        throw new Error(`The project has uncommitted ${SCOPE}/ changes; commit or stash them first so the update is one reviewable diff (or pass --allow-dirty-project).`);
    }
    if (options.recordOnly) {
        const theirs = upstreamFiles(options.upstream, options);
        const files = {};
        for (const [p, buffer] of theirs) if (!NEVER_TAKEN.has(p)) files[p] = sha256(normalizeCounts(buffer, p));
        const commit = options.workingTree ? null : git(options.upstream, ['rev-parse', '--verify', `${options.ref}^{commit}`]).stdout.toString('utf8').trim();
        const lock = { schemaVersion: 1, source: { commit, ref: options.workingTree ? null : options.ref, workingTree: options.workingTree,
            ...(options.workingTree ? { headCommit: git(options.upstream, ['rev-parse', 'HEAD']).stdout.toString('utf8').trim() } : {}) }, files };
        if (!options.dryRun) fs.writeFileSync(path.join(project, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`);
        process.stdout.write(`${options.dryRun ? '[dry run] ' : ''}Recorded ${Object.keys(files).length} framework files at ${commit ? commit.slice(0, 10) : 'the upstream working tree'} in ${LOCK_PATH}; no other file changed.\n`);
        return 0;
    }
    const plan = planUpdate({ project, upstream: options.upstream, ref: options.ref, workingTree: options.workingTree, base: options.base });
    const count = kind => plan.actions.filter(a => a.kind === kind).length;
    const summary = { base: plan.base, upstream: plan.nextLock.source, firstLock: plan.firstLock,
        taken: count('take'), deleted: count('delete'), merged: count('merge'), kept: count('keep'), unchanged: count('same'),
        regenerated: count('skip-regenerated'),
        conflicts: plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side')
            .map(a => ({ path: a.path, kind: a.kind, ...(a.reason ? { reason: a.reason } : {}), ...(a.conflicts ? { hunks: a.conflicts } : {}) })) };
    let result = { written: [], followUps: [] };
    if (!options.dryRun) result = applyUpdate(project, plan, { sync: options.sync });
    if (options.json) process.stdout.write(`${JSON.stringify({ ...summary, dryRun: options.dryRun, ...result }, null, 2)}\n`);
    else {
        process.stdout.write(`${options.dryRun ? '[dry run] ' : ''}Framework update from ${plan.base ? plan.base.slice(0, 10) : 'the locked hashes'} to ${options.workingTree ? 'the upstream working tree' : plan.nextLock.source.commit.slice(0, 10)}\n` +
            `taken ${summary.taken} · deleted ${summary.deleted} · merged ${summary.merged} · kept project changes ${summary.kept} · unchanged ${summary.unchanged} · regenerated ${summary.regenerated}\n` +
            summary.conflicts.map(c => `CONFLICT ${c.path}${c.reason ? ` (${c.reason}; upstream copy in tmp/framework-update/)` : ` (${c.hunks} hunk${c.hunks === 1 ? '' : 's'} marked in the file)`}\n`).join('') +
            result.followUps.map(line => `${line}\n`).join(''));
    }
    return summary.conflicts.length ? 2 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(url.fileURLToPath(import.meta.url))) {
    try { process.exitCode = main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
