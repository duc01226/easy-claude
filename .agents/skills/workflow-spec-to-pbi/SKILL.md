---
name: workflow-spec-to-pbi
description: '[Workflow] Use when converting canonical feature/spec artifacts in the project configured format into complete, prioritized, dependency-aware PBIs and stories.'
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
| Source freshness known    | `$spec-index` audit result, or the cited reason no implementation exists to drift from; stale critical domain/contract/business-rule sections stop PBI generation until the user decides whether to update specs first                                                                                                                                                           |
| Coverage                  | coverage matrix (`Spec Source · Capability · Feature/Operation · Domain Impact · Shared Dependency · PBI Type · Status`) maps every source feature/operation to exactly one of: generated releasable PBI · enabling task attached to a releasable PBI · existing PBI reference · out-of-scope with reason                                                                        |
| Spec clarity              | `$spec-clarify` (gate) confirms every non-obvious, conflicting or high-impact decomposition decision with the user before any PBI is built; confirmed material changes route through `$spec [mode=update]` — it never re-authors the spec                                                                                                                                        |
| Releasable outcome        | every PBI is one independently releasable actor-facing outcome with a complete entry-to-result journey; enabling/foundation/migration/setup work is attached and ordered before what it enables, never a standalone PBI                                                                                                                                                          |
| M1-M5, M7                 | acceptance criteria are tech-agnostic, observable, single-interpretation GIVEN/WHEN/THEN; M7 demo test on each criterion's BODY — `Given` a state a user can arrange, `When` an action a user can take, `Then` an outcome a user can see; an invocation `When` or a schema/type/call-count `Then` fails as TECHNICAL-ONLY; AC count never derives from an architecture inventory |
| Rationale reviewed        | `$why-review` on the domain/decomposition rationale is PASS, or WARN with user acknowledgment                                                                                                                                                                                                                                                                                    |
| Artifact review converged | `$artifact-review --type=pbi` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                                                                                                                     |
| Independent challenge     | `$pbi-challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                                                                                                                        |
| Definition of Ready       | `$dor-gate` PASS or WARN for every PBI                                                                                                                                                                                                                                                                                                                                           |
| UI evidence               | UI PBIs: navigable mock app covering every required page/view, navigation edge, component, state, story and the full flow, plus `$design-spec`; one isolated screen fails. Backend-only: stated skip reason                                                                                                                                                                      |
| Priority propagation      | `$prioritize` ranks all generated PBIs once and writes `priority:` + numeric rank into EACH PBI's frontmatter; mockup header and deck show the final value                                                                                                                                                                                                                       |
| Docs synced               | `$docs-update` confirms canonical specs, their test/evidence carriers and project-declared derived indexes are updated or explicitly unchanged                                                                                                                                                                                                                                   |
| Run closed                | `$workflow-end`, then `$watzup` handoff                                                                                                                                                                                                                                                                                                                                          |

No code changes here: the test-green gate does not apply.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                              | Earns its cost when                                                                                                                                           | Feeds                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `$investigate`                                                                                                     | always — locate canonical specs, catalog/index, related code                                                                                                  | input profile, coverage |
| `$spec-index` (audit)                                                                                              | implementation exists or the spec was not synced against code this session                                                                                    | freshness               |
| `$domain-analysis`                                                                                                 | a spec item implies new/changed entities, lifecycle, ownership boundaries or data migration; findings go under each affected PBI's `## Domain Impact`         | domain impact           |
| `$why-review`                                                                                                      | always — challenge the domain/decomposition rationale before clarification                                                                                    | rationale gate          |
| `$spec-clarify`                                                                                                    | always (gate)                                                                                                                                                 | spec clarity            |
| `$scenario`                                                                                                        | slice risks need adversarial replay, state, ownership, recovery or evidence analysis; map proof to a PBI and native test-evidence ID or `deferred_work_owner` | risk coverage           |
| `$plan` → `$plan-review` → `$plan-validate`                                                                        | large spec, 4+ capabilities or cross-capability dependencies                                                                                                  | slicing and order       |
| `$refine`, `$artifact-review --type=pbi`, `$story`, `$artifact-review --type=story`, `$pbi-challenge`, `$dor-gate` | always, per coverage-matrix row that needs a new PBI                                                                                                          | review, challenge, DoR  |
| `$pbi-mockup` → `$design-spec`                                                                                     | the PBI has a user-facing UI surface; both gated by `SYNC:existing-ui-research`                                                                               | UI evidence             |
| `$prioritize`                                                                                                      | whenever PBIs were generated                                                                                                                                  | priority                |
| `$docs-update`                                                                                                     | always, after prioritize                                                                                                                                      | docs synced             |
| `$feature-presentation`                                                                                            | several PBIs, large spec, or stakeholders asked for a deck — then the Scope & backlog slide shows each PBI's rank                                             | stakeholder handoff     |

**Spec-hub coupling (UI PBIs):** the mockup and design-spec are companions of the interaction-intent owner the native profile or local contract declares; link them where the contract has a carrier (fallback: §6 surface and `design_spec:` / `mockup:` frontmatter). If the native spec has no interaction section or link carrier, keep the separate design spec and flag the missing relationship — never invent a numbered section.

**The PBI half matches `workflow-idea-to-pbi`:** PBI review → stories → challenge → DoR → mockup → design-spec → prioritize → docs-update → deck.

## Outputs

Paths are relative to the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

- `pbis/{date}-pbi-{slug}.md` per PBI — native ID citations, `file:section` evidence, GIVEN/WHEN/THEN AC, story points and complexity, dependencies (`must-before` / `can-parallel` / `blocked-by` / `independent`), priority input, test/evidence needs mapped to the declared carrier, domain impact, enabling-task references, Releasable Outcome Gate evidence (actor, outcome, journey, visible/persisted truth, access/failure/recovery, non-goals), UI inventory or no-UI reason, and `priority` frontmatter.
- `pbis/{slug}-mockup.html` and `design-specs/{date}-designspec-{slug}.md` per UI PBI.
- `backlog/spec-to-pbi-{date}-backlog.md` — rank and recommended order, dependency graph, first-do/blocked/defer groups, enabling work ordered with the PBIs it enables, RICE or MoSCoW rationale, DoR status per PBI, open questions.
- The `$feature-presentation` deck when it runs, and `tmp/reports/spec-to-pbi-{date}-{bucket}.md` with the coverage matrix and unresolved questions.

## Orchestration, Memory & Fix Path

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality; 1–3 capabilities run inline; 10+ capabilities run in bounded capability-group batches, one report section per batch. Fixed dependencies: freshness and clarification precede decomposition; a PBI exists before it is reviewed; `$prioritize` runs once after every PBI loop finishes; `$docs-update` follows it; gates awaiting user answers are never parallelized; `$workflow-end` runs last. When `$prioritize` changes a rank after a mockup was built, refresh the mockup's priority badge.
- **Memory:** one task per selected step (per capability group when batched). Create `tmp/reports/spec-to-pbi-{date}-{bucket}.md` first, append after each capability/feature, and re-read it plus the current task list after compaction; never hold all PBIs in memory. Sub-agent briefs make report writing their first deliverable.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`$refine` for the PBI, `$story` for stories, `$spec [mode=update]` for confirmed spec changes) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero findings, or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); on no progress escalate by asking the user directly.

---

**IMPORTANT MANDATORY Steps:** $investigate -> $spec-index -> $domain-analysis -> $why-review -> $spec-clarify -> $scenario -> $plan -> $plan-review -> $plan-validate -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $design-spec -> $prioritize -> $docs-update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `$start-workflow` → Step Execution Protocol — `gate` steps (`spec-clarify`, `artifact-review --type=pbi`, `dor-gate`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `$start-workflow workflow-spec-to-pbi` and the user's prompt as context.

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
