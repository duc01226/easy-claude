# Hooks Reference

> 15 top-level `.cjs` hooks and 25 lib modules for context-aware AI behavior (some hooks register on multiple events; the unified notification router lives under `hooks/notifications/notify.cjs`)

## Overview

Hooks are Node.js scripts (`.cjs`, plus one `.js`) that execute at specific Claude Code lifecycle events, enabling session initialization, safety gates, graph maintenance, and code formatting. Enforcement and lifecycle-recovery behavior is **model-driven static guidance** in `CLAUDE.md` / `SKILL.md` / agent `.md`, not runtime hooks.

```
SessionStart hooks → UserPromptSubmit hooks → PreToolUse hooks → [Tool runs] → PostToolUse hooks
       ↓                    ↓                       ↓                                ↓
  Verify install         Intake gate          Validate/block              Format edits
  Init state                                  Guard boundaries            Update graph
  Load docs / graph                           Block unsafe ops            Auto-install npm
```

> **Context injection (current architecture).** Per-edit/per-prompt context-injection
> guidance lives **statically** in `CLAUDE.md`, agent `.md` files, and skill `SKILL.md`
> files, so a hookless harness (Codex / Copilot) reads identical instructions; there are
> no runtime context-injection hooks. The PreToolUse hooks are blocking/advisory **gates**
> and a few utility hooks; every hook below maps to a real registration in
> `.claude/settings.json`. Plan/skill/todo enforcement and compaction-state recovery are
> now **static model-driven guidance** (CLAUDE.md / SKILL.md), not hooks.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                |
| ------------------ | ---------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 5     | Verify install, init state, auto-install npm, load docs, init graph                      |
| `SessionEnd`       | Session ends                 | 1     | Save pending-tasks warning, cleanup temp/swap files                                      |
| `UserPromptSubmit` | Before processing user input | 1     | Gate prompts until config/graph ready                                                    |
| `PreToolUse`       | Before tool execution        | 9     | Block sensitive ops, guard path boundaries, warn on doc⇄code drift, command-syntax guard |
| `PostToolUse`      | After tool completes         | 2     | Format code, update graph                                                                |
| `Notification`     | Idle/waiting events          | 1     | System notification (`hooks/notifications/notify.cjs`)                                   |
| `Stop`             | Response complete            | 1     | System notification (`hooks/notifications/notify.cjs`)                                   |

> There are **no** `SubagentStart` hooks registered; subagent guidance is static in the
> agent `.md` files.

---

## Hook Catalog

### Session Lifecycle

| Hook                       | Event                          | Matcher                                                  | Purpose                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`       | SessionStart                   | `startup\|resume\|clear\|compact`                        | Install integrity preflight (runs first): detect partial `.claude` copy with missing hook `lib/*.cjs` files, emit one actionable message                                                                                         |
| `session-init.cjs`         | SessionStart                   | `startup\|resume\|clear\|compact`                        | Initialize session: detect project, write env vars, validate config, cleanup temp files                                                                                                                                          |
| `npm-auto-install.cjs`     | SessionStart                   | `startup`                                                | Auto-install missing npm packages from root `package.json`                                                                                                                                                                       |
| `session-init-docs.cjs`    | SessionStart                   | `startup`                                                | Config skeleton + reference doc placeholder creation                                                                                                                                                                             |
| `graph-session-init.cjs`   | SessionStart                   | `startup`                                                | Check Python/tree-sitter/graph.db, inject status guidance (skips if config not populated)                                                                                                                                        |
| `session-end.cjs`          | SessionEnd                     | `clear\|exit\|compact`                                   | Clean up tmpclaude temp/swap files and stale snapshots on session end                                                                                                                                                            |
| `notifications/notify.cjs` | Stop, PreToolUse, Notification | –, `AskUserQuestion`, `AskUserPrompt\|permission_prompt` | Unified notification router → desktop dialog + optional Telegram/Discord/Slack; fires on task-complete (Stop), question (AskUserQuestion), and input/permission prompts. Single owner — replaces the retired `notify-waiting.js` |

### Context Management (PreToolUse / UserPromptSubmit)

The PreToolUse / UserPromptSubmit hooks are gates — not content injectors.

| Hook                   | Event            | Matcher | Purpose                                                                           |
| ---------------------- | ---------------- | ------- | --------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs` | UserPromptSubmit | `*`     | Block prompts until project config is populated + graph is built (exit 2 = block) |

### Gates (PreToolUse)

| Hook                           | Matcher                                                               | Purpose                                                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `windows-command-detector.cjs` | `Bash`                                                                | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands                                                                                                                                                    |
| `git-commit-block.cjs`         | `Bash`                                                                | Block git commit/push unless the `/commit` skill is active                                                                                                                                                                  |
| `doc-sync-gate.cjs`            | `Bash` and `Write\|Edit\|MultiEdit`                                   | Doc⇄Code sync gate — WARN-only (every path exits 0): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced` |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                   | Prevent bulk reads outside approved scope                                                                                                                                                                                   |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                   | Block access to sensitive files (.env, keys, credentials)                                                                                                                                                                   |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit` and `mcp__filesystem__*` | Block file access outside project root (security-critical)                                                                                                                                                                  |

> **Plan/skill/todo enforcement is now static.** The former `edit-enforcement`,
> `skill-enforcement`, and `workflow-task-guard` gates (block edits/skills/task-completion
> without a `TaskCreate` item) are now **model-driven rules in `CLAUDE.md`** (Task Planning
> Rules / WORKFLOW-GATE). The former `agent-files-skill-gate` setup router is replaced by
> the static project-reference doc gate in `CLAUDE.md` / `SKILL.md`.

### Lessons Injection

The lessons (`docs/project-reference/lessons.md`) reading contract lives statically in
`CLAUDE.md` / agent / skill instructions; the model re-reads `lessons.md` on demand
(including after compaction) per that static contract — there is no runtime lessons-inject
hook.

Lessons are managed via the `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                    | Event                  | Purpose                                                             |
| ----------------------- | ---------------------- | ------------------------------------------------------------------- |
| `init-prompt-gate.cjs`  | UserPromptSubmit       | Block prompts until config populated + graph built (exit 2 = block) |
| `session-init-docs.cjs` | SessionStart:`startup` | Config skeleton + reference doc placeholder creation                |

> Plan/skill/todo enforcement and cross-compaction todo persistence are **model-driven
> static guidance** (`CLAUDE.md` Task Planning Rules + `TaskList` re-read on resume), not
> hooks.

### Safety & Privacy

| Hook                           | Matcher                                                            | Purpose                                                                  |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit`, `mcp__filesystem__*` | Block file access outside project root (security-critical)               |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                | Block access to sensitive files (.env, keys, credentials)                |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                | Prevent bulk reads outside approved scope                                |
| `windows-command-detector.cjs` | `Bash`                                                             | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands |
| `git-commit-block.cjs`         | `Bash`                                                             | Block git commit/push unless `/commit` skill is active                   |

### Context Management & Utility

| Hook                     | Event                                | Purpose                                               |
| ------------------------ | ------------------------------------ | ----------------------------------------------------- |
| `post-edit-prettier.cjs` | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files                     |
| `graph-auto-update.cjs`  | PostToolUse:`Edit\|Write\|MultiEdit` | Incremental graph update after file edits (debounced) |

> Large-output externalization, compaction snapshots/markers, transcript recovery,
> temp-file cleanup, and subagent-truncation detection are no longer hooks. Compaction-state
> recovery is now **static re-anchoring guidance** in `CLAUDE.md` (re-read files / `TaskList`
> on resume); `session-init.cjs` / `session-end.cjs` handle the remaining temp cleanup.

---

## Lessons System

The lessons system is a simple manual learning mechanism:

```
USER TEACHING                         READ-ON-DEMAND (static contract)
/learn "always use X"                 CLAUDE.md / agent / skill instructions
         ↓                                    ↓
/learn skill appends to               model re-reads
docs/project-reference/lessons.md     docs/project-reference/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             on demand (incl. after compaction)
Max 50 entries (FIFO trim)
```

> The standing read-lessons contract is delivered **statically** through
> `CLAUDE.md` / agent / skill instructions; there is no runtime lessons inject hook.

**How to teach:**

- Type `/learn always use IGrowthRootRepository` → lesson saved to `docs/project-reference/lessons.md`
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Session Lifecycle

```
SESSION START (5 hooks)                         DURING SESSION
  verify-install.cjs ───────────────────┐         graph-auto-update.cjs (after edits)
    └── partial-copy preflight          │         post-edit-prettier.cjs (after edits)
  session-init.cjs ─────────────────────┤
    ├── cleanup temp files              │
    ├── detectProjectType()             │       PROMPT (UserPromptSubmit)
    ├── resolvePlanPath()               │         init-prompt-gate.cjs (gate)
    └── writeEnv() (CK_* vars)          │
  npm-auto-install.cjs                  │       PRETOOLUSE GATES
  session-init-docs.cjs                 │         windows-command-detector / git-commit-block
  graph-session-init.cjs ───────────────┘         scout-block / privacy-block / path-boundary-block
                                                  doc-sync-gate (WARN)
                                                SESSION END (1 hook)
                                                    session-end.cjs
                                                      ├── write pending-tasks-warning.json
                                                      ├── cleanup temp files
                                                      └── deleteMarker() (on /clear)
                                                STOP → notifications/notify.cjs (notification)
```

> Plan/skill/todo enforcement and compaction snapshot/recovery are no longer hooks —
> that behavior is **static model-driven guidance** in `CLAUDE.md` (re-read files /
> `TaskList` on resume).

---

## Lib Modules

26 modules under `.claude/hooks/lib/`.

### State Management

| Module                  | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `ck-session-state.cjs`  | Session state persistence                                                        |
| `workflow-state.cjs`    | Workflow progress tracking across compaction                                     |
| `todo-state.cjs`        | Todo list state persistence                                                      |
| `agent-files-state.cjs` | Shared detection of missing root agent-instruction files (CLAUDE.md / AGENTS.md) |

### External Memory

| Module            | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `swap-engine.cjs` | Core engine: externalize large outputs, generate pointers, manage swap lifecycle |

### ClaudeKit (CK) Infrastructure

| Module                 | Purpose                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `ck-paths.cjs`         | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs)                                  |
| `ck-config-loader.cjs` | Config loading and merging                                                                      |
| `ck-config-schema.cjs` | Validate `.claude/.ck.json` against expected schema (warns on typos/unknown keys, never blocks) |
| `ck-config-utils.cjs`  | Facade for config utilities                                                                     |
| `ck-env-utils.cjs`     | Environment variable detection                                                                  |
| `ck-git-utils.cjs`     | Low-level git utilities                                                                         |
| `ck-path-utils.cjs`    | Path resolution and normalization                                                               |
| `ck-plan-resolver.cjs` | Resolve active plan from session or branch context                                              |

### Context / Prompt Support

| Module                     | Purpose                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prompt-injections.cjs`    | Canonical text of critical-context / AI-mistake-prevention / lessons / workflow-protocol blocks; source of truth mirrored into static `CLAUDE.md` / `SKILL.md` guidance and read by the codex sync transform |
| `dedup-constants.cjs`      | Centralized dedup markers and dynamic line count calculation                                                                                                                                                 |
| `session-init-helpers.cjs` | SessionStart helpers: reference doc placeholders, config init                                                                                                                                                |
| `doc-sync-classify.cjs`    | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)                                                                                     |

### Configuration

| Module                       | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `project-config-loader.cjs`  | Load and validate project configuration, generate project summary |
| `project-config-schema.cjs`  | Project config JSON schema definition                             |
| `test-fixture-generator.cjs` | Generate test fixture data for hook tests                         |

### General Utilities

| Module                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `debug-log.cjs`         | Debug logging (file + stderr)                                      |
| `hook-runner.cjs`       | Hook execution wrapper with error handling                         |
| `stdin-parser.cjs`      | Parse JSON from hook stdin                                         |
| `temp-file-cleanup.cjs` | tmpclaude file cleanup                                             |
| `graph-utils.cjs`       | Python detection, graph availability check, CLI invocation wrapper |

---

## Hook Input/Output

### Input (stdin)

Hooks receive JSON via stdin with event-specific payload:

```json
{
    "tool_name": "Edit",
    "tool_input": {
        "file_path": "/path/to/file.ts",
        "old_string": "...",
        "new_string": "..."
    },
    "session_id": "abc123"
}
```

### Output (stdout)

Text printed to stdout is injected into conversation context. Hooks use `console.log()` for context injection.

### Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success, allow operation to proceed            |
| `2`  | Block operation (with error message on stderr) |

> All hooks exit 0 (non-blocking) except safety/gate hooks (`path-boundary-block`, `privacy-block`, `scout-block`, `init-prompt-gate`, `git-commit-block`) which exit 2 to block. Note: `doc-sync-gate.cjs` is explicitly WARN-only — every code path exits 0.

---

## Configuration

### Hook Registration (`.claude/settings.json`)

Hooks are registered in `settings.json` under `hooks.{EventName}[].hooks[]`. Each registration specifies a `command` and `matcher`:

```json
{
    "hooks": {
        "PreToolUse": [
            {
                "hooks": [
                    {
                        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/privacy-block.cjs",
                        "type": "command"
                    }
                ],
                "matcher": "Bash|Glob|Grep|Read|Edit|Write|NotebookEdit"
            }
        ]
    }
}
```

### Hook-Specific Config (`.claude/.ck.json`)

```json
{
    "privacyBlock": true,
    "codeReview": {
        "enabled": true,
        "rulesPath": "docs/project-reference/code-review-rules.md"
    }
}
```

---

## Testing

Primary hook test status: `test-all-hooks.cjs` passes with 213 tests, 0 failures (live run 2026-06-16; the in-suite count guard confirms docs agree at 213). The aggregate runner `run-all-tests.cjs` passes 277 tests across all discoverable suites (live run 2026-06-16).

| Test Surface          | Count | File/Location                                                     |
| --------------------- | ----- | ----------------------------------------------------------------- |
| Primary hook runner   | 213   | `tests/test-all-hooks.cjs`                                        |
| Aggregate runner      | 277   | `tests/run-all-tests.cjs` (all suites)                            |
| Standalone test files | TODO  | `tests/test-*.cjs/.js` excluding runner (re-verify before citing) |
| Scout-block tests     | TODO  | `scout-block/tests/test-*.js` (re-verify before citing)           |
| Lib unit tests        | TODO  | `lib/__tests__/*.test.cjs` (re-verify before citing)              |

Run all primary hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

Run the full aggregate suite: `node .claude/hooks/tests/run-all-tests.cjs`

---

## Related Documentation

- [architecture.md](./architecture.md) — Hook runtime contract and layer boundaries
- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
- [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/settings.json` (authoritative hook registrations) + `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill_
