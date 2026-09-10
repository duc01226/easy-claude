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

**Goal:** [Process] Close the active workflow cleanly — complete the closure gates and print a one-way developer-comprehension recap (what / purpose / how / why) of what the workflow changed. Normal completion leaves the per-session workflow tracking intact for recovery; explicit `/clear` owns state deletion.

**Summary:**

- **Purpose:** penultimate state-closure step (runs before `/watzup`) — close the active workflow cleanly so the next prompt gets fresh detection, AND leave the developer understanding what changed without re-reading the diff.
- **Main steps (ordered):** (1) integration-test coverage check on changed business-logic files; (2) spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification; (3) sync knowledge graph if `.code-graph/` exists; (4) verify the workflow-owned baseline and classify unowned/ambiguous changes; (5) verify all preceding tasks completed; (6) print the diff-gated one-way comprehension recap (what / purpose / how / why); (7) close only the recorded owned baseline run and verify deletion results; (8) announce `Workflow [name] completed`; (9) confirm per-session state is retained until explicit `/clear`.
- **Blocking gates:** coverage gap (changed handler/command/service/controller with no matching test) OR unadjudicated spec-vs-code drift → MUST surface via `AskUserQuestion`, NEVER silent-skip; workflow MUST NOT report `completed` while drift is unadjudicated.
- **Model-driven close:** completes once ALL TaskList items done, the sync gate recorded synced-or-accepted-as-is, and the exact owned baseline run closed successfully or was explicitly not applicable. NO hook clears the actual `CK_TMP_DIR/workflow/{sessionId}.json` on normal completion; `session-init` cleans it only on explicit `/clear`.
- **Recap depth** throttled by `codingLevel` (`CK_CODING_LEVEL` → `.claude/.ck.json` → default 3); skip recap ONLY when there is no diff. The recap never quizzes and never blocks — deeper explanation is the standalone `/understand` skill.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Explain** — print the diff-gated comprehension recap (skip only when no changes).
4. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION when the workflow produced a diff, print the comprehension recap (what changed / purpose / how it works / why) — depth throttled by `codingLevel`, but NEVER fully skip when changes exist.
- MUST ATTENTION the recap is one-way — NO quiz, NO teach-back, NEVER blocks. Deeper comprehension is handled by the standalone `/understand` skill, which `/watzup` invokes as its final handoff and which the developer can also invoke directly for any target.
- MUST ATTENTION run the spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification when behavior-changing files are in the diff — the workflow MUST NOT report completed while a behavior-vs-spec divergence is unadjudicated; surface unsynced drift via `AskUserQuestion`, never silent-close.
- MUST ATTENTION close the workflow-owned baseline before announcing completion: run the bounded `workflow-baseline.cjs report` for the recorded run ID, classify owned versus unowned changes, and report `AMBIGUOUS` for unowned paths, endpoint-only ownership, or intermediate commits. Persist the final report and print the recap before running `workflow-baseline.cjs close` for that exact run; verify `closed` and `deletionFailures`, preserve any parent run, and never use broad cleanup. Never replace this with `git diff` attribution, claim every dirty file, restore user work, or read expired/sensitive snapshots.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

## When This Runs

This skill is the **workflow state-closure step**. In workflows including `/watzup`, runs after final verification/docs work and before `/watzup`, so the active workflow closes before post-workflow summary and `/understand` handoff. As the penultimate action — after all workflow work is done and before the developer handoff — it prints a one-way comprehension recap; the actual per-session tracking file remains until explicit `/clear`. Use `/understand` for a deep standalone explainer of any target.

**NOT for**: Manual invocation mid-workflow (use workflow switching via `/start-workflow` instead).

---

## What To Do

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
    - **Diff present** → ALWAYS print a one-way teaching recap so the developer understands the work **without re-reading the diff**. This is one-way — NO quiz, NO teach-back, NEVER blocks. For a deeper explanation of any target (a plan, subsystem, decision, concept, or bug), use `/understand`; `/watzup` invokes it as the final handoff.

    **Throttle depth by coding level** (resolve first found: env `CK_CODING_LEVEL` → `.claude/.ck.json` `codingLevel` → default `3`):

    | Level | Recap depth |
    | ----- | ----------- |
    | 4–5 | 2–4 tight sentences on the highest-blast-radius change only |
    | 2–3 | The four-part recap below, concise |
    | 0–1 | The four-part recap, fuller, plainest language, define non-obvious terms |

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
9. Workflow end is model-driven — it completes once this skill's TaskList items are all marked done, the spec ↔ TDD-test sync gate (step 2) recorded synced-or-accepted-as-is, the owned-baseline report (step 4) recorded qualified or user-accepted ambiguity, and the exact owned-run close (step 7) succeeded or was explicitly not applicable. No hook clears persisted workflow tracking on completion; the actual `CK_TMP_DIR/workflow/{sessionId}.json` is cleaned by `session-init` on an explicit `/clear`. Do not describe normal completion as deleting the per-session tracking file.

---

## See Also

- **Skill:** `/start-workflow` - Start/switch workflows
- **Doc:** `CLAUDE.md` → _Workflow Step Advancement_ - model-driven advancement rule (no step-tracking hook)
- **Hook:** `session-init.cjs` - cleans the per-session `CK_TMP_DIR/workflow/{sessionId}.json` on an explicit `/clear`

---

**IMPORTANT MANDATORY Steps:** integration-test-coverage-check -> spec-tdd-test-sync-gate -> sync-knowledge-graph -> verify-owned-baseline -> verify-task-completion -> explain-changes-recap -> close-owned-baseline -> announce-workflow-completion -> confirm-state-retained-until-explicit-clear

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow End

Finalize and close the active workflow while retaining per-session recovery state until an explicit `/clear` event.

---

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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`. After compaction, resume, delegation, or a material context change, repeat the route and restate the set; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, surface ambiguity before acting, and route disposable generated output (including integration/E2E results) to project-root `tmp/` or `temp/`; root `.gitignore` ignores both by default.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Load detail just in time immediately before the first target read/grep/edit/test; hooks may provide a pointer, but a hook event or prior turn is never evidence that the current files were read.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work. On compaction, resume, delegation, or a context change, re-read the required docs and restate the route before continuing.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Close the active workflow cleanly — complete closure evidence and leave the developer understanding what the workflow changed via the diff-gated one-way comprehension recap. Normal completion retains per-session tracking; explicit `/clear` owns deletion.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess as fact.
- **Project Reference Docs Guide:** MUST ATTENTION read required project-reference docs (ALWAYS `lessons.md`) before target work.

**IMPORTANT MUST ATTENTION Main steps (run in order, NEVER skip/merge):** (1) integration-test coverage check → (2) spec ↔ TDD-test sync gate BEFORE task-completion verification → (3) sync knowledge graph if `.code-graph/` exists → (4) verify owned baseline and persist final report → (5) verify preceding tasks → (6) diff-gated comprehension recap → (7) close only the recorded owned baseline run, check `closed` and `deletionFailures`, preserve parent/sibling runs → (8) mark this task completed and announce `Workflow [name] completed` → (9) confirm closure evidence without claiming residual tracking was deleted — why: AI keeps forgetting the skill's own steps; surfacing the ordered list prevents silent step-loss under long context.
**IMPORTANT MUST ATTENTION** when the workflow changed code (diff present), print the comprehension recap — what changed / purpose / how it works / why — grouped by behaviour not file, optimized for easiest learning; depth throttled by `codingLevel` (`CK_CODING_LEVEL` → `.claude/.ck.json` → default 3), NEVER fully skip when changes exist — why: the developer must understand the work without re-reading the diff
**IMPORTANT MUST ATTENTION** the spec ↔ TDD-test sync gate runs BEFORE task-completion verification — NEVER report the workflow `completed` while a behavior-vs-spec divergence is unadjudicated; reconcile via `/spec [mode=sync]` or capture an explicit accept-as-is reason — why: green tests do not normalize spec drift; the feedback half of the loop closes here
**IMPORTANT MUST ATTENTION** run the integration-test coverage check on changed business-logic files (handlers/commands/queries/services/controllers/resolvers/event processors) — if ANY lacks a matching test, surface via `AskUserQuestion`; NEVER silent-skip — why: business-logic change without coverage ships an unguarded regression path
**IMPORTANT MUST ATTENTION** the recap is one-way and NEVER blocks — no quiz, no teach-back; route deeper comprehension to the standalone `/understand` skill — why: blocking on a teaching step would stall workflow closure
**IMPORTANT MUST ATTENTION** workflow end is model-driven — close ONLY once every TaskList item is done AND the sync gate recorded synced-or-accepted-as-is; NEVER wait for a hook to clear state — why: no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` on completion (only `session-init` cleans it on explicit `/clear`)
**IMPORTANT MUST ATTENTION** break work into small todo tasks with `TaskCreate` BEFORE starting; mark one `in_progress`, complete it immediately after its evidence lands; add a final review todo — why: untracked steps get silently skipped under long context
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code, and verify pattern FIT (same base class, scope, lifetime, preconditions) before copying the nearest example — why: closest example ≠ matching constraints
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim — confidence >80% to act, <60% DO NOT recommend; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** sync the knowledge graph ONLY if `.code-graph/` exists, then announce `Workflow [name] completed` so the next prompt triggers fresh detection

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "No real code changed, skip the recap"           | A diff exists → print at least the short recap. Skip ONLY with reason `no changes to explain`.    |
| "Tests are green, mark the workflow completed"    | Green ≠ synced. Run the spec↔TDD-test sync gate FIRST; unadjudicated drift blocks `completed`.    |
| "Business file changed but I'm sure it's covered" | Show the matching test `file:line`. No proof → surface coverage gap via `AskUserQuestion`.        |
| "Workflow feels done, clear state now"            | Model-driven: confirm ALL TaskList items done + sync gate recorded before announcing completion.  |

**IMPORTANT MUST ATTENTION Goal echo:** close the workflow cleanly — diff-gated recap delivered, sync gate adjudicated, closure evidence recorded, and per-session state retained until explicit `/clear`.
**IMPORTANT MUST ATTENTION** NEVER silent-skip the integration-test coverage gate or the spec↔TDD-test sync gate — surface gaps via `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80%); print the diff-gated recap; NEVER report `completed` with unadjudicated drift.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
