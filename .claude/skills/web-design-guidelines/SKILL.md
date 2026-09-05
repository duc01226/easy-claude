---
name: web-design-guidelines
version: 2.0.0
description: '[Code Quality] Use when reviewing UI code for accessibility, responsiveness, performance, and UX best practices.'
argument-hint: <file-or-pattern>
---

## Quick Summary

**Goal:** Review UI code for WCAG 2.2 accessibility, Core Web Vitals performance, and modern web design best practices.

**Workflow:**

1. **Identify Target** — Use provided file/pattern or ask user which components to review
2. **Scan Files** — Read and Grep target files for violation patterns
3. **Check Categories** — Accessibility, keyboard nav, forms, async states & feedback (loading/error/empty), animation, performance, touch/mobile, responsive layout (flex-wrap / row→column), content, dark mode/i18n
4. **Report Findings** — Group by file, use `file:line` format, terse findings, prioritized summary

**Key Rules:**

- Review-only skill: finds issues, does NOT fix them
- Check categories in priority order (accessibility first)
- Also reference `docs/project-reference/scss-styling-guide.md` if available

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Web Design Guidelines Review

Review UI code for compliance with WCAG 2.2, Core Web Vitals, and modern web design best practices. This is a **review-only** skill -- it finds issues, not fixes them.

## When to Use

- Reviewing UI code for accessibility compliance before release
- Auditing a component or page for WCAG 2.2 violations
- Checking Core Web Vitals performance patterns in code
- Validating responsive design and mobile-friendly patterns
- Pre-PR UI quality gate check

## When NOT to Use

- **Building** UI -- use `design --lane=marketing` (marketing/creative) or `design --lane=product` (product UIs)
- **Creating** design specs -- use `design-spec`
- **Workflow-wired UI review gate** -- use `/ui-review` (the project UI review gate that runs in the `changes-review` parallel batch on frontend changes: long-content overflow, responsive flex, flex-vs-fixed sizing, z-index discipline, SCSS/BEM). This skill is the generic, framework-agnostic a11y/UX checklist that `/ui-review` cross-references — not a duplicate.
- Project SCSS review -- also check `docs/project-reference/scss-styling-guide.md`

## Prerequisites

- Full guidelines reference: `references/guidelines.md`
- Project SCSS: `docs/project-reference/scss-styling-guide.md` (if available)

## Workflow

1. **Identify target files**
    - IF file/pattern argument provided → use it
    - IF not → ask user which files or components to review

2. **Scan files** using Read and Grep tools

3. **Check against categories** (in priority order):
    - **Accessibility** -- semantic HTML, ARIA, labels, alt text, color contrast, focus indicators
    - **Keyboard navigation** -- tab order, focus trap in modals, escape key handling
    - **Forms** -- labels, validation, error display, autocomplete, paste not blocked
    - **Async states & feedback** -- every fetch/submit/mutation renders a **loading** indicator (spinner/skeleton, never a frozen blank), a user-visible **error** with a retry/recovery path (never a silent failure or raw stack trace), an **empty** state for zero-item collections, and an in-flight **disabled** state on submit controls to prevent double-submit (canonical vocabulary: Default / Loading / Disabled / Error / Empty / Success)
    - **Animation** -- `prefers-reduced-motion` respected, no `transition: all`, GPU-safe properties only
    - **Performance** -- image dimensions set, lazy loading, no layout thrashing, virtualization for large lists
    - **Touch/Mobile** -- touch targets >= 44px, `touch-action: manipulation`, safe areas
    - **Responsive layout** -- usable on small devices (owns all reflow/breakpoint concerns). Minimum bar: **preferred** reflow (rows `flex-wrap` or `row → column`, grids collapse to one column, fluid min/max/`%`/`rem` over large fixed px); **acceptable fallback** when a layout genuinely can't reflow (tables, canvases, wide grids) — a fixed `min-width`/`min-height` + `overflow: auto` scroll (scrolling is OK, not a defect); **hard fail** only when content is broken on small screens — clipped, cut off, or a control unreachable with no scroll path. Big responsive refactor needed → flag it and confirm scope with the user, don't silently rewrite. Breakpoints tested at 320 / 768 / 1024px
    - **Content** -- long-text/overflow handling (`text-overflow`, wrapping, line clamp), readable line length _(empty-collection states → **Async states & feedback**; breakpoints/reflow → **Responsive layout**)_
    - **Dark mode / i18n** -- `color-scheme`, logical CSS properties, `Intl.*` formatters

4. **Report findings** in output format below

## UI/UX Design Principles Pass (9 dimensions)

The 40 clauses of `SYNC:ui-ux-design-principles` (full body inlined below in this skill) bind this review in the **REVIEW** role: each clause is a fail-condition. They do not replace the step-3 categories — they DEEPEN them. Run **NINE focused passes, one dimension at a time**, over the target files; a single simultaneous sweep of all nine is tick-boxing, which this skill's evidence rule already forbids. Answer each `Think:` prompt from first principles BEFORE hunting the violation it predicts.

**Every finding** keeps this skill's existing Output Format — `path:line - finding`, grouped by file — with the clause ID in the text, e.g. `{ui-source-root}/components/Button:42 - UI-3.1 measured contrast 3.1:1 on the disabled label (needs 4.5:1)`. This skill defines no severity tiers and this pass adds none: keep the existing accessibility-first priority ordering and the Summary counts.

**One rule, one finding.** Where a clause restates a category rule this skill already states (touch targets >= 44px, `prefers-reduced-motion`, loading/error/empty states, image dimensions, readable line length), report ONE finding citing both the category and the clause ID — never two.

| #   | Dimension                 | Clauses            | Deepens category                                | `Think:`                                                                                                                                                                                             |
| --- | ------------------------- | ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Content · Async states & feedback               | Which element wins first read on this screen, and is it the one the page exists for? Is grouping done with whitespace or with borders? Are the empty, loading and error states designed at all?      |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Content                                         | How many families/weights ship on this page? What size does body text render at (16px web, 17px mobile, never below 14px), what measure does it reach (45-75 characters), what leading (1.5 body, 1.1-1.2 display)? Are sizes from a fixed 6-step scale or one-offs? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | Accessibility · Dark mode / i18n                | What is the COMPUTED ratio for each rendered foreground/background pair (4.5:1 text, 3:1 UI edges)? Does any state carry meaning through colour alone? Is dark mode a designed surface or an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Responsive layout                               | Is every gap a multiple of one 4px/8px base unit? Does spacing live on the container (`gap`) or on scattered child margins? Is inner padding smaller than the gap to the next group? Do breakpoints break where the layout fails, or where a device is named? |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | Keyboard navigation · Animation · Async states  | What changes within 100ms of a press? Which of the five states is unstyled? Is the focus ring still visible after restyling? Could undo replace this confirmation? Is motion 150-250ms ease-out and reduced-motion aware? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Accessibility (landmarks, skip links) · Content | Cold-landing on this view: where am I, what's here, where next? How many top-level destinations? Are labels the user's words or internal vocabulary? Does the state have a URL or a back path?       |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Forms                                           | Per field: why does it exist today? Is the label visible once filled? When does validation fire, and does the message say how to fix it? Does the keyboard/autocomplete match the type? Does typed data survive an error, navigation, and refresh? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | Touch/Mobile                                    | Measure the HIT BOX, not the icon: >=44x44pt with 8px separation? Where do primary actions sit relative to the thumb? Is anything gesture-only? Are notch, home indicator and keyboard accounted for? _(No touch surface in scope → skip with the reason stated.)_ |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | Performance · Async states & feedback           | What occupies the space of each loading element, and does the layout shift when it lands? Skeleton or spinner — chosen deliberately? Is an optimistic update rolled back visibly? Are offline, timeout and retry designed states? |

**Precedence:** `docs/project-reference/scss-styling-guide.md` and any project design-system doc **OUTRANK** these clauses; a genuine conflict is reported with BOTH sides and taken to the user — NEVER resolved silently.

## Output Format

Group by file. Use `file:line` format. Terse findings. No preamble.

```text
## {ui-source-root}/components/Button

{ui-source-root}/components/Button:42 - icon button missing aria-label
{ui-source-root}/components/Button:55 - animation missing prefers-reduced-motion check
{ui-source-root}/components/Button:67 - transition: all -> list specific properties
{ui-source-root}/components/Button:89 - div with onClick -> use <button>

## {ui-source-root}/components/Modal

{ui-source-root}/components/Modal:12 - missing overscroll-behavior: contain
{ui-source-root}/components/Modal:78 - no focus trap for modal dialog

## {ui-source-root}/components/Card

[check] No issues found

## Summary

- 4 accessibility issues
- 2 performance issues
- 1 UX issue
- Priority: Fix accessibility issues first (WCAG compliance)
```

## Examples

### Example 1: Accessibility review

**Input:** "Review the user profile component for accessibility"

**Action:** Read component file, check for semantic HTML, ARIA attributes, label associations, color contrast patterns, keyboard navigation, focus indicators. Report each violation with file:line.

### Example 2: Visual polish review

**Input:** "Check the dashboard page for design best practices"

**Action:** Scan for animation performance (no `transition: all`), image optimization (dimensions, lazy loading), responsive patterns (breakpoints, safe areas), typography (line height, max-width), empty states handling. Report categorized findings.

## Related Skills

| Skill             | When to use instead                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `design`          | Building UI (not reviewing) — `--lane=marketing` (creative) or `--lane=product` (app UIs)                                  |
| `design-spec`     | Creating design specifications                                                                                            |
| `/ui-review`      | Project UI review gate (overflow, responsive flex, z-index, SCSS/BEM); runs in `changes-review` batch on frontend changes |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile)** — the working rule set for ANY task that designs, plans, implements, or reviews a user interface. Applies to BOTH platforms unless a clause names one (§8 is mobile/touch). Cite clauses by ID: `UI-3.1`, `UI-8.2`.
>
> **Precedence:** project design-system / SCSS / frontend-pattern docs OUTRANK these clauses; these clauses outrank generic taste. A genuine conflict is SURFACED to the user with both sides — NEVER resolved silently. — why: the project's own recorded decision is the authority; these clauses are the default when it is silent.
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
> - `UI-2.1` Max 2 families, 3 weights each. More variety reads as inconsistency, not range.
> - `UI-2.2` Body text 16px web, 17px mobile. NEVER below 14px for anything a user must read.
> - `UI-2.3` Line length 45–75 characters. Constrain the measure, not the container.
> - `UI-2.4` Leading scales inversely with size: 1.5 body, 1.1–1.2 display.
> - `UI-2.5` Fixed type scale — 6 named steps shared with engineering. NEVER one-off sizes.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Contrast 4.5:1 text, 3:1 UI edges. Measure it — NEVER judge by eye on a bright screen.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` One spacing unit, multiplied — 4px or 8px base; every gap a multiple of it.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Tighter inside, looser between — inner padding always smaller than the gap to the next group.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Every action gets a response under 100ms, even when the result takes longer.
> - `UI-5.2` Specify all 5 states — default, hover, focus, active, disabled — plus loading where it applies.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Motion clarifies cause and effect: 150–250ms, ease-out, honours reduced-motion.
> - `UI-5.5` Keep the visible focus ring. Restyle it if it clashes; NEVER remove it.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Max 5 top-level destinations. Depth beats a crowded first level.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Every state deserves a URL or a back path. Deep links and hardware back must land somewhere sensible.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason it exists today.
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate on blur, not on keystroke. Errors sit next to the field and say how to fix it.
> - `UI-7.4` Match keyboard to data type — correct input type, autocomplete and autocapitalise on every field.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Hit target ≥44×44pt, 8px apart. The target may exceed the visible icon.
> - `UI-8.2` Primary actions in the bottom third — that is where the thumb lives.
> - `UI-8.3` Gestures are shortcuts, NEVER the only route. Anything swipeable is also tappable.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Show structure before data — skeletons for known layouts, spinners only for unknown waits.
> - `UI-9.2` Assume success optimistically. Update UI first, reconcile after, roll back visibly on failure.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` Design for the slow connection. Offline, timeout and retry are states, NOT edge cases.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role                                | Obligation                                                                                                                                                              |
> | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | DESIGN / PLAN a surface             | Clauses shape the artifact: empty/loading/error specified first (`UI-1.5`), all 5 states enumerated (`UI-5.2`), type scale + spacing unit declared (`UI-2.5`, `UI-4.1`) |
> | IMPLEMENT a component               | Pre-completion gate: states · tokens · contrast · focus ring · touch target · reserved space (`UI-5.2`, `UI-2.5`/`UI-4.1`, `UI-3.1`, `UI-5.5`, `UI-8.1`, `UI-9.3`)      |
> | REVIEW UI code or a design artifact | Each clause is a fail-condition; every finding cites `UI-<clause>` + `file:line` + severity. NEVER a tick-box sweep — one focused pass per section                      |
> | SCAN / document a UI system         | Record where the PROJECT deliberately deviates, so the overriding doc becomes the recorded authority                                                                    |
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
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction + **the eight screen states** (ideal, empty, first-run, loading, partial, error, offline, maximum-data) · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility (WCAG 2.2 AA; every item `P1` minimum, `P0` when it blocks the task) · §J content & UX writing · §K trust, ethics & privacy (dark patterns are `P0`) · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. One focused pass per section — why: a section skipped in the long middle silently becomes an unreported defect class.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — these 10 catch the majority of serious defects: (1) can a new user complete the primary task unaided · (2) does every action give visible feedback within 400ms · (3) do empty/loading/error states exist AND offer a forward path · (4) is the primary action obvious, singular, reachable · (5) text ≥4.5:1 contrast and focus visible · (6) whole flow completable by keyboard · (7) touch targets ≥44/48px · (8) destructive actions reversible · (9) holds at 320px and 200% zoom · (10) any dark patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains front-end work, the checklist binds the plan's ACCEPTANCE CRITERIA, not a built page: name the platform, the applicable conditional sections (§F/§G/§H, §L), the eight screen states each UI phase must deliver (§D2), and the §I accessibility floor — so the work is specified against the checklist before it is written. A UI phase whose acceptance criteria omit the states and the a11y floor is INCOMPLETE — say so.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

- **MUST ATTENTION** apply the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) to any user-facing surface: one focal point, proximity grouping, empty/loading/error designed FIRST (§1) · ≤2 families, 16px web / 17px mobile body, never <14px, 45–75ch, fixed 6-step scale (§2) · 4.5:1 text / 3:1 edges measured, one accent, colour never alone, dark mode ≠ inversion (§3) · one 4/8px unit, `gap` over margins, tighter-inside-looser-between, content-driven breakpoints (§4) · <100ms response, all 5 states, undo over confirm, 150–250ms ease-out honouring reduced-motion, visible focus ring (§5) · where-am-I/what's-here/where-next, ≤5 top-level destinations, user's words, URL or back path (§6) · fewer fields, visible labels, validate on blur, matched keyboard, NEVER lose input (§7) · ≥44×44pt targets 8px apart, bottom-third primaries, gestures never the only route, safe areas (§8) · structure before data, optimistic update with visible rollback, reserved space, slow-connection states (§9). Project design-system docs OUTRANK these clauses — a genuine conflict goes to the user, NEVER resolved silently. Cite every finding as `UI-<clause>` + `file:line`. Skip ONLY for changes with no user-facing surface, stated explicitly.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has a user-facing front-end surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — fewer than four → state the gap, findings are low confidence) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N in order, one focused pass each, with §F/§G/§H and §L applied only when the platform/product matches and §I (WCAG 2.2 AA) as a `P1` floor · `CL-5` short on time → run the 10-check §P triage · `CL-6` report in the §O shape. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, the checklist binds the UI phases' acceptance criteria (platform, conditional sections, the eight screen states, the a11y floor). Skip ONLY when the change has NO user-facing front-end surface, stated explicitly.

<!-- /SYNC:design-review-checklist:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** run the 9-dimension UI/UX Design Principles pass — all 40 clauses (`UI-1.1`-`UI-9.4`), one dimension at a time; every finding cites `UI-<clause>` + `file:line` in the existing output format, and project SCSS/design-system docs OUTRANK the clauses (genuine conflict → surface both sides to the user)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
