# Configuration Reference

> Complete guide to Claude Code configuration files

## Overview

Claude Code uses multiple configuration files to customize behavior, permissions, hooks, workflows, and integrations. This guide covers all configuration options and their effects.

```
.claude/
├── settings.json        # Main settings (hooks, permissions, plugins)
├── .ck.json             # Claude Kit configuration (levels, assertions)
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

**Purpose:** Claude Kit-specific configuration for output styles, planning, and project rules.

```json
{
    "codingLevel": 4,
    "privacyBlock": true,
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "validation": {
            "mode": "prompt",
            "minQuestions": 3,
            "maxQuestions": 8
        }
    },
    "assertions": ["Backend: Use service-specific repositories", "Frontend: Use project store base for state"]
}
```

| Field               | Type     | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `codingLevel`       | 0-5      | Output verbosity and style                   |
| `privacyBlock`      | boolean  | Enable privacy blocking hook                 |
| `plan.namingFormat` | string   | Plan directory naming pattern                |
| `plan.validation`   | object   | Plan validation settings                     |
| `assertions`        | string[] | Project-specific rules injected into context |
| `locale`            | object   | Language settings for thinking/responses     |
| `trust`             | object   | Trust passphrase configuration               |

**See:** [output-styles.md](./output-styles.md) for coding levels 0-5.

### Experience verification

Project-specific user/downstream experience review is configured in
`docs/project-config.json` under `experienceVerification`. It supports
web/mobile/desktop/terminal/API/library/background/generated surfaces without
assuming a particular runner. See
[experience-verification.md](./experience-verification.md) for the evidence,
baseline, and explicit-acceptance lifecycle.

#### Code Review Configuration

The `codeReview` section records which project-specific review-rule doc the review skills/agents read (rules are read on demand via the project-reference-docs gate in `CLAUDE.md`):

| Field            | Type     | Description                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `enabled`        | boolean  | Whether review skills/agents consult the rules doc (default: `true`)                 |
| `rulesPath`      | string   | Path to rules markdown file (default: `docs/project-reference/code-review-rules.md`) |
| `injectOnSkills` | string[] | Skills associated with the review-rules doc                                          |

**To update code review rules:** Edit `docs/project-reference/code-review-rules.md` directly. Review skills/agents read it on demand via the project-reference-docs gate.

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

| `conventionInjection` field | Default | Allowed | Meaning |
| --- | --- | --- | --- |
| `enabled` | `false` | boolean | Explicit opt-in |
| `maxChars` | `4000` | 500–10000 | Reminder size cap |
| `maxClassesPerEdit` | `4` | 1–10 | Classes per trigger (applied before dedup) |
| `reinjectAfterBytes` | `2000000` | ≥ 50000 | Conversation-history growth (transcript bytes, ~5–6 per visible character) that re-arms a class |
| `reinjectAfterMinutes` | `30` | 1–1440 | Age re-arm when history size is unknown but condensations ARE observed (host report or transcript mark) |
| `blindReinjectAfterMinutes` | `5` | 1–1440 | Age re-arm when the scope is blind — no transcript AND no condensation ever observed, so age is the only signal |
| `onRead` | `true` | boolean | Reads trigger reminders too |
| `compactionMarkers` | `[]` | regex strings | Extra transcript condensation marks |

Class fields deciding membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePathRegexes`, `excludePathGlobs`, `fileExtensions`) are part of the class's content version, so editing one re-delivers the class and changes its `[[convention:name@hash8]]` tag — regenerate CLAUDE.md/AGENTS.md afterwards. `guideDoc`/`patternsDoc` are the only fields used for documentation-impact routing (`.claude/scripts/doc-impact-map.cjs`); the delivery matchers are not.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`. Typical errors: `contextGroups[1] ("general-code"): needs at least one include matcher (pathRegexes, pathGlobs or fileNameRegexes)`, a duplicate or blank `name`, a malformed regex (the error names the class), or an out-of-range `conventionInjection.<field>`. Unknown group fields and a non-whole `priority` are warnings. Check what a file receives: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`. Details: [../hooks/README.md § Per-File Convention Injection](../hooks/README.md#per-file-convention-injection).

### Session prompt ledger

The optional `.claude/.ck.json` `promptLedger` object tunes the prompt-ledger hook (`prompt-ledger.cjs`), which records every user prompt of a session and re-anchors the original goal after condensation. It is ON by default — no config needed; `enabled: false` (or `CK_PROMPT_LEDGER=0|off|false`) makes it inert, leaving the static `SYNC:session-goal-ledger` protocol as the only carrier.

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

| `promptLedger` field | Default | Allowed | Meaning |
| --- | --- | --- | --- |
| `enabled` | `true` | boolean | Record prompts and deliver reminders |
| `maxPromptChars` | `4000` | 200–20000 | Per-prompt stored size before a truncation marker |
| `maxEntries` | `200` | 2–1000 | Entries kept per session (the original request is never evicted) |
| `reinjectAfterBytes` | `1000000` | ≥ 50000 | Conversation-history growth that re-arms the reminder |
| `reinjectAfterMinutes` | `45` | 1–1440 | Age re-arm when history size is unknown |

Records live in `tmp/prompt-ledger/<session>/` (override `CK_PROMPT_LEDGER_DIR`) and are pruned after 7 days. Out-of-range values are clamped, not rejected. Details: [../hooks/README.md § Session Prompt Ledger](../hooks/README.md#session-prompt-ledger).

---

### workflows.json

**Purpose:** Automatic workflow detection and execution configuration.

```json
{
    "settings": {
        "enabled": true,
        "showDetection": true
    },
    "workflows": {
        "feature": {
            "sequence": ["plan", "feature-implement", "test", "code-review", "docs-update"],
            "whenToUse": "User wants to implement new functionality"
        }
    }
}
```

**Schema:** Each workflow entry supports `description`, `name`, `parallelGroups`, `preActions`, `sequence`, `stepMeta`, `whenToUse`. There are NO `priority` or `triggers` properties — detection is semantic: the model matches the prompt against each workflow's `whenToUse` description and auto-selects the best fit (works in any prompt language).

**Live catalog (19 workflows):** `workflow-big-feature`, `workflow-bugfix`, `workflow-e2e`, `workflow-feature`, `workflow-feature-spec`, `workflow-greenfield-init`, `workflow-idea-to-pbi`, `workflow-idea-to-spec`, `workflow-refactor`, `workflow-research`, `workflow-review-changes`, `workflow-architecture-audit`, `workflow-code-to-spec`, `workflow-spec-to-pbi`, `workflow-spec-sync`, `workflow-visualize`, `workflow-seed-test-data`, `workflow-write-integration-test`, `workflow-integration-test-green`.

| Workflow                  | Sequence (abridged, from `workflows.json`)                                                                                                                           | whenToUse (abridged)                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `workflow-feature`        | investigate → … → plan → plan-review → … → plan-execute → … → integration-test → … → workflow-end                                                                    | Well-defined feature implementation               |
| `workflow-bugfix`         | investigate → debug-investigate → … → fix → … → workflow-end                                                                                                         | Bug, error, crash, regression; end-to-start trace |
| `workflow-refactor`       | investigate → plan → … → plan-execute → … → workflow-end                                                                                                             | Restructure code without behavior change          |
| `workflow-review-changes` | [parallel: changes-review + whole-target why-review] → validate findings → parallel specialists → code-simplifier → … → final whole-target why-review → workflow-end | Review uncommitted changes before committing      |

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

| Server     | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `github`   | GitHub API integration (issues, PRs, repos)                      |
| `context7` | Optional library-docs accelerator for `/web-research` (host-agnostic) |

---

## Quick Configuration Guide

### Enable/Disable Features

```json
// .ck.json
{
  "privacyBlock": false,     // Disable privacy blocking
  "codingLevel": 3           // Change output verbosity
}

// settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": false  // Disable plugin
  }
}
```

### Add Custom Assertions

```json
// .ck.json
{
    "assertions": ["Always use Prettier for formatting", "Never commit directly to main branch", "Use conventional commit messages"]
}
```

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
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Keep working directory in Bash                 |
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

-   [settings-reference.md](./settings-reference.md) - Complete settings.json reference
-   [output-styles.md](./output-styles.md) - Coding levels 0-5 explained
-   [../hooks/README.md](../hooks/README.md) - Hook system overview
-   [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

_Source: `.claude/` configuration files_
