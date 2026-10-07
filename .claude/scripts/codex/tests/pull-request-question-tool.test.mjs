import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rewriteClaudeToolTermsForCodex } from '../compat-rewrite.mjs';

// Shipped source only: no adopter config, home state, GitHub or shell dependency.
// URL-relative reads work unchanged on Windows, macOS and Linux.
const source = readFileSync(new URL('../../../skills/pull-request/SKILL.md', import.meta.url), 'utf8');
const codex = rewriteClaudeToolTermsForCodex(source);
const commit = readFileSync(new URL('../../../skills/commit/SKILL.md', import.meta.url), 'utf8');

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `Missing ${heading}`);
  const end = text.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `Missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

test('PR gates display selectable questions only when the risk decision requires human input', () => {
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
    assert.match(contract, /escalated refreshed candidates, failed-review skip decisions and resume with unsettled choices/);
    assert.match(contract, /invoke the available native ask-user question tool with the actual question and selectable options/);
    assert.match(contract, /do not merely name the tool in prose/);
    assert.match(contract, /split into sequential questions/);
    assert.match(contract, /never drop Skip from a required question/);
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

// These are shipped prompt-contract checks, not evidence of live model compliance.
test('settled full-scope PR evidence does not trigger a duplicate review confirmation', () => {
  for (const text of [source, codex]) {
    const review = section(text, '### Step 4', '### Step 5');
    assert.match(review, /Reuse an existing full review under the shared decision policy only when the evidence matches this exact candidate and whole-branch scope/);
    assert.match(review, /a settled automatic\/reused lane needs no new confirmation/);
    assert.match(review, /Reuse an explicit user Skip only for the unchanged candidate and scope it covers/);
    assert.match(review, /changed content needs fresh review or a new explicit Skip/);
    assert.doesNotMatch(review, /reused only after the user confirms it for this run and candidate/);
  }
});

test('routine CI repairs run fresh gates and pass the settled decision to nested commit', () => {
  for (const text of [source, codex]) {
    const ci = section(text, '### Step 8', '### Step 9');
    assert.match(ci, /Routine bounded repair → automatically run affected local checks/);
    assert.match(ci, /WHOLE branch/);
    assert.match(ci, /refresh the exact-candidate receipt/);
    assert.match(ci, /Pass `automatic CI repair` as the action origin so nested `commit` does not ask again/);
    assert.match(ci, /substantial accumulated changes or uncertain intent → ask/);
    assert.match(ci, /A previous Skip does not authorize skipping repair checks/);
    const handoff = section(text, '### Step 6', '### Step 7');
    assert.match(handoff, /fixed human-answer baseline/);
    assert.match(handoff, /settled automatic\/reused decision is not a missing user answer/);
    assert.match(handoff, /Escalated or pending choices must be answered first/);
  }
});

test('commit continuity cannot convert old consent or small diffs into stale evidence or blanket skips', () => {
  for (const text of [commit, rewriteClaudeToolTermsForCodex(commit)]) {
    const policy = section(text, '## Test and review decision policy', '## Workflow\n\n### Step 1');
    assert.match(policy, /Last explicit test and review answers \*\*separately\*\*, with timestamp\/turn, source user message/);
    assert.match(policy, /human-answer baseline fixed until the human answers that gate again; automatic commits never refresh it/);
    assert.match(policy, /cumulative authored changes since the last human-answer baseline/);
    assert.match(policy, /including already committed fixes/);
    assert.match(policy, /Compare the current candidate tree to the tree covered by that gate's last answer, not just to its parent HEAD/);
    assert.match(policy, /classify the repair\/cumulative delta for question frequency while still reviewing the whole branch/);
    assert.match(policy, /Automatic CI classification never overrides material risk or lost continuity/);
    assert.match(policy, /even a one-line diff/);
    assert.match(policy, /Prior Already verified applies only to its verified scope: rerun affected checks for changed content/);
    assert.match(policy, /Prior Skip is candidate-bound: never extend it or mint a new skip receipt automatically/);
    assert.match(policy, /End continuity on a new task\/session, branch\/worktree\/PR\/base switch/);
    assert.match(policy, /Same-session compaction\/resume preserves verified continuity/);
    assert.match(policy, /Missing\/unverifiable state is not consent/);
    assert.match(policy, /User explicitly requires a new question each time, restricts checks, or has a pending question/);
    assert.match(policy, /Automatic choices never expand commit\/push authority/);
    assert.doesNotMatch(text, /USER CHOICE — always|blocking user choice — always|Always ASK the user|On every commit invocation.*ask the user/);
  }
});

test('the work-tracking reminder asks once, always offers Skip and never gates the PR', () => {
  for (const text of [source, codex]) {
    const reminder = section(text, '### Step 3.3', '### Step 3.5');
    assert.match(reminder, /never a gate: Skip, a missing answer, missing tooling or a tracker refusal never stops or delays Steps 3\.5–9/);
    assert.match(reminder, /`off`, which includes a project with no `taskTracking` section → skip this step silently: no question, no report line/);
    assert.match(reminder, /`observe` or `linked` → ask once, even when nothing matches/);
    assert.match(reminder, /Call the ask-user question tool under the \[User Choice Contract\]/);
    for (const option of ['**Update matching item(s)**', '**Create a new item for this work**', '**Skip work tracking** — always offered']) {
      assert.ok(reminder.includes(option), `The reminder must offer ${option}`);
    }
    assert.match(reminder, /Recommend one option from the evidence/);
    assert.match(reminder, /A recommendation is advice: never answer for the user/);
    assert.match(reminder, /Skip is a complete answer: no second prompt, no persuasion, and no repeated reminder/);
    assert.match(reminder, /continue the PR with no tracker change/);
  }
});

test('the work-tracking reminder routes writes to task-track and offers only real recorded states', () => {
  for (const text of [source, codex]) {
    const reminder = section(text, '### Step 3.3', '### Step 3.5');
    assert.match(reminder, /This skill adds no tracker writer/);
    assert.match(reminder, /Update → `[/$]task-track --mode=maintain`.*`[/$]task-track --mode=lifecycle`/);
    assert.match(reminder, /Create → `[/$]task-track --mode=maintain` \(operation `create`; a new item starts as `draft`\)/);
    assert.match(reminder, /concerns --root CHECKOUT/);
    assert.match(reminder, /NEVER match by title resemblance or search the planned work/);
    assert.match(reminder, /a path match never selects every returned item/);
    assert.match(reminder, /"Implemented" is not a tracker state/);
    assert.match(reminder, /closest to "implemented and in a pull request" is `verifying`/);
    assert.match(reminder, /NEVER offer `done`/);
    assert.match(reminder, /Never infer assignment, readiness, proof or acceptance from the diff, commits, test results, CI or PR state/);
    assert.match(reminder, /A refused transition or a fact the user does not supply leaves the item at its last saved state/);
    const candidate = section(text, '## Linked work and final candidate', '### Step 1');
    assert.match(candidate, /a new item comes only from the user's Create answer/);
  }
});

// The state names the reminder offers must be the tracker's own lifecycle states.
test('every state the work-tracking reminder names exists in the tracker lifecycle policy', async () => {
  const policy = await import('../../../hooks/lib/task-tracking-policy.cjs');
  const states = (policy.default ?? policy).STATES;
  assert.ok(Array.isArray(states) && states.length > 0, 'The tracker policy must export its lifecycle states');
  const step = section(source, '4. **Offer a real recorded state.**', '5. **Route the answer');
  const listed = step.slice(step.indexOf('Read `states`'), step.indexOf('The closest')).match(/`([a-z_]+)`/g).map(s => s.slice(1, -1)).filter(s => s !== 'states');
  assert.deepEqual(listed, [...states]);
  assert.ok(!states.includes('implemented'));
});
