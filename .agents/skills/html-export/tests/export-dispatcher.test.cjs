'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const SKILL_ROOT = path.resolve(__dirname, '..');
const SOURCE_DISPATCHER = path.join(SKILL_ROOT, 'scripts', 'export.cjs');
const SOURCE_PROJECT_ROOT_HELPER = path.resolve(__dirname, '..', '..', '..', 'scripts', 'lib', 'project-root.cjs');
const SOURCE_RUNNER = path.join(__dirname, 'run-tests.cjs');
const TARGET_MODULE_FILES = Object.freeze({
  png: 'to-png.cjs',
  pdf: 'to-pdf.cjs',
  mp4: 'to-video.cjs',
  gif: 'to-video.cjs',
});
const CHILD_ENV_ALLOWLIST = new Set([
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PROCESSOR_ARCHITECTURE',
  'PROCESSOR_ARCHITEW6432', 'NUMBER_OF_PROCESSORS', 'OS', 'LANG', 'LC_ALL', 'TZ',
]);

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'html-export-fixture-'));
  let unrelatedCwd;
  try {
    unrelatedCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'html-export-cwd-'));
    const skillRoot = path.join(root, '.claude', 'skills', 'html-export');
    const dispatcherPath = path.join(skillRoot, 'scripts', 'export.cjs');
    const testsRoot = path.join(skillRoot, 'tests');
    fs.mkdirSync(path.dirname(dispatcherPath), { recursive: true });
    fs.mkdirSync(testsRoot, { recursive: true });
    fs.mkdirSync(path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(SOURCE_DISPATCHER, dispatcherPath);
    fs.copyFileSync(
      SOURCE_PROJECT_ROOT_HELPER,
      path.join(root, '.claude', 'scripts', 'lib', 'project-root.cjs'),
    );
    return { root, unrelatedCwd, skillRoot, dispatcherPath, testsRoot };
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    if (unrelatedCwd) fs.rmSync(unrelatedCwd, { recursive: true, force: true });
    throw error;
  }
}

function cleanupFixture(fixture) {
  try {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  } finally {
    fs.rmSync(fixture.unrelatedCwd, { recursive: true, force: true });
  }
}

function withFixture(run) {
  const fixture = createFixture();
  try {
    return run(fixture);
  } finally {
    cleanupFixture(fixture);
  }
}

function childEnvironment(tempRoot, projectRoot) {
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (CHILD_ENV_ALLOWLIST.has(name.toUpperCase())) env[name] = value;
  }
  for (const name of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) {
    env[name] = tempRoot;
  }
  if (projectRoot !== undefined) env.CLAUDE_PROJECT_DIR = projectRoot;
  return env;
}

function runProcess(executable, argv, options) {
  const result = spawnSync(executable, argv, {
    cwd: options.cwd,
    env: childEnvironment(options.fixture.root, options.projectRoot),
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
  assert.ifError(result.error);
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    all: (result.stdout || '') + (result.stderr || ''),
  };
}

function runDispatcher(fixture, args, projectRoot) {
  return runProcess(process.execPath, [fixture.dispatcherPath, ...args], {
    fixture,
    projectRoot,
    cwd: fixture.unrelatedCwd,
  });
}

function writeTarget(fixture, targetName, options = {}) {
  const targetPath = path.join(
    fixture.skillRoot,
    'scripts',
    'lib',
    TARGET_MODULE_FILES[targetName],
  );
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const config = {
    flags: options.flags || {},
    validateMessage: options.validateMessage || null,
    preflightMessage: options.preflightMessage || null,
  };
  const configLine = 'const config = ' + JSON.stringify(config) + ';';
  const loadMarker = options.loadMarker
    ? 'fs.writeFileSync(' + JSON.stringify(options.loadMarker) + ', \'loaded\');'
    : '';
  const preflightMarker = options.preflightMarker
    ? 'fs.writeFileSync(' + JSON.stringify(options.preflightMarker) + ', \'called\');'
    : '';
  const validatePdfRequirement = typeof options.requiresPdfLib === 'function'
    ? 'requiresPdfLib: ' + options.requiresPdfLib.toString() + ','
    : options.requiresPdfLib === undefined
      ? ''
      : 'requiresPdfLib: ' + JSON.stringify(options.requiresPdfLib) + ',';
  const validateBody = config.validateMessage
    ? 'throw new Error(' + JSON.stringify(config.validateMessage) + ');'
    : '';
  const source = [
    '\'use strict\';',
    'const fs = require(\'node:fs\');',
    'const path = require(\'node:path\');',
    configLine,
    loadMarker,
    'module.exports = {',
    '  flags: config.flags,',
    validatePdfRequirement,
    '  validate() { ' + validateBody + ' },',
    '  preflight() { ' + preflightMarker + ' return config.preflightMessage; },',
    '  async run(options) {',
    '    fs.writeFileSync(path.resolve(__dirname, \'..\', \'..\', \'capture.json\'), JSON.stringify(options));',
    '    return 0;',
    '  },',
    '};',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(targetPath, source, 'utf8');
  return targetPath;
}

function writeAllTargetLoadMarkers(fixture) {
  const modules = [
    ['png', 'loaded-png'],
    ['pdf', 'loaded-pdf'],
    ['mp4', 'loaded-video'],
  ];
  for (const [targetName, markerName] of modules) {
    writeTarget(fixture, targetName, {
      loadMarker: path.join(fixture.skillRoot, 'scripts', markerName),
    });
  }
  return modules.map(([, markerName]) => path.join(fixture.skillRoot, 'scripts', markerName));
}

function writePlaywright(fixture, options = {}) {
  const packageRoot = path.join(fixture.skillRoot, 'node_modules', 'playwright');
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'playwright', version: options.version || '1.45.0' }),
    'utf8',
  );
  const launchBody = options.launchError
    ? 'throw new Error(' + JSON.stringify(options.launchError) + ');'
    : 'return { close: async function close() {} };';
  fs.writeFileSync(
    path.join(packageRoot, 'index.js'),
    'module.exports = { chromium: { launch: async function launch() { ' + launchBody + ' } } };',
    'utf8',
  );
  return packageRoot;
}

function readCapture(fixture) {
  return JSON.parse(fs.readFileSync(path.join(fixture.skillRoot, 'capture.json'), 'utf8'));
}

function assertSetupHints(stderr) {
  assert.match(stderr, /All platforms: npm install --prefix \.claude\/skills\/html-export/);
  assert.match(stderr, /Windows\/macOS: npx --prefix \.claude\/skills\/html-export playwright install chromium/);
  assert.match(stderr, /Linux: npx --prefix \.claude\/skills\/html-export playwright install --with-deps chromium/);
}

test('TC-HTMLX-001 missing --to is a usage error', () => withFixture((fixture) => {
  // Given: A copied dispatcher with no target selected.
  // When: The dispatcher receives no command-line arguments.
  // Then: It exits 2, reports the required --to option on stderr, and writes no stdout.
  const result = runDispatcher(fixture, []);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing --to=/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-002 unknown targets list the four supported targets', () => withFixture((fixture) => {
  // Given: A copied dispatcher and each planned unsupported target name.
  // When: The dispatcher receives --to=pptx and --to=docx in separate processes.
  // Then: Both invocations exit 2 and list png, pdf, mp4, and gif.
  for (const targetName of ['pptx', 'docx']) {
    const result = runDispatcher(fixture, ['--to=' + targetName]);
    assert.equal(result.status, 2, targetName + ' should be rejected as a usage error');
    assert.match(result.stderr, new RegExp('Unknown --to target: ' + targetName));
    assert.match(result.stderr, /Valid targets: png, pdf, mp4, gif/);
    assert.equal(result.stdout, '');
  }
}));

test('TC-HTMLX-003 help lists targets without loading target modules', () => withFixture((fixture) => {
  // Given: All target module paths contain load-time marker writes.
  const loadMarkers = writeAllTargetLoadMarkers(fixture);
  // When: The dispatcher receives --help without dependencies installed.
  const result = runDispatcher(fixture, ['--help']);
  // Then: Help exits 0, names all four targets, and no lazy target module was loaded.
  assert.equal(result.status, 0);
  for (const targetName of ['png', 'pdf', 'mp4', 'gif']) {
    assert.match(result.stdout, new RegExp('--to=' + targetName + '\\b'));
  }
  for (const marker of loadMarkers) assert.equal(fs.existsSync(marker), false, marker + ' must not be created');
  assert.equal(result.stderr, '');
}));

test('TC-HTMLX-004 missing skill dependencies provide setup hints without self-installing', () => withFixture((fixture) => {
  // Given: A target stub and a fresh copied skill with no node_modules directory.
  writeTarget(fixture, 'png');
  const nodeModules = path.join(fixture.skillRoot, 'node_modules');
  assert.equal(fs.existsSync(nodeModules), false);
  // When: The dispatcher starts a supported target without its local dependencies.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: It exits 3, prints per-OS setup commands, and creates no node_modules.
  assert.equal(result.status, 3);
  assertSetupHints(result.stderr);
  assert.match(result.stderr, /Playwright is not installed in the html-export skill/);
  assert.equal(fs.existsSync(nodeModules), false, 'the exporter must not install its dependencies');
}));

test('TC-HTMLX-004 rejects a skill-local Playwright below the minimum version', () => withFixture((fixture) => {
  // Given: The copied skill has Playwright 1.44.9, below the planned 1.45.0 floor.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { version: '1.44.9' });
  // When: A target is run with that skill-local dependency.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Dependency preflight exits 3 with the minimum version and setup commands.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Playwright 1\.45\.0 or newer is required in the html-export skill/);
  assertSetupHints(result.stderr);
}));

test('TC-HTMLX-004 checks pdf-lib only when the target requests it', () => withFixture((fixture) => {
  // Given: A PDF target whose requiresPdfLib option function is true only for --merge.
  writeTarget(fixture, 'pdf', {
    flags: { merge: 'bool' },
    requiresPdfLib: (options) => options.merge === true,
  });
  writePlaywright(fixture);
  // When: The target runs once without merging and once with merging, while pdf-lib is absent.
  const withoutMerge = runDispatcher(fixture, ['--to=pdf', 'scene.html']);
  const withMerge = runDispatcher(fixture, ['--to=pdf', 'scene.html', '--merge']);
  // Then: The non-merge call reaches run; the merge call exits 3 with the target-owned dependency reason.
  assert.equal(withoutMerge.status, 0);
  assert.deepEqual(readCapture(fixture).merge, undefined);
  assert.equal(withMerge.status, 3);
  assert.match(withMerge.stderr, /pdf-lib is required by target pdf/);
  assertSetupHints(withMerge.stderr);
  assert.equal(fs.existsSync(path.join(fixture.skillRoot, 'node_modules', 'pdf-lib')), false);
}));

test('TC-HTMLX-004 reports a failed local Chromium launch probe', () => withFixture((fixture) => {
  // Given: A valid skill-local Playwright package whose launch probe fails.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { launchError: 'simulated headless shell unavailable' });
  // When: The dispatcher attempts the browser probe.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Dependency preflight exits 3 with the launch cause and OS-specific setup hints.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Chromium launch probe failed: simulated headless shell unavailable/);
  assertSetupHints(result.stderr);
}));

test('TC-HTMLX-005 output root honors CLAUDE_PROJECT_DIR and ignores an unrelated cwd', () => withFixture((fixture) => {
  // Given: A copied skill, a different cwd with no .claude marker, target flags, and a successful fake local browser probe.
  writeTarget(fixture, 'mp4', {
    flags: { fps: 'number', duration: 'number', audio: 'path', 'keep-frames': 'bool' },
  });
  writePlaywright(fixture);
  const explicitProjectRoot = path.join(fixture.root, 'explicit-project');
  fs.mkdirSync(path.join(explicitProjectRoot, '.claude'), { recursive: true });
  const { resolveProjectRoot } = require(path.join(
    fixture.root,
    '.claude',
    'scripts',
    'lib',
    'project-root.cjs',
  ));
  const expectedUnsetRoot = resolveProjectRoot({
    cwd: fixture.unrelatedCwd,
    scriptPath: fixture.dispatcherPath,
    env: childEnvironment(fixture.root),
  });
  const expectedSetRoot = resolveProjectRoot({
    cwd: fixture.unrelatedCwd,
    scriptPath: fixture.dispatcherPath,
    env: childEnvironment(fixture.root, explicitProjectRoot),
  });
  const canonicalExpectedUnsetRoot = fs.realpathSync(expectedUnsetRoot.rootDir);
  const canonicalExpectedSetRoot = fs.realpathSync(expectedSetRoot.rootDir);
  assert.notEqual(
    canonicalExpectedUnsetRoot,
    fs.realpathSync(fixture.unrelatedCwd),
    'the unset-env resolution must not select the unrelated working directory',
  );
  // When: One run omits CLAUDE_PROJECT_DIR and one selects the explicit project root.
  const unsetResult = runDispatcher(fixture, [
    '--to=mp4', 'scene.html', '--viewport=1280x720', '--slides', '--offline',
    '--timeout=5000', '--scale=2', '--fps=24', '--duration=2.5', '--audio=music.wav', '--keep-frames',
  ]);
  assert.equal(unsetResult.status, 0, unsetResult.all);
  const unsetOptions = readCapture(fixture);
  const setResult = runProcess(process.execPath, [fixture.dispatcherPath, '--to=mp4', 'second.html'], {
    fixture,
    projectRoot: explicitProjectRoot,
    cwd: fixture.unrelatedCwd,
  });
  // Then: Both default output roots follow project resolution, and generic plus target flags are parsed to owned option values.
  assert.equal(setResult.status, 0, setResult.all);
  const setOptions = readCapture(fixture);
  assert.equal(path.basename(path.dirname(unsetOptions.outputDir)), 'html-export');
  assert.equal(path.basename(path.dirname(path.dirname(unsetOptions.outputDir))), 'tmp');
  assert.equal(path.basename(path.dirname(setOptions.outputDir)), 'html-export');
  assert.equal(path.basename(path.dirname(path.dirname(setOptions.outputDir))), 'tmp');
  assert.equal(
    fs.realpathSync(path.resolve(path.dirname(unsetOptions.outputDir), '..', '..')),
    canonicalExpectedUnsetRoot,
  );
  assert.equal(
    fs.realpathSync(path.resolve(path.dirname(setOptions.outputDir), '..', '..')),
    canonicalExpectedSetRoot,
  );
  assert.match(path.basename(unsetOptions.outputDir), /^\d{6}-\d{4}-scene\.html$/);
  assert.match(path.basename(setOptions.outputDir), /^\d{6}-\d{4}-second\.html$/);
  assert.deepEqual(unsetOptions.inputs, ['scene.html']);
  assert.equal(unsetOptions.input, 'scene.html');
  assert.equal(unsetOptions.viewport, '1280x720');
  assert.equal(unsetOptions.slides, true);
  assert.equal(unsetOptions.offline, true);
  assert.equal(unsetOptions.timeout, 5000);
  assert.equal(unsetOptions.scale, 2);
  assert.equal(unsetOptions.fps, 24);
  assert.equal(unsetOptions.duration, 2.5);
  assert.equal(unsetOptions.audio, 'music.wav');
  assert.equal(unsetOptions.keepFrames, true);
}));

test('TC-HTMLX-006 target validation runs before shared dependency checks', () => withFixture((fixture) => {
  // Given: A target with an invalid-value validation error and a preflight marker, but no node_modules.
  const preflightMarker = path.join(fixture.skillRoot, 'preflight-called');
  writeTarget(fixture, 'mp4', {
    flags: { fps: 'number' },
    validateMessage: 'fps must be positive',
    preflightMarker,
  });
  // When: A negative fps value is validated before shared dependencies are available.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html', '--fps=-1']);
  // Then: Usage error exits 2, the target message is preserved, and later checks are not entered.
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage error: fps must be positive/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(fs.existsSync(preflightMarker), false, 'target preflight must not run after validation fails');

  // When the same invalid target value is used with a rejected project-root override.
  const invalidRootResult = runDispatcher(
    fixture,
    ['--to=mp4', 'scene.html', '--fps=-1'],
    'relative-project-root',
  );
  // Then the target usage error still takes precedence over output-root resolution.
  assert.equal(invalidRootResult.status, 2);
  assert.match(invalidRootResult.stderr, /Usage error: fps must be positive/);
  assert.doesNotMatch(invalidRootResult.stderr, /CLAUDE_PROJECT_DIR/);
}));

test('TC-HTMLX-006 target preflight error precedes the shared missing-Playwright error', () => withFixture((fixture) => {
  // Given: A target preflight message and a copied skill with no node_modules.
  writeTarget(fixture, 'mp4', { preflightMessage: 'target-specific ffmpeg dependency is missing' });
  // When: The dispatcher runs the target.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html']);
  // Then: It exits 3 with the target's dependency message before shared Playwright preflight.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /target-specific ffmpeg dependency is missing/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
}));

test('TC-HTMLX-007 undeclared target flags are rejected before dependency preflight', () => withFixture((fixture) => {
  // Given: An mp4 target that declares fps but not mystery-flag, with no node_modules.
  writeTarget(fixture, 'mp4', { flags: { fps: 'number' } });
  // When: The dispatcher receives --to=mp4 with the undeclared --mystery-flag.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html', '--mystery-flag']);
  // Then: It exits 2, names the rejected flag, skips Playwright preflight, and writes no stdout.
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag --mystery-flag/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-091 phase test runner fails when a child test fails', () => withFixture((fixture) => {
  // Given: A copied runner and one test file whose child process exits with an error.
  const runnerPath = path.join(fixture.testsRoot, 'run-tests.cjs');
  fs.copyFileSync(SOURCE_RUNNER, runnerPath);
  fs.writeFileSync(
    path.join(fixture.testsRoot, 'zz.test.cjs'),
    '\'use strict\';\nthrow new Error(\'intentional child failure\');\n',
    'utf8',
  );
  // When: The copied runner executes the discovered test using its normal child-process path.
  const result = runProcess(process.execPath, [runnerPath], {
    fixture,
    cwd: fixture.skillRoot,
  });
  // Then: The runner reports the failing filename and returns a non-zero status.
  assert.equal(result.status, 1);
  assert.match(result.stdout, /zz\.test\.cjs: FAIL \(exit 1\)/);
}));
