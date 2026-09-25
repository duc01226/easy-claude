# Primary Workflow

## Quick Summary

**Goal:** Define the standard development workflow phases and map them to the workflow catalog in `.claude/workflows.json`.

**Core Phases (all workflows follow subsets of these):**

1. **Discover** — Use `/investigate` to locate files and inspect patterns; run graph traces when the project's graph database is available
2. **Plan** — `/plan` + `/plan-review` + `/plan-validate`, save in the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path)
3. **Design Review** — `/why-review`; spec and test-spec work follows the project's configured spec-artifact profile or documented native spec contract
4. **Implement** — `/feature-implement` or `/plan-execute`, compile-check after every file change
5. **Verify** — `/test`, `/integration-test`, and any spec reconciliation step defined by the selected project profile
6. **Quality** — Use `workflow-review-changes` for the canonical review and repair cycle; follow its registered sequence in `.claude/workflows.json`. It invokes the `changes-review` skill as one part of the workflow.
7. **Ship** — `/production-readiness-review`, `/security-review`, `/docs-update`, `/watzup`, `/workflow-end`

**Key Rules:**

- Understand code FIRST before any modification — mandatory, no exceptions
- Compile-check after every code change
- Never use fake data or mocks just to pass tests
- Activate relevant skills from catalog during the process
- Every claim needs `file:line` evidence, confidence >80% to act

---

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.

## Phase 0: Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. Run graph on key files when the project's graph database exists; when it is absent, use source search and direct tracing.

- Read existing code before modifying. Validate assumptions with evidence. Search before creating.

## Phase 1: Planning

- Use `/plan` skill to create an implementation plan with tasks in the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path)
- Use `/web-research` → `/deep-research` for investigating technical topics before planning
- Validate plan via `/plan-review` (recursive until its current severity bar is clear) and `/plan-validate` (critical questions)
- **DO NOT** create new enhanced files — update existing files directly

## Phase 2: Design Review

- Use `/why-review` to validate design rationale before implementation
- Before spec or test-spec work, resolve the project's configured spec-artifact profile or documented native spec contract
- Use `/spec [mode=tests]`, `/artifact-review --type=spec-tests`, and a Feature Spec Section 8 CREATE-before-implementation / UPDATE-after lifecycle only when the selected profile defines that format; otherwise follow its native artifact, identifier, and review contract
- Every assertion-bearing test uses explicit `Given` → `When` → `Then` phases, names the guarded business intent/invariant or technical contract, and asserts an owned outcome; framework-native BDD, named helpers, or comments are valid, while bare Arrange/Act/Assert is insufficient unless all three GWT phases are also labeled
- Every `changes-review` skill invocation or specialist review first applies `SYNC:review-principle-awareness`; route only contextually applicable scale-ready foundation, GWT test, AI-agent-as-user, and UI/component obligations to their detailed skill protocols, recording evidence-backed N/A/defer/block/unverified status rather than inventing findings or expanding scope
- For features: two planning rounds — PLAN1 (architecture) then PLAN2 (incorporating test strategy)

## Phase 3: Implementation

- Use `/feature-implement` or `/plan-execute` skill to implement the plan
- Write clean, readable, maintainable code
- Follow the project's documented architecture, state-management, and styling conventions; load the project references that apply to the changed area
- Handle edge cases and error scenarios
- **[IMPORTANT]** After creating or modifying code, run compile command to check for errors

## Phase 4: Verification

- Use `/test` skill to run tests and analyze results
- Use `/integration-test` to generate integration tests from specs
- Reconcile affected spec/test-spec artifacts according to the selected project's profile or native contract; use `/spec [mode=sync]` only when that profile defines the mode or dashboard format
- **Bugfixes:** where the selected project's integration-test protocol requires a regression test, establish the failing behavior before `/fix` (RED) and verify it passes after the fix (GREEN). Production-code changes go through `workflow-review-changes`; it uses the `changes-review` skill. The standalone `/fix` route runs that skill before `/why-review` — see `workflow-bugfix/SKILL.md` and `fix/SKILL.md`
- **IMPORTANT:** Never use fake data, mocks, cheats, or tricks just to pass the build
- **IMPORTANT:** Fix failing tests and re-run until all pass

## Phase 5: Quality

- Use `workflow-review-changes` for the canonical review and repair workflow; follow its registered sequence and severity bar. Use the standalone `changes-review` skill only when a standalone review is the selected task.
- Alternatively use individual skills: `/code-simplifier`, `/code-review`, `/architecture-review`, `/performance-review`
- Follow coding standards and conventions
- Optimize for performance and maintainability

## Phase 6: Ship

- Use `/production-readiness-review` for production readiness (service-layer/API changes)
- Use `/security-review` for security review
- Use `/docs-update` to update documentation if needed
- Use `/watzup` for summary report of all changes
- Use `/workflow-end` to clear workflow state

## Phase 7: Debugging (when issues arise)

- Use `/debug-investigate` skill for systematic debugging when issues are reported
- For non-trivial bugs, failed verification, or stale/incorrect final outputs, start from the observed end state and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/origin before proposing a fix
- Enumerate every feeder path and root-cause hypothesis; a fix is blocked until the owning fix layer and forward convergence proof are written
- Use `/fix` skill to apply fixes after root cause is identified
- Re-run tests after every fix to verify no regressions

---

## Workflow Catalog Reference

`.claude/workflows.json` is the execution authority for workflow IDs, steps, and conditions. The IDs below are a routing index checked against the current catalog; update this index when the catalog changes.

### Core Development Workflows

| Workflow ID                   | When to use                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `workflow-feature`            | Implement a well-defined feature that no canonical spec describes yet.              |
| `workflow-implement-spec`     | Implement behavior already written in a canonical spec or TC set.                   |
| `workflow-bugfix`             | Investigate and fix a bug or regression.                                            |
| `workflow-refactor`           | Restructure or improve code without changing behavior.                              |
| `workflow-big-feature`        | Handle a large, ambiguous, or research-heavy feature.                               |
| `workflow-greenfield-init`    | Initialize a new project from its initial idea through implementation.              |
| `workflow-review-changes`     | Review current changes and follow the registered repair/re-review loop.             |
| `workflow-architecture-audit` | Produce a read-only architecture, scalability, and production-readiness assessment. |

### Planning & Spec Workflows

| Workflow ID             | When to use                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `workflow-idea-to-pbi`  | Turn an idea or product opportunity into a grooming-ready backlog.                                                |
| `workflow-idea-to-spec` | Turn an idea into one provisional feature specification.                                                          |
| `workflow-code-to-spec` | Create or update capability documentation from existing code.                                                     |
| `workflow-spec-to-pbi`  | Build a dependency-aware backlog from existing feature specifications.                                            |
| `workflow-feature-spec` | Create or maintain business feature documentation.                                                                |
| `workflow-spec-sync`    | Reconcile affected spec and test-spec artifacts according to the project's configured profile or native contract. |

### Test & Data Workflows

| Workflow ID                       | Purpose                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `workflow-e2e`                    | Write, update, and verify end-to-end tests through the configured lifecycle.              |
| `workflow-write-integration-test` | Author or update integration tests for existing code.                                     |
| `workflow-integration-test-green` | Verify and adjudicate an existing integration-test suite, fixing only validated failures. |
| `workflow-seed-test-data`         | Create or improve idempotent test-data seeders.                                           |

### Design & Visualization Workflows

| Workflow ID          | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `workflow-visualize` | Create visual diagrams from codebase investigation or research. |

### Research & Content Workflows

| Workflow ID         | Purpose                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `workflow-research` | Research a topic and synthesize the requested report or content artifact. |

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** understand existing code FIRST (read and search 3+ patterns; use graph tracing when the project graph database exists) before ANY code modification
**MANDATORY IMPORTANT MUST ATTENTION** compile-check after every code file change
**MANDATORY IMPORTANT MUST ATTENTION** never use fake data/mocks/cheats just to pass tests — fix real issues
**MANDATORY IMPORTANT MUST ATTENTION** activate relevant skills from catalog during the process
**MANDATORY IMPORTANT MUST ATTENTION** auto-select the best-matching workflow from the catalog and activate it via `/start-workflow <workflowId>` — selection is model-driven; do not ask the user to confirm activation
**MANDATORY IMPORTANT MUST ATTENTION** when graph tooling and its configured database are available, run at least ONE graph command on key files before concluding investigation/plan/fix; otherwise use direct source tracing and record that graph analysis was unavailable
