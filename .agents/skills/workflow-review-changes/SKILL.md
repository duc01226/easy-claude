---
name: workflow-review-changes
description: '[Workflow] Use when reviewing uncommitted, staged, or unstaged changes before committing — review, fix, and re-review until the severity bar clears. Flag: --fix-loop re-runs the whole workflow until a round applies zero fixes.'
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

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers user-flow intent, stable locators/page objects, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` when step 1's diff surface contains executable E2E/browser/user-flow artifacts; the route is conditional and does not add a workflow step.

## Quick Summary

**Goal:** Ensure changed work reaches a defensible review pass through an initial whole-target adversarial pass run in parallel with dimensional review, validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, fix only validated blocking findings, then repeat the plan→plan-execute→changes-review loop until the current severity bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred).

**Summary:**

- **Conditional E2E handoff:** step 1 runs `$changes-review` inline; its Phase 0.7/3.9 route invokes report-only `$e2e-test-verify` only for an evidenced executable E2E/browser/user-flow surface, while step 15 `$experience-review` remains the separate configured/likely runtime and visual gate.
- **Step 0 (FIRST ACTION, pre-sequence):** bind the self-recursive review loop — an always-on protocol loop you self-drive (the BINDING mechanism, hook/command-independent) PLUS, when available, a `/goal` Stop-hook gate as an optional accelerator — so the review→self-fix→whole-diff-re-review loop is unabandonable until it clears the current round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred) — why: a soft "loop until clean" directive gets rationalized away after one fix cycle, and the protocol loop holds even where `/goal` is absent. Session-level wrapper, NOT one of the 19 canonical steps. ALWAYS runs — including as a step inside a parent workflow — because this workflow always runs INLINE in the main session (never a sub-agent), so it owns the loop directly in every case.
- **Initial parallel phase (steps 1–2, all-return barrier):** launch step 2 `$why-review --target=whole-review-target` as a fresh read-only `code-reviewer` sub-agent, then immediately run step 1 `$changes-review` INLINE while it is active. Step 1 owns the dimensional baseline (surface analysis, integration-test/translation/spec-drift gaps, internal UI review); step 2 independently reviews the WHOLE review target + current changes in FULL mode. Neither consumes the other's output. Advance only after BOTH return, then consolidate both reports.
- Step-1 `$changes-review` findings flow straight into consolidation: the initial step-2 whole-target pass validates its own findings through `$why-review`'s full-mode closing gate, and each specialist receives any step-1 finding as an UNVALIDATED hint it verifies independently. There is no separate findings-validation step.
- Steps 3–9 (`$architecture-review`, `$domain-entities-review` [if entity files], `$performance-review`, `$integration-test-review`, `$security-review`, `$production-readiness-review`, `$ui-review` [if frontend files]) are read-only sub-agents: spawn ALL in ONE message and advance ONLY after every member (steps 3–9) returns (all-return barrier); the mutating `$code-simplifier` (step 10) waits until the barrier clears and self-reviews its own changes via `$code-review`. (`$ui-review` runs here as a DEDICATED conditional batch member AND still runs internally inside step 1's `$changes-review` — both by design; see the UI-review note below.)
- Before the initial `$changes-review` baseline and specialist batch, apply `SYNC:review-principle-awareness`: classify the change context and route only applicable scale-ready foundation, Given → When → Then test, AI-agent-as-user, and UI/component principles to their detailed protocols; preserve evidence, ownership, and severity gates.
- Fix cycle (steps 11–13 `$plan`→`$plan-review`→`$plan-execute`) runs ONLY when validated findings exist; the conditional step-14 re-review `$why-review` runs ONLY if `$plan-execute` changed files, re-reading the full diff from scratch INLINE to counter orchestrator confirmation bias, and loops until the round's exit bar is clear — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM in round 2 (a LOW-only round ENDS the loop, deferred not fixed)** — bounded at **2 rounds MAX**, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open (escalate by asking the user directly at whichever trips first: 2 no-progress repeats of the same blocker, review blockers increasing round-over-round (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget spent with a review blocker still open — round 2 blocked by MEDIUM/`NOT VERIFIABLE` alone, or round 3 by any review blocker — cap exhaustion escalates, never PASSes; a failing test gate is outside the budget and loops until green).
- **Step 14 `$why-review` (CONDITIONAL — runs only when the fix cycle changed files; FULL mode, standalone)** — near-final HOLISTIC review of the settled WHOLE target + current changes as ONE artifact. It complements the step-2 startup whole-target pass: step 2 reviews the pre-fix state; step 14 proves the final post-fix state, and is skipped when no validated blocking finding required fixes. On blocking findings → re-enter `$plan`→`$plan-execute`, then re-run step 14 until the current round bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred; bounded by `$why-review`'s own review loop: at most 1 re-do / 2 full review cycles total / 2-repeat-blocker → escalate).
- **Step 15 `$experience-review` (CONDITIONAL, INLINE)** — when the changed target includes a configured or likely observable surface, exercise the running/observable feature, inspect evidence, classify the result, and leave a candidate or accepted expectation record. It is skipped only with an evidence-backed `NOT-APPLICABLE` reason; a relevant surface that cannot run or be inspected is `ENVIRONMENT-BLOCKED`, and no expectation is rewritten automatically. **This step MAY LAND FIXES** — it runs a bounded remediation loop (`--rounds=N`, default 3) in which each round adjudicates the BLOCKING defects, fixes at the owning layer, `$changes-review`s that round's own fix diff, and re-exercises from scratch. Its internal per-round `$changes-review` is what keeps this workflow's convergence guarantee intact after step 14; any fix it lands is therefore already code-reviewed. Only objectively-checkable defects open a round — ADVISORY/taste findings are recorded, never looped on — and it converges to `AGENT-RECOMMENDED-ACCEPT`/`ACCEPTANCE-PENDING`, never to a signed acceptance. Cap reached, defect count not shrinking, count rising, or `ENVIRONMENT-BLOCKED` → `NOT-CONVERGED` + escalate, never a partial pass. Pass `--rounds=0` to keep the step report-only.
- `$docs-update` (step 17) ALWAYS runs and triages internally; SPEC-STALE drift verdicts from step 1 flow here to update the Feature Spec first — the workflow is NOT clean while any behavior-vs-spec divergence stays unadjudicated (green tests do not normalize drift).
- **Steps 18–19 `$workflow-end` + `$watzup` — TOP-LEVEL INVOCATION ONLY (nested tail guard).** They run ONLY when this workflow is the top-level invocation. When it runs as a step inside a parent workflow (`workflow-feature`, `workflow-bugfix`, `workflow-refactor`, `workflow-big-feature`, `workflow-greenfield-init`, `workflow-spec-sync`, `workflow-code-to-spec [update]`), SKIP BOTH and return control to the parent at the end of step 17 — why: `$workflow-end` announces `Workflow [name] completed` and closes workflow state, and `$watzup` runs the terminal `$understand` + Next-Steps handoff, so running them mid-parent declares a still-running workflow finished and bills an expensive terminal wrap-up while parent steps are still pending. Steps 1–17 are unaffected and run identically in both cases. Step 17 `$docs-update` still ALWAYS runs when nested — it is NOT redundant with the parent's own later `$docs-update`, which covers the file-mutating steps (E2E authoring, `spec [mode=sync]`, `test`/`fix`, `scan`) that run AFTER this workflow returns.
- **`--fix-loop` (OPTIONAL mode flag — absent by default, and absence changes nothing in this skill):** wraps this WHOLE 19-step workflow in an OUTER convergence loop — re-run the default workflow INLINE, round after round, over a fixed scope (branch-diff base ∪ current uncommitted changes) until a complete round applies **ZERO fixes**, so every specialist (steps 3–9) re-reviews the fixed code from scratch and second-order defects introduced by the fixes are caught. Adds a Goal Contract, a working-tree fingerprint per round, an ordered convergence/escalation gate, and the same bounded round budget. **When `--fix-loop` is passed, read `## Mode: --fix-loop` below FIRST** — it runs before, and wraps, this workflow's Step 0.

**Sequence:** *(Step 0 pre-sequence: bind self-recursive review loop — protocol loop always, `/goal` accelerator when available)* → **[initial parallel phase]** $changes-review (INLINE; owns dimensional/UI baseline) + `$why-review --target=whole-review-target` (fresh read-only sub-agent; FULL mode over the whole target) → **[specialist parallel batch]** $architecture-review + $domain-entities-review (if entity changes) + $performance-review + $integration-test-review + $security-review + $production-readiness-review + $ui-review (if frontend changes) → $code-simplifier → $plan → $plan-review → $plan-execute → **`$why-review` (CONDITIONAL — only when the fix cycle changed files; final HOLISTIC full-mode review of the settled WHOLE target)** → **`$experience-review` (conditional inline exercise/inspection and acceptance handoff)** → $scan --target=domain-entities → $docs-update → **[TOP-LEVEL INVOCATION ONLY — skipped when nested]** $workflow-end → $watzup

**Key Rules:**

- MUST ATTENTION preserve the conditional E2E route inside step 1: read `.claude/skills/shared/e2e-quality-protocol.md` and invoke report-only `$e2e-test-verify` only when the diff contains executable E2E/browser/user-flow evidence; record `NOT-APPLICABLE` otherwise and keep step 15 `$experience-review` independent.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry every unresolved finding or unaccepted risk into validation/fix planning; do not close until fixed or explicitly accepted.
- MUST ATTENTION include unresolved risk register, generated mirror drift, and spec/test/docs drift in the fresh review prompt when relevant.
- MUST ATTENTION launch the whole-target full-mode `$why-review` sub-agent before starting step 1 inline, then advance only after BOTH initial-phase members return; then spawn the specialist reviewers in ONE message and advance only after every member returns.
- MUST ATTENTION run `SYNC:review-principle-awareness` at the start of `$changes-review` and before the specialist batch; each reviewer consumes a detailed protocol only when its change context warrants it and records `NOT-APPLICABLE`, `DEFER-AS-OPPORTUNITY`, `UNVERIFIED`, or `BLOCKED` with evidence instead of inventing unrelated findings or expanding scope.

- After `$plan-execute` applies validated fixes (and ONLY if `$plan-execute` changed files) → run the conditional step-14 `$why-review` INLINE over the settled whole target from the first phase; re-read the whole target from scratch to counter orchestrator confirmation bias
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = one complete review pass finds zero blocking issues after all validated fixes and verification are included
- Repeated blockers are tracked in conversation context; stop after 2 no-progress full invocations of the same blocker

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

## Step 0 — Bind the Self-Recursive Review Loop (FIRST ACTION — pre-sequence; protocol-first, `/goal` optional)

> **MUST ATTENTION:** Before creating the 19 step tasks below, the VERY FIRST action is to BIND the self-recursive review loop so the session cannot end until the whole workflow loop converges to a clean zero-finding pass. Binding has TWO layers: (1) an **always-on protocol loop** you self-drive — the BINDING mechanism, hook/command-independent, in force on every host; and (2) an **optional `/goal` accelerator** — a mechanical Stop-hook block installed only WHEN the command is available. This is a session-level enforcement WRAPPER — NOT one of the 19 canonical `workflows.json` sequence steps, so it does NOT change the step count or the sequence; it makes the existing loop unabandonable.

**Entry gate:**

- **ALWAYS run** — whether this workflow is the top-level invocation (user ran `$start-workflow workflow-review-changes` or `$changes-review` routed here directly) OR a step inside a parent workflow (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`). Because this workflow always runs INLINE in the main session (never as a sub-agent — see the WORKFLOW-IN-WORKFLOW note), it owns the session Stop hook directly in every case, so the loop binds and enforces identically. There is no "deferred to parent" case.

**Procedure:**

**1. Protocol loop — ALWAYS binding (hook/command-independent).** This is the mechanism that actually holds the loop shut; it binds Claude, Codex, and Copilot equally, whether or not `/goal` exists. You yourself MUST NOT stop until the condition below holds:

> Run the initial parallel phase (`$changes-review` INLINE + `$why-review --target=whole-review-target` in a fresh sub-agent) to its all-return barrier → run the specialist parallel reviewers → `$code-simplifier` → if validated findings exist, `$plan` → `$plan-execute` SELF-FIXES them → run the conditional step-14 `$why-review` over the settled WHOLE target → loop until one complete pass clears the round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW-only ENDS the loop with the LOWs deferred) → run conditional `$experience-review` to exercise/inspect any configured or likely observable surface and preserve explicit acceptance state → only then `$docs-update` → `$workflow-end`. Stop only when all required review passes are clean (or the same blocker repeats for 2 full invocations with no progress → escalate by asking the user directly).

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If `/goal` is registered and permitted on this host, invoke it (the actual built-in command) with the same condition to add a mechanical Stop-hook block on top of the protocol loop:

```
/goal workflow-review-changes self-recursive loop: run the initial parallel phase ($changes-review INLINE + $why-review --target=whole-review-target in a fresh sub-agent) to its all-return barrier → run the specialist parallel reviewers → $code-simplifier → if validated findings exist, $plan → $plan-execute SELF-FIXES them → run the conditional step-14 $why-review over the settled WHOLE target → loop until one complete pass clears the round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, a LOW-only round ENDS the loop with the LOWs recorded as deferred) → only then $docs-update → $workflow-end. Stop only when all required review passes are clean (or the same blocker repeats for 2 full invocations with no progress → escalate by asking the user directly).
```

The `/goal` Stop hook then blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** — record ONE line and proceed under the protocol loop (step 1), which is already binding; NEVER error, block, or fake a gate on its absence:

```
/goal accelerator unavailable — review loop bound by protocol (Step 0 step 1)
```

3. Then proceed to create the 19 step tasks below and run the sequence.

> **Why bind the loop on top of the loop prose:** the conditional step-14 re-review and the round-bar rules are soft directives an orchestrator can rationalize away after one fix cycle. The protocol loop converts them into a self-enforced invariant on every host; the optional `/goal` Stop hook adds a mechanical block, but correctness never depends on it.

## Mandatory Task Creation (ZERO TOLERANCE)

> **Step 0 first:** bind the Step 0 self-recursive review loop (above — protocol loop always, `/goal` accelerator when available) BEFORE creating these tasks — always, including when this workflow is a step inside a parent workflow, since it always runs inline in the main session and owns the loop directly.

Create one task per row in the table below — source of truth is `workflows.json` → `workflow-review-changes.sequence` (currently 19 steps; verify count matches if you suspect drift). The Step 0 loop binding is a pre-sequence wrapper and is NOT counted among these 19:

| #   | Task Subject                                                                                                                                                                   | Conditional?                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | `[Workflow] $changes-review — Inline dimensional baseline, UI dimension, integration/translation/spec-drift checks` ⚡ **INITIAL PARALLEL PHASE** | No — run INLINE while step 2's sub-agent is active |
| 2   | `[Workflow] $why-review --target=whole-review-target — FULL-mode adversarial review of the WHOLE target + current changes` ⚡ **INITIAL PARALLEL PHASE** | No — launch first as a fresh read-only `code-reviewer` sub-agent; independent of step 1; barrier waits for both |
| 3   | `[Workflow] $architecture-review — Architecture compliance review` ⚡ **SPECIALIST PARALLEL BATCH** | No — run as sub-agent in parallel with steps 4/5/6/7/8/9 |
| 4   | `[Workflow] $domain-entities-review — DDD quality review of changed domain entity files` ⚡ **SPECIALIST PARALLEL BATCH** | Yes — skip if no domain entity files in git diff |
| 5   | `[Workflow] $performance-review — Performance analysis` ⚡ **SPECIALIST PARALLEL BATCH** | No — run as sub-agent in parallel with steps 3/4/6/7/8/9 |
| 6   | `[Workflow] $integration-test-review — Test quality + change-coverage review` ⚡ **SPECIALIST PARALLEL BATCH** | No — run as sub-agent in parallel with steps 3/4/5/7/8/9 |
| 7   | `[Workflow] $security-review — Security vulnerability review` ⚡ **SPECIALIST PARALLEL BATCH** | No — run as sub-agent in parallel with steps 3/4/5/6/8/9 |
| 8   | `[Workflow] $production-readiness-review — Read-only SRE readiness review` ⚡ **SPECIALIST PARALLEL BATCH** | No — run as sub-agent in parallel with steps 3/4/5/6/7/9 |
| 9   | `[Workflow] $ui-review — UI/frontend quality review` ⚡ **SPECIALIST PARALLEL BATCH** | Yes — skip if no frontend files; dedicated batch member and still runs internally inside step 1 |
| 10  | `[Workflow] $code-simplifier — Simplify and refine code, then self-review its changes` | No — runs after the specialist barrier |
| 11  | `[Workflow] $plan — Consolidate validated review findings into fix plan` | Conditional — only when validated findings exist |
| 12  | `[Workflow] $plan-review — Review the fix plan and its rationale` | Conditional — only when a fix plan exists |
| 13  | `[Workflow] $plan-execute — Implement validated fixes from plan` | Conditional — only when validated findings exist |
| 14  | `[Workflow] $why-review — Final HOLISTIC full-mode re-review of the settled WHOLE target; only when the fix cycle changed files (`$plan-execute` modified files)` | Conditional — skip when no validated blocking finding required fixes; on findings re-enter steps 11–13, then re-run step 14 |
| 15  | `[Workflow] $experience-review — Exercise and inspect affected observable experience; converge BLOCKING defects in a bounded loop; record acceptance state` | Conditional — run for a configured or likely observable surface; skip only with evidence-backed `NOT-APPLICABLE`, and record `ENVIRONMENT-BLOCKED` when a relevant surface cannot run or be inspected. MAY land fixes (`--rounds=N`, default 3); each round self-reviews its own fix diff, so convergence survives step 14 |
| 16  | `[Workflow] $scan --target=domain-entities — Refresh the domain-entity reference catalog` | Conditional — run only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence; otherwise complete with a cited skip reason |
| 17  | `[Workflow] $docs-update — Update impacted documentation` | Always run — triages internally |
| 18  | `[Workflow] $workflow-end — End workflow state` | **Yes — registry `applicability`.** Runs only on top-level invocation; skipped when nested, recording the registry `skipReason` verbatim. See *Nested Tail Guard (Steps 18–19)* |
| 19  | `[Workflow] $watzup — Post-workflow summary and final $understand handoff` | **Yes — registry `applicability`.** Runs only on top-level invocation; skipped when nested, recording the registry `skipReason` verbatim. See *Nested Tail Guard (Steps 18–19)* |

> **UI review runs in TWO places by design (keep both).** `$ui-review` runs BOTH (a) INTERNALLY inside step 1 (`$changes-review` invokes it as its UI dimension) AND (b) as a DEDICATED conditional specialist-batch member (step 9, `ui-ux-designer` sub-agent). Both are gated on the same trigger — frontend/UI files in the diff — so both are skipped when no frontend files changed. Create the step-9 `[Workflow] $ui-review` task (conditional) AND keep step 1's internal UI dimension; do NOT collapse them into one.

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` only with each occurrence's evidence-backed applicability/skip result; never use a generic "Skipped — all reviews passed" note. For `$experience-review`, that result is `NOT-APPLICABLE` only when the inspected project evidence shows no applicable surface; a relevant but unusable surface is `ENVIRONMENT-BLOCKED`.

> **Integration Test Sync:** The `$changes-review` skill (task #1) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses ask the user directly to surface them — NOT purely advisory. The user must explicitly choose to run `$integration-test` or confirm tests are already written. No silent skip.

> **Translation Sync:** The `$changes-review` skill (task #1) includes a **mandatory** multilingual UI translation-sync check. When UI text changes in multilingual projects without locale updates, the skill uses ask the user directly for an explicit user decision — NOT purely advisory.

> **Docs Update:** `$docs-update` (step 17) MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke `$spec` for the configured canonical owner, `$spec-index [mode=index]` for an affected derived index under the configured business root, and `$tech-spec` when its derived technical view is affected. It then synchronizes the profile-declared scenarios/cases with their executing tests and evidence; `$spec [mode=tests]` and `$spec [mode=sync]` for §8 TCs apply only when the strict default profile declares those carriers. Never skip based on review PASS status alone.

> **Spec Drift Adjudication:** The `$changes-review` skill (task #1) runs a **mandatory** spec-drift adjudication (`SYNC:spec-drift-adjudication`, per `shared/sdd-artifact-contract.md` → Drift Gates) for every behavior-changing file: compare the change with its configured canonical owner and classify each divergence as **CODE-WRONG** (BLOCKING — fix code/test against intended behavior), **SPEC-STALE** (the change is intended and the owner is outdated), **SPEC-SILENT** (code enforces an unstated invariant), or **AMBIGUOUS** (escalate). The reviewer never silently picks a side. A **SPEC-STALE** verdict flows downstream: update the configured canonical owner first, then reconcile its profile-declared scenario/case and mapped tests; use `$spec [update]` and `$spec [mode=tests]` only under the strict default profile. The workflow is NOT clean while any behavior-vs-spec divergence remains unadjudicated — green tests do not normalize drift (green can encode the drift itself).

> **Spec enrichment per cycle (MANDATORY — closes the feedback loop):** Every confirmed finding fixed in the loop (steps 11–14) that changes observable behavior MUST reconcile the configured canonical owner, its profile-declared requirement/invariant and scenario/case, and the executing test assertions/results at the declared cardinality before the workflow is clean. A code-only fix without mapped canonical and test evidence is INCOMPLETE. This applies to EVERY confirmed behavior-changing fix, not only SPEC-STALE drift or bugfix-workflow paths: a CODE-WRONG fix owes a regression/preservation test for the intended behavior, and an intended behavior change owes updated canonical and test evidence. The strict default profile represents these changes with §3/§4 requirements and §8 TCs via `$spec [update]` + `$spec [mode=tests]`; native profiles use their configured owner, IDs, carrier, and mapping. The conditional step-14 re-review and `$workflow-end` reconciliation gate require the full mapping.

---

## Conditional E2E Quality Handoff (inside step 1; no sequence change)

Step 1 runs `$changes-review` inline and therefore inherits its conditional Phase 0.7 E2E trigger and Phase 3.9 report-only gate. Read `.claude/skills/shared/e2e-quality-protocol.md` when the diff contains changed executable E2E test/spec files, browser configuration, fixtures, page/component objects, browser helpers, recordings, or source that changes an exercised user journey. A skill or documentation file that merely mentions E2E is not a trigger.

- On positive trigger evidence, `$changes-review` invokes `$e2e-test-verify` in report-only mode over the fixed E2E scope and carries its GWT/invariant/scenario-case, gate-row, exact-result, artifact, cleanup, owner, and next-step records into the parent finding set.
- With no trigger, step 1 records `E2E quality gate: NOT-APPLICABLE — no executable E2E/browser/user-flow surface in the diff` and does not invoke the verifier. This keeps E2E review optional for ordinary changes.
- A positive trigger with missing runner, auth/data setup, browser/service, or evidence capability stays `ENVIRONMENT-BLOCKED` and remains visible to the parent validation/fix gates.
- This handoff adds no `workflows.json` step and never replaces step 15 `$experience-review`, which independently owns configured/likely runtime and visual exercise, acceptance state, and its existing bounded remediation semantics.

## Initial Parallel Phase (Steps 1–2) — EXECUTION PROTOCOL

Steps 1 and 2 are independent, read-only review lanes over the same starting state:

1. Launch `$why-review --target=whole-review-target` as a **fresh `code-reviewer` sub-agent** in FULL mode. Its target is the whole review target combined with the current changes — the complete changeset plus surrounding code/spec/docs — and it writes its report incrementally under `tmp/reports/`.
2. Immediately run `$changes-review` **INLINE in the main session** while that sub-agent is active. It owns surface detection, dimensional review, the internal UI dimension, and integration/translation/spec-drift gates.
3. Treat the pair as one declared all-return barrier. Neither lane consumes or waits on the other's partial output. Advance only after BOTH return; then mark both tasks complete and consolidate both reports.
4. Proceed to the specialist phase below; there is no separate findings-validation gate, so the consolidated step-1 and step-2 reports feed the specialist batch and the fix plan directly. Any step-1 finding is an UNVALIDATED hint the reader must verify independently.

This phase intentionally mixes one inline member with one sub-agent member: dispatch the sub-agent first, start the inline member immediately, and do not advance past the phase until both complete. The unique sequence token `why-review --target=whole-review-target` prevents the initial occurrence from being confused with the final plain `why-review` occurrence by workflow barrier renderers.

## Specialist Parallel Review Phase (Steps 3–9) — EXECUTION PROTOCOL

> **Note:** Steps 3–9 are the specialist reviewers — architecture compliance, DDD entities,
> performance, integration test quality, security vulnerabilities, production readiness, and
> UI/frontend quality (`$ui-review`, conditional on frontend files). They run as workflow-level
> parallel sub-agents, separate from the DIMENSIONAL review (BE/FE/SCSS/Synthesis + UI dimension)
> that runs INSIDE Step 1 (`$changes-review`).
> **`$ui-review` runs in TWO places by design (keep both):** (a) INTERNALLY inside Step 1 as
> `$changes-review`'s UI dimension, AND (b) here as the DEDICATED step-9 batch member
> (`ui-ux-designer` sub-agent). Both fire only when the diff has files matching the project's
> configured frontend/UI file patterns; both are skipped otherwise.

Steps 3–9 (`$architecture-review`, `$domain-entities-review`, `$performance-review`, `$integration-test-review`, `$security-review`, `$production-readiness-review`, `$ui-review`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 50K+ tokens in the main session absorbing all seven inline. The `stepMeta` in `workflows.json` marks all seven as `executionMode: subagent, contextBudget: high` — dispatch each as a sub-agent per the model-driven advancement rule (no hook emits a `💡 [SUB-AGENT RECOMMENDED]` hint).

> **UI review runs in TWO places by design (keep both).** `$changes-review` (step 1) invokes `$ui-review` internally as its dimensional-batch UI dimension when frontend files changed, AND step 9 spawns `$ui-review` again as a DEDICATED conditional member of THIS specialist phase. Both fire only when frontend/UI files are in the diff; both are skipped otherwise.

### Execution: spawn in one message

After the initial steps 1–2 barrier clears, spawn all active specialist reviewers in **a single response** with multiple `spawn_agent` tool calls and advance only after every member returns:

```
spawn_agent(architecture-review, agent_type="architect", ...)           ← all in ONE message
spawn_agent(domain-entities-review, agent_type="code-reviewer", ...)    ← only if entity files in diff
spawn_agent(performance-review, agent_type="performance-optimizer", ...)
spawn_agent(integration-test-review, agent_type="integration-tester", ...)
spawn_agent(security-review, agent_type="security-auditor", ...)
spawn_agent(production-readiness-review, agent_type="code-reviewer", ...)  ← read-only SRE findings/score mode
spawn_agent(ui-review, agent_type="ui-ux-designer", ...)                ← only if frontend/UI files in diff
```

Each sub-agent receives:

- The baseline summary from step 1 (what changed, integration test gaps found) — any step-1 finding in it is labelled an UNVALIDATED hint the reviewer must verify independently
- Instruction to write report to `tmp/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch (model-driven — PRIMARY)

Advancement here is **model-driven** — your responsibility against the task list, NOT a hook/tool signal. This is the same rule the universal context files carry ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md), so the batch advances identically under Claude and Codex. The shared kernel is the canonical **`SYNC:parallel-phase-advancement`** block consolidated at the end of this skill — its barrier rule governs this batch: declare the group up-front; spawn ALL members in ONE message; advance ONLY after EVERY member returns (a skipped conditional member counts as "returned"); a sub-agent return advances a step IDENTICALLY to an inline call; defer the mutating `$code-simplifier` step until the barrier clears; hooks are accelerators only.

**Applied to this workflow's specialist batch** — after ALL parallel reviewers (steps 3–9) have returned:

1. `TaskUpdate` step 3 (`$architecture-review`) → `completed`
2. `TaskUpdate` step 4 (`$domain-entities-review`) → `completed` (or "Skipped — no entity files" if the conditional `domain-entities-review` member did not run — a skipped conditional counts as "returned")
3. `TaskUpdate` step 5 (`$performance-review`) → `completed`
4. `TaskUpdate` step 6 (`$integration-test-review`) → `completed`
5. `TaskUpdate` step 7 (`$security-review`) → `completed`
6. `TaskUpdate` step 8 (`$production-readiness-review`) → `completed`
7. `TaskUpdate` step 9 (`$ui-review`) → `completed` (or "Skipped — no frontend/UI files" if the conditional `ui-review` member did not run — a skipped conditional counts as "returned")
8. Read all sub-agent report files; synthesize findings into a combined review summary
9. Proceed to step 10 (`$code-simplifier`) sequentially — only after the barrier above (it is a code-mutating step and must see the complete review snapshot)

> **Advancement here is model-driven.** This sub-agent batch advances only after every member returns (the all-return barrier) — no step-tracking hook advances it. Claude and Codex both rely entirely on this rule.

### Consolidation before $code-simplifier

Before running `$code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High/Medium/Low findings across all 7 reports (plus the UI-dimension findings folded into step 1's report when frontend files changed)
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `$code-simplifier` as context so simplification is informed by review findings

**Surface Analysis from Step 1:**

Step 1 (`$changes-review`) now emits a surface analysis summary in its report:

```
## Change Surface Analysis
BE files: {N}
FE-Logic files: {M}
SCSS files: {P}
Review Mode: [DIMENSIONAL | BE-ONLY | FE-ONLY | FE-SPLIT | TOOLING]
```

Include this surface analysis in the consolidation summary passed to `$code-simplifier`.
This lets the simplifier focus attention on the dominant surface without re-analyzing the diff.

Dimensional agent reports (if mode = DIMENSIONAL):

- `tmp/reports/review-be-{date}.md` — BE findings
- `tmp/reports/review-fe-logic-{date}.md` — FE-Logic findings
- `tmp/reports/review-scss-{date}.md` — SCSS findings (if spawned)
- `tmp/reports/synthesis-review-{date}.md` — Cross-boundary findings

All four (plus the UI-dimension `$ui-review` findings when frontend files changed) feed into the consolidation summary alongside the step-2 whole-target report and steps 3–9 specialist findings (including the dedicated step-9 `$ui-review` pass).

### What runs sequentially (never parallelize)

| Step                            | Why sequential                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `code-simplifier` (#10)         | Modifies code — specialist batch reviews pre-simplification state; self-reviews its own output via `$code-review` before returning |
| `plan` → `plan-review` → `plan-execute` (#11–13) | Ordered validated fix-plan cycle — `$plan` consumes already-validated findings and `$plan-review` reviews the fix plan before implementation |
| `why-review` (#14)              | Final HOLISTIC standalone review — runs in FULL mode over the settled WHOLE target, only when the fix cycle changed files |

---

## Conditional Post-Fix Holistic Re-Review Protocol (CRITICAL)

### Decision Logic

```
Reviews (steps 1-10) → ALL PASS (no validated blocking findings)?
  YES → skip steps 11-14 ($plan → $plan-review → $plan-execute and the conditional re-review), proceed to conditional $experience-review (step 15) → $scan --target=domain-entities (step 16, conditional — run on entity/DTO/schema changes, else complete with a cited skip reason) → $docs-update (step 17) → [TOP-LEVEL ONLY: $workflow-end → $watzup] → DONE (nested inside a parent workflow: return control to the parent after step 17)
  NO (validated blocking findings exist) → $plan → $plan-review → $plan-execute → (if $plan-execute changed files) $why-review HOLISTIC full-mode re-review (step 14) → loop until clean at the round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM)
Step 14 (CONDITIONAL — only when the fix cycle changed files): $why-review FULL mode over the settled WHOLE target + changes. If it finds new BLOCKING findings → re-enter $plan → $plan-execute, then re-run step 14; loop until the current round bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred) → conditional $experience-review (step 15) → $scan --target=domain-entities (step 16, conditional) → $docs-update (step 17).
Note: $code-simplifier (step 10) self-reviews the code it changes via $code-review before returning.
Note: $why-review has two workflow occurrences: step 2 FULL mode on the whole starting target in parallel with step 1, and step 14 FULL mode on the settled post-fix target (only when the fix cycle changed files). Both use the same lens but observe different states; there is no separate findings-validation occurrence.
```

### Conditional Holistic Re-Review Gate (Step 14) — After `$plan-execute` Applies Fixes

1. **CONDITION (run only if $plan-execute changed files):** Step 14 runs ONLY when `$plan-execute` actually modified files. If `$plan-execute` made no file changes, SKIP step 14 (there is no post-fix state to re-review), proceed to the conditional step-15 `$experience-review`, then step-16 `$scan --target=domain-entities` (conditional) and step-17 `$docs-update`.
2. **MODE:** Invoke `$why-review` in **FULL mode** **INLINE in the main session** — pass the review target + the current changes as the target (e.g. `$why-review the whole <feature/diff/target> combined with the current changes`). MUST NOT use `--validate-findings` (that mode only re-checks an existing findings list — it would NOT perform the holistic re-review this step requires). Re-read the whole target from scratch to counter orchestrator confirmation bias.
3. **SCOPE:** "the whole review target combined with current changes" = the complete changeset AND the surrounding code/spec/docs it touches, reviewed as ONE artifact — not a per-file or per-finding pass. `$why-review` runs its full Validation Checklist + both Adversarial Rounds + Easy-to-Change gate, then validates its own findings via its internal closing gate.
4. **DO** track re-review invocation count and repeated blockers in conversation context, and integrate the `$why-review` findings — MUST NOT filter, reinterpret, or override.
5. **IF** the re-review clears the round's bar — zero findings (round 1), or zero CRITICAL/HIGH/MEDIUM with only LOW findings left (round 2, recorded as deferred) → confirm every behavior-changing fix has its configured canonical requirement/scenario and mapped test assertion/result (strict default: §8 regression/preservation TC), then run conditional step 15 `$experience-review`, then continue to step-16 `$scan --target=domain-entities` (conditional) and `$docs-update`, and — ONLY when this workflow is the top-level invocation — `$workflow-end` → `$watzup` (nested: return to the parent after step 17; see *Nested Tail Guard (Steps 18–19)*).
6. **IF** the re-review returns a BLOCKING finding (any severity in round 1; CRITICAL/HIGH/MEDIUM from round 2) and the same blocker has not repeated across 2 full invocations → run `$plan` + `$plan-execute` again, then re-run step 14.
7. **IF** the same validated blocker repeats across 2 full invocations with no observable progress → STOP and escalate by asking the user directly — do NOT silently loop or fall back to any prior protocol.

> **Loop-binding tie-in:** the Step 0 protocol loop (and the `/goal` gate when available) stays OPEN until this loop clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred) or a 2-repeat blocker escalates. The session cannot stop with a validated blocking finding still unfixed by `$plan-execute` or a non-clean re-review outstanding; round-2 LOWs are not blocking but are never silently dropped. This binds on every host, whether or not `/goal` is installed. Each re-review reviews the WHOLE target from the first phase combined with ALL prior fixes — never just the previous cycle's fix in isolation. (This applies in every case — including when this workflow is a step inside a parent workflow — because it always runs inline in the main session and owns the loop directly.)

> **Specialist finding re-entry (steps 3–9) — DEFAULT is re-run the raising specialist, NOT holistic-only.** The shared step-1 `$changes-review` dimensions do not re-run the specialists that ran once at steps 3–9, and step 14 `$why-review` is a holistic pass. A specialist finding fixed in this cycle MUST therefore receive a scoped re-run of the specialist that raised it. Step 14 `$why-review` alone may substitute only with explicit written justification. A step-9 UI finding may close on step 1's internal UI dimension because that lens is intentionally duplicated.

> **Why the conditional step-14 re-review is sufficient:** step 2 reviews the starting state early, in parallel with dimensional review. Any fix invalidates that verdict; step 14 applies the same holistic adversarial lens to the settled final state whenever the fix cycle changed files, so parallelizing discovery does not weaken post-fix convergence. When no fix landed there is no post-fix state to re-review and the step is skipped.

### Inline-In-Main-Session (Step 14)

1. **INLINE INSIDE A PARENT WORKFLOW:** step 14 runs in the main session as part of this 19-step workflow; only the distinct step-2 initial whole-target occurrence is delegated as a sub-agent.
2. **ONLY THEN** run conditional `$experience-review` (step 15), proceed to conditional `$scan --target=domain-entities` (step 16), then `$docs-update` (step 17).

### Nested Tail Guard (Steps 18–19) — Top-Level Invocation Only

> **Why this guard exists:** this workflow is mandated to run **INLINE in the main session** when nested (see the WORKFLOW-IN-WORKFLOW note). Without the guard, its own terminal tail executes mid-parent: `$workflow-end` announces `Workflow [name] completed` and closes workflow state, then `$watzup` runs the full terminal wrap-up — the mandatory `$understand` handoff plus an ask the user directly Next-Steps prompt — while the parent still has pending steps. That tells the user a running workflow is finished and pays for an expensive terminal artifact twice.

**CANONICAL SOURCE — `.claude/workflows.json` → `workflows.workflow-review-changes.sequence`, occurrences `review-changes-end` and `review-changes-watzup`.** Both carry an identical `applicability`, reproduced here VERBATIM. Per `SYNC:workflow-registry-binding`, the registry owns this condition; if the two texts ever diverge, that is drift — surface it, do not pick a side.

```text
when:       This workflow is the TOP-LEVEL invocation — the user ran $start-workflow workflow-review-changes, or $changes-review routed here directly.
skipReason: Nested inside a parent workflow (workflow-feature, workflow-bugfix, workflow-refactor, workflow-big-feature, workflow-greenfield-init, workflow-spec-sync, workflow-code-to-spec [update]); the parent owns $workflow-end and its own terminal wrap-up. Return control to the parent after docs-update instead of announcing workflow completion or running the $understand + Next-Steps handoff.
```

1. **DETECT (first action of step 18):** evaluate the `when` above. It is **top-level** exactly when `when` holds; otherwise it is **nested**.
2. **NESTED → SKIP BOTH.** Complete tasks 18 and 19 with the registry `skipReason` recorded VERBATIM as their evidence. Then return control to the parent immediately after step 17. Do NOT announce workflow completion, do NOT run `$understand`, and do NOT present a Next-Steps prompt — the parent's remaining steps still own the session.
3. **TOP-LEVEL → RUN BOTH** exactly as declared, unchanged.
4. **THE GUARD COVERS ONLY STEPS 18–19.** Steps 0–17 are identical in both cases. In particular the Step 0 review loop still binds (it always runs inline and owns the loop directly), and step 17 `$docs-update` still ALWAYS runs.
5. **Step 17 is NOT redundant with the parent's `$docs-update`.** Every parent places file-mutating steps between this workflow and its own trailing `$docs-update` — E2E authoring, `spec [mode=update|tests|sync]`, `integration-test`, `test`/`fix`, `scan`. This workflow's step 17 documents the reviewed diff; the parent's later `$docs-update` documents what those subsequent steps produced. Neither covers the other's surface, so NEVER drop either one.

### Iteration Tracking (Durable Run-Scoped)

Track iteration count in the durable `review-policy.cjs` run record. Resume the same run after conversation changes; resume preserves completed rounds and findings. A changed target invalidates prior evidence and acceptance but must preserve the spent round budget. Never reset the run to round 0 merely because context was lost.

**Rules:**

- **Repeated blocker cap** — if the same validated finding repeats for 2 full invocations with no progress, STOP and escalate by asking the user directly (manual review required)
- **PASS = done** — if no fix cycle happened, initial clean reviews/tests are enough; if a fix cycle happened, PASS requires a complete step-14 `$why-review` pass clearing the round's bar: zero findings (round 1) or zero CRITICAL/HIGH/MEDIUM with deferred LOWs listed (round 2)
- **Severity floor — from round 2, LOW stops blocking.** Round 1 of the fix loop converge on a **zero-finding** pass at any severity. **From round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM — a re-review round whose validated findings are ALL LOW ENDS the loop.** Do NOT open another `$plan`→`$plan-execute`→`$why-review` round for LOW findings alone: record every remaining LOW under `## Deferred LOW Findings (severity floor, round ≥2)` in the report and proceed to step 14. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (a failing test is a failure, not a LOW finding). Severity tiers per `SYNC:severity-rubric`.
- **Review blockers increasing** — if round N finds MORE review blockers (validated findings at its own bar plus failed non-test binary gates; round-2 LOWs and failing test gates never count) than round N-1, STOP and escalate by asking the user directly — unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first. A LOW-only round 2 has zero review blockers, so it is never an increase.
- **Goal Satisfaction FAIL = findings exist** — a required saved criterion at FAIL in the Goal Satisfaction matrix enters the SAME loop as a code finding: validate the gap is real → `$plan` → `$plan-execute` → step-14 re-review of the affected criteria only. Workflow end requires every required criterion PASS or BLOCKED with a user-facing escalation reason; mark criteria BLOCKED (never silently drop them) when two consecutive iterations show no criterion progress.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json`). Pass the same goal file reference to every child step; step 1 `$changes-review` emits the Goal Satisfaction matrix against the SAME saved criteria. After each fix cycle, append an Iteration Log entry to the goal file with evidence references.

### Flow Diagram

```
Initial phase: $changes-review INLINE + whole-target $why-review sub-agent → all-return barrier
                                ↓
Main Session: Specialist batch (3–9) → $code-simplifier (10) → Plan/Fix (11–13)
                  │                                          │
                  │ (no validated blocking finding)          │ (only if $plan-execute changed files;
                  ↓                                          ↓  else skip step 14)
   $experience-review (15, conditional)         $why-review HOLISTIC re-review (14)
   $scan domain-entities (16, conditional)                 │
   $docs-update (17)                                       ↓
   $workflow-end (18)  ← top-level only         new blocking findings? ── yes ──┐
   $watzup (19)        ← top-level only                   │ no                  │
   DONE ✓ (nested: return to parent after 17)             ↓                     │
                                      $experience-review (15) ←────────────────┘
                                      (loop Plan → Fix → re-run 14)
```

---

<!-- FIX-LOOP-MODE:START -->

## Mode: `--fix-loop` (OPTIONAL outer convergence loop)

> **Activation:** ONLY when the invocation carries `--fix-loop` (e.g. `$workflow-review-changes --fix-loop <scope>`, or a routed request to "run the review-changes workflow repeatedly until a complete pass applies zero fixes"). Without the flag, skip this whole section — the default workflow above is unchanged. Every default gate still binds inside each round: Step 0 loop binding, the `initial-reviews` and `reviewers` all-return barriers, the inline-in-main-session rule, spec enrichment, and the conditional step-14 re-review loop.

### Fix-Loop Quick Summary

**Goal:** Converge a review scope to a **clean no-op pass** by re-running the ENTIRE default `$workflow-review-changes` workflow INLINE, round after round, over a fixed scope combined with the fixes accumulated so far — stopping when a complete round applies **zero fixes**. **From round 2 the severity floor applies: LOW findings are no longer fixed, so a round that surfaces only LOW findings, with no other edit landing, is a zero-fix round and ENDS the loop.**

- **Steps (in order):** (FL-0) resolve scope + Goal Contract → (FL-0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (FL-1) round loop { run default `$workflow-review-changes` INLINE → detect fixes-applied → log iteration } → (FL-2) converge on a zero-fix round OR escalate on non-progress → (FL-3) recap.
- **Convergence:** stop ONLY when a whole round applies **zero fixes** (its fix cycle skipped, working tree unchanged, reviews clean) — not merely one clean review.
- **Inline invariant:** run each round's `$workflow-review-changes` (default mode, WITHOUT `--fix-loop`) via the skill invocation, NEVER the `spawn_agent` tool — it self-binds its own Step 0 review-loop obligation (owning the session Stop hook for its `/goal` gate WHEN available), which a sub-agent cannot own or carry back to this loop.
- **Severity floor — from round 2, LOW stops blocking.** Round 1 fix every validated severity. **From round 2 tell the inner default workflow to fix only CRITICAL/HIGH/MEDIUM and to defer LOW findings** — a round whose validated findings are ALL LOW therefore applies no review fix and CONVERGES once no other edit (such as a `$code-simplifier` change) lands. Carry every deferred LOW into the recap and Goal Contract; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit. Severity tiers per `SYNC:severity-rubric` (carried below).
- **Bounded:** round cap default 2 plus one conditional extension to round 3, granted ONLY when round 2 leaves a validated CRITICAL/HIGH open (round 3 is the review hard cap); a failing test gate has NO round cap — keep fixing and re-running until the tests pass; review blockers not shrinking across 2 rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the budget spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → **STOP & escalate** by asking the user directly.

**Why this mode exists (READ FIRST — it is the whole justification):** the default workflow already converges *internally* to a clean pass, BUT its inner loop does **NOT** re-run the specialist reviewers from scratch. Per the **Conditional Post-Fix Holistic Re-Review Protocol** above, the step-14 re-review runs `$why-review` in full mode plus *scoped* re-runs of the specific specialist that raised a finding — `$architecture-review`, `$performance-review`, `$security-review`, `$integration-test-review`, `$production-readiness-review`, `$domain-entities-review`, and `$ui-review` fire ONCE (steps 3–9). Only a **fresh full re-invocation** re-runs ALL specialists over the now-fixed code — catching **second-order defects the fixes themselves introduced** and killing whole-workflow confirmation bias. Without this outer loop those regressions ship unreviewed.

**Fix-Loop Key Rules:**

- **MUST run INLINE in the main session — NEVER dispatch a round's `$workflow-review-changes` as a sub-agent.** It self-binds its own review-loop obligation (owning the session Stop hook for its `/goal` gate when available); as a sub-agent that in-session guarantee is silently lost (see the `[WORKFLOW-IN-WORKFLOW]` execution block above). The outer loop therefore also runs inline.
- **Convergence = a whole round applied ZERO fixes** (its fix cycle, steps 11–14, was skipped because reviews passed clean). That, not "one clean review", ends the loop.
- **Scope base is FIXED across rounds; the working tree grows.** Recompute the scope each round as `branch-diff base` ∪ current uncommitted changes — the diff base never moves, so convergence is measured against a stable target.
- **Round cap (default 2, extendable ONCE to 3)** and **review-blockers-increasing → STOP & escalate** by asking the user directly. NEVER loop open-ended. Round 3 is granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL), is checked before the count-based stops, never renews, and round 2 blocked by MEDIUM alone escalates instead. A failing test gate is never capped: the loop keeps fixing and re-running until the tests pass. Cap exhaustion escalates whenever fixes are still landing — CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open — while a zero-fix LOW-only round converges via the severity floor.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never applies to a binary gate inside the inner workflow (a failing test is a failure, not a LOW finding).
- **Plan each round's tasks FIRST.** Before the first round, create a todo-task plan enumerating every fix-loop step and planned round; on EVERY new round, REGENERATE a fresh round task plan (the inner workflow's 19 step tasks included) — NEVER reuse the prior round's task list.

### Fix-Loop First Principle — Convergence, Not Motion

> A round that changes files is progress **only if** the next round finds fewer things to fix.
> The loop exists to reach a fixed point (zero fixes), not to keep churning the diff.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round — except the one round-2 CRITICAL/HIGH extension, which is granted first.

### FL-0 — Resolve Scope + Goal Contract (FIRST ACTION in `--fix-loop` mode)

1. **Parse the review scope** from the user prompt into a stable, reusable scope string. It has two parts UNIONed:
   - **Branch-diff base** — a branch-to-branch or PR diff, e.g. `feature/x` into `develop`. Capture it as `git diff develop...HEAD` (three-dot: changes on the feature branch since it forked from `develop`) so the base is a **fixed merge-base**, not a moving target.
   - **Current changes** — the uncommitted working-tree changes (`git status --porcelain`, `git diff` + `git diff --staged`).
   - **Scope string (recompute each round):** `{branch-diff base} ∪ {current uncommitted changes}`. The base commit is fixed for the whole loop; the uncommitted set legitimately grows as fixes land.
   - If the prompt names no branch diff (pure "current changes" review), the scope is just the working-tree changes — the loop still applies.
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (carried below; `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root — default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` — template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
   > *A complete default `$workflow-review-changes` run over `{scope}` applies **zero fixes** (a clean no-op pass — no `$plan-execute` file changes; **round 1** no validated findings of any severity, **round 2** no validated CRITICAL/HIGH/MEDIUM, with remaining LOW findings deferred rather than fixed).*
   Record the round cap (default 2, extendable once to 3 on an open CRITICAL/HIGH at round 2; failing test gates uncapped until green), the severity floor (LOW non-blocking from round 2), and the scope string in **Constraints**.

### FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (FL-1–FL-2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run default `$workflow-review-changes` INLINE over `{scope}` (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix. From round 2 on, instruct the inner workflow to fix only CRITICAL/HIGH/MEDIUM validated findings and to defer LOW ones. Do NOT stop while the last round still applied fixes. Converge when a full round applies ZERO fixes (reviews clean, `$plan-execute` changed no files) — which from round 2 includes a round whose only validated findings were LOW and that landed no other edit. Cap at `{N=2}` rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → STOP and escalate by asking the user directly. Never loop open-ended.

Treat this as a standing obligation you re-read at every FL-2 checkpoint — NOT a one-time note you can rationalize away after the first round. The Goal Contract's required Success Criterion (FL-0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal workflow-review-changes --fix-loop convergence loop: repeatedly run default $workflow-review-changes INLINE over {scope} (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix; if fixes>0 → run another round; if a full round applied ZERO fixes (reviews clean, $plan-execute changed no files) → CONVERGED, clear the gate. From round 2 on, the inner workflow fixes only CRITICAL/HIGH/MEDIUM and defers LOW, so a LOW-only round that landed no other edit is a zero-fix round and CONVERGES. Do NOT stop while the last round still applied fixes. Cap at {N=2} rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → STOP and escalate by asking the user directly. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (FL-1–FL-2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner default round self-binds its OWN Step 0 review-loop obligation (and installs its own `/goal` gate WHEN available) that clears when that round reaches its internal clean pass. This OUTER loop persists across rounds and **subsumes** the inner ones (a converged loop implies every inner round ended clean). All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

### FL-1 — Round Loop (run → detect → log)

For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat` (or `git rev-parse` of `git stash create` for an exact hash) — as the fixes-applied baseline. Also capture the exact full candidate before review with `node .claude/hooks/lib/review-receipt.cjs snapshot --target=<worktree|staged|commit-descriptor> [--descriptor-json='<exact descriptor JSON>']` and retain its complete JSON output. The default whole-worktree round uses `worktree`; use `staged` or a commit descriptor only when the workflow reviews that exact complete candidate. `CLEAN` needs no receipt; `ERROR` blocks receipt issuance. Artifact-only, external, or subset reviews never qualify. After fixes, capture a new candidate before the next full workflow round.
2. **Run the workflow INLINE:** invoke `$workflow-review-changes` (default mode, WITHOUT `--fix-loop`) via the skill invocation (NEVER the `spawn_agent` tool) with the recomputed `{scope}` as its prompt. Let it run its full 19-step sequence including its own internal fix→re-review loop.
3. **Detect fixes-applied (objective):** compare the working tree after the round to the before-snapshot AND read the workflow's own result:
   - **Fixes applied (>0)** if the working tree changed during the round OR the workflow reported its fix cycle (steps 11–14) ran / `$plan-execute` modified files.
   - **Zero fixes** if the working tree is byte-identical to the before-snapshot AND the workflow reported either no validated findings, or (round 2) validated findings that are ALL LOW with the fix phase explicitly skipped.
   - If a claimed LOW-only exit has a changed fingerprint, re-review in the next round (FL-2 row (7)); it is not a no-op convergence pass.
4. **Append an Iteration Log entry** to the Goal Contract: round number, files changed this round (`file:line`), fixes-applied count, the review verdict, and remaining gaps.

### FL-2 — Convergence & Escalation Gate

Evaluate after every round, **in this order — the first matching row decides** (rows (1), (4) and (5) are the outcomes `SYNC:double-round-trip-review` and `review-policy.cjs` enforce; the count-based stops (2) and (3) are this loop's stricter exit on top of them, evaluated after the extension so they never pre-empt it, and rows (6) and (7) are this loop's own zero-fix convergence and its zero-fix proof round; count only review blockers — validated findings at each round's own bar plus failed non-test binary gates, never failing test gates): (1) round 2 left a validated CRITICAL/HIGH review blocker open → the one extension round, even when the blocker count did not shrink; (2) review blockers increased vs the prior round → STOP & escalate; (3) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate (the EARLIER exit before the budget); (4) the review budget is spent with a review blocker still open (round 2 without a CRITICAL/HIGH, or round 3 and later) → STOP & escalate, even while a test gate is also red; (5) a test gate is failing and no review blocker is open → keep looping with no round cap, and never converge while it is red; (6) the round applied ZERO fixes (no review, simplifier, or `$plan-execute` edit, and from round 2 a LOW-only round applies none) and no test gate is failing → CONVERGED; (7) the round applied fixes but no review blocker is open and no test gate is failing (for example only `$code-simplifier` edited) → run the next round to prove a zero-fix pass while within budget, and STOP & escalate once the review budget is spent; (8) review blockers are open within budget and shrank (or this is round 1) → fix them and any failing test, then run the next round. A MATERIAL trade-off pauses the loop at any step before its fix lands.

| Condition | Action |
| --- | --- |
| Round applied **ZERO fixes** (clean no-op pass) AND no test gate is failing | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to FL-3. |
| Round applied fixes AND round `< N` AND findings shrank vs prior round | Recompute `{scope}`, run round `R+1`. |
| Round applied fixes but **no review blocker is open** AND no test gate is failing (for example only `$code-simplifier` edited) | Within budget: recompute `{scope}` and run round `R+1` to prove a zero-fix pass. At a spent review budget: **STOP & escalate** by asking the user directly — never converge on edits no zero-fix pass has followed. |
| Review blockers are still open and did **not shrink** across 2 consecutive rounds (same/increasing count; failing tests excluded — they loop until green; a round-2 CRITICAL/HIGH takes the extension row first) | **STOP & escalate** by asking the user directly — a non-converging loop is a signal, not a reason to spin. |
| Round `R ≥ 2` whose validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM) AND the round applied zero fixes (no simplifier or other edit landed either) AND no test gate is failing | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to FL-3. |
| Round 2 completed with a validated **CRITICAL or HIGH** still open | **ONE extension round is granted** → land the validated fixes and run round 3 (fresh full re-review), even when the blocker count did not shrink. Granted once per loop; it never renews. A failed non-test binary gate counts as CRITICAL here. |
| A **test gate** is failing (a suite that must actually pass) and no review blocker is open, at any round within or past the budget | **Keep looping — NO round cap.** Run the failed-test investigation gate, fix at the owning layer, re-run the tests, and continue past round 3 until they pass. NEVER weaken an assertion, add a skip, or relax a timeout to force green. A failing test never counts toward the no-progress escalation or the round-3 extension. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM fixes still landing — round 2 blocked by MEDIUM or an unresolved `NOT VERIFIABLE` alone, or round 3 (the review hard cap) blocked by any review blocker | **STOP & escalate** by asking the user directly — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.) |

> **Increasing review blockers = STOP.** If round `R` surfaces MORE review blockers (validated findings at its own bar plus failed non-test binary gates) than round `R-1`, the fixes are regressing the code — STOP and escalate immediately (mirrors the **Review blockers increasing** rule under **Iteration Tracking (Durable Run-Scoped)** above), unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first. A LOW-only round 2 has zero review blockers, so it is never an increase. Never trade one fix for two new findings across rounds.

### FL-3 — Recap

Emit a concise convergence recap: rounds run, total fixes applied per round (the shrinking sequence), the final clean-pass evidence, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's report under `tmp/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

**Mint the review receipt (MANDATORY terminal action).** Only when the final zero-fix round reviewed the complete `CHANGED` current-repository candidate, run:

```bash
node .claude/hooks/lib/review-receipt.cjs issue --kind=workflow-review-changes --scope=full-changeset --snapshot-json='<exact JSON captured before the final zero-fix round>'
```

This records — for the review-before-commit gate (`review-commit-gate.cjs`) — that this exact candidate passed the whole `workflow-review-changes --fix-loop`. Pass the original pre-review snapshot; issuance rechecks that same target and rejects drift. Never capture or reconstruct a snapshot at terminal issuance. If step 17 `$docs-update` or any other action changed content after the final round's snapshot, issue nothing and restart the complete workflow round on the updated candidate. Artifact-only, external, subset, or `CLEAN` targets issue no receipt; `ERROR` is blocked, never clean. Issue only after the final round had no fixes and all required reviews and quality gates passed.
### Fix-Loop Convergence Detection — Why Two Conditions

A round counts as converged ONLY when **both** hold: (a) the working tree is unchanged by the round, AND (b) the reviews reported clean at that round's bar — no validated findings in round 1, no validated CRITICAL/HIGH/MEDIUM from round 2 (deferred LOWs listed, not fixed). Both are required because:

- Working-tree-unchanged alone is ambiguous — a round can make no changes because a finding was **unfixable/escalated**, not because it was clean. That is escalation, not convergence.
- Reviews-clean alone is insufficient — an orchestrator can rationalize a "clean" verdict; the objective `git`-diff comparison is the backstop that proves no fix actually landed.

When (a) is true but (b) is false → **escalate** (a real finding the loop cannot close). When (b) is true but (a) is false → the round DID fix things → run another round to re-prove clean.

**IMPORTANT MANDATORY `--fix-loop` sequence:** FL-0 (scope + Goal Contract) → FL-0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → FL-1 (round loop: run default `$workflow-review-changes` INLINE → detect fixes → log) → FL-2 (converge on zero-fix round / escalate on non-progress) → FL-3 (recap + mint the review receipt). Shared protocols this mode relies on — `SYNC:review-policy`, `SYNC:goal-contract-satisfaction-loop`, `SYNC:severity-rubric`, `SYNC:trade-off-interrogation-gate` — are carried once below; never re-copy them into this section.

<!-- FIX-LOOP-MODE:END -->

---

**IMPORTANT MANDATORY Steps:** $changes-review -> $why-review --target=whole-review-target -> $architecture-review -> $domain-entities-review -> $performance-review -> $integration-test-review -> $security-review -> $production-readiness-review -> $ui-review -> $code-simplifier -> $plan -> $plan-review -> $plan-execute -> $why-review -> $experience-review -> $scan --target=domain-entities -> $docs-update -> $workflow-end -> $watzup

> **[STEP CONDITIONS]** Not every step always runs — the bare list above is the canonical order; these are the run-conditions:
> - **Step 0 loop binding (pre-sequence)** — ALWAYS bind the self-recursive review loop. Not one of the 19 counted steps.
> - **Steps 1–2 initial phase** — always run together behind one all-return barrier; step 1 is inline, step 2 is a fresh read-only sub-agent in FULL mode over the whole review target.
> - **Step 4 `$domain-entities-review`** — only if domain entity files are in the diff.
> - **Step 9 `$ui-review`** — only if frontend/UI files are in the diff; it also runs internally inside step 1.
> - **Steps 11–13 `$plan` → `$plan-review` → `$plan-execute`** — only if validated findings require fixes. Skip all three when steps 1–10 PASS clean.
> - **Step 14 `$why-review` (post-fix HOLISTIC re-review, FULL mode)** — only if `$plan-execute` changed files; loops until the current severity bar is clear within the existing bounds (Round 2 LOW-only findings are deferred and do not reopen the loop). Skipped when no fix landed (no post-fix state to re-review).
> - **Step 15 `$experience-review`** — conditional: run when a configured or likely observable surface is affected; otherwise complete it with a cited `NOT-APPLICABLE` reason. A relevant but unusable surface is `ENVIRONMENT-BLOCKED`, never PASS. It MAY land fixes through its own bounded remediation loop (`--rounds=N`, default 3), each round `$changes-review`ing its own fix diff; an unconverged result is `NOT-CONVERGED` + escalation, never a partial pass. Use `--rounds=0` to keep it report-only.
> - **Step 16 `$scan --target=domain-entities`** — only if the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence; otherwise complete it with a cited skip reason.
> - **Steps 1–3, 5–8, 10, 17** — always run (steps 4 and 9 are conditional specialists; steps 11–16 are conditional per the rows above; steps 18–19 run on top-level invocation only).

> **[BLOCKING SEQUENCING]** Launch step 2 `$why-review --target=whole-review-target` as a fresh `code-reviewer` sub-agent, then immediately run step 1 `$changes-review` inline; advance only after both return. Steps 3–9 form the specialist parallel batch (spawned together). Step 10 `$code-simplifier` waits for that barrier. Steps 11–13 are the sequential fix cycle; step 14 is the conditional post-fix FULL-mode whole-target re-review, followed by conditional step 15 `$experience-review`, then conditional step 16 `$scan --target=domain-entities` and step 17 `$docs-update`.

> **[WORKFLOW-IN-WORKFLOW: MUST RUN INLINE IN THE MAIN SESSION — never as a sub-agent]** This skill activates the full `workflow-review-changes` workflow (19 steps). When invoked inside a parent workflow, the orchestrator stays INLINE in the main session. Its step-2 whole-target reviewer is still a child sub-agent, as declared by the initial parallel phase.
>
> **Why inline, never a sub-agent:** the workflow orchestrator owns Step 0's session loop and the step-14 post-fix re-review. Delegating the orchestrator would lose those guarantees. Context remains bounded because the initial step-2 whole-target reviewer and steps 3–9 specialists are child sub-agents writing full reports to `tmp/reports/`.
>
> **Standalone invocation** (not inside a workflow): inline in the main session, identically — no sub-agent.

> **[BLOCKING]** Each step MUST invoke its skill invocation — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[CONDITIONAL POST-FIX RE-REVIEW]** After validated fixes in `$plan-execute` — and ONLY if files changed — run `$why-review` INLINE in FULL mode (step 14) over the settled whole target. If no fix landed, SKIP step 14 (no post-fix state to re-review). Then conditional step 15 `$experience-review`, before `$docs-update`.
> **[REPEATED BLOCKER CAP]** Record re-review invocations and repeated-blocker evidence in the durable run record and report. After a fix cycle, PASS requires a complete step-14 `$why-review` pass clearing the applicable severity bar and every binary gate. Stop after the same validated finding repeats for 2 full invocations with no progress, after 2 rounds MAX without clearance — extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open, never beyond — or if review blockers increase (checked only after the round-2 CRITICAL/HIGH extension, which is granted first); escalate without resetting completed rounds.

Activate the `workflow-review-changes` workflow. Run `$start-workflow workflow-review-changes` with the user's prompt as context.

> **Applicability in this workflow:** step 14 applies fresh-context re-review principles INLINE by re-reading the whole target from scratch. The isolated-sub-agent form governs the initial step-2 whole-target reviewer and steps 3–9 specialists; the workflow orchestrator itself always remains inline.

<!-- SYNC:review-policy -->

> **Executable review policy — one predicate, one durable transition model.** Review skills and their tooling MUST use the canonical helper `.claude/scripts/lib/review-policy.cjs` (policy version 4) for round eligibility. The helper's `blockingFindings(round, findings, hardGates)` predicate returns every validated finding in round 1, and only CRITICAL/HIGH/MEDIUM findings from round 2 onward; `NOT VERIFIABLE` is a separate unresolved-evidence state that remains blocking at every round. Failed binary gates are synthetic CRITICAL blocking findings at every round; record a test-green gate with `kind: 'test'` and every other gate with `kind: 'binary'` (the default). `evaluateRound` retains floor-round LOWs in `deferredLow`, never treats a LOW-only round as blocked after the floor applies, reports `extensionGranted` plus an `ESCALATE` status when the review budget is spent with review blockers open, and reports `failingTestGates` / `testLoopContinues` when failing test gates keep the round open. Severity is assigned before the predicate and never changed to obtain a PASS.
>
> **Round and minimum rules.** `MAX_ROUNDS` (the base budget) is 2 and `HARD_MAX_ROUNDS` is 3; both are ceilings, never targets. Round 3 is an EXTENSION, not part of the default budget: the helper grants it only when the recorded round-2 evaluation still has a validated CRITICAL or HIGH review blocker — a finding, or a failed non-test binary gate carried as synthetic CRITICAL — (`extensionGranted`), grants it at most once per run, and rejects any attempt to reach round 3 without that evidence, except the failing-test continuation below, when round 2's only blockers are failing test gates. **Failing test gates are outside the review budget:** they never earn the extension and never escalate, so while failing `kind: 'test'` gates are the ONLY blockers the helper keeps the run in `CONTINUE` and accepts the next round — past round 3 if needed — until the tests pass. A review blocker past the budget still escalates, and a round with no failing test gate never re-opens the run past its budget. A round-2 evaluation whose blockers are only MEDIUM or `NOT VERIFIABLE` ends the budget and escalates. A clean review ends once `round >= minRounds`; the default minimum is 1 and an explicit `minRounds` may not exceed the base budget of 2 — the extension is earned by evidence, never declared up front. The declaration is persisted and cannot be inferred from a round counter. A failing test-green, security-must-fix, required-artifact, or other binary gate is never waived by the severity floor.
>
> **Durable run record.** A review run MUST identify `runId`, target fingerprint, policy version, target revision, minimum/maximum rounds, completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use the atomic, lock-serialized transitions in `review-policy.cjs`: `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, and `check`. Repeating an identical completed round is idempotent and MUST NOT consume budget twice. A changed target fingerprint invalidates prior evidence and acceptance but MUST preserve the bounded round budget; stale evidence cannot be accepted. A policy-version change (including the round-2 LOW floor and the conditional round-3 extension) invalidates old records; start a new run rather than interpreting old evidence under new semantics. Interrupted/resumed runs retain completed rounds and findings. The record is bookkeeping, not consent, native permission, or proof that a host actually performed the review.
>
> **CLI boundary.** The helper CLI accepts JSON on stdin and uses its own real clock; a supplied `now` is rejected. State directories must be absolute, non-root real directories, records are size-bounded, and malformed/locked state fails closed for the transition. Full reports remain on disk; an inline result envelope is only a transport summary. Any new review policy consumer must add a semantic fixture, boundary counter-cases, a seeded mutant, and a report with the target fingerprint and command exit status.

<!-- /SYNC:review-policy -->

<!-- SYNC:parallel-phase-advancement -->

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `spawn_agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Claude and Codex both advance from this static rule when hooks are absent, disabled, or stale.
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
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero findings at any severity; **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap, immediately before target/source reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate but never prove it ran.
>
> 1. **Scope** — identify file types, domain area, and operation.
> 2. **Project config is OPTIONAL.** Read the configured project-config file via its loader (default `docs/project-config.json`) when it exists. Absent is a supported state, not an error: run on portable defaults, derive project facts (paths, commands, conventions, architecture, test/spec layout) from repository evidence (manifests, lockfiles, scripts, CI, layout, root instruction files), state material assumptions, never block, and at most OFFER `$project-init` or `$project-config` once. Present → minimum valid shape is a non-empty `project.name`; omitted optional capabilities use neutral defaults or skip. A DECLARED section left malformed or incomplete is a configuration error: fail closed on it and run `$project-init` or `$project-config` before relying on it — why: silent defaults would present wrong facts as authoritative. Verify material config hints against repository evidence; generic defaults are never project facts.
> 3. **Select docs.** Always-on: the project-init-owned `lessons.md` and docs-index inputs at their configured owner paths — read independently, never appended to `referenceDocs`. Task-specific: an explicit `referenceDocs` array is the exact selection, subsets and `[]` included; absent → the runtime capability-aware resolver (portable baseline plus configuration- or repository-evidenced capabilities; may be empty). The scan-target manifest is a registry, not a default selection. Filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). Custom-doc schema, ownership, and path-safety rules: `.claude/skills/scan/references/targets.md`.
> 4. **Route by phase.** Just in time, read the selected docs the table names for the phase you are ABOUT to enter, plus any selected custom doc whose `purpose` covers that phase. An unmatched row is `Not applicable`, never a blocker.
>
> | About to… | Read first (when selected and present) |
> | --- | --- |
> | investigate, explain, plan, design, estimate | `project-structure-reference.md`, `domain-entities-reference.md`, plus the edit-row docs for every file type the plan will touch |
> | edit or write code | `code-review-rules.md`, plus server-side / non-UI code → `backend-patterns-reference.md`; UI → `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md` |
> | write, run, fix, or review tests or test data | the matching kind: `integration-test-reference.md` · `e2e-test-reference.md` · `seed-test-data-reference.md` |
> | author or change specs, test cases, or docs | `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`; `workflow-spec-test-code-cycle-reference.md` when specs, tests, and code must stay in sync |
> | review a diff, plan, spec, or artifact | `code-review-rules.md`, plus the edit/test/spec-row docs for every file type under review |
>
> 5. **Per-file conventions** (`contextGroups[]` in the project config) add rules for the exact file read or edited: hooks deliver them where they run; elsewhere run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` before the first edit of an unfamiliar path class.
> 6. **Cite and repair.** State `Reference docs read: ... | Not applicable: ...` (record an explicit empty selection); still honor references the active skill or task requires. A missing/stale always-on input or selected/required doc, or a malformed declared config section → `$project-init` or the narrow owner route (`$project-config`, `$docs-init`, `$scan --target=<key>`, `$ai-context-refresh`) before relying on it.
> 7. **Dedup within ~200K tokens.** A doc counts as loaded only when its full content came back to THIS context from your own read, after the last compaction and within roughly the last 200K tokens, and it has not changed since — list it in `Reference docs read:` as `<doc> (loaded)` and skip the re-read. Everything else is not loaded: a hook reminder, a summary, a doc merely named in the conversation, or a read by another agent. Re-select and re-read after compaction, resume, a material context change, or ~200K tokens of growth (= the file-convention hook default). A delegated sub-agent starts empty: name the resolved doc paths in its brief.
>
> **Ready when:** scope set · config read or its absence recorded · always-on inputs confirmed · selection applied (may be empty) · phase docs read or cited `(loaded)` · citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:session-goal-ledger -->

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

<!-- /SYNC:session-goal-ledger -->

<!-- SYNC:workflow-registry-binding -->

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, order, args, applicability, barriers and execution mode. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `$sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure changed work reaches a defensible review pass through an initial whole-target adversarial pass run in parallel with dimensional review, validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, fix only validated blocking findings, then repeat the plan→plan-execute→changes-review loop until the current severity bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred).

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
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** launch step 2's whole-target FULL-mode `$why-review` as a fresh sub-agent, immediately run step 1 `$changes-review` inline, and advance only after BOTH return; then spawn the specialist reviewers in ONE message.
**IMPORTANT MUST ATTENTION** spawn the steps 3–9 specialist reviewers ALL in ONE message and advance ONLY after EVERY member (steps 3–9) returns; defer mutating `$code-simplifier` (step 10) until the barrier clears.
**IMPORTANT MUST ATTENTION** every finding, recommendation, and verdict needs `file:line` proof or traced evidence + a confidence % — >80% act, 60–80% verify first, <60% DO NOT recommend; "Insufficient evidence" is valid output — why: speculation is forbidden output and silently encodes false positives into the fix plan.

**MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting — create ALL 19 tasks immediately (source of truth = `workflows.json` → `workflow-review-changes.sequence`); mark one `in_progress`, mark `completed` immediately after each step's evidence; on context loss call the current task list first — never duplicate.
**MUST ATTENTION** grep 3+ existing patterns and read the target files BEFORE proposing any fix; cite `file:line` evidence in the fix plan — local conventions override generic framework defaults — why: closest example ≠ matching preconditions, verify shared base classes/scope/lifetime before copying.
**MUST ATTENTION** after fixes in `$plan-execute` (and ONLY if `$plan-execute` changed files), run the conditional step-14 `$why-review` INLINE in FULL mode over the settled whole target; re-read the target from scratch to counter orchestrator confirmation bias — why: the main agent rationalizes findings about its own fixes; loop `$plan`→`$plan-execute`→`$why-review` until clean at that round's bar — from round 2 a LOW-only re-review is clean, so never spin another round for LOW findings alone.
**MUST ATTENTION** track full re-review invocations and repeated blockers in the durable run record, preserving completed rounds across resume and target revisions — stop after the same validated finding repeats for 2 full invocations with no progress and escalate by asking the user directly; STOP and escalate if round N finds MORE review blockers than round N-1 (checked only after the round-2 CRITICAL/HIGH extension, which is granted first) — never silently loop.
**MUST ATTENTION** PASS means one complete review pass finds zero blocking issues after all validated fixes and verification are included; a behavior-changing fix without its configured canonical requirement/scenario and mapped executing assertion/result is an OPEN finding, NOT a clean pass; the strict default profile uses a covering §8 regression/preservation TC — green tests do not normalize spec drift.
**MUST ATTENTION** skip steps 11–14 ONLY when all reviews PASS with zero findings (or, from round 2, with only deferred LOW findings left); step 14 `$why-review` runs whenever the fix cycle changed files and proves the settled post-fix target.
**MUST ATTENTION** step 14 runs `$why-review` STANDALONE in FULL mode over the settled WHOLE review target; if it surfaces BLOCKING findings, re-enter `$plan`→`$plan-execute` and re-run step 14 until clean at that round's bar (round 2 treats a LOW-only result as clean).
**MUST ATTENTION** adjudicate every behavior-vs-spec divergence in step 1 as CODE-WRONG (BLOCKING) / SPEC-STALE / SPEC-SILENT / AMBIGUOUS (escalate) against the configured canonical owner; reconcile its requirement/scenario, executing assertions and results at declared cardinality — use §3/§4/§8 TCs only under the strict default profile — NEVER silently pick a side; the workflow is NOT clean while any divergence stays unadjudicated.
**IMPORTANT MUST ATTENTION** each step MUST invoke its skill invocation — marking a task completed without invocation is a workflow violation; NEVER batch-complete validation gates — why: a skipped gate ships unreviewed work.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory ask the user directly user-decision gates — surface them, never silently pass when tests or locale updates are missing.
**IMPORTANT MUST ATTENTION** `$why-review` has two occurrences: step 2 FULL-mode whole-target startup review in parallel with step 1, and step 14 FULL-mode whole-target post-fix review (only when the fix cycle changed files). There is no separate findings-validation occurrence.
**IMPORTANT MUST ATTENTION** when invoked inside a parent workflow, run this whole 19-step workflow INLINE in the main session; only its declared child reviewers (step 2 and steps 3–9) run as sub-agents.
**IMPORTANT MUST ATTENTION** apply critical + sequential thinking — keep the SKEPTIC default when reviewing: steel-man rejected alternatives, invert each stated reason, stress-test top assumptions; section presence ≠ quality — why: certainty without evidence is the root of hallucination.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding/test/refactor must answer "does this make the next change cheaper?"; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) — reject best practices that raise change cost.

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** re-run the WHOLE default workflow INLINE via the skill invocation (NEVER a sub-agent), round after round, over a FIXED scope (branch-diff base ∪ current uncommitted changes, recomputed each round) until a complete round applies **ZERO fixes** (working-tree fingerprint unchanged AND reviews clean at that round's bar) — not merely one clean review; its value is the fresh full specialist sweep the default step-14 re-review never re-runs. **Mode scope:** this workflow-level mode re-runs the WHOLE 19-step workflow and is DISTINCT from standalone `$changes-review --fix-loop`, which pairs ONE review pass with `$fix` on validated findings — their convergence wording differs by design. Bind the outer protocol loop (primary) plus the `/goal` accelerator when available, keep a Goal Contract with a per-round Iteration Log, regenerate a fresh task plan every round, and evaluate the FL-2 rows in order — first matching row decides.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 2, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open)**; review blockers not shrinking across 2 rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the budget spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → **STOP & escalate** by asking the user directly. NEVER loop past round 3 on review blockers, or open-ended — only failing test gates continue, until green. In `--fix-loop`, from round 2 a LOW-only round that landed no other edit is a zero-fix round and ENDS the loop.

**Anti-Rationalization:**

**IMPORTANT MUST ATTENTION** when the inline step-1 diff route detects executable E2E/browser/user-flow code, apply the shared E2E quality protocol and invoke report-only `$e2e-test-verify`; when it does not, record `NOT-APPLICABLE`. Keep this conditional handoff separate from step 15 `$experience-review`.

| Evasion                                          | Rebuttal                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| "Reviews look clean, skip `$why-review`"         | There is no separate findings-validation step — the step-2 startup whole-target pass and the specialist batch are the validation; keep any step-1 finding labelled UNVALIDATED until a reader verifies it. |
| "The initial whole-target review passed, skip step 14" | Step 2 reviewed the starting state; step 14 must prove the settled post-fix state whenever the fix cycle changed files. |
| "Step 14 can reuse `--validate-findings`"        | No — terminal validation only re-checks an existing findings list; step 14 must run FULL mode over the whole target. |
| "I already know what I fixed, skip re-review"    | Orchestrator confirmation bias — re-read the full diff from scratch INLINE; main-agent self-review is NOT enough. |
| "Tests are green, the spec drift is fine"        | Green can encode the drift itself — adjudicate CODE-WRONG / SPEC-STALE; not clean until every divergence resolved. |
| "Mark the step done, the skill obviously ran"    | Marking completed without invoking the skill invocation is a workflow violation — show the invocation evidence.       |
| "Same blocker again, one more loop will fix it"  | Cap at 2 no-progress repeats AND 2 rounds MAX (one extension to round 3 only when round 2 leaves a validated CRITICAL/HIGH open) → escalate by asking the user directly at whichever trips first; if review blockers increase round-over-round (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), STOP now.     |
| "Round 4 turned up two more nits, loop again"    | From round 2 the severity floor ends the loop on a LOW-only round — defer and list those LOWs; only CRITICAL/HIGH/MEDIUM buys another round.               |
| "Fix at the crash site, it's faster"             | Trace caller (wrong data) vs callee (wrong handling); fix at the responsible layer, never patch the symptom site. |
| "`--fix-loop`: the round's review was clean, so it converged" | Not while that round landed any edit (a `$code-simplifier` change included) — run the next round to prove a zero-fix pass, or escalate at a spent budget. |

---

**IMPORTANT MUST ATTENTION** Step 0 binds the self-recursive review loop before the 19-step sequence; the workflow orchestrator always runs inline in the main session. With the OPTIONAL `--fix-loop` flag, FL-0/FL-0b run first and wrap the whole workflow in the outer zero-fix convergence loop; without it, nothing in the default workflow changes.
**IMPORTANT MUST ATTENTION** steps 1–2 form the initial all-return barrier (`$changes-review` inline + whole-target `$why-review` sub-agent); steps 3–9 form the specialist barrier (all spawned in ONE message); `$code-simplifier` (step 10) waits until it clears.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); grep 3+ patterns and read target files before any fix — no speculation.
**IMPORTANT MUST ATTENTION** after `$plan-execute` changes files, run the step-14 `$why-review` INLINE from scratch and loop until ONE clean pass at the round's bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list the LOWs as deferred)** — a behavior change without a profile-mapped canonical scenario/case and guarding assertion is an OPEN HIGH finding, never a deferrable LOW; the strict default profile expresses that coverage as a §8 TC; bounded at 2 rounds MAX with repeated blockers capped at 2 → escalate at whichever trips first, never PASS on cap exhaustion.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. A documented command, entry point, or wrapper script gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>` — a single-OS example is an incomplete protocol. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
