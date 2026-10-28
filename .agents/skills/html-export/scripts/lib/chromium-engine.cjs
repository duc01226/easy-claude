'use strict';

/**
 * Which Chromium html-export launches: the one rule for every launch (session and probe).
 *
 * Order:
 *   1. HTML_EXPORT_CHROMIUM=<absolute path>  that executable (explicit; never degraded)
 *   2. HTML_EXPORT_CHANNEL=chrome|msedge     that installed system browser (explicit; never degraded)
 *   3. the skill's own Playwright revision    the default
 *   4. only when (3) fails because its executable is missing, and unless HTML_EXPORT_FALLBACK=0:
 *      the newest cached Chromium in the Playwright browser cache (headless shell first), then the
 *      system Chrome, then Edge. Such an engine is degraded: a warning goes to stderr and every
 *      report names it. Nothing is ever downloaded or installed.
 * The first engine that launches is remembered per Playwright module for the rest of the process,
 * so the dispatcher's probe picks it once and every page session reuses it.
 * `untrusted: true` (live public pages, capture-sites.cjs) never uses an older cached Chromium,
 * which may lack security fixes: its fallback is the installed Chrome or Edge only (kept current by
 * the OS), and it neither reads nor writes the remembered engine.
 *
 * Exports:
 *   launchChromium(playwright, launch, { env, platform, cwd, warn, untrusted }) -> Promise<browser>
 *     `launch(extraOptions)` performs one chromium.launch with the caller's options merged with
 *     the engine's ({} | { executablePath } | { channel }). When nothing launches, it rejects with
 *     the original launch error, its message extended with the revision Playwright wants, the
 *     revisions the cache holds, the fallbacks tried and the two override variables.
 *   currentEngine() -> { name, degraded, executablePath?, channel? } | null   the last engine launched.
 *   explicitEngine(env, platform) -> engine | null   throws on an invalid override value.
 *   fallbackEngines({ env, platform, cwd, untrusted }) -> engine[]   step 4's candidates, in order;
 *     untrusted keeps only the system Chrome and Edge channels.
 *   cachedChromium(browsersPath, platform) -> [{ kind, revision, dir, complete, executablePath }]
 *   expectedRevision() -> string | null   the Chromium revision the skill-local Playwright wants.
 *   isMissingExecutable(error) -> boolean
 *   ENGINE_ENV, SYSTEM_CHANNELS
 */

const fs = require('node:fs');
const path = require('node:path');
const { resolveBrowsersPath, readEnvKey } = require('./browsers-path.cjs');

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_ENV = Object.freeze({
  executable: 'HTML_EXPORT_CHROMIUM',
  channel: 'HTML_EXPORT_CHANNEL',
  fallback: 'HTML_EXPORT_FALLBACK',
});
const SYSTEM_CHANNELS = Object.freeze(['chrome', 'msedge']);
const CACHE_DIR = /^(chromium_headless_shell|chromium)-(\d+)$/;
// Executable file names inside a cached revision folder, per kind and OS.
const EXECUTABLE_NAMES = Object.freeze({
  chromium_headless_shell: {
    win32: ['chrome-headless-shell.exe', 'headless_shell.exe'],
    other: ['chrome-headless-shell', 'headless_shell'],
  },
  chromium: {
    win32: ['chrome.exe'],
    darwin: ['Google Chrome for Testing', 'Chromium'],
    other: ['chrome'],
  },
});
// Folders that never hold the executable; skipping them keeps the bounded walk cheap.
const SKIP_DIRS = new Set(['Frameworks', 'Resources', 'resources', 'locales', '_CodeSignature']);
const MAX_WALK_DEPTH = 5;
const MISSING_TEXT = /Executable doesn't exist|distribution '[^']+' is not found|spawn \S+ ENOENT/i;

const chosen = new WeakMap();
let lastEngine = null;

function isMissingExecutable(error) {
  return MISSING_TEXT.test(error && typeof error.message === 'string' ? error.message : String(error));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function playwrightVersion() {
  const pkg = readJson(path.join(SKILL_ROOT, 'node_modules', 'playwright', 'package.json'));
  return pkg && typeof pkg.version === 'string' ? pkg.version : null;
}

function expectedRevision() {
  const manifest = readJson(path.join(SKILL_ROOT, 'node_modules', 'playwright-core', 'browsers.json'));
  if (!manifest || !Array.isArray(manifest.browsers)) return null;
  // Headless launches use the headless shell; the full browser shares its revision.
  const entry = manifest.browsers.find((browser) => browser.name === 'chromium-headless-shell')
    || manifest.browsers.find((browser) => browser.name === 'chromium');
  return entry && entry.revision ? String(entry.revision) : null;
}

function engineRecord(name, degraded, launch) {
  return Object.freeze({ name, degraded, launch: Object.freeze({ ...launch }) });
}

function defaultEngine() {
  const revision = expectedRevision();
  return engineRecord(revision ? `playwright chromium r${revision}` : 'playwright chromium', false, {});
}

function explicitEngine(env = process.env, platform = process.platform) {
  const executable = readEnvKey(env, ENGINE_ENV.executable, platform);
  const channel = readEnvKey(env, ENGINE_ENV.channel, platform);
  if (executable && channel) {
    throw new Error(`set only one of ${ENGINE_ENV.executable} and ${ENGINE_ENV.channel}`);
  }
  if (executable) {
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    let isFile = false;
    try {
      isFile = pathApi.isAbsolute(executable) && fs.statSync(executable).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) {
      throw new Error(`${ENGINE_ENV.executable} must be an absolute path to an existing browser executable; got "${executable}"`);
    }
    return engineRecord(`${ENGINE_ENV.executable} ${executable}`, false, { executablePath: executable });
  }
  if (channel) {
    if (!SYSTEM_CHANNELS.includes(channel)) {
      throw new Error(`${ENGINE_ENV.channel} must be ${SYSTEM_CHANNELS.join(' or ')}; got "${channel}"`);
    }
    return engineRecord(`channel ${channel}`, false, { channel });
  }
  return null;
}

function executableNames(kind, platform) {
  const names = EXECUTABLE_NAMES[kind];
  return names[platform] || names.other;
}

// Breadth-first, depth-bounded search for the first file with one of `names`.
function findExecutable(dir, names) {
  let level = [dir];
  for (let depth = 0; depth <= MAX_WALK_DEPTH && level.length > 0; depth += 1) {
    const next = [];
    for (const current of level) {
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isFile() && names.includes(entry.name)) return full;
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) next.push(full);
      }
    }
    level = next;
  }
  return null;
}

function cachedChromium(browsersPath, platform = process.platform) {
  if (!browsersPath || browsersPath === '0') return [];
  let entries;
  try {
    entries = fs.readdirSync(browsersPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const match = entry.isDirectory() ? CACHE_DIR.exec(entry.name) : null;
    if (!match) continue;
    const dir = path.join(browsersPath, entry.name);
    const complete = fs.existsSync(path.join(dir, 'INSTALLATION_COMPLETE'));
    found.push({
      kind: match[1],
      revision: Number(match[2]),
      dir,
      complete,
      executablePath: complete ? findExecutable(dir, executableNames(match[1], platform)) : null,
    });
  }
  // Newest revision first; within a revision the headless shell (what headless launches use) first.
  return found.sort((a, b) => b.revision - a.revision
    || Number(b.kind === 'chromium_headless_shell') - Number(a.kind === 'chromium_headless_shell'));
}

function fallbackEngines({ env = process.env, platform = process.platform, cwd = process.cwd(), untrusted = false } = {}) {
  const system = SYSTEM_CHANNELS.map((channel) => engineRecord(`channel ${channel}`, true, { channel }));
  if (untrusted) return system;
  const cached = cachedChromium(resolveBrowsersPath(env, platform, cwd), platform)
    .filter((entry) => entry.executablePath)
    .map((entry) => engineRecord(`cached ${entry.kind}-${entry.revision}`, true, { executablePath: entry.executablePath }));
  return [...cached, ...system];
}

function fallbackDisabled(env, platform) {
  return readEnvKey(env, ENGINE_ENV.fallback, platform) === '0';
}

function firstLine(error) {
  return String(error && error.message ? error.message : error).split('\n')[0];
}

// What is missing, in one place: the revision Playwright wants and the revisions the cache holds.
function describeMissing({ env, platform, cwd, tried, disabled, untrusted }) {
  const browsersPath = resolveBrowsersPath(env, platform, cwd);
  const revisions = [...new Set(cachedChromium(browsersPath, platform).map((entry) => entry.revision))];
  const lines = [
    `Playwright ${playwrightVersion() || '(unknown version)'} expects Chromium revision ${expectedRevision() || '(not listed)'}; `
      + `the browser cache at ${browsersPath} holds ${revisions.length ? `revisions ${revisions.join(', ')}` : 'no Chromium revision'}.`,
  ];
  if (disabled) lines.push(`${ENGINE_ENV.fallback}=0 turned off the fallback to another installed browser.`);
  if (untrusted) lines.push('Untrusted live pages run only on Playwright\'s own Chromium, the installed Chrome or Edge, or an explicit override; an older cached Chromium is never used for them.');
  if (tried.length) lines.push(`Fallbacks tried: ${tried.join('; ')}.`);
  lines.push(`To use a browser that is already installed, set ${ENGINE_ENV.executable}=<absolute path> or ${ENGINE_ENV.channel}=${SYSTEM_CHANNELS.join('|')}.`);
  return lines.join('\n');
}

function remember(playwright, engine, untrusted) {
  if (!untrusted && playwright && (typeof playwright === 'object' || typeof playwright === 'function')) chosen.set(playwright, engine);
  lastEngine = engine;
}

async function launchChromium(playwright, launch, options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const cwd = options.cwd || process.cwd();
  const warn = options.warn || ((message) => console.error(message));
  const untrusted = options.untrusted === true;

  // An untrusted launch resolves afresh: a remembered engine may be an older cached Chromium.
  const remembered = playwright && !untrusted ? chosen.get(playwright) : undefined;
  if (remembered) {
    const browser = await launch(remembered.launch);
    lastEngine = remembered;
    return browser;
  }

  const explicit = explicitEngine(env, platform);
  if (explicit) {
    const browser = await launch(explicit.launch);
    remember(playwright, explicit, untrusted);
    return browser;
  }

  try {
    const browser = await launch({});
    remember(playwright, defaultEngine(), untrusted);
    return browser;
  } catch (error) {
    if (!isMissingExecutable(error)) throw error;
    const disabled = fallbackDisabled(env, platform);
    const tried = [];
    if (!disabled) {
      for (const candidate of fallbackEngines({ env, platform, cwd, untrusted })) {
        try {
          const browser = await launch(candidate.launch);
          remember(playwright, candidate, untrusted);
          warn(`Warning: html-export is rendering with ${candidate.name} (degraded): ${firstLine(error)}. `
            + `Set ${ENGINE_ENV.fallback}=0 to fail instead.`);
          return browser;
        } catch (fallbackError) {
          tried.push(`${candidate.name} (${firstLine(fallbackError)})`);
        }
      }
    }
    error.message = `${error.message}\n${describeMissing({ env, platform, cwd, tried, disabled, untrusted })}`;
    throw error;
  }
}

function currentEngine() {
  if (!lastEngine) return null;
  return { name: lastEngine.name, degraded: lastEngine.degraded, ...lastEngine.launch };
}

module.exports = {
  ENGINE_ENV,
  SYSTEM_CHANNELS,
  launchChromium,
  currentEngine,
  explicitEngine,
  fallbackEngines,
  cachedChromium,
  expectedRevision,
  isMissingExecutable,
};
