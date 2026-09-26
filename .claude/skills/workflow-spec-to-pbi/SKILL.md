---
name: workflow-spec-to-pbi
version: 3.0.0
description: "[Workflow] Use when converting canonical feature/spec artifacts in the project configured format into complete, prioritized, dependency-aware PBIs and stories."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Convert existing canonical specs into a complete, dependency-ordered, prioritized, Definition-of-Ready PBI/story backlog — no implementation — with depth proportional to the spec's size and risk.

**Purpose:** For PO/BA teams that already have canonical specs (one capability or a whole bucket) and need sprint-ready PBIs, including splitting a very large spec and identifying enabling work. Use `workflow-idea-to-spec` when no spec exists yet, `workflow-idea-to-pbi` for one informal idea, `workflow-code-to-spec` to create/update specs from code, `workflow-feature` / `workflow-big-feature` to build ready PBIs.

- **Triage first** (capability count · kinds · freshness risk · `isLargeIdea`); it selects which recommended skills run. A 1–3 capability spec with no domain change skips the plan cycle, scenario and domain analysis.
- **Gates never flex:** coverage, spec clarity, releasable outcome, artifact review, independent challenge, DoR, UI full-flow evidence, priority propagation, docs sync, close.
- **[BLOCKING] Tech-agnostic output:** PBI / backlog / report prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — implementation names appear only in evidence fields, frontmatter and Mermaid.
- Apply `.claude/skills/shared/sdd-artifact-contract.md` (AI-SDD Mandates M1-M7), `.claude/skills/shared/releasable-pbi-contract.md` and `.claude/skills/shared/product-roadmap-contract.md`.

## Canonical Input Profile

Before loading or mapping a spec, read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts` when declared), the configured template and the local `spec-system-reference.md` / `spec-principles.md`. Use the native paths, section roles, identifier formats, ownership model and evidence/test carriers they declare; code stays the technical source of truth and the canonical spec the requirements source — never create a second engineering-spec plane.

- The portable `{Bucket}/README.{Feature}.md` tech-free 8-section spec (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 `TC-` cases) is the fallback ONLY when neither a native profile nor a local artifact contract applies.
- Carry native requirement, acceptance, rule and scenario IDs as the PRIMARY citation spine and declared evidence carriers as secondary traceability; never translate them into `FR-`/`BR-`, mint new IDs, synthesize a missing section or duplicate a case registry.
- A missing/ambiguous spec path or owner → ask for the exact configured path. An unknown role, owner or test-evidence mapping is `UNKNOWN` and blocks that mapping — never treat it as absent or green.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Scale** — **1–3 capabilities**: inline, one task per capability and feature group · **4–10**: split by capability, then feature/operation group · **10+**: capability-group batches with coverage-matrix checkpoints. Any PBI over 8 story points splits (SPIDR) until ≤ 8.
2. **Kinds** — new/changed entities, lifecycle or state transitions, cross-service ownership, data migration or seed needs (domain) · user-facing UI surface · implementation already exists (freshness risk) · security/PII/money.
3. **Large spec** — evaluate `isLargeIdea`. True → read the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) from the role the native profile or local reference declares for slice plans and carry its stable slice IDs through every PBI, story, mockup and the all-PBI deck; if no role permits slice plans, mark the owner `UNKNOWN` and stop decomposition until resolved. All-false → omit the block and roadmap fields. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); a supplied roadmap is read-only context.
4. **Risk & ambiguity** escalate depth (plan cycle, scenario), not spec length.

## Required Quality Gates (non-negotiable)

| Gate                      | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | scale, kinds, freshness risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                                                                                                            |
| Source freshness known    | `/spec-index` audit result, or the cited reason no implementation exists to drift from; stale critical domain/contract/business-rule sections stop PBI generation until the user decides whether to update specs first                                                                                                                                                           |
| Coverage                  | coverage matrix (`Spec Source · Capability · Feature/Operation · Domain Impact · Shared Dependency · PBI Type · Status`) maps every source feature/operation to exactly one of: generated releasable PBI · enabling task attached to a releasable PBI · existing PBI reference · out-of-scope with reason                                                                        |
| Spec clarity              | `/spec-clarify` (gate) confirms every non-obvious, conflicting or high-impact decomposition decision with the user before any PBI is built; confirmed material changes route through `/spec [mode=update]` — it never re-authors the spec                                                                                                                                        |
| Releasable outcome        | every PBI is one independently releasable actor-facing outcome with a complete entry-to-result journey; enabling/foundation/migration/setup work is attached and ordered before what it enables, never a standalone PBI                                                                                                                                                          |
| M1-M5, M7                 | acceptance criteria are tech-agnostic, observable, single-interpretation GIVEN/WHEN/THEN; M7 demo test on each criterion's BODY — `Given` a state a user can arrange, `When` an action a user can take, `Then` an outcome a user can see; an invocation `When` or a schema/type/call-count `Then` fails as TECHNICAL-ONLY; AC count never derives from an architecture inventory |
| Rationale reviewed        | `/why-review` on the domain/decomposition rationale is PASS, or WARN with user acknowledgment                                                                                                                                                                                                                                                                                    |
| Artifact review converged | `/artifact-review --type=pbi` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                                                                                                                     |
| Independent challenge     | `/pbi-challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                                                                                                                        |
| Definition of Ready       | `/dor-gate` PASS or WARN for every PBI                                                                                                                                                                                                                                                                                                                                           |
| UI evidence               | UI PBIs: navigable mock app covering every required page/view, navigation edge, component, state, story and the full flow, plus `/design-spec`; one isolated screen fails. Backend-only: stated skip reason                                                                                                                                                                      |
| Priority propagation      | `/prioritize` ranks all generated PBIs once and writes `priority:` + numeric rank into EACH PBI's frontmatter; mockup header and deck show the final value                                                                                                                                                                                                                       |
| Docs synced               | `/docs-update` confirms canonical specs, their test/evidence carriers and project-declared derived indexes are updated or explicitly unchanged                                                                                                                                                                                                                                   |
| Run closed                | `/workflow-end`, then `/watzup` handoff                                                                                                                                                                                                                                                                                                                                          |

No code changes here: the test-green gate does not apply.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                              | Earns its cost when                                                                                                                                           | Feeds                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `/investigate`                                                                                                     | always — locate canonical specs, catalog/index, related code                                                                                                  | input profile, coverage |
| `/spec-index` (audit)                                                                                              | implementation exists or the spec was not synced against code this session                                                                                    | freshness               |
| `/domain-analysis`                                                                                                 | a spec item implies new/changed entities, lifecycle, ownership boundaries or data migration; findings go under each affected PBI's `## Domain Impact`         | domain impact           |
| `/why-review`                                                                                                      | always — challenge the domain/decomposition rationale before clarification                                                                                    | rationale gate          |
| `/spec-clarify`                                                                                                    | always (gate)                                                                                                                                                 | spec clarity            |
| `/scenario`                                                                                                        | slice risks need adversarial replay, state, ownership, recovery or evidence analysis; map proof to a PBI and native test-evidence ID or `deferred_work_owner` | risk coverage           |
| `/plan` → `/plan-review` → `/plan-validate`                                                                        | large spec, 4+ capabilities or cross-capability dependencies                                                                                                  | slicing and order       |
| `/refine`, `/artifact-review --type=pbi`, `/story`, `/artifact-review --type=story`, `/pbi-challenge`, `/dor-gate` | always, per coverage-matrix row that needs a new PBI                                                                                                          | review, challenge, DoR  |
| `/pbi-mockup` → `/design-spec`                                                                                     | the PBI has a user-facing UI surface; both gated by `SYNC:existing-ui-research`                                                                               | UI evidence             |
| `/prioritize`                                                                                                      | whenever PBIs were generated                                                                                                                                  | priority                |
| `/docs-update`                                                                                                     | always, after prioritize                                                                                                                                      | docs synced             |
| `/feature-presentation`                                                                                            | several PBIs, large spec, or stakeholders asked for a deck — then the Scope & backlog slide shows each PBI's rank                                             | stakeholder handoff     |

**Spec-hub coupling (UI PBIs):** the mockup and design-spec are companions of the interaction-intent owner the native profile or local contract declares; link them where the contract has a carrier (fallback: §6 surface and `design_spec:` / `mockup:` frontmatter). If the native spec has no interaction section or link carrier, keep the separate design spec and flag the missing relationship — never invent a numbered section.

**The PBI half matches `workflow-idea-to-pbi`:** PBI review → stories → challenge → DoR → mockup → design-spec → prioritize → docs-update → deck.

## Outputs

Paths are relative to the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

- `pbis/{date}-pbi-{slug}.md` per PBI — native ID citations, `file:section` evidence, GIVEN/WHEN/THEN AC, story points and complexity, dependencies (`must-before` / `can-parallel` / `blocked-by` / `independent`), priority input, test/evidence needs mapped to the declared carrier, domain impact, enabling-task references, Releasable Outcome Gate evidence (actor, outcome, journey, visible/persisted truth, access/failure/recovery, non-goals), UI inventory or no-UI reason, and `priority` frontmatter.
- `pbis/{slug}-mockup.html` and `design-specs/{date}-designspec-{slug}.md` per UI PBI.
- `backlog/spec-to-pbi-{date}-backlog.md` — rank and recommended order, dependency graph, first-do/blocked/defer groups, enabling work ordered with the PBIs it enables, RICE or MoSCoW rationale, DoR status per PBI, open questions.
- The `/feature-presentation` deck when it runs, and `tmp/reports/spec-to-pbi-{date}-{bucket}.md` with the coverage matrix and unresolved questions.

## Orchestration, Memory & Fix Path

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality; 1–3 capabilities run inline; 10+ capabilities run in bounded capability-group batches, one report section per batch. Fixed dependencies: freshness and clarification precede decomposition; a PBI exists before it is reviewed; `/prioritize` runs once after every PBI loop finishes; `/docs-update` follows it; gates awaiting user answers are never parallelized; `/workflow-end` runs last. When `/prioritize` changes a rank after a mockup was built, refresh the mockup's priority badge.
- **Memory:** one task per selected step (per capability group when batched). Create `tmp/reports/spec-to-pbi-{date}-{bucket}.md` first, append after each capability/feature, and re-read it plus `TaskList` after compaction; never hold all PBIs in memory. Sub-agent briefs make report writing their first deliverable.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`/refine` for the PBI, `/story` for stories, `/spec [mode=update]` for confirmed spec changes) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero findings, or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); on no progress escalate via `AskUserQuestion`.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-index -> /domain-analysis -> /why-review -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /design-spec -> /prioritize -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `/start-workflow` → Step Execution Protocol — `gate` steps (`spec-clarify`, `artifact-review --type=pbi`, `dor-gate`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-spec-to-pbi` and the user's prompt as context.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a complete, dependency-ordered, prioritized, DoR-ready PBI/story backlog from canonical specs — depth proportional to the spec, gates never skipped.

- **MUST ATTENTION** triage first (scale · kinds · freshness · `isLargeIdea`) and record it; skip domain analysis, scenario and the plan cycle only with logged evidence.
- **MUST ATTENTION** keep every gate: coverage matrix, `spec-clarify`, releasable outcome + M7, `artifact-review --type=pbi`, independent `pbi-challenge`, `dor-gate`, UI full-flow mock app + design-spec, priority written into every PBI's frontmatter, `docs-update`, `workflow-end`.
- **MUST ATTENTION** carry native IDs as the citation spine; never mint IDs, invent sections or emit a standalone technical PBI.
- **MUST ATTENTION** large specs carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one task per selected step, report file first and appended per capability; tech-agnostic prose.
