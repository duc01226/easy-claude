#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const { runHook, isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { observedPaths, observerHint } = require('./lib/task-tracking-upkeep.cjs');
const { claimRoot, observeEdit } = require('./lib/work-claim.cjs');
const { guidedRoot, guidedProfile, guidedNotice } = require('./lib/guided-work-claim.cjs');

function observe(event) {
    try {
        const selected = resolveProjectRoot({ cwd: event?.cwd || process.cwd(), scriptPath: __filename, env: process.env });
        if (selected.error) return;
        // The work-claim nudge (`workTracking`) and the task-tracking hint are independent; either may be silent.
        const active = guidedRoot(event?.cwd || process.cwd());
        const guided = active && guidedNotice(guidedProfile(active));
        let nudge;
        if (!guided) {
            const root = claimRoot(event, selected.rootDir);
            nudge = observeEdit(event, root, observedPaths(event, root));
        }
        let hint = null;
        try {
            hint = observerHint(event, selected.rootDir);
        } catch {
            /* Tracking hint unavailable; the nudge still stands. */
        }
        const text = [nudge, hint].filter(Boolean).join('\n');
        if (text) return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } };
    } catch {
        /* Optional tracking must never block the primary tool or fabricate progress. */
    }
}

if (isHookEntryPoint(module)) runHook('task-tracking-observer', observe, { timeout: 3000, outputResult: true });
module.exports = { observe };
