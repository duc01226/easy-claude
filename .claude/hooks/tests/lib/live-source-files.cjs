'use strict';

/**
 * Live source files under one project-relative root, as project-relative forward-slash paths, for the
 * scans that assert something about every live source ("no live source names a removed skill", the
 * portable-paths check).
 *
 * Inside the project's own git work tree, git lists the candidates: tracked plus untracked-not-ignored,
 * still on disk. An ignored folder is never scanned — another session's worktree under
 * `.claude/worktrees/` (a full copy of the tree, mid-edit), build output, local state — while a new file
 * still counts before it is committed. Outside its own work tree (an exported bundle, or a copy inside
 * another checkout's ignored folder, where git would answer for the outer checkout) the folder walk the
 * scans always used applies. Either way the caller's extensions, excluded folder names and symlink rule
 * apply. Same identity rule as `skill-builtin-names.test.mjs`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(root, env, args) {
    return spawnSync('git', args, {
        cwd: root, env, encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 64 * 1024 * 1024
    });
}

/** git's top level is `root` itself. `.native` keeps Windows 8.3 short names from failing the identity check. */
function isOwnGitRoot(root, env) {
    const top = git(root, env, ['rev-parse', '--show-toplevel']);
    if (top.error || top.status !== 0) return false;
    try {
        return fs.realpathSync.native(top.stdout.trim()) === fs.realpathSync.native(root);
    } catch {
        return false;
    }
}

function matchesExtension(file, extensions) {
    return !extensions || extensions.has(path.extname(file));
}

/** A folder name the caller excludes, below the scanned root (the root's own path segments never count). */
function underExcludedFolder(rel, file, excludedDirs) {
    if (file === rel) return false;
    return file.slice(rel.length + 1).split('/').slice(0, -1).some(segment => excludedDirs.has(segment));
}

function* walk(root, rel, options) {
    const abs = path.join(root, ...rel.split('/'));
    let stat;
    try {
        stat = options.skipSymlinks ? fs.lstatSync(abs) : fs.statSync(abs);
    } catch {
        return;
    }
    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
        if (matchesExtension(abs, options.extensions)) yield rel;
        return;
    }
    if (!stat.isDirectory()) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && options.excludedDirs.has(entry.name)) continue;
        yield* walk(root, `${rel}/${entry.name}`, options);
    }
}

/** Git's listing of `rel`, or null when git cannot answer for this project (not its own work tree). */
function gitListing(root, rel, env) {
    if (!isOwnGitRoot(root, env)) return null;
    const listed = git(root, env, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', `:(literal)${rel}`]);
    if (listed.error || listed.status !== 0) return null;
    return listed.stdout.split('\0').filter(Boolean);
}

/**
 * @param {string} root project root
 * @param {string} rel project-relative root to scan, forward slashes (a folder or a single file)
 * @param {{ extensions?: Set<string>|null, excludedDirs?: Set<string>, skipSymlinks?: boolean, env?: object }} [options]
 *   extensions: null lists every file; skipSymlinks: leave symbolic links out; env: the git environment
 */
function* liveSourceFiles(root, rel, { extensions = null, excludedDirs = new Set(), skipSymlinks = false, env = process.env } = {}) {
    const options = { extensions, excludedDirs, skipSymlinks };
    const listing = gitListing(root, rel, env);
    if (!listing) {
        yield* walk(root, rel, options);
        return;
    }
    for (const file of listing) {
        if (file !== rel && !file.startsWith(`${rel}/`)) continue;
        if (!matchesExtension(file, extensions) || underExcludedFolder(rel, file, excludedDirs)) continue;
        const abs = path.join(root, ...file.split('/'));
        let stat;
        try {
            stat = fs.lstatSync(abs);
        } catch {
            continue; // tracked, deleted from disk
        }
        if (stat.isSymbolicLink()) {
            if (skipSymlinks) continue;
            try {
                if (!fs.statSync(abs).isFile()) continue;
            } catch {
                continue; // dangling link
            }
        } else if (!stat.isFile()) {
            continue; // an untracked nested repository is listed as its folder
        }
        yield file;
    }
}

module.exports = { liveSourceFiles };
