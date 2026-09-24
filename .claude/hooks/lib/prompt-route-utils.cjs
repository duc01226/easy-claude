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
 * - `isHostEnvelope(prompt)` / `userPromptText(prompt)` — the two halves of `readUserPrompt`.
 * - `isHookEntryPoint(mod)` — re-exported from `hook-runner.cjs`, its owner.
 */

const fs = require('fs');
const path = require('path');
const { stripHostBlocks, isSyntheticPrompt } = require('./prompt-ledger-store.cjs');
const { isHookEntryPoint } = require('./hook-runner.cjs');

/** Replace fenced (```…```) and inline (`…`) code with a space. */
function stripCode(text) {
    return String(text === undefined || text === null ? '' : text)
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`\n]*`/g, ' ');
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

const OFF_VALUES = new Set(['0', 'off', 'false', 'no', 'disabled']);

function readJsonObject(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null; // absent or unreadable config never disables a router
    }
}

/** `<section>` from `.claude/.ck.json` overlaid by `.claude/.ck.local.json` (local wins per key). */
function loadRouterSettings(projectDir, section) {
    const merged = {};
    for (const name of ['.ck.json', '.ck.local.json']) {
        const config = readJsonObject(path.join(projectDir, '.claude', name));
        const value = config && config[section];
        if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(merged, value);
    }
    return merged;
}

const isOff = value => typeof value === 'string' && OFF_VALUES.has(value.trim().toLowerCase());

/**
 * False when the router is switched off: `.ck.json` `<section>.enabled: false` (or a hand-typed
 * "false"/"0"/"no"/"off") or `<envVar>` set to one of those values. On by default.
 * deps (tests): env, projectDir, rawSettings.
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
        settings = loadRouterSettings(projectDir, section);
    }
    const enabled = settings && typeof settings === 'object' ? settings.enabled : undefined;
    return enabled !== false && !isOff(enabled);
}

module.exports = {
    isHookEntryPoint,
    stripCode,
    readUserPrompt,
    isHostEnvelope,
    userPromptText,
    isRouterEnabled
};
