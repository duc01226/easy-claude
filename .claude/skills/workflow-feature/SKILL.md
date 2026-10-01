---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Use when implementing a well-defined feature, component or capability (incl. TDD/test-first) where no canonical spec has the behavior yet. Spec-complete work: workflow-implement-spec.'
disable-model-invocation: false
---

## Purpose

Deliver a well-defined feature spec-first and test-first: the canonical Feature Spec states the intended behavior, test specs are written and reviewed before implementation, and the run ends with green tests, a converged change review and a spec re-verified against what was actually built. Use it when no canonical spec holds the requested behavior yet — this workflow updates the spec first. Spec-complete work goes to `workflow-implement-spec`; large, ambiguous or research-heavy work belongs in `workflow-big-feature`; a focused one-module change with no contract change is usually a custom-simple route, not this workflow.

Activate the `workflow-feature` workflow. Run `/start-workflow workflow-feature` with the user's prompt as context.

## Size & Kind Triage (first action)

Classify the target before choosing steps and record the result in the run report:

- **Size (guidance, not a law):** **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300
- **Kind (one or more):** docs-only · tooling/config · test-only · behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service
- **Risk:** irreversible · data · security · cross-module
- **Large idea:** `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` (`shared/product-roadmap-contract.md`)

Escalate depth on risk and ambiguity, not file count alone:

- **XS/S, one module, clear intent** — light investigation; update only the affected spec sections; one lean plan; no re-plan. Test specs receive one quality review before the build. Work inline — sub-agents rarely pay off.
- **M, or any public-contract, data/schema, security or cross-module kind** — every core step at full depth plus each optional step whose condition holds (`/scenario`, `/domain-analysis`, `/plan --mode=validate`, ...).
- **L/XL, or `isLargeIdea` true** — everything M runs, plus the embedded decomposition and bounded batches per module or slice for the build, test specs and review (one report per batch). A research-heavy scope that cannot be cut into slices → recommend `workflow-big-feature` to the user.

## Required Quality Gates

The run is not done until each applicable gate holds with its evidence:

- **Tests pass** (`tests-pass`) — `/test` ran green in THIS run — once, after the static review, with `/integration-test --mode=verify` (incl. the mutation check) for the integration suite; every changed behavior maps to a §8 TC that names its `Business Intent / Invariant Guarded` and would fail if that intent broke; lifecycle behavior asserts persisted state transitions and invalid-transition rejection
- **Review converged** (`review-converged`) — nested `/workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed
- **Spec synced** (`spec-synced`, when behavior or a public contract changed) — Feature Spec §1-7 re-verified against the built behavior (the post-implementation re-verify is part of the gate, not optional cleanup); every divergence adjudicated per `SYNC:spec-drift-adjudication` in `shared/sdd-artifact-contract.md` → Drift Gates: CODE-WRONG → fix code/tests, SPEC-STALE → `/spec` update then the test-spec update and `/spec [mode=sync]`, AMBIGUOUS → escalate to the spec owner; §8 TCs ↔ test code synced
- **Run closed** (`run-closed`) — `/workflow-end` checked every gate and emitted the Goal Satisfaction matrix
- **Spec-first, test-first** — the canonical Feature Spec was authored or updated before the first `/plan`; test specs were written and reviewed before `/plan --mode=execute`
- **Goal Contract** — the active Goal Contract is resolved at start per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the request); the plan's success criteria map to it before `/plan --mode=execute`; every child step reads that same goal file; closure needs every criterion PASS, or BLOCKED with a user-facing escalation
- **Plan Gate** — `/plan --mode=execute` never starts while the plan's `## Plan Gate` is `BLOCKED` or lacks human approval
- **Large idea** (when `isLargeIdea` is true) — the complete five-field `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) sits in the owning spec/PBI before the first mutating `/spec` and carries its slice IDs through downstream presentation/mock-up artifacts; all-false work omits it; a genuinely isolated brownfield change records `EXEMPT` with reason and accepting owner and keeps the spec, scenario, test, review and human-confirmation gates. This workflow never creates a roadmap artifact — an explicitly supplied roadmap is read-only context
- **Existing behavior preserved** (when an existing final output, persisted state, API response, projection or user-visible flow changes) — before the build: an end-to-start trace of the existing path (final reader → storage/projection → writer → producer/origin), its feeder paths, the invariants to keep, and forward proof for the new behavior; the plan and review evidence state expected, unchanged and no-regression behavior
- **Performance route** (when the feature is a performance enhancement) — `/performance-review` with SLA/benchmark evidence — target metric, baseline, measurement command, regression budget; `/plan --mode=execute` still runs; functional no-regression checks run whenever behavior can change; spec/docs updated for a changed SLA, performance constraint or behavior boundary
- **UI intent** (when user-facing behavior changed) — alongside `/spec [mode=sync]`, the Feature Spec §6 interaction surface (View Inventory, Key UI States, per-story click-path) is refreshed per `SYNC:ui-intent-layer` and linked to the governing `/design-spec`; a backend-only change states its skip reason

## Gates and Optional Steps

**Step contract:** `/start-workflow` → Step Execution Protocol owns how gate, core and optional steps run; the registry (`.claude/workflows.json` → `workflow-feature`, delivered in the Tier-2 output) owns each step's role and its `applicability` (`when` / `skipReason`, recorded verbatim on skip). This table adds only what the registry does not state: what each step proves or feeds, plus triage hints.

| Step | Role | Proves / feeds · triage hint |
| --- | --- | --- |
| `/investigate` | core | plan evidence — read the affected area's spec under the business spec root first (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) and find 3+ local examples |
| `/spec [mode=discovery]` | optional | overlaps and missing TCs before authoring — pass this run's investigation report as `--investigation=<report path>` so it is not re-run |
| `/domain-analysis` | optional | entity model, ownership |
| `/why-review` | optional | design rationale |
| `/spec` | core | spec-first gate — Feature Spec §1-7 before planning |
| `/spec [mode=clarify]` | optional | user-confirmed decisions |
| `/scenario` | optional | plan risk coverage |
| `/pbi --mode=mockup --explore` | optional | selected mockup before planning — see New-UI Explore Mockup below |
| `/spec [mode=tests]` | core | test-first gate — every invariant mapped to TC IDs in §8 |
| `/pbi --mode=review --type=spec-tests` | core | test-spec quality |
| `/plan` | core | decisions, areas, discovery, gates — one lean plan over the reviewed intent and cases |
| `/plan --mode=validate` | optional | human plan approval |
| `/plan --mode=execute` | core | the change, the performance route included |
| `/seed-test-data` | optional | QC data |
| `/integration-test` | core | tests from the TCs (tests-pass) |
| `/spec [mode=sync]` | core | spec-synced — after executing tests exist, reconcile spec, cases and actual test evidence |
| `/workflow-review-changes --tests=defer` | gate | review-converged |
| `/integration-test --mode=verify` | core | tests-pass — the one verify, after the review; runs the mutation check |
| `/workflow-e2e --source=context` | optional | E2E evidence |
| `/test` | gate | tests-pass — pass `--proven=<integration-test --mode=verify report path>` so only tiers that report does not cover run |
| `/demo-guide` | optional | demo path |
| `/workflow-end` | gate | run-closed |
| `/watzup` | core | handoff summary |

**New-UI Explore Mockup (conditional, BEFORE `/plan`).** When the requirement or spec adds completely new user-facing UI — a new page/view, component or dialog — run `/pbi --mode=mockup --explore`, passing the spec (or the investigation report when no spec covers the UI yet) as `--source`. `pbi --mode=mockup` Step 0 owns the scope gate (asked first, before any analysis or drafting) and the direction pick; both run in the main session only. Record the outcome (`Mockup: SKIPPED by user` or the `Selection:` line) in the plan or run report; the plan's UI Layout builds on the selected mockup. Changes inside existing views skip it with the registry `skipReason`.

The registry's default order, parsed by the workflow verifier — keep it equal to `workflows.json`; the roles above decide what may flex:

**IMPORTANT MANDATORY Steps:** /investigate -> /spec [mode=discovery] -> /domain-analysis -> /why-review -> /spec -> /spec [mode=clarify] -> /scenario -> /pbi --mode=mockup --explore -> /spec [mode=tests] -> /pbi --mode=review --type=spec-tests -> /plan -> /plan --mode=validate -> /plan --mode=execute -> /seed-test-data -> /integration-test -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /workflow-e2e --source=context -> /test -> /demo-guide -> /workflow-end -> /watzup

**On-demand skills (not registry steps):**

- `/design-spec --mode=wireframe` — UI work arrives with an image or wireframe: run it before `/plan`; a design link alone (e.g. a Figma URL) → ask the user to export the frames as images. When `/plan` finds frontend phases, include the `ui-wireframe-protocol.md` sections in them.
- `/performance-review` — the performance route above.
- `/investigate --mode=debug` — a test fails and its cause is unknown; establish the root cause before editing either side.

`/workflow-e2e --source=context` runs only on an explicit E2E request ("include E2E", "write E2E", "run E2E", "do end-to-end verification"); otherwise it records its registry skip reason. When it runs, its nested workflow keeps default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the capability.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate and pick (`pbi --mode=mockup` Step 0) never run inside a delegated sub-agent. Only these data dependencies are fixed:

- a change exists before it is reviewed or tested; tests run once, last, after the static review (`--tests=defer`); a fix made by the verify step re-runs `/workflow-review-changes --tests=defer`, and a fix made by that re-review re-runs the verify (`SYNC:verify-last-order`);
- the Feature Spec precedes the first `/plan`, and test specs are reviewed before `/plan --mode=execute`;
- `/integration-test` authors the executing evidence before one `/spec [mode=sync]` reconciliation; the sync runs before the review that checks it;
- the nested `/workflow-review-changes` runs inline in the main session — it owns the session's review→fix→re-review loop, and its own reviewers run as sub-agents;
- gates awaiting user approval (`/spec [mode=clarify]`, `/plan --mode=validate`, Plan Gate approval) are never parallelized;
- `/workflow-end` runs last, then `/watzup`.

Recommended: independent read-only work in one parallel wave (`/spec [mode=discovery]` follows `/investigate` and reuses its report); L/XL partitioned into bounded batches per module or slice with one report per batch; XS/S done inline. The nested review owns `/integration-test --mode=review`, `/security-audit`, `/domain-analysis --mode=review`, `/experience-review` and the conditional domain-entity reference refresh (`/scan --target=domain-entities` → `/docs-manager --mode=update`, run when the final diff changes an entity, data contract or schema represented in `domain-entities-reference.md`); this workflow's tail does not repeat them. `/experience-review` records `NOT-APPLICABLE` or `ENVIRONMENT-BLOCKED` honestly and never promotes a new expectation without explicit acceptance.

## Memory & Reporting

- One task per selected step (and per batch for L/XL) so nothing is lost after compaction; a step that does not run keeps its task, closed with its logged deviation.
- Write the run report FIRST under `tmp/reports/` — triage result, gate evidence, deviations — and append per step or batch; re-read it and `TaskList` after compaction.
- Sub-agent briefs carry the goal file path and the resolved reference-doc paths, and make report-writing their first deliverable.
- Project conventions come from `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root). Any supported AI tool may implement or review once that contract, synced context and local docs are available. Code-extracted specs and TCs stay reference-only until canonical review accepts them.

## Fix Path & Loop Bounds

- Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass when the fixes were non-trivial.
- A failing test gets a root-cause verdict before either the source or the test is edited; never weaken an assertion to force green.
- Replanning is exceptional: only a material scope/contract decision invalidating the saved plan returns to `/plan`; ordinary implementation discovery stays with the executor.
- Review loops (each `/pbi --mode=review` occurrence, the nested review): round 1 exits on zero open validated findings (Round-1 LOW closure, `SYNC:double-round-trip-review`); round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 2 rounds, +1 when a CRITICAL/HIGH stays open; failing tests are uncapped; escalate with `AskUserQuestion` on no progress. Convergence lives inside each skill's own loop, so the sequence lists each review once.
- Spec-loop discipline: §8 derives invariant/property TCs for every hard rule and invariant, not only example scenarios; every behavior-changing finding updates BOTH the spec and the tests, never code alone.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** triage size, kind and risk FIRST — depth follows risk and ambiguity, not file count; record the triage and every deviation.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `/workflow-review-changes` converged inline · Feature Spec re-verified and synced when behavior changed · Goal Satisfaction matrix at `/workflow-end`.
**IMPORTANT MUST ATTENTION** spec before the first `/plan`, test specs reviewed before `/plan --mode=execute`; a `BLOCKED` Plan Gate stops the build.
**IMPORTANT MUST ATTENTION** large ideas embed the five-field `large_idea_decomposition`; this workflow never creates a roadmap artifact.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence with confidence >80% to act; tests name the invariant they guard and fail when it breaks.
