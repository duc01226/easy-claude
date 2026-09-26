---
name: workflow-architecture-audit
version: 1.0.0
description: "[Workflow] Use when auditing the whole project's architecture, running an architecture health check, or checking production readiness — read-only, one consolidated health report."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Audit a project's architecture, scalability and production readiness without changing code, and deliver ONE consolidated Architecture Health Report: three sub-scores, one worst-case combined verdict, and the merged advisory Technique Applicability and Scenario Stress matrices. Every validated finding is routed to a follow-up owner.

**Use it when** someone asks for an architecture health check, a production-readiness verdict, or a scalability/coupling audit across a project or a named part of it. **Use a sibling instead** for a single-change compliance check (`/architecture-review`), a one-off consolidated report with no run closure (`/architecture-review-full` standalone), or a review of a change set (`workflow-review-changes`).

**IMPORTANT MANDATORY Steps:** /investigate -> /architecture-review-full -> /why-review -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-architecture-audit`, passing the user's prompt as context.

## Scope & Size Triage (first action)

Classify the target before choosing depth, and record the result at the top of the workflow report. Size bands guide depth; escalate on risk and ambiguity, not on file count alone.

| Axis                  | Values                                                                             | Effect                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                 | whole project · current diff · specific path · greenfield foundation (`mode=init`) | Passed to `architecture-review-full` scope resolution; ask only when the prompt names none.                                                                                                                                                   |
| Size (files in scope) | **XS** 1–3 · **S** ≤15 · **M** ≤60 · **L** ≤300 · **XL** >300                      | XS/S with a pinned scope: `/investigate` has no work to do, keep child briefs narrow. M: defaults. L/XL: `/investigate` maps modules and hotspots first; the reviewers batch per module (`systematic-review-batching`), one report per batch. |
| Risk                  | production-critical path · data integrity · security/PII · multi-service seams     | Raise depth: full-scope reviewers, explicit cross-service seam checks, and name specialist follow-ups (`/security-review`, `/performance-review`) in the handoff.                                                                             |

## Required Quality Gates

Each gate must hold, with its evidence, before `/workflow-end` closes the run.

| Gate                                              | Evidence that proves it                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consolidated report finished (`review-converged`) | The `architecture-review-full` report at status `FINISHED`: `Faces merged: 3/3`, three sub-scores, the worst-case combined verdict, the merged advisory matrices, and its Why-Review Fix Notes or Validation section.                                                        |
| Report validated at report level                  | The workflow-level `/why-review` record over the FINISHED report: scope (nothing in-scope missed, nothing out-of-scope pulled in), verdict rollup, dedup completeness, cross-face severity consistency. When it demotes or restores a finding, the report is fixed in place. |
| Evidence bar                                      | Every finding carries `file:line` proof and a confidence; findings below 60% are flagged and never recommended.                                                                                                                                                              |
| Read-only                                         | This workflow edits no source or config. Every validated finding names its follow-up owner: `/plan` for large or cross-module fixes, a feature or refactor workflow otherwise.                                                                                               |
| Advisory stays advisory                           | The technique and scenario matrices and any coverage gaps never change a sub-score, the combined verdict, or a gate.                                                                                                                                                         |
| Docs truthful (when applicable)                   | When the audit finds project docs contradicting the code, `/docs-update` ran and its non-trivial doc diff received its own `/why-review`.                                                                                                                                    |
| Run closed (`run-closed`)                         | `/workflow-end` ran last.                                                                                                                                                                                                                                                    |

## Recommended Skills

| Skill                       | Role     | When it earns its cost                                                                                                                                                                                                                                                                                                                                                                                | Proves / feeds                                                                                                                                                                                                          |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/investigate`              | optional | The prompt does not pin the audit scope to an explicit path or the current diff, or the scope is medium or larger (more than about 15 files) so modules, boundaries and hotspots must be mapped before the reviewers fan out. Skip reason: The prompt pins a small audit scope to an explicit path or the current diff, so architecture-review-full resolves the scope itself without a separate map. | Scope map for the engine and for the final scope check.                                                                                                                                                                 |
| `/architecture-review-full` | gate     | Always.                                                                                                                                                                                                                                                                                                                                                                                               | Three non-overlapping faces (`architecture-scalability-review`, `architecture-review`, `production-readiness-review`), progressive dedup synthesis, per-face `/why-review` fix, finalized verdict → `review-converged`. |
| `/why-review`               | gate     | Always, after the report is `FINISHED`.                                                                                                                                                                                                                                                                                                                                                               | Report-level validation. The engine skips its own Step 5 on a zero-finding PASS, so this step is the one validation every run gets.                                                                                     |
| `/docs-update`              | optional | The validated audit found project documentation (reference docs, project config, README, ADR status) that contradicts the audited code. Skip reason: The validated audit found no project documentation contradicting the audited code, and a read-only audit leaves no diff for docs-update to sync.                                                                                                 | Docs truthful.                                                                                                                                                                                                          |
| `/workflow-end`             | gate     | Always, last.                                                                                                                                                                                                                                                                                                                                                                                         | `run-closed`.                                                                                                                                                                                                           |
| `/watzup`                   | core     | Always.                                                                                                                                                                                                                                                                                                                                                                                               | Handoff: verdict, sub-scores, follow-up owners per finding.                                                                                                                                                             |

## Orchestration

You choose inline vs sub-agent, batching and ordering to minimize wall-clock and tokens at equal quality. The registry `stepMeta` defaults (`/investigate` and `/docs-update` as sub-agents, the engine and `/why-review` inline) are starting points.

Fixed constraints:

- `architecture-review-full` runs INLINE in the main session, because it spawns the three reviewers and a sub-agent cannot fan out further. Parallelism lives inside it (fan-out plus all-return barrier), so this workflow declares no workflow-level parallel groups.
- `/why-review` runs only on the `FINISHED` report. `/docs-update` runs after `/why-review`. `/workflow-end` runs last.

Recommended: on XS/S targets, run `/investigate` inline or let the engine's scope step cover it. On L/XL targets, hand the engine a module partition so each reviewer works in bounded batches.

## Memory & Reporting

- Create one task per selected step. The engine pre-expands its own phases under the parent row (`nested-task-creation`).
- Create the workflow report FIRST at `tmp/reports/workflow-architecture-audit-{YYMMDD}-{HHmm}-{slug}.md`: triage, per-step evidence, deviations, and the path of the engine's consolidated report (`tmp/reports/architecture-full-review-{date}-{slug}.md`). Append after each step.
- Sub-agent briefs make report writing their first deliverable and return only the `subagent-return-contract` envelope.
- After compaction, re-read `TaskList`, the workflow report, and the consolidated report's status line before continuing.

## Findings & Fix Path

- No source fixes happen in this workflow. The only artifact that gets fixed is the report itself: the engine's own merged review of all faces, then the workflow-level `/why-review` at report level.
- A finding counts as validated only when it survived `/why-review` with evidence. Route each one to its owner in the handoff, with severity and confidence: `/plan` (then `/plan-review`) when the fix set is large, cross-module or ambiguous, a feature or refactor workflow for a bounded fix.
- Loop bounds for the report-level `/why-review`: round 1 exits on zero findings; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, with LOWs deferred and listed; cap 2 rounds (+1 when a validated CRITICAL/HIGH is still open); escalate via `AskUserQuestion` when a round makes no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a read-only audit that ends with ONE `FINISHED` Architecture Health Report (three sub-scores, worst-case combined verdict, advisory matrices), validated at report level by `/why-review`, with every validated finding routed to a follow-up owner.

- **MUST ATTENTION** triage scope, size and risk FIRST and record them. Depth follows the triage: a small pinned scope does not need a separate `/investigate` map, and L/XL targets batch per module.
- **MUST ATTENTION** run `architecture-review-full` INLINE (it owns the fan-out and the all-return barrier), then the `/why-review` gate over the `FINISHED` report. Every finding carries `file:line` proof and a confidence.
- **NEVER** apply source fixes in this workflow. Route each validated finding to `/plan` or a feature/refactor workflow; the advisory matrices never move a score or the verdict.
- **MUST ATTENTION** write the workflow report first, append per step, and re-read it with `TaskList` after compaction. `/workflow-end` runs last.

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Critical Thinking · AI Mistake Prevention · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
