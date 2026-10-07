---
name: workflow-spec-to-task
description: '[Workflow] Convert existing canonical specs into complete, dependency-ordered, prioritized, readiness-checked planned tasks and stories.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Todo tracking mandate: BEFORE executing any workflow or skill step, create/update todo tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-spec-to-task` together with this skill. Call [`$start-workflow workflow-spec-to-task`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create one todo for EVERY selected occurrence before triage, analysis or step execution, including conditional/optional ones; preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$investigate`](../investigate/SKILL.md) (core) → [`$spec [mode=index]`](../spec/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`$why-review`](../why-review/SKILL.md) (core) → [`$spec [mode=clarify]`](../spec/SKILL.md) (gate) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$plan`](../plan/SKILL.md) (optional; conditional) → [`$plan --mode=validate`](../plan/SKILL.md) (optional; conditional) → [`$work-item --mode=refine`](../work-item/SKILL.md) (core) → [`$work-item --mode=review --type=task`](../work-item/SKILL.md) (gate) → [`$work-item --mode=story`](../work-item/SKILL.md) (core) → [`$work-item --mode=review --type=story`](../work-item/SKILL.md) (core) → [`$work-item --mode=challenge --reuse=task-review`](../work-item/SKILL.md) (core) → [`$work-item --mode=dor --reuse=task-review`](../work-item/SKILL.md) (gate) → [`$work-item --mode=mockup`](../work-item/SKILL.md) (optional; conditional) → [`$design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`$prioritize`](../prioritize/SKILL.md) (optional; conditional) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (core) → [`$feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:5805e53cec4e0a66e583c4731c369bbd9a46ec780fa862dd74a8f1d50e338d06 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

> **Renamed:** formerly `workflow-spec-to-pbi` — now `$workflow-spec-to-task`. The old name no longer resolves as a slash command.

## Quick Summary

**Goal:** Convert existing canonical specs into complete, dependency-ordered, prioritized, readiness-checked planned tasks and stories — no implementation — with depth proportional to the spec's size and risk.

**Summary:** Triage/profile → investigate/freshness → domain/rationale → clarify → scenario/plan/validate → refine/review → stories/review → independent challenge/DoR → UI mockup/design-spec → prioritize → docs sync → deck → close/wrap-up. Triage selects optional work; gates remain fixed. Produce ready-to-start tasks, including large-spec slices and attached enabling work.

**Use when:** PO/BA has canonical specs for a capability or bucket. **Adjacent routes:** no spec → `workflow-initiative-to-spec`; informal idea → `workflow-initiative-to-task`; code to specs → `workflow-code-to-spec`; build ready tasks → `workflow-feature` / `workflow-big-feature`.

- **Triage first** (capability count · kinds · freshness risk · `isLargeIdea`); it selects which recommended skills run. A 1–3 capability spec with no domain change skips the plan cycle, scenario and domain analysis.
- **Gates never flex:** coverage, spec clarity, releasable outcome, artifact review, independent challenge, DoR, UI full-flow evidence, priority propagation, docs sync, close.
- **[BLOCKING] Tech-agnostic output:** Task / planned work / report prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — implementation names appear only in evidence fields, frontmatter and Mermaid.
- Read `.claude/skills/shared/sdd-artifact-contract.md` when applying M1-M7; `.claude/skills/shared/releasable-task-contract.md` when slicing actor-facing outcomes; `.claude/skills/shared/product-roadmap-contract.md` when `isLargeIdea` governs decomposition. These contracts preserve business-visible criteria, releasable journeys and embedded slice ownership.

## Canonical Input Profile

Before loading or mapping a spec, read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts` when declared), the configured template and the local `spec-system-reference.md` / `spec-principles.md`. Use the native paths, section roles, identifier formats, ownership model and evidence/test carriers they declare; code stays the technical source of truth and the canonical spec the requirements source — never create a second engineering-spec plane.

- The portable `{Bucket}/README.{Feature}.md` tech-free 8-section spec (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 `TC-` cases) is the fallback ONLY when neither a native profile nor a local artifact contract applies.
- Carry native requirement, acceptance, rule and scenario IDs as the PRIMARY citation spine and declared evidence carriers as secondary traceability; never translate them into `FR-`/`BR-`, mint new IDs, synthesize a missing section or duplicate a case registry.
- A missing/ambiguous spec path or owner → ask for the exact configured path. An unknown role, owner or test-evidence mapping is `UNKNOWN` and blocks that mapping — never treat it as absent or green.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Scale** — **1–3 capabilities**: inline, one todo per capability and feature group · **4–10**: split by capability, then feature/operation group · **10+**: capability-group batches with coverage-matrix checkpoints. Any task over 8 effort points splits (SPIDR) until ≤ 8.
2. **Kinds** — new/changed entities, lifecycle or state transitions, cross-service ownership, data migration or seed needs (domain) · user-facing UI surface · implementation already exists (freshness risk) · security/PII/money.
3. **Large spec** — evaluate `isLargeIdea`. True → read the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) from the role the native profile or local reference declares for slice plans and carry its stable slice IDs through every task, story, mockup and the all-task deck; if no role permits slice plans, mark the owner `UNKNOWN` and stop decomposition until resolved. All-false → omit the block and roadmap fields. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); a supplied roadmap is read-only context.
4. **Risk & ambiguity** escalate depth (plan cycle, scenario), not spec length.

## Required Quality Gates (non-negotiable)

| Gate                      | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | scale, kinds, freshness risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                                                                                                            |
| Source freshness known    | `$spec [mode=index]` audit result, or the cited reason no implementation exists to drift from; stale critical domain/contract/business-rule sections stop task generation until the user decides whether to update specs first                                                                                                                                                           |
| Coverage                  | coverage matrix (`Spec Source · Capability · Feature/Operation · Domain Impact · Shared Dependency · Task Type · Status`) maps every source feature/operation to exactly one of: generated releasable task · enabling subtask attached to a releasable task · existing task reference · out-of-scope with reason                                                                        |
| Spec clarity              | `$spec [mode=clarify]` (gate) confirms every non-obvious, conflicting or high-impact decomposition decision with the user before any task is built; confirmed material changes route through `$spec [mode=update]` — it never re-authors the spec                                                                                                                                        |
| Releasable outcome        | every task is one independently releasable actor-facing outcome with a complete entry-to-result journey; enabling/foundation/migration/setup work is attached and ordered before what it enables, never a standalone task                                                                                                                                                          |
| M1-M5, M7                 | acceptance criteria are tech-agnostic, observable, single-interpretation GIVEN/WHEN/THEN; M7 demo test on each criterion's BODY — `Given` a state a user can arrange, `When` an action a user can take, `Then` an outcome a user can see; an invocation `When` or a schema/type/call-count `Then` fails as TECHNICAL-ONLY; AC count never derives from an architecture inventory |
| Rationale reviewed        | `$why-review` on the domain/decomposition rationale is PASS, or WARN with user acknowledgment                                                                                                                                                                                                                                                                                    |
| Artifact review converged | `$work-item --mode=review --type=task` (gate) and the story review: validated blocking findings fixed and re-reviewed                                                                                                                                                                                                                                                                     |
| Independent challenge     | `$work-item --mode=challenge` run by a reviewer other than the drafter                                                                                                                                                                                                                                                                                                                        |
| Readiness check           | `$work-item --mode=dor` PASS or WARN for every task                                                                                                                                                                                                                                                                                                                                           |
| UI evidence               | UI tasks: navigable mock app covering every required page/view, navigation edge, component, state, story and the full flow, plus `$design-spec`; one isolated screen fails. Backend-only: stated skip reason                                                                                                                                                                      |
| Priority propagation      | every task carries integer `priority` (rank) + `priority_label` in frontmatter (`$prioritize` ranks all generated tasks once and writes it into EACH task; with exactly one task and no planned-work ranking requested, refine's frontmatter priority stands); mockup header and deck show the final value |
| Docs synced               | `$docs-manager --mode=update` confirms canonical specs, their test/evidence carriers and project-declared derived indexes are updated or explicitly unchanged                                                                                                                                                                                                                                   |
| Run closed                | `$workflow-end`, then `$watzup` handoff                                                                                                                                                                                                                                                                                                                                          |

No code changes here: the test-green gate does not apply.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                              | Earns its cost when                                                                                                                                           | Feeds                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `$investigate`                                                                                                     | always — locate canonical specs, catalog/index, related code                                                                                                  | input profile, coverage |
| `$spec [mode=index]` (audit)                                                                                              | implementation exists or the spec was not synced against code this session                                                                                    | freshness               |
| `$domain-analysis`                                                                                                 | a spec item implies new/changed entities, lifecycle, ownership boundaries or data migration; findings go under each affected task's `## Domain Impact`         | domain impact           |
| `$why-review`                                                                                                      | always — challenge the domain/decomposition rationale before clarification                                                                                    | rationale gate          |
| `$spec [mode=clarify]`                                                                                                    | always (gate)                                                                                                                                                 | spec clarity            |
| `$scenario`                                                                                                        | slice risks need adversarial replay, state, ownership, recovery or evidence analysis; map proof to a task and native test-evidence ID or `deferred_work_owner` | risk coverage           |
| `$plan` → `$plan --mode=validate`                                                                                         | large spec, 4+ capabilities or cross-capability dependencies                                                                                                  | slicing and order       |
| `$work-item --mode=refine`, `$work-item --mode=review --type=task`, `$work-item --mode=story`, `$work-item --mode=review --type=story`, `$work-item --mode=challenge`, `$work-item --mode=dor` | always, per coverage-matrix row that needs a new task                                                                                                          | review, challenge, DoR  |
| `$work-item --mode=mockup` → `$design-spec`                                                                                     | the task has a user-facing UI surface; both gated by `SYNC:existing-ui-research`                                                                               | UI evidence             |
| `$prioritize`                                                                                                      | more than one task was generated, or the task must be ranked against existing planned work; otherwise refine's frontmatter priority stands |
| `$docs-manager --mode=update`                                                                                                     | always, after prioritize                                                                                                                                      | docs synced             |
| `$feature-presentation`                                                                                            | several tasks, large spec, or stakeholders asked for a deck — then the Scope & planned work slide shows each task's rank                                             | stakeholder handoff     |

**Spec-hub coupling (UI tasks):** the mockup and design-spec are companions of the interaction-intent owner the native profile or local contract declares; link them where the contract has a carrier (fallback: §6 surface and `design_spec:` / `mockup:` frontmatter). If the native spec has no interaction section or link carrier, keep the separate design spec and flag the missing relationship — never invent a numbered section.

**Reuse handoffs (same as `workflow-initiative-to-task`):** `$work-item --mode=challenge --reuse=task-review` and `$work-item --mode=dor --reuse=task-review` consume the `$work-item --mode=review --type=task` report only while the task is unchanged. Drop the flag after any task edit; standalone runs evaluate every check. `$design-spec` reuses the mockup's Journey Report.

## Outputs

Paths are relative to the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

**Work records:** Task and story files are work records owned by `$task-track`. Child skills write them in the shape of [Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors) (`status: draft`, no assignee, an `id` no other record uses) and offer tracking once after each save. Only record files live in `tasks/` and `tasks/stories/`. A review, challenge or DoR PASS is evidence only: this workflow never sets a record ready, assigns it or accepts it; the person records that through `$task-track --mode=lifecycle`.

- `tasks/{date}-task-{slug}.md` per task — native ID citations, `file:section` evidence, GIVEN/WHEN/THEN AC, effort points and complexity, dependencies (`must-before` / `can-parallel` / `blocked-by` / `independent`), priority input, test/evidence needs mapped to the declared carrier, domain impact, enabling-task references, Releasable Outcome Gate evidence (actor, outcome, journey, visible/persisted truth, access/failure/recovery, non-goals), UI inventory or no-UI reason, and `priority` frontmatter.
- `tasks/{slug}-mockup.html` and `design-specs/{date}-designspec-{slug}.md` per UI task.
- `backlog/spec-to-task-{date}-backlog.md` — rank and recommended order, dependency graph, first-do/blocked/defer groups, enabling work ordered with the tasks it enables, RICE or MoSCoW rationale, DoR status per task, open questions.
- The `$feature-presentation` deck when it runs, and `tmp/reports/spec-to-task-{date}-{bucket}.md` with the coverage matrix and unresolved questions.

## Orchestration, Memory & Fix Path

- **Orchestration:** choose inline/delegated work, batching and order through the Step Execution Protocol at equal quality. Use Triage's scale bands; each 10+ capability batch gets a report section. Preserve dependencies: freshness and clarification precede decomposition; a task exists before it is reviewed; `$prioritize` runs once after every task loop finishes; `$docs-manager --mode=update` follows it; gates awaiting user answers are never parallelized; `$workflow-end` runs last. When `$prioritize` changes a rank after a mockup was built, refresh the mockup's priority badge.
- **Memory:** keep one todo per selected step per capability group. Write `tmp/reports/spec-to-task-{date}-{bucket}.md` first and append per capability/feature; after compaction re-read it and the todo list (the current task list). Write task records immediately; sub-agent briefs require report writing first.
- **Fix path:** findings are validated before fixing; fix in the owning artifact (`$work-item --mode=refine` for the task, `$work-item --mode=story` for stories, `$spec [mode=update]` for confirmed spec changes) and re-run the reviewer that raised it.
- **Loop bounds:** round 1 zero open findings (LOW deferral), or round 2 zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 3 review rounds; on no progress escalate via `ask user question tool`.

---

**IMPORTANT MANDATORY Steps:** $investigate -> $spec [mode=index] -> $domain-analysis -> $why-review -> $spec [mode=clarify] -> $scenario -> $plan -> $plan --mode=validate -> $work-item --mode=refine -> $work-item --mode=review --type=task -> $work-item --mode=story -> $work-item --mode=review --type=story -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=dor --reuse=task-review -> $work-item --mode=mockup -> $design-spec -> $prioritize -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `$start-workflow` → Step Execution Protocol — `gate` steps (`spec [mode=clarify]`, `work-item --mode=review --type=task`, `work-item --mode=dor`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `$start-workflow workflow-spec-to-task` and the user's prompt as context.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert existing canonical specs into complete, dependency-ordered, prioritized, readiness-checked planned tasks and stories — no implementation — with depth proportional to the spec's size and risk.

**MUST ATTENTION Main steps:** Triage/profile → investigate/freshness → domain/rationale → clarify → scenario/plan/validate → refine/review → stories/review → independent challenge/DoR → UI mockup/design-spec → prioritize → docs sync → deck → close/wrap-up. Triage selects optional work; gates remain fixed.

- **MUST ATTENTION** triage first (scale · kinds · freshness · `isLargeIdea`) and record it; skip domain analysis, scenario and the plan cycle only with logged evidence.
- **MUST ATTENTION** keep every gate: coverage matrix, `spec [mode=clarify]`, releasable outcome + M7, `work-item --mode=review --type=task`, independent `work-item --mode=challenge`, `work-item --mode=dor`, UI full-flow mock app + design-spec, priority written into every task's frontmatter, `docs-manager --mode=update`, `workflow-end`.
- **MUST ATTENTION** carry native IDs as the citation spine; never mint IDs, invent sections or emit a standalone technical task.
- **MUST ATTENTION** large specs carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one todo per selected step, report file first and appended per capability; tech-agnostic prose.

| Evasion | Required action |
| --- | --- |
| "Small spec, skip gates" | Scale depth; preserve clarification, reviews, challenge, DoR, sync and closure. |
| "Technical setup is a task" | Attach enabling work to an independently releasable actor-facing outcome. |
