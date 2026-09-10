---
name: experience-review
version: 1.2.0
description: '[Testing] Use when reviewing a running user experience or observable output (UI, API, CLI, service) — run it locally, drive it end to end like a user, gate on runtime/console logs and captured screens, set a baseline, or adjudicate a regression. Flag: --rounds=N (default 3; 0 = report-only).'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the steps in order. Before each step, update task tracking; mark it completed with evidence or an explicit skip reason.
> **[BLOCKING]** If task tools are unavailable, maintain an equivalent step tracker. Never mark an experience verified from source reading, test-writing, or artifact generation alone.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Exercise and inspect an applicable running/observable feature against its intended purpose, drive its BLOCKING defects to zero in a bounded remediation loop, then leave durable evidence and a truthful acceptance or limitation status.

**Workflow:** Resolve round budget → read intent → classify surface/capability → **bring the system up locally and instrument it** → exercise actual behavior end to end → inspect evidence (including runtime logs and captured screens) → judge against purpose → **remediate and re-exercise until zero BLOCKING defects or the budget is spent** → compare/preserve expectations → tear down → recommend acceptance and request an explicit human decision.

**Key Rules:**

- `OBSERVED` is witnessed evidence; `JUDGED` is an agent assessment; `HUMAN-ACCEPTED` requires an explicit named owner/human record. Confidence is never approval.
- **Run the real system, then use it like a person.** Bring the surface up locally as a WHOLE — its backing services, then the app — poll a readiness signal, drive the actual journey end to end through the real interface, and tear down what you started. A surface that never ran is `ENVIRONMENT-BLOCKED`, never a pass.
- **Runtime logs and captured screens are evidence channels, not extras.** Capture them on every exercise and re-capture them every round. A runtime ERROR is BLOCKING. A WARNING is ADVISORY — attempt a bounded fix, never let one hold the review open. For a visual surface, capture each state/viewport and READ the images; unread captures are not observations.
- **The loop converges on defects, never on taste.** Only a BLOCKING defect — objectively checkable against the stated purpose — opens a round. An ADVISORY finding (preference, polish, visual identity) is recorded, never looped on.
- **Bounded: `--rounds=N`, default 3.** Every round adjudicates before editing, fixes at the owning layer through `/fix`, `/changes-review`s its own fix diff, and re-exercises from scratch. Cap reached, defects not shrinking across two rounds, defects increasing, or `ENVIRONMENT-BLOCKED` → STOP and escalate via `AskUserQuestion`. `--rounds=0` returns the single-pass report-only review.
- **Fix the defect, never the evidence of it.** Expectations, baselines, snapshots, fixtures, assertions, and acceptance criteria stay read-only in every round. A review that got clean by looking at less did not converge — it regressed.
- Convergence yields `AGENT-RECOMMENDED-ACCEPT`, which is a named agent judgment, **not** an acceptance. The record stays `ACCEPTANCE-PENDING` until an owner signs; no baseline is promoted before that signature exists.
- Record `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, and `UNVERIFIED` honestly. Do not claim success when the required runner, device, service, or inspection capability is unavailable.
- Ordinary application operation and regression tests remain deterministic and model-free.

---

## First Principle — Convergence, Not Motion

> A round that changes the product is progress **only if** the next fresh exercise records fewer BLOCKING defects.
> The loop exists to reach a fixed point — a surface that does its job with nothing objectively wrong — not to keep editing until something looks acceptable.
> When the defect count stops shrinking, that is a signal to **escalate**, not to spin another round.
> And a surface that got clean because the matrix shrank, a state was dropped, or a criterion was softened did not converge — it regressed.
> The agent may **recommend** the result. It never signs for the person who owns it.

---

## Procedure

### 0. Resolve the round budget and fix authority

Read `--rounds=N` from the invocation; default `3` when absent. `--rounds=0`
disables remediation and runs steps 1–4 then 6–7 as the original single-pass
report-only review — use it when the caller has no authority to change the
product, or when the review is an audit rather than a convergence.

State the resolved budget before the first observation, and record every round
against it. A loop whose bound was never stated is unbounded in practice.

### 1. Resolve intent and impact

Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`,
`docs/project-reference/lessons.md`, and the project-specific reference docs
matched by the changed surface. Read the governing Feature Spec, acceptance
criteria, design artifact, API/CLI/library contract, or operator runbook before
touching the feature. If intent is absent or contradictory, record
`AMBIGUOUS` and ask the canonical owner; do not choose the implementation as
the expected result.

Inspect the change and identify:

- actor, job, expected result, invariants, and unchanged behavior;
- impacted surface(s) and state(s), including error/empty/loading/offline/
  permission/recovery/boundary states where the surface supports them;
- existing accepted evidence and its exact conditions;
- the smallest meaningful review scope. Do not demand a full application
  re-review when the changed surface and protected behavior are unaffected.

### 2. Build the evidence matrix

For every configured surface, create one row before execution:

`surface id | kind | applicability | purpose | entry point | runner/tool | local-run recipe | log channels | fixture/identity | platform/device/viewport/locale/network | evidence root | accepted expectation | impacted states`

Use only project configuration, repository files, and host/tool evidence.

- `APPLICABLE`: the configured entry point and a runnable runner/tool exist, and
  the required fixture, data, service, device, or inspection capability is
  available.
- `NOT-APPLICABLE`: the surface does not exist for this project; cite the config
  and repository scan. An empty framework config is a valid N/A, not a failure.
- `ENVIRONMENT-BLOCKED`: the surface is relevant but a required capability is
  unavailable. Name the missing capability and preserve diagnostics.
- `UNVERIFIED`: the review started but required observations or judgments were
  not collected. Never convert it to N/A after the fact.

If a project has no `experienceVerification` configuration, do not invent
defaults. Record the missing configuration as an adoption/setup limitation and
use the project’s documented existing runner only when it provides evidence.

For an E2E-backed surface, resolve `e2eTesting.execution` alongside this
matrix. Match `surfaceIds[]` to the configured surface, keep dependency/start/
readiness/log/teardown ownership in that surface's `localRun`, and use the
E2E profile only for auth/data/browser/evidence/convergence facts. If the
profile is missing or partial, derive values from the E2E reference, runner
configuration, package/task/compose/CI scripts, fixture/seed/auth docs, and
bounded repository search in that order. Record `file:line` evidence; missing
capability is `ENVIRONMENT-BLOCKED`, never a guessed default or pass.

For a web surface whose profile requests human QC, open the browser visibly
through the project's configured Playwright CLI path when supported. Wait for
readiness and actionability before each actor action; a deterministic 200–300ms
post-action delay may make the journey observable but never replaces a settle
signal. Attach console/page-error/request capture before the first interaction,
capture configured screenshots/trace/video, read them, and redact sensitive
values before persistence.

### 2b. Bring the system up locally and instrument it

A review reads what the system DOES, and the system only does anything while it
is running. Bring every `APPLICABLE` surface up on this machine as a whole
system before the first observation — not the one process the change touched.

**Resolve the recipe from project evidence, in this order.** Use
`experienceVerification.surfaces[].localRun` (`dependencyCommand`,
`startCommand`, `workingDir`, `readyCheck`, `readyTimeoutSeconds`,
`teardownCommand`, `logSources`, `credentialsRef`) when the project declares it.
When it does not, DERIVE the recipe from repository evidence — package/task
scripts, compose or container manifests, Makefile/justfile targets, IDE or CI
run configurations, the README's run section — and record the exact file and
line each command came from. Never invent a port, script name, or default
command; a recipe you could not source is `ENVIRONMENT-BLOCKED`. When you
derived a working recipe that the config lacks, propose it as a `localRun`
block in the report so the next review does not re-derive it.

**Bring-up order, each step gated on the previous:**

1. **Backing services first** — database, broker, cache, object store, emulator,
   external stubs. A UI driven against a half-present backend produces defects
   that belong to the environment, and every one of them costs a round.
2. **Migrations/seed through the project's own supported path**, when the
   project has one. Never hand-write rows to make a screen render.
3. **The surface itself**, started in the background so the session can keep
   driving it.
4. **Readiness is POLLED, never assumed.** Wait on `readyCheck` — a health
   endpoint/command returning success, or the declared ready log line — up to
   `readyTimeoutSeconds`. Process-started is not ready, an open port is not
   ready, and a fixed sleep is not a readiness signal. Record what you polled
   and how long it took.
5. **Attach the log channels BEFORE the first interaction** (see step 3), so the
   startup window is captured too — a large share of runtime errors fire during
   boot and first paint, and a listener attached afterwards will never see them.

Record the resolved recipe, its evidence source, the readiness observation, and
the versions/ports/profile actually used. If bring-up fails, capture the failing
command, exit status, and logs, and record the surface `ENVIRONMENT-BLOCKED` —
diagnose it as an environment defect. Do NOT weaken the system to get it up:
stubbing a failing dependency, disabling auth, or skipping a service turns every
later observation into evidence about a system nobody ships.

**Tear down what you started** once step 6 has run — stop the processes and
services through `teardownCommand` or the way you started them, and say so in
the report. Data and containers a reviewer leaves behind become the next
reviewer's phantom defect. Leave anything the developer already had running
untouched; you did not start it, so it is not yours to stop.

### 3. Exercise the actual behavior

Run the configured feature through the narrowest representative journey. Use
the available browser/device/desktop/terminal/API/client or project command;
never substitute a skill-local demo. Exercise realistic actor pacing and wait
on observable settle signals instead of blind sleeps.

For each action, record the action, expected observable, actual observable,
settle signal, and evidence reference. The evidence must come from the running
or invoked feature:

- visual surface: navigate, interact, and inspect the rendered screen at the
  relevant viewport/device and states; open/read screenshots or recordings;
- terminal/API/library: invoke the real command/call and inspect the complete
  transcript, response, return value, errors, persisted state, or side effect;
- background service: trigger the supported input and inspect the externally
  observable result, emitted message, job outcome, or durable state;
- generated output: run the generator and inspect the resulting artifact and
  its provenance, not only the generator exit code.

**Drive it the way a person would, through the real interface.** Reach the
result by the route a user has — sign in, navigate, type, click, submit, wait,
read what came back — not by calling an internal function, posting to the
endpoint the button would have called, or setting state directly. A shortcut
skips exactly the layer the review exists to check: the wiring between the
interface and the logic. Use whatever control mechanism the host actually
offers for the surface — a browser automation/devtools driver (for a web
surface, use the project's configured visible `playwright-cli` path when
supported; `webapp-testing` remains a fast page/component helper), a device/desktop driver, the real CLI in a
terminal, an HTTP client for an API. Chain the journey's steps so later steps
consume what earlier steps really produced, and cover the states the matrix
lists, not only the happy path.

**Capture the runtime log stream for the whole session.** Attach before the
first interaction (step 2b.5) and keep capturing until teardown:

- **web surface:** browser console messages at every level, uncaught exceptions,
  unhandled promise rejections, and failed network requests (4xx/5xx, blocked,
  aborted, CORS) — plus the server-side log of whatever backend it called;
- **terminal/CLI, API, service, job:** the process's stdout/stderr and every
  channel named in `localRun.logSources`, including the dependency containers.

Save the captured stream under the evidence root and READ it. Attribute each
entry to the action that produced it, and note the startup window separately
from the interaction window. An empty capture is only evidence when you can show
the listener was attached — "no errors appeared" and "nothing was listening"
look identical in a report, so record which one it was.

**Capture the screen for every visual surface.** Take a screenshot of each
matrix state at each matrix viewport — including the loading, empty, error,
permission, and post-submit states, not just the settled happy path — plus a
full-page capture where the surface scrolls. Name each file for its state and
viewport and store it under the evidence root. Then OPEN and read the images:
capture produces a file, and only reading it produces an observation.

If interaction or visual inspection is unavailable, stop that branch as
`ENVIRONMENT-BLOCKED`. A screenshot that was saved but not inspected is not an
observation. Do not paste credentials into a report; use redacted identities
and reference secure setup without copying secrets.

### 4. Inspect and judge

Write observations as facts with references first. Then write separate
judgments against the stated purpose and acceptance criteria. Use the
project’s UI/design review for visual-source and accessibility checks when
applicable; use the project’s API/CLI/library contract for non-visual output.
Do not infer usability, accessibility, reliability, or correctness from an
image alone when the claim needs interaction, timing, assistive technology, or
data evidence.

Every judgment names one of `PASS`, `FAIL`, `PARTIAL`, or `NOT-VERIFIABLE` and
links to the observation(s). A confidence percentage may describe uncertainty,
but it never changes the evidence level or grants acceptance. Keep the
agent’s judgment separate from human/owner acceptance.

**Classify every non-`PASS` judgment BLOCKING or ADVISORY — the loop converges
on the first only.**

- **BLOCKING** — objectively checkable against the stated purpose: a `FAIL` or
  `PARTIAL` against acceptance criteria; a broken, overflowing, or unreadable
  layout at a matrix viewport; a required state the surface never reaches
  (loading, empty, error, permission, offline, recovery); an accessibility-floor
  violation; a console/runtime error or unhandled rejection; a wrong or missing
  value in a response, transcript, persisted record, or generated artifact.
- **ADVISORY** — a preference or identity call: visual distinctiveness
  (`DD-1`–`DD-8`), polish, copy tone, spacing taste, a nicer alternative. Record
  it as a recommendation with its location and rationale.

**NEVER open a round for an ADVISORY finding.** Taste has no fixed point: a loop
that runs on it will keep editing a surface that was already correct, and each
edit costs a fresh full re-exercise. If a finding cannot be stated as "this
observably fails to do X, which the intent requires", it is ADVISORY.

**Runtime log verdict — errors open a round, warnings never do.**

- An **ERROR**, uncaught exception, unhandled rejection, or failed request the
  journey depended on is **BLOCKING** — including when the screen still looked
  right. A caught-and-logged error is a defect the interface hid, and the log is
  the only place it surfaced.
- A **WARNING**, deprecation, or noisy info line is **ADVISORY**, with a bounded
  best effort: fix it inside the round when the cause is this project's code and
  the fix is small and behavior-preserving. Otherwise record it with its emitter
  and why it stands. Never hold a review open on a warning.
- Third-party or framework noise you do not own is ADVISORY — name the emitter
  and the reason it is not yours. An ERROR you cannot fix at this layer is
  **routed to its owner as BLOCKING**, never downgraded to make the round close.
- **Never silence a log to clear it.** Suppressing a line, lowering its level,
  filtering the capture, or wrapping the call in a catch that swallows is fixing
  the EVIDENCE, which the boundary rule forbids in every round.

**Visual verdict — separate the floor from the taste.** Judge the captured
images, not a memory of the design:

- **BLOCKING — the usability/accessibility floor** (`UI-1.1`–`UI-9.4`, and
  `P0`–`P2` findings from the review checklist `CL-1`–`CL-6`): content clipped,
  overlapping, or unreadable; a control off-screen or unreachable with no scroll
  path; a state the surface never reaches; contrast below the measured floor; a
  touch target under the floor; a missing or invisible focus ring; layout broken
  at a matrix viewport.
- **ADVISORY — visual identity and polish** (`DD-1`–`DD-8`): distinctiveness,
  palette and type character, spacing taste, a nicer alternative. Recorded with
  its location and rationale, never looped on.
- Cite the image and the location, and say what IN the image shows it. **Never
  invent a measurement** — if a claim needs a number the capture cannot give,
  record it `NOT VERIFIABLE` and name what would settle it.
- The project's design-system, SCSS, and frontend-pattern docs and ADRs
  **outrank** these clauses. A repo-wide convention is an intentional identity,
  not a finding; a genuine conflict goes to the user, never resolved silently.

`NOT-VERIFIABLE` is never BLOCKING — it is missing capability, not a defect.
Route it to `ENVIRONMENT-BLOCKED` or `UNVERIFIED` and say what would settle it.

### 5. Remediate and re-exercise (bounded loop)

One observation proves what the surface does today, not that it does the right
thing. When step 4 recorded any BLOCKING defect and the round budget is above
zero, run remediation rounds until a FRESH full exercise records none, or the
budget is spent.

**One round is all six of these, in order:**

1. **Adjudicate before editing.** Write one verdict per BLOCKING defect —
   `SOURCE-WRONG` · `EXPECTATION-WRONG` · `TEST-CONDITION-INVALID` ·
   `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — each with its observation reference,
   `file:line` evidence, and confidence. `AMBIGUOUS` goes to `AskUserQuestion`;
   never guess an owner. An unadjudicated defect gets "fixed" by whatever is
   nearest, which is almost always the surface rather than the cause.
2. **Fix at the owning layer** through `/fix` (`--target=ui` for a visual,
   layout, or responsiveness defect). Ask whose responsibility it is — the
   component that rendered it, the service that supplied the data, or the entity
   that owns the rule — and repair there, never at the symptom site.
3. **Review the round's fix diff.** Any round that lands a change runs
   `/changes-review` INLINE and report-only, scoped to that round's diff;
   validated findings fold into the SAME round's fix set. A round that changed
   nothing skips this with a recorded reason. — why: a screen that now looks
   right cannot show you a wrong-layer fix, a broken invariant elsewhere, or a
   security/performance regression the eye never reaches.
4. **Re-exercise from scratch.** Repeat steps 3 and 4 over the CURRENT build
   with the SAME evidence matrix — fresh log capture attached before the first
   interaction and fresh screenshots of every matrix state. A capture taken
   before the fix is not evidence for the build after it, and a partial re-check
   is not a round. When the fix touched startup, configuration, dependencies,
   schema, or build output, **restart through step 2b** and re-gate on
   readiness; a hot-reloaded process can still be serving the old wiring.
5. **Round Integrity Check.** The round counts only if the matrix did not
   shrink: no surface dropped, no state removed, no viewport/device/locale
   narrowed, no `APPLICABLE` row quietly reclassified `NOT-APPLICABLE`, no log
   channel detached, filtered, or level-raised, no state left uncaptured, and no
   acceptance criterion, assertion, or journey weakened. Fail this check →
   restore the matrix and re-run the round; it is a regression, not progress.
6. **Log the round** in the report: round number, BLOCKING defects in, verdicts,
   fix paths, `/changes-review` outcome, BLOCKING defects out.

**Convergence** = a fresh full exercise over the post-fix build records **zero
BLOCKING defects across the whole matrix**, with the Round Integrity Check
passed. Both, or it is not converged.

**STOP and escalate via `AskUserQuestion`** — never silently spin — when any of
these holds: the round cap is reached with BLOCKING defects still open; the
BLOCKING count fails to shrink across two consecutive rounds; the count
increases (the fixes are regressing); or a round hits `ENVIRONMENT-BLOCKED`.
Never loop against an unhealthy environment — a broken runner produces a broken
verdict every round, faster each time.

### 6. Compare expectations safely

Run this ONCE, on the settled evidence the loop converged to — not per round.
Rounds change the product; comparison judges the result against what was already
accepted, and comparing a mid-loop capture would classify a half-fixed surface as
a regression against its own in-progress state.

Use the deterministic contract when a baseline or accepted output exists:

```text
node .claude/scripts/lib/experience-verification.cjs compare
```

Provide JSON through the repository’s normal safe input mechanism. The helper
classifies the decision; it does not modify files.

- No accepted expectation → `CANDIDATE-BASELINE-PENDING-ACCEPTANCE`.
- `NOT-APPLICABLE` → record the evidence-backed N/A result; do not create a
  candidate baseline.
- Same accepted expectation → `NO-REGRESSION`; retain it.
- Difference with unchanged intent → `POTENTIAL-REGRESSION`; investigate
  source, test, and environment while retaining the old evidence.
- Difference with intended changed behavior →
  `INTENDED-CHANGE-PENDING-ACCEPTANCE`; re-review the changed experience.
- Invalid condition, blocked environment, missing evidence, or ambiguous intent
  → classify it explicitly and do not rewrite expectations.

The `e2e-test`/project test workflow may later convert an explicitly accepted
record into ordinary deterministic regression material. This skill never runs
an update-snapshots flag, edits assertions, or replaces a baseline as part of
comparison.

### 7. Record, hand off, and close

Write a report under the configured evidence root (default only when the
project explicitly adopts that default). Use a durable, versioned record with:

```text
review id / surface / mode / applicability
round budget, rounds used, and per-round log
intended purpose and governing references
exact execution command/tool, entry point, identity, fixture, conditions
local-run recipe actually used + where each command came from + readiness
  observation + teardown result (or the proposed localRun block when derived)
actions and settle signals
runtime-log summary: capture window and channels, every ERROR with its
  disposition, every WARNING with its emitter and why it stands or was fixed
screenshot inventory: one entry per state x viewport, with the observation each
  image supports
OBSERVED observations + evidence references
JUDGED judgments + BLOCKING/ADVISORY class + rationale + confidence metadata
remediation verdicts, fix paths, and each round's /changes-review outcome
baseline/comparison decision and retained expectation
AGENT-RECOMMENDED-ACCEPT recommendation, or the open BLOCKING defects
HUMAN-ACCEPTED record, or ACCEPTANCE-PENDING
unverified areas, environment limits, redactions, and next action
```

On convergence, state the agent's recommendation explicitly and keep it visibly
separate from the human decision:

> `AGENT-RECOMMENDED-ACCEPT` — a fresh full exercise over the post-fix build
> recorded zero BLOCKING defects across the whole matrix, with the Round
> Integrity Check passed. The agent recommends this evidence for acceptance and
> lists every residual ADVISORY finding, so the owner decides with the taste
> calls in front of them, not hidden behind a green result.

That recommendation is a `JUDGED` result with a name attached — it is **not** an
acceptance and never substitutes for one. The record stays `ACCEPTANCE-PENDING`
until an owner signs, and no baseline, snapshot, fixture, or assertion is
promoted before that signature exists.

Only copy a `HUMAN-ACCEPTED` record from an explicit owner/human decision.
Require `acceptedBy`, `acceptedAt`, `intentRef`, `evidenceRefs`, and the
accepted scope; require residual risk when the acceptance is not a full pass.
If no such decision exists, leave acceptance pending and hand off the exact
evidence needed. Never sign acceptance on behalf of another person.

**The boundary this skill never crosses is the EXPECTATION, not the product.**
Product tests, fixtures, snapshots, assertions, accepted baselines, and
acceptance criteria stay read-only in every round: the loop repairs the DEFECT
at its owning layer, never the evidence or the yardstick that exposed it. A
BLOCKING defect still open when the budget is spent, or one owned by a layer
outside this change, is classified and routed to the owning workflow — never
forced green here, and never resolved by softening what was asked for.

With `--rounds=0` the skill is read-only for the product too, and behaves
exactly as the original single-pass review: report the classification, route it,
repair nothing.

## Report verdicts

Use one primary status and do not collapse these into a green check:

| Status | Meaning |
| --- | --- |
| `HUMAN-ACCEPTED` | Explicit acceptance record exists for the stated scope; it is not proof of unreviewed areas. |
| `AGENT-RECOMMENDED-ACCEPT` | The loop converged: a fresh full exercise recorded zero BLOCKING defects with the Round Integrity Check passed, and the agent recommends the evidence. A `JUDGED` result, never an acceptance — it always ships as `ACCEPTANCE-PENDING`. |
| `ACCEPTANCE-PENDING` | Evidence was observed/judged but no explicit acceptance exists. |
| `NOT-CONVERGED` | The round budget was spent, the defect count stopped shrinking, or defects increased, with BLOCKING defects still open. List them and the next owner; never report this as a partial pass. |
| `OBSERVED` | Output was directly inspected, but no judgment was completed. |
| `UNVERIFIED` | Required evidence or judgment is missing. |
| `ENVIRONMENT-BLOCKED` | Applicable review could not run because capability was unavailable. |
| `NOT-APPLICABLE` | The project has no such surface, with evidence. |

Close with exact commands and exit statuses for automated checks, exact
observations for the running feature, and the next owner/action. Do not claim
this framework repository has live application evidence merely because its own
contract tests pass.

## How the loop sits inside the acceptance contract

The contract below is the floor and is unchanged by the remediation loop — read
the two together, because the loop is what makes the contract reachable rather
than a permission to bypass it:

- **Clause 6 (first-run rule) is untouched.** Convergence produces
  `AGENT-RECOMMENDED-ACCEPT`, which is `JUDGED` evidence with a name on it. It
  never promotes a baseline, and it never becomes `HUMAN-ACCEPTED` without the
  explicit owner record clause 6 requires.
- **Clause 7 (mismatch rule) is untouched.** The loop fixes the product so the
  accepted expectation is met; it never edits a snapshot, fixture, assertion, or
  generated expectation to close the gap from the other side.
- **Clause 8 (automation boundary) is untouched.** Ordinary tests stay
  deterministic and model-free. The loop adds a repair-and-re-prove cycle at
  development time; it adds no authority to approve, and an `ENVIRONMENT-BLOCKED`
  round still escalates instead of converging.

If a round ever seems to require softening an expectation, that is the signal
that the fix belongs elsewhere — stop the round and escalate.

<!-- SYNC:experience-acceptance-contract -->

> **Experience Acceptance Contract** — MANDATORY when a change creates or changes a user-facing or externally observable surface. This is a review-and-evidence contract, not a claim that an agent can make a product correct.
>
> 1. **Classify the surface from project evidence:** web, mobile, desktop, terminal, API, library, background service, generated output, or another configured kind. Record `APPLICABLE`, `NOT-APPLICABLE — <reason + evidence>`, or `ENVIRONMENT-BLOCKED — <missing capability + evidence>`. Never infer a browser, device, GUI, service, or interactive runner from this skill or from a screenshot.
> 2. **Read intended purpose first:** use the governing spec, acceptance criteria, API/CLI/library contract, design artifact, or documented operator outcome. State the actor, job, expected result, important states, and unchanged behavior before exercising the implementation.
> 3. **Exercise the running/observable feature when applicable:** bring the surface up as a WHOLE running system first — backing services, then the surface — gated on a POLLED readiness signal (a started process, an open port, or a fixed sleep is not readiness), then drive it through the real interface a user has, never an internal call or a direct state write. Use the project's configured entry point and runner/tool; perform the intended journey and relevant failure, empty, loading, offline, permission, recovery, or boundary states. For non-visual surfaces inspect the actual response, transcript, return value, persisted state, emitted message, or generated artifact. Never weaken the system to get it up — a stubbed dependency or disabled auth makes every later observation evidence about a system nobody ships — and tear down only what you started. Source reading, test-writing, and screenshot generation alone are not exercise evidence.
> 3a. **Resolve E2E execution from one project contract:** when `e2eTesting.execution` exists, resolve `surfaceIds[]` to `experienceVerification.surfaces[]`, then use that surface's `localRun` for dependency/start/readiness/log/teardown. Use the E2E profile only for auth/data/browser/evidence/convergence facts. When a field is absent, derive it from repository evidence and cite the source; if the capability remains missing, record `ENVIRONMENT-BLOCKED` rather than inventing a port, account, seed, selector, or command.
> 3b. **Human-QC browser path:** for an applicable web surface, use the project's configured visible Playwright CLI path when supported. Wait for readiness and actionability before each interaction; apply a deterministic 200–300ms post-action presentation delay for visible human-QC when configured, never as readiness. Attach console/page-error/request capture before the first interaction and redact sensitive evidence before persistence.
> 4. **Inspect evidence, do not merely produce it:** a screenshot, video, DOM/tree dump, terminal transcript, API payload, or artifact must be opened/read and tied to an observation. Record exact command/tool, entry point, identity/fixture, platform/device/viewport/locale/network conditions, actions, settle signals, timestamps, and evidence references. Redact secrets.
> 5. **Separate evidence levels:** `OBSERVED` is directly witnessed; `JUDGED` is an agent assessment against the stated purpose; `HUMAN-ACCEPTED` is an explicit named owner/human decision linked to the evidence and intent; `UNVERIFIED` means required evidence was not collected; `ENVIRONMENT-BLOCKED` means applicable review could not run; `NOT-APPLICABLE` means the surface does not exist. Agent confidence is metadata, never acceptance or proof.
> 6. **First-run rule:** without an accepted expectation, report candidate evidence and `ACCEPTANCE-PENDING`. Never save the current screen/output as an expected baseline merely because it was generated or because an automated test passed. Promotion requires an explicit acceptance record naming the accepting person/role, timestamp, intent reference, evidence references, scope, and residual risk where relevant.
> 7. **Mismatch rule:** preserve the previous accepted expectation. Classify a difference as `POTENTIAL-REGRESSION`, `INTENDED-CHANGE-PENDING-ACCEPTANCE`, `TEST-CONDITION-INVALID`, `ENVIRONMENT-BLOCKED`, `UNVERIFIED`, or `AMBIGUOUS`. Do not update snapshots, fixtures, assertions, or generated expectations to make a failure green. Intended changes require renewed exercise and explicit acceptance; unaffected cases retain their protection.
> 8. **Automation boundary:** ordinary regression tests and application operation remain deterministic and model-free. Development-time agent review may create evidence and a report, but it must not silently approve, rewrite expectations, or claim human acceptance. A missing runner/capability is an honest limitation, not a successful verification.
> 9. **Runtime signal and visual evidence are exercise channels, not extras:** capture the surface's runtime log stream from BEFORE the first interaction until teardown — browser console messages, uncaught exceptions, unhandled promise rejections, and failed network requests for a web surface; process stdout/stderr and every configured log source otherwise — and capture each relevant state and viewport of a visual surface. Then READ both: an unread capture is a file, not an observation, and an empty capture proves nothing unless you can show the listener was attached. A runtime ERROR, uncaught exception, unhandled rejection, or journey-critical failed request is a DEFECT even when the output looked correct; a WARNING is advisory and never blocks acceptance on its own. Never silence, filter, level-raise, or swallow a log to clear it, and never invent a measurement the capture cannot give — that is fixing the evidence, not the defect.

<!-- /SYNC:experience-acceptance-contract -->
<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** read intent first, classify capability from project evidence, exercise the actual observable feature, inspect the evidence, separate observation/judgment/acceptance, and report every limitation.

**IMPORTANT MUST ATTENTION** bring the WHOLE system up locally before the first observation — backing services, then migrations/seed, then the surface — POLL a readiness signal (a started process, an open port, or a sleep is not readiness), attach the log channels BEFORE the first interaction, and tear down only what you started. Never weaken the system to get it up: a stubbed dependency or disabled auth turns every later observation into evidence about a system nobody ships. Bring-up that fails is `ENVIRONMENT-BLOCKED`, never a pass.

**IMPORTANT MUST ATTENTION** drive the journey through the REAL interface the user has — never an internal call, a direct state write, or the endpoint the button would have called; the shortcut skips exactly the wiring the review exists to check.

**IMPORTANT MUST ATTENTION** runtime logs and captured screens are mandatory evidence channels on every exercise and every round. A runtime ERROR / uncaught exception / unhandled rejection / journey-critical failed request is BLOCKING even when the screen looked right; a WARNING is ADVISORY with a bounded best-effort fix and NEVER holds the review open. NEVER silence a log, lower its level, filter the capture, or swallow it in a catch — that is fixing the evidence. For a visual surface capture every matrix state x viewport and READ the images: floor breakage (`UI-1.1`–`UI-9.4`, checklist `P0`–`P2`) is BLOCKING, identity and polish (`DD-1`–`DD-8`) is ADVISORY, no measurement is ever invented, and the project's design-system docs outrank the clauses.

**IMPORTANT MUST ATTENTION** state the round budget (`--rounds=N`, default 3) BEFORE the first observation; every round = adjudicate → `/fix` at the owning layer → `/changes-review` the round's fix diff → re-exercise FRESH over the same matrix → Round Integrity Check → log. A capture taken before the fix is not evidence for the build after it.

**IMPORTANT MUST ATTENTION** only a BLOCKING defect opens a round — ADVISORY findings (preference, polish, visual identity) are recorded, NEVER looped on; a loop that runs on taste has no fixed point.

**IMPORTANT MUST ATTENTION** STOP and escalate via `AskUserQuestion` when the cap is reached with defects open, the defect count stops shrinking across two rounds, the count increases, or a round hits `ENVIRONMENT-BLOCKED` — report `NOT-CONVERGED`, never a partial pass.

**IMPORTANT MUST ATTENTION** fix the DEFECT, never the evidence of it: expectations, baselines, snapshots, fixtures, assertions, and acceptance criteria stay read-only in every round, and a review that got clean because the matrix shrank REGRESSED.

**IMPORTANT MUST ATTENTION** first-run evidence is candidate evidence; preserve accepted expectations on mismatch; no automatic snapshot/assertion/fixture update; explicit owner acceptance is required for promotion. `AGENT-RECOMMENDED-ACCEPT` is a named agent judgment that always ships as `ACCEPTANCE-PENDING` — the agent recommends, the owner signs.

<!-- SYNC:experience-acceptance-contract:reminder -->

**MUST ATTENTION** classify the configured surface, read intended purpose, bring the whole system up locally and POLL readiness before observing, exercise the actual observable feature through the real interface, capture and READ the runtime log stream and the relevant screens, inspect evidence, separate OBSERVED/JUDGED/HUMAN-ACCEPTED/UNVERIFIED/ENVIRONMENT-BLOCKED/NOT-APPLICABLE, preserve old expectations on mismatch, and require explicit acceptance before baseline promotion. A runtime ERROR is a defect even when the output looked right; a WARNING is advisory. Never silence a log, invent a measurement, or infer acceptance from a screenshot, passing test, or agent confidence; ordinary tests remain model-free.

<!-- /SYNC:experience-acceptance-contract:reminder -->

**IMPORTANT MUST ATTENTION** if the runner, device, service, or inspection tool is unavailable, record `ENVIRONMENT-BLOCKED` or `UNVERIFIED`; never present incomplete evidence as successful verification.
