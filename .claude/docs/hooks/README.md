# Hooks Reference

> 29 top-level `.cjs` hooks (+ one `.js` notification helper, `notify-waiting.js`) and 28 lib modules for context-aware AI behavior (some hooks register on multiple events; an additional notification helper lives under `hooks/notifications/notify.cjs`)

## Overview

Hooks are Node.js scripts (`.cjs`, plus one `.js`) that execute at specific Claude Code lifecycle events, enabling session-state management, workflow enforcement, safety controls, and lessons injection.

```
SessionStart hooks → UserPromptSubmit hooks → PreToolUse hooks → [Tool runs] → PostToolUse hooks
       ↓                    ↓                       ↓                                ↓
  Init state         Gate / snapshot          Validate/block              Track outcomes
  Verify install     Inject catalog           Enforce rules               Format / swap
  Recover state      Capture transcript       Guard boundaries            Update graph
```

> **Context injection (current architecture).** Per-edit/per-prompt context-injection
> guidance lives **statically** in `CLAUDE.md`, agent `.md` files, and skill `SKILL.md`
> files, so a hookless harness (Codex / Copilot) reads identical instructions; there are
> no runtime context-injection hooks. The PreToolUse hooks are blocking/advisory **gates**
> and a few utility hooks; every hook below maps to a real registration in
> `.claude/settings.json`.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                 |
| ------------------ | ---------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 8     | Verify install, init state, recover from compaction, resume context, load docs, route     |
| `SessionEnd`       | Session ends                 | 2     | Save state, cleanup temp/swap files, notification                                         |
| `UserPromptSubmit` | Before processing user input | 2     | Gate prompts until config/graph ready, capture rolling transcript snapshot                |
| `PreToolUse`       | Before tool execution        | 13    | Block sensitive ops, enforce plans/todos, guard path boundaries, warn on doc⇄code drift   |
| `PostToolUse`      | After tool completes         | 7     | Externalize outputs, format code, update graph, track todos/steps, validate subagents     |
| `PreCompact`       | Before context compaction    | 1     | Write compaction marker; capture git status snapshot for post-compact re-verify warning   |
| `Notification`     | Idle/waiting events          | 1     | System notification (`hooks/notifications/notify.cjs`)                                     |
| `Stop`             | Response complete            | 1     | System notification (`notify-waiting.js`)                                                  |

> There are **no** `SubagentStart` hooks registered; subagent guidance is static in the
> agent `.md` files.

---

## Hook Catalog

### Session Lifecycle

| Hook                        | Event                          | Matcher                           | Purpose                                                                                                                                       |
| --------------------------- | ------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`        | SessionStart                   | `startup\|resume\|clear\|compact` | Install integrity preflight (runs first): detect partial `.claude` copy with missing hook `lib/*.cjs` files, emit one actionable message       |
| `session-init.cjs`          | SessionStart                   | `startup\|resume\|clear\|compact` | Initialize session: detect project, write env vars, validate config, cleanup temp files                                                       |
| `post-compact-recovery.cjs` | SessionStart                   | `resume\|compact`                 | Restore workflow state, todos, and swap inventory after compaction; scan tmp/ for [partial] subagent progress files                            |
| `session-resume.cjs`        | SessionStart                   | `resume`                          | Inject pending-tasks warning from prev session, restore todos from checkpoint                                                                  |
| `npm-auto-install.cjs`      | SessionStart                   | `startup`                         | Auto-install missing npm packages from root `package.json`                                                                                     |
| `session-init-docs.cjs`     | SessionStart                   | `startup`                         | Config skeleton + reference doc placeholder creation                                                                                           |
| `graph-session-init.cjs`    | SessionStart                   | `startup`                         | Check Python/tree-sitter/graph.db, inject status guidance (skips if config not populated)                                                      |
| `workflow-router.cjs`       | SessionStart, UserPromptSubmit | `startup\|resume\|clear\|compact` | Inject the workflow & skills catalog + route-selection instructions from `.claude/workflows.json`                                              |
| `session-end.cjs`           | SessionEnd                     | `clear\|exit\|compact`            | Write pending-tasks warning, cleanup temp/swap files, delete markers (uses `lib/context-tracker.cjs`)                                          |
| `notify-waiting.js`         | SessionEnd, Stop, PreToolUse   | `clear\|exit\|compact`, –, `AskUserQuestion` | System notification when Claude is waiting for input                                                                                |
| `notifications/notify.cjs`  | Notification                   | `idle_prompt\|AskUserPrompt\|permission_prompt` | System notification on idle/ask/permission prompts (lives under `hooks/notifications/`)                                          |

> `workflow-router.cjs` is the only SessionStart hook also registered on
> `UserPromptSubmit` (matcher `*`), so it re-injects the catalog on every prompt.

### Context Management (PreToolUse / UserPromptSubmit)

The PreToolUse / UserPromptSubmit hooks are gates, snapshots, and routers — not content
injectors.

| Hook                       | Event             | Matcher | Purpose                                                                                                                                                                              |
| -------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`     | UserPromptSubmit  | `*`     | Block prompts until project config is populated + graph is built (exit 2 = block)                                                                                                  |
| `pre-compact-snapshot.cjs` | UserPromptSubmit  | `*`     | Capture last readable `[Human]/[Assistant]` transcript lines as a rolling JSON snapshot at `/tmp/ck/snapshots/{sessionId}.json`; consumed by `post-compact-recovery.cjs` after compact |

### Gates (PreToolUse)

| Hook                         | Matcher                                             | Purpose                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `windows-command-detector.cjs` | `Bash`                                           | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands                                                                                                                                                               |
| `git-commit-block.cjs`       | `Bash`                                              | Block git commit/push unless the `/commit` skill is active                                                                                                                                                                             |
| `doc-sync-gate.cjs`          | `Bash` and `Write\|Edit\|MultiEdit`                 | Doc⇄Code sync gate — WARN-only (every path exits 0): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced`             |
| `scout-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Prevent bulk reads outside approved scope                                                                                                                                                                                              |
| `privacy-block.cjs`          | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block access to sensitive files (.env, keys, credentials)                                                                                                                                                                             |
| `path-boundary-block.cjs`    | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit` and `mcp__filesystem__*` | Block file access outside project root (security-critical)                                                                                                                                            |
| `edit-enforcement.cjs`       | `Edit\|Write\|MultiEdit\|NotebookEdit`              | Track edits, plan warnings at file thresholds, block edits without a TaskCreate item                                                                                                                                                  |
| `skill-enforcement.cjs`      | `Skill`                                             | Block implementation skills without a TaskCreate item                                                                                                                                                                                 |
| `agent-files-skill-gate.cjs` | `Skill`                                             | Project-context router: if a non-meta skill runs while CLAUDE.md / AGENTS.md is missing, guide the model to the generator skill (`/claude-md-init`, `/sync-codex`)                                                                    |
| `workflow-task-guard.cjs`    | `TaskUpdate`                                        | Block completing workflow tasks without a Skill invocation                                                                                                                                                                            |

### Lessons Injection

The lessons (`docs/project-reference/lessons.md`) reading contract lives statically in
`CLAUDE.md` / agent / skill instructions, and is restored after compaction by
`post-compact-recovery.cjs` via `lib/prompt-injections.cjs`.

Lessons are managed via the `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                        | Event                                             | Purpose                                                                          |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`      | UserPromptSubmit                                  | Block prompts until config populated + graph built (exit 2 = block)              |
| `workflow-router.cjs`       | SessionStart, UserPromptSubmit                    | Inject the workflow & skills catalog + route-selection instructions             |
| `session-init-docs.cjs`     | SessionStart:`startup`                            | Config skeleton + reference doc placeholder creation                            |
| `workflow-step-tracker.cjs` | PostToolUse:`Skill`                               | Track workflow step completion (accelerator only — advancement is model-driven)  |
| `edit-enforcement.cjs`      | PreToolUse:`Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at file thresholds, block without TaskCreate           |
| `skill-enforcement.cjs`     | PreToolUse:`Skill`                                | Block implementation skills without TaskCreate                                   |
| `todo-tracker.cjs`          | PostToolUse:`TaskCreate\|TaskUpdate`              | Persist todo state to disk for cross-compaction recovery                         |
| `workflow-task-guard.cjs`   | PreToolUse:`TaskUpdate`                            | Block completing workflow tasks without Skill invocation                         |

### Safety & Privacy

| Hook                           | Matcher                                                                | Purpose                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit`, `mcp__filesystem__*`     | Block file access outside project root (security-critical)                |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                    | Block access to sensitive files (.env, keys, credentials)                 |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                    | Prevent bulk reads outside approved scope                                 |
| `windows-command-detector.cjs` | `Bash`                                                                 | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands  |
| `git-commit-block.cjs`         | `Bash`                                                                 | Block git commit/push unless `/commit` skill is active                    |

### Context Management & Utility

| Hook                       | Event                                | Purpose                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-output-swap.cjs`     | PostToolUse:`Read\|Grep\|Glob`       | Externalize large outputs to swap files for post-compaction recovery                                                                                                                                        |
| `write-compact-marker.cjs` | PreCompact:`manual\|auto`            | Write a session compaction marker; its existence tells `post-compact-recovery.cjs` a compact occurred (gates partial-progress recovery, transcript snapshot, AI-principle re-anchoring)                       |
| `pre-compact-snapshot.cjs` | UserPromptSubmit                     | Capture last readable `[Human]/[Assistant]` transcript lines as a rolling snapshot (`/tmp/ck/snapshots/{sessionId}.json`); used by `post-compact-recovery.cjs` to restore readable context after compact     |
| `post-edit-prettier.cjs`   | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files                                                                                                                                                                           |
| `bash-cleanup.cjs`         | PostToolUse:`Bash`                   | Clean up tmpclaude temp files after Bash commands                                                                                                                                                           |
| `graph-auto-update.cjs`    | PostToolUse:`Edit\|Write\|MultiEdit` | Incremental graph update after file edits (debounced)                                                                                                                                                       |
| `post-agent-validator.cjs` | PostToolUse:`Agent`                  | Detect truncated/incomplete subagent results via heuristics; emit warning if truncated                                                                                                                      |

---

## Lessons System

The lessons system is a simple manual learning mechanism:

```
USER TEACHING                         RESTORE-AFTER-COMPACT
/learn "always use X"                 post-compact-recovery.cjs (SessionStart: resume|compact)
         ↓                                    ↓
/learn skill appends to               lib/prompt-injections.cjs reads
docs/project-reference/lessons.md     docs/project-reference/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             console.log(content) → context
Max 50 entries (FIFO trim)
```

> The standing read-lessons contract is delivered **statically** through
> `CLAUDE.md` / agent / skill instructions; there is no per-edit runtime lessons inject
> hook anymore.

**How to teach:**

- Type `/learn always use IGrowthRootRepository` → lesson saved to `docs/project-reference/lessons.md`
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Session Lifecycle

```
SESSION START (8 hooks)                         DURING SESSION
  verify-install.cjs ───────────────────┐         edit-enforcement.cjs (every edit)
    └── partial-copy preflight          │         skill-enforcement.cjs (every skill)
  session-init.cjs ─────────────────────┤         tool-output-swap.cjs (large outputs)
    ├── cleanup temp files              │         todo-tracker.cjs (every TaskCreate/Update)
    ├── detectProjectType()             │         graph-auto-update.cjs (after edits)
    ├── resolvePlanPath()               │         post-edit-prettier.cjs (after edits)
    └── writeEnv() (CK_* vars)          │         workflow-step-tracker.cjs (every Skill)
  post-compact-recovery.cjs ────────────┤
    └── restore workflow + todos        │       PROMPT (UserPromptSubmit)
  session-resume.cjs ───────────────────┤         init-prompt-gate.cjs (gate)
    ├── injectPendingTasksWarning()     │         pre-compact-snapshot.cjs (snapshot)
    ├── restore todos from checkpoint   │         workflow-router.cjs (catalog re-inject)
    └── inject swap inventory           │
  npm-auto-install.cjs                  │       COMPACTION (PreCompact)
  session-init-docs.cjs                 │         write-compact-marker.cjs
  graph-session-init.cjs                │
  workflow-router.cjs ───────────────────┘       SESSION END (2 hooks)
                                                    session-end.cjs
                                                      ├── write pending-tasks-warning.json
                                                      ├── cleanup temp/swap files
                                                      └── deleteMarker() (on /clear)
                                                    notify-waiting.js (notification)
```

---

## Lib Modules

28 modules under `.claude/hooks/lib/`.

### State Management

| Module                 | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `ck-session-state.cjs` | Session state persistence                                                   |
| `workflow-state.cjs`   | Workflow progress tracking across compaction                                |
| `todo-state.cjs`       | Todo list state persistence for enforcement                                 |
| `edit-state.cjs`       | File edit tracking + plan warning state                                     |
| `agent-files-state.cjs` | Shared detection of missing root agent-instruction files (CLAUDE.md / AGENTS.md) |
| `context-tracker.cjs`  | Context usage monitoring, tool call counting, compaction threshold learning (consumed by `session-end.cjs`) |

### External Memory

| Module            | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `swap-engine.cjs` | Core engine: externalize large outputs, generate pointers, manage swap lifecycle |

### ClaudeKit (CK) Infrastructure

| Module                  | Purpose                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `ck-paths.cjs`          | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs)                                  |
| `ck-config-loader.cjs`  | Config loading and merging                                                                      |
| `ck-config-schema.cjs`  | Validate `.claude/.ck.json` against expected schema (warns on typos/unknown keys, never blocks) |
| `ck-config-utils.cjs`   | Facade for config utilities                                                                      |
| `ck-env-utils.cjs`      | Environment variable detection                                                                  |
| `ck-git-utils.cjs`      | Low-level git utilities                                                                          |
| `ck-path-utils.cjs`     | Path resolution and normalization                                                               |
| `ck-plan-resolver.cjs`  | Resolve active plan from session or branch context                                              |

### Context / Prompt Support

| Module                      | Purpose                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `prompt-injections.cjs`     | Shared prompt injection helpers (critical context, AI mistake prevention, lessons, lesson-learned, workflow protocol); consumed by `post-compact-recovery.cjs` |
| `dedup-constants.cjs`       | Centralized dedup markers and dynamic line count calculation                                                                         |
| `session-init-helpers.cjs`  | SessionStart helpers: reference doc placeholders, config init                                                                        |
| `doc-sync-classify.cjs`     | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)             |

### Configuration

| Module                       | Purpose                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| `project-config-loader.cjs`  | Load and validate project configuration, generate project summary |
| `project-config-schema.cjs`  | Project config JSON schema definition                             |
| `test-fixture-generator.cjs` | Generate test fixture data for hook tests                         |
| `wr-config.cjs`              | Workflow router configuration (consumed by `workflow-router.cjs`, `workflow-step-tracker.cjs`, `workflow-task-guard.cjs`) |

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

> All hooks exit 0 (non-blocking) except safety/gate hooks (`path-boundary-block`, `privacy-block`, `scout-block`, `init-prompt-gate`, `git-commit-block`, `edit-enforcement`, `skill-enforcement`, `workflow-task-guard`) which exit 2 to block. Note: `doc-sync-gate.cjs` is explicitly WARN-only — every code path exits 0.

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

Primary hook test status: `test-all-hooks.cjs` passes with 303 tests, 0 failures (live run 2026-06-14; the in-suite count guard confirms docs agree at 303). The aggregate runner `run-all-tests.cjs` passes 410 tests across all discoverable suites (live run 2026-06-15).

| Test Surface          | Count | File/Location                            |
| --------------------- | ----- | ---------------------------------------- |
| Primary hook runner   | 303   | `tests/test-all-hooks.cjs`               |
| Aggregate runner      | 410   | `tests/run-all-tests.cjs` (all suites)   |
| Standalone test files | TODO  | `tests/test-*.cjs/.js` excluding runner (re-verify before citing) |
| Scout-block tests     | TODO  | `scout-block/tests/test-*.js` (re-verify before citing) |
| Lib unit tests        | TODO  | `lib/__tests__/*.test.cjs` (re-verify before citing) |

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
