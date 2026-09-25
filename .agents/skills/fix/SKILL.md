---
name: fix
description: '[Implementation] Use when a workflow step or the user asks for an issue to be analyzed and fixed. Flag: --target={ci|issue|logs|test|types|ui} scopes the fix.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
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

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), and add or update regression coverage that proves the fix converges.

**Summary:**

- **Purpose:** Diagnose end-to-start, fix the lowest invariant-owning layer, update regression coverage and spec/tests; NEVER patch symptoms.
- **No-flag spine:** Root-Cause Prerequisite Gate → researcher investigation → `debug-investigate` trace (`file:line`, hypothesis matrix, forward proof) → Confidence & Evidence → impact plan → 🛑 Validate-Before-Fix → owning-layer implementation → standalone test update (`$integration-test`, or justified `$test` fallback) → conditional `$spec` check → `$changes-review` for production code → `$why-review`; ALWAYS follow this order.
- **Routing:** `--target={ci|issue|logs|test|types|ui}` selects a self-contained inline branch with its own diagnosis; no flag runs the spine. Branches skip standalone §1/§2 duplication, but every direct call passes the Root-Cause Prerequisite Gate.
- **Modes/gates:** HARD is default; fast mode requires ALL 5 trivial-bug conditions. Root-cause proof, `Confidence: X%` (`<60%` STOP), and Validate-Before-Fix are hard gates; approval may skip only inside a workflow, while standalone calls own test/spec/review phases; NEVER bypass a gate.

**Workflow:**

1. **Investigation** — Use researcher subagents to explore the issue in parallel; use `$investigate` inline for graph-backed tracing.
2. **Diagnose** — Trace root cause through code paths with evidence
3. **Plan** — Create fix plan with impact analysis
4. **Fix** — Implement and verify the fix
5. **Standalone test update** — After the fix, every standalone call invokes `$integration-test` to add or update regression coverage; use `$test` only for a justified unit-test seam. Inside a workflow, the parent sequence owns these test phases.

**Key Rules:**

- **Root-Cause Prerequisite Gate (BLOCKING):** no code edit until `$debug-investigate` traced THIS problem in THIS session — evidence, not recall
- Debug Mindset: every claim needs `file:line` evidence
- Use subagents for parallel investigation of multiple hypotheses
- Always create a plan before implementing complex fixes
- **Target flag** (see [Target Routing](#target-routing---target)): `--target={ci|issue|logs|test|types|ui}` selects a self-contained inline branch that scopes the fix to that domain. No flag = full diagnose→fix spine below.

## Default Mode Policy

> **Default mode HARD.** Every section below applies: parallel researcher subagents, `file:line` root-cause tracing, Confidence & Evidence Gate, impact plan, and bug-preservation tests.
>
> **Fast mode ONLY when ALL 5 conditions hold** (genuinely trivial bug):
>
> - Root cause obvious from error and already located; no diagnosis needed
> - One file; ≤10 changed lines
> - No cross-service impact or contract change
> - Existing bug test, or non-functional typo/log-message fix
> - Fix confidence ≥95% without further investigation
>
> Any condition fails → full protocol; in doubt use HARD. Non-trivial fixes cannot skip diagnosis.
>
> **Fast mode skips only:** parallel subagent investigation (direct read/grep instead), separate plan (inline change), and regression-test authoring (only when coverage exists). It still runs Confidence & Evidence, Behavioral Delta Matrix, and the existing test suite.

## 🛑 Root-Cause Prerequisite Gate (Direct `$fix` Invocation) — BLOCKING

> **[BLOCKING]** Direct `$fix` MUST NOT edit code until `$debug-investigate` produces THIS problem's root cause in THIS session. The gate runs before the Standalone Mode Minimum Contract, any `--target=` branch, and 🛑 Validate-Before-Fix. — why: an untraced first edit patches the symptom site and ships the disease.
>
> **1. Trigger — ALL direct invocations.** User-typed command or model-selected skill; every `--target={ci|issue|logs|test|types|ui}` branch and no-flag spine. Branches skip contract §1/§2 duplication but pass this gate. — why: a branch `debugger`/`tester` step is not an end-to-start trace.
>
> **2. Check — evidence, never memory.** Before the first code edit, accept only same-session, same-problem `$debug-investigate` evidence:
>
> - a the current task list row for `debug-investigate` (or its phase tasks) covering this symptom, **or**
> - a written investigation report naming this symptom (e.g. `tmp/analysis/{issue-name}.analysis.md`, `tmp/reports/debug-investigate-*.md`) containing the end-to-start trace.
>
> No evidence → NOT run. Recalling that the cause "is known" is not proof. — why: context compaction preserves belief, not findings.
>
> **3. Act.** Not run → run `$debug-investigate` FIRST, then resume `$fix` at planning with its report. This subsumes the spine's step-1 `debugger`. — why: repeating an existing diagnosis double-runs the spine.
>
> **4. Same-problem test.** A prior `$debug-investigate` for a different symptom does NOT satisfy this gate. If `<issues>` is not covered, the gate fires. — why: one investigation per session would license unlimited untraced fixes.
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
> **The last row is the hole this gate closes.** A parent workflow row may exist while its `debug-investigate` step never ran, covered another symptom, or was skipped. This gate adds completed same-problem proof; it never relaxes the contract. — why: a container task is not evidence that its work happened.
>
> **BLOCKED until:** the §2 check is stated with its evidence (or its explicit skip row + proof) AND a root-cause trace for this problem exists. **NEVER** proceed to plan or edit on "the cause is obvious" alone.

## Standalone Mode Minimum Contract (Non-Workflow Only)

> **Workflow context:** `$fix` normally runs inside `workflow-bugfix`, whose sequence (`investigate → debug-investigate → spec [mode=amend] → plan → … → fix → … → spec [mode=sync] → workflow-review-changes`) supplies diagnosis, spec sync, and review. Standalone `$fix` diagnoses and patches but does not guarantee root-cause ownership, alignment with the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), or review; without this contract it risks symptom-patching + spec drift.
>
> **Scope:** applies with no parent workflow. No-flag runs the full diagnose→fix path; `--target={ci|issue|logs|test|types|ui}` branches remain self-contained for diagnosis, skip §1/§2 duplication, and inherit mandatory §3 test-update, §4 spec-correctness, the production-code `$changes-review` gate, and §5 `$why-review` gates. A branch's own `tester` / `code-reviewer` sub-agent step does not replace `$changes-review`.
>
> **Detect mode:** call the current task list first (per Nested Task Expansion). An active parent workflow row skips this section because the workflow owns these steps, but the Root-Cause Prerequisite Gate still requires a completed, same-problem `debug-investigate`; presence alone is insufficient. No parent row → standalone: before the first code edit, MUST ATTENTION create this ordered minimum spine as task tracking todos:
>
> 1. **`$debug-investigate`** — root cause FIRST; §2 evidence decides whether it already ran. Trace symptom end-to-start to the invariant-owning layer with `file:line`, hypothesis matrix, and forward proof. This is standalone diagnosis and subsumes the spine's step-1 `debugger`; resume at planning with its report. Fast-mode-trivial bugs may inline the trace, but the trace remains required.
> 2. **Fix spine** — this skill's `plan → 🛑 approve → implement` body below; Validate-Before-Fix remains unchanged.
> 3. **`$integration-test` test-update gate** — **MUST ATTENTION — MANDATORY after the fix for every standalone call.** Invoke it first to inspect changed behavior and add/update regression coverage. Use integration coverage across a real process/service boundary or for externally observable behavior; use `$test` only for a justified unit seam and record why. An existing suite run does not replace a regression update. Read `integration-test-reference.md` from the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) first.
> 4. **`$spec` spec-correctness check** — *CONDITIONAL, ensures spec docs aren't left stale.* From the proven root cause, decide which case holds:
>    - **Spec WRONG / stale** — behavior was never true or intended behavior changed without a spec update → run `$spec [mode=amend]` for §1-§7, then `$spec [mode=sync]` for §8 `TC-{FEATURE}-{NNN}` ↔ integration tests.
>    - **Spec CORRECT, code failed it** — no §1-§7 amendment. If the bug case is absent from §8, run `$spec [mode=tests]` to add it, then `$spec [mode=sync]`; if an existing TC covers it, record `Spec verified correct, bug case already in §8 — no spec change (code-only defect)` with `file:line`. Never leave the bug case absent from §8.
>    - **No governing spec** — record `No governing spec — nothing to amend` with `file:line`; if warranted, run `$spec [mode=init]`, then `[mode=tests]` to seed the bug-case regression TC. Decide explicitly; skip only amendment, never the decision.
> 5. **`$why-review`** — final todo after fix, test, spec decision, and `$changes-review`; sign off root-cause ownership, lowest-layer fix, no symptom patch, regression coverage, and justified §4 decision. Reporting "done" is blocked until it passes. Trivial non-functional fixes may satisfy it inline/briefly.
>
> **Production-code fixes:** add `$changes-review` before §5; the shared Standalone Review Gate owns placement and inside-workflow skip. **Final standalone order:** `debug-investigate → [fix spine] → $integration-test` (or justified `$test`) → spec-check → changes-review (production code) → `$why-review`.

## Debug Mindset (NON-NEGOTIABLE)

**Skeptical + sequential. Every claim needs traced proof; confidence >80% to act.**

- Verify every hypothesis against an actual code trace; do NOT trust the first guess — why: nearest attention often finds the symptom, not the cause.
- Root-cause claims require `file:line` evidence; without a trace, state "hypothesis, not confirmed".
- Question cause and completeness: trace execution, related paths, and contributing factors.
- No "should fix it" without proof that the fix addresses the traced root cause.

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

**Ultrathink** plan and start fixing these issues; follow Orchestration Protocol, Core Responsibilities, Subagents Team, Development Rules:
<issues>$ARGUMENTS</issues>

## Target Routing (`--target=`)

`$fix` is an intelligent router. With no flag it runs the full diagnose→fix spine below. Pass `--target=` to scope the run to a self-contained inline branch:

| `--target` | Behavior                                                                  |
| ---------- | ------------------------------------------------------------------------- |
| `types`    | **Inline branch (below)** — TypeScript / type-error resolution.           |
| `ci`       | **Inline branch (below)** — CI / pipeline failure triage.                 |
| `issue`    | **Inline branch (below)** — tracked issue / ticket resolution.            |
| `logs`     | **Inline branch (below)** — log / stack-trace-driven debugging.           |
| `test`     | **Inline branch (below)** — failing-test repair.                          |
| `ui`       | **Inline branch (below)** — UI / visual-defect fixes.                     |

No `--target` (or an unrecognized value) → run the full Workflow spine below; infer the right specialization from `<issues>`.

> **Target routing:** `--target=ci|issue|logs|test|ui` are inline `$fix` branches; invoke them through `$fix --target=...`, not separate skill names.

### `--target=types` — TypeScript / type-error branch

Run `tsc --noEmit` (or `nx build` / `bun run typecheck` / `npx tsc`) to gather all type errors, then:

1. **Collect** — Capture every type error with `file:line`.
2. **Classify** — Group by cause: missing types, wrong signatures, import/export issues.
3. **Fix at root** — Give each value its real, specific type (or `unknown` + a narrowing guard). Do NOT use `any` to silence the checker — `any` ships the underlying type defect. Fix the root cause (wrong interface, missing export), not the symptom site. — why: `any` silences the checker and lets the type defect ship.
4. **Repeat** until `tsc --noEmit` is clean — zero type errors.
5. **🛑 Validate Before Fix:** present errors + root cause by asking the user directly, get approval before code changes (skip if inside a workflow).

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ci` — CI / pipeline-failure branch

**Goal:** Analyze CI/CD pipeline logs to identify and fix build/test failures in the configured CI provider/tooling.

**Key Rules:**

- **Infrastructure context:** read `docs/project-config.json` → `infrastructure.cicd.tool` to identify the CI provider/tooling (e.g. `azure-devops`, `github-actions`, `gitlab-ci`); target that provider's pipeline config files.
- Focus on CI-specific issues (env vars, Docker, dependencies, build order).
- Verify the fix does not break local development.

**Workflow:**

1. Use the `debugger` subagent to read the CI logs via the configured CI tool/API (from `docs/project-config.json`), analyze the final failing log/error **backward** to the root cause, and report back. Write findings to `tmp/analysis/{ci-issue}.analysis.md`; re-read before implementing.
2. **🛑 Present root cause + proposed fix → ask the user directly → wait for approval.**
3. Implement the fix from the report.
4. Use the `tester` subagent to verify; report back.
5. If tests fail, repeat from step 2.
6. Report a summary of changes; suggest next steps.

**Notes:** Use the CLI/API for the configured CI provider. If it is GitHub Actions and `gh` is unavailable, instruct the user to install and authorize GitHub CLI first.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=issue` — tracked-issue / ticket branch

**Goal:** Investigate and fix bugs reported as tracked issues (e.g. GitHub issues) with full traceability.

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the issue). Map the ticket's acceptance criteria to the saved success criteria; after the fix, append proof evidence and remaining gaps to the Iteration Log. Closure is blocked while any required criterion remains FAIL.

**Key Rules:**

- Link the fix back to the issue for traceability.
- Verify the fix addresses the specific reproduction steps from the issue.

**Workflow:**

1. Activate `debug-investigate` and follow its workflow; this satisfies the Root-Cause Prerequisite Gate—record its report path as §2 evidence.
   > **AI Debugging Protocol:** frame the observed symptom, trace reader → storage/projection → writer → consumer/job → producer/origin, enumerate feeder paths, record hypotheses, and prove convergence forward.
   > **MUST ATTENTION READ** `.claude/docs/AI-DEBUGGING-PROTOCOL.md` for full search, risk, and confirmation rules.
2. Use external memory at `tmp/analysis/issue-[number].analysis.md` for structured analysis. **Re-read the ENTIRE analysis file before proposing any fix.**
3. **🛑 Present root cause + proposed fix → ask the user directly → wait for approval before implementing.**
4. Implement the approved fix.

> **Standalone Review Gate (non-workflow only):** any standalone production-code fix — the no-flag spine (Standalone Mode Minimum Contract above) **or** any `--target={ci|issue|logs|test|types|ui}` branch — adds a `$changes-review` task tracking todo as the **final changes-review gate**, placed immediately before the contract's §5 `$why-review` terminal sign-off (test-update → spec-check → changes-review → why-review). A fix touching no production code (test-only, docs-only) skips it with that reason recorded. Inside a workflow, skip — the sequence handles `$changes-review`.

> **Review-loop severity floor (when `$fix` is the fix half of a review loop):** use the canonical `.claude/scripts/lib/review-policy.cjs` predicate and fix only validated findings that block the current round. Classify by consequence: **CRITICAL** = immediate material security/safety/authority/data-loss risk or a failed binary gate; **HIGH** = material supported-path correctness, contract, privacy, authority, compatibility, or likely-harm risk; **MEDIUM** = bounded but consequential edge/resilience/observability/testability/maintainability risk; **LOW** = evidenced non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact. Round 1 is strict (CRITICAL/HIGH/MEDIUM/LOW); from round 2 onward only CRITICAL/HIGH/MEDIUM reopen a fix or re-review round, while LOW-only findings are recorded as deferred and do **not** reopen the loop. `NOT VERIFIABLE` is unresolved evidence, not LOW, and failed binary gates always block. Never re-tier a finding to reach a pass. This bounds loop work only; a standalone user request to fix a LOW-severity issue remains valid and is not refused.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=logs` — log / stack-trace branch

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Key Rules:**

- Focus on log patterns: stack traces, error codes, timing anomalies.
- Cross-reference logs with source code to find the actual root cause.

**Workflow:**

1. Check whether `./logs.txt` exists. If missing, set up permanent log piping in the project's script config (`package.json`, `Makefile`, `pyproject.toml`, …): **Bash/Unix** append `2>&1 | tee logs.txt`; **PowerShell** append `*>&1 | Tee-Object logs.txt`. Run the command to generate logs.
2. Use the `debugger` subagent to analyze `./logs.txt`: read with `Grep` `head_limit: 30` (last 30 lines; increase if needed — avoid loading the whole file). Write analysis to `tmp/analysis/{issue-name}.analysis.md`; re-read before fixing.
3. Use the `$investigate` skill to locate the exact source of the issue; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → ask the user directly → wait for approval.**
6. Implement the fix.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 3.
10. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=test` — failing-test branch

**Goal:** Run test suites, analyze failures, and fix the underlying code or test issues.

**Active-goal read (BEFORE fixing):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the reported test failure). Map failing-test evidence (before) and passing-test evidence (after) to the saved success criteria in the Iteration Log — a passing suite that misses a saved required criterion does NOT close the loop.

**Key Rules:**

- Distinguish between code bugs and flawed test expectations.
- Re-run tests after the fix to confirm all pass.
- Read `integration-test-reference.md` from the reference-docs root before reviewing/writing integration tests; consult the business spec root for expected-behavior context when diagnosing failures (defaults `docs/project-reference` / `docs/specs/`; `docsRoots.projectReference.path` and `specRoots.business.path` in `docs/project-config.json` override them).

**Workflow:**

1. Use the `tester` subagent to compile the code and fix any syntax errors.
2. Use the `tester` subagent to run the tests; report back. Write failure analysis to `tmp/analysis/{test-issue}.analysis.md`; re-read before fixing.
3. If tests fail, use the `debugger` subagent to find the root cause; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → ask the user directly → wait for approval.**
6. Implement the plan step by step.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 2.
10. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ui` — UI / visual-defect branch

**Goal:** Diagnose and fix UI/UX issues — layout, styling, responsiveness, and visual bugs.

**Key Rules:**

- Follow the project's documented styling and class-naming convention; use BEM only when the project selects it. Treat styling classes as styling hooks, not semantic E2E locators.
- Check responsive states and sizes supported by the target platform; use breakpoints only where that platform supports them.
- **Pre-read (design authority):** read configured design-system docs and token files when present. Otherwise follow the project's frontend references, accepted ADRs, and observed source; do not invent a shared token system or canonical component classes.

**Required skills (when applicable):** `design` (local design-intelligence search + implementation patterns) → `web-design-guidelines` for web surfaces or the target platform's accessibility guidance for non-web UI (use project guidance when present, otherwise its native standard) → `ui-review` (source-level review when applicable).

**Workflow:**

**FIRST** — use the `design` skill's local search to understand context and common issues:

```bash
# Windows: py -3 · macOS/Linux: python3 (same arguments)
py -3 .claude/skills/design/scripts/search.py "<product-type>" --domain product
py -3 .claude/skills/design/scripts/search.py "<style-keywords>" --domain style
py -3 .claude/skills/design/scripts/search.py "accessibility" --domain ux
py -3 .claude/skills/design/scripts/search.py "z-index animation" --domain ux
```

If the user provides screenshots/videos, use the `visual analysis tooling` skill to describe the issue in detail so developers can predict the root causes.

> **🛑 After identifying the UI root cause, present findings + proposed fix → ask the user directly → wait for approval before any code change.**

1. Use the `ui-ux-designer` subagent to implement the fix against the configured design authority, or the brief and observed project conventions when no design system is configured.
2. Capture the affected view and state with platform-supported visual tooling when available, then analyze it with the appropriate visual-analysis skill. Repeat until addressed.
3. Use platform-appropriate automation or interaction checks to verify the fix against the design authority.
4. Use the `tester` subagent to compile and test; report back. Repeat until all tests pass.
5. **If the user approves:** run the `docs-manager` subagent to update `./docs`, and update plan progress inline in the main session.
6. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

## Workflow:

If screenshots or videos are provided, use `visual analysis tooling` to describe the issue so developers can predict root causes.

### Fulfill the request

**Question Everything:** Use ask the user directly for probing questions about the request, constraints, and true objective. Do not assume; clarify until 100% certain.

- Use ask the user directly to clarify any open questions.
- Ask 1 question at a time; wait for answer before next question.
- No questions → start next step.

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause + plan, present findings + plan by asking the user directly and get approval BEFORE code changes; no silent fixes.
> **End-to-Start Trace Gate:** For non-trivial bugs, failed verification, stale/incorrect outputs, or behavior-changing fixes, the root-cause plan MUST ATTENTION include `Debugger Trace: End -> Start`, feeder paths, hypothesis matrix, owning layer, and forward convergence proof. If missing, STOP and run `$debug-investigate` or `$investigate` before planning; the Root-Cause Prerequisite Gate re-checks trace content.

### Fix the issue

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the issue via `.claude/templates/goal-contract-template.md`. Saved success criteria define "fixed"; a local proof missing any required criterion is NOT complete. After proof, append root cause, evidence, and remaining gaps to the Iteration Log. Tiny fixes may skip deeper gates ONLY with a user-accepted reason in the goal file.

Use `debug-investigate` for complex problems, and the skills catalog to activate other needed skills.

1. Use `debugger` subagent to find the root cause and report to the main agent. **Skip when the Root-Cause Prerequisite Gate already ran `$debug-investigate` for this problem**; that report subsumes this step, so resume at planning. — why: repeating diagnosis double-runs the spine.
   1.5. Write results to `tmp/analysis/{issue-name}.analysis.md`; re-read the ENTIRE file before planning.
   1.6. Confirm it contains final symptom → reader → storage/projection → writer → consumer/job → producer/origin, all feeders, hypothesis matrix, owning layer, and forward proof.
2. Use `researcher` subagent to research root causes on the internet if needed; report back.
3. Use `planner` subagent to create the implementation plan from reports; report back.
4. **🛑 Present root cause + fix plan → ask the user directly → wait for user approval.**
5. Use `$plan-execute` SlashCommand to implement plan step by step.
6. Final Report:

- Report changes, brief explanation, getting-started guidance, and next steps.
- Ask whether to commit and push; if yes, use `git-manager` subagent.

* **IMPORTANT:** Sacrifice grammar for concise reports; list unresolved questions at the end, if any.

**REMEMBER:**

- Generate visual assets with `visual analysis tooling`; read/analyze them against requirements. Use media processing for image edits (background removal, adjustment, cropping).

> **Spec-Loop completion gate (canonical: `SYNC:spec-loop-discipline`).** The fix is NOT done until the touched invariants close the loop: (1) every §4 [HARD] rule / §5 invariant the bug violated has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case — not just the single reproduction example (this is the property bar the §3 regression-TC must meet, not merely an example case); (2) the fixed core-logic line is **mutation-killed** — if a mutant survives on the changed line the killing test is missing, so the bug can silently return (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed BOTH the spec and the tests per the §3 spec-correctness decision AND a guarding test (Dual-Feedback) — a code-only patch with neither leaves the disease undocumented. Re-verify spec + tests + code together before declaring the fix complete.

---

## Next Steps (Standalone: after the Minimum Contract completes. Skip if inside workflow.)

> **The Root-Cause Prerequisite Gate and the Standalone Mode Minimum Contract above are NOT optional and NOT a question** — standalone `$fix` has already auto-run `debug-investigate` (gate-enforced) → fix spine → mandatory `$integration-test` test update (or justified `$test` unit-test fallback) → conditional `$spec` check → (`$changes-review` for production code) → `$why-review` as the terminal sign-off. Do not re-ask the user whether to do those; they are the guaranteed floor.
>
> **AFTER that floor is met,** MUST ATTENTION use ask the user directly to offer what lies BEYOND the minimum (user decides):

- **"Proceed with full workflow (Recommended)"** — Hand off to the best-fit workflow (e.g. `workflow-bugfix`) from here to add the remaining gates the minimum spine omits — `plan-validate`, `integration-test-review`, `integration-test-verify`, `production-readiness-review`, `security-review`, `docs-update`.
- **"$test"** — Run the full test suite to verify the fix in context.
- **"Commit & push"** — Hand the proven, reviewed change to the `git-manager` subagent.
- **"Stop here"** — Minimum contract satisfied; user takes it from here.

> If already inside a workflow, skip both the contract and this menu — the workflow sequence handles diagnosis, spec sync, review, and next steps.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `root-cause-debugging` — Systematic root-cause debugging, never guess-and-check; debugging a failure → .claude/skills/shared/protocols/root-cause-debugging.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), and add or update regression coverage that proves the fix converges.

**IMPORTANT MUST ATTENTION — Main steps:** route `--target=` first → pass the Root-Cause Prerequisite Gate → investigate with researcher subagents → diagnose end-to-start with `debug-investigate` → declare confidence/evidence → plan impact → pass Validate-Before-Fix approval → implement at the owning layer → update regression tests → decide spec correctness/sync → run `$changes-review` for production code → finish with `$why-review`; standalone calls keep the full spine, while parent workflows own their declared sequence.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** start at observed final output, trace backward through every feeder path before fixing.
- **Root Cause Debugging:** reproduce → isolate → trace → hypothesize → verify → fix the cause, never symptoms.
- **Nested Task Creation:** parent workflow rows don't replace child phase tracking; expand and link phases.
- **Project Reference Docs Guide:** read required project-reference docs (`lessons.md` always) before target work.
- **Task Tracking & External Report:** bootstrap task tracking; persist plan/review findings to `tmp/reports/` incrementally.
- **Critical Thinking:** apply critical + sequential thinking; traced proof per claim, confidence >80% to act.
- **Understand Code First:** search 3+ patterns and read code before any modification.
- **Evidence-Based Reasoning:** cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Fix-Layer Accountability:** trace full data flow, fix at the owning layer, not the crash site.
- **Source/Test Drift Check:** when source behavior changes, decide from evidence whether affected tests change.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** Root-Cause Prerequisite Gate (BLOCKING, FIRST) — a direct `$fix` call (no-flag spine AND every `--target=` branch) MUST NOT edit code until `$debug-investigate` traced THIS problem in THIS session, proven by a the current task list row or a written investigation report; recall is NOT evidence, a prior investigation of a DIFFERENT symptom does NOT count, and a parent workflow row alone is NOT proof its diagnosis step ran — not satisfied → run `$debug-investigate` first, then resume from the planning step — why: without it the first edit lands with zero traced cause and patches the symptom site
**IMPORTANT MUST ATTENTION** trace the symptom end-to-start to the invariant-owning layer and fix there — NEVER at the crash site — why: the crash site is a symptom; the bad state enters at a lower layer and one fix there protects all downstream consumers
**IMPORTANT MUST ATTENTION** declare `Confidence: X%` + `file:line` proof for EVERY claim — 95%+ recommend, 80-94% caveats, 60-79% list unknowns, STOP if <60% — why: speculation patches the wrong layer and ships the disease
**IMPORTANT MUST ATTENTION** 🛑 Validate-Before-Fix — present root cause + plan by asking the user directly and get approval BEFORE any code change (skip ONLY inside a workflow) — why: silent fixes bypass the human gate on irreversible code change
**IMPORTANT MUST ATTENTION** route on `--target=` FIRST — each `{ci|issue|logs|test|types|ui}` branch is self-contained (own diagnosis); no flag = full diagnose→fix spine — why: branches must not re-run §1/§2 of the standalone spine
**IMPORTANT MUST ATTENTION** default mode HARD (full rigor) — opt out to fast mode ONLY when the bug is genuinely trivial (ALL 5 Default Mode Policy conditions met); when in doubt default hard — why: skipping diagnosis on a non-trivial bug fixes the symptom and leaves the disease
**IMPORTANT MUST ATTENTION** standalone (no parent workflow) self-assembles the spine `debug-investigate → fix → $integration-test test-update (or justified $test unit-test fallback) → $spec correctness check → $changes-review (production code) → $why-review`; invoke `$integration-test` after every standalone fix to add or update regression coverage, and use `$test` only for an evidence-backed unit-test seam — inside a workflow SKIP the contract — but NEVER the Root-Cause Prerequisite Gate, which still demands proof the sequence's `debug-investigate` step ran for this problem — why: standalone has no sequence supplying diagnosis, test updates, spec sync, or review; and a container row is not proof its diagnosis step ran
**IMPORTANT MUST ATTENTION** spec-loop completion — the fix is NOT done until the violated §4/§5 invariant has a universally-quantified property TC + boundary case, the changed line is mutation-killed, and the finding fed BOTH spec and tests (Dual-Feedback) — why: a code-only patch leaves the bug case undocumented and able to silently return
**IMPORTANT MUST ATTENTION** break work into small task tracking todos BEFORE starting (one read = one task); call the current task list first on context loss to resume, never duplicate — why: long debug files exhaust context and silently lose findings
**IMPORTANT MUST ATTENTION** read required project-reference docs (`lessons.md` always; `integration-test-reference.md` for test branch; the business spec root, default `docs/specs/` and overridable via `specRoots.business.path` in `docs/project-config.json`, for behavior) before target work — why: project conventions override generic debugging assumptions
**IMPORTANT MUST ATTENTION** on a FAILED TEST (`--target=test` or any test failure), FIRST read the `$integration-test-review` skill protocol (assertion-quality, coverage & spec↔test↔code fault gates) to set fix direction — decide whether the fault is a source-code root cause or a test-code setup/assertion issue — why: fixing without that verdict patches the wrong side and can green a broken invariant.
**IMPORTANT MUST ATTENTION** search 3+ similar patterns and read existing code before any fix; evaluate fit before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** add a final review todo to verify work quality, then extract root-cause lessons (`$learn`) if the failure mode would recur without the reminder

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Root cause is obvious, just patch it"   | Trace end-to-start to the invariant owner with `file:line` first — the obvious site is the symptom. |
| "I already investigated this"            | Show the the current task list row or investigation report for THIS symptom. Recall is not evidence — after compaction the belief survives, the findings do not. |
| "A workflow is running, it handled diagnosis" | A parent row is a container, not proof. Cite the *completed* `debug-investigate` step for this problem or the gate fires. |
| "`--target=` scopes it, so no trace needed"   | Every branch passes through the Root-Cause Prerequisite Gate. A `debugger`/`tester` subagent step is not an end-to-start trace. |
| "Fix it where it crashes"                | Crash site ≠ cause site. Fix at the project-identified owner of the invariant and protect all relevant consumers. |
| "Add a `?.` / guard and move on"         | Scattered defensive checks = wrong layer. One authoritative fix beats many guards.               |
| "Confident enough, skip evidence"        | No `file:line` + Confidence % = no claim. STOP and gather evidence if <60%.                       |
| "Small fix, skip the approval gate"      | 🛑 Validate-Before-Fix is non-negotiable standalone — present root cause + plan, get approval.    |
| "Tests pass, the fix is done"            | Not done until property TC + boundary case exist, the changed line is mutation-killed, and spec ↔ tests fed (Dual-Feedback). |
| "Already searched the codebase"          | Show `file:line` evidence. No proof = no search.                                                 |

**IMPORTANT MUST ATTENTION** NEVER edit code until `$debug-investigate` traced THIS problem in THIS session — evidence (task row / report), not recall.
**IMPORTANT MUST ATTENTION** NEVER fix at the crash site — trace end-to-start to the invariant owner and fix there.
**IMPORTANT MUST ATTENTION** declare `Confidence: X%` + `file:line` for every claim; STOP if <60%.
**IMPORTANT MUST ATTENTION** 🛑 Validate-Before-Fix approval before any code change — never skip it.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via task tracking.

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
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
