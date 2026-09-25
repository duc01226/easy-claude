---
name: workflow-idea-to-pbi
version: 2.2.0
description: '[Workflow] Use when turning an idea or product vision into prioritized PBIs and stories (single-PBI deep mode or multi-opportunity discovery).'
disable-model-invocation: true
---

## Quick Summary

**Goal:** [Workflow] Trigger Idea to PBI workflow in one of two modes. **SINGLE-PBI DEEP** — capture or review idea/artifact, refine, author the §1-7 Feature Spec draft, generate TDD test specs from the idea, model the domain, plan, derive the PBI and stories, challenge review, DoR gate, mockup, prioritize (idea → draft Feature Spec → specs → from those specs to PBI). **MULTI-OPPORTUNITY DISCOVERY** — a raw product vision/problem → brainstorm (optionally web-research → deep-research) → RICE opportunity map → user multi-select → a light per-opportunity PBI loop → cross-PBI ranked backlog.

**Summary:**

- Detect the track first: Single-PBI Deep keeps spec/scenario/plan gates; Multi-Opportunity Discovery keeps one embedded decomposition context and skips the deep per-opportunity plan cycle.
- Apply the shared `isLargeIdea` rule before either track. When true, keep the complete `large_idea_decomposition` block in the PBI/spec outputs and aggregate it in the final presentation/mock-ups; do not create a roadmap file by default.
- Treat generated ideas, specs, PBIs, stories, and mockups as draft until their review/acceptance gates pass; finish with prioritized, dependency-aware backlog evidence.
- Every generated PBI MUST be one independently releasable actor-facing outcome with a complete entry-to-result journey; technical-only/foundation/setup work is enabling work under that outcome, never a standalone PBI.
- For UI PBIs, `/pbi-mockup` MUST produce a navigable mock app with every required page/view, navigation edge, common/domain/page component, applicable state, and full-flow demo — one isolated screen is a blocking failure.

**Mode Detection Gate (FIRST — pick the track before any step, then declare it):**

| Input                                                        | Mode                            | Track                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ONE concrete idea / ticket / brief                           | **Single-PBI Deep**             | Apply the large-idea signal check, then full track incl. `spec [mode=draft]` + `spec [mode=tests]` + conditional `/scenario` + `plan`/`plan-review`/`plan-validate` → 1 deeply-groomed PBI. SKIP `brainstorm`/research. |
| Raw product vision / problem spanning multiple opportunities | **Multi-Opportunity Discovery** | `brainstorm` (optionally research) → RICE map → multi-select → light per-opportunity PBI loop → cross-PBI `prioritize`; the shared decomposition block carries slice/dependency/non-goal/risk/deferred-owner context. Spec/plan/scenario cycle is **deep-mode only — never per opportunity**; `domain-analysis` runs once up front. |

When the input is ambiguous, ask via `AskUserQuestion` before step 1.

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
- MUST ATTENTION run `/scenario` before the Single-PBI Deep plan only when the selected slice/decomposition needs adversarial replay, state, ownership, recovery, or evidence analysis; otherwise record the conditional skip with evidence. Multi-Opportunity Discovery skips it with the explicitly skipped per-opportunity plan cycle.
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

Mark skipped steps as completed immediately. In single-PBI deep mode, deselect `brainstorm`/`web-research`/`deep-research`; keep the decomposition gate and run `/scenario` only when the slice/risk context needs it. In discovery mode, run `brainstorm` before the PBI loop and preserve one shared decomposition context; deselect `spec [mode=draft]`, `spec [mode=tests]`, `artifact-review --type=spec-tests`, `scenario`, and the `plan`/`plan-review`/`plan-validate` cycle (deep-mode-only); run `domain-analysis` once up front.

### 1a. Multi-Opportunity Discovery Loop (Discovery Mode core mechanic)

Activated only when the input is a raw product vision/problem spanning multiple opportunities (folded in from the former product-discovery workflow).

1. **Brainstorm → opportunity map.** Run `/brainstorm` with Double Diamond (problem framing → opportunity framing → ideation → convergence). Output a **RICE-scored opportunity map** of 3–8 items to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path).
2. **Multi-select.** Present the map via `AskUserQuestion` (`multiSelect: true`): "Which opportunities should we develop into PBIs?"
3. **Opportunity-map why-review gate** (before the loop): challenge whether the top-ranked opportunities are the right problems, whether RICE Reach/Impact are founded or speculative, run a pre-mortem, and name systemic alternatives. FAIL on a high-ranked opportunity → drop it or revisit framing; WARN → document and proceed with user acknowledgment.
4. **Task decomposition gate.** Call `TaskCreate` for EVERY task (N opportunities × 9 loop steps = N×9 minimum) BEFORE processing any opportunity — never start the loop without a complete task list.
5. **Per-opportunity light loop** (for EACH selected opportunity — NO `spec [mode=draft]`, NO `spec [mode=tests]`, NO `plan`/`plan-review`/`plan-validate`; `domain-analysis` already ran once up front):
   `/idea` → `/refine` (including the Releasable Outcome Gate) → `/artifact-review --type=pbi` → `/story` → `/artifact-review --type=story` → `/pbi-challenge` → `/dor-gate` → `/pbi-mockup` → `/design-spec` (mockup + UI specs skip for backend-only PBIs).
6. **Scale management.** For 6+ selected opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + its task list); the main context runs `/prioritize` at the end. Update a session summary table after every 3 opportunities.
7. **Cross-PBI prioritize.** After ALL opportunities are processed, run `/prioritize` across all session PBIs (cross-PBI RICE + dependency graph) → sprint-ready ranked backlog, flagging Must/Should/Could-Have. `/prioritize` MUST write the resulting rank/priority back into EACH PBI's frontmatter (priority propagation), not only the standalone backlog — so `/pbi-mockup` (header badge) and `/feature-presentation` (Scope & backlog slide) can surface each PBI's priority from the PBI itself.

> **Spec-hub coupling (§6 interaction surface ↔ UI artifacts):** for UI PBIs the `/pbi-mockup` and `/design-spec` produced here are NOT standalone artifacts — they are the deep companions of the governing Feature Spec's **§6 interaction surface** (View Inventory / Navigation Map / Key UI States / per-story click-path). The §6 thin intent seeds both; `design-spec` records its path in the spec's `design_spec:` frontmatter (and the mockup in `mockup:`) so the spec stays the navigable hub: a reader goes spec → §6 thin intent → mockup + `design-spec` deep companions, and the three never drift. Keep deep visual fidelity (layout, tokens, pixel detail) in the mockup/`design-spec`, never in §6. See the `SYNC:ui-intent-layer` block below for the full rule — do not restate it here. Backend-only PBIs (no UI) → skip `/pbi-mockup` + `/design-spec` and state that reason. UI PBIs MUST carry the page/view, navigation, component, state, and full-flow evidence required by the shared releasable-PBI contract.

### 2. TaskCreate Before Starting

**MANDATORY IMPORTANT MUST ATTENTION** — Call `TaskCreate` for every step before beginning any work:

```
TaskCreate: "Brainstorm → RICE opportunity map" [discovery mode]
TaskCreate: "Market research (web-research)" [discovery mode, conditional]
TaskCreate: "Deep research (deep-research)" [discovery mode, conditional; only when web-research ran]
TaskCreate: "Idea capture"
TaskCreate: "Refine to PBI"
TaskCreate: "Releasable Outcome Gate (inside refine)"
TaskCreate: "Refinement rationale review (why-review after refine)"
TaskCreate: "Feature Spec draft (spec [mode=draft])"
TaskCreate: "Test specifications (spec [mode=tests])"
TaskCreate: "Test specification review (artifact-review --type=spec-tests)"
TaskCreate: "Domain analysis (domain-analysis)" [if domain entities change]
TaskCreate: "Domain rationale review (why-review after domain-analysis)"
TaskCreate: "Implementation plan (plan)"
TaskCreate: "Plan review (plan-review)"
TaskCreate: "Plan validation (plan-validate)"
TaskCreate: "PBI review (artifact-review --type=pbi)"
TaskCreate: "User stories (story)"
TaskCreate: "Story review"
TaskCreate: "Dev BA PIC challenge"
TaskCreate: "Definition of Ready gate"
TaskCreate: "PBI HTML mock-up" [if UI]
TaskCreate: "Prioritize"
TaskCreate: "Documentation synchronization (docs-update)"
TaskCreate: "Session summary (watzup)"
```

One task per step. Mark each completed immediately when done — never batch.

### 3. Why-Review Gates (Purpose-Specific, Repeated)

This is the adversarial design rationale check. Purpose: validate the **WHY** of each artifact before investing in the next.

The workflow contains repeated `/why-review` gates after the non-review artifact steps. Use purpose-specific labels in sequence: refinement rationale (after refine) and domain rationale (after domain-analysis). Do not deduplicate them.

> The standalone gates before `artifact-review --type=spec-tests` and before `artifact-review --type=story` are intentionally omitted: `artifact-review` runs the same adversarial rationale techniques (steel-man, assumption stress test, pre-mortem, unseen alternatives, contrarian pass) plus the Trade-Off Interrogation Gate on that exact artifact and self-invokes `/why-review --validate-findings`, so a why-review immediately before it would review the same artifact twice.
>
> The standalone gate after `plan-validate` is intentionally omitted: every `plan-review` round runs a full-mode `/why-review` rationale sub-agent over the plan in its parallel review wave (it owns techniques 7-10) and then runs `/why-review --validate-findings` on the merged findings, so a separate why-review step after the plan cycle would be duplicate work.
>
> The standalone gate after `artifact-review --type=pbi` is intentionally omitted: `artifact-review --type=pbi` (like every review skill) already self-invokes `/why-review --validate-findings` as an internal Findings Validation Gate, so a separate why-review step right after it would be duplicate work.

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
| FAIL   | Revise PBI in `/refine` before continuing       |

### 4. TDD-Spec Gate (After refine + spec [mode=draft], Before the PBI is drafted)

Author the canonical §1-7 Feature Spec with `/spec [mode=draft]` (idea-sourced, provisional, §8 Evidence: TBD), then generate and review §8 test specifications right after refine — BEFORE the PBI is drafted — so the PBI, stories, and plan are derived FROM the draft Feature Spec + its test specs (idea → draft Feature Spec → specs → from those specs to PBI).

AI-generated TC drafts are reference-only until `/artifact-review --type=spec-tests`, `/pbi-challenge`, and `/dor-gate` accept them for delivery planning.

**Output requirements:**

- Map material acceptance criteria and user stories to TC IDs
- Route planned TC IDs to Feature doc Section 8 through `/spec [mode=tests]`; `/docs-update` later verifies feature docs and §8 TC ↔ executing test code sync.
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Run `/artifact-review --type=spec-tests` before `/pbi-challenge`

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
| `/brainstorm`                                              | Single-PBI deep mode (one concrete idea/ticket)                                     |
| `/web-research`                                            | Single-PBI deep mode, internal tool, or well-understood domain                      |
| `/deep-research`                                           | Single-PBI deep mode, or whenever web-research is skipped (runs only when it ran)   |
| `/artifact-review`                                         | No existing artifact — raw idea input                                               |
| `/spec [mode=draft]`                                       | Discovery mode (deep-mode only — never per opportunity)                             |
| `/spec [mode=tests]`, `/artifact-review --type=spec-tests` | Discovery mode (deep-mode only — never per opportunity)                             |
| `/domain-analysis`                                         | Idea introduces no new/changed domain entities; in discovery mode run ONCE up front |
| `/plan`, `/plan-review`, `/plan-validate`                  | Discovery mode (deep-mode only — never per opportunity)                             |
| `/pbi-mockup`                                              | Backend-only PBI — no UI changes                                                    |

---

### 8. Near-Final Documentation Synchronization

Run `/docs-update` after `/prioritize` and before `/workflow-end`.

Purpose:

- Sync refined PBI/story outputs into business feature docs where applicable.
- Sync feature doc Section 8 test specifications and the business spec root's derived indexes (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) after `/artifact-review --type=spec-tests`.
- Verify specs, feature docs, and TDD/spec docs do not drift before workflow closure.
- Record skipped sub-phases explicitly when no impacted docs exist.

---

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /brainstorm -> /idea -> /spec-discovery -> /artifact-review -> /refine -> /why-review -> /spec [mode=draft] -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /scenario -> /domain-analysis -> /why-review -> /plan -> /plan-review -> /plan-validate -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /design-spec -> /prioritize -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

> **Mode gating of the canonical sequence above** — **Single-PBI deep mode:** skip /brainstorm + /web-research + /deep-research; run the full deep track (one PBI). **Discovery mode:** run /brainstorm (optionally /web-research → /deep-research), skip /spec [mode=draft], /spec [mode=tests], /artifact-review --type=spec-tests, /spec-clarify, /plan, /plan-review, /plan-validate; loop /idea→/refine→/artifact-review --type=pbi→/story→/artifact-review --type=story→/pbi-challenge→/dor-gate→/pbi-mockup→/design-spec per selected opportunity, then /prioritize cross-PBI.

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-idea-to-pbi` workflow. Run `/start-workflow workflow-idea-to-pbi` with the user's prompt as context.

**Steps:**
/web-research → /deep-research → /brainstorm → /idea → /spec-discovery → /artifact-review → /refine → /why-review → /spec [mode=draft] → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec-clarify → /scenario → /domain-analysis → /why-review → /plan → /plan-review → /plan-validate → /artifact-review --type=pbi → /story → /artifact-review --type=story → /pbi-challenge → /dor-gate → /pbi-mockup → /design-spec → /prioritize → /docs-update → /feature-presentation → /workflow-end → /watzup

> **Conditional / mode-gated steps:**
>
> - `/brainstorm`, `/web-research`, `/deep-research` — DISCOVERY MODE only; skip in single-PBI deep mode (`/deep-research` runs only when `/web-research` ran)
> - `/spec [mode=draft]`, `/spec [mode=tests]`, `/artifact-review --type=spec-tests`, `/plan`, `/plan-review`, `/plan-validate` — DEEP MODE only; never run per opportunity in discovery mode
> - `/artifact-review` — skip if no existing artifact/ticket/PRD; proceed straight to `/refine`
> - `/domain-analysis` — skip if the idea introduces no new/changed domain entities; in discovery mode run once up front
> - `/scenario` — run for a selected slice when its risks need adversarial replay/state/ownership/recovery/evidence analysis; otherwise mark the conditional skip with evidence
> - `/pbi-mockup` — skip if PBI is backend-only (no UI changes); when run, the mockup MUST faithfully match the current UI system (gated by `SYNC:existing-ui-research`)
> - `/design-spec` — UI PBIs only (runs right after `/pbi-mockup`); skip if PBI is backend-only; authors the PBI's tech-agnostic UI specs, gated by `SYNC:existing-ui-research`

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per step
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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
