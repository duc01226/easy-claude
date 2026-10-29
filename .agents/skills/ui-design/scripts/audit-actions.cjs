#!/usr/bin/env node
'use strict';

/**
 * audit-actions: collects the action & attention evidence (SYNC:ui-action-density-gate AD-5; checklist
 * B16, C10, C14-C20) on a rendered LOCAL page and writes actions-report.json: per view and viewport,
 * each count with its limit, the elements behind it and what was excluded and why. Evidence for a
 * reviewer to confirm by eye, never a verdict: no measure passes or fails the page, and the run never
 * fails on a count.
 *
 * Usage:
 *   node .claude/skills/ui-design/scripts/audit-actions.cjs <file.html> [--views='<selector>']
 *     [--viewport=1440x900,390x844] [--exclude='[data-audit-ignore]'] [--budget=<project-config.json>]
 *     [--step-timeout=<ms>] [--out=<dir>] [--help]
 *
 *   --views     one CSS selector; each match is one view (no match → exit 2). Default: on a mock-up
 *               prototype (window.__proto.goTo exists) its views — [data-export-slide][data-state], else
 *               the outermost [data-state] containers — each shown through goTo(<state>); else each
 *               [data-export-slide]; else the whole page (header, main and footer: one screenful can
 *               hold a header and a hero action) plus each open dialog as its own view.
 *   --exclude   chrome to skip (default [data-audit-ignore]: the demo control bar, narration, banner).
 *   --budget    a project-config file whose uiReview.complexityBudget sets the limits; without it the
 *               project config is read through the framework loader, and undeclared limits are the
 *               HEURISTIC defaults of lib/action-density.cjs.
 *   --out       report folder (default tmp/audit-actions under the current folder).
 *   --step-timeout  bound for one in-page call in ms (default 30000); a timeout makes that view
 *               NOT VERIFIABLE and keeps exit 0.
 *
 * Tooltips are probed on keyboard focus only (hover cannot be driven from inside the page): check
 * hover by hand. A page whose remote stylesheet, script (a CSS framework CDN) or web font could not
 * load offline is measured without what styles it, so every measure is NOT VERIFIABLE and the report
 * lists what failed; a remote image alone does not change the measures. Closed shadow roots are not
 * measured.
 *
 * Local files only (the html-export Trust rule): the page is opened offline through html-export's
 * openPage, so no remote request leaves the machine. Nothing is ever installed.
 *
 * A viewport narrower than 768 px renders as a touch phone (html-export's mobile profile), and the
 * icon target limit follows it: the touch minimum there, the pointer minimum elsewhere.
 *
 * Exit: 0 evidence written (read the report; NOT VERIFIABLE measures, a measurement that timed out and
 *       a page error attributed to a blocked remote script still exit 0) · 4 the page is broken (any
 *       other page error, or a fault while loading or showing a view) · 3 browser dependency missing
 *       (NOT VERIFIABLE) · 2 usage error · 1 tool fault.
 */

const fs = require('node:fs');
const path = require('node:path');

const { EXIT } = require('../../html-export/scripts/lib/exit-codes.cjs');
const { openPage, isPageFault, timedEvaluate, splitOfflineErrors, PageTimeoutError } = require('../../html-export/scripts/lib/browser.cjs');
const { currentEngine } = require('../../html-export/scripts/lib/chromium-engine.cjs');
const { sharedPreflight, exitProcess } = require('../../html-export/scripts/export.cjs');
const { resolveBudget, summarize, overLimit, collectMetrics } = require('./lib/action-density.cjs');

const DEFAULT_VIEWPORTS = '1440x900,390x844';
// [data-state] is the mock-up prototype's view marker only when the page exposes window.__proto.goTo;
// elsewhere (component libraries) it marks control and container states, so it is skipped. Controls
// and states nested inside another view (an open/closed panel) are never views.
const VIEW_SELECTORS = Object.freeze({
  prototypeSlides: '[data-export-slide][data-state]',
  prototype: '[data-state]:not(button):not(a):not(input):not(select):not([role="button"]):not([role="tab"]):not([role="menuitem"]):not([role="option"])',
  slides: '[data-export-slide]',
  dialogs: '[role="dialog"], [role="alertdialog"], dialog[open]',
});
const MIN_SIDE = 200;
const MAX_WIDTH = 7680;
const MAX_HEIGHT = 4320;
// A blocked stylesheet or font URL styles the page (backs up the in-page check of what failed to load).
const STYLE_URL = /\.css(\?|#|$)|fonts\.(googleapis|gstatic)\.com|\.(woff2?|ttf|otf)(\?|#|$)/i;
const SETTLE_MAX_MS = 1500;
const STEP_TIMEOUT_MS = 30000;
const MOBILE_MAX_WIDTH = 768;

class UsageError extends Error {}

function usage() {
  return 'Usage: node .claude/skills/ui-design/scripts/audit-actions.cjs <file.html> [--views=<selector>] '
    + '[--viewport=1440x900,390x844] [--exclude=<selector>] [--budget=<project-config.json>] [--step-timeout=<ms>] [--out=<dir>]';
}

function parseArgs(argv) {
  const options = { file: null, views: null, viewport: DEFAULT_VIEWPORTS, exclude: '[data-audit-ignore]', budget: null,
    stepTimeout: STEP_TIMEOUT_MS, out: path.join('tmp', 'audit-actions'), help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--views=')) options.views = arg.slice(8);
    else if (arg.startsWith('--viewport=')) options.viewport = arg.slice(11);
    else if (arg.startsWith('--exclude=')) options.exclude = arg.slice(10);
    else if (arg.startsWith('--budget=')) options.budget = arg.slice(9);
    else if (arg.startsWith('--step-timeout=')) options.stepTimeout = Number(arg.slice(15));
    else if (arg.startsWith('--out=')) options.out = arg.slice(6);
    else if (arg.startsWith('--')) throw new UsageError(`unknown argument: ${arg}`);
    else if (options.file) throw new UsageError(`one input file only (got ${options.file} and ${arg})`);
    else options.file = arg;
  }
  if (options.help) return options;
  if (!options.file) throw new UsageError('an input .html file is required');
  if (!/\.html?$/i.test(options.file)) throw new UsageError('the input must be an .html or .htm file');
  if (!fs.existsSync(options.file) || !fs.statSync(options.file).isFile()) throw new UsageError(`input file not found: ${options.file}`);
  const sizes = options.viewport.split(',').map((item) => item.trim()).filter(Boolean);
  if (!sizes.length || !sizes.every((size) => /^\d{2,5}x\d{2,5}$/.test(size))) throw new UsageError('--viewport must be WIDTHxHEIGHT[,WIDTHxHEIGHT]');
  for (const size of sizes) {
    const [width, height] = size.split('x').map(Number);
    if (width < MIN_SIDE || height < MIN_SIDE || width > MAX_WIDTH || height > MAX_HEIGHT) {
      throw new UsageError(`--viewport ${size} is outside ${MIN_SIDE}x${MIN_SIDE}..${MAX_WIDTH}x${MAX_HEIGHT}`);
    }
  }
  options.viewports = sizes;
  if (!Number.isInteger(options.stepTimeout) || options.stepTimeout < 100 || options.stepTimeout > 300000) {
    throw new UsageError('--step-timeout must be a whole number of milliseconds, 100..300000');
  }
  for (const [flag, value] of [['--views', options.views], ['--out', options.out], ['--exclude', options.exclude], ['--budget', options.budget]]) {
    if (value !== null && value.trim() === '') throw new UsageError(`${flag} needs a value`);
  }
  if (options.budget && !fs.existsSync(options.budget)) throw new UsageError(`--budget file not found: ${options.budget}`);
  return options;
}

// uiReview.complexityBudget from the named file, or from the project config through the framework loader.
function readDeclaredBudget(budgetPath) {
  try {
    if (budgetPath) return (JSON.parse(fs.readFileSync(budgetPath, 'utf8')).uiReview || {}).complexityBudget || null;
    const loader = require('../../../hooks/lib/project-config-loader.cjs');
    return ((loader.loadProjectConfig() || {}).uiReview || {}).complexityBudget || null;
  } catch (error) {
    if (budgetPath) throw new UsageError(`--budget is not readable JSON: ${error.message}`);
    console.error(`audit-actions: the project config could not be read (${error.message}); using the heuristic defaults`);
    return null;
  }
}

// Runs in the page: the selector of each view, in document order. `extraExclude` marks what a view
// leaves to another view (the page leaves its open dialogs to their own views).
function listViews({ requested, selectors, exclude }) {
  try { document.querySelector(exclude); } catch { return { error: `invalid --exclude selector: ${exclude}` }; }
  if (requested) {
    let found = [];
    try { found = Array.from(document.querySelectorAll(requested)); } catch { return { error: `invalid selector: ${requested}` }; }
    if (!found.length) return { error: `--views matched nothing: ${requested}` };
  }
  const prototype = Boolean(window.__proto && typeof window.__proto.goTo === 'function');
  let counter = 0;
  const mark = (el, id, state) => {
    const marker = `audit-view-${counter += 1}`;
    el.setAttribute('data-audit-view', marker);
    return { id, state, selector: `[data-audit-view="${marker}"]` };
  };
  const outermost = (list, selector) => list.filter((el) => !(el.parentElement && el.parentElement.closest(selector)));
  // A dialog open inside a view is its own view: the view leaves its dialogs to them. A dialog is
  // listed even when the view is not shown yet; collectMetrics reports it NOT VERIFIABLE if not.
  const splitDialogs = (el, id, state) => {
    const dialogs = outermost(Array.from(el.querySelectorAll(selectors.dialogs)), selectors.dialogs);
    const view = mark(el, id, state);
    if (dialogs.length) view.extraExclude = selectors.dialogs;
    return [view, ...dialogs.map((dialog, index) => ({ ...mark(dialog, dialog.id || `${id} dialog#${index + 1}`, state), state }))];
  };
  if (requested) {
    const found = Array.from(document.querySelectorAll(requested));
    return {
      views: found.flatMap((el, index) => splitDialogs(el,
        el.getAttribute('data-state') || el.id || `${requested}#${index + 1}`,
        prototype ? el.getAttribute('data-state') : null)),
    };
  }
  if (prototype) {
    let found = Array.from(document.querySelectorAll(selectors.prototypeSlides));
    if (!found.length) found = outermost(Array.from(document.querySelectorAll(selectors.prototype)), selectors.prototype);
    if (found.length) {
      return {
        views: found.flatMap((el, index) => splitDialogs(el,
          el.getAttribute('data-state') || `view#${index + 1}`,
          el.getAttribute('data-state'))),
      };
    }
  }
  const slides = Array.from(document.querySelectorAll(selectors.slides));
  if (slides.length) return { views: slides.flatMap((el, index) => splitDialogs(el, el.id || `slide#${index + 1}`, null)) };
  const dialogs = outermost(Array.from(document.querySelectorAll(selectors.dialogs)), selectors.dialogs)
    .filter((el) => !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  return {
    views: [
      { id: 'page', state: null, selector: null, extraExclude: dialogs.length ? selectors.dialogs : null },
      ...dialogs.map((el, index) => mark(el, el.id || `dialog#${index + 1}`, null)),
    ],
  };
}

async function auditViewport(file, viewport, options, budget) {
  const touch = Number(viewport.split('x')[0]) < MOBILE_MAX_WIDTH;
  const session = await openPage({ file, viewport, offline: true, mobile: touch });
  const evaluate = (fn, arg, label) => timedEvaluate(session.page, fn, arg, options.stepTimeout, label);
  try {
    const listed = await evaluate(listViews, { requested: options.views, selectors: VIEW_SELECTORS, exclude: options.exclude }, 'view list');
    if (listed.error) throw new UsageError(listed.error);
    const views = [];
    for (const view of listed.views) {
      if (view.state) {
        // A goTo that throws is the page's fault (exit 4), never a tool fault; the other views are still measured.
        const shown = await evaluate((state) => {
          try {
            if (window.__proto && typeof window.__proto.goTo === 'function') window.__proto.goTo(state);
            return null;
          } catch (error) { return String(error && error.message ? error.message : error); }
        }, view.state, `goTo ${view.state}`);
        if (shown) {
          views.push({ id: view.id, error: `window.__proto.goTo(${view.state}) threw: ${shown}` });
          continue;
        }
        // Measure the state the user ends up seeing: wait (bounded) until its animations and transitions end.
        await evaluate(async (maxMs) => {
          const started = Date.now();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          while (Date.now() - started < maxMs && document.getAnimations && document.getAnimations().some((a) => a.playState === 'running')) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }, SETTLE_MAX_MS, `settle ${view.state}`);
      }
      const exclude = view.extraExclude ? `${options.exclude}, ${view.extraExclude}` : options.exclude;
      let metrics;
      try {
        metrics = await evaluate(collectMetrics, { view: view.selector, exclude, touch }, `measure ${view.id}`);
      } catch (error) {
        // A timeout of the tool's own measurement is not a broken page: the page is simply too large or
        // too busy for this run. Record the view as NOT VERIFIABLE and keep the evidence run successful.
        if (error instanceof PageTimeoutError) {
          const reason = `measurement did not finish within ${options.stepTimeout} ms (a very large page or a long-running page script); this view is NOT VERIFIABLE`;
          views.push({ id: view.id, measures: summarize({ visible: false, reason }, budget), metrics: { visible: false, reason }, measurementTimeout: true });
          continue;
        }
        throw error;
      }
      views.push({ id: view.id, measures: summarize(metrics, budget), metrics });
    }
    const { pageErrors } = splitOfflineErrors(session.errors, session.blocked);
    // Measured without a stylesheet, script or font it loads (a CSS framework CDN), the page is not the
    // page a user sees. What failed is read from the page itself (by element type), backed by the
    // blocked stylesheet and font URLs; a remote image alone leaves the measures valid.
    const blockedRequests = Array.from(new Set(session.blocked || []));
    const missingStyling = Array.from(new Set([
      ...views.flatMap((view) => (view.metrics && view.metrics.remoteStyling) || []),
      ...blockedRequests.filter((url) => STYLE_URL.test(url)),
    ]));
    if (missingStyling.length) {
      for (const view of views) {
        if (!view.measures) continue;
        for (const [id, m] of Object.entries(view.measures)) {
          view.measures[id] = { ...m, status: 'NOT VERIFIABLE', value: null, overLimit: null, reason: 'rendered without its remote styling (see missingStyling)' };
        }
      }
    }
    // A blocked remote script can throw on its own (the usual `tailwind.config = …` idiom). Only an
    // error naming the blocked script's own global is attributed to the incomplete offline render; any
    // other page error still makes the page broken, so a real bug is never excused by a blocked CDN.
    const blockedScripts = missingStyling.filter((url) => !/^font /.test(url) && !STYLE_URL.test(url));
    const scriptTokens = Array.from(new Set(blockedScripts.flatMap((url) => {
      try {
        const parsed = new URL(url);
        const name = path.basename(parsed.pathname).replace(/\.[a-z0-9]+$/i, '');
        return [...parsed.hostname.split('.'), ...name.split(/[^a-z0-9]+/i)].filter((token) => token.length >= 4);
      } catch { return []; }
    }).map((token) => token.toLowerCase())));
    const attributedToBlockedScript = (error) => {
      const text = String(error.text || error);
      const identifier = (/^([A-Za-z_$][\w$]*) is not defined/.exec(text) || [])[1];
      if (!identifier) return false;
      const lower = identifier.toLowerCase();
      return scriptTokens.some((token) => lower.includes(token) || token.includes(lower));
    };
    const pageErrorsFromBlockedScripts = blockedScripts.length > 0 && pageErrors.length > 0 && pageErrors.every(attributedToBlockedScript);
    return {
      viewport, touch, views, renderIncomplete: missingStyling.length > 0, missingStyling, blockedRequests,
      pageErrors: pageErrors.map((item) => item.text || String(item)), pageErrorsFromBlockedScripts,
    };
  } finally {
    await session.close();
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Usage error: ${error.message}\n${usage()}`);
    return EXIT.USAGE;
  }
  if (options.help) {
    console.log(usage());
    return EXIT.OK;
  }
  let budget;
  try {
    budget = resolveBudget(readDeclaredBudget(options.budget));
  } catch (error) {
    console.error(`Usage error: ${error.message}`);
    return EXIT.USAGE;
  }
  if (budget.ignored.length) console.error(`audit-actions: ignored invalid uiReview.complexityBudget keys (heuristic defaults used): ${budget.ignored.join(', ')}`);

  let dependency;
  try {
    dependency = await sharedPreflight({ timeout: 30000, env }, {});
  } catch (error) {
    // A launch probe that timed out means the browser is there but did not start: a tool fault (exit 1).
    if (error && error.constructor && error.constructor.name === 'ToolFaultError') {
      console.error(`audit-actions error: ${error.message}`);
      return EXIT.ERROR;
    }
    dependency = `dependency check failed: ${error && error.message ? error.message : error}`;
  }
  if (dependency) {
    console.error(`Dependency missing (NOT VERIFIABLE): ${dependency}`);
    return EXIT.DEPENDENCY;
  }

  const file = path.resolve(options.file);
  const report = { tool: 'ui-design audit-actions', file, generated: new Date().toISOString(), budget, viewports: [] };
  let pageFault = false;
  for (const viewport of options.viewports) {
    try {
      report.viewports.push(await auditViewport(file, viewport, options, budget));
    } catch (error) {
      if (error instanceof UsageError) {
        console.error(`Usage error: ${error.message}`);
        return EXIT.USAGE;
      }
      if (isPageFault(error)) {
        pageFault = true;
        report.viewports.push({ viewport, error: String(error.message || error).split('\n')[0] });
      } else {
        console.error(`audit-actions error: ${String(error.message || error).split('\n')[0]}`);
        return EXIT.ERROR;
      }
    }
  }
  report.engine = currentEngine();

  const out = path.resolve(options.out);
  fs.mkdirSync(out, { recursive: true });
  const reportPath = path.join(out, 'actions-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  // Where a reviewer looks first: measures over their limit, per view and viewport. A count within its
  // limit is not a pass; every measure lists its elements for confirmation.
  const toConfirm = [];
  const unverified = [];
  for (const entry of report.viewports) {
    if (entry.pageErrors && entry.pageErrors.length && !entry.pageErrorsFromBlockedScripts) pageFault = true;
    if (entry.pageErrorsFromBlockedScripts) console.error('audit-actions: page error(s) attributed to a blocked remote script; not treated as a page fault (the measures are NOT VERIFIABLE)');
    for (const view of entry.views || []) {
      if (view.error) { pageFault = true; continue; }
      const measures = Object.values(view.measures || {});
      if (measures.length && measures.every((measure) => measure.status === 'NOT VERIFIABLE')) {
        unverified.push(`${view.id} @${entry.viewport}: ${measures[0].reason || 'not verifiable'}`);
      }
      for (const id of overLimit(view.measures)) toConfirm.push(`${id} ${view.measures[id].value}/${view.measures[id].limit} (${view.id} @${entry.viewport})`);
    }
  }
  const notes = [];
  if (toConfirm.length) notes.push(`over limit, confirm by eye: ${toConfirm.join('; ')}`);
  if (unverified.length) notes.push(`${unverified.length} view(s) NOT VERIFIABLE (nothing measured): ${unverified.slice(0, 3).join('; ')}${unverified.length > 3 ? `; +${unverified.length - 3} more` : ''}`);
  console.log(`audit-actions: ${notes.length ? notes.join(' | ') : 'no count over its limit; confirm the listed elements by eye'}`);
  console.log(`report: ${reportPath}`);
  return pageFault ? EXIT.PAGE_ERROR : EXIT.OK;
}

// exitProcess (html-export) ends the run even when a browser close was abandoned on a hung machine.
if (require.main === module) {
  main().then(exitProcess, (error) => {
    console.error(`audit-actions error: ${error && error.message ? error.message : error}`);
    exitProcess(EXIT.ERROR);
  });
}

module.exports = { main, parseArgs, listViews, UsageError };
