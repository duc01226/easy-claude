import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// here = <repo>/.claude/scripts/codex/tests → four levels up is the repo root.
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const SCRIPT = path.join(repoRoot, '.claude', 'skills', 'tech-spec', 'scripts', 'generate-tech-specs.mjs');

// Must match DERIVED_BANNER in generate-tech-specs.mjs — a mismatch would make every
// fixture look "non-derived" and the happy-path test would fail loudly rather than
// silently pass, which is the intent.
const DERIVED_BANNER = '> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit.';

const ANNOTATION_PATTERN = '\\[Trait\\("((?:TestSpec)|(?:TechnicalSpec))"\\s*,\\s*"([^"]+)"\\)\\]';

const ANNOTATED_SOURCE = `
public class OrderTests
{
    [Trait("TechnicalSpec", "TS-ORDER-001")]
    public async Task Should_Persist_Order()
    {
    }
}
`;

const OPERATION_SOURCE = `
public class OperationKindsTests
{
    [Trait("TechnicalSpec", "TS-OP-001")]
    public Task HandlesEvent() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-002")]
    public Task PublishesMessage() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-003")]
    public Task RunsConsumer() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-004")]
    public Task WritesOutbox() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-005")]
    public Task ReadsInbox() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-006")]
    public Task UsesBus() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-006A")]
    public Task Handles_Event() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-006B")]
    public Task ConsumesMessages() => Task.CompletedTask;

    [Trait("TestSpec", "TC-OP-007")]
    public Task RecordsEditedEvenThoughTheValueMatches() => Task.CompletedTask;

    [Trait("TestSpec", "TC-OP-008")]
    public Task PreventDuplicateApproval() => Task.CompletedTask;

    [Trait("TestSpec", "TC-OP-009")]
    public Task EventualConsistencyIsNotClaimed() => Task.CompletedTask;

    [Trait("TestSpec", "TC-OP-010")]
    public Task TargetCandidate() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-011")]
    public Task ExecutesBackgroundJob() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-012")]
    public Task RebuildsReadModel() => Task.CompletedTask;

    [Trait("TechnicalSpec", "TS-OP-013")]
    public Task CreatesOrder() => Task.CompletedTask;

    [Trait("TestSpec", "TC-DUP-001")]
    public Task FirstBusinessScenario() => Task.CompletedTask;

    [Trait("TestSpec", "TC-DUP-001")]
    public Task SecondBusinessScenario() => Task.CompletedTask;
}
`;

async function makeProject({ technicalPath = 'out', sourceRoot = 'src', configPath = 'docs/project-config.json', withSource = true, source = ANNOTATED_SOURCE } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-gen-'));
    const projectConfigPath = path.join(root, ...configPath.split('/'));
    await fs.mkdir(path.dirname(projectConfigPath), { recursive: true });
    await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
            specRoots: { technical: { path: technicalPath } },
            techSpecScan: { sourceRoot, fileExtensions: ['.cs'], annotationPattern: ANNOTATION_PATTERN }
        }),
        'utf8'
    );
    if (configPath !== 'docs/project-config.json') {
        await fs.mkdir(path.join(root, '.claude'), { recursive: true });
        await fs.writeFile(
            path.join(root, '.claude', '.ck.json'),
            JSON.stringify({ portability: { projectConfigPath: configPath } }),
            'utf8'
        );
    }
    if (withSource) {
        await fs.mkdir(path.join(root, sourceRoot, 'Services', 'Orders'), { recursive: true });
        await fs.writeFile(path.join(root, sourceRoot, 'Services', 'Orders', 'OrderTests.cs'), source, 'utf8');
    } else {
        await fs.mkdir(path.join(root, sourceRoot), { recursive: true });
    }
    return root;
}

function runGenerator(cwd, args = []) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

async function listFiles(dir) {
    const out = [];
    async function walk(p) {
        let items;
        try {
            items = await fs.readdir(p, { withFileTypes: true });
        } catch {
            return;
        }
        for (const item of items) {
            const full = path.join(p, item.name);
            if (item.isDirectory()) await walk(full);
            else out.push(path.relative(dir, full).split(path.sep).join('/'));
        }
    }
    await walk(dir);
    return out.sort();
}

async function readMarkdownMap(dir) {
    const files = await listFiles(dir);
    return new Map(await Promise.all(files.filter(file => file.endsWith('.md')).map(async file => [file, await fs.readFile(path.join(dir, file), 'utf8')])));
}

async function generatedMarkdownPath(root) {
    const outputRoot = path.join(root, 'out');
    const files = (await listFiles(outputRoot)).filter(file => file.endsWith('.md'));
    assert.equal(files.length, 1, `fixture must generate exactly one Markdown file, got: ${files.join(', ')}`);
    return path.join(outputRoot, files[0]);
}

function parseResultJson(result) {
    const output = result.status === 0 ? result.stdout : result.stderr;
    const start = output.indexOf('{');
    assert.notEqual(start, -1, `expected structured JSON output, got: ${output}`);
    return JSON.parse(output.slice(start));
}

function operationKindFor(markdown, methodName) {
    const escaped = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = markdown.match(new RegExp('^\\| ([^|]+?) \\| `OperationKindsTests\\.' + escaped + '` \\|', 'm'));
    assert.ok(match, `operation row for ${methodName} must exist`);
    return match[1].trim();
}

// THE regression test for the data-loss defect. The original removeGeneratedMarkdown
// validated and deleted in ONE loop, so a hand-edited file aborted the run only AFTER
// the files before it were already removed — and writeTechnicalViews never ran.
//
// Ordering matters: collectFiles does NOT sort, so traversal order is filesystem
// dependent. Names are chosen so the hand-edited file sorts LAST, and the assertion is
// on the invariant (every file survives), not on which file threw. Asserting only
// "it throws" would pass against the buggy code and fail open.
test('generate-tech-specs deletes NOTHING when any file in the technical root is non-derived (TC-TSPEC-001)', async () => {
    const root = await makeProject();
    const outDir = path.join(root, 'out');
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(path.join(outDir, 'a-derived.md'), `${DERIVED_BANNER}\n\n# A\n`, 'utf8');
    await fs.writeFile(path.join(outDir, 'b-derived.md'), `${DERIVED_BANNER}\n\n# B\n`, 'utf8');
    await fs.writeFile(path.join(outDir, 'c-derived.md'), `${DERIVED_BANNER}\n\n# C\n`, 'utf8');
    await fs.writeFile(path.join(outDir, 'zz-hand-authored.md'), '# Hand written, not derived\n', 'utf8');

    const before = await listFiles(outDir);
    assert.equal(before.length, 4, 'precondition: 4 files staged');

    const result = runGenerator(root);

    assert.notEqual(result.status, 0, 'generator must refuse to run');
    assert.match(result.stderr, /Refusing to delete anything/);
    assert.match(result.stderr, /zz-hand-authored\.md/, 'error must name the offending file');

    const after = await listFiles(outDir);
    assert.deepEqual(after, before, 'NO file may be deleted when any file is non-derived');
});

test('generate-tech-specs regenerates cleanly when every file is derived (TC-TSPEC-002)', async () => {
    const root = await makeProject();
    const outDir = path.join(root, 'out');
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'stale.md'), `${DERIVED_BANNER}\n\n# Stale\n`, 'utf8');

    const result = runGenerator(root);

    assert.equal(result.status, 0, `expected success, got stderr: ${result.stderr}`);
    const after = await listFiles(outDir);
    assert.ok(!after.includes('stale.md'), 'stale derived output must be removed');
    assert.ok(after.length > 0, 'new views must be written');

    // Output must itself carry the banner, or the NEXT run would refuse to clean it up.
    const written = await fs.readFile(path.join(outDir, after[0]), 'utf8');
    assert.ok(written.startsWith(DERIVED_BANNER), 'generated output must be re-deletable by the next run');
});

// Business Intent / Invariant Guarded: topology is projected only from exact operation words;
// ordinary words containing those character sequences must never invent cross-service evidence.
test('generate-tech-specs classifies exact operation tokens across separators and camel-case boundaries (TC-TSPEC-008)', async () => {
    const root = await makeProject({ source: OPERATION_SOURCE });

    const result = runGenerator(root);

    assert.equal(result.status, 0, result.stderr);
    const markdown = await fs.readFile(await generatedMarkdownPath(root), 'utf8');
    for (const method of ['HandlesEvent', 'PublishesMessage', 'RunsConsumer', 'WritesOutbox', 'ReadsInbox', 'UsesBus', 'Handles_Event', 'ConsumesMessages']) {
        assert.equal(operationKindFor(markdown, method), 'Event/Message', `${method} must retain event/message topology`);
    }
    for (const method of ['RecordsEditedEvenThoughTheValueMatches', 'PreventDuplicateApproval', 'EventualConsistencyIsNotClaimed', 'TargetCandidate']) {
        assert.notEqual(operationKindFor(markdown, method), 'Event/Message', `${method} must not create topology from a substring`);
    }
    assert.equal(operationKindFor(markdown, 'TargetCandidate'), 'Test/Invariant', 'target must not contain the get operation token');
    assert.equal(operationKindFor(markdown, 'ExecutesBackgroundJob'), 'Background/Data');
    assert.equal(operationKindFor(markdown, 'RebuildsReadModel'), 'Read');
    assert.equal(operationKindFor(markdown, 'CreatesOrder'), 'Write');

    const duplicateRows = markdown.match(/^\| `TC-DUP-001` \| TestSpec \|/gm) ?? [];
    assert.equal(duplicateRows.length, 2, 'the same business ID on two methods is two annotation occurrences');
});

// Business Intent / Invariant Guarded: generated technical evidence is release-safe only when a
// fresh render is byte-equivalent after volatile date/EOL normalization and occurrence-complete.
test('generate-tech-specs --check detects missing, extra, content, and occurrence drift but ignores date and CRLF (TC-TSPEC-009)', async () => {
    const normalizedRoot = await makeProject({ source: OPERATION_SOURCE });
    assert.equal(runGenerator(normalizedRoot).status, 0);
    const normalizedFile = await generatedMarkdownPath(normalizedRoot);
    const normalized = (await fs.readFile(normalizedFile, 'utf8'))
        .replace(/Regenerated: \d{4}-\d{2}-\d{2}\./, 'Regenerated: 1999-01-01.')
        .replace(/\n/g, '\r\n');
    await fs.writeFile(normalizedFile, normalized, 'utf8');

    const fresh = runGenerator(normalizedRoot, ['--check']);
    assert.equal(fresh.status, 0, fresh.stderr);
    const freshReport = parseResultJson(fresh);
    assert.equal(freshReport.status, 'fresh');
    assert.equal(freshReport.sourceAnnotationOccurrences, 17);
    assert.equal(freshReport.projectedAnnotationOccurrences, 17);

    for (const [label, mutate, expectedKind] of [
        ['missing', async root => fs.rm(await generatedMarkdownPath(root)), 'missing'],
        ['extra', async root => fs.writeFile(path.join(root, 'out', 'extra.md'), `${DERIVED_BANNER}\n\n# Extra\n`, 'utf8'), 'extra'],
        [
            'content',
            async root => {
                const file = await generatedMarkdownPath(root);
                await fs.writeFile(file, `${await fs.readFile(file, 'utf8')}\nDRIFT\n`, 'utf8');
            },
            'content'
        ]
    ]) {
        const root = await makeProject({ source: OPERATION_SOURCE });
        assert.equal(runGenerator(root).status, 0, `${label}: precondition generation`);
        await mutate(root);

        const stale = runGenerator(root, ['--check']);
        assert.notEqual(stale.status, 0, `${label}: drift must fail the check`);
        const report = parseResultJson(stale);
        assert.equal(report.status, 'stale');
        assert.ok(
            report.differences.some(difference => difference.kind === expectedKind),
            `${label}: report must classify ${expectedKind}`
        );
    }

    const occurrenceRoot = await makeProject({ source: OPERATION_SOURCE });
    assert.equal(runGenerator(occurrenceRoot).status, 0, 'occurrence: precondition generation');
    const occurrenceFile = await generatedMarkdownPath(occurrenceRoot);
    const occurrenceContent = await fs.readFile(occurrenceFile, 'utf8');
    await fs.writeFile(occurrenceFile, occurrenceContent.replace(/<!-- tech-spec-annotation-occurrence:[A-Za-z0-9_-]+ -->/, ''), 'utf8');

    const incomplete = runGenerator(occurrenceRoot, ['--check']);
    assert.notEqual(incomplete.status, 0, 'a dropped projection marker must fail completeness');
    assert.ok(
        parseResultJson(incomplete).annotationDifferences.some(difference => difference.scope === 'committed-tree' && difference.kind === 'missing'),
        'the report must identify the missing annotation occurrence'
    );

    const duplicateRoot = await makeProject({ source: OPERATION_SOURCE });
    assert.equal(runGenerator(duplicateRoot).status, 0, 'duplicate occurrence: precondition generation');
    const duplicateFile = await generatedMarkdownPath(duplicateRoot);
    const duplicateContent = await fs.readFile(duplicateFile, 'utf8');
    const [marker] = duplicateContent.match(/<!-- tech-spec-annotation-occurrence:[A-Za-z0-9_-]+ -->/) ?? [];
    assert.ok(marker, 'precondition: generated occurrence marker');
    await fs.writeFile(duplicateFile, duplicateContent.replace(marker, `${marker}${marker}`), 'utf8');

    const duplicated = runGenerator(duplicateRoot, ['--check']);
    assert.notEqual(duplicated.status, 0, 'a duplicated projection marker must fail completeness');
    assert.ok(
        parseResultJson(duplicated).annotationDifferences.some(difference => difference.scope === 'committed-tree' && difference.kind === 'duplicate'),
        'the report must identify the duplicated annotation occurrence'
    );
});

// Business Intent / Invariant Guarded: CI can run the freshness oracle against the actual repo
// without modifying derived documentation, whether the current verdict is fresh or actionable stale.
test('generate-tech-specs --check is read-only against the live repository (TC-TSPEC-010)', async (t) => {
    if (!isFrameworkRepo(repoRoot)) {
        t.skip('live framework-repository check is not part of an adopting project copy');
        return;
    }

    const projectConfig = JSON.parse(await fs.readFile(path.join(repoRoot, 'docs', 'project-config.json'), 'utf8'));
    if (!projectConfig?.techSpecScan) {
        t.skip('this framework repository has no configured annotation convention');
        return;
    }

    const technicalRoot = path.resolve(repoRoot, projectConfig.specRoots.technical.path);
    const before = await readMarkdownMap(technicalRoot);

    const result = runGenerator(repoRoot, ['--check']);

    assert.ok([0, 1].includes(result.status), `freshness check must return a verdict, got ${result.status}: ${result.stderr}`);
    const report = parseResultJson(result);
    assert.ok(['fresh', 'stale'].includes(report.status));
    if (report.status === 'stale') {
        assert.ok(report.differences.length > 0 || report.annotationDifferences.length > 0, 'stale verdict must be actionable');
    }
    assert.deepEqual(await readMarkdownMap(technicalRoot), before, '--check must never rewrite live derived docs');
});

test('generate-tech-specs honors a relocated project config path (TC-TSPEC-011)', async () => {
    const root = await makeProject({ configPath: 'config/project.json' });

    const result = runGenerator(root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"status": "ok"/);
    assert.match(await fs.readFile(await generatedMarkdownPath(root), 'utf8'), /TS-ORDER-001/);
});

test('generate-tech-specs refuses a technical root outside the repository (TC-TSPEC-003)', async () => {
    // The escape target is derived from this run's unique mkdtemp name. A fixed name like
    // "../escape-hatch" resolves into the SHARED os.tmpdir(), so one leftover directory from
    // any other run (or another tool) makes this assertion fail for a reason unrelated to
    // the guard under test. Uniqueness keeps the failure signal honest.
    const root = await makeProject();
    const escapeName = `escape-${path.basename(root)}`;
    await fs.writeFile(
        path.join(root, 'docs', 'project-config.json'),
        JSON.stringify({
            specRoots: { technical: { path: `../${escapeName}` } },
            techSpecScan: { sourceRoot: 'src', fileExtensions: ['.cs'], annotationPattern: ANNOTATION_PATTERN }
        }),
        'utf8'
    );

    const escaped = path.resolve(root, '..', escapeName);
    await assert.rejects(fs.access(escaped), 'precondition: escape target must not pre-exist');

    const result = runGenerator(root);

    assert.notEqual(result.status, 0, 'traversal path must be rejected');
    assert.match(result.stderr, /Refusing to write outside repository/);
    await assert.rejects(fs.access(escaped), 'nothing may be created outside the project root');
});

// A scan matching nothing is a misconfiguration, not an empty success. Reporting
// status:"ok" with annotations:0 is indistinguishable from a correct empty run.
test('generate-tech-specs fails loudly when the scan matches no annotations (TC-TSPEC-004)', async () => {
    const root = await makeProject({ withSource: false });

    const result = runGenerator(root);

    assert.notEqual(result.status, 0, 'a zero-annotation scan must NOT exit 0');
    assert.match(result.stderr, /no-annotations-found/);
    assert.doesNotMatch(result.stderr, /"status":\s*"ok"/);
});

// Regression for the second door into the data-loss failure mode: making the scan
// config-driven meant capture group 1 could be ANY string, but the renderer indexes a
// fixed two-key map by it. A bad pattern threw only AFTER removeGeneratedMarkdown had
// legitimately deleted the old output — files gone, nothing written. Validation now
// happens at the parse boundary, which runs before any deletion.
test('generate-tech-specs rejects a bad annotationPattern BEFORE deleting anything (TC-TSPEC-007)', async () => {
    for (const [label, pattern] of [
        ['unknown trait name', '\\[Trait\\("(Category)"\\s*,\\s*"([^"]+)"\\)\\]'],
        ['missing second group', '\\[Trait\\("(TestSpec)"'],
        ['extra capture group', '\\[Trait\\("(TestSpec)"\\s*,\\s*"([^"]+)"(\\s*)\\)\\]']
    ]) {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-badpattern-'));
        await fs.mkdir(path.join(root, 'docs'), { recursive: true });
        await fs.writeFile(
            path.join(root, 'docs', 'project-config.json'),
            JSON.stringify({
                specRoots: { technical: { path: 'out' } },
                techSpecScan: { sourceRoot: 'src', fileExtensions: ['.cs'], annotationPattern: pattern }
            }),
            'utf8'
        );
        await fs.mkdir(path.join(root, 'src', 'Services', 'Orders'), { recursive: true });
        await fs.writeFile(
            path.join(root, 'src', 'Services', 'Orders', 'OrderTests.cs'),
            '\npublic class OrderTests\n{\n    [Trait("Category", "Unit")]\n    [Trait("TestSpec", "TS-1")]\n    public async Task Should_Do()\n    {\n    }\n}\n',
            'utf8'
        );

        const outDir = path.join(root, 'out');
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, 'existing-derived.md'), `${DERIVED_BANNER}\n\n# Existing\n`, 'utf8');

        const result = runGenerator(root);

        assert.notEqual(result.status, 0, `${label}: must fail`);
        assert.match(result.stderr, /Invalid techSpecScan\.annotationPattern/, `${label}: must name the real cause`);
        assert.doesNotMatch(result.stderr, /TypeError/, `${label}: must not crash on undefined`);
        await assert.doesNotReject(fs.access(path.join(outDir, 'existing-derived.md')), `${label}: existing derived output must SURVIVE a bad pattern`);
    }
});

test('generate-tech-specs fails loudly when techSpecScan is absent (TC-TSPEC-006)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-noscan-'));
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'project-config.json'), JSON.stringify({ specRoots: { technical: { path: 'out' } } }), 'utf8');

    const result = runGenerator(root);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing docs\/project-config\.json techSpecScan/);
});

test('generate-tech-specs --optional skips when techSpecScan is absent (TC-TSPEC-012)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-optional-'));
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'project-config.json'), JSON.stringify({}), 'utf8');

    const result = runGenerator(root, ['--check', '--optional']);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SKIP \(project config has no techSpecScan contract\)/);
});
