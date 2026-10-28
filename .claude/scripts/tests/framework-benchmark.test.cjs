'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const files = require('../../skills/framework-benchmark/lib/files.cjs');
const contract = require('../../skills/framework-benchmark/lib/contract.cjs');
const experiment = require('../../skills/framework-benchmark/lib/experiment.cjs');
const report = require('../../skills/framework-benchmark/lib/report.cjs');
const docker = require('../../skills/framework-benchmark/lib/docker.cjs');
const session = require('../../skills/framework-benchmark/scripts/container-session.cjs');
const cli = require('../../skills/framework-benchmark/scripts/benchmark.cjs');
const journey = require('../../skills/framework-benchmark/lib/journey.cjs');

// TechnicalSpec: benchmark-control-boundaries. All fixture projects belong to this test.
const scratch = path.resolve(__dirname, '../../..', 'tmp', 'tests');
fs.mkdirSync(scratch, { recursive: true });

function fixture() {
    const root = fs.mkdtempSync(path.join(scratch, 'framework-benchmark-'));
    const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value)); };
    write('case/fixture/app.cjs', "module.exports = 'baseline';\n");
    write('case/fixture/AGENTS.md', 'Synthetic project and framework instructions');
    write('case/checks/acceptance.cjs', 'Synthetic frozen acceptance verifier');
    write('case/checks/regression.cjs', 'Synthetic frozen regression verifier');
    write('framework/.claude/settings.json', { hooks: {} });
    write('framework/.claude/skills/feature-implement/SKILL.md', 'Synthetic treatment instruction');
    write('framework/.claude/skills/framework-benchmark/cases/hidden.cjs', 'Synthetic oracle must never be mounted while solving');
    // Historical single-pass mechanics stay explicit; skilled defaults have separate contract tests.
    const spec = { schemaVersion: 1, id: 'fixture-case', kind: 'feature', assessment: { profile: 'legacy' }, projectMode: 'brownfield-bootstrap', fixture: 'fixture', checksDir: 'checks',
        prompt: 'Implement a capability with boundary behavior.', treatment: 'Use feature-implement.', expectedSkills: ['feature-implement'],
        checks: [
            { id: 'acceptance', kind: 'acceptance', baseline: 'fail', argv: ['node', '/checks/acceptance.cjs'], timeoutMs: 1000 },
            { id: 'regression', kind: 'regression', baseline: 'pass', argv: ['node', '/checks/regression.cjs'], timeoutMs: 1000 }
        ] };
    const runtime = { schemaVersion: 1, image: `synthetic/runtime@sha256:${'a'.repeat(64)}`, model: 'synthetic-model-revision', judgeModel: 'synthetic-judge-revision', claudeVersion: '2.0.0',
        repeats: 2, seed: 2, timeoutMs: 10000, maxTurns: 10, budgetUsd: 1, judgeBudgetUsd: 0.25, memoryMb: 512, cpus: 1 };
    write('case/case.json', spec); write('runtime.json', runtime); fs.mkdirSync(path.join(root, 'tmp'));
    const prepare = () => experiment.prepare({ caseFile: path.join(root, 'case/case.json'), runtimeFile: path.join(root, 'runtime.json'), frameworkRoot: path.join(root, 'framework'), outputRoot: path.join(root, 'tmp') });
    return { root, write, spec, runtime, prepare, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('benchmark fixture output remains inside the consuming project tmp directory', () => {
    const f = fixture();
    try {
        assert.equal(fs.realpathSync(path.resolve(f.root, '../../..', '.claude/scripts/tests')), fs.realpathSync(__dirname));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-008
test('TC-FBM-008: contained historical grading remains explicit and omission cannot silently create a new unskilled comparison', () => {
    const f = fixture();
    try {
        const legacy = f.prepare(), saved = experiment.load(legacy.root).state;
        assert.deepEqual(saved.case.assessment, { profile: 'legacy' });
        assert.equal(saved.identity.evaluatorHash, undefined);
        assert(!fs.existsSync(path.join(legacy.root, 'evaluator')));
        const supplied = { ...f.spec }; delete supplied.assessment;
        f.write('case/case.json', supplied);
        assert.throws(f.prepare, /Skilled assessment requires native account execution/);
        assert.deepEqual(experiment.load(legacy.root).state.case.assessment, { profile: 'legacy' });
        assert.deepEqual(contract.assessmentPolicy(supplied), { profile: 'legacy' }, 'Saved older cases retain the older contract without relabeling it current');
    } finally { f.cleanup(); }
});

function transport(options = {}) {
    const calls = [];
    return {
        calls,
        async preflight() { if (options.environmentError) throw new Error('ENVIRONMENT-BLOCKED: fixture daemon unavailable'); return { imageId: 'synthetic-only', platform: 'fixture' }; },
        async execute(runtime, job) {
            calls.push(job);
            const content = fs.existsSync(path.join(job.workspace, 'app.cjs')) ? fs.readFileSync(path.join(job.workspace, 'app.cjs'), 'utf8') : '';
            if (job.role === 'check') {
                const acceptance = job.argv[1].includes('acceptance');
                const mismatch = options.baselineMismatch === (acceptance ? 'acceptance' : 'regression');
                return { exitCode: options.invalidBaseline ? 127 : mismatch ? (acceptance ? 0 : 1) : acceptance && !content.includes('implemented') ? 1 : 0, stdout: 'fixture check observation', stderr: '', failure: null, wallMs: 999999 };
            }
            if (job.role === 'solve' && options.interrupt) throw new Error('fixture interruption');
            const identity = { sessionId: options.reusedSession ? 'reused-session' : job.sessionId, hostVersion: '2.0.0 (Claude Code)', rootModel: job.role === 'review' ? runtime.judgeModel : runtime.model };
            const measurements = options.unknownUsage ? {} : { inputTokens: 20, cacheReadTokens: 5, cacheWriteTokens: 0, outputTokens: 10, costUsd: 0.01 };
            if (job.role === 'solve') {
                const implemented = (job.arm === 'framework' && !options.frameworkFails) || (job.arm === 'raw' && options.rawPasses);
                const setupDelta = { entries: [
                    { path: 'docs/project-config.json', base64: Buffer.from(JSON.stringify({ project: { name: 'Synthetic consumer' } })).toString('base64') },
                    { path: 'docs/project-reference/rules.md', base64: Buffer.from('Use fixture intent and existing application conventions.').toString('base64') }
                ], deleted: [] };
                const names = job.arm === 'framework' && !options.missingSkill ? options.skills || ['project-init', 'feature-implement'] : [];
                const skillEvents = names.flatMap((skill, i) => [{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'skill-' + i, name: 'Skill', input: typeof skill === 'string' ? { skill } : skill }] } }, ...(options.missingSkillResult ? [] : [{ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'skill-' + i, is_error: options.failedSkillResult === true, content: 'fixture load receipt' }] } }])]);
                const skillProof = session.parseStream(skillEvents.map(row => JSON.stringify(row)).join('\n'));
                const delta = { entries: implemented ? [{ path: 'app.cjs', base64: Buffer.from("module.exports = 'implemented';\n").toString('base64') }] : [], deleted: [] };
                if (options.failedSolver) return { exitCode: null, failure: 'timeout', stdout: JSON.stringify({ type: 'started', ...identity }) + '\n', stderr: '' };
                return { exitCode: 0, failure: null, stderr: '', stdout: JSON.stringify({ ok: true, ...identity, delta, setupDelta: options.missingSetup ? undefined : options.setupDelta || setupDelta, treatmentIntact: !(options.frameworkTamper && job.arm === 'framework'), selectedSkills: skillProof.selectedSkills, attemptedSkills: skillProof.attemptedSkills, activatedWorkflows: skillProof.activatedWorkflows, engagedSkills: skillProof.engagedSkills, discoveredSkills: [], measurements }) };
            }
            if (job.purpose === 'journey') {
                const cite = 'manifest.json:1 synthetic public observation coverage';
                const story = { story: [{ phase: 'Fixture observation', account: 'Synthetic control only; no live journey inferred', evidence: [cite] }],
                    aspects: Object.fromEntries(journey.ASPECTS.map(key => [key, { summary: 'Fixture coverage only', evidence: [cite], basis: 'unknown' }])), limitations: ['Synthetic mechanics control, not model behavior'] };
                return { exitCode: 0, failure: null, stderr: '', stdout: JSON.stringify({ ok: true, ...identity, candidateIntact: true, review: story, measurements }) };
            }
            const review = { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: options.invalidReview ? 8 : content ? 3 : 0, evidence: options.fakeEvidence ? 'missing.cjs:99 unsupported' : content ? 'app.cjs:1 Observable fixture artifact' : 'EMPTY:1 no work produced' }])), findings: [] };
            return { exitCode: 0, failure: null, stderr: '', stdout: JSON.stringify({ ok: true, ...identity, candidateIntact: true, review, measurements }) };
        }
    };
}

test('TC-FBM-071: preparation freezes app bytes and excludes instructions and holdouts from the raw control', () => {
    const entries = ['c.cjs', 'a.cjs', 'b.cjs'].map(file => ({ path: file, data: Buffer.from(file) }));
    const originalPaths = entries.map(row => row.path);
    const expectedHash = files.fingerprint(entries);
    for (const permutation of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
        const arranged = permutation.map(index => entries[index]);
        const before = arranged.map(row => row.path);
        assert.equal(files.fingerprint(arranged), expectedHash, 'Enumeration order must not change the identity of the same files');
        assert.deepEqual(arranged.map(row => row.path), before, 'Hashing must preserve caller-owned array order');
    }
    assert.deepEqual(entries.map(row => row.path), originalPaths);
    assert.notEqual(files.fingerprint([{ ...entries[0], data: Buffer.from('changed byte') }, ...entries.slice(1)]), expectedHash);
    assert.notEqual(files.fingerprint([{ ...entries[0], path: 'renamed.cjs' }, ...entries.slice(1)]), expectedHash);
    assert.throws(() => files.fingerprint([...entries, { ...entries[0], path: 'C.cjs' }]), /Case-colliding/);
    const f = fixture();
    try {
        const prepared = f.prepare();
        const base = files.inventory(path.join(prepared.root, 'base'));
        const treatment = files.inventory(path.join(prepared.root, 'framework'));
        assert.deepEqual(base.map(row => row.path), ['app.cjs']);
        assert(treatment.some(row => row.path === '.claude/settings.json'));
        assert(treatment.some(row => row.path === 'AGENTS.md'));
        assert(!treatment.some(row => row.path.includes('cases/hidden')));
        assert.equal(prepared.configuredModelBudgetUsd, 6);
        assert.equal(fs.readFileSync(path.join(f.root, 'case/fixture/app.cjs'), 'utf8'), "module.exports = 'baseline';\n");
        assert.doesNotThrow(() => experiment.verifyFrozen(prepared.root, experiment.load(prepared.root).state));
        fs.appendFileSync(path.join(prepared.root, 'checks/acceptance.cjs'), '\nchanged');
        assert.throws(() => experiment.verifyFrozen(prepared.root, experiment.load(prepared.root).state), /Frozen benchmark inputs changed/);
    } finally { f.cleanup(); }
});

test('TC-FBM-072: instruction stripping keeps application CI and rejects traversal and case collisions', () => {
    for (const file of ['CLAUDE.md', 'nested/AGENTS.override.md', '.claude/settings.json', '.github/instructions/rule.md', '.codex/hooks.json', '.mcp.json']) assert.equal(files.agentSurface(file), true, file);
    assert.equal(files.agentSurface('.github/workflows/ci.yml'), false);
    for (const file of ['../outside', '/outside', 'nested/../../outside', 'C:/outside', 'a\\b', 'a\nb']) assert.throws(() => files.safeRelative(file));
    assert.throws(() => files.validateEntries([{ path: 'A', data: Buffer.from('x') }, { path: 'a', data: Buffer.from('y') }]), /Case-colliding/);
});

test('TC-FBM-077: unsafe, secret and oversized filesystem inputs cannot become solver artifacts', () => {
    const f = fixture();
    try {
        f.write('case/fixture/.env', 'synthetic-secret');
        assert(!files.inventory(path.join(f.root, 'case/fixture'), { filter: file => !files.secretFile(file) }).some(row => row.path === '.env'));
        f.write('case/fixture/big', 'x'.repeat(33));
        assert.throws(() => files.inventory(path.join(f.root, 'case/fixture'), { limits: { ...files.LIMITS, fileBytes: 32 } }), /limit exceeded/);
        if (process.platform !== 'win32') {
            fs.symlinkSync(path.join(f.root, 'runtime.json'), path.join(f.root, 'case/fixture/escape'));
            assert.throws(() => files.inventory(path.join(f.root, 'case/fixture')), /Unsupported snapshot entry/);
        }
        for (const volume of [10, 100]) {
            const rows = Array.from({ length: volume }, (_, i) => ({ path: `f${i}.cjs`, data: Buffer.from(String(i)), executable: false }));
            assert.equal(files.validateEntries(rows).length, volume);
            assert.equal(files.fingerprint(rows), files.fingerprint([...rows]));
        }
        assert.throws(() => files.validateEntries([{ path: 'a', data: Buffer.alloc(0) }, { path: 'b', data: Buffer.alloc(0) }], { ...files.LIMITS, files: 1 }), /file limit/);
    } finally { f.cleanup(); }
});

test('TC-FBM-071: committed snapshots exclude local edits and Git history without touching the original checkout', () => {
    const f = fixture();
    try {
        const repo = path.join(f.root, 'source'); fs.mkdirSync(repo);
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG)$/i.test(key)));
        Object.assign(env, { HOME: f.root, USERPROFILE: f.root, TMPDIR: f.root, TEMP: f.root, TMP: f.root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(f.root, 'no-global-config') });
        const git = args => execFileSync('git', ['-C', repo, ...args], { env, stdio: 'pipe' });
        git(['init', '-q']); f.write('source/app.cjs', 'committed'); git(['add', 'app.cjs']);
        // A synthetic fixture commit only; no authoring-checkout Git writes.
        git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'fixture']);
        f.write('source/app.cjs', 'local-edit'); f.write('source/untracked.cjs', 'untracked');
        const snapshot = files.gitSnapshot(repo, 'HEAD');
        assert.deepEqual(snapshot.entries.map(row => [row.path, row.data.toString()]), [['app.cjs', 'committed']]);
        assert.equal(fs.readFileSync(path.join(repo, 'app.cjs'), 'utf8'), 'local-edit');
        assert.match(snapshot.commit, /^[a-f0-9]{40,64}$/);
    } finally { f.cleanup(); }
});

test('TC-FBM-001: valid paired runs keep identical prompts/budgets, alternate order and use fresh blind reviewers', async () => {
    const f = fixture();
    try {
        const prepared = f.prepare(); const driver = transport();
        const state = await experiment.run(prepared.root, { transport: driver });
        assert.equal(state.phase, 'complete');
        assert.deepEqual(state.pairs.map(pair => pair.order), [['raw', 'framework'], ['framework', 'raw']]);
        assert.equal(report.summarize(state).successDelta, 1);
        const solves = driver.calls.filter(job => job.role === 'solve');
        assert.equal(new Set(solves.map(job => job.prompt)).size, 1);
        assert(solves.every(job => job.prompt === f.spec.prompt));
        const reviews = driver.calls.filter(job => job.role === 'review');
        assert(reviews.every(job => !/\b(raw|framework)\b/.test(path.basename(job.workspace))));
        assert(reviews.every(job => !files.inventory(job.workspace).some(row => files.agentSurface(row.path))));
        assert.equal(new Set([...solves, ...reviews].map(job => job.sessionId)).size, 12);
        assert.equal(state.pairs[0].raw.success, false);
        assert.equal(state.pairs[0].framework.success, true);
        assert(state.pairs[0].raw.solver.wallMs < 999999);
        assert(fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8').includes('not a claim of framework superiority'));
        await assert.rejects(experiment.run(prepared.root, { transport: driver }), /already attempted/);
    } finally { f.cleanup(); }
});

test('TC-FBM-078: invalid baseline blocks all model spending and produces a readable partial report', async () => {
    for (const options of [{ invalidBaseline: true }, { baselineMismatch: 'acceptance' }, { baselineMismatch: 'regression' }]) {
        const f = fixture();
        try {
            const prepared = f.prepare(); const driver = transport(options);
            const state = await experiment.run(prepared.root, { transport: driver });
            assert.equal(state.phase, 'blocked'); assert.match(state.error, /BASELINE_INVALID/);
            assert(driver.calls.length > 0 && driver.calls.every(job => job.role === 'check'));
            if (options.baselineMismatch) {
                assert(state.baseline.every(check => !check.invalid));
                const mismatch = state.baseline.find(check => check.kind === options.baselineMismatch);
                assert.notEqual(mismatch.passed, mismatch.baseline === 'pass');
            }
            assert.equal(experiment.load(prepared.root).state.phase, 'blocked');
            assert.equal(report.summarize(state).validPairs, 0);
            assert(fs.existsSync(path.join(prepared.root, 'report.md')));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-073: timeouts and workflow non-engagement stay in the paired denominator as failed attempts', async () => {
    for (const option of [{ failedSolver: true }, { missingSkill: true }, { missingSetup: true }]) {
        const f = fixture();
        try {
            const state = await experiment.run(f.prepare().root, { transport: transport(option) });
            assert.equal(state.pairs.length, 2);
            assert.equal(report.summarize(state).validPairs, 2);
            assert.equal(state.pairs[0].framework.success, false);
            if (option.failedSolver) assert.equal(state.pairs[0].raw.success, false);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-073: raw wins, neutral ties, runtime reuse and treatment tampering cannot be relabeled as framework wins', async () => {
    for (const option of [{ rawPasses: true, frameworkFails: true }, { rawPasses: true }, { reusedSession: true }, { frameworkTamper: true }]) {
        const f = fixture();
        try {
            const state = await experiment.run(f.prepare().root, { transport: transport(option) });
            const summary = report.summarize(state);
            if (option.reusedSession || option.frameworkTamper) { assert.equal(state.phase, 'inconclusive'); assert.equal(summary.validPairs, 0); assert.equal(summary.successDelta, null); }
            else { assert.equal(summary.successDelta, option.frameworkFails ? -1 : 0); assert.equal(option.frameworkFails ? summary.losses : summary.ties, 2); }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-074: unknown usage stays unknown and malformed or fabricated reviewer evidence stays ungraded', async () => {
    for (const option of [{ unknownUsage: true }, { invalidReview: true }, { fakeEvidence: true }]) {
        const f = fixture();
        try {
            const state = await experiment.run(f.prepare().root, { transport: transport(option) });
            const summary = report.summarize(state);
            if (option.unknownUsage) {
                assert.equal(summary.measuredCostPairs, 0); assert.equal(summary.meanSolverCostDeltaUsd, null);
                assert.equal(summary.arms.raw.knownSolverCostUsd, null); assert.equal(state.pairs[0].raw.solver.measurements.outputTokens, null);
            } else { assert.equal(state.phase, 'inconclusive'); assert.equal(summary.qualityPairs, 0); assert.equal(summary.qualityDelta, null); }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-051: infrastructure absence and interrupted runs retain checkpoints and never claim completion', async () => {
    for (const option of [{ environmentError: true }, { interrupt: true }]) {
        const f = fixture();
        try {
            const prepared = f.prepare(); const state = await experiment.run(prepared.root, { transport: transport(option) });
            assert.equal(state.phase, 'blocked'); assert(state.error);
            const restored = experiment.load(prepared.root).state;
            assert.equal(restored.phase, 'blocked'); assert.equal(report.summarize(restored).uncompletedPairs, 2);
            assert.equal(restored.error, state.error);
            const displayedError = option.environmentError ? 'ENVIRONMENT\\-BLOCKED\\: fixture daemon unavailable' : 'fixture interruption';
            assert(fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8').includes(`Run error: ${displayedError}`));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072: container launch separates solver/check/reviewer mounts, credentials, network and permissions', () => {
    const f = fixture();
    try {
        const solve = docker.runArgs(f.runtime, { role: 'solve', workspace: f.root }, 'owned-test-container');
        const grade = docker.runArgs(f.runtime, { role: 'check', workspace: f.root, checksDir: path.join(f.root, 'case/checks') }, 'owned-test-container');
        const review = docker.runArgs(f.runtime, { role: 'review', workspace: f.root }, 'owned-test-container');
        assert(!solve.some(arg => arg.includes('target=/checks')));
        assert(grade.includes('none')); assert(!grade.includes('ANTHROPIC_API_KEY'));
        assert(grade.some(arg => arg.includes('target=/checks,readonly')));
        assert(review.some(arg => arg.includes('target=/input,readonly')));
        for (const args of [solve, grade, review]) {
            assert(args.includes('--cap-drop=ALL')); assert(args.includes('--read-only')); assert(args.includes('--pull=never'));
            assert(args.includes('/workspace:rw,nosuid,size=512m'));
            assert(args.filter(arg => arg.startsWith('type=bind')).every(arg => arg.endsWith(',readonly')));
            assert(!args.some(arg => /docker\.sock|--privileged|network=host/.test(arg)));
        }
        const job = { runtime: f.runtime, sessionId: crypto.randomUUID(), arm: 'raw', role: 'solve', treatment: 'Use skill' };
        assert(session.argsFor(job).includes('--bare'));
        assert(!session.argsFor({ ...job, arm: 'framework' }).includes('--bare'));
        assert(session.argsFor({ ...job, role: 'review', reviewSchema: {} }).includes('Read,Glob,Grep'));
        const env = docker.cleanEnv({ PATH: '/synthetic/bin', GH_TOKEN: 'forbidden', AWS_SECRET_ACCESS_KEY: 'forbidden', CK_WORKFLOW_ROUTE_MODE: 'off', ANTHROPIC_API_KEY: 'synthetic-key' });
        assert.deepEqual(Object.keys(env).sort(), ['ANTHROPIC_API_KEY', 'PATH']);
        assert.equal(docker.redact('secret:synthetic-key', env), 'secret:[REDACTED]');
        assert.throws(() => docker.mount('/synthetic,unsafe', '/workspace'), /commas/);
    } finally { f.cleanup(); }
});

test('TC-FBM-003: configured brownfield treatment alone receives relocated config/reference docs; bootstrap excludes old setup', () => {
    const f = fixture();
    try {
        f.write('case/fixture/config/context.json', { project: { name: 'Synthetic consumer' }, docsRoots: { projectReference: { path: 'handbook/agent-reference' } } });
        f.write('case/fixture/.claude/.ck.json', { portability: { projectConfigPath: 'config/context.json' } });
        f.write('case/fixture/handbook/agent-reference/rules.md', 'Synthetic documented architecture conventions');
        f.spec.projectMode = 'brownfield-configured'; f.spec.projectConfigPath = 'config/context.json';
        f.write('case/case.json', f.spec);
        const configured = f.prepare();
        assert.deepEqual(files.inventory(path.join(configured.root, 'base')).map(row => row.path), ['app.cjs']);
        const treatment = files.inventory(path.join(configured.root, 'framework')).map(row => row.path);
        assert(treatment.includes('config/context.json')); assert(treatment.includes('handbook/agent-reference/rules.md'));
        assert.equal(experiment.load(configured.root).state.projectSetup.referenceRoot, 'handbook/agent-reference');
        f.spec.projectMode = 'brownfield-bootstrap'; f.write('case/case.json', f.spec);
        const bootstrap = f.prepare();
        assert(!files.inventory(path.join(bootstrap.root, 'framework')).some(row => row.path.startsWith('handbook/')));
        f.spec.projectMode = 'brownfield-configured'; fs.rmSync(path.join(f.root, 'case/fixture/config/context.json')); f.write('case/case.json', f.spec);
        assert.throws(f.prepare, /requires a committed project config/);
    } finally { f.cleanup(); }
});

test('TC-FBM-002: an empty greenfield base is supported and its treatment mandates the greenfield-init workflow', () => {
    const f = fixture();
    try {
        f.spec.kind = 'greenfield'; f.spec.projectMode = 'greenfield'; delete f.spec.fixture;
        f.spec.expectedSkills = ['workflow-greenfield-init']; f.write('case/case.json', f.spec);
        const prepared = f.prepare();
        assert.equal(files.inventory(path.join(prepared.root, 'base')).length, 0);
        const { treatmentInstruction, expectedSkills } = require('../../skills/framework-benchmark/lib/project-context.cjs');
        assert.match(treatmentInstruction(f.spec), /workflow-greenfield-init/);
        assert.match(treatmentInstruction(f.spec), /complete task brief/);
        assert.deepEqual(expectedSkills(f.spec), ['workflow-greenfield-init']);
    } finally { f.cleanup(); }
});

test('TC-FBM-072: candidate export cannot write outside the artifact tree or smuggle agent instructions', () => {
    const base = [{ path: 'app.cjs', data: Buffer.from('baseline'), executable: false }];
    for (const file of ['../outside', '.claude/settings.json', 'AGENTS.md', 'C:/outside']) assert.throws(() => experiment.applyDelta(base, { entries: [{ path: file, base64: 'eA==' }], deleted: [] }));
    assert.throws(() => experiment.applyDelta(base, { entries: [{ path: 'app.cjs', base64: 'bad-base64' }], deleted: [] }));
    assert.throws(() => experiment.applyDelta(base, { entries: [], deleted: ['missing'] }));
    const result = experiment.applyDelta(base, { entries: [{ path: 'new.cjs', base64: Buffer.from('new').toString('base64') }], deleted: ['app.cjs'] });
    assert.deepEqual(result.map(row => row.path), ['new.cjs']); assert.equal(result[0].data.toString(), 'new');
});

test('TC-FBM-077: bounded command capture reports missing tools, timeouts, output overflow and redacts provider keys', async () => {
    const env = docker.cleanEnv(); env.ANTHROPIC_API_KEY = 'synthetic-provider-secret';
    const normal = await docker.capture(process.execPath, ['-e', 'process.stdout.write(process.env.ANTHROPIC_API_KEY)'], { env });
    assert.equal(normal.stdout, '[REDACTED]'); assert.equal(normal.exitCode, 0);
    const timed = await docker.capture(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 30, env });
    assert.equal(timed.failure, 'timeout');
    const huge = await docker.capture(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { maxOutput: 50, env });
    assert.equal(huge.failure, 'output-limit');
    const missing = await docker.capture('framework-benchmark-nonexistent-tool', [], { env });
    assert.match(missing.failure, /^launch:/);
});

test('TC-FBM-077: CLI and case contracts fail closed before running commands', () => {
    assert.equal(cli.parseArgs(['--help']).command, 'help');
    for (const args of [['prepare'], ['run'], ['run', '--run', 'x', '--run', 'y'], ['prepare', '--case', 'x', '--runtime', 'y', '--unknown', 'z']]) assert.throws(() => cli.parseArgs(args));
    const f = fixture();
    try {
        assert.throws(() => cli.outputDirectory(f.root, '../outside'), /tmp/);
        assert.equal(cli.outputDirectory(f.root, 'tmp/a b'), path.join(f.root, 'tmp/a b'));
        for (const update of [{ repeats: 0 }, { repeats: 21 }, { image: 'mutable:latest' }, { timeoutMs: Infinity }, { budgetUsd: NaN }]) assert.throws(() => contract.validateRuntime({ ...f.runtime, ...update }));
        assert.throws(() => contract.validateCase({ ...f.spec, checks: f.spec.checks.map(row => ({ ...row, id: 'duplicate' })) }), /Duplicate/);
        assert.throws(() => contract.validateCase({ ...f.spec, checksDir: '../outside' }), /contained/);
    } finally { f.cleanup(); }
});

test('TC-FBM-077: every declared runtime resource bound accepts its endpoints and rejects unsafe values', () => {
    const f = fixture();
    try {
        const bounds = { repeats: [1, 20], seed: [0, 0xffffffff], timeoutMs: [1000, 3600000], maxTurns: [1, 500], memoryMb: [256, 32768], cpus: [1, 16] };
        for (const [field, [low, high]] of Object.entries(bounds)) {
            for (const value of [low, high]) assert.doesNotThrow(() => contract.validateRuntime({ ...f.runtime, [field]: value }), field);
            for (const value of [low - 1, high + 1, low + 0.5, NaN, Infinity, null, '1']) assert.throws(() => contract.validateRuntime({ ...f.runtime, [field]: value }), undefined, field);
        }
        for (const field of ['budgetUsd', 'judgeBudgetUsd']) {
            for (const value of [Number.MIN_VALUE, 0.5, 100]) assert.doesNotThrow(() => contract.validateRuntime({ ...f.runtime, [field]: value }));
            for (const value of [0, -1, 100.001, NaN, Infinity, null, '1']) assert.throws(() => contract.validateRuntime({ ...f.runtime, [field]: value }));
        }
        for (const field of ['model', 'judgeModel']) {
            assert.doesNotThrow(() => contract.validateRuntime({ ...f.runtime, [field]: 'x'.repeat(200) }));
            for (const value of ['', ' ', 'x'.repeat(201), 'x\0y', 'sonnet', 'latest', 'vendor/latest', 'REPLACE_WITH_MODEL']) assert.throws(() => contract.validateRuntime({ ...f.runtime, [field]: value }));
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-077: case text, skill, check and argv boundaries prevent unbounded or ambiguous commands', () => {
    const f = fixture();
    const check = update => ({ ...f.spec, checks: [{ ...f.spec.checks[0], ...update }, f.spec.checks[1]] });
    try {
        for (const [field, length] of [['id', 80], ['prompt', 64000], ['treatment', 4000]]) {
            assert.doesNotThrow(() => contract.validateCase({ ...f.spec, [field]: 'a'.repeat(length) }));
            for (const value of ['', ' ', 'a'.repeat(length + 1), 'a\0b', null]) assert.throws(() => contract.validateCase({ ...f.spec, [field]: value }));
        }
        const skills = Array.from({ length: 32 }, (_, i) => `skill-${i}`);
        assert.doesNotThrow(() => contract.validateCase({ ...f.spec, expectedSkills: skills }));
        assert.doesNotThrow(() => contract.validateCase({ ...f.spec, expectedSkills: ['a'.repeat(64)] }));
        for (const value of [[], [...skills, 'extra'], ['a', 'a'], ['a'.repeat(65)], ['Uppercase']]) assert.throws(() => contract.validateCase({ ...f.spec, expectedSkills: value }));
        const checks = Array.from({ length: 32 }, (_, i) => ({ ...f.spec.checks[i % 2], id: `check-${i}` }));
        assert.doesNotThrow(() => contract.validateCase({ ...f.spec, checks }));
        for (const value of [[], [checks[0]], [...checks, { ...checks[0], id: 'extra' }]]) assert.throws(() => contract.validateCase({ ...f.spec, checks: value }));
        for (const value of [100, 300000]) assert.doesNotThrow(() => contract.validateCase(check({ timeoutMs: value })));
        for (const value of [99, 300001, 100.5, NaN, Infinity]) assert.throws(() => contract.validateCase(check({ timeoutMs: value })));
        for (const argv of [['fixture-check'], Array(40).fill('arg'), ['a'.repeat(2000)]]) assert.doesNotThrow(() => contract.validateCase(check({ argv })));
        for (const argv of [[], Array(41).fill('arg'), ['a'.repeat(2001)], [''], ['a\0b'], [false]]) assert.throws(() => contract.validateCase(check({ argv })));
        assert.throws(() => contract.validateCase({ ...f.spec, checks: f.spec.checks.map(row => ({ ...row, baseline: 'fail' })) }), /Regression/);
    } finally { f.cleanup(); }
});

test('TC-FBM-077: snapshot bounds count all paths and bytes and reject oversized files before reading', () => {
    const f = fixture();
    try {
        const rows = Array.from({ length: 12000 }, (_, i) => ({ path: `f${i}`, data: Buffer.alloc(0) }));
        assert.equal(files.validateEntries([...rows]).length, 12000);
        assert.throws(() => files.validateEntries([...rows, { path: 'extra', data: Buffer.alloc(0) }]), /file limit/);
        const chunk = Buffer.alloc(4 * 1024 * 1024);
        const full = Array.from({ length: 32 }, (_, i) => ({ path: `b${i}`, data: chunk }));
        assert.equal(files.validateEntries([...full]).length, 32);
        assert.throws(() => files.validateEntries([...full, { path: 'extra', data: Buffer.alloc(1) }]), /byte\/depth limit/);
        assert.throws(() => files.validateEntries([{ path: 'big', data: Buffer.alloc(chunk.length + 1) }]), /byte\/depth limit/);
        assert.doesNotThrow(() => files.validateEntries([{ path: 'd/'.repeat(31) + 'f', data: Buffer.alloc(0) }]));
        assert.throws(() => files.validateEntries([{ path: 'd/'.repeat(32) + 'f', data: Buffer.alloc(0) }]), /depth limit/);
        f.write('bounded/keep.cjs', 'x');
        fs.writeFileSync(path.join(f.root, 'bounded/large.cjs'), Buffer.alloc(chunk.length + 1));
        const target = fs.realpathSync(path.join(f.root, 'bounded/large.cjs'));
        const read = fs.readFileSync; let oversizedReads = 0;
        try {
            fs.readFileSync = function(file, ...args) {
                if (String(file) === target) { oversizedReads++; throw new Error('Oversized bytes must never be read'); }
                return read.call(this, file, ...args);
            };
            assert.throws(() => files.inventory(path.join(f.root, 'bounded')), /Snapshot byte\/file limit/);
            assert.equal(oversizedReads, 0);
        } finally { fs.readFileSync = read; }
    } finally { f.cleanup(); }
});

test('TC-FBM-051 TC-FBM-071: public CLI prepares, reports and retains unavailable-key failure without launching a model', () => {
    const f = fixture();
    try {
        const script = path.resolve(__dirname, '../../skills/framework-benchmark/scripts/benchmark.cjs');
        const env = checkEnvironment(f, f.root);
        const invoke = args => require('node:child_process').spawnSync(process.execPath, [script, ...args], { cwd: f.root, env, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
        const prepared = invoke(['prepare', '--case', 'case/case.json', '--runtime', 'runtime.json', '--framework', 'framework']);
        assert.equal(prepared.status, 0, prepared.stderr);
        const receipt = JSON.parse(prepared.stdout);
        assert(path.relative(f.root, receipt.root).startsWith(`tmp${path.sep}`));
        const before = invoke(['report', '--run', receipt.root]);
        assert.equal(before.status, 0, before.stderr); assert.equal(JSON.parse(before.stdout).phase, 'prepared');
        const blocked = invoke(['run', '--run', receipt.root]);
        assert.equal(blocked.status, 1); assert.match(blocked.stdout, /Benchmark blocked/);
        const saved = experiment.load(receipt.root).state;
        assert.equal(saved.phase, 'blocked'); assert.match(saved.error, /ANTHROPIC_API_KEY/); assert.equal(saved.pairs.length, 0);
        const after = invoke(['report', '--run', receipt.root]);
        assert.equal(after.status, 0); assert.equal(JSON.parse(after.stdout).uncompletedPairs, 2);
        const replay = invoke(['run', '--run', receipt.root]);
        assert.equal(replay.status, 1); assert.match(replay.stderr, /already attempted/);
    } finally { f.cleanup(); }
});

test('TC-FBM-074: CLI stream parsing uses observed provider usage and actual Skill calls, never answer text as tool proof', () => {
    const observed = session.parseStream([
        { type: 'system', subtype: 'init', session_id: 'actual', skills: [] },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'I used plan' }, { type: 'tool_use', id: 'observed-skill', name: 'Skill', input: { skill: 'feature-implement' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'observed-skill', is_error: false, content: 'Skill loaded' }] } },
        { type: 'result', subtype: 'success', session_id: 'actual', usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.02 }
    ].map(row => JSON.stringify(row)).join('\n'));
    assert.deepEqual(observed.selectedSkills, ['feature-implement']);
    assert.equal(observed.result.total_cost_usd, 0.02);
    assert.equal(observed.sessionId, 'actual');
    assert.deepEqual(contract.measurements({ inputTokens: -1, outputTokens: 2.5, costUsd: NaN }), { inputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, costUsd: null });
});

test('TC-FBM-078: bundled fictional tasks have discriminating acceptance checks and a passing refactor baseline', () => {
    const root = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner');
    const f = fixture();
    try {
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG)$/i.test(key)));
        Object.assign(env, { HOME: f.root, USERPROFILE: f.root, TMPDIR: f.root, TEMP: f.root, TMP: f.root });
        for (const variant of ['feature-fixture', 'refactor-fixture']) {
            const childEnv = { ...env, BENCH_WORKSPACE: path.join(root, variant) };
            assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(root, 'checks/regression.cjs')], { env: childEnv, stdio: 'pipe', timeout: 30000 }));
            if (variant === 'feature-fixture') assert.throws(() => execFileSync(process.execPath, [path.join(root, 'checks/acceptance.cjs')], { env: childEnv, stdio: 'pipe', timeout: 30000 }));
            else assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(root, 'checks/acceptance.cjs')], { env: childEnv, stdio: 'pipe', timeout: 30000 }));
        }
        for (const name of ['greenfield', 'feature', 'plan-implement', 'refactor']) assert.doesNotThrow(() => contract.validateCase(JSON.parse(fs.readFileSync(path.join(root, `${name}.json`), 'utf8'))));
    } finally { f.cleanup(); }
});

test('TC-FBM-075: concurrent callers cannot reserve the same campaign twice', async () => {
    const f = fixture();
    try {
        const prepared = f.prepare();
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        const driver = transport();
        driver.preflight = async () => { await barrier; return { platform: 'fixture' }; };
        const first = experiment.run(prepared.root, { transport: driver });
        await assert.rejects(experiment.run(prepared.root, { transport: driver }), /already attempted/);
        release();
        assert.equal((await first).phase, 'complete');
    } finally { f.cleanup(); }
});

test('TC-FBM-071: case, runtime, setup and treatment edits invalidate prepared inputs', () => {
    for (const mutate of [state => { state.case.prompt += 'changed'; }, state => { state.runtime.maxTurns++; }, state => { state.projectSetup.configPath = 'other.json'; }]) {
        const f = fixture();
        try {
            const prepared = f.prepare(); const { state } = experiment.load(prepared.root);
            mutate(state);
            assert.throws(() => experiment.verifyFrozen(prepared.root, state), /Frozen benchmark inputs changed/);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-004 TC-FBM-076: setup receipt and observed initialization order are required, not answer claims', async () => {
    const f = fixture();
    try {
        const driver = transport(); const execute = driver.execute;
        driver.execute = async (runtime, job) => {
            assert.equal(job.inputHash, files.fingerprint(files.inventory(job.workspace)));
            const result = await execute(runtime, job);
            if (job.arm === 'framework') {
                const body = JSON.parse(result.stdout);
                body.selectedSkills = ['feature-implement', 'project-init'];
                result.stdout = JSON.stringify(body);
            }
            return result;
        };
        const state = await experiment.run(f.prepare().root, { transport: driver });
        assert.equal(state.pairs[0].framework.setup.valid, true);
        assert.equal(state.pairs[0].framework.treatmentFidelity, false);
        assert.equal(state.pairs[0].framework.success, false);
        assert.equal(report.summarize(state).validPairs, 2);
    } finally { f.cleanup(); }
});

test('TC-FBM-079: reviewer evidence must resolve artifact lines and every rubric dimension', () => {
    const scores = Object.fromEntries(contract.DIMENSIONS.map(key => [key, { score: 3, evidence: 'app.cjs:1 concrete reason' }]));
    const review = { scores, findings: [] };
    const entries = [{ path: 'app.cjs', data: Buffer.from('first line\nsecond line') }];
    assert.doesNotThrow(() => { contract.validateReview(review); experiment.validateEvidence(review, entries); });
    // Every evidence consumer resolves the same real file and ordered inclusive endpoints.
    for (const eol of ['\n', '\r\n']) {
        entries[0].data = Buffer.from(['first line', 'second line'].join(eol));
        for (const location of ['app.cjs:1', 'app.cjs:2', 'app.cjs:1-1', 'app.cjs:1-2', 'app.cjs:2-2']) {
            const evidence = `${location} concrete reason`;
            scores.correctness.evidence = evidence;
            review.findings = [{ severity: 'medium', evidence, consequence: 'Observed candidate defect' }];
            review.decisions = [{ reason: evidence }];
            assert.doesNotThrow(() => experiment.validateEvidence(review, entries), `${eol}: ${location}`);
        }
    }
    const invalid = ['app.cjs:3', 'app.cjs:2-1', 'app.cjs:1-3', 'app.cjs:3-3',
        'app.cjs:0', 'app.cjs:01', 'app.cjs:1-0', 'app.cjs:1-02', 'app.cjs:1--2',
        'app.cjs:1-2x', 'app.cjs:1:2', 'app.cjs:1–2', 'app.cjs:1-2-2', 'app.cjs:1-9007199254740993',
        'missing.cjs:1-2', '../app.cjs:1-2', './app.cjs:1-2', '/app.cjs:1-2', '.claude/toolkit.cjs:1-2'];
    for (const location of invalid) {
        const evidence = `${location} unsupported location`;
        scores.correctness.evidence = 'app.cjs:1 valid score'; review.findings = []; review.decisions = [];
        scores.correctness.evidence = evidence;
        assert.throws(() => experiment.validateEvidence(review, entries), /missing artifact\/line/, `score: ${location}`);
        scores.correctness.evidence = 'app.cjs:1 valid score';
        review.findings = [{ severity: 'medium', evidence, consequence: 'Unsupported claim' }];
        assert.throws(() => experiment.validateEvidence(review, entries), /missing artifact\/line/, `finding: ${location}`);
        review.findings = []; review.decisions = [{ reason: evidence }];
        assert.throws(() => experiment.validateEvidence(review, entries), /missing artifact\/line/, `decision: ${location}`);
    }
    delete review.decisions;
    assert.doesNotThrow(() => contract.validateReview(review));
    delete scores.correctness;
    assert.throws(() => contract.validateReview(review), /review correctness/);
});

test('TC-FBM-079: wholly empty failed work can be scored zero without fabricated artifact citations', () => {
    const review = { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 0, evidence: 'EMPTY:1 no work produced' }])), findings: [] };
    assert.doesNotThrow(() => { contract.validateReview(review); experiment.validateEvidence(review, []); });
    review.scores.correctness.evidence = 'EMPTY:1-1 fabricated span';
    assert.throws(() => experiment.validateEvidence(review, []), /missing artifact\/line/);
    review.scores.correctness.evidence = 'EMPTY:1 no work produced';
    review.scores.correctness.score = 1;
    assert.throws(() => experiment.validateEvidence(review, []));
    assert.throws(() => experiment.validateEvidence(review, [{ path: 'real', data: Buffer.from('work') }]));
});

test('TC-FBM-077: greenfield cannot silently begin from existing application files', () => {
    const f = fixture();
    try {
        f.spec.kind = 'greenfield'; f.spec.projectMode = 'greenfield'; f.write('case/case.json', f.spec);
        assert.throws(f.prepare, /empty application baseline/);
        assert.throws(() => contract.validateRuntime({ ...f.runtime, apiKey: 'synthetic' }), /credentials/);
    } finally { f.cleanup(); }
});

test('TC-FBM-074: reports retain evaluation costs and cache-token coverage separately from solver costs', async () => {
    const f = fixture();
    try {
        const state = await experiment.run(f.prepare().root, { transport: transport() });
        const summary = report.summarize(state);
        assert.equal(summary.arms.raw.usage.cacheReadTokens.mean, 5);
        assert.equal(summary.arms.raw.usage.cacheReadTokens.measuredAttempts, 2);
        assert.equal(summary.campaign.review.knownCostUsd, 0.04);
        assert.equal(summary.campaign.solver.knownCostAttempts, 4);
        assert.equal(summary.campaign.review.observedAttempts, 4);
    } finally { f.cleanup(); }
});

function runtimeFixture(options = {}) {
    const f = fixture();
    f.write('input/app.cjs', "module.exports = 'baseline';\n");
    f.write('input/AGENTS.md', 'stale project context');
    f.write('input/.claude/settings.json', { hooks: {} });
    const source = path.join(f.root, 'input');
    const workspace = path.join(f.root, 'runtime-work');
    const calls = [], packets = [], stdout = [], stderr = [];
    const job = { role: 'solve', arm: 'framework', sessionId: crypto.randomUUID(), runtime: f.runtime, prompt: f.spec.prompt,
        treatment: f.spec.treatment, contextRoots: ['docs/project-config.json', 'docs/project-reference', 'AGENTS.md'], inputHash: files.fingerprint(files.inventory(source)) };
    const ports = { files, journey, input: source, workspace, env: { HOME: path.join(f.root, 'private-home') }, emit: packet => packets.push(packet), stdout: value => stdout.push(value), stderr: value => stderr.push(value),
        runCommand(bin, args, settings) {
            calls.push({ bin, args, settings });
            if (bin === 'git') return { status: 0, stdout: 'git version fixture', stderr: '' };
            if (args[0] === '--version') return { status: 0, stdout: `${options.wrongVersion ? '0.0.0' : '2.0.0'} (Claude Code)`, stderr: '' };
            if (args[0] === '--help') return { status: 0, stdout: '--bare --session-id --max-budget-usd --json-schema --tools --setting-sources --strict-mcp-config', stderr: '' };
            if (bin === 'fixture-check') return { status: options.checkCode ?? 7, stdout: 'check output', stderr: 'check diagnostic', error: options.checkError ? new Error('fixture launch') : undefined };
            assert.equal(bin, 'claude'); assert.equal(settings.cwd, workspace);
            if (job.role === 'solve') {
                fs.writeFileSync(path.join(workspace, 'app.cjs'), "module.exports = 'implemented';\n");
                fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'refreshed project context');
                f.write('runtime-work/docs/project-config.json', { project: { name: 'Fixture' } });
                f.write('runtime-work/docs/project-reference/rules.md', 'documented conventions');
                if (options.addControl) f.write('runtime-work/.claude/.ck.local.json', { portability: { workflowRouteMode: 'off' } });
                if (options.addRule) f.write('runtime-work/.claude/rules/override.md', 'Synthetic native rule must remain an immutable control');
                if (options.addInstruction) {
                    f.write(`runtime-work/${options.addInstruction}`, 'Synthetic added native instruction');
                    f.write('runtime-work/src/app.cjs', 'module.exports = 1;');
                }
                if (options.privateDirectory) f.write('runtime-work/credentials/private.json', 'Synthetic private directory content');
                if (options.deleteControl) fs.rmSync(path.join(workspace, '.claude/settings.json'));
                if (options.runtimeTamper) fs.writeFileSync(path.join(workspace, '.claude/settings.json'), 'changed runtime');
            }
            if (options.emptyOutput) return { status: 1, stdout: '', stderr: 'provider unavailable' };
            const result = { type: 'result', subtype: options.stopReason || 'success', session_id: job.sessionId, result: 'fixture response', usage: { input_tokens: 7, output_tokens: 4, cache_read_input_tokens: 2, cache_creation_input_tokens: 1 }, total_cost_usd: 0.03,
                structured_output: { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: 3, evidence: 'app.cjs:1 reason' }])), findings: [] } };
            return { status: 0, stdout: [{ type: 'system', subtype: 'init', model: job.role === 'review' ? f.runtime.judgeModel : f.runtime.model, session_id: job.sessionId, skills: [] }, { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'runtime-skill', name: 'Skill', input: { skill: 'project-init' } }] } }, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'runtime-skill', is_error: false, content: 'Skill loaded' }] } }, result].map(value => JSON.stringify(value)).join('\n') };
        }
    };
    return { ...f, job, ports, calls, packets, stdout, stderr, workspace };
}

test('TC-FBM-004: runtime entrypoint exports legitimate root setup refresh without relaxing immutable runtime checks', () => {
    for (const runtimeTamper of [false, true]) {
        const f = runtimeFixture({ runtimeTamper });
        try {
            assert.equal(session.main(f.job, f.ports), 0);
            assert.equal(f.packets[0].type, 'started');
            const result = f.packets.at(-1);
            assert.equal(result.ok, true); assert.equal(result.treatmentIntact, !runtimeTamper);
            assert.equal(result.rootModel, f.runtime.model); assert.equal(result.sessionId, f.job.sessionId);
            assert.deepEqual(result.delta.entries.map(row => row.path), ['app.cjs']);
            assert(result.setupDelta.entries.some(row => row.path === 'AGENTS.md'));
            assert.equal(Buffer.from(result.setupDelta.entries.find(row => row.path === 'AGENTS.md').base64, 'base64').toString(), 'refreshed project context');
            assert.deepEqual(result.selectedSkills, ['project-init']);
            assert.deepEqual(result.measurements, { inputTokens: 7, outputTokens: 4, cacheReadTokens: 2, cacheWriteTokens: 1, costUsd: 0.03 });
            assert(f.calls.some(call => call.bin === 'git' && call.args.includes('commit')));
            assert.equal(fs.readFileSync(path.join(f.root, 'input/AGENTS.md'), 'utf8'), 'stale project context');
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072 TC-FBM-078: runtime main preserves check exit/diagnostics and rejects mismatched mounts/versions', () => {
    for (const checkError of [false, true]) {
        const f = runtimeFixture({ checkError });
        try {
            f.job.role = 'check'; f.job.argv = ['fixture-check', 'literal arg']; f.job.timeoutMs = 1000;
            assert.equal(session.main(f.job, f.ports), checkError ? 125 : 7);
            assert.deepEqual(f.stdout, ['check output']); assert.deepEqual(f.stderr, ['check diagnostic']);
            assert(!f.calls.some(call => call.bin === 'claude')); assert.equal(f.packets.length, 0);
        } finally { f.cleanup(); }
    }
    for (const reason of ['mount', 'version']) {
        const f = runtimeFixture({ wrongVersion: reason === 'version' });
        try {
            if (reason === 'mount') f.job.inputHash = 'wrong';
            assert.throws(() => session.main(f.job, f.ports), reason === 'mount' ? /Mounted input/ : /Pinned Claude/);
            assert(!f.calls.some(call => call.args[0] === '-p'));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-073 TC-FBM-074 TC-FBM-079: runtime main observes provider failures, loop exhaustion and independent review output', () => {
    for (const variant of [{ emptyOutput: true }, { stopReason: 'error_max_budget_usd' }, { role: 'review' }, { role: 'probe' }]) {
        const f = runtimeFixture(variant);
        try {
            if (variant.role) f.job.role = variant.role;
            assert.equal(session.main(f.job, f.ports), 0);
            const result = f.packets.at(-1);
            if (variant.emptyOutput) { assert.equal(result.ok, false); assert.equal(result.failureClass, 'infrastructure'); assert.equal(result.measurements.costUsd, null); }
            else if (variant.stopReason) { assert.equal(result.ok, false); assert.equal(result.failureClass, 'task'); }
            else if (variant.role === 'review') { assert.equal(result.candidateIntact, true); assert.equal(result.rootModel, f.runtime.judgeModel); assert.equal(result.review.findings.length, 0); assert.equal(result.delta, undefined); }
            else { assert.equal(result.ok, true); assert(result.flags.includes('--bare')); assert(!f.calls.some(call => call.args[0] === '-p')); }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072: Docker execute seals literal job input, collects its packet and cleans only its named container', async () => {
    const f = fixture(); const calls = [];
    try {
        const packet = { ok: true, delta: { entries: [{ path: 'safe.cjs', base64: 'eA==' }], deleted: [] }, setupDelta: { entries: [], deleted: [] } };
        const runCommand = async (bin, args, options) => { calls.push({ bin, args, options }); return { exitCode: 0, failure: null, stdout: JSON.stringify(packet) + '\n', stderr: '' }; };
        const result = await docker.execute(f.runtime, { role: 'solve', workspace: f.root, inputHash: 'frozen-hash' }, {}, { runCommand });
        assert.equal(result.packet.delta.entries[0].path, 'safe.cjs'); assert(!result.stdout.includes('eA=='));
        const sent = JSON.parse(calls[0].options.input); assert.equal(sent.workspace, undefined); assert.equal(sent.inputHash, 'frozen-hash');
        const name = calls[0].args[calls[0].args.indexOf('--name') + 1];
        assert.match(name, /^framework-bench-/); assert.deepEqual(calls[1].args, ['rm', '--force', name]);
    } finally { f.cleanup(); }
});

test('TC-FBM-074: split UTF-8 stream chunks retain exact artifact paths and reviewer evidence', async () => {
    const { EventEmitter } = require('node:events');
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter();
    child.stdin.end = () => { const bytes = Buffer.from('đồ án/日本.cjs'); for (const byte of bytes) child.stdout.emit('data', Buffer.from([byte])); child.stderr.emit('data', Buffer.from([0xe2])); child.stderr.emit('data', Buffer.from([0x82, 0xac])); child.emit('close', 0, null); };
    const result = await docker.capture('fixture', [], { spawnProcess: () => child, env: {} });
    assert.equal(result.stdout, 'đồ án/日本.cjs'); assert.equal(result.stderr, '€'); assert.equal(result.exitCode, 0);
});

function checkEnvironment(f, workspace) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG)$/i.test(key)));
    return { ...env, HOME: f.root, USERPROFILE: f.root, TMPDIR: f.root, TEMP: f.root, TMP: f.root, BENCH_WORKSPACE: workspace };
}

function completeProject(f) {
    const root = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner');
    f.write('delivered/planner.cjs', fs.readFileSync(path.join(root, 'refactor-fixture/planner.cjs'), 'utf8'));
    f.write('delivered/package.json', { name: 'fixture-planner', version: '1.0.0', scripts: { test: 'node --test' } });
    f.write('delivered/README.md', 'Use createPlanner(tasks).plan() or node bin/plan.cjs with a JSON request.');
    f.write('delivered/planner.test.cjs', "const test=require('node:test'),assert=require('node:assert/strict');test('dependency intent',()=>assert.deepEqual(require('./planner.cjs').createPlanner([{id:'a'},{id:'b',requires:['a']}]).plan(),['a','b']));\n");
    f.write('delivered/bin/plan.cjs', "const fs=require('node:fs');try{let value;try{value=JSON.parse(fs.readFileSync(0,'utf8'));if(!value||typeof value!=='object'||!Array.isArray(value.tasks)||('targets'in value&&!Array.isArray(value.targets)))throw Error();}catch{const e=Error();e.code='INVALID_INPUT';throw e;}const p=require('../planner.cjs').createPlanner(value.tasks);process.stdout.write(JSON.stringify(p.plan(value.targets))+'\\n');}catch(e){process.stderr.write((e.code||'INVALID_INPUT')+'\\n');process.exitCode=1;}\n");
    return path.join(f.root, 'delivered');
}

test('TC-FBM-002 TC-FBM-078: complete greenfield work passes while absent deliverables and premature exit cannot pass', () => {
    const checks = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner/checks');
    for (const missing of [null, 'package.json', 'README.md', 'planner.test.cjs', 'early-exit']) {
        const f = fixture();
        try {
            const workspace = completeProject(f);
            if (missing === 'early-exit') fs.writeFileSync(path.join(workspace, 'planner.cjs'), 'process.exit(0);\n');
            else if (missing) fs.rmSync(path.join(workspace, missing));
            const run = () => execFileSync(process.execPath, [path.join(checks, 'greenfield.cjs')], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 });
            if (missing) assert.throws(run); else assert.doesNotThrow(run);
            if (missing === 'early-exit') for (const check of ['acceptance.cjs', 'regression.cjs', 'greenfield-regression.cjs']) assert.throws(() => execFileSync(process.execPath, [path.join(checks, check)], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 }));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-078: oracle rejects unsorted snapshots and ready-batch ordering while preserving valid planner behavior', () => {
    const base = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner');
    for (const fault of ['snapshot', 'requirements', 'batch']) {
        const f = fixture();
        try {
            const original = fs.readFileSync(path.join(base, 'refactor-fixture/planner.cjs'), 'utf8');
            f.write('mutant/original.cjs', original);
            const injected = fault === 'snapshot' ? 'p.snapshot=()=>s().reverse();' : fault === 'requirements' ? 'p.snapshot=()=>s().map(t=>({...t,requires:[...t.requires].reverse()}));' : "p.plan=(targets)=>{const order=q(targets);if(order.includes('a')&&order.includes('z')&&order.some(id=>id.startsWith('b')))return ['a','z',...order.filter(id=>id!=='a'&&id!=='z')];return order;};";
            f.write('mutant/planner.cjs', `const original=require('./original.cjs');module.exports={...original,createPlanner:(...args)=>{const p=original.createPlanner(...args),s=p.snapshot.bind(p),q=p.plan.bind(p);${injected}return p;}};`);
            assert.throws(() => execFileSync(process.execPath, [path.join(base, 'checks/acceptance.cjs')], { env: checkEnvironment(f, path.join(f.root, 'mutant')), stdio: 'pipe', timeout: 30000 }));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072: consumer mirrors and mechanics tests cannot donate benchmark answers to a solver', () => {
    const f = fixture();
    try {
        f.write('case/fixture/.claude/settings.json', { hooks: {} });
        for (const host of ['.claude', '.agents', '.codex', '.opencode']) f.write(`case/fixture/${host}/skills/framework-benchmark/cases/answer.cjs`, 'synthetic secret answer');
        f.write('case/fixture/.claude/scripts/tests/framework-benchmark.test.cjs', 'synthetic mechanics-test answer');
        const prepared = f.prepare();
        const exposed = files.inventory(path.join(prepared.root, 'framework'));
        assert(!exposed.some(row => files.withheldBenchmarkAsset(row.path)));
        assert(exposed.some(row => row.path === '.claude/settings.json'));
        assert.deepEqual(files.inventory(path.join(prepared.root, 'base')).map(row => row.path), ['app.cjs']);
    } finally { f.cleanup(); }
});

test('TC-FBM-002 TC-FBM-003 TC-FBM-076: full greenfield and configured controller paths preserve setup and failure accounting', async () => {
    for (const mode of ['greenfield', 'brownfield-configured']) for (const fault of [null, 'missingSkill', 'missingSetup']) {
        const f = fixture();
        try {
            f.spec.projectMode = mode;
            let setupDelta;
            const skills = mode === 'greenfield' ? ['workflow-greenfield-init'] : ['feature-implement'];
            f.spec.expectedSkills = skills;
            if (mode === 'greenfield') { f.spec.kind = 'greenfield'; delete f.spec.fixture; }
            else {
                const configuration = { project: { name: 'Relocated consumer' }, docsRoots: { projectReference: { path: 'handbook/reference' } } };
                f.write('case/fixture/.claude/.ck.json', { portability: { projectConfigPath: 'config/context.json' } });
                f.write('case/fixture/config/context.json', configuration);
                f.write('case/fixture/handbook/reference/rules.md', 'Consumer rules');
                setupDelta = { entries: [
                    { path: 'config/context.json', base64: Buffer.from(JSON.stringify(configuration)).toString('base64') },
                    { path: 'handbook/reference/rules.md', base64: Buffer.from('Consumer rules').toString('base64') }
                ], deleted: [] };
            }
            f.write('case/case.json', f.spec);
            const driver = transport({ skills, setupDelta, ...(fault ? { [fault]: true } : {}) });
            const prepared = f.prepare();
            const state = await experiment.run(prepared.root, { transport: driver });
            assert.equal(state.phase, 'complete'); assert.equal(report.summarize(state).validPairs, 2);
            assert.equal(state.pairs[0].raw.success, false);
            assert.equal(state.pairs[0].framework.success, fault === null);
            if (!fault) {
                assert.equal(state.pairs[0].framework.setup.valid, true);
                assert.match(fs.readFileSync(path.join(prepared.root, state.pairs[0].framework.artifactDir, 'candidate/app.cjs'), 'utf8'), /implemented/);
                if (mode === 'brownfield-configured') { assert.equal(state.projectSetup.configPath, 'config/context.json'); assert.equal(state.pairs[0].framework.setup.configPath, 'config/context.json'); assert(!state.pairs[0].framework.solver.selectedSkills.includes('project-init')); }
            }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-076: required Skill errors and missing results cannot earn treatment credit despite passing work', async () => {
    for (const options of [{ failedSkillResult: true }, { missingSkillResult: true }]) {
        const f = fixture();
        try {
            const state = await experiment.run(f.prepare().root, { transport: transport(options) });
            const arm = state.pairs[0].framework;
            assert.equal(arm.valid, true); assert(arm.checks.every(check => check.passed)); assert.equal(arm.setup.valid, true);
            assert.equal(arm.treatmentFidelity, false); assert.equal(arm.success, false);
            assert.deepEqual(arm.solver.attemptedSkills, ['project-init', 'feature-implement']);
            assert.equal(report.summarize(state).validPairs, 2);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-076: a workflow started through start-workflow counts as engaged, in order after setup, without faking a skill load', async () => {
    const cases = [
        [['project-init', { skill: 'start-workflow', args: 'workflow-feature --autonomous' }], true],
        [[{ skill: 'start-workflow', args: 'workflow-feature' }, 'project-init'], false], // the task workflow started before setup
        [['project-init', { skill: 'start-workflow', args: 'workflow-bugfix' }], false], // a different workflow
        [['project-init', { skill: 'start-workflow', args: 'please run workflow-feature' }], false] // the id must be the first argument
    ];
    for (const [skills, engaged] of cases) {
        const f = fixture();
        try {
            f.write('framework/.claude/skills/workflow-feature/SKILL.md', 'Synthetic workflow');
            f.write('framework/.claude/skills/start-workflow/SKILL.md', 'Synthetic workflow starter');
            f.write('case/case.json', { ...f.spec, treatment: 'Use workflow-feature.', expectedSkills: ['workflow-feature'] });
            const state = await experiment.run(f.prepare().root, { transport: transport({ skills }) });
            const arm = state.pairs[0].framework;
            assert.equal(arm.treatmentFidelity, engaged, JSON.stringify(skills));
            assert(!arm.solver.selectedSkills.includes('workflow-feature'), 'activation is reported separately, never as a skill load');
            assert.deepEqual(arm.solver.activatedWorkflows, skills.filter(s => typeof s === 'object' && /^workflow-[a-z-]+(\s|$)/.test(s.args)).map(s => s.args.split(' ')[0]));
        } finally { f.cleanup(); }
    }
    const failed = session.parseStream([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'w', name: 'Skill', input: { skill: 'start-workflow', args: 'workflow-feature' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'w', is_error: true, content: 'failed' }] } }
    ].map(row => JSON.stringify(row)).join('\n'));
    assert.deepEqual(failed.activatedWorkflows, [], 'a failed start-workflow activates nothing');
});

test('TC-FBM-002 TC-FBM-003 TC-FBM-076: fallback portability owns generated setup and conflicts fail before execution', async () => {
    for (const mode of ['greenfield', 'brownfield-bootstrap']) {
        const f = fixture();
        try {
            const ck = { portability: { projectConfigPath: 'config/context.json' } };
            f.write('framework/.claude/.ck.json', ck);
            f.spec.projectMode = mode;
            const skills = mode === 'greenfield' ? ['workflow-greenfield-init'] : ['project-init', 'feature-implement'];
            if (mode === 'greenfield') { f.spec.kind = 'greenfield'; delete f.spec.fixture; f.spec.expectedSkills = skills; }
            f.write('case/case.json', f.spec);
            const setupDelta = { entries: [
                { path: 'config/context.json', base64: Buffer.from(JSON.stringify({ project: { name: 'Fallback owner' } })).toString('base64') },
                { path: 'docs/project-reference/rules.md', base64: Buffer.from('Synthetic reference').toString('base64') }
            ], deleted: [] };
            const prepared = f.prepare();
            assert.equal(prepared.projectSetup.configPath, 'config/context.json');
            assert.deepEqual(JSON.parse(fs.readFileSync(path.join(prepared.root, 'framework/.claude/.ck.json'), 'utf8')), ck);
            const state = await experiment.run(prepared.root, { transport: transport({ skills, setupDelta }) });
            assert.equal(state.phase, 'complete'); assert.equal(report.summarize(state).validPairs, 2);
            for (const pair of state.pairs) {
                assert.equal(pair.framework.success, true); assert.equal(pair.framework.setup.configPath, 'config/context.json');
                assert(fs.existsSync(path.join(prepared.root, pair.framework.artifactDir, 'setup/config/context.json')));
                assert(!fs.existsSync(path.join(prepared.root, pair.framework.artifactDir, 'candidate/config/context.json')));
                assert(!fs.existsSync(path.join(prepared.root, pair.raw.artifactDir, 'candidate/config/context.json')));
            }
            f.spec.projectConfigPath = 'different/context.json'; f.write('case/case.json', f.spec);
            assert.throws(f.prepare, /conflicts with the selected framework portability owner/);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-003: consumer portability overrides fallback settings while an installed framework keeps its own defaults', () => {
    for (const installed of [false, true]) {
        const f = fixture();
        try {
            f.write('framework/.claude/.ck.json', { portability: { projectConfigPath: 'fallback/context.json' } });
            if (installed) f.write('case/fixture/.claude/settings.json', { hooks: {} });
            else f.write('case/fixture/.claude/.ck.json', { portability: { projectConfigPath: 'consumer/context.json' } });
            const prepared = f.prepare();
            assert.equal(prepared.projectSetup.configPath, installed ? 'docs/project-config.json' : 'consumer/context.json');
            assert(!prepared.projectSetup.contextRoots.includes('fallback/context.json'));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072: final runtime membership detects added private controls and deleted originals without exporting contents', () => {
    for (const change of [{ addControl: true }, { addRule: true }, { deleteControl: true },
        ...['src/CLAUDE.md', 'src/CLAUDE.local.md', 'src/.claude/CLAUDE.md', 'src/.claude/rules/override.md', 'CLAUDE.local.md'].map(addInstruction => ({ addInstruction, privateDirectory: true }))]) {
        const f = runtimeFixture(change);
        try {
            assert.equal(session.main(f.job, f.ports), 0);
            const result = f.packets.at(-1);
            assert.equal(result.treatmentIntact, false);
            assert(result.treatmentChanges.includes(change.addInstruction || (change.addControl ? '.claude/.ck.local.json' : change.addRule ? '.claude/rules/override.md' : '.claude/settings.json')));
            assert(!JSON.stringify(result.setupDelta).includes('workflowRouteMode'));
            assert(!JSON.stringify(result.setupDelta).includes('Synthetic native rule'));
            assert(!result.delta.entries.some(row => row.path.includes('.claude')));
            for (const delta of [result.delta, result.setupDelta]) assert(!delta.entries.some(row => row.path.startsWith('credentials/') || /(?:^|\/)CLAUDE(?:\.local)?\.md$/.test(row.path)));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072 TC-FBM-076: existing nested instructions stay immutable while allowed root setup refresh stays receipted', () => {
    const f = runtimeFixture();
    try {
        f.write('input/src/CLAUDE.md', 'Frozen nested instructions');
        f.write('input/src/.claude/rules/module.md', 'Frozen nested rules');
        f.job.inputHash = files.fingerprint(files.inventory(path.join(f.root, 'input')));
        assert.equal(session.main(f.job, f.ports), 0);
        const result = f.packets.at(-1);
        assert.equal(result.treatmentIntact, true); assert.deepEqual(result.treatmentChanges, []);
        assert(result.setupDelta.entries.some(row => row.path === 'AGENTS.md'));
        assert(!result.delta.entries.some(row => files.agentSurface(row.path)));
    } finally { f.cleanup(); }
});

test('TC-FBM-076: stream receipts distinguish successful, failed, absent and mismatched Skill outcomes', () => {
    const request = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'call-1', name: 'Skill', input: { skill: 'plan' } }] } };
    for (const variant of ['success', 'error', 'missing', 'mismatch']) {
        const events = [request];
        if (variant !== 'missing') events.push({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: variant === 'mismatch' ? 'other-call' : 'call-1', is_error: variant === 'error', content: 'receipt' }] } });
        const observed = session.parseStream(events.map(row => JSON.stringify(row)).join('\n'));
        assert.deepEqual(observed.attemptedSkills, ['plan']);
        assert.deepEqual(observed.selectedSkills, variant === 'success' ? ['plan'] : []);
    }
});

test('TC-FBM-078: formatter input mutation and omitted brownfield delivery cannot pass frozen checks', () => {
    const base = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner');
    for (const missing of [null, 'README.md', 'planner.test.cjs', 'format-mutation']) {
        const f = fixture();
        try {
            const workspace = completeProject(f);
            if (missing === 'format-mutation') {
                fs.renameSync(path.join(workspace, 'planner.cjs'), path.join(workspace, 'original.cjs'));
                f.write('delivered/planner.cjs', "const api=require('./original.cjs');module.exports={...api,formatOrder:ids=>{const result=api.formatOrder(ids);ids.pop();return result;}};");
                assert.throws(() => execFileSync(process.execPath, [path.join(base, 'checks/regression.cjs')], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 20000 }));
            } else {
                if (missing) fs.rmSync(path.join(workspace, missing));
                const run = () => execFileSync(process.execPath, [path.join(base, 'checks/delivery.cjs')], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 20000 });
                if (missing) assert.throws(run); else assert.doesNotThrow(run);
            }
        } finally { f.cleanup(); }
    }
    for (const name of ['feature', 'plan-implement', 'refactor']) {
        const spec = contract.validateCase(JSON.parse(fs.readFileSync(path.join(base, name + '.json'), 'utf8')));
        assert(spec.checks.some(check => check.argv[1] === '/checks/delivery.cjs' && check.baseline === 'fail'));
    }
});

test('TC-FBM-003 TC-FBM-076: project context colocated under .claude stays setup while runtime owners cannot be reassigned', () => {
    const f = fixture();
    try {
        f.spec.projectMode = 'brownfield-configured'; f.spec.projectConfigPath = '.claude/project-config.json';
        f.write('case/fixture/.claude/settings.json', { hooks: {} });
        f.write('case/fixture/.claude/.ck.json', { portability: { projectConfigPath: '.claude/project-config.json' } });
        f.write('case/fixture/.claude/project-config.json', { project: { name: 'Colocated' }, docsRoots: { projectReference: { path: '.claude/docs/project-reference' } } });
        f.write('case/fixture/.claude/docs/project-reference/rules.md', 'Project rules');
        f.write('case/case.json', f.spec);
        const prepared = f.prepare();
        const context = experiment.load(prepared.root).state.projectSetup;
        assert.equal(context.configPath, '.claude/project-config.json');
        assert(files.inventory(path.join(prepared.root, 'framework')).some(row => row.path === '.claude/project-config.json'));
        f.spec.projectMode = 'brownfield-bootstrap'; f.write('case/case.json', f.spec);
        assert(!files.inventory(path.join(f.prepare().root, 'framework')).some(row => row.path === '.claude/project-config.json' || row.path.startsWith('.claude/docs/project-reference/')));
        f.write('case/fixture/.claude/project-config.json', { project: { name: 'Invalid overlap' }, docsRoots: { projectReference: { path: '.claude/skills' } } });
        assert.throws(f.prepare, /overlap immutable framework controls/);
        f.write('case/fixture/.claude/project-config.json', { project: { name: 'Invalid rules overlap' }, docsRoots: { projectReference: { path: '.claude/rules' } } });
        assert.throws(f.prepare, /overlap immutable framework controls/);
        for (const root of ['src/.claude', 'src/.claude/rules', 'src/CLAUDE.md']) {
            f.write('case/fixture/.claude/project-config.json', { project: { name: 'Invalid nested overlap' }, docsRoots: { projectReference: { path: root } } });
            assert.throws(f.prepare, /overlap immutable framework controls/);
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-002 TC-FBM-078: public test evidence requires real completed cases and preserves valid aggregate suites', () => {
    const checks = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner/checks');
    const variants = [
        { name: 'empty', source: '' },
        { name: 'comment', source: '// no registered tests\n' },
        { name: 'import-only', source: "require('node:test');\n" },
        { name: 'empty-suite', source: "require('node:test').describe('empty',()=>{});\n" },
        { name: 'skip-only', source: "require('node:test')('skipped',{skip:true},()=>{});\n" },
        { name: 'empty-skip-reason', source: "require('node:test')('skipped',t=>t.skip(''));\n" },
        { name: 'empty-todo-reason', source: "require('node:test')('planned',t=>t.todo(''));\n" },
        { name: 'todo-only', source: "require('node:test')('planned',{todo:true},()=>{throw Error('planned');});\n" },
        { name: 'early-exit', source: 'process.exit(0);\n' },
        { name: 'failing', source: "require('node:test')('fails',()=>{throw Error('broken');});\n" },
        { name: 'healthy', passes: true },
        { name: 'native-main', passes: true, source: "if(require.main===module){const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');test('native entry',()=>{assert.equal(fs.realpathSync(require.main.filename),fs.realpathSync(__filename));assert.equal(fs.realpathSync(process.argv[1]),fs.realpathSync(__filename));assert.deepEqual(require('./planner.cjs').createPlanner([{id:'a'}]).plan(),['a']);});}\n" },
        { name: 'false-directives', passes: true, source: "require('node:test')('real',{skip:false,todo:false},()=>require('node:assert/strict').equal(1,1));\n" },
        { name: 'real-and-empty-todo', passes: true, source: "const test=require('node:test');test('real',()=>require('node:assert/strict').equal(1,1));test('planned',t=>{t.todo('');throw Error('planned');});\n" },
        { name: 'real-and-empty-skip', passes: true, source: "const test=require('node:test');test('real',()=>require('node:assert/strict').equal(1,1));test('skipped',t=>t.skip(''));\n" },
        { name: 'nested', passes: true, source: "const {describe,it}=require('node:test');describe('suite',()=>it('case',()=>require('node:assert/strict').equal(1,1)));\n" },
        { name: 'stdout-todo', passes: true, source: "const test=require('node:test');console.log('ordinary output');test('real',()=>require('node:assert/strict').equal(1,1));test('planned',{todo:true},()=>{throw Error('planned');});\n" },
        { name: 'extra-empty-file', passes: true }
    ];
    for (const variant of variants) {
        const f = fixture();
        try {
            const workspace = completeProject(f);
            if (variant.source !== undefined) f.write('delivered/planner.test.cjs', variant.source);
            if (variant.name === 'extra-empty-file') f.write('delivered/extra.test.cjs', '');
            for (const checker of ['delivery.cjs', 'greenfield.cjs']) {
                const run = () => execFileSync(process.execPath, [path.join(checks, checker)], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 });
                if (variant.passes) assert.doesNotThrow(run, variant.name); else assert.throws(run, undefined, variant.name);
            }
        } finally { f.cleanup(); }
    }
    const f = fixture();
    try {
        const workspace = completeProject(f);
        fs.rmSync(path.join(workspace, 'planner.test.cjs'));
        f.write('delivered/entry.test.mjs', "import test from 'node:test';import assert from 'node:assert/strict';import{realpathSync}from'node:fs';import{fileURLToPath}from'node:url';if(realpathSync(fileURLToPath(import.meta.url))===realpathSync(process.argv[1]))test('native ESM entry',()=>assert.equal(realpathSync(fileURLToPath(import.meta.url)),realpathSync(process.argv[1])));\n");
        assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(checks, 'greenfield.cjs')], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 }));
        fs.rmSync(path.join(workspace, 'entry.test.mjs'));
        f.write('delivered/pending.test.mjs', 'await new Promise(()=>{});\n');
        assert.throws(() => execFileSync(process.execPath, [path.join(checks, 'greenfield.cjs')], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 }));
    } finally { f.cleanup(); }
});

// TechnicalSpec: frozen-check-owner-ports. This loader executes only trusted framework
// source, never a candidate, and is not a security sandbox. Real child controls stay below.
function loadFrozenCheck(name, overrides = {}) {
    return loadTrustedModule('cases/dependency-planner/checks/' + name, overrides);
}

function loadTrustedModule(relative, overrides = {}, { processPort = process, entry = false } = {}) {
    const filename = path.resolve(__dirname, '../../skills/framework-benchmark', relative);
    const nativeRequire = require('node:module').createRequire(filename);
    const localRequire = id => Object.hasOwn(overrides, id) ? overrides[id] : nativeRequire(id);
    const module = { exports: {} };
    localRequire.main = entry ? module : undefined;
    const source = fs.readFileSync(filename, 'utf8').replace(/^#![^\n]*\n/, '');
    const wrapper = new (require('node:vm').Script)(`(function(require,module,exports,__filename,__dirname,console,process){${source}\n})`, { filename }).runInThisContext();
    wrapper(localRequire, module, module.exports, filename, path.dirname(filename), { log() {} }, processPort);
    return module.exports;
}

test('TC-FBM-077: declarations reject unsupported schema, kinds, owners and check classes independently', () => {
    const f = fixture();
    try {
        for (const schemaVersion of [undefined, 0, 2]) {
            assert.throws(() => contract.validateCase({ ...f.spec, schemaVersion }));
            assert.throws(() => contract.validateRuntime({ ...f.runtime, schemaVersion }));
        }
        assert.doesNotThrow(() => contract.validateCase(f.spec));
        assert.doesNotThrow(() => contract.validateRuntime(f.runtime));
        for (const kind of ['feature', 'plan-implement', 'refactor', 'greenfield']) {
            assert.doesNotThrow(() => contract.validateCase({ ...f.spec, kind, projectMode: kind === 'greenfield' ? 'greenfield' : 'brownfield-bootstrap' }));
        }
        for (const projectMode of ['brownfield-bootstrap', 'brownfield-configured']) assert.doesNotThrow(() => contract.validateCase({ ...f.spec, projectMode }));
        for (const update of [{ unknown: true }, { id: 'Bad_ID' }, { kind: 'unknown' }, { projectMode: 'unknown' }, { kind: 'greenfield' }, { projectMode: 'greenfield' }, { fixture: '' }, { projectConfigPath: '' }]) {
            assert.throws(() => contract.validateCase({ ...f.spec, ...update }), undefined, JSON.stringify(update));
        }
        assert.doesNotThrow(() => contract.validateCase({ ...f.spec, fixture: 'src', projectConfigPath: 'docs/project-config.json', ref: 'HEAD' }));
        for (const ref of ['', '-HEAD', 'HEAD\n', 1]) assert.throws(() => contract.validateCase({ ...f.spec, ref }));
        const withCheck = update => ({ ...f.spec, checks: [...f.spec.checks, { ...f.spec.checks[0], id: 'third', ...update }] });
        assert.doesNotThrow(() => contract.validateCase(withCheck({ id: 'a'.repeat(80) })));
        for (const update of [{ id: 'a'.repeat(81) }, { kind: 'unknown' }, { baseline: 'unknown' }]) assert.throws(() => contract.validateCase(withCheck(update)));
        for (const kind of ['acceptance', 'regression']) assert.throws(() => contract.validateCase({ ...f.spec, checks: f.spec.checks.map(row => ({ ...row, kind, baseline: 'pass' })) }));
        assert.doesNotThrow(() => contract.validateRuntime({ ...f.runtime, claudeVersion: 'x'.repeat(100) }));
        assert.throws(() => contract.validateRuntime({ ...f.runtime, claudeVersion: 'x'.repeat(101) }));
    } finally { f.cleanup(); }
});

test('TC-FBM-079: the independent eight-criterion rubric and bounded findings cannot silently shrink or expand', () => {
    const names = ['correctness', 'regressionSafety', 'edgeCases', 'testQuality', 'solutionDesign', 'maintainability', 'security', 'scopeDiscipline'];
    assert.deepEqual(contract.DIMENSIONS, names);
    assert.deepEqual(experiment.reviewSchema().properties.scores.required, names);
    const review = () => ({ scores: Object.fromEntries(names.map(name => [name, { score: 4, evidence: 'app.cjs:1 reason' }])), findings: [] });
    for (const score of [0, 4]) { const value = review(); value.scores.correctness.score = score; assert.doesNotThrow(() => contract.validateReview(value)); }
    for (const score of [-1, 5, 0.5]) { const value = review(); value.scores.correctness.score = score; assert.throws(() => contract.validateReview(value)); }
    for (const mutate of [value => { delete value.scores.edgeCases; }, value => { value.extra = true; }, value => { value.scores.extra = { score: 4, evidence: 'app.cjs:1 reason' }; }, value => { value.findings = ''; }]) {
        const value = review(); mutate(value); assert.throws(() => contract.validateReview(value));
    }
    const finding = { severity: 'medium', evidence: 'app.cjs:1 reason', consequence: 'An observable task outcome fails.' };
    const full = review(); full.findings = Array.from({ length: 50 }, () => ({ ...finding }));
    assert.doesNotThrow(() => contract.validateReview(full));
    assert.throws(() => contract.validateReview({ ...full, findings: [...full.findings, finding] }));
    for (const severity of ['critical', 'high', 'medium', 'low']) assert.doesNotThrow(() => contract.validateReview({ ...review(), findings: [{ ...finding, severity }] }));
    assert.throws(() => contract.validateReview({ ...review(), findings: [{ ...finding, severity: 'unknown' }] }));
    const citation = length => 'app.cjs:1 ' + 'x'.repeat(length - 10);
    for (const length of [2000, 2001]) {
        const value = review(); value.scores.correctness.evidence = citation(length);
        const run = () => contract.validateReview(value);
        if (length === 2000) assert.doesNotThrow(run); else assert.throws(run);
        for (const field of ['evidence', 'consequence']) {
            const runFinding = () => contract.validateReview({ ...review(), findings: [{ ...finding, [field]: citation(length) }] });
            if (length === 2000) assert.doesNotThrow(runFinding); else assert.throws(runFinding);
        }
    }
});

test('TC-FBM-074: observed zero tokens and cost remain measured while unknown and invalid values remain null', () => {
    const zero = { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, costUsd: 0 };
    assert.deepEqual(contract.measurements(zero), zero);
    assert.equal(contract.measurements({ costUsd: 0.25 }).costUsd, 0.25);
    for (const name of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens']) assert.equal(contract.measurements({ [name]: 0.5 })[name], null);
});

test('TC-FBM-077: capture accepts the exact combined byte allowance and rejects its next byte', async () => {
    const { EventEmitter } = require('node:events');
    for (const extra of [false, true]) {
        const child = new EventEmitter(); const kills = [];
        child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter();
        child.kill = signal => { kills.push(signal); };
        child.stdin.end = () => { child.stdout.emit('data', Buffer.from('abc')); child.stderr.emit('data', Buffer.from(extra ? 'def' : 'de')); child.emit('close', 0, null); };
        const result = await docker.capture('fixture', [], { env: {}, maxOutput: 5, spawnProcess: () => child });
        assert.equal(result.failure, extra ? 'output-limit' : null);
        assert.equal(result.stdout, 'abc'); assert.equal(result.stderr, extra ? '' : 'de');
        assert.deepEqual(kills, extra ? ['SIGKILL'] : []);
    }
});

test('TC-FBM-051 TC-FBM-072: actual preflight admits only a healthy daemon, pinned image and completed capability probe', async () => {
    const f = fixture();
    try {
        const workspace = path.join(f.root, 'case/fixture');
        const env = { HOME: f.root, USERPROFILE: f.root, TMPDIR: f.root, TEMP: f.root, TMP: f.root, PATH: path.join(f.root, 'empty-bin'), DOCKER_HOST: 'unix://' + path.join(f.root, 'absent.sock'), ANTHROPIC_API_KEY: 'synthetic-preflight-sentinel' };
        const healthy = { exitCode: 0, failure: null, stderr: '', stdout: '' };
        const digest = `sha256:${'b'.repeat(64)}`;
        const variants = [null, 'daemon-os', 'daemon-exit', 'daemon-capture', 'image-id', 'image-exit', 'image-capture', 'probe-missing', 'probe-false', 'probe-malformed', 'probe-exit', 'probe-capture'];
        for (const variant of variants) {
            const calls = [];
            const runCommand = async (bin, args, options) => {
                calls.push({ bin, args, options }); assert.equal(bin, 'docker'); assert.equal(options.env, env);
                if (args[0] === 'info') return { ...healthy, stdout: variant === 'daemon-os' ? 'windows\n' : 'linux\n', exitCode: variant === 'daemon-exit' ? 1 : 0, failure: variant === 'daemon-capture' ? 'timeout' : null };
                if (args[0] === 'image') return { ...healthy, stdout: variant === 'image-id' ? 'not-an-id' : digest + '\n', exitCode: variant === 'image-exit' ? 1 : 0, failure: variant === 'image-capture' ? 'output-limit' : null };
                if (args[0] === 'run') return { ...healthy, stdout: variant === 'probe-missing' ? '{}\n' : variant === 'probe-false' ? '{"ok":false}\n' : variant === 'probe-malformed' ? 'incomplete' : '{"ok":true,"flags":["--bare"]}\n', exitCode: variant === 'probe-exit' ? 1 : 0, failure: variant === 'probe-capture' ? 'timeout' : null };
                assert.equal(args[0], 'rm'); return { ...healthy };
            };
            const run = () => docker.preflight(f.runtime, { workspace }, env, { runCommand });
            if (variant) await assert.rejects(run, /ENVIRONMENT-BLOCKED/, variant);
            else {
                const result = await run(); assert.equal(result.imageId, digest); assert.deepEqual(result.runtimeProbe, { ok: true, flags: ['--bare'] });
                assert.deepEqual(calls.map(call => call.args[0]), ['info', 'image', 'run', 'rm']);
            }
            if (variant?.startsWith('daemon')) assert.deepEqual(calls.map(call => call.args[0]), ['info']);
            else if (variant?.startsWith('image')) assert.deepEqual(calls.map(call => call.args[0]), ['info', 'image']);
            else {
                assert.deepEqual(calls.map(call => call.args[0]), ['info', 'image', 'run', 'rm']);
                const args = calls[2].args; assert(args.includes(f.runtime.image));
                const name = args[args.indexOf('--name') + 1]; assert.deepEqual(calls[3].args, ['rm', '--force', name]);
            }
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-072 TC-FBM-077: execute forwards each role allowance and always removes only its owned container', async () => {
    const f = fixture();
    try {
        for (const role of ['solve', 'review', 'check', 'probe']) for (const timeoutMs of [undefined, 1200]) for (const throws of [false, true]) {
            const calls = [];
            const runCommand = async (bin, args, options) => {
                calls.push({ bin, args, options });
                if (args[0] === 'run' && throws) throw new Error('synthetic launch failure');
                return { exitCode: 0, failure: null, stdout: '{"ok":true}\n', stderr: '' };
            };
            const run = () => docker.execute(f.runtime, { role, workspace: f.root, checksDir: path.join(f.root, 'case/checks'), timeoutMs }, {}, { runCommand });
            if (throws) await assert.rejects(run, /synthetic launch failure/); else await run();
            assert.equal(calls[0].options.timeoutMs, timeoutMs ?? f.runtime.timeoutMs);
            assert.equal(calls[0].options.maxOutput, (role === 'solve' ? 64 : 8) * 1024 * 1024);
            assert.equal(calls.length, 2);
            const name = calls[0].args[calls[0].args.indexOf('--name') + 1]; assert.deepEqual(calls[1].args, ['rm', '--force', name]);
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-078: complete child facts cannot override a native timeout and public file bounds retain their endpoint', () => {
    const complete = { status: 0, signal: null, stderr: '', output: [null, '', '', '{"a":{"value":1}}'] };
    const observe = result => loadFrozenCheck('observe.cjs', { 'node:child_process': { spawnSync: () => result } });
    assert.deepEqual(observe(complete)([{ id: 'a' }]), { a: { value: 1 } });
    // Node can return status0 plus ETIMEDOUT after exit while inherited output pipes stay open.
    assert.throws(() => observe({ ...complete, error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }) })([{ id: 'a' }]));
    const receipt = [{ event: 'completed' }, { event: 'tests', complete: true, passed: 1, failed: 0 }].map(row => JSON.stringify(row)).join('\n');
    const result = { ...complete, output: [null, '', '', receipt] }; let calls = 0;
    const publicTests = result => loadFrozenCheck('public-tests.cjs', { 'node:child_process': { spawnSync: () => { calls++; return result; } } });
    assert.doesNotThrow(() => publicTests(result)('.', Array.from({ length: 200 }, (_, i) => `test-${i}.test.cjs`)));
    assert.equal(calls, 200); calls = 0;
    assert.throws(() => publicTests(result)('.', Array.from({ length: 201 }, (_, i) => `test-${i}.test.cjs`))); assert.equal(calls, 0);
    assert.throws(() => publicTests({ ...result, error: new Error('timed out') })('.', ['real.test.cjs']));
});

function plannerFacts(f, workspace, steps) {
    const observePath = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner/checks/observe.cjs');
    return JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(JSON.stringify(require(process.argv[1])(JSON.parse(require('node:fs').readFileSync(0, 'utf8')))))", observePath], { input: JSON.stringify(steps), env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 }).toString());
}

test('TC-FBM-078: probe challenges really mutate stored values and save owned return copies', () => {
    const f = fixture();
    try {
        const workspace = completeProject(f); const ref = name => ({ $ref: name });
        const result = plannerFacts(f, workspace, [
            { op: 'store', save: 'values', value: ['a', 'b'] }, { op: 'mutate', target: 'values', path: [], method: 'push', args: ['c'] }, { id: 'pushed', op: 'read', value: ref('values') },
            { op: 'mutate', target: 'values', path: [], method: 'splice', args: [0, 1] }, { id: 'spliced', op: 'read', value: ref('values') },
            { op: 'create', args: [[{ id: 'a' }, { id: 'b', requires: ['a'] }]] }, { id: 'saved', op: 'call', method: 'snapshot', save: 'copy' },
            { id: 'copy', op: 'read', value: ref('copy') }, { op: 'mutate', target: 'copy', path: [], method: 'pop', args: [] }, { id: 'changed', op: 'read', value: ref('copy') },
            { id: 'planner', op: 'call', method: 'snapshot' }
        ]);
        const snapshot = [{ id: 'a', requires: [] }, { id: 'b', requires: ['a'] }];
        assert.deepEqual(result.pushed.value, ['a', 'b', 'c']); assert.deepEqual(result.spliced.value, ['b', 'c']);
        assert.deepEqual(result.saved.value, snapshot); assert.deepEqual(result.copy.value, snapshot);
        assert.deepEqual(result.changed.value, [snapshot[0]]); assert.deepEqual(result.planner.value, snapshot);
    } finally { f.cleanup(); }
});

test('TC-FBM-078: frozen oracles reject a changed asserted fact including the final branching and thousand-task order', () => {
    const f = fixture();
    try {
        const workspace = completeProject(f);
        for (const name of ['acceptance.cjs', 'regression.cjs']) {
            let facts;
            loadFrozenCheck(name, { './observe.cjs': steps => { facts = plannerFacts(f, workspace, steps); return facts; } });
            assert(facts && Object.keys(facts).length > 0);
            for (const [id, row] of Object.entries(facts)) {
                if (/^init\d+$/.test(id) || ['add', 'remove', 'default', 'large'].includes(id)) continue;
                const broken = JSON.parse(JSON.stringify(facts));
                if (row.error) broken[id].error = 'WRONG_ERROR';
                else if (Array.isArray(row.value) && row.value.length > 1) broken[id].value.reverse();
                else broken[id].value = 'CORRUPTED';
                assert.throws(() => loadFrozenCheck(name, { './observe.cjs': () => broken }), undefined, `${name}:${id}`);
            }
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-002 TC-FBM-078: greenfield metadata and both documented interfaces are required while nested public tests remain valid', () => {
    const f = fixture();
    const check = path.resolve(__dirname, '../../skills/framework-benchmark/cases/dependency-planner/checks/greenfield.cjs');
    try {
        const workspace = completeProject(f);
        const run = () => execFileSync(process.execPath, [check], { env: checkEnvironment(f, workspace), stdio: 'pipe', timeout: 30000 });
        const metadata = JSON.parse(fs.readFileSync(path.join(workspace, 'package.json'), 'utf8'));
        for (const field of ['name', 'version']) for (const value of ['', ' ']) { f.write('delivered/package.json', { ...metadata, [field]: value }); assert.throws(run, undefined, field + JSON.stringify(value)); }
        f.write('delivered/package.json', metadata);
        for (const text of ['Use createPlanner(tasks).plan().', 'Run node bin/plan.cjs.']) { f.write('delivered/README.md', text); assert.throws(run); }
        f.write('delivered/README.md', 'Use createPlanner(tasks).plan() or node bin/plan.cjs.');
        const source = fs.readFileSync(path.join(workspace, 'planner.test.cjs'), 'utf8').replace("'./planner.cjs'", "'../planner.cjs'");
        f.write('delivered/tests/planner.test.cjs', source); fs.rmSync(path.join(workspace, 'planner.test.cjs'));
        assert.doesNotThrow(run);
    } finally { f.cleanup(); }
});

test('TC-FBM-073 TC-FBM-074: persisted reports preserve asymmetric signed metrics, unknown coverage and every outcome population', () => {
    const f = fixture();
    const arm = (success, score, wallMs, costUsd, tokens, status = success ? 'passed' : 'failed') => ({ success, status,
        solver: { wallMs, measurements: { costUsd, inputTokens: tokens, cacheReadTokens: tokens, cacheWriteTokens: tokens, outputTokens: tokens } },
        checks: [{ passed: success, wallMs: 3 }], review: { valid: score !== null, scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score }])), wallMs: 7, measurements: { costUsd: 0.125 } } });
    try {
        // Four shuffled values give an independent even median; the first three give an odd one.
        const pairs = [
            { repeat: 1, valid: true, raw: arm(false, 2, 40, 0.25, 10), framework: arm(true, 3, 60, 0.75, 20) },
            { repeat: 2, valid: true, raw: arm(true, 4, 10, null, null), framework: arm(true, 4, 40, 0, 0) },
            { repeat: 3, valid: true, raw: arm(true, 3, 30, 0.5, 30), framework: arm(false, 1, 20, null, null) },
            { repeat: 4, valid: true, raw: arm(false, null, 20, 0, 0), framework: arm(false, 0, 30, 0.25, 10) },
            { repeat: 5, valid: false, raw: arm(false, 4, 100, 1, 90, 'invalid'), framework: arm(false, 4, 200, 2, 90, 'invalid') },
            { repeat: 6, raw: arm(false, 0, 5, 0.125, 1) }
        ];
        const state = { phase: 'blocked', case: f.spec, runtime: { ...f.runtime, repeats: 7 }, pairs, error: 'synthetic stopping reason' };
        const summary = report.writeReport(f.root, state);
        assert.deepEqual([summary.plannedPairs, summary.recordedPairs, summary.validPairs, summary.invalidPairs, summary.uncompletedPairs], [7, 6, 4, 1, 2]);
        assert.deepEqual([summary.wins, summary.ties, summary.losses], [1, 2, 1]);
        assert.deepEqual(summary.deltas.map(row => row.success), [1, 0, -1, 0]);
        assert.deepEqual(summary.deltas.map(row => row.quality), [25, 0, -50, null]);
        assert.deepEqual(summary.deltas.map(row => row.solverWallMs), [20, 30, -10, 10]);
        assert.deepEqual(summary.deltas.map(row => row.costUsd), [0.5, null, null, 0.25]);
        assert.equal(summary.successDelta, 0); assert.equal(summary.qualityDelta, -25 / 3); assert.equal(summary.qualityPairs, 3);
        assert.equal(summary.medianSolverWallDeltaMs, 15); assert.equal(summary.meanSolverCostDeltaUsd, 0.375); assert.equal(summary.measuredCostPairs, 2);
        assert.equal(summary.arms.raw.meanQuality, 75); assert.equal(summary.arms.framework.meanQuality, 50);
        assert.equal(summary.arms.raw.medianSolverWallMs, 25); assert.equal(summary.arms.framework.medianSolverWallMs, 35);
        assert.equal(summary.arms.raw.knownSolverCostUsd, 0.75); assert.equal(summary.arms.framework.knownSolverCostUsd, 1);
        assert.equal(summary.arms.raw.knownCostAttempts, 3); assert.equal(summary.arms.framework.knownCostAttempts, 3);
        for (const key of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens']) {
            assert.deepEqual(summary.arms.raw.usage[key], { mean: 40 / 3, measuredAttempts: 3 });
            assert.deepEqual(summary.arms.framework.usage[key], { mean: 10, measuredAttempts: 3 });
        }
        assert.deepEqual(summary.arms.raw.overhead, { checks: { totalWallMs: 12, observedAttempts: 4 }, review: { totalWallMs: 28, observedAttempts: 4 }, journey: { totalWallMs: 0, observedAttempts: 0 } });
        const usage = (total, measuredAttempts) => Object.fromEntries(['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens'].map(key => [key, { total, measuredAttempts }]));
        assert.deepEqual(summary.campaign, { solver: { observedAttempts: 11, totalWallMs: 555, measuredWallAttempts: 11, usage: usage(251, 9), knownCostUsd: 4.875, knownCostAttempts: 9 }, review: { stageAttempts: 11, observedSessions: 0, observedAttempts: 11, totalWallMs: 77, measuredWallAttempts: 11, usage: usage(null, 0), knownCostUsd: 1.375, knownCostAttempts: 11 }, journey: { observedAttempts: 0, totalWallMs: 0, measuredWallAttempts: 0, usage: usage(null, 0), knownCostUsd: null, knownCostAttempts: 0 } });
        assert.equal(summary.error, state.error);
        const rendered = fs.readFileSync(path.join(f.root, 'report.md'), 'utf8');
        for (const text of ['| Mean reviewer quality /100 | 75 | 50 |', '| Median solver wall ms | 25 | 35 |', '| Known solver cost USD (partial sum) | 0.75 | 1 |', '| 1 | raw | failed | 0/1 | 50 | 40 |', '| 1 | framework | passed | 1/0 | 75 | 60 |', '| 5 | raw | invalid |', '| 4 | raw | failed | 0/1 | unknown | 20 |', 'synthetic stopping reason']) assert(rendered.includes(text), text);
        const swapped = report.summarize({ ...state, pairs: pairs.map(row => ({ ...row, raw: row.framework, framework: row.raw })).slice(0, 5) });
        assert.deepEqual(swapped.deltas.map(row => row.quality), [-25, 0, 50, null]);
        assert.deepEqual(swapped.deltas.map(row => row.costUsd), [-0.5, null, null, -0.25]);
        assert.equal(swapped.medianSolverWallDeltaMs, -15);
        assert.equal(report.summarize({ ...state, pairs: pairs.slice(0, 3) }).arms.raw.medianSolverWallMs, 30);
        const empty = report.summarize({ ...state, pairs: [] }); assert.equal(empty.arms.raw.medianSolverWallMs, null); assert.equal(empty.qualityDelta, null);
        const unknown = report.markdown({ ...state, pairs: [] }, empty); assert(unknown.includes('| Known solver cost USD (partial sum) | unknown | unknown |'));
    } finally { f.cleanup(); }
});

test('TC-FBM-003 TC-FBM-076: configured setup is complete and relocated always-on context belongs only to treatment', () => {
    const context = require('../../skills/framework-benchmark/lib/project-context.cjs');
    const f = fixture();
    try {
        f.spec.projectMode = 'brownfield-configured'; f.write('case/case.json', f.spec);
        f.write('case/fixture/docs/project-config.json', { project: { name: 'Synthetic' } });
        f.write('case/fixture/docs/project-reference/rules.md', 'Synthetic rules');
        f.write('case/fixture/.claude/.ck.json', { portability: { docsIndexPath: 'handbook/index.md', lessonsPath: 'handbook/lessons.md' } });
        f.write('case/fixture/handbook/index.md', 'Framework documentation routing'); f.write('case/fixture/handbook/lessons.md', 'Framework learned guidance');
        const prepared = f.prepare(); const base = files.inventory(path.join(prepared.root, 'base')).map(row => row.path); const installed = files.inventory(path.join(prepared.root, 'framework')).map(row => row.path);
        for (const file of ['handbook/index.md', 'handbook/lessons.md']) { assert(!base.includes(file)); assert(installed.includes(file)); }
        for (const fault of ['no-config', 'no-docs', 'invalid-config']) {
            const rows = files.inventory(path.join(f.root, 'case/fixture')).filter(row => fault !== 'no-config' || row.path !== 'docs/project-config.json').filter(row => fault !== 'no-docs' || !row.path.startsWith('docs/project-reference/'));
            if (fault === 'invalid-config') rows.find(row => row.path === 'docs/project-config.json').data = Buffer.from('{"project":{"name":""}}');
            assert.throws(() => context.projectContext(rows, f.spec), undefined, fault);
        }
        f.spec.projectMode = 'brownfield-bootstrap'; f.write('case/case.json', f.spec);
        const bootstrap = files.inventory(path.join(f.prepare().root, 'framework')).map(row => row.path);
        assert(!bootstrap.includes('handbook/index.md')); assert(!bootstrap.includes('handbook/lessons.md'));
        assert.match(context.treatmentInstruction(f.spec), /First run the installed project-init/);
        const configured = context.treatmentInstruction({ ...f.spec, projectMode: 'brownfield-configured' });
        assert.match(configured, /Use the installed project configuration and project reference documents/); assert(configured.endsWith(f.spec.treatment));
    } finally { f.cleanup(); }
});

test('TC-FBM-077: inventory rejects excess work and nonregular paths before reading bytes, preserving exact endpoints', () => {
    const f = fixture();
    try {
        f.write('bounded/a', 'ab'); f.write('bounded/b', 'cd');
        const root = path.join(f.root, 'bounded'); const limits = { files: 2, bytes: 4, fileBytes: 2, depth: 2 };
        assert.equal(files.inventory(root, { limits }).length, 2);
        for (const update of [{ bytes: 3 }, { files: 1 }]) {
            const original = fs.readFileSync; const reads = [];
            try { fs.readFileSync = function(file, ...args) { reads.push(path.basename(file)); return original.call(this, file, ...args); };
                assert.throws(() => files.inventory(root, { limits: { ...limits, ...update } })); assert.deepEqual(reads, ['a']);
            } finally { fs.readFileSync = original; }
        }
        fs.mkdirSync(path.join(f.root, 'depth/a/b'), { recursive: true });
        assert.equal(files.inventory(path.join(f.root, 'depth'), { limits: { ...limits, depth: 2 } }).length, 0);
        assert.throws(() => files.inventory(path.join(f.root, 'depth'), { limits: { ...limits, depth: 1 } }));
        // Excluded paths still consume traversal work; four entries exactly fill the low scan budget.
        for (let i = 0; i < 4; i++) f.write(`visited/${i}`, '');
        const filter = () => false; assert.deepEqual(files.inventory(path.join(f.root, 'visited'), { filter, limits }), []);
        f.write('visited/extra', ''); assert.throws(() => files.inventory(path.join(f.root, 'visited'), { filter, limits }), /entry limit/);
        const originalStat = fs.lstatSync; const originalRead = fs.readFileSync; let specialReads = 0;
        try {
            fs.lstatSync = function(file, ...args) { return path.basename(file) === 'a' ? { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false, size: 0 } : originalStat.call(this, file, ...args); };
            fs.readFileSync = function(file, ...args) { if (path.basename(file) === 'a') { specialReads++; throw new Error('Must not read a special file'); } return originalRead.call(this, file, ...args); };
            assert.throws(() => files.inventory(root), /Unsupported snapshot entry/); assert.equal(specialReads, 0);
        } finally { fs.lstatSync = originalStat; fs.readFileSync = originalRead; }
    } finally { f.cleanup(); }
});

test('TC-FBM-071 TC-FBM-077: committed snapshots preserve empty and exact-limit blobs and POSIX executable metadata', () => {
    const f = fixture();
    try {
        const repo = path.join(f.root, 'source'); fs.mkdirSync(repo);
        const env = { ...checkEnvironment(f, repo), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(f.root, 'no-global-config') };
        const git = args => execFileSync('git', ['-C', repo, ...args], { env, stdio: 'pipe', timeout: 30000 });
        git(['init', '-q']); f.write('source/empty', ''); f.write('source/exact', Buffer.alloc(4 * 1024 * 1024, 120).toString()); f.write('source/tool.cjs', 'synthetic executable');
        for (const file of ['node_modules/disposable.cjs', 'tmp/disposable.cjs', 'private.pem', 'settings.local.json']) f.write('source/' + file, 'Synthetic excluded bytes');
        f.write('source/.env.example', 'SYNTHETIC=value');
        git(['add', '--all']); git(['update-index', '--chmod=+x', 'tool.cjs']);
        git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'fixture']);
        const snapshot = files.gitSnapshot(repo, 'HEAD');
        assert.deepEqual(snapshot.entries.map(row => row.path), ['.env.example', 'empty', 'exact', 'tool.cjs']);
        assert.equal(snapshot.entries.find(row => row.path === 'empty').data.length, 0); assert.equal(snapshot.entries.find(row => row.path === 'exact').data.length, 4 * 1024 * 1024);
        assert.equal(snapshot.entries.find(row => row.path === 'tool.cjs').executable, true); assert.equal(snapshot.entries.find(row => row.path === 'empty').executable, false);
        const output = path.join(f.root, 'materialized'); files.materialize(output, snapshot.entries);
        if (process.platform !== 'win32') { assert(fs.statSync(path.join(output, 'tool.cjs')).mode & 0o111); assert.equal(fs.statSync(path.join(output, 'empty')).mode & 0o111, 0); }
    } finally { f.cleanup(); }
});

test('TC-FBM-072 TC-FBM-077: alternate aliases, linked roots and non-tmp output cannot escape ownership', () => {
    const f = fixture();
    try {
        for (const file of ['a//b', 'a/./b']) assert.throws(() => files.safeRelative(file));
        assert.throws(() => cli.outputDirectory(f.root, 'reports')); assert(!fs.existsSync(path.join(f.root, 'reports')));
        if (process.platform !== 'win32') {
            fs.mkdirSync(path.join(f.root, 'outside')); fs.symlinkSync(path.join(f.root, 'outside'), path.join(f.root, 'tmp/link'));
            assert.throws(() => cli.outputDirectory(f.root, 'tmp/link/new')); assert(!fs.existsSync(path.join(f.root, 'outside/new')));
            fs.symlinkSync(path.join(f.root, 'case/fixture'), path.join(f.root, 'case/linked'));
            f.spec.fixture = 'linked'; f.write('case/case.json', f.spec); assert.throws(f.prepare, /Symbolic links/);
            f.spec.fixture = 'fixture'; f.spec.checksDir = 'linked'; f.write('case/case.json', f.spec); assert.throws(f.prepare, /Symbolic links/);
            const repo = path.join(f.root, 'source'); fs.mkdirSync(repo);
            const env = { ...checkEnvironment(f, repo), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(f.root, 'no-global-config') };
            const git = args => execFileSync('git', ['-C', repo, ...args], { env, stdio: 'pipe', timeout: 30000 });
            git(['init', '-q']); f.write('source/target', 'safe'); fs.symlinkSync('target', path.join(repo, 'link')); git(['add', '--all']);
            git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'fixture']);
            assert.throws(() => files.gitSnapshot(repo, 'HEAD'), /Symlinks/);
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-071 TC-FBM-077: preparation rejects incomplete inputs, foreign records and duplicated holdouts before spending', () => {
    const f = fixture();
    try {
        const serialized = JSON.stringify(f.spec); const exact = serialized + ' '.repeat(2 * 1024 * 1024 - Buffer.byteLength(serialized));
        f.write('padded.json', exact); assert.deepEqual(experiment.readJson(path.join(f.root, 'padded.json')), f.spec);
        f.write('padded.json', exact + ' '); assert.throws(() => experiment.readJson(path.join(f.root, 'padded.json')), /Invalid JSON input/);
        delete f.spec.fixture; f.write('case/case.json', f.spec);
        let prepared = f.prepare(); assert.match(prepared.identity.runnerHash, /^[a-f0-9]{64}$/);
        f.write('case/other/app.cjs', 'distinct application'); f.spec.fixture = 'other'; f.write('case/case.json', f.spec);
        assert.equal(fs.readFileSync(path.join(f.prepare().root, 'base/app.cjs'), 'utf8'), 'distinct application');
        f.spec.fixture = 'fixture'; f.write('case/case.json', f.spec);
        f.write('framework/.claude/private.pem', 'Synthetic excluded key'); f.write('framework/.claude/settings.local.json', 'Synthetic local override'); f.write('framework/.claude/tmp/private.cjs', 'Synthetic disposable');
        f.write('case/fixture/.claude/private.pem', 'Synthetic excluded key'); f.write('case/fixture/.claude/settings.local.json', 'Synthetic local override'); f.write('case/fixture/.claude/tmp/private.cjs', 'Synthetic disposable');
        f.write('case/fixture/private.pem', 'Synthetic excluded key'); f.write('case/fixture/settings.local.json', 'Synthetic local override'); f.write('case/fixture/node_modules/private.cjs', 'Synthetic dependency'); f.write('case/fixture/.env.example', 'SYNTHETIC=value');
        prepared = f.prepare();
        const installed = files.inventory(path.join(prepared.root, 'framework')).map(row => row.path);
        assert(!installed.some(file => /private\.pem|settings\.local|tmp\/private/.test(file)));
        assert.deepEqual(files.inventory(path.join(prepared.root, 'base')).map(row => row.path), ['.env.example', 'app.cjs']);
        for (const field of ['owner', 'schemaVersion']) {
            const { state } = experiment.load(prepared.root); state[field] = field === 'owner' ? 'foreign-owner' : 2;
            f.write(path.relative(f.root, path.join(prepared.root, 'result.json')), state); assert.throws(() => experiment.load(prepared.root), /owned benchmark/);
            state[field] = field === 'owner' ? experiment.OWNER : 1; f.write(path.relative(f.root, path.join(prepared.root, 'result.json')), state);
        }
        const oracle = fs.readFileSync(path.join(f.root, 'case/checks/acceptance.cjs'), 'utf8');
        for (const location of ['case/fixture/leak.cjs', 'framework/.claude/leak.cjs']) { f.write(location, oracle); assert.throws(f.prepare, /Held-out/); fs.rmSync(path.join(f.root, location)); }
    } finally { f.cleanup(); }
    for (const missing of ['base', 'checks', 'settings']) {
        const f = fixture();
        try {
            if (missing === 'base') fs.rmSync(path.join(f.root, 'case/fixture/app.cjs'));
            if (missing === 'checks') fs.rmSync(path.join(f.root, 'case/checks'), { recursive: true });
            if (missing === 'checks') fs.mkdirSync(path.join(f.root, 'case/checks'));
            if (missing === 'settings') fs.rmSync(path.join(f.root, 'framework/.claude/settings.json'));
            assert.throws(f.prepare, undefined, missing);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-071: preparation uses the requested committed consumer revision instead of fixture or local edits', () => {
    const f = fixture();
    try {
        const repo = path.join(f.root, 'source'); fs.mkdirSync(repo);
        const env = { ...checkEnvironment(f, repo), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(f.root, 'no-global-config') };
        const git = args => execFileSync('git', ['-C', repo, ...args], { env, stdio: 'pipe', timeout: 30000 }).toString().trim();
        git(['init', '-q']); f.write('source/app.cjs', 'first committed source'); git(['add', '--all']);
        const commit = () => git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'fixture']);
        commit(); const older = git(['rev-parse', 'HEAD']);
        f.write('source/app.cjs', 'second committed source'); git(['add', '--all']); commit(); f.write('source/app.cjs', 'uncommitted source');
        for (const ref of [undefined, older]) {
            f.spec.ref = ref; f.write('case/case.json', f.spec);
            const prepared = experiment.prepare({ caseFile: path.join(f.root, 'case/case.json'), runtimeFile: path.join(f.root, 'runtime.json'), projectRoot: repo, frameworkRoot: path.join(f.root, 'framework'), outputRoot: path.join(f.root, 'tmp') });
            assert.equal(fs.readFileSync(path.join(prepared.root, 'base/app.cjs'), 'utf8'), ref ? 'first committed source' : 'second committed source');
        }
        assert.equal(fs.readFileSync(path.join(repo, 'app.cjs'), 'utf8'), 'uncommitted source');
    } finally { f.cleanup(); }
});

test('TC-FBM-072 TC-FBM-077: candidate patch endpoints preserve files, bytes and executable intent', () => {
    const empty = Array.from({ length: 12000 }, (_, i) => ({ path: `f${i}`, base64: '' }));
    assert.equal(experiment.applyDelta([], { entries: empty, deleted: [] }).length, 12000);
    assert.throws(() => experiment.applyDelta([], { entries: [...empty, { path: 'extra', base64: '' }], deleted: [] }));
    const chunk = Buffer.alloc(4 * 1024 * 1024, 120).toString('base64');
    const full = Array.from({ length: 8 }, (_, i) => ({ path: `b${i}`, base64: chunk, executable: i === 0 }));
    const accepted = experiment.applyDelta([], { entries: full, deleted: [] });
    assert.equal(accepted.reduce((sum, row) => sum + row.data.length, 0), 32 * 1024 * 1024);
    assert.equal(accepted[0].executable, true); assert.equal(accepted[1].executable, false);
    assert.throws(() => experiment.applyDelta([], { entries: [...full, { path: 'extra', base64: 'eA==' }], deleted: [] }));
    assert.throws(() => experiment.applyDelta([], { entries: [{ path: 'big', base64: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }], deleted: [] }));
});

test('TC-FBM-001 TC-FBM-074: actual arm inputs, native adapter packets and persisted identities stay matched', async () => {
    const f = fixture();
    try {
        f.write('case/fixture/docs/application-guide.md', 'Ordinary application documentation for both arms');
        const driver = transport(); const execute = driver.execute;
        driver.execute = async (runtime, job) => {
            if (job.role === 'solve') {
                const rows = files.inventory(job.workspace).map(row => row.path);
                assert(rows.includes('app.cjs')); assert(rows.includes('docs/application-guide.md'));
                assert.equal(rows.includes('.claude/settings.json'), job.arm === 'framework');
                assert.equal(rows.includes('.claude/skills/feature-implement/SKILL.md'), job.arm === 'framework');
                if (job.arm === 'raw') assert(!rows.some(file => files.agentSurface(file)));
                assert.equal(fs.readFileSync(path.join(job.workspace, 'app.cjs'), 'utf8'), "module.exports = 'baseline';\n");
            }
            if (job.role === 'review' && job.purpose !== 'journey') {
                assert(job.prompt.includes(f.spec.prompt)); assert(job.prompt.includes('Frozen external check outcomes:'));
                for (const check of f.spec.checks) assert(job.prompt.includes(check.id));
                for (const dimension of contract.DIMENSIONS) assert(job.prompt.includes(dimension));
                assert.deepEqual(job.reviewSchema.required, ['scores', 'findings']);
                assert.equal(job.reviewSchema.properties.scores.properties.correctness.properties.score.maximum, 4);
            }
            const result = await execute(runtime, job);
            if (job.role !== 'check') {
                result.packet = JSON.parse(result.stdout);
                result.stdout = JSON.stringify({ ...result.packet, delta: undefined, setupDelta: undefined }) + '\n';
            }
            return result;
        };
        const state = await experiment.run(f.prepare().root, { transport: driver });
        assert.equal(state.phase, 'complete');
        for (const pair of state.pairs) {
            assert.equal(pair.raw.status, 'failed'); assert.equal(pair.framework.status, 'passed'); assert.deepEqual(pair.invalidReasons, []);
            for (const name of ['raw', 'framework']) {
                const arm = pair[name]; assert.equal(arm.solver.rootModel, f.runtime.model); assert.equal(arm.solver.hostVersion, '2.0.0 (Claude Code)');
                assert.equal(arm.solver.sessionId, driver.calls.find(job => job.sessionId === arm.solver.sessionId).sessionId);
                assert.deepEqual(arm.solver.selectedSkills, name === 'raw' ? [] : ['project-init', 'feature-implement']);
            }
        }
    } finally { f.cleanup(); }
    const failed = fixture();
    try {
        const driver = transport({ failedSolver: true }); const state = await experiment.run(failed.prepare().root, { transport: driver });
        for (const pair of state.pairs) for (const name of ['raw', 'framework']) {
            assert.equal(pair[name].solver.hostVersion, '2.0.0 (Claude Code)'); assert.equal(pair[name].solver.rootModel, null);
            assert(driver.calls.some(job => job.role === 'solve' && job.sessionId === pair[name].solver.sessionId));
        }
    } finally { failed.cleanup(); }
});

test('TC-FBM-073 TC-FBM-079: independent solver, grader and reviewer faults cannot enter trusted comparisons', async () => {
    for (const fault of ['solver-model', 'solver-infra', 'raw-selected', 'raw-discovered', 'grade-reserved', 'grade-null', 'grade-failure', 'solver-nonzero', 'solver-capture', 'review-not-ok', 'review-model', 'review-session', 'review-changed', 'review-nonzero', 'review-capture']) {
        const f = fixture();
        try {
            const driver = transport(); const execute = driver.execute; let checks = 0;
            driver.execute = async (runtime, job) => {
                const result = await execute(runtime, job);
                if (job.role === 'check') {
                    if (++checks > f.spec.checks.length) {
                        if (fault === 'grade-reserved') result.exitCode = 125;
                        if (fault === 'grade-null') result.exitCode = null;
                        if (fault === 'grade-failure') result.failure = 'output-limit';
                    }
                } else {
                    const body = JSON.parse(result.stdout);
                    if (job.role === 'solve') {
                        if (fault === 'solver-model') body.rootModel = 'other-revision';
                        if (fault === 'solver-infra') { body.ok = false; body.failureClass = 'infrastructure'; }
                        if (job.arm === 'raw' && fault === 'raw-selected') body.selectedSkills = ['plan'];
                        if (job.arm === 'raw' && fault === 'raw-discovered') body.discoveredSkills = ['plan'];
                    } else {
                        if (fault === 'review-not-ok') body.ok = false;
                        if (fault === 'review-model') body.rootModel = 'other-judge';
                        if (fault === 'review-session') body.sessionId = crypto.randomUUID();
                        if (fault === 'review-changed') body.candidateIntact = false;
                    }
                    result.stdout = JSON.stringify(body); result.packet = body;
                    if (fault === `${job.role === 'solve' ? 'solver' : 'review'}-nonzero`) result.exitCode = 1;
                    if (fault === `${job.role === 'solve' ? 'solver' : 'review'}-capture`) result.failure = 'output-limit';
                }
                return result;
            };
            const state = await experiment.run(f.prepare().root, { transport: driver }); const summary = report.summarize(state);
            assert.equal(state.phase, 'inconclusive', fault);
            if (fault.startsWith('review')) {
                assert.equal(summary.validPairs, 2); assert.equal(summary.qualityPairs, 0); assert.equal(summary.qualityDelta, null);
                assert(state.pairs.every(pair => !pair.raw.review.valid && pair.raw.review.error && !pair.framework.review.valid && pair.framework.review.error));
            } else {
                assert.equal(summary.validPairs, 0); assert.equal(summary.successDelta, null);
                assert(state.pairs.every(pair => pair.invalidReasons.length && (!pair.raw.valid || !pair.framework.valid)));
                for (const pair of state.pairs) for (const name of ['raw', 'framework']) if (!pair[name].valid) { assert.equal(pair[name].status, 'invalid'); assert(pair[name].invalidReason); assert.equal(pair[name].success, false); }
                if (fault.startsWith('grade')) assert.equal(summary.campaign.solver.knownCostAttempts, 4);
            }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-077: an unknown public CLI verb cannot reserve or launch an otherwise valid prepared campaign', () => {
    const f = fixture();
    try {
        const prepared = f.prepare(); assert.throws(() => cli.parseArgs(['reportt', '--run', prepared.root]));
        const script = path.resolve(__dirname, '../../skills/framework-benchmark/scripts/benchmark.cjs');
        const result = require('node:child_process').spawnSync(process.execPath, [script, 'reportt', '--run', prepared.root], { cwd: f.root, env: checkEnvironment(f, f.root), encoding: 'utf8', timeout: 20000 });
        assert.equal(result.status, 1); assert.equal(experiment.load(prepared.root).state.phase, 'prepared'); assert(!fs.existsSync(path.join(prepared.root, 'attempt.lock')));
    } finally { f.cleanup(); }
});

test('TC-FBM-072 TC-FBM-077: runtime collection admits exactly its patch allowance and refuses an additional byte or a leaked synthetic key', () => {
    for (const extra of [false, true]) {
        const f = runtimeFixture();
        try {
            const run = f.ports.runCommand;
            f.ports.runCommand = (bin, args, settings) => {
                const result = run(bin, args, settings);
                if (args[0] === '-p') {
                    fs.writeFileSync(path.join(f.workspace, 'app.cjs'), extra ? 'x' : '');
                    const chunk = Buffer.alloc(4 * 1024 * 1024, 120);
                    for (let i = 0; i < 8; i++) fs.writeFileSync(path.join(f.workspace, `large-${i}`), chunk);
                }
                return result;
            };
            if (extra) assert.throws(() => session.main(f.job, f.ports), /patch exceeds/);
            else { assert.equal(session.main(f.job, f.ports), 0); assert.equal(f.packets.at(-1).delta.entries.reduce((sum, row) => sum + Buffer.from(row.base64, 'base64').length, 0), 32 * 1024 * 1024); }
        } finally { f.cleanup(); }
    }
    for (const leaked of [false, true]) {
        const f = runtimeFixture();
        try {
            f.ports.env.ANTHROPIC_API_KEY = 'synthetic-artifact-key'; const run = f.ports.runCommand;
            f.ports.runCommand = (bin, args, settings) => { const result = run(bin, args, settings); if (leaked && args[0] === '-p') fs.writeFileSync(path.join(f.workspace, 'app.cjs'), 'synthetic-artifact-key'); return result; };
            if (leaked) assert.throws(() => session.main(f.job, f.ports), /provider credential/); else assert.equal(session.main(f.job, f.ports), 0);
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-074 TC-FBM-076: runtime retains init-only identity, discovery, model usage and observed zero values', () => {
    const init = { type: 'system', subtype: 'init', session_id: 'observed-init', model: 'model-revision', skills: ['plan'] };
    const parsed = session.parseStream(JSON.stringify(init));
    assert.equal(parsed.sessionId, 'observed-init'); assert.equal(parsed.rootModel, 'model-revision'); assert.deepEqual(parsed.discoveredSkills, ['plan']);
    for (const variant of ['zero', 'absent', 'init-timeout']) {
        const f = runtimeFixture();
        try {
            const run = f.ports.runCommand;
            f.ports.runCommand = (bin, args, settings) => {
                const result = run(bin, args, settings);
                if (args[0] === '-p') {
                    const events = result.stdout.split('\n').map(line => JSON.parse(line));
                    if (variant === 'init-timeout') return { status: null, error: { code: 'ETIMEDOUT' }, stdout: JSON.stringify(events[0]) };
                    const final = events.at(-1); final.modelUsage = { 'model-revision': { inputTokens: 0 } };
                    final.usage = variant === 'zero' ? { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } : undefined;
                    final.total_cost_usd = variant === 'zero' ? 0 : undefined; events[0].skills = ['plan'];
                    result.stdout = events.map(row => JSON.stringify(row)).join('\n');
                }
                return result;
            };
            session.main(f.job, f.ports); const result = f.packets.at(-1);
            if (variant === 'init-timeout') { assert.equal(result.ok, false); assert.equal(result.failureClass, 'task'); assert.equal(result.sessionId, f.job.sessionId); }
            else {
                assert.deepEqual(result.discoveredSkills, ['plan']); assert.deepEqual(result.modelUsage, { 'model-revision': { inputTokens: 0 } });
                // Per-model usage is an observation too (it includes subagents): its reported zero input stays 0;
                // fields neither source reports stay unknown, never zero.
                assert.deepEqual(result.measurements, Object.fromEntries(['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'costUsd'].map(key => [key, variant === 'zero' || key === 'inputTokens' ? 0 : null])));
            }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072 TC-FBM-079: role-specific native CLI arguments preserve models, budgets and read-only review schema', () => {
    const f = fixture();
    try {
        const schema = experiment.reviewSchema();
        for (const [role, arm, expectedModel, expectedBudget] of [['solve', 'raw', f.runtime.model, f.runtime.budgetUsd], ['solve', 'framework', f.runtime.model, f.runtime.budgetUsd], ['review', undefined, f.runtime.judgeModel, f.runtime.judgeBudgetUsd]]) {
            const job = { role, arm, runtime: f.runtime, sessionId: 'requested-session', treatment: 'Use the selected route', reviewSchema: schema };
            const args = session.argsFor(job); const value = flag => args[args.indexOf(flag) + 1];
            assert.equal(value('--model'), expectedModel); assert.equal(value('--max-budget-usd'), String(expectedBudget)); assert.equal(value('--session-id'), job.sessionId);
            if (role === 'review') { assert.equal(value('--tools'), 'Read,Glob,Grep'); assert.equal(value('--allowedTools'), 'Read,Glob,Grep'); assert.deepEqual(JSON.parse(value('--json-schema')), schema); }
        }
    } finally { f.cleanup(); }
});

test('TC-FBM-051 TC-FBM-078: cold native entry routes completed check output, failures and default environment without touching host roots', () => {
    for (const status of [0, 7, null, 'signal', 'error']) {
        const f = fixture();
        try {
            const input = path.join(f.root, 'case/fixture'); const workspace = path.join(f.root, 'cold-work'); const stdout = [], stderr = [];
            const env = checkEnvironment(f, workspace);
            const job = { role: 'check', argv: ['fixture-check', 'literal argument'], timeoutMs: 1000, inputHash: files.fingerprint(files.inventory(input)) };
            const processPort = { env, versions: process.versions, version: process.version, stdout: { write: value => stdout.push(value) }, stderr: { write: value => stderr.push(value) } };
            const map = root => root === '/input' ? input : root === '/workspace' ? workspace : root;
            const fileTools = { ...files, inventory: (root, options) => files.inventory(map(root), options), materialize: (root, rows) => files.materialize(map(root), rows) };
            const fsPort = { ...fs, readFileSync: (file, ...args) => file === 0 ? JSON.stringify(job) : fs.readFileSync(file, ...args) };
            loadTrustedModule('scripts/container-session.cjs', { 'node:fs': fsPort, '/runner-lib/files.cjs': fileTools, 'node:child_process': { spawnSync: (bin, args, options) => {
                assert.equal(bin, 'fixture-check'); assert.deepEqual(args, ['literal argument']); assert.equal(options.env, env);
                return { status: typeof status === 'number' ? status : null, stdout: 'check observation', stderr: 'check diagnostic', ...(status === 'signal' ? { signal: 'SIGTERM' } : {}), ...(status === 'error' ? { error: new Error('fixture launch') } : {}) };
            } } }, { processPort, entry: true });
            assert.equal(processPort.exitCode, typeof status === 'number' ? status : 125); assert.deepEqual(stdout, ['check observation']); assert.deepEqual(stderr, ['check diagnostic']);
            assert.equal(fs.readFileSync(path.join(workspace, 'app.cjs'), 'utf8'), "module.exports = 'baseline';\n");
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-051 TC-FBM-077: pre-model prerequisites reject contaminated images, Git failures and unsupported capability versions', () => {
    for (const fault of ['ancestor', 'git-init', 'git-add', 'git-commit', 'probe-git', 'probe-help', 'probe-flag', 'node-17', 'node-18.18', 'node-18.19', 'node-18.20', 'node-20']) {
        const f = runtimeFixture();
        try {
            const probe = fault.startsWith('probe') || fault.startsWith('node'); if (probe) f.job.role = 'probe';
            const run = f.ports.runCommand;
            f.ports.runCommand = (bin, args, options) => {
                const result = run(bin, args, options);
                if (fault.startsWith('git-') && bin === 'git' && args.includes(fault.slice(4))) result.status = 1;
                if (fault === 'probe-git' && bin === 'git' && args.includes('--version')) result.status = 1;
                if (args[0] === '--help') { if (fault === 'probe-help') result.status = 1; if (fault === 'probe-flag') result.stdout = result.stdout.replace('--bare', ''); }
                return result;
            };
            const roots = ['/CLAUDE.md', '/AGENTS.md', '/.claude', '/.agents', '/.codex'];
            const fsPort = { ...fs, existsSync: file => roots.includes(file) ? fault === 'ancestor' && file === '/CLAUDE.md' : fs.existsSync(file) };
            const nodeVersion = { 'node-17': '17.9.0', 'node-18.18': '18.18.0', 'node-18.19': '18.19.0', 'node-18.20': '18.20.0', 'node-20': '20.0.0' }[fault] || process.versions.node;
            const loaded = loadTrustedModule('scripts/container-session.cjs', { 'node:fs': fsPort }, { processPort: { env: f.ports.env, versions: { node: nodeVersion }, version: 'v' + nodeVersion } });
            const accepted = ['node-18.19', 'node-18.20', 'node-20'].includes(fault);
            if (accepted) { assert.equal(loaded.main(f.job, f.ports), 0); assert.equal(f.packets.at(-1).ok, true); }
            else { assert.throws(() => loaded.main(f.job, f.ports)); assert(!f.calls.some(call => call.args[0] === '-p')); }
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-072: native catalog and MCP additions invalidate runtime fidelity without exporting those controls', () => {
    for (const file of ['.claude/SKILLS.yaml', '.mcp.json']) {
        const f = runtimeFixture();
        try {
            const run = f.ports.runCommand;
            f.ports.runCommand = (bin, args, options) => { const result = run(bin, args, options); if (args[0] === '-p') f.write('runtime-work/' + file, 'Synthetic added control'); return result; };
            session.main(f.job, f.ports); const result = f.packets.at(-1);
            assert.equal(result.treatmentIntact, false); assert(result.treatmentChanges.includes(file)); assert(!result.delta.entries.some(row => row.path === file));
        } finally { f.cleanup(); }
    }
});

test('TC-FBM-051: default preflight uses the bounded native capture owner for every stage', async () => {
    const f = fixture(); const calls = []; const { EventEmitter } = require('node:events');
    try {
        const spawn = (bin, args, options) => {
            assert.equal(bin, 'docker'); calls.push({ args, options });
            const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter(); child.kill = () => {};
            child.stdin.end = () => {
                const text = args[0] === 'info' ? 'linux\n' : args[0] === 'image' ? `sha256:${'c'.repeat(64)}\n` : args[0] === 'run' ? '{"ok":true}\n' : '';
                if (text) child.stdout.emit('data', Buffer.from(text)); child.emit('close', 0, null);
            };
            return child;
        };
        const loaded = loadTrustedModule('lib/docker.cjs', { 'node:child_process': { spawn } });
        const result = await loaded.preflight(f.runtime, { workspace: path.join(f.root, 'case/fixture') }, { HOME: f.root, ANTHROPIC_API_KEY: 'synthetic-native-preflight' });
        assert.equal(result.runtimeProbe.ok, true); assert.deepEqual(calls.map(call => call.args[0]), ['info', 'image', 'run', 'rm']);
        assert(calls.every(call => call.options.env.HOME === f.root));
    } finally { f.cleanup(); }
});

test('TC-FBM-071: public preparation keeps the selected project and ref under inherited Git redirects', () => {
    const f = fixture();
    try {
        const env = { ...checkEnvironment(f, f.root), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(f.root, 'no-global-config') };
        const create = name => {
            const root = path.join(f.root, name); fs.mkdirSync(root);
            const git = args => execFileSync('git', ['-C', root, ...args], { env, stdio: 'pipe', timeout: 30000 }).toString().trim();
            const commit = value => {
                f.write(`${name}/app.cjs`, value);
                f.write(`${name}/.claude/skills/feature-implement/SKILL.md`, value);
                git(['add', '--all']);
                // Synthetic fixture history only; no authoring-checkout Git writes.
                git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'fixture']);
                return git(['rev-parse', 'HEAD']);
            };
            git(['init', '-q']); f.write(`${name}/.claude/settings.json`, { hooks: {} });
            f.write(`${name}/${name}-only.cjs`, name);
            const older = commit(`${name}-base`); git(['tag', 'fixture-base']);
            return { root, git, older, head: commit(`${name}-head`) };
        };
        const selected = create('selected'); const foreign = create('foreign');
        const linked = path.join(f.root, 'linked'); selected.git(['worktree', 'add', '--quiet', '--detach', linked, 'HEAD']);
        f.write('selected/app.cjs', 'selected-local-edit'); f.write('selected/untracked.cjs', 'untracked');
        f.write('linked/app.cjs', 'linked-local-edit');
        f.write('observe-git.cjs', `
            const fs = require('node:fs'); const cp = require('node:child_process');
            const original = cp.execFileSync;
            const context = () => JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([key]) => /^GIT_/i.test(key))));
            const inherited = context();
            cp.execFileSync = function (file, args, options) {
                if (file === 'git') fs.appendFileSync(process.env.FBM_GIT_AUDIT, JSON.stringify({
                    type: 'git', redirects: Object.keys(options.env || process.env).filter(key => /^GIT_/i.test(key)),
                    sentinel: options.env?.FBM_GIT_SENTINEL
                }) + '\\n');
                return original(file, args, options);
            };
            process.on('exit', () => fs.appendFileSync(process.env.FBM_GIT_AUDIT,
                JSON.stringify({ type: 'exit', callerUnchanged: context() === inherited }) + '\\n'));
        `);
        const redirects = { GIT_DIR: path.join(foreign.root, '.git'), GIT_WORK_TREE: foreign.root,
            GIT_COMMON_DIR: path.join(foreign.root, '.git'), GIT_INDEX_FILE: path.join(foreign.root, '.git/index'),
            GIT_OBJECT_DIRECTORY: path.join(foreign.root, '.git/objects'), git_namespace: 'fixture-namespace',
            GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.worktree', GIT_CONFIG_VALUE_0: foreign.root };
        for (const [index, variant] of [
            { project: selected.root, commit: selected.head, value: 'selected-head', poisoned: false },
            { project: selected.root, commit: selected.head, value: 'selected-head', poisoned: true },
            { project: selected.root, ref: 'fixture-base', commit: selected.older, value: 'selected-base', poisoned: true },
            { project: linked, commit: selected.head, value: 'selected-head', poisoned: true }
        ].entries()) {
            f.spec.ref = variant.ref; f.write('case/case.json', f.spec);
            const audit = path.join(f.root, `audit-${index}.jsonl`);
            const output = execFileSync(process.execPath, ['--require', path.join(f.root, 'observe-git.cjs'),
                path.resolve(__dirname, '../../skills/framework-benchmark/scripts/benchmark.cjs'), 'prepare',
                '--case', path.join(f.root, 'case/case.json'), '--runtime', path.join(f.root, 'runtime.json'),
                '--project', variant.project, '--framework', path.join(f.root, 'framework'), '--out', 'tmp/git-context'],
            { cwd: f.root, env: { ...env, ...(variant.poisoned ? redirects : {}), FBM_GIT_AUDIT: audit, FBM_GIT_SENTINEL: 'retained' },
                encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
            const prepared = JSON.parse(output);
            assert.equal(prepared.identity.commit, variant.commit);
            assert.equal(fs.readFileSync(path.join(prepared.root, 'base/app.cjs'), 'utf8'), variant.value);
            assert.equal(fs.readFileSync(path.join(prepared.root, 'framework/.claude/skills/feature-implement/SKILL.md'), 'utf8'), variant.value);
            assert.equal(fs.existsSync(path.join(prepared.root, 'base/selected-only.cjs')), true);
            assert.equal(fs.existsSync(path.join(prepared.root, 'base/foreign-only.cjs')), false);
            assert.equal(fs.existsSync(path.join(prepared.root, 'base/untracked.cjs')), false);
            const events = fs.readFileSync(audit, 'utf8').trim().split('\n').map(line => JSON.parse(line));
            const calls = events.filter(event => event.type === 'git');
            assert.equal(calls.length, 3);
            assert(calls.every(event => event.redirects.length === 0 && event.sentinel === 'retained'));
            assert.deepEqual(events.filter(event => event.type === 'exit'), [{ type: 'exit', callerUnchanged: true }]);
        }
        assert.equal(fs.readFileSync(path.join(selected.root, 'app.cjs'), 'utf8'), 'selected-local-edit');
        assert.equal(fs.readFileSync(path.join(selected.root, 'untracked.cjs'), 'utf8'), 'untracked');
        assert.equal(fs.readFileSync(path.join(linked, 'app.cjs'), 'utf8'), 'linked-local-edit');
        assert.equal(fs.readFileSync(path.join(foreign.root, 'app.cjs'), 'utf8'), 'foreign-head');
    } finally { f.cleanup(); }
});

// Cross-run comparison over synthetic saved states; no model call is involved.
const compare = require('../../skills/framework-benchmark/lib/compare.cjs');
function savedRun(caseId, { host = 'claude', model = 'solver-a', success = [true, true], score = [3, 3], pairValid = true, usage = { inputTokens: 100, outputTokens: 50 }, projectMode = 'greenfield', expectedSkills = [] } = {}) {
    const arm = (passed, value, tokens) => ({ success: passed, review: { valid: true, scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: value }])) },
        solver: { wallMs: tokens * 10, measurements: { ...usage, inputTokens: usage.inputTokens === null ? null : tokens, costUsd: null } } });
    return { label: `runs/${caseId}`, state: { case: { id: caseId, kind: 'feature', projectMode, expectedSkills }, identity: { caseHash: `case-${caseId}`, baseHash: `base-${caseId}`, frameworkHash: 'fw' },
        runtime: { backend: 'host', host, cliVersion: `${host} 1.0`, model, judgeModel: model },
        pairs: [{ repeat: 1, valid: pairValid, raw: arm(success[0], score[0], 100), framework: arm(success[1], score[1], 300) }] } };
}

test('TC-FBM-010: the sign test is exact and symmetric, and nothing decisive yields no p-value', () => {
    assert.equal(compare.signTest(6, 0), 0.03125);
    assert.equal(compare.signTest(0, 6), 0.03125);
    assert.equal(compare.signTest(5, 0), 0.0625);
    assert.equal(compare.signTest(3, 3), 1);
    assert.equal(compare.signTest(0, 0), null);
});

test('TC-FBM-010: repeats of one task pool into one task and different runtimes are never pooled', () => {
    const result = compare.compareRuns([savedRun('alpha'), savedRun('alpha'), savedRun('alpha', { host: 'codex', model: 'solver-b' })]);
    assert.equal(result.groups.length, 2);
    const claude = result.groups.find(group => group.runtime.host === 'claude');
    assert.equal(claude.tasks, 1);
    assert.equal(claude.rows[0].validPairs, 2);
    assert.deepEqual(claude.rows[0].runs, ['runs/alpha', 'runs/alpha']);
});

test('TC-FBM-010: verdicts need six decisive tasks and use the same bar for framework and raw', () => {
    const wins = n => Array.from({ length: n }, (_, i) => savedRun(`task-${i}`, { success: [false, true], score: [2, 4] }));
    const losses = n => Array.from({ length: n }, (_, i) => savedRun(`loss-${i}`, { success: [true, false], score: [4, 2] }));
    assert.equal(compare.compareRuns(wins(4)).groups[0].success.verdict, 'insufficient-evidence');
    // A clean five-task sweep has p = 0.0625: still too few tasks, never "no difference".
    assert.equal(compare.compareRuns(wins(5)).groups[0].success.verdict, 'insufficient-evidence');
    assert.equal(compare.compareRuns(wins(6)).groups[0].success.verdict, 'framework-better');
    assert.equal(compare.compareRuns(losses(6)).groups[0].success.verdict, 'raw-better');
    assert.equal(compare.compareRuns([...wins(3), ...losses(3)]).groups[0].success.verdict, 'no-detected-difference');
    assert.equal(compare.compareRuns(wins(6)).groups[0].quality.verdict, 'framework-better');
});

test('TC-FBM-010: small quality gaps tie, invalid pairs stay out of outcomes and unknown usage stays null', () => {
    // One dimension point of 32 is a 3.125/100 gap: inside the tie band.
    const nearTie = savedRun('near', { score: [3, 3] });
    nearTie.state.pairs[0].framework.review.scores.correctness.score = 4;
    const invalid = savedRun('broken', { pairValid: false });
    const unknown = savedRun('unmeasured', { usage: { inputTokens: null, outputTokens: 50 } });
    const group = compare.compareRuns([nearTie, invalid, unknown]).groups[0];
    const row = id => group.rows.find(item => item.caseId === id);
    assert.equal(row('near').qualityOutcome, 'tie');
    assert.equal(row('broken').validPairs, 0); assert.equal(row('broken').invalidPairs, 1);
    assert.deepEqual(group.unscoredTasks, ['broken']);
    assert.equal(group.scoredTasks, 2);
    assert.equal(row('unmeasured').tokenRatio, null);
    assert.equal(row('near').raw.knownCostUsd, null);
    assert.equal(row('near').wallRatio, 3);
});

test('TC-FBM-010: the comparison report escapes saved values and the command accepts exactly one run source', () => {
    const hostile = savedRun('task|<img src=x>');
    const markdown = compare.comparisonMarkdown(compare.compareRuns([hostile]));
    // Backslash escapes render as literal text: no live tag and no extra table column.
    assert(markdown.includes('task\\|\\<img'));
    assert.doesNotMatch(markdown, /(^|[^\\])<img/m);
    assert.match(markdown, /insufficient-evidence/);
    assert.throws(() => cli.parseArgs(['compare']), /either --runs or --campaign/);
    assert.throws(() => cli.parseArgs(['compare', '--runs', 'a', '--campaign', 'b']), /either --runs or --campaign/);
    assert.deepEqual(cli.parseArgs(['compare', '--campaign', 'tmp/c']), { command: 'compare', campaign: 'tmp/c' });
    assert.throws(() => compare.compareRuns([]), /at least one/);
});

test('TC-FBM-010: a campaign folder selects only saved run directories and the output stays under tmp', () => {
    const f = fixture();
    try {
        fs.mkdirSync(path.join(f.root, 'campaign', 'run-a'), { recursive: true });
        fs.writeFileSync(path.join(f.root, 'campaign', 'run-a', 'result.json'), '{}');
        fs.mkdirSync(path.join(f.root, 'campaign', 'run-unsaved'));
        fs.mkdirSync(path.join(f.root, 'campaign', 'notes'));
        assert.deepEqual(cli.campaignRuns(path.join(f.root, 'campaign')), [path.join(f.root, 'campaign', 'run-a')]);
        assert.throws(() => cli.campaignRuns(path.join(f.root, 'campaign', 'notes')), /No saved run/);
        assert.throws(() => cli.outputDirectory(f.root, 'outside'), /tmp\/ or temp\//);
    } finally { f.cleanup(); }
});

test('TC-FBM-074: Claude usage counts every model and subagent, falls back to the main session only when per-model usage is absent', () => {
    // Observed live: a framework solver with 7 subagents reported 18,989 output tokens in `usage` but 223,581 across modelUsage.
    const result = { usage: { input_tokens: 44, output_tokens: 18989, cache_read_input_tokens: 5676991, cache_creation_input_tokens: 42322 },
        modelUsage: { 'main-model': { inputTokens: 200, outputTokens: 150000, cacheReadInputTokens: 15000000, cacheCreationInputTokens: 800000 },
            'helper-model': { inputTokens: 112, outputTokens: 73581, cacheReadInputTokens: 6324766, cacheCreationInputTokens: 243210 } } };
    assert.deepEqual(session.claudeUsage(result), { inputTokens: 312, outputTokens: 223581, cacheReadTokens: 21324766, cacheWriteTokens: 1043210, scope: 'all models and subagents' });
    const mainOnly = session.claudeUsage({ usage: result.usage });
    assert.equal(mainOnly.outputTokens, 18989); assert.match(mainOnly.scope, /main session only/);
    assert.deepEqual(session.claudeUsage({}), { inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, scope: null }, 'missing usage stays unknown, never zero');
    // A model row without a token field contributes nothing rather than a fabricated zero.
    assert.equal(session.claudeUsage({ modelUsage: { m: { costUSD: 1 } }, usage: result.usage }).outputTokens, 18989);
});

test('TC-FBM-010: a paired quality interval over tasks and a single-skill versus workflow breakdown accompany the verdict', () => {
    // Paired differences per task (one cluster each): deltas 25, 50, 0 give mean 25, sd 25, t(2) = 4.303.
    const interval = compare.pairedInterval([25, 50, 0]);
    assert.equal(interval.tasks, 3); assert.equal(interval.mean, 25);
    assert(Math.abs(interval.low - (25 - 4.303 * 25 / Math.sqrt(3))) < 1e-9 && Math.abs(interval.high - (25 + 4.303 * 25 / Math.sqrt(3))) < 1e-9);
    assert.equal(compare.pairedInterval([10]), null, 'one task has no interval');
    assert.equal(compare.treatmentKind({ projectMode: 'brownfield-bootstrap', expectedSkills: ['feature-implement'] }), 'skill');
    assert.equal(compare.treatmentKind({ projectMode: 'brownfield-configured', expectedSkills: ['workflow-feature', 'plan'] }), 'workflow');
    assert.equal(compare.treatmentKind({ projectMode: 'greenfield', expectedSkills: [] }), 'workflow', 'greenfield always starts its workflow');
    const runs = [
        savedRun('skill-a', { projectMode: 'brownfield-bootstrap', expectedSkills: ['feature-implement'], score: [2, 4] }),
        savedRun('skill-b', { projectMode: 'brownfield-bootstrap', expectedSkills: ['plan'], score: [3, 3] }),
        savedRun('flow-a', { projectMode: 'brownfield-configured', expectedSkills: ['workflow-refactor'], score: [4, 2] })
    ];
    const group = compare.compareRuns(runs).groups[0];
    assert.deepEqual(Object.keys(group.byTreatment).sort(), ['skill', 'workflow']);
    assert.equal(group.byTreatment.skill.tasks, 2); assert.equal(group.byTreatment.skill.quality.frameworkWins, 1); assert.equal(group.byTreatment.skill.quality.ties, 1);
    assert.equal(group.byTreatment.workflow.tasks, 1); assert.equal(group.byTreatment.workflow.quality.rawWins, 1);
    assert.equal(group.byTreatment.skill.byTreatment, undefined, 'the breakdown is one level deep');
    const markdown = compare.comparisonMarkdown(compare.compareRuns(runs));
    assert.match(markdown, /95% interval/); assert.match(markdown, /includes no difference/); assert.match(markdown, /\| single skill \| 2 \|/);
});
