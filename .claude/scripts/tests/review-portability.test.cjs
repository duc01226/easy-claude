'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const FRAMEWORK_ROOT = path.resolve(__dirname, '../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const EXCLUDED = new Set(['node_modules', '.venv', '__pycache__', '.git', 'tmp', 'temp', '.cache', '.ck.local.json']);

/** Copy shipped source only; never borrow an adopter's docs, config, mirrors or machine files. */
function withAdopter(fn) {
    const workspace = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-adoption-')));
    const root = path.join(workspace, 'unrelated project');
    const machine = path.join(workspace, 'isolated machine');
    fs.mkdirSync(root); fs.mkdirSync(machine);
    const put = (relative, text) => {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
    };
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^(CK_|CLAUDE_|OCR_|OPENAI_|ANTHROPIC_|GIT_|CODEX_|OPENCODE_)/.test(key)) delete env[key];
    }
    for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) env[key] = machine;
    // Absolute Node invocation works with no npm/global wrapper/Git on PATH on both OS families.
    for (const key of Object.keys(env)) if (key.toUpperCase() === 'PATH') delete env[key];
    env.PATH = '';
    env.CK_REVIEW_TOOL_EXECUTE = '0'; env.CK_REVIEW_TOOL_INSTALL = '0'; env.CK_REVIEW_TOOL_NETWORK = '0';
    try {
        fs.cpSync(FRAMEWORK_ROOT, path.join(root, '.claude'), {
            recursive: true,
            filter: source => {
                const parts = path.relative(FRAMEWORK_ROOT, source).split(path.sep);
                return !parts.some(part => EXCLUDED.has(part) || /^\.env(?:\.|$)/.test(part)) && !fs.lstatSync(source).isSymbolicLink();
            }
        });
        return fn({ root, machine, env, put });
    } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
}

function runPreparation(root, env, scopeArgs, output) {
    const result = spawnSync(process.execPath, [path.join(root, '.claude/scripts/review-prepare.cjs'), ...scopeArgs, '--acquire', 'never', '--output-dir', output], {
        cwd: root, env, shell: false, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = JSON.parse(result.stdout);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, summary.manifest), 'utf8'));
    const target = JSON.parse(fs.readFileSync(path.join(root, output, 'target.json'), 'utf8'));
    return { summary, manifest, target };
}

test('TC-RVP-042 copied portable payload prepares bare and typical adopters without npm or credentials', () => {
    for (const layout of ['bare', 'typical']) withAdopter(({ root, machine, env, put }) => {
        // Given copied framework source in an unrelated adopter with an empty executable PATH.
        const file = layout === 'bare' ? 'named item.txt' : 'src/entry.js';
        const content = layout === 'bare' ? 'A complete named-file target\n' : 'module.exports = value => value + 1;\n';
        put(file, content);
        const dependencies = '{"name":"fixture-adopter","private":true,"dependencies":{}}\n';
        if (layout === 'typical') {
            put('package.json', dependencies); put('package-lock.json', '{"lockfileVersion":3}\n');
            put('guides/review.md', 'Required project rule: preserve entry boundary.\n');
            put('project/docs-index-reference.md', 'Fixture index input\n');
            put('project/lessons.md', 'Fixture independent lesson\n');
            put('docs/project-config.json', JSON.stringify({ project: { name: 'Fixture adopter' }, referenceDocs: [], docsRoots: { projectReference: { path: 'project' } }, reviewPreparation: { ruleDocs: ['guides/review.md'] }, modules: [{ name: 'source', kind: 'library', pathRegex: '/src/' }], reviewGroups: [{ id: 'Entry Review', modules: ['source'], origin: 'user' }] }));
        }
        const trackedInputs = [file, ...(layout === 'typical' ? ['package.json', 'package-lock.json', 'docs/project-config.json', 'guides/review.md'] : [])];
        const before = trackedInputs.map(relative => hash(fs.readFileSync(path.join(root, relative))));
        // When the actual copied CLI prepares and replays exactly the named target with acquisition denied.
        const first = runPreparation(root, env, ['--scope', 'files', '--file', file, '--skill', 'changes-review'], 'tmp/first/prepared');
        const replay = runPreparation(root, env, ['--target-file', 'tmp/first/prepared/target.json', '--skill', 'changes-review'], 'tmp/replay/prepared');
        const child = runPreparation(root, env, ['--target-file', 'tmp/first/prepared/target.json', '--skill', 'code-quality-review'], 'tmp/child/prepared');
        // Then immutable target/rules survive optional failure with no adopter dependency or machine mutation.
        assert.equal(first.manifest.routing.status, 'ready');
        assert.equal(first.manifest.provider.status, 'setup-needed');
        assert.deepEqual(first.manifest.provider.choices, ['Accept setup', 'Turn off OCR for this project', 'Skip this time']);
        assert.equal(first.target.entries.length, 1); assert.equal(first.target.entries[0].path, file);
        assert.equal(fs.readFileSync(path.join(root, first.target.entries[0].afterContentRef), 'utf8'), content);
        assert.equal(first.summary.targetFingerprint, replay.summary.targetFingerprint);
        assert.equal(first.summary.policyFingerprint, replay.summary.policyFingerprint);
        assert.equal(first.summary.targetFingerprint, child.summary.targetFingerprint);
        assert.notEqual(first.summary.policyFingerprint, child.summary.policyFingerprint);
        assert.equal(child.manifest.provider.status, 'setup-needed');
        assert.ok(child.manifest.ruleSources.some(source => source.origin === '.claude/skills/code-quality-review/SKILL.md'));
        const childSkill = '.claude/skills/code-quality-review/SKILL.md';
        put(childSkill, `${fs.readFileSync(path.join(root, childSkill), 'utf8')}\nFixture additional required review instruction.\n`);
        const changedChild = runPreparation(root, env, ['--target-file', 'tmp/first/prepared/target.json', '--skill', 'code-quality-review'], 'tmp/child-recheck/prepared');
        assert.equal(first.summary.targetFingerprint, changedChild.summary.targetFingerprint);
        assert.notEqual(child.summary.policyFingerprint, changedChild.summary.policyFingerprint);
        assert.deepEqual(first.manifest.assignments, replay.manifest.assignments);
        assert.ok(first.manifest.ruleSources.every(source => source.authority === 'required'));
        assert.ok(first.manifest.ruleSources.some(source => source.origin.startsWith('.claude/skills/shared/protocols/')));
        assert.ok(first.manifest.ruleSources.some(source => source.origin === '.claude/skills/shared/review-preparation.md'));
        for (const source of first.manifest.ruleSources) {
            assert.equal(hash(fs.readFileSync(path.join(root, source.contentRef))), source.contentHash);
            assert.ok(source.entryIds.includes(first.target.entries[0].id));
        }
        if (layout === 'typical') {
            for (const origin of ['guides/review.md', 'project/docs-index-reference.md', 'project/lessons.md']) assert.ok(first.manifest.ruleSources.some(source => source.origin === origin), origin);
            assert.equal(first.manifest.assignments[0].groupId, 'Entry Review');
        } else assert.equal(fs.existsSync(path.join(root, 'package.json')), false);
        assert.deepEqual(trackedInputs.map(relative => hash(fs.readFileSync(path.join(root, relative)))), before);
        assert.equal(fs.existsSync(path.join(root, 'node_modules')), false);
        assert.equal(fs.existsSync(path.join(root, '.agents')), false);
        assert.equal(fs.existsSync(path.join(root, '.opencode')), false);
        assert.deepEqual(fs.readdirSync(machine), []);
        // When later work changes, then replay rejects stale evidence rather than reviewing new work silently.
        put(file, `${content}Later different work\n`);
        const changed = spawnSync(process.execPath, [path.join(root, '.claude/scripts/review-prepare.cjs'), '--target-file', 'tmp/first/prepared/target.json', '--acquire', 'never', '--output-dir', 'tmp/drift/prepared'], {
            cwd: root, env, shell: false, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024
        });
        assert.equal(changed.error, undefined); assert.equal(changed.status, 3);
        assert.equal(JSON.parse(changed.stdout).routing.status, 'target-incomplete');
        assert.equal(changed.stdout.includes('Later different work'), false);
    });
});

test('TC-RVP-042 copied canonical review modes retain selected source hashes and reject unknown variants', () => withAdopter(({ root, machine, env, put }) => {
    // Intent: each shipped source-review dispatcher must prepare its actual mode and full selected rules.
    // Given real copied canonical skills, an unrelated project and a parent invocation-only Skip.
    put('entry.cjs', 'module.exports = 1;\n');
    put('standards/caller.md', 'Fixture host-selected review contract\n');
    put('docs/project-config.json', JSON.stringify({ project: { name: 'Fixture adopter' }, referenceDocs: [] }));
    const configBefore = fs.readFileSync(path.join(root, 'docs/project-config.json'));
    const modes = [
        ['ui-design', 'review', ['.claude/skills/ui-design/references/mode-review.md']],
        ['ai-engineering-review', 'code', []],
        ['security-audit', 'changes', []],
        ['security-audit', 'full', []],
        ['seed-test-data', 'review', ['.claude/skills/seed-test-data/references/seed-test-data-skill-review.md']]
    ];
    for (const [skill, mode, procedureDocs] of modes) {
        const lane = skill + '-' + mode;
        const selection = ['--skill', skill, '--skill-mode', mode, '--required-doc', 'standards/caller.md', '--provider-decision', 'skip'];
        // When the actual copied CLI captures and a read-only child replays the same mode/source union.
        const first = runPreparation(root, env, ['--scope', 'files', '--file', 'entry.cjs', ...selection], 'tmp/modes/' + lane + '/parent');
        const replay = runPreparation(root, env, ['--target-file', 'tmp/modes/' + lane + '/parent/target.json', ...selection], 'tmp/modes/' + lane + '/child');
        // Then supported modes remain usable, selected full bytes are bound and no durable choice is saved.
        assert.equal(first.manifest.routing.status, 'ready', lane);
        assert.equal(first.manifest.policySelection.skillName, skill, lane);
        assert.equal(first.manifest.policySelection.skillMode, mode, lane);
        assert.deepEqual(first.manifest.policySelection.procedureDocs, procedureDocs, lane);
        assert.deepEqual(first.manifest.policySelection.requiredDocs, ['standards/caller.md'], lane);
        assert.equal(first.manifest.provider.reason, 'invocation-provider-skipped', lane);
        assert.equal(first.manifest.provider.choices, undefined, lane);
        assert.equal(replay.manifest.provider.reason, 'invocation-provider-skipped', lane);
        assert.equal(replay.summary.targetFingerprint, first.summary.targetFingerprint, lane);
        assert.equal(replay.summary.policyFingerprint, first.summary.policyFingerprint, lane);
        for (const origin of ['.claude/skills/' + skill + '/SKILL.md', 'standards/caller.md', ...procedureDocs]) {
            const source = first.manifest.ruleSources.find(item => item.origin === origin);
            assert.ok(source, lane + ': selected ' + origin);
            assert.equal(source.authority, 'required', lane);
            const expected = fs.readFileSync(path.join(root, origin));
            assert.equal(source.contentHash, hash(expected), lane + ': full source hash ' + origin);
            assert.deepEqual(fs.readFileSync(path.join(root, source.contentRef)), expected, lane + ': full source bytes ' + origin);
        }
        if (skill === 'ui-design') {
            assert.equal(first.manifest.ruleSources.some(source => source.origin.startsWith('.claude/skills/ui-design/references/') && !procedureDocs.includes(source.origin)), false);
        }
        // A supported-mode fix must not weaken the boundary for undeclared actual variants.
        const unknown = spawnSync(process.execPath, [path.join(root, '.claude/scripts/review-prepare.cjs'), '--scope', 'files', '--file', 'entry.cjs', '--skill', skill, '--skill-mode', 'unknown-fixture-mode', '--provider-decision', 'skip', '--acquire', 'never', '--output-dir', 'tmp/modes/' + lane + '/unknown'], {
            cwd: root, env, shell: false, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024
        });
        assert.equal(unknown.error, undefined, unknown.error?.message);
        assert.equal(unknown.status, 2, lane);
        const refused = JSON.parse(unknown.stdout);
        assert.equal(refused.routing.status, 'policy-error', lane);
        assert.ok(refused.routing.reasons.some(reason => reason.code === 'unknown-review-skill-mode'), lane);
        assert.equal(refused.provider.choices, undefined, lane);
    }
    assert.deepEqual(fs.readFileSync(path.join(root, 'docs/project-config.json')), configBefore);
    assert.deepEqual(fs.readdirSync(machine), []);
    assert.equal(fs.existsSync(path.join(root, 'node_modules')), false);
}));

test('TC-RVP-081 portable caller instructions retain host gates and setup ownership without mirror dependencies', () => withAdopter(({ root }) => {
    // Given only the shipped canonical source, with no authoring repository or generated mirrors.
    const read = relative => fs.readFileSync(path.join(root, '.claude', relative), 'utf8');
    const guide = read('skills/shared/review-preparation.md');
    // When each consumer is discovered from the copied payload, then it routes to one real recipe.
    for (const name of ['changes-review', 'code-quality-review', 'workflow-review-changes']) {
        const skill = read(`skills/${name}/SKILL.md`);
        assert.ok(skill.includes('.claude/skills/shared/review-preparation.md'), name);
        assert.ok(skill.includes(`--skill ${name}`), name);
        assert.ok(skill.includes('--provider-decision skip'), `${name} inherits parent skip on capture/replay/recheck`);
        assert.match(skill, /both fingerprints/, name);
        assert.match(skill, /spent (?:round|review round)/, name);
        assert.match(skill, /why-review --validate-findings/, name);
    }
    assert.match(read('skills/code-quality-review/SKILL.md'), /Feedback-only evaluation runs no irrelevant preparation or installation/);
    assert.match(read('skills/changes-review/SKILL.md'), /unsupported commit ranges retain the original host range/);
    assert.match(read('skills/workflow-review-changes/SKILL.md'), /children consume them without recapturing or acquiring/);
    for (const name of ['changes-review', 'workflow-review-changes']) {
        const skill = read(`skills/${name}/SKILL.md`);
        assert.match(skill, /require identical `targetFingerprint`/i, name);
        assert.match(skill, /record each child's manifest and `policyFingerprint` in the host coverage ledger/, name);
        assert.match(skill, /Reprepare\/recheck child policies before accepting evidence; drift invalidates child and parent convergence/, name);
        assert.match(skill, /--acquire never/, name);
    }
    assert.match(guide, /--target-file <parent-target\.json>/);
    assert.match(guide, /Children replay actual skill\/mode\/document union[\s\S]*--acquire never/);
    assert.match(guide, /record each policy fingerprint[\s\S]*recheck every policy/);
    assert.match(read('skills/code-quality-review/SKILL.md'), /--target-file <parent-target\.json> --skill code-quality-review --acquire never/);
    assert.match(read('docs/review-preparation.md'), /unresolved rule contradictions?\s+blocks?\s+completion\b/i);
    assert.match(guide, /Preparation supplies inputs, never a verdict/);
    assert.match(guide, /preserve host gates/);
    assert.match(guide, /2 repair required policy; 3 resolve incomplete\/drifted target/);
    const setup = read('skills/project-config/SKILL.md');
    assert.ok(setup.includes("mergeDetected(config.reviewGroups || [], acceptedProposals, { identityKey: 'id' })"));
    assert.match(setup, /edited-detected entries byte-for-byte/);
    assert.match(read('skills/project-init/SKILL.md'), /delegate evidence-backed `reviewGroups` and `reviewPreparation.ruleDocs` proposals to `\/project-config`/);
    assert.match(read('skills/scan/SKILL.md'), /never `reviewGroups`, `reviewPreparation` or tool installation policy/);
    // No assertion claims an AI verdict, actual host-hook execution, native OS or generated parity.
}));

test('TC-RVP-088 copied setup routes execute Accept Off Skip and inherited replay without dependency writes', () => withAdopter(({ root, env, put }) => {
    // Given a clean project with one actual scalar-save helper and machine execution/install/network denied.
    put('src/entry.js', 'module.exports = 1;\n');
    put('package.json', '{"name":"fixture-project","private":true}\n');
    put('project/team-rule.md', 'Preserve configured team contract');
    put('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'project/settings.json' } }));
    put('project/settings.json', JSON.stringify({ project: { name: 'Fixture project' }, referenceDocs: [], reviewPreparation: { ruleDocs: ['project/team-rule.md'] } }));
    const initial = fs.readFileSync(path.join(root, 'project/settings.json'));
    const packageBytes = fs.readFileSync(path.join(root, 'package.json'));
    const helper = path.join(root, '.claude/skills/project-config/scripts/review-setup.cjs');
    const setup = args => {
        const result = spawnSync(process.execPath, [helper, ...args], { cwd: root, env, shell: false, windowsHide: true, timeout: 35000, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout);
    };
    const selected = ['--scope', 'files', '--file', 'src/entry.js', '--file', 'project/settings.json'];
    const before = runPreparation(root, env, selected, 'tmp/adoption/unresolved');
    assert.equal(before.summary.provider.status, 'setup-needed'); assert.deepEqual(fs.readFileSync(path.join(root, 'project/settings.json')), initial);
    const skipped = runPreparation(root, env, [...selected, '--provider-decision', 'skip'], 'tmp/adoption/skip-parent');
    for (const lane of ['child', 'recheck']) {
        const replay = runPreparation(root, env, ['--target-file', 'tmp/adoption/skip-parent/target.json', '--provider-decision', skipped.summary.providerDecision], `tmp/adoption/skip-${lane}`);
        assert.equal(replay.summary.provider.reason, 'invocation-provider-skipped'); assert.equal(replay.summary.targetFingerprint, skipped.summary.targetFingerprint);
    }
    assert.deepEqual(fs.readFileSync(path.join(root, 'project/settings.json')), initial);
    // When the real consent token is accepted, then save is distinct from execution-denied fallback and recapture reflects it.
    const inspected = setup(['--action', 'inspect']); assert.equal(inspected.configPath, 'project/settings.json');
    const accepted = setup(['--action', 'enable', '--expected-source', inspected.expectedSource]); assert.equal(accepted.provider, 'open-code-review');
    const stale = spawnSync(process.execPath, [path.join(root, '.claude/scripts/review-prepare.cjs'), '--target-file', 'tmp/adoption/unresolved/target.json', '--output-dir', 'tmp/adoption/stale'], { cwd: root, env, shell: false, timeout: 35000, encoding: 'utf8' });
    assert.equal(stale.status, 3);
    const fresh = runPreparation(root, env, selected, 'tmp/adoption/fresh');
    assert.equal(fresh.summary.provider.status, 'fallback'); assert.equal(fresh.summary.provider.reason, 'execution-denied'); assert.equal(fresh.summary.provider.choices, undefined);
    assert.notEqual(fresh.summary.targetFingerprint, before.summary.targetFingerprint); assert.notEqual(fresh.summary.policyFingerprint, before.summary.policyFingerprint);
    assert.ok(fresh.manifest.ruleSources.some(source => source.origin === 'project/team-rule.md' && source.authority === 'required'));
    const off = setup(['--action', 'off', '--expected-source', accepted.expectedSource]); assert.equal(off.provider, 'none');
    for (const lane of ['parent', 'child', 'future']) {
        const result = runPreparation(root, env, selected, `tmp/adoption/off-${lane}`);
        assert.equal(result.summary.provider.status, 'disabled'); assert.equal(result.summary.provider.reason, 'project-provider-disabled'); assert.equal(result.summary.provider.choices, undefined);
    }
    assert.equal(fs.existsSync(path.join(root, 'docs/project-config.json')), false);
    assert.deepEqual(fs.readFileSync(path.join(root, 'package.json')), packageBytes); assert.equal(fs.existsSync(path.join(root, 'node_modules')), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'project/settings.json'))).reviewPreparation, { ruleDocs: ['project/team-rule.md'], provider: 'none' });
}));

test('TC-RVP-088 all source-review specialist pointers consume the shared parent decision with mode exclusions', () => withAdopter(({ root }) => {
    // Given the actual returned C2/C3 canonical carrier sources, copied without mirrors.
    const read = relative => fs.readFileSync(path.join(root, '.claude/skills', relative), 'utf8');
    const pointers = [
        ['why-review/references/full-mode.md', /Artifact rationale and terminal findings validation do not prepare source/],
        ['architecture/SKILL.md', /Design, no-mode help and planned architecture grading are excluded/],
        ['integration-test/references/mode-review.md', /does not run generation or runtime verification/],
        ['security-audit/SKILL.md', /deps[\s\S]*vet[\s\S]*host/],
        ['performance-review/SKILL.md', /Profile\/log\/metrics-only/],
        ['production-readiness-review/SKILL.md', /frontend[\s\S]*tests[\s\S]*docs[\s\S]*config/i],
        ['ai-engineering-review/SKILL.md', /plan[\s\S]*provider/i],
        ['ui-design/references/mode-review.md', /[Ss]creenshot[\s\S]*video[\s\S]*live/],
        ['web-design-guidelines/SKILL.md', /[Ii]mage[\s\S]*live/],
        ['seed-test-data/SKILL.md', /Generate mode and data execution are excluded/]
    ];
    for (const [relative, excluded] of pointers) {
        // When its actual source mode selects work, then the parent skip/leaf/exact-target contract has one owner.
        const text = read(relative);
        assert.ok(text.includes('.claude/skills/shared/review-preparation.md'), relative);
        assert.ok(text.includes('--provider-decision skip'), relative); assert.match(text, /read-only-leaf/, relative); assert.match(text, excluded, relative);
    }
    const recipe = read('shared/review-preparation.md');
    for (const label of ['Accept setup', 'Turn off OCR for this project', 'Skip this time']) assert.ok(recipe.includes(label));
    assert.match(recipe, /expectedSource/); assert.match(recipe, /ALL parent\/child\/recheck calls/);
    for (const name of ['project-config', 'framework-config']) assert.ok(read(`${name}/SKILL.md`).includes('review-setup.cjs --action inspect'));
    assert.match(read('project-init/SKILL.md'), /config-only, never readiness\/acquisition/);
    assert.match(read('scan/SKILL.md'), /never asks the adoption choice[\s\S]*invokes OCR or acquires/);
}));
