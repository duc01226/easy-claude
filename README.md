# easy-claude

> Drop-in `.claude` framework that transforms Claude Code into a project-aware, quality-enforced, hallucination-resistant AI development agent.

## What is this?

**easy-claude** is a portable `.claude` template you copy into any project to supercharge Claude Code with **<!-- COUNT:hooks -->33<!-- /COUNT --> top-level hook files**, **<!-- COUNT:skills -->104<!-- /COUNT --> skills**, **<!-- COUNT:workflows -->19<!-- /COUNT --> workflows**, and **<!-- COUNT:agents -->24<!-- /COUNT --> specialized agents**. It covers the entire software development lifecycle — from initiative capture and test specification through implementation, code review, and documentation. The Claude-authored source also syncs to Codex mirrors under `.agents/` and `.codex/`.

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

The framework ships one canonical folder and two generated Codex-compatibility folders. Copy whichever surfaces you use; copy all three to get Claude Code and both Codex compatibility surfaces in one shot:

```bash
cp -r .claude  /path/to/your-project/.claude    # Claude Code — the source of truth (required)
cp -r .codex   /path/to/your-project/.codex     # Codex agents, hooks, context parity (optional)
cp -r .agents  /path/to/your-project/.agents    # Codex skill mirror generated from .claude/skills (optional)
```

`.claude/` is the canonical source. `.codex/` and `.agents/` (plus the root `AGENTS.md`) are **generated mirrors** — never edit them by hand; they are re-synced from `.claude/` by the AI-sync skills below.

> No Codex? Copy only `.claude/`. The mirrors are regenerated on demand by `/sync-codex`.

**2. Run `/project-init` first — always the first command in a new project.**

```
/project-init
```

`/project-init` is the canonical, idempotent setup coordinator. Run it before any project-specific work. It orchestrates the whole bootstrap so you never call the lower-level skills by hand:

| Step it runs                          | What it produces                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `/project-config`                     | `docs/project-config.json` — tech stack, modules, directory structure, build commands |
| `/scan-all`                           | `docs/project-reference/` docs the project-reference-docs gate reads on demand        |
| `/workflow-code-to-spec`              | canonical Feature Specs under `docs/specs/` (seed or audit from code)                 |
| `/ai-context-refresh`                 | project AI context (`CLAUDE.md` plus Codex mirror handoff; generated or smart-merged) |
| `/changes-review` → `/why-review`     | review gates over the generated setup                                                 |
| background `/graph-code --mode=build` | the structural code graph (`.code-graph/graph.db`)                                    |

`/project-init` surfaces the Codex mirror sync as a follow-up — run the AI-sync skill (step 3) when prompted.

**3. Sync the Codex mirrors (only if you copied `.codex` or `.agents`).**

The mirrors are derived from `.claude/`. After `/project-init` (or any time `.claude/` changes), regenerate them:

```
/sync-codex          # regenerate AGENTS.md, .agents/, .codex/ from .claude/ (migrate → hooks → context → verify)
```

Equivalent CLI (no slash command needed):

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs   # standalone Codex sync, no npm required
```

> **Hook-only delivery — host requirements.** The universal rules, the workflow route and the skill-overlay reminder reach a session only through hooks. On Codex, trust the project and review the new handlers in `/hooks` after the first sync: until then Codex receives no universal rules and no route (no static fallback exists). OpenCode sub-agent delivery depends on the child session's first `chat.message` and is unverified. A host that runs no hooks is unsupported. Details: `.claude/docs/hooks/README.md#hook-only-delivery-host-requirements`.

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
| `/scan-codebase-health` | Audit for unused exports, doc drift, and orphan files                                                                                     |

## What's Inside

### Hooks (<!-- COUNT:hooks -->33<!-- /COUNT --> top-level `.cjs` files, <!-- COUNT:lib-modules -->61<!-- /COUNT --> lib modules)

Runtime Node.js scripts that fire on Claude Code lifecycle events.

| Category               | Hooks                                                                                                                                                                              | Purpose                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Safety**             | `review-commit-gate`                                                                                                                                                               | Block an agent `git commit` with no review fix-loop receipt or user-approved skip; other git and GitHub writes are model-behavioral                                                                                                                                                                                      |
| **Quality**            | `doc-sync-gate`                                                                                                                                                                    | Warn on doc⇄code drift                                                                                                                                                                                                                                                                                                   |
| **Session Management** | `verify-install`, `session-init`, `session-init-docs`, `session-end`, `graph-session-init`                                                                                         | Initialize state, load config, seed the graph                                                                                                                                                                                                                                                                            |
| **Routing**            | `init-prompt-gate`, `workflow-route-inject`, `workflow-catalog-inject`, `graph-prompt-sync`, `prompt-ledger`, `commit-skill-route`, `judgement-integrity-route`, `ai-feature-route`, `core-principles-inject`, `task-tracking-route` | Gate prompts until project config is ready, inject the route gate and live catalog, re-sync the graph when HEAD moved, keep the prompt ledger anchored, route commit requests to the `commit` skill, remind the judgement-integrity check on verdict requests, remind the AI-engineering gate on AI-feature requests, and offer optional task-tracking purpose/concern guidance |
| **Post-processing**    | `post-edit-prettier`, `graph-auto-update`, `file-convention-inject`, `token-budget-checkpoint`                                                                                     | Format after edits, keep the code graph current, remind the opt-in per-file conventions after reads/edits, emit an advisory token checkpoint at task steps                                                                                                                                                               |
| **Protocol delivery**  | `protocol-inject-review`, `-evidence-trace`, `-workflow-task`, `-spec-test`, `-design`, `-universal-<n>` (4 bins), `skill-overlay-remind`                                                                            | Deliver the full shared-protocol texts a skill declares, once per session, on a skill load, a typed `/command`, or a skill-preloading sub-agent start; the universal bundle goes to the first prompt, after about 150K tokens or a compaction, and to every sub-agent; the overlay reminder names a skill's project overlays                                                                                                                                                                    |

> **De-hooked enforcement & context injection.** Earlier versions ran runtime
> enforcement/lifecycle hooks — per-edit/per-prompt inject dispatchers plus task/skill/edit
> gating (`edit-enforcement`, `skill-enforcement`, `workflow-task-guard`,
> `agent-files-skill-gate`), todo persistence (`todo-tracker`), compaction snapshot/restore
> (`pre-compact-snapshot`, `write-compact-marker`, `post-compact-recovery`, `session-resume`),
> large-output externalization (`tool-output-swap`), sub-agent validation
> (`post-agent-validator`), and temp cleanup (`bash-cleanup`). Those hooks were **removed**;
> the discipline they enforced is now carried by the universal protocols, which the
> universal hook delivers (a host that runs no hooks is unsupported).

**Context re-anchoring:** The universal rules are delivered by the universal hook on the first prompt and
again after 150K tokens of growth or a compaction, and to every sub-agent; the workflow route is delivered by
`workflow-route-inject.cjs` (the gate) and `workflow-catalog-inject.cjs` (the catalog). `CLAUDE.md` and `AGENTS.md` hold project information only. This design prevents
context drift over long sessions.

### Skills (<!-- COUNT:skills -->104<!-- /COUNT --> definitions)

Markdown-based prompts with YAML frontmatter that guide AI behavior.

| Category           | Examples                                                                                                                 | What They Do                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Planning**       | `/plan`, `/investigate`                                                                                                  | Research, plan, investigate before coding                |
| **Implementation** | `/feature-implement`, `/plan --mode=execute`, `/fix`                                                                     | Write code with quality gates                            |
| **Testing**        | `/test`, `/integration-test`, `/integration-test --mode=review`, `/integration-test --mode=verify`, `/e2e-test`, `/spec` | Test-first, test-after, and spec-traceability workflows  |
| **Review**         | `/code-quality-review`, `/changes-review`, `/security-audit`                                                             | Code quality, security audits                            |
| **Documentation**  | `/docs-manager --mode=update`, `/spec`                                                                                   | Auto-generate and maintain docs                          |
| **Research**       | `/web-research`, `/source-deep-dive`                                                                                     | Web research, library docs fetching                      |
| **Design**         | `/ui-design`, `/design-spec`, `/work-item --mode=mockup`                                                                       | UI/UX design, specs, wireframes, task visuals             |
| **DevOps**         | `/fix --target=ci`, `/production-readiness-review`                                                                       | CI/CD fixes, release reliability                         |
| **Scanning**       | `/scan-all`, `/scan --target=<key>`, `/scan-codebase-health`                                                             | Generate reference docs the project-reference gate reads |
| **Documents**      | `/pdf-convert`, `/docx-convert`                                                                                          | Document format conversion (both directions via `--to`)  |

### Workflows (<!-- COUNT:workflows -->19<!-- /COUNT --> definitions)

End-to-end process orchestration with step enforcement. The table below shows the most-used workflows — see `.claude/workflows.json` for all <!-- COUNT:workflows -->19<!-- /COUNT --> (including `workflow-architecture-audit`, `workflow-feature-spec`, `workflow-spec-to-task`, `workflow-spec-sync`, and `workflow-seed-test-data`).

**Pick a workflow by use case:**

| I want to…                                                     | Workflow                    |
| -------------------------------------------------------------- | --------------------------- |
| Implement a well-defined feature                               | `workflow-feature`          |
| Fix a bug without losing invariants                            | `workflow-bugfix`           |
| Build a large/ambiguous feature (needs R&D)                    | `workflow-big-feature`      |
| Refactor without changing behavior                             | `workflow-refactor`         |
| Start a brand-new project from scratch                         | `workflow-greenfield-init`  |
| Turn a raw idea into a Feature Spec                            | `workflow-initiative-to-spec`     |
| Take one idea to a groomed task                                 | `workflow-initiative-to-task`      |
| Turn a spec into a clickable mockup (1–3 designs)              | `workflow-spec-to-mockup`   |
| Author/maintain Feature Specs from code                        | `workflow-code-to-spec`     |
| Add or update integration tests, or drive a red suite to green | `workflow-integration-test` |
| Write, update, verify, and fix E2E (Playwright)                | `workflow-e2e`              |
| Research a topic into a cited report                           | `workflow-research`         |
| **Review uncommitted changes before commit**                   | `workflow-review-changes`   |

**How to run one:** just describe your task — the `WORKFLOW-GATE` (delivered by a hook at prompt time) classifies and routes it; when it matches a workflow, it asks one question first: run the full workflow, a slimmer custom route, or execute directly. That is the default `ask` mode; each person can switch to `auto` (start without asking) or `off` (never start a workflow unasked) without touching shared files — see `.claude/docs/configuration/README.md`. To force a specific one, run `/start-workflow <id>`; it loads that workflow's canonical step sequence and builds the task list 1:1. An explicit `/skill` or `/workflow` you type is always honored as-is.

### Quality Gates & Review Skills

Reviews are first-class skills you can run standalone, and several are chained automatically inside `workflow-review-changes` — the recommended gate before any commit. It starts `/changes-review` inline and a FULL-mode whole-target `/why-review` sub-agent in parallel behind an all-return barrier, validates the dimensional findings, runs the specialist reviewer batch, simplifies/fixes, then runs a final whole-target `/why-review` over the settled state before closing.

| Review skill                      | Catches                                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| `/changes-review`                 | General correctness/quality on staged, unstaged, or branch-diff changes  |
| `/code-quality-review`            | Targeted code-quality review and completion-claim verification           |
| `/why-review`                     | Weak rationale / unjustified changes in plans, diffs, tasks, specs        |
| `/architecture --mode=review`     | Layering, messaging, service-boundary, CQRS, repo violations             |
| `/domain-analysis --mode=review`  | DDD design quality of entities and value objects                         |
| `/performance-review`             | N+1 queries, indexing, API latency, memory, render bottlenecks           |
| `/security-audit`                 | OWASP Top 10, secrets exposure, dependency/supply-chain risk             |
| `/integration-test --mode=review` | Assertion quality, bug protection, repeatability, test↔spec traceability |
| `/production-readiness-review`    | Production readiness of service-layer and API changes                    |
| `/ui-design --mode=review`        | Overflow, responsive layout, z-index, SCSS/BEM quality                   |
| `/plan --mode=review`             | One-pass, read-only plan validity and execution-risk review              |
| `/work-item --mode=review`              | Task / story / test-spec / design artifact quality before handoff         |

### Agents (<!-- COUNT:agents -->24<!-- /COUNT --> specialists)

Subagent definitions for parallelized, specialized work. The table below shows 9 of the <!-- COUNT:agents -->24<!-- /COUNT --> — see `.claude/docs/agents/README.md` for the full roster.

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
│   ├── agents/               # 24 specialized agent definitions
│   ├── hooks/                # 33 top-level hook files + lib/ utilities
│   │   ├── lib/              # Shared hook libraries
│   │   ├── notifications/    # Multi-channel notification system
│   │   └── tests/            # Hook test suites
│   ├── skills/               # 104 skill definitions
│   │   ├── <skill>/          # Each skill directory contains:
│   │   │   ├── SKILL.md      # Entry point (prompt + frontmatter)
│   │   │   ├── scripts/      # Optional automation scripts
│   │   │   └── references/   # Optional reference docs
│   │   └── common/           # Shared Python utilities
│   ├── workflows/            # Workflow definitions & rules
│   ├── docs/                 # Framework documentation
│   ├── scripts/              # Utility scripts (catalogs, audit, Codex sync)
│   │   └── codex/            # Codex sync, migration, and verification tooling
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
│ 33 Hook Files + 104 Skills + 19 Flows │
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

Hooks register on these Claude Code events (`SubagentStart` carries the protocol-delivery handlers and the universal bundle, `UserPromptExpansion` the protocol-delivery handlers and the skill-overlay reminder — standing agent context is static in the agent `.md` files; `PreCompact` has no live hook, the universal bundle re-delivers after a compaction):

| Event                 | When                     | Example Hook                                              |
| --------------------- | ------------------------ | --------------------------------------------------------- |
| `SessionStart`        | Claude Code starts       | `session-init.cjs` — load config, inject context          |
| `SessionEnd`          | Claude Code exits        | `session-end.cjs` — persist final state                   |
| `UserPromptSubmit`    | Before each user message | `init-prompt-gate.cjs` — gate until config ready          |
| `PreToolUse`          | Before tool execution    | `review-commit-gate.cjs` — gate unreviewed commits        |
| `PostToolUse`         | After tool execution     | `post-edit-prettier.cjs` — format edited files            |
| `SubagentStart`       | Sub-agent starts         | `protocol-inject-*.cjs` — protocols of the agent's skills |
| `UserPromptExpansion` | Typed `/command` expands | `protocol-inject-*.cjs` — protocols of the expanded skill |
| `Notification`        | Desktop notify event     | `notifications/notify.cjs` — unified notify router        |
| `Stop`                | Response complete        | `notifications/notify.cjs` — desktop notification         |

### Workflow Detection

The workflow router (the `WORKFLOW-GATE`) automatically classifies each prompt by complexity and risk, then matches it to the right route:

- "implement a well-defined feature" → `workflow-feature`
- "fix this bug" → `workflow-bugfix`
- "refactor Y without changing behavior" → `workflow-refactor`
- "build a large/ambiguous feature needing research" → `workflow-big-feature`
- a focused change (one module/policy, clear intent, no public-contract change) → custom-simple: only the steps it needs, keeping test and review
- a trivial, low-risk one-off → direct execution (no workflow)

The gate assesses the task and declares a route (direct, skill, custom chain or workflow). By default (`ask`) a catalog workflow it decides to start waits for one workflow question (a direct, single-skill or custom-simple route asks nothing) — full workflow, slimmer custom route, or direct execution — on the first task of a session; each person can switch to `auto` (start without asking, by tier) or `off` (nothing starts without an explicit request), see [Workflow route mode](.claude/docs/configuration/README.md#workflow-route-mode-per-person). Once work is under way, follow-ups and new asks run directly or with a lean chain of at most 3 skills. An explicit request always wins, at any point in the session: call a workflow skill (`/workflow-*`, `/start-workflow <id>`) or ask in words ("use the bugfix workflow") and it runs. A standard workflow is activated via `/start-workflow <id>`, which loads the workflow's canonical step sequence and builds the task list 1:1. An explicit `/skill` or `/workflow` in your prompt is always honored as-is.

## Design Principles

Seven principles that make this framework work reliably across any project:

| Principle                         | What it means                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stateless-per-turn invariants** | Universal rules are re-delivered by hook on the first prompt, after about 150K tokens or a compaction, and at every sub-agent start — never trust context retention over long sessions |
| **Defense in depth**              | Quality gates exist across hooks (programmatic), skills (protocol), workflows (sequence), and agents (specialized review). Bypassing one is caught by another                          |
| **Self-contained skill units**    | Each skill names every shared protocol it needs in a guide line; a hook delivers the full text, and the guide's file path is the fallback. Skills work standalone                      |
| **Project-agnostic generality**   | One `project-config.json` drives all context injection. The same hooks, skills, and workflows adapt to any tech stack                                                                  |
| **Full lifecycle coverage**       | idea → research → TDD spec → plan → implement → review → test → E2E → docs. No stage left to chance                                                                                    |
| **Structural intelligence**       | An optional code graph can hint at implicit relationships (events, API contracts, bus messages) when a change looks high-risk; it can be stale, so the AI verifies by reading          |
| **Evidence-based AI**             | Every recommendation requires `file:line` citations. The confidence framework (>80% act, <60% don't) quantifies certainty                                                              |

## What's Project-Agnostic vs Project-Specific

| Component                  | Agnostic? | Notes                                                                    |
| -------------------------- | --------- | ------------------------------------------------------------------------ |
| Skills (`.claude/skills/`) | Yes       | Behavioral patterns, not code patterns                                   |
| Agents (`.claude/agents/`) | Yes       | Role definitions, not project logic                                      |
| Hooks (`.claude/hooks/`)   | Yes       | Context injection reads from config                                      |
| Workflows                  | Yes       | Process definitions, not implementation                                  |
| `CLAUDE.md`                | **No**    | Generated/merged per project via `/project-init` (`/ai-context-refresh`) |
| `docs/project-config.json` | **No**    | Generated per project via `/project-init` (`/project-config`)            |
| `docs/project-reference/`  | **No**    | Generated per project via `/project-init` (`/scan-all`)                  |

## Optional team work tracking

Use `/task-track` (Codex: `$task-track`) to inspect, assign and maintain exact team work, or open the optional local app. Each member shares proposals through the team's Git process. Acceptance and current verification remain distinct; ordinary work needs no ticket.

Read [manual operations](.claude/skills/task-track/references/manual-operations.md) for semantic skill modes, direct-shell `help`/`catalogue`/`concerns`, exact authority and recovery. Inspection is the default; neither a catalogue nor an advisory prompt notice grants write, proof or acceptance authority. [Linked concerns and publication](.claude/skills/task-track/references/integration-guide.md#exact-linked-concerns) retain the original relationship declarer and require a current pre-publication self-check.

See [configuration and setup](.claude/docs/configuration/README.md#team-work-tracking) for the mergeable example and stable member identities. Core commands require Node18+; the app requires Node20+. Every command except `help` and `identity` installs the pinned runtime package itself on first use (`CK_AUTO_INSTALL_DEPENDENCIES=0` turns that off). Inspect one checkout, then launch the app:

```text
node .claude/skills/task-track/scripts/task-track.cjs inspect --root .
node .claude/skills/task-track/scripts/task-track.cjs serve --root . --write --open --terminal
```

A writable launch uses the checkout's current Git identity with no shared setup; add `--actor <id>` only for a configured custom member, and omit `--write` for a read-only launch. The app runs in a terminal window of its own: close that window or press Ctrl+C there to stop it. Keep the session URL private; drafts are memory-only. `report --root .` generates offline status; `report --root . --ref <local-ref>` pins a local shared commit without fetching. [Linked integration](.claude/skills/task-track/references/integration-guide.md) covers exact upkeep. Unsupported native capability preserves original sources and refuses mutation/rendering.

## Optional Dependencies

Most framework features work with Node.js and Python 3. Some skills require additional tools —
see [INSTALLATION.md](.claude/skills/INSTALLATION.md) for the full dependency list.

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
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,scripts-tests,tech-spec-freshness,feature-registry,hooks-count-drift,hooks-parity,hooks-doc-sync,wf-cycle,sk-proto,residue,sdd,review-validate-coverage,sync-adoption-parity,provenance-markers,sync-divergence
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
