#!/usr/bin/env node
/**
 * SessionStart Hook - keep native skill and agent visibility in step with the framework mode
 *
 * Fires: SessionStart (startup)
 * Purpose: when `frameworkRuntime.autoApplyNative` is true (default false), in the main checkout,
 *   run what `framework-mode.cjs apply` runs when the Claude/Codex native settings do not match the
 *   effective mode, so nobody has to remember the command. It runs in every mode, `off` included,
 *   because it only reconciles native visibility with that mode.
 *   The host reads native settings before hooks run, so the change applies from the next session.
 *   A linked worktree is left alone: desktop sessions load settings from the main checkout, and a
 *   worktree's copied settings must never be recorded as the user's own.
 *
 * Exit Codes:
 *   0 - Always (non-blocking); a change or a failure is reported to the user as a system message
 */

'use strict';

// Decide before reading any input: with autoApplyNative off (the default) the hook is inert.
if ((require.main === module || !require.main) && (require('./lib/framework-runtime.cjs').skipHook(module) ||
    !require('./lib/framework-runtime.cjs').resolveAutoApplyNative({
        rootDir: require('./lib/project-root.cjs').resolveProjectRoot({ scriptPath: __filename }).rootDir }).enabled)) return;

const fs = require('fs');
const path = require('path');
const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { resolveFrameworkMode, resolveAutoApplyNative } = require('./lib/framework-runtime.cjs');

const CLI = 'node .claude/scripts/framework-mode.cjs apply';

runHookSync('framework-native-sync', event => {
    const resolution = resolveProjectRoot({ cwd: event.cwd || process.cwd(), scriptPath: __filename, env: process.env });
    if (resolution.error) return undefined;
    const root = resolution.rootDir;
    if (!resolveAutoApplyNative({ rootDir: root }).enabled) return undefined;
    // A linked worktree has a `.git` file pointing at the main repository, not a directory.
    if (fs.lstatSync(path.join(root, '.git'), { throwIfNoEntry: false })?.isFile()) return undefined;

    const native = require('../scripts/lib/framework-native-skills.cjs');
    try {
        if (!native.nativeStatus(root).needsApply) return undefined;
        native.withNativeLock(() => native.applyNativeSkills(native.planNativeSkills({ rootDir: root, scope: 'checkout' })));
    } catch (error) {
        // Another session applying at the same moment is not a failure worth reporting.
        if (/operation may be active/.test(error.message)) {
            debug('framework-native-sync', error.message);
            return undefined;
        }
        return { systemMessage: `Framework mode: could not update skill and agent visibility for this checkout (${error.message}). Run: ${CLI}` };
    }
    const { mode } = resolveFrameworkMode({ rootDir: root });
    return { systemMessage: `Framework mode ${mode}: skill and agent visibility updated for this checkout; it takes effect from your next session.` };
}, { outputResult: true });
