# Claude Code Documentation

> Comprehensive AI-assisted development documentation for YourProject

## Quick Links

| Goal                           | Document                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **New to Claude Code?**        | [quick-start.md](./quick-start.md) - 5-minute onboarding                                                                           |
| **Need a skill?**              | [skills/README.md](./skills/README.md) - <!-- COUNT:skills -->126<!-- /COUNT --> skills catalog                                                                        |
| **Building a feature?**        | [skills/README.md](./skills/README.md) + project-reference root patterns                                                           |
| **Verifying user experience?** | [configuration/experience-verification.md](./configuration/experience-verification.md) - portable evidence and acceptance contract |
| **Understanding hooks?**       | [hooks/README.md](./hooks/README.md) - <!-- COUNT:hooks -->23<!-- /COUNT --> top-level hook files deep-dive                                                           |
| **Understanding workflows?**   | `.claude/workflows.json` canonical catalog plus opt-in prompt injection - <!-- COUNT:workflows -->20<!-- /COUNT --> workflows                                             |
| **Configuring Claude?**        | [configuration/README.md](./configuration/README.md)                                                                               |
| **Team collaboration?**        | [team-collaboration-guide.md](./team-collaboration-guide.md) - PO, BA, QA, QC, UX workflows                                        |
| **Graph intelligence?**        | [code-graph-mechanism.md](./code-graph-mechanism.md) - How structural code analysis works                                          |
| **Setup graph?**               | [code-graph-setup.md](./code-graph-setup.md) - Install Python deps + build graph                                                   |

## Documentation Map

Project-owned branches below sit at their DEFAULT roots; `docs/project-config.json` (`specRoots` / `docsRoots`) relocates them.

```
.claude/docs/
|-- README.md                 <- You are here (Navigation hub)
|-- quick-start.md            5-minute onboarding guide
|
|-- skills/                   126 skills across 15+ domains
|   |-- README.md             Skills overview + full catalog
|   +-- (patterns)           → docs/project-reference/
|
|-- hooks/                    23 top-level hook files, 46 lib modules
|   |-- README.md             Hooks overview, lessons system, session lifecycle
|   +-- extending-hooks.md    How to create custom hooks
|
|-- code-graph-mechanism.md  How the structural knowledge graph works
|-- code-graph-setup.md      Setup guide for Python + Tree-sitter
|-- development-rules.md     Dev rules extracted from CLAUDE.md (static reference)
|-- anti-hallucination-patterns.md  AI failure mode catalog + remediation patterns
|
|-- agents/                   Subagent configurations
|   |-- README.md             Agents overview
|   +-- agent-patterns.md     When/how to use each agent
|
|-- configuration/            All configuration files
|   |-- README.md             Config overview
|   |-- settings-reference.md settings.json reference
|   |-- output-styles.md      Custom output styles
|   +-- experience-verification.md  Observable-surface evidence and acceptance
|
+-- troubleshooting.md        Consolidated troubleshooting guide
```

## Quick Decision Trees

### "I need to..."

| Task                       | Command                              | Skill                         |
| -------------------------- | ------------------------------------ | ----------------------------- |
| Implement a feature        | `/feature-implement`                 | `feature-implement`           |
| Fix a bug                  | `/fix`                               | `debug-investigate`           |
| Create a PR                | `/commit --push`                     | `commit`                      |
| Understand code            | `/investigate`                       | `investigate`                 |
| Plan implementation        | `/plan`                              | `plan`                        |
| Run tests                  | `/test`                              | `test`                        |
| Review code                | `/review`                            | `code-review`                 |
| Debug issues               | `/debug-investigate`                 | `debug-investigate`           |
| Create user story          | `/story`                             | `story`                       |
| Prioritize backlog         | `/prioritize`                        | `prioritize`                  |
| Quality gate (pre-dev)     | `/dor-gate`                          | `dor-gate`                    |
| Quality gate (pre-qa)      | `/artifact-review --type=spec-tests` | `artifact-review`             |
| Quality gate (pre-release) | `/production-readiness-review`       | `production-readiness-review` |
| Create test cases          | `/spec [mode=tests]`                 | `spec [mode=tests]`           |
| Create design spec         | `/design-spec`                       | `design-spec`                 |
| Analyze blast radius       | `/graph-blast-radius`                | `graph-blast-radius`          |
| Build code graph           | `/graph-build`                       | `graph-build`                 |
| Review integration tests   | `/integration-test-review`           | `integration-test-review`     |
| Verify test traceability   | `/integration-test-verify`           | `integration-test-verify`     |
| Enhance AI prompts         | `/prompt-enhance`                    | `prompt-enhance`              |
| Create PBI visual mockup   | `/pbi-mockup`                        | `pbi-mockup`                  |

### "I want to learn about..."

| Topic                                       | Start Here                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| How skills work                             | [skills/README.md](./skills/README.md)                                                                          |
| How skills are activated                    | [skills/README.md](./skills/README.md)                                                                          |
| How lessons system works                    | [hooks/README.md](./hooks/README.md) — `/learn` skill + static lessons re-anchoring in `CLAUDE.md` / `SKILL.md` |
| How hooks intercept events                  | [hooks/README.md](./hooks/README.md) — hook catalog + lifecycle                                                 |
| Hook execution order by event               | [hooks/README.md](./hooks/README.md) — hook catalog + execution order                                           |
| Session lifecycle (init → compact → resume) | [hooks/README.md#session-lifecycle](./hooks/README.md#session-lifecycle)                                        |
| Workflow detection and routing              | Default-on `workflow-route-inject.cjs` (team opt-out in project config; `.claude/.ck.local.json` local override); definitions in `.claude/workflows.json` |
| How to create custom hooks                  | [hooks/extending-hooks.md](./hooks/extending-hooks.md)                                                          |
| How to configure output                     | [configuration/output-styles.md](./configuration/output-styles.md)                                              |
| How team collaboration works                | [team-collaboration-guide.md](./team-collaboration-guide.md)                                                    |
| How to update code review rules             | [hooks/README.md#code-review-rules](./hooks/README.md#code-review-rules)                                        |

## Document Sizes (for context planning)

| Document                            | Lines | Tokens (est.) | Load Time |
| ----------------------------------- | ----- | ------------- | --------- |
| quick-start.md                      | ~180  | ~500          | Fast      |
| skills/README.md                    | ~350  | ~900          | Fast      |
| _(see the project-reference root)_  |       |               |           |
| hooks/README.md                     | ~310  | ~800          | Fast      |
| configuration/settings-reference.md | ~390  | ~1000         | Moderate  |
| troubleshooting.md                  | ~415  | ~1100         | Moderate  |

**Tip:** Load smaller docs first. Reference larger docs only when needed.

## Core Pattern References

Unprefixed filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

| Document                                                     | When to Use                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `project-structure-reference.md`                             | Understanding project structure                             |
| `backend-patterns-reference.md`                              | Backend development tasks (project-specific companion doc)  |
| `frontend-patterns-reference.md`                             | Frontend development tasks (project-specific companion doc) |
| `integration-test-reference.md`                              | Test fixtures, patterns, module abbreviations               |
| `feature-spec-reference.md`                                  | Feature doc templates, app/service mapping                  |
| `domain-entities-reference.md`                               | Domain entity catalog, relationships, cross-service sync    |
| [skill-naming-conventions.md](./skill-naming-conventions.md) | Skill naming rules and prefix guide                         |
| [configuration/README.md](./configuration/README.md)         | Settings schema, permissions, hooks config                  |

## Complete Guides (Large Reference Docs)

| Document                                                | Size  | Use Case           |
| ------------------------------------------------------- | ----- | ------------------ |
| `configured styling reference` (project-reference root) | ~30KB | BEM, design tokens |

## Related Documentation

| Location                                  | Content                               |
| ----------------------------------------- | ------------------------------------- |
| `CLAUDE.md` (project root)                | Root instructions (always read first) |
| `design-system/` (project-reference root) | Frontend design system                |
| The business spec root                    | Tech-free 8-section Feature Specs     |

## How to Use This Documentation

1. **Start with `CLAUDE.md`** (project root) - Essential rules and quick decisions
2. **New to Claude Code?** - Follow [quick-start.md](./quick-start.md)
3. **Find the right skill** - Browse [skills/README.md](./skills/README.md)
4. **Activate skills** - Check [skills/README.md](./skills/README.md) for triggers
5. **Understand internals** - Dive into [hooks/](./hooks/) for deep knowledge
6. **Troubleshoot issues** - See [troubleshooting.md](./troubleshooting.md)

## Statistics

| Category               | Count |
| ---------------------- | ----- |
| Skills                 | 126   |
| Hook files (top-level) | 23    |
| Lib Modules            | <!-- COUNT:lib-modules -->46<!-- /COUNT --> |
| Hook Events            | 9     |
| Agents                 | <!-- COUNT:agents -->23<!-- /COUNT --> |
| Workflows              | 20    |
| Hook Tests             | 133   |
| Documentation Files    | 28    |

---

_Last updated: 2026-06-11 | Source: `.claude/` directory analysis_
