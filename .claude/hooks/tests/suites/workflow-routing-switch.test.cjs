'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const routing = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-routing-config.cjs'));
const hook = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'workflow-route-inject.cjs'));
const catalogLib = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
const generator = require(path.join(PROJECT_DIR, '.claude', 'skills', 'ai-context-refresh', 'scripts', 'generate-claude-md.cjs'));

async function fixture(files, fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-'));
    try {
        for (const [relative, body] of Object.entries(files || {})) {
            const file = path.join(dir, relative);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, body, 'utf8');
        }
        return await fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// ── Routing payload cap (TC-WFR-*) ────────────────────────────────────────────────────────────
// The runtime payload must fit the host's hook-output cap (10,000 chars) with margin, so the model
// reads it whole instead of a truncated preview. Pinned at 9,500 by TC-WFR-001.
const PAYLOAD_CAP = 9500;
// Semantic anchor the wf-cycle W5 runtime check requires (verify-workflow-cycle-compliance.mjs).
const ADVANCEMENT_CLAUSE = /advance only after (?:all|every)(?: members?)? return/i;
const BARRIER_TOKEN = /\[[^\]]*∥[^\]]*\]/g;
const FIXTURE_GATE_BODY = 'FIXTURE-GATE-BODY: route before acting.';
const FIXTURE_GATE = `<!-- fixture gate -->\n\n${hook.GATE_MARKER}\n\n${FIXTURE_GATE_BODY}\n\n<!-- /CK:WORKFLOW-GATE -->\n`;
// A gate body as long as the shipped one (~3,900 chars), for cases where the root lacks the gate.
const FULL_SIZE_GATE = FIXTURE_GATE.replace(
    FIXTURE_GATE_BODY,
    `${FIXTURE_GATE_BODY}\n${'> Assess scope, risk and ambiguity, then declare the route.\n'.repeat(66)}`
);
const INDEX_POINTER = /Read `\.claude\/workflows\.json`[^\n]*`start-workflow <id>`/;
const COMPACT_HEADER = '| Workflow | Activation | When to use | Parallel phases |';
const GATE_FILE = '.claude/skills/shared/workflow-first-gate.md';
// A root file from a previous generation, still holding the retired route pointer block. The payload ignores root files.
const ROOT_WITH_POINTER = '# Project\n\n<!-- CK:WORKFLOW-ROUTE-POINTER -->\n\n> pointer\n\n<!-- /CK:WORKFLOW-ROUTE-POINTER -->\n';
// A root file from before the gate moved to the hook: it still holds the gate marker and body.
const ROOT_WITH_LEGACY_GATE = `# Project\n\n${hook.GATE_MARKER}\n\n> legacy gate\n\n<!-- /CK:WORKFLOW-GATE -->\n`;
const GROUPED_REGISTRY = JSON.stringify({
    version: '1.0.0',
    workflows: {
        'workflow-grouped': {
            name: 'Grouped', activation: 'confirm', whenToUse: 'review a change with parallel reviewers',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', 'review-a', 'review-b', 'review-c', 'finish'],
            parallelGroups: [{
                id: 'reviews', members: ['review-a', 'review-b', 'review-c'], conditionalMembers: ['review-c'], barrier: true
            }]
        },
        'workflow-plain': {
            name: 'Plain', whenToUse: 'do one plain thing',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', 'plain-step', 'finish']
        }
    }
});

/**
 * A registry sized past this framework's own: 30 workflows with long ids, hints past the cap,
 * 18 steps each over 40 distinct step skills, and an all-return barrier in every third workflow.
 */
function syntheticRegistry(count = 30, steps = 18) {
    const tiers = ['auto', 'confirm', 'manual'];
    const workflows = {};
    for (let index = 1; index <= count; index += 1) {
        const id = `workflow-synthetic-${String(index).padStart(2, '0')}-route`;
        const sequence = Array.from({ length: steps }, (_, step) => `synthetic-step-${String((index + step) % 40).padStart(2, '0')}`);
        const entry = {
            name: `Synthetic ${index}`,
            activation: tiers[index % tiers.length],
            whenToUse: 'user wants to run a long synthetic route with many clauses and words, check every hint is capped before it reaches the model, measure the payload against the host cap, and keep going with more words',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence
        };
        if (index % 3 === 0 && steps >= 8) {
            entry.parallelGroups = [{
                id: 'synthetic-gates', members: sequence.slice(5, 8), conditionalMembers: [sequence[7]], barrier: true
            }];
        }
        workflows[id] = entry;
    }
    return { version: '1.0.0', workflows };
}

/**
 * A registry whose rows are short in the tiers-only index but long wherever barrier marks render:
 * every workflow has one three-member all-return barrier with long step names.
 */
function wideGroupRegistry(count) {
    const workflows = {};
    for (let index = 1; index <= count; index += 1) {
        const members = [1, 2, 3].map(member => `parallel-reviewer-step-with-a-long-name-${index}-${member}`);
        workflows[`workflow-wide-${String(index).padStart(3, '0')}`] = {
            name: `Wide ${index}`,
            activation: 'confirm',
            whenToUse: 'review a change with three parallel reviewers',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', ...members, 'finish'],
            parallelGroups: [{ id: 'reviews', members, barrier: true }]
        };
    }
    return { version: '1.0.0', workflows };
}

/** Given/When helper: build the payload inside a clean fixture whose HOME and temp dirs point at it. */
async function isolatedFixture(files, fn) {
    return fixture(files, async dir => {
        const keys = ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP'];
        const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        for (const key of keys) process.env[key] = dir;
        try {
            return await fn(dir);
        } finally {
            for (const key of keys) {
                if (saved[key] === undefined) delete process.env[key];
                else process.env[key] = saved[key];
            }
        }
    });
}

/** Rows in the payload whose first cell is a workflow id. */
function workflowRow(payload, id) {
    return payload.split(/\r?\n/).find(line => line.startsWith(`| \`${id}\` |`));
}

// Self-checks of THIS repository's registry are gated on the shared synchronous framework-repo
// guard, so an adopter's own registry never fails them; the synthetic fixtures carry the portable
// size contract. The guard's parity with framework-repo.helper.mjs is the content-presence tripwire.
const FRAMEWORK_REPO_SKIP = require('../lib/framework-repo-guard.cjs').isFrameworkRepo(PROJECT_DIR)
    ? false
    : 'asserts the framework repo workflow registry only';

const config = value => JSON.stringify({ portability: { workflowAutoDetect: value } });
const input = (session, transcript) => ({
    hook_event_name: 'UserPromptSubmit', session_id: session, transcript_path: transcript, prompt: 'hello'
});
const writer = outputs => (text, done) => { outputs.push(text); done(true); };
// A stubbed resolver: the hook reads the mode from `resolveWorkflowRouteMode` and nothing else.
const stubMode = (mode, source = 'default') => ({ resolveWorkflowRouteMode: () => ({ mode, source }) });
// The resolver reads the developer's own environment and home by default; fixtures pass neither.
const hermetic = dir => ({ rootDir: dir, env: {}, homeDir: dir });

async function enabledRun({ root, store, session = 's1', transcript, now = 1000, content = 'route-v1', outputs = [] }) {
    return hook.run(input(session, transcript), {
        projectDir: root,
        storeRoot: store,
        now,
        content,
        routing: stubMode('ask'),
        write: writer(outputs)
    });
}

module.exports = {
    name: 'workflow-routing-switch',
    tests: [
        {
            name: '[workflow-routing-switch] TC-WRS-001 absent and malformed config default ON',
            fn: () => fixture({}, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), '{bad', 'utf8');
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                assertTrue(routing.readWorkflowAutoDetect({}) === true);
                assertTrue(routing.readWorkflowAutoDetect({ portability: { workflowAutoDetect: 'true' } }) === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-002 tracked team config opts in and out',
            fn: () => fixture({ 'docs/project-config.json': config(true) }, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === false);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-003 projectConfigPath relocation is honored',
            fn: () => fixture({
                '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/team.json' } }),
                'config/team.json': config(true),
                'docs/project-config.json': config(false)
            }, dir => {
                const resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.configPath === path.join(dir, 'config', 'team.json'));
                assertTrue(resolved.enabled === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-004 .claude local override wins both ways',
            fn: () => fixture({
                'docs/project-config.json': config(true),
                '.claude/.ck.local.json': config(false)
            }, dir => {
                const tracked = routing.resolveWorkflowAutoDetect({ ...hermetic(dir), scope: routing.SCOPE_TEAM });
                assertTrue(tracked.enabled === true);
                assertTrue(tracked.source === routing.SOURCE_PROJECT_CONFIG);
                let resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.enabled === false);
                assertTrue(resolved.source === routing.SOURCE_LOCAL_OVERRIDE);
                assertTrue(resolved.localPath === path.join(dir, '.claude', '.ck.local.json'));
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), config(true));
                resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.enabled === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-005 malformed local file falls through to team',
            fn: () => fixture({
                'docs/project-config.json': config(true), '.claude/.ck.local.json': '{bad'
            }, dir => assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true))
        },
        {
            name: '[workflow-routing-switch] TC-WRS-006 both schemas declare a boolean switch',
            fn: () => {
                const { CK_SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                assertTrue(CK_SCHEMA.portability.properties.workflowAutoDetect.type === 'boolean');
                assertTrue(SCHEMA.portability.properties.workflowAutoDetect.type === 'boolean');
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-007 portable local file is git-ignored',
            fn: () => {
                const ignored = execFileSync('git', ['check-ignore', '-v', '.claude/.ck.local.json'], {
                    cwd: PROJECT_DIR, encoding: 'utf8'
                });
                assertContains(ignored, '.claude/.gitignore');
                assertContains(ignored, '/.ck.local.json');
            }
        },
        {
            // Intent: an opt-out must reach the model even though the tracked gate, skill descriptions and
            // skill-level next-step workflow suggestions still say "auto-select" — a silent hook let them win.
            // TC-WFR-005: the payload cap work leaves the OFF notice path unchanged.
            name: '[workflow-routing-switch] TC-WRS-008 TC-WFR-005 disabled hook delivers the OFF notice once, never the gate or catalog',
            fn: async () => fixture({}, async dir => {
                // Given routing resolves OFF for this checkout
                const store = path.join(dir, 'state');
                const outputs = [];
                const offRun = now => hook.run(input('off'), {
                    projectDir: dir, storeRoot: store, now,
                    routing: stubMode('off', 'environment'),
                    write: writer(outputs)
                });
                // When the first prompt arrives
                const first = await offRun(1000);
                // Then the notice supersedes auto-select, keeps explicit requests and quality gates, and carries no route payload
                assertContains(first, hook.OFF_START);
                assertContains(first, 'Workflow auto-routing is OFF');
                assertContains(first, 'overrides every auto-select instruction');
                assertContains(first, 'skip that step and continue the skill');
                assertContains(first, 'only when the user explicitly asks');
                assertContains(first, 'Every quality gate');
                assertNotContains(first, '<!-- CK:WORKFLOW-GATE -->', 'the OFF notice must not re-deliver the gate');
                assertNotContains(first, '## Workflow & Skills Catalog', 'the OFF notice must not deliver the catalog');
                // And a second prompt in the same session is deduplicated
                assertTrue(await offRun(2000) === '', 'the OFF notice must deduplicate like the full payload');
                assertTrue(outputs.length === 1);
            })
        },
        {
            // Intent: the notice skips only a step that would START a workflow; a step that merely OFFERS one to the
            // user stays as written, and nothing the assistant chooses for routing is started (BR-WFR-08).
            name: '[workflow-routing-switch] TC-WRS-008 the OFF notice skips only workflow-starting steps and never lets a workflow or routing skill start',
            fn: async () => fixture({}, async dir => {
                const notice = await hook.run(input('off-wording'), {
                    projectDir: dir, storeRoot: path.join(dir, 'state'), now: 1000,
                    routing: stubMode('off', 'environment'), write: writer([])
                });
                // Every way the assistant could start a workflow by itself is forbidden
                assertContains(notice, 'Do not choose or start a workflow yourself');
                assertContains(notice, 'not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow');
                // A step that only offers a workflow to the user is not skipped
                assertContains(notice, 'A step that only offers a workflow to the user as an option stays as written');
                assertNotContains(notice, 'recommends switching to a workflow', 'a recommending step is not skipped wholesale');
                // The skill exception matches the documented wording: the one skill the user names
                assertContains(notice, 'or the one skill the user names');
                assertNotContains(notice, 'no skill you chose for routing');
                // And the only `off` payload stays short
                assertTrue(notice.length < 1500, `the OFF notice is ${notice.length} chars`);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-024 flipping the switch re-delivers the other form in the same session',
            fn: async () => fixture({}, async dir => {
                // Given one session and a switch the developer flips between prompts
                const store = path.join(dir, 'state');
                let enabled = true;
                const runAt = now => hook.run(input('flip'), {
                    projectDir: dir, storeRoot: store, now, content: 'route-v1',
                    routing: stubMode(enabled ? 'ask' : 'off'),
                    write: writer([])
                });
                assertContains(await runAt(1000), 'route-v1');
                // When routing is switched off, then back on
                enabled = false;
                const off = await runAt(2000);
                enabled = true;
                const on = await runAt(3000);
                // Then each change reaches the model instead of being suppressed by the earlier delivery
                assertContains(off, hook.OFF_START, 'switching OFF must deliver the notice');
                assertContains(on, 'route-v1', 'switching back ON must re-deliver the route payload');
            })
        },
        {
            // Intent: a developer-local opt-out must win over a team config that still stamps the gate into CLAUDE.md.
            name: '[workflow-routing-switch] TC-WRS-025 team ON with a local OFF override delivers the OFF notice through the real resolver',
            fn: async () => fixture({
                'docs/project-config.json': config(true),
                '.claude/.ck.local.json': config(false)
            }, async dir => {
                // Given the team keeps routing ON and this checkout's git-ignored override turns it OFF
                const store = path.join(dir, 'state');
                // When a prompt arrives and the hook resolves the switch itself (no stubbed resolver)
                const out = await hook.run(input('local-off'), { projectDir: dir, storeRoot: store, env: {}, homeDir: dir, write: writer([]) });
                // Then the model receives the OFF notice, not silence and not the route payload
                assertContains(out, hook.OFF_START);
                assertNotContains(out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-009 enabled hook delivers once then deduplicates',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                const outputs = [];
                assertContains(await enabledRun({ root: dir, store, outputs }), 'route-v1');
                assertTrue(await enabledRun({ root: dir, store, outputs, now: 2000 }) === '');
                assertTrue(outputs.length === 1);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-010 content hash change re-arms delivery',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                await enabledRun({ root: dir, store });
                assertContains(await enabledRun({ root: dir, store, content: 'route-v2', now: 2000 }), 'route-v2');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-011 4.5 MB transcript growth re-arms delivery',
            fn: async () => fixture({ 'history.jsonl': '' }, async dir => {
                const store = path.join(dir, 'state');
                const transcript = path.join(dir, 'history.jsonl');
                await enabledRun({ root: dir, store, transcript });
                fs.truncateSync(transcript, hook.SETTINGS.reinjectAfterBytes);
                assertContains(await enabledRun({ root: dir, store, transcript, now: 2000 }), 'route-v1');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-012 transcript shrink re-arms after context replacement',
            fn: async () => fixture({ 'history.jsonl': '1234567890' }, async dir => {
                const store = path.join(dir, 'state');
                const transcript = path.join(dir, 'history.jsonl');
                await enabledRun({ root: dir, store, transcript });
                fs.truncateSync(transcript, 2);
                assertContains(await enabledRun({ root: dir, store, transcript, now: 2000 }), 'route-v1');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-013 blind sessions stay deduplicated and session isolation re-arms',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                await enabledRun({ root: dir, store, session: 'a', now: 1000 });
                assertContains(await enabledRun({ root: dir, store, session: 'b', now: 1100 }), 'route-v1');
                assertTrue(await enabledRun({ root: dir, store, session: 'a', now: 86400000 }) === '');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-014 output failure is nonblocking and releases its lock',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                const first = await hook.run(input('writer-failure'), {
                    projectDir: dir,
                    storeRoot: store,
                    content: 'route-v1',
                    routing: stubMode('ask'),
                    write: () => { throw new Error('simulated output failure'); }
                });
                assertTrue(first === '');
                assertContains(await enabledRun({ root: dir, store, session: 'writer-failure', now: 2000 }), 'route-v1');
            })
        },
        {
            // Intent (BR-WFR-03): the route text exists only in the hook payload. A root file that also carried
            // it would contradict a person's `auto` or `off` mode, so the tracked files hold no route text at all.
            name: '[workflow-routing-switch] TC-WRS-015 tracked outputs carry no route text and the runtime payload has the gate and catalog',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                for (const relative of ['CLAUDE.md', 'AGENTS.md']) {
                    const text = fs.readFileSync(path.join(PROJECT_DIR, relative), 'utf8');
                    assertNotContains(text, '<!-- CK:WORKFLOW-ROUTE-POINTER -->', `${relative} must carry no route pointer`);
                    assertNotContains(text, '<!-- CK:WORKFLOW-GATE -->', `${relative} must not carry the route gate body`);
                    assertNotContains(text, '**Workflow question**', `${relative} must not carry route rules`);
                    assertNotContains(text, '<!-- CK:WORKFLOW-SKILLS -->', `${relative} must not carry the route catalog`);
                    assertNotContains(text, '[MANDATORY FIRST ACTION]', `${relative} must not mandate route selection`);
                }
                assertTrue(!fs.existsSync(path.join(PROJECT_DIR, '.codex', 'CODEX_CONTEXT.md')), 'the retired Codex context file is gone');
                const payload = hook.buildInjection(PROJECT_DIR);
                assertContains(payload, '<!-- CK:WORKFLOW-GATE -->');
                assertContains(payload, '## Workflow & Skills Catalog');
                // A root from a previous generation loses its pointer and gate blocks on regeneration, whatever the team mode
                for (const root of [ROOT_WITH_POINTER, ROOT_WITH_LEGACY_GATE]) {
                    const cleaned = generator.cleanLegacyManagedBlocks(root);
                    assertNotContains(cleaned, '<!-- CK:WORKFLOW-ROUTE-POINTER -->', 'a regenerated root holds no pointer');
                    assertNotContains(cleaned, '<!-- CK:WORKFLOW-GATE -->', 'a regenerated root holds no gate');
                    assertContains(cleaned, '# Project', 'project text survives');
                }
                assertTrue(typeof generator.stampHeader === 'undefined', 'the generator no longer stamps a route pointer');
            }
        },
        {
            // Intent (BR-WFR-06): the runtime payload a hook-running host adds before each prompt tells the
            // model to ask the one workflow question before starting a self-matched workflow of ANY tier
            // (the `auto` row included), and that an explicit request needs no question. With no root file
            // the full shipped gate carries it; with a root file the gate collapses to a pointer and the
            // catalog's tier legend still carries it, so no payload form lets a tier start on its own.
            name: '[workflow-routing-switch] TC-WRS-026 TC-WFR-012 runtime payload asks the workflow question before any tier starts',
            fn: () => {
                const shippedGate = fs.readFileSync(path.join(PROJECT_DIR, GATE_FILE), 'utf8');
                const STALE_SELF_START = /route gate may select and start it|never self-start a `manual`|ask once before self-starting/;
                return isolatedFixture({ '.claude/workflows.json': GROUPED_REGISTRY, [GATE_FILE]: shippedGate }, async noRoot => {
                    // Given an `auto` and a `confirm` workflow and no root instruction file
                    // When the runtime payload is built in the default `ask` mode
                    const full = hook.buildInjection(noRoot);
                    // Then the full gate asks the three-option question for every tier and exempts explicit requests
                    assertContains(full, '**Workflow question** (every tier)');
                    assertContains(full, '(a) the full workflow `<id>`');
                    assertContains(full, '(b) a slimmer custom route listing its steps, keeping every required gate');
                    assertContains(full, '(c) execute directly, no workflow or skill');
                    assertContains(full, 'runs any tier with no question');
                    assertContains(full, 'before you start a catalog workflow, in every tier; a direct, single-skill or custom-simple route asks nothing');
                    assertContains(full, 'ask the workflow question (below) only when YOUR route is to start a catalog workflow');
                    assertContains(full, 'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking');
                    assertNotContains(full, 'a route that matches a catalog workflow', 'a matched-but-downgraded route must not be told to ask');
                    assertTrue(Boolean(workflowRow(full, 'workflow-plain')), 'the auto-tier row must be listed');
                    assertTrue(!STALE_SELF_START.test(full), 'the payload must not let a tier start on its own');
                    // And root files that carry only the pointer never shrink it: the gate is always in the payload
                    await isolatedFixture({
                        '.claude/workflows.json': GROUPED_REGISTRY,
                        [GATE_FILE]: shippedGate,
                        'CLAUDE.md': ROOT_WITH_POINTER,
                        'AGENTS.md': ROOT_WITH_POINTER
                    }, withRoot => {
                        const withPointer = hook.buildInjection(withRoot);
                        assertContains(withPointer, '**Workflow question** (every tier)');
                        assertContains(withPointer, 'An explicit request runs every tier with no question');
                        assertTrue(!STALE_SELF_START.test(withPointer), 'the payload must not let a tier start on its own');
                    });
                    // And in `auto` mode the question is gone: a matched workflow starts by its tier
                    const auto = hook.buildInjection(noRoot, '', 'auto');
                    assertNotContains(auto, '**Workflow question**', 'mode auto must not ask the workflow question');
                    assertNotContains(auto, 'before you start a catalog workflow, in every tier', 'the tier legend must not say every tier asks');
                    assertNotContains(auto, 'NEVER starts before the answer', 'mode auto must not forbid a matched workflow from starting');
                    assertContains(auto, '**Workflow start** (mode auto)');
                    assertContains(auto, '`manual` never starts on your own');
                    assertContains(auto, '`manual` never starts on your own: name it in your route declaration and take (b) or (c)');
                    assertContains(auto, 'Mid-session: never auto-activate a workflow.');
                    assertContains(auto, 'An explicit request (as above; `$workflow-*` on Codex) runs any tier with no question');
                });
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-016 custom route protocol resolves team then local-override, local wins',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: 'TEAM RULE' } }),
                'docs/extra.md': 'EXTRA FILE RULE'
            }, dir => {
                let resolved = routing.resolveWorkflowRouteProtocol({ rootDir: dir });
                assertTrue(resolved.text === 'TEAM RULE', 'team inline protocol must resolve');
                assertTrue(resolved.source === routing.SOURCE_PROJECT_CONFIG);
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE');

                fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'),
                    JSON.stringify({ portability: { workflowRouteProtocol: { text: 'LOCAL RULE', path: 'docs/extra.md' } } }), 'utf8');
                resolved = routing.resolveWorkflowRouteProtocol({ rootDir: dir });
                assertTrue(resolved.text === 'LOCAL RULE\n\nEXTRA FILE RULE', 'local text+file protocol must win and concatenate');
                assertTrue(resolved.source === routing.SOURCE_LOCAL_OVERRIDE);
                assertTrue(resolved.overriddenLocally === true);
                assertTrue(routing.resolveWorkflowRouteProtocol({ rootDir: dir, scope: routing.SCOPE_TEAM }).text === 'TEAM RULE');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-017 escaping or malformed protocol layer expresses no opinion',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: 'TEAM RULE' } }),
                '.claude/.ck.local.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: '../escape.md' } } })
            }, dir => {
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'escaping path falls through to team');
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), '{bad', 'utf8');
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'malformed local falls through to team');
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'),
                    JSON.stringify({ portability: { workflowRouteProtocol: 42 } }), 'utf8');
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'non-string/non-object falls through to team');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-018 absent protocol adds no block and a configured protocol is marker-wrapped',
            fn: () => {
                const plain = hook.buildInjection(PROJECT_DIR);
                assertNotContains(plain, hook.PROTOCOL_START, 'no protocol configured must add no block');
                const withProtocol = hook.buildInjection(PROJECT_DIR, 'Custom rule: prefer direct execution.');
                assertContains(withProtocol, hook.PROTOCOL_START);
                assertContains(withProtocol, 'Custom rule: prefer direct execution.');
                assertContains(withProtocol, hook.PROTOCOL_END);
                assertTrue(hook.buildProtocolSection('   ') === '', 'blank protocol must render no block');
                assertTrue(hook.buildProtocolSection('x').startsWith(hook.PROTOCOL_START));
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-019 both schemas declare the route-protocol union',
            fn: () => {
                const { CK_SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { SCHEMA, validateConfig } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                for (const schema of [CK_SCHEMA, SCHEMA]) {
                    const field = schema.portability.properties.workflowRouteProtocol;
                    assertTrue(Array.isArray(field.oneOf), 'workflowRouteProtocol must declare a union');
                    assertTrue(field.oneOf.some(alt => alt.type === 'string') && field.oneOf.some(alt => alt.type === 'object'));
                }
                assertTrue(validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: 'rule' } }).valid);
                const missing = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: 'docs/does-not-exist.md' } } });
                assertTrue(missing.valid && missing.warnings.some(w => w.includes('workflowRouteProtocol.path')), 'missing file is a warning, not an error');
                const bad = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: '../x.md' } } });
                assertTrue(!bad.valid && bad.errors.some(error => error.includes('workflowRouteProtocol.path')), 'escaping path must fail closed');
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-020 hook payload carries the custom protocol and re-arms on change',
            fn: async () => {
                const store = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-proto-run-'));
                try {
                    const runWith = (protocol, now) => hook.run(input('proto-session'), {
                        projectDir: PROJECT_DIR, storeRoot: store, now, protocol,
                        routing: stubMode('ask'),
                        write: writer([])
                    });
                    const first = await runWith('PROTOCOL ALPHA', 1000);
                    assertContains(first, hook.PROTOCOL_START);
                    assertContains(first, 'PROTOCOL ALPHA');
                    assertTrue(await runWith('PROTOCOL ALPHA', 2000) === '', 'identical protocol must deduplicate');
                    assertContains(await runWith('PROTOCOL BETA', 3000), 'PROTOCOL BETA');
                } finally {
                    fs.rmSync(store, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-021 canonical privacy policy refuses normalized sensitive protocol paths',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: '.env/' } } }),
                '.env': 'SECRET_TOKEN=do-not-inject'
            }, dir => {
                assertTrue(routing.readWorkflowRouteProtocol(dir) === '', 'a normalized .env path must express no opinion, not leak the file');
                const { validateConfig } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                const result = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: '.env/' } } });
                assertTrue(!result.valid && result.errors.some(e => e.includes('privacy-sensitive')), 'schema must fail closed on a sensitive path');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-022 oversized protocol file is truncated to a bounded payload',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: 'docs/big.md' } } }),
                'docs/big.md': 'A'.repeat(routing.MAX_PROTOCOL_FILE_BYTES + 5000)
            }, dir => {
                const text = routing.readWorkflowRouteProtocol(dir);
                assertTrue(text.length > 0, 'an oversized protocol must still resolve');
                assertTrue(text.length < routing.MAX_PROTOCOL_FILE_BYTES + 200, 'payload must be bounded near the cap');
                assertContains(text, `truncated at ${routing.MAX_PROTOCOL_FILE_BYTES} bytes`, 'truncation must be visible, not silent');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-023 missing and blank files stay fail-soft and physical escapes are refused',
            fn: () => {
                const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-physical-'));
                const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-outside-'));
                const configPath = path.join(root, 'docs', 'project-config.json');
                try {
                    fs.mkdirSync(path.dirname(configPath), { recursive: true });
                    const setPath = protocolPath => fs.writeFileSync(
                        configPath,
                        JSON.stringify({ portability: { workflowRouteProtocol: { path: protocolPath } } }),
                        'utf8'
                    );

                    setPath('docs/missing.md');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a missing protocol file must express no opinion');

                    fs.writeFileSync(path.join(root, 'docs', 'missing.md'), ' \n\t', 'utf8');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a blank protocol file must express no opinion');

                    fs.writeFileSync(path.join(outside, 'secret.md'), 'OUTSIDE_SECRET', 'utf8');
                    const escape = path.join(root, 'docs', 'escape');
                    fs.symlinkSync(outside, escape, process.platform === 'win32' ? 'junction' : 'dir');
                    setPath('docs/escape/secret.md');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a physical symlink/reparse escape must not be read');
                } finally {
                    fs.rmSync(root, { recursive: true, force: true });
                    fs.rmSync(outside, { recursive: true, force: true });
                }
            }
        },
        {
            // Intent: a payload over the host cap is cut to a preview, so the model routes on a fragment.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: a 30-workflow registry fits under 9,500 chars',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(30)),
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given a registry larger than the framework's own, in a project whose root carries the gate
                const registry = syntheticRegistry(30);
                // When the runtime payload is built
                const payload = hook.buildInjection(dir);
                // Then it fits the cap in the compact form and still names every workflow with its activation tier
                assertTrue(payload.length <= PAYLOAD_CAP, `payload is ${payload.length} chars, cap ${PAYLOAD_CAP}`);
                assertContains(payload, COMPACT_HEADER, 'a payload that fits must keep the compact catalog, not the index fallback');
                assertTrue(!INDEX_POINTER.test(payload), 'the pointer-only index is a fallback, never the default');
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    const row = workflowRow(payload, id);
                    assertTrue(Boolean(row), `missing row for ${id}`);
                    assertContains(row, `| ${workflow.activation} · 18 steps |`, `${id} must show its tier and step count`);
                }
            })
        },
        {
            // Intent: when the root lacks the gate, the gate body plus the compact catalog overflow the cap;
            // the payload must shrink to an index rather than be cut to a preview by the host.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 index-with-marks fallback: 30 workflows without a root gate fit under 9,500 chars',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(30)),
                [GATE_FILE]: FULL_SIZE_GATE
            }, dir => {
                // Given a 30-workflow registry, a full-size gate and no root instruction file
                const registry = syntheticRegistry(30);
                // When the runtime payload is built
                const payload = hook.buildInjection(dir);
                // Then it fits the cap as the index with parallel-phase marks
                assertTrue(payload.length <= PAYLOAD_CAP, `payload is ${payload.length} chars, cap ${PAYLOAD_CAP}`);
                assertNotContains(payload, COMPACT_HEADER, 'the compact catalog overflows here, so the index replaces it');
                // And it keeps the gate body, the advancement clause and the pointer to the registry
                assertContains(payload, hook.GATE_MARKER);
                assertContains(payload, FIXTURE_GATE_BODY, 'the gate body must stay when the root lacks it');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(payload), 'the index must point at .claude/workflows.json and start-workflow <id>');
                // And every workflow keeps its id and tier, with its barrier token when it declares one
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    const row = workflowRow(payload, id);
                    assertTrue(Boolean(row), `missing index row for ${id}`);
                    assertContains(row, `| ${workflow.activation} |`, `${id} must show its tier`);
                    const expected = (workflow.parallelGroups || []).length;
                    assertTrue((row.match(BARRIER_TOKEN) || []).length === expected, `${id}: expected ${expected} barrier token(s): ${row}`);
                }
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-001 pointer-only fallback drops workflow rows when even the index overflows',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(250, 3)),
                [GATE_FILE]: FULL_SIZE_GATE
            }, dir => {
                // Given 250 workflows, a full-size gate and no root instruction file
                // When the runtime payload is built
                const payload = hook.buildInjection(dir);
                // Then only the mandatory parts remain, under the cap
                assertTrue(payload.length <= PAYLOAD_CAP, `payload is ${payload.length} chars, cap ${PAYLOAD_CAP}`);
                assertContains(payload, FIXTURE_GATE_BODY, 'the gate body must stay when the root lacks it');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(payload), 'the pointer to the registry must stay');
                assertTrue(!workflowRow(payload, 'workflow-synthetic-01-route'), 'workflow rows are dropped at this size');
            })
        },
        {
            // Intent: BR-WFR-01's middle fallback. When the index with parallel-phase marks is still
            // over the cap, rows with tier only must be tried before every row is dropped.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 tiers-only index fallback: rows keep id and tier when the marked index overflows',
            fn: () => isolatedFixture({ [GATE_FILE]: FULL_SIZE_GATE }, dir => {
                // Given a full-size gate, no root instruction file, and a registry grown (measured with
                // the real builders, not a hard-coded count) until the marked index no longer fits
                const registryFile = path.join(dir, '.claude', 'workflows.json');
                let registry = null;
                let payload = '';
                let tiersBody = '';
                // Grow by ~25% per step: the tiers-only window spans many sizes, and each build costs time.
                for (let count = 1; count <= 400 && !payload; count += Math.max(1, Math.floor(count / 4))) {
                    registry = wideGroupRegistry(count);
                    fs.writeFileSync(registryFile, JSON.stringify(registry), 'utf8');
                    tiersBody = catalogLib.buildWorkflowPointerCatalog({ rootDir: dir, rows: 'tiers' });
                    const built = hook.buildInjection(dir);
                    if (built.includes(tiersBody)) payload = built;
                }
                assertTrue(Boolean(payload), 'precondition: some registry size lands on the tiers-only index');
                const overhead = payload.length - tiersBody.length;
                const groupsBody = catalogLib.buildWorkflowPointerCatalog({ rootDir: dir, rows: 'groups' });
                assertTrue(overhead + groupsBody.length > PAYLOAD_CAP,
                    `precondition: the marked index must overflow (${overhead + groupsBody.length} chars)`);
                // When the runtime payload is built (above)
                // Then it fits the cap as the tiers-only index
                assertTrue(payload.length <= PAYLOAD_CAP, `payload is ${payload.length} chars, cap ${PAYLOAD_CAP}`);
                assertNotContains(payload, COMPACT_HEADER, 'the compact catalog overflows here');
                // And every workflow keeps a two-column `| id | tier |` row with no barrier mark
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    assertTrue(workflowRow(payload, id) === `| \`${id}\` | ${workflow.activation} |`,
                        `${id}: expected a two-column tier row, got ${workflowRow(payload, id)}`);
                }
                const markedRows = payload.split(/\r?\n/).filter(line => line.startsWith('| `') && line.includes('∥'));
                assertTrue(markedRows.length === 0, `tiers-only rows carry no barrier mark: ${markedRows[0]}`);
                // And the gate body, the advancement clause and the pointer to the registry stay
                assertContains(payload, FIXTURE_GATE_BODY, 'the gate body must stay when the root lacks it');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(payload), 'the index must point at .claude/workflows.json and start-workflow <id>');
            })
        },
        {
            // Intent: BR-WFR-01 never drops a configured protocol to fit the cap; when the protocol alone
            // keeps the payload over it, the pointer-only form is still delivered with the protocol whole.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 a protocol larger than the cap is delivered whole with the pointer-only form',
            fn: () => isolatedFixture({
                '.claude/workflows.json': GROUPED_REGISTRY,
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given a small registry and a project protocol longer than the cap on its own
                const protocol = Array.from({ length: 400 }, (_, line) => `Project route rule ${line}: prefer the lean route.`).join('\n');
                assertTrue(protocol.length > PAYLOAD_CAP, `precondition: protocol is ${protocol.length} chars`);
                // When the runtime payload is built
                const payload = hook.buildInjection(dir, protocol);
                // Then the last form (no workflow rows) is returned, over the cap, with the protocol whole
                assertTrue(payload.length > PAYLOAD_CAP, `payload is ${payload.length} chars`);
                assertContains(payload, `${hook.PROTOCOL_START}\n${protocol}\n${hook.PROTOCOL_END}`, 'the protocol must be delivered whole');
                assertTrue(!workflowRow(payload, 'workflow-grouped') && !workflowRow(payload, 'workflow-plain'), 'no workflow rows');
                assertNotContains(payload, COMPACT_HEADER);
                // And the marker, the advancement clause and the pointer to the registry stay
                assertContains(payload, hook.GATE_MARKER);
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(payload), 'the pointer to the registry must stay');
            })
        },
        {
            // Intent: BR-WFR-01 says "at most 9,500": a payload of exactly the cap is kept, one more
            // character falls to the next form.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 a compact payload of exactly 9,500 chars is kept; 9,501 falls back, first without the step-skill names, then to the index',
            fn: () => isolatedFixture({
                '.claude/workflows.json': GROUPED_REGISTRY,
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given a protocol whose length is measured so the compact payload lands exactly on the cap
                // (the payload grows one character per protocol character)
                const base = hook.buildInjection(dir, 'x').length;
                assertTrue(base < PAYLOAD_CAP, `precondition: compact payload with a 1-char protocol is ${base} chars`);
                const exact = 'x'.repeat(1 + PAYLOAD_CAP - base);
                // When the payload is built at the cap and one character over it
                const atCap = hook.buildInjection(dir, exact);
                const overCap = hook.buildInjection(dir, `${exact}x`);
                // Then exactly 9,500 keeps the compact catalog with its step-skill names
                assertTrue(atCap.length === PAYLOAD_CAP, `payload is ${atCap.length} chars`);
                assertContains(atCap, COMPACT_HEADER, 'a payload at the cap must keep the compact catalog');
                assertContains(atCap, 'Step skills:', 'a payload at the cap keeps the step-skill names');
                // And 9,501 drops only the step-skill names: every workflow row stays, under the cap
                assertContains(overCap, COMPACT_HEADER, 'one over the cap keeps the compact rows');
                assertNotContains(overCap, 'Step skills:', 'one over the cap drops the step-skill names first');
                assertTrue(Boolean(workflowRow(overCap, 'workflow-grouped')) && Boolean(workflowRow(overCap, 'workflow-plain')), 'every row stays');
                assertTrue(overCap.length <= PAYLOAD_CAP, `fallback payload is ${overCap.length} chars`);
                // And a protocol too large even for the compact rows falls to the index, still under the cap
                const far = hook.buildInjection(dir, 'x'.repeat(PAYLOAD_CAP - base + 700));
                assertNotContains(far, COMPACT_HEADER, 'a payload far over the cap must fall back to the index');
                assertTrue(INDEX_POINTER.test(far), 'the fallback is the index');
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: this framework registry fits under 9,500 chars',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                // Given this repository's own registry and root instruction files
                const registry = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8'));
                // When the runtime payload is built
                const payload = hook.buildInjection(PROJECT_DIR);
                // Then it fits the cap and every workflow row is model-visible
                assertTrue(payload.length <= PAYLOAD_CAP, `payload is ${payload.length} chars, cap ${PAYLOAD_CAP}`);
                for (const id of Object.keys(registry.workflows)) {
                    assertTrue(Boolean(workflowRow(payload, id)), `missing row for ${id}`);
                }
            }
        },
        {
            // Intent (BR-WFR-03): the gate is delivered in full with the guidance, whatever the root files hold,
            // because the root files carry no route text any more; losing it would leave the route nowhere.
            name: '[workflow-routing-switch] [cap] TC-WFR-002 gate delivered in full whatever the root files hold',
            fn: async () => {
                // A directory at a root-file path is present but unreadable as a file on every OS
                // (chmod cannot make a file unreadable on Windows).
                const asDirectory = name => ({ [`${name}/.keep`]: '' });
                const layouts = [
                    { label: 'no root file', files: {} },
                    { label: 'CLAUDE.md without any route block', files: { 'CLAUDE.md': '# Project\n' } },
                    { label: 'CLAUDE.md and AGENTS.md carrying the pointer', files: { 'CLAUDE.md': ROOT_WITH_POINTER, 'AGENTS.md': ROOT_WITH_POINTER } },
                    { label: 'AGENTS.md alone carrying the pointer', files: { 'AGENTS.md': ROOT_WITH_POINTER } },
                    { label: 'CLAUDE.md from before the gate moved (still carrying the gate)', files: { 'CLAUDE.md': ROOT_WITH_LEGACY_GATE, 'AGENTS.md': ROOT_WITH_LEGACY_GATE } },
                    { label: 'CLAUDE.md present but unreadable', files: { ...asDirectory('CLAUDE.md'), 'AGENTS.md': ROOT_WITH_POINTER } }
                ];
                for (const { label, files } of layouts) {
                    await isolatedFixture({ '.claude/workflows.json': GROUPED_REGISTRY, [GATE_FILE]: FIXTURE_GATE, ...files }, dir => {
                        // Given a project whose root instruction files are: <label>
                        // When the runtime payload is built
                        const payload = hook.buildInjection(dir);
                        // Then the gate body and its marker are always delivered, never a pointer to a root file
                        assertContains(payload, hook.GATE_MARKER, `${label}: the gate marker must be delivered`);
                        assertContains(payload, FIXTURE_GATE_BODY, `${label}: the gate body must be delivered`);
                        assertNotContains(payload, 'The routing gate is in the root instruction file', `${label}: no pointer to a root-file gate`);
                        // And the barrier contract stays
                        assertContains(payload, '[review-a ∥ review-b ∥ review-c*]', `${label}: the parallel-phase marks stay`);
                        assertTrue(ADVANCEMENT_CLAUSE.test(payload), `${label}: the advancement clause must stay`);
                    });
                }
            }
        },
        {
            // Intent (BR-WFR-03): the gate file is the single home of the route rules; it holds no root pointer
            // block (no root file carries routing text) and keeps an `ask` variant that renders for each mode.
            name: '[workflow-routing-switch] [cap] TC-WFR-003 the gate file carries no root pointer block and keeps the ask lines',
            fn: () => {
                const gateFile = fs.readFileSync(path.join(PROJECT_DIR, GATE_FILE), 'utf8');
                assertNotContains(gateFile, 'CK:WORKFLOW-ROUTE-POINTER', 'the gate file carries no root pointer block');
                // The gate block keeps an ask variant and renders for each mode
                const ask = hook.renderGateForMode(gateFile, 'ask');
                const auto = hook.renderGateForMode(gateFile, 'auto');
                assertContains(ask, '**Workflow question** (every tier)');
                assertNotContains(ask, '**Workflow start** (mode auto)');
                assertContains(auto, '**Workflow start** (mode auto)');
                assertNotContains(auto, '**Workflow question**');
                for (const text of [ask, auto]) {
                    assertNotContains(text, 'CK:GATE-MODE', 'no fence line may reach the model');
                    assertContains(text, 'An explicit workflow request always runs, mid-session included');
                    assertContains(text, 'Mixed research and modification intent is a modification', 'the mixed-intent rule rides in the delivered gate');
                }
                // A gate text with no fences and no block (a project's own file) is returned whole
                assertTrue(hook.renderGateForMode('plain gate text\n', 'auto') === 'plain gate text');
            }
        },
        {
            // Intent: parallel phases are an execution contract; the compact catalog drops step lists but
            // must still tell the model which steps start together and that it waits for all of them.
            name: '[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept in a fixture with one grouped workflow',
            fn: () => isolatedFixture({
                '.claude/workflows.json': GROUPED_REGISTRY,
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given one workflow with one all-return barrier and one without
                // When the compact payload is built
                const payload = hook.buildInjection(dir);
                // Then the grouped row carries its barrier token, the plain row none, and the clause is present
                const grouped = workflowRow(payload, 'workflow-grouped');
                assertTrue((grouped.match(BARRIER_TOKEN) || []).length === 1, `expected one barrier token: ${grouped}`);
                assertContains(grouped, '[review-a ∥ review-b ∥ review-c*]');
                assertNotContains(grouped, 'investigate', 'compact rows must not carry the full step list');
                assertTrue((workflowRow(payload, 'workflow-plain').match(BARRIER_TOKEN) || []).length === 0, 'a plain workflow shows no barrier');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept for every grouped workflow in this framework registry',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                const { resolveAllWorkflowManifests } = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-manifest.cjs'));
                // Given this repository's registry, including groups declared inside variants
                const registry = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8'));
                // When the runtime payload is built
                const payload = hook.buildInjection(PROJECT_DIR);
                // Then each grouped row has at least one token per group, and the advancement clause is present
                let grouped = 0;
                for (const id of Object.keys(registry.workflows)) {
                    const groups = resolveAllWorkflowManifests(registry, id, { rootDir: PROJECT_DIR })
                        .reduce((sum, manifest) => sum + (manifest.parallelGroups || []).length, 0);
                    if (groups === 0) continue;
                    grouped += 1;
                    const tokens = (workflowRow(payload, id) || '').match(BARRIER_TOKEN) || [];
                    assertTrue(tokens.length >= groups, `${id}: expected ${groups} barrier token(s), found ${tokens.length}`);
                }
                assertTrue(grouped > 0, 'the registry declares at least one parallel group');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
            }
        },
        {
            // Intent: BR-WFR-09. A compaction drops the delivered reminder from the context, so the next prompt
            // must carry it again. Codex writes no `compact_boundary` subtype; its rollout records a compaction
            // as a top-level `{"type":"compacted"}` record, and only that record may re-arm delivery.
            name: '[workflow-routing-switch] TC-WFR-013 a Codex top-level compacted record re-arms the reminder, a nested one does not, and a Claude compact_boundary does',
            fn: () => isolatedFixture({}, async dir => {
                // Given a Codex rollout that starts with its session line, and a reminder delivered on the first prompt
                const store = path.join(dir, 'state');
                const rollout = path.join(dir, 'rollout.jsonl');
                const record = (type, payload, at) => `${JSON.stringify({ timestamp: new Date(at).toISOString(), type, payload })}\n`;
                fs.writeFileSync(rollout, record('session_meta', { id: 'codex-session' }, 500), 'utf8');
                const outputs = [];
                const prompt = now => enabledRun({ root: dir, store, session: 'codex-session', transcript: rollout, now, outputs });
                assertContains(await prompt(1000), 'route-v1', 'the first prompt receives the reminder');
                // When a second prompt arrives with no compaction since the delivery
                // Then it stays silent (already delivered)
                assertTrue(await prompt(2000) === '', 'no compaction since delivery → no repeat');
                // Boundary counter-case: "compacted" nested in another record's payload, or quoted in a message, is not a compaction
                fs.appendFileSync(rollout, record('response_item', { type: 'compacted', note: 'nested, not a record type' }, 2500), 'utf8');
                fs.appendFileSync(rollout, record('response_item', { type: 'message', content: 'the log says {"type":"compacted"} here' }, 2500), 'utf8');
                assertTrue(await prompt(3000) === '', 'a nested or quoted "compacted" must not re-arm the reminder');
                // When the rollout records a compaction as its own top-level record after the delivery
                fs.appendFileSync(rollout, record('compacted', { message: '', replacement_history: [] }, 3500), 'utf8');
                // Then the next prompt receives the reminder again, once
                assertContains(await prompt(4000), 'route-v1', 'a top-level Codex compaction must re-arm the reminder');
                assertTrue(await prompt(5000) === '', 'one compaction → one re-delivery');
                assertTrue(outputs.length === 2, `expected two deliveries, got ${outputs.length}`);
                // And on Claude, a `compact_boundary` record in the transcript re-arms the reminder the same way
                const transcript = path.join(dir, 'claude.jsonl');
                fs.writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } })}\n`, 'utf8');
                const claudePrompt = now => enabledRun({ root: dir, store, session: 'claude-session', transcript, now });
                assertContains(await claudePrompt(1000), 'route-v1', 'the first Claude prompt receives the reminder');
                assertTrue(await claudePrompt(2000) === '', 'no Claude compaction since delivery → no repeat');
                fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(2500).toISOString() })}\n`, 'utf8');
                assertContains(await claudePrompt(3000), 'route-v1', 'a Claude compact_boundary must re-arm the reminder');
            })
        }
    ]
};
