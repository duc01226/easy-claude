# `/work-item --mode=review` — `--type=design` checklist and output template

Read this full reference for `--type=design`. Other UI-bearing artifact types read only Shared UI protocol bodies, stopping before Design-only UI/UX principles. Scoring, verdict rule, M1-M7 gate and the validated-fix loop stay in `references/mode-review.md`; the M1-M7 criteria live in `.claude/skills/shared/m1-m7-gates.md`.

## Contents

- [Checklist — Design Spec Review](#checklist--design-spec-review)
- [Output template](#output-template)
- [Shared UI protocol bodies](#shared-ui-protocol-bodies)
- [Design-only UI/UX principles](#design-only-uiux-principles)

## Checklist — Design Spec Review

| #   | Check                                                                                                                                         | Presence                                            | Quality Depth                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **All component states covered (default, hover, active, disabled, error, loading)** — spec defines visual behavior for all interaction states | Are all 6 states defined?                           | Are edge-case states (error, loading) as fully designed as the default state, or sketched? An undesigned error state will be improvised in implementation.                                      |
| 2   | **Design tokens specified (colors, spacing, typography)** — specific token values are called out, not ad-hoc values                           | Are token references present instead of raw values? | Are tokens from the project's token system, or are new values introduced? New values outside the token system break design consistency silently.                                                |
| 3   | **Responsive behavior defined** — how the component adapts across breakpoints is documented                                                   | Are breakpoint behaviors defined?                   | Are ALL breakpoints covered, or only desktop and mobile? Tablet-specific layouts are the most frequently omitted. Are content truncation / overflow behaviors specified?                        |
| 4   | **Accessibility requirements noted** — WCAG-relevant requirements (color contrast, keyboard nav, ARIA) are documented                         | Are accessibility notes present?                    | Are requirements specific (WCAG level, contrast ratio) or vague ("should be accessible")? Vague accessibility notes produce non-compliant implementations. Is keyboard navigation flow defined? |
| 5   | **Interaction patterns documented** — animations, transitions, and user interaction flows are specified                                       | Are interaction behaviors described?                | Are timing and easing values specified? Is behavior defined for both forward and reverse interactions (e.g., open AND close)? Unspecified interactions are implemented inconsistently.          |
| 6   | **Linked from the Feature Spec** — the design-spec path is recorded in the governing Feature Spec frontmatter `design_spec:` key so the spec stays the navigable hub | Is the design-spec path present in the Feature Spec frontmatter `design_spec:` (or `mockup:`) key? | Does the recorded path resolve to THIS design-spec, and does the design-spec deepen the spec's tech-agnostic §6 interaction surface (same UX-role view names / observable states) rather than diverge from it? An unlinked design-spec is an orphan — FAIL. Contract: `SYNC:ui-intent-layer` (full body in Shared UI protocol bodies below). |
| 7   | **Journey Report present and evidence-grounded (`UX-1`)** — the design spec/mockup opens with a Journey Report (frame · actors + job statements · ranked main journeys · per-journey step table · derived requirements · assumptions) before any design section | Is a Journey Report present, placed before the design plan/wireframe/tokens? | Is each actor, journey and step tagged `SOURCED (<location>)` or `INFERRED`, and do the SOURCED locations resolve (spec §6.5, story/AC, business rule, existing screen)? Is an INFERRED primary actor, main job or success outcome recorded as confirmed with the user, or as `INFERRED — unconfirmed (no question tool)` in the assumptions and hand-off? Are the main journeys ranked with a stated reason, and does each step name the information needed, the rule and the failure → recovery path? Depth must match scope (catalog `.claude/docs/ux-journey-process.md` §10) — a new flow with one happy-path journey FAILS. |
| 8   | **Design-authority read recorded (`UX-2`)** — the artifact records `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)` | Is the record present? | Do the listed paths exist and cover the project's design principles, design system, styling conventions and related existing UI that `docs/project-config.json` and its reference docs resolve? Does the artifact reuse house tokens/components instead of inventing ones the project already defines? A missing record, or an `N/A` contradicted by an existing design-system doc, FAILS. |
| 9   | **Views trace to journey steps (`UX-3`)** — every view names the journey steps it hosts and every main-journey step lands on a view | Does each view list its hosted steps? | Is there a view that hosts no step (decoration) or a main-journey step no view hosts? Does each container fit its step's task (a long multi-section task in a dialog FAILS)? |
| 10  | **Per-view information priority (`UX-4`)** — each view tiers its items and actions Primary / Secondary / On demand / Not here from the need-at-the-decision × frequency × cost-of-missing score | Is a tiered priority recorded per view? | Is there ONE primary action per view and does it match the journey's next step? Does any high cost-of-missing item sit in On demand? Does the layout implement the rank, or reshuffle it? Unscored "everything is important" priority FAILS. |
| 11  | **Journey traceability matrix + walkthrough (`UX-8`)** — one row per main-journey step: view → element → information tier → rule → states → walkthrough result | Is the matrix present with a walkthrough result per step? | Does the matrix expose any **unserved step** (no view/element) or **orphan element** (traces to no step, need or rule) left unfixed or unjustified? Were the four walkthrough questions answered (knows the step is needed · sees the action · links it to the goal · sees progress), or is every row a rubber-stamp PASS? Either defect FAILS. |
| 12  | **Interaction cost + wayfinding (`UX-9`, `UX-10`)** — per main journey: steps · clicks · view changes · fields · decisions recorded vs a baseline; per view: current location, destinations in user words, back/exit keeping data, no dead ends | Are the counts and the wayfinding check present? | Does any journey add cost without a reason, or any view trap the user or hide the primary tier below the first viewport? |
| 13  | **UI/UX Gate Report (`UX-11`)** — one row per gate family (`UX-*`, applicable `UI-*`, `AD-*`, `DD-*`, `CL-*`, UI copy) with result + evidence | Is every gate family listed? | Is any row `PASS` without evidence, or an open `FAIL`? |
| 14  | **Action forms and attention (`AD-1`–`AD-6`)** — each view names its ONE primary commit and every other action's form; groups, row actions and the copy budget are specified with the `AD-5` counts | Are action forms and counts recorded per view? | Is there more than one filled primary, a ragged group, a filled button per row, an unnamed or untooltipped icon, a row over one meta line, mixed tile sizes in a collection grid, or an action off its content edge (`AD-6`)? |

**A `PROPOSED — the explore pick decides` §0 colour and type** (a design spec drafted before an option-board mock-up, `VO-1`) is a valid pending state: measure its values as a proposal; never flag it as missing or settle it in a fix.

**Journey-first checks 7–13 run BEFORE the UI/UX Design Principles pass** — the `UI-*` clauses judge a surface whose purpose these checks define. Check 14 runs after them. Every finding cites `UX-<clause>` + artifact section:line and a `SYNC:severity-rubric` severity folded into the existing verdict; a missing Journey Report, design-authority record or traceability matrix fails its check outright. A mockup artifact (e.g. from `/work-item --mode=mockup`) is reviewed with the same checks against its own Journey Report or the one it links. **Skip ONLY** when the design artifact has no user-facing surface — state the reason.

### UI/UX Design Principles Pass — `--type=design` ONLY (9 dimensions)

> **Scope gate:** this pass applies to `--type=design` and to NOTHING else. `--type=task`, `--type=story`, and `--type=spec-tests` are UNAFFECTED — their checklists, tallies, and verdicts are unchanged. A design artifact for a feature with no user-facing surface skips the whole pass with the reason stated.

The 40 clauses of `SYNC:ui-ux-design-principles` (full body in Design-only UI/UX principles below; read it before this pass) bind the design-spec path in the **REVIEW** role: each clause is a fail-condition against the ARTIFACT — *does the spec SPECIFY the decision this clause demands, at a depth an implementer could not get wrong?* The missing specification is the finding; the reviewer names the gap, never supplies the value.

Run **NINE focused passes over the artifact — one dimension at a time**, never a simultaneous sweep (a simultaneous sweep degenerates into the presence-checking this skill's Adversarial Review Mindset already forbids). Answer each `Think:` prompt from first principles before looking for the gap.

**Every finding:** `UI-<clause>` + `file:line` (artifact section + line) + severity per `SYNC:severity-rubric` already in force (Critical/High/Medium/Low), folded into the EXISTING verdict machinery — a clause gap that leaves a Required check unmet drives that check to fail (**FAIL**); a gap that only weakens depth lands as a Recommended miss or an Action Item under **NEEDS WORK**. No new scale, no new verdict.

| #   | Dimension                 | Clauses            | `Think:`                                                                                                                                                                                                                                              |
| --- | ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Does the spec name ONE focal element per view, or leave first-read priority to the implementer? Is grouping expressed as whitespace or as nested boxes? Are the empty, loading and error states specified as fully as the populated state, or sketched? |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Does the spec reference a fixed 6-step scale with named families/weights (max 2 families, 3 weights each), or ad-hoc sizes? Are body size (16px web, 17px mobile, never below 14px), measure (45-75 characters), and leading (1.5 body, 1.1-1.2 display) stated or assumed? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | Are contrast ratios written as measured numbers (4.5:1 text, 3:1 UI edges) or as the word "accessible"? Does any state carry meaning by colour alone with no icon/label/position pair? Is dark mode specified as its own surface treatment, or implied as an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Is a single base unit (4px or 8px) declared, with every gap a multiple of it? Is spacing assigned to containers rather than children? Are breakpoints justified by where the layout fails, or copied from device names?                              |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | Is a response under 100ms specified for every action? Are all 5 states plus loading enumerated per component? Is undo offered where the spec calls for a confirmation? Are motion duration/easing (150-250ms, ease-out) and reduced-motion behaviour written down? Is the focus ring's appearance specified rather than removed? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Does each specified view answer where-am-I / what's-here / where-next? How many top-level destinations does the IA declare (max 5)? Are labels drawn from user vocabulary or internal naming? Does every state have a URL or a defined back path?    |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Does the spec justify each field's existence today? Are labels specified as persistently visible rather than placeholders? Are validation timing (on blur), error placement, and remediation wording defined? Are keyboard type/autocomplete/autocapitalise declared per field? Is data preservation across error, navigation and refresh specified? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | Are hit targets specified at >=44x44pt with 8px separation independent of icon size? Where does the spec place primary actions relative to the thumb zone? Is every gesture given a tappable equivalent? Are safe areas and keyboard avoidance addressed? _(No touch surface in the artifact → skip with the reason stated.)_ |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | Does the spec choose skeleton vs spinner deliberately per surface? Is optimistic update with a VISIBLE rollback specified? Is reserved space defined for every async or media element so nothing shifts? Are offline, timeout and retry specified as designed states rather than left as edge cases? |

**No double-counting** with Design Spec checks 1-6: check 1 (6 component states) meets `UI-5.2`/`UI-1.5`; check 2 (design tokens) meets `UI-2.5`/`UI-4.1`/`UI-3.2`; check 3 (responsive) meets `UI-4.4`/`UI-8.*`; check 4 (accessibility) meets `UI-3.1`/`UI-3.3`/`UI-5.5`; check 5 (interaction patterns) meets `UI-5.4`/`UI-5.1`; check 10 (information priority) meets `UI-1.1`. Where they meet, emit ONE finding carrying BOTH citations at the HIGHER severity — never two findings for one gap.

**Precedence:** the project design-system / SCSS / token docs **OUTRANK** these clauses — a spec following the project's own scale, unit, breakpoints, or token pairs SATISFIES the clause. A genuine conflict is surfaced to the user with both sides, NEVER resolved silently.

## Output template

```
## Artifact Review

**Artifact Type:** [task | Story | Design | Test Spec]
**Artifact:** [Reference/title]
**Artifact identity:** {path} · sha256:{hex digest of the file bytes}
**Date:** {date}
**Verdict:** READY | NEEDS WORK

### Checklist Results
- [pass] [Item] — [evidence]
- [fail] [Item] — [what's missing/wrong]

### Action Items (if NEEDS WORK)
1. [Specific actionable item]
```


## Shared UI protocol bodies

Read this section through **Design-only UI/UX principles** (exclusive) for any UI-bearing artifact. These full bodies preserve their own scope, precedence and skip rules. Other artifact types keep their own checklist and scoring; this section does not select the design rubric.

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. A stated direction is a pin (explicit tokens or hex values, named fonts, a stated "must use") or the owner's pick among the options (`VO-1`, `VO-7` of `SYNC:visual-option-discovery`); adjectives and moods alone are a target feel to explore, not a stated direction. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity; re-deciding it per feature is incoherence. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular, never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons; an unexplained decision is a default that arrived unnoticed. Defaults hide in infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: a plan taken straight to code reproduces the default it came from.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, set a real scale with intentional weights, widths and spacing; a headline is an ACTIVE part of the design. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. Every device must tell the reader something whitespace would not, or it goes. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (uniform card size, gap and density is no one deciding); articulable proportions; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, workaround-only `calc()` values, and absolute positioning to escape layout flow are lies; the correct answer is simpler than the hack). Review screenshots where the environment supports it. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q` plus §R, ~180 checks with failure signals and default severities; worked calibration cases in `.claude/docs/design-review-calibration.md`): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (later) · `P4` note. Translate to other dialects (BLOCKED/WARN, Critical–Low, BLOCKING/ADVISORY) ONLY through the §0.3 severity map. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order — over whole SURFACES, not files (§0.5).** Map changed files to the pages/views/dialogs they render into, reconstruct each surface's composition (component tree + style origins; render when it can run, else `ENVIRONMENT-BLOCKED`), then sweep: §A core usability heuristics · §B cognitive load & surface complexity (B12–B16: surface load, progressive disclosure, one job per view, the project's complexity budget, the copy budget) · §C visual design & hierarchy (C14–C20: one primary commit, uniform action groups, list-row actions, icon-only controls, regular grids, alignment and width, placeholder variety) · §D interaction and relevant product states · §E information architecture & container fit (E9–E11: dialog vs full view vs stepped flow vs side panel vs inline) · **§F web / §G mobile — conditional on platform; §H expert & data-heavy use — conditional on usage, not platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · **§R forms & data entry — conditional on input: fill the Field Necessity Matrix first** · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support. Cluster a defect repeated across surfaces into ONE finding; calibrate against `.claude/docs/design-review-calibration.md`.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is there one obvious primary action — every other action in a lighter form, no ragged button group — reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M10) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, whether shared behavior is duplicated without a reason, and that no control is implemented twice (`M10`). Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Each UI phase MUST name, per new or reshaped view: its primary task, its container (E9), its information priority (what is shown now / later / never here), and — for input — the inputs required at creation vs deferred (§R1–R2). A plan review treats a UI phase missing these as a finding against the checklist IDs it leaves unbound. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B16, action forms C14–C20, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`AD-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:ux-journey-gate -->

> **[BLOCKING] Journey-first UX gate (`UX-1`–`UX-11`) — binds on ANY task that generates, specifies, plans, mocks up or reviews a user-facing surface.** Catalog (process, templates, methods, sources): `.claude/docs/ux-journey-process.md`. Each clause is a CHECK: record `PASS` / `FAIL → fixed` / `N/A (reason)` with evidence; cite findings as `UX-<n>` + location.
>
> **Order is BLOCKING: (1) REPORT the main user journeys → (2) READ the project's design principles, design system and existing UI → (3) only then generate → (4) CHECK every UI/UX gate (`UX-11`).** No wireframe, mockup, design plan, token table or UI code before step 1's report exists.
>
> - `UX-1` **Journey Report first.** Frame (problem · business goal · success signal · constraints) · actors (context, expertise, frequency) with job statements · 3–5 main journeys ranked by frequency × value × risk × first-use · per journey a step table (intent · decision · information needed · business rule · response · failure → recovery) · derived requirements · assumptions. Evidence from spec, stories, business logic, existing UI — each claim `SOURCED (location)` or `INFERRED`; CONFIRM an inferred primary actor, main job or success outcome with the user; no question tool → record it as `INFERRED — unconfirmed (no question tool)` in the assumptions and hand-off and continue — never block.
> - `UX-2` **Design authority read before generating.** Project design principles, design system (tokens, components, patterns), styling conventions, design ADRs, existing related UI — record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`. Adopt house patterns; never invent what the project defines.
> - `UX-3` **Screens are journey steps.** Every view hosts ≥1 step and names its primary task; every main-journey step lands on a view; container fits the task (dialog only for short focused tasks).
> - `UX-4` **Important information first.** Per view, rank items by need-at-the-decision × frequency × cost-of-missing → Primary (the first read and first viewport: one focal point, ONE primary action = the journey's next step) · Secondary (visible, subdued) · On demand (progressive disclosure, always reachable) · Not here (owning view named). Front-load labels and headings so a scan of the first words finds the answer; never hide a high-cost-of-missing item on demand. Hierarchy implements the rank.
> - `UX-5` **Business rules become interaction.** Prevent before reporting: constraints, defaults, conditional visibility, permission-aware and state-driven actions, undo over confirm, confirm only the irreversible, async feedback; each step's failure and recovery path and each view's empty/loading/error states designed.
> - `UX-6` **Match the mental model.** User vocabulary · platform and house conventions · recognition over recall · few choices per decision · context carried across steps, never re-typed · accelerators for frequent experts.
> - `UX-7` **Low-fi before hi-fi.** Walk the main journeys on a structural sketch before the `DD-3` Design Plan and visual design.
> - `UX-8` **Walk the journeys.** Cognitive walkthrough per main journey on the result — does the user know the step is needed, see the action, link it to the goal, see progress? — plus a traceability matrix (step → view → element → tier → rule → states). Unserved step or orphan element = defect.
> - `UX-9` **Interaction cost per journey, measured.** Record per main journey: steps · clicks/taps · view changes · fields typed · decisions · waits — against the existing flow or the spec. Remove, default, merge or defer every interaction that does not advance the job; frequent journeys get the shortest path, rare ones may sit deeper. Click count alone is not the bar (the "3-click rule" is a myth): every click must be CONFIDENT — its label predicts the destination (information scent).
> - `UX-10` **Navigation and wayfinding.** Every view answers: where am I (current location marked), where can I go (labels in user words with strong scent), how do I get back or out (back/cancel/exit that keeps entered data). The navigation map has an entry for every journey, no dead ends or orphan views, works from a deep link, and keeps placement consistent; frequent destinations are one navigation action from where the journey starts.
> - `UX-11` **All UI/UX gates checked before hand-off.** Close every design output with a **UI/UX Gate Report**: one row per gate — `UX-1`–`UX-10` · `UI-1.1`–`UI-9.4` (floor, applicable clauses) · `AD-1`–`AD-6` (actions & attention) · `DD-1`–`DD-8` (identity) · `VO-1`–`VO-9` (when option discovery ran) · `CL-1`–`CL-6` (full sweep for a review, at least the `CL-5` triage otherwise) · UI copy — each `PASS` / `FAIL → fixed` / `FAIL — open` / `N/A (reason)` / `NOT VERIFIABLE` (never a guessed measurement) with evidence. An open `FAIL` blocks hand-off; an unlisted gate counts as not checked.
>
> **Depth scales with scope, never to zero:** tweak → 3–5 line journey note + the gate rows it touches · new/reshaped view → 1–2 journeys · new flow → full report · product → per capability. Recreation modes (screenshot/video) still infer and report the journeys and record violations the walk exposes. **Precedence:** accepted product decisions and the project's specs, design principles, design system and ADRs → the brief → these clauses; surface genuine conflicts to the user, NEVER resolve silently. **Sub-agents inherit nothing from this conversation:** a UI-bearing sub-agent brief carries the Journey Report and the Design Plan verbatim plus the design-system doc paths, or the leaf supplies its own defaults. **Skip ONLY** with no user-facing surface — state the reason.

<!-- /SYNC:ux-journey-gate -->

<!-- SYNC:ui-action-density-gate -->

> **[BLOCKING] Action & attention gate (`AD-1`–`AD-6`) — binds on ANY task that designs, mocks up, prototypes, implements or reviews a user-facing surface that offers actions or shows text.** Measurable checks: `.claude/docs/design-review-checklist.md` `B16` and `C14`–`C20`. Cite a finding by that check ID and report each defect ONCE (an unnamed icon is also `I5`; a one-tap irreversible delete is `A11`). The clauses are written for graphical surfaces; on any other surface (terminal, chat, voice, TV, embedded) apply each one to the platform's equivalent control, and record a clause with no equivalent as N/A with the reason.
>
> **Precedence:** accepted product decisions and the project's design system, component library and ADRs → the target platform's guidelines (for example its dialog button order and touch conventions) → the brief → these clauses. A documented house pattern is not a defect; surface a genuine conflict with both sides, never resolve it silently.
>
> - `AD-1` **One primary commit per view.** A view, a dialog, or one screenful of a long page — on a multi-panel expert screen, each independent region (`UI-1.1`) — holds at most ONE filled text button (the design system's highest-emphasis action style: filled, solid, contained or "primary"): the action that commits its main task (`UX-4`). Parallel options that each end in the same commit (pricing plans, offers to compare) count as one primary repeated per option, in one style and width; the same commit repeated in one screenful (a header and a hero call to action) counts once. Give the primary a fixed min-width so it never shrinks to its label. Every other action takes the lightest form that keeps its meaning:
>
> | The action… | Form |
> | --- | --- |
> | commits the view's main task (save, submit, pay, publish, send) | Filled text button, once (once per parallel option) |
> | dismisses or steps back beside that primary | A quieter button of the SAME size, or a text link |
> | is a secondary action that needs its word, beside the primary | A quieter (outlined or text) button of the same size, within the boxed-button budget |
> | is frequent and its icon is universally understood (close, search, play/pause, and the platform's own standard symbols) | Icon-only button, named and tooltipped |
> | needs a word to be understood, or is rare | Icon + short label (1–2 words), or a text link |
> | opens, inspects or navigates to a record | The whole row or card as the target, with a trailing chevron; or a text link |
> | is a further action on a list row beyond its one inline icon action, or one of three or more rare secondary actions on any other object (a toolbar of frequent actions with universal or domain-standard icons stays icon-only) | An overflow menu of labelled items |
> | destroys data or cannot be undone | Icon + word; icon-only only when a confirm step or undo follows — never a bare icon that acts at once |
>
> - `AD-2` **No ragged groups.** Text buttons in one group — a row, a column, a footer, an action bar — share height, style and alignment, and their widths differ by no more than the budget (default 10%; set a shared min-width); icon buttons in one toolbar share one size. Never mix filled and outlined text buttons in a repeated list, row or column. A footer, action bar or hero may hold the one primary plus quieter buttons of the same size (secondary or dismiss, e.g. Cancel · Save draft · Publish) within the boxed-button budget, or follow the platform's dialog button set. A list row is one target (trailing chevron or icon) with, by default, at most ONE inline icon action — never a filled or boxed button repeated on every row; an expert surface may add frequent-action accelerators the design plan names (`UX-6`), as named icons or shortcuts.
> - `AD-3` **Icon discipline.** One icon family, one stroke weight and one size per context; a visible label wherever the meaning is neither universal nor standard in the domain of an expert tool. Every icon-only control has an accessible name, a tooltip shown on hover AND keyboard focus where those exist (a native `title` alone never shows on focus), at least 3:1 contrast against its background, and a hit target of at least the minimum of the project's selected accessibility standard (for example WCAG 2.5.8: 24×24 CSS px, or its spacing exception; below it, report with `G1`/`I14` at their severity). On touch, aim for the platform's recommended size (for example 44×44 pt on iOS, 48×48 dp on Android, about 44×44 CSS px on touch web); a target between the standard's minimum and that recommendation ranks no higher than P3. On touch-only surfaces, where no hover exists, use icon-only only for universally understood actions and label the rest.
> - `AD-4` **One focal point, a copy budget.** Each view has one focal point (`UI-1.1`). A list row shows a title plus, by default, ONE short meta line (default 80 characters), one rendered line at the widest tested viewport and clamped with an ellipsis at narrower ones — a list whose job is reading previews (an inbox, search results, a feed) may set two; detail moves behind progressive disclosure — an expander, the detail view, a tooltip or help. No paragraph walls in rows, cards, tables or dashboards (default: no text block there over 160 characters). Character budgets are per locale: dense scripts (for example Chinese, Japanese, Korean) set their own. Every visible string serves the user's current decision; otherwise move it to its owning view or cut it (`UX-4`, orphan element `UX-8`). Expert data density (`H3`) never licenses prose density.
> - `AD-5` **Measure, don't eyeball.** Per view record: filled text buttons (≤ 1) · boxed text buttons against the budget (default 3) · width spread per button group · inline actions per list row · meta lines and characters per row · icon-only controls missing a name, tooltip, target size or contrast · tile-height and title-baseline variance per grid row · action-to-content-edge offset · content-width consistency across pages. Report them in the UI/UX Gate Report row `AD-1`–`AD-6`. Budgets come from `uiReview.complexityBudget` when the project declares them; otherwise the numeric defaults above are `HEURISTIC`, and a finding that rests only on an undeclared default ranks no higher than P3. The structural rules (at most one filled primary, no filled or boxed button repeated per row, named icons, no bare destructive icon, one tile size per collection grid) keep their checklist severity; the meta-line count, inline icon actions per row and a wrap at a narrower viewport are defaults, judged like the numeric ones. A value the artifact cannot show is `NOT VERIFIABLE`, never a guess.
> - `AD-6` **Regular grids, one alignment.** Tiles in one collection grid (items of one kind: media, records, products) share one size and one aspect ratio; a dashboard of different widgets, a bento layout, or a feed, thread, chat or board whose items vary in height is not a collection grid. Media of another orientation sits INSIDE the tile (pillarbox/letterbox on a soft backdrop, optionally marked, e.g. with an orientation badge); it never changes the tile size. Titles start on one baseline per row and are clamped to a fixed number of lines. A grid fills its content width responsively (e.g. `repeat(auto-fill, minmax(<min>, 1fr))`), with no unexplained empty band. A screen's actions align to the content edge they act on. Every screen or page of one product uses the same page-shell content width and gutters; a reading column inside the shell may be narrower. Placeholder art differs by content type, never one repeated image. Meta text never restates what position, order or layout already shows (`AD-4`). Masonry or mixed-size tiles in a collection are allowed only as a deliberate editorial pattern named in the design plan, never as the default for a management grid.
>
> **Skip ONLY** when the surface has no user-facing actions or text (backend-only, build or CI tooling, docs) — state the reason. Slide decks are out of scope: the deck skills own their text-density rules.

<!-- /SYNC:ui-action-density-gate -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `AD-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

<!-- SYNC:ui-action-density-gate:reminder -->

- **MUST ATTENTION** actions and attention (`AD-1`–`AD-6`): at most ONE filled text button per view, dialog, screenful or independent region, for the commit of its main task (parallel options may each carry it), with a fixed min-width; every other action takes the lightest form that keeps its meaning — a same-size quieter button, an icon-only button (named and tooltipped, only for universally understood icons), icon + short label, a text link, the whole row as target, or an overflow menu; destructive actions are never a bare icon (`AD-1`) · text-button groups share height, style, alignment and width, no filled/outlined mix in a repeated list (a footer, action bar or hero may add same-size quieter buttons), no filled or boxed button per row, by default one inline icon action per row (`AD-2`) · one icon family; every icon-only control has an accessible name, a tooltip on hover AND focus, the selected standard's minimum target and ≥ 3:1 contrast (`AD-3`) · one focal point; a row = title + by default one short meta line; no paragraph walls (`AD-4`) · measure per view and report the `AD` row of the UI/UX Gate Report; a finding resting only on an undeclared default caps at P3 (`AD-5`) · tiles in one collection grid share one size and baseline, the grid fills its width, actions align to their content edge (`AD-6`). Checks: checklist `B16`, `C14`–`C20`. Platform guidelines and the project design system outrank; report a defect once. Skip ONLY with no user-facing actions or text, stated.

<!-- /SYNC:ui-action-density-gate:reminder -->

## Design-only UI/UX principles

Read this section only for a UI-bearing `--type=design` review. Task, story and spec-tests reviews retain their own rubric without this nine-dimension scoring pass.

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
> | Role | Obligation |
> | --- | --- |
> | DESIGN / PLAN a surface | Select applicable clauses for the target platform; document required states, tokens, input, and constraints from the project contract. |
> | IMPLEMENT a component | Verify the configured behavior and accessibility requirements; use project tokens and abstractions only when defined. |
> | REVIEW UI code or a design artifact | Treat only applicable, authoritative clauses as fail-conditions; cite `UI-<clause>` + `file:line` + severity. NEVER turn inapplicable defaults into findings. |
> | SCAN / document a UI system | Record the project's actual platform conventions and deliberate deviations; do not fill gaps with this catalog's examples. |
>
> **Component architecture (code-bearing UI work):** Follow documented tiers and base abstractions when the project has them. Otherwise identify actual reuse boundaries from the code; do not require a three-tier taxonomy, base class, or lower-tier test model. Reuse shared behavior when a demonstrated consumer and suitable project abstraction justify it; test according to the project's test organization.
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

<!-- /SYNC:ui-ux-design-principles -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->
