'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const templates = require('../../skills/framework-benchmark/lib/templates.cjs');
const files = require('../../skills/framework-benchmark/lib/files.cjs');
const worktrees = require('../../skills/framework-benchmark/lib/worktrees.cjs');
const cli = require('../../skills/framework-benchmark/scripts/templates.cjs');
const benchmarkCli = require('../../skills/framework-benchmark/scripts/benchmark.cjs');
const { resolvePythonCommand } = require('../../hooks/tests/lib/python-command.cjs');

const scratch = path.resolve(__dirname, '../../..', 'tmp', 'tests');
const row = (name, text) => ({ path: name, data: Buffer.from(text), executable: false });
function fixture(extraInputs = []) {
    fs.mkdirSync(scratch, { recursive: true });
    const root = fs.mkdtempSync(path.join(scratch, 'benchmark-template-'));
    const write = (name, value) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); return file; };
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG|LC_ALL)$/i.test(key)));
    const home = path.join(root, 'home'); fs.mkdirSync(home);
    Object.assign(env, { HOME: home, USERPROFILE: home, TMPDIR: root, TEMP: root, TMP: root });
    const inputs = [row('app.cjs', 'module.exports = 1;\n'), row('README.md', 'Ordinary upstream usage\n'), row('LICENSE', 'Synthetic license notice\n'), row('AGENTS.md', 'Upstream agent-only guidance\n'), ...extraInputs];
    const commands = [];
    let source;
    const runCommand = (bin, args, options) => {
        commands.push({ bin, args: [...args] });
        if (args.includes('fetch')) args = args.map(value => value === 'https://example.invalid/corpus.git' ? source.repo : value);
        return execFileSync(bin, args, { ...options, env: { ...env, ...Object.fromEntries(Object.entries(options.env || {}).filter(([key]) => /^GIT_/i.test(key))) } });
    };
    const ports = { runCommand, worktreeOptions: { runCommand }, gitSnapshot(repo, commit) {
        // Execute the real snapshot owner in an isolated child; its internal Git launcher must not inherit workstation settings.
        const script = 'const s=require(process.argv[1]).gitSnapshot(process.argv[2],process.argv[3]);process.stdout.write(JSON.stringify({commit:s.commit,entries:s.entries.map(({data,...r})=>({...r,base64:data.toString("base64")}))}));';
        const observed = JSON.parse(execFileSync(process.execPath, ['-e', script, require.resolve('../../skills/framework-benchmark/lib/files.cjs'), repo, commit], { env, cwd: root, encoding: 'utf8', timeout: 15000 }));
        return { commit: observed.commit, entries: observed.entries.map(({ base64, ...entry }) => ({ ...entry, data: Buffer.from(base64, 'base64') })) };
    } };
    source = worktrees.create(inputs, root, { runCommand });
    const commit = worktrees.git(source.repo, ['rev-parse', 'HEAD'], runCommand).trim();
    const recipe = { schemaVersion: 1, id: 'synthetic-corpus', repository: 'https://example.invalid/corpus.git', commit, licenseFiles: ['LICENSE'], toolchain: 'Node18+; no services', baseline: ['node', '-e', 'if(require("./app.cjs")!==1)process.exit(1)'] };
    const recipeFile = write('recipe.json', recipe);
    const framework = path.join(root, 'framework');
    write('framework/.claude/settings.json', { hooks: {} });
    for (const name of ['project-init', 'project-config', 'scan-all']) write(`framework/.claude/skills/${name}/SKILL.md`, `Synthetic ${name}\n`);
    const runtime = { schemaVersion: 1, backend: 'host', host: 'claude', cliVersion: 'synthetic-native-cli', model: 'synthetic-model-revision', judgeModel: 'synthetic-judge-revision', repeats: 1, seed: 42, timeoutMs: 1000, maxTurns: 10 };
    const runtimeFile = write('runtime.json', runtime);
    const fetch = () => templates.fetchTemplate({ recipeFile, frameworkRoot: framework, outputRoot: root }, ports);
    return { root, write, env, inputs, source, commands, recipe, recipeFile, runtime, runtimeFile, framework, ports, fetch,
        cleanup() { worktrees.remove(source, { runCommand }); fs.rmSync(root, { recursive: true, force: true }); } };
}

function transport(options = {}) {
    const calls = [];
    return { calls, async preflight() {
        // Deliberate setup workload, not a readiness wait: total investment must include non-solver time.
        if (options.preparationMs) await new Promise(resolve => setTimeout(resolve, options.preparationMs));
        return { authentication: 'synthetic fixture, no login touched' };
    }, async execute(runtime, job) {
        calls.push(job);
        if (job.role === 'check') return { exitCode: options.baselineFails ? 1 : 0, failure: null, stdout: 'Synthetic baseline assertion completed', stderr: '' };
        if (options.inferenceError) throw new Error('Synthetic inference interrupted after baseline');
        const packet = { ok: true, requestId: options.wrongRequest ? 'another-request' : job.sessionId, sessionId: 'synthetic-session', host: runtime.host, hostVersion: runtime.cliVersion,
            rootModel: options.wrongModel ? 'other-model' : runtime.model, treatmentIntact: !options.tamper,
            selectedSkills: options.missingSkill ? ['project-init', 'project-config'] : ['project-init', 'project-config', 'scan-all'],
            measurements: { inputTokens: 0, cacheReadTokens: 15, outputTokens: 7, costUsd: null }, billing: { basis: 'unknown actual subscription charge' },
            delta: { entries: options.changeApp ? [{ path: 'app.cjs', base64: Buffer.from('module.exports = 2;\n').toString('base64') }] : [], deleted: [] },
            setupDelta: { entries: options.noSetup ? [] : [
                { path: 'docs/project-config.json', base64: Buffer.from(JSON.stringify({ project: { name: 'Synthetic corpus' } })).toString('base64') },
                { path: 'docs/project-reference/rules.md', base64: Buffer.from('Synthetic source-derived context').toString('base64') }
            ], deleted: [] }
        };
        return { exitCode: 0, failure: null, stdout: '', stderr: '', packet, cleanup: { id: 'synthetic-owned-session', worktreeRemoved: true, temporaryRootRemoved: true, failures: [] }, collection: { savedBeforeCleanup: true } };
    } };
}

// TestSpec: TC-FBM-084
test('TC-FBM-084: template recipes pin public provenance and reject credentials, unsafe paths and unsupported commands', () => {
    const f = fixture();
    try {
        assert.equal(templates.validateRecipe(f.recipe), f.recipe);
        for (const extra of [{ commit: 'main' }, { repository: 'http://example.invalid/repo' }, { repository: 'https://user:secret@example.invalid/repo' }, { repository: 'https://example.invalid/repo?token=private' }, { licenseFiles: [] }, { licenseFiles: ['../LICENSE'] }, { toolchain: '' }, { baseline: [] }, { baseline: ['node', '\0'] }, { unexpected: true }]) assert.throws(() => templates.validateRecipe({ ...f.recipe, ...extra }));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: upstream editor guidance is withheld independently of project root instructions', () => {
    const f = fixture([row('.cursor/rules.md', 'Synthetic upstream editor instructions\n')]);
    try {
        const result = f.fetch();
        assert.deepEqual(files.inventory(path.join(result.root, 'raw')).map(entry => entry.path), ['LICENSE', 'README.md', 'app.cjs']);
        const exclusions = JSON.parse(fs.readFileSync(path.join(result.root, 'exclusions.json'), 'utf8'));
        assert.deepEqual(exclusions.map(entry => entry.path), ['.cursor/rules.md', 'AGENTS.md']);
        assert.equal(exclusions[0].sha256, files.sha('Synthetic upstream editor instructions\n'));
        assert.equal(result.manifest.sourceHash, files.fingerprint(f.inputs));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-006
test('TC-FBM-006: fetched templates preserve upstream notices and ordinary docs while neutralizing agent guidance equally', () => {
    const f = fixture();
    try {
        const result = f.fetch();
        const manifest = templates.load(result.root).manifest;
        assert.equal(manifest.recipe.commit, f.recipe.commit);
        assert.equal(manifest.status, 'fetched');
        assert.equal(fs.readFileSync(path.join(result.root, 'raw/README.md'), 'utf8'), 'Ordinary upstream usage\n');
        assert.equal(fs.readFileSync(path.join(result.root, 'raw/LICENSE'), 'utf8'), 'Synthetic license notice\n');
        assert(!fs.existsSync(path.join(result.root, 'raw/AGENTS.md')));
        const exclusionBytes = fs.readFileSync(path.join(result.root, manifest.excluded.path));
        const exclusions = JSON.parse(exclusionBytes);
        assert.equal(manifest.excluded.count, 1);
        assert.equal(manifest.excluded.sha256, files.sha(exclusionBytes));
        assert.deepEqual(exclusions.map(r => r.path), ['AGENTS.md']);
        assert.equal(exclusions[0].sha256, files.sha('Upstream agent-only guidance\n'));
        assert.equal(manifest.sourceHash, files.fingerprint(f.inputs));
        assert.equal(manifest.rawHash, files.fingerprint(f.inputs.filter(r => r.path !== 'AGENTS.md')));
        assert.equal(manifest.provenance.upstream.savedBeforeCleanup, true);
        assert.equal(files.fingerprint(files.inventory(f.source.work, { filter: file => !files.disposable(file) })), files.fingerprint(f.inputs));
        assert(!fs.readdirSync(result.root).some(name => name.startsWith('native-')));
        const fetchCommand = f.commands.find(c => c.args.includes('fetch'));
        assert(fetchCommand.args.includes(f.recipe.commit));
        assert.equal(fetchCommand.bin, 'git');
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: actual exported ZIP roundtrip retains exact regular-file paths and bytes without host profiles', () => {
    const f = fixture();
    try {
        const result = f.fetch();
        const destination = path.join(f.root, 'unpacked');
        const python = resolvePythonCommand({ cwd: f.root, env: f.env });
        execFileSync(python.command, [...python.baseArgs, '-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(result.root, 'raw.zip'), destination], { timeout: 15000, env: f.env });
        assert.equal(files.fingerprint(files.inventory(destination)), result.manifest.rawHash);
        assert.equal(files.sha(fs.readFileSync(path.join(result.root, 'raw.zip'))), result.manifest.provenance.raw.sha256);
        assert(!files.inventory(destination).some(r => files.agentSurface(r.path) || files.secretFile(r.path) || files.disposable(r.path)));
        assert.throws(() => templates.archive([], path.join(result.root, 'raw.zip'), result.root), /already exists/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: missing licenses and changed fetched application fail before reusable input is admitted', () => {
    const f = fixture();
    try {
        f.write('recipe.json', { ...f.recipe, licenseFiles: ['missing-license'] });
        assert.throws(f.fetch, /Missing upstream license/);
        f.write('recipe.json', f.recipe);
        const result = f.fetch();
        fs.appendFileSync(path.join(result.root, 'raw/app.cjs'), '// changed');
        assert.throws(() => templates.load(result.root), /Raw template source changed/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: exclusion evidence tampering rejects reuse before either arm receives a changed neutral baseline', () => {
    const f = fixture();
    try {
        const result = f.fetch();
        fs.appendFileSync(path.join(result.root, result.manifest.excluded.path), '\nchanged exclusion evidence');
        assert.throws(() => templates.templateInput(result.root, 'brownfield-bootstrap'), /exclusion evidence changed/);
        assert.throws(() => templates.templateInput(result.root, 'brownfield-configured'), /exclusion evidence changed/);
        assert.equal(files.fingerprint(files.inventory(path.join(result.root, 'raw'))), result.manifest.rawHash);
        assert.equal(files.fingerprint(files.inventory(f.source.work, { filter: file => !files.disposable(file) })), files.fingerprint(f.inputs));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: substituted archives and mismatched archive receipts cannot authorize reusable provenance', async () => {
    const f = fixture();
    try {
        for (const archive of ['upstream', 'raw', 'configured']) {
            const fetched = f.fetch();
            const result = archive === 'configured' ? await templates.configureTemplate({ templateRoot: fetched.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: transport() }) : fetched;
            const target = path.join(result.root, `${archive}.zip`);
            const original = fs.readFileSync(target);
            const sameSize = Buffer.from(original); sameSize[sameSize.length - 1] ^= 1;
            fs.writeFileSync(target, sameSize);
            assert.throws(() => templates.load(result.root), /archive identity changed/, 'Equal byte lengths do not attest archive contents');
            fs.writeFileSync(target, original);
            fs.writeFileSync(target, 'substituted archive bytes');
            assert.throws(() => templates.templateInput(result.root, archive === 'configured' ? 'brownfield-configured' : 'brownfield-bootstrap'), /archive|provenance|identity/i);
            fs.writeFileSync(target, original);
            const manifest = JSON.parse(fs.readFileSync(path.join(result.root, 'template.json'), 'utf8'));
            manifest.provenance[archive].sourceHash = files.sha('unrelated application snapshot');
            fs.writeFileSync(path.join(result.root, 'template.json'), JSON.stringify(manifest));
            assert.throws(() => templates.templateInput(result.root, archive === 'configured' ? 'brownfield-configured' : 'brownfield-bootstrap'), /archive|provenance|identity/i);
            fs.writeFileSync(path.join(result.root, 'template.json'), JSON.stringify(result.manifest));
            const sidecar = `${target}.json`, receipt = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
            for (const patch of [{ sourceHash: files.sha('unrelated application snapshot') }, { savedBeforeCleanup: false }]) {
                const changed = { ...receipt, ...patch };
                fs.writeFileSync(sidecar, JSON.stringify(changed));
                fs.writeFileSync(path.join(result.root, 'template.json'), JSON.stringify({ ...result.manifest, provenance: { ...result.manifest.provenance, [archive]: changed } }));
                assert.throws(() => templates.load(result.root), /archive provenance identity changed/, 'Matching metadata cannot override source or retention identity');
                fs.writeFileSync(sidecar, JSON.stringify(receipt));
                fs.writeFileSync(path.join(result.root, 'template.json'), JSON.stringify(result.manifest));
            }
            fs.writeFileSync(sidecar, JSON.stringify({ ...receipt, bytes: receipt.bytes + 1 }));
            assert.throws(() => templates.load(result.root), /archive identity changed/);
            fs.writeFileSync(sidecar, JSON.stringify(receipt));
            const descriptor = fs.openSync(target, 'r+');
            try { fs.ftruncateSync(descriptor, files.LIMITS.bytes * 4 + 1); } finally { fs.closeSync(descriptor); }
            assert.throws(() => templates.load(result.root), /archive type\/size/);
            fs.writeFileSync(target, original);
            assert.equal(templates.load(result.root).manifest.rawHash, result.manifest.rawHash);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: an early configuration filesystem failure leaves one retained failed attempt instead of a fresh fetched template', async () => {
    const f = fixture();
    try {
        const result = f.fetch(), adapter = transport();
        // A local installation may disappear after fetching; this is an ordinary recoverable host failure.
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: path.join(f.root, 'missing-installation'), runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }));
        const saved = templates.load(result.root).manifest;
        assert.equal(saved.status, 'configuration-failed'); assert.match(saved.error, /ENOENT|installation|directory/i);
        assert(Number.isInteger(saved.configuration.wallMs));
        assert.equal(saved.configuration.solverWallMs, null);
        assert.deepEqual(saved.configuration.measurements, { inputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, costUsd: null });
        assert.equal(adapter.calls.length, 0); assert(!fs.existsSync(path.join(result.root, 'configured.zip')));
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }), /one attempt only/);
        assert.equal(files.fingerprint(files.inventory(path.join(result.root, 'raw'))), result.manifest.rawHash);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: configuration cannot claim or remove a pre-existing unrelated input directory', async () => {
    const f = fixture();
    try {
        const result = f.fetch(), existing = path.join(result.root, 'configure-input');
        fs.mkdirSync(existing); fs.writeFileSync(path.join(existing, 'unrelated.md'), 'Unrelated local work must survive unchanged\n');
        const adapter = transport();
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }), /exist|owned|directory|workspace/i);
        assert.equal(fs.readFileSync(path.join(existing, 'unrelated.md'), 'utf8'), 'Unrelated local work must survive unchanged\n');
        assert.deepEqual(fs.readdirSync(existing), ['unrelated.md']);
        assert.equal(adapter.calls.length, 0);
        assert.equal(templates.load(result.root).manifest.status, 'configuration-failed');
        assert(!fs.existsSync(path.join(result.root, 'configured.zip')));
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }), /one attempt only/);
        assert.equal(files.fingerprint(files.inventory(path.join(result.root, 'raw'))), result.manifest.rawHash);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-006
test('TC-FBM-006: interrupted inference retains observed setup time and unknown usage after successful baseline work', async () => {
    const f = fixture();
    try {
        const result = f.fetch(), adapter = transport({ inferenceError: true, preparationMs: 40 });
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }), /interrupted/);
        const saved = templates.load(result.root).manifest;
        assert.equal(saved.status, 'configuration-failed'); assert.equal(saved.baseline.passed, true);
        assert.deepEqual(adapter.calls.map(call => call.role), ['check', 'solve']);
        assert(Number.isInteger(saved.configuration.wallMs));
        assert(saved.configuration.wallMs >= 25, 'Failed preparation retains the known non-solver workload');
        assert.deepEqual(saved.configuration.measurements, { inputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, costUsd: null });
        assert(!fs.existsSync(path.join(result.root, 'configured.zip'))); assert(!fs.existsSync(path.join(result.root, 'configure-input')));
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: transport() }), /one attempt only/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-006
test('TC-FBM-006: one generic context attempt preserves application and retains separately measured setup investment', async () => {
    const f = fixture();
    try {
        const result = f.fetch(), adapter = transport({ preparationMs: 40 });
        const configured = await templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter });
        assert.equal(configured.manifest.status, 'configured');
        assert.deepEqual(adapter.calls.map(c => c.role), ['check', 'solve']);
        assert(!adapter.calls[1].prompt.includes('strict redirect') && !adapter.calls[1].prompt.includes('holdout'));
        assert.match(adapter.calls[1].prompt, /Do not change any application source/);
        assert.equal(configured.manifest.configuration.measurements.costUsd, null);
        assert.equal(configured.manifest.configuration.measurements.inputTokens, 0);
        assert.equal(configured.manifest.configuration.measurements.cacheReadTokens, 15);
        assert(Number.isInteger(configured.manifest.configuration.wallMs));
        assert(Number.isInteger(configured.manifest.configuration.solverWallMs));
        assert(configured.manifest.configuration.wallMs >= configured.manifest.configuration.solverWallMs + 25, 'Total preparation includes the known workload outside the solver stage');
        assert.deepEqual(configured.manifest.configuration.inputCleanup, { path: 'configure-input', removed: true });
        assert.equal(configured.manifest.baseline.passed, true);
        const raw = templates.templateInput(result.root, 'brownfield-bootstrap');
        const full = templates.templateInput(result.root, 'brownfield-configured');
        assert.equal(raw.commit, f.recipe.commit); assert.equal(full.commit, f.recipe.commit);
        assert.equal(raw.template.setupInvestment, null);
        assert.equal(full.template.setupInvestment.observation.path, 'configure-observation.json');
        assert.equal(files.fingerprint(full.entries.filter(r => !files.agentSurface(r.path) && !r.path.startsWith('docs/project-'))), files.fingerprint(raw.entries));
        assert(full.entries.some(r => r.path === 'docs/project-config.json'));
        assert(full.entries.some(r => r.path === '.claude/settings.json'));
        assert(fs.existsSync(path.join(result.root, 'configured.zip')));
        assert(!fs.existsSync(path.join(result.root, 'configure-input')));
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }), /one attempt only/);
        fs.appendFileSync(path.join(result.root, 'configured/app.cjs'), '// changed');
        assert.throws(() => templates.templateInput(result.root, 'brownfield-configured'), /identity changed/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: failed owned input cleanup retains the remaining path and cannot report a configured template', async () => {
    const f = fixture(), remove = fs.rmSync;
    try {
        const result = f.fetch(), workspace = path.join(result.root, 'configure-input');
        fs.rmSync = (target, options) => {
            if (target === workspace) throw new Error('Synthetic filesystem refusal to remove owned input');
            return remove(target, options);
        };
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: transport() }), /filesystem refusal/);
        const saved = templates.load(result.root).manifest;
        assert.equal(saved.status, 'configuration-failed');
        assert.deepEqual(saved.configuration.inputCleanup, { path: 'configure-input', removed: false, error: 'Synthetic filesystem refusal to remove owned input' });
        assert(fs.existsSync(workspace)); assert(fs.existsSync(path.join(result.root, 'configure-observation.json')));
        assert(fs.existsSync(path.join(result.root, 'configured.zip')));
        assert.throws(() => templates.templateInput(result.root, 'brownfield-configured'), /no verified configured input/);
    } finally { fs.rmSync = remove; f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: setup mutations, missing engagement and invalid identity never produce a configured archive', async () => {
    const f = fixture();
    try {
        for (const options of [{ changeApp: true }, { missingSkill: true }, { wrongModel: true }, { wrongRequest: true }, { tamper: true }, { noSetup: true }]) {
            const result = f.fetch();
            await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: transport(options) }));
            assert.equal(templates.load(result.root).manifest.status, 'configuration-failed');
            const failed = templates.load(result.root).manifest;
            assert.equal(failed.configuration.measurements.inputTokens, 0);
            assert.equal(failed.configuration.measurements.costUsd, null);
            assert(Number.isInteger(failed.configuration.wallMs));
            assert.equal(files.sha(fs.readFileSync(path.join(result.root, failed.configuration.observation.path))), failed.configuration.observation.sha256);
            assert(!fs.existsSync(path.join(result.root, 'configured.zip')));
            assert.throws(() => templates.templateInput(result.root, 'brownfield-configured'), /no verified configured input/);
            assert.equal(fs.readFileSync(path.join(result.root, 'raw/app.cjs'), 'utf8'), 'module.exports = 1;\n');
            await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: transport() }), /one attempt only/);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-084
test('TC-FBM-084: failed baseline prevents model calls and unsupported template modes cannot masquerade as configured', async () => {
    const f = fixture();
    try {
        const result = f.fetch(), adapter = transport({ baselineFails: true });
        assert.throws(() => templates.templateInput(result.root, 'greenfield'), /brownfield modes only/);
        assert.throws(() => templates.templateInput(result.root, 'brownfield-configured'), /no verified configured input/);
        await assert.rejects(() => templates.configureTemplate({ templateRoot: result.root, frameworkRoot: f.framework, runtimeFile: f.runtimeFile }, { ...f.ports, transport: adapter }), /ENVIRONMENT-BLOCKED/);
        assert.deepEqual(adapter.calls.map(c => c.role), ['check']);
        assert(fs.existsSync(path.join(result.root, 'baseline-observation.json')));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-006
test('TC-FBM-006: template CLI has standalone literal options and rejects conflicting benchmark sources', () => {
    assert.equal(cli.parseArgs(['fetch', '--recipe', 'recipe.json']).command, 'fetch');
    assert.equal(cli.parseArgs(['configure', '--template', 'template', '--host', 'codex', '--model', 'pinned']).model, 'pinned');
    for (const args of [['fetch'], ['configure'], ['unknown'], ['fetch', '--recipe', 'a', '--recipe', 'b'], ['configure', '--template', 'x', '--runtime', 'r', '--host', 'codex']]) assert.throws(() => cli.parseArgs(args));
    assert.equal(benchmarkCli.parseArgs(['prepare', '--case', 'c', '--template', 't']).template, 't');
    assert.throws(() => benchmarkCli.parseArgs(['prepare', '--case', 'c', '--template', 't', '--project', 'p']), /either a committed project/);
});
