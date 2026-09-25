---
name: workflow-end
version: 1.0.0
description: '[Process] Use when ending the active workflow and clearing its state.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks; deliver a diff-gated one-way comprehension recap, then retain per-session recovery state until explicit `/clear` (which alone deletes it).

**Summary:**

- **Purpose:** Penultimate closure step before `/watzup`: close workflow evidence, trigger fresh detection next prompt, and explain changes without a diff reread.
- **Main steps (ordered):** (0) outcome-gate evidence check — block on missing evidence; (1) integration-test coverage check; (2) spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification; (3) sync graph if `.code-graph/` exists; (4) verify owned baseline and classify unowned/ambiguous changes; (5) verify preceding tasks; (6) print diff-gated recap (what / purpose / how / why); (7) close only exact owned baseline and verify `closed`/`deletionFailures`; (8) announce `Workflow [name] completed`; (9) confirm state retained until explicit `/clear`.
- **Blocking gates:** missing evidence for any outcome gate (step 0) → refuse to close and name the gap; coverage gap OR unadjudicated spec-vs-code drift → MUST surface via `AskUserQuestion`; NEVER silent-skip or report `completed` while drift is unadjudicated. Baseline closure requires qualified, user-accepted ambiguity, or explicit N/A.
- **Modes and terminal behavior:** recap only with a diff; recap one-way/no quiz/no block; deeper explanation → `/understand`. Completion is model-driven only after all tasks, sync recorded synced-or-accepted-as-is, and baseline closure qualified, user-accepted, or N/A; per-session state is retained until explicit `/clear` (which alone deletes it); no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` except `session-init` on explicit `/clear`.

**Workflow:**

1. **Detect** — classify scope and target artifacts.
2. **Execute** — perform required evidence-backed steps.
3. **Explain** — print diff-gated recap (skip only with no changes).
4. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION first check evidence for every outcome gate (step 0); `review-converged` runs `review-receipt.cjs check` and reads its JSON, or accepts a cited review report logged as a `review-report` deviation-log line. Missing evidence blocks the close.
- MUST ATTENTION when the workflow produced a diff, print the comprehension recap (what changed / purpose / how it works / why) — NEVER fully skip when changes exist.
- MUST ATTENTION the recap is one-way — NO quiz, NO teach-back, NEVER blocks. Deeper comprehension is handled by the standalone `/understand` skill, which `/watzup` invokes for a large code change or on request, and which the developer can also invoke directly for any target.
- MUST ATTENTION run the spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification when behavior-changing files are in the diff — the workflow MUST NOT report completed while a behavior-vs-spec divergence is unadjudicated; surface unsynced drift via `AskUserQuestion`, never silent-close.
- MUST ATTENTION close the workflow-owned baseline before announcing completion: run the bounded `workflow-baseline.cjs report` for the recorded run ID, classify owned versus unowned changes, and report `AMBIGUOUS` for unowned paths, endpoint-only ownership, or intermediate commits. Persist the final report and print the recap before running `workflow-baseline.cjs close` for that exact run; verify `closed` and `deletionFailures`, preserve any parent run, and never use broad cleanup. Never replace this with `git diff` attribution, claim every dirty file, restore user work, or read expired/sensitive snapshots.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

## When This Runs

This skill closes workflow state. In workflows with `/watzup`, it runs after final verification/docs and before `/watzup`: print a one-way recap, then retain per-session tracking until explicit `/clear`. Use `/understand` for deep standalone explanation.

**NOT for:** manual mid-workflow invocation; switch via `/start-workflow`.

---

## What To Do

0. **Outcome-gate evidence check** (FIRST step, before anything else; BR-GWF-03). Read the run's `outcomeGates` from its Tier-2 manifest (`[]` → record `N/A — no outcome gates declared`). Cite evidence for every gate; a gate whose `when` does not hold is `N/A` with that reason. **Missing evidence for any gate blocks the close:** keep this task `in_progress`, name the gate and the missing evidence, and suggest the step that produces it.
    - `review-converged`: run `node .claude/hooks/lib/review-receipt.cjs check` (default target `worktree`) and read its JSON, not its exit code (it exits 0 when no receipt matches). `ERROR` blocks. `CLEAN` passes (nothing to review). `CHANGED` with a non-null `review` passes (a receipt); a `skip` receipt alone is not a receipt. `CHANGED` with `review: null` passes only when the run cites the review report written by the occurrence that satisfies this gate (a step whose skill is in the gate's `outcomeGates[].satisfiedBy`, e.g. `workflow-review-changes`, `artifact-review` or `integration-test-review`; an existing file under the project, e.g. in `tmp/reports/`): append `<that occurrence-id> · review-report · <report path>` to the run's deviation log `tmp/workflow-runs/<runId>/skips.md` and continue — never block or ask when a report is cited. Read the report's final status and compare its time with the run's last change-producing occurrence: when the final status is not converged/PASS, or the report predates that occurrence, the line's evidence says so (`<report path> — not converged: <final status>` or `<report path> — stale: predates <occurrence-id>`) and the close message repeats it. Neither a receipt nor a cited report → block, name the gap, and suggest running the review. When the close rests on a report, the close message states that a commit still needs the receipt (`/workflow-review-changes --fix-loop` mints it). On a host that cannot run the command, the cited report is the evidence, logged the same way — say so.
    - `tests-pass`: cite the test command and its output; those tests cover every behaviour the run changed and ran green in this run (BR-GWF-15). Unrelated green tests are not evidence.
    - `spec-synced`: cite the spec-sync diff, or a "no behavior change" statement with the diff stat.
    - `root-cause-traced`: cite the root-cause trace (`file:line`) from the investigation report.
    - `plan-approved`: cite the plan-review verdict or the user's approval.
    - `run-closed`: proved by steps 4–7 of this skill; confirm at step 9.

1. **Integration test coverage check** (skip if workflow is docs/design/investigation/e2e-only, or project has no test suite):

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

(The second command lists untracked files not yet staged — catches brand-new handler files before first git add) - Scan changed files for those likely requiring integration test coverage: **business logic files** such as handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from the project's existing file patterns (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`). - For each identified file → search for a corresponding test file. Infer the project's test naming convention from existing tests (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects). - If ANY identified file lacks a corresponding test → **MANDATORY**: use `AskUserQuestion`: - Option A: "Run `/integration-test` now" (Recommended) - Option B: "Tests already written/updated — proceed" - **No silent skip.** Business logic changes without test coverage MUST be surfaced to the user. - If no business logic files changed, or all have matching tests → skip silently

2. **Spec ↔ TDD-test sync gate** (`spec-tdd-test-sync-gate` — runs BEFORE task-completion verification; skip with reason only if the workflow is docs/design/investigation/e2e-only OR the diff has no behavior-changing files):

    The feedback half of the loop closes HERE — a workflow MUST NOT report completed while the spec still diverges from the code that just changed. Green tests do NOT normalize that drift.

    - Scope to the behavior-changing files in the diff (same surface the coverage check above scanned — handlers/commands/queries/services/controllers/entities/event processors and behavior-bearing frontend logic).
    - Run `/spec [mode=sync]` over the §8 TCs ↔ executing tests for those files: reconcile every §8 TC against its covering test, and surface any §8 TC with no covering test or any business `TestSpec` guarding behavior with no §8 TC.
    - Re-check for **unadjudicated spec-vs-code drift**: any behavior-changing file whose divergence from the canonical Feature Spec was never classified CODE-WRONG / SPEC-STALE / AMBIGUOUS / in-sync (per `SYNC:spec-drift-adjudication`).
    - If `/spec [mode=sync]` finds an unsynced §8 TC, OR any behavior-vs-spec divergence is unadjudicated → **MANDATORY**: surface via `AskUserQuestion`:
        - Option A: "Reconcile now — run `/spec [mode=sync]` / `/spec [update]` to close the drift" (Recommended)
        - Option B: "Accept as-is — I will record the reason" (the user's accept-as-is reason is captured in the recap)
    - **No silent skip, no silent close.** **Workflow MUST NOT report `completed` while a behavior-vs-spec divergence is unadjudicated** — record the gate outcome (synced / accepted-as-is-with-reason) before proceeding.

3. **Sync knowledge graph** (skip if `.code-graph/` dir doesn't exist):
    ```bash
    if [ -d ".code-graph" ]; then python .claude/scripts/code_graph sync --json && python .claude/scripts/code_graph update --json; fi
    ```
    Report results briefly.
4. **Verify workflow ownership baseline** (when `/start-workflow` recorded a run):
   - Run `node .claude/scripts/lib/workflow-baseline.cjs report` with the run ID and project root.
   - Treat `QUALIFIED` as “no observed unowned path changes,” not proof that every hunk was authored by this run.
   - Treat `AMBIGUOUS` as a blocking closure finding until the user accepts the cited reason; include owned paths, unowned paths, intermediate-commit status, and the residual A→B→C shared-file TOCTOU ambiguity.
   - If the record is age ≥24h, report `EXPIRED` and do not read/recover snapshots. Close/cancel performs best-effort deletion of the exact run files; deletion failure never restores eligibility.

5. Verify all preceding workflow tasks are completed or explicitly skipped with evidence. Keep this closure task in progress until its report, recap and owned-run close have finished.

6. **Explain the changes — developer comprehension recap** (the final teaching step; runs after everything else is done):

    Scope what this workflow changed:

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

    - **No diff** (pure investigation/research/docs-only workflow with nothing built) → skip with reason `"no changes to explain"`.
    - **Diff present** → ALWAYS print a one-way teaching recap so the developer understands the work **without re-reading the diff**. This is one-way — NO quiz, NO teach-back, NEVER blocks. For a deeper explanation of any target (a plan, subsystem, decision, concept, or bug), use `/understand`; `/watzup` invokes it for a large code change or on request.

    Always print at least the short recap when a diff exists — NEVER fully skip.

    **Structure (optimize for easiest learning — lead with high-level motivation, then drill into low-level logic; surface what a reader would NOT guess from the diff):**

    1. **What changed** — concrete edits grouped by **behaviour** (not by file); cite `file:line`.
    2. **Purpose / kind** — feature / bug fix / enhancement / refactor / perf / security — and the problem it solves.
    3. **How it works** — mechanism, key logic, invariants relied on, edge cases preserved; focus the **non-obvious**.
    4. **Why this way** — rationale and trade-offs; why over the obvious alternative.

7. **Close only the workflow-owned baseline run** after the final report is persisted and the recap printed:
   - When `/start-workflow` recorded a run, invoke `node .claude/scripts/lib/workflow-baseline.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir` when one was recorded. Use the exact same identity as step 4; never guess a replacement run or directory.
   - Inspect the command exit status AND JSON result: require `closed === true` and an empty `deletionFailures` array. A zero exit alone is not proof of cleanup. On error or deletion failure, retain the closure task as incomplete and report each failure without claiming state cleared; retry only that exact run when safe. Do not restore expired eligibility.
   - Nested closure closes only the child run; preserve the parent run and all sibling runs. Never call `cleanup-expired` or delete a store directory as part of this step.
   - If no baseline run was recorded, explicitly mark only this step `N/A — no recorded baseline run`; do not discover or remove another run.
8. Mark this task `completed` and announce to the user: "Workflow **[name]** completed. Next prompt will trigger fresh workflow detection."
9. Workflow end is model-driven — it completes once this skill's TaskList items are all marked done, the outcome-gate check (step 0) cited evidence or `N/A` for every gate, the spec ↔ TDD-test sync gate (step 2) recorded synced-or-accepted-as-is, the owned-baseline report (step 4) recorded qualified or user-accepted ambiguity, and the exact owned-run close (step 7) succeeded or was explicitly not applicable. No hook clears persisted workflow tracking on completion; the actual `CK_TMP_DIR/workflow/{sessionId}.json` is cleaned by `session-init` on an explicit `/clear`. Do not describe normal completion as deleting the per-session tracking file.

---

## See Also

- **Skill:** `/start-workflow` - Start/switch workflows
- **Doc:** `CLAUDE.md` → _Workflow Step Advancement_ - model-driven advancement rule (no step-tracking hook)
- **Hook:** `session-init.cjs` - cleans the per-session `CK_TMP_DIR/workflow/{sessionId}.json` on an explicit `/clear`

---

**IMPORTANT MANDATORY Steps:** outcome-gate-evidence-check -> integration-test-coverage-check -> spec-tdd-test-sync-gate -> sync-knowledge-graph -> verify-owned-baseline -> verify-task-completion -> explain-changes-recap -> close-owned-baseline -> announce-workflow-completion -> confirm-state-retained-until-explicit-clear

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow End

Finalize and close the active workflow while retaining per-session recovery state until an explicit `/clear` event.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks; deliver a diff-gated one-way comprehension recap, then retain per-session recovery state until explicit `/clear` (which alone deletes it).

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess as fact.
- **Project Reference Docs Guide:** MUST ATTENTION read required project-reference docs (ALWAYS `lessons.md`) before target work.

**IMPORTANT MUST ATTENTION Main steps (run in order, NEVER skip/merge):** (0) outcome-gate evidence check; (1) integration-test coverage check; (2) spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification; (3) sync graph if `.code-graph/` exists; (4) verify owned baseline and classify unowned/ambiguous changes; (5) verify preceding tasks; (6) print diff-gated recap (what / purpose / how / why); (7) close only exact owned baseline and verify `closed`/`deletionFailures`; (8) announce `Workflow [name] completed`; (9) confirm state retained until explicit `/clear`.
**IMPORTANT MUST ATTENTION** when the workflow changed code (diff present), print the comprehension recap — what changed / purpose / how it works / why — grouped by behaviour not file, optimized for easiest learning, NEVER fully skip when changes exist — why: the developer must understand the work without re-reading the diff
**IMPORTANT MUST ATTENTION** the spec ↔ TDD-test sync gate runs BEFORE task-completion verification — NEVER report the workflow `completed` while a behavior-vs-spec divergence is unadjudicated; reconcile via `/spec [mode=sync]` or capture an explicit accept-as-is reason — why: green tests do not normalize spec drift; the feedback half of the loop closes here
**IMPORTANT MUST ATTENTION** run the integration-test coverage check on changed business-logic files (handlers/commands/queries/services/controllers/resolvers/event processors) — if ANY lacks a matching test, surface via `AskUserQuestion`; NEVER silent-skip — why: business-logic change without coverage ships an unguarded regression path
**IMPORTANT MUST ATTENTION** the recap is one-way and NEVER blocks — no quiz, no teach-back; route deeper comprehension to the standalone `/understand` skill — why: blocking on a teaching step would stall workflow closure
**IMPORTANT MUST ATTENTION** workflow end is model-driven — close ONLY once every TaskList item is done AND the sync gate recorded synced-or-accepted-as-is; NEVER wait for a hook to clear state — why: no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` on completion (only `session-init` cleans it on explicit `/clear`)
**IMPORTANT MUST ATTENTION** break work into small todo tasks with `TaskCreate` BEFORE starting; mark one `in_progress`, complete it immediately after its evidence lands; add a final review todo — why: untracked steps get silently skipped under long context
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code, and verify pattern FIT (same abstraction, owner, scope, lifetime, and preconditions) before copying the nearest example — why: closest example ≠ matching constraints
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim — confidence >80% to act, <60% DO NOT recommend; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** sync the knowledge graph ONLY if `.code-graph/` exists, then announce `Workflow [name] completed` so the next prompt triggers fresh detection

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "No real code changed, skip the recap"           | A diff exists → print at least the short recap. Skip ONLY with reason `no changes to explain`.    |
| "No receipt, but the review surely ran"           | Cite the review report path and log it as `review-report`; no receipt and no report → refuse to close. |
| "Tests are green, mark the workflow completed"    | Green ≠ synced. Run the spec↔TDD-test sync gate FIRST; unadjudicated drift blocks `completed`.    |
| "Business file changed but I'm sure it's covered" | Show the matching test `file:line`. No proof → surface coverage gap via `AskUserQuestion`.        |
| "Workflow feels done, clear state now"            | Model-driven: confirm ALL TaskList items done + sync gate recorded before announcing completion.  |

**IMPORTANT MUST ATTENTION Goal echo:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks; deliver a diff-gated one-way comprehension recap, then retain per-session recovery state until explicit `/clear` (which alone deletes it).
**IMPORTANT MUST ATTENTION** NEVER silent-skip integration-test coverage or the spec↔TDD-test sync gate — surface gaps via `AskUserQuestion`; baseline closure requires qualified, user-accepted ambiguity, or explicit N/A.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80%); print the diff-gated recap; NEVER report `completed` with unadjudicated drift.
**IMPORTANT MUST ATTENTION Modes/terminal:** recap only with a diff; recap one-way/no quiz/no block. Completion is model-driven; no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` except `session-init` on explicit `/clear`.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
