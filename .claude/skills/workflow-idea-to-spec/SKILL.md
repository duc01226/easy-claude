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
- Implementation work (code writing) → use `workflow-feature` or `workflow-big-feature`
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
- Recommended next workflow: `/start-workflow workflow-spec-to-pbi` (decompose the canonical spec(s) into a grooming-ready PBI backlog) OR `/start-workflow workflow-feature` (implement directly from the spec)

## Conditional Skip Rules

| Step                 | Skip When                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `/domain-analysis`   | No new domain entities or aggregates involved                            |
| `/why-review` (gate) | User has already validated the idea rationale; no alternatives available |

---

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /brainstorm -> /spec-discovery -> /scenario -> /domain-analysis -> /why-review -> /idea -> /spec [mode=draft] -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /artifact-review -> /design-spec -> /spec-clarify -> /why-review -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

> **[BLOCKING]** Each selected step MUST ATTENTION invoke its `Skill` tool — marking a selected task `completed` without skill invocation is a workflow violation. `/scenario` is conditional: run it only when the embedded decomposition or supplied scope needs adversarial replay, state, ownership, persistence, recovery, or evidence analysis; otherwise record the skip with evidence and an explicit reason. NEVER batch-complete validation gates.

Activate the `workflow-idea-to-spec` workflow. Run `/start-workflow workflow-idea-to-spec` with the user's prompt as context.

**Steps:**
/web-research → /deep-research → /brainstorm → /spec-discovery → /scenario → /domain-analysis → /why-review → /idea → /spec [mode=draft] → /spec [mode=tests] → /artifact-review --type=spec-tests → /artifact-review → /design-spec → /spec-clarify → /why-review → /docs-update → /feature-presentation → /workflow-end → /watzup

> **Scale awareness:** When the brainstorm converges on multiple distinct capabilities, this workflow authors one Feature Spec per capability. For 4+ capabilities, spawn one `spec` sub-agent per capability in ONE message (each gets the framing context + output path); the main context assembles and reviews. Use incremental-write patterns to prevent context overrun.

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
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

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
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
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
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `/sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
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

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

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
