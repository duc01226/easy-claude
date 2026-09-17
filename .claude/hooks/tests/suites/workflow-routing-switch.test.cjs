/**
 * Workflow Auto-Detect Routing Switch — `portability.workflowAutoDetect`
 *
 * The switch decides whether the framework's intent router is emitted at all. Its whole value is
 * that a project can turn route INFERENCE off without losing anything else, so these tests assert
 * both halves of that contract:
 *
 *   - OFF actually removes the router from every carrier (a half-disabled mode is the failure
 *     this feature exists to prevent: CLAUDE.md silent while the hook still injects "match the
 *     prompt against the workflow catalog" on every turn), and
 *   - OFF removes NOTHING else — the sentinel, the always-on protocol blocks, task planning,
 *     the parallel-wave rules and the project's own prose all survive.
 *
 * Coverage:
 *   TC-WRS-001 — resolver defaults and fail-open behaviour (absent / malformed / explicit config)
 *   TC-WRS-002 — resolver honours the `.ck.json` projectConfigPath override
 *   TC-WRS-003 — carrier 1 (CLAUDE.md): gate + skills catalog present ON, absent OFF
 *   TC-WRS-004 — carrier 1: everything unrelated to routing survives the OFF state
 *   TC-WRS-005 — carrier 1: the First Action Decision body tracks the switch, both directions,
 *                without touching the project's own paragraphs
 *   TC-WRS-006 — carrier 1: stamping is idempotent in both states
 *   TC-WRS-007 — carrier 2 (static workflow-execution protocol): routing steps present ON,
 *                replaced by a direct-execution step OFF, execution/quality steps kept in BOTH
 *   TC-WRS-008 — carrier 3 (Codex context): workflow protocol + catalog present ON, absent OFF
 *   TC-WRS-009 — the schema declares the property, so a project setting it does not fail validation
 *   TC-WRS-010 — the cascade: default -> team -> local override, later wins, both directions,
 *                and a broken layer never erases the layer below
 *   TC-WRS-011 — SCOPE: 'team' ignores the developer layer (tracked files stay clean),
 *                'effective' applies it (runtime honours the developer)
 *   TC-WRS-012 — the local override path follows a relocated projectConfigPath, and IS git-ignored
 *   TC-WRS-013 — carrier 2 declares it overrides a router still present in the tracked files,
 *                and only claims that when one actually is
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;

const routingConfig = require(
    path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-routing-config.cjs')
);
const generator = require(
    path.resolve(PROJECT_DIR, '.claude', 'skills', 'ai-context-refresh', 'scripts', 'generate-claude-md.cjs')
);
const protocol = require(
    path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'hookless-prompt-protocol.cjs')
);

const CLAUDE_MD = fs.readFileSync(path.resolve(PROJECT_DIR, 'CLAUDE.md'), 'utf8');

/** Render CLAUDE.md's stamped header in a chosen routing state. */
const stamp = workflowAutoDetect => generator.stampHeader(CLAUDE_MD, { workflowAutoDetect });

/** Build a throwaway repo root carrying just the files the resolver reads. */
function withFixture(files, fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-'));
    try {
        for (const [relative, contents] of Object.entries(files)) {
            const target = path.join(dir, relative);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, contents, 'utf8');
        }
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const configWith = portability => JSON.stringify({ portability });

module.exports = {
    name: 'workflow-routing-switch',
    tests: [
        {
            name: '[workflow-routing-switch] TC-WRS-001 resolver defaults to ON and fails open',
            fn: () => {
                const { readWorkflowAutoDetect, isWorkflowAutoDetectEnabled } = routingConfig;

                // Only a literal false disables. Everything else — including an absent key, an
                // absent portability block, and a non-boolean — keeps routing on.
                assertTrue(readWorkflowAutoDetect({ portability: { workflowAutoDetect: false } }) === false,
                    'explicit false must disable routing');
                assertTrue(readWorkflowAutoDetect({ portability: { workflowAutoDetect: true } }) === true,
                    'explicit true must enable routing');
                assertTrue(readWorkflowAutoDetect({ portability: {} }) === true,
                    'absent key must default to enabled');
                assertTrue(readWorkflowAutoDetect({}) === true,
                    'absent portability block must default to enabled');
                assertTrue(readWorkflowAutoDetect(null) === true,
                    'null config must default to enabled');
                // A truthy-but-not-false value is not an off switch. Guards against a project
                // writing "false" as a string and silently believing routing is disabled.
                assertTrue(readWorkflowAutoDetect({ portability: { workflowAutoDetect: 'false' } }) === true,
                    'the string "false" must NOT disable routing — only the boolean does');

                // Fail OPEN on I/O and parse failures: stripping the router because a file is
                // missing or broken would change routing behaviour invisibly.
                withFixture({}, dir => {
                    assertTrue(isWorkflowAutoDetectEnabled({ rootDir: dir }) === true,
                        'a missing project config must fail open (routing enabled)');
                });
                withFixture({ 'docs/project-config.json': '{ this is not json' }, dir => {
                    assertTrue(isWorkflowAutoDetectEnabled({ rootDir: dir }) === true,
                        'a malformed project config must fail open (routing enabled)');
                });
                withFixture({ 'docs/project-config.json': configWith({ workflowAutoDetect: false }) }, dir => {
                    assertTrue(isWorkflowAutoDetectEnabled({ rootDir: dir }) === false,
                        'a config with workflowAutoDetect:false must disable routing');
                });
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-002 resolver honours the .ck.json projectConfigPath override',
            fn: () => {
                // A project that relocates its config must not silently lose the switch: the
                // resolver would read the default path, find nothing, fail open, and report
                // routing ON while the real config says OFF.
                withFixture({
                    '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/pc.json' } }),
                    'config/pc.json': configWith({ workflowAutoDetect: false }),
                    // A decoy at the default location proves the override is what was read.
                    'docs/project-config.json': configWith({ workflowAutoDetect: true }),
                }, dir => {
                    assertTrue(routingConfig.resolveProjectConfigPath(dir) === path.join(dir, 'config/pc.json'),
                        'the .ck.json override must win over the default config path');
                    assertTrue(routingConfig.isWorkflowAutoDetectEnabled({ rootDir: dir }) === false,
                        'the switch must be read from the overridden config path, not the decoy');
                });
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-003 carrier 1 — CLAUDE.md gate + catalog present ON, absent OFF',
            fn: () => {
                const on = stamp(true);
                const off = stamp(false);

                assertContains(on, '<!-- CK:WORKFLOW-GATE -->', 'routing ON must stamp the gate block');
                assertContains(on, '<!-- CK:WORKFLOW-SKILLS -->', 'routing ON must stamp the skills catalog');

                assertNotContains(off, '<!-- CK:WORKFLOW-GATE -->', 'routing OFF must not stamp the gate block');
                assertNotContains(off, '<!-- CK:WORKFLOW-SKILLS -->', 'routing OFF must not stamp the skills catalog');
                // The catalog body, not just its markers: a leaked Workflows Index is a menu the
                // model can still route from, which is exactly what the switch forbids.
                assertTrue(!/###\s+Workflows Index \(\d+\)/.test(off),
                    'routing OFF must not leave the Workflows Index table behind');
                assertTrue(!/\[WORKFLOW-GATE\]/.test(off),
                    'routing OFF must not leave the WORKFLOW-GATE prose behind');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-004 carrier 1 — OFF removes routing and nothing else',
            fn: () => {
                const off = stamp(false);

                // The completeness sentinel must survive, or the agent-files bootstrap gate would
                // read a correctly-configured file as incomplete and loop on re-initializing it.
                assertTrue(/<!-- CK:UNIVERSAL-GUIDES v\d+ -->/.test(off),
                    'routing OFF must keep the universal-guides sentinel');
                assertContains(off, '<!-- CK:CRITICAL-THINKING -->',
                    'routing OFF must keep the critical-thinking protocol block');
                assertContains(off, '<!-- CK:AI-MISTAKE-PREVENTION -->',
                    'routing OFF must keep the AI-mistake-prevention protocol block');
                for (const anchor of [
                    'First Action Decision',
                    'Task Planning Rules',
                    'Workflow Step Advancement',
                    'Git & Version-Control Discipline',
                ]) {
                    assertContains(off, anchor, `routing OFF must keep the "${anchor}" guide`);
                }
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-005 carrier 1 — First Action Decision body tracks the switch both ways',
            fn: () => {
                const { ROUTING_BODY_DISABLED, ROUTING_BODY_TEMPLATE, ROUTING_BODY_MIGRATED } = generator;
                const off = stamp(false);
                const on = stamp(true);

                // OFF must not leave an instruction pointing at a block that is no longer stamped.
                assertContains(off, ROUTING_BODY_DISABLED,
                    'routing OFF must state direct execution in the First Action Decision section');
                assertTrue(!off.includes(ROUTING_BODY_TEMPLATE) && !off.includes(ROUTING_BODY_MIGRATED),
                    'routing OFF must not leave a body telling the model to apply the (absent) gate');

                // ON keeps a gate-referencing body, and the switch is reversible.
                assertTrue(on.includes(ROUTING_BODY_TEMPLATE) || on.includes(ROUTING_BODY_MIGRATED),
                    'routing ON must carry a gate-referencing First Action Decision body');
                const restored = generator.stampHeader(off, { workflowAutoDetect: true });
                assertContains(restored, ROUTING_BODY_TEMPLATE,
                    'flipping the switch back ON must restore a gate-referencing body');
                assertContains(restored, '<!-- CK:WORKFLOW-GATE -->',
                    'flipping the switch back ON must restore the gate block');
                assertNotContains(restored, ROUTING_BODY_DISABLED,
                    'flipping the switch back ON must remove the disabled body');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-006 carrier 1 — stamping is idempotent in both states',
            fn: () => {
                // Re-running the generator is routine (every sync preflights it). A non-idempotent
                // stamp would grow the file or duplicate a block on every run.
                const on = stamp(true);
                const off = stamp(false);
                assertTrue(generator.stampHeader(on, { workflowAutoDetect: true }) === on,
                    'restamping with routing ON must be a no-op');
                assertTrue(generator.stampHeader(off, { workflowAutoDetect: false }) === off,
                    'restamping with routing OFF must be a no-op');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-007 carrier 2 — protocol drops routing steps, keeps execution steps',
            fn: () => {
                const on = protocol.buildWorkflowProtocolText({});
                const off = protocol.buildWorkflowProtocolText({}, { workflowAutoDetect: false });

                // The four routing steps ARE the auto-detect router.
                for (const step of ['**DETECT:**', '**ANALYZE:**', '**AUTO-SELECT:**', '**ACTIVATE:**']) {
                    assertContains(on, step, `routing ON must carry the ${step} step`);
                    assertNotContains(off, step, `routing OFF must drop the ${step} step`);
                }
                assertContains(off, '**EXECUTE DIRECTLY:**',
                    'routing OFF must replace the router with a positive direct-execution instruction');
                assertNotContains(off, 'match the prompt against the workflow catalog',
                    'routing OFF must not instruct the model to match against a catalog');

                // Quality rules are orthogonal to route selection and must survive both states.
                for (const step of ['**CREATE TASKS:**', '**PARALLELIZE:**', '**EXECUTE:**']) {
                    assertContains(on, step, `routing ON must carry the ${step} step`);
                    assertContains(off, step, `routing OFF must KEEP the ${step} step — it is not a routing rule`);
                }
                assertContains(off, 'Generic portability boundary',
                    'routing OFF must keep the portability boundary');

                // Default (no options) must behave exactly as before the switch existed.
                assertTrue(protocol.buildWorkflowProtocolText({}, {}) === on,
                    'an options object without the flag must default to routing ON');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-008 carrier 3 — Codex workflow protocol + catalog absent when OFF',
            fn: async () => {
                const sync = await import(
                    require('node:url').pathToFileURL(
                        path.resolve(PROJECT_DIR, '.claude', 'scripts', 'codex', 'sync-context-workflows.mjs')
                    ).href
                );
                const workflowsDoc = JSON.parse(
                    fs.readFileSync(path.resolve(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8')
                );
                const entries = Object.entries(workflowsDoc.workflows || {});
                const ids = entries.map(([id]) => id);
                assertTrue(ids.length > 0, 'fixture sanity: workflows.json must declare workflows');

                const on = sync.buildWorkflowSection(entries, PROJECT_DIR, { workflowAutoDetect: true });
                const off = sync.buildWorkflowSection(entries, PROJECT_DIR, { workflowAutoDetect: false });

                assertContains(on, '## Workflow Catalog', 'routing ON must emit the Codex workflow catalog');
                assertContains(on, 'Quick Keyword Lookup', 'routing ON must emit the keyword lookup table');
                assertContains(on, '<!-- CK:WORKFLOW-SKILLS -->', 'routing ON must emit the skills catalog');

                assertNotContains(off, '## Workflow Catalog', 'routing OFF must not emit the Codex workflow catalog');
                assertNotContains(off, 'Quick Keyword Lookup', 'routing OFF must not emit the keyword lookup table');
                assertNotContains(off, '<!-- CK:WORKFLOW-SKILLS -->', 'routing OFF must not emit the skills catalog');
                // No workflow id may appear — a surviving id list is a routable menu.
                for (const id of ids) {
                    assertNotContains(off, id, `routing OFF must not name workflow ${id}`);
                }
                assertContains(off, 'Workflow auto-detect is OFF',
                    'routing OFF must say so, rather than leaving the section unexplained');
                assertContains(off, '$start-workflow <id>',
                    'routing OFF must still permit explicitly named workflows');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-009 schema declares portability.workflowAutoDetect',
            fn: () => {
                // Without the declaration a project setting the switch would trip the schema's
                // unknown-property validation — the config would be rejected for using the very
                // feature this suite covers.
                const { SCHEMA, validateConfig } = require(
                    path.resolve(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs')
                );
                const declared = SCHEMA.portability?.properties?.workflowAutoDetect;
                assertTrue(declared && declared.type === 'boolean',
                    'portability.workflowAutoDetect must be declared as a boolean in the schema');

                const base = JSON.parse(
                    fs.readFileSync(path.resolve(PROJECT_DIR, 'docs', 'project-config.json'), 'utf8')
                );
                const candidate = {
                    ...base,
                    portability: { ...(base.portability || {}), workflowAutoDetect: false },
                };
                const result = validateConfig(candidate);
                const offending = (result.errors || []).filter(e => String(e).includes('workflowAutoDetect'));
                assertTrue(offending.length === 0,
                    `setting workflowAutoDetect must not raise a schema error:\n  ${offending.join('\n  ')}`);
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-010 cascade — local override wins, broken layer never erases the one below',
            fn: () => {
                const { resolveWorkflowAutoDetect } = routingConfig;
                const team = v => ({ 'docs/project-config.json': configWith({ workflowAutoDetect: v }) });
                const local = v => ({ 'docs/project-config.local.json': configWith({ workflowAutoDetect: v }) });
                const eff = files => withFixture(files, dir => resolveWorkflowAutoDetect({ rootDir: dir }));

                assertTrue(eff({}).enabled === true, 'no config anywhere must resolve enabled');
                assertTrue(eff({ 'docs/project-config.json': configWith({}) }).enabled === true,
                    'a team config silent on the key must resolve enabled');

                // The headline case: team says on, developer says off.
                const overridden = eff({ ...team(true), ...local(false) });
                assertTrue(overridden.enabled === false, 'the local override must win over the team value');
                assertTrue(overridden.source === routingConfig.SOURCE_LOCAL_OVERRIDE,
                    'provenance must name the local override as the deciding layer');
                assertTrue(overridden.overriddenLocally === true,
                    'overriddenLocally must flag that the developer diverged from the team');

                // Symmetric: a developer may opt BACK IN when the team disabled routing.
                assertTrue(eff({ ...team(false), ...local(true) }).enabled === true,
                    'the local override must also be able to re-enable routing');

                // A broken developer file must not erase a valid team decision in either direction.
                const brokenLocal = { 'docs/project-config.local.json': '{ not json' };
                assertTrue(eff({ ...team(true), ...brokenLocal }).enabled === true,
                    'a malformed local file must fall through to a team value of true');
                assertTrue(eff({ ...team(false), ...brokenLocal }).enabled === false,
                    'a malformed local file must fall through to a team value of false, not to the default');
                // A non-boolean is a config mistake, not an off switch.
                assertTrue(eff({
                    ...team(true),
                    'docs/project-config.local.json': configWith({ workflowAutoDetect: 'false' }),
                }).enabled === true, 'a string "false" locally must NOT disable routing');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-011 scope — team ignores the developer layer, effective applies it',
            fn: () => {
                // This is the invariant that keeps a local preference out of the team repository:
                // every generator that writes a TRACKED file resolves at team scope, so the
                // developer layer cannot reach CLAUDE.md / AGENTS.md / CODEX_CONTEXT.md.
                const { resolveWorkflowAutoDetect, SCOPE_TEAM, SCOPE_EFFECTIVE } = routingConfig;
                withFixture({
                    'docs/project-config.json': configWith({ workflowAutoDetect: true }),
                    'docs/project-config.local.json': configWith({ workflowAutoDetect: false }),
                }, dir => {
                    const teamScope = resolveWorkflowAutoDetect({ rootDir: dir, scope: SCOPE_TEAM });
                    assertTrue(teamScope.enabled === true,
                        'team scope must ignore the local override so tracked files keep the team value');
                    assertTrue(teamScope.source === routingConfig.SOURCE_PROJECT_CONFIG,
                        'team scope must never report the local override as the deciding layer');
                    assertTrue(teamScope.overriddenLocally === false,
                        'team scope must not report a local divergence it did not read');

                    const effectiveScope = resolveWorkflowAutoDetect({ rootDir: dir, scope: SCOPE_EFFECTIVE });
                    assertTrue(effectiveScope.enabled === false,
                        'effective scope must apply the local override at runtime');
                    assertTrue(resolveWorkflowAutoDetect({ rootDir: dir }).enabled === false,
                        'effective must be the DEFAULT scope — a caller that forgets it gets the developer value');
                    assertTrue(teamScope.teamEnabled === effectiveScope.teamEnabled,
                        'both scopes must report the same underlying team value');
                });
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-012 the local override file follows relocation and is git-ignored',
            fn: () => {
                const { resolveLocalOverridePath, resolveWorkflowAutoDetect } = routingConfig;

                // Derived from the team config path, so a project that relocates its config via
                // .ck.json keeps the pair together instead of silently losing the override.
                assertTrue(
                    resolveLocalOverridePath(path.join('x', 'cfg', 'pc.json')) === path.join('x', 'cfg', 'pc.local.json'),
                    'the local path must be the .local.json sibling of the team config'
                );
                withFixture({
                    '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'cfg/pc.json' } }),
                    'cfg/pc.json': configWith({ workflowAutoDetect: true }),
                    'cfg/pc.local.json': configWith({ workflowAutoDetect: false }),
                    // A decoy at the DEFAULT location must be ignored once the config is relocated.
                    'docs/project-config.local.json': configWith({ workflowAutoDetect: true }),
                }, dir => {
                    const resolved = resolveWorkflowAutoDetect({ rootDir: dir });
                    assertTrue(resolved.localPath === path.join(dir, 'cfg', 'pc.local.json'),
                        'the override must follow the relocated config, not sit at the default path');
                    assertTrue(resolved.enabled === false, 'the relocated override must be the one that applies');
                });

                // The whole design rests on this file being invisible to git. If the ignore rule
                // ever goes, a "local" preference becomes a commit — assert it, do not assume it.
                const ignored = execFileSync('git', ['check-ignore', '-v', 'docs/project-config.local.json'],
                    { cwd: PROJECT_DIR, encoding: 'utf8' }).trim();
                assertContains(ignored, '*.local.json',
                    'docs/project-config.local.json MUST be git-ignored or a local override reaches the team repo');
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-013 carrier 2 overrides a static router only when one is present',
            fn: () => {
                // When the TEAM disables routing the tracked files are regenerated without the
                // gate, so there is nothing to override and claiming otherwise would send the model
                // looking for a block that does not exist. When only the DEVELOPER disables it, the
                // gate is still there by design and the runtime text must say it wins.
                const withOverride = protocol.buildWorkflowProtocolText({}, {
                    workflowAutoDetect: false, staticRouterOverride: true,
                });
                const withoutOverride = protocol.buildWorkflowProtocolText({}, {
                    workflowAutoDetect: false, staticRouterOverride: false,
                });

                assertContains(withOverride, 'THIS INSTRUCTION OVERRIDES THEM',
                    'a local-only disable must explicitly override the gate left in the tracked files');
                assertContains(withOverride, 'WORKFLOW-GATE',
                    'the override notice must name what it is overriding');
                assertNotContains(withoutOverride, 'THIS INSTRUCTION OVERRIDES THEM',
                    'a team-wide disable must NOT claim to override a gate that was already removed');

                // The override text is an ADDITION to the disabled step, never a replacement.
                assertContains(withOverride, '**EXECUTE DIRECTLY:**',
                    'the override notice must not displace the direct-execution instruction');
                // It is meaningless while routing is on, and must never leak into that state.
                assertNotContains(
                    protocol.buildWorkflowProtocolText({}, { workflowAutoDetect: true, staticRouterOverride: true }),
                    'THIS INSTRUCTION OVERRIDES THEM',
                    'routing ON must never emit the override notice'
                );
            },
        },
        {
            name: '[workflow-routing-switch] TC-WRS-014 tracked-file generators never resolve at the default scope',
            fn: () => {
                // The two-scope split calls team scope MANDATORY for any generator that writes a
                // GIT-TRACKED context file: a scope-less resolve defaults to 'effective', which
                // applies the developer's git-ignored local override and would bake one person's
                // preference into CLAUDE.md / AGENTS.md / CODEX_CONTEXT.md for the whole team to
                // pull — the precise failure the split exists to prevent. That rule previously
                // lived only in prose comments, while the shortest call site to copy
                // (prompt-injections.cjs, which writes nothing) correctly passes no scope at all.
                //
                // Guarded here: no tracked writer may call the resolver WITHOUT naming a scope,
                // and each must reach team scope at least once. An explicit `scope: 'effective'`
                // read stays legal — generate-claude-md.cjs makes one deliberately, to tell the
                // developer where their override DOES apply — so this asserts the absence of the
                // silent default, not the absence of 'effective'.
                //
                // LIMITATION, stated rather than implied: this pins the carriers that exist
                // today. A NEW tracked-file carrier must be added to this list; the rule itself
                // is still carried by the module docs in workflow-routing-config.cjs.
                const TRACKED_WRITERS = [
                    ['.claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs', 'CLAUDE.md'],
                    ['.claude/scripts/codex/sync-context-workflows.mjs', '.codex/CODEX_CONTEXT.md and AGENTS.md'],
                ];
                const CALL_RE = /(?:isWorkflowAutoDetectEnabled|resolveWorkflowAutoDetect)\s*\(([\s\S]{0,400}?)\)/g;

                for (const [relative, writes] of TRACKED_WRITERS) {
                    const source = fs.readFileSync(path.resolve(PROJECT_DIR, relative), 'utf8');
                    const callArgs = [...source.matchAll(CALL_RE)]
                        .map(match => match[1].trim())
                        .filter(args => args !== '');

                    assertTrue(callArgs.length > 0,
                        `${relative} must resolve the routing switch — no call site found, so this guard ` +
                            'would pass vacuously');

                    for (const args of callArgs) {
                        assertTrue(/scope\s*:/.test(args),
                            `${relative} writes ${writes}, which is git-tracked, so every routing resolve ` +
                                'MUST name a scope explicitly — a scope-less call silently defaults to ' +
                                `'effective' and bakes a developer's local override into a shared file. ` +
                                `Offending arguments: ${args}`);
                    }

                    assertTrue(callArgs.some(args => /SCOPE_TEAM|['"]team['"]/.test(args)),
                        `${relative} writes ${writes}, which is git-tracked, so it must resolve the routing ` +
                            'switch at TEAM scope to decide what it writes');
                }
            },
        },
    ],
};
