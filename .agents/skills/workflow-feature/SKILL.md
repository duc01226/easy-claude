---
name: workflow-feature
description: '[Workflow] Use when implementing a well-defined feature, adding a component, or building a capability — including TDD and spec-driven test-first work — when no canonical spec has the requested behavior yet (update the spec first). Spec-complete work goes to workflow-implement-spec.'
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

## Quick Summary

**Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`$spec [mode=tests]`) are written and reviewed BEFORE implementation (`$plan-execute`), covering former TDD/test-first use cases.

**Summary:**

- Apply the shared `isLargeIdea` rule before the first mutating `$spec`; when true, carry the five-field `large_idea_decomposition` block through the owning spec/PBI and downstream presentation/mock-up artifacts. Do not create a roadmap artifact by default.
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
- MUST ATTENTION apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before the first mutating `$spec`. A true signal requires `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; all-false work omits them. Run `$scenario` after spec clarification only when slice risks require it. An explicitly supplied roadmap is read-only context; the standalone writer is explicit-only.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                 |
| ------------------------------------ | ------------ | ------------------------------------------------ |
| `$plan`                              | 1st (pos 8) | PLAN₁: Feature Spec-backed implementation plan   |
| `$plan`                              | 2nd (pos 13) | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `$plan-review`                       | 1st (pos 9) | Review PLAN₁                                     |
| `$plan-review`                       | 2nd (pos 14) | Review PLAN₂                                     |
| `$spec [mode=tests]`                 | 1st (pos 11) | TDD-SPEC₁: Pre-implementation test specs         |
| `$spec [mode=tests]`                 | 2nd (pos 18) | TDD-SPEC₂: Post-implementation test spec update  |
| `$artifact-review --type=spec-tests` | 1st (pos 12) | Review TDD-SPEC₁                                 |
| `$artifact-review --type=spec-tests` | 2nd (pos 19) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Gates and Optional Steps

**Step contract:** `$start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                             | Role     | Runs when                                                       |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| `$spec-discovery`                | optional | specs or related code already exist for the affected area       |
| `$domain-analysis`               | optional | the feature creates or changes domain entities                  |
| `$why-review`                    | optional | the investigation or spec draft holds a real design choice      |
| `$spec-clarify`                  | optional | the authored spec leaves open or non-obvious decisions          |
| `$scenario`                      | optional | replay, state, ownership or recovery risks need analysis        |
| `$seed-test-data`                | optional | new entities or flows need development data                     |
| `$workflow-review-changes`       | gate     | always                                                          |
| `$workflow-e2e --source=context` | optional | the user explicitly asks for E2E work                           |
| `$test`                          | gate     | always                                                          |
| `$demo-guide`                    | optional | the change has user-facing behavior                             |
| `$workflow-end`                  | gate     | always                                                          |

Outcome gates: tests pass · review converged · spec synced (when behavior or a public contract changed) · run closed.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `$investigate`):

- If an image or wireframe is provided → route to `$design-spec --mode=wireframe` before `$plan`; if only a design link (e.g. a Figma URL) is provided, ask the user to export the frames as images first
- If `$plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step that runs = `TaskUpdate in_progress` → skill invocation → complete skill → `TaskUpdate completed`. A step that does not run follows the step contract above.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **Existing-behavior trace gate:** If the feature modifies an existing final output, persisted state, API response, projection, or user-visible workflow, include an end-to-start trace of the existing path (final reader -> storage/projection -> writer -> producer/origin), feeder paths, invariants to preserve, and forward proof for the intended new behavior before implementation.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the feature request). Before `$plan-execute`, verify the plan's feature success criteria map to the saved criteria. Pass the same goal file reference to every child step — child skills read the SAME saved goal, never a re-derived one from chat memory. Before `$workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

> **Large-Idea preflight:** Before the first mutating `$spec` for a new, broad, ambiguous, release-scoped, or multi-capability outcome, evaluate the shared four-operand rule and require the complete embedded decomposition block in the owning artifacts. After spec clarification and before `$plan`, run `$scenario` conditionally for replay/state/ownership/recovery risks. A `BLOCKED` Plan Gate stops `$plan-execute`; no default roadmap file is created.

**IMPORTANT MANDATORY Steps:** $investigate -> $spec-discovery -> $domain-analysis -> $why-review -> $spec -> $spec-clarify -> $scenario -> $plan -> $plan-review -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec [mode=sync] -> $integration-test -> $integration-test-verify -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $demo-guide -> $workflow-end -> $watzup

> **[EXPERIENCE ACCEPTANCE HANDOFF]** `$workflow-review-changes` carries the conditional `$experience-review` gate after code/rationale convergence. It exercises and inspects configured or likely observable surfaces, records `NOT-APPLICABLE` or `ENVIRONMENT-BLOCKED` honestly, and never promotes a new expectation without explicit acceptance.

> **[OPTIONAL E2E HANDOFF]** The sequence includes `$workflow-e2e --source=context` immediately after `$workflow-review-changes`. Run this occurrence only when the user explicitly requests E2E work, including wording such as “include E2E,” “write E2E,” “call E2E,” “run E2E,” or “do end-to-end verification.” Otherwise skip it with the manifest applicability reason; the step is disabled by default. When run, its nested workflow uses the default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the applicable capability.

---

**IMPORTANT MANDATORY Steps:** $investigate -> $spec-discovery -> $domain-analysis -> $why-review -> $spec -> $spec-clarify -> $scenario -> $plan -> $plan-review -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec [mode=sync] -> $integration-test -> $integration-test-verify -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $demo-guide -> $workflow-end -> $watzup

> **Single-pass steps are self-loop-backed (convergence lives in the skill, not the sequence):** both `$artifact-review --type=spec-tests` occurrences appear once each in the flat sequence with no repeat wired — intentionally. (`$domain-entities-review` is not a parent step here; it runs inside the nested `$workflow-review-changes` occurrence.) Each carries the full `SYNC:double-round-trip-review` self-loop (review → validate findings → fix validated findings → full re-review until the current exit bar is clear; round-2 LOW-only findings are deferred), so a single sequence occurrence still converges without spinning on polish. The workflow relies on that per-skill loop; it does NOT re-list the step to force convergence. (Contrast the seven specialists in `$workflow-review-changes` steps 3–9, whose scoped-re-run note lives in that skill.)

> **Severity-floor clarification:** the shared loop fixes only findings that block the current round. Round 1 fixes all validated findings; from round 2 onward, CRITICAL/HIGH/MEDIUM findings remain blocking, while LOW-only findings are recorded as deferred and never open another fix/re-review round.

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its skill invocation; every other deviation follows the step contract above. NEVER batch-complete validation gates.

Activate the `workflow-feature` workflow. Run `$start-workflow workflow-feature` with the user's prompt as context.

> **Spec check (before investigation):** If the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: list that resolved root to discover available app buckets or flat system folders; then probe its `{app-bucket}/` or `{system-name}/` subdirectory to find the specific service spec.

**Steps:** $investigate → $spec-discovery → $domain-analysis → $why-review → $spec → $spec-clarify → $scenario → $plan → $plan-review → $plan-validate → $spec [mode=tests] → $artifact-review --type=spec-tests → $plan → $plan-review → $plan-execute → $seed-test-data → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec [mode=sync] → $integration-test → $integration-test-verify → $workflow-review-changes → $workflow-e2e --source=context → $test → $demo-guide → $workflow-end → $watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `$workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.
>
> **[PERFORMANCE-SDD ROUTE]** If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run `$performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Run `$plan-execute` even on the performance route — never skip it. If behavior can change, run `$test` and any relevant functional no-regression checks. Update docs/specs for changed SLA, performance constraints, or behavior boundaries. Use project-specific performance docs from `docs/project-config.json` / `docs/project-reference/` when available.

> **[AI-SDD CLOSURE]** Before `$workflow-end`, confirm changed behavior, unchanged behavior, TCs/tests, docs and specs, and generated mirror sync are either completed or explicitly skipped with evidence.
>
> **[AI-SDD CLOSURE — POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY)]** The `$spec` authored at step 6 (before `$plan`) captured _intended_ behavior. After `$plan-execute`, re-verify Feature Spec **§1-7** (not only §8 TCs) against what was _actually built_ and adjudicate every divergence per `shared/sdd-artifact-contract.md` → Drift Gates (`SYNC:spec-drift-adjudication`): **CODE-WRONG** → fix code/test against the spec; **SPEC-STALE** → run `$spec [update]` to record the new intended behavior, then `$spec [mode=tests] [update]` + `$spec [mode=sync]`; **AMBIGUOUS** → escalate to the spec owner. A feature that shipped behavior the spec does not describe leaves the spec stale and is NOT closure-ready. This re-verify is not optional cleanup — it is the "after implement, verify and create/update specs again" half of the SDD cycle.

> **UI-intent maintenance (conditional)** — runs alongside the `$spec [mode=sync]` step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When user-facing behavior is present, run `$spec` (ui-intent intent) to refresh the affected Feature Spec **§6** interaction surface — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path the feature touched — and link the governing `$design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to what was actually built. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

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

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`$spec [mode=tests]`) are written and reviewed BEFORE implementation (`$plan-execute`), covering former TDD/test-first use cases.
**IMPORTANT MUST ATTENTION Main steps:** investigate → spec/clarify → scenario → plan/review/validate → pre-implementation test specs → implement → integration/spec sync → review → optional near-end `workflow-e2e` on explicit request → security/test/docs/demo handoff; large ideas carry embedded decomposition and ordinary runs never create a roadmap file.
**IMPORTANT MUST ATTENTION Workflow:** Execute `$investigate` → `$spec-discovery` → `$domain-analysis` → `$why-review` → `$spec` → `$spec-clarify` → `$scenario` → `$plan` → `$plan-review` → `$plan-validate` → `$spec [mode=tests]` → `$artifact-review --type=spec-tests` → `$plan` → `$plan-review` → `$plan-execute` → `$seed-test-data` → `$spec [mode=tests]` → `$artifact-review --type=spec-tests` → `$spec [mode=sync]` → `$integration-test` → `$integration-test-verify` → `$workflow-review-changes` (which owns `$domain-entities-review`, `$integration-test-review`, `$security-review`, the conditional `$scan --target=domain-entities` → `$docs-update` refresh, and `$experience-review`) → optional `$workflow-e2e --source=context` → `$test` → `$demo-guide` → `$workflow-end` → `$watzup`; preserve large-idea decomposition, Goal Contract, spec-drift, UI-intent, performance, and explicit conditional-skip gates.

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
