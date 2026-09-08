# Hooks Reference

> 18 top-level `.cjs` hooks and 31 lib modules for context-aware AI behavior (some hooks register on multiple events; the unified notification router lives under `.claude/hooks/notifications/notify.cjs`)

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
> files, so Claude and Codex read identical instructions whether hooks are available or not.
> Runtime context hooks are optional accelerators, never the source of truth. The PreToolUse
> hooks are blocking/advisory **gates** and a few utility hooks; every hook below maps to a real
> registration in `.claude/settings.json`. Plan/skill/todo enforcement and compaction-state
> recovery remain **static model-driven guidance** (CLAUDE.md / SKILL.md), with hooks allowed to
> accelerate detection or reminders.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                |
| ------------------ | ---------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 5     | Verify install, init state, auto-install npm, load docs, init graph                      |
| `SessionEnd`       | Session ends                 | 1     | Save pending-tasks warning, cleanup temp/swap files                                      |
| `UserPromptSubmit` | Before processing user input | 2     | Warn/route when config, root instructions, docs, or graph need refresh                   |
| `PreToolUse`       | Before tool execution        | 11    | Block sensitive ops, guard path boundaries, warn on doc⇄code drift, command-syntax guard |
| `PostToolUse`      | After tool completes         | 2     | Format code, update graph                                                                |
| `Notification`     | Idle/waiting events          | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                           |
| `Stop`             | Response complete            | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                           |

> There are **no** `SubagentStart` hooks registered; subagent guidance is static in the
> agent `.md` files.

---

## Hook Catalog

### Session Lifecycle

| Hook                                     | Event                          | Matcher                                                  | Purpose                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`                     | SessionStart                   | `startup\|resume\|clear\|compact`                        | Install integrity preflight (runs first): detect partial `.claude` copy with missing hook `lib/*.cjs` files, emit one actionable message                                                                                         |
| `session-init.cjs`                       | SessionStart                   | `startup\|resume\|clear\|compact`                        | Initialize session: detect project, write env vars, validate config, cleanup temp files                                                                                                                                          |
| `npm-auto-install.cjs`                   | SessionStart                   | `startup`                                                | Auto-install missing npm packages from root `package.json`                                                                                                                                                                       |
| `session-init-docs.cjs`                  | SessionStart                   | `startup`                                                | Config skeleton + reference doc placeholder creation                                                                                                                                                                             |
| `graph-session-init.cjs`                 | SessionStart                   | `startup\|resume`                                        | Check Python/tree-sitter/graph.db, then `sync` the graph with git HEAD (skips if config not populated). `resume` included so a session resumed after someone else's commits landed still reconciles                              |
| `session-end.cjs`                        | SessionEnd                     | `clear\|exit\|compact`                                   | Revoke this session's Git leases on `clear`/`exit`, leave leases unchanged on `compact`, and clean up tmpclaude temp/swap files and stale snapshots                                                                              |
| `.claude/hooks/notifications/notify.cjs` | Stop, PreToolUse, Notification | –, `AskUserQuestion`, `AskUserPrompt\|permission_prompt` | Unified notification router → desktop dialog + optional Telegram/Discord/Slack; fires on task-complete (Stop), question (AskUserQuestion), and input/permission prompts. Single owner — replaces the retired `notify-waiting.js` |

### Context Management (PreToolUse / UserPromptSubmit)

The PreToolUse / UserPromptSubmit hooks are gates — not content injectors.

| Hook                   | Event            | Matcher | Purpose                                                                          |
| ---------------------- | ---------------- | ------- | -------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs` | UserPromptSubmit | `*`     | Warn/route until project context, root instructions, docs, and graph are current |

### Gates (PreToolUse)

| Hook                           | Matcher                                                               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `windows-command-detector.cjs` | `Bash`                                                                | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands                                                                                                                                                                                                                                                                                                                                          |
| `bash-shell-guard.cjs`         | `Bash`                                                                | Block PowerShell here-strings (`@' … '@`) and name the POSIX heredoc replacement — Git Bash reports only `@: command not found`                                                                                                                                                                                                                                                                                   |
| `git-commit-block.cjs`         | `Bash`                                                                | Deny protected Git statements — and the GitHub CLI's modeled write verbs (`gh pr create\|merge`, `gh release create`, `gh api -X POST\|PUT\|PATCH\|DELETE`, …) — unless the current session has an exact, unexpired lease for the resolved repository and operation; `--amend` is unconditional deny                                                                                                              |
| `doc-sync-gate.cjs`            | `Bash` and `Write\|Edit\|MultiEdit`                                   | Doc⇄Code sync gate — WARN-only (every path exits 0; warnings go to stderr): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced`                                                                                                                                                                |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                   | Prevent bulk reads outside approved scope                                                                                                                                                                                                                                                                                                                                                                         |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                   | Block access to sensitive files (.env, keys, credentials)                                                                                                                                                                                                                                                                                                                                                         |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit` and `mcp__filesystem__*` | Block file access outside project root (security-critical)                                                                                                                                                                                                                                                                                                                                                        |
| `github-mcp-write-block.cjs`   | `mcp__github__*`                                                      | Gate GitHub MCP **write** tools (`merge_pull_request`, `create_*`, `update_*`, `push_files`, …) behind the same session **push** lease `git push` and `gh` consume; reads (`get_*`/`list_*`/`search_*`) pass. Modeled as a READ allowlist, so an unmodeled verb is treated as a write and denied — the inverse of the `gh` gate's fail-open choice, because this namespace is small and its tool names are static |

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

| Hook                    | Event                  | Purpose                                                                          |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`  | UserPromptSubmit       | Warn/route until project context, root instructions, docs, and graph are current |
| `session-init-docs.cjs` | SessionStart:`startup` | Config skeleton + reference doc placeholder creation                             |

> Plan/skill/todo enforcement and cross-compaction todo persistence are **model-driven
> static guidance** (`CLAUDE.md` Task Planning Rules + `TaskList` re-read on resume), not
> hooks.

### Safety & Privacy

| Hook                           | Matcher                                                            | Purpose                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit`, `mcp__filesystem__*` | Block file access outside project root (security-critical)                                                                        |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                | Block access to sensitive files (.env, keys, credentials)                                                                         |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit`                | Prevent bulk reads outside approved scope                                                                                         |
| `windows-command-detector.cjs` | `Bash`                                                             | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands                                                          |
| `bash-shell-guard.cjs`         | `Bash`                                                             | Block PowerShell here-strings (`@' … '@`); name the POSIX heredoc form                                                            |
| `git-commit-block.cjs`         | `Bash`                                                             | Enforce deny-wins Git **and GitHub CLI** statement classification and exact session/repository/operation leases; no marker bypass |
| `github-mcp-write-block.cjs`   | `mcp__github__*`                                                   | Gate GitHub MCP writes behind the same session push lease; the third publish path, reached without a shell                        |

### Context Management & Utility

| Hook                     | Event                                | Purpose                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-edit-prettier.cjs` | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files                                                                                                                                                                           |
| `graph-auto-update.cjs`  | PostToolUse:`Edit\|Write\|MultiEdit` | Incremental graph update after file edits (debounced)                                                                                                                                                       |
| `graph-prompt-sync.cjs`  | UserPromptSubmit                     | Re-sync the graph when git HEAD moved since the last prompt (pull/checkout/merge). Gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually changed; never blocks the prompt |

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

-   Type `/learn always use the project-specific repository interface` → lesson saved to `docs/project-reference/lessons.md`
-   Type `/learn list` → view current lessons
-   Type `/learn remove 3` → remove lesson #3
-   Say "remember this" or "always do X" → auto-inferred, asks confirmation

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
    └── writeEnv() (CK_* vars)          │         graph-prompt-sync.cjs (HEAD-change resync)
  npm-auto-install.cjs                  │       PRETOOLUSE GATES
  session-init-docs.cjs                 │         windows-command-detector / bash-shell-guard
  graph-session-init.cjs ───────────────┘         git-commit-block / scout-block / privacy-block
                                                  path-boundary-block / doc-sync-gate (WARN)
                                                SESSION END (1 hook)
                                                    session-end.cjs
                                                      ├── write pending-tasks-warning.json
                                                      ├── cleanup temp files
                                                       └── revoke session-scoped Git leases (on clear/exit)
                                                STOP → .claude/hooks/notifications/notify.cjs (notification)
```

> Plan/skill/todo enforcement and compaction snapshot/recovery are no longer hooks —
> that behavior is **static model-driven guidance** in `CLAUDE.md` (re-read files /
> `TaskList` on resume).

---

## Lib Modules

31 modules under `.claude/hooks/lib/`.

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

### Security / Authority

| Module                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command-inspection.cjs`    | Pure bounded Bash tokenization with static/dynamic provenance and no command execution                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `git-operation-lease.cjs`   | Short-lived session/project/repository/operation bookkeeping with replay-safe issue/revoke/check lifecycle. **Scoped speedbump, not a security boundary:** the store is an ordinary directory that is not tamper-proof (`git-operation-lease.cjs:14`) and `issueLease` performs no issuer-authority check, so any process able to write the store can mint one. It raises the cost of an accidental push; it does not stop a determined one, and it is never a substitute for the user's explicit request. |
| `path-boundary-policy.cjs`  | Pure command/path role classification used by the project-boundary security hook                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `project-root.cjs`          | Resolve and validate the consuming project root across cwd/script/env launch shapes                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `sensitive-path-policy.cjs` | Pure sensitive-path classification shared by privacy policy consumers                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Context / Prompt Support

| Module                     | Purpose                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt-injections.cjs`    | Delegating compat wrapper for legacy injector callers — keeps no protocol body copies; canonical text of critical-context / AI-mistake-prevention / lessons / workflow-protocol blocks is owned by `.claude/skills/shared/sync-inline-versions.md` and composed by `.claude/scripts/lib/hookless-prompt-protocol.cjs` (the codex sync transform reads the composer, not this wrapper) |
| `dedup-constants.cjs`      | Centralized dedup markers and dynamic line count calculation                                                                                                                                                                                                                                                                                                                          |
| `session-init-helpers.cjs` | SessionStart helpers: reference doc placeholders, config init                                                                                                                                                                                                                                                                                                                         |
| `doc-sync-classify.cjs`    | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)                                                                                                                                                                                                                                                              |

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

`UserPromptSubmit` guidance is plaintext stdout by default. Claude and Codex both accept non-JSON
stdout on this event as prompt context, so `init-prompt-gate.cjs` keeps the same reminder behavior
on both hosts. JSON `hookSpecificOutput.additionalContext` remains available when a hook needs
structured control, but the stale-doc/project-init reminder does not need it.

Keep prompt guidance plaintext, but do not let the emitted text start with `{` or `[` after
trimming. Codex may route JSON-looking stdout through its event-specific JSON parser before
treating it as plaintext context, which can surface as an invalid `UserPromptSubmit` JSON error.

Do not generalize this rule to every event: Codex `Stop` and `SubagentStop` require JSON output,
while `UserPromptSubmit` specifically accepts plaintext context.

### Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success, allow operation to proceed            |
| `2`  | Block operation (with error message on stderr) |

> All hooks exit 0 (non-blocking) except blocking safety gates (`path-boundary-block`, `privacy-block`, `scout-block`, `git-commit-block`, `github-mcp-write-block`) which exit 2 to block. `init-prompt-gate.cjs` and `doc-sync-gate.cjs` are WARN-only — every code path exits 0.

### Bash PreToolUse reliability contract

The seven hooks on the Bash path use the shared `runPreToolHookSync` / `runPreToolHook` completion
contract in `.claude/hooks/lib/hook-runner.cjs`:

-   An allow decision exits `0` with empty stdout. Diagnostics and advisory warnings belong on stderr.
    `doc-sync-gate.cjs` advisory warning is written to stderr; no allow path emits stdout.
-   A block decision exits `2` with a human-readable stderr message and never writes a decision-looking
    object to stdout unless the hook is deliberately returning the documented `hookSpecificOutput` object.
-   Input, evaluation, and output-transport failures are visible. Git, privacy, and path-boundary
    evaluation failures deny closed; the shell and scout heuristics preserve their existing fail-open
    policy but report the failure.
-   Hooks set `process.exitCode` after writing output so Node can drain stdout/stderr. They must not call
    `process.exit()` immediately after emitting a block or rewrite response.

For a one-session diagnostic trace, set `CLAUDE_HOOK_DEBUG=1`. Each Bash-path invocation appends one
JSON record containing the hook, tool, decision, exit code, and duration (never the command or path) to:

```text
%TEMP%/ck/debug/bash-hooks.log       # Windows
$TMPDIR/ck/debug/bash-hooks.log      # POSIX (or the platform temp directory)
```

Set `CLAUDE_HOOK_DEBUG_LOG` to override the file during a test or incident. The file rotates at 1 MiB
to `<name>.1`; a logging failure is reported on stderr and does not change the policy decision.

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

Primary hook test status: `test-all-hooks.cjs` passes with 224 tests on a clean configured project. Aggregate discovery status: `run-all-tests.cjs` discovers 537 tests on the current suite set. These totals are maintained by the test-runner count guards; rerun both commands below before publishing a new count. The discovered total includes the process-boundary Bash contract suite and varies only when suites are intentionally added or removed.

| Test Surface          | Count | File/Location                                                     |
| --------------------- | ----- | ----------------------------------------------------------------- |
| Primary hook runner   | 224   | `.claude/hooks/tests/test-all-hooks.cjs`                          |
| Aggregate runner      | 537   | `.claude/hooks/tests/run-all-tests.cjs` (all suites, discovered)  |
| Standalone test files | TODO  | `tests/test-*.cjs/.js` excluding runner (re-verify before citing) |
| Scout-block tests     | TODO  | `scout-block/tests/test-*.js` (re-verify before citing)           |
| Lib unit tests        | TODO  | `lib/__tests__/*.test.cjs` (re-verify before citing)              |

Run all primary hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

Run the full aggregate suite: `node .claude/hooks/tests/run-all-tests.cjs`

---

## Related Documentation

-   [architecture.md](./architecture.md) — Hook runtime contract and layer boundaries
-   [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
-   [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
-   [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/settings.json` (authoritative hook registrations) + `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill_
