# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

Read the relevant project convention before changing these files.

| Files | Project reference |
|---|---|
| docs/specs/**/*.md | `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, `docs/project-reference/spec-principles.md` |
| **/*.test.cjs | `docs/project-reference/integration-test-reference.md` |
| **/*; extensions: .js, .cjs, .mjs, .jsx, .py; exclude: **/node_modules/**, **/dist/**, **/build/**, **/vendor/**, tmp/**, temp/** | `docs/project-reference/code-review-rules.md` |

<!-- /SECTION:golden-rules -->

### Path → Reference Doc (read BEFORE editing the matched path)

Unprefixed filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` overrides); specs under the business spec root (default `docs/specs`; `specRoots.business.path` overrides), both in `docs/project-config.json`.

The table above maps path classes to their project docs. Two framework paths have no class there:

| Edited path                                                                     | Read first                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflows `.claude/workflows.json`, `.claude/settings.json`, `.claude/.ck.json` | `.claude/docs/README.md` (framework doc map) + `.claude/docs/configuration/README.md`                                                                                     |
| Root context `CLAUDE.md`, its template, `AGENTS.md`                             | `.claude/skills/ai-context-refresh/SKILL.md` — `SECTION:*` blocks are generated from `docs/project-config.json`; `AGENTS.md` is a generated projection, never hand-edited |

---

## Doc Lookup — What to Read When

<!-- SECTION:doc-lookup -->

Match the question or task to a row and read that doc before answering, planning, or editing; every row names a file or folder that exists in this repo.

| If user prompt mentions... | Read first |
|---|---|
| Any project question or task — start here: paths, commands, modules, conventions | `docs/project-config.json` |
| Where a topic is documented — keyword-to-doc routing | `docs/project-reference/docs-index-reference.md` |
| Any non-trivial task — learned project guardrails | `docs/project-reference/lessons.md` |
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Where code lives, modules, stack, setup — before planning or investigating. Holds: Project directory structure and module overview | `docs/project-reference/project-structure-reference.md` |
| Seeding or reviewing development/test data. Holds: Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts | `docs/project-reference/seed-test-data-reference.md` |
| Writing, fixing, or reviewing integration tests. Holds: Integration test patterns and conventions | `docs/project-reference/integration-test-reference.md` |
| Planning, writing, running, fixing, or reviewing performance / load / capacity tests. Holds: Project preferences for performance-test setup, workloads, hardware budgets, reusable helpers, commands and evidence | `docs/project-reference/performance-test-reference.md` |
| Before editing or reviewing code — rules, anti-patterns, checklists. Holds: Code review checklist and rules | `docs/project-reference/code-review-rules.md` |
| Subject knowledge — a domain rule, regulation or chosen practice the task touches (`/knowledge-base`). Holds: Index of the knowledge base (project packs first, then framework packs) — written and managed via the /knowledge-base skill | `docs/project-reference/knowledge-base-reference.md` |
| UI design — tokens, components, app-to-doc map. Holds: Design system index: app-to-doc mapping, design tokens overview, component inventory | `docs/project-reference/design-system/README.md` |
| Writing, running, or reviewing E2E / user-flow tests. Holds: Optional task-track workspace browser tests: isolated public-core fixtures, native waits, portable runner modes and redacted journey evidence | `docs/project-reference/e2e-test-reference.md` |
| Domain concepts, entities, relationships, data ownership — before planning or design. Holds: Framework conceptual domain — Hook, Skill, Agent, Workflow, Context Group, Module | `docs/project-reference/domain-entities-reference.md` |
| Why the architecture or a convention is the way it is — accepted decisions and trade-offs | `docs/adr/` |

Declared not applicable in `referenceDocs` (skip unless the project adds that stack): `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`.

<!-- /SECTION:doc-lookup -->

## Naming Conventions

| Type           | Convention       | Example                                       |
| -------------- | ---------------- | --------------------------------------------- |
| Files          | kebab-case       | `context-injector.cjs`, `session-manager.cjs` |
| Hook files     | `<name>.cjs`     | `.claude/hooks/review-commit-gate.cjs`        |
| Hook libraries | `<name>.cjs`     | `.claude/hooks/lib/project-config-schema.cjs` |
| Skill dirs     | `<skill-name>/`  | `.claude/skills/code-quality-review/SKILL.md` |
| Agent files    | `<name>.md`      | `.claude/agents/code-reviewer.md`             |
| Constants      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                             |
| Booleans       | Prefix with verb | `isActive`, `hasPermission`, `canEdit`        |
| Collections    | Plural           | `users`, `items`, `employees`                 |

---

<!-- SECTION:key-locations -->

```
/\.claude/hooks/                         # Runtime hooks for session initialization, safety gates, graph maintenance, and code formatting
/\.claude/hooks/lib/                     # Shared utility modules consumed by hooks
/\.claude/skills/                        # Skill definitions for task automation (SKILL.md + scripts)
/\.claude/agents/                        # Agent definitions for specialized subagent roles
/\.claude/scripts/                       # Utility scripts for catalog generation, skill/agent management, shared-protocol sync, and code-graph tooling
/\.claude/workflows/                     # Workflow definitions for orchestrating multi-step task sequences
/\.claude/docs/                          # Framework documentation — agents, skills, hooks, configuration guides
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
node .claude/hooks/tests/test-all-hooks.cjs   # hook tests
node .claude/hooks/tests/run-all-tests.cjs    # all suites
```

**Platform:** use `python3` on macOS/Linux and `py -3` on Windows. Integration suites use `.claude/hooks/tests/lib/python-command.cjs`: POSIX probes `python3` then `python`; Windows probes `python` then `py -3`, validating Python 3 (3.10+ for graph tests). Missing PyYAML uses the bounded global attempt and local fallback owned by `.claude/scripts/lib/python_dependencies.py`.

<!-- /SECTION:dev-commands -->

<!-- SECTION:e2e-testing -->

Full guide: [e2e-test-reference.md](docs/project-reference/e2e-test-reference.md) for E2E test patterns, test organization, and execution configuration.

E2E execution profile (read `docs/project-config.json → e2eTesting.execution` for exact project facts):
- **E2E surfaces:** `task-track-workspace` (localRun configured); use each surface's configured localRun owner.
- **E2E authentication:** `fixture`; use configured non-secret references/fixtures or the documented manual-login path, never raw credentials.
- **E2E data:** `additive`; use the configured seed/cleanup policy and record data identity without exposing secrets.
- **E2E browser:** runner `custom Node launcher with Playwright`; headed/visible. Use runner-native waits or an evidenced project helper for observable readiness and postconditions; waits must not weaken the final assertion. Apply the configured 0ms post-action delay only for the project-defined pacing need. A delay is never a readiness or settle signal.
- **E2E evidence:** capture screenshot, console, requests; store under the configured evidence root, read the evidence, and apply the configured redaction policy.
- **E2E convergence:** max 3 attempts; preserve scope, classify failures before edits, review fixes, and escalate when the contract cannot converge.

<!-- /SECTION:e2e-testing -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---


**Design routing:** SCSS / style files → ui-design skill (`--mode=review` to review them; BEM conventions live there). UI / HTML / CSS files → ui-design skill (canonical design-system doc: tokens, components, BEM).

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `0002-canonical-count-metrics.md` in the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path). -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->108<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->38<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->25<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->17<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->16<!-- /COUNT -->      |
| Lib modules | <!-- COUNT:lib-modules -->72<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

```
docs/adr/  (8 files)
docs/knowledge/  (1 files)
docs/knowledge-base/  (2 files)
docs/project-reference/  (20 files)
docs/release/  (1 files)
docs/release-notes/  (2 files)
docs/specs/  (29 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

---

## Project Rules & Context

### Work Tracking

Read `.claude/skills/task-track/references/integration-guide.md` when capturing work, starting implementation, saving code or specs, verifying, handing off or closing work. This project uses linked tracking: keep exact linked items current at actual saved-work checkpoints through the shared core, with one primary saving owner per checkpoint. When no exact item is linked, continue untracked without creating a companion ticket. A passing check or publication records evidence; acceptance still requires an explicit decision.
