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
- Resolve the project's configured styling reference when applicable; do not assume SCSS or BEM.

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
- Project styling review: apply configured rules when present; otherwise use stack evidence and do not assume a preprocessor or naming method.

## Prerequisites

- Full guidelines reference: `references/guidelines.md`
- Project styling: read the guide selected by project config when present.

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
    - **Component architecture / reuse** *(when source code is in scope)* -- classify components as Common, Domain-Shared, or Page; use the project base component/primitive; reuse or compose existing components before creating new ones; flag duplicated markup, selectors, styling, lifecycle, or lower-tier test cases
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

**Component architecture findings** use the project design-review checklist IDs `M6`–`M9` when source code is available. If the artifact is a screenshot or live surface without source, record component base/tier/reuse as `NOT VERIFIABLE` rather than inferring it.

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

**Precedence:** the styling guide selected by project config and any configured design-system doc OUTRANK these clauses; a genuine conflict is surfaced to the user with both sides.

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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

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
