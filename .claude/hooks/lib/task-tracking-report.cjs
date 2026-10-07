'use strict';

const fs = require('node:fs');
const { trackingContext } = require('./task-tracking-config.cjs');
const { readProgress } = require('./task-progress-reader.cjs');
const { stableValue } = require('./task-artifact-store.cjs');
const { fail, hash, readBytes, scopedPath, publishBytes } = require('./task-tracking-files.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { openReport } = require('../../scripts/open-report.cjs');

const REPORT_PATH = 'tmp/task-tracking/project-status.html';
const OWNER = '<!-- task-track-generated:v1 -->';
const EMPTY_HASH = '0'.repeat(64);
// A status report is as large as the selected project makes it: it is generated output, not a record, so the record byte
// budget does not apply to writing it, replacing it or reading it back. Its inputs stay bounded by the read budgets.
const REPORT_BYTES = Number.POSITIVE_INFINITY;
const MANIFEST = /<script id="task-track-manifest" type="application\/json">([^<]*)<\/script>/;
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// The manifest is the first such element in a report; record content is escaped and cannot form one before it.
const withManifest = (html, manifest) => html.replace(MANIFEST, () => `<script id="task-track-manifest" type="application/json">${json(manifest)}</script>`);

function reportPath(options = {}) {
    return options.ref !== undefined || options.groupId !== undefined
        ? `tmp/task-tracking/project-status-${hash(stableValue({ ref: options.ref || null, groupId: options.groupId || null })).slice(0, 20)}.html`
        : REPORT_PATH;
}

function inspectReport(root, relative = REPORT_PATH) {
    try {
        const bytes = readBytes(root, relative, REPORT_BYTES);
        const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const match = html.match(MANIFEST);
        if (!/^<!doctype html>/i.test(html) || !html.includes(OWNER) || !match) fail('HUMAN_COLLISION', 'Existing report has no verifiable generated owner; preserve it');
        const manifest = JSON.parse(match[1]);
        if (manifest.schemaVersion !== 1 || manifest.rootIdentity !== hash(fs.realpathSync(root)) || !/^[a-f0-9]{64}$/.test(manifest.outputHash)) fail('HUMAN_COLLISION', 'Report provenance is unsupported; preserve it');
        const normalized = withManifest(html, { ...manifest, outputHash: EMPTY_HASH });
        if (hash(normalized) !== manifest.outputHash) fail('HUMAN_COLLISION', 'Report was edited outside its renderer; preserve it');
        return { manifest, contentHash: hash(bytes) };
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        if (error.code) throw error;
        fail('HUMAN_COLLISION', 'Existing report is not a verifiable generated artifact; preserve it');
    }
}

async function ensureReport(root, options = {}) {
    const context = trackingContext(root);
    if (!context.report.enabled) return { kind: 'report', status: 'skipped', reason: 'Project report generation is disabled' };
    const relative = reportPath(options);
    return withTrackingLock(context.root, () => {
        const currentContext = trackingContext(context.root);
        if (!currentContext.report.enabled) return { kind: 'report', status: 'skipped', reason: 'Project report generation is disabled' };
        const existing = inspectReport(context.root, relative);
        if (options.initializedOnly && !existing) return { kind: 'report', status: 'skipped', reason: 'No report initialized; open project status to create it' };
        const snapshot = readProgress(context.root, options);
        if (!snapshot.profile.available || snapshot.coverage === 'unavailable') fail('UNAVAILABLE_REPORT', 'Selected profile has no proved read-only report capability; prior output preserved');
        const identity = { schemaVersion: 1, rootIdentity: hash(context.root), scope: options.ref === undefined ? 'worktree' : `shared:${options.ref}`,
            groupId: options.groupId || null, fingerprint: snapshot.fingerprint,
            rendererVersion: 5, policyIdentity: hash(stableValue(currentContext.report)) };
        if (existing && Object.entries(identity).every(([key, value]) => existing.manifest[key] === value)) {
            return { kind: 'report', status: 'current', path: relative, fingerprint: snapshot.fingerprint, coverage: snapshot.coverage };
        }
        const { renderReport } = require('../../skills/task-track/lib/report-view.cjs');
        const manifest = { ...identity, generatedAt: snapshot.asOf, outputHash: EMPTY_HASH };
        // Rendered once: the output hash covers the report with an empty hash in its manifest, which is then filled in.
        const unsigned = renderReport(snapshot, manifest);
        manifest.outputHash = hash(unsigned);
        const html = Buffer.from(withManifest(unsigned, manifest));
        const reread = readProgress(context.root, options);
        if (reread.fingerprint !== snapshot.fingerprint || reread.coverage === 'unavailable') fail('CONFLICT', 'Selected sources changed before report publication; retry explicitly');
        publishBytes(context.root, relative, html, existing?.contentHash || null, REPORT_BYTES);
        return { kind: 'report', status: 'generated', path: relative, fingerprint: snapshot.fingerprint, coverage: snapshot.coverage };
    });
}

/**
 * The current report for a scope together with its text, for a viewer that shows it in place instead of opening the file.
 * It is the same generated artifact: ensured first, then read back and checked against the result just returned.
 */
async function ensureReportDocument(root, options = {}) {
    const report = await ensureReport(root, options);
    if (!['current', 'generated'].includes(report.status)) return { report };
    const context = trackingContext(root);
    const bytes = readBytes(context.root, report.path, REPORT_BYTES);
    const artifact = inspectReport(context.root, report.path);
    if (!artifact || artifact.contentHash !== hash(bytes) || artifact.manifest.fingerprint !== report.fingerprint) fail('CONFLICT', 'Report changed before it could be shown; reread');
    return { report: { ...report, generatedAt: artifact.manifest.generatedAt }, html: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}

async function refreshInitializedReport(root) {
    try {
        const context = trackingContext(root);
        if (!context.report.enabled || !context.report.autoRefresh) return { kind: 'report', status: 'skipped', reason: 'Automatic report refresh is disabled' };
        return await ensureReport(root, { initializedOnly: true });
    } catch (error) {
        return { kind: 'report', status: 'pending', code: error.code || 'IO_FAILURE', reason: 'Primary item save retained; report refresh needs explicit recovery' };
    }
}

async function ensureAndOpenReport(root, options = {}) {
    const report = await ensureReport(root, options);
    if (!['current', 'generated'].includes(report.status)) return { report, launch: { status: 'skipped', reason: report.reason } };
    const context = trackingContext(root);
    const current = readProgress(root, options);
    const artifact = inspectReport(context.root, report.path);
    if (artifact?.manifest.fingerprint !== current.fingerprint) fail('CONFLICT', 'Report changed or became stale before launch; reread');
    const launched = openReport(scopedPath(context.root, report.path), { cwd: context.root,
        env: { ...process.env, CLAUDE_PROJECT_DIR: context.root }, log: () => {} });
    return { report, launch: { status: launched.opened ? 'requested' : 'not-opened', reason: launched.reason,
        path: launched.file || report.path, observedViewer: 'unverified' } };
}

module.exports = { REPORT_PATH, reportPath, inspectReport, ensureReport, ensureReportDocument, refreshInitializedReport, ensureAndOpenReport };
