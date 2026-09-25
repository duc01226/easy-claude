---
name: workflow-big-feature
version: 1.1.0
description: '[Workflow] Use when implementing a large, ambiguous, or research-driven feature.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** [Workflow] Trigger Big Feature workflow — research-driven development for large, complex, or ambiguous features needing market research, business evaluation, domain analysis, tech stack research, and architecture design before implementation.

**Summary:**

- Apply the shared four-operand `isLargeIdea` rule before research and planning; large ideas carry the complete decomposition block in PBIs/specs and downstream presentation/mock-up artifacts. Run `/scenario` before the first plan when the slice/risk context requires it; do not create a roadmap artifact by default.
- At `/architecture-design` before PLAN₁, apply `SYNC:scale-ready-foundation`: inspect the existing project, distinguish safe adoption from conflicts and broad refactors, and emit the applicability/decision matrix for architecture, actors/authorization, dependencies/licenses, real infrastructure boundaries, supported execution modes, CI/operations, and UI when applicable.
- For brownfield gaps, preserve the bounded actor-facing outcome; use `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, or `BLOCKED` with evidence, owner, trigger, and smallest valuable next step. Do not silently turn a feature PBI into a broad refactor.
- Optional AI-agent-as-user advice: when the feature has an evidenced agent actor or machine-integration opportunity, apply `SYNC:ai-agent-as-user-access`; inspect existing setup and reuse, adapt, defer, record `NOT-APPLICABLE`, or block with evidence without silently expanding the feature.
- Every assertion-bearing test handled by this workflow MUST use the project's configured/native test style and clearly identify the protected behavior or technical contract plus its owned outcome. Use explicit `Given` → `When` → `Then` when selected by the project/spec or when it fits the existing test idiom; preserve established alternatives such as AAA or `describe`/`it`.
- Keep research, architecture, specs, PBIs, and implementation downstream of the product boundary; preserve explicit non-goals and human decisions.
- Every generated PBI in this workflow MUST pass the Releasable Outcome Gate: one independently releasable actor-facing outcome with a complete entry-to-result journey; technical/foundation/setup work is attached enabling work, never a standalone PBI. UI PBIs require the full page/view, navigation, component, state, and mock-app flow surface.
- Execute the canonical steps in order, with reviewed scaffolding before feature work and evidence-backed verification at the end.

 - **Main steps:** classify/decompose → research/evaluate → domain/architecture/scenario → plan/review → PBI/story/mock-up/spec gates → scaffold/review/reference refresh → implementation/integration verification → final review → required near-end `workflow-e2e` verification → security/test/docs/handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION classify the idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before research, specs, PBIs, or plans. When true, require `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; run `/scenario` conditionally for the embedded scope. An existing roadmap is read-only context and only an explicit roadmap request enters the standalone writer.
- MUST ATTENTION before PLAN₁ emit the `SYNC:scale-ready-foundation` matrix and carry its accepted decisions into `/architecture-design`, `/plan`, `/scaffold`, `/architecture-review-full`, and implementation; use the full gate for greenfield and the fit/defer branch for this existing-project workflow.
- MUST ATTENTION optionally evaluate AI agents as first-class non-human actors when evidence or an accepted future contract makes them relevant; apply `SYNC:ai-agent-as-user-access`, select only warranted API/CLI/MCP/WebMCP/event/SDK surfaces over one capability core, and record the status, owner, trigger, and smallest next step without scope laundering.
- MUST ATTENTION every assertion-bearing test follows the configured/native test style and makes the protected behavior/contract plus owned outcome clear; use GWT when selected by the project/spec or when it fits the established idiom. Preserve brownfield conventions and record broad format migration as an owned opportunity; safety-critical ambiguity is `BLOCKED`.
- MUST ATTENTION when a desired foundation requires broad refactoring, keep the releasable PBI's actor journey bounded and record a separately owned refactor/architecture opportunity with rationale, dependency order, trigger, owner, cost of delay, and smallest independently valuable next step; mark the current slice `BLOCKED` when the refactor is required for safety.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step           | Occurrence   | Task Description                                                                  |
| -------------- | ------------ | --------------------------------------------------------------------------------- |
| `/plan`        | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and scenario gate) |
| `/plan`        | 2nd (pos 27) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests) |
| `/plan-review` | 1st (pos 15) | Review PLAN₁ architecture                                                         |
| `/plan-review` | 2nd (pos 28) | Review PLAN₂ implementation                                                       |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                                | Role     | Runs when                                                          |
| ----------------------------------- | -------- | ------------------------------------------------------------------ |
| `/market-analysis`                  | optional | the market needs sizing (see Market Analysis Applicability below)  |
| `/spec-discovery`                   | optional | specs or related code already exist for the affected area          |
| `/scenario`                         | optional | replay, state, ownership or recovery risks need analysis           |
| `/scaffold`                         | optional | the codebase lacks the base abstractions this feature needs        |
| `/architecture-review-full`         | optional | `/scaffold` built new foundation code                              |
| `/scan --target=ui-system`          | optional | `/scaffold` built a UI or frontend foundation                      |
| `/scan --target=backend-patterns`   | optional | `/scaffold` built a new foundation                                 |
| `/scan --target=integration-tests`  | optional | `/scaffold` built a new foundation                                 |
| `/scan --target=project-structure`  | optional | `/scaffold` built a new foundation                                 |
| `/plan-validate`                    | gate     | always                                                             |
| `/workflow-review-changes`          | gate     | always                                                             |
| `/test`                             | gate     | always                                                             |
| `/workflow-end`                     | gate     | always                                                             |

Outcome gates: plan approved · spec synced (when behavior or a public contract changed) · tests pass · review converged · run closed.

## Market Analysis Applicability (pos 4, conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

For either outcome, record the applicability evidence. If skipped because the market is already sized, cite the existing analysis. `/business-evaluation` must mark every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `/web-research`, `/deep-research`, other selected research stages, or their required user confirmations.


## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `/why-review`)

Declared as the `architecture-gates` all-return barrier in `workflows.json`. Both gates read the same finished `/architecture-design` artifacts and neither consumes the other's output:

1. Launch `/architecture-scalability-review` FIRST as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths). It writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Immediately run the design-rationale `/why-review` INLINE in FULL mode over the architecture-design rationale — inline so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. Reconcile: a scalability risk or sub-80 grade touching a decision the why-review passed becomes a WARN carried into `/scenario` and PLAN₁; a why-review FAIL — or a user Trade-Off answer that changes an architecture decision — blocks `/scenario` until the decision is revised, then re-run both gates.

## Foundation Reference Doc Refresh (pos 31–34, conditional)

New foundations need project references BEFORE feature fan-out. After `/architecture-review-full` and before `/plan-validate` → `/plan-execute`:

1. **When `/scaffold` ran**, run `/scan --target=ui-system` → `/scan --target=backend-patterns` → `/scan --target=integration-tests` → `/scan --target=project-structure` INLINE in that order — each scan fans out its own sub-agents from the orchestrator, so a scan is never dispatched as a sub-agent (`stepMeta` marks them `inline`). The four scans write disjoint reference docs and consume the reviewed-and-fixed foundation, so they run sequentially, not as a parallel barrier.
2. **Refresh, not regenerate** — this is an existing codebase: each scan reads the existing doc in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) first and surgically adds what the foundation introduced (new base abstractions, golden-path examples, the isolated examples tree, a new module, UI foundation), creating a doc only when it does not exist yet and preserving unchanged sections and manual annotations.
3. **Skip rules** — skip `/scan --target=ui-system` (log the reason) when `/scaffold` created no UI/frontend foundation; the other three apply whenever `/scaffold` ran. When `/scaffold` was skipped (existing foundation reused), mark all four completed with a cited skip reason — the existing reference docs already describe that foundation.
4. If `/plan-validate` or a later pre-implementation fix changes the foundation, re-run every `/scan` whose reference doc covers the changed area before `/plan-execute`.

---

## Closing Rule

Every step that runs = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. A step that does not run follows the step contract above.

---

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /plan-validate -> /plan-execute -> /seed-test-data -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /plan-validate -> /plan-execute -> /seed-test-data -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its `Skill` tool; every other deviation follows the step contract above. NEVER batch-complete validation gates.

Activate the `workflow-big-feature` workflow. Run `/start-workflow workflow-big-feature` with the user's prompt as context.

> **Spec check (before investigation):** If the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: list that resolved root to discover available app buckets or flat system folders; then probe its `{app-bucket}/` or `{system-name}/` subdirectory to find the specific service spec.

**Steps:** /idea → /web-research → /deep-research → /market-analysis → /business-evaluation → /spec-discovery → /domain-analysis → /why-review → /tech-stack-research → /architecture-design → /architecture-scalability-review → /why-review → /scenario → /plan → /plan-review → /refine → /artifact-review --type=pbi → /story → /artifact-review --type=story → /pbi-challenge → /dor-gate → /pbi-mockup → /spec → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec-clarify → /plan → /plan-review → /scaffold → /architecture-review-full → /scan --target=ui-system → /scan --target=backend-patterns → /scan --target=integration-tests → /scan --target=project-structure → /plan-validate → /plan-execute → /seed-test-data → /integration-test → /integration-test-verify → /spec [mode=sync] → /workflow-review-changes → /workflow-e2e --source=context → /test → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `/workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `scale-ready-foundation` — Scale-ready foundation and brownfield fit; running greenfield init or a big feature → .claude/skills/shared/protocols/scale-ready-foundation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:scale-ready-foundation:reminder -->

**IMPORTANT MUST ATTENTION** `scale-ready-foundation`: classify lifecycle/scale/criticality from evidence; choose the smallest architecture that fits; preserve brownfield decisions; make only applicable modules, authorization, external boundaries, dependencies, execution modes, CI/operations, and UI contracts explicit. Verify each supported run/test mode; dual host/container or other modes are needed only when the project supports or requires them. Greenfield warranted omissions block handoff; brownfield gaps get an owner/trigger/next step or an evidence-backed `NOT-APPLICABLE`/`BLOCKED` disposition. Do not require Docker, a database, UI, or distributed services where the project has no such capability.

<!-- /SYNC:scale-ready-foundation:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete the reviewed large-feature workflow with a bounded, independently releasable actor-facing outcome, embedded decomposition when triggered, scenario evidence, reviewed foundation, full-flow UI proof when applicable, implementation proof, and synchronized handoff; ordinary runs never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides).
**IMPORTANT MUST ATTENTION Main steps:** classify/decompose → research → domain/architecture/scenario → plan/review → PBI/story/mock-up/spec gates → scaffold/review/reference refresh → implementation/integration verification → final review → required near-end `workflow-e2e` verification → security/test/docs/handoff.

> **[REQUIRED NEAR-END E2E HANDOFF]** After `/workflow-review-changes` (which owns `/security-review`), invoke `/workflow-e2e --source=context`. Its nested workflow owns configured E2E execution and any visual review/evidence required by the request or project contract; preserve a project-required visual gate, and record evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the applicable capability is absent. This occurrence remains required even when the nested workflow reports that outcome.
**IMPORTANT MUST ATTENTION** every generated PBI MUST pass `.claude/skills/shared/releasable-pbi-contract.md`; technical/foundation/setup work is enabling work under a releasable PBI, and UI PBIs require all pages/views, navigation, components, states, and a connected mock-app demo.
**IMPORTANT MUST ATTENTION** apply `SYNC:scale-ready-foundation` before PLAN₁: inspect existing setup, choose only warranted architecture, model applicable actors/permissions and real infrastructure boundaries, verify material dependency/license/cost constraints, plan supported execution modes and CI/operations, and create the UI design/component contract when UI exists; brownfield refactor gaps become owned opportunities or explicit blockers.
**IMPORTANT MUST ATTENTION** optional AI-agent advice: when evidence or an accepted future contract makes an agent a potential user, apply `SYNC:ai-agent-as-user-access`; reuse one capability core, choose warranted machine surfaces, and record adaptation, deferral, N/A, or blockers with owner/trigger/next step. Never assume agent = administrator or build every surface.
**IMPORTANT MUST ATTENTION** test clarity: every assertion-bearing test follows the project's configured/native format and names the guarded behavior or technical contract; use GWT when selected or already idiomatic, otherwise preserve the established test structure and assert an owned outcome. Broad brownfield conversion is an owned opportunity, not silent scope expansion.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent when nested, one `in_progress`.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** Append findings to `tmp/reports/` per file, never hold in memory.
- **Subagent Return Contract:** Return summary only (≤10 bullets), full detail to disk report.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
