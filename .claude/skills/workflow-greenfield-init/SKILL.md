---
name: workflow-greenfield-init
version: 1.1.0
description: '[Workflow] Use when starting a new project from scratch — full waterfall inception from idea through implementation and integration testing.'
disable-model-invocation: true
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** [Workflow] Trigger Greenfield Project Init workflow — full waterfall project inception from idea through implementation with a test architecture contract, conditional early E2E evaluation, required near-end `workflow-e2e` verification, and final full/focused verification.

**Summary:**

- Begin with the shared large-idea classification and embedded decomposition contract; run `/scenario` before the first plan when the outcome slices require adversarial risk analysis. A roadmap artifact is not a default greenfield prerequisite.
- Before PLAN₁, apply `SYNC:scale-ready-foundation` in greenfield mode: choose the smallest architecture that fits, including module/clean/DDD/event-driven patterns when applicable, actors/authorization, material dependency/license choices, real infrastructure boundaries, supported execution modes, quality checks, CI/operations, and UI when applicable.
- Strongly recommend `SYNC:ai-agent-as-user-access` from inception: treat AI agents as potential non-human users, select evidence-backed machine surfaces over one capability core, and make identity, authorization, consent, audit, testing, and observability part of the foundation; a warranted omission is an explicit decision before PLAN₁.
- Research the product, domain, technology, architecture, and foundation in order; scaffold and review the foundation before feature work.
- Every assertion-bearing test in the foundation and feature chain MUST follow the project's configured/native test style and make the protected behavior or technical contract plus its owned outcome clear. Use explicit `Given` → `When` → `Then` when selected by the project/spec or when it fits the established idiom; preserve alternatives such as AAA or `describe`/`it`.
- Every generated PBI MUST pass the Releasable Outcome Gate: one independently releasable actor-facing outcome with a complete entry-to-result journey; foundation/scaffold/setup work is enabling work attached to that outcome, never a standalone technical PBI. UI PBIs require the full page/view, navigation, component, state, and mock-app flow surface.
- Preserve the full spec/PBI/story/test chain, emit the test architecture contract before implementation planning completes, and finish with implementation, integration verification, conditional early E2E evaluation, required near-end `workflow-e2e` verification, conditional experience exercise/inspection, synchronized evidence, and final full/focused verification.

 - **Main steps:** classify/decompose → research → domain/tech/architecture + test contract → scenario/plan/review → PBI/story/mock-up/spec gates → scaffold/lint/harness/architecture review → implementation/integration verification → conditional early E2E → final full/focused verification → review → required near-end `workflow-e2e` → security/test/docs/handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION classify the greenfield idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before market research, architecture, specs, PBIs, or plans. When true, require the complete embedded `large_idea_decomposition` block in the owning PBI/spec with `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`, then carry stable slice IDs into stories, mock-ups, and the all-PBI presentation; run `/scenario` only when the selected scope needs adversarial risk analysis, otherwise record the conditional skip with evidence. An explicit roadmap request may use the standalone writer separately.
- MUST ATTENTION emit and validate the Test Architecture & Execution Contract matrix before the first implementation plan completes; block handoff when any applicable tier lacks a copy-ready full command, focused command, zero-match behavior, or unique run/data identity, and record evidence-backed `N/A` for non-applicable tiers.
- MUST ATTENTION each assertion-bearing test follows the configured/native test style and clearly identifies the behavior/contract plus owned outcome; use GWT when selected by the project/spec or when it fits the chosen idiom. A warranted greenfield ambiguity blocks; touched brownfield format migration stays an owned opportunity.
- MUST ATTENTION before the first implementation plan completes emit the `SYNC:scale-ready-foundation` applicability matrix and carry accepted architecture, applicable actor/permission, dependency/license, real infrastructure-boundary, supported execution-mode, CI/operations, and UI decisions into scaffold, linter/harness, architecture review, and plan artifacts; a warranted omission is blocking until resolved.
- MUST ATTENTION when evidence warrants AI agents as first-class non-human actors, apply `SYNC:ai-agent-as-user-access`, choose applicable API/CLI/MCP/WebMCP/event/SDK surfaces, and record identity/delegation, capability contracts, safety/consent, audit/observability, tests in the configured style, ownership, or an explicit evidence-backed omission.
- MUST ATTENTION after `/integration-test-verify`, inspect configured E2E evidence and invoke the early `/e2e-test` only when a runnable E2E framework/command is configured; otherwise record explicit evidence-backed `N/A`. Near the end, after `/workflow-review-changes`, invoke the required `/workflow-e2e --source=context` handoff so its nested workflow owns final E2E/screenshot evidence and records `N/A` or `ENVIRONMENT-BLOCKED` honestly. The final `/test` must report full/focused verification and exact results.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                                                          |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `/plan`                              | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and conditional decomposition scenario gate) |
| `/plan`                              | 2nd (pos 30) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests)         |
| `/plan`                              | 3rd (pos 45) | PLAN₃: Integration test architecture plan (post-implementation)                           |
| `/plan-review`                       | 1st (pos 15) | Review PLAN₁ architecture (immediate gate; its parallel why-review sub-agent owns PLAN₁ rationale) |
| `/plan-review`                       | 2nd (pos 18) | Re-review PLAN₁ after the parallel architecture-security + performance analysis; sole PLAN₁ writer                        |
| `/plan-review`                       | 3rd (pos 31) | Review PLAN₂ implementation                                                               |
| `/plan-review`                       | 4th (pos 46) | Review PLAN₃ integration tests                                                            |
| `/security-review --report-only`     | 1st (pos 16) | Architecture security review (occurrence `architecture-security-review`; parallel with `/performance-review --report-only` pos 17, occurrence `architecture-performance-review`) |
| `/security-review`                   | 2nd (delegated) | Production readiness security review — owned by the nested `/workflow-review-changes` occurrence (removed from this sequence) |
| `/spec [mode=tests]`                 | 1st (pos 27) | TDD-SPEC₁: Feature test specs (before implementation)                                     |
| `/spec [mode=tests]`                 | 2nd (pos 43) | TDD-SPEC₂: Post-implementation test spec update                                           |
| `/artifact-review --type=spec-tests` | 1st (pos 28) | Review TDD-SPEC₁                                                                          |
| `/artifact-review --type=spec-tests` | 2nd (pos 44) | Review TDD-SPEC₂                                                                          |
| `/e2e-test`                          | (conditional, pos 49) | Run after integration-test-verify only when E2E is configured; otherwise record evidence-backed N/A |
| `/test`                              | 1st (pos 50) | Test after integration tests and conditional early E2E evaluation                         |
| `/workflow-e2e --source=context`     | required (pos 52) | Near-end nested E2E workflow after workflow-review-changes; it owns visual screenshot review by default and records N/A/blocked evidence |
| `/test`                              | 2nd (pos 53) | Final full/focused test verification (occurrence `final-test`)                            |
| `/domain-entities-review`            | 1st (delegated) | DDD quality review — owned by the nested `/workflow-review-changes` occurrence (removed from this sequence); conditional on domain entity files changing |
| `/linter-setup`                      | (new)        | LINTER-SETUP: Install and configure computational feedback sensors                        |
| `/harness-setup`                     | (new)        | HARNESS-SETUP: Full outer agent harness (feedforward guides + feedback sensors inventory) |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `/why-review`)

Declared as the `architecture-gates` all-return barrier in `workflows.json`. Both gates read the same finished `/architecture-design` artifacts and neither consumes the other's output:

1. Launch `/architecture-scalability-review` FIRST as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths). It writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Immediately run the design-rationale `/why-review` INLINE in FULL mode over the architecture-design rationale — inline so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. Reconcile: a scalability risk or sub-80 grade touching a decision the why-review passed becomes a WARN carried into `/scenario` and PLAN₁; a why-review FAIL — or a user Trade-Off answer that changes an architecture decision — blocks `/scenario` until the decision is revised, then re-run both gates.

## Architecture Risk Reviews Parallel Phase (pos 16–17)

Declared as the `architecture-risk-reviews` all-return barrier in `workflows.json` (occurrences `architecture-security-review` and `architecture-performance-review`, both invoked with `--report-only`). Both review the same reviewed PLAN₁ + architecture-design artifacts and neither consumes the other's output:

1. Launch BOTH in ONE message as fresh read-only sub-agents — `/security-review --report-only` via `security-auditor`, `/performance-review --report-only` via `performance-optimizer` (brief: PLAN₁, architecture-design, domain-analysis and tech-stack-research artifact paths).
2. Each runs its skill's documented Report-Only Mode: it audits the architecture at design altitude, writes only its report to `tmp/reports/`, validates its own findings through its skill's findings-validation gate, and returns — no fix, no nested sub-agent, no user question, and no `/scan` or `/project-init` for reference docs that do not exist yet; neither edits PLAN₁.
3. Advance only after BOTH return. The per-stage `AskUserQuestion` validation for both reviews runs after the barrier; the pos-18 `/plan-review` is the SOLE writer of PLAN₁ — it folds in both validated reports and surfaces any security-vs-performance conflict or trade-off question to the user, never resolving it silently.

## Reference Docs + Pre-Coding Rationale Parallel Phase (pos 36–40)

Declared as the `reference-docs-and-rationale` all-return barrier (`/scan --target=ui-system` is its conditional member):

1. Launch the pre-coding `/why-review` (pos 40) FIRST as a fresh read-only `code-reviewer` sub-agent in FULL mode. Its inputs are PLAN₂, the reviewed foundation source, and the `/architecture-review-full` report — it does not read, wait on, or regenerate the project-reference docs (root default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) the in-flight scans derive; a missing or stale reference doc there is expected, recorded as `NOT VERIFIABLE`, and never a trigger for `/scan` or `/project-init`. It returns any Trade-Off Interrogation questions unanswered; the orchestrator asks them via `AskUserQuestion` after the barrier and never self-approves a one-way door.
2. Run the four `/scan` steps INLINE in order while it is active — the barrier holds one spawned sub-agent plus this inline scan chain; each scan fans out its own sub-agents from the orchestrator, so a scan is never dispatched as a sub-agent. The four scans write disjoint reference docs. Skip `--target=ui-system` (with a logged reason) when the project has no UI stack.
3. Advance to `/plan-execute` only after ALL members return. If the why-review FAILs and forces a foundation change, fix it and re-run every `/scan` whose reference doc covers the changed area before `/plan-execute`.

---

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /security-review --report-only -> /performance-review --report-only -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /plan-validate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /linter-setup -> /harness-setup -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /why-review -> /plan-execute -> /seed-test-data -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /integration-test -> /integration-test-verify -> /e2e-test -> /spec [mode=sync] -> /test -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /security-review --report-only -> /performance-review --report-only -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /plan-validate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /linter-setup -> /harness-setup -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /why-review -> /plan-execute -> /seed-test-data -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /integration-test -> /integration-test-verify -> /e2e-test -> /spec [mode=sync] -> /test -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-greenfield-init` workflow. Run `/start-workflow workflow-greenfield-init` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /market-analysis → /business-evaluation → /spec-discovery → /domain-analysis → /why-review → /tech-stack-research → /architecture-design → /architecture-scalability-review → /why-review → /scenario → /plan → /plan-review → /security-review --report-only → /performance-review --report-only → /plan-review → /refine → /artifact-review --type=pbi → /story → /artifact-review --type=story → /pbi-challenge → /dor-gate → /pbi-mockup → /plan-validate → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec-clarify → /plan → /plan-review → /scaffold → /linter-setup → /harness-setup → /architecture-review-full → /scan --target=ui-system → /scan --target=backend-patterns → /scan --target=integration-tests → /scan --target=project-structure → /why-review → /plan-execute → /seed-test-data → /spec [mode=tests] → /artifact-review --type=spec-tests → /plan → /plan-review → /integration-test → /integration-test-verify → /e2e-test → /test → /workflow-review-changes → /workflow-e2e --source=context → /test → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `/workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.

> **[BLOCKING TEST ARCHITECTURE HANDOFF GATE]** During `/architecture-design`, emit the Test Architecture & Execution Contract matrix before the first `/plan` completes. Before `/plan-execute` or any feature-implementation handoff, validate every potentially applicable Unit, Integration/System, and E2E row: `APPLICABLE` requires evidence-backed runner/framework/configuration, copy-ready full and focused commands, zero-match behavior, and unique run/data identity; missing any of these blocks handoff. Record `N/A — <evidence>` for every non-applicable tier; never substitute an assumption for missing evidence.

> **[CONDITIONAL EARLY + REQUIRED NEAR-END E2E GATES]** Immediately after `/integration-test-verify`, inspect `docs/project-config.json` → `e2eTesting` and the matching runnable framework, entry points, and commands. When configured, invoke the early `/e2e-test`; otherwise complete that conditional step as `N/A — <evidence>` citing the configuration and repository scan, without fabricating browser setup. After `/workflow-review-changes`, invoke the required `/workflow-e2e --source=context` handoff; its nested workflow resolves configured E2E scope and applies visual review/evidence when the request or project contract requires it, preserving any project-required visual gate. It records `N/A` or `ENVIRONMENT-BLOCKED` when the applicable capability is absent. When the implementation exposes a configured or likely observable surface, the nested workflow owns the corresponding `/experience-review`; a relevant surface without a runnable/inspectable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS. The following final `/test` step performs full/focused verification and reports exact results and exit status for each applicable tier.

> **Architecture quality gate (`/architecture-scalability-review`, pos 11).** Immediately after `/architecture-design` and before the first `/plan`, greenfield runs the architecture & scalability scorecard (init mode) so its findings and gate items feed the implementation plan. This is the comprehensive project-quality evaluation for greenfield/init — Build & CI scalability, architecture pattern (modular monolith vs. microservices / distributed-monolith avoidance), module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction/easy-to-change, clean architecture, and observability/DevOps. Brownfield or day-to-day audits invoke the same skill on demand via `/architecture-scalability-review mode=audit`; it is intentionally NOT a member of the every-change `workflow-review-changes` batch — that batch's `architecture-review` step carries the lightweight per-change scalability & coupling regression check instead.

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Do not infer a trimmed variant or skip gates that the selected manifest does not authorize.

---

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
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
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

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Complete greenfield inception from an owner-approved capability boundary—using embedded large-idea decomposition when triggered, or an explicit roadmap only when requested—through a releasable first vertical outcome, reviewed enabling foundation, test architecture contract, implementation, integration verification, conditional E2E evaluation, final full/focused verification, and handoff without skipping gates.
**IMPORTANT MUST ATTENTION Main steps:** classify/decompose → research → domain/tech/architecture + test contract → scenario/plan/review → PBI/story/mock-up/spec gates → scaffold/lint/harness/architecture review → implementation/integration verification → conditional early E2E → final full/focused verification → final review → required near-end `workflow-e2e` → security/test/docs/handoff.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/releasable-pbi-contract.md`: no standalone technical/foundation/setup PBI; UI PBIs must include all required pages/views, navigation, components, states, and a connected mock-app demo.
**IMPORTANT MUST ATTENTION** apply `SYNC:scale-ready-foundation` before PLAN₁: greenfield foundation decisions are blocking when warranted; record architecture, applicable actors/permissions, material dependency/license choices, real provider boundaries, supported execution modes, CI/operations, and UI decisions with evidence, trade-offs, owner, and revisit triggers.
**IMPORTANT MUST ATTENTION** strongly recommend `SYNC:ai-agent-as-user-access` before PLAN₁: model AI agents as potential users, select warranted API/CLI/MCP/WebMCP/event/SDK surfaces over one capability core, and record identity/delegation, authorization, safety/consent, audit/observability, GWT tests, owner, and revisit trigger; an omission must be explicit and evidence-backed.
**IMPORTANT MUST ATTENTION** test clarity: every assertion-bearing test follows the project's configured/native style, names the guarded behavior or technical contract, and asserts an owned outcome. Use GWT when selected by the project/spec or when it fits the chosen test idiom; safety-critical ambiguity blocks handoff.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested, one task `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `tmp/reports/` per file, never hold in memory.
- **Sub-Agent Return Contract:** return summary only (≤10 bullets), full detail to disk.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
