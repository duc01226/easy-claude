'use strict';

/**
 * Edit-time lint (opt-in): after an edit, lint the ONE edited file with the project's
 * `testing.commands.lintFile` command and give the agent only the problems on lines that differ
 * from the last commit. Problems on unchanged lines are counted, never listed, so a legacy file
 * does not flood the conversation. Called by `post-edit-prettier.cjs` after it formats the file,
 * so line numbers match the file the agent sees.
 *
 * Switch: `editTimeLint.enabled` (default false). Layers, later wins per key: the framework-shipped
 * `.claude/.ck.json`, the team project config, `~/.claude/.ck.json`, the checkout
 * `.claude/.ck.local.json`; then env `CK_EDIT_TIME_LINT` (1/true/on or 0/false/off). Quiet runtime
 * mode keeps the formatter and skips lint (quiet injects no hook context).
 *
 * Changed lines: `git diff --unified=0 HEAD` for the file (staged and unstaged); an untracked file,
 * or a repository with no commit yet, counts every line as changed. A file whose diff only deletes
 * lines is still linted, so a parse error the deletion caused is shown. Outside a git work tree it
 * skips with a note. A parse error ESLint JSON marks `fatal` is shown wherever it lands.
 * Limit: a problem an edit causes on an UNCHANGED line (for example a variable left unused after
 * its last use was deleted) is not shown; it surfaces at commit-time lint or CI.
 *
 * Supported output formats (`OUTPUT_PARSERS`; a new format is one parser entry):
 *   - ESLint JSON (`--format json`): `[{ filePath, messages: [{ line, column, severity, ruleId, message }] }]`;
 *     problems ESLint itself suppressed (`eslint-suppressions.json`) stay out of `messages`.
 *   - Lines: one `path:line[:column]: message` per problem (gcc, unix, ruff concise, flake8, ...).
 *   Other output: a clean exit (0) that does not name the edited file is read as a clean summary
 *   ("All checks passed!"); otherwise it skips with a note naming the supported list.
 *
 * Cross-platform: the command runs as a literal argv vector with no shell on Windows, macOS and
 * Linux. Package runners (`npx`, `pnpm exec`, `npm exec`, `yarn`, `bunx`) resolve to the locally
 * installed tool, never a download; a local JavaScript bin runs under this Node (`process.execPath`),
 * so a Windows `.cmd` shim needs no shell. Paths are compared after `realpath`, case-insensitive on
 * Windows. A timed-out linter is killed with its process tree.
 *
 * Failure policy: fail-open. Nothing here blocks or throws to the hook. A configuration problem the
 * user can fix (no command, shell syntax, tool not installed, unknown format, timeout, linter
 * failure, no git) becomes ONE short note per session, so a failed run never reads as "clean".
 * If the host stops the hook (SIGTERM/SIGINT, POSIX) the linter tree is killed and the signal re-raised.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile, spawnSync } = require('node:child_process');

const SETTINGS_SECTION = 'editTimeLint';
const ENV_SWITCH = 'CK_EDIT_TIME_LINT';
const COMMAND_KEY = 'lintFile';
const NOT_APPLICABLE = 'none';
const DEFAULT_TIMEOUT_SECONDS = 10;
const MAX_TIMEOUT_SECONDS = 15;
// The hook has no timeout of its own, so the shortest host limit is the budget: the OpenCode bridge
// stops a hook after 20 s (Claude Code after 60 s). The post-edit hook passes a deadline of
// HOOK_BUDGET_MS from its start; lint gets what the formatter and git left, minus the kill grace.
const HOOK_BUDGET_MS = 17000;
const MIN_LINT_MS = 500;
const KILL_GRACE_MS = 2000;
const GIT_TIMEOUT_MS = 3000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_SHOWN = 20;
const MAX_MESSAGE_CHARS = 240;
const ON_VALUES = new Set(['1', 'true', 'on', 'yes', 'enabled']);
const OFF_VALUES = new Set(['0', 'false', 'off', 'no', 'disabled']);
// Generated and vendored folders, matched against the PROJECT-RELATIVE path (a project that itself
// lives under a folder named `build` is still linted). `.claude/` is NOT here (unlike the
// formatter's list): lint only reports, and the project's own lint config decides what it covers.
const SKIP_PATTERNS = [
    /[/\\]node_modules[/\\]/,
    /[/\\]\.git[/\\]/,
    /[/\\]dist[/\\]/,
    /[/\\]build[/\\]/,
    /[/\\]coverage[/\\]/,
    /[/\\]\.next[/\\]/,
    /[/\\]\.nuxt[/\\]/,
    /[/\\]\.output[/\\]/
];
// Characters a shell would interpret. Outside quotes they mean the command needs a shell.
const SHELL_CHARACTERS = new Set(['|', '&', ';', '<', '>', '`', '$', '(', ')']);
// Longest first, so `yarn run eslint` is not read as `yarn` running a tool named `run`.
const PACKAGE_RUNNERS = [['pnpm', 'exec'], ['npm', 'exec'], ['yarn', 'exec'], ['yarn', 'run'], ['npx'], ['bunx'], ['yarn']];
const JS_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);
const SUPPORTED_FORMATS = 'ESLint JSON (`--format json`), or one `path:line[:column]: message` line per problem';
const GIT_ENV_OVERRIDES = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX'];
const TAG = '[edit-time-lint]';

// ─── settings ────────────────────────────────────────────────────────────────────────────────

function normalizeSwitch(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const text = value.trim().toLowerCase();
    if (ON_VALUES.has(text)) return true;
    if (OFF_VALUES.has(text)) return false;
    return undefined;
}

/**
 * Effective settings: { enabled, timeoutMs, fileExtensions }. Default off. An out-of-range
 * timeout uses the default; the environment switch wins over every file layer.
 */
function resolveSettings({ projectDir, env = process.env, homeDir } = {}) {
    const { loadRouterSettings } = require('./prompt-route-utils.cjs');
    const merged = loadRouterSettings(projectDir, SETTINGS_SECTION, { homeDir });
    const fromEnv = normalizeSwitch(env[ENV_SWITCH]);
    const enabled = fromEnv !== undefined ? fromEnv : normalizeSwitch(merged.enabled) === true;
    const seconds = merged.timeoutSeconds;
    const timeoutSeconds = Number.isInteger(seconds) && seconds >= 1 && seconds <= MAX_TIMEOUT_SECONDS ? seconds : DEFAULT_TIMEOUT_SECONDS;
    const fileExtensions = Array.isArray(merged.fileExtensions)
        ? merged.fileExtensions.filter(ext => typeof ext === 'string' && ext.trim()).map(ext => ext.trim().toLowerCase())
        : [];
    return { enabled, timeoutMs: timeoutSeconds * 1000, fileExtensions };
}

/** The configured `testing.commands.lintFile`, or '' when absent; `none` is returned as is. */
function lintFileCommand(config) {
    const value = config && config.testing && config.testing.commands && config.testing.commands[COMMAND_KEY];
    return typeof value === 'string' ? value.trim() : '';
}

// ─── paths ───────────────────────────────────────────────────────────────────────────────────

function canonicalPath(file, platform = process.platform) {
    let resolved = path.resolve(file);
    try {
        resolved = fs.realpathSync.native(resolved);
    } catch {
        /* a path that does not exist stays as resolved */
    }
    return platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function samePath(reported, target, cwd, platform = process.platform) {
    return canonicalPath(path.resolve(cwd, reported), platform) === canonicalPath(target, platform);
}

// ─── changed lines (git) ─────────────────────────────────────────────────────────────────────

function gitEnv(env) {
    const clean = { ...env };
    for (const key of GIT_ENV_OVERRIDES) delete clean[key];
    return clean;
}

function git(args, cwd, env) {
    const result = spawnSync('git', args, { cwd, env: gitEnv(env), encoding: 'utf8', timeout: GIT_TIMEOUT_MS, windowsHide: true, maxBuffer: MAX_OUTPUT_BYTES });
    return { status: result.error ? -1 : result.status, stdout: result.stdout || '' };
}

/** `@@ -a,b +c,d @@` hunk headers → inclusive [start, end] ranges of new lines; pure deletions add none. */
function parseHunkRanges(diffText) {
    const ranges = [];
    for (const line of String(diffText).split(/\r?\n/)) {
        const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (!match) continue;
        const start = Number(match[1]);
        const count = match[2] === undefined ? 1 : Number(match[2]);
        if (count > 0) ranges.push([start, start + count - 1]);
    }
    return ranges;
}

/**
 * Lines of `file` that differ from HEAD: { all: true } (untracked or no commit yet),
 * { ranges, edited } (`edited`: the diff is not empty, even when it only deletes lines, so
 * `ranges` may be empty), or { error: 'no-git' | 'git-failed' }.
 */
function changedLines(file, { env = process.env } = {}) {
    const real = canonicalPath(file, 'posix');
    const dir = path.dirname(real);
    const top = git(['rev-parse', '--show-toplevel'], dir, env);
    if (top.status !== 0) return { error: 'no-git' };
    // `top`: the path is relative to the work-tree root, not to the folder git runs in; `literal`: no glob.
    const spec = `:(top,literal)${path.relative(canonicalPath(top.stdout.trim(), 'posix'), real).split(path.sep).join('/')}`;
    const diff = git(['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--unified=0', 'HEAD', '--', spec], dir, env);
    if (diff.status !== 0) {
        return git(['rev-parse', '-q', '--verify', 'HEAD'], dir, env).status === 0 ? { error: 'git-failed' } : { all: true };
    }
    const ranges = parseHunkRanges(diff.stdout);
    if (ranges.length || diff.stdout.trim()) return { ranges, edited: true };
    return git(['ls-files', '--error-unmatch', '--', spec], dir, env).status === 0 ? { ranges: [], edited: false } : { all: true };
}

function isChanged(line, changed) {
    if (!Number.isInteger(line) || line < 1) return false;
    return changed.all === true || changed.ranges.some(([start, end]) => line >= start && line <= end);
}

// ─── command → argv ──────────────────────────────────────────────────────────────────────────

/** Split a command template into literal words. Quotes group; null = shell syntax or unbalanced quotes. */
function tokenize(template) {
    const words = [];
    let word = '';
    let quote = null;
    let started = false;
    for (const ch of String(template)) {
        if (quote) {
            if (ch === quote) quote = null;
            else word += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            started = true;
        } else if (/\s/.test(ch)) {
            if (started) words.push(word);
            word = '';
            started = false;
        } else if (SHELL_CHARACTERS.has(ch)) {
            return null;
        } else {
            word += ch;
            started = true;
        }
    }
    if (quote) return null;
    if (started) words.push(word);
    return words;
}

/** `{file}` → the file path in every word; appended as the last word when no word names it. */
function substituteFile(words, file) {
    const named = words.some(word => word.includes('{file}'));
    const out = words.map(word => word.split('{file}').join(file));
    return named ? out : [...out, file];
}

function isJavaScriptFile(file) {
    if (JS_EXTENSIONS.has(path.extname(file).toLowerCase())) return true;
    try {
        const fd = fs.openSync(file, 'r');
        try {
            const head = Buffer.alloc(128);
            const bytes = fs.readSync(fd, head, 0, head.length, 0);
            const firstLine = head.toString('utf8', 0, bytes).split(/\r?\n/)[0];
            return firstLine.startsWith('#!') && /\bnode\b/.test(firstLine);
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return false;
    }
}

/** A JavaScript entry runs under this Node; a native file runs directly; a Windows script needs a shell. */
function launchFile(file, platform, execPath) {
    if (isJavaScriptFile(file)) return { command: execPath, prefix: [file] };
    if (platform === 'win32' && /\.(cmd|bat)$/i.test(file)) return { error: 'needs-shell', name: path.basename(file) };
    return { command: file, prefix: [] };
}

/** The JavaScript entry of package `name`'s bin named `name`, from its package.json. */
function packageBinEntry(modulesDir, name) {
    try {
        const pkgDir = path.join(modulesDir, ...name.split('/'));
        const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
        const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin && pkg.bin[name.split('/').pop()];
        if (typeof rel !== 'string') return null;
        const entry = path.resolve(pkgDir, rel);
        return fs.existsSync(entry) ? entry : null;
    } catch {
        return null;
    }
}

/**
 * The script an npm/pnpm Windows `.cmd` shim launches. A real npm shim quotes `"%dp0%\node.exe"`
 * (a Node next to the shim, usually absent) before `"%dp0%\..\pkg\bin\tool.js"`, so take the first
 * quoted `%dp0%` / `%~dp0` path that exists and is not a Node executable.
 */
function cmdShimTarget(shimFile) {
    try {
        const text = fs.readFileSync(shimFile, 'utf8');
        for (const match of text.matchAll(/"%~?dp0%?\\([^"]+)"/g)) {
            const target = path.resolve(path.dirname(shimFile), ...match[1].split(/[\\/]+/));
            if (/^node(\.exe)?$/i.test(path.basename(target))) continue;
            if (fs.existsSync(target)) return target;
        }
        return null;
    } catch {
        return null;
    }
}

/** Walk up from the file's folder to the filesystem root looking for a locally installed tool. */
function findLocalTool(name, fromDir, platform, execPath) {
    let dir = path.resolve(fromDir);
    for (;;) {
        const modulesDir = path.join(dir, 'node_modules');
        const entry = packageBinEntry(modulesDir, name);
        if (entry) return launchFile(entry, platform, execPath);
        const binDir = path.join(modulesDir, '.bin');
        if (platform === 'win32') {
            const shim = path.join(binDir, `${name}.cmd`);
            if (fs.existsSync(shim)) {
                const target = cmdShimTarget(shim);
                return target ? launchFile(target, platform, execPath) : { error: 'needs-shell', name: `${name}.cmd` };
            }
            const exe = path.join(binDir, `${name}.exe`);
            if (fs.existsSync(exe)) return { command: exe, prefix: [] };
        } else {
            const bin = path.join(binDir, name);
            if (fs.existsSync(bin)) return launchFile(fs.realpathSync(bin), platform, execPath);
        }
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/**
 * The argv to run for a lintFile template: { command, args, display } or { error, name? }.
 * Errors: 'shell-syntax', 'needs-shell', 'not-installed'. deps (tests): platform, execPath.
 */
function planLintCommand(template, file, { projectDir, platform = process.platform, execPath = process.execPath } = {}) {
    const words = tokenize(template);
    if (!words || !words.length) return { error: 'shell-syntax' };
    let rest = words;
    const runner = PACKAGE_RUNNERS.find(prefix => prefix.every((word, index) => rest[index] === word));
    if (runner) {
        rest = rest.slice(runner.length);
        while (rest.length && rest[0].startsWith('-')) rest = rest.slice(1);
    }
    const [name, ...tail] = rest;
    if (!name) return { error: 'shell-syntax' };
    const args = substituteFile(tail, file);
    let launch;
    if (name === 'node') launch = { command: execPath, prefix: [] };
    else if (/[\\/]/.test(name)) launch = launchFile(path.resolve(projectDir, name), platform, execPath);
    else launch = findLocalTool(name, path.dirname(file), platform, execPath) || (runner ? { error: 'not-installed', name } : { command: name, prefix: [] });
    if (launch.error) return launch;
    return { command: launch.command, args: [...launch.prefix, ...args], display: template };
}

// ─── run ─────────────────────────────────────────────────────────────────────────────────────

function killTree(child, platform) {
    if (!child.pid) return;
    if (platform === 'win32') {
        execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {});
        return;
    }
    try {
        process.kill(-child.pid, 'SIGKILL'); // the linter runs in its own process group
    } catch {
        try {
            child.kill('SIGKILL');
        } catch {
            /* already gone */
        }
    }
}

/**
 * Run the linter: { status: 'ok' | 'timeout' | 'overflow' | 'not-found' | 'failed', code, stdout, stderr }.
 * Bounded by timeoutMs plus a kill grace, and by MAX_OUTPUT_BYTES. If the host stops the hook process
 * first (SIGTERM/SIGINT), the linter tree is killed with it rather than left running.
 */
function runLinter(plan, { cwd, timeoutMs, env = process.env, platform = process.platform }) {
    return new Promise(resolve => {
        let child;
        try {
            child = spawn(plan.command, plan.args, {
                cwd,
                env,
                shell: false,
                windowsHide: true,
                detached: platform !== 'win32',
                stdio: ['ignore', 'pipe', 'pipe']
            });
        } catch (error) {
            resolve({ status: error && error.code === 'ENOENT' ? 'not-found' : 'failed', code: null, stdout: '', stderr: String(error && error.message) });
            return;
        }
        const out = [];
        const err = [];
        let size = 0;
        let settled = false;
        let stopped = null; // 'timeout' or 'failed' once this side killed the linter
        let graceTimer;
        // Kill the linter, then let the signal end this process as it would have (exit status kept).
        const onHostStop = signal => {
            killTree(child, platform);
            process.removeListener('SIGTERM', onHostStop);
            process.removeListener('SIGINT', onHostStop);
            process.kill(process.pid, signal);
        };
        process.once('SIGTERM', onHostStop);
        process.once('SIGINT', onHostStop);
        const finish = result => {
            if (settled) return;
            settled = true;
            process.removeListener('SIGTERM', onHostStop);
            process.removeListener('SIGINT', onHostStop);
            clearTimeout(timer);
            clearTimeout(graceTimer);
            resolve({ ...result, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
        };
        // Prefer the close event, so the result covers the whole child lifecycle; the grace timer
        // bounds a platform that never reports it.
        const stop = status => {
            if (stopped || settled) return;
            stopped = status;
            killTree(child, platform);
            graceTimer = setTimeout(() => finish({ status, code: null }), KILL_GRACE_MS);
        };
        const collect = (chunks, chunk) => {
            if (settled || stopped) return;
            size += chunk.length;
            if (size > MAX_OUTPUT_BYTES) stop('overflow');
            else chunks.push(chunk);
        };
        child.stdout.on('data', chunk => collect(out, chunk));
        child.stderr.on('data', chunk => collect(err, chunk));
        // Declared after the handlers that clear it: they only run on later events, never synchronously.
        const timer = setTimeout(() => stop('timeout'), timeoutMs);
        child.once('error', error => finish({ status: stopped || (error && error.code === 'ENOENT' ? 'not-found' : 'failed'), code: null }));
        child.once('close', code => finish(stopped ? { status: stopped, code: null } : { status: 'ok', code }));
    });
}

// ─── parse ───────────────────────────────────────────────────────────────────────────────────

function eslintJson(text, target, { cwd, platform }) {
    if (!text.startsWith('[')) return null;
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (!Array.isArray(data) || !data.every(entry => entry && typeof entry === 'object' && Array.isArray(entry.messages))) return null;
    const matching = data.filter(entry => typeof entry.filePath === 'string' && samePath(entry.filePath, target, cwd, platform));
    const results = matching.length || data.length !== 1 ? matching : data;
    return results.flatMap(entry =>
        entry.messages.map(message => ({
            line: message.line,
            column: message.column,
            severity: message.severity === 2 ? 'error' : 'warning',
            rule: message.ruleId || (message.fatal ? 'parse error' : ''),
            fatal: message.fatal === true,
            message: String(message.message || '')
        }))
    );
}

// `path:line[:column]: message`. The path is lazy, so `C:\x.js:3:1: m` keeps its drive letter.
const LINE_PATTERN = /^(.+?):(\d+)(?::(\d+))?:\s*(.+)$/;

/**
 * Lines that name the edited file. Lines that only look like `x:1:2: y` (a Ruff `--> a.py:1:8`
 * pointer, a summary, colour codes) do not make the output this format: with no line naming the file
 * it is unrecognized, and the caller decides from the exit code whether that means clean or unknown.
 */
function problemLines(text, target, { cwd, platform }) {
    const problems = [];
    for (const raw of text.split(/\r?\n/)) {
        const match = LINE_PATTERN.exec(raw.trim());
        if (!match || !samePath(match[1], target, cwd, platform)) continue;
        problems.push({ line: Number(match[2]), column: match[3] ? Number(match[3]) : undefined, severity: '', rule: '', message: match[4] });
    }
    return problems.length ? problems : null;
}

/** Output parsers, tried in order; each returns problems or null when the text is not its format. */
const OUTPUT_PARSERS = [
    { id: 'eslint-json', parse: eslintJson },
    { id: 'lines', parse: problemLines }
];

/** { format, problems } for the edited file, { format: 'empty' } for no output, or null (unknown format). */
function parseLintOutput(stdout, target, { cwd, platform = process.platform } = {}) {
    const text = String(stdout || '').trim();
    if (!text) return { format: 'empty', problems: [] };
    for (const parser of OUTPUT_PARSERS) {
        const problems = parser.parse(text, target, { cwd, platform });
        if (problems) return { format: parser.id, problems };
    }
    return null;
}

/**
 * Problems on changed lines (sorted, de-duplicated) and the count of the others. A fatal parse error
 * is always shown: an edit that breaks parsing is usually reported further down (often at the end of
 * the file), and a file that does not parse gets no other lint at all, so hiding it would read as clean.
 */
function filterToChanged(problems, changed) {
    const seen = new Set();
    const shown = [];
    let hidden = 0;
    for (const problem of problems) {
        if (!problem.fatal && !isChanged(problem.line, changed)) {
            hidden += 1;
            continue;
        }
        const key = `${problem.line}:${problem.column}:${problem.rule}:${problem.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        shown.push(problem);
    }
    shown.sort((a, b) => a.line - b.line || (a.column || 0) - (b.column || 0));
    return { shown, hidden };
}

// ─── messages ────────────────────────────────────────────────────────────────────────────────

function clip(text, max = MAX_MESSAGE_CHARS) {
    const flat = String(text).replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function displayPath(file, projectDir) {
    const rel = path.relative(projectDir, file);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : file;
}

/** The agent-facing report: what is new, where, why it matters and how to fix it. */
function formatReport({ shown, hidden, file, projectDir, command }) {
    const lines = shown.slice(0, MAX_SHOWN).map(problem => {
        const where = problem.column ? `${problem.line}:${problem.column}` : `${problem.line}`;
        const label = [problem.severity, problem.rule && `(${problem.rule})`].filter(Boolean).join(' ');
        return `- ${where}${label ? ` ${label}` : ''}: ${clip(problem.message)}`;
    });
    if (shown.length > MAX_SHOWN) lines.push(`- …and ${shown.length - MAX_SHOWN} more.`);
    const count = shown.length === 1 ? '1 new lint problem' : `${shown.length} new lint problems`;
    return [
        `${TAG} ${count} on lines you changed in ${displayPath(file, projectDir)} (checked with \`${clip(command, 160)}\`):`,
        ...lines,
        `Why: these lines differ from the last commit, so the problems came with this change, and now is the cheapest time to fix them.${
            hidden ? ` ${hidden} older problem${hidden === 1 ? '' : 's'} on unchanged lines ${hidden === 1 ? 'is' : 'are'} not shown.` : ''
        }`,
        'Fix: correct each one at its cause and keep the rule on; do not silence it with a disable comment, a suppression or a baseline entry.'
    ].join('\n');
}

const FIX_COMMAND =
    'run `/project-config` to set `testing.commands.lintFile` to a command that lints one file, with `{file}` where the path goes (for example `npx eslint --format json {file}`)';
const TURN_OFF = 'or turn `editTimeLint.enabled` off with `/framework-config`';

/** One-line notes for configuration problems the user can fix. Each says what, why and the fix. */
function noteFor(reason, detail = {}) {
    const command = detail.command ? `\`${clip(detail.command, 160)}\`` : 'the lintFile command';
    const notes = {
        'no-command': `edit-time lint is on, but \`testing.commands.lintFile\` is not set, so lint problems only surface at commit or in CI, after more code is built on them. Fix: ${FIX_COMMAND}, ${TURN_OFF}.`,
        'shell-syntax': `${command} uses shell syntax (a pipe, redirect, variable, parenthesis or unbalanced quote). Edit-time lint runs one program with literal arguments and no shell, so it behaves the same on Windows, macOS and Linux. Fix: make lintFile a single command such as \`npx eslint --format json {file}\`, ${TURN_OFF}.`,
        'needs-shell': `\`${detail.name}\` is a Windows script that cannot run without a shell, and edit-time lint never uses one. Fix: install the linter locally with npm, pnpm or yarn (its JavaScript entry then runs directly), or point lintFile at an executable.`,
        'not-installed': `\`${detail.name}\` is not installed in this project's node_modules, and edit-time lint never downloads a package during an edit. Fix: add it as a dev dependency, or point lintFile at an installed command.`,
        'not-found': `the program in ${command} was not found. Fix: install it or correct \`testing.commands.lintFile\`, ${TURN_OFF}.`,
        timeout: `${command} ran longer than ${detail.seconds} s and was stopped, so this edit was not linted. The whole post-edit hook must finish within about ${HOOK_BUDGET_MS / 1000} s, the shortest host hook limit, so lint gets at most \`editTimeLint.timeoutSeconds\` (at most ${MAX_TIMEOUT_SECONDS}) of what formatting leaves. Fix: make lintFile faster (one file, no type-aware rules, a warm cache), ${TURN_OFF}.`,
        'no-time': `formatting used the post-edit hook's time budget (about ${HOOK_BUDGET_MS / 1000} s, the shortest host hook limit), so ${command} did not run for this edit. Fix: make the formatter faster, ${TURN_OFF}.`,
        overflow: `${command} printed more than ${MAX_OUTPUT_BYTES / 1024 / 1024} MB for one file and was stopped, so this edit was not linted. Fix: make lintFile report one file in a compact format such as \`--format json\`, ${TURN_OFF}.`,
        failed: `${command} failed without lint output${detail.stderr ? ` (${clip(detail.stderr, 160)})` : ''}, so this edit was not linted. Fix: run the command on one file yourself and correct its configuration, ${TURN_OFF}.`,
        'unknown-format': `the output of ${command} is not a format edit-time lint can map to lines, so nothing is shown. Supported: ${SUPPORTED_FORMATS}. Fix: add the tool's JSON or line format flag (ESLint: \`--format json\`).`,
        'no-git': `git could not read this file's changes (it is not inside a git work tree, or git is unavailable), so edit-time lint cannot tell new problems from old ones and stays silent rather than flood the file. Fix: use it in a git repository with git on PATH, ${TURN_OFF}.`
    };
    return `${TAG} Skipped: ${notes[reason] || notes.failed} (Shown once per session.)`;
}

/** True the first time `reason` comes up in this session; a marker file records it. Fail-open: true. */
function firstTimeThisSession(markerDir, sessionId, reason) {
    try {
        fs.mkdirSync(markerDir, { recursive: true });
        const name = crypto
            .createHash('sha256')
            .update(`${sessionId || 'default'}\0${reason}`)
            .digest('hex')
            .slice(0, 24);
        fs.writeFileSync(path.join(markerDir, name), '', { flag: 'wx' });
        return true;
    } catch (error) {
        return !(error && error.code === 'EEXIST');
    }
}

// ─── orchestration ───────────────────────────────────────────────────────────────────────────

function isQuiet(projectDir, env, homeDir) {
    try {
        return require('./framework-runtime.cjs').resolveFrameworkMode({ rootDir: projectDir, env, homeDir }).mode === 'quiet';
    } catch {
        return false;
    }
}

/**
 * The context text for the agent, or '' to stay silent. Never throws.
 * options: file (absolute), projectDir, config (project config), sessionId, deadline (epoch ms the
 *          hook must finish by; default now + HOOK_BUDGET_MS), env, homeDir, platform, execPath,
 *          markerDir (defaults to <project>/tmp/claude-temp/edit-time-lint).
 */
async function runEditTimeLint(options) {
    try {
        const { file, projectDir, config, sessionId } = options;
        const env = options.env || process.env;
        const platform = options.platform || process.platform;
        const settings = resolveSettings({ projectDir, env, homeDir: options.homeDir });
        if (!settings.enabled || isQuiet(projectDir, env, options.homeDir)) return '';
        // Both sides canonical: a symlinked temp or home folder must not read as outside the project.
        const relative = path.relative(canonicalPath(projectDir, 'posix'), canonicalPath(file, 'posix'));
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return ''; // outside the project
        if (SKIP_PATTERNS.some(pattern => pattern.test(`/${relative}`))) return '';
        if (settings.fileExtensions.length && !settings.fileExtensions.includes(path.extname(file).toLowerCase())) return '';
        const markerDir = options.markerDir || path.join(projectDir, 'tmp', 'claude-temp', 'edit-time-lint');
        const note = (reason, detail) => (firstTimeThisSession(markerDir, sessionId, reason) ? noteFor(reason, detail) : '');

        const command = lintFileCommand(config);
        if (command.toLowerCase() === NOT_APPLICABLE) return '';
        if (!command) return note('no-command');

        const changed = changedLines(file, { env });
        if (changed.error === 'no-git') return note('no-git');
        if (changed.error) return '';
        if (!changed.all && !changed.edited) return ''; // unchanged since the last commit: nothing new to find

        const plan = planLintCommand(command, file, { projectDir, platform, execPath: options.execPath });
        if (plan.error) return note(plan.error, { command, name: plan.name });

        const deadline = Number.isFinite(options.deadline) ? options.deadline : Date.now() + HOOK_BUDGET_MS;
        const timeoutMs = Math.min(settings.timeoutMs, deadline - Date.now() - KILL_GRACE_MS);
        if (timeoutMs < MIN_LINT_MS) return note('no-time', { command });
        const run = await runLinter(plan, { cwd: projectDir, timeoutMs, env, platform });
        if (run.status === 'timeout') return note('timeout', { command, seconds: Math.round(timeoutMs / 100) / 10 });
        if (run.status !== 'ok') return note(run.status, { command, stderr: run.stderr });

        const parsed = parseLintOutput(run.stdout, file, { cwd: projectDir, platform });
        // Unrecognized output: exit 0 without naming the file is a clean summary ("All checks passed!");
        // a failing exit, or output that names the file (ESLint stylish warnings exit 0), cannot be read.
        if (!parsed) return run.code === 0 && !String(run.stdout).includes(path.basename(file)) ? '' : note('unknown-format', { command });
        if (parsed.format === 'empty' && run.code !== 0) return note('failed', { command, stderr: run.stderr });

        const { shown, hidden } = filterToChanged(parsed.problems, changed);
        return shown.length ? formatReport({ shown, hidden, file, projectDir, command }) : '';
    } catch {
        return '';
    }
}

module.exports = {
    SETTINGS_SECTION,
    ENV_SWITCH,
    COMMAND_KEY,
    DEFAULT_TIMEOUT_SECONDS,
    MAX_TIMEOUT_SECONDS,
    HOOK_BUDGET_MS,
    MAX_SHOWN,
    SUPPORTED_FORMATS,
    OUTPUT_PARSERS,
    LINE_PATTERN,
    resolveSettings,
    lintFileCommand,
    parseHunkRanges,
    changedLines,
    tokenize,
    planLintCommand,
    runLinter,
    parseLintOutput,
    filterToChanged,
    formatReport,
    noteFor,
    runEditTimeLint
};
