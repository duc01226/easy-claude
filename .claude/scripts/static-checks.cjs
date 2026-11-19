#!/usr/bin/env node
'use strict';

/**
 * static-checks — the framework-ci `static` lane: ESLint with its frozen baseline, then a prettier
 * format check. With no arguments it checks the whole tree. framework-ci passes an affected
 * selection after `--`, including an empty selection when no live JS files are affected.
 *
 *   node .claude/scripts/static-checks.cjs
 *
 * Both tools start from literal argv (no shell), so the file glob reaches prettier unexpanded on every
 * OS. Both checks always run, so one report shows every problem. A project with no ESLint configuration
 * skips the lane (its own checks are its business); a project that has one but no installed tools fails
 * with the fix, so a missing install never reads as a pass.
 *
 * Exit codes: 0 passed (or the full lane does not apply) · 1 check failure or missing tool ·
 * 2 invalid input · 3 scoped selection skipped; framework-ci preserves a skipped lane as success.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCOPED_SKIP = 3;
const ESLINT_CONFIGS = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];
const PRETTIER_IGNORE_PATHS = ['.gitignore', '.prettierignore'];
const CHECKS = [
    {
        title: 'ESLint (existing violations frozen in eslint-suppressions.json)',
        bin: ['eslint', 'bin', 'eslint.js'],
        options: ['--max-warnings=0'],
        focusedOptions: ['--no-warn-ignored'],
        fullPath: '.'
    },
    {
        title: 'prettier --check',
        bin: ['prettier', 'bin', 'prettier.cjs'],
        options: ['--check'],
        focusedOptions: PRETTIER_IGNORE_PATHS.map(file => `--ignore-path=${file}`),
        fullPath: '**/*.{cjs,mjs,js}'
    }
];

function canCheckNamedFiles(files) {
    const root = fs.realpathSync.native(ROOT);
    return files.every(file => {
        const target = path.resolve(root, file);
        return fs.lstatSync(target, { throwIfNoEntry: false })?.isFile() && fs.realpathSync.native(target) === target;
    });
}

async function ignoredByBothTools(files) {
    const { loadESLint } = require('eslint');
    const ESLint = await loadESLint();
    const linter = new ESLint({ cwd: ROOT });
    for (const file of files) {
        if (!(await linter.isPathIgnored(path.resolve(ROOT, file)))) return false;
    }
    const { getFileInfo } = require('prettier');
    const ignorePath = PRETTIER_IGNORE_PATHS.map(file => path.join(ROOT, file));
    for (const file of files) {
        if (!(await getFileInfo(path.resolve(ROOT, file), { ignorePath, resolveConfig: false })).ignored) return false;
    }
    return true;
}

async function main() {
    const args = process.argv.slice(2);
    let files = args[0] === '--' ? args.slice(1) : null;
    if (args.length && (!files || files.some(file => !file.startsWith('./') || file.includes('\\') || file.split('/').includes('..')))) {
        console.error('[static-checks] expected -- followed by repository-relative ./file paths');
        return 2;
    }
    if (files?.length === 0) {
        console.log('[static-checks] SKIP: no affected JS files');
        return SCOPED_SKIP;
    }
    if (!ESLINT_CONFIGS.some(file => fs.existsSync(path.join(ROOT, file)))) {
        console.log('[static-checks] skip: this project has no ESLint configuration');
        return files ? SCOPED_SKIP : 0;
    }
    // The native tools handle links differently when given an explicit path instead of walking the tree.
    if (files && !canCheckNamedFiles(files)) {
        console.log('[static-checks] Static scope widened to full: a selected path is missing, linked or not a regular file.');
        files = null;
    }
    // Keep missing dependencies on the normal tool diagnostic path.
    if (files && CHECKS.every(check => fs.existsSync(path.join(ROOT, 'node_modules', ...check.bin))) && (await ignoredByBothTools(files))) {
        console.log('[static-checks] SKIP: both tools ignore every affected JS file');
        return SCOPED_SKIP;
    }
    console.log(`[static-checks] scope: ${files ? `${files.length} affected file(s)` : 'full'}`);
    let ok = true;
    for (const check of CHECKS) {
        const bin = path.join(ROOT, 'node_modules', ...check.bin);
        if (!fs.existsSync(bin)) {
            console.error(`[static-checks] FAIL ${check.title}: ${path.relative(ROOT, bin)} is not installed; run npm ci`);
            ok = false;
            continue;
        }
        console.log(`[static-checks] ${check.title}`);
        const targets = files ? [...(check.focusedOptions ?? []), '--', ...files] : [check.fullPath];
        const result = spawnSync(process.execPath, [bin, ...check.options, ...targets], { cwd: ROOT, stdio: 'inherit', windowsHide: true });
        if (result.status !== 0) ok = false;
    }
    return ok ? 0 : 1;
}

module.exports = { SCOPED_SKIP };

if (require.main === module) {
    main().then(
        code => {
            process.exitCode = code;
        },
        error => {
            console.error(`[static-checks] ${error.message}`);
            process.exitCode = 1;
        }
    );
}
