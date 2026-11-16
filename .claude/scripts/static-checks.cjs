#!/usr/bin/env node
'use strict';

/**
 * static-checks — the framework-ci `static` lane: ESLint with its frozen baseline, then a prettier
 * format check of every JavaScript file.
 *
 *   node .claude/scripts/static-checks.cjs
 *
 * Both tools start from literal argv (no shell), so the file glob reaches prettier unexpanded on every
 * OS. Both checks always run, so one report shows every problem. A project with no ESLint configuration
 * skips the lane (its own checks are its business); a project that has one but no installed tools fails
 * with the fix, so a missing install never reads as a pass.
 *
 * Exit codes: 0 both checks passed (or the lane does not apply) · 1 a check failed or a tool is missing.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const ESLINT_CONFIGS = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];
const CHECKS = [
    { title: 'ESLint (existing violations frozen in eslint-suppressions.json)', bin: ['eslint', 'bin', 'eslint.js'], args: ['.', '--max-warnings=0'] },
    { title: 'prettier --check', bin: ['prettier', 'bin', 'prettier.cjs'], args: ['--check', '**/*.{cjs,mjs,js}'] }
];

function main() {
    if (!ESLINT_CONFIGS.some(file => fs.existsSync(path.join(ROOT, file)))) {
        console.log('[static-checks] skip: this project has no ESLint configuration');
        return 0;
    }
    let ok = true;
    for (const check of CHECKS) {
        const bin = path.join(ROOT, 'node_modules', ...check.bin);
        if (!fs.existsSync(bin)) {
            console.error(`[static-checks] FAIL ${check.title}: ${path.relative(ROOT, bin)} is not installed; run npm ci`);
            ok = false;
            continue;
        }
        console.log(`[static-checks] ${check.title}`);
        const result = spawnSync(process.execPath, [bin, ...check.args], { cwd: ROOT, stdio: 'inherit', windowsHide: true });
        if (result.status !== 0) ok = false;
    }
    return ok ? 0 : 1;
}

process.exitCode = main();
