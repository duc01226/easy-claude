---
name: workflow-idea-to-pbi
description: '[Workflow] Use when turning an idea or product vision into prioritized PBIs and stories (single-PBI deep mode or multi-opportunity discovery).'
disable-model-invocation: true
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

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

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
