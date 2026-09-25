---
name: workflow-big-feature
description: '[Workflow] Use when implementing a large, ambiguous, or research-driven feature.'
disable-model-invocation: true
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

**Goal:** [Workflow] Trigger Big Feature workflow — research-driven development for large, complex, or ambiguous features needing market research, business evaluation, domain analysis, tech stack research, and architecture design before implementation.

**Summary:**

- Apply the shared four-operand `isLargeIdea` rule before research and planning; large ideas carry the complete decomposition block in PBIs/specs and downstream presentation/mock-up artifacts. Run `$scenario` before the first plan when the slice/risk context requires it; do not create a roadmap artifact by default.
- At `$architecture-design` before PLAN₁, apply `SYNC:scale-ready-foundation`: inspect the existing project, distinguish safe adoption from conflicts and broad refactors, and emit the applicability/decision matrix for architecture, actors/authorization, dependencies/licenses, real infrastructure boundaries, supported execution modes, CI/operations, and UI when applicable.
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
- MUST ATTENTION classify the idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before research, specs, PBIs, or plans. When true, require `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; run `$scenario` conditionally for the embedded scope. An existing roadmap is read-only context and only an explicit roadmap request enters the standalone writer.
- MUST ATTENTION before PLAN₁ emit the `SYNC:scale-ready-foundation` matrix and carry its accepted decisions into `$architecture-design`, `$plan`, `$scaffold`, `$architecture-review-full`, and implementation; use the full gate for greenfield and the fit/defer branch for this existing-project workflow.
- MUST ATTENTION optionally evaluate AI agents as first-class non-human actors when evidence or an accepted future contract makes them relevant; apply `SYNC:ai-agent-as-user-access`, select only warranted API/CLI/MCP/WebMCP/event/SDK surfaces over one capability core, and record the status, owner, trigger, and smallest next step without scope laundering.
- MUST ATTENTION every assertion-bearing test follows the configured/native test style and makes the protected behavior/contract plus owned outcome clear; use GWT when selected by the project/spec or when it fits the established idiom. Preserve brownfield conventions and record broad format migration as an owned opportunity; safety-critical ambiguity is `BLOCKED`.
- MUST ATTENTION when a desired foundation requires broad refactoring, keep the releasable PBI's actor journey bounded and record a separately owned refactor/architecture opportunity with rationale, dependency order, trigger, owner, cost of delay, and smallest independently valuable next step; mark the current slice `BLOCKED` when the refactor is required for safety.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step           | Occurrence   | Task Description                                                                  |
| -------------- | ------------ | --------------------------------------------------------------------------------- |
| `$plan`        | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and scenario gate) |
| `$plan`        | 2nd (pos 27) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests) |
| `$plan-review` | 1st (pos 15) | Review PLAN₁ architecture                                                         |
| `$plan-review` | 2nd (pos 28) | Review PLAN₂ implementation                                                       |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

## Gates and Optional Steps

**Step contract:** `$start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                                | Role     | Runs when                                                          |
| ----------------------------------- | -------- | ------------------------------------------------------------------ |
| `$market-analysis`                  | optional | the market needs sizing (see Market Analysis Applicability below)  |
| `$spec-discovery`                   | optional | specs or related code already exist for the affected area          |
| `$scenario`                         | optional | replay, state, ownership or recovery risks need analysis           |
| `$scaffold`                         | optional | the codebase lacks the base abstractions this feature needs        |
| `$architecture-review-full`         | optional | `$scaffold` built new foundation code                              |
| `$scan --target=ui-system`          | optional | `$scaffold` built a UI or frontend foundation                      |
| `$scan --target=backend-patterns`   | optional | `$scaffold` built a new foundation                                 |
| `$scan --target=integration-tests`  | optional | `$scaffold` built a new foundation                                 |
| `$scan --target=project-structure`  | optional | `$scaffold` built a new foundation                                 |
| `$plan-validate`                    | gate     | always                                                             |
| `$workflow-review-changes`          | gate     | always                                                             |
| `$test`                             | gate     | always                                                             |
| `$workflow-end`                     | gate     | always                                                             |

Outcome gates: plan approved · spec synced (when behavior or a public contract changed) · tests pass · review converged · run closed.

## Market Analysis Applicability (pos 4, conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

For either outcome, record the applicability evidence. If skipped because the market is already sized, cite the existing analysis. `$business-evaluation` must mark every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `$web-research`, `$deep-research`, other selected research stages, or their required user confirmations.


## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `$why-review`)

Declared as the `architecture-gates` all-return barrier in `workflows.json`. Both gates read the same finished `$architecture-design` artifacts and neither consumes the other's output:

1. Launch `$architecture-scalability-review` FIRST as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths). It writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Immediately run the design-rationale `$why-review` INLINE in FULL mode over the architecture-design rationale — inline so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. Reconcile: a scalability risk or sub-80 grade touching a decision the why-review passed becomes a WARN carried into `$scenario` and PLAN₁; a why-review FAIL — or a user Trade-Off answer that changes an architecture decision — blocks `$scenario` until the decision is revised, then re-run both gates.

## Foundation Reference Doc Refresh (pos 31–34, conditional)

New foundations need project references BEFORE feature fan-out. After `$architecture-review-full` and before `$plan-validate` → `$plan-execute`:

1. **When `$scaffold` ran**, run `$scan --target=ui-system` → `$scan --target=backend-patterns` → `$scan --target=integration-tests` → `$scan --target=project-structure` INLINE in that order — each scan fans out its own sub-agents from the orchestrator, so a scan is never dispatched as a sub-agent (`stepMeta` marks them `inline`). The four scans write disjoint reference docs and consume the reviewed-and-fixed foundation, so they run sequentially, not as a parallel barrier.
2. **Refresh, not regenerate** — this is an existing codebase: each scan reads the existing doc in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) first and surgically adds what the foundation introduced (new base abstractions, golden-path examples, the isolated examples tree, a new module, UI foundation), creating a doc only when it does not exist yet and preserving unchanged sections and manual annotations.
3. **Skip rules** — skip `$scan --target=ui-system` (log the reason) when `$scaffold` created no UI/frontend foundation; the other three apply whenever `$scaffold` ran. When `$scaffold` was skipped (existing foundation reused), mark all four completed with a cited skip reason — the existing reference docs already describe that foundation.
4. If `$plan-validate` or a later pre-implementation fix changes the foundation, re-run every `$scan` whose reference doc covers the changed area before `$plan-execute`.

---

## Closing Rule

Every step that runs = `TaskUpdate in_progress` → skill invocation → complete skill → `TaskUpdate completed`. A step that does not run follows the step contract above.

---

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $plan-validate -> $plan-execute -> $seed-test-data -> $integration-test -> $integration-test-verify -> $spec [mode=sync] -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $plan-validate -> $plan-execute -> $seed-test-data -> $integration-test -> $integration-test-verify -> $spec [mode=sync] -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its skill invocation; every other deviation follows the step contract above. NEVER batch-complete validation gates.

Activate the `workflow-big-feature` workflow. Run `$start-workflow workflow-big-feature` with the user's prompt as context.

> **Spec check (before investigation):** If the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: list that resolved root to discover available app buckets or flat system folders; then probe its `{app-bucket}/` or `{system-name}/` subdirectory to find the specific service spec.

**Steps:** $idea → $web-research → $deep-research → $market-analysis → $business-evaluation → $spec-discovery → $domain-analysis → $why-review → $tech-stack-research → $architecture-design → $architecture-scalability-review → $why-review → $scenario → $plan → $plan-review → $refine → $artifact-review --type=pbi → $story → $artifact-review --type=story → $pbi-challenge → $dor-gate → $pbi-mockup → $spec → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec-clarify → $plan → $plan-review → $scaffold → $architecture-review-full → $scan --target=ui-system → $scan --target=backend-patterns → $scan --target=integration-tests → $scan --target=project-structure → $plan-validate → $plan-execute → $seed-test-data → $integration-test → $integration-test-verify → $spec [mode=sync] → $workflow-review-changes → $workflow-e2e --source=context → $test → $workflow-end → $watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `$workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.

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

> **[REQUIRED NEAR-END E2E HANDOFF]** After `$workflow-review-changes` (which owns `$security-review`), invoke `$workflow-e2e --source=context`. Its nested workflow owns configured E2E execution and any visual review/evidence required by the request or project contract; preserve a project-required visual gate, and record evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the applicable capability is absent. This occurrence remains required even when the nested workflow reports that outcome.
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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
