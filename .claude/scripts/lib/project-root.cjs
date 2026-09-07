#!/usr/bin/env node
'use strict';

/**
 * Portable project-root resolver for scripts that may be copied without the
 * hook tree.  Keep this implementation dependency-free: the `.claude/scripts`
 * bundle is also the smallest supported Codex/Claude portability unit.
 */

const fs = require('fs');
const path = require('path');

function isDirectory(candidate) {
    try {
        return fs.statSync(path.join(candidate, '.claude')).isDirectory();
    } catch {
        return false;
    }
}

function absoluteDirectory(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const trimmed = value.trim();
    if (!path.isAbsolute(trimmed)) return null;
    return path.resolve(trimmed);
}

function nearestProjectRoot(start) {
    const absoluteStart = absoluteDirectory(start);
    if (!absoluteStart) return null;
    let current = absoluteStart;
    while (true) {
        if (isDirectory(current)) return current;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}

/**
 * @param {object} [options]
 * @param {string} [options.cwd=process.cwd()]
 * @param {string} [options.scriptPath] absolute path to the invoking script
 * @param {object} [options.env=process.env]
 * @param {boolean} [options.preferCwdFallback=false] do not treat a source
 *   checkout's script path as the consuming project when cwd has no `.claude`
 * @returns {{rootDir: string, source: string, error?: string}}
 */
function resolveProjectRoot({ cwd = process.cwd(), scriptPath, env = process.env, preferCwdFallback = false } = {}) {
    const explicit = env && Object.prototype.hasOwnProperty.call(env, 'CLAUDE_PROJECT_DIR')
        ? env.CLAUDE_PROJECT_DIR
        : undefined;

    if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
        const explicitRoot = absoluteDirectory(String(explicit));
        if (!explicitRoot) {
            return {
                rootDir: path.resolve(cwd),
                source: 'invalid-env-fallback',
                error: 'CLAUDE_PROJECT_DIR must be an absolute path'
            };
        }
        if (!isDirectory(explicitRoot)) {
            return {
                rootDir: explicitRoot,
                source: 'invalid-env-root',
                error: 'CLAUDE_PROJECT_DIR does not contain a .claude directory'
            };
        }
        return { rootDir: explicitRoot, source: 'env' };
    }

    // Some hosts have a user-level `.claude` directory (for example the
    // developer's global Codex home).  A generator invoked against a temporary
    // or copied project must not mistake that ancestor for the consuming repo.
    // In this mode the caller deliberately wants the invocation directory,
    // while an actual `.claude` directly at cwd is still accepted.
    if (preferCwdFallback) {
        const current = path.resolve(cwd);
        return {
            rootDir: current,
            source: isDirectory(current) ? 'cwd' : 'cwd-fallback'
        };
    }

    const fromCwd = nearestProjectRoot(cwd);
    if (fromCwd) return { rootDir: fromCwd, source: 'cwd-ancestor' };

    if (!preferCwdFallback && scriptPath) {
        const scriptDir = path.dirname(path.resolve(scriptPath));
        const fromScript = nearestProjectRoot(scriptDir);
        if (fromScript) return { rootDir: fromScript, source: 'script-ancestor' };
    }

    return { rootDir: path.resolve(cwd), source: 'cwd-fallback' };
}

/** Mutating entrypoints must not discard an explicitly rejected target. */
function resolveMutationProjectRoot({ allowUnmarkedRoot = false, ...options } = {}) {
    const resolution = resolveProjectRoot(options);
    // Bootstrap generators can initialize an existing, explicitly selected
    // directory before it contains the bundle marker. Never create a mistyped
    // missing target or reinterpret a relative override as the invocation cwd.
    if (allowUnmarkedRoot && resolution.source === 'invalid-env-root') {
        try {
            if (fs.statSync(resolution.rootDir).isDirectory()) {
                return { rootDir: resolution.rootDir, source: 'env' };
            }
        } catch {}
    }
    if (resolution.error) throw new Error(resolution.error);
    return resolution;
}

module.exports = {
    isDirectory,
    nearestProjectRoot,
    resolveProjectRoot,
    resolveMutationProjectRoot
};
