---
name: scaffold
description: '[Architecture] Use when a workflow step or the user asks for project scaffolding. Builds foundations and golden-path examples selected by the target project architecture before feature implementation.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

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
- **Ordered main flow:** (1) Activation Guards → (2) Read Plan → (3) Generate the applicable Backend and/or Frontend/UI checklist → (4) Validate against Plan → (5) confirm by asking the user directly → (6) scaffold approved abstractions + applicable foundations + examples → (7) verify build, architecture, testability, and Verification Gate → (8) `$linter-setup` → `$harness-setup` → ask the user directly handoff.
- **Testability gate:** Resolve Unit/Integration/System/E2E and warranted Performance/Scale applicability or evidence-backed `N/A`; record owner/root/data, copy-ready full/focused commands, zero-match failure, CI/simple Windows/macOS/Linux entry, host/container modes, environment reach, identity, idempotent/additive isolation, and repeat proof. Unresolved applicable fields block; do not invent E2E coverage.
- **Non-negotiables:** Existing scaffolding or wrong workflow → SKIP and mark completed; every plan decision maps to a checklist item; applicable project foundations must pass; sensor setup only via `$linter-setup` then `$harness-setup`; block `$feature-implement` until verification passes; cite evidence and confidence.

**Workflow (after Activation Guards, in order):** Read Plan → Generate Checklist → Validate Against Plan → ask the user directly confirmation → Scaffold → Verify → `$linter-setup` → `$harness-setup` → ask the user directly handoff.

**Key Rules:**

- **MUST ATTENTION** use evidence to resolve applicability, scope, and completion; **NEVER** guess missing runners, commands, or patterns.
- **MUST ATTENTION** treat checklists as adaptable templates and confirm the final checklist before generating code.
- **MUST ATTENTION** apply the project's selected architecture and applicable design principles, verify required foundations, and keep `$feature-implement` blocked until the Verification Gate passes.

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
3. **If existing scaffolding found → SKIP.** Log: "Existing scaffolding detected at {file:line}. Skipping $scaffold step." Mark step as completed.
4. **If NO foundational abstractions found → PROCEED** with full scaffolding workflow below.

## When to Use

- After the second `$plan` + `$plan-review` in greenfield-init or big-feature workflows, before `$feature-implement`.
- When a new service/module needs its own base architecture and no foundation exists.
- **NOT** when the project already has established base classes and infrastructure

## Workflow

1. **Read Plan** — Parse architecture decisions, tech stack, and domain model.
2. **Generate Scaffolding Checklist** — Cover applicable abstractions and infrastructure identified by the plan, using the Backend and/or Frontend/UI categories below.
3. **Validate Against Plan** — Map every architecture decision to a scaffolding item.
4. **Present to User** — Use ask the user directly to confirm the checklist before code generation.
5. **Scaffold** — Create only the abstractions, infrastructure, and examples selected by the plan and supported by project conventions.
6. **Verify** — Build; validate the selected architecture, testability, and the Verification Gate; then invoke `$linter-setup` → `$harness-setup` and present the ask the user directly handoff.

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
- [ ] **Discovery gate (`SYNC:ai-discovery-doc-quality`):** each UI convention doc created here leads with its purpose, when to read it and its critical rules, and is routed from the docs index or root context — select it in `referenceDocs` through `$project-config` so the generated Doc Lookup routes it; a doc nothing routes to is never read.

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

Read the completed `architecture-design` Testability & Execution Contract matrix before generating examples. Resolve every tier in the scaffold report and carry the same decisions into `$harness-setup`:

| Tier | Required scaffold output |
| --- | --- |
| Unit | Create or document one applicable pure/domain example, its runner/root, full and focused commands, zero-match failure behavior, CI gate, and simple Windows/macOS/Linux entry point. |
| Integration/System | Create or document one applicable public-path example, its runner/root, full and focused commands, zero-match failure behavior, CI gate, and simple Windows/macOS/Linux entry point. |
| E2E | Create or document one applicable configured-browser journey and commands; if no framework/configuration/command is evidenced, record `N/A — {evidence}` and create no invented browser example. |

For each applicable persistent tier, the handoff also records the run/test identity and unique business-data suffix, supported public setup path, realistic valid data, count-before-create idempotent/restart-safe reference setup, additive/no-reset accumulation, mutable-root and parallel-worker isolation, realistic pacing/arrange barrier, exact result, and two consecutive no-reset full runs. If scaffold has not executed the commands yet, record `planned — {owner}` rather than claiming a pass. Include these contract rows in the existing user-confirmed final checklist; unresolved material tool choices still use the existing ask the user directly gate.

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

**MANDATORY MUST ATTENTION** delegate ALL computational sensor setup to `$linter-setup`:

- Do NOT manually configure linters, formatters, or pre-commit hooks in this skill
- `$linter-setup` handles: tool research → install → configure → pre-commit hooks → CI gates
- `$harness-setup` handles: full harness inventory (feedforward guides + all feedback types)

**WHY:** Code quality tooling is part of the project's outer agent harness. A checklist of installs is not a harness — a harness is a system of guides and sensors where each control fires at the right lifecycle stage and produces signals the agent can consume.

**After scaffold, invoke for applicable selected work (in order):**

1. `$linter-setup` — computational feedback sensors (deterministic, fast, always-on)
2. `$harness-setup` — full harness inventory (all feedforward guides + all feedback sensors)

**Do NOT proceed to `$feature-implement` until both complete.** (`$scaffold` verification gate enforces this)

## Project Foundation Selection (MANDATORY assessment; foundations are conditional)

> **Scaffold Production Readiness** — See the `SYNC:scaffold-production-readiness` block above for the full inline protocol. (Written WITHOUT the HTML-comment delimiters on purpose: a literal open marker in prose is counted as a second opening fence by `sync-update-blocks.py`, which then refuses the file as unbalanced and silently leaves the block stale.)

Assess each concern against the project profile and architecture report. Generate only foundations the runtime, users, delivery model, and real boundaries need; record `NOT-APPLICABLE` with evidence for the rest. Do not create frontend, HTTP, database, container, or integration infrastructure merely to satisfy this checklist. Use project configuration and accepted decisions first, then confirm material choices with the user.

### 1. Code Quality Tooling

Handled by `$linter-setup` skill — do NOT duplicate here.
Verify the configured formatter, linter, type/static analysis, or other applicable quality checks. Require files/hooks only when the chosen toolchain uses them; if missing, invoke `$linter-setup` for that concern.

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

If an architecture report exists (from `$architecture-design`), read the "Scaffold Handoff — Tool Choices" table and use those selections instead of re-asking the user.

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
5. **Use ask the user directly** — Confirm final checklist with user before generating code

## Output

After scaffolding is complete:

1. **Scaffolding Report** — List created files and evidence-backed `NOT-APPLICABLE` decisions
2. **Build Verification** — Run the project's configured build, package, or type-check command when applicable
3. **Architecture Diagram** — Optional; include only when it clarifies the selected architecture
4. **Foundation Verification** — Verify each selected concern; skipped concerns include reasons
5. **Config Files Generated** — List only files selected for this project profile
6. **Golden-Path Examples** — selected, applicable examples under the chosen isolated location, if examples improve adoption
7. **Testability Contract Resolution** — applicable tiers have owner/runner, commands, environment reach, data policy, and evidence-backed applicability

## Verification Gate (MANDATORY before proceeding to $feature-implement)

Verify each selected, applicable foundation from the project readiness protocol:

- [ ] Every category is selected or has an evidence-backed `NOT-APPLICABLE` reason.
- [ ] Selected code quality checks run through the project's chosen local/CI path.
- [ ] The runtime's error contract is covered; UI loading-state checks apply only when the project has asynchronous user-facing UI.
- [ ] Each supported or required execution mode is verified; a second mode is not required without project evidence.
- [ ] Real outbound/integration boundaries and their important success/failure outcomes are covered.
- [ ] `$linter-setup` and `$harness-setup` complete the controls selected for this project.
- [ ] Golden-path examples are present only for selected patterns where they improve adoption, and follow the project's build/test conventions.
- [ ] The testability contract records applicable tiers, commands, environment reach, data policy, and evidence.

**BLOCK proceeding to `$feature-implement` if a selected verification fails or a material applicability decision is unresolved.** Fix issues first, then re-verify.

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, MUST ATTENTION use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$feature-implement (Recommended)"** — Begin implementing feature stories on top of the scaffolding
- **"$workflow-review-changes"** — Review scaffolding code before proceeding
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `harness-setup` — Agent quality harness: feedforward guides and feedback sensors; setting up an agent quality harness → .claude/skills/shared/protocols/harness-setup.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `scaffold-production-readiness` — Foundation areas a scaffold must cover or mark not applicable; scaffolding a project foundation → .claude/skills/shared/protocols/scaffold-production-readiness.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Generate a copy-ready architecture foundation that follows the project's chosen paradigm, conventions, and applicable quality gates before feature implementation.

**MUST ATTENTION — Main steps (execute ALL, in order; AI keeps forgetting these):** (1) Read Plan → (2) Generate the applicable Backend and/or Frontend/UI checklist → (3) Validate Against Plan → (4) Present to User by asking the user directly → (5) Scaffold only the abstractions and foundations selected by the plan → (6) Verify the project build, chosen architecture, and Verification Gate → invoke `$linter-setup` → `$harness-setup` → ask the user directly handoff. NEVER skip, reorder, or merge a step without explicit user approval.

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
**MANDATORY IMPORTANT MUST ATTENTION** BLOCK `$feature-implement` until the Verification Gate passes — selected foundations are verified or explicitly `NOT-APPLICABLE`, and `$linter-setup` plus `$harness-setup` complete their selected work — why: code shipped without the project's warranted quality gates is technical debt from day one.
**MANDATORY IMPORTANT MUST ATTENTION** delegate ALL sensor setup to `$linter-setup` then `$harness-setup` — NEVER hand-configure linters/formatters/pre-commit hooks in this skill — why: a checklist of installs is not a harness; the harness skills wire each control to its lifecycle stage.
**MANDATORY IMPORTANT MUST ATTENTION** when the chosen architecture uses base abstractions, apply its relevant design principles (including SOLID where appropriate) and keep each base focused — why: an unnecessary or oversized base spreads its design flaw to every dependent feature.
**MANDATORY IMPORTANT MUST ATTENTION** the checklists are TEMPLATES — self-investigate the chosen tech stack, adapt naming to framework conventions, skip irrelevant items, and confirm the final checklist by asking the user directly before generating code — NEVER auto-decide scope — why: scaffolding the wrong stack's idioms forces a costly rewrite before any feature lands.
**MANDATORY IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby pattern — closest example ≠ matching preconditions; verify the new context shares the same base classes, scope, and lifetime — why: a foundation lifted from a mismatched context fails silently.
**MANDATORY IMPORTANT MUST ATTENTION** assert that tests protect intended outcomes; use mutation or property tools where the stack and risk justify them, and do not treat line coverage as behavioral proof — why: a test can execute code without asserting its intent.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` proof + confidence % for EVERY claim (>80% to act, <60% DO NOT recommend) — NEVER present a guess as fact — why: speculation without evidence is the root of hallucinated foundations.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting, mark one `in_progress`, mark `completed` immediately after evidence lands, and add a final review todo — why: external task state survives context compaction; memory does not.
**MANDATORY IMPORTANT MUST ATTENTION** after scaffold, present `$feature-implement` vs `$workflow-review-changes` vs skip by asking the user directly — the user decides; do NOT skip because it "seems obvious" — why: the user owns the handoff decision.

**Anti-Rationalization (Closing — reject these excuses):**

| Excuse the model tells itself                          | Reality                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "It's a new feature, just scaffold it"                 | Check Activation Guards first — wrong workflow OR existing scaffolding = SKIP and mark completed.  |
| "Already searched for base classes"                    | Show `file:line` grep evidence for all 6 guard patterns. No proof = no search.                    |
| "I'll just configure the linter inline, it's quick"    | NEVER hand-configure sensors — delegate to `$linter-setup` then `$harness-setup`. Installs ≠ harness. |
| "Coverage is high, the foundation is well-tested"      | Line coverage is a diagnostic, not proof. Check whether assertions protect intended outcomes; use mutation tools when they fit. |
| "The stack is obvious, skip the ask the user directly"       | Checklists are templates — confirm the adapted final checklist with the user before generating code. |
| "Found a nearby base class, just copy it"              | Evaluate fit first — same base classes/scope/lifetime? Closest ≠ matching. Verify before reusing.  |
| "Scaffold's done, jump straight to $feature-implement" | BLOCKED until the Verification Gate passes — applicable foundations + `$linter-setup` + `$harness-setup`. |

**IMPORTANT MUST ATTENTION** check Activation Guards FIRST (SKIP if existing scaffolding or wrong workflow) · BLOCK `$feature-implement` until the Verification Gate passes · cite `file:line` + confidence >80% for every claim.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
