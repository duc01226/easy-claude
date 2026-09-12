---
name: excalidraw-diagram
description: '[Utilities] Use when visualizing workflows, architectures, or concepts as Excalidraw diagram JSON.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce `.excalidraw` JSON that visually ARGUES workflows, architectures, or concepts — so structure carries meaning, technical diagrams teach with evidence artifacts, and rendered output matches the design after mandatory render-view-fix validation.

**Summary:**

- **0 Assess depth:** choose simple/conceptual vs comprehensive/technical; technical diagrams research real specs and show evidence at summary, section, and detail zooms.
- **1 Understand deeply → 2 Map concepts to patterns → 3 Ensure variety → 4 Sketch flow:** understand what each concept does, map each to a distinct pattern, ensure variety, then trace eye flow; default text free-floating (<30% boxed).
- **5 Generate JSON:** build comprehensive diagrams section-by-section with descriptive IDs, namespaced seeds, updated cross-section bindings; use only `references/color-palette.md` colors.
- **6 Render & Validate:** render PNG, Read it, compare vision and defects, fix, and re-render until balanced/readable (usually 2–4 iterations).

**Workflow:**

1. **Assess depth** — simple/conceptual (abstract shapes) vs comprehensive/technical; if technical, research real specs (event names, JSON formats, APIs) FIRST.
2. **Understand deeply** — per concept ask what it DOES and what a viewer must SEE, not just read about.
3. **Map concepts to patterns** — pick the visual pattern that mirrors each behavior (fan-out, convergence, tree, timeline, cycle, assembly line).
4. **Ensure variety + sketch flow** — each major concept a DIFFERENT pattern (no card grids); mentally trace the eye's path before any JSON.
5. **Generate JSON** — section-by-section for comprehensive diagrams (32k limit), free-floating text default (<30% boxed), colors only from `references/color-palette.md`.
6. **Render & Validate (MANDATORY)** — render PNG via `render_excalidraw.py` → Read image → audit vision + defects → fix → re-render (2-4 iterations) until it matches the design.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION read `references/color-palette.md` before generating any diagram; use palette colors only.
- MUST ATTENTION render, Read, audit, fix, and re-render generated JSON until vision and defect checks pass.
- NEVER skip mandatory workflow or skill gates.

## Customization

**All colors and brand-specific styles live in one file:** `references/color-palette.md`. Read it before generating any diagram; use it as single source of truth for all color choices — shape fills, strokes, text colors, evidence artifact backgrounds, everything.
To produce diagrams in your own brand style, edit `color-palette.md`. Everything else in this file is universal design methodology and Excalidraw best practices.

---

## Core Philosophy

**Diagrams should ARGUE, not DISPLAY.**
A diagram isn't formatted text; it's a visual argument showing relationships, causality, and flow that words alone can't express. Make the shape carry the meaning.

**The Isomorphism Test:** Remove all text. If structure alone doesn't communicate the concept, redesign.
**The Education Test:** Can someone learn something concrete, or does the diagram only label boxes? Good diagrams teach actual formats, real event names, and concrete examples.

---

## Depth Assessment (Do This First)

Determine required detail before designing:

### Simple/Conceptual Diagrams

Use abstract shapes when:

- Explaining a mental model or philosophy
- The audience doesn't need technical specifics
- The concept IS the abstraction (e.g., "separation of concerns")

### Comprehensive/Technical Diagrams

Use concrete examples when:

- Diagramming a real system, protocol, or architecture
- The diagram will be used to teach or explain (e.g., YouTube video)
- The audience needs to understand what things actually look like
- You're showing how multiple technologies integrate

**For technical diagrams, you MUST ATTENTION include evidence artifacts** (see below).

---

## Research Mandate (For Technical Diagrams)

**Before drawing technical content, research actual specifications.**
For a protocol, API, or framework:

1. Look up the actual JSON/data formats
2. Find real event names, method names, or API endpoints
3. Understand how pieces connect
4. Use real terminology, not generic placeholders

Bad: "Protocol" → "Frontend"
Good: "AG-UI streams events (RUN_STARTED, STATE_DELTA, A2UI_UPDATE)" → "CopilotKit renders via createA2UIMessageRenderer()"

**Research makes diagrams accurate and educational.**

---

## Evidence Artifacts

Evidence artifacts are concrete examples that prove accuracy and teach viewers. Include them in technical diagrams.
**Evidence artifact types** (choose what's relevant):

| Artifact Type            | When to Use                                | How to Render                                                                         |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Code snippets**        | APIs, integrations, implementation details | Dark rectangle + syntax-colored text (see color palette for evidence artifact colors) |
| **Data/JSON examples**   | Data formats, schemas, payloads            | Dark rectangle + colored text (see color palette)                                     |
| **Event/step sequences** | Protocols, workflows, lifecycles           | Timeline pattern (line + dots + labels)                                               |
| **UI mockups**           | Showing actual output/results              | Nested rectangles mimicking real UI                                                   |
| **Real input content**   | Showing what goes IN to a system           | Rectangle with sample content visible                                                 |
| **API/method names**     | Real function calls, endpoints             | Use actual names from docs, not placeholders                                          |

For a streaming-protocol diagram, show:
- Actual event names from the spec, not just "Event 1", "Event 2"
- A code snippet showing connection
- Actual streamed data shape

For a data-transformation pipeline, show:
- Sample input data in its actual format, not "Input"
- Sample output data in its actual format, not "Output"
- Intermediate states when relevant

Key principle: **show what things actually look like**, not just what they're called.

---

## Multi-Zoom Architecture

Comprehensive diagrams operate at three zoom levels: map-like borders plus street-level detail.

### Level 1: Summary Flow

Simplified overview of the full pipeline or process at a glance; often top or bottom. _Example_: `Input → Processing → Output` or `Client → Server → Database`

### Level 2: Section Boundaries

Labeled regions group related components into visual "rooms". _Example_: Group by responsibility (Backend / Frontend), phase (Setup / Execution / Cleanup), or team (User / System / External).

### Level 3: Detail Inside Sections

Evidence artifacts, code snippets, and concrete examples inside each section; this is the educational layer. _Example_: Inside a "Backend" section, show the actual API response format, not only a box labeled "API Response".

**For comprehensive diagrams, include all three levels:** summary gives context, sections organize, details teach.

### Bad vs Good

| Bad (Displaying)              | Good (Arguing)                                     |
| ----------------------------- | -------------------------------------------------- |
| 5 equal boxes with labels     | Each concept has a shape that mirrors its behavior |
| Card grid layout              | Visual structure matches conceptual structure      |
| Icons decorating text         | Shapes that ARE the meaning                        |
| Same container for everything | Distinct visual vocabulary per concept             |
| Everything in a box           | Free-floating text with selective containers       |

### Simple vs Comprehensive (Know Which You Need)

| Simple Diagram                                 | Comprehensive Diagram                                     |
| ---------------------------------------------- | --------------------------------------------------------- |
| Generic labels: "Input" → "Process" → "Output" | Specific: shows what the input/output actually looks like |
| Named boxes: "API", "Database", "Client"       | Named boxes + examples of actual requests/responses       |
| "Events" or "Messages" label                   | Timeline with real event/message names from the spec      |
| "UI" or "Dashboard" rectangle                  | Mockup showing actual UI elements and content             |
| ~30 seconds to explain                         | ~2-3 minutes of teaching content                          |
| Viewer learns the structure                    | Viewer learns the structure AND the details               |

**Simple diagrams** are fine for abstract concepts, quick overviews, or when the audience already knows the details. **Comprehensive diagrams** are needed for technical architectures, tutorials, educational content, or when you want the diagram itself to teach.

---

## Container vs. Free-Floating Text

**Not every text element needs a shape.** Default to free-floating text; add containers only when they serve a purpose.

| Use a Container When...                                   | Use Free-Floating Text When...                |
| --------------------------------------------------------- | --------------------------------------------- |
| It's the focal point of a section                         | It's a label or description                   |
| It needs visual grouping with other elements              | It's supporting detail or metadata            |
| Arrows need to connect to it                              | It describes something nearby                 |
| The shape itself carries meaning (decision diamond, etc.) | Typography alone creates sufficient hierarchy |
| It represents a distinct "thing" in the system            | It's a section title, subtitle, or annotation |

**Typography as hierarchy:** Use font size, weight, and color without boxes. A 28px title needs no rectangle.

**Container test:** For each boxed element, ask "Would this work as free-floating text?" If yes, remove the container.

---

## Design Process (Do This BEFORE Generating JSON)

### Step 0: Assess Depth Required

Before anything else, determine if this needs to be:

- **Simple/Conceptual**: Abstract shapes, labels, relationships (mental models, philosophies)
- **Comprehensive/Technical**: Concrete examples, code snippets, real data (systems, architectures, tutorials)

**If comprehensive**: Do research first. Look up actual specs, formats, event names, APIs.

### Step 1: Understand Deeply

Read the content. For each concept, ask:

- What does this concept **DO**? (not what IS it)
- What relationships exist between concepts?
- What's the core transformation or flow?
- **What would someone need to SEE to understand this?** (not just read about)

### Step 2: Map Concepts to Patterns

For each concept, find the visual pattern that mirrors its behavior:

| If the concept...               | Use this pattern                                   |
| ------------------------------- | -------------------------------------------------- |
| Spawns multiple outputs         | **Fan-out** (radial arrows from center)            |
| Combines inputs into one        | **Convergence** (funnel, arrows merging)           |
| Has hierarchy/nesting           | **Tree** (lines + free-floating text)              |
| Is a sequence of steps          | **Timeline** (line + dots + free-floating labels)  |
| Loops or improves continuously  | **Spiral/Cycle** (arrow returning to start)        |
| Is an abstract state or context | **Cloud** (overlapping ellipses)                   |
| Transforms input to output      | **Assembly line** (before → process → after)       |
| Compares two things             | **Side-by-side** (parallel with contrast)          |
| Separates into phases           | **Gap/Break** (visual separation between sections) |

### Step 3: Ensure Variety

For multi-concept diagrams: **each major concept must use a different visual pattern**. No uniform cards or grids.

### Step 4: Sketch the Flow

Before JSON, trace the eye's movement. Ensure a clear visual story.

### Step 5: Generate JSON

Then create Excalidraw elements. **See below for large diagrams.**

### Step 6: Render & Validate (MANDATORY)

After generating JSON, you MUST ATTENTION run the render-view-fix loop until the diagram looks right. This is mandatory; see **Render & Validate** below.

---

## Large / Comprehensive Diagram Strategy

**For comprehensive or technical diagrams, you MUST ATTENTION build JSON one section at a time.** Do NOT generate the entire file in one pass. Claude Code has a ~32,000-token response limit; comprehensive diagrams can exceed it, and one-pass generation lowers quality. Section-by-section is required.

### The Section-by-Section Workflow

**Phase 1: Build each section**

1. **Create the base file** with JSON wrapper (`type`, `version`, `appState`, `files`) and first section elements.
2. **Add one section per edit.** Give each section a dedicated pass; review layout, spacing, and connections to existing sections.
3. **Use descriptive string IDs** (e.g., `"trigger_rect"`, `"arrow_fan_left"`) so cross-section references are readable.
4. **Namespace seeds by section** (e.g., section 1 uses 100xxx, section 2 uses 200xxx) to avoid collisions.
5. **Update cross-section bindings** as you go. When a new element binds to a previous element (e.g., an arrow connecting sections), update the earlier element's `boundElements` array at the same time.

**Phase 2: Review the whole**

After all sections are in place, read complete JSON and check:

- Are cross-section arrows bound correctly on both ends?
- Is the overall spacing balanced, or are some sections cramped while others have too much whitespace?
- Do IDs and bindings all reference elements that actually exist?

Fix alignment or binding issues before rendering.

**Phase 3: Render & validate**

Run the Render & Validate loop. It catches issues not obvious from JSON: overlaps, clipping, imbalanced composition.

### Section Boundaries

Plan sections around natural visual groupings. A typical large diagram might split into:

- **Section 1**: Entry point / trigger
- **Section 2**: First decision or routing
- **Section 3**: Main content (hero section — may be the largest single section)
- **Section 4-N**: Remaining phases, outputs, etc.

Each section must be independently understandable: elements, internal arrows, and cross-references to adjacent sections.

### What NOT to Do

- **Don't generate the entire diagram in one response.** The output token limit can produce truncated, broken JSON; section splits also improve quality.
- **Don't use a coding agent** to generate JSON. It lacks sufficient context for this skill's rules, and coordination overhead negates the benefit.
- **Don't write a Python generator script.** Templating and coordinate math add indirection that complicates debugging; hand-crafted JSON with descriptive IDs is more maintainable.

---

## Visual Pattern Library

### Fan-Out (One-to-Many)

Central element with arrows radiating to targets. Use for sources, PRDs, root causes, and hubs.

```
        ○
       ↗
  □ → ○
       ↘
        ○
```

### Convergence (Many-to-One)

Multiple inputs merge through arrows to one output. Use for aggregation, funnels, and synthesis.

```
  ○ ↘
  ○ → □
  ○ ↗
```

### Tree (Hierarchy)

Parent-child branching with connecting lines and free-floating text; no boxes needed. Use for file systems, org charts, and taxonomies.

```
  label
  ├── label
  │   ├── label
  │   └── label
  └── label
```

Use `line` elements for trunk/branches and free-floating text labels.

### Spiral/Cycle (Continuous Loop)

Sequence with an arrow returning to start. Use for feedback loops, iteration, and evolution.

```
  □ → □
  ↑     ↓
  □ ← □
```

### Cloud (Abstract State)

Overlapping ellipses of varied sizes. Use for context, memory, conversations, and mental states.

### Assembly Line (Transformation)

Input → Process Box → Output with clear before/after. Use for transformations, processing, and conversion.

```
  ○○○ → [PROCESS] → □□□
  chaos              order
```

### Side-by-Side (Comparison)

Two parallel structures with visual contrast. Use for before/after, options, and trade-offs.

### Gap/Break (Separation)

Whitespace or barrier between sections. Use for phase changes, context resets, and boundaries.

### Lines as Structure

Use lines (type: `line`, not arrows) as primary structure instead of boxes:

- **Timelines**: Vertical or horizontal line with small dots (10-20px ellipses) at intervals; free-floating labels beside dots
- **Tree structures**: Vertical trunk + horizontal branches with free-floating labels; no boxes needed
- **Dividers**: Thin dashed lines separating sections
- **Flow spines**: Central line that elements relate to, rather than box-to-box connections

```
Timeline:           Tree:
  ●─── Label 1        │
  │                   ├── item
  ●─── Label 2        │   ├── sub
  │                   │   └── sub
  ●─── Label 3        └── item
```

Lines + free-floating text often create cleaner results than boxes + contained text.

---

## Shape Meaning

Choose shape based on what it represents—or use no shape at all:

| Concept Type                  | Shape                         | Why                          |
| ----------------------------- | ----------------------------- | ---------------------------- |
| Labels, descriptions, details | **none** (free-floating text) | Typography creates hierarchy |
| Section titles, annotations   | **none** (free-floating text) | Font size/weight is enough   |
| Markers on a timeline         | small `ellipse` (10-20px)     | Visual anchor, not container |
| Start, trigger, input         | `ellipse`                     | Soft, origin-like            |
| End, output, result           | `ellipse`                     | Completion, destination      |
| Decision, condition           | `diamond`                     | Classic decision symbol      |
| Process, action, step         | `rectangle`                   | Contained action             |
| Abstract state, context       | overlapping `ellipse`         | Fuzzy, cloud-like            |
| Hierarchy node                | lines + text (no boxes)       | Structure through lines      |

**Rule**: Default to no container. Add shapes only when they carry meaning. Aim for <30% of text elements to be inside containers.

---

## Color as Meaning

Colors encode information, not decoration. Pull every choice from `references/color-palette.md`, which defines semantic shape, text-hierarchy, and evidence-artifact colors.

**Key principles:**

- Each semantic purpose (start, end, decision, AI, error, etc.) has a specific fill/stroke pair
- Free-floating text uses color for hierarchy (titles, subtitles, details at different levels)
- Evidence artifacts (code snippets, JSON examples) use a dark background + colored text scheme
- Pair a darker stroke with a lighter fill for contrast

**Do not invent new colors.** If a concept doesn't fit an existing semantic category, use Primary/Neutral or Secondary.

---

## Modern Aesthetics

For clean, professional diagrams:

### Roughness

- `roughness: 0` — Clean, crisp edges. Use for modern/technical diagrams.
- `roughness: 1` — Hand-drawn, organic feel. Use for brainstorming/informal diagrams.

**Default to 0** for most professional use cases.

### Stroke Width

- `strokeWidth: 1` — Thin, elegant. Good for lines, dividers, subtle connections.
- `strokeWidth: 2` — Standard. Good for shapes and primary arrows.
- `strokeWidth: 3` — Bold. Use sparingly for emphasis (main flow line, key connections).

### Opacity

**Always use `opacity: 100` for all elements.** Use color, size, and stroke width to create hierarchy instead of transparency.

### Small Markers Instead of Shapes

Use small dots (10-20px ellipses) instead of full shapes for:

- Timeline markers
- Bullet points
- Connection nodes
- Visual anchors for free-floating text

---

## Layout Principles

### Hierarchy Through Scale

- **Hero**: 300×150 - visual anchor, most important
- **Primary**: 180×90
- **Secondary**: 120×60
- **Small**: 60×40

### Whitespace = Importance

Give the most important element the most empty space (200px+).

### Flow Direction

Guide the eye left→right or top→bottom for sequences, radial for hub-and-spoke.

### Connections Required

Position alone doesn't show relationships; if A relates to B, add an arrow.

---

## Arrow Routing (Preventing Overlap)

**Straight arrows are the default, but dense diagrams create overlaps.** When arrows cross elements, use curved or elbowed routing to clear obstacles—especially in ERDs, architecture diagrams, and connection-heavy layouts.

### Strategy Selection

1. **Straight** — Only for direct neighbors with a clear path. Use 2 points: `[[0,0], [dx, dy]]`.

2. **Curved** (primary overlap fix) — Use when a straight arrow crosses elements. Add `"roundness": {"type": 2}` and a 3-point arc: `[[0,0], [midX, -arcHeight], [endX, endY]]`. Midpoint Y offset creates a smooth obstacle-clearing parabola: 15-30px for short arrows, 30-50px for long ones. Negative Y = above; positive Y = below.

3. **Elbowed** — Use when curved isn't enough (same-row entities with many obstacles). Set `"elbowed": true` with a 4-point right-angle path: `[[0,0], [0, -offset], [targetX, -offset], [targetX, 0]]`. Add `"fixedSegments"` to pin the horizontal segment.

### Binding Modes

Use modern binding with `mode` and `fixedPoint`, not legacy `focus`/`gap`:

- **`"orbit"`** — Arrow attaches to shape's outer edge. Best for most connections. `fixedPoint: [xRatio, yRatio]` where `[0,0.5]` = left, `[1,0.5]` = right, `[0.5,0]` = top, `[0.5,1]` = bottom.
- **`"inside"`** — Arrow starts/ends from inside the shape. Use for vertical drops within a column.

See `references/element-templates.md` for full JSON templates for each arrow type.

### When to Audit Arrows

During the render-view-fix loop, check:

- Do any arrows cross through shapes they shouldn't?
- Are parallel arrows distinguishable (not overlapping each other)?
- For fan-out patterns (one entity with 5+ outgoing arrows), consider reducing to essential relationships or varying arc heights to separate paths.

---

## Text Rules

**CRITICAL**: The JSON `text` property contains ONLY readable words.

```json
{
    "id": "myElement1",
    "text": "Start",
    "originalText": "Start"
}
```

Settings: `fontSize: 16`, `fontFamily: 3`, `textAlign: "center"`, `verticalAlign: "middle"`

---

## JSON Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

## Element Templates

See `references/element-templates.md` for copy-paste JSON templates for each element type (text, line, dot, rectangle, arrow). Pull colors from `references/color-palette.md` based on each element's semantic purpose.

---

## Render & Validate (MANDATORY)

JSON alone can't judge a diagram. After generating or editing Excalidraw JSON, you MUST ATTENTION render PNG, view it, fix what you see, and loop until right; this is core workflow, not a final check.

### How to Render

```bash
cd .claude/skills/excalidraw-diagram/references && uv run python render_excalidraw.py <path-to-file.excalidraw>
```

PNG appears beside the `.excalidraw` file; use the **Read tool** to view it.

### The Loop

After initial JSON, repeat this cycle:

**1. Render & View** — Run the render script, then Read the PNG.

**2. Audit against your original vision** — Before bug hunting, compare the render to Steps 1-4:

- Visual structure matches planned conceptual structure
- Each section uses its intended pattern (fan-out, convergence, timeline, etc.)
- Eye flow follows the designed order
- Visual hierarchy is correct: hero elements dominate, supporting elements are smaller
- Technical evidence artifacts (code snippets, data examples) are readable and well placed

**3. Check for visual defects:**

- Text clipped by or overflowing its container
- Text or shapes overlap unintentionally
- Arrows cross elements instead of routing around them
- Arrows land on the wrong element or point into empty space
- Labels float ambiguously, without clear anchors
- Uneven spacing between elements that should be even
- Excess whitespace beside cramped sections
- Text too small at rendered size
- Lopsided or unbalanced composition

**4. Fix** — Edit the JSON to address everything you found. Common fixes:

- Widen containers when text is clipped
- Adjust `x`/`y` coordinates to fix spacing and alignment
- Convert overlapping straight arrows to curved (`roundness: {"type": 2}` + 3-point arc) or elbowed (`elbowed: true` + 4-point path) — see **Arrow Routing** section
- Reposition labels closer to the element they describe
- Resize elements to rebalance visual weight across sections

**5. Re-render & re-view** — Run the render script again and Read the new PNG.

**6. Repeat** — Cycle until both vision (Step 2) and defect (Step 3) checks pass. Typically takes 2-4 iterations. Don't stop after one pass because no critical bugs; improve composition when needed.

### When to Stop

The loop is done when:

- The rendered diagram matches the conceptual design from your planning steps
- No text is clipped, overlapping, or unreadable
- Arrows route cleanly and connect to the right elements
- Spacing is consistent and the composition is balanced
- You'd be comfortable showing it to someone without caveats

### First-Time Setup

If the render script isn't set up:

```bash
cd .claude/skills/excalidraw-diagram/references
uv sync
uv run playwright install chromium
```

---

## Quality Checklist

### Depth & Evidence (Check First for Technical Diagrams)

1. **Research done**: Did you look up actual specs, formats, event names?
2. **Evidence artifacts**: Are there code snippets, JSON examples, or real data?
3. **Multi-zoom**: Does it have summary flow + section boundaries + detail?
4. **Concrete over abstract**: Real content shown, not just labeled boxes?
5. **Educational value**: Could someone learn something concrete from this?

### Conceptual

6. **Isomorphism**: Does each visual structure mirror its concept's behavior?
7. **Argument**: Does the diagram SHOW something text alone couldn't?
8. **Variety**: Does each major concept use a different visual pattern?
9. **No uniform containers**: Avoided card grids and equal boxes?

### Container Discipline

10. **Minimal containers**: Could any boxed element work as free-floating text instead?
11. **Lines as structure**: Are tree/timeline patterns using lines + text rather than boxes?
12. **Typography hierarchy**: Are font size and color creating visual hierarchy (reducing need for boxes)?

### Structural

13. **Connections**: Every relationship has an arrow or line
14. **Flow**: Clear visual path for the eye to follow
15. **Hierarchy**: Important elements are larger/more isolated
16. **Arrow routing**: No arrows crossing through shapes — use curved/elbowed routing where needed

### Technical

17. **Text clean**: `text` contains only readable words
18. **Font**: `fontFamily: 3`
19. **Roughness**: `roughness: 0` for clean/modern (unless hand-drawn style requested)
20. **Opacity**: `opacity: 100` for all elements (no transparency)
21. **Container ratio**: <30% of text elements should be inside containers

### Visual Validation (Render Required)

22. **Rendered to PNG**: Diagram has been rendered and visually inspected
23. **No text overflow**: All text fits within its container
24. **No overlapping elements**: Shapes and text don't overlap unintentionally
25. **Even spacing**: Similar elements have consistent spacing
26. **Arrows land correctly**: Arrows connect to intended elements without crossing others
27. **Readable at export size**: Text is legible in the rendered PNG
28. **Balanced composition**: No large empty voids or overcrowded regions

---

# Excalidraw Diagram Creator

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Generate `.excalidraw` JSON files that **argue visually**, not just display information.

**Output directory:** Save generated `.excalidraw` files to `docs/diagrams/`. Create the directory if it doesn't exist. Use kebab-case filenames that describe the diagram's subject (e.g., `docs/diagrams/cqrs-command-flow.excalidraw`, `docs/diagrams/cross-service-messaging.excalidraw`). If the user specifies a different path, use that instead.

**Setup:** If the user asks you to set up this skill (renderer, dependencies, etc.), see `README.md` for instructions.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce `.excalidraw` JSON that visually ARGUES workflows, architectures, or concepts — so structure carries meaning, technical diagrams teach with evidence artifacts, and rendered output matches the design after mandatory render-view-fix validation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Apply critical + sequential thinking; every claim needs traced proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** execute the Design Process steps in order — **0 Assess depth → 1 Understand deeply → 2 Map concepts to patterns → 3 Ensure variety → 4 Sketch flow → 5 Generate JSON → 6 Render & Validate** — NEVER skip, reorder, or merge a step, and Step 6 is mandatory not a final formality — why: the skill's own steps are the easiest thing to forget, and skipping them ships structureless, unvalidated diagrams
**IMPORTANT MUST ATTENTION** diagrams must ARGUE not DISPLAY — pass the Isomorphism Test (structure alone communicates the concept); NEVER ship a card grid or equal-box layout — map each concept to a DIFFERENT visual pattern (fan-out, convergence, timeline, tree, cycle) — why: uniform containers display labels, they do not argue meaning
**IMPORTANT MUST ATTENTION** the Render & Validate loop is MANDATORY — NEVER ship JSON without rendering to PNG via `render_excalidraw.py`, Reading the image, and fixing visual defects (clipping, overlaps, arrows crossing shapes) across 2-4 iterations — why: you cannot judge a diagram from JSON alone
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim with confidence >80% to act (<60% DO NOT recommend) — why: speculation produces wrong diagrams that pass silent review
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting, keep exactly one `in_progress`, mark `completed` immediately, add a final review todo — why: context loss without a task list silently drops findings
**IMPORTANT MUST ATTENTION** assess depth FIRST (simple/conceptual vs comprehensive/technical) — technical diagrams MUST research real specs (actual event names, JSON formats, API/method names), search 3+ existing patterns before inventing, and embed evidence artifacts at all three zoom levels — why: closest example ≠ matching preconditions, and generic placeholders teach nothing
**IMPORTANT MUST ATTENTION** build comprehensive JSON section-by-section, NEVER in one pass — pass it through the ~32k-token output limit, use descriptive string IDs, namespace seeds per section (100xxx, 200xxx), update cross-section `boundElements` as you go — why: a single pass produces truncated, broken JSON
**IMPORTANT MUST ATTENTION** pull ALL colors from `references/color-palette.md` and NEVER invent new ones — use Primary/Neutral or Secondary when no semantic category fits — why: color encodes meaning, invented colors break the encoding
**IMPORTANT MUST ATTENTION** default text to free-floating (<30% inside containers) — for each boxed element ask "Would this work as free-floating text?" and remove the container if yes — why: typography creates hierarchy without boxes

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| "JSON looks correct, skip rendering"          | You cannot judge a diagram from JSON — render to PNG, Read it, fix what you see.       |
| "One render pass, no critical bugs, done"     | Vision check ≠ defect check. Keep cycling until composition is balanced (2-4 passes).  |
| "Generate the whole diagram in one response"  | You will hit the ~32k output limit and produce broken JSON. Build section-by-section.  |
| "Generic labels are enough for this"          | Technical diagrams must show actual specs/formats/names — placeholders teach nothing.  |
| "This color looks better"                     | Pull only from `references/color-palette.md`; invented colors break the meaning code.  |
| "Box everything for consistency"              | Default to free-floating text (<30% boxed); typography is the hierarchy, not borders.  |

**IMPORTANT MUST ATTENTION** diagrams must ARGUE not DISPLAY — Render & Validate loop is MANDATORY (render → Read PNG → fix → repeat)
**IMPORTANT MUST ATTENTION** assess depth FIRST, research real specs for technical diagrams, build comprehensive JSON section-by-section
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80% to act); break work into small `TaskCreate` todos before starting and add a final review todo

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
