---
name: ui-review
description: '[Code Quality] Use when a workflow step or the user asks for a UI review. Checks content fit, supported-size layout, project styling conventions, layering where applicable, accessibility and async states.'
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

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate in-scope user interfaces for content fit, adaptation to supported view sizes and input methods, layout sizing, platform-appropriate layering and styling, accessibility, and async feedback. Apply CSS-specific checks only to CSS-based surfaces and the project's own conventions; skip when the project or change has no UI.

**Summary:** Expand the resolved user-interface scope from changed files to the SURFACES they render into, reconstruct how each surface composes (component tree + style origins, rendered when runnable), judge each surface's task load, forms and container fit, then apply project rules plus six UI categories and nine design-principles passes, and report evidence-backed PASS/WARN/BLOCKED findings per surface through validated full-review loops.

**Default scope:** All uncommitted UI changes (staged + unstaged) matching the project's configured UI/frontend paths and file-extension patterns. Override: specify files, directories, surfaces, or the full UI codebase.

> **CONDITIONAL — SKIP when no user-facing UI files are in scope.** In workflow context this skill is SKIPPED when the diff has no files matching the project's configured UI/frontend path and extension patterns. If invoked standalone with no UI changes → announce `"No UI changes detected — ui-review skipped"` and report clean.

> **ROUTING BOUNDARY (read before starting):**
>
> - **`ui-review` (this skill)** — the project UI review gate. Purpose: find issues, assign severity, give project-specific fix guidance citing real reuse targets (sourced from project references). It complements `architecture-review`. In `workflow-review-changes` it runs in TWO places by design (keep both): (a) INTERNALLY as `changes-review`'s UI dimension (step 1), AND (b) as a DEDICATED conditional parallel-batch member (step 9, `ui-ux-designer` sub-agent). Both fire only when UI files are in scope.
> - **`web-design-guidelines`** — a web accessibility / UX checklist. Use it for web surfaces; for native UI, use the target platform's documented accessibility guidance instead.
> - **`ui-ux-designer`** — specialized UI/UX, accessibility, responsive layout, and design-token review/authoring sub-agent when the local agent catalog provides it.

> **MANDATORY MUST ATTENTION** Plan tasks to READ UI rules BEFORE reviewing:
>
> 1. Configured styling reference when styling is in scope — selected styling method, tokens, layout, and selector rules; BEM applies only if selected
> 2. Configured design-system reference when present — tokens and layering rules that apply to this surface
> 3. Frontend architecture/patterns reference when it documents relevant project conventions — use base components, state, request, and cleanup abstractions only when present and applicable
> 4. Project code-review rules doc — anti-patterns and conventions
>
> Resolve paths through project configuration and the docs index, and read accepted ADRs when relevant. If a reference is missing or N/A, inspect comparable source and target-platform guidance; do not invent project-wide rules or abstractions.

**Workflow:**

1. **Phase 0: Load UI Rules** — Resolve applicable project UI references and accepted ADRs; record N/A where a styling or design-system category does not apply
2. **Phase 1: Determine Scope** — Changed UI files (default) or user-specified scope, then expand to affected SURFACES (pages / views / dialogs that render them)
3. **Phase 2: Blast Radius** — Run graph trace if graph.db exists; its upstream edges feed the surface map
4. **Phase 2B: Surface Composition** — Per surface: component tree, style-origin map (own · ancestor layout & stacking context · global/theme/reset · scoping mode), render + computed values + automated a11y scan when runnable, else `ENVIRONMENT-BLOCKED`
5. **Phase 2C: Surface UX Pass** — Per surface: task effort trace, Field Necessity Matrix, container fit, complexity budget (checklist B12–B15, E9–E11, §R, K10)
6. **Phase 3: UI Category Review** — Check each file IN ITS SURFACE CONTEXT against all 6 applicable categories
7. **Phase 4: Finalize** — Generate the index report plus one report per surface / per shared component with findings, PASS/BLOCKED/WARN verdicts
8. **Fix Loop: Validate → Fix → Full UI Re-Review** — validate findings first; fix only findings that block the current round, then rerun the full UI review using the local sub-agent selection guide only when that protocol calls for agents. Round 1 blocks on every validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW-only is recorded as deferred, and binary accessibility/security gates always block.

**Key Rules:**

- Write the index to `tmp/reports/ui-review-{date}-{slug}.md`; per-surface and per-component analysis to `tmp/reports/ui-review-{date}-{slug}/surfaces/{surface}.md` and `.../components/{component}.md`, appended as each is finished
- Judge what RENDERS: a finding about layout, overflow, stacking, spacing or contrast cites the composed result (ancestor and global styles included), never one file in isolation
- A defect repeated across surfaces is ONE systemic finding naming every location or the shared owner
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging
- Review is read-only until `$why-review --validate-findings` confirms findings; fixes may happen only in the validated fix loop or downstream plan/feature-implement, and every fix that blocks the current round restarts a full UI review from Phase 0 with brand-new tasks. From Round 2 onward, LOW-only findings end the loop and are recorded as deferred.

## Your Mission

<task>
$ARGUMENTS
</task>

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating styling, a layout, a token, or a component, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (hardcoded values forcing
  per-file edits, hand-rolled overflow handling, raw breakpoints,
  copy-pasted truncation CSS).
- Name the real enemies in findings: **magic values, duplicated styling
  knowledge, fixed sizing that fights the viewport, cross-system token
  mixing, z-index escalation wars**.
- A layout that remains usable across the project's supported sizes and long
  values beats a fixed layout that breaks at an evidenced boundary.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag a styling violation without reading the target's actual style or UI source and tracing the rendered surface where possible
- Every finding MUST include `file:line` evidence
- Before flagging a pattern violation: grep 3+ existing examples — codebase convention wins
- Question: "Is this actually a violation, or an established exception (icon dimensions, fixed brand assets, genuinely fixed UI)?"

## Phase 0: Load UI Rules (MANDATORY FIRST) (MUST ATTENTION)

> **MUST ATTENTION:** Resolve the target UI and read applicable project docs BEFORE reviewing. Rules come from project and platform evidence, not general knowledge.

- read the configured styling rules doc when styling is in scope — extract its chosen method, tokens, layout rules, and selector conventions; BEM applies only when selected
- read the configured design-system/token doc when present — extract the declared visual tokens and stacking/layer rules that apply to this surface
- read the frontend architecture/patterns doc when it records project conventions — use base components, state, request, and lifecycle abstractions only when they are present and relevant
- read the project code-review rules doc — extract frontend anti-patterns and review rules directly

> **CROSS-SYSTEM WARNING (carry through every category):** Do NOT mix token systems with incompatible root-size, namespace, or layer assumptions in one file. When flagging a fix, recommend whichever token system the file already imports/uses; never introduce another system unless the project docs explicitly require migration.

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted UI changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review
- Filter to files matching the project's configured UI/frontend path and extension patterns
- If ZERO UI files match → announce `"No UI changes detected — ui-review skipped"` and report clean (honor the CONDITIONAL skip)

**Expand files → surfaces (MANDATORY when UI files match).** A file does not render; a surface does. For every in-scope file, find the pages / views / dialogs / panels that render it — through routing, parent composition, template usage, or the graph's upstream edges (Phase 2). Record `surface → changed files that render into it` at the top of the index report. Every affected surface is reviewed WHOLE — including its unchanged parts — because load accumulated over many small, individually reasonable diffs is invisible file by file.

- **Shared or global change** (global stylesheet, theme, token, reset, shared primitive): the surface set is every consumer. Review the project's declared representative surfaces (`uiReview.representativeSurfaces` in the project config, when present); otherwise the highest-fan-out consumers found. State the sample and why it is representative.
- **Standalone component with no rendering surface yet** (library/primitive work): review it inside its documented usage examples or story/demo harness when the project has one; otherwise state `surface: none — component reviewed in isolation` and cap layout findings at `NOT VERIFIABLE`.

## Phase 2: Blast Radius (if graph.db exists)

- If `.code-graph/graph.db` exists: run graph trace on key changed component files
- Record: impacted file count, shared-component fan-out (a changed shared-library component affects every consumer app), risk level
- Prioritize review by highest-impact files first (shared library components > app-local components)
- Graph unavailable: note "Graph not available — skipping blast radius" and proceed

For each changed component/style file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction both --json
```

Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail. Flag shared-component consumers impacted by a styling or layout change.

## Phase 2B: Surface Composition (MANDATORY per surface — reconstruct what actually renders)

> **Why:** most real layout defects are caused by an ANCESTOR or a GLOBAL layer, not by the file where they show — truncation that never triggers because a flex/grid track refuses to shrink, an overlay trapped by a parent's stacking context, spacing doubled by parent padding plus child margin, a global reset overriding a component's intent. A review that reads one file judges a fiction.

Create the index report `tmp/reports/ui-review-{date}-{slug}.md` now, and one file per surface at `tmp/reports/ui-review-{date}-{slug}/surfaces/{surface}.md` as you reach it. Append each surface's composition record BEFORE moving to the next surface.

For each surface:

1. **Component tree.** Walk from the surface root down to the leaves that the changed files contribute to. Record each node's role and owner (project component, shared primitive, platform element). Stop descending into a shared primitive once its contract is known — review the primitive itself in `components/{component}.md` only when it carries a finding.
2. **Style-origin map.** For every node a later finding may cite, record where its effective layout and visual styles come from:
   - its own styles;
   - **ancestor layout context** — the parent layout model (flex/grid track sizing, minimum-size behavior), overflow/clipping, positioning, and any **stacking context** an ancestor creates (transform, opacity, filter, isolation, positioned + stacking value, or the platform's equivalent);
   - **global layers** — reset/normalize, base element styles, theme, tokens, utility classes — resolved through the configured styling and design-system references;
   - **scoping mode** the project uses (scoped/module styles, shadow roots, global escape hatches) and any rule that crosses it.
3. **Render when the surface can run.** Use the project's run/preview path (`run` skill, `playwright-cli`, or the `experience-review` local-run contract) to capture the surface at each supported viewport and state; read computed values and boxes for every node a finding cites; run the project's automated accessibility scan when its toolchain provides one. Save captures under the run's report folder.
4. **Cannot run?** Record `render: ENVIRONMENT-BLOCKED — {reason}`; keep the static reconstruction; mark every rendered-only claim (contrast, overlap, clipping, layout shift, target size, focus order) `NOT VERIFIABLE`. Never estimate a rendered value.

**Blocked until:** every surface has a tree, a style-origin map for the nodes it cites, and either render evidence or an explicit `ENVIRONMENT-BLOCKED`.

## Phase 2C: Surface UX Pass (MANDATORY per surface, BEFORE the code categories)

> **Why first:** Categories 1–6 are code mechanics; a surface can pass all of them and still be unusable because it asks for too much, in the wrong container, at the wrong moment. Judge the surface's job before its CSS. Work from `.claude/docs/design-review-checklist.md` §B12–B15, §E9–E11, §R, §K10 and calibrate against `.claude/docs/design-review-calibration.md` (case C1 is the canonical overloaded-dialog example).

**Think:** What is the ONE task this surface exists for? What is the least a user must see and enter to finish it? What is here that the task does not need NOW?

For each surface, append to its surface report:

1. **Task effort trace** — the primary task's path: `steps → inputs → decisions`, from entry to observable outcome. Mark each step or input that serves the system rather than the user's task.
2. **Field Necessity Matrix** (surfaces with input) — one row per input: needed at THIS step? (why) · who consumes it and when · required/optional · default or derivable? · group · verdict (keep · defer · derive · default · drop). Every §R finding cites a row.
3. **Container fit** — the container used (full view · dialog · side panel · stepped flow · inline) vs. the one the task calls for (§E9); nesting, reachability of primary actions, and dismiss-with-unsaved-input behavior (§E10–E11).
4. **Complexity budget** — count inputs per step, sections per view, and equal-weight actions per view. Compare with `uiReview.complexityBudget` in the project config when declared (§B15). When no budget is declared, do not invent a threshold: judge the counts against the task trace and the primary user's expertise (§B12, §H3) and tag the finding `HEURISTIC`.
5. **Entry modes and honesty** — alternate entry modes competing in one view (§B14); visible controls that do not work or development-status copy (§K10).
6. **Governing intent** — when a Feature Spec or design-spec records the view's information priority (`now / later / not here`) and container role (`SYNC:ui-intent-layer`), the surface is judged against it; a surface showing `later`/`not here` items by default is a finding, and a missing priority record for a new or reshaped view is recorded as a gap.

**Severity:** use the checklist defaults (B12, E9, R1, R2, K10 → P1) translated through the checklist §0.3 severity map (P0/P1 → BLOCKED, P2/P3 → WARN). An expert, data-heavy surface whose density is justified by its users (§H3) is NOT an overload finding — state that reasoning.

**Blocked until:** every surface with input has a Field Necessity Matrix, and every surface has a task trace and a container verdict.

## Phase 3: UI Category Review

Continue appending to the index report `tmp/reports/ui-review-{date}-{slug}.md` and the per-surface files. Judge each file IN ITS SURFACE CONTEXT — cite the composed result from Phase 2B, not the file alone.

For EACH file in scope, evaluate against ALL applicable categories. Skip categories not applicable to the file type (e.g., a pure `.ts` store file skips overflow/sizing/z-index but still hits Category 5's architecture checks and Category 6's loading/error/empty-state wiring).

> **Apply the `Think:` reasoning prompt before each category — derive violations, do NOT recite checklists.**

---

### Category 1: Long-Content Overflow & Truncation — Severity: WARN (HIGH when a flex child truncates with no `min-width: 0`)

**Think:** Does every text container survive a 200-char value? Single-line or multi-line? Can the user still read the full value when it is truncated?

**Detection signals:**

- Hand-rolled `text-overflow: ellipsis` (with `white-space: nowrap` / `overflow: hidden` re-declared by hand) instead of the project mixin/directive
- A flex child that truncates but has **NO `min-width: 0`** — the flex-overflow trap: a flex item's default `min-width: auto` refuses to shrink below content width, so ellipsis never triggers
- Truncated text with **NO tooltip / `title`** to reveal the full value

**DECISION RULE the reviewer enforces:**

- Single-line labels / table cells / chips → ellipsis **+ tooltip-on-overflow**
- Multi-line prose / descriptions → wrap or `-webkit-line-clamp`

**Project fix guidance** (cite real reuse targets from the resolved styling rules doc):

- Prefer the project's documented overflow/ellipsis directive, component, or utility. It must expose the full value only when the element actually overflows and must handle the flex `min-width` trap.
- OR the project's documented truncate/text-ellipsis mixins or utility classes from the styling rules doc.
- Multi-line: use the project-documented clamp pattern.

**GOOD vs BAD:** a utility/token-driven truncation that exposes the full value on overflow (tooltip/`title`) is correct; a hand-rolled substring / width-math truncation, or truncated text with no tooltip, is the anti-pattern. Cite the styling rules doc for the project's reuse targets.

---

### Category 2: Layout Adaptation Across Supported Sizes — Severity: WARN (BLOCKED only when content is broken or unreachable at a supported size)

**Think:** Is the surface usable at the view sizes, orientations, and display settings supported or promised by the project? Does the target platform's layout model adapt as needed? If content cannot reflow, does the platform provide a usable way to inspect it without clipping or hiding controls?

**Supported-size usability — the minimum bar:**

- **Preferred where supported:** use the platform's responsive layout mechanism (for example, CSS reflow, native size classes, or resizable-window constraints) when it improves access to content.
- **Acceptable fallback:** scrolling or another platform-native overflow treatment is fine when reflow is not appropriate, provided all content and controls remain reachable.
- **Hard minimum (BLOCKED if violated):** meet the view sizes and display settings the product supports; do not leave content clipped, controls unreachable, or essential information hidden without an access path.
- **Escalation:** if adding a supported layout mode needs a refactor too large for the current change, surface the scope and evidence before proceeding.

**Detection signals:**

- For CSS projects, raw viewport breakpoints that bypass the configured breakpoint system
- A layout in the project's chosen system that becomes clipped, overlaps, or hides controls at a supported size
- A fixed grid or canvas without a usable pan, reflow, resize, or scroll path where the project promises smaller views
- A control outside the reachable area or blocked by platform chrome, keyboard, or an overlay with no recovery path

**Project fix guidance:**

- Prefer the project's documented responsive layout APIs, classes, or size categories; use CSS flex/grid only when that is the target's styling system
- Choose overflow, reflow, resizing, or scrolling based on the platform and content
- Use configured breakpoints when present; do not invent a project-wide breakpoint scale
- Large layout refactor required → surface it as a finding and keep it distinct from an unrelated change

**Anti-patterns:** layout rules that bypass a configured sizing system, or fixed layouts that clip or hide required content at a supported size. Cite the applicable project/platform rule and inspect the rendered outcome before flagging.

---

### Category 3: Content-Responsive vs Fixed Sizing — Severity: WARN

**Think:** Does this surface need a fixed size by design, or should it adapt to content, user scaling, and the target platform's available space?

**Detection signals:**

- For CSS-based surfaces, fixed CSS dimensions on content containers that conflict with supported sizes, user scaling, or the documented design
- For native or desktop surfaces, fixed frame constraints that make a supported size or form factor unusable

**Project fix guidance:**

- Use the project's layout and sizing primitives. In CSS-based layouts, flex/grid and min/max constraints may be appropriate when they match the surrounding code.
- Keep a fixed dimension only when the design or platform requires it and evidence shows it remains usable across supported settings.

**Anti-patterns:** fixed sizing that demonstrably clips required content, blocks user scaling, or prevents the surface from fitting a supported form factor. Fixed dimensions are valid when the platform or design requires them and the supported use remains accessible. Cite the relevant project/platform authority and evidence.

---

### Category 4: Stacking and Overlay Order — Severity: BLOCKED when project rules or visible behavior require it

**Think:** How does this platform order overlapping content, and which item must appear above another? Apply this category only when the target uses a stacking or overlay model.

**Detection signals:**

- A numeric stacking value where project rules require a named layer or token
- A forced override that defeats documented ownership or demonstrably hides required content
- **Stacking-context trap** — an overlay (menu, popover, tooltip, dialog) renders inside an ancestor that creates its own stacking context (Phase 2B style-origin map), so no stacking value on the overlay can lift it above that ancestor's siblings. Fix at the owner: render through the project's overlay/portal mechanism, or remove the unneeded stacking context — NEVER escalate the value (calibration case C2)

**Project fix guidance:**

- Use project-declared layer tokens or stacking categories when present
- Otherwise follow the target platform's established overlay/order model and nearby examples; do not invent a repository-wide scale

Cross-reference the project's layering map when one is configured. Any chosen layer must match the actual surface role.

**GOOD vs BAD:** a layer token is correct when the project defines one; otherwise use the platform's documented order. Flag a raw value or override only when it violates local rules or causes evidenced overlap. Cite the authority for the target.

---

### Category 5: Styling Convention and Visual Implementation — Severity: WARN

**Think:** Does this implementation follow the project's configured styling approach and visual ownership, or does it introduce unsupported values, selectors, or layering rules?

> **Styling rules:** Follow the method and limits documented for this project and target. BEM, design tokens, stylesheet nesting limits, and CSS override rules apply only when the project's references/configuration establish them.

**Detection signals:**

- Violation of the configured selector, token, typography, nesting, or styling-system rules
- A class or utility name that conflicts with the project's chosen methodology
- A hard-coded value where the project requires a declared token or scale
- CSS `!important` or stacking overrides only where the project forbids them or evidence shows they break intended ownership
- BEM modifier or element structure only when project configuration/reference docs select BEM
- **Style leakage across the scoping boundary** — component styles that escape into global scope (unscoped element or global selectors, global escape hatches, deep-piercing selectors) or global/theme/reset rules that silently override a component's intended values; cite both sides from the Phase 2B style-origin map
- **Specificity escalation** — a selector made heavier (repeated classes, id selectors, `!important`, deep nesting) only to win against another rule, where restructuring ownership would remove the conflict
- **Spacing owned twice** — a parent's padding/gap plus a child's margin producing a doubled or uneven gap; space belongs to the container (`UI-4.2`)

Apply fixes per the resolved project styling rules doc.

**Frontend architecture checks (OWNED JOINTLY WITH `architecture-review` Category 8 — reference, do not drift):**

> These checks are lifted from `architecture-review` Category 8 so the two skills stay synchronized. They are **owned jointly**; when one changes, update both. Apply them to source files in scope that implement the listed frontend concerns:

- Use a project-documented component or form base when one exists, applies to the target, and the code bypasses it (BLOCKED)
- Follow the project's state/effect pattern when documented; otherwise use the platform's idiomatic state model
- Use a documented API wrapper when one exists for the target; otherwise use the normal request API for the stack
- Manage subscriptions and listeners using the framework lifecycle and any documented cleanup pattern
- Apply BEM only when the project selects it; otherwise follow its configured styling convention
- Place logic according to declared or observed project ownership; do not impose a Model > Service > Component hierarchy

**Component system and reuse checks (code-bearing UI scope):**

- Use the project's component taxonomy and owners when they are documented or evident in code. Do not create Common/Domain-Shared/Page tiers or a base abstraction solely to satisfy this review.
- Reuse or compose an existing component when its API, platform, scope, and lifecycle fit; explain a non-reuse decision only when a relevant shared component exists.
- Keep genuinely shared behavior under a clear owner. Consider extraction when evidence shows reuse will reduce change cost; do not require an abstraction from a fixed duplication count.
- Test reusable component contracts and page/screen composition according to the project's test organization.

**GOOD vs BAD:** when a project declares shared component tiers, a screen composes the appropriate documented components and tests each contract at its owner. In projects without tiers, follow the existing component structure and extract only where an evidenced reusable owner improves the code. Cite the real project references or source patterns.

---

### Category 6: Async UI States & Feedback — Loading / Error / Empty / Disabled — Severity: BLOCKED when a material user-visible operation lacks required feedback or recovery

> **This is the UI-resilience gate.** Check whether delay, failure, or an empty result affects the user's task. Do not require irrelevant states, but a material interaction must not leave the user with a frozen surface, silent failure, or unexplained result.

**Think:** For each user-visible async operation (data load, form submit, mutation, navigation-triggered work), trace what the user sees while waiting, on failure, and when there are no results. Flag branches that leave the user with no useful feedback or recovery path.

**Select the states each async/interactive surface needs** from its user impact, the project's conventions, and the target platform (common vocabulary: Default / Loading / Disabled / Error / Empty / Success):

- **Loading** — show progress or a busy affordance when delay or impact would otherwise leave the user uncertain; do not leave an important surface blank or frozen.
- **Error** — user-initiated failures need a human-readable message and recovery path where sensible. Background failures follow the project's notification and error-handling conventions.
- **Empty** — a collection with no results should explain the empty state and offer a next step when useful.
- **Disabled / in-flight guard** — prevent harmful duplicate actions using the control behavior supported by the target platform.
- **Success** — provide confirmation appropriate to the action, or make the resulting state clear.

**Detection signals:**

- A user-visible wait with meaningful delay or impact but no progress/busy feedback → **BLOCKED**
- A user-initiated operation that fails silently or offers no recovery path where one is sensible → **BLOCKED**
- A raw error shown to the user (stack trace, raw JSON, unmapped exception) → WARN
- A list or collection surface with no meaningful empty state → WARN (BLOCKED when the collection is the screen's primary content)
- A submit handler that does NOT disable its trigger while in-flight (double-submit risk) → WARN (BLOCKED for payment / create / irreversible actions)

> **Check for centralized handling BEFORE flagging BLOCKED (avoid false positives):** the app or platform may provide a shared progress/status owner, request handler, error boundary, or reusable UI component. If evidence shows it covers this surface, the local control may not need another indicator — verify its behavior and downgrade or drop the finding. Flag BLOCKED only when no applicable layer gives the user the required feedback.

**Project fix guidance** (cite real reuse targets from applicable frontend, platform, and design-system docs):

- Reuse documented loading/progress, error, and empty-state components or patterns when present; otherwise follow the target platform's idiom without inventing a project-wide abstraction.
- Bind loading / error / empty behavior to the data flow and state owner established by the project; do not impose a fixed model/service/component layer order.

**GOOD vs BAD:** an important delayed operation gives progress feedback, communicates a failure with a usable next step, and explains an empty result; a surface that shows nothing until success is the anti-pattern. Cite the project's applicable references or observed implementation.

> **Note vs Category 5's Bug-Detection "Error Handling":** the shared Bug Detection protocol checks that `catch` scope is correct and exceptions are not swallowed at the *code* level; Category 6 checks that the failure/loading/empty branch produces a *user-visible* state at the *UI* level. Both must pass — a correctly-caught error that renders nothing still fails Category 6.

---

## Phase 3B: UI/UX Design Principles Pass (9 dimensions)

The 40 clauses of `SYNC:ui-ux-design-principles` (full body inlined below in this skill) bind this skill in the **REVIEW** role: every clause is a fail-condition, not a suggestion. Run them as **NINE focused passes over the whole scope — one dimension at a time, in order.** A single simultaneous sweep of all nine is what degrades clause review into tick-boxing; serial attention is the mechanism, not a formatting preference.

**Per pass:** answer the `Think:` prompt from first principles FIRST — *what would make this dimension fail on THIS surface?* — then hunt the violation that reasoning predicts. A pass that produced no reasoning produced no review: record the reasoning, never a tick.

**Every finding:** `UI-<clause>` + `file:line` + severity from the Phase 4 rubric already in force (**BLOCKED** must fix before merge · **WARN** review and decide · **PASS** compliant; a WARN escalates to BLOCKED under the escalation rule stated there). This pass introduces NO new severity scale.

**Precedence (MUST ATTENTION):** the project styling / design-system / frontend-pattern docs loaded in Phase 0 **OUTRANK** these clauses; the clauses outrank generic taste. Where a project doc states its own value (type scale, spacing unit, breakpoints, token contrast pairs), the PROJECT value is the rule and the clause is satisfied by following it. A genuine conflict is SURFACED to the user by asking the user directly with both sides — NEVER resolved silently.

| #   | Dimension                 | Clauses            | `Think:`                                                                                                                                                                                                                                                    |
| --- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Which element does a first-time user's eye land on, and is it the one this screen exists for? Which groups are held together by whitespace, and which by a border added because the whitespace was wrong? Are the empty, loading and error states designed at all — or only the full state? |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Follow the configured type scale where one exists; inspect hierarchy, legibility, and supported user text scaling for this platform. Which values depart from the project's evidence, and are the actual reading conditions usable? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | For each foreground/background pair that actually renders, what is the COMPUTED ratio (measured — never judged by eye)? What does a user who cannot perceive the accent hue see instead? In dark mode, is elevation signalled by lifted surfaces or by an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Follow the configured spacing/layout system where present; check whether grouping, alignment, and sizing serve the current information. For responsive platforms, do layout changes respond to content and supported sizes? |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | For each interactive element, what feedback does the user receive within the project's/platform's expected response window? Are applicable states and focus/input cues clear? Could an undo path improve a confirmation? Does motion respect user preferences? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Landing on this surface cold: where am I, what's here, where next? How many top-level destinations exist? Are labels the user's words or the team's internal vocabulary? Where does navigation return, using a URL or platform back path when supported? |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Field by field (use the Phase 2C Field Necessity Matrix, do not redo it): what breaks if this field is removed from THIS step? Is its label still visible once filled? When does validation fire, and does the message say how to fix it? Does the keyboard/autocomplete match the data type? What happens to typed data on validation error, navigation away, and refresh? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | At a touch viewport: measure each tappable element's HIT BOX (not the icon) and the gap to its neighbours; where do primary actions sit relative to the thumb; is anything reachable ONLY by gesture; what do notch, home indicator and the on-screen keyboard cover? _(Mobile/touch surfaces only — when the scope has none, say so explicitly.)_ |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | For everything that loads: what occupies its space before data arrives, and does the layout shift when it lands? Is the optimistic path rolled back VISIBLY on failure? On a slow or offline connection, what does the user see — a designed state or a hang? |

**No double-counting.** Several clauses overlap Categories 1-6 (`UI-1.5`/`UI-5.2`/`UI-9.1` overlap Category 6's async-state gate; `UI-2.3` overlaps Category 1's content handling; `UI-4.1` overlaps Category 5's magic-number rule; `UI-4.4` overlaps Category 2's responsive bar). Where they meet, emit **ONE** finding carrying BOTH citations (e.g. `Category 6` + `UI-5.2`) at the HIGHER of the two severities — never two findings for one defect, and never a downgrade because "the other category already covers it".

**Skip rule.** This pass runs whenever a user-facing UI file is in scope. Skip an individual dimension ONLY when the scope contains no surface it can apply to (`UI-8.*` with no touch surface, `UI-7.*` with no input) — name the skipped dimensions and the reason, so a skip is auditable rather than an omission.

---

## Phase 3C: Design Distinctiveness Pass (`DD-1`–`DD-8`)

Phase 3B asked **"is this usable, accessible, and consistent?"** — a floor with measurable pass/fail. This pass asks the question none of the 40 clauses ask: **"is this THIS product's interface, or the one any generator would emit for any brief?"** A surface can pass every clause in Phase 3B and still be a template. The 8 clauses of `SYNC:design-distinctiveness-gate` (full body inlined below in this skill) bind this skill in the **REVIEW** role; the deep catalog is `.claude/docs/design-knowledge.md`.

**Run as FOUR focused passes, one at a time, in order** — same serial-attention mechanism as Phase 3B:

| # | Pass | Clauses | `Think:` |
| --- | --- | --- | --- |
| 1 | Identity & rationale | `DD-1`, `DD-2` | If I swapped this product for a different one in the same shape, which of these choices would have to change? The ones that would not are where the design defaulted. Read the token/variable names alone — could a reader guess what product this is, or do they read `--gray-700`/`--surface-2`? |
| 2 | Free-axis tell audit | `DD-4` | Which axes did the brief, the project design system, or an accepted ADR actually PIN — and which were free? On each FREE axis, does the code land on a T1–T5 cluster (cream+serif+`#D97757` · acid-on-black · broadsheet · the SaaS-card kit: identical cards, one radius for every hierarchy level, the same `rgba(0,0,0,.1)` shadow, gradient washes as decoration · template chrome: ALL-CAPS eyebrows, `A · B · C` middle-dot meta, spaced-em-dash labels, `#0B0B0B` for black, mono data labels, trailing `→`)? |
| 3 | Type, structure & motion | `DD-5`, `DD-6`, `DD-7` | How many families and how distinct? Does body text exceed ~80ch? Is a single word in a headline accented, are labels ALL CAPS, does an eyebrow just restate its heading? Do numbered markers sit on content that is genuinely a sequence? What does each border tell the reader that whitespace would not? Is there ONE orchestrated motion moment, or a fade-and-slide-up on every section plus a hover transition on every card? |
| 4 | Restraint & implementation integrity | `DD-8` | Where is the boldness spent — once, or scattered? Which decoration would the surface not miss? Find layout or styling workarounds that defeat ownership or expected flow; for CSS surfaces, examples include negative margins undoing parent spacing, unnecessary calculations, absolute positioning to escape layout flow, or conflicting selectors. |

**Every finding:** `DD-<clause>` + `file:line` + a severity from the Phase 4 rubric already in force. This pass introduces NO new severity scale.

**Severity ceiling (MUST ATTENTION).** A `DD-4` tell match is a **hypothesis about a missed decision, never a defect** — it caps at **WARN**, and the finding is INVALID unless it names (a) the axis, (b) the evidence that the brief/project left that axis free, and (c) what the subject matter suggested instead. `DD-5`/`DD-6`/`DD-7` findings that are also `UI-*` violations (legibility outside the applicable platform standard, unmeasured contrast, motion ignoring user preferences) take the `UI-*` severity. Only `DD-8` implementation-integrity findings reach **BLOCKED** on their own, and only where evidence shows the workaround breaks the target or its maintainability.

**Precedence (MUST ATTENTION), strictest in this skill:** the **brief's stated visual direction WINS OUTRIGHT** — a design that was asked for one of the T1–T5 looks and delivered it is a PASS, not a finding. Then the project's design-system and applicable styling/frontend references loaded in Phase 0 — **an established house style is an intentional identity, and a repo-wide convention is NEVER a `DD-4` finding.** NEVER open a finding that amounts to "this looks like other software" without the three-part evidence above. — why: an unevidenced distinctiveness finding is pure taste asserted as a defect, and it pushes a codebase toward a *different* uniform at review cost.

**No double-counting.** Where a `DD-*` clause meets a Category 1–6 check or a `UI-*` clause, emit **ONE** finding carrying BOTH citations at the HIGHER severity — never two findings for one defect.

**Skip rule.** Runs whenever the scope renders a user-facing visual surface. Skip entirely for pure logic/store/service changes with no rendered output — state that reason explicitly so the skip is auditable.

---

## Phase 4: Finalize — UI Compliance Report

Update report with final sections:

### Verdict Scoring

| Overall verdict | Condition |
| --------------- | --------- |
| **FAIL** | Any failed binary gate or unresolved evidence; any validated finding in round 1; any validated CRITICAL/HIGH/MEDIUM in round 2; or persisted `minRounds` not yet met. |
| **PASS** | All binary gates and evidence resolved, current-round blocking findings empty, and persisted `minRounds` met. Record round-2 LOW findings as deferred; they do not force another cycle. |

> **Severity vocabulary (single source of truth).** Category headers may use `BLOCKED` / `WARN`; the overall verdict is `PASS / FAIL` under `review-policy.cjs`, never the category label alone. The fresh sub-agent emits `Critical / High / Medium / Low`. Assign consequence first using the canonical rubric, then apply the round predicate:
>
> | Category label | Canonical finding | Round handling |
> | -------------- | ----------------- | -------------- |
> | BLOCKED | CRITICAL / HIGH | Blocks every round. |
> | WARN | MEDIUM when bounded but consequential | Blocks every round. |
> | WARN | LOW when non-blocking polish | Blocks round 1; record/defer in round 2. |
> | No finding | Evidence-backed compliant or N/A | No severity finding; binary gates and the persisted minimum still apply. |
>
> A category's **"(HIGH when …)"** note is NOT a separate tier — it means that WARN **escalates to BLOCKED** when the stated condition holds (i.e., the finding is a real rendered bug, not a latent risk).

### Report Structure

```markdown
# UI Review Report — {date}

## Scope

- Files reviewed: {count}
- Surfaces reviewed: {surface → changed files that render into it; sample rationale for shared/global changes}
- Components / apps affected: {list}
- Blast radius: {summary from Phase 2}
- Render status: {per surface: captured viewports + scan | ENVIRONMENT-BLOCKED — reason}
- Per-surface reports: `tmp/reports/ui-review-{date}-{slug}/surfaces/*.md` · per-component: `.../components/*.md`

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **Surface(s):** {surface name(s) — a systemic finding lists every surface or names the shared owner}
- **File:** {path}:{line}
- **Rule:** {rule from project or platform reference, or checklist / `UI-*` ID}
- **Evidence:** {what was found — composed result from Phase 2B/2C; MEASURED | OBSERVED | HEURISTIC}
- **Fix:** {project-owned component, platform mechanism, configured style rule, or other applicable reuse target}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project or platform reference}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## UI Health Summary

- Long-content Overflow & Truncation: {PASS/WARN/BLOCKED}
- Layout adaptation at supported sizes: {PASS/WARN/BLOCKED/N/A}
- Content-responsive sizing: {PASS/WARN/BLOCKED/N/A}
- Platform layering rules where applicable: {PASS/WARN/BLOCKED/N/A}
- Project styling convention: {PASS/WARN/BLOCKED/N/A}
- Async UI States & Feedback (loading / error / empty / disabled): {PASS/WARN/BLOCKED}
- UI Architecture (joint w/ architecture-review): {PASS/WARN/BLOCKED/N/A}
- Surface load & forms (B12–B15, §R): {PASS/WARN/BLOCKED/N/A}
- Container fit (E9–E11): {PASS/WARN/BLOCKED/N/A}
- Composition fidelity (tree + style origins + render): {COMPLETE / PARTIAL — ENVIRONMENT-BLOCKED reason}
```

**Per-surface report shape** (`surfaces/{surface}.md`, appended as each surface completes): Context (task, users, container) → Composition (Phase 2B tree, style-origin map, render evidence) → Surface load (Phase 2C trace, Field Necessity Matrix, container verdict, budget) → Findings for this surface (same fields as above) → Coverage. A per-component file (`components/{component}.md`) is written only for a shared component carrying a finding: contract, consumers, style origins, findings.

**Severity translation:** checklist `P0`–`P4` ↔ BLOCKED/WARN ↔ Critical–Low via the single map in `.claude/docs/design-review-checklist.md` §0.3 — never translate ad hoc.

---

## Systematic Review Protocol (10+ changed UI files)

1. **Categorize** — Group files by SURFACE first (the Phase 1 surface map), then by shared-library / component concern; one sub-agent owns a surface end to end (composition, UX pass, categories) so no surface is split across agents
2. **Parallel Sub-Agents** — Launch one UI/UX-specialized sub-agent per group with the UI-category checklist
3. **Synchronize** — Collect findings, cross-reference shared-component consumers and cross-system token mixing
4. **Consolidate** — One index report with per-category verdicts plus the per-surface files; cluster defects repeated across surfaces into single systemic findings

---

## Phase 5: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/ui-review-{date}-{slug}.md` (the exact path written in Phase 3 — NOT `{skill}-…`)
2. Invoke `$why-review --validate-findings tmp/reports/ui-review-{date}-{slug}.md`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."
6. **If the report changed after validation:** re-run this validation gate, maximum 2 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Phase 6: Validated Fix + Full UI Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 5 returns CLEAN/validated and the UI review report still has one or more findings that must be fixed.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; route broader or cross-cutting fixes through the parent `$plan` + `$feature-implement` flow when this skill is running inside a workflow.
3. Run targeted verification for the fixed UI files and any affected consumers.
4. Re-invoke `$ui-review` from Phase 0 over the full current UI scope, not only the fixed files.
5. The re-run MUST create brand-new review tasks, reload the UI docs, determine scope again, rerun blast radius where applicable, and review every changed UI file from the start.
6. Repeat validate → fix → full UI re-review until a complete pass clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a finding before `$why-review --validate-findings` validates it.
- Never mark UI review clean after a targeted fix check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass; analyze all UI files in scope again.
- Never reuse old todo/task items for the recursive review pass.

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use ask the user directly to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — run the canonical workflow from `.claude/workflows.json`; it runs UI review in TWO places by design (keep both) — internally as `$changes-review`'s UI dimension AND as a dedicated conditional parallel-batch reviewer (step 9) — alongside the other parallel reviewers, `code-simplifier` self-review, fix-plan cycle, full re-review restart, docs, and handoff.
> 2. **Execute `$ui-review` directly** — run this skill standalone

---

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use ask the user directly to present:

- **"$code-simplifier" (Recommended)** — Simplify and refine the styling/component code
- **"$web-design-guidelines"** — Generic accessibility / UX checklist for a11y depth
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling references across all relevant file types (styles, UI bindings, and source imports)
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — a fixed `width` may be a genuinely fixed UI element; no "fix" without traced rationale
3. **Verify ALL outputs.** One compiled stylesheet ≠ all consumers — a shared-component style change affects every consuming app
4. **Evaluate pattern fit.** Copying a nearby mixin/token? Verify the file imports/uses the SAME token system and does not mix incompatible project token systems
5. **New artifact = wired artifact.** Prove every created view, style, component, or helper is referenced and reachable through the target platform's entry point

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle, or when the user/workflow explicitly requests an independent high-risk UI synthesis pass. A review pass that finds issues triggers validation first; it does NOT trigger a fresh-context pass over the same findings before validation/fix.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn a NEW `spawn_agent` tool call — use the UI/UX-specialized agent_type from the local sub-agent selection guide
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. A reviewer prompt carries every protocol body inline and is never handed a path to go read (the reviewer-prompt rule of `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns a NEW `spawn_agent` call
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict
> - Continue until a complete full review pass clears the current round's exit bar and persisted `minRounds` (round 1: zero findings; round 2 and the conditional round 3: zero CRITICAL/HIGH/MEDIUM, LOW deferred). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass, never forcing green. If the same blocker repeats across 2 full invocations with no progress, or the budget is spent with blocking findings open, escalate by asking the user directly
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** UI reviews spawn the UI/UX-specialized sub-agent defined by the local sub-agent selection guide.
> Keep `agent_type: "ui-ux-designer"` in the canonical template below when that agent type exists in the local catalog.
> **Rationale:** The shared sub-agent selection guide routes frontend UI/UX, accessibility, responsive layout, and design-token work to the UI/UX specialization. Do not fall back to a generic code-reviewer catch-all unless the local catalog lacks a UI/UX reviewer.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** A fresh reviewer must hold every rule it reviews against from its first token; a path or a placeholder would make it depend on a file read, or on a hook that may not fire for it. Reviewer prompts are therefore the one place the hybrid policy (`SYNC:shared-protocol-duplication-policy`) always keeps full bodies: the template carries all 11 protocol bodies pre-embedded, and the orchestrator copies it wholesale.

### Subagent Type Selection

- `ui-ux-designer` — default for UI reviews when the local agent catalog provides it
- `code-reviewer` — fallback only when the local catalog lacks a UI/UX-specialized reviewer

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} UI review",
  agent_type: "ui-ux-designer",
  prompt: `
## Task
{review-specific task — e.g., "Review in-scope UI changes for content fit at supported sizes, configured styling, applicable accessibility and layering rules, and async states" | "Review the project's configured UI files under {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- {resolved project styling rules doc}
- {resolved project design-system/token doc, especially Z-Index & Layering}
- {resolved project frontend architecture/patterns doc}
- {resolved project code-review rules doc}

## Target Files
{explicit file list OR "run git diff and filter by the project's configured UI/frontend path and extension patterns"}

## Output
Write a structured report to tmp/reports/ui-review-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings (cross-system token mixing, shared-component fan-out)

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO keep the UI/UX-specialized `agent_type` for UI reviews when the local catalog provides it (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** UI quality — content remains available, supported sizes and inputs remain usable, platform layout/layering conventions are respected, project styling stays consistent, and async work provides meaningful feedback.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

<!-- OVERRIDE-NOTE:fresh-context-review -->

> **`fresh-context-review` is intentionally OVERRIDE-only in this skill** — see the `OVERRIDE:fresh-context-review` block above (it uses the UI/UX-specialized `ui-ux-designer` agent_type, NOT the generic `code-reviewer`). The generic `SYNC:fresh-context-review` copy is deliberately omitted here so the two cannot drift into a `code-reviewer` vs `ui-ux-designer` contradiction. This mirrors how `OVERRIDE:review-protocol-injection` is handled (override-only, no generic SYNC copy). **Do NOT re-add the generic `SYNC:fresh-context-review` block** — the `sync-inline-versions.md` propagation only updates existing `SYNC:` markers, so omission is stable.

> **`ui-ux-design-principles` is deliberately NOT inside the `OVERRIDE:review-protocol-injection` template.** That template's protocol region MUST stay substance-identical to canonical `SYNC:review-protocol-injection` across all three OVERRIDE carriers (`integration-test-review`, `architecture-review`, `ui-review`) — `sync-carrier-parity.test.cjs` pins it, precisely because those copies silently drifted once before. Adding a 12th protocol here fails that guard. The dispatched reviewer still receives the 40 clauses: this skill's fresh-eyes sub-agent is `ui-ux-designer`, and `.claude/agents/ui-ux-designer.md` carries `SYNC:ui-ux-design-principles` in its own definition. **Do NOT add the clauses to the injection template** — route them through the specialist agent instead. — why: a shared template that also feeds security and integration reviewers is the wrong layer for UI-only clauses.

<!-- /OVERRIDE-NOTE:fresh-context-review -->

> **Complexity Prevention (UI-scoped)** — measure code by cost of change and follow the platform's component model. Use configured component tiers and base abstractions when present; otherwise follow the observed structure without inventing one. Keep shared behavior with a clear owner when reuse is evidenced; place derivations, formatting, and validation according to the project's architecture. For deeper backend structure, defer to `$changes-review` or `$architecture-review`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-patterns-quality` — Design quality: one owner per rule, fitted patterns, no speculative abstraction; designing or reviewing code structure → .claude/skills/shared/protocols/design-patterns-quality.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:source-test-drift-check:reminder -->

**IMPORTANT MUST ATTENTION** when source behavior changes, inspect affected tests; decide from evidence whether tests update to match intent or the source change is an unintended bug.

<!-- /SYNC:source-test-drift-check:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:subagent-return-contract:reminder -->

**IMPORTANT MUST ATTENTION** every spawned sub-agent returns report path + status + severity counts; appends findings per-file (never batched); main agent integrates verbatim, never filters.

<!-- /SYNC:subagent-return-contract:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate in-scope user interfaces for content fit, supported-size behavior, platform-appropriate layout/layering and styling, accessibility, and async feedback; use the project's own UI patterns and skip absent surfaces.

**IMPORTANT MUST ATTENTION Workflow:** Phase 0 load project UI rules → Phase 1 determine and filter scope (skip with evidence when no frontend files), then expand files → affected surfaces → Phase 2 graph blast radius → Phase 2B reconstruct each surface's composition (component tree, style origins incl. ancestor/stacking/global layers, render or `ENVIRONMENT-BLOCKED`) → Phase 2C surface UX pass (task trace, Field Necessity Matrix, container fit, complexity budget) → Phase 3 review Categories 1–6 in surface context → Phase 3B run all nine UI/UX design-principles passes → Phase 4 write the compliance verdict → Phase 5 validate findings with `$why-review` → Phase 6 fix only validated findings that block the current round and restart the full UI review (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block); batch large scopes and use the UI/UX specialist only as the protocol requires.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION honor each canonical body above):**

- **Graph-Assisted Investigation:** Run graph command on key files first.
- **Nested Task Creation:** Expand child phases; link parent when nested.
- **Project Reference Docs Guide:** Read project docs before reviewing.
- **Task Tracking External Report:** Track tasks; persist findings incrementally.
- **Subagent Return Contract:** Sub-agent returns summary plus report path.
- **Critical Thinking Mindset:** Traced proof per claim; never guess.
- **Sequential Thinking Protocol:** Multi-step reasoning; state confidence closer.
- **Evidence-Based Reasoning:** Cite `file:line`; >80% to act.
- **Design Patterns Quality:** DRY, layered responsibility, SOLID; grep dangling.
- **Double Round-Trip Review:** Validate findings, fix only current-round blocking findings, and full re-review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Source-Test Drift Check:** Source changes; inspect affected tests.
- **Understand Code First:** Read code, grep 3+, before changing.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Review Batching:** Large changeset; parallel size-capped batches.
- **Severity Rubric:** Classify by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW is recorded/deferred, and failed binary gates always block.
- **Category Review Thinking:** Derive concerns first-principles, never fixed checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**MUST ATTENTION** break work into small tasks using task tracking BEFORE starting
**MUST ATTENTION** resolve and read project UI/styling docs BEFORE reviewing — rules come from docs, not general knowledge
**MUST ATTENTION** SKIP this skill when no files match the project frontend path/extension patterns
**MUST ATTENTION** every violation requires `file:line` proof — NEVER speculate
**MUST ATTENTION** grep 3+ counterexamples before flagging any pattern violation
**MUST ATTENTION** treat BEM, CSS override, and stacking rules as blockers only when the project documents them or source evidence shows a user-visible defect
**MUST ATTENTION** NEVER mix incompatible project token systems in one file — recommend whichever system the file already imports/uses
**MUST ATTENTION** after validated UI fixes, rerun the full UI review; when that protocol uses a fresh reviewer, use the UI/UX-specialized sub-agent from the local sub-agent selection guide
**MUST ATTENTION** run at least ONE graph command on key files when graph.db exists
**MUST ATTENTION** review SURFACES, not files: expand changed files to the views that render them, reconstruct composition (tree + style origins + render or `ENVIRONMENT-BLOCKED`), and run the Phase 2C surface UX pass (task trace, Field Necessity Matrix, container fit, budget) BEFORE the code categories — why: an overloaded or ancestor-broken surface passes every file-level check
**MUST ATTENTION** write the index to `tmp/reports/ui-review-{date}-{slug}.md` and one file per surface (and per shared component with findings) under `tmp/reports/ui-review-{date}-{slug}/`, appended as each completes; cluster repeated defects into one systemic finding
**MUST ATTENTION** NEVER fix code — review and report only
**MUST ATTENTION** apply `Think:` reasoning prompt before checking each category — derive violations, don't recite checklists
**MUST ATTENTION** run the Phase 3B UI/UX Design Principles pass for in-scope user interfaces — review the nine principle groups and apply clauses supported by the target platform, project conventions, and interaction modes; record inapplicable clauses with evidence. Findings cite `UI-<clause>` + `file:line` + BLOCKED/WARN severity, and project design-system docs remain authoritative when present (surface genuine conflicts; NEVER resolve them silently).
**MUST ATTENTION** use ask the user directly to present next steps after completing review

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| "Too simple for a UI review"              | Simple surfaces can still fail at supported content sizes. Apply the relevant categories. |
| "Already read the docs"                   | Show the extracted project/platform rule — no recall = no read.                          |
| "Just flag obvious z-index literals"      | Gray areas matter most. Trace the surface's semantic layer before recommending a token. |
| "Fixed width is fine, it looks right"     | Check the sizes and user scaling the project supports; verify the target platform can show the whole interaction. |
| "web-design-guidelines already covers UI" | Use it for web accessibility/UX; also check applicable project UI conventions without duplicating findings. |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> token, mixin, and layout must answer one question: _does this make the next
> change cheaper or more expensive?_ If it doesn't reduce future change cost,
> reject it. Magic values, duplicated styling knowledge, fixed sizing that
> fights the viewport, cross-system token mixing, and z-index escalation wars
> are the real enemies — call them out by name.

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
