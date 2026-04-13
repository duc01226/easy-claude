# easy-claude

> Drop-in `.claude` framework that transforms Claude Code into a project-aware, quality-enforced, hallucination-resistant AI development agent.

## What is this?

**easy-claude** is a portable `.claude` template you copy into any project to supercharge Claude Code with **~37 hooks** (53 files), **258 skills**, **32 workflows**, and **28 specialized agents**. It covers the entire software development lifecycle — from idea capture and test specification through implementation, code review, and documentation.

**Core insight:** LLMs forget, hallucinate, and drift. Instead of hoping the AI "just gets it right," this framework uses **programmatic guardrails** (hooks) and **prompt-engineered protocols** (skills/workflows) to enforce correctness at every stage.

```
 Problem               Solution Layer     Mechanism
 ───────────────────── ──────────────── ──────────────────
 AI forgets context    Hooks              Auto-injection
 AI hallucinates code  Skills/Protocols   Evidence gates
 AI skips steps        Workflows          Step enforcement
 AI ignores patterns   project-config     Dynamic context
 AI loses state        Swap engine        External memory
 AI drifts from plan   Edit enforcement   Task gating
```

## Architecture

Three-layer architecture where each layer solves a different failure mode:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│      HOOKS       │  │      SKILLS      │  │    WORKFLOWS     │
│  (Enforcement)   │  │  (Intelligence)  │  │  (Orchestration) │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Node.js scripts  │  │ Markdown prompts │  │ JSON sequences   │
│ that run on      │  │ with YAML front  │  │ of skill steps   │
│ lifecycle events │  │ matter           │  │ with user confirm│
│                  │  │                  │  │                  │
│ Block/allow/     │  │ Define AI        │  │ Routed via       │
│ inject context   │  │ behavior &       │  │ keyword detect   │
│ at every tool    │  │ quality gates    │  │ & todo tracking  │
│ call             │  │                  │  │                  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Like middleware   │  │ Expert knowledge │  │ CI/CD pipeline   │
│ in a web         │  │ loaded on demand │  │ with stage gates │
│ framework        │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Quick Start

### Prerequisites

| Requirement     | Version | Check Command      |
| --------------- | ------- | ------------------ |
| Claude Code CLI | Latest  | `claude --version` |
| Node.js         | 18+     | `node --version`   |
| Git             | 2.x+    | `git --version`    |

### Installation (5 minutes)

**1. Copy the `.claude` directory into your project:**

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

**2. Initialize project configuration:**

```
/project-config
```

This scans your project and populates `docs/project-config.json` with tech stack, modules, directory structure, and build commands.

**3. Scan project patterns (generates reference docs that hooks auto-inject):**

```
/scan-project-structure
/scan-backend-patterns
/scan-frontend-patterns
/scan-code-review-rules
```

Optional scans (run if applicable):

```
/scan-design-system
/scan-domain-entities
/scan-integration-tests
/scan-e2e-tests
/scan-scss-styling
/scan-feature-docs
```

**4. Customize `CLAUDE.md`** at your project root with project-specific rules, architecture, and commands.

**5. Start working:**

```
/cook    # Implement features step-by-step
/fix     # Debug and fix issues
/plan    # Create implementation plans
/test    # Run tests
```

## What's Inside

### Hooks (~37 modules, 53 files)

Runtime Node.js scripts that fire on Claude Code lifecycle events.

| Category               | Hooks                                                                                                        | Purpose                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Safety**             | `path-boundary-block`, `privacy-block`, `scout-block`                                                        | Prevent out-of-scope access, block secrets, limit broad searches        |
| **Quality**            | `edit-enforcement`, `skill-enforcement`, `search-before-code`                                                | Force task tracking, enforce skill usage, require search before edits   |
| **Context Injection**  | `backend-context`, `frontend-context`, `design-system-context`, `code-patterns-injector`, `lessons-injector` | Auto-inject relevant patterns when editing specific file types          |
| **Session Management** | `session-init`, `session-end`, `session-resume`, `post-compact-recovery`                                     | Initialize state, persist across compactions, recover after memory loss |
| **Workflow**           | `workflow-router` (3 files), `workflow-step-tracker`, `todo-tracker`                                         | Detect intent, route to workflows, track step progress                  |
| **Freshness Gates**    | `graph-build` gate, reference-docs staleness gate                                                            | Block investigations when code graph or reference docs are stale        |

**Context re-injection:** The framework re-injects CLAUDE.md rules, project config, and project-reference patterns at every `UserPromptSubmit` via `mindset-injector` and `prompt-context-assembler` (6 part-files). This stateless-per-turn design prevents context drift over long sessions. `dedup-constants.cjs` ensures each injection fires exactly once per session.

**Hook part-file architecture:** Large hooks are split into chained part-files (`-p2`, `-p3`) for maintainability. The harness chains them at runtime. Affected: `prompt-context-assembler` (6 files), `workflow-router` (3 files).

### Skills (258 definitions)

Markdown-based prompts with YAML frontmatter that guide AI behavior.

| Category           | Examples                                                                                                       | What They Do                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Planning**       | `/plan`, `/scout`, `/investigate`                                                                              | Research, plan, investigate before coding               |
| **Implementation** | `/cook`, `/code`, `/fix`, `/refactor`                                                                          | Write code with quality gates                           |
| **Testing**        | `/test`, `/integration-test`, `/integration-test-review`, `/integration-test-verify`, `/e2e-test`, `/tdd-spec` | Test-first, test-after, and spec-traceability workflows |
| **Review**         | `/code-review`, `/review-changes`, `/security`                                                                 | Code quality, security audits                           |
| **Documentation**  | `/docs-update`, `/changelog`, `/feature-docs`                                                                  | Auto-generate and maintain docs                         |
| **Research**       | `/web-research`, `/deep-research`, `/docs-seeker`                                                              | Web research, library docs fetching                     |
| **Design**         | `/design-spec`, `/interface-design`, `/pbi-mockup`, `/excalidraw-diagram`                                      | UI/UX specs, wireframes, PBI visuals, diagrams          |
| **DevOps**         | `/devops`, `/fix-ci`, `/sre-review`                                                                            | Infrastructure, CI/CD, reliability                      |
| **Scanning**       | `/scan-project-structure`, `/scan-codebase-health`, `/scan-docs-index`                                         | Generate reference docs for hooks to auto-inject        |
| **Documents**      | `/markdown-to-pdf`, `/markdown-to-docx`, `/pdf-to-markdown`                                                    | Document format conversion                              |

### Workflows (32 definitions)

End-to-end process orchestration with step enforcement.

| Workflow          | Steps                                                                                   | Use When                                 |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `feature`         | scout → investigate → plan → review → validate → cook → simplify → review → test → docs | Implementing a well-defined feature      |
| `bugfix`          | scout → investigate → debug → plan → fix → prove-fix → review → test                    | Fixing a bug                             |
| `big-feature`     | idea → research → architecture → plan → cook → test → review → docs                     | Large/ambiguous feature needing research |
| `greenfield-init` | idea → research → domain-analysis → architecture → plan → scaffold → cook → test        | New project from scratch                 |
| `hotfix`          | scout → plan → fix → prove-fix → test → review                                          | Production emergency                     |
| `refactor`        | scout → investigate → plan → code → simplify → review → test                            | Code restructuring                       |
| `tdd-feature`     | scout → investigate → tdd-spec → plan → cook → integration-test → test → review         | Test-driven development                  |

### Agents (28 specialists)

Subagent definitions for parallelized, specialized work.

| Agent                   | Role                                           |
| ----------------------- | ---------------------------------------------- |
| `architect`             | System design, ADRs, cross-service analysis    |
| `backend-developer`     | Backend implementation using project patterns  |
| `frontend-developer`    | Frontend implementation with design system     |
| `code-reviewer`         | Comprehensive code review with reports         |
| `debugger`              | Root cause analysis, diagnostic reports        |
| `security-auditor`      | OWASP compliance, vulnerability assessment     |
| `performance-optimizer` | Query optimization, bundle analysis            |
| `planner`               | Implementation planning and trade-off analysis |
| `tester`                | Test execution, coverage analysis              |

## Project Structure

```
easy-claude/
├── .claude/                  # <-- The framework template (copy this to your project)
│   ├── agents/               # 28 specialized agent definitions
│   ├── hooks/                # 34 runtime hooks + lib/ utilities
│   │   ├── lib/              # Shared hook libraries
│   │   ├── notifications/    # Multi-channel notification system
│   │   ├── scout-block/      # Broad search prevention
│   │   └── tests/            # Hook test suites
│   ├── skills/               # 258 skill definitions
│   │   ├── <skill>/          # Each skill directory contains:
│   │   │   ├── SKILL.md      # Entry point (prompt + frontmatter)
│   │   │   ├── scripts/      # Optional automation scripts
│   │   │   └── references/   # Optional reference docs
│   │   └── common/           # Shared Python utilities
│   ├── workflows/            # Workflow definitions & rules
│   ├── docs/                 # Framework documentation
│   ├── scripts/              # Utility scripts (catalogs, audit)
│   ├── output-styles/        # Coding level output styles (ELI5→God)
│   ├── config/               # Templates for agents/skills
│   ├── settings.json         # Hook registration & features
│   └── workflows.json        # Workflow catalog definitions
├── docs/
│   ├── project-config.json   # Project-specific config (generated)
│   └── project-reference/    # Reference docs (generated by /scan-*)
├── CLAUDE.md                 # Project instructions for Claude
└── README.md                 # This file
```

## How It Works

### Project-Agnostic Design

The entire framework is **project-agnostic**. All project-specific knowledge lives in `docs/project-config.json`. Swap one config file and the same hooks, skills, and workflows adapt to any tech stack.

```
┌─────────────────────────────────────┐
│     Generic Framework (reusable)    │
│  ~37 Hooks + 258 Skills + 32 Flows │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │ project-    │
        │ config.json │
        └──────┬──────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
 Project A  Project B  Project C
 (.NET/     (Node/     (Python/
  Angular)   React)     FastAPI)
```

### Hook Lifecycle

Hooks fire on 9 Claude Code events:

| Event              | When                      | Example Hook                                     |
| ------------------ | ------------------------- | ------------------------------------------------ |
| `SessionStart`     | Claude Code starts        | `session-init.cjs` — load config, inject context |
| `SessionEnd`       | Claude Code exits         | `session-end.cjs` — persist final state          |
| `UserPromptSubmit` | Before each user message  | `prompt-context-assembler.cjs` — inject rules    |
| `PreToolUse`       | Before tool execution     | `privacy-block.cjs` — block secrets access       |
| `PostToolUse`      | After tool execution      | `tool-output-swap.cjs` — compress large outputs  |
| `PreCompact`       | Before context compaction | `write-compact-marker.cjs` — save state          |
| `SubagentStart`    | Subagent init             | `subagent-init.cjs` — inject agent context       |
| `Notification`     | Desktop notify event      | `notify-waiting.js` — send system notification   |
| `Stop`             | Response complete         | `notify-waiting.js` — desktop notification       |

### Workflow Detection

The workflow router automatically matches user intent to the right workflow:

- "implement X" → `feature` workflow
- "fix this bug" → `bugfix` workflow
- "refactor Y" → `refactor` workflow
- "investigate how Z works" → `investigation` workflow

Always asks for confirmation before activating. Prefix with `quick:` to skip confirmation and activate immediately.

## Design Principles

Seven principles that make this framework work reliably across any project:

| Principle                         | What it means                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stateless-per-turn invariants** | Rules are re-injected at every prompt turn — never trust context retention over long sessions                                              |
| **Defense in depth**              | Quality gates exist at all three layers: hook (programmatic), skill (protocol), workflow (sequence). Bypassing one is caught by another    |
| **Self-contained skill units**    | Each skill is a complete prompt unit via `SYNC` tags — protocols are inlined, not indirectly referenced. Skills work standalone            |
| **Project-agnostic generality**   | One `project-config.json` drives all context injection. The same hooks, skills, and workflows adapt to any tech stack                      |
| **Full lifecycle coverage**       | idea → research → TDD spec → plan → implement → review → test → E2E → docs. No stage left to chance                                        |
| **Structural intelligence**       | The code graph makes the AI reason about systems as systems — implicit relationships (events, API contracts, bus messages) are first-class |
| **Evidence-based AI**             | Every recommendation requires `file:line` citations. The confidence framework (>80% act, <60% don't) quantifies certainty                  |

## What's Project-Agnostic vs Project-Specific

| Component                  | Agnostic? | Notes                                       |
| -------------------------- | --------- | ------------------------------------------- |
| Skills (`.claude/skills/`) | Yes       | Behavioral patterns, not code patterns      |
| Agents (`.claude/agents/`) | Yes       | Role definitions, not project logic         |
| Hooks (`.claude/hooks/`)   | Yes       | Context injection reads from config         |
| Workflows                  | Yes       | Process definitions, not implementation     |
| `CLAUDE.md`                | **No**    | Must customize per project                  |
| `docs/project-config.json` | **No**    | Generated per project via `/project-config` |
| `docs/project-reference/`  | **No**    | Generated per project via `/scan-*` skills  |

## Optional Dependencies

Most features work with just Node.js. Some skills require additional tools:

| Skill              | Dependency          | Install                           |
| ------------------ | ------------------- | --------------------------------- |
| `ai-multimodal`    | Python + Gemini API | `pip install google-genai`        |
| `media-processing` | FFmpeg, ImageMagick | `brew install ffmpeg imagemagick` |
| `devops`           | Docker, Wrangler    | `npm install -g wrangler`         |
| `chrome-devtools`  | Puppeteer           | `npm install puppeteer`           |

See [INSTALLATION.md](.claude/skills/INSTALLATION.md) for full dependency list.

Automated install scripts:

```bash
# Linux/macOS
cd .claude/skills && ./install.sh

# Windows (PowerShell as Admin)
cd .claude\skills
.\install.ps1
```

## Testing

Run the hook test suite:

```bash
node .claude/hooks/tests/test-all-hooks.cjs
```

## Further Reading

| Document                                                              | Description                             |
| --------------------------------------------------------------------- | --------------------------------------- |
| [Architecture Guide](.claude/docs/claude-ai-agent-framework-guide.md) | Deep dive into the 3-layer architecture |
| [Quick Start](.claude/docs/quick-start.md)                            | 5-minute getting started guide          |
| [Universal Setup Guide](.claude/docs/universal-setup-guide.md)        | Step-by-step adoption for any project   |
| [Hook System](.claude/docs/hooks/README.md)                           | Hook architecture and extending         |
| [Skills Guide](.claude/docs/skills/README.md)                         | Skill system overview                   |
| [Configuration](.claude/docs/configuration/README.md)                 | Settings and customization              |
| [Troubleshooting](.claude/docs/troubleshooting.md)                    | Common issues and fixes                 |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

See [NOTICE](NOTICE) for vendored components and [THIRD_PARTY_NOTICES](.claude/skills/THIRD_PARTY_NOTICES.md) for full third-party attributions.
