#!/usr/bin/env node
'use strict';

/**
 * harness-readiness — the task-start readiness check (GuidedWorkflow BR-GWF-21).
 *
 * Answers one question cheaply: does this project have the deterministic checks a change needs (formatter,
 * linter, type check, tests), and are they proven? The optional first step of workflow-feature, workflow-bugfix
 * and workflow-implement-spec runs `/harness-setup --mode=readiness` only when this check reports `offer: true`,
 * so a ready project pays for one sub-second call and no skill load.
 *
 * Usage:
 *   node .claude/scripts/harness-readiness.cjs [--json] [--root <dir>]
 *   node .claude/scripts/harness-readiness.cjs --record=declined|proposed [--reason "<text>"] [--json] [--root <dir>]
 *
 * Reads only: the project config, the two committed proof records — the harness inventory's Summary table
 * (`harness-inventory.md` under the project-reference root) and the verify baseline (`.verify-baseline.json`,
 * where "proven" means the current command's hash is recorded) — root manifests and tool-config names, one level of
 * workspace package folders (at most MAX_PACKAGES), the `.github/workflows` listing and the local decision file.
 * It never walks the tree, runs no tool and uses no network. Detection writes nothing; only `--record` writes,
 * and only the local decision file under the project's `tmp/claude-temp/` (ck-paths owns that location), which is
 * never a tracked file — so recording a team proposal in a team-owned repository writes nothing the team owns.
 *
 * Verdicts: `ready` (every check proven, declined in the inventory or not applicable) · `gaps` (offer setup) ·
 * `declined` / `proposed` (a recorded, unexpired decision covers every current gap). The `runtime` and `verify`
 * rows and security inventory declarations are informational and never cause an offer. Security is not assessed.
 *
 * Exit codes: 0 the check ran (the verdict is in the output) · 2 usage error (message on stderr).
 * Evidence paths use `/` on every OS; the root is canonicalized with realpath before any read.
 */

const fs = require('fs');
const path = require('path');
const { readProjectConfigAt, getDocsRoot } = require('../hooks/lib/project-config-loader.cjs');
const { projectTmpDirFor, HARNESS_READINESS_DECISION_FILE } = require('../hooks/lib/ck-paths.cjs');
const { resolveProjectRoot } = require('../hooks/lib/project-root.cjs');
const { readBaseline, commandHash, BASELINE_FILE, KEY_VERSION } = require('../hooks/lib/verify-baseline.cjs');
const { VERIFY_COMMAND_KEYS } = require('../hooks/lib/project-config-schema.cjs');

const SCHEMA = 1;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_PACKAGES = 50;
const DECISION_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const OUTCOMES = ['declined', 'proposed'];
const INVENTORY_FILE = 'harness-inventory.md';

// The checks that decide the offer. Adding one is one entry here plus its detection rule in STACKS. `proofKey` is the
// testing.commands slot whose current command hash, recorded in the verify baseline, proves the check.
const CORE_SENSORS = [
    {
        id: 'formatter',
        noun: 'a formatter',
        proofKey: null,
        label: 'Formatter',
        why: 'Without a formatter every change carries layout noise, and review time goes to spacing instead of behavior.',
        setup: '/linter-setup --mode=brownfield (Formatter category)'
    },
    {
        id: 'linter',
        noun: 'a linter',
        proofKey: 'lint',
        label: 'Linter',
        why: 'Without a linter, common mistakes (unused code, unsafe calls, banned APIs) reach review or production instead of failing in seconds.',
        setup: '/linter-setup --mode=brownfield (Linter category)'
    },
    {
        id: 'typecheck',
        noun: 'a type check',
        proofKey: 'typecheck',
        label: 'Type check',
        why: 'Without a type check, a wrong argument or a missing field is found by a user at run time instead of by a check at edit time.',
        setup: '/linter-setup --mode=brownfield (Type check category)'
    },
    {
        id: 'tests',
        noun: 'a test runner',
        proofKey: 'affected',
        label: 'Tests',
        why: 'Without a test runner a fix cannot be proven: no regression test can fail before the fix and pass after it.',
        setup: '/harness-setup --mode=readiness (test runner step)'
    }
];

// Security declarations inform the audit/setup owner; they never expand the task-start offer.
const SECURITY_SENSORS = [
    { id: 'secrets', label: 'Secret scan' },
    { id: 'dependencies', label: 'Dependency scan' },
    { id: 'analysis', label: 'Security analysis' }
];

// Inventory Summary labels (`references/harness-inventory.md` in harness-setup) mapped to sensor ids.
const INVENTORY_LABELS = {
    formatter: 'formatter',
    linter: 'linter',
    'type check': 'typecheck',
    tests: 'tests',
    'verify command': 'verify',
    runtime: 'runtime',
    ...Object.fromEntries(SECURITY_SENSORS.map(sensor => [sensor.label.toLowerCase(), sensor.id]))
};
const INVENTORY_STATUSES = ['proven', 'configured', 'missing', 'declined', 'n/a'];
const RESOLVED = new Set(['proven', 'declined', 'n/a']);
const SECURITY_STATUSES = new Set([...INVENTORY_STATUSES, 'failed', 'blocked', 'unverified', 'not-run']);
const PLACEHOLDER_EVIDENCE = /^(?:[-—–…]|tbd|todo|unknown|none|n\/?a|not run|unverified)$/i;

const JS_LINT = /^(?:\.eslintrc(?:\.(?:js|cjs|mjs|json|ya?ml))?|eslint\.config\.(?:js|cjs|mjs|ts|mts|cts)|biome\.jsonc?|\.oxlintrc\.json|oxlintrc\.json)$/;
const JS_FORMAT = /^(?:\.prettierrc(?:\.(?:json5?|ya?ml|toml|js|cjs|mjs))?|prettier\.config\.(?:js|cjs|mjs|ts)|biome\.jsonc?|\.?dprint\.jsonc?)$/;
const JS_TEST_CONFIG = /^(?:(?:jest|vitest|ava)\.config\.(?:js|cjs|mjs|ts|mts|cts|json)|\.mocharc(?:\.(?:js|cjs|json|ya?ml))?)$/;
const NPM_PLACEHOLDER_TEST = /no test specified/i;
// A shared lint or format config package: `@scope/eslint-config`, `@scope/web-prettier-config`. It marks the team only when
// the team publishes it — same scope as the project's own package, or a local workspace/file link — so public presets
// (`@vue/eslint-config-typescript`) and tool packages (`@typescript-eslint/eslint-plugin`) never count.
const SHARED_CONFIG_PACKAGE = /^@([^/]+)\/(?:[a-z0-9-]+-)?(?:eslint|prettier|stylelint|biome)-config(?:-[a-z0-9-]+)?$/;
const LOCAL_LINK = /^(?:workspace|file|link):/;
const MAX_WORKSPACE_CANDIDATES = MAX_PACKAGES * 4;
const CI_FILES = ['.gitlab-ci.yml', 'azure-pipelines.yml', 'Jenkinsfile', 'bitbucket-pipelines.yml'];
const CODEOWNERS_PATHS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS', '.gitlab/CODEOWNERS'];
const START_SCRIPTS = ['start', 'dev', 'serve'];

const posix = value => value.split(path.sep).join('/');

/** A read-only view of one folder: its entry names and capped reads of its files. */
function folderView(root, rel = '') {
    const dir = rel ? path.join(root, rel) : root;
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        entries = [];
    }
    const names = new Set(entries.map(entry => entry.name));
    const dirs = new Set(entries.filter(entry => entry.isDirectory()).map(entry => entry.name));
    const cache = new Map();
    const at = name => (rel ? `${rel}/${name}` : name);
    const read = name => {
        if (cache.has(name)) return cache.get(name);
        let text = null;
        if (names.has(name) && !dirs.has(name)) {
            try {
                const file = path.join(dir, name);
                if (fs.statSync(file).size <= MAX_FILE_BYTES) text = fs.readFileSync(file, 'utf8');
            } catch {
                text = null;
            }
        }
        cache.set(name, text);
        return text;
    };
    const json = name => {
        const text = read(name);
        if (text === null) return null;
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    };
    const find = pattern => [...names].filter(name => pattern.test(name)).sort();
    return { root, rel, names, dirs, read, json, find, at };
}

const tomlSection = (text, name) => text !== null && new RegExp(`^\\s*\\[${name.replace(/[.[\]]/g, '\\$&')}[\\].]`, 'm').test(text);
const iniSection = (text, name) => text !== null && new RegExp(`^\\s*\\[${name.replace(/[.:]/g, '\\$&')}\\]`, 'm').test(text);

/** Detection for one Node package folder: evidence strings per core sensor, or null when none is found. */
function nodeEvidence(view) {
    const pkg = view.json('package.json') || {};
    const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
    const manifest = view.at('package.json');
    const firstOf = (...candidates) => candidates.find(Boolean) || null;
    const configs = pattern => view.find(pattern).map(view.at)[0];
    const script = name => (typeof scripts[name] === 'string' && scripts[name].trim() ? `${manifest} → scripts.${name}` : null);
    const jsconfig = view.read('jsconfig.json');
    return {
        formatter: firstOf(configs(JS_FORMAT), pkg.prettier !== undefined && `${manifest} → prettier`, script('format')),
        linter: firstOf(configs(JS_LINT), pkg.eslintConfig !== undefined && `${manifest} → eslintConfig`, script('lint')),
        typecheck: firstOf(
            view.names.has('tsconfig.json') && view.at('tsconfig.json'),
            jsconfig !== null && /"checkJs"\s*:\s*true/.test(jsconfig) && `${view.at('jsconfig.json')} → checkJs`,
            script('typecheck'),
            script('type-check')
        ),
        tests: firstOf(
            typeof scripts.test === 'string' && scripts.test.trim() && !NPM_PLACEHOLDER_TEST.test(scripts.test) && `${manifest} → scripts.test`,
            configs(JS_TEST_CONFIG)
        )
    };
}

function pythonEvidence(view) {
    const pyproject = view.read('pyproject.toml');
    const setupCfg = view.read('setup.cfg');
    const tox = view.read('tox.ini');
    const requirements = view.find(/^requirements.*\.txt$/).map(name => [name, view.read(name) || '']);
    // The exact distribution name, so `mypy-extensions` never reads as mypy.
    const listed = tool => {
        const hit = requirements.find(([, text]) => new RegExp(`^\\s*${tool}(?=\\s*(?:[=<>!~;[]|$))`, 'im').test(text));
        return hit ? `${view.at(hit[0])} lists ${tool}` : null;
    };
    const file = name => view.names.has(name) && view.at(name);
    const ruffSource = file('ruff.toml') || file('.ruff.toml') || (tomlSection(pyproject, 'tool.ruff') && view.at('pyproject.toml'));
    const ruff = ruffSource || (requirements.some(([, text]) => /^\s*ruff(?=\s*(?:[=<>!~;[]|$))/im.test(text)) && 'ruff in requirements');
    const section = (text, source, name, kind = 'toml') =>
        (kind === 'toml' ? tomlSection(text, name) : iniSection(text, name)) && `${view.at(source)} → [${name}]`;
    const firstOf = (...candidates) => candidates.find(Boolean) || null;
    return {
        formatter: firstOf(
            section(pyproject, 'pyproject.toml', 'tool.black'),
            section(pyproject, 'pyproject.toml', 'tool.ruff.format'),
            section(pyproject, 'pyproject.toml', 'tool.yapf'),
            file('.style.yapf'),
            listed('black'),
            ruff && `${ruff} (ruff format ships with Ruff)`
        ),
        linter: firstOf(
            file('ruff.toml'),
            file('.ruff.toml'),
            section(pyproject, 'pyproject.toml', 'tool.ruff'),
            file('.flake8'),
            section(setupCfg, 'setup.cfg', 'flake8', 'ini'),
            section(tox, 'tox.ini', 'flake8', 'ini'),
            file('.pylintrc'),
            file('pylintrc'),
            section(pyproject, 'pyproject.toml', 'tool.pylint'),
            listed('ruff'),
            listed('flake8'),
            listed('pylint')
        ),
        typecheck: firstOf(
            file('mypy.ini'),
            file('.mypy.ini'),
            file('pyrightconfig.json'),
            section(pyproject, 'pyproject.toml', 'tool.mypy'),
            section(pyproject, 'pyproject.toml', 'tool.pyright'),
            section(pyproject, 'pyproject.toml', 'tool.basedpyright'),
            section(setupCfg, 'setup.cfg', 'mypy', 'ini'),
            listed('mypy'),
            listed('pyright')
        ),
        tests: firstOf(
            file('pytest.ini'),
            file('conftest.py'),
            section(pyproject, 'pyproject.toml', 'tool.pytest.ini_options'),
            section(setupCfg, 'setup.cfg', 'tool:pytest', 'ini'),
            section(tox, 'tox.ini', 'pytest', 'ini'),
            view.dirs.has('tests') && `${view.at('tests')}/`,
            view.dirs.has('test') && `${view.at('test')}/`,
            listed('pytest')
        )
    };
}

/** Compiled toolchains ship some checks with the compiler; the evidence says so, so nobody mistakes it for a config. */
function goEvidence(view) {
    const golangci = view.find(/^\.golangci\.(?:ya?ml|toml|json)$/)[0];
    return {
        formatter: 'go.mod (gofmt ships with the Go toolchain)',
        linter: golangci ? view.at(golangci) : null,
        typecheck: 'go.mod (the Go compiler type-checks every build)',
        tests: 'go.mod (go test ships with the Go toolchain)'
    };
}

function rustEvidence(view) {
    const cargo = view.read('Cargo.toml');
    return {
        formatter: view.names.has('rustfmt.toml') || view.names.has('.rustfmt.toml') ? 'rustfmt.toml' : 'Cargo.toml (rustfmt ships with the Rust toolchain)',
        linter: view.names.has('clippy.toml') || view.names.has('.clippy.toml') ? 'clippy.toml' : tomlSection(cargo, 'lints') ? 'Cargo.toml → [lints]' : null,
        typecheck: 'Cargo.toml (the Rust compiler type-checks every build)',
        tests: 'Cargo.toml (cargo test ships with the Rust toolchain)'
    };
}

function jvmEvidence(view) {
    const build = ['pom.xml', 'build.gradle', 'build.gradle.kts'].find(name => view.names.has(name));
    const text = (build && view.read(build)) || '';
    const plugin = pattern => (pattern.test(text) ? `${build} → ${text.match(pattern)[0]}` : null);
    return {
        formatter: plugin(/spotless|ktlint|ktfmt|google-java-format/i),
        linter: plugin(/checkstyle|pmd|spotbugs|detekt|errorprone|ktlint/i),
        typecheck: `${build} (the compiler type-checks every build)`,
        tests: view.dirs.has('src') && fs.existsSync(path.join(view.root, view.rel, 'src', 'test')) ? 'src/test/' : plugin(/junit|testng|kotest|spock/i)
    };
}

function dotnetEvidence(view) {
    const project = view.find(/\.(?:sln|slnx|csproj|fsproj|vbproj)$/)[0] || 'Directory.Build.props';
    const props = view.read('Directory.Build.props') || '';
    const editorconfig = view.read('.editorconfig') || '';
    const testProject = [...view.dirs].find(name => /(?:^|\.)(?:Unit|Integration)?Tests?$/i.test(name));
    return {
        formatter: /\[\*\.(?:cs|\{[^}]*cs[^}]*\})\]/.test(editorconfig) ? '.editorconfig (C# rules for dotnet format)' : null,
        linter: /AnalysisLevel|AnalysisMode|EnforceCodeStyleInBuild|TreatWarningsAsErrors/.test(props) ? 'Directory.Build.props (analyzers enabled)' : null,
        typecheck: `${project} (the compiler type-checks every build)`,
        tests: testProject ? `${testProject}/` : null
    };
}

// One rule per stack; a new stack is one entry here.
const STACKS = [
    { id: 'node', label: 'JavaScript/TypeScript', present: view => view.names.has('package.json'), evidence: nodeEvidence },
    {
        id: 'python',
        label: 'Python',
        present: view =>
            ['pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile'].some(name => view.names.has(name)) || view.find(/^requirements.*\.txt$/).length > 0,
        evidence: pythonEvidence
    },
    { id: 'go', label: 'Go', present: view => view.names.has('go.mod'), evidence: goEvidence },
    { id: 'rust', label: 'Rust', present: view => view.names.has('Cargo.toml'), evidence: rustEvidence },
    {
        id: 'jvm',
        label: 'Java/Kotlin',
        present: view => ['pom.xml', 'build.gradle', 'build.gradle.kts'].some(name => view.names.has(name)),
        evidence: jvmEvidence
    },
    {
        id: 'dotnet',
        label: '.NET',
        present: view => view.find(/\.(?:sln|slnx|csproj|fsproj|vbproj)$/).length > 0 || view.names.has('Directory.Build.props'),
        evidence: dotnetEvidence
    }
];

/** Workspace package folders from `package.json` workspaces or `pnpm-workspace.yaml`, one level per pattern, capped. */
function workspaceOf(rootView) {
    const pkg = rootView.json('package.json') || {};
    const declared = Array.isArray(pkg.workspaces) ? pkg.workspaces : Array.isArray(pkg.workspaces?.packages) ? pkg.workspaces.packages : null;
    const pnpm = rootView.read('pnpm-workspace.yaml');
    const graphTool = ['nx.json', 'turbo.json', 'lerna.json', 'rush.json', 'WORKSPACE', 'WORKSPACE.bazel', 'MODULE.bazel'].find(name =>
        rootView.names.has(name)
    );
    let shape = 'single';
    let patterns = [];
    if (pnpm !== null) {
        shape = 'pnpm-workspaces';
        // Block list items (`- 'apps/*'`) and the flow form (`packages: ['apps/*', 'libs/*']`).
        const flow = /^\s*packages:\s*\[([^\]]*)\]/m.exec(pnpm);
        patterns = flow
            ? flow[1]
                  .split(',')
                  .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
                  .filter(Boolean)
            : [...pnpm.matchAll(/^\s*-\s*['"]?([^'"#\s]+)['"]?/gm)].map(match => match[1]);
    } else if (declared) {
        shape = 'npm-workspaces';
        patterns = declared.filter(item => typeof item === 'string');
    }
    const packages = [];
    let truncated = false;
    let examined = 0;
    const skipped = [];
    for (const pattern of patterns.filter(item => !item.startsWith('!'))) {
        const clean = pattern
            .replace(/\\/g, '/')
            .replace(/\/+$/, '')
            .replace(/\/\*\*$/, '/*');
        const slash = clean.lastIndexOf('/');
        const parent = slash < 0 ? '' : clean.slice(0, slash);
        const leaf = slash < 0 ? clean : clean.slice(slash + 1);
        // One wildcard level, in the last segment only (`packages/*`, `packages/plugin-*`); anything deeper is reported, not guessed.
        if (clean.includes('..') || path.isAbsolute(clean) || parent.includes('*') || (!parent && leaf.includes('*'))) {
            skipped.push(pattern);
            continue;
        }
        const match = new RegExp(`^${leaf.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
        const candidates = leaf.includes('*')
            ? [...folderView(rootView.root, parent).dirs]
                  .filter(name => match.test(name))
                  .sort()
                  .map(name => `${parent}/${name}`)
            : [clean];
        for (const rel of candidates) {
            if (packages.length >= MAX_PACKAGES || examined >= MAX_WORKSPACE_CANDIDATES) {
                truncated = true;
                break;
            }
            examined += 1;
            if (fs.existsSync(path.join(rootView.root, rel, 'package.json'))) packages.push(rel);
        }
    }
    const stackCount = STACKS.filter(stack => stack.present(rootView)).length;
    if (graphTool && shape === 'single') shape = 'unknown';
    const placement =
        shape === 'unknown' || stackCount > 1
            ? 'propose: the repository shape is unknown or mixed, so a placement is proposed with its evidence and applied only after a yes'
            : shape === 'single'
              ? 'root: one tool config and one baseline at the root'
              : 'root: one root config with per-package overrides only where packages differ; a package config that already exists is kept';
    return { shape, buildGraphTool: graphTool || null, packages, truncated, placement, ...(skipped.length ? { skippedPatterns: skipped } : {}) };
}

/** The Summary table of the committed inventory: sensor id → { status, evidence }. */
function readInventory(root, config) {
    const rel = `${getDocsRoot('projectReference', config)}/${INVENTORY_FILE}`;
    const result = { path: rel, found: false, rows: {} };
    let text;
    try {
        const file = path.join(root, rel);
        if (fs.statSync(file).size > MAX_FILE_BYTES) return result;
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return result;
    }
    result.found = true;
    const summary = text.split(/^##\s+/m).find(part => /^Summary\b/.test(part)) || '';
    for (const line of summary.split('\n')) {
        if (!line.trim().startsWith('|')) continue;
        const cells = line
            .trim()
            .replace(/^\||\|$/g, '')
            .split('|')
            .map(cell => cell.trim());
        const id = INVENTORY_LABELS[(cells[0] || '').toLowerCase()];
        const status = (cells[1] || '').replace(/[`*]/g, '').trim().toLowerCase();
        if (!id) continue;
        if (id === 'runtime') {
            if (['configured', 'derivable', 'none', 'not-applicable'].includes(status)) result.rows.runtime = { status, evidence: cells[2] || '' };
            continue;
        }
        if (SECURITY_SENSORS.some(sensor => sensor.id === id)) {
            result.rows[id] = { status: SECURITY_STATUSES.has(status) ? status : 'unverified', evidence: cells[2] || '' };
            continue;
        }
        if (INVENTORY_STATUSES.includes(status)) result.rows[id] = { status, evidence: cells[2] || '' };
    }
    return result;
}

function ownershipOf(rootView) {
    const signals = [];
    for (const rel of CODEOWNERS_PATHS) if (fs.existsSync(path.join(rootView.root, rel))) signals.push(`${rel} (code owners review changes)`);
    for (const rel of ciFiles(rootView)) signals.push(`${rel} (a CI pipeline the team relies on)`);
    const pkg = rootView.json('package.json') || {};
    const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
    const ownScope = typeof pkg.name === 'string' && /^@([^/]+)\//.exec(pkg.name)?.[1];
    const versions = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const shared = deps.filter(name => {
        const scope = SHARED_CONFIG_PACKAGE.exec(name)?.[1];
        return Boolean(scope) && (scope === ownScope || LOCAL_LINK.test(String(versions[name])));
    });
    for (const dep of shared.sort()) signals.push(`package.json → ${dep} (the team's shared lint or format config)`);
    if (typeof pkg.prettier === 'string' && ownScope && pkg.prettier.startsWith(`@${ownScope}/`))
        signals.push(`package.json → prettier: ${pkg.prettier} (the team's shared format config)`);
    return { teamOwned: signals.length > 0, signals };
}

function ciFiles(rootView) {
    const found = CI_FILES.filter(name => rootView.names.has(name));
    const workflows = folderView(rootView.root, '.github/workflows').find(/\.ya?ml$/);
    found.push(...workflows.map(name => `.github/workflows/${name}`));
    if (rootView.dirs.has('.circleci')) found.push('.circleci/');
    return found;
}

function runtimeOf(rootView, config, inventoryRow) {
    const surfaces = Array.isArray(config?.experienceVerification?.surfaces) ? config.experienceVerification.surfaces : [];
    const local = surfaces.find(
        surface => surface && surface.localRun && typeof surface.localRun.startCommand === 'string' && surface.localRun.startCommand.trim()
    );
    if (local) return { status: 'configured', evidence: `experienceVerification.surfaces[${surfaces.indexOf(local)}].localRun.startCommand` };
    const exp = config?.experienceVerification;
    if (exp && exp.enabled === false && typeof exp.notApplicableReason === 'string' && exp.notApplicableReason.trim())
        return { status: 'not-applicable', evidence: 'experienceVerification.notApplicableReason' };
    if (inventoryRow) return { status: inventoryRow.status, evidence: `harness inventory: ${inventoryRow.evidence || 'Runtime row'}` };
    const pkg = rootView.json('package.json');
    const scripts = pkg && pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
    const startScript = START_SCRIPTS.find(name => typeof scripts[name] === 'string' && scripts[name].trim());
    if (startScript) return { status: 'derivable', evidence: `package.json → scripts.${startScript}` };
    const runFile = ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml', 'Procfile', 'manage.py', 'app.py', 'main.py', 'main.go'].find(
        name => rootView.names.has(name)
    );
    if (runFile) return { status: 'derivable', evidence: runFile };
    if (pkg && !startScript && !pkg.bin && (pkg.main || pkg.exports || pkg.module))
        return { status: 'not-applicable', evidence: 'package.json declares a library entry (main/exports) with no bin or start script' };
    const pyproject = rootView.read('pyproject.toml');
    if (pyproject !== null && tomlSection(pyproject, 'build-system') && !tomlSection(pyproject, 'project.scripts'))
        return { status: 'not-applicable', evidence: 'pyproject.toml declares a build system with no [project.scripts] entry point' };
    return { status: 'none', evidence: 'no start command found in the config, manifest scripts or a compose/Procfile' };
}

const commandsOf = config => (config?.testing?.commands && typeof config.testing.commands === 'object' ? config.testing.commands : {});
const commandAt = (config, key) => (typeof commandsOf(config)[key] === 'string' && commandsOf(config)[key].trim() ? commandsOf(config)[key] : null);

/** The verify baseline proves a command slot when it records the hash of the command declared now. */
function baselineProof(baseline, config, key) {
    const command = key ? commandAt(config, key) : null;
    if (!command || command.trim() === 'none' || !baseline) return null;
    const slot = baseline.commands[key];
    // A baseline whose failure keys were formed another way is stale (verify-receipt.cjs asks for --replace), never proof.
    if (baseline.keyVersion !== KEY_VERSION) return null;
    return slot && slot.commandHash === commandHash(command) ? `${BASELINE_FILE} → ${key} (the current command's hash is recorded)` : null;
}

function verifyOf(config, inventoryRow, baseline) {
    const proof = baselineProof(baseline, config, 'verify') || baselineProof(baseline, config, 'affected');
    if (proof) return { status: 'proven', evidence: proof };
    if (inventoryRow) return { status: inventoryRow.status, evidence: `harness inventory: ${inventoryRow.evidence || 'Verify command row'}` };
    const key = ['verify', 'affected'].find(name => commandAt(config, name));
    return key
        ? { status: 'configured', evidence: `testing.commands.${key}` }
        : { status: 'missing', evidence: 'no testing.commands.verify or testing.commands.affected' };
}

/** Config-declared commands count as configured evidence for their sensor. */
function configEvidence(config) {
    const commands = commandsOf(config);
    const has = key => Boolean(commandAt(config, key)) && commands[key].trim() !== 'none';
    const testKey = [
        'affected',
        ...Object.keys(commands)
            .filter(key => !VERIFY_COMMAND_KEYS.includes(key) && key !== 'format')
            .sort()
    ].find(has);
    const formatting = config?.formatting || {};
    return {
        formatter: has('format')
            ? 'testing.commands.format'
            : typeof formatting.command === 'string' && formatting.command.trim()
              ? 'formatting.command'
              : typeof formatting.formatter === 'string' && formatting.formatter.trim() && formatting.formatter !== 'none'
                ? `formatting.formatter: ${formatting.formatter}`
                : null,
        linter: has('lint') ? 'testing.commands.lint' : has('lintFile') ? 'testing.commands.lintFile' : null,
        typecheck: has('typecheck') ? 'testing.commands.typecheck' : null,
        tests: testKey ? `testing.commands.${testKey}` : null
    };
}

/** Inventory declarations only: no command execution, automatic risk acceptance or freshness claim. */
function securityOf(inventory) {
    const sensors = Object.fromEntries(
        SECURITY_SENSORS.map(sensor => {
            const row = inventory.rows[sensor.id];
            const evidence = row?.evidence.replace(/[`*]/g, '').trim() || '';
            const hasEvidence = Boolean(evidence) && !PLACEHOLDER_EVIDENCE.test(evidence);
            return [
                sensor.id,
                {
                    status: !row ? 'missing' : hasEvidence ? row.status : 'unverified',
                    source: 'inventory',
                    evidence: hasEvidence ? [`${inventory.path}: ${row.evidence}`] : [],
                    ...(row ? { recordedStatus: row.status } : {})
                }
            ];
        })
    );
    return {
        informational: true,
        assurance: 'not-assessed',
        note: 'Recorded inventory claims only; no scanner ran and no evidence freshness was verified. Core readiness is not security approval.',
        sensors
    };
}

function decisionPath(root) {
    return path.join(projectTmpDirFor(root), HARNESS_READINESS_DECISION_FILE);
}

function readDecision(root) {
    try {
        const data = JSON.parse(fs.readFileSync(decisionPath(root), 'utf8'));
        if (!data || !OUTCOMES.includes(data.outcome) || !Array.isArray(data.gaps)) return null;
        if (Number.isNaN(Date.parse(data.expiresAt)) || Number.isNaN(Date.parse(data.recordedAt))) return null;
        return data;
    } catch {
        return null;
    }
}

function gapMessage(sensor, status, ownership, stacks) {
    const scope = stacks.length ? ` for ${stacks.map(stack => stack.label).join(' and ')}` : '';
    if (status === 'configured')
        return {
            sensor: sensor.id,
            status,
            why: `${sensor.noun[0].toUpperCase()}${sensor.noun.slice(1)} is configured${scope} but no passing run is recorded, so nobody knows whether it passes today or whether a new failure would be noticed.`,
            fix: ownership.teamOwned
                ? `Run it once and propose recording it as proven in the team's harness inventory; nothing is written here because the team owns this repository's checks.`
                : `Run it once through /harness-setup --mode=readiness, which records it as proven (or baselined) in ${sensor.proofKey ? 'the verify baseline or ' : ''}the harness inventory.`
        };
    const unknown = stacks.length === 0 ? ' No manifest this check recognises was found, so the stack must be researched first.' : '';
    return {
        sensor: sensor.id,
        status,
        why: `${sensor.why}${unknown}`,
        fix: ownership.teamOwned
            ? `Propose ${sensor.setup.split(' (')[0]} to the team as a written change; nothing is written here because the team owns this repository's checks.`
            : stacks.length === 0
              ? `Run /harness-setup --mode=readiness: it researches the stack first, then asks one plain-language question per tool with the recommended option first.`
              : `Run ${sensor.setup}: one plain-language question per tool, the recommended option first, and a baseline so today's code stays green.`
    };
}

/**
 * Detect readiness for one project root. Pure: reads files, writes nothing.
 * @param {string} rootDir existing project directory
 * @param {{ now?: number }} [options]
 */
function detectReadiness(rootDir, options = {}) {
    const started = Date.now();
    const now = options.now ?? Date.now();
    const root = fs.realpathSync(rootDir);
    const status = readProjectConfigAt(root);
    const config = status.state === 'valid' ? status.config : {};
    const rootView = folderView(root);
    const stacks = STACKS.filter(stack => stack.present(rootView));
    const workspace = workspaceOf(rootView);
    const packageViews = workspace.packages.map(rel => folderView(root, rel));
    const inventory = readInventory(root, config);
    const ownership = ownershipOf(rootView);
    const fromConfig = configEvidence(config);
    const verifyBaseline = readBaseline(root);
    const baseline = verifyBaseline.status === 'ok' ? verifyBaseline.baseline : null;
    // One evidence pass per stack and folder: workspace packages count for the Node stack only.
    const evidenceByStack = new Map(
        stacks.map(stack => [stack.id, (stack.id === 'node' ? [rootView, ...packageViews] : [rootView]).map(view => stack.evidence(view))])
    );

    const sensors = {};
    for (const sensor of CORE_SENSORS) {
        const row = inventory.rows[sensor.id];
        if (row && RESOLVED.has(row.status)) {
            sensors[sensor.id] = { status: row.status, source: 'inventory', evidence: [`${inventory.path}: ${row.evidence || sensor.label + ' row'}`] };
            continue;
        }
        if (sensor.proofKey && commandAt(config, sensor.proofKey)?.trim() === 'none') {
            sensors[sensor.id] = { status: 'n/a', source: 'config', evidence: [`testing.commands.${sensor.proofKey}: none`] };
            continue;
        }
        const proof = baselineProof(baseline, config, sensor.proofKey);
        if (proof) {
            sensors[sensor.id] = { status: 'proven', source: 'verify-baseline', evidence: [proof] };
            continue;
        }
        const evidence = [];
        const missingIn = [];
        if (fromConfig[sensor.id]) evidence.push(fromConfig[sensor.id]);
        for (const stack of stacks) {
            const found = evidenceByStack
                .get(stack.id)
                .map(perView => perView[sensor.id])
                .filter(Boolean);
            if (found.length) evidence.push(...found);
            else if (!fromConfig[sensor.id]) missingIn.push(stack);
        }
        const configured = evidence.length > 0 && missingIn.length === 0;
        sensors[sensor.id] = {
            status: configured ? 'configured' : 'missing',
            source: 'detected',
            evidence: [...new Set(evidence)].map(posix),
            ...(missingIn.length ? { missingFor: missingIn.map(stack => stack.id) } : {})
        };
    }

    const gaps = CORE_SENSORS.filter(sensor => !RESOLVED.has(sensors[sensor.id].status)).map(sensor => {
        const missingFor = stacks.filter(stack => (sensors[sensor.id].missingFor || []).includes(stack.id));
        return gapMessage(sensor, sensors[sensor.id].status, ownership, missingFor.length ? missingFor : stacks);
    });
    const recorded = readDecision(root);
    const covers = Boolean(recorded && gaps.length > 0 && now < Date.parse(recorded.expiresAt) && gaps.every(gap => recorded.gaps.includes(gap.sensor)));
    const verdict = gaps.length === 0 ? 'ready' : covers ? recorded.outcome : 'gaps';
    const action = ownership.teamOwned ? 'propose' : 'setup';
    const decision = recorded
        ? {
              outcome: recorded.outcome,
              recordedAt: recorded.recordedAt,
              expiresAt: recorded.expiresAt,
              gaps: recorded.gaps,
              covers,
              ...(covers
                  ? {}
                  : { why: now >= Date.parse(recorded.expiresAt) ? 'expired' : gaps.length === 0 ? 'no gaps remain' : 'a gap it does not name appeared' })
          }
        : null;
    return {
        schema: SCHEMA,
        verdict,
        offer: verdict === 'gaps',
        action,
        summary: summaryOf(verdict, gaps, ownership, recorded),
        config: status.state,
        ...(status.state === 'invalid' ? { configNote: 'The project config is invalid, so its commands were ignored; repair it with /project-config.' } : {}),
        inventory: { path: inventory.path, found: inventory.found },
        verifyBaseline: {
            path: BASELINE_FILE,
            status: verifyBaseline.status,
            ...(verifyBaseline.reason ? { note: `${verifyBaseline.reason}; it proves nothing until repaired` } : {})
        },
        stacks: stacks.map(stack => stack.id),
        workspace: {
            shape: workspace.shape,
            buildGraphTool: workspace.buildGraphTool,
            packages: workspace.packages.length,
            truncated: workspace.truncated,
            placement: workspace.placement,
            ...(workspace.skippedPatterns ? { skippedPatterns: workspace.skippedPatterns } : {})
        },
        sensors,
        security: securityOf(inventory),
        gaps,
        ownership,
        decision,
        runtime: { ...runtimeOf(rootView, config, inventory.rows.runtime), informational: true },
        verify: { ...verifyOf(config, inventory.rows.verify, baseline), informational: true },
        elapsedMs: Date.now() - started
    };
}

function summaryOf(verdict, gaps, ownership, recorded) {
    if (verdict === 'ready')
        return 'Ready: every check (formatter, linter, type check, tests) is proven, declined in the inventory or not applicable. Nothing to offer.';
    const names = gaps.map(gap => `${gap.sensor} (${gap.status})`).join(', ');
    if (verdict !== 'gaps')
        return `No offer: a ${recorded.outcome} decision recorded ${recorded.recordedAt.slice(0, 10)} still covers ${names}; it expires ${recorded.expiresAt.slice(0, 10)}.`;
    return ownership.teamOwned
        ? `Gaps: ${names}. The team owns this repository's checks (${ownership.signals[0]}), so propose the setup in writing and change nothing.`
        : `Gaps: ${names}. Offer setup once, in plain words, and run it only on a yes.`;
}

/** Record the answer to the offer. Writes only the local decision file; refuses when nothing is open. */
function recordDecision(rootDir, outcome, reason = '', options = {}) {
    if (!OUTCOMES.includes(outcome)) throw usageError(`--record must be one of: ${OUTCOMES.join(', ')}`);
    const now = options.now ?? Date.now();
    const result = detectReadiness(rootDir, { now });
    if (result.gaps.length === 0) return { recorded: false, why: 'Nothing to record: no check is missing or unproven.', result };
    const root = fs.realpathSync(rootDir);
    const data = {
        schema: SCHEMA,
        outcome,
        recordedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + DECISION_TTL_DAYS * DAY_MS).toISOString(),
        ttlDays: DECISION_TTL_DAYS,
        gaps: result.gaps.map(gap => gap.sensor),
        reason: String(reason).replace(/\s+/g, ' ').trim().slice(0, 300)
    };
    const file = decisionPath(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.renameSync(temp, file);
    return { recorded: true, path: posix(path.relative(root, file)), decision: data, result: detectReadiness(root, { now }) };
}

function usageError(message) {
    return Object.assign(new Error(message), { usage: true });
}

const USAGE = [
    'Usage: node .claude/scripts/harness-readiness.cjs [--json] [--root <dir>]',
    '       node .claude/scripts/harness-readiness.cjs --record=declined|proposed [--reason "<text>"] [--json] [--root <dir>]'
].join('\n');

function parseArgs(argv) {
    const options = { json: false, root: null, record: null, reason: '' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const value = () => {
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) throw usageError(`${arg} needs a value`);
            i += 1;
            return next;
        };
        if (arg === '--json') options.json = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--root') options.root = value();
        else if (arg.startsWith('--root=')) options.root = arg.slice(7);
        else if (arg === '--record') options.record = value();
        else if (arg.startsWith('--record=')) options.record = arg.slice(9);
        else if (arg === '--reason') options.reason = value();
        else if (arg.startsWith('--reason=')) options.reason = arg.slice(9);
        else throw usageError(`Unknown argument: ${arg}`);
    }
    if (options.reason && !options.record) throw usageError('--reason is used only with --record');
    return options;
}

function humanReport(result) {
    const lines = [`Harness readiness: ${result.verdict}${result.offer ? ' (offer setup)' : ''}`, result.summary];
    for (const sensor of CORE_SENSORS) {
        const entry = result.sensors[sensor.id];
        lines.push(`  ${sensor.label}: ${entry.status}${entry.evidence.length ? ` — ${entry.evidence.join('; ')}` : ''}`);
    }
    for (const gap of result.gaps) lines.push(`  · ${gap.sensor} — why: ${gap.why}`, `    fix: ${gap.fix}`);
    lines.push(`  Security (informational, not assessed): ${result.security.note}`);
    for (const sensor of SECURITY_SENSORS) {
        const entry = result.security.sensors[sensor.id];
        lines.push(`    ${sensor.label}: ${entry.status}${entry.recordedStatus ? ' (recorded only)' : ''}`);
    }
    lines.push(`  Runtime (informational): ${result.runtime.status} — ${result.runtime.evidence}`);
    if (result.ownership.teamOwned) lines.push(`  Team-owned: ${result.ownership.signals.join('; ')}`);
    return lines.join('\n') + '\n';
}

function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
    let options;
    try {
        options = parseArgs(argv);
    } catch (error) {
        io.stderr.write(`harness-readiness: ${error.message}\n${USAGE}\n`);
        return 2;
    }
    if (options.help) {
        io.stdout.write(`${USAGE}\n`);
        return 0;
    }
    const root = options.root ? path.resolve(options.root) : resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        io.stderr.write(`harness-readiness: the project root ${root} is not a directory. Pass an existing folder with --root.\n`);
        return 2;
    }
    try {
        if (options.record) {
            const outcome = recordDecision(root, options.record, options.reason);
            if (options.json) io.stdout.write(JSON.stringify(outcome, null, 2) + '\n');
            else
                io.stdout.write(
                    outcome.recorded
                        ? `Recorded ${options.record} in ${outcome.path} until ${outcome.decision.expiresAt.slice(0, 10)} for: ${outcome.decision.gaps.join(', ')}.\n`
                        : `${outcome.why}\n`
                );
            return 0;
        }
        const result = detectReadiness(root);
        io.stdout.write(options.json ? JSON.stringify(result, null, 2) + '\n' : humanReport(result));
        return 0;
    } catch (error) {
        if (!error.usage) throw error;
        io.stderr.write(`harness-readiness: ${error.message}\n${USAGE}\n`);
        return 2;
    }
}

module.exports = { detectReadiness, recordDecision, main, CORE_SENSORS, DECISION_TTL_DAYS, MAX_PACKAGES };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
