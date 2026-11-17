---
name: test-review-framework-tests
description: Use when the test-review skill judges tests in this repository — adds the framework repository's own test conventions: owning test family, TC IDs, framework-repo guard, live source listing, pinned prose, cross-platform paths, suite totals and red-proof.
target: test-review
scope: exact
version: 1.0.0
updated: 2026-11-17
tags: [tests, review]
---

## Applies to

Every `test-review` run in this repository, standalone or called by `changes-review`, `workflow-review-changes`, `pr-review` or `pull-request`.

## Rules

1. Every new or changed rule in a skill, hook or script has a test in the family that owns it: hook behavior and skill or protocol prose → `.claude/hooks/tests/suites/*.test.cjs`; script libraries → `.claude/scripts/tests/`; Codex mirrors and policy → `.claude/scripts/codex/tests/`. A missing test is a `TEST-GAP`. — why: the aggregate runner and the CI lanes select tests by family.
2. A case that proves a spec rule carries its TC ID in its name, and the spec's Section 8 `CoveredBy` names that suite and case. — why: the TC-to-test join resolves by ID.
3. A test that asserts this repository's own skills, registry or docs skips in any other project through `.claude/hooks/tests/lib/framework-repo-guard.cjs`. — why: adopters run the same suites.
4. A test that lists source files uses `.claude/hooks/tests/lib/live-source-files.cjs` (the git listing), never a raw directory walk. — why: worktrees, fixtures and ignored folders turn a walk red.
5. A pinned-prose assertion matches a short fragment of the rule it guards and names that rule in the case name or a comment. Rewording a pinned sentence updates its pin in the same change, after a `git grep -F` of two or three short fragments across `.claude/hooks/tests` and `.claude/scripts`. — why: pins are regexes that start mid-sentence.
6. Paths go through `node:path`, text is matched after normalizing line endings, and no test depends on the host OS, shell or locale. — why: CI runs on Windows, macOS and Linux.
7. A new suite file updates the documented suite and test totals that the count-drift guard checks. — why: the aggregate count guard fails otherwise.
8. A new test is proven red once: break the guarded text or code in a copy, confirm the named case fails, restore from the copy and confirm a clean diff. — why: a pin that cannot fail protects nothing.
9. Merge evidence runs the test families one after another (`node .claude/scripts/framework-ci.cjs --scope=full`), never in parallel. — why: the families share the live tree, and a parallel run fails with a false `ENOENT`.

## Rationale

This repository's "code" is mostly skill, protocol and registry text plus the hooks and scripts that deliver it. Its tests are structural pins and behavior suites run by one aggregate runner and a manual-only CI, so a test that cannot fail, that only passes here, or that breaks on another OS ships as silently as missing coverage.

## Out of scope

- Waiving or relaxing any rule of the `test-review` skill or the shared test protocols.
- Running tests: the review stays static; execution belongs to the verify step and `framework-ci.cjs`.
