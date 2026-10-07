---
name: workflow-spec-sync
description: '[Workflow] Reconcile canonical specs, test cases, integration tests and docs after code changes, bug fixes or PR reviews; verify changed behavior.'
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

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-spec-sync` together with this skill. Call [`$start-workflow workflow-spec-sync`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create one todo for EVERY selected occurrence before triage, analysis or step execution, including conditional/optional ones; preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`$spec [mode=tests]`](../spec/SKILL.md) (core) → [`$work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (optional; conditional) → [`$spec [mode=sync]`](../spec/SKILL.md) (gate) → [`$integration-test`](../integration-test/SKILL.md) (optional; conditional) → [`$integration-test --mode=review`](../integration-test/SKILL.md) (optional; conditional) → [`$integration-test --mode=verify`](../integration-test/SKILL.md) (optional; conditional) → [`$test`](../test/SKILL.md) (gate) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (core) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:a9c2f281b3dc3a1f5cd7d757110c5b7a0342b03b20f47479b932df469d9d18e6 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Reconcile canonical cases, specs, integration tests and docs after a code change, bug fix or PR review, with every changed behavior tested green in this run.

**Summary:** Triage and resolve the artifact contract → review changes (`--tests=defer`) → reconcile cases → review changed cases → sync → write/review/verify applicable integration tests → test → update docs → close → recap. Gates stay fixed; optional steps use the registry conditions below.

**Use when:** code already changed and its specs, test cases or docs may be stale. To write tests for code nobody changed, use `$workflow-integration-test --mode=write`; to drive a red suite to green, use `$workflow-integration-test --mode=green`; for a change still being built, the feature/bugfix workflows own spec sync themselves.

**IMPORTANT MANDATORY Steps:** $workflow-review-changes --tests=defer -> $spec [mode=tests] -> $work-item --mode=review --type=spec-tests -> $spec [mode=sync] -> $integration-test -> $integration-test --mode=review -> $integration-test --mode=verify -> $test -> $docs-manager --mode=update -> $workflow-end -> $watzup

**Steps:** $workflow-review-changes --tests=defer → $spec [mode=tests] → $work-item --mode=review --type=spec-tests → $spec [mode=sync] → $integration-test → $integration-test --mode=review → $integration-test --mode=verify → $test → $docs-manager --mode=update → $workflow-end → $watzup

The registry owns the recommended order, gates and optional conditions; see [Recommended Skills](#recommended-skills).

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

Run `$start-workflow workflow-spec-sync` with the user's prompt as context.

**Artifact contract.** A native contract declared by config or local references takes precedence over portable format defaults. Read `docs/project-config.json` (`specArtifacts`, `specRoots`, `workflowPatterns`) and the required local references first, then resolve section roles, identifiers, ownership, and test/evidence carriers from them. Under a native profile, a missing or conflicting required placement, ID, owner, carrier, or companion link remains `UNKNOWN`/`BLOCKED` — never guessed and never silently downgraded to the portable format. Read `spec-principles.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path) before editing cases — its TC coverage mapping section is the baseline.

## Triage — FIRST Action

Record the triggering change's triage before choosing depth. Risk and ambiguity raise depth beyond the file-count band.

| Axis | Values | What it selects |
| --- | --- | --- |
| **Size** of the triggering change | **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300 | XS/S → inline, no sub-agents beyond the nested review's own reviewers. M+ → partition the case and test work per feature/module, one report section per partition. |
| **Trigger kind** | bug fix · behavior change · public contract/API · behavior-preserving refactor · docs-only · UI-bearing | Bug fix → add a regression case that fails on the old behavior. Behavior or contract change → update cases, tests and docs. Behavior-preserving refactor or docs-only → cases are usually current: case authoring reduces to a diff check and the test-writing steps close as `when-false`, while review, sync and the test gate still run. UI-bearing → refresh the interaction surface (below). |
| **Coverage state** | the case-to-test map | A case without an executing test → write it. A test without a case → add the case or justify it. Both current → sync links only. |
| **Risk** | security · data/schema · cross-module | Raises review and test depth; never lowers a gate. |

**UI-intent maintenance.** For user-facing behavior, run `$spec` (ui-intent) alongside `$spec [mode=sync]`; refresh the interaction surface (strict default: Feature Spec §6 views, states and per-story click-path) and re-link `$design-spec` or mockup. Follow `ui-intent-layer` below. Backend-only → record the skip reason.

## Required Quality Gates

`$workflow-end` checks these fixed gates and their evidence.

1. **Triggering change reviewed** (`review-converged`, gate `$workflow-review-changes --tests=defer`) — run INLINE; fix validated blocking findings and re-review to convergence. `--tests=defer` runs no suite (`SYNC:verify-last-order`): later verify/test gates prove the final tree. Standalone review retains its test run. Evidence: report path and verdict.
2. **Cases encode intent, not the bug** — each added/changed case names `Business Intent / Invariant Guarded` and fails when that intent breaks; bug fixes get regression cases. Each changed hard rule/invariant gets a universally quantified property case and boundary counter-case. Every behavior-changing finding lands in BOTH specs and tests.
3. **Spec synced** (`spec-synced`, gate `$spec [mode=sync]`) — reconcile case ownership and coverage with executing tests and source via `spec-system-reference.md` (strict default: Feature Spec Section 8 TCs and `CoveredBy`; native: declared identities/fields).
4. **Changed behavior tested green in this run** (`tests-pass`, gate `$test`) — retain runner output for every affected suite. Integration tests written/changed here meet the configured repeat policy through `$integration-test --mode=verify`.
5. **Every failing test adjudicated before an edit** — `$investigate --mode=debug` establishes the five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) against spec and source. Read `.claude/skills/shared/protocols/test-failure-fault-adjudication.md` when a test fails; never weaken, skip or retry an assertion to force green.
6. **Docs synced** — update feature and derived docs made stale by the change.
7. **Run closed** (`run-closed`, gate `$workflow-end`).

## Recommended Skills

| Step | Role | Runs when (optional steps: registry `when` / `skipReason`) | Proves / feeds |
| --- | --- | --- | --- |
| `$workflow-review-changes --tests=defer` | gate | Always, first, INLINE in the main session; static review, the test gates below run the tests. | `review-converged` |
| `$spec [mode=tests]` | core | Usually: diff existing cases against the changed code; add regression cases for bug fixes. A behavior-preserving change reduces it to that diff check. | Current cases. |
| `$work-item --mode=review --type=spec-tests` | optional | When: The spec [mode=tests] step added or changed at least one test case in this run. · Skip reason: No test case was added or changed in this run, so there is no case to review. | Case quality. |
| `$spec [mode=sync]` | gate | Always. | `spec-synced` |
| `$integration-test` | optional | When: An added or changed test case has no executing integration test, or changed behavior is not yet covered by one. · Skip reason: Every added or changed test case already has an executing integration test covering it (see the case-to-test map). | Test code for new cases. |
| `$integration-test --mode=review` | optional | When: Integration test code was written or changed in this run. · Skip reason: No integration test code was written or changed in this run, so there is no new test code to review. | Converged review of this run's test code. |
| `$integration-test --mode=verify` | optional | When: Integration test code was written or changed in this run, or an integration test covers behavior the triggering change altered. · Skip reason: No integration test was written or changed and none covers the altered behavior; the test gate proves the remaining suites. | Repeat-policy proof for integration suites. |
| `$test` | gate | Always. | `tests-pass` |
| `$docs-manager --mode=update` | core | Usually: feature docs, evidence fields, version history. | Docs synced. |
| `$workflow-end` | gate | Always, last. | `run-closed` |
| `$watzup` | core | Always. | Recap. |

## Orchestration Freedom

Choose inline vs sub-agent, batching and ordering at equal quality, subject to these dependencies:

- Run nested `$workflow-review-changes --tests=defer` INLINE; only its reviewers are sub-agents. If verify/test edits source or tests, re-run that review (`--tests=defer`) on the settled tree before closing.
- Cases precede implementing tests; test code precedes review/run; re-verify fixes; `$spec [mode=sync]` sees final tests; `$workflow-end` runs last; never parallelize user-approval gates.
- XS/S stays inline; M+ may run disjoint case/test partitions in one sub-agent wave, each writing its report section first.

## Memory & Reporting

- One task per selected step plus a final review task; a step that closes as `when-false` completes with its recorded skip reason.
- Write `tmp/reports/workflow-spec-sync-{YYMMDD}-{HHmm}-{slug}.md` FIRST (triage, case-to-test map), then append per step or partition.
- After compaction or resume, re-read the report and the current task list before continuing.

## Fix Path & Loop Bounds

- Validate findings with evidence and reproduction, fix the contract owner, then re-run the raising reviewer/test; add a holistic pass for non-trivial fixes. Use `$plan` only for large, cross-module or ambiguous fix sets.
- Review loops use the shared three-round cap and defer LOWs from round 2. MEDIUM+ and failed required checks block; at exhaustion ask and wait before a bounded extension. Verification recovery follows `verify-last-order`'s bounded turns; never retry failed tests indefinitely.

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

**IMPORTANT MUST ATTENTION Goal:** Reconcile canonical cases, specs, integration tests and docs after a code change, bug fix or PR review, with every changed behavior tested green in this run.

**MUST ATTENTION Route:** triage/resolve contract → review (`--tests=defer`) → cases → changed-case review → sync → applicable integration write/review/verify → test → docs update → close → recap. Apply registry conditions verbatim; never batch-complete gates.

- **MUST ATTENTION** triage FIRST: behavior-preserving/docs-only changes still run review, sync and test gates; new tests need uncovered behavior.
- **MUST ATTENTION** resolve the native artifact contract before editing cases; an unresolved placement, ID, owner, carrier or link stays `UNKNOWN`/`BLOCKED` — never guessed.
- **MUST ATTENTION** name `Business Intent / Invariant Guarded`; adjudicate failing tests before editing, never weaken assertions.
- **MUST ATTENTION** the nested `$workflow-review-changes` runs INLINE in the main session; `$spec [mode=sync]` sees the final tests; `$workflow-end` runs last.
- **MUST ATTENTION** bootstrap exactly one task per selected occurrence before triage; record final consistency and lessons-learned checks under closure, write the report FIRST and cite `file:line` evidence.

| Evasion | Required action |
| --- | --- |
| "Cases look current; skip the run" | Diff the cases; review, sync and test gates still run. |
| "A test failed; change its assertion" | Establish the five-way Fault Verdict before editing. |

**[TASK-PLANNING]** Create all selected occurrence tasks with todo tracking before triage, analysis or step execution.
