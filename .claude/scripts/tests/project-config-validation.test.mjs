import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The fail-CLOSED half of the two-plane resolution contract.
//
// `project-config-loader.cjs:66-74` wraps the read + parse of `docs/project-config.json` in a
// try/catch that caches `{}` for the process lifetime, so at RUNTIME a malformed config, an
// unreadable config, and an ABSENT config are indistinguishable: all three yield the documented
// default. That fail-soft behaviour is deliberate (a hook that throws would block every tool call)
// but it means the runtime plane can never detect a typo in a relocated root.
//
// This suite is therefore the ONLY place in the build where a declared-but-invalid root fails
// closed. It lives here, under the existing `scripts-tests` stage of `npm run verify:all`
// (`run-codex-sync.mjs` stage `scripts-tests` expands `.claude/scripts/tests/*.test.{mjs,cjs}`),
// rather than as a 20th pipeline stage: `verifier-pipeline-wiring.test.mjs:22` pins the roster at
// 19 stages and `:38` pins the matching prose in the MIRRORED `sync-codex/SKILL.md`, so a new
// stage would turn `codex:verify:sync-divergence` red until the user re-runs `/sync-codex`.
//
// Granular surface: `npm run codex:verify:project-config`.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..');
const schemaCli = path.join(repoRoot, '.claude', 'hooks', 'lib', 'project-config-schema.cjs');

const validate = configPath =>
    spawnSync(process.execPath, [schemaCli, '--validate', configPath], {
        cwd: repoRoot,
        encoding: 'utf-8',
        windowsHide: true
    });

// PORTABILITY: `docs/project-config.json` is OPTIONAL — this file's own docblock above describes
// the loader caching `{}` for an absent config, and TC-CONV-CONFIG-001 already skips on "no project
// config". Reading it unconditionally made three of these cases fail with a raw ENOENT in any
// project that copied `.claude` in before writing a config, which is the normal first-run order.
// A project that HAS a config still gets the full assertion; one that does not is not yet in scope.
const realConfigPath = path.join(repoRoot, 'docs', 'project-config.json');
const readRealConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(realConfigPath, 'utf-8'));
    } catch {
        return null;
    }
};

test('TC-DOCROOT-011: the real docs/project-config.json passes --validate (exit 0)', t => {
    if (!fs.existsSync(realConfigPath)) {
        t.skip('no project config — an absent config is the documented default, not an invalid one');
        return;
    }
    const result = validate(realConfigPath);
    assert.equal(result.status, 0, `--validate failed:\n${result.stdout}${result.stderr}`);
});

test('TC-DOCROOT-012: the hooks test fixture config passes --validate (R14, every new key optional)', () => {
    const fixture = path.join(repoRoot, '.claude', 'hooks', 'tests', 'docs', 'project-config.json');
    assert.ok(fs.existsSync(fixture), 'the second fixture config must exist');
    const parsed = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
    assert.equal(parsed.specRoots, undefined, 'fixture must keep declaring no specRoots');
    assert.equal(parsed.docsRoots, undefined, 'fixture must keep declaring no docsRoots');
    const result = validate(fixture);
    assert.equal(result.status, 0, `--validate failed:\n${result.stdout}${result.stderr}`);
});

test('TC-DOCROOT-015: --validate exits NON-ZERO on a declared docsRoots path that escapes the repo root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pcfg-'));
    try {
        // The real config is only a realistic BASE; the subject under test is the injected
        // `docsRoots`, so `{}` is an equally valid base when the project has no config yet.
        const source = readRealConfig() ?? {};
        const bad = path.join(dir, 'project-config.json');
        fs.writeFileSync(bad, JSON.stringify({ ...source, docsRoots: { plans: { path: '../escape' } } }), 'utf-8');

        const result = validate(bad);
        assert.notEqual(result.status, 0, 'an escaping declared root must fail the build');
        assert.match(result.stdout, /docsRoots\.plans\.path/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('TC-DOCROOT-006: --validate exits NON-ZERO on a partially declared docsRoots sub-object', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pcfg-'));
    try {
        const source = readRealConfig() ?? {};
        const bad = path.join(dir, 'project-config.json');
        fs.writeFileSync(bad, JSON.stringify({ ...source, docsRoots: { adr: {} } }), 'utf-8');

        const result = validate(bad);
        assert.notEqual(result.status, 0, 'partial declaration is an error, not a silent default');
        assert.match(result.stdout, /docsRoots\.adr\.path/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
