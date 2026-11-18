#!/usr/bin/env node
'use strict';
if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;
/**
 * Common skills on genuine prompts, with shared protocol guidance during long tool runs.
 *
 * Re-delivers the canonical `SYNC:quality-skill-routing:reminder` digest from
 * `.claude/skills/shared/sync-inline-versions.md`. The universal bundle carries the full routing protocol.
 *
 * Triggers: UserPromptSubmit (plain stdout) and PostToolUse for every tool (JSON `additionalContext`).
 * Sub-agent tool calls also refresh the digest after the agent's own compaction.
 *
 * De-duplication: `deliverOnce` of the session-scoped convention ledger (`lib/convention-ledger.cjs`),
 * one record per scope (main conversation or one sub-agent) in the protocol-delivery store. Every genuine
 * prompt refreshes the record. Tool results deliver when the record is absent, at the configured
 * time or transcript growth threshold (defaults 60 minutes or about 250,000 tokens, whichever
 * comes first), or when the digest changes.
 * A detected compaction re-arms unless a complete compatible bundle has already restored the rules.
 * The time cap still applies without a transcript. Both events require a session id.
 *
 * Cost: one process per tool result; it ends after one record read and one transcript size check when
 * the digest is still present. Advisory; never blocks; every failure stays silent (exit 0).
 *
 * On by default; off with `.claude/.ck.json` qualitySkillReminder.enabled:false (a developer override in
 * `.claude/.ck.local.json` wins) or CK_QUALITY_SKILL_REMINDER=0. CK_DEBUG=1 prints failures to stderr.
 *
 * @hook UserPromptSubmit
 * @hook PostToolUse (*)
 */
const path = require('node:path');
const { DEFAULT_REINJECT_MINUTES, DEFAULT_REINJECT_TOKENS, resolveReminderThresholds } = require('./lib/quality-skill-reminder-config.cjs');

const HOOK_NAME = 'quality-skill-remind';
const SYNC_TAG = 'quality-skill-routing:reminder';
const PROTOCOL_TAG = 'long-run-protocols:reminder';
const MARKER_START = '<!-- CK:QUALITY-SKILL-REMINDER -->';
const MARKER_END = '<!-- /CK:QUALITY-SKILL-REMINDER -->';
const SETTINGS_SECTION = 'qualitySkillReminder';
const ENV_SWITCH = 'CK_QUALITY_SKILL_REMINDER';
// Used only when the canonical file cannot be read, so the reminder is never empty. Must equal the
// canonical `SYNC:quality-skill-routing:reminder` body (parity asserted by the hook suite).
const FALLBACK_BODY = [
    '**Common skills:** `investigate`, `brainstorm`, `plan`, `grill` (decision interview), `learn`, `docs-manager`.',
    '- UI → `ui-design`, `design-spec`, `work-item --mode=mockup`.',
    '- Review → `why-review`, `changes-review` (diff or simple pull request), `workflow-review-changes` (complex). PR → `pull-request`.',
    "- tests → `test-review` (coverage and quality of a change's tests), `test`, `e2e-test`, `integration-test`, `performance-test`.",
    '- `performance-review` for bottlenecks. `investigate --mode=debug` before `fix` (or `workflow-bugfix` for a non-trivial bug), never an ad hoc patch or a workaround.'
].join('\n');
const FALLBACK_PROTOCOLS = [
    '**Shared protocols for long runs**',
    '- Recheck the original goal, latest user instructions and current checkpoint before changing direction.',
    '- Verify the result against observable success criteria before closing. Tests should prove the intended behavior.',
    '- Trace failures to their source, test or environment cause before fixing.',
    '- Stay within user authority and project conventions. Keep required review, tests and spec or doc updates in scope.'
].join('\n');

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function debug(error) {
    try {
        require('./lib/debug-log.cjs').debugError(HOOK_NAME, error);
    } catch {
        /* diagnostics are best-effort */
    }
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    return resolveProjectRoot({ cwd: nonBlank(input.cwd) ? input.cwd : process.cwd(), scriptPath: __filename, env }).rootDir;
}

function buildContent(projectDir) {
    const bodies = require('../scripts/lib/canonical-protocol.cjs').readCanonicalProtocols(projectDir, [SYNC_TAG, PROTOCOL_TAG]);
    return {
        skills: [MARKER_START, bodies[SYNC_TAG] || FALLBACK_BODY, MARKER_END].join('\n'),
        protocols: bodies[PROTOCOL_TAG] || FALLBACK_PROTOCOLS
    };
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // A failed pipe reports through both the callback and the stream's error event.
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, error => {
            if (!error) process.stdout.removeListener('error', onError);
            finish(!error);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

/**
 * Resolve to the text written, or '' when the hook stays silent.
 * deps (tests): env, now, projectDir, homeDir, rawSettings, storeRoot, write.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return resolve('');
            const isPrompt = input.hook_event_name === 'UserPromptSubmit';
            if ((!isPrompt && input.hook_event_name !== 'PostToolUse') || !nonBlank(input.session_id)) return resolve('');
            const routeUtils = require('./lib/prompt-route-utils.cjs');
            if (isPrompt && (!nonBlank(input.prompt) || routeUtils.isHostEnvelope(input.prompt))) return resolve('');
            const env = deps.env || process.env;
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            const rawSettings =
                deps.rawSettings === undefined ? routeUtils.loadRouterSettings(projectDir, SETTINGS_SECTION, { homeDir: deps.homeDir }) : deps.rawSettings;
            if (!routeUtils.isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, { env, projectDir, rawSettings })) return resolve('');
            const { minutes, tokens } = resolveReminderThresholds(rawSettings);
            const { skills, protocols } = buildContent(projectDir);
            const content = `${skills}\n\n${protocols}`;
            const hash = require('node:crypto').createHash('sha256').update(content, 'utf8').digest('hex');
            const store = deps.storeRoot || path.join(projectDir, 'tmp', 'protocol-delivery');
            const ledger = require('./lib/convention-ledger.cjs');
            const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
            ledger
                .deliverOnce({
                    root: store,
                    input,
                    group: HOOK_NAME,
                    hash,
                    payload: routeUtils.routerOutput(input, isPrompt ? `${skills}\n` : content),
                    loadCredit: isPrompt
                        ? undefined
                        : (ctx, record) =>
                              record?.hash === hash && record.deliveredAt <= ctx.lastCompactionAt
                                  ? require('./lib/universal-delivery.cjs').compatibleRestoreCredit(projectDir, store, input, ctx, record)
                                  : null,
                    settings: {
                        // Prompts always refresh the record that subsequent tool results consult.
                        reinjectAfterBytes: isPrompt ? 0 : tokens * BYTES_PER_TOKEN,
                        reinjectAfterMinutes: isPrompt ? 0 : null,
                        blindReinjectAfterMinutes: isPrompt ? 0 : null,
                        maxAgeMinutes: isPrompt ? undefined : minutes,
                        compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
                    },
                    now: typeof deps.now === 'number' ? deps.now : Date.now(),
                    write: deps.write || defaultWrite
                })
                .then(resolve, () => resolve(''));
        } catch (error) {
            debug(error); // fail open: an advisory hook never blocks a tool result
            resolve('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    SYNC_TAG,
    PROTOCOL_TAG,
    MARKER_START,
    MARKER_END,
    SETTINGS_SECTION,
    ENV_SWITCH,
    DEFAULT_REINJECT_TOKENS,
    DEFAULT_REINJECT_MINUTES,
    FALLBACK_BODY,
    FALLBACK_PROTOCOLS,
    buildContent,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
// run owns the stream write so delivery credit follows the actual write; the runner must not serialize it again.
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    require('./lib/hook-runner.cjs').runHook(HOOK_NAME, input => run(input), { parseEvent: false, outputResult: false });
}
