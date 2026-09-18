# Hooks Reference

> 20 top-level `.cjs` hooks and 36 lib modules for context-aware AI behavior (some hooks register on multiple events; the unified notification router lives under `.claude/hooks/notifications/notify.cjs`)

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
> accelerate detection or reminders. `file-convention-inject.cjs` is such an accelerator: the
> same convention classes are rendered statically into the CLAUDE.md/AGENTS.md "Automatic Skill
> Activation" table and are printable with `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                                             |
| ------------------ | ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 7     | Verify install, init state, auto-install npm, load docs, init graph, record condensation, re-anchor the prompt ledger |
| `SessionEnd`       | Session ends                 | 1     | Save pending-tasks warning, cleanup temp/swap files                                                                   |
| `UserPromptSubmit` | Before processing user input | 3     | Warn/route when config, root instructions, docs, or graph need refresh; record each user prompt in the ledger         |
| `PreToolUse`       | Before tool execution        | 11    | Block sensitive ops, guard path boundaries, warn on doc⇄code drift, command-syntax guard                              |
| `PostToolUse`      | After tool completes         | 4     | Format code, update graph, per-file convention reminder, re-deliver the prompt ledger at task checkpoints             |
| `Notification`     | Idle/waiting events          | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                                                        |
| `Stop`             | Response complete            | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                                                        |

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

The lessons file (`lessons.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) reading contract lives statically in
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

| Hook                         | Event                                                                                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-edit-prettier.cjs`     | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Auto-run the PROJECT-configured formatter on edited files (resolved from project-config `formatting`; framework default is Prettier); terminate the complete formatter process tree on timeout                                                                                                                                                                                                                                                                                                                                                                                       |
| `graph-auto-update.cjs`      | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Incremental graph update after file edits (debounced)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `graph-prompt-sync.cjs`      | UserPromptSubmit                                                                                                      | Re-sync the graph when git HEAD moved since the last prompt (pull/checkout/merge). Gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually changed; never blocks the prompt                                                                                                                                                                                                                                                                       |
| `prompt-ledger.cjs`          | UserPromptSubmit; SessionStart:`compact\|resume\|clear`; PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan` | Session prompt ledger (accelerator, never a gate): records every user prompt under `tmp/prompt-ledger/<session>/` with secrets redacted, pins the first prompt as the original goal, and re-delivers a short digest only when that reminder is no longer present (condensation, long growth, checkpoint). On by default; `promptLedger.enabled: false` / `CK_PROMPT_LEDGER=0` disables; always exit 0, silent on any failure. See [Session Prompt Ledger](#session-prompt-ledger) |
| `file-convention-inject.cjs` | PostToolUse:`Read\|Edit\|Write\|MultiEdit\|NotebookEdit`; SessionStart:`compact\|clear`                               | Per-file convention reminder (accelerator, never a gate): after a read/change, emits `additionalContext` with the rules, skill protocols and reference docs of the convention classes (`contextGroups[]`) the file belongs to — only classes not already present in this working context. Opt-in `conventionInjection.enabled`; always exit 0, silent on any failure. See [Per-File Convention Injection](#per-file-convention-injection)                                         |

> Large-output externalization, compaction snapshots/markers, transcript recovery,
> temp-file cleanup, and subagent-truncation detection are no longer hooks. Compaction-state
> recovery is now **static re-anchoring guidance** in `CLAUDE.md` (re-read files / `TaskList`
> on resume); `session-init.cjs` / `session-end.cjs` handle the remaining temp cleanup.

---

## Lessons System

The lessons system is a simple manual learning mechanism. Paths in the diagram show the DEFAULT project-reference docs root; a `docsRoots.projectReference.path` entry in `docs/project-config.json` relocates it.

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

- Type `/learn always use the project-specific repository interface` → lesson saved to `lessons.md` in the project-reference docs root
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Session Lifecycle

```
SESSION START (7 hooks)                         DURING SESSION
  verify-install.cjs ───────────────────┐         graph-auto-update.cjs (after edits)
    └── partial-copy preflight          │         post-edit-prettier.cjs (after edits)
  session-init.cjs ─────────────────────┤         file-convention-inject.cjs (after reads/edits)
  file-convention-inject.cjs (compact|clear: record condensation, no output)
  prompt-ledger.cjs (compact|resume|clear: re-anchor the original request)
    ├── cleanup temp files              │         prompt-ledger.cjs (task checkpoints)
    ├── detectProjectType()             │       PROMPT (UserPromptSubmit)
    ├── resolvePlanPath()               │         init-prompt-gate.cjs (gate)
    └── writeEnv() (CK_* vars)          │         graph-prompt-sync.cjs (HEAD-change resync)
  npm-auto-install.cjs                  │         prompt-ledger.cjs (record each prompt)
  session-init-docs.cjs                 │       PRETOOLUSE GATES
  graph-session-init.cjs ───────────────┘         windows-command-detector / bash-shell-guard
                                                  git-commit-block / scout-block / privacy-block
                                                  path-boundary-block / doc-sync-gate (WARN)
                                                  github-mcp-write-block (MCP push lease)
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

36 modules under `.claude/hooks/lib/`.

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

| Module                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt-injections.cjs`      | Delegating compat wrapper for legacy injector callers — keeps no protocol body copies; canonical text of critical-context / AI-mistake-prevention / lessons / workflow-protocol blocks is owned by `.claude/skills/shared/sync-inline-versions.md` and composed by `.claude/scripts/lib/hookless-prompt-protocol.cjs` (the codex sync transform reads the composer, not this wrapper)                                                                                                                                                                               |
| `dedup-constants.cjs`        | Centralized dedup markers and dynamic line count calculation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `session-init-helpers.cjs`   | SessionStart helpers: reference doc placeholders, config init                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `doc-sync-classify.cjs`      | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `file-conventions.cjs`       | Pure convention-class matcher and renderer: trigger targets, membership (include/exclude/extension), precedence + cap, content tag `[[convention:name@hash8]]`, budgeted digest, static-table rows, and the hookless `--lookup <path>` CLI                                                                                                                                                                                                                                                                                                                          |
| `convention-ledger.cjs`      | Delivery memory for `file-convention-inject.cjs`: per session/working-context records, short claim locks, condensation signals (SessionStart report + transcript marks), presence rule, static-instruction credit, stale-session pruning                                                                                                                                                                                                                                                                                                                            |
| `prompt-ledger-store.cjs`    | Session prompt record for `prompt-ledger.cjs`: settings resolution, secret redaction, per-entry truncation and entry cap (original request pinned), atomic ledger/markdown/delivery writes, digest + pin rendering with `[[prompt-ledger@hash8]]`, presence rule, clear rotation and stale-session pruning                                                                                                                                                                                                                                                          |
| `convention-merge.cjs`       | Stack-agnostic convention-class detection from existing config keys + additive merge (add / keep maintainer and edited / refresh unedited detected, never remove); CLI `--detect [--merge] [--write] [--enable]`                                                                                                                                                                                                                                                                                                                                                    |
| `doc-stamp-guard.cjs`        | Owns the invariant "a tracked doc's bytes change ONLY when its meaning changes": normalizes away clock-derived stamps (`Last scanned`, `Last verified`, `last_updated`, `Regenerated`) and whitespace, then answers whether a write or a staged diff carries real content. Content-derived tokens (COUNT markers, hashes) are deliberately NOT masked. CLI `--staged` (list stamp-only staged diffs, exit 3), `--check <doc> --candidate <file>` (exit 3 = no-op), `--record-verified <doc>` (log a no-change pass to the untracked ledger). Never mutates the repo |
| `skill-protocol-overlay.cjs` | Resolves the project's skill-protocol overlay for a skill about to run: matches the skill name against the registry's `Target` column (exact > glob > `*`, most specific tier wins outright), resolves each matched row to `<protocols-dir>/<Name>.md`, and rejects a malformed or directory-escaping name unread. Overlays are additive only and never waive a gate                                                                                                                                                                                                |

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

## Per-File Convention Injection

Keeps the right conventions in the model's attention at the moment it reads or changes a file of a given kind (tests, specs, backend, frontend, general code, …). Spec: `ContextDelivery/README.PerFileConventionInjection.md` in the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

**Configuration** — every `contextGroups[]` entry is a convention class; `conventionInjection` switches delivery on (absent ⇒ off, silent). `referenceDocs[]` filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

```json
{
    "contextGroups": [
        {
            "name": "integration-test",
            "pathRegexes": [],
            "pathGlobs": ["**/*.test.cjs"],
            "excludePathGlobs": ["**/fixtures/**"],
            "priority": 100,
            "skills": ["integration-test"],
            "referenceDocs": ["docs/project-reference/integration-test-reference.md"],
            "rules": ["Explicit Given/When/Then; clean temp dirs in finally"]
        }
    ],
    "conventionInjection": {
        "enabled": true,
        "maxChars": 4000,
        "maxClassesPerEdit": 4,
        "reinjectAfterBytes": 4500000,
        "reinjectAfterMinutes": 30,
        "blindReinjectAfterMinutes": 5,
        "onRead": true
    }
}
```

- **Membership:** `fileExtensions` filter (if any) AND any include (`pathRegexes` on `/`-prefixed repo-relative path, `pathGlobs`, `fileNameRegexes` on the base name) AND no exclude. Case-insensitive; files outside the project, folders, removals and host-reported failures are ignored.
- **Deliverable:** a class with `rules`, `skills`, `referenceDocs`, `guideDoc` or `patternsDoc`. Styling/design-only classes are never delivered.
- **Precedence:** `priority` ascending (100 specific · 500 default · 900 general), ties by declaration order, capped at `maxClassesPerEdit` before presence; the reminder says "earlier section wins on conflict". A rule shared by several classes is shown once.
- **Only what is missing:** a class is skipped while its record in this session + working context (main, or the helper agent id) has the current content version, was delivered after the last condensation, and the conversation grew less than `reinjectAfterBytes` since (transcript bytes, ~5–6 per visible character, so the 4500000 default ≈ 200K tokens; a history shorter than at delivery counts as absent; size unknown ⇒ age below a time limit, `blindReinjectAfterMinutes` (5) when the scope is blind — no transcript AND no condensation ever observed for it — and `reinjectAfterMinutes` (30) otherwise). A class left out by the size budget is never recorded. A current `[[convention:name@hash8]]` tag in EVERY existing root carrier (CLAUDE.md and AGENTS.md) counts as delivered at session start for the main context only. Condensation signals: SessionStart `compact|clear` (Claude) and `compact_boundary`/`compactionMarkers` lines in the transcript. The SessionStart report does not name the condensed context, so it re-arms main plus any helper whose own transcript cannot be measured; a helper with a measurable transcript uses its own marks only.
- **Content version:** `hash8` covers the rendered items AND membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePath*`, normalized `fileExtensions`) plus the renderer version, so a matcher edit re-delivers and refreshes the static rows. Changing it invalidates every carrier tag: regenerate CLAUDE.md/AGENTS.md (`run-codex-sync.mjs`) or consumers lose static credit until they do — an extra reminder, never a missed one.
- **Cost and opt-out:** the `Read` trigger costs ~15 ms per read (one config load plus a stat of the transcript) and is kept because a read almost always precedes the first edit of a file. To silence reads set `conventionInjection.onRead: false` (the hook still runs); to remove the cost entirely delete the PostToolUse group from `.claude/settings.json` — static rows and `--lookup` keep working.
- **Diagnostics:** `CK_DEBUG=1` (or `true`) makes the hook explain each decision on stderr (`[file-convention-inject] skip: …` / `delivered: …`). Diagnostics never touch stdout and never change delivery.
- **Retention:** a session folder in the store is removed once its newest entry is older than 7 days — swept on SessionStart `compact|clear` and, on the delivering path, at most once per 24 h (`_prune.json` marker), at most 50 sessions per sweep. A folder is removed only when it passes **two independent tests**: it carries the ownership marker `<session>/_owner.json` naming this ledger as owner, AND it is ledger-shaped (`_session.json`, `*.tmp`, and `main`/`agent-*` scope dirs holding only `*.json|*.lock|*.tmp`). Shape alone is NOT sufficient and never was safe on its own — `CK_CONVENTIONS_DIR` may point anywhere, and an unrelated directory can coincidentally match the shape, so shape-only pruning could delete a foreign directory outright. A folder that fails either test cannot be aged at all, so it is never swept. **Pre-existing unmarked folders are therefore never adopted and never pruned** — there is no signal that distinguishes a legacy ledger directory from a foreign one, and that indistinguishability is exactly the hazard; a live session re-marks itself on its next write, so only abandoned legacy directories linger, at a few KB each in a temp store. Missed prune costs disk; a false prune costs data. Paths that deliver nothing never write to the store.
- **Shape and budget:** first line = must-read references + skill protocols, one tagged section per class, last line repeats the references + lookup command. Over `maxChars`, the lowest-precedence class drops its rules first, then is omitted.
- **Store:** `CK_TMP_DIR/conventions` (override `CK_CONVENTIONS_DIR`); records are written only after stdout is flushed, and a ~10 s claim lock prevents duplicate reminders from simultaneous triggers.
- **Setup:** `/project-config` 2r, `/project-init` step 2b and `/scan` Phase 4 run `node .claude/hooks/lib/convention-merge.cjs --detect --merge [--write]` (additive; never clobbers maintainer or edited classes; `--enable` never overrides an explicit `enabled: false`; `--write` replaces the config atomically). A mirrored copy of the static-table builder resolves this lib through the generator's project root first, then `CLAUDE_PROJECT_DIR`/cwd, and only accepts a copy exporting the full renderer contract.
- **Static rows:** each row renders include patterns, then `ext <types>` and `· not <exclusions>` when the class has them, so a row never claims files the hook skips.
- **Doc routing:** `docs-update` routes edits of `contextGroups[]`/`conventionInjection` here; `.claude/scripts/doc-impact-map.cjs` matches classes by their `patternsDoc`/`guideDoc` fields only (regex/guide-doc routing), not by the delivery matchers.

| Host                   | Delivery                                                                                                                                                       | Condensation re-arm                                                                                                                                                                    | Helper-agent separation                 | Status                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| Claude Code            | PostToolUse `additionalContext` on `Read\|Edit\|Write\|MultiEdit\|NotebookEdit`                                                                                | SessionStart `compact\|clear` + transcript marks + byte/age re-arm                                                                                                                     | `agent_id` scope + sub-agent transcript | Runtime-verified (this repo)     |
| Codex                  | PostToolUse `additionalContext` for `apply_patch` (Add/Update targets; a moved file counts only at its Move-to destination), mirrored via `run-codex-sync.mjs` | SessionStart `compact\|clear` **is** mirrored since 2026-09-17 (see below) + byte re-arm; the blind age limit (`blindReinjectAfterMinutes`, 5 min) now applies only when neither fires | None (no helper id) ⇒ shared main scope | Doc-verified, runtime-unverified |
| Any host without hooks | Static "Automatic Skill Activation" table in CLAUDE.md/AGENTS.md + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`                               | Model re-reads per static rules                                                                                                                                                        | n/a                                     | Always available                 |

> **[SUPERSEDED 2026-09-17 — read this before the section below.]** The paragraphs that follow described a state where `sync-hooks.mjs` mirrored **no** SessionStart hook to Codex, and they closed by instructing the reader not to change that. That instruction has been **deliberately overridden** at the user's explicit direction, on evidence the original decision did not have:
>
> - The official Codex hook reference (<https://learn.chatgpt.com/docs/hooks>, checked 2026-09-17) lists **SessionStart** as a supported event with the matcher vocabulary `startup | resume | clear | compact` — the same as Claude's. The exclusion was not a capability limit.
> - The repo's own model of Codex was wrong in two further places, both now corrected: `sync-hooks.mjs` `supportedEvents` omitted SessionStart **and** SessionEnd (Codex supports both), and `verify-sync-divergence.mjs` recorded "Notification and SessionEnd have no Codex equivalent" as a reviewed baseline.
> - The concrete harm was not limited to this hook. `session-init-docs.cjs` is the **sole writer** of `.scan-stale`, and `init-prompt-gate.cjs` — which **is** mirrored — is its only reader. Dropping every SessionStart hook left that consumer registered in `.codex/hooks.json`, passing its tests, and permanently unreachable on Codex.
>
> The replacement is **narrow, not wholesale**: `sync-hooks.mjs` `codexSessionStartMirrors` names only the SessionStart hooks whose output a mirrored non-SessionStart hook consumes — `session-init-docs.cjs`, `file-convention-inject.cjs`, `prompt-ledger.cjs`. Everything else (`session-init`, `verify-install`, `npm-auto-install`, `graph-session-init`) is still skipped under the original `static-startup-context-authoritative` rationale, which remains correct for hooks that only restate what `AGENTS.md` / `.codex/CODEX_CONTEXT.md` already carry. `npm-auto-install` in particular runs a synchronous 120 s `execSync`, and mirroring it wholesale would have imported that into every Codex session start.
>
> **Consequence for this section:** on Codex the condensation re-arm is now driven by the mirrored SessionStart `compact|clear` group, so the blind window described below is the fallback rather than the normal path. The bound analysis stays accurate for hosts that report nothing; it no longer describes Codex's expected behavior. Runtime on Codex remains unverified.

**SessionStart delivers nothing (accepted divergence, with a known bound).** The SessionStart registration never emits a reminder: it only records a host-reported condensation and runs the retention sweep. Historically `sync-hooks.mjs` did not mirror SessionStart to Codex (reason code `static-startup-context-authoritative`), so on Codex those two duties fell to the PostToolUse path, and they degraded differently:

- **Retention is fully covered.** `maybePrune` sweeps on the delivering path at most once per 24 h, so no host depends on SessionStart for retention. Covered by TC-PFCI-051.
- **Condensation detection is NOT fully covered; the blind window is bounded, not closed.** The transcript branch needs `input.transcript_path` (`convention-ledger.cjs:211-216`) and matches a Claude JSONL shape by default (`BUILTIN_BOUNDARY`, `:34`; default `compactionMarkers` is empty, `file-conventions.cjs:36`). On a host that supplies neither a session-level condensation report nor a readable transcript, `lastCompactionAt` returns `-Infinity` (`:336`), so the `deliveredAt > lastCompactionAt` test (`:349`) always passes and presence is decided **only** by age. **A condensation on such a host is still invisible, and the reminder is suppressed — delayed, not repeated — until the age limit passes.** The "extra reminder, never a missed one" property therefore holds for the host report and the shorter-history rule, but **not** for the age fallback, which fails closed.
- **What bounds it:** that blind case gets its own, much shorter limit — `blindReinjectAfterMinutes` (default 5 min), not `reinjectAfterMinutes` (default 30 min) — so an unseen condensation can suppress a reminder for about five minutes rather than thirty. The blind limit applies **only** while nothing is observable: a scope whose size is unknown but whose condensations ARE observed (host report, or a mark in its own transcript) keeps the 30-minute limit, and a measurable transcript keeps the byte rule, so hosts that do report are not made noisier. The cost of the shorter limit is a few extra reminders on hosts that report nothing; it is a bound on the blind window, not a fix for it.
- **Further mitigation without touching the mirror:** lower `blindReinjectAfterMinutes` again for Codex-heavy work, or set `compactionMarkers` to that host's own boundary shape once known, which re-enables the transcript branch and moves the scope off the blind path entirely.

~~Do not add SessionStart to the Codex mirror to "fix" this — that exclusion is an existing framework decision owned elsewhere.~~ **Reversed 2026-09-17** — see the superseding note at the head of this section. The exclusion was owned by `sync-hooks.mjs`, it rested on an incorrect model of which events Codex supports, and it has been replaced by a per-hook allowlist rather than removed. The remaining guidance still stands: revisit if Codex begins supplying a transcript path, or if the blind window is observed to cause a real missed reminder on a host that reports nothing.

Coverage: TC-PFCI-040 ("blind window without transcript or condensation report") is the test for the no-transcript, no-report host shape and pins the 5-minute limit; TC-PFCI-037 ("age re-arm without transcript") covers the unknown-size-but-condensation-observed shape on the 30-minute limit; TC-PFCI-033 covers a full deliver → condense → re-deliver cycle driven by tool events alone with no SessionStart event, using a readable transcript.

---

## Session Prompt Ledger

Keeps the user's ORIGINAL request — and every later prompt of the session — recoverable and in attention, however long the run. Spec: `ContextDelivery/README.SessionPromptLedger.md` in the business spec root.

**Configuration** (`.claude/.ck.json`; on by default, no config needed):

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

- **Record:** every non-empty prompt of an identified session is redacted, bounded and appended to `tmp/prompt-ledger/<session>/ledger.json` + `ledger.md` (override `CK_PROMPT_LEDGER_DIR`) with `seq`, time, a ≤160-char goal line and the prompt text. Entry 1 is the original request and is never evicted; over `maxEntries` the oldest later entries drop with a recorded count. A prompt without a `session_id` is NOT recorded (no shared fallback file can mix sessions).
- **User input only:** host-generated payloads that arrive on the prompt channel (`<task-notification>`, `<system-reminder>`, `<cross-session-message>`, command echoes) are stripped from the recorded text, and a payload carrying nothing else is not recorded at all — a machine notice can never become the pinned goal.
- **Honest origin:** when the record is created while the conversation is already ≥ 20 000 bytes, the first entry is labelled "first recorded prompt (record started mid-session, the original request may be earlier)" in the pin note, the digest and `ledger.md`, instead of being called the original goal.
- **Only when missing:** the first prompt returns a one-line pin notice; afterwards the digest is delivered only when the last delivery is no longer present — same presence rule as the convention ledger (delivered after the last condensation AND transcript growth below `reinjectAfterBytes`; size unknown ⇒ age below `reinjectAfterMinutes`). Condensation signals reuse `convention-ledger.cjs` (`scanCompaction`) plus this store's own SessionStart report.
- **Triggers:** UserPromptSubmit (record + re-anchor), SessionStart `compact` (record condensation, deliver), `resume` (deliver when absent), `clear` (archive the record so the next prompt is the new original request), PostToolUse `TodoWrite|TaskCreate|TaskUpdate|update_plan` in the MAIN conversation (checkpoint re-anchor; a helper agent never receives it — its goal travels in its brief).
- **Digest shape:** original goal first, ≤8 newest goal lines plus a count of the rest, the record path, then the verify line with `[[prompt-ledger@hash8]]`; ≤1600 chars and never starting with `[`/`{` (Codex JSON sniffing). Prompt text is labelled quoted user data, never instructions.
- **Secrets:** private keys, AWS/GitHub/Slack/Google/Stripe/`sk-` keys, JWTs, `Bearer`/`Basic`/`Token` credentials, URL credentials and secret assignments (`password`, `secret`, `*_token`, `connection_string`, `cookie`, … including `_`-prefixed env-var names such as `DB_PASSWORD`) are replaced by `[REDACTED:<kind>]` BEFORE anything is stored or shown; the count is kept per entry. A redaction marker written by the prompt itself is neutralised first, so it can never shield a real value.
- **Retention:** when a session's first prompt creates a record, ledger-shaped session folders untouched for 7 days are removed (≤50 per run); a folder that is not ledger-shaped is never deleted (`CK_PROMPT_LEDGER_DIR` may point anywhere).
- **Opt-out / diagnostics:** `promptLedger.enabled: false` or `CK_PROMPT_LEDGER=0|off|false` makes it inert (the static protocol still binds). `CK_DEBUG=1` explains each decision on stderr. Any failure ⇒ no output, exit 0.

**Host matrix** — the UserPromptSubmit path is self-sufficient by design: it both records and re-anchors, so no host depends on SessionStart. `sync-hooks.mjs` never mirrors SessionStart to Codex (`disabledCodexEvents: static-startup-context-authoritative`), which is why the distance rules (growth / age) — not the condensation report — are what restores the goal there (`prompt-ledger.test.cjs::TC-SPL-016`).

| Host                                                      | Events that fire                                                                   | Record + pin                                            | Re-anchor mechanism                                                                                                                        | Status                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Claude Code                                               | UserPromptSubmit · SessionStart `compact\|resume\|clear` · PostToolUse checkpoints | UserPromptSubmit (plaintext)                            | Condensation report + transcript marks + growth/age + task checkpoints                                                                     | Runtime-verified (this repo)     |
| Codex                                                     | UserPromptSubmit · PostToolUse checkpoints (SessionStart is never mirrored)        | UserPromptSubmit (plaintext)                            | Growth/age distance on the prompt path; `update_plan` checkpoint best-effort                                                               | Doc-verified, runtime-unverified |
| Any host without hooks (Copilot, hooks disabled, opt-out) | none                                                                               | Model pins `Original goal:` and the `P1…Pn` list itself | `SYNC:session-goal-ledger` in every workflow skill, CLAUDE.md Task Planning Rules, and the prompt protocol mirrored into every Codex skill | Always available                 |

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

- An allow decision exits `0` with empty stdout. Diagnostics and advisory warnings belong on stderr.
  `doc-sync-gate.cjs` advisory warning is written to stderr; no allow path emits stdout.
- A block decision exits `2` with a human-readable stderr message and never writes a decision-looking
  object to stdout unless the hook is deliberately returning the documented `hookSpecificOutput` object.
- Input, evaluation, and output-transport failures are visible. Git, privacy, and path-boundary
  evaluation failures deny closed; the shell and scout heuristics preserve their existing fail-open
  policy but report the failure.
- Hooks set `process.exitCode` after writing output so Node can drain stdout/stderr. They must not call
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

Doc paths in this file are defaults resolved against the project-reference docs root — a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides that root.

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

Primary hook test status: `test-all-hooks.cjs` passes with 232 tests on a clean configured project. Aggregate discovery status: `run-all-tests.cjs` discovers 664 tests on the current suite set. These totals are maintained by the test-runner count guards; rerun both commands below before publishing a new count. The discovered total includes the process-boundary Bash contract suite and varies only when suites are intentionally added or removed.

| Test Surface          | Count | File/Location                                                     |
| --------------------- | ----- | ----------------------------------------------------------------- |
| Primary hook runner   | 232   | `.claude/hooks/tests/test-all-hooks.cjs`                          |
| Aggregate runner      | 664   | `.claude/hooks/tests/run-all-tests.cjs` (all suites, discovered)  |
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
