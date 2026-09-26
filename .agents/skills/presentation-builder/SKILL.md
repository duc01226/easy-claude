---
name: presentation-builder
description: '[Documentation] Use when creating, revising, auditing, or generating a presentation for any subject. Produces a narrative-led, self-contained HTML deck with per-slide speaker notes, keyboard navigation, accessible controls, persistent browser-local edit mode, reset, export, and validation.'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
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

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
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

**Showcase before batch (decks of ≥5 slides):** build two representative slides first, render them (`node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides` when html-export is installed; apply the Step 7 exit rule), self-critique them against the Step 4 design plan, fix, then generate the rest. This is an agent self-critique — no user stop.

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

**Render check (when html-export is installed):** run `node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides` (default slide selector). Exit 0 is evidence ONLY for first-load and per-slide render, zero page errors, and no blank captures; every other runtime check above stays `NOT VERIFIABLE` unless exercised another way. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

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
- `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --page=1920x1080` — optional PDF copy when html-export is installed (the print CSS sets no page size); apply the Step 7 exit rule.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

> **[BLOCKING]** Finish with the final review task and the AI-mistake/lessons gate. Extract only a general lesson that passes the recurrence and generality tests; ask the user to run `$learn` when a lesson should be persisted.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn any subject and source material into a clear, audience-specific presentation whose story, visuals, notes, and runtime behavior are all reviewable.

**MUST ATTENTION workflow:** 1) frame audience/goal/environment and evidence boundary → 2) research/source ledger → 3) thesis, archetype, and slide map → 4) subject-grounded design plan and distinctiveness review → 5) semantic self-contained generation → 6) notes/edit/navigation/accessibility/persistence runtime → 7) static validation and browser/manual rehearsal → 8) evidence report, final review, and lessons gate.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
