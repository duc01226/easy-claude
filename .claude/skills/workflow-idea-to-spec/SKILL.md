---
name: workflow-idea-to-spec
version: 2.0.0
description: '[Workflow] Use when turning a raw idea, vision, or problem into one reviewed provisional canonical spec under the configured artifact profile. Stops at the spec; chain workflow-spec-to-pbi for a backlog.'
disable-model-invocation: false
---

> **Renamed:** formerly `workflow-product-discovery` — now `/workflow-idea-to-spec`. The old name no longer resolves as a slash command.

## Quick Summary

**Goal:** Convert a raw idea/vision/problem into one reviewed, docs-synced provisional canonical spec with test/evidence coverage in the configured artifact contract and conditional large-idea decomposition; use the portable tech-free 8-section/§8 TC form only when neither a native profile nor local artifact contract applies. Stop there, never create a PBI backlog or implicit roadmap. Chain `workflow-spec-to-pbi`/`workflow-idea-to-pbi` as appropriate; use `workflow-code-to-spec` only after implementation exists.

**Summary:**

- **Main steps (run in order):** (1) brainstorm the raw idea and classify the four `isLargeIdea` signals; (2) conditionally carry the complete five-field `large_idea_decomposition` block; (3) run spec discovery, conditional scenario analysis, domain analysis, and rationale review; (4) capture the idea; (5) author the provisional canonical spec and its configured test/evidence cases; (6) run artifact review, UI design-spec, clarification, rationale review, docs sync, presentation, and workflow end gates.
- Large ideas embed stable slice IDs, dependency order, non-goals, risk/evidence owners, and deferred-work owners in the canonical spec's profile/local-reference-declared role that permits slice plans, and carry the block into downstream presentation/mock-up inputs. Stop and resolve the mapping only if neither the native profile nor local artifact reference declares a role that permits slice plans; never invent a section. Ordinary ideas omit the block and roadmap fields; no default workflow step creates the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides).
- The workflow stops at the reviewed, docs-synced canonical spec; it never decomposes into PBIs/stories or invents unresolved product meaning. Explicit `--mode=roadmap` remains a separate, user-requested route.

**Workflow:**

1. **Frame** — brainstorm the idea, classify large-idea signals, capture any required decomposition block, analyze domain, and validate the problem framing (why-review).
2. **Author** — capture the idea, then author the canonical provisional spec (`spec [mode=draft]`) + configured test/evidence cases (`spec [mode=tests]`).
3. **Review & Sync** — review native test/evidence cases and the canonical spec, validate rationale (why-review), sync docs.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION author the spec via `spec [mode=draft]`; record its provisional state and planned test/evidence coverage using the native profile. The portable §8 `Evidence: TBD`, `Status: Planned`, and `provisional: true` form applies only when neither a native profile nor local artifact contract defines those fields.
- MUST ATTENTION apply the shared `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` rule before authoring. A true signal requires the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) in the canonical spec's profile/local-reference-declared role that permits slice plans; all-false ideas omit it. Stop for mapping only if neither the native profile nor local artifact reference declares a role that permits slice plans; never invent a section. An explicitly supplied roadmap is read-only context, not a writer trigger.
- NEVER decompose into PBIs/stories/backlog here — that is `workflow-spec-to-pbi`'s job. NEVER skip the Feature Spec authoring core.

## Canonical Artifact Profile

Before discovery or authoring, read `docs/project-config.json` fields `specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, and `specArtifacts` when declared, plus the configured template, local `spec-system-reference.md`, and `spec-principles.md`. Resolve the business root and template from the configured paths; resolve section roles, identifiers, ownership, and evidence/test carriers from the declared `specArtifacts` profile and local artifact contract. Apply tech-agnostic prose only to roles designated for intent; use declared contract roles for permitted technical detail. The portable `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free eight-section shape (including the mandatory inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI-bearing features), and `TC-{FEATURE}-{NNN}` case format apply only when no native profile or project-specific template/reference defines another contract. Default cases carry `Business Intent / Invariant Guarded`, user-visible GIVEN/WHEN/THEN, Evidence, CoveredBy, and status; before code lands, the fallback provisional values are `Evidence: TBD`, `Status: Planned`, and `provisional: true`. Never invent a section, ID, provisional field, or second test registry to fit the fallback. A malformed/conflicting profile or unmapped required intent/test evidence is BLOCKED/UNKNOWN, not a silent fallback or a PASS.

Keep the authored-spec, test-spec, test-spec review, artifact review, clarification, rationale, documentation-sync, and presentation gates in their declared order. Map each to the native spec roles and test/evidence carriers. For UI ideas, couple `design-spec` to the profile's declared interaction-intent owner when one exists; if none exists, preserve the separate UI design spec and surface the missing/unclear coupling instead of fabricating a numbered section.

## When to Use

- PO/BA has a raw product vision, problem statement, or "we need to build X" starting point and wants a canonical Feature Spec
- Team wants to capture intended behavior before code exists: keep intent tech-agnostic in the profile-designated role and record only permitted contracts in their declared roles (spec-first / TDD-first)
- A single idea or capability needs a reviewed, AI-implementable Feature Spec as the source of truth for later implementation

## When NOT to Use

- Implementation already exists and you want a spec FROM code → use `workflow-code-to-spec`
- You want a full grooming-ready PBI backlog from the idea in one pass → use `workflow-idea-to-pbi`
- You already have a Feature Spec and want PBIs from it → use `workflow-spec-to-pbi`
- Implementation work (code writing) → use `workflow-implement-spec` when the spec already states the behavior; otherwise `workflow-feature` or `workflow-big-feature`
- Bug fixes → use `workflow-bugfix`

## Key Mechanics

### 1. Embedded Decomposition → Capability to Spec

Run `/brainstorm` to converge the capability and evaluate the four large-idea signals. When any signal is true, record the complete decomposition block in the canonical spec's profile/local-reference-declared role that permits slice plans: stable slice IDs, dependency edges, non-goals, risk/evidence owners, and deferred-work owners. Stop for mapping only if neither the native profile nor local artifact reference declares a role that permits slice plans. Run `/scenario` after spec discovery when the decomposition or supplied scope needs replay, state, ownership, persistence, recovery, or evidence analysis. Do not invoke the standalone product-roadmap writer unless the user explicitly requests a roadmap deliverable.

### 1a. Brainstorm → Converge on the Capability to Spec

The `/brainstorm` step frames the idea using the Double Diamond process:

- **Problem framing:** POV statement, 5 Whys / Fishbone, JTBD job stories, HMW questions
- **Opportunity framing:** Opportunity Solution Tree (enhancement) OR Lean Canvas (new product)
- **Ideation:** SCAMPER, Crazy 8s, Impact Mapping
- **Convergence:** pick the single feature/capability to author as a canonical project spec

Output: the converged capability (or a short list if multiple distinct capabilities emerge).
AI presents the framing and confirms scope: **"Which capability should we author as a canonical spec?"** If multiple distinct capabilities are in scope, confirm with the user and author one canonical spec per capability (sub-agent per capability for 4+ — see Scale awareness).

### 1b. Spec-Discovery (Landscape Investigation — After scope brainstorm, Before domain-analysis)

`/spec-discovery` investigates the surrounding system BEFORE authoring: it globs the configured business spec root, using the framework config loader's fallback only when no root is configured, to classify every related / overlapping / affected canonical spec; investigates related code (graph-expanded when `.code-graph/graph.db` exists); and surfaces gaps, missing test cases / user stories, and the **invariant landscape** the idea must respect. It ends in a **BLOCKING scope-decision gate** — author a NEW spec, EXTEND an existing one, or SPLIT into N — so no duplicate / overlapping spec is authored. Greenfield (no specs + no code) short-circuits with a recorded reason.

### 2. Why-Review Gate (After domain-analysis, Before spec authoring)

Before authoring the spec, validate the idea framing with `/why-review`:

**Challenge prompts:**

- Is this truly the right problem to solve? What was deprioritized and why?
- Pre-mortem: if this is built and misses in 6 months, what was the root cause?
- Are there systemic alternatives (infrastructure change, process change) that make this unnecessary?

| Result | Action                                        |
| ------ | --------------------------------------------- |
| PASS   | Proceed to spec authoring                     |
| WARN   | Document risk, acknowledge with user, proceed |
| FAIL   | Revisit brainstorm framing before authoring   |

### 3. Spec Authoring Flow (core mechanic — idea → provisional Feature Spec)

These steps run in sequence. **Spec-driven order: idea → draft Feature Spec → test specs → review.**

| Step                                 | Purpose                                                                                                                  | Output                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `/idea`                              | Capture the converged idea as a structured artifact                                                                      | `ideas/{date}-po-idea-{slug}.md` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) |
| `/spec [mode=draft]`                 | Author the canonical provisional spec from the idea text using the native section and provisional-state contract (no code grep) | Configured canonical spec path under the business root |
| `/spec [mode=tests]`                 | Author planned behavioral/test-evidence cases in the profile's configured format before code exists; default Section 8 `TC-{FEATURE}-{NNN}` cases carry business intent, user-visible GIVEN/WHEN/THEN, Evidence, CoveredBy, and planned status | Configured test/evidence carrier |
| `/artifact-review --type=spec-tests` | Test-spec quality check                                                                                                  | Reviewed configured cases/evidence              |
| `/artifact-review`                   | Canonical spec quality check                                                                                             | Reviewed canonical spec                         |
| `/design-spec`                       | UI ideas only — author tech-agnostic UI specs (NO mockup/backlog; spec-only contract preserved); gated by `SYNC:existing-ui-research`. Skip for backend-only ideas | UI design specs                                 |
| `/spec-clarify`                     | Brainstorm open questions, audit non-obvious decisions, confirm with user (BLOCKING)                                     | Clarified spec + Decisions Log                  |
| `/why-review`                        | Validate the authored spec's rationale and completeness                                                                  | Why-Review checklist                            |
| `/docs-update`                       | Sync the canonical spec's configured test/evidence representation and any declared derived indexes                      | Docs-update report                              |

**Provisional output:** because no code exists yet, mark the spec and planned test evidence using the provisional-state convention defined by the native profile or local artifact contract. The first `workflow-code-to-spec` / `spec [mode=update]` run against real code must reconcile the planned cases with observed implementation/test evidence and clear provisional markers only when the acceptance rule defined by the native profile or local artifact contract is met. Use `Evidence: TBD`, `Status: Planned`, `provisional: true`, and `[Source:]` for the portable fallback only when neither a native profile nor local artifact contract defines alternatives.

> **Spec-hub coupling (native interaction intent ↔ UI artifacts):** when the native profile or local artifact contract defines an interaction/UX intent section or frontmatter link, the `/design-spec` produced here is its deep companion; seed it from that native owner and record the link there so the artifacts do not drift. Use §6, its View Inventory / Navigation Map / Key UI States / per-story click-path, only for the portable fallback when neither a native profile nor local artifact contract defines interaction roles. If neither the native profile nor local artifact contract defines an interaction section/link, keep the separate UI design spec and identify its canonical relationship without inventing a section. Keep deep visual fidelity (layout, tokens, pixel detail) in the `design-spec`. See the `SYNC:ui-intent-layer` block below for the full rule — do not restate it here. Backend-only ideas (no UI) → skip `/design-spec` and state that reason.

### 4. Handoff

At `/workflow-end`, AI presents:

- Session summary: M canonical specs authored (provisional), native-contract-defined case/evidence coverage, open questions (confidence < 80%)
- Canonical specs authored: configured spec paths under the business spec root (default format path only when neither a native profile nor local artifact contract applies)
- Provisional note: these specs carry the native provisional/test-evidence state until code lands — reconcile via `workflow-code-to-spec` / `spec [mode=update]` once implemented
- Recommended next workflow: `/start-workflow workflow-spec-to-pbi` (decompose the canonical spec(s) into a grooming-ready PBI backlog) OR `/start-workflow workflow-implement-spec` (implement directly from the spec — its behavior is now written there; use `workflow-feature` only for behavior the spec does not contain)

## Conditional Skip Rules

| Step                 | Skip When                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `/domain-analysis`   | No new domain entities or aggregates involved                            |
| `/why-review` (gate) | User has already validated the idea rationale; no alternatives available |

---

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /brainstorm -> /spec-discovery -> /scenario -> /domain-analysis -> /why-review -> /idea -> /spec [mode=draft] -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /artifact-review -> /design-spec -> /spec-clarify -> /why-review -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

> **Conditional step:** `/scenario` runs only when the embedded decomposition or supplied scope needs adversarial replay, state, ownership, persistence, recovery, or evidence analysis.

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-idea-to-spec` workflow. Run `/start-workflow workflow-idea-to-spec` with the user's prompt as context.

**Steps:**
/web-research → /deep-research → /brainstorm → /spec-discovery → /scenario → /domain-analysis → /why-review → /idea → /spec [mode=draft] → /spec [mode=tests] → /artifact-review --type=spec-tests → /artifact-review → /design-spec → /spec-clarify → /why-review → /docs-update → /feature-presentation → /workflow-end → /watzup

> **Scale awareness:** When the brainstorm converges on multiple distinct capabilities, this workflow authors one Feature Spec per capability. For 4+ capabilities, spawn one `spec` sub-agent per capability in ONE message (each gets the framing context + output path); the main context assembles and reviews. Use incremental-write patterns to prevent context overrun.

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

**IMPORTANT MUST ATTENTION Goal:** Convert a raw idea/vision/problem into one reviewed, docs-synced provisional canonical spec with test/evidence coverage under the configured artifact contract; the portable 8-section/§8 TC format applies only when neither a native profile nor local artifact contract applies. Keep conditional large-idea decomposition; stop here, never create a PBI backlog or implicit roadmap. Chain `workflow-spec-to-pbi`/`workflow-idea-to-pbi` as appropriate; use `workflow-code-to-spec` only after implementation exists.
**IMPORTANT MUST ATTENTION Main steps:** `/web-research` → `/deep-research` → `/brainstorm` → `/spec-discovery` → conditional `/scenario` → `/domain-analysis` → `/why-review` → `/idea` → `/spec [mode=draft]` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/artifact-review` → conditional `/design-spec` → `/spec-clarify` → `/why-review` → `/docs-update` → `/feature-presentation` → `/workflow-end` → `/watzup`; **NEVER** create a backlog or implicit roadmap here. **MUST ATTENTION** resolve the slice-planning owner from the native profile or local reference; stop only when neither identifies one.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases and link parent when nested; one in-progress.
- **Critical Thinking:** trace every claim, confidence >80% to act, never present guess as fact.
- **Incremental Persistence:** write findings to `tmp/reports/` per file — never hold in memory.
- **Sub-Agent Return Contract:** return summary only (≤10 bullets) with `Full report:` path.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per workflow step (per capability when multiple capabilities are in scope)
- **MANDATORY IMPORTANT MUST ATTENTION** brainstorm converges on the capability to spec BEFORE the `/idea` step
- **MANDATORY IMPORTANT MUST ATTENTION** run the default `/brainstorm` mode for ordinary idea-to-spec framing; `--mode=scope` is reserved for an explicitly supplied roadmap scope brief and must never be used as an implicit roadmap writer
- **MANDATORY IMPORTANT MUST ATTENTION** SPEC-DRIVEN ORDER — author the canonical spec (`/spec [mode=draft]` → `/spec [mode=tests]`) and review it; this workflow STOPS at the reviewed spec
- **MANDATORY IMPORTANT MUST ATTENTION** PROVISIONAL OUTPUT — use the planned-evidence/provisional-state convention defined by the active native profile or local artifact contract and reconcile against real code/test evidence via `workflow-code-to-spec`; the §8/TC/TBD fields are default-only
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER decompose into PBIs/stories/backlog here — chain `workflow-spec-to-pbi` for a backlog
- **MANDATORY IMPORTANT MUST ATTENTION** why-review runs after domain-analysis — FAIL revisits framing, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-select scope
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify the authored canonical spec(s) and native test/evidence carriers
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
> **Anti-Rationalization:**

| Evasion                              | Rebuttal                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| "Purpose obvious"                    | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough"          | Echo Goal in Closing Reminders — bottom anchor prevents drift.                |
| "Skip evidence for prompt edits"     | Cite changed file evidence and verify no stale protocol text remains.         |
| "Decompose into PBIs while I'm here" | Out of scope — this workflow STOPS at the spec. Chain workflow-spec-to-pbi.   |
