---
name: workflow-seed-test-data
version: 1.1.0
description: '[Workflow] Use when seeding test data or implementing idempotent QC happy-path seeders.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Add or extend idempotent, command-based seeders that create realistic QC happy-path data for a feature area — environment-gated, count-configurable, restart-safe — proven by tests that ran green in this run, a converged review and, when the data is observable, an inspection of the seeded state itself.

**Use this** for seeders, dev/QC dummy data and realistic first-init data. Use `/seed-test-data --mode=review` alone for a read-only seeder audit, and `workflow-write-integration-test` / `workflow-e2e` when the deliverable is a test rather than seeded data.

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /code-simplifier -> /test -> /changes-review -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Read Project Config Gate:** before writing any seeder code, read the seeder context group in `docs/project-config.json` (for example `Data Seeders`) and `seed-test-data-reference.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` overrides). A seeder written without the project's base class, env-gate key, count key and DI scope pattern is wrong by construction.

## Size & Kind Triage (FIRST action)

Classify before choosing steps and record the result in the run report:

- **Size** — XS: enhance one existing seeder (count, one scenario; 1–3 files) · S: new seeder for one feature area · M: several feature areas or seeders · L/XL: seeding across modules/services with a dependency chain of pre-existing data.
- **Kind** — new / enhance / fix seeder · observable data (a QC/operator sees it through an app, API, CLI or artifact) · cross-module or cross-service commands · seeder that encodes a domain rule (a required precondition, status or relationship).
- **Risk** — escalate on anything that could run outside development, shared or persistent environments, cross-service data ownership, or ambiguous target counts.

The triage selects which recommended skills run and how deep; it never removes a gate.

## Required Quality Gates (non-negotiable)

| Gate                                                                                           | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seeder invariants                                                                              | `file:line` proof for each: (1) environment gate is the FIRST check — development or config-enabled only, never production; (2) count read from the configured key, never hardcoded (small default; zero → no-op); (3) idempotent — count existing BEFORE seeding and loop from `existing_count` to `target_count`, never from `0` (restart-safe); (4) domain entities written only through application-layer commands, never direct repository/DB writes, never duplicated command logic; (5) the project's scoped DI mechanism per iteration, never one scope across iterations |
| `tests-pass`                                                                                   | `/test` ran green in THIS run against the final (post-simplification) seeder code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `review-converged`                                                                             | `/changes-review` over the final diff: validated blocking findings fixed and the fixed state re-reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Seeded data observed (when observable)                                                         | `/experience-review` record over the seeded state: `OBSERVED` / `JUDGED` / `HUMAN-ACCEPTED` / `UNVERIFIED` / `ENVIRONMENT-BLOCKED` / `NOT-APPLICABLE`; a seeder exit code is not evidence                                                                                                                                                                                                                                                                                                                                                                                         |
| Spec/docs synced (when a seeder encodes a domain rule or changes documented dev-data coverage) | The rule lands in the spec (and in tests where testable), never as a seeder-only fix; `/docs-update` triage result                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `run-closed`                                                                                   | `/workflow-end` (top-level only) verifies every gate above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Recommended Skills

| Skill                              | Earns its cost when                                                                                             | Proves / feeds                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/investigate`                     | Always useful; XS enhancement of a seeder already traced this session may fold into `/seed-test-data` discovery | Target seeder path (or "none — create new"), 3+ sibling seeders, command signatures, required inputs, validation, side effects, pre-existing data chain |
| `/seed-test-data`                  | Always — it makes the change                                                                                    | Seeder invariants                                                                                                                                       |
| `/experience-review` (conditional) | The seeded data reaches a configured or likely observable surface                                               | Seeded data observed                                                                                                                                    |
| `/code-simplifier`                 | The seeder diff has duplication or scaffolding worth removing; XS single-scenario edits may do no real work     | Behavior-preserving cleanup before the checks that prove it                                                                                             |
| `/test` (gate)                     | Always                                                                                                          | `tests-pass`                                                                                                                                            |
| `/changes-review` (gate)           | Always                                                                                                          | `review-converged`, seeder-invariant compliance                                                                                                         |
| `/docs-update`                     | A seeder adds config keys, changes dev-data coverage materially, or encodes a domain rule                       | Spec/docs synced                                                                                                                                        |
| `/workflow-end` + `/watzup`        | Always (top-level run)                                                                                          | `run-closed`, handoff summary                                                                                                                           |

Skipping a recommended skill is fine when triage shows it does no real work; log it as a deviation (`intent-skip` / `when-false`) with evidence.

**Conditional step note — `/experience-review`** runs when: the seeded data reaches a configured `experienceVerification` surface whose `reviewOn` trigger intersects the change, or the seeder creates or changes data a QC/operator actually observes through a running application, API, CLI, or generated artifact; when the latter holds without usable configuration, run the skill and record `ENVIRONMENT-BLOCKED` — never invent a runner. A relevant surface that cannot be run or inspected is `ENVIRONMENT-BLOCKED`, never PASS. Skip reason (registry, verbatim): After inspecting docs/project-config.json and the seeder diff, no configured or likely observable surface consumes the seeded data; record NOT-APPLICABLE with evidence citing the inspected paths.

It sits before `/changes-review` because a seeder's deliverable is observed data: the review proves the seeder obeys the rules, the inspection proves the scenarios are the ones QC needs. It runs its own bounded remediation loop (`--rounds=N`, default 3), never rewrites an expectation or acceptance criterion to close a gap, and reports unresolved defects at the cap as `NOT-CONVERGED`, routed back to `/seed-test-data`.

## Orchestration Freedom

You choose inline vs sub-agent, batching and ordering, optimizing wall-clock and token cost at equal quality. Fixed constraints only: the seeder exists before it is observed, tested or reviewed; `/code-simplifier` runs before the `/test` and `/changes-review` that prove the final code; fixes are re-verified after they land; `/workflow-end` runs last; gates awaiting user approval never run in parallel. Recommended: XS/S inline; M+ one seeder or feature area per batch with one report per batch, ordered by the data dependency chain (prerequisite data first).

## Memory & Reporting

- One task per selected step (and per seeder batch for M+) so nothing is lost after compaction.
- Write the run report under `tmp/reports/` FIRST and append per step and batch; re-read it and `TaskList` after compaction.
- Sub-agent briefs carry the resolved config/reference paths, make report writing their first deliverable, and return only the summary envelope.

## Fix Path & Loop Bounds

Validate each finding (evidence-backed, reproducible) before fixing. A failing test follows the test-investigation protocol before either side changes. Fix at the owning layer: a seeder that violates an invariant is fixed in the seeder; a command that rejects valid inputs or breaks a domain rule is a product defect — trace its root cause and route it, never work around it in the seeder. Re-run the test or reviewer that raised the finding, plus a holistic pass when fixes were non-trivial. Plan ceremony (`/plan` → `/plan-review`) only when the fix set is large, cross-module or ambiguous.

Review loop: round 1 zero findings converges; round 2 converges on zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 2 rounds (+1 while a CRITICAL/HIGH is open); failing tests are uncapped; no progress → escalate via `AskUserQuestion`.
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

**IMPORTANT MUST ATTENTION Goal:** idempotent, command-based QC happy-path seeders for a feature area, proven by green tests, a converged review and — when observable — an inspection of the seeded data.

- **MUST ATTENTION** read the project-config seeder context group and `seed-test-data-reference.md` BEFORE writing any seeder code; match the project's existing seeder convention exactly.
- **MUST ATTENTION** environment gate FIRST; count from config; loop from `existing_count` to `target_count`, never from `0`; scoped DI per iteration.
- **MUST ATTENTION** NEVER write domain entities through a repository/DB directly — application-layer commands only; a domain rule a seeder encodes belongs in the spec.
- **MUST ATTENTION** a seeder exit code is not evidence — run `/experience-review` when the data is observable, record `ENVIRONMENT-BLOCKED` (never PASS) when it cannot be inspected, and skip only with an evidence-backed `NOT-APPLICABLE`.
- **MUST ATTENTION** triage first, write the report under `tmp/reports/` first, keep one task per selected step; `/test` and `/changes-review` always run on the final code and `/workflow-end` runs last.
