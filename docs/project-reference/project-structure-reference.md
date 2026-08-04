# Project Structure Reference

> **Goal:** Ground AI work in easy-claude's verified framework topology, runtime entry points, configuration surfaces, and commands so agents never invent application services, ports, or deployment infrastructure.
> **MUST ATTENTION** Treat configured modules as framework libraries unless source evidence proves a deployable application.
> **NEVER** infer ports, delivery providers, environments, or secret values; use cited configuration only.

<!-- Last scanned: 2026-08-04 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Ground AI work in easy-claude's verified framework topology, runtime entry points, configuration surfaces, and commands so agents never invent application services, ports, or deployment infrastructure.

**Summary:**

- Start with Architecture Overview: single-package framework/library repository, not an application backend/frontend.
- Map work through Key Directories, Module Codes, and Key Entry Points; `.claude/` is canonical, `.agents/`/`.codex/` are generated mirrors.
- Read ports, commands, setting keys, and versions only from cited sources; keep secret values outside docs.
- Re-run `$scan --target=project-structure` when topology or canonical inventory markers change.

**Workflow:** Architecture classification → relevant module/entry point → source-backed runtime/config evidence → graph/path verification.

**Key Rules:** MUST ATTENTION use `docs/project-config.json` as the module map. NEVER infer missing application/deployment layers. ALWAYS update canonical `.claude` sources before generated mirrors.

## Overview

**easy-claude** is a portable Claude Code enhancement framework. No application backend/frontend code; the repository is the framework.

## Architecture Overview

| Axis          | Detected state                                                                          | Evidence                                                                      |
| ------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Repository    | Single-package framework/library repository; all configured modules are libraries       | `docs/project-config.json:23-73`, `package.json:2-18`                         |
| Runtime       | Event-driven CommonJS hooks plus Python/Node tooling; no deployable application service | `.claude/docs/hooks/README.md:7-38`, `.claude/hooks/session-init.cjs:315-321` |
| Orchestration | Direct command execution; no configured container or service orchestrator               | `docs/project-config.json:149-152`, `package.json:18-47`                      |
| Delivery      | Undetermined: no provider workflow or IaC manifest is present                           | `docs/project-config.json:152`, `package.json:18-47`                          |

## Service Architecture

No backend API, worker, frontend app, Docker deploy unit, database, or broker configured (`docs/project-config.json:23-73`, `docs/project-config.json:149-152`). Hooks are CLI lifecycle handlers, not network services (`.claude/docs/hooks/README.md:7-38`).

One opt-in local utility serves Markdown on loopback only:

| Utility               | Type                           | Port                                                      | Entry point                                                                                                                             |
| --------------------- | ------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown Novel Viewer | Local development HTTP utility | Defaults to `3456`, searches `3456-3500`, CLI-overridable | `.claude/skills/markdown-novel-viewer/scripts/server.cjs:39-61`, `.claude/skills/markdown-novel-viewer/scripts/lib/port-finder.cjs:6-9` |

## Infrastructure Ports

No mandatory database, broker, cache, or application port (`docs/project-config.json:149-152`). Loopback Markdown viewer port is local tooling, not deployment infrastructure.

## Deployment & Delivery

Delivery stack: **undetermined (no CI/IaC config found)**. Root commands cover local sync, generation, verification, and tests; no build/publish/deploy pipeline, promotion, or rollback defined (`package.json:18-47`). NEVER infer a provider.

## Environment Configuration

| Setting group                 | Surface                                                                                    | Purpose                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Framework runtime             | `.claude/settings.json:24-30`                                                              | `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`, context/auto-memory controls, stop-hook cap, MCP timeout |
| MCP authentication references | `.claude/.mcp.json:6-7`, `.claude/.mcp.json:21-22`                                         | `GITHUB_PERSONAL_ACCESS_TOKEN`, `FIGMA_PERSONAL_ACCESS_TOKEN`                                        |
| Notification references       | `.claude/hooks/notifications/.env.example:8-21`                                            | Telegram, Discord, and Slack reference names                                                         |
| Optional skill credentials    | `.claude/skills/docs-seeker/.env.example:3-15`, `.claude/skills/devops/.env.example:10-23` | Context/search, repository, and deployment-tool reference names                                      |

MUST ATTENTION record setting keys/reference names only; keep credential values in environment or secret stores.

## Frontend Apps

None. No frontend framework dependency, app mapping, dev-server port, or frontend build command is configured (`docs/project-config.json:106-121`, `package.json:16-47`).

## Key Directories

| Path                      | Purpose                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `.claude/hooks/`          | Runtime lifecycle hooks and shared hook libraries (`docs/project-config.json:23-37`)            |
| `.claude/skills/`         | Task automation definitions and optional skill-local tooling (`docs/project-config.json:38-44`) |
| `.claude/agents/`         | Specialized sub-agent definitions (`docs/project-config.json:45-51`)                            |
| `.claude/scripts/`        | Catalog, sync, graph, worktree, and maintenance tooling (`docs/project-config.json:52-58`)      |
| `.claude/workflows.json`  | Registered workflow definitions (`docs/project-config.json:59-65`)                              |
| `.claude/docs/`           | Framework documentation (`docs/project-config.json:66-72`)                                      |
| `docs/project-reference/` | Project-specific AI reference docs (`docs/project-config.json:158-250`)                         |

## Component Architecture

| Component      | Count                                                                                         | Location                      | Format                                                                              |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Hooks          | <!-- COUNT:hooks -->16<!-- /COUNT -->                                                         | `.claude/hooks/*.cjs`         | Top-level CommonJS Node.js hook scripts counted by ADR-0002                         |
| Hook Libraries | <!-- COUNT:lib-modules -->25<!-- /COUNT -->                                                   | `.claude/hooks/lib/*.cjs`     | CommonJS utility modules                                                            |
| Skills         | <!-- COUNT:skills -->161<!-- /COUNT -->                                                       | `.claude/skills/*/SKILL.md`   | Markdown + YAML frontmatter                                                         |
| Agents         | <!-- COUNT:agents -->29<!-- /COUNT -->                                                        | `.claude/agents/*.md`         | Markdown definitions                                                                |
| Workflows      | <!-- COUNT:workflows -->18<!-- /COUNT -->                                                     | `.claude/workflows.json`      | JSON workflow definitions                                                           |
| Output Styles  | 6                                                                                             | `.claude/output-styles/*.md`  | Coding level presets (ELI5→God)                                                     |
| Scripts        | 31                                                                                            | `.claude/scripts/*`           | CJS/ESM + Python utilities (top-level; excludes tests and non-executable data/docs) |
| Codex Scripts  | 13                                                                                            | `.claude/scripts/codex/*.mjs` | Top-level ESM sync, migration, notification, and verification tools                 |
| Hook Tests     | 18 suites + 8 `test-*` files                                                                  | `.claude/hooks/tests/`        | CJS/JS test files; top-level `test-*` files plus `run-all-tests.cjs` aggregate      |
| Codex Mirrors  | <!-- COUNT:skills -->161<!-- /COUNT --> skills, <!-- COUNT:agents -->29<!-- /COUNT --> agents | `.agents/`, `.codex/`         | Generated Codex-compatible copy                                                     |

## Project Directory Tree

```
easy-claude/
├── .claude/                 # Canonical framework source
│   ├── agents/              # Specialized agent definitions
│   ├── docs/                # Framework guides
│   ├── hooks/               # Runtime hooks + shared libraries/tests
│   ├── scripts/             # Catalog, graph, sync, and maintenance tools
│   ├── skills/              # Skill definitions + optional local tooling
│   └── workflows.json       # Registered workflow definitions
├── .agents/                 # Generated Codex skill mirror
├── .codex/                  # Generated Codex context/configuration
├── docs/
│   ├── adr/                 # Architecture decisions
│   ├── project-reference/   # Project-specific AI context
│   ├── release/             # Release archives
│   └── templates/           # Authored templates
├── AGENTS.md                # Codex-facing generated instructions
├── CLAUDE.md                # Canonical project instructions
├── package.json             # Node tooling commands + runtime requirement
└── README.md                # Project overview and setup
```

## Tech Stack

| Category | Technology            | Details                                            |
| -------- | --------------------- | -------------------------------------------------- |
| Runtime  | Node.js 18+           | Hook execution, scripts                            |
| Language | JavaScript (CommonJS) | All hooks and hook libraries                       |
| Language | Python 3              | Catalog generation, utility scripts                |
| Language | Markdown              | Skills, agents, documentation                      |
| Config   | JSON                  | workflows.json, settings.json, project-config.json |
| Testing  | Custom CJS runner     | `node .claude/hooks/tests/test-all-hooks.cjs`      |
| Platform | Claude Code CLI       | Target platform for the framework                  |
| Platform | Codex CLI             | Compatibility mirror generated from Claude sources |

## Module Codes

| Code | Module         | Location                       | Description                                                                                                               |
| ---- | -------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| HK   | Hooks          | `.claude/hooks/`               | <!-- COUNT:hooks -->16<!-- /COUNT --> top-level `.cjs` runtime hook files (session init, safety gates, graph, formatting) |
| HL   | Hook Libraries | `.claude/hooks/lib/`           | <!-- COUNT:lib-modules -->25<!-- /COUNT --> shared utility modules for hooks                                              |
| SK   | Skills         | `.claude/skills/`              | <!-- COUNT:skills -->161<!-- /COUNT --> task automation skill definitions                                                 |
| AG   | Agents         | `.claude/agents/`              | <!-- COUNT:agents -->29<!-- /COUNT --> specialized subagent role definitions                                              |
| WF   | Workflows      | `.claude/workflows.json`       | <!-- COUNT:workflows -->18<!-- /COUNT --> end-to-end process orchestrations                                               |
| SC   | Scripts        | `.claude/scripts/`             | 31 top-level CJS/ESM/Python utilities; excludes tests and non-executable data/docs                                        |
| CX   | Codex Tooling  | `.claude/scripts/codex/`       | 13 top-level ESM sync, migration, notification, and verification scripts                                                  |
| CM   | Codex Mirrors  | `.agents/`, `.codex/`          | Generated Codex-compatible skills, agents, hooks                                                                          |
| OS   | Output Styles  | `.claude/output-styles/`       | 6 coding level presets                                                                                                    |
| NT   | Notifications  | `.claude/hooks/notifications/` | Multi-channel notification providers (5)                                                                                  |
| SB   | Scout Block    | `.claude/hooks/scout-block/`   | Broad search prevention subsystem (4 modules)                                                                             |
| HT   | Hook Tests     | `.claude/hooks/tests/`         | 18 suite files + 8 top-level `test-*` files + `run-all-tests.cjs` aggregate                                               |

## Hooks (<!-- COUNT:hooks -->16<!-- /COUNT --> top-level `.cjs` files)

### Safety Hooks

| Hook                  | Event      | Purpose                                 |
| --------------------- | ---------- | --------------------------------------- |
| `path-boundary-block` | PreToolUse | Block access outside project scope      |
| `privacy-block`       | PreToolUse | Block access to secrets/credentials     |
| `scout-block`         | PreToolUse | Prevent overly broad glob/grep patterns |

### Quality Hooks

| Hook               | Event            | Purpose                              |
| ------------------ | ---------------- | ------------------------------------ |
| `init-prompt-gate` | UserPromptSubmit | Gate initial prompt processing       |
| `doc-sync-gate`    | PreToolUse       | Gate edits that require doc sync     |
| `git-commit-block` | PreToolUse       | Block unauthorized commit/stage/push |

> **Static enforcement.** Task creation, skill activation, edit gates, and workflow task-list integrity live in `CLAUDE.md` / `SKILL.md`; hookless harnesses read the same rules.

### Static Project Context

> Backend/frontend/SCSS/design/lessons/mindset/role guidance lives in `CLAUDE.md`, `docs/project-reference/*`, and relevant skills. Read it through the project-reference docs gate; no runtime context-injection hook supplies it.

### Graph Hooks

| Hook                 | Event        | Purpose                                |
| -------------------- | ------------ | -------------------------------------- |
| `graph-session-init` | SessionStart | Report graph status / install guidance |
| `graph-auto-update`  | PostToolUse  | Incremental graph update after edits   |

### Session Management Hooks

| Hook                | Event        | Purpose                               |
| ------------------- | ------------ | ------------------------------------- |
| `session-init`      | SessionStart | Initialize session state, load config |
| `session-init-docs` | SessionStart | Check/create reference docs           |
| `session-end`       | SessionEnd   | Persist state, cleanup                |
| `verify-install`    | SessionStart | Verify framework install integrity    |

> **Compaction recovery:** re-read `CLAUDE.md` / `SKILL.md` plus persisted task tracking; no live `PreCompact` recovery hook exists.

### Workflow Hooks

> **Workflow tracking:** progression is model-driven against `CLAUDE.md` and persisted task tracking; no workflow-step hook advances tasks.

### Utility Hooks

| Hook                                     | Event             | Purpose                                                        |
| ---------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `post-edit-prettier`                     | PostToolUse       | Run prettier after edits                                       |
| `npm-auto-install`                       | SessionStart      | Auto-install npm deps on startup                               |
| `windows-command-detector`               | PreToolUse        | Detect Windows-specific commands                               |
| `bash-shell-guard`                       | PreToolUse        | Block PowerShell here-strings; name the POSIX heredoc form     |
| `.claude/hooks/notifications/notify.cjs` | Stop/Notification | Unified notification router (desktop + Telegram/Discord/Slack) |

> **Post-processing:** no large-output swap, post-agent validator, or bash-cleanup hook is registered.

> **Sub-agent context:** `.claude/agents/*.md` carries static context; no `SubagentStart` hook supplies it.

## Workflows (<!-- COUNT:workflows -->18<!-- /COUNT -->)

| Category                   | Registered Workflows                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| **Core Development**       | `workflow-feature`, `workflow-bugfix`, `workflow-refactor`, `workflow-big-feature`                  |
| **Discovery & Planning**   | `workflow-idea-to-pbi`, `workflow-idea-to-spec`, `workflow-greenfield-init`, `workflow-spec-to-pbi` |
| **Spec & Documentation**   | `workflow-code-to-spec`, `workflow-spec-sync`, `workflow-feature-spec`, `workflow-research`         |
| **Testing**                | `workflow-write-integration-test`, `workflow-e2e`, `workflow-seed-test-data`                        |
| **Review & Visualization** | `workflow-review-changes`, `workflow-architecture-audit`, `workflow-visualize`                      |

> **Also available as workflow skills** (invokeable via `/workflow-<name>` but not registered in `workflows.json`):
> `ba-dev-handoff`, `business-evaluation`, `course-building`, `design`, `design-dev-handoff`,
> `dev-qa-handoff`, `end`, `feature-with-integration-test`, `greenfield`, `marketing-strategy`,
> `pm-reporting`, `pre-development`, `qa-po-acceptance`, `research`, `seed-test-data`,
> `sprint-planning`, `sprint-retro`, `start`, `testing`

## Agents (<!-- COUNT:agents -->29<!-- /COUNT -->)

| Agent                      | Specialization                               |
| -------------------------- | -------------------------------------------- |
| `architect`                | System design, ADRs, cross-service analysis  |
| `backend-developer`        | Backend implementation with project patterns |
| `business-analyst`         | Requirement refinement, story creation       |
| `code-reviewer`            | File-by-file code review with reports        |
| `code-simplifier`          | Code clarity and maintainability             |
| `database-admin`           | DB queries, optimization, migrations         |
| `debugger`                 | Root cause analysis, diagnostic reports      |
| `docs-manager`             | Documentation detection and updates          |
| `e2e-runner`               | E2E test generation and maintenance          |
| `frontend-developer`       | Frontend implementation with design system   |
| `fullstack-developer`      | Parallel plan execution, file ownership      |
| `git-manager`              | Commits, branches, conventional commits      |
| `integration-tester`       | Integration test generation from specs       |
| `journal-writer`           | Technical difficulty documentation           |
| `knowledge-worker`         | Research, synthesis, report generation       |
| `performance-optimizer`    | Backend + frontend performance analysis      |
| `planner`                  | Implementation planning, trade-off analysis  |
| `product-owner`            | Value-driven decisions, backlog management   |
| `project-manager`          | Progress tracking, status consolidation      |
| `quality-gate-review`      | Quality gates, compliance verification       |
| `researcher`               | Technology research, best practices          |
| `scout`                    | File location across large codebases         |
| `scout-external`           | File location via external tools             |
| `security-auditor`         | OWASP compliance, vulnerability assessment   |
| `solution-architect`       | Greenfield project inception                 |
| `spec-compliance-reviewer` | Implementation vs specification matching     |
| `tester`                   | Test execution, coverage analysis            |
| `ui-ux-designer`           | UI/UX design, wireframes, accessibility      |

## Key Entry Points

| Entry Point                              | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `.claude/settings.json`                  | Hook registration, permissions, features                             |
| `.claude/hooks/session-init.cjs`         | Session startup — loads config, sets state                           |
| `CLAUDE.md` / `SKILL.md`                 | Static rules/lessons re-anchored after compaction (no recovery hook) |
| `.claude/workflows.json`                 | All <!-- COUNT:workflows -->18<!-- /COUNT --> workflow definitions   |
| `docs/project-config.json`               | Project-specific runtime configuration                               |
| `.claude/hooks/tests/test-all-hooks.cjs` | Main test runner                                                     |
| `CLAUDE.md`                              | Project instructions for Claude                                      |

## Scan Targets (13)

The single `/scan --target=<key>` skill populates `docs/project-reference/` (per-target detail in `.claude/skills/scan/references/targets.md`):

| `--target=<key>`             | Generates                                             |
| ---------------------------- | ----------------------------------------------------- |
| `project-structure`          | `project-structure-reference.md`                      |
| `backend-patterns`           | `backend-patterns-reference.md`                       |
| `frontend-patterns`          | `frontend-patterns-reference.md`                      |
| `scss-styling`               | `scss-styling-guide.md`                               |
| `design-system`              | `docs/project-reference/design-system/README.md`      |
| `code-review-rules`          | `code-review-rules.md`                                |
| `domain-entities`            | `domain-entities-reference.md`                        |
| `feature-spec`               | `feature-spec-reference.md`                           |
| `docs-index`                 | `docs-index-reference.md`                             |
| `e2e-tests`                  | `e2e-test-reference.md`                               |
| `integration-tests`          | `integration-test-reference.md`                       |
| `seed-test-data`             | `seed-test-data-reference.md`                         |
| `ui-system` _(orchestrator)_ | runs design-system + scss-styling + frontend-patterns |

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ground AI work in easy-claude's verified framework topology, runtime entry points, configuration surfaces, and commands so agents never invent application services, ports, or deployment infrastructure.

**IMPORTANT MUST ATTENTION** classify repository → select module/entry point → read cited runtime/config evidence → run graph/path verification.
**IMPORTANT MUST ATTENTION** treat `.claude/` as canonical and `.agents/` / `.codex/` as generated mirrors.
**IMPORTANT MUST ATTENTION** use actual configuration for every port, command, version, and setting reference.
**IMPORTANT MUST ATTENTION** keep secret values out of reports/docs; record key/reference names only.
**NEVER** fabricate a backend, frontend, database, broker, container, CI/IaC provider, environment, promotion flow, or rollback mechanism when evidence is absent.
