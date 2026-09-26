---
name: pbi-mockup
description: '[Project Management] Use when a workflow step or the user asks for an interactive HTML mockup from PBI/story or spec artifacts. Flags: --explore asks for 1-3 design directions (or skip) and lets the user pick, --source=<path>.'
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

**Goal:** Give stakeholders a clickable, self-narrating mock app for the PBI's complete releasable outcome — every required page/view, navigation path, component, state, and story flow — as one self-contained interactive HTML prototype built from finalized PBI/story artifacts or a canonical feature spec before implementation begins.

**Summary:**

- PRE-implementation preview tool, not a UI builder: run ONLY on finalized PBIs/stories (reviewed, gated) or a canonical feature spec with a UI intent layer; backend-only source with no UI sections → skip generation and tell the user; NEVER use for production UI, design specs, or scratch wireframes — why: it previews the wrong thing otherwise.
- **Journey-first, in BLOCKING order (`SYNC:ux-journey-gate`):** (1) analyze and REPORT the main user journeys (`UX-1`, Step 2a) → (2) read the design authority — design principles, design system, existing UI (`UX-2`, Steps 3 + 3b, recorded as `Design authority read:`) → (3) only then generate (Step 4) → walk every main journey + traceability matrix (`UX-8`, Steps 7 + 8). Views are journey steps, flows are main journeys.
- **Main steps/pipeline (run in order):** locate source (1) → extract UI specs (2) → **[BLOCKING] Journey Report (2a)** → **[BLOCKING] plan the page/view, component, state inventories from the journeys (2b)** → **[BLOCKING] plan demo flows = main journeys into flow-specs + one todo each (2c)** → decomposition boundary (2d) → load design system (3) → **[BLOCKING] inventory existing UI + map connected flows (3b)** → load domain entities (3c) → `--explore` only: scope gate first (Step 0: 3/2/1 drafts or skip), then N directions, user picks (3d) → generate the self-contained multi-view mock app HTML (4) → save (5) → report (6) → **[BLOCKING] fidelity validation (7)** → **[BLOCKING] releasable full-flow + demo-quality + journey-walkthrough gate (8)**. The BLOCKING gates (2a · 2b · 2c · 3b+7 · 8) must NEVER be skipped.
- Plan first, generate second: report the journeys (Step 2a), derive views (2b) and flows (2c) from them, and create one todo per flow BEFORE generating; sign off with a final Demo-Quality review gate (Step 8) auditing the generated prototype.
- **`--explore`:** after Steps 2a–3c and before Step 4, fan out N `ui-ux-designer` direction drafts (N = the Step 0 count) of the primary journey's key views (same journeys and priority tiers, divergent visuals), render them with html-export, open them in the default browser, ask the user to pick with ask the user directly when 2–3 drafts exist (your evidence-backed recommendation first; user cannot be asked → AUTO-SELECT the recommended draft with its reason), record the answer or the `Selection:` line, then build the full app in the chosen direction (Step 3d, `references/explore-directions.md`). Without the flag: one direction.
- Output is exactly ONE self-contained HTML file per PBI, but it MUST behave as a small mock app: include every page/view required by the releasable outcome, navigable transitions between them, all required components and states, and all stories as tabs/sections where useful. Inline CSS/JS, no external deps except Google Fonts, saved alongside the PBI artifact as `{pbi-filename}-mockup.html`.
- The mock-up is a **scripted clickable prototype** — each main-story flow clicks through end-to-end ("click X → see Y → move to Z") with guided narration (▶ Play / ⏭ Next / ⏮ Prev / ↺ Reset / ⏏ Exit), an explanation panel, and a visible "⚠ Simulated" banner; interactivity is **scripted/simulated only** (canned transitions, illustrative data) — NEVER real auth, persistence, or backend.
- Fidelity is the whole point — the mock-up must LOOK like the existing app: load the canonical + matched per-app design-system docs (NEW→canonical, REFACTOR→per-app), read real shared/module components for layout patterns, and populate with real domain entity fields and realistic sample data, never Lorem ipsum.
- **Releasable full-flow gate:** the prototype must start at the real entry/context, let a stakeholder navigate through the primary action and applicable validation/recovery states, reach the visible/persisted business result, and leave via the next/exit path. “Many pages” means all pages required by this journey, not an arbitrary page count.
- **Large-idea slice fidelity:** evaluate the shared `isLargeIdea` rule from the owning idea/spec/PBI. When any signal is true, read the complete `large_idea_decomposition` block, preserve the PBI's owning slice ID, and ensure the mock-up demonstrates only that slice's outcome, dependencies, non-goals, risks/evidence, and deferred-work boundary. Do not create or update the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path); flag a missing/conflicting block back to `$refine` or the owning spec.
- Render every defined component state (default/loading/empty/error) as toggleable, keep any accompanying prose/captions tech-agnostic (business terms, not framework/CSS class names) per the M1/M2 mandates, even though the rendered HTML may use real class names internally.

**Workflow:**

0. **Mockup Scope Gate (`--explore` only, FIRST)** — before any reading, ask 3 / 2 / 1 options or skip (question tool available); no question tool → one auto-selected draft
1. **Locate Source Artifact** — `--source=<path>` (PBI, story, spec or requirement report) or auto-detect the most recent PBI + story files in `pbis/` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); read fully
2. **Extract UI Specs** — parse UI Layout/Wireframe, Components, States, Interaction Flow, Acceptance Criteria + priority/rank (spec source: its UI intent layer — view inventory, navigation map, observable states, per-story action flows)
2a. **[BLOCKING] Analyze & Report Main User Journeys (`UX-1`)** — Journey Report (frame · actors + job statements · ranked main journeys with step tables · derived design requirements · assumptions) from the stories, acceptance criteria and business logic, BEFORE any design output
2b. **[BLOCKING] Plan the Mock-App Surface** — derive every required page/view (= journey steps), navigation edge, common/domain/page component, applicable state, and per-view information priority (`UX-4`) from the Journey Report; task tracking one todo for surface coverage
2c. **[BLOCKING] Plan the Demo Flows** — one flow-spec per main journey (plus any main story it misses), task tracking one todo per flow BEFORE generating
2d. **[BLOCKING] Verify decomposition boundary** — when `isLargeIdea=true`, validate the complete five-field `large_idea_decomposition` block and owning slice ID; record `N/A — ordinary isolated scope` when all signals are false
3. **Load Design System (`UX-2`)** — baseline + matched per-app design tokens, colors, typography (NEW→canonical, REFACTOR→per-app)
3b. **[BLOCKING] Inventory Existing UI + Map Connected Flows (`UX-2`)** — read real shared/module components + map entry/exit flows; record `Design authority read:` before any generation
3c. **Load Domain Entities** — entity fields, relationships, enums for realistic sample data
3d. **Explore N Directions (`--explore` only)** — N (Step 0 count) `ui-ux-designer` drafts of the primary journey's key views, rendered with html-export, opened in the default browser; with 2–3 drafts ASK the user to pick (ask the user directly, your recommended draft first); record the pick or the `Selection:` line in `direction-approved.md`
4. **Generate HTML** — one self-contained scripted clickable prototype + guided walkthrough matching the app's look and feel (and the approved direction under `--explore`)
5. **Save** — write `{pbi-filename}-mockup.html` beside the PBI artifact (spec source: `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path))
6. **Report** — path, priority, stories, journeys, demo flows, components, states, fidelity + demo-quality verdicts
7. **[BLOCKING] Fidelity Validation** — mock-up matches inventoried UI (tokens/components/layout/connected flows) and each view's information priority; record PASS/FAIL
8. **[BLOCKING] Demo-Quality Review Gate** — every flow clicks end-to-end, `UX-8` walkthrough of every main journey + traceability matrix, no dead controls, narration + "⚠ Simulated" banner, offline, real data, iframe-safe; record PASS/FAIL

**Key Rules:**

- Ask AI to generate an **interactive HTML mock-up** for UI PBIs; do not stop at an ASCII-only or static mockup — every main-story flow is a scripted clickable prototype with guided narration.
- One HTML file per PBI, containing a navigable mock app with all required pages/views; all stories may be shown as sections/tabs, but tabs do not replace missing flow pages
- The generated surface MUST cover the complete releasable outcome: entry/context, action/input, validation/decision, success/result, resulting visible/persisted truth, exit/next action, and applicable recovery/access states
- Include a page/view inventory, navigation map, component inventory (common/domain/page), and state inventory in the generation report; a single static screen or disconnected screen set FAILS the gate
- Report the main user journeys (Step 2a, `UX-1`) and read the design authority (Steps 3 + 3b, `UX-2`) BEFORE any design output; derive views (Step 2b) and demo flows (Step 2c) from the journeys BEFORE generating; sign off with the Demo-Quality + journey-walkthrough gate (Step 8, `UX-8`) AFTER
- `--explore` → Step 0 scope gate, then N direction drafts, user picks, then build (Step 3d); never pick for the user while they can be asked
- Interactivity is **scripted/simulated only** (canned transitions, illustrative data, "⚠ Simulated" banner) — NEVER real `fetch`/auth/persistence/backend; self-contained so it runs inside the deck's `<iframe srcdoc>`
- Self-contained: inline CSS/JS, no external dependencies except Google Fonts
- **Must resemble the project's current UI** — read existing component templates and page layouts
- Design must be based on project reference design docs: `docs/project-reference/design-system/README.md`, `docs/project-reference/design-system/design-system-canonical.md`, and the matched per-app design-system doc from `docs/project-config.json`
- Match project design system: colors, typography, spacing, BEM naming
- Use **real domain entity fields and realistic sample data** — not Lorem ipsum
- Include component states (default, loading, empty, error)
- Responsive layout with mobile/desktop preview
- Save in same directory as the PBI artifact
- **Tech-agnostic descriptive prose (M1/M2):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Any narrative, captions, annotations, generation notes, or component/state descriptions accompanying the mock-up describe components and states by business/observable terms (e.g., "status indicator", "record list", "loading placeholder"), NOT by framework component names or CSS class names. The rendered HTML itself may use real class names internally (that is implementation, not prose), but the human-readable descriptions stay tech-agnostic per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
- **Releasable outcome contract:** Apply `.claude/skills/shared/releasable-pbi-contract.md`; the mockup is complete only when it demonstrates the PBI's actor-facing outcome through all required views, components, states, and transitions. A single static screen is a blocking failure.
- **Decomposition contract:** Apply `.claude/skills/shared/product-roadmap-contract.md`; for a large idea, the report and mock-up header must name the owning slice ID and state `Decomposition boundary: PASS | BLOCKED`. A mock-up must not invent a new slice, roadmap, milestone, or deferred owner.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# PBI HTML Mockup Generator

Generate visual HTML mockup reports from PBI and user story artifacts.

---

## When to Use

- After PBI and stories are finalized (reviewed, challenged, gated)
- When a canonical feature spec with a UI intent layer needs an interactive preview (`--source=<spec path>`, optionally with a `$design-spec` output)
- Before moving to implementation planning or design spec
- When stakeholders need a visual preview of the feature, or 1–3 design directions to choose from first (`--explore`)
- As the final step in `workflow-idea-to-pbi` and similar workflows

**NOT for**: Implementing production UI (use `$feature-implement`), creating design specs (use `$design-spec`), or wireframing from scratch (use `$design-spec --mode=wireframe`).

---

## Quick Reference

### Input

| Source          | Path                                                    |
| --------------- | ------------------------------------------------------- |
| PBI artifact    | `pbis/{YYMMDD}-pbi-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)            |
| Story artifacts | `pbis/stories/{YYMMDD}-us-{pbi-slug}.md` under that same team-artifacts root (default `team-artifacts`; overridden by `docsRoots.teamArtifacts.path` in `docs/project-config.json`) |
| Feature spec    | A canonical feature spec under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — read its UI intent layer (`SYNC:ui-intent-layer`: view inventory, navigation map, observable states, per-story action flows) and business rules |
| Design spec     | Optional companion from `$design-spec` (`design-specs/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)) — layout, components and states for the same feature |
| Explicit path   | `--source=<path>` (PBI, story or spec); a bare path argument is accepted as `--source` |

### Flags

| Flag              | Effect                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `--source=<path>` | Source artifact: PBI, story, feature spec or requirement report. Omitted → auto-detect the most recent PBI (Step 1)                 |
| `--explore`       | Before the full build, ask how many design directions to generate (3 / 2 / 1 / skip — asked at Step 0, FIRST, before any reading; no question tool → one, auto-selected), then generate them of the primary journey's key views, render them, open them in the default browser, and ask the user to pick with a recommended option (Step 3d). Omitted → single direction |

### Output

| Type        | Path                                           |
| ----------- | ---------------------------------------------- |
| HTML mockup (PBI/story source) | `{same-dir-as-pbi}/{pbi-filename}-mockup.html` |
| HTML mockup (spec source) | `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) — never inside the spec root |
| `--explore` run artifacts | `tmp/design/<run>/` — `journey-report.md`, `run-notes.md`, `direction-{a,b,c}.html`, `renders/direction-{a,b,c}/`, `direction-approved.md` (disposable) |

### Related

- **Input from:** `$refine`, `$story`, `$spec` (canonical feature spec), `$design-spec`
- **Command:** `$pbi-mockup [--source=<path>] [--explore]`
- **Uses:** `html-export` (Step 3d renders, Step 7 optional render evidence), `ui-ux-designer` sub-agents (Step 3d)
- **Next Step:** `$prioritize`, `$design-spec`, `$plan`

---

## Detailed Workflow

### Step 0: Mockup Scope Gate (`--explore` only; FIRST, before ANY reading or analysis)

> **Purpose:** let the user skip or shrink mockup generation BEFORE any tokens are spent on it. This is a pre-generation confirm, not the post-generation pick (that is Step 3d).

- **ask the user directly available → ALWAYS ask first**, before Step 1: "Generate design mockup options for <feature/surface>?" Options: `3 options` · `2 options` · `1 option` · `Skip mockup`. Mark one `(Recommended)` by the requested scope, judged from the request text only: a new page or multi-view flow → 3; a single component or dialog → 1–2. Use one short line of context per option (for example the token and time cost of 3 drafts versus 1).
- **`Skip mockup`** → STOP this skill now. Record `Mockup: SKIPPED by user (Step 0)` in the calling plan or run report; the workflow continues without a mockup.
- **`1` / `2` / `3 options`** → run Steps 1–8 as written; Step 3d builds exactly that many drafts (`1 option` → one draft in your recommended direction, still rendered and opened, recorded `Selection: USER — 1 option`, no pick needed).
- **ask the user directly NOT available** (a non-interactive host, a sub-agent only when no session in the run can ask the user, an autonomous or scheduled run) → do not ask and do not block: run Steps 1–8 with ONE draft in the recommended direction (best main-journey fit and best fit with the project design system), auto-select it, and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in `direction-approved.md` and in the plan or run report.

**Run it where the user can be asked:** when this skill runs as a workflow step, Step 0 and the Step 3d pick execute in the main session; a delegated sub-agent may build drafts but never owns Step 0 or the pick, and the no-question-tool fallback is only for hosts where no session can ask. **Never ask twice:** when the calling workflow already asked this at its start and recorded the answer in its run report, reuse that answer. Without `--explore` (a direct single-direction request), Step 0 does not apply.

### Step 1: Locate Source Artifact

1. If `--source=<path>` (or a bare path argument) is provided, use it as the source path and classify it: **PBI**, **story** (resolve its parent PBI via the story's PBI link or slug, then continue as a PBI source), or **feature spec** (a file under the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path — or a file whose frontmatter/headings declare a feature spec), or **requirement report** (a workflow run's investigation, requirement or plan report — e.g. from `workflow-feature` or `workflow-bugfix` when the work adds new UI and no PBI or spec covers it yet)
2. Otherwise, auto-detect the most recent PBI: glob `pbis/*-pbi-*.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), sorted by modification time
3. Read the source artifact fully
4. **PBI source:** check for associated stories: glob `pbis/stories/*-us-{pbi-slug}*.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); read all story artifacts if found
5. **Spec source:** read the spec's UI intent layer (`SYNC:ui-intent-layer` — view inventory with information priority and container role, navigation map, key observable states, per-story action flows), its user stories and acceptance criteria, and its business rules; read `feature-spec-reference.md` and `spec-system-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) for the section layout when they exist. When a `$design-spec` output exists for the same feature (`design-specs/` under the team-artifacts root), read it too. A spec with no UI intent layer and no UI stories is treated as backend-only (Step 2). Reuse the spec's view and flow vocabulary verbatim — never rename a view the spec names
6. **Requirement-report source:** read the report's requirement, affected users, business rules and the existing UI it names; derive the Journey Report (Step 2a) from it plus the code's business logic and the existing UI. Every claim not stated in the report is tagged `INFERRED`; confirm an inferred primary actor, main job or outcome with the user before Step 3d (no question tool → record it `INFERRED — unconfirmed (no question tool)` and continue). Save the mockup under `tmp/design/<run>/` beside the drafts, and record its path in the report so the plan consumes it.

### Step 2: Extract UI Specifications

From the PBI and story artifacts (or, for a spec source, the matching spec sections: View Inventory → layout, Key observable states → States, Per-story action flows → Interaction Flow, acceptance criteria / test cases → Acceptance Criteria, business rules → rules; a design-spec supplies layout and components), extract:

| Section                            | What to Extract                       |
| ---------------------------------- | ------------------------------------- |
| `## UI Layout` / `## UI Wireframe` | ASCII wireframe, layout description   |
| `### Components`                   | Component names, behaviors, tiers     |
| `### States`                       | Default, Loading, Empty, Error states |
| `### Interaction Flow`             | User actions and system responses     |
| `## Acceptance Criteria`           | GIVEN/WHEN/THEN scenarios for context |
| `## Description`                   | User role, capability, business value |
| frontmatter `priority` / `rank`    | PBI priority label + numeric rank — render in the header (Step 4). MANDATORY when present; the mockup MUST carry the same priority info as the backlog. |
| `large_idea_decomposition` / slice ID | Slice outcome, dependency boundary, non-goals, risk/evidence owner, and deferred-work ownership — preserve read-only when present |

**Requirement-report or spec source:** judge UI scope by the requirement's user-facing intent — the new or reshaped pages, views, components or dialogs it names — never by the presence of PBI `## UI Layout` sections, which such a source does not have. Skip only when that intent names no user-facing surface.

If no UI sections exist (backend-only PBI), inform user and skip mockup generation:

> "This PBI has no UI sections (marked as backend-only). No mockup generated."

### Step 2a: [BLOCKING] Analyze & Report Main User Journeys (`UX-1`)

> **[BLOCKING] No wireframe, design plan, token table, direction draft or HTML before this report exists** (`SYNC:ux-journey-gate` `UX-1`). The mock app hosts the user's journeys; the journeys decide the views, their information priority and the demo flows. Template and method: `.claude/docs/ux-journey-process.md` §4 (Journey Report), §5 (choosing main journeys), §10 (depth by scope).

1. **Read the evidence** (catalog §3) — the source's stories ("As a / I want / So that"), acceptance criteria (GIVEN/WHEN/THEN), `### Interaction Flow` or the spec's per-story action flows and navigation map, the business rules (validation, permissions, status transitions, limits, side effects — from the spec, or from code when the artifacts are thin), and the related existing screens. Cite each source. **A companion `$design-spec` that already carries a reviewed Journey Report** is the starting evidence: reuse it, re-confirm only what the source changed since, and surface — never silently re-derive — any journey that disagrees with it.
2. **Write the Journey Report** per catalog §4 — frame (problem · business goal · success signal · constraints) · actors with context, expertise and frequency, one job statement each · the main journeys ranked by frequency × business value × risk × first-use criticality (3–5 for a feature; 1–2 for a single new view) · per journey a step table (intent · decision/action · information needed · business rule · system response · failure → recovery) with entry and exit · derived design requirements (views, information priority per view, rules → interaction, critical states) · assumptions and open questions. Tag claims `SOURCED (<location>)` or `INFERRED (<reason>)`.
3. **Confirm the load-bearing inferences** — when the primary actor, their main job or the success outcome is only `INFERRED`, confirm it with the user BEFORE Step 2b; with no question tool, record it as `INFERRED — unconfirmed (no question tool)` in the assumptions and the Step 6 report and continue — never block. Other inferences stay as labelled assumptions.
4. **Present it** in the response (and carry it into the Step 6 report); under `--explore` Step 3d also persists it for the direction drafts.

The report's J-IDs (`J1` = the top-ranked main journey) are the keys Steps 2b, 2c, 7 and 8 trace against.

### Step 2b: [BLOCKING] Plan the Mock-App Surface (views = journey steps; components, states, priority)

> **[BLOCKING] Do NOT generate a one-screen mockup.** Treat the output as a small mock app for the source's releasable outcome. DERIVE the surface from the Step 2a Journey Report before writing HTML — every view hosts ≥1 journey step and every main-journey step lands on a view (`UX-3`).

1. **Build the page/view inventory from the journey steps** — group the Journey Report's steps into views by task cohesion; name each view's role, the steps it hosts, its primary task and its container (full view · dialog only for short focused tasks · side panel · stepped flow). Cover entering the feature, inspecting or providing required context, performing the primary action, validation/error/recovery, confirming the result, and leaving or continuing. Include supporting list/detail/manage/history/access views when a journey needs them. A spec source's View Inventory is the starting list — reuse its view names verbatim.
2. **Build the navigation map** — from each journey's entry, step order and exit: name each entry point, transition trigger, destination, back/exit path, and the state carried across the transition. A tab or section is acceptable only when it represents a real view in the journey; it must not hide a missing page.
3. **Rank information priority per view (`UX-4`, catalog §6)** — inventory each view's information and actions from the steps it hosts, score need-at-the-decision × frequency × cost-of-missing, and tier them: **Primary** (one focal point, ONE primary action = the journey's next step) · **Secondary** · **On demand** (progressive disclosure) · **Not here** (owning view named). Order within a tier by the journey's step order. Step 4's visual hierarchy implements this ranking and never reshuffles it.
4. **Map business rules to interaction (`UX-5`, catalog §7)** — for every rule on a journey step, pick the lightest treatment that PREVENTS the error before one that reports it (constraints, defaults, conditional visibility, permission-aware actions, state-driven transitions, undo over confirm, confirm only the irreversible, async feedback), and name each step's failure → recovery path.
5. **Build the component inventory** — classify every needed component as common/reusable, domain-shared, or page-level. Include the components that make the flow usable: navigation, forms, validation, status, confirmation, empty/loading/error, dialogs, lists/details, and recovery controls where applicable.
6. **Build the state inventory** — connect default, loading, empty, error, success, permission-denied, duplicate-submit, refresh, and recovery states to the views/components where they apply. Do not invent states that the source does not need; record `N/A` with a reason.
7. **Create one task tracking todo for surface coverage** — keep it open until every inventory item is rendered and connected in the prototype; add the Step 8 full-flow gate as the final todo.

The inventory is complete only when a stakeholder can follow the whole business outcome from entry to visible/persisted result and then exit/continue. “Many pages” is a completeness rule, not a fixed page-count requirement.

### Step 2c: [BLOCKING] Plan the Demo Flows (flows = main journeys; many todos BEFORE generating)

> **[BLOCKING] Do NOT generate the mock-up until every main journey is planned as a flow-spec and a todo exists per flow.** The mock-up is a clickable, self-narrating prototype of the source's main journeys — plan the journeys first, generate second.

1. **Enumerate the flows from the Journey Report** — one flow per main journey (`J1`…`Jn`), its steps taken from the journey's step table; then cross-check `### Interaction Flow` (or the spec's per-story action flows), the acceptance-criteria scenarios and each story's "As a / I want / So that" — a main user story no journey covers gets its own flow AND is added back to the Journey Report. MVP happy paths — not every edge case.
2. **Author one flow-spec per flow** — fill the `references/interactive-demo.md` §1 schema: `id`, `journey` (the J-ID), business-language `title`, `persona`, `trigger`, ordered `steps[]` where each step = `{ action: "user clicks/selects/types X", result: "screen/state Y appears", explain: "plain-language why" }`, and `endState`. The `explain`/`title` prose stays tech-agnostic (business terms, not class names) per M1/M2.
3. **task tracking one todo per flow** — so each journey is generated and later verified (Step 8) individually; add the Step 8 Demo-Quality review as the final todo.

Each flow-spec MUST reference the page/view inventory and finish at the PBI's named releasable outcome, not at an intermediate technical state. Add the applicable validation, recovery, persistence, access, and exit views to the flow even when the happy path is the primary walkthrough.

> See `references/interactive-demo.md` §1 for the flow-spec schema + a worked example.

### Step 3: Load Design System Context (`UX-2` design-authority read, part 1)

> **[BLOCKING] Steps 3 and 3b together are the `UX-2` design-authority read, and BOTH must complete before Step 3d or Step 4 generates anything.** Read the project's design principles/guidelines, design system (tokens, components, patterns), styling conventions, accepted design ADRs and the existing related UI; adopt house patterns and never invent a token or component the project already defines.

1. Read the source's `module` field from frontmatter (spec source: its module/service ownership)
2. Load design system docs dynamically (project-config.json + glob fallback). The HTML mock-up design must be based on these project reference design docs:
    - **Mandatory baseline:** Read `design-system/README.md` and `design-system/design-system-canonical.md`, both inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
    - **Primary:** Read top-level `designSystem` in `docs/project-config.json`: use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the PBI/app context against `designSystem.appMappings[]` to select the per-app doc. Do NOT look for `designSystem` on module entries.
    - **Fallback:** glob `design-system/*.md` inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) → match module name against discovered file names (case-insensitive substring match)
    - **Default:** If no match found, use `design-system/README.md` in that same reference-docs root (default `docs/project-reference`; overridden by `docsRoots.projectReference.path` in `docs/project-config.json`)
    - **Triage rule (NEW vs REFACTOR):** For NEW pages/components → load `designSystem.canonicalDoc` from top-level `project-config.json` (single source of truth for new code). For REFACTOR of existing screens → load the matched per-app doc via top-level `designSystem.appMappings` (current-state inventory).

3. Extract from design system docs (read enough of the canonical and matched per-app docs to apply the rules):
    - **Colors:** Primary, secondary, accent, background, text colors
    - **Typography:** Font families, sizes, weights
    - **Spacing:** Margin/padding scale
    - **Border radius:** Component roundness
    - **Shadows:** Elevation levels

4. Optionally read `configured styling reference` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) (first 100 lines) for the project's selected styling patterns
5. Read the project's design principles/guidelines and accepted design ADRs (the ADR root — default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path) when they exist; they outrank the brief's defaults and the framework clauses.

### Step 3b: [BLOCKING] Inventory Existing UI + Map Connected Flows (`UX-2` design-authority read, part 2)

> **[BLOCKING] Do NOT generate the mockup until this inventory + connected-flow map is done** (canonical: `SYNC:existing-ui-research`). The mockup must faithfully match the current UI system, not generic HTML.

The mockup should resemble the project's actual UI, not generic HTML. Discover existing components AND map the flows that connect to this screen:

1. Read `frontend-patterns-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) (first 200 lines) — extract base component classes, common UI patterns, form patterns, table/grid patterns, dialog/modal patterns
2. Glob the project's shared component library (if exists):
    - `Glob("**/libs/*common*/**/*.component.ts")` or `Glob("**/shared/**/*.component.ts")` — discover reusable components (buttons, tables, forms, dialogs, filters, status badges)
    - Read 2-3 key component files to understand their HTML template structure and CSS class naming
3. Glob the module's own components (if PBI module detected):
    - Search for existing page components in the module to understand the current UI layout patterns
    - Read 1-2 existing page templates to capture the actual look and feel (sidebar layout, toolbar patterns, card grids, etc.)
4. Extract from discovered components:
    - **Layout patterns:** Sidebar + content, full-width, split-panel, tabbed
    - **Common components:** Table with pagination, filter bar, action buttons, status chips, breadcrumbs
    - **Form patterns:** Form groups, validation display, multi-step forms
    - **Navigation:** Tab bars, breadcrumbs, sidebar menus
5. **Map connected feature flows** — identify every existing feature/screen that links to, embeds, includes, or navigates to/from this new screen; note the entry/exit flows so the mockup fits the surrounding navigation, not just a standalone page.

> **Key principle:** Mimic existing system UI. If the project has a table with specific column patterns, use that pattern. If it has card-based layouts, use cards. The mockup should feel like it belongs in the existing application.

6. **Record the design-authority read (`UX-2`)** — before leaving Step 3b, write `Design authority read: <paths read in Steps 3 + 3b>` (or `N/A — none configured (checked: <paths>)`) in the response and carry it into the Step 6 report. A companion design-spec's `Design authority read:` record may seed this list; re-read any path it names that Steps 3 + 3b depend on. No record → Step 3d and Step 4 are BLOCKED.

### Step 3c: Load Domain Entity Context

Use real domain entities and relationships for realistic mockup data:

1. Read `domain-entities-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) if it exists — extract entities, fields, relationships for the PBI's module
2. From the PBI artifact, extract referenced entities from `## Domain Context` section
3. Use entity field names and types to generate **realistic sample data** in the mockup:
    - Entity names → table column headers, form field labels
    - Entity relationships → navigation links, dropdowns, nested displays
    - Entity statuses/enums → status badges, filter options
    - Date fields → realistic date values
    - String fields → domain-appropriate sample text (customer names, invoice titles, etc.)

> **Key principle:** Sample data should use actual entity field names and realistic domain values — not "Lorem ipsum" or "Item 1, Item 2".

### Step 3d: Explore N Directions (`--explore` only)

> **Runs ONLY with `--explore`, after Steps 2a–3c and before Step 4.** Without the flag, record `Explore: not requested` and go to Step 4 (single direction). **First action: read `references/explore-directions.md`** and follow it step by step — it adapts the design skill's explore workflow (`.claude/skills/design/references/explore/workflow.md`) to a mock app.

0. **Use the Step 0 scope decision.** Build the number of drafts the user chose at Step 0 (3, 2 or 1). Skip was already handled at Step 0, and with no question tool Step 0 fixed ONE auto-selected draft, so pick seeds and fan out only that many sub-agents.
1. **Resolve authority per axis** (colour · type · layout) from Steps 3 + 3b. A project design system (or existing UI) that pins all three → record them `ADOPTED`, write the exemption in `tmp/design/<run>/direction-approved.md`, log `Explore: SKIPPED — <reason>`, and continue at Step 4.
2. **Pick N divergence seeds** and fan out N `ui-ux-designer` sub-agents in ONE message; each builds a direction draft of the KEY views of the primary journey (`J1`) — not the whole app — into `tmp/design/<run>/direction-{a,b,c}.html` (as many as N). All N serve the SAME journeys, views, information-priority tiers, primary actions and rule treatments; they diverge only on the FREE visual axes and the layout skeleton.
3. **After all N return**, render each with html-export to PNG under `tmp/design/<run>/renders/direction-{a,b,c}/`, reading the exit code first (never install dependencies).
4. **Present the N drafts side by side** with how each serves the primary journey, **open each in the default browser** (`node .claude/scripts/open-report.cjs tmp/design/<run>/direction-<x>.html`), then, with 2–3 drafts, **ask with ask the user directly** — one option per draft, your evidence-backed recommendation first labelled `(Recommended)` — never pick for the user while they can be asked; "continue" is not a pick. One draft (`1 option` or no question tool) → no question; its `Selection:` line is already set. Drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit), record `Selection: AUTO-SELECTED — <reason>` and continue (`references/explore-directions.md` Step 7).
5. **Record the verbatim pick or the `Selection:` line** in `tmp/design/<run>/direction-approved.md` (explore gate-file template), then build the full interactive multi-view mock app in the chosen direction at Step 4.

### Step 4: Generate HTML Mockup

> **Precondition (BLOCKING):** the Step 2a Journey Report exists, the Step 2b/2c plans are derived from it, the `Design authority read:` record exists (Steps 3 + 3b), and under `--explore` the direction pick is recorded in `direction-approved.md` (or the exemption is logged). Build every view with its Step 2b information-priority tiers — one focal point and ONE primary action per view — and its rule → interaction treatments (`UX-4`, `UX-5`), in the user's vocabulary (`UX-6`). Under `--explore`, the approved direction's visual axes and layout skeleton are fixed inputs for EVERY view and flow, not only the key views drafted.

Generate a **single self-contained HTML file** with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mockup: {PBI Title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
            /* Design system tokens as CSS variables */
            /* Component styles matching project BEM conventions */
            /* Responsive breakpoints */
            /* Dark/light theme support */
        </style>
    </head>
    <body>
        <!-- PBI Header: title, description, metadata -->
        <!-- Mock-app navigation: every planned page/view and its entry/exit transitions -->
        <!-- Story sections with mockup UI; tabs may group real views but never replace them -->
        <!-- Page/view panels covering the complete releasable outcome -->
        <!-- Common, domain, and page-level components from the component inventory -->
        <!-- Component state toggles (default/loading/empty/error) -->
        <!-- Interactive prototype: screens/states + hotspots + demo control bar + explanation panel + "⚠ Simulated" banner -->
        <script>
            /* Tab navigation */
            /* State toggles */
            /* Theme toggle */
            /* Responsive preview toggle */
            /* Prototype engine: goTo(viewOrStateId) router + page navigation + hotspots + simulated submit — see references/interactive-demo.md §2 */
            /* Guided walkthrough: ▶ Play ⏭ Next ⏮ Prev ↺ Reset ⏏ Exit — see references/interactive-demo.md §3 */
        </script>
    </body>
</html>
```

#### Interactive Prototype + Guided Walkthrough

The mock-up is a **scripted clickable prototype** of each planned flow (Step 2c), not a still image. For EVERY flow-spec, render the journey so a stakeholder can click through it and watch it narrate. Mechanics are delegated — do NOT inline the engine here:

1. **Screen/state router + hotspots** — render each flow's screens/states as DOM sections and wire clickable hotspots that `goTo` the next state (`references/interactive-demo.md §2`). Simulated submit → success toast → in-memory row insert; NO real `fetch`/persistence/backend.
2. **Demo controls + guided walkthrough** — a control bar (`▶ Play · ⏭ Next · ⏮ Prev · ↺ Reset · ⏏ Exit`) auto-/step-walks the flow, spotlighting the active hotspot (`references/interactive-demo.md §3`).
3. **Explanation panel + "⚠ Simulated" banner** — a persistent panel names the current flow + step (`n / total`) + the step's plain-language `explain`; a visible "⚠ Simulated — illustrative data, no real actions are performed" banner is the scope guard (`references/interactive-demo.md §4`).
4. **Affordances + a11y** — hotspots visibly highlighted (pulse/outline), disabled controls show a tooltip, demo never traps the user, `prefers-reduced-motion` respected (`references/interactive-demo.md §5`).

> **Scope guard:** interactivity is **scripted/simulated only** (canned transitions, illustrative data) — never real auth, persistence, or backend calls; self-contained so it runs inside the deck's `<iframe srcdoc>` sandbox (`references/interactive-demo.md §6`).

#### Design-Principles Build Constraints (real markup, not advice)

The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`, the `SYNC:ui-ux-design-principles` block below) are BUILD CONSTRAINTS on the emitted HTML/CSS — the mock-up must actually DO these, not merely describe them. Project design-system tokens outrank the clause defaults; a genuine conflict goes to the user, NEVER resolved silently.

1. **Build the empty, loading and error views FIRST (`UI-1.5`)** — author those three state panels BEFORE the populated one and wire each into the state toggle (Default | Loading | Empty | Error) so a stakeholder can click into them. A story panel rendering only the populated view is incomplete.
2. **Real focus rings (`UI-5.5`)** — every focusable control keeps a VISIBLE `:focus-visible` outline in the emitted CSS. `outline: none` with no replacement ring is a build defect; tab through each flow before the Step 8 gate.
3. **All 5 interaction states as real CSS (`UI-5.2`)** — `:hover`, `:focus-visible`, `:active`, `[disabled]` and the default rule exist for every button, link, input, tab and hotspot; disabled controls are visibly muted AND non-interactive, not merely unbound.
4. **Real 44×44pt touch targets (`UI-8.1`, `UI-8.2`)** — every tappable element carries a `min-width`/`min-height` of at least 44px (the hit area may exceed the visible icon) with ≥8px separation, in the responsive/mobile preview as well as desktop; primary actions sit in the bottom third of the mobile viewport.
5. **Reserved space for anything that loads (`UI-9.3`, `UI-9.1`)** — images, avatars, charts and skeletons carry explicit width/height or aspect-ratio so switching Default ↔ Loading NEVER shifts the layout; skeletons for known layouts, spinners only for unknown waits.
6. **Declared scales emitted as CSS variables (`UI-2.5`, `UI-4.1`)** — the type scale as 6 named custom properties and the spacing scale from ONE 4px or 8px base; every `font-size`, `padding`, `margin` and `gap` references a variable. Hard-coded one-off px values are a build defect.
7. **Measured contrast (`UI-3.1`, `UI-3.2`, `UI-3.3`)** — text ≥4.5:1 and UI edges/borders ≥3:1 against their ACTUAL backgrounds in BOTH themes, one accent with one job, and status chips / validation states pair colour with an icon or text label so colour never carries the meaning alone.
8. **Body type and measure (`UI-2.2`, `UI-2.3`)** — body text 16px (17px in the mobile preview) and never below 14px for readable content; prose columns constrained to a 45–75 character measure.
9. **Motion budget (`UI-5.4`)** — transitions 150–250ms ease-out, and the guided walkthrough honours `prefers-reduced-motion` (already required by the prototype a11y rule above).
10. **Forms (`UI-7.2`, `UI-7.3`, `UI-7.5`)** — visible labels on every input (placeholders are hints, NEVER labels); the error state shows the message beside its field with a fix instruction; simulated navigation between demo steps preserves entered values.

#### HTML Structure Requirements

1. **Header Section:**
    - PBI ID and title
    - Module badge
    - **Priority badge** — the PBI's priority label + numeric rank from frontmatter (e.g. "Priority: Must Have · Rank #2"). MANDATORY when the PBI carries `priority`/`rank`; the mockup MUST surface the same priority info as the backlog so stakeholders see it on the prototype itself. Omit only when the PBI genuinely has no priority assigned yet.
    - Story count summary
    - Generation date

2. **Navigation:**
    - Navigable page/view controls for every item in the page/view inventory; story tabs/sections may group the views
    - Entry, back, next, exit, and recovery paths are wired; no dead-end page is accepted unless it is the intentional final result
    - Active view highlight using design system primary color

3. **Story Panels:**
    - Story title and description ("As a... I want... So that...")
    - Visual mockup of every page/view required by the story's full flow, not only its first screen
    - Component placeholders with realistic sample data
    - State toggle buttons (Default | Loading | Empty | Error)

4. **Footer:**
    - "Generated from PBI {ID}" attribution
    - Link back to artifact path
    - Generation timestamp

#### Styling Rules

- Base every visual decision on the loaded project reference design docs; cite the docs used in the generation notes when reporting the mock-up.
- Use CSS custom properties (variables) from design system tokens
- Follow BEM naming: `mockup__header`, `mockup__nav`, `mockup__panel`
- Match the project's color palette, typography, and spacing
- Include both light and dark theme (toggle button in header)
- Responsive: mobile (< 768px) and desktop layout — mobile must stay usable: reflow where possible (stack rows, collapse grids to one column); where a block genuinely can't reflow (tables, wide grids) give it `overflow: auto` scroll rather than letting it clip; nothing broken or cut off
- Use realistic placeholder data (names, dates, numbers) — not "Lorem ipsum"

#### Component Rendering

Map wireframe components to HTML elements AND to their scripted demo interaction (the hotspot/transition that advances the flow — `references/interactive-demo.md §2`):

| Wireframe Component | HTML Rendering                             | Demo Interaction (scripted/simulated)                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Table/Grid          | `<table>` with design system styles        | Row click → `goTo` detail screen/state                         |
| Form                | `<form>` with labeled inputs               | Submit → simulated success toast + in-memory row insert        |
| Button              | `<button>` with primary/secondary variants | Hotspot → advances the demo to the next screen/state           |
| Card                | `<div class="card">` with shadow           | Card click → `goTo` the card's detail screen/state             |
| List                | `<ul>` or data list                        | Item click → `goTo` selected-item screen/state                 |
| Modal/Dialog        | Overlay `<div>` (toggleable)               | Trigger → open dialog state; confirm/cancel → `goTo` next      |
| Tab panel           | Tab navigation with content panels         | Tab → switch panel (no nav away)                               |
| Search/Filter       | Input with icon                            | Apply → simulated filtered result state                        |
| Status badge        | `<span>` with color coding                 | Non-interactive (illustrative state indicator)                 |
| Empty state         | Centered message with icon                 | Primary CTA → `goTo` the create/first-action screen/state      |
| Loading state       | Skeleton placeholder or spinner            | Transient → auto-advances to the loaded screen/state           |
| Error state         | Error banner with message                  | Retry → `goTo` back to the prior screen/state                  |

### Step 5: Save HTML File

- **Path:** Same directory as the PBI artifact
- **Name:** `{pbi-filename-without-ext}-mockup.html`
- Example: `pbis/260324-pbi-goal-tracking-mockup.html` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
- **Spec source:** `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) — never inside the business spec root, which holds canonical specs only
- **Requirement-report source:** `tmp/design/<run>/mockup.html` beside the drafts (no PBI or spec folder exists yet); record that path in the calling plan or run report so the plan's UI Layout links it
- **`--explore`:** the direction drafts, renders and `direction-approved.md` stay under `tmp/design/<run>/` (disposable run output); only the full mock app is saved here

### Step 6: Report to User

After generation, output:

```
Mockup generated: {path}
- Source: {PBI | story | spec path} (+ design-spec path when used)
- PBI priority: {priority label} · Rank #{rank}  (or "not yet prioritized")
- Stories covered: {count}
- Main journeys (Journey Report, UX-1): {J1…Jn titles + primary actor}
- Design authority read (UX-2): {paths | N/A — none configured (checked: …)}
- Direction (--explore): {approved a | b | c | mix — tmp/design/<run>/direction-approved.md | SKIPPED — <reason> | not requested}
- Demo flows: {count} ({flow titles → J-IDs})
- Releasable outcome: {actor + observable outcome}
- Pages/views rendered: {count + inventory — every required view, not an arbitrary page count}
- Navigation map: {entry → transitions → result → exit}
- Components rendered: {common + domain + page inventory}
- States included: {default, loading, empty, error}
- Full-flow coverage: PASS | FAIL
- Fidelity vs existing UI: PASS | FAIL
- Demo quality: PASS | FAIL
- Journey walkthrough + traceability (UX-8): PASS | FAIL — {unserved steps / orphan elements, or none}
- Interaction cost + wayfinding (UX-9, UX-10): PASS | FAIL — {per-journey counts vs baseline; dead ends, or none}
- UI/UX Gate Report (UX-11): {table — UX / UI / DD / CL / copy rows with PASS | FAIL → fixed | N/A + evidence}

Open in browser to preview. Click highlighted hotspots or press ▶ Play to walk a flow. Use theme toggle for dark/light mode.
```

---

### Step 7: [BLOCKING] Fidelity Validation — Mockup Matches Existing UI

> **[BLOCKING] After the HTML is generated, validate it faithfully matches the existing UI inventoried in Step 3b before handing off.** Do NOT report the mockup as done until this validation records a result — a mockup that does not match the current system is not done.

Validate the produced mockup against the inventoried existing UI and record an explicit pass/fail:

1. **Design tokens** — colors, typography, spacing match the project design system (Step 3).
2. **Component patterns** — tables, forms, dialogs, status chips, and navigation reuse the existing component patterns (Step 3b), not generic HTML.
3. **Layout/structure** — the screen layout matches the existing pages of the related feature (sidebar / toolbar / card-grid conventions).
4. **Connected flows** — entry/exit navigation matches the connected feature flows mapped in Step 3b.
5. **Information priority (`UX-4`)** — each view's rendered hierarchy implements its Step 2b tiers: the Primary-tier item is the single focal point, ONE primary action matches the journey's next step, On-demand items sit behind progressive disclosure, and no high cost-of-missing item is hidden. A visual hierarchy that reshuffles the ranking FAILS.
6. **Approved direction (`--explore` only)** — colour, type and layout skeleton match `direction-approved.md` across EVERY view, not only the drafted key views.

**Optional render evidence (when html-export is installed):** `node .claude/skills/html-export/scripts/export.cjs --to=png <mockup.html> --slides='[data-state]'` at the default viewports captures EVERY screen; attach the per-screen PNGs to the fidelity verdict. Exit 0 is evidence ONLY for per-screen render, zero page errors, and no blank captures — items 1–4 still judge fidelity. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

Record the outcome in the Step 6 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / information priority (/ approved direction) matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the mockup to match the existing UI and re-validate before handoff.

---

### Step 8: [BLOCKING] Demo-Quality Review Gate

> **[BLOCKING] This is the final review todo (Step 2c created it).** After fidelity passes, audit the GENERATED interactive prototype's demo quality before handoff. Do NOT report the mock-up as done until this records a result — a prototype with a dead control or a flow that does not click through is not done. Full checklist: `references/interactive-demo.md §7`.

**First, confirm the result SATISFIES the source's intent** (not merely that it renders): every Journey Report main journey and every main user story in the source's `## Acceptance Criteria` / `### Interaction Flow` (or the spec's per-story action flows) is represented by a flow-spec demo (coverage — no main journey or story missing), the page/view inventory is fully rendered and navigable, AND each prototype faithfully demonstrates that story's intended behavior end-to-end. Then audit the produced prototype against every planned flow-spec and record an explicit pass/fail:

0. **Satisfies the PBI intent** — every main-story/MVP flow from the acceptance criteria is present and its demo conveys the intended behavior; if a story has no demo or the demo misrepresents it, this gate FAILS regardless of the items below.
1. **Releasable full-flow coverage** — every planned page/view is present, every required navigation edge is wired, required common/domain/page components are rendered, and applicable states are reachable. One isolated screen or disconnected screen set FAILS.
2. **Outcome journey clicks end-to-end** — each flow's `steps[]` reaches the named business `endState` via real hotspots and shows the visible/persisted truth plus exit/next path; no path dead-ends.
3. **No dead controls** — every button/hotspot advances the demo or is visibly disabled-with-tooltip.
4. **Narration present + tech-agnostic** — every step shows its plain-language `explain`; copy is business-language (M1/M2), not class names; the "⚠ Simulated — illustrative data, no real actions are performed" banner is visible on every flow.
5. **Opens offline standalone** — no external `<script src>`; Google Fonts CSS only; no JS console errors.
6. **Real domain data** — screens/rows use real entity field names + realistic values, never Lorem ipsum.
7. **iframe-safe** — works self-contained inside an `<iframe srcdoc>` sandbox (no parent-document or network dependency) so the deck can embed it.

8. **Journey walkthrough (`UX-8`, `.claude/docs/ux-journey-process.md` §9)** — walk EVERY Journey Report main journey on the built prototype as its named actor; per step answer: will the user know the step is needed · notice the correct action · link that action to their goal · see that progress was made? Each "no" is a finding (step · view · element · fix).
9. **Traceability matrix (`UX-8`)** — one row per journey step: `Journey · step | View | Element(s) serving it | Information shown (tier) | Rule enforced | States covered | Walkthrough result`. An **unserved step** (no view/element) or an **orphan element** (traces to no step, need or rule — delete or justify it) FAILS the gate. Include the matrix in the Step 6 report.
10. **Interaction cost + wayfinding (`UX-9`, `UX-10`, catalog §12)** — per main journey record steps · clicks · view changes · fields · decisions on the prototype against the existing flow or the source flow, and cut what does not advance the job; every view marks where the user is, labels destinations in user words, and offers a back/exit path that keeps entered data — no dead-end or orphan view. The primary tier renders in the first viewport.
11. **UI/UX Gate Report (`UX-11`, catalog §13)** — one row per gate (`UX-*`, applicable `UI-*`, `DD-*`, `CL-*` with at least the `CL-5` triage, UI copy), each `PASS` / `FAIL → fixed` / `N/A` with evidence. A gate missing from the report counts as not checked; an unresolved `FAIL` blocks hand-off.

Record the outcome in the Step 6 report:

```
Full-flow + demo quality: PASS | FAIL — releasable outcome covered (all required pages/views + navigation + components + states) / every main story demoed faithfully / outcome journey reaches visible result and exit / no dead controls / narration tech-agnostic + banner / offline / real data / iframe-safe / every main journey walked (UX-8) + traceability matrix with no unserved step or orphan element? If FAIL: what broke + the fix.
```

If **FAIL**, fix the prototype (re-author from the flow-spec — cheap) and re-audit before handoff.

---

## Mockup Quality Checklist

Before completing:

- [ ] HTML file is self-contained (opens correctly without a server)
- [ ] All stories from PBI are represented as sections/tabs
- [ ] Releasable outcome is named and demonstrated from entry/context to visible/persisted result and exit/next action
- [ ] Every required page/view is rendered and navigable; page count reflects the actual flow, not an arbitrary target
- [ ] Navigation map is wired, including entry/back/next/exit/recovery paths
- [ ] Common, domain, and page-level components required by the flow are rendered with applicable states
- [ ] Journey Report (Step 2a, `UX-1`) presented before any design output; inferred primary actor/job/outcome confirmed, or recorded `INFERRED — unconfirmed (no question tool)`
- [ ] `Design authority read:` recorded (Steps 3 + 3b, `UX-2`) before Step 3d/Step 4 generation
- [ ] Every main journey's flow (Step 2c) is rendered as a scripted clickable prototype with guided narration
- [ ] Every view renders its Step 2b information-priority tiers — one focal point, ONE primary action = the journey's next step (`UX-4`); business rules shown as prevention, states and recovery (`UX-5`)
- [ ] `UX-8` journey walkthrough + traceability matrix recorded (Step 8) — no unserved step, no orphan element
- [ ] Interaction cost per main journey and wayfinding per view recorded (`UX-9`, `UX-10`)
- [ ] UI/UX Gate Report covers every gate — `UX-*`, `UI-*`, `DD-*`, `CL-*`, UI copy — with no open `FAIL` (`UX-11`)
- [ ] `--explore` only: Step 0 scope answer recorded; N rendered directions presented and opened, the user's verbatim pick, the `Selection: USER — 1 option` / `Selection: AUTO-SELECTED — <reason>` line, or the exemption recorded in `direction-approved.md` (or `Mockup: SKIPPED by user`), full app built in that direction
- [ ] Design is based on `design-system-canonical.md` plus the matched per-app design-system doc when available
- [ ] Design system colors and typography match the project
- [ ] Component states are toggleable (where defined in artifact)
- [ ] Responsive layout works for mobile and desktop — usable on small screens with nothing clipped/cut-off/unreachable (reflow preferred; `overflow: auto` scroll acceptable where a block can't reflow)
- [ ] Realistic placeholder data used (not Lorem ipsum)
- [ ] PBI metadata shown in header (ID, title, module, date)
- [ ] PBI priority shown in header (priority label + numeric rank from frontmatter) when the PBI is prioritized — the mockup carries the same priority info as the backlog
- [ ] File saved alongside the PBI artifact
- [ ] Fidelity validation (Step 7) recorded PASS — mockup matches existing UI tokens, components, layout, connected flows and each view's information priority (and the approved direction under `--explore`)
- [ ] Releasable full-flow + Demo-Quality gate (Step 8) recorded PASS — all required views/navigation/components/states are connected, every flow reaches the business result and exit, no dead controls, narration + "⚠ Simulated" banner present, offline, iframe-safe
- [ ] Design-Principles build constraints hold — `UI-1.5` empty/loading/error panels BUILT and toggleable, `UI-5.5` visible focus ring on every focusable control, `UI-5.2` all 5 interaction states in real CSS, `UI-8.1`/`UI-8.2` real ≥44×44px touch targets 8px apart with bottom-third primaries in the mobile preview, `UI-9.3` reserved space so state switches never shift layout, `UI-2.5`/`UI-4.1` 6-step type scale + ONE 4/8px spacing unit emitted as CSS variables, `UI-3.1`/`UI-3.3` contrast measured 4.5:1 text / 3:1 edges in both themes and colour never the sole carrier of meaning

---

## Edge Cases

| Scenario                          | Handling                                                |
| --------------------------------- | ------------------------------------------------------- |
| Backend-only PBI (no UI sections), or a requirement report / spec whose intent names no user-facing surface | Skip mockup, inform user                                |
| No stories yet (PBI only)         | Generate HTML mock-up from PBI's UI Layout section only |
| Multiple modules                  | Load primary module's design system                     |
| No design system docs             | Use sensible defaults (Inter font, neutral palette)     |
| Very large PBI (10+ stories)      | Group stories into categories, use collapsible sections |
| Spec source with no UI intent layer and no UI stories | Treat as backend-only: skip mockup, inform user; suggest `$spec` to add the UI intent layer when a UI is expected |
| Primary actor, main job or success outcome only INFERRED | Confirm with the user at Step 2a before Step 2b; no question tool → record `INFERRED — unconfirmed (no question tool)` as an assumption and continue — never generate on a silently assumed journey |
| `--explore` but the design system pins colour, type AND layout | Record all three `ADOPTED`, write the exemption in `direction-approved.md`, log `Explore: SKIPPED — <reason>`, build single-direction |
| `--explore` renders exit 3 / 1 / 2 | Present the drafts' HTML paths marked `NOT VERIFIABLE`; still open/ask for the pick; never install dependencies |

---

## Anti-Patterns

| Anti-Pattern                                       | Correct Approach                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Production-quality CSS framework                   | Simple inline CSS matching design tokens                                                          |
| External dependencies (CDN libs)                   | Self-contained except Google Fonts                                                                |
| Pixel-perfect implementation                       | Approximate visual representation                                                                 |
| Real backend/business logic (auth, live API, persistence) | Scripted/simulated prototype interactivity only — clickable nav, simulated transitions, guided demo; NO real business logic or data writes |
| Dead / non-wired buttons                           | Every control either advances the demo or is visibly disabled-with-tooltip                        |
| Lorem ipsum placeholder text                       | Realistic domain-specific sample data                                                            |
| Screens designed first, journeys inferred after    | Journey Report (Step 2a) first; views and flows derived from it; walkthrough + traceability at Step 8 |
| Drafts that differ in what the user sees first | Same journeys, views, priority tiers and primary actions in every draft; diverge only on free visual axes and layout skeleton |
| Picking a direction for the user / treating "continue" as a pick | Present and open the N rendered drafts, ask with a recommended option, record the user's verbatim pick; only a user who cannot be asked gets an AUTO-SELECTED draft, recorded with its reason |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use ask the user directly to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** via `$start-workflow workflow-idea-to-pbi` (Recommended) — includes mockup as final step
> 2. **Execute `$pbi-mockup` directly** — run this skill standalone on an existing PBI, story or canonical feature spec (`--source=<path>`); add `--explore` to choose among 1–3 design directions first (Step 0 scope gate)

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$prioritize (Recommended)"** — Prioritize the PBI in the backlog (PBI/story source)
- **"$design-spec"** — Create detailed design specification from mockup (the Journey Report, traceability matrix and approved direction carry over)
- **"$plan"** — Start implementation planning
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
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Give stakeholders a clickable, self-narrating mock app for the PBI's complete releasable outcome — every required page/view, navigation path, component, state, and story flow — as one self-contained interactive HTML prototype built from finalized PBI/story artifacts or a canonical feature spec before implementation begins.

**IMPORTANT MUST ATTENTION Main steps:** locate and read the finalized PBI/stories or spec (`--source`) → extract the UI and full-flow contract → REPORT the main user journeys (`UX-1`) → derive views/priority/states and demo flows from them → read the design authority + existing UI/domain (`UX-2`) → `--explore`: Step 0 scope gate (3/2/1 or skip), N rendered directions, user picks (or AUTO-SELECTED when the user cannot be asked) → generate the connected mock app → save → run fidelity, releasable Demo-Quality and journey-walkthrough (`UX-8`) gates.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced proof per claim, confidence >80% to act, NEVER guess.
- **UX Journey Gate:** MUST ATTENTION Journey Report (`UX-1`) → design-authority read (`UX-2`) → only then generate; views = journey steps, flows = main journeys, per-view priority tiers, walk every main journey + traceability matrix (`UX-8`).

**IMPORTANT MUST ATTENTION** run ONLY on finalized PBIs/stories (reviewed, challenged, gated); for a backend-only PBI with no UI sections, SKIP generation and tell the user — never fabricate UI — why: a mock-up of an unfinished or UI-less PBI previews the wrong thing.
**IMPORTANT MUST ATTENTION** run the FULL step pipeline in order — locate (1) → extract UI (2) → Journey Report [BLOCKING] (2a) → plan mock-app surface [BLOCKING] (2b) → plan flows [BLOCKING] (2c) → decomposition boundary (2d) → load design system (3) → inventory existing UI [BLOCKING] (3b) → load domain entities (3c) → `--explore` directions + user pick (3d) → generate multi-view mock app HTML (4) → save (5) → report (6) → fidelity validation [BLOCKING] (7) → releasable full-flow + demo-quality + journey-walkthrough gate [BLOCKING] (8); NEVER skip the BLOCKING gates (2a journeys · 2b surface · 2c plan · 3b inventory + 7 fidelity · 8 full-flow/demo-quality/UX-8) — why: each guards a distinct failure (no journeys → screens with no job; missing surface → one-screen mockup; no flow plan → incomplete demo; no inventory/fidelity → generic mismatch; no final audit → dead controls and unserved steps).
**IMPORTANT MUST ATTENTION** journey-first in BLOCKING order — REPORT the main user journeys (Step 2a, `UX-1`; confirm an inferred primary actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed`) → read the design authority and record `Design authority read:` (Steps 3 + 3b, `UX-2`) → only then generate (Step 3d/4) — why: a surface designed before its journeys are known hosts the wrong steps, and one designed before the design system is read invents what the project already defines.
**IMPORTANT MUST ATTENTION** PLAN the mock-app surface and demo flows FROM the Journey Report BEFORE generating — Step 2b derives every page/view (= journey steps), navigation edge, component, state and per-view information-priority tier (`UX-4`) plus rule → interaction treatments (`UX-5`); Step 2c turns each main journey into a flow-spec and task trackings one todo per flow; Step 8 [BLOCKING] full-flow + Demo-Quality gate walks every main journey with a traceability matrix (`UX-8`) AFTER — why: the output must be a complete mock app outcome, not an isolated screen.
**IMPORTANT MUST ATTENTION** `--explore` (Step 3d, read `references/explore-directions.md`): resolve authority per axis (all three axes pinned → ADOPTED, skip with logged reason) → N (Step 0 count) `ui-ux-designer` drafts of the primary journey's key views in ONE message, same journeys and priority tiers, divergent only on free visual axes/layout → render each with html-export (exit code first, never install) → present side by side, open each in the default browser → with 2–3 drafts ask with ask the user directly, recommended draft first with evidence, never pick for them while they can be asked, "continue" is not a pick (cannot be asked → AUTO-SELECT with reason) → record the verbatim pick or `Selection:` line in `direction-approved.md` → build the FULL app in that direction — why: the user chooses the direction by looking, and the drafts are not the deliverable.
**IMPORTANT MUST ATTENTION** render each main-story flow as a **scripted clickable prototype** with guided narration (▶ Play · ⏭ Next · ⏮ Prev · ↺ Reset · ⏏ Exit), an explanation panel, and a visible "⚠ Simulated — illustrative data, no real actions are performed" banner; interactivity is **scripted/simulated only** (canned transitions) — NEVER real `fetch`/auth/persistence/backend; self-contained so it runs inside the deck's `<iframe srcdoc>` (mechanics: `references/interactive-demo.md §2–§4`) — why: a clickable prototype conveys behavior at the lowest cost, but a real backend breaks the offline preview-before-code purpose.
**IMPORTANT MUST ATTENTION** emit exactly ONE self-contained HTML file per PBI or spec, containing every required page/view as navigable mock-app screens (stories may be grouped as tabs/sections), inline CSS/JS, no external deps except Google Fonts, saved as `{pbi-filename}-mockup.html` beside the PBI artifact (spec source: `design-specs/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), never inside the spec root) — why: stakeholders open one complete outcome with no server or build step.

**IMPORTANT MUST ATTENTION** the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) are BUILD CONSTRAINTS on the emitted HTML/CSS, not prose advice — build the empty/loading/error panels FIRST and make them toggleable (`UI-1.5`), emit all 5 interaction states as real CSS with a VISIBLE focus ring (`UI-5.2`, `UI-5.5`), real ≥44×44px touch targets 8px apart with bottom-third primaries in the mobile preview (`UI-8.1`, `UI-8.2`), reserved space so a state switch never shifts layout (`UI-9.3`), the 6-step type scale (`UI-2.5`) and ONE 4/8px spacing unit (`UI-4.1`) emitted as CSS variables with no one-off px values, and contrast MEASURED 4.5:1 text / 3:1 edges in both themes with colour never carrying meaning alone (`UI-3.1`, `UI-3.3`) — why: a mock-up that only describes these previews a quality the built UI will not have.

**IMPORTANT MUST ATTENTION** render the PBI's priority in the header (priority label + numeric rank from frontmatter) whenever the PBI is prioritized — why: the mockup is a stakeholder-facing prototype and MUST carry the same priority info as the backlog, not just the title; downstream `feature-presentation` reuses it.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; add a final review todo to verify quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/next-step decisions with the user by asking the user directly — never auto-decide complexity for the user.

**Domain rules this skill must not skip:**

**IMPORTANT MUST ATTENTION** fidelity is the whole point — the mock-up must LOOK like the existing app: load the mandatory baseline + matched per-app design-system docs (NEW→`designSystem.canonicalDoc`, REFACTOR→matched `designSystem.appMappings` per-app doc), read real shared/module components for layout patterns — why: a generic-HTML mock-up previews a system that does not exist.
**IMPORTANT MUST ATTENTION** populate with real domain entity field names and realistic sample data — NEVER Lorem ipsum or "Item 1, Item 2" — why: fake data hides the real layout/overflow/state gaps the preview exists to surface.
**IMPORTANT MUST ATTENTION** render every defined component state (default/loading/empty/error) as a toggleable view — why: stakeholders must see how the UI degrades, not only the happy path.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/releasable-pbi-contract.md`: the mockup MUST cover the PBI's full entry-to-result journey, all required pages/views, navigation, common/domain/page components, and applicable states; one static or disconnected screen set FAILS.
**IMPORTANT MUST ATTENTION** keep all accompanying prose/captions/notes tech-agnostic (business/observable terms, NOT framework or CSS class names) per the M1/M2 mandates in `.claude/skills/shared/sdd-artifact-contract.md`; the rendered HTML MAY use real class names internally (implementation, not prose) — why: tech-coupled descriptions break the spec-principles §3 contract while the rendered markup stays free to be concrete.
**IMPORTANT MUST ATTENTION** read design-system docs, existing components, and domain-entities reference (all in the reference-docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) BEFORE generating — grep/read 2-3 real components first — why: skipping the read produces a mock-up that looks nothing like the app.

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim/finding (confidence >80% to act, <80% verify first) — NEVER speculate about entity fields, design tokens, or component patterns without reading the source — why: hallucinated fields and class names produce a misleading preview.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| "PBI looks ready, skip the gated/finalized check"| Run only on reviewed-and-gated PBIs. An unfinished PBI previews the wrong thing.            |
| "A static mockup is faster than a clickable one" | Static conveys layout only, not behavior — the user asked for an MVP demo. Render each flow as a scripted clickable prototype (regenerated from the §1 flow-spec — cheap). |
| "Skip the flow planning, just generate"          | Step 2c (flow-specs + one todo per flow) is BLOCKING; planning the journeys first is what makes the prototype complete and click-through-verifiable. |
| "Wire it to a real endpoint so it feels real"    | Interactivity is scripted/simulated only — canned transitions, illustrative data, "⚠ Simulated" banner. NO real `fetch`/auth/persistence/backend. |
| "Lorem ipsum is faster"                          | Fake data hides real overflow/state gaps. Use real entity field names + realistic values.  |
| "Generic clean HTML is good enough"              | Fidelity is the point — read design-system docs + 2-3 real components, mimic the actual UI. |
| "Class names in the notes are fine"              | Prose stays tech-agnostic (M1/M2). Real class names live in the rendered HTML, not captions.|
| "Only need the default state"                    | Render every defined state (default/loading/empty/error) as toggleable.                     |
| "Already know the entity fields"                 | Show `file:line` from the domain-entities reference. No proof = no read.                     |
| "The stories already describe the journeys"     | Stories list wants; the Journey Report (Step 2a) ranks journeys, names each step's decision, information need, rule and recovery — the views and priority tiers come from it. Present it first. |
| "Pick the strongest direction to save a turn"    | `--explore` ASKS for the user's pick — recommend with evidence, never pick for them while they can be asked, and "continue" is not a pick. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**IMPORTANT MUST ATTENTION Goal:** navigable, self-contained mock app of the PBI's complete releasable actor-facing outcome — all required pages/views, navigation, components, states, and story flows — from real domain data + the actual design system, BEFORE implementation.
**IMPORTANT MUST ATTENTION** Journey Report first (Step 2a, `UX-1`) → design-authority read (Steps 3 + 3b, `UX-2`) → `--explore` pick (Step 3d) → generate; PLAN the mock-app surface (Step 2b: views = journey steps, navigation, components, states, priority tiers) and flows (Step 2c: one per main journey, one todo each) first; Step 8 signs off the connected full-flow outcome, Demo-Quality and the `UX-8` walkthrough + traceability matrix — one isolated screen or unserved journey step FAILS.
**IMPORTANT MUST ATTENTION** ONE self-contained HTML per PBI (Google Fonts only) containing every required navigable view, real domain data not Lorem ipsum, every applicable component state toggleable, and prose tech-agnostic (M1/M2).
**IMPORTANT MUST ATTENTION** read design-system docs + real components + domain-entities reference first; cite `file:line` (>80% confidence) — NEVER guess fields or tokens.

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
