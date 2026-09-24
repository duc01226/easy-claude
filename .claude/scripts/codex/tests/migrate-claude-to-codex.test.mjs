import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const sourceScriptsDir = path.join(repoRoot, '.claude', 'scripts', 'codex');
const migrateScript = path.join(sourceScriptsDir, 'migrate-claude-to-codex.mjs');
const runnerScript = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
const subagentAuthorizationSnippet =
    'Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.';

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function copyPortableCodexTooling(tempRoot) {
    const targetScriptsDir = path.join(tempRoot, '.claude', 'scripts', 'codex');
    const targetLibDir = path.join(tempRoot, '.claude', 'scripts', 'lib');
    await fs.mkdir(targetScriptsDir, { recursive: true });
    await fs.mkdir(targetLibDir, { recursive: true });
    const entries = await fs.readdir(sourceScriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
        await fs.copyFile(path.join(sourceScriptsDir, entry.name), path.join(targetScriptsDir, entry.name));
    }

    const sourceLibDir = path.join(repoRoot, '.claude', 'scripts', 'lib');
    const libEntries = await fs.readdir(sourceLibDir, { withFileTypes: true });
    for (const entry of libEntries) {
        if (!entry.isFile() || !/\.(cjs|mjs)$/.test(entry.name)) continue;
        await fs.copyFile(path.join(sourceLibDir, entry.name), path.join(targetLibDir, entry.name));
    }

    const sharedTarget = path.join(tempRoot, '.claude', 'skills', 'shared');
    await fs.mkdir(sharedTarget, { recursive: true });
    await fs.copyFile(
        path.join(repoRoot, '.claude', 'skills', 'shared', 'workflow-first-gate.md'),
        path.join(sharedTarget, 'workflow-first-gate.md')
    );
}

test('migrate-claude-to-codex mirrors skills and injects protocol block', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-migrate-'));
    try {
        const skillDir = path.join(tempRoot, '.claude', 'skills', 'sample-skill');
        const planSkillDir = path.join(tempRoot, '.claude', 'skills', 'plan');
        const codeSimplifierSkillDir = path.join(tempRoot, '.claude', 'skills', 'code-simplifier');
        const codexSyncSkillDir = path.join(tempRoot, '.claude', 'skills', 'sync-codex');
        const portableSourceScriptsDir = path.join(tempRoot, '.claude', 'scripts', 'codex');
        const agentsDir = path.join(tempRoot, '.claude', 'agents');
        const codexDir = path.join(tempRoot, '.codex');
        await fs.mkdir(skillDir, { recursive: true });
        await fs.mkdir(planSkillDir, { recursive: true });
        await fs.mkdir(codeSimplifierSkillDir, { recursive: true });
        await fs.mkdir(codexSyncSkillDir, { recursive: true });
        await fs.mkdir(portableSourceScriptsDir, { recursive: true });
        await fs.mkdir(agentsDir, { recursive: true });
        await fs.mkdir(codexDir, { recursive: true });

        await fs.writeFile(
            path.join(skillDir, 'SKILL.md'),
            [
                '---',
                'name: sample-skill',
                "description: 'Sample skill for migration test'",
                '---',
                '',
                '# Sample Skill',
                '',
                'Use /plan for planning.',
                'Plan directory: `{plan-dir}/plan.md` + `{plan-dir}/research/*.md`.',
                'Run /simplify after implementation.',
                'Agent({ subagent_type: "architect", prompt: "review" })',
                'Agent(architecture-review, subagent_type="code-reviewer", ...)',
                'Use the specialized subagent_type when one exists.',
                'STOP and `AskUserQuestion` whether integration-test-verify ran.',
                ''
            ].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(skillDir, 'README.md'), 'Legacy /simplify note.   \r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'package.json'), '{\r\n  "name": "sample-skill"\r\n}\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'package-lock.json'), '{\r\n  "lockfileVersion": 3\r\n}\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'config.yaml'), 'name: sample\r\nsteps:\r\n  - plan\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'settings.yml'), 'enabled: true\r\n', 'utf8');

        await fs.writeFile(
            path.join(planSkillDir, 'SKILL.md'),
            ['---', 'name: plan', 'description: Plan', '---', '', '# Plan', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(codeSimplifierSkillDir, 'SKILL.md'),
            ['---', 'name: code-simplifier', 'description: Code simplifier', '---', '', '# Code Simplifier', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'SKILL.md'),
            ['---', 'name: sync-codex', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(portableSourceScriptsDir, 'codex-notify.mjs'), ['#!/usr/bin/env node', "console.log('notify helper');", ''].join('\n'), 'utf8');

        await fs.writeFile(
            path.join(agentsDir, 'sample-agent.md'),
            ['---', 'name: sample-agent', 'description: sample agent', '---', '', 'Agent body.'].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', '.ck.json'),
            JSON.stringify(
                {
                    portability: {
                        rule: 'Custom portable rule from local config.',
                        projectConfigPath: 'custom/project-config.json',
                        docsIndexPath: 'custom/docs-index.md'
                    }
                },
                null,
                2
            ),
            'utf8'
        );

        await fs.writeFile(
            path.join(codexDir, 'config.toml'),
            [
                '# Existing project-specific Codex config.',
                'model = "gpt-5.4"',
                'model_reasoning_effort = "medium"',
                '',
                '[[profiles]]',
                'name = "dev"',
                '',
                '[tui] # existing UI settings',
                'theme = "dark"',
                'status_line = [',
                '  "model-name",',
                '  "git-branch",',
                ']',
                '',
                '[[servers]] # existing server',
                'name = "s1"',
                '',
                '[agents]',
                'max_threads = 3',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });

        const mirroredSkill = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'), 'utf8');
        const mirroredAgent = await fs.readFile(path.join(tempRoot, '.codex', 'agents', 'sample-agent.toml'), 'utf8');
        const mirroredReadme = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'README.md'), 'utf8');
        const mirroredPackageJson = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'package.json'), 'utf8');
        const mirroredYaml = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'config.yaml'), 'utf8');
        const mirroredYml = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'settings.yml'), 'utf8');
        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        const codexNotifyScript = await fs.readFile(path.join(tempRoot, '.codex', 'scripts', 'codex', 'codex-notify.mjs'), 'utf8');

        assert.match(mirroredSkill, /CODEX:SYNC-PROMPT-PROTOCOLS:START/);
        assert.match(mirroredSkill, /Static Prompt Protocol Mirror/);
        assert.doesNotMatch(mirroredSkill, /Custom portable rule from local config\./);
        assert.doesNotMatch(mirroredSkill, /WORKFLOW-EXECUTION-PROTOCOL|Auto-select|Workflow Catalog/i);
        assert.doesNotMatch(mirroredSkill, /Lessons Stub/);
        assert.doesNotMatch(mirroredSkill, /Workflow Protocol Stub|Critical Context Stub|Lesson Reminder Stub/);
        assert.doesNotMatch(mirroredSkill, /prompt-injections\.cjs/);
        assert.match(mirroredSkill, /LESSON-LEARNED-REMINDER/);
        assert.match(mirroredSkill, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(mirroredSkill, /Use \$plan for planning\./);
        assert.match(mirroredSkill, /Plan directory: `\{plan-dir\}\/plan\.md` \+ `\{plan-dir\}\/research\/\*\.md`\./);
        assert.doesNotMatch(mirroredSkill, /\{plan-dir\}\$plan\.md|\{plan-dir\}\$research/);
        assert.match(mirroredSkill, /Run \$code-simplifier after implementation\./);
        assert.match(mirroredSkill, /spawn_agent\(\{ agent_type: "architect"/);
        assert.match(mirroredSkill, /spawn_agent\(architecture-review, agent_type="code-reviewer"/);
        assert.match(mirroredSkill, /Use the specialized agent_type when one exists\./);
        assert.match(mirroredSkill, /STOP and ask the user directly whether integration-test-verify ran\./);
        assert.doesNotMatch(mirroredSkill, /a direct user question/);
        assert.doesNotMatch(mirroredSkill, /\bAgent\(|\bsubagent_type\b/);
        assert.equal(mirroredReadme, 'Legacy $code-simplifier note.\n');
        assert.equal(mirroredPackageJson, '{\n  "name": "sample-skill"\n}\n');
        // Lockfiles are local install artifacts the source tree ignores; the writer must never mirror them.
        await assert.rejects(fs.access(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'package-lock.json')), { code: 'ENOENT' });
        // The mirror ships its own generated .gitignore so a copied .agents/ never tracks a local install.
        const mirrorGitignore = await fs.readFile(path.join(tempRoot, '.agents', '.gitignore'), 'utf8');
        for (const ignored of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules/', '__pycache__/', '.venv/']) {
            assert.ok(mirrorGitignore.split('\n').includes(ignored), `.agents/.gitignore must ignore ${ignored}`);
        }
        assert.equal(mirroredYaml, 'name: sample\nsteps:\n  - plan\n');
        assert.equal(mirroredYml, 'enabled: true\n');
        assert.doesNotMatch(mirroredPackageJson, /\r/);
        assert.doesNotMatch(mirroredYaml, /\r/);
        assert.doesNotMatch(mirroredYml, /\r/);
        // Portability: the routing block may name only framework-owned reference docs, never a
        // consumer project's own doc. Allowed = registry built-ins + the framework spec/lessons docs.
        const { SCAN_SKILL_MAP } = createRequire(import.meta.url)(path.join(repoRoot, '.claude', 'hooks', 'lib', 'project-reference-registry.cjs'));
        const frameworkDocs = new Set([
            ...Object.keys(SCAN_SKILL_MAP),
            'spec-system-reference.md', 'spec-principles.md', 'workflow-spec-test-code-cycle-reference.md', 'lessons.md',
            'CLAUDE.md', 'AGENTS.md',
        ]);
        const routingBlock = mirroredSkill.split('<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->')[1].split('<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->')[0];
        const namedDocs = [...routingBlock.matchAll(/`([\w./-]+\.md)`/g)].map(m => m[1].replace(/^docs\/project-reference\//, ''));
        assert.ok(namedDocs.length > 5, 'routing block must name the phase docs');
        assert.deepEqual(namedDocs.filter(doc => !frameworkDocs.has(doc)), [], 'routing block names a non-framework doc');
        assert.match(mirroredSkill, /pick by the phase you are about to enter/);
        assert.match(mirroredSkill, /\*\*Dedup:\*\*[^\n]*last 200K tokens/);
        assert.match(mirroredSkill, /\*\*Dedup:\*\*[^\n]*and it has not changed since/, 'a doc edited after the read must not count as loaded');
        assert.match(mirroredAgent, /name = "sample-agent"/);
        assert.match(mirroredAgent, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(codexConfig, /notify = \["node", "\.codex\/scripts\/codex\/codex-notify\.mjs"\]/);
        assert.match(codexConfig, /^model_auto_compact_token_limit = 500000$/m);
        assert.equal([...codexConfig.matchAll(/^model_auto_compact_token_limit\s*=/gm)].length, 1);
        assert.ok(codexConfig.indexOf('model_auto_compact_token_limit = 500000') < codexConfig.indexOf('[[profiles]]'));
        assert.match(codexConfig, /^project_doc_max_bytes = 98304$/m, 'AGENTS.md must load past the 32 KiB Codex default');
        assert.ok(codexConfig.indexOf('project_doc_max_bytes = 98304') < codexConfig.indexOf('[[profiles]]'), 'top-level key, not inside a table');
        assert.match(codexConfig, /\[tui\]/);
        assert.match(codexConfig, /notifications = true/);
        assert.match(codexConfig, /notification_condition = "always"/);
        assert.match(codexConfig, /notification_method = "auto"/);
        assert.match(codexConfig, /status_line = \["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"\]/);
        assert.match(codexConfig, /# Existing project-specific Codex config\./);
        assert.match(codexConfig, /model = "gpt-5\.4"/);
        assert.match(codexConfig, /model_reasoning_effort = "medium"/);
        assert.match(codexConfig, /theme = "dark"/);
        assert.match(codexConfig, /max_threads = 3/);
        assert.equal([...codexConfig.matchAll(/^notify\s*=/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^\[tui\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^\[\[servers\]\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^status_line\s*=/gm)].length, 1);
        assert.doesNotMatch(codexConfig, /"model-name"/);
        assert.ok(codexConfig.indexOf('notify = ["node", ".codex/scripts/codex/codex-notify.mjs"]') < codexConfig.indexOf('[[profiles]]'));
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') < codexConfig.indexOf('[[servers]] # existing server'));
        assert.ok(codexConfig.indexOf('notifications = true') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('notifications = true') < codexConfig.indexOf('[[servers]] # existing server'));
        assert.equal(codexNotifyScript, "#!/usr/bin/env node\nconsole.log('notify helper');\n");
        assert.equal(await pathExists(path.join(tempRoot, 'scripts', 'codex')), false);

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });
        const rerunCodexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        assert.equal(rerunCodexConfig, codexConfig);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('migrate rejects unknown and duplicate flags before creating output', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-migrate-args-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );

        for (const args of [['--unknown-option'], ['--copy-skills', '--copy-skills']]) {
            await assert.rejects(
                execFileAsync(process.execPath, [migrateScript, ...args], { cwd: tempRoot }),
                error => {
                    assert.equal(error.code, 1);
                    assert.match(error.stderr, /unknown option|duplicate option/);
                    assert.match(error.stderr, /Usage: node/);
                    return true;
                }
            );
            assert.equal(await pathExists(path.join(tempRoot, '.agents')), false);
            assert.equal(await pathExists(path.join(tempRoot, '.codex')), false);
        }
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('sync-codex runner works from copied .claude without a root scripts folder', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-portable-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runnerTarget), { recursive: true });
        await fs.copyFile(runnerScript, runnerTarget);

        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sync-codex'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'agents'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'hooks', 'lib'), { recursive: true });

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'SKILL.md'),
            ['---', 'name: sync-codex', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', 'Use /sample-skill.', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'settings.json'),
            `${JSON.stringify({ hooks: {} }, null, 2)}\n`,
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'workflows.json'),
            `${JSON.stringify({ workflows: {} }, null, 2)}\n`,
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', '.ck.json'),
            `${JSON.stringify({}, null, 2)}\n`,
            'utf8'
        );
        await execFileAsync(process.execPath, [runnerTarget, '--only=migrate,hooks,context'], { cwd: tempRoot });

        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        const mirroredSkill = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'), 'utf8');
        assert.match(codexConfig, /notify = \["node", "\.codex\/scripts\/codex\/codex-notify\.mjs"\]/);
        assert.match(codexConfig, /^model_auto_compact_token_limit = 500000$/m);
        assert.match(codexConfig, /status_line = \["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"\]/);
        assert.doesNotMatch(mirroredSkill, /Lessons Stub/);
        assert.doesNotMatch(mirroredSkill, /Workflow Protocol Stub|Critical Context Stub|Lesson Reminder Stub|prompt-injections\.cjs/);
        assert.match(mirroredSkill, /LESSON-LEARNED-REMINDER/);
        assert.equal(await pathExists(path.join(tempRoot, '.codex', 'scripts', 'codex', 'codex-notify.mjs')), true);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts')), false);
        assert.equal(await pathExists(path.join(tempRoot, 'AGENTS.md')), true);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('sync-codex runner forwards copy-skills to migrate stage', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-copy-skills-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runnerTarget), { recursive: true });
        await fs.copyFile(runnerScript, runnerTarget);

        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );

        const { stdout } = await execFileAsync(
            process.execPath,
            [runnerTarget, '--only=migrate', '--copy-skills', '--verbose'],
            { cwd: tempRoot }
        );
        const rerun = await execFileAsync(
            process.execPath,
            [runnerTarget, '--only=migrate', '--copy-skills', '--verbose'],
            { cwd: tempRoot }
        );

        const mirroredSkillExists = await pathExists(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'));
        const sentinelExists = await pathExists(path.join(tempRoot, '.agents', 'skills', '.codex-mirror.json'));
        assert.match(stdout, /skills setup: copied \+ sanitized \+ rewritten 1 skill manifest/);
        assert.match(rerun.stdout, /skills setup: copied \+ sanitized \+ rewritten 1 skill manifest/);
        assert.equal(mirroredSkillExists, true);
        assert.equal(sentinelExists, true);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts')), false);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('migrate refuses unmanaged .agents skills in skills-only project', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-unmanaged-agents-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.agents', 'skills', 'foreign-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.agents', 'skills', 'foreign-skill', 'SKILL.md'),
            ['---', 'name: foreign-skill', 'description: Foreign skill', '---', '', '# Foreign Skill', ''].join('\n'),
            'utf8'
        );

        await assert.rejects(
            execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot }),
            /Refusing to remove .*\.agents.*skills/
        );
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('migrate refuses unmanaged .agents skills even when marker text exists', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-unmanaged-marker-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.agents', 'skills', 'foreign-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.agents', 'skills', 'foreign-skill', 'SKILL.md'),
            [
                '---',
                'name: foreign-skill',
                'description: Foreign skill',
                '---',
                '',
                '> Codex compatibility note:',
                '',
                '# Foreign Skill',
                ''
            ].join('\n'),
            'utf8'
        );

        await assert.rejects(
            execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot }),
            /Refusing to remove .*\.agents.*skills/
        );
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

// Business intent: the skill mirror carries only what the source tree tracks. `.claude/.gitignore`
// keeps package-manager lockfiles out of `.claude/skills`, so a mirrored lockfile exists only on the
// machine that ran `npm install` and makes a clean checkout fail the sync-divergence gate.
test('skill mirror excludes local package-manager lockfiles but keeps real skill files', async () => {
    const { isMirroredSkillSource } = await import(pathToFileURL(migrateScript).href);
    for (const lockfile of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) {
        assert.equal(isMirroredSkillSource(path.join('docx-convert', 'to-docx', lockfile)), false, `${lockfile} must not be mirrored`);
    }
    assert.equal(isMirroredSkillSource(path.join('pdf-convert', 'to-pdf', 'node_modules', 'x', 'index.js')), false);
    assert.equal(isMirroredSkillSource(path.join('shared', 'workflow-first-gate.md')), false);
    assert.equal(isMirroredSkillSource(path.join('docx-convert', 'to-docx', 'package.json')), true);
    assert.equal(isMirroredSkillSource(path.join('commit', 'SKILL.md')), true);
});

// Business intent: the divergence gate ignores exactly what a copied mirror's .gitignore ignores
// (a local install), but still reports a stray runtime-only or hand-added file.
test('local install artifacts are recognised at any depth with either separator; real files are not', async () => {
    const { isLocalInstallArtifact, buildAgentsMirrorGitignore } = await import(pathToFileURL(migrateScript).href);
    for (const rel of ['docx-convert/to-docx/package-lock.json', 'a\\b\\yarn.lock', 'pdf-convert/node_modules', 'x/node_modules/y/z.js', 'pnpm-lock.yaml']) {
        assert.equal(isLocalInstallArtifact(rel), true, `${rel} is a local install artifact`);
    }
    for (const rel of ['docx-convert/to-docx/package.json', 'shared/workflow-first-gate.md', 'commit/SKILL.md', 'excalidraw-diagram/references/uv.lock']) {
        assert.equal(isLocalInstallArtifact(rel), false, `${rel} is not a local install artifact`);
    }
    // Every non-VCS directory the divergence gate skips must also be git-ignored, or a committed
    // bytecode cache / venv slips past both.
    const lines = buildAgentsMirrorGitignore().split('\n');
    for (const ignored of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules/', '__pycache__/', '.venv/']) {
        assert.ok(lines.includes(ignored), `generated .gitignore lists ${ignored}`);
        const sample = ignored.endsWith('/') ? `s/${ignored}f` : `s/${ignored}`;
        assert.equal(isLocalInstallArtifact(sample), true, `${ignored} is also skipped by the gate`);
    }
    assert.ok(!lines.includes('.git/'), 'VCS metadata is not an install artifact to ignore');
});

// Business intent: the sync owns only its marked block — an adopter's own .agents/.gitignore
// rules survive every sync, and re-running the sync is idempotent.
test('mirror .gitignore preserves adopter content outside the managed block and is idempotent', async () => {
    const { buildAgentsMirrorGitignore } = await import(pathToFileURL(migrateScript).href);
    const adopter = '# team rule\nplugins/cache/\n';
    const first = buildAgentsMirrorGitignore(adopter);
    assert.ok(first.startsWith(adopter), 'adopter rules kept verbatim ahead of the block');
    assert.ok(first.includes('node_modules/'));
    assert.equal(buildAgentsMirrorGitignore(first), first, 'second sync rewrites only the block');
    const stale = first.replace('node_modules/', 'stale-entry/');
    assert.equal(buildAgentsMirrorGitignore(stale), first, 'a hand-edited block is regenerated');
    assert.equal(buildAgentsMirrorGitignore(first.replace(/\n/g, '\r\n')), first, 'CRLF input converges');
    // A hand-damaged block (either marker deleted) must never make a later sync delete adopter rules.
    const [startMarker] = first.split('\n').filter(line => line.startsWith('# >>> codex-sync'));
    for (const damaged of [`keep1\n${startMarker}\nkeep2\n`, 'keep1\n# <<< codex-sync\nkeep2\n']) {
        const once = buildAgentsMirrorGitignore(damaged);
        const twice = buildAgentsMirrorGitignore(once);
        assert.equal(twice, once, 'damaged input converges after one sync');
        for (const kept of ['keep1', 'keep2']) assert.ok(twice.includes(kept), `${kept} survives repeated syncs`);
    }
});

test('Codex config upsert raises project_doc_max_bytes to the root budget but never lowers a larger value', async () => {
    // Given the adopter config upsert and a reader for the resulting bare-key decimal limits.
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    const docLimits = text => [...text.matchAll(/^project_doc_max_bytes = (\d+)$/gm)].map(m => Number(m[1]));
    const keyLines = text => text.split('\n').filter(line => /project_doc_max_bytes/.test(line));

    // When an absent, smaller, or larger decimal limit is upserted — and a rerun repeats the sync.
    // Then an absent or smaller limit becomes the root budget, a larger one is kept, and reruns are stable.
    assert.deepEqual(docLimits(upsertCodexNotificationConfig('')), [98304], 'absent key is added once');
    assert.deepEqual(docLimits(upsertCodexNotificationConfig('project_doc_max_bytes = 32768\n')), [98304], 'a limit that would truncate the root is raised');
    assert.deepEqual(docLimits(upsertCodexNotificationConfig('project_doc_max_bytes = 262144\n')), [262144], 'a larger project choice is kept');
    assert.match(upsertCodexNotificationConfig('project_doc_max_bytes = 262_144\n'), /^project_doc_max_bytes = 262_144$/m,
        'a larger value written with TOML digit separators is kept, never lowered');
    const rerun = upsertCodexNotificationConfig(upsertCodexNotificationConfig(''));
    assert.deepEqual(docLimits(rerun), [98304], 'idempotent across syncs');

    // When the limit uses the other TOML integer forms (hex, octal, binary, separators, sign).
    // Then a larger value is kept verbatim and a smaller one is raised, whatever its radix.
    for (const larger of ['0x40000', '0x4_0000', '0o1000000', '0b1000000000000000000', '+262_144']) {
        assert.deepEqual(keyLines(upsertCodexNotificationConfig(`project_doc_max_bytes = ${larger}\n`)), [`project_doc_max_bytes = ${larger}`],
            `a larger TOML integer ${larger} is kept, never lowered`);
    }
    for (const smaller of ['0x8000', '0o100000', '0b1000000000000000', '32_768']) {
        assert.deepEqual(docLimits(upsertCodexNotificationConfig(`project_doc_max_bytes = ${smaller}\n`)), [98304], `a smaller TOML integer ${smaller} is raised`);
    }

    // When the key's value or spelling is one the upsert cannot read.
    // Then the line is left exactly as written — never overwritten and never duplicated.
    for (const unreadable of ['project_doc_max_bytes = "262144"', 'project_doc_max_bytes = 0x_40000', '"project_doc_max_bytes" = 262144']) {
        assert.deepEqual(keyLines(upsertCodexNotificationConfig(`${unreadable}\n`)), [unreadable], `unreadable limit is preserved: ${unreadable}`);
    }
});

test('the Codex read budget always covers the generated AGENTS.md root budget', async () => {
    // Given the Codex read budget and the generated AGENTS.md root budget.
    const { CODEX_PROJECT_DOC_MAX_BYTES } = await import(pathToFileURL(migrateScript).href);
    const { AGENTS_ROOT_LIMIT_BYTES } = await import(pathToFileURL(path.join(sourceScriptsDir, 'sync-context-workflows.mjs')).href);
    // When they are compared. Then the root plus its 8 KiB pointer/gate headroom fits what Codex reads —
    // a root allowed to grow past what Codex reads would be silently truncated again.
    assert.ok(AGENTS_ROOT_LIMIT_BYTES + 8192 <= CODEX_PROJECT_DOC_MAX_BYTES,
        `root budget ${AGENTS_ROOT_LIMIT_BYTES} + 8 KiB context pointer/gate headroom must fit the Codex read budget ${CODEX_PROJECT_DOC_MAX_BYTES}`);
});
