---
name: workflow-idea-to-pbi
version: 3.0.0
description: "[Workflow] Use when turning an idea or product vision into prioritized PBIs and stories (single-PBI deep mode or multi-opportunity discovery)."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Turn a product idea into a reviewed, Definition-of-Ready, prioritized PBI backlog — no implementation — with depth proportional to the idea's size, ambiguity and risk.

**Purpose:** For PO/BA work. One concrete idea, ticket or brief becomes one deeply groomed PBI (**Single-PBI track**: idea → draft Feature Spec → test specs → PBI → stories). A raw vision spanning several opportunities becomes a ranked multi-PBI backlog (**Multi-Opportunity track**, the brainstorm-driven MULTI-OPPORTUNITY DISCOVERY MODE). Use `workflow-idea-to-spec` for a spec without a backlog, `workflow-spec-to-pbi` when canonical specs already exist, `workflow-feature` / `workflow-big-feature` to build a DoR-ready PBI, `workflow-bugfix` for defects.

- **Triage first** (track · size · kinds · risk · `isLargeIdea`); it selects which recommended skills run and how deep. A small, clear idea never runs the research → brainstorm → plan → cross-PBI prioritize → deck chain.
- **Gates never flex:** releasable outcome, rationale review, spec clarity, artifact review, independent challenge, DoR, UI full-flow evidence, priority, docs sync, close.
- Every generated artifact is a draft until its review or acceptance gate approves it.
- **[BLOCKING] Tech-agnostic output:** idea / PBI / story prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — framework, product, language and pattern names appear only in evidence fields, frontmatter and Mermaid.
- Apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root) and `.claude/skills/shared/releasable-pbi-contract.md`; local conventions come from `docs/project-config.json` and the docs index.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Track** — one concrete idea/ticket/brief → **Single-PBI**; a vision/problem spanning several independent opportunities → **Multi-Opportunity**. Ambiguous → ask via `AskUserQuestion` before any step.
2. **Size** (guidance, not a law) — **XS/S**: one actor, one journey, evident acceptance criteria, no new domain entity, no open decision · **M**: one PBI with domain, UI or cross-module reach, or unresolved decisions · **L/XL**: several PBIs, multi-capability or release-scope.
3. **Kinds** — existing PO artifact supplied · new or reshaped UI surface · domain entity change · market uncertainty · security/PII/money · cross-module.
4. **Large idea** — `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit`. True → the owning PBI/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and downstream stories, mockups and the deck inherit it read-only; all-false → omit the block. A genuinely isolated change records `Decomposition Applicability: EXEMPT` with reason and accepting owner. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) — only an explicit roadmap request routes to the standalone `product-roadmap` skill; a supplied roadmap is read-only context.
5. **Risk & ambiguity** escalate depth (plan cycle, scenario, research), not idea length.

| Triage result                      | Typical route (recommended skills below decide the rest)                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-PBI, XS/S, clear            | idea → refine → why-review → draft spec → test specs → spec-tests review → spec-clarify → PBI review → story → story review → pbi-challenge → dor-gate → UI mockup/design-spec if UI → docs-update → close |
| Single-PBI, M+ / risky / ambiguous | adds domain-analysis + domain why-review, scenario, plan → plan-review → plan-validate, prioritize against the backlog, presentation deck                                                                  |
| Multi-Opportunity                  | optional research → brainstorm → opportunity-map why-review → domain-analysis once → per-opportunity loop → cross-PBI prioritize → docs-update → deck → close                                              |

## Required Quality Gates (non-negotiable)

| Gate                      | Evidence                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | track, size, kinds, risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                       |
| Releasable outcome        | every PBI names one independently releasable actor-facing outcome with a complete entry-to-result journey; technical/foundation/setup work is attached enabling work, never a standalone PBI; `BLOCKED` never advances by assumption                                                    |
| Rationale reviewed        | `/why-review` after refine (and on the opportunity map in the Multi-Opportunity track) is PASS, or WARN with user acknowledgment; FAIL returns to `/refine`                                                                                                                             |
| Spec clarity (Single-PBI) | draft Feature Spec + TC IDs routed to Feature doc Section 8, reviewed by `/artifact-review --type=spec-tests`; `/spec-clarify` confirms every non-obvious, conflicting or high-impact decision with the user before the PBI is derived — never intent-skipped while a draft spec exists |
| Artifact review converged | `/artifact-review --type=pbi` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                            |
| Independent challenge     | `/pbi-challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                               |
| Definition of Ready       | `/dor-gate` PASS or WARN for every PBI before its mockup is finalized or it is handed off                                                                                                                                                                                               |
| UI evidence               | UI PBIs: journey-first mockup (mockup scope gate: 3/2/1 drafts or skip → Journey Report `UX-1` → design-authority read `UX-2` → the chosen 1–3 rendered direction drafts → the user's recorded pick, or a recorded `Selection:` line when the user cannot be asked → full build → journey walkthrough `UX-8`; or `Mockup: SKIPPED by user`) — a navigable mock app with every required page/view, navigation edge, component, state and full-flow demo, plus `/design-spec`; one isolated screen fails. Backend-only: stated skip reason |
| Priority                  | every PBI carries `priority` (rank + RICE/MoSCoW) in frontmatter; mockup header and deck show the final value                                                                                                                                                                           |
| Docs synced               | `/docs-update` report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`) confirms feature docs, Feature doc Section 8 TC IDs and derived indexes, or records that none were impacted                                                                                                        |
| Run closed                | `/workflow-end`, then `/watzup` handoff: PBIs created, DoR results, blocking items, recommended next workflow                                                                                                                                                                           |

No code changes here: the test-green gate does not apply; TC drafts stay reference-only until the review and DoR gates accept them.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                   | Earns its cost when                                                                                                      | Feeds                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `/web-research` → `/deep-research`                                                                      | market, competitor or best-practice evidence would change the outcome; deep only after web research ran                  | brainstorm/refine evidence    |
| `/brainstorm`                                                                                           | Multi-Opportunity track — 3–8 item RICE opportunity map                                                                  | opportunity selection         |
| `/idea`, `/refine`                                                                                      | always (per opportunity in Multi-Opportunity) — refine owns hypothesis, AC, RICE and the Releasable Outcome Gate         | releasable outcome            |
| `/spec-discovery`                                                                                       | specs or related code already exist for the area                                                                         | no duplicate capability       |
| `/artifact-review` (no type)                                                                            | the PO supplied an existing artifact/ticket/brief                                                                        | input quality                 |
| `/why-review`                                                                                           | after refine (always); after domain-analysis when it ran                                                                 | rationale gate                |
| `/spec [mode=draft]`, `/spec [mode=tests]`, `/artifact-review --type=spec-tests`, `/spec-clarify`       | Single-PBI track                                                                                                         | spec clarity                  |
| `/scenario`                                                                                             | the slice needs adversarial replay, state, ownership, recovery or evidence analysis before planning                      | risk coverage                 |
| `/domain-analysis`                                                                                      | the idea adds or changes domain entities (Multi-Opportunity: once, up front)                                             | domain impact                 |
| `/plan` → `/plan-review` → `/plan-validate`                                                             | Single-PBI track and M+, cross-module, risky or ambiguous                                                                | story slicing, estimates, DoR |
| `/artifact-review --type=pbi`, `/story`, `/artifact-review --type=story`, `/pbi-challenge`, `/dor-gate` | always, per PBI                                                                                                          | review, challenge, DoR        |
| `/pbi-mockup --explore` → `/design-spec`                                                                | the PBI has a user-facing UI surface; journey-first (see UI Mockup below) and gated by `SYNC:existing-ui-research` so both match the current UI system | UI evidence                   |
| `/prioritize`                                                                                           | more than one PBI, or the PBI must be ranked against an existing backlog; otherwise refine's frontmatter priority stands | priority                      |
| `/docs-update`                                                                                          | always, after prioritize                                                                                                 | docs synced                   |
| `/feature-presentation`                                                                                 | several PBIs, M+ scope, or stakeholders asked for a deck                                                                 | stakeholder handoff           |

The standalone why-review is deliberately absent before the spec-tests and story reviews, after the PBI review and after plan-validate: `artifact-review` and every `plan-review` round already run the adversarial rationale pass and `/why-review --validate-findings` on that artifact.

## UI Mockup — Journey-First Explore (UI PBIs)

The `idea-to-pbi-mockup` step runs `/pbi-mockup --explore` after `/dor-gate`, per UI PBI, in this BLOCKING order (`SYNC:ux-journey-gate`; catalog `.claude/docs/ux-journey-process.md`):

0. **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with `AskUserQuestion` available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope); `Skip mockup` → record `Mockup: SKIPPED by user` and continue without a mockup. Without the tool, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report.
1. **Report the main user journeys (`UX-1`)** from the PBI, stories, acceptance criteria, draft spec and business rules — frame · actors with job statements · ranked main journeys with step tables · derived requirements · assumptions, each claim `SOURCED` or `INFERRED`. An inferred primary actor, job or success outcome is confirmed with the user first; with no question tool it is recorded `INFERRED — unconfirmed (no question tool)` and the run continues.
2. **Read the design authority (`UX-2`)** — the project's design principles, design system, styling conventions, accepted design ADRs and the existing related UI; record `Design authority read: <paths>` or `N/A`.
3. **Plan views and demo flows from the journeys**, then **the chosen 1–3 direction drafts** of the primary journey's key views: same journeys, views and information-priority tiers, divergent only on free visual axes (a brief or design system that pins every axis records the exemption instead), rendered with `html-export` under `tmp/design/<run>/`.
4. **Open, recommend, ASK for the user's pick** — open each draft in the default browser (`node .claude/scripts/open-report.cjs <draft>`) and, with 2–3 drafts, ask with `AskUserQuestion` — one option per draft, your evidence-backed recommendation first labelled `(Recommended)`; never pick for the user while they can be asked; "continue" or silence is not a pick; record the verbatim reply in `tmp/design/<run>/direction-approved.md`. One draft → record `Selection: USER — 1 option` (or the Step 0 `AUTO-SELECTED` line). Drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit) and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and the run report.
5. **Build the full multi-view mock app** in the chosen direction, applying `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8` and `CL-1`–`CL-6` after `UX-*`, then **walk every main journey** with a traceability matrix (`UX-8`) and close with the gate's UI/UX Gate Report when the canonical gate defines one; an unserved step, orphan element or unresolved `FAIL` is fixed before hand-off.

`/design-spec` then reuses the mockup's Journey Report and design-authority record. The pick is a user gate: in a sub-agent-per-opportunity run the orchestrator presents each PBI's rendered drafts and records its pick — never inside a sub-agent, never batched across PBIs.

**Spec-hub coupling (UI PBIs):** the mockup and design-spec are deep companions of the governing spec's interaction surface (views, navigation, key states, per-story click-paths); record their paths in the spec's `design_spec:` / `mockup:` frontmatter where the artifact profile supports it and keep visual fidelity out of the spec (`SYNC:ui-intent-layer`).

## Multi-Opportunity Loop

1. `/brainstorm` (Double Diamond) writes the RICE-scored opportunity map to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
2. `AskUserQuestion` with `multiSelect: true`: "Which opportunities should we develop into PBIs?"
3. Opportunity-map why-review: are the top opportunities the right problems, are Reach/Impact founded, pre-mortem, systemic alternatives. FAIL on a high-ranked item → drop it or reframe; WARN → proceed with user acknowledgment.
4. Create every loop task up front — one task per loop step per selected opportunity — before processing any opportunity.
5. **Per-opportunity PBI loop:** `/idea` → `/refine` → `/artifact-review --type=pbi` → `/story` → `/artifact-review --type=story` → `/pbi-challenge` → `/dor-gate` → `/pbi-mockup --explore` → `/design-spec` (UI steps skip for backend-only PBIs; the scope gate and the explore pick are the user's, per PBI). When opportunities run as sub-agents, each sub-agent stops after `/dor-gate`; the main session then runs `/pbi-mockup --explore` (scope gate + pick) and `/design-spec` for each UI PBI, because a sub-agent cannot ask the user. Draft spec, test specs, spec-clarify, scenario and the plan cycle never run per opportunity.
6. After all opportunities: cross-PBI `/prioritize` (RICE + dependency graph, Must/Should/Could per release scope) writes rank/priority back into EACH PBI's frontmatter, not only the backlog file.

## Artifacts

| Output                      | Path                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Idea                        | `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| PBI (+ stories, DoR result) | `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides          |
| Mockup                      | HTML file beside the PBI                                                                                                                     |
| Test specs                  | Feature doc Section 8 (canonical TC registry), mapped to acceptance criteria by TC IDs                                                       |
| Backlog                     | `team-artifacts/backlog/{YYMMDD}-backlog-update.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides   |
| Docs sync                   | `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`                                                                                                 |

Each PBI carries: title, problem statement, hypothesis, GIVEN/WHEN/THEN acceptance criteria, RICE score and priority, user stories, TC IDs, DoR status, and mockup link when UI. Child skills (`idea`, `refine`, `story`, `pbi-mockup`, `prioritize`, `docs-update`) resolve the same roots; write each artifact immediately after its step.

## Orchestration, Memory & Fix Path

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality. XS/S work runs inline; with 6+ selected opportunities spawn one sub-agent per opportunity (brainstorm context + its task list) and keep `/prioritize` in the main context, updating a summary table every 3 opportunities. Fixed dependencies: an artifact exists before it is reviewed; the draft spec and its test specs are reviewed and clarified before the PBI is derived from them; DoR passes before the mockup is finalized; `/docs-update` follows `/prioritize`; gates awaiting user answers are never parallelized; `/workflow-end` runs last. When `/prioritize` changes a PBI's rank after its mockup was built, refresh the mockup's priority badge.
- **Memory:** one task per selected step (per opportunity in the loop). Create `tmp/reports/workflow-idea-to-pbi-{YYMMDD}-{HHmm}-{slug}.md` first, append after every step, and re-read it plus `TaskList` after compaction. Sub-agent briefs make report writing their first deliverable.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`/refine` for the PBI, `/spec` for TCs, `/story` for stories) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero findings, or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); on no progress escalate via `AskUserQuestion`.

---

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /brainstorm -> /idea -> /spec-discovery -> /artifact-review -> /refine -> /why-review -> /spec [mode=draft] -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec-clarify -> /scenario -> /domain-analysis -> /why-review -> /plan -> /plan-review -> /plan-validate -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup --explore -> /design-spec -> /prioritize -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `/start-workflow` → Step Execution Protocol — `gate` steps (`artifact-review --type=pbi`, `dor-gate`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-idea-to-pbi` and the user's prompt as context.

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

**IMPORTANT MUST ATTENTION Goal:** a reviewed, DoR-ready, prioritized PBI backlog where every PBI is an independently releasable actor-facing outcome — depth proportional to the idea, gates never skipped.

- **MUST ATTENTION** triage first (track · size · kinds · risk · `isLargeIdea`) and record it; a small, clear idea skips research, brainstorm, plan cycle, cross-PBI prioritize and the deck — log each skip with evidence.
- **MUST ATTENTION** keep every gate: rationale why-review, spec clarity (Single-PBI), `artifact-review --type=pbi`, independent `pbi-challenge`, `dor-gate` PASS/WARN, UI full-flow mock app (or a recorded `Mockup: SKIPPED by user`) + design-spec, frontmatter priority, `docs-update`, `workflow-end`.
- **MUST ATTENTION** UI mockups are journey-first: Journey Report (`UX-1`) → design-authority read (`UX-2`) → the chosen 1–3 rendered direction drafts (Step 0 scope gate first: 3/2/1 or skip) opened in the default browser → `AskUserQuestion` with a recommended draft → the user's pick, recorded verbatim — never picked while the user can be asked; no question tool → one draft `AUTO-SELECTED`, drafts unshowable or tool error → `AUTO-SELECTED — <reason>` → full mock app → journey walkthrough (`UX-8`) — why: a direction chosen before the journeys, or for the user, styles the wrong surface.
- **MUST ATTENTION** large ideas carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one task per selected step, report file first and appended per step; artifacts are drafts until their gate accepts them.
- **MUST ATTENTION** tech-agnostic prose; implementation names only in evidence fields, frontmatter and Mermaid.
