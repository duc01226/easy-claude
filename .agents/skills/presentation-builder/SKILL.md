---
name: presentation-builder
description: '[Documentation] Use when creating, revising, auditing, or generating a presentation for any subject. Produces a narrative-led, self-contained HTML deck with per-slide speaker notes, keyboard navigation, accessible controls, persistent browser-local edit mode, reset, export, and validation.'
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

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the declared steps in order. Keep one task `in_progress`; mark each task completed with evidence immediately after it returns.
> **[BLOCKING]** If task tools are unavailable, maintain an equivalent tracker in the working response or a disposable report under `tmp/reports/`.
> **[BLOCKING]** Do not claim browser behavior passed when only static inspection was possible.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Turn any subject and source material into a clear, audience-specific presentation whose story, visuals, notes, and runtime behavior are all reviewable.

**Summary:**

- Frame audience/goal/environment and evidence boundaries; build a source ledger; select a subject-appropriate narrative archetype and slide map.
- Create and critique a subject-grounded design plan; generate semantic, self-contained HTML with stable slide/purpose/note markers.
- Guarantee the presenter runtime: complete notes, notes toggle, keyboard navigation, accessible state, explicit edit mode, local draft persistence, reset, export, overview, fullscreen, print, and reduced motion.
- Run static validation, browser/manual rehearsal when available, and a final evidence report that distinguishes PASS from `NOT VERIFIABLE`.

**Default output:** One self-contained HTML deck. If another format is requested, keep a companion editable HTML deck unless the requested artifact itself satisfies the runtime contract.

**Non-negotiables:** Every slide has a job, title, source/rationale, and detailed speaker notes. The deck always includes a visible notes toggle and an explicit edit mode with editable prose and notes, local draft persistence, reset, and clean export.

**Workflow:** frame audience/goal/environment → research and source claims → choose narrative archetype → write slide map → make a subject-grounded design plan → generate → validate → manually rehearse/review → report evidence and limits.

**Utilities:** `node .claude/skills/presentation-builder/scripts/create-presentation.cjs <deck.json> <output.html>` generates a self-contained contract-compliant starter deck; `node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html>` performs deterministic static checks. Run both utility test files after changing them.

**Key Rules:**

- **MUST ATTENTION** give every slide a single job, stable ID, meaningful title, rationale, and non-empty notes.
- **MUST ATTENTION** keep notes detailed enough for presenter handoff: talk track, why, evidence/caveat, timing, transition, and question.
- **MUST ATTENTION** provide visible Notes and Edit mode controls with stateful accessible semantics.
- **MUST ATTENTION** protect structure and persist edits as a namespaced local draft with reset and clean export.
- **ALWAYS** preserve keyboard navigation and a visible progress/status path.
- **ALWAYS** run static validation, then verify browser behavior separately when a browser is available.
- **NEVER** invent subject claims, precision, sources, audience, or design rationale.
- **NEVER** claim interactive, offline, fullscreen, persistence, or accessibility behavior from static markup alone.

## When to Use

Use for a decision deck, strategy, product story, teaching lesson, research readout, project update, technical explanation, sales narrative, demo, portfolio, or any other subject where an audience must understand, remember, decide, or act.

Use it to audit an existing HTML presentation when the request mentions structure, notes, edit mode, navigation, accessibility, or quality. For a UI-only mockup, use `pbi-mockup`; for a feature-artifact synthesis that specifically needs stakeholder journeys, use `feature-presentation` and apply this skill’s runtime contract to the output.

## Workflow

### 1. Frame the communication contract

Record these before writing slides:

- **Audience:** who is in the room, what they already know, what they care about, and what they can decide.
- **Goal:** inform, teach, persuade, align, compare, demonstrate, or obtain a decision. Write one observable outcome.
- **Environment:** live or asynchronous, presenter-led or self-serve, screen/room size, estimated time, playback/browser constraints, and whether notes are presenter-only.
- **Subject and evidence boundary:** source files/URLs, dates, data ownership, sensitive content, assumptions, and what is explicitly out of scope.
- **Output and handoff:** requested file type, output path, offline/network policy, edit/persistence expectations, and required export/print behavior.

If the brief is silent, state assumptions. Do not invent facts, brand rules, metrics, quotations, or a target audience.

### 2. Research and build the source ledger

Search the supplied material first. Browse only when the claim needs current or external evidence. Create a compact source ledger mapping each consequential claim, number, visual, quote, and date to its source or to an explicit `assumption`/`illustration` label. Keep fact, interpretation, recommendation, and example visually and verbally distinct.

For every chart or diagram, record unit, time range, denominator, comparison baseline, source, and uncertainty. Prefer a small, legible chart or diagram to a paragraph; never use decorative data-shaped graphics that imply unsupported precision.

### 3. Choose the story before the layout

Write a one-sentence thesis and the audience takeaway. Select the smallest narrative archetype that fits the job from `references/presentation-principles.md`.

Create a slide map before generating HTML. Each row must contain `slide-id`, `purpose`, `claim`, `evidence/visual`, `transition`, `timing`, and `notes-status`. Every slide must earn its place; merge or remove slides that repeat a job. A useful default decision arc is:

`opening-context → thesis/BLUF → context → tension/problem → evidence → insight → options/trade-offs → recommendation → plan/risks → ask/next action → memorable close`

Adapt that arc for teaching, demos, stories, reports, or comparisons. Do not force every archetype into a strategy deck, and do not use a decorative agenda when a short roadmap or direct opening communicates better.

The opening must establish context quickly. The body must progress by causality, contrast, sequence, or increasing specificity. Signpost meaningful transitions. The close must restate the takeaway and make the desired next action unmistakable.

### 4. Make a subject-grounded design plan

Before coding, write a compact plan:

- **Colour:** 4–6 named tokens with contrast checks and a reason tied to the subject.
- **Type:** families, roles, scale, weight, line length, and language/script constraints.
- **Layout:** one-sentence composition plus a small ASCII sketch for unusual or high-stakes slides; define alignment, focal point, density, and reading order.
- **Visual language:** what materials, artifacts, metaphors, diagrams, or image treatment belong to this subject; what generic defaults are intentionally rejected.
- **Motion:** one purposeful, optional moment at most; never use animation to hide weak sequencing.

Use real subject copy and data. Keep one dominant focal point per slide, one primary idea, generous grouping/whitespace, and a predictable visual grammar. Vary composition when the content changes; do not clone a card grid across the whole deck.

### 5. Generate the canonical deck structure

Use semantic HTML and a stable, self-contained runtime by default:

```html
<section class="slide" data-slide-id="context" data-purpose="context" data-principle="Why this slide earns its place">
  <header><h2>Descriptive slide title</h2></header>
  <div class="slide-body"><!-- one claim and its evidence/visual --></div>
  <template class="slide-notes">
    <p><strong>Say:</strong> a presenter-ready explanation.</p>
    <p><strong>Why:</strong> interpretation, evidence, caveat, and transition.</p>
    <p><strong>Timing:</strong> 00:45 · <strong>Question:</strong> likely audience question and answer.</p>
  </template>
</section>
```

The generated deck must include the stable markers used by the validator: `.slide`, `data-slide-id`, `data-purpose` or `data-principle`, `.slide-notes`, `data-action="toggle-notes"`, and `data-action="toggle-edit"`. Compatibility aliases such as `note-src`, `btnNotes`, and `btnEdit` are allowed but do not replace generic markers in new decks.

Keep CSS tokens named for the subject, inline CSS/JS, and all required assets packaged locally by default. If network dependencies are explicitly accepted, set `allowExternalAssets: true` and expose that policy in the generated artifact. Escape user/source content once at the HTML boundary. Keep slide content and runtime controls separate so editing prose cannot corrupt navigation, data, brand chrome, SVG structure, or notes metadata.

For repeatable generation, pass a JSON spec to `scripts/create-presentation.cjs`. The root must provide a stable `id`; each slide must provide a stable `id`, `title`, `purpose`, `principle`, one of `body`, `bodyHtml`, or typed `blocks`, and a `notes` object containing `say`, `why`, `evidence`, `transition`, `timing`, and `question`. A deck may contain one slide; zero slides are rejected. Typed blocks cover common text, list, quote, metric, image, and code needs; trusted author HTML remains available for subject-specific diagrams and visuals. The generator rejects missing structure or notes and emits the full runtime contract. Use `--example` to create a starter spec-shaped deck, then replace its content with sourced material.

### 6. Implement the presenter runtime contract

The complete contract is in `references/web-runtime-contract.md`. At minimum:

- Provide visible Previous/Next controls and keyboard navigation: Arrow keys, PageUp/PageDown, Space, Home, and End. Do not trap typing inside editable fields; let Escape leave an editor.
- Provide a notes toggle and close action. Give the panel a name, current slide title/page, `aria-expanded`/`aria-pressed` state, keyboard focus handling, Escape close, and an `aria-live` status for slide changes.
- Provide a clearly labelled edit-mode toggle with `aria-pressed`. In edit mode, make intentional prose leaves and the current slide’s notes editable, show a visible editing state/focus outline, and keep structural/brand/data visual elements protected.
- Debounce saves to a namespaced browser-local draft key. Show “saved”, “unsaved”, and storage-unavailable/error states. Treat local storage as a local draft, never as collaboration or version history. Confirm destructive reset and provide a clean HTML export that removes edit state.
- Provide fullscreen with capability/rejection handling and `fullscreenchange` state sync. Provide progress text as well as a visual progress bar. Provide overview/jump navigation for decks longer than six slides.
- Make meaningful images, SVGs, charts, tables, and diagrams accessible: text alternatives/labels, headings, logical reading order, visible focus, contrast checks, and colour-independent encoding. Include print CSS and a reduced-motion path.
- Do not auto-advance. Touch/pointer navigation may supplement buttons and keyboard but must never be the only route. Do not claim “simulated”, “live”, or “offline” behavior unless the implementation and notes make the boundary clear.

### 7. Validate, rehearse, and report

Run the utility and its tests:

```text
node .claude/skills/presentation-builder/scripts/create-presentation.cjs <deck.json> <output.html>
node .claude/skills/presentation-builder/scripts/create-presentation.cjs --example <output.html>
node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html>
node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --json
node .claude/skills/presentation-builder/tests/create-presentation.test.cjs
node .claude/skills/presentation-builder/tests/validate-presentation.test.cjs
```

Static validation is a gate, not a substitute for using the deck. When a browser is available, verify: first load; every navigation route; Home/End and Space; notes open/close/Escape; edit mode on/off; editing a slide and its notes; save status after reload; reset confirmation; export opens cleanly; fullscreen success/failure; overview jump; print; narrow viewport; focus order; screen-reader names; reduced motion; missing/slow asset behavior; and console errors. Test the actual audience path, not only isolated buttons.

Write a short report under `tmp/reports/` with the output path, source ledger status, slide-map summary, validator result, manual/browser result or `NOT VERIFIABLE`, unresolved risks, and any assumptions. Never hide an unverified interaction behind a PASS.

## Hard Quality Checklist

Treat each item as a release gate. Record evidence or `N/A` with a reason; do not silently skip.

| Gate | Requirement | Evidence to record |
|---|---|---|
| Purpose | One audience, one primary job, one thesis/takeaway | Communication contract + opening slide |
| Narrative | The sequence is causal, contrastive, chronological, or otherwise explainable; each slide has one job | Slide map with transitions |
| Evidence | Consequential claims, charts, dates, quotes, and visuals have traceable sources or labels | Source ledger |
| Content | No unsupported precision, filler, lorem ipsum, orphan terms, or unexplained acronyms | Copy/coherence pass |
| Design | Subject-grounded plan, deliberate type/colour/layout, focal point, readable density, meaningful variation | Design plan + built-artifact critique |
| Notes | Every slide has detailed presenter notes covering talk track, why, evidence/caveat, timing, transition, and likely question | Notes coverage report; validator |
| Edit mode | Visible toggle, state feedback, editable prose and notes, protected structure, local draft save/error status, reset confirmation, clean export | Manual interaction evidence + validator |
| Navigation | Buttons, keyboard parity, focus order, progress announcement, overview/jump for longer decks, no auto-advance | Browser or explicit static limitation |
| Accessibility | Semantic headings, labels/alt text, contrast, colour-independent meaning, visible focus, reduced motion, print path | Accessibility review |
| Handoff | Requested artifact opens in the target environment, offline policy is met, assumptions and limitations are visible | Open/reload/export/print evidence |

## Resources

- `references/presentation-principles.md` — research-backed structure principles, narrative archetypes, slide-level checklist, delivery/rehearsal checks, and source links.
- `references/web-runtime-contract.md` — canonical HTML schema and notes/edit/navigation/accessibility/persistence/export requirements, including generalized baseline-runtime lessons and upgrade requirements.
- `scripts/create-presentation.cjs` — dependency-free JSON-to-self-contained-HTML generator with enforced detailed notes and presenter runtime.
- `scripts/validate-presentation.cjs` — dependency-free static validator with JSON output.
- `tests/create-presentation.test.cjs` — generator contract and rejection-path tests.
- `tests/validate-presentation.test.cjs` — regression tests for the validator’s hard requirements.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

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

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

> **[BLOCKING]** Finish with the final review task and the AI-mistake/lessons gate. Extract only a general lesson that passes the recurrence and generality tests; ask the user to run `$learn` when a lesson should be persisted.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn any subject and source material into a clear, audience-specific presentation whose story, visuals, notes, and runtime behavior are all reviewable.

**MUST ATTENTION workflow:** 1) frame audience/goal/environment and evidence boundary → 2) research/source ledger → 3) thesis, archetype, and slide map → 4) subject-grounded design plan and distinctiveness review → 5) semantic self-contained generation → 6) notes/edit/navigation/accessibility/persistence runtime → 7) static validation and browser/manual rehearsal → 8) evidence report, final review, and lessons gate.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
