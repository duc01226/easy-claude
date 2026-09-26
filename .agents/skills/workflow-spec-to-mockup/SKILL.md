---
name: workflow-spec-to-mockup
description: '[Workflow] Use when turning canonical specs into a reviewed interactive HTML mock-up: journey report and design authority first, one to three design directions (the user chooses how many, or skips) to pick from, then the full multi-view mock app.'
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

**Goal:** turn one or more canonical feature specs into ONE reviewed, journey-validated, interactive multi-view HTML mock app per spec — built in a visual direction the USER picked from the 1–3 rendered drafts they asked for (auto-selected and recorded only when the user cannot be asked; or no mockup when they skip) — and STOP there. **MUST ATTENTION** no PBI, story, plan or production code is produced here.

**Use it when** a PO/BA/designer has a UI-bearing canonical spec and wants to see and click through how the feature works before a backlog or build exists. **Use a sibling instead when:** there is only a raw idea → `workflow-idea-to-spec` (or `workflow-idea-to-pbi` for the backlog with mockups); the spec needs a PBI backlog → `workflow-spec-to-pbi`; the spec needs building → `workflow-implement-spec`; the spec has no UI surface → no mockup applies.

**IMPORTANT MANDATORY Steps:** $design-spec -> $artifact-review --type=design -> $pbi-mockup --explore -> $html-export --to=png -> $ui-review -> $docs-update -> $workflow-end -> $watzup

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps (`artifact-review --type=design`, `ui-review`, `workflow-end`) always run (on the §0 `Mockup: SKIPPED by user` path the `ui-review` gate still runs and records `N/A — no mockup to review`), the `optional` step runs only when its `applicability.when` holds, a step that runs invokes its skill invocation, and every other deviation is logged to the run's deviation log. The list above is the recommended default order from `.claude/workflows.json`.

## 0. Mockup Scope Gate (FIRST action of the run)

Before `$design-spec` or any other step, apply `pbi-mockup` Step 0 for the whole run and record the answer in the run report. With ask the user directly available, ALWAYS ask: `3 options` · `2 options` · `1 option` · `Skip mockup`, with a recommended option by scope. `Skip mockup` → run only `$design-spec` and `$artifact-review --type=design`, record `Mockup: SKIPPED by user`, then close with `$workflow-end` and `$watzup`. On this path `$pbi-mockup`, `$html-export`, `$ui-review` and `$docs-update` are N/A (no mockup exists) — log each as a deviation with that reason — and the §3 gates Direction selected, Releasable multi-view mock app, Render evidence, Journeys walked and Spec linked (`mockup:`) record `N/A — Mockup: SKIPPED by user`. No question tool → ONE auto-selected draft. `$pbi-mockup --explore` reuses the recorded answer and never asks again. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Why first: the question exists to save tokens and time, so it runs before anything is spent.

## 1. Triage (right after the §0 scope gate, before choosing steps)

Record the result as the first section of the run report.

| Check                   | Verdict that changes the route                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source**              | Resolve every spec path the user named, or search the business spec root (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides). No canonical spec → stop and route to `workflow-idea-to-spec`.                                                                                                                                                                                                                    |
| **UI intent layer**     | The spec carries the interaction surface (`SYNC:ui-intent-layer`: view inventory with information priority and container role, navigation map, observable states, per-story action flows) in the role its artifact profile declares. Missing → run `spec [mode=update]` on the spec first, or record the gap and derive it in `design-spec` with every derived item tagged `INFERRED`. Backend-only spec → stop: no mockup applies, state the reason. |
| **Scope**               | One spec → one run. Several specs → one mockup per spec; 3+ specs → one sub-agent per spec for `design-spec`, while the explore pick stays with the user per spec.                                                                                                                                                                                                                                                                                    |
| **Direction authority** | The brief or the project design system pins colour, type and layout → `--explore` records the exemption and builds directly; some axes pinned → the drafts share them and diverge only on the free axes.                                                                                                                                                                                                                                        |
| **Existing companions** | A linked design spec or mockup already exists → update it in place (`design-spec` / `pbi-mockup` against that path) instead of creating a second one.                                                                                                                                                                                                                                                                                                 |

## 2. Journey-First Design Order (BLOCKING — every generation step)

Every design generation in this workflow follows `SYNC:ux-journey-gate` in this order; no wireframe, direction draft, token table or mockup HTML exists before step 1's report.

1. **Report the main user journeys (`UX-1`)** — `design-spec` Step 0a writes the Journey Report from the spec's per-story action flows, business rules and existing UI: frame · actors with job statements · 3–5 ranked main journeys with step tables (intent · decision · information needed · business rule · system response · failure → recovery) · derived requirements · assumptions, each claim `SOURCED (<location>)` or `INFERRED`. An inferred primary actor, job or success outcome is confirmed with the user before generating; with no question tool it is recorded `INFERRED — unconfirmed (no question tool)` as an assumption and the run continues.
2. **Read the design authority (`UX-2`)** — the project's design principles/guidelines, design system (tokens, components, patterns), styling conventions, accepted design ADRs and the existing related UI, resolved from `docs/project-config.json` and its reference docs; record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`. Adopt house patterns; never invent a token or component the project defines.
3. **Only then generate** — structure before styling (`UX-3`–`UX-7`: screens are journey steps, priority computed at the decision point, business rules become prevention and states, user vocabulary, low-fi before hi-fi; plus measured interaction cost per journey and navigation/wayfinding where the gate defines them), then the `DD-3` Design Plan, then `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8` and `CL-1`–`CL-6` (catalogs: `.claude/docs/ux-journey-process.md`, `.claude/docs/design-knowledge.md`, `.claude/docs/design-review-checklist.md`).
4. **Validate by walking (`UX-8`)** — `ui-review` walks every main journey on the final mockup (will the user know the step is needed, see the action, link it to the goal, see progress?) and builds the traceability matrix (journey step → view → element → information tier → rule → states). An unserved step or an orphan element is a defect fixed before hand-off.
5. **Check every UI/UX gate before hand-off** — close the mockup with the UI/UX Gate Report (`UX-11`): one row per `UX-*`, applicable `UI-*`, `DD-*` and `CL-*` gate and the UI copy row, each `PASS` / `FAIL → fixed` / `FAIL — open` / `N/A (reason)` / `NOT VERIFIABLE` with evidence; an open `FAIL` blocks hand-off.

`pbi-mockup` reuses the design spec's Journey Report and design-authority record as its Step 2a/3 evidence and re-confirms only what changed; it never re-derives journeys that disagree with the reviewed design spec without surfacing the conflict to the user.

## 3. Required Quality Gates (non-negotiable)

| Gate                                                  | Evidence that proves it                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Journey Report first** (`UX-1`)                     | The design spec's §0a Journey Report precedes every other design output; inferred critical claims confirmed with the user, or recorded `INFERRED — unconfirmed (no question tool)`.                                                                                                                                                                                                                |
| **Design authority read** (`UX-2`)                    | `Design authority read: …` or `N/A` recorded in the design spec header before any section.                                                                                                                                                                                                                                                |
| **Design spec review converged** (`review-converged`) | `$artifact-review --type=design` PASS or WARN, including its UI/UX principles pass, the M1–M7 gate and the `design_spec:` link-back; validated findings fixed and re-reviewed.                                                                                                                                                            |
| **Direction selected**                                | N rendered drafts (the §0 count) of the primary journey's key views under `tmp/design/<run>/`, sharing journeys, views and priority tiers, and in `tmp/design/<run>/direction-approved.md` one of: the user's verbatim pick (`Selection: USER`) · `Selection: USER — 1 option` · `Selection: AUTO-SELECTED — <reason>` (no question tool, drafts unshowable, or the question tool errored) · the recorded exemption when the brief or design system pins every axis; or `Mockup: SKIPPED by user` in the run report. Never pick while the user can be asked; "continue", "looks good" or silence is NOT a pick. |
| **Releasable multi-view mock app**                    | One self-contained mockup per spec with every required view, navigation edge, component and state (empty, loading and error first) and a connected full-flow demo of each main journey (`.claude/skills/shared/releasable-pbi-contract.md`); one static or disconnected screen fails.                                                     |
| **Render evidence**                                   | `$html-export --to=png` over the final mockup's journey views: exit 0 = per-view render evidence only · exit 4 = fix the mockup and re-render · exit 3 = `NOT VERIFIABLE` plus a setup pointer, never an install · exit 1/2 or any other code = tool failure, `NOT VERIFIABLE`. Only files the run's `report.json` `files[]` names count. |
| **Journeys walked** (`UX-8`)                          | `$ui-review` walkthrough log and traceability matrix with no unserved step and no orphan element, plus the `UI-*` / `DD-*` / `CL-*` findings validated, fixed in the mockup and re-reviewed; the UI/UX Gate Report has no unresolved `FAIL`.                                                                                                                                              |
| **Spec linked**                                       | The spec's companion-artifact frontmatter (`design_spec:` / `mockup:` in the portable fallback) points at the design spec and the final mockup — frontmatter only, spec body untouched.                                                                                                                                                   |
| **Run closed** (`run-closed`)                         | `$workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                         |

## 4. Recommended Skills

| Skill                            | Earns its cost when                                                                                                                                                                                                                                                                                      | Proves / feeds                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `$design-spec`                   | always — the tech-agnostic UI spec seeded from the spec's UI intent layer; its Journey Report and design-authority read are the journey-first evidence every later step reuses                                                                                                                           | `UX-1`, `UX-2`, `design_spec:` link       |
| `$artifact-review --type=design` | always (gate) — before any visual direction is drawn, so drafts inherit reviewed journeys and priority                                                                                                                                                                                                   | review-converged gate                     |
| `$pbi-mockup --explore`          | unless §0 recorded `Mockup: SKIPPED by user`; pass `--source=<spec path>` and the design-spec path as context. It reuses the §0 answer (never asks again), fans out that many `ui-ux-designer` direction drafts, renders them, opens each in the default browser (`node .claude/scripts/open-report.cjs <draft>`) and, with 2–3 drafts, asks with ask the user directly — one option per draft, your evidence-backed recommendation first labelled `(Recommended)`. Drafts cannot be shown or the question tool errors → AUTO-SELECT the recommended draft and record `Selection: AUTO-SELECTED — <reason>`. Then it builds the full mock app in the chosen direction. | direction pick + mock app                 |
| `$html-export --to=png`          | always — per-view render check of the final mockup, the visual evidence `ui-review` inspects; add `--slides='[data-state]'` to capture every screen state                                                                                                                                                | render evidence                           |
| `$ui-review`                     | always (gate) — scope = the final mockup file                                                                                                                                                                                                                                                            | `UX-8` walkthrough + `UI-*`/`DD-*`/`CL-*` |
| `$docs-update`                   | the governing spec's artifact profile has a companion-artifact link (the `mockup:` frontmatter key or its native equivalent) that does not yet point at the final mockup. Skip reason, verbatim: "The artifact profile declares no companion-artifact link, or the spec already links the final mockup." | spec linked gate                          |
| `$workflow-end` → `$watzup`      | always, last                                                                                                                                                                                                                                                                                             | run-closed gate + handoff                 |

## 5. Orchestration Freedom

You choose inline vs sub-agent, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the design spec is reviewed before any direction draft; the user's pick is recorded before the full mock app is built; the render runs before `ui-review` inspects it; fixes are re-reviewed after they land; `$workflow-end` runs last. The explore pick and every user confirmation are gates awaiting the user — never parallelized, never auto-answered while the user can be asked, never delegated to a sub-agent; only the recorded `pbi-mockup` paths (no question tool, drafts unshowable, question tool error) auto-select. The N direction drafts are the one fan-out: spawn all N in ONE message and wait for all to return (`pbi-mockup --explore`). Every sub-agent brief carries the spec path, the Journey Report, the design-authority paths and the Design Plan skeleton verbatim — a sub-agent inherits nothing from this conversation.

## 6. Memory, Reporting and Fix Path

- One task per step (per spec when several) so nothing is lost after compaction; write the run report `tmp/reports/workflow-spec-to-mockup-{YYMMDD}-{HHmm}-{slug}.md` FIRST and append per step; after compaction re-read it, the current task list and `tmp/design/<run>/direction-approved.md` before continuing.
- **Artifact placement:** drafts, renders, product facts and run notes are disposable run output under `tmp/design/<run>/` (`<run>` = `YYMMDD-HHmm-<slug>`); the design spec lives under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides); the final mockup lives at the `pbi-mockup` spec-source output path, `design-specs/` under the same team-artifacts root — never inside the business spec root, which holds canonical specs only.
- **Fix path:** findings are validated before fixing; fix journey, priority or rule findings in the design spec (and re-run `artifact-review --type=design`), visual or interaction findings in the mockup (and re-render, then re-run `ui-review`), and spec-intent gaps in the spec through `spec [mode=update]`. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); escalate by asking the user directly on no progress.
- **Handoff at close:** spec path(s), design-spec path(s), the final mockup path(s), the picked direction and its `Selection:` line quoted from `direction-approved.md` (or `Mockup: SKIPPED by user`), the walkthrough verdict per main journey, render evidence or `NOT VERIFIABLE`, open questions below 80% confidence, and the next route — `workflow-spec-to-pbi` for a backlog or `workflow-implement-spec` to build.
<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one reviewed, journey-validated, interactive multi-view mock app per UI-bearing canonical spec, built in a direction the user picked from the 1–3 rendered drafts they asked for (or AUTO-SELECTED with a recorded reason when they cannot be asked; none when they skip) — then STOP; chain `workflow-spec-to-pbi` for a backlog or `workflow-implement-spec` to build.

- **MUST ATTENTION** journey-first on EVERY generation: (1) report the main user journeys (`UX-1`) → (2) read the design principles, design system and existing UI (`UX-2`) → (3) only then generate; validate by walking every main journey with a traceability matrix (`UX-8`) — why: a screen designed before its journeys asks the user for the wrong thing at the wrong step.
- **MUST ATTENTION** mockup scope gate FIRST — the run's first action (§0), before any analysis or drafting, so a skip saves tokens and time: with ask the user directly available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)`. Then the explore pick is the USER's decision: the N rendered drafts share journeys, views and priority tiers, diverging only on free visual axes; open each in the default browser and, with 2–3 drafts, ask with ask the user directly (recommended draft first, with evidence), never pick for the user while they can be asked (drafts unshowable or the tool errors → AUTO-SELECT with reason), record the verbatim reply or the `Selection:` line in `tmp/design/<run>/direction-approved.md` — why: "continue" or silence is not a design choice.
- **MUST ATTENTION** the mockup is a releasable multi-view mock app — every view, navigation edge, component and state plus a connected full-flow demo per main journey; one static screen fails.
- **MUST ATTENTION** gates always run: `artifact-review --type=design`, `ui-review`, `workflow-end`; render evidence counts only as html-export scopes it, and exit 3 is `NOT VERIFIABLE`, never an install.
- **NEVER** produce PBIs, stories, plans or production code here; keep drafts and renders under `tmp/design/<run>/` and edit only the spec's companion-artifact frontmatter.

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
