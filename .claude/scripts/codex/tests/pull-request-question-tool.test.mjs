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

test('PR test and review gates decide automatically and never display a test/review question', () => {
  for (const text of [source, codex]) {
    for (const [heading, nextHeading] of [
      ['### Step 3.5', '### Step 4'],
      ['### Step 4', '### Step 5'],
    ]) {
      const gate = section(text, heading, nextHeading);
      assert.match(gate, /act without asking the user/);
      assert.doesNotMatch(gate, /Call the ask-user question tool/, 'tests and review must not raise a question');
    }
    const tests = section(text, '### Step 3.5', '### Step 4');
    assert.match(tests, /fix-loop every failure through `commit` Step 3\.5 until all pass/);
    assert.match(tests, /that is a \*\*Blocker\*\*, not a skip/);
    const review = section(text, '### Step 4', '### Step 5');
    assert.match(review, /\*\*Low\*\* → automatic skip; \*\*Medium\*\* → `[/$]why-review --fix-loop`; \*\*High\*\* → `[/$]changes-review --fix-loop`, each at most two review rounds over the whole scope/);
    assert.match(review, /a skip is never minted for a Medium or High branch/);
    assert.match(review, /A failed review is not a skip: never mint one to get past it/);
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /Test and review decisions are automatic under `commit` → \*\*Test and review decision policy\*\* and raise no question/);
    assert.match(contract, /invoke the available native ask-user question tool with the actual question and selectable options/);
    assert.match(contract, /do not merely name the tool in prose/);
    assert.match(contract, /split into sequential questions/);
    assert.match(contract, /never drop Skip from a question that offers it/);
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
    assert.match(contract, /Mint a skip receipt only for a Low-risk candidate or on the user's explicit request, never after a failed or non-converged review/);
    assert.match(contract, /an explicit request to skip, run or choose a specific check overrides the automatic choice/);
  }
});

// These are shipped prompt-contract checks, not evidence of live model compliance.
test('full-scope PR evidence is reused only for the exact candidate, and a skip never transfers', () => {
  for (const text of [source, codex]) {
    const review = section(text, '### Step 4', '### Step 5');
    assert.match(review, /Reuse an existing full review under the shared decision policy only when the evidence matches this exact candidate and whole-branch scope/);
    assert.match(review, /A skip covers only the unchanged candidate and scope it was recorded for/);
    assert.match(review, /changed content is classified and gated again/);
    assert.doesNotMatch(review, /reused only after the user confirms it for this run and candidate/);
  }
});

test('CI repairs run fresh gates automatically and hand the recorded decision to nested commit', () => {
  for (const text of [source, codex]) {
    const ci = section(text, '### Step 8', '### Step 9');
    assert.match(ci, /Gate the repair without a question[^\n]*Automatically run affected local checks/);
    assert.match(ci, /WHOLE branch/);
    assert.match(ci, /refresh the exact-candidate receipt/);
    assert.match(ci, /raises the tier and its review, never a question/);
    assert.match(ci, /A previous Skip does not authorize skipping repair checks/);
    const handoff = section(text, '### Step 6', '### Step 7');
    assert.match(handoff, /recorded risk tier, test decision and evidence, whole-branch review proof and matching exact-candidate receipt/);
    assert.match(handoff, /Its gates reuse that current evidence instead of repeating the work, and ask nothing/);
  }
});

test('commit decides tests and review by risk without a question, stale evidence or a widened skip', () => {
  for (const text of [commit, rewriteClaudeToolTermsForCodex(commit)]) {
    const policy = section(text, '## Test and review decision policy', '## Workflow\n\n### Step 1');
    assert.match(policy, /never ask the user whether to run tests or a review — classify the candidate, decide, act and record the decision/);
    assert.match(policy, /A series of tiny commits cannot reset risk or conceal a large change/);
    assert.match(policy, /Any higher-tier signal outranks every lower one — even a one-line diff\. Tie or unclear → the higher tier/);
    assert.match(policy, /The affected tests already ran and passed in this session, and nothing they cover changed since \| Skip/);
    assert.match(policy, /The change is really small, or no executable behavior changed \| Skip/);
    assert.match(policy, /Anything else \| Run the tests scoped to the change and fix-loop every failure until all pass/);
    assert.match(policy, /Old evidence never covers new content/);
    assert.match(policy, /\*\*Low\*\* → automatic skip with the recorded signal; \*\*Medium\*\* → `[/$]why-review --fix-loop`; \*\*High\*\* → `[/$]changes-review --fix-loop`\. Each fix-loop runs at most two review rounds/);
    assert.match(policy, /An explicit user instruction wins/);
    assert.match(policy, /Automatic skip covers only the Low tier and the two test-skip rows/);
    assert.match(policy, /never skip after a failed check or a review that did not converge/);
    assert.match(policy, /MEDIUM or higher findings still open at the two-round cap/);
    assert.match(policy, /Leave the candidate staged and uncommitted, mint no receipt, and report/);
    assert.match(policy, /Automatic choices never expand commit\/push authority/);
    assert.match(policy, /never as a fabricated user answer/);
    assert.doesNotMatch(text, /USER CHOICE — always|blocking user choice — always|Always ASK the user|On every commit invocation.*ask the user/);
    assert.doesNotMatch(policy, /human-answer baseline|Ask once for the unsettled|reuse the testing\/review \*\*preference\*\*/i,
      'the retired question-frequency policy must not return');
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
    // A pull request is built work, and the tracker's own state for that is the default the reminder offers.
    assert.match(reminder, /the tracker has a state for exactly that: `implemented`/);
    assert.match(reminder, /`implemented` \(the default for work this pull request delivers; proof and acceptance are still open\)/);
    assert.match(reminder, /`implemented` is one step from `draft`, `planned`, `ready` or `in_progress` and needs only the item's captured intent/);
    assert.match(reminder, /When `catalogue` lists no `implemented` state \(an earlier framework copy\), offer `verifying` in its place/);
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
  const listed = step.slice(step.indexOf('Read `states`'), step.indexOf('Let the user pick')).match(/`([a-z_]+)`/g).map(s => s.slice(1, -1)).filter(s => s !== 'states');
  assert.deepEqual(listed, [...states]);
  assert.ok(states.includes('implemented'), 'the state a pull request records must be a real lifecycle state');
});
