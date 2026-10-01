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

**Path-scoped project rules** — delivered just in time, not inlined here. Groups with rules: `ui-ux-gate`, `ai-feature-gate`, `shipped-tests`, `hooks-context`, `skills-context`, `agents-context`, `scripts-context`, `agent-mirrors-context`.

- The convention hook injects each matching group's full rule text and required docs when a matching file is read or edited, per the group's trigger, through the host's file tools.
- A shell read or edit gets no digest: run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` before the first read, edit or test of that path.
- Before planning a change, run the lookup for each target path; the Skill Activation table below indexes every group's matchers and pre-read docs.
- Apply a group's rules only to files it matches; never promote a path-scoped rule to a global reminder.

<!-- /SECTION:golden-rules -->

### Path → Reference Doc (read BEFORE editing the matched path)

Unprefixed filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` overrides); specs under the business spec root (default `docs/specs`; `specRoots.business.path` overrides), both in `docs/project-config.json`.

Path classes (hooks, skills, agents, scripts, shipped tests, specs, UI, AI features, mirrors) route through the [Automatic Skill Activation](#automatic-skill-activation) table — one path → docs map. Two framework paths have no class there:

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
| Before editing or reviewing code — rules, anti-patterns, checklists. Holds: Code review checklist and rules | `docs/project-reference/code-review-rules.md` |
| A saved project prompt, playbook, or runbook may apply (`/custom-prompt`). Holds: Index of project-specific custom prompts (name, description, triggers) — managed by the /custom-prompt skill | `docs/project-reference/custom-prompts-reference.md` |
| Before running any skill — project overlays layered on it. Holds: Index of project protocol overlays layered onto framework skills (target, scope, description) — written and managed via the /project-skill-protocol skill | `docs/project-reference/skill-protocols-reference.md` |
| UI design — tokens, components, app-to-doc map. Holds: Design system index: app-to-doc mapping, design tokens overview, component inventory | `docs/project-reference/design-system/README.md` |
| Domain concepts, entities, relationships, data ownership — before planning or design. Holds: Framework conceptual domain — Hook, Skill, Agent, Workflow, Context Group, Module | `docs/project-reference/domain-entities-reference.md` |
| Why the architecture or a convention is the way it is — accepted decisions and trade-offs | `docs/adr/` |
| How the AI framework works — hooks, skills, agents, workflows, config (or run `/project-help`) | `.claude/docs/README.md` |
| Framework rules, or why a hook blocked or warned | `.claude/docs/development-rules.md` + `.claude/docs/troubleshooting.md` |

Declared not applicable in `referenceDocs` (skip unless the project adds that stack): `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`, `e2e-test-reference.md`.

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

**Platform (Windows):** invoke Python via `py -3` or `py` — NEVER `python3` (MS Store alias exits 49). Scripts resolve `python` then `py -3` (see `count-drift.test.cjs:40-45`). macOS/Linux: use `python3`.

<!-- /SECTION:dev-commands -->

<!-- SECTION:e2e-testing -->

No E2E guide applies: `e2e-test-reference.md` is declared not applicable in `referenceDocs` (skip unless the project adds that stack).

<!-- /SECTION:e2e-testing -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

When editing files matching these path patterns, pre-read the listed context first: (a shell read or edit gets no digest: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`)

| Path Pattern | Skill / Auto-Context | Pre-Read Files |
|---|---|---|
| `docs/specs/**/*.md` | `spec` | `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, `docs/project-reference/spec-principles.md`, `[[convention:feature-spec@6848b6f6]]` |
| `**/*.test.cjs` | `integration-test` | `docs/project-reference/integration-test-reference.md`, `[[convention:integration-test@d2082cb6]]` |
| `/res/layout[^/]*/[^/]+\.xml$**`, `name:\.(?:html?\|xhtml\|razor\|cshtml\|hbs\|handlebars\|ejs\|pug\|twig\|liquid\|njk\|css\|scss\|sass\|less\|styl\|pcss\|jsx\|tsx\|vue\|svelte\|astro\|xaml\|axml\|storyboard\|xib)$`, `name:\.component\.ts$` · not `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**`, `.agents/**`, `.codex/**`, `.opencode/**` | _(auto-context)_ | `.claude/docs/ux-journey-process.md`, `.claude/docs/design-review-checklist.md`, `.claude/docs/design-knowledge.md`, `.claude/docs/design-review-calibration.md`, `[[convention:ui-ux-gate@21c5f37a]]` |
| `/(?:prompts?\|llm\|rag\|embeddings?\|guardrails?\|mcp)/(?!.*\.(?:png\|jpe?g\|gif\|svg\|pdf\|zip\|bin\|mp[34]\|lock\|map\|min\.js)$)**`, `name:\.prompts?\.[^.]+$\|\.prompty$\|^system[-_.]prompt\|^prompt[-_.]template` · content signals: AI SDK use in 21 code file types · not `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**`, `.claude/**`, `.agents/**`, `.codex/**`, `.opencode/**`, `docs/**`, `**/*.md` | _(auto-context)_ | `.claude/skills/shared/protocols/ai-engineering-gate.md`, `[[convention:ai-feature-gate@f5a18e38]]` |
| `/\.claude/.*\.test\.(cjs\|mjs)$**` | _(auto-context)_ | `[[convention:shipped-tests@5530b47a]]` |
| `/\.claude/hooks/.*\.cjs$**` ext `.cjs` | _(auto-context)_ | `.claude/docs/hooks/README.md`, `[[convention:hooks-context@b966fb4b]]` |
| `/\.claude/skills/.*SKILL\.md$**` ext `.md` | _(auto-context)_ | `.claude/docs/skills/README.md`, `[[convention:skills-context@46e9d8d7]]` |
| `/\.claude/agents/.*\.md$**` ext `.md` | _(auto-context)_ | `.claude/docs/agents/agent-patterns.md`, `[[convention:agents-context@35e24a32]]` |
| `[\/].claude[\/]scripts[\/].*.(cjs\|mjs\|js\|py)$**` ext `.cjs`, `.mjs`, `.js`, `.py` | _(auto-context)_ | `.claude/docs/framework-portability.md`, `[[convention:scripts-context@d014d4e0]]` |
| `^[\/]?.(codex\|agents\|opencode)[\/]**` ext `.md`, `.toml`, `.json`, `.mjs`, `.cjs` | _(auto-context)_ | `.claude/docs/framework-portability.md`, `[[convention:agent-mirrors-context@5e4517ef]]` |
| `**/*` ext `.js`, `.cjs`, `.mjs`, `.jsx`, `.py` · not `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**` | _(auto-context)_ | `docs/project-reference/code-review-rules.md`, `[[convention:general-code@67abfeba]]` |

<!-- /SECTION:skill-activation -->

**Design routing:** SCSS / style files → ui-design skill (`--mode=review` to review them; BEM conventions live there). UI / HTML / CSS files → ui-design skill (canonical design-system doc: tokens, components, BEM).

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `0002-canonical-count-metrics.md` in the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path). -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->102<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->29<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->24<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->19<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->14<!-- /COUNT -->      |
| Lib modules | <!-- COUNT:lib-modules -->45<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

```
docs/adr/  (4 files)
docs/project-reference/  (18 files)
docs/release/  (1 files)
docs/release-notes/  (2 files)
docs/specs/  (14 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

---
