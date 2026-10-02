---
name: workflow-big-feature
version: 1.2.0
description: '[Workflow] Use when implementing a large, ambiguous, or research-driven feature.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** ship a large, ambiguous or research-heavy feature in an existing codebase as a bounded, independently releasable actor-facing outcome — researched only as deep as the idea needs, then designed, specified, planned, built, reviewed and closed with evidence.

**Use when** scope or value is unclear, several outcomes or modules are involved, or research must precede the build decision. A clear, bounded change across modules → `workflow-feature`. An existing spec that only needs building → `workflow-implement-spec`. Greenfield → `workflow-greenfield-init`.

**Confirmation gate:** `activation: confirm`. When the AI routes here on its own, it MUST first ask the route gate's one workflow question — this full workflow with its current step count, a slimmer custom route listing its steps, or direct execution — recommending the full workflow only when no leaner route would satisfy the request. An explicit user request for this workflow needs no question. Route mode `auto` asks only when a leaner route would also do; route mode `off` starts it only on an explicit request.

**Workflow:**

1. **Triage** — size, kind, risk and `isLargeIdea`; select the research/design depth (below).
2. **Research & design** — only the stages the triage selects; architecture is always designed and gated.
3. **Specify & plan** — releasable PBIs, stories, Feature Spec, test specs, PLAN₁/PLAN₂, `/plan --mode=validate`.
4. **Build & prove** — optional foundation, implementation, integration tests, spec sync, inline review, near-end E2E, `/test`, `/workflow-end`.

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count alone.
- MUST ATTENTION self-routing stops at the workflow question: show the big-workflow step count, the lighter custom route and direct execution before activation — why: this workflow intentionally spends much more time and context than a bounded feature route.
- MUST ATTENTION gate steps always run; `core`/`optional` steps follow the Step Execution Protocol and every deviation is logged with evidence.
- MUST ATTENTION every research stage that runs is validated with the user before the next stage; every claim cites evidence, confidence >80% to act.
- NEVER skip mandatory workflow or skill gates.

## Size & Kind Triage (FIRST action)

Classify before choosing steps; write the result to the run report.

- **Size band** (guidance): XS 1–3 files · S ≤15 · M ≤60 · L ≤300 · XL >300. A big feature is usually M or larger; an XS/S result with clear intent is likely `workflow-feature` work — say so and ask once before continuing.
- **Kind(s):** behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service.
- **Risk:** irreversible, data, security, cross-module. Risk or ambiguity raises depth; file count alone does not.
- **`isLargeIdea`** `= multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit`, evaluated before any spec, PBI, story or plan. True → the owning artifacts carry the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and its slice IDs flow downstream. False → record `Decomposition Applicability: EXEMPT` with reason and owner. Ordinary runs never write the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); only an explicit roadmap request enters the standalone roadmap skill, and a supplied roadmap is read-only context.
- **Existing specs:** when the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) holds a spec for the affected area, read its ERD, business rules and API contracts before research.
- **Depth selection:** the triage answers each optional step's registry `when` (Tier-2 output); log each skip with its evidence.

## Required Quality Gates

- Plan approved (`plan-approved`) — `/plan --mode=validate` passed on PLAN₂ with explicit evidence; no inferred decision auto-approved
- Spec synced when behavior or a public contract changed (`spec-synced`) — `/spec [mode=sync]` output; spec ↔ test specs ↔ test code agree, each invariant mapped to Section 8 TC IDs
- Tests pass (`tests-pass`) — changed behavior covered by tests that ran green in THIS run (`/integration-test --mode=verify`, `/test`)
- Review converged (`review-converged`) — nested `/workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed
- Architecture gated — the `architecture-gates` barrier returned both reports and they were reconciled (below)
- Releasable PBIs — every PBI is one independently releasable actor-facing outcome (technical work is enabling work under it; UI PBIs carry the full connected mock-app flow, or a recorded `Mockup: SKIPPED by user` from the pre-generation scope gate) per `.claude/skills/shared/releasable-pbi-contract.md`
- Near-end E2E — `/workflow-e2e --source=context` ran after the review, or recorded evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`
- Run closed (`run-closed`) — `/workflow-end` checked every outcome gate

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; the registry (`.claude/workflows.json` → `workflow-big-feature`, delivered in the Tier-2 output) owns every step's role and its `applicability` (`when` / `skipReason`, recorded verbatim on skip). This table lists the non-core roles.

| Step | Role |
| --- | --- |
| `/web-research` | optional |
| `/source-deep-dive` | optional |
| `/market-analysis` | optional |
| `/business-evaluation` | optional |
| `/spec [mode=discovery]` | optional |
| `/domain-analysis` | optional |
| `/why-review` | optional |
| `/tech-stack-research` | optional |
| `/scenario` | optional |
| `/pbi --mode=mockup --explore` | optional |
| `/spec [mode=clarify]` | optional |
| `/scaffold` | optional |
| `/architecture --mode=full` | optional |
| `/scan --target=ui-system` | optional |
| `/scan --target=backend-patterns` | optional |
| `/scan --target=integration-tests` | optional |
| `/scan --target=project-structure` | optional |
| `/plan --mode=validate` | gate |
| `/seed-test-data` | optional |
| `/workflow-review-changes --tests=defer` | gate |
| `/test` | gate |
| `/workflow-end` | gate |

Every other step is `core`: usually run, and it flexes under the step contract only when its outcome is already proven. `/market-analysis` → Market Analysis Applicability below; `/pbi --mode=mockup --explore` → New-UI Explore Mockup below.

## Recommended Skills by Phase

- **Discovery** — `/idea` · earns its cost when: always — pins problem, actors, non-goals · proves / feeds: triage, `isLargeIdea`
- **Research** — `/web-research` → `/source-deep-dive` → `/market-analysis` → `/business-evaluation` · earns its cost when: the triage found external unknowns, an unsized market or an undecided business case · proves / feeds: option set with confidence, go/no-go
- **Domain** — `/spec [mode=discovery]`, `/domain-analysis`, `/why-review` · earns its cost when: existing specs, entity changes, a material decision · proves / feeds: ERD, invariant landscape, scope decision (NEW/EXTEND/SPLIT)
- **Architecture** — `/tech-stack-research`, `/architecture --mode=design`, `architecture-gates` barrier, `/scenario` · earns its cost when: design and its gates always; research and scenario per triage · proves / feeds: scale-ready decision matrix, reconciled gate reports
- **PLAN₁** — `/plan` → `/plan --mode=review` · earns its cost when: strategic plan: boundaries, data flow, tech choices; folding it into PLAN₂ (logged) fits only a single-slice feature · proves / feeds: reviewed architecture plan
- **Backlog** — `/pbi --mode=refine` → `/pbi --mode=review --type=pbi` → `/pbi --mode=story` → `/pbi --mode=review --type=story` → `/pbi --mode=challenge` → `/pbi --mode=dor` → `/pbi --mode=mockup --explore` · earns its cost when: always; mock-up for UI only · proves / feeds: releasable PBIs, DoR-ready stories · reuse: the workflow passes `--reuse=pbi-review` to `/pbi --mode=challenge` and `/pbi --mode=dor` (they re-evaluate only the criteria the `/pbi --mode=review --type=pbi` report did not cover; drop the flag after any PBI edit; standalone runs evaluate every check)
- **Spec** — `/spec` → `/spec [mode=tests]` → `/pbi --mode=review --type=spec-tests` → `/spec [mode=clarify]` · earns its cost when: always; clarify when decisions are open · proves / feeds: Feature Spec, TC IDs per invariant
- **PLAN₂** — `/plan` → `/plan --mode=review` → `/plan --mode=validate` · earns its cost when: always · proves / feeds: sprint-ready plan, `plan-approved`
- **Foundation** — `/scaffold` → `/architecture --mode=full` → `/scan` ×4 · earns its cost when: base abstractions are missing · proves / feeds: reviewed foundation, refreshed reference docs
- **Build** — `/plan --mode=execute` → `/seed-test-data` → `/integration-test` · earns its cost when: always; seed data per triage · proves / feeds: code and tests written, not run
- **Close** — `/spec [mode=sync]` → `/workflow-review-changes --tests=defer` → `/integration-test --mode=verify` → `/workflow-e2e --source=context` → `/test` → `/workflow-end` → `/watzup` · earns its cost when: always · proves / feeds: `spec-synced`, `review-converged`, `tests-pass`, `run-closed`

## Market Analysis Applicability (conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

Record the applicability evidence either way; when skipped because the market is already sized, cite the existing analysis. When `/business-evaluation` runs after a skipped market analysis, it marks every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `/web-research`, `/source-deep-dive`, other selected research stages, or their required user confirmations.

## New-UI Explore Mockup (before the implementation plan)

The `/pbi --mode=mockup --explore` step runs its scope gate first (`pbi --mode=mockup` Step 0 owns the gate, the direction drafts and the pick — main session only, never a delegated sub-agent). Record `Mockup: SKIPPED by user` or the `Selection:` line in the plan or run report; PLAN₂'s UI Layout builds on the selected mockup. A PBI that only adjusts existing views records the explore exemption (all axes adopted) and builds one direction.

## Architecture Gates Parallel Phase (`architecture --mode=scalability` + design-rationale `/why-review`)

Declared as the `architecture-gates` all-return barrier. Both read the finished `/architecture --mode=design` artifacts; neither consumes the other.

1. Launch `/architecture --mode=scalability` as a fresh read-only `architect` sub-agent (brief: `architecture --mode=design`, domain-analysis and tech-stack-research artifact paths); it writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Run the design-rationale `/why-review` INLINE in FULL mode so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. A scalability risk touching a passed decision becomes a WARN carried into `/scenario` and PLAN₁; a why-review FAIL, or a user trade-off answer that changes a decision, blocks `/scenario` until the design is revised and both gates re-run.

## Workflow-Specific Contracts

- **Scale-ready foundation** — at `/architecture --mode=design`, before PLAN₁, apply `SYNC:scale-ready-foundation`: inspect the existing project and emit the applicability/decision matrix; carry accepted decisions into `/plan`, `/scaffold`, `/architecture --mode=full` and implementation. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) are advisory right-sizing in both directions.
- **Brownfield bounds** — a gap needing broad refactoring keeps the PBI's actor journey bounded: `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE` or `BLOCKED` with evidence, owner, trigger and smallest next step; `BLOCKED` when the refactor is required for safety.
- **AI agent as user (optional)** — when evidence makes an agent a potential actor, apply `SYNC:ai-agent-as-user-access`: one capability core, only warranted machine surfaces, never agent = administrator.
- **Two plans** — PLAN₁ is strategic (after architecture); PLAN₂ is tactical (after the test-spec review: stories, test strategy, dependencies, phased tasks). Name tasks `PLAN₁`/`PLAN₂` so the repeated `/plan` and `/plan --mode=review` occurrences stay distinct.
- **Foundation refresh** — when `/scaffold` ran, `/architecture --mode=full` grades it and BLOCKED/WARN findings are fixed before `/plan --mode=execute`; then the four `/scan` targets run INLINE in sequence (each fans out its own sub-agents) as a surgical REFRESH of the project-reference docs (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), creating a doc only when missing; `ui-system` only for a UI foundation. A later fix that changes the foundation re-runs the affected scan before `/plan --mode=execute`.
- **Spec-driven tests** — read `spec-principles.md` in the project-reference docs root before `/pbi --mode=story` and test specs; map every invariant to Section 8 TC IDs; lifecycle flows assert persisted transitions and invalid-transition rejection. Every assertion-bearing test uses the project's native style (GWT when selected or idiomatic) and names the behavior or invariant it guards, so it fails when that intent breaks.
- **Decisions** — 2–4 options with confidence % for each major decision; evaluate the top 3 alternatives before adding a dependency; save artifacts to the plan directory per step.
- **Final `/test`** — pass `--proven=<integration-test --mode=verify report path>` so only the tiers that report does not cover run; the gate still runs and still reports the union.
- **Delegated tail** — the nested `/workflow-review-changes` owns security, performance and production-readiness review, the conditional domain-entity reference refresh and `docs-manager --mode=update`; this workflow does not repeat them. `/workflow-e2e --source=context` stays required after it.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate and pick (`pbi --mode=mockup` Step 0) never run inside a delegated sub-agent. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; tests run once, last, after the static review (`--tests=defer`) — a verify fix re-runs the review, a review fix re-runs the verify (`SYNC:verify-last-order`); `/workflow-end` runs last; `/workflow-review-changes` runs INLINE in the main session; the `architecture-gates` barrier returns in full before `/scenario`; gates awaiting user approval are never parallelized. Recommended: independent read-only research or review in one parallel wave; L/XL targets partitioned into bounded batches per module or outcome slice, one report per batch.

## Memory & Reporting

- One task per selected step, PLAN₁/PLAN₂ named explicitly; the run report under `tmp/reports/` is written FIRST and appended per step or batch.
- After compaction, re-read the report and `TaskList` before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Findings are validated (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero open validated findings (Round-1 LOW closure); from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 3 review rounds; failing tests are uncapped; no progress → `AskUserQuestion`.

## Step Chain

Registry sequence — the recommended default order; this parity line mirrors `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /source-deep-dive -> /market-analysis -> /business-evaluation -> /spec [mode=discovery] -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture --mode=design -> /architecture --mode=scalability -> /why-review -> /scenario -> /plan -> /plan --mode=review -> /pbi --mode=refine -> /pbi --mode=review --type=pbi -> /pbi --mode=story -> /pbi --mode=review --type=story -> /pbi --mode=challenge --reuse=pbi-review -> /pbi --mode=dor --reuse=pbi-review -> /pbi --mode=mockup --explore -> /spec -> /spec [mode=tests] -> /pbi --mode=review --type=spec-tests -> /spec [mode=clarify] -> /plan -> /plan --mode=review -> /scaffold -> /architecture --mode=full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /plan --mode=validate -> /plan --mode=execute -> /seed-test-data -> /integration-test -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

Activate the `workflow-big-feature` workflow. Run `/start-workflow workflow-big-feature` with the user's prompt as context.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `scale-ready-foundation` — Scale-ready foundation and brownfield fit; running greenfield init or a big feature → .claude/skills/shared/protocols/scale-ready-foundation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:scale-ready-foundation:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality; smallest fitting architecture; preserve brownfield decisions. Make applicable module/auth/external-boundary/dependency/execution/CI-operations/UI contracts explicit. Verify supported run/test modes; require dual host/container only when supported/required. Greenfield warranted omissions block handoff; brownfield gaps need owner/trigger/next step or evidenced `NOT-APPLICABLE`/`BLOCKED`. Require no absent Docker/database/UI/distributed capability.

<!-- /SYNC:scale-ready-foundation:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a bounded, independently releasable actor-facing outcome — researched only as deep as the triage requires, architecture-gated, specified, planned, built, reviewed and closed with evidence; ordinary runs never write the product-roadmap artifact.

- **IMPORTANT MUST ATTENTION** triage FIRST (size, kind, risk, `isLargeIdea`) and record it; optional research and design steps run only when their `when` holds, each deviation logged with evidence.
- **IMPORTANT MUST ATTENTION** gates always run: `/plan --mode=validate`, INLINE `/workflow-review-changes`, `/test`, `/workflow-end`; the `architecture-gates` barrier and the near-end `/workflow-e2e --source=context` stay in every run.
- **IMPORTANT MUST ATTENTION** every PBI passes `.claude/skills/shared/releasable-pbi-contract.md`; apply `SYNC:scale-ready-foundation` before PLAN₁; brownfield gaps become owned opportunities or explicit blockers, never silent refactors.
- **IMPORTANT MUST ATTENTION** every research stage that runs is confirmed with the user; every claim cites `file:line` or source evidence, confidence >80% to act.
- **IMPORTANT MUST ATTENTION** tests name the invariant they guard and fail when it breaks; changed behavior is proven by tests that ran green in this run.
