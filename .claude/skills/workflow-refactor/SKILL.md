---
name: workflow-refactor
version: 1.0.0
description: '[Workflow] Use when restructuring, reorganizing, or cleaning up code without changing behavior.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Restructure existing code without changing its observable behavior, proven by the same test scope green before and after the change plus a converged change review — cheap on a small local cleanup, thorough on a wide or risky restructure.

**Use this** to restructure, reorganize, rename, extract, simplify or pay down technical debt while behavior stays fixed. A change the user wants to behave differently is a feature (`workflow-feature`) or a bugfix (`workflow-bugfix`); a single trivial rename in one file fits a direct edit plus test and review.

**Key rules:**

- **MUST** triage size, kind and risk FIRST — the triage picks which recommended skills run and how deep.
- **MUST** prove behavior preservation: the affected test scope is green BEFORE any change (baseline gate) and green AFTER it (final gate); cover untested touched behavior with characterization tests first.
- **MUST** search 3+ local examples of the target pattern before planning and follow the project's architecture, code hierarchy and naming from `docs/project-config.json` → `workflowPatterns`.
- **NEVER** change an assertion or expected value to make a refactor pass — that is a behavior change and needs the user's approval.

## Size & Kind Triage (first action)

Classify the refactor before choosing steps and record the result in the workflow report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300 (mechanical renames can reach thousands).
- **Kind** (all that apply): local cleanup · extract/move/rename · cross-module restructure · public contract/API surface · data/schema/persistence · security-sensitive · performance-driven · dead-code removal · test-only · tooling/config.
- **Risk:** irreversible, data, security, cross-module. Escalate depth on risk and ambiguity, not on file count alone.

| Triage result | Typical route through the recommended skills |
| --- | --- |
| XS/S, one module, no contract/data surface | investigate → baseline test → short plan → execute → review → test → close |
| M, or cross-module | add `/plan-review`; add characterization tests where the baseline shows a coverage gap |
| L/XL, public contract/data/security, or ambiguous target structure | add `/plan-validate`; execute in bounded batches per module with one report per batch, baseline and final test per batch plus a full-scope final run |

## Required Quality Gates

Non-negotiable — `/workflow-end` checks each against its evidence before the run closes:

1. **Baseline green** (`/test`, gate, before any change) — the test command, scope and pass summary for the code the refactor touches. A red baseline stops the refactor: report it, or route the failure to `workflow-bugfix`; never refactor on a red base.
2. **Touched behavior is guarded** — every behavior the refactor touches has a test that would fail if it changed; otherwise characterization tests are written first and proven green on the unrefactored code. For lifecycle/state logic, tests assert persisted transitions and invalid-transition rejection.
3. **Behavior preserved** (`/test`, gate, after the change and after review fixes) — the baseline scope plus any characterization tests run green in THIS run; test code changed only mechanically (imports, renamed symbols, moved paths).
4. **Review converged** (`/workflow-review-changes`, gate, INLINE in the main session) — validated blocking findings fixed and the fixed state re-reviewed.
5. **Run closed** — `/workflow-end` (top-level only).

Specs normally do not change in a refactor; the spec steps below run only when canonical specs or TCs point at code or tests the refactor moved, or a preserved invariant lacks a TC. Any observable behavior, public contract or docs/spec boundary change means the work is no longer a pure refactor — stop and confirm with the user, then run the spec/test/docs sync that change requires.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`, in its recommended default order.

| Step | Role | Runs when / earns its cost | Proves |
| --- | --- | --- | --- |
| `/investigate` | core | always in practice — scope, callers, 3+ local pattern examples | scope and target pattern |
| `/test` | gate | always — BEFORE any change, on the affected scope | baseline green |
| `/plan` | core | always in practice; XS/S keeps it to files, steps, rollback | refactor plan |
| `/plan-review` | optional | size M+, cross-module, contract/data/security, or a design choice | plan quality |
| `/plan-validate` | optional | size L+, or an ambiguous target structure or scope | plan confirmed |
| `/integration-test` | optional | touched behavior has no test that would fail if it changed | characterization tests |
| `/plan-execute` | core | always in practice — small verifiable increments | the change |
| `/spec [mode=tests]` | optional | TCs reference moved code/tests, or an invariant lacks a TC | TCs match |
| `/artifact-review --type=spec-tests` | optional | TC content changed beyond evidence paths | TC quality |
| `/spec [mode=sync]` | optional | specs/TCs reference moved or renamed code/test paths | specs match |
| `/integration-test-verify` | optional | integration tests written or changed in this run | integration tests green |
| `/workflow-review-changes` | gate | always — INLINE in the main session | review converged |
| `/test` | gate | always — after the change and review fixes, baseline scope | behavior preserved |
| `/workflow-end` | gate | always | run closed |
| `/watzup` | core | wrap-up summary | handoff |

Outcome gates: tests pass · review converged · run closed.

A recommended step the triage shows would do no real work is not run; record it through the Step Execution Protocol with its evidence.

**Ad hoc skills (not registry steps):** `/investigate` again before removing "unused" code — grep evidence, confidence ≥80%, cross-module/service check · `/performance-review` for a performance-driven refactor (below) · `/code-simplifier` for a clean-up pass, only before the review and final test so they cover its result.

> **[PERFORMANCE-SDD ROUTE]** A performance-driven refactor (query optimization, caching, fewer allocations, throughput) runs `/performance-review` for benchmark evidence — SLA, baseline, measurement command — while preserving observable behavior and functional no-regression checks. A pure behavior-preserving optimization adds no new TCs when the invariant-preservation evidence and the final `/test` gate cover it; a changed SLA, performance constraint, state timing boundary, public contract or docs/spec boundary still requires spec, test and docs sync.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and order — optimize wall-clock and token cost at equal quality. Fixed constraints (data dependencies):

- The baseline and any characterization tests run green on the unrefactored code before `/plan-execute` changes it.
- A change exists before it is reviewed or tested; a spec sync runs before the review that checks it; review fixes are re-verified by the final `/test` gate; `/workflow-end` runs last.
- `/workflow-review-changes` runs INLINE in the main session — never as a sub-agent — and owns the test-quality review and the docs/domain-entity reference refresh; do not repeat them here.
- Gates awaiting user approval (plan validation, a behavior-change decision) are never parallelized.

Recommended: XS/S work inline without sub-agents; L/XL mechanical changes applied per module batch with a bounded report each, then one full-scope final test.

## Memory, Reporting and Fix Path

- **Tasks:** one task per selected step or batch so nothing is lost after compaction; child skills expand their phases under the parent row.
- **Report first:** create `tmp/reports/workflow-refactor-{YYMMDD}-{HHmm}-{slug}.md` before the first finding; append triage, baseline evidence, pattern examples, batch results and deviations per step; re-read it and `TaskList` after compaction. Sub-agent briefs make report-writing their first deliverable.
- **Fix path:** validate a finding (evidence-backed, reproducible) before fixing it; fix at the owning layer; re-run the reviewer or test that raised it, plus a holistic pass when fixes were non-trivial. A failing test after the change means the refactor changed behavior until proven otherwise — adjudicate it before editing either side.
- **Loop bounds:** round 1 fixes every validated finding; from round 2 only CRITICAL/HIGH/MEDIUM block and LOW-only findings are deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); failing tests are uncapped; no progress → escalate via `AskUserQuestion`.

## Activation

Activate the `workflow-refactor` workflow: run `/start-workflow workflow-refactor` with the user's prompt as context. Apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; project conventions come from `docs/project-config.json` and the docs index.

Recommended default order (roles in the table above):

**IMPORTANT MANDATORY Steps:** /investigate -> /test -> /plan -> /plan-review -> /plan-validate -> /integration-test -> /plan-execute -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup

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

**IMPORTANT MUST ATTENTION Goal:** restructure existing code without changing its observable behavior, proven by the same test scope green before and after plus a converged change review.

- **MUST ATTENTION** triage size, kind and risk FIRST; run only the recommended skills the triage shows do real work, and log every deviation with evidence.
- **MUST ATTENTION** baseline `/test` (gate) green BEFORE any change; characterization tests first for any touched behavior no test guards; the final `/test` (gate) green on the same scope AFTER the change.
- **MUST ATTENTION** search 3+ local examples and follow the project's `workflowPatterns`; removing "unused" code needs `/investigate` evidence.
- **NEVER** edit an assertion or expected value to make the refactor pass; a behavior change needs the user's approval and the spec/test/docs sync it implies. `/workflow-review-changes` runs INLINE in the main session; close with `/workflow-end`.
