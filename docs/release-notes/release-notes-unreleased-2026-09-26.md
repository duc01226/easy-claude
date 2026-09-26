# Orient One Framework Update — easy-claude `.claude` skills framework

**For:** the Orient One project

**Date:** 2026-09-26
**Version:** unreleased (uncommitted working tree on top of `728a9cbe`)
**Status:** Draft
**HTML presentation:** `release-notes-unreleased-2026-09-26.html` (same folder)

---

## Summary

Orient One uses the easy-claude `.claude` skills framework to guide Claude through its development work. This update covers both ends of a change. At the start, design work begins from the user's journeys, and you pick the design direction from 1–3 rendered drafts, or skip mockups. In between, far more workflow steps state when they apply and why they may be skipped, reviews are sized to the change, and starting a workflow injects 61% less text. At the end, `/pull-request` takes pending work to a reviewed, CI-green pull request that is ready to merge. In total: 4 new capabilities, 4 changed behaviors, and 2 fixes.

## What's New

- **Journey-first design gate, UX-1 to UX-11 (Design).** Before any mockup, design spec, UI review or UI code, Claude writes a Journey Report: actors and jobs, 3–5 ranked journeys, step tables and derived requirements.
    - It then reads the project's design authority, designs, walks each journey, measures interaction cost and wayfinding, and closes with a UI/UX Gate Report. Depth scales with scope.
    - When the main user, their job or the success outcome can only be guessed, it asks you to confirm before designing. When nobody can be asked, it records the guess as unconfirmed and continues.
    - Catalog: `.claude/docs/ux-journey-process.md`.
- **Pick your mockup direction (Design).** `pbi-mockup --explore` and `/design --mode=explore` first ask for 3, 2 or 1 options, or skip, with a recommendation by scope.
    - The drafts are rendered with `html-export` and opened in the browser. You then pick, with the recommended option listed first and its evidence.
    - With no question tool, Claude builds one draft and records `AUTO-SELECTED` with the reason.
    - This runs in the Feature, Bug Fix (M+ with new UI), Big Feature, Idea to PBI and Spec to Mockup workflows.
    - The HTML page shows three example drafts for Orient One's My Team › Approvals.
- **`workflow-spec-to-mockup` (Workflows).** Spec → design spec → design review (gate) → explore mockup → render → UI review (gate) → optional spec link → close. It stops before any PBI or code. Activation: `auto`.
- **`/pull-request` (Git).** One command: branch (when on the target branch or a detached HEAD) → stage everything except secret-like files → `/workflow-review-changes --fix-loop` over the whole branch → tests → commit through the `commit` skill → push → non-draft PR → CI fix loop until green → stop at ready to merge.
    - It asks nothing, and it never merges, auto-merges, force-pushes or pushes to the target branch.
    - The `commit` skill now routes PR requests here.

## Improvements

- **Triage-driven steps (Workflows).** Measured across all workflows (20 before, 21 after):
    - Optional steps with a written `when` and `skipReason`: 47 → 140.
    - Gates: 50 → 62.
    - Steps with no written rule: 241 → 147.
    - Role tags and the skip log (`tmp/workflow-runs/<runId>/skips.md`) already existed; what changed is how many steps carry a rule.
    - Bug Fix's failing regression test and Refactor's new baseline test run are now gates.
- **Reviews sized to the change (Review).** `/changes-review` triages XS–XL first and no longer forces the "switch workflow?" and "next steps?" menus.
    - `/workflow-review-changes` runs the architecture, performance, security and production-readiness reviewers only when the triage selects them.
    - Nested reviewers run `--report-only`, with no prompts and no edits.
    - `/fix --target=review` is new.
- **Start-up context down 61% (Workflows).** `injectContext` across all workflows went from 146,545 to 57,436 characters. Each workflow's SKILL.md now owns the detail and must be read before tasks are created.
- **Refactor proof-first (Workflows).** The tests run first to prove a green baseline, and safety-net tests are written before code moves.

## Bug Fixes

- **A missing PyYAML now prints an install command instead of a Python traceback (Scripts).** Covers `generate_catalogs.py` and `scan_skills.py`. The message includes the PowerShell form on Windows and a venv recipe for externally managed Pythons.
- **File conventions and doc-sync now apply on macOS and in symlinked checkouts (Hooks).** Before, in-project files reached through a symlink were treated as outside the project. `doc-impact-map.cjs` gets the same fix.

## Technical Details

- **Git prompts:** confirmation prompts removed from `.claude/settings.json` for `git branch -D`, `git checkout -- <path>` and `git restore` (including `git restore .`), to give the agent more autonomy and fewer interruptions. `CLAUDE.md` Git rule 5 still asks the agent to confirm before discarding uncommitted work.
- **`/pull-request` target:** it targets `main`, which is Orient One's default branch, so no setting is needed.
- **Review report name:** the change-review report is now `tmp/reports/changes-review-*.md`.
- **Change size:** 167 files changed (61 generated mirrors), including 11 new untracked files; +8,886 / −8,563 lines. Skills 126 → 128, workflows 20 → 21.
- **Workflow guides:** all 21 follow one template (20 rewritten, 1 new). The 20 existing guides went from 4,939 to 3,844 lines (−22%) and from 573,664 to 543,655 bytes (−5.2%). `changes-review/SKILL.md` went from 2,397 to 1,317 lines.
- **Report-only mode:** added to the architecture, domain-entity, production-readiness, integration-test, UI and code-simplifier reviewers.
- **New config key:** `pullRequest.targetBranch` (optional, default `main`, empty value rejected).
- **Tests on Windows 11, re-run on 2026-09-26 after the latest edits:**
    - Full hook suite: 996 passed, 0 failed, 4 skipped (1,000 total).
    - Codex workflow-order check (wf-cycle): pass.
    - PyYAML preflight: 9/9.
    - Symlink contract: 5/5.

## Before Release

1. No tests yet for `/pull-request`, commit→PR routing, the ask list, `--report-only`, or the mockup scope gate.
2. Two test limits were loosened:
    - `round3-prompt-contract.test.mjs:390`: from exactly 5 copies to at least 2.
    - The schema-output line cap in `test-lib-modules-extended.cjs`: from 590 to 620.
3. Align the design precedence wording between CLAUDE.md's DESIGN-GATE (brief first) and the UX gate (product decisions and design system first).

---

_Analysis: `tmp/release-notes/worktree-2026-09-26/release-analysis.md`. Verification: `tmp/release-notes/verify/claims-*.md`._
