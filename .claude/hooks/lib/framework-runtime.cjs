'use strict';

// One runtime owner for every shipped hook. Personal preferences never change
// generated files, native host permissions, or explicitly invoked skills.
const path = require('node:path');
const fs = require('node:fs');
const routing = require('../../scripts/lib/workflow-routing-config.cjs');

const MODES = Object.freeze(['on', 'quiet', 'off']);
// Quiet suppresses context-producing automation before it reads transcripts or
// updates delivery ledgers. These operational hooks retain their own diagnostics.
const QUIET_HOOKS = new Set([
    'review-commit-gate.cjs',
    'doc-sync-gate.cjs',
    'post-edit-prettier.cjs',
    'notifications/notify.cjs'
]);

// Runs in every mode: it only reconciles native skill and agent visibility with the
// mode, and does nothing unless `frameworkRuntime.autoApplyNative` is true.
const ALWAYS_HOOKS = new Set(['framework-native-sync.cjs']);

// Opt-in for quiet: keep the hooks that deliver the PROJECT's own rules (its skill overlays, its
// per-file conventions and the skill auto-trigger policy) while generic guidance stays off. Each is
// small and project-authored, so a quiet session still sees the rules the project wrote down.
const QUIET_PROJECT_RULE_HOOKS = new Set([
    'skill-overlay-remind.cjs',
    'file-convention-inject.cjs',
    'skill-activation-inject.cjs'
]);

// `frameworkRuntime.quietNative`: what quiet does to native skill and agent visibility.
// `none` (default) leaves it; `restrict` hides framework skills from automatic use and
// denies the framework's own agents, keeping quietSkills and the commit gate's reviews.
const QUIET_NATIVE = Object.freeze(['none', 'restrict']);
// `frameworkRuntime.offMode` (team only): `allowed` (default) keeps `off`; `as-quiet`
// reads a saved or requested `off` as quiet, so no personal setting stops the gates.
const OFF_MODES = Object.freeze(['allowed', 'as-quiet']);

function normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const text = value.trim().toLowerCase();
    if (['1', 'true', 'on', 'yes'].includes(text)) return true;
    if (['0', 'false', 'off', 'no'].includes(text)) return false;
    return undefined;
}

function normalizeChoice(value, choices) {
    if (typeof value !== 'string') return undefined;
    const text = value.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase();
    return choices.includes(text) ? text : undefined;
}

function normalizeMode(value) {
    return normalizeChoice(value, MODES);
}

// Skills that stay model-invocable under a quiet restriction; an invalid list expresses no preference.
function normalizeSkillList(value) {
    return Array.isArray(value) && value.every(name => typeof name === 'string') ? [...value] : undefined;
}

function readConfig(file) {
    try {
        return JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch {
        return null;
    }
}

/** The team's `frameworkRuntime.offMode`, read from the tracked project config only. */
function resolveOffMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const configReader = options.readConfig || readConfig;
    const file = routing.resolveProjectConfigPath(rootDir);
    const value = normalizeChoice(file && configReader(file)?.frameworkRuntime?.offMode, OFF_MODES);
    return { value: value || 'allowed', source: value ? 'project-config' : 'default' };
}

function resolveFrameworkMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const configPath = routing.resolveProjectConfigPath(rootDir);
    const userPath = routing.resolveUserConfigPath(options.homeDir);
    const localPath = routing.resolveLocalOverridePath(rootDir);
    const layers = [{ source: 'default', mode: 'on' }];
    const configReader = options.readConfig || readConfig;
    const add = (source, file) => {
        const runtime = file && configReader(file)?.frameworkRuntime;
        layers.push({ source, file, mode: normalizeMode(runtime?.mode), quietSkills: normalizeSkillList(runtime?.quietSkills) });
    };
    add('project-config', configPath);
    if (options.scope !== 'team') {
        add('user-config', userPath);
        add('local-override', localPath);
        layers.push({ source: 'environment', mode: normalizeMode(env.CK_FRAMEWORK_MODE) });
    }
    const winner = layers.filter(layer => layer.mode !== undefined).at(-1);
    const quietSkills = layers.filter(layer => layer.quietSkills !== undefined).at(-1)?.quietSkills || [];
    const offReadAsQuiet = winner.mode === 'off' && resolveOffMode({ rootDir, readConfig: configReader }).value === 'as-quiet';
    return { mode: offReadAsQuiet ? 'quiet' : winner.mode, source: winner.source, ...(offReadAsQuiet ? { offReadAsQuiet } : {}),
        quietSkills, configPath, userPath, localPath, layers };
}

// One reader for the per-person runtime options: default, project config, ~/.claude/.ck.json,
// the checkout's .claude/.ck.local.json, then the environment; the last valid value wins.
function resolveLayered(options, key, normalize, envName, fallback) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const configReader = options.readConfig || readConfig;
    const layers = [{ source: 'default', value: fallback }];
    const add = (source, file) => layers.push({ source, file, value: normalize(file && configReader(file)?.frameworkRuntime?.[key]) });
    add('project-config', routing.resolveProjectConfigPath(rootDir));
    if (options.scope !== 'team') {
        add('user-config', routing.resolveUserConfigPath(options.homeDir));
        add('local-override', routing.resolveLocalOverridePath(rootDir));
        layers.push({ source: 'environment', value: normalize(env[envName]) });
    }
    const winner = layers.filter(layer => layer.value !== undefined).at(-1);
    return { value: winner.value, source: winner.source, layers };
}

/** `frameworkRuntime.quietProjectRules` (default false); same layers as the mode, env CK_QUIET_PROJECT_RULES. */
function resolveQuietProjectRules(options = {}) {
    const { value, source, layers } = resolveLayered(options, 'quietProjectRules', normalizeBoolean, 'CK_QUIET_PROJECT_RULES', false);
    return { enabled: value, source, layers: layers.map(({ value: enabled, ...rest }) => ({ ...rest, enabled })) };
}

/** `frameworkRuntime.quietNative` (default `none`); same layers as the mode, env CK_QUIET_NATIVE. */
function resolveQuietNative(options = {}) {
    return resolveLayered(options, 'quietNative', value => normalizeChoice(value, QUIET_NATIVE), 'CK_QUIET_NATIVE', 'none');
}

/** `frameworkRuntime.autoApplyNative` (default false); same layers as the mode, env CK_AUTO_APPLY_NATIVE. */
function resolveAutoApplyNative(options = {}) {
    const { value, source, layers } = resolveLayered(options, 'autoApplyNative', normalizeBoolean, 'CK_AUTO_APPLY_NATIVE', false);
    return { enabled: value, source, layers: layers.map(({ value: enabled, ...rest }) => ({ ...rest, enabled })) };
}

function isHookEnabled(hook, options = {}) {
    const name = hook.replace(/\\/g, '/').replace(/^.*\.claude\/hooks\//, '');
    if (ALWAYS_HOOKS.has(name)) return true;
    const { mode } = resolveFrameworkMode(options);
    if (mode === 'on') return true;
    if (mode !== 'quiet') return false;
    if (QUIET_HOOKS.has(name)) return true;
    return QUIET_PROJECT_RULE_HOOKS.has(name) && resolveQuietProjectRules(options).enabled;
}

// Guard only actual entrypoints: importing a hook for tests or explicit tooling
// still exposes its API. Covers direct Node and the Codex node -e launcher.
function skipHook(mod) {
    if (!require('./hook-runner.cjs').isHookEntryPoint(mod)) return false;
    const { rootDir } = require('./project-root.cjs').resolveProjectRoot({ scriptPath: mod.filename });
    return !isHookEnabled(path.relative(path.join(rootDir, '.claude', 'hooks'), mod.filename), { rootDir });
}

module.exports = {
    MODES, QUIET_HOOKS, ALWAYS_HOOKS, QUIET_PROJECT_RULE_HOOKS, QUIET_NATIVE, OFF_MODES,
    normalizeMode, resolveFrameworkMode, resolveOffMode, resolveQuietProjectRules, resolveQuietNative, resolveAutoApplyNative,
    isHookEnabled, skipHook
};
