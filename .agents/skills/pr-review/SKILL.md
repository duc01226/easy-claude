---
name: pr-review
description: '[Code Quality] Use when asked for a final or full review of a pull request or branch, or to check a branch before marking its PR Ready. Reviews the whole branch against its target, fixes findings in at most three rounds, then lists the Ready checklist. One commit: commit-review.'
metadata:
  instruction-profile: concise
---

Final whole-branch review. It reviews, fixes and reports; it never marks a PR Ready, merges or arms auto-merge.

1. **Load project rules.** Reuse project instructions already in context (including root `CLAUDE.md`) and apply any project overlay matching `pr-review`. Resolve only the configuration keys and linked reference sections needed for the reviewed diff; honor project section pointers instead of loading whole reference documents. These rules add checks and the Ready checklist, never authority.
2. **Scope.** Fetch the target branch (an open PR's base, else `pullRequest.targetBranch`, else `main`) and review `$(git merge-base HEAD origin/<target>)..HEAD` plus uncommitted changes: the whole diff that will merge, never only the last commit. Read every changed file and the callers of changed functions.
3. **Review** the project's rules first, then correctness, security, test strength and needless complexity. Report each finding with file, line, severity and a concrete failure.
4. **Fix loop.** Fix validated findings inside the branch's scope, then review the whole updated diff again. Three rounds at most. Do not reopen decisions the user accepted, do not raise a finding already fixed, and stop early when a round finds only LOW or repeated findings.
5. **Report** briefly: findings fixed, findings left with severity, rounds used, and each Ready checklist item the project's instructions name, with its state — done, skipped or missing.

Then stop and wait for an explicit yes before `gh pr ready`, merging or auto-merge.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (purpose: one place per change — reuse first, one owner per rule, interface/DI at volatile boundaries, adapter/wrapper for libraries, factory/strategy for real variants, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red? Full gate: `.claude/skills/shared/protocols/core-engineering-principles.md`.

<!-- /SYNC:core-engineering-principles:reminder -->
