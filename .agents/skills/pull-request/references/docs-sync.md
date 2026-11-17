# Pull request — docs sync and the docs-staleness check

Read this before Step 3.4 and again before Step 7 opens or readies the pull request. It owns how a pull request keeps project docs in step with its changes; `SKILL.md` names when it runs.

**Rules first:**

- Every pull-request run calls `$docs-manager --mode=update` over the pull request's changes, then requires `node .claude/scripts/docs-staleness-check.cjs` to pass. Neither depends on the risk tier, and neither asks the user.
- Only the user's explicit request bypasses the check, with their reason recorded in the PR body. Never bypass because the check is noisy, slow or inconvenient.
- The check is local evidence: it reads one diff, never fetches and starts no app.

## 1. Sync docs over the pull request's changes

1. Resolve the base: the target from Step 1 as `origin/<target>`, already fetched by Step 2.
2. Run `$docs-manager --mode=update` with `base=origin/<target>` and `changed_files` set to the branch's changes plus local ones: `git diff --name-only --no-renames --relative <merge-base>` (staged and unstaged; `--no-renames` lists a moved file under its old and new paths, as the staleness check counts it) and `git ls-files --others --exclude-standard`, where `<merge-base>` is `git merge-base origin/<target> HEAD`. Run it inline with the host's skill mechanism, in the main session.
3. Its edits are candidate changes: stage them with the rest (Step 3), so Steps 3.5–5 test and review them with the branch.
4. For each impacted doc it verified and left unedited, docs-manager records the verdict (`docs-staleness-check.cjs record --fresh=<doc>`), as its update mode says. A doc it could not verify stays unrecorded and fails the check.

## 2. Run the docs-staleness check

```text
node .claude/scripts/docs-staleness-check.cjs --base=origin/<target>
```

- It maps every changed file (branch, staged, unstaged and untracked) to the docs it can make stale through `.claude/scripts/doc-impact-map.cjs`, including the feature map for a changed `featureMap.sources` file.
- An impacted doc passes when this change updates it, or when docs-manager recorded it fresh for exactly this change. Any later edit to a changed file voids the record, so a review or CI repair that changes files runs Section 1 again before the check.
- Exit 1 lists each stale doc with the changes that require it and the fix: run `$docs-manager --mode=update` again, or update the named doc. Fix the doc; never edit the check or its routing to pass. Exit 2 (no merge base, a git error, or an invalid project config that would route nothing) is a **Blocker**, never a pass.
- Run it in Step 5 on the final candidate, and again in Step 7 right before `gh pr create` or `gh pr ready`, and after every CI-repair commit in Step 8.

## 3. Bypass, only on an explicit request

When the user explicitly asks to bypass the docs-staleness check for this pull request, run it with their reason:

```text
node .claude/scripts/docs-staleness-check.cjs --base=origin/<target> --bypass-reason="<the user's reason>"
```

It passes, keeps the reason in its local record and prints a line. Copy that line into the PR body unchanged: `Docs staleness: bypassed at user request — <reason>`. A bypass covers only the run that carried the flag; a later run without it checks again.

## 4. Record it in the PR body

Add a `Docs sync` line: the docs docs-manager updated, the docs it recorded fresh, and the check result (`docs-staleness: PASS` with the base), or the bypass line above.
