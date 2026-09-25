#!/usr/bin/env node
'use strict';

/**
 * Configurable workflow route injection for UserPromptSubmit.
 *
 * Enabled by default. Tracked project config can opt the team out, while `.claude/.ck.local.json`
 * can override only the developer's runtime delivery. Delivery is advisory plaintext, never a blocking decision. A
 * session-scoped ledger suppresses duplicates until content changes, context is compacted, or
 * the transcript grows by about 4.5 MB (the framework's ~200k-token proxy).
 *
 * An optional project-supplied protocol (`portability.workflowRouteProtocol`, team or local,
 * local wins) is appended in its own marker block. It is part of the delivery content, so a
 * protocol edit re-arms delivery; when nothing is configured the payload is byte-identical.
 *
 * The payload stays under the host's hook-output cap: the catalog is the compact form (tier, step
 * count, hint and barrier groups per workflow; step-skill names only), and the gate body is replaced
 * by its marker plus a pointer line when CLAUDE.md exists and every root instruction file present
 * carries the gate. A registry too large even for the compact form falls back to an index (rows with
 * barrier groups, then rows with tier only), then to a pointer-only form with no workflow rows.
 * The gate marker and the barrier legend's advancement clause are always kept. The `[a ∥ b]` group
 * tokens are kept in the compact catalog and in the index with parallel-phase marks; the tiers-only
 * index and the pointer-only form omit them (`start-workflow <id>` loads a workflow's phases), so
 * the wf-cycle W5 runtime-payload check applies barrier-mark parity only to the two marked forms.
 *
 * While routing is OFF the hook delivers a short notice instead of staying silent. The tracked
 * CLAUDE.md/AGENTS.md gate follows TEAM config only, and skill descriptions and per-skill workflow
 * recommendations never read the switch, so a silent hook left every other channel still telling
 * the model to auto-select a workflow after a developer opted out.
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
const GATE_POINTER = 'The routing gate is in the root instruction file.';
const CLAUDE_ROOT_FILE = 'CLAUDE.md';
const ROOT_INSTRUCTION_FILES = Object.freeze([CLAUDE_ROOT_FILE, 'AGENTS.md']);
// Error codes that mean "nothing at this path"; any other failure means a file is there but unreadable.
const ABSENT_CODES = Object.freeze(['ENOENT', 'ENOTDIR']);
// The generators write the gate near the top of the root file; a bounded head read keeps a huge
// root file from costing a full read on every prompt.
const ROOT_HEAD_BYTES = 64 * 1024;
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
 * Read at most ROOT_HEAD_BYTES from the start of a root instruction file.
 * Returns `{ present: false }` when nothing is at the path (ENOENT/ENOTDIR), `{ present: true,
 * head: null }` when something is there but cannot be read as a file (a directory, a permission or
 * lock error), and `{ present: true, head }` otherwise.
 */
function readHead(file) {
    let fd = null;
    try {
        fd = fs.openSync(file, 'r');
        const buffer = Buffer.alloc(ROOT_HEAD_BYTES);
        const read = fs.readSync(fd, buffer, 0, ROOT_HEAD_BYTES, 0);
        return { present: true, head: buffer.toString('utf8', 0, read) };
    } catch (error) {
        return ABSENT_CODES.includes(error && error.code) ? { present: false } : { present: true, head: null };
    } finally {
        if (fd !== null) {
            try { fs.closeSync(fd); } catch { /* already closed */ }
        }
    }
}

/**
 * True when the root instruction files already carry the route gate, so the runtime payload can
 * drop the gate body. Two conditions, both required:
 * - CLAUDE.md exists. Claude hosts that do not fall back to AGENTS.md would otherwise get no gate.
 * - Every root instruction file present (CLAUDE.md for Claude, AGENTS.md for Codex/OpenCode) carries
 *   the marker in its first ROOT_HEAD_BYTES. The hook cannot tell which host runs it. A file that is
 *   present but unreadable counts as not carrying it.
 * Otherwise the body is delivered.
 */
function rootCarriesGate(projectDir) {
    const roots = ROOT_INSTRUCTION_FILES.map(name => ({ name, ...readHead(path.join(projectDir, name)) }));
    if (!roots.some(root => root.name === CLAUDE_ROOT_FILE && root.present)) return false;
    return roots
        .filter(root => root.present)
        .every(root => typeof root.head === 'string' && root.head.includes(GATE_MARKER));
}

/**
 * Build the runtime payload: the compact catalog when it fits PAYLOAD_CAP, otherwise the first
 * pointer-only form that fits (rows with barrier groups → rows with tier only → no rows). The gate
 * (marker or body) and any configured protocol are never dropped, so the last form is returned even
 * when a large protocol keeps it over the cap.
 */
function buildInjection(projectDir, protocolText) {
    const catalogLib = require('../scripts/lib/workflow-skills-catalog.cjs');
    const gate = rootCarriesGate(projectDir)
        ? [GATE_MARKER, GATE_POINTER].join('\n')
        : fs.readFileSync(
            path.join(projectDir, '.claude', 'skills', 'shared', 'workflow-first-gate.md'),
            'utf8'
        ).trim();
    const protocol = buildProtocolSection(protocolText);
    const assemble = catalog => {
        const parts = ['<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', gate, '', catalog];
        if (protocol) parts.push('', protocol);
        parts.push('<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->');
        return parts.join('\n');
    };
    const forms = [
        () => catalogLib.buildWorkflowSkillsCatalog({ rootDir: projectDir, sections: ['workflows', 'skills'], compact: true }),
        ...catalogLib.POINTER_ROWS.map(rows => () => catalogLib.buildWorkflowPointerCatalog({ rootDir: projectDir, rows }))
    ];
    let payload = '';
    for (const build of forms) {
        payload = assemble(build());
        if (payload.length <= PAYLOAD_CAP) return payload;
    }
    return payload;
}

/** The routing-OFF notice: supersedes auto-select text that other context channels still carry. */
function buildOffNotice() {
    return [
        OFF_START,
        '**Workflow auto-routing is OFF here** (`portability.workflowAutoDetect: false`, set in the team project config or in `.claude/.ck.local.json`). This overrides every auto-select instruction in project context, including the WORKFLOW-GATE:',
        '- Do not choose or start a workflow yourself: not through `start-workflow`, a `workflow-*` skill, or a skill step that recommends switching to a workflow (skip that step and continue the skill).',
        '- Run a workflow only when the user explicitly asks for one (a `/start-workflow <id>` or `workflow-*` command, or asking in words).',
        '- Otherwise execute the request directly. Every quality gate, task-planning rule, evidence obligation and confirmation gate still binds.',
        OFF_END
    ].join('\n');
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
            const enabled = routing.isWorkflowAutoDetectEnabled({ rootDir: projectDir });

            let content;
            if (enabled) {
                const protocol = deps.protocol !== undefined ? deps.protocol : resolveProtocolText(routing, projectDir);
                content = deps.content || buildInjection(projectDir, protocol);
            } else {
                content = deps.offContent !== undefined ? deps.offContent : buildOffNotice();
                if (!content) return finish('');
            }
            const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
            const ledger = deps.ledger || require('./lib/convention-ledger.cjs');
            const root = deps.storeRoot || path.join(projectDir, 'tmp', 'workflow-routing');
            const sessionId = input.session_id;
            const scope = ledger.scopeFor(input);
            const history = ledger.transcriptPathFor(input);
            const context = () => ({
                lastCompactionAt: ledger.lastCompactionAt(root, sessionId, scope, input, SETTINGS, now),
                transcriptSize: ledger.transcriptSize(history),
                now
            });

            ledger.maybePrune(root, now);
            if (ledger.isPresent(ledger.readRecord(root, sessionId, scope, RECORD_GROUP), hash, context(), SETTINGS)) {
                return finish('');
            }

            const lock = ledger.lockFile(root, sessionId, scope, RECORD_GROUP);
            const token = ledger.acquireLock(lock, now);
            if (!token) return finish('');
            try {
                if (ledger.isPresent(ledger.readRecord(root, sessionId, scope, RECORD_GROUP), hash, ledger.recheckContext(context()), SETTINGS)) {
                    ledger.releaseLock(lock, token);
                    return finish('');
                }
            } catch {
                ledger.releaseLock(lock, token);
                return finish('');
            }

            const payload = `${content}\n`;
            const write = deps.write || defaultWrite;
            try {
                write(payload, ok => {
                    try {
                        if (ok !== false) {
                            ledger.writeRecordAtomic(root, sessionId, scope, RECORD_GROUP, {
                                hash,
                                deliveredAt: now,
                                transcriptBytes: ledger.transcriptSize(history),
                                form: 'full'
                            });
                        }
                    } catch {
                        /* fail open */
                    } finally {
                        ledger.releaseLock(lock, token);
                    }
                    finish(ok === false ? '' : payload);
                });
            } catch {
                ledger.releaseLock(lock, token);
                finish('');
            }
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
    GATE_POINTER,
    PAYLOAD_CAP,
    buildInjection,
    rootCarriesGate,
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
