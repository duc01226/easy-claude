'use strict';

/**
 * Workflow route modes (ask | auto | off) — end to end.
 *
 * The route hook is the ONLY carrier of the workflow route, in the mode each person chose. These tests
 * run the REAL hook as a child process (and the real Codex launcher command) inside a temp fixture project
 * with its own HOME, so a mode switch that stops working fails here — a check of the source text alone
 * would keep passing. Intents protected:
 * - Each mode delivers its own text: `ask` asks the workflow question, `auto` starts without asking,
 *   `off` delivers a one-line state with no gate and no catalog (BR-WFR-06, BR-WFR-08).
 * - Precedence, later wins: default `ask` < project config < ~/.claude/.ck.json < .claude/.ck.local.json
 *   < env CK_WORKFLOW_ROUTE_MODE < this session's prompt directive (BR-WFR-10).
 * - No project config, a config without the key, and an invalid or corrupt value in ANY source all end at
 *   `ask`; the hook never throws or blocks (BR-WFR-10).
 * - A prompt directive applies at once, persists for the session, re-delivers even after the catalog was
 *   delivered, and never fires on prose (BR-WFR-11).
 * - A personal setting never reaches tracked output and is never written to a tracked file (BR-WFR-05).
 *
 * Portable Test Contract: fixture projects and homes are temp dirs; inherited CK_* switches and debug keys
 * are blanked; HOME, USERPROFILE, TMPDIR, TEMP and TMP point at the fixture.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertTrue, assertEqual, assertContains, assertNotContains } = require('../lib/assertions.cjs');
const { childEnv, makeHookTreeProject, removeTempDir, runCodexLauncher } = require('../lib/hook-runner.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const CLAUDE_DIR = path.join(PROJECT_DIR, '.claude');
const routing = require(path.join(CLAUDE_DIR, 'scripts', 'lib', 'workflow-routing-config.cjs'));
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');
const FRAMEWORK_REPO_SKIP = frameworkRepoGuard.isFrameworkRepo(PROJECT_DIR) ? false : 'asserts the framework repo files only';
const CODEX_HOOKS_SKIP = fs.existsSync(path.join(PROJECT_DIR, '.codex', 'hooks.json')) ? false : 'no .codex/hooks.json in this project';
const GIT_AVAILABLE = (() => {
    try {
        return spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
    } catch {
        return false;
    }
})();

const PAYLOAD_CAP = 9500;
const CATALOG_HEADING = '## Workflow & Skills Catalog';
const ASK_QUESTION = '**Workflow question** (every tier)';
const AUTO_START = '**Workflow start** (mode auto)';
const SWITCHES = { CK_SKILL_AUTO_TRIGGER: undefined, CK_WORKFLOW_ROUTE_MODE: undefined, CK_SESSION_ID: undefined, CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined, NODE_OPTIONS: undefined };

/**
 * A fixture project holding the real hook tree, the routing libraries, the workflow registry, the gate
 * file and the mode CLI, plus a separate HOME and temp dir. `run` spawns the real hook; `cli` spawns the CLI.
 */
function makeProject() {
    const root = makeHookTreeProject('route-modes');
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'route-modes-home-'));
    const home = path.join(scratch, 'home');
    const tmp = path.join(scratch, 'tmp');
    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(tmp, { recursive: true });
    fs.cpSync(path.join(CLAUDE_DIR, 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(CLAUDE_DIR, 'scripts', 'workflow-mode.cjs'), path.join(root, '.claude', 'scripts', 'workflow-mode.cjs'));
    fs.copyFileSync(path.join(CLAUDE_DIR, 'workflows.json'), path.join(root, '.claude', 'workflows.json'));
    fs.mkdirSync(path.join(root, '.claude', 'skills', 'shared'), { recursive: true });
    fs.copyFileSync(
        path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'),
        path.join(root, '.claude', 'skills', 'shared', 'workflow-first-gate.md')
    );
    const env = extra => childEnv({
        ...SWITCHES, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home, TMPDIR: tmp, TEMP: tmp, TMP: tmp, ...extra
    });
    const project = {
        root,
        home,
        userFile: path.join(home, '.claude', '.ck.json'),
        localFile: path.join(root, '.claude', '.ck.local.json'),
        teamFile: path.join(root, 'docs', 'project-config.json'),
        env,
        write(file, value) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
        },
        run(session, prompt, extraEnv = {}) {
            const result = spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', 'workflow-route-inject.cjs')], {
                cwd: root,
                input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: session, cwd: root, prompt }),
                env: env(extraEnv), encoding: 'utf8', windowsHide: true, timeout: 30000
            });
            return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
        },
        cli(args, extraEnv = {}) {
            const result = spawnSync(process.execPath, [path.join(root, '.claude', 'scripts', 'workflow-mode.cjs'), ...args], {
                cwd: root, env: env(extraEnv), encoding: 'utf8', windowsHide: true, timeout: 30000
            });
            return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
        },
        cleanup() {
            removeTempDir(root);
            removeTempDir(scratch);
        }
    };
    return project;
}

async function withProject(fn) {
    const project = makeProject();
    try {
        return await fn(project);
    } finally {
        project.cleanup();
    }
}

const modeOf = out => (out.match(/^Route mode: (ask|auto|off) \(([^)]*?)(?: — [^)]*)?\)/m) || []).slice(1, 3);
const cfg = mode => ({ portability: { workflowRouteMode: mode } });
let sessionCounter = 0;
const newSession = () => `route-modes-${process.pid}-${++sessionCounter}`;

module.exports = {
    name: 'workflow-route-modes',
    tests: [
        {
            // Intent: the default mode asks; a person who never configures anything keeps today's behavior.
            name: '[workflow-route-modes] TC-WFR-014 mode ask (the default) delivers the gate, the workflow question and the catalog once per session',
            fn: () => withProject(p => {
                // Given a project with no configuration at all
                const session = newSession();
                // When the first prompt arrives
                const first = p.run(session, 'fix the flaky login test');
                // Then the hook exits cleanly with the ask-mode route
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'ask|default');
                assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->');
                assertContains(first.out, ASK_QUESTION);
                assertContains(first.out, '(c) execute directly, no workflow or skill');
                assertContains(first.out, CATALOG_HEADING);
                assertNotContains(first.out, AUTO_START, 'mode ask must not carry the auto-start text');
                assertNotContains(first.out, 'CK:GATE-MODE', 'no fence line may reach the model');
                // And the second prompt of the session stays silent
                assertEqual(p.run(session, 'and one more thing').out, '', 'delivered once per session');
                // And a new session receives it again
                assertContains(p.run(newSession(), 'hello').out, ASK_QUESTION);
            })
        },
        {
            // Intent: `auto` removes the question for this person: a matched workflow starts by its tier.
            name: '[workflow-route-modes] TC-WFR-014 mode auto delivers the auto-start gate and never the workflow question',
            fn: () => withProject(p => {
                // Given the person sets auto in the environment
                // When the first prompt arrives
                const first = p.run(newSession(), 'add a retry to the fetcher', { CK_WORKFLOW_ROUTE_MODE: 'auto' });
                // Then the route says start without asking, by tier, and keeps the mid-session and explicit-request rules
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'auto|env CK_WORKFLOW_ROUTE_MODE');
                assertContains(first.out, AUTO_START);
                assertContains(first.out, '`manual` never starts on your own');
                assertContains(first.out, 'Mid-session: never auto-activate a workflow.');
                assertContains(first.out, 'An explicit request (as above; `$workflow-*` on Codex) runs any tier with no question');
                assertContains(first.out, CATALOG_HEADING);
                assertNotContains(first.out, '**Workflow question**', 'mode auto must not ask the workflow question');
                assertNotContains(first.out, 'before you start a catalog workflow, in every tier', 'the tier legend must not say every tier asks');
                assertNotContains(first.out, 'NEVER starts before the answer', 'mode auto must not forbid a matched workflow from starting');
                assertContains(first.out, '**Activation (mode auto):**');
                // And a manual workflow is still named in the route declaration, in both the gate and the tier legend
                assertContains(first.out, '`manual` never starts on your own: name it in your route declaration and take (b) or (c)');
                assertContains(first.out, '`manual` never starts on your own: name it in your route declaration; it runs on explicit request only');
            })
        },
        {
            // Intent: `off` is a state line only; the big catalog is not spent and nothing self-starts.
            name: '[workflow-route-modes] TC-WFR-014 mode off delivers a short state with no gate and no catalog, once per session, keeping explicit requests',
            fn: () => withProject(p => {
                const session = newSession();
                // Given the person sets off in the environment
                const first = p.run(session, '/workflow-bugfix fix the login crash', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                // Then only the off state arrives: no gate, no catalog, well under the ask payload
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'off|env CK_WORKFLOW_ROUTE_MODE');
                assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertNotContains(first.out, CATALOG_HEADING, 'off must not deliver the catalog');
                assertNotContains(first.out, '<!-- CK:WORKFLOW-GATE -->', 'off must not deliver the gate');
                assertNotContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', 'off must not deliver the route block');
                assertTrue(first.out.length < 1500, `off state is ${first.out.length} chars`);
                // And it tells the assistant: no self-start, explicit requests still run, every quality gate binds
                assertContains(first.out, 'Do not choose or start a workflow yourself');
                assertContains(first.out, 'only when the user explicitly asks for one');
                assertContains(first.out, '`/start-workflow <id>`');
                assertContains(first.out, 'Every quality gate');
                // And it never lets a workflow start by itself, yet does not skip a step that only offers one to the user
                assertContains(first.out, 'not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow');
                assertContains(first.out, 'A step that only offers a workflow to the user as an option stays as written');
                assertContains(first.out, 'or the one skill the user names');
                assertNotContains(first.out, 'no skill you chose for routing');
                // And it is delivered once per session
                assertEqual(p.run(session, 'next', { CK_WORKFLOW_ROUTE_MODE: 'off' }).out, '', 'off state delivered once per session');
            })
        },
        {
            // Intent: every payload fits the host's 10,000-character hook-output cap with margin.
            name: '[workflow-route-modes] TC-WFR-014 every mode stays under the host output cap',
            fn: () => withProject(p => {
                for (const mode of ['ask', 'auto', 'off']) {
                    const out = p.run(newSession(), 'hello', { CK_WORKFLOW_ROUTE_MODE: mode }).out;
                    assertTrue(out.length > 0 && out.length <= PAYLOAD_CAP, `mode ${mode}: ${out.length} chars, cap ${PAYLOAD_CAP}`);
                }
            })
        },
        {
            // Intent: the hook must fire on the Codex host through its own launcher, honouring the same env.
            name: '[workflow-route-modes] TC-WFR-018 the real Codex launcher command runs the same hook and honours the mode',
            skip: CODEX_HOOKS_SKIP,
            fn: () => withProject(p => {
                for (const [mode, expected] of [['auto', AUTO_START], ['ask', ASK_QUESTION]]) {
                    const result = runCodexLauncher('workflow-route-inject.cjs',
                        JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'hello' }),
                        { cwd: p.root, env: { ...SWITCHES, CLAUDE_PROJECT_DIR: p.root, HOME: p.home, USERPROFILE: p.home, CK_WORKFLOW_ROUTE_MODE: mode } });
                    assertEqual(result.code, 0, result.stderr);
                    assertContains(result.stdout, `Route mode: ${mode} (env CK_WORKFLOW_ROUTE_MODE)`);
                    assertContains(result.stdout, expected);
                }
                const off = runCodexLauncher('workflow-route-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'hello' }),
                    { cwd: p.root, env: { ...SWITCHES, CLAUDE_PROJECT_DIR: p.root, HOME: p.home, USERPROFILE: p.home, CK_WORKFLOW_ROUTE_MODE: 'off' } });
                assertContains(off.stdout, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertNotContains(off.stdout, CATALOG_HEADING);
            })
        },
        {
            // Intent: Claude, Codex and the OpenCode bridge each run this one hook; losing a registration silently
            // drops the route (and every personal mode) on that host.
            name: '[workflow-route-modes] TC-WFR-018 the route hook is registered for UserPromptSubmit on Claude, Codex and OpenCode',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf8'));
                const commands = (settings.hooks.UserPromptSubmit || []).flatMap(group => (group.hooks || []).map(h => h.command || ''));
                assertTrue(commands.some(c => c.includes('.claude/hooks/workflow-route-inject.cjs')), 'settings.json must register the hook for UserPromptSubmit');
                const codexFile = path.join(PROJECT_DIR, '.codex', 'hooks.json');
                if (fs.existsSync(codexFile)) {
                    const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
                    const codexCommands = (codex.hooks.UserPromptSubmit || []).flatMap(group => (group.hooks || []).map(h => h.command || ''));
                    assertTrue(codexCommands.some(c => c.includes('.claude/hooks/workflow-route-inject.cjs')), '.codex/hooks.json must register the hook');
                }
                const bridge = path.join(PROJECT_DIR, '.opencode', 'plugins', 'easy-claude-hooks.js');
                if (fs.existsSync(bridge)) {
                    assertContains(fs.readFileSync(bridge, 'utf8'), 'workflow-route-inject.cjs', 'the OpenCode bridge must carry the hook');
                }
            }
        },
        {
            // Intent: each source beats the ones below it, and the state line names the winner.
            name: '[workflow-route-modes] TC-WFR-015 precedence: project config < user file < checkout file < env < prompt directive',
            fn: () => withProject(p => {
                const at = (prompt, env) => modeOf(p.run(newSession(), prompt, env).out).join('|');
                // Given only the team project config
                p.write(p.teamFile, cfg('auto'));
                assertEqual(at('hi'), 'auto|project config');
                // When the person's every-project file disagrees, it wins over the team
                p.write(p.userFile, cfg('off'));
                assertEqual(at('hi'), 'off|~/.claude/.ck.json');
                // When this checkout's git-ignored file disagrees, it wins over the user file
                p.write(p.localFile, cfg('ask'));
                assertEqual(at('hi'), 'ask|.claude/.ck.local.json');
                // When the environment disagrees, it wins over every file
                assertEqual(at('hi', { CK_WORKFLOW_ROUTE_MODE: 'auto' }), 'auto|env CK_WORKFLOW_ROUTE_MODE');
                // When the prompt carries a directive, it wins over the environment
                assertEqual(at('workflow-mode: off', { CK_WORKFLOW_ROUTE_MODE: 'auto' }), 'off|set by your prompt this session');
            })
        },
        {
            // Intent: a person with no setting anywhere keeps `ask`, and the CLI reports source `default`.
            name: '[workflow-route-modes] TC-WFR-015 no project config at all, or a config without the key, falls back to ask (default)',
            fn: () => withProject(p => {
                // Given no docs/project-config.json at all
                assertTrue(!fs.existsSync(p.teamFile));
                assertEqual(modeOf(p.run(newSession(), 'hi').out).join('|'), 'ask|default');
                let shown = p.cli(['--show']);
                assertEqual(shown.code, 0, shown.err);
                assertContains(shown.out, 'Route mode: ask (default)');
                // And a project config that exists but has no workflow-mode setting
                p.write(p.teamFile, { project: { name: 'fixture' }, portability: { inlinePathRules: true } });
                assertEqual(modeOf(p.run(newSession(), 'hi').out).join('|'), 'ask|default');
                shown = p.cli([]);
                assertContains(shown.out, 'Route mode: ask (default)');
                assertEqual(JSON.parse(p.cli(['--json']).out).source, 'default');
            })
        },
        {
            // Intent: no bad value, in any source, can change the mode, throw or block the hook; the next source decides.
            name: '[workflow-route-modes] TC-WFR-015 an invalid or corrupt value in any source is ignored, the next source decides, and the hook never fails',
            fn: () => withProject(p => {
                const at = (env) => {
                    const result = p.run(newSession(), 'hi', env);
                    assertEqual(result.code, 0, `the hook must exit 0: ${result.err}`);
                    return modeOf(result.out).join('|');
                };
                const bad = ['banana', '', 42, true, ['auto']];
                // Env: an unknown value falls through to the layer below (project config auto), then to ask when there is none
                p.write(p.teamFile, cfg('auto'));
                for (const value of ['banana', 'sometimes', '   ', 'auto off']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: value }), 'auto|project config', `env ${JSON.stringify(value)}`);
                fs.rmSync(p.teamFile);
                for (const value of ['banana', '   ']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: value }), 'ask|default', `env ${JSON.stringify(value)} alone`);
                // Files: every bad value in every personal file falls through to the team value, then to ask
                for (const [label, file] of [['user file', p.userFile], ['checkout file', p.localFile]]) {
                    for (const value of bad) {
                        p.write(file, { portability: { workflowRouteMode: value } });
                        assertEqual(at(), 'ask|default', `${label} value ${JSON.stringify(value)}`);
                    }
                    for (const text of ['{bad json', '', '[]', '"off"']) {
                        p.write(file, text);
                        assertEqual(at(), 'ask|default', `${label} content ${JSON.stringify(text)}`);
                    }
                    fs.rmSync(file);
                }
                // Project config: invalid or malformed content is ignored too
                for (const value of bad) {
                    p.write(p.teamFile, cfg(value));
                    assertEqual(at(), 'ask|default', `project config value ${JSON.stringify(value)}`);
                }
                p.write(p.teamFile, '{nope');
                assertEqual(at(), 'ask|default', 'malformed project config');
                // A corrupt higher layer never hides a valid lower one
                p.write(p.teamFile, cfg('off'));
                p.write(p.userFile, '{bad');
                p.write(p.localFile, cfg('banana'));
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: 'banana' }), 'off|project config', 'corrupt personal layers fall through to the project config');
            })
        },
        {
            // Intent: a file saved by a Windows editor (BOM, UTF-16) or an env value typed with quotes in cmd.exe
            // must not be silently ignored — that is how a person's setting "did not work".
            name: '[workflow-route-modes] TC-WFR-015 a file saved with a BOM or as UTF-16, and a quoted env value, still count',
            fn: () => withProject(p => {
                const body = JSON.stringify(cfg('off'));
                const at = (env) => modeOf(p.run(newSession(), 'hi', env).out).join('|');
                p.write(p.localFile, `\uFEFF${body}`);
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-8 with a byte-order mark');
                p.write(p.localFile, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, 'utf16le')]));
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-16 little-endian');
                p.write(p.localFile, Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(body, 'utf16le').swap16()]));
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-16 big-endian');
                fs.rmSync(p.localFile);
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: '"auto"' }), 'auto|env CK_WORKFLOW_ROUTE_MODE', 'quoted env value');
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: ' OFF ' }), 'off|env CK_WORKFLOW_ROUTE_MODE', 'padded upper-case env value');
                for (const alias of ['0', 'false', 'no', 'disabled']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: alias }), 'off|env CK_WORKFLOW_ROUTE_MODE', `env alias ${alias}`);
            })
        },
        {
            // Intent: existing boolean settings keep working, and the named mode wins inside one file.
            name: '[workflow-route-modes] TC-WFR-015 the legacy workflowAutoDetect boolean reads as off or ask and workflowRouteMode wins in one file',
            fn: () => withProject(p => {
                const resolve = (extra = {}) => routing.resolveWorkflowRouteMode({ rootDir: p.root, env: {}, homeDir: p.home, ...extra });
                p.write(p.teamFile, { portability: { workflowAutoDetect: false } });
                assertEqual(resolve().mode, 'off');
                p.write(p.teamFile, { portability: { workflowAutoDetect: false, workflowRouteMode: 'auto' } });
                assertEqual(resolve().mode, 'auto', 'workflowRouteMode wins over the legacy boolean in the same file');
                p.write(p.teamFile, { portability: { workflowRouteMode: 'off' } });
                p.write(p.localFile, { portability: { workflowAutoDetect: true } });
                assertEqual(resolve().mode, 'ask', 'a personal true re-enables routing over a team off');
                assertEqual(routing.readWorkflowRouteMode({}), 'ask');
                assertEqual(routing.readWorkflowRouteMode({ portability: { workflowRouteMode: 'AUTO' } }), 'auto', 'mode names are case-insensitive');
            })
        },
        {
            // Intent: tracked generators read the team layer only, so a personal setting never reaches shared files.
            name: '[workflow-route-modes] TC-WFR-017 the team scope ignores every personal source',
            fn: () => withProject(p => {
                p.write(p.teamFile, cfg('ask'));
                p.write(p.userFile, cfg('off'));
                p.write(p.localFile, cfg('off'));
                const team = routing.resolveWorkflowRouteMode({
                    rootDir: p.root, scope: routing.SCOPE_TEAM, env: { CK_WORKFLOW_ROUTE_MODE: 'off' }, homeDir: p.home, sessionMode: 'off'
                });
                assertEqual(team.mode, 'ask');
                assertEqual(team.source, routing.SOURCE_PROJECT_CONFIG);
                const effective = routing.resolveWorkflowRouteMode({ rootDir: p.root, env: {}, homeDir: p.home });
                assertEqual(effective.mode, 'off');
                assertEqual(effective.overriddenPersonally, true);
                // And both schemas accept exactly the three mode names
                const { CK_SCHEMA, validateCkConfig, WORKFLOW_ROUTE_MODES: ckModes } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { validateConfig, WORKFLOW_ROUTE_MODES: projectModes } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'project-config-schema.cjs'));
                assertEqual(JSON.stringify(ckModes), JSON.stringify(routing.ROUTE_MODES));
                assertEqual(JSON.stringify(projectModes), JSON.stringify(routing.ROUTE_MODES));
                assertTrue(CK_SCHEMA.portability.properties.workflowRouteMode.type === 'string');
                assertTrue(validateCkConfig({ portability: { workflowRouteMode: 'banana' } }).errors.some(e => e.includes('workflowRouteMode')), 'the .ck.json validator names the bad key');
                assertTrue(!validateConfig({ project: { name: 'x' }, portability: { workflowRouteMode: 'auto' } }).errors.some(e => e.includes('workflowRouteMode')));
                assertTrue(validateConfig({ project: { name: 'x' }, portability: { workflowRouteMode: 'banana' } }).errors.some(e => e.includes('workflowRouteMode')), 'the project-config validator names the bad key');
            })
        },
        {
            // Intent: the personal file is outside the repository, and the checkout file is git-ignored, so a setting
            // cannot be committed by accident.
            name: '[workflow-route-modes] TC-WFR-017 the user file lives under the home directory, outside any checkout',
            fn: () => withProject(p => {
                const userPath = routing.resolveUserConfigPath(p.home);
                assertEqual(userPath, path.join(p.home, '.claude', '.ck.json'));
                const relative = path.relative(p.root, userPath);
                assertTrue(relative.startsWith('..') && !path.isAbsolute(relative), 'the user file is not inside the project');
                assertEqual(routing.resolveUserConfigPath(''), null, 'no home directory, no user file');
                assertTrue(typeof routing.resolveUserConfigPath() === 'string', 'the default home is os.homedir()');
            })
        },
        {
            // Intent: a directive in the prompt applies at once, lasts the session, and a new session returns to the configured mode.
            name: '[workflow-route-modes] TC-WFR-016 a first-line directive applies to this prompt and the rest of the session only',
            fn: () => withProject(p => {
                p.write(p.userFile, cfg('ask'));
                const session = newSession();
                // When the first line is a directive, the new mode applies immediately, and the reply line is added
                const first = p.run(session, 'workflow-mode: off\nfix the login bug');
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'off|set by your prompt this session');
                assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertContains(first.out, 'Route mode directive applied: off for this session');
                assertContains(first.out, 'not a task');
                assertNotContains(first.out, CATALOG_HEADING);
                // Then the next prompt needs no directive: the session keeps the mode, and nothing is repeated
                assertEqual(p.run(session, 'and the signup bug too').out, '', 'the session keeps off without a second delivery');
                // And a switch mid-session re-delivers the new route even though a route was delivered already
                const auto = p.run(session, '/workflow-mode auto');
                assertEqual(modeOf(auto.out).join('|'), 'auto|set by your prompt this session');
                assertContains(auto.out, AUTO_START);
                assertContains(auto.out, "the first task after your directive counts as the session's first task");
                assertEqual(p.run(session, 'next task').out, '', 'and the session keeps auto');
                // And the Codex spelling works
                assertEqual(modeOf(p.run(newSession(), '$workflow-mode ask').out).join('|'), 'ask|set by your prompt this session');
                // And a NEW session falls back to the configured mode; nothing was written
                assertEqual(modeOf(p.run(newSession(), 'hello').out).join('|'), 'ask|~/.claude/.ck.json');
                assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'ask', 'a session directive writes no file');
            })
        },
        {
            // Intent (BR-WFR-11): a failed session save never promises later-prompt scope; explicit personal
            // saving remains independent and later prompts resolve their actual recorded/configured preferences.
            name: '[workflow-route-modes] TC-WFR-016 failed session persistence is reported and later prompts use recorded or configured preferences',
            fn: async () => {
                for (const save of [false, true]) {
                    await withProject(p => {
                        // Given a configured ask preference and a regular file where the session store's tmp
                        // directory belongs (Windows/macOS/Linux, no permission or timeout assumption).
                        p.write(p.userFile, cfg('ask'));
                        const before = fs.readFileSync(p.userFile, 'utf8');
                        const blocked = path.join(p.root, 'tmp');
                        p.write(blocked, 'not a folder');
                        const session = newSession();
                        // When a directive arrives, with and without an explicit independent personal save.
                        const first = p.run(session, `workflow-mode: off${save ? ' save' : ''}\nfix the login bug`);
                        // Then the current prompt gets off, but its reply never claims the session was saved.
                        assertEqual(first.code, 0, first.err);
                        assertEqual(modeOf(first.out)[0], 'off');
                        assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                        assertContains(first.out, 'Route mode directive applied: off for this prompt; session preference NOT saved');
                        assertContains(first.out, 'Later prompts use the recorded/configured mode');
                        assertNotContains(first.out, 'Route mode directive applied: off for this session');
                        if (save) {
                            assertContains(first.out, `; saved to ${p.userFile}`);
                            assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'off');
                        } else {
                            assertEqual(fs.readFileSync(p.userFile, 'utf8'), before, 'without save, personal preferences stay unchanged');
                        }
                        // And the next ordinary prompt in the SAME session uses actual preferences. A personal
                        // save may decide off; without it the original ask preference still decides.
                        const later = p.run(session, 'and the signup bug too');
                        assertEqual(later.code, 0, later.err);
                        assertEqual(modeOf(later.out).join('|'), `${save ? 'off' : 'ask'}|~/.claude/.ck.json`);
                        assertNotContains(later.out, 'Route mode directive applied:', 'a plain prompt is not a directive');
                        assertEqual(fs.readFileSync(blocked, 'utf8'), 'not a folder', 'the blocking fixture file is untouched');
                    });
                }
            }
        },
        {
            // Intent: repeating the directive for a mode already delivered still gets its reply line.
            name: '[workflow-route-modes] TC-WFR-016 repeating the same directive only acknowledges it',
            fn: () => withProject(p => {
                const session = newSession();
                p.run(session, 'workflow-mode: off');
                const again = p.run(session, 'workflow-mode: off');
                assertEqual(again.code, 0, again.err);
                assertContains(again.out, 'Route mode directive applied: off for this session');
                assertNotContains(again.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', 'the off state is not delivered twice');
            })
        },
        {
            // Intent: only an explicit first-line directive counts; prose that mentions the words never changes the mode.
            name: '[workflow-route-modes] TC-WFR-016 prose, a later line, a code fence and trailing words are not a directive',
            fn: () => withProject(p => {
                const notDirectives = [
                    'please explain workflow-mode: off in the docs',
                    'hello\nworkflow-mode: off',
                    '```\nworkflow-mode: off\n```',
                    'workflow-mode: off please',
                    'workflow-mode: banana',
                    'workflow-mode:',
                    '/workflow-mode',
                    '/workflow-mode --show',
                    'the /workflow-mode auto command',
                    '> workflow-mode: off',
                    'workflow-mode off'
                ];
                for (const prompt of notDirectives) {
                    assertEqual(routing.parseRouteModeDirective(prompt), null, `parse ${JSON.stringify(prompt)}`);
                }
                for (const prompt of notDirectives.slice(0, 4)) {
                    assertEqual(modeOf(p.run(newSession(), prompt).out).join('|'), 'ask|default', `hook ${JSON.stringify(prompt)}`);
                }
                const directives = [
                    ['workflow-mode: auto', 'auto', false], ['Workflow-Mode:OFF', 'off', false], ['/workflow-mode ask', 'ask', false],
                    ['$workflow-mode auto', 'auto', false], ['  \n workflow-mode: off \nmore', 'off', false],
                    ['workflow-mode: auto save', 'auto', true], ['/workflow-mode off --save', 'off', true]
                ];
                for (const [prompt, mode, save] of directives) {
                    const parsed = routing.parseRouteModeDirective(prompt);
                    assertTrue(Boolean(parsed) && parsed.mode === mode && parsed.save === save, `parse ${JSON.stringify(prompt)} -> ${JSON.stringify(parsed)}`);
                }
            })
        },
        {
            // Intent: `save` persists for the person (user file, outside any repo), keeping their other keys, and never
            // overwrites a file it cannot read.
            name: '[workflow-route-modes] TC-WFR-016 a directive with save writes the user file, keeps its other keys and refuses a corrupt file',
            fn: () => withProject(p => {
                p.write(p.userFile, { locale: { responseLanguage: 'fr' }, portability: { docsIndexPath: 'keep/me.md' } });
                const first = p.run(newSession(), 'workflow-mode: auto save');
                assertEqual(first.code, 0, first.err);
                assertContains(first.out, `; saved to ${p.userFile}`);
                const saved = JSON.parse(fs.readFileSync(p.userFile, 'utf8'));
                assertEqual(saved.portability.workflowRouteMode, 'auto');
                assertEqual(saved.portability.docsIndexPath, 'keep/me.md', 'other keys survive');
                assertEqual(saved.locale.responseLanguage, 'fr', 'other sections survive');
                // And a new session reads it from the user file
                assertEqual(modeOf(p.run(newSession(), 'hello').out).join('|'), 'auto|~/.claude/.ck.json');
                // And a corrupt user file is reported, never overwritten
                p.write(p.userFile, '{corrupt');
                const refused = p.run(newSession(), 'workflow-mode: off save');
                assertContains(refused.out, 'NOT saved (unreadable-config)');
                assertEqual(fs.readFileSync(p.userFile, 'utf8'), '{corrupt', 'a corrupt file is left untouched');
                assertEqual(modeOf(refused.out).join('|'), 'off|set by your prompt this session', 'the session still gets the mode');
                // And valid JSON that is not an object (a list, a string) is refused the same way
                for (const text of ['[]', '"off"', '42']) {
                    p.write(p.userFile, text);
                    const notObject = p.run(newSession(), 'workflow-mode: auto save');
                    assertContains(notObject.out, 'NOT saved (unreadable-config)', `file content ${text}`);
                    assertEqual(fs.readFileSync(p.userFile, 'utf8'), text, `file content ${text} is left untouched`);
                }
            })
        },
        {
            // Intent: the skill's CLI shows the winning source, persists to the user file, and refuses a checkout file that
            // git does not ignore (it could be committed).
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI shows the source, saves to the user file and refuses an un-ignored checkout file',
            fn: () => withProject(p => {
                // Given a user file that sets auto
                let out = p.cli(['auto', '--save']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertContains(out.out, `Saved: ${p.userFile}`);
                assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'auto');
                // When the environment overrides it, the CLI says which source still wins
                out = p.cli(['off', '--save'], { CK_WORKFLOW_ROUTE_MODE: 'ask' });
                assertContains(out.out, 'Route mode: ask (env CK_WORKFLOW_ROUTE_MODE)');
                assertContains(out.out, 'a higher-precedence source');
                // And a mode without --save writes nothing and says how to set a session mode
                fs.rmSync(p.userFile);
                out = p.cli(['auto']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Nothing written');
                assertTrue(!fs.existsSync(p.userFile));
                // And --local is refused here: the fixture is not a git checkout that ignores the file
                out = p.cli(['auto', '--save', '--local']);
                assertEqual(out.code, 1);
                assertContains(out.err, 'not git-ignored');
                assertTrue(!fs.existsSync(p.localFile), 'nothing was written to the checkout file');
                // And an unknown argument is a usage error
                assertEqual(p.cli(['sometimes']).code, 1);
            })
        },
        {
            // Intent: `--show` reports the mode in force — the session's prompt directive included — and names the winning
            // source. The directive lives in the hook's session record, so the CLI must read that record for the same session.
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI reports a session prompt directive from the hook session record',
            fn: () => withProject(p => {
                p.write(p.userFile, cfg('auto'));
                const session = newSession();
                // Given no directive yet: the real winner (the user file) is reported for that session
                assertEqual(p.run(session, 'hello').code, 0);
                let shown = p.cli(['--show'], { CK_SESSION_ID: session });
                assertEqual(shown.code, 0, shown.err);
                assertContains(shown.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertNotContains(shown.out, 'No session id');
                // When the session's prompt carries `workflow-mode: off` (the hook records it)
                assertContains(p.run(session, 'workflow-mode: off').out, 'Route mode directive applied: off');
                // Then the CLI for the same session reports off, decided by the prompt directive
                shown = p.cli(['--show'], { CK_SESSION_ID: session });
                assertContains(shown.out, 'Route mode: off (set by your prompt this session)');
                assertContains(shown.out, 'session prompt directive: off');
                const json = JSON.parse(p.cli(['--json'], { CK_SESSION_ID: session }).out);
                assertEqual(`${json.mode}|${json.source}`, 'off|session');
                // And the id can be passed as an argument instead of the environment
                assertContains(p.cli([`--session=${session}`]).out, 'Route mode: off (set by your prompt this session)');
                // And a saved mode says a higher-precedence source still wins
                assertContains(p.cli(['auto', '--save'], { CK_SESSION_ID: session }).out, 'the effective mode stays off');
                // And another session has no directive: the CLI reports its real winner
                assertContains(p.cli(['--show'], { CK_SESSION_ID: newSession() }).out, 'Route mode: auto (~/.claude/.ck.json)');
                // And with no session id the CLI cannot see a directive and says so instead of guessing
                shown = p.cli(['--show']);
                assertContains(shown.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertContains(shown.out, 'a prompt directive given this session is not visible');
                assertEqual(JSON.parse(p.cli(['--json']).out).sessionNote !== null, true);
            })
        },
        {
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI writes the checkout file only when git ignores it',
            skip: GIT_AVAILABLE ? false : 'git is not available',
            fn: () => withProject(p => {
                const git = args => spawnSync('git', args, { cwd: p.root, encoding: 'utf8', windowsHide: true });
                assertEqual(git(['init', '-q']).status, 0);
                p.write(path.join(p.root, '.claude', '.gitignore'), '*.local.json\n');
                const out = p.cli(['off', '--save', '--local']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Route mode: off (.claude/.ck.local.json)');
                assertEqual(JSON.parse(fs.readFileSync(p.localFile, 'utf8')).portability.workflowRouteMode, 'off');
                const ignored = git(['check-ignore', '-q', '--', '.claude/.ck.local.json']);
                assertEqual(ignored.status, 0, 'the written checkout file is git-ignored');
            })
        },
        {
            // Intent: the route hook keeps the gate text in ONE place: the gate file. A mode variant lost from it, or a
            // fence that leaks into the payload, changes what the assistant is told.
            name: '[workflow-route-modes] TC-WFR-014 the shipped gate renders a distinct, fence-free text for ask and for auto',
            fn: () => {
                const hook = require(path.join(CLAUDE_DIR, 'hooks', 'workflow-route-inject.cjs'));
                const gate = fs.readFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'), 'utf8');
                const ask = hook.renderGateForMode(gate, 'ask');
                const auto = hook.renderGateForMode(gate, 'auto');
                assertTrue(ask !== auto, 'the two modes must differ');
                for (const text of [ask, auto]) {
                    assertContains(text, '<!-- CK:WORKFLOW-GATE -->');
                    assertNotContains(text, 'CK:GATE-MODE');
                    assertNotContains(text, 'CK:WORKFLOW-ROUTE-POINTER', 'the root pointer is not part of the delivered gate');
                    assertContains(text, '| Signals | Route |', 'the routing table is shared by both modes');
                    assertContains(text, 'Catalog fit');
                }
                // ask: the question fires only for a started catalog workflow; direct, single-skill and custom-simple proceed unasked
                assertContains(ask, 'NEVER starts before the answer');
                assertContains(ask, 'only when YOUR route is to start a catalog workflow');
                assertContains(ask, 'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking');
                assertContains(ask, '(never for direct or custom-simple)');
                assertNotContains(ask, 'a route that matches a catalog workflow', 'a matched-but-downgraded route must not be told to ask');
                assertTrue(!/(?:direct|custom-simple)[^.;|]{0,80}\b(?:must|MUST|always) ask\b/.test(ask), 'a direct or custom-simple route must never be told to ask');
                assertNotContains(auto, 'NEVER starts before the answer');
            }
        },
        {
            // Intent: the route hook is the only carrier of the route and of the off notice, so a project whose
            // record store cannot be created (a read-only checkout, a file where `tmp/` belongs) still receives the
            // mode's text: a duplicate per prompt is accepted over a route the model never sees.
            name: '[workflow-route-modes] TC-WFR-014 an unusable record store still delivers the route and the off notice on every prompt',
            fn: () => withProject(p => {
                // Given a regular file where the project's tmp folder should be (portable on every OS)
                p.write(path.join(p.root, 'tmp'), 'not a folder');
                for (const [mode, marker] of [['ask', ASK_QUESTION], ['auto', AUTO_START], ['off', '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->']]) {
                    const session = newSession();
                    // When two prompts of one session arrive in that mode
                    const first = p.run(session, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                    const second = p.run(session, 'and one more thing', { CK_WORKFLOW_ROUTE_MODE: mode });
                    // Then each prompt carries the mode's text and the hook exits cleanly
                    for (const [label, result] of [['first', first], ['second', second]]) {
                        assertEqual(result.code, 0, `${mode} ${label}: ${result.err}`);
                        assertContains(result.out, marker, `${mode} ${label} prompt must carry its route text`);
                    }
                }
                assertTrue(fs.statSync(path.join(p.root, 'tmp')).isFile(), 'the blocking file is untouched');
            })
        },
        {
            // Intent: the route hook is the only carrier of the route, so a catalog the hook cannot build (a registry
            // with merge-conflict markers, a missing file, a workflow without its injectContext) must not silence it:
            // the mode's gate still arrives together with one line saying the catalog is unavailable. `off` reads no
            // file and is unchanged.
            name: '[workflow-route-modes] TC-WFR-020 an unreadable workflow registry still delivers the mode gate and one catalog-unavailable line',
            fn: () => withProject(p => {
                const registry = path.join(p.root, '.claude', 'workflows.json');
                const good = fs.readFileSync(registry, 'utf8');
                const withoutInject = JSON.stringify((() => {
                    const doc = JSON.parse(good);
                    delete doc.workflows[Object.keys(doc.workflows)[0]].preActions.injectContext;
                    return doc;
                })());
                const breakers = [
                    ['conflict markers', () => p.write(registry, '<<<<<<< HEAD\n{"workflows":{}}\n=======\n>>>>>>> branch\n')],
                    ['missing file', () => fs.rmSync(registry)],
                    ['a workflow without injectContext', () => p.write(registry, withoutInject)],
                    ['empty file', () => p.write(registry, '')]
                ];
                for (const [label, breakIt] of breakers) {
                    p.write(registry, good);
                    breakIt();
                    for (const [mode, marker, absent] of [['ask', ASK_QUESTION, AUTO_START], ['auto', AUTO_START, ASK_QUESTION]]) {
                        // Given a registry the catalog cannot be built from, in mode ask or auto
                        const out = p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                        const where = `${label} / ${mode}`;
                        // Then the hook exits cleanly and still delivers the state line, the mode's own gate text and the one notice line
                        assertEqual(out.code, 0, `${where}: ${out.err}`);
                        assertEqual(modeOf(out.out)[0], mode, `${where}: state line`);
                        assertContains(out.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', where);
                        assertContains(out.out, marker, `${where}: the mode's gate text must arrive`);
                        assertNotContains(out.out, absent, `${where}: the other mode's text must not arrive`);
                        assertNotContains(out.out, 'CK:GATE-MODE', `${where}: no fence line may reach the model`);
                        assertContains(out.out, 'workflow catalog unavailable: ', where);
                        assertContains(out.out, '; read .claude/workflows.json', where);
                        assertNotContains(out.out, CATALOG_HEADING, `${where}: no catalog`);
                        assertEqual(out.out.split('\n').filter(line => line.startsWith('workflow catalog unavailable: ')).length, 1, `${where}: exactly one notice line`);
                        assertTrue(out.out.length <= PAYLOAD_CAP, `${where}: ${out.out.length} chars`);
                    }
                    // And `off` is unchanged: its notice reads no file
                    const off = p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                    assertContains(off.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', `${label} / off`);
                    assertNotContains(off.out, 'workflow catalog unavailable', `${label} / off`);
                }
                // And once the registry is repaired, the same session receives the real catalog (the notice is content, so the change re-arms delivery)
                const session = newSession();
                p.write(registry, '{ not json');
                assertContains(p.run(session, 'first', { CK_WORKFLOW_ROUTE_MODE: 'ask' }).out, 'workflow catalog unavailable: ');
                p.write(registry, good);
                assertContains(p.run(session, 'second', { CK_WORKFLOW_ROUTE_MODE: 'ask' }).out, CATALOG_HEADING);
            })
        },
        {
            // Intent: when even the gate file cannot be read the hook names it in one line instead of printing
            // nothing, so the model and the person see that the route is gone; `off` needs no file and is unchanged.
            name: '[workflow-route-modes] TC-WFR-021 an unreadable gate file is reported in one line naming it, and the off notice is unchanged',
            fn: () => withProject(p => {
                const gate = path.join(p.root, '.claude', 'skills', 'shared', 'workflow-first-gate.md');
                const good = fs.readFileSync(gate, 'utf8');
                const breakers = [
                    ['missing gate file', () => fs.rmSync(gate)],
                    ['unreadable gate path (a folder)', () => { fs.rmSync(gate); fs.mkdirSync(gate); }],
                    ['empty gate file', () => p.write(gate, '')],
                    ['whitespace gate file', () => p.write(gate, ' \r\n\t')],
                    ['empty marked gate', () => p.write(gate, '# unrelated reference\n<!-- CK:WORKFLOW-GATE -->\n \n<!-- /CK:WORKFLOW-GATE -->')],
                    ['mode-filtered empty gate', () => p.write(gate, '<!-- CK:WORKFLOW-GATE -->\n<!-- CK:GATE-MODE off -->\nonly off\n<!-- /CK:GATE-MODE -->\n<!-- /CK:WORKFLOW-GATE -->')]
                ];
                for (const [label, breakIt] of breakers) {
                    fs.rmSync(gate, { recursive: true, force: true });
                    fs.copyFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'), gate);
                    breakIt();
                    for (const mode of ['ask', 'auto']) {
                        // Given a gate file the hook cannot read, in mode ask or auto (with a good registry)
                        const out = p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                        const where = `${label} / ${mode}`;
                        // Then the hook exits cleanly and delivers the state line and one line naming the gate file
                        assertEqual(out.code, 0, `${where}: ${out.err}`);
                        assertEqual(modeOf(out.out)[0], mode, `${where}: state line`);
                        assertContains(out.out, 'workflow route unavailable: .claude/skills/shared/workflow-first-gate.md could not be read', where);
                        assertContains(out.out, 'read it and .claude/workflows.json', where);
                        assertNotContains(out.out, CATALOG_HEADING, `${where}: no catalog`);
                        assertEqual(out.out.split('\n').filter(line => line.startsWith('workflow route unavailable: ')).length, 1, `${where}: exactly one notice line`);
                    }
                    const off = p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                    assertContains(off.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', `${label} / off`);
                    assertNotContains(off.out, 'workflow route unavailable', `${label} / off`);
                }
                // Adopters' nonempty unmarked gate text remains supported.
                p.write(gate, 'SYNTHETIC_NONEMPTY_UNMARKED_GATE');
                const unmarked = p.run(newSession(), 'fix the fixture');
                assertContains(unmarked.out, 'SYNTHETIC_NONEMPTY_UNMARKED_GATE');
                assertContains(unmarked.out, CATALOG_HEADING);
                assertNotContains(unmarked.out, 'workflow route unavailable: ');
                // Repair changes the delivered content, so this session receives the gate and catalog.
                const session = newSession();
                p.write(gate, '');
                assertContains(p.run(session, 'first').out, 'workflow route unavailable: ');
                p.write(gate, good);
                const repaired = p.run(session, 'second');
                assertContains(repaired.out, ASK_QUESTION);
                assertContains(repaired.out, CATALOG_HEADING);
                assertNotContains(repaired.out, 'workflow route unavailable: ');
                assertContains(p.run(session, 'third', { CK_WORKFLOW_ROUTE_MODE: 'auto' }).out, CATALOG_HEADING);
            })
        },
        {
            // Intent: an alias to ignored credentials must not leak into context; public aliases still work.
            name: '[workflow-route-modes] TC-WFR-022 private protocol aliases are refused while public aliases remain readable',
            fn: () => withProject(p => {
                const alias = path.join(p.root, 'docs', 'protocol-alias');
                const variants = [
                    ['credentials-store', 'route.md', 'SYNTHETIC_PRIVATE_SENTINEL', false],
                    ['public-store', 'route.md', 'SYNTHETIC_PUBLIC_PROTOCOL', true],
                    ['sample-store', '.env.example', 'SYNTHETIC_SAMPLE_PROTOCOL', true]
                ];
                for (const [folder, name, body, isAllowed] of variants) {
                    const target = path.join(p.root, folder);
                    p.write(path.join(target, name), body);
                    fs.mkdirSync(path.dirname(alias), { recursive: true });
                    fs.symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
                    try {
                        p.write(p.teamFile, { portability: { workflowRouteProtocol: { path: `docs/protocol-alias/${name}` } } });
                        for (const mode of ['ask', 'auto']) {
                            const out = p.run(newSession(), 'fix the fixture', { CK_WORKFLOW_ROUTE_MODE: mode });
                            assertEqual(out.code, 0, out.err);
                            assertContains(out.out, mode === 'ask' ? ASK_QUESTION : AUTO_START);
                            if (isAllowed) assertContains(out.out, body, `${folder} / ${mode}: public protocol remains readable`);
                            else assertNotContains(out.out, body, `${folder} / ${mode}: physical credentials must stay private`);
                        }
                        const off = p.run(newSession(), 'fix the fixture', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                        assertNotContains(off.out, body, `${folder} / off: no protocol is read`);
                        if (!isAllowed) {
                            // A rejected checkout-local source expresses no opinion; the public team layer wins.
                            p.write(p.localFile, { portability: { workflowRouteProtocol: { path: `docs/protocol-alias/${name}` } } });
                            p.write(p.teamFile, { portability: { workflowRouteProtocol: 'SYNTHETIC_TEAM_PROTOCOL' } });
                            const out = p.run(newSession(), 'fix the fixture');
                            assertContains(out.out, 'SYNTHETIC_TEAM_PROTOCOL');
                            assertNotContains(out.out, body);
                            fs.rmSync(p.localFile);
                        }
                    } finally {
                        fs.unlinkSync(alias);
                    }
                }
                // Resolve both sides physically: a checkout reached through a link is still eligible.
                const linkedRoot = path.join(p.root, 'linked-checkout');
                p.write(p.teamFile, { portability: { workflowRouteProtocol: { path: 'public-store/route.md' } } });
                fs.symlinkSync(p.root, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
                try {
                    const out = p.run(newSession(), 'fix the fixture', { CLAUDE_PROJECT_DIR: linkedRoot });
                    assertEqual(out.code, 0, out.err);
                    assertContains(out.out, 'SYNTHETIC_PUBLIC_PROTOCOL');
                } finally {
                    fs.unlinkSync(linkedRoot);
                }
            })
        }
    ]
};
