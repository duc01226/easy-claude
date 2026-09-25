---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Use when fixing a bug, error, or crash — root-cause investigation, fix, verification.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.

**Summary:** Execute the complete bug-fix sequence `/debug-investigate` → `/spec [mode=amend]` → `/plan` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → RED `/integration-test` → `/fix` → GREEN `/integration-test` → `/integration-test-verify` → `/spec [mode=sync]` → `/workflow-review-changes` (which owns `/integration-test-review`, the conditional `/scan --target=domain-entities` → `/docs-update` refresh, and `/experience-review`) → optional `/workflow-e2e --source=context` → `/demo-guide` → `/workflow-end` → `/watzup`, with spec-drift adjudication, end-to-start tracing, Goal Contract evidence, and explicit conditional skip reasons; E2E runs only on an explicit user request.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require regression tests to name `Business Intent / Invariant Guarded` and fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- MUST ATTENTION record current behavior, expected behavior, and unchanged behavior that must be preserved before fixing.
- MUST ATTENTION treat code-extracted specs and TCs as reference-only until canonical review accepts them.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                          |
| ------------------- | ---------- | --------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — RED phase: write regression test, expect FAIL |
| `/integration-test` | 2nd        | INT-TEST₂ — GREEN phase: re-run after fix, expect PASS    |

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                             | Role     | Runs when                                  |
| -------------------------------- | -------- | ------------------------------------------ |
| `/debug-investigate`             | gate     | always                                     |
| `/integration-test-verify`       | gate     | always                                     |
| `/workflow-review-changes`       | gate     | always                                     |
| `/workflow-e2e --source=context` | optional | the user explicitly asks for E2E work      |
| `/demo-guide`                    | optional | the fix changes user-facing behavior       |
| `/workflow-end`                  | gate     | always                                     |

Outcome gates: root cause traced · tests pass · spec synced (when behavior or a public contract changed, or the spec lacked the case the bug exposed) · review converged · run closed.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MANDATORY Steps:** /debug-investigate -> /spec [mode=amend] -> /plan -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /fix -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /demo-guide -> /workflow-end -> /watzup

> **[EXPERIENCE ACCEPTANCE HANDOFF]** `/workflow-review-changes` carries the conditional `/experience-review` gate after the fix and final rationale review. A changed observable result is exercised and inspected before expectation changes; a missing capability is `ENVIRONMENT-BLOCKED`, not a green regression result.

> **[OPTIONAL E2E HANDOFF]** The sequence includes `/workflow-e2e --source=context` immediately after `/workflow-review-changes`. Run this occurrence only when the user explicitly requests E2E work, including wording such as “include E2E,” “write E2E,” “call E2E,” “run E2E,” or “do end-to-end verification.” Otherwise skip it with the manifest applicability reason; the step is disabled by default. When run, its nested workflow uses the default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the applicable capability.

---

**IMPORTANT MANDATORY Steps:** /debug-investigate -> /spec [mode=amend] -> /plan -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /fix -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /demo-guide -> /workflow-end -> /watzup

> **Single-pass steps are self-loop-backed (convergence lives in the skill, not the sequence):** the `/artifact-review --type=spec-tests` step appears once in the flat sequence with no repeat wired — intentionally. It carries the full `SYNC:double-round-trip-review` self-loop (review → validate findings → fix validated findings → full re-review until the current exit bar is clear; round-2 LOW-only findings are deferred), so a single occurrence still converges without spinning on polish; the workflow relies on that per-skill loop rather than re-listing the step. Code-change convergence is delegated to `/workflow-review-changes` (whose specialist scoped-re-run note lives in that skill).

> **Severity-floor clarification:** the shared loop fixes only findings that block the current round. Round 1 fixes all validated findings; from round 2 onward, CRITICAL/HIGH/MEDIUM findings remain blocking, while LOW-only findings are recorded as deferred and never open another fix/re-review round.

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its `Skill` tool; every other deviation follows the step contract above. NEVER batch-complete validation gates.

> **[CRITICAL] Plan Before Fix Gate:** The `/plan` step is MANDATORY before `/fix`. You MUST ATTENTION create a todo task for it AND complete it before proceeding to fix. Never skip planning — fixes without a plan lead to incomplete root cause analysis and regressions. This workflow runs NO `/plan-review` and NO `/plan-validate`, so `/plan` itself carries the whole planning evidence bar: root-cause trace from `/debug-investigate`, owning fix layer, blast radius, and rollback. Invoke `/plan-review` or `/plan-validate` ad hoc only on an explicit user request; they are not workflow steps.

Activate the `workflow-bugfix` workflow. Run `/start-workflow workflow-bugfix` with the user's prompt as context.

> **Spec check (before investigation):** If the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: list that resolved root to discover available app buckets or flat system folders; then probe its `{app-bucket}/` or `{system-name}/` subdirectory to find the specific service spec.

> **[BLOCKING] Code Bug vs Spec Bug Gate** (the bugfix-specialized instance of `SYNC:spec-drift-adjudication` / `shared/sdd-artifact-contract.md` → Drift Gates — same model, bugfix vocabulary): Before writing regression TCs, classify the issue:
>
> - **Code Bug** (= CODE-WRONG) — the canonical spec describes intended behavior, but code diverged. Write regression TCs for the intended behavior before fixing code.
> - **Spec Bug** (= SPEC-STALE) — the spec documents wrong behavior and code faithfully implements it. Update canonical spec/docs first via `/spec [mode=amend]`, then write TCs for the corrected behavior.
> - **Ambiguous** — ask the user or product owner which behavior is intended before writing TCs.
>
> Include a behavior preservation note: `current behavior -> expected behavior -> unchanged behavior to preserve -> regression TC/test evidence`. Never normalize the divergence to whichever side currently passes — reconcile to canonical intent.

> **[BLOCKING] End-to-start trace before fix plan:** Before `/plan`, `/spec [mode=tests]`, or `/fix`, the investigation must include observed final state, final reader/query/renderer/assertion, backward hops through storage/projection/writer/consumer/producer, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. Missing trace evidence blocks the fix path.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the bug report). Map root cause and regression-test evidence (RED fail + GREEN pass) to the saved success criteria — each criterion gets `file:line`/command/report evidence in the Iteration Log. Pass the same goal file reference to every child step. Before `/workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

**Steps:** /debug-investigate → /spec [mode=amend] → /plan → /spec [mode=tests] → /artifact-review --type=spec-tests → /integration-test → /fix → /integration-test → /integration-test-verify → /spec [mode=sync] → /workflow-review-changes → /workflow-e2e --source=context → /demo-guide → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `/workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.
>
> **[PERFORMANCE-SDD ROUTE]** If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run `/performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run the relevant functional checks when behavior can change. Update docs and specs for changed SLA, performance constraints, or behavior boundaries.

> **[TDD-FIRST BUG FIX]** The two `/integration-test` occurrences are intentional and serve distinct purposes:
>
> **First `/integration-test` (RED phase):** Write a regression test that REPRODUCES the bug. Run it — it MUST FAIL. If it passes, the test does not catch the bug. Proceed to fix only after the test fails — never start the fix while the test still passes.
> **Second `/integration-test` (GREEN phase):** Re-run integration tests after the fix — expect all to PASS. Confirms the fix works AND the regression guard is in place.
> **`/integration-test-review`:** Verify tests have real assertion value (not smoke/existence-only checks).

> **UI-intent maintenance (conditional)** — runs alongside the `/spec [mode=sync]` step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When the fix changes user-facing behavior, run `/spec` (ui-intent intent) to refresh the affected Feature Spec **§6** interaction surface — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path the bug touched — and link the governing `/design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to what was actually fixed. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.

**IMPORTANT MUST ATTENTION Workflow:** Execute `/debug-investigate` → `/spec [mode=amend]` → `/plan` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → RED `/integration-test` → `/fix` → GREEN `/integration-test` → `/integration-test-verify` → `/spec [mode=sync]` → `/workflow-review-changes` (which owns `/integration-test-review`, the conditional `/scan --target=domain-entities` → `/docs-update` refresh, and `/experience-review`) → optional `/workflow-e2e --source=context` → `/demo-guide` → `/workflow-end` → `/watzup`; preserve the spec-drift gate, end-to-start trace, Goal Contract matrix, conditional performance/UI/domain-entity gates, and evidence-backed task transitions.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — NEVER skip a listed protocol; ALWAYS honor each canonical body:**

- **End-To-Start Debugger Trace:** Trace observed end state backward; matrix + fix layer before fixing.
- **Nested Task Creation:** Expand child phases; link parent; one task in_progress.
- **Critical Thinking:** Traced proof per claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Append findings to report file; never hold in memory.
- **Subagent Return Contract:** Return summary only; full detail to disk report.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
