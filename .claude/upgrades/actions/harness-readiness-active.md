---
id: harness-readiness-active
kind: notice
title: Feature, bug-fix and spec workflows now check the project's checks first
added: 2026-11-17
covers:
  - workflow:workflow-bugfix@93ec79ac75fc
  - workflow:workflow-feature@5435e5bd2974
  - workflow:workflow-implement-spec@e139ee8e7307
mergeNotes:
  - ".claude/workflows.json: keep the optional harness-readiness first step of workflow-feature, workflow-bugfix and workflow-implement-spec"
  - ".claude/skills/integration-test/SKILL.md: keep the no-test-project route to /harness-setup --mode=readiness instead of the old stop"
---

From this version on, `workflow-feature`, `workflow-bugfix` and `workflow-implement-spec` start with an
optional readiness step. It runs `node .claude/scripts/harness-readiness.cjs --json`, a sub-second check
that reads only the project config, the committed harness inventory and the manifests. When a formatter,
linter, type check or test runner is missing or not yet proven, the step asks once, in plain words, whether
to set them up; when every check is proven (or declined or not applicable in the inventory), the step is
skipped and costs nothing else. In a repository the team owns (a code-owners file, a CI pipeline or the team's own
shared lint config) it only proposes the setup and writes nothing. A bug fix in a project with no test
project now gets that offer, or a regression test with the language's built-in runner, instead of a stop.

Nothing to do now. Tell the user what changed and how to decline: answer "Not now" when the offer
appears, which records the answer on this machine for 7 days
(`node .claude/scripts/harness-readiness.cjs --record=declined --reason "<why>"` does the same), or mark a
check `declined` in `harness-inventory.md` to settle it for the whole team. Direct requests, single skills
and follow-ups in a running session get no readiness offer.
