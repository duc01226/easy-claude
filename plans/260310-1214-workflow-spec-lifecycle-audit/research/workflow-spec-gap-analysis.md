# Workflow Spec Gap Analysis

## Summary

Analyzed all 48 workflows in `.claude/workflows.json` to identify code-modifying workflows missing `tdd-spec` (UPDATE mode) steps. The `test-spec-update` workflow (line 1086) serves as the reference pattern for post-change spec maintenance.

## Reference Pattern: test-spec-update (workflows.json:1086-1101)

```
review-changes -> tdd-spec -> tdd-spec-review -> test-specs-docs -> integration-test -> test
```

Key: tdd-spec uses UPDATE mode -- diffs existing TCs against current code, adds regression TCs for bugfixes.

## Workflows Already Having Spec Steps

| Workflow                      | Has tdd-spec? | Notes                                                |
| ----------------------------- | ------------- | ---------------------------------------------------- |
| tdd-feature                   | Yes           | TDD-first (CREATE mode before implementation)        |
| feature-with-integration-test | Yes           | CREATE mode before cook, plus integration-test after |
| big-feature                   | Yes           | CREATE mode in planning phase                        |
| greenfield-init               | Yes           | Two rounds of tdd-spec (pre and post implementation) |
| test-spec-update              | Yes           | The UPDATE mode reference workflow                   |
| pbi-to-tests                  | Yes           | CREATE mode for new PBI                              |

## Workflows Missing Spec Steps (Code-Modifying)

### HIGH PRIORITY -- Fix-oriented (must generate regression TCs)

| Workflow     | Current Sequence (workflows.json line)           | Insertion Point                         |
| ------------ | ------------------------------------------------ | --------------------------------------- |
| bugfix       | line 256-274: ...prove-fix -> code-simplifier... | After prove-fix, before code-simplifier |
| hotfix       | line 906-917: ...prove-fix -> test...            | After prove-fix, before test            |
| verification | line 664-678: ...prove-fix -> code-simplifier... | After prove-fix, before code-simplifier |

### MEDIUM PRIORITY -- Feature/refactor (should track spec coverage)

| Workflow        | Current Sequence (workflows.json line)      | Insertion Point                    |
| --------------- | ------------------------------------------- | ---------------------------------- |
| feature         | line 330-348: ...cook -> code-simplifier... | After cook, before code-simplifier |
| refactor        | line 452-468: ...code -> code-simplifier... | After code, before code-simplifier |
| batch-operation | line 549-561: ...code -> code-simplifier... | After code, before code-simplifier |
| quality-audit   | line 690-699: ...code -> review-changes...  | After code, before review-changes  |

## Steps to Insert Per Workflow

### Fix workflows (bugfix, verification):

- `tdd-spec` (UPDATE mode)
- `tdd-spec-review`
- `test-specs-docs`

### Hotfix (lean):

- `tdd-spec` (UPDATE mode)
- `tdd-spec-review`
- (No test-specs-docs -- keep hotfix minimal)

### Feature/refactor workflows:

- `tdd-spec` (UPDATE mode)
- `tdd-spec-review`
- `test-specs-docs` (for feature, batch-operation -- full dashboard sync)
- (No test-specs-docs for refactor, quality-audit -- keep lean)

## Files Requiring Changes

### Canonical Sources

1. `.claude/workflows.json` -- 7 workflow sequence arrays + 7 preActions.injectContext strings
2. `.claude/skills/workflow-bugfix/SKILL.md` -- Steps: line
3. `.claude/skills/workflow-hotfix/SKILL.md` -- Steps: line
4. `.claude/skills/workflow-verification/SKILL.md` -- Steps: line
5. `.claude/skills/workflow-feature/SKILL.md` -- Steps: line
6. `.claude/skills/workflow-refactor/SKILL.md` -- Steps: line
7. `.claude/skills/workflow-batch-operation/SKILL.md` -- Steps: line
8. `.claude/skills/workflow-quality-audit/SKILL.md` -- Steps: line
9. `.claude/docs/claude-ai-agent-framework-guide.md` -- Inline sequence catalog (lines 730-755)

### Mirrors (src/.claude/)

10. `src/.claude/workflows.json`
11. `src/.claude/skills/workflow-bugfix/SKILL.md`
12. `src/.claude/skills/workflow-hotfix/SKILL.md`
13. `src/.claude/skills/workflow-verification/SKILL.md`
14. `src/.claude/skills/workflow-feature/SKILL.md`
15. `src/.claude/skills/workflow-refactor/SKILL.md`
16. `src/.claude/skills/workflow-batch-operation/SKILL.md`
17. `src/.claude/skills/workflow-quality-audit/SKILL.md`
18. `src/.claude/docs/claude-ai-agent-framework-guide.md`

**Total: 18 files (9 canonical + 9 mirrors)**

## commandMapping Verification

- `tdd-spec` -- already mapped at workflows.json:200
- `tdd-spec-review` -- already mapped at workflows.json:204
- `test-specs-docs` -- NOT in commandMapping (only referenced in test-spec-update sequence)

Note: `test-specs-docs` lacks a commandMapping entry. This is acceptable because the workflow step tracker uses skill names directly. However, adding it to commandMapping would improve consistency. This is a minor enhancement, not a blocker.

## Risk Assessment

- **Stale mirrors**: MEDIUM likelihood, HIGH impact. Mitigation: grep after all edits.
- **Workflow bloat**: LOW. Adding 2-3 lightweight steps per workflow.
- **preActions token budget**: LOW. Additions are 2-3 lines of text.
- **test-specs-docs missing commandMapping**: LOW. Works via skill name resolution.
