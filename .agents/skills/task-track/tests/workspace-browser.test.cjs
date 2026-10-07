#!/usr/bin/env node
'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { ensureReport, inspectReport, reportPath } = require('../../../hooks/lib/task-tracking-report.cjs');
const { git, earlierProject } = require('../../../hooks/tests/lib/task-tracking-fixture.cjs');
const { journalPath } = require('../../../hooks/lib/task-tracking-vocabulary.cjs');
const { VIEWPORTS, browserRuntime, createEvidence, withWorkspace, waitForSignal } = require('./browser-support.cjs');

const MAIN_OWNER = 'WorkTracking/README.TaskTracking.md';
const SECOND_OWNER = 'WorkTracking/README.TaskTracking-Part2.md';
const VOCABULARY_OWNER = 'WorkTracking/README.TaskTracking-Part7.md';
const selectedPane = page => page.getByRole('region', { name: 'Selected work', exact: true });
// Standing conditions of the selected source sit in their own region above every view.
const sourceConditions = page => page.getByRole('region', { name: 'Source conditions', exact: true });
const CURRENT_KIND_NAMES = ['Initiative', 'Project group', 'Story', 'Subtask', 'Task'];
// Display words of the earlier vocabulary. Identities and locations may keep them; nothing a view names may.
const EARLIER_DISPLAY_WORDS = /\b(?:PBIs?|Backlog|Epics?|Ideas?)\b/;
// A record written by hand at a location only the current vocabulary uses; beside earlier-vocabulary work it makes the project hold both.
const HAND_WRITTEN_GROUP = 'work/projects/G.md';
const HAND_WRITTEN_BYTES = '---\nid: G\ntitle: Hand-written group\nintent: Keep an authored outcome\nstatus: draft\n---\nAuthored body stays as written.\n';
// Two vocabularies at once, or a migration that stopped part-way: every view states that nothing is shown, and shows nothing.
function unreadableProject(caseId, variant, name, arrange, reason) {
    return { caseId, owner: VOCABULARY_OWNER, variant, name,
        setup: async f => { await earlierProject(f); arrange(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const stored = f.storedState();
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), reason);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await page.locator('.tab-count').count(), 0, 'No tab carries a count');
            await capture(variant, 'The named reason stands above a view that shows no work, count, percentage or report');
            for (const [view, title] of [['Work', 'Work'], ['My work', 'My work'], ['People', 'People'], ['Changes', 'Changes and sharing'], ['Report', 'Status report'], ['Overview', 'Project progress']]) {
                await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click();
                await page.getByRole('heading', { name: title, exact: true }).waitFor();
                const shown = await page.getByRole('main').innerText();
                assert.match(shown, /No work, count or report is shown while this source cannot be read\./);
                assert.equal(/\d+ (?:eligible|matching|open|records?)|\d%|PBI-\d|Responsible for/.test(shown), false, `${view} shows no count, percentage or work`);
                assert.equal(await page.locator('iframe.report-frame').count(), 0, `${view} shows no report`);
                await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            }
            // The source can still be changed from any view: on Changes the selector opens the panel, as the page holds no form of its own.
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.locator('[data-opens="scope-ref"]').click();
            await page.getByRole('heading', { name: 'Source and scope', exact: true }).waitFor();
            assert.equal(await isFocused(page.getByLabel('Shared local Git ref (optional)', { exact: true })), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Open the project; visit every view; open the source panel from Changes');
        } };
}
async function selectWork(page, id, transitions) {
    await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: new RegExp(`^${id}:`) }).click();
    await selectedPane(page).getByRole('heading', { name: new RegExp(`^${id}:`) }).waitFor();
    transitions(`Inspect ${id}`);
}
const isFocused = locator => locator.evaluate(node => node === document.activeElement);
async function saveReviewed(page, transitions) {
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
    assert.equal(await isFocused(page.getByRole('heading', { name: 'Review this exact change', exact: true })), true, 'A preview puts the reader on what it produced');
    transitions('Preview exact change');
    await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('status').getByText(/Saved .* in the local checkout/).waitFor();
    transitions('Save reviewed change');
}

// Each declaration carries its actual canonical owner/case and a bounded partial-case variant.
// GIVEN valid public-core work; WHEN real browser actions; THEN final canonical and visible outcomes.
const tests = [
    { caseId: 'TC-TPT-065', owner: SECOND_OWNER, variant: 'shared-owner-comparison', name: 'Shared comparison labels pinned and current owners without changing acceptance or publishing',
        setup: async f => {
            f.write('src/export.js', 'export const version = 1;\n');
            await f.create(); await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] }); await f.accepted();
            git(f, ['init']); git(f, ['add', 'docs', 'work', 'src']); git(f, ['commit', '-m', 'Synthetic shared baseline']);
            f.sharedComparison = { ref: git(f, ['rev-parse', 'HEAD']), ownerPath: f.record('TASK-101').ownerPath, bytes: f.bytes('TASK-101'), item: f.view('TASK-101') };
            await f.saved('assign', 'TASK-101', { assigneeId: 'peer' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const baseline = f.sharedComparison; const local = f.view('TASK-101'); const before = f.bytes('TASK-101');
            const assertPinnedSource = async () => {
                await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
                await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
                const summary = page.getByText('Scope and source identities', { exact: true }); await summary.click();
                const identity = JSON.parse(await summary.locator('..').locator('pre').innerText());
                assert.equal(identity.source.kind, 'shared'); assert.equal(identity.source.ref, baseline.ref);
                assert.equal(identity.source.oid, baseline.ref); assert.equal(identity.source.remoteFreshness, 'unknown');
                await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
                await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
                assert.match(await page.locator('#source-context').innerText(), /Pinned local Git baseline/);
                assert.equal(await page.getByLabel('Shared local Git ref (optional)', { exact: true }).inputValue(), baseline.ref);
            };
            assert.deepEqual(local.acceptanceHistory, baseline.item.acceptanceHistory);
            assert.deepEqual(local.proofs, baseline.item.proofs);
            await open();
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(baseline.ref);
            await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            await assertPinnedSource();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope.*Remote freshness: unknown/);
            await capture('shared-baseline', 'Pinned shared source and unknown remote freshness are labelled without changing local work');
            const compare = async () => {
                await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
                const summary = page.getByText('TASK-101: owner difference', { exact: true }); await summary.waitFor(); await summary.click();
                const difference = JSON.parse(await summary.locator('..').locator('pre').innerText());
                assert.equal(difference.selected.assigneeId, 'owner'); assert.equal(difference.current.assigneeId, 'peer');
                assert.deepEqual(difference.selected.acceptanceHistory, baseline.item.acceptanceHistory);
                assert.deepEqual(difference.current.acceptanceHistory, baseline.item.acceptanceHistory);
                assert.deepEqual(difference.selected.proofs, baseline.item.proofs); assert.deepEqual(difference.current.proofs, baseline.item.proofs);
                await assertPinnedSource();
                assert.deepEqual(f.bytes('TASK-101'), before);
                return difference;
            };
            await compare();
            await capture('shared-owner-difference', 'Pinned owner and current proposal differ while proof and acceptance remain separate conserved facts');
            f.write('src/export.js', 'export const version = 2;\n');
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            const stale = await compare();
            assert.equal(stale.selected.verification.status, 'current'); assert.equal(stale.current.verification.status, 'stale');
            assert.deepEqual(stale.current.history, local.history);
            await capture('shared-stale-proof', 'Current source edit makes local proof stale while the pinned shared proof and history remain intact');
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: generated/).waitFor();
            const artifact = inspectReport(f.root, reportPath({ ref: baseline.ref }));
            assert.equal(artifact.manifest.scope, `shared:${baseline.ref}`);
            assert.equal(artifact.manifest.fingerprint, f.progress({ ref: baseline.ref }).fingerprint);
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill('missing-shared-baseline');
            // Enter in the ref field inspects the selected scope, as its button does.
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).press('Enter');
            await page.getByRole('status').getByText(/The selected source is unavailable/).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('shared-unavailable', 'An unavailable selected ref stays unavailable and does not silently substitute the current checkout');
            await page.getByRole('button', { name: 'Inspect current checkout', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Local working copy; proposals may be unshared/);
            assert.equal(f.view('TASK-101').assigneeId, 'peer'); assert.deepEqual(f.bytes('TASK-101'), before);
            assert.equal(git(f, ['show', `${baseline.ref}:${baseline.ownerPath}`]), baseline.bytes.toString('utf8').trim());
            await capture('shared-current-recovery', 'Only an explicit current-checkout selection recovers local proposal inspection; all canonical bytes remain unchanged');
            transitions('Inspect pinned source; compare local owner; reread after real source edit; refresh selected report; refuse missing ref; explicitly recover current checkout');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'initial-session-recovery', name: 'Unavailable and unsupported initial sessions retain a real recovery path without exposing incomplete identity',
        expectedConsole: [/Failed to load resource.*503/], setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.bytes('TASK-101'); let requests = 0;
            await page.route('**/api/session', async route => {
                requests++;
                if (requests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ reason: 'Temporary session read failure' }) });
                if (requests === 2) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 2, snapshot: {} }) });
                return route.continue();
            });
            await open();
            for (const state of ['session-unavailable', 'session-unsupported']) {
                await page.getByRole('heading', { name: 'Project could not be opened', exact: true }).waitFor();
                assert.equal(await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).count(), 0);
                assert.equal(await page.getByRole('button', { name: 'Retry opening project', exact: true }).isEnabled(), true);
                assert.equal(new URL(page.url()).hash, ''); assert.deepEqual(f.bytes('TASK-101'), before);
                await capture(state, 'Opening failure retains a useful launch Retry and exposes no partially hydrated navigation');
                await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
                await page.locator('main[aria-busy="false"]').waitFor();
            }
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(requests, 3);
            assert.equal(await page.locator('#root-context').innerText(), `Checkout: ${f.root}`);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\)/);
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal(await isFocused(page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true })), true, 'A reread leaves the reader on the control that asked for it');
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('session-recovered', 'Real session Retry establishes checkout and actor; subsequent inspection preserves canonical work');
            transitions('Retry failed session; reject unsupported session; Retry real session; Reread established project');
        } },
    { caseId: 'TC-TPT-051', owner: MAIN_OWNER, variant: 'pending-read', name: 'Loading is observable until the real session read settles without writing',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture }) => {
            const before = f.bytes('TASK-101');
            let release;
            const admitted = new Promise(resolve => { release = resolve; });
            // Transport latency can occur after the real server completes a read; no fabricated response or sleep.
            await page.route('**/api/session', async route => { const response = await route.fetch(); await admitted; await route.fulfill({ response }); });
            const opening = open();
            try {
                await page.getByRole('heading', { name: 'Opening project', exact: true }).waitFor();
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                assert.equal(await page.getByRole('main').getAttribute('aria-busy'), 'true');
                assert.deepEqual(f.bytes('TASK-101'), before);
                await capture('loading', 'Pending selected-project read is visible without a success claim');
            } finally { release(); await opening; }
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
        } },
    { caseId: 'TC-TPT-052', owner: MAIN_OWNER, variant: 'complete-empty', name: 'A complete empty project invites capture without claiming full delivery',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture }) => {
            await open();
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByText('No work records were found in this complete inspection. Capture an initiative or task to begin.', { exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isEnabled(), true);
            assert.equal(f.records().length, 0);
            await capture('empty', 'Complete empty scope offers authorized capture with no delivery percentage');
        } },
    { caseId: 'TC-TPT-054', owner: MAIN_OWNER, variant: 'required-outcome', name: 'Invalid capture retains entered work and identifies the missing outcome',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Retained unfinished initiative');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).evaluate(control => control.validity.valueMissing), true);
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Retained unfinished initiative');
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0);
            assert.equal(f.records().length, 0);
            await capture('invalid-input', 'Native required-field feedback keeps the entered title and does not save');
        } },
    { caseId: 'TC-TPT-055', owner: MAIN_OWNER, variant: 'native-unproved', name: 'An unproved native profile remains unavailable and preserves its source',
        setup: async f => {
            f.write('trackers/index.html', '<html><body>Native project-owned status</body></html>');
            f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/index.html'] }; f.saveConfig();
        },
        fn: async ({ fixture: f, page, open, capture }) => {
            const native = fs.readFileSync(path.join(f.root, 'trackers/index.html'));
            await open({ item: 'TASK-101' });
            await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
            await page.getByText(/native tracking capability is unavailable/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(fs.readFileSync(path.join(f.root, 'trackers/index.html')), native);
            assert.equal(fs.existsSync(path.join(f.root, 'work')), false);
            await capture('native-unavailable', 'Native authority is preserved with visible unavailable capability and safe linked-work recovery');
        } },
    { caseId: 'TC-TPT-056', owner: MAIN_OWNER, variant: 'malformed-owner', name: 'Partial inspection withholds writable controls and preserves unreadable source',
        setup: async f => {
            await f.create();
            // Deliberate imported corruption: a legacy/partial record can exist before this app opens.
            f.badOwner = path.join(path.dirname(f.view('TASK-101').ownerPath), 'partial-import.md');
            f.write(f.badOwner, '---\nid: incomplete-import\n');
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const good = f.bytes('TASK-101'), bad = fs.readFileSync(path.join(f.root, f.badOwner));
            await open();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            await selectWork(page, 'TASK-101', transitions);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).count(), 0);
            assert.deepEqual(f.bytes('TASK-101'), good);
            assert.deepEqual(fs.readFileSync(path.join(f.root, f.badOwner)), bad);
            await capture('partial', 'Inspected work and incomplete-coverage reason remain visible while writes are withheld');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'scope-and-links', name: 'Opening and deep links keep the selected project and write nothing',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture }) => {
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress' }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#root-context').innerText(), /Checkout:/);
            assert.match(await page.locator('#actor-context').innerText(), /owner/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('overview', 'Selected checkout, actor, scope and honest progress are visible');
            await open({ item: 'TASK-101', owner: f.view('TASK-101').ownerPath });
            await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('linked-record', 'One exact selected record is opened without a write');
            await open({ item: 'TASK-missing', owner: f.view('TASK-101').ownerPath });
            await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
            assert.equal(await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect' }).count(), 1);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('missing-link', 'Missing linked work has an explicit recovery path and no guessed owner');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'session-reattach', name: 'A reload stays attached, and a page without a session can only ask for the same selected workspace to be opened again',
        reopenable: true, setup: async f => { await f.create(); },
        fn: async ({ fixture: f, workspace, page, open, capture, transitions, reopened }) => {
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            // WHEN the attached page is reloaded THEN it is still attached and its address carries no credential.
            await page.reload();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#root-context').innerText(), /Checkout:/);
            transitions('Reload the attached workspace');
            await capture('reloaded-attached', 'The reloaded page is still attached to the selected checkout and actor');
            // GIVEN the address opened where no session is kept, as in another tab; THEN nothing of the work is shown.
            await page.evaluate(() => sessionStorage.clear());
            await page.goto('about:blank');
            await page.goto(`${workspace.origin}/`);
            await page.getByRole('heading', { name: 'Workspace session required', exact: true }).waitFor();
            assert.equal(await page.locator('#root-context').innerText(), 'No checkout established');
            assert.equal(await page.locator('#actor-context').innerText(), 'No actor established');
            const shown = await page.locator('body').innerText();
            assert.equal(shown.includes('TASK-101'), false); assert.equal(shown.includes(f.root), false);
            assert.equal(await page.getByRole('navigation').isVisible(), false);
            transitions('Open the workspace address without a session');
            await capture('session-required', 'A page without a session shows no work, names no checkout or actor, and offers to open this workspace');
            // WHEN the person asks for this workspace to be opened; THEN the machine is asked and the page gains nothing.
            await page.getByRole('button', { name: 'Open this workspace', exact: true }).click();
            await page.getByRole('status').getByText(/Asked the default browser to open this workspace in a new, attached tab/).waitFor();
            assert.equal(reopened.length, 1); assert.match(reopened[0], /^http:\/\/127\.0\.0\.1:\d+\/#attach=[A-Za-z0-9_-]{43}$/);
            assert.equal(reopened[0].includes(new URLSearchParams(new URL(workspace.url).hash.slice(1)).get('session')), false);
            assert.equal(await page.getByRole('heading', { name: 'Workspace session required', exact: true }).count(), 1);
            assert.equal(await page.evaluate(() => sessionStorage.length), 0);
            transitions('Ask for this workspace to be opened');
            await capture('reopen-requested', 'The launch outcome is stated; this page is still not attached');
            // WHEN the browser opens the launch link THEN that page attaches, once, and the link leaves the address.
            await page.goto('about:blank');
            await page.goto(reopened[0]);
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#actor-context').innerText(), /owner/);
            transitions('Open the single-use launch link');
            await capture('reattached', 'The launch link attached this page to the same selected checkout');
            // The same link opened again attaches nothing. Its refusal is read on a second page, apart from the monitored one.
            const again = await page.context().newPage();
            try { await again.goto(reopened[0]); await again.getByText(/already been used or has expired/).waitFor();
                assert.equal(await again.locator('#root-context').innerText(), 'No checkout established'); }
            finally { await again.close(); }
            assert.deepEqual(f.bytes('TASK-101'), before);
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'readonly-session', name: 'A read-only launch permits inspection without granting canonical write authority',
        writable: false, setup: async f => { await f.create(); await f.accepted(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN complete accepted work; WHEN launched read-only; THEN inspection conserves all history and receipts.
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: complete/);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\).*Read-only for this scope/);
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByText(/This session is read-only/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            // Reading the exact linked concerns is the one control a read-only selection keeps; nothing that changes work is offered.
            assert.deepEqual(await selectedPane(page).getByRole('button').allInnerTexts(), ['Inspect concerns for TASK-101']);
            assert.equal(await selectedPane(page).getByText('Accepted at a recorded decision', { exact: true }).isVisible(), true);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('readonly-inspection', 'Complete accepted work is inspectable; read-only authority disables capture and withholds every selected-record mutation');
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('heading', { name: 'People', exact: true }).waitFor();
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            transitions('Inspect People; return Overview; reread in the same read-only session');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'duplicate-identity', name: 'Duplicate deep links refuse silent selection while exact owners remain safely inspectable',
        setup: async f => {
            await f.create();
            f.originalOwner = f.view('TASK-101').ownerPath;
            f.duplicateOwner = path.posix.join(path.posix.dirname(f.originalOwner), 'imported-duplicate.md');
            // A legacy import or teammate merge can leave a second valid canonical file with the same identity.
            f.write(f.duplicateOwner, f.bytes('TASK-101'));
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN duplicate owners; WHEN linked by ID or owner; THEN neither silently selects and both retain exact bytes.
            const owners = [f.originalOwner, f.duplicateOwner];
            const before = owners.map(owner => fs.readFileSync(path.join(f.root, owner)));
            for (const [index, fragment] of [{ item: 'TASK-101' }, { item: 'TASK-101', owner: f.originalOwner }].entries()) {
                await open(fragment);
                await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
                await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
                assert.equal(new URL(page.url()).hash, '');
                assert.equal(await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).count(), 0);
                assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
                for (const [ownerIndex, owner] of owners.entries()) assert.deepEqual(fs.readFileSync(path.join(f.root, owner)), before[ownerIndex]);
                await capture(index ? 'duplicate-owner-link' : 'duplicate-id-link', 'Ambiguous identity is refused even with an exact owner path; no record is silently selected');
            }
            for (const owner of owners) {
                await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: /^TASK-101:/ })
                    .filter({ hasText: `Ambiguous identity; owner: ${owner}` }).click();
                await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).waitFor();
                await selectedPane(page).getByText(owner, { exact: true }).waitFor();
                await selectedPane(page).getByText(/Work cannot be changed while inspection is incomplete/).waitFor();
                assert.equal(await selectedPane(page).getByRole('button').count(), 0);
                transitions(`Explicitly inspect duplicate owner ${owner}`);
            }
            await capture('duplicate-owner-inspection', 'Explicitly chosen owner is labelled and inspectable, with mutation controls withheld');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            for (const [ownerIndex, owner] of owners.entries()) assert.deepEqual(fs.readFileSync(path.join(f.root, owner)), before[ownerIndex]);
            await capture('duplicate-overview-recovery', 'Overview recovery discloses partial coverage without granting delivery or altering either canonical owner');
            transitions('Return to Overview after explicit duplicate inspection');
        } },
    { caseId: 'TC-TPT-093', owner: SECOND_OWNER, variant: 'capture-edit', name: 'UI capture and refinement save through the same canonical operations',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work' }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true }).selectOption('task');
            await page.getByLabel('Title', { exact: true }).fill('Export filtered rows');
            await page.getByLabel('Intended outcome', { exact: true }).fill('People export only rows they select');
            await page.getByRole('button', { name: 'Add criterion', exact: true }).click();
            await page.getByLabel('Stable criterion ID', { exact: true }).fill('selected-rows');
            await page.getByLabel('Observable outcome', { exact: true }).fill('Export contains only selected rows');
            await saveReviewed(page, transitions);
            const created = f.records().map(record => f.view(record.id));
            assert.equal(created.length, 1);
            const id = created[0].id;
            assert.equal(created[0].title, 'Export filtered rows');
            assert.equal(created[0].state, 'draft');
            assert.equal(created[0].assigneeId, null);
            assert.equal(created[0].acceptanceHistory.length, 0);
            assert.deepEqual(created[0].criteria, [{ id: 'selected-rows', text: 'Export contains only selected rows' }]);
            await capture('created-draft', 'Saved draft is selected with no implied assignment or acceptance');
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export selected filtered rows');
            await saveReviewed(page, transitions);
            assert.equal(f.view(id).title, 'Export selected filtered rows');
            assert.deepEqual(f.view(id).criteria, created[0].criteria);
            assert.equal(f.view(id).state, 'draft');
            assert.equal(f.view(id).revision, created[0].revision + 1);
            await capture('refined-draft', 'Exact title refinement preserves criteria and draft state');
        } },
    { caseId: 'TC-TPT-094', owner: SECOND_OWNER, variant: 'people-and-start', name: 'Assignment to others and self preserves state until explicit Start',
        setup: async f => { await f.create(); await f.ready(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            for (const owner of ['peer', 'owner']) {
                await selectedPane(page).getByRole('button', { name: 'Assign', exact: true }).click();
                assert.deepEqual(await page.getByLabel('Responsible member').locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'owner', 'peer']);
                await page.getByLabel('Responsible member').selectOption(owner);
                await saveReviewed(page, transitions);
                assert.equal(f.view('TASK-101').assigneeId, owner);
                assert.equal(f.view('TASK-101').state, 'ready');
                assert.equal(f.view('TASK-101').acceptanceHistory.length, 0);
            }
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('button', { name: 'See this work: Owner (owner) — Active; 1 owned records', exact: true }).waitFor();
            await capture('people', 'Responsibility shows one owned record without a performance score');
            await page.getByRole('button', { name: 'See this work: Owner (owner) — Active; 1 owned records', exact: true }).click();
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Start work', exact: true }).click();
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').state, 'in_progress');
            assert.equal(f.view('TASK-101').assigneeId, 'owner');
            assert.equal(f.view('TASK-101').acceptanceHistory.length, 0);
            await capture('started', 'Only explicit reviewed Start moves Ready work to In progress');
        } },
    { caseId: 'TC-TPT-038', owner: MAIN_OWNER, variant: 'reopen-in-progress', name: 'Reopen accepted work uses the portable active state and fresh readiness decisions',
        setup: async f => { await f.create(); await f.accepted(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const history = structuredClone(f.view('TASK-101').acceptanceHistory);
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Reopen in progress', exact: true }).click();
            await page.getByLabel('I reviewed the current scope and acceptance criteria', { exact: true }).check();
            await page.getByLabel('I confirmed required decisions are resolved', { exact: true }).check();
            await page.getByLabel('Reason for this change', { exact: true }).fill('Reopen for an explicit follow-up outcome');
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').state, 'in_progress');
            assert.deepEqual(f.view('TASK-101').acceptanceHistory.slice(0, history.length), history);
            assert.equal(f.view('TASK-101').acceptance.accepted, false);
            await capture('reopened', 'In progress is visible; historical acceptance is retained and current credit withdrawn');
        } },
    { caseId: 'TECH-link-owner', owner: '.claude/skills/task-track/assets/app.js#linksEditor', variant: 'preserve-explicit-target', name: 'All item link roles retain exact identities and only explicit owner switching replaces fields',
        setup: async f => {
            await f.create('TASK-101'); await f.create('TASK-102');
            f.write('src/export.js', 'module.exports = "selected rows";\n');
            await f.saved('link', 'TASK-101', { links: ['dependency', 'parent', 'initiative', 'spec', 'plan', 'source'].map(relation => ({ relation, itemId: 'TASK-102' })) });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const original = structuredClone(f.view('TASK-101').links);
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit links', exact: true }).click();
            // Source-owned stable IDs disambiguate repeated relationship controls; no styling selectors.
            for (let index = 0; index < original.length; index++) {
                if (['spec', 'plan', 'source'].includes(original[index].relation)) assert.equal(await page.locator(`#link-owner-${index}`).inputValue(), 'itemId');
                assert.equal(await page.locator(`#link-${index}`).inputValue(), 'TASK-102');
            }
            await capture('exact-item-links', 'All six relationship roles retain their tracked item target');
            await saveReviewed(page, transitions);
            assert.deepEqual(f.view('TASK-101').links, original);
            await selectedPane(page).getByRole('button', { name: 'Edit links', exact: true }).click();
            await page.locator('#link-owner-5').selectOption('path');
            await page.getByLabel('Public project-relative path', { exact: true }).fill('src/export.js');
            await saveReviewed(page, transitions);
            const switched = f.view('TASK-101').links;
            assert.deepEqual(switched.slice(0, 5), original.slice(0, 5));
            assert.deepEqual(switched[5], { relation: 'source', path: 'src/export.js' });
            assert.equal(Object.hasOwn(switched[5], 'itemId'), false);
            await capture('explicit-path-switch', 'Only the explicitly selected source target is now a public file');
        } },
    { caseId: 'TC-TPT-057', owner: MAIN_OWNER, variant: 'teammate-save', name: 'Conflicts retain the draft until the actor reviews the newer owner',
        expectedConsole: [/Failed to load resource: the server responded with a status of 409/],
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('My retained draft');
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?' }).waitFor();
            await capture('draft-checkpoint', 'Leaving an edited draft asks how to retain it');
            await page.getByRole('button', { name: 'Return to draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'My retained draft');
            await f.saved('update', 'TASK-101', { title: 'Teammate saved title' });
            const current = f.bytes('TASK-101');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('region', { name: 'Conflict recovery' }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'My retained draft');
            assert.deepEqual(f.bytes('TASK-101'), current);
            await capture('conflict', 'Stale preview preserves both the entered draft and teammate save');
            await page.getByRole('button', { name: 'Read current owner', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), current);
            await page.getByLabel('I reviewed the current record against my retained draft', { exact: true }).check();
            await page.getByRole('button', { name: 'Use reviewed current revision', exact: true }).click();
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').title, 'My retained draft');
            assert.equal(f.view('TASK-101').state, 'draft');
            await capture('conflict-recovered', 'An explicitly reviewed fresh intent saves the retained draft');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'lost-save-result', name: 'A lost successful response retries its exact operation without duplicate revision or history',
        expectedConsole: [/Failed to load resource: net::ERR_FAILED/],
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Saved despite lost response');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).waitFor();
            const original = f.view('TASK-101');
            const saves = [];
            let releaseSave, observeSave;
            const saveGate = new Promise(resolve => { releaseSave = resolve; });
            const saveObserved = new Promise(resolve => { observeSave = resolve; });
            // Real response loss: let the real server/core save, then discard only its transport result.
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                saves.push(request);
                if (saves.length === 1) { const response = await route.fetch(); assert.equal(response.status(), 200); observeSave(); await saveGate; await route.abort('failed'); }
                else await route.continue();
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            try {
                await waitForSignal(saveObserved, 'the real admitted save response');
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
                assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
                await capture('saving', 'Pending save response disables repeat submission and makes no confirmed success claim');
            } finally { releaseSave(); }
            await page.getByRole('button', { name: 'Retry original save', exact: true }).waitFor();
            const saved = f.bytes('TASK-101');
            assert.equal(f.view('TASK-101').title, 'Saved despite lost response');
            assert.equal(f.view('TASK-101').revision, original.revision + 1);
            await capture('unknown-save', 'Unconfirmed transport retains the original request and offers its exact retry');
            await page.getByRole('button', { name: 'Read current without resaving', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.equal(saves.length, 1);
            assert.deepEqual(f.bytes('TASK-101'), saved);
            await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
            await page.getByRole('status').getByText(/original receipt replayed/).waitFor();
            assert.equal(saves.length, 2);
            assert.deepEqual(saves[1], saves[0]);
            assert.deepEqual(f.bytes('TASK-101'), saved);
            await capture('receipt-replayed', 'Original receipt replay confirms one save without growing history or revision');
            transitions('Lose save result; read separately; retry original identity');
        } },
    { caseId: 'TC-TPT-049', owner: MAIN_OWNER, variant: 'ten-outcomes-filter-print', name: 'Filters and print preserve four accepted out of ten with three currently verified',
        setup: async f => {
            for (let index = 101; index <= 110; index++) { await f.create(`TASK-${index}`, 'task', { title: `Export outcome ${index}` }); if (index <= 104) await f.accepted(`TASK-${index}`); }
            f.write('src/export.js', 'module.exports = "new scoped source";\n');
            await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            await open();
            assert.match(await page.getByRole('main').innerText(), /10 eligible unique tasks/);
            assert.match(await page.getByRole('main').innerText(), /4 historical scoped acceptance/);
            assert.match(await page.getByRole('main').innerText(), /3 accepted tasks with proof that still applies/);
            assert.match(await page.getByRole('main').innerText(), /40\.0%/);
            // The drawn summaries restate the same counted facts; none may add or drop a record.
            assert.equal(await page.getByRole('img', { name: '10 tasks, one block each: 3 accepted with current proof; 1 accepted, proof not current; 6 not accepted yet', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Draft: 6 records. Show them in Work.', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Done: 4 records. Show them in Work.', exact: true }).count(), 1);
            const waiting = page.getByRole('region', { name: 'Waiting on a person', exact: true });
            assert.equal(await waiting.getByText('Accepted, proof not current', { exact: true }).count(), 1);
            assert.equal(await waiting.getByRole('button', { name: /^Open TASK-/ }).count(), 1);
            assert.equal(await waiting.getByRole('button', { name: /^Open TASK-101:/ }).count(), 1);
            await capture('honest-progress', 'Four of ten accepted, three currently verified and six remaining are separate facts');
            await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).click();
            await page.getByText('6 matching records; progress scope remains the project.', { exact: true }).waitFor();
            await page.getByLabel('Find work', { exact: true }).fill('No matching outcome');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            // The count is a status of its own, and typing in a filter keeps the reader in that filter.
            assert.equal(await page.getByRole('status').getByText('0 matching records; progress scope remains the project.', { exact: true }).count(), 1);
            assert.equal(await isFocused(page.getByLabel('Find work', { exact: true })), true);
            await capture('filter-empty', 'No matching work has clear recovery and does not redefine project progress');
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByText('10 matching records; progress scope remains the project.', { exact: true }).waitFor();
            assert.equal(await isFocused(page.getByRole('button', { name: 'Clear filters', exact: true })), true, 'Clearing filters redraws the view and keeps the reader on the control');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.emulateMedia({ media: 'print' });
            assert.match(await page.getByRole('main').innerText(), /40\.0%/);
            assert.match(await page.getByRole('main').innerText(), /3 accepted tasks with proof that still applies/);
            await capture('print-progress', 'Print preserves labelled source, denominator, acceptance and current proof');
            await page.emulateMedia({ media: 'screen' });
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Inspect remaining; search to empty; clear filters; return Overview; print');
        } },
    { caseId: 'TC-TPT-079', owner: SECOND_OWNER, variant: 'board-grouping', name: 'Board grouping shows the same filtered records by recorded state and leaves work and the delivery scope unchanged',
        setup: async f => {
            await f.create();
            await f.create('TASK-102', 'task', { title: 'Blocked outcome' }); await f.active('TASK-102');
            await f.saved('transition', 'TASK-102', { state: 'blocked', reason: 'Awaiting a sample file' });
            await f.create('TASK-103', 'task', { title: 'Accepted outcome' }); await f.accepted('TASK-103');
            await f.create('TASK-104', 'task', { title: 'Canceled outcome' }); await f.saved('transition', 'TASK-104', { state: 'canceled', reason: 'Outside this release' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN draft, blocked, accepted and canceled work; WHEN the reader regroups, opens and filters it; THEN lanes follow recorded state and no canonical byte or scope count changes.
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const workList = page.getByRole('region', { name: 'Work list', exact: true });
            const lane = name => workList.getByRole('list', { name, exact: true });
            const layout = name => page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name, exact: true });
            await open();
            const denominator = (await page.getByRole('main').innerText()).match(/\d+ eligible unique tasks; \d+ canceled and \d+ retired excluded/)[0];
            assert.equal(denominator, '3 eligible unique tasks; 1 canceled and 0 retired excluded');
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByText('4 matching records; progress scope remains the project.', { exact: true }).waitFor();
            await layout('Board').click();
            await lane('Draft: 1 records').getByRole('button', { name: /^TASK-101:/ }).waitFor();
            assert.equal(await lane('In progress: 1 records').getByRole('button', { name: /^TASK-102:/ }).filter({ hasText: 'Blocked' }).count(), 1);
            assert.equal(await lane('Done: 1 records').getByRole('button', { name: /^TASK-103:/ }).count(), 1);
            assert.equal(await lane('Off the line: 1 records').getByRole('button', { name: /^TASK-104:/ }).count(), 1);
            for (const empty of ['Planned', 'Ready', 'Verifying']) assert.equal(await lane(`${empty}: 0 records`).getByRole('button').count(), 0);
            assert.equal(await workList.getByRole('button', { name: /^TASK-10[1-4]:/ }).count(), 4);
            assert.equal(await page.getByText('4 matching records; progress scope remains the project.', { exact: true }).count(), 1);
            assert.equal(await page.locator('[draggable="true"]').count(), 0);
            await capture('board-grouped', 'The same four records are grouped by recorded state; blocked work waits in In progress and canceled work is off the line');
            await lane('In progress: 1 records').getByRole('button', { name: /^TASK-102:/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-102:/ }).waitFor();
            await selectedPane(page).getByText(/Blocked: Awaiting a sample file/).waitFor();
            await capture('board-record', 'A board card opens the same record sheet with its blocker and lifecycle actions');
            await page.getByLabel('Find work', { exact: true }).fill('Accepted outcome');
            await page.getByText('1 matching records; progress scope remains the project.', { exact: true }).waitFor();
            assert.equal(await lane('Done: 1 records').getByRole('button', { name: /^TASK-103:/ }).count(), 1);
            assert.equal(await lane('Draft: 0 records').getByRole('button').count(), 0);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await layout('List').click();
            assert.equal(await workList.getByRole('button', { name: /^TASK-10[1-4]:/ }).count(), 4);
            assert.equal(await workList.getByRole('list', { name: /records$/ }).count(), 0);
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.ok((await page.getByRole('main').innerText()).includes(denominator));
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Switch to board; open a card; filter; clear; return to list and Overview');
        } },
    { caseId: 'TC-TPT-062', owner: SECOND_OWNER, variant: 'offline-empty-and-limited', name: 'Offline empty scope offers capture recovery while partial and unavailable scopes retain truthful limits',
        setup: async () => {},
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const report = await ensureReport(f.root);
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByText('No tracked work yet', { exact: true }).waitFor();
            assert.equal(await page.locator('#detail-empty').isVisible(), false);
            assert.equal(await page.locator('.people').isVisible(), false);
            assert.equal(await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).isVisible(), false);
            for (const selector of ['#work-search', '#work-owner', '#work-state', '#work-remaining']) {
                assert.equal(await page.locator(selector).count(), 1);
                assert.equal(await page.locator(selector).isVisible(), false);
            }
            // The source strip sets each label above its value, so the two facts are matched across the line break and whatever case the label is drawn in.
            assert.match(await page.getByRole('region', { name: 'Snapshot source', exact: true }).innerText(), /coverage\s+complete, 0 records inspected.*shared freshness\s+unknown/si);
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /no percentage applies/);
            assert.equal(f.records().length, 0);
            await capture('offline-empty', 'Complete-empty scope offers truthful capture/regenerate recovery without nonexistent item choices');
            f.write('work/tasks/broken.md', 'external malformed record');
            const partial = await ensureReport(f.root); assert.equal(partial.coverage, 'partial');
            await page.goto(pathToFileURL(path.join(f.root, partial.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByText('Work inspection is limited', { exact: true }).waitFor();
            assert.equal(await page.getByText('No tracked work yet', { exact: true }).count(), 0);
            assert.equal(await page.locator('#detail-empty').isVisible(), false);
            assert.match(await page.getByRole('status').and(page.locator('#work-count')).innerText(), /project total unknown/);
            assert.match(await page.getByRole('main').innerText(), /zero inspected records is not proof of an empty project/);
            await capture('offline-limited', 'Partial zero-inspected scope remains limited with unknown project total');
            const retained = fs.readFileSync(path.join(f.root, partial.path));
            f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/unavailable.html'] };
            f.saveConfig();
            await assert.rejects(ensureReport(f.root), error => error.code === 'UNAVAILABLE_REPORT');
            assert.deepEqual(fs.readFileSync(path.join(f.root, partial.path)), retained);
            assert.equal(fs.readFileSync(path.join(f.root, 'work/tasks/broken.md'), 'utf8'), 'external malformed record');
            transitions('Open complete-empty report; inspect partial external-owner limits; unavailable native generation preserves prior snapshot');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#renderReport', variant: 'offline-people-and-checkbox', name: 'Offline People and native checkbox remain readable and operable with long labels and narrow reflow',
        setup: async f => {
            f.config.taskTracking.members.push({ id: 'long-member', displayName: 'A contributor with a long descriptive display name '.repeat(2).trim(), active: true });
            f.config.taskTracking.members.push({ id: 'long-word', displayName: 'Contributor'.repeat(12), active: true });
            f.saveConfig(); await f.create();
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.bytes('TASK-101');
            const report = await ensureReport(f.root);
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            // Responsibility is an open section of the report: nothing has to be expanded before its people can be read.
            assert.equal(await page.getByRole('heading', { name: 'Responsibility', exact: true }).isVisible(), true);
            assert.equal(await page.locator('.people').evaluate(node => getComputedStyle(node).display), 'block');
            assert.equal(await page.locator('.people-content').evaluate(node => getComputedStyle(node).display), 'grid');
            assert.equal(await page.locator('.people-list').evaluate(node => getComputedStyle(node).flexWrap), 'wrap');
            const checkbox = page.getByLabel('Remaining work', { exact: true });
            const checkboxBox = await checkbox.boundingBox();
            const labelBox = await checkbox.locator('..').boundingBox();
            assert.ok(checkboxBox && checkboxBox.width === 20 && checkboxBox.height === 20, 'Checkbox remains a compact native control');
            assert.ok(labelBox && labelBox.width >= 44 && labelBox.height >= 44, 'Its associated label supplies an accessible hit area');
            await checkbox.focus();
            await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(), true);
            assert.equal(await checkbox.evaluate(node => node.matches(':focus-visible')), true);
            assert.notEqual(await checkbox.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
            await capture('offline-people', 'Expanded People keeps long member names readable and checkbox visibly keyboard-operable');
            const originalViewport = page.viewportSize();
            try {
                await page.setViewportSize({ width: 320, height: originalViewport.height });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, '320px report reflows without document overflow');
                assert.equal(await page.locator('.people').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Long People labels stay inside their disclosure');
                assert.equal(await page.locator('.people-list').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'People list wraps within narrow layout');
            } finally { await page.setViewportSize(originalViewport); }
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByRole('link', { name: /^TASK-101:/ }).click();
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
            transitions('Open People; keyboard-toggle Remaining; assert 320px reflow and restore declared viewport; clear and inspect unchanged work');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#renderReport', variant: 'offline-no-script', name: 'Without scripts the offline report keeps native content and links usable while hiding inactive controls', javaScriptEnabled: false,
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const report = await ensureReport(f.root); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            for (const selector of ['#work-search', '#work-owner', '#work-state', '#work-remaining']) {
                const control = page.locator(selector);
                assert.equal(await control.count(), 1, `The offline report retains its ${selector} control`);
                assert.equal(await control.isVisible(), false);
            }
            assert.equal(await page.getByRole('button', { name: 'Clear filters', exact: true }).isVisible(), false);
            assert.equal(await page.getByRole('article', { name: 'Export selected rows', exact: true }).isVisible(), true);
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            const link = page.getByRole('link', { name: /^TASK-101:/ }); const anchor = await link.getAttribute('href'); await link.click();
            assert.equal(new URL(page.url()).hash, anchor);
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(new URL(page.url()).hash, '#work');
            await capture('offline-no-script', 'Scripts-disabled snapshot exposes all native content and record navigation while hiding inactive filters');
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            assert.equal(await page.getByRole('button', { name: 'Clear filters', exact: true }).isVisible(), false);
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').isVisible(), true);
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open scripts-disabled report; inspect native record; return to Work; inspect print without changing canonical work');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#enhanceReport', variant: 'offline-filter-detail-print', name: 'The generated offline report keeps detail, return, filters and print usable without writes',
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const report = await ensureReport(f.root);
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByRole('heading', { name: 'Delivery scope', exact: true }).waitFor();
            // The drawn summaries restate the counted snapshot: one accepted and verified outcome, one draft outcome.
            assert.equal(await page.getByRole('img', { name: '2 tasks, one block each: 1 accepted with current proof; 1 not accepted yet', exact: true }).count(), 1);
            assert.match(await page.getByRole('region', { name: 'Where work stands', exact: true }).innerText(), /1\s+Draft[\s\S]*0\s+Verifying\s+1\s+Done/);
            assert.equal(await page.getByRole('region', { name: 'Waiting on a person', exact: true }).count(), 0);
            // The identity facts stand open in the limits panel; the checkout is read without opening anything.
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').isVisible(), true);
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').innerText(), f.root);
            const ownerControl = page.locator('#work-owner');
            const stateControl = page.locator('#work-state');
            assert.equal(await ownerControl.count(), 1);
            assert.equal(await stateControl.count(), 1);
            assert.equal(await ownerControl.isVisible(), true);
            assert.equal(await stateControl.isVisible(), true);
            if (page.viewportSize().width <= 480) {
                const search = await page.getByLabel('Search work', { exact: true }).boundingBox();
                const responsible = await ownerControl.boundingBox();
                assert.ok(search && responsible && responsible.y >= search.y + search.height, 'Mobile report controls stack without overlapping');
            }
            await page.getByRole('link', { name: /^TASK-101:/ }).click();
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).waitFor();
            await capture('offline-detail', 'Selected record detail exposes outcome, responsibility and proof in the offline report');
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await page.getByRole('heading', { name: 'Work', exact: true }).evaluate(node => node === document.activeElement), true);
            await page.getByLabel('Search work', { exact: true }).fill('No matching report work');
            await page.getByText('No records match these filters. Clear filters to inspect all records in this snapshot.', { exact: true }).waitFor();
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /50\.0%/);
            await capture('offline-filter-empty', 'Filtered-empty report retains selected detail and its project denominator');
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByRole('status').getByText('2 of 2 inspected records shown', { exact: true }).waitFor();
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            await capture('offline-print', 'Print exposes every inspected record and labelled snapshot progress');
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open generated offline report; select detail; return to Work; filter; clear; print');
        } },
    { caseId: 'TC-TPT-095', owner: SECOND_OWNER, variant: 'safe-draft-delete', name: 'Draft deletion requires exact preview and confirmation while established work retains identity',
        setup: async f => { await f.create(); await f.create('TASK-102'); await f.ready('TASK-102'); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const established = f.bytes('TASK-102');
            await open(); await selectWork(page, 'TASK-102', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Review draft deletion', exact: true }).count(), 0);
            await selectWork(page, 'TASK-101', transitions);
            const owner = f.view('TASK-101').ownerPath;
            await selectedPane(page).getByRole('button', { name: 'Review draft deletion', exact: true }).click();
            await page.getByLabel('Reason for deleting this draft', { exact: true }).fill('Duplicate untouched capture');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).isDisabled(), true);
            assert.equal(fs.existsSync(path.join(f.root, owner)), true);
            await capture('delete-preview', 'Exact untouched draft is named and deletion waits for explicit confirmation');
            await page.getByLabel('I reviewed the exact draft TASK-101 and explicitly confirm removing its canonical file', { exact: true }).check();
            await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).click();
            await page.getByRole('status').getByText(/Deleted draft TASK-101 in the local checkout/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), false);
            assert.deepEqual(f.bytes('TASK-102'), established);
            await capture('draft-deleted', 'Only the explicitly confirmed draft is removed; established work remains');
        } },
    { caseId: 'TC-TPT-095', owner: SECOND_OWNER, variant: 'ended-work-delete', name: 'Canceled or retired work is deleted entirely after exact preview and confirmation, open work is not offered it, and referenced work is refused',
        expectedConsole: [/Failed to load resource.*422/],
        setup: async f => {
            await f.create(); await f.saved('retire', 'TASK-101', { reason: 'Superseded outcome' });
            await f.create('TASK-102'); await f.create('TASK-103'); await f.saved('link', 'TASK-103', { links: [{ relation: 'dependency', itemId: 'TASK-102' }] });
            await f.saved('transition', 'TASK-102', { state: 'canceled', reason: 'No longer needed' });
            await f.saved('transition', 'TASK-103', { state: 'planned' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const open103 = f.bytes('TASK-103'); const canceled = f.bytes('TASK-102'); const owner = f.view('TASK-101').ownerPath;
            // GIVEN open work THEN entire deletion is not offered for it.
            await open(); await selectWork(page, 'TASK-103', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).count(), 0);
            // GIVEN retired work WHEN its deletion is previewed THEN what leaves with it is stated and nothing is removed yet.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).click();
            await page.getByRole('heading', { name: 'Delete work entirely', exact: true }).waitFor();
            await page.getByLabel('Reason for deleting this work', { exact: true }).fill('Retired outcome no longer needs a record');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Delete work entirely', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete work entirely', exact: true }).isDisabled(), true);
            await page.getByText(/This record will be removed entirely: .*With it go 2 history entries, 0 proofs, 0 acceptance decisions/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), true);
            await capture('delete-entirely-preview', 'Retired work is named, what leaves with it is stated, and deletion waits for explicit confirmation');
            await page.getByLabel('I reviewed TASK-101 and explicitly confirm deleting it entirely, together with its history', { exact: true }).check();
            await page.getByRole('button', { name: 'Delete work entirely', exact: true }).click();
            await page.getByRole('status').getByText(/Deleted ended work TASK-101 in the local checkout/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), false);
            assert.deepEqual(f.bytes('TASK-103'), open103); assert.deepEqual(f.bytes('TASK-102'), canceled);
            transitions('Preview, confirm and delete retired work entirely');
            await capture('ended-work-deleted', 'Only the confirmed retired record is removed; open and canceled work remain');
            // GIVEN canceled work another record still depends on WHEN previewed THEN it is refused and nothing cascades.
            await selectWork(page, 'TASK-102', transitions);
            await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).click();
            await page.getByLabel('Reason for deleting this work', { exact: true }).fill('Canceled outcome no longer needs a record');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByText(/Remove the links or memberships that still point to this work first; no cascade\. Referenced by TASK-103/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete work entirely', exact: true }).count(), 0);
            assert.deepEqual(f.bytes('TASK-102'), canceled); assert.deepEqual(f.bytes('TASK-103'), open103);
            transitions('Preview deletion of referenced canceled work');
            await capture('referenced-ended-work-refused', 'Canceled work that another record depends on is refused with the referencing record named; both records are unchanged');
        } },
    { caseId: 'TC-TPT-039', owner: 'WorkTracking/README.TaskTracking.md', variant: 'state-correction', name: 'Canceled work is taken back to draft through an explicit reasoned state change, and done is never offered there',
        setup: async f => { await f.create(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const canceled = f.bytes('TASK-101'); const history = f.record('TASK-101').tracking.history;
            // GIVEN canceled work THEN the usual steps offer no way forward, and Change state is offered.
            await open(); await selectWork(page, 'TASK-101', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).count(), 0);
            await selectedPane(page).getByRole('button', { name: 'Change state', exact: true }).click();
            await page.getByRole('heading', { name: 'Change state', exact: true }).waitFor();
            const choices = await page.getByLabel('New state', { exact: true }).getByRole('option').allInnerTexts();
            // Nobody is responsible for this record, so the states that started work needs are shown and cannot be chosen.
            assert.deepEqual(choices, ['Choose a state', 'Draft', 'Planned', 'Ready', 'In progress (needs a responsible member)', 'Blocked (needs a responsible member)', 'Verifying (needs a responsible member)']);
            assert.deepEqual(await page.getByLabel('New state', { exact: true }).getByRole('option').evaluateAll(options => options.filter(option => option.disabled).map(option => option.value)),
                ['in_progress', 'blocked', 'verifying']);
            // WHEN draft and a reason are chosen THEN the preview states exactly that change and nothing is saved yet.
            await page.getByLabel('New state', { exact: true }).selectOption('draft');
            await page.getByLabel('Reason for this change', { exact: true }).fill('Canceled by mistake');
            const preview = await exactPreview(page);
            assert.deepEqual(preview.change, { state: 'draft', correction: true, reason: 'Canceled by mistake' });
            assert.equal(await page.getByRole('status').getByText('Preview ready. Review the exact change; nothing is saved yet.', { exact: true }).count(), 1);
            assert.deepEqual(f.bytes('TASK-101'), canceled);
            await saveExactPreview(page, transitions);
            // What an action said belongs to that action: the saved card does not follow the reader to another view.
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            const restored = f.record('TASK-101');
            assert.equal(restored.data.status, 'draft'); assert.deepEqual(restored.tracking.history.slice(0, -1), history);
            assert.equal(restored.tracking.history.at(-1).reason, 'Canceled by mistake');
            // THEN the usual next step is offered again from the corrected state.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).waitFor();
            transitions('Change canceled work back to draft with a reason');
            await capture('state-corrected', 'Canceled work is a draft again, with its history kept and its usual next step offered');
        } },
    { caseId: 'TC-TPT-053', owner: MAIN_OWNER, variant: 'scoped-filter-draft-recovery', name: 'Filter-empty recovery retains the selected delivery denominator and the unsaved record draft',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const metrics = f.progress({ groupId: 'FEATURE-F' }).metrics;
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Retained scope draft');
            await keepDraftAndNavigate(page, 'Work');
            await page.getByLabel('Find work', { exact: true }).fill('does-not-match-any-outcome');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /FEATURE-F/);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), '');
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await keepDraftAndNavigate(page, 'Overview');
            assert.match(await page.getByRole('main').innerText(), /2 eligible unique tasks/);
            assert.match(await page.getByRole('main').innerText(), /50\.0%/);
            // Returning to the draft from the remaining-work shortcut changes nothing, the Work filter included.
            await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Return to draft', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            await keepDraftAndNavigate(page, 'Work');
            assert.equal(await page.getByLabel('Remaining eligible tasks only', { exact: true }).isChecked(), false);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Retained scope draft');
            assert.deepEqual(f.progress({ groupId: 'FEATURE-F' }).metrics, metrics);
            assertCanonicalFacts(f, before);
            await capture('scoped-filter-draft-retained', 'Clear filters preserves FEATURE-F, its two-outcome denominator and the entered unsaved draft');
            transitions('Choose F; retain edited P; observe empty filter; clear; read unchanged progress; return to retained draft');
        } },
    { caseId: 'TC-TPT-058', owner: SECOND_OWNER, variant: 'actual-pending-save', name: 'A pending real save prevents duplicate submission and any premature saved or accepted claim',
        setup: async f => { await f.create('TASK-104'); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-104', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Pending actual save');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            const original = f.record('TASK-104'); const requests = [];
            let release, observed;
            const gate = new Promise(resolve => { release = resolve; });
            const admitted = new Promise(resolve => { observed = resolve; });
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                requests.push(request); const response = await route.fetch();
                assert.equal(response.status(), 200); observed(); await gate; await route.fulfill({ response });
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            try {
                await waitForSignal(admitted, 'the admitted real pending save');
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                const save = page.getByRole('button', { name: 'Save reviewed change', exact: true });
                assert.equal(await save.isDisabled(), true);
                await save.evaluate(control => control.click());
                assert.equal(requests.length, 1);
                assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
                assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Pending actual save');
                assert.deepEqual(f.view('TASK-104').acceptanceHistory, []);
                await capture('actual-save-pending', 'The real save response is pending; duplicate submission is disabled and no confirmed success is shown');
            } finally { release(); }
            await page.getByRole('status').getByText(/Saved TASK-104 in the local checkout/).waitFor();
            const after = f.record('TASK-104');
            assert.equal(after.data.title, 'Pending actual save'); assert.equal(after.revision, original.revision + 1);
            assert.deepEqual(after.tracking.history.slice(0, -1), original.tracking.history);
            assert.equal(after.tracking.history.at(-1).operationId, requests[0].operationId);
            assert.equal(after.tracking.receipts.filter(row => row.operationId === requests[0].operationId).length, 1);
            assert.deepEqual(after.tracking.acceptanceHistory, original.tracking.acceptanceHistory);
            assert.equal(after.data.status, original.data.status);
            transitions('Wait for actual save response; refuse repeat submit; observe one persisted result');
        } },
    { caseId: 'TC-TPT-059', owner: SECOND_OWNER, variant: 'saved-receipt-context', name: 'Only the actual saved receipt restores the selected scope and next-action context without a duplicate change',
        expectedConsole: [/Failed to load resource: net::ERR_FAILED/],
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Integration outcome saved once');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            const before = f.record('TASK-P'); const controls = canonicalFacts(f, ['TASK-P']); const requests = [];
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                requests.push(request);
                if (requests.length === 1) { const response = await route.fetch(); assert.equal(response.status(), 200); return route.abort('failed'); }
                return route.continue();
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            await page.getByRole('button', { name: 'Retry original save', exact: true }).waitFor();
            const saved = f.record('TASK-P'); const savedBytes = f.bytes('TASK-P');
            assert.equal(saved.data.title, 'Integration outcome saved once'); assert.equal(saved.revision, before.revision + 1);
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            await page.getByRole('button', { name: 'Read current without resaving', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.equal(requests.length, 1); assert.deepEqual(f.bytes('TASK-P'), savedBytes);
            await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
            await page.getByRole('status').getByText(/Saved TASK-P in the local checkout.*original receipt replayed/).waitFor();
            assert.deepEqual(requests[1], requests[0]); assert.equal(requests.length, 2);
            assert.deepEqual(f.bytes('TASK-P'), savedBytes);
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /FEATURE-F/);
            assert.deepEqual(f.view('TASK-P').acceptanceHistory, before.tracking.acceptanceHistory);
            assertCanonicalFacts(f, controls);
            await capture('actual-saved-context', 'One actual saved receipt restores the selected outcome, F scope and retained filter without a second write');
            transitions('Lose actual response; read without saving; retry exact receipt; return to retained scope/filter and selected record');
        } },
    { caseId: 'TC-TPT-201', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'generic-purpose-coexistence', name: 'An optional capability purpose uses Feature by default without converting generic nesting or children',
        setup: async f => {
            for (const [id, kind] of [['GENERIC-G', 'vision'], ['FEATURE-F', 'project'], ['TASK-P', 'task'], ['TASK-Q', 'task'], ['SUBTASK-SUPPORT', 'subtask']]) await f.create(id, kind);
            await f.saved('group', 'FEATURE-F', { memberItemIds: ['TASK-Q', 'SUBTASK-SUPPORT'] });
            await f.saved('group', 'GENERIC-G', { memberItemIds: ['FEATURE-F', 'TASK-P'] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const controls = canonicalFacts(f, ['FEATURE-F']); const before = f.record('FEATURE-F');
            await open(); await chooseDeliveryScope(page, 'GENERIC-G', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await chooseDeliveryScope(page, '', transitions); await selectWork(page, 'FEATURE-F', transitions);
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            assert.equal(await page.getByLabel('Update members', { exact: true }).isChecked(), false);
            await page.getByLabel('Group purpose', { exact: true }).selectOption('capability');
            const preview = await exactPreview(page); assert.deepEqual(preview.change, { groupRole: 'capability' });
            assert.deepEqual(f.bytes('FEATURE-F'), before.bytes);
            await saveExactPreview(page, transitions);
            const after = f.record('FEATURE-F');
            assert.equal(after.tracking.groupRole, 'capability'); assert.equal(f.view('GENERIC-G').groupRole, null);
            assert.equal(after.kind, 'project'); assert.equal(after.body, before.body);
            assert.deepEqual(after.tracking.memberItemIds, before.tracking.memberItemIds);
            assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
            assertCanonicalFacts(f, controls);
            await chooseDeliveryScope(page, 'GENERIC-G', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            assert.equal(await page.getByLabel('Delivery scope', { exact: true }).getByRole('option', { name: /^Feature FEATURE-F:/ }).count(), 1);
            assert.equal(await page.getByLabel('Delivery scope', { exact: true }).getByRole('option', { name: /^Generic group GENERIC-G:/ }).count(), 1);
            assert.equal(Object.hasOwn(f.config.taskTracking, 'groupLabels'), false);
            assertCanonicalFacts(f, controls);
            await capture('generic-and-feature-coexist', 'Generic G and default Feature F retain original nesting, two delivery identities and unchanged configuration');
            transitions('Inspect generic scope; preview purpose only; save; reread generic and labelled choices');
        } },
    { caseId: 'TC-TPT-202', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'purpose-exact-omission-and-conflict', name: 'Purpose set change clear and membership-only edits preserve omitted facts and a refused stale draft',
        expectedConsole: [/Failed to load resource.*409/],
        setup: async f => {
            for (const [id, kind] of [['AREA-A', 'vision'], ['FEATURE-F', 'project'], ['TASK-P', 'task'], ['SUBTASK-SUPPORT', 'subtask']]) await f.create(id, kind);
            await f.saved('group', 'FEATURE-F', { memberItemIds: ['TASK-P', 'SUBTASK-SUPPORT'] });
            await f.saved('group', 'AREA-A', { memberItemIds: ['FEATURE-F'], groupRole: 'area' });
            await f.accepted('FEATURE-F');
            await f.saved('attest', 'FEATURE-F', { health: { assessment: 'Maintainer observed scope', ownerId: 'owner', observedAt: '2026-01-02T00:00:00.000Z', reason: 'Actual group review' } }, {}, { canAttest: true });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const controls = canonicalFacts(f, ['FEATURE-F']);
            await open(); await selectWork(page, 'FEATURE-F', transitions);
            for (const purpose of ['area', 'program', 'clear', 'capability']) {
                const before = f.record('FEATURE-F');
                await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
                await page.getByLabel('Group purpose', { exact: true }).selectOption(purpose);
                const preview = await exactPreview(page);
                assert.deepEqual(preview.change, { groupRole: purpose === 'clear' ? null : purpose });
                assert.equal(Object.hasOwn(preview.change, 'memberItemIds'), false); assert.deepEqual(f.bytes('FEATURE-F'), before.bytes);
                await saveExactPreview(page, transitions);
                const after = f.record('FEATURE-F');
                assert.equal(after.tracking.groupRole, purpose === 'clear' ? null : purpose); assert.equal(after.revision, before.revision + 1);
                assert.deepEqual(after.tracking.memberItemIds, ['TASK-P', 'SUBTASK-SUPPORT']);
                for (const key of ['criteria', 'proofs', 'acceptanceHistory', 'health', 'assigneeId', 'links']) assert.deepEqual(after.tracking[key], before.tracking[key]);
                assert.equal(after.body, before.body); assert.equal(after.data.status, before.data.status);
                assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history); assertCanonicalFacts(f, controls);
            }
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            await page.getByLabel('Update members', { exact: true }).check();
            await page.getByLabel(/^SUBTASK-SUPPORT:/).uncheck();
            const members = await exactPreview(page); assert.deepEqual(members.change, { memberItemIds: ['TASK-P'] });
            assert.equal(Object.hasOwn(members.change, 'groupRole'), false);
            await saveExactPreview(page, transitions);
            assert.equal(f.view('FEATURE-F').groupRole, 'capability'); assert.deepEqual(f.view('FEATURE-F').memberItemIds, ['TASK-P']);
            assert.deepEqual(f.view('AREA-A').memberItemIds, ['FEATURE-F']); assertCanonicalFacts(f, controls);
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            await page.getByLabel('Group purpose', { exact: true }).selectOption('program');
            await f.saved('group', 'FEATURE-F', { groupRole: 'area' }); const peerSaved = f.bytes('FEATURE-F');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('region', { name: 'Conflict recovery', exact: true }).waitFor();
            assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0);
            assert.deepEqual(f.bytes('FEATURE-F'), peerSaved); assertCanonicalFacts(f, controls);
            await capture('purpose-conflict-retains-draft', 'Purpose-only and membership-only saves preserve omitted facts; a real teammate revision refuses the retained purpose draft');
            transitions('Set area; change program; clear; set capability; update only members; refuse stale purpose preview');
        } },
    { caseId: 'TC-TPT-211', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'purpose-and-vocabulary-refusal', name: 'Invalid purpose and declared vocabulary refuse through actual boundaries while a useful group draft survives',
        expectedConsole: [/Failed to load resource.*422/],
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f);
            await open(); await selectWork(page, 'FEATURE-F', transitions);
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            await page.getByLabel('Group purpose', { exact: true }).selectOption('program');
            // Deliberate hostile-client boundary: a modified HTTP request can occur, although the finite select cannot produce it.
            for (const [id, patch] of [['FEATURE-F', { groupRole: 'module' }], ['TASK-P', { groupRole: 'area' }], ['FEATURE-F', {}]]) {
                const request = f.request('group', id, patch); const result = await browserPost(page, '/api/operation', { ...request, preview: true });
                assert.equal(result.status, 422); assert.equal(result.value.primary.code, 'INVALID_INPUT');
                assert.equal(result.value.primary.status, 'refused'); assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
                assertCanonicalFacts(f, before);
            }
            await page.getByLabel('Group purpose', { exact: true }).selectOption('');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByText('Choose a purpose change or select Update members before previewing.', { exact: true }).waitFor();
            assert.equal(await page.getByRole('alert').innerText(), 'Choose a purpose change or select Update members before previewing.', 'A refused preview is announced as an alert');
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0);
            assert.equal(await page.getByLabel('Update members', { exact: true }).isChecked(), false);
            await page.getByLabel('Group purpose', { exact: true }).selectOption('program');
            // Owner paths are read while the configuration is valid: the record reader refuses an invalid one, the files do not.
            const owners = new Map([...before.records.keys()].map(id => [id, f.record(id).ownerPath]));
            for (const value of [{ capability: '' }, { capability: '   ' }, { capability: 'line\nfeed' }, { capability: 'x'.repeat(161) }, { other: 'Unsupported' }]) {
                f.config.taskTracking.groupLabels = value; f.saveConfig(); const declared = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
                const result = await browserPost(page, '/api/inspect', {});
                assert.equal(result.value.coverage, 'unavailable'); assert.equal(result.value.metrics, null);
                assert.ok(result.value.diagnostics.some(item => item.code === 'INVALID_CONFIG'));
                await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
                await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
                // This iteration's own reread is observed before its outcome is read: the message and coverage of the
                // iteration before it look the same.
                const reread = page.waitForResponse(response => new URL(response.url()).pathname === '/api/inspect');
                await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click(); await reread;
                await page.locator('main[aria-busy="false"]').waitFor();
                await page.getByRole('status').getByText(/The selected source is unavailable/).waitFor();
                assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
                assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), declared);
                for (const [id, bytes] of before.records) assert.deepEqual(fs.readFileSync(path.join(f.root, owners.get(id))), bytes);
                assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
            }
            const inert = '<img src=x onerror="window.trackerLabelExecuted=true">';
            f.config.taskTracking.groupLabels = { area: 'x'.repeat(160), capability: inert }; f.saveConfig();
            await keepDraftAndNavigate(page, 'Changes');
            await retainDraftDuring(page, () => page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click());
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            const choices = page.getByLabel('Delivery scope', { exact: true });
            assert.ok((await choices.getByRole('option', { name: /FEATURE-F:/ }).innerText()).includes(inert));
            assert.match(await choices.getByRole('option', { name: /AREA-A:/ }).innerText(), new RegExp('x'.repeat(160)));
            assert.equal(await page.locator('img').count(), 0); assert.equal(await page.evaluate(() => window.trackerLabelExecuted), undefined);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
            for (const [id, bytes] of before.records) assert.deepEqual(f.bytes(id), bytes);
            await capture('inert-vocabulary-draft-retained', 'Actual invalid requests/configurations refuse; valid boundary labels stay inert and the purpose draft remains available');
            transitions('Refuse hostile purpose/nongroup/empty requests; refuse malformed declarations; read valid inert boundary labels; resume retained draft');
        } },
    { caseId: 'TC-TPT-203', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'scope-outcome-intent-proof', name: 'A through F explains exactly two outcomes and their actual intent proof exclusions and support',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const q = f.view('TASK-Q'); const p = f.view('TASK-P');
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions); await enterDirectGroup(page, 'FEATURE-F', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            const excluded = await disclosedList(page, 'Excluded tasks');
            assert.deepEqual((await excluded.getByRole('button').allTextContents()).map(text => text.match(/TASK-[A-Z]+/)[0]).sort(), ['TASK-R', 'TASK-S']);
            const support = await disclosedList(page, 'Supporting work');
            assert.deepEqual((await support.getByRole('button').allTextContents()).map(text => text.split(':')[0]).sort(), ['STORY-SUPPORT', 'SUBTASK-SUPPORT']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/s);
            await openEligible(page, 'TASK-Q', transitions);
            const proof = await detailJson(page, 'Proof and acceptance history');
            assert.deepEqual(proof.acceptance, q.acceptanceHistory); assert.equal(proof.applicability.status, 'stale');
            const health = await detailJson(page, 'This record’s dated owner health'); assert.equal(health.status, 'unknown');
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            await openEligible(page, 'TASK-P', transitions);
            const pProof = await detailJson(page, 'Proof and acceptance history');
            assert.deepEqual(pProof.proof, p.proofs); assert.equal(pProof.proof[0].summary, 'Observed the declared integration outcome in its exact owner');
            assert.ok((await selectedPane(page).innerText()).includes(p.ownerPath));
            const concerns = await observeConcernRequests(page);
            await selectedPane(page).getByRole('button', { name: 'Inspect path intent/shared.md', exact: true }).click();
            await page.getByRole('region', { name: 'Exact linked concerns', exact: true }).waitFor();
            assert.deepEqual(concerns.at(-1).request.query.paths, ['intent/shared.md']);
            assert.ok(concerns.at(-1).value.relationships.some(link => link.owner.itemId === 'TASK-P' && link.owner.ownerPath === p.ownerPath && link.relation === 'spec' && link.target.path === 'intent/shared.md'));
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await page.getByRole('region', { name: 'Exact linked concerns', exact: true }).waitFor({ state: 'detached' });
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/s);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(f.progress({ groupId: 'FEATURE-F' }).metrics.total, 2); assert.equal(f.progress({ groupId: 'FEATURE-F' }).metrics.currentlyVerified, 0);
            assertCanonicalFacts(f, before);
            await capture('exact-scope-intent-proof', 'A through F exposes only P/Q as delivery; exact intent and proof owners, stale accepted Q, excluded and supporting work retain their meanings');
            transitions('Enter A/F; inspect exclusions and support; read Q history/current gap; inspect P proof and exact intent path; return under A');
        } },
    { caseId: 'TC-TPT-204', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'chosen-shared-path-and-removed-edge', name: 'Shared F retains the deliberately chosen A or B path and safely rejects a later removed membership edge',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const owner = f.view('FEATURE-F').ownerPath;
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions);
            await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            await enterDirectGroup(page, 'FEATURE-F', transitions); assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await openEligible(page, 'TASK-P', transitions);
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/s);
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await scopeLine(page, 'AREA-A').waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.equal(f.progress({ groupId: 'AREA-A' }).metrics.total, 2);
            await enterDirectGroup(page, 'FEATURE-F', transitions);
            const path = page.getByRole('navigation', { name: 'Chosen scope path', exact: true });
            await path.getByText('Other direct affiliations', { exact: true }).click();
            await path.getByRole('button', { name: 'Enter through AREA-B', exact: true }).click();
            await path.getByText(/^Inspected group\/path:.*AREA-B.*FEATURE-F/).waitFor();
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']); assert.equal(f.view('FEATURE-F').ownerPath, owner);
            await openEligible(page, 'TASK-P', transitions);
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            assert.match(await path.innerText(), /Inspected group\/path:.*AREA-B.*FEATURE-F/s);
            assertCanonicalFacts(f, before);
            await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            const direct = await path.getByText(/^Inspected group\/path:/).innerText();
            assert.ok(direct.includes('FEATURE-F')); assert.equal(/AREA-A|AREA-B/.test(direct), false);
            await chooseDeliveryScope(page, 'AREA-A', transitions); await enterDirectGroup(page, 'FEATURE-F', transitions);
            await f.saved('group', 'AREA-A', { memberItemIds: ['GENERIC-G'] }); const changed = canonicalFacts(f);
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Path unavailable/).waitFor();
            const safe = await path.getByText(/^Inspected group\/path:/).innerText();
            assert.ok(safe.includes('FEATURE-F')); assert.equal(safe.includes('AREA-A'), false);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']); assertCanonicalFacts(f, changed);
            await capture('shared-path-safe-recovery', 'A/B entry preserves one F identity; direct entry invents no parent and a real removed edge yields a safe current F scope');
            transitions('A filtered return; choose B affiliation; direct F; remove A/F through real group save; reread unavailable path');
        } },
    { caseId: 'TC-TPT-205', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'generic-ungrouped-filter-choices', name: 'Generic and ungrouped choices remain reachable while zero search results cannot redefine area progress',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const metrics = f.progress({ groupId: 'AREA-A' }).metrics;
            await open(); await chooseDeliveryScope(page, '', transitions);
            const ungrouped = await disclosedList(page, 'Ungrouped tasks');
            await ungrouped.getByRole('button', { name: /^TASK-U:/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-U:/ }).waitFor();
            assert.equal(await selectedPane(page).getByText('Other direct affiliations', { exact: true }).count(), 0);
            await chooseDeliveryScope(page, 'GENERIC-G', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-Q']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /Generic group GENERIC-G/);
            await chooseDeliveryScope(page, 'AREA-A', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await page.getByLabel('Find work', { exact: true }).fill('does-not-match');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            assert.deepEqual(f.progress({ groupId: 'AREA-A' }).metrics, metrics);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            assert.match(await page.getByRole('main').innerText(), /2 eligible unique tasks/); assert.match(await page.getByRole('main').innerText(), /50\.0%/);
            assert.match(await page.getByRole('main').innerText(), /0 accepted tasks with proof that still applies/);
            assert.deepEqual(f.progress().hierarchy.ungroupedTaskIds, ['TASK-U']); assertCanonicalFacts(f, before);
            await capture('generic-ungrouped-filter-scope', 'Generic G and ungrouped U remain usable; zero search matches and Clear filters retain A’s exact two-outcome denominator');
            transitions('Inspect ungrouped U; generic G; select A; filter to zero; clear and reread unchanged scope');
        } },
    { caseId: 'TC-TPT-092', owner: SECOND_OWNER, variant: 'attached-draft-reload', name: 'Reload retains the attached checkout and actor while discarding only the unsaved page draft',
        setup: async f => { await f.create('TASK-104', 'task', { title: 'Persisted export title', intent: 'Persisted selected export outcome' }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const original = f.view('TASK-104');
            await open(); await selectWork(page, 'TASK-104', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Unsaved title lost on reload');
            await page.getByLabel('Intended outcome', { exact: true }).fill('Unsaved intent lost on reload');
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Unsaved title lost on reload');
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).inputValue(), 'Unsaved intent lost on reload');
            assertCanonicalFacts(f, before);
            await page.reload(); await page.locator('main[aria-busy="false"]').waitFor();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.equal(await page.locator('#root-context').innerText(), `Checkout: ${f.root}`);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\)/);
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).count(), 0);
            assert.equal(await page.getByText('Unsaved title lost on reload', { exact: true }).count(), 0);
            assert.equal(await page.getByText('Unsaved intent lost on reload', { exact: true }).count(), 0);
            await selectWork(page, 'TASK-104', transitions);
            assert.match(await selectedPane(page).innerText(), /Persisted export title/);
            assert.match(await selectedPane(page).innerText(), /Persisted selected export outcome/);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), original.title);
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).inputValue(), original.intent);
            assert.deepEqual(f.view('TASK-104'), original); assertCanonicalFacts(f, before);
            await capture('attached-draft-reload', 'Actual reload retains the attached checkout and actor, discards unsaved page fields and rereads the unchanged persisted owner');
            transitions('Enter two unsaved fields; reload attached page; reread unchanged canonical work');
        } },
    { caseId: 'TC-TPT-213', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'exact-concern-owner-and-retained-outside-draft', name: 'P-only concerns exclude Q until the exact shared specification is selected, without changing F membership',
        setup: async f => { await hierarchyFixture(f, { concerns: true }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const observations = await observeConcernRequests(page);
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P']);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /SUBTASK-SUPPORT/);
            const outside = await disclosedList(page, 'Outside delivery scope');
            assert.match(await outside.innerText(), /TASK-Q/); assert.match(await outside.innerText(), /SUBTASK-Z/);
            await outside.getByRole('button', { name: /^TASK-Q:/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-Q:/ }).waitFor();
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Pending outside Q management edit');
            await keepDraftAndNavigate(page, 'Work');
            await retainDraftDuring(page, () => page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: /^TASK-P:/ }).click());
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            await retainDraftDuring(page, () => selectedPane(page).getByRole('button', { name: 'Inspect concerns for TASK-P', exact: true }).click());
            const concerns = page.getByRole('region', { name: 'Exact linked concerns', exact: true }); await concerns.waitFor();
            await concerns.getByText(/^Exact selection: TASK-P\./).waitFor();
            const pOnly = observations.at(-1); assert.equal(pOnly.status, 200);
            assert.deepEqual(pOnly.request, { query: { schemaVersion: 1, itemIds: ['TASK-P'] } });
            assert.deepEqual(pOnly.value.scope.itemIds, ['TASK-P']); assert.deepEqual(pOnly.value.scope.paths, []);
            assert.equal(pOnly.value.items.some(item => item.itemId === 'TASK-Q'), false);
            assert.equal(pOnly.value.relationships.some(link => link.owner.itemId === 'TASK-Q'), false);
            const declared = pOnly.value.relationships.find(link => link.owner.itemId === 'TASK-P' && link.relation === 'spec');
            assert.equal(declared.owner.ownerPath, f.record('TASK-P').ownerPath); assert.equal(declared.direction, 'outgoing');
            assert.deepEqual(declared.target, { path: 'intent/shared.md' });
            assert.match(fs.readFileSync(path.join(f.root, declared.target.path), 'utf8'), /^---\nid: SPEC-SHARED\n---\nOnly the declared integration outcome/m);
            assert.equal(await concerns.getByText(/TASK-Q.*declares spec/).count(), 0);
            const pSpecification = concerns.getByRole('listitem').filter({ hasText: `outgoing: TASK-P (${f.record('TASK-P').ownerPath}) declares spec;` });
            await retainDraftDuring(page, () => pSpecification.getByRole('button', { name: 'Inspect path intent/shared.md', exact: true }).click());
            await concerns.getByText(/^Exact selection: intent\/shared\.md\./).waitFor();
            const shared = observations.at(-1); assert.equal(shared.status, 200);
            assert.deepEqual(shared.request, { query: { schemaVersion: 1, paths: ['intent/shared.md'] } });
            assert.deepEqual(shared.value.scope.paths, ['intent/shared.md']); assert.deepEqual(shared.value.scope.itemIds, []);
            const incoming = shared.value.relationships.find(link => link.owner.itemId === 'TASK-Q' && link.relation === 'spec');
            assert.equal(incoming.direction, 'incoming'); assert.equal(incoming.owner.ownerPath, f.record('TASK-Q').ownerPath);
            assert.deepEqual(incoming.target, { path: 'intent/shared.md' });
            const qDeclaration = concerns.getByRole('listitem').filter({ hasText: `incoming: TASK-Q (${f.record('TASK-Q').ownerPath}) declares spec;` });
            assert.match(await qDeclaration.innerText(), /Original owner declares this exact selected target/);
            await retainDraftDuring(page, () => qDeclaration.getByRole('button', { name: 'Inspect item TASK-Q', exact: true }).click());
            await selectedPane(page).getByRole('heading', { name: /^TASK-Q:/ }).waitFor();
            assert.match(await selectedPane(page).innerText(), new RegExp(f.record('TASK-Q').ownerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            await retainDraftDuring(page, () => page.getByRole('button', { name: 'Back to previous context', exact: true }).click());
            await page.locator('main[aria-busy="false"]').waitFor();
            assert.deepEqual(await eligibleIds(page), ['TASK-P']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /Delivery scope:.*FEATURE-F/);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Pending outside Q management edit');
            assert.deepEqual(f.view('FEATURE-F').memberItemIds, ['TASK-P', 'SUBTASK-SUPPORT']);
            assert.equal(f.progress({ groupId: 'FEATURE-F' }).metrics.total, 1); assertCanonicalFacts(f, before);
            await capture('exact-concerns-outside-draft', 'Actual P-only and exact SPEC-SHARED path concern results retain original Q ownership and its draft without adding Q or parent-linked Z to F');
            transitions('Read P-only concerns; deliberately select exact declared specification path; inspect Q owner; return to fixed F and retained Q draft');
        } },
    { caseId: 'TC-TPT-233', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'pinned-path-and-forged-snapshot-entry', name: 'Pinned group reading and finite snapshot paths preserve their admitted source and refuse forged ancestry',
        setup: async f => {
            await hierarchyFixture(f); f.config.taskTracking.groupLabels = { capability: 'Baseline feature' }; f.saveConfig();
            git(f, ['init']); git(f, ['add', 'docs', 'work', 'intent', 'src']); git(f, ['commit', '-m', 'Synthetic pinned hierarchy baseline']);
            f.hierarchyBaseline = git(f, ['rev-parse', 'HEAD']);
            await f.saved('group', 'FEATURE-F', { memberItemIds: ['TASK-P'], groupRole: 'area' });
            f.config.taskTracking.groupLabels = { area: 'Personal area', capability: 'Local capability' }; f.saveConfig();
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const ref = f.hierarchyBaseline;
            assert.deepEqual(f.progress({ groupId: 'FEATURE-F' }).scope.eligibleTaskIds, ['TASK-P']);
            const pinned = f.progress({ ref, groupId: 'FEATURE-F' }); assert.deepEqual(pinned.scope.eligibleTaskIds, ['TASK-P', 'TASK-Q']);
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions, { ref }); await enterDirectGroup(page, 'FEATURE-F', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.match(await page.locator('#source-context').innerText(), /Pinned local Git baseline/);
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope.*Remote freshness: unknown/);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*Baseline feature FEATURE-F/);
            const report = await ensureReport(f.root, { ref, groupId: 'FEATURE-F' }); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            const artifact = inspectReport(f.root, report.path);
            assert.equal(artifact.manifest.scope, `shared:${ref}`); assert.equal(artifact.manifest.groupId, 'FEATURE-F');
            assert.equal(artifact.manifest.fingerprint, pinned.fingerprint);
            const reportUrl = pathToFileURL(path.join(f.root, report.path)); await page.goto(reportUrl.href);
            await page.locator('html.enhanced').waitFor(); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true });
            assert.match(await delivery.innerText(), /Baseline feature FEATURE-F/); assert.match(await delivery.innerText(), /50\.0%/);
            const groups = page.getByText(/^Inspect groups \(\d+\)$/); await disclose(groups);
            await groups.locator('..').getByRole('link', { name: /^Area AREA-A:/ }).click();
            const a = page.getByRole('region', { name: 'Inspected group/path AREA-A', exact: true });
            await a.waitFor(); await a.getByText(/^Direct child groups \(\d+\)$/).click();
            await a.getByRole('link', { name: /^Inspect group FEATURE-F:/ }).click();
            await page.getByRole('region', { name: 'Inspected group/path AREA-A / FEATURE-F', exact: true }).waitFor();
            assert.match(await page.locator('#inspected-group-path').innerText(), /AREA-A.*Baseline feature FEATURE-F/);
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const forged = new URL(reportUrl); forged.hash = new URLSearchParams({ path: JSON.stringify(['AREA-A', 'AREA-B', 'FEATURE-F']) }).toString();
            await page.goto(forged.href); await page.locator('html.enhanced').waitFor();
            assert.match(await page.locator('#inspected-group-path').innerText(), /^Path unavailable\. No removed or guessed parent is used\./);
            assert.equal((await page.locator('#inspected-group-path').innerText()).includes('AREA-A'), false);
            await page.getByLabel('Search work', { exact: true }).fill('does-not-match');
            assert.match(await page.locator('#inspected-group-path').innerText(), /^Path unavailable\./);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            const recovery = page.getByText(/^Inspect groups \(\d+\)$/); await disclose(recovery);
            await recovery.locator('..').getByRole('link', { name: /^Baseline feature FEATURE-F:/ }).click();
            assert.match(await page.locator('#inspected-group-path').innerText(), /^Inspected group\/path: Baseline feature FEATURE-F:/);
            assert.equal((await page.locator('#inspected-group-path').innerText()).includes('AREA-A'), false);
            assert.match(await delivery.innerText(), /Baseline feature FEATURE-F/); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assertCanonicalFacts(f, before);
            await capture('pinned-forged-path-recovery', 'Pinned F retains baseline vocabulary and P/Q while forged ancestry gives an explicit reason and a deliberate direct-F recovery');
            transitions('Read pinned A/F; inspect fixed baseline report; refuse forged A/B/F URL path; filter and recover directly without worktree leakage');
        } },
    { caseId: 'TC-TPT-241', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'workspace-keyboard-return-and-live-draft', name: 'Keyboard and narrow workspace reading preserve A/F return filters and the open group draft through report refresh',
        setup: async f => {
            await hierarchyFixture(f);
            await f.saved('update', 'FEATURE-F', { title: 'Shared integration capability with a deliberately long stakeholder outcome and return context' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); await open(); await chooseDeliveryScope(page, 'AREA-A', transitions); await enterDirectGroup(page, 'FEATURE-F', transitions);
            await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).getByRole('button', { name: /^Inspect group FEATURE-F:/ }).click();
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            await page.getByLabel('Group purpose', { exact: true }).selectOption('program');
            await keepDraftAndNavigate(page, 'Work'); await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            const p = page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: /^TASK-P:/ });
            await p.focus(); assert.equal(await p.evaluate(node => document.activeElement === node), true);
            await retainDraftDuring(page, () => p.press('Enter'));
            const pHeading = selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }); await pHeading.waitFor();
            assert.equal(await pHeading.evaluate(node => document.activeElement === node), true);
            assert.deepEqual((await detailJson(page, 'Proof and acceptance history')).proof, f.view('TASK-P').proofs);
            await retainDraftDuring(page, () => page.getByRole('button', { name: 'Back to previous context', exact: true }).click());
            await page.locator('main[aria-busy="false"]').waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
            await keepDraftAndNavigate(page, 'Changes');
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: (generated|current)/).waitFor();
            const artifact = inspectReport(f.root, reportPath({ groupId: 'FEATURE-F' }));
            assert.equal(artifact.manifest.groupId, 'FEATURE-F'); assert.equal(artifact.manifest.fingerprint, f.progress({ groupId: 'FEATURE-F' }).fingerprint);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
            assertCanonicalFacts(f, before);
            if (page.viewportSize().width <= 480) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await capture('keyboard-fixed-scope-live-draft', 'Keyboard return and actual fixed-F report refresh preserve selected path/filter and the still-open program draft at desktop or narrow width');
            transitions('Keyboard inspect P and return A/F; refresh real fixed-F report; return to live unsaved workspace draft');
        } },
    { caseId: 'TC-TPT-241', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'enhanced-fixed-report-keyboard-and-print', name: 'Enhanced fixed-F report keyboard inspection and print retain P/Q while the inspected A/F path and filters return safely',
        setup: async f => {
            await hierarchyFixture(f);
            await f.saved('update', 'FEATURE-F', { title: 'Shared integration capability with a deliberately long stakeholder outcome and return context' });
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = canonicalFacts(f); const report = await ensureReport(f.root, { groupId: 'FEATURE-F' });
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true });
            assert.match(await delivery.innerText(), /FEATURE-F/); assert.match(await delivery.innerText(), /50\.0%/);
            const fixedSummary = await delivery.innerText();
            assert.match(await (await disclosedList(page, 'Excluded tasks')).innerText(), /TASK-R[\s\S]*TASK-S/);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /STORY-SUPPORT[\s\S]*SUBTASK-SUPPORT/);
            const groups = page.getByText(/^Inspect groups \(\d+\)$/); await disclose(groups);
            await groups.locator('..').getByRole('link', { name: /^Area AREA-A:/ }).click();
            assert.match(await page.locator('#inspected-group-path').innerText(), /AREA-A/);
            assert.equal(await delivery.innerText(), fixedSummary); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const a = page.getByRole('region', { name: 'Inspected group/path AREA-A', exact: true });
            await a.getByText(/^Direct child groups \(\d+\)$/).click();
            await a.getByRole('link', { name: /^Inspect group FEATURE-F:/ }).click();
            assert.match(await page.locator('#inspected-group-path').innerText(), /AREA-A.*FEATURE-F/);
            await page.getByLabel('Search work', { exact: true }).fill('Integration outcome');
            const p = page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-P:/ });
            await p.focus(); await p.press('Enter');
            const record = page.getByRole('article', { name: 'Integration outcome', exact: true }); await record.waitFor();
            assert.equal(await record.getByRole('heading', { name: 'Integration outcome', exact: true }).evaluate(node => document.activeElement === node), true);
            assert.match(await record.innerText(), /intent\/shared\.md/); assert.match(await record.innerText(), /src\/integration\.js/);
            await record.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await page.getByLabel('Search work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.locator('#inspected-group-path').innerText(), /AREA-A.*FEATURE-F/);
            await page.emulateMedia({ media: 'print' });
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-U:/ }).count(), 0);
            // Paper keeps every fact of the summary and drops only its one control, which nothing on paper can press.
            assert.equal(`${await delivery.innerText()}\n\nInspect remaining work`, fixedSummary);
            await page.emulateMedia({ media: 'screen' });
            if (page.viewportSize().width <= 480) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assertCanonicalFacts(f, before);
            await capture('enhanced-fixed-scope-print-return', 'Fixed F P/Q list, unchanged summary, A/F inspection path and filter survive enhanced keyboard detail/return and print at the configured widths');
            transitions('Generate fixed F; separately inspect A/F; keyboard P detail; return exact filter/path; print P/Q without U');
        } },
    { caseId: 'TC-TPT-241', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'native-fixed-scope-print-and-direct-edge', name: 'Without scripts native direct-edge and intent/proof anchors keep the exported F list exact in print', javaScriptEnabled: false,
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = canonicalFacts(f); const report = await ensureReport(f.root, { groupId: 'FEATURE-F' });
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true }); const fixedSummary = await delivery.innerText();
            assert.match(fixedSummary, /FEATURE-F/); assert.match(fixedSummary, /50\.0%/);
            assert.match(await (await disclosedList(page, 'Excluded tasks')).innerText(), /TASK-R[\s\S]*TASK-S/);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /STORY-SUPPORT[\s\S]*SUBTASK-SUPPORT/);
            const groups = page.getByText(/^Inspect groups \(\d+\)$/); await disclose(groups);
            const aLink = groups.locator('..').getByRole('link', { name: /^Area AREA-A:/ });
            await aLink.focus(); await aLink.press('Enter');
            const a = page.getByRole('region', { name: 'Inspected group/path AREA-A', exact: true });
            await a.getByText(/^Direct child groups \(\d+\)$/).click();
            const fLink = a.getByRole('link', { name: /^Inspect group FEATURE-F:/ }); const fTarget = await fLink.getAttribute('href');
            await fLink.focus(); await fLink.press('Enter'); assert.equal(new URL(page.url()).hash, fTarget);
            const af = page.getByRole('region', { name: 'Inspected group/path AREA-A / FEATURE-F', exact: true });
            assert.match(await af.innerText(), /Inspected group\/path: Area AREA-A:[\s\S]*Feature FEATURE-F:/);
            assert.match(await af.innerText(), /Delivery scope: Feature FEATURE-F:/);
            assert.equal(await af.getByRole('link', { name: 'Back to previous context', exact: true }).getAttribute('href'), await aLink.getAttribute('href'));
            await af.getByText(/^Direct members \(\d+\)$/).click();
            const p = af.getByRole('list', { name: 'Direct members', exact: true }).getByRole('link', { name: 'Integration outcome', exact: true });
            const pTarget = await p.getAttribute('href'); await p.focus(); await p.press('Enter'); assert.equal(new URL(page.url()).hash, pTarget);
            const owner = page.getByRole('article', { name: 'Integration outcome', exact: true }); assert.equal(await owner.isVisible(), true);
            assert.match(await owner.innerText(), /intent\/shared\.md/); assert.match(await owner.innerText(), /src\/integration\.js/);
            await owner.getByRole('link', { name: 'Inspect path intent/shared.md', exact: true }).click();
            const intent = page.getByRole('region', { name: 'Exact linked concerns for intent/shared.md', exact: true });
            assert.match(await intent.innerText(), new RegExp(`TASK-P[\\s\\S]*${f.record('TASK-P').ownerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*spec`));
            assert.match(await intent.innerText(), /Path availability is unverified/);
            await intent.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(new URL(page.url()).hash, '#work');
            await page.emulateMedia({ media: 'print' });
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-U:/ }).count(), 0);
            assert.equal(await delivery.innerText(), fixedSummary); assertCanonicalFacts(f, before);
            await capture('native-fixed-scope-print', 'Scripts-disabled native A/F, exact declared path and record links stay usable; fixed F print list is P/Q while U remains separate global inspection');
            transitions('Generate F; use native keyboard A/F and P anchors; inspect exact intent declaration; return to Work; print fixed P/Q without U');
        } },
    { caseId: 'TC-TPT-241', owner: 'WorkTracking/README.TaskTracking-Part6.md', variant: 'fresh-source-and-generation-refusal', name: 'A real owned output obstruction preserves prior report and draft, then explicit refresh publishes the actual changed-source result',
        expectedConsole: [/Failed to load resource.*(?:422|500)/], setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const initial = await ensureReport(f.root, { groupId: 'FEATURE-F' }); assert.ok(['generated', 'current'].includes(initial.status), JSON.stringify(initial));
            const target = path.join(f.root, initial.path); const prior = fs.readFileSync(target); const priorManifest = inspectReport(f.root, initial.path).manifest;
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).getByRole('button', { name: /^Inspect group FEATURE-F:/ }).click();
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            await page.getByLabel('Group purpose', { exact: true }).selectOption('program'); await keepDraftAndNavigate(page, 'Changes');
            // Isolated fail-safe variant: another process can replace an output path with a directory.
            // Preserve the actual previously generated artifact under an owned sibling path, then restore it in finally.
            f.write('src/integration.js', 'module.exports = "a teammate changed the governed source before report reopen";\n');
            const before = canonicalFacts(f); const current = f.progress({ groupId: 'FEATURE-F' });
            assert.notEqual(current.fingerprint, priorManifest.fingerprint);
            const held = `${target}.owned-before-refusal`; fs.renameSync(target, held);
            try {
                fs.mkdirSync(target);
                const refused = page.waitForResponse(response => new URL(response.url()).pathname === '/api/report');
                await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click(); const response = await refused;
                assert.equal(response.ok(), false);
                await page.getByRole('status').getByText(/^Report refresh remains pending:/).waitFor();
                assert.equal(await page.getByRole('status').getByText(/Offline report: current|Saved .* in the local checkout/).count(), 0);
                assert.deepEqual(fs.readFileSync(held), prior); assertCanonicalFacts(f, before);
                await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
                assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program');
                await keepDraftAndNavigate(page, 'Changes');
            } finally {
                if (fs.existsSync(target) && fs.statSync(target).isDirectory()) fs.rmdirSync(target);
                fs.renameSync(held, target);
            }
            assert.deepEqual(fs.readFileSync(target), prior);
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: generated/).waitFor();
            const fresh = inspectReport(f.root, initial.path); assert.equal(fresh.manifest.fingerprint, current.fingerprint);
            assert.notEqual(fresh.manifest.fingerprint, priorManifest.fingerprint); assert.equal(fresh.manifest.groupId, 'FEATURE-F');
            assert.notDeepEqual(fs.readFileSync(target), prior);
            assert.equal(f.view('TASK-P').verification.status, 'stale'); assert.equal(f.view('TASK-Q').verification.status, 'stale');
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Group purpose', { exact: true }).inputValue(), 'program'); assertCanonicalFacts(f, before);
            await capture('fresh-report-refusal-draft-retained', 'Actual output obstruction refuses refresh without a success claim; prior bytes and draft survive, then explicit retry renders the changed source fingerprint with stale proof');
            transitions('Change actual governed source; obstruct owned output; observe real refusal; restore only owned artifact; explicitly refresh fresh source while retaining draft');
        } },
    { caseId: 'TC-TPT-007', owner: MAIN_OWNER, variant: 'live-report-in-app', name: 'The status report opens inside the workspace for the selected scope, follows saved and outside changes, and a refusal keeps the last report readable',
        expectedConsole: [/Failed to load resource.*422/], setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const control = f.bytes('TASK-Q');
            await open();
            // Whole project: opening the view generates the report through the one owner and shows that exact artifact.
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            await page.getByRole('heading', { name: 'Status report', exact: true }).waitFor();
            const project = await frameManifest(page); const projectArtifact = inspectReport(f.root, reportPath());
            assert.equal(project.outputHash, projectArtifact.manifest.outputHash, 'The frame holds the generated project report, not a second rendering');
            assert.equal(project.groupId, null); assert.equal(project.fingerprint, f.progress().fingerprint);
            assert.equal(await page.locator('iframe.report-frame').getAttribute('title'), 'Status report: Whole project, your working copy');
            assert.equal(await page.locator('iframe.report-frame').getAttribute('sandbox'), 'allow-scripts allow-modals');
            // While another report is on its way the frame still holds the last one read; the strip must say so, never "Up to date".
            {
                let release; const held = new Promise(resolve => { release = resolve; });
                await page.route('**/api/report-view', async route => { await held; await route.continue(); });
                await page.getByRole('button', { name: 'Refresh report', exact: true }).click();
                await page.locator('.report-state').getByText('Updating…', { exact: true }).waitFor();
                assert.equal(await page.locator('.report-state').getByText('Up to date', { exact: true }).count(), 0);
                await page.getByText('Showing the last report read: Whole project, your working copy', { exact: true }).waitFor();
                release();
                await page.locator('.report-state').getByText('Up to date', { exact: true }).waitFor();
                await page.unroute('**/api/report-view');
                assert.equal(await page.getByText(/^Showing the last report read:/).count(), 0);
            }
            // The report runs apart from the workspace page: it cannot reach the page or the session kept for it.
            assert.deepEqual(await reportFrame(page).locator('html').evaluate(() => {
                const denied = read => { try { read(); return 'reached'; } catch (error) { return error.name; } };
                return [denied(() => window.parent.document.title), denied(() => window.sessionStorage.length)];
            }), ['SecurityError', 'SecurityError']);
            // A chosen group: the report shows exactly the eligible work the workspace counts for that scope.
            await chooseDeliveryScope(page, 'FEATURE-F', transitions); const counted = await eligibleIds(page);
            assert.deepEqual(counted, ['TASK-P', 'TASK-Q']);
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const scoped = await frameManifest(page); const scopedPath = reportPath({ groupId: 'FEATURE-F' });
            assert.equal(scoped.groupId, 'FEATURE-F'); assert.equal(scoped.outputHash, inspectReport(f.root, scopedPath).manifest.outputHash);
            assert.deepEqual(await reportEligibleIds(reportFrame(page)), counted);
            assert.match(await page.locator('iframe.report-frame').getAttribute('title'), /^Status report: .*FEATURE-F.*, your working copy$/);
            assert.equal(await reportFrame(page).locator('.work-row[data-item-id="TASK-P"]').getAttribute('data-owner'), 'owner');
            // A long scope name is shortened, not laid over its neighbours: coverage and Reread stay apart and the source stays readable.
            const bar = await page.evaluate(() => {
                const box = node => { const { left, right, top, bottom, width } = node.getBoundingClientRect(); return { left, right, top, bottom, width }; };
                return { coverage: box(document.querySelector('#source-context .pill')), reread: box(document.querySelector('#session-tools .reread')),
                    scope: box(document.querySelector('[data-opens="scope-group"]')), source: box(document.querySelector('[data-opens="scope-ref"]')), page: document.documentElement.clientWidth };
            });
            const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
            assert.equal(apart(bar.coverage, bar.reread), true, 'Coverage and Reread do not overlap');
            assert.equal(apart(bar.scope, bar.source) && apart(bar.source, bar.coverage) && apart(bar.scope, bar.coverage), true, 'Scope, source and coverage do not overlap');
            assert.ok(bar.source.width >= 160 && bar.scope.width >= 160, 'Scope and source selectors keep a readable width');
            assert.ok(Math.max(bar.coverage.right, bar.reread.right, bar.source.right, bar.scope.right) <= bar.page, 'The bar stays inside the page');
            await capture('report-in-app', 'The selected group status report is readable inside the workspace with the same eligible tasks as the scope');
            // The frame and the document loaded in it survive a redraw that leaves the report as it was.
            const frameMarks = async () => [await page.locator('iframe.report-frame').evaluate(node => node.keptAcrossRedraws === true),
                await reportFrame(page).locator('html').evaluate(() => window.loadedOnce === true)];
            const markFrame = async () => { await page.locator('iframe.report-frame').evaluate(node => { node.keptAcrossRedraws = true; }); await reportFrame(page).locator('html').evaluate(() => { window.loadedOnce = true; }); };
            await markFrame();
            await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal((await frameManifest(page)).outputHash, scoped.outputHash, 'Nothing changed, so the same report is shown');
            assert.deepEqual(await frameMarks(), [true, true], 'An unchanged report is neither replaced nor loaded again');
            assert.equal(await isFocused(page.getByRole('button', { name: 'Refresh report', exact: true })), true);
            // A change saved in the workspace is in the report the next time it is opened; no separate refresh is asked for.
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Assign', exact: true }).click();
            await page.getByLabel('Responsible member').selectOption('peer'); await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-P').assigneeId, 'peer');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const saved = await frameManifest(page);
            assert.notEqual(saved.fingerprint, scoped.fingerprint); assert.equal(saved.fingerprint, f.progress({ groupId: 'FEATURE-F' }).fingerprint);
            assert.equal(await reportFrame(page).locator('.work-row[data-item-id="TASK-P"]').getAttribute('data-owner'), 'peer');
            // A change made outside the workspace arrives with one refresh: the same frame, holding the new report.
            await markFrame();
            f.write('src/integration.js', 'module.exports = "a teammate changed the governed source while the report was open";\n');
            await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
            const outside = await frameManifest(page);
            assert.deepEqual(await frameMarks(), [true, false], 'A changed report is loaded into the frame that was already there');
            assert.notEqual(outside.fingerprint, saved.fingerprint); assert.equal(outside.fingerprint, f.progress({ groupId: 'FEATURE-F' }).fingerprint);
            assert.equal(await page.getByRole('alert').count(), 0);
            // A person's own file in the report's place is never replaced: the refusal is stated and the last report stays readable.
            const target = path.join(f.root, scopedPath); const held = `${target}.owned-before-refusal`; const notes = 'A person kept their own notes here.\n';
            f.write('src/integration.js', 'module.exports = "changed again before the refused refresh";\n');
            fs.renameSync(target, held);
            try {
                fs.writeFileSync(target, notes);
                const refusal = await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
                assert.equal(refusal.status(), 422); assert.equal((await refusal.json()).code, 'HUMAN_COLLISION');
                const alert = page.getByRole('alert'); await alert.getByText('The report could not be brought up to date', { exact: true }).waitFor();
                assert.match(await alert.innerText(), /left as it is\. Move it away, then refresh the report\. The report below is the last one read: .*FEATURE-F/);
                assert.equal((await frameManifest(page)).fingerprint, outside.fingerprint, 'The last report read stays in the frame');
                assert.deepEqual(await reportEligibleIds(reportFrame(page)), counted);
                await page.getByText('Not updated', { exact: true }).waitFor();
                assert.equal(fs.readFileSync(target, 'utf8'), notes, 'The file a person put there is untouched');
                await capture('report-refusal-kept', 'A refused report refresh states the reason and what to do while the last report read stays in the frame');
            } finally {
                fs.rmSync(target, { force: true }); fs.renameSync(held, target);
            }
            await shownReport(page, () => page.getByRole('alert').getByRole('button', { name: 'Try again', exact: true }).click());
            const recovered = await frameManifest(page);
            assert.equal(recovered.fingerprint, f.progress({ groupId: 'FEATURE-F' }).fingerprint); assert.notEqual(recovered.fingerprint, outside.fingerprint);
            assert.equal(await page.getByRole('alert').count(), 0); await page.getByText('Up to date', { exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-Q'), control);
            transitions('Open project report in the workspace; choose a group and reopen; save an assignment and reopen; change source outside and refresh; obstruct with a personal file; restore and try again');
        } },
    { caseId: 'TC-TPT-242', owner: VOCABULARY_OWNER, variant: 'earlier-project-current-words', name: 'An earlier-vocabulary project is shown in the current words with its recorded numbers and a read-only notice, in the workspace and in its report',
        setup: async f => { f.earlier = await earlierProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN work stored in the earlier words; WHEN it is read; THEN every word shown is current, every number is the recorded one and nothing is saved.
            const { ids, expected } = f.earlier; const stored = f.storedState();
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.match(await notice.innerText(), /It stores the earlier vocabulary\. Work is shown in the current words and every count is unchanged\. Preview the migration with the task tool: migrate --root <checkout> --dry-run\. Then run it without --dry-run\./);
            const overview = await page.getByRole('main').innerText();
            assert.match(overview, new RegExp(`${expected.total} eligible unique tasks`)); assert.equal(expected.remaining, 1);
            // One of a thing is named in the singular.
            assert.match(overview, /; 1 accepted task with proof that still applies; 1 eligible task not accepted\./);
            assert.match(await page.locator('.hero-count').innerText(), new RegExp(`^${expected.accepted}\\s+of ${expected.total} tasks accepted$`)); assert.match(overview, /50\.0%/);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            await capture('earlier-vocabulary-read-only', 'Progress of an earlier-vocabulary project is shown in the current words under a persistent notice that names its migration; capture is unavailable');
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            const list = page.getByRole('region', { name: 'Work list', exact: true });
            assert.deepEqual([...new Set(await list.locator('.kind').allTextContents())].sort(), CURRENT_KIND_NAMES);
            assert.equal(await list.getByRole('button', { name: new RegExp(`^${ids.remaining}: .*\\. Planned;`) }).count(), 1);
            await list.getByRole('button', { name: new RegExp(`^${ids.accepted}:`) }).click();
            await selectedPane(page).getByRole('heading', { name: new RegExp(`^${ids.accepted}:`) }).waitFor();
            await selectedPane(page).getByText(/^Migration required: this project stores the earlier vocabulary and is read-only/).waitFor();
            for (const action of ['Assign', 'Refine work', 'Edit links', 'Change state', 'Retire work', 'Attest record health']) assert.equal(await selectedPane(page).getByRole('button', { name: action, exact: true }).count(), 0, `${action} is not offered`);
            assert.equal((await selectedPane(page).locator('.link-relation').allTextContents())[0], 'Initiative', 'The link to the captured intent is an initiative link');
            await list.getByRole('button', { name: new RegExp(`^${ids.group}:`) }).click();
            await selectedPane(page).getByText('Group purpose: Bet (program)', { exact: true }).waitFor();
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).count(), 0);
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            await frame.getByText('Migration required: this project is read-only.', { exact: true }).waitFor();
            assert.match(await frame.locator('.source-strip').innerText(), /migrate --root <checkout> --dry-run/);
            assert.match(await frame.locator('.hero-count').innerText(), new RegExp(`^${expected.accepted}\\s+of ${expected.total} tasks accepted$`));
            assert.deepEqual([...new Set(await frame.locator('.work-row .kind').allTextContents())].sort(), CURRENT_KIND_NAMES);
            assert.equal(await frame.locator(`.work-row[data-item-id="${ids.remaining}"]`).getAttribute('data-state'), 'planned');
            assert.deepEqual(f.storedState(), stored);
            await capture('earlier-vocabulary-report', 'The status report of the same project carries the same notice, words and numbers');
            await capture('earlier-vocabulary-report-frame', 'The report frame by itself shows the notice, the recorded numbers and the current words at this width', { frame: 'iframe.report-frame' });
            transitions('Read Overview; inspect a task and the group in Work; open the status report');
        } },
    { caseId: 'TC-TPT-243', owner: VOCABULARY_OWNER, variant: 'save-refused-until-migration', name: 'A save sent to a project that stores the earlier vocabulary is refused as migration required, keeps the draft and changes nothing',
        expectedConsole: [/Failed to load resource.*422/], setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN a change previewed in this page while the checkout stored the current vocabulary.
            await open();
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export the selected rows only');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            // WHEN the checkout is switched to work that still stores the earlier vocabulary and the reviewed change is saved.
            await earlierProject(f); const stored = f.storedState();
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            // THEN the refusal names migration, the draft stays and no stored byte changes.
            await page.getByRole('alert').getByText(/^Migration required: this project stores the earlier vocabulary and is read-only; preview and run the tracker migration, then retry/).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            assert.deepEqual(f.storedState(), stored);
            // AND the page has read the project again by itself: it is marked read-only at once, beside the refusal and the kept draft.
            await sourceConditions(page).getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            assert.equal(/Can save locally/.test(await page.locator('#actor-context').innerText()), false);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('alert').getByText(/^Migration required: this project stores the earlier vocabulary and is read-only/).count(), 1);
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.deepEqual(f.storedState(), stored);
            await capture('migration-required-refusal', 'The refused save states migration required beside the retained draft, the project is marked read-only and nothing is reported as saved');
            // AND an explicit reread keeps that: the draft is kept, and neither a preview nor a save is offered for it.
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
            await sourceConditions(page).getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('button', { name: 'Preview change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Preview a refinement; switch the checkout to earlier-vocabulary work; save; reread and keep the draft');
        } },
    unreadableProject('TC-TPT-244', 'mixed-vocabularies', 'A project holding record locations of both vocabularies shows the named reason and no work, count, percentage or report',
        f => { f.write(HAND_WRITTEN_GROUP, HAND_WRITTEN_BYTES); },
        /Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains \(earlier: [a-z, ]+; current: projects\)\.$/),
    unreadableProject('TC-TPT-249', 'migration-in-progress', 'A project whose migration is unfinished shows the named reason and its command, and no work, count, percentage or report',
        f => { f.write(journalPath('work'), JSON.stringify({ steps: [] })); },
        /Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving\. The task tool command is migrate --root <checkout>\.$/),
    { caseId: 'TC-TPT-244', owner: VOCABULARY_OWNER, variant: 'comparison-unreadable-checkout', name: 'Comparing a readable pinned ref with a checkout that holds both vocabularies names that reason and shows no difference, count or sharing hint',
        setup: async f => {
            // Two shared commits: the earlier-vocabulary project, readable, and the same project with a location of the current vocabulary added.
            f.readable = (await earlierProject(f, { commit: true })).oid;
            f.write(HAND_WRITTEN_GROUP, HAND_WRITTEN_BYTES);
            git(f, ['add', '--', 'work']); git(f, ['commit', '-m', 'Both vocabularies']); f.unreadable = git(f, ['rev-parse', 'HEAD']);
            fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const mixed = /Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains \(earlier: [a-z, ]+; current: projects\)\./;
            const inspectRef = async ref => {
                await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(ref);
                await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            };
            // GIVEN a reader on a pinned ref that reads completely.
            await open();
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await inspectRef(f.readable);
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            const pinnedRecords = await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).locator('.tab-count').innerText();
            // WHEN the checkout comes to hold both vocabularies and is compared.
            f.write(HAND_WRITTEN_GROUP, HAND_WRITTEN_BYTES); const stored = f.storedState();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            // THEN the comparison gives its own reason and claims no difference.
            const differs = page.getByRole('region', { name: 'What differs', exact: true });
            await differs.getByText(/^Nothing is compared: the current checkout could not be read\./).waitFor();
            assert.match(await differs.locator('.notice').innerText(), new RegExp(`^Nothing is compared: the current checkout could not be read\\. ${mixed.source} Resolve it, then compare again\\.$`));
            const changesTab = page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true });
            assert.equal(await changesTab.locator('.tab-count').count(), 0, 'The Changes tab carries no count');
            assert.equal(await changesTab.getAttribute('title'), null);
            assert.equal(await page.locator('.compare-link .pill').innerText(), 'Not compared');
            assert.equal(await page.locator('.diff-list, .diff-row, .file-list, .file-mark').count(), 0, 'No difference or file is listed');
            const shown = await page.getByRole('main').innerText();
            assert.equal(/\d+ (?:changed|only in|identical)|records? differs?|Record files that differ|Share them with your usual Git flow|No (?:inspected )?owner (?:content )?differences/.test(shown), false, 'No count, list or sharing hint is shown');
            assert.match(shown, /coverage unavailable/);
            // The pinned ref itself is still read as before.
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).locator('.tab-count').innerText(), pinnedRecords);
            assert.deepEqual(f.storedState(), stored);
            await capture('comparison-unreadable-checkout', 'The comparison names the mixed-vocabulary reason and shows no badge, count, difference list or sharing hint; the pinned ref is still read');
            // AND a pinned ref that itself holds both vocabularies says so where it says it could not be read.
            await inspectRef(f.unreadable);
            const notice = sourceConditions(page);
            await notice.getByText(`${f.unreadable} could not be read`, { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), new RegExp(`^Nothing from the current checkout is shown in its place\\. 1 reason is reported\\. ${mixed.source}$`));
            assert.equal(await page.locator('.tab-count').count(), 0, 'No tab carries a count');
            assert.deepEqual(f.storedState(), stored);
            await capture('pinned-ref-unreadable-reason', 'The banner of a pinned ref that could not be read names the mixed-vocabulary reason');
            // AND a comparison that cannot be made for another reason gives that reason: the checkout no longer holds the selected
            // group. A finding about one unreadable record is listed before it and is not what the comparison says.
            fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true });
            await open();
            await chooseDeliveryScope(page, 'EPIC-E', transitions, { ref: f.readable });
            fs.rmSync(path.join(f.root, 'work/epics/EPIC-E.md')); f.write('work/pbis/BROKEN.md', 'No frontmatter here.\n');
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            await differs.getByText(/^Nothing is compared: the current checkout could not be read\./).waitFor();
            assert.equal(await differs.locator('.notice').innerText(), 'Nothing is compared: the current checkout could not be read. Selected group has no unique project or vision owner. Resolve it, then compare again.');
            assert.match(await differs.textContent(), /BROKEN\.md/, 'The record finding is still listed with the inspection limitations');
            transitions('Inspect a readable pinned ref; make the checkout hold both vocabularies; compare; inspect a pinned ref that holds both; compare a pinned group the checkout no longer holds');
        } },
    { caseId: 'TC-TPT-249', owner: VOCABULARY_OWNER, variant: 'readable-then-migrating', name: 'A page that showed a report and a comparison keeps no number, badge or report once its checkout has an unfinished migration',
        setup: async f => {
            await f.create(); await f.accepted();
            git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Synthetic shared baseline']); f.baseline = git(f, ['rev-parse', 'HEAD']);
            await f.saved('assign', 'TASK-101', { assigneeId: 'peer' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const tab = name => page.getByRole('navigation').getByRole('button', { name, exact: true });
            // GIVEN a readable project whose report was shown and whose pinned baseline was compared with the checkout.
            await open();
            await shownReport(page, () => tab('Report').click());
            assert.match(await reportFrame(page).locator('.hero-count').innerText(), /^1\s+of 1 task accepted$/);
            await tab('Changes').click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(f.baseline);
            await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            await page.getByText('TASK-101: owner difference', { exact: true }).waitFor();
            assert.equal(await tab('Changes').locator('.tab-count--warn').innerText(), '1');
            assert.equal(await page.locator('.compare-link .pill').innerText(), '1 record differs');
            await shownReport(page, () => tab('Report').click());
            assert.equal(await page.locator('iframe.report-frame').count(), 1);
            assert.equal(await tab('Changes').locator('.tab-count--warn').innerText(), '1', 'The comparison is still loaded while the report is shown');
            // WHEN a migration of the checkout stops part-way and the reader returns to the checkout.
            f.write(journalPath('work'), JSON.stringify({ steps: [] })); const stored = f.storedState();
            await sourceConditions(page).getByRole('button', { name: 'Inspect current checkout', exact: true }).click();
            // THEN the reason stands alone: no earlier number, badge or report is left in any view.
            const notice = sourceConditions(page);
            await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), /^Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving\. The task tool command is migrate --root <checkout>\.$/);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            for (const [view, title] of [['Report', 'Status report'], ['Changes', 'Changes and sharing'], ['Work', 'Work'], ['My work', 'My work'], ['People', 'People'], ['Overview', 'Project progress']]) {
                await tab(view).click();
                await page.getByRole('heading', { name: title, exact: true }).waitFor();
                const shown = await page.getByRole('main').innerText();
                assert.match(shown, /No work, count or report is shown while this source cannot be read\./);
                assert.equal(/\d+ (?:eligible|matching|open|records?|of \d)|\d%|TASK-101|Responsible for|differs?|Up to date|Written \d/.test(shown), false, `${view} keeps no number, work or report line`);
                assert.equal(await page.locator('.tab-count').count(), 0, `${view}: no tab carries a count`);
                assert.equal(await page.locator('iframe.report-frame').count(), 0, `${view} shows no report`);
                assert.equal(await page.locator('.diff-list, .file-list, .compare-link').count(), 0, `${view} shows no comparison`);
                if (view === 'Changes') await capture('readable-then-migrating', 'After a report and a comparison were shown, the unfinished-migration reason stands alone: no badge, count, difference or report frame remains');
            }
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Show the report; inspect and compare a pinned baseline; show its report; leave a migration unfinished; inspect the current checkout; visit every view');
        } },
    { caseId: 'TC-TPT-242', owner: VOCABULARY_OWNER, variant: 'read-without-vocabulary', name: 'A read that carries no vocabulary is refused whole, when the page opens and after a later read, and the draft returns once the workspace answers in full',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // A workspace started before the tracker was updated answers without the vocabulary; a page loaded after the update asks it.
            const withoutWords = pick => async route => {
                const value = await (await route.fetch()).json();
                delete pick(value).vocabulary;
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
            };
            const refused = async () => {
                await page.getByRole('heading', { name: 'Project could not be opened', exact: true }).waitFor();
                assert.equal((await page.getByRole('main').innerText()).replace(/\s+/g, ' ').trim(),
                    'Project could not be opened This workspace response is unsupported. Relaunch the project tool with the matching framework version. Retry opening project');
                assert.equal(await page.getByRole('navigation').getByRole('button').count(), 0, 'No view is offered');
                assert.equal(await page.locator('#filter-status, #filter-kind, .tab-count, .station-name, .banner').count(), 0, 'No filter, count, station or source condition is drawn');
                assert.equal(/Unknown|TASK-101|Can save locally|Coverage:/.test(await page.locator('body').innerText()), false, 'Nothing read is shown');
                assert.equal(await page.getByRole('status').innerText(), '');
            };
            const before = f.storedState();
            // WHEN the page opens THEN it refuses the read and shows nothing from it.
            await page.route('**/api/session', withoutWords(value => value.snapshot));
            await open();
            await refused();
            await capture('read-without-vocabulary', 'A first read without the vocabulary is refused with the relaunch message; no station, filter, count or work is drawn');
            await page.unroute('**/api/session');
            await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            // WHEN a later read answers without it, with a draft open, THEN the page stops the same way.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export the selected rows only');
            await page.route('**/api/inspect', withoutWords(value => value));
            await retainDraftDuring(page, () => page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click());
            await refused();
            await capture('reread-without-vocabulary', 'A later read without the vocabulary replaces the whole workspace with the same relaunch message');
            // AND once the workspace answers in full, the page opens again with the draft it kept.
            await page.unroute('**/api/inspect');
            await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
            await page.getByRole('heading', { name: 'Refine work', exact: true }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).count(), 1);
            assert.deepEqual(f.storedState(), before);
            transitions('Open against a read without the vocabulary; retry; draft a refinement; reread against a read without the vocabulary; retry');
        } },
    { caseId: 'TC-TPT-250', owner: VOCABULARY_OWNER, variant: 'earlier-record-flagged', name: 'A record still stored in the earlier vocabulary is named with where it was found, earns no count and leaves coverage incomplete',
        setup: async f => {
            await f.create('TASK-1'); await f.accepted('TASK-1'); await f.create('TASK-2');
            // An older branch, combined outside the tracker, brings a delivery item written in the earlier words to a location only that vocabulary used.
            f.strayBytes = '---\nid: P3\ntitle: Work written before the vocabulary change\nintent: Keep an earlier outcome readable\nstatus: draft\ntracking: {schemaVersion: 1, revision: 1, kind: pbi}\n---\nAuthored body stays as written.\n';
            f.write('work/pbis/P3.md', f.strayBytes);
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('Inspection is incomplete', { exact: true }).waitFor();
            assert.match(await notice.innerText(), /no percentage is shown, and nothing can be changed until this is resolved\. 1 reason is reported\. Earlier-vocabulary record: not counted: P3 at work\/pbis\/P3\.md\./);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            const overview = await page.getByRole('main').innerText();
            assert.match(overview, /2 eligible unique tasks/); assert.match(overview, /Unknown; no complete nonempty denominator/);
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            const list = page.getByRole('region', { name: 'Work list', exact: true });
            assert.equal(await list.getByRole('button', { name: /^TASK-[12]:/ }).count(), 2); assert.equal(await list.getByRole('button', { name: /^P3:/ }).count(), 0);
            await capture('earlier-record-flagged', 'The flagged record is named with its location in the incomplete-coverage notice; only current-vocabulary work is listed and no percentage is shown');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            assert.match(await frame.locator('.limits').innerText(), /P3: work\/pbis\/P3\.md: EARLIER_VOCABULARY_RECORD: Earlier-vocabulary record: not counted/);
            assert.equal(await frame.locator('.hero-rate').count(), 0); assert.equal(await frame.locator('.work-row').count(), 2);
            assert.equal(fs.readFileSync(path.join(f.root, 'work/pbis/P3.md'), 'utf8'), f.strayBytes);
            transitions('Read Overview; list Work; open the status report');
        } },
    { caseId: 'TC-TPT-252', owner: VOCABULARY_OWNER, variant: 'new-work-current-words', name: 'New work is named in the current words in capture choices, lists, detail, the board, group maintenance and the status report',
        setup: async f => {
            for (const [id, kind, title] of [['INITIATIVE-1', 'initiative', 'Faster exports'], ['SUBTASK-1', 'subtask', 'Index the export table'],
                ['STORY-1', 'story', 'Export from the list'], ['PROJECT-1', 'project', 'Export release']]) await f.create(id, kind, { title });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            const kind = page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true });
            assert.deepEqual(await kind.locator('option').evaluateAll(options => options.map(option => [option.value, option.textContent])),
                [['initiative', 'Initiative'], ['task', 'Task'], ['story', 'Story'], ['subtask', 'Subtask'], ['project', 'Project group'], ['vision', 'Vision']]);
            await kind.selectOption('project'); assert.equal(await page.locator('#kind-help').innerText(), 'A project group collects work and can be chosen as a progress scope.');
            await kind.selectOption('subtask'); assert.equal(await page.locator('#kind-help').innerText(), 'A subtask is tracked outside the delivery count.');
            await kind.selectOption('task'); assert.equal(await page.locator('#kind-help').innerText(), 'A task counts toward delivery, one block each.');
            await page.getByLabel('Title', { exact: true }).fill('Export selected rows');
            await page.getByLabel('Intended outcome', { exact: true }).fill('People export only the rows they select');
            await saveReviewed(page, transitions);
            const task = f.records().map(record => f.view(record.id)).find(view => view.kind === 'task');
            assert.match(task.id, /^task-/i); assert.match(task.ownerPath, /^work\/tasks\//);
            // Planning the task is the step named for the Planned state.
            await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).click();
            await page.getByRole('heading', { name: 'Change work to Planned', exact: true }).waitFor();
            await saveReviewed(page, transitions);
            assert.equal(f.view(task.id).state, 'planned');
            await selectWork(page, 'PROJECT-1', transitions);
            await selectedPane(page).getByRole('button', { name: 'Manage group', exact: true }).click();
            const purpose = page.getByLabel('Group purpose', { exact: true });
            assert.deepEqual((await purpose.locator('option').allTextContents()).slice(1, 4), ['Area (area)', 'Feature (capability)', 'Program (program)']);
            await purpose.selectOption('program');
            await page.getByLabel('Update members', { exact: true }).check();
            await page.getByLabel(new RegExp(`^${task.id}:`)).check();
            await saveReviewed(page, transitions);
            assert.equal(f.view('PROJECT-1').groupRole, 'program'); assert.deepEqual(f.view('PROJECT-1').memberItemIds, [task.id]);
            await selectedPane(page).getByText('Group purpose: Program (program)', { exact: true }).waitFor();
            const workList = page.getByRole('region', { name: 'Work list', exact: true });
            assert.deepEqual([...new Set(await workList.locator('.kind').allTextContents())].sort(), CURRENT_KIND_NAMES);
            assert.deepEqual(await page.locator('#filter-status option').allTextContents(), ['Any state', 'Draft', 'Planned', 'Ready', 'In progress', 'Blocked', 'Verifying', 'Done', 'Canceled']);
            assert.deepEqual(await page.locator('#filter-kind option').allTextContents(), ['Any kind', 'Initiative', 'Task', 'Story', 'Subtask', 'Project group', 'Vision']);
            await page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name: 'Board', exact: true }).click();
            await workList.getByRole('list', { name: 'Planned: 1 records', exact: true }).getByRole('button', { name: new RegExp(`^${task.id}:`) }).waitFor();
            assert.equal(EARLIER_DISPLAY_WORDS.test(await page.locator('body').innerText()), false, 'Work shows no earlier word');
            await capture('current-words-work', 'Kinds, the Planned lane and the Program purpose are named in the current words after capturing, planning and grouping a task');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.getByRole('main').innerText(), /1 eligible unique tasks/);
            assert.equal(await page.getByRole('button', { name: 'Planned: 1 records. Show them in Work.', exact: true }).count(), 1);
            assert.equal(EARLIER_DISPLAY_WORDS.test(await page.locator('body').innerText()), false, 'Overview shows no earlier word');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            assert.match(await frame.locator('.hero-count').innerText(), /^0\s+of 1 task accepted$/);
            assert.deepEqual([...new Set(await frame.locator('.work-row .kind').allTextContents())].sort(), CURRENT_KIND_NAMES);
            assert.equal(await frame.locator(`.work-row[data-item-id="${task.id}"]`).locator('.state').innerText(), 'Planned');
            assert.equal(EARLIER_DISPLAY_WORDS.test(await frame.locator('body').innerText()), false, 'The status report shows no earlier word');
            assert.match(await frame.locator('body').innerText(), /Initiatives, stories and subtasks sit outside this count\./);
            await capture('current-words-report', 'The status report counts the one task as delivery and names every kind and state in the same current words');
            transitions('Capture a task; plan it; group it with the program purpose; read the board, Overview and the status report');
        } }
];

function parseArguments(args) {
    const options = { headed: false, filter: '', evidenceRoot: path.resolve('tmp/task-track-browser'), list: false };
    const seen = new Set();
    for (const argument of args) {
        const key = argument.split('=')[0];
        if (seen.has(key)) throw new Error(`Repeated argument: ${key}`);
        seen.add(key);
        if (argument === '--headed') options.headed = true;
        else if (argument === '--list') options.list = true;
        else if (argument.startsWith('--filter=') && argument.length > '--filter='.length) options.filter = argument.slice('--filter='.length);
        else if (argument.startsWith('--evidence-root=') && argument.length > '--evidence-root='.length) {
            const relative = argument.slice('--evidence-root='.length);
            if (path.isAbsolute(relative) || !/^(tmp|temp)[\\/]/.test(relative) || relative.split(/[\\/]/).some(part => part === '..')) throw new Error('Evidence root must be a project-relative path beneath tmp/ or temp/');
            options.evidenceRoot = path.resolve(relative);
        } else throw new Error(`Invalid argument: ${key}`);
    }
    return options;
}

async function main(args = process.argv.slice(2)) {
    const options = parseArguments(args);
    const selected = tests.filter(test => !options.filter || `${test.caseId} ${test.variant} ${test.name}`.includes(options.filter));
    if (!selected.length) { console.error('No matching browser cases. Passed0 Failed0 Skipped0; exit1'); return 1; }
    if (options.list) { for (const test of selected) console.log(`${test.caseId}: ${test.name}`); return 0; }
    const runtime = browserRuntime();
    const runId = `${Date.now()}-${crypto.randomUUID()}`;
    const evidence = createEvidence(options.evidenceRoot, runId);
    let passed = 0, failed = 0;
    for (const test of selected) for (const viewport of Object.keys(VIEWPORTS)) {
        try {
            await withWorkspace(test, viewport, { ...options, runtime, evidence }, test.fn);
            passed++;
            evidence.manifest.results.push({ case_id: test.caseId, owner_path: test.owner, variant: test.variant, viewport, status: 'passed' });
            console.log(`PASS ${test.caseId} ${test.variant} ${viewport}`);
        } catch (error) {
            failed++;
            evidence.manifest.results.push({ case_id: test.caseId, owner_path: test.owner, variant: test.variant, viewport, status: 'failed', reason: error.message });
            console.error(`FAIL ${test.caseId} ${test.variant} ${viewport}: ${error.message}`);
        } finally { evidence.persist(); }
    }
    console.log(`Passed${passed} Failed${failed} Skipped0; exit${failed ? 1 : 0}; evidence ${evidence.directory}`);
    return failed ? 1 : 0;
}

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { tests, main, parseArguments };

// These helpers own repeated fixture/interaction mechanics. Each registered case keeps its final business assertions.
function canonicalFacts(f, except = []) {
    return { records: new Map(f.records().filter(record => !except.includes(record.id)).map(record => [record.id, f.bytes(record.id)])),
        files: new Map(['docs/project-config.json', '.claude/.ck.local.json', 'intent/shared.md', 'src/integration.js']
            .filter(relative => fs.existsSync(path.join(f.root, relative))).map(relative => [relative, fs.readFileSync(path.join(f.root, relative))])) };
}
function assertCanonicalFacts(f, before) {
    for (const [id, bytes] of before.records) assert.deepEqual(f.bytes(id), bytes, `Canonical owner ${id} is conserved`);
    for (const [relative, bytes] of before.files) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, `Owned fixture source ${relative} is conserved`);
}
async function hierarchyFixture(f, { concerns = false } = {}) {
    f.write('intent/shared.md', '---\nid: SPEC-SHARED\n---\nOnly the declared integration outcome governs the selected export.\n');
    f.write('src/integration.js', 'module.exports = "reviewed integration outcome";\n');
    for (const [id, kind, title] of [
        ['AREA-A', 'vision', 'Customer area A'], ['AREA-B', 'vision', 'Customer area B'],
        ['FEATURE-F', 'project', 'Shared integration capability'], ['GENERIC-G', 'project', 'Generic outcome group'],
        ['TASK-P', 'task', 'Integration outcome'], ['TASK-Q', 'task', 'Historically accepted outcome'],
        ['TASK-R', 'task', 'Canceled outcome'], ['TASK-S', 'task', 'Retired outcome'],
        ['STORY-SUPPORT', 'story', 'Supporting story'], ['SUBTASK-SUPPORT', 'subtask', 'Supporting subtask'],
        ['TASK-U', 'task', 'Ungrouped outside outcome'], ['SUBTASK-Z', 'subtask', 'Outside parent-linked subtask']]) {
        await f.create(id, kind, { title });
    }
    for (const id of ['TASK-P', 'TASK-Q']) await f.saved('link', id, { links: [
        { relation: 'spec', path: 'intent/shared.md' }, { relation: 'source', path: 'src/integration.js' }] });
    await f.verifying('TASK-P'); await f.saved('proof', 'TASK-P', { proof: f.proof('TASK-P', { summary: 'Observed the declared integration outcome in its exact owner' }) });
    await f.accepted('TASK-Q');
    // A real later authored outcome edit invalidates current proof, while acceptance history remains owned.
    const q = f.record('TASK-Q'); f.write(q.ownerPath, q.text + '\nA teammate changed the governed outcome after acceptance.\n');
    await f.saved('transition', 'TASK-R', { state: 'canceled', reason: 'Outside active delivery' });
    await f.saved('retire', 'TASK-S', { reason: 'Historical delivery scope' });
    await f.saved('link', 'SUBTASK-Z', { links: [{ relation: 'parent', itemId: 'TASK-P' }] });
    await f.saved('group', 'FEATURE-F', { memberItemIds: concerns ? ['TASK-P', 'SUBTASK-SUPPORT']
        : ['TASK-P', 'TASK-Q', 'TASK-R', 'TASK-S', 'STORY-SUPPORT', 'SUBTASK-SUPPORT'], groupRole: 'capability' });
    await f.saved('group', 'GENERIC-G', { memberItemIds: concerns ? [] : ['TASK-Q'] });
    await f.saved('group', 'AREA-A', { memberItemIds: ['FEATURE-F', 'GENERIC-G'], groupRole: 'area' });
    await f.saved('group', 'AREA-B', { memberItemIds: ['FEATURE-F'], groupRole: 'area' });
}
async function chooseDeliveryScope(page, id, transitions, { ref } = {}) {
    await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
    await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
    await page.getByLabel('Delivery scope', { exact: true }).selectOption(id);
    if (ref !== undefined) await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(ref);
    const inspected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/inspect'
        && (response.request().postDataJSON()?.groupId || '') === id);
    await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click(); await inspected;
    await page.getByRole('status').getByText(/Project reread/).waitFor();
    await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    transitions(`Choose actual delivery scope ${id || 'project'}`);
}
async function eligibleIds(page) {
    // Read the identity from the accessible name these rows are found by; their visible text runs the ID into the marks beside it.
    const names = await page.getByRole('region', { name: 'Eligible delivery tasks', exact: true })
        .getByRole('button', { name: /^TASK-/ }).evaluateAll(rows => rows.map(row => row.getAttribute('aria-label')));
    return names.map(name => name.match(/^(TASK-[A-Z]+): /)[1]).sort();
}
async function openEligible(page, id, transitions) {
    await page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: new RegExp(`^${id}:`) }).click();
    await selectedPane(page).getByRole('heading', { name: new RegExp(`^${id}:`) }).waitFor();
    transitions(`Open exact eligible owner ${id}`);
}
async function keepDraftAndNavigate(page, view) {
    await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
    await page.getByRole('heading', { name: ({ Changes: 'Changes and sharing', Overview: 'Project progress' })[view] || view, exact: true }).waitFor();
}
async function exactPreview(page) {
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
    assert.equal(await isFocused(page.getByRole('heading', { name: 'Review this exact change', exact: true })), true, 'A preview puts the reader on what it produced');
    const summary = page.getByText('Exact proposed fields and source identity', { exact: true });
    await summary.click(); return JSON.parse(await summary.locator('..').locator('pre').innerText());
}
async function saveExactPreview(page, transitions) {
    await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('status').getByText(/Saved .* in the local checkout/).waitFor();
    transitions('Save the exact inspected preview');
}
async function disclosedList(page, name) {
    const summary = page.getByText(new RegExp(`^${name} \\(\\d+\\)$`));
    if (await summary.locator('..').getAttribute('open') === null) await summary.click();
    return page.getByRole('list', { name, exact: true });
}
// The scope line alone: the path line beside it can name the same group while another scope is still shown.
const scopeLine = (page, id) => page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).locator('p').filter({ hasText: new RegExp(`^Delivery scope:.*${id}`) });
async function enterDirectGroup(page, id, transitions) {
    const children = await disclosedList(page, 'Direct child groups');
    await children.getByRole('button', { name: new RegExp(`^Inspect group ${id}:`) }).click();
    await scopeLine(page, id).waitFor();
    await page.locator('main[aria-busy="false"]').waitFor(); transitions(`Enter declared direct group ${id}`);
}
// Opens a disclosure and leaves an open one open: a fragment-only navigation keeps the page, and its disclosures, as they were.
async function disclose(summary) { if (await summary.locator('..').getAttribute('open') === null) await summary.click(); }
async function detailJson(page, name) {
    const summary = selectedPane(page).getByText(name, { exact: true });
    if (await summary.locator('..').getAttribute('open') === null) await summary.click();
    return JSON.parse(await summary.locator('..').locator('pre').innerText());
}
async function browserPost(page, endpoint, value, authenticated = true) {
    return page.evaluate(async ({ endpoint, value, authenticated }) => {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json',
            ...(authenticated ? { 'X-Workspace-Session': sessionStorage.getItem('workspace-session') } : {}) }, body: JSON.stringify(value) });
        return { status: response.status, value: await response.json() };
    }, { endpoint, value, authenticated });
}
async function observeConcernRequests(page) {
    const observations = [];
    await page.route('**/api/concerns', async route => {
        const request = route.request().postDataJSON(); const response = await route.fetch();
        observations.push({ request, status: response.status(), value: await response.json() });
        await route.fulfill({ response });
    });
    return observations;
}
async function retainDraftDuring(page, action) {
    await action(); await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
}
// The status report shown inside the workspace: a frame of its own, read only after the workspace has answered and settled.
const reportFrame = page => page.frameLocator('iframe.report-frame');
async function shownReport(page, act) {
    const answered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/report-view');
    await act(); const response = await answered;
    await page.locator('main[aria-busy="false"]').waitFor();
    return response;
}
async function frameManifest(page) {
    const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
    return JSON.parse(await frame.locator('#task-track-manifest').textContent());
}
async function reportEligibleIds(page) {
    const names = await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-/ }).allTextContents();
    return names.map(name => name.match(/TASK-[A-Z]+/)[0]).sort();
}
