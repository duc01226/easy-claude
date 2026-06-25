---
name: workflow-review-changes
version: 4.1.0
description: '[Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure changed work reaches clean review through validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, validate findings, fix only validated findings, then re-run `/review-changes` INLINE (only when `/plan-execute` actually changed files), repeating the plan→plan-execute→review-changes loop until a complete pass is clean.

**Summary:**

- **Step 0 (FIRST ACTION, pre-sequence):** install a `/goal` self-recursive review-loop gate (recorded in an external goal file) so a session Stop hook BLOCKS stopping until the whole loop converges to a clean zero-finding pass — making the review→self-fix→re-verify loop unabandonable. The goal condition MUST require looping review→fix until no issues remain, INCLUDING fixing the Feature Spec and writing/updating tests whenever a fix changes behavior. It is a session-level wrapper, NOT one of the 17 canonical sequence steps. It ALWAYS runs — including when this workflow is a step inside a parent workflow — because this workflow always runs INLINE in the main session (never as a sub-agent), so it owns the session Stop hook directly in every case.
- **Step 1 `/why-review` (HOLISTIC, FULL mode, standalone — RUNS FIRST)** is the opening HOLISTIC review of the WHOLE review target combined with the current changes — the complete changeset and the surrounding code/spec/docs it touches, reviewed as ONE artifact through `/why-review`'s full adversarial rationale gate — run FIRST to ensure all changes are reasonable and carry no design-rationale flaws BEFORE any granular review. This is a DIFFERENT lens from the step-8 `--validate-findings` gate and from the per-file/per-dimension reviewers (steps 2–7): it catches design-rationale, hidden-coupling, easy-to-change, and whole-package gaps the granular passes structurally miss — the reason `workflow-review-changes` previously failed to catch what a standalone `/why-review` of the target would. Its findings flow into step 2's combined report and are fixed in the step 10–12 fix cycle — it runs ONCE as a front gate here (do NOT loop the holistic pass itself: nothing is fixed yet; the re-verify holistic pass is step 13, after fixes).
- Step 2 `/review-changes` runs next and owns the baseline (surface analysis, integration-test/translation-sync gaps, UI review via internal `/review-ui`) AND combines step 1's holistic findings into one accumulating report that the parallel batch (steps 3–7) then adds to.
- Steps 3–7 (`/review-architecture`, `/review-domain-entities` [if entity files], `/performance-review`, `/integration-test-review`, `/security-review`) are read-only sub-agents: spawn ALL in ONE message and advance ONLY after every member returns (all-return barrier); each adds its findings to the accumulating combined report.
- **Step 8 `/why-review` (FINDINGS-VALIDATION — validates the COMBINED findings)** runs AFTER review-changes (step 2) + the parallel batch (steps 3–7) have combined all findings into one report: it validates every accumulated finding (each warranted, evidence-backed, not a false positive) BEFORE the fix cycle, so steps 9–14 act only on warranted findings. It validates findings only — NOT the fix plan (`/plan-review` at step 11 reviews the fix plan's design). If steps 1–7 found zero issues, it passes through with nothing to validate. The mutating `/code-simplifier` (step 9) waits until this gate clears and self-reviews its own changes via `/code-review`.
- Fix cycle (steps 10–12 `/plan`→`/plan-review`→`/plan-execute`) runs ONLY when validated findings exist; fixes MUST include updating the Feature Spec and writing/updating tests when behavior changed.
- **Post-fix re-verify loop (steps 13–14 — runs only after a fix cycle changed files):** re-verify the ORIGINAL review target combined with the now-fixed changes by running `/why-review` (step 13, HOLISTIC FULL mode) FIRST, THEN `/review-changes` (step 14) INLINE over the whole current diff re-read from scratch to counter orchestrator confirmation bias. If EITHER step 13 or step 14 surfaces ANY finding → re-enter the fix cycle (steps 10–12) and re-run steps 13–14, looping until BOTH find a clean zero-finding pass (cap at 3 no-progress repeats of the same blocker → escalate via `AskUserQuestion`).
- `/docs-update` (step 15) ALWAYS runs and triages internally; SPEC-STALE drift verdicts from step 2 flow here to update the Feature Spec first — the workflow is NOT clean while any behavior-vs-spec divergence stays unadjudicated (green tests do not normalize drift).

**Sequence:** *(Step 0 pre-sequence: install `/goal` self-recursive review-loop gate — top-level only)* → **/why-review (HOLISTIC full-mode standalone review of the WHOLE target + changes — RUNS FIRST; findings flow into the combined report)** → /review-changes (owns UI review — invokes /review-ui internally when frontend changes; combines findings) → **[parallel batch]** /review-architecture + /review-domain-entities (if entity changes) + /performance-review + /integration-test-review + /security-review → **/why-review (validate the COMBINED accumulated findings)** → /code-simplifier (self-reviews its own changes via /code-review) → /plan → /plan-review → /plan-execute → **/why-review (HOLISTIC re-verify on the ORIGINAL target + fixed changes)** → **/review-changes (re-verify inline; if either re-verify finds issues, loop back to /plan→/plan-execute→/why-review→/review-changes until both are clean)** → /docs-update → /workflow-end → /watzup

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry every unresolved finding or unaccepted risk into validation/fix planning; do not close until fixed or explicitly accepted.
- MUST ATTENTION include unresolved risk register, generated mirror drift, and spec/test/docs drift in the fresh review prompt when relevant.
- MUST ATTENTION run `/why-review` at step 1 (HOLISTIC, FULL mode) FIRST over the whole target + changes to ensure all changes are reasonable and carry no design-rationale flaws; run `/why-review` again at step 8 (FINDINGS-VALIDATION) to validate the COMBINED findings (review-changes + the parallel batch) BEFORE the fix cycle; and run `/why-review` a THIRD time at step 13 (HOLISTIC re-verify) after fixes, paired with `/review-changes` (step 14) over the original target + fixed changes — looping fix→re-verify until both are clean.

- After `/plan-execute` applies validated fixes (and ONLY if `/plan-execute` changed files) → re-run `/review-changes` INLINE over the current full diff from the first phase; re-read the diff from scratch to counter orchestrator confirmation bias
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = one complete review pass finds zero blocking issues after all validated fixes and verification are included
- Repeated blockers are tracked in conversation context; stop after 3 no-progress full invocations of the same blocker

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Step 0 — Self-Recursive Review-Loop Goal Gate (FIRST ACTION — pre-sequence)

> **MUST ATTENTION:** Before creating the 17 step tasks below, the VERY FIRST action (top-level invocation) is to install a `/goal` self-recursive loop gate (persisted to an external goal file) so a session Stop hook BLOCKS stopping until the whole workflow loop converges to a clean zero-finding pass. This is a session-level enforcement WRAPPER — NOT one of the 17 canonical `workflows.json` sequence steps, so it does NOT change the step count or the sequence; it makes the existing loop unabandonable.

**Entry gate:**

- **ALWAYS run** — whether this workflow is the top-level invocation (user ran `/start-workflow workflow-review-changes` or `/review-changes` routed here directly) OR a step inside a parent workflow (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`). Because this workflow always runs INLINE in the main session (never as a sub-agent — see the WORKFLOW-IN-WORKFLOW note), it owns the session Stop hook directly in every case, so the goal gate installs and enforces the loop identically. There is no "deferred to parent" case.

**Procedure:**

1. **Invoke `/goal`** (the actual built-in command) with a condition encoding this workflow's self-recursive loop, e.g.:

    ```
    /goal workflow-review-changes self-recursive loop: run /why-review (HOLISTIC, on the whole target + changes, FIRST) → /review-changes (combines findings) + the parallel reviewers → /why-review (validate the COMBINED findings) + /code-simplifier → if validated findings exist, /plan → /plan-execute SELF-FIXES them (MUST also update the Feature Spec and write/update tests whenever a fix changes behavior) → re-verify by re-running /why-review (HOLISTIC) THEN /review-changes INLINE over the ORIGINAL target combined with ALL fixed changes (re-read the whole diff from scratch, not just the last fix) → if either re-verify finds anything, loop /plan→/plan-execute→/why-review→/review-changes until BOTH find zero findings; only then /docs-update → /workflow-end. Stop only when a complete re-verify pass is clean with every behavior-changing fix covered by an updated spec + test (or the same blocker repeats 3× with no progress → escalate via AskUserQuestion). Do not stop while any validated finding is unfixed or any behavior-changing fix lacks a spec/test update.
    ```

2. The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.
3. Then proceed to create the 17 step tasks below and run the sequence.

> **Why a goal gate on top of the loop prose:** the conditional re-verify pair (steps 13–14) and the "loop until clean" rules are soft directives an orchestrator can rationalize away after one fix cycle (confirmation bias). The `/goal` Stop hook converts them into a mechanical block — the session cannot end with a validated finding unfixed or a non-clean review pass. — why: a fix cycle that stops before re-proving the whole diff ships unreviewed work.

## Mandatory Task Creation (ZERO TOLERANCE)

> **Step 0 first:** install the Step 0 `/goal` self-recursive review-loop gate (above) BEFORE creating these tasks — always, including when this workflow is a step inside a parent workflow, since it always runs inline in the main session and owns the goal directly.

Create one task per row in the table below — source of truth is `workflows.json` → `review-changes.sequence` (currently 17 steps; verify count matches if you suspect drift). The Step 0 goal gate is a pre-sequence wrapper and is NOT counted among these 17:

| #   | Task Subject                                                                                                                                                                   | Conditional?                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | `[Workflow] /why-review — HOLISTIC full-mode standalone review of the WHOLE review target + current changes as one artifact, RUN FIRST to ensure all changes are reasonable with no design-rationale flaws; findings flow into step 2's combined report` | Always run — FULL mode (NOT --validate-findings); distinct lens from step 8 + the dimensional reviewers; runs ONCE as a front gate (do NOT loop it here — nothing is fixed yet); its findings are fixed in the step 10–12 fix cycle |
| 2   | `[Workflow] /review-changes — Surface detection + dimensional review tasks (BE/FE/SCSS/Synthesis/General) + UI dimension via /review-ui (if frontend changes) + integration test sync check + multilingual translation sync check; combines step 1's holistic findings into one accumulating report` | No                                                            |
| 3   | `[Workflow] /review-architecture — Architecture compliance review` ⚡ **PARALLEL BATCH**                                                                                       | No — run as sub-agent in parallel with steps 4/5/6/7                                           |
| 4   | `[Workflow] /review-domain-entities — DDD quality review of changed domain entity files` ⚡ **PARALLEL BATCH**                                                                 | Yes — skip if no domain entity files (Domain/, Entities/, ValueObjects/) in git diff           |
| 5   | `[Workflow] /performance-review — Performance analysis` ⚡ **PARALLEL BATCH**                                                                                                         | No — run as sub-agent in parallel with steps 3/4/6/7                                           |
| 6   | `[Workflow] /integration-test-review — 7-gate test quality review + Gate 7 change coverage (every behavior change → covering test + spec TC)` ⚡ **PARALLEL BATCH**            | No — run as sub-agent in parallel with steps 3/4/5/7                                           |
| 7   | `[Workflow] /security-review — Security vulnerability review` ⚡ **PARALLEL BATCH**                                                                                                   | No — run as sub-agent in parallel with steps 3/4/5/6                                           |
| 8   | `[Workflow] /why-review — Validate the COMBINED findings (review-changes + the parallel batch) before the fix cycle runs (each finding warranted, evidence-backed, not a false positive)` | No — FINDINGS-VALIDATION gate over the combined accumulated findings; the fix plan's design is reviewed by /plan-review (step 11); if steps 1–7 found zero issues, pass through with nothing to validate |
| 9   | `[Workflow] /code-simplifier — Simplify and refine code (self-reviews its own changes via /code-review before returning)`                                                       | No — runs AFTER the step-8 findings-validation gate (modifies code; reviews see pre-simplification state; simplifier owns review of its own output) |
| 10  | `[Workflow] /plan — Consolidate validated review findings into fix plan`                                                                                                       | Conditional — run ONLY if reviews surfaced validated findings to fix; skip if all reviews PASS  |
| 11  | `[Workflow] /plan-review — Architecture/design review of fix plan (includes adversarial design-rationale pass + internal /why-review --validate-findings of its own findings)` | Conditional — run ONLY if there is a fix plan (i.e. findings exist); skip if all reviews PASS    |
| 12  | `[Workflow] /plan-execute — Implement fixes from plan (MUST also update the Feature Spec and write/update tests when a fix changes behavior)`                                          | Conditional — run ONLY if there are validated findings to fix; skip if all reviews PASS          |
| 13  | `[Workflow] /why-review — HOLISTIC re-verify (FULL mode) over the ORIGINAL review target combined with the fixed changes, AFTER /plan-execute; loop fix→re-verify until zero findings` | Conditional — run ONLY after a fix cycle changed files; skip if all reviews PASS or /plan-execute applied no file changes |
| 14  | `[Workflow] /review-changes — Inline re-verify after the step-13 holistic /why-review (re-runs the review over the current diff); if step 13 OR step 14 finds anything, loop /plan→/plan-execute→/why-review→/review-changes until BOTH are clean` | Conditional — run ONLY after a fix cycle changed files; skip if all reviews PASS or /plan-execute applied no file changes |
| 15  | `[Workflow] /docs-update — Update impacted documentation`                                                                                                                      | Always run — /docs-update triages internally (fast-exits when only config/tool files changed)  |
| 16  | `[Workflow] /workflow-end — End workflow state (prints the concise change recap, then clears state)`                                                                           | No                                                                                             |
| 17  | `[Workflow] /watzup — Post-workflow summary and final /understand handoff`                                                                                                    | No                                                                                             |

> **UI review is owned by step 2.** `/review-ui` is NOT a separate workflow step — `/review-changes` (step 2) invokes it internally (ui-ux-designer sub-agent) as its UI dimension whenever the diff contains frontend/UI files. Do NOT create a separate `[Workflow] /review-ui` task.

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

> **Integration Test Sync:** The `/review-changes` skill (task #2) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses `AskUserQuestion` to surface them — NOT purely advisory. The user must explicitly choose to run `/integration-test` or confirm tests are already written. No silent skip.

> **Translation Sync:** The `/review-changes` skill (task #2) includes a **mandatory** multilingual UI translation-sync check. When UI text changes in multilingual projects without locale updates, the skill uses `AskUserQuestion` for an explicit user decision — NOT purely advisory.

> **Docs Update:** `/docs-update` MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke: Phase 2 `/spec` (business feature doc update), Phase 2.5 `/spec-index [mode=index]` (derived bucket INDEX/ERD refresh — if `docs/specs/` bucket maintains a derived index; note: dirs may be app buckets or flat system folders — probe `ls docs/specs/{name}/` to find a specific service), Phase 3 `/spec [mode=tests]` (test spec sync), Phase 4 `/spec [mode=sync]` (§8 TCs ↔ integration test code). Never skip based on review PASS status alone.

> **Spec Drift Adjudication:** The `/review-changes` skill (task #2) runs a **mandatory** spec-drift adjudication (`SYNC:spec-drift-adjudication`, per `shared/sdd-artifact-contract.md` → Drift Gates) for every behavior-changing file: it classifies each divergence between changed behavior and the canonical Feature Spec as **CODE-WRONG** (BLOCKING — fix the code/test against intended behavior), **SPEC-STALE** (the change is the new intent — the spec documents the old behavior), or **AMBIGUOUS** (escalate). The reviewer never silently picks a side. A **SPEC-STALE** verdict flows downstream: `/docs-update` (step 15) updates the Feature Spec FIRST via `/spec [update]`, then re-syncs `/spec [mode=tests]`. The workflow is NOT clean while any behavior-vs-spec divergence remains unadjudicated — green tests do not normalize drift (green can encode the drift itself).

> **Spec enrichment per cycle (MANDATORY — closes the feedback loop):** Every confirmed finding fixed in the loop (steps 10–12, re-verified at 13–14) that changed observable behavior MUST produce a new or updated §8 regression/preservation TC via `/spec [mode=tests]` before the workflow is clean — a code-only fix with no covering §8 TC is an INCOMPLETE cycle, not a clean pass. This applies to EVERY confirmed behavior-changing fix, not only SPEC-STALE drift verdicts or bugfix-workflow paths: a CODE-WRONG fix owes a regression TC describing the now-correct behavior; a behavior change owes a preservation/regression TC guarding the new behavior. So each recursive cycle ENRICHES the spec rather than only mutating code — the inline re-review (step 13) and the `/workflow-end` spec ↔ TDD-test sync gate both treat a behavior-changing fix that left no §8 TC as an open finding.

---

## Parallel Review Phase (Steps 3–7) — EXECUTION PROTOCOL

> **Note:** Steps 3–7 are ARCHITECTURAL/SECURITY reviewers (architecture compliance,
> DDD entities, performance, integration test quality, security vulnerabilities). They are
> separate from the DIMENSIONAL review (BE/FE/SCSS/Synthesis + UI via `/review-ui`) that runs
> inside Step 2 (`/review-changes`).
> Both operate in parallel — Steps 3–7 as explicit workflow parallel sub-agents; dimensional agents
> (including the UI dimension) inside Step 2 as its internal parallel batch. No overlap in responsibility.
> **UI/frontend quality is NOT a step 3–7 reviewer** — `/review-changes` (step 2) owns it and invokes
> `/review-ui` internally (ui-ux-designer sub-agent) only when the diff has files matching the project's
> configured frontend/UI file patterns.

Steps 3–7 (`/review-architecture`, `/review-domain-entities`, `/performance-review`, `/integration-test-review`, `/security-review`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 50K+ tokens in the main session absorbing all five inline. The `stepMeta` in `workflows.json` marks all five as `executionMode: subagent, contextBudget: high` — dispatch each as a sub-agent per the model-driven advancement rule (no hook emits a `💡 [SUB-AGENT RECOMMENDED]` hint).

> **UI review runs inside step 2, not here.** `/review-changes` invokes `/review-ui` (ui-ux-designer sub-agent) as part of its own internal dimensional batch when frontend files changed — do NOT spawn a separate `review-ui` agent in this parallel phase.

### Execution: spawn in one message

After steps 1 and 2 (`/why-review` HOLISTIC and `/review-changes`) complete, spawn all active parallel reviewers in **a single response** with multiple `Agent` tool calls:

```
Agent(review-architecture, subagent_type="architect", ...)           ← all in ONE message
Agent(review-domain-entities, subagent_type="code-reviewer", ...)    ← only if entity files in diff
Agent(performance-review, subagent_type="performance-optimizer", ...)
Agent(integration-test-review, subagent_type="integration-tester", ...)
Agent(security-review, subagent_type="security-auditor", ...)
```

Each sub-agent receives:

- The baseline summary from step 2 (what changed, integration test gaps found) plus step 1's holistic `/why-review` findings
- Instruction to write report to `plans/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch (model-driven — PRIMARY)

Advancement here is **model-driven** — your responsibility against the task list, NOT a hook/tool signal. This is the same rule the universal context files carry ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md), so the batch advances identically under Claude and Codex. The shared kernel is the canonical **`SYNC:parallel-phase-advancement`** block consolidated at the end of this skill — its barrier rule governs this batch: declare the group up-front; spawn ALL members in ONE message; advance ONLY after EVERY member returns (a skipped conditional member counts as "returned"); a sub-agent return advances a step IDENTICALLY to an inline call; defer the mutating `/code-simplifier` step until the barrier clears; hooks are accelerators only.

**Applied to this workflow's batch** — after ALL parallel reviewers (steps 3–7) have returned:

1. `TaskUpdate` step 3 → `completed`
2. `TaskUpdate` step 4 → `completed` (or "Skipped — no entity files" if the conditional `review-domain-entities` member did not run — a skipped conditional counts as "returned")
3. `TaskUpdate` step 5 → `completed`
4. `TaskUpdate` step 6 → `completed`
5. `TaskUpdate` step 7 → `completed`
6. Read all sub-agent report files; synthesize findings into a COMBINED review summary (step 1 holistic + step 2 review-changes + steps 3–7 dimensional)
7. Run step 8 (`/why-review` FINDINGS-VALIDATION) over that combined finding set — validate each accumulated finding before any fix
8. Proceed to step 9 (`/code-simplifier`) sequentially — only after the barrier above AND the step-8 validation gate (it is a code-mutating step and must see the complete, validated review snapshot)

> **Advancement here is model-driven.** This sub-agent batch advances only after every member returns (the all-return barrier) — no step-tracking hook advances it. Claude and Codex both rely entirely on this rule.

### Consolidation before /code-simplifier

Before running `/code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High/Medium/Low findings across all 5 reports (plus the UI-dimension findings folded into step 2's report when frontend files changed)
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `/code-simplifier` as context so simplification is informed by review findings

**Surface Analysis from Step 2:**

Step 2 (`/review-changes`) now emits a surface analysis summary in its report:

```
## Change Surface Analysis
BE files: {N}
FE-Logic files: {M}
SCSS files: {P}
Review Mode: [DIMENSIONAL | BE-ONLY | FE-ONLY | FE-SPLIT | TOOLING]
```

Include this surface analysis in the consolidation summary passed to `/code-simplifier`.
This lets the simplifier focus attention on the dominant surface without re-analyzing the diff.

Dimensional agent reports (if mode = DIMENSIONAL):

- `plans/reports/review-be-{date}.md` — BE findings
- `plans/reports/review-fe-logic-{date}.md` — FE-Logic findings
- `plans/reports/review-scss-{date}.md` — SCSS findings (if spawned)
- `plans/reports/synthesis-review-{date}.md` — Cross-boundary findings

All four (plus the UI-dimension `/review-ui` findings when frontend files changed) feed into the consolidation summary alongside steps 3–7 architectural findings.

### What runs sequentially (never parallelize)

| Step                            | Why sequential                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `why-review` (#1)               | Opening HOLISTIC FULL-mode standalone review of the WHOLE target + changes — runs FIRST to ensure all changes are reasonable with no design-rationale flaws; its findings flow into step 2's combined report |
| `review-changes` (#2)           | Establishes baseline AND combines step 1's holistic findings into one accumulating report — must run before the parallel batch |
| `why-review` (#8)               | Validates the COMBINED findings (review-changes + the parallel batch) before the fix cycle — gates which findings the fix cycle acts on |
| `code-simplifier` (#9)          | Modifies code — reviews see pre-simplification state; self-reviews its own output via `/code-review` before returning |
| `plan` → `plan-review` → `plan-execute` (#10–12) | Ordered validated fix-plan cycle — `/plan` consumes already-validated review findings; `/plan-review` reviews the fix plan's design (adversarial rationale pass + internal `/why-review --validate-findings` of its own findings) before `/plan-execute` implements it |
| `why-review` (#13)              | Conditional post-fix HOLISTIC re-verify after `/plan-execute` — FULL-mode review of the ORIGINAL target + fixed changes as one artifact; runs FIRST of the re-verify pair |
| `review-changes` (#14)          | Conditional post-fix inline re-verify — re-reads the whole diff from scratch after step 13; if EITHER step 13 or 14 finds anything, loops `/plan`→`/plan-review`→`/plan-execute`→13→14 until BOTH reach a clean zero-finding pass |

---

## Conditional Inline Re-Review Protocol (CRITICAL)

### Decision Logic

```
Step 1 (ALWAYS, FIRST): /why-review FULL mode (HOLISTIC) over the WHOLE target + changes — ensure all changes are reasonable with no design-rationale flaws; its findings flow into step 2's combined report.
Reviews (steps 1-8) → ALL PASS (no findings)?
  YES → /code-simplifier (step 9) still runs (self-reviews its own output) → skip steps 10-14 (/plan//plan-review//plan-execute//why-review//review-changes) → /docs-update (step 15) → /workflow-end → /watzup → DONE
  NO (findings exist) → step 8 /why-review validates the COMBINED findings → /code-simplifier (step 9) → /plan → /plan-review → /plan-execute (fix code + spec + tests) → /why-review HOLISTIC re-verify (step 13) → /review-changes INLINE re-verify (step 14) → if EITHER step 13 or step 14 finds anything, loop /plan→/plan-execute→/why-review→/review-changes until BOTH are clean → /docs-update (step 15)
Note: /why-review runs THREE times — step 1 in FULL mode (a holistic standalone review of the whole target + changes as one artifact, run FIRST; findings flow into step 2's combined report); step 8 in `--validate-findings` mode (validates the COMBINED findings — review-changes + the parallel batch — before the fix cycle; the fix-plan design rationale is reviewed by /plan-review (step 11), which self-invokes /why-review --validate-findings on its own findings); and step 13 in FULL mode again (HOLISTIC re-verify of the original target + fixed changes, paired with the step-14 /review-changes re-verify). The lenses differ — steps 1/13 hunt whole-package/design-rationale gaps the granular passes never surface; step 8 validates the surfaced + accumulated findings.
Note: /code-simplifier (step 9) self-reviews the code it changes via /code-review before returning — there is no separate workflow-level code-review step.
```

### Post-Fix Re-Verify Loop (Steps 13–14) — After `/plan-execute` Applies Fixes

> **Why this pair exists:** the step-8 `/why-review --validate-findings` gate only sanity-checks the findings already surfaced, and steps 1 + 3–7 each review one file/dimension or the pre-fix state. After fixes land, the WHOLE target combined with the fixed changes must be re-verified as one artifact — first through `/why-review`'s adversarial design-rationale lens (catching whole-package/coupling gaps a standalone `/why-review <target>` would catch), then through a full `/review-changes` pass. Running both, looping until both are clean, is exactly the re-verification a human does after a fix.

1. **CONDITION (run only if /plan-execute changed files):** Steps 13–14 run ONLY when `/plan-execute` actually modified files (validated fixes were applied). If `/plan-execute` made no file changes — nothing was wrong, or the plan resolved to no-ops — SKIP both and proceed to `/docs-update` (step 15).
2. **STEP 13 — `/why-review` HOLISTIC re-verify (FIRST):** Invoke `/why-review` in **FULL mode** over the ORIGINAL review target combined with ALL fixed changes (e.g. `/why-review the whole <feature/diff/target> combined with the current fixed changes`). MUST NOT use `--validate-findings` here (that mode is terminal and only re-checks an existing findings list — it would NOT perform the holistic review this step requires). It runs the full Validation Checklist + both Adversarial Rounds + Easy-to-Change gate, then validates its own findings via its internal closing gate.
3. **STEP 14 — `/review-changes` re-verify (AFTER step 13):** re-run the `/review-changes` protocol **INLINE in the main session** over the current full diff. Create a fresh task breakdown, rerun blast radius, risk detection, surface categorization, diff collection, dimensional reviews, synthesis, and validation gates. (Inline by design — cheaper than a fresh sub-agent; counter orchestrator-confirmation-bias by re-reading the diff from scratch.) Integrate its findings — MUST NOT filter, reinterpret, or override.
4. **DO** track re-verify invocation count and repeated blockers in conversation context.
5. **LOOP — if EITHER step 13 OR step 14 surfaces ANY finding:** validate it, re-enter the fix cycle `/plan` → `/plan-review` → `/plan-execute` (fixing code + Feature Spec + tests), then RE-RUN steps 13 then 14 over the whole updated target. Loop until BOTH the holistic `/why-review` (step 13) AND `/review-changes` (step 14) return a clean zero-finding pass.
6. **SPEC + TEST ENRICHMENT GATE:** before declaring the loop clean, confirm every behavior-changing fix applied in this loop produced a new/updated §8 regression/preservation TC via `/spec [mode=tests]` (per "Spec enrichment per cycle" above); a behavior-changing fix that left no covering §8 TC is an OPEN finding — re-enter the loop to add it before proceeding.
7. **IF** the same validated blocker repeats across 3 invocations with no observable progress → STOP and escalate via `AskUserQuestion` — do NOT silently loop or fall back to any prior protocol.
8. **ONLY THEN** proceed to `/docs-update` (step 15) — so the final docs sweep reflects any fixes the re-verify loop forced.

> **Goal-gate tie-in:** the Step 0 `/goal` gate stays OPEN until this loop reaches a clean zero-finding pass on BOTH step 13 and step 14, with every behavior-changing fix covered by a spec + test update (or a 3-repeat blocker escalates). The session cannot stop with a validated finding still unfixed, a re-verify pass outstanding, or a behavior-changing fix lacking its spec/test. Each re-verify reviews the WHOLE current diff from the first phase combined with ALL prior fixes — never just the previous cycle's fix in isolation. (This applies in every case — including when this workflow is a step inside a parent workflow — because it always runs inline in the main session and owns the goal directly.)

### Iteration Tracking (Conversation-Scoped)

Iteration count is tracked **in conversation context only** — no persistent files. Each new conversation starts fresh at round 0.

**Rules:**

- **Repeated blocker cap** — if the same validated finding repeats for 3 full invocations with no progress, STOP and escalate via `AskUserQuestion` (manual review required)
- **PASS = done** — if no fix cycle happened, initial clean reviews/tests are enough; if a fix cycle happened, PASS requires BOTH the step-13 holistic `/why-review` AND the step-14 inline `/review-changes` re-verify to return zero findings, with every behavior-changing fix covered by a spec + test update
- **Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`
- **Goal Satisfaction FAIL = findings exist** — a required saved criterion at FAIL in the Goal Satisfaction matrix enters the SAME loop as a code finding: validate the gap is real → `/plan` → `/plan-execute` → inline re-review of the affected criteria only. Workflow end requires every required criterion PASS or BLOCKED with a user-facing escalation reason; mark criteria BLOCKED (never silently drop them) when two consecutive iterations show no criterion progress.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). Pass the same goal file reference to every child step; step 2 `/review-changes` emits the Goal Satisfaction matrix against the SAME saved criteria. After each fix cycle, append an Iteration Log entry to the goal file with evidence references.

### Flow Diagram

```
Main Session: /why-review HOLISTIC (1) → /review-changes baseline+combine (2) → parallel batch (3–7)
              → /why-review validate COMBINED findings (8) → /code-simplifier (9)
              → Plan (10) → Plan-review (11) → Fix /plan-execute (12)
                  │
                  │ (no fix cycle: steps 1–8 clean → /plan-execute made no changes)
                  ↓
              skip re-verify → /docs-update (15) → /workflow-end (16) → /watzup (17) → DONE ✓
                  │
                  │ (only if /plan-execute changed files)
                  ↓
       POST-FIX RE-VERIFY LOOP over ORIGINAL target + fixed changes:
       ┌─→ /why-review HOLISTIC re-verify (13)  →  /review-changes re-verify INLINE (14)
       │        full-mode WHOLE target               over the current full diff
       │              │                                      │
       │     EITHER finds anything? ── yes ──→ Validate → /plan → /plan-review → /plan-execute
       └──────────────────────────────────────────────  (fix code + spec + tests) ──┘
                  │ BOTH clean (zero findings) + every behavior-changing fix has spec + §8 TC
                  ↓
            /docs-update (15) → /workflow-end (16) → /watzup (17) → DONE ✓
```

---

**IMPORTANT MANDATORY Steps:** /why-review -> /review-changes -> /review-architecture -> /review-domain-entities -> /performance-review -> /integration-test-review -> /security-review -> /why-review -> /code-simplifier -> /plan -> /plan-review -> /plan-execute -> /why-review -> /review-changes -> /docs-update -> /workflow-end -> /watzup

> **[STEP CONDITIONS]** Not every step always runs — the bare list above is the canonical order; these are the run-conditions:
> - **Step 0 `/goal` gate (pre-sequence)** — ALWAYS install it, including when this workflow is a step inside a parent workflow, because it always runs inline in the main session and owns the goal directly. Not one of the 17 counted steps.
> - **Step 1 `/why-review` (HOLISTIC, FULL mode)** — ALWAYS runs FIRST over the WHOLE review target, before any other reviewer, to surface design-rationale flaws up-front.
> - **Step 4 `/review-domain-entities`** — only if domain entity files (Domain/, Entities/, ValueObjects/) are in the diff.
> - **Step 8 `/why-review` (`--validate-findings`)** — validates the COMBINED accumulated findings from steps 1–7; drops false positives so steps 9–14 act only on warranted findings.
> - **Steps 10–12 `/plan` → `/plan-review` → `/plan-execute`** — only if reviews surfaced validated findings to fix (i.e. there are findings / code changes to make). Skip all three when steps 1–8 PASS clean.
> - **Steps 13–14 `/why-review` (HOLISTIC re-verify) → `/review-changes` (re-verify)** — only if `/plan-execute` actually changed files. Run step 13 holistic FIRST, then step 14 INLINE, over the ORIGINAL target + fixed changes; if EITHER finds anything, loop `/plan`→`/plan-review`→`/plan-execute`→steps 13→14 until BOTH are clean (3-repeat blocker cap). Skip both when no fix cycle happened.
> - **Steps 1–9, 15–17** — always run (step 9 `/code-simplifier` runs on both clean and fix paths).

> **[BLOCKING SEQUENCING]** Step 1 `/why-review` is SEQUENTIAL and MUST run FIRST — invoked in FULL/HOLISTIC mode (NOT `--validate-findings`) over the WHOLE review target to surface design-rationale flaws up-front. Step 2 `/review-changes` is SEQUENTIAL and runs immediately after — it produces the baseline (surface analysis + integration-test/translation gap detection) consumed by all downstream reviewers, accumulates into the combined report (seeded with step-1 holistic findings), AND owns the UI review (invokes `/review-ui` internally via a ui-ux-designer sub-agent when the diff has frontend/UI files). Steps 3–7 (`/review-architecture`, `/review-domain-entities`, `/performance-review`, `/integration-test-review`, `/security-review`) form a PARALLEL BATCH — spawn all in ONE message via specialized `Agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`); each appends to the accumulating combined report. Step 8 `/why-review` is SEQUENTIAL and runs after the batch barrier — invoked with `--validate-findings` over the COMBINED accumulated findings (drops false positives) before any fix. Step 9 `/code-simplifier` is SEQUENTIAL and waits until step 8 returns; it self-reviews the code it changes via `/code-review` (scoped to its own changed files) before returning, so there is no separate workflow-level code-review step. Steps 10–12 (`/plan` → `/plan-review` → `/plan-execute`) proceed sequentially when there are validated findings to fix. Steps 13–14 are the POST-FIX RE-VERIFY pair, run ONLY if `/plan-execute` changed files: step 13 `/why-review` in FULL/HOLISTIC mode (NOT `--validate-findings`) over the ORIGINAL target + fixed changes runs FIRST, THEN step 14 `/review-changes` re-runs INLINE over the current full diff — if EITHER surfaces findings, loop back through `/plan`→`/plan-review`→`/plan-execute`→13→14 until BOTH are clean. Only then step 15 `/docs-update` runs.

> **[WORKFLOW-IN-WORKFLOW: MUST RUN INLINE IN THE MAIN SESSION — never as a sub-agent]** This skill activates the full `workflow-review-changes` workflow (17 steps). When invoked as a step inside a parent workflow (e.g., `workflow-feature`, `workflow-bugfix`, `workflow-refactor`), it MUST run INLINE in the **main current session agent** via the `Skill` tool — NEVER dispatched through the `Agent` tool as a sub-agent. This is a deliberate, documented EXCEPTION to the general "Workflow-in-workflow → sub-agent" rule (CLAUDE.md / AGENTS.md "Workflow Step Advancement" §3).
>
> **Why inline, never a sub-agent:** this workflow's correctness depends on owning the main session. (1) Step 0 installs a `/goal` self-recursive review-loop gate that binds the **session Stop hook** so the review→self-fix→re-review loop is unabandonable — a sub-agent cannot own the session Stop hook, so dispatched as a sub-agent the loop guarantee is silently lost. (2) The steps 13–14 post-fix re-verify pair runs **INLINE by design** over the live main-session diff. (3) The recursive `/plan`→`/plan-review`→`/plan-execute`→`/why-review`→`/review-changes` self-fix loop must mutate and re-read the real working tree across the session, not an isolated context that only returns a summary. Context stays bounded anyway because the heavy reviewers (steps 3–7) are STILL dispatched as sub-agents that write full findings to `plans/reports/` — only the orchestration and the self-fix loop run inline.
>
> **Standalone invocation** (not inside a workflow): inline in the main session, identically — no sub-agent.

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[CONDITIONAL INLINE RE-VERIFY]** After validated fixes in `/plan-execute` — and ONLY if `/plan-execute` changed files — run the post-fix re-verify pair over the ORIGINAL target + fixed changes: step 13 `/why-review` (HOLISTIC, FULL mode) FIRST, THEN step 14 `/review-changes` INLINE over the current full diff. If EITHER finds anything, loop `/plan`→`/plan-review`→`/plan-execute`→13→14 until BOTH are clean. If `/plan-execute` made no changes, skip both steps 13–14. Repeated blockers stop after 3 no-progress invocations. Then step 15 `/docs-update` runs.
> **[REPEATED BLOCKER CAP]** Track re-verify invocations in conversation context, not persistent files. After a fix cycle, PASS = BOTH the step-13 holistic `/why-review` AND the step-14 inline `/review-changes` re-verify find zero findings without more fixes, with every behavior-changing fix covered by a spec + test update; stop after the same blocker repeats 3 times with no progress.

Activate the `workflow-review-changes` workflow. Run `/start-workflow workflow-review-changes` with the user's prompt as context.

> **Applicability in this workflow (reconciles with steps 13–14):** the canonical block below is the general fresh-context mechanism. In `workflow-review-changes` the **steps 13–14 post-fix re-verify pair applies its _principle_ — zero memory, re-read the full diff from scratch, no self-filtering — INLINE in the main session** (the deliberate cost tradeoff documented at steps 13–14), NOT via an isolated sub-agent. The isolated-sub-agent form below governs ONLY the parallel dimensional reviewers in steps 3–7 (already sub-agents); the workflow itself — even as a step inside a parent workflow — always runs INLINE in the main session, never as a sub-agent. So "with isolated sub-agents **where applicable**" resolves to *inline* for the steps 13–14 self-re-verify and for the workflow orchestration — no contradiction.

<!-- SYNC:parallel-phase-advancement -->

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `Agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Codex runs with no hooks and advances entirely by this rule.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

<!-- /SYNC:parallel-phase-advancement -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure changed work reaches clean review through validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, validate findings, fix ONLY validated findings, then re-run `/review-changes` INLINE (only when `/plan-execute` changed files), looping plan→plan-execute→review-changes until one complete pass is clean.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each line is a signpost to its canonical body above; NEVER act on the digest alone, read the cited block):**

- **Parallel-Phase Advancement:** spawn batch in one message; advance only after all-return barrier.
- **End-to-Start Debugger Trace:** trace observed end state backward before fixing.
- **Fresh Context Re-Review:** restart full review post-fix; zero-memory re-read counters confirmation bias.
- **Incremental Persistence:** append findings to report file per item; never hold in memory.
- **Sub-Agent Return Contract:** return only the summary shape; full report on disk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** parent workflow row never replaces child phase tasks.
- **Task Tracking & External Report:** bootstrap task breakdown and report path before work.
- **Critical Thinking:** every claim needs traced proof; confidence >80% to act.
- **Project Reference Docs:** read required project-reference docs first; conventions override generic defaults.

**IMPORTANT MUST ATTENTION** run the sequence in order — step 1 `/why-review` runs FIRST in FULL/HOLISTIC mode over the WHOLE target to surface design-rationale flaws up-front, step 2 `/review-changes` owns the baseline (surface analysis + UI review via internal `/review-ui` + integration-test/translation-sync/spec-drift gates) and accumulates the combined report, then steps 3–7 add to it, then step 8 `/why-review --validate-findings` validates the COMBINED findings BEFORE any fix — so steps 9–14 act only on warranted findings — why: validating after fixing wastes the fix cycle on false positives.
**IMPORTANT MUST ATTENTION** spawn the steps 3–7 read-only reviewers (`/review-architecture`, `/review-domain-entities` [if entity files], `/performance-review`, `/integration-test-review`, `/security-review`) ALL in ONE message and advance ONLY after EVERY member returns (all-return barrier) — run step 8 `/why-review --validate-findings`, then defer mutating `/code-simplifier` (step 9) until the barrier clears — why: a code-mutating step must see the complete review snapshot, not a partial one.
**IMPORTANT MUST ATTENTION** every finding, recommendation, and verdict needs `file:line` proof or traced evidence + a confidence % — >80% act, 60–80% verify first, <60% DO NOT recommend; "Insufficient evidence" is valid output — why: speculation is forbidden output and silently encodes false positives into the fix plan.

**MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 17 tasks immediately (source of truth = `workflows.json` → `review-changes.sequence`); mark one `in_progress`, mark `completed` immediately after each step's evidence; on context loss call `TaskList` first — never duplicate.
**MUST ATTENTION** grep 3+ existing patterns and read the target files BEFORE proposing any fix; cite `file:line` evidence in the fix plan — local conventions override generic framework defaults — why: closest example ≠ matching preconditions, verify shared base classes/scope/lifetime before copying.
**MUST ATTENTION** after fixes in `/plan-execute` (and ONLY if `/plan-execute` changed files), run the post-fix re-verify pair over the ORIGINAL target + fixed changes: step 13 `/why-review` HOLISTIC FIRST, then step 14 `/review-changes` INLINE over the current full diff from Phase 0; re-read the diff from scratch to counter orchestrator confirmation bias — why: the main agent rationalizes findings about its own fixes; if EITHER finds anything loop `/plan`→`/plan-review`→`/plan-execute`→13→14 until BOTH are clean.
**MUST ATTENTION** track full re-review invocations and repeated blockers in conversation context (session-scoped, no persistent files) — stop after the same blocker repeats 3 times with no progress and escalate via `AskUserQuestion`; STOP and escalate if round N finds MORE issues than round N-1 — never silently loop.
**MUST ATTENTION** PASS means one complete review pass finds zero blocking issues after all validated fixes and verification are included; a behavior-changing fix that left no covering §8 regression/preservation TC is an OPEN finding, NOT a clean pass — green tests do not normalize spec drift.
**MUST ATTENTION** skip steps 10–14 ONLY when all reviews PASS with zero findings (no fixes needed; `/code-simplifier` step 9 still runs on the clean path); mark conditional tasks `completed` with note "Skipped — all reviews passed" — NEVER consolidate, rename, or omit steps. The steps 13–14 post-fix re-verify pair is CONDITIONAL — it runs whenever a fix cycle changed files, and is NOT skippable in that case.
**MUST ATTENTION** the post-fix re-verify pair runs ONLY after a fix cycle changed files: step 13 `/why-review` STANDALONE in FULL mode over the WHOLE review target combined with the current fixed changes (NOT `--validate-findings`) FIRST, then step 14 `/review-changes` INLINE; if EITHER surfaces findings, re-enter `/plan`→`/plan-review`→`/plan-execute` and re-run steps 13→14, looping run→fix→run until BOTH find zero new findings — why: a standalone holistic `/why-review` of the target catches design-rationale/whole-package gaps the per-file/per-dimension reviewers (and the step-8 findings-validation gate) structurally cannot.
**MUST ATTENTION** adjudicate every behavior-vs-spec divergence in step 2 `/review-changes` as CODE-WRONG (BLOCKING) / SPEC-STALE (spec is stale, `/docs-update` fixes spec first) / AMBIGUOUS (escalate) — NEVER silently pick a side; the workflow is NOT clean while any divergence stays unadjudicated.
**IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking a task completed without invocation is a workflow violation; NEVER batch-complete validation gates — why: a skipped gate ships unreviewed work.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory `AskUserQuestion` user-decision gates — surface them, never silently pass when tests or locale updates are missing.
**IMPORTANT MUST ATTENTION** `/why-review` runs THREE times — step 1 as a HOLISTIC FULL-mode review of the WHOLE target FIRST (surfaces design-rationale flaws up-front), step 8 as a `--validate-findings` gate over the COMBINED accumulated findings (drops false positives before any fix; the fix-plan rationale check is owned by `/plan-review` (step 11), which self-invokes `/why-review --validate-findings` internally), AND step 13 as a HOLISTIC FULL-mode re-verify of the whole target + fixed changes after a fix cycle (loops run→fix→run with step 14 `/review-changes` until both pass clean). The three are different lenses — steps 1 & 13 review the whole artifact for whole-package/design-rationale gaps the per-file/per-dimension passes miss; step 8 validates the surfaced findings.
**IMPORTANT MUST ATTENTION** when invoked as a step inside a parent workflow, run this whole 17-step workflow INLINE in the main session via the `Skill` tool, NEVER as an `Agent` sub-agent — why: Step 0's `/goal` session Stop-hook gate and the steps 13–14 inline re-verify require owning the main session; a sub-agent cannot hold the Stop hook, so the unabandonable-loop guarantee would be silently lost. Context stays bounded because steps 3–7 reviewers remain sub-agents writing to `plans/reports/`.
**IMPORTANT MUST ATTENTION** apply critical + sequential thinking — keep the SKEPTIC default when reviewing: steel-man rejected alternatives, invert each stated reason, stress-test top assumptions; section presence ≠ quality — why: certainty without evidence is the root of hallucination.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding/test/refactor must answer "does this make the next change cheaper?"; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) — reject best practices that raise change cost.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| "Reviews look clean, skip `/why-review`"         | `/why-review` runs at step 1 (holistic, FIRST) and step 8 (validates the combined findings BEFORE the fix plan) — both run; a false positive entering the fix plan wastes 5 reviewers, and skipping the step-1 holistic pass loses the up-front design-rationale check. |
| "A fix cycle ran, skip the step-13 holistic `/why-review` re-verify" | After fixes, step 13 is a DIFFERENT lens (FULL-mode whole-target design-rationale re-verify) — it MUST run whenever `/plan-execute` changed files, and catches whole-package/coupling gaps the per-file/per-dimension passes never surface; skipping it reintroduces the exact miss this step was added to fix. |
| "Step 13 can reuse `--validate-findings`"        | No — `--validate-findings` is terminal and only re-checks an existing findings list; step 13 MUST run FULL mode to actually re-verify the whole target + fixed changes as one artifact. |
| "I already know what I fixed, skip re-review"    | Orchestrator confirmation bias — re-read the full diff from scratch INLINE; main-agent self-review is NOT enough. |
| "Tests are green, the spec drift is fine"        | Green can encode the drift itself — adjudicate CODE-WRONG / SPEC-STALE; not clean until every divergence resolved. |
| "Mark the step done, the skill obviously ran"    | Marking completed without invoking the `Skill` tool is a workflow violation — show the invocation evidence.       |
| "Same blocker again, one more loop will fix it"  | Cap at 3 no-progress repeats → escalate via `AskUserQuestion`; if issues increase round-over-round, STOP now.     |
| "Fix at the crash site, it's faster"             | Trace caller (wrong data) vs callee (wrong handling); fix at the responsible layer, never patch the symptom site. |

---

**IMPORTANT MUST ATTENTION** Step 0 (FIRST ACTION) installs the `/goal` self-recursive review-loop gate so stopping is BLOCKED until the whole loop reaches a clean zero-finding pass with every behavior-changing fix covered by a spec + test update — a pre-sequence wrapper, not one of the 17 steps; it ALWAYS runs (including as a step inside a parent workflow) because this workflow always runs inline in the main session and owns the session Stop hook directly.
**IMPORTANT MUST ATTENTION** step 1 `/why-review` runs FIRST (holistic, whole target); step 2 `/review-changes` owns the baseline and accumulates the combined report; steps 3–7 are the parallel batch (spawn in ONE message, advance only after the all-return barrier); step 8 `/why-review --validate-findings` validates the COMBINED findings before the fix; defer `/code-simplifier` (step 9) until the barrier clears.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); grep 3+ patterns and read target files before any fix — no speculation.
**IMPORTANT MUST ATTENTION** after `/plan-execute` changes files, run the steps 13–14 re-verify pair (`/why-review` HOLISTIC then `/review-changes` INLINE) from scratch over the original target + fixed changes and loop until BOTH reach a clean zero-finding pass — a behavior change with no covering §8 TC is an OPEN finding; cap repeated blockers at 3 → escalate.
