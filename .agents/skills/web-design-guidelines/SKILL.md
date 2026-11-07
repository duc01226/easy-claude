---
name: web-design-guidelines
description: '[Code Quality] Use when reviewing UI code for accessibility, responsiveness, performance and UX best practices.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. When a workflow step or another skill names a skill, read that file in full yourself (every line, with no line limit; in parts only when output is cut off): a skill whose implicit invocation is off is never loaded for you. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Review UI code for WCAG 2.2 accessibility, Core Web Vitals performance, and modern web design best practices to identify evidenced issues and prioritize improvements.

**Summary:** Triage the requested files → load guidelines and applicable styling rules → scan priority categories and UI/UX dimensions → validate and report evidenced findings. Review-only stops there; standalone fix-loop repairs authorized findings and freshly re-reviews.

**Workflow:**

1. **Identify Target** — Use the file/pattern or ask which components to review; load prerequisites and plan review tasks
2. **Scan Files** — Read and Grep target files for violation patterns
3. **Check Categories** — Check accessibility first, then remaining categories and the nine focused UI/UX dimensions
4. **Report Findings** — Group by file, use `file:line` format, terse findings, prioritized summary

**Key Rules:**

- Review-only and caller-owned passes report without edits; standalone fix-loop follows the shared repair/re-review policy.
- Check categories in priority order (accessibility first)
- Resolve the project's configured styling reference when applicable; do not assume SCSS or BEM.
- Apply [UI System Context](../shared/protocols/ui-system-context.md) before reviewing project conventions.

**Evidence:** Cite traced proof and confidence percentages for every claim; >80% confidence to act.

## Contents

- [Quick Summary](#quick-summary)
- [Web Design Guidelines Review](#web-design-guidelines-review)
- [When to Use](#when-to-use)
- [When NOT to Use](#when-not-to-use)
- [Prerequisites](#prerequisites)
- [Workflow](#workflow)
- [UI/UX Design Principles Pass (9 dimensions)](#uiux-design-principles-pass-9-dimensions)
- [Output Format](#output-format)
- [Examples](#examples)
- [Related Skills](#related-skills)
- [Closing Reminders](#closing-reminders)

# Web Design Guidelines Review

## When to Use

- Reviewing UI code for accessibility compliance before release
- Auditing a component or page for WCAG 2.2 violations
- Checking Core Web Vitals performance patterns in code
- Validating responsive design and mobile-friendly patterns
- Pre-PR UI quality gate check

## When NOT to Use

- **Building** UI -- use `ui-design --lane=marketing` (marketing/creative) or `ui-design --lane=product` (product UIs)
- **Creating** design specs -- use `design-spec`
- **Workflow-wired UI review gate** -- use `$ui-design --mode=review` (the project UI review gate that runs in the `changes-review` parallel batch on frontend changes: long-content overflow, responsive flex, flex-vs-fixed sizing, z-index discipline, SCSS/BEM). This skill is the generic, framework-agnostic a11y/UX checklist that `$ui-design --mode=review` cross-references — not a duplicate.
- Project styling review: apply configured rules when present; otherwise use stack evidence and do not assume a preprocessor or naming method.

## Prerequisites

- Read [references/guidelines.md](references/guidelines.md) before scanning UI code; it covers accessibility, interaction, content, layout, performance and platform-specific checks.
- Project styling: read the guide selected by project config when present.

## Workflow

1. **Identify target files**
    - IF file/pattern argument provided → use it
    - IF not → ask user which files or components to review

2. **Scan files** using Read and Grep tools

3. **Check against categories** (in priority order):
    - **Accessibility** — resolve the applicable standard, then check semantics, accessible names, alternatives, contrast, and visible focus.
    - **Keyboard navigation** — check keyboard operation, logical focus order, and dialog focus management where applicable.
    - **Forms** -- labels, validation, error display, autocomplete, paste not blocked
    - **Async states & feedback** — apply `UI-1.5` and `UI-9.1`–`UI-9.4`. Verify perceivable feedback appropriate to the work, safe reconciliation of optimistic updates, recovery from failures, and a useful empty state where a collection can be empty. For submits that could create duplicates, check that repeat activation cannot produce duplicate effects.
    - **Actions & attention** — apply `AD-1`–`AD-6` (`C14`–`C20`, `B16`) to the actual view, roles, and inputs. Distinguish configured budgets, heuristic defaults, and binding accessibility criteria.
    - **Component architecture / reuse** *(when source code is in scope)* — follow documented tiers and base abstractions where they exist. Otherwise trace actual owners and reuse boundaries. Report duplicated behavior when an evidenced shared owner fits.
    - **Animation** -- `prefers-reduced-motion` respected, no `transition: all`, GPU-safe properties only
    - **Performance** -- image dimensions set, lazy loading, no layout thrashing, virtualization for large lists
    - **Touch/Mobile** — measure actual hit areas and spacing against the applicable criterion and its exceptions. Distinguish platform recommendations and check safe areas and reachability on supported devices.
    - **Responsive layout** — verify supported viewport sizes and any additional reflow/zoom conditions required by the accessibility standard. Prefer reflow. Use a scrollable region for genuinely two-dimensional content where the applicable criterion permits it. Flag inaccessible controls and lost content.
    - **Content** -- long-text/overflow handling (`text-overflow`, wrapping, line clamp), readable line length _(empty-collection states → **Async states & feedback**; breakpoints/reflow → **Responsive layout**)_
    - **Dark mode / i18n** -- `color-scheme`, logical CSS properties, `Intl.*` formatters

4. **Validate and report findings** through `$why-review --validate-findings` before any fix or verdict, using the output format below. Standalone fix-loop then repairs authorized findings and freshly repeats the full review under `review-policy`.

## UI/UX Design Principles Pass (9 dimensions)

Apply the applicable clauses of `SYNC:ui-ux-design-principles` in the **REVIEW** role. Use the project's documented conventions and target platform/input modes. A numeric heuristic alone cannot establish a failure. Report a verified violation of a governing requirement, including applicable accessibility criteria. Use WCAG 2.2 AA for web and meet any stricter applicable requirement. Record missing rendered evidence as `NOT VERIFIABLE`. Run the nine focused passes below and record N/A where a check does not apply.

**Findings** use `path:line - finding`, grouped by file, with the applicable clause and evidence. For example, `{ui-source-root}/components/Button:42 - UI-3.1 active button label at 3.1:1 fails WCAG 2.2 SC 1.4.3 for normal text`. Keep accessibility-first ordering and Summary counts.

**One rule, one finding.** When a clause repeats a category rule (touch targets, reduced motion, async states, image dimensions or readable line length), cite both the category and clause ID in one finding.

**Component architecture findings** use the project design-review checklist IDs `M6`–`M9` when source code is available. If the artifact is a screenshot or live surface without source, record component base/tier/reuse as `NOT VERIFIABLE` rather than inferring it.

| #   | Dimension                 | Clauses            | Deepens category                                | `Think:`                                                                                                                                                                                             |
| --- | ------------------------- | ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Content · Async states & feedback               | Which element wins first read on this screen, and is it the one the page exists for? Is grouping done with whitespace or with borders? Are applicable empty, loading and error states usable?      |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Content                                         | Is the rendered type readable for the content and locale? Does it follow the project scale when defined and remain usable when resized? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | Accessibility · Dark mode / i18n                | Does each rendered foreground/background pair meet its applicable criterion in the supported themes? Is meaning also available without colour? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Responsive layout                               | Does spacing follow the project's scale when defined? Do grouping and reflow hold at content and viewport boundaries? |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | Keyboard navigation · Animation · Async states  | Is feedback perceivable and timely for the task? Are applicable states and keyboard focus visible? Does motion clarify the change and respect reduced motion? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Accessibility (landmarks, skip links) · Content | Cold-landing on this view: where am I, what's here, where next? How many top-level destinations? Are labels the user's words or internal vocabulary? Are expected return, history and deep-link paths preserved?       |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Forms                                           | Per field: why does it exist today? Is the label visible once filled? When does validation fire, and does the message say how to fix it? Does the keyboard/autocomplete match the type? Does typed data survive an error, navigation, and refresh? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | Touch/Mobile                                    | Do measured hit areas and spacing meet the applicable criterion? Are actions reachable on supported devices and inputs, including required gesture alternatives? Record N/A with evidence when no touch surface applies. |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | Performance · Async states & feedback           | What occupies the space of each loading element, and does the layout shift when it lands? Does feedback fit the operation? Are optimistic updates reconciled visibly and applicable offline, timeout and retry states usable? |

**Precedence** follows the shared protocols. Adopt applicable project conventions for design choices. They do not waive the selected accessibility standard. Surface conflicting authorities with evidence.

## Output Format

Group by file. Use `file:line` format. Terse findings. No preamble.

```text
## {ui-source-root}/components/Button

{ui-source-root}/components/Button:42 - AD-3 icon button has no accessible name
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

**Action:** Read the component; check semantics, ARIA, label associations, contrast, keyboard navigation and focus indicators. Report violations with `file:line`.

### Example 2: Visual polish review

**Input:** "Check the dashboard page for design best practices"

**Action:** Check animation (`transition: all`), images (dimensions/lazy loading), responsiveness (breakpoints/safe areas), typography (line height/max-width) and empty states. Report categorized findings.

## Related Skills

| Skill             | When to use instead                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ui-design`          | Building UI (not reviewing) — `--lane=marketing` (creative) or `--lane=product` (app UIs)                                  |
| `design-spec`     | Creating design specifications                                                                                            |
| `$ui-design --mode=review` | Project UI review gate (overflow, responsive flex, z-index, SCSS/BEM); runs in `changes-review` batch on frontend changes |

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `ui-action-density-gate` — Action and attention gate AD-1 to AD-6: one primary text button, lighter forms for other actions, uniform groups, named icons, a copy budget, regular aligned grids; designing, mocking up, building or reviewing a user-facing surface with actions or text → .claude/skills/shared/protocols/ui-action-density-gate.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md

<!-- PROTOCOL-GUIDES:END -->

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

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B16, action forms C14–C20, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`AD-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->


<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:ui-action-density-gate:reminder -->

- **MUST ATTENTION** actions and attention (`AD-1`–`AD-6`): at most ONE filled text button per view, dialog, screenful or independent region, for the commit of its main task (parallel options may each carry it), with a fixed min-width; every other action takes the lightest form that keeps its meaning — a same-size quieter button, an icon-only button (named and tooltipped, only for universally understood icons), icon + short label, a text link, the whole row as target, or an overflow menu; destructive actions are never a bare icon (`AD-1`) · text-button groups share height, style, alignment and width, no filled/outlined mix in a repeated list (a footer, action bar or hero may add same-size quieter buttons), no filled or boxed button per row, by default one inline icon action per row (`AD-2`) · one icon family; every icon-only control has an accessible name, a tooltip on hover AND focus, the selected standard's minimum target and ≥ 3:1 contrast (`AD-3`) · one focal point; a row = title + by default one short meta line; no paragraph walls (`AD-4`) · measure per view and report the `AD` row of the UI/UX Gate Report; a finding resting only on an undeclared default caps at P3 (`AD-5`) · tiles in one collection grid share one size and baseline, the grid fills its width, actions align to their content edge (`AD-6`). Checks: checklist `B16`, `C14`–`C20`. Platform guidelines and the project design system outrank; report a defect once. Skip ONLY with no user-facing actions or text, stated.

<!-- /SYNC:ui-action-density-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review UI code for WCAG 2.2 accessibility, Core Web Vitals performance, and modern web design best practices to identify evidenced issues and prioritize improvements.

**IMPORTANT MUST ATTENTION Main steps:** identify target → load prerequisites → triage and plan tasks → scan files → check priority categories and nine focused UI/UX dimensions → report deduplicated findings and Summary counts.

- Report without edits in review-only and caller-owned passes; standalone fix-loop validates, repairs and freshly re-reviews. Use accessibility-first priority and the existing `file:line` output format.
- Cite traced evidence and confidence (>80% to act). Check applicable clauses (`UI-1.1`–`UI-9.4`) one dimension at a time and include the clause ID. Apply project conventions and preserve the applicable accessibility requirements.
- Break work into small tasks before starting and include a final quality-review task.

| Evasion | Required action |
|---|---|
| "Fix before validation" | Validate the finding first; repair only in authorized standalone fix-loop |
| "Scan all dimensions together" | Give each dimension a focused pass before aggregating |
| "The guide link is enough" | Read absent protocol text and the guidelines before acting |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
