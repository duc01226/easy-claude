---
name: workflow-spec-sync
version: 1.0.0
description: '[Workflow] Use when updating test specs and feature docs after code changes, bug fixes, or PR reviews.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** After a code change, bug fix or PR review, bring the canonical test cases, feature docs and integration tests back in line with the code, so every changed behavior ends covered by tests that ran green in this run.

**Use when:** code already changed and its specs, test cases or docs may be stale. To write tests for code nobody changed, use `/workflow-write-integration-test`; to drive a red suite to green, use `/workflow-integration-test-green`; for a change still being built, the feature/bugfix workflows own spec sync themselves.

**IMPORTANT MANDATORY Steps:** /workflow-review-changes -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /test -> /docs-update -> /workflow-end -> /watzup

**Steps:** /workflow-review-changes → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-review → /integration-test-verify → /test → /docs-update → /workflow-end → /watzup

Both chains are the recommended default order. Which steps are gates and when each optional step runs is declared in the registry entry and restated in [Recommended Skills](#recommended-skills).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-spec-sync` workflow. Run `/start-workflow workflow-spec-sync` with the user's prompt as context.

**Artifact contract.** A native contract declared by config or local references takes precedence over portable format defaults. Read `docs/project-config.json` (`specArtifacts`, `specRoots`, `workflowPatterns`) and the required local references first, then resolve section roles, identifiers, ownership, and test/evidence carriers from them. Under a native profile, a missing or conflicting required placement, ID, owner, carrier, or companion link remains `UNKNOWN`/`BLOCKED` — never guessed and never silently downgraded to the portable format. Read `spec-principles.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path) before editing cases — its TC coverage mapping section is the baseline.

## Triage — FIRST Action

Classify the triggering change before choosing depth and record the result in the report. Escalate depth on risk and ambiguity, not on file count alone.

| Axis                              | Values                                                                                                  | What it selects                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size** of the triggering change | **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300          | XS/S → inline, no sub-agents beyond the nested review's own reviewers. M+ → partition the case and test work per feature/module, one report section per partition.                                                                                                                                                                                                                                |
| **Trigger kind**                  | bug fix · behavior change · public contract/API · behavior-preserving refactor · docs-only · UI-bearing | Bug fix → add a regression case that fails on the old behavior. Behavior or contract change → update cases, tests and docs. Behavior-preserving refactor or docs-only → cases are usually current: case authoring reduces to a diff check and the test-writing steps close as `when-false`, while review, sync and the test gate still run. UI-bearing → refresh the interaction surface (below). |
| **Coverage state**                | the case-to-test map                                                                                    | A case without an executing test → write it. A test without a case → add the case or justify it. Both current → sync links only.                                                                                                                                                                                                                                                                  |
| **Risk**                          | security · data/schema · cross-module                                                                   | Raises review and test depth; never lowers a gate.                                                                                                                                                                                                                                                                                                                                                |

**UI-intent maintenance (conditional).** Only when the change carries user-facing behavior: alongside `/spec [mode=sync]`, run `/spec` (ui-intent) to refresh the affected interaction surface — under the strict default, Feature Spec §6 View Inventory, Key UI States and per-story click-path — and re-link the governing `/design-spec` or mockup so the surface stays coupled to the synced behavior. Backend-only change → state that skip reason. Rules: the `ui-intent-layer` protocol below.

## Required Quality Gates

Each gate names the evidence `/workflow-end` checks. None of them flexes.

1. **Triggering change reviewed** (`review-converged`, gate `/workflow-review-changes`) — the nested review runs INLINE in the main session and converges; validated blocking findings are fixed and re-reviewed. Evidence: its report path and verdict.
2. **Cases encode intent, not the bug** — each added or changed case names its `Business Intent / Invariant Guarded` and would fail if that intent broke; a bug fix gets a regression case. For each changed hard rule or invariant, sync a universally quantified property case plus its boundary counter-case; every behavior-changing finding lands in BOTH the spec and the tests.
3. **Spec synced** (`spec-synced`, gate `/spec [mode=sync]`) — the case owner and its coverage carrier match the executing tests and the source, per the three-way sync contract in `spec-system-reference.md` (strict default: Feature Spec Section 8 TCs and `CoveredBy` links; native profile: its declared identities and fields).
4. **Changed behavior tested green in this run** (`tests-pass`, gate `/test`) — runner output for every suite that covers the changed behavior; integration tests written or changed here also meet the configured repeat policy through `/integration-test-verify`.
5. **Every failing test adjudicated before an edit** — a five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) from `/debug-investigate` against the spec and the source, per `.claude/skills/shared/protocols/test-failure-fault-adjudication.md`; never weaken, skip or retry an assertion to force green.
6. **Docs synced** — feature docs and derived docs the change made stale are updated.
7. **Run closed** (`run-closed`, gate `/workflow-end`).

## Recommended Skills

| Step                                 | Role     | Runs when (optional steps: registry `when` / `skipReason`)                                                                                                                                                                                                                       | Proves / feeds                              |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `/workflow-review-changes`           | gate     | Always, first, INLINE in the main session.                                                                                                                                                                                                                                       | `review-converged`                          |
| `/spec [mode=tests]`                 | core     | Usually: diff existing cases against the changed code; add regression cases for bug fixes. A behavior-preserving change reduces it to that diff check.                                                                                                                           | Current cases.                              |
| `/artifact-review --type=spec-tests` | optional | When: The spec [mode=tests] step added or changed at least one test case in this run. · Skip reason: No test case was added or changed in this run, so there is no case to review.                                                                                               | Case quality.                               |
| `/spec [mode=sync]`                  | gate     | Always.                                                                                                                                                                                                                                                                          | `spec-synced`                               |
| `/integration-test`                  | optional | When: An added or changed test case has no executing integration test, or changed behavior is not yet covered by one. · Skip reason: Every added or changed test case already has an executing integration test covering it (see the case-to-test map).                          | Test code for new cases.                    |
| `/integration-test-review`           | optional | When: Integration test code was written or changed in this run. · Skip reason: No integration test code was written or changed in this run, so there is no new test code to review.                                                                                              | Converged review of this run's test code.   |
| `/integration-test-verify`           | optional | When: Integration test code was written or changed in this run, or an integration test covers behavior the triggering change altered. · Skip reason: No integration test was written or changed and none covers the altered behavior; the test gate proves the remaining suites. | Repeat-policy proof for integration suites. |
| `/test`                              | gate     | Always.                                                                                                                                                                                                                                                                          | `tests-pass`                                |
| `/docs-update`                       | core     | Usually: feature docs, evidence fields, version history.                                                                                                                                                                                                                         | Docs synced.                                |
| `/workflow-end`                      | gate     | Always, last.                                                                                                                                                                                                                                                                    | `run-closed`                                |
| `/watzup`                            | core     | Always.                                                                                                                                                                                                                                                                          | Recap.                                      |

## Orchestration Freedom

You choose inline vs sub-agent, batching and ordering to minimise wall-clock and token cost at equal quality. Fixed constraints only:

- The nested `/workflow-review-changes` runs INLINE in the main session, never as a sub-agent; its own reviewers stay sub-agents.
- Cases are updated before the tests that implement them; test code exists before it is reviewed and run; fixes are re-verified after they land; `/spec [mode=sync]` sees the final tests; `/workflow-end` runs last; gates awaiting user approval never run in parallel.
- Recommended: XS/S inline end to end; for M+ partitions, independent case/test partitions with disjoint files may run as one wave of sub-agents, each writing its own report section first.

## Memory & Reporting

- One task per selected step plus a final review task; a step that closes as `when-false` completes with its recorded skip reason.
- Write `tmp/reports/workflow-spec-sync-{YYMMDD}-{HHmm}-{slug}.md` FIRST (triage, case-to-test map), then append per step or partition.
- After compaction or resume, re-read the report and `TaskList` before continuing.

## Fix Path & Loop Bounds

- Validate a finding (evidence-backed, reproducible) before fixing it; fix at the component that owns the violated contract, then re-run the reviewer or test that raised it — plus a holistic pass when fixes were non-trivial. Plan ceremony (`/plan` → `/plan-review`) only for a large, cross-module or ambiguous fix set.
- Review loops keep the framework bar: round 1 clears every validated finding; round 2 onward clears CRITICAL/HIGH/MEDIUM and defers LOW; cap 2 rounds (+1 when a CRITICAL/HIGH stays open). Failing tests are not capped by rounds — they loop until green or escalate via `AskUserQuestion` on no progress.

---

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** bring cases, docs and integration tests back in line with the changed code — every changed behavior covered by tests that ran green in this run.

- **MUST ATTENTION** triage FIRST (size, trigger kind, coverage state): a behavior-preserving or docs-only change does not write new tests, but review, spec sync and the test gate still run.
- **MUST ATTENTION** resolve the native artifact contract before editing cases; an unresolved placement, ID, owner, carrier or link stays `UNKNOWN`/`BLOCKED` — never guessed.
- **MUST ATTENTION** cases encode intended behavior, never the bug — name the `Business Intent / Invariant Guarded`; a failing test gets a five-way Fault Verdict before any edit, and NEVER a weakened assertion.
- **MUST ATTENTION** the nested `/workflow-review-changes` runs INLINE in the main session; `/spec [mode=sync]` sees the final tests; `/workflow-end` runs last.
- **MUST ATTENTION** bootstrap one task per selected step plus a final review task, write the report FIRST, cite `file:line` evidence, and end with the lessons-learned check.

**[TASK-PLANNING]** Before acting, run the triage, then break the selected steps into small tasks with `TaskCreate`.
