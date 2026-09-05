---
name: fix
version: 1.4.1
description: '[Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci|issue|logs|test|types|ui} scopes the fix; --target=types resolves TypeScript errors inline.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), add or update regression coverage, and prove convergence with `/prove-fix`.

**Summary:** Route every fix through evidence-backed diagnosis, lowest-layer correction, regression coverage, spec/test synchronization, and proof/review gates; `--target=` branches and standalone calls retain explicit routing contracts.

- **Purpose:** an intelligent fix router that cures the disease, not the symptom — diagnose the root cause with evidence, fix at the lowest invariant-owning layer, add or update regression coverage, prove it with `/prove-fix`, then keep spec + tests + code in sync.
- **Router first (`--target=`):** with `--target={ci|issue|logs|test|types|ui}` clear the Root-Cause Prerequisite Gate, then jump to that self-contained inline branch (each runs its own diagnosis + `/prove-fix`); no flag = run the full diagnose→fix spine. — why: branches must not re-run §1/§2 of the standalone spine, but no branch is exempt from having a traced root cause.
- **Main steps (no-flag spine):** Root-Cause Prerequisite Gate → investigation via researcher subagents → diagnose root cause end-to-start (`debug-investigate`, `file:line` evidence, hypothesis matrix, forward convergence proof) → Confidence & Evidence Gate → plan with impact analysis → 🛑 Validate-Before-Fix approval → implement at the owning layer → `/prove-fix` → mandatory standalone test-update gate (`/integration-test`, with a justified `/test` unit-test fallback) → conditional `/spec` correctness check → `/changes-review` (production code) → `/why-review` terminal sign-off.
- **Root-Cause Prerequisite Gate (BLOCKING, runs FIRST):** a direct `/fix` call — no-flag spine **and** every `--target=` branch — MUST NOT edit code until `/debug-investigate` produced a root cause for THIS problem in THIS session, proven by a `TaskList` row or a written investigation report (memory is not evidence; a parent workflow row alone is not proof). Not run → run `/debug-investigate` first, then resume from the planning step. — why: otherwise the first edit lands with zero traced cause and patches the symptom site.
- **Three hard gates that cannot be skipped:** the Root-Cause Prerequisite Gate (above), the Confidence & Evidence Gate (declare `Confidence: X%` + `file:line`, STOP if <60%) and the 🛑 Validate-Before-Fix approval (present root cause + plan via `AskUserQuestion` before any code change — skip approval only inside a workflow).
- **Diagnose before patching:** trace the symptom end-to-start to the invariant-owning layer, and NEVER fix at the crash site — the crash site is a symptom, the cause enters at a lower layer.
- **Mode + skip rules:** default mode HARD (full rigor) unless ALL 5 trivial-bug opt-out conditions hold; standalone (no parent workflow) self-assembles the minimum spine `debug-investigate → fix + prove-fix → /integration-test test-update (or justified /test unit-test fallback) → /spec correctness check → /changes-review (production code) → /why-review`; inside a workflow this whole contract is SKIPPED — **except the Root-Cause Prerequisite Gate, which never skips**: it still demands proof the sequence actually ran `debug-investigate` for this problem. — why: standalone has no sequence supplying diagnosis, test updates, spec sync, or review; and a workflow row is not proof its diagnosis step ran.

**Workflow:**

1. **Investigation** — Use researcher subagents to explore the issue in parallel; use `/investigate` inline for graph-backed tracing.
2. **Diagnose** — Trace root cause through code paths with evidence
3. **Plan** — Create fix plan with impact analysis
4. **Fix** — Implement and verify the fix
5. **Standalone test update** — After the fix and `/prove-fix`, every standalone call invokes `/integration-test` to add or update regression coverage; use `/test` only for a justified unit-test seam. Inside a workflow, the parent sequence owns these test phases.

**Key Rules:**

- **Root-Cause Prerequisite Gate (BLOCKING):** no code edit until `/debug-investigate` traced THIS problem in THIS session — evidence, not recall
- Debug Mindset: every claim needs `file:line` evidence
- Use subagents for parallel investigation of multiple hypotheses
- Always create a plan before implementing complex fixes
- **Target flag** (see [Target Routing](#target-routing---target)): `--target={ci|issue|logs|test|types|ui}` selects a self-contained inline branch that scopes the fix to that domain. No flag = full diagnose→fix spine below.

## Default Mode Policy

> **Default mode HARD (full rigor).** Every section below — parallel researcher subagents, root-cause tracing with `file:line` evidence, Confidence & Evidence Gate, fix plan with impact analysis, preservation tests for the bug — applies by default.
>
> **Opt out to fast mode ONLY when ALL true** (bug genuinely trivial):
>
> - Root cause obvious from error message AND already located (no diagnosis needed)
> - Single-file fix, ≤10 lines changed
> - No cross-service impact, no contract change
> - Test for bug already exists OR bug non-functional (typo, log message)
> - Confidence in fix ≥95% without further investigation
>
> **Any condition fails → use full protocol below.** When in doubt, default hard. Skipping diagnosis on non-trivial bug fixes symptom and leaves disease.
>
> **Fast mode skips (and only skips):** parallel subagent investigation (direct read/grep instead), separate fix plan (inline change), regression-test authoring (only if covering test exists). Does NOT skip Confidence & Evidence Gate, Behavioral Delta Matrix, or running existing test suite.

## 🛑 Root-Cause Prerequisite Gate (Direct `/fix` Invocation) — BLOCKING

> **[BLOCKING] `/fix` MUST NOT edit code until `/debug-investigate` has produced a root cause for THIS problem in THIS session.** This gate runs BEFORE the Standalone Mode Minimum Contract below, BEFORE any `--target=` branch body, and BEFORE the 🛑 Validate-Before-Fix approval. — why: `/fix` invoked directly can otherwise reach its first edit with zero traced root cause, which patches the symptom site and ships the disease.
>
> **1. Trigger — ALL direct `/fix` invocations.** User-typed slash command or model-selected skill; every `--target={ci|issue|logs|test|types|ui}` branch **and** the no-flag spine alike. The `--target=` branches do NOT re-run §1/§2 of the contract below, but they DO pass through this gate. — why: a branch's own `debugger`/`tester` subagent step is not an end-to-start root-cause trace, so scoping the run does not remove the need for one.
>
> **2. Check — evidence, never memory.** Before the first code edit, determine whether `/debug-investigate` already ran **in this session, for this same problem**. Accept ONLY:
>
> - a `TaskList` row for `debug-investigate` (or its phase tasks) covering this symptom, **or**
> - a written investigation report naming this symptom (e.g. `.ai/workspace/analysis/{issue-name}.analysis.md`, `plans/reports/debug-investigate-*.md`) containing the end-to-start trace.
>
> **No such evidence → treat as NOT run.** Recalling that the cause "is known" is not evidence. — why: after context compaction the model's belief that it already investigated survives while the actual findings do not.
>
> **3. Act.** Not run → run `/debug-investigate` on the problem FIRST, then resume the `/fix` spine **from its planning step** using that root-cause report. This subsumes the spine's internal step-1 `debugger` subagent (identical to the contract's §1 rule below). — why: re-running diagnosis after the skill already traced it double-runs the spine.
>
> **4. Same-problem test.** A prior `/debug-investigate` for a **different** symptom does NOT satisfy this gate. Satisfaction binds to the problem, not to the skill name. When the current `<issues>` names a symptom the existing report does not cover, the gate FIRES. — why: one investigation per session would otherwise license unlimited untraced fixes.
>
> **5. Skip conditions — explicit, narrow, and recorded.** Record which one applies with its proof; never skip silently:
>
> | Condition                                                                                                                  | Skip? |
> | -------------------------------------------------------------------------------------------------------------------------- | ----- |
> | Same-problem evidence per §2 exists → cite the `file:line` / task-row proof and proceed                                     | YES   |
> | Fast-mode-trivial bug (**ALL 5** `Default Mode Policy` opt-out conditions hold) → MAY inline the end-to-start trace instead of spawning the skill; the trace itself is still REQUIRED | PARTIAL |
> | Active parent workflow row whose sequence **already executed** `debug-investigate` for this problem → cite the completed step | YES   |
> | Active parent workflow row **alone**, with no completed `debug-investigate` step for this problem                            | **NO** |
>
> **The last row is the hole this gate closes.** The contract below detects standalone mode by the mere *presence* of a parent workflow row (`Detect mode`, §"Standalone Mode Minimum Contract"); a row can exist while the sequence's `debug-investigate` step never ran, ran for a different symptom, or was skipped. This gate ADDS the stricter requirement — proof of execution for THIS problem — on top of that detection; it never relaxes it. — why: presence of a container task is not evidence that the work inside it happened.
>
> **BLOCKED until:** the §2 check is stated with its evidence (or its explicit skip row + proof) AND a root-cause trace for this problem exists. **NEVER** proceed to plan or edit on "the cause is obvious" alone.

## Standalone Mode Minimum Contract (Non-Workflow Only)

> **`/fix` is normally a step inside `workflow-bugfix`** — there the sequence (`investigate → debug-investigate → spec [mode=amend] → plan → … → fix → prove-fix → … → spec [mode=sync] → workflow-review-changes`) supplies the diagnosis, spec sync, and review around the fix. **Called STANDALONE, no sequence supplies them.** `/fix` alone diagnoses and patches code; it does NOT by itself guarantee the root cause was traced to its owning layer, that the Feature Spec under `docs/specs/` still matches behavior, or that the change was reviewed. Standalone, that gap is symptom-patching + spec/doc drift.
>
> **Scope:** this contract governs every standalone `/fix` invocation (no parent workflow). The **no-flag `/fix` spine** runs the full diagnose→fix path; the `--target={ci|issue|logs|test|types|ui}` branches remain self-contained for diagnosis + `/prove-fix` and do NOT re-run §1/§2 here, but they still inherit the mandatory **§3 test-update gate**, **§4 spec-correctness check**, and **§5 why-review** below (and `--target=issue` already owns its own `/changes-review` gate — see that branch).
>
> **Detect mode:** call `TaskList` first (per the Nested Task Expansion Contract below). **Active parent workflow row present → this whole section is SKIPPED** (the workflow owns these steps; duplicating them double-runs the spine) — **but the Root-Cause Prerequisite Gate above still applies**: skipping this section requires the parent sequence's `debug-investigate` step to be *completed for this problem*, not merely present. Row present + that step not run → the gate fires and `/debug-investigate` runs first. **No parent row → standalone:** before the first code edit, MUST ATTENTION self-assemble this minimum bugfix spine as `TaskCreate` todos, in order:
>
> 1. **`/debug-investigate`** — *root cause, FIRST; mandated by the Root-Cause Prerequisite Gate above, whose §2 evidence check decides whether it already ran for this problem.* Trace the symptom end-to-start to the invariant-owning layer with `file:line` evidence (hypothesis matrix + forward convergence proof). This **is** the standalone diagnosis — it subsumes the spine's internal step-1 `debugger` subagent; resume the spine from its planning step using this report. *Fast-mode-trivial bugs (ALL Default Mode Policy opt-out conditions met) MAY inline the trace instead of spawning the skill, but the end-to-start trace is still required.*
> 2. **Fix spine** — *this skill's* `plan → 🛑 approve → implement → `/prove-fix`` body below. The Validate-Before-Fix approval gate and `/prove-fix` are unchanged.
> 3. **`/integration-test` test-update gate** — **MUST ATTENTION — MANDATORY after the fix and `/prove-fix` for every standalone invocation.** Invoke `/integration-test` first to inspect the changed behavior and add or update the regression coverage. Use an integration test when the behavior crosses a real process/service boundary or is externally observable; if the correct seam is unit-level, invoke `/test` to add or update the unit test and record why integration coverage is not appropriate. Do not treat running an existing suite as a substitute for adding or updating the regression test. Read `docs/project-reference/integration-test-reference.md` before integration-test work.
> 4. **`/spec` spec-correctness check** — *CONDITIONAL, ensures spec docs aren't left stale.* From the proven root cause, decide which case holds:
>    - **Spec was WRONG / stale** — it described behavior that was never true, or intended behavior changed and the spec wasn't updated. The spec is (part of) the defect → run `/spec [mode=amend]` to correct the §1-§7 spec, then `/spec [mode=sync]` to reconcile §8 `TC-{FEATURE}-{NNN}` ↔ integration tests.
>    - **Spec was CORRECT, the code just failed to meet it** — pure code defect; §1-§7 behavior now matches the spec again. **No §1-§7 amendment.** But still check the §8 test cases: if the bug reproduced a scenario/edge case that **no existing `TC-{FEATURE}-{NNN}` covered** (the spec was *correct but lacked the bug case*), add a regression test case via `/spec [mode=tests]` so the spec captures it, then `/spec [mode=sync]` to reconcile §8 ↔ the new regression test. Only if an existing TC already covered the case do you record `Spec verified correct, bug case already in §8 — no spec change (code-only defect)` with `file:line` evidence and move on. Never leave a fixed bug whose case is absent from the spec's §8.
>    - **No governing spec exists** — the buggy area has no Feature Spec under `docs/specs/`. Record `No governing spec — nothing to amend` with `file:line` evidence; if the area now warrants one, run `/spec [mode=init]` (then `[mode=tests]` to seed §8 with the bug case as a regression TC) rather than only suggesting it. *Decide the case explicitly — skip only the amendment, never the decision; never leave the bug case undocumented when a spec governs the area.*
> 5. **`/why-review`** — *rationale review, the FINAL todo (after the fix, test update, spec decision, and any `/changes-review`).* Terminal sign-off on the converged change: root cause correctly owned, fix at the lowest invariant-owning layer (not the crash site), no symptom-patching, regression covered, and the §4 spec decision justified. Reporting "done" is blocked until this passes. *Non-functional-trivial fixes (typo, log/comment text; fast-mode) MAY satisfy this inline/briefly rather than spawning the full skill — symmetric with §1.*
>
> **Production-code fixes** also get a `/changes-review` todo **before** §5 (the broad code review whose validated fixes may change the diff; §5 then signs off on the result). `/changes-review` placement and the inside-workflow skip are owned by the shared Standalone Review Gate below — reference it; do not restate the mandate. **Final standalone todo order:** `debug-investigate → [fix spine + prove-fix] → /integration-test test-update (or justified /test unit-test fallback) → spec-check → changes-review (if production code) → why-review`.

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

- Verify each hypothesis against an actual code trace before acting — do NOT assume first hypothesis correct — why: the first guess is usually the nearest-attention trap, not the cause
- Every root cause claim must include `file:line` evidence
- If you cannot prove root cause with code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify fix addresses traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

**Ultrathink** plan and start fixing these issues; follow Orchestration Protocol, Core Responsibilities, Subagents Team, Development Rules:
<issues>$ARGUMENTS</issues>

## Target Routing (`--target=`)

`/fix` is an intelligent router. With no flag it runs the full diagnose→fix spine below. Pass `--target=` to scope the run to a self-contained inline branch:

| `--target` | Behavior                                                                  |
| ---------- | ------------------------------------------------------------------------- |
| `types`    | **Inline branch (below)** — TypeScript / type-error resolution.           |
| `ci`       | **Inline branch (below)** — CI / pipeline failure triage.                 |
| `issue`    | **Inline branch (below)** — tracked issue / ticket resolution.            |
| `logs`     | **Inline branch (below)** — log / stack-trace-driven debugging.           |
| `test`     | **Inline branch (below)** — failing-test repair.                          |
| `ui`       | **Inline branch (below)** — UI / visual-defect fixes.                     |

No `--target` (or an unrecognized value) → run the full Workflow spine below; infer the right specialization from `<issues>`.

> **Formerly standalone skills.** `--target=ci|issue|logs|test|ui` were previously the separate skills `/fix-ci`, `/fix-issue`, `/fix-logs`, `/fix-test`, `/fix-ui`; they are now inline branches of `/fix` (folded — the standalone names no longer exist).

### `--target=types` — TypeScript / type-error branch

Run `tsc --noEmit` (or `nx build` / `bun run typecheck` / `npx tsc`) to gather all type errors, then:

1. **Collect** — Capture every type error with `file:line`.
2. **Classify** — Group by cause: missing types, wrong signatures, import/export issues.
3. **Fix at root** — Give each value its real, specific type (or `unknown` + a narrowing guard). Do NOT use `any` to silence the checker — `any` ships the underlying type defect. Fix the root cause (wrong interface, missing export), not the symptom site. — why: `any` silences the checker and lets the type defect ship.
4. **Repeat** until `tsc --noEmit` is clean — zero type errors.
5. **🛑 Validate Before Fix:** present errors + root cause via `AskUserQuestion`, get approval before code changes (skip if inside a workflow).
6. **After fixing, run `/prove-fix`** — build code proof traces per change with confidence scores. Never skip.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ci` — CI / pipeline-failure branch

**Goal:** Analyze CI/CD pipeline logs to identify and fix build/test failures in the configured CI provider/tooling.

**Key Rules:**

- **Infrastructure context:** read `docs/project-config.json` → `infrastructure.cicd.tool` to identify the CI provider/tooling (e.g. `azure-devops`, `github-actions`, `gitlab-ci`); target that provider's pipeline config files.
- Focus on CI-specific issues (env vars, Docker, dependencies, build order).
- Verify the fix does not break local development.

**Workflow:**

1. Use the `debugger` subagent to read the CI logs via the configured CI tool/API (from `docs/project-config.json`), analyze the final failing log/error **backward** to the root cause, and report back. Write findings to `.ai/workspace/analysis/{ci-issue}.analysis.md`; re-read before implementing.
2. **🛑 Present root cause + proposed fix → `AskUserQuestion` → wait for approval.**
3. Implement the fix from the report.
4. Use the `tester` subagent to verify; report back.
5. If tests fail, repeat from step 2.
6. Report a summary of changes; suggest next steps. Then run `/prove-fix`.

**Notes:** Use the CLI/API for the configured CI provider. If it is GitHub Actions and `gh` is unavailable, instruct the user to install and authorize GitHub CLI first.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=issue` — tracked-issue / ticket branch

**Goal:** Investigate and fix bugs reported as tracked issues (e.g. GitHub issues) with full traceability.

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the issue). Map the ticket's acceptance criteria to the saved success criteria; after the fix, append proof evidence and remaining gaps to the Iteration Log. Closure is blocked while any required criterion remains FAIL.

**Key Rules:**

- Link the fix back to the issue for traceability.
- Verify the fix addresses the specific reproduction steps from the issue.

**Workflow:**

1. Activate the `debug-investigate` skill and follow its workflow — this step **satisfies** the Root-Cause Prerequisite Gate for this problem; record its report path as the gate's §2 evidence. See `.claude/docs/AI-DEBUGGING-PROTOCOL.md` for comprehensive guidelines.
2. Use external memory at `.ai/workspace/analysis/issue-[number].analysis.md` for structured analysis. **Re-read the ENTIRE analysis file before proposing any fix.**
3. **🛑 Present root cause + proposed fix → `AskUserQuestion` → wait for approval before implementing.**
4. Implement, then run `/prove-fix`.

> **Standalone Review Gate (non-workflow only):** any standalone production-code fix — the no-flag spine (Standalone Mode Minimum Contract above) **or** `/fix --target=issue` — adds a `/changes-review` `TaskCreate` todo as the **final changes-review gate**, placed immediately before the contract's §5 `/why-review` terminal sign-off (test-update → spec-check → changes-review → why-review). Inside a workflow, skip — the sequence handles `/changes-review`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=logs` — log / stack-trace branch

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Key Rules:**

- Focus on log patterns: stack traces, error codes, timing anomalies.
- Cross-reference logs with source code to find the actual root cause.

**Workflow:**

1. Check whether `./logs.txt` exists. If missing, set up permanent log piping in the project's script config (`package.json`, `Makefile`, `pyproject.toml`, …): **Bash/Unix** append `2>&1 | tee logs.txt`; **PowerShell** append `*>&1 | Tee-Object logs.txt`. Run the command to generate logs.
2. Use the `debugger` subagent to analyze `./logs.txt`: read with `Grep` `head_limit: 30` (last 30 lines; increase if needed — avoid loading the whole file). Write analysis to `.ai/workspace/analysis/{issue-name}.analysis.md`; re-read before fixing.
3. Use the `/investigate` skill to locate the exact source of the issue; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → `AskUserQuestion` → wait for approval.**
6. Implement the fix.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 3.
10. Report a summary; suggest next steps. Then run `/prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=test` — failing-test branch

**Goal:** Run test suites, analyze failures, and fix the underlying code or test issues.

**Active-goal read (BEFORE fixing):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the reported test failure). Map failing-test evidence (before) and passing-test evidence (after) to the saved success criteria in the Iteration Log — a passing suite that misses a saved required criterion does NOT close the loop.

**Key Rules:**

- Distinguish between code bugs and flawed test expectations.
- Re-run tests after the fix to confirm all pass.
- Read `docs/project-reference/integration-test-reference.md` before reviewing/writing integration tests; consult `docs/specs/` for expected-behavior context when diagnosing failures.

**Workflow:**

1. Use the `tester` subagent to compile the code and fix any syntax errors.
2. Use the `tester` subagent to run the tests; report back. Write failure analysis to `.ai/workspace/analysis/{test-issue}.analysis.md`; re-read before fixing.
3. If tests fail, use the `debugger` subagent to find the root cause; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → `AskUserQuestion` → wait for approval.**
6. Implement the plan step by step.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 2.
10. Report a summary; suggest next steps. Then run `/prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ui` — UI / visual-defect branch

**Goal:** Diagnose and fix UI/UX issues — layout, styling, responsiveness, and visual bugs.

**Key Rules:**

- Always use BEM classes on template elements.
- Check responsive breakpoints when fixing layout issues.
- **Pre-read (design system):** load `designSystem.canonicalDoc` + `tokenFiles` from `docs/project-config.json` so fixes use real token names (`--brand-*`, `$brand-*`) and canonical component classes — not invented values.

**Required skills (priority order):** `ui-ux-pro-max` (design-intelligence DB) → `web-design-guidelines` (principles) → `design --lane=marketing` (implementation patterns).

**Workflow:**

**FIRST** — run `ui-ux-pro-max` searches to understand context and common issues:

```bash
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "z-index animation" --domain ux
```

If the user provides screenshots/videos, use the `visual analysis tooling` skill to describe the issue in detail so developers can predict the root causes.

> **🛑 After identifying the UI root cause, present findings + proposed fix → `AskUserQuestion` → wait for approval before any code change.**

1. Use the `ui-ux-designer` subagent to implement the fix step by step (against the design guideline — `designSystem.canonicalDoc`).
2. Capture screenshots (at the exact parent container, not the whole page) and analyze with the appropriate Gemini skill (`visual analysis tooling`, `video-analysis`, or `document-extraction`) so the result matches the design guideline and addresses all issues. Repeat until addressed.
3. Use the browser automation tooling to verify the fix matches the design guideline.
4. Use the `tester` subagent to compile and test; report back. Repeat until all tests pass.
5. **If the user approves:** run the `project-manager` and `docs-manager` subagents in parallel to update plan progress and `./docs`; have `project-manager` also create/update a project roadmap at `./docs/project-roadmap.md`.
6. Report a summary; suggest next steps. Then run `/prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

## Workflow:

If user provides screenshots or videos, use `visual analysis tooling` skill to describe issue in detail; ensure developers can predict root causes from description.

### Fulfill the request

**Question Everything:** Use `AskUserQuestion` tool to ask probing questions to fully understand user's request, constraints, true objectives. Don't assume — clarify until 100% certain.

- Use `AskUserQuestion` to clarify any open questions.
- Ask 1 question at a time; wait for answer before next question.
- No questions → start next step.

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause + plan creation, MUST ATTENTION present findings + proposed fix plan to user via `AskUserQuestion` and get explicit approval BEFORE any code changes. No silent fixes.
> **End-to-Start Trace Gate:** For non-trivial bugs, failed verification, stale/incorrect final outputs, or behavior-changing fixes, the root-cause plan MUST ATTENTION include `Debugger Trace: End -> Start`, feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and run `/debug-investigate` or `/investigate` before planning code changes. (The Root-Cause Prerequisite Gate already forces this at invocation time; this gate re-checks the *content* of the resulting trace.)

### Fix the issue

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the reported issue via `.claude/templates/goal-contract-template.md`. The saved success criteria define what "fixed" means — a proven local fix that misses a saved required criterion is NOT complete. After proof, append root cause, proof evidence, and remaining goal gaps to the Iteration Log. Tiny fixes may skip deeper gates ONLY with user-accepted reason recorded in the goal file.

Use `sequential-thinking` skill to break complex problems into sequential thought steps.
Use `problem-solving` skills to tackle issues.
Analyze skills catalog and activate other needed skills during the process.

1. Use `debugger` subagent to find root cause and report back to main agent. **Skip this step when the Root-Cause Prerequisite Gate already ran `/debug-investigate` for this problem** — that report subsumes this step; resume at step 3 (planning) instead of re-tracing. — why: re-running diagnosis double-runs the spine.
   1.5. Write investigation results to `.ai/workspace/analysis/{issue-name}.analysis.md`. Re-read ENTIRE file before planning fix.
   1.6. Confirm the report contains final symptom -> reader -> storage/projection -> writer -> consumer/job -> producer/origin, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof.
2. Use `researcher` subagent to research root causes on internet (if needed) and report back.
3. Use `planner` subagent to create implementation plan based on reports; report back.
4. **🛑 Present root cause + fix plan → `AskUserQuestion` → wait for user approval.**
5. Use `/plan-execute` SlashCommand to implement plan step by step.
6. Final Report:

- Report back to user with summary of changes; explain briefly; guide user to get started; suggest next steps.
- Ask user whether to commit and push to git; if yes, use `git-manager` subagent.

* **IMPORTANT:** Sacrifice grammar for concision when writing reports.
* **IMPORTANT:** List unresolved questions at end of reports, if any.

**REMEMBER:**

- Generate images with `visual analysis tooling` skills on the fly for visual assets.
- Read and analyze generated assets with `visual analysis tooling` skills to verify they meet requirements.
- For image editing (removing background, adjusting, cropping), use media processing tooling as needed.

- **After fixing, MUST ATTENTION run `/prove-fix`** — build code proof traces per change with confidence scores. Never skip.

> **Spec-Loop completion gate (canonical: `SYNC:spec-loop-discipline`).** The fix is NOT done until the touched invariants close the loop: (1) every §4 [HARD] rule / §5 invariant the bug violated has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case — not just the single reproduction example (this is the property bar the §3 regression-TC must meet, not merely an example case); (2) the fixed core-logic line is **mutation-killed** — if a mutant survives on the changed line the killing test is missing, so the bug can silently return (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed BOTH the spec and the tests per the §3 spec-correctness decision AND a guarding test (Dual-Feedback) — a code-only patch with neither leaves the disease undocumented. Re-verify spec + tests + code together before declaring the fix complete.

---

## Next Steps (Standalone: after the Minimum Contract completes. Skip if inside workflow.)

> **The Root-Cause Prerequisite Gate and the Standalone Mode Minimum Contract above are NOT optional and NOT a question** — standalone `/fix` has already auto-run `debug-investigate` (gate-enforced) → fix spine → `/prove-fix` → mandatory `/integration-test` test update (or justified `/test` unit-test fallback) → conditional `/spec` check → (`/changes-review` for production code) → `/why-review` as the terminal sign-off. Do not re-ask the user whether to do those; they are the guaranteed floor.
>
> **AFTER that floor is met,** MUST ATTENTION use `AskUserQuestion` to offer what lies BEYOND the minimum (user decides):

- **"Proceed with full workflow (Recommended)"** — Hand off to the best-fit workflow (e.g. `workflow-bugfix`) from here to add the remaining gates the minimum spine omits — `plan-validate`, `integration-test-review`, `integration-test-verify`, `production-readiness-review`, `security-review`, `changelog`, `docs-update`.
- **"/test"** — Run the full test suite to verify the fix in context.
- **"Commit & push"** — Hand the proven, reviewed change to the `git-manager` subagent.
- **"Stop here"** — Minimum contract satisfied; user takes it from here.

> If already inside a workflow, skip both the contract and this menu — the workflow sequence handles diagnosis, spec sync, review, and next steps.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

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

<!-- SYNC:root-cause-debugging -->

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

<!-- /SYNC:root-cause-debugging -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for *intended* behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

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

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity, and re-deciding it per feature is the incoherence this gate prevents. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** a different question, no overlap — the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. A surface can pass all 40 clauses and still be a template. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular; they are never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons. A decision with no articulable reason is a default that arrived unnoticed. Defaults hide in what feels like infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: writing a plan and going straight to code reproduces the default, because the plan came from the same patterns the code will.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, not the default you would reach for on any project. Set a real scale with intentional weights, widths and spacing. When type is a headline it is an ACTIVE part of the design, not a neutral delivery vehicle. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. For every device ask: what does this tell the reader that whitespace would not? Nothing → cut it. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (same card size, same gap, same density everywhere is the sound of no one deciding); proportions must say something you can articulate; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, `calc()` values that exist only as workarounds, absolute positioning to escape layout flow are lies; the correct answer is always simpler than the hack). Take screenshots to review where the environment supports it — a picture is worth 1000 tokens. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable, not an omission.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction + **the eight screen states** (ideal, empty, first-run, loading, partial, error, offline, maximum-data) · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility (WCAG 2.2 AA; every item `P1` minimum, `P0` when it blocks the task) · §J content & UX writing · §K trust, ethics & privacy (dark patterns are `P0`) · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. One focused pass per section — why: a section skipped in the long middle silently becomes an unreported defect class.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — these 10 catch the majority of serious defects: (1) can a new user complete the primary task unaided · (2) does every action give visible feedback within 400ms · (3) do empty/loading/error states exist AND offer a forward path · (4) is the primary action obvious, singular, reachable · (5) text ≥4.5:1 contrast and focus visible · (6) whole flow completable by keyboard · (7) touch targets ≥44/48px · (8) destructive actions reversible · (9) holds at 320px and 200% zoom · (10) any dark patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains front-end work, the checklist binds the plan's ACCEPTANCE CRITERIA, not a built page: name the platform, the applicable conditional sections (§F/§G/§H, §L), the eight screen states each UI phase must deliver (§D2), and the §I accessibility floor — so the work is specified against the checklist before it is written. A UI phase whose acceptance criteria omit the states and the a11y floor is INCOMPLETE — say so.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has a user-facing front-end surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — fewer than four → state the gap, findings are low confidence) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N in order, one focused pass each, with §F/§G/§H and §L applied only when the platform/product matches and §I (WCAG 2.2 AA) as a `P1` floor · `CL-5` short on time → run the 10-check §P triage · `CL-6` report in the §O shape. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, the checklist binds the UI phases' acceptance criteria (platform, conditional sections, the eight screen states, the a11y floor). Skip ONLY when the change has NO user-facing front-end surface, stated explicitly.

<!-- /SYNC:design-review-checklist:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), add or update regression coverage, and prove convergence with `/prove-fix`.

**IMPORTANT MUST ATTENTION — Main steps:** route `--target=` first → pass the Root-Cause Prerequisite Gate → investigate with researcher subagents → diagnose end-to-start with `debug-investigate` → declare confidence/evidence → plan impact → pass Validate-Before-Fix approval → implement at the owning layer → run `/prove-fix` → update regression tests → decide spec correctness/sync → run `/changes-review` for production code → finish with `/why-review`; standalone calls keep the full spine, while parent workflows own their declared sequence.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** start at observed final output, trace backward through every feeder path before fixing.
- **Root Cause Debugging:** reproduce → isolate → trace → hypothesize → verify → fix the cause, never symptoms.
- **Nested Task Creation:** parent workflow rows don't replace child phase tracking; expand and link phases.
- **Project Reference Docs Guide:** read required project-reference docs (`lessons.md` always) before target work.
- **Task Tracking & External Report:** bootstrap task tracking; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking:** apply critical + sequential thinking; traced proof per claim, confidence >80% to act.
- **Understand Code First:** search 3+ patterns and read code before any modification.
- **Evidence-Based Reasoning:** cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Fix-Layer Accountability:** trace full data flow, fix at the owning layer, not the crash site.
- **Source/Test Drift Check:** when source behavior changes, decide from evidence whether affected tests change.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** Root-Cause Prerequisite Gate (BLOCKING, FIRST) — a direct `/fix` call (no-flag spine AND every `--target=` branch) MUST NOT edit code until `/debug-investigate` traced THIS problem in THIS session, proven by a `TaskList` row or a written investigation report; recall is NOT evidence, a prior investigation of a DIFFERENT symptom does NOT count, and a parent workflow row alone is NOT proof its diagnosis step ran — not satisfied → run `/debug-investigate` first, then resume from the planning step — why: without it the first edit lands with zero traced cause and patches the symptom site
**IMPORTANT MUST ATTENTION** trace the symptom end-to-start to the invariant-owning layer and fix there — NEVER at the crash site — why: the crash site is a symptom; the bad state enters at a lower layer and one fix there protects all downstream consumers
**IMPORTANT MUST ATTENTION** declare `Confidence: X%` + `file:line` proof for EVERY claim — 95%+ recommend, 80-94% caveats, 60-79% list unknowns, STOP if <60% — why: speculation patches the wrong layer and ships the disease
**IMPORTANT MUST ATTENTION** 🛑 Validate-Before-Fix — present root cause + plan via `AskUserQuestion` and get approval BEFORE any code change (skip ONLY inside a workflow) — why: silent fixes bypass the human gate on irreversible code change
**IMPORTANT MUST ATTENTION** route on `--target=` FIRST — each `{ci|issue|logs|test|types|ui}` branch is self-contained (own diagnosis + `/prove-fix`); no flag = full diagnose→fix spine — why: branches must not re-run §1/§2 of the standalone spine
**IMPORTANT MUST ATTENTION** default mode HARD (full rigor) — opt out to fast mode ONLY when the bug is genuinely trivial (ALL 5 Default Mode Policy conditions met); when in doubt default hard — why: skipping diagnosis on a non-trivial bug fixes the symptom and leaves the disease
**IMPORTANT MUST ATTENTION** standalone (no parent workflow) self-assembles the spine `debug-investigate → fix + prove-fix → /integration-test test-update (or justified /test unit-test fallback) → /spec correctness check → /changes-review (production code) → /why-review`; invoke `/integration-test` after every standalone fix to add or update regression coverage, and use `/test` only for an evidence-backed unit-test seam — inside a workflow SKIP the contract — but NEVER the Root-Cause Prerequisite Gate, which still demands proof the sequence's `debug-investigate` step ran for this problem — why: standalone has no sequence supplying diagnosis, test updates, spec sync, or review; and a container row is not proof its diagnosis step ran
**IMPORTANT MUST ATTENTION** after fixing, run `/prove-fix` — build code proof traces per change with confidence scores; never skip — why: a "should fix it" without a forward convergence proof is unverified
**IMPORTANT MUST ATTENTION** spec-loop completion — the fix is NOT done until the violated §4/§5 invariant has a universally-quantified property TC + boundary case, the changed line is mutation-killed, and the finding fed BOTH spec and tests (Dual-Feedback) — why: a code-only patch leaves the bug case undocumented and able to silently return
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos BEFORE starting (one read = one task); call `TaskList` first on context loss to resume, never duplicate — why: long debug files exhaust context and silently lose findings
**IMPORTANT MUST ATTENTION** read required project-reference docs (`lessons.md` always; `integration-test-reference.md` for test branch; `docs/specs/` for behavior) before target work — why: project conventions override generic debugging assumptions
**IMPORTANT MUST ATTENTION** on a FAILED TEST (`--target=test` or any test failure), FIRST read the `/integration-test-review` skill protocol (assertion-quality, coverage & spec↔test↔code fault gates) to set fix direction — decide whether the fault is a source-code root cause or a test-code setup/assertion issue — why: fixing without that verdict patches the wrong side and can green a broken invariant.
**IMPORTANT MUST ATTENTION** search 3+ similar patterns and read existing code before any fix; evaluate fit before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** add a final review todo to verify work quality, then extract root-cause lessons (`/learn`) if the failure mode would recur without the reminder

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Root cause is obvious, just patch it"   | Trace end-to-start to the invariant owner with `file:line` first — the obvious site is the symptom. |
| "I already investigated this"            | Show the `TaskList` row or investigation report for THIS symptom. Recall is not evidence — after compaction the belief survives, the findings do not. |
| "A workflow is running, it handled diagnosis" | A parent row is a container, not proof. Cite the *completed* `debug-investigate` step for this problem or the gate fires. |
| "`--target=` scopes it, so no trace needed"   | Every branch passes through the Root-Cause Prerequisite Gate. A `debugger`/`tester` subagent step is not an end-to-start trace. |
| "Fix it where it crashes"                | Crash site ≠ cause site. Fix at the LOWEST layer that owns the invariant and protects all consumers. |
| "Add a `?.` / guard and move on"         | Scattered defensive checks = wrong layer. One authoritative fix beats many guards.               |
| "Confident enough, skip evidence"        | No `file:line` + Confidence % = no claim. STOP and gather evidence if <60%.                       |
| "Small fix, skip the approval gate"      | 🛑 Validate-Before-Fix is non-negotiable standalone — present root cause + plan, get approval.    |
| "Tests pass, the fix is done"            | Not done until property TC + boundary case exist, the changed line is mutation-killed, and spec ↔ tests fed (Dual-Feedback). |
| "Already searched the codebase"          | Show `file:line` evidence. No proof = no search.                                                 |

**IMPORTANT MUST ATTENTION** NEVER edit code until `/debug-investigate` traced THIS problem in THIS session — evidence (task row / report), not recall.
**IMPORTANT MUST ATTENTION** NEVER fix at the crash site — trace end-to-start to the invariant owner and fix there.
**IMPORTANT MUST ATTENTION** declare `Confidence: X%` + `file:line` for every claim; STOP if <60%.
**IMPORTANT MUST ATTENTION** 🛑 Validate-Before-Fix approval before any code change, then `/prove-fix` after — never skip either.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via TaskCreate.
