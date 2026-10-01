---
name: workflow-mode
version: 1.0.0
description: '[Utilities] Use when showing or changing this person''s workflow route mode (ask, auto, off): which source decided it, set it for one session, or save it to the user file or this checkout.'
---

## Quick Summary

**Goal:** Show and change how workflows start for THIS person: `ask` (default: the workflow question is asked only when the route is to start a catalog workflow; direct and custom-simple routes ask nothing), `auto` (start without asking, by its tier) or `off` (nothing starts without an explicit request).

**Workflow:**

1. **Parse** — `/workflow-mode [ask|auto|off] [--save] [--local] [--show] [--session=<id>]` (Codex: `$workflow-mode`). No argument or `--show` = show.
2. **Show** — run `node .claude/scripts/workflow-mode.cjs` and report its output verbatim: the effective mode, the layer that decided it (default · project config · user file · checkout file · env · this session's prompt directive) and every layer's value. The script reads this session's prompt directive from the hook's session record (session id from `CK_SESSION_ID`, or pass `--session=<id>` when you know it). When it prints the "No session id" note, relay it: a directive given earlier this session is not visible to the command, and the printed mode may differ from the one in force.
3. **Set for this session** — the hook applies the typed first line `workflow-mode: <mode>` (or this command's own first line) for the rest of the session when its session record can be saved. If the hook reports "session preference NOT saved", relay that failure and its current-prompt scope; later prompts use the recorded/configured mode. No personal file is written without save. On a host that delivers no route block, follow the requested mode yourself for this conversation and say so.
4. **Persist** — with `--save`, run `node .claude/scripts/workflow-mode.cjs <mode> --save` (writes `~/.claude/.ck.json`, every project) or add `--local` (writes `.claude/.ck.local.json`, this checkout; the script refuses unless git reports the file ignored). Report the file written and whether a higher-precedence source still wins.

**Key Rules:**

- The mode is personal: never write it to the project config (`docs/project-config.json`) or any tracked file; a team default is set there by hand, not by this skill.
- Precedence, later wins: default `ask` < project config < `~/.claude/.ck.json` < `.claude/.ck.local.json` < env `CK_WORKFLOW_ROUTE_MODE` < this session's prompt directive. An unknown or corrupt value is ignored and the next source decides, ending at `ask`.
- In `off` the route hook injects only a one-line state; an explicit `/workflow-*` or `/start-workflow <id>` request still runs. Every quality gate binds in every mode.
- Report what the script printed; never infer a source or a file path from memory. The home directory is `os.homedir()` (`%USERPROFILE%` on Windows, `$HOME` on macOS and Linux).
- Never edit a generated mirror (`.agents/`, `.codex/`, `.opencode/`, `AGENTS.md`); this skill changes no repository file unless `--local` is given.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

## Closing Reminders

**IMPORTANT MUST ATTENTION** run `node .claude/scripts/workflow-mode.cjs` and report its output; never answer the current mode from memory
**IMPORTANT MUST ATTENTION** keep the mode personal: no project-config or tracked-file write, and `--local` only when the script confirms the file is git-ignored
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
