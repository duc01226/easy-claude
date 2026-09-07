/**
 * TC-HARNESS-003: notification data stays literal; appearance, modes and failures survive.
 * All child processes are replaced before loading the provider. No OS notification is sent.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PROVIDER = path.resolve(__dirname, '../../notifications/providers/desktop.cjs');
const WINDOWS_SCRIPT = path.resolve(__dirname, '../../lib/notify-windows.ps1');
const SOURCE = fs.readFileSync(PROVIDER, 'utf8');

function loadProvider(platform, { errors = [], durations = [], env = {}, source = SOURCE } = {}) {
    const calls = [];
    let elapsed = 0;
    const childProcess = {
        exec() { throw new Error('Shell interpolation is forbidden'); },
        execFile(file, args, options, callback) {
            const index = calls.length;
            calls.push({ file, args: Array.from(args), options: { ...options } });
            queueMicrotask(() => {
                elapsed += durations[index] || 0;
                callback(errors[index] || null);
            });
        }
    };
    const context = { module: { exports: {} }, __dirname: path.dirname(PROVIDER), process: { env }, Date: { now: () => elapsed } };
    context.require = name => {
        if (name === 'child_process') return childProcess;
        if (name === 'os') return { platform: () => platform };
        if (name === 'path') return path;
        throw new Error(`Unmocked dependency: ${name}`);
    };
    vm.runInNewContext(source, context, { filename: PROVIDER });
    return { provider: context.module.exports, calls };
}

function assertCall(call, platform, title, message, dialog) {
    assert.ok(call, 'Notification must reach the literal subprocess boundary');
    assert.equal(call.options.shell, false);
    assert.equal(call.options.timeout, platform === 'win32' ? (dialog ? 60000 : 5000) : (dialog ? 30000 : 3000));
    if (platform === 'win32') {
        assert.equal(call.file, 'powershell');
        assert.equal(call.options.windowsHide, true);
        assert.deepEqual(call.args, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', WINDOWS_SCRIPT,
            '-Title', title, '-Message', message, ...(dialog ? ['-ShowDialog'] : [])]);
    } else if (platform === 'linux') {
        assert.equal(call.file, dialog ? 'zenity' : 'notify-send');
        assert.deepEqual(call.args, dialog ? ['--info', `--title=${title}`, `--text=${message}`] :
            ['--urgency=normal', '--expire-time=5000', '--', title, message]);
    } else {
        assert.equal(call.file, 'osascript');
        assert.equal(call.args[0], '-e');
        assert.deepEqual(call.args.slice(2), ['--', title, message]);
        assert.match(call.args[1], /on run argv/);
        assert.match(call.args[1], /item 2 of argv/);
        assert.match(call.args[1], /with title \(item 1 of argv\)/);
        assert.match(call.args[1], dialog ? /display dialog.*buttons \{"OK"\} default button "OK"/ : /display notification/);
    }
}

// Bounded property domain: all strings of length 0..2 over this alphabet, plus
// explicit composite command-looking, long, newline, Unicode and option countercases.
// This finite corpus proves literal delivery for these values, not every OS parser.
function payloads() {
    const alphabet = ['a', ' ', '"', "'", '$', '`', ';', '&', '|', '%', '!', '\n', 'é', '界', '😀', '-'];
    return ['', ...alphabet, ...alphabet.flatMap(a => alphabet.map(b => a + b)),
        '$(echo INERT); `echo INERT` & echo INERT | echo INERT',
        '"; display dialog "INERT" --', '%COMSPEC% !INERT! ^ & < >',
        '--help', '-ShowDialog', 'line1\r\nline2\tend', 'x'.repeat(8192), 'back\\slash'];
}

const tests = ['linux', 'win32', 'darwin'].map(platform => ({
    name: `[TC-HARNESS-003] ${platform}: bounded literal argv property and benign controls`,
    fn: async () => {
        let toastScript;
        for (const payload of payloads()) {
            const { provider, calls } = loadProvider(platform);
            const input = { hook_event_name: 'SubagentStop', cwd: `/work/${payload || 'sample'}`, agent_type: payload || 'worker' };
            const result = await provider.send(input, {});
            assert.equal(result.success, true);
            assert.equal(calls.length, 1);
            const project = input.cwd.replace(/\\/g, '/').split('/').filter(Boolean).pop();
            assertCall(calls[0], platform, `[${project}] Subagent Complete`, `${input.agent_type} agent finished its task`, false);
            if (platform === 'darwin') {
                toastScript ??= calls[0].args[1];
                assert.equal(calls[0].args[1], toastScript, 'Data must never change executable AppleScript');
            }
        }
    }
}));

tests.push({
    name: '[TC-HARNESS-003] dialog event selection, copy and timeouts remain intact',
    fn: async () => {
        const events = [
            [{ hook_event_name: 'Stop' }, 'Claude Code Complete', 'Session completed successfully'],
            [{ hook_event_name: 'AskUserQuestion' }, 'Claude Has a Question', 'Claude is asking a question — please check and answer'],
            [{ notification_type: 'idle_prompt' }, 'Claude Waiting for Input', 'Claude is waiting for your input'],
            [{ notification_type: 'AskUserPrompt' }, 'Claude Needs Input', 'Waiting for your input'],
            [{ notification_type: 'permission_prompt' }, 'Claude Needs Permission', 'Claude is asking for tool permission']
        ];
        for (const platform of ['linux', 'win32', 'darwin']) {
            let dialogScript;
            for (const [input, title, message] of events) {
                const { provider, calls } = loadProvider(platform);
                assert.equal((await provider.send({ ...input, cwd: '/work/$(echo INERT)' }, {})).success, true);
                assert.equal(calls.length, 1);
                assertCall(calls[0], platform, `[$(echo INERT)] ${title}`, message, true);
                if (platform === 'darwin') {
                    dialogScript ??= calls[0].args[1];
                    assert.equal(calls[0].args[1], dialogScript);
                }
            }
        }
    }
}, {
    name: '[TC-HARNESS-003] Linux fallback only follows zenity failure and preserves literal data',
    fn: async () => {
        const input = { hook_event_name: 'Stop', cwd: '/work/$(echo INERT)' };
        for (const failure of [new Error('zenity missing'), Object.assign(new Error('timed out'), { killed: true })]) {
            for (const fallbackError of [null, new Error('kdialog missing')]) {
                const { provider, calls } = loadProvider('linux', { errors: [failure, fallbackError] });
                const result = await provider.send(input, {});
                assert.equal(result.success, !fallbackError);
                assert.equal(result.error, fallbackError?.message);
                assert.equal(calls.length, 2);
                assert.equal(calls[1].file, 'kdialog');
                assert.deepEqual(calls[1].args, ['--msgbox', 'Session completed successfully', '--title', '[$(echo INERT)] Claude Code Complete']);
                assert.equal(calls[1].options.shell, false);
                assert.equal(calls[1].options.timeout, 30000);
            }
        }
        for (const elapsed of [1, 125, 29999, 30000, 30001]) {
            const { provider, calls } = loadProvider('linux', { errors: [new Error('zenity failed')], durations: [elapsed] });
            const result = await provider.send(input, {});
            assert.equal(result.success, elapsed < 30000);
            assert.equal(calls.length, elapsed < 30000 ? 2 : 1, 'Expired shared deadline must not launch fallback');
            if (elapsed < 30000) assert.equal(calls[1].options.timeout, 30000 - elapsed);
            else assert.equal(result.error, 'zenity failed');
        }
    }
}, {
    name: '[TC-HARNESS-003] callback errors and timeouts propagate; unsupported platform makes no call',
    fn: async () => {
        for (const platform of ['linux', 'win32', 'darwin']) {
            for (const error of [new Error('executable missing'), Object.assign(new Error('timed out'), { killed: true })]) {
                const { provider, calls } = loadProvider(platform, { errors: [error] });
                const result = await provider.send({ hook_event_name: 'SubagentStop' }, {});
                assert.equal(result.success, false);
                assert.equal(result.error, error.message);
                assert.equal(calls.length, 1);
            }
        }
        const { provider, calls } = loadProvider('unsupported');
        assert.equal((await provider.send({}, {})).error, 'Unsupported platform: unsupported');
        assert.equal(calls.length, 0);
    }
}, {
    name: '[TC-HARNESS-003] enablement retains default, explicit disable and invalid-value controls',
    fn: () => {
        const { provider, calls } = loadProvider('linux');
        for (const [value, enabled] of [[undefined, true], ['', true], ['true', true], ['false', false], ['invalid', false]]) {
            assert.equal(provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: value }), enabled);
        }
        assert.equal(calls.length, 0);
    }
}, {
    name: '[TC-HARNESS-003] test mode suppresses every platform subprocess',
    fn: async () => {
        for (const platform of ['linux', 'win32', 'darwin']) {
            const { provider, calls } = loadProvider(platform, { env: { CLAUDE_HOOK_TEST_MODE: '1' } });
            const result = await provider.send({ hook_event_name: 'Stop' }, {});
            assert.equal(result.success, true);
            assert.equal(result.skipped, true);
            assert.equal(calls.length, 0);
        }
    }
}, {
    name: '[TC-HARNESS-003] existing Windows script retains sound, toast, focus and balloon branches',
    fn: () => {
        const script = fs.readFileSync(WINDOWS_SCRIPT, 'utf8');
        for (const token of ['[string]$Title', '[string]$Message', '[switch]$ShowDialog', 'SystemSounds]::Exclamation.Play()',
            'SystemSounds]::Asterisk.Play()', 'SystemSounds]::Question.Play()', 'New-BurntToastNotification -Text $Title, $Message',
            '$form.TopMost = $true', 'GetForegroundWindow()', 'SetForegroundWindow($previousWindow)',
            'MessageBoxButtons]::OK', '$notify.BalloonTipTitle = $Title', '$notify.BalloonTipText = $Message', '$notify.ShowBalloonTip(5000)']) {
            assert.ok(script.includes(token), `Protected script behavior missing: ${token}`);
        }
    }
}, {
    name: '[TC-HARNESS-003] semantic interpolation mutant is killed by the literal-boundary oracle',
    fn: async () => {
        const needle = 'execFile(file, args, { shell: false, ...options },';
        assert.ok(SOURCE.includes(needle), 'Mutant must target the live subprocess boundary');
        const mutant = SOURCE.replace(needle, "require('child_process').exec([file, ...args].join(' '), options,");
        assert.notEqual(mutant, SOURCE);
        const { provider } = loadProvider('linux', { source: mutant });
        await assert.rejects(provider.send({ hook_event_name: 'SubagentStop', cwd: '/work/$(echo INERT)' }, {}), /Shell interpolation is forbidden/);
    }
});

module.exports = { name: 'Desktop literal argv', tests };
