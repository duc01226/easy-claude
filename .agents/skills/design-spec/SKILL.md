---
name: design-spec
description: '[Project Management] Use when creating UI/UX design specs from requirements, PBIs, or stories. Flag: --mode=wireframe converts sketches into structured specs.'
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
- **Step 1–2 — route + size:** design link (e.g. a Figma URL)→ask the user to export the frames as images (ask the user directly), then visual analysis; image→visual analysis; wireframe/sketch→`--mode=wireframe` plus confidence/human review; PBI/text→requirements; choose Quick (§1–4) or Full (§1–7, plus Flow Diagram for multi-page).
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
    | Design-tool link         | A design-tool URL (e.g. `figma.com`) in text   | Ask the user by asking the user directly to export the frames as images, then continue on the image path |
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

8. **Link back to the governing Feature Spec (when one exists).** After saving the artifact, keep the spec the navigable hub: open the governing Feature Spec under the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) and set its frontmatter `design_spec:` key to this design-spec's saved path (add the key if absent, update it if stale). If a mockup was also produced (e.g. via `$pbi-mockup`), set the `mockup:` key the same way. Edit **frontmatter only** — never touch the §1–§8 spec body. This satisfies the `artifact-review --type=design` link-back gate, which fails when a design-spec exists but its path is not recorded in the spec's `design_spec:` frontmatter. Skip ONLY when no governing Feature Spec exists (the design-spec is standalone) — state that.

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
| App screenshot          | Polished UI with real data              | Route to `$design --mode=screenshot` instead |

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

- **Format A: PBI Section (default)** — output a standalone `## UI Layout` section compatible with PBI/story templates (consumed by `$pbi-mockup`).
- **Format B: Standalone Spec** — output to `design-specs/{YYMMDD}-wireframe-spec-{slug}.md` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

### Confidence & Review (wireframe)

- **Always display confidence level** for wireframe interpretation (analysis is 70-80% accurate).
- **Always recommend human review** before proceeding to implementation.
- If confidence <70%: ask clarifying questions about ambiguous elements by asking the user directly.

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

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use ask the user directly to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Run the design sequence** (Recommended) — `$design-spec` → `$design --lane=product` (product UIs) or `$design --lane=marketing` (marketing/creative) → `$workflow-review-changes`
> 2. **Execute `$design-spec` directly** — run this skill standalone

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:existing-ui-research -->

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult configured design-system docs + the real component inventory).
>    Use the project's documented component tiers and base abstractions when present; otherwise record the actual component roles and owners without inventing a tier model.
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer composing an existing component when its contract fits; justify any new component or variant against the inventory and record the constraint that prevents reuse.
>    Avoid duplicated behavior where a suitable project abstraction exists; do not create a base, tier, selector convention, or shared component solely to match this checklist.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

<!-- /SYNC:existing-ui-research -->

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

<!-- SYNC:ui-system-context -->

> **UI System Context** — Apply only when the changed artifact is part of a user-interface surface; a `.ts`, `.html`, `.scss`, or `.css` extension alone does not establish that.
>
> 1. Resolve applicable UI paths and conventions from `docs/project-config.json`, its configured project-reference docs, accepted decisions, and existing code. Read only references relevant to this surface (frontend patterns, styling, component system, design system, accessibility, or platform guide).
> 2. Respect an explicit N/A or absent UI surface. Do not require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers unless this project documents or demonstrates them.
> 3. Follow the configured/observed styling and component conventions. Use `componentSystem.layerClassification` when configured; otherwise describe the actual component owners without inventing Common/Domain-Shared/Page tiers.
> 4. Reuse or compose an existing abstraction when its contract and platform fit. When none fits, use the project's idiomatic local pattern; do not add a shared base or wrapper just to satisfy this checklist.
>
> Project config may customize these conventions through `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and the configured reference docs.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile examples)** — a reference catalog, not a universal platform contract. Apply it only to an applicable user-facing interface. Resolve the target platform, input modes, accessibility standard, and relevant design conventions from the brief, project config/reference docs, accepted decisions, and existing UI. For web, use WCAG 2.2 AA as the baseline and meet any stricter applicable legal or project requirement; for non-web surfaces, use the documented platform accessibility standard. Record the selected standard and source.
>
> Numeric values and patterns below are examples or heuristics for matching surfaces, not required thresholds. Use a value as a fail-condition only when an applicable law, platform standard, project contract, or accepted design decision establishes it. For desktop, game, embedded, command-line, or other interfaces, use their documented platform conventions and accessibility requirements; do not report a mismatch with a web/mobile example as a defect. Skip clauses whose underlying capability is absent and record N/A when needed. Cite applicable clauses by ID (for example `UI-3.1` or `UI-8.2`).
>
> **Precedence:** accepted product/design decisions → project config and design-system / styling / frontend / platform references → applicable clauses below → general heuristics. A genuine conflict between authoritative project sources is SURFACED with both sides — NEVER resolved silently. An absent project convention is not permission to invent one.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per view — or per region on a deliberately multi-panel expert surface. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity first. Add a border or container only when it encodes a real boundary; boxes inside boxes rarely do.
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
> - `UI-7.1` Ask for less. Every field needs a reason to exist at THIS step — defer, derive, or default what the task does not need now (Field Necessity Matrix: `.claude/docs/design-review-checklist.md` §R).
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

<!-- SYNC:ui-wireframe-protocol -->

> **UI Wireframe Protocol** — (1) Inspect supplied design inputs using available tooling; record inaccessible sources. (2) Choose a representation that fits the work: sketch, text layout, diagram, prototype, or ASCII. (3) Inventory components using the project's documented ownership taxonomy, or describe actual owners and boundaries when none exists. (4) Capture the user states relevant to the requirements and platform. (5) Apply configured design tokens, layout rules, and supported sizes where present; otherwise record the decisions the work needs. Search for existing components and explain reuse or deviation based on fit. Progressive detail by skill level (idea=sketch, story=full decomposition).

<!-- /SYNC:ui-wireframe-protocol -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q` plus §R, ~155 checks with failure signals and default severities; worked calibration cases in `.claude/docs/design-review-calibration.md`): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Translate to other dialects (BLOCKED/WARN, Critical–Low, BLOCKING/ADVISORY) ONLY through the §0.3 severity map. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order — over whole SURFACES, not files (§0.5).** Map changed files to the pages/views/dialogs they render into, reconstruct each surface's composition (component tree + style origins; render when it can run, else `ENVIRONMENT-BLOCKED`), then sweep: §A core usability heuristics · §B cognitive load & surface complexity (B12–B15: surface load, progressive disclosure, one job per view, the project's complexity budget) · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture & container fit (E9–E11: dialog vs full view vs stepped flow vs side panel vs inline) · **§F web / §G mobile — conditional on platform; §H expert & data-heavy use — conditional on usage, not platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · **§R forms & data entry — conditional on input: fill the Field Necessity Matrix first** · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support. Cluster a defect repeated across surfaces into ONE finding; calibrate against `.claude/docs/design-review-calibration.md`.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Each UI phase MUST name, per new or reshaped view: its primary task, its container (E9), its information priority (what is shown now / later / never here), and — for input — the inputs required at creation vs deferred (§R1–R2). A plan review treats a UI phase missing these as a finding against the checklist IDs it leaves unbound. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
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

**[TASK-PLANNING]** Before acting, use task tracking to break the work into small tasks, including each file read; update statuses per step and add a final review task. For simple tasks, ask whether the user wants to skip workflow depth, never task tracking.

**IMPORTANT MUST ATTENTION** create tracked tasks before execution; route input and choose Quick/Full/Flow Diagram before authoring; preserve wireframe confidence/review and M1–M5/M7 gates.
**IMPORTANT MUST ATTENTION** save the correct artifact variant, link back through Feature Spec frontmatter only, and verify complete releasable full-flow coverage.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim, preserve all 7 states/tokens/responsive/accessibility rules, and complete the final review task.

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
