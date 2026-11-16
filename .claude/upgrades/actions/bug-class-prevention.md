---
id: bug-class-prevention
kind: notice
title: Every bug fix now ends with a bug-class prevention task, and workflow closes check its record
added: 2026-11-17
covers:
  - workflow:workflow-bugfix@52575d2bc61b
  - workflow:workflow-review-changes@47b67b23d8c2
mergeNotes:
  - .claude/skills/fix/references/post-fix-lesson-check.md: upstream removed it; references/mode-prevent.md replaces it, so carry any project edits there instead of keeping the old file
  - .claude/workflows.json: keep the project's own steps; bugfix-prevent (after bugfix-fix) and prevent-recurrence (after fix-findings) are additive, with the recurrence-guarded outcome gate
  - .claude/hooks/review-commit-gate.cjs: keep the project's review rules; the prevention line runs only after the review check allows a commit and never blocks on its own fault
  - .claude/hooks/skill-overlay-remind.cjs: keep the project's overlay changes; recordFixActivation is additive
---

The advisory post-fix lesson check is replaced by a required bug-class prevention task (`/fix --mode=prevent`).
After every fix the assistant names the bug class from a closed list (for example `state-transition`,
`concurrency-ordering`, `idempotency-replay`), asks why the class can happen at all, reports sibling
instances without fixing them silently, and adds the strongest affordable guard (impossible by design,
then an automatic check with a frozen baseline, a test, a hook, and a `/learn` lesson last, only with
consent). It writes one small prevention record under `tmp/prevention/records/`, checked by
`node .claude/hooks/lib/prevention-record.cjs check`. `workflow-bugfix` runs it as a gate right after the
fix and its close requires the new `recurrence-guarded` outcome; `workflow-review-changes` runs it only
after fixing a behavior defect; a direct `/fix` creates it at its start. When a fix ran and no valid record
followed it, the commit gate adds one warning line (a refusal only under `reviewGate.verify: enforce`).

When no guard is affordable (a one-line typo, a bigger refactor planned separately), the record says so in
one line: `"outcome": "no-guard"` with a `reason` and an `owner` (the person, team, ticket or planned
change that decides on the class later). A fix that repaired no behavior defect (style, naming, docs) records `"outcome": "not-applicable"` with a `reason`; that clears the commit line but never satisfies `recurrence-guarded`. Nothing to run now; tell the user what the next fix will ask.
