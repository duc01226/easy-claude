# Phase 2: Add Spec Steps to Feature/Refactor Workflows

## Context

Feature, refactor, batch-operation, quality-audit, and performance workflows modify code but never update test specs after implementation. While less critical than fix workflows (no regression TCs needed), spec drift causes feature docs Section 17 to go stale.

## Overview

Insert `tdd-spec` + `tdd-spec-review` + `test-specs-docs` into 5 workflow sequences in `.claude/workflows.json`. Feature gets dual-mode: CREATE before cook + UPDATE after cook (validated decision).

## Key Insights

- The `feature` workflow already has a variant (`feature-with-integration-test`) that includes tdd-spec in CREATE mode before implementation. This phase adds UPDATE mode after implementation to catch spec gaps.
- For refactor, UPDATE/VERIFY mode confirms behavioral preservation by checking existing TCs still match.
- batch-operation touches many files -- spec update ensures bulk changes are tracked.
- quality-audit fixes quality issues that may affect test behavior.

## Requirements

1. feature: Insert `tdd-spec` CREATE + `tdd-spec-review` + `plan` + `plan-review` BEFORE `cook`, AND `tdd-spec` UPDATE + `tdd-spec-review` + `test-specs-docs` AFTER `cook` (dual-mode validated decision)
2. refactor: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `code` (index 6), before `code-simplifier` (index 7)
3. batch-operation: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `code` (index 4), before `code-simplifier` (index 5)
4. quality-audit: Insert `tdd-spec`, `tdd-spec-review` after `code` (index 4), before `review-changes` (index 5)
5. performance: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `code` (index 5), before `test` (index 6)

## Alternatives Considered

### Alternative 1: Only add spec steps to feature (skip refactor/batch-op/quality-audit)

- Pro: Minimal change, lowest risk
- Con: Refactors that accidentally change behavior go undetected; batch operations could break TCs silently
- **Rejected:** The whole point is making specs a living source of truth across ALL code-modifying workflows

### Alternative 2: Add full test-specs-docs to all 4 workflows

- Pro: Maximum dashboard consistency
- Con: Refactors should not change observable behavior -- dashboard sync adds ceremony for no benefit. Quality-audit is already a heavyweight workflow.
- **Rejected:** YAGNI for refactor and quality-audit. Dashboard sync is only valuable when TCs change content, not when they are merely verified.

## Design Rationale

- `test-specs-docs` is included for `feature` (behavioral changes) and `batch-operation` (bulk behavioral changes) but excluded for `refactor` (no behavioral change expected) and `quality-audit` (code quality fixes, not feature changes).
- Insertion point is always after the implementation step (cook/code) and before code-simplifier/review-changes. This captures the implementation intent before simplification obscures it.

## Architecture

No new components. Same pattern as Phase 1 -- existing tdd-spec UPDATE mode and workflow step tracker handle everything.

## Implementation Steps

### 1. Edit feature sequence (workflows.json:330-348)

**Current:**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "cook",
  "code-simplifier",
  "review-changes",
  "code-review",
  "sre-review",
  "security",
  "performance",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

**New (dual-mode: CREATE before cook + UPDATE after cook):**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "tdd-spec",
  "tdd-spec-review",
  "plan",
  "plan-review",
  "cook",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "code-simplifier",
  "review-changes",
  "code-review",
  "sre-review",
  "security",
  "performance",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

**Note:** Feature now has 25 steps (was 18). The first `tdd-spec` (CREATE mode) writes specs before implementation, followed by a re-plan cycle to incorporate test strategy. The second `tdd-spec` (UPDATE mode) catches implementation gaps post-cook. This matches the `feature-with-integration-test` pattern minus the `integration-test` step.

**Differentiation from feature-with-integration-test:** `feature` = specs + no integration test code generation. `feature-with-integration-test` = specs + integration-test code generation step.

### 2. Edit refactor sequence (workflows.json:452-468)

**Current:**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "code",
  "code-simplifier",
  "review-changes",
  "code-review",
  "sre-review",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

**New (with test-specs-docs — validated safety net):**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "code",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "code-simplifier",
  "review-changes",
  "code-review",
  "sre-review",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

### 3. Edit batch-operation sequence (workflows.json:549-561)

**Current:**

```json
[
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "code",
  "code-simplifier",
  "review-changes",
  "sre-review",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "code",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "code-simplifier",
  "review-changes",
  "sre-review",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

### 4. Edit quality-audit sequence (workflows.json:690-699)

**Current:**

```json
[
  "code-review",
  "plan",
  "plan-review",
  "plan-validate",
  "code",
  "review-changes",
  "test",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "code-review",
  "plan",
  "plan-review",
  "plan-validate",
  "code",
  "tdd-spec",
  "tdd-spec-review",
  "review-changes",
  "test",
  "watzup",
  "workflow-end"
]
```

### 5. Edit performance sequence (workflows.json:757-767)

**Current:**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "code",
  "test",
  "sre-review",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "scout",
  "investigate",
  "plan",
  "plan-review",
  "plan-validate",
  "code",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "test",
  "sre-review",
  "watzup",
  "workflow-end"
]
```

## Todo

- [ ] Edit feature.sequence — dual-mode: CREATE tdd-spec before cook + re-plan + UPDATE tdd-spec after cook
- [ ] Edit refactor.sequence — insert tdd-spec, tdd-spec-review, test-specs-docs after code
- [ ] Edit batch-operation.sequence — insert tdd-spec, tdd-spec-review, test-specs-docs after code
- [ ] Edit quality-audit.sequence — insert tdd-spec, tdd-spec-review after code
- [ ] Edit performance.sequence — insert tdd-spec, tdd-spec-review, test-specs-docs after code
- [ ] Validate JSON after all edits

## Success Criteria

1. All 5 sequences contain `tdd-spec` and `tdd-spec-review` after their implementation step
2. feature gets dual-mode (CREATE before cook + UPDATE after cook) with re-plan cycle
3. All 5 include `test-specs-docs` (validated: refactor as safety net, quality-audit excluded)
4. workflows.json remains valid JSON
5. Step counts: feature 25 (was 18), refactor 19 (was 16), batch-operation 15 (was 12), quality-audit 11 (was 9), performance 13 (was 10)

## Risk Assessment

| Risk                                                        | Likelihood | Impact | Mitigation                                                                  |
| ----------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Feature workflow becomes long (25 steps)                    | LOW        | MEDIUM | Still shorter than big-feature (32 steps); differentiated from feat-w-integ |
| Feature near-identical to feature-with-integration-test     | MEDIUM     | MEDIUM | Explicit differentiation: feature has NO integration-test code gen step     |
| Refactor tdd-spec detects false positives                   | LOW        | MEDIUM | UPDATE mode only flags changes, user reviews via tdd-spec-review            |
| batch-operation spec update takes too long on large batches | LOW        | MEDIUM | tdd-spec only checks changed TCs, not all TCs                               |
| Performance optimizations rarely need spec updates          | LOW        | LOW    | tdd-spec UPDATE will simply find no gaps and complete quickly               |
