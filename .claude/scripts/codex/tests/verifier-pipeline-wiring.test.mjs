import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameworkPkg } from './framework-repo.helper.mjs';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const read = rel => fs.readFileSync(path.join(repoRoot, ...rel.split('/')), 'utf8');

function runnerStageIds(source) {
    return [...source.matchAll(/\bid:\s*["']([\w-]+)["']/g)].map(match => match[1]);
}

test('TC-PIPE-WIRE-001: freshness and registry gates follow tooling tests in the 18-stage runner', () => {
    const runner = read('.claude/skills/sync-codex/scripts/run-codex-sync.mjs');
    const ids = runnerStageIds(runner);

    assert.equal(ids.length, 18, `source docs and runner contract require 18 stages, got ${ids.length}`);
    assert.deepEqual(ids.slice(3, 7), ['tests', 'scripts-tests', 'tech-spec-freshness', 'feature-registry']);
    assert.match(runner, /generate-tech-specs\.mjs[\s\S]*id:\s*["']tech-spec-freshness["'][\s\S]*["']--check["']/);
    assert.match(runner, /id:\s*["']feature-registry["'][^\n]*verify-feature-registry\.mjs/);
});

test('TC-PIPE-WIRE-002: source skill docs expose the read-only commands and the complete stage roster', () => {
    const techSpec = read('.claude/skills/tech-spec/SKILL.md');
    const syncCodex = read('.claude/skills/sync-codex/SKILL.md');

    assert.match(techSpec, /npm run tech-spec:check/);
    assert.match(techSpec, /generate-tech-specs\.mjs --check/);
    assert.match(syncCodex, /18 stages, sequential/);
    assert.match(syncCodex, /\| 6\s+\| tech-spec-freshness/);
    assert.match(syncCodex, /\| 7\s+\| feature-registry/);
});

test('TC-PIPE-WIRE-003: framework npm surface names both gates and includes them in verify:all', () => {
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return;

    assert.equal(pkg.scripts['tech-spec:check'], 'node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs --check --optional');
    assert.equal(pkg.scripts['codex:verify:feature-registry'], 'node .claude/scripts/codex/verify-feature-registry.mjs --configured-roots --optional');
    assert.match(pkg.scripts['codex:verify:tech-spec-freshness'], /tech-spec:check/);
    assert.match(pkg.scripts['verify:all'], /scripts-tests,tech-spec-freshness,feature-registry/);
});
