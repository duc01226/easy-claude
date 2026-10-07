---
name: workflow-idea-to-pbi
version: 3.0.0
description: "[Workflow] Turn a product idea into a reviewed, prioritized, Definition-of-Ready PBI and story backlog; stop before implementation."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-idea-to-pbi` together with this skill. Call [`/start-workflow workflow-idea-to-pbi`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create ALL selected occurrence tasks before triage, analysis or step execution, including conditional/optional tasks; preserve occurrence IDs, roles and barrier groups. Use native task tools or an equivalent persistent ledger. Then mark the first task `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a task or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/web-research`](../web-research/SKILL.md) (optional; conditional) → [`/source-deep-dive`](../source-deep-dive/SKILL.md) (optional; conditional) → [`/brainstorm`](../brainstorm/SKILL.md) (optional; conditional) → [`/idea`](../idea/SKILL.md) (core) → [`/spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`/pbi --mode=review`](../pbi/SKILL.md) (optional; conditional) → [`/pbi --mode=refine`](../pbi/SKILL.md) (core) → [`/why-review`](../why-review/SKILL.md) (core) → [`/spec [mode=draft]`](../spec/SKILL.md) (optional; conditional) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/pbi --mode=review --type=spec-tests`](../pbi/SKILL.md) (optional; conditional) → [`/spec [mode=clarify]`](../spec/SKILL.md) (optional; conditional) → [`/scenario`](../scenario/SKILL.md) (optional; conditional) → [`/domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`/why-review`](../why-review/SKILL.md) (optional; conditional) → [`/plan`](../plan/SKILL.md) (optional; conditional) → [`/plan --mode=validate`](../plan/SKILL.md) (optional; conditional) → [`/pbi --mode=review --type=pbi`](../pbi/SKILL.md) (gate) → [`/pbi --mode=story`](../pbi/SKILL.md) (core) → [`/pbi --mode=review --type=story`](../pbi/SKILL.md) (core) → [`/pbi --mode=challenge --reuse=pbi-review`](../pbi/SKILL.md) (core) → [`/pbi --mode=dor --reuse=pbi-review`](../pbi/SKILL.md) (gate) → [`/pbi --mode=mockup --explore`](../pbi/SKILL.md) (optional; conditional) → [`/design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`/prioritize`](../prioritize/SKILL.md) (optional; conditional) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (core) → [`/feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:f34225e773bccfd2ed8574b9bb9361305381d2d3e310a613d05334c3f9a01734 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Turn a product idea into a reviewed, Definition-of-Ready, prioritized PBI backlog — no implementation — with depth proportional to the idea's size, ambiguity and risk.

**Purpose:** For PO/BA work. One concrete idea, ticket or brief becomes one deeply groomed PBI (**Single-PBI track**: idea → draft Feature Spec → test specs → PBI → stories). A raw vision spanning several opportunities becomes a ranked multi-PBI backlog (**Multi-Opportunity track**, the brainstorm-driven MULTI-OPPORTUNITY DISCOVERY MODE). Use `workflow-idea-to-spec` for a spec without a backlog, `workflow-spec-to-pbi` when canonical specs already exist, `workflow-feature` / `workflow-big-feature` to build a DoR-ready PBI, `workflow-bugfix` for defects.

- **Triage first** (track · size · kinds · risk · `isLargeIdea`); it selects which recommended skills run and how deep. A small, clear idea never runs the research → brainstorm → plan → cross-PBI prioritize → deck chain.
- **Gates never flex:** releasable outcome, rationale review, spec clarity, artifact review, independent challenge, DoR, UI full-flow evidence, priority, docs sync, close.
- Every generated artifact is a draft until its review or acceptance gate approves it.
- **Work records:** idea, PBI and story files are work records owned by `/task-track`. Child skills write them in the shape of [Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors) (`status: draft`, no assignee, an `id` no other record uses) and offer tracking once after each save. Only record files live in `ideas/`, `pbis/` and `pbis/stories/`; run reports, review and DoR results and backlog rankings are saved outside them. A review, challenge or DoR PASS is evidence only: this workflow never sets a record ready, assigns it or accepts it; the person records that through `/task-track --mode=lifecycle`.
- **[BLOCKING] Tech-agnostic output:** idea / PBI / story prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — framework, product, language and pattern names appear only in evidence fields, frontmatter and Mermaid.
- Apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root) and `.claude/skills/shared/releasable-pbi-contract.md`; local conventions come from `docs/project-config.json` and the docs index.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Track** — one concrete idea/ticket/brief → **Single-PBI**; a vision/problem spanning several independent opportunities → **Multi-Opportunity**. Ambiguous → ask via `ask user question tool` before any step.
2. **Size** (guidance, not a law) — **XS/S**: one actor, one journey, evident acceptance criteria, no new domain entity, no open decision · **M**: one PBI with domain, UI or cross-module reach, or unresolved decisions · **L/XL**: several PBIs, multi-capability or release-scope.
3. **Kinds** — existing PO artifact supplied · new or reshaped UI surface · domain entity change · market uncertainty · security/PII/money · cross-module.
4. **Large idea** — `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit`. True → the owning PBI/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and downstream stories, mockups and the deck inherit it read-only; all-false → omit the block. A genuinely isolated change records `Decomposition Applicability: EXEMPT` with reason and accepting owner. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) — only an explicit roadmap request routes to the standalone `product-roadmap` skill; a supplied roadmap is read-only context.
5. **Risk & ambiguity** escalate depth (plan cycle, scenario, research), not idea length.

| Triage result                      | Typical route (recommended skills below decide the rest)                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-PBI, XS/S, clear            | idea → pbi --mode=refine → why-review → draft spec → test specs → spec-tests review → spec [mode=clarify] → PBI review → pbi --mode=story → story review → pbi --mode=challenge → pbi --mode=dor → UI mockup/design-spec if UI → docs-manager --mode=update → close |
| Single-PBI, M+ / risky / ambiguous | adds domain-analysis + domain why-review, scenario, one lean plan → plan --mode=validate, prioritize against the backlog, presentation deck                                                                  |
| Multi-Opportunity                  | optional research → brainstorm → opportunity-map why-review → domain-analysis once → per-opportunity loop → cross-PBI prioritize → docs-manager --mode=update → deck → close                                              |

## Required Quality Gates (non-negotiable)

| Gate                      | Evidence                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | track, size, kinds, risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                       |
| Releasable outcome        | every PBI names one independently releasable actor-facing outcome with a complete entry-to-result journey; technical/foundation/setup work is attached enabling work, never a standalone PBI; `BLOCKED` never advances by assumption                                                    |
| Rationale reviewed        | `/why-review` after `/pbi --mode=refine` (and on the opportunity map in the Multi-Opportunity track) is PASS, or WARN with user acknowledgment; FAIL returns to `/pbi --mode=refine`                                                                                                                             |
| Spec clarity (Single-PBI) | draft Feature Spec + TC IDs routed to Feature doc Section 8, reviewed by `/pbi --mode=review --type=spec-tests`; `/spec [mode=clarify]` confirms every non-obvious, conflicting or high-impact decision with the user before the PBI is derived — never intent-skipped while a draft spec exists |
| Artifact review converged | `/pbi --mode=review --type=pbi` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                            |
| Independent challenge     | `/pbi --mode=challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                               |
| Definition of Ready       | `/pbi --mode=dor` PASS or WARN for every PBI before its mockup is finalized or it is handed off                                                                                                                                                                                               |
| UI evidence               | UI PBIs: journey-first mockup via `/pbi --mode=mockup --explore` (it owns the scope gate, Journey Report `UX-1`, design-authority read `UX-2`, direction pick and walkthrough `UX-8`; or a recorded `Mockup: SKIPPED by user`) — a navigable mock app with every required page/view, navigation edge, component, state and full-flow demo, plus `/design-spec`; one isolated screen fails. Backend-only: stated skip reason |
| Priority                  | every PBI carries integer `priority` (rank) + `priority_label` (RICE/MoSCoW) in frontmatter; mockup header and deck show the final value                                                                                                                                                                           |
| Docs synced               | `/docs-manager --mode=update` report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`) confirms feature docs, Feature doc Section 8 TC IDs and derived indexes, or records that none were impacted                                                                                                        |
| Run closed                | `/workflow-end`, then `/watzup` handoff: PBIs created, DoR results, blocking items, recommended next workflow                                                                                                                                                                           |

No code changes here: the test-green gate does not apply; TC drafts stay reference-only until the review and DoR gates accept them.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                   | Earns its cost when                                                                                                      | Feeds                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `/web-research` → `/source-deep-dive`                                                                      | market, competitor or best-practice evidence would change the outcome; deep only after web research ran                  | brainstorm/refine evidence    |
| `/brainstorm`                                                                                           | Multi-Opportunity track — 3–8 item RICE opportunity map                                                                  | opportunity selection         |
| `/idea`, `/pbi --mode=refine`                                                                                      | always (per opportunity in Multi-Opportunity) — `pbi --mode=refine` owns hypothesis, AC, RICE and the Releasable Outcome Gate         | releasable outcome            |
| `/spec [mode=discovery]`                                                                                       | specs or related code already exist for the area                                                                         | no duplicate capability       |
| `/pbi --mode=review` (no type)                                                                            | the PO supplied an existing artifact/ticket/brief                                                                        | input quality                 |
| `/why-review`                                                                                           | after `/pbi --mode=refine` (always); after domain-analysis when it ran                                                                 | rationale gate                |
| `/spec [mode=draft]`, `/spec [mode=tests]`, `/pbi --mode=review --type=spec-tests`, `/spec [mode=clarify]`       | Single-PBI track                                                                                                         | spec clarity                  |
| `/scenario`                                                                                             | the slice needs adversarial replay, state, ownership, recovery or evidence analysis before planning                      | risk coverage                 |
| `/domain-analysis`                                                                                      | the idea adds or changes domain entities (Multi-Opportunity: once, up front)                                             | domain impact                 |
| `/plan` → `/plan --mode=validate`                                                                              | Single-PBI track and M+, cross-module, risky or ambiguous                                                                | story slicing, estimates, DoR |
| `/pbi --mode=review --type=pbi`, `/pbi --mode=story`, `/pbi --mode=review --type=story`, `/pbi --mode=challenge`, `/pbi --mode=dor` | always, per PBI                                                                                                          | review, challenge, DoR        |
| `/pbi --mode=mockup --explore` → `/design-spec`                                                                | the PBI has a user-facing UI surface; journey-first (see UI Mockup below) and gated by `SYNC:existing-ui-research` so both match the current UI system | UI evidence                   |
| `/prioritize`                                                                                           | more than one PBI, or the PBI must be ranked against an existing backlog; otherwise `pbi --mode=refine`'s frontmatter priority stands | priority                      |
| `/docs-manager --mode=update`                                                                                          | always, after prioritize                                                                                                 | docs synced                   |
| `/feature-presentation`                                                                                 | several PBIs, M+ scope, or stakeholders asked for a deck                                                                 | stakeholder handoff           |

The standalone why-review is deliberately absent before the spec-tests and story reviews and after plan --mode=validate: each artifact review owns its own rationale and finding-validation pass.

## UI Mockup — Journey-First Explore (UI PBIs)

The `idea-to-pbi-mockup` step runs `/pbi --mode=mockup --explore` after `/pbi --mode=dor`, per UI PBI. `pbi --mode=mockup` owns the whole sequence (Step 0 scope gate → Journey Report `UX-1` → design-authority read `UX-2` → direction drafts → the user's recorded pick → full build → journey walkthrough `UX-8`); this workflow adds only orchestration rules:

- **The scope gate and the pick are the user's, in the main session** — never inside a sub-agent and never batched across PBIs. In a sub-agent-per-opportunity run the orchestrator asks the Step 0 scope question and presents each PBI's rendered drafts itself; a scope answer recorded in the run report is reused, never asked twice.
- **`/design-spec` follows the mockup** and takes its Journey Report and design-authority record as input (`design-spec` Step 0a reuse) instead of re-deriving them.

**Spec-hub coupling (UI PBIs):** the mockup and design-spec are deep companions of the governing spec's interaction surface (views, navigation, key states, per-story click-paths); record their paths in the spec's `design_spec:` / `mockup:` frontmatter where the artifact profile supports it and keep visual fidelity out of the spec (`SYNC:ui-intent-layer`).

## Reuse Handoffs (caller-passed; every skill still runs standalone with full checks)

- `/idea` runs one Discovery Interview; `/pbi --mode=refine` receives the idea file and asks only the categories that interview left unanswered.
- After `/pbi --mode=review --type=pbi`, record its report path and the PBI identity (SHA-256 of the file bytes; size + mtime is not accepted — see the `--reuse` rules in `.claude/skills/shared/m1-m7-gates.md`) in the run report. `/pbi --mode=challenge --reuse=pbi-review` and `/pbi --mode=dor --reuse=pbi-review` (workflow args) resolve to that report and reuse only the criteria that coverage map allows (DoR- and challenge-owned checks always run in full); when the PBI changed after that review (a fix, a story edit that touched the PBI), drop the flag so both run every check.
- `/design-spec` reuses the mockup's Journey Report; `/prioritize` runs only when the step's applicability holds.

## Multi-Opportunity Loop

1. `/brainstorm` (Double Diamond) writes the RICE-scored opportunity map to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
2. `ask user question tool` with `multiSelect: true`: "Which opportunities should we develop into PBIs?"
3. Opportunity-map why-review: are the top opportunities the right problems, are Reach/Impact founded, pre-mortem, systemic alternatives. FAIL on a high-ranked item → drop it or reframe; WARN → proceed with user acknowledgment.
4. Create every loop task up front — one task per loop step per selected opportunity — before processing any opportunity.
5. **Per-opportunity PBI loop:** `/idea` → `/pbi --mode=refine` → `/pbi --mode=review --type=pbi` → `/pbi --mode=story` → `/pbi --mode=review --type=story` → `/pbi --mode=challenge` → `/pbi --mode=dor` → `/pbi --mode=mockup --explore` → `/design-spec` (UI steps skip for backend-only PBIs; the scope gate and the explore pick are the user's, per PBI). When opportunities run as sub-agents, each sub-agent stops after `/pbi --mode=dor`; the main session then runs `/pbi --mode=mockup --explore` (scope gate + pick) and `/design-spec` for each UI PBI, because a sub-agent cannot ask the user. Draft spec, test specs, spec [mode=clarify], scenario and the plan cycle never run per opportunity.
6. After all opportunities: cross-PBI `/prioritize` (RICE + dependency graph, Must/Should/Could per release scope) records `priority` + `priority_label` on EACH PBI, not only the backlog file.

## Artifacts

| Output                      | Path                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Idea                        | `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| PBI (+ stories, DoR result) | `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides          |
| Mockup                      | HTML file beside the PBI                                                                                                                     |
| Test specs                  | Feature doc Section 8 (canonical TC registry), mapped to acceptance criteria by TC IDs                                                       |
| Backlog                     | `team-artifacts/backlog/{YYMMDD}-backlog-update.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides   |
| Docs sync                   | `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`                                                                                                 |

Each PBI carries: title, problem statement, hypothesis, GIVEN/WHEN/THEN acceptance criteria, RICE score and priority, user stories, TC IDs, DoR status, and mockup link when UI. Child skills (`idea`, `pbi --mode=refine`, `pbi --mode=story`, `pbi --mode=mockup`, `prioritize`, `docs-manager --mode=update`) resolve the same roots; write each artifact immediately after its step.

## Orchestration, Memory & Fix Path

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality. XS/S work runs inline; with 6+ selected opportunities spawn one sub-agent per opportunity (brainstorm context + its task list) and keep `/prioritize` in the main context, updating a summary table every 3 opportunities. Fixed dependencies: an artifact exists before it is reviewed; the draft spec and its test specs are reviewed and clarified before the PBI is derived from them; DoR passes before the mockup is finalized; `/docs-manager --mode=update` follows `/prioritize`; gates awaiting user answers are never parallelized; `/workflow-end` runs last. When `/prioritize` changes a PBI's rank after its mockup was built, refresh the mockup's priority badge.
- **Memory:** one task per selected step (per opportunity in the loop). Create `tmp/reports/workflow-idea-to-pbi-{YYMMDD}-{HHmm}-{slug}.md` first, append after every step, and re-read it plus `TaskList` after compaction. Sub-agent briefs make report writing their first deliverable.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`/pbi --mode=refine` for the PBI, `/spec` for TCs, `/pbi --mode=story` for stories) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero open findings (LOW deferral), or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 3 review rounds; on no progress escalate via `ask user question tool`.

---

**IMPORTANT MANDATORY Steps:** /web-research -> /source-deep-dive -> /brainstorm -> /idea -> /spec [mode=discovery] -> /pbi --mode=review -> /pbi --mode=refine -> /why-review -> /spec [mode=draft] -> /spec [mode=tests] -> /pbi --mode=review --type=spec-tests -> /spec [mode=clarify] -> /scenario -> /domain-analysis -> /why-review -> /plan -> /plan --mode=validate -> /pbi --mode=review --type=pbi -> /pbi --mode=story -> /pbi --mode=review --type=story -> /pbi --mode=challenge --reuse=pbi-review -> /pbi --mode=dor --reuse=pbi-review -> /pbi --mode=mockup --explore -> /design-spec -> /prioritize -> /docs-manager --mode=update -> /feature-presentation -> /workflow-end -> /watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `/start-workflow` → Step Execution Protocol — `gate` steps (`pbi --mode=review --type=pbi`, `pbi --mode=dor`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-idea-to-pbi` and the user's prompt as context.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a reviewed, DoR-ready, prioritized PBI backlog where every PBI is an independently releasable actor-facing outcome — depth proportional to the idea, gates never skipped.

- **MUST ATTENTION** triage first (track · size · kinds · risk · `isLargeIdea`) and record it; a small, clear idea skips research, brainstorm, plan cycle, cross-PBI prioritize and the deck — log each skip with evidence.
- **MUST ATTENTION** keep every gate: rationale why-review, spec clarity (Single-PBI), `pbi --mode=review --type=pbi`, independent `pbi --mode=challenge`, `pbi --mode=dor` PASS/WARN, UI full-flow mock app (or a recorded `Mockup: SKIPPED by user`) + design-spec, frontmatter priority, `docs-manager --mode=update`, `workflow-end`.
- **MUST ATTENTION** UI mockups are journey-first and run through `/pbi --mode=mockup --explore` (scope gate first, Journey Report before any drafting, the user's recorded pick — never picked while the user can be asked; `Selection:` line when no question tool) — why: a direction chosen before the journeys, or for the user, styles the wrong surface.
- **MUST ATTENTION** large ideas carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one task per selected step, report file first and appended per step; artifacts are drafts until their gate accepts them.
- **MUST ATTENTION** tech-agnostic prose; implementation names only in evidence fields, frontmatter and Mermaid.
