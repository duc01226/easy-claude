---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Use when implementing a well-defined feature, adding a component, or building a capability — including TDD and spec-driven test-first work — when no canonical spec has the requested behavior yet (update the spec first). Spec-complete work goes to workflow-implement-spec.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`/spec [mode=tests]`) are written and reviewed BEFORE implementation (`/plan-execute`), covering former TDD/test-first use cases.

**Summary:**

- Apply the shared `isLargeIdea` rule before the first mutating `/spec`; when true, carry the five-field `large_idea_decomposition` block through the owning spec/PBI and downstream presentation/mock-up artifacts. Do not create a roadmap artifact by default.
- For a genuinely isolated brownfield change, carry the shared contract's EXEMPT reason/owner and retain spec, scenario, test, review, and human-confirmation gates.
- Follow the investigation → spec → scenario → plan → review → implementation → verification sequence; never let implementation outrun product readiness.

 - **Main steps:** investigate → spec/clarify → scenario → plan/review/validate → pre-implementation test specs → implement → integration/spec sync → review → optional near-end `workflow-e2e` on explicit request → security/test/docs/demo handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require test specs/tests to name `Business Intent / Invariant Guarded` and fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- MUST ATTENTION preserve expected, unchanged, and no-regression behavior in the plan and review evidence when behavior can change.
- MUST ATTENTION treat code-extracted specs and TCs as reference-only until canonical review accepts them.
- MUST ATTENTION apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before the first mutating `/spec`. A true signal requires `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; all-false work omits them. Run `/scenario` after spec clarification only when slice risks require it. An explicitly supplied roadmap is read-only context; the standalone writer is explicit-only.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                 |
| ------------------------------------ | ------------ | ------------------------------------------------ |
| `/plan`                              | 1st (pos 8) | PLAN₁: Feature Spec-backed implementation plan   |
| `/plan`                              | 2nd (pos 13) | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `/plan-review`                       | 1st (pos 9) | Review PLAN₁                                     |
| `/plan-review`                       | 2nd (pos 14) | Review PLAN₂                                     |
| `/spec [mode=tests]`                 | 1st (pos 11) | TDD-SPEC₁: Pre-implementation test specs         |
| `/spec [mode=tests]`                 | 2nd (pos 18) | TDD-SPEC₂: Post-implementation test spec update  |
| `/artifact-review --type=spec-tests` | 1st (pos 12) | Review TDD-SPEC₁                                 |
| `/artifact-review --type=spec-tests` | 2nd (pos 19) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                             | Role     | Runs when                                                       |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| `/spec-discovery`                | optional | specs or related code already exist for the affected area       |
| `/domain-analysis`               | optional | the feature creates or changes domain entities                  |
| `/why-review`                    | optional | the investigation or spec draft holds a real design choice      |
| `/spec-clarify`                  | optional | the authored spec leaves open or non-obvious decisions          |
| `/scenario`                      | optional | replay, state, ownership or recovery risks need analysis        |
| `/seed-test-data`                | optional | new entities or flows need development data                     |
| `/workflow-review-changes`       | gate     | always                                                          |
| `/workflow-e2e --source=context` | optional | the user explicitly asks for E2E work                           |
| `/test`                          | gate     | always                                                          |
| `/demo-guide`                    | optional | the change has user-facing behavior                             |
| `/workflow-end`                  | gate     | always                                                          |

Outcome gates: tests pass · review converged · spec synced (when behavior or a public contract changed) · run closed.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `/investigate`):

- If an image or wireframe is provided → route to `/design-spec --mode=wireframe` before `/plan`; if only a design link (e.g. a Figma URL) is provided, ask the user to export the frames as images first
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step that runs = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. A step that does not run follows the step contract above.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **Existing-behavior trace gate:** If the feature modifies an existing final output, persisted state, API response, projection, or user-visible workflow, include an end-to-start trace of the existing path (final reader -> storage/projection -> writer -> producer/origin), feeder paths, invariants to preserve, and forward proof for the intended new behavior before implementation.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the feature request). Before `/plan-execute`, verify the plan's feature success criteria map to the saved criteria. Pass the same goal file reference to every child step — child skills read the SAME saved goal, never a re-derived one from chat memory. Before `/workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

> **Large-Idea preflight:** Before the first mutating `/spec` for a new, broad, ambiguous, release-scoped, or multi-capability outcome, evaluate the shared four-operand rule and require the complete embedded decomposition block in the owning artifacts. After spec clarification and before `/plan`, run `/scenario` conditionally for replay/state/ownership/recovery risks. A `BLOCKED` Plan Gate stops `/plan-execute`; no default roadmap file is created.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-discovery -> /domain-analysis -> /why-review -> /spec -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /demo-guide -> /workflow-end -> /watzup

> **[EXPERIENCE ACCEPTANCE HANDOFF]** `/workflow-review-changes` carries the conditional `/experience-review` gate after code/rationale convergence. It exercises and inspects configured or likely observable surfaces, records `NOT-APPLICABLE` or `ENVIRONMENT-BLOCKED` honestly, and never promotes a new expectation without explicit acceptance.

> **[OPTIONAL E2E HANDOFF]** The sequence includes `/workflow-e2e --source=context` immediately after `/workflow-review-changes`. Run this occurrence only when the user explicitly requests E2E work, including wording such as “include E2E,” “write E2E,” “call E2E,” “run E2E,” or “do end-to-end verification.” Otherwise skip it with the manifest applicability reason; the step is disabled by default. When run, its nested workflow uses the default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the applicable capability.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-discovery -> /domain-analysis -> /why-review -> /spec -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /demo-guide -> /workflow-end -> /watzup

> **Single-pass steps are self-loop-backed (convergence lives in the skill, not the sequence):** both `/artifact-review --type=spec-tests` occurrences appear once each in the flat sequence with no repeat wired — intentionally. (`/domain-entities-review` is not a parent step here; it runs inside the nested `/workflow-review-changes` occurrence.) Each carries the full `SYNC:double-round-trip-review` self-loop (review → validate findings → fix validated findings → full re-review until the current exit bar is clear; round-2 LOW-only findings are deferred), so a single sequence occurrence still converges without spinning on polish. The workflow relies on that per-skill loop; it does NOT re-list the step to force convergence. (Contrast the seven specialists in `/workflow-review-changes` steps 3–9, whose scoped-re-run note lives in that skill.)

> **Severity-floor clarification:** the shared loop fixes only findings that block the current round. Round 1 fixes all validated findings; from round 2 onward, CRITICAL/HIGH/MEDIUM findings remain blocking, while LOW-only findings are recorded as deferred and never open another fix/re-review round.

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its `Skill` tool; every other deviation follows the step contract above. NEVER batch-complete validation gates.

Activate the `workflow-feature` workflow. Run `/start-workflow workflow-feature` with the user's prompt as context.

> **Spec check (before investigation):** If the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: list that resolved root to discover available app buckets or flat system folders; then probe its `{app-bucket}/` or `{system-name}/` subdirectory to find the specific service spec.

**Steps:** /investigate → /spec-discovery → /domain-analysis → /why-review → /spec → /spec-clarify → /scenario → /plan → /plan-review → /plan-validate → /spec [mode=tests] → /artifact-review --type=spec-tests → /plan → /plan-review → /plan-execute → /seed-test-data → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-verify → /workflow-review-changes → /workflow-e2e --source=context → /test → /demo-guide → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `/workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.
>
> **[PERFORMANCE-SDD ROUTE]** If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run `/performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Run `/plan-execute` even on the performance route — never skip it. If behavior can change, run `/test` and any relevant functional no-regression checks. Update docs/specs for changed SLA, performance constraints, or behavior boundaries. Use project-specific performance docs from `docs/project-config.json` / `docs/project-reference/` when available.

> **[AI-SDD CLOSURE]** Before `/workflow-end`, confirm changed behavior, unchanged behavior, TCs/tests, docs and specs, and generated mirror sync are either completed or explicitly skipped with evidence.
>
> **[AI-SDD CLOSURE — POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY)]** The `/spec` authored at step 6 (before `/plan`) captured _intended_ behavior. After `/plan-execute`, re-verify Feature Spec **§1-7** (not only §8 TCs) against what was _actually built_ and adjudicate every divergence per `shared/sdd-artifact-contract.md` → Drift Gates (`SYNC:spec-drift-adjudication`): **CODE-WRONG** → fix code/test against the spec; **SPEC-STALE** → run `/spec [update]` to record the new intended behavior, then `/spec [mode=tests] [update]` + `/spec [mode=sync]`; **AMBIGUOUS** → escalate to the spec owner. A feature that shipped behavior the spec does not describe leaves the spec stale and is NOT closure-ready. This re-verify is not optional cleanup — it is the "after implement, verify and create/update specs again" half of the SDD cycle.

> **UI-intent maintenance (conditional)** — runs alongside the `/spec [mode=sync]` step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When user-facing behavior is present, run `/spec` (ui-intent intent) to refresh the affected Feature Spec **§6** interaction surface — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path the feature touched — and link the governing `/design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to what was actually built. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`/spec [mode=tests]`) are written and reviewed BEFORE implementation (`/plan-execute`), covering former TDD/test-first use cases.
**IMPORTANT MUST ATTENTION Main steps:** investigate → spec/clarify → scenario → plan/review/validate → pre-implementation test specs → implement → integration/spec sync → review → optional near-end `workflow-e2e` on explicit request → security/test/docs/demo handoff; large ideas carry embedded decomposition and ordinary runs never create a roadmap file.
**IMPORTANT MUST ATTENTION Workflow:** Execute `/investigate` → `/spec-discovery` → `/domain-analysis` → `/why-review` → `/spec` → `/spec-clarify` → `/scenario` → `/plan` → `/plan-review` → `/plan-validate` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/plan` → `/plan-review` → `/plan-execute` → `/seed-test-data` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/spec [mode=sync]` → `/integration-test` → `/integration-test-verify` → `/workflow-review-changes` (which owns `/domain-entities-review`, `/integration-test-review`, `/security-review`, the conditional `/scan --target=domain-entities` → `/docs-update` refresh, and `/experience-review`) → optional `/workflow-e2e --source=context` → `/test` → `/demo-guide` → `/workflow-end` → `/watzup`; preserve large-idea decomposition, Goal Contract, spec-drift, UI-intent, performance, and explicit conditional-skip gates.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End To Start Debugger Trace:** trace observed output backward; matrix hypotheses before fixing.
- **Nested Task Creation:** expand child phases; link parent when nested.
- **Critical Thinking:** trace every claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** append findings to report file; never hold in memory.
- **Subagent Return Contract:** sub-agents return summary only; NEVER inline full output; report on disk.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
