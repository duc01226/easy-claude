<!-- CK:UNIVERSAL-GUIDES v6 -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude and Codex equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about…                                                  | Default route                                                                                                                                       |
> | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
> | A simple, straightforward task with a clear target and low risk    | **direct execution** — do it without a workflow                                                                                                     |
> | A simple task that needs a few coordinated steps or skills         | **custom simple workflow** — sequence only the necessary skills/steps                                                                               |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `/start-workflow workflow-bugfix`                                                                                  |
> | A non-trivial new feature, capability, or enhancement              | **`workflow-feature` workflow** — `/start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause             | that skill / workflow                                                                                                                               |
> | A one-off question, or a truly trivial edit                        | direct execution                                                                                                                                    |
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
>       In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->

<!-- CK:WORKFLOW-SKILLS -->

## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflows Index (17)

| Workflow                          | When to use                                                                                                           | Steps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow-big-feature`            | implement a large, complex, or ambiguous feature that needs research                                                  | idea → web-research → deep-research → business-evaluation → spec-discovery → domain-analysis → why-review → tech-stack-research → architecture-design → why-review → plan → plan-review → refine → why-review → review-artifact --type=pbi → story → why-review → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup → spec → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec-clarify → plan → plan-review → scaffold → plan-validate → why-review → plan-execute → seed-test-data → review-domain-entities → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → workflow-review-changes → security-review → changelog → test → docs-update → workflow-end → watzup                                                                                                                                                                                          |
| `workflow-bugfix`                 | a bug, error, crash                                                                                                   | scout → investigate → debug-investigate → spec [mode=amend] → plan → plan-review → plan-validate → why-review → spec [mode=tests] → why-review → review-artifact --type=spec-tests → integration-test → fix → prove-fix → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → workflow-review-changes → changelog → test → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `workflow-code-to-spec`           | initial feature spec generation from zero, maintaining spec sync after code changes, quarterly spec health audits     | scout → plan → plan-review → plan-validate → spec → spec [mode=tests] → review-artifact --type=spec-tests → review-artifact → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `workflow-e2e`                    | generate, update, or maintain e2e/playwright tests from code/spec                                                     | scout → e2e-test → test → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `workflow-feature`                | implement a well-defined feature, add a component, build a capability                                                 | scout → investigate → spec-discovery → domain-analysis → why-review → spec → spec-clarify → plan → plan-review → plan-validate → why-review → spec [mode=tests] → why-review → review-artifact --type=spec-tests → plan → plan-review → plan-execute → seed-test-data → review-domain-entities → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec [mode=sync] → integration-test → integration-test-review → integration-test-verify → workflow-review-changes → security-review → changelog → test → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                              |
| `workflow-feature-spec`           | create or update business feature documentation                                                                       | scout → investigate → plan → plan-review → plan-validate → why-review → docs-update → workflow-review-changes → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `workflow-greenfield-init`        | start a new project from scratch, init a greenfield project, plan a new application                                   | idea → web-research → deep-research → business-evaluation → spec-discovery → domain-analysis → why-review → tech-stack-research → architecture-design → architecture-scalability-review → why-review → plan → plan-review → security-review → performance-review → plan-review → refine → why-review → review-artifact --type=pbi → story → why-review → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup → plan-validate → why-review → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec-clarify → plan → plan-review → scaffold → linter-setup → harness-setup → why-review → plan-execute → review-domain-entities → spec [mode=tests] → why-review → review-artifact --type=spec-tests → plan → plan-review → integration-test → integration-test-review → integration-test-verify → test → workflow-review-changes → security-review → changelog → test → docs-update → workflow-end → watzup |
| `workflow-idea-to-pbi`            | po/ba wants a grooming-ready pbi backlog, user stories, tdd test specifications                                       | web-research → deep-research → brainstorm → idea → spec-discovery → review-artifact → refine → why-review → spec [mode=draft] → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec-clarify → domain-analysis → why-review → plan → plan-review → plan-validate → why-review → review-artifact --type=pbi → story → why-review → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup → design-spec → prioritize → docs-update → feature-presentation → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `workflow-idea-to-spec`           | turn a raw product idea, vision, or problem statement into one canonical                                              | web-research → deep-research → brainstorm → spec-discovery → domain-analysis → why-review → idea → spec [mode=draft] → spec [mode=tests] → review-artifact --type=spec-tests → review-artifact → design-spec → spec-clarify → why-review → docs-update → feature-presentation → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `workflow-refactor`               | restructure, reorganize, clean up                                                                                     | scout → investigate → plan → plan-review → plan-validate → why-review → plan-execute → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec [mode=sync] → integration-test → integration-test-review → integration-test-verify → workflow-review-changes → changelog → test → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `workflow-research`               | research a topic from web sources, a business/market viability evaluation, a marketing strategy                       | web-research → deep-research → knowledge-synthesis → knowledge-review → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `workflow-review-changes`         | review current uncommitted, staged, or unstaged changes before committing                                             | review-changes → why-review → review-architecture → review-domain-entities → performance-review → integration-test-review → security-review → production-readiness-review → code-simplifier → plan → plan-review → plan-execute → review-changes → why-review → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `workflow-seed-test-data`         | seed test data, implement data seeders, realistic development environment data                                        | scout → investigate → seed-test-data → review-changes → code-simplifier → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `workflow-spec-sync`              | fixing a bug update test specs, code changes update test specs, pr review update test specs                           | workflow-review-changes → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec [mode=sync] → integration-test → integration-test-review → integration-test-verify → test → docs-update → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `workflow-spec-to-pbi`            | create all pbis from an existing, convert a large feature spec into, dependent pbis from docs/specs                   | scout → spec-index → domain-analysis → why-review → spec-clarify → plan → plan-review → plan-validate → why-review → refine → why-review → review-artifact --type=pbi → story → why-review → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup → design-spec → prioritize → docs-update → feature-presentation → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `workflow-visualize`              | visualize, diagram, draw                                                                                              | scout → investigate → excalidraw-diagram → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `workflow-write-integration-test` | write integration tests for a specific, add test coverage to an untested, update integration tests after code changes | scout → investigate → spec [mode=tests] → why-review → review-artifact --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Workflow Skills (56 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill                             | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture-design`             | [Architecture] Use when designing solution architecture across backend, frontend, deployment, monitoring, testing, and code quality.                                                                                                                                                                                                                                                                                                                                                                                         |
| `architecture-scalability-review` | [Architecture] Use when grading project architecture and scalability quality for greenfield init or brownfield audit: build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery.                                                                                                                                                                                                       |
| `brainstorm`                      | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement.                                                                                                                                                                                                                                                                                                                                                                                |
| `business-evaluation`             | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.                                                                                                                                                                                                                                                                                                                                                                    |
| `changelog`                       | [Documentation] Use when you need to generate or update changelog entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `code-simplifier`                 | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.                                                                                                                                                                                                                                                                                                                                                                               |
| `debug-investigate`               | [Fix & Debug] Use when investigating a bug''s root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix.                                                                                                                                                                                                                                                                                                                                  |
| `deep-research`                   | [Research] Use when deeply researching top sources from web-research.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `design-spec`                     | [Project Management] Use when you need to create UI/UX design specifications from requirements, PBIs, or user stories. Use --mode=wireframe to convert hand-drawn/digital wireframes or UI sketches into structured specs.                                                                                                                                                                                                                                                                                                   |
| `docs-update`                     | [Documentation] Use when updating impacted documentation after code, spec, or test changes.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `domain-analysis`                 | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration.                                                                                                                                                                                                                                                                                                                                                                      |
| `dor-gate`                        | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `e2e-test`                        | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `excalidraw-diagram`              | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `feature-presentation`            | [Documentation] Use when you need to synthesize all generated specs, PBIs, ideas and mockups into one standalone HTML slide presentation for stakeholders (PO/BA/Dev/QC).                                                                                                                                                                                                                                                                                                                                                    |
| `fix`                             | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline.                                                                                                                                                                                                                                                                                                                      |
| `harness-setup`                   | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `idea`                            | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `integration-test`                | [Testing] Use when you need to generate or review integration tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `integration-test-review`         | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.                                                                                                                                                                                                                                                  |
| `integration-test-verify`         | [Testing] Use when you need to verify integration tests pass after writing and reviewing them.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `investigate`                     | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use /understand for the standalone prompt-driven explainer.                                                                                                                                                                                                                                    |
| `knowledge-review`                | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.                                                                                                                                                                                                                                                                                                                                                                                 |
| `knowledge-synthesis`             | [Research] Use when you need to synthesize research findings into structured report using template.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `linter-setup`                    | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.                                                                                                                                                                                                                                                                                                                                                        |
| `pbi-challenge`                   | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pbi-mockup`                      | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `performance-review`              | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, algorithmic complexity (O(n²)), frontend rendering, caching, and distributed paths.                                                                                                                                                                                                                                                                                         |
| `plan`                            | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework).                                                                                                                                                                                                                                                    |
| `plan-execute`                    | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents).                                                                                                                                                                                                                                                                                             |
| `plan-review`                     | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.                                                                                                                                                                                                                                                                                                           |
| `plan-validate`                   | [Planning] Use when you need to validate a plan with critical questions interview.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `prioritize`                      | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `production-readiness-review`     | [Code Quality] Use when reviewing service-layer and API changes for production readiness.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `prove-fix`                       | [Code Quality] Use when you need to prove fix correctness with adversarial code proof traces — a skeptic tries to DISPROVE the fix and trace all related paths first, with confidence scoring and stack-trace-style evidence chains, so confidence is earned by surviving attack, not by confirming it works.                                                                                                                                                                                                                |
| `refine`                          | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements.                                                                                                                                                                                                                                                                                                                                                                                 |
| `review-architecture`             | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events.                                                                                                                                                                                                                                                                                                                                                                                         |
| `review-artifact`                 | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}.                                                                                                                                                                                                                                                                                                                                                      |
| `review-changes`                  | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `review-domain-entities`          | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scaffold`                        | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scout`                           | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `security-review`                 | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection.                                                                                                                                                                                                      |
| `seed-test-data`                  | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. Flag: --mode=review reviews a target seeder (or the current changes / current work-context result) against every universal seed-data rule AND the project-specific seeder conventions — read-only, evidence-backed PASS/FAIL.                                                                                                                                                   |
| `spec`                            | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes draft\|init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; draft authors a provisional spec from an idea/requirement (no code yet, Evidence: TBD); tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md.                                            |
| `spec-clarify`                    | [Code Quality] Use to validate a spec artifact''s decisions with the user across three contexts — a freshly-authored Feature Spec (idea-to-spec), an existing canonical spec before PBI decomposition (spec-to-pbi), or a refined idea + §8 test-specs (idea-to-pbi deep mode). Detects the context, walks every applicable validation category, and runs an exhaustive but budget-bounded blocking clarification gate so every non-obvious or conflicting decision is confirmed before the artifact drives downstream work. |
| `spec-discovery`                  | [Investigation] Use when about to author a new Feature Spec from an idea — investigate all existing Feature Specs AND related code logic first to surface related/overlapping/affected specs, missing features, missing test cases/user stories, system unknowns, and the invariant landscape, before any spec is drafted.                                                                                                                                                                                                   |
| `spec-index`                      | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/\*\*. Never extracts a separate A-E engineering tree.                                                                                                                                                                                                                                                                                    |
| `story`                           | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `tech-stack-research`             | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `test`                            | [Testing] Use when you need to run tests locally and analyze the summary report.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `watzup`                          | [Utilities] Use when you need to review recent changes and wrap up the work.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `web-research`                    | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation.                                                                                                                                                                                                                                                                                                                                                                                   |
| `why-review`                      | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts.                                                                                                                                                                                                                                                                                                                                                                                 |
| `workflow-end`                    | [Process] Use when you need to end the active workflow and clear state.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `workflow-review-changes`         | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.                                                                                                                                                                                                                                                                                                                                                                                     |

<!-- /CK:WORKFLOW-SKILLS -->

<!-- CK:CRITICAL-THINKING -->

**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

<!-- /CK:CRITICAL-THINKING -->

<!-- CK:AI-MISTAKE-PREVENTION -->

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → adjudicate WHO is at fault (source vs test) before forcing green.** A green-again suite is not the goal; the correct verdict on what was actually wrong is. Root-cause first, then triangulate the failure against the governing spec (`docs/specs/**` if one exists) AND the source: SOURCE-WRONG → fix code at the owning layer and keep/strengthen the test; TEST-WRONG → fix the stale assertion/setup at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green, and never change source to satisfy a broken test. Spec silent or ambiguous about which side is correct → STOP and ask the user.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via Skill tool or `/start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- /CK:AI-MISTAKE-PREVENTION -->

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
3. **Workflow-in-workflow → sub-agent (one exception).** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `plans/reports/`. This preserves context containment. **EXCEPTION — `workflow-review-changes`:** when it appears as a step inside ANY parent workflow (`workflow-feature`, `workflow-bugfix`, `workflow-refactor`, etc.) it MUST run INLINE in the main current session agent, NEVER as a sub-agent — its Step 0 `/goal` gate binds the session Stop hook and its step-14 re-review is inline by design; a sub-agent cannot own the Stop hook, so delegating it silently breaks the unabandonable review→fix→re-review loop. Its own steps 3–7 reviewers stay sub-agents, so context stays bounded.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Claude, Codex, and Copilot all run without a step-tracking hook and advance entirely by this rule.

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

| Task             | Pattern                             |
| ---------------- | ----------------------------------- |
| New API endpoint | Controller + CQRS Command           |
| Business logic   | Command Handler (Application layer) |

<!-- /SECTION:decision-quick-ref -->

## Search Existing Code First

Before writing code, you MUST grep/glob for 3+ similar examples and follow the local pattern over generic framework docs. Cite `file:line` evidence in the plan.

1. Grep/Glob for similar patterns (find 3+ examples).
2. Follow the codebase pattern; don't default to framework docs.
3. Provide `file:line` evidence in the plan.

**Why:** projects have local conventions that differ from framework defaults.
**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps).

### Read `docs/project-config.json` first — the project's machine-readable map

It is the single source of truth describing THIS repo: modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, and workflow patterns. Consult its content to ground exact paths, run-commands, conventions, and rules **before investigating, planning, or coding** — never assume framework defaults. (`docs/project-config.json` + the reference docs below are what `CLAUDE.md` is generated from; read the config directly whenever you need precise paths, commands, or rules. If it is missing or still a skeleton, run `/project-init` or the narrow setup route first.)

### Path → Reference Doc (read BEFORE editing the matched path)

| Edited path                                 | Read first                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend / `.cs` (commands, handlers, repos) | `docs/project-reference/backend-patterns-reference.md` — CQRS, validation, entity events        |
| Frontend / UI components, stores            | `docs/project-reference/frontend-patterns-reference.md` — base classes, store, reactive effects |
| Integration tests                           | `docs/project-reference/integration-test-reference.md` — subcutaneous CQRS, real DI, no mocks   |
| E2E tests                                   | `docs/project-reference/e2e-test-reference.md` — Page Object, BDD conventions                   |
| Feature specs / `docs/specs/**`             | `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`                 |
| SCSS / style files                          | SCSS guide — BEM on all elements, no magic numbers, max 3 nesting levels                        |

> **[ROOT-CAUSE-FIX]** Fix at the correct layer (Entity > Service > Handler) — never patch symptoms.

---

## First Action Decision (before any tool call)

1. Explicit slash command (e.g. `/plan`, `/feature-implement`) → execute it.
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
| Hook files     | `<name>.cjs`     | `.claude/hooks/privacy-block.cjs`             |
| Hook libraries | `<name>.cjs`     | `.claude/hooks/lib/project-config-schema.cjs` |
| Skill dirs     | `<skill-name>/`  | `.claude/skills/code-review/SKILL.md`         |
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
/\.claude/scripts/                       # Utility scripts for catalog generation, skill management, and worktree operations
/\.claude/workflows/                     # Workflow definitions for orchestrating multi-step task sequences
/\.claude/docs/                          # Framework documentation — agents, skills, hooks, configuration guides
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
node .claude/hooks/tests/test-all-hooks.cjs   # hook tests
node .claude/hooks/tests/run-all-tests.cjs    # all suites
```

**Platform (Windows):** invoke Python via `py -3` or `py` — NEVER `python3` (MS Store alias exits 49). Scripts resolve `python` then `py -3` (see `count-drift.test.cjs:29-32`). macOS/Linux: use `python3`.

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

## Continuous Improvement — Lesson Extraction Gate

> **[BLOCKING] Self-improvement loop — runs at the end of every non-trivial task.** This is the static, hook-independent home of the `/learn` gate: it binds Claude, Codex, and Copilot equally, with or without any hook firing.

Add a final task — "Analyze AI mistakes & lessons learned" — to every non-trivial task list (see [Task Planning Rules](#task-planning-rules)). At task end, extract lessons by **ROOT CAUSE, not symptom**:

1. Name the **failure mode** (the reasoning/assumption failure), not the symptom — "assumed an API existed without reading the source", not "used the wrong enum value".
2. **Generality test:** does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write it as a **universal rule** — strip project-specific names/paths/classes so it is useful on any codebase.
4. **Consolidate:** multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in a future session WITHOUT this reminder?" — No → skip `/learn`.
6. **Auto-fix gate:** "Could `/code-review` / `/simplify` / `/security-review` / `/lint` catch this mechanically?" — Yes → improve that review skill instead of writing a lesson.
7. **Both gates pass → ask the user to run `/learn`** to capture the lesson durably. Never silently self-edit instruction files.

---

## Git & Version-Control Discipline

> **[BLOCKING] Hook-independent guardrail — binds Claude, Codex, and Copilot equally.** Where hooks run, `git-commit-block.cjs` enforces this as a hard PreToolUse block; on a hookless host (Codex/Copilot) or an un-wired project this section is the ONLY guardrail — obey it without the block.

1. **Never commit, push, or stage (`git add`) unless the user explicitly asks for it.** "Implement X" / "fix the bug" is NOT permission to commit — finish the work, report what changed, and wait. Only an explicit "commit"/"push" (or an invoked commit skill / git-manager) authorizes it.
2. **Never `git commit --amend`.** Amending rewrites history and can corrupt commits once HEAD has moved — always create a NEW commit. No bypass.
3. **Branch before committing on the default branch.** If asked to commit while on `main`/`master`, create a feature branch first.
4. **Read-only git needs no permission** — `status`, `diff`, `log`, `show`, `branch`, `fetch`, `restore`, `reset HEAD` are always allowed.

**Why:** auto-committing/pushing unprompted publishes unreviewed work and can rewrite shared history — the highest-blast-radius irreversible action an agent can take — so it stays gated on explicit human intent on every host, not only where a hook fires.

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

**Routing:** When grep surfaces an important file, or before editing across modules, run a graph trace (see the `graph-*` skills) to map callers/dependents first.

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

When editing files matching these path patterns, pre-read the listed context first:

| Path Pattern                      | Skill / Auto-Context | Pre-Read Files                  |
| --------------------------------- | -------------------- | ------------------------------- |
| `/\.claude/hooks/.*\.cjs$**`      | _(auto-context)_     | `.claude/docs/hooks/README.md`  |
| `/\.claude/skills/.*SKILL\.md$**` | _(auto-context)_     | `.claude/docs/skills/README.md` |
| `/\.claude/agents/.*\.md$**`      | _(auto-context)_     | `.claude/docs/agents/README.md` |

<!-- /SECTION:skill-activation -->

**Design routing:** SCSS / style files → review-ui / design skill (BEM conventions live there). UI / HTML / CSS files → design skill (canonical design-system doc: tokens, components, BEM).

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `docs/adr/0002-canonical-count-metrics.md`. -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->154<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->15<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->29<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->17<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->6<!-- /COUNT -->       |
| Lib modules | <!-- COUNT:lib-modules -->25<!-- /COUNT --> |

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

| If user prompt mentions...                                     | Read first                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md`  |
| Spec paths, TC format, canonical vs derived spec artifacts     | `docs/project-reference/spec-system-reference.md`                   |
| Spec quality, AI-implementability, tech-agnostic prose         | `docs/project-reference/spec-principles.md`                         |
| Behavior or public contract changes, spec-test-code sync       | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation                             | `docs/project-reference/backend-patterns-reference.md`              |
| Frontend patterns, components, stores                          | `docs/project-reference/frontend-patterns-reference.md`             |

<!-- /SECTION:doc-lookup -->

<!-- CK:CRITICAL-THINKING -->

**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

<!-- /CK:CRITICAL-THINKING -->

<!-- CK:AI-MISTAKE-PREVENTION -->

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → adjudicate WHO is at fault (source vs test) before forcing green.** A green-again suite is not the goal; the correct verdict on what was actually wrong is. Root-cause first, then triangulate the failure against the governing spec (`docs/specs/**` if one exists) AND the source: SOURCE-WRONG → fix code at the owning layer and keep/strengthen the test; TEST-WRONG → fix the stale assertion/setup at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green, and never change source to satisfy a broken test. Spec silent or ambiguous about which side is correct → STOP and ask the user.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via Skill tool or `/start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- /CK:AI-MISTAKE-PREVENTION -->
