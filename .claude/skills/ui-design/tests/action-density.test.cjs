/**
 * Tests for the action & attention evidence tool (scripts/audit-actions.cjs, scripts/lib/action-density.cjs),
 * the measurable side of SYNC:ui-action-density-gate (checklist B16, C10, C14-C20). The tool is evidence,
 * never a verdict: every measure is COUNTED (value, limit, rule, overLimit, the elements behind it) or NOT
 * VERIFIABLE (with a reason); nothing reports PASS, and the run only fails (exit 4) on a broken page.
 *   - summarize() on metric fixtures: over-limit counts name their elements; tinted buttons are listed,
 *     not counted as primaries; the AD-5 rule kind travels with each measure; unobservable values are
 *     NOT VERIFIABLE with a reason; a declared budget is reported as declared;
 *   - the defaults the AD protocol body states equal HEURISTIC_DEFAULTS, so neither drifts alone;
 *   - the render layer (skipped as ENVIRONMENT-BLOCKED when no browser): the markup of four review rounds
 *     (header, nav and sticky actions, tinted secondaries, shadow-DOM components, pricing and card grids,
 *     prose lists, dashboards, form grids, translucent icons, hidden names, collapsed and clipped content,
 *     CSS framework CDNs, remote images, fixed app shells, dialogs, prototypes, a large table) is counted
 *     the way a user sees it;
 *   - usage errors exit 2.
 *
 * Run: node --test .claude/skills/ui-design/tests/action-density.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'audit-actions.cjs');
const FIXTURES = path.join(__dirname, 'fixtures');
const PROTOCOLS = path.resolve(__dirname, '..', '..', 'shared', 'sync-inline-versions.md');
const { HEURISTIC_DEFAULTS, MEASURES, summarize, overLimit, resolveBudget } = require('../scripts/lib/action-density.cjs');
const { osEssentialsEnv } = require('../../../hooks/tests/lib/os-essentials-env.cjs');

const el = (label) => ({ label, selector: `#${label.replace(/\W+/g, '-')}`, box: [0, 0, 100, 40] });
const icon = (changes = {}) => ({ element: el('Close'), named: true, disabled: false, focusTooltip: true, width: 44, height: 44, spacingOk: true,
  contrast: 7, destructive: false, style: 'stroke 1.5', ...changes });

// One view's metrics with nothing over a limit; each case changes one thing.
function cleanView(changes = {}) {
  return {
    visible: true,
    touch: true,
    screenful: { filled: [el('Save')], boxed: [el('Save')] },
    filledControls: 1,
    tinted: [],
    unknownStyles: 0,
    groups: [],
    rows: [{ element: el('row'), filledButtons: 0, boxedButtons: 0, iconActions: 1, metaLines: 1, metaChars: 30 }],
    rowsExcluded: [],
    rowsTruncated: 0,
    blocks: [{ chars: 30, element: el('block') }],
    icons: [icon()],
    imageControls: [],
    grids: [],
    gridsExcluded: [],
    actionEdge: { offset: 0, elements: [el('Save'), el('edge')] },
    remoteStyling: [],
    ...changes,
  };
}
const over = (measures) => overLimit(measures).sort();

test('a clean view has no measure over its limit, and nothing anywhere says PASS', () => {
  const measures = summarize(cleanView(), resolveBudget(null));
  assert.deepEqual(over(measures), []);
  assert.deepEqual(Object.keys(measures), Object.keys(MEASURES));
  for (const [id, m] of Object.entries(measures)) {
    assert.ok(['COUNTED', 'NOT VERIFIABLE'].includes(m.status), `${id}: ${m.status}`);
    assert.equal(m.rule, MEASURES[id], `${id} carries its rule kind`);
    if (m.status === 'NOT VERIFIABLE') assert.ok(m.reason, `${id} says why it is not verifiable`);
  }
  assert.ok(!JSON.stringify(measures).includes('PASS'), 'evidence never passes a page');
});

test('two primaries in one screenful are over the limit and named; a tinted button is listed, not counted', () => {
  const measures = summarize(cleanView({ screenful: { filled: [el('Save'), el('Publish')], boxed: [el('Save'), el('Publish')] }, tinted: [el('Save draft')] }), resolveBudget(null));
  const filled = measures['C14.filled'];
  assert.deepEqual([filled.value, filled.limit, filled.overLimit, filled.rule], [2, 1, true, 'structural']);
  assert.deepEqual(filled.elements.map((e) => e.label), ['Save', 'Publish']);
  assert.match(filled.excluded[0].reason, /tinted/);
  assert.deepEqual(filled.excluded[0].elements.map((e) => e.label), ['Save draft']);
});

test('boxed buttons over the budget are a default (heuristic) count; a declared budget is reported as declared', () => {
  const boxed = [el('A'), el('B'), el('C'), el('D')];
  const heuristic = summarize(cleanView({ screenful: { filled: [el('A')], boxed } }), resolveBudget(null))['C14.textButtons'];
  assert.deepEqual([heuristic.value, heuristic.overLimit, heuristic.source, heuristic.rule], [4, true, 'heuristic', 'default']);
  const declared = summarize(cleanView({ screenful: { filled: [el('A')], boxed } }), resolveBudget({ textButtonsPerView: 5 }))['C14.textButtons'];
  assert.deepEqual([declared.overLimit, declared.source], [false, 'declared']);
});

test('a ragged group and a mix down repeated rows are over; a footer line of the primary plus quieter buttons is not a mix', () => {
  const ragged = summarize(cleanView({ groups: [{ axis: 'line', inRow: false, widths: [72, 48, 52], styles: ['outlined', 'outlined', 'outlined'], elements: [el('a'), el('b'), el('c')] }] }), resolveBudget(null));
  assert.deepEqual([ragged['C15.spread'].overLimit, ragged['C15.spread'].elements.length], [true, 3]);
  const footer = summarize(cleanView({ groups: [{ axis: 'line', inRow: false, widths: [120, 120, 120], styles: ['outlined', 'outlined', 'filled'], elements: [] }] }), resolveBudget(null));
  assert.equal(footer['C15.mix'].overLimit, false);
  const column = summarize(cleanView({ groups: [{ axis: 'column', inRow: true, widths: [120, 120], styles: ['filled', 'outlined'], elements: [] }] }), resolveBudget(null));
  assert.equal(column['C15.mix'].overLimit, true);
  const inRow = summarize(cleanView({ groups: [{ axis: 'line', inRow: true, widths: [120, 80], styles: ['filled', 'outlined'], elements: [] }] }), resolveBudget(null));
  assert.equal(inRow['C15.mix'].overLimit, true, 'a mix along a repeated row');
});

test('a boxed button per row is structural; extra inline icons and a second meta line are defaults', () => {
  const measures = summarize(cleanView({ rows: [{ element: el('r1'), filledButtons: 0, boxedButtons: 1, iconActions: 2, metaLines: 2, metaChars: 120 }] }), resolveBudget(null));
  assert.deepEqual([measures['C16.rowButtons'].overLimit, measures['C16.rowButtons'].rule], [true, 'structural']);
  assert.deepEqual([measures['C16.rowIcons'].overLimit, measures['C16.rowIcons'].rule], [true, 'default']);
  assert.deepEqual([measures['B16.metaLines'].overLimit, measures['B16.metaLines'].rule], [true, 'default']);
  assert.deepEqual([measures['B16.metaChars'].overLimit, measures['B16.metaChars'].source], [true, 'heuristic']);
  assert.equal(summarize(cleanView({ blocks: [{ chars: 200, element: el('long') }] }), resolveBudget(null))['B16.blockChars'].overLimit, true);
});

test('icon evidence: unnamed and untooltipped icons are named; hover is never claimed; an unprobed tooltip is NOT VERIFIABLE', () => {
  const bad = summarize(cleanView({ icons: [icon({ named: false, focusTooltip: false, element: el('Trash') })] }), resolveBudget(null));
  assert.deepEqual([bad['C17.name'].overLimit, bad['C17.tooltip'].overLimit], [true, true]);
  assert.match(bad['C17.tooltip'].reason, /hover is never measured/);
  const unprobed = summarize(cleanView({ icons: [icon({ focusTooltip: null })] }), resolveBudget(null))['C17.tooltip'];
  assert.equal(unprobed.status, 'NOT VERIFIABLE');
  const disabled = summarize(cleanView({ icons: [icon({ disabled: true, focusTooltip: null, contrast: null })] }), resolveBudget(null));
  assert.deepEqual([disabled['C17.tooltip'].overLimit, disabled['C17.contrast'].overLimit], [false, false], 'a disabled icon is exempt');
});

test('targets: below the standard minimum unless spaced (WCAG 2.5.8); the touch recommendation applies on touch only', () => {
  const small = icon({ width: 20, height: 20, spacingOk: false });
  assert.equal(summarize(cleanView({ icons: [small] }), resolveBudget(null))['C17.targetMinimum'].overLimit, true);
  assert.equal(summarize(cleanView({ icons: [{ ...small, spacingOk: true }] }), resolveBudget(null))['C17.targetMinimum'].overLimit, false, 'spacing exception');
  const short = icon({ width: 44, height: 20, spacingOk: false });
  assert.equal(summarize(cleanView({ icons: [short] }), resolveBudget(null))['C17.targetMinimum'].overLimit, true, 'height alone counts');
  const pointer = summarize(cleanView({ touch: false, icons: [icon({ width: 32, height: 32 })] }), resolveBudget(null));
  assert.deepEqual([pointer['C17.targetTouch'].status, pointer['C17.targetMinimum'].overLimit], ['NOT VERIFIABLE', false]);
  assert.equal(summarize(cleanView({ icons: [icon({ width: 32, height: 32 })] }), resolveBudget(null))['C17.targetTouch'].overLimit, true);
});

test('contrast, icon styles and destructive icons: unknown is NOT VERIFIABLE; mixed styles are over; destructive is evidence only', () => {
  assert.equal(summarize(cleanView({ icons: [icon({ contrast: 2 })] }), resolveBudget(null))['C17.contrast'].overLimit, true);
  assert.equal(summarize(cleanView({ icons: [icon({ contrast: null })] }), resolveBudget(null))['C17.contrast'].status, 'NOT VERIFIABLE');
  const mixed = summarize(cleanView({ icons: [icon(), icon({ style: 'fill', element: el('Star') })] }), resolveBudget(null))['C10.iconStyles'];
  assert.deepEqual([mixed.value, mixed.overLimit], [2, true]);
  assert.equal(summarize(cleanView({ icons: [icon({ style: null })] }), resolveBudget(null))['C10.iconStyles'].status, 'NOT VERIFIABLE');
  const destructive = summarize(cleanView({ icons: [icon({ destructive: true })] }), resolveBudget(null))['C17.destructive'];
  assert.deepEqual([destructive.value, destructive.overLimit, destructive.rule], [1, null, 'evidence']);
});

test('grids: unequal tile heights or widths are over; an excluded grid is listed with why; a single flex row is NOT VERIFIABLE for the band', () => {
  const grid = (changes) => ({ element: el('grid'), tiles: [el('t1')], heightSpread: 0, widthSpread: 0, baselineSpread: 0, columnWidth: 200, emptyBand: 0, repeatedImage: 0, ...changes });
  assert.equal(summarize(cleanView({ grids: [grid({ widthSpread: 100 })] }), resolveBudget(null))['C18.tileSize'].overLimit, true, 'width counts');
  assert.equal(summarize(cleanView({ grids: [grid({ heightSpread: 40 })] }), resolveBudget(null))['C18.tileSize'].overLimit, true);
  const excluded = summarize(cleanView({ gridsExcluded: [{ reason: 'form layout', element: el('form') }] }), resolveBudget(null))['C18.tileSize'];
  assert.equal(excluded.excluded[0].reason, 'form layout');
  assert.equal(summarize(cleanView({ grids: [grid({ emptyBand: null })] }), resolveBudget(null))['C19.emptyBand'].status, 'NOT VERIFIABLE');
  assert.equal(summarize(cleanView({ grids: [grid({ emptyBand: 500 })] }), resolveBudget(null))['C19.emptyBand'].overLimit, true);
  assert.equal(summarize(cleanView({ actionEdge: null, actionEdgeReason: 'no filled primary' }), resolveBudget(null))['C19.actionEdge'].status, 'NOT VERIFIABLE');
});

test('an invalid declared budget value is listed as ignored; a hidden view is NOT VERIFIABLE on every measure', () => {
  const budget = resolveBudget({ textButtonsPerView: '1', rowMetaChars: 60 });
  assert.deepEqual([budget.ignored, budget.source.textButtonsPerView, budget.values.rowMetaChars], [['textButtonsPerView'], 'heuristic', 60]);
  const hidden = summarize({ visible: false, reason: 'view not visible' }, resolveBudget(null));
  assert.ok(Object.values(hidden).every((m) => m.status === 'NOT VERIFIABLE' && m.reason === 'view not visible'));
});

test('a capped count with no violation is NOT VERIFIABLE, never an all-clear', () => {
  const groups = summarize(cleanView({ groupsTruncated: 3 }), resolveBudget(null));
  assert.deepEqual([groups['C15.mix'].status, groups['C15.spread'].status], ['NOT VERIFIABLE', 'NOT VERIFIABLE']);
  const rows = summarize(cleanView({ rowsTruncated: 300 }), resolveBudget(null));
  assert.deepEqual([rows['C16.rowButtons'].status, rows['B16.metaLines'].status], ['NOT VERIFIABLE', 'NOT VERIFIABLE']);
  const icons = summarize(cleanView({ iconsTruncated: 40 }), resolveBudget(null));
  assert.deepEqual([icons['C17.name'].status, icons['C17.targetTouch'].status], ['NOT VERIFIABLE', 'NOT VERIFIABLE']);
  assert.match(icons['C17.targetTouch'].reason, /first 1 of 41/);
});

test('row and grid exclusions use the same {reason, elements} shape as the other measures', () => {
  const measures = summarize(cleanView({
    rowsExcluded: [{ reason: 'header row', element: el('head') }],
    gridsExcluded: [{ reason: 'form layout', element: el('form') }],
  }), resolveBudget(null));
  assert.deepEqual(measures['C16.rowButtons'].excluded[0].elements.map((e) => e.label), ['head']);
  assert.deepEqual(measures['C18.tileSize'].excluded[0].elements.map((e) => e.label), ['form']);
});

test('the defaults stated in the AD protocol body equal HEURISTIC_DEFAULTS', () => {
  const text = fs.readFileSync(PROTOCOLS, 'utf8');
  const start = text.indexOf('## SYNC:ui-action-density-gate\n');
  assert.ok(start >= 0, 'canonical body missing');
  const body = text.slice(start, text.indexOf('\n---\n', start));
  const stated = {
    buttonGroupWidthSpread: Number((/budget \(default (\d+)%/.exec(body) || [])[1]) / 100,
    rowMetaChars: Number((/default (\d+) characters\)/.exec(body) || [])[1]),
    blockCopyChars: Number((/over (\d+) characters/.exec(body) || [])[1]),
    textButtonsPerView: Number((/budget \(default (\d+)\)/.exec(body) || [])[1]),
    iconTarget: Number((/(\d+)×\d+ pt on iOS/.exec(body) || [])[1]),
    iconTargetPointer: Number((/WCAG 2\.5\.8: (\d+)×\d+ CSS px/.exec(body) || [])[1]),
    iconContrast: Number((/at least (\d+):1 contrast/.exec(body) || [])[1]),
  };
  assert.deepEqual(stated, { ...HEURISTIC_DEFAULTS });
});

function runAudit(args, root) {
  const env = osEssentialsEnv({ HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || browserCache() });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: root, env, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// The browser cache from the real home, resolved before HOME is redirected to the temp folder.
function browserCache() {
  const { resolveBrowsersPath } = require('../../html-export/scripts/lib/browsers-path.cjs');
  return resolveBrowsersPath(process.env, process.platform, process.cwd());
}

function withDir(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-actions-'));
  return Promise.resolve(run(root)).finally(() => fs.rmSync(root, { recursive: true, force: true }));
}

// Runs one audit with an empty budget file, so the host project's declared budget never leaks in.
async function audit(root, name, extra = []) {
  const budget = path.join(root, 'no-budget.json');
  if (!fs.existsSync(budget)) fs.writeFileSync(budget, '{}', 'utf8');
  const out = path.join(root, `${name}-${extra.join('').replace(/\W+/g, '') || 'default'}`);
  const result = await runAudit([path.join(FIXTURES, `${name}.html`), '--viewport=1280x800', `--budget=${budget}`, `--out=${out}`, ...extra], root);
  const reportPath = path.join(out, 'actions-report.json');
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
  return { ...result, report };
}

const measuresOf = (report, view = 0, viewport = 0) => report.viewports[viewport].views[view].measures;
const overOf = (report, view = 0, viewport = 0) => overLimit(measuresOf(report, view, viewport));
const isOver = (report, id, view = 0, viewport = 0) => measuresOf(report, view, viewport)[id].overLimit === true;

test('the render layer counts what a reviewer would see', { timeout: 600_000 }, async (t) => {
  await withDir(async (root) => {
    const probe = await audit(root, 'actions-focused');
    if (probe.status === 3) {
      console.log(`ENVIRONMENT-BLOCKED: ${probe.stderr.split('\n')[0]}`);
      t.skip('ENVIRONMENT-BLOCKED: no browser for html-export');
      return;
    }
    // The corrected twin has no count over a limit (its demo chrome is excluded); the default view is the
    // whole page, and nothing in the report says PASS.
    assert.equal(probe.status, 0, probe.stderr);
    assert.deepEqual(overOf(probe.report), []);
    assert.equal(probe.report.viewports[0].views[0].id, 'page');
    assert.ok(!JSON.stringify(probe.report.viewports[0].views[0].measures).includes('PASS'));
    const phone = await audit(root, 'actions-focused', ['--viewport=390x844']);
    assert.deepEqual([phone.report.viewports[0].touch, isOver(phone.report, 'C17.targetTouch')], [true, false]);

    // The ragged action column: every defect is over its limit and names its elements.
    const ragged = await audit(root, 'actions-ragged');
    assert.equal(ragged.status, 0, 'evidence never fails the run');
    for (const id of ['C14.filled', 'C15.spread', 'C15.mix', 'C16.rowButtons', 'B16.metaLines', 'C17.name', 'C17.tooltip', 'C17.contrast']) {
      assert.ok(isOver(ragged.report, id), `ragged ${id}`);
      assert.ok(measuresOf(ragged.report)[id].elements.length > 0, `ragged ${id} names its elements`);
    }
    const raggedMetrics = ragged.report.viewports[0].views[0].metrics;
    assert.equal(raggedMetrics.rows.length, 2, 'both rows measured');
    assert.equal(raggedMetrics.filledControls, 2, 'a white button on a white page is outlined, not filled');
    const strict = await runAudit([path.join(FIXTURES, 'actions-ragged.html'), '--strict'], root);
    assert.equal(strict.status, 2, 'there is no strict mode: the tool never fails on its counts');

    // Prototype views shown through window.__proto.goTo; a view the page never shows is NOT VERIFIABLE.
    const views = await audit(root, 'actions-views');
    assert.deepEqual([isOver(views.report, 'C14.filled', 0), isOver(views.report, 'C14.filled', 1)], [false, true]);
    const hidden = await audit(root, 'actions-views', ['--views=.later']);
    assert.ok(Object.values(measuresOf(hidden.report)).every((m) => m.status === 'NOT VERIFIABLE'));

    const messy = await audit(root, 'grid-messy');
    for (const id of ['C18.tileSize', 'C18.titleBaseline', 'C19.actionEdge', 'C19.emptyBand']) assert.ok(isOver(messy.report, id), `messy ${id}`);
    assert.ok(measuresOf(messy.report)['C20.placeholder'].value >= 3, 'one image repeated across tiles is counted');
    const regular = await audit(root, 'grid-regular');
    for (const id of ['C18.tileSize', 'C18.titleBaseline', 'C19.actionEdge', 'C19.emptyBand']) assert.ok(!isOver(regular.report, id), `regular ${id}`);
    const colors = await audit(root, 'actions-colors');
    assert.deepEqual([measuresOf(colors.report)['C14.filled'].value, colors.report.viewports[0].views[0].metrics.filledControls], [1, 1], 'oklch is resolved');

    const edge = async (name, extra) => (await audit(root, `edge-${name}`, extra)).report;
    // Rounds 2 and 3: real-world markup.
    assert.ok(isOver(await edge('oklch-row'), 'C16.rowButtons'), 'oklch buttons repeated per row');
    const sronly = await edge('sronly');
    assert.deepEqual([isOver(sronly, 'C17.name'), isOver(sronly, 'C17.contrast')], [false, true], 'a screen-reader label still leaves an icon control');
    const radix = await edge('radix');
    assert.deepEqual([isOver(radix, 'C14.filled'), radix.viewports[0].views[0].id], [true, 'page'], 'component data-state is not a view');
    assert.ok(!isOver(await edge('table'), 'B16.metaLines'), 'table cells are columns, not meta lines');
    assert.ok(!isOver(await edge('badge'), 'B16.metaLines'), 'an icon and a badge on the meta line are one line');
    assert.ok(!isOver(await edge('pricing'), 'C14.filled'), 'parallel plans each carry the one commit');
    const close = await edge('btnclose');
    assert.deepEqual([isOver(close, 'C17.name'), isOver(close, 'C14.filled')], [true, false]);
    assert.ok(!isOver(await edge('fade'), 'C14.filled'), 'a faded-out overlay is not counted');
    const chips = await edge('chips');
    assert.ok(chips.viewports[0].views[0].metrics.gridsExcluded.some((g) => /small items/.test(g.reason)), 'chips are listed as excluded, not judged');
    assert.equal(measuresOf(await edge('overlay'))['C17.contrast'].status, 'NOT VERIFIABLE', 'an icon over an image has no measurable backdrop');
    assert.ok(isOver(await edge('column'), 'C15.spread'), 'a ragged column across rows');
    const remote = await edge('remote');
    assert.ok(remote.viewports[0].renderIncomplete && Object.values(measuresOf(remote)).every((m) => m.status === 'NOT VERIFIABLE'));
    assert.ok(!isOver(await edge('tooltips'), 'C17.tooltip'), 'focus-visible, delayed and ::after tooltips are seen');
    assert.equal(measuresOf(await edge('icons-many'))['C17.tooltip'].status, 'NOT VERIFIABLE', 'icons beyond the probe cap are not claimed');
    assert.equal(measuresOf(await edge('header-cta'))['C14.filled'].value, 3, 'header actions share the screenful with the hero');
    assert.ok(isOver(await edge('two-commits'), 'C14.filled'), 'two commits of one width are not parallel options');
    assert.ok(isOver(await edge('two-panes'), 'C14.filled'), 'panes of one style but different widths are not parallel options');
    assert.ok(isOver(await edge('tile-widths'), 'C18.tileSize'), 'collection tiles of one height but different widths');
    const footer3 = await edge('footer3');
    assert.deepEqual([isOver(footer3, 'C15.mix'), isOver(footer3, 'C19.actionEdge')], [false, false]);
    const form = await edge('form-controls');
    assert.deepEqual([isOver(form, 'C14.textButtons'), isOver(form, 'C17.name')], [false, false], 'choice controls are form fields, not actions');
    assert.ok(isOver(await edge('alpha-icon'), 'C17.contrast'), 'a translucent icon colour is blended');
    assert.ok(isOver(await edge('opacity-icon'), 'C17.contrast'), 'an icon faded by opacity is blended');
    assert.equal(measuresOf(await edge('hidden-name'))['C17.name'].value, 2, 'aria-hidden and display:none text is no name');
    assert.ok(isOver(await edge('focus-ring'), 'C17.tooltip'), 'an empty ::after focus ring is not a tooltip');
    assert.ok(isOver(await edge('btn-group'), 'C15.spread'), 'a touching button group is one group');
    assert.ok(isOver(await edge('height-sort'), 'C15.spread'), 'a centre-aligned group of mixed heights is one group');
    assert.ok(!isOver(await edge('accordion'), 'C14.filled'), 'a collapsed panel is not visible');
    assert.ok(!isOver(await edge('avatar-row'), 'B16.metaLines'), 'an avatar is a picture, not the title');
    const plans = await edge('pricing-list');
    assert.deepEqual([isOver(plans, 'C14.filled'), isOver(plans, 'C16.rowButtons')], [false, false], 'plans side by side are tiles, not list rows');
    assert.ok(!isOver(await edge('long-page'), 'C14.textButtons'), 'boxed buttons are counted per screenful');
    assert.ok(isOver(await edge('repeat-bottom'), 'C14.filled'), 'a repeated call to action does not hide a second commit');
    assert.ok(!isOver(await edge('repeat-cta'), 'C14.filled'), 'the same call to action in header and hero counts once');
    assert.ok(!isOver(await edge('long-commits'), 'C14.filled'), 'one commit per screenful of a long page');
    assert.ok(!isOver(await edge('label-icon'), 'C17.name'), 'an icon named by its <label for> is named');
    const segmented = await edge('segmented');
    assert.deepEqual([isOver(segmented, 'C14.filled'), isOver(segmented, 'C15.mix')], [false, false], 'a selected segment is a choice');
    const cdn = await edge('css-cdn');
    assert.ok(cdn.viewports[0].renderIncomplete && cdn.viewports[0].missingStyling.some((u) => /tailwind/.test(u)), 'a CSS framework script that did not load');
    assert.ok(!isOver(await edge('autofill'), 'C19.emptyBand'), 'empty auto-fill tracks are part of the grid');
    assert.ok(isOver(await edge('wrapper-tiles'), 'C18.tileSize'), 'cards inside stretched cells are measured by their painted box');
    assert.ok(isOver(await edge('padded-cta'), 'C19.actionEdge'), 'a padded wrapper around the action alone is not an edge');
    const dashboard = await edge('dashboard');
    assert.ok(dashboard.viewports[0].views[0].metrics.gridsExcluded.some((g) => /different kinds/.test(g.reason)), 'a dashboard is listed as excluded');
    const disabledIcon = await edge('disabled-icon');
    assert.deepEqual([isOver(disabledIcon, 'C17.tooltip'), isOver(disabledIcon, 'C17.contrast')], [false, false]);
    const gridHeader = await edge('grid-header');
    assert.ok(gridHeader.viewports[0].views[0].metrics.rowsExcluded.some((r) => r.reason === 'header row'), 'a grid header row is not a list row');
    assert.ok(!isOver(await edge('card-wrapper'), 'B16.blockChars'), 'a card-grid wrapper is not a card');
    const wrap = await edge('meta-wrap', ['--viewport=1440x900,390x844']);
    assert.deepEqual([isOver(wrap, 'B16.metaLines', 0, 0), isOver(wrap, 'B16.metaLines', 0, 1), measuresOf(wrap, 0, 1)['B16.metaLines'].rule], [false, true, 'default']);
    const nested = await audit(root, 'edge-proto-nested');
    assert.deepEqual([nested.status, nested.report.viewports[0].views.map((view) => view.id)], [0, ['list', 'detail']]);
    const protoFault = await audit(root, 'edge-proto-fault');
    assert.equal(protoFault.status, 4, 'a goTo that throws is the page\'s fault');
    assert.deepEqual([Boolean(protoFault.report.viewports[0].views[0].measures), Boolean(protoFault.report.viewports[0].views[1].error)], [true, true]);

    // Round 4.
    const r4 = async (name, extra) => (await audit(root, `r4-${name}`, extra)).report;
    assert.equal(measuresOf(await r4('nav-cta'))['C14.filled'].value, 2, 'a filled button inside nav is an action');
    for (const name of ['shadcn-secondary', 'primer-buttons']) {
      const tinted = await r4(name);
      assert.ok(!isOver(tinted, 'C14.filled'), `${name}: a tinted secondary is not a second primary`);
      assert.ok(measuresOf(tinted)['C14.filled'].excluded.some((x) => /tinted/.test(x.reason)), `${name}: tinted buttons are listed`);
    }
    const cards = await r4('li-card-grid');
    assert.deepEqual([isOver(cards, 'C16.rowButtons'), isOver(cards, 'B16.metaLines')], [false, false], 'a card that wraps alone is still a tile');
    const stacked = await r4('pricing-responsive', ['--viewport=390x844']);
    assert.ok(!isOver(stacked, 'C16.rowButtons'), 'plans stacked on a phone are tiles');
    const docs = await r4('docs-steps');
    assert.ok(!isOver(docs, 'B16.metaLines') && docs.viewports[0].views[0].metrics.rowsExcluded.some((r) => /prose/.test(r.reason)), 'prose steps are reading content');
    assert.ok(isOver(await r4('sticky-cta'), 'C14.filled'), 'a sticky header action is in every screenful');
    assert.ok(isOver(await r4('flex-grow-grid'), 'C18.tileSize'), 'tiles of different widths in one collection');
    const tableIcons = await r4('table-icons');
    assert.deepEqual([isOver(tableIcons, 'C16.rowIcons'), isOver(tableIcons, 'C16.rowButtons'), measuresOf(tableIcons)['C16.rowIcons'].rule], [true, false, 'default']);
    const components = await r4('web-components');
    assert.equal(measuresOf(components)['C14.filled'].value, 2, 'filled buttons inside open shadow roots are counted');
    assert.ok(measuresOf(components)['C14.filled'].elements.some((e) => e.label === 'Publish'), 'slotted text names the button');
    assert.ok(isOver(components, 'C17.name'), 'an unnamed icon inside a shadow root');
    const picsum = await r4('picsum');
    assert.deepEqual([picsum.viewports[0].renderIncomplete, isOver(picsum, 'C14.filled')], [false, true], 'a remote image alone leaves the measures valid');
    assert.ok(isOver(await r4('fixed-shell'), 'C14.filled'), 'an app shell of fixed panels is measured');
    assert.ok(!isOver(await r4('balloon-tooltip'), 'C17.tooltip'), 'an opacity-hidden ::after tooltip is seen on focus');
    const gallery = await r4('logo-gallery');
    assert.ok(!isOver(gallery, 'C17.tooltip') && gallery.viewports[0].views[0].metrics.imageControls.length > 0, 'logo and picture links are not icon controls');
    assert.ok(!isOver(await r4('proto-fade'), 'C17.contrast'), 'a prototype view is measured after its fade ends');
    assert.ok(!isOver(await r4('skip-link'), 'C17.name'), 'a screen-reader-only skip link is not measured as an icon');
    assert.equal(measuresOf(await r4('hidden-collapsed'))['C14.filled'].value, 1, 'collapsed, clipped, off-canvas and off-screen buttons are not counted');
    const formGrid = await r4('form-grid');
    assert.ok(!isOver(formGrid, 'C18.tileSize') && formGrid.viewports[0].views[0].metrics.gridsExcluded.some((g) => g.reason === 'form layout'));
    assert.ok(!isOver(await r4('input-submit'), 'C17.name'), 'an input submit without a value has its default label');
    const dialog = await r4('modal-dialog');
    const ids = dialog.viewports[0].views.map((view) => view.id);
    assert.ok(ids[0] === 'page' && ids.includes('confirm'), `each open dialog is its own view: ${ids}`);
    assert.ok(!isOver(dialog, 'C14.filled', 0), 'the page view leaves the dialog buttons to the dialog view');
    assert.ok(isOver(await r4('mixed-icons'), 'C10.iconStyles'), 'outline and filled icons mixed');
    const started = Date.now();
    const big = await audit(root, 'r4-big-table-1500');
    assert.equal(big.status, 0, `a large table is measured, not timed out (${Date.now() - started} ms)`);
    assert.match(measuresOf(big.report)['C16.rowButtons'].reason || '', /first 300 rows/);

    // Round 5: evidence completeness and bounded work.
    const equalCards = await edge('equal-cards');
    assert.deepEqual([isOver(equalCards, 'C14.filled'), measuresOf(equalCards)['C14.filled'].value], [true, 2], 'two equal cards carry two commits');
    const sameLabel = measuresOf(await edge('same-label'))['C14.filled'];
    assert.deepEqual([sameLabel.value, sameLabel.overLimit], [1, false], 'the same label is counted once');
    assert.ok(sameLabel.excluded.some((x) => /same label/.test(x.reason) && x.elements.some((e) => e.label === 'Save')), 'a collapsed control stays in the evidence');
    const divRows = await edge('div-rows');
    assert.deepEqual([divRows.viewports[0].views[0].metrics.structuralRows, divRows.viewports[0].views[0].metrics.rows.length], [8, 8], 'div rows are inferred');
    for (const id of ['C16.rowButtons', 'C15.mix', 'B16.metaLines', 'B16.metaChars']) assert.ok(isOver(divRows, id), `div rows ${id}`);
    assert.match(measuresOf(divRows)['C16.rowButtons'].reason || '', /inferred/);
    const fixed = await edge('offscreen-fixed');
    assert.deepEqual([measuresOf(fixed)['C14.filled'].value, isOver(fixed, 'C14.filled')], [1, false], 'a closed sheet and an off-screen toast are not visible');
    assert.ok(!isOver(await edge('shadow-tooltip'), 'C17.tooltip'), 'a tooltip inside an open shadow root is found on focus');
    const protoDialog = await audit(root, 'edge-proto-dialog');
    const protoIds = protoDialog.report.viewports[0].views.map((view) => view.id);
    assert.equal(protoDialog.status, 0, protoDialog.stderr);
    assert.ok(protoIds.includes('confirm-delete dialog#1'), `the dialog inside a prototype view is its own view: ${protoIds}`);
    const parentView = measuresOf(protoDialog.report, protoIds.indexOf('confirm-delete'));
    const dialogView = measuresOf(protoDialog.report, protoIds.indexOf('confirm-delete dialog#1'));
    assert.deepEqual([parentView['C14.filled'].value, isOver(protoDialog.report, 'C14.filled', protoIds.indexOf('confirm-delete'))], [1, false], 'the view leaves the dialog to the dialog view');
    assert.equal(dialogView['C14.filled'].value, 1, 'the dialog is measured on its own');
    assert.equal(measuresOf(await edge('clip-reveal'))['C14.filled'].value, 1, 'a fully clipped menu is not visible');
    const brand = await edge('brand-fills');
    assert.deepEqual([measuresOf(brand)['C14.filled'].value, isOver(brand, 'C14.filled')], [3, true], 'saturated brand fills are primaries');
    assert.ok(measuresOf(brand)['C14.filled'].excluded.some((x) => /tinted/.test(x.reason) && x.elements.some((e) => e.label === 'Save draft')), 'a neutral tint is listed, not counted');
    const cdnConfig = await audit(root, 'edge-cdn-config');
    assert.equal(cdnConfig.status, 0, 'a blocked script that throws is not a broken page');
    assert.deepEqual([cdnConfig.report.viewports[0].renderIncomplete, cdnConfig.report.viewports[0].pageErrorsFromBlockedScripts], [true, true]);
    assert.ok(Object.values(measuresOf(cdnConfig.report)).every((m) => m.status === 'NOT VERIFIABLE'));
    const stackedSections = await edge('stacked-sections');
    assert.deepEqual([stackedSections.viewports[0].views[0].metrics.structuralRows, measuresOf(stackedSections)['C16.rowButtons'].value], [0, 0], 'stacked sections and cards are not list rows');
    assert.equal(measuresOf(await edge('fab-in-clip'))['C14.filled'].value, 1, 'a fixed action escapes an ancestor overflow clip');
    const cdnReal = await audit(root, 'edge-cdn-real-error');
    assert.equal(cdnReal.status, 4, 'a real page error is not excused by a blocked script');
    assert.equal(cdnReal.report.viewports[0].pageErrorsFromBlockedScripts, false);
    const three = measuresOf(await edge('three-equal-cards'))['C14.filled'];
    assert.deepEqual([three.value, three.excluded.find((x) => /parallel option/.test(x.reason)).elements.length], [1, 2], 'three equal options count once and list the other commits');
    const slide = await audit(root, 'edge-slide-dialog');
    const slideIds = slide.report.viewports[0].views.map((view) => view.id);
    assert.deepEqual(slideIds, ['slide1', 'slide1 dialog#1'], 'a dialog inside a slide is its own view');
    assert.deepEqual([measuresOf(slide.report, 0)['C14.filled'].value, measuresOf(slide.report, 1)['C14.filled'].value], [1, 1]);
    const remoteRun = await audit(root, 'edge-remote');
    assert.match(remoteRun.stdout, /NOT VERIFIABLE \(nothing measured\)/);
    assert.doesNotMatch(remoteRun.stdout, /no count over its limit/);

    // A very large page must finish inside the tool's own bound; a timeout is NOT VERIFIABLE, never exit 4.
    const hugeFile = path.join(root, 'huge-table-7000.html');
    const rows = Array.from({ length: 7000 }, (_, index) => `<tr><td>Row ${index + 1}</td><td>Description</td><td><button class="primary">Open</button> <button>Edit</button> <button aria-label="Delete"><svg width="16" height="16"><path d="M2 2h12v12H2z" fill="none" stroke="#111"/></svg></button></td></tr>`).join('');
    fs.writeFileSync(hugeFile, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px system-ui}.primary{background:#1d4ed8;color:#fff;border:0;padding:6px 12px}td{padding:4px}</style></head><body><table><tbody>${rows}</tbody></table></body></html>`);
    const hugeOut = path.join(root, 'huge-out');
    const huge = await runAudit([hugeFile, '--viewport=1280x800', `--budget=${path.join(root, 'no-budget.json')}`, `--out=${hugeOut}`], root);
    assert.equal(huge.status, 0, `7000 rows finish without a page fault: ${huge.stderr}`);
    const hugeReport = JSON.parse(fs.readFileSync(path.join(hugeOut, 'actions-report.json'), 'utf8'));
    assert.ok(!hugeReport.viewports[0].views.some((view) => view.measurementTimeout), 'the tool’s own timeout is not reported as a page fault');
    assert.match(hugeReport.viewports[0].views[0].measures['C16.rowButtons'].reason || '', /first 300 rows/);
    const timeoutOut = path.join(root, 'timeout-out');
    const timed = await runAudit([hugeFile, '--viewport=1280x800', `--budget=${path.join(root, 'no-budget.json')}`, '--step-timeout=1000', `--out=${timeoutOut}`], root);
    assert.equal(timed.status, 0, `a tool timeout is not a page fault: ${timed.stderr}`);
    const timedReport = JSON.parse(fs.readFileSync(path.join(timeoutOut, 'actions-report.json'), 'utf8'));
    assert.ok(timedReport.viewports[0].views.some((view) => view.measurementTimeout), 'a tool timeout is recorded on the view');
    assert.ok(Object.values(timedReport.viewports[0].views[0].measures).every((m) => m.status === 'NOT VERIFIABLE'));
    assert.match(timed.stdout, /NOT VERIFIABLE \(nothing measured\)/);

    // A page that throws while loading is the page's fault: exit 4, with the error in the report.
    const fault = await audit(root, 'actions-fault');
    assert.equal(fault.status, 4, fault.stderr);
    assert.deepEqual(fault.report.viewports[0].pageErrors, ['the page failed while loading']);
  });
});

test('usage errors exit 2 before any measurement', { timeout: 120_000 }, async () => {
  await withDir(async (root) => {
    const page = path.join(FIXTURES, 'actions-focused.html');
    for (const [args, message] of [
      [[], /an input \.html file is required/],
      [['page.txt'], /must be an \.html or \.htm file/],
      [[page, '--viewport=wide'], /--viewport must be WIDTHxHEIGHT/],
      [[page, '--click'], /unknown argument: --click/],
      [[page, '--strict'], /unknown argument: --strict/],
      [[page, '--viewport=99999x99999'], /outside 200x200\.\.7680x4320/],
      [[page, '--step-timeout=fast'], /--step-timeout must be a whole number/],
      [[page, '--budget='], /--budget needs a value/],
    ]) {
      const result = await runAudit(args, root);
      assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`);
      assert.match(result.stderr, message);
    }
    for (const [args, message] of [[['--views=.missing'], /--views matched nothing/], [['--exclude=[[bad'], /invalid --exclude selector/]]) {
      const result = await runAudit([page, '--viewport=1280x800', ...args, `--out=${path.join(root, 'usage')}`], root);
      if (result.status === 3) return;
      assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`);
      assert.match(result.stderr, message);
    }
  });
});
