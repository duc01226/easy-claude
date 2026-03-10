---
title: "Workflow Spec Lifecycle Audit: TDD Specs as Living Source of Truth"
description: "Add tdd-spec steps to 8 code-modifying workflows that currently lack spec maintenance, ensuring test specs stay in sync with every code change."
status: validated
priority: high
effort: medium
branch: feature/workflow-spec-lifecycle
tags: [workflows, tdd, test-specs, quality]
created: 2026-03-10
---

# Workflow Spec Lifecycle Audit

## Problem

Of 48 workflows, only 5 have `tdd-spec` steps (all in CREATE mode for new features). **7 code-modifying workflows** produce code changes but never update existing test specs, causing spec drift. Fix-oriented workflows (bugfix, hotfix, verification) are the worst offenders -- they fix bugs but never generate regression TCs.

## Solution

Insert `tdd-spec` + `tdd-spec-review` + `test-specs-docs` steps into 8 workflows, following the `test-spec-update` pattern. Feature gets dual-mode (CREATE before cook + UPDATE after cook). Position: after code changes, before simplification/review.

## Evidence

- Reference pattern: `test-spec-update` workflow (`workflows.json:1086-1101`)
- tdd-spec UPDATE mode: `.claude/skills/tdd-spec/SKILL.md:90` -- "Diff existing TCs against current code/PR, find gaps, update both"
- 8 gaps identified: `workflows.json` lines 249-770 (see research/workflow-spec-gap-analysis.md)

## Phases

| Phase                                             | Description                                                               | Files                             | Priority |
| ------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------- | -------- |
| [Phase 1](phase-01-fix-workflows.md)              | Add spec steps to bugfix, hotfix, verification                            | 3 sequences + 3 preActions        | HIGH     |
| [Phase 2](phase-02-feature-refactor-workflows.md) | Add spec steps to feature, refactor, batch-op, quality-audit, performance | 5 sequences + 5 preActions        | MEDIUM   |
| [Phase 3](phase-03-preactions-context.md)         | Update preActions injectContext for all 8 workflows                       | 8 injectContext strings           | MEDIUM   |
| [Phase 4](phase-04-mirror-sync.md)                | Mirror sync: src/.claude + SKILL.md + framework guide                     | 10 mirrors + 8 SKILL.md + 1 guide | HIGH     |
| [Phase 5](phase-05-validation.md)                 | Hook tests, grep verification, catalog check                              | 0 code files (validation only)    | HIGH     |

## Scope

- **In scope:** 8 workflow sequence edits, 8 preActions updates, 10 mirror copies, 8 SKILL.md files, 1 framework guide
- **Out of scope:** Adding `test-specs-docs` to commandMapping (minor, separate task); new workflow creation; tdd-spec skill changes

## Total Files: 20 (10 canonical + 10 mirrors)

## Decision Log

| Decision                                       | Rationale                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| test-specs-docs for ALL workflows (validated)  | User wants dashboard always current across all workflow types                                  |
| Feature dual-mode: CREATE + UPDATE (validated) | CREATE before cook for spec-first, UPDATE after cook to catch gaps; re-plan cycle between      |
| Performance included (validated)               | Performance optimizations might change API contracts or response shapes                        |
| Insert after prove-fix (not after test)        | Spec update should happen while fix context is fresh, before simplification may obscure intent |

## Validation Summary

**Validated:** 2026-03-10
**Questions asked:** 4

### Confirmed Decisions

- **Feature spec mode:** Both CREATE (before cook) + UPDATE (after cook) — full spec lifecycle in standard feature workflow
- **Hotfix leanness:** Add test-specs-docs — user wants dashboard always current, even for emergencies
- **Refactor test-specs-docs:** Add as safety net — catches accidental behavioral drift
- **Performance workflow:** Add spec steps — performance optimizations might change API contracts

### Action Items (Plan Revisions Needed)

- [ ] Phase 2: Feature workflow needs tdd-spec + tdd-spec-review BEFORE cook (CREATE mode) AND after cook (UPDATE mode), plus a re-plan cycle between specs and cook (like feature-with-integration-test pattern)
- [ ] Phase 1: Hotfix sequence add test-specs-docs after tdd-spec-review
- [ ] Phase 2: Refactor sequence add test-specs-docs after tdd-spec-review
- [ ] Phase 2: Add performance workflow (new) — insert tdd-spec + tdd-spec-review + test-specs-docs after code step
- [ ] Phase 3: Update preActions count from 7 to 8 (add performance)
- [ ] Phase 4: Mirror count increases — add performance SKILL.md + mirror
- [ ] Update Decision Log to reflect validated choices
- [ ] Total workflows: 7 → 8; Total files: 18 → 20 (10 canonical + 10 mirrors)

### Decision Log Updates

| Original Decision                 | Validated Decision                           | Change               |
| --------------------------------- | -------------------------------------------- | -------------------- |
| No test-specs-docs for hotfix     | Add test-specs-docs to hotfix                | Phase 1 change       |
| No test-specs-docs for refactor   | Add test-specs-docs to refactor              | Phase 2 change       |
| Feature: UPDATE only (after cook) | Both CREATE + UPDATE (before and after cook) | Phase 2 major rework |
| Performance excluded              | Performance included                         | Phase 2 new scope    |

## Unresolved Questions

1. Should `test-specs-docs` be added to `commandMapping` for consistency? (recommendation: yes, separate PR)
