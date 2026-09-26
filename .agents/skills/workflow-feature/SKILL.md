---
name: workflow-feature
description: '[Workflow] Use when implementing a well-defined feature, adding a component, or building a capability — including TDD and spec-driven test-first work — when no canonical spec has the requested behavior yet (update the spec first). Spec-complete work goes to workflow-implement-spec.'
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

## Purpose

Deliver a well-defined feature spec-first and test-first: the canonical Feature Spec states the intended behavior, test specs are written and reviewed before implementation, and the run ends with green tests, a converged change review and a spec re-verified against what was actually built. Use it when no canonical spec holds the requested behavior yet — this workflow updates the spec first. Spec-complete work goes to `workflow-implement-spec`; large, ambiguous or research-heavy work belongs in `workflow-big-feature`; a focused one-module change with no contract change is usually a custom-simple route, not this workflow.

Activate the `workflow-feature` workflow. Run `$start-workflow workflow-feature` with the user's prompt as context.

## Size & Kind Triage (first action)

Classify the target before choosing steps and record the result in the run report:

| Axis                       | Values                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Size (guidance, not a law) | **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300                                                                                                               |
| Kind (one or more)         | docs-only · tooling/config · test-only · behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service |
| Risk                       | irreversible · data · security · cross-module                                                                                                                                                                |
| Large idea                 | `isLargeIdea = multipleIndependentOutcomes \|\| ambiguousOrResearchHeavy \|\| releaseScopeDecomposition \|\| oversizedPbiThatMustSplit` (`shared/product-roadmap-contract.md`)                               |

Escalate depth on risk and ambiguity, not file count alone:

- **XS/S, one module, clear intent** — light investigation; update only the affected spec sections; one plan with one lean plan review; no re-plan. Test specs and their review still precede the build. Work inline — sub-agents rarely pay off.
- **M, or any public-contract, data/schema, security or cross-module kind** — every core step at full depth plus each optional step whose condition holds (`$scenario`, `$domain-analysis`, `$plan-validate`, ...).
- **L/XL, or `isLargeIdea` true** — everything M runs, plus the embedded decomposition, the re-plan after test specs, and bounded batches per module or slice for the build, the test specs and the review (one report per batch). A research-heavy scope that cannot be cut into slices → recommend `workflow-big-feature` to the user.

## Required Quality Gates

The run is not done until each applicable gate holds with its evidence:

| Gate                                                                                                                                    | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tests pass** (`tests-pass`)                                                                                                           | `$test` ran green in THIS run, with `$integration-test-verify` for the integration suite; every changed behavior maps to a §8 TC that names its `Business Intent / Invariant Guarded` and would fail if that intent broke; lifecycle behavior asserts persisted state transitions and invalid-transition rejection                                                                                                                                                                                                                                                                                |
| **Review converged** (`review-converged`)                                                                                               | nested `$workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Spec synced** (`spec-synced`, when behavior or a public contract changed)                                                             | Feature Spec §1-7 re-verified against the built behavior (the post-implementation re-verify is part of the gate, not optional cleanup); every divergence adjudicated per `SYNC:spec-drift-adjudication` in `shared/sdd-artifact-contract.md` → Drift Gates: CODE-WRONG → fix code/tests, SPEC-STALE → `$spec` update then the test-spec update and `$spec [mode=sync]`, AMBIGUOUS → escalate to the spec owner; §8 TCs ↔ test code synced                                                                                                                                                         |
| **Run closed** (`run-closed`)                                                                                                           | `$workflow-end` checked every gate and emitted the Goal Satisfaction matrix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Spec-first, test-first**                                                                                                              | the canonical Feature Spec was authored or updated before the first `$plan`; test specs were written and reviewed before `$plan-execute`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Goal Contract**                                                                                                                       | the active Goal Contract is resolved at start per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the request); the plan's success criteria map to it before `$plan-execute`; every child step reads that same goal file; closure needs every criterion PASS, or BLOCKED with a user-facing escalation                                                                                                               |
| **Plan Gate**                                                                                                                           | `$plan-execute` never starts while the plan's `## Plan Gate` is `BLOCKED` or lacks human approval                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Large idea** (when `isLargeIdea` is true)                                                                                             | the complete five-field `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) sits in the owning spec/PBI before the first mutating `$spec` and carries its slice IDs through downstream presentation/mock-up artifacts; all-false work omits it; a genuinely isolated brownfield change records `EXEMPT` with reason and accepting owner and keeps the spec, scenario, test, review and human-confirmation gates. This workflow never creates a roadmap artifact — an explicitly supplied roadmap is read-only context |
| **Existing behavior preserved** (when an existing final output, persisted state, API response, projection or user-visible flow changes) | before the build: an end-to-start trace of the existing path (final reader → storage/projection → writer → producer/origin), its feeder paths, the invariants to keep, and forward proof for the new behavior; the plan and review evidence state expected, unchanged and no-regression behavior                                                                                                                                                                                                                                                                                                  |
| **Performance route** (when the feature is a performance enhancement)                                                                   | `$performance-review` with SLA/benchmark evidence — target metric, baseline, measurement command, regression budget; `$plan-execute` still runs; functional no-regression checks run whenever behavior can change; spec/docs updated for a changed SLA, performance constraint or behavior boundary                                                                                                                                                                                                                                                                                               |
| **UI intent** (when user-facing behavior changed)                                                                                       | alongside `$spec [mode=sync]`, the Feature Spec §6 interaction surface (View Inventory, Key UI States, per-story click-path) is refreshed per `SYNC:ui-intent-layer` and linked to the governing `$design-spec`; a backend-only change states its skip reason                                                                                                                                                                                                                                                                                                                                     |

## Gates and Optional Steps

**Step contract:** `$start-workflow` → Step Execution Protocol owns how gate, core and optional steps run and how every deviation is logged; this table is the registry's recommended order (`.claude/workflows.json` → `workflow-feature`) with this workflow's triage guidance. An optional step that does not run records its registry `skipReason` verbatim.

| Step                                 | Role     | Earns its cost when                                                                                                                                              | Proves / feeds                            |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `$investigate`                       | core     | always; read the affected area's spec under the business spec root first (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) and find 3+ local examples | plan evidence                             |
| `$spec-discovery`                    | optional | specs or related code already exist for the affected area                                                                                                        | overlaps and missing TCs before authoring |
| `$domain-analysis`                   | optional | the feature creates or changes domain entities                                                                                                                   | entity model, ownership                   |
| `$why-review`                        | optional | the investigation or spec draft holds a real design choice                                                                                                       | design rationale                          |
| `$spec`                              | core     | always — Feature Spec §1-7 before planning                                                                                                                       | spec-first gate                           |
| `$spec-clarify`                      | optional | the authored spec leaves open or non-obvious decisions                                                                                                           | user-confirmed decisions                  |
| `$scenario`                          | optional | replay, state, ownership or recovery risks need analysis                                                                                                         | plan risk coverage                        |
| `$pbi-mockup --explore`              | optional | the requirement or spec adds completely NEW UI — a new page/view, component or dialog — see New-UI Explore Mockup below | selected mockup before planning           |
| `$plan`                              | core     | always; XS/S keeps it short                                                                                                                                      | the plan, Plan Gate                       |
| `$plan-review`                       | core     | always; XS/S runs one lean round                                                                                                                                 | plan quality                              |
| `$plan-validate`                     | optional | the plan has decisions to confirm or lacks Plan Gate approval                                                                                                    | human plan approval                       |
| `$spec [mode=tests]`                 | core     | always — every invariant mapped to TC IDs in §8                                                                                                                  | test-first gate                           |
| `$artifact-review --type=spec-tests` | core     | always                                                                                                                                                           | test-spec quality                         |
| `$plan`                              | optional | the reviewed test specs change the plan                                                                                                                          | re-plan                                   |
| `$plan-review`                       | optional | the re-plan ran                                                                                                                                                  | re-plan quality                           |
| `$plan-execute`                      | core     | always, the performance route included                                                                                                                           | the change                                |
| `$seed-test-data`                    | optional | new entities or flows need development data                                                                                                                      | QC data                                   |
| `$spec [mode=tests]`                 | optional | the build surfaced TC gaps or spec drift                                                                                                                         | TC completeness                           |
| `$artifact-review --type=spec-tests` | optional | the post-build test-spec update ran                                                                                                                              | test-spec quality                         |
| `$spec [mode=sync]`                  | core     | always — spec re-verify, §8 ↔ test code, §6 when user-facing                                                                                                     | spec-synced                               |
| `$integration-test`                  | core     | always — tests from the TCs                                                                                                                                      | tests-pass                                |
| `$integration-test-verify`           | core     | always                                                                                                                                                           | tests-pass                                |
| `$workflow-review-changes`           | gate     | always                                                                                                                                                           | review-converged                          |
| `$workflow-e2e --source=context`     | optional | the user explicitly asks for E2E work                                                                                                                            | E2E evidence                              |
| `$test`                              | gate     | always                                                                                                                                                           | tests-pass                                |
| `$demo-guide`                        | optional | the change has user-facing behavior                                                                                                                              | demo path                                 |
| `$workflow-end`                      | gate     | always                                                                                                                                                           | run-closed                                |
| `$watzup`                            | core     | always                                                                                                                                                           | handoff summary                           |

**New-UI Explore Mockup (conditional, BEFORE `$plan`).** When the requirement or spec adds completely new user-facing UI — a new page/view, component or dialog — run the explore mockups (`$pbi-mockup --explore`). **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with ask the user directly available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope; skip → record `Mockup: SKIPPED by user` and continue); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report. Then Journey Report (`UX-1`) + design-authority read (`UX-2`) → the chosen 1–3 direction drafts rendered with html-export → each opened in the default browser (`node .claude/scripts/open-report.cjs <draft>`) → with 2–3 drafts, ask the user directly with one option per draft, your evidence-backed recommendation first labelled `(Recommended)` → the user's pick (or the `Selection:` line) is recorded in `direction-approved.md` and the plan's UI Layout builds on the selected mockup. Never pick for the user while they can be asked; drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit) and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and the plan. Pass the spec (or the investigation report when no spec covers the UI yet) as `--source`. Changes inside existing views skip it with the registry `skipReason`.

The registry's default order, parsed by the workflow verifier — keep it equal to `workflows.json`; the roles above decide what may flex:

**IMPORTANT MANDATORY Steps:** $investigate -> $spec-discovery -> $domain-analysis -> $why-review -> $spec -> $spec-clarify -> $scenario -> $pbi-mockup --explore -> $plan -> $plan-review -> $plan-validate -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $plan -> $plan-review -> $plan-execute -> $seed-test-data -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec [mode=sync] -> $integration-test -> $integration-test-verify -> $workflow-review-changes -> $workflow-e2e --source=context -> $test -> $demo-guide -> $workflow-end -> $watzup

**On-demand skills (not registry steps):**

- `$design-spec --mode=wireframe` — UI work arrives with an image or wireframe: run it before `$plan`; a design link alone (e.g. a Figma URL) → ask the user to export the frames as images. When `$plan` finds frontend phases, include the `ui-wireframe-protocol.md` sections in them.
- `$performance-review` — the performance route above.
- `$debug-investigate` — a test fails and its cause is unknown; establish the root cause before editing either side.

`$workflow-e2e --source=context` runs only on an explicit E2E request ("include E2E", "write E2E", "run E2E", "do end-to-end verification"); otherwise it records its registry skip reason. When it runs, its nested workflow keeps default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the capability.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Only these data dependencies are fixed:

- a change exists before it is reviewed or tested; fixes are re-verified after they land;
- the Feature Spec precedes the first `$plan`, and test specs are reviewed before `$plan-execute`;
- `$spec [mode=sync]` runs before the review that checks it;
- the nested `$workflow-review-changes` runs inline in the main session — it owns the session's review→fix→re-review loop, and its own reviewers run as sub-agents;
- gates awaiting user approval (`$spec-clarify`, `$plan-validate`, Plan Gate approval) are never parallelized;
- `$workflow-end` runs last, then `$watzup`.

Recommended: independent read-only work (for example `$spec-discovery` beside a code investigation) in one parallel wave; L/XL partitioned into bounded batches per module or slice with one report per batch; XS/S done inline. The nested review owns `$integration-test-review`, `$security-review`, `$domain-entities-review`, `$experience-review` and the conditional domain-entity reference refresh (`$scan --target=domain-entities` → `$docs-update`, run when the final diff changes an entity, data contract or schema represented in `domain-entities-reference.md`); this workflow's tail does not repeat them. `$experience-review` records `NOT-APPLICABLE` or `ENVIRONMENT-BLOCKED` honestly and never promotes a new expectation without explicit acceptance.

## Memory & Reporting

- One task per selected step (and per batch for L/XL) so nothing is lost after compaction; a step that does not run keeps its task, closed with its logged deviation.
- Write the run report FIRST under `tmp/reports/` — triage result, gate evidence, deviations — and append per step or batch; re-read it and the current task list after compaction.
- Sub-agent briefs carry the goal file path and the resolved reference-doc paths, and make report-writing their first deliverable.
- Project conventions come from `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root). Any supported AI tool may implement or review once that contract, synced context and local docs are available. Code-extracted specs and TCs stay reference-only until canonical review accepts them.

## Fix Path & Loop Bounds

- Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass when the fixes were non-trivial.
- A failing test gets a root-cause verdict before either the source or the test is edited; never weaken an assertion to force green.
- Plan ceremony (`$plan` → `$plan-review`) for a fix set only when it is large, cross-module or ambiguous; a handful of validated local fixes are fixed directly.
- Review loops (each `$artifact-review` occurrence, the nested review): round 1 fixes every validated finding; round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 2 rounds, +1 when a CRITICAL/HIGH stays open; failing tests are uncapped; escalate with ask the user directly on no progress. Convergence lives inside each skill's own loop, so the sequence lists each review once.
- Spec-loop discipline: §8 derives invariant/property TCs for every hard rule and invariant, not only example scenarios; every behavior-changing finding updates BOTH the spec and the tests, never code alone.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** triage size, kind and risk FIRST — depth follows risk and ambiguity, not file count; record the triage and every deviation.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `$workflow-review-changes` converged inline · Feature Spec re-verified and synced when behavior changed · Goal Satisfaction matrix at `$workflow-end`.
**IMPORTANT MUST ATTENTION** spec before the first `$plan`, test specs reviewed before `$plan-execute`; a `BLOCKED` Plan Gate stops the build.
**IMPORTANT MUST ATTENTION** large ideas embed the five-field `large_idea_decomposition`; this workflow never creates a roadmap artifact.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence with confidence >80% to act; tests name the invariant they guard and fail when it breaks.

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
