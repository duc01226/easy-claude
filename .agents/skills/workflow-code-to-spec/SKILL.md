---
name: workflow-code-to-spec
description: '[Workflow] Use when authoring or maintaining the configured canonical feature/spec artifact from existing code, keeping its native contract, implementation, and tests in sync. For idea-to-spec use workflow-idea-to-spec.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** keep ONE canonical spec per capability in agreement with the implementation and its test evidence — author it from existing code (`init-full`), re-sync it after code or requirement changes (`update`, default), or report its staleness (`audit`). Code stays the technical source of truth; the spec owns requirements and behavior. **MUST ATTENTION** create only project-declared derived aids (index, ERD) — never a parallel spec tree.

**Use it when** specs must be written from or reconciled with code: first-time specs for a capability or bucket, after significant code changes, onboarding/compliance handoff, before a migration, or a periodic health audit. **Use a sibling instead when:** no code exists yet → `workflow-idea-to-spec`; one small spec edit → `$spec` or `workflow-feature-spec`; post-change sync inside a delivery run → `workflow-spec-sync`; only a derived index/ERD → `$spec-index`.

**IMPORTANT MANDATORY Steps:** $investigate -> $plan -> $plan-review -> $plan-validate -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $artifact-review -> $docs-update -> $workflow-end -> $watzup

That line is the `init-full` preview. Each mode resolves its own manifest (fingerprint + occurrence IDs) through `$start-workflow` before any task is created:

| Mode        | When                                             | Recommended sequence (**gate** in bold)                                                                                                                                                       |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | no canonical spec exists for the target scope    | investigate → plan → plan-review* → plan-validate* → spec [mode=init] → spec [mode=tests] → artifact-review --type=spec-tests → **artifact-review** → docs-update → **workflow-end** → watzup |
| `update`    | code changed, new requirement or PBI             | **workflow-review-changes** → spec [mode=update] → spec [mode=tests]_ → **artifact-review --type=spec-tests** → spec [mode=sync]_ → docs-update → **workflow-end** → watzup                   |
| `audit`     | freshness check before a release or on a cadence | investigate → spec [mode=audit] → **artifact-review** → docs-update → **workflow-end** → watzup                                                                                               |

`*` = optional; its registry `applicability` states when it runs.

## 1. Step 0 — Mode and Scope (MANDATORY FIRST)

Resolve the configured business spec root and artifact contract, then suggest a mode: no current spec for the target → `init-full`; a diff touches an already-specified capability → `update`; an explicit audit/freshness request → `audit`. Map changed code to its capability owner through the App Bucket Mapping in the local `spec-system-reference.md` (reference-docs root from `docsRoots.projectReference.path`). **BLOCKING:** confirm mode, capability names and target paths by asking the user directly before any other action.

## 2. Triage (sets depth, recorded in the run report)

| Scope                                   | Signal                                | Strategy                                                                                                       |
| --------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Single capability** (XS/S)            | one feature or one diff               | inline; short plan; plan-review/plan-validate only when naming or ownership is ambiguous                       |
| **Single bucket** (M)                   | one module/service, 2–10 capabilities | plan one task per capability; 4–10 capabilities → one `spec` sub-agent per capability in ONE message           |
| **Multi-bucket / whole project** (L/XL) | "all specs", several buckets          | Coverage Ledger (below); groups of at most 10 capabilities per run, run sequentially across resumable sessions |

Split by independently nameable capabilities, never by line count; apply the native profile's cardinality rule (the `>40` cases heuristic is portable-default only). Update-mode kinds: purely cosmetic change (styling, comments, config) → no case/evidence change; behavior or contract change → cases reconciled; user-facing behavior → interaction-intent refresh.

**Coverage Ledger (BLOCKING for multi-bucket/whole-project).** Enumerate every bucket × capability found by investigate, then write `tmp/reports/code-to-spec-coverage-{date}.md` with one row per capability: owner · capability · canonical spec path · intent · contracts · test/evidence coverage · chain trace · status (NOT STARTED → IN PROGRESS → SPEC DONE → REVIEWED). Update the row after each capability. **Resume rule:** after compaction or a new session read the ledger and the current task list FIRST, re-enumerate the business spec root, continue from the first non-REVIEWED row — never re-author a done capability, never re-run investigate or plan for enumerated buckets.

## 3. Required Quality Gates (non-negotiable)

| Gate                                                          | Evidence that proves it                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved**                                 | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md` before any author/update/audit step. A malformed or conflicting contract is BLOCKED. |
| **Full vertical chain traced**                                | Per capability: UI view/action → API → handler → domain rule → event → consumer/read model → UI outcome, reconciled by the `$spec [mode=init]` chain-reconciliation step — no orphan UI, no orphan operation, event and read-side closure. A BROKEN chain is a spec finding, never silently dropped.                            |
| **Three-way sync** (`spec-synced`, modes that write the spec) | Native intent/contract/acceptance roles ↔ configured cases/evidence ↔ executing test code agree; follow the local `spec-system-reference.md`, including its STATE MACHINE DATA ASSERT mandate. Each case names its **Business Intent / Invariant Guarded**, links to executing proof, and would fail if that intent broke.      |
| **Spec review converged** (`review-converged`)                | `$artifact-review` (and `--type=spec-tests` in update mode) including the BLOCKING **M1-M7** gate: zero `[UNVERIFIED]` without an exclusion reason, complete role/evidence coverage, tech-term checks only on designated intent roles.                                                                                          |
| **Change review** (update mode)                               | `$workflow-review-changes` converged, run INLINE in the main session; its output is the impact map for the spec update.                                                                                                                                                                                                         |
| **Coverage complete** (multi-bucket)                          | Every ledger row REVIEWED or carrying a recorded deferral reason; `$watzup` reports `{reviewed}/{total}` capabilities.                                                                                                                                                                                                          |
| **Goal satisfied**                                            | Resolve the active Goal Contract at start (active plan `goal.md`, else a new goal under the plans root); append per-cycle evidence to its Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `$workflow-end`.                                                                                          |
| **Run closed** (`run-closed`)                                 | `$docs-update` ran as the near-final sync (sub-phases skipped only with a stated reason), then `$workflow-end` checked every outcome gate.                                                                                                                                                                                      |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers. Keep designated intent roles tech-agnostic; keep permitted technical detail in contract/evidence roles; mark unknown claims `[UNVERIFIED]`, never blank. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the mandatory inline §5 Mermaid ERD and §6.2–§6.5 for UI-bearing features, Section 8 `TC-{FEATURE}-{NNN}` cases with GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Missing or unmapped coverage is BLOCKED/UNKNOWN, never NOT-APPLICABLE or PASS.

## 4. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                                                                                         | Proves / feeds                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `$investigate`                                            | init-full and audit — capability registry, entry points, both UI and backend ends in scope (audit: lightweight)                                                                                                             | ledger denominator, chain scope                                               |
| `$plan` → `$plan-review` → `$plan-validate`               | init-full: plan always (one task per capability, core domain first); review for 4+ capabilities, multi-bucket, or an ambiguous split; validate when capability list, split or ownership was not already confirmed at Step 0 | per-capability task list (the current task list count ≥ capability count before authoring) |
| `$spec [mode=init\|update\|audit]`                        | always for the selected mode; update touches only impacted roles                                                                                                                                                            | spec-synced gate                                                              |
| `$spec [mode=tests]`                                      | behavior or contract changed (always in init-full); check existing IDs and never overwrite tested evidence                                                                                                                  | three-way sync                                                                |
| `$artifact-review --type=spec-tests` · `$artifact-review` | per mode as declared; depth scales with case count                                                                                                                                                                          | review-converged gate                                                         |
| `$spec [mode=sync]`                                       | case/evidence links or declared derived outputs changed                                                                                                                                                                     | derived indexes current                                                       |
| `$spec-index`                                             | the project maintains a derived index/ERD for the bucket and it lags                                                                                                                                                        | derived aids                                                                  |
| `$dor-gate` · `$pbi-mockup`                               | update from a new PBI being made implementation-ready (mockup only for UI/journey changes)                                                                                                                                  | planned cases become guidance, not verified spec                              |
| `$docs-update` → `$workflow-end` → `$watzup`              | always, last                                                                                                                                                                                                                | run-closed gate + handoff                                                     |

**UI intent (conditional):** when changed code carries user-facing behavior, refresh the interaction-intent owner the profile declares and link its design-spec/mockup where the contract expects it (portable form: §6 View Inventory, Key UI States, per-story click-path with `US-`/`OP-`/`BR-` references). A profile with no UX owner → surface the gap; never invent a section.

**New PBI / requirement update:** map requirement → domain entities → capabilities; record planned intent in native roles with the profile's planned-state convention; add planned cases in the native carrier; review them with `$artifact-review --type=spec-tests`. They are implementation guidance, not verified spec.

## 5. Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: investigate and plan precede authoring; a spec exists before it is reviewed; cases exist before their review; `$workflow-review-changes` runs inline in the main session; `$docs-update` runs after review fixes and before `$workflow-end`, which runs last. Recommended for 4+ capabilities: investigate + plan in the main context → spawn `spec` sub-agents (one per capability) in ONE message → barrier → `spec [mode=tests]` sub-agents in ONE message → main context assembles and reviews. Each brief carries capability name + bucket, output path, the resolved profile and its prose/evidence rules, the SYNC protocols (critical thinking, evidence, incremental persistence, cross-scope boundary), and "write each section immediately"; no sub-agent handles more than 3 capabilities.

## 6. Memory, Reporting and Fix Path

- One task per selected step and per capability; write the run report under `tmp/reports/` FIRST and append per section — never hold findings in memory.
- Findings are validated before fixing; fix only validated gaps that block the current round, in the owning spec role, then restart the full artifact-review pass. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; binary gates always block; cap 2 rounds (+1 when a CRITICAL/HIGH stays open); escalate by asking the user directly on no progress.
- **Spec-loop discipline:** derive property cases with boundary counter-cases for every hard invariant; protected core logic uses the mutation-score gate, not line coverage; feed uncovered behavior into both spec and tests through a dual-feedback ledger until no new gap or hidden rule remains.
- **Audit output:** `tmp/reports/spec-audit-{date}-{Bucket}.md` — stale capabilities/roles, stale coverage %, priority order; `$watzup` recommends an `update` run scoped to the stale capabilities.
<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
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

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `$start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

**IMPORTANT MUST ATTENTION Goal:** one canonical spec per capability in three-way agreement with the implementation and its test evidence, through the confirmed `init-full`, `update` or `audit` mode; derive only declared aids.

- **[BLOCKING]** Step 0 FIRST — confirm mode, capabilities and target paths by asking the user directly; then triage by capability count and breadth; multi-bucket scope keeps the Coverage Ledger and clears the completeness gate (`{reviewed}/{total}`) before `$workflow-end`.
- **[BLOCKING]** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **[BLOCKING]** trace the FULL vertical chain per capability and reconcile it; `$artifact-review` converges with the M1-M7 gate; update mode runs `$workflow-review-changes` inline in the main session; `$docs-update` precedes `$workflow-end`.
- **[BLOCKING]** 4+ capabilities → one `spec` sub-agent per capability, all spawned in ONE message; after compaction read the ledger and the current task list first and never re-author a done capability.
- **MUST ATTENTION** resolve the active Goal Contract at start and emit the Goal Satisfaction matrix before close; every case names the business intent it guards.

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
