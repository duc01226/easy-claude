/**
 * Edit-time lint (lib/edit-time-lint.cjs, run by post-edit-prettier.cjs) — opt-in lint feedback that
 * reports only NEW problems on CHANGED lines, so a legacy file never floods the conversation.
 *
 * Coverage:
 *   ETL-001 off by default; env and checkout layers switch it; out-of-range timeout uses the default
 *   ETL-002 hunk headers → changed-line ranges; a pure deletion adds no line
 *   ETL-003 changed-line filter: only changed lines shown, the rest counted; line 0 never shown
 *   ETL-004 ESLint JSON: matched by canonical path (symlinked folder), severity and rule kept
 *   ETL-005 line format, Windows drive path kept whole; unknown format → null; empty → no problems
 *   ETL-006 command → literal argv: shell syntax refused, {file} substituted or appended,
 *           local npx tool runs under this Node, a missing npx tool is never downloaded
 *   ETL-007 Windows seam: a .cmd shim resolves to its JavaScript target; an opaque shim or a
 *           .cmd file needs a shell and is refused (no shell is ever used)
 *   ETL-008 time budget: a linter that hangs (with a child of its own) is stopped tree-wide in budget
 *   ETL-009 a program that does not exist reports not-found
 *   ETL-010 hook: a legacy file in a subfolder — only the new problem on the changed line is listed,
 *           with why and fix; older problems are counted, never listed
 *   ETL-011 hook: off by default — no output even with lintFile configured
 *   ETL-012 hook: enabled without lintFile → one note per session, naming the fix
 *   ETL-013 hook: unknown output format → note naming the supported formats
 *   ETL-014 hook: a hanging linter is stopped within the configured budget and the note says so
 *   ETL-015 hook: an untracked new file counts every line as new
 *   ETL-016 hook: an unchanged tracked file never runs the linter
 *   ETL-017 hook: outside a git work tree → one note, no lint run
 *   ETL-018 hook: quiet runtime mode and lintFile "none" stay silent
 *   ETL-019 hook: path:line:column output with project-relative paths maps to changed lines
 *   ETL-020 hook: a linter that fails without output → note carrying its error text
 *   ETL-021 a parse error is shown even when the linter places it on an unchanged line
 *   ETL-022 a real npm .cmd shim (Node path quoted first) resolves to the tool's script
 *   ETL-023 hook: unreadable output — clean on exit 0, a note on a non-zero exit (Ruff pointer lines)
 *   ETL-024 lint never runs past the hook deadline, oversized output is stopped, files outside
 *           the project are ignored, and the report lists at most MAX_SHOWN problems
 *   ETL-025 POSIX: when the host stops the hook process, the running linter dies with it
 *   ETL-026 hook: the formatter runs first, so reported lines match the formatted file
 *   ETL-027 hook: fileExtensions and vendored folders skip lint; staged changes and a repository
 *           with no commit count as changed
 *   ETL-028 hook: an edit that only deletes lines is still linted, so the parse error it causes shows
 *
 * Portability: every hook run uses its own fixture project (`makeHookTreeProject`: a copy of the hook
 * tree), its own git repository, a temp HOME and a cleaned environment (`childEnv`); fake linters are
 * Node scripts, so nothing depends on a real linter being installed. Windows-only behavior (.cmd shims)
 * is exercised through the `platform` seam on every OS; process-tree kill is checked on the host OS.
 * Tests that need git skip when git is missing.
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runHook, childEnv, makeHookTreeProject, removeTempDir } = require('../lib/hook-runner.cjs');
const { assertEqual, assertDeepEqual, assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');

const LIB = require('../../lib/edit-time-lint.cjs');

const GIT_SKIP = (() => {
    try {
        execFileSync('git', ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] });
        return false;
    } catch {
        return 'git is not available on this host';
    }
})();

const HOOK_TIMEOUT_MS = 45000;

function tempDir(prefix) {
    return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), `edit-time-lint-${prefix}-`)));
}

function write(root, rel, text) {
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
}

/** A clean child environment: temp HOME, no framework or git redirection variables. */
function cleanEnv(root, extra = {}) {
    const overrides = {
        HOME: root,
        USERPROFILE: root,
        NODE_OPTIONS: undefined,
        GIT_DIR: undefined,
        GIT_WORK_TREE: undefined,
        GIT_INDEX_FILE: undefined,
        // No developer or system git config (hooks, diff drivers, colour) reaches the fixture.
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: path.join(root, '.gitconfig-test')
    };
    for (const key of Object.keys(process.env)) {
        if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, ...extra });
}

// Fake linters. Each reports one problem per line that contains BAD and logs that it ran.
const FAKE_ESLINT = `const fs = require('fs');
const file = process.argv[2];
fs.appendFileSync(require('path').join(__dirname, 'runs.log'), file + '\\n');
const messages = [];
fs.readFileSync(file, 'utf8').split(/\\r?\\n/).forEach((text, i) => {
    const at = text.indexOf('BAD');
    if (at >= 0) messages.push({ ruleId: 'no-bad', severity: 2, message: 'BAD is not allowed here.', line: i + 1, column: at + 1 });
});
process.stdout.write(JSON.stringify([{ filePath: file, messages, suppressedMessages: [] }]));
process.exitCode = messages.length ? 1 : 0;
`;
const FAKE_LINES = `const fs = require('fs');
const path = require('path');
const file = process.argv[2];
const rel = path.relative(process.cwd(), file);
fs.readFileSync(file, 'utf8').split(/\\r?\\n/).forEach((text, i) => {
    const at = text.indexOf('BAD');
    if (at >= 0) process.stdout.write(rel + ':' + (i + 1) + ':' + (at + 1) + ': E100 BAD is not allowed here\\n');
});
`;
const FAKE_STYLISH = `process.stdout.write(process.argv[2] + '\\n  3:1  error  BAD is not allowed  no-bad\\n\\n1 problem\\n');\nprocess.exitCode = 1;\n`;
const FAKE_HANG = `const fs = require('fs');
fs.appendFileSync(require('path').join(__dirname, 'runs.log'), 'hang\\n');
setTimeout(() => {}, 120000);
`;
const FAKE_CRASH = `process.stderr.write('Config error: cannot read lint config\\n');\nprocess.exitCode = 2;\n`;
// Ruff's full format: the location line starts with `-->`, so it names no file the parser accepts.
const FAKE_POINTER = `const rel = require('path').relative(process.cwd(), process.argv[2]);\nprocess.stdout.write('F401 [*] os imported but unused\\n --> ' + rel + ':5:8\\n\\nFound 1 error.\\n');\nprocess.exitCode = 1;\n`;
// ESLint's default stylish format: names the file, warnings only, exit 0.
const FAKE_STYLISH_WARN = `process.stdout.write(process.argv[2] + '\\n  2:1  warning  Unexpected console statement  no-console\\n\\n1 problem\\n');\n`;
// Reports a parse error at the last line once the line `const b = 2;` is gone.
const FAKE_FATAL = `const fs = require('fs');\nconst file = process.argv[2];\nconst lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);\nconst messages = lines.some(text => text === 'const b = 2;') ? [] : [{ ruleId: null, fatal: true, severity: 2, message: 'Parsing error: Unexpected token', line: lines.length, column: 1 }];\nprocess.stdout.write(JSON.stringify([{ filePath: file, messages }]));\nprocess.exitCode = messages.length ? 1 : 0;\n`;
const FAKE_CLEAN_SUMMARY = `process.stdout.write('All checks passed!\\n');\n`;
// A formatter that adds a two-line header, shifting every line down by two.
const FAKE_FORMAT = `const fs = require('fs');\nconst file = process.argv[2];\nconst text = fs.readFileSync(file, 'utf8');\nif (!text.startsWith('// header')) fs.writeFileSync(file, '// header\\n// header\\n' + text);\n`;

/**
 * A fixture project: a copy of the hook tree, a git repository with `src/lib/legacy.js` committed
 * (two old BAD lines), fake linters in `tools/`, and a project config. Formatting is off so no
 * formatter runs.
 */
function makeProject(options = {}) {
    // `'lintFile' in options`: an explicit undefined means "not configured", not "use the default".
    const lintFile = 'lintFile' in options ? options.lintFile : 'node tools/fake-eslint.cjs {file}';
    const editTimeLint = 'editTimeLint' in options ? options.editTimeLint : { enabled: true };
    const git = options.git !== false;
    const commit = options.commit !== false;
    const root = makeHookTreeProject('edit-time-lint');
    const formatting = options.formatCommand ? { command: options.formatCommand } : { formatter: 'none' };
    const config = { project: { name: 'Edit-time lint fixture' }, formatting, testing: { commands: {} } };
    if (lintFile !== undefined) config.testing.commands.lintFile = lintFile;
    if (editTimeLint) config.editTimeLint = editTimeLint;
    write(root, 'docs/project-config.json', JSON.stringify(config, null, 2));
    write(root, 'tools/fake-eslint.cjs', FAKE_ESLINT);
    write(root, 'tools/fake-lines.cjs', FAKE_LINES);
    write(root, 'tools/fake-stylish.cjs', FAKE_STYLISH);
    write(root, 'tools/fake-hang.cjs', FAKE_HANG);
    write(root, 'tools/fake-crash.cjs', FAKE_CRASH);
    write(root, 'tools/fake-pointer.cjs', FAKE_POINTER);
    write(root, 'tools/fake-clean-summary.cjs', FAKE_CLEAN_SUMMARY);
    write(root, 'tools/fake-stylish-warn.cjs', FAKE_STYLISH_WARN);
    write(root, 'tools/fake-fatal.cjs', FAKE_FATAL);
    write(root, 'tools/fake-format.cjs', FAKE_FORMAT);
    write(root, '.gitignore', '.claude/\ntmp/\ntools/runs.log\n');
    const legacy = write(
        root,
        'src/lib/legacy.js',
        ['const a = 1; // BAD old', 'const b = 2;', 'const c = 3; // BAD old', 'module.exports = { a, b, c };', ''].join('\n')
    );
    if (git) {
        const g = args => execFileSync('git', args, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], env: cleanEnv(root) });
        g(['init', '-q']);
        g(['config', 'user.email', 'test@test.local']);
        g(['config', 'user.name', 'edit-time-lint-test']);
        g(['config', 'commit.gpgsign', 'false']);
        g(['add', '-A']);
        if (commit) g(['commit', '-q', '-m', 'fixture']);
    }
    return { root, legacy };
}

function runs(root) {
    try {
        return fs
            .readFileSync(path.join(root, 'tools', 'runs.log'), 'utf8')
            .split('\n')
            .filter(Boolean);
    } catch {
        return [];
    }
}

async function editHook(root, file, { sessionId = 'session-a', env = {} } = {}) {
    const input = { hook_event_name: 'PostToolUse', session_id: sessionId, tool_name: 'Edit', tool_input: { file_path: file } };
    const result = await runHook(path.join(root, '.claude', 'hooks', 'post-edit-prettier.cjs'), input, {
        cwd: root,
        env: cleanEnv(root, { CLAUDE_PROJECT_DIR: root, ...env }),
        timeout: HOOK_TIMEOUT_MS
    });
    assertEqual(result.code, 0, `post-edit hook must exit 0 (fail-open); stderr: ${result.stderr}`);
    const text = result.stdout.trim();
    if (!text) return '';
    const parsed = JSON.parse(text);
    assertEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse', 'context must be PostToolUse additionalContext');
    return parsed.hookSpecificOutput.additionalContext;
}

async function withProject(options, callback) {
    const project = makeProject(options);
    try {
        return await callback(project);
    } finally {
        removeTempDir(project.root);
    }
}

function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function waitFor(predicate, ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
        if (predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    return predicate();
}

const tests = [
    {
        name: '[ETL-001] off by default; env and checkout layers switch it; out-of-range timeout uses the default',
        fn: () => {
            const root = tempDir('settings');
            try {
                const home = path.join(root, 'home');
                fs.mkdirSync(home);
                const resolve = env => LIB.resolveSettings({ projectDir: root, env, homeDir: home });
                assertEqual(resolve({}).enabled, false, 'no layer → off');
                assertEqual(resolve({ CK_EDIT_TIME_LINT: '1' }).enabled, true, 'env on → on');
                write(root, '.claude/.ck.local.json', JSON.stringify({ editTimeLint: { enabled: true, timeoutSeconds: 99, fileExtensions: ['.JS'] } }));
                const local = resolve({});
                assertEqual(local.enabled, true, 'checkout layer on → on');
                assertEqual(local.timeoutMs, LIB.DEFAULT_TIMEOUT_SECONDS * 1000, 'out-of-range timeout → default');
                assertDeepEqual(local.fileExtensions, ['.js'], 'extensions are lower-cased');
                assertEqual(resolve({ CK_EDIT_TIME_LINT: 'off' }).enabled, false, 'env off beats every file layer');
                write(root, '.claude/.ck.local.json', JSON.stringify({ editTimeLint: { enabled: true, timeoutSeconds: 3 } }));
                assertEqual(resolve({}).timeoutMs, 3000, 'in-range timeout is used');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-002] hunk headers become changed-line ranges; a pure deletion adds no line',
        fn: () => {
            const diff = ['diff --git a/x b/x', '@@ -3,0 +4,2 @@ ctx', '+a', '+b', '@@ -10 +12 @@', '-x', '+y', '@@ -20,2 +21,0 @@', '-gone', '-gone'].join(
                '\n'
            );
            assertDeepEqual(LIB.parseHunkRanges(diff), [
                [4, 5],
                [12, 12]
            ]);
        }
    },
    {
        name: '[ETL-003] only problems on changed lines are shown; the others are counted; line 0 is never shown',
        fn: () => {
            const problems = [
                { line: 9, column: 2, rule: 'r', message: 'later' },
                { line: 2, column: 1, rule: 'r', message: 'old' },
                { line: 4, column: 7, rule: 'r', message: 'new' },
                { line: 4, column: 7, rule: 'r', message: 'new' },
                { line: 0, rule: '', message: 'file ignored' }
            ];
            const ranged = LIB.filterToChanged(problems, { ranges: [[4, 9]] });
            assertDeepEqual(
                ranged.shown.map(p => p.line),
                [4, 9],
                'changed lines only, sorted, duplicates dropped'
            );
            assertEqual(ranged.hidden, 2, 'the old problem and the line-0 notice are counted, not shown');
            const all = LIB.filterToChanged(problems, { all: true });
            assertDeepEqual(
                all.shown.map(p => p.line),
                [2, 4, 9],
                'a new file shows every real line'
            );
        }
    },
    {
        name: '[ETL-004] ESLint JSON maps to the edited file by canonical path, keeping severity and rule',
        fn: () => {
            const root = tempDir('eslint-json');
            try {
                const real = path.join(root, 'real');
                fs.mkdirSync(real);
                const file = write(root, 'real/a.js', 'x\n');
                let target = file;
                try {
                    fs.symlinkSync(real, path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
                    target = path.join(root, 'link', 'a.js'); // the edit names the linked path, the linter the real one
                } catch {
                    /* no symlink support: the real path still exercises the match */
                }
                const output = JSON.stringify([
                    { filePath: path.join(root, 'other.js'), messages: [{ line: 1, column: 1, severity: 2, ruleId: 'x', message: 'other file' }] },
                    {
                        filePath: file,
                        messages: [
                            { line: 3, column: 5, severity: 1, ruleId: 'eqeqeq', message: 'Use ===' },
                            { line: 1, column: 1, severity: 2, ruleId: null, fatal: true, message: 'Parsing error' }
                        ],
                        suppressedMessages: [{ line: 2, column: 1, severity: 2, ruleId: 'old', message: 'baselined' }]
                    }
                ]);
                const parsed = LIB.parseLintOutput(output, target, { cwd: root });
                assertEqual(parsed.format, 'eslint-json');
                assertDeepEqual(
                    parsed.problems.map(p => [p.line, p.severity, p.rule]),
                    [
                        [3, 'warning', 'eqeqeq'],
                        [1, 'error', 'parse error']
                    ],
                    'only the edited file; ESLint-suppressed problems stay out'
                );
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-005] line format keeps a Windows drive path whole; unknown format is null; empty output is no problems',
        fn: () => {
            const match = LIB.LINE_PATTERN.exec('C:\\proj\\src\\a.js:12:3: E501 line too long');
            assertDeepEqual([match[1], match[2], match[3], match[4]], ['C:\\proj\\src\\a.js', '12', '3', 'E501 line too long']);
            const root = tempDir('lines');
            try {
                const file = write(root, 'src/a.py', 'x\n');
                const parsed = LIB.parseLintOutput('src/a.py:4: W1 trailing\nsrc/b.py:1:1: E1 elsewhere\n', file, { cwd: root });
                assertEqual(parsed.format, 'lines');
                assertDeepEqual(
                    parsed.problems.map(p => [p.line, p.column, p.message]),
                    [[4, undefined, 'W1 trailing']]
                );
                assertEqual(
                    LIB.parseLintOutput(`${file}\n  3:1  error  BAD  no-bad\n`, file, { cwd: root }),
                    null,
                    'ESLint stylish output is not a supported format'
                );
                assertEqual(LIB.parseLintOutput('[{"not":"eslint"}]', file, { cwd: root }), null, 'JSON of another shape is not ESLint JSON');
                assertDeepEqual(LIB.parseLintOutput('  \n', file, { cwd: root }), { format: 'empty', problems: [] });
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-006] the command becomes a literal argv: shell syntax refused, {file} placed, local tools only',
        fn: () => {
            const root = tempDir('argv');
            try {
                const file = write(root, 'src/a.js', 'x\n');
                const execPath = '/node';
                for (const template of ['eslint {file} | tee out', 'eslint $FILE', 'eslint "{file}', 'eslint {file} > out', 'eslint {file} && echo', '']) {
                    assertEqual(LIB.planLintCommand(template, file, { projectDir: root, execPath }).error, 'shell-syntax', `refused: ${template}`);
                }
                write(root, 'node_modules/fakelint/package.json', JSON.stringify({ name: 'fakelint', bin: { fakelint: 'bin/cli.js' } }));
                const entry = write(root, 'node_modules/fakelint/bin/cli.js', '#!/usr/bin/env node\n');
                const npx = LIB.planLintCommand('npx --no-install fakelint "--rule=a b" --file={file} -f json', file, { projectDir: root, execPath });
                assertEqual(npx.command, execPath, 'a local JavaScript bin runs under this Node');
                assertDeepEqual(npx.args, [entry, '--rule=a b', `--file=${file}`, '-f', 'json'], 'quotes group, {file} substituted in place');
                const appended = LIB.planLintCommand('pnpm exec fakelint', file, { projectDir: root, execPath });
                assertDeepEqual(appended.args, [entry, file], 'no {file} → the path is the last argument');
                assertEqual(LIB.planLintCommand('npx eslint {file}', file, { projectDir: root, execPath }).error, 'not-installed', 'npx never downloads');
                const node = LIB.planLintCommand('node tools/lint.cjs {file}', file, { projectDir: root, execPath });
                assertDeepEqual([node.command, ...node.args], [execPath, 'tools/lint.cjs', file]);
                const bare = LIB.planLintCommand('ruff check {file}', file, { projectDir: root, execPath });
                assertDeepEqual([bare.command, ...bare.args], ['ruff', 'check', file], 'a non-npm tool is looked up on PATH, no shell');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-007] Windows seam: a .cmd shim resolves to its JavaScript target; otherwise a shell would be needed and it is refused',
        fn: () => {
            const root = tempDir('win');
            try {
                const file = write(root, 'src/a.js', 'x\n');
                const target = write(root, 'node_modules/@scope/tool/dist/cli.js', 'module.exports = 1;\n');
                write(root, 'node_modules/.bin/tool.cmd', '@ECHO off\r\nSET dp0=%~dp0\r\n"%_prog%"  "%dp0%\\..\\@scope\\tool\\dist\\cli.js" %*\r\n');
                const plan = LIB.planLintCommand('npx tool {file}', file, { projectDir: root, platform: 'win32', execPath: 'node.exe' });
                assertDeepEqual([plan.command, ...plan.args], ['node.exe', target, file], 'the shim target runs under Node, no cmd.exe');
                write(root, 'node_modules/.bin/opaque.cmd', '@ECHO off\r\nopaque-native %*\r\n');
                const opaque = LIB.planLintCommand('opaque {file}', file, { projectDir: root, platform: 'win32', execPath: 'node.exe' });
                assertDeepEqual([opaque.error, opaque.name], ['needs-shell', 'opaque.cmd']);
                write(root, 'scripts/lint.cmd', '@echo off\r\n');
                assertEqual(
                    LIB.planLintCommand('scripts/lint.cmd {file}', file, { projectDir: root, platform: 'win32', execPath: 'node.exe' }).error,
                    'needs-shell'
                );
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-008] a hanging linter and its child are stopped tree-wide within the time budget',
        fn: async () => {
            const root = tempDir('timeout');
            try {
                const pidFile = path.join(root, 'grandchild.pid');
                const script = write(
                    root,
                    'hang.cjs',
                    `const { spawn } = require('child_process');
const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore' });
require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
setTimeout(() => {}, 120000);
`
                );
                const started = Date.now();
                const result = await LIB.runLinter({ command: process.execPath, args: [script] }, { cwd: root, timeoutMs: 1500 });
                const elapsed = Date.now() - started;
                assertEqual(result.status, 'timeout');
                assertTrue(elapsed < 1500 + 2000 + 2500, `stopped within budget plus kill grace (took ${elapsed} ms)`);
                const grandchild = Number(fs.readFileSync(pidFile, 'utf8'));
                assertTrue(await waitFor(() => !isAlive(grandchild), 5000), 'the linter child process is killed too');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-009] a program that does not exist reports not-found',
        fn: async () => {
            const result = await LIB.runLinter({ command: 'edit-time-lint-no-such-program-xyz', args: [] }, { cwd: os.tmpdir(), timeoutMs: 5000 });
            assertEqual(result.status, 'not-found');
        }
    },
    {
        name: '[ETL-010] hook: a legacy file in a subfolder lists only the new problem on the changed line, with why and fix',
        skip: GIT_SKIP,
        fn: () =>
            withProject({}, async ({ root, legacy }) => {
                fs.writeFileSync(
                    legacy,
                    fs.readFileSync(legacy, 'utf8').replace('const b = 2;', () => 'const b = 2; // BAD new')
                );
                const context = await editHook(root, legacy);
                assertContains(context, '1 new lint problem on lines you changed in src/lib/legacy.js', 'names the count and the file');
                assertContains(context, '- 2:17 error (no-bad): BAD is not allowed here.', 'names the line, column, rule and message');
                assertNotContains(context, '- 1:', 'the committed problem on line 1 is not listed');
                assertNotContains(context, '- 3:', 'the committed problem on line 3 is not listed');
                assertContains(context, '2 older problems on unchanged lines are not shown', 'old problems are counted');
                assertContains(context, 'Why: these lines differ from the last commit', 'says why it matters');
                assertContains(context, 'do not silence it with a disable comment, a suppression or a baseline entry', 'names the fix');
                assertContains(context, 'node tools/fake-eslint.cjs {file}', 'names the command');
            })
    },
    {
        name: '[ETL-011] hook: off by default — no output even with lintFile configured',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ editTimeLint: null }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                assertEqual(await editHook(root, legacy), '', 'no context');
                assertEqual(runs(root).length, 0, 'the linter never runs');
            })
    },
    {
        name: '[ETL-012] hook: enabled without lintFile → one note per session that names the fix',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: undefined }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                const first = await editHook(root, legacy, { sessionId: 's1' });
                assertContains(first, 'testing.commands.lintFile` is not set');
                assertContains(first, 'Fix: run `/project-config` to set `testing.commands.lintFile`');
                assertContains(first, 'Shown once per session');
                assertEqual(await editHook(root, legacy, { sessionId: 's1' }), '', 'the same session is not told twice');
                assertContains(await editHook(root, legacy, { sessionId: 's2' }), 'is not set', 'a new session is told again');
            })
    },
    {
        name: '[ETL-013] hook: unknown output format → note naming the supported formats',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: 'node tools/fake-stylish.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                const context = await editHook(root, legacy);
                assertContains(context, 'is not a format edit-time lint can map to lines');
                assertContains(context, LIB.SUPPORTED_FORMATS);
            })
    },
    {
        name: '[ETL-014] hook: a hanging linter is stopped within the configured budget and the note says so',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: 'node tools/fake-hang.cjs {file}', editTimeLint: { enabled: true, timeoutSeconds: 1 } }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4;\n');
                const started = Date.now();
                const context = await editHook(root, legacy);
                const elapsed = Date.now() - started;
                assertContains(context, 'ran longer than 1 s and was stopped');
                assertContains(context, 'editTimeLint.timeoutSeconds');
                assertTrue(elapsed < 15000, `the hook returns within its budget (took ${elapsed} ms)`);
                assertDeepEqual(runs(root), ['hang'], 'the linter was started once');
            })
    },
    {
        name: '[ETL-015] hook: an untracked new file counts every line as new',
        skip: GIT_SKIP,
        fn: () =>
            withProject({}, async ({ root }) => {
                const file = write(root, 'src/fresh/new.js', 'const x = 1; // BAD\nconst y = 2;\nconst z = 3; // BAD\n');
                const context = await editHook(root, file);
                assertContains(context, '2 new lint problems on lines you changed in src/fresh/new.js');
                assertContains(context, '- 1:17 error (no-bad)');
                assertContains(context, '- 3:17 error (no-bad)');
            })
    },
    {
        name: '[ETL-016] hook: an unchanged tracked file never runs the linter',
        skip: GIT_SKIP,
        fn: () =>
            withProject({}, async ({ root, legacy }) => {
                assertEqual(await editHook(root, legacy), '');
                assertEqual(runs(root).length, 0, 'nothing changed, so nothing is linted');
            })
    },
    {
        name: '[ETL-017] hook: outside a git work tree → one note and no lint run',
        fn: () =>
            withProject({ git: false }, async ({ root, legacy }) => {
                const env = { GIT_CEILING_DIRECTORIES: path.dirname(root) };
                const context = await editHook(root, legacy, { env });
                assertContains(context, 'not inside a git work tree');
                assertContains(context, 'stays silent rather than flood the file');
                assertEqual(runs(root).length, 0, 'the linter does not run when changed lines are unknown');
            })
    },
    {
        name: '[ETL-018] hook: quiet runtime mode and lintFile "none" stay silent',
        skip: GIT_SKIP,
        fn: async () => {
            await withProject({}, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                assertEqual(await editHook(root, legacy, { env: { CK_FRAMEWORK_MODE: 'quiet' } }), '', 'quiet injects no hook context');
                assertEqual(runs(root).length, 0);
            });
            await withProject({ lintFile: 'none' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                assertEqual(await editHook(root, legacy), '', '"none" means not applicable: no note');
            });
        }
    },
    {
        name: '[ETL-019] hook: path:line:column output with project-relative paths maps to changed lines',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: 'node tools/fake-lines.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                const context = await editHook(root, legacy);
                assertContains(context, '1 new lint problem');
                assertContains(context, '- 5:17: E100 BAD is not allowed here');
                assertContains(context, '2 older problems on unchanged lines are not shown');
            })
    },
    {
        name: '[ETL-020] hook: a linter that fails without output → note carrying its error text',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: 'node tools/fake-crash.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4;\n');
                const context = await editHook(root, legacy);
                assertContains(context, 'failed without lint output (Config error: cannot read lint config)');
                assertContains(context, 'run the command on one file yourself');
            })
    },
    {
        name: '[ETL-021] a parse error is shown even when the linter places it on an unchanged line',
        fn: () => {
            const problems = [
                { line: 40, column: 1, rule: 'parse error', fatal: true, message: 'Unexpected end of input' },
                { line: 41, column: 1, rule: 'r', message: 'old' }
            ];
            const { shown, hidden } = LIB.filterToChanged(problems, { ranges: [[3, 3]] });
            assertDeepEqual(
                shown.map(p => p.message),
                ['Unexpected end of input'],
                'a file that no longer parses must not read as clean'
            );
            assertEqual(hidden, 1);
            const root = tempDir('fatal');
            try {
                const file = write(root, 'a.js', 'x\n');
                const output = JSON.stringify([
                    { filePath: file, messages: [{ line: 40, column: 1, severity: 2, ruleId: null, fatal: true, message: 'Parsing error' }] }
                ]);
                assertEqual(LIB.parseLintOutput(output, file, { cwd: root }).problems[0].fatal, true, 'ESLint fatal flag is kept');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-022] a real npm .cmd shim (Node path quoted first) resolves to the tool script',
        fn: () => {
            const root = tempDir('npm-shim');
            try {
                const file = write(root, 'src/a.js', 'x\n');
                const target = write(root, 'node_modules/@biomejs/biome/bin/biome', '#!/usr/bin/env node\n');
                // The template npm's cmd-shim writes: the optional Node next to the shim is quoted first.
                const shim = [
                    '@ECHO off',
                    'GOTO start',
                    ':find_dp0',
                    'SET dp0=%~dp0',
                    'EXIT /b',
                    ':start',
                    'SETLOCAL',
                    'CALL :find_dp0',
                    '',
                    'IF EXIST "%dp0%\\node.exe" (',
                    '  SET "_prog=%dp0%\\node.exe"',
                    ') ELSE (',
                    '  SET "_prog=node"',
                    '  SET PATHEXT=%PATHEXT:;.JS;=;%',
                    ')',
                    '',
                    'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\..\\@biomejs\\biome\\bin\\biome" %*',
                    ''
                ].join('\r\n');
                write(root, 'node_modules/.bin/biome.cmd', shim);
                const plan = LIB.planLintCommand('npx biome lint {file}', file, { projectDir: root, platform: 'win32', execPath: 'node.exe' });
                assertDeepEqual([plan.command, ...plan.args], ['node.exe', target, 'lint', file], 'node.exe is skipped; the bin script runs under Node');
                // The template pnpm writes: %~dp0, with the optional Node quoted first again.
                const pnpmTarget = write(root, 'node_modules/.pnpm/eslint@9.0.0/node_modules/eslint/bin/eslint.js', '');
                const pnpmShim = [
                    '@SETLOCAL',
                    '@IF EXIST "%~dp0\\node.exe" (',
                    '  "%~dp0\\node.exe"  "%~dp0\\..\\.pnpm\\eslint@9.0.0\\node_modules\\eslint\\bin\\eslint.js" %*',
                    ') ELSE (',
                    '  @SET PATHEXT=%PATHEXT:;.JS;=;%',
                    '  node  "%~dp0\\..\\.pnpm\\eslint@9.0.0\\node_modules\\eslint\\bin\\eslint.js" %*',
                    ')',
                    ''
                ].join('\r\n');
                write(root, 'node_modules/.bin/pnpmlint.cmd', pnpmShim);
                const pnpm = LIB.planLintCommand('pnpm exec pnpmlint {file}', file, { projectDir: root, platform: 'win32', execPath: 'node.exe' });
                assertDeepEqual([pnpm.command, ...pnpm.args], ['node.exe', pnpmTarget, file], 'a pnpm shim resolves the same way');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-023] hook: unreadable output is clean on exit 0 and a note on a non-zero exit (Ruff pointer lines)',
        skip: GIT_SKIP,
        fn: async () => {
            await withProject({ lintFile: 'node tools/fake-pointer.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4;\n');
                assertContains(
                    await editHook(root, legacy),
                    'is not a format edit-time lint can map to lines',
                    'a failing run that cannot be read is never silent'
                );
            });
            await withProject({ lintFile: 'node tools/fake-clean-summary.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4;\n');
                assertEqual(await editHook(root, legacy), '', 'a clean run with a summary line is silent');
            });
            await withProject({ lintFile: 'node tools/fake-stylish-warn.cjs {file}' }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4;\n');
                assertContains(
                    await editHook(root, legacy),
                    'is not a format edit-time lint can map to lines',
                    'exit 0 output that names the file is not read as clean'
                );
            });
        }
    },
    {
        name: '[ETL-024] lint respects the hook deadline, stops oversized output, ignores files outside the project and caps the report',
        skip: GIT_SKIP,
        fn: async () => {
            await withProject({}, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                const base = {
                    projectDir: root,
                    config: { testing: { commands: { lintFile: 'node tools/fake-eslint.cjs {file}' } } },
                    env: cleanEnv(root),
                    homeDir: root,
                    markerDir: path.join(root, 'tmp', 'markers')
                };
                const late = await LIB.runEditTimeLint({ ...base, file: legacy, sessionId: 'late', deadline: Date.now() });
                assertContains(late, "formatting used the post-edit hook's time budget", 'no time left → a note, not a late lint');
                assertEqual(runs(root).length, 0, 'the linter never starts past the deadline');
                const outside = write(tempDir('outside'), 'b.js', 'const x = 1; // BAD\n');
                try {
                    assertEqual(await LIB.runEditTimeLint({ ...base, file: outside, sessionId: 'out' }), '', 'a file outside the project is not linted');
                } finally {
                    removeTempDir(path.dirname(outside));
                }
            });
            const root = tempDir('overflow');
            try {
                const script = write(root, 'loud.cjs', "const chunk = 'x'.repeat(1024 * 1024); for (let i = 0; i < 6; i++) process.stdout.write(chunk);\n");
                const result = await LIB.runLinter({ command: process.execPath, args: [script] }, { cwd: root, timeoutMs: 10000 });
                assertEqual(result.status, 'overflow', 'more than the output cap stops the linter');
                assertContains(LIB.noteFor('overflow', { command: 'lint {file}' }), 'printed more than 4 MB');
            } finally {
                removeTempDir(root);
            }
            const many = Array.from({ length: LIB.MAX_SHOWN + 5 }, (_, i) => ({ line: i + 1, column: 1, severity: 'error', rule: 'r', message: 'm' }));
            const report = LIB.formatReport({ shown: many, hidden: 0, file: path.join(os.tmpdir(), 'a.js'), projectDir: os.tmpdir(), command: 'lint {file}' });
            assertEqual(
                report.split('\n').filter(line => line.startsWith('- ') && !line.startsWith('- …')).length,
                LIB.MAX_SHOWN,
                'at most MAX_SHOWN problems are listed'
            );
            assertContains(report, '- …and 5 more.');
        }
    },
    {
        name: '[ETL-025] POSIX: when the host stops the hook process, the running linter dies with it',
        skip: process.platform === 'win32' ? 'Windows terminates a process without running signal handlers' : false,
        fn: async () => {
            const root = tempDir('host-stop');
            try {
                const pidFile = path.join(root, 'linter.pid');
                const hang = write(
                    root,
                    'hang.cjs',
                    `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetTimeout(() => {}, 120000);\n`
                );
                const driver = write(
                    root,
                    'driver.cjs',
                    `require(${JSON.stringify(require.resolve('../../lib/edit-time-lint.cjs'))}).runLinter({ command: process.execPath, args: [${JSON.stringify(hang)}] }, { cwd: ${JSON.stringify(root)}, timeoutMs: 60000 });\n`
                );
                const host = require('node:child_process').spawn(process.execPath, [driver], { stdio: 'ignore' });
                assertTrue(await waitFor(() => fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').length > 0, 10000), 'the linter started');
                const linter = Number(fs.readFileSync(pidFile, 'utf8'));
                const exited = new Promise(resolve => host.once('exit', (code, signal) => resolve({ code, signal })));
                host.kill('SIGTERM'); // what the OpenCode bridge does at its 20-second limit
                assertTrue(await waitFor(() => !isAlive(linter), 5000), 'the linter is killed with the hook, not orphaned');
                assertDeepEqual(await exited, { code: null, signal: 'SIGTERM' }, 'the hook still ends by the signal, not a swallowed exit 0');
            } finally {
                removeTempDir(root);
            }
        }
    },
    {
        name: '[ETL-026] hook: the formatter runs first, so reported lines match the formatted file',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ formatCommand: 'node tools/fake-format.cjs {file}' }, async ({ root, legacy }) => {
                fs.writeFileSync(
                    legacy,
                    fs.readFileSync(legacy, 'utf8').replace('const b = 2;', () => 'const b = 2; // BAD new')
                );
                const context = await editHook(root, legacy);
                assertTrue(fs.readFileSync(legacy, 'utf8').startsWith('// header'), 'the formatter ran');
                assertContains(context, '- 4:17 error (no-bad)', 'the new problem is reported at its line after formatting (2 + 2)');
                assertContains(context, '2 older problems on unchanged lines are not shown', 'the committed problems moved but are still old');
            })
    },
    {
        name: '[ETL-027] hook: fileExtensions and vendored folders skip lint; staged changes and a repository with no commit count as changed',
        skip: GIT_SKIP,
        fn: async () => {
            await withProject({ editTimeLint: { enabled: true, fileExtensions: ['.ts'] } }, async ({ root, legacy }) => {
                fs.appendFileSync(legacy, 'const d = 4; // BAD new\n');
                assertEqual(await editHook(root, legacy), '', 'a .js file is not in fileExtensions');
                assertEqual(runs(root).length, 0);
            });
            await withProject({}, async ({ root, legacy }) => {
                const vendored = write(root, 'node_modules/pkg/index.js', 'const x = 1; // BAD\n');
                assertEqual(await editHook(root, vendored), '', 'node_modules is never linted per edit');
                fs.appendFileSync(legacy, 'const d = 4; // BAD staged\n');
                execFileSync('git', ['add', 'src/lib/legacy.js'], { cwd: root, stdio: 'pipe', env: cleanEnv(root) });
                assertContains(await editHook(root, legacy), '- 5:17 error (no-bad)', 'a staged change still differs from the last commit');
            });
            await withProject({ commit: false }, async ({ root, legacy }) => {
                assertContains(await editHook(root, legacy), '2 new lint problems', 'with no commit yet, every line is new');
            });
        }
    },
    {
        name: '[ETL-028] hook: an edit that only deletes lines is still linted, so the parse error it causes shows',
        skip: GIT_SKIP,
        fn: () =>
            withProject({ lintFile: 'node tools/fake-fatal.cjs {file}' }, async ({ root, legacy }) => {
                fs.writeFileSync(
                    legacy,
                    fs.readFileSync(legacy, 'utf8').replace('const b = 2;\n', () => '')
                );
                const context = await editHook(root, legacy);
                assertContains(context, 'error (parse error): Parsing error: Unexpected token', 'the parse error on an unchanged line is shown');
            })
    }
];

module.exports = {
    name: 'Edit-time lint',
    tests
};
