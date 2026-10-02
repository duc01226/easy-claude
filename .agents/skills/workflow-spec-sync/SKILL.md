---
name: workflow-spec-sync
description: '[Workflow] Use when updating test specs and feature docs after code changes, bug fixes, or PR reviews.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Quick Summary

**Goal:** After a code change, bug fix or PR review, bring the canonical test cases, feature docs and integration tests back in line with the code, so every changed behavior ends covered by tests that ran green in this run.

**Use when:** code already changed and its specs, test cases or docs may be stale. To write tests for code nobody changed, use `$workflow-integration-test --mode=write`; to drive a red suite to green, use `$workflow-integration-test --mode=green`; for a change still being built, the feature/bugfix workflows own spec sync themselves.

**IMPORTANT MANDATORY Steps:** $workflow-review-changes --tests=defer -> $spec [mode=tests] -> $pbi --mode=review --type=spec-tests -> $spec [mode=sync] -> $integration-test -> $integration-test --mode=review -> $integration-test --mode=verify -> $test -> $docs-manager --mode=update -> $workflow-end -> $watzup

**Steps:** $workflow-review-changes --tests=defer → $spec [mode=tests] → $pbi --mode=review --type=spec-tests → $spec [mode=sync] → $integration-test → $integration-test --mode=review → $integration-test --mode=verify → $test → $docs-manager --mode=update → $workflow-end → $watzup

Both chains are the recommended default order. Which steps are gates and when each optional step runs is declared in the registry entry and restated in [Recommended Skills](#recommended-skills).

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-spec-sync` workflow. Run `$start-workflow workflow-spec-sync` with the user's prompt as context.

**Artifact contract.** A native contract declared by config or local references takes precedence over portable format defaults. Read `docs/project-config.json` (`specArtifacts`, `specRoots`, `workflowPatterns`) and the required local references first, then resolve section roles, identifiers, ownership, and test/evidence carriers from them. Under a native profile, a missing or conflicting required placement, ID, owner, carrier, or companion link remains `UNKNOWN`/`BLOCKED` — never guessed and never silently downgraded to the portable format. Read `spec-principles.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path) before editing cases — its TC coverage mapping section is the baseline.

## Triage — FIRST Action

Classify the triggering change before choosing depth and record the result in the report. Escalate depth on risk and ambiguity, not on file count alone.

| Axis                              | Values                                                                                                  | What it selects                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size** of the triggering change | **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300          | XS/S → inline, no sub-agents beyond the nested review's own reviewers. M+ → partition the case and test work per feature/module, one report section per partition.                                                                                                                                                                                                                                |
| **Trigger kind**                  | bug fix · behavior change · public contract/API · behavior-preserving refactor · docs-only · UI-bearing | Bug fix → add a regression case that fails on the old behavior. Behavior or contract change → update cases, tests and docs. Behavior-preserving refactor or docs-only → cases are usually current: case authoring reduces to a diff check and the test-writing steps close as `when-false`, while review, sync and the test gate still run. UI-bearing → refresh the interaction surface (below). |
| **Coverage state**                | the case-to-test map                                                                                    | A case without an executing test → write it. A test without a case → add the case or justify it. Both current → sync links only.                                                                                                                                                                                                                                                                  |
| **Risk**                          | security · data/schema · cross-module                                                                   | Raises review and test depth; never lowers a gate.                                                                                                                                                                                                                                                                                                                                                |

**UI-intent maintenance (conditional).** Only when the change carries user-facing behavior: alongside `$spec [mode=sync]`, run `$spec` (ui-intent) to refresh the affected interaction surface — under the strict default, Feature Spec §6 View Inventory, Key UI States and per-story click-path — and re-link the governing `$design-spec` or mockup so the surface stays coupled to the synced behavior. Backend-only change → state that skip reason. Rules: the `ui-intent-layer` protocol below.

## Required Quality Gates

Each gate names the evidence `$workflow-end` checks. None of them flexes.

1. **Triggering change reviewed** (`review-converged`, gate `$workflow-review-changes --tests=defer`) — the nested review runs INLINE in the main session and converges; validated blocking findings are fixed and re-reviewed. It reads code and tests but runs no test suite (`--tests=defer`, `SYNC:verify-last-order`): the later `$integration-test --mode=verify` and `$test` gates prove the tests once, on the final tree. A standalone `$workflow-review-changes` keeps its own test run. Evidence: its report path and verdict.
2. **Cases encode intent, not the bug** — each added or changed case names its `Business Intent / Invariant Guarded` and would fail if that intent broke; a bug fix gets a regression case. For each changed hard rule or invariant, sync a universally quantified property case plus its boundary counter-case; every behavior-changing finding lands in BOTH the spec and the tests.
3. **Spec synced** (`spec-synced`, gate `$spec [mode=sync]`) — the case owner and its coverage carrier match the executing tests and the source, per the three-way sync contract in `spec-system-reference.md` (strict default: Feature Spec Section 8 TCs and `CoveredBy` links; native profile: its declared identities and fields).
4. **Changed behavior tested green in this run** (`tests-pass`, gate `$test`) — runner output for every suite that covers the changed behavior; integration tests written or changed here also meet the configured repeat policy through `$integration-test --mode=verify`.
5. **Every failing test adjudicated before an edit** — a five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) from `$investigate --mode=debug` against the spec and the source, per `.claude/skills/shared/protocols/test-failure-fault-adjudication.md`; never weaken, skip or retry an assertion to force green.
6. **Docs synced** — feature docs and derived docs the change made stale are updated.
7. **Run closed** (`run-closed`, gate `$workflow-end`).

## Recommended Skills

| Step                                 | Role     | Runs when (optional steps: registry `when` / `skipReason`)                                                                                                                                                                                                                       | Proves / feeds                              |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `$workflow-review-changes --tests=defer` | gate | Always, first, INLINE in the main session; static review, the test gates below run the tests.                                                                                                                                                                                                                                       | `review-converged`                          |
| `$spec [mode=tests]`                 | core     | Usually: diff existing cases against the changed code; add regression cases for bug fixes. A behavior-preserving change reduces it to that diff check.                                                                                                                           | Current cases.                              |
| `$pbi --mode=review --type=spec-tests` | optional | When: The spec [mode=tests] step added or changed at least one test case in this run. · Skip reason: No test case was added or changed in this run, so there is no case to review.                                                                                               | Case quality.                               |
| `$spec [mode=sync]`                  | gate     | Always.                                                                                                                                                                                                                                                                          | `spec-synced`                               |
| `$integration-test`                  | optional | When: An added or changed test case has no executing integration test, or changed behavior is not yet covered by one. · Skip reason: Every added or changed test case already has an executing integration test covering it (see the case-to-test map).                          | Test code for new cases.                    |
| `$integration-test --mode=review`           | optional | When: Integration test code was written or changed in this run. · Skip reason: No integration test code was written or changed in this run, so there is no new test code to review.                                                                                              | Converged review of this run's test code.   |
| `$integration-test --mode=verify`           | optional | When: Integration test code was written or changed in this run, or an integration test covers behavior the triggering change altered. · Skip reason: No integration test was written or changed and none covers the altered behavior; the test gate proves the remaining suites. | Repeat-policy proof for integration suites. |
| `$test`                              | gate     | Always.                                                                                                                                                                                                                                                                          | `tests-pass`                                |
| `$docs-manager --mode=update`                       | core     | Usually: feature docs, evidence fields, version history.                                                                                                                                                                                                                         | Docs synced.                                |
| `$workflow-end`                      | gate     | Always, last.                                                                                                                                                                                                                                                                    | `run-closed`                                |
| `$watzup`                            | core     | Always.                                                                                                                                                                                                                                                                          | Recap.                                      |

## Orchestration Freedom

You choose inline vs sub-agent, batching and ordering to minimise wall-clock and token cost at equal quality. Fixed constraints only:

- The nested `$workflow-review-changes --tests=defer` runs INLINE in the main session, never as a sub-agent; its own reviewers stay sub-agents. When `$integration-test --mode=verify` or `$test` edits any source or test file, re-run it (still `--tests=defer`) over the settled tree before closing.
- Cases are updated before the tests that implement them; test code exists before it is reviewed and run; fixes are re-verified after they land; `$spec [mode=sync]` sees the final tests; `$workflow-end` runs last; gates awaiting user approval never run in parallel.
- Recommended: XS/S inline end to end; for M+ partitions, independent case/test partitions with disjoint files may run as one wave of sub-agents, each writing its own report section first.

## Memory & Reporting

- One task per selected step plus a final review task; a step that closes as `when-false` completes with its recorded skip reason.
- Write `tmp/reports/workflow-spec-sync-{YYMMDD}-{HHmm}-{slug}.md` FIRST (triage, case-to-test map), then append per step or partition.
- After compaction or resume, re-read the report and the current task list before continuing.

## Fix Path & Loop Bounds

- Validate a finding (evidence-backed, reproducible) before fixing it; fix at the component that owns the violated contract, then re-run the reviewer or test that raised it — plus a holistic pass when fixes were non-trivial. Use `$plan` only for a large, cross-module or ambiguous fix set.
- Review loops keep the framework bar: round 1 exits on zero open validated findings (Round-1 LOW closure); round 2 onward clears CRITICAL/HIGH/MEDIUM and defers LOW; cap 3 review rounds. Failing tests are not capped by rounds — they loop until green or escalate using ask user tool on no progress.

---

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

**IMPORTANT MUST ATTENTION Goal:** bring cases, docs and integration tests back in line with the changed code — every changed behavior covered by tests that ran green in this run.

- **MUST ATTENTION** triage FIRST (size, trigger kind, coverage state): a behavior-preserving or docs-only change does not write new tests, but review, spec sync and the test gate still run.
- **MUST ATTENTION** resolve the native artifact contract before editing cases; an unresolved placement, ID, owner, carrier or link stays `UNKNOWN`/`BLOCKED` — never guessed.
- **MUST ATTENTION** cases encode intended behavior, never the bug — name the `Business Intent / Invariant Guarded`; a failing test gets a five-way Fault Verdict before any edit, and NEVER a weakened assertion.
- **MUST ATTENTION** the nested `$workflow-review-changes` runs INLINE in the main session; `$spec [mode=sync]` sees the final tests; `$workflow-end` runs last.
- **MUST ATTENTION** bootstrap one task per selected step plus a final review task, write the report FIRST, cite `file:line` evidence, and end with the lessons-learned check.

**[TASK-PLANNING]** Before acting, run the triage, then break the selected steps into small tasks with task tracking.
