# Project Structure Reference

<!-- Last scanned: 2026-05-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Overview

**easy-claude** is a Claude Code enhancement framework — a portable `.claude` template that transforms Claude Code into a project-aware, quality-enforced AI development agent. No application backend/frontend code; this project IS the framework.

## Component Architecture

| Component      | Count                                                                                         | Location                      | Format                                                                             |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Hooks          | <!-- COUNT:hooks -->65<!-- /COUNT -->                                                         | `.claude/hooks/*.cjs`         | Top-level CommonJS Node.js hook scripts counted by ADR-0002                        |
| Hook Libraries | <!-- COUNT:lib-modules -->29<!-- /COUNT -->                                                   | `.claude/hooks/lib/*.cjs`     | CommonJS utility modules                                                           |
| Skills         | <!-- COUNT:skills -->258<!-- /COUNT -->                                                       | `.claude/skills/*/SKILL.md`   | Markdown + YAML frontmatter                                                        |
| Agents         | <!-- COUNT:agents -->28<!-- /COUNT -->                                                        | `.claude/agents/*.md`         | Markdown definitions                                                               |
| Workflows      | <!-- COUNT:workflows -->37<!-- /COUNT -->                                                     | `.claude/workflows.json`      | JSON workflow definitions                                                          |
| Output Styles  | 6                                                                                             | `.claude/output-styles/*.md`  | Coding level presets (ELI5→God)                                                    |
| Scripts        | 28                                                                                            | `.claude/scripts/*`           | CJS + Python utilities (top-level; excludes code_graph package internals + tests/) |
| Codex Scripts  | 10                                                                                            | `.claude/scripts/codex/*.mjs` | ESM sync, migration, notification, and verification tools                          |
| Hook Tests     | 16 suites + 13 standalone                                                                     | `.claude/hooks/tests/`        | CJS/JS test files; 14 `test-*` files including primary runner                      |
| Codex Mirrors  | <!-- COUNT:skills -->258<!-- /COUNT --> skills, <!-- COUNT:agents -->28<!-- /COUNT --> agents | `.agents/`, `.codex/`         | Generated Codex-compatible copy                                                    |

## Project Directory Tree

```
easy-claude/
├── .agents/                          # Codex skill mirror generated from .claude/skills
│   ├── README.md
│   └── skills/                       # 258 Codex-compatible skill manifests
├── .codex/                           # Codex compatibility artifacts
│   ├── agents/                       # 28 generated TOML agent definitions
│   ├── CODEX_CONTEXT.md              # Hookless context parity for Codex
│   ├── config.toml                   # Codex local config
│   ├── hooks.json                    # Generated Codex hook map
│   └── hooks.sync.report.json        # Hook sync report
├── .claude/                          # Framework directory (the template library)
│   ├── .ck.json                      # Claude Kit configuration
│   ├── .ckignore                     # Ignore patterns for Claude Kit
│   ├── .env.example                  # Environment template
│   ├── .gitignore                    # Framework-level gitignore
│   ├── .mcp.json                     # MCP server configuration
│   ├── .mcp.README.md               # MCP configuration docs
│   ├── .mcp.json.example            # MCP config template
│   ├── .todo-state.json              # Persistent todo state
│   ├── metadata.json                 # Framework metadata (large)
│   ├── settings.json                 # Hook registration & features
│   ├── settings.local.json.example   # Local settings template
│   ├── workflows.json               # 37 workflow definitions
│   ├── workflows.schema.json        # Workflow JSON schema
│   ├── agent-memory/                 # Persistent agent memory
│   │   ├── backend-developer/
│   │   ├── code-reviewer/
│   │   ├── code-simplifier/
│   │   ├── frontend-developer/
│   │   ├── fullstack-developer/
│   │   ├── knowledge-worker/
│   │   ├── planner/
│   │   └── researcher/
│   ├── agents/                       # 28 agent definitions
│   │   ├── architect.md
│   │   ├── backend-developer.md
│   │   ├── code-reviewer.md
│   │   ├── debugger.md
│   │   ├── frontend-developer.md
│   │   ├── planner.md
│   │   ├── security-auditor.md
│   │   └── ... (28 total)
│   ├── config/                       # Templates & config
│   │   ├── README.md
│   │   ├── agent-template.md
│   │   ├── skill-template.md
│   │   └── release-notes-template.yaml
│   ├── docs/                         # Framework documentation
│   │   ├── README.md
│   │   ├── claude-ai-agent-framework-guide.md  # Architecture deep-dive
│   │   ├── quick-start.md
│   │   ├── universal-setup-guide.md
│   │   ├── troubleshooting.md
│   │   ├── skill-naming-conventions.md
│   │   ├── anti-hallucination-patterns.md
│   │   ├── AI-DEBUGGING-PROTOCOL.md
│   │   ├── team-collaboration-guide.md
│   │   ├── agents/                   # Agent documentation
│   │   ├── configuration/            # Settings reference
│   │   ├── hooks/                    # Hook documentation
│   │   ├── skills/                   # Skill documentation
│   │   └── team-artifacts/           # Templates for PBIs, stories, specs
│   ├── hooks/                        # 65 top-level .cjs runtime hook files (+ notify-waiting.js)
│   │   ├── config/                   # Hook configuration
│   │   │   └── swap-config.json
│   │   ├── docs/                     # Hook documentation
│   │   │   └── README.md
│   │   ├── lib/                      # 29 shared utility modules
│   │   │   ├── __tests__/            # Lib unit tests
│   │   │   ├── ck-config-loader.cjs
│   │   │   ├── ck-config-utils.cjs
│   │   │   ├── ck-env-utils.cjs
│   │   │   ├── ck-git-utils.cjs
│   │   │   ├── ck-path-utils.cjs
│   │   │   ├── ck-paths.cjs
│   │   │   ├── ck-plan-resolver.cjs
│   │   │   ├── ck-session-state.cjs
│   │   │   ├── context-injector-base.cjs
│   │   │   ├── context-tracker.cjs
│   │   │   ├── debug-log.cjs
│   │   │   ├── dedup-constants.cjs
│   │   │   ├── edit-state.cjs
│   │   │   ├── hook-runner.cjs
│   │   │   ├── notify-windows.ps1
│   │   │   ├── project-config-loader.cjs
│   │   │   ├── project-config-schema.cjs
│   │   │   ├── prompt-injections.cjs
│   │   │   ├── session-init-helpers.cjs
│   │   │   ├── stdin-parser.cjs
│   │   │   ├── subagent-context-builders.cjs
│   │   │   ├── swap-engine.cjs
│   │   │   ├── temp-file-cleanup.cjs
│   │   │   ├── test-fixture-generator.cjs
│   │   │   ├── todo-state.cjs
│   │   │   ├── workflow-state.cjs
│   │   │   └── wr-config.cjs
│   │   ├── notifications/            # Multi-channel notifications
│   │   │   ├── notify.cjs
│   │   │   ├── lib/
│   │   │   ├── docs/
│   │   │   └── providers/            # desktop, discord, slack, telegram, terminal-bell
│   │   ├── scout-block/              # Broad search prevention
│   │   │   ├── broad-pattern-detector.cjs
│   │   │   ├── error-formatter.cjs
│   │   │   ├── path-extractor.cjs
│   │   │   ├── pattern-matcher.cjs
│   │   │   ├── tests/
│   │   │   └── vendor/
│   │   ├── tests/                    # Hook test suites
│   │   │   ├── test-all-hooks.cjs    # Main test runner
│   │   │   ├── run-all-tests.cjs     # Suite runner
│   │   │   ├── suites/               # 16 test suites
│   │   │   ├── fixtures/             # Test fixtures
│   │   │   ├── helpers/              # Test helpers
│   │   │   ├── lib/                  # Test library utils
│   │   │   ├── docs/                 # Test documentation
│   │   │   └── 13 standalone tests   # 14 test-* files including primary runner
│   │   ├── artifact-path-resolver.cjs
│   │   ├── ba-refinement-context.cjs # BA refinement context injection
│   │   ├── backend-context.cjs
│   │   ├── bash-cleanup.cjs
│   │   ├── code-patterns-injector.cjs
│   │   ├── code-review-rules-injector.cjs
│   │   ├── design-system-context.cjs
│   │   ├── edit-enforcement.cjs
│   │   ├── figma-context-extractor.cjs
│   │   ├── frontend-context.cjs
│   │   ├── init-prompt-gate.cjs
│   │   ├── knowledge-context.cjs
│   │   ├── lessons-injector.cjs
│   │   ├── mindset-injector.cjs       # Coding mindset/output style injection
│   │   ├── notify-waiting.js          # Cross-platform notification hook (.js)
│   │   ├── npm-auto-install.cjs
│   │   ├── path-boundary-block.cjs
│   │   ├── post-compact-recovery.cjs
│   │   ├── post-edit-prettier.cjs
│   │   ├── privacy-block.cjs
│   │   ├── prompt-context-assembler.cjs
│   │   ├── role-context-injector.cjs
│   │   ├── scout-block.cjs
│   │   ├── scss-styling-context.cjs
│   │   ├── session-end.cjs
│   │   ├── session-init-docs.cjs
│   │   ├── session-init.cjs
│   │   ├── session-resume.cjs
│   │   ├── skill-enforcement.cjs
│   │   ├── subagent-init-*.cjs (8 hooks)    # identity, patterns, dev-rules, code-review-rules, lessons, ai-mistakes, context-guard, todos
│   │   ├── todo-tracker.cjs
│   │   ├── tool-output-swap.cjs
│   │   ├── windows-command-detector.cjs
│   │   ├── workflow-router.cjs
│   │   ├── workflow-step-tracker.cjs
│   │   └── write-compact-marker.cjs
│   ├── output-styles/                # 6 coding level presets
│   │   ├── coding-level-0-eli5.md
│   │   ├── coding-level-1-junior.md
│   │   ├── coding-level-2-mid.md
│   │   ├── coding-level-3-senior.md
│   │   ├── coding-level-4-lead.md
│   │   └── coding-level-5-god.md
│   ├── scripts/                      # Utility scripts
│   │   ├── generate_catalogs.py      # Skills/commands catalog generator
│   │   ├── scan_skills.py            # Skill scanner
│   │   ├── ck-help.py                # Claude Kit help utility
│   │   ├── resolve_env.py            # Environment resolver
│   │   ├── win_compat.py             # Windows compatibility
│   │   ├── sync-hooks-to-skills.py   # SYNC-block propagation across skills
│   │   ├── set-active-plan.cjs       # Active plan state for plan-* skills
│   │   ├── statusline-tps.cjs        # Tokens-per-second estimator for statusline widget
│   │   ├── worktree.cjs              # Git worktree management
│   │   ├── worktree.test.cjs         # Worktree tests
│   │   ├── code_graph/               # Code graph CLI + library
│   │   ├── codex/                    # Codex sync, migration, notification, and verification tooling
│   │   ├── commands_data.yaml        # Commands catalog data
│   │   ├── skills_data.yaml          # Skills catalog data
│   │   ├── requirements.txt          # Python dependencies
│   │   └── README.md
│   ├── skills/                       # 258 skill definitions
│   │   ├── INSTALLATION.md           # Dependency installation guide
│   │   ├── README.md                 # Skills overview
│   │   ├── TESTING.md                # Testing guide
│   │   ├── THIRD_PARTY_NOTICES.md    # Third-party licenses
│   │   ├── install.sh                # Linux/macOS installer
│   │   ├── install.ps1               # Windows installer
│   │   ├── common/                   # Shared Python utilities
│   │   ├── shared/                   # Shared reference/protocol files
│   │   ├── _templates/               # Skill creation templates
│   │   ├── cook/SKILL.md             # Implementation skill
│   │   ├── fix/SKILL.md              # Bug fix skill
│   │   ├── plan/SKILL.md             # Planning skill
│   │   ├── code-review/SKILL.md      # Code review skill
│   │   ├── chrome-devtools/          # Browser automation (with scripts/)
│   │   ├── excalidraw-diagram/       # Diagramming skill
│   │   ├── media-processing/         # FFmpeg/ImageMagick skills
│   │   ├── mcp-builder/              # MCP server builder
│   │   ├── workflow-*/               # Workflow trigger skills
│   │   ├── scan-*/                   # Project scanning skills (11)
│   │   └── ... (258 total direct SKILL.md files)
│   ├── tests/                        # Framework-level tests
│   │   └── workflow-routing-test.cjs
│   ├── tmp/                          # Temporary files (gitignored)
│   └── workflows/                    # Workflow rule files
│       ├── development-rules.md
│       ├── documentation-management.md
│       ├── orchestration-protocol.md
│       └── primary-workflow.md
├── docs/
│   ├── project-config.json           # Project-specific configuration
│   ├── release/                      # Release notes by period
│   └── project-reference/            # Reference docs (generated by /scan-*)
│       ├── project-structure-reference.md
│       ├── backend-patterns-reference.md
│       ├── frontend-patterns-reference.md
│       ├── integration-test-reference.md
│       ├── code-review-rules.md
│       ├── scss-styling-guide.md
│       ├── design-system/
│       ├── domain-entities-reference.md
│       ├── e2e-test-reference.md
│       ├── feature-docs-reference.md
│       └── lessons.md
├── .vscode/                         # VS Code workspace settings
│   ├── extensions.json
│   ├── mcp.json
│   └── settings.json
├── AGENTS.md                         # Codex-facing project instructions
├── CLAUDE.md                         # Project instructions for Claude
├── package.json                      # Root Codex tooling scripts
├── package-lock.json                 # Root tooling lockfile
├── README.md                         # Project README
├── LICENSE                           # Apache 2.0
├── NOTICE                            # Attribution notice
├── .gitignore                        # Root gitignore
└── claude-start.cmd                  # Windows launch script
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

| Code | Module         | Location                       | Description                                                                                                                 |
| ---- | -------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| HK   | Hooks          | `.claude/hooks/`               | <!-- COUNT:hooks -->65<!-- /COUNT --> top-level `.cjs` runtime enforcement & context injection hook files                   |
| HL   | Hook Libraries | `.claude/hooks/lib/`           | <!-- COUNT:lib-modules -->29<!-- /COUNT --> shared utility modules for hooks                                                |
| SK   | Skills         | `.claude/skills/`              | <!-- COUNT:skills -->258<!-- /COUNT --> task automation skill definitions                                                   |
| AG   | Agents         | `.claude/agents/`              | <!-- COUNT:agents -->28<!-- /COUNT --> specialized subagent role definitions                                                |
| WF   | Workflows      | `.claude/workflows.json`       | <!-- COUNT:workflows -->37<!-- /COUNT --> end-to-end process orchestrations                                                 |
| SC   | Scripts        | `.claude/scripts/`             | 28 top-level utility scripts (catalog gen, audit, worktree, statusline-tps); excludes code_graph package internals + tests/ |
| CX   | Codex Tooling  | `.claude/scripts/codex/`       | 10 sync, migration, notification, and verification scripts                                                                  |
| CM   | Codex Mirrors  | `.agents/`, `.codex/`          | Generated Codex-compatible skills, agents, hooks                                                                            |
| OS   | Output Styles  | `.claude/output-styles/`       | 6 coding level presets                                                                                                      |
| NT   | Notifications  | `.claude/hooks/notifications/` | Multi-channel notification providers (5)                                                                                    |
| SB   | Scout Block    | `.claude/hooks/scout-block/`   | Broad search prevention subsystem (4 modules)                                                                               |
| HT   | Hook Tests     | `.claude/hooks/tests/`         | 16 test suites + 13 standalone tests; 14 `test-*` files including primary runner                                            |

## Hooks (<!-- COUNT:hooks -->65<!-- /COUNT --> top-level `.cjs` files)

### Safety Hooks

| Hook                  | Event      | Purpose                                 |
| --------------------- | ---------- | --------------------------------------- |
| `path-boundary-block` | PreToolUse | Block access outside project scope      |
| `privacy-block`       | PreToolUse | Block access to secrets/credentials     |
| `scout-block`         | PreToolUse | Prevent overly broad glob/grep patterns |

### Quality Hooks

| Hook                | Event            | Purpose                                     |
| ------------------- | ---------------- | ------------------------------------------- |
| `edit-enforcement`  | PreToolUse       | Gate edits on task existence                |
| `skill-enforcement` | PreToolUse       | Enforce skill usage for specific operations |
| `init-prompt-gate`  | UserPromptSubmit | Gate initial prompt processing              |

### Context Injection Hooks

| Hook                         | Event      | Purpose                                              |
| ---------------------------- | ---------- | ---------------------------------------------------- |
| `backend-context`            | PreToolUse | Inject backend patterns when editing backend files   |
| `frontend-context`           | PreToolUse | Inject frontend patterns when editing frontend files |
| `design-system-context`      | PreToolUse | Inject design system tokens                          |
| `scss-styling-context`       | PreToolUse | Inject SCSS patterns                                 |
| `code-patterns-injector`     | PreToolUse | Inject code patterns from reference docs             |
| `code-review-rules-injector` | PreToolUse | Inject review rules during reviews                   |
| `lessons-injector`           | PreToolUse | Re-inject learned lessons                            |
| `knowledge-context`          | PreToolUse | Inject domain knowledge                              |
| `role-context-injector`      | PreToolUse | Inject role-specific context for agents              |
| `figma-context-extractor`    | PreToolUse | Extract Figma design context                         |
| `mindset-injector`           | PreToolUse | Inject coding mindset/output style context           |
| `ba-refinement-context`      | PreToolUse | Inject BA refinement context for story editing       |

### Session Management Hooks

| Hook                    | Event        | Purpose                                |
| ----------------------- | ------------ | -------------------------------------- |
| `session-init`          | SessionStart | Initialize session state, load config  |
| `session-init-docs`     | SessionStart | Check/create reference docs            |
| `session-end`           | SessionEnd   | Persist state, cleanup                 |
| `session-resume`        | SessionStart | Resume after compaction                |
| `post-compact-recovery` | SessionStart | Recover state after context compaction |
| `write-compact-marker`  | PreCompact   | Save state before compaction           |

### Workflow Hooks

| Hook                       | Event            | Purpose                           |
| -------------------------- | ---------------- | --------------------------------- |
| `workflow-router`          | UserPromptSubmit | Match intent to workflow          |
| `workflow-step-tracker`    | PostToolUse      | Track workflow step progress      |
| `todo-tracker`             | PostToolUse      | Track todo/task completion        |
| `prompt-context-assembler` | UserPromptSubmit | Assemble full context for prompts |

### Utility Hooks

| Hook                              | Event             | Purpose                                              |
| --------------------------------- | ----------------- | ---------------------------------------------------- |
| `tool-output-swap`                | PostToolUse       | Compress large tool outputs                          |
| `post-edit-prettier`              | PostToolUse       | Run prettier after edits                             |
| `npm-auto-install`                | SessionStart      | Auto-install npm deps on startup                     |
| `bash-cleanup`                    | PostToolUse       | Clean bash output                                    |
| `windows-command-detector`        | PreToolUse        | Detect Windows-specific commands                     |
| `artifact-path-resolver`          | PreToolUse        | Resolve artifact paths                               |
| `subagent-init-identity`          | SubagentStart     | 1/8: Identity, config, rules, plan context           |
| `subagent-init-patterns`          | SubagentStart     | 2/8: Read-guidance pointer for patterns + agent docs |
| `subagent-init-dev-rules`         | SubagentStart     | 3/8: Read-guidance pointer for development rules     |
| `subagent-init-code-review-rules` | SubagentStart     | 4/8: Read-guidance pointer for review-agent rules    |
| `subagent-init-lessons`           | SubagentStart     | 5/8: Lessons learned                                 |
| `subagent-init-ai-mistakes`       | SubagentStart     | 6/8: AI mistake prevention                           |
| `subagent-init-context-guard`     | SubagentStart     | 7/8: Context-overflow guard                          |
| `subagent-init-todos`             | SubagentStart     | 8/8: Parent todo list handoff                        |
| `notify-waiting`                  | Stop/Notification | Cross-platform desktop notifications                 |

## Workflows (<!-- COUNT:workflows -->37<!-- /COUNT -->)

| Category                       | Registered Workflows                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development**                | `batch-operation`, `big-feature`, `bugfix`, `deployment`, `feature`, `migration`, `package-upgrade`, `performance`, `refactor`                                                                 |
| **Testing**                    | `e2e-from-changes`, `e2e-from-recording`, `e2e-update-ui`, `tdd-feature`, `test-spec-update`, `test-to-integration`, `test-verify`, `workflow-seed-test-data`, `write-integration-test`        |
| **Discovery & Planning**       | `full-feature-lifecycle`, `greenfield-init`, `idea-to-pbi`, `investigation`, `pbi-to-tests`, `product-discovery`, `spec-to-pbi`                                                                |
| **Documentation & Spec**       | `documentation`, `feature-docs`, `spec-discovery`, `spec-driven-dev`                                                                                                                           |
| **Review, Security & Release** | `quality-audit`, `release-prep`, `review`, `review-changes`, `security-audit`, `verification`                                                                                                  |
| **Design & Visualization**     | `design-workflow`, `visualize`                                                                                                                                                                 |

> **Also available as workflow skills** (invokeable via `/workflow-<name>` but not registered in `workflows.json`):
> `ba-dev-handoff`, `business-evaluation`, `course-building`, `design`, `design-dev-handoff`,
> `dev-qa-handoff`, `end`, `feature-with-integration-test`, `greenfield`, `marketing-strategy`,
> `pm-reporting`, `pre-development`, `qa-po-acceptance`, `research`, `seed-test-data`,
> `sprint-planning`, `sprint-retro`, `start`, `testing`

## Agents (<!-- COUNT:agents -->28<!-- /COUNT -->)

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
| `qc-specialist`            | Quality gates, compliance verification       |
| `researcher`               | Technology research, best practices          |
| `scout`                    | File location across large codebases         |
| `scout-external`           | File location via external tools             |
| `security-auditor`         | OWASP compliance, vulnerability assessment   |
| `solution-architect`       | Greenfield project inception                 |
| `spec-compliance-reviewer` | Implementation vs specification matching     |
| `tester`                   | Test execution, coverage analysis            |
| `ui-ux-designer`           | UI/UX design, wireframes, accessibility      |

## Key Entry Points

| Entry Point                                  | Purpose                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `.claude/settings.json`                      | Hook registration, permissions, features                           |
| `.claude/hooks/session-init.cjs`             | Session startup — loads config, sets state                         |
| `.claude/hooks/workflow-router.cjs`          | Intent matching — routes to workflows                              |
| `.claude/hooks/prompt-context-assembler.cjs` | Assembles full prompt context                                      |
| `.claude/workflows.json`                     | All <!-- COUNT:workflows -->37<!-- /COUNT --> workflow definitions |
| `docs/project-config.json`                   | Project-specific runtime configuration                             |
| `.claude/hooks/tests/test-all-hooks.cjs`     | Main test runner                                                   |
| `CLAUDE.md`                                  | Project instructions for Claude                                    |

## Scan Skills (11)

Skills that populate `docs/project-reference/`:

| Skill                    | Generates                        |
| ------------------------ | -------------------------------- |
| `scan-project-structure` | `project-structure-reference.md` |
| `scan-backend-patterns`  | `backend-patterns-reference.md`  |
| `scan-frontend-patterns` | `frontend-patterns-reference.md` |
| `scan-integration-tests` | `integration-test-reference.md`  |
| `scan-code-review-rules` | `code-review-rules.md`           |
| `scan-scss-styling`      | `scss-styling-guide.md`          |
| `scan-design-system`     | `design-system/`                 |
| `scan-domain-entities`   | `domain-entities-reference.md`   |
| `scan-e2e-tests`         | `e2e-test-reference.md`          |
| `scan-feature-docs`      | `feature-docs-reference.md`      |
| `scan-ui-system`         | UI system context                |
