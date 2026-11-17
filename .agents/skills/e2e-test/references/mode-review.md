# `$e2e-test --mode=review` — static E2E test quality review

> Read this reference in full for `$e2e-test --mode=review [--report-only | --loop-owner=caller] <scope>`. It replaces test authoring for the invocation. It reads E2E tests, fixtures, helpers and configuration and judges them; it never starts the application, never runs the E2E runner and never edits source, tests, fixtures, baselines or user data. Running the suite belongs to `$e2e-test --mode=verify`.

> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` before judging; it owns the scenario contract and the quality-gate rows applied below. `NOT-APPLICABLE` requires no executable E2E surface; a relevant surface whose configuration cannot be read is `ENVIRONMENT-BLOCKED`.

## Quick Summary

**Goal:** Tell the caller, from the test code alone, whether the E2E tests of a change cover each changed user journey with deterministic, isolated, traceable cases that would fail when the journey breaks.

**Workflow:** resolve scope and the project's E2E contract → list changed journeys → map each to its E2E cases → apply every applicable quality-gate row statically → check flaky patterns → report findings to the caller.

**Key Rules:**

- Static only: one read-only pass per invocation, no review loop. A caller passing `--loop-owner=caller` owns validation, fixes and the fresh re-review.
- Judge against the project's E2E reference doc and configured runner, locator organization and data policy; never impose a page-object model, runner or selector style the project does not use.
- A gate row that needs runtime evidence (rendered states, console capture, visual checks) is recorded `UNVERIFIED — needs $e2e-test --mode=verify`, never PASS.

## Steps

1. **Scope and contract.** Resolve the target from the caller. Read the project configuration's E2E execution profile and the project's E2E reference doc; record runner, test root, locator/action organization, auth mode, data mode and evidence policy, or the gap.
2. **Changed journeys.** From the diff and the governing spec's stories, criteria and cases, list each user journey the change adds or alters, including its failure, empty, permission and recovery states that apply.
3. **Coverage.** Map each journey to the E2E cases that exercise it through the real interface and assert its owned outcome, or record `TEST-GAP — <reason> — owner <name>`. A journey whose behavior a cheaper layer fully proves may name that layer.
4. **Quality-gate rows.** For every covering case, apply each applicable row of the shared protocol's quality gate statically — business intent, locator/action ownership, isolation and data, auth and permissions, accessibility/responsive/visual intent, async/wait determinism, failure evidence attached before interaction, cleanup of owned resources only, owner/case-to-test traceability — with `file:line` evidence. Rows that need a run are `UNVERIFIED`.
5. **Flaky patterns.** Check every covering case against `.claude/skills/test-review/references/flaky-test-patterns.md`: fixed sleeps for readiness, unbounded or retried waits, order dependence, shared accounts or data across workers, real-clock dependence. Each hit is a `FLAKY-RISK` finding with its cause-level fix.
6. **Validate and report.** Standalone, validate surviving findings with `$why-review --validate-findings <report>`; with `--loop-owner=caller` the caller's single validation of the merged report covers it. Write `tmp/reports/e2e-test-review-<YYMMDD>-<HHmm>-<slug>.md` and return: verdict (`PASS`, `NEEDS_WORK`, `UNVERIFIED`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`) — `PASS` covers the static rows only, and rows that need a run stay listed as `UNVERIFIED` for `--mode=verify`; the journey coverage rows, findings with severity, `file:line` and the break or cause each names, and the rows left `UNVERIFIED` for the verify mode.

## Severity

Severity follows `SYNC:severity-rubric` and the test-finding mapping in `SYNC:test-review-gate` item 9. E2E specifics: a case that asserts only navigation, a toast or runner bookkeeping instead of the owned outcome is a weak test; a missing traceability link is MEDIUM when a spec governs the journey.

## Closing Reminders

- **MUST ATTENTION** static, read-only, one pass: never start the app or the runner here; runtime rows are `UNVERIFIED` for `--mode=verify`.
- **MUST ATTENTION** read the shared E2E quality protocol first and judge with the project's own runner, locator and data conventions.
- **MUST ATTENTION** every changed journey is covered or named as a gap with an owner; a flaky pattern is fixed at its cause and blocks as `SYNC:test-review-gate` items 6 and 9 set (a new or changed test, or the only proof of a changed journey).
