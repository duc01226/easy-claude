<!-- CK:UNIVERSAL-GUIDES v3 -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about… | Default route |
> | --- | --- |
> | A simple, straightforward task with a clear target and low risk | **direct execution** — do it without a workflow |
> | A simple task that needs a few coordinated steps or skills | **custom simple workflow** — sequence only the necessary skills/steps |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `/start-workflow workflow-bugfix` |
> | A non-trivial new feature, capability, or enhancement | **`workflow-feature` workflow** — `/start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause | that skill / workflow |
> | A one-off question, or a truly trivial edit | direct execution |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Analyze whether the task is simple and straightforward before defaulting to a standard workflow.** If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. **For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.** Do not expand to a full standard workflow when a small custom sequence is enough.
> 4. **Use standard workflows for non-trivial bugs and feature/enhancement work** — they force the investigation, tests, and review that risky or broad changes need.
> 5. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `/start-workflow <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the `Skill` tool.
>     - **Custom simple workflow →** create a small task list from the selected skills/steps, then execute them in order.
>     - **Direct route →** build the task list yourself, then proceed.
>   In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->

<!-- CK:WORKFLOW-SKILLS -->
## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflow Skills (53 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill | Use for |
| --- | --- |
| `architecture-design` | [Architecture] Use when designing solution architecture across backend, frontend, deployment, monitoring, testing, and code quality. |
| `brainstorm` | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement. |
| `business-evaluation` | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan. |
| `changelog` | [Documentation] Use when you need to generate or update changelog entries. |
| `code` | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents). |
| `code-simplifier` | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality. |
| `cook` | [Implementation] Use when you need to implement a feature [step by step]. |
| `debug-investigate` | [Fix & Debug] Use when investigating a bug''s root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix. |
| `deep-research` | [Research] Use when deeply researching top sources from web-research. |
| `docs-update` | [Documentation] Use when updating impacted documentation after code, spec, or test changes. |
| `domain-analysis` | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration. |
| `dor-gate` | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming. |
| `e2e-test` | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes. |
| `excalidraw-diagram` | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files. |
| `fix` | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline. |
| `harness-setup` | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors. |
| `idea` | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement. |
| `integration-test` | [Testing] Use when you need to generate or review integration tests. |
| `integration-test-review` | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment. |
| `integration-test-verify` | [Testing] Use when you need to verify integration tests pass after writing and reviewing them. |
| `investigate` | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use /understand for the standalone prompt-driven explainer. |
| `knowledge-review` | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance. |
| `knowledge-synthesis` | [Research] Use when you need to synthesize research findings into structured report using template. |
| `linter-setup` | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates. |
| `pbi-challenge` | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts. |
| `pbi-mockup` | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts. |
| `performance-review` | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, frontend rendering, caching, and distributed paths. |
| `plan` | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework). |
| `plan-review` | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings. |
| `plan-validate` | [Planning] Use when you need to validate a plan with critical questions interview. |
| `prioritize` | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks. |
| `prove-fix` | [Code Quality] Use when you need to prove fix correctness with code proof traces, confidence scoring, and stack-trace-style evidence chains. |
| `refine` | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements. |
| `review-architecture` | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events. |
| `review-artifact` | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}. |
| `review-changes` | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs. |
| `review-domain-entities` | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality. |
| `review-post-task` | [Code Quality] Use when you need two-pass code review for task completion. |
| `scaffold` | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation. |
| `scout` | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase. |
| `security-review` | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection. |
| `seed-test-data` | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. |
| `spec` | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md. |
| `spec-index` | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/**. Never extracts a separate A-E engineering tree. |
| `sre-review` | [Code Quality] Use when reviewing service-layer and API changes for production readiness. |
| `story` | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements. |
| `tech-stack-research` | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect. |
| `test` | [Testing] Use when you need to run tests locally and analyze the summary report. |
| `watzup` | [Utilities] Use when you need to review recent changes and wrap up the work. |
| `web-research` | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation. |
| `why-review` | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts. |
| `workflow-end` | [Process] Use when you need to end the active workflow and clear state. |
| `workflow-review-changes` | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved. |
<!-- /CK:WORKFLOW-SKILLS -->







# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

## Workflow Step Advancement & Parallel Phases

<!-- Universal portable rule shipped by claude-md-init into every project — model-driven workflow progression, identical across Claude, Codex (AGENTS.md whole-file mirror), and Copilot (baked common-protocol), none of which depend on a hook. The runtime workflow-protocol injector and any step-tracker hook are accelerators only. -->

Workflow progression is **model-driven** — your responsibility, not a tool/hook/harness signal:

1. **Advancement.** A step is complete when its work returns — whether run **inline** (a skill/step call) OR dispatched as a **sub-agent** (Agent / Task tool). A sub-agent completion advances the step **identically** to an inline call. Do not wait for any hook or tool event to advance; advance by judgment and your task list.
2. **Parallel phase = all-return barrier.** When steps are declared a parallel-phase group, spawn **ALL** members together (one message), then advance **only after EVERY member returns**. Never start the next step — and never start any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."
3. **Workflow-in-workflow → sub-agent.** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `plans/reports/`. This preserves context containment.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook (e.g. Claude's `workflow-step-tracker.cjs`) is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Codex and Copilot run with no hooks and advance entirely by this rule.

---

**Sections:** [TL;DR](#tldr--what-you-must-know-before-writing-any-code) | [Search First](#search-existing-code-first) | [Task Planning](#task-planning-rules) | [Code Hierarchy](#code-responsibility-hierarchy) | [Naming](#naming-conventions) | [Key Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Evidence](#evidence-based-reasoning--investigation) | [Graph Intelligence](#graph-intelligence-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation)

---

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

**Golden Rules (memorize these):**

1. Hooks use CommonJS (require/module.exports)
2. Hook files read stdin JSON and write to stdout/stderr
3. Shared utilities go in .claude/hooks/lib/
4. Test hooks via node .claude/hooks/tests/test-all-hooks.cjs
5. Each skill is a directory with SKILL.md as entry point
6. Skills may have scripts/, references/, and tests/ subdirectories
7. Follow naming conventions in .claude/docs/skill-naming-conventions.md
8. Agent definitions are markdown files in .claude/agents/
9. Follow patterns in .claude/docs/agents/agent-patterns.md

<!-- /SECTION:golden-rules -->

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and platform decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

> **Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task | Pattern |
|---|---|
| New API endpoint | Controller + CQRS Command |
| Business logic | Command Handler (Application layer) |

<!-- /SECTION:decision-quick-ref -->

## Search Existing Code First

Before writing code, you MUST grep/glob for 3+ similar examples and follow the local pattern over generic framework docs. Cite `file:line` evidence in the plan.

1. Grep/Glob for similar patterns (find 3+ examples).
2. Follow the codebase pattern; don't default to framework docs.
3. Provide `file:line` evidence in the plan.

**Why:** projects have local conventions that differ from framework defaults.
**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps).

---

## First Action Decision (before any tool call)

1. Explicit slash command (e.g. `/plan`, `/cook`) → execute it.
2. Workflow Catalog has a matching workflow → ask via `AskUserQuestion` whether to activate the workflow or run the underlying skill directly.
3. No matching workflow AND prompt would modify files → MUST invoke `/plan <prompt>` first.
4. No matching workflow AND prompt is read-only/conversational → answer directly.

**Modification beats research.** When a prompt mixes research and modification intent, treat it as modification (investigation is a substep of `/plan`).

---

## Task Planning Rules

1. Before editing files, MUST create a `TaskCreate` item per change.
2. Break work into small todos; add a final review todo.
3. Mark todos `completed` immediately after each one finishes. Keep exactly one `in_progress`.
4. On context loss or compaction, call `TaskList` first — resume existing tasks, don't duplicate.
5. Recommendations need traced evidence (`file:line`, grep, graph). No speculation.
6. Recommendations that could break behavior require validation before proposing.

---

## Code Responsibility Hierarchy

Place logic in the lowest appropriate layer to enable reuse and prevent duplication.

```
Entity/Model (Lowest)  >  Service  >  Component/Handler (Highest)
```

| Layer            | Contains                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values |
| **Service**      | API calls, command factories, data transformation                       |
| **Component**    | UI event handling only — delegates all logic to lower layers            |

**Anti-pattern:** logic in a component/handler that belongs in the entity → leads to duplicated code.

---

## Naming Conventions

| Type           | Convention       | Example                                       |
| -------------- | ---------------- | --------------------------------------------- |
| Files          | kebab-case       | `context-injector.cjs`, `session-manager.cjs` |
| Hook files     | `<name>.cjs`     | `.claude/hooks/workflow-router.cjs`           |
| Hook libraries | `<name>.cjs`     | `.claude/hooks/lib/project-config-schema.cjs` |
| Skill dirs     | `<skill-name>/`  | `.claude/skills/code-review/SKILL.md`         |
| Agent files    | `<name>.md`      | `.claude/agents/code-reviewer.md`             |
| Constants      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                             |
| Booleans       | Prefix with verb | `isActive`, `hasPermission`, `canEdit`        |
| Collections    | Plural           | `users`, `items`, `employees`                 |

---

<!-- SECTION:key-locations -->

```
/\.claude/hooks/                         # Runtime hooks for context injection, enforcement, and session management
/\.claude/hooks/lib/                     # Shared utility modules consumed by hooks
/\.claude/skills/                        # Skill definitions for task automation (SKILL.md + scripts)
/\.claude/agents/                        # Agent definitions for specialized subagent roles
/\.claude/scripts/                       # Utility scripts for catalog generation, skill management, and worktree operations
/\.claude/workflows/                     # Workflow definitions for orchestrating multi-step task sequences
/\.claude/docs/                          # Framework documentation — agents, skills, hooks, configuration guides
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
node .claude/hooks/tests/test-all-hooks.cjs   # all
node .claude/hooks/tests/run-all-tests.cjs    # suite
```

<!-- /SECTION:dev-commands -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---

## Evidence-Based Reasoning & Investigation

Don't speculate. Every claim about code behavior — and every recommendation for changes — must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — cite `file:line`, grep results, or framework docs. Don't use "obviously…", "I think…" without proof.
2. **State your confidence** — every recommendation lists its confidence level and the evidence it rests on.
3. **Inference alone isn't enough** — upgrade to code evidence when possible. When unsure, say _"I don't have enough evidence yet."_
4. **Cross-service validation** — check all services before recommending architectural changes.
5. **Graph trace before conclusion** — when investigating code flow, run a graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Graph Intelligence (when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least one graph command on key files before concluding any investigation, plan, or fix verification. Skip only when `.code-graph/graph.db` is absent.
</HARD-GATE>

### Quick CLI Reference

```bash
python .claude/scripts/code_graph trace <file> --direction both --json                    # Full system flow
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json   # File-level overview
python .claude/scripts/code_graph connections <file> --json                               # Structural relationships
python .claude/scripts/code_graph query callers_of <function> --json                      # All callers
python .claude/scripts/code_graph query tests_for <function> --json                       # Test coverage
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json                       # Multiple files at once
python .claude/scripts/code_graph search <keyword> --kind Function --json                 # Find by keyword
```

**Pattern:** Grep finds files > trace reveals system flow > grep verifies details.

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

These skills auto-activate before file edits in their path patterns:

| Path Pattern | Skill / Auto-Context | Pre-Read Files |
|---|---|---|
| `/\.claude/hooks/.*\.cjs$**` | _(auto-context)_ | `.claude/docs/hooks/README.md` |
| `/\.claude/skills/.*SKILL\.md$**` | _(auto-context)_ | `.claude/docs/skills/README.md` |
| `/\.claude/agents/.*\.md$**` | _(auto-context)_ | `.claude/docs/agents/README.md` |

<!-- /SECTION:skill-activation -->

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `docs/adr/0002-canonical-count-metrics.md`. -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->156<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->54<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->29<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->17<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->6<!-- /COUNT -->       |
| Lib modules | <!-- COUNT:lib-modules -->33<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

```
docs/adr/  (2 files)
docs/project-reference/  (15 files)
docs/release/  (1 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

<!-- SECTION:doc-lookup -->

| If user prompt mentions... | Read first |
|---|---|
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation | `docs/project-reference/backend-patterns-reference.md` |
| Frontend patterns, components, stores | `docs/project-reference/frontend-patterns-reference.md` |

<!-- /SECTION:doc-lookup -->
