# Hooks Reference

> 14 top-level `.cjs` hooks and 43 lib modules for context-aware AI behavior (some hooks register on multiple events; the unified notification router lives under `.claude/hooks/notifications/notify.cjs`)

## Overview

Hooks are Node.js scripts (`.cjs`, plus one `.js`) that execute at specific Claude Code lifecycle events, enabling session initialization, safety gates, graph maintenance, code formatting, and optional runtime guidance. Universal enforcement, lifecycle recovery, and the default route gate stay in tracked context; the runtime hook refreshes the live routing catalog.

```
SessionStart hooks → UserPromptSubmit hooks → PreToolUse hooks → [Tool runs] → PostToolUse hooks
       ↓                    ↓                       ↓                                ↓
  Verify install         Intake + routing     Validate/block              Format edits
  Install deps                                Guard boundaries            Update graph
  Init state             route reminder       Block unsafe ops            Convention reminder
  Load docs / graph
```

> **Context injection (current architecture).** Universal project rules live **statically** in
> `CLAUDE.md`, agent `.md` files, and skill `SKILL.md` files, so Claude and Codex read identical
> instructions whether hooks are available or not. The workflow route gate lives in those static
> carriers, while the default-on `workflow-route-inject.cjs` hook re-delivers the live catalog at
> decision points. Tracked team config can opt out; a local override affects runtime delivery. The PreToolUse
> hooks are blocking/advisory **gates** and a few utility hooks; every hook below maps to a real
> registration in `.claude/settings.json`. Plan/skill/todo enforcement and compaction-state
> recovery remain **static model-driven guidance** (CLAUDE.md / SKILL.md), with hooks allowed to
> accelerate detection or reminders. `file-convention-inject.cjs` is such an accelerator: the
> same convention classes are rendered statically into the CLAUDE.md/AGENTS.md "Automatic Skill
> Activation" table and are printable with `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                                                                                 |
| ------------------ | ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 6     | Integrity preflight + guarded startup-install request validation, init state, load docs, init graph, record condensation, and re-anchor the prompt ledger |
| `SessionEnd`       | Session ends                 | 1     | Save pending-tasks warning, cleanup temp/swap files                                                                                                       |
| `UserPromptSubmit` | Before processing user input | 4     | Check project readiness and graph state, optionally inject workflow routing, and record prompts in the ledger                                             |
| `PreToolUse`       | Before tool execution        | 4     | AskUserQuestion notification, commit-operation gates, and document-sync warnings                                                                          |
| `PostToolUse`      | After tool completes         | 4     | Format code, update graph, per-file convention reminder, re-deliver the prompt ledger at task checkpoints                                                 |
| `Notification`     | Idle/waiting events          | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                                                                                            |
| `Stop`             | Response complete            | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                                                                                            |

> There are **no** `SubagentStart` hooks registered; subagent guidance is static in the
> agent `.md` files.

---

## Hook Catalog

### Session Lifecycle

| Hook                                     | Event                          | Matcher                                                  | Purpose                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`                     | SessionStart                   | `startup\|resume\|clear\|compact`                        | Install integrity preflight (runs first), then guarded startup dependency installation on an explicit `startup` event — the runner owns the per-project lock, the post-lock recheck and the process-tree cleanup proof           |
| `session-init.cjs`                       | SessionStart                   | `startup\|resume\|clear\|compact`                        | Initialize session: detect project, write env vars, validate config, cleanup temp files                                                                                                                                          |
| `session-init-docs.cjs`                  | SessionStart                   | `startup`                                                | Config skeleton + reference doc placeholder creation                                                                                                                                                                             |
| `graph-session-init.cjs`                 | SessionStart                   | `startup\|resume`                                        | Check Python/tree-sitter/graph.db, then `sync` the graph with git HEAD (skips if config not populated). `resume` included so a session resumed after someone else's commits landed still reconciles                              |
| `session-end.cjs`                        | SessionEnd                     | `clear\|exit\|compact`                                   | Revoke this session's Git leases on `clear`/`exit`, leave leases unchanged on `compact`, and clean up tmpclaude temp/swap files and stale snapshots                                                                              |
| `.claude/hooks/notifications/notify.cjs` | Stop, PreToolUse, Notification | –, `AskUserQuestion`, `AskUserPrompt\|permission_prompt` | Unified notification router → desktop dialog + optional Telegram/Discord/Slack; fires on task-complete (Stop), question (AskUserQuestion), and input/permission prompts. Single owner — replaces the retired `notify-waiting.js` |

`verify-install.cjs` is the ONLY registered SessionStart owner of startup
dependency installation. It runs the integrity scan first, then — on an explicit
`startup` source only — hands the decision to `lib/startup-install.cjs`, which
selects the manager from the project's own lockfile and manifest, takes a private
per-project lock, rechecks completeness after acquiring it, and proves its process
tree stopped. The hook stays non-blocking either way: it prints at most one
diagnostic line and never a stack trace.

The manager executable and its arguments are NOT configurable. The hook only ever
runs a fixed, version-matched argv from its own support matrix, so no project
config can turn it into an arbitrary command runner. What a project CAN set is
`hooks.startupInstall` in `docs/project-config.json` — `enabled`,
`packageManager` and `allowLifecycleScripts`; see the configuration reference.
Disabling installation never disables the integrity scan.

On Windows, the same owner also probes the machine-native Git capability. A
healthy result requires a canonical Git-for-Windows root containing `git.exe`,
`git-bash.exe`, and a working `bash.exe` under that root; WSL/System32 and
Windows App Execution Alias `bash.exe` entries are not accepted as Git Bash.
When the capability is missing, broken, or incomplete on an explicit `startup`,
the hook validates the trusted Windows App Installer/WinGet binary and may start
one detached, bounded repair worker with the fixed `Git.Git` package command:
`install --id Git.Git --exact --source winget --silent --disable-interactivity
--accept-source-agreements --accept-package-agreements`. Repair is skipped for
non-startup events, disabled/invalid policy, or an unavailable/unverifiable
WinGet/App Installer boundary; the next startup always probes again. UAC or
machine policy failures are advisory, fail closed, and never become an
unbounded installer path. PortableGit and generic installer fallbacks are
intentionally deferred.

The capability is published only to child/session environments: the resolved
Git and Git Bash paths are prefixed to the child `PATH` and exposed as
`CK_GIT_EXE`, `CK_GIT_BASH_EXE`, and `CK_GIT_BASH_PATH`. A child hook or manager
can therefore run native Git/Git Bash, but a child process cannot mutate the
already-running parent shell. The per-user repair resource uses the same
canonical private OS-temp lock discipline as startup installation, so concurrent
sessions re-probe and coordinate rather than launching duplicate repairs.

### Startup safety and recovery contract

The dependency runner holds one private lock per `SHA-256(realpath(projectRoot))`
under a canonicalized OS-temp parent, outside the adopter project. The child
record includes the canonical root, host identity, PID/process-start identity,
descendant/process-group identity, and an unguessable owner token. Parent and
child privacy are validated before atomic exclusive creation: POSIX requires the
current UID, `0700` directory and `0600` record; Windows requires an ACL limited
to the current user and trusted system principals. Symlink/reparse paths,
unsafe redirected temp parents, nonprivate ACLs, and unverifiable states fail
closed.

The manager deadline is 120 seconds. Process-tree cleanup has a separate maximum
of 30 seconds after timeout or normal exit when descendants remain. If every
process is not proven stopped, the lock is retained, no retry or age-only reclaim
occurs, one sanitized warning is emitted, and SessionStart returns. A contender
polls every 100 ms for at most five seconds; only verified live-owner contention
returns `install already in progress`. Stale recovery requires matching root,
host, PID/process-start identity, and token, positive proof that the owner and
all descendants are dead, an unchanged owner record, and atomic reacquisition.
Operators must never delete a lock because it is old; if any proof is unavailable,
leave it retained for a later startup.

### Exact package-manager matrix required in the hook reference

The following table is the executable support contract. The left side of each
argv pair is the default script-suppressed form; the right side is effective
only when `allowLifecycleScripts: true` and the host grants
`CK_STARTUP_INSTALL_TRUST=1`. Lock-preserving flags remain on the opt-in path.

| Manager / supported version | Lockfile evidence                                                                  | Locked argv (default / opt-in)                                                                                   | Lockless argv (default / opt-in)                                             | Additional documented skip boundary                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm `10.x` / `11.x`         | Exactly one of `package-lock.json` or `npm-shrinkwrap.json`; manager signals agree | `ci --ignore-scripts` / `ci`                                                                                     | `install --ignore-scripts` / `install`                                       | Skip unknown versions, both npm lockfiles, another manager lockfile, or conflicts. `npm ci` replaces the existing root `node_modules` tree when it rebuilds dependencies.               |
| npm `12.x`                  | `package-lock.json`                                                                | `ci --ignore-scripts` / `ci`                                                                                     | `install --ignore-scripts` / `install`                                       | Shrinkwrap-only is an unsupported lockfile, not lockless; skip both npm lockfiles and conflicts. `npm ci` replaces the existing root `node_modules` tree when it rebuilds dependencies. |
| pnpm `9.15.0`               | `pnpm-lock.yaml`; manager signals agree                                            | `install --frozen-lockfile --ignore-scripts` / `install --frozen-lockfile`                                       | `install --ignore-scripts` / `install`                                       | Skip other pnpm 9 versions, unsupported versions/lockfiles, or conflicts. Do not pass `--pm-on-fail`.                                                                                   |
| pnpm `12.x`                 | `pnpm-lock.yaml`; manager signals agree                                            | `install --frozen-lockfile --ignore-scripts --pm-on-fail=error` / `install --frozen-lockfile --pm-on-fail=error` | `install --ignore-scripts --pm-on-fail=error` / `install --pm-on-fail=error` | Skip unsupported versions/lockfiles or conflicts; `--pm-on-fail=error` prevents pinned-CLI downloads.                                                                                   |
| Yarn Classic `1.x`          | `yarn.lock`; exact trusted external version                                        | `install --frozen-lockfile --ignore-scripts --non-interactive` / `install --frozen-lockfile --non-interactive`   | `install --ignore-scripts --non-interactive` / `install --non-interactive`   | Skip unknown versions and unsafe `.yarnrc` `yarn-path` forwarding; never apply Berry flags.                                                                                             |
| Yarn Berry `2.4.x`          | `yarn.lock`; exact trusted external version; no unsafe `yarnPath`                  | `install --immutable --skip-builds` / `install --immutable`                                                      | `install --skip-builds` / `install`                                          | Skip Berry 2.0–2.3, unsupported versions/lockfiles, conflicts, plugins, or unsafe forwarding.                                                                                           |
| Yarn Berry `3.x`–`4.x`      | `yarn.lock`; exact trusted external version; no unsafe `yarnPath`                  | `install --immutable --mode=skip-build` / `install --immutable`                                                  | `install --mode=skip-build` / `install`                                      | Skip unsupported/new majors, versions/lockfiles, conflicts, plugins, or unsafe forwarding.                                                                                              |
| Bun `1.2.x`                 | `bun.lock`; `bun.lockb` unsupported                                                | `install --frozen-lockfile --ignore-scripts` / `install --frozen-lockfile`                                       | `install --ignore-scripts` / `install`                                       | Skip other Bun versions, `.lockb`, unsupported lockfiles, or conflicts; Bun `trustedDependencies` still applies after opt-in.                                                           |

`project.packageManagers` is absent or empty for no signal, or exactly one
string matching `^(npm|pnpm|yarn|bun)(?:@\d+\.\d+\.\d+)?$`; malformed or
multiple entries fail closed, and an exact version pin must match the trusted
external executable. A missing lockfile alone is not a conflict: `auto` uses
npm only when no manager signal exists. Root-manifest installs may change the
selected manager's native workspace graph. Yarn PnP is static-only: the hook
never executes `.pnp.js`/`.pnp.cjs`; malformed, stale, escaping, or inconclusive
presence evidence skips. Corepack shims, project-local shims, unsafe Windows
launches, manager extensions (`.pnpmfile`, Yarn plugins, nonempty inherited
`YARN_PLUGINS`), and unsafe forwarded `yarnPath` are independent skip boundaries.

The project config is not an executable-command surface. `enabled: false`
disables installation but leaves integrity verification active; an absent config
uses portable defaults, an absent root `package.json` is a clean install no-op,
and invalid config skips installation with one fixed diagnostic.

### Prompt Intake (UserPromptSubmit)

Prompt hooks may warn, synchronize state, record the prompt ledger, or emit optional advisory context. Only explicit safety gates block.

| Hook                        | Event            | Matcher | Purpose                                                                                                                                        |
| --------------------------- | ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`      | UserPromptSubmit | `*`     | Warn/route until project context, root instructions, docs, and graph are current                                                               |
| `workflow-route-inject.cjs` | UserPromptSubmit | `*`     | Default-on advisory route/catalog injection; tracked team config can opt out and an ignored developer-local override controls runtime delivery |

### Gates (PreToolUse)

| Hook                     | Matcher                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doc-sync-gate.cjs`      | `Bash` and `Write\|Edit\|MultiEdit` | Doc⇄Code sync gate — WARN-only (every path exits 0; warnings go to stderr): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced`                                                                                                                                                                                                                    |
| `review-commit-gate.cjs` | `Bash`                              | Review-before-commit gate — require a matching full-changeset review or user-approved `skip` receipt for every supported commit statement, bound to the exact repository storage, base tree, and candidate tree. Supports default staged content, `-a`/`--all`, and explicit literal `-- <files>`; unsupported Git contexts or candidate-computation errors fail closed with recovery guidance. A worktree review survives staging only when those exact trees match. |

> **Plan/skill/todo enforcement is now static.** The former `edit-enforcement`,
> `skill-enforcement`, and `workflow-task-guard` gates (block edits/skills/task-completion
> without a `TaskCreate` item) are now **model-driven rules in `CLAUDE.md`** (Task Planning
> Rules). The former `agent-files-skill-gate` setup router is replaced by
> the static project-reference doc gate in `CLAUDE.md` / `SKILL.md`.

### Lessons Injection

The lessons file (`lessons.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) reading contract lives statically in
`CLAUDE.md` / agent / skill instructions; the model re-reads `lessons.md` on demand
(including after compaction) per that static contract — there is no runtime lessons-inject
hook.

Lessons are managed via the `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                        | Event                  | Purpose                                                                                                                       |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`      | UserPromptSubmit       | Warn/route until project context, root instructions, docs, and graph are current                                              |
| `workflow-route-inject.cjs` | UserPromptSubmit       | Inject the route gate and live catalog only when effective `portability.workflowAutoDetect` is `true`; advisory and fail-open |
| `session-init-docs.cjs`     | SessionStart:`startup` | Config skeleton + reference doc placeholder creation                                                                          |

> Plan/skill/todo enforcement and cross-compaction todo persistence are **model-driven
> static guidance** (`CLAUDE.md` Task Planning Rules + `TaskList` re-read on resume), not
> hooks.

### Commit Gates

| Hook                     | Matcher | Purpose                                                                                                                     |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `review-commit-gate.cjs` | `Bash`  | Require a review fix-loop receipt over the exact changeset before an agent commit; a user-approved `skip` receipt clears it |

### Context Management & Utility

| Hook                         | Event                                                                                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-edit-prettier.cjs`     | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Auto-run the PROJECT-configured formatter on edited files (resolved from project-config `formatting`; framework default is Prettier); terminate the complete formatter process tree on timeout                                                                                                                                                                                                                                                                                    |
| `graph-auto-update.cjs`      | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Incremental graph update after file edits (debounced)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `graph-prompt-sync.cjs`      | UserPromptSubmit                                                                                                      | Re-sync the graph when git HEAD moved since the last prompt (pull/checkout/merge). Gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually changed; never blocks the prompt                                                                                                                                                                                                                                                                       |
| `workflow-route-inject.cjs`  | UserPromptSubmit                                                                                                      | Default-on workflow route/catalog reminder. Tracked team config can opt out; `.claude/.ck.local.json` controls only the developer's runtime refresh. Appends an optional project-supplied `portability.workflowRouteProtocol` in its own marker block. Deduplicates by session/scope/content hash, re-arms on compaction or ~4.5 MB of transcript growth, and always fails open                                                                                                   |
| `prompt-ledger.cjs`          | UserPromptSubmit; SessionStart:`compact\|resume\|clear`; PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan` | Session prompt ledger (accelerator, never a gate): records every user prompt under `tmp/prompt-ledger/<session>/` with secrets redacted, pins the first prompt as the original goal, and re-delivers a short digest only when that reminder is no longer present (condensation, long growth, checkpoint). On by default; `promptLedger.enabled: false` / `CK_PROMPT_LEDGER=0` disables; always exit 0, silent on any failure. See [Session Prompt Ledger](#session-prompt-ledger) |
| `file-convention-inject.cjs` | PostToolUse:`Read\|Edit\|Write\|MultiEdit\|NotebookEdit`; SessionStart:`compact\|clear`                               | Per-file convention reminder (accelerator, never a gate): after a read/change, emits `additionalContext` with the rules, skill protocols and reference docs of the convention classes (`contextGroups[]`) the file belongs to — only classes not already present in this working context (including the `ui-ux-gate` class for front-end files). Opt-in `conventionInjection.enabled`; always exit 0, silent on any failure. See [Per-File Convention Injection](#per-file-convention-injection)                                         |

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
SESSION START (6 hooks)                         DURING SESSION
  verify-install.cjs ───────────────────┐         graph-auto-update.cjs (after edits)
    └── partial-copy preflight          │         post-edit-prettier.cjs (after edits)
  session-init.cjs ─────────────────────┤         file-convention-inject.cjs (after reads/edits)
  file-convention-inject.cjs (compact|clear: record condensation, no output)
  prompt-ledger.cjs (compact|resume|clear: re-anchor the original request)
    ├── cleanup temp files              │         prompt-ledger.cjs (task checkpoints)
    ├── detectProjectType()             │       PROMPT (UserPromptSubmit)
    ├── resolvePlanPath()               │         init-prompt-gate.cjs (gate)
    └── writeEnv() (CK_* vars)          │         graph-prompt-sync.cjs (HEAD-change resync)
  session-init-docs.cjs                 │       PRETOOLUSE GATES
  graph-session-init.cjs ───────────────┘         review-commit-gate
                                                  doc-sync-gate (WARN)
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

43 direct `.cjs` modules under `.claude/hooks/lib/`.

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
| `path-boundary-policy.cjs`  | Pure command/path role classification helper; library module, not a registered hook                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `project-root.cjs`          | Resolve and validate the consuming project root across cwd/script/env launch shapes                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `review-receipt.cjs`        | Snapshots, issues, verifies, skips, and clears short-lived review receipts bound to the exact repository, base tree, and candidate tree                                                                                                                                                                                                                                                                                                                                                                    |
| `sensitive-path-policy.cjs` | Pure sensitive-path classification shared by sensitive-path consumers                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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

| Module                           | Purpose                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `project-config-loader.cjs`      | Load and validate project configuration, generate project summary                                                            |
| `project-config-schema.cjs`      | Project config JSON schema definition                                                                                        |
| `project-reference-registry.cjs` | Resolves reference-doc aliases, owners, and scan targets; validates selected docs and contains paths within configured roots |
| `spec-artifact-profile.cjs`      | Validates configured spec-artifact profiles and matches identifiers against declared grammars                                |
| `test-fixture-generator.cjs`     | Generate test fixture data for hook tests                                                                                    |

### Startup Installation

| Module                     | Purpose                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startup-install.cjs`      | Owns startup dependency installation end to end: validates the request against project and manager preconditions, then runs the selected manager under the project lock. `runStartupInstall` is the boundary the hook calls; `buildInstallRequest` is the decision half, useful on its own in tests. |
| `startup-install-lock.cjs` | The private per-project lock the runner holds while a manager runs — owner liveness, post-acquire recheck, and proof the whole process tree stopped before the lock is reclaimed.                                                                                                                    |
| `windows-git.cjs`          | Probes native Git/Git Bash, validates trusted WinGet, starts the bounded `Git.Git` repair worker, and publishes child-local `PATH`/`CK_GIT_*` capability values.                                                                                                                                     |

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
- **Per-class window and evidence** (not rendered, not part of `hash8`): `reinjectAfterTokens` (20000–2000000) gives one class its own re-arm distance, converted at 22 transcript bytes per token (the measurement behind the 4500000-byte default), so 100000 tokens ⇒ 2200000 bytes. `evidenceDocs` (ALL read) / `evidenceSkills` (ANY loaded) make the class count as present when the history already carries its protocol: the hook tail-scans the last window bytes of the working context's transcript for `Read` tool calls whose `file_path` ends with each doc, or a `Skill` tool call / `<command-name>/skill</command-name>` for a listed skill, keeping only evidence after the last condensation mark in that window and dated after the last host-reported condensation. A hit is recorded as an `evidence` delivery (ages like a delivery) and nothing is sent. Evidence the scanner cannot see (shell reads, other transcript shapes, agent definitions) costs an extra reminder, never a missed one.
- **UI/UX gate (`ui-ux-gate`):** the framework class `UI_UX_GATE` in `lib/convention-merge.cjs`. Setup detection proposes it only when the config records front-end evidence (a `modules[]` kind starting `frontend`, or non-empty `styling.fileExtensions`), so a project without a front-end never pays; delivery stays behind `conventionInjection.enabled`. Members by file name: html/htm/xhtml, razor/cshtml, hbs/handlebars/ejs/pug/twig/liquid/njk, css/scss/sass/less/styl/pcss, jsx/tsx/vue/svelte/astro, Angular `*.component.ts`, xaml/axml/storyboard/xib, and Android `res/layout*/…xml`; NOT mdx (documentation prose), ts/js (mostly logic), swift/kt/dart (SwiftUI, Compose and Flutter share the extension with non-UI code, which a path matcher cannot separate). Payload: a compact digest naming `UI-1.1`–`UI-9.4` (`SYNC:ui-ux-design-principles`), `DD-1`–`DD-8` (`.claude/docs/design-knowledge.md`), `CL-1`–`CL-6` with §0.5 / B12–B15 / E9–E11 / §R / I15 / K10 (`.claude/docs/design-review-checklist.md`) and calibration (`.claude/docs/design-review-calibration.md`), with MUST-read of those docs. Window `reinjectAfterTokens: 100000`; evidence = both the checklist and design-knowledge read, or any of `ui-review`, `design`, `design-spec`, `web-design-guidelines`, `pbi-mockup`, `artifact-review` loaded. Timing: Claude's Edit/Write of an existing file requires a prior Read, so the Read trigger delivers the gate before the first edit; a brand-new file gets it right after its first Write (delivery is PostToolUse-only by design — never blocks), and the static `[DESIGN-GATE]` in CLAUDE.md/AGENTS.md covers the rest. Widen or narrow membership by editing the class in `contextGroups[]`. Tests: `tests/suites/ui-ux-gate-inject.test.cjs`.
- **Content version:** `hash8` covers the rendered items AND membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePath*`, normalized `fileExtensions`) plus the renderer version, so a matcher edit re-delivers and refreshes the static rows. Changing it invalidates every carrier tag: regenerate CLAUDE.md/AGENTS.md (`run-codex-sync.mjs`) or consumers lose static credit until they do — an extra reminder, never a missed one.
- **Cost and opt-out:** the `Read` trigger costs ~15 ms per read (one config load plus a stat of the transcript) and is kept because a read almost always precedes the first edit of a file. To silence reads set `conventionInjection.onRead: false` (the hook still runs); to remove the cost entirely delete the PostToolUse group from `.claude/settings.json` — static rows and `--lookup` keep working.
- **Diagnostics:** `CK_DEBUG=1` (or `true`) makes the hook explain each decision on stderr (`[file-convention-inject] skip: …` / `delivered: …`). Diagnostics never touch stdout and never change delivery.
- **Retention:** a session folder in the store is removed once its newest entry is older than 7 days — swept on SessionStart `compact|clear` and, on the delivering path, at most once per 24 h (`_prune.json` marker), at most 50 sessions per sweep. A folder is removed only when it passes **two independent tests**: it carries the ownership marker `<session>/_owner.json` naming this ledger as owner, AND it is ledger-shaped (`_session.json`, `*.tmp`, and `main`/`agent-*` scope dirs holding only `*.json|*.lock|*.tmp`). Shape alone is NOT sufficient and never was safe on its own — `CK_CONVENTIONS_DIR` may point anywhere, and an unrelated directory can coincidentally match the shape, so shape-only pruning could delete a foreign directory outright. A folder that fails either test cannot be aged at all, so it is never swept. **Pre-existing unmarked folders are therefore never adopted and never pruned** — there is no signal that distinguishes a legacy ledger directory from a foreign one, and that indistinguishability is exactly the hazard; a live session re-marks itself on its next write, so only abandoned legacy directories linger, at a few KB each in a temp store. Missed prune costs disk; a false prune costs data. Paths that deliver nothing never write to the store.
- **Shape and budget:** first line = must-read references + skill protocols, one tagged section per class, last line repeats the references + lookup command. Over `maxChars`, the lowest-precedence class drops its rules first, then is omitted.
- **Store:** `CK_TMP_DIR/conventions` (override `CK_CONVENTIONS_DIR`); records are written only after stdout is flushed, and a ~10 s claim lock prevents duplicate reminders from simultaneous triggers.
- **Setup:** `/project-config` 2r, `/project-init` step 2b and `/scan` Phase 4 run `node .claude/hooks/lib/convention-merge.cjs --detect --merge [--write]` (additive; never clobbers maintainer or edited classes; `--enable` never overrides an explicit `enabled: false`; `--write` replaces the config atomically). A mirrored copy of the static-table builder resolves this lib through the generator's project root first, then `CLAUDE_PROJECT_DIR`/cwd, and only accepts a copy exporting the full renderer contract.
- **Static rows:** each row renders include patterns, then `ext <types>` and `· not <exclusions>` when the class has them, so a row never claims files the hook skips.
- **Doc routing:** `docs-update` routes edits of `contextGroups[]`/`conventionInjection` here; `.claude/scripts/doc-impact-map.cjs` matches classes by their `patternsDoc`/`guideDoc` fields only (regex/guide-doc routing), not by the delivery matchers.

| Host                   | Delivery                                                                                                                                                       | Condensation re-arm                                                                                                                                                                        | Helper-agent separation                 | Status                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------- |
| Claude Code            | PostToolUse `additionalContext` on `Read\|Edit\|Write\|MultiEdit\|NotebookEdit`                                                                                | SessionStart `compact\|clear` + transcript marks + byte/age re-arm                                                                                                                         | `agent_id` scope + sub-agent transcript | Runtime-verified (this repo)     |
| Codex                  | PostToolUse `additionalContext` for `apply_patch` (Add/Update targets; a moved file counts only at its Move-to destination), mirrored via `run-codex-sync.mjs` | SessionStart `compact\|clear` is mirrored for the allowlisted runtime producers + byte re-arm; the blind age limit (`blindReinjectAfterMinutes`, 5 min) is the fallback when neither fires | None (no helper id) ⇒ shared main scope | Doc-verified, runtime-unverified |
| Any host without hooks | Static "Automatic Skill Activation" table in CLAUDE.md/AGENTS.md + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`                               | Model re-reads per static rules                                                                                                                                                            | n/a                                     | Always available                 |

**Codex SessionStart is selectively mirrored.** Static-only producers remain
omitted under `static-startup-context-authoritative`, because their content is
already carried by `AGENTS.md` / `.codex/CODEX_CONTEXT.md`. The runtime producer
allowlist mirrors `session-init-docs.cjs`, `file-convention-inject.cjs`,
`prompt-ledger.cjs`, and `verify-install.cjs`: the first three publish state read
by mirrored consumers, while `verify-install.cjs` probes/repairs native Git/Git
Bash and publishes a machine capability that static context cannot represent.
Groups without an allowlisted producer are recorded as skipped; Codex's
SessionStart matcher vocabulary otherwise matches `startup|resume|clear|compact`.
The sync report and divergence oracle are the source of truth for this
allowlist; current runtime verification remains explicitly marked below.

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

**Host matrix** — the UserPromptSubmit path is self-sufficient by design: it
both records and re-anchors, so a host without hooks still has the static goal
contract. Codex additionally mirrors the allowlisted SessionStart producers;
the distance rules (growth / age) remain the fallback when no condensation or
transcript signal is observable (`prompt-ledger.test.cjs::TC-SPL-016`).

| Host                                                      | Events that fire                                                                                           | Record + pin                                            | Re-anchor mechanism                                                                                                                        | Status                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Claude Code                                               | UserPromptSubmit · SessionStart `compact\|resume\|clear` · PostToolUse checkpoints                         | UserPromptSubmit (plaintext)                            | Condensation report + transcript marks + growth/age + task checkpoints                                                                     | Runtime-verified (this repo)     |
| Codex                                                     | UserPromptSubmit · SessionStart `compact\|resume\|clear` (allowlisted producers) · PostToolUse checkpoints | UserPromptSubmit (plaintext)                            | SessionStart condensation signal + growth/age distance; `update_plan` checkpoint best-effort                                               | Doc-verified, runtime-unverified |
| Any host without hooks (Copilot, hooks disabled, opt-out) | none                                                                                                       | Model pins `Original goal:` and the `P1…Pn` list itself | `SYNC:session-goal-ledger` in every workflow skill, CLAUDE.md Task Planning Rules, and the prompt protocol mirrored into every Codex skill | Always available                 |

---

## Workflow Route Injection

`workflow-route-inject.cjs` refreshes the canonical tracked route gate with the current workflow and skill catalog.

- **Default:** enabled when no valid setting is present.
- **Team setting:** `docs/project-config.json` → `portability.workflowAutoDetect`.
- **Developer override:** `.claude/.ck.local.json` → `portability.workflowAutoDetect`. This file is matched by `.claude/.gitignore` `*.local.json`; a valid local boolean wins in either direction.
- **Custom protocol:** `portability.workflowRouteProtocol` (team or developer-local, resolved through the same cascade with a valid local value replacing the team value). A string is inline markdown; an object carries inline `text` and/or a repo-relative `path` read at runtime (absolute/`..` and privacy-sensitive paths such as `.env`/credentials/keys are rejected, and a file over 20,000 bytes is truncated with a visible marker). The resolved text is appended after the catalog inside `<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`. Runtime-only — it is never stamped into tracked context, and it is part of the delivery content hash so a change re-delivers.
- **Delivery:** advisory plaintext on `UserPromptSubmit`; malformed input, missing session identity, read/build/state failures, and output failures all produce no context and exit successfully.
- **Dedup:** session + scope + content hash in `tmp/workflow-routing/`. A changed gate/catalog re-delivers immediately.
- **Re-arm:** after a detected compaction, transcript shrink, or 4,500,000 bytes of transcript growth (the portable proxy for roughly 200K tokens). A host that exposes no transcript-size or compaction evidence stays deduplicated for the session; elapsed wall time alone does not prove that the context crossed the token boundary.
- **Explicit invocation:** skills and workflows remain directly invokable while automatic routing is disabled because their source definitions are unchanged.

The same hook source is projected into `.codex/hooks.json` and the OpenCode hook bridge. Neither projection copies the effective local setting into tracked output.

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

> All hooks exit 0 (non-blocking) except blocking safety gates (`review-commit-gate`) which exit 2 to block. `init-prompt-gate.cjs` and `doc-sync-gate.cjs` are WARN-only — every code path exits 0.

### Bash PreToolUse reliability contract

The two registered Bash hooks use the shared `runPreToolHookSync` completion contract in
`.claude/hooks/lib/hook-runner.cjs`:

- An allow decision exits `0` with empty stdout. Diagnostics and advisory warnings belong on stderr.
  `doc-sync-gate.cjs` advisory warning is written to stderr; no allow path emits stdout.
- A block decision exits `2` with a human-readable stderr message and never writes a decision-looking
  object to stdout unless the hook is deliberately returning the documented `hookSpecificOutput` object.
- Error diagnostics are written to stderr. The commit gates use exit 2; doc-sync uses exit 0 for
  input and handler errors.
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
                        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/doc-sync-gate.cjs",
                        "type": "command"
                    }
                ],
                "matcher": "Bash"
            }
        ]
    }
}
```

### Hook-Specific Config (`.claude/.ck.json`)

Doc paths in this file are defaults resolved against the project-reference docs root — a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides that root.

```json
{
    "codeReview": {
        "enabled": true,
        "rulesPath": "docs/project-reference/code-review-rules.md"
    }
}
```

---

## Testing

The primary runner passes with 130 tests. The full aggregate runner `run-all-tests.cjs` discovers 663 tests (659 passed, 4 skipped on a clean checkout), including the process-boundary Bash contract and code-graph storage portability suites; the total changes when suites are intentionally added or removed.

| Test Surface          | Count | File/Location                                                     |
| --------------------- | ----- | ----------------------------------------------------------------- |
| Primary hook runner   | 130   | `.claude/hooks/tests/test-all-hooks.cjs`                          |
| Aggregate runner      | 663   | `.claude/hooks/tests/run-all-tests.cjs` (all suites, discovered)  |
| Standalone test files | TODO  | `tests/test-*.cjs/.js` excluding runner (re-verify before citing) |
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
