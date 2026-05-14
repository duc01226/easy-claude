# Code Analysis: Review Findings Fix

Date: 2026-05-15

## Scope

Fix validated findings from:

- `plans/reports/code-review-260514-2352-current-changes.md`
- `plans/reports/why-review-260515-findings-validation.md`

## Evidence Read

- `CLAUDE.md` requires search-first, task tracking, and graph checks before conclusions.
- `docs/project-reference/lessons.md` says mirror copies and derived docs are staleness traps.
- `docs/project-reference/integration-test-reference.md` says `test-all-hooks.cjs` is primary CI and does not delegate to `run-all-tests.cjs`.
- `docs/adr/0001-skill-lifecycle.md` defines deprecation and GC policy.
- `docs/adr/0002-canonical-count-metrics.md` defines count markers and live skill status filters.

## Implementation Decisions

1. Treat the deleted shortcut skills as a baseline cleanup exception, not a rollback target. This avoids restoring broad deleted user changes while making ADR-0001 explicit about the exception.
2. Make catalog/count generation use live `.claude/skills/*/SKILL.md` metadata where possible so count checks do not depend on stale `skills_data.yaml`.
3. Normalize volatile `last_updated` during `--check` comparisons so catalog checks do not fail just because the calendar date changed.
4. Add `.claude/SKILLS.yaml` and `count-drift` to the documented/primary test path by bridging the suite from `test-all-hooks.cjs`.
5. Fix Codex skill mention rewriting by requiring `/skill` mentions to start in command-like positions, not after path characters like `}`.
6. Regenerate Codex mirrors and count-bearing docs after source fixes.

## Graph Evidence

- `generate_catalogs.py` trace: OK, 506 nodes / 2570 edges.
- `scan_skills.py` trace: OK, 309 nodes / 2601 edges.
- `migrate-claude-to-codex.mjs` trace: OK, 444 nodes / 2052 edges.

## Concrete Tasks

- Patch `scan_skills.py` relative-path handling for absolute live scans.
- Patch `generate_catalogs.py` live skill loading and date-normalized check mode.
- Patch `skill-gc.cjs` no-arg dry-run behavior.
- Patch `compat-rewrite.mjs` and Codex migration tests for path separator preservation.
- Patch count-drift suite and primary hook runner bridge.
- Patch ADR/docs count references and regenerate generated artifacts.
