# Phase 1: Add Spec Steps to Fix-Oriented Workflows

## Context

Fix-oriented workflows (bugfix, hotfix, verification) produce bug fixes but never generate regression TCs. This is the highest-priority gap because regression TCs prevent the same bug from recurring undetected.

## Overview

Insert `tdd-spec` (UPDATE mode) + `tdd-spec-review` (+ `test-specs-docs` where appropriate) into 3 fix-oriented workflow sequences in `.claude/workflows.json`.

## Key Insights

- `tdd-spec` UPDATE mode (SKILL.md:90, 123-130): diffs existing TCs against code changes, adds regression TCs for bugfixes
- The `prove-fix` step produces evidence that the fix works -- ideal context for spec generation
- `test-spec-update` workflow (workflows.json:1086-1101) validates this pattern already works

## Requirements

1. bugfix: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `prove-fix` (index 8), before `code-simplifier` (index 9)
2. hotfix: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `prove-fix` (index 4), before `test` (index 5)
3. verification: Insert `tdd-spec`, `tdd-spec-review`, `test-specs-docs` after `prove-fix` (index 7), before `code-simplifier` (index 8)

## Alternatives Considered

### Alternative 1: Insert spec steps AFTER test (end of workflow)

- Pro: All code is finalized and tested before specs are written
- Con: Simplification may obscure original fix intent; spec becomes afterthought at workflow end
- **Rejected:** Context freshness matters -- the fix rationale is clearest right after prove-fix

### Alternative 2: Insert spec steps BEFORE prove-fix

- Pro: Spec is written before fix is validated
- Con: The fix might fail prove-fix and require rework, invalidating spec work
- **Rejected:** Wasted effort if fix needs revision

## Design Rationale

Inserting after `prove-fix` and before `code-simplifier` is optimal because:

1. The fix is proven to work (prove-fix passed)
2. The code hasn't been simplified yet -- original fix logic is still readable
3. This matches the test-spec-update pattern: review-changes -> tdd-spec -> tdd-spec-review

For hotfix, `test-specs-docs` is included per validation decision — user wants dashboard always current, even for emergency fixes.

## Architecture

No new components. Existing `tdd-spec` skill auto-detects UPDATE mode when existing TCs + code changes are present. The workflow step tracker already handles these step names.

## Implementation Steps

### 1. Edit bugfix sequence (workflows.json:256-274)

**Current:**

```json
[
  "scout",
  "investigate",
  "debug",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "fix",
  "prove-fix",
  "code-simplifier",
  "review-changes",
  "code-review",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "scout",
  "investigate",
  "debug",
  "plan",
  "plan-review",
  "plan-validate",
  "why-review",
  "fix",
  "prove-fix",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "code-simplifier",
  "review-changes",
  "code-review",
  "changelog",
  "test",
  "docs-update",
  "watzup",
  "workflow-end"
]
```

### 2. Edit hotfix sequence (workflows.json:906-917)

**Current:**

```json
[
  "scout",
  "plan",
  "plan-review",
  "fix",
  "prove-fix",
  "test",
  "review-changes",
  "sre-review",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "scout",
  "plan",
  "plan-review",
  "fix",
  "prove-fix",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "test",
  "review-changes",
  "sre-review",
  "watzup",
  "workflow-end"
]
```

### 3. Edit verification sequence (workflows.json:664-678)

**Current:**

```json
[
  "scout",
  "investigate",
  "test-initial",
  "plan",
  "plan-review",
  "plan-validate",
  "fix",
  "prove-fix",
  "code-simplifier",
  "review-changes",
  "code-review",
  "test",
  "watzup",
  "workflow-end"
]
```

**New:**

```json
[
  "scout",
  "investigate",
  "test-initial",
  "plan",
  "plan-review",
  "plan-validate",
  "fix",
  "prove-fix",
  "tdd-spec",
  "tdd-spec-review",
  "test-specs-docs",
  "code-simplifier",
  "review-changes",
  "code-review",
  "test",
  "watzup",
  "workflow-end"
]
```

## Todo

- [ ] Edit bugfix.sequence in workflows.json -- insert tdd-spec, tdd-spec-review, test-specs-docs after prove-fix
- [ ] Edit hotfix.sequence in workflows.json -- insert tdd-spec, tdd-spec-review after prove-fix
- [ ] Edit verification.sequence in workflows.json -- insert tdd-spec, tdd-spec-review, test-specs-docs after prove-fix
- [ ] Verify JSON validity after edits (node -e "JSON.parse(require('fs').readFileSync('.claude/workflows.json','utf-8'))")

## Success Criteria

1. All 3 sequences contain `tdd-spec` and `tdd-spec-review` after `prove-fix`
2. All 3 workflows include `test-specs-docs` (validated: user wants dashboard always current)
3. workflows.json remains valid JSON
4. Workflow step counts: bugfix 20 (was 17), hotfix 13 (was 10), verification 17 (was 14)

## Risk Assessment

| Risk                                         | Likelihood | Impact                      | Mitigation                                              |
| -------------------------------------------- | ---------- | --------------------------- | ------------------------------------------------------- |
| JSON syntax error from manual edit           | LOW        | HIGH (breaks all workflows) | Validate JSON after each edit                           |
| tdd-spec UPDATE mode fails to detect context | LOW        | MEDIUM                      | tdd-spec auto-detects mode from existing TCs + git diff |
| Workflow becomes too long for hotfix         | LOW        | LOW                         | Only 2 steps added; hotfix is still 12 steps (lean)     |
