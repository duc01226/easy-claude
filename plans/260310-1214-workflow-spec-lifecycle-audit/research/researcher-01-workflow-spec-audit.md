# Workflow Spec Lifecycle Audit

## Summary

- **Total Workflows:** 48
- **11** (23%) have spec-related steps
- **17** (35%) are code-modifying
- **12** (71% of code-modifying) lack spec steps — CRITICAL GAP

## Critical Gap: 12 Code-Modifying Workflows WITHOUT Specs

| #   | Workflow ID       | Code Steps | Spec Steps | Gap                                         |
| --- | ----------------- | ---------- | ---------- | ------------------------------------------- |
| 1   | `batch-operation` | code       | NONE       | Missing spec update after bulk changes      |
| 2   | `bugfix`          | fix        | NONE       | Missing regression TC after fix             |
| 3   | `deployment`      | code       | NONE       | Low priority (infra)                        |
| 4   | `feature`         | cook       | NONE       | Missing spec generation for new features    |
| 5   | `hotfix`          | fix        | NONE       | Missing regression TC after emergency fix   |
| 6   | `migration`       | code       | NONE       | Low priority (schema)                       |
| 7   | `package-upgrade` | code       | NONE       | Low priority (deps)                         |
| 8   | `performance`     | code       | NONE       | Low priority (optimization)                 |
| 9   | `quality-audit`   | code       | NONE       | Missing spec verify after quality fixes     |
| 10  | `refactor`        | code       | NONE       | Missing spec verify (behavior preservation) |
| 11  | `security-audit`  | —          | —          | Read-only, no code changes                  |
| 12  | `verification`    | fix        | NONE       | Missing spec update after fix               |

## Spec-Equipped Workflows (5 code-modifying)

| Workflow                        | Spec Steps                                        | Status                |
| ------------------------------- | ------------------------------------------------- | --------------------- |
| `big-feature`                   | tdd-spec, tdd-spec-review, integration-test       | FIXED (prior session) |
| `feature-with-integration-test` | tdd-spec, tdd-spec-review, integration-test       | FIXED (prior session) |
| `greenfield-init`               | tdd-spec ×2, tdd-spec-review ×2, integration-test | OK                    |
| `tdd-feature`                   | tdd-spec, tdd-spec-review, integration-test       | OK                    |
| `full-feature-lifecycle`        | test-spec                                         | OK (heavyweight)      |

## Non-Code Workflows (no spec need)

investigation, idea-to-pbi, idea-to-tdd, documentation, feature-docs, design-workflow, design-dev-handoff, ba-dev-handoff, dev-qa-handoff, qa-po-acceptance, po-ba-handoff, sprint-planning, sprint-retro, pm-reporting, release-prep, review, review-changes, research, business-evaluation, course-building, marketing-strategy, testing, e2e-from-changes, e2e-from-recording, e2e-update-ui, test-verify, test-to-integration, pbi-to-tests, test-spec-update, visualize

## Key Insight

The `test-spec-update` workflow already exists as a post-change spec sync pattern. The gap is that code-modifying workflows don't INCLUDE spec update steps in their own sequences.
