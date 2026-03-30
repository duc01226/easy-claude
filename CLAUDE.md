# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

**Sections:** [TL;DR](#tldr) | [Search First](#mandatory-search-existing-code-first) | [Task Planning](#important-task-planning-rules-must-follow) | [Code Hierarchy](#code-responsibility-hierarchy-critical) | [Naming](#naming-conventions) | [Key Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Evidence](#evidence-based-reasoning--investigation-protocol-mandatory) | [Graph Intelligence](#graph-intelligence-mandatory-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation-mandatory)

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

## MANDATORY: Search Existing Code FIRST

**Before writing ANY code:**

1. **Grep/Glob search** for similar patterns (find 3+ examples)
2. **Follow codebase pattern**, NOT generic framework docs
3. **Provide evidence** in plan (file:line references)

**Why:** Projects have conventions that differ from framework defaults.

**Enforced by:** Feature/Bugfix/Refactor workflows (scout > investigate steps)

---

## FIRST ACTION DECISION (Before ANY tool call)

```
1. Explicit slash command? (e.g., /plan, /cook) -> Execute it
2. Detect nearest matching workflow from the Workflow Catalog
3. ALWAYS ask user via AskUserQuestion to confirm: activate workflow or execute directly
4. FALLBACK -> MUST invoke /plan <prompt> FIRST
```

**CRITICAL: Modification > Research.** If prompt contains BOTH research AND modification intent, **modification workflow wins** (investigation is a substep of `/plan`).

---

## IMPORTANT: Task Planning Rules (MUST FOLLOW)

1. **MANDATORY task creation for file-modifying prompts** — If the prompt could result in ANY file changes, you MUST create `TaskCreate` items BEFORE making changes.
2. **Always break work into many small todo tasks** — granular tasks prevent losing track of progress
3. **Always add a final review todo task** to review all work done
4. **Mark todos as completed IMMEDIATELY** after finishing each task
5. **Exactly ONE task in_progress at a time**
6. **On context loss/compaction**, ALWAYS call `TaskList` FIRST — resume existing tasks, do NOT create duplicates
7. **No speculation or hallucination** — always answer with proof
8. **Evidence-based recommendations** — complete investigation before recommending changes
9. **Breaking change assessment** — Any recommendation that could break functionality requires validation

---

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication.**

```
Entity/Model (Lowest)  >  Service  >  Component/Handler (Highest)
```

| Layer            | Contains                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values |
| **Service**      | API calls, command factories, data transformation                       |
| **Component**    | UI event handling ONLY — delegates all logic to lower layers            |

**Anti-Pattern**: Logic in component/handler that should be in entity > leads to duplicated code.

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
node .claude/hooks/tests/run-all-tests.cjs                           # Run full test suite
python .claude/scripts/generate_catalogs.py --skills                 # Generate skills catalog
python .claude/scripts/generate_catalogs.py --commands               # Generate commands catalog
```

<!-- /SECTION:dev-commands -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---

## Evidence-Based Reasoning & Investigation Protocol (MANDATORY)

Speculation is FORBIDDEN. Every claim about code behavior, every recommendation for changes, must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence. When unsure: _"I don't have enough evidence yet."_
4. **Cross-service validation** — Check ALL services before recommending architectural changes.
5. **Graph trace before conclusion** — When investigating code flow, you MUST run graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Graph Intelligence (MANDATORY when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least ONE graph command on key files before concluding any investigation,
creating any plan, or verifying any fix. Proceeding without graph evidence is FORBIDDEN.
Skip only if `.code-graph/graph.db` does not exist.
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

## Automatic Skill Activation (MANDATORY)

<!-- SECTION:skill-activation -->

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

| Path Pattern                 | Skill / Auto-Context | Pre-Read Files                  |
| ---------------------------- | -------------------- | ------------------------------- |
| `.claude/hooks/**/*.cjs`     | _(auto-context)_     | `.claude/docs/hooks/README.md`  |
| `.claude/skills/**/SKILL.md` | _(auto-context)_     | `.claude/docs/skills/README.md` |
| `.claude/agents/**/*.md`     | _(auto-context)_     | `.claude/docs/agents/README.md` |

<!-- /SECTION:skill-activation -->

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
