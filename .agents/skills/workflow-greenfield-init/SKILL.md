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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** take a brand-new product from idea to a reviewed first releasable slice on a verified, right-sized foundation — researched only as deep as the idea needs, then modeled, architected, planned, scaffolded, built, tested, reviewed and closed with evidence. You act as solution architect.

**Use when** no codebase exists yet (planning artifacts may). Existing codebase with a large or ambiguous feature → `workflow-big-feature`. Backlog or spec only, no build → `workflow-idea-to-pbi` / `workflow-idea-to-spec`.

**Workflow:** triage → discover & model (idea, triaged research, domain, stack, architecture + gates) → plan & backlog (PLAN₁, releasable PBIs, stories, test specs, `$plan-validate`, PLAN₂) → foundation (scaffold, linters, harness, foundation review, reference docs) → build & prove (implementation, integration tests, spec sync, `$test`, inline review, near-end E2E, final `$test`, `$workflow-end`).

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count.
- MUST ATTENTION business and domain before technology — never ask for the tech stack upfront.
- MUST ATTENTION the foundation matrix, the AI-agent-access decision and the Test Architecture & Execution Contract block implementation until complete.
- NEVER skip mandatory workflow or skill gates; cite evidence for every claim, confidence >80% to act.

## Size & Kind Triage (FIRST action)

Classify before choosing steps and write the result to the run report; it answers every optional step's `when`.

- **Scale** — prototype/internal tool (S: one team, known domain, low stakes) · product (M/L: external users, business case) · platform (XL: several products, teams or tenants). Scale sets research depth, the performance review and the foundation's weight; never force heavyweight architecture onto a small target.
- **UI surface** — none → skip `$pbi-mockup`, `$scan --target=ui-system` and the design gate.
- **Market research** — commercial product, unfamiliar domain or missing owner facts → `$web-research` + `$deep-research`; a market to size → `$market-analysis`; value not yet accepted → `$business-evaluation`. A mandated internal tool with owner-supplied facts skips all four.
- **Criticality** — auth, secrets, money, PII, regulated data or network exposure → architecture `$security-review`; product/platform scale or declared latency/throughput/volume needs → architecture `$performance-review`.
- **`isLargeIdea`** `= multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit`, evaluated before any spec, PBI, story or plan. True → the owning PBI/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`), its stable slice IDs flow into stories, mock-ups and the PBI presentation, and `$scenario` runs when the scope needs adversarial analysis. False → record `Decomposition Applicability: EXEMPT` with reason and owner. Ordinary runs never write the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); only an explicit roadmap request enters the standalone roadmap skill, and a supplied roadmap is read-only context.
- **Test tiers** — which of Unit, Integration/System and E2E apply; this drives the integration-test and E2E steps.

## Required Quality Gates

Each gate names the evidence that proves it:

- **Foundation decided (before PLAN₁ completes)** — `SYNC:scale-ready-foundation` applicability matrix (architecture, actors/authorization, dependency/license, real infrastructure boundaries, execution modes, CI/operations, UI when applicable) plus the `SYNC:ai-agent-as-user-access` decision, or an explicit evidence-backed omission; carried into scaffold, harness, foundation review and plans.
- **Test Architecture & Execution Contract (before `$plan-execute`)** — emitted during `$architecture-design`; every tier `APPLICABLE` with runner, owner, copy-ready full and focused commands, zero-match behavior, CI gate and unique run/data identity, or `N/A — <evidence>`. A missing field blocks handoff.
- **Releasable PBIs** — every PBI passes `.claude/skills/shared/releasable-pbi-contract.md`: one actor-facing outcome, foundation work attached as enabling work, UI PBIs with the connected multi-view mock-app flow.
- **`plan-approved`** — `$plan-validate` passed with explicit evidence; no inferred decision auto-approved.
- **Foundation reviewed** — `$architecture-review-full` BLOCKED/WARN findings fixed before `$plan-execute`.
- **`spec-synced`** (behavior diverged from the authored specs) — `$spec [mode=sync]` output; spec, test specs and test code agree.
- **`tests-pass`** — changed behavior covered by tests that ran green in THIS run; the final `$test` reports commands, exact results and exit status per applicable tier. Each assertion-bearing test uses the project's native style (Given/When/Then when selected or idiomatic), names the behavior or invariant it guards, and fails when that intent breaks.
- **`review-converged`** — nested `$workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed.
- **Near-end E2E** — `$workflow-e2e --source=context` ran after the review, or recorded evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`.
- **`run-closed`** — `$workflow-end` checked every outcome gate.

## Gates and Optional Steps

**Step contract:** `$start-workflow` owns how gate, core and optional steps run; this list summarizes the non-core roles in `.claude/workflows.json`, whose `when`/`skipReason` text is recorded verbatim on skip.

- **Gates (always):** `$plan-validate` · `$test` · `$workflow-review-changes` · final `$test` · `$workflow-end`.
- **Optional — research:** `$web-research`, `$deep-research` (research needed) · `$market-analysis` (a market to size; when skipped, `$business-evaluation` marks market figures N/A) · `$business-evaluation` (value undecided) · `$spec-discovery` (existing specs or code).
- **Optional — design and backlog:** `$scenario` (`isLargeIdea` or adversarial risk) · `$security-review --report-only` (criticality) · `$performance-review --report-only` (scale or declared need) · PLAN₁ re-review `plan-architecture-rereview` (a risk review returned findings) · `$pbi-mockup` (UI) · `$spec-clarify` (open spec decisions).
- **Optional — foundation and build:** `$scaffold` (no base abstractions yet) · `$scan --target=ui-system` (UI stack) · `$seed-test-data` (persistent state or seeded test/demo data) · post-implementation `$spec [mode=tests]` + `$artifact-review --type=spec-tests` (behavior beyond the initial test specs) · PLAN₃ `plan-integration-tests` + its review (integration architecture spans modules, services, external boundaries or shared data) · `$integration-test`, `$integration-test-verify` (Integration/System tier `APPLICABLE`) · `$e2e-test` (`docs/project-config.json` → `e2eTesting` declares a runnable framework) · `$spec [mode=sync]` (divergence).
- **Core:** everything else, including `$workflow-e2e --source=context`, which stays required after the review.

## Recommended Skills by Phase

- **Discovery** — `$idea` always (problem, actors, non-goals, triage); research chain per triage → option set with confidence, go/no-go.
- **Domain** — `$domain-analysis` (ERD + bounded contexts) then `domain-rationale-review` → entities, invariants, ownership.
- **Architecture** — `$tech-stack-research` (top 3 options per layer) → `$architecture-design` (foundation matrix, test contract) → `architecture-gates` barrier → `$scenario` per triage. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) advise right-sizing in both directions and never change a verdict.
- **PLAN₁** — `plan-architecture` → its review → `architecture-risk-reviews` barrier → re-review when findings exist → reviewed architecture plan.
- **Backlog** — `$refine` → PBI review → `$story` → story review → `$pbi-challenge` → `$dor-gate` → `$pbi-mockup` (UI) → releasable, DoR-ready PBIs.
- **PLAN₂** — `$plan-validate` → `test-spec-initial` → its review → `$spec-clarify` → `plan-implementation` → its review → `plan-approved`, sprint-ready plan.
- **Foundation** — `$scaffold` → `$linter-setup` → `$harness-setup` → `$architecture-review-full` → `reference-docs-and-rationale` barrier → reviewed foundation, reference docs, pre-coding rationale.
- **Build** — `$plan-execute` → triaged seed data, post-implementation test specs, PLAN₃ → `$integration-test` → `$integration-test-verify` → `$e2e-test` → green tests in this run.
- **Close** — `$spec [mode=sync]` → `$test` → `$workflow-review-changes` → `$workflow-e2e --source=context` → final `$test` → `$workflow-end` → `$watzup`.

## Workflow-Specific Contracts

- **Decisions** — 2–4 options with confidence % and evidence per major decision; validate each phase's decisions with the user by asking the user directly before building on them; never self-approve a one-way door. Save artifacts to the plan directory per step.
- **Occurrence names** — repeated skills are distinct tasks: PLAN₁ `plan-architecture` (system design, boundaries, tech choices) · PLAN₂ `plan-implementation` (stories, test specs, phased tasks) · PLAN₃ `plan-integration-tests` (test structure, data setup, CI) · rationale reviews `domain-rationale-review`, `architecture-rationale-review`, `pre-coding-rationale-review` · `test-spec-initial` / `test-spec-post-impl`.
- **Scaffold** — grep first for base classes, generic interfaces, infrastructure abstractions, utility layers, frontend foundations and DI registrations; found → skip with evidence. Otherwise build them behind interfaces with at least one concrete implementation before any feature story, sized to the triaged scale.
- **Reference docs** — after the foundation review's fixes, the four `$scan` targets derive the project-reference docs (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) from the reviewed foundation, so feature work reads accurate references from day one.
- **E2E** — `$e2e-test` never fabricates browser setup; `$workflow-e2e --source=context` owns final E2E, screenshot and `$experience-review` evidence, and a relevant surface without a runnable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS.
- **Delegated tail** — the nested `$workflow-review-changes` owns production-readiness security, domain-entity quality and integration-test coverage review, the conditional domain-entity reference refresh and `docs-update`; this workflow does not repeat them.
- **Architecture quality** — `$architecture-scalability-review` runs in init mode (build/CI scalability, architecture pattern, module isolation, dependency discipline, coupling, horizontal scaling, observability).

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; fixes are re-verified after they land; `$workflow-end` runs last; `$workflow-review-changes` runs INLINE in the main session; gates awaiting user approval are never parallelized. S prototypes run mostly inline; L/XL builds partition into bounded batches per module or outcome slice, one report per batch.

Declared all-return barriers — advance only after every member returns:

- **`architecture-gates`** — `$architecture-scalability-review` as a fresh read-only `architect` sub-agent, plus the design-rationale `$why-review` INLINE in FULL mode so its Trade-Off questions reach the user. A scalability risk on a passed decision becomes a WARN carried into `$scenario` and PLAN₁; a why-review FAIL or a user answer that changes a decision blocks `$scenario` until the design is revised and both re-run.
- **`architecture-risk-reviews`** — the selected `$security-review --report-only` (`security-auditor`) and `$performance-review --report-only` (`performance-optimizer`) in ONE message over PLAN₁ and the architecture artifacts; each writes only its report, asks nothing and edits nothing. Validate their findings with the user after the barrier; the PLAN₁ re-review is the sole writer of PLAN₁ and surfaces any security-vs-performance conflict instead of resolving it silently.
- **`reference-docs-and-rationale`** — `pre-coding-rationale-review` as a fresh read-only `code-reviewer` sub-agent (inputs: PLAN₂, foundation source, foundation review report; a missing reference doc is `NOT VERIFIABLE`, never a trigger for `$scan`) while the four `$scan` steps run INLINE in order, each fanning out its own sub-agents and writing a disjoint doc. Ask its Trade-Off questions after the barrier; a FAIL that changes the foundation re-runs every affected `$scan` before `$plan-execute`.

## Memory & Reporting

- One task per selected step, named by occurrence; the run report under `tmp/reports/` is written FIRST (triage, then a section per phase) and appended per step or batch.
- After compaction, re-read the report and the current task list before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero validated findings; from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 2 rounds (+1 on open CRITICAL/HIGH); failing tests are uncapped; no progress → ask the user directly.

## Step Chain

Registry sequence — the recommended default order, mirroring `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** $idea -> $web-research -> $deep-research -> $market-analysis -> $business-evaluation -> $spec-discovery -> $domain-analysis -> $why-review -> $tech-stack-research -> $architecture-design -> $architecture-scalability-review -> $why-review -> $scenario -> $plan -> $plan-review -> $security-review --report-only -> $performance-review --report-only -> $plan-review -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $plan -> $plan-review -> $scaffold -> $linter-setup -> $harness-setup -> $architecture-review-full -> $scan --target=ui-system -> $scan --target=backend-patterns -> $scan --target=integration-tests -> $scan --target=project-structure -> $why-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $integration-test -> $integration-test-verify -> $e2e-test -> $spec [mode=sync] -> $test -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $workflow-end -> $watzup

Activate the `workflow-greenfield-init` workflow. Run `$start-workflow workflow-greenfield-init` with the user's prompt as context.

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Optional steps apply by triage through the step contract; no separate trimmed mode exists.

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

**IMPORTANT MUST ATTENTION Goal:** idea → reviewed first releasable slice on a verified, right-sized foundation, with only the ceremony the triage justifies and no gate skipped.

- **IMPORTANT MUST ATTENTION** triage FIRST (scale, UI, market, criticality, `isLargeIdea`, test tiers) and record it; every skipped optional step logs its registry `skipReason` with evidence.
- **IMPORTANT MUST ATTENTION** before the first `$plan` completes: `SYNC:scale-ready-foundation` matrix and the `SYNC:ai-agent-as-user-access` decision; before `$plan-execute`: a complete Test Architecture & Execution Contract — a missing field blocks handoff.
- **IMPORTANT MUST ATTENTION** every PBI passes `.claude/skills/shared/releasable-pbi-contract.md` — no standalone technical/foundation PBI; UI PBIs carry the connected mock-app flow.
- **IMPORTANT MUST ATTENTION** gates always run: `$plan-validate`, `$test`, `$workflow-review-changes` (INLINE in the main session), final `$test`, `$workflow-end`; `$workflow-e2e --source=context` stays required after the review.
- **IMPORTANT MUST ATTENTION** business and domain before technology; validate each phase's decisions with the user and never self-approve a one-way door; cite evidence for every claim, confidence >80% to act.

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
