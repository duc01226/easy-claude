'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const routing = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-routing-config.cjs'));
const hook = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'workflow-route-inject.cjs'));
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

const config = value => JSON.stringify({ portability: { workflowAutoDetect: value } });
const input = (session, transcript) => ({
    hook_event_name: 'UserPromptSubmit', session_id: session, transcript_path: transcript, prompt: 'hello'
});
const writer = outputs => (text, done) => { outputs.push(text); done(true); };

async function enabledRun({ root, store, session = 's1', transcript, now = 1000, content = 'route-v1', outputs = [] }) {
    return hook.run(input(session, transcript), {
        projectDir: root,
        storeRoot: store,
        now,
        content,
        routing: { isWorkflowAutoDetectEnabled: () => true },
        write: writer(outputs)
    });
}

module.exports = {
    name: 'workflow-routing-switch',
    tests: [
        {
            name: '[workflow-routing-switch] TC-WRS-001 absent and malformed config default ON',
            fn: () => fixture({}, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect({ rootDir: dir }).enabled === true);
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), '{bad', 'utf8');
                assertTrue(routing.resolveWorkflowAutoDetect({ rootDir: dir }).enabled === true);
                assertTrue(routing.readWorkflowAutoDetect({}) === true);
                assertTrue(routing.readWorkflowAutoDetect({ portability: { workflowAutoDetect: 'true' } }) === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-002 tracked team config opts in and out',
            fn: () => fixture({ 'docs/project-config.json': config(true) }, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect({ rootDir: dir }).enabled === true);
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                assertTrue(routing.resolveWorkflowAutoDetect({ rootDir: dir }).enabled === false);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-003 projectConfigPath relocation is honored',
            fn: () => fixture({
                '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/team.json' } }),
                'config/team.json': config(true),
                'docs/project-config.json': config(false)
            }, dir => {
                const resolved = routing.resolveWorkflowAutoDetect({ rootDir: dir });
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
                const tracked = routing.resolveWorkflowAutoDetect({ rootDir: dir, scope: routing.SCOPE_TEAM });
                assertTrue(tracked.enabled === true);
                assertTrue(tracked.source === routing.SOURCE_PROJECT_CONFIG);
                let resolved = routing.resolveWorkflowAutoDetect({ rootDir: dir });
                assertTrue(resolved.enabled === false);
                assertTrue(resolved.source === routing.SOURCE_LOCAL_OVERRIDE);
                assertTrue(resolved.localPath === path.join(dir, '.claude', '.ck.local.json'));
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), config(true));
                resolved = routing.resolveWorkflowAutoDetect({ rootDir: dir });
                assertTrue(resolved.enabled === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-005 malformed local file falls through to team',
            fn: () => fixture({
                'docs/project-config.json': config(true), '.claude/.ck.local.json': '{bad'
            }, dir => assertTrue(routing.resolveWorkflowAutoDetect({ rootDir: dir }).enabled === true))
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
            name: '[workflow-routing-switch] TC-WRS-008 disabled hook is silent and writes no state',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                const out = await hook.run(input('off'), {
                    projectDir: dir, storeRoot: store,
                    routing: { isWorkflowAutoDetectEnabled: () => false },
                    write: () => { throw new Error('must not write'); }
                });
                assertTrue(out === '');
                assertTrue(!fs.existsSync(store));
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
                    routing: { isWorkflowAutoDetectEnabled: () => true },
                    write: () => { throw new Error('simulated output failure'); }
                });
                assertTrue(first === '');
                assertContains(await enabledRun({ root: dir, store, session: 'writer-failure', now: 2000 }), 'route-v1');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-015 tracked outputs carry the route gate and runtime payload has the catalog',
            fn: () => {
                for (const relative of ['CLAUDE.md', 'AGENTS.md', '.codex/CODEX_CONTEXT.md']) {
                    const text = fs.readFileSync(path.join(PROJECT_DIR, relative), 'utf8');
                    assertContains(text, '<!-- CK:WORKFLOW-GATE -->', `${relative} must carry the route gate`);
                    assertNotContains(text, '<!-- CK:WORKFLOW-SKILLS -->', `${relative} must not carry the route catalog`);
                    assertNotContains(text, '[MANDATORY FIRST ACTION]', `${relative} must not mandate route selection`);
                }
                const payload = hook.buildInjection(PROJECT_DIR);
                assertContains(payload, '<!-- CK:WORKFLOW-GATE -->');
                assertContains(payload, '## Workflow & Skills Catalog');
                assertTrue(generator.stampHeader(fs.readFileSync(path.join(PROJECT_DIR, 'CLAUDE.md'), 'utf8'))
                    .includes('<!-- CK:UNIVERSAL-GUIDES v7 -->'));
                assertNotContains(
                    generator.stampHeader(
                        fs.readFileSync(path.join(PROJECT_DIR, 'CLAUDE.md'), 'utf8'),
                        { portability: { workflowAutoDetect: false } }
                    ),
                    '<!-- CK:WORKFLOW-GATE -->',
                    'tracked team opt-out must remove the route gate'
                );
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
                        routing: { isWorkflowAutoDetectEnabled: () => true },
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
        }
    ]
};
