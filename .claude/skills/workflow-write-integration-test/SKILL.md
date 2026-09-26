---
name: workflow-write-integration-test
version: 1.0.0
description: '[Workflow] Use when writing integration tests spec-first, converting test specs into test code, or adding coverage to untested code.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Write or update integration tests traced to the project's canonical case owner, prove each one asserts the intent it protects, review them to convergence, and verify them green under the project's configured repeat policy.

**Use when:** covering untested or changed behavior with integration tests, converting existing cases into test code, or auditing and stabilising an existing suite. To drive an already-red suite to green, use `/workflow-integration-test-green`; to reconcile specs and tests after a code change, use `/workflow-spec-sync`; for case authoring with no test code, run `/spec [mode=tests]` directly.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /docs-update -> /workflow-end -> /watzup

The chain above is the recommended default order. Which steps are gates and when each optional step runs is declared in the registry entry and restated in [Recommended Skills](#recommended-skills).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-write-integration-test` workflow. Run `/start-workflow workflow-write-integration-test` with the user's prompt as context.

## Triage — FIRST Action

Classify the target before choosing depth and record the result in the report. Escalate depth on risk and ambiguity, not on test count alone.

| Axis           | Values                                                                                                                                      | What it selects                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size**       | **XS** 1–3 cases in one existing suite · **S** ≤15 files, one module · **M** several modules · **L/XL** a feature area or whole-suite audit | XS → inline end to end, investigation reduced to the entry path, the invariant owner and one comparable test. S → inline, one report. M+ → partition per module or feature; one report section per partition; test-writing sub-agents only for partitions with disjoint test files and isolated data.                                                                   |
| **Kind**       | new coverage · converting existing cases · auditing or stabilising a suite · persistent/shared state · UI-driven · security-sensitive       | Existing current cases → case authoring and case review close as `when-false`; the spec sync still reconciles links. Persistent/shared state → the repeat policy and unique data identity matter most. Security-sensitive → include rejection and authorization cases. An audit that turns up many failures → hand the red suite to `/workflow-integration-test-green`. |
| **Case state** | missing · stale · current                                                                                                                   | Missing or stale → author or update them first (spec-first); current → map them to tests.                                                                                                                                                                                                                                                                               |

## Required Quality Gates

Each gate names the evidence `/workflow-end` checks. None of them flexes.

1. **Behavior understood before any assertion** — `/investigate` traces the real entry point, the invariant or data owner, the observable outcome and any downstream effects the architecture actually has; production and test source are read before the first assertion is written. Evidence: `file:line` trace in the report.
2. **Tests verify intent** — every test names the business rule, invariant or technical contract it protects, asserts an outcome the system owns, and would fail if that intent broke; no smoke-only tests. It exercises the production entry path when that path is the behavior under test and uses valid project fixtures for unrelated preconditions; it waits only on a real observable signal. Evidence: the case-to-test map with the guarded intent per test.
3. **Review converged** (`review-converged`, gate `/integration-test-review`) — its seven gates (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage — every behavior-changing production file in the change set maps to a covering test, integration-first with a justified unit fallback, and to a case). Evidence: final review report.
4. **Tests green** (`tests-pass`, gate `/integration-test-verify`) — the configured relevant suites run under `integrationTestVerify.guidance`; absent guidance, two fresh green runs without a destructive reset for persistent or shared-state suites. Evidence: command, exact counts, exit status per run — never a claim without runner output.
5. **Cases synced** (`spec-synced`, gate `/spec [mode=sync]`) — the configured case owner and coverage carrier match the executing tests. Strict default: Feature Spec Section 8 `TC-{FEATURE}-{NNN}` cases and `CoveredBy` links; a native profile keeps its declared identities, fields and cardinality and never gets a Section 8 shadow.
6. **Every failure adjudicated before an edit** — a five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) from `/debug-investigate`; never force green by deleting or skipping tests, weakening assertions, widening assertion timeouts, retrying assertions or narrowing scope.
7. **Goal Contract satisfied** — resolve the active Goal Contract at workflow start (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the request). Each generated test maps to a saved invariant or criterion, or records why not. After `/integration-test-verify`, append its evidence (counts, command, report path) to the Iteration Log and emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `/workflow-end`.
8. **Run closed** (`run-closed`, gate `/workflow-end`).

## Recommended Skills

| Step                                 | Role     | Runs when (optional steps: registry `when` / `skipReason`)                                                                                                                                                                                                                               | Proves / feeds                                                  |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/investigate`                       | core     | Always; depth follows the size band.                                                                                                                                                                                                                                                     | The behavior trace and the Test Architecture Contract record.   |
| `/spec [mode=tests]`                 | optional | When: A target behavior has no current case in the configured case owner (new or changed behavior, or a missing or stale case). · Skip reason: Every target behavior already has a current case in the configured case owner; the spec sync gate still reconciles case-to-test links.    | Canonical cases for the tests to implement.                     |
| `/artifact-review --type=spec-tests` | optional | When: The spec [mode=tests] step added or changed at least one case in this run. · Skip reason: No case was added or changed in this run, so there is no case to review.                                                                                                                 | Clear setup/action/outcome, boundaries, no identity collision.  |
| `/integration-test`                  | core     | Usually.                                                                                                                                                                                                                                                                                 | Test code through the project's supported integration boundary. |
| `/integration-test-review`           | gate     | Always.                                                                                                                                                                                                                                                                                  | `review-converged`                                              |
| `/integration-test-verify`           | gate     | Always.                                                                                                                                                                                                                                                                                  | `tests-pass`                                                    |
| `/spec [mode=sync]`                  | gate     | Always.                                                                                                                                                                                                                                                                                  | `spec-synced`                                                   |
| `/docs-update`                       | optional | When: Test coverage changed materially, or a doc records evidence, coverage or test counts this run changed. · Skip reason: Coverage did not change materially and no doc records evidence, coverage or test counts this run changed; the spec sync gate already updated the case links. | Feature-doc evidence and version history.                       |
| `/workflow-end`                      | gate     | Always, last.                                                                                                                                                                                                                                                                            | `run-closed`                                                    |
| `/watzup`                            | core     | Always; hands off to `/understand` only for a large change or on request.                                                                                                                                                                                                                | Recap.                                                          |

## Orchestration Freedom

You choose inline vs sub-agent, batching and ordering to minimise wall-clock and token cost at equal quality. Fixed constraints only:

- Cases exist before the tests that implement them; test code exists before it is reviewed; review fixes are re-reviewed; `/integration-test-verify` runs on the reviewed code; `/spec [mode=sync]` sees the final tests; `/workflow-end` runs last; gates awaiting user approval never run in parallel.
- Parallel test writers only with disjoint write sets and isolated test data; XS/S work stays inline.

## Test Architecture Contract Handoff

Before `/integration-test`, `/investigate` emits one evidence-backed record and passes it unchanged down the route: tier applicability (Unit/Integration/System/E2E `APPLICABLE` only with runner or configuration evidence, otherwise `N/A — <evidence>`); the setup, writer, reviewer, verifier and documentation owner per applicable tier; copy-ready full and focused commands with their zero-match and invalid-selection non-zero behavior, CI gate and a simple Windows/macOS/Linux entry point where required; the run identity and data strategy (distinct identity on a shared store, real entry path for the tested behavior, valid fixtures for unrelated preconditions, isolated mutable data for supported concurrency); and the repeat proof `integrationTestVerify.guidance` requires. `/integration-test` consumes the setup and command fields, `/integration-test-review` checks command validity, data identity and isolation, and `/integration-test-verify` returns the exact evidence for the sync and docs steps. The record adds data to the route; it never duplicates or weakens a review or verification gate.

## Memory & Reporting

- One task per selected step plus a final review task; a step that closes as `when-false` completes with its recorded skip reason.
- Write `tmp/reports/workflow-write-integration-test-{YYMMDD}-{HHmm}-{slug}.md` FIRST (triage, contract record, case-to-test map), then append per step or partition.
- After compaction or resume, re-read the report, the Goal Contract and `TaskList` before continuing.

## Fix Path & Loop Bounds

- Validate a review finding (evidence-backed, reproducible) before fixing it; fix at the component that owns the violated contract, then restart the full integration-test review. A red test is adjudicated first (gate 6) and fixed on the side the verdict names.
- Round 1 blocks on every validated severity; from round 2 onward CRITICAL/HIGH/MEDIUM remain blocking and LOW-only findings are recorded/deferred without another fix/review round. Cap 2 rounds, +1 when a CRITICAL/HIGH stays open; never relabel a material finding LOW to exit.
- Failing tests are not capped by rounds — they loop until green; escalate via `AskUserQuestion` on no progress or an `ENVIRONMENT-BLOCKED`/`AMBIGUOUS` verdict.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** write or update integration tests traced to canonical cases, review them to convergence, and prove them green under the configured repeat policy.

- **MUST ATTENTION** triage FIRST (size, kind, case state): XS work stays inline and current cases are mapped, not re-authored — but review, verify and sync always run.
- **MUST ATTENTION** read the production and test source BEFORE writing any assertion; every test names the invariant it protects and asserts an outcome the system owns — NEVER smoke-only.
- **MUST ATTENTION** follow the project's configured test conventions (runner, fixtures, waits, annotations); wait on a real observable signal, never a blanket helper or a blind sleep.
- **MUST ATTENTION** a failing test gets a five-way Fault Verdict before any edit; NEVER force green, and never claim verification without runner output.
- **MUST ATTENTION** bootstrap one task per selected step plus a final review task, write the report FIRST, cite `file:line` evidence, and end with the lessons-learned check.

**[TASK-PLANNING]** Before acting, run the triage, then break the selected steps into small tasks with `TaskCreate`.
