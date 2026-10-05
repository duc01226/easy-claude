import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rewriteClaudeToolTermsForCodex } from '../compat-rewrite.mjs';

// Shipped source only: no adopter config, home state, GitHub or shell dependency.
// URL-relative reads work unchanged on Windows, macOS and Linux.
const source = readFileSync(new URL('../../../skills/pull-request/SKILL.md', import.meta.url), 'utf8');
const codex = rewriteClaudeToolTermsForCodex(source);

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `Missing ${heading}`);
  const end = text.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `Missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

test('PR test and review gates display selectable questions before pausing on every host', () => {
  for (const text of [source, codex]) {
    for (const [heading, nextHeading, skip] of [
      ['### Step 3.5', '### Step 4', 'Skip local tests'],
      ['### Step 4', '### Step 5', 'Skip review'],
    ]) {
      const gate = section(text, heading, nextHeading);
      assert.match(gate, /Call the ask-user question tool under the \[User Choice Contract\].*BEFORE pausing/);
      assert.ok(gate.includes(skip), 'The user must retain an explicit Skip option');
    }
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /refreshed candidates, failed-review skip decisions and resume/);
    assert.match(contract, /invoke the available native ask-user question tool with the actual question and selectable options/);
    assert.match(contract, /do not merely name the tool in prose/);
    assert.match(contract, /split into sequential questions/);
    assert.match(contract, /never drop Skip or silently choose a review/);
  }
});

test('PR confirmations use a permitted native question tool without forcing Plan mode', () => {
  assert.match(source, /Claude Code:\*\* call `ask user question tool`/);
  for (const text of [source, codex]) {
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /`functions\.request_user_input_async` in Default mode/);
    assert.match(contract, /`request_user_input` only when its tool contract and the current mode permit this kind of question/);
    assert.match(contract, /do not switch to Plan mode just to ask for confirmation/);
    assert.match(contract, /OpenCode:\*\* call its native `question` tool/);
    assert.match(contract, /if no permitted question tool exists, visibly present the exact question and numbered choices/);
    assert.match(contract, /when a permitted tool is available, call it/);
  }
  assert.doesNotMatch(codex, /AskUserQuestion/);
});

test('posting an asynchronous PR question never authorizes dependent work', () => {
  for (const text of [source, codex]) {
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /a tool acknowledgement means the question was posted, not answered/);
    assert.match(contract, /candidate\/scope and status `pending`/);
    assert.match(contract, /pause dependent steps, and wait for the human reply/);
    assert.match(contract, /Preselection, silence and elapsed time are not consent/);
    assert.match(contract, /retain a pending question across compaction\/resume without treating it as answered or posting duplicates/);
    assert.match(contract, /A prior explicit answer for this exact candidate.*may be reused when calling `commit`/);
    assert.match(contract, /Only the user can authorize minting a skip receipt/);
  }
});
