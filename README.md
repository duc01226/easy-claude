# easy-claude

> Drop-in `.claude` framework that transforms Claude Code into a project-aware, quality-enforced, hallucination-resistant AI development agent.

## What is this?

**easy-claude** is a portable `.claude` template you copy into any project to supercharge Claude Code with **15 top-level hook files**, **153 skills**, **17 workflows**, and **29 specialized agents**. It covers the entire software development lifecycle — from idea capture and test specification through implementation, code review, and documentation. The Claude-authored source also syncs to Codex mirrors under `.agents/` and `.codex/`, with Copilot instruction generation available through sync skills and scripts.

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
│ lifecycle events │  │ matter           │  │ with step gates  │
│                  │  │                  │  │                  │
│ Block/allow/     │  │ Define AI        │  │ Routed via       │
│ inject context   │  │ behavior &       │  │ complexity+risk  │
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

**1. Copy the framework folders into your project root.**

The framework ships three sibling folders — one per AI tool. Copy whichever you use; copy all three to get Claude Code, Codex, and the Codex skill mirror in one shot:

```bash
cp -r .claude  /path/to/your-project/.claude    # Claude Code — the source of truth (required)
cp -r .codex   /path/to/your-project/.codex     # Codex agents, hooks, context parity (optional)
cp -r .agents  /path/to/your-project/.agents    # Codex skill mirror generated from .claude/skills (optional)
```

`.claude/` is the canonical source. `.codex/` and `.agents/` (plus the root `AGENTS.md` and `.github/copilot-instructions.md`) are **generated mirrors** — never edit them by hand; they are re-synced from `.claude/` by the AI-sync skills below.

> No Codex/Copilot? Copy only `.claude/`. The mirrors are regenerated on demand by `/sync-codex` and `/sync-to-copilot`.

**2. Run `/project-init` first — always the first command in a new project.**

```
/project-init
```

`/project-init` is the canonical, idempotent setup coordinator. Run it before any project-specific work. It orchestrates the whole bootstrap so you never call the lower-level skills by hand:

| Step it runs                      | What it produces                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `/project-config`                 | `docs/project-config.json` — tech stack, modules, directory structure, build commands |
| `/scan-all`                       | `docs/project-reference/` docs the project-reference-docs gate reads on demand        |
| `/workflow-code-to-spec`          | canonical Feature Specs under `docs/specs/` (seed or audit from code)                 |
| `/claude-md-init`                 | `CLAUDE.md` (generated, or smart-merged to preserve your content)                     |
| `/review-changes` → `/why-review` | review gates over the generated setup                                                 |
| background `/graph-build`         | the structural code graph (`.code-graph/graph.db`)                                    |

`/project-init` surfaces the Codex/Copilot mirror sync as a follow-up — run the AI-sync skills (step 3) when prompted.

**3. Sync the AI dev-tool mirrors (only if you copied `.codex` / use Copilot).**

The mirrors are derived from `.claude/`. After `/project-init` (or any time `.claude/` changes), regenerate them:

```
/sync-codex          # regenerate AGENTS.md, .agents/, .codex/ from .claude/ (migrate → hooks → context → verify)
/sync-to-copilot     # regenerate .github/copilot-instructions.md from .claude/ knowledge
```

Equivalent CLI (no slash command needed):

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs   # standalone Codex sync, no npm required
npm run codex:sync                                          # same via package.json scripts
```

**4. Refresh reference docs later (as the codebase evolves):**

```
/scan-all                          # refresh every reference doc (read on demand via the project-reference-docs gate)
/scan --target=backend-patterns    # refresh one (targets: project-structure | backend-patterns |
                                   #   frontend-patterns | scss-styling | design-system | code-review-rules |
                                   #   domain-entities | feature-spec | docs-index | e2e-tests | integration-tests)
/scan-codebase-health              # detect unused exports, doc count-drift, orphan files
```

**5. Start working:**

```
/feature-implement    # Implement features step-by-step
/fix     # Debug and fix issues
/plan    # Create implementation plans
/test    # Run tests
```

### Essential Skills Cheat Sheet

| Skill                   | When to run                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/project-init`         | **First command in any new project** — bootstraps config, reference docs, specs, `CLAUDE.md`, and code graph (idempotent; safe to re-run) |
| `/scan-all`             | Regenerate **all** `docs/project-reference/` docs after large code changes                                                                |
| `/scan --target=<key>`  | Regenerate **one** reference doc when scope is narrow                                                                                     |
| `/sync-codex`           | Re-sync the Codex mirror (`AGENTS.md`, `.agents/`, `.codex/`) from `.claude/`                                                             |
| `/sync-to-copilot`      | Re-sync the GitHub Copilot instructions from `.claude/`                                                                                   |
| `/scan-codebase-health` | Audit for unused exports, doc drift, and orphan files                                                                                     |

## What's Inside

### Hooks (15 top-level `.cjs` files + 1 `.js` helper, 25 lib modules)

Runtime Node.js scripts that fire on Claude Code lifecycle events.

| Category               | Hooks                                                                                                          | Purpose                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Safety**             | `path-boundary-block`, `privacy-block`, `scout-block`, `git-commit-block`, `windows-command-detector`          | Prevent out-of-scope access, block secrets, limit broad searches, guard git/CMD                             |
| **Quality**            | `doc-sync-gate`                                                                                                | Warn on doc⇄code drift                                                                                      |
| **Session Management** | `verify-install`, `session-init`, `session-init-docs`, `session-end`, `npm-auto-install`, `graph-session-init` | Initialize state, load config, auto-install deps, seed the graph                                            |
| **Routing**            | `init-prompt-gate`                                                                                             | Gate prompts until project config is ready (routing is model-driven from the static catalog in `CLAUDE.md`) |
| **Post-processing**    | `post-edit-prettier`, `graph-auto-update`                                                                      | Format after edits, keep the code graph current                                                             |

> **De-hooked enforcement & context injection.** Earlier versions ran runtime
> enforcement/lifecycle hooks — per-edit/per-prompt inject dispatchers plus task/skill/edit
> gating (`edit-enforcement`, `skill-enforcement`, `workflow-task-guard`,
> `agent-files-skill-gate`), todo persistence (`todo-tracker`), compaction snapshot/restore
> (`pre-compact-snapshot`, `write-compact-marker`, `post-compact-recovery`, `session-resume`),
> large-output externalization (`tool-output-swap`), sub-agent validation
> (`post-agent-validator`), and temp cleanup (`bash-cleanup`). Those hooks were **removed**;
> the discipline they enforced and the guidance they injected now live **statically** in
> `CLAUDE.md`, agent `.md`, and skill `SKILL.md` files, so a hookless harness (Codex /
> Copilot) reads identical instructions.

**Context re-anchoring:** Critical rules are carried as static SYNC-tagged invariants in
`CLAUDE.md` / agent / skill bodies; the workflow catalog is baked statically into `CLAUDE.md`
(and the `AGENTS.md` mirror). Re-reading these static files restores rules and lessons after
compaction. This stateless-per-turn design prevents context drift over long sessions.

### Skills (153 definitions)

Markdown-based prompts with YAML frontmatter that guide AI behavior.

| Category           | Examples                                                                                                   | What They Do                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Planning**       | `/plan`, `/scout`, `/investigate`                                                                          | Research, plan, investigate before coding                |
| **Implementation** | `/feature-implement`, `/plan-execute`, `/fix`, `/refactoring`                                              | Write code with quality gates                            |
| **Testing**        | `/test`, `/integration-test`, `/integration-test-review`, `/integration-test-verify`, `/e2e-test`, `/spec` | Test-first, test-after, and spec-traceability workflows  |
| **Review**         | `/code-review`, `/review-changes`, `/security-review`                                                      | Code quality, security audits                            |
| **Documentation**  | `/docs-update`, `/changelog`, `/spec`                                                                      | Auto-generate and maintain docs                          |
| **Research**       | `/web-research`, `/deep-research`, `/docs-seeker`                                                          | Web research, library docs fetching                      |
| **Design**         | `/design`, `/design-spec`, `/pbi-mockup`, `/excalidraw-diagram`                                            | UI/UX design, specs, wireframes, PBI visuals, diagrams   |
| **DevOps**         | `/devops`, `/fix --target=ci`, `/production-readiness-review`                                              | Infrastructure, CI/CD, reliability                       |
| **Scanning**       | `/scan-all`, `/scan --target=<key>`, `/scan-codebase-health`                                               | Generate reference docs the project-reference gate reads |
| **Documents**      | `/markdown-to-pdf`, `/markdown-to-docx`, `/pdf-to-markdown`                                                | Document format conversion                               |

### Workflows (17 definitions)

End-to-end process orchestration with step enforcement. The table below shows the most-used workflows — see `.claude/workflows.json` for all 17 (including `workflow-feature-spec`, `workflow-spec-to-pbi`, `workflow-spec-sync`, `workflow-seed-test-data`, `workflow-visualize`).

**Pick a workflow by use case:**

| I want to…                                   | Workflow                          |
| -------------------------------------------- | --------------------------------- |
| Implement a well-defined feature             | `workflow-feature`                |
| Fix a bug without losing invariants          | `workflow-bugfix`                 |
| Build a large/ambiguous feature (needs R&D)  | `workflow-big-feature`            |
| Refactor without changing behavior           | `workflow-refactor`               |
| Start a brand-new project from scratch       | `workflow-greenfield-init`        |
| Turn a raw idea into a Feature Spec          | `workflow-idea-to-spec`           |
| Take one idea to a groomed PBI               | `workflow-idea-to-pbi`            |
| Author/maintain Feature Specs from code      | `workflow-code-to-spec`           |
| Add or update integration tests              | `workflow-write-integration-test` |
| Generate/update E2E (Playwright) tests       | `workflow-e2e`                    |
| Research a topic into a cited report         | `workflow-research`               |
| **Review uncommitted changes before commit** | `workflow-review-changes`         |

**How to run one:** just describe your task — the `WORKFLOW-GATE` auto-classifies and routes it (no menu, no confirmation). To force a specific one, run `/start-workflow <id>`; it loads that workflow's canonical step sequence and builds the task list 1:1. An explicit `/skill` or `/workflow` you type is always honored as-is.

### Quality Gates & Review Skills

Reviews are first-class skills you can run standalone, and several are chained automatically inside `workflow-review-changes` — the recommended gate before any commit. That workflow runs, in order: `/review-changes` → `/why-review` → `/review-architecture` → `/review-domain-entities` → `/performance-review` → `/integration-test-review` → `/security-review` → `/code-simplifier`, then re-reviews until clean.

| Review skill                   | Catches                                                                  |
| ------------------------------ | ------------------------------------------------------------------------ |
| `/review-changes`              | General correctness/quality on staged, unstaged, or branch-diff changes  |
| `/code-review`                 | Targeted code-quality review and completion-claim verification           |
| `/why-review`                  | Weak rationale / unjustified changes in plans, diffs, PBIs, specs        |
| `/review-architecture`         | Layering, messaging, service-boundary, CQRS, repo violations             |
| `/review-domain-entities`      | DDD design quality of entities and value objects                         |
| `/performance-review`          | N+1 queries, indexing, API latency, memory, render bottlenecks           |
| `/security-review`             | OWASP Top 10, secrets exposure, dependency/supply-chain risk             |
| `/integration-test-review`     | Assertion quality, bug protection, repeatability, test↔spec traceability |
| `/production-readiness-review` | Production readiness of service-layer and API changes                    |
| `/review-ui`                   | Overflow, responsive layout, z-index, SCSS/BEM quality                   |
| `/plan-review`                 | Plan validity, correctness, and best-practice gaps (recursive)           |
| `/review-artifact`             | PBI / story / test-spec / design artifact quality before handoff         |
| `/quality-gate`                | Run the consolidated quality-gate checklist                              |

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
│   ├── hooks/                # 15 top-level hook files + lib/ utilities
│   │   ├── lib/              # Shared hook libraries
│   │   ├── notifications/    # Multi-channel notification system
│   │   ├── scout-block/      # Broad search prevention
│   │   └── tests/            # Hook test suites
│   ├── skills/               # 153 skill definitions
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
│ 15 Hook Files + 153 Skills + 17 Flows │
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

Hooks register on these Claude Code events (there is no `SubagentStart` hook — agent context is static in the agent `.md` files; `PreCompact` has no live hook, recovery is static re-anchoring):

| Event              | When                     | Example Hook                                       |
| ------------------ | ------------------------ | -------------------------------------------------- |
| `SessionStart`     | Claude Code starts       | `session-init.cjs` — load config, inject context   |
| `SessionEnd`       | Claude Code exits        | `session-end.cjs` — persist final state            |
| `UserPromptSubmit` | Before each user message | `init-prompt-gate.cjs` — gate until config ready   |
| `PreToolUse`       | Before tool execution    | `privacy-block.cjs` — block secrets access         |
| `PostToolUse`      | After tool execution     | `post-edit-prettier.cjs` — format edited files     |
| `Notification`     | Desktop notify event     | `notifications/notify.cjs` — unified notify router |
| `Stop`             | Response complete        | `notifications/notify.cjs` — desktop notification  |

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
