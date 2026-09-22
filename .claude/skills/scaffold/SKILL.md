---
name: scaffold
version: 1.1.0
description: '[Architecture] Use when scaffolding project foundations and golden-path examples selected by the target project architecture before feature implementation.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Generate a copy-ready architecture foundation that follows the project's chosen paradigm—applicable abstractions, infrastructure, examples, and quality gates—before feature implementation.

**Summary:**
- **Purpose + scope:** Build reusable architecture infrastructure and golden-path examples, not feature code; adapt checklist templates to the detected stack and plan, skip irrelevant items with evidence.
- **Ordered main flow:** (1) Activation Guards → (2) Read Plan → (3) Generate the applicable Backend and/or Frontend/UI checklist → (4) Validate against Plan → (5) confirm via `AskUserQuestion` → (6) scaffold approved abstractions + applicable foundations + examples → (7) verify build, architecture, testability, and Verification Gate → (8) `/linter-setup` → `/harness-setup` → `AskUserQuestion` handoff.
- **Testability gate:** Resolve Unit/Integration/System/E2E and warranted Performance/Scale applicability or evidence-backed `N/A`; record owner/root/data, copy-ready full/focused commands, zero-match failure, CI/simple-Windows entry, host/container modes, environment reach, identity, idempotent/additive isolation, and repeat proof. Unresolved applicable fields block; do not invent E2E coverage.
- **Non-negotiables:** Existing scaffolding or wrong workflow → SKIP and mark completed; every plan decision maps to a checklist item; applicable project foundations must pass; sensor setup only via `/linter-setup` then `/harness-setup`; block `/feature-implement` until verification passes; cite evidence and confidence.

**Workflow (after Activation Guards, in order):** Read Plan → Generate Checklist → Validate Against Plan → `AskUserQuestion` confirmation → Scaffold → Verify → `/linter-setup` → `/harness-setup` → `AskUserQuestion` handoff.

**Key Rules:**

- **MUST ATTENTION** use evidence to resolve applicability, scope, and completion; **NEVER** guess missing runners, commands, or patterns.
- **MUST ATTENTION** treat checklists as adaptable templates and confirm the final checklist before generating code.
- **MUST ATTENTION** apply the project's selected architecture and applicable design principles, verify required foundations, and keep `/feature-implement` blocked until the Verification Gate passes.

## Activation Guards (MANDATORY — Check Before Executing)

**ALL conditions must be true to proceed:**

1. **Workflow check:** Active workflow is `workflow-greenfield-init` OR `workflow-big-feature`. If not → SKIP this skill entirely, mark step as completed.
2. **Existing scaffolding check:** AI MUST ATTENTION self-investigate for existing base/foundational abstractions:
    - Abstract/base classes: grep `abstract class.*Base|Base[A-Z]\w+|Abstract[A-Z]\w+`
    - Generic interfaces: grep `interface I\w+<|IGeneric|IBase`
    - Infrastructure abstractions: grep `IRepository|IUnitOfWork|IService|IHandler`
    - Utility/extension layers: grep `Extensions|Helpers|Utils|Common` (directories or classes)
    - Frontend foundations: grep `base.*component|base.*service|base.*store|abstract.*component` (case-insensitive)
    - DI/IoC registration: grep `AddScoped|AddSingleton|providers:|NgModule|@Injectable`
3. **If existing scaffolding found → SKIP.** Log: "Existing scaffolding detected at {file:line}. Skipping /scaffold step." Mark step as completed.
4. **If NO foundational abstractions found → PROCEED** with full scaffolding workflow below.

## When to Use

- After the second `/plan` + `/plan-review` in greenfield-init or big-feature workflows, before `/feature-implement`.
- When a new service/module needs its own base architecture and no foundation exists.
- **NOT** when the project already has established base classes and infrastructure

## Workflow

1. **Read Plan** — Parse architecture decisions, tech stack, and domain model.
2. **Generate Scaffolding Checklist** — Cover applicable abstractions and infrastructure identified by the plan, using the Backend and/or Frontend/UI categories below.
3. **Validate Against Plan** — Map every architecture decision to a scaffolding item.
4. **Present to User** — Use `AskUserQuestion` to confirm the checklist before code generation.
5. **Scaffold** — Create only the abstractions, infrastructure, and examples selected by the plan and supported by project conventions.
6. **Verify** — Build; validate the selected architecture, testability, and the Verification Gate; then invoke `/linter-setup` → `/harness-setup` and present the `AskUserQuestion` handoff.

## Backend Scaffolding Categories

AI must self-investigate chosen tech stack, produce a checklist covering these categories. Names below are illustrative — adapt to the project's language, framework conventions, and actual needs.

### Domain Layer

- [ ] Base entity interface + abstract class (Id, timestamps, audit fields)
- [ ] Value object base (equality by value)
- [ ] Domain event interface

### Application Layer

- [ ] Command/query handler abstractions (CQRS if applicable)
- [ ] Validation result pattern
- [ ] Base DTO with mapping protocol
- [ ] Pagination wrapper
- [ ] Operation result pattern (success/failure)

### Infrastructure Layer

- [ ] Generic repository interface + one concrete implementation
- [ ] Unit of work interface (if applicable)
- [ ] Messaging/event bus abstraction
- [ ] External service abstractions (cache, storage, email — only if plan requires them)
- [ ] Database context / connection setup
- [ ] DI/IoC registration module

### Cross-Cutting

- [ ] Current user context abstraction
- [ ] Testable date/time provider
- [ ] Exception hierarchy (domain, validation, not-found)
- [ ] Error handling middleware
- [ ] Strongly-typed configuration models

## Frontend Scaffolding Categories

### Core Architecture Candidates

- [ ] Base component or shared lifecycle abstraction — only when the configured architecture or demonstrated shared behavior calls for one
- [ ] Form abstraction with validation/dirty tracking — only when the project pattern and reuse justify it
- [ ] List abstraction with pagination/sorting/filtering — only when the platform and product need a shared owner

### State & API Candidates

- [ ] Shared state abstraction with relevant loading/error/data behavior — only when configured or required by the plan
- [ ] API/request wrapper with interceptors and error handling — only when the project architecture calls for one
- [ ] Auth/request configuration — follow the project's existing security and environment model; do not add a generic interceptor by default

### Shared Utilities Candidates

- [ ] Shared model/serialization helpers — only when supported by the chosen architecture
- [ ] Common utility functions — only for behavior with a demonstrated shared owner

### UI Foundation

> **Apply only when:** the plan includes a user-facing UI. Select items for the configured web, mobile, desktop, or other UI platform; skip the entire section for projects or changes without a UI.

#### Design Tokens (only when the plan establishes a shared system)

- [ ] Create a token source in the project's chosen format only when a shared design system is in scope
- [ ] Define only the color, spacing, typography, layout, motion, or layering values the target needs; do not impose a minimum token catalog
- [ ] Add theme support only when the product requires it and its platform has a relevant theming mechanism

#### Layout and Size Adaptation (where supported)

- [ ] App shell or window/navigation structure when required by the plan and platform
- [ ] Layout/container primitives that solve an evidenced reuse or responsive need
- [ ] Platform-supported size adaptation (for example CSS breakpoints, native size classes, or resizable-window layouts) when required by the target

#### Shared UI Components (only when the plan requires them)

- [ ] Shared loading, error, or empty-state component when multiple surfaces need a common owner
- [ ] Notification/feedback component when required by the product interaction model
- [ ] Shared button/input abstractions only when existing components, planned reuse, and platform APIs support them

#### UI Convention Documentation (when established by the plan)

- [ ] Create a `design-system/README.md` only when the project establishes a shared design system; document its real tokens, components, tiers, or platform concepts rather than preselecting them
- [ ] Author `ui-review-principles.md` only when the project adopts explicit UI review rules. Base it on the configured platform, styling, accessibility, responsive, layering, and async-state conventions. BEM and CSS nesting limits are examples only when the project selects CSS/BEM rules.
- **No-UI skip rule:** create no UI convention or design-system documents when the project has no UI surface.

## Example / Golden-Path Reference Scaffolding (when it improves adoption)

> When the selected foundation introduces reusable patterns, consider a small, compile-checked golden-path example for each applicable pattern. Examples make chosen contracts reviewable and easy to copy; do not create them for unselected patterns, absent layers, or project types where examples add no value. The architecture report/configuration determines the expected set.

### Location & lifecycle (isolated, production-excluded)

- Examples live in a DEDICATED, ISOLATED `examples/` tree (project-root `examples/`, or `examples/` inside the project-reference docs root — default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) — **NEVER mixed into the production `src/` tree.**
- Name every file `*.example.*` (e.g. `create-order.command.example.ts`, `Order.entity.example.cs`).
- **CI-compiled/linted but EXCLUDED from the production build** via a project-appropriate mechanism (separate compile target / tsconfig references / test-only project / build-exclude glob).
- Devs COPY an example into `src/` to start a real feature; the whole `examples/` tree is deleted wholesale once no longer needed.

### One worked example per selected, applicable pattern (no fixed count)

- **Backend:** include only patterns selected by the architecture (for example, a use-case entry point, domain invariant, repository boundary, or event consumer).
- **Frontend (only for patterns established by the plan):** one representative UI example using the selected component/state/request architecture; do not generate a store, API service, or base component unless the project has chosen one.
- **Tests:** include examples only for test layers the project actually has; follow its configured test style and cover important success/failure outcomes when relevant.
- **Absent/unselected pattern skips:** omit patterns that are not selected, not useful at the project's scale, or belong to an absent layer; record the reason in the scaffold report without inventing architecture.

### Every example MUST

1. Follow the project's detected patterns — read `*-patterns-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) and mirror the exact shapes.
2. Use an abstraction when the plan establishes it; otherwise demonstrate the target platform's idiomatic approach without inventing a base class, store, or wrapper.
3. Compile/lint clean under the CI (non-production) target.
4. Carry this header comment verbatim (adapt the comment syntax to the language): `GOLDEN-PATH EXAMPLE — copy into src/ for real features; the examples/ tree is deleted when unused; NOT compiled into the production build.`
5. Contain **NO secrets, real credentials, or real endpoints** — use obvious placeholders ONLY (`EXAMPLE_API_KEY`, `example.invalid`, `00000000-0000-0000-0000-000000000000`).
6. **Frontend examples only — follow the chosen visual authority.** Use configured tokens and components when present. If no shared system exists, use values appropriate to the platform and brief; introduce project-wide tokens only when the plan approves a design system. Demonstrate the states required by the feature and platform on applicable examples, and use real interface copy where the example is user-facing.

### Right-sizing

Examples DEMONSTRATE patterns — NOT a feature. Honor the scale-tier guard: a tiny T0/B0 project gets the minimal applicable set, never speculative extras.

### Testability Contract Resolution (MANDATORY before handoff)

Read the completed `architecture-design` Testability & Execution Contract matrix before generating examples. Resolve every tier in the scaffold report and carry the same decisions into `/harness-setup`:

| Tier | Required scaffold output |
| --- | --- |
| Unit | Create or document one applicable pure/domain example, its runner/root, full and focused commands, zero-match failure behavior, CI gate, and simple/Windows entry point. |
| Integration/System | Create or document one applicable public-path example, its runner/root, full and focused commands, zero-match failure behavior, CI gate, and simple/Windows entry point. |
| E2E | Create or document one applicable configured-browser journey and commands; if no framework/configuration/command is evidenced, record `N/A — {evidence}` and create no invented browser example. |

For each applicable persistent tier, the handoff also records the run/test identity and unique business-data suffix, supported public setup path, realistic valid data, count-before-create idempotent/restart-safe reference setup, additive/no-reset accumulation, mutable-root and parallel-worker isolation, realistic pacing/arrange barrier, exact result, and two consecutive no-reset full runs. If scaffold has not executed the commands yet, record `planned — {owner}` rather than claiming a pass. Include these contract rows in the existing user-confirmed final checklist; unresolved material tool choices still use the existing `AskUserQuestion` gate.

## Code Quality Gate Selection (MANDATORY MUST ATTENTION — Before Feature Code)

Select automated checks that fit the project's languages, runtime, risk, and delivery process. Reuse existing checks; add only controls that catch a relevant defect class and can be maintained. Record why a check is not applicable instead of adding a tool solely to complete this list.

### Static Analysis & Linting

- [ ] Configure a language-appropriate linter/analyzer when the ecosystem and codebase support a useful, maintainable ruleset.
- [ ] Set warning/strictness thresholds for new code according to tool quality and project conventions; do not adopt a rule that produces noisy or unreviewable output.
- [ ] Use compiler/type/static checks where available and relevant; treat line coverage as a diagnostic, not proof of behavior quality.
- [ ] Use a formatter/shared style config when the language and team benefit from consistent automated formatting.

### Build-Time Quality Enforcement

- [ ] Choose the fastest useful local/commit checks and enforce the authoritative set in CI when CI exists; avoid running the same expensive check redundantly at every lifecycle stage.
- [ ] Make relevant build, test, lint, type, and security checks fail clearly when they find a project-relevant defect.
- [ ] Assess test strength through meaningful outcome assertions; use mutation/fault-injection tools where they fit, otherwise use an evidence-backed assertion review or focused defect-seeding exercise. Do not require a mutation score tool where none is workable.
- [ ] Scan dependencies/secrets when the project has managed dependencies, credentials, or a real supply-chain exposure; document the selected control.

### Code Rules & Standards

- [ ] Store shared tool configuration in the location supported by the selected toolchain.
- [ ] Add `.editorconfig` or equivalent only when contributors/tools benefit from it.
- [ ] Document non-obvious quality commands and contribution expectations where project documentation is maintained.

### Harness Integration (MANDATORY — Do Not Skip)

**MANDATORY MUST ATTENTION** delegate ALL computational sensor setup to `/linter-setup`:

- Do NOT manually configure linters, formatters, or pre-commit hooks in this skill
- `/linter-setup` handles: tool research → install → configure → pre-commit hooks → CI gates
- `/harness-setup` handles: full harness inventory (feedforward guides + all feedback types)

**WHY:** Code quality tooling is part of the project's outer agent harness. A checklist of installs is not a harness — a harness is a system of guides and sensors where each control fires at the right lifecycle stage and produces signals the agent can consume.

**After scaffold, invoke for applicable selected work (in order):**

1. `/linter-setup` — computational feedback sensors (deterministic, fast, always-on)
2. `/harness-setup` — full harness inventory (all feedforward guides + all feedback sensors)

**Do NOT proceed to `/feature-implement` until both complete.** (`/scaffold` verification gate enforces this)

## Project Foundation Selection (MANDATORY assessment; foundations are conditional)

> **Scaffold Production Readiness** — See the `SYNC:scaffold-production-readiness` block above for the full inline protocol. (Written WITHOUT the HTML-comment delimiters on purpose: a literal open marker in prose is counted as a second opening fence by `sync-update-blocks.py`, which then refuses the file as unbalanced and silently leaves the block stale.)

Assess each concern against the project profile and architecture report. Generate only foundations the runtime, users, delivery model, and real boundaries need; record `NOT-APPLICABLE` with evidence for the rest. Do not create frontend, HTTP, database, container, or integration infrastructure merely to satisfy this checklist. Use project configuration and accepted decisions first, then confirm material choices with the user.

### 1. Code Quality Tooling

Handled by `/linter-setup` skill — do NOT duplicate here.
Verify the configured formatter, linter, type/static analysis, or other applicable quality checks. Require files/hooks only when the chosen toolchain uses them; if missing, invoke `/linter-setup` for that concern.

### 2. Error Handling Foundation

- Select the runtime's error contract and handling boundary from the project profile (for example UI error presentation, API response mapping, CLI exit/reporting, or background-job retry/recovery).
- Add an HTTP interceptor or global handler only when the selected runtime and architecture use one.
- Keep expected business failures distinguishable from unexpected faults; reuse project conventions.
- Run applicable verification checks; do not require a fixed file count.

### 3. Loading State Management

- Apply only when the project has a user-facing interface with asynchronous work.
- Keep pending state with the narrowest useful component/store owner; add shared loading coordination only when multiple views or requests need it.
- Select delay, cancellation, background-request, and progress behavior from user experience requirements and the configured UI pattern.
- Run applicable interaction/state checks; a global HTTP interceptor or shared service is not a default.

### 4. Container / Development Environment (when it fits)

- Use containers/Compose when required by deployment or when they materially improve reproducibility of the runtime/dependencies for this project.
- When selected, generate only the artifacts the target needs (for example an image, Compose topology, ignore rules, or environment example); configure health checks for long-running services and least-privilege image defaults where supported.
- When containers do not fit, document and verify the supported native, managed, device, or other development/test path.
- Verify each execution mode the project supports or promises; do not require both host and container modes universally.

### 5. Integration Points

- Apply when the project has outbound dependencies or separately owned modules/services.
- Document each real boundary; configure timeout, retry, circuit breaking, or idempotency according to that dependency's failure and retry contract.
- Add integration checks for important success and failure outcomes using the project's configured harness.
- Do not add a broker, circuit breaker, or test suite for a boundary the project does not have.

### Scaffold Handoff from Architecture-Design

If an architecture report exists (from `/architecture-design`), read the "Scaffold Handoff — Tool Choices" table and use those selections instead of re-asking the user.

## OOP/SOLID Compliance Rules (when selected by the project)

Apply these checks only when the plan, configuration, or observed architecture selects OOP/SOLID principles. For other paradigms, validate against the project's documented architecture rules instead.

1. **Single Responsibility** — Each base class handles ONE concern
2. **Open/Closed** — Base classes are extensible via inheritance, closed for modification
3. **Liskov Substitution** — Concrete implementations are substitutable for their base
4. **Interface Segregation** — Small, focused interfaces (not one giant IService)
5. **Dependency Inversion** — Keep policy independent from volatile details at real boundaries; use the project's composition mechanism without introducing an interface for every dependency

**Purpose-oriented abstraction naming gate:** Name generated public or cross-layer interfaces, ports, and base abstractions by capability or domain contract; keep provider, SDK, framework, database, and transport details on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`). Verify the name against the plan, callers, and implementations, preserve local language syntax, and add an abstraction only for an evidenced boundary, substitution need, or multiple meaningful implementations.

**Anti-patterns to prevent:**

- God classes combining multiple concerns
- Unnecessary concrete coupling at volatile or independently owned boundaries; direct concrete use inside a stable module is acceptable
- Base classes with unused methods that subclasses must override
- Missing generic type parameters where applicable

## Adaptation Protocol

The checklists above are **templates**. Before scaffolding:

1. **Read the plan** — What tech stack was chosen?
2. **Adapt naming** — Match target framework and language conventions
3. **Skip irrelevant items** — Not every project needs every item (e.g., skip IFileStorageService if no file uploads)
4. **Add project-specific items** — The plan may require additional base classes not in the template
5. **Use `AskUserQuestion`** — Confirm final checklist with user before generating code

## Output

After scaffolding is complete:

1. **Scaffolding Report** — List created files and evidence-backed `NOT-APPLICABLE` decisions
2. **Build Verification** — Run the project's configured build, package, or type-check command when applicable
3. **Architecture Diagram** — Optional; include only when it clarifies the selected architecture
4. **Foundation Verification** — Verify each selected concern; skipped concerns include reasons
5. **Config Files Generated** — List only files selected for this project profile
6. **Golden-Path Examples** — selected, applicable examples under the chosen isolated location, if examples improve adoption
7. **Testability Contract Resolution** — applicable tiers have owner/runner, commands, environment reach, data policy, and evidence-backed applicability

## Verification Gate (MANDATORY before proceeding to /feature-implement)

Verify each selected, applicable foundation from the project readiness protocol:

- [ ] Every category is selected or has an evidence-backed `NOT-APPLICABLE` reason.
- [ ] Selected code quality checks run through the project's chosen local/CI path.
- [ ] The runtime's error contract is covered; UI loading-state checks apply only when the project has asynchronous user-facing UI.
- [ ] Each supported or required execution mode is verified; a second mode is not required without project evidence.
- [ ] Real outbound/integration boundaries and their important success/failure outcomes are covered.
- [ ] `/linter-setup` and `/harness-setup` complete the controls selected for this project.
- [ ] Golden-path examples are present only for selected patterns where they improve adoption, and follow the project's build/test conventions.
- [ ] The testability contract records applicable tiers, commands, environment reach, data policy, and evidence.

**BLOCK proceeding to `/feature-implement` if a selected verification fails or a material applicability decision is unresolved.** Fix issues first, then re-verify.

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/feature-implement (Recommended)"** — Begin implementing feature stories on top of the scaffolding
- **"/workflow-review-changes"** — Review scaffolding code before proceeding
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:scaffold-production-readiness -->

> **Scaffold Readiness** — Evaluate these foundation areas against the requested artifact, project config, and deployment model. Include applicable foundations; mark non-applicable areas N/A with a reason instead of adding unrelated stack requirements:
>
> 1. **Quality tooling** — use or propose tooling appropriate to the language, repository, and delivery process; document selected tools in project references/config when available.
> 2. **Error handling** — define behavior at applicable process, API, CLI, library, or user-interface boundaries; use HTTP status handling or user notifications only when those surfaces exist.
> 3. **Asynchronous interaction** — provide progress/loading and cancellation behavior when the artifact exposes long-running work to a user or caller; do not add a universal loading tracker to non-interactive projects.
> 4. **Runtime and deployment** — use the declared hosting and deployment model. Container files and multiple run modes are required only when selected by the project; prove each supported mode with its actual command.
> 5. **External integrations** — document and test applicable outbound boundaries; choose timeout, retry, idempotency, or circuit-breaking behavior to fit the protocol and failure modes.
>
> **Gate:** resolve every applicable foundation before implementation. Ask for a decision only when an unresolved choice materially changes the architecture or user-visible behavior.

<!-- /SYNC:scaffold-production-readiness -->

<!-- SYNC:harness-setup -->

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, selected architecture tests, fault/mutation checks where useful, CI gates | Local/commit → CI |
> | Feedback    | Inferential   | `/code-review` skill, `/production-readiness-review`, `/security-review`, LLM-as-judge passes         | Post-commit → CI |
>
> **Test-strength evidence — protect intent, choose signals by risk and fit.** Line coverage is a diagnostic: low coverage can reveal untested areas, while high coverage does not prove assertions protect behavior. Do not make a mutation score, property-test tool, or manual defect-seeding exercise a universal build gate. For important or high-risk invariants, choose useful evidence supported by the project's stack and budget: assertion-intent review, targeted mutation/fault injection, property/metamorphic checks, contract checks, or a focused defect-seeding probe. If a sensor is automated, gate only on a meaningful threshold the team can maintain; record what it proves and its limits. See `SYNC:engineering-foundation-gate` **F4** for the profile-aware foundation check.
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, line-coverage (diagnostic only — never a gate), style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions, and **build scalability** (an unchanged module is not rebuilt; the affected-only set is computable because dependencies are declared; cache hit-rate is measured, not assumed). Build scoping belongs here because it is enforced by the same boundary declarations — unenforced boundaries decay until the affected set is "everything".
> 3. **Behaviour** — Functional correctness. Assert important owned outcomes; add mutation, property, contract, or change-coverage sensors when their benefit and tool support justify them. Line coverage stays a diagnostic.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

<!-- /SYNC:harness-setup -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk; examples include unit, integration/system, E2E, and performance/scale. Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its relevant inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or when it fits the test; otherwise preserve the project's native organization. Property/fuzz tests may describe an input space or generator and the property checked; harness and mutation tests may use their native contract. Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. Keep one behavior per case and split unrelated outcomes. The final assertion must prove the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** For each required test type, record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/platform-appropriate entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses configured browser/service commands and the project's documented synchronization strategy. Browser UI actions should wait for bounded, observable readiness and outcome conditions using runner-native waits or a configured helper; apply action delays only when the project contract specifies them.
> 2a. **E2E organization gate (when E2E is applicable):** Inspect the configured/discovered local test organization and reuse it — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure. Record actual owners and boundaries; describe tiers or base abstractions only when the project uses them. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** Keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner; keep final outcome assertions in the test. Reuse or compose existing helpers/objects before creating new ones, preserve one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a review signal; use occurrence counts only as evidence, and extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** Test reusable shared behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or require lower-tier contract tests when the project has no such model.
> 2d. **E2E synchronization:** Use bounded runner-native waits or the configured project helper for observable preconditions and postconditions where the runner supports them. Include useful timeout diagnostics; keep the final business assertion in the test and avoid fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** Isolate each test/run using the project's supported setup and public paths where applicable. Use unique identities for shared mutable data, realistic valid data for behavior under test, and idempotent/restart-safe setup when fixtures or seeders can persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** When tests touch mutable/shared state, isolate their data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where the behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, relevant identity/data mode, exact result, and repeat proof. For persistent-state suites, verify repeatability without destructive reset at the level required by the project gate. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, or behavior signals when supported by the project's tooling.
> 6. **Execution modes and environment reach:** Exercise each mode and environment the project declares it supports (for example host/container or local/CI); parameterize supported targets when that fits the existing test architecture instead of maintaining needless forks. Record unexercised declared capabilities as a gap. A production-shaped target is applicable only when the project requires it; tests that can reach production need an enforced safe scope, and must report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the project's reproducibility contract requires them. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity, and re-deciding it per feature is the incoherence this gate prevents. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** a different question, no overlap — the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. A surface can pass all 40 clauses and still be a template. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular; they are never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons. A decision with no articulable reason is a default that arrived unnoticed. Defaults hide in what feels like infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: writing a plan and going straight to code reproduces the default, because the plan came from the same patterns the code will.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, not the default you would reach for on any project. Set a real scale with intentional weights, widths and spacing. When type is a headline it is an ACTIVE part of the design, not a neutral delivery vehicle. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. For every device ask: what does this tell the reader that whitespace would not? Nothing → cut it. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (same card size, same gap, same density everywhere is the sound of no one deciding); proportions must say something you can articulate; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, `calc()` values that exist only as workarounds, absolute positioning to escape layout flow are lies; the correct answer is always simpler than the hack). Take screenshots to review where the environment supports it — a picture is worth 1000 tokens. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable, not an omission.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — CONDITIONAL, evidence-gated, profile-tiered. Judges the PROJECT'S ENGINEERING FOUNDATION: _can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?_ Its companions judge the running system's DESIGN (`scale-technique-gate`: is technique X present? · `scenario-stress-eval`: does it survive scenario Y?) — a system can score perfectly on both while nobody but its author can build it. **State OUTCOMES, never tools:** detect the stack, research the current ecosystem, present 2–3 options, the user decides, record the decision — best practice turns over, the outcome does not.
>
> 1. **Derive the project profile FIRST — from evidence, never assumed.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`, never re-derive) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3` — an over-stated profile turns this gate into busywork a small team correctly ignores.
> 2. **Judge all 7 dimensions — always all 7, never a filtered subset** (an omitted row is indistinguishable from an overlooked one). Depth belongs to the named owner; this gate decides only present/absent:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — one documented path takes a clean machine to a running system; toolchain versions pinned; dependencies locked to exact versions; every external prerequisite declared with a way to obtain or fake it; config environment-injected, never machine-implicit; build deterministic. This is what kills _"works on my machine"_ — not carelessness, but a build depending on ambient state nobody declared. → `scaffold` · `architecture-scalability-review`
>    - **F2 Supported execution modes** (judge the modes this project uses or requires; a second mode is not universal) — document and exercise each supported/required developer, test, and deployment path (for example host/container, local/managed, simulator/device). Keep shared configuration/topology in one source where possible. If only one mode fits the runtime, platform, team, and delivery model, verify it and mark the second-mode comparison `N/A-by-profile`; do not invent Docker, Compose, or a host path. The defect is a claimed or required mode that is broken or irreproducible. → `scaffold` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code** (only one fork ever stays maintained, so forking guarantees divergence). Missing capability reports `ENVIRONMENT-BLOCKED` rather than silently passing; unsafe-in-production tests are excluded by an **enforced** mechanism whose absence fails loudly, not by a convention someone must remember. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test-review`
>    - **F4 Test-strength proof** (wherever tests exist) — evidence the suite **actually fails when the code is wrong**; a passing suite means nothing until it is known to be capable of failing for the right reason. Strongest available first: (a) **automated fault injection** scoped to CHANGED code — a surviving defect is a missing or vacuous assertion; gate on it where the ecosystem offers a workable tool. (b) **Deliberate defect-seeding drill — the universal fallback, needing no tooling and available in every ecosystem:** break the production code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore. Nothing went red ⇒ that behavior has no protection — write the killing test. (c) **Assertion-intent audit:** flag assertions that would still hold under an inverted implementation, that assert only non-nullness or a type, that re-assert the input, or that assert infrastructure bookkeeping instead of the outcome the system owns. **Line coverage is a DIAGNOSTIC, never a gate** — low coverage is a useful negative signal; high coverage is not evidence of quality, and gating on the percentage reliably produces tests written to touch lines rather than protect behavior. **Scope boundary — do NOT re-litigate a solved question:** this gate asks only whether the PROJECT HAS a test-strength mechanism wired into its harness at all; PER-CHANGE enforcement is already owned by `integration-test-review` Gate 1's Mutation Probe Ledger (tool path + manual fallback, ledger required either way). Report the setup gap here, the assertion gap there, never both. → `harness-setup` (sensor design) · `integration-test-review` (per-change enforcement)
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — performance **MEASURED by something that RUNS and CAN FAIL**, not reasoned about. The companion gates can be fully satisfied by a system that has never once been run against a large dataset; this is the executable counterpart. Requires: a runnable perf tier with a documented command (it belongs in the tier matrix); on-demand **realistic volume AND realistic shape** — distribution, cardinality, skew, not a million identical rows; **named latency/throughput/memory budgets the run ASSERTS** (a perf test that only reports numbers is a dashboard, and eventually nobody reads it); growth compared across **≥2 volumes ~10× apart**, because one data point cannot distinguish O(n) from O(n²); and resource exhaustion as a **tested, bounded** outcome — backpressure, paging or a clean error rather than an OOM kill, with unbounded result-sets, unbounded in-memory accumulation and unbounded concurrency provably absent or bounded on the paths that matter. State whether a number is a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Every project is fast on day one; the foundation question is whether the tenth module costs what the second did. Requires: the affected module/sub-domain set is **COMPUTABLE** because inter-module dependencies are explicit and declared; incrementality and caching are real and **measured** (claimed caching that never hits is an invisible failure); boundaries enforced **MECHANICALLY**, since unenforced boundaries decay silently until the affected set is "everything"; a **declared** architecture style (modular monolith / clean / hexagonal / layered — which one matters far less than that one is declared, written down and enforced, because an undeclared style is indistinguishable from none after two years); implementation hidden behind abstraction so a technology swaps without touching business code (depth → `complexity-prevention`); and a fast scoped inner-loop check — if the only available check is the slow exhaustive one, that is the finding. **Scope boundary:** `architecture-scalability-review` **G2 Build & CI Scalability** already SCORES incremental/affected-only/caching/monorepo posture and **G4** scores boundary enforcement — where that review has run, cite its verdict rather than re-scoring; this gate only confirms the dimension was examined and is not silently absent. → `architecture-scalability-review` (G2/G4 depth) · `architecture-review` (diff-level boundary drift) · `complexity-prevention` (cost of change in the code itself)
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — no human reviewer spends attention on a defect class a machine could have caught; reviewer attention is the scarcest resource in the project. **Account for EVERY class or record it `N/A` with a reason** — an unlisted class is an unexamined one: formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI must run the **SAME** command, configuration and version (divergence means CI failures nobody can reproduce); checks must **ENFORCE**, not warn (an unread warning stream is not a harness); strictest reasonable defaults, loosened only with a recorded reason, since a large silent suppression list is itself a finding; cheap checks first, expensive last. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the existing baseline — which counts as `PRESENT`, not partial, because it stops regression from day one. → `linter-setup` · `harness-setup` · `security-review`
> 3. **Assign one verdict per dimension:** `PRESENT` (achieved and proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap named + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS here, never a gap; never report it as a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked — say so honestly; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority is context-split — the one place this gate differs from its two companions.** **CREATING** a foundation (greenfield init, scaffold, a plan standing up build/test/CI) → a `MISSING-WARRANTED` dimension is **BLOCKING**: you are choosing the foundation right now, so omitting a warranted one must be an explicit decision, not a silent default. **AUDITING** an existing foundation (brownfield review, architecture audit, changes review) → **ADVISORY ONLY**: emit the matrix plus a prioritized adoption path and **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**. — why the split: the cost of adding a foundation is near zero at creation and high afterwards, so strictness should track that cost; blocking a review of a ten-year-old codebase on foundations it never had produces a useless report, not a better project.
> 5. **Anti-over-engineering guard (first-class, and symmetric).** Do NOT demand a container mode of a single-author local utility, a distributed load-generation platform for a small internal service, affected-set computation or boundary enforcement for a single module, or four overlapping analyzers reporting one defect class (the carrying cost is noise and slow builds, and people learn to ignore the output). Splitting a small system into many modules to _look_ modular buys a distributed monolith — the coupling survives the split while the build cost doubles; the trigger is real module and team count, never aesthetics. Symmetric with the criticality floor: never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names the smallest next step that is valuable on its own.** Seven `MISSING-WARRANTED` verdicts with no first step is a demoralizing document nobody acts on. Default ladder, each rung independently valuable and making the next cheaper: pin the toolchain & commit the lockfile → make one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence, and say why; what is not acceptable is a gap list with no first step.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, preceded by the derived profile with per-axis evidence and confidence, followed by the ordered adoption path (brownfield) or the blocking list (greenfield). Full catalog — per-dimension proof lists, warranting matrix, adoption ladder → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:scaffold-production-readiness:reminder -->

Assess quality, error handling, async interaction, runtime/deployment, and integrations against project config and the actual target. Include and verify applicable foundations; mark the rest `N/A` with a reason. Do not require UI, containers, a broker, or a test layer the project does not use.

<!-- /SYNC:scaffold-production-readiness:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Generate a copy-ready architecture foundation that follows the project's chosen paradigm, conventions, and applicable quality gates before feature implementation.

**MUST ATTENTION — Main steps (execute ALL, in order; AI keeps forgetting these):** (1) Read Plan → (2) Generate the applicable Backend and/or Frontend/UI checklist → (3) Validate Against Plan → (4) Present to User via `AskUserQuestion` → (5) Scaffold only the abstractions and foundations selected by the plan → (6) Verify the project build, chosen architecture, and Verification Gate → invoke `/linter-setup` → `/harness-setup` → `AskUserQuestion` handoff. NEVER skip, reorder, or merge a step without explicit user approval.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases; link parent when nested.
- **Project Reference Docs Guide:** Read required project docs; ALWAYS include `lessons.md`.
- **Critical Thinking Mindset:** Traced proof per claim; confidence >80% to act.
- **Understand Code First:** Grep 3+ patterns, read code before modifying.
- **Project Foundation Selection:** Verify selected foundations; record evidence for skipped categories.
- **Harness Setup:** Verify the selected checks enforce their stated intent; line coverage is diagnostic, not a behavioral quality gate.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**MANDATORY IMPORTANT MUST ATTENTION** check Activation Guards FIRST — proceed ONLY in `workflow-greenfield-init`/`workflow-big-feature` AND when grep finds NO existing base/abstract/infrastructure scaffolding; otherwise SKIP and mark step completed — why: re-scaffolding an established project duplicates foundations and corrupts existing abstractions.
**MANDATORY IMPORTANT MUST ATTENTION** grep 3+ existing base/abstract/infra patterns (`abstract class.*Base`, `interface I\w+<`, `IRepository`, `base.*component`, DI registration) and cite `file:line` BEFORE generating any scaffolding — existing scaffolding found = SKIP — why: scaffolding over real foundations is the failure the Activation Guards exist to prevent.
**MANDATORY IMPORTANT MUST ATTENTION** BLOCK `/feature-implement` until the Verification Gate passes — selected foundations are verified or explicitly `NOT-APPLICABLE`, and `/linter-setup` plus `/harness-setup` complete their selected work — why: code shipped without the project's warranted quality gates is technical debt from day one.
**MANDATORY IMPORTANT MUST ATTENTION** delegate ALL sensor setup to `/linter-setup` then `/harness-setup` — NEVER hand-configure linters/formatters/pre-commit hooks in this skill — why: a checklist of installs is not a harness; the harness skills wire each control to its lifecycle stage.
**MANDATORY IMPORTANT MUST ATTENTION** when the chosen architecture uses base abstractions, apply its relevant design principles (including SOLID where appropriate) and keep each base focused — why: an unnecessary or oversized base spreads its design flaw to every dependent feature.
**MANDATORY IMPORTANT MUST ATTENTION** the checklists are TEMPLATES — self-investigate the chosen tech stack, adapt naming to framework conventions, skip irrelevant items, and confirm the final checklist via `AskUserQuestion` before generating code — NEVER auto-decide scope — why: scaffolding the wrong stack's idioms forces a costly rewrite before any feature lands.
**MANDATORY IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby pattern — closest example ≠ matching preconditions; verify the new context shares the same base classes, scope, and lifetime — why: a foundation lifted from a mismatched context fails silently.
**MANDATORY IMPORTANT MUST ATTENTION** assert that tests protect intended outcomes; use mutation or property tools where the stack and risk justify them, and do not treat line coverage as behavioral proof — why: a test can execute code without asserting its intent.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` proof + confidence % for EVERY claim (>80% to act, <60% DO NOT recommend) — NEVER present a guess as fact — why: speculation without evidence is the root of hallucinated foundations.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting, mark one `in_progress`, mark `completed` immediately after evidence lands, and add a final review todo — why: external task state survives context compaction; memory does not.
**MANDATORY IMPORTANT MUST ATTENTION** after scaffold, present `/feature-implement` vs `/workflow-review-changes` vs skip via `AskUserQuestion` — the user decides; do NOT skip because it "seems obvious" — why: the user owns the handoff decision.

**Anti-Rationalization (Closing — reject these excuses):**

| Excuse the model tells itself                          | Reality                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "It's a new feature, just scaffold it"                 | Check Activation Guards first — wrong workflow OR existing scaffolding = SKIP and mark completed.  |
| "Already searched for base classes"                    | Show `file:line` grep evidence for all 6 guard patterns. No proof = no search.                    |
| "I'll just configure the linter inline, it's quick"    | NEVER hand-configure sensors — delegate to `/linter-setup` then `/harness-setup`. Installs ≠ harness. |
| "Coverage is high, the foundation is well-tested"      | Line coverage is a diagnostic, not proof. Check whether assertions protect intended outcomes; use mutation tools when they fit. |
| "The stack is obvious, skip the AskUserQuestion"       | Checklists are templates — confirm the adapted final checklist with the user before generating code. |
| "Found a nearby base class, just copy it"              | Evaluate fit first — same base classes/scope/lifetime? Closest ≠ matching. Verify before reusing.  |
| "Scaffold's done, jump straight to /feature-implement" | BLOCKED until the Verification Gate passes — applicable foundations + `/linter-setup` + `/harness-setup`. |

**IMPORTANT MUST ATTENTION** check Activation Guards FIRST (SKIP if existing scaffolding or wrong workflow) · BLOCK `/feature-implement` until the Verification Gate passes · cite `file:line` + confidence >80% for every claim.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
