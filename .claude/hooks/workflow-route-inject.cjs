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
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'workflow-route-inject';
const RECORD_GROUP = 'workflow-route';
const PROTOCOL_START = '<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->';
const PROTOCOL_END = '<!-- /CK:WORKFLOW-ROUTE-PROTOCOL -->';
const SETTINGS = Object.freeze({
    reinjectAfterBytes: 4500000,
    reinjectAfterMinutes: null,
    blindReinjectAfterMinutes: null,
    compactionMarkers: Object.freeze([])
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

function buildInjection(projectDir, protocolText) {
    const { buildWorkflowSkillsCatalog } = require('../scripts/lib/workflow-skills-catalog.cjs');
    const gate = fs.readFileSync(
        path.join(projectDir, '.claude', 'skills', 'shared', 'workflow-first-gate.md'),
        'utf8'
    ).trim();
    const catalog = buildWorkflowSkillsCatalog({
        rootDir: projectDir,
        sections: ['workflows', 'skills']
    });
    const parts = [
        '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->',
        gate,
        '',
        catalog
    ];
    const protocol = buildProtocolSection(protocolText);
    if (protocol) parts.push('', protocol);
    parts.push('<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->');
    return parts.join('\n');
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
            if (!routing.isWorkflowAutoDetectEnabled({ rootDir: projectDir })) return finish('');

            const protocol = deps.protocol !== undefined ? deps.protocol : resolveProtocolText(routing, projectDir);
            const content = deps.content || buildInjection(projectDir, protocol);
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
                if (ledger.isPresent(ledger.readRecord(root, sessionId, scope, RECORD_GROUP), hash, context(), SETTINGS)) {
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
    buildInjection,
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
