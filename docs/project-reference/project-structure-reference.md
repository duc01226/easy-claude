# Project Structure Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Overview

**easy-claude** is a Claude Code enhancement framework — a portable `.claude` template that transforms Claude Code into a project-aware, quality-enforced AI development agent. No application backend/frontend code; this project IS the framework.

## Component Architecture

| Component      | Count                     | Location                     | Format                          |
| -------------- | ------------------------- | ---------------------------- | ------------------------------- |
| Hooks          | 64                        | `.claude/hooks/*.cjs/.js`    | CommonJS Node.js scripts        |
| Hook Libraries | 28                        | `.claude/hooks/lib/*.cjs`    | CommonJS utility modules        |
| Skills         | 258                       | `.claude/skills/*/SKILL.md`  | Markdown + YAML frontmatter     |
| Agents         | 28                        | `.claude/agents/*.md`        | Markdown definitions            |
| Workflows      | 34                        | `.claude/workflows.json`     | JSON workflow definitions       |
| Output Styles  | 6                         | `.claude/output-styles/*.md` | Coding level presets (ELI5→God) |
| Scripts        | 15                        | `.claude/scripts/*`          | CJS + Python utilities          |
| Hook Tests     | 14 suites + 13 standalone | `.claude/hooks/tests/`       | CJS test files                  |

## Project Directory Tree

```
easy-claude/
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
│   ├── statusline.cjs                # Status line (Node.js)
│   ├── statusline.ps1               # Status line (PowerShell)
│   ├── statusline.sh                # Status line (Bash)
│   ├── workflows.json               # 34 workflow definitions
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
│   ├── hooks/                        # 64 runtime hooks
│   │   ├── config/                   # Hook configuration
│   │   │   └── swap-config.json
│   │   ├── docs/                     # Hook documentation
│   │   │   └── README.md
│   │   ├── lib/                      # 28 shared utility modules
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
│   │   │   ├── suites/               # 14 test suites
│   │   │   ├── fixtures/             # Test fixtures
│   │   │   ├── helpers/              # Test helpers
│   │   │   ├── lib/                  # Test library utils
│   │   │   ├── docs/                 # Test documentation
│   │   │   └── 13 standalone tests   # test-*.cjs / test-*.js
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
│   │   ├── subagent-init-*.cjs (13 hooks)   # identity, patterns-p1..p5, dev-rules-p1..p2, claude-md-p1..p3, lessons, context-guard
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
│   ├── scripts/                      # Utility scripts (15 executable)
│   │   ├── generate_catalogs.py      # Skills/commands catalog generator
│   │   ├── scan_skills.py            # Skill scanner
│   │   ├── audit-skill-descriptions.py
│   │   ├── ck-help.py                # Claude Kit help utility
│   │   ├── resolve_env.py            # Environment resolver
│   │   ├── win_compat.py             # Windows compatibility
│   │   ├── sync-copilot-workflows.cjs
│   │   ├── sync-skills-to-tools.py
│   │   ├── worktree.cjs              # Git worktree management
│   │   ├── worktree.test.cjs         # Worktree tests
│   │   ├── add-skill-versions.cjs
│   │   ├── add-suffix-notes.cjs
│   │   ├── add-task-protocol-suffix.cjs
│   │   ├── enhance-skills.cjs
│   │   ├── set-active-plan.cjs
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
│   │   ├── shared/                   # Shared protocols (19 files)
│   │   ├── _templates/               # Skill creation templates
│   │   ├── cook/SKILL.md             # Implementation skill
│   │   ├── fix/SKILL.md              # Bug fix skill
│   │   ├── plan/SKILL.md             # Planning skill
│   │   ├── code-review/SKILL.md      # Code review skill
│   │   ├── chrome-devtools/          # Browser automation (with scripts/)
│   │   ├── excalidraw-diagram/       # Diagramming skill
│   │   ├── media-processing/         # FFmpeg/ImageMagick skills
│   │   ├── mcp-builder/              # MCP server builder
│   │   ├── workflow-*/               # Workflow trigger skills (51)
│   │   ├── scan-*/                   # Project scanning skills (11)
│   │   └── ... (258 total SKILL.md files)
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
├── CLAUDE.md                         # Project instructions for Claude
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

## Module Codes

| Code | Module         | Location                       | Description                                       |
| ---- | -------------- | ------------------------------ | ------------------------------------------------- |
| HK   | Hooks          | `.claude/hooks/`               | 64 runtime enforcement & context injection hooks  |
| HL   | Hook Libraries | `.claude/hooks/lib/`           | 28 shared utility modules for hooks               |
| SK   | Skills         | `.claude/skills/`              | 258 task automation skill definitions             |
| AG   | Agents         | `.claude/agents/`              | 28 specialized subagent role definitions          |
| WF   | Workflows      | `.claude/workflows.json`       | 34 end-to-end process orchestrations              |
| SC   | Scripts        | `.claude/scripts/`             | 15 utility scripts (catalog gen, audit, worktree) |
| OS   | Output Styles  | `.claude/output-styles/`       | 6 coding level presets                            |
| NT   | Notifications  | `.claude/hooks/notifications/` | Multi-channel notification providers (5)          |
| SB   | Scout Block    | `.claude/hooks/scout-block/`   | Broad search prevention subsystem (4 modules)     |
| HT   | Hook Tests     | `.claude/hooks/tests/`         | 14 test suites + 13 standalone tests              |

## Hooks (64)

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

| Hook                             | Event             | Purpose                                     |
| -------------------------------- | ----------------- | ------------------------------------------- |
| `tool-output-swap`               | PostToolUse       | Compress large tool outputs                 |
| `post-edit-prettier`             | PostToolUse       | Run prettier after edits                    |
| `npm-auto-install`               | SessionStart      | Auto-install npm deps on startup            |
| `bash-cleanup`                   | PostToolUse       | Clean bash output                           |
| `windows-command-detector`       | PreToolUse        | Detect Windows-specific commands            |
| `artifact-path-resolver`         | PreToolUse        | Resolve artifact paths                      |
| `subagent-init-identity`         | SubagentStart     | 1/13: Identity, config, rules, plan context |
| `subagent-init-patterns-p1..p5`  | SubagentStart     | 2–6/13: Coding patterns (paged, 5 parts)    |
| `subagent-init-dev-rules-p1..p2` | SubagentStart     | 7–8/13: Development rules (paged, 2 parts)  |
| `subagent-init-claude-md-p1..p3` | SubagentStart     | 9–11/13: CLAUDE.md (paged, 3 parts)         |
| `subagent-init-lessons`          | SubagentStart     | 12/13: Lessons + AI mistake prevention      |
| `subagent-init-context-guard`    | SubagentStart     | 13/13: Context-overflow guard (last)        |
| `notify-waiting`                 | Stop/Notification | Cross-platform desktop notifications        |

## Workflows (34)

| Category          | Workflows                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development**   | `feature`, `bugfix`, `refactor`, `big-feature`, `batch-operation`, `migration`, `package-upgrade`, `performance`, `deployment`                                                                |
| **Testing**       | `tdd-feature`, `feature-with-integration-test`, `test-verify`, `test-to-integration`, `test-spec-update`, `e2e-from-changes`, `e2e-from-recording`, `e2e-update-ui`, `write-integration-test` |
| **Planning**      | `idea-to-pbi`, `pre-development`, `greenfield-init`                                                                                                                                           |
| **Review**        | `review`, `review-changes`, `quality-audit`, `security-audit`, `verification`                                                                                                                 |
| **Documentation** | `documentation`, `feature-docs`                                                                                                                                                               |
| **Design**        | `design-workflow`, `visualize`                                                                                                                                                                |
| **Handoffs**      | `ba-dev-handoff`, `design-dev-handoff`, `dev-qa-handoff`, `qa-po-acceptance`                                                                                                                  |
| **Management**    | `release-prep`, `full-feature-lifecycle`, `investigation`                                                                                                                                     |

> **Also available as workflow skills** (invokeable via `/workflow-<name>` but not registered in `workflows.json`):
> `ba-dev-handoff`, `business-evaluation`, `course-building`, `design-dev-handoff`, `dev-qa-handoff`,
> `idea-to-tdd`, `marketing-strategy`, `pbi-to-tests`, `pm-reporting`, `qa-po-acceptance`,
> `research`, `sprint-planning`, `sprint-retro`, `testing`

## Agents (28)

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

| Entry Point                                  | Purpose                                    |
| -------------------------------------------- | ------------------------------------------ |
| `.claude/settings.json`                      | Hook registration, permissions, features   |
| `.claude/hooks/session-init.cjs`             | Session startup — loads config, sets state |
| `.claude/hooks/workflow-router.cjs`          | Intent matching — routes to workflows      |
| `.claude/hooks/prompt-context-assembler.cjs` | Assembles full prompt context              |
| `.claude/workflows.json`                     | All 34 workflow definitions                |
| `docs/project-config.json`                   | Project-specific runtime configuration     |
| `.claude/hooks/tests/test-all-hooks.cjs`     | Main test runner                           |
| `CLAUDE.md`                                  | Project instructions for Claude            |

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
