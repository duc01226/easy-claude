---
name: design
description: '[Design] Use when creating or describing a UI design. Flags: --mode={fast|good|explore|describe|screenshot|video} (default fast), --lane={product|marketing} (default product).'
disable-model-invocation: false
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

## Quick Summary

**Goal:** Create (or describe) a UI design using design-intelligence databases and subagents, dispatched by `--mode` (input carrier) × `--lane` (design lane).

**Summary:**

- **Route:** parse `--mode={fast|good|explore|describe|screenshot|video}` and `--lane={product|marketing}`; default to `fast` × `product`.
- **Spine (BLOCKING order, every mode):** Journey Report (`UX-1`) → design authority read — principles, design system, existing UI (`UX-2`) → design-intelligence search (candidates only) → ingest visual evidence when applicable → low-fi structure walked against the journeys (`UX-7`) → design with `ui-ux-designer` (`DD-3` plan + `UI-*`/`DD-*`) → implement unless `describe` → validate by walking the journeys + traceability (`UX-8`) → report and seek approval.
- **Quality floor:** apply project tokens/components plus `UI-*`/`DD-*`/`CL-*`; design states, interaction feedback, declared scales, measured contrast, touch targets, responsive reflow, and subject-grounded copy before the happy path.
- **Ownership:** `$design` authors the visual direction and implementation contract; `$ui-review` owns source findings and review evidence; the local index supplies candidates only.

> **Renamed:** folds the former `/design-fast`, `/design-good`, `/design-describe`, `/design-screenshot`, `/design-video` skills into the same-named value of `--mode={fast|good|explore|describe|screenshot|video}` — those names no longer resolve as slash commands; use `$design --mode=…`.
>
> **Absorbed lanes:** the former `frontend-design` (marketing/creative) and `interface-design` (product-UI) skills now fold into `--lane={marketing|product}` — those names no longer resolve as slash commands; use `$design --lane=…`. Each lane's full body lives under `references/lane-{marketing,product}/lane-guide.md`.

**Mode dispatch:** `--mode={fast|good|explore|describe|screenshot|video}` — default `fast` when omitted.
**Lane dispatch:** `--lane={product|marketing}` — default `product` when omitted. Lane (the design tradition) is orthogonal to mode (the input carrier); any mode combines with any lane.

| Lane                  | Use for                                                                 | Full body |
| --------------------- | ----------------------------------------------------------------------- | --------- |
| `product` (default)   | dashboards, admin panels, SaaS apps, tools, settings, data interfaces   | `references/lane-product/lane-guide.md` |
| `marketing`           | landing pages, marketing sites, campaigns, distinctive creative pieces  | `references/lane-marketing/lane-guide.md` |

| Mode                  | Input carrier               | Output                                                       |
| --------------------- | --------------------------- | ----------------------------------------------------------- |
| `fast` (default)      | text brief                  | quick prototype implementation                              |
| `good`                | text brief                  | immersive, researched, higher-quality implementation        |
| `explore`             | text brief                  | 1–3 divergent drafts (count asked first) → user picks one → continues as `good` |
| `describe`            | screenshot / video          | super-detailed written description + implementation plan (NO code) |
| `screenshot`          | screenshot                  | design recreated from the image as functional code          |
| `video`               | video                       | design + interactions recreated from the video as functional code |

**Shared workflow (journey-first spine — BLOCKING order, every mode):**

1. **Journey Report (`UX-1`)** — Analyze and REPORT the main user journeys BEFORE any other output (template: `.claude/docs/ux-journey-process.md` §4, depth per §10). Confirm an inferred primary actor, main job or success outcome with the user before generating.
2. **Design authority read (`UX-2`)** — Read the project's design principles/guidelines, the design system resolved from `docs/project-config.json` (`designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`) and the existing related UI (`SYNC:existing-ui-research`); record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`.
3. **Research** — Run this skill's design-intelligence search, framed by the Journey Report; results are candidates only, never project authority.
4. **Ingest** — For visual modes (`describe`/`screenshot`/`video`), use `visual analysis tooling` to analyze the screenshot/video in super-detail.
5. **Low-fi structure (`UX-7`)** — Sketch flow and views (ASCII is enough) from the journey steps (`UX-3`) and per-decision-point priority (`UX-4`); walk the main journeys on it before any styling.
6. **Design** — Use `ui-ux-designer` subagent to layer the `DD-3` Design Plan and visual design (or, for `describe`, an implementation plan) on the validated structure, applying `UI-*`/`DD-*` and the selected lane's craft body.
7. **Implement** — Build as code following the selected lane guide: `references/lane-product/lane-guide.md` (product UIs) or `references/lane-marketing/lane-guide.md` (marketing/creative). Skipped in `describe` mode.
8. **Validate (`UX-8`)** — Cognitive walkthrough of every main journey on the produced design plus a traceability matrix (journey step → view → element → information tier → rule → states); fix every unserved step and orphan element before hand-off. Measure interaction cost per main journey (`UX-9`) and check wayfinding on every view (`UX-10`) (catalog §12).
9. **Report** — Close with the **UI/UX Gate Report** (`UX-11`, catalog §13): one row per gate (`UX-*`, applicable `UI-*`, `DD-*`, `CL-*` with at least the `CL-5` triage, UI copy), each `PASS` / `FAIL → fixed` / `N/A` with evidence; an unresolved `FAIL` blocks hand-off. Present to user for approval with the Journey Report, walkthrough result, matrix and Gate Report; update `./docs/design-guidelines.md` if needed.

**Key Rules:**

- Report the main user journeys (`UX-1`) first, then resolve the project's design principles, accepted design system and existing UI (`UX-2`); only then use this skill's local design-intelligence index as candidate input.
- Default to pure HTML/CSS/JS if the user doesn't specify a framework
- Use `visual analysis tooling` for generating AND reviewing real visual assets
- Use media processing tooling (RMBG) to remove backgrounds from generated assets when needed

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Arguments & Mode Dispatch

`$design --mode={fast|good|explore|describe|screenshot|video} --lane={product|marketing} <brief | screenshot | video>`

- When `--mode` is omitted, default to `--mode=fast`.
- When `--lane` is omitted, default to `--lane=product` (the dominant PBI/app use). Pick `marketing` for landing pages, campaigns, and distinctive creative pieces.
- `--mode` (input carrier) and `--lane` (design tradition) are orthogonal — e.g. `--mode=screenshot --lane=product` recreates a dashboard screenshot in the product-UI craft tradition.
- `$ARGUMENTS` carries the full input after the command. Interpret it per mode: `fast`/`good`/`explore` → a text design brief; `describe`/`screenshot` → a screenshot reference (path/URL/attachment); `video` → a video reference.

### Lane selection (apply the chosen lane's craft body at stages 6-7)

- **`--lane=product` (default)** — product UIs: dashboards, admin panels, SaaS apps, tools. Domain-driven craft (intent → domain exploration → signature → layered surfaces/tokens). Full body: `references/lane-product/lane-guide.md`.
- **`--lane=marketing`** — marketing/creative: landing pages, campaigns, screenshot replication. Bold aesthetic direction (distinctive type, cohesive palette, atmosphere, motion). Full body: `references/lane-marketing/lane-guide.md`.

Do NOT inline the lane bodies here — read the matching `lane-guide.md` when the lane is selected.

## Required Skills (Priority Order)

1. **In-skill design-intelligence search/data** — Query `scripts/search.py` after the Journey Report (`UX-1`) and the design-authority/existing-UI read (`UX-2`); results are candidate input, not project authority.
2. **In-skill lane references** — `references/lane-{product|marketing}/lane-guide.md` (+ their reference files) own implementation, screenshot/video analysis, and design replication for the selected lane.
3. **In-skill explore references** — `references/explore/workflow.md` (+ `gate-files.md`, `brand-asset-protocol.md`) own the `--mode=explore` flow; read them only when that mode is selected.

**Ensure token efficiency while maintaining high quality.**

## Shared First Step (ALL modes)

> **[BLOCKING] Step 0 — Journey Report (`UX-1`).** Before any wireframe, mockup, design plan, token table, search result or code, analyze and PRESENT the main user journeys, per `SYNC:ux-journey-gate` and the template in `.claude/docs/ux-journey-process.md` §4: frame · actors + job statements · 3–5 ranked main journeys with step tables (intent · decision/action · information needed · business rule · system response · failure → recovery) · derived design requirements · assumptions and open questions, each claim tagged `SOURCED (location)` or `INFERRED`. Depth scales with scope (§10), never to zero for a new or reshaped view. **Confirm an inferred primary actor, main job or success outcome with the user before generating.**
>
> **[BLOCKING] Step 0b — Design authority read + existing UI (`UX-2`).** Resolve from `docs/project-config.json` and its reference docs, then read the project's design principles/guidelines, the design system (`designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`), accepted design ADRs, and the existing related UI — inventory the screens and components already serving this feature/domain and map every connected flow that links to / embeds / navigates to-or-from it (`SYNC:existing-ui-research`). Record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`. Adopt house patterns; never invent tokens or components the project already defines.
>
> Skip Steps 0 and 0b ONLY for work with no user-facing surface, stated explicitly.

**THEN**, after Steps 0 and 0b, run focused design-intelligence searches — framed by the Journey Report — to gather candidate input:

```bash
# Windows: py -3 · macOS/Linux: python3 (same arguments)
py -3 .claude/skills/design/scripts/search.py "<product-type>" --domain product
py -3 .claude/skills/design/scripts/search.py "<style-keywords>" --domain style
py -3 .claude/skills/design/scripts/search.py "<mood>" --domain typography
py -3 .claude/skills/design/scripts/search.py "<industry>" --domain color
```

## Design Intelligence Research Contract

The local index is a research aid owned by this skill. It supplies structured candidates; it never outranks the adopter project's accepted brief, design system, tokens, components, frontend conventions, or accessibility requirements.

1. **Frame the query.** Derive the product type, audience and job-to-be-done from the Journey Report (`UX-1`: frame, actors, job statements, main journeys), then add industry, desired style, platform, implementation stack, and constraints before searching.
2. **Search deliberately.** Query `product`, `style`, `typography`, and `color` first; add `landing`, `chart`, `ux`, `prompt`, and the relevant `--stack` query when the surface needs them. Use specific domain terms and more than one query when the brief has multiple concerns.
3. **Resolve and record authority.** Read `docs/project-config.json` and resolve `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]` when present. Reconcile candidates against the accepted brief, existing-UI inventory, shared `UI-*`/`DD-*`/`CL-*` contracts, and the selected lane. Record why important candidates were selected or rejected; never invent tokens, components, breakpoints, or stack defaults when the project has not declared them.
4. **Keep implementation quality explicit.** Use the project's icon system or one consistent accessible SVG set; do not use emoji as UI icons; verify official brand marks. Define stable hover, focus, active, disabled, and loading feedback without layout shift, using the project's cursor and motion conventions.
5. **Design state coverage before the happy path.** Specify `Default`, `Loading`, `Disabled`, `Error`, `Empty`, and `Success` where applicable. Errors need human-readable recovery, empty states need a meaningful next action, in-flight actions must prevent duplicate submission, and successful actions need acknowledgment.
6. **Design for reachable reflow.** Use the project's content breakpoints. If none are declared, smoke-check 320, 768, 1024, and 1440 widths: rows reflow, grids collapse, non-reflow content has an intentional reachable scroll fallback, and nothing is clipped or unreachable. Surface any large refactor or new breakpoint as an explicit decision.

`ui-review` remains the owner of source-level findings, evidence, severity, component ownership, and review procedure. This contract makes the same quality floor explicit while authoring a design; it does not duplicate or replace the review skill.

## UX Journey Contract (all modes)

The journey-first gate (`UX-1`–`UX-11`, `SYNC:ux-journey-gate`; deep catalog `.claude/docs/ux-journey-process.md`) binds EVERY mode and runs BEFORE `UI-*`/`DD-*`/`CL-*`, because those judge a surface whose purpose it defines. Steps 0 and 0b above deliver `UX-1` and `UX-2`.

**Generative modes (`fast`, `good`, `explore`) — DERIVE the design from the journeys:**

1. **Views are journey steps (`UX-3`)** — every view hosts ≥1 main-journey step and names its primary task; every step lands on a view; the container fits the task (catalog §2 S5).
2. **Priority per decision point (`UX-4`)** — rank each item and action by need-at-the-decision × frequency × cost-of-missing into Primary · Secondary · On demand · Not here; ONE focal point and ONE primary action = the journey's next step (catalog §6).
3. **Rules become interaction (`UX-5`)** — map each business rule to the lightest treatment that prevents the error before one that reports it; design each step's failure → recovery (catalog §7).
4. **Low-fi before hi-fi (`UX-7`)** — walk the main journeys on the ASCII structure before layering the `DD-3` Design Plan.
5. **Walk before reporting (`UX-8`)** — cognitive walkthrough of every main journey plus the traceability matrix (catalog §9); an unserved step or orphan element is fixed before hand-off.
6. **Interaction cost and wayfinding (`UX-9`, `UX-10`)** — per main journey record steps · clicks · view changes · fields · decisions against the existing flow or spec, and cut what does not advance the job (every click confident — no "3-click rule"). Every view answers where am I / where can I go / how do I get back, with no dead ends. The primary tier sits in the first viewport (catalog §12).
7. **Check every UI/UX gate (`UX-11`)** — every mode's final walk step also runs items 5–6 and ends with the UI/UX Gate Report (catalog §13) before the report to the user; a gate missing from the report counts as not checked.

**Recreation modes (`describe`, `screenshot`, `video`) — INFER and REPORT:** the Journey Report names the journeys the observed UI serves (tagged `INFERRED` unless a spec or the user sources them); the walk RECORDS every violation it exposes (`UX-3`/`UX-4`/`UX-5`) — `describe` carries it into the implementation plan as a correction, `screenshot`/`video` fix it in the recreation and confirm with the user any fix that changes the visual match.

## Design Principles Contract (all modes)

The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) carried as the `SYNC:ui-ux-design-principles` block below bind EVERY mode of this skill. Project design-system docs OUTRANK them — surface a genuine conflict to the user with both sides, NEVER resolve it silently.

**Generative modes (`fast`, `good`, `explore`) — APPLY the clauses as an output contract on the design you produce:**

1. **States first.** Design and build the empty, loading and error state BEFORE the populated state (`UI-1.5`), and reserve space for anything that loads so nothing shifts in (`UI-9.3`).
2. **All 5 interaction states per interactive element** — default, hover, focus, active, disabled — plus loading where it applies (`UI-5.2`); keep a visible focus ring, restyled if it clashes but NEVER removed (`UI-5.5`).
3. **Declare the scales, never improvise them.** State the type scale as 6 named steps with no one-off sizes (`UI-2.5`), body 16px web / 17px mobile and never below 14px (`UI-2.2`), measure 45–75 characters (`UI-2.3`); and declare ONE spacing unit — 4px or 8px base, every gap a multiple of it (`UI-4.1`). Both declarations belong in the summary you report back at stage 9; an undeclared scale is an incomplete design, not a style choice.
4. **Contrast is measured, not eyeballed** — state the target AND the measured value: 4.5:1 text, 3:1 UI edges (`UI-3.1`); colour NEVER carries meaning alone — pair it with an icon, label or position (`UI-3.3`).
5. **Touch surfaces.** When the design covers a mobile/touch surface, hit targets are ≥44×44pt and 8px apart (`UI-8.1`) and primary actions sit in the bottom third where the thumb lives (`UI-8.2`). When it does not, state that explicitly so the §8 skip is auditable.

**Reporting modes (`describe`, and the analysis pass of `screenshot` / `video`) — REPORT against the clauses:** the super-detailed description MUST name which clauses the OBSERVED design SATISFIES and which it VIOLATES, cited by ID — e.g. type-scale drift (`UI-2.5`), contrast failure with the measured ratio (`UI-3.1`), undersized touch targets (`UI-8.1`), missing empty/loading/error states (`UI-1.5`), a removed focus ring (`UI-5.5`). A violation is RECORDED, never silently reproduced: `describe` carries it into the implementation plan as a correction; `screenshot` / `video` then apply the five generative obligations above so the recreation FIXES the violation rather than inheriting it — flag any correction that changes the visual match and confirm it with the user before shipping it.

## Mode Branches

### `--mode=fast` (default) — quick design

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above; present the report and confirm an inferred primary actor/job/outcome before continuing (no question tool → record it `INFERRED — unconfirmed` and continue).
2. Run the shared design-intelligence searches above.
3. Use `ui-ux-designer` subagent to start the design process — brief it with the Journey Report and the `Design authority read:` paths; low-fi structure walked against the journeys first (`UX-7`).
4. If the user doesn't specify, create the design in pure HTML/CSS/JS.
5. **Walk the main journeys (`UX-8`)** on the built design with the traceability matrix; fix every unserved step and orphan element.
6. Report back with a brief summary of the changes, the walkthrough result and the UI/UX Gate Report (`UX-11`); ask the user to review and approve.
7. On approval, update `./docs/design-guidelines.md` if needed.

### `--mode=good` — immersive, high-quality design

Same spine as `fast`, raised to a higher quality bar (iterate on details):

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above at full depth for the scope (catalog §10); present the report and confirm an inferred primary actor/job/outcome before continuing (no question tool → record it `INFERRED — unconfirmed` and continue).
2. Run comprehensive design-intelligence searches across the applicable domains.
3. Use `researcher` subagent to research design style, trends, fonts, colors, borders, spacing, elements' positions, etc.
4. Use `ui-ux-designer` subagent to implement the design step by step based on the Journey Report, the design authority and the research — low-fi structure walked against the journeys first (`UX-7`).
5. If the user doesn't specify, create the design in pure HTML/CSS/JS.
6. **Walk the main journeys (`UX-8`)** on the built design with the traceability matrix; fix every unserved step and orphan element.
7. Report back with a summary, the walkthrough result and the UI/UX Gate Report (`UX-11`); ask the user to review and approve.
8. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

### `--mode=explore` — 1–3 drafts, user picks, then `good`

Opt-in. Use when the visual direction is genuinely open and the user wants to choose it by looking. **Read `references/explore/workflow.md` first and follow its steps (Step 0 draft count, then 1–10), one task each.** First action: its Step 0 asks 3 / 2 / 1 drafts or skip (no question tool → ONE auto-selected draft).

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above, produced ONCE before any seed and shared by all N drafts; confirm an inferred primary actor/job/outcome first (no question tool → record it `INFERRED — unconfirmed` and continue). The design-authority read also resolves **authority per axis** (colour · type · layout). A direction stated in the brief, or a project design system pinning all three axes → record it as `ADOPTED`, log the exemption, and run `--mode=good` instead. Partial pins → the drafts share the pinned axes and diverge only on the free ones.
2. **Ground before diverging** — fact-check named products/specs, ask once for reference designs the user likes or dislikes, run `references/explore/brand-asset-protocol.md` when a real brand is named, gather ONE shared content-imagery set (licensed, sources recorded) or labelled placeholders, answer the five form questions, fix the deliverable type and pixel canvas, write the `DD-3` Design Plan skeleton.
3. **N seeds (take the first N)** — a random style row from `node .claude/skills/design/scripts/pick-style.cjs` (after changing the picker, run its tests: `node .claude/skills/design/tests/pick-style.test.cjs`), the user's liked reference or a web-verified real-world reference, a studio persona described by traits only. Seeds are divergence seeds, never taste: each draft translates its seed into THIS subject (`DD-1`) and passes the `DD-3` generic test, or it is revised.
4. **Fan out** — N `ui-ux-designer` sub-agents in ONE message → `tmp/design/<run>/direction-{a,b,c}.html`; layout FREE → structurally different layout skeletons, layout ADOPTED → the pinned layout is shared and drafts diverge on the free axes only. Every draft serves the SAME main journeys and information-priority tiers (`UX-3`/`UX-4`) — drafts diverge on visual axes and layout skeleton, never on the journeys or the priority tier of content. No sub-agents → build serially; each later draft names what it avoided from the earlier ones.
5. **Render after all return** — per draft, `node .claude/skills/html-export/scripts/export.cjs --to=png --viewport=<canvas> --out=tmp/design/<run>/renders/<draft>/ <file>`; handle exits 0/4/3/1-2 per workflow step 8, re-render after the `DD-8` edit. NEVER run install commands.
6. **Present side by side, open every draft in the default browser, and ASK** — each draft with how it serves the primary journey; open each with `node .claude/scripts/open-report.cjs tmp/design/<run>/direction-<x>.html`, then, with 2–3 drafts, ask the user directly with one option per draft and your evidence-backed `(Recommended)` draft first (explore step 9); one draft → no question (`Selection: USER — 1 option`, or `AUTO-SELECTED — no question tool (1 draft)` set at Step 0); drafts cannot be shown or the question tool errors → AUTO-SELECT the recommended draft; record why either way (explore step 9 fallback). Never pick for the user while they can be asked; never offer a text-only style choice; "continue" is not a pick.
7. **Record** the user's verbatim choice, or the `Selection:` line, in `tmp/design/<run>/direction-approved.md` (template: `references/explore/gate-files.md`).
8. **Walk the main journeys (`UX-8`)** on the chosen draft with the traceability matrix, record the gaps as inputs, then continue as `--mode=good` from the chosen draft.

### `--mode=describe` — describe only (NO implementation)

Treat `$ARGUMENTS` as the screenshot/video to describe.

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above: infer and report the journeys the observed UI serves (tagged `INFERRED` unless sourced), and read the project design authority the implementation must adopt.
2. Use `visual analysis tooling` to describe super-details of the screenshot/video so a developer can implement it easily.
    - Be specific about design style, every element, elements' positions, every interaction, every animation, every transition, every color, every border, every icon, every font style/size/weight, every spacing/padding/margin, every size/shape/texture/material/light/shadow/reflection/refraction/blur/glow/image, background transparency, etc.
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
3. Use `ui-ux-designer` subagent to create a design implementation **plan** following the progressive-disclosure structure so the result matches the screenshot/video:
    - Create a directory using the naming pattern from the `## Naming` section.
    - Save the overview access point at `plan.md`, keep it generic, under 80 lines, listing each phase with status/progress and links.
    - For each phase, add `phase-XX-phase-name.md` with sections (Context links, Overview with date/priority/statuses, Key Insights, Requirements, Architecture, Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps).
4. **Walk the main journeys (`UX-8`)** on the observed UI with the traceability matrix; record every violation the walk exposes and carry it into the plan as a correction.
5. Report back with a summary of the plan, the Journey Report, the walkthrough findings and the UI/UX Gate Report (`UX-11`, recording the violations observed). **Do NOT implement.**

### `--mode=screenshot` — recreate from image as code

Treat `$ARGUMENTS` as the screenshot to recreate exactly.

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above: infer and report the journeys the observed UI serves (tagged `INFERRED` unless sourced), and read the project design authority the recreation must adopt.
2. Use `visual analysis tooling` to describe super-details of the screenshot (design style, trends, fonts, colors, border, spacing, elements' positions, size, shape, texture, material, light, shadow, reflection, refraction, blur, glow, image, background transparency, transition, etc.).
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
3. Use `ui-ux-designer` subagent to create a design plan following the progressive-disclosure structure (as in `describe`) so the final result matches the screenshot. Keep every research markdown report concise (≤150 lines).
4. Implement the plan step by step.
5. If the user doesn't specify, create the design in pure HTML/CSS/JS.
6. **Walk the main journeys (`UX-8`)** on the recreation with the traceability matrix; fix every violation the walk exposes and confirm with the user any fix that changes the visual match.
7. Report back with a summary, the walkthrough result and the UI/UX Gate Report (`UX-11`); ask the user to review and approve.
8. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

### `--mode=video` — recreate from video as code

Treat `$ARGUMENTS` as the video to recreate exactly. Same as `--mode=screenshot`, but ingest a VIDEO and capture BOTH static layout AND interaction/animation/transition patterns.

1. **Journey Report (`UX-1`) + design authority (`UX-2`)** — Steps 0 and 0b above: infer and report the journeys the observed flow serves (the video's interaction sequence is direct evidence; tag `INFERRED` unless sourced), and read the project design authority the recreation must adopt.
2. Use `visual analysis tooling` to describe super-details of the video: every element, every interaction, every animation, every transition, every color, every font, every border, every spacing, every size/shape/texture/material/light/shadow/reflection/refraction/blur/glow/image, background transparency, etc.
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
3. Use `ui-ux-designer` subagent to create a design plan following the progressive-disclosure structure so the final result matches the video. Keep every research markdown report concise (≤150 lines).
4. Implement the plan step by step.
5. If the user doesn't specify, create the design in pure HTML/CSS/JS.
6. **Walk the main journeys (`UX-8`)** on the recreation with the traceability matrix; fix every violation the walk exposes and confirm with the user any fix that changes the visual match.
7. Report back with a summary, the walkthrough result and the UI/UX Gate Report (`UX-11`); ask the user to review and approve.
8. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

## Notes (all modes)

- **Design system (canonical):** When implementing UI — HTML, CSS, or SCSS — read `docs/project-config.json` first, then resolve `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`. Read every configured authority before choosing tokens, component patterns, breakpoints, or BEM conventions. If the project has no configured authority, record `N/A` and follow the selected lane plus the shared UI/DD/CL contracts; never invent a canonical path or token vocabulary.
- Remember you have the capability to generate images, videos, edit images, etc. with `visual analysis tooling` skills. Use them to create the design and real assets.
- Always review, analyze, and double-check generated assets with `visual analysis tooling` skills to verify quality.
- Use media processing tooling (RMBG) to remove background from generated assets if needed (`good`/`screenshot`/`video`).
- Maintain and update `./docs/design-guidelines.md` docs if needed.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

Think hard to plan & start working on these tasks follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules. Parse `--mode` from the input (default `fast`) and route to the matching branch above:
<tasks>$ARGUMENTS</tasks>

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Create (or describe) a UI design using design-intelligence databases and subagents, dispatched by `--mode` (input carrier) × `--lane` (design lane).

**IMPORTANT MUST ATTENTION** route `--mode={fast|good|explore|describe|screenshot|video}` × `--lane={product|marketing}` → Journey Report (`UX-1`) → design authority/existing UI (`UX-2`) → query local design intelligence → ingest visual evidence when applicable → low-fi walked against journeys (`UX-7`) → design → implement unless `describe` → walk journeys + traceability (`UX-8`) → report and seek approval; project authority outranks candidates, `$ui-review` owns source review evidence.

**IMPORTANT MUST ATTENTION** journey-first order is BLOCKING in EVERY mode: (1) present the Journey Report (`UX-1`) and confirm an inferred primary actor/job/outcome (no question tool → record it `INFERRED — unconfirmed` and continue) → (2) read and record the project's design principles, design system and existing UI, or `N/A` with the paths checked (`UX-2`) → (3) only then search, sketch, design or build; walk every main journey (`UX-8`), measure interaction cost and wayfinding (`UX-9`, `UX-10`) and close with the UI/UX Gate Report covering `UX-*`/`UI-*`/`DD-*`/`CL-*`/copy (`UX-11`) before reporting — why: a screen designed before its journey is known answers the brief's layout, not the user's job.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present a guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** apply the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) to every design: empty/loading/error states designed FIRST (`UI-1.5`), all 5 interaction states per interactive element (`UI-5.2`), type scale (6 named steps, `UI-2.5`) and spacing unit (4/8px base, `UI-4.1`) DECLARED not improvised, contrast measured and stated (4.5:1 text / 3:1 edges, `UI-3.1`), ≥44×44pt touch targets + bottom-third primaries on mobile surfaces (`UI-8.1`, `UI-8.2`); `fast`/`good`/`explore` APPLY them, `describe`/`screenshot`/`video` also REPORT by clause ID which the observed design satisfies or violates — project design-system docs outrank the clauses, conflicts go to the user

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
