# Feature Docs Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> easy-claude is a Claude Code enhancement framework. Its "features" are hooks, skills, agents,
> and workflows. All feature documentation lives under `.claude/docs/`.

## Documentation Structure

```
.claude/docs/
|-- README.md                          Navigation hub, quick links, doc map
|-- quick-start.md                     5-minute onboarding guide
|-- claude-ai-agent-framework-guide.md Architecture & best practices deep-dive
|-- universal-setup-guide.md           Adopting .claude into any project
|-- team-collaboration-guide.md        PO, BA, QA, QC, UX, PM workflow guide
|-- skill-naming-conventions.md        Naming rules and prefix guide
|-- anti-hallucination-patterns.md     Evidence-based reasoning examples (deep-dive)
|-- AI-DEBUGGING-PROTOCOL.md           Mandatory bug analysis protocol
|-- troubleshooting.md                 Consolidated troubleshooting guide
|
|-- hooks/                             Hook system documentation
|   |-- README.md                      34 hooks + 25 lib modules catalog
|   |-- architecture.md                Event-driven system architecture diagrams
|   |-- extending-hooks.md             Guide for creating custom hooks
|   +-- external-memory-swap.md        Post-compaction swap file recovery
|
|-- skills/                            Skill system documentation
|   |-- README.md                      231 skills across 15+ domains catalog
|   +-- pressure-testing-guide.md      Validate skills change AI behavior
|
|-- agents/                            Agent system documentation
|   |-- README.md                      28 specialized subagents catalog
|   +-- agent-patterns.md             When/how to use each agent type
|
|-- configuration/                     Configuration guides
|   |-- README.md                      Config files overview (settings, .ck, workflows, MCP)
|   |-- settings-reference.md          Complete settings.json reference
|   |-- output-styles.md               Coding levels 0-5 explained
|   +-- figma-setup.md                 Figma MCP server setup
|
+-- team-artifacts/templates/          Artifact templates for team workflows
    |-- idea-template.md               Idea capture template
    |-- pbi-template.md                Product Backlog Item template
    |-- user-story-template.md         User story template
    |-- design-spec-template.md        Design specification template
    |-- test-spec-template.md          Test specification template
    +-- template-validation.md         Template validation rules
```

## Key Documentation by Category

### Getting Started

| Document                             | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `quick-start.md`                     | 5-minute onboarding for new users       |
| `universal-setup-guide.md`           | Adopt the framework into any project    |
| `claude-ai-agent-framework-guide.md` | Full architecture and design principles |

### Core Feature Docs (Hooks, Skills, Agents)

| Document                           | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `hooks/README.md`                  | Hook catalog, session lifecycle, lessons system, testing |
| `hooks/architecture.md`            | Event-driven hook system architecture                    |
| `hooks/extending-hooks.md`         | Creating custom hooks from scratch                       |
| `hooks/external-memory-swap.md`    | Swap file system for post-compaction recovery            |
| `skills/README.md`                 | Full skill catalog by domain with triggers               |
| `skills/pressure-testing-guide.md` | Validate skill effectiveness under pressure              |
| `agents/README.md`                 | Agent catalog, selection guide, usage patterns           |
| `agents/agent-patterns.md`         | Detailed patterns and composition strategies             |

### Configuration

| Document                              | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `configuration/README.md`             | Overview of all config files and their roles |
| `configuration/settings-reference.md` | Complete settings.json field reference       |
| `configuration/output-styles.md`      | Coding levels 0-5 adaptive communication     |
| `configuration/figma-setup.md`        | Figma MCP server integration setup           |

### AI Behavior & Quality

| Document                         | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `anti-hallucination-patterns.md` | Evidence-based reasoning examples and verification   |
| `AI-DEBUGGING-PROTOCOL.md`       | Mandatory protocol for bug analysis and code removal |
| `skill-naming-conventions.md`    | Naming rules for skills (kebab-case, max 64 chars)   |

### Team & Collaboration

| Document                      | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `team-collaboration-guide.md` | Multi-role workflow guide (PO, BA, QA, QC, UX, PM) |
| `team-artifacts/templates/`   | 6 templates for ideas, PBIs, stories, specs, tests |
| `troubleshooting.md`          | Common issues and solutions                        |

## How Docs Are Organized

1. **README.md files** act as navigation hubs within each subdirectory, containing catalogs and cross-references.
2. **Subdirectories** group docs by framework feature: `hooks/`, `skills/`, `agents/`, `configuration/`.
3. **Root-level docs** cover cross-cutting concerns (onboarding, troubleshooting, AI protocols, collaboration).
4. **Templates** in `team-artifacts/templates/` provide standardized formats for team workflow artifacts.

## Convention for Adding New Feature Docs

1. Place docs in the appropriate subdirectory (`hooks/`, `skills/`, `agents/`, `configuration/`).
2. If a new subdirectory is needed, create a `README.md` as its navigation hub.
3. Use kebab-case file naming (e.g., `my-new-feature.md`).
4. Add the new doc to the parent `README.md` navigation table.
5. Update `.claude/docs/README.md` document map if it is a significant addition.
6. Keep docs concise -- prefer linking to source code over duplicating it.
