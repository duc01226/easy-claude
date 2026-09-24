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

## Quick Summary

**Goal:** [Workflow] Trigger Greenfield Project Init workflow — full waterfall project inception from idea through implementation with a test architecture contract, conditional early E2E evaluation, required near-end `workflow-e2e` verification, and final full/focused verification.

**Summary:**

- Begin with the shared large-idea classification and embedded decomposition contract; run `$scenario` before the first plan when the outcome slices require adversarial risk analysis. A roadmap artifact is not a default greenfield prerequisite.
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
- MUST ATTENTION classify the greenfield idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before market research, architecture, specs, PBIs, or plans. When true, require the complete embedded `large_idea_decomposition` block in the owning PBI/spec with `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`, then carry stable slice IDs into stories, mock-ups, and the all-PBI presentation; run `$scenario` only when the selected scope needs adversarial risk analysis, otherwise record the conditional skip with evidence. An explicit roadmap request may use the standalone writer separately.
- MUST ATTENTION emit and validate the Test Architecture & Execution Contract matrix before the first implementation plan completes; block handoff when any applicable tier lacks a copy-ready full command, focused command, zero-match behavior, or unique run/data identity, and record evidence-backed `N/A` for non-applicable tiers.
- MUST ATTENTION each assertion-bearing test follows the configured/native test style and clearly identifies the behavior/contract plus owned outcome; use GWT when selected by the project/spec or when it fits the chosen idiom. A warranted greenfield ambiguity blocks; touched brownfield format migration stays an owned opportunity.
- MUST ATTENTION before the first implementation plan completes emit the `SYNC:scale-ready-foundation` applicability matrix and carry accepted architecture, applicable actor/permission, dependency/license, real infrastructure-boundary, supported execution-mode, CI/operations, and UI decisions into scaffold, linter/harness, architecture review, and plan artifacts; a warranted omission is blocking until resolved.
- MUST ATTENTION when evidence warrants AI agents as first-class non-human actors, apply `SYNC:ai-agent-as-user-access`, choose applicable API/CLI/MCP/WebMCP/event/SDK surfaces, and record identity/delegation, capability contracts, safety/consent, audit/observability, tests in the configured style, ownership, or an explicit evidence-backed omission.
- MUST ATTENTION after `$integration-test-verify`, inspect configured E2E evidence and invoke the early `$e2e-test` only when a runnable E2E framework/command is configured; otherwise record explicit evidence-backed `N/A`. Near the end, after `$workflow-review-changes`, invoke the required `$workflow-e2e --source=context` handoff so its nested workflow owns final E2E/screenshot evidence and records `N/A` or `ENVIRONMENT-BLOCKED` honestly. The final `$test` must report full/focused verification and exact results.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                                                          |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `$plan`                              | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and conditional decomposition scenario gate) |
| `$plan`                              | 2nd (pos 30) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests)         |
| `$plan`                              | 3rd (pos 45) | PLAN₃: Integration test architecture plan (post-implementation)                           |
| `$plan-review`                       | 1st (pos 15) | Review PLAN₁ architecture (immediate gate; its parallel why-review sub-agent owns PLAN₁ rationale) |
| `$plan-review`                       | 2nd (pos 18) | Re-review PLAN₁ after the parallel architecture-security + performance analysis; sole PLAN₁ writer                        |
| `$plan-review`                       | 3rd (pos 31) | Review PLAN₂ implementation                                                               |
| `$plan-review`                       | 4th (pos 46) | Review PLAN₃ integration tests                                                            |
| `$security-review --report-only`     | 1st (pos 16) | Architecture security review (occurrence `architecture-security-review`; parallel with `$performance-review --report-only` pos 17, occurrence `architecture-performance-review`) |
| `$security-review`                   | 2nd (delegated) | Production readiness security review — owned by the nested `$workflow-review-changes` occurrence (removed from this sequence) |
| `$spec [mode=tests]`                 | 1st (pos 27) | TDD-SPEC₁: Feature test specs (before implementation)                                     |
| `$spec [mode=tests]`                 | 2nd (pos 43) | TDD-SPEC₂: Post-implementation test spec update                                           |
| `$artifact-review --type=spec-tests` | 1st (pos 28) | Review TDD-SPEC₁                                                                          |
| `$artifact-review --type=spec-tests` | 2nd (pos 44) | Review TDD-SPEC₂                                                                          |
| `$e2e-test`                          | (conditional, pos 49) | Run after integration-test-verify only when E2E is configured; otherwise record evidence-backed N/A |
| `$test`                              | 1st (pos 50) | Test after integration tests and conditional early E2E evaluation                         |
| `$workflow-e2e --source=context`     | required (pos 52) | Near-end nested E2E workflow after workflow-review-changes; it owns visual screenshot review by default and records N/A/blocked evidence |
| `$test`                              | 2nd (pos 53) | Final full/focused test verification (occurrence `final-test`)                            |
| `$domain-entities-review`            | 1st (delegated) | DDD quality review — owned by the nested `$workflow-review-changes` occurrence (removed from this sequence); conditional on domain entity files changing |
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

1. Launch the pre-coding `$why-review` (pos 40) FIRST as a fresh read-only `code-reviewer` sub-agent in FULL mode. Its inputs are PLAN₂, the reviewed foundation source, and the `$architecture-review-full` report — it does not read, wait on, or regenerate the project-reference docs (root default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) the in-flight scans derive; a missing or stale reference doc there is expected, recorded as `NOT VERIFIABLE`, and never a trigger for `$scan` or `$project-init`. It returns any Trade-Off Interrogation questions unanswered; the orchestrator asks them by asking the user directly after the barrier and never self-approves a one-way door.
2. Run the four `$scan` steps INLINE in order while it is active — the barrier holds one spawned sub-agent plus this inline scan chain; each scan fans out its own sub-agents from the orchestrator, so a scan is never dispatched as a sub-agent. The four scans write disjoint reference docs. Skip `--target=ui-system` (with a logged reason) when the project has no UI stack.
3. Advance to `$plan-execute` only after ALL members return. If the why-review FAILs and forces a foundation change, fix it and re-run every `$scan` whose reference doc covers the changed area before `$plan-execute`.

---

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $security-review --report-only -> $performance-review --report-only -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $linter-setup -> $harness-setup -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $why-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $integration-test -> $integration-test-verify -> $e2e-test -> $test -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $security-review --report-only -> $performance-review --report-only -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $linter-setup -> $harness-setup -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $why-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $integration-test -> $integration-test-verify -> $e2e-test -> $test -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

> **[BLOCKING]** Each selected step MUST ATTENTION invoke its skill invocation — marking a selected task `completed` without skill invocation is a workflow violation. A declared conditional step such as `$scenario` may be marked skipped only with evidence and an explicit reason; NEVER batch-complete validation gates.

Activate the `workflow-greenfield-init` workflow. Run `$start-workflow workflow-greenfield-init` with the user's prompt as context.

**Steps:** $idea → $web-research → $deep-research → $market-analysis → $business-evaluation → $spec-discovery → $domain-analysis → $why-review → $tech-stack-research → $architecture-design → $architecture-scalability-review → $why-review → $scenario → $plan → $plan-review → $security-review --report-only → $performance-review --report-only → $plan-review → $refine → $artifact-review --type=pbi → $story → $artifact-review --type=story → $pbi-challenge → $dor-gate → $pbi-mockup → $plan-validate → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec-clarify → $plan → $plan-review → $scaffold → $linter-setup → $harness-setup → $architecture-review-full → $scan --target=ui-system → $scan --target=backend-patterns → $scan --target=integration-tests → $scan --target=project-structure → $why-review → $plan-execute → $seed-test-data → $spec [mode=tests] → $artifact-review --type=spec-tests → $plan → $plan-review → $integration-test → $integration-test-verify → $e2e-test → $test → $workflow-review-changes → $workflow-e2e --source=context → $test → $workflow-end → $watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `$workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.

> **[BLOCKING TEST ARCHITECTURE HANDOFF GATE]** During `$architecture-design`, emit the Test Architecture & Execution Contract matrix before the first `$plan` completes. Before `$plan-execute` or any feature-implementation handoff, validate every potentially applicable Unit, Integration/System, and E2E row: `APPLICABLE` requires evidence-backed runner/framework/configuration, copy-ready full and focused commands, zero-match behavior, and unique run/data identity; missing any of these blocks handoff. Record `N/A — <evidence>` for every non-applicable tier; never substitute an assumption for missing evidence.

> **[CONDITIONAL EARLY + REQUIRED NEAR-END E2E GATES]** Immediately after `$integration-test-verify`, inspect `docs/project-config.json` → `e2eTesting` and the matching runnable framework, entry points, and commands. When configured, invoke the early `$e2e-test`; otherwise complete that conditional step as `N/A — <evidence>` citing the configuration and repository scan, without fabricating browser setup. After `$workflow-review-changes`, invoke the required `$workflow-e2e --source=context` handoff; its nested workflow resolves configured E2E scope and applies visual review/evidence when the request or project contract requires it, preserving any project-required visual gate. It records `N/A` or `ENVIRONMENT-BLOCKED` when the applicable capability is absent. When the implementation exposes a configured or likely observable surface, the nested workflow owns the corresponding `$experience-review`; a relevant surface without a runnable/inspectable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS. The following final `$test` step performs full/focused verification and reports exact results and exit status for each applicable tier.

> **Architecture quality gate (`$architecture-scalability-review`, pos 11).** Immediately after `$architecture-design` and before the first `$plan`, greenfield runs the architecture & scalability scorecard (init mode) so its findings and gate items feed the implementation plan. This is the comprehensive project-quality evaluation for greenfield/init — Build & CI scalability, architecture pattern (modular monolith vs. microservices / distributed-monolith avoidance), module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction/easy-to-change, clean architecture, and observability/DevOps. Brownfield or day-to-day audits invoke the same skill on demand via `$architecture-scalability-review mode=audit`; it is intentionally NOT a member of the every-change `workflow-review-changes` batch — that batch's `architecture-review` step carries the lightweight per-change scalability & coupling regression check instead.

<!-- SYNC:scale-ready-foundation -->

> **Scale-Ready Foundation & Brownfield Fit** — Use this protocol only in `workflow-greenfield-init` and `workflow-big-feature`; it supplements, never replaces, `SYNC:engineering-foundation-gate`, `SYNC:scale-technique-gate`, `SYNC:design-system-check`, and `shared/sdd-artifact-contract.md`. Optimize for a system that can grow and change safely, not for a fashionable architecture.
>
> 1. **Classify lifecycle and evidence first.** Mark `G` greenfield (foundation being created) or `B` brownfield (existing project); record scale `T0`–`T3`, business criticality `B0`–`B3`, repository/module shape, user-facing surfaces, and current setup with `file:line`/config/CI evidence. Unknowns stay explicit and take the lower warranted tier; never invent a greenfield baseline for an existing project.
> 2. **Choose the smallest architecture that satisfies measured needs.** For a greenfield business application, evaluate a modular monolith when one release boundary fits and there is no evidenced need to split deployment, scaling, compliance, availability, or runtime; select it only when its boundaries fit the domain and operating constraints. Preserve accepted decisions and architecture on brownfield work unless a requirement justifies a reviewed migration. Evaluate Clean/Hexagonal, DDD, and event-driven patterns only where their preconditions fit; add distributed services, event sourcing, sagas, or other costly machinery only for a named need. Record dependency direction, data ownership at service boundaries, and any useful decomposition trigger.
> 3. **Make applicable module boundaries cheap to change.** When the project has modules or bounded capabilities, name their responsibilities and contracts; organize business modules around capabilities where that matches the domain, not merely tables, vendors, or technical layers. Respect the configured in-process and service boundaries; do not bypass another independently owned service's private data contract. Keep shared libraries domain-neutral, and add boundary checks when they are useful and supported by the stack.
> 4. **Design authorization from actors, not a role enum.** For SaaS or multi-tenant scope, enumerate applicable human, organization, platform, service-account, integration, webhook, and background-job actors (for example: visitor, member, tenant administrator, support/operator, platform administrator, service identity); derive the list from the product and threat model rather than assuming it. For every actor record authentication, tenant/resource scope, actions, role assignment/delegation, deny-by-default and least privilege, separation of duties, admin/impersonation/break-glass controls, and audit evidence. Verify allowed, denied, and cross-tenant isolation paths.
> 5. **Keep infrastructure replaceable without leaking vendors.** Put each real external boundary behind a purpose-named port/interface and provider adapter; keep SDK, framework, database, queue, and transport types out of domain/application contracts; compose implementations at the outer boundary; and add abstractions only where a real boundary or substitution need exists. A claimed swap must identify the stable contract, migration seam, and remaining provider-specific cost.
> 6. **Research new or materially changed dependencies and enforce the cost constraint.** Compare current authoritative evidence for fit, maintenance, security, interoperability, upgrade path, license obligations, and total cost. Respect existing approved dependencies unless the change reopens them. When the requirement is free/no paid license, reject paid license or usage-fee choices unless the user explicitly approves an exception; verify upstream license text and machine-readable SPDX metadata. Record material attribution, copyleft/patent/redistribution obligations, and operating costs; do not turn dependency inventory into speculative replacement work.
> 7. **Make the supported execution and operations reproducible.** Identify the project's required developer, test, and deployment modes from its runtime, team, CI, and target platform. Use one source of truth for shared configuration/topology; when both host and container modes are supported or required, exercise both. Use containers/Compose when they fit the project or its dependencies; document and verify the supported native, device, managed, or other mode when containerization does not fit. Plan CI/CD, migrations, rollback, observability, runbooks, and recovery according to project scale, risk, platform, and data durability; mark irrelevant capabilities `NOT-APPLICABLE` with evidence.
> 8. **Treat each user-facing surface as part of its product.** When UI design decisions need references, use current examples appropriate to the target platform, audience, and domain; record the source, access date, observed pattern, fit, and what was rejected. Define visual language, interaction states, accessibility, and responsive behavior only where relevant to the surface. Follow the project's configured design system and component/module ownership; if none exists, document the actual owners and the smallest useful conventions without inventing tiers, wrapper contracts, tokens, or breakpoints. Reuse components when they fit; never copy a reference site's assets or code without permission.
> 9. **Rank by ROI and reversibility.** For each principle, compare 2–3 viable approaches when the decision is hard to reverse; record benefits, sacrifices, change cost, risk if skipped, cost of delay, and measurable revisit trigger. Distinguish `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, and `BLOCKED`; a named pattern without an applicability decision is incomplete.
> 10. **Handle brownfield gaps without scope laundering.** If the current project already has setup, inspect what can be adopted safely, what conflicts with accepted decisions, and what cannot be applied without broad refactoring. Keep the requested actor-facing outcome bounded; mark safe parts `ADAPT-IN-SLICE`, and record broad work as a separately owned architecture/refactor opportunity with scope, rationale, dependency order, trigger, smallest independently valuable next step, owner, and cost of delay. Attach only enabling work needed by the releasable outcome; if the outcome cannot be safe without the refactor, mark it `BLOCKED` and escalate instead of silently expanding the ticket.
> 11. **Greenfield handoff is blocking for warranted foundation decisions.** Before the first implementation plan completes, carry the matrix, accepted decisions, applicable actor/permission model, dependency/license choices, module/boundary map, real external ports, supported execution commands, CI/CD and operations plan, and UI decisions when applicable into architecture, scaffold, harness, and plan artifacts. A warranted omission needs evidence and an owner-visible disposition; do not require host/Compose modes, modules, UI, or infrastructure that the project does not use.
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
> 9. **Test the contract and equivalence.** Every agent-facing contract test names the business intent/technical contract and expresses its preconditions, action, and owned outcome in the project's native test format; Given/When/Then is one option. Verify allowed/denied/cross-tenant paths, schema compatibility, the same outcome as the human/API path, idempotent retries/replay, prompt/output injection, unsafe tool descriptions, authorization expiry/revocation, pagination, timeout/cancellation, rate limits, and audit records. Assert the outcome owned by the application, not only tool-call or transport bookkeeping.
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

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk; examples include unit, integration/system, E2E, and performance/scale. Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its relevant inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or when it fits the test; otherwise preserve the project's native organization. Property/fuzz tests may describe an input space or generator and the property checked; harness and mutation tests may use their native contract. Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. Keep one behavior per case and split unrelated outcomes. The final assertion must prove the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** For each required test type, record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/platform-appropriate entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses configured browser/service commands and the project's documented synchronization strategy. Browser UI actions should wait for bounded, observable readiness and outcome conditions using runner-native waits or a configured helper; apply action delays only when the project contract specifies them.
> 2a. **E2E organization gate (when E2E is applicable):** Inspect the configured/discovered local test organization and reuse it — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure. Record actual owners and boundaries; describe tiers or base abstractions only when the project uses them. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** Keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner; keep final outcome assertions in the test. Reuse or compose existing helpers/objects before creating new ones, preserve one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a review signal; use occurrence counts only as evidence, and extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** Test reusable shared behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or require lower-tier contract tests when the project has no such model.
> 2d. **E2E synchronization:** Use bounded runner-native waits or the configured project helper for observable preconditions and postconditions where the runner supports them. Include useful timeout diagnostics; keep the final business assertion in the test and avoid fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** Isolate each test/run using the project's supported setup and public paths where applicable. Use unique identities for shared mutable data, realistic valid data for behavior under test, and idempotent/restart-safe setup when fixtures or seeders can persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** When tests touch mutable/shared state, isolate their data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where the behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, relevant identity/data mode, exact result, and repeat proof. For persistent-state suites, verify repeatability without destructive reset at the level required by the project gate. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, or behavior signals when supported by the project's tooling.
> 6. **Execution modes and environment reach:** Exercise each mode and environment the project declares it supports (for example host/container or local/CI); parameterize supported targets when that fits the existing test architecture instead of maintaining needless forks. Record unexercised declared capabilities as a gap. A production-shaped target is applicable only when the project requires it; tests that can reach production need an enforced safe scope, and must report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the project's reproducibility contract requires them. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
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

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

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
