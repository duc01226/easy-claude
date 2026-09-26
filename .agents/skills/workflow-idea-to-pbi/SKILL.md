---
name: workflow-idea-to-pbi
description: '[Workflow] Use when turning an idea or product vision into prioritized PBIs and stories (single-PBI deep mode or multi-opportunity discovery).'
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

**Goal:** Turn a product idea into a reviewed, Definition-of-Ready, prioritized PBI backlog — no implementation — with depth proportional to the idea's size, ambiguity and risk.

**Purpose:** For PO/BA work. One concrete idea, ticket or brief becomes one deeply groomed PBI (**Single-PBI track**: idea → draft Feature Spec → test specs → PBI → stories). A raw vision spanning several opportunities becomes a ranked multi-PBI backlog (**Multi-Opportunity track**, the brainstorm-driven MULTI-OPPORTUNITY DISCOVERY MODE). Use `workflow-idea-to-spec` for a spec without a backlog, `workflow-spec-to-pbi` when canonical specs already exist, `workflow-feature` / `workflow-big-feature` to build a DoR-ready PBI, `workflow-bugfix` for defects.

- **Triage first** (track · size · kinds · risk · `isLargeIdea`); it selects which recommended skills run and how deep. A small, clear idea never runs the research → brainstorm → plan → cross-PBI prioritize → deck chain.
- **Gates never flex:** releasable outcome, rationale review, spec clarity, artifact review, independent challenge, DoR, UI full-flow evidence, priority, docs sync, close.
- Every generated artifact is a draft until its review or acceptance gate approves it.
- **[BLOCKING] Tech-agnostic output:** idea / PBI / story prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — framework, product, language and pattern names appear only in evidence fields, frontmatter and Mermaid.
- Apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root) and `.claude/skills/shared/releasable-pbi-contract.md`; local conventions come from `docs/project-config.json` and the docs index.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Track** — one concrete idea/ticket/brief → **Single-PBI**; a vision/problem spanning several independent opportunities → **Multi-Opportunity**. Ambiguous → ask by asking the user directly before any step.
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
| Rationale reviewed        | `$why-review` after refine (and on the opportunity map in the Multi-Opportunity track) is PASS, or WARN with user acknowledgment; FAIL returns to `$refine`                                                                                                                             |
| Spec clarity (Single-PBI) | draft Feature Spec + TC IDs routed to Feature doc Section 8, reviewed by `$artifact-review --type=spec-tests`; `$spec-clarify` confirms every non-obvious, conflicting or high-impact decision with the user before the PBI is derived — never intent-skipped while a draft spec exists |
| Artifact review converged | `$artifact-review --type=pbi` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                            |
| Independent challenge     | `$pbi-challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                               |
| Definition of Ready       | `$dor-gate` PASS or WARN for every PBI before its mockup is finalized or it is handed off                                                                                                                                                                                               |
| UI evidence               | UI PBIs: journey-first mockup (mockup scope gate: 3/2/1 drafts or skip → Journey Report `UX-1` → design-authority read `UX-2` → the chosen 1–3 rendered direction drafts → the user's recorded pick, or a recorded `Selection:` line when the user cannot be asked → full build → journey walkthrough `UX-8`; or `Mockup: SKIPPED by user`) — a navigable mock app with every required page/view, navigation edge, component, state and full-flow demo, plus `$design-spec`; one isolated screen fails. Backend-only: stated skip reason |
| Priority                  | every PBI carries `priority` (rank + RICE/MoSCoW) in frontmatter; mockup header and deck show the final value                                                                                                                                                                           |
| Docs synced               | `$docs-update` report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`) confirms feature docs, Feature doc Section 8 TC IDs and derived indexes, or records that none were impacted                                                                                                        |
| Run closed                | `$workflow-end`, then `$watzup` handoff: PBIs created, DoR results, blocking items, recommended next workflow                                                                                                                                                                           |

No code changes here: the test-green gate does not apply; TC drafts stay reference-only until the review and DoR gates accept them.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                   | Earns its cost when                                                                                                      | Feeds                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `$web-research` → `$deep-research`                                                                      | market, competitor or best-practice evidence would change the outcome; deep only after web research ran                  | brainstorm/refine evidence    |
| `$brainstorm`                                                                                           | Multi-Opportunity track — 3–8 item RICE opportunity map                                                                  | opportunity selection         |
| `$idea`, `$refine`                                                                                      | always (per opportunity in Multi-Opportunity) — refine owns hypothesis, AC, RICE and the Releasable Outcome Gate         | releasable outcome            |
| `$spec-discovery`                                                                                       | specs or related code already exist for the area                                                                         | no duplicate capability       |
| `$artifact-review` (no type)                                                                            | the PO supplied an existing artifact/ticket/brief                                                                        | input quality                 |
| `$why-review`                                                                                           | after refine (always); after domain-analysis when it ran                                                                 | rationale gate                |
| `$spec [mode=draft]`, `$spec [mode=tests]`, `$artifact-review --type=spec-tests`, `$spec-clarify`       | Single-PBI track                                                                                                         | spec clarity                  |
| `$scenario`                                                                                             | the slice needs adversarial replay, state, ownership, recovery or evidence analysis before planning                      | risk coverage                 |
| `$domain-analysis`                                                                                      | the idea adds or changes domain entities (Multi-Opportunity: once, up front)                                             | domain impact                 |
| `$plan` → `$plan-review` → `$plan-validate`                                                             | Single-PBI track and M+, cross-module, risky or ambiguous                                                                | story slicing, estimates, DoR |
| `$artifact-review --type=pbi`, `$story`, `$artifact-review --type=story`, `$pbi-challenge`, `$dor-gate` | always, per PBI                                                                                                          | review, challenge, DoR        |
| `$pbi-mockup --explore` → `$design-spec`                                                                | the PBI has a user-facing UI surface; journey-first (see UI Mockup below) and gated by `SYNC:existing-ui-research` so both match the current UI system | UI evidence                   |
| `$prioritize`                                                                                           | more than one PBI, or the PBI must be ranked against an existing backlog; otherwise refine's frontmatter priority stands | priority                      |
| `$docs-update`                                                                                          | always, after prioritize                                                                                                 | docs synced                   |
| `$feature-presentation`                                                                                 | several PBIs, M+ scope, or stakeholders asked for a deck                                                                 | stakeholder handoff           |

The standalone why-review is deliberately absent before the spec-tests and story reviews, after the PBI review and after plan-validate: `artifact-review` and every `plan-review` round already run the adversarial rationale pass and `$why-review --validate-findings` on that artifact.

## UI Mockup — Journey-First Explore (UI PBIs)

The `idea-to-pbi-mockup` step runs `$pbi-mockup --explore` after `$dor-gate`, per UI PBI, in this BLOCKING order (`SYNC:ux-journey-gate`; catalog `.claude/docs/ux-journey-process.md`):

0. **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with ask the user directly available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope); `Skip mockup` → record `Mockup: SKIPPED by user` and continue without a mockup. Without the tool, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report.
1. **Report the main user journeys (`UX-1`)** from the PBI, stories, acceptance criteria, draft spec and business rules — frame · actors with job statements · ranked main journeys with step tables · derived requirements · assumptions, each claim `SOURCED` or `INFERRED`. An inferred primary actor, job or success outcome is confirmed with the user first; with no question tool it is recorded `INFERRED — unconfirmed (no question tool)` and the run continues.
2. **Read the design authority (`UX-2`)** — the project's design principles, design system, styling conventions, accepted design ADRs and the existing related UI; record `Design authority read: <paths>` or `N/A`.
3. **Plan views and demo flows from the journeys**, then **the chosen 1–3 direction drafts** of the primary journey's key views: same journeys, views and information-priority tiers, divergent only on free visual axes (a brief or design system that pins every axis records the exemption instead), rendered with `html-export` under `tmp/design/<run>/`.
4. **Open, recommend, ASK for the user's pick** — open each draft in the default browser (`node .claude/scripts/open-report.cjs <draft>`) and, with 2–3 drafts, ask with ask the user directly — one option per draft, your evidence-backed recommendation first labelled `(Recommended)`; never pick for the user while they can be asked; "continue" or silence is not a pick; record the verbatim reply in `tmp/design/<run>/direction-approved.md`. One draft → record `Selection: USER — 1 option` (or the Step 0 `AUTO-SELECTED` line). Drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit) and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and the run report.
5. **Build the full multi-view mock app** in the chosen direction, applying `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8` and `CL-1`–`CL-6` after `UX-*`, then **walk every main journey** with a traceability matrix (`UX-8`) and close with the gate's UI/UX Gate Report when the canonical gate defines one; an unserved step, orphan element or unresolved `FAIL` is fixed before hand-off.

`$design-spec` then reuses the mockup's Journey Report and design-authority record. The pick is a user gate: in a sub-agent-per-opportunity run the orchestrator presents each PBI's rendered drafts and records its pick — never inside a sub-agent, never batched across PBIs.

**Spec-hub coupling (UI PBIs):** the mockup and design-spec are deep companions of the governing spec's interaction surface (views, navigation, key states, per-story click-paths); record their paths in the spec's `design_spec:` / `mockup:` frontmatter where the artifact profile supports it and keep visual fidelity out of the spec (`SYNC:ui-intent-layer`).

## Multi-Opportunity Loop

1. `$brainstorm` (Double Diamond) writes the RICE-scored opportunity map to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
2. ask the user directly with `multiSelect: true`: "Which opportunities should we develop into PBIs?"
3. Opportunity-map why-review: are the top opportunities the right problems, are Reach/Impact founded, pre-mortem, systemic alternatives. FAIL on a high-ranked item → drop it or reframe; WARN → proceed with user acknowledgment.
4. Create every loop task up front — one task per loop step per selected opportunity — before processing any opportunity.
5. **Per-opportunity PBI loop:** `$idea` → `$refine` → `$artifact-review --type=pbi` → `$story` → `$artifact-review --type=story` → `$pbi-challenge` → `$dor-gate` → `$pbi-mockup --explore` → `$design-spec` (UI steps skip for backend-only PBIs; the scope gate and the explore pick are the user's, per PBI). When opportunities run as sub-agents, each sub-agent stops after `$dor-gate`; the main session then runs `$pbi-mockup --explore` (scope gate + pick) and `$design-spec` for each UI PBI, because a sub-agent cannot ask the user. Draft spec, test specs, spec-clarify, scenario and the plan cycle never run per opportunity.
6. After all opportunities: cross-PBI `$prioritize` (RICE + dependency graph, Must/Should/Could per release scope) writes rank/priority back into EACH PBI's frontmatter, not only the backlog file.

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

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality. XS/S work runs inline; with 6+ selected opportunities spawn one sub-agent per opportunity (brainstorm context + its task list) and keep `$prioritize` in the main context, updating a summary table every 3 opportunities. Fixed dependencies: an artifact exists before it is reviewed; the draft spec and its test specs are reviewed and clarified before the PBI is derived from them; DoR passes before the mockup is finalized; `$docs-update` follows `$prioritize`; gates awaiting user answers are never parallelized; `$workflow-end` runs last. When `$prioritize` changes a PBI's rank after its mockup was built, refresh the mockup's priority badge.
- **Memory:** one task per selected step (per opportunity in the loop). Create `tmp/reports/workflow-idea-to-pbi-{YYMMDD}-{HHmm}-{slug}.md` first, append after every step, and re-read it plus the current task list after compaction. Sub-agent briefs make report writing their first deliverable.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`$refine` for the PBI, `$spec` for TCs, `$story` for stories) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero findings, or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); on no progress escalate by asking the user directly.

---

**IMPORTANT MANDATORY Steps:** $web-research -> $deep-research -> $brainstorm -> $idea -> $spec-discovery -> $artifact-review -> $refine -> $why-review -> $spec [mode=draft] -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $spec-clarify -> $scenario -> $domain-analysis -> $why-review -> $plan -> $plan-review -> $plan-validate -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup --explore -> $design-spec -> $prioritize -> $docs-update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `$start-workflow` → Step Execution Protocol — `gate` steps (`artifact-review --type=pbi`, `dor-gate`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `$start-workflow workflow-idea-to-pbi` and the user's prompt as context.

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
- **MUST ATTENTION** UI mockups are journey-first: Journey Report (`UX-1`) → design-authority read (`UX-2`) → the chosen 1–3 rendered direction drafts (Step 0 scope gate first: 3/2/1 or skip) opened in the default browser → ask the user directly with a recommended draft → the user's pick, recorded verbatim — never picked while the user can be asked; no question tool → one draft `AUTO-SELECTED`, drafts unshowable or tool error → `AUTO-SELECTED — <reason>` → full mock app → journey walkthrough (`UX-8`) — why: a direction chosen before the journeys, or for the user, styles the wrong surface.
- **MUST ATTENTION** large ideas carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one task per selected step, report file first and appended per step; artifacts are drafts until their gate accepts them.
- **MUST ATTENTION** tech-agnostic prose; implementation names only in evidence fields, frontmatter and Mermaid.

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
