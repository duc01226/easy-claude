# UI/UX Design Review Checklist — executable review protocol for front-end work

> **Role:** the **executable review protocol** for any artifact carrying a user-facing front-end surface. Every item has a stable ID, a verifiable check, an observable failure signal, and a default severity, so an agent can run it against screenshots, prototypes, live URLs, code, or design files and produce a consistent, evidence-backed report. Owns the REVIEW PROTOCOL (§0), the CHECK CATALOG (§A–§M), the EDGE-CASE PROBE LIST (§N), the REPORT FORMAT (§O), the QUICK TRIAGE PASS (§P), and the SCORING model (§Q). Owns NO design reasoning — that lives in `design-knowledge.md`.
>
> **Consumed by:** `ui-review` · `web-design-guidelines` · `artifact-review` · `test-ui` · `changes-review` · `plan-review` · `design` · `design-spec` · `ui-ux-pro-max` · `figma-design` · `pbi-mockup` · `feature-presentation` · `plan` · `scaffold` · `plan-execute` · `feature-implement` · `fix`, plus the `ui-ux-designer`, `frontend-developer` and `fullstack-developer` agents. This list is the drift-guard's scope — a skill belongs here ONLY if it carries an inline `SYNC:design-review-checklist` block, so the list stays greppable and the sweep stays truthful. NEVER add an aspirational consumer.
>
> **Drift-guard:** this file is AUTHORITATIVE for the check IDs (`A1`…`Q`), the severity rubric, and the report format. Related but SEPARATE single-sources — NEVER duplicate them here: the 40 usability clauses `UI-1.1`–`UI-9.4` in `SYNC:ui-ux-design-principles`; the visual-identity clauses `DD-1`–`DD-8` in `SYNC:design-distinctiveness-gate` + `.claude/docs/design-knowledge.md`; the tech-agnostic spec layer in `SYNC:ui-intent-layer`; project tokens/components in `docs/project-reference/design-system/`. On any change here, grep `design-review-checklist` and update every consuming carrier.
>
> **Relationship to the other two UI rule sets — three questions, no overlap.** `UI-1.1`–`UI-9.4` ask *"does this meet the usability/accessibility floor?"* `DD-1`–`DD-8` ask *"is this THIS product's interface, or any generator's?"* This checklist asks *"did the review actually LOOK at everything, with evidence, and rank it?"* — it is the **procedure and evidence contract** for a review, not a third set of taste rules. Where a check here restates a `UI-*` clause, report it ONCE under whichever ID the consuming skill already uses; NEVER emit two findings for one defect.
>
> **MUST ATTENTION** apply this checklist ONLY when the change, plan, or artifact carries a user-facing front-end surface. A back-end-only diff, a doc edit, or a config change is `N/A` — state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage.
>
> **MUST ATTENTION** the project's OWN design-system, SCSS, and frontend-pattern docs plus accepted ADRs **OUTRANK this checklist** on any conflict; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — surface a genuine conflict to the user with both sides, NEVER resolve it silently.
>
> **Provenance.** `[model-knowledge]` — a consolidation of established practice: Nielsen's usability heuristics (§A), named UX laws (§B), Gestalt and typographic convention (§C), and WCAG 2.2 AA (§I) `[standard: W3C WCAG 2.2]`. Severity defaults are calibration, not law; a project's own release policy outranks them.

---

## Quick Summary

**Goal:** Turn a front-end review into a repeatable, evidence-backed report — every finding carrying a location, an observation tag, an impact, a checklist ID, and a fix — so defects are ranked by real severity instead of by whatever the reviewer happened to notice first.

**Summary:**

- **Gather context BEFORE checking (§0.1).** Platform, primary user, primary task, success metric, constraints, scope, artifacts. Fewer than four known → state the gap at the top and mark affected findings **low confidence**.
- **Evidence or nothing (§0.2).** Every finding cites a location. NEVER invent a measurement — an unmeasurable check is `NOT VERIFIABLE`, never a guessed number. Tag each finding `MEASURED` / `OBSERVED` / `HEURISTIC`.
- **The sections, in order:** §0 protocol → §A heuristics → §B cognitive load → §C visual hierarchy → §D interaction & the eight screen states → §E information architecture → **§F web / §G mobile / §H desktop (conditional on platform)** → §I accessibility (WCAG 2.2 AA, P1 floor) → §J content → §K trust & ethics → **§L AI patterns (conditional)** → §M consistency → §N edge-case probes → §O report format → §P quick triage → §Q scoring.
- **Severity is the output, not the finding count.** P0 blocks ship · P1 fix before release · P2 next iteration · P3 backlog · P4 note. Cap at the top 10 by severity unless a full audit was requested; a clean section reports "no issues found" — NEVER pad.
- **No time for a full pass?** Run §P (10 checks) — it catches the majority of serious defects.

---

## 0. Review Protocol

### 0.1 Before reviewing — gather context

Do not begin checks until these are known or explicitly marked `UNKNOWN`:

| Field | Why it matters |
|---|---|
| Platform | Determines which conditional sections apply (§F web, §G mobile, §H desktop) |
| Primary user & expertise level | Novice-facing vs expert-facing changes density and shortcut expectations |
| Primary task / job to be done | Every check is judged against whether it helps or blocks this task |
| Success metric | Conversion, task completion, retention, error rate |
| Constraints | Brand system, tech stack, regulatory, legacy, timeline |
| Review scope | Full product, one flow, one screen, one component |
| Review artifacts available | Screenshots, live build, Figma, code, analytics, user research |

If fewer than four of these are known, state the gap at the top of the report and mark affected findings as **low confidence**.

### 0.2 Agent conduct rules

1. **Evidence or nothing.** Every finding cites a specific location (screen name, element, file, line, coordinates). No finding may be inferred from a screen you did not see.
2. **Never invent measurements.** If you cannot measure contrast, tap-target size, or load time from the artifact given, mark the check `NOT VERIFIABLE` — do not guess a number.
3. **Distinguish fact from judgment.** Tag each finding `MEASURED`, `OBSERVED`, or `HEURISTIC`.
4. **Check the rule before applying it.** A convention violated deliberately for a good reason is not a defect. Ask before flagging when intent is unclear.
5. **No padding.** A clean section reports "no issues found." Do not manufacture findings to fill it.
6. **Prioritize ruthlessly.** Cap the report at the top 10 issues by severity unless a full audit was requested.
7. **Propose, don't just diagnose.** Every Critical and High finding needs a concrete recommended fix.

### 0.3 Severity rubric

| Level | Definition | Action |
|---|---|---|
| **P0 — Critical** | Blocks task completion, causes data loss, or excludes a protected group | Ship blocker |
| **P1 — High** | Significant friction, high error rate, or violates a legal accessibility floor | Fix before release |
| **P2 — Medium** | Measurable inefficiency or inconsistency; degrades trust | Next iteration |
| **P3 — Low** | Polish, refinement, minor inconsistency | Backlog |
| **P4 — Note** | Observation or opportunity, no defect | Optional |

### 0.4 Status values

`PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`

---

## A. Core Usability Heuristics

| ID | Check | Failure signal | Default |
|---|---|---|---|
| A1 | System status is always visible — loading, saving, syncing, progress, connection | Action occurs with no visible response within 1s | P1 |
| A2 | Language matches the user's world; no internal jargon, codes, or system errors surfaced raw | Labels like "Entity ID," "Null result," "Error 0x8007" | P2 |
| A3 | Every flow has a visible exit, cancel, or back path | User can enter a state with no way out but browser back / force quit | P1 |
| A4 | Consistent terms, icons, layouts, and behaviors across the product | Same action labeled differently on two screens | P2 |
| A5 | Errors are prevented structurally, not just validated after | Free-text field where a picker would eliminate the error class | P2 |
| A6 | Options are shown, not recalled — no dependence on memory across steps | User must remember a code from step 2 to complete step 5 | P2 |
| A7 | Shortcuts and accelerators exist for repeat users | Frequent multi-step task with no saved state, template, or shortcut | P3 |
| A8 | Every element earns its place; no decorative clutter competing with the task | Primary CTA competing with 4+ equally weighted elements | P2 |
| A9 | Error messages state what happened, why, and the next step, in plain language | "Something went wrong. Try again." with no recovery path | P1 |
| A10 | Help is contextual and findable at the point of confusion | Documentation exists only in a separate site with no in-product entry | P3 |
| A11 | Destructive actions are reversible or require deliberate confirmation | One-tap permanent delete with no undo | P0 |
| A12 | The user, not the system, is in control — no unexpected auto-advance or forced paths | Auto-submitting form, hijacked scroll, unskippable sequence | P1 |

---

## B. Cognitive Load & Decision Design

| ID | Check | Failure signal | Default |
|---|---|---|---|
| B1 | **Fitts** — primary targets are large and near the likely pointer/thumb origin | Main CTA is small and in the hardest-to-reach corner | P2 |
| B2 | **Hick** — choices are chunked, staged, or defaulted; no undifferentiated long lists | 12+ equal-weight options presented simultaneously at a decision point | P2 |
| B3 | **Miller** — grouped items stay within ~5–9 per cluster | Navigation with 15 flat, ungrouped items | P2 |
| B4 | **Jakob** — conventional patterns behave conventionally | Logo doesn't link home; hamburger opens something unexpected | P2 |
| B5 | **Tesler** — unavoidable complexity is absorbed by the system, not pushed to the user | User asked to compute, format, or reformat something the system could derive | P2 |
| B6 | **Doherty** — interactions respond within 400ms, or show progress | Perceptible dead time with no feedback | P1 |
| B7 | **Von Restorff** — exactly one element per view is visually dominant | Three "primary" buttons on one screen | P2 |
| B8 | **Peak–End** — flow endings are satisfying and clearly closed | Successful submission ends on a blank screen with no confirmation | P2 |
| B9 | **Goal-gradient / Zeigarnik** — multi-step flows show progress and remaining effort | Unbounded wizard with no step count | P2 |
| B10 | **Pareto** — the top 20% of features get the most prominent placement | Rarely used admin action occupies prime real estate | P3 |
| B11 | Reading level and information density suit the audience | Dense expert jargon in a consumer onboarding flow | P2 |

---

## C. Visual Design & Hierarchy

| ID | Check | Failure signal | Default |
|---|---|---|---|
| C1 | Visual hierarchy matches task priority — the most important thing looks most important | Eye lands on a banner before the primary action | P2 |
| C2 | Alignment is systematic; elements share edges and a consistent grid | Ragged left edges, off-grid components, inconsistent gutters | P3 |
| C3 | Spacing follows a scale (e.g. 4/8pt) and is applied consistently | Arbitrary values: 13px here, 17px there | P3 |
| C4 | Proximity groups related items and separates unrelated ones | Label sits closer to the wrong input than its own | P2 |
| C5 | Typographic scale is limited and intentional; ≤3 families, defined weights | Six font sizes within one card, mixed families | P3 |
| C6 | Line length 45–75 characters; line height 1.4–1.6 for body text | Full-width 140-character paragraph lines | P2 |
| C7 | Color is systematic and semantic — success/warning/error/info are consistent | Red used both for errors and for a brand accent | P2 |
| C8 | White space is used deliberately; no wall-to-wall density without reason | Zero breathing room around dense content blocks | P3 |
| C9 | Elevation/shadow/layering communicates real hierarchy, not decoration | Random shadow depths with no z-order logic | P3 |
| C10 | Iconography is consistent in style, weight, grid, and metaphor | Mixed outline and filled icons in one toolbar | P3 |
| C11 | Imagery is purposeful, optimized, and consistent in treatment | Generic stock photos with mismatched crops and color | P3 |
| C12 | Gestalt principles are respected — grouping, similarity, closure, common region read correctly | Card boundaries imply grouping that contradicts the actual relationships | P2 |
| C13 | Brand expression is present but never at the cost of clarity | Custom styling makes a button unrecognizable as a button | P2 |

---

## D. Interaction & State Design

| ID | Check | Failure signal | Default |
|---|---|---|---|
| D1 | All interactive states are designed: default, hover, focus, active, disabled, loading, error, selected | Buttons with no visible pressed or focus state | P1 |
| D2 | **All eight screen states exist**: ideal, empty, first-run, loading, partial, error, offline, maximum-data | Empty state is a blank white screen | P1 |
| D3 | Empty states explain what belongs there and offer the action to fill it | "No results" with no suggestion or reset | P2 |
| D4 | Loading uses skeletons or optimistic UI, not spinners on full pages | 4-second full-page spinner | P2 |
| D5 | Affordances are unambiguous — clickable looks clickable, disabled looks disabled | Flat text that is secretly a link; disabled state indistinguishable from enabled | P1 |
| D6 | Feedback is immediate and proportional to the action | Save with no confirmation of any kind | P1 |
| D7 | Animation is purposeful, 150–400ms, with appropriate easing | Decorative 1.2s transition blocking the task | P3 |
| D8 | `prefers-reduced-motion` is respected | Parallax and large motion play regardless of OS setting | P1 |
| D9 | Destructive actions have undo (preferred) or confirmation naming the consequence | "Are you sure?" with no statement of what is lost | P1 |
| D10 | Work in progress is preserved — autosave, draft recovery, state restoration | Navigating away silently discards 10 minutes of input | P0 |
| D11 | Smart defaults are pre-selected for the most common case | Every field blank when 90% of users pick the same value | P2 |
| D12 | Direct manipulation where natural — drag, resize, inline edit | Requires a modal round-trip to change one value | P3 |
| D13 | No dead ends: every error, empty, and edge state offers a forward path | 404 with no navigation or search | P1 |

---

## E. Information Architecture & Navigation

| ID | Check | Failure signal | Default |
|---|---|---|---|
| E1 | Current location is always indicated | No active-state highlighting in navigation | P2 |
| E2 | Labels are predictive — users can guess the destination content | Vague labels: "Solutions," "More," "Resources" | P2 |
| E3 | Categories are mutually exclusive and collectively exhaustive | Items that plausibly belong in three sections | P2 |
| E4 | Primary tasks are reachable in ≤3 deliberate steps | Core action buried 5 levels deep | P2 |
| E5 | Search exists where content volume demands it, with filters and a useful zero-state | Search returns "0 results" with no suggestions or query relaxation | P2 |
| E6 | Hierarchy depth is shallow and breadth is chunked | 8-level nested menu | P2 |
| E7 | Back/breadcrumb behavior is predictable and matches platform expectations | Back exits the app from mid-flow | P1 |
| E8 | Naming is consistent between navigation label, page title, and heading | Nav says "Billing," page says "Payments" | P3 |

---

## F. Web-Specific *(apply only if platform includes web)*

| ID | Check | Failure signal | Default |
|---|---|---|---|
| F1 | Responsive across 320px → 1920px+ with no horizontal scroll or clipping | Layout breaks or overflows at 375px | P1 |
| F2 | Core content and primary action work without JavaScript or on slow networks | Blank page until a 2MB bundle loads | P2 |
| F3 | Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1 | Content shifts after load, causing misclicks | P1 |
| F4 | Value proposition and primary action are clear in the first viewport | User must scroll to learn what the product does | P2 |
| F5 | Semantic HTML: one h1, logical heading order, landmarks, lists, native buttons/links | `<div onclick>` used as a button | P1 |
| F6 | Links navigate, buttons act — and each looks like what it is | "Button" that changes the URL, or a link that submits | P2 |
| F7 | Forms: single column, top-aligned labels, correct `type` and `autocomplete`, inline validation on blur | Validation fires per keystroke or only on submit | P2 |
| F8 | URLs are readable, stable, shareable, and reflect state where appropriate | Filtered view cannot be shared or bookmarked | P3 |
| F9 | Page titles, meta descriptions, alt text, and structured data are present and accurate | Duplicate or missing `<title>` across pages | P3 |
| F10 | Scanning pattern supported (F-pattern for content, Z for landing) | Key information placed where no one looks | P3 |
| F11 | Works across current Chrome, Safari, Firefox, and Edge | Feature silently fails in Safari | P1 |
| F12 | Dark mode and forced-colors mode render legibly if supported | Text disappears in dark mode | P2 |

---

## G. Mobile-Specific *(apply only if platform includes iOS/Android)*

| ID | Check | Failure signal | Default |
|---|---|---|---|
| G1 | Touch targets ≥44×44pt (iOS) / 48×48dp (Android), with ≥8dp spacing | Icon-only buttons at 24px, adjacent | P1 |
| G2 | Primary actions sit within the natural thumb arc; destructive actions do not | Main CTA in the top-left corner | P2 |
| G3 | One-handed use is possible for core tasks | Reaching the send button requires two hands | P2 |
| G4 | Safe areas respected — notch, dynamic island, home indicator, rounded corners | Content hidden behind the gesture bar | P1 |
| G5 | Platform conventions followed (HIG / Material) for navigation, sheets, back behavior | Android hardware/gesture back does nothing or exits the app | P1 |
| G6 | Offline and poor-connectivity behavior is designed: cached, queued, communicated | Infinite spinner on airplane mode | P1 |
| G7 | Permissions requested just-in-time with a plain rationale, never all at launch | Location + contacts + notifications prompt on first open | P1 |
| G8 | Notifications are relevant, timed, batched, and user-controllable | Daily marketing push with no granular settings | P2 |
| G9 | Rotation and multitasking preserve state | Rotating clears the form | P1 |
| G10 | Onboarding is short, skippable, and demonstrates value before asking for anything | 6 mandatory screens before any use | P2 |
| G11 | Gestures are discoverable and never the only path to a function | Swipe-only delete with no visible alternative | P2 |
| G12 | Respects OS text size, bold text, and reduced motion settings | Layout breaks at largest Dynamic Type setting | P1 |
| G13 | Cold start and time-to-first-meaningful-screen are acceptable (<2s target) | 5s splash on every launch | P2 |
| G14 | Haptics are meaningful and sparing | Haptic on every scroll tick | P3 |
| G15 | Deep links resolve correctly and preserve back stack | Deep link opens home instead of the target | P2 |

---

## H. Desktop / Enterprise Software *(apply only if platform includes desktop apps)*

| ID | Check | Failure signal | Default |
|---|---|---|---|
| H1 | Full keyboard operability: logical tab order, visible focus, no traps | Modal cannot be closed or navigated by keyboard | P1 |
| H2 | Shortcuts for frequent actions, discoverable in menus/tooltips | Power task requires 6 mouse clicks with no shortcut | P2 |
| H3 | Information density matches expert needs — not artificially spacious | Data table showing 4 rows per screen for a monitoring tool | P2 |
| H4 | Bulk operations: multi-select, select-all, batch actions | 200 items must be deleted one at a time | P1 |
| H5 | Large datasets handled via virtualization, pagination, or lazy loading | UI freezes at 10k rows | P1 |
| H6 | Long operations are non-blocking, with progress and cancel | Modal spinner locks the app for 30s with no cancel | P1 |
| H7 | Window state, layout, and session position are restored on reopen | App reopens at defaults every time | P2 |
| H8 | OS conventions honored (menu bar, ribbon, native dialogs, drag & drop) | Custom file picker instead of the system one | P3 |
| H9 | Right-click context menus provide relevant advanced actions | No context menu anywhere | P3 |
| H10 | Permissions and roles are reflected clearly — hidden or explained, not silently failing | Button visible but silently does nothing without permission | P1 |
| H11 | Multi-window / multi-monitor / resize behavior is sane | Layout breaks below a certain window width with no reflow | P2 |

---

## I. Accessibility (WCAG 2.2 AA baseline)

Treat every item here as **P1 minimum**; failures affecting task completion are **P0**.

| ID | Check | Failure signal |
|---|---|---|
| I1 | Text contrast ≥4.5:1 (normal), ≥3:1 (large ≥18.66px/24px); UI components and graphics ≥3:1 | Light gray placeholder text at 2.8:1 |
| I2 | Meaning is never conveyed by color alone | Required fields marked only in red |
| I3 | All functionality is keyboard-operable with no traps | Custom dropdown unreachable by keyboard |
| I4 | Focus indicator is always visible and has sufficient contrast | `outline: none` with no replacement |
| I5 | All images, icons, and media have appropriate text alternatives; decorative images are hidden | Icon-only button with no accessible name |
| I6 | Form inputs have programmatically associated labels; errors are announced | Placeholder used as the only label |
| I7 | Heading structure is logical and sequential | Skips from h1 to h4; headings used for styling |
| I8 | ARIA used only where native semantics fall short, and used correctly | `role="button"` on a `<div>` with no keyboard handler |
| I9 | Content reflows at 200% zoom / 320px width without loss of function | Horizontal scrolling required to read text |
| I10 | Motion, autoplay, and flashing respect user settings; nothing flashes >3×/sec | Autoplaying video with sound |
| I11 | Time limits are adjustable, extendable, or absent | Session expires mid-form with no warning |
| I12 | Screen reader pass completed on the primary flow (VoiceOver / TalkBack / NVDA) | Not tested |
| I13 | Touch/pointer alternatives exist for complex gestures; drag has a non-drag path | Reorder possible only by drag |
| I14 | Target size ≥24×24 CSS px minimum (WCAG 2.2), 44px recommended | Dense inline icon controls |

---

## J. Content & UX Writing

| ID | Check | Failure signal | Default |
|---|---|---|---|
| J1 | Buttons name the action and its outcome | "OK" / "Submit" where "Save changes" is clearer | P3 |
| J2 | Key information is front-loaded in headings and first sentences | Value buried in paragraph 3 | P2 |
| J3 | Terminology is consistent across UI, docs, and support | Same object called "project," "workspace," and "board" | P2 |
| J4 | Error copy is specific, blameless, and actionable | "Invalid input" | P1 |
| J5 | Tone is consistent and appropriate to context — never jokey during failure or data loss | Playful copy on a payment failure | P2 |
| J6 | Copy is localization-ready: no concatenated strings, room for ~30% text expansion, RTL-safe layout | Fixed-width button that clips German text | P2 |
| J7 | Numbers, dates, currency, and units are formatted per locale | US date format shown to EU users | P3 |
| J8 | Reading level appropriate; sentences short; active voice | Legalese in a consumer flow | P3 |

---

## K. Trust, Ethics & Privacy

| ID | Check | Failure signal | Default |
|---|---|---|---|
| K1 | No dark patterns: confirmshaming, roach motel, forced continuity, hidden costs, disguised ads, preselected upsells | "No thanks, I hate saving money" | P0 |
| K2 | Cancellation and deletion are as easy as signup | Signup in-app, cancellation by phone only | P0 |
| K3 | Total cost is visible before commitment | Fees appear only on the final step | P1 |
| K4 | Consent is opt-in, granular, and honestly defaulted | Pre-ticked marketing consent | P0 |
| K5 | Data collection is minimal and its purpose is explained at point of collection | Phone number required with no stated reason | P1 |
| K6 | Urgency and scarcity claims are truthful | Fake countdown that resets on reload | P0 |
| K7 | Automation and AI-generated content are disclosed, explainable, and overridable | AI decision presented as fact with no source or override | P1 |
| K8 | Sensitive actions (payment, sharing, permissions) show clear consequence before confirming | Share button that silently makes content public | P0 |
| K9 | Engagement mechanics don't exploit attention by default | Infinite scroll + autoplay + streaks with no controls | P2 |

---

## L. AI & Agentic Interface Patterns *(apply if the product includes AI features)*

| ID | Check | Failure signal | Default |
|---|---|---|---|
| L1 | AI-generated output is visually and textually distinguishable from user or verified content | Model output styled identically to authoritative data | P1 |
| L2 | Confidence and uncertainty are communicated; the system doesn't assert what it doesn't know | Hedge-free answers on low-confidence outputs | P1 |
| L3 | Sources and reasoning are inspectable where the output is consequential | Claim with no citation or trace | P1 |
| L4 | User can edit, regenerate, reject, or roll back any AI action | One-way AI edit applied directly to user data | P0 |
| L5 | Autonomous actions require proportional consent — higher stakes, more explicit approval | Agent sends email or spends money without confirmation | P0 |
| L6 | Streaming/long-running responses show progress and are interruptible | No stop button during a 60s generation | P1 |
| L7 | Capability boundaries are set upfront; failure is graceful and honest | Confident fabrication instead of "I can't do that" | P1 |
| L8 | Input affordances teach what to ask — examples, suggestions, scoped prompts | Bare text box with no guidance | P2 |
| L9 | Latency is masked with useful interim feedback, not a bare spinner | Blank state for 15s | P2 |
| L10 | Data handling is disclosed: what is sent, retained, and used for training | No statement anywhere | P1 |
| L11 | Undo/audit trail exists for agent-taken actions | No record of what the agent changed | P1 |
| L12 | Graceful handoff to a human or deterministic path when the AI fails | Dead end after two failed attempts | P2 |

---

## M. Cross-Cutting Consistency & System Health

| ID | Check | Default |
|---|---|---|
| M1 | Components come from a design system; one-off variants are justified | P3 |
| M2 | Design tokens (color, spacing, type, radius, motion) are used rather than hard-coded values | P3 |
| M3 | The same task feels the same across web, mobile, and desktop where the user crosses platforms | P2 |
| M4 | Patterns are internally consistent: same modal type for same purpose, same table behavior everywhere | P2 |
| M5 | New work doesn't fork existing patterns without a documented reason | P3 |

---

## N. Edge Cases to Deliberately Probe

Run each primary flow against these conditions and record behavior. **MUST ATTENTION** record an explicit result for each — an unprobed condition is `NOT VERIFIABLE`, never an implied pass.

- First-time user, zero data
- Maximum data — longest name, 10k rows, 50 attachments
- Zero results after filtering
- Slow 3G / high latency
- Fully offline, then reconnecting mid-action
- Server error 500 mid-submission
- Expired session or revoked permission mid-task
- Duplicate submission / double-tap on the primary action
- Interruption: phone call, backgrounding, browser tab discard
- Copy-paste and browser autofill into every field
- Largest OS text size + 200% zoom
- Keyboard-only completion, start to finish
- Screen reader completion, start to finish
- RTL locale and a longest-translation locale
- Concurrent edit by two users on the same object

---

## O. Report Output Format

The agent returns exactly this structure.

```markdown
# Design Review — [Product / Flow] — [Date]

## Context
Platform · Users · Primary task · Artifacts reviewed · Scope
Known gaps: [what was unavailable, and which findings are therefore lower confidence]

## Verdict
[Ship / Ship with fixes / Do not ship] — one paragraph of reasoning.

## What works
2–4 specific strengths worth preserving. Cite locations.

## Findings

### P0 — Critical
**[ID] Title**
- Location: [screen / element / file:line]
- Evidence: [what was observed] — [MEASURED | OBSERVED | HEURISTIC]
- Impact: [who is affected, and how]
- Principle: [checklist ID]
- Fix: [specific, implementable recommendation]

### P1 — High
[same structure]

### P2 — Medium
[same structure, may be condensed to one line each]

### P3 — Low
[bulleted list]

## Open questions for the team
[Where intent was unclear and a finding was withheld]

## Coverage
| Section | Checked | Passed | Failed | Not verifiable |
|---|---|---|---|---|
| A Heuristics | 12 | | | |
| B Cognitive | 11 | | | |
| ... | | | | |
```

---

## P. Quick Triage Pass (10 minutes)

When a full review isn't possible, run only these. They catch the majority of serious defects.

1. Can a new user complete the primary task without help? *(A, E)*
2. Does every action produce visible feedback within 400ms? *(A1, B6, D6)*
3. Do the empty, loading, and error states exist and offer a way forward? *(D2, D13)*
4. Is the primary action obvious, singular, and reachable? *(B7, C1, G2)*
5. Does text meet 4.5:1 contrast and is focus visible? *(I1, I4)*
6. Can the whole flow be completed by keyboard? *(I3, H1)*
7. Do targets meet 44/48px on touch? *(G1)*
8. Is destructive action reversible? *(A11, D9, D10)*
9. Does it hold up at 320px and at 200% zoom? *(F1, I9)*
10. Are there any dark patterns? *(K1–K8)*

---

## Q. Scoring (optional)

Per section: `score = passed / (checked − N/A − not verifiable)`.

Weight for an overall figure:

| Section | Weight |
|---|---|
| I Accessibility | 20% |
| A Heuristics | 15% |
| D Interaction & states | 15% |
| K Ethics & trust | 12% |
| B Cognitive load | 10% |
| E Information architecture | 8% |
| Platform section (F/G/H) | 8% |
| C Visual design | 6% |
| J Content | 4% |
| M Consistency | 2% |

Any P0 caps the overall grade at **Fail**, regardless of score. Report the score alongside findings, never instead of them — a number without evidence is not a review.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a repeatable, evidence-backed front-end review whose findings are ranked by real severity — every one carrying location, observation tag, impact, checklist ID, and fix.

**IMPORTANT MUST ATTENTION** gather §0.1 context FIRST (platform, user, task, metric, constraints, scope, artifacts). Fewer than four known → state the gap at the top and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.

**IMPORTANT MUST ATTENTION** walk the sections in order: §A heuristics → §B cognitive → §C visual → §D interaction + the eight screen states → §E IA → §F/§G/§H (platform-conditional) → §I accessibility → §J content → §K ethics → §L AI (conditional) → §M consistency → §N edge-case probes → §O report → §P triage → §Q scoring — why: a section skipped in the long middle silently becomes an unreported defect class.

**IMPORTANT MUST ATTENTION** evidence or nothing — cite a location for every finding, and NEVER invent a measurement. Unmeasurable from the given artifact → `NOT VERIFIABLE`, and tag every finding `MEASURED` / `OBSERVED` / `HEURISTIC`.

**IMPORTANT MUST ATTENTION** apply this checklist ONLY to changes with a user-facing front-end surface — a back-end-only diff is `N/A`, stated once. NEVER pad a clean section; report "no issues found" and cap at the top 10 by severity unless a full audit was asked for.

**IMPORTANT MUST ATTENTION** propose a concrete fix for every P0 and P1 — a diagnosis without a remedy is half a review.

**IMPORTANT MUST ATTENTION** report a defect ONCE — where a check here restates a `UI-*` or `DD-*` clause, use whichever ID the consuming skill already uses; NEVER emit two findings for one defect.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "I can't measure contrast from a screenshot, I'll estimate" | That is `NOT VERIFIABLE`. An invented number is a fabricated finding — the one failure this protocol exists to prevent. |
| "The section had nothing wrong, I'll skip reporting it" | Report "no issues found." A silent section is indistinguishable from an unchecked one. |
| "This deviates from the checklist, so it's a defect" | Check intent first — project design-system docs and ADRs outrank this file. A documented convention is not a defect. |
| "I found 30 issues, I'll list them all" | Cap at the top 10 by severity. An unranked list moves no decision. |
| "It's a small diff, the checklist is overkill" | Then run §P — 10 checks. Small diffs ship P0s too. |
