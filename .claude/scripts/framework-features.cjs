#!/usr/bin/env node
/**
 * Feature catalog: every framework switch an agent or a developer is likely to change, with its
 * default, the effective value in this checkout, the layer that set it, who may set it, and the
 * exact way to change it. Read by `/framework-config`, `/project-config` and `/project-init`.
 *
 * Values come from the owning resolvers (never transcribed), so the catalog cannot drift from what
 * the hooks actually do. A new switch is one FEATURES entry.
 *
 * PORTABILITY CONTRACT (PORT-001): plain `node` >= 18, `node:` built-ins only.
 *
 * Usage (Windows, macOS and Linux):
 *   node .claude/scripts/framework-features.cjs           Markdown table
 *   node .claude/scripts/framework-features.cjs --json    [{ key, value, source, ... }]
 *
 * Layers, later wins, unless an entry says otherwise:
 *   default → team (docs/project-config.json, tracked; a framework update never replaces it)
 *           → personal (~/.claude/.ck.json, every project) → checkout (.claude/.ck.local.json, git-ignored)
 *           → environment variable.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..');
const lib = name => require(path.join(CLAUDE_DIR, ...name.split('/')));

const PERSONAL = 'team, personal, checkout, env';
const TEAM_ONLY = 'team only';

function projectConfig(rootDir) {
    try {
        const routing = lib('scripts/lib/workflow-routing-config.cjs');
        const file = routing.resolveProjectConfigPath(rootDir);
        return file && fs.existsSync(file) ? JSON.parse(routing.decodeConfigText(fs.readFileSync(file))) : {};
    } catch { return {}; }
}

/** Which layer set a router switch: the last of shipped, team, personal, checkout that names `enabled`. */
function routerSource(rootDir, section, envName, homeDir, env) {
    const os = require('node:os');
    const routing = lib('scripts/lib/workflow-routing-config.cjs');
    const layers = [['framework default (.claude/.ck.json)', path.join(rootDir, '.claude', '.ck.json')], ['project-config', routing.resolveProjectConfigPath(rootDir)],
        ['user-config', path.join(homeDir || os.homedir(), '.claude', '.ck.json')], ['local-override', path.join(rootDir, '.claude', '.ck.local.json')]];
    let source = 'default';
    for (const [name, file] of layers) {
        try { if (file && JSON.parse(fs.readFileSync(file, 'utf8'))?.[section]?.enabled !== undefined) source = name; } catch { /* absent or unreadable */ }
    }
    if (env[envName] !== undefined && env[envName] !== '') source = 'environment';
    return source;
}

const router = (section, envName, hook, what) => ({
    key: `${section}.enabled`, default: true, scope: PERSONAL, what: `${hook}: ${what}`,
    change: `{ "${section}": { "enabled": false } } in a settings layer, or ${envName}=0`,
    resolve: ({ rootDir, homeDir, env }) => ({
        value: lib('hooks/lib/prompt-route-utils.cjs').isRouterEnabled(section, envName, { env, projectDir: rootDir, homeDir }),
        source: routerSource(rootDir, section, envName, homeDir, env) })
});

const runtime = () => lib('hooks/lib/framework-runtime.cjs');

const FEATURES = [
    { key: 'frameworkRuntime.mode', default: 'on', scope: PERSONAL, what: 'on, quiet (no injected guidance; gates stay) or off (every framework hook stops)',
        change: 'node .claude/scripts/framework-mode.cjs on|quiet|off|reset --scope=checkout|user|team, or CK_FRAMEWORK_MODE',
        resolve: o => { const r = runtime().resolveFrameworkMode(o); return { value: r.mode + (r.offReadAsQuiet ? ' (off read as quiet)' : ''), source: r.source }; } },
    { key: 'frameworkRuntime.quietProjectRules', default: false, scope: PERSONAL, what: 'in quiet, keep the project\'s own rules (skill overlays, file conventions, auto-trigger policy)',
        change: '{ "frameworkRuntime": { "quietProjectRules": true } }, or CK_QUIET_PROJECT_RULES',
        resolve: o => { const r = runtime().resolveQuietProjectRules(o); return { value: r.enabled, source: r.source }; } },
    { key: 'frameworkRuntime.quietNative', default: 'none', scope: PERSONAL, what: 'restrict = in quiet, framework skills run on command only and framework agents are denied',
        change: '{ "frameworkRuntime": { "quietNative": "restrict" } } or CK_QUIET_NATIVE, then framework-mode.cjs apply',
        resolve: o => { const r = runtime().resolveQuietNative(o); return { value: r.value, source: r.source }; } },
    { key: 'frameworkRuntime.quietSkills', default: '[]', scope: 'team, personal, checkout (highest layer that sets the list)', what: 'skills that stay automatic under a quiet restriction',
        change: '{ "frameworkRuntime": { "quietSkills": ["investigate"] } }, then framework-mode.cjs apply',
        resolve: o => { const r = runtime().resolveFrameworkMode(o); return { value: JSON.stringify(r.quietSkills), source: r.layers.filter(l => l.quietSkills !== undefined).at(-1)?.source || 'default' }; } },
    { key: 'frameworkRuntime.autoApplyNative', default: false, scope: PERSONAL, what: 'apply native skill/agent visibility at session start (main checkout), so nobody has to run apply',
        change: '{ "frameworkRuntime": { "autoApplyNative": true } }, or CK_AUTO_APPLY_NATIVE',
        resolve: o => { const r = runtime().resolveAutoApplyNative(o); return { value: r.enabled, source: r.source }; } },
    { key: 'frameworkRuntime.offMode', default: 'allowed', scope: TEAM_ONLY, what: 'as-quiet = a saved or requested off is read as quiet, so no personal setting stops the gates',
        change: '{ "frameworkRuntime": { "offMode": "as-quiet" } } in the project config (pull request)',
        resolve: o => runtime().resolveOffMode(o) },
    { key: 'portability.workflowRouteMode', default: 'ask', scope: `${PERSONAL}, session`, what: 'ask, auto or off: how the workflow route gate offers catalog workflows',
        change: '/framework-config --mode=workflow ask|auto|off [--save|--local], or CK_WORKFLOW_ROUTE_MODE',
        resolve: ({ rootDir, homeDir, env }) => { const r = lib('scripts/lib/workflow-routing-config.cjs').resolveWorkflowRouteMode({ rootDir, homeDir, env }); return { value: r.mode, source: r.source }; } },
    { key: 'portability.skillAutoTrigger', default: true, scope: PERSONAL, what: 'false = ask before starting a matched framework skill',
        change: '{ "portability": { "skillAutoTrigger": false } }, or CK_SKILL_AUTO_TRIGGER',
        resolve: ({ rootDir, homeDir, env }) => { const r = lib('scripts/lib/workflow-routing-config.cjs').resolveSkillAutoTrigger({ rootDir, homeDir, env }); return { value: r.enabled, source: r.source }; } },
    { key: 'commit.reviewMode', default: 'lightweight', scope: 'team, personal, checkout', what: 'which review the commit gate asks for (lightweight or risk-based)',
        change: '{ "commit": { "reviewMode": "risk-based" } }',
        resolve: ({ rootDir, homeDir, env }) => { const r = lib('scripts/lib/commit-review-policy.cjs').resolveCommitReviewMode({ rootDir, homeDir, env }); return { value: r.mode, source: r.source }; } },
    { key: 'reviewGate.mode', default: 'off', scope: TEAM_ONLY, what: 'enforce = gh pr create/ready need a whole-branch review receipt, and a review receipt counts only when a review skill run was attested',
        change: '{ "reviewGate": { "mode": "enforce" } } in the project config (pull request)',
        resolve: ({ rootDir }) => { const r = lib('scripts/lib/commit-review-policy.cjs').resolveReviewGateMode({ rootDir }); return { value: r.mode, source: r.source }; } },
    { key: 'contextDelivery.profile', default: 'compatible', scope: 'shipped, personal, team, checkout', what: 'compatible or concise guidance delivery',
        change: '{ "contextDelivery": { "profile": "concise" } }',
        resolve: ({ rootDir, homeDir }) => { const r = lib('hooks/lib/context-delivery.cjs').resolveProfile(rootDir, { homeDir }); return { value: r.profile, source: r.source }; } },
    { key: 'portability.generateClaudeMd', default: true, scope: TEAM_ONLY, what: 'false = the project owns CLAUDE.md; generators and skills only propose text',
        change: '{ "portability": { "generateClaudeMd": false } } in the project config (pull request)',
        resolve: ({ rootDir }) => { const v = projectConfig(rootDir).portability?.generateClaudeMd; return { value: v !== false, source: v === undefined ? 'default' : 'project-config' }; } },
    { key: 'skillProfile', default: 'none', scope: 'team (project config) or personal (sync-skill-profile.cjs --personal)', what: 'which skills are automatic, name-only, command-only or off',
        change: '{ "skillProfile": { "commandOnly": ["…"] } }, then node .claude/scripts/sync-skill-profile.cjs [--personal]',
        resolve: ({ rootDir }) => { const p = projectConfig(rootDir).skillProfile; return { value: p ? Object.keys(p).filter(k => Array.isArray(p[k]) && p[k].length).map(k => `${k}:${p[k].length}`).join(' ') || 'declared' : 'none', source: p ? 'project-config' : 'default' }; } },
    router('commitSkillRoute', 'CK_COMMIT_SKILL_ROUTE', 'commit-skill-route', 'route commit requests to the commit skill'),
    router('judgementIntegrityRoute', 'CK_JUDGEMENT_INTEGRITY_ROUTE', 'judgement-integrity-route', 'verdict and evaluation reminder'),
    router('aiFeatureRoute', 'CK_AI_FEATURE_ROUTE', 'ai-feature-route', 'AI-feature engineering reminder'),
    router('qualitySkillReminder', 'CK_QUALITY_SKILL_REMINDER', 'quality-skill-remind', 'review/test/failure skill routing digest'),
    router('corePrinciplesInject', 'CK_CORE_PRINCIPLES_INJECT', 'core-principles-inject', 'easy to change, scale, maintain gate'),
    router('knowledgeRoute', 'CK_KNOWLEDGE_ROUTE', 'knowledge-route', 'points the assistant at matching knowledge packs')
];

function catalog({ rootDir, homeDir, env = process.env } = {}) {
    return FEATURES.map(({ resolve, ...feature }) => {
        let resolved;
        try { resolved = resolve({ rootDir, homeDir, env }); } catch (error) { resolved = { value: 'unavailable', source: error.message }; }
        return { ...feature, value: resolved.value, source: resolved.source };
    });
}

function renderMarkdown(rows) {
    const cell = value => String(value).replace(/\|/g, '\\|');
    return ['## Framework features', '',
        'Effective values for this checkout. Change a personal value only in a personal layer (`~/.claude/.ck.json`, `.claude/.ck.local.json` or the environment); change a team value in the project config by pull request. Never edit `.claude/.ck.json` or `.claude/settings.json` for a preference: a framework update replaces them.', '',
        '| Feature | Effective | Set by | Default | Who may set it | What it does | How to change |', '| --- | --- | --- | --- | --- | --- | --- |',
        ...rows.map(r => `| \`${r.key}\` | ${cell(r.value)} | ${cell(r.source)} | ${cell(r.default)} | ${cell(r.scope)} | ${cell(r.what)} | ${cell(r.change)} |`), ''].join('\n');
}

function main(args = process.argv.slice(2)) {
    const { rootDir } = lib('hooks/lib/project-root.cjs').resolveProjectRoot({ scriptPath: __filename });
    const rows = catalog({ rootDir });
    process.stdout.write(args.includes('--json') ? `${JSON.stringify(rows, null, 2)}\n` : renderMarkdown(rows));
}

if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { FEATURES, catalog, renderMarkdown };
