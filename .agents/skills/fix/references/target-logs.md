# fix — `--target=logs` — log / stack-trace branch

> Read by `$fix --target=logs` FIRST, before any other step of the branch (the router `SKILL.md` → **Target Routing**). The Debug Mindset, Confidence & Evidence Gate, Root-Cause Prerequisite Gate and the `SYNC:*` protocol bodies this branch cites live in `SKILL.md`.

## `--target=logs` — log / stack-trace branch

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Key Rules:**

- Focus on log patterns: stack traces, error codes, timing anomalies.
- Cross-reference logs with source code to find the actual root cause.

**Workflow:**

1. Check whether `./logs.txt` exists. If missing, set up permanent log piping in the project's script config (`package.json`, `Makefile`, `pyproject.toml`, …): **Bash/Unix** append `2>&1 | tee logs.txt`; **PowerShell** append `*>&1 | Tee-Object logs.txt`. Run the command to generate logs.
2. Use the `debugger` subagent to analyze `./logs.txt`: read with `Grep` `head_limit: 30` (last 30 lines; increase if needed — avoid loading the whole file). Write analysis to `tmp/analysis/{issue-name}.analysis.md`; re-read before fixing.
3. Use the `$investigate` skill to locate the exact source of the issue; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → ask the user directly → wait for approval.**
6. Implement the fix.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 3.
10. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.
