'use strict';

// TC-WCL: work-claim reminders (`workTracking`, hooks/lib/work-claim.cjs). Off by default; with mode remind a branch
// with no claim gets one rule per session, a claimed branch one status line, the first non-tracker edit one nudge,
// and compaction re-arms the notice. Declined, detached and non-Git checkouts stay silent; no hook reaches the network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { makeHookTreeProject, removeTempDir, childEnv } = require('../lib/hook-runner.cjs');
const workClaim = require('../../lib/work-claim.cjs');

const posix = process.platform !== 'win32';

function write(root, relative, text) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

/** A project with the hook tree, a Git repository on branch `feature/x`, and the given `workTracking`. */
function project(workTracking, callback) {
    const root = makeHookTreeProject('work-claim');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'work-claim-home-'));
    try {
        write(root, 'docs/project-config.json', JSON.stringify({ project: { name: 'Claim fixture' }, ...(workTracking ? { workTracking } : {}) }));
        git(root, ['init', '-q', '-b', 'main']);
        git(root, ['config', 'user.email', 't@t']);
        git(root, ['config', 'user.name', 't']);
        git(root, ['config', 'core.hooksPath', os.devNull]);
        write(root, 'README.md', 'x\n');
        git(root, ['add', 'README.md']);
        git(root, ['commit', '-q', '-m', 'init']);
        git(root, ['switch', '-q', '-c', 'feature/x']);
        return callback({ root, home });
    } finally {
        removeTempDir(root);
        removeTempDir(home);
    }
}

/** Run a hook as the host would; PATH carries a `gh` that records any call, so a network attempt shows. */
function launch(root, home, hook, payload, extraEnv = {}) {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'work-claim-bin-'));
    const called = path.join(bin, 'gh-called');
    try {
        if (posix) {
            fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\necho called > "${called}"\n`);
            fs.chmodSync(path.join(bin, 'gh'), 0o755);
        }
        const env = { HOME: home, USERPROFILE: home, CLAUDE_PROJECT_DIR: root, NODE_OPTIONS: undefined, PATH: `${bin}${path.delimiter}${process.env.PATH}`, ...extraEnv };
        for (const key of Object.keys(process.env)) if (/^CK_/.test(key) && !(key in extraEnv)) env[key] = undefined;
        const result = spawnSync(process.execPath, [path.join(root, '.claude/hooks', hook)], { cwd: root, env: childEnv(env), encoding: 'utf8', input: JSON.stringify(payload), timeout: 15000, windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(fs.existsSync(called), false, 'a work-claim hook must never call GitHub');
        return result.stdout;
    } finally {
        removeTempDir(bin);
    }
}

const prompt = (root, extra = {}) => ({ hook_event_name: 'UserPromptSubmit', session_id: 'wcl-session', cwd: root, prompt: 'Add a filter to the list page', ...extra });
const edit = (root, toolInput, tool = 'Edit') => ({ hook_event_name: 'PostToolUse', session_id: 'wcl-session', cwd: root, tool_name: tool, tool_input: toolInput, tool_response: { success: true } });
const REMIND = { mode: 'remind', trackerPaths: ['trackers/**/*.md'], claimCommand: 'run claim', declineCommand: 'run decline' };
const count = (text, needle) => text.split(needle).length - 1;

const tests = [
    {
        name: 'TC-WCL-001 the contract keeps its literals: modes, Git configuration keys, default prefix and tracker paths',
        fn: () => {
            assert.deepEqual(workClaim.CLAIM_CONFIG, { claim: 'workClaim', pr: 'workClaimPr', declined: 'workClaimDeclined' });
            assert.equal(workClaim.DEFAULTS.mode, 'off', 'off by default');
            assert.equal(workClaim.DEFAULTS.claimCommitPrefix, 'chore(trackers): start ');
            assert.deepEqual([...workClaim.DEFAULTS.trackerPaths], [], 'no tracker path by default: the project names its own');
            assert.deepEqual([...workClaim.PERSONAL_KEYS], ['mode', 'autoMerge']);
        }
    },
    {
        name: 'TC-WCL-002 settings layer team → personal → checkout → environment; personal layers set only mode and autoMerge; bad values are ignored',
        fn: () => project({ mode: 'remind', claimCommand: 'team claim', staleDraftDays: 3, autoMerge: 'bogus' }, ({ root, home }) => {
            let r = workClaim.resolveWorkTracking({ rootDir: root, homeDir: home, env: {} });
            assert.equal(r.settings.mode, 'remind');
            assert.equal(r.settings.autoMerge, 'ask', 'an invalid team value keeps the default');
            assert.equal(r.settings.staleDraftDays, 3);
            assert.equal(r.team.mode, 'remind');
            write(home, '.claude/.ck.json', JSON.stringify({ workTracking: { mode: 'off', autoMerge: 'when-green', claimCommand: 'mine' } }));
            r = workClaim.resolveWorkTracking({ rootDir: root, homeDir: home, env: {} });
            assert.equal(r.settings.mode, 'off');
            assert.equal(r.sources.mode, 'user-config');
            assert.equal(r.settings.autoMerge, 'when-green');
            assert.equal(r.settings.claimCommand, 'team claim', 'a personal layer cannot change the team command');
            assert.equal(r.team.mode, 'remind', 'the team mode stays the team\'s');
            write(root, '.claude/.ck.local.json', JSON.stringify({ workTracking: { mode: 'remind' } }));
            assert.equal(workClaim.resolveWorkTracking({ rootDir: root, homeDir: home, env: {} }).sources.mode, 'local-override');
            r = workClaim.resolveWorkTracking({ rootDir: root, homeDir: home, env: { CK_WORK_TRACKING_MODE: 'off', CK_WORK_TRACKING_AUTO_MERGE: 'ask' } });
            assert.equal(r.settings.mode, 'off');
            assert.equal(r.sources.autoMerge, 'environment');
        })
    },
    {
        name: 'TC-WCL-003 the notice follows the branch state; declined, main, detached and mode off are silent',
        fn: () => {
            const settings = { ...workClaim.DEFAULTS, ...REMIND };
            const unclaimed = workClaim.promptNotice(settings, { branch: 'feature/x', claim: null, pr: null, declined: null });
            assert.match(unclaimed, /has no claimed work/);
            assert.match(unclaimed, /`run claim`/);
            assert.match(unclaimed, /ask the user once/);
            assert.match(unclaimed, /`run decline`/);
            assert.match(workClaim.promptNotice(settings, { branch: 'feature/x', claim: 'SMP-1-1', pr: 7, declined: null }), /tracks SMP-1-1 in pull request #7/);
            assert.match(workClaim.promptNotice(settings, { branch: 'feature/x', claim: 'SMP-1-1', pr: null, declined: null }), /pending\. Run `run claim` again/);
            assert.equal(workClaim.promptNotice(settings, { branch: 'feature/x', claim: null, pr: null, declined: 'typo' }), null);
            assert.equal(workClaim.promptNotice(settings, { branch: 'main', claim: null, pr: null, declined: null }), null);
            assert.equal(workClaim.promptNotice(settings, null), null);
            assert.equal(workClaim.promptNotice({ ...settings, mode: 'off' }, { branch: 'feature/x', claim: null, pr: null, declined: null }), null);
        }
    },
    {
        name: 'TC-WCL-004 the first-edit nudge fires only for a non-tracker path on an unclaimed branch',
        fn: () => {
            const settings = { ...workClaim.DEFAULTS, ...REMIND };
            const free = { branch: 'feature/x', claim: null, pr: null, declined: null };
            assert.equal(workClaim.editNudge(settings, free, ['trackers/hr.md', 'trackers/archive/hr-archive.md']), null, 'tracker edits are the claim itself');
            assert.match(workClaim.editNudge(settings, free, ['trackers/hr.md', 'src/list.ts']), /`src\/list.ts` changed on `feature\/x`/);
            assert.equal(workClaim.editNudge(settings, { ...free, claim: 'SMP-1-1' }, ['src/list.ts']), null);
            assert.equal(workClaim.editNudge(settings, { ...free, declined: 'typo' }, ['src/list.ts']), null);
            assert.equal(workClaim.pathMatcher(['trackers/**/*.md'])('trackers\\hr.md'), true, 'Windows separators read as POSIX');
        }
    },
    {
        name: 'TC-WCL-005 branch state comes from two local Git calls, reads the keys whatever their case, and is null when detached',
        fn: () => project(null, ({ root }) => {
            let calls = 0;
            const counting = (cwd, args) => {
                calls += 1;
                const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
                return result.status === 0 ? result.stdout : null;
            };
            assert.deepEqual(workClaim.branchState(root, counting), { branch: 'feature/x', claim: null, pr: null, declined: null });
            git(root, ['config', 'branch.feature/x.workClaim', 'SMP-261111-1']);
            git(root, ['config', 'branch.feature/x.workClaimPr', '42']);
            calls = 0;
            assert.deepEqual(workClaim.branchState(root, counting), { branch: 'feature/x', claim: 'SMP-261111-1', pr: 42, declined: null });
            assert.ok(calls <= 2, `at most two Git calls, saw ${calls}`);
            git(root, ['switch', '-q', '--detach']);
            assert.equal(workClaim.branchState(root, counting), null);
            const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'work-claim-outside-'));
            try { assert.equal(workClaim.branchState(outside), null); } finally { removeTempDir(outside); }
        })
    },
    {
        name: 'TC-WCL-006 prompt hook: one rule per session, a status line once claimed, re-armed after compaction; silent when off or declined',
        skip: !posix,
        fn: () => project(REMIND, ({ root, home }) => {
            const hook = 'task-tracking-route.cjs';
            const first = launch(root, home, hook, prompt(root));
            assert.equal(count(first, workClaim.MARKER), 1);
            assert.match(first, /has no claimed work/);
            assert.ok(!/^[[{]/.test(first.trim()), 'prompt context stays plain text for every host');
            assert.equal(launch(root, home, hook, prompt(root)), '', 'the same state is told once per session');
            git(root, ['config', 'branch.feature/x.workClaim', 'SMP-261111-1']);
            git(root, ['config', 'branch.feature/x.workClaimPr', '42']);
            assert.match(launch(root, home, hook, prompt(root)), /tracks SMP-261111-1 in pull request #42/, 'a changed state is told again');
            assert.equal(launch(root, home, hook, prompt(root)), '');
            assert.equal(launch(root, home, hook, { hook_event_name: 'SessionStart', source: 'compact', session_id: 'wcl-session', cwd: root }), '');
            assert.match(launch(root, home, hook, prompt(root)), /tracks SMP-261111-1/, 'compaction re-arms the status line');
            assert.equal(launch(root, home, hook, prompt(root, { session_id: 'other' }), { CK_WORK_TRACKING_MODE: 'off' }), '', 'personal off silences it');
            git(root, ['config', '--unset', 'branch.feature/x.workClaim']);
            git(root, ['config', '--unset', 'branch.feature/x.workClaimPr']);
            git(root, ['config', 'branch.feature/x.workClaimDeclined', 'a typo']);
            assert.equal(launch(root, home, hook, prompt(root, { session_id: 'third' })), '', 'a declined branch is silent');
        })
    },
    {
        name: 'TC-WCL-007 edit hook: one nudge per session and branch for Claude edits and Codex patches; trackers and claimed branches are silent',
        skip: !posix,
        fn: () => project(REMIND, ({ root, home }) => {
            const hook = 'task-tracking-observer.cjs';
            assert.equal(launch(root, home, hook, edit(root, { file_path: path.join(root, 'trackers/hr.md') })), '', 'editing a tracker is the claim itself');
            const patch = '*** Begin Patch\n*** Update File: src/list.ts\n@@\n-a\n+b\n*** End Patch\n';
            const nudged = JSON.parse(launch(root, home, hook, edit(root, { command: patch }, 'apply_patch')));
            assert.match(nudged.hookSpecificOutput.additionalContext, /`src\/list.ts` changed on `feature\/x`/);
            assert.equal(launch(root, home, hook, edit(root, { file_path: path.join(root, 'src/other.ts') })), '', 'once per session and branch');
            git(root, ['switch', '-q', '-c', 'fix/y']);
            git(root, ['config', 'branch.fix/y.workClaim', 'SMP-261111-2']);
            assert.equal(launch(root, home, hook, edit(root, { file_path: path.join(root, 'src/list.ts') }, 'Write')), '', 'a claimed branch is silent');
        })
    },
    {
        name: 'TC-WCL-008 with workTracking absent nothing is said at all',
        skip: !posix,
        fn: () => project(null, ({ root, home }) => {
            assert.equal(launch(root, home, 'task-tracking-route.cjs', prompt(root)), '');
            assert.equal(launch(root, home, 'task-tracking-observer.cjs', edit(root, { file_path: path.join(root, 'src/list.ts') })), '');
        })
    },
    {
        name: 'TC-WCL-009 no nudge for a file Git ignores or for a helper agent; a quoted environment value still applies',
        skip: !posix,
        fn: () => project(REMIND, ({ root, home }) => {
            const hook = 'task-tracking-observer.cjs';
            write(root, '.gitignore', 'plans/\n');
            assert.equal(launch(root, home, hook, edit(root, { file_path: path.join(root, 'plans/next.md') })), '', 'an ignored file changes nothing tracked');
            assert.equal(launch(root, home, hook, { ...edit(root, { file_path: path.join(root, 'src/a.ts') }), agent_id: 'helper-1' }), '', 'a helper agent cannot ask the user');
            const nudged = JSON.parse(launch(root, home, hook, edit(root, { file_path: path.join(root, 'src/a.ts') })));
            assert.match(nudged.hookSpecificOutput.additionalContext, /`src\/a.ts` changed on `feature\/x`/, 'the main conversation is still nudged once');
            assert.equal(workClaim.resolveWorkTracking({ rootDir: root, homeDir: home, env: { CK_WORK_TRACKING_MODE: '"off"' } }).settings.mode, 'off');
        })
    }
];

module.exports = { name: 'work-claim', tests };
