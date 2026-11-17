---
id: pr-docs-sync
kind: notice
title: Pull requests now sync docs on every run and fail on a stale impacted doc unless the user bypasses
added: 2026-11-17
---

`/pull-request` now runs `/docs-manager --mode=update` over every pull request's changes (the branch plus
staged, unstaged and untracked files) before review and commit, then runs the new local check
`node .claude/scripts/docs-staleness-check.cjs`. The check maps the changed files to the docs they can make
stale, through the same routing `/docs-manager` uses, and fails for each impacted doc the change neither
updates nor had verified fresh by `/docs-manager` for that exact change. Each failure names the doc, the
changes that require it and the fix. It reads one diff, never fetches and starts no app. Only the user's
explicit request bypasses it, with a reason the PR body records as
`Docs staleness: bypassed at user request — <reason>`. `/pr-review` reports a failing check as a finding.

Nothing to run. Tell the user that pull requests may now include doc updates, and that a bypass needs their
explicit request.
