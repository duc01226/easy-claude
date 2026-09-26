---
name: workflow-spec-to-mockup
version: 1.0.0
description: "[Workflow] Use when turning canonical specs into a reviewed interactive HTML mock-up: journey report and design authority first, one to three design directions (the user chooses how many, or skips) to pick from, then the full multi-view mock app."
disable-model-invocation: false
---

## Quick Summary

**Goal:** turn one or more canonical feature specs into ONE reviewed, journey-validated, interactive multi-view HTML mock app per spec — built in a visual direction the USER picked from the 1–3 rendered drafts they asked for (auto-selected and recorded only when the user cannot be asked; or no mockup when they skip) — and STOP there. **MUST ATTENTION** no PBI, story, plan or production code is produced here.

**Use it when** a PO/BA/designer has a UI-bearing canonical spec and wants to see and click through how the feature works before a backlog or build exists. **Use a sibling instead when:** there is only a raw idea → `workflow-idea-to-spec` (or `workflow-idea-to-pbi` for the backlog with mockups); the spec needs a PBI backlog → `workflow-spec-to-pbi`; the spec needs building → `workflow-implement-spec`; the spec has no UI surface → no mockup applies.

**IMPORTANT MANDATORY Steps:** /design-spec -> /artifact-review --type=design -> /pbi-mockup --explore -> /html-export --to=png -> /ui-review -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps (`artifact-review --type=design`, `ui-review`, `workflow-end`) always run (on the §0 `Mockup: SKIPPED by user` path the `ui-review` gate still runs and records `N/A — no mockup to review`), the `optional` step runs only when its `applicability.when` holds, a step that runs invokes its `Skill` tool, and every other deviation is logged to the run's deviation log. The list above is the recommended default order from `.claude/workflows.json`.

## 0. Mockup Scope Gate (FIRST action of the run)

Before `/design-spec` or any other step, apply `pbi-mockup` Step 0 for the whole run and record the answer in the run report. With `AskUserQuestion` available, ALWAYS ask: `3 options` · `2 options` · `1 option` · `Skip mockup`, with a recommended option by scope. `Skip mockup` → run only `/design-spec` and `/artifact-review --type=design`, record `Mockup: SKIPPED by user`, then close with `/workflow-end` and `/watzup`. On this path `/pbi-mockup`, `/html-export`, `/ui-review` and `/docs-update` are N/A (no mockup exists) — log each as a deviation with that reason — and the §3 gates Direction selected, Releasable multi-view mock app, Render evidence, Journeys walked and Spec linked (`mockup:`) record `N/A — Mockup: SKIPPED by user`. No question tool → ONE auto-selected draft. `/pbi-mockup --explore` reuses the recorded answer and never asks again. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Why first: the question exists to save tokens and time, so it runs before anything is spent.

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
| **Design spec review converged** (`review-converged`) | `/artifact-review --type=design` PASS or WARN, including its UI/UX principles pass, the M1–M7 gate and the `design_spec:` link-back; validated findings fixed and re-reviewed.                                                                                                                                                            |
| **Direction selected**                                | N rendered drafts (the §0 count) of the primary journey's key views under `tmp/design/<run>/`, sharing journeys, views and priority tiers, and in `tmp/design/<run>/direction-approved.md` one of: the user's verbatim pick (`Selection: USER`) · `Selection: USER — 1 option` · `Selection: AUTO-SELECTED — <reason>` (no question tool, drafts unshowable, or the question tool errored) · the recorded exemption when the brief or design system pins every axis; or `Mockup: SKIPPED by user` in the run report. Never pick while the user can be asked; "continue", "looks good" or silence is NOT a pick. |
| **Releasable multi-view mock app**                    | One self-contained mockup per spec with every required view, navigation edge, component and state (empty, loading and error first) and a connected full-flow demo of each main journey (`.claude/skills/shared/releasable-pbi-contract.md`); one static or disconnected screen fails.                                                     |
| **Render evidence**                                   | `/html-export --to=png` over the final mockup's journey views: exit 0 = per-view render evidence only · exit 4 = fix the mockup and re-render · exit 3 = `NOT VERIFIABLE` plus a setup pointer, never an install · exit 1/2 or any other code = tool failure, `NOT VERIFIABLE`. Only files the run's `report.json` `files[]` names count. |
| **Journeys walked** (`UX-8`)                          | `/ui-review` walkthrough log and traceability matrix with no unserved step and no orphan element, plus the `UI-*` / `DD-*` / `CL-*` findings validated, fixed in the mockup and re-reviewed; the UI/UX Gate Report has no unresolved `FAIL`.                                                                                                                                              |
| **Spec linked**                                       | The spec's companion-artifact frontmatter (`design_spec:` / `mockup:` in the portable fallback) points at the design spec and the final mockup — frontmatter only, spec body untouched.                                                                                                                                                   |
| **Run closed** (`run-closed`)                         | `/workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                         |

## 4. Recommended Skills

| Skill                            | Earns its cost when                                                                                                                                                                                                                                                                                      | Proves / feeds                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/design-spec`                   | always — the tech-agnostic UI spec seeded from the spec's UI intent layer; its Journey Report and design-authority read are the journey-first evidence every later step reuses                                                                                                                           | `UX-1`, `UX-2`, `design_spec:` link       |
| `/artifact-review --type=design` | always (gate) — before any visual direction is drawn, so drafts inherit reviewed journeys and priority                                                                                                                                                                                                   | review-converged gate                     |
| `/pbi-mockup --explore`          | unless §0 recorded `Mockup: SKIPPED by user`; pass `--source=<spec path>` and the design-spec path as context. It reuses the §0 answer (never asks again), fans out that many `ui-ux-designer` direction drafts, renders them, opens each in the default browser (`node .claude/scripts/open-report.cjs <draft>`) and, with 2–3 drafts, asks with `AskUserQuestion` — one option per draft, your evidence-backed recommendation first labelled `(Recommended)`. Drafts cannot be shown or the question tool errors → AUTO-SELECT the recommended draft and record `Selection: AUTO-SELECTED — <reason>`. Then it builds the full mock app in the chosen direction. | direction pick + mock app                 |
| `/html-export --to=png`          | always — per-view render check of the final mockup, the visual evidence `ui-review` inspects; add `--slides='[data-state]'` to capture every screen state                                                                                                                                                | render evidence                           |
| `/ui-review`                     | always (gate) — scope = the final mockup file                                                                                                                                                                                                                                                            | `UX-8` walkthrough + `UI-*`/`DD-*`/`CL-*` |
| `/docs-update`                   | the governing spec's artifact profile has a companion-artifact link (the `mockup:` frontmatter key or its native equivalent) that does not yet point at the final mockup. Skip reason, verbatim: "The artifact profile declares no companion-artifact link, or the spec already links the final mockup." | spec linked gate                          |
| `/workflow-end` → `/watzup`      | always, last                                                                                                                                                                                                                                                                                             | run-closed gate + handoff                 |

## 5. Orchestration Freedom

You choose inline vs sub-agent, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the design spec is reviewed before any direction draft; the user's pick is recorded before the full mock app is built; the render runs before `ui-review` inspects it; fixes are re-reviewed after they land; `/workflow-end` runs last. The explore pick and every user confirmation are gates awaiting the user — never parallelized, never auto-answered while the user can be asked, never delegated to a sub-agent; only the recorded `pbi-mockup` paths (no question tool, drafts unshowable, question tool error) auto-select. The N direction drafts are the one fan-out: spawn all N in ONE message and wait for all to return (`pbi-mockup --explore`). Every sub-agent brief carries the spec path, the Journey Report, the design-authority paths and the Design Plan skeleton verbatim — a sub-agent inherits nothing from this conversation.

## 6. Memory, Reporting and Fix Path

- One task per step (per spec when several) so nothing is lost after compaction; write the run report `tmp/reports/workflow-spec-to-mockup-{YYMMDD}-{HHmm}-{slug}.md` FIRST and append per step; after compaction re-read it, `TaskList` and `tmp/design/<run>/direction-approved.md` before continuing.
- **Artifact placement:** drafts, renders, product facts and run notes are disposable run output under `tmp/design/<run>/` (`<run>` = `YYMMDD-HHmm-<slug>`); the design spec lives under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides); the final mockup lives at the `pbi-mockup` spec-source output path, `design-specs/` under the same team-artifacts root — never inside the business spec root, which holds canonical specs only.
- **Fix path:** findings are validated before fixing; fix journey, priority or rule findings in the design spec (and re-run `artifact-review --type=design`), visual or interaction findings in the mockup (and re-render, then re-run `ui-review`), and spec-intent gaps in the spec through `spec [mode=update]`. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); escalate via `AskUserQuestion` on no progress.
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
- **MUST ATTENTION** mockup scope gate FIRST — the run's first action (§0), before any analysis or drafting, so a skip saves tokens and time: with `AskUserQuestion` available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)`. Then the explore pick is the USER's decision: the N rendered drafts share journeys, views and priority tiers, diverging only on free visual axes; open each in the default browser and, with 2–3 drafts, ask with `AskUserQuestion` (recommended draft first, with evidence), never pick for the user while they can be asked (drafts unshowable or the tool errors → AUTO-SELECT with reason), record the verbatim reply or the `Selection:` line in `tmp/design/<run>/direction-approved.md` — why: "continue" or silence is not a design choice.
- **MUST ATTENTION** the mockup is a releasable multi-view mock app — every view, navigation edge, component and state plus a connected full-flow demo per main journey; one static screen fails.
- **MUST ATTENTION** gates always run: `artifact-review --type=design`, `ui-review`, `workflow-end`; render evidence counts only as html-export scopes it, and exit 3 is `NOT VERIFIABLE`, never an install.
- **NEVER** produce PBIs, stories, plans or production code here; keep drafts and renders under `tmp/design/<run>/` and edit only the spec's companion-artifact frontmatter.
