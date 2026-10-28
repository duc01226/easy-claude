#!/usr/bin/env node
'use strict';

/**
 * capture-sites: screenshots of live public web pages for an option board (moodboard, layout
 * board). The pages are untrusted, so the rules below are enforced here, not left to callers.
 *
 * Usage:
 *   node .claude/skills/html-export/scripts/capture-sites.cjs --input=<targets.json> --out=<dir>
 *     [--only=<id,id>] [--concurrency=<1..8>] [--timeout=<ms>] [--no-phone] [--help]
 *
 * targets.json: [{ id, url, wait?, scroll?, phone? }]
 *   id      letters, digits, '.', '_' or '-' (max 64), unique; names the files
 *   url     http(s) only
 *   wait    extra settle time after load, 0..10000 ms (default 0)
 *   scroll  true scrolls the page down and back up first, so lazy images load (default false)
 *   phone   false skips the phone capture for this target (default true)
 *
 * Output in --out:
 *   <id>@1440.png   desktop, 1440x900, scale 1
 *   <id>@390.png    phone, 390x844 as a touch phone at scale 2 (browser.cjs mobileProfile)
 *   capture-manifest.json  { tool, generated, engine, entries[] }; each entry:
 *     { id, url, viewport, status: ok|blocked|blank|error, reason, finalUrl, httpStatus, title,
 *       file, bytes, engine, degraded, accessed, consentHidden, redirects[], blockedNavigations[],
 *       downloadsRefused }
 *   With --only, entries of the other ids already in the manifest are kept (resume).
 *
 * Safety, in code:
 *   - one fresh browser context per capture: no cookies, storage or service workers carried over;
 *   - no input events at all (no click, key, tap or form submission); scrolling uses window.scrollBy;
 *   - consent banners are hidden with inline styles, never clicked or accepted;
 *   - a bot check, a near-empty CAPTCHA or sign-in page, or an HTTP 401/403/407/429/503 page is
 *     recorded as `blocked` and never retried or worked around; any other HTTP 400+ page is `error`;
 *   - the browser is Playwright's own Chromium, the installed Chrome or Edge, or an explicit override:
 *     an older cached Chromium, which may lack security fixes, is never used for live pages;
 *   - downloads are refused; pop-up windows are closed and their requests never leave the browser;
 *   - while loading, the page may follow its own redirects (listed in redirects); a page that ends
 *     on another site is `blocked` and never captured; any top-level navigation after load is
 *     answered locally with 204 (the page stays) and listed in blockedNavigations;
 *   - HTTPS errors are not ignored, and Chromium runs with its OS sandbox on; when the sandbox
 *     cannot start, the run stops with exit 3 instead of turning it off;
 *   - page text is data: the cleaned, truncated title, the final URL, the redirects and the blocked
 *     navigations are the only page-influenced values kept, each URL cut to 300 characters and each
 *     list to its first 20 entries (a count keeps the total); a failure reason never carries page text
 *     (a net::ERR code is kept only from the navigation itself), and nothing from the page is printed
 *     to stdout;
 *   - every browser setup call (new context, new page, route) has a time limit, so a browser that stops
 *     answering costs one capture its entry, never the whole run and its manifest.
 *
 * Exit: 0 the manifest was written (read each entry's status); 1 tool fault (including a launch that
 * timed out); 2 usage error; 3 dependency missing (Node, Playwright, a launchable Chromium, or the OS
 * refusing Chromium's sandbox).
 */

const fs = require('node:fs');
const path = require('node:path');

const { EXIT } = require('./lib/exit-codes.cjs');
const { errorMessage, firstLine, sleep } = require('./lib/result.cjs');
const {
  boundedSetupCall,
  closeBrowser,
  launchBudget,
  loadPlaywright,
  mobileProfile,
  timedEvaluate,
  timedPageCall,
} = require('./lib/browser.cjs');
const { launchChromium, currentEngine } = require('./lib/chromium-engine.cjs');
const { collectEvidence, isBlankEvidence, isPngBuffer } = require('./lib/to-png.cjs');
const { sharedPreflight, exitProcess, MAX_TIMEOUT_MS } = require('./export.cjs');

const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 900 }),
  phone: Object.freeze({ width: 390, height: 844 }),
});
const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 8;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_WAIT_MS = 10_000;
const IDLE_WAIT_MS = 5_000;
const SCROLL_STEPS = 20;
const SCROLL_PAUSE_MS = 150;
const SETTLE_MS = 300;
const TITLE_MAX = 160;
const REASON_MAX = 300;
// Page-chosen URLs are bounded: a page can navigate in a loop or use a megabyte-long URL.
const URL_MAX = 300;
const URL_LIST_MAX = 20;
const CHALLENGE_TEXT_MAX = 2_000;
const MANIFEST = 'capture-manifest.json';
const PHONE_DEVICE = 'Pixel 7';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const BLOCKED_STATUS = new Set([401, 403, 407, 429, 503]);
// Launch errors that mean the OS refused Chromium's sandbox (exit 3); any other launch failure is
// reported with its own message.
const SANDBOX_TEXT = /sandbox|namespace|setuid/i;
const CHALLENGE_TEXT = /just a moment|checking your browser|verify(?:ing)? (?:that )?you are (?:a )?human|are you a robot|attention required|unusual traffic|access denied|enable javascript and cookies to continue|captcha/i;
const CHALLENGE_FRAME = /captcha|challenges\.cloudflare\.com|turnstile/i;
// Common consent-manager roots; hidden by style only, never clicked.
const CONSENT_SELECTORS = Object.freeze([
  '#onetrust-consent-sdk', '#onetrust-banner-sdk', '#CybotCookiebotDialog', '#usercentrics-root',
  '#didomi-host', '.qc-cmp2-container', '#truste-consent-track', '.truste_box_overlay',
  '.osano-cm-window', '.fc-consent-root', '.cc-window', '.cky-consent-container',
  '#cookie-law-info-bar', '#cmplz-cookiebanner-container', '#cookie-banner', '.cookie-banner',
  '#cookieConsent', '[id^="sp_message_container"]', '[role="dialog"][aria-label*="cookie" i]',
  '[role="dialog"][aria-label*="consent" i]', '[id*="cookie-consent" i]', '[class*="cookie-consent" i]',
]);
const USAGE = `Usage:
  node .claude/skills/html-export/scripts/capture-sites.cjs --input=<targets.json> --out=<dir>
    [--only=<id,id>] [--concurrency=<1..${MAX_CONCURRENCY}>] [--timeout=<ms>] [--no-phone] [--help]

targets.json is a JSON array of { id, url, wait?, scroll?, phone? }. Writes <id>@1440.png,
<id>@390.png and ${MANIFEST} into --out. Read each manifest entry's status: ok, blocked, blank or error.`;

class UsageError extends Error {}

function parseArgs(argv) {
  const options = { concurrency: DEFAULT_CONCURRENCY, timeout: DEFAULT_TIMEOUT_MS, phone: true, only: null };
  const valued = new Set(['input', 'out', 'only', 'concurrency', 'timeout']);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') return { help: true };
    if (arg === '--no-phone') { options.phone = false; continue; }
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match || !valued.has(match[1])) throw new UsageError(`unknown argument: ${arg}`);
    let value = match[2];
    if (value === undefined) {
      value = argv[index + 1];
      index += 1;
    }
    if (value === undefined || value === '') throw new UsageError(`--${match[1]} needs a value`);
    options[match[1]] = value;
  }
  if (!options.input) throw new UsageError('--input=<targets.json> is required');
  if (!options.out) throw new UsageError('--out=<dir> is required');
  options.concurrency = Number(options.concurrency);
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > MAX_CONCURRENCY) {
    throw new UsageError(`--concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}`);
  }
  options.timeout = Number(options.timeout);
  if (!Number.isInteger(options.timeout) || options.timeout <= 0 || options.timeout > MAX_TIMEOUT_MS) {
    throw new UsageError(`--timeout must be a positive whole number of ms, at most ${MAX_TIMEOUT_MS}`);
  }
  if (options.only !== null) options.only = options.only.split(',').map((id) => id.trim()).filter(Boolean);
  return options;
}

function readTargets(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new UsageError(`cannot read targets from ${file}: ${firstLine(error)}`);
  }
  if (!Array.isArray(raw) || raw.length === 0) throw new UsageError('targets must be a non-empty JSON array');
  const seen = new Set();
  return raw.map((target, index) => {
    const where = `target ${index + 1}`;
    if (!target || typeof target !== 'object') throw new UsageError(`${where} must be an object`);
    const { id, url, wait = 0, scroll = false, phone = true } = target;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new UsageError(`${where}: id must be 1-64 letters, digits, '.', '_' or '-' and start with a letter or digit`);
    }
    if (seen.has(id.toLowerCase())) throw new UsageError(`${where}: duplicate id "${id}"`);
    seen.add(id.toLowerCase());
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new UsageError(`${where} (${id}): url is not a valid URL`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UsageError(`${where} (${id}): url must be http or https`);
    }
    if (!Number.isInteger(wait) || wait < 0 || wait > MAX_WAIT_MS) {
      throw new UsageError(`${where} (${id}): wait must be a whole number from 0 to ${MAX_WAIT_MS}`);
    }
    if (typeof scroll !== 'boolean' || typeof phone !== 'boolean') {
      throw new UsageError(`${where} (${id}): scroll and phone must be true or false`);
    }
    return { id, url: parsed.href, wait, scroll, phone };
  });
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

// Same site: the same host, or one a subdomain of the other, ignoring a leading "www.".
function sameSite(a, b) {
  const strip = (host) => host.replace(/^www\./, '');
  const left = strip(hostOf(a));
  const right = strip(hostOf(b));
  if (!left || !right) return false;
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

// Control characters (C0, DEL, C1) and bidirectional overrides become spaces, so page text cannot hide
// or reorder what a reader sees; runs of spaces collapse.
function clean(text, max) {
  if (typeof text !== 'string') return null;
  const value = text.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, ' ').replace(/\s+/g, ' ').trim();
  return value ? value.slice(0, max) : null;
}

// Keeps the first URL_LIST_MAX page-chosen URLs, each cut to URL_MAX characters; the caller counts all.
function recordUrl(list, url) {
  if (list.length < URL_LIST_MAX) list.push(clean(url, URL_MAX));
}

// Runs in the page: the signals of a bot check or a sign-in wall, read as data.
function readChallengeSignals(limit) {
  const body = document.body ? document.body.innerText || '' : '';
  return {
    short: body.length <= limit,
    text: body.length <= limit ? body : '',
    frames: Array.from(document.querySelectorAll('iframe')).map((frame) => frame.src || ''),
    password: Boolean(document.querySelector('input[type="password"]')),
  };
}

// A CAPTCHA frame or a password field marks a challenge or a sign-in wall only on a near-empty page:
// many full pages embed a CAPTCHA widget in a form, or a small sign-in box, and stay good examples.
function challengeReason(httpStatus, title, signals) {
  if (BLOCKED_STATUS.has(httpStatus)) return `HTTP ${httpStatus}`;
  if (CHALLENGE_TEXT.test(title || '') || CHALLENGE_TEXT.test(signals.text || '')) return 'a bot check or challenge page';
  if (signals.short && (signals.frames || []).some((src) => CHALLENGE_FRAME.test(src))) return 'a CAPTCHA frame';
  if (signals.short && signals.password) return 'a sign-in page';
  return null;
}

// Why a capture failed, without page-chosen text. A net::ERR code is the browser's own only when the
// navigation raised it (captureOne marks that error): a page script can throw any text, including
// "net::ERR_<words>". Elsewhere only our own fixed wording is kept; anything else becomes a fixed phrase.
const OWN_FAILURE = /Timeout \d+ms exceeded|did not (?:finish|answer) within \d+ ms|Download is starting|Target (?:page, context or browser has been )?closed/;
function failureReason(error) {
  const line = firstLine(error);
  const known = (error && error.duringNavigation === true && /net::ERR_[A-Z_]+/.exec(line)) || OWN_FAILURE.exec(line);
  return known ? known[0] : 'the capture failed: an error was raised while the page was read';
}

// Runs in the page: hides consent roots with inline !important styles (no click) and lets the page
// scroll again if a banner had locked it. Returns how many elements it hid.
function hideConsent(selectors) {
  let hidden = 0;
  for (const selector of selectors) {
    let matches = [];
    try { matches = Array.from(document.querySelectorAll(selector)); } catch { matches = []; }
    for (const element of matches) {
      element.style.setProperty('display', 'none', 'important');
      hidden += 1;
    }
  }
  if (hidden > 0) {
    for (const element of [document.documentElement, document.body]) {
      if (element) element.style.setProperty('overflow', 'auto', 'important');
    }
  }
  return hidden;
}

// Runs in the page: scrolls down in bounded steps so lazy content loads, then back to the top.
async function scrollThrough({ steps, pauseMs }) {
  for (let step = 0; step < steps; step += 1) {
    const before = window.scrollY;
    window.scrollBy(0, window.innerHeight);
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
    if (window.scrollY === before) break;
  }
  window.scrollTo(0, 0);
  return window.scrollY;
}

async function settle(page, target, timeoutMs) {
  await page.waitForLoadState('networkidle', { timeout: Math.min(IDLE_WAIT_MS, timeoutMs) }).catch(() => {});
  await timedEvaluate(page, () => document.fonts.ready.then(() => true), null, Math.min(IDLE_WAIT_MS, timeoutMs), 'fonts')
    .catch(() => {});
  if (target.scroll) {
    await timedEvaluate(page, scrollThrough, { steps: SCROLL_STEPS, pauseMs: SCROLL_PAUSE_MS }, timeoutMs, 'scroll');
  }
  await sleep(target.wait + SETTLE_MS);
}

function contextOptions(kind, playwright) {
  const size = VIEWPORTS[kind];
  const base = {
    viewport: { ...size },
    deviceScaleFactor: 1,
    acceptDownloads: false,
    serviceWorkers: 'block',
    ignoreHTTPSErrors: false,
  };
  if (kind !== 'phone') return base;
  const device = playwright.devices && playwright.devices[PHONE_DEVICE];
  return { ...base, ...mobileProfile(size), ...(device && device.userAgent ? { userAgent: device.userAgent } : {}) };
}

async function captureOne(browser, playwright, target, kind, settings) {
  const size = VIEWPORTS[kind];
  const engine = currentEngine();
  const entry = {
    id: target.id,
    url: target.url,
    viewport: `${size.width}x${size.height}`,
    status: 'error',
    reason: null,
    finalUrl: null,
    httpStatus: null,
    title: null,
    file: null,
    bytes: 0,
    engine: engine ? engine.name : null,
    degraded: engine ? engine.degraded : null,
    accessed: new Date().toISOString(),
    consentHidden: 0,
    redirects: [],
    redirectCount: 0,
    blockedNavigations: [],
    blockedNavigationCount: 0,
    downloadsRefused: 0,
  };
  let context = null;
  // The exporter's rule (browser.cjs boundedSetupCall): a setup call that never finishes is a bounded
  // tool fault for this capture; a context that arrives late is closed.
  const setupMs = settings.setupTimeoutMs === undefined ? launchBudget(settings.timeout) : settings.setupTimeoutMs;
  try {
    context = await boundedSetupCall(() => browser.newContext(contextOptions(kind, playwright)), setupMs, 'browser.newContext',
      (late) => { if (late && typeof late.close === 'function') late.close().catch(() => {}); });
    context.setDefaultTimeout(settings.timeout);
    context.setDefaultNavigationTimeout(settings.timeout);
    const page = await boundedSetupCall(() => context.newPage(), setupMs, 'context.newPage');
    // A pop-up window is never followed; a download is never kept.
    context.on('page', (opened) => { if (opened !== page) opened.close().catch(() => {}); });
    page.on('download', (download) => { entry.downloadsRefused += 1; download.cancel().catch(() => {}); });
    let loaded = false;
    let documentRequests = 0;
    // On the whole context, so a pop-up's requests are seen too.
    await boundedSetupCall(() => context.route('**/*', (route) => {
      const request = route.request();
      let frame = null;
      try { frame = request.frame(); } catch { frame = null; }
      // A request of any other page never leaves the browser. A pop-up's first navigation has no
      // frame yet (request.frame() throws), so a navigation without a frame is refused as well.
      if (frame ? frame.page() !== page : request.isNavigationRequest()) return route.abort('blockedbyclient');
      if (frame === page.mainFrame() && request.isNavigationRequest()) {
        // While loading, the page may follow its own redirects (server or script); each is recorded,
        // and a page that ends on another site is blocked below. After load, a navigation is answered
        // locally with 204, which keeps the current document (an abort would replace it with an
        // error page). Blocking during load is not possible: Chromium then never fires load.
        if (!loaded) {
          if (documentRequests > 0) {
            entry.redirectCount += 1;
            recordUrl(entry.redirects, request.url());
          }
          documentRequests += 1;
          return route.continue();
        }
        entry.blockedNavigationCount += 1;
        recordUrl(entry.blockedNavigations, request.url());
        return route.fulfill({ status: 204, body: '' });
      }
      return route.continue();
    }), setupMs, 'context.route');

    // goto() returns the first document's response, but a script may redirect during load (followed
    // above): keep the status of the last main-frame document that answered before load.
    let landedStatus = null;
    page.on('response', (answer) => {
      if (loaded) return;
      try {
        if (answer.request().isNavigationRequest() && answer.frame() === page.mainFrame()) landedStatus = answer.status();
      } catch { /* a response of a frame that is already gone */ }
    });

    let response;
    try {
      response = await page.goto(target.url, { waitUntil: 'load', timeout: settings.timeout });
    } catch (error) {
      if (/Download is starting/i.test(errorMessage(error))) {
        entry.downloadsRefused += 1;
        entry.status = 'blocked';
        entry.reason = 'the URL starts a download; downloads are refused';
        return entry;
      }
      if (error && typeof error === 'object') error.duringNavigation = true;
      throw error;
    }
    loaded = true;
    entry.httpStatus = landedStatus !== null ? landedStatus : (response ? response.status() : null);
    // Server redirects are followed inside the browser and never reach the route: read them from the
    // response's request chain, oldest first, and put them before any script redirect.
    const serverRedirects = [];
    for (let hop = response ? response.request() : null; hop && hop.redirectedFrom(); hop = hop.redirectedFrom()) serverRedirects.unshift(hop.url());
    entry.redirectCount += serverRedirects.length;
    entry.redirects = [...new Set([...serverRedirects.map((url) => clean(url, URL_MAX)), ...entry.redirects])].slice(0, URL_LIST_MAX);
    // The site check reads the full URL; only the stored copy is cut. The reason is a fixed phrase: the
    // host the page chose is page data and stays in finalUrl.
    const landed = page.url();
    entry.finalUrl = clean(landed, URL_MAX);
    if (!sameSite(target.url, landed)) {
      entry.status = 'blocked';
      entry.reason = 'the page left the listed site while loading';
      return entry;
    }
    await settle(page, target, settings.timeout);
    // Read from the document itself: a navigation answered with 204 can leave a pending title.
    entry.title = clean(await timedEvaluate(page, () => document.title, null, settings.timeout, 'title'), TITLE_MAX);

    const signals = await timedEvaluate(page, readChallengeSignals, CHALLENGE_TEXT_MAX, settings.timeout, 'challenge check');
    const blocked = challengeReason(entry.httpStatus, entry.title, signals);
    if (blocked) {
      entry.status = 'blocked';
      entry.reason = blocked;
      return entry;
    }
    if (entry.httpStatus >= 400) {
      // A dead or broken page (404, 410, 500 ...) is never a valid example on a board.
      entry.status = 'error';
      entry.reason = `HTTP ${entry.httpStatus}`;
      return entry;
    }

    entry.consentHidden = await timedEvaluate(page, hideConsent, CONSENT_SELECTORS, settings.timeout, 'consent hide');
    const evidence = await timedEvaluate(page, collectEvidence, { selector: null, index: 0, fullPage: false }, settings.timeout, 'visible-content check');
    const file = path.join(settings.out, `${target.id}@${size.width}.png`);
    const buffer = await timedPageCall(page, () => page.screenshot({
      path: file,
      animations: 'disabled',
      caret: 'hide',
      timeout: settings.timeout,
    }), settings.timeout, 'screenshot');
    entry.file = path.basename(file);
    entry.bytes = buffer.length;
    entry.finalUrl = clean(await timedEvaluate(page, () => location.href, null, settings.timeout, 'final URL'), URL_MAX);
    if (!isPngBuffer(buffer) || isBlankEvidence(evidence)) {
      entry.status = 'blank';
      entry.reason = 'no visible text, image, svg or canvas in the first screen';
    } else {
      entry.status = 'ok';
    }
    return entry;
  } catch (error) {
    entry.status = 'error';
    entry.reason = clean(failureReason(error), REASON_MAX);
    return entry;
  } finally {
    if (context) await closeContext(context, launchBudget(settings.timeout));
  }
}

// A context close that never settles must not hang the run; the browser close at the end stops it.
async function closeContext(context, budgetMs) {
  let timer;
  const timedOut = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), budgetMs); });
  const result = await Promise.race([context.close().then(() => 'closed', () => 'closed'), timedOut]);
  clearTimeout(timer);
  if (result === 'timeout') console.error(`Warning: a page context did not close within ${budgetMs} ms; it is stopped with the browser.`);
}

async function runPool(jobs, concurrency, work) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      results[index] = await work(jobs[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  return results;
}

function readManifest(file) {
  try {
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(manifest.entries) ? manifest.entries : [];
  } catch {
    return [];
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  let options;
  let targets;
  try {
    options = parseArgs(argv);
    if (options.help) {
      console.log(USAGE);
      return EXIT.OK;
    }
    targets = readTargets(path.resolve(options.input));
    if (options.only) {
      const known = new Set(targets.map((target) => target.id));
      const unknown = options.only.filter((id) => !known.has(id));
      if (unknown.length) throw new UsageError(`--only names ids that are not in the targets: ${unknown.join(', ')}`);
      targets = targets.filter((target) => options.only.includes(target.id));
    }
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Usage error: ${errorMessage(error)}\nRun with --help for usage.`);
    return EXIT.USAGE;
  }

  const out = path.resolve(options.out);
  fs.mkdirSync(out, { recursive: true });

  // Node, Playwright and an engine choice (chromium-engine.cjs), exactly as the exporter checks them.
  let dependency;
  try {
    // untrusted: live public pages never run on an older cached Chromium (chromium-engine.cjs).
    dependency = await sharedPreflight({ timeout: options.timeout, env, untrusted: true }, {});
  } catch (error) {
    console.error(`capture-sites error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }
  if (dependency) {
    console.error(`Dependency missing: ${dependency}`);
    return EXIT.DEPENDENCY;
  }

  const playwright = loadPlaywright();
  const budgetMs = launchBudget(options.timeout);
  let browser;
  try {
    // Live pages are untrusted: the OS sandbox stays on, and there is no switch to turn it off.
    browser = await launchChromium(playwright, (engineOptions) => playwright.chromium.launch({
      headless: true,
      chromiumSandbox: true,
      timeout: budgetMs,
      ...engineOptions,
    }), { env, untrusted: true, warn: () => {} });
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.setupTimedOut === true)) {
      console.error(`capture-sites error: Chromium did not start within ${budgetMs} ms (${firstLine(error)}); the machine is busy or the browser is broken. Retry, or pass a longer --timeout.`);
      return EXIT.ERROR;
    }
    if (SANDBOX_TEXT.test(errorMessage(error))) {
      console.error(`Dependency missing: Chromium could not start with its OS sandbox (${firstLine(error)}). `
        + 'capture-sites renders untrusted live pages, so it never turns the sandbox off.');
      return EXIT.DEPENDENCY;
    }
    console.error(`Dependency missing: Chromium could not start (${firstLine(error)}).`);
    return EXIT.DEPENDENCY;
  }

  const kinds = (target) => (options.phone && target.phone ? ['desktop', 'phone'] : ['desktop']);
  const jobs = targets.flatMap((target) => kinds(target).map((kind) => ({ target, kind })));
  const settings = { out, timeout: options.timeout };
  let entries;
  try {
    entries = await runPool(jobs, options.concurrency, ({ target, kind }) => captureOne(browser, playwright, target, kind, settings));
  } finally {
    await closeBrowser(browser, budgetMs).catch((error) => console.error(`Warning: browser close failed: ${firstLine(error)}`));
  }

  const manifestPath = path.join(out, MANIFEST);
  const rerun = new Set(targets.map((target) => target.id));
  const kept = options.only
    ? readManifest(manifestPath).filter((entry) => entry && typeof entry.id === 'string' && typeof entry.viewport === 'string' && !rerun.has(entry.id))
    : [];
  const all = [...kept, ...entries].sort((a, b) => a.id.localeCompare(b.id) || b.viewport.localeCompare(a.viewport));
  const manifest = { tool: 'html-export capture-sites', generated: new Date().toISOString(), engine: currentEngine(), entries: all };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const counts = { ok: 0, blocked: 0, blank: 0, error: 0 };
  for (const entry of entries) counts[entry.status] += 1;
  console.log(`capture-sites: ${counts.ok} ok, ${counts.blocked} blocked, ${counts.blank} blank, ${counts.error} error`);
  for (const entry of entries.filter((item) => item.status !== 'ok')) console.log(`  ${entry.status}  ${entry.id} ${entry.viewport}`);
  console.log(`manifest: ${manifestPath}`);
  return EXIT.OK;
}

module.exports = { main, parseArgs, readTargets, captureOne, challengeReason, failureReason, contextOptions, sameSite, CONSENT_SELECTORS, VIEWPORTS, UsageError };

// exitProcess (export.cjs) also ends a run whose browser close timed out, which would otherwise keep
// Node alive on the abandoned browser.
if (require.main === module) {
  main().then(exitProcess).catch((error) => {
    console.error(`capture-sites error: ${errorMessage(error)}`);
    exitProcess(EXIT.ERROR);
  });
}
