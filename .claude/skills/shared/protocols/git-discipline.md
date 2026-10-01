## Git & Version-Control Discipline

- Never commit, push, or stage (`git add`) unless the user explicitly asks for that operation. Implementation approval, a workflow or delegated role grants none of these operations.
- Commit through the `commit` skill, never a raw `git commit`: it runs the review-before-commit gate, and `review-commit-gate.cjs` blocks an agent commit without a review fix-loop receipt (`changes-review` / `why-review` / `workflow-review-changes` `--fix-loop`) or a user-approved skip. `commit-skill-route.cjs` reminds the agent on a commit request (`$commit` on Codex).
- Amend only on an explicit amend request (a plain commit request makes a new commit), and never a pushed commit or one this task did not create: `git commit --amend` and `git reset --soft HEAD~1` + commit produce the same commit and follow the same rules, including the review receipt (against HEAD's parent).
- Branch before committing on the default branch (`main`/`master`).
- Read-only inspection needs no permission. Index/worktree/history mutations and external publication must stay within actual user authority; never infer it from a read-only request.
- Publishing through the GitHub CLI or a GitHub MCP write needs the same explicit request as a push. Ask before any command that can destroy uncommitted work (`checkout -- <path>`, `restore <path>`, `reset --hard`, `clean -f`, `stash drop`); no hook blocks them.
- Preserve unrelated/user work, custom content and existing backups. Never reset, overwrite or delete user data to satisfy a gate. Resolve exact destructive targets and obtain required authority; never access secrets or spend externally without authorization.

Read `.claude/docs/development-rules.md` when you need which git rule a hook enforces and which stays behavioral.
