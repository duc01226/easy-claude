#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('../../../scripts/lib/project-root.cjs');

const EXIT = Object.freeze({
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  DEPENDENCY: 3,
  PAGE_ERROR: 4,
});

// Paths are relative to this dispatcher, so targets can add files under scripts/lib/.
const TARGETS = Object.freeze({
  png: 'lib/to-png.cjs',
  pdf: 'lib/to-pdf.cjs',
  mp4: 'lib/to-video.cjs',
  gif: 'lib/to-video.cjs',
});

const GENERIC_FLAGS = Object.freeze({
  out: 'path',
  viewport: 'string',
  slides: 'optional-string',
  page: 'string',
  scale: 'number',
  timeout: 'int',
  offline: 'bool',
  'allow-errors': 'bool',
  'self-check': 'bool',
  help: 'bool',
});

const MIN_NODE_MAJOR = 20;
const MIN_PLAYWRIGHT_VERSION = '1.45.0';
const DEFAULT_LAUNCH_TIMEOUT_MS = 30_000;
const USAGE_HELP = `Usage:
  node .claude/skills/html-export/scripts/export.cjs --to=<png|pdf|mp4|gif> <input...> [options]

Targets:
  --to=png   Render screenshots and check page errors or blank output
  --to=pdf   Export print pages or navigated slides as PDF
  --to=mp4   Record deterministic HTML animation as MP4
  --to=gif   Record deterministic HTML animation as GIF

Generic options:
  --out=<dir>             Output directory (default: project tmp/html-export)
  --viewport=<WxH[,WxH]>  One or more screenshot viewports
  --slides[=<css>]        Navigate slides with the default or supplied selector
  --page=<WxH>            PDF page size
  --scale=<n>             Screenshot scale
  --timeout=<ms>          Operation timeout
  --offline               Block network access while rendering
  --allow-errors          Allow captured page errors
  --self-check            Run the target's known-good self-check
  --help                  Show this help`;

class UsageError extends Error {}
class TargetContractError extends Error {}

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function errorMessage(error) {
  return error && typeof error.message === 'string' ? error.message : String(error);
}

function extractTarget(argv) {
  let to = null;
  let supplied = false;
  let ended = false;
  const rest = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!ended && arg === '--') {
      ended = true;
      rest.push(arg);
      continue;
    }

    if (!ended && arg === '--to') {
      supplied = true;
      to = index + 1 < argv.length && argv[index + 1] !== '--' ? argv[index + 1] : null;
      if (to !== null) index += 1;
      continue;
    }

    if (!ended && arg.startsWith('--to=')) {
      supplied = true;
      to = arg.slice('--to='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return { to, supplied, rest };
}

function hasHelp(rest) {
  for (const arg of rest) {
    if (arg === '--') return false;
    if (arg === '--help') return true;
  }
  return false;
}

function canonicalType(type) {
  const aliases = {
    string: 'string',
    path: 'string',
    number: 'number',
    int: 'int',
    bool: 'bool',
    boolean: 'bool',
    'optional-string': 'optional-string',
  };
  return aliases[type] || null;
}

function flagProperty(name) {
  return name.replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

function parseOptions(rest, targetFlags = {}) {
  if (!isRecord(targetFlags)) {
    throw new TargetContractError('target.flags must be an object mapping flag names to types');
  }

  const flagTypes = { ...GENERIC_FLAGS };
  for (const [name, type] of Object.entries(targetFlags)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TargetContractError(`invalid target flag name: ${name}`);
    }
    if (Object.prototype.hasOwnProperty.call(GENERIC_FLAGS, name)) {
      throw new TargetContractError(`target flag --${name} conflicts with a generic flag`);
    }
    if (!canonicalType(type)) {
      throw new TargetContractError(`unsupported type for target flag --${name}: ${String(type)}`);
    }
    flagTypes[name] = type;
  }

  const options = { inputs: [] };
  let ended = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!ended && arg === '--') {
      ended = true;
      continue;
    }

    if (!ended && arg.startsWith('--')) {
      const equalsAt = arg.indexOf('=');
      const name = arg.slice(2, equalsAt < 0 ? undefined : equalsAt);
      const rawValue = equalsAt < 0 ? undefined : arg.slice(equalsAt + 1);
      if (!Object.prototype.hasOwnProperty.call(flagTypes, name)) {
        throw new UsageError(`Unknown flag --${name} for target ${options.to || 'selected'}; run with --help for valid options.`);
      }

      const type = canonicalType(flagTypes[name]);
      const property = flagProperty(name);
      if (type === 'bool') {
        if (rawValue !== undefined) throw new UsageError(`Boolean flag --${name} does not take a value.`);
        options[property] = true;
        continue;
      }
      if (type === 'optional-string' && rawValue === undefined) {
        options[property] = true;
        continue;
      }

      let value = rawValue;
      if (value === undefined) {
        const next = rest[index + 1];
        if (next === undefined || next === '--' || next.startsWith('--')) {
          throw new UsageError(`Flag --${name} requires a value.`);
        }
        value = next;
        index += 1;
      }
      if (value === '') throw new UsageError(`Flag --${name} requires a non-empty value.`);

      if (type === 'number' || type === 'int') {
        const number = Number(value);
        if (!Number.isFinite(number) || (type === 'int' && !Number.isInteger(number))) {
          throw new UsageError(`Flag --${name} requires a ${type === 'int' ? 'whole number' : 'number'}.`);
        }
        options[property] = number;
      } else {
        options[property] = value;
      }
      continue;
    }

    options.inputs.push(arg);
  }

  options.input = options.inputs[0] || null;
  return options;
}

function validateTargetModule(moduleExports, targetName) {
  if (!isRecord(moduleExports)) {
    throw new TargetContractError(`target ${targetName} must export an object`);
  }
  if (!isRecord(moduleExports.flags)) {
    throw new TargetContractError(`target ${targetName} must export flags as an object`);
  }
  for (const method of ['validate', 'preflight', 'run']) {
    if (typeof moduleExports[method] !== 'function') {
      throw new TargetContractError(`target ${targetName} must export ${method}(...)`);
    }
  }
  if (moduleExports.requiresPdfLib !== undefined
    && typeof moduleExports.requiresPdfLib !== 'boolean'
    && typeof moduleExports.requiresPdfLib !== 'function') {
    throw new TargetContractError(`target ${targetName} requiresPdfLib must be a boolean or function`);
  }
  return moduleExports;
}

function loadTarget(targetName, skillRoot) {
  const targetPath = path.join(__dirname, TARGETS[targetName]);
  let moduleExports;
  try {
    // Only the selected target is loaded; each target owns its flags and dependencies.
    moduleExports = require(targetPath);
  } catch (error) {
    throw new TargetContractError(
      `could not load target ${targetName} at ${path.relative(skillRoot, targetPath)}: ${errorMessage(error)}. `
      + 'Target modules must defer Playwright and pdf-lib imports until their functions run.',
    );
  }
  return validateTargetModule(moduleExports, targetName);
}

function formatTimestamp(date) {
  const two = (number) => String(number).padStart(2, '0');
  return `${two(date.getFullYear() % 100)}${two(date.getMonth() + 1)}${two(date.getDate())}-${two(date.getHours())}${two(date.getMinutes())}`;
}

function safeBasename(input) {
  const value = path.basename(input || 'input')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '');
  return value || 'input';
}

function resolveOutputDir(options, runtime) {
  if (options.out) return path.resolve(runtime.cwd, options.out);

  const project = resolveProjectRoot({
    cwd: runtime.cwd,
    scriptPath: runtime.scriptPath,
    env: runtime.env,
  });
  if (project.error) throw new Error(project.error);

  const inputName = safeBasename(options.input || 'input');
  return path.join(project.rootDir, 'tmp', 'html-export', `${formatTimestamp(runtime.now)}-${inputName}`);
}

function parseVersion(version) {
  if (typeof version !== 'string') return null;
  const match = /^(?:v)?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

function versionAtLeast(actualVersion, minimumVersion) {
  const actual = parseVersion(actualVersion);
  const minimum = parseVersion(minimumVersion);
  if (!actual || !minimum) return false;

  for (const part of ['major', 'minor', 'patch']) {
    if (actual[part] > minimum[part]) return true;
    if (actual[part] < minimum[part]) return false;
  }
  if (minimum.prerelease) return actual.prerelease === null || actual.prerelease >= minimum.prerelease;
  return actual.prerelease === null;
}

function sharedSetupHints() {
  return [
    'Setup commands (the exporter never runs these):',
    '  All platforms: npm install --prefix .claude/skills/html-export',
    '  Windows/macOS: npx --prefix .claude/skills/html-export playwright install chromium',
    '  Linux: npx --prefix .claude/skills/html-export playwright install --with-deps chromium',
  ].join('\n');
}

function dependencyFailure(reason) {
  return `${reason}\n\n${sharedSetupHints()}`;
}

function withTimeout(start, timeoutMs, operation) {
  let timer;
  const timed = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(start), timed]).finally(() => clearTimeout(timer));
}

function requiresPdfLib(target, options) {
  if (typeof target.requiresPdfLib === 'function') {
    const required = target.requiresPdfLib(options);
    if (typeof required !== 'boolean') {
      throw new TargetContractError('target requiresPdfLib(options) must return a boolean');
    }
    return required;
  }
  return target.requiresPdfLib === true;
}

async function sharedPreflight(skillRoot, target, options, runtime = {}) {
  const nodeVersion = runtime.nodeVersion || process.versions.node;
  const nodeMajor = /^(?:v)?(\d+)/.exec(nodeVersion);
  if (!nodeMajor || Number(nodeMajor[1]) < MIN_NODE_MAJOR) {
    return dependencyFailure(`Node.js ${MIN_NODE_MAJOR} or newer is required; found ${nodeVersion || 'unknown'}.`);
  }

  const playwrightRoot = path.join(skillRoot, 'node_modules', 'playwright');
  const playwrightPackagePath = path.join(playwrightRoot, 'package.json');
  let playwrightPackage;
  try {
    playwrightPackage = JSON.parse(fs.readFileSync(playwrightPackagePath, 'utf8'));
  } catch {
    return dependencyFailure(`Playwright is not installed in the html-export skill at ${playwrightRoot}.`);
  }
  if (!versionAtLeast(playwrightPackage.version, MIN_PLAYWRIGHT_VERSION)) {
    return dependencyFailure(
      `Playwright ${MIN_PLAYWRIGHT_VERSION} or newer is required in the html-export skill; found ${playwrightPackage.version || 'an invalid version'}.`,
    );
  }

  if (requiresPdfLib(target, options)) {
    const pdfLibPath = path.join(skillRoot, 'node_modules', 'pdf-lib');
    let pdfLibAvailable = false;
    try {
      pdfLibAvailable = fs.statSync(pdfLibPath).isDirectory();
    } catch {}
    if (!pdfLibAvailable) {
      return dependencyFailure(`pdf-lib is required by target ${options.to}, but is not installed in the html-export skill.`);
    }
  }

  let browser;
  let closeStarted = false;
  try {
    // An absolute skill-local path prevents Node from accepting an adopter's parent dependency.
    const playwright = require(playwrightRoot);
    if (!playwright.chromium || typeof playwright.chromium.launch !== 'function') {
      return dependencyFailure('The skill-local Playwright package does not expose chromium.launch().');
    }
    const probeTimeout = options.timeout || DEFAULT_LAUNCH_TIMEOUT_MS;
    const deadline = Date.now() + probeTimeout;
    browser = await withTimeout(
      () => playwright.chromium.launch({ headless: true, timeout: probeTimeout }),
      probeTimeout,
      'Chromium launch probe',
    );
    if (!browser || typeof browser.close !== 'function') {
      return dependencyFailure('The Playwright launch probe did not return a closable browser.');
    }
    const remaining = Math.max(1, deadline - Date.now());
    closeStarted = true;
    await withTimeout(() => browser.close(), remaining, 'Chromium close probe');
  } catch (error) {
    if (browser && typeof browser.close === 'function' && !closeStarted) {
      try { await browser.close(); } catch {}
    }
    return dependencyFailure(`Chromium launch probe failed: ${errorMessage(error)}`);
  }

  return null;
}

async function main(argv = process.argv.slice(2), runtime = {}) {
  const context = {
    cwd: path.resolve(runtime.cwd || process.cwd()),
    scriptPath: runtime.scriptPath || __filename,
    env: runtime.env || process.env,
    nodeVersion: runtime.nodeVersion || process.versions.node,
    now: runtime.now || new Date(),
  };
  const selected = extractTarget(argv);

  if (selected.to !== null && !Object.prototype.hasOwnProperty.call(TARGETS, selected.to)) {
    console.error(`Unknown --to target: ${selected.to}. Valid targets: ${Object.keys(TARGETS).join(', ')}.`);
    return EXIT.USAGE;
  }
  if (hasHelp(selected.rest)) {
    console.log(USAGE_HELP);
    return EXIT.OK;
  }
  if (!selected.supplied || selected.to === null) {
    console.error(`Missing --to=<png|pdf|mp4|gif>.\nRun with --help for usage.`);
    return EXIT.USAGE;
  }

  const skillRoot = path.resolve(__dirname, '..');
  let target;
  try {
    target = loadTarget(selected.to, skillRoot);
  } catch (error) {
    console.error(`html-export developer error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }

  let options;
  try {
    options = parseOptions(selected.rest, target.flags);
    options.to = selected.to;
  } catch (error) {
    const code = error instanceof UsageError ? EXIT.USAGE : EXIT.ERROR;
    console.error(`${code === EXIT.USAGE ? 'Usage error' : 'html-export developer error'}: ${errorMessage(error)}`);
    return code;
  }

  try {
    const validation = target.validate(options);
    if (validation && typeof validation.then === 'function') {
      throw new TargetContractError('target.validate(options) must be synchronous');
    }
  } catch (error) {
    if (error instanceof TargetContractError) {
      console.error(`html-export developer error: ${errorMessage(error)}`);
      return EXIT.ERROR;
    }
    console.error(`Usage error: ${errorMessage(error)}`);
    return EXIT.USAGE;
  }

  try {
    // Target usage errors take precedence over project-root configuration errors.
    options.outputDir = resolveOutputDir(options, context);
  } catch (error) {
    console.error(`html-export developer error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }

  let targetDependency;
  try {
    targetDependency = target.preflight(options);
    if (targetDependency && typeof targetDependency.then === 'function') {
      throw new TargetContractError('target.preflight(options) must be synchronous');
    }
    if (targetDependency !== null && typeof targetDependency !== 'string') {
      throw new TargetContractError('target.preflight(options) must return a string or null');
    }
  } catch (error) {
    console.error(`html-export developer error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }
  if (targetDependency) {
    console.error(`Dependency missing for target ${selected.to}: ${targetDependency}`);
    return EXIT.DEPENDENCY;
  }

  let sharedDependency;
  try {
    sharedDependency = await sharedPreflight(skillRoot, target, options, context);
  } catch (error) {
    console.error(`html-export developer error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }
  if (sharedDependency) {
    console.error(`Dependency missing: ${sharedDependency}`);
    return EXIT.DEPENDENCY;
  }

  try {
    const result = await target.run(options);
    if (result === undefined || result === null) return EXIT.OK;
    if (Number.isInteger(result) && Object.values(EXIT).includes(result)) return result;
    console.error(`html-export developer error: target ${selected.to}.run(options) returned invalid exit code ${String(result)}`);
    return EXIT.ERROR;
  } catch (error) {
    console.error(`html-export error: ${errorMessage(error)}`);
    return EXIT.ERROR;
  }
}

module.exports = {
  EXIT,
  TARGETS,
  GENERIC_FLAGS,
  extractTarget,
  parseOptions,
  resolveOutputDir,
  versionAtLeast,
  sharedPreflight,
  main,
};

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`html-export error: ${errorMessage(error)}`);
    process.exitCode = EXIT.ERROR;
  });
}
