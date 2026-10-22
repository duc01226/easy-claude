import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { prependCodexCompatibilityNote } from '../compat-rewrite.mjs';

// Shipped source only. URL-relative reads work unchanged on Windows, macOS and Linux.
const claudeRoot = new URL('../../../', import.meta.url);
const read = relative => readFileSync(new URL(relative, claudeRoot), 'utf8');

// Intent: in quiet mode the host refuses a model-initiated call of a hidden
// (user-invocable-only) skill. Every caller that starts another skill must say
// what to do then, so a workflow step is read and followed, never skipped.
const CALLERS = [
  'skills/start-workflow/SKILL.md',
  'skills/pull-request/SKILL.md',
  'skills/custom-prompt/SKILL.md',
  'skills/integration-test/references/fix-loop.md',
  'hooks/doc-sync-gate.cjs',
];

// The fallback clause itself: the host's refusal and the instruction to read that SKILL.md, in one clause and
// in either order. Another sentence that only says "refuses", or names some SKILL.md, does not satisfy it.
const FALLBACK = /host refuses (?:that|a skill|it)[^.\n]{0,80}?\bread(?:ing)?\b[^.\n]{0,30}SKILL\.md|\bread(?:ing)?\b[^.\n]{0,30}SKILL\.md in full (?:when|if) the host refuses/;

test('every caller that starts a skill names the read-in-full fallback for a refused call', () => {
  for (const file of CALLERS) {
    assert.match(read(file), FALLBACK, `${file} must say to read the skill's SKILL.md when the host refuses the call`);
  }
});

test('the fallback check needs the clause, not just the words "refuses" and "SKILL.md"', () => {
  assert.doesNotMatch('git rebase refuses a dirty tree. See .claude/skills/commit/SKILL.md for details.', FALLBACK);
  assert.match('when the host refuses that call (a user-only skill), read that SKILL.md in full', FALLBACK);
  assert.match('or reading its SKILL.md in full when the host refuses that call', FALLBACK);
});

test('workflow skills start a step through the host first and read it in full only when refused', () => {
  const workflows = readdirSync(new URL('skills/', claudeRoot)).filter(name => name.startsWith('workflow-'));
  assert.ok(workflows.length > 0);
  let carriers = 0;
  for (const name of workflows) {
    const text = read(`skills/${name}/SKILL.md`);
    if (!text.includes('**Call each step skill:**')) continue;
    carriers += 1;
    assert.match(text, /start its linked SKILL\.md through the active host's skill call/, name);
    assert.match(text, /read the SKILL\.md in full yourself/, name);
    assert.match(text, /re-read the SKILL\.md of the step in progress/, name);
    assert.doesNotMatch(text, /invokes its `Skill` tool/, `${name} still states the unconditional Skill call`);
  }
  assert.ok(carriers >= 10, 'the contract block must stay in the workflow skills');
});

test('the Codex preamble tells the agent to read a named skill in full itself', () => {
  const output = prependCodexCompatibilityNote('# Skill\n');
  assert.match(output, /read that file in full yourself/);
  assert.match(output, /implicit invocation is off is never loaded for you/);
});
