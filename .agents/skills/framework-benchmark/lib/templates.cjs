'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { LIMITS, inventory, gitSnapshot, fingerprint, materialize, json, sha, safeRelative, contained, disposable, secretFile, agentSurface } = require('./files.cjs');
const { validateRuntime, runtimeBackend, runtimeIdentity, measurements } = require('./contract.cjs');
const { frameworkInstallation } = require('./installation.cjs');
const { projectContext } = require('./project-context.cjs');
const worktrees = require('./worktrees.cjs');
const host = require('./host.cjs');

const OWNER = 'framework-benchmark-template-v1';
const read = file => require('./experiment.cjs').readJson(file);
// ZIP repeats path metadata; allow overhead above the snapshot envelope without unbounded hashing.
const MAX_ARCHIVE_BYTES = LIMITS.bytes * 4;

function archiveIdentity(file) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > MAX_ARCHIVE_BYTES) throw new Error('Unsupported template archive type/size');
    const descriptor = fs.openSync(file, 'r'), hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
    let bytes = 0;
    try {
        let count;
        while ((count = fs.readSync(descriptor, buffer, 0, buffer.length, null))) {
            if ((bytes += count) > MAX_ARCHIVE_BYTES) throw new Error('Template archive size limit exceeded');
            hash.update(buffer.subarray(0, count));
        }
    } finally { fs.closeSync(descriptor); }
    return { bytes, sha256: hash.digest('hex') };
}

function validateRecipe(recipe) {
    if (!recipe || recipe.schemaVersion !== 1 || Object.keys(recipe).some(key => !['schemaVersion', 'id', 'repository', 'commit', 'licenseFiles', 'toolchain', 'baseline', 'notes'].includes(key))) throw new Error('Invalid template recipe');
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(recipe.id || '') || !/^[a-f0-9]{40,64}$/.test(recipe.commit || '')) throw new Error('Pin template id and exact upstream commit');
    const url = new URL(recipe.repository);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /[\x00-\x20]/.test(recipe.repository)) throw new Error('Use a public credential-free HTTPS source repository');
    if (!Array.isArray(recipe.licenseFiles) || !recipe.licenseFiles.length || recipe.licenseFiles.length > 16) throw new Error('Declare upstream license paths');
    recipe.licenseFiles.forEach(safeRelative);
    if (typeof recipe.toolchain !== 'string' || !recipe.toolchain.trim() || recipe.toolchain.length > 4000) throw new Error('Declare template toolchain prerequisites');
    if (!Array.isArray(recipe.baseline) || !recipe.baseline.length || recipe.baseline.length > 40 || recipe.baseline.some(arg => typeof arg !== 'string' || !arg || /\x00/.test(arg) || arg.length > 2000)) throw new Error('Declare literal baseline argv');
    if (recipe.notes !== undefined && (typeof recipe.notes !== 'string' || recipe.notes.length > 8000)) throw new Error('Invalid recipe notes');
    return recipe;
}

function archive(entries, output, parent, ports = {}) {
    if (fs.existsSync(output)) throw new Error('Template archive destination already exists');
    const session = worktrees.create(entries, parent, ports.worktreeOptions);
    try {
        worktrees.git(session.repo, ['archive', '--format=zip', `--output=${output}`, 'HEAD'], ports.runCommand || execFileSync);
        const receipt = { path: path.basename(output), ...archiveIdentity(output), sourceHash: fingerprint(entries), savedBeforeCleanup: true };
        // The durable archive and its receipt precede removal of the exact owned source worktree.
        json(`${output}.json`, receipt);
        return receipt;
    } finally { worktrees.remove(session, ports.worktreeOptions); }
}

function load(root) {
    root = fs.realpathSync(root);
    const manifest = read(path.join(root, 'template.json'));
    if (manifest.owner !== OWNER || manifest.schemaVersion !== 1) throw new Error('Not an owned benchmark template');
    validateRecipe(manifest.recipe);
    if (fingerprint(inventory(path.join(root, 'raw'))) !== manifest.rawHash) throw new Error('Raw template source changed');
    for (const [name, sourceHash] of [['upstream', manifest.sourceHash], ['raw', manifest.rawHash], ...(manifest.provenance?.configured || manifest.status === 'configured' ? [['configured', manifest.configuredHash]] : [])]) {
        const receipt = manifest.provenance?.[name];
        if (!receipt || receipt.path !== `${name}.zip` || !/^[a-f0-9]{64}$/.test(sourceHash || '') || receipt.sourceHash !== sourceHash || receipt.savedBeforeCleanup !== true) throw new Error('Template archive provenance identity changed');
        const file = contained(root, receipt.path), saved = read(contained(root, `${name}.zip.json`)), actual = archiveIdentity(file);
        if (['path', 'bytes', 'sha256', 'sourceHash', 'savedBeforeCleanup'].some(key => saved[key] !== receipt[key]) || actual.bytes !== receipt.bytes || actual.sha256 !== receipt.sha256) throw new Error('Template archive identity changed');
    }
    if (!manifest.excluded || manifest.excluded.path !== 'exclusions.json' || !Number.isSafeInteger(manifest.excluded.count) || manifest.excluded.count < 0 || manifest.excluded.count > LIMITS.files) throw new Error('Invalid template exclusion evidence');
    const exclusionFile = contained(root, manifest.excluded.path);
    if (sha(fs.readFileSync(exclusionFile)) !== manifest.excluded.sha256) throw new Error('Template exclusion evidence changed');
    return { root, manifest };
}

function application(entries, frameworkRoot) {
    const settings = path.join(fs.realpathSync(frameworkRoot), '.claude', '.ck.json');
    const installation = fs.existsSync(settings) ? [{ path: '.claude/.ck.json', data: fs.readFileSync(settings) }] : [];
    const context = projectContext(entries, { projectMode: 'brownfield-bootstrap' }, installation);
    const keep = row => !disposable(row.path) && !secretFile(row.path) && !agentSurface(row.path) && !context.isContext(row.path);
    return { entries: entries.filter(keep), excluded: entries.filter(row => !keep(row)).map(row => ({ path: row.path, sha256: sha(row.data), bytes: row.data.length })), context };
}

function fetchTemplate({ recipeFile, frameworkRoot, outputRoot }, ports = {}) {
    const recipe = validateRecipe(read(fs.realpathSync(recipeFile)));
    const root = fs.mkdtempSync(path.join(fs.realpathSync(outputRoot), 'template-'));
    json(path.join(root, 'template.json'), { owner: OWNER, schemaVersion: 1, status: 'fetching', recipe });
    const session = worktrees.create([], root, ports.worktreeOptions);
    try {
        worktrees.git(session.repo, ['fetch', '--depth=1', recipe.repository, recipe.commit], ports.runCommand || execFileSync);
        const source = (ports.gitSnapshot || gitSnapshot)(session.repo, recipe.commit);
        if (source.commit !== recipe.commit) throw new Error('Fetched template commit mismatch');
        for (const file of recipe.licenseFiles) if (!source.entries.some(row => row.path === file)) throw new Error(`Missing upstream license: ${file}`);
        const selected = application(source.entries, frameworkRoot);
        if (!selected.entries.length) throw new Error('Template has no application source');
        materialize(path.join(root, 'raw'), selected.entries);
        const upstream = archive(source.entries, path.join(root, 'upstream.zip'), root, ports);
        const raw = archive(selected.entries, path.join(root, 'raw.zip'), root, ports);
        const exclusions = path.join(root, 'exclusions.json'); json(exclusions, selected.excluded);
        const manifest = { owner: OWNER, schemaVersion: 1, status: 'fetched', createdAt: new Date().toISOString(), recipe,
            sourceHash: fingerprint(source.entries), rawHash: fingerprint(selected.entries), excluded: { count: selected.excluded.length, path: 'exclusions.json', sha256: sha(fs.readFileSync(exclusions)) },
            provenance: { upstream, raw, note: 'Snapshots exclude known secret/disposable paths. Upstream agent/setup instructions are neutralized equally before either arm. ZIP metadata may differ across preparations; path/content hashes are authoritative.' } };
        json(path.join(root, 'template.json'), manifest);
        return { root, manifest };
    } catch (error) {
        json(path.join(root, 'fetch-error.json'), { error: error.message }); throw error;
    } finally { worktrees.remove(session, ports.worktreeOptions); }
}

async function configureTemplate({ templateRoot, frameworkRoot, runtimeFile, nativeOptions }, ports = {}) {
    const { root, manifest } = load(templateRoot);
    if (manifest.status !== 'fetched') throw new Error('Template configuration is one attempt only; retain failed inputs and fetch a fresh template');
    const runtime = validateRuntime(runtimeFile ? read(fs.realpathSync(runtimeFile)) : host.discoverRuntime(nativeOptions));
    if (runtimeBackend(runtime) !== 'host') throw new Error('Template context preparation requires native account execution');
    const lock = fs.openSync(path.join(root, 'configure.lock'), 'wx'); fs.closeSync(lock);
    const start = performance.now();
    const workspace = path.join(root, 'configure-input');
    let ownsWorkspace = false, failure = null;
    manifest.status = 'configuring'; manifest.configuration = { runtime, wallMs: 0, solverWallMs: null, measurements: measurements(), billing: null };
    const save = () => { manifest.configuration.wallMs = Math.round(performance.now() - start); json(path.join(root, 'template.json'), manifest); };
    const { checkedCall, applyDelta } = require('./experiment.cjs');
    const transport = ports.transport || host;
    const sessionId = crypto.randomUUID();
    try {
        save();
        const source = inventory(path.join(root, 'raw'));
        const installation = frameworkInstallation({ frameworkRoot, runtime });
        const context = projectContext(source, { projectMode: 'brownfield-bootstrap' }, installation);
        Object.assign(manifest.configuration, { sourceHash: fingerprint(source), frameworkHash: fingerprint(installation), contextRoots: context.roots });
        fs.mkdirSync(workspace); ownsWorkspace = true;
        materialize(workspace, [...source, ...installation]);
        save();
        const environment = await transport.preflight(runtime, { workspace });
        json(path.join(root, 'configure-environment.json'), environment);
        const baseline = await checkedCall(transport, runtime, { role: 'check', workspace: path.join(root, 'raw'), checksDir: root,
            argv: manifest.recipe.baseline, timeoutMs: 300000 }, path.join(root, 'baseline-observation.json'));
        // Exit status is command evidence. Case qualification still verifies actual discovered assertions.
        manifest.baseline = { passed: !baseline.failure && baseline.exitCode === 0, argv: manifest.recipe.baseline, wallMs: baseline.wallMs, observation: 'baseline-observation.json' };
        json(path.join(root, 'template.json'), manifest);
        if (!manifest.baseline.passed) throw new Error('ENVIRONMENT-BLOCKED: template baseline command did not pass; inspect retained observation');
        const observed = await checkedCall(transport, runtime, { role: 'solve', arm: 'framework', purpose: 'template-configuration', sessionId, workspace, contextRoots: context.roots,
            treatment: 'Run project-init, project-config and scan-all to prepare generic project context. Routine reversible decisions are delegated. Do not solve or invent a future feature.',
            prompt: 'Prepare this pristine existing project as a reusable framework consumer template. Fully load and execute the installed project-init and project-config skills, then scan-all for applicable project reference docs and ai-context-refresh through their existing owners. Resolve project facts from source/manifests/tests and ordinary upstream docs. No task-specific brief or acceptance answers are supplied. Do not change any application source, ordinary docs, dependencies, tests or fixtures; write only declared project configuration/reference docs/root agent context. Do not commit, publish, modify framework controls or ask routine questions. Report actual setup evidence and limits.' }, path.join(root, 'configure-observation.json'));
        const reply = observed.packet;
        Object.assign(manifest.configuration, { solverWallMs: observed.wallMs, measurements: measurements(reply?.measurements), billing: reply?.billing || null,
            observation: { path: 'configure-observation.json', sha256: sha(fs.readFileSync(path.join(root, 'configure-observation.json'))) }, cleanup: observed.cleanup || null,
            collection: observed.collection || null, engagement: { required: ['project-init', 'project-config', 'scan-all'], observation: 'configure-observation.json' } });
        save();
        if (!reply?.ok || reply.rootModel !== runtime.model || !runtimeIdentity(runtime, reply, sessionId) || reply.treatmentIntact !== true) throw new Error('Context preparation identity/completion/framework integrity failed');
        for (const skill of ['project-init', 'project-config', 'scan-all']) if (!reply.selectedSkills?.includes(skill)) throw new Error(`Context preparation missing verified ${skill} engagement`);
        const current = applyDelta(source, reply.delta);
        if (fingerprint(current) !== fingerprint(source)) throw new Error('Context preparation changed application bytes');
        const setup = applyDelta([], reply.setupDelta, file => context.isContext(file) && !secretFile(file));
        const checked = projectContext(setup, { projectMode: 'brownfield-configured', projectConfigPath: context.configPath }, installation);
        const configured = [...source, ...installation.filter(row => !context.isContext(row.path)), ...setup];
        materialize(path.join(root, 'configured'), configured);
        const packed = archive(configured, path.join(root, 'configured.zip'), root, ports);
        manifest.status = 'configured'; manifest.configuredHash = fingerprint(configured); manifest.setupHash = checked.hash;
        manifest.provenance.configured = packed;
        return { root, manifest };
    } catch (error) {
        failure = error; manifest.status = 'configuration-failed'; manifest.error = error.message; throw error;
    } finally {
        // A failed retention write preserves the input; only this invocation's exclusive creation grants cleanup.
        save();
        if (ownsWorkspace) {
            try {
                fs.rmSync(workspace, { recursive: true, force: true });
                manifest.configuration.inputCleanup = { path: 'configure-input', removed: true };
            } catch (error) {
                manifest.configuration.inputCleanup = { path: 'configure-input', removed: false, error: error.message };
                manifest.status = 'configuration-failed'; manifest.error = failure?.message || error.message;
                save();
                if (!failure) throw error;
            }
            save();
        }
    }
}

function templateInput(templateRoot, projectMode) {
    const { root, manifest } = load(templateRoot);
    if (!['brownfield-bootstrap', 'brownfield-configured'].includes(projectMode)) throw new Error('Templates supply brownfield modes only');
    const configured = projectMode === 'brownfield-configured';
    if (configured && manifest.status !== 'configured') throw new Error('Template has no verified configured input');
    const entries = inventory(path.join(root, configured ? 'configured' : 'raw'));
    if (fingerprint(entries) !== (configured ? manifest.configuredHash : manifest.rawHash)) throw new Error('Template input identity changed');
    return { commit: manifest.recipe.commit, entries, template: { id: manifest.recipe.id, manifestHash: sha(fs.readFileSync(contained(root, 'template.json'))),
        repository: manifest.recipe.repository, commit: manifest.recipe.commit, sourceHash: manifest.sourceHash, rawHash: manifest.rawHash,
        setupInvestment: configured ? manifest.configuration : null, provenance: manifest.provenance, exclusions: manifest.excluded } };
}

module.exports = { OWNER, validateRecipe, archive, application, load, fetchTemplate, configureTemplate, templateInput };
