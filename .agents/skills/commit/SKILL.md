---
name: commit
description: '[Git] Use when asked to commit, stage and commit, or save changes. --push also pushes.'
metadata:
  instruction-profile: concise
---

1. Commit requested changes only; preserve other work. Load project configuration and matching skill overlays; never reconfirm commit/push. Follow root-linked tracking if present; re-stage its edits before checks; never block on it.
2. Scan the exact pending commit content for secrets before committing; never commit credentials or .env files, and block on findings with redacted file/line/rule evidence. Run applicable checks (verify: `references/verify-receipt.md`); reuse unchanged passing evidence; stop on failures or unavailable required checks.
3. Resolve `commit.reviewMode` with `node .claude/scripts/lib/commit-review-policy.cjs --operation=commit --risk=<low|medium|high>`; follow its selection (default `$commit-review --fix-loop`, at most five rounds), unless current matching review evidence exists.
4. Give the review the exact commit descriptor, with paths and `"amend":true` when applicable; require a matching review receipt or policy-eligible skip via `.claude/hooks/lib/review-receipt.cjs` before committing, and refresh evidence after changes.
5. Create and verify a concise conventional commit (`references/trailers.md`). Only when `commit.fixOriginTrailer: true`, add `Fix-Origin: feedback` (requested fix), `regression` (earlier defect), or `not-applicable` (not a fix) to new commits; never reword history to add it; amend only on an explicit amend request for this task's unpushed commit; push only when requested; route PR requests to `$pull-request`; report the result.
