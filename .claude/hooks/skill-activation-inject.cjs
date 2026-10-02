#!/usr/bin/env node
'use strict';

/**
 * Runtime skill-selection policy for Claude, Codex and the OpenCode hook bridge. Advisory: host
 * permissions stay intact so a named user request or required hook call can load the real skill.
 * Restricted policy is refreshed on every prompt/spawn and after compaction; defaults are silent.
 * A transition back to auto emits a reset, including when the config key is removed mid-session.
 * @hook UserPromptSubmit, SubagentStart, SessionStart
 */
const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { debugError } = require('./lib/debug-log.cjs');
const HOOK_NAME = 'skill-activation-inject';
const MARKER = '<!-- CK:SKILL-ACTIVATION-POLICY -->';

function isPolicyEvent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    if (['UserPromptSubmit', 'SubagentStart'].includes(input.hook_event_name)) return true;
    return input.hook_event_name === 'SessionStart' && ['startup', 'resume', 'compact', 'clear'].includes(input.source);
}

function buildPolicy(resolved) {
    if (resolved.enabled) return `${MARKER}\nFramework skill auto-trigger is enabled (${resolved.source}). This replaces the earlier restricted selection policy; normal descriptions and workflow routing apply. Existing user-only skills, permissions and Git authorization still apply.\n`;
    return [
        MARKER,
        `**Framework skill auto-trigger is DISABLED (${resolved.source}).** This policy takes precedence over automatic skill activation tables, task-description matches and suggestions to self-start a workflow.`,
        'Treat all skills in this framework (.claude/skills and its .agents/skills mirror), including workflow wrappers, as heavy. Exceptions: commit and pull-request keep their normal triggers and still require user authorization for Git operations. The lightweight framework-config entry is also eligible for automatic selection on framework questions or configuration requests, so users can discover, change or reset this mode; questions are read-only.',
        'Load a restricted skill ONLY when (1) the human explicitly asks to use that skill/workflow by name or command; (2) an operation-specific framework hook/protocol explicitly requires that named skill for an operation already active; or (3) it is a required dependency/step of a skill or workflow already authorized by (1) or (2), or of an exempt commit/pull-request operation requested by the user. Generic always-on guidance, prompt classifiers and automatic activation/matching reminders do not create an operation-specific call.',
        'A generic request to fix, implement, explain or review is NOT permission to select matching heavy skills. Optional suggestions, merely reading a skill, or self-selecting an agent that preloads it are NOT authorization. Do not broaden a required call into unrelated skills or extra workflows. Pass this restriction and the authorized scope to delegated agents.',
        'An explicitly requested workflow authorizes its required skill steps and selected applicable steps within its declared scope, including steps recorded in its todo/task plan and executed later or after resume. Each authorized step may call its required nested skills without a new request to name each one. Workflow-declared optional steps scheduled by the authorized workflow are eligible; unrelated optional suggestions are not. Preserve the workflow authorization and scope in the plan and delegated briefs; creating a plan from an ordinary prompt does not itself authorize a heavy workflow.',
        'Commit and pull-request MUST ask the human about tests and review with explicit Skip options, whether auto-trigger is enabled or disabled. A parent workflow or general autonomy instruction does not answer these questions. Wait for an explicit answer; reuse only an actual choice already recorded for the unchanged candidate. Selected test/review skills and their required nested calls remain eligible. Never choose Skip, infer consent from silence, or describe skipped work as passed.',
        'For an allowed call, load and execute the real SKILL.md using the host-native mechanism; do not bypass skill or commit checks. Preserve all user-choice/approval gates: authorization here does not approve the review choice or a skip. Once the user selects the commit review, its workflow and required nested reviewers, validation and tests remain allowed. Explicit user instructions and existing host permissions still apply.',
        '<!-- /CK:SKILL-ACTIVATION-POLICY -->',
        ''
    ].join('\n');
}

/** Write one host-native context envelope; only a successful delivery updates the reset record. */
function run(input, deps = {}) {
    if (!isPolicyEvent(input)) return '';
    try {
        const { resolveProjectRoot } = require('./lib/project-root.cjs');
        const routing = require('../scripts/lib/workflow-routing-config.cjs');
        const ledger = require('./lib/convention-ledger.cjs');
        const env = deps.env || process.env;
        const rootDir = deps.projectDir || resolveProjectRoot({ cwd: input.cwd || process.cwd(), scriptPath: __filename, env }).rootDir;
        const resolved = require('./lib/prompt-route-utils.cjs').resolveHookSkillAutoTrigger({ projectDir: rootDir, env, homeDir: deps.homeDir });
        const store = routing.resolveSessionStoreRoot(rootDir);
        const stateName = `${HOOK_NAME}-${ledger.scopeFor(input)}`;
        const hasSession = typeof input.session_id === 'string' && input.session_id.trim() !== '';
        const previous = hasSession ? ledger.readSessionState(store, input.session_id, stateName) : null;
        if (resolved.enabled && previous?.enabled !== false) return '';
        const payload = JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: buildPolicy(resolved) } });
        const write = deps.write || (text => process.stdout.write(text));
        // A backpressure return of false from stdout is still a queued write, not delivery failure.
        write(payload);
        if (hasSession) ledger.writeSessionState(store, input.session_id, stateName, { enabled: resolved.enabled });
        return payload;
    } catch (error) {
        debugError(HOOK_NAME, error);
        return ''; // advisory policy never blocks a prompt or overrides native access controls
    }
}

module.exports = { HOOK_NAME, MARKER, isPolicyEvent, buildPolicy, run };
if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    const { parseStdinSync } = require('./lib/stdin-parser.cjs');
    run(parseStdinSync({ defaultValue: null, throwOnError: false, context: HOOK_NAME }));
}
