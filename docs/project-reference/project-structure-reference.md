# Project Structure Reference

<!-- Last scanned: 2026-03-10 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Overview

**easy-claude** is a Claude Code enhancement framework — a portable `.claude` template that transforms Claude Code into a project-aware, quality-enforced AI development agent. No application backend/frontend code; this project IS the framework.

## Component Architecture

| Component      | Count                     | Location                     | Format                          |
| -------------- | ------------------------- | ---------------------------- | ------------------------------- |
| Hooks          | 34                        | `.claude/hooks/*.cjs`        | CommonJS Node.js scripts        |
| Hook Libraries | 25                        | `.claude/hooks/lib/*.cjs`    | CommonJS utility modules        |
| Skills         | 204                       | `.claude/skills/*/SKILL.md`  | Markdown + YAML frontmatter     |
| Agents         | 28                        | `.claude/agents/*.md`        | Markdown definitions            |
| Workflows      | 48                        | `.claude/workflows.json`     | JSON workflow definitions       |
| Output Styles  | 6                         | `.claude/output-styles/*.md` | Coding level presets (ELI5→God) |
| Scripts        | 19                        | `.claude/scripts/*`          | CJS + Python utilities          |
| Hook Tests     | 13 suites + 12 standalone | `.claude/hooks/tests/`       | CJS test files                  |

## Project Directory Tree

```
easy-claude/
├── .claude/                          # Working framework (mirrors src/.claude/)
│   ├── .ck.json                      # Claude Kit configuration
│   ├── .ckignore                     # Ignore patterns for Claude Kit
│   ├── .env.example                  # Environment template
│   ├── .mcp.json                     # MCP server configuration
│   ├── .todo-state.json              # Persistent todo state
│   ├── metadata.json                 # Framework metadata (large)
│   ├── settings.json                 # Hook registration & features
│   ├── settings.local.json           # Local settings overrides
│   ├── statusline.cjs                # Status line (Node.js)
│   ├── statusline.ps1               # Status line (PowerShell)
│   ├── statusline.sh                # Status line (Bash)
│   ├── workflows.json               # 48 workflow definitions
│   ├── workflows.schema.json        # Workflow JSON schema
│   ├── agent-memory/                 # Persistent agent memory
│   │   ├── code-reviewer/MEMORY.md
│   │   ├── planner/MEMORY.md
│   │   └── researcher/MEMORY.md
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
│   │   ├── agents/                   # Agent documentation
│   │   ├── configuration/            # Settings reference
│   │   ├── hooks/                    # Hook documentation
│   │   ├── skills/                   # Skill documentation
│   │   └── team-artifacts/           # Templates for PBIs, stories, specs
│   ├── hooks/                        # 34 runtime hooks
│   │   ├── lib/                      # 25 shared utility modules
│   │   │   ├── ck-config-loader.cjs
│   │   │   ├── ck-config-utils.cjs
│   │   │   ├── context-injector-base.cjs
│   │   │   ├── project-config-loader.cjs
│   │   │   ├── project-config-schema.cjs
│   │   │   ├── stdin-parser.cjs
│   │   │   ├── swap-engine.cjs
│   │   │   ├── todo-state.cjs
│   │   │   ├── workflow-state.cjs
│   │   │   └── ... (25 total)
│   │   ├── notifications/            # Multi-channel notifications
│   │   │   ├── notify.cjs
│   │   │   └── providers/            # desktop, discord, slack, telegram
│   │   ├── scout-block/              # Broad search prevention
│   │   │   ├── broad-pattern-detector.cjs
│   │   │   ├── path-extractor.cjs
│   │   │   └── pattern-matcher.cjs
│   │   ├── tests/                    # Hook test suites
│   │   │   ├── test-all-hooks.cjs    # Main test runner
│   │   │   ├── run-all-tests.cjs     # Suite runner
│   │   │   └── suites/               # 13 test suites
│   │   ├── session-init.cjs          # Session startup
│   │   ├── workflow-router.cjs       # Intent → workflow routing
│   │   ├── edit-enforcement.cjs      # Task-gated edits
│   │   ├── privacy-block.cjs         # Secrets protection
│   │   ├── path-boundary-block.cjs   # Scope enforcement
│   │   ├── scout-block.cjs           # Broad search prevention
│   │   ├── backend-context.cjs       # Backend pattern injection
│   │   ├── frontend-context.cjs      # Frontend pattern injection
│   │   ├── tool-output-swap.cjs      # Large output compression
│   │   └── ... (34 total)
│   ├── output-styles/                # 6 coding level presets
│   │   ├── coding-level-0-eli5.md
│   │   ├── coding-level-1-junior.md
│   │   ├── coding-level-2-mid.md
│   │   ├── coding-level-3-senior.md
│   │   ├── coding-level-4-lead.md
│   │   └── coding-level-5-god.md
│   ├── scripts/                      # Utility scripts
│   │   ├── generate_catalogs.py      # Skills/commands catalog
│   │   ├── scan_skills.py            # Skill scanner
│   │   ├── worktree.cjs              # Git worktree management
│   │   └── ... (19 total)
│   ├── skills/                       # 204 skill definitions
│   │   ├── INSTALLATION.md           # Dependency installation guide
│   │   ├── README.md                 # Skills overview
│   │   ├── TESTING.md                # Testing guide
│   │   ├── install.sh                # Linux/macOS installer
│   │   ├── install.ps1               # Windows installer
│   │   ├── common/                   # Shared Python utilities
│   │   ├── shared/                   # Shared protocols
│   │   ├── _templates/               # Skill creation templates
│   │   ├── cook/SKILL.md             # Implementation skill
│   │   ├── fix/SKILL.md              # Bug fix skill
│   │   ├── plan/SKILL.md             # Planning skill
│   │   ├── code-review/SKILL.md      # Code review skill
│   │   ├── chrome-devtools/          # Browser automation (with scripts/)
│   │   ├── excalidraw-diagram/       # Diagramming skill
│   │   ├── media-processing/         # FFmpeg/ImageMagick skills
│   │   ├── mcp-builder/              # MCP server builder
│   │   ├── workflow-*/               # Workflow activation skills
│   │   ├── scan-*/                   # Project scanning skills (10)
│   │   └── ... (204 total)
│   ├── tests/                        # Framework-level tests
│   └── workflows/                    # Workflow rule files
│       ├── development-rules.md
│       ├── documentation-management.md
│       ├── orchestration-protocol.md
│       └── primary-workflow.md
├── src/
│   └── .claude/                      # Distributable template (identical to .claude/)
├── docs/
│   ├── project-config.json           # Project-specific configuration
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
├── CLAUDE.md                         # Project instructions for Claude
├── README.md                         # Project README
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
| HK   | Hooks          | `.claude/hooks/`               | 34 runtime enforcement & context injection hooks  |
| HL   | Hook Libraries | `.claude/hooks/lib/`           | 25 shared utility modules for hooks               |
| SK   | Skills         | `.claude/skills/`              | 204 task automation skill definitions             |
| AG   | Agents         | `.claude/agents/`              | 28 specialized subagent role definitions          |
| WF   | Workflows      | `.claude/workflows.json`       | 48 end-to-end process orchestrations              |
| SC   | Scripts        | `.claude/scripts/`             | 19 utility scripts (catalog gen, audit, worktree) |
| OS   | Output Styles  | `.claude/output-styles/`       | 6 coding level presets                            |
| NT   | Notifications  | `.claude/hooks/notifications/` | Multi-channel notification providers              |
| SB   | Scout Block    | `.claude/hooks/scout-block/`   | Broad search prevention subsystem                 |
| HT   | Hook Tests     | `.claude/hooks/tests/`         | 13 test suites + 12 standalone tests              |

## Hooks (34)

### Safety Hooks

| Hook                  | Event      | Purpose                                 |
| --------------------- | ---------- | --------------------------------------- |
| `path-boundary-block` | PreToolUse | Block access outside project scope      |
| `privacy-block`       | PreToolUse | Block access to secrets/credentials     |
| `scout-block`         | PreToolUse | Prevent overly broad glob/grep patterns |

### Quality Hooks

| Hook                 | Event            | Purpose                                     |
| -------------------- | ---------------- | ------------------------------------------- |
| `edit-enforcement`   | PreToolUse       | Gate edits on task existence                |
| `skill-enforcement`  | PreToolUse       | Enforce skill usage for specific operations |
| `search-before-code` | PreToolUse       | Require search evidence before code changes |
| `init-prompt-gate`   | UserPromptSubmit | Gate initial prompt processing              |

### Context Injection Hooks

| Hook                         | Event                       | Purpose                                              |
| ---------------------------- | --------------------------- | ---------------------------------------------------- |
| `backend-context`            | PreToolUse                  | Inject backend patterns when editing backend files   |
| `frontend-context`           | PreToolUse                  | Inject frontend patterns when editing frontend files |
| `design-system-context`      | PreToolUse                  | Inject design system tokens                          |
| `scss-styling-context`       | PreToolUse                  | Inject SCSS patterns                                 |
| `code-patterns-injector`     | PreToolUse                  | Inject code patterns from reference docs             |
| `code-review-rules-injector` | PreToolUse                  | Inject review rules during reviews                   |
| `lessons-injector`           | UserPromptSubmit/PreToolUse | Re-inject learned lessons                            |
| `knowledge-context`          | PreToolUse                  | Inject domain knowledge                              |
| `role-context-injector`      | SubagentStart               | Inject role-specific context for agents              |
| `figma-context-extractor`    | PreToolUse                  | Extract Figma design context                         |

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

| Hook                       | Event             | Purpose                          |
| -------------------------- | ----------------- | -------------------------------- |
| `tool-output-swap`         | PostToolUse       | Compress large tool outputs      |
| `post-edit-prettier`       | PostToolUse       | Run prettier after edits         |
| `npm-auto-install`         | PostToolUse       | Auto-install npm deps            |
| `bash-cleanup`             | PostToolUse       | Clean bash output                |
| `windows-command-detector` | PreToolUse        | Detect Windows-specific commands |
| `artifact-path-resolver`   | PreToolUse        | Resolve artifact paths           |
| `subagent-init`            | SubagentStart     | Initialize subagent context      |
| `notify-waiting`           | Stop/Notification | Desktop/channel notifications    |

## Workflows (48)

| Category          | Workflows                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development**   | `feature`, `bugfix`, `hotfix`, `refactor`, `big-feature`, `batch-operation`, `migration`, `package-upgrade`, `performance`, `deployment`                                                       |
| **Testing**       | `testing`, `tdd-feature`, `feature-with-integration-test`, `test-verify`, `test-to-integration`, `test-spec-update`, `e2e-from-changes`, `e2e-from-recording`, `e2e-update-ui`, `pbi-to-tests` |
| **Planning**      | `idea-to-pbi`, `idea-to-tdd`, `pre-development`, `greenfield-init`                                                                                                                             |
| **Review**        | `review`, `review-changes`, `quality-audit`, `security-audit`, `verification`                                                                                                                  |
| **Documentation** | `documentation`, `feature-docs`                                                                                                                                                                |
| **Research**      | `research`, `business-evaluation`, `course-building`, `marketing-strategy`                                                                                                                     |
| **Design**        | `design-workflow`, `visualize`                                                                                                                                                                 |
| **Handoffs**      | `po-ba-handoff`, `ba-dev-handoff`, `design-dev-handoff`, `dev-qa-handoff`, `qa-po-acceptance`                                                                                                  |
| **Management**    | `sprint-planning`, `sprint-retro`, `pm-reporting`, `release-prep`, `full-feature-lifecycle`, `investigation`                                                                                   |

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
