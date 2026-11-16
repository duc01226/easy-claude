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
 *   node .claude/scripts/framework-update.mjs --list-upgrades [--project=<dir>] [--dry-run] [--json]
 *   node .claude/scripts/framework-update.mjs --mark=<id> --status=<status> [--reason=<text>] [--project=<dir>]
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
 *   --list-upgrades      merge nothing: print the upgrade actions and notices this project has not yet
 *                        resolved (the NEXT block), after running their applicability and done checks.
 *   --mark=<id>          merge nothing: record what happened to one upgrade entry. --status is done,
 *                        not-applicable, declined or failed; every status but done needs --reason.
 *
 * Upgrade entries. Each consumer-facing change upstream ships `.claude/upgrades/actions/<id>.md`: an
 * `action` (steps the project's agent runs, with consent where a step says so) or a `notice` (something
 * to tell the user). The lock records each entry the project resolved (`upgrades`), so the entries still
 * pending are the target version's ids minus the resolved ones, whatever the base: a project already
 * current, a record-only run and a working-tree lock all list the same. A project's first update (no
 * lock) resolves the entries its base already had as not applicable. Every update ends with a NEXT block
 * naming the pending entries; when conflicts stop the update it names only how many there are, the merge
 * notes of each conflicted file and the command that lists them once the conflicts are resolved.
 * The parser lives in this file because the wrapper copies this one file alone to run it.
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
export const UPGRADES_DIR = '.claude/upgrades/actions';
const UPGRADE_FILE = /^\.claude\/upgrades\/actions\/([a-z0-9][a-z0-9-]*)\.md$/;
const UPGRADES_REFERENCE = '.claude/skills/framework-update/references/upgrade-actions.md';
const ENGINE_COMMAND = 'node .claude/scripts/framework-update.mjs';
export const UPGRADE_STATUSES = ['done', 'not-applicable', 'declined', 'failed'];
// `failed` is recorded with its reason but stays pending, so the next run retries it.
const RESOLVED = new Set(['done', 'not-applicable', 'declined']);
const UPGRADE_LEVELS = ['required', 'recommended', 'optional'];
/** `surface@hash`: what an entry or waiver covers. Shared with the upstream contract check. */
export const UPGRADE_COVER_RE = /^[a-z][a-z-]*(?::[A-Za-z0-9._-]+)?@(?:[0-9a-f]{12}|absent)$/;
// An applicability check exits 0 when the action applies and exactly this code when it does not. Any other
// result (a crash exits 1, a git error 128) settles nothing, so a broken check never drops a required action.
export const NOT_APPLICABLE_EXIT = 3;
const UPGRADE_FIELDS = {
    common: ['id', 'kind', 'title', 'added', 'covers', 'mergeNotes'],
    action: ['level', 'after', 'applies', 'done', 'writesState']
};
// A check that hangs must not hang the update: it is reported as not run, and the entry stays pending.
const CHECK_TIMEOUT_MS = 30000;
const USAGE =
    'Usage: node .claude/scripts/framework-update.mjs <easy-claude-dir> [--ref=<rev>] [--working-tree] [--base=<rev>|auto] [--project=<dir>] [--source-url=<url>] [--dry-run] [--no-sync] [--record-only] [--allow-dirty-project] [--json]\n       node .claude/scripts/framework-update.mjs --regenerate [--project=<dir>]\n       node .claude/scripts/framework-update.mjs --list-upgrades [--project=<dir>] [--dry-run] [--json]\n       node .claude/scripts/framework-update.mjs --mark=<id> --status=done|not-applicable|declined|failed [--reason=<text>] [--project=<dir>]';

function git(cwd, args, { input, allowFail = false } = {}) {
    const result = spawnSync('git', args, { cwd, input, maxBuffer: 1 << 30, windowsHide: true });
    if (result.error) throw new Error(`git is required: ${result.error.message}`);
    if (result.status !== 0 && !allowFail) throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${String(result.stderr).trim()}`);
    return result;
}
const lines = buffer =>
    buffer
        .toString('utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
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
const same = (a, b) => (a === null || b === null ? a === b : a.equals(b));
const withLf = buffer => (isText(buffer) && buffer.includes('\r\n') ? Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : buffer);
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
        if (header.endsWith(' missing')) {
            out.set(p, null);
            continue;
        }
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
        .map(line => /^remote\.(.+)\.promisor\s+true$/i.exec(line))
        .find(Boolean);
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
    const missing = [
        ...new Set(
            lines(git(repo, ['rev-list', '--objects', '--missing=print', '--no-walk', ...revs]).stdout)
                .filter(line => line.startsWith('?'))
                .map(line => line.slice(1))
                .filter(id => wanted.has(id))
        )
    ];
    for (let start = 0; start < missing.length; start += FETCH_BATCH) {
        git(repo, [
            '-c',
            'fetch.negotiationAlgorithm=noop',
            'fetch',
            '--quiet',
            '--no-tags',
            '--no-write-fetch-head',
            '--filter=blob:none',
            remote,
            ...missing.slice(start, start + FETCH_BATCH)
        ]);
    }
    return missing.length;
}

/** Every file under `.claude/` the project has, tracked or not, ignored files excluded. */
function projectFiles(project) {
    return nulList(git(project, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', SCOPE]).stdout).filter(p => {
        const file = path.join(project, p);
        return fs.existsSync(file) && fs.statSync(file).isFile();
    });
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
        fs.writeFileSync(o, ours);
        fs.writeFileSync(b, base);
        fs.writeFileSync(t, theirs);
        // A user's merge.conflictStyle (diff3, zdiff3) would add a base section the merge guide does not describe.
        // `--no-diff3` wins over the config; `-c merge.conflictStyle=merge` does not.
        const result = git(dir, ['merge-file', '-p', '--no-diff3', '-L', 'project', '-L', 'base', '-L', 'upstream', o, b, t], { allowFail: true });
        if (result.status < 0 || result.status > 127) throw new Error(`git merge-file failed: ${String(result.stderr).trim()}`);
        return { merged: result.stdout, conflicts: result.status };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
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
    return {
        schemaVersion: 1,
        source: {
            commit: workingTree ? null : resolveCommit(upstream, ref),
            ref: workingTree ? null : ref,
            workingTree: !!workingTree,
            ...(workingTree ? { headCommit: git(upstream, ['rev-parse', 'HEAD']).stdout.toString('utf8').trim() } : {}),
            ...(urlValue ? { url: urlValue } : {})
        },
        files
    };
}

const readLock = project => (fs.existsSync(path.join(project, LOCK_PATH)) ? JSON.parse(fs.readFileSync(path.join(project, LOCK_PATH), 'utf8')) : null);
const writeLock = (project, lock) => fs.writeFileSync(path.join(project, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`);

/**
 * Rewrite YAML single-quoted strings (`'it''s'`) as JSON strings, leaving double-quoted ones as they are. A
 * Markdown formatter set to single quotes writes frontmatter lists that way, so an entry saved through one
 * still reads.
 */
function singleQuotedToJson(text) {
    let out = '';
    for (let at = 0; at < text.length; at += 1) {
        if (text[at] === '"') {
            let end = at + 1;
            while (end < text.length && text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
            out += text.slice(at, end + 1);
            at = end;
        } else if (text[at] === "'") {
            let value = '';
            let end = at + 1;
            for (; end < text.length; end += 1) {
                if (text[end] !== "'") value += text[end];
                else if (text[end + 1] === "'") {
                    value += "'";
                    end += 1;
                } else break;
            }
            if (end >= text.length) return text; // unterminated: let JSON.parse name the error
            out += JSON.stringify(value);
            at = end;
        } else out += text[at];
    }
    return out;
}

/**
 * One frontmatter value: JSON when it opens like JSON (single-quoted strings allowed, as YAML has them), a
 * boolean, or the plain text.
 */
function frontmatterValue(raw, where) {
    const text = raw.trim();
    if (/^[[{"']/.test(text)) {
        try {
            return JSON.parse(singleQuotedToJson(text));
        } catch (error) {
            throw new Error(`${where}: the value is not valid JSON (${error.message})`, { cause: error });
        }
    }
    if (text === 'true' || text === 'false') return text === 'true';
    return text;
}

/**
 * The numbered items under `## Steps`. Each names the skill or command to run in backticks and ends with
 * `(consent: yes)` or `(consent: no)`, so the agent knows which steps it must ask the user about first.
 */
function upgradeSteps(body, file) {
    const section = /^## Steps[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body);
    if (!section) throw new Error(`${file}: an action needs a "## Steps" section`);
    const items = [];
    for (const line of section[1].split('\n')) {
        if (/^\d+\.\s/.test(line)) items.push(line.replace(/^\d+\.\s+/, '').trim());
        else if (/^\s+\S/.test(line) && items.length) items[items.length - 1] += ` ${line.trim()}`;
    }
    if (!items.length) throw new Error(`${file}: "## Steps" lists no numbered step`);
    return items.map((text, index) => {
        const consent = /\(consent: (yes|no)\)\.?$/.exec(text);
        if (!consent || !/`[^`]+`/.test(text)) {
            throw new Error(`${file}: step ${index + 1} must name its skill or command in backticks and end with (consent: yes) or (consent: no)`);
        }
        return { text, consent: consent[1] === 'yes' };
    });
}

/**
 * Parse one upgrade entry (`.claude/upgrades/actions/<id>.md`): frontmatter of `key: value` lines and
 * `  - item` lists (a value that opens with `[`, `{` or `"` is JSON), then a Markdown body. Throws on
 * anything else, naming the file and the field, so a broken entry is fixed upstream rather than guessed.
 */
export function parseUpgradeEntry(text, file = '<entry>') {
    const source = String(text).replace(/\r\n/g, '\n');
    const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(source);
    if (!match) throw new Error(`${file}: no frontmatter (a block between --- lines at the top)`);
    const fields = {};
    let list = null;
    const lines = match[1].split('\n');
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const where = `${file} frontmatter line ${index + 1}`;
        if (!line.trim() || /^\s*#/.test(line)) continue;
        const item = /^\s*-\s+(.*)$/.exec(line);
        if (item) {
            if (!list) throw new Error(`${where}: a list item with no list field above it`);
            fields[list].push(frontmatterValue(item[1], where));
            continue;
        }
        const pair = /^([A-Za-z][A-Za-z0-9]*):(?:[ \t]+(.*))?$/.exec(line);
        if (!pair) throw new Error(`${where}: expected "key: value" or "  - item"`);
        const [, key, value = ''] = pair;
        if (Object.hasOwn(fields, key)) throw new Error(`${where}: ${key} is set twice`);
        const next = lines.slice(index + 1).findIndex(text => text.trim()) + index + 1;
        if (!value.trim() && next > index && /^\s+[[{]/.test(lines[next])) {
            // A JSON list or object a formatter wrapped over indented lines: read it up to the next key.
            let end = next;
            while (end + 1 < lines.length && (/^\s/.test(lines[end + 1]) || !lines[end + 1].trim())) end += 1;
            // A wrapped YAML flow list ends its last item with a comma; drop only a comma that ends a line
            // right before the closing bracket, never one inside a value.
            const wrapped = lines.slice(next, end + 1).filter(text => text.trim());
            const joined = wrapped.map((text, at) => (/^\s*[\]}]/.test(wrapped[at + 1] || '') ? text.replace(/,\s*$/, '') : text)).join(' ');
            fields[key] = frontmatterValue(joined, where);
            list = null;
            index = end;
            continue;
        }
        list = value.trim() ? null : key;
        fields[key] = list ? [] : frontmatterValue(value, where);
    }
    const body = (match[2] || '').trim();
    const fail = message => {
        throw new Error(`${file}: ${message}`);
    };
    const kind = fields.kind;
    if (kind !== 'action' && kind !== 'notice') fail('kind must be action or notice');
    const allowed = new Set([...UPGRADE_FIELDS.common, ...(kind === 'action' ? UPGRADE_FIELDS.action : [])]);
    for (const key of Object.keys(fields)) if (!allowed.has(key)) fail(`${key} is not a field of ${kind === 'action' ? 'an action' : 'a notice'}`);
    const stem = /([^/\\]+)\.md$/.exec(file)?.[1];
    if (typeof fields.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(fields.id)) fail('id must be lowercase words joined by hyphens');
    if (stem && stem !== fields.id) fail(`id ${fields.id} must match the file name ${stem}.md`);
    if (typeof fields.title !== 'string' || !fields.title.trim()) fail('title must be one line of text');
    if (typeof fields.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fields.added) || Number.isNaN(Date.parse(fields.added)))
        fail('added must be a date, YYYY-MM-DD');
    const strings = (key, test, hint) => {
        const value = fields[key] ?? [];
        if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string' || !test(entry))) fail(`${key} must be a list of ${hint}`);
        return value;
    };
    const covers = strings('covers', entry => UPGRADE_COVER_RE.test(entry), 'surface@hash values');
    const mergeNotes = strings(
        'mergeNotes',
        // Each wildcard becomes a regex repeat; a few keep matching fast, many make it exponential.
        entry => /^\.claude\/\S+: \S/.test(entry) && entry.split(': ')[0].split('**').length <= 2 && (entry.split(': ')[0].match(/\*/g) || []).length <= 4,
        '".claude/<path or glob>: <what to keep>" lines, with at most one ** and four * in the path'
    ).map(entry => {
        const at = entry.indexOf(': ');
        return { path: entry.slice(0, at), note: entry.slice(at + 2) };
    });
    const entry = { id: fields.id, kind, title: fields.title.trim(), added: fields.added, covers, mergeNotes, after: [], body };
    if (kind === 'notice') {
        if (!body) fail('a notice needs a body: what to tell the user');
        return entry;
    }
    if (!UPGRADE_LEVELS.includes(fields.level)) fail(`level must be one of ${UPGRADE_LEVELS.join(', ')}`);
    entry.level = fields.level;
    entry.after = strings('after', id => /^[a-z0-9][a-z0-9-]*$/.test(id), 'entry ids');
    for (const key of ['applies', 'done']) {
        if (fields[key] === undefined) continue;
        const argv = fields[key];
        // node and git are the two programs every update already needs, on every operating system.
        if (!Array.isArray(argv) || !argv.length || argv.some(arg => typeof arg !== 'string') || !['node', 'git'].includes(argv[0])) {
            fail(`${key} must be an argv array that starts with "node" or "git", for example ["node", "-e", "..."]`);
        }
        entry[key] = argv;
    }
    if (fields.writesState !== undefined && typeof fields.writesState !== 'boolean') fail('writesState must be true or false');
    entry.writesState = fields.writesState === true;
    if (entry.writesState && !entry.done) fail('an action that writes state needs a done check, so a second run never redoes it');
    entry.steps = upgradeSteps(body, file);
    return entry;
}

/**
 * Every upgrade entry in a set of `.claude/` files (`path → Buffer`). An entry that cannot be read is kept,
 * marked with its error, so it is still listed rather than silently dropped.
 */
export function upgradeEntries(files) {
    const entries = [];
    for (const [p, buffer] of files) {
        const id = UPGRADE_FILE.exec(p)?.[1];
        if (!id || buffer === null) continue;
        try {
            entries.push({ ...parseUpgradeEntry(buffer.toString('utf8'), p), path: p });
        } catch (error) {
            entries.push({ id, kind: 'unreadable', title: '', added: '', covers: [], mergeNotes: [], after: [], path: p, error: error.message });
        }
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
}

/** The upgrade entries in the project's own `.claude/upgrades/actions/`. */
function projectUpgradeEntries(project) {
    const dir = path.join(project, UPGRADES_DIR);
    const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => name.endsWith('.md')) : [];
    return upgradeEntries(new Map(names.map(name => [`${UPGRADES_DIR}/${name}`, fs.readFileSync(path.join(dir, name))])));
}

/**
 * Entries in execution order: each after the entries its `after` names (when they are in the list), oldest
 * first among the rest. A cycle cannot be ordered; its entries follow the others, marked `cycle`.
 */
export function orderUpgrades(entries) {
    const byAge = (a, b) => (a.added === b.added ? a.id.localeCompare(b.id) : a.added < b.added ? -1 : 1);
    const ids = new Set(entries.map(entry => entry.id));
    const waiting = new Map(entries.map(entry => [entry.id, new Set(entry.after.filter(id => ids.has(id) && id !== entry.id))]));
    const ordered = [];
    let ready = entries.filter(entry => !waiting.get(entry.id).size).sort(byAge);
    while (ready.length) {
        const next = ready.shift();
        ordered.push(next);
        for (const entry of entries) {
            const deps = waiting.get(entry.id);
            if (deps.delete(next.id) && !deps.size) ready = [...ready, entry].sort(byAge);
        }
    }
    const placed = new Set(ordered.map(entry => entry.id));
    return [
        ...ordered,
        ...entries
            .filter(entry => !placed.has(entry.id))
            .sort(byAge)
            .map(entry => ({ ...entry, cycle: true }))
    ];
}

/** The entries the lock does not record as resolved, in execution order, each with what it still waits for. */
export function pendingUpgrades(entries, records = {}) {
    const pending = orderUpgrades(entries.filter(entry => !RESOLVED.has(records[entry.id]?.status)));
    const open = new Set(pending.map(entry => entry.id));
    return pending.map(entry => ({
        ...entry,
        waitsFor: entry.after.filter(id => open.has(id)),
        ...(records[entry.id]?.status === 'failed' ? { lastFailure: records[entry.id].reason } : {})
    }));
}

const today = () => new Date().toISOString().slice(0, 10);
const upgradeRecord = (status, reason) => ({ status, ...(reason ? { reason } : {}), date: today() });

/** Run one check argv in the project. `ran` is false when it could not run or ran out of time. */
function runUpgradeCheck(project, argv) {
    const [program, ...args] = argv;
    const result = spawnSync(program === 'node' ? process.execPath : program, args, {
        cwd: project,
        encoding: 'utf8',
        timeout: CHECK_TIMEOUT_MS,
        windowsHide: true
    });
    if (result.error) return { ran: false, detail: result.error.code === 'ETIMEDOUT' ? `timed out after ${CHECK_TIMEOUT_MS / 1000} s` : result.error.message };
    if (result.status === null) return { ran: false, detail: `stopped by ${result.signal}` };
    return { ran: true, status: result.status };
}

/**
 * Run the applicability and done checks of every pending action against the project as it is now (after
 * the update), and record what they settle in `records`: an action whose applicability check exits
 * NOT_APPLICABLE_EXIT is not applicable, and one whose done check passes is done, so a second run never redoes
 * it. Any other result settles nothing. An action is checked only once nothing it runs after is pending, so a
 * check never judges a project its prerequisite has not prepared yet. Returns what was recorded and the checks
 * that could not run.
 */
export function settleUpgradeChecks(project, entries, records) {
    const settled = [];
    const notRun = [];
    const checked = new Set();
    for (let next; (next = pendingUpgrades(entries, records).find(entry => entry.kind === 'action' && !entry.waitsFor.length && !checked.has(entry.id)));) {
        checked.add(next.id);
        for (const [key, settles] of [
            ['applies', check => (check.status === NOT_APPLICABLE_EXIT ? ['not-applicable', 'applicability check: does not apply'] : null)],
            ['done', check => (check.status === 0 ? ['done', 'done check passed'] : null)]
        ]) {
            if (!next[key]) continue;
            const check = runUpgradeCheck(project, next[key]);
            if (!check.ran || (key === 'applies' && ![0, NOT_APPLICABLE_EXIT].includes(check.status))) {
                notRun.push(`${next.id}: ${key} check did not run (${check.ran ? `exited ${check.status}` : check.detail})`);
                break;
            }
            const outcome = settles(check);
            if (outcome) {
                records[next.id] = upgradeRecord(...outcome);
                settled.push({ id: next.id, status: outcome[0], reason: outcome[1] });
                break;
            }
        }
    }
    return { settled, notRun };
}

/** Records for the entries a lockless project's base already had: that version was installed with them. */
function predatingRecords(baseIds, base) {
    return Object.fromEntries(baseIds.map(id => [id, upgradeRecord('not-applicable', `predates the base ${base.slice(0, 10)}`)]));
}

/** Upgrade ids in a commit's `.claude/` tree. */
function upgradeIdsAt(repo, rev) {
    return [...treeIds(repo, rev).keys()].map(p => UPGRADE_FILE.exec(p)?.[1]).filter(Boolean);
}

/** The lock's records for entries the target still ships; a record for a retired entry can never matter again. */
function carriedRecords(previous, entries) {
    const ids = new Set(entries.map(entry => entry.id));
    return Object.fromEntries(Object.entries(previous?.upgrades || {}).filter(([id]) => ids.has(id)));
}

// A merge-note path: `*` matches within one folder, `**/` any number of folders.
function globRe(glob) {
    const escaped = glob.replace(/[.+?^$(){}|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\*\*\/|\*\*|\*/g, token => (token === '**/' ? '(?:.*/)?' : token === '**' ? '.*' : '[^/]*'));
    return new RegExp('^' + pattern + '$');
}

/** The merge notes entries give for the conflicted paths. */
export function mergeNotesFor(entries, conflictPaths) {
    const notes = [];
    for (const p of conflictPaths) {
        for (const entry of entries) for (const note of entry.mergeNotes) if (globRe(note.path).test(p)) notes.push({ path: p, id: entry.id, note: note.note });
    }
    return notes;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const upgradeCount = n => (n === 1 ? '1 upgrade entry' : `${n} upgrade entries`);

/** The NEXT block: what the project's agent does once the files are in. Printed by the engine alone. */
export function renderNext(pending, { deferred = false, dryRun = false, notRun = [] } = {}) {
    if (!pending.length) return 'NEXT no upgrade actions or notices pending.\n';
    if (deferred) {
        return `NEXT ${upgradeCount(pending.length)} pending. After settling what stopped the update (conflicts or mirror clashes) and running the sync, list them with: ${ENGINE_COMMAND} --list-upgrades\n`;
    }
    const lines = [`NEXT ${upgradeCount(pending.length)} to handle, in this order. Read ${UPGRADES_REFERENCE} first, then each entry's file:`];
    for (const [index, entry] of pending.entries()) {
        const label = entry.kind === 'action' ? `action, ${entry.level}` : entry.kind === 'notice' ? 'notice' : 'cannot be read';
        lines.push(`  ${index + 1}. ${entry.id} [${label}] ${entry.title || entry.error} (${entry.path})`);
        if (entry.waitsFor?.length) lines.push(`     waits for: ${entry.waitsFor.join(', ')}`);
        if (entry.cycle) lines.push('     its "after" list forms a cycle; run it after the entries it names');
        if (entry.lastFailure) lines.push(`     last attempt failed: ${entry.lastFailure}`);
    }
    for (const line of notRun) lines.push(`  check not run: ${line}`);
    if (dryRun) lines.push('  (dry run: applicability and done checks run once the update is applied)');
    lines.push(`Record each one: ${ENGINE_COMMAND} --mark=<id> --status=done|not-applicable|declined|failed [--reason="<why>"]`);
    return `${lines.join('\n')}\n`;
}

/** The JSON shape of a pending entry. */
const pendingJson = entry => ({
    id: entry.id,
    kind: entry.kind,
    ...(entry.level ? { level: entry.level } : {}),
    title: entry.title,
    path: entry.path,
    waitsFor: entry.waitsFor || [],
    ...(entry.cycle ? { cycle: true } : {}),
    ...(entry.lastFailure ? { lastFailure: entry.lastFailure } : {}),
    ...(entry.error ? { error: entry.error } : {})
});

/** Top-level `.claude/skills/` entry names among framework paths. */
const frameworkSkillNames = frameworkPaths => [...new Set([...frameworkPaths].filter(p => p.startsWith(`${SCOPE}/skills/`)).map(p => p.split('/')[2]))].sort();

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
    return fs
        .readdirSync(mirror)
        .filter(name => !known.has(name) && !MIRROR_OWN.has(name))
        .sort()
        .map(name => `${MIRROR_SKILLS}/${name}`);
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
    return fs
        .readdirSync(mirror)
        .filter(name => added.has(name) && !fs.existsSync(path.join(project, SCOPE, 'skills', name)))
        .sort()
        .map(name => `${MIRROR_SKILLS}/${name}`);
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
    return fs
        .readdirSync(mirror)
        .filter(name => framework.has(name) && !MIRROR_OWN.has(name) && !fs.existsSync(path.join(project, SCOPE, 'skills', name)))
        .sort();
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
    try {
        prefetchBlobs(upstream, [resolvedRef, resolvedBase].filter(Boolean));
    } catch (error) {
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
        if (REGENERATED.has(p)) {
            actions.push({ path: p, kind: 'skip-regenerated' });
            continue;
        }
        const [nUp, nMine] = [normalizeContent(up, p), normalizeContent(mine, p)];
        // Base text when the lock names a commit; otherwise only the hash taken last time.
        const baseText = resolvedBase ? normalizeContent(baseBlobs.get(p) ?? null, p) : undefined;
        const baseHash = lock?.files?.[p];
        const isBase = buffer => (baseText !== undefined ? same(buffer, baseText) : buffer === null ? baseHash === undefined : sha256(buffer) === baseHash);
        if (same(nMine, nUp)) {
            actions.push({ path: p, kind: 'same', content: up });
            continue;
        }
        if (isBase(nMine)) {
            actions.push(up === null ? { path: p, kind: 'delete' } : { path: p, kind: 'take', content: up });
            continue;
        }
        if (isBase(nUp)) {
            actions.push({ path: p, kind: 'keep' });
            continue;
        }
        if (mine !== null && up !== null && baseText && isText(mine) && isText(up) && isText(baseText)) {
            const { merged, conflicts } = mergeFile(nMine, baseText, nUp);
            actions.push({ path: p, kind: conflicts ? 'conflict' : 'merge', content: merged, conflicts });
            continue;
        }
        // Added on both sides, deleted on one side and changed on the other, binary, or no base text.
        actions.push({
            path: p,
            kind: 'conflict-side',
            content: up,
            reason:
                mine === null
                    ? 'deleted in the project, changed upstream'
                    : up === null
                      ? 'changed in the project, deleted upstream'
                      : !baseText && baseHash === undefined
                        ? 'added on both sides'
                        : 'no base text to merge'
        });
    }
    const projectOnly = projectFiles(project)
        .filter(p => !frameworkPaths.has(p) && !NEVER_TAKEN.has(p))
        .sort();
    const nextLock = buildLock(upstream, theirs, { ref: resolvedRef, workingTree, sourceUrl, previous: lock });
    if (!workingTree) nextLock.source.ref = ref;
    const upgrades = upgradeEntries(theirs);
    nextLock.upgrades = carriedRecords(lock, upgrades);
    // A first update: the version the project installed already came with its base's entries.
    if (!lock) Object.assign(nextLock.upgrades, predatingRecords(upgradeIdsAt(upstream, resolvedBase), resolvedBase));
    // A skill is new in this update when neither the base nor the lock had it.
    const previousSkills = new Set(frameworkSkillNames([...basePaths, ...Object.keys(lock?.files || {})]));
    const addedSkills = frameworkSkillNames(theirs.keys()).filter(name => !previousSkills.has(name));
    return {
        actions,
        nextLock,
        base: resolvedBase,
        baseDetection,
        firstLock: !lock,
        projectOnly,
        mirrorOnly: mirrorOnlySkills(project, frameworkPaths),
        mirrorClashes: mirrorClashes(project, addedSkills),
        frameworkSkills: frameworkSkillNames(frameworkPaths),
        upgrades,
        warnings
    };
}

function python() {
    for (const [cmd, args] of [
        ['python3', []],
        ['py', ['-3']],
        ['python', []]
    ]) {
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
    const present = file => {
        try {
            fs.lstatSync(file);
            return true;
        } catch {
            return false;
        }
    };
    const resolves = target => {
        let probe = target;
        while (!present(probe)) probe = path.dirname(probe);
        let real;
        try {
            real = fs.realpathSync(probe);
        } catch {
            return false;
        } // a dangling link: its target is unknown
        return real === root || real.startsWith(root + path.sep);
    };
    const targets = plan.actions
        .filter(a => ['take', 'merge', 'conflict', 'delete'].includes(a.kind))
        .map(a => ({ path: a.path, file: path.join(project, a.path), del: a.kind === 'delete' }))
        .concat([{ path: LOCK_PATH, file: path.join(project, LOCK_PATH), del: false }]);
    const outside = targets.filter(t => !resolves(t.del ? path.dirname(t.file) : t.file)).map(t => t.path);
    if (outside.length) {
        throw new Error(
            `Refusing to update: ${outside.length} path(s) lead outside the project through a symlink, for example ${outside.slice(0, 3).join(', ')}. Replace the link with a real folder (or update the linked folder's own repository), then rerun.`
        );
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
    const conflicts = plan.actions.filter(a => a.kind === 'conflict' || a.kind === 'conflict-side');
    const blocked = conflicts.length || plan.mirrorClashes.length;
    writeLock(project, plan.nextLock);
    const followUps = regenerate(project);
    if (removedMirrors.length)
        followUps.push(
            `Removed the mirror of ${removedMirrors.length} framework skill(s) the project no longer has: ${removedMirrors.map(name => `${MIRROR_SKILLS}/${name}`).join(', ')}.`
        );
    if (sync && !blocked) {
        const result = spawnSync(process.execPath, [path.join(project, '.claude/skills/sync-codex/scripts/run-codex-sync.mjs')], {
            cwd: project,
            stdio: 'inherit',
            windowsHide: true
        });
        followUps.push(result.status === 0 ? 'sync-codex passed.' : `sync-codex failed (exit ${result.status}); fix it before committing.`);
    } else if (blocked) {
        for (const entry of plan.mirrorClashes) {
            followUps.push(
                `Sync skipped: upstream now ships ${SCOPE}/skills/${path.basename(entry)}, whose mirror would replace the Codex-only ${entry}. Rename that skill (its folder and the name in its SKILL.md), or remove it to take upstream's.`
            );
        }
        followUps.push(`${conflicts.length ? 'Resolve the conflicts, then run' : 'Then run'}: node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`);
    }
    // Checks judge the project as the update leaves it (merged, regenerated, and synced unless --no-sync); with something left to
    // resolve they wait for --list-upgrades.
    const upgradeChecks = blocked ? { settled: [], notRun: [] } : settleUpgradeChecks(project, plan.upgrades, plan.nextLock.upgrades);
    if (upgradeChecks.settled.length) writeLock(project, plan.nextLock);
    return { written, followUps, removedMirrors: removedMirrors.map(name => `${MIRROR_SKILLS}/${name}`), upgradeChecks };
}

function parseArgs(argv) {
    const options = {
        dryRun: false,
        sync: true,
        json: false,
        workingTree: false,
        allowDirtyProject: false,
        recordOnly: false,
        ref: 'HEAD'
    };
    const positional = [];
    for (const arg of argv) {
        if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--no-sync') options.sync = false;
        else if (arg === '--json') options.json = true;
        else if (arg === '--working-tree') options.workingTree = true;
        else if (arg === '--allow-dirty-project') options.allowDirtyProject = true;
        else if (arg === '--record-only') options.recordOnly = true;
        else if (arg === '--regenerate') options.regenerate = true;
        else if (arg === '--list-upgrades') options.listUpgrades = true;
        else if (arg.startsWith('--mark=')) options.mark = arg.slice(7);
        else if (arg.startsWith('--status=')) options.status = arg.slice(9);
        else if (arg.startsWith('--reason=')) options.reason = arg.slice(9).trim();
        else if (arg.startsWith('--ref=')) options.ref = arg.slice(6);
        else if (arg.startsWith('--base=')) options.base = arg.slice(7);
        else if (arg.startsWith('--project=')) options.project = arg.slice(10);
        else if (arg.startsWith('--source-url=')) options.sourceUrl = arg.slice(13);
        else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}\n${USAGE}`);
        else positional.push(arg);
    }
    if ((options.status !== undefined || options.reason !== undefined) && options.mark === undefined)
        throw new Error(`--status and --reason go with --mark=<id>\n${USAGE}`);
    // These read and write only the project: no upstream folder.
    const local = [options.regenerate, options.listUpgrades, options.mark !== undefined].filter(Boolean).length;
    if (local > 1 || (local ? positional.length : positional.length !== 1 || (options.workingTree && options.ref !== 'HEAD'))) throw new Error(USAGE);
    for (const value of [options.ref, options.base, options.project, options.sourceUrl, options.mark, options.status])
        if (value !== undefined && (!value || value.startsWith('-'))) throw new Error(USAGE);
    return {
        upstream: positional.length ? path.resolve(positional[0]) : null,
        ...options
    };
}

function assertUpstream(options) {
    if (options.workingTree) {
        if (!fs.existsSync(path.join(options.upstream, SCOPE))) throw new Error(`No ${SCOPE}/ in ${options.upstream}`);
        return;
    }
    if (!fs.existsSync(options.upstream)) throw new Error(`No upstream repository at ${options.upstream}`);
    resolveCommit(options.upstream, options.ref);
    if (!git(options.upstream, ['ls-tree', '--name-only', options.ref, '--', SCOPE]).stdout.length)
        throw new Error(`No ${SCOPE}/ at ${options.ref} in ${options.upstream}`);
}

function requireLock(project) {
    const lock = readLock(project);
    if (!lock) throw new Error(`No ${LOCK_PATH}: run a framework update first; its lock records which upgrade entries this project resolved.`);
    return lock;
}

/** The `upgrades` part of the JSON report. */
const upgradesJson = (pending, { settled = [], notRun = [], deferred = false, mergeNotes = [] } = {}) => ({
    pending: pending.map(pendingJson),
    settled,
    notRun,
    deferred,
    mergeNotes
});

/** `--list-upgrades`: run the checks of the pending entries, record what they settle, print the NEXT block. */
function listUpgrades(project, options) {
    const lock = requireLock(project);
    const entries = projectUpgradeEntries(project);
    const records = { ...(lock.upgrades || {}) };
    const checks = options.dryRun ? { settled: [], notRun: [] } : settleUpgradeChecks(project, entries, records);
    if (checks.settled.length) writeLock(project, { ...lock, upgrades: records });
    const pending = pendingUpgrades(entries, records);
    if (options.json) process.stdout.write(`${JSON.stringify({ dryRun: options.dryRun, upgrades: upgradesJson(pending, checks) }, null, 2)}\n`);
    else {
        process.stdout.write(
            checks.settled.map(item => `SETTLED ${item.id}: ${item.status} (${item.reason})\n`).join('') +
                renderNext(pending, { dryRun: options.dryRun, notRun: checks.notRun })
        );
    }
    return 0;
}

/** `--mark=<id>`: record the outcome of one upgrade entry in the lock. */
function markUpgrade(project, options) {
    const lock = requireLock(project);
    if (options.dryRun) throw new Error('--mark records an outcome in the lock; it has no dry run. List the pending entries with --list-upgrades --dry-run.');
    if (!UPGRADE_STATUSES.includes(options.status)) throw new Error(`--status must be one of ${UPGRADE_STATUSES.join(', ')}\n${USAGE}`);
    if (options.status !== 'done' && !options.reason) {
        throw new Error(`--status=${options.status} needs --reason="<why>": the next update shows it, so nobody has to guess why the entry was not done.`);
    }
    const entries = projectUpgradeEntries(project);
    const entry = entries.find(item => item.id === options.mark);
    if (!entry) throw new Error(`No upgrade entry ${options.mark} in ${UPGRADES_DIR}/. List the pending ones with: ${ENGINE_COMMAND} --list-upgrades`);
    const records = {
        ...(lock.upgrades || {}),
        [entry.id]: upgradeRecord(options.status, options.reason)
    };
    writeLock(project, { ...lock, upgrades: records });
    const pending = pendingUpgrades(entries, records);
    const waiting = options.status === 'done' ? entry.after.filter(id => pending.some(item => item.id === id)) : [];
    process.stdout.write(
        `Recorded ${entry.id}: ${options.status}${options.reason ? ` (${options.reason})` : ''}.\n` +
            (waiting.length ? `WARNING ${entry.id} runs after ${waiting.join(', ')}, which ${waiting.length === 1 ? 'is' : 'are'} still pending.\n` : '') +
            (pending.length ? `${upgradeCount(pending.length)} still pending: ${pending.map(item => item.id).join(', ')}.\n` : 'No upgrade entries pending.\n')
    );
    return 0;
}

/** `--record-only`: record the upstream version as the one the project holds, and list its pending entries. */
function recordOnly(project, options) {
    const previous = readLock(project);
    // Without a lock, only the version before the hand sync tells which entries are new to this project.
    if (!previous && (!options.base || options.base === 'auto')) {
        throw new Error(
            `No ${LOCK_PATH} yet: --record-only needs --base=<the upstream commit this project held before the hand sync>, so the upgrade entries added since then are listed rather than skipped. --base=auto cannot find it: the project already matches the new version.`
        );
    }
    if (!options.workingTree) {
        try {
            prefetchBlobs(options.upstream, [resolveCommit(options.upstream, options.ref)]);
        } catch (error) {
            process.stderr.write(`WARNING Batched download failed, so Git fetches each file separately (slow): ${error.message.split('\n')[0]}\n`);
        }
    }
    const files = upstreamFiles(options.upstream, {
        ref: options.ref,
        workingTree: options.workingTree
    });
    const lock = buildLock(options.upstream, files, {
        ref: options.ref,
        workingTree: options.workingTree,
        sourceUrl: options.sourceUrl,
        previous
    });
    const entries = upgradeEntries(files);
    lock.upgrades = carriedRecords(previous, entries);
    if (!previous) {
        const base = resolveCommit(options.upstream, options.base);
        Object.assign(lock.upgrades, predatingRecords(upgradeIdsAt(options.upstream, base), base));
    }
    const checks = options.dryRun ? { settled: [], notRun: [] } : settleUpgradeChecks(project, entries, lock.upgrades);
    if (!options.dryRun) writeLock(project, lock);
    const pending = pendingUpgrades(entries, lock.upgrades);
    const count = Object.keys(lock.files).length;
    if (options.json) {
        process.stdout.write(
            `${JSON.stringify({ dryRun: options.dryRun, recorded: count, upstream: lock.source, upgrades: upgradesJson(pending, checks) }, null, 2)}\n`
        );
    } else {
        process.stdout.write(
            `${options.dryRun ? '[dry run] ' : ''}Recorded ${count} framework files at ${lock.source.commit ? lock.source.commit.slice(0, 10) : 'the upstream working tree'} in ${LOCK_PATH}; no other file changed.\n` +
                checks.settled.map(item => `SETTLED ${item.id}: ${item.status} (${item.reason})\n`).join('') +
                renderNext(pending, { dryRun: options.dryRun, notRun: checks.notRun })
        );
    }
    return 0;
}

export function main(argv = process.argv.slice(2), defaultProject = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..')) {
    const options = parseArgs(argv);
    const project = options.project ? path.resolve(options.project) : defaultProject;
    if (options.regenerate) {
        const followUps = regenerate(project);
        process.stdout.write(followUps.length ? followUps.map(line => `${line}\n`).join('') : 'Regenerated the skill catalogs and the .claude/ doc counts.\n');
        return followUps.length ? 1 : 0;
    }
    if (options.listUpgrades) return listUpgrades(project, options);
    if (options.mark !== undefined) return markUpgrade(project, options);
    assertUpstream(options);
    if (fs.realpathSync(options.upstream) === fs.realpathSync(project)) throw new Error('The upstream directory is this project.');
    if (!options.allowDirtyProject && git(project, ['status', '--porcelain', '--', ...GUARDED]).stdout.length) {
        throw new Error(
            `The project has uncommitted changes in ${GUARDED.join(', ')}; commit or stash them first so the update is one reviewable diff (or pass --allow-dirty-project).`
        );
    }
    if (options.recordOnly) return recordOnly(project, options);
    const plan = planUpdate({
        project,
        upstream: options.upstream,
        ref: options.ref,
        workingTree: options.workingTree,
        base: options.base,
        sourceUrl: options.sourceUrl
    });
    assertInsideProject(project, plan);
    const count = kind => plan.actions.filter(a => a.kind === kind).length;
    const summary = {
        base: plan.base,
        baseDetection: plan.baseDetection,
        upstream: plan.nextLock.source,
        firstLock: plan.firstLock,
        taken: count('take'),
        deleted: count('delete'),
        merged: count('merge'),
        kept: count('keep'),
        unchanged: count('same'),
        regenerated: count('skip-regenerated'),
        conflicts: plan.actions
            .filter(a => a.kind === 'conflict' || a.kind === 'conflict-side')
            .map(a => ({
                path: a.path,
                kind: a.kind,
                ...(a.reason ? { reason: a.reason } : {}),
                ...(a.conflicts ? { hunks: a.conflicts } : {})
            })),
        mirrorOnly: plan.mirrorOnly,
        mirrorClashes: plan.mirrorClashes,
        projectOnly: plan.projectOnly,
        warnings: plan.warnings
    };
    let result = { written: [], followUps: [] };
    let checks = { settled: [], notRun: [] };
    if (!options.dryRun)
        ({ upgradeChecks: checks, ...result } = applyUpdate(project, plan, {
            sync: options.sync
        }));
    const blocked = summary.conflicts.length > 0 || summary.mirrorClashes.length > 0;
    const pending = pendingUpgrades(plan.upgrades, plan.nextLock.upgrades);
    const mergeNotes = mergeNotesFor(
        plan.upgrades,
        summary.conflicts.map(c => c.path)
    );
    // Until the conflicts are resolved the files are not final, so the list waits for --list-upgrades.
    const deferred = blocked && !options.dryRun;
    const upgrades = upgradesJson(pending, { ...checks, deferred, mergeNotes });
    if (options.json) process.stdout.write(`${JSON.stringify({ ...summary, dryRun: options.dryRun, ...result, upgrades }, null, 2)}\n`);
    else {
        const detection = plan.baseDetection;
        const describe = c =>
            c.kind === 'conflict-side' ? `${c.reason}; upstream copy in tmp/framework-update/${c.path}` : `${plural(c.hunks, 'hunk')} marked in the file`;
        process.stdout.write(
            `${options.dryRun ? '[dry run] ' : ''}Framework update from ${plan.base ? plan.base.slice(0, 10) : 'the locked hashes'} to ${options.workingTree ? 'the upstream working tree' : plan.nextLock.source.commit.slice(0, 10)}\n` +
                (detection
                    ? `base found by content: ${detection.matched} of ${detection.projectFiles} project files match ${detection.commit.slice(0, 10)} (${detection.candidates} commits compared)\n`
                    : '') +
                `taken ${summary.taken} · deleted ${summary.deleted} · merged ${summary.merged} · kept project changes ${summary.kept} · unchanged ${summary.unchanged} · regenerated ${summary.regenerated}\n` +
                `project-only files left as they are: ${summary.projectOnly.length}\n` +
                summary.warnings.map(line => `WARNING ${line}\n`).join('') +
                summary.conflicts.map(c => `CONFLICT ${c.path} (${describe(c)})\n`).join('') +
                summary.mirrorOnly.map(p => `MIRROR-ONLY ${p} (no .claude/skills source; the sync keeps it, but no other host gets it)\n`).join('') +
                summary.mirrorClashes
                    .map(p => `MIRROR-CLASH ${p} (upstream now ships a skill of this name; its mirror would replace this Codex-only skill)\n`)
                    .join('') +
                result.followUps.map(line => `${line}\n`).join('') +
                mergeNotes.map(note => `MERGE-NOTE ${note.path} (${note.id}): ${note.note}\n`).join('') +
                checks.settled.map(item => `SETTLED ${item.id}: ${item.status} (${item.reason})\n`).join('') +
                renderNext(pending, {
                    deferred,
                    dryRun: options.dryRun,
                    notRun: checks.notRun
                })
        );
    }
    return blocked ? 2 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(url.fileURLToPath(import.meta.url))) {
    try {
        process.exitCode = main();
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
