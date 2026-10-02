---
name: workflow-code-to-spec
description: '[Workflow] Use when authoring or maintaining the canonical feature/spec artifact from existing code, keeping contract, implementation and tests in sync. Idea-to-spec: workflow-idea-to-spec.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** keep ONE canonical spec per capability in agreement with the implementation and its test evidence — author it from existing code (`init-full`), re-sync it after code or requirement changes (`update`, default), or report its staleness (`audit`). Code stays the technical source of truth; the spec owns requirements and behavior. **MUST ATTENTION** create only project-declared derived aids (index, ERD) — never a parallel spec tree.

**Use it when** specs must be written from or reconciled with code: first-time specs for a capability or bucket, after significant code changes, onboarding/compliance handoff, before a migration, or a periodic health audit. **Use a sibling instead when:** no code exists yet → `workflow-idea-to-spec`; one small spec edit → `$spec` or `workflow-feature-spec`; post-change sync inside a delivery run → `workflow-spec-sync`; only a derived index/ERD → `$spec [mode=index]`.

**IMPORTANT MANDATORY Steps:** $investigate -> $plan -> $plan --mode=validate -> $spec -> $spec [mode=tests] -> $pbi --mode=review --type=spec-tests -> $pbi --mode=review -> $docs-manager --mode=update -> $workflow-end -> $watzup

That line is the `init-full` preview. Each mode resolves its own manifest (fingerprint + occurrence IDs) through `$start-workflow` before any task is created:

| Mode        | When                                             | Recommended sequence (**gate** in bold)                                                                                                                                                       |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | no canonical spec exists for the target scope    | investigate → plan → plan --mode=validate* → spec [mode=init] → spec [mode=tests] → pbi --mode=review --type=spec-tests → **pbi --mode=review** → docs-manager --mode=update → **workflow-end** → watzup |
| `update`    | code changed, new requirement or PBI             | **workflow-review-changes** → spec [mode=update] → spec [mode=tests]_ → **pbi --mode=review --type=spec-tests** → spec [mode=sync]_ → docs-manager --mode=update → **workflow-end** → watzup                   |
| `audit`     | freshness check before a release or on a cadence | investigate → spec [mode=audit] → **pbi --mode=review** → docs-manager --mode=update → **workflow-end** → watzup                                                                                               |

`*` = optional; its registry `applicability` states when it runs.

## 1. Step 0 — Mode and Scope (MANDATORY FIRST)

Resolve the configured business spec root and artifact contract, then suggest a mode: no current spec for the target → `init-full`; a diff touches an already-specified capability → `update`; an explicit audit/freshness request → `audit`. Map changed code to its capability owner through the App Bucket Mapping in the local `spec-system-reference.md` (reference-docs root from `docsRoots.projectReference.path`). **BLOCKING:** confirm mode, capability names and target paths by asking the user directly before any other action.

## 2. Triage (sets depth, recorded in the run report)

| Scope                                   | Signal                                | Strategy                                                                                                       |
| --------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Single capability** (XS/S)            | one feature or one diff               | inline; short plan; plan --mode=validate only when naming or ownership is ambiguous                                   |
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
| **Spec review converged** (`review-converged`)                | `$pbi --mode=review` (and `--type=spec-tests` in update mode) including the BLOCKING **M1-M7** gate: zero `[UNVERIFIED]` without an exclusion reason, complete role/evidence coverage, tech-term checks only on designated intent roles.                                                                                          |
| **Change review** (update mode)                               | `$workflow-review-changes` converged, run INLINE in the main session; its output is the impact map for the spec update.                                                                                                                                                                                                         |
| **Coverage complete** (multi-bucket)                          | Every ledger row REVIEWED or carrying a recorded deferral reason; `$watzup` reports `{reviewed}/{total}` capabilities.                                                                                                                                                                                                          |
| **Goal satisfied**                                            | Resolve the active Goal Contract at start (active plan `goal.md`, else a new goal under the plans root); append per-cycle evidence to its Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `$workflow-end`.                                                                                          |
| **Run closed** (`run-closed`)                                 | `$docs-manager --mode=update` ran as the near-final sync (sub-phases skipped only with a stated reason), then `$workflow-end` checked every outcome gate.                                                                                                                                                                                      |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers. Keep designated intent roles tech-agnostic; keep permitted technical detail in contract/evidence roles; mark unknown claims `[UNVERIFIED]`, never blank. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the mandatory inline §5 Mermaid ERD and §6.2–§6.5 for UI-bearing features, Section 8 `TC-{FEATURE}-{NNN}` cases with GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Missing or unmapped coverage is BLOCKED/UNKNOWN, never NOT-APPLICABLE or PASS.

## 4. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                                                                                         | Proves / feeds                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `$investigate`                                            | init-full and audit — capability registry, entry points, both UI and backend ends in scope (audit: lightweight)                                                                                                             | ledger denominator, chain scope                                               |
| `$plan` → `$plan --mode=validate`                                | init-full: plan always (one task per capability, core domain first); validate when capability list, split or ownership was not already confirmed at Step 0                                      | per-capability task list (the current task list count ≥ capability count before authoring) |
| `$spec [mode=init\|update\|audit]`                        | always for the selected mode; update touches only impacted roles                                                                                                                                                            | spec-synced gate                                                              |
| `$spec [mode=tests]`                                      | behavior or contract changed (always in init-full); check existing IDs and never overwrite tested evidence                                                                                                                  | three-way sync                                                                |
| `$pbi --mode=review --type=spec-tests` · `$pbi --mode=review` | per mode as declared; depth scales with case count                                                                                                                                                                          | review-converged gate                                                         |
| `$spec [mode=sync]`                                       | case/evidence links or declared derived outputs changed                                                                                                                                                                     | derived indexes current                                                       |
| `$spec [mode=index]`                                             | the project maintains a derived index/ERD for the bucket and it lags                                                                                                                                                        | derived aids                                                                  |
| `$pbi --mode=dor` · `$pbi --mode=mockup`                               | update from a new PBI being made implementation-ready (mockup only for UI/journey changes)                                                                                                                                  | planned cases become guidance, not verified spec                              |
| `$docs-manager --mode=update` → `$workflow-end` → `$watzup`              | always, last                                                                                                                                                                                                                | run-closed gate + handoff                                                     |

**UI intent (conditional):** when changed code carries user-facing behavior, refresh the interaction-intent owner the profile declares and link its design-spec/mockup where the contract expects it (portable form: §6 View Inventory, Key UI States, per-story click-path with `US-`/`OP-`/`BR-` references). A profile with no UX owner → surface the gap; never invent a section.

**New PBI / requirement update:** map requirement → domain entities → capabilities; record planned intent in native roles with the profile's planned-state convention; add planned cases in the native carrier; review them with `$pbi --mode=review --type=spec-tests`. They are implementation guidance, not verified spec.

## 5. Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: investigate and plan precede authoring; a spec exists before it is reviewed; cases exist before their review; `$workflow-review-changes` runs inline in the main session; `$docs-manager --mode=update` runs after review fixes and before `$workflow-end`, which runs last. Recommended for 4+ capabilities: investigate + plan in the main context → spawn `spec` sub-agents (one per capability) in ONE message → barrier → `spec [mode=tests]` sub-agents in ONE message → main context assembles and reviews. Each brief carries capability name + bucket, output path, the resolved profile and its prose/evidence rules, the SYNC protocols (critical thinking, evidence, incremental persistence, cross-scope boundary), and "write each section immediately"; no sub-agent handles more than 3 capabilities.

## 6. Memory, Reporting and Fix Path

- One task per selected step and per capability; write the run report under `tmp/reports/` FIRST and append per section — never hold findings in memory.
- Findings are validated before fixing; fix only validated gaps that block the current round, in the owning spec role, then restart the full pbi --mode=review pass. Review loop: round 1 exits on zero open findings (Round-1 LOW closure); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; binary gates always block; cap 3 review rounds; escalate by asking the user directly on no progress.
- **Spec-loop discipline:** derive property cases with boundary counter-cases for every hard invariant; protected core logic uses the mutation-score gate, not line coverage; feed uncovered behavior into both spec and tests through a dual-feedback ledger until no new gap or hidden rule remains.
- **Audit output:** `tmp/reports/spec-audit-{date}-{Bucket}.md` — stale capabilities/roles, stale coverage %, priority order; `$watzup` recommends an `update` run scoped to the stale capabilities.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


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


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one canonical spec per capability in three-way agreement with the implementation and its test evidence, through the confirmed `init-full`, `update` or `audit` mode; derive only declared aids.

- **[BLOCKING]** Step 0 FIRST — confirm mode, capabilities and target paths by asking the user directly; then triage by capability count and breadth; multi-bucket scope keeps the Coverage Ledger and clears the completeness gate (`{reviewed}/{total}`) before `$workflow-end`.
- **[BLOCKING]** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **[BLOCKING]** trace the FULL vertical chain per capability and reconcile it; `$pbi --mode=review` converges with the M1-M7 gate; update mode runs `$workflow-review-changes` inline in the main session; `$docs-manager --mode=update` precedes `$workflow-end`.
- **[BLOCKING]** 4+ capabilities → one `spec` sub-agent per capability, all spawned in ONE message; after compaction read the ledger and the current task list first and never re-author a done capability.
- **MUST ATTENTION** resolve the active Goal Contract at start and emit the Goal Satisfaction matrix before close; every case names the business intent it guards.
