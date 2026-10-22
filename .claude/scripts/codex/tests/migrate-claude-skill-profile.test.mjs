import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyClaudeSkillProfile } from '../migrate-claude-to-codex.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function project({ profile, settings = '{}\n' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcsp-'));
  fs.mkdirSync(path.join(root, '.claude', 'config'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, '.claude', 'config', 'skill-profiles.json'), path.join(root, '.claude', 'config', 'skill-profiles.json'));
  for (const name of ['heavy-audit', 'light-note']) {
    fs.mkdirSync(path.join(root, '.claude', 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(root, '.claude', 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: test skill\n---\n`);
  }
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), settings);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  const config = { project: { name: 'fixture' } };
  if (profile) config.skillProfile = profile;
  fs.writeFileSync(path.join(root, 'docs', 'project-config.json'), JSON.stringify(config));
  return root;
}
const overrides = root => JSON.parse(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8')).skillOverrides;

// Invariant: the sync stage that hides a skill on Codex also hides it on Claude, so a framework refresh that
// replaced settings.json cannot leave the two hosts disagreeing about which skills start on their own.
test('a refreshed settings.json without the project overrides is restored by the migrate stage', () => {
  const root = project({ profile: { commandOnly: ['heavy-audit'] } });
  const lines = applyClaudeSkillProfile(root);
  assert.deepEqual(overrides(root), { 'heavy-audit': 'user-invocable-only' });
  assert.match(lines.join('\n'), /restored Claude skillOverrides/);
  assert.deepEqual(applyClaudeSkillProfile(root), [], 'a second run is a no-op');
});

// Invariant: a project that declares no skill profile keeps its settings bytes untouched.
test('a project without a skill profile is left unchanged', () => {
  const settings = '{\n  "env": {}\n}\n';
  const root = project({ settings });
  assert.deepEqual(applyClaudeSkillProfile(root), []);
  assert.equal(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'), settings);
});

// Invariant: an override someone set by hand is never overwritten; it is reported as a conflict.
test('a user-owned override is kept and reported', () => {
  const root = project({ profile: { commandOnly: ['heavy-audit'] }, settings: '{\n  "skillOverrides": { "heavy-audit": "on" }\n}\n' });
  const lines = applyClaudeSkillProfile(root);
  assert.equal(overrides(root)['heavy-audit'], 'on');
  assert.match(lines.join('\n'), /conflict: skillOverrides\.heavy-audit/);
});
