'use strict';

/**
 * Where Playwright keeps its downloaded browsers, per OS. One owner for the rule: the browser
 * resolver (chromium-engine.cjs) reads cached revisions from here, and the tests keep their
 * redirected HOME from losing the real cache through the same function.
 *
 * Exports:
 *   resolveBrowsersPath(env = process.env, platform = process.platform, cwd = process.cwd()) -> string
 *     PLAYWRIGHT_BROWSERS_PATH when set ('0' and absolute values unchanged, a relative value
 *     resolved against cwd), else Playwright's per-OS default:
 *       Windows  %LOCALAPPDATA%\ms-playwright (fallback <home>\AppData\Local\ms-playwright)
 *       macOS    ~/Library/Caches/ms-playwright
 *       Linux    $XDG_CACHE_HOME/ms-playwright (fallback ~/.cache/ms-playwright)
 *   readEnvKey(env, name, platform) -> string | undefined   case-insensitive on Windows only.
 */

const os = require('node:os');
const path = require('node:path');

function sameKey(left, right, platform) {
  return platform === 'win32' ? left.toUpperCase() === right.toUpperCase() : left === right;
}

function readEnvKey(env, name, platform = process.platform) {
  const key = Object.keys(env || {}).find((candidate) => sameKey(candidate, name, platform));
  return key === undefined ? undefined : env[key];
}

function homeFrom(env, platform) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const home = platform === 'win32'
    ? readEnvKey(env, 'USERPROFILE', platform) || readEnvKey(env, 'HOME', platform)
    : readEnvKey(env, 'HOME', platform);
  return home ? pathApi.resolve(home) : os.homedir();
}

function resolveBrowsersPath(env = process.env, platform = process.platform, cwd = process.cwd()) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const explicit = readEnvKey(env, 'PLAYWRIGHT_BROWSERS_PATH', platform);
  if (explicit !== undefined && explicit !== '') {
    if (explicit === '0' || pathApi.isAbsolute(explicit)) return explicit;
    return pathApi.resolve(cwd, explicit);
  }
  if (platform === 'win32') {
    const localAppData = readEnvKey(env, 'LOCALAPPDATA', platform)
      || pathApi.join(homeFrom(env, platform), 'AppData', 'Local');
    return pathApi.join(localAppData, 'ms-playwright');
  }
  if (platform === 'darwin') {
    return pathApi.join(homeFrom(env, platform), 'Library', 'Caches', 'ms-playwright');
  }
  const cacheHome = readEnvKey(env, 'XDG_CACHE_HOME', platform) || pathApi.join(homeFrom(env, platform), '.cache');
  return pathApi.join(cacheHome, 'ms-playwright');
}

module.exports = { resolveBrowsersPath, readEnvKey };
