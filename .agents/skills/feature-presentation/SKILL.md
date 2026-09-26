---
name: feature-presentation
description: '[Documentation] Use when a workflow step or the user asks for a stakeholder slide deck. Synthesizes specs, PBIs, ideas and mockups into one standalone HTML deck.'
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

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Synthesize every in-scope session idea, Feature Spec, PBI, user story, design-spec, and mockup into ONE project-faithful standalone HTML deck with a vanilla-JS engine and interactive MVP demos for every main journey, so PO/BA/Dev/QC review the feature from one offline file before build.

**Summary:**

- **Purpose / altitude:** a SYNTHESIS deck at a higher altitude than `pbi-mockup` — accumulates many artifacts (ideas + specs + PBIs + stories + design-specs + mockups) into ONE stakeholder presentation, not one PBI's UI preview.
- **Main steps (read-this-if-nothing-else):** (1) resolve `activePlan` scope across created→now → (2) gap-fill: missing PBIs → ask once (`manual` tier), on a yes run `workflow-spec-to-pbi` as a SUB-AGENT, else report the gap; missing mockups in `idea-to-pbi` use `pbi-mockup`, `idea-to-spec` skips mockups → (3) load design context → (4) [BLOCKING] inventory UI + flows → (5) extract journeys, one todo each → (6) assemble → (7) save → (8) [BLOCKING] fidelity/demo integrity → (8b) Demo-Quality → (9) report.
- **Output/demo contract:** exactly ONE self-contained HTML at `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` (`{artifacts-root}` defaults to `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) with inline CSS/JS, Google Fonts only, no CDN/reveal.js, vanilla-JS navigation, a guide slide, and one interactive demo-flow slide per main journey; reuse existing `*-mockup.html` via escaped `<iframe srcdoc>` and accept only complete PBI full flows.
- **Branches and evidence:** evaluate shared `isLargeIdea`; true requires the complete `large_idea_decomposition` block, stable slice IDs, and Decomposition & boundaries beside the all-PBI backlog and all-PBI presentation; missing/conflicting fields block deck quality and the presentation never creates the product roadmap artifact (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path). `idea-to-spec` uses only design-spec ASCII/tables + narrated frames; missing visuals render an empty state; use real domain data and keep prose tech-agnostic.

**Workflow:**

1. **Resolve scope** — anchor on `activePlan`, accumulate its full artifact set across the plan's created→now date range (every `{YYMMDD}` in range, NOT just today); custom prompt widens; standalone + no prompt → ask the user directly.
2. **Gap-fill (smart routing — sub-agent)** — spec lacks PBIs → ask once (`manual` tier), on a yes `workflow-spec-to-pbi` AS A SUB-AGENT, else report the gap; PBIs lack mockups (mockup-bearing workflow) → `pbi-mockup`. Spec-only `idea-to-spec` → SKIP mockup generation.
3. **Load project design context** — baseline + matched per-app design-system docs via `project-config.json`.
4. **[BLOCKING] Inventory existing UI + map connected flows** — `SYNC:existing-ui-research`.
5. **Accumulate + structure content (incl. journey extraction)** — parse each artifact into stakeholder sections; extract the main-story flows into an ordered journey list + task tracking one todo per journey; REAL domain data, never Lorem (`references/artifact-accumulation.md`).
6. **Assemble ONE standalone HTML deck** — inline CSS (design tokens, BEM) + vanilla-JS engine + a "How to drive this demo" guide slide + one interactive demo-flow slide per journey (embedded mockup + narration strip) + `<iframe srcdoc>` mockup embeds; spec-only path renders ASCII/tables + narrated ASCII frames; empty-state slide when no visual exists (`references/deck-template.md`).
7. **Save** → `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` (see "Path roots").
8. **[BLOCKING] Fidelity gate (incl. demo integrity)** — validate deck visuals + every journey clicks through vs Step 4 inventory; record `Fidelity vs existing UI: PASS|FAIL` (`references/deck-template.md`).
8b. **[BLOCKING] Demo-Quality review** — final stakeholder-comprehension pass; record `Demo quality: PASS|FAIL`.
9. **Report** — path, artifact count synthesized, demo journeys, stakeholder sections, fidelity + demo-quality verdicts.

**Key Rules:**

- Emit exactly ONE self-contained HTML file; inline CSS/JS; no external `<script src>` / `<link rel=stylesheet>` except Google Fonts; no CDN reveal.js — vanilla-JS engine only.
- Present every in-scope main user story as an interactive MVP demo slide (embedded interactive mockup + narration strip); plan journeys first (Step 5, one todo each), sign off with the Demo-Quality review (Step 8b).
- Embed existing `-mockup.html` via `<iframe srcdoc>` — never regenerate a mockup that already exists; the mock-up is self-driving, the deck adds only narration.
- Spec-only `idea-to-spec` → design-spec ASCII wireframes + inventory/states/tokens tables + narrated ASCII-frame step-through ONLY; never generate HTML mockups, never invoke `pbi-mockup`.
- Use REAL domain entity field names + realistic sample data — never Lorem ipsum or "Item 1, Item 2".
- Empty-state slide when an in-scope feature has no mockup AND no design-spec — never a broken/blank iframe.
- Run gap-fill multi-step workflows as SUB-AGENTS (summary returned + findings written to `tmp/reports/`) per CLAUDE.md "Workflow Step Advancement §3".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names); the rendered HTML may use real class names internally.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Feature Presentation — Stakeholder HTML Slide Deck

Synthesize session specs, PBIs, ideas, and mockups into one standalone HTML deck for PO/BA/Dev/QC.

---

## When to Use

- Near the end of `workflow-idea-to-pbi` or `workflow-idea-to-spec`, to present the feature set to stakeholders.
- Standalone, when PO/BA/Dev/QC need one offline deck synthesizing a feature's ideas, specs, PBIs, stories, and mockups.

**NOT for**: one PBI UI preview (`$pbi-mockup`), Feature Spec authoring (`$spec`), or design-spec production (`$design-spec`).

---

## Quick Reference

### Path roots (resolve before reading or writing any path below)

- `{artifacts-root}` — the team-artifacts root: default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.
- `{spec-root}` — the business Feature Spec root: default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

Both placeholders stand for the RESOLVED value everywhere they appear in this skill; write the resolved path into every deck, report, and sub-agent brief — never the placeholder.

### Input

| Source        | Path                                                         |
| ------------- | ------------------------------------------------------------ |
| Ideas         | `{artifacts-root}/ideas/{YYMMDD}-*`                          |
| PBIs          | `{artifacts-root}/pbis/{YYMMDD}-pbi-*.md`                    |
| User stories  | `{artifacts-root}/pbis/stories/{YYMMDD}-us-*.md`             |
| Mockups       | `{artifacts-root}/pbis/*-mockup.html`                        |
| Design specs  | `{artifacts-root}/design-specs/{YYMMDD}-designspec-*.md`     |
| Feature Specs | `{spec-root}/{Bucket}/README.{Feature}.md`                   |
| Active plan   | `activePlan` in the OS-temp `CK_TMP_DIR/session/{id}.json` (the path returned by `getSessionStatePath`, written by `set-active-plan.cjs`) |
| Explicit scope | User provides specs/features as argument                    |

### Output

| Type       | Path                                                          |
| ---------- | ------------------------------------------------------------- |
| HTML deck  | `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` |

### Related

- **Input from:** `$spec`, `$refine`, `$story`, `$pbi-mockup`, `$design-spec`
- **Command:** `$feature-presentation`
- **Detail:** `references/deck-template.md` (HTML scaffold + slide engine + iframe-srcdoc escaping + fidelity gate); `references/artifact-accumulation.md` (scope resolution + per-type parse map + gap-fill + branches)

---

## Detailed Workflow

### Step 1: Resolve Scope

Determine deck scope; full algorithm: `references/artifact-accumulation.md` → "Scope Resolution".

1. **Default (active-plan anchor):** Read `activePlan` from `CK_TMP_DIR/session/{id}.json` (path returned by `getSessionStatePath`, written by `.claude/scripts/set-active-plan.cjs`). Accumulate the plan's FULL artifact set across its **created→now date range** — glob `team-artifacts/{ideas,pbis,pbis/stories,design-specs}` and `*-mockup.html` for EVERY `{YYMMDD}` in range, plus plan `docs/specs` outputs. **Both roots in that glob are DEFAULTS** — keep the brace expression exactly as written and swap the `team-artifacts` / `docs/specs` prefixes for `{artifacts-root}` / `{spec-root}` whenever `docsRoots.teamArtifacts.path` / `specRoots.business.path` are declared in `docs/project-config.json`.
    - **Multi-day rule:** a workflow that spans midnight authors specs on day 1 and PBIs on day 2 — a single-day `{YYMMDD}` glob silently drops day-1 artifacts. Glob over the whole created→now range, never just today.
2. **Custom prompt:** If user names specs/features, widen scope to those artifacts plus dependents.
3. **Standalone + no prompt:** Use ask the user directly to ask which specs/ideas to present — never silently guess scope.

### Step 2: Gap-Fill (Smart Routing — Sub-Agent)

Fill missing downstream artifacts; routing: `references/artifact-accumulation.md` → "Gap-Fill Routing".

1. **Spec lacks PBIs:** `workflow-spec-to-pbi` is a `manual`-tier workflow — ask the user once whether to run it; only on a yes, invoke it **AS A SUB-AGENT** (`spawn_agent` tool), briefed to run `$start-workflow workflow-spec-to-pbi` and told the user explicitly said yes — that yes is the explicit request the tier needs, since a sub-agent's own `$start-workflow` call never counts as one; otherwise report the missing PBIs and continue. Per CLAUDE.md "Workflow Step Advancement §3", multi-step workflows run as sub-agents: return a summary and write full findings to `tmp/reports/` to bound deck-build context.
2. **PBIs lack `-mockup.html` AND workflow is mockup-bearing (`idea-to-pbi`):** Invoke `pbi-mockup` per PBI; require its Releasable Full-Flow gate to PASS before embedding.
3. **Spec-only `idea-to-spec` context:** SKIP mockup generation — never invoke `pbi-mockup`; use design-spec visuals only (Step 6 spec-only path), preserving the no-mockup contract.

### Step 3: Load Project Design Context

Deck CSS uses project design tokens (same discovery as `pbi-mockup`):

1. **Mandatory baseline:** Read `design-system/README.md` and `design-system/design-system-canonical.md` under the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
2. **Primary:** Read top-level `designSystem` in `docs/project-config.json` — use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the presented feature/app context against `designSystem.appMappings[]` to select the per-app doc.
3. **Fallback:** `Glob("docs/project-reference/design-system/*.md")` → case-insensitive substring match on app/feature name. **Default:** `README.md`. The glob's `docs/project-reference` prefix is the DEFAULT root; substitute the value of `docsRoots.projectReference.path` from `docs/project-config.json` when it is declared, leaving the rest of the pattern unchanged.
4. Extract colors, typography, spacing, border-radius, shadows → these become the deck's CSS variables.

### Step 4: [BLOCKING] Inventory Existing UI + Map Connected Flows

> **[BLOCKING] Complete `SYNC:existing-ui-research` before assembly:** inventory related UI, not generic HTML; classify Common/Domain-Shared/Page components with base/owner; map connected flows; reuse before inventing; record findings. Skip only backend-only work and state that explicitly.

1. Read the first 200 lines of `frontend-patterns-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — base components, form/table/dialog patterns.
2. Sample 2–3 real shared/module components for layout and CSS naming.
3. Map connected feature flows so embedded visuals fit surrounding navigation.

### Step 5: Accumulate + Structure Content (incl. journey extraction — think → plan → many todos)

Parse each in-scope artifact into stakeholder slide sections (see Slide Taxonomy); parse map: `references/artifact-accumulation.md` → "Per-Artifact-Type Parse Map".

- Use REAL domain entity field names + realistic sample data from `domain-entities-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — never Lorem ipsum or "Item 1, Item 2".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names).
- **Extract each PBI's priority/rank** — read the `priority` label + numeric `rank` from each PBI's frontmatter (and the ranked-order backlog artifact `{artifacts-root}/backlog/*-backlog.md` when present). The Scope & backlog slide MUST display PBIs in ranked order with a priority label per PBI card — the deck carries the same priority info the backlog and mockups do. If PBIs lack priority, note it explicitly rather than dropping the field.
- **Extract the decomposition context** — locate the owning idea/spec/PBI block; evaluate shared `isLargeIdea`; when any signal is true, validate all five `large_idea_decomposition` fields (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and preserve each slice ID through every PBI/story/mockup. Add a Decomposition & boundaries slide (or equivalent Scope & backlog section) with dependency order, non-goals, evidence owners, and deferred-work ownership. If all signals are false, record `Decomposition: N/A — ordinary isolated scope` and do not invent a roadmap section.
- **Extract the main-story / MVP flows into an ordered journey list** — from PBI `## Acceptance Criteria` GIVEN/WHEN/THEN + story "As a / I want / So that" + each mock-up's flow-specs (`references/artifact-accumulation.md` §6 Journey-Extraction Map). One journey per main user story (MVP happy path), each an ordered sequence: entry → click steps ("click X → see Y → move to Z") → end state + one plain-language explanation per step. When a `-mockup.html` exists, reuse its flow-specs verbatim so the deck demo == the per-PBI prototype.
- **task tracking one todo per journey slide** — so each journey is assembled (Step 6) and later verified (Step 8 demo integrity / final demo-quality review) individually. (The "think → plan → many todos before do".)

### Step 6: Assemble ONE Standalone HTML Deck

Build the single self-contained HTML from `references/deck-template.md`:

- Inline `<style>` — design-token CSS variables, BEM classes, light/dark themes.
- Vanilla-JS slide engine — `←/→`/`Home`/`End`, nav dots, counter, theme toggle; no CDN reveal.js. Don't hijack arrows while a demo iframe is focused; OPTIONAL `postMessage('play')` auto-starts a journey only when supported (`references/deck-template.md` §3b).
- **"How to drive this demo" guide slide** near the top — explain hotspots, each mock-up's ▶ Play / ⏮ ⏭ / ↺ Reset controls, and ←/→ slide navigation (`references/deck-template.md` §3b).
- **Demo-flow slides (one per Step 5 journey):** embed flow-scoped interactive `pbi-mockup` HTML via escaped `<iframe srcdoc="…escaped…">` and overlay a text-only narration strip (current step, plain-language explanation, "⚠ Simulated"). Controls stay inside the self-driving mock-up; the deck adds no duplicate interactivity (`references/deck-template.md` §3b).
- **Mockup-bearing path (`idea-to-pbi`):** embed each existing `-mockup.html` via `<iframe srcdoc="…escaped…">`; use `&`-first, escape-once-unconditionally from `references/deck-template.md`. Never regenerate an existing mockup.
- **Decomposition integrity:** the deck aggregates; it must not split, merge, rename, or reinterpret slice IDs. Flag conflicts to the owning PBI/spec/refine step and stop fidelity validation until resolved.
- **Spec-only path (`idea-to-spec`):** render design-spec ASCII wireframes plus Component Inventory / States / Design-Tokens tables; advance narrated ASCII frames with Next. NO `<iframe srcdoc>` mockup, NEVER invoke `pbi-mockup`.
- **Empty-state (F3):** when a feature has NO `-mockup.html` AND NO design-spec, render "No mockup/design-spec available for {feature}" — never a broken/blank iframe.

### Step 7: Save

- **Path:** `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` — `{artifacts-root}` defaults to `team-artifacts` and is relocated by a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` (create the `presentations/` dir under it if absent).
- `{slug}` = the presented feature(s) or plan slug.

### Step 8: [BLOCKING] Fidelity Validation — Deck Matches Existing UI

> **[BLOCKING] After assembly, run `references/deck-template.md` → "[BLOCKING] Fidelity Gate" against the Step 4 UI inventory.** Do NOT report done until a result is recorded.

The gate also covers **demo integrity** — every journey slide clicks end-to-end in its iframe, reaches its end state via real hotspots, has no dead controls, names the current step + plain-language explanation in tech-agnostic narration (M1/M2), shows "⚠ Simulated", and advances spec-only ASCII frames.

**Optional render evidence (when html-export is installed):** `node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides=section.deck__slide` captures every slide. Exit 0 is evidence ONLY for first-load and per-slide render, zero page errors, and no blank captures; demo click-through and the other gate items stay `NOT VERIFIABLE` unless exercised another way. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

Record the outcome in the Step 9 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / embeds / demos matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the deck to match the existing UI and re-validate before handoff.

### Step 8b: [BLOCKING] Demo-Quality Review (final review todo)

> **[BLOCKING] Final review before the report (the per-journey todos and this gate were created in Step 5).** First confirm the deck **SATISFIES the intent**: every in-scope main user story is presented as a journey (coverage — no main story missing) AND each journey faithfully conveys that story's intended behavior, not merely that slides render. Then run a stakeholder-comprehension pass: *could a PO with no prior context follow each journey end-to-end?* Confirm every demo-flow slide clicks through, narration explains each step in plain language, the "⚠ Simulated" note is present, and the spec-only path degrades to narrated ASCII frames (never an HTML mockup). Record `Demo quality: PASS | FAIL` — FAIL if any main story is unrepresented or misrepresented, regardless of polish.

If **FAIL**, fix the journey slides (re-extract from the §6 journey map / re-embed the flow-scoped mockup) and re-review before handoff.

### Step 9: Report to User

After assembly, output:

```
Deck generated: {artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html
- Artifacts synthesized: {count} ({ideas}/{specs}/{pbis}/{stories}/{mockups}/{design-specs})
- Backlog priority: {ranked | not prioritized} — Scope & backlog slide shows {N} PBIs in ranked order with priority labels
- Demo journeys: {count} ({journey titles})
- Stakeholder sections: {title, how-to-demo, business-context, scope-backlog, behavior-rules, demo-flows, ui-mockups, qc-view, summary}
- Fidelity vs existing UI: PASS | FAIL
- Demo quality: PASS | FAIL

Open in browser to preview. Click highlighted hotspots or press ▶ Play to walk a journey; use ←/→ or nav dots to move between slides; theme toggle for light/dark.
```

When html-export is installed, offer a PDF copy: `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --slides=section.deck__slide` (apply the Step 8 exit rule).

---

## Slide Taxonomy (stakeholder-oriented)

Every slide section must serve the four stakeholder audiences (PO/BA/Dev/QC):

| Section                | Audience  | Content                                                                                  |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------- |
| **Title / agenda**     | all       | Feature(s) presented, run date, scope                                                    |
| **How to drive this demo** | all   | Early guide slide: click hotspots + each demo's own ▶ Play / ⏮ ⏭ / ↺ Reset controls (inside the mock-up); ←/→ change slides (`references/deck-template.md` §3b) |
| **Business context**   | PO/BA     | Problem, value, idea→spec narrative, epics/features                                       |
| **Scope & backlog**    | PO/BA/Dev | PBIs (in ranked order, each card showing its priority label + numeric rank from PBI frontmatter / backlog), user stories, acceptance criteria — priority is MANDATORY when PBIs are prioritized |
| **Behavior & rules**   | Dev/QC    | Feature Spec §4 business rules / §5 invariants, §8 test cases                             |
| **Demo flows / user journeys** | all | One interactive MVP demo slide per main user story: embedded interactive mockup scoped to the flow + a narration strip explaining each step ("click X → see Y → move to Z"); spec-only → narrated ASCII frames (`references/deck-template.md` §3b) |
| **UI / mockups**       | all       | Embedded `pbi-mockup` HTML (idea-to-pbi) OR design-spec ASCII + tables (idea-to-spec) OR empty-state |
| **QC view**            | QC/QA     | Test specifications, states matrix, edge cases                                           |
| **Summary / next steps** | all     | Recap, decisions needed, next workflow steps                                             |

---

## UI Layout

The deck is itself a UI artifact. ASCII of a slide frame:

```
┌────────────────────────────────────────────────┐
│ ◀  Feature Presentation — {Feature}     3 / 12  │  ← top bar: title + counter
├────────────────────────────────────────────────┤
│  ## Business Context                            │
│  • Problem  • Value  • Epics                     │  ← slide body (design-system tokens)
│  ┌──────────────────────────────────────────┐   │
│  │  <iframe srcdoc> embedded mockup / wire   │   │  ← embedded visual (or empty-state)
│  └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│  ● ● ● ○ ○ ○ ○ ○ ○ ○ ○ ○        ◀ Prev  Next ▶  │  ← nav dots + buttons (vanilla JS)
└────────────────────────────────────────────────┘
```

Component tiers: common (slide shell, nav) — domain-shared (mockup/wireframe embed block) — page-app (per-artifact content slides). Keyboard `←/→`, `Home/End`; theme toggle (light/dark) reusing design-system tokens.

---

## Edge Cases

| Scenario                                       | Handling                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Scope resolves to zero artifacts               | Emit an explicit empty-state slide rather than failing (Step 6 / TC-026) |
| Spec without PBIs (mockup-bearing workflow)    | Ask once (`manual` tier); on a yes, `workflow-spec-to-pbi` sub-agent (Step 2) |
| Spec-only `idea-to-spec`                       | Design-spec visuals only + narrated ASCII-frame step-through; never generate mockups, never invoke `pbi-mockup` (Step 2 / Step 6) |
| Feature with no mockup AND no design-spec      | Empty-state slide ("No mockup/design-spec available") — never blank iframe |
| Demo iframe focused while navigating slides    | Don't hijack arrow keys while a demo iframe is focused (Step 6 / `deck-template.md` §3b) |
| Workflow spans midnight (multi-day)            | Glob over plan's created→now range, not just today's `{YYMMDD}` (Step 1) |
| Standalone invocation with no prompt/scope     | ask the user directly which specs/ideas to present (Step 1)                   |

---

## Anti-Patterns

| Anti-Pattern                                  | Correct Approach                                                   |
| --------------------------------------------- | ----------------------------------------------------------------- |
| CDN reveal.js / impress.js                    | Vanilla-JS slide engine (~60 lines), self-contained               |
| Regenerating a mockup that already exists     | Embed the existing `-mockup.html` via `<iframe srcdoc>`           |
| HTML mockups in `idea-to-spec`                | Design-spec ASCII wireframes + tables only (spec-only contract)   |
| Link to external mockup files                 | Inline via `<iframe srcdoc>` — one standalone file                |
| Lorem ipsum / "Item 1, Item 2"               | Real domain entity field names + realistic sample data            |
| Broken/blank iframe for a missing visual      | Explicit empty-state slide                                         |
| Running gap-fill workflow inline              | Run multi-step gap-fill workflows as SUB-AGENTS (context bounded)  |

---

## Alternatives Considered

1. **Extend `pbi-mockup` with `--deck`** (rejected) — it serves one PBI; a synthesis deck has different inputs/audience. Separate ownership preserves single responsibility and the spec-only contract.
2. **CDN reveal.js / impress.js** (rejected) — breaks offline/no-external-deps and adds supply-chain risk; the ~60-line vanilla-JS engine matches `pbi-mockup`'s zero-dependency posture.
3. **Link mockup files** (rejected) — violates the ONE-file mandate; `<iframe srcdoc>` keeps the deck portable when files move.
4. **Chosen:** standalone skill + inline single-file deck + iframe-srcdoc embeds. Larger HTML is acceptable because text gzips and offline portability wins.

## Design Rationale

A synthesis deck differs from a per-PBI mockup in inputs, audience, and altitude, so it owns a separate skill but reuses the mockup engine through `<iframe srcdoc>`. That mechanism satisfies both the ONE-file and existing-mockup contracts. Existing-UI research plus fidelity keeps the deck project-faithful; spec-only and empty-state branches preserve visual output without breaking `idea-to-spec`; sub-agent gap-fill keeps context bounded.

---

## Security Considerations

`<iframe srcdoc>` embeds first-party generated mockup HTML only — no remote content or user-supplied script. Entity-escape `srcdoc` (`&` first, once) to prevent `</iframe>`/`<script>` breakout. The deck is offline except Google Fonts CSS; artifacts contain no secrets.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** Outside a workflow, MUST ATTENTION use ask the user directly; the user chooses the route:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** via `$start-workflow workflow-idea-to-pbi` (Recommended) — includes the presentation deck as a late step.
> 2. **Activate `workflow-idea-to-spec` workflow** — spec-only path; deck degrades to design-spec visuals.
> 3. **Execute `$feature-presentation` directly** — run this skill standalone on existing artifacts.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, MUST ATTENTION use ask the user directly to present these options; the user decides, even when the task seems simple:

- **"Open the deck"** — open the standalone HTML in a browser to review with stakeholders
- **"$prioritize"** — prioritize the synthesized PBIs in the backlog
- **"$plan"** — start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `existing-ui-research` — Study the existing UI before designing or specifying a screen; designing or specifying a new or updated screen → .claude/skills/shared/protocols/existing-ui-research.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Synthesize every in-scope session idea, Feature Spec, PBI, user story, design-spec, and mockup into ONE project-faithful standalone HTML deck with a vanilla-JS engine and interactive MVP demos for every main journey, so PO/BA/Dev/QC review the feature from one offline file before build.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Existing-UI Research:** [BLOCKING] inventory existing UI + map connected flows before any visual.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced proof per claim, confidence >80% to act, NEVER guess.

**IMPORTANT MUST ATTENTION** emit exactly ONE self-contained HTML deck at `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` (`{artifacts-root}` = default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) — inline CSS/JS, Google Fonts only, NO CDN reveal.js, vanilla-JS slide engine — why: stakeholders open one offline file with no server, no build step.
**IMPORTANT MUST ATTENTION** present every in-scope main user story as an interactive MVP demo slide ("click X → see Y → move to Z") — extract the journeys first (Step 5, one todo per journey), embed the self-driving interactive mockup + a deck narration strip + "⚠ Simulated" note, add a "How to drive this demo" guide slide, and sign off with the final Demo-Quality review (Step 8b) — why: a narrated journey answers "how does it work", which is what the user asked for; the deck adds only narration, never a second interactivity engine.
**IMPORTANT MUST ATTENTION** REUSE existing `-mockup.html` via `<iframe srcdoc="…escaped…">` — never regenerate a mockup that already exists; escaping rule (`&`-first, escape-once-unconditionally) lives in `references/deck-template.md` — why: re-rendering duplicates the mockup engine and risks divergence.
**IMPORTANT MUST ATTENTION** accept a PBI mockup only when its Releasable Full-Flow gate passes: all required pages/views, navigation edges, common/domain/page components, applicable states, and the visible/persisted business result are demoable; one static/disconnected screen set is FAIL and routes back to `pbi-mockup`.
**IMPORTANT MUST ATTENTION** spec-only `idea-to-spec` → design-spec ASCII wireframes + inventory/states/tokens tables + a narrated step-through of ASCII frames ONLY; NEVER generate HTML mockups, NEVER invoke `pbi-mockup` — why: full mockups break the spec-only no-code contract.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; add a final review todo to verify quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/next-step decisions with the user by asking the user directly — standalone + no prompt → ask which specs/ideas to present, never silently guess scope.

**Domain rules this skill must not skip:**

**IMPORTANT MUST ATTENTION** default scope anchors on `activePlan` and accumulates its FULL artifact set across the plan's created→now date range — NEVER just today's `{YYMMDD}` — why: a multi-day workflow authors specs on day 1 and PBIs on day 2; a single-day glob silently drops day-1 artifacts.
**IMPORTANT MUST ATTENTION** `workflow-spec-to-pbi` is `manual` tier — ask the user once and run it only on a yes, else report the gap; run multi-step gap-fill workflows as SUB-AGENTS — summary returned, full findings written to `tmp/reports/` per CLAUDE.md "Workflow Step Advancement §3" — why: inline activation pollutes the deck-build context with the full workflow transcript.
**IMPORTANT MUST ATTENTION** render an explicit empty-state slide when scope resolves to zero artifacts OR a feature has no mockup AND no design-spec — never fail, never a broken/blank iframe — why: stakeholders must always get a coherent deck.
**IMPORTANT MUST ATTENTION** [BLOCKING] inventory existing UI (Step 4) BEFORE assembling, then run the [BLOCKING] fidelity gate (Step 8, incl. demo integrity — every journey clicks through, no dead controls, narration tech-agnostic) AFTER — record `Fidelity vs existing UI: PASS|FAIL` (tokens / components / layout / flows / embeds / demos) and the final `Demo quality: PASS|FAIL` (Step 8b) — why: a generic-HTML or click-broken deck previews a system that does not exist.
**IMPORTANT MUST ATTENTION** use REAL domain entity field names + realistic sample data — NEVER Lorem ipsum or "Item 1, Item 2"; keep prose tech-agnostic (business terms, not framework/CSS class names) — why: fake data and tech-coupled prose mislead stakeholders.
**IMPORTANT MUST ATTENTION** the Scope & backlog slide MUST show PBIs in ranked order with each card's priority label + numeric rank (read from PBI frontmatter / the ranked backlog artifact) whenever the PBIs are prioritized — why: priority is a primary PO/BA decision input; a deck that hides it forces stakeholders back to the raw backlog. Note explicitly if PBIs are not yet prioritized rather than dropping the field.

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim/finding (confidence >80% to act, <80% verify first) — NEVER speculate about artifacts, design tokens, or component patterns without reading the source.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| "reveal.js is easier than a vanilla engine"      | CDN violates the self-contained contract. Vanilla-JS engine (~60 lines), Google Fonts only.   |
| "Regenerate the mockup, it's cleaner"            | Embed the existing `-mockup.html` via `<iframe srcdoc>`. Never duplicate the mockup engine.    |
| "Add a quick HTML mockup to the idea-to-spec deck"| Spec-only contract — design-spec ASCII + tables + narrated ASCII frames ONLY. No mockups, no `pbi-mockup`. |
| "A still screenshot of the mockup is enough"     | The user asked for an interactive MVP demo of each main journey — embed the self-driving mockup + a narration strip, don't flatten it to a still. |
| "Re-implement the click-through in the deck"     | The deck adds only narration; the mockup is self-driving (one engine). Embed it, don't duplicate its interactivity. |
| "Glob today's date, it's the same session"       | Multi-day workflows span midnight. Glob the plan's created→now range or day-1 artifacts vanish. |
| "Run the gap-fill workflow inline, it's faster"  | Multi-step workflows run as SUB-AGENTS — summary + `tmp/reports/`. Keeps context bounded.    |
| "No mockup? leave the slide blank"               | Render an explicit empty-state slide. Never a broken/blank iframe.                             |
| "PBI titles are enough on the backlog slide"     | Show each PBI in ranked order with its priority label + rank — priority is a primary PO/BA input; read it from PBI frontmatter / the backlog artifact. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**IMPORTANT MUST ATTENTION Goal:** Synthesize every in-scope session idea, Feature Spec, PBI, user story, design-spec, and mockup into ONE project-faithful standalone HTML deck with a vanilla-JS engine and interactive MVP demos for every main journey, so PO/BA/Dev/QC review the feature from one offline file before build.
**IMPORTANT MUST ATTENTION** ONE self-contained HTML (Google Fonts only, vanilla-JS engine), one interactive demo-flow slide per main journey (embedded self-driving mockup + narration strip + "⚠ Simulated" note) + a "How to drive this demo" guide slide; spec-only → design-spec visuals + narrated ASCII frames (never invoke `pbi-mockup`), empty-state slide never blank iframe.
**IMPORTANT MUST ATTENTION** plan journeys first (Step 5, one todo each), default scope = active-plan created→now range (not just today), gap-fill via SUB-AGENT, [BLOCKING] existing-UI inventory + fidelity gate (incl. demo integrity) + final Demo-Quality review (Step 8b), real domain data, cite `file:line` (>80% confidence) — NEVER guess.
**IMPORTANT MUST ATTENTION Main steps/modes (in order):** (1) resolve scope (`activePlan` created→now; custom prompt widens; standalone/no prompt asks) → (2) gap-fill (ask once, on a yes `workflow-spec-to-pbi` SUB-AGENT; `idea-to-pbi` missing mocks → `pbi-mockup`; `idea-to-spec` skips) → (3) design context → (4) [BLOCKING] UI/flow inventory → (5) artifacts + journeys/todos → (6) one deck, or spec-only ASCII/empty state → (7) save → (8) [BLOCKING] fidelity + demo integrity → (8b) [BLOCKING] Demo-Quality → (9) report. NEVER skip blocking gates or journey extraction — why: forgotten branches or gates produce incomplete, ungated decks.

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
