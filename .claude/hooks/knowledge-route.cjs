#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Knowledge router — points the assistant at the knowledge pack a task needs (spec KNW).
 *
 * Three triggers, read from the knowledge index of both planes (`lib/knowledge-index.cjs`):
 *   - prompt phrase  — UserPromptSubmit (and the latest recorded prompt at SessionStart `compact`);
 *                      whole words in the user's own text, optional intent, silent on framework-maintenance
 *                      prompts; on only when `knowledgeRoute.promptTriggers` or the recorded held-out
 *                      evaluation (`.claude/knowledge-base/evaluation.json`) says so;
 *   - skill start    — PostToolUse `Skill`, UserPromptExpansion (a typed command) and `$skill` tokens;
 *   - helper agent   — SubagentStart: the agent's role and the skills it preloads.
 * There is no file trigger. A PostToolUse `Read` of a pack file (registered with a pack-path `if`
 * condition) only records that a delivered pack was read (`lib/knowledge-telemetry.cjs`).
 *
 * Output is a pointer, never content: at most 3 packs, at most 700 characters, project packs first
 * (`lib/knowledge-match.cjs`), each pack once per session scope and re-arm window through the
 * convention ledger (`deliverOnce`; a compaction, a clear or about 150k tokens re-arms). A prompt
 * without a session id is never delivered: the repeat could not be prevented.
 *
 * Advisory: never blocks, always exit 0, failures only on the diagnostic stream (CK_DEBUG=1). On by
 * default; `knowledgeRoute.enabled: false` or `CK_KNOWLEDGE_ROUTE=0` switches every trigger off. The
 * `knowledgeRoute` settings are read per key, later wins: `.claude/.ck.json`, the project config (the team
 * layer, which a framework refresh never replaces), then the checkout's `.claude/.ck.local.json`.
 *
 * @hook UserPromptSubmit
 * @hook UserPromptExpansion
 * @hook PostToolUse (Skill; Read of a pack file)
 * @hook SubagentStart
 * @hook SessionStart (compact)
 */

const path = require('path');

const HOOK_NAME = 'knowledge-route';
const SETTINGS_SECTION = 'knowledgeRoute';
// The project config is a settings layer for this router (BR-KNW-11): a team switch survives a framework refresh.
const SETTINGS_LAYERS = Object.freeze({ teamLayer: true });
const ENV_SWITCH = 'CK_KNOWLEDGE_ROUTE';
const GROUP_PREFIX = 'knowledge-';
const DEFAULT_REINJECT_TOKENS = 150000;
const ON_VALUES = new Set(['1', 'on', 'true', 'yes', 'enabled']);
const OFF_VALUES = new Set(['0', 'off', 'false', 'no', 'disabled']);
// `plugin:skill` — a plugin's skill, which protocol delivery does not resolve (it maps project skill files only).
const PLUGIN_SKILL = /^[a-z0-9][a-z0-9_.-]{0,63}:[a-z0-9][a-z0-9-]{0,63}$/i;

function debug(error) {
    try {
        require('./lib/debug-log.cjs').debugError(HOOK_NAME, error);
    } catch {
        /* diagnostics are best-effort */
    }
}

/** One CK_DEBUG line per event served from an in-memory rebuild: correct, but it re-reads every pack until a build. */
function reportStale(stale) {
    if (!Array.isArray(stale) || !stale.length) return;
    try {
        require('./lib/debug-log.cjs').debug(HOOK_NAME, `knowledge index of the ${stale.join(' and ')} plane${stale.length > 1 ? 's' : ''} is out of date; served from an in-memory rebuild — run /knowledge-base build`);
    } catch {
        /* diagnostics are best-effort */
    }
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The events this hook acts on; anything else returns before loading a project module. */
function eventKind(input) {
    if (!isPlainObject(input)) return null;
    switch (input.hook_event_name) {
        case 'UserPromptSubmit':
            return typeof input.prompt === 'string' && input.prompt.trim() ? 'prompt' : null;
        case 'UserPromptExpansion':
            return nonBlank(input.command_name) ? 'skill' : null;
        case 'PostToolUse':
            if (input.tool_name === 'Skill') return 'skill';
            if (input.tool_name === 'Read') return 'read';
            return null;
        case 'SubagentStart':
            return nonBlank(input.agent_type) ? 'agent' : null;
        case 'SessionStart':
            return input.source === 'compact' ? 'compact' : null;
        default:
            return null;
    }
}

function projectDirFor(input, deps) {
    if (nonBlank(deps.projectDir)) return path.resolve(deps.projectDir);
    const env = deps.env || process.env;
    const cwd = isPlainObject(input) && nonBlank(input.cwd) && path.isAbsolute(input.cwd) ? input.cwd : process.cwd();
    return require('./lib/project-root.cjs').resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

function asFlag(value) {
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (ON_VALUES.has(text)) return true;
        if (OFF_VALUES.has(text)) return false;
    }
    return null;
}

/**
 * Prompt triggers (BR-KNW-11): the project setting `knowledgeRoute.promptTriggers` when set, else the
 * default recorded by the held-out evaluation (`promptTriggersDefault`), else off.
 */
function promptTriggersOn(projectDir, deps) {
    const settings = deps.rawSettings !== undefined ? deps.rawSettings : require('./lib/prompt-route-utils.cjs').loadRouterSettings(projectDir, SETTINGS_SECTION, SETTINGS_LAYERS);
    const explicit = isPlainObject(settings) ? asFlag(settings.promptTriggers) : null;
    if (explicit !== null) return explicit;
    try {
        const record = JSON.parse(require('fs').readFileSync(path.join(projectDir, '.claude', 'knowledge-base', 'evaluation.json'), 'utf8'));
        return record && record.promptTriggersDefault === true;
    } catch {
        return false;
    }
}

/** A plugin-qualified skill the event invokes or expands by name, or null (BR-KNW-09: the prefix is ignored when matching). */
function pluginSkillName(input) {
    let name = null;
    if (input.hook_event_name === 'PostToolUse' && input.tool_name === 'Skill' && isPlainObject(input.tool_input)) {
        name = typeof input.tool_input.skill === 'string' ? input.tool_input.skill : input.tool_input.name;
    } else if (input.hook_event_name === 'UserPromptExpansion') {
        name = typeof input.command_name === 'string' ? input.command_name.replace(/^\//, '') : null;
    }
    return typeof name === 'string' && PLUGIN_SKILL.test(name.trim()) ? name.trim() : null;
}

/** Skill names the event starts (invoked skill, typed command, `$skill` token, an agent's preloaded skills). */
function startedSkills(input, projectDir) {
    let names = [];
    try {
        const delivery = require('./lib/protocol-delivery.cjs');
        const resolved = delivery.resolveEvent(input, { root: projectDir, read: delivery.defaultRead, host: delivery.detectHost(input) });
        names = resolved.names || [];
    } catch {
        names = [];
    }
    const plugin = pluginSkillName(input);
    return plugin && !names.includes(plugin) ? names.concat(plugin) : names;
}

/** Ordered matches for the event (BR-KNW-09). */
function collectMatches(input, kind, packs, projectDir, deps) {
    const match = require('./lib/knowledge-match.cjs');
    const utils = require('./lib/prompt-route-utils.cjs');
    const matches = [];
    if (kind === 'prompt' || kind === 'compact') {
        const prompt = kind === 'prompt' ? input.prompt : utils.routedPrompt(input, deps);
        const text = typeof prompt === 'string' ? utils.readUserPrompt(prompt) : null;
        const promptOn = typeof deps.promptOn === 'boolean' ? deps.promptOn : promptTriggersOn(projectDir, deps);
        if (text && promptOn) matches.push(...match.matchPrompt(packs, text));
    }
    if (kind === 'prompt' || kind === 'skill' || kind === 'agent') matches.push(...match.matchSkills(packs, startedSkills(input, projectDir)));
    if (kind === 'agent') matches.push(...match.matchAgents(packs, input.agent_type));
    return match.orderMatches(matches);
}

/** `{ plane, id }` when a PostToolUse Read opened a pack file of either plane, else null. */
function readPack(input, projectDir, planes) {
    const file = isPlainObject(input.tool_input) ? input.tool_input.file_path : null;
    if (!nonBlank(file)) return null;
    const base = nonBlank(input.cwd) && path.isAbsolute(input.cwd) ? input.cwd : projectDir;
    const abs = path.resolve(base, file.replace(/\\/g, '/'));
    if (!/\.md$/i.test(abs) || /^(?:readme|index)\.md$/i.test(path.basename(abs))) return null;
    // Compare canonical on-disk paths, so letter case and separators written differently resolve the same
    // on every system (TC-KNW-056), and record only a valid pack identity.
    const fs = require('fs');
    const real = target => {
        try {
            return fs.realpathSync.native(target);
        } catch {
            return null;
        }
    };
    const opened = real(abs);
    if (!opened) return null;
    const { isInside } = require('./lib/path-containment.cjs');
    const { isValidId } = require('./lib/knowledge-pack.cjs');
    for (const name of ['project', 'framework']) {
        const dir = real(planes[name].dir);
        if (!dir || path.dirname(opened) !== dir || !isInside(dir, opened)) continue;
        const id = path.basename(opened, path.extname(opened));
        return isValidId(id) ? { plane: name, id } : null;
    }
    return null;
}

function ledgerSettings(ledger) {
    const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
    return {
        reinjectAfterBytes: DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN,
        reinjectAfterMinutes: null,
        blindReinjectAfterMinutes: null,
        compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
    };
}

function defaultWrite(text, done) {
    const onError = () => done(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, error => {
            if (!error) process.stdout.removeListener('error', onError);
            done(!error);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        done(false);
    }
}

/**
 * Resolve to the text written, or '' when the hook stays silent.
 * deps (tests): env, projectDir, rawSettings, storeRoot, now, write, cacheFile, telemetryFile, reportStale.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        try {
            const kind = eventKind(input);
            if (!kind) return resolve('');
            const utils = require('./lib/prompt-route-utils.cjs');
            const env = deps.env || process.env;
            const projectDir = projectDirFor(input, deps);
            if (!utils.isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, { env, projectDir, rawSettings: deps.rawSettings, ...SETTINGS_LAYERS })) return resolve('');
            const indexLib = require('./lib/knowledge-index.cjs');
            const telemetry = require('./lib/knowledge-telemetry.cjs');
            if (kind === 'read') {
                const opened = readPack(input, projectDir, indexLib.resolvePlanes(projectDir));
                if (opened) {
                    const trigger = telemetry.lastTrigger(projectDir, opened.plane, opened.id, { file: deps.telemetryFile });
                    telemetry.record(projectDir, { pack: opened.id, plane: opened.plane, trigger, event: 'read' }, { file: deps.telemetryFile, now: deps.now });
                }
                return resolve('');
            }
            // The default path pays for nothing: with prompt triggers off, a prompt can only start a skill
            // through a `$skill` marker, and a compaction re-check is for prompt triggers only.
            const promptOn = kind === 'prompt' || kind === 'compact' ? promptTriggersOn(projectDir, { rawSettings: deps.rawSettings }) : false;
            if (kind === 'compact' && !promptOn) return resolve('');
            if (kind === 'prompt' && !promptOn && !String(input.prompt).includes('$')) return resolve('');
            const loaded = indexLib.loadForDelivery(projectDir, { cacheFile: deps.cacheFile });
            (deps.reportStale || reportStale)(loaded.stale);
            if (!loaded.packs.length) return resolve('');
            const ordered = collectMatches(input, kind, loaded.packs, projectDir, { env, projectDir, rawSettings: deps.rawSettings, promptOn });
            if (!ordered.length) return resolve('');
            if (!nonBlank(input.session_id)) return resolve(''); // BR-KNW-07: an un-deduplicable delivery stays silent

            const match = require('./lib/knowledge-match.cjs');
            const ledger = require('./lib/convention-ledger.cjs');
            const crypto = require('crypto');
            const root = deps.storeRoot || ledger.storeRoot(env);
            const scoped = ledger.agentStartInput(input);
            const settings = ledgerSettings(ledger);
            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            const deliver = kind === 'compact' ? ledger.deliverWithCompaction : ledger.deliverOnce;
            const collected = [];
            const pending = [];
            // deliverOnce checks presence and calls the writer synchronously, so the first MAX_PACKS packs
            // not yet delivered in this window are collected in precedence order; later packs are never
            // claimed, so they stay eligible for the next match.
            for (const item of ordered) {
                if (collected.length >= match.MAX_PACKS) break;
                pending.push(deliver({
                    root,
                    input: scoped,
                    group: `${GROUP_PREFIX}${item.entry.plane}-${item.entry.id}`,
                    hash: crypto.createHash('sha256').update(`${item.entry.plane}:${item.entry.id}:${item.entry.hash}`, 'utf8').digest('hex'),
                    payload: item.entry.id,
                    settings,
                    now,
                    write: (text, done) => collected.push({ item, done })
                }));
            }
            if (!collected.length) {
                Promise.all(pending).then(() => resolve(''), () => resolve(''));
                return undefined;
            }
            const pointer = match.pointerFor(collected.map(entry => entry.item));
            const text = pointer.text;
            const named = new Set(pointer.named);
            const acknowledge = ok => {
                for (const entry of collected) entry.done(ok && named.has(entry.item));
                if (ok) {
                    telemetry.record(projectDir, collected.filter(entry => named.has(entry.item)).map(entry => ({ pack: entry.item.entry.id, plane: entry.item.entry.plane, trigger: entry.item.trigger, event: 'delivered' })), { file: deps.telemetryFile, now });
                }
            };
            if (!text) {
                acknowledge(false);
                Promise.all(pending).then(() => resolve(''), () => resolve(''));
                return undefined;
            }
            const payload = utils.routerOutput(input, `${text}\n`);
            const write = deps.write || defaultWrite;
            let finished = false;
            write(payload, ok => {
                if (finished) return;
                finished = true;
                acknowledge(ok !== false);
                Promise.all(pending).then(() => resolve(ok === false ? '' : payload), () => resolve(ok === false ? '' : payload));
            });
            return undefined;
        } catch (error) {
            debug(error); // fail open: an advisory hook never blocks
            return resolve('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    SETTINGS_SECTION,
    ENV_SWITCH,
    DEFAULT_REINJECT_TOKENS,
    eventKind,
    promptTriggersOn,
    collectMatches,
    run
};

if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        const input = parseStdinSync({ defaultValue: null, throwOnError: false, context: HOOK_NAME });
        if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    } catch (error) {
        debug(error); // fail open
    }
}
