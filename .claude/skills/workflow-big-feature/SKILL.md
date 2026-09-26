---
name: workflow-big-feature
version: 1.2.0
description: '[Workflow] Use when implementing a large, ambiguous, or research-driven feature.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** ship a large, ambiguous or research-heavy feature in an existing codebase as a bounded, independently releasable actor-facing outcome — researched only as deep as the idea needs, then designed, specified, planned, built, reviewed and closed with evidence.

**Use when** scope or value is unclear, several outcomes or modules are involved, or research must precede the build decision. A clear, bounded change across modules → `workflow-feature`. An existing spec that only needs building → `workflow-implement-spec`. Greenfield → `workflow-greenfield-init`.

**Workflow:**

1. **Triage** — size, kind, risk and `isLargeIdea`; select the research/design depth (below).
2. **Research & design** — only the stages the triage selects; architecture is always designed and gated.
3. **Specify & plan** — releasable PBIs, stories, Feature Spec, test specs, PLAN₁/PLAN₂, `/plan-validate`.
4. **Build & prove** — optional foundation, implementation, integration tests, spec sync, inline review, near-end E2E, `/test`, `/workflow-end`.

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count alone.
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
- **Depth selection:** the triage answers each optional step's `when` in the table below; log each skip with its evidence.

## Required Quality Gates

| Gate                                                                   | Evidence that proves it                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan approved (`plan-approved`)                                        | `/plan-validate` passed on PLAN₂ with explicit evidence; no inferred decision auto-approved                                                                                                                      |
| Spec synced when behavior or a public contract changed (`spec-synced`) | `/spec [mode=sync]` output; spec ↔ test specs ↔ test code agree, each invariant mapped to Section 8 TC IDs                                                                                                       |
| Tests pass (`tests-pass`)                                              | changed behavior covered by tests that ran green in THIS run (`/integration-test-verify`, `/test`)                                                                                                               |
| Review converged (`review-converged`)                                  | nested `/workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed                                                                                                   |
| Architecture gated                                                     | the `architecture-gates` barrier returned both reports and they were reconciled (below)                                                                                                                          |
| Releasable PBIs                                                        | every PBI is one independently releasable actor-facing outcome (technical work is enabling work under it; UI PBIs carry the full connected mock-app flow, or a recorded `Mockup: SKIPPED by user` from the pre-generation scope gate) per `.claude/skills/shared/releasable-pbi-contract.md` |
| Near-end E2E                                                           | `/workflow-e2e --source=context` ran after the review, or recorded evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`                                                                                                 |
| Run closed (`run-closed`)                                              | `/workflow-end` checked every outcome gate                                                                                                                                                                       |

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table lists this workflow's non-core roles from `.claude/workflows.json`.

| Step                               | Role     | Runs when                                                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `/web-research`                    | optional | external market, standard, regulation or prior-art evidence would change the outcome |
| `/deep-research`                   | optional | web research ran and its top sources need depth                                      |
| `/market-analysis`                 | optional | a commercial market needs sizing (Market Analysis Applicability below)               |
| `/business-evaluation`             | optional | value, viability, cost or priority is still undecided                                |
| `/spec-discovery`                  | optional | specs or related code already exist for the area                                     |
| `/domain-analysis`                 | optional | entities, relationships, ownership or lifecycle state change                         |
| `/why-review`                      | optional | research or domain analysis produced a material decision between alternatives        |
| `/tech-stack-research`             | optional | a new dependency, service or platform capability is under consideration              |
| `/scenario`                        | optional | replay, state, ownership, recovery or failure risks need adversarial analysis        |
| `/pbi-mockup --explore`            | optional | the PBI has a user-facing UI surface; NEW UI → scope gate (3/2/1 or skip), then the chosen explore mockups, user picks (below) |
| `/spec-clarify`                    | optional | the spec leaves open, non-obvious or conflicting decisions                           |
| `/scaffold`                        | optional | the codebase lacks the base abstractions this feature needs                          |
| `/architecture-review-full`        | optional | `/scaffold` built new foundation code                                                |
| `/scan --target=ui-system`         | optional | `/scaffold` built a UI or frontend foundation                                        |
| `/scan --target=backend-patterns`  | optional | `/scaffold` built a new foundation                                                   |
| `/scan --target=integration-tests` | optional | `/scaffold` built a new foundation                                                   |
| `/scan --target=project-structure` | optional | `/scaffold` built a new foundation                                                   |
| `/plan-validate`                   | gate     | always                                                                               |
| `/seed-test-data`                  | optional | new entities or flows need development data for manual QC                            |
| `/workflow-review-changes`         | gate     | always                                                                               |
| `/test`                            | gate     | always                                                                               |
| `/workflow-end`                    | gate     | always                                                                               |

Every other step is `core`: usually run, and it flexes under the step contract only when its outcome is already proven.

## Recommended Skills by Phase

| Phase        | Skills                                                                                                                                  | Earns its cost when                                                                                                  | Proves / feeds                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Discovery    | `/idea`                                                                                                                                 | always — pins problem, actors, non-goals                                                                             | triage, `isLargeIdea`                                         |
| Research     | `/web-research` → `/deep-research` → `/market-analysis` → `/business-evaluation`                                                        | the triage found external unknowns, an unsized market or an undecided business case                                  | option set with confidence, go/no-go                          |
| Domain       | `/spec-discovery`, `/domain-analysis`, `/why-review`                                                                                    | existing specs, entity changes, a material decision                                                                  | ERD, invariant landscape, scope decision (NEW/EXTEND/SPLIT)   |
| Architecture | `/tech-stack-research`, `/architecture-design`, `architecture-gates` barrier, `/scenario`                                               | design and its gates always; research and scenario per triage                                                        | scale-ready decision matrix, reconciled gate reports          |
| PLAN₁        | `/plan` → `/plan-review`                                                                                                                | strategic plan: boundaries, data flow, tech choices; folding it into PLAN₂ (logged) fits only a single-slice feature | reviewed architecture plan                                    |
| Backlog      | `/refine` → `/artifact-review --type=pbi` → `/story` → `/artifact-review --type=story` → `/pbi-challenge` → `/dor-gate` → `/pbi-mockup --explore` | always; mock-up for UI only                                                                                          | releasable PBIs, DoR-ready stories                            |
| Spec         | `/spec` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/spec-clarify`                                                 | always; clarify when decisions are open                                                                              | Feature Spec, TC IDs per invariant                            |
| PLAN₂        | `/plan` → `/plan-review` → `/plan-validate`                                                                                             | always                                                                                                               | sprint-ready plan, `plan-approved`                            |
| Foundation   | `/scaffold` → `/architecture-review-full` → `/scan` ×4                                                                                  | base abstractions are missing                                                                                        | reviewed foundation, refreshed reference docs                 |
| Build        | `/plan-execute` → `/seed-test-data` → `/integration-test` → `/integration-test-verify`                                                  | always; seed data per triage                                                                                         | green tests in this run                                       |
| Close        | `/spec [mode=sync]` → `/workflow-review-changes` → `/workflow-e2e --source=context` → `/test` → `/workflow-end` → `/watzup`             | always                                                                                                               | `spec-synced`, `review-converged`, `tests-pass`, `run-closed` |

## Market Analysis Applicability (conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

Record the applicability evidence either way; when skipped because the market is already sized, cite the existing analysis. When `/business-evaluation` runs after a skipped market analysis, it marks every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `/web-research`, `/deep-research`, other selected research stages, or their required user confirmations.

## New-UI Explore Mockup (before the implementation plan)

The `/pbi-mockup --explore` step runs its **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with `AskUserQuestion` available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope; skip → record `Mockup: SKIPPED by user` and continue); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report. Then Journey Report (`UX-1`) → design-authority read (`UX-2`). When the PBI adds completely new UI — a new page/view, component or dialog — the chosen 1–3 direction drafts are rendered with html-export, each opened in the default browser (`node .claude/scripts/open-report.cjs <draft>`), then, with 2–3 drafts, `AskUserQuestion` offers one option per draft with your evidence-backed recommendation first, labelled `(Recommended)`. The user's pick (or the `Selection:` line) is recorded in `direction-approved.md`, and PLAN₂'s UI Layout builds on the selected mockup. Never pick for the user while they can be asked; drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and PLAN₂. A PBI that only adjusts existing views records the explore exemption (all axes adopted) and builds one direction.

## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `/why-review`)

Declared as the `architecture-gates` all-return barrier. Both read the finished `/architecture-design` artifacts; neither consumes the other.

1. Launch `/architecture-scalability-review` as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths); it writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Run the design-rationale `/why-review` INLINE in FULL mode so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. A scalability risk touching a passed decision becomes a WARN carried into `/scenario` and PLAN₁; a why-review FAIL, or a user trade-off answer that changes a decision, blocks `/scenario` until the design is revised and both gates re-run.

## Workflow-Specific Contracts

- **Scale-ready foundation** — at `/architecture-design`, before PLAN₁, apply `SYNC:scale-ready-foundation`: inspect the existing project and emit the applicability/decision matrix; carry accepted decisions into `/plan`, `/scaffold`, `/architecture-review-full` and implementation. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) are advisory right-sizing in both directions.
- **Brownfield bounds** — a gap needing broad refactoring keeps the PBI's actor journey bounded: `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE` or `BLOCKED` with evidence, owner, trigger and smallest next step; `BLOCKED` when the refactor is required for safety.
- **AI agent as user (optional)** — when evidence makes an agent a potential actor, apply `SYNC:ai-agent-as-user-access`: one capability core, only warranted machine surfaces, never agent = administrator.
- **Two plans** — PLAN₁ is strategic (after architecture); PLAN₂ is tactical (after the test-spec review: stories, test strategy, dependencies, phased tasks). Name tasks `PLAN₁`/`PLAN₂` so the repeated `/plan` and `/plan-review` occurrences stay distinct.
- **Foundation refresh** — when `/scaffold` ran, `/architecture-review-full` grades it and BLOCKED/WARN findings are fixed before `/plan-execute`; then the four `/scan` targets run INLINE in sequence (each fans out its own sub-agents) as a surgical REFRESH of the project-reference docs (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), creating a doc only when missing; `ui-system` only for a UI foundation. A later fix that changes the foundation re-runs the affected scan before `/plan-execute`.
- **Spec-driven tests** — read `spec-principles.md` in the project-reference docs root before `/story` and test specs; map every invariant to Section 8 TC IDs; lifecycle flows assert persisted transitions and invalid-transition rejection. Every assertion-bearing test uses the project's native style (GWT when selected or idiomatic) and names the behavior or invariant it guards, so it fails when that intent breaks.
- **Decisions** — 2–4 options with confidence % for each major decision; evaluate the top 3 alternatives before adding a dependency; save artifacts to the plan directory per step.
- **Delegated tail** — the nested `/workflow-review-changes` owns security, performance and production-readiness review, the conditional domain-entity reference refresh and `docs-update`; this workflow does not repeat them. `/workflow-e2e --source=context` stays required after it.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; fixes are re-verified after they land; `/workflow-end` runs last; `/workflow-review-changes` runs INLINE in the main session; the `architecture-gates` barrier returns in full before `/scenario`; gates awaiting user approval are never parallelized. Recommended: independent read-only research or review in one parallel wave; L/XL targets partitioned into bounded batches per module or outcome slice, one report per batch.

## Memory & Reporting

- One task per selected step, PLAN₁/PLAN₂ named explicitly; the run report under `tmp/reports/` is written FIRST and appended per step or batch.
- After compaction, re-read the report and `TaskList` before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Findings are validated (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero validated findings; from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 2 rounds (+1 on open CRITICAL/HIGH); failing tests are uncapped; no progress → `AskUserQuestion`.

## Step Chain

Registry sequence — the recommended default order; the two parity lines mirror `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup --explore -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /plan-validate -> /plan-execute -> /seed-test-data -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup --explore -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /plan-validate -> /plan-execute -> /seed-test-data -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /test -> /workflow-end -> /watzup

**Steps:** /idea → /web-research → /deep-research → /market-analysis → /business-evaluation → /spec-discovery → /domain-analysis → /why-review → /tech-stack-research → /architecture-design → /architecture-scalability-review → /why-review → /scenario → /plan → /plan-review → /refine → /artifact-review --type=pbi → /story → /artifact-review --type=story → /pbi-challenge → /dor-gate → /pbi-mockup --explore → /spec → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec-clarify → /plan → /plan-review → /scaffold → /architecture-review-full → /scan --target=ui-system → /scan --target=backend-patterns → /scan --target=integration-tests → /scan --target=project-structure → /plan-validate → /plan-execute → /seed-test-data → /integration-test → /integration-test-verify → /spec [mode=sync] → /workflow-review-changes → /workflow-e2e --source=context → /test → /workflow-end → /watzup

Activate the `workflow-big-feature` workflow. Run `/start-workflow workflow-big-feature` with the user's prompt as context.

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

**IMPORTANT MUST ATTENTION Goal:** a bounded, independently releasable actor-facing outcome — researched only as deep as the triage requires, architecture-gated, specified, planned, built, reviewed and closed with evidence; ordinary runs never write the product-roadmap artifact.

- **IMPORTANT MUST ATTENTION** triage FIRST (size, kind, risk, `isLargeIdea`) and record it; optional research and design steps run only when their `when` holds, each deviation logged with evidence.
- **IMPORTANT MUST ATTENTION** gates always run: `/plan-validate`, INLINE `/workflow-review-changes`, `/test`, `/workflow-end`; the `architecture-gates` barrier and the near-end `/workflow-e2e --source=context` stay in every run.
- **IMPORTANT MUST ATTENTION** every PBI passes `.claude/skills/shared/releasable-pbi-contract.md`; apply `SYNC:scale-ready-foundation` before PLAN₁; brownfield gaps become owned opportunities or explicit blockers, never silent refactors.
- **IMPORTANT MUST ATTENTION** every research stage that runs is confirmed with the user; every claim cites `file:line` or source evidence, confidence >80% to act.
- **IMPORTANT MUST ATTENTION** tests name the invariant they guard and fail when it breaks; changed behavior is proven by tests that ran green in this run.
