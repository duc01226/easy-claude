---
name: workflow-big-feature
description: '[Workflow] Use when implementing a large, ambiguous, or research-driven feature.'
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

**Goal:** ship a large, ambiguous or research-heavy feature in an existing codebase as a bounded, independently releasable actor-facing outcome — researched only as deep as the idea needs, then designed, specified, planned, built, reviewed and closed with evidence.

**Use when** scope or value is unclear, several outcomes or modules are involved, or research must precede the build decision. A clear, bounded change across modules → `workflow-feature`. An existing spec that only needs building → `workflow-implement-spec`. Greenfield → `workflow-greenfield-init`.

**Workflow:**

1. **Triage** — size, kind, risk and `isLargeIdea`; select the research/design depth (below).
2. **Research & design** — only the stages the triage selects; architecture is always designed and gated.
3. **Specify & plan** — releasable PBIs, stories, Feature Spec, test specs, PLAN₁/PLAN₂, `$plan-validate`.
4. **Build & prove** — optional foundation, implementation, integration tests, spec sync, inline review, near-end E2E, `$test`, `$workflow-end`.

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
| Plan approved (`plan-approved`)                                        | `$plan-validate` passed on PLAN₂ with explicit evidence; no inferred decision auto-approved                                                                                                                      |
| Spec synced when behavior or a public contract changed (`spec-synced`) | `$spec [mode=sync]` output; spec ↔ test specs ↔ test code agree, each invariant mapped to Section 8 TC IDs                                                                                                       |
| Tests pass (`tests-pass`)                                              | changed behavior covered by tests that ran green in THIS run (`$integration-test-verify`, `$test`)                                                                                                               |
| Review converged (`review-converged`)                                  | nested `$workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed                                                                                                   |
| Architecture gated                                                     | the `architecture-gates` barrier returned both reports and they were reconciled (below)                                                                                                                          |
| Releasable PBIs                                                        | every PBI is one independently releasable actor-facing outcome (technical work is enabling work under it; UI PBIs carry the full connected mock-app flow, or a recorded `Mockup: SKIPPED by user` from the pre-generation scope gate) per `.claude/skills/shared/releasable-pbi-contract.md` |
| Near-end E2E                                                           | `$workflow-e2e --source=context` ran after the review, or recorded evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`                                                                                                 |
| Run closed (`run-closed`)                                              | `$workflow-end` checked every outcome gate                                                                                                                                                                       |

## Gates and Optional Steps

**Step contract:** `$start-workflow` owns how gate, core and optional steps run; this table lists this workflow's non-core roles from `.claude/workflows.json`.

| Step                               | Role     | Runs when                                                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `$web-research`                    | optional | external market, standard, regulation or prior-art evidence would change the outcome |
| `$deep-research`                   | optional | web research ran and its top sources need depth                                      |
| `$market-analysis`                 | optional | a commercial market needs sizing (Market Analysis Applicability below)               |
| `$business-evaluation`             | optional | value, viability, cost or priority is still undecided                                |
| `$spec-discovery`                  | optional | specs or related code already exist for the area                                     |
| `$domain-analysis`                 | optional | entities, relationships, ownership or lifecycle state change                         |
| `$why-review`                      | optional | research or domain analysis produced a material decision between alternatives        |
| `$tech-stack-research`             | optional | a new dependency, service or platform capability is under consideration              |
| `$scenario`                        | optional | replay, state, ownership, recovery or failure risks need adversarial analysis        |
| `$pbi-mockup --explore`            | optional | the PBI has a user-facing UI surface; NEW UI → scope gate (3/2/1 or skip), then the chosen explore mockups, user picks (below) |
| `$spec-clarify`                    | optional | the spec leaves open, non-obvious or conflicting decisions                           |
| `$scaffold`                        | optional | the codebase lacks the base abstractions this feature needs                          |
| `$architecture-review-full`        | optional | `$scaffold` built new foundation code                                                |
| `$scan --target=ui-system`         | optional | `$scaffold` built a UI or frontend foundation                                        |
| `$scan --target=backend-patterns`  | optional | `$scaffold` built a new foundation                                                   |
| `$scan --target=integration-tests` | optional | `$scaffold` built a new foundation                                                   |
| `$scan --target=project-structure` | optional | `$scaffold` built a new foundation                                                   |
| `$plan-validate`                   | gate     | always                                                                               |
| `$seed-test-data`                  | optional | new entities or flows need development data for manual QC                            |
| `$workflow-review-changes`         | gate     | always                                                                               |
| `$test`                            | gate     | always                                                                               |
| `$workflow-end`                    | gate     | always                                                                               |

Every other step is `core`: usually run, and it flexes under the step contract only when its outcome is already proven.

## Recommended Skills by Phase

| Phase        | Skills                                                                                                                                  | Earns its cost when                                                                                                  | Proves / feeds                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Discovery    | `$idea`                                                                                                                                 | always — pins problem, actors, non-goals                                                                             | triage, `isLargeIdea`                                         |
| Research     | `$web-research` → `$deep-research` → `$market-analysis` → `$business-evaluation`                                                        | the triage found external unknowns, an unsized market or an undecided business case                                  | option set with confidence, go/no-go                          |
| Domain       | `$spec-discovery`, `$domain-analysis`, `$why-review`                                                                                    | existing specs, entity changes, a material decision                                                                  | ERD, invariant landscape, scope decision (NEW/EXTEND/SPLIT)   |
| Architecture | `$tech-stack-research`, `$architecture-design`, `architecture-gates` barrier, `$scenario`                                               | design and its gates always; research and scenario per triage                                                        | scale-ready decision matrix, reconciled gate reports          |
| PLAN₁        | `$plan` → `$plan-review`                                                                                                                | strategic plan: boundaries, data flow, tech choices; folding it into PLAN₂ (logged) fits only a single-slice feature | reviewed architecture plan                                    |
| Backlog      | `$refine` → `$artifact-review --type=pbi` → `$story` → `$artifact-review --type=story` → `$pbi-challenge` → `$dor-gate` → `$pbi-mockup --explore` | always; mock-up for UI only                                                                                          | releasable PBIs, DoR-ready stories                            |
| Spec         | `$spec` → `$spec [mode=tests]` → `$artifact-review --type=spec-tests` → `$spec-clarify`                                                 | always; clarify when decisions are open                                                                              | Feature Spec, TC IDs per invariant                            |
| PLAN₂        | `$plan` → `$plan-review` → `$plan-validate`                                                                                             | always                                                                                                               | sprint-ready plan, `plan-approved`                            |
| Foundation   | `$scaffold` → `$architecture-review-full` → `$scan` ×4                                                                                  | base abstractions are missing                                                                                        | reviewed foundation, refreshed reference docs                 |
| Build        | `$plan-execute` → `$seed-test-data` → `$integration-test` → `$integration-test-verify`                                                  | always; seed data per triage                                                                                         | green tests in this run                                       |
| Close        | `$spec [mode=sync]` → `$workflow-review-changes` → `$workflow-e2e --source=context` → `$test` → `$workflow-end` → `$watzup`             | always                                                                                                               | `spec-synced`, `review-converged`, `tests-pass`, `run-closed` |

## Market Analysis Applicability (conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

Record the applicability evidence either way; when skipped because the market is already sized, cite the existing analysis. When `$business-evaluation` runs after a skipped market analysis, it marks every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `$web-research`, `$deep-research`, other selected research stages, or their required user confirmations.

## New-UI Explore Mockup (before the implementation plan)

The `$pbi-mockup --explore` step runs its **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with ask the user directly available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope; skip → record `Mockup: SKIPPED by user` and continue); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report. Then Journey Report (`UX-1`) → design-authority read (`UX-2`). When the PBI adds completely new UI — a new page/view, component or dialog — the chosen 1–3 direction drafts are rendered with html-export, each opened in the default browser (`node .claude/scripts/open-report.cjs <draft>`), then, with 2–3 drafts, ask the user directly offers one option per draft with your evidence-backed recommendation first, labelled `(Recommended)`. The user's pick (or the `Selection:` line) is recorded in `direction-approved.md`, and PLAN₂'s UI Layout builds on the selected mockup. Never pick for the user while they can be asked; drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and PLAN₂. A PBI that only adjusts existing views records the explore exemption (all axes adopted) and builds one direction.

## Architecture Gates Parallel Phase (`architecture-scalability-review` + design-rationale `$why-review`)

Declared as the `architecture-gates` all-return barrier. Both read the finished `$architecture-design` artifacts; neither consumes the other.

1. Launch `$architecture-scalability-review` as a fresh read-only `architect` sub-agent (brief: architecture-design, domain-analysis and tech-stack-research artifact paths); it writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Run the design-rationale `$why-review` INLINE in FULL mode so its Trade-Off Interrogation Gate can reach the user.
3. Advance only after BOTH return. A scalability risk touching a passed decision becomes a WARN carried into `$scenario` and PLAN₁; a why-review FAIL, or a user trade-off answer that changes a decision, blocks `$scenario` until the design is revised and both gates re-run.

## Workflow-Specific Contracts

- **Scale-ready foundation** — at `$architecture-design`, before PLAN₁, apply `SYNC:scale-ready-foundation`: inspect the existing project and emit the applicability/decision matrix; carry accepted decisions into `$plan`, `$scaffold`, `$architecture-review-full` and implementation. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) are advisory right-sizing in both directions.
- **Brownfield bounds** — a gap needing broad refactoring keeps the PBI's actor journey bounded: `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE` or `BLOCKED` with evidence, owner, trigger and smallest next step; `BLOCKED` when the refactor is required for safety.
- **AI agent as user (optional)** — when evidence makes an agent a potential actor, apply `SYNC:ai-agent-as-user-access`: one capability core, only warranted machine surfaces, never agent = administrator.
- **Two plans** — PLAN₁ is strategic (after architecture); PLAN₂ is tactical (after the test-spec review: stories, test strategy, dependencies, phased tasks). Name tasks `PLAN₁`/`PLAN₂` so the repeated `$plan` and `$plan-review` occurrences stay distinct.
- **Foundation refresh** — when `$scaffold` ran, `$architecture-review-full` grades it and BLOCKED/WARN findings are fixed before `$plan-execute`; then the four `$scan` targets run INLINE in sequence (each fans out its own sub-agents) as a surgical REFRESH of the project-reference docs (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), creating a doc only when missing; `ui-system` only for a UI foundation. A later fix that changes the foundation re-runs the affected scan before `$plan-execute`.
- **Spec-driven tests** — read `spec-principles.md` in the project-reference docs root before `$story` and test specs; map every invariant to Section 8 TC IDs; lifecycle flows assert persisted transitions and invalid-transition rejection. Every assertion-bearing test uses the project's native style (GWT when selected or idiomatic) and names the behavior or invariant it guards, so it fails when that intent breaks.
- **Decisions** — 2–4 options with confidence % for each major decision; evaluate the top 3 alternatives before adding a dependency; save artifacts to the plan directory per step.
- **Delegated tail** — the nested `$workflow-review-changes` owns security, performance and production-readiness review, the conditional domain-entity reference refresh and `docs-update`; this workflow does not repeat them. `$workflow-e2e --source=context` stays required after it.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; fixes are re-verified after they land; `$workflow-end` runs last; `$workflow-review-changes` runs INLINE in the main session; the `architecture-gates` barrier returns in full before `$scenario`; gates awaiting user approval are never parallelized. Recommended: independent read-only research or review in one parallel wave; L/XL targets partitioned into bounded batches per module or outcome slice, one report per batch.

## Memory & Reporting

- One task per selected step, PLAN₁/PLAN₂ named explicitly; the run report under `tmp/reports/` is written FIRST and appended per step or batch.
- After compaction, re-read the report and the current task list before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Findings are validated (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero validated findings; from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 2 rounds (+1 on open CRITICAL/HIGH); failing tests are uncapped; no progress → ask the user directly.

## Step Chain

Registry sequence — the recommended default order; the two parity lines mirror `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup --explore -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $plan-validate -> $plan-execute -> $seed-test-data -> $integration-test -> $integration-test-verify -> $spec [mode=sync] -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup --explore -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $plan-validate -> $plan-execute -> $seed-test-data -> $integration-test -> $integration-test-verify -> $spec [mode=sync] -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

**Steps:** $idea → $web-research → $deep-research → $market-analysis → $business-evaluation → $spec-discovery → $domain-analysis → $why-review → $tech-stack-research → $architecture-design → $architecture-scalability-review → $why-review → $scenario → $plan → $plan-review → $refine → $artifact-review --type=pbi → $story → $artifact-review --type=story → $pbi-challenge → $dor-gate → $pbi-mockup --explore → $spec → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec-clarify → $plan → $plan-review → $scaffold → $architecture-review-full → $scan --target=ui-system → $scan --target=backend-patterns → $scan --target=integration-tests → $scan --target=project-structure → $plan-validate → $plan-execute → $seed-test-data → $integration-test → $integration-test-verify → $spec [mode=sync] → $workflow-review-changes → $workflow-e2e --source=context → $test → $workflow-end → $watzup

Activate the `workflow-big-feature` workflow. Run `$start-workflow workflow-big-feature` with the user's prompt as context.

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
- **IMPORTANT MUST ATTENTION** gates always run: `$plan-validate`, INLINE `$workflow-review-changes`, `$test`, `$workflow-end`; the `architecture-gates` barrier and the near-end `$workflow-e2e --source=context` stay in every run.
- **IMPORTANT MUST ATTENTION** every PBI passes `.claude/skills/shared/releasable-pbi-contract.md`; apply `SYNC:scale-ready-foundation` before PLAN₁; brownfield gaps become owned opportunities or explicit blockers, never silent refactors.
- **IMPORTANT MUST ATTENTION** every research stage that runs is confirmed with the user; every claim cites `file:line` or source evidence, confidence >80% to act.
- **IMPORTANT MUST ATTENTION** tests name the invariant they guard and fail when it breaks; changed behavior is proven by tests that ran green in this run.

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
