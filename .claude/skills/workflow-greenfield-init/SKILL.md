---
name: workflow-greenfield-init
version: 2.0.0
description: '[Workflow] Use when starting a new project from scratch: waterfall inception from idea through implementation and integration testing.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** take a brand-new product from idea to a reviewed first releasable slice on a verified, right-sized foundation — researched only as deep as the idea needs, then modeled, architected, planned, scaffolded, built, tested, reviewed and closed with evidence. You act as solution architect.

**Use when** no codebase exists yet (planning artifacts may). Existing codebase with a large or ambiguous feature → `workflow-big-feature`. Backlog or spec only, no build → `workflow-idea-to-pbi` / `workflow-idea-to-spec`.

**Confirmation gate:** `activation: confirm`. When the AI routes here on its own, it MUST first ask the route gate's one workflow question — this full workflow with its current step count, a slimmer custom initialization route listing its steps, or direct execution — recommending the full workflow only when no leaner route would satisfy the request. An explicit user request for this workflow needs no question. Route mode `auto` asks only when a leaner route would also do; route mode `off` starts it only on an explicit request.

**Workflow:** triage → discover & model (idea, triaged research, domain, stack, architecture + gates) → plan & backlog (PLAN₁, releasable PBIs, stories, test specs, `/plan --mode=validate`, PLAN₂) → foundation (scaffold, linters, harness, foundation review, reference docs) → build & prove (implementation, integration tests, spec sync, inline review, near-end E2E, the final `/test`, `/workflow-end`).

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count.
- MUST ATTENTION self-routing stops at the workflow question: show the full workflow's step count, the lighter custom route and direct execution before activation — why: greenfield inception is intentionally comprehensive and may be unnecessary for a bounded project setup.
- MUST ATTENTION business and domain before technology — never ask for the tech stack upfront.
- MUST ATTENTION the foundation matrix, the AI-agent-access decision and the Test Architecture & Execution Contract block implementation until complete.
- NEVER skip mandatory workflow or skill gates; cite evidence for every claim, confidence >80% to act.

## Size & Kind Triage (FIRST action)

Classify before choosing steps and write the result to the run report; it answers every optional step's `when`.

- **Scale** — prototype/internal tool (S: one team, known domain, low stakes) · product (M/L: external users, business case) · platform (XL: several products, teams or tenants). Scale sets research depth, the performance review and the foundation's weight; never force heavyweight architecture onto a small target.
- **UI surface** — none → skip `/pbi --mode=mockup`, `/scan --target=ui-system` and the design gate.
- **Market research** — commercial product, unfamiliar domain or missing owner facts → `/web-research` + `/source-deep-dive`; a market to size → `/market-analysis`; value not yet accepted → `/business-evaluation`. A mandated internal tool with owner-supplied facts skips all four.
- **Criticality** — auth, secrets, money, PII, regulated data or network exposure → architecture `/security-audit`; product/platform scale or declared latency/throughput/volume needs → architecture `/performance-review`.
- **`isLargeIdea`** `= multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit`, evaluated before any spec, PBI, story or plan. True → the owning PBI/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`), its stable slice IDs flow into stories, mock-ups and the PBI presentation, and `/scenario` runs when the scope needs adversarial analysis. False → record `Decomposition Applicability: EXEMPT` with reason and owner. Ordinary runs never write the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); only an explicit roadmap request enters the standalone roadmap skill, and a supplied roadmap is read-only context.
- **Test tiers** — which of Unit, Integration/System and E2E apply; this drives the integration-test and E2E steps.

## Required Quality Gates

Each gate names the evidence that proves it:

- **Foundation decided (before PLAN₁ completes)** — `SYNC:scale-ready-foundation` applicability matrix (architecture, actors/authorization, dependency/license, real infrastructure boundaries, execution modes, CI/operations, UI when applicable) plus the `SYNC:ai-agent-as-user-access` decision, or an explicit evidence-backed omission; carried into scaffold, harness, foundation review and plans.
- **Test Architecture & Execution Contract (before `/plan --mode=execute`)** — emitted during `/architecture --mode=design`; every tier `APPLICABLE` with runner, owner, copy-ready full and focused commands, zero-match behavior, CI gate and unique run/data identity, or `N/A — <evidence>`. A missing field blocks handoff.
- **Releasable PBIs** — every PBI passes `.claude/skills/shared/releasable-pbi-contract.md`: one actor-facing outcome, foundation work attached as enabling work, UI PBIs with the connected multi-view mock-app flow.
- **`plan-approved`** — `/plan --mode=validate` passed with explicit evidence; no inferred decision auto-approved.
- **Foundation reviewed** — `/architecture --mode=full` BLOCKED/WARN findings fixed before `/plan --mode=execute`.
- **`spec-synced`** (behavior diverged from the authored specs) — `/spec [mode=sync]` output; spec, test specs and test code agree.
- **`tests-pass`** — changed behavior covered by tests that ran green in THIS run; the final `/test` reports commands, exact results and exit status per applicable tier. Each assertion-bearing test uses the project's native style (Given/When/Then when selected or idiomatic), names the behavior or invariant it guards, and fails when that intent breaks.
- **`review-converged`** — nested `/workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed.
- **Near-end E2E** — `/workflow-e2e --source=context` ran after the review, or recorded evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`.
- **`run-closed`** — `/workflow-end` checked every outcome gate.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this list summarizes the non-core roles in `.claude/workflows.json`, whose `when`/`skipReason` text is recorded verbatim on skip.

- **Gates (always):** `/plan --mode=validate` · `/workflow-review-changes --tests=defer` · the final `/test` (after E2E) · `/workflow-end`.
- **Optional — research:** `/web-research`, `/source-deep-dive` (research needed) · `/market-analysis` (a market to size; when skipped, `/business-evaluation` marks market figures N/A) · `/business-evaluation` (value undecided) · `/spec [mode=discovery]` (existing specs or code).
- **Optional — design and backlog:** `/scenario` (`isLargeIdea` or adversarial risk) · `/security-audit --report-only` (criticality) · `/performance-review --report-only` (scale or declared need) · PLAN₁ re-review `plan-architecture-rereview` (a risk review returned findings) · `/pbi --mode=mockup` (UI) · `/spec [mode=clarify]` (open spec decisions).
- **Optional — foundation and build:** `/scaffold` (no base abstractions yet) · `/scan --target=ui-system` (UI stack) · `/seed-test-data` (persistent state or seeded test/demo data) · post-implementation `/spec [mode=tests]` + `/pbi --mode=review --type=spec-tests` (behavior beyond the initial test specs) · PLAN₃ `plan-integration-tests` + its review (integration architecture spans modules, services, external boundaries or shared data) · `/integration-test`, `/integration-test --mode=verify` (Integration/System tier `APPLICABLE`) · `/e2e-test` (`docs/project-config.json` → `e2eTesting` declares a runnable framework) · `/spec [mode=sync]` (divergence).
- **Core:** everything else, including `/workflow-e2e --source=context`, which stays required after the review.

## Recommended Skills by Phase

- **Discovery** — `/idea` always (problem, actors, non-goals, triage); research chain per triage → option set with confidence, go/no-go.
- **Domain** — `/domain-analysis` (ERD + bounded contexts) then `domain-rationale-review` → entities, invariants, ownership.
- **Architecture** — `/tech-stack-research` (top 3 options per layer) → `/architecture --mode=design` (foundation matrix, test contract) → `architecture-gates` barrier → `/scenario` per triage. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) advise right-sizing in both directions and never change a verdict.
- **PLAN₁** — `plan-architecture` → its review → `architecture-risk-reviews` barrier → re-review when findings exist → reviewed architecture plan.
- **Backlog** — `/pbi --mode=refine` → PBI review → `/pbi --mode=story` → story review → `/pbi --mode=challenge` → `/pbi --mode=dor` → `/pbi --mode=mockup` (UI) → releasable, DoR-ready PBIs. the workflow passes `--reuse=pbi-review` to `/pbi --mode=challenge` and `/pbi --mode=dor` (they re-evaluate only the criteria the `/pbi --mode=review --type=pbi` report did not cover; drop the flag after any PBI edit; standalone runs evaluate every check).
- **PLAN₂** — `/plan --mode=validate` → `test-spec-initial` → its review → `/spec [mode=clarify]` → `plan-implementation` → its review → `plan-approved`, sprint-ready plan.
- **Foundation** — `/scaffold` → `/linter-setup` → `/harness-setup` → `/architecture --mode=full` → `reference-docs-and-rationale` barrier → reviewed foundation, reference docs, pre-coding rationale.
- **Build** — `/plan --mode=execute` → triaged seed data, post-implementation test specs, PLAN₃ → `/integration-test` → `/e2e-test` → code and tests written, not run.
- **Close** — `/spec [mode=sync]` → `/workflow-review-changes --tests=defer` (static) → `/integration-test --mode=verify` → `/workflow-e2e --source=context` → the final `/test` (the one unit/system verify on the final tree: green tests in this run; the mutation check belongs to `/integration-test --mode=verify`, or to the main session when that step is N/A — `/test` is read-only) → `/workflow-end` → `/watzup`.

## Workflow-Specific Contracts

- **Decisions** — 2–4 options with confidence % and evidence per major decision; validate each phase's decisions with the user via `AskUserQuestion` before building on them; never self-approve a one-way door. Save artifacts to the plan directory per step.
- **Occurrence names** — repeated skills are distinct tasks: PLAN₁ `plan-architecture` (system design, boundaries, tech choices) · PLAN₂ `plan-implementation` (stories, test specs, phased tasks) · PLAN₃ `plan-integration-tests` (test structure, data setup, CI) · rationale reviews `domain-rationale-review`, `architecture-rationale-review`, `pre-coding-rationale-review` · `test-spec-initial` / `test-spec-post-impl`.
- **Scaffold** — grep first for base classes, generic interfaces, infrastructure abstractions, utility layers, frontend foundations and DI registrations; found → skip with evidence. Otherwise build them behind interfaces with at least one concrete implementation before any feature story, sized to the triaged scale.
- **Reference docs** — after the foundation review's fixes, the four `/scan` targets derive the project-reference docs (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) from the reviewed foundation, so feature work reads accurate references from day one.
- **E2E** — `/e2e-test` never fabricates browser setup; `/workflow-e2e --source=context` owns final E2E, screenshot and `/experience-review` evidence, and a relevant surface without a runnable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS.
- **Delegated tail** — the nested `/workflow-review-changes` owns production-readiness security, domain-entity quality and integration-test coverage review, the conditional domain-entity reference refresh and `docs-manager --mode=update`; this workflow does not repeat them.
- **Architecture quality** — `/architecture --mode=scalability` runs in init mode (build/CI scalability, architecture pattern, module isolation, dependency discipline, coupling, horizontal scaling, observability).

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; tests run once, last, after the static review (`--tests=defer`) — a verify fix re-runs the review, a review fix re-runs the verify (`SYNC:verify-last-order`); `/workflow-end` runs last; `/workflow-review-changes` runs INLINE in the main session; gates awaiting user approval are never parallelized. S prototypes run mostly inline; L/XL builds partition into bounded batches per module or outcome slice, one report per batch.

Declared all-return barriers — advance only after every member returns:

- **`architecture-gates`** — `/architecture --mode=scalability` as a fresh read-only `architect` sub-agent, plus the design-rationale `/why-review` INLINE in FULL mode so its Trade-Off questions reach the user. A scalability risk on a passed decision becomes a WARN carried into `/scenario` and PLAN₁; a why-review FAIL or a user answer that changes a decision blocks `/scenario` until the design is revised and both re-run.
- **`architecture-risk-reviews`** — the selected `/security-audit --report-only` (`security-auditor`) and `/performance-review --report-only` (`performance-optimizer`) in ONE message over PLAN₁ and the architecture artifacts; each writes only its report, asks nothing and edits nothing. Validate their findings with the user after the barrier; the PLAN₁ re-review is the sole writer of PLAN₁ and surfaces any security-vs-performance conflict instead of resolving it silently.
- **`reference-docs-and-rationale`** — `pre-coding-rationale-review` as a fresh read-only `code-reviewer` sub-agent (inputs: PLAN₂, foundation source, foundation review report; a missing reference doc is `NOT VERIFIABLE`, never a trigger for `/scan`) while the four `/scan` steps run INLINE in order, each fanning out its own sub-agents and writing a disjoint doc. Ask its Trade-Off questions after the barrier; a FAIL that changes the foundation re-runs every affected `/scan` before `/plan --mode=execute`.

## Memory & Reporting

- One task per selected step, named by occurrence; the run report under `tmp/reports/` is written FIRST (triage, then a section per phase) and appended per step or batch.
- After compaction, re-read the report and `TaskList` before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero open validated findings (Round-1 LOW closure); from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 3 review rounds; failing tests are uncapped; no progress → `AskUserQuestion`.

## Step Chain

Registry sequence — the recommended default order, mirroring `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /source-deep-dive -> /market-analysis -> /business-evaluation -> /spec [mode=discovery] -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture --mode=design -> /architecture --mode=scalability -> /why-review -> /scenario -> /plan -> /plan --mode=review -> /security-audit --report-only -> /performance-review --report-only -> /plan --mode=review -> /pbi --mode=refine -> /pbi --mode=review --type=pbi -> /pbi --mode=story -> /pbi --mode=review --type=story -> /pbi --mode=challenge --reuse=pbi-review -> /pbi --mode=dor --reuse=pbi-review -> /pbi --mode=mockup -> /plan --mode=validate -> /spec [mode=tests] -> /pbi --mode=review --type=spec-tests -> /spec [mode=clarify] -> /plan -> /plan --mode=review -> /scaffold -> /linter-setup -> /harness-setup -> /architecture --mode=full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /why-review -> /plan --mode=execute -> /seed-test-data -> /spec [mode=tests] -> /pbi --mode=review --type=spec-tests -> /plan -> /plan --mode=review -> /integration-test -> /e2e-test -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

Activate the `workflow-greenfield-init` workflow. Run `/start-workflow workflow-greenfield-init` with the user's prompt as context.

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Optional steps apply by triage through the step contract; no separate trimmed mode exists.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `scale-ready-foundation` — Scale-ready foundation and brownfield fit; running greenfield init or a big feature → .claude/skills/shared/protocols/scale-ready-foundation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:scale-ready-foundation:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality; smallest fitting architecture; preserve brownfield decisions. Make applicable module/auth/external-boundary/dependency/execution/CI-operations/UI contracts explicit. Verify supported run/test modes; require dual host/container only when supported/required. Greenfield warranted omissions block handoff; brownfield gaps need owner/trigger/next step or evidenced `NOT-APPLICABLE`/`BLOCKED`. Require no absent Docker/database/UI/distributed capability.

<!-- /SYNC:scale-ready-foundation:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->
<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** idea → reviewed first releasable slice on a verified, right-sized foundation, with only the ceremony the triage justifies and no gate skipped.

- **IMPORTANT MUST ATTENTION** triage FIRST (scale, UI, market, criticality, `isLargeIdea`, test tiers) and record it; every skipped optional step logs its registry `skipReason` with evidence.
- **IMPORTANT MUST ATTENTION** before the first `/plan` completes: `SYNC:scale-ready-foundation` matrix and the `SYNC:ai-agent-as-user-access` decision; before `/plan --mode=execute`: a complete Test Architecture & Execution Contract — a missing field blocks handoff.
- **IMPORTANT MUST ATTENTION** every PBI passes `.claude/skills/shared/releasable-pbi-contract.md` — no standalone technical/foundation PBI; UI PBIs carry the connected mock-app flow.
- **IMPORTANT MUST ATTENTION** gates always run: `/plan --mode=validate`, `/workflow-review-changes` (INLINE in the main session), the final `/test`, `/workflow-end`; `/workflow-e2e --source=context` stays required after the review.
- **IMPORTANT MUST ATTENTION** business and domain before technology; validate each phase's decisions with the user and never self-approve a one-way door; cite evidence for every claim, confidence >80% to act.
