# Domain Entities Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> easy-claude has no traditional domain entities (no database models, DTOs, or ORM classes).
> The "domain" is the framework's conceptual model — the six entity types described below.

---

## 1. Hook

A CJS module that intercepts Claude Code lifecycle events. Hooks read JSON from stdin, perform processing (session/graph init, safety gating, formatting, tracking), and write to stdout (injected context) or stderr (diagnostics).

**Location:** `.claude/hooks/<name>.cjs`
**Shared libraries:** `.claude/hooks/lib/<name>.cjs`
**Registration:** `.claude/settings.json` under `hooks.<EventType>[]`

### Hook Event Types

| Event              | When it fires                                   | Typical use                                                                       |
| ------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins (`startup`, `resume`, `compact`) | Initialize state, inject CLAUDE.md, recover after compaction                      |
| `SessionEnd`       | Session ends (`clear`, `exit`, `compact`)       | Persist state, cleanup                                                            |
| `PreToolUse`       | Before a tool executes (matched by tool name)   | Block sensitive ops, guard path boundaries, command-syntax guard                  |
| `PostToolUse`      | After a tool executes (matched by tool name)    | Output processing, task tracking, formatting                                      |
| `PreCompact`       | Before context compaction                       | _No hook registered — compaction recovery is static (re-read CLAUDE.md/SKILL.md)_ |
| `UserPromptSubmit` | When user submits a prompt                      | Prompt gating, workflow routing                                                   |
| `Notification`     | Idle/waiting events                             | Desktop notifications                                                             |
| `Stop`             | Agent stops                                     | Notifications                                                                     |

### Key Properties

- **Matcher:** Glob pattern filtering which tools/events trigger the hook (e.g., `Edit|Write|MultiEdit`)
- **Exit code 0:** Non-blocking success; stdout content is injected into context
- **Fail-open design:** Hooks catch errors and exit 0 to avoid blocking the session
- **Dedup markers:** Hooks use marker strings + transcript tail checks to avoid duplicate injections

### Relationships

- Hooks read configuration from **Context Groups** and **Modules** via `project-config-loader.cjs`
- Hooks historically referenced **Skills** for enforcement (e.g., the former `skill-enforcement.cjs` validated skill activation); that enforcement was removed in the de-hooking refactor and skill-activation rules are now carried statically in `CLAUDE.md`
- There is no `SubagentStart` hook — the former `subagent-init-*.cjs` injectors were removed in the de-hooking refactor; **Agents** now carry project context statically in their `.claude/agents/*.md` definition

---

## 2. Skill

A reusable task automation capability. Each skill is a directory with a `SKILL.md` entry point that defines the goal, workflow steps, prerequisites, and rules for a specific task type. Skills are invoked via the `/skill-name` command or the `Skill` tool.

**Location:** `.claude/skills/<skill-name>/SKILL.md`
**Shared protocols:** `.claude/skills/shared/<protocol-name>.md`

### SKILL.md Structure

- **Frontmatter** (YAML): `name`, `version`, `description`
- **Prerequisites:** Files that must be read before execution
- **Quick Summary:** Goal, workflow overview, key rules
- **Workflow Steps:** Numbered steps with output markers (`Step N: ...`)
- **Next Steps:** Recommended follow-up skills
- **Closing Reminders:** Mandatory task planning and review notes

### Skill Variants

| Pattern         | Example                                    | Purpose                                         |
| --------------- | ------------------------------------------ | ----------------------------------------------- |
| Simple          | `debug/SKILL.md`                           | Single markdown entry point                     |
| With scripts    | `docs-seeker/scripts/`                     | Has helper scripts alongside SKILL.md           |
| Shared protocol | `shared/understand-code-first-protocol.md` | Reusable protocol referenced by multiple skills |

### Key Properties

- **`$ARGUMENTS`:** Placeholder in SKILL.md replaced with user-provided arguments at invocation
- **Workflow recommendation:** Most skills suggest activating a full workflow if not already in one
- **Evidence gate:** Implementation skills require `file:line` proof for all claims
- **TaskCreate integration:** Skills create todo tasks before starting work

### Relationships

- Skills reference **Agents** as subagents (e.g., `/plan-execute` calls `tester`, `code-reviewer`, `git-manager`)
- Skills reference shared protocols in `.claude/skills/shared/`
- Skills are orchestrated in sequence by **Workflows**
- Hooks formerly enforced skill rules (e.g., the removed `skill-enforcement.cjs`); skill-specific rules/patterns are now read statically from `docs/project-reference/*` per the `CLAUDE.md` gate (the former per-skill inject hooks were removed in the de-hooking refactor)

---

## 3. Agent

A markdown file defining a specialized subagent role. Agents are spawned via the `Task` tool and carry project context **statically** in their own `.md` system prompt (the former `subagent-init-*.cjs` SubagentStart hooks were removed in the de-hooking refactor — there is no `SubagentStart` hook). Each agent has a focused responsibility (review, test, debug, manage docs, etc.).

**Location:** `.claude/agents/<agent-name>.md`

### Agent Definition Structure

- **Frontmatter** (YAML):
    - `name` — Agent identifier
    - `description` — When to use this agent
    - `tools` — Allowed tools (e.g., `Read, Grep, Glob, Bash, Write, TaskCreate`)
    - `model` — Model selection (`inherit` to use parent's model)
    - `memory` — Memory scope (`project`)
    - `skills` — Skills the agent can activate
    - `maxTurns` — Maximum conversation turns
- **Body** (Markdown): Role description, workflow, rules, output format, checklists

### Key Properties

- **Evidence Gate:** Most agents require `file:line` proof for claims
- **External Memory:** Agents write reports to `plans/reports/` to survive context loss
- **Static context contract:** Each agent `.md` bakes in CLAUDE.md instructions, the lessons read contract, and shared SYNC rule blocks, so a spawned agent (and a hookless harness) gets identical context without any `SubagentStart` hook

### Relationships

- Agents are spawned by **Skills** during workflow execution
- Agents carry context **statically** in their `.md` body (no `SubagentStart` injection hook)
- Agents may activate **Skills** listed in their frontmatter
- Agent types are reflected by the static guidance authored into each `.md` (e.g., `fullstack-developer`, `code-reviewer` carry coding-pattern read contracts)

---

## 4. Workflow

A named sequence of skill steps that orchestrates a multi-step process (feature development, bugfix, refactoring). Workflows define the order of skills, gate conditions between steps, and orchestration patterns (sequential chaining, parallel execution).

**Location:** `.claude/workflows/<workflow-name>.md`

### Key Workflow Files

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `primary-workflow.md`         | Standard dev flow: plan, implement, test, review, docs             |
| `orchestration-protocol.md`   | Patterns for sequential chaining, parallel execution, and recovery |
| `development-rules.md`        | Cross-cutting rules enforced across all workflows                  |
| `documentation-management.md` | Documentation update workflow                                      |

### Key Properties

- **Step gates:** Steps have validation requirements (e.g., tests 100% passing, 0 critical issues, user approval)
- **Skill activation:** Each step maps to a specific skill (`/plan`, `/plan-execute`, `/test`, `/code-review`)
- **Orchestration patterns:** Sequential (plan then code then test), parallel (backend + frontend), recovery (resume from failure)

### Relationships

- Workflows orchestrate **Skills** in a defined sequence
- Skills within workflows spawn **Agents** as subagents
- Workflow **routing and advancement** are model-driven (static catalog in `CLAUDE.md`); no router/tracker hooks
- Residual workflow state may persist to `.claude/.ck-workflow-state.json` (recovery artifact; cleared on `/clear`)

---

## 5. Context Group

A configuration entry in `docs/project-config.json` that maps file path patterns to documentation, rules, and guide documents. Hooks use context groups to determine what contextual information to inject when Claude edits files matching the patterns.

**Location:** `docs/project-config.json` under `contextGroups[]`

### Schema

```json
{
    "name": "hooks-context",
    "pathRegexes": ["\\\\.claude\\\\/hooks\\\\/.*\\.cjs$"],
    "fileExtensions": [".cjs"],
    "guideDoc": ".claude/docs/hooks/README.md",
    "patternsDoc": "docs/project-reference/frontend-patterns-reference.md",
    "stylingDoc": "docs/project-reference/scss-styling-guide.md",
    "designSystemDoc": "docs/project-reference/design-system/README.md",
    "rules": ["Rule text injected into context when editing matching files"]
}
```

### Key Properties

- **`pathRegexes`** (required): Array of regex patterns matching file paths
- **`fileExtensions`** (optional): File extension filter
- **`guideDoc`** (optional): Path to the primary guide document for this context
- **`patternsDoc`** (optional): Path to coding patterns reference
- **`stylingDoc`** / **`designSystemDoc`** (optional): UI-specific references
- **`rules`** (optional): Array of rule strings injected verbatim into context

### Relationships

- Context groups map paths to the `patternsDoc` a reader should open; the runtime hooks that once auto-injected them (`frontend-context.cjs`, `backend-context.cjs`, etc.) were removed in the de-hooking refactor, so the routing is now applied statically via the `CLAUDE.md` project-reference-docs gate
- Context groups reference documentation files that **Skills** and **Agents** read directly
- Context groups complement **Modules** (modules identify _what_ a component is; context groups define _what rules apply_)

---

## 6. Module

A registry entry in `docs/project-config.json` that describes a project component. Modules provide identity metadata (name, kind, description, tags) used by hooks to detect which part of the codebase a file belongs to.

**Location:** `docs/project-config.json` under `modules[]`

### Schema

```json
{
    "name": "hooks",
    "kind": "library",
    "pathRegex": "\\\\.claude\\\\/hooks\\\\/",
    "description": "Runtime hooks for session initialization, safety gates, graph maintenance, and code formatting",
    "tags": ["core", "cjs"],
    "meta": {}
}
```

### Key Properties

- **`name`** (required): Module identifier
- **`kind`** (required): Classification — `library`, `frontend-app`, `backend-service`, etc.
- **`pathRegex`** (required): Regex pattern matching files belonging to this module
- **`description`** (optional): Human-readable purpose
- **`tags`** (optional): Categorization labels (e.g., `core`, `cjs`, `markdown`, `tooling`)
- **`meta`** (optional): Freeform object for module-specific metadata (e.g., `{ "generation": "modern" }`)

### Current Modules

| Module           | Kind    | Description                                               |
| ---------------- | ------- | --------------------------------------------------------- |
| `hooks`          | library | Runtime hooks for session init, safety gates & formatting |
| `hooks-lib`      | library | Shared utility modules consumed by hooks                  |
| `skills`         | library | Skill definitions for task automation                     |
| `agents`         | library | Agent definitions for specialized subagent roles          |
| `scripts`        | library | Utility scripts for catalog generation and management     |
| `workflows`      | library | Workflow definitions for multi-step task orchestration    |
| `docs-framework` | library | Framework documentation                                   |

### Relationships

- Modules are consumed by **Hooks** via `getModuleForPath()` in `project-config-loader.cjs`
- Modules complement **Context Groups** (modules identify the component; context groups define the rules)
- Module metadata (e.g., `meta.generation`) drives conditional behavior in hooks (modern vs. legacy app guidance)

---

## Entity Relationship Summary

```
Workflow ──orchestrates──▶ Skill ──spawns──▶ Agent
    │                        │                  │
    │                        │                  ▼
    ▼                        ▼          Static context in agent .md
Hook (router/tracker)   Hook (enforcement)  (no SubagentStart hook)
    │                        │                  │
    ▼                        ▼                  ▼
Context Group ◀──────── project-config.json ──────▶ Module
```

- **Workflows** chain **Skills** in order with gate conditions
- **Skills** spawn **Agents** as subagents for specialized work
- **Hooks** intercept events to enforce rules, route workflows, and track state (the runtime context-injection hooks were removed in the de-hooking refactor)
- **Context Groups** and **Modules** (both in `project-config.json`) map paths to the `patternsDoc` a reader opens statically per the `CLAUDE.md` gate
