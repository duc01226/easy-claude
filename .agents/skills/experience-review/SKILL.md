---
name: experience-review
description: '[Testing] Use when reviewing a running user experience or observable output (UI, API, CLI, service), setting a baseline, or adjudicating a regression. Flag: --rounds=N (default 3; 0 = report-only).'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the steps in order. Before each step, update task tracking; mark it completed with evidence or an explicit skip reason.
> **[BLOCKING]** If task tools are unavailable, maintain an equivalent step tracker. Never mark an experience verified from source reading, test-writing, or artifact generation alone.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Exercise and inspect an applicable running/observable feature against its intended purpose, drive its BLOCKING defects to zero in a bounded remediation loop, then leave durable evidence and a truthful acceptance or limitation status.

**Workflow:** Resolve round budget → read intent → classify surface/capability → exercise actual behavior → inspect evidence → judge against purpose → **remediate and re-exercise until zero BLOCKING defects or the budget is spent** → compare/preserve expectations → recommend acceptance and request an explicit human decision.

**Key Rules:**

- `OBSERVED` is witnessed evidence; `JUDGED` is an agent assessment; `HUMAN-ACCEPTED` requires an explicit named owner/human record. Confidence is never approval.
- **The loop converges on defects, never on taste.** Only a BLOCKING defect — objectively checkable against the stated purpose — opens a round. An ADVISORY finding (preference, polish, visual identity) is recorded, never looped on.
- **Bounded: `--rounds=N`, default 3.** Every round adjudicates before editing, fixes at the owning layer through `$fix`, `$changes-review`s its own fix diff, and re-exercises from scratch. Cap reached, defects not shrinking across two rounds, defects increasing, or `ENVIRONMENT-BLOCKED` → STOP and escalate by asking the user directly. `--rounds=0` returns the single-pass report-only review.
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

`surface id | kind | applicability | purpose | entry point | runner/tool | fixture/identity | platform/device/viewport/locale/network | evidence root | accepted expectation | impacted states`

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
   `file:line` evidence, and confidence. `AMBIGUOUS` goes to ask the user directly;
   never guess an owner. An unadjudicated defect gets "fixed" by whatever is
   nearest, which is almost always the surface rather than the cause.
2. **Fix at the owning layer** through `$fix` (`--target=ui` for a visual,
   layout, or responsiveness defect). Ask whose responsibility it is — the
   component that rendered it, the service that supplied the data, or the entity
   that owns the rule — and repair there, never at the symptom site.
3. **Review the round's fix diff.** Any round that lands a change runs
   `$changes-review` INLINE and report-only, scoped to that round's diff;
   validated findings fold into the SAME round's fix set. A round that changed
   nothing skips this with a recorded reason. — why: a screen that now looks
   right cannot show you a wrong-layer fix, a broken invariant elsewhere, or a
   security/performance regression the eye never reaches.
4. **Re-exercise from scratch.** Repeat steps 3 and 4 over the CURRENT build
   with the SAME evidence matrix. A capture taken before the fix is not evidence
   for the build after it, and a partial re-check is not a round.
5. **Round Integrity Check.** The round counts only if the matrix did not
   shrink: no surface dropped, no state removed, no viewport/device/locale
   narrowed, no `APPLICABLE` row quietly reclassified `NOT-APPLICABLE`, and no
   acceptance criterion, assertion, or journey weakened. Fail this check →
   restore the matrix and re-run the round; it is a regression, not progress.
6. **Log the round** in the report: round number, BLOCKING defects in, verdicts,
   fix paths, `$changes-review` outcome, BLOCKING defects out.

**Convergence** = a fresh full exercise over the post-fix build records **zero
BLOCKING defects across the whole matrix**, with the Round Integrity Check
passed. Both, or it is not converged.

**STOP and escalate by asking the user directly** — never silently spin — when any of
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
actions and settle signals
OBSERVED observations + evidence references
JUDGED judgments + BLOCKING/ADVISORY class + rationale + confidence metadata
remediation verdicts, fix paths, and each round's $changes-review outcome
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
> 3. **Exercise the running/observable feature when applicable:** use the project's configured entry point and runner/tool; perform the intended journey and relevant failure, empty, loading, offline, permission, recovery, or boundary states. For non-visual surfaces inspect the actual response, transcript, return value, persisted state, emitted message, or generated artifact. Source reading, test-writing, and screenshot generation alone are not exercise evidence.
> 4. **Inspect evidence, do not merely produce it:** a screenshot, video, DOM/tree dump, terminal transcript, API payload, or artifact must be opened/read and tied to an observation. Record exact command/tool, entry point, identity/fixture, platform/device/viewport/locale/network conditions, actions, settle signals, timestamps, and evidence references. Redact secrets.
> 5. **Separate evidence levels:** `OBSERVED` is directly witnessed; `JUDGED` is an agent assessment against the stated purpose; `HUMAN-ACCEPTED` is an explicit named owner/human decision linked to the evidence and intent; `UNVERIFIED` means required evidence was not collected; `ENVIRONMENT-BLOCKED` means applicable review could not run; `NOT-APPLICABLE` means the surface does not exist. Agent confidence is metadata, never acceptance or proof.
> 6. **First-run rule:** without an accepted expectation, report candidate evidence and `ACCEPTANCE-PENDING`. Never save the current screen/output as an expected baseline merely because it was generated or because an automated test passed. Promotion requires an explicit acceptance record naming the accepting person/role, timestamp, intent reference, evidence references, scope, and residual risk where relevant.
> 7. **Mismatch rule:** preserve the previous accepted expectation. Classify a difference as `POTENTIAL-REGRESSION`, `INTENDED-CHANGE-PENDING-ACCEPTANCE`, `TEST-CONDITION-INVALID`, `ENVIRONMENT-BLOCKED`, `UNVERIFIED`, or `AMBIGUOUS`. Do not update snapshots, fixtures, assertions, or generated expectations to make a failure green. Intended changes require renewed exercise and explicit acceptance; unaffected cases retain their protection.
> 8. **Automation boundary:** ordinary regression tests and application operation remain deterministic and model-free. Development-time agent review may create evidence and a report, but it must not silently approve, rewrite expectations, or claim human acceptance. A missing runner/capability is an honest limitation, not a successful verification.

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

**IMPORTANT MUST ATTENTION** state the round budget (`--rounds=N`, default 3) BEFORE the first observation; every round = adjudicate → `$fix` at the owning layer → `$changes-review` the round's fix diff → re-exercise FRESH over the same matrix → Round Integrity Check → log. A capture taken before the fix is not evidence for the build after it.

**IMPORTANT MUST ATTENTION** only a BLOCKING defect opens a round — ADVISORY findings (preference, polish, visual identity) are recorded, NEVER looped on; a loop that runs on taste has no fixed point.

**IMPORTANT MUST ATTENTION** STOP and escalate by asking the user directly when the cap is reached with defects open, the defect count stops shrinking across two rounds, the count increases, or a round hits `ENVIRONMENT-BLOCKED` — report `NOT-CONVERGED`, never a partial pass.

**IMPORTANT MUST ATTENTION** fix the DEFECT, never the evidence of it: expectations, baselines, snapshots, fixtures, assertions, and acceptance criteria stay read-only in every round, and a review that got clean because the matrix shrank REGRESSED.

**IMPORTANT MUST ATTENTION** first-run evidence is candidate evidence; preserve accepted expectations on mismatch; no automatic snapshot/assertion/fixture update; explicit owner acceptance is required for promotion. `AGENT-RECOMMENDED-ACCEPT` is a named agent judgment that always ships as `ACCEPTANCE-PENDING` — the agent recommends, the owner signs.

<!-- SYNC:experience-acceptance-contract:reminder -->

**MUST ATTENTION** classify the configured surface, read intended purpose, exercise the actual observable feature, inspect evidence, separate OBSERVED/JUDGED/HUMAN-ACCEPTED/UNVERIFIED/ENVIRONMENT-BLOCKED/NOT-APPLICABLE, preserve old expectations on mismatch, and require explicit acceptance before baseline promotion. Never infer acceptance from a screenshot, passing test, or agent confidence; ordinary tests remain model-free.

<!-- /SYNC:experience-acceptance-contract:reminder -->

**IMPORTANT MUST ATTENTION** if the runner, device, service, or inspection tool is unavailable, record `ENVIRONMENT-BLOCKED` or `UNVERIFIED`; never present incomplete evidence as successful verification.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
