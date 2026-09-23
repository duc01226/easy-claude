---
name: workflow-idea-to-pbi
description: '[Workflow] Use when turning an idea or product vision into prioritized PBIs and stories (single-PBI deep mode or multi-opportunity discovery).'
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
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** [Workflow] Trigger Idea to PBI workflow in one of two modes. **SINGLE-PBI DEEP** — capture or review idea/artifact, refine, author the §1-7 Feature Spec draft, generate TDD test specs from the idea, model the domain, plan, derive the PBI and stories, challenge review, DoR gate, mockup, prioritize (idea → draft Feature Spec → specs → from those specs to PBI). **MULTI-OPPORTUNITY DISCOVERY** — a raw product vision/problem → brainstorm (optionally web-research → deep-research) → RICE opportunity map → user multi-select → a light per-opportunity PBI loop → cross-PBI ranked backlog.

**Summary:**

- Detect the track first: Single-PBI Deep keeps spec/scenario/plan gates; Multi-Opportunity Discovery keeps one embedded decomposition context and skips the deep per-opportunity plan cycle.
- Apply the shared `isLargeIdea` rule before either track. When true, keep the complete `large_idea_decomposition` block in the PBI/spec outputs and aggregate it in the final presentation/mock-ups; do not create a roadmap file by default.
- Treat generated ideas, specs, PBIs, stories, and mockups as draft until their review/acceptance gates pass; finish with prioritized, dependency-aware backlog evidence.
- Every generated PBI MUST be one independently releasable actor-facing outcome with a complete entry-to-result journey; technical-only/foundation/setup work is enabling work under that outcome, never a standalone PBI.
- For UI PBIs, `$pbi-mockup` MUST produce a navigable mock app with every required page/view, navigation edge, common/domain/page component, applicable state, and full-flow demo — one isolated screen is a blocking failure.

**Mode Detection Gate (FIRST — pick the track before any step, then declare it):**

| Input                                                        | Mode                            | Track                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ONE concrete idea / ticket / brief                           | **Single-PBI Deep**             | Apply the large-idea signal check, then full track incl. `spec [mode=draft]` + `spec [mode=tests]` + conditional `$scenario` + `plan`/`plan-review`/`plan-validate` → 1 deeply-groomed PBI. SKIP `brainstorm`/research. |
| Raw product vision / problem spanning multiple opportunities | **Multi-Opportunity Discovery** | `brainstorm` (optionally research) → RICE map → multi-select → light per-opportunity PBI loop → cross-PBI `prioritize`; the shared decomposition block carries slice/dependency/non-goal/risk/deferred-owner context. Spec/plan/scenario cycle is **deep-mode only — never per opportunity**; `domain-analysis` runs once up front. |

When the input is ambiguous, ask by asking the user directly before step 1.

 - **Main steps:** detect mode → research/brainstorm as applicable → capture/refine → deep-only spec/test/scenario/plan gates → PBI/story review → challenge/DoR → UI mock-up/design-spec → prioritize → docs/presentation/handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before either track. A true signal requires all five fields: `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; all-false ideas omit the block. An existing supplied roadmap is read-only context; only an explicit roadmap-deliverable request enters the standalone writer.
- MUST ATTENTION run `$scenario` before the Single-PBI Deep plan only when the selected slice/decomposition needs adversarial replay, state, ownership, recovery, or evidence analysis; otherwise record the conditional skip with evidence. Multi-Opportunity Discovery skips it with the explicitly skipped per-opportunity plan cycle.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- **[BLOCKING] Tech-agnostic output:** idea / PBI / story / problem-statement prose stays tech-agnostic per `spec-principles.md` §3, in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) — no framework/product/language/design-pattern names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- MUST ATTENTION treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until their review or acceptance gate approves them.
- MUST ATTENTION apply `.claude/skills/shared/releasable-pbi-contract.md` at refine, artifact review, DoR, story, and mockup handoffs; a blocked outcome cannot advance by assumption.
- MUST ATTENTION allow any supported AI tool to produce or review artifacts when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## When to Use

**Single-PBI Deep mode:**

- PO or BA has a raw idea and needs to shape it into a grooming-ready PBI
- PO is handing off an existing ticket, PRD, or brief to the BA team for refinement
- Single-PBI refinement with stories, test specifications, challenge review, and DoR validation
- Feature needs a structured PBI before entering a sprint

**Multi-Opportunity Discovery mode:**

- PO/BA has a raw product vision or problem statement that spans several opportunities, and needs a prioritized backlog of multiple PBIs out of it in one pass
- A discovery sprint is needed: structured brainstorm → RICE opportunity map → multi-select → N PBIs → cross-PBI ranking (no implementation)

## When NOT to Use

- Just want a (provisional) Feature Spec from an idea, no backlog → use `workflow-idea-to-spec`
- Already have canonical Feature Specs and only need the backlog → use `workflow-spec-to-pbi` (spec-first entry)
- Implementation-only (PBI already exists and is DoR-ready) → use `workflow-feature` or `workflow-big-feature`
- Bug fixes → use `workflow-bugfix`

## Key Mechanics

### 1. Step Selection Gate

After confirming the workflow, present the full step list and let the user deselect irrelevant steps:

```
- [x] Large-idea decomposition gate — conditional: stable slice IDs, dependency order, non-goals, risks/evidence, and deferred-work owners in the owning PBI/spec
- [x] Brainstorm (brainstorm)                      — DISCOVERY MODE ONLY; RICE opportunity map
- [ ] Market research (web-research)               — DISCOVERY MODE, CONDITIONAL
- [ ] Deep research (deep-research)                 — DISCOVERY MODE, CONDITIONAL; runs only when web-research ran
- [x] Idea capture (idea)                          — REPEATS per opportunity in discovery mode
- [x] Spec & code discovery (spec-discovery)       — investigate related/affected specs + code before authoring
- [ ] Review existing artifact (artifact-review)   — CONDITIONAL
- [ ] PO → BA handoff (handoff)                    — CONDITIONAL
- [x] Refine to PBI (refine)                        — REPEATS per opportunity in discovery mode
- [x] Refinement rationale review (why-review)
- [x] Feature Spec draft (spec [mode=draft])        — DEEP MODE ONLY; §1-7 Feature Spec (provisional) before §8 tests
- [x] Test specifications (spec [mode=tests])       — DEEP MODE ONLY; idea → draft → specs
- [x] Test specification review (artifact-review --type=spec-tests)  — deep mode
- [x] Scenario analysis (scenario)                  — SINGLE-PBI DEEP MODE ONLY: adversarial replay, persistence, state, access, recovery, and evidence cases before the plan; skip with the plan cycle in discovery mode
- [ ] Domain analysis (domain-analysis)            — CONDITIONAL; discovery mode runs it ONCE up front
- [x] Domain rationale review (why-review)
- [x] Implementation plan (plan)                    — DEEP MODE ONLY
- [x] Plan review (plan-review)                     — deep mode
- [x] Plan validation (plan-validate)               — deep mode
- [x] PBI review (artifact-review --type=pbi)       — from specs to PBI; REPEATS per opportunity
- [x] User stories (story)                          — REPEATS per opportunity
- [x] Story review (artifact-review --type=story)   — REPEATS per opportunity
- [x] Dev BA PIC challenge (pbi-challenge)          — REPEATS per opportunity
- [x] Definition of Ready gate (dor-gate)           — REPEATS per opportunity
- [x] PBI HTML mock-up (pbi-mockup)                — CONDITIONAL; REPEATS per opportunity; faithfully matches current UI system
- [x] UI design spec (design-spec)                  — CONDITIONAL (UI PBIs); REPEATS per opportunity; UI specs after the mockup
- [x] Backlog prioritization (prioritize)           — cross-PBI in discovery mode
- [x] Documentation synchronization (docs-update)
```

Mark skipped steps as completed immediately. In single-PBI deep mode, deselect `brainstorm`/`web-research`/`deep-research`; keep the decomposition gate and run `$scenario` only when the slice/risk context needs it. In discovery mode, run `brainstorm` before the PBI loop and preserve one shared decomposition context; deselect `spec [mode=draft]`, `spec [mode=tests]`, `artifact-review --type=spec-tests`, `scenario`, and the `plan`/`plan-review`/`plan-validate` cycle (deep-mode-only); run `domain-analysis` once up front.

### 1a. Multi-Opportunity Discovery Loop (Discovery Mode core mechanic)

Activated only when the input is a raw product vision/problem spanning multiple opportunities (folded in from the former product-discovery workflow).

1. **Brainstorm → opportunity map.** Run `$brainstorm` with Double Diamond (problem framing → opportunity framing → ideation → convergence). Output a **RICE-scored opportunity map** of 3–8 items to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path).
2. **Multi-select.** Present the map by asking the user directly (`multiSelect: true`): "Which opportunities should we develop into PBIs?"
3. **Opportunity-map why-review gate** (before the loop): challenge whether the top-ranked opportunities are the right problems, whether RICE Reach/Impact are founded or speculative, run a pre-mortem, and name systemic alternatives. FAIL on a high-ranked opportunity → drop it or revisit framing; WARN → document and proceed with user acknowledgment.
4. **Task decomposition gate.** Call task tracking for EVERY task (N opportunities × 9 loop steps = N×9 minimum) BEFORE processing any opportunity — never start the loop without a complete task list.
5. **Per-opportunity light loop** (for EACH selected opportunity — NO `spec [mode=draft]`, NO `spec [mode=tests]`, NO `plan`/`plan-review`/`plan-validate`; `domain-analysis` already ran once up front):
   `$idea` → `$refine` (including the Releasable Outcome Gate) → `$artifact-review --type=pbi` → `$story` → `$artifact-review --type=story` → `$pbi-challenge` → `$dor-gate` → `$pbi-mockup` → `$design-spec` (mockup + UI specs skip for backend-only PBIs).
6. **Scale management.** For 6+ selected opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + its task list); the main context runs `$prioritize` at the end. Update a session summary table after every 3 opportunities.
7. **Cross-PBI prioritize.** After ALL opportunities are processed, run `$prioritize` across all session PBIs (cross-PBI RICE + dependency graph) → sprint-ready ranked backlog, flagging Must/Should/Could-Have. `$prioritize` MUST write the resulting rank/priority back into EACH PBI's frontmatter (priority propagation), not only the standalone backlog — so `$pbi-mockup` (header badge) and `$feature-presentation` (Scope & backlog slide) can surface each PBI's priority from the PBI itself.

> **Spec-hub coupling (§6 interaction surface ↔ UI artifacts):** for UI PBIs the `$pbi-mockup` and `$design-spec` produced here are NOT standalone artifacts — they are the deep companions of the governing Feature Spec's **§6 interaction surface** (View Inventory / Navigation Map / Key UI States / per-story click-path). The §6 thin intent seeds both; `design-spec` records its path in the spec's `design_spec:` frontmatter (and the mockup in `mockup:`) so the spec stays the navigable hub: a reader goes spec → §6 thin intent → mockup + `design-spec` deep companions, and the three never drift. Keep deep visual fidelity (layout, tokens, pixel detail) in the mockup/`design-spec`, never in §6. See the `SYNC:ui-intent-layer` block below for the full rule — do not restate it here. Backend-only PBIs (no UI) → skip `$pbi-mockup` + `$design-spec` and state that reason. UI PBIs MUST carry the page/view, navigation, component, state, and full-flow evidence required by the shared releasable-PBI contract.

### 2. task tracking Before Starting

**MANDATORY IMPORTANT MUST ATTENTION** — Call task tracking for every step before beginning any work:

```
Task tracking: "Brainstorm → RICE opportunity map" [discovery mode]
Task tracking: "Market research (web-research)" [discovery mode, conditional]
Task tracking: "Deep research (deep-research)" [discovery mode, conditional; only when web-research ran]
Task tracking: "Idea capture"
Task tracking: "Refine to PBI"
Task tracking: "Releasable Outcome Gate (inside refine)"
Task tracking: "Refinement rationale review (why-review after refine)"
Task tracking: "Feature Spec draft (spec [mode=draft])"
Task tracking: "Test specifications (spec [mode=tests])"
Task tracking: "Test specification review (artifact-review --type=spec-tests)"
Task tracking: "Domain analysis (domain-analysis)" [if domain entities change]
Task tracking: "Domain rationale review (why-review after domain-analysis)"
Task tracking: "Implementation plan (plan)"
Task tracking: "Plan review (plan-review)"
Task tracking: "Plan validation (plan-validate)"
Task tracking: "PBI review (artifact-review --type=pbi)"
Task tracking: "User stories (story)"
Task tracking: "Story review"
Task tracking: "Dev BA PIC challenge"
Task tracking: "Definition of Ready gate"
Task tracking: "PBI HTML mock-up" [if UI]
Task tracking: "Prioritize"
Task tracking: "Documentation synchronization (docs-update)"
Task tracking: "Session summary (watzup)"
```

One task per step. Mark each completed immediately when done — never batch.

### 3. Why-Review Gates (Purpose-Specific, Repeated)

This is the adversarial design rationale check. Purpose: validate the **WHY** of each artifact before investing in the next.

The workflow contains repeated `$why-review` gates after the non-review artifact steps. Use purpose-specific labels in sequence: refinement rationale (after refine) and domain rationale (after domain-analysis). Do not deduplicate them.

> The standalone gates before `artifact-review --type=spec-tests` and before `artifact-review --type=story` are intentionally omitted: `artifact-review` runs the same adversarial rationale techniques (steel-man, assumption stress test, pre-mortem, unseen alternatives, contrarian pass) plus the Trade-Off Interrogation Gate on that exact artifact and self-invokes `$why-review --validate-findings`, so a why-review immediately before it would review the same artifact twice.
>
> The standalone gate after `plan-validate` is intentionally omitted: every `plan-review` round runs a full-mode `$why-review` rationale sub-agent over the plan in its parallel review wave (it owns techniques 7-10) and then runs `$why-review --validate-findings` on the merged findings, so a separate why-review step after the plan cycle would be duplicate work.
>
> The standalone gate after `artifact-review --type=pbi` is intentionally omitted: `artifact-review --type=pbi` (like every review skill) already self-invokes `$why-review --validate-findings` as an internal Findings Validation Gate, so a separate why-review step right after it would be duplicate work.

**Challenge prompts:**

- Is this the right solution to the stated problem? What was rejected and why?
- Are the acceptance criteria constraints justified? What happens if any constraint is removed?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives not yet considered?
- Does the scope align with the stated business value?

**Output:** Why-Review checklist with PASS / WARN / FAIL.

| Result | Action                                          |
| ------ | ----------------------------------------------- |
| PASS   | Proceed to the next artifact step               |
| WARN   | Document risk, proceed with user acknowledgment |
| FAIL   | Revise PBI in `$refine` before continuing       |

### 4. TDD-Spec Gate (After refine + spec [mode=draft], Before the PBI is drafted)

Author the canonical §1-7 Feature Spec with `$spec [mode=draft]` (idea-sourced, provisional, §8 Evidence: TBD), then generate and review §8 test specifications right after refine — BEFORE the PBI is drafted — so the PBI, stories, and plan are derived FROM the draft Feature Spec + its test specs (idea → draft Feature Spec → specs → from those specs to PBI).

AI-generated TC drafts are reference-only until `$artifact-review --type=spec-tests`, `$pbi-challenge`, and `$dor-gate` accept them for delivery planning.

**Output requirements:**

- Map material acceptance criteria and user stories to TC IDs
- Route planned TC IDs to Feature doc Section 8 through `$spec [mode=tests]`; `$docs-update` later verifies feature docs and §8 TC ↔ executing test code sync.
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Run `$artifact-review --type=spec-tests` before `$pbi-challenge`

### 5. PBI Output Format

Each PBI artifact must contain:

| Section             | Content                                                     |
| ------------------- | ----------------------------------------------------------- |
| Title               | Clear, actionable                                           |
| Problem Statement   | Why this needs to exist                                     |
| Hypothesis          | If we build X, users will Y, which drives Z                 |
| Acceptance Criteria | GIVEN / WHEN / THEN format                                  |
| RICE Score          | Reach × Impact × Confidence / Effort                        |
| User Stories        | Who / What / Why                                            |
| Test Specs          | TC IDs mapped to acceptance criteria                        |
| DoR Status          | PASS / WARN / FAIL                                          |
| Mockup              | HTML mock-up based on project reference design docs (if UI) |

### 6. Artifact Locations

| Step           | Output Path                                           |
| -------------- | ----------------------------------------------------- |
| Idea           | `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md` — root is a default; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| PBI            | `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md` — root is a default; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| Stories        | Added to PBI artifact                                 |
| Test specs     | Feature doc Section 8 (canonical TC registry)         |
| DoR result     | Added to PBI artifact                                 |
| Mockup         | HTML mock-up file saved beside PBI artifact           |
| Prioritization | `team-artifacts/backlog/{YYMMDD}-backlog-update.md` — root is a default; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| Docs sync      | `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`        |

`tmp/reports/` is a fixed framework invariant; every other path above sits under the team-artifacts root, resolved from `docsRoots.teamArtifacts.path` in `docs/project-config.json` (default `team-artifacts/`). These roots intentionally match the child skills (`idea`, `refine`, `story`, `pbi-mockup`, `prioritize`, `docs-update`); resolve the root once from the config and keep this workflow and its child skills consistent in the same change.

Write output IMMEDIATELY after each step — never batch across steps.

### 7. Conditional Skip Rules

| Step                                                       | Skip When                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `$brainstorm`                                              | Single-PBI deep mode (one concrete idea/ticket)                                     |
| `$web-research`                                            | Single-PBI deep mode, internal tool, or well-understood domain                      |
| `$deep-research`                                           | Single-PBI deep mode, or whenever web-research is skipped (runs only when it ran)   |
| `$artifact-review`                                         | No existing artifact — raw idea input                                               |
| `$spec [mode=draft]`                                       | Discovery mode (deep-mode only — never per opportunity)                             |
| `$spec [mode=tests]`, `$artifact-review --type=spec-tests` | Discovery mode (deep-mode only — never per opportunity)                             |
| `$domain-analysis`                                         | Idea introduces no new/changed domain entities; in discovery mode run ONCE up front |
| `$plan`, `$plan-review`, `$plan-validate`                  | Discovery mode (deep-mode only — never per opportunity)                             |
| `$pbi-mockup`                                              | Backend-only PBI — no UI changes                                                    |

---

### 8. Near-Final Documentation Synchronization

Run `$docs-update` after `$prioritize` and before `$workflow-end`.

Purpose:

- Sync refined PBI/story outputs into business feature docs where applicable.
- Sync feature doc Section 8 test specifications and the business spec root's derived indexes (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) after `$artifact-review --type=spec-tests`.
- Verify specs, feature docs, and TDD/spec docs do not drift before workflow closure.
- Record skipped sub-phases explicitly when no impacted docs exist.

---

**IMPORTANT MANDATORY Steps:** $web-research -> $deep-research -> $brainstorm -> $idea -> $spec-discovery -> $artifact-review -> $refine -> $why-review -> $spec [mode=draft] -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $scenario -> $domain-analysis -> $why-review -> $plan -> $plan-review -> $plan-validate -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $design-spec -> $prioritize -> $docs-update -> $feature-presentation -> $workflow-end -> $watzup

> **Mode gating of the canonical sequence above** — **Single-PBI deep mode:** skip $brainstorm + $web-research + $deep-research; run the full deep track (one PBI). **Discovery mode:** run $brainstorm (optionally $web-research → $deep-research), skip $spec [mode=draft], $spec [mode=tests], $artifact-review --type=spec-tests, $spec-clarify, $plan, $plan-review, $plan-validate; loop $idea→/refine→/artifact-review --type=pbi→/story→/artifact-review --type=story→/pbi-challenge→/dor-gate→/pbi-mockup→/design-spec per selected opportunity, then $prioritize cross-PBI.

> **[BLOCKING]** Each selected step MUST ATTENTION invoke its skill invocation — marking a selected task `completed` without skill invocation is a workflow violation. A declared conditional or mode-gated step may be marked skipped only with evidence and an explicit reason; NEVER batch-complete validation gates.

Activate the `workflow-idea-to-pbi` workflow. Run `$start-workflow workflow-idea-to-pbi` with the user's prompt as context.

**Steps:**
$web-research → $deep-research → $brainstorm → $idea → $spec-discovery → $artifact-review → $refine → $why-review → $spec [mode=draft] → $spec [mode=tests] → $artifact-review --type=spec-tests → $spec-clarify → $scenario → $domain-analysis → $why-review → $plan → $plan-review → $plan-validate → $artifact-review --type=pbi → $story → $artifact-review --type=story → $pbi-challenge → $dor-gate → $pbi-mockup → $design-spec → $prioritize → $docs-update → $feature-presentation → $workflow-end → $watzup

> **Conditional / mode-gated steps:**
>
> - `$brainstorm`, `$web-research`, `$deep-research` — DISCOVERY MODE only; skip in single-PBI deep mode (`$deep-research` runs only when `$web-research` ran)
> - `$spec [mode=draft]`, `$spec [mode=tests]`, `$artifact-review --type=spec-tests`, `$plan`, `$plan-review`, `$plan-validate` — DEEP MODE only; never run per opportunity in discovery mode
> - `$artifact-review` — skip if no existing artifact/ticket/PRD; proceed straight to `$refine`
> - `$domain-analysis` — skip if the idea introduces no new/changed domain entities; in discovery mode run once up front
> - `$scenario` — run for a selected slice when its risks need adversarial replay/state/ownership/recovery/evidence analysis; otherwise mark the conditional skip with evidence
> - `$pbi-mockup` — skip if PBI is backend-only (no UI changes); when run, the mockup MUST faithfully match the current UI system (gated by `SYNC:existing-ui-research`)
> - `$design-spec` — UI PBIs only (runs right after `$pbi-mockup`); skip if PBI is backend-only; authors the PBI's tech-agnostic UI specs, gated by `SYNC:existing-ui-research`

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

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> **Native-first resolution.** A native contract may be declared by config or local references. Before authoring, resolve the configured profile's intent/evidence section roles, logical IDs, and carrier from `docs/project-config.json` (`specArtifacts`) and the required local references, and map every item below onto them. An unresolved owner, role, ID, carrier, or companion link stays `UNKNOWN`/`BLOCKED` — never guessed.
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name. Per view, record its **information priority** — each piece of information and each input the user meets is classified `now` (the view's task needs it), `later` (deferred to a follow-up view or step), or `not here` (belongs elsewhere) — and its **container role** (full view · focused dialog · side panel · stepped flow · inline edit), chosen for the task, never by habit.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable states** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story action flows** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the configured profile owns.
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked companion design artifact. Record that artifact's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and action flows. Technology detail belongs in the companion design artifact, never here.
>
> **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** cross-reference each action flow to the default logical IDs `US-`/`OP-`/`BR-`, and record the companion artifact in the default `design_spec:`/`mockup:` frontmatter keys.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a reviewed, prioritized PBI backlog in which every generated PBI is an independently releasable actor-facing outcome, preserving embedded large-idea decomposition, explicit non-goals, full-flow UI evidence, and required human gates. A roadmap artifact is produced only by an explicit standalone request.
**IMPORTANT MUST ATTENTION Main steps:** detect mode → research/brainstorm as applicable → capture/refine → deep-only spec/test/scenario/plan gates → PBI/story review → challenge/DoR → UI mock-up/design-spec → prioritize → docs/presentation/handoff; ordinary routes never write the product-roadmap artifact (default `docs/product-roadmap.md`; path from `docsRoots.productRoadmap.path` in `docs/project-config.json`).

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent when nested, one `in_progress` at a time.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** Write findings to `tmp/reports/` per file — never hold in memory.
- **Sub-Agent Return Contract:** Sub-agents return summary only; full detail to report on disk.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting — one task per step
- **MANDATORY IMPORTANT MUST ATTENTION** run both purpose-specific why-review gates: after refine and after domain-analysis (none before artifact-review — it owns test-spec/story rationale; none after plan-validate — every plan-review round runs its own parallel why-review rationale sub-agent); FAIL blocks the next artifact step, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** spec [mode=draft] authors the §1-7 Feature Spec (provisional) right after refine, then spec [mode=tests] and artifact-review --type=spec-tests run before the PBI is drafted (idea → draft Feature Spec → specs → from those specs to PBI); both spec [mode=draft] and spec [mode=tests] are SINGLE-PBI DEEP MODE ONLY (never per opportunity in discovery mode)
- **MANDATORY IMPORTANT MUST ATTENTION** pbi-challenge must be run by a reviewer different from the drafter
- **MANDATORY IMPORTANT MUST ATTENTION** dor-gate must pass (PASS or WARN) before pbi-mockup is finalized; for UI PBIs, pbi-mockup AND design-spec both run (mockup first, then UI specs) so the PBI carries a faithful mockup matching the current UI system PLUS UI specs — both skip for backend-only PBIs and both are gated by SYNC:existing-ui-research; the code-producing design lanes are reference-only, not part of this workflow
- **MANDATORY IMPORTANT MUST ATTENTION** every generated PBI MUST pass the Releasable Outcome Gate before artifact handoff: one actor-facing outcome, complete entry-to-result journey, observable evidence, and no standalone technical/foundation/setup/migration scope — apply `.claude/skills/shared/releasable-pbi-contract.md`
- **MANDATORY IMPORTANT MUST ATTENTION** for UI PBIs, pbi-mockup MUST be a navigable mock app containing every required page/view, navigation edge, common/domain/page component, applicable state, and full-flow demo; one isolated screen is a FAIL, not a partial pass
- **MANDATORY IMPORTANT MUST ATTENTION** write each artifact immediately — never batch output across steps
- **MANDATORY IMPORTANT MUST ATTENTION** prioritize must write the resulting rank/priority back into EACH PBI's frontmatter (priority propagation) — not only the standalone backlog — and that priority MUST then surface in the pbi-mockup generated files (header badge) and the feature-presentation deck (Scope & backlog slide, ranked order + priority label per PBI)
- **MANDATORY IMPORTANT MUST ATTENTION** docs-update runs after prioritize and before workflow-end to sync specs, feature docs, and TDD/spec dashboards
- **MANDATORY IMPORTANT MUST ATTENTION** feature-presentation runs after docs-update and before workflow-end to synthesize one standalone stakeholder HTML deck (surfacing each PBI's priority/rank)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final watzup summary: PBI title, DoR result, any blocking items, recommended next step
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

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
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
