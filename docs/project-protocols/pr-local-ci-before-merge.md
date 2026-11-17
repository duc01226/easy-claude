---
name: pr-local-ci-before-merge
description: Use when the pull-request skill prepares, readies or merges a PR in this repository — requires a local full CI run, the review fix loop and the docs-staleness check on the final head, each bypassed only on the user's explicit request.
target: pull-request
scope: exact
version: 1.3.0
updated: 2026-11-17
tags: [ci, merge-gate]
---

## Applies to

Every `pull-request` run in this repository: creating, finishing or readying a pull request, and any merge of it the user asks for afterwards.

## Rules

1. Before marking the PR ready, and again before any merge, run `node .claude/scripts/framework-ci.cjs --scope=full` on the PR's final head with no uncommitted changes (its `Tree:` line reads `(clean)`), after `git fetch origin` and with `origin/<target>` merged into the branch (no `Behind` line), and require exit 0. — why: GitHub CI is manual-only, so the local full run is this project's merge evidence.
2. Use `--scope=changed` only between iterations, and record it as advisory, never as merge evidence. — why: changed scope can miss suites that scan whole directories.
3. Run `/changes-review --fix-loop` over the whole branch after the last code change and before the final local run. — why: review fixes change code the local run must cover.
4. Record in the PR body: the head SHA, the command, the lane summary (lanes, pass/fail counts) and the review rounds. — why: reviewers cannot see local runs.
5. When the PR head or its target branch changes after the local run, run it again before merge. — why: evidence binds to one tree.
6. Only when the user explicitly asks in this session to bypass, naming the PR, may the local run (rule 1) or the review loop (rule 3) be left out; record `Local CI: bypassed at user request — <reason>` or `Review: bypassed at user request — <reason>` in the PR body. — why: a bypass must stay visible.
7. Dispatch GitHub CI only when the user asks, with `gh workflow run ci.yml -f scope=<changed|full> -f ref=<branch|sha|refs/pull/<n>/merge>`. — why: runner minutes are spent only on request.
8. When the PR changes how processes start, how paths are built or compared, or file permissions, ask the user before merge whether to dispatch `scope=full` on GitHub with `ref=refs/pull/<n>/merge`; when they decline, record the run URL and result in the PR body, or `Cross-OS: local <os> only — GitHub run declined` when they decline. — why: the local run covers one OS, and these changes break per OS.

9. Before marking the PR ready, and again before any merge, run `node .claude/scripts/docs-staleness-check.cjs --base=origin/<target>` on the final head and require exit 0; record its result in the PR body with the head SHA. Only the user's explicit request in this session bypasses it: then record `Docs staleness: bypassed at user request — <reason>`. — why: stale docs merge as silently as untested code, and the check binds to one tree.

## Rationale

This repository's GitHub workflow never runs on push, merge or pull request, to spend runner minutes only on request. The local full run (`framework-ci.cjs --scope=full`, the same lanes CI runs) and the whole-branch review loop are therefore what proves a pull request before it merges.

## Out of scope

- Waiving any framework gate: the `pull-request` skill's own review, test and confirmation gates still apply in full.
- Merging without the user's request: this overlay adds checks before a merge, it never authorizes one.
