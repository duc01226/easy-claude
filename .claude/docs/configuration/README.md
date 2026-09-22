# Configuration Reference

> Complete guide to Claude Code configuration files

## Overview

Claude Code uses multiple configuration files to customize behavior, permissions, hooks, workflows, and integrations. This guide covers all configuration options and their effects.

```
.claude/
├── settings.json        # Main settings (hooks, permissions, plugins)
├── .ck.json             # Claude Kit configuration (levels, assertions)
├── .ck.local.json       # Optional developer-local CK overrides (gitignored)
├── workflows.json       # Workflow automation definitions
└── .mcp.json            # MCP server integrations
CLAUDE.md                # Project instructions at repo root (read by Claude)
```

---

## Configuration Files

### settings.json

**Purpose:** Core Claude Code settings including hooks, permissions, and plugins.

| Section          | Purpose                        |
| ---------------- | ------------------------------ |
| `permissions`    | Tool allow/deny/ask rules      |
| `hooks`          | Event-based hook registrations |
| `env`            | Environment variables          |
| `attribution`    | Commit/PR footer text          |
| `enabledPlugins` | Plugin toggles                 |
| `statusLine`     | Custom status line command     |

**See:** [settings-reference.md](./settings-reference.md) for complete reference.

---

### settings.local.json

**Purpose:** Local overrides not committed to git (gitignored).

**Location:** `.claude/settings.local.json`

**Common uses:** API keys and secrets, personal preferences, development-only hooks, local MCP servers.

```json
{
    "mcpServers": {
        "local-db": {
            "command": "node",
            "args": ["./local-mcp-server.js"],
            "env": { "DB_HOST": "localhost" }
        }
    }
}
```

---

### .ck.json

**Purpose:** Claude Kit settings for output style, planning, and hook behavior. Project-specific architecture and coding conventions belong in `docs/project-config.json` and its referenced project documentation.

```json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "validation": {
            "mode": "prompt",
            "minQuestions": 3,
            "maxQuestions": 8
        }
    },
    "assertions": [
        "Search for existing implementations before creating new code",
        "Follow the project's documented architecture and conventions"
    ]
}
```

| Field               | Type     | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `plan.namingFormat` | string   | Plan directory naming pattern                |
| `plan.validation`   | object   | Plan validation settings                     |
| `assertions`        | string[] | Legacy compatibility field. The standard SessionStart path does not add it to prompt context; active project rules belong in `docs/project-config.json` and its reference docs |
| `locale`            | object   | Language settings for thinking/responses     |
| `trust`             | object   | Trust passphrase configuration               |

In this repository, the SessionStart hook loads `.ck.json` settings but does not inject the `assertions` array into prompt text. Keep this field only for compatibility with external consumers; use `contextGroups` and project reference docs for active project conventions.

**See:** [output-styles.md](./output-styles.md) for custom output styles.

### Experience verification

Project-specific user/downstream experience review is configured in
`docs/project-config.json` under `experienceVerification`. It supports
web/mobile/desktop/terminal/API/library/background/generated surfaces without
assuming a particular runner. See
[experience-verification.md](./experience-verification.md) for the evidence,
baseline, and explicit-acceptance lifecycle.

#### Code Review Configuration

The `codeReview` section records which project-specific review-rule doc the review skills/agents read (rules are read on demand via the project-reference-docs gate in `CLAUDE.md`):

| Field            | Type     | Description                                                                                                                                                                                                                         |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`        | boolean  | Whether review skills/agents consult the rules doc (default: `true`)                                                                                                                                                                |
| `rulesPath`      | string   | Path to rules markdown file (default: `code-review-rules.md` in the project-reference docs root, itself defaulting to `docs/project-reference` unless `docsRoots.projectReference.path` in `docs/project-config.json` overrides it) |
| `injectOnSkills` | string[] | Skills associated with the review-rules doc                                                                                                                                                                                         |

**To update code review rules:** Edit `code-review-rules.md` in the project-reference docs root directly. Review skills/agents read it on demand via the project-reference-docs gate.

**To add new trigger skills:** Edit `.claude/.ck.json`, add skill name to `injectOnSkills` array. Matching is case-insensitive and partial.

### Per-file convention injection

`docs/project-config.json` `contextGroups[]` entries double as convention classes; the optional top-level `conventionInjection` object switches the per-file reminder hook (`file-convention-inject.cjs`) on. Absent object or `enabled` not `true` ⇒ the hook is silent.

```json
{
    "contextGroups": [
        {
            "name": "feature-spec",
            "pathRegexes": [],
            "pathGlobs": ["docs/specs/**/*.md"],
            "priority": 100,
            "skills": ["spec"],
            "referenceDocs": ["docs/project-reference/feature-spec-reference.md"]
        },
        {
            "name": "general-code",
            "pathRegexes": [],
            "pathGlobs": ["**/*"],
            "excludePathGlobs": ["**/node_modules/**", "tmp/**"],
            "fileExtensions": [".js", ".cjs"],
            "priority": 900,
            "referenceDocs": ["docs/project-reference/code-review-rules.md"]
        }
    ],
    "conventionInjection": { "enabled": true }
}
```

| `conventionInjection` field | Default   | Allowed       | Meaning                                                                                                         |
| --------------------------- | --------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | `false`   | boolean       | Explicit opt-in                                                                                                 |
| `maxChars`                  | `4000`    | 500–10000     | Reminder size cap                                                                                               |
| `maxClassesPerEdit`         | `4`       | 1–10          | Classes per trigger (applied before dedup)                                                                      |
| `reinjectAfterBytes`        | `4500000` | ≥ 4500000     | Conversation-history growth (transcript bytes, ~5–6 per visible character, ≈200K tokens) that re-arms a class |
| `reinjectAfterMinutes`      | `30`      | 1–1440        | Age re-arm when history size is unknown but condensations ARE observed (host report or transcript mark)         |
| `blindReinjectAfterMinutes` | `5`       | 1–1440        | Age re-arm when the scope is blind — no transcript AND no condensation ever observed, so age is the only signal |
| `onRead`                    | `true`    | boolean       | Reads trigger reminders too                                                                                     |
| `compactionMarkers`         | `[]`      | regex strings | Extra transcript condensation marks                                                                             |

Class fields deciding membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePathRegexes`, `excludePathGlobs`, `fileExtensions`) are part of the class's content version, so editing one re-delivers the class and changes its `[[convention:name@hash8]]` tag — regenerate CLAUDE.md/AGENTS.md afterwards. `guideDoc`/`patternsDoc` are the only fields used for documentation-impact routing (`.claude/scripts/doc-impact-map.cjs`); the delivery matchers are not.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`. Typical errors: `contextGroups[1] ("general-code"): needs at least one include matcher (pathRegexes, pathGlobs or fileNameRegexes)`, a duplicate or blank `name`, a malformed regex (the error names the class), or an out-of-range `conventionInjection.<field>`. Unknown group fields and a non-whole `priority` are warnings. Check what a file receives: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`. Details: [../hooks/README.md § Per-File Convention Injection](../hooks/README.md#per-file-convention-injection).

### Session prompt ledger

The optional `.claude/.ck.json` `promptLedger` object tunes the prompt-ledger hook (`prompt-ledger.cjs`), which records every user prompt of a session and re-anchors the original goal after condensation. It is ON by default — no config needed; `enabled: false` (or `CK_PROMPT_LEDGER=0|off|false`) makes it inert, leaving the static `SYNC:session-goal-ledger` protocol as the only carrier.

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

| `promptLedger` field   | Default   | Allowed   | Meaning                                                          |
| ---------------------- | --------- | --------- | ---------------------------------------------------------------- |
| `enabled`              | `true`    | boolean   | Record prompts and deliver reminders                             |
| `maxPromptChars`       | `4000`    | 200–20000 | Per-prompt stored size before a truncation marker                |
| `maxEntries`           | `200`     | 2–1000    | Entries kept per session (the original request is never evicted) |
| `reinjectAfterBytes`   | `1000000` | ≥ 50000   | Conversation-history growth that re-arms the reminder            |
| `reinjectAfterMinutes` | `45`      | 1–1440    | Age re-arm when history size is unknown                          |

Records live in `tmp/prompt-ledger/<session>/` (override `CK_PROMPT_LEDGER_DIR`) and are pruned after 7 days. Out-of-range values are clamped, not rejected. Details: [../hooks/README.md § Session Prompt Ledger](../hooks/README.md#session-prompt-ledger).

### Default-on workflow routing

Automatic route selection is enabled by default. The tracked team preference lives in `docs/project-config.json` and can disable it:

```json
{ "portability": { "workflowAutoDetect": false } }
```

One developer can override that preference in `.claude/.ck.local.json`, which is ignored by `.claude/.gitignore` and travels with the portable `.claude` layout without entering version control:

```json
{ "portability": { "workflowAutoDetect": false } }
```

The local boolean wins over the team boolean for runtime prompt refreshes. Missing files, malformed JSON, and non-boolean values express no preference; when neither layer supplies a valid boolean, the effective value is `true`.

When the tracked value is enabled, generated `CLAUDE.md`, `AGENTS.md`, and `.codex/CODEX_CONTEXT.md` carry the canonical route gate. When the effective runtime value is enabled, `workflow-route-inject.cjs` refreshes that gate with the current workflow/skill catalog at `UserPromptSubmit`. It emits advisory plaintext, never blocks a prompt, suppresses duplicate delivery within a session, and re-arms after content changes, compaction, or about 4.5 MB of transcript growth (the framework proxy for roughly 200K tokens). Explicit skill or workflow invocation remains available while automatic routing is off.

### Custom workflow-route protocol

The same hook can carry project-supplied additional route rules via `portability.workflowRouteProtocol`. The team value lives in `docs/project-config.json`; a developer can override it in the git-ignored `.claude/.ck.local.json` (a valid local value replaces the team value). The value is either an inline string or an object `{ "text"?, "path"? }` where `path` is a repo-relative markdown file read at runtime (absolute paths and `..` segments are rejected):

```json
{ "portability": { "workflowRouteProtocol": { "path": "docs/project-protocols/route.md" } } }
```

`workflow-route-inject.cjs` appends the resolved text in its own marker block (`<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`), advisory only and never blocking. A `path` naming a privacy-sensitive file (`.env`, credentials, secrets, `*.pem`/`*.key`) is refused — the validator rejects it and the runtime treats it as no opinion — and a file over 20,000 bytes is truncated with a visible marker. It is runtime-only and is never stamped into tracked `CLAUDE.md`/`AGENTS.md`/Codex context.

### Startup dependency installation

`docs/project-config.json` `hooks.startupInstall` tunes the startup dependency install. Its single
consumer is the registered SessionStart integrity hook `.claude/hooks/verify-install.cjs`, which runs
the install-integrity scan first and then delegates policy to `.claude/hooks/lib/startup-install.cjs`.
The install is attempted only on an explicit `startup` session source and only when the project root
manifest declares dependencies that are not installed; no root manifest, no declared dependencies, or
dependencies already present are clean no-ops. A partial `.claude` bundle reports the repair path
and attempts no install at all.

```json
{
    "hooks": {
        "startupInstall": {
            "enabled": true,
            "packageManager": "auto",
            "allowLifecycleScripts": false
        }
    }
}
```

| `hooks.startupInstall` field | Type    | Default  | Allowed                              | Meaning                                                                                                      |
| ---------------------------- | ------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `enabled`                    | boolean | `true`   | boolean                              | `false` disables installation only (outcome `skip-disabled`)                                                 |
| `packageManager`             | string  | `"auto"` | `auto`, `npm`, `pnpm`, `yarn`, `bun` | One manager **signal**, never a precedence override                                                          |
| `allowLifecycleScripts`      | boolean | `false`  | boolean                              | A repository **request** only — effective solely with the `CK_STARTUP_INSTALL_TRUST=1` host grant (below)     |

**The section and every property in it are optional.** An omitted property keeps the portable default,
and the defaults are identical whether the property, the whole `hooks` section, or the entire
`docs/project-config.json` file is absent: `enabled: true`, `packageManager: "auto"`,
`allowLifecycleScripts: false`. A project that declares nothing behaves exactly as it did before the
section existed, so declare it only to record a needed non-default.

**A declared `packageManager` is a signal, not an override.** A non-`auto` value joins the other
available signals — the root manifest's Corepack `packageManager` field, `project.packageManagers`,
every recognized root lockfile, and a detected Yarn PnP install — and all of them must resolve to one
manager (and to at most one pinned version) or the install fails closed with `skip-manager-conflict`
and runs nothing. Declaring `"npm"` in a project carrying `pnpm-lock.yaml` therefore installs nothing;
it does not switch the project to npm. With no signal at all the historical `npm` fallback applies.

**Disabling installation never disables integrity verification.** `enabled: false` short-circuits the
install only; `verify-install.cjs` still scans the `.claude` bundle for missing hook files and
transitive requires, and still reports a partial copy.

**The manager executable and its arguments are not configurable — by design.** No config key can
supply a command, a flag, or a path. The hook only ever runs a fixed, version-matched argv taken from
its own support matrix, so no project config can turn the startup hook into an arbitrary command
runner, under a fixed 120-second deadline for the manager process. That closed argv is what makes
this section safe to expose at all. `allowLifecycleScripts: true` only removes the suppression
argument that matrix row already defines (`--ignore-scripts`, `--skip-builds`, or
`--mode=skip-build`); it grants nothing else, manager-native policy such as Bun's
`trustedDependencies` still governs dependency scripts, and a project-loaded manager extension
(a `pnpmfile`, `YARN_PLUGINS`, a `.yarnrc` `yarn-path`) skips the install regardless of the opt-in.

**`allowLifecycleScripts: true` needs a second, host-side signal to do anything.** A repository can
only REQUEST unsuppressed scripts; the environment variable `CK_STARTUP_INSTALL_TRUST=1` is the grant,
and the effective value is `allowLifecycleScripts === true && CK_STARTUP_INSTALL_TRUST === '1'`. This
is deliberate: a checked-in config travels with a clone, so it must not be able to authorize running a
dependency's install scripts on a machine whose owner never agreed to that. Without the grant the
install still proceeds with suppression intact — so the failure mode of setting only the config key is
SILENT (you get `--ignore-scripts` anyway, and the diagnostic vocabulary has no code for "request not
granted"). Grant it per machine in `.claude/settings.local.json`, which is git-ignored:

```json
{
    "env": {
        "CK_STARTUP_INSTALL_TRUST": "1"
    }
}
```

The same grant has a **second effect that is easy to miss**: without it the runner sanitizes the
manager's child environment — known registry-credential variables are stripped and npm's user and
global config paths are pointed at a credential-free device path, so an ambient `.npmrc` cannot be
read. Granting trust stops that sanitization, which is what lets a private-registry install
authenticate, and equally what exposes those credentials to whatever lifecycle scripts now run. Grant
it when a project genuinely needs built native dependencies or a private registry at session start;
leave it ungranted otherwise.

**Supported breadth.** Managers `npm`, `pnpm`, `yarn`, `bun` across the matrix rows `npm@10-11`,
`npm@12`, `pnpm@9.15.0`, `pnpm@12`, `yarn@1`, `yarn@2.4`, `yarn@3-4`, `bun@1.2`; recognized root
lockfiles `package-lock.json` and `npm-shrinkwrap.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock`
(yarn), `bun.lock` and `bun.lockb` (bun); platforms `win32`, `linux`, `darwin`. A manager version
outside the matrix, an ambiguous lockfile pair, a lockfile that is recognized but unsupported on the
installed version (npm 12 with only `npm-shrinkwrap.json`, Bun 1.2 with only the legacy `bun.lockb`),
an unsupported platform, or a Corepack shim all skip instead of guessing — a pinned dependency graph is
never reinterpreted as lockless.

**Config states.** An absent config file uses the defaults above. An invalid config file skips
installation with `skip-config-invalid`, and a config loader that cannot be loaded at all skips with
`skip-config-unavailable` — it fails closed rather than falling through to the enabled default, because
an adopter's explicit disablement cannot be established. Diagnostics are one-line, fixed-vocabulary
strings on stderr; they never echo a path, a config value, or manager output, and most skips are silent
no-ops.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`
(`--describe` prints the authoritative field list). Hook-side details:
[../hooks/README.md](../hooks/README.md).

---

### workflows.json

**Purpose:** Canonical workflow definitions and execution metadata. Use `portability.workflowAutoDetect` above to opt out of automatic routing.

```json
{
    "version": "2.4.0",
    "workflows": {
        "feature": {
            "sequence": ["plan", "feature-implement", "test", "code-review", "docs-update"],
            "whenToUse": "User wants to implement new functionality"
        }
    }
}
```

**Schema:** Each workflow entry supports `description`, `name`, `parallelGroups`, `preActions`, `sequence`, `stepMeta`, `whenToUse`. There are NO `priority` or `triggers` properties. When runtime routing is enabled, the model semantically matches the prompt against `whenToUse`; otherwise the catalog remains available only through explicitly invoked workflow skills.

**Live catalog (19 workflows):** `workflow-big-feature`, `workflow-bugfix`, `workflow-e2e`, `workflow-feature`, `workflow-feature-spec`, `workflow-greenfield-init`, `workflow-idea-to-pbi`, `workflow-idea-to-spec`, `workflow-refactor`, `workflow-research`, `workflow-review-changes`, `workflow-architecture-audit`, `workflow-code-to-spec`, `workflow-spec-to-pbi`, `workflow-spec-sync`, `workflow-visualize`, `workflow-seed-test-data`, `workflow-write-integration-test`, `workflow-integration-test-green`.

| Workflow                  | Sequence (abridged, from `workflows.json`)                                                                                                                           | whenToUse (abridged)                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `workflow-feature`        | investigate → … → plan → plan-review → … → plan-execute → … → integration-test → … → workflow-end                                                                    | Well-defined feature implementation               |
| `workflow-bugfix`         | investigate → debug-investigate → … → fix → … → workflow-end                                                                                                         | Bug, error, crash, regression; end-to-start trace |
| `workflow-refactor`       | investigate → plan → … → plan-execute → … → workflow-end                                                                                                             | Restructure code without behavior change          |
| `workflow-review-changes` | [parallel: changes-review + whole-target why-review] → parallel specialists → code-simplifier → … → final whole-target why-review (conditional on fix-cycle changes) → workflow-end | Review uncommitted changes before committing      |

---

### .mcp.json

**Purpose:** Model Context Protocol server integrations.

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "" }
        },
        "context7": {
            "command": "npx",
            "args": ["-y", "@context7/mcp-server"]
        }
    }
}
```

| Server     | Purpose                                                               |
| ---------- | --------------------------------------------------------------------- |
| `github`   | GitHub API integration (issues, PRs, repos)                           |
| `context7` | Optional library-docs accelerator for `/web-research` (host-agnostic) |

---

### opencode.json (recommended defaults)

**Purpose:** opencode's project config. The framework ships recommended defaults and reconciles them into each consuming project through `$sync-opencode`.

| Item | Path |
| --- | --- |
| Source of truth (edit this to change defaults) | `.opencode/opencode.recommended.json` |
| Generated target (created/updated by the sync) | `<project-root>/opencode.json` |
| Writer / verifier | `.claude/scripts/opencode/sync-config.mjs` (`--check` verifies) |
| Sub-agent mirror source of truth | `.claude/agents/*.md` |
| Sub-agent mirror target (generated) | `.opencode/agent/<name>.md` — one per canonical agent, `mode: subagent` + the canonical body verbatim |
| Sub-agent mirror writer / verifier | `.claude/scripts/opencode/sync-agents.mjs` (`--check` verifies) |

**To update a default recommended opencode setting:** edit `.opencode/opencode.recommended.json` and run `$sync-opencode` (or `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs`). The `config` stage deep-merges the recommended defaults into the project-root `opencode.json` — recommended keys win at every leaf, project-only keys survive untouched, and a project with no root config receives the recommended defaults verbatim. A malformed existing root config is reported, never clobbered.

**Adopting the framework in a new project:** copy the whole `.opencode/` folder (including `opencode.recommended.json`) plus `.claude/`, then run `$sync-opencode` to generate/update the project's root `opencode.json`, the hooks bridge, and the `.opencode/agent/*.md` sub-agent mirror.

**Compaction budget (all three surfaces = 500K tokens):**

This is a DEFAULT OF THE PORTABLE BUNDLE, not a setting of this repository: copy `.claude/` (plus `.codex/` and `.opencode/`) into any project and that project compacts at 500K too. Each surface delivers it differently:

| Surface | Key | How an adopting project receives it |
| --- | --- | --- |
| Claude Code | `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = "500000"` in `.claude/settings.json` | The file is copied verbatim with the bundle — nothing generates or rewrites it |
| Codex | `model_auto_compact_token_limit = 500000` in `.codex/config.toml` | Upserted by `.claude/scripts/codex/migrate-claude-to-codex.mjs` on every `$sync-codex`, alongside `notify` and the `[tui]` keys; an existing project config keeps its other keys |
| opencode | the pinned model's `limit.context = 500000` in `.opencode/opencode.recommended.json` | Deep-merged into the project-root `opencode.json` by `$sync-opencode`; a project with no root config receives it verbatim |

opencode has no absolute compaction threshold — it compacts relative to the model's declared window, so `limit.context` is the knob (it actually compacts at `limit.context - min(limit.output, 32000)` = 468,000). `compaction.reserved` is inert for this model: opencode reads it only for models that declare `limit.input`. See the `sync-opencode` skill ("Compaction budget") for the exact formula before changing any of these.

> `.opencode/opencode.recommended.json` MUST NOT be renamed to `.opencode/opencode.json`: opencode auto-loads that path as project config, so it would stop being a template.

**See:** the `sync-opencode` skill for the full stage roster and merge/portability contract.

---

## Quick Configuration Guide

### Enable/Disable Features

```json
// .ck.json
{
  "promptLedger": { "enabled": false }      // Disable prompt-ledger recording
}

// settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": false  // Disable plugin
  }
}
```

### Store Active Project Rules

Keep tracked `.claude` defaults project-neutral. Put path-specific conventions in
`docs/project-config.json` `contextGroups` and authoritative detail in the
referenced project docs. `.ck.json.assertions` is retained for compatibility,
but its values are not injected into the standard prompt context.

### Customize Plan Naming

```json
// .ck.json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "issuePrefix": "GH-"
    }
}
```

### Add Tool Permissions

```json
// settings.json
{
    "permissions": {
        "allow": ["Bash(docker:*)"],
        "deny": ["Bash(rm -rf /*)"],
        "ask": ["Bash(git push:*)"]
    }
}
```

---

## Configuration Inheritance

Configuration is loaded in order with later files overriding earlier:

1. **Claude Code defaults** - Built-in settings
2. **User settings** - `~/.claude/settings.json`
3. **Project settings** - `.claude/settings.json`
4. **Session settings** - Runtime modifications

---

## Environment Variables

| Variable                                   | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `CLAUDE_PROJECT_DIR`                       | Project root directory (used in hook commands) |
| `CK_DEBUG`                                 | Enable hook debug logging                      |
| `GITHUB_PERSONAL_ACCESS_TOKEN`             | GitHub MCP server auth                         |

---

## Permission Configuration

### Allowlist Patterns

```json
{
    "permissions": {
        "allow": ["Tool/**", "Tool(pattern:*)", "Bash(npm:*)", "Bash(git commit:*)", "Read(src/**)", "Write(src/**, !*.secret)"]
    }
}
```

### Common Permission Sets

**Read-only development:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Glob/**", "Grep/**"],
        "deny": ["Write/**", "Edit/**", "Bash(rm:*)"]
    }
}
```

**Full development access:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Write/**", "Edit/**", "Glob/**", "Grep/**", "Bash(npm:*)", "Bash(git:*)", "Bash(node:*)"]
    }
}
```

---

## Hook Configuration

### Event Types

| Event              | When Triggered            |
| ------------------ | ------------------------- |
| `SessionStart`     | Session begins            |
| `UserPromptSubmit` | User sends message        |
| `PreToolUse`       | Before tool execution     |
| `PostToolUse`      | After tool execution      |
| `Stop`             | Response complete         |
| `PreCompact`       | Before context compaction |
| `SessionEnd`       | Session ends              |
| `SubagentStart`    | Subagent spawning         |
| `Notification`     | Idle/waiting events       |

> These are the Claude Code events available for hooks. This framework registers no `SubagentStart` hook (sub-agent context is static in `agents/*.md`).

### Hook Structure

```json
{
    "hooks": {
        "EventName": [
            {
                "matcher": "ToolPattern",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/hook.cjs",
                        "timeout": 60
                    }
                ]
            }
        ]
    }
}
```

### Matcher Patterns

| Pattern               | Matches                |
| --------------------- | ---------------------- |
| `"Write"`             | Exact tool name        |
| `"Write\|Edit"`       | Multiple tools (regex) |
| `"*"` or `""`         | All tools              |
| `"mcp__server__tool"` | MCP tool               |

---

## Common Customizations

### Adding a New MCP Server

```json
{
    "mcpServers": {
        "my-server": {
            "command": "npx",
            "args": ["-y", "@my/mcp-server"],
            "env": { "API_KEY": "${MY_API_KEY}" }
        }
    }
}
```

### Adding a Custom Hook

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/my-custom-hook.cjs",
                        "timeout": 30
                    }
                ]
            }
        ]
    }
}
```

---

## Troubleshooting

### Configuration Not Applied

1. Check file syntax: `node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json')))"`
2. Verify file location
3. Check for local override in settings.local.json
4. Restart Claude Code session

### Hook Not Running

1. Check matcher pattern matches tool
2. Verify hook script exists
3. Check timeout setting
4. Run hook manually: `echo '{}' | node .claude/hooks/hook.cjs`

### Permission Denied

1. Check allow patterns match file path
2. Check for deny patterns overriding
3. Verify glob syntax

---

## Related Documentation

- [settings-reference.md](./settings-reference.md) - Complete settings.json reference
- [output-styles.md](./output-styles.md) - Custom output styles
- [../hooks/README.md](../hooks/README.md) - Hook system overview
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

_Source: `.claude/` configuration files_
