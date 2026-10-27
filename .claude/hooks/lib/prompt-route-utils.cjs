'use strict';

/**
 * Shared helpers for advisory prompt-router hooks (UserPromptSubmit).
 *
 * - `readUserPrompt(prompt)` — ONE host-block pass: `null` when the prompt is a host-generated
 *   envelope (task notifications, system reminders, command echoes are not user input), else the
 *   user-authored text with host blocks and code removed. The tag list is owned by
 *   `prompt-ledger-store.cjs` (HOST_TAGS); this module reuses its exported predicates.
 * - `stripCode(text)` — drop fenced and inline code so quoted commands never read as intent.
 * - `isRouterEnabled(section, envVar, deps)` — per-router opt-out: `.claude/.ck.json`
 *   `<section>.enabled: false` (overlaid by `.claude/.ck.local.json`) or `<envVar>=0`.
 * - `loadRouterSettings(projectDir, section)` — the whole merged `<section>` object, for a hook
 *   that reads more than the switch (`core-principles-inject.cjs` reads `reinjectAfterTokens`).
 * - `isHostEnvelope(prompt)` / `userPromptText(prompt)` — the two halves of `readUserPrompt`.
 * - `routedPrompt(input, deps)` / `routerOutput(input, text)` — the prompt a router classifies and the
 *   output form for its event, so a router that also runs at sub-agent start or after a compaction reads
 *   the session's latest recorded user prompt there (neither event carries one) and answers with a
 *   context envelope.
 * - `resolveHookSkillAutoTrigger(deps)` / `resolveHookDecisionSupportMode(deps)` — the runtime skill auto-trigger
 *   flag and the decision-support mode, resolved by `workflow-routing-config.cjs` from the hook's project root.
 * - `countFrameworkCues(text)` — distinct framework-machinery cues (`FRAMEWORK_CUES`), shared by the routers
 *   that stay silent on prompts about the framework itself.
 * - `isHookEntryPoint(mod)` — re-exported from `hook-runner.cjs`, its owner.
 */

const fs = require('fs');
const path = require('path');
const { stripHostBlocks, isSyntheticPrompt } = require('./prompt-ledger-store.cjs');
const { isHookEntryPoint } = require('./hook-runner.cjs');

/** Replace code spans and backtick/tilde fenced blocks; preserve prose outside code. */
function stripCode(text) {
    const lines = String(text === undefined || text === null ? '' : text).split(/(\r\n|\r|\n)/);
    const prose = [];
    let fence = null;
    for (let i = 0; i < lines.length; i += 2) {
        const line = lines[i];
        const ending = lines[i + 1] || '';
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence) {
            if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && /^[ \t]*$/.test(marker[2])) fence = null;
            prose.push(' ', ending);
        } else if (marker && (marker[1][0] === '~' || !marker[2].includes('`'))) {
            fence = { character: marker[1][0], length: marker[1].length };
            prose.push(' ', ending);
        } else {
            prose.push(line, ending);
        }
    }
    // Inline spans cannot cross a paragraph boundary. Retain that boundary verbatim.
    return prose.join('').split(/((?:\r\n|\r(?!\n)|(?<!\r)\n)[ \t]*(?:\r\n|\r(?!\n)|(?<!\r)\n))/)
        .map((paragraph, i) => i % 2 ? paragraph : stripInlineCode(paragraph)).join('');
}

function stripInlineCode(text) {
    const runs = Array.from(text.matchAll(/`+/g));
    const next = new Array(runs.length).fill(-1);
    const lastByLength = new Map();
    // Index matching run lengths once; repeated unmatched delimiters never rescan the suffix.
    for (let i = runs.length - 1; i >= 0; i -= 1) {
        const length = runs[i][0].length;
        next[i] = lastByLength.get(length) ?? -1;
        lastByLength.set(length, i);
    }
    const prose = [];
    let cursor = 0;
    for (let i = 0; i < runs.length; i += 1) {
        let backslashes = 0;
        for (let j = runs[i].index - 1; j >= 0 && text[j] === '\\'; j -= 1) backslashes += 1;
        if (backslashes % 2 || next[i] === -1) continue;
        const closing = next[i];
        prose.push(text.slice(cursor, runs[i].index), ' ');
        cursor = runs[closing].index + runs[closing][0].length;
        i = closing;
    }
    prose.push(text.slice(cursor));
    return prose.join('');
}

const LEADING_TAG = /^\s*<([A-Za-z][\w-]*)\b/;

/** True when `text` opens with a host wrapper tag. Tests only the tag, so it costs no host-block scan. */
function opensWithHostTag(text) {
    const lead = LEADING_TAG.exec(text);
    return Boolean(lead) && isSyntheticPrompt(`<${lead[1]}>`);
}

/**
 * Host blocks removed, or `null` when the prompt is, or starts with, a host-generated envelope:
 * the raw prompt's first tag is a host tag, nothing is left once host blocks are removed, or the
 * remainder opens with a host tag (a truncated/unclosed block). Scans the host-block regex once.
 */
function stripHostEnvelope(prompt) {
    if (typeof prompt !== 'string' || opensWithHostTag(prompt)) return null;
    const stripped = stripHostBlocks(prompt);
    return stripped === '' || opensWithHostTag(stripped) ? null : stripped;
}

/** `null` for a host envelope, else the user-authored prompt text (host blocks and code removed). */
function readUserPrompt(prompt) {
    const stripped = stripHostEnvelope(prompt);
    return stripped === null ? null : stripCode(stripped);
}

/** True when the prompt is, or starts with, a host-generated envelope. */
function isHostEnvelope(prompt) {
    return typeof prompt === 'string' && stripHostEnvelope(prompt) === null;
}

/** User-authored prompt text: host blocks and code removed. */
function userPromptText(prompt) {
    return stripCode(stripHostBlocks(prompt));
}

/**
 * The prompt a router classifies for this event, or `null` to stay silent. A prompt event carries its
 * own text. A sub-agent start and the host's compaction report carry none, so the router reads the
 * latest user prompt the session's prompt ledger recorded: the request driving the turn that delegated
 * or was compacted (host-generated payloads are never recorded). No session id, no ledger or an
 * unreadable one → `null`. Any other event → `null`.
 * deps (tests): env, projectDir.
 */
function routedPrompt(input, deps = {}) {
    const event = input && input.hook_event_name;
    if (!event || event === 'UserPromptSubmit') return input ? input.prompt : null;
    if (event !== 'SubagentStart' && !require('./convention-ledger.cjs').isCompactionStart(input)) return null;
    try {
        const sessionId = input.session_id;
        if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
        const env = deps.env || process.env;
        const projectDir = deps.projectDir || require('./project-root.cjs').resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
        const store = require('./prompt-ledger-store.cjs');
        const { ledger } = store.readLedgerStatus(store.sessionDir(store.storeRoot(env, projectDir), sessionId));
        const latest = ledger && ledger.entries[ledger.entries.length - 1];
        return latest && typeof latest.text === 'string' ? latest.text : null;
    } catch {
        return null; // advisory: an unreadable ledger leaves the agent to the universal rules
    }
}

/** A router's text in its event's form: plain text for a prompt, the context envelope for any other event. */
function routerOutput(input, text) {
    const event = input && input.hook_event_name;
    if (!text || !event || event === 'UserPromptSubmit') return text;
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text.trimEnd() } });
}

// The framework's own machinery: this repo's artifact vocabulary and the cost of running it. Each entry
// is one distinct cue; the number of distinct cues decides how meta a prompt is (ai-feature-route.cjs,
// knowledge-route.cjs).
const FRAMEWORK_CUES = [
    /\.claude\b|\bclaude\.md\b|\bagents\.md\b|\bsettings\.json\b|\bproject-config\b|\.codex\b|\.agents\b|\bsync-codex\b|\bsync-inline\b/i,
    /\bskills?\b/i,
    /\bsub-?agents?\b|\bagent (?:definitions?|files?)\b|\bagents\//i,
    /\bhooks?\b/i,
    /\bworkflows?\b|\bslash commands?\b/i,
    /\bgates?\b|(?<!context )\bprotocols?\b|\bframeworks?\b|\bfrontmatter\b/i,
    /\bmirrors?\b/i,
    /\b(?:waste|wasteful|wasting|wasted)\b/i
];

/** How many distinct framework-machinery cues the text carries. */
function countFrameworkCues(text) {
    return FRAMEWORK_CUES.filter(re => re.test(String(text || ''))).length;
}

const OFF_VALUES = new Set(['0', 'off', 'false', 'no', 'disabled']);

function readJsonObject(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null; // absent or unreadable config never disables a router
    }
}

/** The tracked project config (honoring `portability.projectConfigPath`); null when unresolvable. */
function projectConfigFile(projectDir) {
    try { return require('../../scripts/lib/workflow-routing-config.cjs').resolveProjectConfigPath(projectDir) || null; } catch { return null; }
}

/**
 * `<section>` per key, later wins: the framework-shipped `.claude/.ck.json`, the team's project
 * config (which a framework update never replaces), the person's `~/.claude/.ck.json`, then the
 * checkout's `.claude/.ck.local.json`. options.homeDir overrides the home directory (tests).
 */
function loadRouterSettings(projectDir, section, options = {}) {
    const merged = {};
    const files = [path.join(projectDir, '.claude', '.ck.json'), projectConfigFile(projectDir),
        path.join(options.homeDir || require('node:os').homedir(), '.claude', '.ck.json'),
        path.join(projectDir, '.claude', '.ck.local.json')];
    for (const file of files) {
        if (!file) continue;
        const config = readJsonObject(file);
        const value = config && config[section];
        if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(merged, value);
    }
    return merged;
}

const isOff = value => typeof value === 'string' && OFF_VALUES.has(value.trim().toLowerCase());

/** Effective runtime skill selection for a hook, with the same explicit fixture/root seams as routers. */
function resolveHookSkillAutoTrigger(deps = {}) {
    const env = deps.env || process.env;
    const projectDir = deps.projectDir || require('./project-root.cjs').resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
    return require('../../scripts/lib/workflow-routing-config.cjs').resolveSkillAutoTrigger({ rootDir: projectDir, env, homeDir: deps.homeDir });
}

/**
 * Effective decision-support mode for a hook (`ask` | `suggest` | `auto` | `off`), with the same explicit
 * fixture/root seams as routers. Returns { mode, effectiveMode, source }; `effectiveMode` is what the hook acts on.
 * deps (tests): env, projectDir, homeDir, skillAutoTrigger.
 */
function resolveHookDecisionSupportMode(deps = {}) {
    const env = deps.env || process.env;
    const projectDir = deps.projectDir || require('./project-root.cjs').resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
    return require('../../scripts/lib/workflow-routing-config.cjs').resolveDecisionSupportMode({
        rootDir: projectDir, env, homeDir: deps.homeDir,
        ...(typeof deps.skillAutoTrigger === 'boolean' ? { skillAutoTrigger: deps.skillAutoTrigger } : {})
    });
}

/**
 * False when the router is switched off: `.ck.json` `<section>.enabled: false` (or a hand-typed
 * "false"/"0"/"no"/"off") or `<envVar>` set to one of those values. On by default.
 * deps (tests): env, projectDir, rawSettings, homeDir.
 */
function isRouterEnabled(section, envVar, deps = {}) {
    const env = deps.env || process.env;
    if (isOff(env[envVar])) return false;
    let settings = deps.rawSettings;
    if (settings === undefined) {
        let projectDir = deps.projectDir;
        if (!projectDir) {
            const { resolveProjectRoot } = require('./project-root.cjs');
            projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
        }
        settings = loadRouterSettings(projectDir, section, { homeDir: deps.homeDir });
    }
    const enabled = settings && typeof settings === 'object' ? settings.enabled : undefined;
    return enabled !== false && !isOff(enabled);
}

// Where a sentence-initial imperative can open: the prompt start or a sentence end, then any polite or connective
// prefixes ("please,", "ok so"). Three openers serve callers with opposite needs:
// - SENTENCE_START decides whether a prompt is a build request before the verdict router drops its weak patterns,
//   so it stays strict: a bulleted plan followed by "any gaps?" is still a verdict ask.
// - ITEM_START also accepts a list marker, so "- recommend a pattern" is still an advice ask.
// - WORK_START also accepts a list marker and an affirmation ("yes, do it", "sounds good, implement it"), so the
//   plan offer catches the go-ahead that turns a discussion into work.
const SENTENCE_END = '(?:^|[.!?;\\r\\n][^\\S\\r\\n]*)';
const LIST_MARKER = '(?:[-*(][^\\S\\r\\n]*)?';
const CONNECTIVES = 'please|pls|ok(?:ay)?|now|then|so|and';
const AFFIRMATIONS = 'yes|yeah|yep|sure|great|perfect|alright|sounds good|lgtm|approved|cool';
const prefixes = words => `(?:(?:${words})(?:,|[^\\S\\r\\n])+)*`;
const SENTENCE_START = `${SENTENCE_END}${prefixes(CONNECTIVES)}`;
const ITEM_START = `${SENTENCE_END}${LIST_MARKER}${prefixes(CONNECTIVES)}`;
const WORK_START = `${SENTENCE_END}${LIST_MARKER}${prefixes(`${AFFIRMATIONS}|${CONNECTIVES}`)}`;
// "follow" only as an instruction ("follow the steps"), never "Follow up:", "follow-up" or "Follow-ups:".
const ACTION_VERBS = '(?:fix|implement|add|create|build|run|resolve|make|update|refactor|write|remove|delete|rename|debug|repair|patch|install|set\\s+up|migrate|clean\\s+up|handle|change|move|convert|upgrade|generate|apply|follow(?![\\s-]*ups?\\b))';
const workRequest = start => new RegExp(
    `${start}${ACTION_VERBS}\\b|\\b(?:can|could|would|will) you (?:please )?(?:help (?:me )?)?${ACTION_VERBS}\\b|\\b(?:please|help me) ${ACTION_VERBS}\\b`,
    'i'
);
// A fix/build request: a sentence-initial imperative ("Run the tests and fix any errors") or a polite ask
// ("can you fix it?", "please implement …").
const ACTION_REQUEST = workRequest(SENTENCE_START);
// The same request written as a list item or after an affirmation, for the plan offer only.
const WORK_REQUEST = workRequest(WORK_START);
// The go-ahead that turns a discussion into work: "ok do it", "yes, go ahead", "let's build it", "proceed".
const GO_AHEAD = new RegExp(`${WORK_START}(?:do it|do that|do this|go ahead|proceed|let'?s (?:do|build|implement|start|go)|start (?:implementing|building|the work|on it))\\b`, 'i');

/** True when the user-authored prompt text asks for work to be done, not a question or a verdict. */
function isBuildRequest(text) {
    return typeof text === 'string' && (WORK_REQUEST.test(text) || GO_AHEAD.test(text));
}

module.exports = {
    SENTENCE_START,
    ITEM_START,
    ACTION_REQUEST,
    isBuildRequest,
    isHookEntryPoint,
    FRAMEWORK_CUES,
    countFrameworkCues,
    stripCode,
    readUserPrompt,
    isHostEnvelope,
    userPromptText,
    routedPrompt,
    routerOutput,
    loadRouterSettings,
    resolveHookSkillAutoTrigger,
    resolveHookDecisionSupportMode,
    isRouterEnabled
};
