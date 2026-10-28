'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const files = require('../../skills/framework-benchmark/lib/files.cjs');
const contract = require('../../skills/framework-benchmark/lib/contract.cjs');
const experiment = require('../../skills/framework-benchmark/lib/experiment.cjs');
const evaluation = require('../../skills/framework-benchmark/lib/evaluation.cjs');
const controls = require('../../skills/framework-benchmark/lib/controls.cjs');
const journey = require('../../skills/framework-benchmark/lib/journey.cjs');
const report = require('../../skills/framework-benchmark/lib/report.cjs');
const cli = require('../../skills/framework-benchmark/scripts/benchmark.cjs');

const scratch = path.resolve(__dirname, '../../..', 'tmp', 'tests');
const row = (name, body) => ({ path: name, data: Buffer.from(body), executable: false });
// This is shipped framework guidance, never a consumer's config, docs, account or Git state.
const protocolOwner = fs.readFileSync(path.resolve(__dirname, '../../skills/shared/sync-inline-versions.md'), 'utf8');
const protocols = evaluation.reviewProtocols(protocolOwner);
const finding = (severity = 'high', consequence = 'A reachable supported input violates the candidate contract') => ({ severity, evidence: 'app.cjs:1 inspected candidate cause', consequence });
const decision = (findingIndex, verdict, finalFindingIndex = null) => ({ findingIndex, verdict, finalFindingIndex, reason: 'app.cjs:1 independently inspected the claimed cause and caller' });
function review(findings = [], decisions = [], empty = false) {
    return { scores: Object.fromEntries(contract.DIMENSIONS.map(name => [name, { score: empty ? 0 : 3, evidence: empty ? 'EMPTY:1 no application work' : 'app.cjs:1 inspected application behavior' }])), findings, decisions };
}

function fixture(kind = 'feature', empty = false) {
    fs.mkdirSync(scratch, { recursive: true });
    const root = fs.mkdtempSync(path.join(scratch, 'benchmark-evaluation-'));
    const write = (name, value) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); return file; };
    const frameworkRoot = path.join(root, 'framework');
    write('framework/.claude/settings.json', { hooks: {} });
    write('framework/.claude/.ck.json', {});
    write('framework/.claude/CLAUDE.md', 'Installation root instructions must not reach assessment');
    write('framework/.claude/rules/local.md', 'Installation rules must not reach assessment');
    write('framework/.claude/config/local.json', { consumerSetting: true });
    write('framework/.claude/hooks/sentinel.cjs', 'throw new Error("Never enable installation hooks in assessment")');
    for (const role of ['architect', 'code-reviewer']) write(`framework/.claude/agents/${role}.md`, `Synthetic complete ${role} leaf definition\n`);
    for (const skill of ['code-quality-review', 'integration-test', 'why-review', 'feature-implement', 'project-init']) write(`framework/.claude/skills/${skill}/SKILL.md`, `Synthetic complete ${skill} protocol\n`);
    write('framework/.claude/skills/shared/sync-inline-versions.md', protocols + '\n## Reference Docs (READ before reviewing)\n');
    write('case/fixture/app.cjs', 'module.exports = value => value;\n');
    write('case/checks/acceptance.cjs', 'Synthetic private acceptance verifier');
    write('case/checks/regression.cjs', 'Synthetic private regression verifier');
    fs.mkdirSync(path.join(root, 'output'));
    const runtime = { schemaVersion: 1, backend: 'host', host: 'claude', cliVersion: 'synthetic-native-version', model: 'synthetic-solver-revision', judgeModel: 'synthetic-assessor-revision', repeats: 1, seed: 42, timeoutMs: 1000, maxTurns: 10 };
    const spec = { schemaVersion: 1, id: 'synthetic-equipped-task', kind, projectMode: 'brownfield-bootstrap', fixture: 'fixture', checksDir: 'checks', prompt: `Deliver the requested ${kind} artifact with factual evidence and preservation.`, treatment: 'Use feature-implement.', expectedSkills: ['feature-implement'], checks: [
        { id: 'acceptance', kind: 'acceptance', baseline: 'fail', argv: ['node', '/checks/acceptance.cjs'], timeoutMs: 1000 },
        { id: 'regression', kind: 'regression', baseline: 'pass', argv: ['node', '/checks/regression.cjs'], timeoutMs: 1000 }
    ] };
    const policy = contract.defaultAssessmentPolicy(kind);
    const candidate = empty ? [] : [row('app.cjs', 'module.exports = value => value;\n')];
    let assessmentNumber = 0;
    const prepare = (caseChanges = {}, runtimeChanges = {}, sourceOptions = {}) => {
        const caseFile = write('case/case.json', { ...spec, ...caseChanges });
        const runtimeFile = write('runtime.json', { ...runtime, ...runtimeChanges });
        return experiment.prepare({ caseFile, runtimeFile, frameworkRoot, outputRoot: path.join(root, 'output'), ...sourceOptions });
    };
    const assess = (transport, changes = {}) => evaluation.assess({ root, artifactDir: `assess-${++assessmentNumber}`, spec, runtime, candidate,
        frozenToolkit: evaluation.toolkit(frameworkRoot, policy, spec), checks: [{ id: 'acceptance', kind: 'acceptance', passed: true }], policy, sessions: new Set(), ...changes }, transport);
    return { root, write, frameworkRoot, runtime, spec, policy, candidate, prepare, assess, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

// The only mocked boundary is model transport. checkedCall, validation, retention and integrity are real.
function driver(stages = [], options = {}) {
    const calls = [];
    return { calls, async preflight() { return { authentication: 'synthetic only; no account accessed' }; }, async execute(runtime, job) {
        const index = calls.length;
        const input = files.inventory(job.workspace);
        const previousFile = path.join(job.workspace, 'tmp/benchmark-evaluation/previous-assessment.json');
        calls.push({ job, input, previous: fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null });
        const stage = stages[index] || {};
        if (stage.error) throw new Error(stage.error);
        if (stage.mutate) stage.mutate(job.workspace);
        const required = index ? ['why-review'] : options.skills || ['code-quality-review', 'integration-test'];
        return { exitCode: 0, stdout: '', stderr: '', failure: null, cleanup: { worktreeRemoved: true }, collection: { savedBeforeCleanup: true }, packet: {
            ok: true, requestId: job.sessionId, sessionId: `observed-${job.sessionId}`, host: runtime.host, hostVersion: runtime.cliVersion, rootModel: runtime.judgeModel,
            candidateIntact: true, treatmentIntact: true, selectedSkills: required, readReceipts: (job.requiredReads || []).map(file => ({ path: file, source: 'synthetic successful complete native read' })),
            measurements: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 5, costUsd: null },
            review: stage.review || review(), ...stage.packet
        } };
    } };
}

// TestSpec: TC-FBM-008
test('TC-FBM-008: new preparations freeze capable kind-specific assessors while saved absent policy remains legacy', () => {
    assert.deepEqual(contract.assessmentPolicy({ kind: 'feature' }), { profile: 'legacy' });
    for (const kind of ['feature', 'plan', 'decision', 'review']) {
        const f = fixture(kind);
        try {
            const prepared = f.prepare(), state = experiment.load(prepared.root).state;
            assert.deepEqual(state.case.assessment, f.policy);
            assert(!Object.hasOwn(f.spec, 'assessment'), 'Preparation must not mutate the supplied declaration');
            assert.equal(state.case.kind, kind);
            const toolkit = files.inventory(path.join(prepared.root, 'evaluator'));
            assert.equal(prepared.identity.evaluatorHash, files.fingerprint(toolkit));
            for (const name of ['.claude/settings.json', '.claude/.ck.json', '.claude/CLAUDE.md', '.claude/rules/local.md', '.claude/config/local.json', '.claude/hooks/sentinel.cjs']) assert(!toolkit.some(entry => entry.path === name), name);
            assert.deepEqual(files.inventory(path.join(prepared.root, 'base')).map(entry => entry.path), ['app.cjs']);
            experiment.verifyFrozen(prepared.root, state);
            fs.appendFileSync(path.join(prepared.root, 'evaluator/.claude/skills/why-review/SKILL.md'), 'changed');
            assert.throws(() => experiment.verifyFrozen(prepared.root, state), /Frozen benchmark inputs changed/);
        } finally { f.cleanup(); }
    }
});

// TestSpec: TC-FBM-008
test('TC-FBM-008: qualification rejects missing interacting evidence, duplicates, overflow and legacy grading', () => {
    const f = fixture();
    try {
        const qualification = { rationale: 'Three interacting owners with compatibility and recovery choices', areas: ['parsing', 'state', 'recovery'], decisions: ['synchronous versus queued', 'replay versus refusal'], risks: ['duplicate work', 'partial write', 'stale input', 'incorrect recovery'], evidence: ['app.cjs:1 source boundary'] };
        const qualified = { ...f.spec, qualification, assessment: f.policy };
        assert.equal(contract.validateCase(qualified), qualified);
        const upper = Object.fromEntries(['areas', 'decisions', 'risks', 'evidence'].map(key => [key, Array.from({ length: 32 }, (_, i) => `${key}-${i}`)]));
        assert.equal(contract.validateCase({ ...qualified, qualification: { ...qualification, ...upper } }).qualification.areas.length, 32);
        const prepared = f.prepare({ qualification });
        assert.deepEqual(experiment.load(prepared.root).state.case.qualification, qualification);
        assert.equal(experiment.load(f.prepare({ assessment: { ...f.policy, maxPasses: 2 } }).root).state.case.assessment.maxPasses, 2);
        for (const key of ['areas', 'decisions', 'risks', 'evidence']) {
            assert.throws(() => contract.validateCase({ ...qualified, qualification: { ...qualification, [key]: qualification[key].slice(1) } }), /qualification/);
            assert.throws(() => contract.validateCase({ ...qualified, qualification: { ...qualification, [key]: [...qualification[key], qualification[key][0]] } }), /qualification/);
            assert.throws(() => contract.validateCase({ ...qualified, qualification: { ...qualification, [key]: Array.from({ length: 33 }, (_, i) => `${key}-${i}`) } }), /qualification/);
        }
        assert.throws(() => contract.validateCase({ ...qualified, qualification: { ...qualification, rationale: '' } }), /rationale/);
        assert.throws(() => contract.validateCase({ ...qualified, qualification: { ...qualification, unexpected: true } }), /Invalid complexity qualification/);
        assert.throws(() => contract.validateCase({ ...qualified, assessment: { profile: 'legacy' } }), /require skilled/);
        for (const maxPasses of [1, 4, 2.5, null]) assert.throws(() => f.prepare({ assessment: { ...f.policy, maxPasses } }), /maxPasses/);
        for (const skills of [[], ['why-review', 'why-review'], ['../outside'], Array.from({ length: 9 }, (_, i) => `skill-${i}`)]) assert.throws(() => f.prepare({ assessment: { ...f.policy, skills } }), /skills/);
        const eightSkills = Array.from({ length: 8 }, (_, i) => `skill-${i}`);
        assert.equal(contract.validateCase({ ...qualified, assessment: { ...f.policy, skills: eightSkills } }).assessment.skills.length, 8);
        assert.throws(() => contract.validateCase({ ...qualified, assessment: { ...f.policy, skills: [...eightSkills, 'skill-8'] } }), /Invalid assessment skills/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-006
test('TC-FBM-006: library preparation rejects conflicting committed and template sources before reading either', () => {
    const f = fixture();
    try {
        assert.throws(() => f.prepare({}, {}, { projectRoot: path.join(f.root, 'unread-project'), templateRoot: path.join(f.root, 'unread-template') }), /Choose a committed project or a prepared template, not both/);
        assert.deepEqual(fs.readdirSync(path.join(f.root, 'output')), [], 'Invalid source selection creates no experiment');
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: every new assessment requires role, skills and all eleven frozen reviewer protocols before inference', () => {
    for (const missing of ['.claude/agents/code-reviewer.md', '.claude/skills/code-quality-review/SKILL.md', '.claude/skills/integration-test/SKILL.md', '.claude/skills/why-review/SKILL.md', '.claude/skills/shared/sync-inline-versions.md']) {
        const f = fixture();
        try { fs.unlinkSync(path.join(f.frameworkRoot, missing)); assert.throws(f.prepare, /Missing evaluator/); }
        finally { f.cleanup(); }
    }
    const f = fixture('plan');
    try {
        fs.unlinkSync(path.join(f.frameworkRoot, '.claude/agents/architect.md'));
        assert.throws(f.prepare, /architect/);
        f.write('framework/.claude/agents/architect.md', 'Synthetic architect');
        f.write('framework/.claude/skills/shared/sync-inline-versions.md', '## Protocols (follow VERBATIM)\n### only one\n## Reference Docs (READ before reviewing)');
        assert.throws(f.prepare, /eleven/);
    } finally { f.cleanup(); }
});

test('TC-FBM-007: required role and skill loading leads the assessor prompt and closes it, ahead of the long protocol block', () => {
    const toolkit = [{ path: '.claude/skills/shared/sync-inline-versions.md', data: Buffer.from(protocolOwner) }];
    const spec = { kind: 'feature', prompt: 'Shared task brief' };
    const policy = { skills: ['code-quality-review', 'integration-test'], maxPasses: 3 };
    for (const [pass, role, skills] of [[1, 'code-reviewer', policy.skills], [2, 'code-reviewer', ['why-review']]]) {
        const text = evaluation.prompt(spec, [], policy, toolkit, pass);
        const required = text.indexOf('## Required first actions');
        // A reviewer that answers before loading is rejected; the step must be read before the protocols and the brief.
        assert(required > 0 && required < text.indexOf('Task brief:') && required < text.indexOf('## Protocols'), `pass ${pass} puts loading first`);
        const step = text.slice(required, text.indexOf('Task brief:'));
        assert(step.includes(`.claude/agents/${role}.md`) && skills.every(skill => step.includes(skill)) && step.includes('rejects'));
        assert.match(text.slice(-400), /skill load must happen before your structured answer/);
        // Reviewers that counted lines in unnumbered output cited ranges past the end of a file, voiding the pass.
        assert.match(text, /line-numbered view/); assert.match(text.slice(-400), /cite only line numbers you saw in a numbered view/);
    }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: empty discovery still gets fresh independent validation with immutable anonymous input and retained reports', async () => {
    const f = fixture(), adapter = driver([{ packet: { reviewReports: { entries: [{ path: 'review.md', base64: Buffer.from('Public cited review').toString('base64') }], deleted: [] } } }, {}]);
    try {
        const before = files.fingerprint(files.inventory(f.frameworkRoot)), candidateHash = files.fingerprint(f.candidate);
        const result = await f.assess(adapter);
        assert.equal(result.valid, true); assert.equal(result.profile, 'skilled-v1'); assert.equal(result.passes.length, 2);
        assert.deepEqual(result.findings, { confirmed: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, rejected: 0, unresolved: 0, newUnvalidatedLow: 0 });
        assert.equal(new Set(adapter.calls.map(({ job }) => job.sessionId)).size, 2);
        assert.deepEqual(adapter.calls.map(({ job }) => job.requiredReads), [['.claude/agents/code-reviewer.md'], ['.claude/agents/code-reviewer.md']]);
        assert.deepEqual(adapter.calls[1].previous, review());
        assert(adapter.calls.every(({ job }) => job.role === 'review' && job.assessment === true && job.purpose === 'outcome'));
        assert(adapter.calls.every(({ job }) => job.prompt.includes(protocols)));
        assert.match(adapter.calls[1].job.prompt, /why-review --validate-findings TERMINALLY/);
        for (const { job } of adapter.calls) {
            assert.match(job.prompt, /On Claude Code, use the native Read tool for the role file and native Skill loading/);
            assert.match(job.prompt, /Bash role reads do not supply role engagement receipts/);
            assert.match(job.prompt, /On Codex, use complete literal file reads/);
        }
        assert.match(adapter.calls[1].job.prompt, /reason STARTING with a real application relative path:line/);
        for (const { job, input } of adapter.calls) {
            assert.equal(files.fingerprint(input.filter(entry => !entry.path.startsWith('.claude/') && !entry.path.startsWith('tmp/'))), candidateHash);
            assert(!input.some(entry => /solver|journey|holdout/i.test(entry.path)));
            assert(!fs.existsSync(job.workspace));
        }
        assert.equal(fs.readFileSync(path.join(f.root, 'assess-1/quality/pass-1/reports/review.md'), 'utf8'), 'Public cited review');
        for (const pass of result.passes) {
            assert.equal(pass.valid, true);
            for (const key of ['artifact', 'observation']) assert.equal(files.sha(fs.readFileSync(path.join(f.root, pass[key].path))), pass[key].sha256);
            assert(fs.existsSync(path.join(f.root, 'assess-1/quality', `pass-${pass.pass}`, 'stage.json')));
        }
        assert.equal(files.fingerprint(files.inventory(f.frameworkRoot)), before);
        assert.equal(files.fingerprint(f.candidate), candidateHash);
        assert.equal(result.measurements.inputTokens, 20); assert.equal(result.measurements.outputTokens, 10); assert.equal(result.measurements.costUsd, null);
        assert.equal(files.sha(fs.readFileSync(path.join(f.root, result.artifact.path))), result.artifact.sha256);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: the paired controller routes both anonymous arms through the same equipped assessor and separate public observers', async () => {
    const f = fixture(), calls = [], assessors = new Map();
    const identity = (runtime, job) => ({ ok: true, requestId: job.sessionId, sessionId: `observed-${job.sessionId}`, host: runtime.host, hostVersion: runtime.cliVersion, rootModel: job.role === 'solve' ? runtime.model : runtime.judgeModel });
    const adapter = { async preflight() { return { authentication: 'synthetic transport only' }; }, async execute(runtime, job) {
        calls.push(job);
        if (job.assessment) {
            const key = path.dirname(path.dirname(job.workspace));
            if (!assessors.has(key)) assessors.set(key, driver());
            return assessors.get(key).execute(runtime, job);
        }
        if (job.role === 'check') {
            const implemented = fs.readFileSync(path.join(job.workspace, 'app.cjs'), 'utf8').includes('implemented');
            return { exitCode: job.argv[1].includes('acceptance') && !implemented ? 1 : 0, stdout: '', stderr: '', failure: null };
        }
        if (job.role === 'solve') return { exitCode: 0, stdout: '', stderr: '', packet: { ...identity(runtime, job), treatmentIntact: true,
            selectedSkills: job.arm === 'framework' ? ['project-init', 'feature-implement'] : [], discoveredSkills: [],
            delta: { entries: [{ path: 'app.cjs', base64: Buffer.from('module.exports = "implemented";\n').toString('base64') }], deleted: [] },
            setupDelta: { entries: [{ path: 'docs/project-config.json', base64: Buffer.from(JSON.stringify({ project: { name: 'Synthetic fixture' } })).toString('base64') }, { path: 'docs/project-reference/rules.md', base64: Buffer.from('Synthetic source-derived rules').toString('base64') }], deleted: [] } } };
        const cite = 'manifest.json:1 inspected public trace coverage';
        return { exitCode: 0, stdout: '', stderr: '', packet: { ...identity(runtime, job), candidateIntact: true,
            review: { story: [{ phase: 'Synthetic observation', account: 'Fixture public evidence only', evidence: [cite] }], aspects: Object.fromEntries(journey.ASPECTS.map(name => [name, { summary: 'Unavailable activity remains unknown', evidence: [cite], basis: 'unknown' }])), limitations: ['No live model behavior is inferred'] } } };
    } };
    try {
        const prepared = f.prepare(), state = await experiment.run(prepared.root, { transport: adapter });
        assert.equal(state.phase, 'complete'); assert.equal(state.pairs.length, 1); assert.equal(state.pairs[0].valid, true);
        for (const name of ['raw', 'framework']) {
            const arm = state.pairs[0][name];
            assert.equal(arm.success, true); assert.equal(arm.review.valid, true); assert.equal(arm.review.passes.length, 2);
            assert.equal(arm.journey.observer.valid, true); assert.equal(arm.review.findings.confirmed, 0);
        }
        const qualityCalls = calls.filter(job => job.assessment);
        assert.equal(qualityCalls.length, 4); assert.equal(assessors.size, 2);
        assert.equal(new Set(calls.filter(job => job.role !== 'check').map(job => job.sessionId)).size, 8);
        assert(qualityCalls.every(job => !job.prompt.includes('Synthetic observation') && job.requiredReads.includes('.claude/agents/code-reviewer.md')));
        const summary = report.summarize(state);
        assert.equal(summary.successDelta, 0); assert.equal(summary.qualityDelta, 0);
        assert.equal(summary.campaign.review.stageAttempts, 4); assert.equal(summary.campaign.review.observedSessions, 4);
        assert.equal(summary.assessment.evaluatorHash, prepared.identity.evaluatorHash);
        const rendered = fs.readFileSync(path.join(prepared.root, 'report.md'), 'utf8');
        assert.match(rendered, /Skilled outcome assessment/); assert.match(rendered, /Independently confirmed causes/);
        assert.equal(experiment.load(prepared.root).state.phase, 'complete');
        experiment.verifyFrozen(prepared.root, state);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-008
test('TC-FBM-008: plan, decision and review evidence use their matching meaning without demanding executable feature delivery', async () => {
    for (const kind of ['plan', 'decision', 'review']) {
        const f = fixture(kind), adapter = driver([], { skills: ['why-review'] });
        try {
            const result = await f.assess(adapter);
            assert.equal(result.valid, true);
            const prompt = adapter.calls[0].job.prompt;
            assert(prompt.includes(evaluation.GUIDANCE[kind]));
            assert.equal(adapter.calls[0].job.requiredReads[0], `.claude/agents/${kind === 'review' ? 'code-reviewer' : 'architect'}.md`);
            assert(prompt.includes(kind === 'review' ? 'false positives' : kind === 'decision' ? 'do not require one preferred architecture' : 'without requiring code implementation'));
        } finally { f.cleanup(); }
    }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: confirmed duplicate manifestations count one cause and rejected false positives remain in pass history', async () => {
    const f = fixture();
    const discovered = review([finding(), finding('high', 'Second manifestation of the same cause'), finding('medium', 'Plausible but unsupported alarm')]);
    const validated = review([finding()], [decision(0, 'confirmed', 0), decision(1, 'confirmed', 0), decision(2, 'rejected')]);
    const adapter = driver([{ review: discovered }, { review: validated }]);
    try {
        const result = await f.assess(adapter);
        assert.equal(result.valid, true); assert.equal(result.passes.length, 2);
        assert.equal(result.findings.confirmed, 1); assert.equal(result.findings.bySeverity.high, 1); assert.equal(result.findings.rejected, 1);
        assert.deepEqual(adapter.calls[1].previous, discovered);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, result.passes[1].artifact.path), 'utf8')), validated);
        assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, result.passes[0].artifact.path), 'utf8')).findings.length, 3);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: every earlier claim has one disposition and every confirmed cause has retained final evidence', async () => {
    const f = fixture();
    try {
        const previous = review([finding(), finding('medium')]);
        const malformed = [
            review([finding()], [decision(0, 'confirmed', 0)]),
            review([finding()], [decision(0, 'confirmed', 0), decision(0, 'rejected')]),
            review([finding()], [decision(0, 'confirmed', 1), decision(1, 'rejected')]),
            review([finding()], [decision(0, 'rejected', 0), decision(1, 'rejected')]),
            review([finding()], [decision(0, 'confirmed', 0), { ...decision(1, 'rejected'), reason: '' }])
        ];
        for (const bad of malformed) {
            const adapter = driver([{ review: previous }, { review: bad }]);
            const result = await f.assess(adapter);
            assert.equal(result.valid, false); assert.equal(adapter.calls.length, 2);
            assert.equal(result.passes[0].valid, true); assert.equal(result.passes[1].valid, false);
            assert(result.error); assert(!result.artifact);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: every decision verdict requires actual candidate evidence before its claim disposition is admitted', async () => {
    const f = fixture();
    try {
        for (const verdict of ['confirmed', 'rejected', 'unresolved']) {
            for (const reason of ['missing.cjs:1 invented', 'app.cjs:99 outside the artifact', '.claude/agents/code-reviewer.md:1 toolkit is not candidate evidence', '../app.cjs:1 escaping', 'Uncited rationale']) {
                const findings = verdict === 'confirmed' ? [finding()] : [];
                const disposition = { ...decision(0, verdict, verdict === 'confirmed' ? 0 : null), reason };
                const adapter = driver([{ review: review([finding()]) }, { review: review(findings, [disposition]) }]);
                const result = await f.assess(adapter);
                assert.equal(adapter.calls.length, 2);
                assert.equal(result.valid, false, `${verdict}: ${reason}`);
                assert.equal(result.passes[0].valid, true);
                assert.equal(result.passes[1].valid, false, 'Evidence fails admission before unresolved/cap handling');
                assert.match(result.error, /missing artifact\/line/);
                assert(!result.artifact);
            }
            const findings = verdict === 'confirmed' ? [finding('low')] : [];
            const result = await f.assess(driver([{ review: review([finding('low')]) }, { review: review(findings, [decision(0, verdict, verdict === 'confirmed' ? 0 : null)]) }]));
            assert.equal(result.valid, true, `Real evidence preserves the supported ${verdict} decision`);
            assert.equal(result.findings.confirmed, verdict === 'confirmed' ? 1 : 0);
            assert.equal(result.findings.rejected, verdict === 'rejected' ? 1 : 0);
            assert.equal(result.findings.unresolved, verdict === 'unresolved' ? 1 : 0);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: only a new consequential claim earns a third fresh pass and at-cap allegations remain ungraded', async () => {
    const f = fixture();
    try {
        const introduced = review([finding('medium')]);
        const adapter = driver([{ review: review() }, { review: introduced }, { review: review([finding('medium')], [decision(0, 'confirmed', 0)]) }]);
        const result = await f.assess(adapter);
        assert.equal(result.valid, true); assert.equal(result.passes.length, 3); assert.equal(result.findings.confirmed, 1);
        assert.equal(new Set(result.passes.map(pass => pass.sessionId)).size, 3);
        const capped = await f.assess(driver([{ review: review() }, { review: introduced }]), { policy: { ...f.policy, maxPasses: 2 } });
        assert.equal(capped.valid, false); assert.match(capped.error, /cap/);
        const thirdNew = await f.assess(driver([{ review: review() }, { review: introduced }, { review: review([finding('medium'), finding('high')], [decision(0, 'confirmed', 0)]) }]));
        assert.equal(thirdNew.valid, false); assert.equal(thirdNew.passes.length, 3); assert.match(thirdNew.error, /cap/);
        const unresolved = await f.assess(driver([{ review: review([finding()]) }, { review: review([], [decision(0, 'unresolved')]) }]));
        assert.equal(unresolved.valid, false); assert.equal(unresolved.passes.length, 2); assert.match(unresolved.error, /unresolved/);
        const low = await f.assess(driver([{ review: review() }, { review: review([finding('low')]) }]));
        assert.equal(low.valid, true); assert.equal(low.passes.length, 2); assert.equal(low.findings.confirmed, 0); assert.equal(low.findings.newUnvalidatedLow, 1);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: missing role or skill proof, reused identity, wrong model and integrity failures never receive scores', async () => {
    const f = fixture();
    try {
        for (const packet of [{ selectedSkills: [] }, { readReceipts: [] }, { requestId: 'wrong' }, { rootModel: 'wrong' }, { rootModel: null }, { sessionId: '' }, { sessionId: 'solver-session' }, { host: 'codex' }, { hostVersion: 'wrong' }, { candidateIntact: false }, { treatmentIntact: false }, { ok: false }]) {
            const adapter = driver([{ packet }]), result = await f.assess(adapter, { sessions: new Set(['solver-session']) });
            assert.equal(result.valid, false); assert.equal(adapter.calls.length, 1); assert(!result.scores);
            assert.equal(result.passes[0].valid, false); assert(result.passes[0].observation);
        }
        const repeated = await f.assess(driver([{ packet: { sessionId: 'same' } }, { packet: { sessionId: 'same' } }]));
        assert.equal(repeated.valid, false); assert.equal(repeated.passes.length, 2); assert.match(repeated.error, /freshness/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: every criterion and finding cites retained application lines rather than toolkit or invented evidence', async () => {
    const f = fixture();
    try {
        for (const cite of ['missing.cjs:1 invented', 'app.cjs:99 beyond retained bytes', '.claude/agents/code-reviewer.md:1 guidance is not application', '../app.cjs:1 escaping']) {
            const bad = review(); bad.scores.correctness.evidence = cite;
            const result = await f.assess(driver([{ review: bad }]));
            assert.equal(result.valid, false); assert.match(result.error, /missing artifact\/line/);
        }
        const badFinding = review([{ ...finding(), evidence: 'missing.cjs:1 invented' }]);
        assert.equal((await f.assess(driver([{ review: badFinding }]))).valid, false);
        for (const dimension of contract.DIMENSIONS) {
            const bad = review(); delete bad.scores[dimension];
            assert.equal((await f.assess(driver([{ review: bad }]))).valid, false, dimension);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-007
test('TC-FBM-007: empty candidate evidence is valid only with zero criteria and still requires two independent passes', async () => {
    const f = fixture('feature', true);
    try {
        const result = await f.assess(driver([{ review: review([], [], true) }, { review: review([], [], true) }]));
        assert.equal(result.valid, true); assert.equal(result.passes.length, 2);
        assert(Object.values(result.scores).every(value => value.score === 0));
        const bad = review([], [], true); bad.scores.correctness.score = 1;
        const unsupported = await f.assess(driver([{ review: bad }]));
        assert.equal(unsupported.valid, false); assert.match(unsupported.error, /missing artifact\/line/);
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: candidate or toolkit changes and oversized public reports preserve observations but invalidate assessment', async () => {
    const f = fixture();
    try {
        for (const target of ['app.cjs', '.claude/agents/code-reviewer.md']) {
            const result = await f.assess(driver([{ mutate: workspace => fs.appendFileSync(path.join(workspace, target), '\nchanged') }]));
            assert.equal(result.valid, false); assert.match(result.error, /modified retained input/);
            assert(result.passes[0].observation);
        }
        for (const entries of [
            [{ path: 'oversized.md', base64: Buffer.alloc(1024 * 1024 + 1, 'x').toString('base64') }],
            Array.from({ length: 65 }, (_, i) => ({ path: `report-${i}.md`, base64: Buffer.from('report').toString('base64') })),
            Array.from({ length: 3 }, (_, i) => ({ path: `report-${i}.md`, base64: Buffer.alloc(800000, 'x').toString('base64') }))
        ]) {
            const result = await f.assess(driver([{ packet: { reviewReports: { entries, deleted: [] } } }]));
            assert.equal(result.valid, false); assert.match(result.error, /retention bounds/);
            assert(result.passes[0].observation); assert(!result.artifact);
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-085
test('TC-FBM-085: bounded fifty-claim state keeps full external evidence and unknown usage in any stage poisons only its aggregate', async () => {
    const f = fixture();
    try {
        const findings = Array.from({ length: 50 }, (_, i) => finding(i % 2 ? 'medium' : 'high', `Distinct independently inspected cause ${i}`));
        const decisions = findings.map((_, i) => decision(i, 'confirmed', i));
        const adapter = driver([{ review: review(findings) }, { review: review(findings, decisions), packet: { measurements: { inputTokens: 0, outputTokens: 0, costUsd: null } } }]);
        const result = await f.assess(adapter);
        assert.equal(result.valid, true); assert.equal(result.findings.confirmed, 50);
        assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, result.artifact.path), 'utf8')).findings.length, 50);
        assert.equal(result.measurements.inputTokens, 10); assert.equal(result.measurements.outputTokens, 5);
        assert.equal(result.measurements.cacheReadTokens, null); assert.equal(result.measurements.cacheWriteTokens, null); assert.equal(result.measurements.costUsd, null);
        assert(!JSON.stringify(result).includes('Distinct independently inspected cause'));
        assert(Buffer.byteLength(JSON.stringify(result)) < 16000, 'Detailed claims belong to hashed external artifacts, not repeated saved state');
        const excessive = await f.assess(driver([{ review: review([...findings, finding()]) }]));
        assert.equal(excessive.valid, false);
        const failed = await f.assess(driver([{}, { error: 'Synthetic assessor unavailable after discovery' }]));
        assert.equal(failed.valid, false); assert.equal(failed.passes.length, 2);
        assert.equal(failed.measurements.inputTokens, null); assert.equal(failed.measurements.outputTokens, null);
        assert.equal(failed.passes[0].measurements.inputTokens, 10); assert.match(failed.passes[1].error, /unavailable/);
        assert(fs.existsSync(path.join(f.root, 'assess-3/quality/pass-2/stage.json')));
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-009
test('TC-FBM-009: healthy and defective controls use the actual frozen assessor without expected labels or solver calls', async () => {
    const f = fixture();
    try {
        const prepared = f.prepare(), before = fs.readFileSync(path.join(prepared.root, 'result.json'));
        for (const defective of [false, true]) {
            const candidateRoot = path.join(f.root, defective ? 'known-defective' : 'known-healthy');
            fs.mkdirSync(candidateRoot); fs.writeFileSync(path.join(candidateRoot, 'app.cjs'), defective ? 'module.exports = value => null;\n' : 'module.exports = value => value;\n');
            const stages = defective ? [{ review: review([finding()]) }, { review: review([finding()], [decision(0, 'confirmed', 0)]) }] : [{ review: review([finding('medium', 'Plausible false positive')]) }, { review: review([], [decision(0, 'rejected')]) }];
            const adapter = driver(stages);
            const observed = await controls.assessControl({ runRoot: prepared.root, candidateRoot, outputRoot: path.join(f.root, 'output') }, { transport: adapter });
            assert.equal(observed.result.phase, 'complete'); assert.equal(observed.result.expectedVerdictSupplied, false);
            assert.equal(observed.result.assessment.findings.confirmed, defective ? 1 : 0);
            assert.equal(observed.result.assessment.findings.rejected, defective ? 0 : 1);
            assert.equal(observed.result.candidateHash, files.fingerprint(files.inventory(candidateRoot)));
            assert(adapter.calls.every(({ job }) => job.role === 'review' && !job.prompt.includes('known-defective') && !job.prompt.includes('known-healthy')));
            assert(adapter.calls.every(({ input }) => !input.some(entry => /result\.json|journey|check/i.test(entry.path) && !entry.path.startsWith('.claude/'))));
            assert.deepEqual(JSON.parse(fs.readFileSync(path.join(observed.root, 'result.json'), 'utf8')), observed.result);
            assert.deepEqual(fs.readFileSync(path.join(prepared.root, 'result.json')), before);
            assert(!fs.existsSync(path.join(prepared.root, 'attempt.lock')));
        }
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-009
test('TC-FBM-009: controls refuse attempted, changed and legacy instruments before inference and retain assessor failure separately', async () => {
    const f = fixture();
    try {
        const candidateRoot = path.join(f.root, 'candidate'); fs.mkdirSync(candidateRoot); fs.writeFileSync(path.join(candidateRoot, 'app.cjs'), 'module.exports = 1;\n');
        const prepared = f.prepare(), adapter = driver();
        const invoke = runRoot => controls.assessControl({ runRoot, candidateRoot, outputRoot: path.join(f.root, 'output') }, { transport: adapter });
        fs.writeFileSync(path.join(prepared.root, 'attempt.lock'), 'owned attempted run');
        await assert.rejects(() => invoke(prepared.root), /before attempting/); assert.equal(adapter.calls.length, 0);
        const changed = f.prepare(); fs.appendFileSync(path.join(changed.root, 'evaluator/.claude/skills/why-review/SKILL.md'), 'changed');
        await assert.rejects(() => invoke(changed.root), /Frozen benchmark inputs changed/); assert.equal(adapter.calls.length, 0);
        const legacy = f.prepare({ assessment: { profile: 'legacy' } });
        await assert.rejects(() => invoke(legacy.root), /native skilled/); assert.equal(adapter.calls.length, 0);
        const available = f.prepare(), outage = driver([{ error: 'Synthetic unavailable control assessor' }]);
        const result = await controls.assessControl({ runRoot: available.root, candidateRoot, outputRoot: path.join(f.root, 'output') }, { transport: outage });
        assert.equal(result.result.phase, 'inconclusive'); assert.equal(result.result.assessment.valid, false);
        assert.match(result.result.assessment.error, /unavailable/); assert.equal(result.result.assessment.measurements.inputTokens, null);
        assert.equal(experiment.load(available.root).state.phase, 'prepared');
    } finally { f.cleanup(); }
});

// TestSpec: TC-FBM-009
test('TC-FBM-009: public control CLI accepts only anonymous candidate input and rejects expected-verdict or solver controls', async () => {
    assert.deepEqual(cli.parseArgs(['assess-control', '--run', 'prepared', '--candidate', 'anonymous', '--out', 'tmp/control-output']), { command: 'assess-control', run: 'prepared', candidate: 'anonymous', out: 'tmp/control-output' });
    for (const argv of [['assess-control'], ['assess-control', '--run', 'prepared'], ['assess-control', '--run', 'prepared', '--candidate', 'a', '--candidate', 'b'],
        ['assess-control', '--run', 'prepared', '--candidate', 'a', '--expected', 'defective'], ['assess-control', '--run', 'prepared', '--candidate', 'a', '--model', 'solver']]) assert.throws(() => cli.parseArgs(argv));
    const f = fixture();
    try {
        const legacy = f.prepare({ assessment: { profile: 'legacy' } });
        await assert.rejects(() => cli.main(['assess-control', '--run', legacy.root, '--candidate', 'unused', '--out', 'tmp/controls'], { cwd: f.root, log() {} }), /native skilled/);
        assert.equal(experiment.load(legacy.root).state.phase, 'prepared'); assert(!fs.existsSync(path.join(legacy.root, 'attempt.lock')));
        assert.throws(() => cli.outputDirectory(f.root, '../outside'), /under the current project/);
    } finally { f.cleanup(); }
});
