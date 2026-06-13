# easy-claude

> Drop-in `.claude` framework that transforms Claude Code into a project-aware, quality-enforced, hallucination-resistant AI development agent.

## What is this?

**easy-claude** is a portable `.claude` template you copy into any project to supercharge Claude Code with **54 top-level hook files**, **156 skills**, **17 workflows**, and **29 specialized agents**. It covers the entire software development lifecycle — from idea capture and test specification through implementation, code review, and documentation. The Claude-authored source also syncs to Codex mirrors under `.agents/` and `.codex/`, with Copilot instruction generation available through sync skills and scripts.

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

Three core execution layers solve different failure modes. Specialized agents plug into skills and workflows when work benefits from isolated context or parallel review.

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
| Python          | 3.x     | `python --version` |
| Git             | 2.x+    | `git --version`    |

### Installation (5 minutes)

**1. Copy the `.claude` directory into your project:**

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

**2. Initialize project context (one command):**

```
/project-init
```

`/project-init` is the canonical setup coordinator. It is idempotent and orchestrates the whole bootstrap so you don't have to run the lower-level skills by hand:

- `/project-config` — scans your project and populates `docs/project-config.json` (tech stack, modules, directory structure, build commands)
- `/scan-all` — generates the `docs/project-reference/` docs that hooks auto-inject
- `/workflow-spec-driven-dev` — seeds/audits the canonical Feature Specs under `docs/specs/`
- `/claude-md-init` — generates or smart-merges `CLAUDE.md` (preserving your project-specific content)
- `/review-changes` → `/why-review` — reviews the generated setup
- a background `/graph-build` — builds the structural code graph

Codex/Copilot mirrors (`AGENTS.md`, `.agents/`, `.codex/`) are surfaced as a follow-up — run `/sync-codex` when prompted.

**3. Refresh reference docs later (as the codebase evolves):**

```
/scan-all                          # refresh every reference doc
/scan --target=backend-patterns    # refresh one (targets: project-structure | backend-patterns |
                                   #   frontend-patterns | scss-styling | design-system | code-review-rules |
                                   #   domain-entities | feature-spec | docs-index | e2e-tests | integration-tests)
/scan-codebase-health              # detect unused exports, doc count-drift, orphan files
```

**4. Start working:**

```
/cook    # Implement features step-by-step
/fix     # Debug and fix issues
/plan    # Create implementation plans
/test    # Run tests
```

## What's Inside

### Hooks (54 top-level files, 33 lib modules)

Runtime Node.js scripts that fire on Claude Code lifecycle events.

| Category               | Hooks                                                                                                           | Purpose                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Safety**             | `path-boundary-block`, `privacy-block`, `scout-block`                                                           | Prevent out-of-scope access, block secrets, limit broad searches        |
| **Quality**            | `edit-enforcement`, `skill-enforcement`                                                                         | Force task tracking, enforce skill usage                                |
| **Context Injection**  | `pretooluse-ctx-*` (9 dispatchers) + `prompt-context-assembler` — builders in `pretooluse-context-builders.cjs` | Auto-inject relevant patterns when editing specific file types          |
| **Session Management** | `session-init`, `session-end`, `session-resume`, `post-compact-recovery`                                        | Initialize state, persist across compactions, recover after memory loss |
| **Workflow**           | `workflow-router` (3 files), `workflow-step-tracker`, `todo-tracker`                                            | Detect intent, route to workflows, track step progress                  |
| **Freshness Gates**    | `graph-build` gate, reference-docs staleness gate                                                               | Block investigations when code graph or reference docs are stale        |

**Context re-injection:** The framework re-injects CLAUDE.md rules, project config, and project-reference patterns at every `UserPromptSubmit` via `prompt-context-assembler` (5 files) and the `pretooluse-ctx-mindset` dispatcher. This stateless-per-turn design prevents context drift over long sessions. `lib/dedup-constants.cjs` ensures each injection fires exactly once per session.

**Hook part-file architecture:** Large hooks are split into chained part-files for maintainability. The harness chains them at runtime. Affected: `prompt-context-assembler` (5 files: base + `-claude`, `-closers`, `-docs`, `-project-config`), `workflow-router` (3 files: base + `-p2`, `-p3`).

### Skills (156 definitions)

Markdown-based prompts with YAML frontmatter that guide AI behavior.

| Category           | Examples                                                                                                   | What They Do                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Planning**       | `/plan`, `/scout`, `/investigate`                                                                          | Research, plan, investigate before coding               |
| **Implementation** | `/cook`, `/code`, `/fix`, `/refactoring`                                                                   | Write code with quality gates                           |
| **Testing**        | `/test`, `/integration-test`, `/integration-test-review`, `/integration-test-verify`, `/e2e-test`, `/spec` | Test-first, test-after, and spec-traceability workflows |
| **Review**         | `/code-review`, `/review-changes`, `/security-review`                                                      | Code quality, security audits                           |
| **Documentation**  | `/docs-update`, `/changelog`, `/spec`                                                                      | Auto-generate and maintain docs                         |
| **Research**       | `/web-research`, `/deep-research`, `/docs-seeker`                                                          | Web research, library docs fetching                     |
| **Design**         | `/design-spec`, `/interface-design`, `/pbi-mockup`, `/excalidraw-diagram`                                  | UI/UX specs, wireframes, PBI visuals, diagrams          |
| **DevOps**         | `/devops`, `/fix --target=ci`, `/sre-review`                                                               | Infrastructure, CI/CD, reliability                      |
| **Scanning**       | `/scan-all`, `/scan --target=<key>`, `/scan-codebase-health`                                               | Generate reference docs for hooks to auto-inject        |
| **Documents**      | `/markdown-to-pdf`, `/markdown-to-docx`, `/pdf-to-markdown`                                                | Document format conversion                              |

### Workflows (17 definitions)

End-to-end process orchestration with step enforcement.

| Workflow                          | Focus                                                                   | Use When                                          |
| --------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `workflow-feature`                | Scout, investigate, plan, write specs, implement, review, test, docs    | Implementing a well-defined feature               |
| `workflow-bugfix`                 | Trace root cause, write regression specs/tests, fix, prove, verify      | Fixing a bug without losing invariants            |
| `workflow-big-feature`            | Idea, research, domain/tech analysis, stories, specs, implementation    | Large or ambiguous feature needing research       |
| `workflow-greenfield-init`        | Product inception through scaffold, implementation, tests, docs         | New project from scratch                          |
| `workflow-product-discovery`      | Brainstorm, research, PBIs, stories, DoR, mockups, ranked backlog       | Turning raw vision into implementation-ready work |
| `workflow-spec-driven-dev`        | Engineering specs, feature docs, TDD specs, implementation sync         | Keeping specs, tests, code, and docs aligned      |
| `workflow-write-integration-test` | Domain investigation, test specs, integration test code, review, verify | Adding or updating integration tests              |
| `workflow-refactor`               | Search-first restructuring with plan, implementation, review, tests     | Code improvement without behavior drift           |

### Agents (29 specialists)

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
├── .agents/                  # Codex skill mirror generated from .claude/skills
├── .codex/                   # Codex agents, hooks, and context parity files
├── .claude/                  # <-- The framework template (copy this to your project)
│   ├── agents/               # 29 specialized agent definitions
│   ├── hooks/                # 54 top-level hook files + lib/ utilities
│   │   ├── lib/              # Shared hook libraries
│   │   ├── notifications/    # Multi-channel notification system
│   │   ├── scout-block/      # Broad search prevention
│   │   └── tests/            # Hook test suites
│   ├── skills/               # 156 skill definitions
│   │   ├── <skill>/          # Each skill directory contains:
│   │   │   ├── SKILL.md      # Entry point (prompt + frontmatter)
│   │   │   ├── scripts/      # Optional automation scripts
│   │   │   └── references/   # Optional reference docs
│   │   └── common/           # Shared Python utilities
│   ├── workflows/            # Workflow definitions & rules
│   ├── docs/                 # Framework documentation
│   ├── scripts/              # Utility scripts (catalogs, audit, Codex sync)
│   │   └── codex/            # Codex sync, migration, and verification tooling
│   ├── output-styles/        # Coding level output styles (ELI5→God)
│   ├── config/               # Templates for agents/skills
│   ├── settings.json         # Hook registration & features
│   └── workflows.json        # Workflow catalog definitions
├── docs/
│   ├── project-config.json   # Project-specific config (generated)
│   └── project-reference/    # Reference docs (generated by /scan-all)
├── AGENTS.md                 # Codex-facing project instructions
├── CLAUDE.md                 # Project instructions for Claude
├── package.json              # Root tooling scripts for Codex compatibility
└── README.md                 # This file
```

## How It Works

### Project-Agnostic Design

The entire framework is **project-agnostic**. All project-specific knowledge lives in `docs/project-config.json`. Swap one config file and the same hooks, skills, and workflows adapt to any tech stack.

```
┌─────────────────────────────────────┐
│     Generic Framework (reusable)    │
│ 54 Hook Files + 156 Skills + 17 Flows │
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

| Event              | When                      | Example Hook                                                   |
| ------------------ | ------------------------- | -------------------------------------------------------------- |
| `SessionStart`     | Claude Code starts        | `session-init.cjs` — load config, inject context               |
| `SessionEnd`       | Claude Code exits         | `session-end.cjs` — persist final state                        |
| `UserPromptSubmit` | Before each user message  | `prompt-context-assembler.cjs` — inject rules                  |
| `PreToolUse`       | Before tool execution     | `privacy-block.cjs` — block secrets access                     |
| `PostToolUse`      | After tool execution      | `tool-output-swap.cjs` — compress large outputs                |
| `PreCompact`       | Before context compaction | `write-compact-marker.cjs` — save state                        |
| `SubagentStart`    | Subagent init             | `subagent-init-*.cjs` (3 hooks) — inject agent context (paged) |
| `Notification`     | Desktop notify event      | `notify-waiting.js` — send system notification                 |
| `Stop`             | Response complete         | `notify-waiting.js` — desktop notification                     |

### Workflow Detection

The workflow router (the `WORKFLOW-GATE`) automatically classifies each prompt by complexity and risk, then matches it to the right route:

- "implement a well-defined feature" → `workflow-feature`
- "fix this bug" → `workflow-bugfix`
- "refactor Y without changing behavior" → `workflow-refactor`
- "build a large/ambiguous feature needing research" → `workflow-big-feature`
- a trivial, low-risk one-off → direct execution (no workflow)

The gate **auto-selects** the route — it does not ask you to choose between direct/skill/workflow paths. A standard workflow is activated via `/start-workflow <id>`, which loads the workflow's canonical step sequence and builds the task list 1:1. An explicit `/skill` or `/workflow` in your prompt is always honored as-is.

## Design Principles

Seven principles that make this framework work reliably across any project:

| Principle                         | What it means                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stateless-per-turn invariants** | Rules are re-injected at every prompt turn — never trust context retention over long sessions                                                                 |
| **Defense in depth**              | Quality gates exist across hooks (programmatic), skills (protocol), workflows (sequence), and agents (specialized review). Bypassing one is caught by another |
| **Self-contained skill units**    | Each skill is a complete prompt unit via `SYNC` tags — protocols are inlined, not indirectly referenced. Skills work standalone                               |
| **Project-agnostic generality**   | One `project-config.json` drives all context injection. The same hooks, skills, and workflows adapt to any tech stack                                         |
| **Full lifecycle coverage**       | idea → research → TDD spec → plan → implement → review → test → E2E → docs. No stage left to chance                                                           |
| **Structural intelligence**       | The code graph makes the AI reason about systems as systems — implicit relationships (events, API contracts, bus messages) are first-class                    |
| **Evidence-based AI**             | Every recommendation requires `file:line` citations. The confidence framework (>80% act, <60% don't) quantifies certainty                                     |

## What's Project-Agnostic vs Project-Specific

| Component                  | Agnostic? | Notes                                                                |
| -------------------------- | --------- | -------------------------------------------------------------------- |
| Skills (`.claude/skills/`) | Yes       | Behavioral patterns, not code patterns                               |
| Agents (`.claude/agents/`) | Yes       | Role definitions, not project logic                                  |
| Hooks (`.claude/hooks/`)   | Yes       | Context injection reads from config                                  |
| Workflows                  | Yes       | Process definitions, not implementation                              |
| `CLAUDE.md`                | **No**    | Generated/merged per project via `/project-init` (`/claude-md-init`) |
| `docs/project-config.json` | **No**    | Generated per project via `/project-init` (`/project-config`)        |
| `docs/project-reference/`  | **No**    | Generated per project via `/project-init` (`/scan-all`)              |

## Optional Dependencies

Most framework features work with Node.js and Python 3. Some skills require additional tools:

| Skill    | Dependency       | Install                   |
| -------- | ---------------- | ------------------------- |
| `devops` | Docker, Wrangler | `npm install -g wrangler` |

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

Run the Codex mirror and compatibility verification suite:

```bash
npm run codex:verify:all
```

## Further Reading

| Document                                                              | Description                                 |
| --------------------------------------------------------------------- | ------------------------------------------- |
| [Architecture Guide](.claude/docs/claude-ai-agent-framework-guide.md) | Deep dive into architecture and portability |
| [Quick Start](.claude/docs/quick-start.md)                            | 5-minute getting started guide              |
| [Universal Setup Guide](.claude/docs/universal-setup-guide.md)        | Step-by-step adoption for any project       |
| [Hook System](.claude/docs/hooks/README.md)                           | Hook architecture and extending             |
| [Skills Guide](.claude/docs/skills/README.md)                         | Skill system overview                       |
| [Configuration](.claude/docs/configuration/README.md)                 | Settings and customization                  |
| [Troubleshooting](.claude/docs/troubleshooting.md)                    | Common issues and fixes                     |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

See [NOTICE](NOTICE) for vendored components and [THIRD_PARTY_NOTICES](.claude/skills/THIRD_PARTY_NOTICES.md) for full third-party attributions.
