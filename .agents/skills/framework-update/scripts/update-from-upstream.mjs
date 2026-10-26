#!/usr/bin/env node
/**
 * update-from-upstream.mjs — bring the easy-claude framework in this project up to the upstream
 * version (default: the `main` branch of https://github.com/duc01226/easy-claude) by merging, never
 * by copying.
 *
 * Steps: keep a blobless clone of the upstream under `<project>/tmp/framework-update/upstream.git`
 * (cloned once, fetched on later runs), take the merge engine `.claude/scripts/framework-update.mjs`
 * from the upstream version being installed (so a project with an old or missing engine still merges
 * with the newest rules), and run it against the project. The engine merges `.claude/` three ways,
 * leaves every project-only file alone, records the version in `.claude/framework-lock.json` and
 * regenerates the `.agents/`, `.codex/`, `.opencode/` mirrors.
 *
 * Usage (Windows, macOS and Linux — Node 18+ and Git only):
 *   node .claude/skills/framework-update/scripts/update-from-upstream.mjs [--upstream=<git-url|dir>]
 *        [--ref=<branch|tag|commit>] [--project=<dir>] [--engine=upstream|local] [engine options]
 *
 *   --upstream=<url|dir>  where to take the framework from. Default: the URL recorded in the lock,
 *                         else https://github.com/duc01226/easy-claude.git. A local folder is used as is.
 *   --ref=<rev>           upstream branch, tag or commit (default main).
 *   --project=<dir>       project to update (default: the project holding this script). Lets an
 *                         upstream checkout update a project that has no copy of this skill yet.
 *   --engine=upstream     run the engine from the upstream version (default); `local` runs the project's.
 *   engine options        passed through: --dry-run --json --no-sync --record-only --working-tree
 *                         --allow-dirty-project --base=<rev>|auto. With no lock and no --base, --base=auto.
 *
 * Exit code: the engine's (0 done · 1 fatal · 2 something left to resolve).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

export const DEFAULT_UPSTREAM = 'https://github.com/duc01226/easy-claude.git';
export const DEFAULT_REF = 'main';
export const CACHE_DIR = 'tmp/framework-update/upstream.git';
const ENGINE_PATH = '.claude/scripts/framework-update.mjs';
const LOCK_PATH = '.claude/framework-lock.json';
const PASS_THROUGH_FLAGS = new Set(['--dry-run', '--json', '--no-sync', '--record-only', '--working-tree', '--allow-dirty-project']);
const USAGE = 'Usage: node .claude/skills/framework-update/scripts/update-from-upstream.mjs [--upstream=<git-url|dir>] [--ref=<rev>] [--project=<dir>] [--engine=upstream|local] [--dry-run] [--json] [--no-sync] [--record-only] [--working-tree] [--allow-dirty-project] [--base=<rev>|auto]';

function git(cwd, args, { allowFail = false } = {}) {
    const result = spawnSync('git', args, { cwd, maxBuffer: 1 << 30, windowsHide: true });
    if (result.error) throw new Error(`git is required: ${result.error.message}`);
    if (result.status !== 0 && !allowFail) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
    return result;
}
const out = result => result.stdout.toString('utf8').trim();

/** A remote address rather than a folder: a URL scheme, or scp-style `user@host:path`. */
export const isRemote = value => /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^[^\s/\\@]+@[^\s/\\:]+:/.test(value);

export function parseArgs(argv) {
    const options = { engine: 'upstream', ref: undefined, pass: [] };
    const value = (arg, name) => {
        const text = arg.slice(name.length + 3);
        if (!text || text.startsWith('-')) throw new Error(`${name} needs a value\n${USAGE}`);
        return text;
    };
    for (const arg of argv) {
        if (arg.startsWith('--upstream=')) options.upstream = value(arg, 'upstream');
        else if (arg.startsWith('--ref=')) options.ref = value(arg, 'ref');
        else if (arg.startsWith('--project=')) options.project = value(arg, 'project');
        else if (arg.startsWith('--engine=')) options.engine = value(arg, 'engine');
        else if (arg.startsWith('--base=')) { options.base = value(arg, 'base'); options.pass.push(`--base=${options.base}`); }
        else if (PASS_THROUGH_FLAGS.has(arg)) options.pass.push(arg);
        else throw new Error(`Unknown option ${arg}\n${USAGE}`);
    }
    if (!['upstream', 'local'].includes(options.engine)) throw new Error(`--engine is upstream or local\n${USAGE}`);
    options.workingTree = options.pass.includes('--working-tree');
    options.recordOnly = options.pass.includes('--record-only');
    if (options.workingTree && options.ref) throw new Error(`--working-tree takes the upstream folder as it is; drop --ref\n${USAGE}`);
    return options;
}

function readLock(project) {
    const file = path.join(project, LOCK_PATH);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/** Clone the upstream once (blobless: commits and trees only), then fetch on every later run. */
export function ensureCache(project, remote, log = () => {}) {
    const cache = path.join(project, CACHE_DIR);
    const root = path.dirname(cache);
    fs.mkdirSync(root, { recursive: true });
    // The cache is disposable and never belongs in the project's history, whatever its .gitignore says.
    if (!fs.existsSync(path.join(root, '.gitignore'))) fs.writeFileSync(path.join(root, '.gitignore'), '*\n');
    // A clone of another address, or a folder left broken by an interrupted clone, is replaced.
    // `--git-dir` stops Git from reading the enclosing project's repository when the folder is no clone.
    if (fs.existsSync(cache) && out(git(project, [`--git-dir=${cache}`, 'config', '--get', 'remote.origin.url'], { allowFail: true })) !== remote) {
        fs.rmSync(cache, { recursive: true, force: true });
    }
    if (fs.existsSync(cache)) {
        log(`Fetching ${remote}`);
        git(project, [`--git-dir=${cache}`, 'fetch', '--quiet', '--prune', '--force', 'origin', '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*']);
        return cache;
    }
    log(`Cloning ${remote} (commits and folder listings only; file contents download on demand)`);
    const filtered = git(project, ['clone', '--quiet', '--bare', '--filter=blob:none', '--', remote, cache], { allowFail: true });
    if (filtered.status !== 0) {
        // A server without partial-clone support: take the whole history instead.
        fs.rmSync(cache, { recursive: true, force: true });
        git(project, ['clone', '--quiet', '--bare', '--', remote, cache]);
    }
    return cache;
}

/** The commit for `ref`; a commit or ref the clone has not seen yet is fetched by name. */
export function resolveRef(repo, ref, { remote = false } = {}) {
    const lookup = rev => out(git(repo, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { allowFail: true }));
    let commit = lookup(ref);
    if (!commit && remote) {
        git(repo, ['fetch', '--quiet', 'origin', ref], { allowFail: true });
        commit = lookup('FETCH_HEAD');
        if (commit) return { commit, name: commit };
    }
    if (!commit) throw new Error(`${ref} is not a branch, tag or commit of the upstream.`);
    return { commit, name: ref };
}

/** The engine file to run: the upstream's own copy at the chosen version, unless it predates `--project`. */
export function selectEngine({ project, upstreamDir, commit, engine, workingTree, log = () => {} }) {
    const local = path.join(project, ENGINE_PATH);
    if (engine === 'upstream') {
        let text = null;
        if (workingTree) {
            const file = path.join(upstreamDir, ENGINE_PATH);
            text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        } else {
            const blob = git(upstreamDir, ['cat-file', 'blob', `${commit}:${ENGINE_PATH}`], { allowFail: true });
            text = blob.status === 0 ? blob.stdout.toString('utf8') : null;
        }
        if (text && text.includes('--project=')) {
            const target = path.join(project, 'tmp', 'framework-update', 'engine', 'framework-update.mjs');
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, text);
            return target;
        }
        log('The upstream version has no engine that can update another folder; using the project\'s engine.');
    }
    if (!fs.existsSync(local)) throw new Error(`No merge engine: neither the upstream version nor ${ENGINE_PATH} in the project can run this update.`);
    return local;
}

export function main(argv = process.argv.slice(2), defaultProject = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', '..', '..')) {
    const options = parseArgs(argv);
    const log = line => process.stderr.write(`[framework-update] ${line}\n`);
    const project = path.resolve(options.project || defaultProject);
    if (git(project, ['rev-parse', '--is-inside-work-tree'], { allowFail: true }).status !== 0) throw new Error(`${project} is not a Git working tree; the update needs Git to show and undo its changes.`);
    const lock = readLock(project);
    const source = options.upstream || lock?.source?.url || DEFAULT_UPSTREAM;
    if (!options.upstream && lock?.source?.url && lock.source.url !== DEFAULT_UPSTREAM) {
        log(`Using the upstream the lock records, not the default ${DEFAULT_UPSTREAM}: ${source}. Pass --upstream=<url> to change it.`);
    }
    const remote = isRemote(source);
    if (remote && options.workingTree) throw new Error('--working-tree needs a local upstream folder (--upstream=<dir>).');
    const upstreamDir = remote ? ensureCache(project, source, log) : path.resolve(source);
    if (!remote && !fs.existsSync(upstreamDir)) throw new Error(`No upstream folder at ${upstreamDir}`);
    const target = options.workingTree ? null : resolveRef(upstreamDir, options.ref || DEFAULT_REF, { remote });
    const engine = selectEngine({ project, upstreamDir, commit: target?.commit, engine: options.engine, workingTree: options.workingTree, log });
    const args = [engine, upstreamDir, `--project=${project}`, ...options.pass];
    if (target) args.push(`--ref=${target.name}`);
    if (remote) args.push(`--source-url=${source}`);
    if (!lock && !options.base && !options.recordOnly) args.push('--base=auto');
    log(`Upstream ${source}${target ? ` at ${target.name} (${target.commit.slice(0, 10)})` : ' (working tree)'}; engine ${path.relative(project, engine)}`);
    const result = spawnSync(process.execPath, args, { cwd: project, stdio: 'inherit', windowsHide: true });
    if (result.error) throw result.error;
    return result.status ?? 1;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(url.fileURLToPath(import.meta.url))) {
    try { process.exitCode = main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
