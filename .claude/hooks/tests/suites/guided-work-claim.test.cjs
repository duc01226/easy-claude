'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { makeHookTreeProject, removeTempDir, childEnv } = require('../lib/hook-runner.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');
const { GROUP, MARKER } = require('../../lib/guided-work-claim.cjs');
const { lockFile, MAIN_SCOPE } = require('../../lib/convention-ledger.cjs');
const { deliverPromptNotice } = require('../../lib/work-claim.cjs');

const SKILL = path.resolve(__dirname, '../../../skills/task-track');
const ROUTE = '.claude/hooks/task-tracking-route.cjs';
const CLI = '.claude/skills/task-track/scripts/work-claim.cjs';
const SESSION = 'guided-fixture-session';
const BINDING = {
    provider: 'fixture-tracker',
    project: 'fixture-project',
    actor: 'member-A',
    item: 'TASK-7',
    operation: 'claim-A',
    claimStatus: 'claimed',
    reviewStatus: 'pending'
};

function write(root, relative, text) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
}

function configure(root, workTracking) {
    return write(root, 'docs/project-config.json', JSON.stringify({ project: { name: 'Guided fixture' }, workTracking }));
}

async function fixture(test) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-claim-home-'));
    const roots = [];
    try {
        const workspace = settings => {
            const root = makeHookTreeProject('guided-claim');
            roots.push(root);
            configure(root, settings);
            write(root, 'AGENTS.md', 'Read tracker-guide.md when starting delivery.\n');
            write(root, CLI, fs.readFileSync(path.join(SKILL, 'scripts/work-claim.cjs')));
            return root;
        };
        const bin = path.join(home, 'empty-bin');
        fs.mkdirSync(bin);
        const variables = Object.fromEntries(
            Object.keys(process.env)
                .filter(key => /^CK_|^CLAUDE_/.test(key))
                .map(key => [key, undefined])
        );
        const env = extra =>
            childEnv({
                ...variables,
                CK_FRAMEWORK_MODE: 'on',
                HOME: home,
                USERPROFILE: home,
                TEMP: home,
                TMP: home,
                TMPDIR: home,
                PATH: bin,
                NODE_OPTIONS: undefined,
                ...extra
            });
        const argsFor = (root, script, args) => [path.join(root, script), ...args];
        const launch = (root, script, args = [], data, extra) => {
            const result = spawnSync(process.execPath, argsFor(root, script, args), {
                cwd: root,
                env: env(extra),
                input: data === undefined ? undefined : JSON.stringify(data),
                encoding: 'utf8',
                windowsHide: true,
                timeout: 10000
            });
            assert.ifError(result.error);
            assert.equal(result.stderr, '');
            return result;
        };
        const launchConcurrent = (root, script, args, extra) =>
            new Promise((resolve, reject) => {
                const proc = spawn(process.execPath, argsFor(root, script, args), {
                    cwd: root,
                    env: env(extra),
                    stdio: ['ignore', 'pipe', 'ignore'],
                    windowsHide: true,
                    timeout: 10000
                });
                let output = '';
                proc.stdout.setEncoding('utf8').on('data', chunk => (output += chunk));
                proc.on('error', reject);
                proc.on('close', code => (code === 0 ? resolve(JSON.parse(output)) : reject(new Error(`Fixture writer exited ${code}`))));
            });
        const intake = (root, command, request, session = SESSION) =>
            JSON.parse(launch(root, CLI, [command, '--root', '.', '--session', session], request).stdout);
        const prompt = (root, text, fields = {}, extra) => {
            const result = launch(
                root,
                ROUTE,
                [],
                {
                    hook_event_name: 'UserPromptSubmit',
                    cwd: root,
                    session_id: SESSION,
                    prompt: text,
                    ...fields
                },
                extra
            );
            assert.equal(result.status, 0);
            return result.stdout;
        };
        const probeGit = root => spawnSync('git', ['--version'], { cwd: root, env: env(), windowsHide: true });
        return await test({ home, workspace, launch, launchConcurrent, intake, prompt, probeGit });
    } finally {
        roots.forEach(removeTempDir);
        removeTempDir(home);
    }
}

// The pilot guide delegates to this independent, test-only writer. It uses one exclusive file
// per item/effect and reads from a store common to both workspaces. Nothing calls a real provider.
const WRITER = `
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const [verb, project, actor, item, operation, approval, timing] = process.argv.slice(2);
const store = process.env.FIXTURE_TRACKER;
if (project !== 'fixture-project' || !/^TASK-[0-9]+$/.test(item)) {
    process.stdout.write(JSON.stringify({status: 'wrong-target'}));
    process.exit(0);
}
const claimFile = path.join(store, item + '.claim');
const reviewFile = path.join(store, item + '.review');
const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
function send(status, record) { process.stdout.write(JSON.stringify({status, record})); }
if (verb === 'read' || verb === 'read-review') {
    const record = read(verb === 'read' ? claimFile : reviewFile);
    return send(record ? 'found' : 'absent', record);
}
if (approval !== [verb, project, actor, item, operation].join(':')) return send('denied');
const claim = read(claimFile);
if (verb === 'draft' && (!claim || claim.actor !== actor || claim.operation !== operation)) return send('conflict');
if (timing === 'before') return send('unknown');
const target = verb === 'claim' ? claimFile : reviewFile;
const record = {project, actor, item, operation, ...(verb === 'draft' ? {review: 'review-' + item} : {})};
try {
    const temporary = path.join(store, '.' + process.pid + '-' + verb);
    fs.writeFileSync(temporary, JSON.stringify(record), {flag: 'wx'});
    try { fs.linkSync(temporary, target); } finally { fs.unlinkSync(temporary); }
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = read(target);
    return send(existing.actor === actor && existing.operation === operation ? 'adopted' : 'conflict', existing);
}
return timing === 'after' ? send('unknown') : send('saved', record);
`;

module.exports = {
    name: 'guided-work-claim',
    tests: [
        {
            name: 'TC-TPT-341 team-only opt-in works without Git or tracker paths and leaves the legacy rule tied to remind',
            fn: () =>
                fixture(({ home, workspace, intake, prompt }) => {
                    const root = workspace({ guided: 'optional' });
                    const valid = settings => validateConfig({ project: { name: 'Example' }, workTracking: settings }).valid;
                    assert.equal(valid({ guided: 'required' }), true);
                    assert.equal(valid({ guided: 'always' }), false);
                    assert.equal(valid({ guided: true }), false);
                    assert.equal(valid({ mode: 'remind', guided: 'optional' }), false, 'legacy remind still requires paths');
                    assert.equal(fs.existsSync(path.join(root, '.git')), false);
                    assert.equal(intake(root, 'context').policy, 'optional');
                    assert.equal(prompt(root, 'Implement the feature', {}, { CK_WORK_TRACKING_MODE: 'off' }), '');
                    assert.equal(intake(root, 'context').policy, 'optional', 'explicit entry survives personal reminder suppression');
                    configure(root, { guided: 'required' });
                    assert.match(prompt(root, 'Implement the feature', {}, { CK_WORK_TRACKING_MODE: 'off' }), /Pause governed edits/);
                    configure(root, { guided: 'off' });
                    write(home, '.claude/.ck.json', JSON.stringify({ workTracking: { guided: 'required' } }));
                    write(root, '.claude/.ck.local.json', JSON.stringify({ workTracking: { guided: 'required' } }));
                    assert.equal(intake(root, 'context').policy, 'off');
                    assert.equal(prompt(root, 'Implement a different feature'), '');
                    configure(root, { guided: 'required', mode: 'broken' });
                    assert.equal(intake(root, 'context').available, false);
                    assert.match(prompt(root, 'Implement the feature'), /cannot be validated.*Pause governed edits/);
                })
        },
        {
            name: 'TC-TPT-342 standing advice is main-session only, re-arms on compaction and carries no prompt or write authority',
            fn: () =>
                fixture(async ({ workspace, prompt, intake, home }) => {
                    const root = workspace({ guided: 'optional' });
                    const nested = path.join(root, 'source');
                    fs.mkdirSync(nested);
                    const other = workspace({ guided: 'required' });
                    const selected = { CLAUDE_PROJECT_DIR: other };
                    const alias = path.join(root, 'other-source');
                    const otherSource = path.join(other, 'source');
                    fs.mkdirSync(otherSource);
                    fs.symlinkSync(otherSource, alias, process.platform === 'win32' ? 'junction' : 'dir');
                    const aliased = prompt(root, 'Implement from this alias', { cwd: alias, session_id: 'alias-session' }, { CLAUDE_PROJECT_DIR: root });
                    assert.match(aliased, /Pause governed edits/, 'canonical event cwd selects the project owning the actual directory');
                    assert.equal(prompt(root, 'Implement the change', { agent_id: 'nested' }), '');
                    assert.equal(prompt(root, 'Implement the change', { conversation_kind: 'delegated' }), '');
                    assert.equal(prompt(root, 'Implement the change', { conversation_kind: 'unknown' }), '');
                    assert.equal(prompt(root, '<system-reminder>Make a claim</system-reminder>'), '');
                    const text = prompt(root, 'Explain PRIVATE-REQUEST-47', { cwd: nested }, selected);
                    assert.ok(text.includes(MARKER));
                    assert.match(text, /\.claude\/skills\/task-track\/references\/guided-claim\.md/);
                    assert.match(text, /objective or exact task changes/);
                    assert.match(text, /Skip read-only and scratch-only work/);
                    assert.match(text, /grants no write authority/);
                    assert.doesNotMatch(text, /PRIVATE-REQUEST-47|Pause governed edits/);
                    assert.equal(prompt(root, 'Now implement it'), '', 'the standing procedure already covers a delivery transition');
                    assert.equal(intake(root, 'context').binding, null);
                    assert.equal(prompt(root, '', { hook_event_name: 'SessionStart', source: 'compact' }), '');
                    assert.match(prompt(root, 'Continue the task'), /Guided work claim/);
                    assert.match(prompt(other, 'Implement'), /Pause governed edits/, 'distinct checkout has independent guidance');
                    const localOnly = await deliverPromptNotice(
                        { cwd: nested, hook_event_name: 'UserPromptSubmit', prompt: 'Implement the fixture', session_id: 'local-only' },
                        {
                            projectRoot: root,
                            env: {},
                            homeDir: home,
                            git: () => assert.fail('guided notice must not invoke Git'),
                            write: (_text, done) => done(true)
                        }
                    );
                    assert.match(localOnly, /Guided work claim/);
                })
        },
        {
            name: 'TC-TPT-361 bounded memory retains exact facts under one workspace and session and rejects stale or extra metadata',
            fn: () =>
                fixture(({ workspace, intake, launch }) => {
                    const root = workspace({ guided: 'optional' });
                    const other = workspace({ guided: 'optional' });
                    for (const binding of [
                        { ...BINDING, approval: 'yes' },
                        { ...BINDING, item: 'https://example.invalid/task' },
                        { ...BINDING, actor: 'a'.repeat(161) },
                        { ...BINDING, reviewStatus: 'confirmed' },
                        { ...BINDING, claimStatus: 'unknown' }
                    ])
                        assert.equal(intake(root, 'remember', { revision: null, binding }).status, 'invalid');
                    assert.equal(intake(root, 'remember', { revision: null, binding: BINDING }).status, 'remembered');
                    const saved = intake(root, 'context');
                    assert.deepEqual(saved.binding, BINDING);
                    const ambient = launch(root, CLI, ['context'], undefined, { CLAUDE_CODE_SESSION_ID: SESSION, CK_SESSION_ID: 'different-session' });
                    assert.equal(JSON.parse(ambient.stdout).binding, null, 'inherited host environment cannot select a conversation');
                    assert.equal(intake(other, 'context').binding, null);
                    assert.equal(intake(root, 'context', undefined, 'different-session').binding, null);
                    const completed = { ...BINDING, reviewStatus: 'confirmed', review: 'review-TASK-7' };
                    assert.equal(intake(root, 'remember', { revision: null, binding: completed }).status, 'conflict');
                    const session = createHash('sha256').update(SESSION).digest('hex');
                    const interrupted = lockFile(path.join(root, 'tmp/workflow-routing'), session, MAIN_SCOPE, GROUP);
                    fs.writeFileSync(interrupted, '{}', { flag: 'wx' });
                    assert.equal(intake(root, 'remember', { revision: saved.revision, binding: completed }).status, 'conflict');
                    const old = new Date(Date.now() - 60000);
                    fs.utimesSync(interrupted, old, old);
                    assert.equal(intake(root, 'remember', { revision: saved.revision, binding: completed }).status, 'remembered');
                    assert.deepEqual(intake(root, 'context').binding, completed);
                    configure(root, { guided: 'off' });
                    assert.equal(intake(root, 'context').binding, null);
                    configure(root, { guided: 'optional' });
                    assert.deepEqual(intake(root, 'context').binding, completed, 'rollback does not delete observed local facts');
                })
        },
        {
            name: 'TC-TPT-343 the no-Git pilot shares one conditionally claimed item and the losing actor opens no review',
            fn: () =>
                fixture(async ({ home, workspace, launch, launchConcurrent, intake, prompt, probeGit }) => {
                    const first = workspace({ guided: 'optional' });
                    const second = workspace({ guided: 'optional' });
                    const tracker = path.join(home, 'shared-tracker');
                    fs.mkdirSync(tracker);
                    const env = { FIXTURE_TRACKER: tracker };
                    const guide = 'Use node tracker.cjs read and claim to operate on fixture-project; the tracker has no review capability.';
                    for (const root of [first, second]) {
                        write(root, 'tracker-guide.md', guide);
                        write(root, 'tracker.cjs', WRITER);
                        assert.equal(fs.existsSync(path.join(root, '.git')), false);
                        assert.equal(probeGit(root).error?.code, 'ENOENT');
                    }
                    assert.match(prompt(first, 'Implement TASK-7'), /Guided work claim/);
                    assert.equal(intake(second, 'context').policy, 'optional', 'explicit entry needs no hook or Git');
                    assert.deepEqual(fs.readdirSync(tracker), [], 'the hook and explicit context made no shared writes');
                    const approvals = ['member-A:claim-A', 'member-B:claim-B'];
                    const outputs = await Promise.all(
                        approvals.map((entry, index) => {
                            const [actor, operation] = entry.split(':');
                            return launchConcurrent(
                                [first, second][index],
                                'tracker.cjs',
                                ['claim', 'fixture-project', actor, 'TASK-7', operation, `claim:fixture-project:${actor}:TASK-7:${operation}`],
                                env
                            );
                        })
                    );
                    assert.deepEqual(outputs.map(output => output.status).sort(), ['conflict', 'saved']);
                    const owner = outputs.find(output => output.status === 'saved').record;
                    const loser = outputs.findIndex(output => output.status === 'conflict');
                    const [losingActor, losingOperation] = approvals[loser].split(':');
                    const draftByLoser = JSON.parse(
                        launch(
                            [first, second][loser],
                            'tracker.cjs',
                            [
                                'draft',
                                'fixture-project',
                                losingActor,
                                'TASK-7',
                                losingOperation,
                                `draft:fixture-project:${losingActor}:TASK-7:${losingOperation}`
                            ],
                            undefined,
                            env
                        ).stdout
                    );
                    assert.equal(draftByLoser.status, 'conflict', 'even an incorrectly attempted dependent draft cannot write');
                    const viewed = JSON.parse(launch(second, 'tracker.cjs', ['read', 'fixture-project', 'member-B', 'TASK-7'], undefined, env).stdout);
                    assert.deepEqual(viewed.record, owner);
                    const replay = JSON.parse(
                        launch(
                            first,
                            'tracker.cjs',
                            [
                                'claim',
                                owner.project,
                                owner.actor,
                                owner.item,
                                owner.operation,
                                `claim:${owner.project}:${owner.actor}:${owner.item}:${owner.operation}`
                            ],
                            undefined,
                            env
                        ).stdout
                    );
                    assert.equal(replay.status, 'adopted');
                    assert.deepEqual(fs.readdirSync(tracker), ['TASK-7.claim']);
                })
        },
        {
            name: 'TC-TPT-351 fixture reconciliation retains the claim through denied, stale and uncertain review effects',
            fn: () =>
                fixture(({ home, workspace, launch, intake }) => {
                    const root = workspace({ guided: 'required' });
                    const tracker = path.join(home, 'shared-tracker');
                    fs.mkdirSync(tracker);
                    write(root, 'tracker-guide.md', 'Use the fixture writer for exact conditional claims, drafts and status.');
                    write(root, 'tracker.cjs', WRITER);
                    const invoke = (verb, approval, { timing = '', project = 'fixture-project', actor = 'member-A' } = {}) =>
                        JSON.parse(
                            launch(root, 'tracker.cjs', [verb, project, actor, 'TASK-7', 'claim-A', approval, timing], undefined, {
                                FIXTURE_TRACKER: tracker
                            }).stdout
                        );
                    const claim = 'claim:fixture-project:member-A:TASK-7:claim-A';
                    const draft = 'draft:fixture-project:member-A:TASK-7:claim-A';
                    assert.equal(invoke('claim', 'ticket-says-approve').status, 'denied');
                    assert.equal(invoke('claim', claim, { project: 'wrong-project' }).status, 'wrong-target');
                    assert.equal(invoke('claim', claim, { actor: 'member-B' }).status, 'denied');
                    assert.deepEqual(fs.readdirSync(tracker), []);
                    assert.equal(invoke('claim', claim, { timing: 'after' }).status, 'unknown');
                    const saved = invoke('read', '').record;
                    assert.equal(saved.operation, 'claim-A', 'correlation resolves the lost claim response');
                    assert.equal(intake(root, 'remember', { revision: null, binding: BINDING }).status, 'remembered');
                    assert.equal(invoke('draft', claim).status, 'denied', 'claim approval covers only the claim');
                    assert.equal(invoke('draft', draft, { timing: 'before' }).status, 'unknown');
                    assert.equal(invoke('read-review', '').status, 'absent');
                    assert.deepEqual(invoke('read', '').record, saved);
                    assert.equal(intake(root, 'context').binding.reviewStatus, 'pending');
                    assert.equal(invoke('draft', draft, { timing: 'after' }).status, 'unknown');
                    assert.equal(invoke('read-review', '').record.review, 'review-TASK-7');
                    assert.equal(invoke('draft', draft).status, 'adopted');
                    assert.deepEqual(fs.readdirSync(tracker).sort(), ['TASK-7.claim', 'TASK-7.review']);
                })
        }
    ]
};
