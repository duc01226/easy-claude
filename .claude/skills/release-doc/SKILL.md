---
name: release-doc
version: 2.0.0
description: '[Documentation] DEPRECATED — use /release-notes instead for any release document or release notes, at any scope.'
status: deprecated
deprecated_by: release-notes
deprecated_since: 2026-09-08
removal_after: 2026-12-07
---

## Quick Summary

**This skill is DEPRECATED. Do not execute it.** Its entire capability was merged into **`release-notes`** on 2026-09-08.

**What to do instead — always:** invoke `/release-notes`, passing through whatever scope the user gave.

| The user asked for                        | Old invocation                     | Use this instead                     |
| ----------------------------------------- | ---------------------------------- | ------------------------------------ |
| "what changed in the last 30 days"        | `/release-doc --days 30`           | `/release-notes --days 30`           |
| Changes since a date                      | `/release-doc --since 2026-03-15`  | `/release-notes --since 2026-03-15`  |
| A ref range                               | `/release-doc --range v1.0.0..HEAD`| `/release-notes --range v1.0.0..HEAD`|
| A focused analysis                        | `/release-doc --focus "hooks"`     | `/release-notes --focus "hooks"`     |
| Release notes between two tags            | `/release-notes v1.0.0 HEAD`       | unchanged                            |

Every flag is accepted verbatim by `release-notes` — this is a rename, not a behavior change.

## Why the merge

The two skills covered one job (read a git range → categorize → narrate → publish) and differed only in how the range was expressed. Maintaining both meant two routing decisions for users, two places for the HTML presentation procedure to drift, and a real risk of picking the wrong one. `release-notes` is the surviving name because it is the phrase people actually use and it already owned the `lib/*.cjs` pipeline, `config.yaml`, and `README.md`.

`release-notes` absorbed, unchanged:

- Time-range scope resolution (`--days N`, `--since DATE`, `--range base..head`)
- Mandatory git-artifact dumping before any analysis
- Thematic area categorization for non-conventional-commit histories
- The `--focus "..."` deep-dive with its own output section
- The rich HTML release presentation (`references/html-release-report.md`, now at `.claude/skills/release-notes/references/html-release-report.md`) — **default-on**, with real-UI mock-ups and auto-open

## Lifecycle

Per **ADR-0001** (`docs/adr/0001-skill-lifecycle.md`): `status: deprecated`, superseded by `release-notes`, retained until `removal_after: 2026-12-07` for muscle memory, then eligible for `skill-gc.cjs`. The GC tool refuses to delete while non-self references remain, so removal is fail-safe.

**If you are an agent that routed here:** re-route to `release-notes` and continue. Do not ask the user which skill to use — there is only one.
