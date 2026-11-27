'use strict';

/**
 * Quality-skill reminder on prompts and tool results (hooks/quality-skill-remind.cjs) — guarded contracts:
 *   deliver    every genuine prompt gets the canonical digest before work. The first tool result in
 *              a scope without delivery gets it as PostToolUse additionalContext, never a decision;
 *   dedup      a repeat stays silent until 60 minutes, 250,000 estimated tokens, a compaction
 *              without a confirmed restore, or a changed digest;
 *   scope      each sub-agent scope gets its own delivery and its own compaction re-arms only it;
 *   silent     other events and a missing session id print and record nothing;
 *   off        `enabled: false` or CK_QUALITY_SKILL_REMINDER=0 prints and records nothing;
 *   fallback   the built-in digest equals the canonical `:reminder` body, which names every route
 *              (framework repo only);
 *   wiring     registered on UserPromptSubmit and PostToolUse for every tool (framework repo only).
 * Fixtures are temp projects removed in `finally`; the child process gets HOME/USERPROFILE/TMPDIR/
 * TEMP/TMP pointed at the fixture and every inherited CK_* key blanked.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const HOOK = path.join(HOOKS_DIR, 'quality-skill-remind.cjs');
const hook = require(HOOK);
const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SESSION = 'session-q';
const CANONICAL_REL = ['.claude', 'skills', 'shared', 'sync-inline-versions.md'];
const FIXTURE_BODY = '**Quality skills first:** fixture digest — why-review, changes-review, investigate --mode=debug.';
const FIXTURE_PROTOCOL = '**Shared protocols:** fixture goal and evidence digest.';
const ROUTES = [
    'investigate',
    'brainstorm',
    'plan',
    'test',
    'e2e-test',
    'integration-test',
    'performance-test',
    'changes-review',
    'why-review',
    'performance-review',
    'docs-manager',
    'prompt-enhance',
    'code-simplifier',
    'grill',
    'ui-design',
    'design-spec',
    'work-item --mode=mockup',
    'learn',
    'pull-request',
    'test-review',
    'workflow-review-changes',
    'investigate --mode=debug',
    'fix',
    'workflow-bugfix'
];

async function withFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-skill-remind-'));
    const project = path.join(root, 'project');
    const transcripts = path.join(root, 'transcripts');
    fs.mkdirSync(path.join(project, ...CANONICAL_REL.slice(0, -1)), { recursive: true });
    fs.mkdirSync(transcripts, { recursive: true });
    fs.writeFileSync(
        path.join(project, ...CANONICAL_REL),
        `# Shared\n\n## SYNC:quality-skill-routing:reminder\n\n${FIXTURE_BODY}\n\n---\n\n## SYNC:long-run-protocols:reminder\n\n${FIXTURE_PROTOCOL}\n\n---\n`
    );
    const fx = {
        root,
        project,
        main: path.join(transcripts, `${SESSION}.jsonl`),
        store: path.join(project, 'tmp', 'protocol-delivery'),
        sub(id) {
            const dir = path.join(transcripts, SESSION, 'subagents');
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `agent-${id}.jsonl`);
            if (!fs.existsSync(file)) fs.writeFileSync(file, '');
            return file;
        }
    };
    fs.writeFileSync(fx.main, '');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

function toolEvent(fx, extra = {}) {
    return {
        hook_event_name: 'PostToolUse',
        session_id: SESSION,
        transcript_path: fx.main,
        cwd: fx.project,
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
        ...extra
    };
}

function promptEvent(fx, extra = {}) {
    return { hook_event_name: 'UserPromptSubmit', session_id: SESSION, transcript_path: fx.main, cwd: fx.project, prompt: 'Trace this code path', ...extra };
}

function writeProjectSettings(fx, qualitySkillReminder) {
    const config = { project: { name: 'Fixture' }, qualitySkillReminder };
    const docs = path.join(fx.project, 'docs');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'project-config.json'), JSON.stringify(config));
    return config;
}

/** In-process run: project fixed, settings injected, output captured. */
function fire(fx, event, extra = {}) {
    return hook.run(event, { env: {}, projectDir: fx.project, rawSettings: {}, write: (_text, done) => done(true), ...extra });
}

const boundary = at => `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(at).toISOString() })}\n`;

function isolatedEnv(fx) {
    const env = { ...process.env, HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root, CLAUDE_PROJECT_DIR: fx.project };
    for (const key of Object.keys(env)) {
        if (/^CK_/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) env[key] = '';
    }
    return env;
}

function writeUniversalFixture(project) {
    const shared = path.join(project, '.claude', 'skills', 'shared');
    const projection = path.join(shared, 'protocols');
    const tags = ['fixture-goal', 'fixture-quality'];
    fs.mkdirSync(projection, { recursive: true });
    fs.writeFileSync(path.join(project, '.claude', '.ck.local.json'), JSON.stringify({ contextDelivery: { profile: 'compatible' } }));
    fs.writeFileSync(path.join(shared, 'protocol-groups.json'), JSON.stringify({ groups: { universal: { bins: tags.map(tag => [tag]) } } }));
    for (const tag of tags) fs.writeFileSync(path.join(projection, `${tag}.md`), tag);
    fs.writeFileSync(
        path.join(projection, 'index.json'),
        JSON.stringify({
            groups: ['universal'],
            tags: tags.map(tag => ({
                tag,
                group: 'universal',
                parts: [{ file: `.claude/skills/shared/protocols/${tag}.md` }]
            }))
        })
    );
}

const tests = [
    {
        name: '[quality-skill-remind] TC-QSR-001 the first tool result of a scope delivers the digest as PostToolUse context, then stays silent',
        fn: () =>
            withFixture(async fx => {
                // When the first tool result of the session arrives
                const payload = await fire(fx, toolEvent(fx));
                // Then the digest arrives as advisory context only
                const parsed = JSON.parse(payload);
                assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput'], 'no decision field');
                assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
                assert.ok(parsed.hookSpecificOutput.additionalContext.includes(FIXTURE_BODY));
                assert.ok(parsed.hookSpecificOutput.additionalContext.includes(FIXTURE_PROTOCOL));
                assert.ok(parsed.hookSpecificOutput.additionalContext.startsWith(hook.MARKER_START));
                // And any later tool result inside the window stays silent, whatever the tool
                assert.equal(await fire(fx, toolEvent(fx, { tool_name: 'Read' })), '');
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-002 tool results refresh at the default or project-configured growth threshold',
        fn: () =>
            withFixture(async fx => {
                assert.equal(hook.DEFAULT_REINJECT_TOKENS, 250000);
                assert.ok(await fire(fx, promptEvent(fx)), 'the prompt starts the tool refresh window');
                // One byte short of the window: still present
                fs.appendFileSync(fx.main, 'x'.repeat(hook.DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN - 1));
                assert.equal(await fire(fx, toolEvent(fx)), '', 'inside the window');
                // Exactly the window: delivered again, then silent
                fs.appendFileSync(fx.main, 'x');
                assert.ok(await fire(fx, toolEvent(fx)), 'at the window edge');
                assert.equal(await fire(fx, toolEvent(fx)), '', 'a new window starts');

                const reinjectAfterTokens = 32000;
                const config = writeProjectSettings(fx, { reinjectAfterTokens });
                const { validateConfig } = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
                const validation = validateConfig(config);
                assert.equal(validation.valid, true);
                assert.deepEqual(
                    validation.warnings.filter(warning => warning.includes('qualitySkillReminder')),
                    []
                );
                const scope = { session_id: 'team-growth' };
                const settings = { rawSettings: undefined, homeDir: fx.root };
                assert.ok(await fire(fx, promptEvent(fx, scope), settings));
                fs.appendFileSync(fx.main, 'x'.repeat(reinjectAfterTokens * BYTES_PER_TOKEN - 1));
                assert.equal(await fire(fx, toolEvent(fx, scope), settings), '', 'one byte below the configured threshold');
                fs.appendFileSync(fx.main, 'x');
                assert.ok(await fire(fx, toolEvent(fx, scope), settings), 'configured growth triggers before the default hour');
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-003 the default or configured clock threshold refreshes with or without history',
        fn: () =>
            withFixture(async fx => {
                const t1 = Date.parse('2026-01-01T00:00:00Z');
                const hour = 60 * 60 * 1000;
                for (const scope of [{}, { session_id: 'session-blind-clock', transcript_path: undefined }]) {
                    assert.ok(await fire(fx, promptEvent(fx, scope), { now: t1 }));
                    const event = toolEvent(fx, scope);
                    assert.equal(await fire(fx, event, { now: t1 + hour - 1 }), '', 'one millisecond short');
                    assert.equal(await fire(fx, event, { now: t1 + hour, write: (_text, done) => done(false) }), '', 'failed write');
                    const payload = await fire(fx, event, { now: t1 + hour });
                    assert.ok(payload.includes(FIXTURE_BODY) && payload.includes(FIXTURE_PROTOCOL), 'both digests at the hour');
                    assert.equal(await fire(fx, event, { now: t1 + hour + 1 }), '', 'successful delivery resets the clock');
                }
                const t2 = t1 + hour;
                // The primary host's compaction boundary
                fs.appendFileSync(fx.main, boundary(t2 + 30000));
                assert.ok(await fire(fx, toolEvent(fx), { now: t2 + 60000 }), 'unrestored compaction re-arms');
                assert.equal(await fire(fx, toolEvent(fx), { now: t2 + 61000 }), '');
                // The second host's top-level compaction record
                fs.appendFileSync(
                    fx.main,
                    `${JSON.stringify({ timestamp: new Date(t2 + 90000).toISOString(), ordinal: 3, type: 'compacted', payload: {} })}\n`
                );
                assert.ok(await fire(fx, toolEvent(fx), { now: t2 + 120000 }), 'unrestored Codex compaction re-arms');
                const canonical = path.join(fx.project, ...CANONICAL_REL);
                fs.writeFileSync(canonical, fs.readFileSync(canonical, 'utf8').replace(FIXTURE_PROTOCOL, 'changed shared protocol'));
                assert.ok((await fire(fx, toolEvent(fx), { now: t2 + 121000 })).includes('changed shared protocol'), 'changing only shared rules re-arms');

                const reinjectAfterMinutes = 3;
                writeProjectSettings(fx, { reinjectAfterMinutes });
                const scope = { session_id: 'team-clock', transcript_path: path.join(fx.root, 'team-clock.jsonl') };
                fs.writeFileSync(scope.transcript_path, '');
                const settings = { rawSettings: undefined, homeDir: fx.root };
                const deadline = t1 + reinjectAfterMinutes * 60000;
                assert.ok(await fire(fx, promptEvent(fx, scope), { ...settings, now: t1 }));
                assert.equal(await fire(fx, toolEvent(fx, scope), { ...settings, now: deadline - 1 }), '', 'one millisecond below the configured threshold');
                assert.ok(await fire(fx, toolEvent(fx, scope), { ...settings, now: deadline }), 'configured wall time triggers without growth');

                const invalid = writeProjectSettings(fx, { reinjectAfterMinutes: 0, reinjectAfterTokens: 2.5 });
                const { validateConfig } = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
                const { validateCkConfig } = require(path.join(HOOKS_DIR, 'lib', 'ck-config-schema.cjs'));
                for (const result of [validateConfig(invalid), validateCkConfig({ qualitySkillReminder: invalid.qualitySkillReminder })]) {
                    assert.equal(result.valid, false);
                    for (const key of ['reinjectAfterMinutes', 'reinjectAfterTokens']) {
                        assert.ok(result.errors.some(error => error.includes(`qualitySkillReminder.${key}`)));
                    }
                }
                fs.appendFileSync(scope.transcript_path, 'x'.repeat(3 * BYTES_PER_TOKEN));
                assert.equal(
                    await fire(fx, toolEvent(fx, scope), { ...settings, now: deadline + hour - 1 }),
                    '',
                    'invalid growth and time overrides both use their defaults'
                );
                assert.ok(await fire(fx, toolEvent(fx, scope), { ...settings, now: deadline + hour }));
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-004 compaction re-arms only its scope unless the complete bundle already restored it',
        fn: () =>
            withFixture(async fx => {
                const t1 = Date.parse('2026-01-01T00:00:00Z');
                const agent = id => toolEvent(fx, { agent_id: id });
                assert.ok(await fire(fx, toolEvent(fx), { now: t1 }), 'main scope');
                const transcript = fx.sub('a1');
                assert.ok(await fire(fx, agent('a1'), { now: t1 }), 'sub-agent scope');
                assert.equal(await fire(fx, agent('a1'), { now: t1 + 1000 }), '', 'deduplicated in that scope');
                // When the running sub-agent compacts (no host event reports it)
                fs.appendFileSync(transcript, boundary(t1 + 2000));
                // Then its next tool result restores the digest, and the main scope stays silent
                assert.ok(await fire(fx, agent('a1'), { now: t1 + 3000 }), 'sub-agent compaction re-arms it');
                assert.equal(await fire(fx, toolEvent(fx), { now: t1 + 3000 }), '', 'main scope unaffected');

                writeUniversalFixture(fx.project);
                const universal = require(path.join(HOOKS_DIR, 'lib', 'universal-delivery.cjs'));
                const restore = (bin, now) =>
                    universal.runHook(bin, {
                        input: { ...toolEvent(fx), hook_event_name: 'SessionStart', source: 'compact' },
                        projectRoot: fx.project,
                        now,
                        write: (_text, done) => done(true)
                    });
                fs.appendFileSync(fx.main, boundary(t1 + 4000));
                assert.ok(await restore(1, t1 + 4010), 'one bin was delivered');
                assert.ok(await fire(fx, toolEvent(fx), { now: t1 + 4100 }), 'an incomplete restore leaves the digest due');

                assert.ok(await restore(1, t1 + 6010));
                assert.ok(await restore(2, t1 + 6011));
                const binReceipt = path.join(fx.store, SESSION, 'main', 'universal-bin-1.json');
                const restoredReceipt = fs.readFileSync(binReceipt, 'utf8');
                fs.appendFileSync(fx.main, boundary(t1 + 6012));
                assert.equal(await fire(fx, toolEvent(fx), { now: t1 + 6100 }), '', 'a complete restore suppresses the immediate duplicate');
                assert.equal(fs.readFileSync(binReceipt, 'utf8'), restoredReceipt, 'consuming credit leaves the universal bin receipt intact');
                const hourAfterRestore = t1 + 6013 + 3600000;
                assert.equal(await fire(fx, toolEvent(fx), { now: hourAfterRestore - 1 }), '', 'credit is fresh one millisecond before the hour');
                assert.ok(await fire(fx, toolEvent(fx), { now: hourAfterRestore }), 'credit expires an hour after the restore, not the tool call');

                assert.ok(await restore(1, hourAfterRestore + 1000));
                assert.ok(await restore(2, hourAfterRestore + 1001));
                fs.appendFileSync(fx.main, boundary(hourAfterRestore + 1002));
                assert.equal(await fire(fx, toolEvent(fx), { now: hourAfterRestore + 1100 }), '', 'another complete restore can be credited');
                fs.appendFileSync(fx.main, boundary(hourAfterRestore + 2000));
                assert.ok(await fire(fx, toolEvent(fx), { now: hourAfterRestore + 2100 }), 'a new compaction cannot reuse already credited receipts');
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-005 other events, malformed input and a missing or blank session id stay silent and record nothing',
        fn: () =>
            withFixture(async fx => {
                const silent = [
                    ['PreToolUse', toolEvent(fx, { hook_event_name: 'PreToolUse' })],
                    ['host notice', promptEvent(fx, { prompt: '<task-notification>tool completed</task-notification>' })],
                    ['blank prompt', promptEvent(fx, { prompt: ' \n  ' })],
                    ['missing prompt', promptEvent(fx, { prompt: undefined })],
                    ['prompt without session id', promptEvent(fx, { session_id: undefined })],
                    ['SubagentStart', toolEvent(fx, { hook_event_name: 'SubagentStart', agent_id: 'a1' })],
                    ['missing session id', toolEvent(fx, { session_id: undefined })],
                    ['blank session id', toolEvent(fx, { session_id: '  ' })],
                    ['null', null],
                    ['array', []]
                ];
                for (const [label, event] of silent) assert.equal(await fire(fx, event), '', label);
                assert.equal(fs.existsSync(fx.store), false, 'no ledger store written');
                assert.ok(await fire(fx, toolEvent(fx)), 'the first served event still delivers');
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-006 switched off by settings or env: prints and records nothing',
        fn: () =>
            withFixture(async fx => {
                for (const event of [promptEvent(fx), toolEvent(fx)]) {
                    for (const value of [false, 'off', '0']) {
                        assert.equal(await fire(fx, event, { rawSettings: { enabled: value } }), '', `enabled: ${JSON.stringify(value)}`);
                    }
                    assert.equal(await fire(fx, event, { env: { [hook.ENV_SWITCH]: '0' } }), '', 'env switch');
                }
                assert.equal(fs.existsSync(fx.store), false, 'no ledger store written');
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-007 every genuine prompt gets the digest and starts the tool-result window across processes',
        fn: () =>
            withFixture(async fx => {
                const run = input =>
                    spawnSync(process.execPath, [HOOK], { cwd: fx.project, input, encoding: 'utf8', windowsHide: true, env: isolatedEnv(fx), timeout: 20000 });
                // Prompt delivery follows the same contract on hosts with and without a transcript.
                const expected = `${hook.MARKER_START}\n${FIXTURE_BODY}\n${hook.MARKER_END}\n`;
                for (const scope of [{}, { session_id: 'session-without-transcript', transcript_path: undefined }]) {
                    for (const prompt of ['Trace this code path', 'Plan the change']) {
                        const first = run(JSON.stringify(promptEvent(fx, { ...scope, prompt })));
                        assert.equal(first.status, 0, first.stderr);
                        assert.equal(first.stdout, expected, 'the prompt receives plain advisory context');
                        const tool = run(JSON.stringify(toolEvent(fx, scope)));
                        assert.equal(tool.status, 0, tool.stderr);
                        assert.equal(tool.stdout, '', 'a tool result shares the successful prompt delivery record');
                    }
                }
                for (const input of ['', 'not json', '[]']) {
                    const bad = run(input);
                    assert.equal(bad.status, 0, `exit 0 for ${JSON.stringify(input)}`);
                    assert.equal(bad.stdout, '', `no stdout for ${JSON.stringify(input)}`);
                }
            })
    },
    {
        name: '[quality-skill-remind] TC-QSR-008 the built-in digest equals the canonical reminder, which names every route (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : "asserts the framework repo's own canonical protocol (framework-repo signal)",
        fn: () => {
            const { readCanonicalProtocol } = require(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'canonical-protocol.cjs'));
            const reminder = readCanonicalProtocol(REPO_ROOT, hook.SYNC_TAG);
            const protocols = readCanonicalProtocol(REPO_ROOT, hook.PROTOCOL_TAG);
            assert.equal(hook.FALLBACK_BODY, reminder.trim(), 'fallback drifted from the canonical reminder');
            assert.equal(hook.FALLBACK_PROTOCOLS, protocols, 'shared protocol fallback drifted from canonical');
            assert.ok(protocols.length < 600, 'shared protocol guidance stays short');
            for (const route of ROUTES) assert.ok(reminder.includes('`' + route + '`'), route);
            assert.ok(reminder.length < 600, 'the digest stays small');
            const full = readCanonicalProtocol(REPO_ROOT, 'quality-skill-routing');
            for (const route of ROUTES) assert.ok(full.includes('`' + route + '`'), `full protocol names ${route}`);
            for (const route of new Set(ROUTES.map(command => command.split(' ')[0]))) {
                const skill = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', route, 'SKILL.md'), 'utf8');
                assert.ok(skill.split(/\r?\n/).includes(`name: ${route}`), `the digest names a registered skill: ${route}`);
            }
            // A pull request reaches the review workflow by the complexity of its changes; a simple one stays with changes-review.
            for (const [label, text] of [
                ['digest', reminder],
                ['full protocol', full]
            ]) {
                assert.match(text, /`changes-review`[^;]*simple pull request/, `${label}: a simple pull request routes to changes-review`);
                assert.match(text, /`workflow-review-changes`[^;]*complex/, `${label}: the review workflow is tied to complex changes`);
                assert.doesNotMatch(
                    text,
                    /`workflow-review-changes`[^;]*whole pull request or/,
                    `${label}: a whole pull request alone never selects the workflow`
                );
                // An issue, failure or bug is fixed through the fix skill or the bug-fix workflow, never patched ad hoc.
                assert.match(
                    text,
                    /`fix`[^.]*`workflow-bugfix`[^.]*never (by )?an ad hoc patch|never (by )?an ad hoc patch[^]*`fix`[^.]*`workflow-bugfix`/,
                    `${label}: fixes go through fix or workflow-bugfix`
                );
                // A fix repairs the cause; a workaround that hides it is not a fix.
                assert.match(text, /an ad hoc patch or (a )?workaround/, `${label}: workarounds are ruled out with ad hoc patches`);
            }
            assert.match(
                full,
                /bug-class prevention task \(`fix --mode=prevent`\) that reports sibling instances of the bug class and adds its strongest guard, structure-first with a `\/learn` lesson last once the user confirms, or records why none fits/,
                'the full protocol names the bug-class prevention task: siblings reported, strongest guard first, /learn last, user confirms'
            );
            const description = name => /^description: '(.*)'$/m.exec(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', name, 'SKILL.md'), 'utf8'))[1];
            assert.match(description('changes-review'), /simple pull request/, 'changes-review description owns simple pull requests');
            assert.match(description('workflow-review-changes'), /complex, risky or cross-module/, 'the workflow description is conditioned on complexity');
        }
    },
    {
        name: '[quality-skill-remind] TC-QSR-009 registered on UserPromptSubmit and PostToolUse (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : "asserts the framework repo's own settings (framework-repo signal)",
        fn: () => {
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
            const owns = group => group.hooks.some(h => h.command.includes('quality-skill-remind.cjs'));
            const post = settings.hooks.PostToolUse.filter(owns);
            assert.equal(post.length, 1, 'one PostToolUse registration');
            assert.equal(post[0].matcher, '*');
            const prompt = settings.hooks.UserPromptSubmit.filter(owns);
            assert.equal(prompt.length, 1, 'one UserPromptSubmit registration');
            assert.equal(prompt[0].matcher, undefined, 'all user prompts are eligible');
            for (const event of Object.keys(settings.hooks).filter(name => !['PostToolUse', 'UserPromptSubmit'].includes(name))) {
                assert.equal(settings.hooks[event].filter(owns).length, 0, `not registered on ${event}`);
            }
        }
    }
];

module.exports = { name: 'quality-skill-remind', tests };
