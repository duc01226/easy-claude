---
name: ui-review
version: 2.0.0
description: '[Code Quality] Use when reviewing in-scope user interfaces for content fit, supported-size layout, project styling conventions, layering where applicable, accessibility, and async states.'
execution-mode: subagent
context-budget: high
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate in-scope user interfaces for content fit, adaptation to supported view sizes and input methods, layout sizing, platform-appropriate layering and styling, accessibility, and async feedback. Apply CSS-specific checks only to CSS-based surfaces and the project's own conventions; skip when the project or change has no UI.

**Summary:** Review only the resolved user-interface scope, apply project rules plus six UI categories and nine design-principles passes, then report evidence-backed PASS/WARN/BLOCKED findings through validated full-review loops.

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
2. **Phase 1: Determine Scope** — Changed UI files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run graph trace if graph.db exists
4. **Phase 3: UI Category Review** — Check each file against all 6 applicable categories
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts
6. **Fix Loop: Validate → Fix → Full UI Re-Review** — validate findings first; fix only findings that block the current round, then rerun the full UI review using the local sub-agent selection guide only when that protocol calls for agents. Round 1 blocks on every validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW-only is recorded as deferred, and binary accessibility/security gates always block.

**Key Rules:**

- Write findings to `tmp/reports/ui-review-{date}-{slug}.md`
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging
- Review is read-only until `/why-review --validate-findings` confirms findings; fixes may happen only in the validated fix loop or downstream plan/feature-implement, and every fix that blocks the current round restarts a full UI review from Phase 0 with brand-new tasks. From Round 2 onward, LOW-only findings end the loop and are recorded as deferred.

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

## Phase 3: UI Category Review

Create report: `tmp/reports/ui-review-{date}-{slug}.md`

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

**Precedence (MUST ATTENTION):** the project styling / design-system / frontend-pattern docs loaded in Phase 0 **OUTRANK** these clauses; the clauses outrank generic taste. Where a project doc states its own value (type scale, spacing unit, breakpoints, token contrast pairs), the PROJECT value is the rule and the clause is satisfied by following it. A genuine conflict is SURFACED to the user via `AskUserQuestion` with both sides — NEVER resolved silently.

| #   | Dimension                 | Clauses            | `Think:`                                                                                                                                                                                                                                                    |
| --- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Which element does a first-time user's eye land on, and is it the one this screen exists for? Which groups are held together by whitespace, and which by a border added because the whitespace was wrong? Are the empty, loading and error states designed at all — or only the full state? |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Follow the configured type scale where one exists; inspect hierarchy, legibility, and supported user text scaling for this platform. Which values depart from the project's evidence, and are the actual reading conditions usable? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | For each foreground/background pair that actually renders, what is the COMPUTED ratio (measured — never judged by eye)? What does a user who cannot perceive the accent hue see instead? In dark mode, is elevation signalled by lifted surfaces or by an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Follow the configured spacing/layout system where present; check whether grouping, alignment, and sizing serve the current information. For responsive platforms, do layout changes respond to content and supported sizes? |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | For each interactive element, what feedback does the user receive within the project's/platform's expected response window? Are applicable states and focus/input cues clear? Could an undo path improve a confirmation? Does motion respect user preferences? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Landing on this surface cold: where am I, what's here, where next? How many top-level destinations exist? Are labels the user's words or the team's internal vocabulary? Where does navigation return, using a URL or platform back path when supported? |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Field by field: what breaks if this field is removed today? Is its label still visible once filled? When does validation fire, and does the message say how to fix it? Does the keyboard/autocomplete match the data type? What happens to typed data on validation error, navigation away, and refresh? |
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
- Components / apps affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project or platform reference}
- **Evidence:** {what was found}
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
```

---

## Systematic Review Protocol (10+ changed UI files)

1. **Categorize** — Group files by app / shared-library / component concern
2. **Parallel Sub-Agents** — Launch one UI/UX-specialized sub-agent per group with the UI-category checklist
3. **Synchronize** — Collect findings, cross-reference shared-component consumers and cross-system token mixing
4. **Consolidate** — Single holistic report with per-category verdicts

---

## Phase 5: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/ui-review-{date}-{slug}.md` (the exact path written in Phase 3 — NOT `{skill}-…`)
2. Invoke `/why-review --validate-findings tmp/reports/ui-review-{date}-{slug}.md`
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
2. Fix only findings that survived `/why-review --validate-findings`; route broader or cross-cutting fixes through the parent `/plan` + `/feature-implement` flow when this skill is running inside a workflow.
3. Run targeted verification for the fixed UI files and any affected consumers.
4. Re-invoke `/ui-review` from Phase 0 over the full current UI scope, not only the fixed files.
5. The re-run MUST create brand-new review tasks, reload the UI docs, determine scope again, rerun blast radius where applicable, and review every changed UI file from the start.
6. Repeat validate → fix → full UI re-review until a complete pass clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a finding before `/why-review --validate-findings` validates it.
- Never mark UI review clean after a targeted fix check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass; analyze all UI files in scope again.
- Never reuse old todo/task items for the recursive review pass.

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use `AskUserQuestion` to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — run the canonical workflow from `.claude/workflows.json`; it runs UI review in TWO places by design (keep both) — internally as `/changes-review`'s UI dimension AND as a dedicated conditional parallel-batch reviewer (step 9) — alongside the other parallel reviewers, `code-simplifier` self-review, fix-plan cycle, full re-review restart, docs, and handoff.
> 2. **Execute `/ui-review` directly** — run this skill standalone

---

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use `AskUserQuestion` to present:

- **"/code-simplifier" (Recommended)** — Simplify and refine the styling/component code
- **"/web-design-guidelines"** — Generic accessibility / UX checklist for a11y depth
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling references across all relevant file types (styles, UI bindings, and source imports)
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — a fixed `width` may be a genuinely fixed UI element; no "fix" without traced rationale
3. **Verify ALL outputs.** One compiled stylesheet ≠ all consumers — a shared-component style change affects every consuming app
4. **Evaluate pattern fit.** Copying a nearby mixin/token? Verify the file imports/uses the SAME token system and does not mix incompatible project token systems
5. **New artifact = wired artifact.** Prove every created view, style, component, or helper is referenced and reachable through the target platform's entry point

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle, or when the user/workflow explicitly requests an independent high-risk UI synthesis pass. A review pass that finds issues triggers validation first; it does NOT trigger a fresh-context pass over the same findings before validation/fix.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn a NEW `Agent` tool call — use the UI/UX-specialized subagent_type from the local sub-agent selection guide
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns a NEW `Agent` call
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict
> - Continue until a complete full review pass clears the current round's exit bar and persisted `minRounds` (round 1: zero findings; round 2 and the conditional round 3: zero CRITICAL/HIGH/MEDIUM, LOW deferred). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass, never forcing green. If the same blocker repeats across 2 full invocations with no progress, or the budget is spent with blocking findings open, escalate via `AskUserQuestion`
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** UI reviews spawn the UI/UX-specialized sub-agent defined by the local sub-agent selection guide.
> Keep `subagent_type: "ui-ux-designer"` in the canonical template below when that agent type exists in the local catalog.
> **Rationale:** The shared sub-agent selection guide routes frontend UI/UX, accessibility, responsive layout, and design-token work to the UI/UX specialization. Do not fall back to a generic code-reviewer catch-all unless the local catalog lacks a UI/UX reviewer.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `ui-ux-designer` — default for UI reviews when the local agent catalog provides it
- `code-reviewer` — fallback only when the local catalog lacks a UI/UX-specialized reviewer

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} UI review",
  subagent_type: "ui-ux-designer",
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
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
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
- DO keep the UI/UX-specialized `subagent_type` for UI reviews when the local catalog provides it (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** UI quality — content remains available, supported sizes and inputs remain usable, platform layout/layering conventions are respected, project styling stays consistent, and async work provides meaningful feedback.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

<!-- OVERRIDE-NOTE:fresh-context-review -->

> **`fresh-context-review` is intentionally OVERRIDE-only in this skill** — see the `OVERRIDE:fresh-context-review` block above (it uses the UI/UX-specialized `ui-ux-designer` subagent_type, NOT the generic `code-reviewer`). The generic `SYNC:fresh-context-review` copy is deliberately omitted here so the two cannot drift into a `code-reviewer` vs `ui-ux-designer` contradiction. This mirrors how `OVERRIDE:review-protocol-injection` is handled (override-only, no generic SYNC copy). **Do NOT re-add the generic `SYNC:fresh-context-review` block** — the `sync-inline-versions.md` propagation only updates existing `SYNC:` markers, so omission is stable.

> **`ui-ux-design-principles` is deliberately NOT inside the `OVERRIDE:review-protocol-injection` template.** That template's protocol region MUST stay substance-identical to canonical `SYNC:review-protocol-injection` across all three OVERRIDE carriers (`integration-test-review`, `architecture-review`, `ui-review`) — `sync-carrier-parity.test.cjs` pins it, precisely because those copies silently drifted once before. Adding a 12th protocol here fails that guard. The dispatched reviewer still receives the 40 clauses: this skill's fresh-eyes sub-agent is `ui-ux-designer`, and `.claude/agents/ui-ux-designer.md` carries `SYNC:ui-ux-design-principles` in its own definition. **Do NOT add the clauses to the injection template** — route them through the specialist agent instead. — why: a shared template that also feeds security and integration reviewers is the wrong layer for UI-only clauses.

<!-- /OVERRIDE-NOTE:fresh-context-review -->

> **Complexity Prevention (UI-scoped)** — measure code by cost of change and follow the platform's component model. Use configured component tiers and base abstractions when present; otherwise follow the observed structure without inventing one. Keep shared behavior with a clear owner when reuse is evidenced; place derivations, formatting, and validation according to the project's architecture. For deeper backend structure, defer to `/changes-review` or `/architecture-review`.

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:design-patterns-quality -->

> **Design Quality** — Be opinionated about changeability, and choose techniques by their preconditions. For brownfield work, project config, references, accepted decisions, and current code define the local architecture; do not silently replace a settled pattern. For a new non-trivial system, treat the options below as hypotheses; use the domain, change, and deployment boundaries to select a fit, not a universal target architecture.
>
> 1. **DRY the knowledge, not merely the text.** Keep one owner for a business rule or policy that must change together. Similar-looking code with different reasons to change may stay separate; extract shared functions, modules, types, or components when a real consumer and lower change cost justify them.
> 2. **Give modules explicit responsibilities and dependency direction.** A modular monolith can fit a new application with one release boundary and no evidenced need for independent deployment, scaling, compliance, availability, or runtime; choose another topology when measured ownership or operating boundaries require it. Use Clean/Hexagonal/Ports-and-Adapters ideas to keep policy independent of volatile infrastructure when that boundary buys testability or change isolation. Add layers only when each owns a real contract; split deployment/services only for a demonstrated scaling, ownership, availability, compliance, or release need.
> 3. **Model the domain to its actual complexity.** Use DDD language, aggregates, value objects, and explicit invariants where domain rules and lifecycle matter. Keep straightforward CRUD workflows simple; do not add tactical DDD ceremony without domain complexity.
> 4. **Use events for real decoupling.** Domain/integration events and messaging fit asynchronous reactions or independently owned modules/services. Define idempotency, ordering, retry/recovery, and an outbox/CDC strategy when delivery crosses a durable boundary. Use a direct call inside one consistency boundary when asynchronous delivery adds no value.
> 5. **Use Repository and Unit of Work at meaningful persistence boundaries.** They fit when they protect aggregate/query contracts, isolate a changing persistence technology, or coordinate a real transaction. Do not wrap every ORM call in a generic repository or add a Unit of Work that duplicates the platform's transaction behavior.
> 6. **Apply OOP/SOLID where the language and model use objects.** Prefer cohesive responsibilities, dependency inversion at volatile boundaries, and composition before inheritance; avoid interface-per-class and abstractions with no second implementation or test seam. In functional or data-oriented code, preserve the same cohesion, explicit dependencies, and small contracts without forcing classes.
> 7. **Build UI from cohesive components.** Keep state at the narrowest useful owner; use a store for state genuinely shared across components/routes or for coordinated async data. Add caching only with a freshness/invalidation policy and evidence of a repeated or expensive read. Use the framework's reactive model for composable asynchronous changes and dispose subscriptions/resources by its lifecycle. Apply BEM when the project uses SCSS/BEM; otherwise follow the selected CSS modules, utility, or naming method.
> 8. **Place behavior with its invariant/data owner.** Trace callers and dependencies; use the owner selected by the project's architecture. Do not assume Entity > Service > Controller, or any other fixed layer order.
> 9. **After extraction/move/rename:** grep the full affected scope for dangling references. Preserve project naming/style and verify caller contracts before changing an abstraction.
>
> **Selection gate:** read project config, references, accepted decisions, and comparable implementations. Name the problem/precondition a chosen pattern solves, the simpler alternative, and the trade-off. Configuration may select a stack-specific pattern; it does not make an unjustified abstraction free.
>
> **Review dimensions:** use focused passes over applicable concerns, then group repeated, evidenced violations when they share one cause. A repeated smell is not automatically a defect; name the damaged quality attribute and project-specific consequence.

<!-- /SYNC:design-patterns-quality -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — "double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain** — defined below. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds` — round 1 included with the default minimum; the cap never obliges an extra round. What happens when round 2 completes with blocking findings still open (severity floor applied) depends on WHAT is still open:
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, is never a default, is granted at most once per run, and never renews. Record the granting findings in the run record and report.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate via `AskUserQuestion`.** Round 3 is the review hard cap; no review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullets above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 3 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension round, reachable ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, reachable ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to reach — or to dodge — the extension.** The extension is unlocked by a real CRITICAL/HIGH, so promoting a MEDIUM to HIGH to buy round 3, or demoting a real CRITICAL/HIGH to MEDIUM to force an earlier escalation, are both FALSE classifications. Severity is set by consequence before the round bar and the extension test are applied. — why: an extension that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → validate findings → fix → restart from the first review phase. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, extendable ONCE to round 3 when round 2 leaves validated CRITICAL/HIGH open**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking, which earns no extension · round 3 completes with any review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 3 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted minimum is met, and cap exhaustion escalates rather than passes
> - Enforce the base cap of 2 rounds, the single conditional extension to round 3 (unlocked ONLY by validated CRITICAL/HIGH open at round 2; a failed non-test binary gate counts as CRITICAL), and the 2 repeated-no-progress blocker rule together; all three are escalation triggers for review blockers, none is a completion criterion
> - The extension is granted at most ONCE per run and never renews — round 3 is the review hard cap regardless of what it finds
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, never let them buy the extension, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When round 3 ran, the report must name the CRITICAL/HIGH findings that granted the extension; when rounds continued on failing tests, it must name the failing test gates of each such round.**

<!-- /SYNC:double-round-trip-review -->


<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->


<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile examples)** — a reference catalog, not a universal platform contract. Apply it only to an applicable user-facing interface. Resolve the target platform, input modes, accessibility standard, and relevant design conventions from the brief, project config/reference docs, accepted decisions, and existing UI. For web, use WCAG 2.2 AA as the baseline and meet any stricter applicable legal or project requirement; for non-web surfaces, use the documented platform accessibility standard. Record the selected standard and source.
>
> Numeric values and patterns below are examples or heuristics for matching surfaces, not required thresholds. Use a value as a fail-condition only when an applicable law, platform standard, project contract, or accepted design decision establishes it. For desktop, game, embedded, command-line, or other interfaces, use their documented platform conventions and accessibility requirements; do not report a mismatch with a web/mobile example as a defect. Skip clauses whose underlying capability is absent and record N/A when needed. Cite applicable clauses by ID (for example `UI-3.1` or `UI-8.2`).
>
> **Precedence:** accepted product/design decisions → project config and design-system / styling / frontend / platform references → applicable clauses below → general heuristics. A genuine conflict between authoritative project sources is SURFACED with both sides — NEVER resolved silently. An absent project convention is not permission to invent one.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per screen. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity, NEVER by border. Whitespace separates cleanly; boxes inside boxes do not.
> - `UI-1.4` Align to a shared edge. Every unexplained indent reads as an accident.
> - `UI-1.5` Design the empty, loading and error state FIRST. The full state is the easy one.
>
> **2.0 Typography**
>
> - `UI-2.1` Keep type families and weights purposeful; follow the project's type system when present. Two families and three weights are one possible web starting point, not a limit.
> - `UI-2.2` Meet the readable-text sizes required by the applicable platform and project. Common web/mobile values such as 16px are examples; do not use them as universal minimums.
> - `UI-2.3` Keep text measures readable for the content and target surface. A 45–75 character line is an editorial heuristic, not a pass threshold.
> - `UI-2.4` Choose line spacing that supports the font, size, script, and reading context; ratios such as 1.5 for body text are starting points.
> - `UI-2.5` Use the project's type scale where defined. Otherwise keep sizes purposeful and consistent without requiring a fixed number of named steps.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Meet the contrast ratios required by the selected accessibility standard; for web, use WCAG 2.2 AA unless a stricter applicable legal or project requirement applies. Measure where possible. Ratios such as 4.5:1 for text and 3:1 for interface parts are standard-specific examples, not universal values.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` Follow the project's spacing tokens or grid when defined. A 4px or 8px base is one common option, not a framework requirement.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Use spacing to make grouping and hierarchy clear; the right relationship depends on the content and layout.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Give immediate, perceivable feedback; use a timing target only when the product contract or applicable platform guidance defines one.
> - `UI-5.2` Specify the interaction states supported by the target platform and input modes (for example default, focus, active, disabled, or loading); hover is not universal.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Use motion when it clarifies cause and effect; follow project/platform timing and easing, and honor reduced-motion preferences when supported. Durations around 150–250ms are examples, not a rule.
> - `UI-5.5` Preserve a perceivable focus indicator wherever the interface supports focus navigation; follow the platform and applicable accessibility standard.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Keep primary navigation understandable for the product's information architecture; do not impose a fixed destination count.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Preserve expected return, history, or deep-link behavior where the platform and product provide those concepts.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason it exists today.
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate at a point that supports timely, useful correction without disrupting entry; follow the project's interaction contract. Explain errors and associate them with the affected input where supported.
> - `UI-7.4` Match the input control and available input aids to the data and target platform; use autocomplete or capitalization hints only where supported and appropriate.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Meet the target-size and spacing requirements of the applicable platform/accessibility standard. The interactive target may exceed the visible icon.
> - `UI-8.2` Place primary actions where they are reachable for the target device, orientation, handedness, and input mode.
> - `UI-8.3` Provide an alternative to gesture-only actions when required by the target platform or accessibility contract.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Give feedback appropriate to the work and what is known; skeletons and spinners are options, not required patterns.
> - `UI-9.2` Use optimistic updates only when the operation can be safely reconciled; otherwise show clear pending, success, and failure states.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` For network-dependent surfaces, define useful timeout, retry, and offline behavior according to the product's availability needs.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role                                | Obligation                                                                                                                                                              |
> | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | DESIGN / PLAN a surface             | Select applicable clauses for the target platform; document required states, tokens, input, and constraints from the project contract. |
> | IMPLEMENT a component               | Verify the configured behavior and accessibility requirements; use project tokens and abstractions only when defined. |
> | REVIEW UI code or a design artifact | Treat only applicable, authoritative clauses as fail-conditions; cite `UI-<clause>` + `file:line` + severity. NEVER turn inapplicable defaults into findings. |
> | SCAN / document a UI system         | Record the project's actual platform conventions and deliberate deviations; do not fill gaps with this catalog's examples. |
>
> **Component architecture (code-bearing UI work):** Follow documented tiers and base abstractions when the project has them. Otherwise identify actual reuse boundaries from the code; do not require a three-tier taxonomy, base class, or lower-tier test model. Reuse shared behavior when a demonstrated consumer and suitable project abstraction justify it; test according to the project's test organization.
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

<!-- /SYNC:ui-ux-design-principles -->

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity, and re-deciding it per feature is the incoherence this gate prevents. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** a different question, no overlap — the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. A surface can pass all 40 clauses and still be a template. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular; they are never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons. A decision with no articulable reason is a default that arrived unnoticed. Defaults hide in what feels like infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: writing a plan and going straight to code reproduces the default, because the plan came from the same patterns the code will.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, not the default you would reach for on any project. Set a real scale with intentional weights, widths and spacing. When type is a headline it is an ACTIVE part of the design, not a neutral delivery vehicle. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. For every device ask: what does this tell the reader that whitespace would not? Nothing → cut it. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (same card size, same gap, same density everywhere is the sound of no one deciding); proportions must say something you can articulate; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, `calc()` values that exist only as workarounds, absolute positioning to escape layout flow are lies; the correct answer is always simpler than the hack). Take screenshots to review where the environment supports it — a picture is worth 1000 tokens. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable, not an omission.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:ui-copywriting -->

> **Words are design content, not decoration** — binds whenever a task authors, changes, or reviews user-visible strings (labels, CTAs, headings, empty/error/loading text, toasts, placeholder content). Deep detail: `.claude/docs/design-knowledge.md` §8. Copy makes a design feel as templated as the visuals do.
>
> Before writing anything, ask what the design needs to SAY and how it can best be said to help the person navigate the experience. Then:
>
> 1. **Write from the end user's perspective.** Name things by what users will understand in simple language, not by how the system is built — a user manages **notifications**, not **webhook config**. Describe what something is or does in plain terms rather than selling it. Being specific and legible to a new user ALWAYS beats being clever.
> 2. **Active voice by default.** A CTA says exactly what happens when it is used: **"Save changes"**, NEVER "Submit".
> 3. **One name per action, across the whole flow.** The button that says **Publish** produces a toast that says **Published**. The vocabulary of an interface is the signposting for someone navigating the product — cohesion and consistency are how people learn their way around.
> 4. **Failure and emptiness give DIRECTION, not mood.** Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors do NOT apologize, and are NEVER vague about what happened.** An empty screen is an invitation to act.
> 5. **Conversational tone, one job per element.** Plain verbs, sentence case, no filler, tone matched to the brand and the audience; let each written element do exactly one job.
> 6. **Real content, never lorem.** When the brief supplies no copy, write plausible strings for the ACTUAL subject. **Coherence check — read every visible string as a user would, checking for truth, not typos:** could a real person at a real company be looking at exactly this data right now, or does the page title belong to one product, the body to another, and the sidebar metrics to a third? A beautifully designed interface with nonsensical content is a movie set with no script.
>
> **Skip ONLY** when the change surfaces no user-visible text — state that explicitly.

<!-- /SYNC:ui-copywriting -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

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

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

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

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `/why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate in-scope user interfaces for content fit, supported-size behavior, platform-appropriate layout/layering and styling, accessibility, and async feedback; use the project's own UI patterns and skip absent surfaces.

**IMPORTANT MUST ATTENTION Workflow:** Phase 0 load project UI rules → Phase 1 determine and filter scope (skip with evidence when no frontend files) → Phase 2 graph blast radius → Phase 3 review Categories 1–6 → Phase 3B run all nine UI/UX design-principles passes → Phase 4 write the compliance verdict → Phase 5 validate findings with `/why-review` → Phase 6 fix only validated findings that block the current round and restart the full UI review (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block); batch large scopes and use the UI/UX specialist only as the protocol requires.

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

**MUST ATTENTION** break work into small tasks using `TaskCreate` BEFORE starting
**MUST ATTENTION** resolve and read project UI/styling docs BEFORE reviewing — rules come from docs, not general knowledge
**MUST ATTENTION** SKIP this skill when no files match the project frontend path/extension patterns
**MUST ATTENTION** every violation requires `file:line` proof — NEVER speculate
**MUST ATTENTION** grep 3+ counterexamples before flagging any pattern violation
**MUST ATTENTION** treat BEM, CSS override, and stacking rules as blockers only when the project documents them or source evidence shows a user-visible defect
**MUST ATTENTION** NEVER mix incompatible project token systems in one file — recommend whichever system the file already imports/uses
**MUST ATTENTION** after validated UI fixes, rerun the full UI review; when that protocol uses a fresh reviewer, use the UI/UX-specialized sub-agent from the local sub-agent selection guide
**MUST ATTENTION** run at least ONE graph command on key files when graph.db exists
**MUST ATTENTION** NEVER fix code — review and report only
**MUST ATTENTION** apply `Think:` reasoning prompt before checking each category — derive violations, don't recite checklists
**MUST ATTENTION** run the Phase 3B UI/UX Design Principles pass for in-scope user interfaces — review the nine principle groups and apply clauses supported by the target platform, project conventions, and interaction modes; record inapplicable clauses with evidence. Findings cite `UI-<clause>` + `file:line` + BLOCKED/WARN severity, and project design-system docs remain authoritative when present (surface genuine conflicts; NEVER resolve them silently).
**MUST ATTENTION** use `AskUserQuestion` to present next steps after completing review

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
