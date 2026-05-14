# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

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

| Task                  | Pattern                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| New hook              | `.claude/hooks/<name>.cjs` — CJS, reads stdin JSON, writes stdout/stderr    |
| Shared hook utility   | `.claude/hooks/lib/<name>.cjs` — extracted module for reuse across hooks    |
| New skill             | `.claude/skills/<skill-name>/SKILL.md` + optional `scripts/`, `references/` |
| New agent             | `.claude/agents/<agent-name>.md` — markdown definition                      |
| New workflow          | `.claude/workflows.json` entry + skill definitions for each step            |
| Test hooks            | `node .claude/hooks/tests/test-all-hooks.cjs`                               |
| Project config change | Update `docs/project-config.json`, validate with schema                     |

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

## Key File Locations

```
.claude/hooks/              # Runtime hooks (CJS modules) — context injection, enforcement, session mgmt
.claude/hooks/lib/          # Shared hook utility modules
.claude/hooks/tests/        # Hook test suites
.claude/skills/             # Skill definitions (SKILL.md + scripts/)
.claude/agents/             # Agent definitions (markdown)
.claude/scripts/            # Utility scripts — catalog gen, code graph, skill mgmt
.claude/workflows/          # Workflow definitions and orchestration
.claude/docs/               # Framework documentation
docs/project-config.json    # Project config consumed by hooks at runtime
docs/project-reference/     # Reference docs populated by /scan-* skills
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

## Development Commands

```bash
node .claude/hooks/tests/test-all-hooks.cjs                          # Run all hook tests
node .claude/hooks/tests/run-all-tests.cjs                           # Run full test suite (includes count-drift)
python .claude/scripts/generate_catalogs.py --skills                 # Generate skills catalog
python .claude/scripts/generate_catalogs.py --commands               # Generate commands catalog
python .claude/scripts/generate_catalogs.py --inject-counts <file>   # Refresh marker counts in <file>
python .claude/scripts/generate_catalogs.py --check-counts <file>    # CI drift check (exit 1 on mismatch)
```

> **If `count-drift` test fails in CI:** run `--inject-counts` against the offending file (path appears in the DRIFT line on stderr), commit the regenerated digits. Canonical metrics live in `docs/adr/0002-canonical-count-metrics.md`.

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

| Path Pattern                 | Skill / Auto-Context | Pre-Read Files                  |
| ---------------------------- | -------------------- | ------------------------------- |
| `.claude/hooks/**/*.cjs`     | _(auto-context)_     | `.claude/docs/hooks/README.md`  |
| `.claude/skills/**/SKILL.md` | _(auto-context)_     | `.claude/docs/skills/README.md` |
| `.claude/agents/**/*.md`     | _(auto-context)_     | `.claude/docs/agents/README.md` |

<!-- /SECTION:skill-activation -->

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `docs/adr/0002-canonical-count-metrics.md`. -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->253<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->64<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->28<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->37<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->3<!-- /COUNT -->       |
| Lib modules | <!-- COUNT:lib-modules -->29<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

## Documentation Index

```
docs/project-config.json           # Project configuration (hooks read this at runtime)
docs/project-reference/            # 12 reference docs populated by /scan-* skills
  project-structure-reference.md   # Directory tree, module overview
  domain-entities-reference.md     # Hook, Skill, Agent, Workflow domain model
  integration-test-reference.md    # Integration test conventions
  code-review-rules.md             # Code review checklist
  feature-docs-reference.md        # Business feature doc index
```

<!-- /SECTION:doc-index -->

<!-- SECTION:doc-lookup -->

### Doc Lookup Guide

| If user prompt mentions...        | Read first                                              |
| --------------------------------- | ------------------------------------------------------- |
| Hook development, hook patterns   | `.claude/docs/hooks/README.md`                          |
| Skill creation, skill structure   | `.claude/docs/skills/README.md`                         |
| Agent patterns, agent definitions | `.claude/docs/agents/README.md`                         |
| Domain model, entities            | `docs/project-reference/domain-entities-reference.md`   |
| Project structure, modules        | `docs/project-reference/project-structure-reference.md` |
| Code review rules                 | `docs/project-reference/code-review-rules.md`           |
| Integration testing               | `docs/project-reference/integration-test-reference.md`  |

<!-- /SECTION:doc-lookup -->
