---
name: test-review
description: '[Testing] Use when reviewing the tests of a change, branch or pull request: coverage of each changed behavior per layer (unit, integration, E2E, performance, seed data) and test quality. --fix-loop repairs tests; runs no suites.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. When a workflow step or another skill names a skill, read that file in full yourself (every line, with no line limit; in parts only when output is cut off): a skill whose implicit invocation is off is never loaded for you. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Prove that every behavior a change adds or alters is covered at each test layer the project uses, by tests that would fail when that behavior breaks and that pass or fail the same way on every run — and that spec, tests and code still agree.

**Workflow:**

1. **Scope and triage** — resolve the target, classify changed paths, record layer applicability from evidence; nothing testable → `N/A` with the inspected paths.
2. **Coverage matrix** — map each changed behavior to its covering test per applicable layer, or a named `TEST-GAP` with owner.
3. **Layer reviews** — route each applicable layer to its one owner's review mode; judge unit tests here.
4. **Cross-layer quality and flakiness** — apply the quality bar and the flaky-pattern catalogue to every covering test.
5. **Spec ↔ tests ↔ code** — triangulate and adjudicate drift; record the `Spec sync:` result.
6. **Validate, then report or fix** — validated findings, the Test Review Matrix and the `Test review:` line for the caller.

**Key Rules:**

- MUST ATTENTION this skill is the single owner of test-layer routing for a review (`SYNC:test-review-gate`); review skills call it and never dispatch a layer review themselves.
- MUST ATTENTION static only: it reads tests and never runs a suite. Execution belongs to the later verify step; the one exception is `--prove-tests`, from a caller with no later verify step, which makes this skill that review's single test-execution owner.
- MUST ATTENTION a layer is `APPLICABLE` only with runner, configuration or suite evidence; otherwise `N/A — <evidence>`. A layer that applies but cannot be judged is `UNVERIFIED` or `ENVIRONMENT-BLOCKED`, never PASS.
- NEVER accept a retry, skip, widened timeout, weakened assertion or a line-coverage percentage as a fix or as proof.

> **Todo first:** create tasks for triage, coverage matrix, each applicable layer review, cross-layer quality, spec sync, validation, and (in `--fix-loop`) fixes and fresh re-review, before executing; keep one in progress.

## Contents

- [Quick Summary](#quick-summary)
- [Modes and arguments](#modes-and-arguments)
- [Step 1 — Scope and triage](#step-1--scope-and-triage)
- [Step 2 — Coverage matrix](#step-2--coverage-matrix)
- [Step 3 — Layer reviews](#step-3--layer-reviews)
- [Step 4 — Cross-layer quality and flakiness](#step-4--cross-layer-quality-and-flakiness)
- [Step 5 — Spec ↔ tests ↔ code](#step-5--spec--tests--code)
- [Step 6 — Validate, then report or fix](#step-6--validate-then-report-or-fix)
- [Test skill map](#test-skill-map)
- [Project rules](#project-rules)
- [Closing Reminders](#closing-reminders)

## Modes and arguments

| Invocation | Behavior |
| --- | --- |
| `$test-review [target]` or `--review-only` / `--report-only` | Standalone default: one validated read-only report; no source or test edits. |
| `--fix-loop` | Standalone repair loop under the shared review policy: fix validated test findings at their owner, then a fresh whole-target re-review; three rounds by default. Layer owners run caller-owned (`--loop-owner=caller`) under this loop. |
| `--fix-loop --loop-owner=caller` | Inside `changes-review` or `workflow-review-changes`: one read-only pass; the caller validates the merged report, fixes and asks for the fresh pass. Never a nested loop. |
| `--prove-tests` | Only from a review-only caller with no later verify step: this skill owns that review's one test run. When the integration layer applies, pass `--prove-tests` to its owner, then run `$test --proven=<that owner's report>` for every other applicable layer; when it does not, run `$test` for the applicable layers. Record which owner ran which layer; with no applicable layer record `tests-pass: N/A — <evidence>`. |

Target arguments match the caller: current working changes by default; `--target=branch --base=<ref> --staged` for a pull-request snapshot; named files; a commit or an explicit range. Pin the merge-base before reviewing a branch.

## Step 1 — Scope and triage

1. Resolve the target exactly as the caller did and list every changed path. Classify each: production source · test (by layer) · spec or test-case file · test configuration, harness, fixture or helper · seed/test-data code · documentation only.
2. **Fast path.** No production source, test, spec/test-case or test-configuration change → record `N/A — no testable change` with the inspected paths, emit the `Test review:` line and return. This still counts as the required call.
3. **Project test facts.** Read the project configuration (`node .claude/scripts/project-context.cjs --context`, then the testing-related sections it names), the layer reference docs the project selects (integration, E2E, performance, seed-test-data), any project overlay for `test-review`, and the per-file conventions of the test paths you will judge. Missing configuration is supported: derive facts from manifests, runner configs and CI, and state the assumption.
4. **Layer applicability.** For unit, integration, E2E, performance and seed data, record `APPLICABLE` with the evidence (runner, config, suite root, CI job) or `N/A — <evidence>`. Use `SYNC:test-architecture-execution-contract` as the matrix owner; never invent a layer the project does not have.

## Step 2 — Coverage matrix

List the changed behaviors from the diff, the governing spec's stories, criteria, rules and cases, and the plan or task that motivated the change. For each behavior, write one row:

`behavior | source (file:line / AC / BR / TC) | unit | integration | E2E | performance | seed | verdict`

- A cell holds the covering test (`file:line` and the assertion that proves the outcome) or `TEST-GAP — <reason> — owner <name>`, or `N/A` when the layer does not apply or a cheaper layer owns the behavior (say which).
- Include every error path, boundary, state transition, authorization rule and acceptance criterion the change touches, not only the happy path.
- A bug fix row names its regression test, which must fail without the fix.
- Optional: a code graph can suggest tests for a changed symbol (`$graph-code --mode=query`); verify each suggestion by reading the test.
- Line or branch coverage reports may point at untested code; they never fill a cell.

## Step 3 — Layer reviews

Run each applicable layer's owner on the matrix rows of that layer, passing the caller's loop mode. Invoke owners through the active host's skill mechanism; read their SKILL.md and mode reference when the host refuses the call.

| Layer | Applicable when | Owner (review mode) | Pass to it |
| --- | --- | --- | --- |
| Unit | A unit runner or unit suite exists for the changed code | This skill — read [references/unit-test-review.md](references/unit-test-review.md) | Inline; findings join this report |
| Integration | Integration tests exist, are in the target, or should guard a changed boundary | [`$integration-test --mode=review`](../integration-test/SKILL.md) | `--report-only`, or `--fix-loop --loop-owner=caller`; `--prove-tests` only when it was passed in |
| E2E | Executable E2E, browser or user-flow tests exist or a changed journey is E2E-covered | [`$e2e-test --mode=review`](../e2e-test/SKILL.md) | `--report-only`, or `--loop-owner=caller` |
| Performance | Performance, load, soak or benchmark scenarios, their harness, workload or data profiles, resource constraints, collectors or gate/report evaluator changed, or a changed hot path has one; a document merely mentioning performance tests is not a trigger. Product bottlenecks stay with `$performance-review` | [`$performance-test --mode=review`](../performance-test/SKILL.md) | `--report-only --loop-owner=caller`, scope plus affected consumers |
| Seed data | Seeders or test-data builders changed | [`$seed-test-data --mode=review`](../seed-test-data/SKILL.md) | Read-only audit |

- An owner that cannot judge its layer (missing runner, unreadable config) returns `UNVERIFIED` or `ENVIRONMENT-BLOCKED`; carry it into the matrix, never as PASS.
- Independent depth may go to the matching agent (`integration-tester`, `e2e-runner`, `performance-tester`) when delegation is authorized; brief it with the scope, matrix rows and the shared reviewer template, and read its full report.
- Merge every owner's findings into one report and de-duplicate by cause.

## Step 4 — Cross-layer quality and flakiness

Apply items 5 and 6 of `SYNC:test-review-gate` to every covering test, whatever its layer:

- **Intent and break.** Each test names the intent or invariant it guards; write down the break (mutant) it must catch. A test that would survive it is `WEAK-TEST`.
- **Flaky patterns.** Read [references/flaky-test-patterns.md](references/flaky-test-patterns.md) whenever any test is in scope and check each covering test against it. Every hit is a `FLAKY-RISK` finding with its cause-level fix; it blocks in a new or changed test and in an unchanged test that is the only proof of a changed behavior, and is an observation with an owner in any other pre-existing test.
- **Test code quality.** Setup reuses the project's fixtures and builders; names state behavior, condition and outcome; no loop or branch hides an assertion; no commented-out or skipped test without a named owner; the same behavior is not asserted redundantly at a costlier layer when a cheaper one proves it (LOW, simplification).

## Step 5 — Spec ↔ tests ↔ code

For a behavior change, triangulate the governing spec, its test cases and the code (`SYNC:spec-tests-code-triangulation`); resolve case-to-test joins through the executing assertion (`SYNC:tc-test-join-evidence`). Classify each disagreement — CODE-WRONG, SPEC-STALE, SPEC-SILENT, TEST-GAP, WEAK-TEST, AMBIGUOUS — and adjudicate it (`SYNC:spec-drift-adjudication`): SPEC-STALE routes to `$spec [mode=update]` then `$spec [mode=sync]` (or `$workflow-spec-sync` for a wide drift); SPEC-SILENT is captured in the spec with a guarding case; AMBIGUOUS goes to the user.

Record one line: `Spec sync: in sync` · `Spec sync: drift <n> (<classes>) → <owner>` · `Spec sync: N/A — no behavior change` · `Spec sync: N/A — no governing spec (intent from <source>)`.

## Step 6 — Validate, then report or fix

1. Each finding carries severity, reachable trigger, consequence, `file:line`, and the break or cause it names. Severity follows `SYNC:severity-rubric` and the test-finding mapping in `SYNC:test-review-gate` item 9.
2. Validate: standalone runs `$why-review --validate-findings <report>`; with `--loop-owner=caller` the caller's single validation of the merged report covers it.
3. Review-only returns the report. `--fix-loop` fixes validated findings at their owner — strengthen the assertion, remove the flaky cause, add the missing case — and freshly re-reviews the whole target. A finding that reveals a production defect goes to `$investigate --mode=debug` and `$fix`; never change a test to match broken code (`SYNC:test-failure-fault-adjudication`). Write or amend tests here, but never run them: the verify step proves them (`SYNC:verify-last-order`).
4. Write the report incrementally to `tmp/reports/test-review-<YYMMDD>-<HHmm>-<slug>.md`:

```markdown
# Test Review — {scope}

Verdict: PASS | NEEDS_WORK | BLOCKED

## Layer Matrix
| Layer | Applicable (evidence) | Owner | Changed behaviors | Covering tests | Gaps | Findings | Verdict |

## Coverage Rows
## Findings
## Spec sync
## Limits (unverified layers, environment blocks, assumptions)
```

5. Return to the caller the verdict, the matrix and one line for the pull-request body: `Test review: <verdict> — unit <covered>/<behaviors>, integration …, E2E …, performance …, seed …; gaps: <none | list with owners>`.

PASS requires every applicable layer judged, no open MEDIUM+ test finding, and every gap left either fixed or accepted by the user with an owner (disclosed, never silent).

## Test skill map

Every test-related skill and agent, by need. Use the registered skill; a generic equivalent only when none fits.

| Need | Skill or agent |
| --- | --- |
| Choose a project's test layers and execution contract | [`$architecture --mode=design`](../architecture/SKILL.md), [`$harness-setup`](../harness-setup/SKILL.md) (Phase E, `--mode=readiness`), [`$scaffold`](../scaffold/SKILL.md) |
| Start a new project with its test foundation | [`$workflow-greenfield-init`](../workflow-greenfield-init/SKILL.md) |
| Mechanical checks beside tests | [`$linter-setup`](../linter-setup/SKILL.md) |
| Write, review and sync test cases in a spec | [`$spec`](../spec/SKILL.md) (`[mode=tests]`, `[mode=sync]`), [`$work-item --mode=review --type=spec-tests`](../work-item/SKILL.md), [`$workflow-spec-sync`](../workflow-spec-sync/SKILL.md), [`$tech-spec`](../tech-spec/SKILL.md) |
| Integration tests: write, review, verify | [`$integration-test`](../integration-test/SKILL.md), [`$workflow-integration-test`](../workflow-integration-test/SKILL.md) |
| E2E tests: write, review, verify, demo | [`$e2e-test`](../e2e-test/SKILL.md), [`$workflow-e2e`](../workflow-e2e/SKILL.md), [`$e2e-demo`](../e2e-demo/SKILL.md), [`$experience-review`](../experience-review/SKILL.md), [`$playwright-cli`](../playwright-cli/SKILL.md) (manual browser automation) |
| Performance tests and bottlenecks | [`$performance-test`](../performance-test/SKILL.md), [`$performance-review`](../performance-review/SKILL.md) |
| Test and QC data | [`$seed-test-data`](../seed-test-data/SKILL.md), [`$workflow-seed-test-data`](../workflow-seed-test-data/SKILL.md) |
| Run the suites and summarize | [`$test`](../test/SKILL.md) |
| A failing or flaky test | [`$investigate --mode=debug`](../investigate/SKILL.md), [`$fix`](../fix/SKILL.md) (`--target=test`), [`$workflow-bugfix`](../workflow-bugfix/SKILL.md) |
| Review a change (calls this skill) | [`$changes-review`](../changes-review/SKILL.md), [`$workflow-review-changes`](../workflow-review-changes/SKILL.md), [`$pr-review`](../pr-review/SKILL.md), [`$pull-request`](../pull-request/SKILL.md), [`$commit-review`](../commit-review/SKILL.md) |
| Specialist agents | [`tester`](../../agents/tester.md), [`integration-tester`](../../agents/integration-tester.md), [`e2e-runner`](../../agents/e2e-runner.md), [`performance-tester`](../../agents/performance-tester.md) |

## Project rules

Before Step 1, resolve project overlays targeting `test-review` (the project skill-protocol registry) and apply them on top; they add rules and never waive one here. A project's test reference docs (integration, E2E, performance, seed data) and `.claude/docs`-level conventions outrank generic examples in this skill. Conflicts between an overlay and this skill are surfaced, never silently resolved.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `tc-test-join-evidence` — Prove that a test case resolves to an executing test; linking test cases to test evidence → .claude/skills/shared/protocols/tc-test-join-evidence.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `test-review-gate` — Every review of a change reviews its tests per layer through one owner; reviewing a change, a branch, a pull request or a commit, or the tests of one → .claude/skills/shared/protocols/test-review-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:test-review-gate:reminder -->

**IMPORTANT MUST ATTENTION** every review of a change runs `$test-review` on the whole target — static, `N/A` with the inspected paths when nothing testable changed: a per-layer coverage matrix of each changed behavior (unit, integration, E2E, performance, seed data, applicable only from evidence), each layer judged by its one owner's review mode, every covering test naming its intent and the break it catches, flaky patterns fixed at their cause (never a retry, skip or longer timeout), and spec ↔ tests ↔ code triangulated. An untested changed behavior is HIGH, and so is a flaky pattern in a new or changed test or in the only proof of a changed behavior.

<!-- /SYNC:test-review-gate:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** every changed behavior covered at each applicable layer by a test that names its intent, catches its break and runs the same way every time; spec, tests and code in agreement.

- **MUST ATTENTION — MAIN STEPS:** scope/triage (`N/A` fast path) → coverage matrix → layer owners → cross-layer quality and flaky patterns → spec sync → validate → report or caller-owned fix.
- **MUST ATTENTION** one owner per layer: unit here, integration/E2E/performance/seed data through their `--mode=review`; never PASS a layer that applies but was not judged.
- **MUST ATTENTION** static review only; `--prove-tests` from a review-only caller with no later verify step is the one exception, and then this skill owns that review's single test run.
- **NEVER** accept a retry, skip, widened timeout, weakened assertion or a coverage percentage as a fix or proof; an untested changed behavior is HIGH, and so is a flaky pattern in a new or changed test or in the only proof of a changed behavior.
- **MUST ATTENTION** return the `Test review:` and `Spec sync:` lines so a pull request can record them.
