#!/usr/bin/env node
'use strict';

/**
 * docs-staleness-check — does this pull request leave a project doc stale?
 *
 * Maps the change a pull request carries (the branch since its merge base, plus staged, unstaged and
 * untracked files) to the docs it can make stale, through the routing rules of doc-impact-map.cjs, the
 * one owner of "which change rots which doc". An impacted doc passes when this change updates it, or
 * when `/docs-manager --mode=update` verified it fresh for exactly this change and recorded that. Every
 * other impacted doc fails the check, and the message names the doc, the changes that require it and
 * the fix. One merge-base lookup, one diff and one listing; no network, no app start.
 *
 * Usage:
 *   node .claude/scripts/docs-staleness-check.cjs [check] [--base=<ref>] [--json]
 *   node .claude/scripts/docs-staleness-check.cjs record --fresh=<doc> [--fresh=<doc> ...] [--base=<ref>]
 *   node .claude/scripts/docs-staleness-check.cjs check --bypass-reason="<why>"   # only when the user asks
 *
 * `--base` defaults to origin/<pullRequest.targetBranch, default main>; the check never fetches.
 * `record` is how docs-manager records a doc it verified and left unedited (verdict FRESH); it refuses a
 * doc this change does not impact. The record binds to the change's content, so any later edit to a
 * changed file voids it. `--bypass-reason` passes the check and records the reason; use it only when the
 * user explicitly asks to bypass, and copy the printed line into the pull-request body.
 * Records live in <project root>/tmp/docs-staleness/record.json (disposable, never committed).
 *
 * Only docs that exist and are routed by a configured (not heuristic) rule are checked: a heuristic route
 * is a guess, and a doc that does not exist cannot be stale (its owner reports it missing instead).
 *
 * Exit codes: 0 no stale doc (or an explicit bypass) · 1 a stale doc · 2 usage, git or record error, or an
 * invalid project config (it would route nothing, so it never passes).
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { isMapAreaDoc } = require('./lib/feature-map.cjs');

const RECORD_PATH = ['tmp', 'docs-staleness', 'record.json'];
const SHOWN_CHANGES = 5;

/** The docs a mapped change can make stale and the check holds it to. */
function checkedDocs(mapped) {
    return mapped.docs.filter(doc => doc.exists && !doc.heuristicOnly);
}

/**
 * The content identity of a change: each changed path, its status and the bytes it has now. A record
 * made for one identity says nothing about another, so editing any changed file voids it.
 */
function changeFingerprint(rows, root) {
    const hash = crypto.createHash('sha256');
    for (const row of [...rows].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))) {
        let content = 'absent';
        try {
            content = crypto
                .createHash('sha256')
                .update(fs.readFileSync(path.join(root, row.file)))
                .digest('hex');
        } catch {
            /* deleted or unreadable: the status and path still identify it */
        }
        hash.update(`${row.status}\t${row.file}\t${content}\n`);
    }
    return hash.digest('hex');
}

/**
 * The verdict. `rows` are `{ status, file }` changes, `mapped` is doc-impact-map's `mapChanges` result,
 * `record` the stored record (or null). A doc passes when the change updates it (any status but D) or
 * the record for this exact change lists it as verified fresh.
 */
function evaluate({ rows, mapped, record, fingerprint, bypassReason = '' }) {
    const updatedFiles = rows.filter(row => row.status !== 'D').map(row => row.file);
    const updated = new Set(updatedFiles);
    // A split document is updated through any of its parts (the feature map's per-area docs).
    const updatesDoc = doc => updated.has(doc) || updatedFiles.some(file => isMapAreaDoc(doc, file));
    const fresh = record && record.fingerprint === fingerprint && Array.isArray(record.fresh) ? new Set(record.fresh) : new Set();
    const docs = checkedDocs(mapped);
    const stale = [];
    const passed = [];
    for (const doc of docs) {
        if (updatesDoc(doc.doc)) passed.push({ doc: doc.doc, how: 'updated in this change' });
        else if (fresh.has(doc.doc)) passed.push({ doc: doc.doc, how: 'verified fresh by docs-manager for this change' });
        else {
            stale.push({
                doc: doc.doc,
                reasons: doc.reasons,
                changedFiles: doc.changedFiles,
                scanTarget: doc.scanTarget || null
            });
        }
    }
    // A bypass covers stale docs only: with none, there is nothing to bypass and nothing to record.
    const reason = String(bypassReason || '').trim();
    const bypass = reason && stale.length ? { reason, prLine: `Docs staleness: bypassed at user request — ${reason}` } : null;
    return {
        status: stale.length === 0 ? 'PASS' : bypass ? 'BYPASSED' : 'FAIL',
        checked: docs.length,
        stale,
        passed,
        ...(bypass ? { bypass } : {})
    };
}

/** One actionable message per stale doc: the doc, the changes that require it, and the fix. */
function staleMessage(item) {
    const shown = item.changedFiles.slice(0, SHOWN_CHANGES).join(', ');
    const more = item.changedFiles.length > SHOWN_CHANGES ? ` (+${item.changedFiles.length - SHOWN_CHANGES} more)` : '';
    const owner = item.scanTarget ? `; its owner is /${item.scanTarget}` : '';
    return (
        `${item.doc} may be stale: ${item.reasons.join('; ')}. Changed: ${shown}${more}. ` +
        `Fix: run /docs-manager --mode=update over this change, or update ${item.doc} yourself${owner}. ` +
        `If it is verified and needs no edit, record that: node .claude/scripts/docs-staleness-check.cjs record --fresh=${item.doc}`
    );
}

function renderText(result) {
    const lines = [];
    const scope = `base ${result.base}, ${result.changedFileCount} changed file(s), ${result.checked} impacted doc(s)`;
    if (result.status === 'PASS') lines.push(`docs-staleness: PASS (${scope})`);
    else if (result.status === 'BYPASSED')
        lines.push(`docs-staleness: BYPASSED at user request (${scope}) — put this line in the PR body: ${result.bypass.prLine}`);
    else lines.push(`docs-staleness: FAIL — ${result.stale.length} impacted doc(s) not updated in this change (${scope})`);
    for (const item of result.stale) lines.push(`- ${staleMessage(item)}`);
    for (const item of result.passed) lines.push(`  ok ${item.doc} — ${item.how}`);
    if (result.status === 'FAIL') {
        lines.push('Bypass only when the user explicitly asks: rerun with --bypass-reason="<their reason>" and record the printed line in the PR body.');
    }
    return lines.join('\n');
}

function parseArgs(argv) {
    const options = { command: 'check', fresh: [], json: false };
    const args = [...argv];
    if (args[0] === 'check' || args[0] === 'record') options.command = args.shift();
    for (const arg of args) {
        let match;
        if (arg === '--json') options.json = true;
        else if ((match = /^--base=(.+)$/.exec(arg))) options.base = match[1];
        else if ((match = /^--fresh=(.+)$/.exec(arg))) options.fresh.push(match[1].replace(/\\/g, '/'));
        else if ((match = /^--bypass-reason=([\s\S]*)$/.exec(arg))) {
            if (!match[1].trim()) throw new Error('--bypass-reason needs the reason the user gave');
            options.bypassReason = match[1].trim();
        } else throw new Error(`Unsupported argument: ${arg}`);
    }
    if (options.command === 'record' && !options.fresh.length) throw new Error('record needs at least one --fresh=<doc>');
    if (options.command === 'record' && options.bypassReason) throw new Error('--bypass-reason belongs to check, not record');
    return options;
}

function readRecord(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function writeRecord(file, record) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
}

function run(argv, { env = process.env, cwd = process.cwd() } = {}) {
    const options = parseArgs(argv);
    const root = resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
    const mapper = require('./doc-impact-map.cjs');
    // Routing comes from the project config: an unreadable or invalid one would route nothing and pass
    // every change, so it stops the check. A missing config is supported and uses portable defaults.
    const status = require('../hooks/lib/project-config-loader.cjs').getProjectConfigStatus();
    if (status.state === 'invalid') {
        throw new Error(
            `the project config is invalid, so doc routing cannot be trusted (${status.errors[0] || 'unknown error'}). Fix it with /project-config.`
        );
    }
    const config = status.config || {};
    const base = options.base || `origin/${(config.pullRequest && config.pullRequest.targetBranch) || 'main'}`;
    const collected = mapper.collectBranchChanges(base);
    if (!collected.rows) throw new Error(`${collected.source}. Pass --base=<ref> naming the pull request's target (the check never fetches).`);
    // The record itself is never part of the change, even where tmp/ is not git-ignored.
    const rows = collected.rows.filter(row => row.file !== RECORD_PATH.join('/'));
    const mapped = mapper.mapChanges(rows, config);
    const fingerprint = changeFingerprint(rows, root);
    const recordFile = path.join(root, ...RECORD_PATH);
    const stored = readRecord(recordFile);
    const current = stored && stored.fingerprint === fingerprint ? stored : null;

    if (options.command === 'record') {
        const impacted = new Set(checkedDocs(mapped).map(doc => doc.doc));
        const unknown = options.fresh.filter(doc => !impacted.has(doc));
        if (unknown.length) throw new Error(`not impacted by this change, so there is nothing to record: ${unknown.join(', ')}`);
        const fresh = [...new Set([...((current && current.fresh) || []), ...options.fresh])].sort();
        writeRecord(recordFile, { fingerprint, base, mergeBase: collected.mergeBase, fresh, ...(current && current.bypass ? { bypass: current.bypass } : {}) });
        return { exitCode: 0, output: { status: 'RECORDED', base, fresh, record: RECORD_PATH.join('/') } };
    }

    const verdict = evaluate({ rows, mapped, record: current, fingerprint, bypassReason: options.bypassReason });
    if (verdict.bypass) {
        writeRecord(recordFile, { fingerprint, base, mergeBase: collected.mergeBase, fresh: (current && current.fresh) || [], bypass: verdict.bypass });
    }
    const output = { base, source: collected.source, changedFileCount: rows.length, ...verdict };
    return { exitCode: verdict.status === 'FAIL' ? 1 : 0, output, json: options.json };
}

module.exports = { evaluate, checkedDocs, changeFingerprint, staleMessage, renderText, parseArgs, run };

if (require.main === module) {
    try {
        const { exitCode, output, json } = run(process.argv.slice(2));
        process.stdout.write(`${json || output.status === 'RECORDED' ? JSON.stringify(output, null, 2) : renderText(output)}\n`);
        process.exitCode = exitCode;
    } catch (error) {
        process.stderr.write(`docs-staleness-check: ${error.message}\n`);
        process.exitCode = 2;
    }
}
