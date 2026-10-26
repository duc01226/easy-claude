#!/usr/bin/env node
/**
 * framework-update.mjs — take a newer easy-claude framework into a project without losing the
 * project's own framework changes. `export-claude.mjs` installs a first copy; this updates it.
 * `.claude/skills/framework-update/scripts/update-from-upstream.mjs` downloads the upstream and runs
 * this engine; run the engine directly only when a local upstream checkout is at hand.
 *
 * Problem this solves: copying a new `.claude/` over a project replaces every file the project
 * changed (its toggled behaviors, its fixes) and deletes nothing it should, so each refresh
 * silently reverts project work. This tool merges instead, file by file, three ways:
 *   base     = the upstream version the project last took (`.claude/framework-lock.json`)
 *   upstream = the new upstream version (a committed ref by default)
 *   project  = the project's current file
 * and records the new base in the lock.
 *
 * Usage (Windows, macOS and Linux — Node and Git only; this file imports Node built-ins only, so it
 * can run from any folder):
 *   node .claude/scripts/framework-update.mjs <easy-claude-dir> [--ref=<rev>] [--working-tree]
 *        [--base=<rev>|auto] [--project=<dir>] [--source-url=<url>] [--dry-run] [--no-sync]
 *        [--record-only] [--allow-dirty-project] [--json]
 *   node .claude/scripts/framework-update.mjs --regenerate [--project=<dir>]
 *
 *   <easy-claude-dir>    an upstream checkout or bare clone; a blobless (partial) clone works, and the
 *                        files it needs are downloaded in batches.
 *   --ref=<rev>          upstream revision to take (default HEAD).
 *   --working-tree       take the upstream working tree, uncommitted files included. The lock then
 *                        records hashes only, so the next update compares by hash where it would
 *                        otherwise merge.
 *   --base=<rev>         upstream revision the project last took; required once, when the project
 *                        has no lock yet. `--base=auto` picks the upstream commit whose `.claude/`
 *                        matches the most project files, and reports how many matched.
 *   --project=<dir>      the project to update (default: the project holding this script).
 *   --source-url=<url>   upstream address recorded in the lock, so the next update knows where to look.
 *   --dry-run            report what would change; write nothing.
 *   --no-sync            skip the sync-codex pipeline at the end.
 *   --record-only        change no file: record the upstream version (--ref or --working-tree) as the
 *                        version this project now holds. Use it once after a sync made by hand, so the
 *                        next update merges from that version instead of an older --base.
 *   --allow-dirty-project  run although the project has uncommitted framework changes.
 *   --regenerate         merge nothing: rebuild the skill catalogs and every `.claude/` doc count, as the
 *                        update does at its end. Run it after moving or renaming skills while resolving.
 *
 * Per file under `.claude/` in the upstream tree:
 *   unchanged in the project      → take upstream (or delete it when upstream deleted it)
 *   changed only in the project   → keep the project's file
 *   changed on both sides         → `git merge-file`; a conflict keeps markers in the file
 *   both added, or no base text   → keep the project's file; upstream's copy goes to tmp/framework-update/
 * A file upstream never had (project skills, hooks, agents, ledgers, project protocols) is never merged,
 * moved or deleted; only its `<!-- COUNT -->` values are recomputed with every other doc's.
 * Text is compared with CRLF read as LF, so a Windows checkout does not look changed everywhere.
 * `<!-- COUNT:… -->` values (ADR-0002) in Markdown/HTML docs never conflict: they are compared and merged
 * as 0 and recomputed afterwards (any other file is compared and written byte for byte), and the generated catalogs are regenerated instead of merged.
 * The sync at the end regenerates `.agents/skills/` from `.claude/skills/` and keeps any entry it did not
 * generate. The tool removes the mirror of a framework skill the project no longer has (a sync from before
 * the mirror recorded its own entries would keep it) and lists any other entry with no source (a Codex-only
 * skill) as mirror-only. It skips the sync only for a mirror clash: a Codex-only skill whose name a
 * framework skill new in this update also uses, which the new skill's mirror would replace.
 *
 * Exit codes: 0 updated (or nothing to do) · 1 fatal · 2 something left to resolve (conflicts or
 * mirror clashes).
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

export const LOCK_PATH = '.claude/framework-lock.json';
const SCOPE = '.claude';
// Everything the update or its closing sync rewrites; uncommitted edits here would be lost.
const GUARDED = [SCOPE, '.agents', '.codex', '.opencode', 'AGENTS.md', 'opencode.json'];
const MIRROR_SKILLS = '.agents/skills';
// Files in `.agents/skills/` that have no `.claude/skills/` source but are no project content:
// the mirror sync's own marker and operating-system folder metadata.
const MIRROR_OWN = new Set(['.codex-mirror.json', '.DS_Store', 'Thumbs.db', 'desktop.ini']);
// Derived from the project's own skill set: regenerated after the update, never merged.
export const REGENERATED = new Set(['.claude/SKILLS.yaml', '.claude/scripts/skills_data.yaml']);
// Never taken from upstream: the lock itself and per-person files.
const NEVER_TAKEN = new Set([LOCK_PATH, '.claude/settings.local.json', '.claude/.ck.local.json']);
const COUNT_RE = /<!--\s*COUNT:([a-z][a-z0-9_-]*)(?::([a-z][a-z0-9_-]*))?\s*-->\d+<!--\s*\/COUNT\s*-->/g;
// Count markers are a documentation device (ADR-0002); a script or test that merely contains the
// marker text is code, compared and written byte for byte.
const COUNTED = /\.(md|html?)$/i;
// Object ids per `git fetch` call: keeps the command line under the Windows limit.
const FETCH_BATCH = 400;
const USAGE = 'Usage: node .claude/scripts/framework-update.mjs <easy-claude-dir> [--ref=<rev>] [--working-tree] [--base=<rev>|auto] [--project=<dir>] [--source-url=<url>] [--dry-run] [--no-sync] [--record-only] [--allow-dirty-project] [--json]\n       node .claude/scripts/framework-update.mjs --regenerate [--project=<dir>]';

function git(cwd, args, { input, allowFail = false } = {}) {
    const result = spawnSync('git', args, { cwd, input, maxBuffer: 1 << 30, windowsHide: true });
    if (result.error) throw new Error(`git is required: ${result.error.message}`);
    if (result.status !== 0 && !allowFail) throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${String(result.stderr).trim()}`);
    return result;
}
const lines = buffer => buffer.toString('utf8').split('\n').map(line => line.trim()).filter(Boolean);
const nulList = buffer => buffer.toString('utf8').split('\0').filter(Boolean);

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const isText = buffer => !buffer.includes(0);

/**
 * The bytes a comparison sees: text with CRLF read as LF, and in a doc every count marker read as 0,
 * so neither a Windows checkout nor a count that differs only because the inventories differ is a change.
 */
export function normalizeContent(buffer, file = 'doc.md') {
    if (buffer === null || !isText(buffer)) return buffer;
    const text = buffer.toString('utf8');
    let next = text.includes('\r\n') ? text.replace(/\r\n/g, '\n') : text;
    if (COUNTED.test(file)) next = next.replace(COUNT_RE, (_match, kind, filter) => `<!-- COUNT:${kind}${filter ? `:${filter}` : ''} -->0<!-- /COUNT -->`);
    return next === text ? buffer : Buffer.from(next, 'utf8');
}
const hasCounts = (buffer, file) => buffer !== null && COUNTED.test(file) && isText(buffer) && new RegExp(COUNT_RE.source).test(buffer.toString('utf8'));
const same = (a, b) => (a === null || b === null) ? a === b : a.equals(b);
const withLf = buffer => isText(buffer) && buffer.includes('\r\n') ? Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : buffer;
/** The id Git gives `buffer` as a blob, so project files compare with upstream tree entries without Git. */
const blobId = (buffer, format) => crypto.createHash(format).update(`blob ${buffer.length}\0`).update(buffer).digest('hex');

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

/** `path → blob id` for every file under `.claude/` in a commit. */
function treeIds(repo, rev) {
    const ids = new Map();
    for (const entry of nulList(git(repo, ['ls-tree', '-r', '-z', rev, '--', SCOPE]).stdout)) {
        const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/s.exec(entry);
        if (match) ids.set(match[2], match[1]);
    }
    return ids;
}

/** The remote a partial clone downloads missing objects from, or '' for a full clone. */
function promisorRemote(repo) {
    // Older Git names it in extensions.partialclone; newer Git marks the remote with remote.<name>.promisor.
    const named = lines(git(repo, ['config', '--get', 'extensions.partialclone'], { allowFail: true }).stdout)[0];
    if (named) return named;
    const marked = lines(git(repo, ['config', '--get-regexp', '^remote\\..+\\.promisor$'], { allowFail: true }).stdout)
        .map(line => /^remote\.(.+)\.promisor\s+true$/i.exec(line)).find(Boolean);
    return marked ? marked[1] : '';
}

/**
 * In a blobless (partial) clone, download every `.claude/` blob the given commits lack, in a few
 * requests. Reading them one by one would make Git fetch each file separately, which takes minutes.
 * Returns the number of blobs fetched.
 */
export function prefetchBlobs(repo, revs) {
    const remote = promisorRemote(repo);
    if (!remote || !revs.length) return 0;
    const wanted = new Set(revs.flatMap(rev => [...treeIds(repo, rev).values()]));
    // `--missing=print` lists absent objects without fetching them; a path filter would drop the commits.
    const missing = [...new Set(lines(git(repo, ['rev-list', '--objects', '--missing=print', '--no-walk', ...revs]).stdout)
        .filter(line => line.startsWith('?')).map(line => line.slice(1)).filter(id => wanted.has(id)))];
    for (let start = 0; start < missing.length; start += FETCH_BATCH) {
        git(repo, ['-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--quiet', '--no-tags', '--no-write-fetch-head',
            '--filter=blob:none', remote, ...missing.slice(start, start + FETCH_BATCH)]);
    }
    return missing.length;
}

/** Every file under `.claude/` the project has, tracked or not, ignored files excluded. */
function projectFiles(project) {
    return nulList(git(project, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', SCOPE]).stdout)
        .filter(p => { const file = path.join(project, p); return fs.existsSync(file) && fs.statSync(file).isFile(); });
}

/**
 * For a project that has no lock: the upstream commit (one that changed `.claude/`) whose files match the
 * most project files by content. A tie goes to the older commit: merging from a base that is too old
 * repeats changes the project already has, which merge identically, while a base that is too new would
 * read the project's older lines as deliberate edits.
 */
export function detectBase({ project, upstream, ref = 'HEAD' }) {
    const files = projectFiles(project).filter(p => !NEVER_TAKEN.has(p));
    const format = lines(git(upstream, ['rev-parse', '--show-object-format'], { allowFail: true }).stdout)[0] === 'sha256' ? 'sha256' : 'sha1';
    // Hashed as upstream stores them (LF), so files committed or checked out with CRLF still match.
    const mine = new Map(files.map(p => [p, blobId(withLf(readProject(project, p)), format)]));
    let best = null;
    const commits = lines(git(upstream, ['rev-list', ref, '--', SCOPE]).stdout);
    for (const commit of commits) {
        const ids = treeIds(upstream, commit);
        let matched = 0;
        for (const [p, id] of ids) if (mine.get(p) === id) matched += 1;
        if (!best || matched >= best.matched) best = { commit, matched, upstreamFiles: ids.size };
    }
    if (!best || !best.matched) throw new Error(`No upstream commit shares a file with this project's ${SCOPE}/; pass --base=<upstream commit> instead.`);
    return { ...best, projectFiles: files.length, candidates: commits.length };
}

function upstreamFiles(upstream, { ref, workingTree }) {
    if (workingTree) {
        const listed = nulList(git(upstream, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', SCOPE]).stdout);
        const files = new Map();
        for (const p of [...new Set(listed)]) {
            const file = path.join(upstream, p);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) files.set(p, fs.readFileSync(file));
        }
        return files;
    }
    return readBlobs(upstream, ref, [...treeIds(upstream, ref).keys()]);
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
        // A user's merge.conflictStyle (diff3, zdiff3) would add a base section the merge guide does not describe.
        // `--no-diff3` wins over the config; `-c merge.conflictStyle=merge` does not.
        const result = git(dir, ['merge-file', '-p', '--no-diff3', '-L', 'project', '-L', 'base', '-L', 'upstream', o, b, t], { allowFail: true });
        if (result.status < 0 || result.status > 127) throw new Error(`git merge-file failed: ${String(result.stderr).trim()}`);
        return { merged: result.stdout, conflicts: result.status };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function resolveCommit(repo, rev) {
    const result = git(repo, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { allowFail: true });
    const commit = result.status === 0 ? result.stdout.toString('utf8').trim() : '';
    if (!commit) throw new Error(`${rev} is not a commit in ${repo}`);
    return commit;
}

function buildLock(upstream, theirs, { ref, workingTree, sourceUrl, previous }) {
    const files = {};
    for (const [p, buffer] of theirs) if (!NEVER_TAKEN.has(p)) files[p] = sha256(normalizeContent(buffer, p));
    const urlValue = sourceUrl || previous?.source?.url;
    return { schemaVersion: 1, source: { commit: workingTree ? null : resolveCommit(upstream, ref), ref: workingTree ? null : ref, workingTree: !!workingTree,
        ...(workingTree ? { headCommit: git(upstream, ['rev-parse', 'HEAD']).stdout.toString('utf8').trim() } : {}),
        ...(urlValue ? { url: urlValue } : {}) }, files };
}

const readLock = project => fs.existsSync(path.join(project, LOCK_PATH)) ? JSON.parse(fs.readFileSync(path.join(project, LOCK_PATH), 'utf8')) : null;

/** Top-level `.claude/skills/` entry names among framework paths. */
const frameworkSkillNames = frameworkPaths => [...new Set([...frameworkPaths]
    .filter(p => p.startsWith(`${SCOPE}/skills/`)).map(p => p.split('/')[2]))].sort();

/**
 * `.agents/skills/` entries that are the project's own: neither a project skill source nor a name the
 * framework ships, had at the base, or listed in the lock. The sync keeps them, but no other host gets
 * them, so the user decides where each belongs.
 */
function mirrorOnlySkills(project, frameworkPaths) {
    const mirror = path.join(project, MIRROR_SKILLS);
    if (!fs.existsSync(mirror)) return [];
    const sources = path.join(project, SCOPE, 'skills');
    const known = new Set([...(fs.existsSync(sources) ? fs.readdirSync(sources) : []), ...frameworkSkillNames(frameworkPaths)]);
    return fs.readdirSync(mirror).filter(name => !known.has(name) && !MIRROR_OWN.has(name)).sort().map(name => `${MIRROR_SKILLS}/${name}`);
}

/**
 * Codex-only `.agents/skills/` entries whose name a framework skill new in this update (`addedSkills`) also
 * uses: the closing sync would replace each with that skill's mirror. A project that also has a
 * `.claude/skills/` source of that name is not listed; the two skills meet in `.claude/`, where the merge
 * settles them.
 */
function mirrorClashes(project, addedSkills) {
    const mirror = path.join(project, MIRROR_SKILLS);
    if (!fs.existsSync(mirror)) return [];
    const added = new Set(addedSkills);
    return fs.readdirSync(mirror).filter(name => added.has(name) && !fs.existsSync(path.join(project, SCOPE, 'skills', name)))
        .sort().map(name => `${MIRROR_SKILLS}/${name}`);
}

/**
 * `.agents/skills/` entries mirroring a framework skill the project no longer has after the merge (upstream
 * retired it, or the project removed it). A sync from before the mirror recorded its own entries cannot tell
 * them from the project's Codex-only skills and keeps both, so the update removes these itself.
 */
function retiredFrameworkMirrors(project, frameworkSkills) {
    const mirror = path.join(project, MIRROR_SKILLS);
    if (!fs.existsSync(mirror)) return [];
    // Never through a link that leads out of the project: Git cannot see or restore what lies behind it.
    const [root, real] = [fs.realpathSync(project), fs.realpathSync(mirror)];
    if (real !== root && !real.startsWith(root + path.sep)) return [];
    const framework = new Set(frameworkSkills);
    return fs.readdirSync(mirror).filter(name => framework.has(name) && !MIRROR_OWN.has(name)
        && !fs.existsSync(path.join(project, SCOPE, 'skills', name))).sort();
}

/**
 * Decide every file's action. Pure apart from reading the two trees (and downloading missing blobs
 * into a partial clone): nothing in the project is written here.
 * Each action: { path, kind, content? } with kind one of
 * take | delete | merge | keep | conflict | conflict-side | skip-regenerated | same
 */
export function planUpdate({ project, upstream, ref = 'HEAD', workingTree = false, base, sourceUrl }) {
    const lock = readLock(project);
    if (!lock && !base) throw new Error(`No ${LOCK_PATH} yet: pass --base=<upstream commit this project last took> once, or --base=auto to find it.`);
    const resolvedRef = workingTree ? null : resolveCommit(upstream, ref);
    const baseDetection = base === 'auto' ? detectBase({ project, upstream, ref: workingTree ? 'HEAD' : resolvedRef }) : null;
    const baseRev = baseDetection?.commit || base || (lock && !lock.source?.workingTree ? lock.source?.commit : undefined);
    const resolvedBase = baseRev ? resolveCommit(upstream, baseRev) : null;
    const warnings = [];
    try { prefetchBlobs(upstream, [resolvedRef, resolvedBase].filter(Boolean)); } catch (error) {
        // Git older than 2.29 cannot batch; reading still works, one download per file.
        warnings.push(`Batched download failed, so Git fetches each file separately (slow): ${error.message.split('\n')[0]}`);
    }
    const theirs = upstreamFiles(upstream, { ref: resolvedRef, workingTree });
    // The base tree too: a file upstream deleted since the base exists in neither the new tree nor a first lock.
    const basePaths = resolvedBase ? [...treeIds(upstream, resolvedBase).keys()] : [];
    const frameworkPaths = new Set([...theirs.keys(), ...Object.keys(lock?.files || {}), ...basePaths]);
    const paths = [...frameworkPaths].filter(p => !NEVER_TAKEN.has(p)).sort();
    const baseBlobs = resolvedBase ? readBlobs(upstream, resolvedBase, paths) : new Map();
    const actions = [];
    for (const p of paths) {
        const up = theirs.get(p) ?? null;
        const mine = readProject(project, p);
        if (REGENERATED.has(p)) { actions.push({ path: p, kind: 'skip-regenerated' }); continue; }
        const [nUp, nMine] = [normalizeContent(up, p), normalizeContent(mine, p)];
        // Base text when the lock names a commit; otherwise only the hash taken last time.
        const baseText = resolvedBase ? normalizeContent(baseBlobs.get(p) ?? null, p) : undefined;
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
    const projectOnly = projectFiles(project).filter(p => !frameworkPaths.has(p) && !NEVER_TAKEN.has(p)).sort();
    const nextLock = buildLock(upstream, theirs, { ref: resolvedRef, workingTree, sourceUrl, previous: lock });
    if (!workingTree) nextLock.source.ref = ref;
    // A skill is new in this update when neither the base nor the lock had it.
    const previousSkills = new Set(frameworkSkillNames([...basePaths, ...Object.keys(lock?.files || {})]));
    const addedSkills = frameworkSkillNames(theirs.keys()).filter(name => !previousSkills.has(name));
    return { actions, nextLock, base: resolvedBase, baseDetection, firstLock: !lock, projectOnly,
        mirrorOnly: mirrorOnlySkills(project, frameworkPaths), mirrorClashes: mirrorClashes(project, addedSkills),
        frameworkSkills: frameworkSkillNames(frameworkPaths), warnings };
}

function python() {
    for (const [cmd, args] of [['python3', []], ['py', ['-3']], ['python', []]]) {
        if (spawnSync(cmd, [...args, '--version'], { windowsHide: true }).status === 0) return [cmd, args];
    }
    return null;
}

/**
 * Refuse a plan that would write or delete through a symlink leading out of the project. Git sees
 * only the link, so such a change would escape both the uncommitted-changes check and `git restore`.
 * A file is judged by where it resolves when it is written (the file itself when it exists), and by
 * its folder when it is deleted (removing a link never touches its target).
 */
export function assertInsideProject(project, plan) {
    const root = fs.realpathSync(project);
    const present = file => { try { fs.lstatSync(file); return true; } catch { return false; } };
    const resolves = target => {
        let probe = target;
        while (!present(probe)) probe = path.dirname(probe);
        let real;
        try { real = fs.realpathSync(probe); } catch { return false; }  // a dangling link: its target is unknown
        return real === root || real.startsWith(root + path.sep);
    };
    const targets = plan.actions.filter(a => ['take', 'merge', 'conflict', 'delete'].includes(a.kind))
        .map(a => ({ path: a.path, file: path.join(project, a.path), del: a.kind === 'delete' }))
        .concat([{ path: LOCK_PATH, file: path.join(project, LOCK_PATH), del: false }]);
    const outside = targets.filter(t => !resolves(t.del ? path.dirname(t.file) : t.file)).map(t => t.path);
    if (outside.length) {
        throw new Error(`Refusing to update: ${outside.length} path(s) lead outside the project through a symlink, for example ${outside.slice(0, 3).join(', ')}. Replace the link with a real folder (or update the linked folder's own repository), then rerun.`);
    }
}

/**
 * Rebuild what derives from the project's own skill set: the skill catalogs and the count markers in
 * every `.claude/` doc. Every doc, not only the ones the update wrote: the project's skills, and any it
 * moves or renames while resolving, change the totals of docs the update left as they were.
 * Returns follow-up lines for anything that could not be rebuilt.
 */
export function regenerate(project) {
    const py = python();
    if (!py) return ['Python 3 not found: regenerate catalogs and counts with .claude/scripts/scan_skills.py and generate_catalogs.py.'];
    const [cmd, args] = py;
    const scripts = path.join(project, SCOPE, 'scripts');
    const failed = [];
    const run = (script, extra) => {
        if (!fs.existsSync(path.join(scripts, script))) return;
        const result = spawnSync(cmd, [...args, path.join(scripts, script), ...extra], { cwd: project, encoding: 'utf8', windowsHide: true });
        if (result.status !== 0) failed.push(`${script} ${extra.join(' ')}`.trim());
    };
    run('scan_skills.py', []);
    run('generate_catalogs.py', ['--skills', '--output', '.claude/SKILLS.yaml']);
    for (const p of projectFiles(project)) if (hasCounts(readProject(project, p), p)) run('generate_catalogs.py', ['--inject-counts', p]);
    return failed.length ? [`Regeneration failed for: ${failed.join('; ')}. Rerun: node .claude/scripts/framework-update.mjs --regenerate`] : [];
}

/**
 * Remove the folders a deletion emptied, up to but never including `.claude/`. A leftover empty skill
 * folder would still be listed as a skill by tools that walk `.claude/skills/`.
 */
function removeEmptyParents(project, file) {
    const stop = path.join(project, SCOPE);
    for (let dir = path.dirname(file); dir.startsWith(stop + path.sep); dir = path.dirname(dir)) {
        if (!fs.existsSync(dir) || fs.readdirSync(dir).length) return;
        fs.rmdirSync(dir);
    }
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
            removeEmptyParents(project, file);
            written.push(action.path);
        } else if (action.kind === 'conflict-side' && action.content) {
            const side = path.join(project, 'tmp', 'framework-update', action.path);
            fs.mkdirSync(path.dirname(side), { recursive: true });
            fs.writeFileSync(side, action.content);
        }
    }
    const removedMirrors = retiredFrameworkMirrors(project, plan.frameworkSkills);
    for (const name of removedMirrors) fs.rmSync(path.join(project, MIRROR_SKILLS, name), { recursive: true, force: true });
    fs.writeFileSync(path.join(project, LOCK_PATH), `${JSON.stringify(plan.nextLock, null, 2)}\n`);
    const followUps = regenerate(project);
    if (removedMirrors.length) followUps.push(`Removed the mirror of ${removedMirrors.length} framework skill(s) the project no longer has: ${removedMirrors.map(name => `${MIRROR_SKILLS}/${name}`).join(', ')}.`);
    const conflicts = plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side');
    const blocked = conflicts.length || plan.mirrorClashes.length;
    if (sync && !blocked) {
        const result = spawnSync(process.execPath, [path.join(project, '.claude/skills/sync-codex/scripts/run-codex-sync.mjs')],
            { cwd: project, stdio: 'inherit', windowsHide: true });
        followUps.push(result.status === 0 ? 'sync-codex passed.' : `sync-codex failed (exit ${result.status}); fix it before committing.`);
    } else if (blocked) {
        for (const entry of plan.mirrorClashes) {
            followUps.push(`Sync skipped: upstream now ships ${SCOPE}/skills/${path.basename(entry)}, whose mirror would replace the Codex-only ${entry}. Rename that skill (its folder and the name in its SKILL.md), or remove it to take upstream's.`);
        }
        followUps.push(`${conflicts.length ? 'Resolve the conflicts, then run' : 'Then run'}: node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`);
    }
    return { written, followUps, removedMirrors: removedMirrors.map(name => `${MIRROR_SKILLS}/${name}`) };
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
        else if (arg === '--regenerate') options.regenerate = true;
        else if (arg.startsWith('--ref=')) options.ref = arg.slice(6);
        else if (arg.startsWith('--base=')) options.base = arg.slice(7);
        else if (arg.startsWith('--project=')) options.project = arg.slice(10);
        else if (arg.startsWith('--source-url=')) options.sourceUrl = arg.slice(13);
        else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}\n${USAGE}`);
        else positional.push(arg);
    }
    if (options.regenerate ? positional.length : positional.length !== 1 || (options.workingTree && options.ref !== 'HEAD')) throw new Error(USAGE);
    for (const value of [options.ref, options.base, options.project, options.sourceUrl]) if (value !== undefined && (!value || value.startsWith('-'))) throw new Error(USAGE);
    return { upstream: positional.length ? path.resolve(positional[0]) : null, ...options };
}

function assertUpstream(options) {
    if (options.workingTree) {
        if (!fs.existsSync(path.join(options.upstream, SCOPE))) throw new Error(`No ${SCOPE}/ in ${options.upstream}`);
        return;
    }
    if (!fs.existsSync(options.upstream)) throw new Error(`No upstream repository at ${options.upstream}`);
    resolveCommit(options.upstream, options.ref);
    if (!git(options.upstream, ['ls-tree', '--name-only', options.ref, '--', SCOPE]).stdout.length) throw new Error(`No ${SCOPE}/ at ${options.ref} in ${options.upstream}`);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function main(argv = process.argv.slice(2), defaultProject = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..')) {
    const options = parseArgs(argv);
    const project = options.project ? path.resolve(options.project) : defaultProject;
    if (options.regenerate) {
        const followUps = regenerate(project);
        process.stdout.write(followUps.length ? followUps.map(line => `${line}\n`).join('') : 'Regenerated the skill catalogs and the .claude/ doc counts.\n');
        return followUps.length ? 1 : 0;
    }
    assertUpstream(options);
    if (fs.realpathSync(options.upstream) === fs.realpathSync(project)) throw new Error('The upstream directory is this project.');
    if (!options.allowDirtyProject && git(project, ['status', '--porcelain', '--', ...GUARDED]).stdout.length) {
        throw new Error(`The project has uncommitted changes in ${GUARDED.join(', ')}; commit or stash them first so the update is one reviewable diff (or pass --allow-dirty-project).`);
    }
    if (options.recordOnly) {
        if (!options.workingTree) {
            try { prefetchBlobs(options.upstream, [resolveCommit(options.upstream, options.ref)]); } catch (error) {
                process.stderr.write(`WARNING Batched download failed, so Git fetches each file separately (slow): ${error.message.split('\n')[0]}\n`);
            }
        }
        const lock = buildLock(options.upstream, upstreamFiles(options.upstream, { ref: options.ref, workingTree: options.workingTree }),
            { ref: options.ref, workingTree: options.workingTree, sourceUrl: options.sourceUrl, previous: readLock(project) });
        const count = Object.keys(lock.files).length;
        if (!options.dryRun) fs.writeFileSync(path.join(project, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`);
        process.stdout.write(`${options.dryRun ? '[dry run] ' : ''}Recorded ${count} framework files at ${lock.source.commit ? lock.source.commit.slice(0, 10) : 'the upstream working tree'} in ${LOCK_PATH}; no other file changed.\n`);
        return 0;
    }
    const plan = planUpdate({ project, upstream: options.upstream, ref: options.ref, workingTree: options.workingTree, base: options.base, sourceUrl: options.sourceUrl });
    assertInsideProject(project, plan);
    const count = kind => plan.actions.filter(a => a.kind === kind).length;
    const summary = { base: plan.base, baseDetection: plan.baseDetection, upstream: plan.nextLock.source, firstLock: plan.firstLock,
        taken: count('take'), deleted: count('delete'), merged: count('merge'), kept: count('keep'), unchanged: count('same'),
        regenerated: count('skip-regenerated'),
        conflicts: plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side')
            .map(a => ({ path: a.path, kind: a.kind, ...(a.reason ? { reason: a.reason } : {}), ...(a.conflicts ? { hunks: a.conflicts } : {}) })),
        mirrorOnly: plan.mirrorOnly, mirrorClashes: plan.mirrorClashes, projectOnly: plan.projectOnly, warnings: plan.warnings };
    let result = { written: [], followUps: [] };
    if (!options.dryRun) result = applyUpdate(project, plan, { sync: options.sync });
    if (options.json) process.stdout.write(`${JSON.stringify({ ...summary, dryRun: options.dryRun, ...result }, null, 2)}\n`);
    else {
        const detection = plan.baseDetection;
        const describe = c => c.kind === 'conflict-side' ? `${c.reason}; upstream copy in tmp/framework-update/${c.path}`
            : `${plural(c.hunks, 'hunk')} marked in the file`;
        process.stdout.write(`${options.dryRun ? '[dry run] ' : ''}Framework update from ${plan.base ? plan.base.slice(0, 10) : 'the locked hashes'} to ${options.workingTree ? 'the upstream working tree' : plan.nextLock.source.commit.slice(0, 10)}\n` +
            (detection ? `base found by content: ${detection.matched} of ${detection.projectFiles} project files match ${detection.commit.slice(0, 10)} (${detection.candidates} commits compared)\n` : '') +
            `taken ${summary.taken} · deleted ${summary.deleted} · merged ${summary.merged} · kept project changes ${summary.kept} · unchanged ${summary.unchanged} · regenerated ${summary.regenerated}\n` +
            `project-only files left as they are: ${summary.projectOnly.length}\n` +
            summary.warnings.map(line => `WARNING ${line}\n`).join('') +
            summary.conflicts.map(c => `CONFLICT ${c.path} (${describe(c)})\n`).join('') +
            summary.mirrorOnly.map(p => `MIRROR-ONLY ${p} (no .claude/skills source; the sync keeps it, but no other host gets it)\n`).join('') +
            summary.mirrorClashes.map(p => `MIRROR-CLASH ${p} (upstream now ships a skill of this name; its mirror would replace this Codex-only skill)\n`).join('') +
            result.followUps.map(line => `${line}\n`).join(''));
    }
    return (summary.conflicts.length || summary.mirrorClashes.length) ? 2 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(url.fileURLToPath(import.meta.url))) {
    try { process.exitCode = main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
