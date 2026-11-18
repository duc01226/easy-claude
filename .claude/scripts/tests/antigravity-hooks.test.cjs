'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { formatGuideLine, GUIDE_BLOCK_START, GUIDE_BLOCK_END } = require('../lib/protocol-guide-carrier.cjs');

const framework = path.resolve(__dirname, '../..');
const prelude = "const p = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));\n";
const tool = (name, args, extra = {}) => ({ toolCall: { id: 'tool-1', name, args }, ...extra });
const group = (matcher, ...hooks) => ({ matcher, hooks });
const injected = response => (response.injectSteps ?? []).map(step => step.systemMessage?.systemMessage);

function fixture(t) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity workspace ')));
    t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
    const agents = path.join(root, '.agents');
    const home = path.join(root, 'fixture-home');
    fs.mkdirSync(agents);
    fs.mkdirSync(home);
    for (const dir of ['scripts/antigravity', 'scripts/lib', 'hooks/lib']) {
        fs.cpSync(path.join(framework, dir), path.join(root, '.claude', dir), { recursive: true });
    }

    const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !/^(?:CK_|CLAUDE_|CODEX_|GEMINI_|ANTIGRAVITY_|NODE_OPTIONS|NODE_PATH|GIT_)/i.test(key))
    );
    Object.assign(env, {
        PATH: [path.dirname(process.execPath), process.env.PATH].filter(Boolean).join(path.delimiter),
        HOME: home,
        USERPROFILE: home,
        TMPDIR: home,
        TEMP: home,
        TMP: home,
        CLAUDE_PROJECT_DIR: home,
        CK_FRAMEWORK_MODE: 'on',
        GIT_CONFIG_NOSYSTEM: '1'
    });
    const options = { cwd: agents, env, encoding: 'utf8', timeout: 20_000 };
    const settings = hooks => fs.writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({ hooks }));
    const hook = (name, code, extra) => {
        const file = path.join(root, '.claude', 'hooks', `${name}.cjs`);
        if (code === undefined) fs.copyFileSync(path.join(framework, 'hooks', `${name}.cjs`), file);
        else fs.writeFileSync(file, prelude + code);
        return { type: 'command', command: `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${name}.cjs`, ...extra };
    };
    const sync = (...args) => spawnSync(process.execPath, ['../.claude/scripts/antigravity/sync-hooks.mjs', ...args], options);
    const event = (name, extra = {}, command) => {
        const input = JSON.stringify({ conversationId: 'fixture-conversation', workspacePaths: [root], ...extra });
        const result = command
            ? spawnSync(command, { ...options, shell: true, input })
            : spawnSync(process.execPath, ['../.claude/scripts/antigravity/hook-bridge.cjs', name], { ...options, input });
        assert.equal(result.status, 0, result.stderr || String(result.error));
        return JSON.parse(result.stdout);
    };
    return { root, agents, env, settings, hook, sync, event };
}

test('TC-AGY-001: sync preserves custom hooks and opt-out, detects drift, and launches native commands', t => {
    const f = fixture(t);
    const file = path.join(f.agents, 'hooks.json');
    const personal = { enabled: false, PreInvocation: [{ type: 'command', command: 'personal-tool' }] };
    fs.writeFileSync(file, JSON.stringify({ personal }));
    assert.equal(f.sync('--check').status, 1);
    const setup = f.sync();
    assert.equal(setup.status, 0, setup.stderr);
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(config.personal, personal);
    const managed = config['easy-claude'];
    assert.deepEqual(Object.keys(managed), ['SessionStart', 'PreInvocation', 'PreToolUse', 'PostToolUse', 'Stop']);
    f.settings({
        PreToolUse: [
            group('Bash', f.hook('native-launch', "if (p.tool_input.command === 'fixture') { console.error('native gate ran'); process.exitCode = 2; }"))
        ]
    });
    const [native] = managed.PreToolUse;
    assert.equal(new RegExp(native.matcher).test('run_command'), true);
    const denied = f.event('PreToolUse', tool('run_command', { CommandLine: 'fixture' }), native.hooks[0].command);
    assert.deepEqual(denied, { decision: 'deny', reason: 'native gate ran' });
    managed.enabled = false;
    managed.Stop[0].timeout = 999;
    const before = JSON.stringify(config);
    fs.writeFileSync(file, before);
    assert.match(f.sync('--check').stderr, /stale/);
    assert.equal(fs.readFileSync(file, 'utf8'), before, 'check must not write');
    assert.equal(f.sync().status, 0);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))['easy-claude'].enabled, false);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).personal, personal);
    assert.equal(f.sync('--check').status, 0);
    const final = fs.readFileSync(file, 'utf8');
    assert.match(f.sync().stdout, /current/);
    assert.equal(fs.readFileSync(file, 'utf8'), final);
});

test('TC-AGY-002: corrupt settings and custom group collisions cannot overwrite project settings', t => {
    const f = fixture(t);
    const file = path.join(f.agents, 'hooks.json');
    for (const source of ['{', '[]', '{"easy-claude":{"Stop":[{"command":"my-own-hook"}]}}']) {
        fs.writeFileSync(file, source);
        assert.equal(f.sync().status, 1);
        assert.equal(fs.readFileSync(file, 'utf8'), source);
    }
});

test('TC-AGY-003: startup and prompt context arrive once per turn with typed skill expansion', t => {
    const f = fixture(t);
    const seen = path.join(f.root, 'stops.txt');
    f.settings({
        SessionStart: [
            group(
                'startup|resume',
                f.hook('startup', "console.log(JSON.stringify({systemMessage: p.source + ' ' + p.cwd + ' ' + process.env.CLAUDE_PROJECT_DIR}));")
            ),
            group('compact', f.hook('compact', "console.log('unexpected compact');"))
        ],
        UserPromptSubmit: [group(undefined, f.hook('prompt', "console.log('submit ' + p.prompt);"))],
        UserPromptExpansion: [group(undefined, f.hook('expansion', "console.log('expanded ' + p.command_name);"))],
        Stop: [group(undefined, f.hook('stop', `require('node:fs').appendFileSync(${JSON.stringify(seen)}, p.session_id + '\\n');`))]
    });
    assert.deepEqual(injected(f.event('SessionStart')), [`startup ${f.root} ${f.root}`]);
    const first = { lastUserInput: '$fix keep this path', invocationNum: 0, initialNumSteps: 3 };
    const expected = ['submit $fix keep this path', 'expanded fix'];
    assert.deepEqual(injected(f.event('PreInvocation', first)), expected);
    assert.deepEqual(f.event('PreInvocation', { ...first, invocationNum: 1, initialNumSteps: 12 }), {});
    assert.deepEqual(f.event('Stop', { fullyIdle: false }), { decision: 'stop' });
    assert.equal(fs.existsSync(seen), false);
    assert.deepEqual(f.event('PreInvocation', { ...first, invocationNum: 2, initialNumSteps: 17 }), {});
    assert.deepEqual(f.event('Stop', { fullyIdle: true }), { decision: 'stop' });
    assert.equal(fs.readFileSync(seen, 'utf8'), 'fixture-conversation\n');
    assert.deepEqual(injected(f.event('PreInvocation', { ...first, invocationNum: 3 })), expected);
    assert.deepEqual(injected(f.event('PreInvocation', { lastUserInput: '/fix revised', invocationNum: 4 })), ['submit /fix revised', 'expanded fix']);
    assert.deepEqual(injected(f.event('PreInvocation', { lastUserInput: '/fix revised', invocationNum: 0 })), ['submit /fix revised', 'expanded fix']);
    f.settings({ UserPromptSubmit: [group(undefined, f.hook('block-prompt', "console.error('prompt refusal'); process.exitCode = 2;"))] });
    const blocked = { terminationBehavior: 'terminate', injectSteps: [{ errorMessage: { userMessage: 'prompt refusal' } }] };
    assert.deepEqual(f.event('PreInvocation', { lastUserInput: 'blocked' }), blocked);
    assert.deepEqual(f.event('PreInvocation', { lastUserInput: 'blocked' }), blocked);
});

test('TC-AGY-004: permissions are preserved, final rewrites are gated, and bridge errors deny', t => {
    const f = fixture(t);
    const subdir = path.join(f.root, 'nested project');
    fs.mkdirSync(subdir);
    f.settings({
        PreToolUse: [
            group(
                'Bash',
                f.hook(
                    'deny-first',
                    `if(p.tool_input.cwd !== ${JSON.stringify(subdir)}) throw Error('wrong Cwd');
if(p.tool_input.command === 'blocked') { console.error('gate refused'); process.exitCode = 2; }
if(p.tool_input.command === 'json-deny') console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:'deny', permissionDecisionReason:'JSON refusal'}}));
if(p.tool_input.command === 'may I') console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:'ask'}}));`
                ),
                f.hook(
                    'change-args',
                    `const replacements = {change:'changed', escalate:'blocked'};
if (replacements[p.tool_input.command]) console.log(JSON.stringify({hookSpecificOutput:{updatedInput:{command:replacements[p.tool_input.command]}}}));`
                )
            )
        ]
    });
    const run = command => f.event('PreToolUse', tool('run_command', { CommandLine: command, Cwd: subdir, WaitMsBeforeAsync: 10 }));
    assert.deepEqual(run('permitted'), { decision: 'allow' });
    assert.deepEqual(f.event('PreToolUse', { toolCall: { name: 'list_permissions' } }), { decision: 'allow' });
    assert.deepEqual(run('blocked'), { decision: 'deny', reason: 'gate refused' });
    assert.deepEqual(run('json-deny'), { decision: 'deny', reason: 'JSON refusal' });
    assert.deepEqual(run('may I'), { decision: 'force_ask' });
    assert.deepEqual(run('change'), { decision: 'allow', overwrite: { CommandLine: 'changed' } });
    assert.deepEqual(run('escalate'), { decision: 'deny', reason: 'gate refused' });
    assert.equal(f.event('PreToolUse', tool('run_command', {})).decision, 'deny');
    assert.equal(f.event('PreToolUse', tool('run_command', { CommandLine: 'permitted' }, { conversationId: '../outside' })).decision, 'deny');
    f.settings({ PreToolUse: [group('Bash', { type: 'command', command: 'echo unsupported' })] });
    assert.equal(run('permitted').decision, 'deny');
    f.settings({ PreToolUse: [group('Bash', f.hook('crash', 'process.exitCode = 1;'))] });
    assert.equal(run('permitted').decision, 'deny');
});

test('TC-AGY-005 / TC-PDL-126: failures, aliases and read conditions queue context only for the originating conversation', t => {
    const f = fixture(t);
    const read = f.hook('skill-read', "console.log(JSON.stringify({hookSpecificOutput:{additionalContext:'read ' + p.tool_input.file_path}}));", {
        if: 'Read(**/SKILL.md)'
    });
    const edit = f.hook('edit', "console.log('edited ' + p.tool_name + ' ' + p.tool_input.file_path);");
    const fail = f.hook('fail', "console.log('failed ' + p.error);");
    const pre = f.hook('pre-advice', "console.error('pre-tool advice');");
    f.settings({
        PreToolUse: [group('AskUserQuestion', pre)],
        PostToolUse: [group('Read', read), group('Write|Edit|MultiEdit', edit)],
        PostToolUseFailure: [group('*', fail)]
    });
    assert.deepEqual(f.event('PreToolUse', tool('ask_question', {})), { decision: 'allow' });
    assert.deepEqual(f.event('PostToolUse', tool('read_file', { Path: 'README.md' })), {});
    assert.deepEqual(f.event('PostToolUse', tool('view_file', { AbsolutePath: '.agents/skills/fix/SKILL.md' })), {});
    const edits = [
        ['write_to_file', 'Write'],
        ['edit_file', 'Edit'],
        ['multi_replace_file_content', 'MultiEdit']
    ];
    for (const [name] of edits) assert.deepEqual(f.event('PostToolUse', tool(name, { TargetFile: 'source.md' })), {});
    assert.deepEqual(f.event('PostToolUse', tool('write_file', { Path: 'must-not-count.md' }, { error: 'write failed' })), {});
    assert.deepEqual(f.event('PreInvocation', { conversationId: 'separate-conversation' }), {});
    assert.deepEqual(
        injected(f.event('PreInvocation')).sort(),
        ['pre-tool advice', 'read .agents/skills/fix/SKILL.md', 'failed write failed', ...edits.map(([, name]) => `edited ${name} source.md`)].sort()
    );
    assert.deepEqual(f.event('PreInvocation'), {});
});

test('TC-AGY-006 / TC-PDL-126: canonical review gate blocks an unreviewed change and skill guidance reaches the next invocation', t => {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.root, 'review-me.md'), 'unreviewed\n');
    for (const args of [
        ['init', '--quiet'],
        ['add', 'review-me.md']
    ]) {
        const git = spawnSync('git', args, { cwd: f.root, env: f.env, encoding: 'utf8' });
        assert.equal(git.status, 0, git.stderr || String(git.error));
    }
    f.settings({
        PreToolUse: [group('Bash', f.hook('review-commit-gate'))],
        PostToolUse: [group('Read', f.hook('protocol-inject-review', undefined, { if: 'Read(**/SKILL.md)' }))]
    });
    const CommandLine = ['git', 'commit', '-m', 'fixture'].join(' ');
    const result = f.event('PreToolUse', tool('run_command', { CommandLine, Cwd: f.root }));
    assert.equal(result.decision, 'deny');
    assert.match(result.reason, /\[BLOCKED\] Commit refused/);

    const shared = path.join(f.root, '.claude', 'skills', 'shared');
    fs.mkdirSync(shared, { recursive: true });
    fs.cpSync(path.join(framework, 'skills', 'shared', 'protocols'), path.join(shared, 'protocols'), { recursive: true });
    fs.copyFileSync(path.join(framework, 'skills', 'shared', 'protocol-groups.json'), path.join(shared, 'protocol-groups.json'));
    const skill = path.join(f.agents, 'skills', 'antigravity-fixture', 'SKILL.md');
    fs.mkdirSync(path.dirname(skill), { recursive: true });
    fs.writeFileSync(
        skill,
        [
            '---',
            'name: antigravity-fixture',
            'description: Fixture skill',
            '---',
            '',
            GUIDE_BLOCK_START,
            formatGuideLine({
                tag: 'review-principle-awareness',
                summary: 'Review applicability',
                when: 'when reviewing',
                path: '.claude/skills/shared/protocols/review-principle-awareness.md'
            }),
            GUIDE_BLOCK_END,
            ''
        ].join('\n')
    );
    assert.deepEqual(f.event('PostToolUse', tool('view_file', { AbsolutePath: skill })), {});
    assert.match(injected(f.event('PreInvocation')).join('\n'), /Review Applicability \/ Current-Principles Awareness/);
    assert.deepEqual(f.event('PreInvocation'), {});
});
