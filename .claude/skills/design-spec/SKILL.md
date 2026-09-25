---
name: design-spec
version: 2.0.0
description: '[Project Management] Use when a workflow step or the user asks for UI/UX design specs from requirements, PBIs or stories. Flag: --mode=wireframe converts sketches into structured specs.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a complete, tech-agnostic UI/UX design spec that lets a developer rebuild the source outcome on ANY stack, preserving every required view, navigation path, component, state, token, responsive rule, accessibility need, demo journey, and governing-spec link.

**Summary:**

- **Step 0–0b — ground context:** inventory related UI and connected flows; if a governing Feature Spec exists, seed from §6 and reuse its view/state vocabulary verbatim; otherwise state that no governing spec exists.
- **Step 1–2 — route + size:** design link (e.g. a Figma URL)→ask the user to export the frames as images (`AskUserQuestion`), then visual analysis; image→visual analysis; wireframe/sketch→`--mode=wireframe` plus confidence/human review; PBI/text→requirements; choose Quick (§1–4) or Full (§1–7, plus Flow Diagram for multi-page).
- **Step 3–6 — specify the surface:** inventory new/existing components; define interactions and all 7 observable states where applicable; extract design-system tokens; document content-driven responsive behavior and the complete releasable page/view/navigation/full-flow surface.
- **Step 7–8 — close the chain:** save under `design-specs/` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides); when a governing Feature Spec exists, update only its `design_spec:`/`mockup:` frontmatter; satisfy M1–M5/M7 and logical-ID traceability.

**Workflow:**

1. **Ground Source** — Inventory UI/flows; seed governing §6 vocabulary
2. **Route Input** — Choose visual, wireframe, PBI, or text path
3. **Set Scope** — Choose Quick / Full / Flow Diagram
4. **Specify** — Components, 7 states, tokens, responsive/accessibility/full-flow rules
5. **Save + Link** — Save artifact; update Feature Spec frontmatter only

**Key Rules:**

- Input routing: design link (e.g. a Figma URL)→ask the user to export the frames as images, then visual analysis; wireframe/sketch→`--mode=wireframe`; screenshot→visual analysis.
- Reuse `design-system/` tokens and `frontend-patterns-reference.md` component patterns from the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides); include keyboard navigation, ARIA labels, and contrast.
- **[BLOCKING] Tech-agnostic output:** spec prose/headings follow `spec-principles.md` §3 under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — describe components by UX role, not framework/library names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- **[BLOCKING] Releasable UI surface:** apply `.claude/skills/shared/releasable-pbi-contract.md`; the design spec must deepen, not reduce, the PBI/mockup page/view, navigation, component, state, and full-flow inventories.

> **Releasable outcome contract** — Preserve one complete actor-facing journey (entry/context → action/input → validation/decision → visible or persisted result → exit/next path) with every required view, navigation edge, component, and state; incomplete or ambiguous outcomes stay blocked.
>
> **MUST ATTENTION READ** `.claude/skills/shared/releasable-pbi-contract.md` for the full contract.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Design Specification

Create structured UI/UX design specification documents from requirements or PBIs for developer handoff.

## When to Use

- A PBI or user story needs a design spec before implementation
- Requirements need concrete layout, states, tokens, and responsive behavior
- A component inventory and interaction patterns need documentation

## When NOT to Use

- Wireframes run internally via `--mode=wireframe` — no separate skill call
- Building UI — use `design --lane=marketing` (marketing/creative) or `design --lane=product` (product UIs)
- Reviewing UI code — use `web-design-guidelines`

## Prerequisites

Read before executing:

- The source PBI, user story, or requirements document
- `design-system/` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) -- project design tokens (if applicable)
- Existing design specs in `design-specs/` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) for format consistency

### Frontend/UI Context

> For frontend/UI work, read:

All three live under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Frontend patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

## Workflow

> **[BLOCKING] Step 0 — Inventory existing UI + map connected flows** (per `SYNC:existing-ui-research`). Before authoring, inventory related existing screens/components/pages and every connected feature flow (links, embeds, navigates to/from); record matched UI + flows in §1 so the spec fits the live UI system. Skip only backend-only work; state that explicitly.

> **[BLOCKING] Step 0b — Seed from governing Feature Spec §6 (when one exists).** Search the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) for a canonical spec covering this capability. If found, READ **§6 Process Flows & Interaction Surface** — **View Inventory** (§6.2), **Navigation Map** (§6.3), **Key UI States** (§6.4), and **Per-Story Interaction Flow** (§6.5) — as this design-spec's starting frame:
>
> - **Reuse vocabulary verbatim:** carry over the SAME UX-role view names from §6.2 and observable-state names from §6.4 (Default / Loading / Disabled / Error / Empty / Success). NEVER rename or repartition; both artifacts MUST use one language so the navigable hub works.
> - **Deepen, never diverge:** keep the spec tech-agnostic; add visual fidelity (layout, tokens, pixel detail) on top of its intent. Map each §6.5 step and §6.4 state to visual treatment; preserve its `US-`/`OP-`/`BR-` logical-ID cross-refs.
> - This coupling is the `SYNC:ui-intent-layer` contract below; use that block for the full rule instead of restating it.
>
> **Skip ONLY** when no governing Feature Spec exists; author the interaction frame from the source PBI/story and state which case applies.

1. **Read source input & route by type**

    | Input Detected           | Detection                                      | Action                                                                   |
    | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------ |
    | Design-tool link         | A design-tool URL (e.g. `figma.com`) in text   | Ask the user via `AskUserQuestion` to export the frames as images, then continue on the image path |
    | Image/screenshot         | Image file attached to prompt                  | Use `visual analysis tooling` to extract design guidelines, then continue          |
    | Hand-drawn wireframe     | Image + "wireframe"/"sketch" keyword           | Run `--mode=wireframe` (internal — see "Mode: wireframe" section)         |
    | PBI/story text           | Acceptance criteria present                    | Extract UI requirements from text, continue                              |
    | Verbal/text requirements | No image, no URL, no PBI                       | Clarify with user, then continue                                         |

For ANY visual input, extract design context FIRST, then generate the spec.

2. **Determine spec complexity**

    ```
    IF single form or simple component → Quick Spec (sections 1, 1b, 2-4)
    IF full page or multi-component view → Full Spec (all 7 sections)
    IF multi-page flow → Full Spec + Flow Diagram
    ```

3. **Build component inventory**
    - List needed UI components; classify reusable vs feature-specific; note existing shared-library/design-system components.

4. **Define states and interactions**
    - Default, hover, active, disabled, error, loading, and empty states; user interactions (click, drag, keyboard shortcuts); transitions and animations.

5. **Extract design tokens**
    - Colors, typography, spacing, shadows, and border-radius; reference existing design-system tokens where possible.

6. **Document responsive behavior**
    - Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+); document layout, visibility, and sizing changes at each breakpoint.
    - **Small-screen minimum bar (spec it explicitly):** the layout MUST stay usable on mobile. Preferred = reflow (rows `flex-wrap` / `row → column`, grids collapse to one column). Where a component genuinely can't reflow (data tables, canvases, wide grids), specify a `min-width`/`min-height` + `overflow: auto` scroll as the accepted fallback — scrolling is OK. Hard requirement = nothing broken (no clipped, cut-off, or unreachable content/controls). If a component needs a large redesign to work on mobile, flag it for the user rather than assuming a rewrite.

7. **Save artifact** — pick the filename variant by artifact type; every path below is relative to the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path):
    - Design spec: `design-specs/{YYMMDD}-designspec-{feature-slug}.md`
    - Accessibility audit: `design-specs/{YYMMDD}-ux-audit-{feature-slug}.md`
    - Single-component doc: `design-specs/{YYMMDD}-ux-component-{component-name}.md`

8. **Link back to the governing Feature Spec (when one exists).** After saving the artifact, keep the spec the navigable hub: open the governing Feature Spec under the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) and set its frontmatter `design_spec:` key to this design-spec's saved path (add the key if absent, update it if stale). If a mockup was also produced (e.g. via `/pbi-mockup`), set the `mockup:` key the same way. Edit **frontmatter only** — never touch the §1–§8 spec body. This satisfies the `artifact-review --type=design` link-back gate, which fails when a design-spec exists but its path is not recorded in the spec's `design_spec:` frontmatter. Skip ONLY when no governing Feature Spec exists (the design-spec is standalone) — state that.

### Role Context & Artifact Path (canonical)

> Applies to writes under `design-specs/` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

- **Active Role:** ui-ux-designer · **Skill:** design-spec
- **Path:** `design-specs/` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) · **Type:** designspec · **Role token:** ux
- **Template:** `.claude/docs/team-artifacts/templates/design-spec-template.md` (framework-owned path — NOT the configurable team-artifacts root in `docs/project-config.json`)
- **Naming:** `{YYMMDD}-ux-{type}-{slug}.md` (general artifact-path pattern: `{YYMMDD}-{role}-{type}-{slug}.md`)
- **Context:** DESIGN SPEC — include component states, design tokens, accessibility requirements.
- **Quality checklist:** `- [ ]` Information priority + container recorded per view ·  `- [ ]` All states documented · `- [ ]` Design tokens specified · `- [ ]` Accessibility notes included · `- [ ]` Responsive breakpoints defined

## Mode: wireframe (image → spec)

> **Mode flag:** use `--mode=wireframe` for hand-drawn/digital wireframes or UI sketches. This INPUT adapter analyzes the image, then continues through the normal Output Format and M1-M5/M7 gate; `design-spec` owns wireframe→spec conversion.

### Input Routing (wireframe)

| Input                   | Detection                               | Action                                       |
| ----------------------- | --------------------------------------- | -------------------------------------------- |
| Hand-drawn sketch photo | Image with rough/organic lines          | Analyze with wireframe prompts (this mode)   |
| Digital wireframe       | Image with clean lines/shapes           | Analyze with wireframe prompts (this mode)   |
| Wireframe tool export   | Image from Excalidraw/Balsamiq/MockFlow | Analyze with wireframe prompts (this mode)   |
| App screenshot          | Polished UI with real data              | Route to `/design --mode=screenshot` instead |

### Wireframe Analysis

Use `visual analysis tooling` with these prompts:

**Prompt 1: Layout Extraction** — "Analyze this wireframe image. Identify: (1) page layout regions (header, sidebar, main, footer), (2) all UI elements with approximate position and type (button, input, table, card, dropdown, modal, tabs), (3) content hierarchy (what is primary vs secondary), (4) interactive elements, (5) any text labels or annotations, (6) navigation patterns."

**Prompt 2: Component Identification** — "From the wireframe, list every distinct UI component. For each: name it descriptively, classify its complexity (primitive=single element, composite=grouped elements, section=page region), note its purpose."

### Wireframe Output Generation

After image analysis, generate (per `SYNC:ui-wireframe-protocol`):

1. **ASCII Wireframe** — Recreate layout using box-drawing characters
2. **Component Inventory** — List with tier classification (Common/Domain-Shared/Page)
3. **States Table** — Default, Loading, Empty, Error per view
4. **Component Decomposition Tree** — If detail level warrants (refine/story)
5. **Responsive Suggestions** — Based on layout complexity

Apply the **M1-M5/M7** gate to all wireframe-derived prose: business-level component names, no code-prop refs, logical-ID feature mapping, observable transitions, rebuildability, and business-visible subject matter.

Wireframe-derived specs carry the same **Design-Principles Obligations** (below): the States Table (item 3) is authored empty/loading/error FIRST (`UI-1.5`) and covers all 5 interaction states per interactive element (`UI-5.2`); the Responsive Suggestions (item 5) break where the CONTENT breaks, not at device names (`UI-4.4`); and where the sketch is silent on type scale, spacing unit, or contrast (`UI-2.5`, `UI-4.1`, `UI-3.1`), record them in §4 as `[UNVERIFIED — needs design-system mapping]` rather than inventing one-off values measured off the drawing.

### Mapped Business Operations

Emit this table linking each interactive component to the feature operations/rules it drives (logical ID is the primary spine; mark `[UNVERIFIED — needs feature-spec mapping]` when the wireframe alone cannot determine it):

| Interactive Component | Interaction (observable) | Feature Operation / Rule (logical ID) | Notes                            |
| --------------------- | ------------------------ | ------------------------------------- | -------------------------------- |
| Primary Button        | Click → submit form      | OP-XX                                 | Triggers create/update operation |
| Filter Dropdown       | Select → reload list     | OP-XX                                 | Drives query/search operation    |
| Row Action Menu       | Click → confirm dialog   | BR-XX                                 | Guarded by authorization rule    |

### Wireframe Output Formats

- **Format A: PBI Section (default)** — output a standalone `## UI Layout` section compatible with PBI/story templates (consumed by `/pbi-mockup`).
- **Format B: Standalone Spec** — output to `design-specs/{YYMMDD}-wireframe-spec-{slug}.md` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

### Confidence & Review (wireframe)

- **Always display confidence level** for wireframe interpretation (analysis is 70-80% accurate).
- **Always recommend human review** before proceeding to implementation.
- If confidence <70%: ask clarifying questions about ambiguous elements via `AskUserQuestion`.

## Output Format

```markdown
# Design Spec: {Feature Name}

**Source:** {PBI/story reference}
**Date:** {YYMMDD}
**Status:** Draft | Review | Approved

## 0. Design Plan (`DD-1`–`DD-3`)

**Subject / audience / job:** {the concrete product, the actual person using it and where they are, and the verb they came to do}

| Part           | Decision                                          | Why — traced to the subject                       |
| -------------- | ------------------------------------------------- | ------------------------------------------------- |
| **Color**      | {4–6 named hex values, named for this product's world} | {why these, for THIS subject}                 |
| **Type**       | {1–2 clearly distinct families + roles + scale}   | {why this voice suits the subject}                |
| **Layout**     | {one-sentence concept + alignment: left/centered/justified} | {what the proportions are saying}        |
| **Principles** | {the ONE memorable element; what stays quiet around it} | {why this is what the user will remember}    |

**Generic test:** {what you REVISED because it read like the default for any comparable screen — or `axes pinned by {brief | design-system doc path}`}

> **Adoption shortcut:** where the project has a design system / `interface-system.md` / token files, this section reads `ADOPTED — {doc path}` plus any axis re-decided WITH its reason. Re-deciding a settled axis silently is the incoherence this section prevents.

## 1. Overview

{1-2 sentence summary of what this UI does}

## 1b. Information Priority & Container

| View | Primary task | Container (why) | Now — shown / asked here | Later — deferred to | Not here — owned by |
| ---- | ------------ | --------------- | ------------------------ | ------------------- | ------------------- |
| {view role} | {verb} | {full view / dialog / side panel / stepped flow / inline — why} | {items} | {step or view} | {view} |

**Inputs at creation vs deferred:** {the smallest set that makes a valid, useful record; everything else and where it is enriched later}
**Complexity budget:** {counts per view/step} vs `uiReview.complexityBudget` when the project declares one; otherwise the counts plus the reasoning for the primary user.

## 2. Component Inventory

| Component | Type     | Source           | Notes                       |
| --------- | -------- | ---------------- | --------------------------- |
| UserCard  | New      | Feature-specific | Displays user avatar + name |
| DataTable | Existing | shared library   | Reuse with custom columns   |

## 3. Layout

{Description or ASCII wireframe of layout structure}

- Desktop: {layout description}
- Tablet: {layout changes}
- Mobile: {layout changes}

## 4. Design Tokens

Every token traces to a §0 Design Plan decision. Names evoke this product's world, not a numeric ramp — a reader seeing only the token names should be able to guess what the product is (`DD-2`). Values come from the project's token files where they exist; a raw hex here that is not in §0's palette is a leak.

| Token         | Value                    | Usage                 |
| ------------- | ------------------------ | --------------------- |
| $signal       | #1976D2                  | Action buttons, links |
| $text-body    | 14px/1.5 {body family}   | Body text             |
| $gap-md       | 16px                     | Section spacing       |

## 5. States & Interactions

| Element  | Default    | Hover      | Active     | Disabled         | Error |
| -------- | ---------- | ---------- | ---------- | ---------------- | ----- |
| Save btn | Blue/white | Darken 10% | Scale 0.98 | Gray/50% opacity | --    |

## 6. Accessibility

- Keyboard navigation order
- ARIA labels for interactive elements
- Color contrast compliance notes

## 7. Open Questions

- {Any unresolved design decisions}
```

## Design-Principles Obligations (per spec section)

The spec is where the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`, the `SYNC:ui-ux-design-principles` block below) become INHERITABLE — a downstream implementer builds what the spec SAYS, so an unstated clause is an unbuilt clause. Every spec this skill emits MUST carry these obligations in the named Output Format sections. Project design-system docs OUTRANK the clauses; a genuine conflict is surfaced to the user with both sides, NEVER resolved silently.

| Spec section | Clause obligation the section MUST carry |
| --- | --- |
| **§0 Design Plan** | The identity layer the 40 clauses do not cover (`SYNC:design-distinctiveness-gate`): name the subject/audience/job (`DD-1`), give all four plan parts a WHY traced to that subject (`DD-2`), and record the **Generic test** result — what you revised, or which axes the brief/design system already pinned (`DD-3`). A downstream implementer who receives no design plan supplies their own defaults, so an unstated direction is a templated build. |
| **§1 Overview** | Name the ONE focal point of the screen (`UI-1.1`), and name the surface(s) in scope (web / mobile / both) so the mobile clauses (`UI-8.1`–`UI-8.4`) are either binding or explicitly skipped. |
| **§1b Information Priority & Container** | Seed from the governing spec's View Inventory priority/container record when one exists (`SYNC:ui-intent-layer`); never repartition it silently. Every view names its primary task and a container that fits it — a long or multi-section entry task is a full view or stepped flow, not a dialog (checklist `E9`). Every input is justified at THIS step or deferred (`UI-7.1`, checklist `§R1`–`R2`); creation asks only for the smallest valid record. Alternate entry modes are a first explicit choice, not stacked in one view (`B14`). A spec whose `now` set exceeds the task FAILS this gate. |
| **§3 Layout** | Group by proximity and shared alignment edges; add a border or container only where it encodes a real boundary (`UI-1.3`, `UI-1.4`); justify each breakpoint by where the CONTENT stops working, not by a device name (`UI-4.4`). |
| **§4 Design Tokens** | **DECLARE the type scale as 6 named steps with no one-off sizes** (`UI-2.5`): body 16px web / 17px mobile and NEVER below 14px (`UI-2.2`), measure 45–75 characters (`UI-2.3`), leading 1.5 body / 1.1–1.2 display (`UI-2.4`), max 2 families × 3 weights (`UI-2.1`). **DECLARE ONE spacing unit** — 4px or 8px base with every gap a multiple (`UI-4.1`), space owned by the container via a gap property (`UI-4.2`), inner padding tighter than the gap to the next group (`UI-4.3`). A token table of ad-hoc values instead of a declared scale FAILS this gate. |
| **§4 Design Tokens (colour)** | State the contrast TARGET AND THE MEASURED VALUE for every token pair — 4.5:1 text, 3:1 UI edges (`UI-3.1`) — measured, never eyeballed. One accent with one job (`UI-3.2`); dark mode specified as lifted surfaces + softened white text, NOT an inversion (`UI-3.4`). |
| **§5 States & Interactions** | **Author the empty, loading and error state FIRST — before the populated state (`UI-1.5`).** Enumerate ALL 5 interaction states per interactive element — default, hover, focus, active, disabled — plus loading where it applies (`UI-5.2`, consistent with the 7-state Component States Checklist below). Response under 100ms even when the result takes longer (`UI-5.1`); motion 150–250ms ease-out honouring reduced-motion (`UI-5.4`); undo preferred over confirmation, confirm ONLY the irreversible (`UI-5.3`). Forms: labels always visible, placeholders are hints NEVER labels (`UI-7.2`); validate on blur with the fix-it message beside the field (`UI-7.3`); NEVER lose entered data across errors, navigation or refresh (`UI-7.5`). |
| **§6 Accessibility** | The focus ring stays VISIBLE — restyled if it clashes, NEVER removed (`UI-5.5`); colour is never the sole carrier of meaning (`UI-3.3`); on any mobile/touch surface hit targets ≥44×44pt and 8px apart (`UI-8.1`), primary actions in the bottom third (`UI-8.2`), gestures never the only route (`UI-8.3`), safe areas and the on-screen keyboard respected (`UI-8.4`). |
| **§7 Open Questions** | Every clause deliberately deviated from, with the project doc or user decision that authorises it — an undocumented deviation is a spec defect, not a style choice. |

Keep every clause obligation written in observable UX language so it survives the M1-M5/M7 gate below — state the visible outcome, never a CSS property or framework prop.

**Skip ONLY** when the feature has no user-facing surface — state that explicitly so the skip is auditable, not an omission.

## M1-M5/M7 Compliance for UI Specs

> **AI-SDD artifact contract** — M1-M7 require tech-agnostic, traceable, observable, rebuildable specs; logical IDs lead prose, implementation identifiers stay in evidence carriers, and business-tree cases must be demoable.
>
> **MUST ATTENTION READ** `.claude/skills/shared/sdd-artifact-contract.md` for the full "AI-SDD Mandates (M1-M7)" gate.

A UI spec MUST satisfy these criteria before handoff:

- **M1 — Business-level component names.** Name every component by its UX role — Primary Button, Secondary Button, Modal Dialog, Data Table, Dropdown, Toast — NEVER by a framework component class name or library import. FAIL on tech-term prose.
- **M2 — No code-prop refs in prose.** Describe behavior and appearance in plain UX language. NEVER reference component-state props, CSS class names, framework directives, or selectors in prose. Those belong only in `**Evidence**`/`[Source:]` carriers, frontmatter, and Mermaid.
- **M3 — Cross-reference by logical ID.** For every behavior driven by feature logic, cite the driving operation or rule by its logical ID (`OP-`/`BR-`/`FR-`) — link UI behavior back to the feature spec, not to handler code. Keep any `[Source: namespace/service/id]` abstract anchor strictly in the Evidence carrier — never physical code coordinates or repository-root paths.
- **M4 — Testable, unambiguous behavior.** Every state and interaction MUST have exactly one valid interpretation and an observable completion marker. Replace vague phrases ("handle appropriately", "show feedback") with the concrete observable result.
- **M5 — Rebuild-from-spec.** A reader with zero codebase knowledge MUST be able to rebuild this UI on ANY framework from the spec alone. If a marker is only resolvable by reading source, it fails M5 — restate it as a visual/textual observable.
- **M7 — Business-visibility.** A UI spec is a business-tree artifact, so apply the demo test to each case's BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count. Judge the BODY, never the title or ID. ⚠️ **A UI state a user can SEE is business and PASSES M7** — a spinner, an empty placeholder, an error border, a disabled control are all demoable outcomes, not technical cases. Only invocation-shaped or schema-asserting cases fail.

> **M1 vs M7 — they are not the same gate.** M1 governs **vocabulary**; M7 governs **subject matter**. A technical case in impeccably tech-free prose satisfies M1 while violating M7 — *"the view correctly reflects the synchronized record"* names no framework, passes M1, and is still a technical case wearing a business costume. That gap is the most common way business specs rot. Ask what a user could SEE, not which words were used.

### Observable State Definitions

Define every state by what a user can SEE (color, icon, position, text), the business meaning, and the operation/rule that triggers it — NEVER by CSS class or component-state prop:

| State    | Visual Markers (observable)                              | Business Meaning                          | Triggering Operation / Rule (logical ID) |
| -------- | -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Default  | Primary fill color, enabled label, no spinner            | Action available to the actor             | OP-XX (entry state)                      |
| Loading  | Spinner icon replaces label, control non-interactive     | Operation in progress, awaiting result    | OP-XX (request submitted)                |
| Disabled | Muted/gray fill, label dimmed, no pointer affordance      | Precondition not met / actor not permitted | BR-XX (authorization or guard rule)      |
| Error    | Error-color border, inline message text, alert icon       | Operation rejected or validation failed   | BR-XX (validation rule)                  |
| Empty    | Placeholder illustration + guidance text, no data rows    | No records exist for the current view     | OP-XX (query returned zero results)      |
| Success  | Confirmation toast/checkmark, updated visible data        | Operation completed and persisted         | OP-XX (operation succeeded)              |

## Component States Checklist

Every interactive component MUST document all 7 states by their **observable appearance and business meaning** — never by CSS class or framework prop (see M2):

- **Default** — resting appearance; action available to the actor
- **Hover** — pointer-over affordance change (cursor / elevation / color shift)
- **Active** — pressed/engaged feedback during interaction
- **Focus** — keyboard-focus indicator (visible ring/outline) for a11y traversal
- **Disabled** — muted/non-interactive; precondition or permission not met
- **Error** — validation/operation failure with inline message + alert affordance
- **Loading** — in-progress indicator (spinner / skeleton); control non-interactive

## Accessibility Audit (WCAG 2.1 AA)

For an accessibility-audit deliverable, produce this checklist report and save it as `{YYMMDD}-ux-audit-{feature-slug}.md`:

```markdown
## Accessibility Audit: {Feature}

**Date:** {Date}
**Auditor:** {Name}
**Standard:** WCAG 2.1 AA

### Criteria Checklist

#### Perceivable

- [ ] 1.1.1 Non-text Content: Alt text for images
- [ ] 1.3.1 Info and Relationships: Semantic HTML
- [ ] 1.3.2 Meaningful Sequence: Logical reading order
- [ ] 1.4.1 Use of Color: Not sole means of conveying info
- [ ] 1.4.3 Contrast (Minimum): 4.5:1 text, 3:1 large text
- [ ] 1.4.4 Resize Text: Readable at 200% zoom
- [ ] 1.4.11 Non-text Contrast: 3:1 for UI components

#### Operable

- [ ] 2.1.1 Keyboard: All functions keyboard accessible
- [ ] 2.1.2 No Keyboard Trap: Can navigate away
- [ ] 2.4.1 Bypass Blocks: Skip navigation available
- [ ] 2.4.3 Focus Order: Logical tab sequence
- [ ] 2.4.4 Link Purpose: Clear from link text
- [ ] 2.4.6 Headings and Labels: Descriptive
- [ ] 2.4.7 Focus Visible: Clear focus indicator

#### Understandable

- [ ] 3.1.1 Language of Page: lang attribute set
- [ ] 3.2.1 On Focus: No unexpected context change
- [ ] 3.2.2 On Input: No unexpected context change
- [ ] 3.3.1 Error Identification: Clear error messages
- [ ] 3.3.2 Labels or Instructions: Form labels present

#### Robust

- [ ] 4.1.1 Parsing: Valid HTML
- [ ] 4.1.2 Name, Role, Value: ARIA where needed

### Issues Found

| #   | Criterion | Issue | Severity | Recommendation |
| --- | --------- | ----- | -------- | -------------- |
| 1   |           |       | P1/P2/P3 |                |

### Audit Status: PASS / FAIL / CONDITIONAL

**Remediation Priority:**
{List items by severity}
```

## Examples

### Example 1: Simple form spec

**Input:** "Design spec for customer onboarding form"

**Output:** Quick Spec with sections 1-4 covering form fields (name, email, company name, plan-tier dropdown), validation rules, submit/cancel actions, and mobile stacking behavior.

### Example 2: Complex dashboard spec

**Input:** "Design spec for order pipeline dashboard with drag-and-drop columns"

**Output:** Full Spec covering Kanban board layout, order cards (component inventory), drag-and-drop interactions, column states (empty, populated, over-limit), filter bar, responsive collapse to list view on mobile, and accessibility for keyboard drag operations.

## Related Skills

| Skill                   | When to use instead                  |
| ----------------------- | ------------------------------------ |
| `design --lane=marketing` | Build marketing/creative UI             |
| `design --lane=product`   | Build product UI (dashboards, apps)     |
| `web-design-guidelines`   | Review existing UI for compliance       |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Run the design sequence** (Recommended) — `/design-spec` → `/design --lane=product` (product UIs) or `/design --lane=marketing` (marketing/creative) → `/workflow-review-changes`
> 2. **Execute `/design-spec` directly** — run this skill standalone

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `existing-ui-research` — Study the existing UI before designing or specifying a screen; designing or specifying a new or updated screen → .claude/skills/shared/protocols/existing-ui-research.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `ui-wireframe-protocol` — Wireframe protocol: inputs, representation and component inventory; writing the wireframe of a design spec → .claude/skills/shared/protocols/ui-wireframe-protocol.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:ui-system-context:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:ui-wireframe-protocol:reminder -->

**IMPORTANT MUST ATTENTION** follow wireframe protocol: ASCII wireframe, component inventory with tiers, states table, design tokens, responsive breakpoints.

<!-- /SYNC:ui-wireframe-protocol:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a complete, tech-agnostic UI/UX design spec that lets a developer rebuild the source outcome on ANY stack, preserving every required view, navigation path, component, state, token, responsive rule, accessibility need, demo journey, and governing-spec link.

**IMPORTANT MUST ATTENTION main steps, modes, and gates:**

- **Step 0–0b first** — inventory existing UI + connected flows in §1; seed governing Feature Spec §6 and reuse its view/state vocabulary verbatim, or state no governing spec — why: divergence breaks the navigable hub.
- **Step 1–2** — route design link (e.g. a Figma URL)→ask the user to export the frames as images then visual analysis, image→visual analysis, wireframe/sketch→`--mode=wireframe`, PBI/text→requirements; for wireframes, emit PBI-section or standalone format, show confidence, recommend human review, and ask clarification below 70%; choose Quick (§1–4), Full (§1–7), or Full + Flow Diagram for multi-page.
- **Step 3–6** — inventory new/existing components; define interactions and all 7 states; extract tokens; document content-driven responsive/accessibility behavior.
- **Releasable full flow** — preserve every required page/view, navigation edge, Common/Domain-Shared/Page component, state, and end-to-end demo journey; never collapse a multi-page outcome into one screen.
- **Step 7–8** — save the correct design-spec/audit/component variant under `design-specs/` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides); update governing Feature Spec `design_spec:`/`mockup:` frontmatter only; satisfy M1–M5/M7 and logical-ID traceability.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** read frontend-patterns, scss-styling, design-system before any UI change.
- **UI Wireframe:** ASCII wireframe, tiered component inventory, states table, tokens, responsive breakpoints.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** carry the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) into the spec sections so implementers INHERIT them: §5 authors empty/loading/error FIRST (`UI-1.5`) and enumerates all 5 interaction states per interactive element (`UI-5.2`); §4 DECLARES the 6-step type scale (`UI-2.5`) and the ONE 4/8px spacing unit (`UI-4.1`) instead of one-off values, with contrast targets measured and stated (4.5:1 text / 3:1 edges, `UI-3.1`); §6 keeps the focus ring visible (`UI-5.5`), colour never alone (`UI-3.3`), and ≥44×44pt targets + bottom-third primaries on touch surfaces (`UI-8.1`, `UI-8.2`); §7 records every deliberate deviation — why: an unstated clause is an unbuilt clause once the spec leaves this skill

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| "I'll skip the existing-UI inventory and design" | Step 0 is BLOCKING — inventory existing screens/flows first or the spec contradicts the live UI.     |
| "Naming the framework component is clearer"       | M1/M2 FAIL — name by UX role; framework/CSS names live only in Evidence/frontmatter/Mermaid.         |
| "The spec already names views — I'll re-partition"| Reuse §6 view + state vocabulary verbatim; renaming breaks the navigable spec↔design hub.            |
| "Saved the file — done"                           | Step 8 link-back is required; set the spec's `design_spec:` frontmatter or `artifact-review` fails.   |
| "'Show feedback' describes the error state"       | M4 FAIL — every state needs one observable completion marker, not a vague phrase.                     |

**[TASK-PLANNING]** Before acting, use `TaskCreate` to break the work into small tasks, including each file read; update statuses per step and add a final review task. For simple tasks, ask whether the user wants to skip workflow depth, never task tracking.

**IMPORTANT MUST ATTENTION** create tracked tasks before execution; route input and choose Quick/Full/Flow Diagram before authoring; preserve wireframe confidence/review and M1–M5/M7 gates.
**IMPORTANT MUST ATTENTION** save the correct artifact variant, link back through Feature Spec frontmatter only, and verify complete releasable full-flow coverage.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim, preserve all 7 states/tokens/responsive/accessibility rules, and complete the final review task.
