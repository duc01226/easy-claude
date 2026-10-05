# Skills Reference

Read this guide when discovering, executing or authoring framework skills. **MUST** execute through the active host; **MUST** keep canonical source ownership separate from runtime paths; **MUST** preserve required gates and report an actual missing capability with evidence.

> <!-- COUNT:skills -->101<!-- /COUNT --> runnable skills across 15+ domains + <!-- COUNT:shared -->15<!-- /COUNT --> shared reference/protocol entries for context-aware AI assistance (`_templates/template-skill` is a source template, not a runnable skill)

## Quick Summary

**Goal:** Discover, execute and author portable skills through the active host while preserving canonical ownership and required gates.

**Summary:** Discover/load → execute required steps → evidence capabilities and gates → edit canonical source → regenerate mirrors. For reviews, triage the complete target, create tasks first and apply the selected review-only or shared fix-loop policy.

## Overview

Skills can be selected from conversation context or explicitly invoked: `/skill-name` in Claude Code, `$skill-name` in Codex. Selection loads instructions; execution follows their required steps through the active host.

```
User: "I need to fix a bug in the employee validation"
       ↓
Skill Detection: "fix", "employee", "validation"
       ↓
Skills Activated: fix, investigate
```

## Framework help and configuration

`framework-config` automatically matches questions about the .claude/.codex/.agents/.opencode framework and requests to configure it. Ask “How do these skills work?” or “Disable heavy auto-trigger for this checkout”. Questions are read-only; requested changes are scoped, merged and validated. Explicit invocation: `/framework-config` or `$framework-config`. It remains eligible under restricted heavy-skill selection.

## How Skills Work

Skill loading activates instructions; execution performs their steps through the active host. Claude Code uses its `Skill` tool. Codex loads the registered `.agents/skills/<name>/SKILL.md` and follows it with available tools; OpenCode uses its native skill loader. A canonical `.claude/**` source read never changes the session's host. Read `.claude/docs/troubleshooting.md` when a discovered skill is incorrectly blocked on a foreign-host tool name.

1. **Detection**: Claude analyzes your message for trigger keywords
2. **Activation**: Matching skills are loaded into context
3. **Enhancement**: Skill knowledge guides the response

Read `.claude/scripts/lib/workflow-skill-contract.cjs` when changing workflow registry entries or their linked invocation guidance. It owns the generated `WORKFLOW-CALLS` block in each workflow skill: every mode's ordered calls, roles, conditional labels, manifest fingerprint and todo-first bootstrap. Run `node .claude/scripts/lib/workflow-skill-contract.cjs --write` to refresh those blocks; the `sync-codex` migration stage also refreshes them before copying skills. Keep detailed quality gates and execution guidance outside the block. `verify-workflow-cycle-compliance.mjs` rejects stale source/mirror blocks and missing registry reverse pointers; changing a condition still requires checking the authored guidance for semantic drift.

## Skill Domains

> Curated highlights — the full catalog has <!-- COUNT:skills -->101<!-- /COUNT --> runnable skills; the tables below list selected skills per domain, not the complete set.

| Domain                                            | Skills | Description                                    |
| ------------------------------------------------- | ------ | ---------------------------------------------- |
| [Development - Backend](#development---backend)   | 0      | Project-specific backend patterns              |
| [Development - Frontend](#development---frontend) | 2      | Components, forms, state, styling, design      |
| [Architecture](#architecture)                     | 4      | Architecture, performance, security            |
| [Debugging/Testing](#debuggingtesting)            | 3      | Test generation, test specs                    |
| [Documentation](#documentation)                   | 3      | Docs, feature docs, release notes              |
| [Git/Workflow](#gitworkflow)                      | 5      | Commits, pull requests, code review, gates     |
| [Code Quality](#code-quality)                     | 10     | Graph-based code analysis, blast radius, sync  |
| [Planning/Research](#planningresearch)            | 5      | Plans, research, implementation, investigation |
| [Context/Memory](#contextmemory)                  | 2      | Code cleanup, learning                         |
| [Team Collaboration](#team-collaboration)         | 6      | Test specs, UX design specs, backlog shaping   |
| [Web/Frameworks](#webframeworks)                  | 2      | Package updates, markdown                      |
| [Document Processing](#document-processing)       | 3      | PDF, DOCX, Markdown conversions, HTML export   |
| [Utility](#utility)                               | 1      | Skill creation                                 |

**Additional:** Shared reference/protocol entries (<!-- COUNT:shared -->15<!-- /COUNT -->: files plus the generated `protocols/` projection) -- see [Shared Protocols](#shared-protocols-sync-bodies-and-guides)

---

## Development - Backend

See `backend-patterns-reference.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path — for project-specific backend patterns.

---

## Development - Frontend

| Skill                   | Triggers                           | Description                         |
| ----------------------- | ---------------------------------- | ----------------------------------- |
| `ui-design`                | UI, design, screenshot, UI review  | UI implementation (multi-mode/lane) and `--mode=review` UI review |
| `web-design-guidelines` | accessibility, WCAG, visual review | UI compliance review                |

See `frontend-patterns-reference.md` in the project-reference docs root for project-specific frontend patterns.

---

## Architecture

| Skill                | Triggers                              | Description                                       |
| -------------------- | ------------------------------------- | ------------------------------------------------- |
| `architecture` | architecture design, architecture review, scalability grade, architecture audit | Modes `--mode=design` (solution architecture + ADRs), `--mode=review` (compliance review), `--mode=scalability` (`/20` scale grade), `--mode=full` (whole-project audit) |
| `performance-review` | performance, optimization, bottleneck | Performance tuning + architecture-altitude review |
| `security-audit`    | security, vulnerabilities             | Security analysis                                 |
| `ai-engineering-review` | AI feature review, LLM review, prompt review, agent review, RAG review | Review a plan or change that calls a model against the AI-engineering protocol (`--mode=code\|plan`, `--report-only`) |

---

## Debugging/Testing

| Skill                     | Triggers                                                              | Description                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e-test`                | E2E, Playwright, browser test                                         | End-to-end test authoring and maintenance                                                                                                        |
| `e2e-demo`                | E2E demo video, screenshots, commit demo, PR demo                      | Screenshot storyboards exported to MP4/GIF with every relevant case mapped to results and timestamps                                              |
| `experience-review`       | user experience, acceptance, baseline                                 | Exercise and inspect applicable observable output; preserve expectations until explicit acceptance                                               |
| `spec [mode=tests]`       | test specification, QA spec, test strategy, TC-IDs, test cases        | Unified test case writer — generates TC-{FEATURE}-{NNN} specs from PBIs and feature docs                                                         |
| `spec [mode=sync]`        | sync test specs, update dashboard, reverse sync, sync to feature docs | Dashboard sync mode — syncs TCs from feature docs Section 8 to the business spec root (sync mode retires when dashboards are removed in Phase 7) |
| `integration-test --mode=review` | integration test review, assertion quality, test gate review, TC gate | Review-only or --fix-loop through eight quality gates covering intended, observable, repeatable and source/spec-aligned behavior                                  |
| `integration-test --mode=verify` | run integration tests, verify tests pass, test runner, dotnet test    | Run integration tests after writing/reviewing them — reads project-config.json for project-specific run guidance                                 |

---

## Documentation

| Skill           | Triggers                                                 | Description                                                                |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `web-research`  | find docs, library docs                                  | Source discovery and triage (Context7 MCP optional accelerator)            |
| `spec`          | business docs, module docs, feature docs, feature readme | Business/feature documentation (single canonical Feature Spec per feature) |
| `release-doc` | release notes, git history                               | Release notes from git commits (tag-to-tag)                                |

---

## Git/Workflow

| Skill                         | Triggers                                                | Description                                          |
| ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `commit`                      | commit, stage, save changes                             | Git commits; adds a `Fix-Origin:` trailer only when `commit.fixOriginTrailer` is `true` in `docs/project-config.json` (new commits only) |
| `pull-request`                | create PR, open PR, finish PR, ready to merge, mark ready | Take the branch to a ready-to-merge PR: branch at the latest `pullRequest.targetBranch` (default `main`) — new branch when already merged, rebase when unpushed and behind, ask for local tests and whole-branch review (including explicit Skip), run the selected gates, commit, push, create or ready the PR, loop CI to green — in the main session |
| `code-quality-review`                 | review, feedback, PR review                             | Code review                                          |
| `why-review`                  | why, design rationale, plan validation, alternatives    | Validate design rationale in plan files              |
| `production-readiness-review` | sre, production, observability, reliability, ops review | Production readiness scoring for service/API changes |

---

## Code Quality

| Skill                | Triggers                                                                                                                        | Description                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `graph-code`         | build graph, sync graph, update graph, refresh graph after pull, who calls, what imports, tests for, graph query, trace flow, blast radius, impact analysis, connect api, export graph, JSON dump, export Mermaid, graph diagram, visualize graph | Code knowledge graph via `--mode={build\|query\|trace\|blast-radius\|connect-api\|export}`: build/update/sync (`--scope={full\|update\|sync}`, Tree-sitter + SQLite; installs the Python graph tooling on first use; refused while `hooks.codeGraph.enabled` is `off`), relationship queries, system-flow traces, blast radius of current changes, frontend-to-backend API matching, JSON exports (`--format=json`, default) and single-file Mermaid diagrams (`--format=mermaid`) |
| `linter-setup`       | linter setup, formatter setup, pre-commit, quality gate                                                                         | Configure stack-appropriate lint/format/type-check quality tooling                                               |
| `harness-setup`      | harness setup, quality harness, feedback sensors                                                                                | Set up feedforward guides and feedback sensors for coding workflows                                              |

---

## Planning/Research

| Skill         | Triggers                           | Description                                                           |
| ------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `plan`        | plan, strategy, approach, research, review plan, analyze plan, validate plan, execute plan | Concise implementation planning with a task-derived Quality Gates & Concerns Checklist; `--mode=review` reviews intent, necessity, trade-offs and proof, with optional --fix-loop; `--mode=validate` critical-questions validation; `--mode=execute` code and test an existing plan |
| `feature`     | implement, add, create, build      | Feature development                                                   |
| `investigate` | how does, explain, trace           | Code exploration                                                      |

---

## Context/Memory

| Skill             | Triggers                                         | Description                  |
| ----------------- | ------------------------------------------------ | ---------------------------- |
| `code-simplifier` | simplify, refine, clarity                        | Code cleanup                 |
| `learn`           | remember this, always do, patterns, list learned, rule for a skill, when doing X always | Pattern learning and viewing; skill-specific rules route to `project-skill-protocol` overlays; broad short project rules route to the root `CLAUDE.md` project-rules section (then `sync-codex`) |
| `framework-config` | framework questions, .claude/.codex skills configuration, hooks, workflow settings | Explain and show settings; merge and validate requested team/user/checkout changes; reset one preference |

---

## Team Collaboration

| Skill               | Triggers                                                                                         | Description                               |
| ------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `spec [mode=tests]` | test plan, test cases, coverage, automation                                                      | Test specification and case generation    |
| `design-spec`       | UI specification, component spec, layout spec, wireframe, mockup, user flow, accessibility audit | Design specification documents, UX design |
| `idea`              | capture idea, new idea, add to backlog                                                           | Idea capture and structuring              |
| `pbi`               | refine idea, convert to PBI, acceptance criteria, user story, vertical slice, split story, interactive mockup, PBI challenge, artifact review, Definition of Ready | PBI lifecycle by `--mode`: refine, story, mockup, challenge, review, dor |
| `prioritize`        | RICE score, MoSCoW, value-effort matrix                                                          | Backlog prioritization frameworks         |

---

## Web/Frameworks

| Skill             | Triggers              | Description     |
| ----------------- | --------------------- | --------------- |
| `package-upgrade` | upgrade, dependencies | Package updates |

---

## Document Processing

| Skill          | Triggers                                                         | Description                                                |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `docx-convert` | DOCX to markdown, Word conversion, markdown to DOCX, Word export | Word ⇄ Markdown via `--to {markdown\|docx}`                |
| `html-export`  | HTML screenshot, render check, deck to PDF, animation to MP4/GIF | HTML → PNG/PDF/MP4/GIF via `--to {png\|pdf\|mp4\|gif}`     |
| `pdf-convert`  | PDF to markdown, PDF extraction, markdown to PDF, PDF export     | PDF ⇄ Markdown via `--to {markdown\|pdf}`                  |

---

## Utility

| Skill           | Triggers                | Description       |
| --------------- | ----------------------- | ----------------- |
| `skill-creator` | create skill, new skill | Create new skills |

---

## Shared Protocols (SYNC bodies and guides)

Shared protocols follow `SYNC:shared-protocol-duplication-policy`. Skill entrypoints, including `changes-review`, `code-quality-review`, `why-review` and `workflow-review-changes`, carry one guide line per applicable protocol in `PROTOCOL-GUIDES`. Hooks deliver full text from `.claude/skills/shared/protocols/`; when text is absent, including after delivery overflow, read its published full source before acting. The live `inlineSkills` list is empty. Agents and mode-reference SYNC bodies remain full text; every fresh reviewer prompt still receives the complete 11-body review template VERBATIM. Role reminders remain in each carrier. Universal protocols are hook-only: no skill holds their body, reminder, guide or pointer. All SYNC content is authored in `.claude/skills/shared/sync-inline-versions.md`.

**Why hybrid?** A rule in context is followed more reliably than one the model must choose to read, so hooks put the full text in context when the skill loads; full bodies stay only where hook delivery cannot reach the reader or carry the text.

**To update a protocol:** Edit `sync-inline-versions.md` first, then run `/sync-skills-shared-protocols` (it propagates every body and rebuilds the projection with `node .claude/scripts/build-protocol-projection.cjs`); `grep SYNC:protocol-name` for copies outside the tool's scope.

---

## Skill File Structure

Each skill is located at `.claude/skills/{skill-name}/`:

```
.claude/skills/{skill-name}/
|-- SKILL.md           # Main skill definition
+-- references/        # Supporting documentation (progressive disclosure)
    |-- topic-1.md
    +-- topic-2.md

### SKILL.md Structure

```markdown
---
name: skill-name
version: 1.0.0
description: '[Domain] Use when... (semantic trigger keywords belong in this description)'
disable-model-invocation: false # true = manual-only: the model never invokes it, `/skill-name` still works
---

## Overview

[Skill purpose]

## Patterns

[Implementation patterns]

## Examples

[Usage examples]

## Anti-Patterns

[What to avoid]
```

Set `disable-model-invocation: true` on a skill the model must never start on its own, such as a `manual`-tier workflow wrapper. Claude drops its description from context but still runs `/skill-name`. Codex ignores the flag, so the Codex sync writes `agents/openai.yaml` with `policy.allow_implicit_invocation: false` into that skill's mirror, where `$skill-name` still runs it.

**Manual-only skills shipped here** (list them with `grep -l "^disable-model-invocation: true" .claude/skills/*/SKILL.md`):

- **Command-only utilities** — `custom-agent`, `custom-prompt`, `docx-convert`, `git-developer-performance`, `pdf-convert`, `playwright-cli`, `presentation-builder`, `project-help`, `release-doc`, `remotion`, `scan-codebase-health`, `skill-creator`, `sync-skills-shared-protocols`. No workflow step, agent `skills:` preload, `Skill(` call or hook starts any of them; the user runs `/name` (Claude) or `$name` (Codex). A file read by path (for example a workflow's `preActions.readFiles`) still works.
- **Mirror syncs** — `sync-opencode` rewrites a generated folder, so only the user starts it. `sync-codex` is model-callable: run it once, after the `.claude/**` source is final, to regenerate `.agents/`, `.codex/` and `AGENTS.md`.
- **Other** — `product-roadmap`. (No workflow wrapper ships manual-only: every framework workflow can be selected by the AI.)

`commit` and `learn` stay model-callable by decision. `content-presence.test.cjs` (TC-ADS-008) fails when a command-only utility loses the flag or `commit`/`learn` gains it, and `migrate-claude-to-codex.test.mjs` (TC-ADS-009) checks the Codex policy file for each utility.

---

## Command-Skill Relationships

Skills are often activated alongside commands:

| Command              | Primary Skills Activated               |
| -------------------- | -------------------------------------- |
| `/feature-implement` | `feature`, `plan`, `spec [mode=tests]` |
| `/fix`               | `investigate --mode=debug`             |
| `/plan`              | `plan` (`--mode=review` is explicit opt-in) |
| `/review`            | `code-quality-review`                          |
| `/test`              | `spec [mode=tests]`, `e2e-test`        |
| `/idea`              | `idea`                                 |
| `/pbi --mode=refine` | `pbi --mode=refine`                    |
| `/pbi --mode=story`  | `pbi --mode=story`                     |
| `/design-spec`       | `design-spec`                          |
| `/spec [mode=tests]` | `spec [mode=tests]`                    |
| `/pbi --mode=dor`          | `pbi --mode=dor`                             |
| `/prioritize`        | `prioritize`                           |

---

## Authoring Rule — No Meta-Log

> A `SKILL.md` is read as live instruction. Write only the CURRENT actionable truth. Do NOT add change-history, migration rationale, or provenance — "formerly auto-injected", "removed in the … refactor", "now embedded here", "used to be hook-injected". It carries zero instruction value and dilutes the directive the agent acts on. Change history belongs in git / `CHANGELOG.md` / the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path) / `tmp/reports/**`. Keep the actionable scope (the path/trigger a block applies to, SYNC-mirror notes); drop the historical clause. State what IS, not what changed.

## Creating Custom Skills

Use `/skill-creator` to create a new skill:

```bash
/skill-creator "my-custom-skill" "Description of what it does"
```

---

## Related Documentation

- `backend-patterns-reference.md` (project-reference docs root) - Backend patterns
- `frontend-patterns-reference.md` (project-reference docs root) - Frontend patterns
- [../skill-naming-conventions.md](../skill-naming-conventions.md) - Naming conventions & shared module patterns

- [../hooks/README.md](../hooks/README.md) - Hooks overview and lessons system

---

_Source: `.claude/skills/` | <!-- COUNT:skills -->101<!-- /COUNT --> runnable skills across 15+ domains + <!-- COUNT:shared -->15<!-- /COUNT --> shared reference/protocol entries (the `_templates/template-skill` source is excluded from runtime discovery)_

## Closing Reminders

**MUST** discover the selected skill, load its instructions and execute its required steps through the active host. **MUST** edit canonical `.claude/**` source and regenerate mirrors; a source read never changes hosts. **MUST** keep gates intact and evidence any genuinely missing capability; a foreign-host tool name alone is not a blocker. **Goal:** Discover/load → execute → verify gates/capabilities → author canonical source → regenerate mirrors. **MUST ATTENTION** prepared reviews retain actual mode, active document union and full sources through capture, replay and recheck.
