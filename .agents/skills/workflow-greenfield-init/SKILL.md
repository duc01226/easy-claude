---
name: workflow-greenfield-init
description: '[Workflow] Use when starting a new project from scratch — full waterfall inception from idea through implementation and integration testing.'
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

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** [Workflow] Trigger Greenfield Project Init workflow — full waterfall project inception from idea through implementation with a test architecture contract, conditional early E2E evaluation, required near-end `workflow-e2e` verification, and final full/focused verification.

**Summary:**

- Begin with the shared large-idea classification and embedded decomposition contract; run `$scenario` before the first plan when the outcome slices require adversarial risk analysis. A roadmap artifact is not a default greenfield prerequisite.
- Before PLAN₁, apply `SYNC:scale-ready-foundation` in greenfield mode: design the scale-ready foundation from evidence, including modular boundaries, clean/DDD/event-driven applicability, actors/authorization, free/license-verified dependencies, provider-neutral infrastructure, host + Docker Compose execution, quality harness, CI/CD/operations, and the UI design/component system when applicable.
- Strongly recommend `SYNC:ai-agent-as-user-access` from inception: treat AI agents as potential non-human users, select evidence-backed machine surfaces over one capability core, and make identity, authorization, consent, audit, testing, and observability part of the foundation; a warranted omission is an explicit decision before PLAN₁.
- Research the product, domain, technology, architecture, and foundation in order; scaffold and review the foundation before feature work.
- Every assertion-bearing test in the foundation and feature chain MUST use explicit `Given` → `When` → `Then` phases; name `Business Intent / Invariant Guarded` (or the technical contract) and assert the outcome the test owns.
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
- MUST ATTENTION classify the greenfield idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before market research, architecture, specs, PBIs, or plans. When true, require the complete embedded `large_idea_decomposition` block in the owning PBI/spec with `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`, then carry stable slice IDs into stories, mock-ups, and the all-PBI presentation; run `$scenario` only when the selected scope needs adversarial risk analysis, otherwise record the conditional skip with evidence. An explicit roadmap request may use the standalone writer separately.
- MUST ATTENTION emit and validate the Test Architecture & Execution Contract matrix before the first implementation plan completes; block handoff when any applicable tier lacks a copy-ready full command, focused command, zero-match behavior, or unique run/data identity, and record evidence-backed `N/A` for non-applicable tiers.
- MUST ATTENTION enforce explicit `Given` → `When` → `Then` in every assertion-bearing test entry point across unit, integration/system, E2E, performance/scale, contract, architecture, security, accessibility, visual, property, mutation, and harness tests; bare `Arrange/Act/Assert` is insufficient unless labeled with all three phases. A warranted greenfield omission blocks; touched brownfield ambiguity is converted or recorded as an owned migration opportunity.
- MUST ATTENTION before the first implementation plan completes emit the `SYNC:scale-ready-foundation` decision matrix and carry accepted architecture, actor/permission, dependency/license, provider-port, host/Compose, CI/CD/operations, and UI component-contract decisions into scaffold, linter/harness, architecture review, and plan artifacts; a warranted omission is blocking until explicitly decided.
- MUST ATTENTION strongly recommend treating AI agents as first-class non-human actors before the first implementation plan; apply `SYNC:ai-agent-as-user-access`, choose applicable API/CLI/MCP/WebMCP/event/SDK surfaces, and block handoff until identity/delegation, capability contracts, safety/consent, audit/observability, GWT tests, ownership, or an explicit evidence-backed omission are recorded.
- MUST ATTENTION after `$integration-test-verify`, inspect configured E2E evidence and invoke the early `$e2e-test` only when a runnable E2E framework/command is configured; otherwise record explicit evidence-backed `N/A`. Near the end, after `$workflow-review-changes`, invoke the required `$workflow-e2e --source=context` handoff so its nested workflow owns final E2E/screenshot evidence and records `N/A` or `ENVIRONMENT-BLOCKED` honestly. The final `$test` must report full/focused verification and exact results.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                                                          |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `$plan`                              | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and conditional decomposition scenario gate) |
| `$plan`                              | 2nd (pos 30) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests)         |
| `$plan`                              | 3rd (pos 46) | PLAN₃: Integration test architecture plan (post-implementation)                           |
| `$plan-review`                       | 1st (pos 15) | Review PLAN₁ architecture (immediate gate; its parallel why-review sub-agent owns PLAN₁ rationale) |
| `$plan-review`                       | 2nd (pos 18) | Re-review PLAN₁ after the parallel architecture-security + performance analysis; sole PLAN₁ writer                        |
| `$plan-review`                       | 3rd (pos 31) | Review PLAN₂ implementation                                                               |
| `$plan-review`                       | 4th (pos 47) | Review PLAN₃ integration tests                                                            |
| `$security-review --report-only`     | 1st (pos 16) | Architecture security review (occurrence `architecture-security-review`; parallel with `$performance-review --report-only` pos 17, occurrence `architecture-performance-review`) |
| `$security-review`                   | 2nd (pos 55) | Production readiness security review                                                      |
| `$spec [mode=tests]`                 | 1st (pos 27) | TDD-SPEC₁: Feature test specs (before implementation)                                     |
| `$spec [mode=tests]`                 | 2nd (pos 44) | TDD-SPEC₂: Post-implementation test spec update                                           |
| `$artifact-review --type=spec-tests` | 1st (pos 28) | Review TDD-SPEC₁                                                                          |
| `$artifact-review --type=spec-tests` | 2nd (pos 45) | Review TDD-SPEC₂                                                                          |
| `$e2e-test`                          | (conditional, pos 51) | Run after integration-test-verify only when E2E is configured; otherwise record evidence-backed N/A |
| `$test`                              | 1st (pos 52) | Test after integration tests and conditional early E2E evaluation                         |
| `$workflow-e2e --source=context`     | required (pos 54) | Near-end nested E2E workflow after workflow-review-changes; it owns visual screenshot review by default and records N/A/blocked evidence |
| `$test`                              | 2nd (pos 56) | Final full/focused test verification (occurrence `final-test`)                            |
| `$domain-entities-review`            | 1st (pos 43) | DDD quality review — conditional: skip if no domain entity files in changeset             |
| `$linter-setup`                      | (new)        | LINTER-SETUP: Install and configure computational feedback sensors                        |
| `$harness-setup`                     | (new)        | HARNESS-SETUP: Full outer agent harness (feedforward guides + feedback sensors inventory) |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `$why-review`)

Declared as the `architecture-gates` all-return barrier in `workflows.json`. Both gates read the same finished `$architecture-design` artifacts and neither consumes the other's output:

1. Launch `$architecture-scalability-review` FIRST as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths). It writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Immediately run the design-rationale `$why-review` INLINE in FULL mode over the architecture-design rationale — inline so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. Reconcile: a scalability risk or sub-80 grade touching a decision the why-review passed becomes a WARN carried into `$scenario` and PLAN₁; a why-review FAIL — or a user Trade-Off answer that changes an architecture decision — blocks `$scenario` until the decision is revised, then re-run both gates.

## Architecture Risk Reviews Parallel Phase (pos 16–17)

Declared as the `architecture-risk-reviews` all-return barrier in `workflows.json` (occurrences `architecture-security-review` and `architecture-performance-review`, both invoked with `--report-only`). Both review the same reviewed PLAN₁ + architecture-design artifacts and neither consumes the other's output:

1. Launch BOTH in ONE message as fresh read-only sub-agents — `$security-review --report-only` via `security-auditor`, `$performance-review --report-only` via `performance-optimizer` (brief: PLAN₁, architecture-design, domain-analysis and tech-stack-research artifact paths).
2. Each runs its skill's documented Report-Only Mode: it audits the architecture at design altitude, writes only its report to `tmp/reports/`, validates its own findings through its skill's findings-validation gate, and returns — no fix, no nested sub-agent, no user question, and no `$scan` or `$project-init` for reference docs that do not exist yet; neither edits PLAN₁.
3. Advance only after BOTH return. The per-stage ask the user directly validation for both reviews runs after the barrier; the pos-18 `$plan-review` is the SOLE writer of PLAN₁ — it folds in both validated reports and surfaces any security-vs-performance conflict or trade-off question to the user, never resolving it silently.

## Reference Docs + Pre-Coding Rationale Parallel Phase (pos 36–40)

Declared as the `reference-docs-and-rationale` all-return barrier (`$scan --target=ui-system` is its conditional member):

1. Launch the pre-coding `$why-review` (pos 40) FIRST as a fresh read-only `code-reviewer` sub-agent in FULL mode. Its inputs are PLAN₂, the reviewed foundation source, and the `$architecture-review-full` report — it does not read, wait on, or regenerate the `docs/project-reference/*` docs the in-flight scans derive; a missing or stale reference doc there is expected, recorded as `NOT VERIFIABLE`, and never a trigger for `$scan` or `$project-init`. It returns any Trade-Off Interrogation questions unanswered; the orchestrator asks them by asking the user directly after the barrier and never self-approves a one-way door.
2. Run the four `$scan` steps INLINE in order while it is active — the barrier holds one spawned sub-agent plus this inline scan chain; each scan fans out its own sub-agents from the orchestrator, so a scan is never dispatched as a sub-agent. The four scans write disjoint reference docs. Skip `--target=ui-system` (with a logged reason) when the project has no UI stack.
3. Advance to `$plan-execute` only after ALL members return. If the why-review FAILs and forces a foundation change, fix it and re-run every `$scan` whose reference doc covers the changed area before `$plan-execute`.

---

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $security-review --report-only -> $performance-review --report-only -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $linter-setup -> $harness-setup -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $why-review -> $plan-execute -> $seed-test-data -> $domain-entities-review -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $integration-test -> $integration-test-review -> $integration-test-verify -> $e2e-test -> $test -> $workflow-review-changes -> $workflow-e2e --source=context -> $security-review -> $test -> $scan --target=domain-entities -> $docs-update -> $workflow-end -> $watzup

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $security-review --report-only -> $performance-review --report-only -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $linter-setup -> $harness-setup -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $why-review -> $plan-execute -> $seed-test-data -> $domain-entities-review -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $integration-test -> $integration-test-review -> $integration-test-verify -> $e2e-test -> $test -> $workflow-review-changes -> $workflow-e2e --source=context -> $security-review -> $test -> $scan --target=domain-entities -> $docs-update -> $workflow-end -> $watzup

> **[BLOCKING]** Each selected step MUST ATTENTION invoke its skill invocation — marking a selected task `completed` without skill invocation is a workflow violation. A declared conditional step such as `$scenario` may be marked skipped only with evidence and an explicit reason; NEVER batch-complete validation gates.

Activate the `workflow-greenfield-init` workflow. Run `$start-workflow workflow-greenfield-init` with the user's prompt as context.

**Steps:** $idea → $web-research → $deep-research → $market-analysis → $business-evaluation → $spec-discovery → $domain-analysis → $why-review → $tech-stack-research → $architecture-design → $architecture-scalability-review → $why-review → $scenario → $plan → $plan-review → $security-review --report-only → $performance-review --report-only → $plan-review → $refine → $artifact-review --type=pbi → $story → $artifact-review --type=story → $pbi-challenge → $dor-gate → $pbi-mockup → $plan-validate → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec-clarify → $plan → $plan-review → $scaffold → $linter-setup → $harness-setup → $architecture-review-full → $scan --target=ui-system → $scan --target=backend-patterns → $scan --target=integration-tests → $scan --target=project-structure → $why-review → $plan-execute → $seed-test-data → $domain-entities-review → $spec [mode=tests] → $artifact-review --type=spec-tests → $plan → $plan-review → $integration-test → $integration-test-review → $integration-test-verify → $e2e-test → $test → $workflow-review-changes → $workflow-e2e --source=context → $security-review → $test → $scan --target=domain-entities → $docs-update → $workflow-end → $watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH]** After `$test` and before `$docs-update`, run `$scan --target=domain-entities` to refresh the project-reference entity catalog only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `docs/project-reference/domain-entities-reference.md`. Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope; this is the explicitly authorized exception to the per-step skill-invocation rule.

> **[BLOCKING TEST ARCHITECTURE HANDOFF GATE]** During `$architecture-design`, emit the Test Architecture & Execution Contract matrix before the first `$plan` completes. Before `$plan-execute` or any feature-implementation handoff, validate every potentially applicable Unit, Integration/System, and E2E row: `APPLICABLE` requires evidence-backed runner/framework/configuration, copy-ready full and focused commands, zero-match behavior, and unique run/data identity; missing any of these blocks handoff. Record `N/A — <evidence>` for every non-applicable tier; never substitute an assumption for missing evidence.

> **[CONDITIONAL EARLY + REQUIRED NEAR-END E2E GATES]** Immediately after `$integration-test-verify`, inspect `docs/project-config.json` → `e2eTesting` and the matching runnable framework, entry points, and commands. When configured, invoke the early `$e2e-test`; otherwise complete that conditional step as `N/A — <evidence>` citing the configuration and repository scan, without fabricating browser setup. After `$workflow-review-changes`, invoke the required `$workflow-e2e --source=context` handoff; its nested workflow resolves the configured E2E scope, reviews generated screenshots by default, and records `N/A` or `ENVIRONMENT-BLOCKED` when the repository cannot provide the applicable capability. When the implementation exposes a configured or likely observable surface, the nested workflow owns the corresponding `$experience-review`; a relevant surface without a runnable/inspectable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS. The following final `$test` step performs full/focused verification and reports exact results and exit status for each applicable tier.

> **Architecture quality gate (`$architecture-scalability-review`, pos 11).** Immediately after `$architecture-design` and before the first `$plan`, greenfield runs the architecture & scalability scorecard (init mode) so its findings and gate items feed the implementation plan. This is the comprehensive project-quality evaluation for greenfield/init — Build & CI scalability, architecture pattern (modular monolith vs. microservices / distributed-monolith avoidance), module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction/easy-to-change, clean architecture, and observability/DevOps. Brownfield or day-to-day audits invoke the same skill on demand via `$architecture-scalability-review mode=audit`; it is intentionally NOT a member of the every-change `workflow-review-changes` batch — that batch's `architecture-review` step carries the lightweight per-change scalability & coupling regression check instead.

<!-- SYNC:scale-ready-foundation -->

> **Scale-Ready Foundation & Brownfield Fit** — Use this protocol only in `workflow-greenfield-init` and `workflow-big-feature`; it supplements, never replaces, `SYNC:engineering-foundation-gate`, `SYNC:scale-technique-gate`, `SYNC:design-system-check`, and `shared/sdd-artifact-contract.md`. Optimize for a system that can grow and change safely, not for a fashionable architecture.
>
> 1. **Classify lifecycle and evidence first.** Mark `G` greenfield (foundation being created) or `B` brownfield (existing project); record scale `T0`–`T3`, business criticality `B0`–`B3`, repository/module shape, user-facing surfaces, and current setup with `file:line`/config/CI evidence. Unknowns stay explicit and take the lower warranted tier; never invent a greenfield baseline for an existing project.
> 2. **Choose the smallest architecture that satisfies measured needs.** Explicitly evaluate modular monolith, clean/hexagonal/layered boundaries, domain-driven bounded contexts/aggregates, and event-driven seams. Default to a modular monolith with mechanically enforced capability/module boundaries; add distribution, event sourcing, sagas, or other heavy machinery only for a named workload, ownership, compliance, availability, or integration trigger. Record dependency direction, one data owner per dataset, and a decomposition trigger.
> 3. **Make future module growth cheap.** Define modules around business capabilities and service domains, not tables, vendors, or technical layers alone; keep cross-module contracts explicit; prevent direct cross-module storage access; keep shared libraries domain-neutral; and prove a new module can be added without editing unrelated business modules. Name public contracts by purpose/capability, not provider, framework, database, or transport.
> 4. **Design authorization from actors, not a role enum.** For SaaS or multi-tenant scope, enumerate applicable human, organization, platform, service-account, integration, webhook, and background-job actors (for example: visitor, member, tenant administrator, support/operator, platform administrator, service identity); derive the list from the product and threat model rather than assuming it. For every actor record authentication, tenant/resource scope, actions, role assignment/delegation, deny-by-default and least privilege, separation of duties, admin/impersonation/break-glass controls, and audit evidence. Verify allowed, denied, and cross-tenant isolation paths.
> 5. **Keep infrastructure replaceable without leaking vendors.** Put each real external boundary behind a purpose-named port/interface and provider adapter; keep SDK, framework, database, queue, and transport types out of domain/application contracts; compose implementations at the outer boundary; and add abstractions only where a real boundary or substitution need exists. A claimed swap must identify the stable contract, migration seam, and remaining provider-specific cost.
> 6. **Research every dependency and enforce the cost constraint.** For each package, library, platform component, and infrastructure implementation, compare current official evidence for fit, maintenance, security, interoperability, upgrade path, license obligations, and total cost. When the requirement is free/no paid license, reject paid license or usage-fee choices unless the user explicitly approves an exception; verify upstream license text and a machine-readable SPDX identifier (OSI Open Source Definition: `https://opensource.org/osd`; SPDX guidance: `https://spdx.dev/learn/handling-license-info/`). Record attribution, copyleft/patent/redistribution obligations, and operational costs separately; “free” is not an unverified assumption.
> 7. **Make execution and operations reproducible.** Support bare-host application execution for debugging/live update and fully containerized execution from one source of truth for configuration and topology; declare infrastructure dependencies in versioned Docker Compose; exercise both modes where applicable and record which mode CI runs. Plan CI/CD gates for build, test, lint/static analysis, dependency/license/secret scanning, artifact promotion, safe migrations, rollback, and reproducible toolchains. Plan health/readiness, structured logs, metrics, tracing/error signals, alerts, SLO/SLI or equivalent objectives, runbooks, backup/restore, and disaster recovery according to `T` and `B`.
> 8. **Treat UI as a changeable product system.** When a user-facing surface exists, research current examples from the Awwwards nominees (`https://www.awwwards.com/websites/nominees/`), Mobbin latest sites (`https://mobbin.com/discover/sites/latest`), and at least two domain-relevant references; capture URL, access date, observed pattern, subject/user-job fit, and what was rejected. Create a design plan for subject/audience/job, visual identity, semantic tokens, typography, layout, responsive behavior, accessibility, motion, and loading/empty/error/permission states. Classify components as Common, Domain-Shared, or Page; expose a project-owned wrapper contract with stable inputs/outputs and adapters behind it so the underlying UI library can change without page-contract rewrites. Reuse existing components or record why reuse does not fit; never copy a reference site's assets or code without permission.
> 9. **Rank by ROI and reversibility.** For each principle, compare 2–3 viable approaches when the decision is hard to reverse; record benefits, sacrifices, change cost, risk if skipped, cost of delay, and measurable revisit trigger. Distinguish `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, and `BLOCKED`; a named pattern without an applicability decision is incomplete.
> 10. **Handle brownfield gaps without scope laundering.** If the current project already has setup, inspect what can be adopted safely, what conflicts with accepted decisions, and what cannot be applied without broad refactoring. Keep the requested actor-facing outcome bounded; mark safe parts `ADAPT-IN-SLICE`, and record broad work as a separately owned architecture/refactor opportunity with scope, rationale, dependency order, trigger, smallest independently valuable next step, owner, and cost of delay. Attach only enabling work needed by the releasable outcome; if the outcome cannot be safe without the refactor, mark it `BLOCKED` and escalate instead of silently expanding the ticket.
> 11. **Greenfield handoff is blocking.** Before the first implementation plan completes, carry the matrix, accepted decisions, actor/permission matrix, dependency/license register, module/boundary map, provider ports, host/Compose commands, CI/CD and operations plan, and UI design/component plan when applicable into the architecture, scaffold, harness, and plan artifacts. A warranted omission needs an explicit user decision and acceptance criterion; do not hand off on “future-proof” prose alone.
>
> **Required output:** `principle | lifecycle (G/B) | applicability evidence | current state | decision/status | selected approach | alternatives/sacrifices | ROI/change cost | owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until:** lifecycle/profile evidenced · each applicable principle has a decision/status · architecture/module/auth/dependency/infra/ops/UI outputs are present or evidence-backed `NOT-APPLICABLE` · brownfield refactor gaps have an owner and independently valuable next step · greenfield warranted omissions have explicit approval · all claims carry source/config/`file:line` evidence.

<!-- /SYNC:scale-ready-foundation -->

<!-- SYNC:ai-agent-as-user-access -->

> **AI Agent as a First-Class User / Machine-Interaction Contract** — Strong recommendation when creating a greenfield system; optional, evidence-gated advice for a big feature or architecture review. Treat an AI agent as a potential non-human actor with its own identity, authority, tenancy, safety policy, and observable outcomes — not as a trusted administrator or UI automation shortcut. This supplements, never replaces, the shared authorization, API, security, and test contracts.
>
> 1. **Classify the actor and relationship.** From product and threat-model evidence, identify agent personas (user-delegated copilot, tenant automation, platform operator, service agent, integration agent), the human or organization it may act for, tenant/resource scope, trust level, allowed autonomy, data/action budgets, and human approval points. An agent is not automatically the human, tenant administrator, or platform administrator.
> 2. **Make one application capability core.** Express business use cases in a stable application boundary reused by human UI and machine surfaces. API, CLI, MCP, WebMCP, webhook/event, SDK, or batch adapters may translate contracts, but must not duplicate domain rules or bypass validation/authentication/authorization. Name and version contracts by purpose, use machine-readable input/output schemas, stable error codes, idempotency for retries, pagination or asynchronous status where needed, timeouts/cancellation, correlation IDs, quotas/rate limits, and deprecation policy.
> 3. **Choose surfaces by evidence.** Use API/OpenAPI for remote machine integrations (`https://spec.openapis.org/oas/latest.html`); CLI for local/operator/automation; MCP for LLM-host discovery of tools, resources, and prompts; WebMCP for a browser-integrated agent when an applicable browser/runtime supports it; webhooks/events for push integration; SDK only when it lowers consumer cost. Evaluate relevant surface(s) and record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, or `BLOCKED`; never build all surfaces without a user/job and owner.
> 4. **MCP contract.** When MCP is applicable, expose least-privilege, capability-oriented tools/resources/prompts over currently supported transports (stdio for local, Streamable HTTP for remote, or another explicitly justified adapter). Tool names and descriptions are concise and truthful; input/output schemas, structured results/errors, pagination, deterministic discovery, progress/cancellation, long-running task polling, idempotency, and audit/tool-call IDs are explicit. Use the official specification (`https://modelcontextprotocol.io/specification/`) and authorization guidance (`https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`) as the current protocol references.
> 5. **WebMCP is progressive enhancement.** When a web surface and browser-agent support exist, expose narrow page capabilities through the current WebMCP draft API behind a project-owned adapter; never make the domain or primary API contract depend on a draft/browser-only feature. Register only safe, purpose-named tools, validate at server-side/application boundaries, and test direct tool execution against the UI path. Treat tool metadata, page content, and tool output as untrusted input; defend against prompt/output injection and confused-deputy behavior. The official WebMCP page currently labels the proposal a Draft Community Group Report, not a W3C Standard or Standards Track feature (`https://webmachinelearning.github.io/webmcp/`).
> 6. **Secure every agent path.** Give agents distinct authentication and authorization. Resolve delegated human, organization, service-account, or integration identity; enforce deny-by-default, least privilege, tenant/resource scope, action-specific permissions, expiry/revocation, rate/usage budgets, replay/idempotency protection, and separation of duties at the application boundary. No agent self-granting, client-supplied role/tenant claims, privilege escalation, or inbound-token passthrough to downstream services. High-impact, destructive, financial, or privacy-sensitive actions require explicit consent, preview/dry-run, or step-up policy unless an approved autonomous policy says otherwise.
> 7. **Make consent and audit inspectable.** Record who/what acted (agent identity, delegating principal, tenant, client/host, model/session/run where available), capability/tool/action, redacted inputs, policy/consent decision, result/error, correlation ID, and timestamp. Provide discoverable scopes, tool permissions, revoke/rotate paths, and human-visible confirmation for high-impact actions. Keep agent output/data boundaries and retention explicit.
> 8. **Operate it like a product surface.** Document onboarding/discovery, credentials, environment, schema/version compatibility, examples, rate/timeout/error behavior, partial-failure/retry semantics, long-running jobs, support/deprecation, and safe rollback. Monitor adoption, denied calls, latency, errors, retries, quota/cost, sensitive-data exposure signals, and anomalous behavior; provide runbooks and kill/revoke controls.
> 9. **Test the contract and equivalence.** Every agent-facing contract test uses explicit `Given` → `When` → `Then` and names the business intent/technical contract; verify allowed/denied/cross-tenant paths, schema compatibility, the same outcome as the human/API path, idempotent retries/replay, prompt/output injection, unsafe tool descriptions, authorization expiry/revocation, pagination, timeout/cancellation, rate limits, and audit records. Assert the outcome owned by the application, not only tool-call or transport bookkeeping.
> 10. **Apply lifecycle scope correctly.** Greenfield must produce an agent actor/access matrix, selected surfaces and rationale, capability contracts, threat/consent model, test/observability plan, and explicit owner before the first implementation plan; a warranted omission requires an explicit decision/acceptance. Big-feature and architecture-review use this as optional advice: inspect existing setup and advise only when agent use is evidenced or a future contract is accepted; safely adapt in the slice, or create an owned `DEFER-AS-OPPORTUNITY` with owner, trigger, dependency order, smallest next step, and cost of delay. If safety/correctness requires the work, mark `BLOCKED`; never silently turn a feature into an agent-platform refactor.
>
> **Required output:** `agent/persona | relationship/delegation | identity/authn | tenant/resource scope | capabilities/actions | selected surface(s) | contract/version | consent/safety | observability/audit | status/owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until (when applicable/selected):** actor and authority are explicit · each exposed capability has an owner, schema, authz, safety policy, and observable outcome · the selected API/CLI/MCP/WebMCP adapter reuses the application capability core · allowed/denied/cross-tenant paths and high-impact controls are tested · version/discovery/rollback/telemetry are planned · greenfield omissions are explicitly accepted; otherwise record evidence-backed `NOT-APPLICABLE` or `DEFER-AS-OPPORTUNITY`.

<!-- /SYNC:ai-agent-as-user-access -->

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Do not infer a trimmed variant or skip gates that the selected manifest does not authorize.

---

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. For every potentially applicable tier — Unit, Integration/System, E2E, and Performance/Scale (warranted at `T1+`/`B2+`) — record `APPLICABLE` only with evidence of its runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage.
>
> 0. **Given / When / Then is mandatory for every assertion-bearing test.** Every Unit, Integration/System, E2E, Performance/Scale, contract, architecture, security, accessibility, visual, property, mutation, and harness test must expose one explicit scenario: `Given` = actor/input/precondition/fixture/environment · `When` = the behavior, request, event, check, or workload trigger · `Then` = the observable business/technical outcome, invariant, error/access decision, visual state, or asserted budget. Use `And` only as a continuation. Framework-native BDD blocks, named helpers, or comments are valid representations; bare `Arrange/Act/Assert` is insufficient unless those three phases are also labeled `Given/When/Then`.
>    Record `Business Intent / Invariant Guarded` (or the technical contract being checked), keep one behavior per case, and split unrelated outcomes. `Then` asserts the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** Record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/Windows entry point (a `.cmd` when the project needs one), the **host-mode AND container-mode commands** where the project supports both, and the **environment reach** (which of local / CI / production-shaped this tier can target).
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses only configured browser/service commands. Before every browser/UI E2E operation on a UI control, use the canonical bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable blocking error-alert absence; after the operation, use it for the expected positive/negative postcondition or error-alert state, then wait exactly **500ms** at the end. The delay is presentation pacing, never a readiness or settle mechanism, and applies to automation as well as visible human-QC.
> 2a. **E2E object-model gate (when E2E is applicable):** Build and reuse a three-tier test object model — **Common components** for cross-feature controls, **Domain-Shared components** for reusable domain behavior, and **Page components/objects** for page-specific composition. Each object records its tier, owner, and base abstraction.
> 2b. **E2E abstraction and DRY gate:** Use an idiomatic abstract base class or language-equivalent protocol/trait for shared lifecycle, locator, readiness, and pacing behavior; centralize purpose-specific utilities/helpers for data, auth, and evidence; keep assertions in tests. Reuse or compose existing objects before creating new ones, keep one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a finding; extract at 3+ similar implementations.
> 2c. **E2E test layering:** Test a reusable Common or Domain-Shared component contract once, then let Page tests cover page-specific composition and outcomes; do not copy lower-tier component cases into every Page test.
> 2d. **E2E wait-until gate:** The object model MUST expose or compose one reusable `waitUntil(condition, options)` utility accepting a positive or negative boolean/async predicate, bounded timeout/poll settings, and a diagnostic description. Before each action wait for a ready/actionable control and the applicable error-free precondition; after each action wait for the expected state transition, dropdown/options visibility, selected state, or expected error-alert presence/absence. Keep the final business assertion in the test and fail with the wait diagnostics on timeout.
> 3. **Fresh valid state:** Each run/test owns a unique run identity and business-data suffix, arranges through supported public paths, and uses realistic valid data. Reference setup is count-before-create, idempotent, and restart-safe. Intentional accumulation is additive, keyed, and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** Isolate mutable roots and parallel workers; share only immutable/reference data. Preserve real actor pacing and observable arrange barriers. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, identity, seed/accumulation mode, exact result, and repeat proof. For each applicable persistent-state suite, require two consecutive no-reset full runs. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, and behavior coverage signals.
> 6. **Execution modes and environment reach:** A tier claiming two run modes must have **BOTH exercised** — the bare-host command and the fully-containerized command, driven from ONE source of truth for config and topology; record which mode CI exercises, because an unexercised mode rots silently and a claimed-but-rotten mode is worse than one never claimed. The SAME suite must reach local, CI and (where warranted) a production-shaped target, **parameterized by configuration, never by forked test code** — only one fork ever stays maintained, so forking guarantees divergence. A target lacking a required capability reports `ENVIRONMENT-BLOCKED`, never a silent pass. Tests unsafe against production are excluded by an **ENFORCED** mechanism whose absence fails loudly, not by a convention someone must remember; *"runs in prod"* means a safe, declared, **NON-MUTATING** subset. Reproducibility underwrites all of it — pinned toolchain, locked dependencies, declared external prerequisites — which is the difference between a suite that passes anywhere and one that passes on its author's machine. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Every assertion-bearing test entry point — Unit, Integration/System, E2E, Performance/Scale, contract, architecture, security, accessibility, visual, property, mutation, and harness — uses explicit `Given` → `When` → `Then` sections (framework-native BDD, named helpers, or comments; bare AAA is insufficient), names `Business Intent / Invariant Guarded` or the technical contract, and asserts an owned outcome rather than only internal calls, setup side effects, or infrastructure bookkeeping. Convert touched brownfield cases; assign an owner and next step for broad legacy migration; block safety-critical cases with an ambiguous or missing phase.

**MUST ATTENTION** Before implementation, record evidence-backed Unit/Integration/System/E2E **and Performance/Scale** (`T1+`/`B2+`) applicability (or explicit N/A), copy-ready full + focused commands, zero-match behavior, a simple/Windows entry point, **the host-mode AND container-mode commands where both are supported, plus each tier's environment reach (local / CI / production-shaped)**, unique run identity, realistic valid data, idempotent/restart-safe reference setup, intentional additive accumulation, parallel isolation, exact results, and two no-reset full runs for each applicable persistent-state suite. **Both claimed run modes must be EXERCISED** (an unexercised mode rots; a claimed-but-rotten mode is worse than one never claimed), the same suite reaches every target **parameterized by config, never by forked test code**, a missing capability reports `ENVIRONMENT-BLOCKED` rather than passing silently, and *"runs in prod"* means a safe, declared, **NON-MUTATING** subset excluded by an enforced mechanism, not by convention. For applicable browser/UI E2E, every UI-control operation also uses the canonical bounded `waitUntil(condition, options)` helper before the action for readiness/actionability and applicable error-alert absence, then after the action for the expected positive/negative state, dropdown/options, selected state, or error-alert presence/absence, followed by the mandatory post-operation **500ms** presentation delay. The object model still requires three-tier Common/Domain-Shared/Page reuse with an idiomatic abstract base, cohesive helpers/utilities, and reusable lower-tier component tests.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:scale-ready-foundation:reminder -->

**IMPORTANT MUST ATTENTION** `scale-ready-foundation`: classify G/B + scale/criticality from evidence; choose the smallest architecture that supports measured needs; make modules, authorization, provider ports, free/license-compliant dependencies, host + Docker Compose execution, CI/CD/operations, and UI component contracts explicit when applicable. Greenfield warranted omissions block handoff; brownfield gaps become `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY` with owner/trigger/next step, `NOT-APPLICABLE`, or `BLOCKED` — never silent scope expansion. Emit the decision matrix with evidence, ROI, sacrifices, owner, and revisit trigger.

<!-- /SYNC:scale-ready-foundation:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, explicit Given → When → Then contract tests, and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete greenfield inception from an owner-approved capability boundary—using embedded large-idea decomposition when triggered, or an explicit roadmap only when requested—through a releasable first vertical outcome, reviewed enabling foundation, test architecture contract, implementation, integration verification, conditional E2E evaluation, final full/focused verification, and handoff without skipping gates.
**IMPORTANT MUST ATTENTION Main steps:** classify/decompose → research → domain/tech/architecture + test contract → scenario/plan/review → PBI/story/mock-up/spec gates → scaffold/lint/harness/architecture review → implementation/integration verification → conditional early E2E → final full/focused verification → final review → required near-end `workflow-e2e` → security/test/docs/handoff.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/releasable-pbi-contract.md`: no standalone technical/foundation/setup PBI; UI PBIs must include all required pages/views, navigation, components, states, and a connected mock-app demo.
**IMPORTANT MUST ATTENTION** apply `SYNC:scale-ready-foundation` before PLAN₁: greenfield foundations are blocking; record architecture, actors/permissions, dependency/license, provider-port, host + Docker Compose, CI/CD/operations, and UI component-contract decisions with evidence, ROI, owner, and revisit triggers.
**IMPORTANT MUST ATTENTION** strongly recommend `SYNC:ai-agent-as-user-access` before PLAN₁: model AI agents as potential users, select warranted API/CLI/MCP/WebMCP/event/SDK surfaces over one capability core, and record identity/delegation, authorization, safety/consent, audit/observability, GWT tests, owner, and revisit trigger; an omission must be explicit and evidence-backed.
**IMPORTANT MUST ATTENTION** test format: every assertion-bearing test uses explicit `Given` → `When` → `Then`, names the guarded intent/technical contract, and asserts an owned outcome; safety-critical ambiguity blocks handoff.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested, one task `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `tmp/reports/` per file, never hold in memory.
- **Sub-Agent Return Contract:** return summary only (≤10 bullets), full detail to disk.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes.
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
## Common AI Mistake Prevention (System Lessons)

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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
