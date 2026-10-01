#!/usr/bin/env node
'use strict';

/**
 * Workflow route injection for UserPromptSubmit: the ONLY carrier of the workflow route text.
 * No root instruction file carries routing text; the route arrives here, in the mode the
 * person chose. Resolved by `routing.resolveWorkflowRouteMode` (owner: .claude/scripts/lib/workflow-routing-config.cjs):
 *   - ask  (default): the gate + catalog; the workflow question is asked only when the model's own route is to start a catalog workflow (direct, single-skill and custom-simple routes ask nothing).
 *   - auto: the gate + catalog; a matched workflow starts without asking, by its tier.
 *   - off:  a short state notice only (no gate, no catalog): nothing starts without an explicit request.
 * Runs on every host that runs hooks: Claude (settings.json), Codex (the mirrored .codex/hooks.json
 * launcher) and the OpenCode bridge (compiled from settings.json); all three execute this one file.
 * Delivery is advisory plaintext, never a blocking decision. A session-scoped ledger suppresses
 * duplicates until content changes (a mode change is a content change), context is compacted, or the
 * transcript grows by about 4.5 MB (the framework's ~200k-token proxy).
 *
 * An optional project-supplied protocol (`portability.workflowRouteProtocol`, team or local,
 * local wins) is appended in its own marker block. It is part of the delivery content, so a
 * protocol edit re-arms delivery; when nothing is configured the payload is byte-identical.
 *
 * The payload stays under the host's hook-output cap. The gate body (from
 * .claude/skills/shared/workflow-first-gate.md, filtered to the mode) is always delivered; the catalog
 * is the compact form (tier, step count, hint and barrier groups per workflow; step-skill names only
 * while they fit). A registry too large even for that falls back to the compact rows without the
 * step-skill names, then to an index (rows with barrier groups, then rows with tier only), then to a
 * pointer-only form with no workflow rows. The gate and the barrier legend's advancement clause are
 * always kept. The `[a ∥ b]` group tokens are kept in the compact catalog and in the index with
 * parallel-phase marks; the tiers-only index and the pointer-only form omit them
 * (`start-workflow <id>` loads a workflow's phases), so the wf-cycle W5 runtime-payload check
 * applies barrier-mark parity only to the two marked forms.
 *
 * A source file that cannot be read (a corrupt or missing workflows.json, an unreadable gate file) never
 * silences the route: the gate is still delivered with one line naming the unavailable catalog, and an
 * unreadable gate file is reported in one line naming it (`buildUnavailableInjection`).
 *
 * Hosts without hook delivery are not supported: a host that runs no hooks, or one whose hooks are
 * disabled or untrusted, receives no route block.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'workflow-route-inject';
const RECORD_GROUP = 'workflow-route';
const PROTOCOL_START = '<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->';
const PROTOCOL_END = '<!-- /CK:WORKFLOW-ROUTE-PROTOCOL -->';
const OFF_START = '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->';
const OFF_END = '<!-- /CK:RUNTIME-WORKFLOW-ROUTE-OFF -->';
const GATE_MARKER = '<!-- CK:WORKFLOW-GATE -->';
const GATE_END_MARKER = '<!-- /CK:WORKFLOW-GATE -->';
const GATE_FILE_SEGMENTS = Object.freeze(['.claude', 'skills', 'shared', 'workflow-first-gate.md']);
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/;
// Lines between `<!-- CK:GATE-MODE ask auto -->` and `<!-- /CK:GATE-MODE -->` belong to the listed modes only.
const MODE_FENCE_RE = /^[ \t]*<!-- CK:GATE-MODE ([a-z ]+) -->\r?\n([\s\S]*?)^[ \t]*<!-- \/CK:GATE-MODE -->[ \t]*(?:\r?\n|$)/gm;
const DEFAULT_MODE = 'ask';
// Hosts cut hook output above 10,000 characters to a short preview; stay under it with margin.
const PAYLOAD_CAP = 9500;
const SETTINGS = Object.freeze({
    reinjectAfterBytes: 4500000,
    reinjectAfterMinutes: null,
    blindReinjectAfterMinutes: null,
    // Re-arm after a Codex compaction too (its record has no `compact_boundary` subtype). A getter,
    // so loading this hook loads the ledger only when a record is actually read.
    get compactionMarkers() {
        return [require('./lib/convention-ledger.cjs').CODEX_COMPACTION_MARKER];
    }
});

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    const cwd = nonBlank(input?.cwd) ? input.cwd : process.cwd();
    return resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

function defaultWrite(text, done) {
    try {
        process.stdout.write(text, error => done(!error));
    } catch {
        done(false);
    }
}

/** Wrap a project-authored protocol in its own marker block; blank input means no block. */
function buildProtocolSection(text) {
    const body = typeof text === 'string' ? text.trim() : '';
    if (!body) return '';
    return [PROTOCOL_START, body, PROTOCOL_END].join('\n');
}

/** Resolve the configured custom route protocol, failing soft to '' when unavailable. */
function resolveProtocolText(routing, projectDir) {
    try {
        if (!routing || typeof routing.resolveWorkflowRouteProtocol !== 'function') return '';
        const resolved = routing.resolveWorkflowRouteProtocol({ rootDir: projectDir });
        return resolved && typeof resolved.text === 'string' ? resolved.text : '';
    } catch {
        return '';
    }
}

/**
 * The gate text for `mode` (`ask` | `auto`): the CK:WORKFLOW-GATE block of the gate file (the whole
 * text when it carries no block) with only the lines fenced for that mode kept. Text with no fences
 * is returned whole. The result keeps the gate markers.
 */
function renderGateForMode(raw, mode) {
    const text = String(raw === undefined || raw === null ? '' : raw);
    const block = text.match(GATE_BLOCK_RE);
    return (block ? block[0] : text)
        .replace(MODE_FENCE_RE, (all, modes, body) => (modes.trim().split(/\s+/).includes(mode) ? body : ''))
        .trim();
}

/** `Route mode: <mode> (<source>)` — the state line every delivered block opens with. */
function buildStateLine(mode, source) {
    let label = source || 'default';
    let session = false;
    try {
        const routing = require('../scripts/lib/workflow-routing-config.cjs');
        label = routing.describeRouteModeSource(source);
        session = source === routing.SOURCE_SESSION;
    } catch {
        /* the raw source name still states where the mode came from */
    }
    const note = session && mode !== 'off'
        ? ' — the first task after your directive counts as the session\'s first task for the rule below'
        : '';
    return `Route mode: ${mode} (${label}${note})`;
}

/**
 * Build the runtime payload: the state line, the mode's gate and the compact catalog when it fits
 * PAYLOAD_CAP, otherwise the first smaller form that fits (compact rows without the step-skill names →
 * index rows with barrier groups → rows with tier only → no rows). The gate and any configured protocol
 * are never dropped, so the last form is returned even when a large protocol keeps it over the cap.
 * `mode` is `ask` (default) or `auto`; `off` has no payload (see buildOffNotice). `source` names the
 * layer that decided the mode (workflow-routing-config `SOURCE_*`).
 */
function buildInjection(projectDir, protocolText, mode = DEFAULT_MODE, source = 'default') {
    const catalogLib = require('../scripts/lib/workflow-skills-catalog.cjs');
    const effectiveMode = mode === 'auto' ? 'auto' : DEFAULT_MODE;
    const gate = renderGateForMode(fs.readFileSync(path.join(projectDir, ...GATE_FILE_SEGMENTS), 'utf8'), effectiveMode);
    const protocol = buildProtocolSection(protocolText);
    const state = buildStateLine(effectiveMode, source);
    const assemble = catalog => {
        const parts = ['<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', state, gate, '', catalog];
        if (protocol) parts.push('', protocol);
        parts.push('<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->');
        return parts.join('\n');
    };
    const compact = sections => () => catalogLib.buildWorkflowSkillsCatalog({ rootDir: projectDir, sections, compact: true, mode: effectiveMode });
    const forms = [
        compact(['workflows', 'skills']),
        compact(['workflows']),
        ...catalogLib.POINTER_ROWS.map(rows => () => catalogLib.buildWorkflowPointerCatalog({ rootDir: projectDir, rows, mode: effectiveMode }))
    ];
    let payload = '';
    for (const build of forms) {
        payload = assemble(build());
        if (payload.length <= PAYLOAD_CAP) return payload;
    }
    return payload;
}

/** A short single-line reason for a source file that could not be read or parsed (project path removed, 120 characters). */
function describeSourceFailure(error, projectDir) {
    let text = error && typeof error.message === 'string' ? error.message : String(error);
    text = text.split(/\r?\n/)[0];
    if (projectDir) text = text.split(projectDir).join('<project>');
    text = text.replace(/\s+/g, ' ').trim();
    return (text || 'unreadable').slice(0, 120);
}

/**
 * The block delivered when the catalog (or any other part of buildInjection) cannot be built: the hook is
 * the only carrier of the route, so a corrupt or missing source file must not silence it. With the gate
 * file readable the block is the state line, the mode's gate and one line naming the missing catalog;
 * with the gate unreadable too it is the state line and one line naming the gate file. Never throws.
 */
function buildUnavailableInjection(projectDir, protocolText, mode, source, error) {
    const effectiveMode = mode === 'auto' ? 'auto' : DEFAULT_MODE;
    const state = buildStateLine(effectiveMode, source);
    const reason = describeSourceFailure(error, projectDir);
    let gate = '';
    let gateError = null;
    try {
        gate = renderGateForMode(fs.readFileSync(path.join(projectDir, ...GATE_FILE_SEGMENTS), 'utf8'), effectiveMode);
    } catch (readError) {
        gateError = readError;
    }
    const parts = ['<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', state];
    if (gate && !gateError) {
        parts.push(gate, '', `workflow catalog unavailable: ${reason}; read .claude/workflows.json`);
        const protocol = buildProtocolSection(protocolText);
        if (protocol) parts.push('', protocol);
    } else {
        parts.push(`workflow route unavailable: ${GATE_FILE_SEGMENTS.join('/')} could not be read (${describeSourceFailure(gateError || 'empty gate', projectDir)}); read it and .claude/workflows.json`);
    }
    parts.push('<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->');
    return parts.join('\n');
}

/** `buildInjection`, or the unavailable-source block when it throws. */
function buildInjectionOrNotice(projectDir, protocolText, mode, source) {
    try {
        return buildInjection(projectDir, protocolText, mode, source);
    } catch (error) {
        return buildUnavailableInjection(projectDir, protocolText, mode, source, error);
    }
}

/** The `off` state: the only text delivered in `off` mode (no gate, no catalog). */
function buildOffNotice(source = 'default') {
    return [
        OFF_START,
        buildStateLine('off', source),
        '**Workflow auto-routing is OFF for this user** (route mode `off`, set per person). This overrides every auto-select instruction in project context, including a skill step that recommends a workflow:',
        '- Do not choose or start a workflow yourself: not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow (skip that step and continue the skill). A step that only offers a workflow to the user as an option stays as written. `off` governs only a workflow YOU choose to start: one that a skill step, a skill the user names or a running parent workflow requires is part of that run and is not skipped.',
        '- Run a workflow only when the user explicitly asks for one (a `/start-workflow <id>` or `workflow-*` command, or asking in words); a skill the user names runs too.',
        '- Otherwise execute the request directly, with no workflow, or the one skill the user names. Every quality gate, task-planning rule, evidence obligation and confirmation gate still binds.',
        OFF_END
    ].join('\n');
}

/** The mode and its deciding layer; `ask` from `default` when the resolver is unavailable, invalid or throws. */
function resolveMode(routing, options) {
    try {
        const resolved = routing && typeof routing.resolveWorkflowRouteMode === 'function' ? routing.resolveWorkflowRouteMode(options) : null;
        if (resolved && ['ask', 'auto', 'off'].includes(resolved.mode)) return { mode: resolved.mode, source: resolved.source || 'default' };
    } catch {
        /* fail safe to ask */
    }
    return { mode: DEFAULT_MODE, source: 'default' };
}

// The session record's name, store root and reader are owned by the routing library, so the
// `workflow-mode` CLI reports the same session directive this hook applies.
const sessionRouting = () => require('../scripts/lib/workflow-routing-config.cjs');

/** The mode a prompt directive set earlier in this session, or undefined. */
function readSessionMode(ledger, storeRoot, sessionId) {
    try {
        return sessionRouting().readSessionRouteMode({ ledger, storeRoot, sessionId });
    } catch {
        return undefined;
    }
}

function writeSessionMode(ledger, storeRoot, sessionId, mode) {
    try {
        return Boolean(ledger && typeof ledger.writeSessionState === 'function'
            && ledger.writeSessionState(storeRoot, sessionId, sessionRouting().SESSION_MODE_STATE, { mode }) === true);
    } catch {
        return false;
    }
}

/**
 * Apply a prompt directive (first line `workflow-mode: <mode>` and the other spellings): record the
 * session's mode, and with `save` write the personal user file. Returns the acknowledgement line for
 * the model, or '' when the prompt holds no directive.
 */
function applyDirective(routing, directive, context) {
    if (!directive) return '';
    const sessionSaved = writeSessionMode(context.ledger, context.storeRoot, context.sessionId, directive.mode);
    let saved = '';
    if (directive.save) {
        let result = { ok: false, reason: 'unavailable' };
        try {
            result = routing.writeWorkflowRouteMode({ mode: directive.mode, target: 'user', homeDir: context.homeDir });
        } catch {
            /* reported below */
        }
        saved = result.ok ? `; saved to ${result.file}` : `; NOT saved (${result.reason || 'failed'})`;
    }
    const scope = sessionSaved ? 'for this session' : 'for this prompt; session preference NOT saved. Later prompts use the recorded/configured mode';
    return `Route mode directive applied: ${directive.mode} ${scope}${saved}. The prompt's first line is that directive, not a task; if nothing else follows it, reply with one line confirming the mode.`;
}

/** Resolve to the text written, or an empty string when the hook stays silent. */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return finish('');
            if (input.hook_event_name && input.hook_event_name !== 'UserPromptSubmit') return finish('');
            if (!nonBlank(input.session_id)) return finish('');

            const env = deps.env || process.env;
            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            const routing = deps.routing || require('../scripts/lib/workflow-routing-config.cjs');
            const ledger = deps.ledger || require('./lib/convention-ledger.cjs');
            const storeRoot = deps.storeRoot || sessionRouting().resolveSessionStoreRoot(projectDir);

            let directive = null;
            try {
                directive = typeof routing.parseRouteModeDirective === 'function' ? routing.parseRouteModeDirective(input.prompt) : null;
            } catch {
                directive = null;
            }
            const ack = applyDirective(routing, directive, { ledger, storeRoot, sessionId: input.session_id, homeDir: deps.homeDir });
            const sessionMode = directive ? directive.mode : readSessionMode(ledger, storeRoot, input.session_id);
            const { mode, source } = resolveMode(routing, { rootDir: projectDir, env, homeDir: deps.homeDir, sessionMode });

            let content;
            if (mode !== 'off') {
                const protocol = deps.protocol !== undefined ? deps.protocol : resolveProtocolText(routing, projectDir);
                content = deps.content || buildInjectionOrNotice(projectDir, protocol, mode, source);
            } else {
                content = deps.offContent !== undefined ? deps.offContent : buildOffNotice(source);
                if (!content) return finish('');
            }
            const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
            const write = deps.write || defaultWrite;
            // This hook is the only carrier of the route and of the off notice, so an unusable record store
            // must not silence it: failOpen delivers without a record (a duplicate is accepted over silence).
            ledger.deliverOnce({
                root: storeRoot,
                input,
                group: RECORD_GROUP,
                hash,
                payload: ack ? `${content}\n${ack}\n` : `${content}\n`,
                settings: SETTINGS,
                now,
                write,
                failOpen: true
            }).then(written => {
                // The block is already in the conversation, so nothing was written: the directive still gets its reply line.
                if (written === '' && ack) return new Promise(done => write(`${ack}\n`, ok => done(ok ? `${ack}\n` : '')));
                return written;
            }).then(finish, () => finish(''));
        } catch {
            finish('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    RECORD_GROUP,
    SETTINGS,
    PROTOCOL_START,
    PROTOCOL_END,
    OFF_START,
    OFF_END,
    GATE_MARKER,
    GATE_END_MARKER,
    PAYLOAD_CAP,
    buildInjection,
    buildUnavailableInjection,
    renderGateForMode,
    buildOffNotice,
    buildProtocolSection,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    let input = null;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
    } catch {
        input = null;
    }
    if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
}
