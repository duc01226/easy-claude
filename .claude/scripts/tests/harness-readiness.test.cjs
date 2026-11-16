'use strict';

/**
 * Harness readiness at task start (GuidedWorkflow US-GWF-09, BR-GWF-21, BR-GWF-22).
 *
 * The readiness check decides whether the optional first step of the three catalog workflows offers setup.
 * Each case builds its own fixture project in the OS temp folder (never inside the checkout), runs the real
 * script as a child with a scrubbed environment (HOME/USERPROFILE/TMPDIR/TEMP/TMP point at the fixture and
 * CLAUDE_PROJECT_DIR is removed), and asserts the JSON verdict a workflow reads.
 *
 * Windows vs POSIX: the script is started as `node <script>` from a literal argv (no shell), fixture folder
 * names hold a space, and evidence paths are asserted with `/` separators on every OS. Nothing here needs a
 * symlink, an executable bit or a particular line ending.
 *
 * Registry and prose cases read framework-owned files that ship inside `.claude/` (the workflow registry,
 * skills and the prompt hook), never this repository's docs, config or git state.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLAUDE = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(CLAUDE, 'scripts', 'harness-readiness.cjs');
const DECISION = path.join('tmp', 'claude-temp', '.harness-readiness-decision');
const CORE = ['formatter', 'linter', 'typecheck', 'tests'];
const { resolveAllWorkflowManifests } = require(path.join(CLAUDE, 'scripts', 'lib', 'workflow-manifest.cjs'));
const { DECISION_TTL_DAYS, MAX_PACKAGES } = require(SCRIPT);
const { commandHash, KEY_VERSION } = require(path.join(CLAUDE, 'hooks', 'lib', 'verify-baseline.cjs'));

const READINESS_WORKFLOWS = ['workflow-feature', 'workflow-bugfix', 'workflow-implement-spec'];

function makeProject(t, files = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness readiness '));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const [rel, content] of Object.entries(files)) write(root, rel, content);
    return root;
}

function write(root, rel, content) {
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (rel.endsWith('/')) return;
    fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

function cleanEnv(root) {
    const env = { ...process.env };
    const drop = ['CLAUDE_PROJECT_DIR', 'HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP'];
    for (const key of Object.keys(env)) if (drop.some(name => name.toUpperCase() === key.toUpperCase())) delete env[key];
    return { ...env, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
}

function run(root, ...args) {
    return spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { cwd: root, env: cleanEnv(root), encoding: 'utf8', timeout: 20000 });
}

function check(root, ...args) {
    const result = run(root, '--json', ...args);
    assert.equal(result.status, 0, `exit 0 expected: ${result.stderr}`);
    assert.equal(result.stderr, '');
    return JSON.parse(result.stdout);
}

function treeSnapshot(root) {
    const out = [];
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else out.push(`${path.relative(root, full)}:${fs.statSync(full).mtimeMs}:${fs.readFileSync(full, 'utf8').length}`);
        }
    };
    walk(root);
    return out;
}

const statuses = result => Object.fromEntries(CORE.map(id => [id, result.sensors[id].status]));

const SOLO_JS = {
    'package.json': { name: 'shop', scripts: { test: 'node --test', start: 'node server.js', lint: 'eslint .' } },
    'eslint.config.js': 'export default [];\n',
    '.prettierrc': '{}\n',
    'tsconfig.json': '{}\n'
};

const INVENTORY = rows =>
    [
        '# Harness Inventory',
        '',
        'Updated: 2026-11-17',
        '',
        '## Summary',
        '',
        '| Sensor | Status | Evidence | Command | Baseline | Next step |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows.map(([sensor, status, evidence]) => `| ${sensor} | \`${status}\` | ${evidence} | — | none | — |`),
        '',
        '## Open Gaps',
        '',
        '| Linter | `missing` | a row outside the Summary is never read | — | — | — |'
    ].join('\n');

const PROVEN_ROWS = [
    ['Formatter', 'proven', '`npm run format:check` passed 2026-11-17'],
    ['Linter', 'proven', '`npm run lint` passed 2026-11-17'],
    ['Type check', 'n/a', 'plain JavaScript, no type checker chosen'],
    ['Tests', 'proven', '`npm test` passed 2026-11-17']
];

test('TC-GWF-078: the three catalog workflows open with the optional readiness step, and no other workflow carries it', () => {
    // Given the shipped workflow registry
    const registry = JSON.parse(fs.readFileSync(path.join(CLAUDE, 'workflows.json'), 'utf8'));
    for (const id of Object.keys(registry.workflows)) {
        // When every mode of every workflow resolves
        for (const manifest of resolveAllWorkflowManifests(registry, id, { rootDir: path.dirname(CLAUDE) })) {
            const readiness = manifest.occurrences.filter(step => step.skill === 'harness-setup' && /--mode=readiness/.test(step.args));
            const expected = READINESS_WORKFLOWS.includes(id) && !(id === 'workflow-implement-spec' && manifest.mode === 'greenfield-slice');
            if (!expected) {
                // Then routes outside the three catalog workflows get no readiness step (the documented route gap),
                // and the first-slice mode inherits the harness its foundation workflow set up
                assert.equal(readiness.length, 0, `${id}/${manifest.mode} must not carry the readiness step`);
                continue;
            }
            // Then the readiness step is the first step, optional, in the discover phase, decided by the check
            const [first] = manifest.occurrences;
            assert.equal(readiness.length, 1, `${id}/${manifest.mode} carries the readiness step once`);
            assert.equal(first.skill, 'harness-setup', `${id}: readiness is the first step`);
            assert.equal(first.role, 'optional', `${id}: readiness is optional, never a gate`);
            assert.match(first.applicability.when, /harness-readiness\.cjs --json/);
            assert.match(first.applicability.when, /offer true/);
            assert.match(first.applicability.when, /team-owned repository the step proposes the setup in writing and changes nothing/);
            assert.match(first.applicability.skipReason, /reports ready/);
            assert.match(first.applicability.skipReason, /recorded decline or team proposal/);
            assert.equal(manifest.phases[0].id, 'discover');
            assert.equal(manifest.phases[0].steps[0], first.id);
        }
    }
});

test('TC-GWF-079: a project whose checks are proven in the committed inventory gets no offer', t => {
    // Given a JavaScript project whose inventory proves every check (type check recorded as not applicable)
    const root = makeProject(t, { ...SOLO_JS, 'docs/project-reference/harness-inventory.md': INVENTORY(PROVEN_ROWS) });
    // When the readiness check runs
    const result = check(root);
    // Then the verdict is ready, nothing is offered, and each check cites the inventory as its proof
    assert.equal(result.verdict, 'ready');
    assert.equal(result.offer, false);
    assert.deepEqual(result.gaps, []);
    assert.deepEqual(statuses(result), { formatter: 'proven', linter: 'proven', typecheck: 'n/a', tests: 'proven' });
    assert.equal(result.sensors.linter.source, 'inventory');
    assert.match(result.sensors.linter.evidence[0], /^docs\/project-reference\/harness-inventory\.md: /);
    assert.match(result.summary, /Nothing to offer/);

    // And a relocated project-reference root is honoured: the inventory is read where the config says
    const moved = makeProject(t, {
        ...SOLO_JS,
        'docs/project-config.json': { project: { name: 'shop' }, docsRoots: { projectReference: { path: 'handbook/reference' } } },
        'handbook/reference/harness-inventory.md': INVENTORY(PROVEN_ROWS)
    });
    const relocated = check(moved);
    assert.equal(relocated.config, 'valid');
    assert.equal(relocated.inventory.path, 'handbook/reference/harness-inventory.md');
    assert.equal(relocated.verdict, 'ready');

    // And the verify baseline proves a declared command while it records that exact command; `none` settles a check
    const lint = 'eslint . --max-warnings=0';
    const proven = makeProject(t, {
        'package.json': { name: 'shop' },
        'docs/project-config.json': { project: { name: 'shop' }, testing: { commands: { lint, typecheck: 'none', affected: 'node --test' } } },
        '.verify-baseline.json': {
            schemaVersion: 1,
            keyVersion: KEY_VERSION,
            commands: { lint: { commandHash: commandHash(lint), items: {} }, affected: { commandHash: commandHash('node --test --old-flag'), items: {} } }
        }
    });
    const fromBaseline = check(proven);
    assert.equal(fromBaseline.config, 'valid');
    assert.equal(fromBaseline.verifyBaseline.status, 'ok');
    assert.deepEqual(fromBaseline.sensors.linter, {
        status: 'proven',
        source: 'verify-baseline',
        evidence: [".verify-baseline.json → lint (the current command's hash is recorded)"]
    });
    assert.deepEqual(fromBaseline.sensors.typecheck, { status: 'n/a', source: 'config', evidence: ['testing.commands.typecheck: none'] });
    // And a command that changed since the baseline was taken is configured again, never proven by a stale record
    assert.equal(fromBaseline.sensors.tests.status, 'configured');
    assert.ok(fromBaseline.sensors.tests.evidence.includes('testing.commands.affected'));
    assert.deepEqual(
        fromBaseline.gaps.map(gap => gap.sensor),
        ['formatter', 'tests']
    );
    // And a baseline whose failure keys were formed by another key version proves nothing
    const staleKeys = JSON.parse(fs.readFileSync(path.join(proven, '.verify-baseline.json'), 'utf8'));
    staleKeys.keyVersion = KEY_VERSION + 1;
    write(proven, '.verify-baseline.json', staleKeys);
    assert.equal(check(proven).sensors.linter.status, 'configured');

    // And re-running the check (a resumed or replayed run) gives the same verdict and writes nothing
    const before = treeSnapshot(root);
    assert.equal(check(root).verdict, 'ready');
    assert.deepEqual(treeSnapshot(root), before);
});

test('TC-GWF-080: missing or unproven checks are found for JavaScript, Python and an empty repository', t => {
    // Given a JavaScript project whose checks are configured but never proven
    const js = check(makeProject(t, SOLO_JS));
    // Then each check is configured with its evidence, and setup is offered to prove them
    assert.deepEqual(js.stacks, ['node']);
    assert.deepEqual(statuses(js), { formatter: 'configured', linter: 'configured', typecheck: 'configured', tests: 'configured' });
    assert.ok(js.sensors.linter.evidence.includes('eslint.config.js'));
    assert.ok(js.sensors.tests.evidence.includes('package.json → scripts.test'));
    assert.equal(js.verdict, 'gaps');
    assert.equal(js.offer, true);
    assert.equal(js.action, 'setup');

    // Given a JavaScript project with only the npm placeholder test script and no tool config
    const bare = check(makeProject(t, { 'package.json': { name: 'bare', scripts: { test: 'echo "Error: no test specified" && exit 1' } } }));
    // Then the placeholder never counts as a test runner and every check is missing
    assert.deepEqual(statuses(bare), { formatter: 'missing', linter: 'missing', typecheck: 'missing', tests: 'missing' });

    // Given a Python project with Ruff and pytest configured but no formatter or type checker
    const py = check(
        makeProject(t, {
            'pyproject.toml': '[build-system]\nrequires = ["setuptools"]\n\n[tool.ruff]\nline-length = 100\n\n[tool.pytest.ini_options]\naddopts = "-q"\n'
        })
    );
    // Then the Python checks are read from pyproject.toml (Ruff also formats) and the absent type check is a gap
    assert.deepEqual(py.stacks, ['python']);
    assert.deepEqual(statuses(py), { formatter: 'configured', linter: 'configured', typecheck: 'missing', tests: 'configured' });
    assert.ok(py.sensors.linter.evidence.includes('pyproject.toml → [tool.ruff]'));
    assert.ok(py.sensors.formatter.evidence.includes('pyproject.toml (ruff format ships with Ruff)'));
    assert.match(py.gaps.find(gap => gap.sensor === 'typecheck').why, /^Without a type check/);

    // Given a Python project that names its tools only in a requirements file
    const reqs = check(makeProject(t, { 'requirements-dev.txt': 'black==24.1.0\nmypy-extensions==1.0.0\npytest>=8\n' }));
    // Then a listed tool counts by its exact name, and a look-alike package (mypy-extensions) is not a type checker
    assert.deepEqual(statuses(reqs), { formatter: 'configured', linter: 'missing', typecheck: 'missing', tests: 'configured' });
    assert.ok(reqs.sensors.formatter.evidence.includes('requirements-dev.txt lists black'));

    // Given an empty repository
    const empty = check(makeProject(t, { 'README.md': '# idea\n' }));
    // Then no stack is recognised, nothing is silently ready, and the fix researches the stack first
    assert.deepEqual(empty.stacks, []);
    assert.deepEqual(statuses(empty), { formatter: 'missing', linter: 'missing', typecheck: 'missing', tests: 'missing' });
    assert.equal(empty.offer, true);
    assert.ok(empty.gaps.every(gap => /No manifest this check recognises/.test(gap.why)));
    assert.ok(empty.gaps.every(gap => /researches the stack first/.test(gap.fix)));
    assert.equal(empty.config, 'missing');
});

test('TC-GWF-081: a monorepo is read through its workspace packages, bounded, with a placement rule', t => {
    // Given npm workspaces where one package keeps its own ESLint config and the root holds Prettier
    const root = makeProject(t, {
        'package.json': { name: 'mono', private: true, workspaces: ['packages/*'], devDependencies: { prettier: '3.0.0' } },
        '.prettierrc': '{}\n',
        'packages/web/package.json': { name: 'web', scripts: { test: 'vitest run' } },
        'packages/web/.eslintrc.json': '{}\n',
        'packages/api/package.json': { name: 'api' },
        'packages/notes/README.md': 'not a package\n'
    });
    const result = check(root);
    // Then the package config counts, with a `/` path on every OS, and only folders with a manifest are packages
    assert.equal(result.workspace.shape, 'npm-workspaces');
    assert.equal(result.workspace.packages, 2);
    assert.equal(result.sensors.linter.status, 'configured');
    assert.ok(result.sensors.linter.evidence.includes('packages/web/.eslintrc.json'));
    assert.ok(result.sensors.tests.evidence.includes('packages/web/package.json → scripts.test'));
    assert.match(result.workspace.placement, /package config that already exists is kept/);

    // Given pnpm workspaces
    const pnpm = check(
        makeProject(t, { 'package.json': { name: 'p' }, 'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n", 'apps/one/package.json': { name: 'one' } })
    );
    assert.equal(pnpm.workspace.shape, 'pnpm-workspaces');
    assert.equal(pnpm.workspace.packages, 1);
    const flow = check(
        makeProject(t, {
            'package.json': { name: 'p' },
            'pnpm-workspace.yaml': "packages: ['apps/*', 'tools/cli']\n",
            'apps/one/package.json': { name: 'one' },
            'tools/cli/package.json': { name: 'cli' }
        })
    );
    assert.equal(flow.workspace.packages, 2);

    // Given a prefix wildcard in the last segment and a pattern with a wildcard deeper in the path
    const prefixed = check(
        makeProject(t, {
            'package.json': { name: 'm', workspaces: ['plugins/plugin-*', 'deep/*/pkgs/*'] },
            'plugins/plugin-a/package.json': { name: 'a' },
            'plugins/plugin-b/package.json': { name: 'b' },
            'plugins/other/package.json': { name: 'other' }
        })
    );
    // Then only matching folders are packages, and the pattern it cannot expand is named instead of silently dropped
    assert.equal(prefixed.workspace.packages, 2);
    assert.deepEqual(prefixed.workspace.skippedPatterns, ['deep/*/pkgs/*']);

    // Given a build-graph tool the placement rules do not decide
    const graph = check(makeProject(t, { 'package.json': { name: 'g' }, 'nx.json': '{}\n' }));
    assert.equal(graph.workspace.shape, 'unknown');
    assert.match(graph.workspace.placement, /^propose:/);

    // Given more workspace packages than the bound
    const files = { 'package.json': { name: 'big', workspaces: ['libs/*'] } };
    for (let i = 0; i < MAX_PACKAGES + 5; i++) files[`libs/p${String(i).padStart(3, '0')}/package.json`] = { name: `p${i}` };
    const big = check(makeProject(t, files));
    // Then the read stops at the bound and says so, so the cost never grows with the repository
    assert.equal(big.workspace.packages, MAX_PACKAGES);
    assert.equal(big.workspace.truncated, true);
});

test('TC-GWF-082: a team-owned repository gets a proposal and nothing is written', t => {
    // Given a project with a code-owners file, a CI pipeline and a shared lint config package, and no harness
    const root = makeProject(t, {
        'package.json': { name: '@acme/web', devDependencies: { '@acme/eslint-config': '1.0.0' } },
        '.github/CODEOWNERS': '* @acme/platform\n',
        '.github/workflows/ci.yml': 'name: ci\n'
    });
    const before = treeSnapshot(root);
    // When the readiness check runs
    const result = check(root);
    // Then the setup is proposed, every ownership signal is named, and each fix says nothing is written
    assert.equal(result.ownership.teamOwned, true);
    assert.equal(result.action, 'propose');
    assert.ok(result.ownership.signals.some(signal => signal.startsWith('.github/CODEOWNERS')));
    assert.ok(result.ownership.signals.some(signal => signal.startsWith('.github/workflows/ci.yml')));
    assert.ok(result.ownership.signals.some(signal => signal.includes('@acme/eslint-config')));
    assert.ok(result.gaps.length > 0);
    assert.ok(result.gaps.every(gap => /nothing is written here because the team owns this repository's checks/.test(gap.fix)));
    assert.match(result.summary, /propose the setup in writing and change nothing/);
    // And the project tree is byte-for-byte unchanged
    assert.deepEqual(treeSnapshot(root), before);

    // When the proposal is recorded, Then only the local, untracked decision file is added
    const recorded = run(root, '--record=proposed', '--reason', 'platform team decides');
    assert.equal(recorded.status, 0, recorded.stderr);
    const added = treeSnapshot(root).filter(line => !before.includes(line));
    assert.equal(added.length, 1);
    assert.ok(added[0].startsWith(DECISION), `only the decision file is written: ${added}`);
    assert.equal(check(root).verdict, 'proposed');

    // And a solo project with none of those signals is set up, not proposed
    assert.equal(check(makeProject(t, SOLO_JS)).action, 'setup');
    // And public presets and tool packages never mark a solo project as team-owned
    const publicPackages = check(
        makeProject(t, {
            ...SOLO_JS,
            'package.json': {
                name: 'shop',
                devDependencies: {
                    '@typescript-eslint/eslint-plugin': '8.0.0',
                    '@vue/eslint-config-typescript': '14.0.0',
                    '@biomejs/biome': '1.9.0',
                    '@types/eslint': '9.0.0'
                }
            }
        })
    );
    assert.equal(publicPackages.ownership.teamOwned, false);
    assert.equal(publicPackages.action, 'setup');
    // And each signal alone is enough: a code-owners file, a CI pipeline, or a workspace-linked config package
    for (const files of [
        { CODEOWNERS: '* @someone\n' },
        { '.gitlab-ci.yml': 'test: {}\n' },
        { 'package.json': { name: 'shop', devDependencies: { '@house/eslint-config': 'workspace:*' } } }
    ])
        assert.equal(check(makeProject(t, { 'package.json': { name: 'shop' }, ...files })).action, 'propose', JSON.stringify(files));
});

test('TC-GWF-083: a recorded decline stops the offer only while it covers the gaps and has not expired', t => {
    // Given a project whose inventory proves the linter and tests, leaving the formatter and type check open
    const rows = PROVEN_ROWS.filter(([sensor]) => ['Linter', 'Tests'].includes(sensor));
    const root = makeProject(t, { 'package.json': { name: 'shop' }, 'docs/project-reference/harness-inventory.md': INVENTORY(rows) });
    assert.deepEqual(
        check(root).gaps.map(gap => gap.sensor),
        ['formatter', 'typecheck']
    );
    // When the user declines and the answer is recorded
    const recorded = JSON.parse(run(root, '--record=declined', '--reason', 'not now,\n during the release', '--json').stdout);
    assert.equal(recorded.recorded, true);
    assert.deepEqual(recorded.decision.gaps, ['formatter', 'typecheck']);
    assert.equal(recorded.decision.reason, 'not now, during the release');
    assert.equal(recorded.decision.ttlDays, DECISION_TTL_DAYS);
    assert.equal(Date.parse(recorded.decision.expiresAt) - Date.parse(recorded.decision.recordedAt), DECISION_TTL_DAYS * 24 * 60 * 60 * 1000);
    // Then the next task start offers nothing and says which decision covers it
    const declined = check(root);
    assert.equal(declined.verdict, 'declined');
    assert.equal(declined.offer, false);
    assert.equal(declined.decision.covers, true);
    assert.match(declined.summary, /declined decision recorded .* still covers formatter \(missing\), typecheck \(missing\)/);

    // When a gap the decision does not name appears (the linter's proof is withdrawn)
    write(root, 'docs/project-reference/harness-inventory.md', INVENTORY([['Linter', 'configured', 'eslint.config.js'], rows[1]]));
    const widened = check(root);
    // Then the offer comes back and the reason is stated
    assert.equal(widened.verdict, 'gaps');
    assert.equal(widened.decision.covers, false);
    assert.equal(widened.decision.why, 'a gap it does not name appeared');

    // When the decision has expired
    write(root, 'docs/project-reference/harness-inventory.md', INVENTORY(rows));
    const file = path.join(root, DECISION);
    const stale = JSON.parse(fs.readFileSync(file, 'utf8'));
    stale.expiresAt = new Date(Date.now() - 1000).toISOString();
    fs.writeFileSync(file, JSON.stringify(stale));
    const expired = check(root);
    assert.equal(expired.verdict, 'gaps');
    assert.equal(expired.decision.why, 'expired');

    // And a decision is refused when nothing is open, so a ready project never stores one
    const ready = makeProject(t, { ...SOLO_JS, 'docs/project-reference/harness-inventory.md': INVENTORY(PROVEN_ROWS) });
    const refused = JSON.parse(run(ready, '--record=declined', '--json').stdout);
    assert.equal(refused.recorded, false);
    assert.equal(fs.existsSync(path.join(ready, DECISION)), false);

    // And a corrupt decision file is ignored, never read as a decline
    write(root, DECISION, 'not json');
    assert.equal(check(root).verdict, 'gaps');
});

test('TC-GWF-084: every gap says why it matters and how to fix it; the runtime row informs and never offers', t => {
    // Given a project with every check missing
    const result = check(makeProject(t, { 'package.json': { name: 'lib', main: 'index.js' } }));
    // Then each gap names its check, the harm, and the skill that fixes it
    assert.deepEqual(
        result.gaps.map(gap => gap.sensor),
        CORE
    );
    const by = Object.fromEntries(result.gaps.map(gap => [gap.sensor, gap]));
    assert.match(by.linter.why, /reach review or production instead of failing in seconds/);
    assert.match(by.linter.fix, /\/linter-setup --mode=brownfield \(Linter category\)/);
    assert.match(by.tests.why, /no regression test can fail before the fix and pass after it/);
    assert.match(by.tests.fix, /\/harness-setup --mode=readiness \(test runner step\)/);
    assert.ok(result.gaps.every(gap => gap.fix.includes('baseline so today') || gap.fix.includes('researches')));
    // And a configured but unproven check says no passing run is recorded, and how it becomes proven
    const unproven = check(makeProject(t, SOLO_JS)).gaps.find(gap => gap.sensor === 'formatter');
    assert.match(unproven.why, /^A formatter is configured for JavaScript\/TypeScript but no passing run is recorded/);
    assert.match(unproven.fix, /which records it as proven \(or baselined\) in the harness inventory\.$/);
    const unprovenLinter = check(makeProject(t, SOLO_JS)).gaps.find(gap => gap.sensor === 'linter');
    assert.match(unprovenLinter.fix, /records it as proven \(or baselined\) in the verify baseline or the harness inventory/);

    // Given the four runtime cases
    const experience = {
        enabled: true,
        evidenceRoot: 'tmp/evidence',
        baselineRoot: 'tests/baselines',
        acceptancePolicy: 'manual-acceptance-required',
        surfaces: [{ id: 'web', kind: 'ui', runner: 'browser', entryPoints: ['/'], localRun: { startCommand: 'npm start' } }]
    };
    const runtime = files => check(makeProject(t, files)).runtime;
    const configured = runtime({
        'package.json': { name: 'app' },
        'docs/project-config.json': { project: { name: 'app' }, experienceVerification: experience }
    });
    assert.deepEqual(configured, { status: 'configured', evidence: 'experienceVerification.surfaces[0].localRun.startCommand', informational: true });
    assert.equal(runtime({ 'package.json': { name: 'app', scripts: { dev: 'vite' } } }).status, 'derivable');
    assert.equal(runtime({ 'go.mod': 'module example.com/svc\n' }).status, 'none');
    assert.equal(runtime({ 'package.json': { name: 'lib', main: 'index.js' } }).status, 'not-applicable');

    // Then the runtime row never changes the offer: projects with the same checks and each runtime value get one verdict
    const scripts = { test: 'node --test', lint: 'eslint .' };
    const variants = [
        {
            ...SOLO_JS,
            'package.json': { name: 'shop', scripts },
            'docs/project-config.json': { project: { name: 'shop' }, experienceVerification: experience }
        },
        { ...SOLO_JS, 'package.json': { name: 'shop', scripts: { ...scripts, start: 'node server.js' } } },
        { ...SOLO_JS, 'package.json': { name: 'shop', scripts } },
        { ...SOLO_JS, 'package.json': { name: 'shop', scripts, main: 'index.js' } }
    ].map(files => check(makeProject(t, files)));
    assert.deepEqual(
        variants.map(variant => variant.runtime.status),
        ['configured', 'derivable', 'none', 'not-applicable']
    );
    for (const variant of variants) {
        assert.equal(variant.verdict, 'gaps');
        assert.equal(variant.offer, true);
        assert.deepEqual(statuses(variant), statuses(variants[0]));
    }
    // And a project whose only gaps sit beside a not-applicable runtime still gets the offer
    assert.equal(result.runtime.status, 'not-applicable');
    assert.equal(result.offer, true);
});

test('TC-GWF-085: the check runs directly, in under a second, with clear usage errors on every OS', t => {
    const root = makeProject(t, SOLO_JS);
    // When it runs as a plain command, Then the human report names each check and the verdict
    const human = run(root);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /^Harness readiness: gaps \(offer setup\)/);
    assert.match(human.stdout, /Linter: configured — eslint\.config\.js/);
    assert.match(human.stdout, /Runtime \(informational\): derivable/);
    // And the JSON run reports its own time, under one second, with no network or tool run
    const result = check(root);
    assert.ok(result.elapsedMs < 1000, `the check took ${result.elapsedMs} ms`);
    // And help exits 0; unknown flags, a missing root and a bad decision exit 2 with the reason on stderr
    assert.equal(run(root, '--help').status, 0);
    for (const [args, reason] of [
        [['--frobnicate'], /Unknown argument: --frobnicate/],
        [['--record=maybe'], /--record must be one of: declined, proposed/],
        [['--reason', 'x'], /--reason is used only with --record/]
    ]) {
        const bad = run(root, ...args);
        assert.equal(bad.status, 2, `${args.join(' ')} exits 2`);
        assert.match(bad.stderr, reason);
        assert.match(bad.stderr, /Usage: node \.claude\/scripts\/harness-readiness\.cjs/);
        assert.equal(bad.stdout, '');
    }
    const missingRoot = spawnSync(process.execPath, [SCRIPT, '--root', path.join(root, 'no such folder')], { env: cleanEnv(root), encoding: 'utf8' });
    assert.equal(missingRoot.status, 2);
    assert.match(missingRoot.stderr, /is not a directory\. Pass an existing folder with --root/);
    // And an invalid project config is reported and ignored, never trusted
    const invalid = check(makeProject(t, { ...SOLO_JS, 'docs/project-config.json': '{ not json' }));
    assert.equal(invalid.config, 'invalid');
    assert.match(invalid.configNote, /repair it with \/project-config/);
    assert.equal(invalid.verdict, 'gaps');
});

test('TC-GWF-086: a bug fix with no test project gets a set-up offer or a runnable regression test, never a dead end', () => {
    // Given the integration-test step that the bug-fix workflow runs as its regression (RED) gate
    const skill = fs.readFileSync(path.join(CLAUDE, 'skills', 'integration-test', 'SKILL.md'), 'utf8');
    // Then the old stop is gone and the no-test-project route offers setup or a built-in runner
    assert.doesNotMatch(skill, /See CLAUDE\.md Integration Testing section to create one/);
    for (const phrase of [
        'If no test project exists, never stop at "create one yourself"',
        'Run `node .claude/scripts/harness-readiness.cjs --json`.',
        'offer `/harness-setup --mode=readiness`',
        "the language's built-in runner when nothing else exists",
        'record in the report that no integration test project exists and who owns creating one',
        'never skip the gate, and never report it done without a test that fails before the fix'
    ])
        assert.ok(skill.includes(phrase), `integration-test lost: ${phrase}`);
    // And the readiness mode it routes to ends in one of three outcomes and hands back to the task
    const mode = fs.readFileSync(path.join(CLAUDE, 'skills', 'harness-setup', 'references', 'readiness-mode.md'), 'utf8');
    for (const phrase of [
        '**A team-owned repository gets a proposal, never a change.**',
        "One person's yes never changes checks the team owns.",
        '**One plain-language consent.**',
        'this mode never picks a tool',
        '**Never block the task.** Every outcome — proven, proposed or declined — continues the original task.',
        'never record a failing check as proven'
    ])
        assert.ok(mode.includes(phrase), `readiness mode lost: ${phrase}`);
    const harness = fs.readFileSync(path.join(CLAUDE, 'skills', 'harness-setup', 'SKILL.md'), 'utf8');
    assert.match(harness, /With `--mode=readiness`, read `references\/readiness-mode\.md` and follow it instead of the guards and phases below/);
});

test('TC-GWF-087: readiness never gates a prompt; the first-prompt rule for projects without a config is unchanged', () => {
    // Given the prompt hook that owns the no-config rule (BR-PCI-01)
    const hook = fs.readFileSync(path.join(CLAUDE, 'hooks', 'init-prompt-gate.cjs'), 'utf8');
    // Then it carries no readiness or harness gate: readiness runs only as a workflow step or on request
    assert.doesNotMatch(hook, /harness-readiness|harness-setup|readiness/i);
    // And no hook registration starts the readiness check
    const settings = fs.readFileSync(path.join(CLAUDE, 'settings.json'), 'utf8');
    assert.doesNotMatch(settings, /harness-readiness/);
});
