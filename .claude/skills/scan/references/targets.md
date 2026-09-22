# Scan Targets Manifest

> The `/scan --target=<key>` host (`../SKILL.md`) loads ONE entry from this file per run. Each entry is the single source of truth for that scan: doc path, sub-agent count + roles, Phase-0 detection tables, verbatim sub-agent Think scopes, output Target Sections, Content-Rule exceptions, target-unique Special slivers, and the target-specific Anti-Rationalization rows. The shared 4-phase engine + SYNC blocks live ONCE in the host body — this manifest carries only the per-target DATA.

> **Portability rule:** Host-owned instruction files keep their native skill-invocation prefix. Content written into shared generated project docs MUST instead use bare skill names without a host-specific prefix, unless it explicitly documents every supported host syntax.

**Registered keys:** `project-structure` · `backend-patterns` · `frontend-patterns` · `scss-styling` · `design-system` · `code-review-rules` · `domain-entities` · `feature-spec` · `docs-index` · `e2e-tests` · `integration-tests` · `seed-test-data` · `ui-system`. `generic-reference-doc` is a reserved dynamic target described below. These targets form an optional capability catalog, not a list of scans every project should run.

## Selection and Applicability

- `docs/project-config.json` (or its configured path) is OPTIONAL. With no config, scan on the portable defaults and repository evidence — do not refuse to scan. When present it must be schema-valid with a non-empty `project.name`; omitted capability properties use neutral defaults or skip that capability, while a DECLARED invalid section blocks scanning of that capability (its author made it authoritative, so a silent default would mis-scan).
- Resolve `referenceDocs` through `.claude/hooks/lib/session-init-helpers.cjs`. When absent, a minimal project with no evidenced capabilities resolves to no task-specific docs and only evidence-supported capabilities add docs. An explicit array, including `[]`, is the exact task-specific selection.
- The always-on `lessons.md` and docs-index inputs are ensured by project initialization outside this task-specific selection. Do not add them to the selection or use them as evidence that a code capability exists.
- For each selected task-specific document, match its filename exactly to one built-in `doc` below. Custom `referenceDocs` entries can declare `filename`, `purpose`, optional `sections`, `templatePath`, and `scanTarget`. A custom doc defaults to manual ownership; only `scanTarget: "generic"` opts it into the evidence-based dynamic scanner. Built-in docs keep their framework-owned target.
- Each target's `applies when` and `skip when` lines define its portable evidence gate. Explicit selection requests the check but does not replace capability evidence. A missing capability is `SKIPPED` with the config/source evidence checked; it is never filled by generic example code.
- Configured paths and framework names are search hints that must be verified in repository sources. Do not infer architecture, test lanes, domain concepts, or design-system ownership from dependencies, empty folders, filenames, or target names alone.

## Dynamic Target: generic-reference-doc

Use `/scan --target=generic-reference-doc --filename="<relative-path>"` only when that exact filename is selected in `referenceDocs` with `scanTarget: "generic"`. A custom entry without `scanTarget`, with `scanTarget: "manual"`, or outside the resolved selection is not scannable. Custom paths use project-relative POSIX segments beneath `<ref>/`; reject traversal, absolute paths, backslashes, and physical symlink escapes.

The selected entry's `purpose` defines the question the reference should answer; its optional `sections` define the requested headings. If no sections are configured, derive a small neutral outline from the purpose and evidence rather than importing another target's template. Inspect only sources that answer that purpose, record unknowns explicitly, and describe observed practices and trade-offs without requiring a particular language, framework, architecture, testing model, or styling system. Write only the configured output file, using the shared no-op stamp guard and normal scan evidence rules. Generic docs are conservatively impact-routed after non-disposable repository changes because the config does not declare a narrower source scope; choose `manual` when the project owner wants curated updates without automatic scan/freshness claims.

**Path roots used throughout this manifest.** Every `**doc:**` output path, `/prompt-enhance` argument, glob and probe below is written against one of these two roots — resolve the root FIRST, then compose:

- `<ref>/` = the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. Resolve: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getDocsRoot('projectReference'))"`. Built-in targets own only their declared output filenames; project-config may also declare custom filenames, but does not map them to a built-in scan.
- `<specs>/` = the business/feature spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path. Resolve: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getSpecDocsPath())"`.

**Confidence vocab note:** most targets use sub-agent confidence tiers `>80% document / 60-80% "observed (unverified)" / <60% omit`. `code-review-rules` instead classifies rules HIGH / MEDIUM / LOW. `domain-entities` uses %-based thresholds. Honor the per-entry vocab.

---

## Target: project-structure

- **doc:** `<ref>/project-structure-reference.md`
- **applies when:** project-owned source, build/runtime configuration, operational manifests, or maintained architecture docs provide evidence about the system's structure or operation.
- **skip when:** the repository contains only required project identity/config and no source, operational manifests, or project-owned architecture evidence.
- **description:** `[Documentation] Use when mapping evidenced project structure, stack, modules, operations, and deployment.`
- **sub-agents:** up to 3 conditional branches — Agent 1: Source, modules & entry points · Agent 2: Application surfaces & integrations · Agent 3: Runtime, delivery & operations. Dispatch only branches supported by repository evidence.

### Phase 0 detection — complete before writing; unsupported classifications remain `UNKNOWN`

Step 1 — Read the target doc, configured project map, and repository-owned manifests. Detect Init (missing/placeholder) or Sync (populated); in Sync mode update only stale or newly evidenced sections.

Step 2 — Build an evidence inventory. Configured paths and module names are search hints; verify them against files, entry points, imports, build/run scripts, or authoritative project docs before documenting them.

| Evidence | Possible finding | Rule |
| --- | --- | --- |
| Language/build manifests, workspace files, source entry points | Languages, buildable/runnable units, modules, and their verified dependencies | Use the manifest and code structure that actually exist; unfamiliar stacks are not a reason to stop. |
| Application entry points, package boundaries, imports, API/CLI/job handlers | Application surfaces and module boundaries | Name an architecture style only when independent deploy/ownership evidence supports it; directory names alone are insufficient. |
| Database/schema/migration, message, or external-adapter definitions and their callers | Data stores and integrations | Document only verified connections and ownership; a declared dependency alone does not prove runtime use. |
| Container, local orchestration, service-manager, or deployment manifests | Runtime/deployment units, startup, and configured ports | Do not infer direct-run behavior, service boundaries, or default ports from missing files. |
| CI/workflow/pipeline and infrastructure-as-code files | Build, verification, deployment, and environment flow | Inspect the actual jobs and referenced scripts; supported providers and file layouts are open-ended. |
| Environment/configuration files or secret-manager references | Setting keys and secret-reference mechanisms | Record names and locations only; never include values. |

Step 3 — Describe architecture and execution boundaries only to the confidence supported by that inventory. `Monorepo`, `monolith`, `modular monolith`, and `microservices` are possible descriptions, not required categories. Use `UNKNOWN` when repository evidence cannot settle the boundary; continue with confirmed facts.

Step 4 — Detect runtime orchestration from actual manifests and commands, when present. Examples include container compose files, cluster manifests, process supervisors, serverless deployment configs, and local service scripts; this list is not exhaustive. No orchestration file is not evidence that the application runs directly.

Step 5 — Detect delivery and deployment configuration from repository evidence. Common CI and infrastructure filenames are search examples, not an allowlist; inspect discovered files and their referenced definitions. If no pipeline or IaC is found, report that limited observation without inventing a provider or delivery process.

Step 6 — Read optional project-config sections only when valid and present (for example, module roots or runtime/deployment hints). Corroborate each material hint with repository evidence; omitted sections are normal and do not block a scan.

**Evidence gate:** An architecture, runtime, or delivery label must be backed by source/configuration or authoritative project documentation. Record uncertainty and continue with verified sections; do not let an unknown label suppress unrelated evidence.

### Sub-agent Think scopes

**Agent 1: Source, modules & entry points** (run when source/build structure exists)
- **Think:** Which source roots, packages, executables, libraries, jobs, and entry points are real? How do imports, build definitions, and callers establish ownership or dependencies?
- Scan targets: configured source/module roots after verifying them; workspace/build manifests; entry points and their callers; actual package boundaries and shared dependencies. Use examples only as search cues, adapt to the languages and build tools found, and cite `file:line` or manifest location.

**Agent 2: Application surfaces & integrations** (run when application or integration surfaces exist)
- **Think:** Which user/application surfaces and external boundaries are supported by source evidence? Which behavior is hosted in a web, mobile, desktop, API, command-line, worker, or other surface, if any?
- Scan targets: evidenced app entry points, routes/handlers, clients, adapters, event/message contracts, and integration call sites. Do not infer a frontend/backend split, microservice, or runtime integration from a dependency alone.

**Agent 3: Runtime, delivery & operations** (run when runtime/deployment/configuration evidence exists)
- **Think:** What starts the system, what dependencies must be available, and how are builds or deployments promoted? Which commands, ports, environment keys, and secret references are actually defined?
- Scan targets: repository-owned runtime/deploy manifests, local scripts, CI workflows and referenced scripts, IaC, application settings, and project-defined readiness/rollback behavior. Record only source-backed facts, including secret-reference names and mechanisms, never secret values.

### Target Sections

Include only sections supported by evidence; omit inapplicable sections rather than leaving framework-shaped placeholders.

| Section | Include when evidence supports it |
| --- | --- |
| **Repository scope & architecture** | Verified repository/workspace boundary, runnable or buildable units, and module ownership. State an architecture label only when its meaning is supported. |
| **Applications & entry points** | Actual user-facing surfaces, APIs, CLIs, jobs, libraries, or other executable entry points. |
| **Runtime & integrations** | Configured runtime units, data stores, external systems, ports, and their verified relationships. Omit ports that are not explicitly configured. |
| **Build, delivery & operations** | Commands, CI stages, IaC, environments, promotion, or rollback only when repository/project docs define them. |
| **Environment & secret configuration** | Setting keys, source locations, and secret-reference mechanisms only; never values. |
| **Languages & toolchain** | Technologies and versions from actual manifests; preserve ranges as ranges and never infer a pinned version. |
| **Source organization** | Short purpose notes for relevant verified roots when useful; no full directory tree or unsupported layer taxonomy. |

### Content Rules / exceptions
Follow shared `output-quality-principles` (no full trees/counts/TOCs). Cite every command, boundary, runtime setting, version, and architecture claim to the source that establishes it. Do not claim missing, deprecated, active, or production status from path names alone. If source evidence is incomplete, state the verified scope and what remains unknown.

### Special slivers
- Only scan/dispatch branches whose evidence gate passes; `UNKNOWN` is a valid result for unresolved architecture, runtime, or delivery details and does not block other verified findings.
- If documenting ports, read them from the owning configuration and verify every cited value; never use framework defaults from memory.
- Resolve configured roots and module lists only through the valid project config. Corroborate hints with source; omitted optional sections do not imply absence of a capability.
- **Secret safety is mandatory:** record secret-reference names, file locations, and mechanisms only. Never copy secret values, tokens, credential-bearing connection strings, or private keys into reports or docs. Before write, inspect the generated text for accidental secret-shaped values, including assignment and JSON/YAML forms, common token prefixes, PEM headers, and long encoded blobs. Redact any finding; do not repeat the value.
- Verify every cited path, command, version, runtime boundary, and setting against the evidence before writing. Actual versions come from manifests; if only a range is declared, document the range.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Directory names prove the architecture" | Trace manifests, entry points, imports, and ownership; label uncertainty when they do not settle it. |
| "A standard port or command is implied by the framework" | Read the owning config or script and cite the exact source; omit unsupported defaults. |
| "This project must have a frontend, backend, or service table" | Include only evidenced application surfaces and runtime units; the target is stack-neutral. |
| "No familiar CI filename means no delivery workflow" | Search repository-owned pipeline/build definitions and their references; do not treat examples as an allowlist. |
| "The project config is optional because the repository looks clear" | The config file and required `project.name` are part of the scan contract; optional capability sections may be absent. |
| "Copy environment values for completeness" | Record setting keys and secret-reference names/mechanisms only; never publish values. |

### prompt-enhance
`/prompt-enhance <ref>/project-structure-reference.md`

---

## Target: backend-patterns

- **doc:** `<ref>/backend-patterns-reference.md`
- **applies when:** server-side API, service, persistence, messaging, or migration code/config exists; record only patterns present in this project.
- **skip when:** no server-side application or service code is evidenced, even if a backend framework appears only in a dependency list or roadmap.
- **description:** `[Documentation] Use when recording evidenced server-side code organization, data access, validation, messaging, and persistence patterns.`
- **sub-agents:** up to 4 conditional branches — data access/persistence; request, business-logic, and validation flow; async/integration boundaries; evidence-based quality review (**only for branches present in the project; quality review follows discovery**).

### Phase 0 detection — capability and mode gate

Step 1 — Read the selected output and its configured template/sections. Detect Init (placeholder) or Sync (populated); in Sync mode preserve local sections and recheck evidence for staleness rather than assuming existing content is current.

Step 2 — Identify server-side languages, frameworks, services, persistence, and test organization from valid project config and actual source/manifests. Treat config as a search hint, verify it against source, and support frameworks not listed in examples below. Never stop solely because a stack is unfamiliar.

Use repository manifests, entry points, route/controller handlers, storage clients, queries, migrations, job/event registrations, and configured module paths as evidence. Record only capabilities actually found; examples such as repositories, CQRS, ORM, event handlers, and background jobs are search lenses, not required architecture.

Step 3 — Resolve configured service/module paths when declared, then verify the paths exist. If a supported code graph is available, use it for relevant call chains; otherwise trace callers and dependencies directly from source.

**Evidence gate:** If framework identity remains uncertain, report `UNKNOWN` and continue only with generic, source-evidenced observations. Do not invent framework-specific conventions or block an otherwise useful generic scan.

Phase 1 — derive only observed conventions: request flow, business-rule ownership, data access and transaction boundaries, validation/error behavior, async messaging/jobs, migrations, configuration, and authorization. Mark absent capabilities `NOT APPLICABLE`; do not recommend or require a pattern merely because it is common.

### Sub-agent Think scopes

**Agent 1: Data Access & Persistence** (only when present)
- **Think:** How does this project read/write data, enforce ownership, and define transaction boundaries? Which layer owns queries, mapping, and persistence concerns?
- Scan targets: actual repositories, query/command modules, ORM or query-builder use, data mappers, entities/models/records, transaction and unit-of-work boundaries, migrations, and schema definitions. Do not assume a repository, ORM, base class, or layer hierarchy.

**Agent 2: Request, Business Logic & Validation Flow** (only when present)
- **Think:** How does an input travel through the application? Where are business rules, validation, errors, authorization, and response mapping owned?
- Scan targets: actual routes/controllers/handlers/actions, request validation and error formats, business-rule placement, result/response types, authorization boundaries, and observed command/query separation when used. Treat CQRS, pipelines, decorators, and particular validation libraries as optional implementation choices.

**Agent 3: Async & Integration Boundaries** (only when present)
- **Think:** Which operations cross process, service, queue, or time boundaries? How are failures, retries, ordering, idempotency, and ownership handled?
- Scan targets: verified event/message producers and consumers, scheduled/background work, external service calls, middleware or cross-cutting pipelines, dependency registration, and migration behavior. Preserve producer/consumer and contract evidence; do not infer an event-driven or microservice architecture from a queue dependency alone.

**Agent 4: Evidence-Based Quality Review** (only after applicable discovery)
- **Think:** Does the observed implementation violate a documented local rule, declared architecture boundary, correctness/security invariant, or an evidenced consumer contract?
- Review only those risks. Do not classify a pattern as an anti-pattern because it differs from a preferred architecture. Cite each finding; when the project has a severity rubric, apply it; otherwise describe impact and confidence without inventing severity labels.

### Target Sections

Use the output sections declared by the selected reference-doc profile/template. If none are declared, organize the reference around the capabilities found: request flow; business-rule and data ownership; persistence/transactions; validation/errors/security; async/external boundaries; configuration/deployment; and verified risks. Omit areas with no evidence, and never create required headings for absent patterns.

### Content Rules / exceptions
- Cite actual source and config paths for every convention. Include short code excerpts only when they clarify a pattern and the local output contract allows them.
- Compare observed patterns to project documentation, explicit invariants, and actual consumers. Do not grade architecture by assuming CQRS, repositories, ORM, OOP, DDD, microservices, or a specific layering model is always best.
- Describe strengths, trade-offs, and verified gaps in terms of the project's scale, boundaries, and change needs. Apply local severity/format conventions when they exist; otherwise report evidence and impact directly.
- Keep output sections aligned with the selected local template and the shared `output-quality-principles`.

### Special slivers
- **Conditional branches:** delegate only applicable, independent scans; run the evidence-based quality review after its applicable discoveries.
- Record an anti-pattern only when it violates an evidenced local rule, consumer contract, or correctness/security invariant.
- When a supported project graph is available, use it for relevant call chains; otherwise verify callers and dependencies directly from source.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The stack is unfamiliar, stop the scan" | Record unknown framework details and continue with generic facts that source evidence supports |
| "A familiar pattern is always the right architecture" | Document the choice the project actually makes; evaluate alternatives only against local constraints and evidence |
| "Search only the patterns named in this guide" | Derive search terms from manifests, entry points, dependencies, config, and source |
| "Doc has content, skip re-read" | Show section list extracted from doc as proof of re-read |
| "Examples look right" | Glob-verify ALL file paths + Grep-verify ALL class names — looking right ≠ verified |
| "Round 2 review not needed for small scan" | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable. |

### prompt-enhance
`/prompt-enhance <ref>/backend-patterns-reference.md`

---

## Target: frontend-patterns

- **doc:** `<ref>/frontend-patterns-reference.md`
- **applies when:** user-interface code exists in application routes, views, components, templates, or equivalent project sources.
- **skip when:** the repository has no UI source; do not treat a UI dependency, design mockup, or empty app folder as implementation evidence.
- **description:** `[Documentation] Use when recording evidenced UI composition, state, forms, API use, routing, and styling.`
- **sub-agents:** 3 — Agent 1: Component & Form Patterns · Agent 2: State Management & API Services · Agent 3: Routing, Directives & Directory Structure

### Phase 0 detection — capability, platform, and mode

- Identify UI languages, frameworks, rendering/runtime platform, app paths, and test/config conventions from the valid project config and actual source/manifests. Config is a search hint; verify paths and versions. Framework examples in this file are not an allowlist, and an unfamiliar stack is not a reason to stop.
- Detect actual UI surfaces and classify applicable branches: composition/components/templates; state and data flow; forms/input; routing/navigation; styling; accessibility/platform behavior. Do not scan branches without evidence.

Detect scan mode:

| Mode | Condition | Action |
| --- | --- | --- |
| Init | Target doc doesn't exist or placeholder only | Full scan, create all sections |
| Sync | Target doc has real content | Diff scan — check new base classes, changed patterns |

Read the selected output and configured template/sections. Init mode populates only the selected local contract; Sync mode preserves its existing section roles and rechecks each relevant pattern for staleness. Resolve optional application/module paths from valid config when declared, then verify them; otherwise discover scope from source and repo structure. A declared invalid section blocks under the shared config contract.

**Evidence gate:** If framework identity is incomplete, record `UNKNOWN` and continue with source-evidenced, framework-neutral structure guidance. Prescribe framework-specific patterns only after verifying their use. Ask only when material evidence conflicts or an unresolved owner choice changes the output and repository evidence cannot settle it.

### Sub-agent Think scopes

**Agent 1: UI Composition & Input Patterns** (only when present)
- **Think:** How are views, components, and templates composed? How are inputs and forms validated, errors shown, lifecycle/resources owned, and user actions exposed?
- Scan targets: actual component/view/template abstractions; forms and validation; lifecycle and cleanup only where stateful resources exist; component communication and reuse boundaries. Treat base classes, JSX, directives, signals, and specific framework APIs as optional examples; discover the idioms this project uses.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL convention for the clause-governed dimensions this agent owns — how the five interaction states (default, hover, focus, active, disabled) are expressed, plus loading where it applies (`UI-5.2`); label vs placeholder convention (`UI-7.2`); validation timing (on blur / on keystroke / on submit) and where the error message renders relative to its field (`UI-7.3`); whether entered input survives an error, navigation, or refresh, and the mechanism that preserves it (`UI-7.5`); the touch-target sizing convention against the ≥44×44pt / 8px-apart default (`UI-8.1`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 2: UI State & Data Flow** (only when present)
- **Think:** How does UI state change, how is data loaded or updated, and how are pending/error states and resource lifetimes handled?
- Scan targets: actual state/store mechanisms; API or server-action boundaries; data fetching, caching, race handling, and user-visible state feedback; subscriptions/listeners and cleanup when applicable; shared service/client registration. Do not assume hooks, a store library, client-side fetching, or an API-service layer.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL convention for the state-feedback dimensions this agent owns — the loading, empty, and error state conventions and which layer owns each (`UI-1.5`); whether waits render structure-first skeletons for known layouts or spinners for unknown waits (`UI-9.1`); the optimistic-update pattern if one exists — update-first, reconcile-after, and how a failure rolls back visibly (`UI-9.2`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 3: Navigation & UI Organization** (only when present)
- **Think:** How are navigation, access boundaries, reusable UI behavior, and UI modules organized in this project?
- Scan targets: actual route/navigation declarations and guards; reusable UI extensions where the framework supports them; app/module/package boundaries; UI file organization and build/runtime configuration. Do not assume client-side routing, directives/pipes, lazy loading, a particular workspace tool, or a fixed directory layout.

### Target Sections

Use headings and required sections from the selected project-reference profile/template. If none are declared, describe only evidenced UI capabilities, such as composition, state/data flow, forms, navigation, styling, accessibility behavior, and build/runtime boundaries. Omit absent capabilities. Capture the shared UI/UX clause guidance only where it applies to the project's surface; record project conventions and gaps with evidence rather than treating this scanner as a review gate.

### Content Rules / exceptions
Use shared `output-quality-principles`. Write findings incrementally, cite `file:line` for code conventions, and separate verified behavior from inference. Describe accessibility or platform standards from the project's documented owner or the applicable shared baseline; do not infer a standard from framework names.

- **UI/UX clause coverage is a RECORD, not a review.** Apply the shared `SYNC:ui-ux-design-principles` only to relevant surfaces. Record the project rule and `file:line`, or a **GAP** when no project convention is evidenced. A recorded convention may specialize the shared default; surface any conflict with a stricter legal, security, or platform requirement instead of silently treating either rule as waived. Review enforcement belongs to the applicable review skill.

### Special slivers
- Applicability and mode detection precede framework-specific searches; unknown framework details do not block generic observations.
- Fresh-eyes verification checks that every cited path and named API exists, and that the evidence supports the documented convention. Verify base-class/store/lifecycle examples only when those constructs exist; do not require a fixed minimum number.
- Delegate the three analysis scopes only when each has distinct, applicable work.
- **UI/UX clause coverage** — record only clauses applicable to the observed platform and surface; preserve local and stricter requirements with evidence. Scans document conventions and gaps; the applicable review skill evaluates quality.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The framework is unfamiliar, stop Phase 0" | Record what is unknown and continue with verified framework-neutral UI structure |
| "A component/store/lifecycle convention is obvious" | Cite the actual definitions and uses; omit constructs the project does not have |
| "One visible example proves the convention" | Check representative callers and variants; state the evidence scope and gaps |
| "Skip fresh-eyes after issues were found" | Resolve findings and verify the final paths/claims independently before writing |
| "Every UI surface uses the same interaction standard" | Select standards by platform and local requirements; mark inapplicable checks with evidence |
| "This local form behavior is automatically a defect" | Document the local behavior; evaluate it in the appropriate UI review against applicable requirements |

### prompt-enhance
`/prompt-enhance <ref>/frontend-patterns-reference.md`

---

## Target: scss-styling

- **doc:** `<ref>/scss-styling-guide.md`
- **applies when:** maintained `.scss`/`.sass` source or Sass-specific configuration and source files exist.
- **skip when:** styling is implemented only with plain CSS, utility classes, CSS-in-JS, or another non-Sass system; use an applicable UI target instead.
- **description:** `[Documentation] Use when recording evidenced Sass structure, variables, composition, theming, and responsive conventions.`
- **sub-agents:** up to 2 conditional branches — Sass architecture/declarations and naming/theming; dispatch only distinct branches supported by source evidence.

### Phase 0 detection — Sass applicability, optional naming patterns, and mode

- Confirm maintained Sass source (`.scss`/`.sass`) or a real Sass build path before scanning. A config or dependency without Sass source is not sufficient; if only other styling systems exist, report this target `SKIPPED` and route to the applicable UI target.
- In a hybrid styling system, scope this target to the verified Sass subsystem and preserve its boundaries from other style sources. Do not adapt this Sass scanner to Less, plain CSS, utility CSS, or CSS-in-JS.
- Detect BEM, modules, theming, tokens, and other naming/organization patterns only if present. BEM is one possible convention, not a requirement; record the actual alternative when useful.
- Read the selected doc/template and preserve local sections in Sync mode. Resolve configured style/token roots when declared; otherwise discover maintained Sass sources and exclude generated/dependency output.

**Source scope:** use configured/evidenced Sass, theme, and token roots. Exclude generated output and dependencies. Include component-local styles when they are maintained owners or the local config selects them.

**Evidence gate:** If Sass applicability cannot be verified, report the checked config and source paths and skip this target. If a secondary pattern is uncertain, document only verified Sass facts and mark that pattern `UNKNOWN`.

### Sub-agent Think scopes

**Agent 1: SCSS Architecture & Variables**
- **Think (Import chain dimension):** What's the entry point? Where do global styles load? Is there a predictable import order (reset → tokens → utilities → components)? What breaks if the order changes?
- **Think (Variable declaration dimension):** Which variables are authoritative declarations vs usages? Are CSS custom properties mirroring SCSS variables (dual-declaration pattern)? What's the naming convention (BEM-inspired, semantic, functional)?
- **Think (Breakpoint dimension):** Where are breakpoints defined? Is there a responsive mixin or just raw media queries scattered across files? Mobile-first or desktop-first?
- Scan targets: maintained `.scss` and `.sass` source within configured/evidenced roots; actual entry points and Sass import/use/forward chains; variable, mixin, function, theme, and breakpoint declarations in the syntax present; CSS custom-property declarations owned by those style sources. Separate declarations from usages and verify each cited value against source.
- If a declaration inventory appears unexpectedly small or broad, verify the configured/source scope and exclusions; do not use fixed item-count thresholds as a validity rule.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** from actual declarations (never inference), record the project's ACTUAL convention for the clause-governed dimensions this agent owns — the spacing base unit and which multiples of it actually appear, against the one-unit 4px-or-8px default (`UI-4.1`); whether spacing is carried by container `gap` or by child margins (`UI-4.2`); the breakpoint definitions and whether they are content-driven or device-named (`UI-4.4`); the type sizes in use versus a fixed named scale — body size against the 16px web / 17px mobile default and the never-below-14px floor (`UI-2.2`), and whether a fixed 6-step named scale exists or one-off sizes appear (`UI-2.5`); any line-length/measure constraint against the 45–75-character default (`UI-2.3`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 2: BEM Patterns & Theming**
- **Think (BEM convention dimension):** What's the exact separator style (double-underscore `__`, double-dash `--`, or variants)? What's the maximum nesting depth before patterns break? Are modifiers on blocks, elements, or both?
- **Think (Theming dimension):** How many themes exist? Is theming via CSS custom property overrides, SCSS theme maps, or class-based switching? How does a developer add a new theme?
- **Think (Component scoping dimension):** Are styles co-located with components (scoped) or global? What naming convention prevents cross-component contamination?
- Scan targets: evidenced class/naming conventions such as BEM when present; theme ownership and switching; component-scoped vs global styles; z-index, motion, and color declarations when maintained as project conventions. Cite enough representative examples to establish each claimed rule; if no pattern exists, report that instead of inventing one.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL focus-ring treatment — the `:focus` / `:focus-visible` styling, any rule that removes the default outline, and the replacement indicator if one exists (`UI-5.5`). Record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-5.5`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**. An outline removed with no replacement is recorded as a deviation from `UI-5.5` for `ui-review` to adjudicate — the scan states it, never grades it.

### Target Sections

Use the selected project's declared sections. If no template/profile defines them, document only evidenced Sass capabilities such as entry points/imports, declarations/tokens, themes, responsive rules, and component/global style boundaries. Include naming or UI/UX clause coverage only when those patterns apply. Do not require BEM, a token taxonomy, a breakpoint scheme, or a particular source layout.

### Content Rules / exceptions
- **Declarations only — NOT usages** when cataloguing variables and mixins (reinforced in Round 2, Phase 4 verify, closing reminder, anti-rationalization).
- Resolve maintained Sass/token roots from configuration or source evidence; exclude generated/dependency output and preserve component-local Sass when it is an actual style owner.
- Every variable value, mixin signature, breakpoint MUST come from actual declarations; focus on project conventions NOT generic CSS tutorials.
- Color palette grouped by semantic role, NOT raw hex list; colors grepped from declarations only.
- **UI/UX clause coverage is a RECORD, not a review.** The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`; canonical text in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:ui-ux-design-principles`) are the DEFAULT only where this project is silent. A recorded project convention OUTRANKS the clause, so the generated guide states the project's rule, names the clause it overrides (`UI-<clause>`), and says the deviation is the project's authority; a clause-governed dimension with no project convention is recorded as a **GAP** so the clause default applies. Clause values obey this target's declarations-only rule — declarations, NOT usages. Never flag a deviation as a defect — enforcement belongs to `ui-review`; this scan only records.
- **Clause overlap with `design-system` is intentional, not duplication:** where the design-system doc records the TOKEN declaration for a shared clause (`UI-2.5` type scale, `UI-4.1` spacing unit), this guide records how stylesheets actually CONSUME it — which multiples appear, `gap` vs margin, sizes that sit off the scale. Neither entry replaces the other.

### Special slivers
- Confirm Sass applicability before scanning; BEM and other naming conventions are optional evidence branches.
- Resolve the source scope from valid config and repository evidence; if no maintained Sass source remains, report `SKIPPED`.
- Authoring should describe a verified alternative where BEM is absent; never prescribe a utility framework from a dependency alone.
- Round 2 fresh-eyes is declaration-focused: variable names exist as actual declarations (Grep — declarations not usages); mixin names match `@mixin` definitions; color values from declarations not fabricated hex; breakpoint values from actual config not assumed common values.
- 2 sub-agents (vs frontend-patterns' 3).
- **UI/UX clause coverage sliver** — Agent 1 captures the spacing, breakpoint, and type clauses (`UI-2.2`, `UI-2.3`, `UI-2.5`, `UI-4.1`, `UI-4.2`, `UI-4.4`); Agent 2 captures the focus-ring clause (`UI-5.5`); both write project rule + `file:line` + PROJECT AUTHORITY / GAP verdict into the **UI/UX Clause Coverage** section. Scans DOCUMENT the deviation; `ui-review` is the pass that enforces the clauses.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "This project styles UI, so the Sass target applies" | Confirm maintained `.scss`/`.sass` sources; scan only Sass and route other styling systems to their applicable owner |
| "Variable names look standard (`$primary-color`)" | Grep-verify every variable name against actual declarations — AI hallucinates variable names |
| "Breakpoints are probably 768px/1024px" | Read breakpoint declarations — NEVER assume common values |
| "Color values look right" | ALL color values must come from grep of actual declarations |
| "Usages and declarations are the same thing" | NEVER mix them — document only declarations as authoritative |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated variable values. |
| "Spacing looks like an 8px system — record that" | Record the base unit and the multiples that actually appear, from declarations (`UI-4.1`) — an inferred spacing system is not a project convention |
| "Breakpoints match common devices, so no clause note is needed" | Record WHETHER breakpoints are content-driven or device-named (`UI-4.4`) — that classification IS the deviation record |
| "`outline: none` here is a bug — flag it" | The scan DOCUMENTS; record the treatment and its deviation from `UI-5.5` with `file:line`. Grading is `ui-review`'s job |

### prompt-enhance
`/prompt-enhance <ref>/scss-styling-guide.md`

---

## Target: design-system

- **doc:** `<ref>/design-system/README.md`
- **applies when:** maintained design tokens, a shared component system, design-system documentation, or an equivalent visual-language source is evidenced.
- **skip when:** UI code exists but the project has no maintained design-system owner or token/component source.
- **description:** `[Documentation] Use when mapping an evidenced design system, tokens, shared components, and owner docs.`
- **sub-agents:** up to 3 conditional branches — system ownership/docs; shared UI component inventory; visual tokens/assets. Run only branches supported by project sources; keep token-source verification distinct from component usage inventory when both exist.

### Phase 0 detection — capability, owner, and mode

Step 1 — read the selected reference doc and its configured template/sections; preserve project-owned structure in Sync mode.

Step 2 — resolve any declared design-system owner, token sources, and component/doc roots from valid project config, then verify each path. If optional properties are absent, discover actual maintained sources from repository evidence. Examples include token files, design tools/export pipelines, component docs, and visual standards; they are not an allowlist or required architecture.

Step 3 — classify only evidenced branches: documentation/ownership, shared components, visual tokens/assets, or a combination. Unknown formats do not block evidence-backed documentation.

**Evidence gate:** If the owner or format is uncertain, record `UNKNOWN` and continue with verified facts. Do not invent a canonical design-system document, token source, tooling, or adoption process.

### Sub-agent Think scopes

**Agent 1: Design System Structure**
- **Think (VERBATIM):** "How is the design system organized? What's the canonical doc? What's the token chain? Which apps have design docs and which don't?"
- Scan targets: configured/evidenced design docs and owners; actual token-source and generation/import paths; reusable visual components and their exports/docs; product/app relationships only when present. Treat Storybook and CSS/SCSS/JSON token syntax as examples, not required formats. Verify declared canonical docs/token sources if configured, but never infer paths or fill missing product sources from the scanner.

**Agent 2: Component Inventory**
- **Think (VERBATIM):** "What dimensions define a complete component inventory? Consider: Discoverability (can I find it?), Categorization (what type?), Variant coverage (size/color/state?), Accessibility (ARIA/keyboard?), Documentation completeness (JSDoc/README/Storybook?), Icon/asset library coverage."
- Note: derive grep/glob patterns from what the repository actually uses — do NOT hardcode framework-specific patterns unless confirmed.
- Scan targets: reusable UI components (shared dirs, exported components); component categories (layout, forms, feedback, navigation, data display); variants (size, color, state); icon sets / asset libraries; accessibility patterns (ARIA roles, keyboard support); per-component documentation.

**Agent 3: Token & Component Source Discovery**
- **Think (VERBATIM):** "What design tokens actually exist in source code (not just what's documented)? Which are declarations (authoritative) vs usages (derived)?"
- **Source scope:** use valid configured token/design roots when present; otherwise identify actual maintained sources from code, build config, and owner docs. Exclude generated/dependency output unless it is the authoritative source.
- **Discovery:** identify definitions/authoritative inputs separately from generated outputs and usages. Derive search terms/parsers from the actual formats found; CSS custom properties, Sass variables, JSON, design-tool exports, and Storybook are examples only. Group by categories present in this design system; do not impose colors/spacing/type/breakpoints on a system that does not declare them.
- Review coverage against the configured or repository-evidenced source scope. If the inventory looks incomplete, verify scope/exclusions instead of applying fixed minimum/maximum counts.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** from the SAME declarations (never inference), record the project's ACTUAL values for the token-governed clauses — type scale step names + sizes against a fixed 6-step named scale (`UI-2.5`); the spacing base unit against the 4px-or-8px default (`UI-4.1`); accent-token count and where each accent is used, against one-accent-one-job (`UI-3.2`); the measured contrast ratio of each documented foreground/background token pair against 4.5:1 for text and 3:1 for UI edges (`UI-3.1` — COMPUTE it from the declared values; when no ratio can be computed record "unmeasured", NEVER an eyeballed or guessed number); the dark-mode surface-elevation strategy — lifted surfaces vs inverted light mode, and any softening of pure-white text (`UI-3.4`); motion duration + easing tokens against the 150–250ms ease-out default, plus any reduced-motion handling (`UI-5.4`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

### Target Sections

Use the selected project's declared sections. If none are declared, document evidenced ownership, source-of-truth paths, token/component/asset branches that exist, consumption guidance, relationships, and verified gaps. Do not require Storybook, token inventories, app maps, or a particular design-system architecture.

### Content Rules / exceptions
- Scan only valid configured or evidence-backed source roots; distinguish authoritative definitions from generated derivatives and usages.
- Record gaps only against declared capabilities/requirements or an explicitly scoped inventory; do not create speculative missing-work lists.
- No directory-tree exception declared (unlike feature-spec); shared no-trees rule stands.
- **UI/UX clause coverage is a RECORD, not a review.** The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`; canonical text in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:ui-ux-design-principles`) are the DEFAULT only where this project is silent. A recorded project convention OUTRANKS the clause, so the generated doc states the project's rule, names the clause it overrides (`UI-<clause>`), and says the deviation is the project's authority; a clause-governed dimension with no token or convention behind it is recorded as a **GAP** so the clause default applies. Clause values obey this target's declarations-only rule, and `UI-3.1` contrast is COMPUTED or recorded "unmeasured" — never estimated. Never flag a deviation as a defect — enforcement belongs to `ui-review`; this scan only records.

### Special slivers
- This scan updates only its selected project-reference output. It never authors or edits product token files, component source, design-tool artifacts, or other canonical design-system sources. Missing sources are reported to their owner.
- Delegate only distinct, evidenced branches; token definition and component inventory remain separately evidenced where both apply.
- Verify every emitted path and token/component claim against the actual owner source. Do not report a token gap merely because another common category or scale is absent.
- UI/UX clause coverage is conditional on the observed surface and design source. Record applicable evidence and gaps; preserve stricter local, legal, security, and platform requirements.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The design-system format is unfamiliar, stop the scan" | Record the unknown format and continue with verified ownership and artifacts |
| "A component inventory or token list is always required" | Run only evidence-backed branches; follow the project's configured owner/template |
| "Token values look correct" | Grep-verify ALL token values against declarations — "looks correct" ≠ verified |
| "List expected components/tokens as gaps" | Report gaps only against declared requirements or an explicitly scoped inventory |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 (zero issues) does end the scan. But when issues exist, fresh-eyes is mandatory after fixing — main agent rationalizes own mistakes. |
| "Verified 3 paths, that's enough" | Glob-verify ALL paths in inventory — spot-check is insufficient |
| "Contrast looks fine on screen" | `UI-3.1` is MEASURED, never eyeballed — compute the ratio for each documented token pair (4.5:1 text, 3:1 UI edges) or record "unmeasured"; NEVER estimate one |
| "Tokens already match the clause defaults, so skip the coverage section" | Every clause-governed dimension gets a row — a matching value is still recorded with `file:line`, and a missing one is recorded as a GAP |

### prompt-enhance
`/prompt-enhance <ref>/design-system/README.md`

---

## Target: code-review-rules

- **doc:** `<ref>/code-review-rules.md`
- **applies when:** project source and at least one real quality signal exist (tests, lint/format/type checks, CI, architecture rules, or code-review docs).
- **skip when:** no code or project-owned quality signal exists from which local review guidance can be evidenced.
- **description:** `[Documentation] Use when recording project-specific code-review checks and evidence-backed quality rules.`
- **sub-agents:** up to 3 conditional branches — server/data code, UI/client code, and cross-cutting architecture/quality controls. Route only branches evidenced by the project; no language or app type is assumed.

### Phase 0 detection — source scope, quality signals, and mode

Read the selected doc/template and valid project config. In Sync mode preserve its local sections, then compare their rules to current source, tests, CI, configuration, and quality tooling.

- Discover languages/modules and quality signals from all actual project manifests, source roots, tests, CI, linters/formatters/type checks, scanners, standards docs, git hooks, and project-owned review rules. Tool names here are search examples only.
- Route conditional analysis to server/data, UI/client, infrastructure, or other project areas only when those sources exist. Cross-cutting quality tooling and architecture are included when evidenced.

**Evidence gate:** If a quality signal or area is uncertain, include only verified rules, record `UNKNOWN` where relevant, and ask only when the unresolved scope changes required output and repository evidence cannot settle it.

### Sub-agent Think scopes

**Agent 1: Server & Data Rules** (when present)
- **Think:** Which rules govern server-side behavior, persistence, error handling, configuration, and data ownership in this project?
- Scan targets: actual request/handler patterns; validation and errors; data access, transactions, and schema changes; dependency/configuration practices; logging and security controls. Do not assume a language, DI container, framework, or layer model.

**Agent 2: UI & Client Rules** (when present)
- **Think:** Which local conventions make this project's user-facing code reliable, accessible, and maintainable?
- Scan targets: observed view/component boundaries, state/data flow, input behavior, styling, accessibility, performance, and cleanup where relevant. Derive patterns from the actual platform and documented standards.

**Agent 3: Cross-Cutting Quality & Architecture** (when present)
- **Think:** What boundaries and quality checks does the project actually enforce, and which failures do they prevent?
- Scan targets: dependency boundaries, module/service communication when present, shared-code ownership, testing conventions, security controls, build/release checks, and configuration/secret handling. Distinguish executable sensors and CI gates from prose guidance.

### Target Sections

| Section | Content |
| --- | --- |
Use the selected project's declared sections. If none are declared, group verified review rules by actual source area and quality gate, distinguish required checks from recommendations, and include observed defects only when found. Do not require backend/UI/architecture sections or a fixed number of rules for projects that do not have those surfaces.

### Content Rules / exceptions
- Ground every rule in project-owned source, configuration, CI, a test/sensor, an ADR, or an authoritative project document. Cite the actual path and relevant lines.
- Add examples only when they clarify a non-obvious rule. Label inferred examples; never present hypothetical anti-patterns as observed violations.
- Prioritize checks by impact and the project’s declared quality goals. Standard `output-quality-principles` applies.

### Special slivers
- Confirm the selected project source areas and quality signals before routing; unknown languages can still contribute verified rules.
- Delegate only independent branches that have evidence and a meaningful scope.
- Fresh-eyes verification confirms every rule's owner and verifies all cited code/config/check paths. Observations with limited evidence stay qualified, not generalized into a mandatory convention.
- Keep observed violations separate from standards and quality gates; this target documents guidance and does not rewrite tests/configuration.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The repository is an unfamiliar language, skip it" | Discover its manifests and source roots; record only what evidence supports |
| "This style rule is universal, so local evidence is unnecessary" | Distinguish a portable best-practice baseline from the project's enforced convention |
| "A likely anti-pattern belongs in the violations list" | Report observed violations only with concrete source evidence |
| "Round 2 review not needed" | Main agent rationalizes own decisions. Fresh sub-agent is non-negotiable. |
| "Doc has content, skip re-read" | Show section list extracted from doc as proof of re-read |

### prompt-enhance
`/prompt-enhance <ref>/code-review-rules.md`

---

## Target: domain-entities

- **doc:** `<ref>/domain-entities-reference.md`
- **applies when:** business behavior, rules/invariants, or authoritative domain contracts and their model/data representations are evidenced in source or project-owned specifications.
- **skip when:** code contains only generic transport/data structures or no business-domain contract can be established.
- **description:** `[Documentation] Use when recording evidenced business-domain concepts, data ownership, relationships, and boundaries.`
- **sub-agents:** up to 4 conditional branches — business concepts and invariants; transfer/application representations; persistence/schema; cross-boundary ownership and flows. Dispatch only branches supported by evidence; none requires DDD, aggregates, or a service architecture.

### Phase 0 detection — business contract, representation, and ownership

Read the selected doc/template and valid project config. Establish a business-domain contract from behavior, invariants, canonical specifications, or model/schema evidence connected to real use. Separate business concepts from generic transport, persistence, and framework types; do not classify every class, table, or payload as a domain entity.

Discover representations and persistence formats from actual source, schemas, migrations, serialization contracts, and authoritative domain documentation. Verify configured paths before using them. Identify ownership boundaries only where code/config/contracts establish distinct owners or data flows; do not infer service boundaries from directory names or deployment count.

DDD terms such as entity, value object, aggregate, aggregate root, repository, and bounded context are valid only where source or authoritative project documentation uses and supports them. Otherwise use the project's own terms and describe observable identity, rules, relationships, and ownership. Unknown framework or architecture details do not block verified findings.

### Sub-agent Think scopes

**Agent 1: Business Concepts & Invariants** (run when business rules or model evidence exists)
- **Think:** Which business concepts, identities, states, and invariants are established by specifications or executable behavior? Where are they defined and enforced?
- Scan targets: business-focused specifications and source rules; model/schema declarations only when connected to behavior; state transitions, validation, permissions, and constraints. Do not require an entity base class, hierarchy, aggregate, or particular language construct.

**Agent 2: Transfer & Application Representations** (run when separate representations or transformations exist)
- **Think:** How is domain information represented as it crosses an application, API, persistence, event, or UI boundary? Which component owns each evidenced transformation?
- Scan targets: actual request/response, command/query, message, view, serialization, and mapping definitions; follow callers and consumers to establish direction and owner. Use suffixes only as search hints; do not assume a mapping layer.

**Agent 3: Storage & Persistence** (run only when domain data is persisted)
- **Think:** Which storage structures and constraints support evidenced domain behavior? How do schema evolution and data ownership work in this repository?
- Scan targets: actual table, collection, document, file, or other persistent schema; migration/evolution definitions; indexes and constraints; verified read/write call sites. Do not assume a relational database or per-service store.

**Agent 4: Ownership & Cross-Boundary Flows** (run only when an independent module/process, external contract, or cross-owner data flow is evidenced)
- **Think:** Which component owns the authoritative business data, and what happens when information crosses an evidenced boundary? How are updates, failures, and consistency handled?
- Scan targets: callers/providers, API or message contracts, event/message producers and consumers, replicated/read-model data, and storage readers/writers. This applies to independently owned modules, processes, or external systems whether deployment is distributed or in one application. Describe shared storage as observed; identify risk only when conflicting ownership or unsafe coupling is evidenced.

### Target Sections

Include only sections supported by evidence and useful to explain the project's business model. A domain contract need not use classes, entities, a database, DDD, or services.

| Section | Include when evidence supports it |
| --- | --- |
| **Business Concepts & Rules** | Concepts, identity/state, invariants, and authoritative source locations. Use the project's terms; distinguish behavior from data shape. |
| **Representations & Transformations** | Separate API/UI/application/persistence/event representations and verified mapping ownership. |
| **Persistence & Relationships** | Persisted structures, constraints, and relationships only where relevant to domain behavior; use a diagram only if it clarifies real relationships. |
| **Ownership & Boundary Flows** | Verified authority, readers/writers, and synchronization across actual module/process/external boundaries. |
| **Observed Conventions** | Repeated naming or modeling patterns that are backed by multiple examples and affect future changes. |
| **Evidence Limits** | Material unknown owners, undocumented behavior, or unverified relationships that cannot be settled from available evidence. |

### Content Rules / exceptions
- Every claim needs a source citation (`file:line` or canonical document section). Follow data from definition to the code that uses or enforces it before describing ownership or behavior.
- Do not force an entity catalog, service/module table, ER diagram, DTO map, aggregate boundary, or coverage count. Add a concise table/diagram only when the repository has the corresponding construct and the view improves navigation.
- Document only key properties that explain an invariant or relationship; omit exhaustive property lists and incidental storage fields.
- Name an aggregate/bounded context/value object only when project evidence establishes that concept. Never label shared storage, a single application, or a generic data model as an anti-pattern by category alone.

### Special slivers
- Skip the target when no business-domain contract can be established; generic transport, framework, and storage shapes alone are insufficient. Conversely, the absence of DDD vocabulary does not prove that business rules are absent.
- Run only branches for evidenced representations: storage, mapping, and cross-boundary analysis are optional and independently gated.
- Do not block on an unknown stack or architecture, and do not require proof that the application is monolithic before omitting cross-boundary analysis. Run that analysis whenever actual cross-owner flows exist.
- Resolve configured roots when present, verify them against repository evidence, and omit absent optional configuration without error.
- Sub-agent confidence thresholds are percentage-based: >80% document; 60–80% label as observed/unverified; <60% omit or state the uncertainty.
- Fresh-eyes verification checks every cited definition, relationship, mapping, and owner against source; verify cited paths and consumer/provider direction rather than counting entities or services.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Every persisted class or table is a domain entity" | Trace it to business behavior or a canonical contract; generic transport and framework shapes are not enough. |
| "DDD vocabulary is absent, so there is no domain model" | Inspect business specifications, rules, state transitions, and actual use; report only concepts they establish. |
| "This is one deployable app, so there are no cross-boundary flows" | Check module ownership, external contracts, and data flows independently of deployment topology. |
| "The docs need an aggregate, service, or ER diagram section" | Use the project's actual concepts and include a diagram only when evidence and reader needs justify it. |
| "The framework or ownership is unfamiliar, so stop" | Record unknown dimensions and continue with verified rules, structures, and callers. |
| "Skip fresh-eyes verification after findings" | Recheck cited definitions and owner/consumer direction against source before reporting. |

### prompt-enhance
`/prompt-enhance <ref>/domain-entities-reference.md`

---

## Target: feature-spec

- **doc:** `<ref>/feature-spec-reference.md`
- **applies when:** canonical feature/spec artifacts, an explicit spec root/profile, or a governed requirements corpus exists.
- **skip when:** there is no project-owned requirement/spec corpus or configured owner from which to derive its authoring contract.
- **description:** `[Documentation] Use when recording the local owner format, evidence rules, and lifecycle for existing feature/spec artifacts.`
- **sub-agents:** 2 — Agent 1: Native Artifact Structure & Lifecycle · Agent 2: Traceability, Evidence & Consumers

### Phase 0 detection — **[BLOCKING]** (config/profile validation and INIT vs SYNC)

1. Confirm the feature/spec output is selected and this target applies. Resolve the configured business-spec root through the project-config loader; inspect `specRoots.business` and `specArtifacts` only when declared.
2. Validate the config before reading artifacts. A valid `specArtifacts` profile supplies native section roles, identifiers, ownership, and evidence carriers. If it is absent, use the portable strict-default spec contract. If it is declared but malformed or unsupported, stop and route to `project-config`; do not silently fall back.
3. Verify the resolved root against repository evidence. If the configured/default root is empty but a separate spec corpus exists, report the mismatch and route config correction before scanning the wrong empty path.
4. Determine mode by reading `<ref>/feature-spec-reference.md`: **INIT** if missing or a placeholder; **SYNC** if it has content; **FORCE** only when the user explicitly requests rebuild/reset. INIT describes the real owner contract; SYNC updates changed facts only.
5. Identify the actual artifact organization (for example, folder-scoped, flat, source-embedded, or external-link based) from files and the validated config. Do not assume app/service buckets, section numbering, ID prefixes, or a particular spec template.

Path branching: INIT derives the guide from verified native artifacts/config; SYNC reuses its existing sections and updates only changed claims; FORCE rebuilds only when explicitly requested. Every mode ends with owner/ID/carrier checks that use the active native profile or strict fallback.

### Sub-agent Think scopes

**Agent 1: Native Artifact Structure & Lifecycle**
- **Think (Owner dimension):** Which artifacts are canonical owners, where are they rooted, and how do their native sections/headings, frontmatter, and lifecycle work?
- **Think (Quality dimension):** Which completeness, evidence, review, change, and validation rules are explicit in config or consistently enforced by source tooling? Separate normative rules from conventions merely observed.
- Scan targets: resolved spec roots and representative artifacts across their actual folders; project templates and authoring guides; configured profile roles/identifiers/carriers; validators and lifecycle tools. Use configured roots and patterns; do not impose fixed filenames, section counts, `TC-` IDs, or app/service mappings.
- Apply M1/M2 or other spec-quality checks only where the configured `specRoots` policy and active SDD contract govern that artifact. For a valid `specArtifacts` profile, use its native sections and carriers; when absent, use the portable strict-default contract. Report each issue with the actual artifact, line, and native section/ID.

**Agent 2: Traceability, Evidence & Consumers**
- **Think (Relationship dimension):** How do canonical intent, contracts, native scenario/case records, tests, implementation, and derived views link in this project?
- **Think (Coverage dimension):** Which intended capabilities have no linked executable evidence, and which implementation/test behavior lacks a canonical owner?
- Scan targets: configured carrier roots and accepted case identifiers; real owner-to-test links; import/API/event relationships only when present; cross-references between artifacts; doc generation and validation tools. Verify the assertion tied to each claimed owner + native case/scenario ID + optional variant; never infer coverage from an ID grep alone.

### Target Sections

| Section | Content |
| --- | --- |
| **Artifact Owners & Roots** | Canonical artifact kinds, resolved roots, ownership precedence, and derived outputs found in config/source |
| **Native Authoring Contract** | Configured section roles, frontmatter, identifiers, evidence carriers, and lifecycle; strict-default details only when no native profile exists |
| **Artifact Organization** | Actual naming and grouping patterns with verified paths; omit absent organization types |
| **Traceability & Verification** | Owner-to-native-case-to-assertion links, validation tools/commands, and evidence boundaries |
| **Coverage Gaps** | Missing or stale links proven against the active owner contract; mark unknowns instead of assuming a missing artifact |
| **Applicable Spec Quality Findings** | Profile/policy-governed issues only, with native artifact, line, and section/identifier evidence |

### Content Rules
- Use concise tables for native profile fields and verified owner-to-test relationships when they improve readability.
- Describe the actual root and naming pattern; link to representative files instead of emitting a directory tree or stale inventory count.
- Coverage gaps must be tied to configured owners/carriers and real artifacts. Label unresolved mappings `UNKNOWN`; do not call an absent artifact a defect until the root and carrier were verified.
- Preserve the project's native section/identifier contract. A valid `specArtifacts` profile takes precedence; absent profile uses the portable strict-default contract; malformed profile blocks the scan.

### Special slivers
- **[BLOCKING] Profile resolution:** read `specArtifacts`, `specRoots`, and the project config schema. For a valid native profile, use configured roles/carriers/IDs; when absent, use the portable strict-default spec contract; when malformed, stop and report the config error.
- **[BLOCKING] Phase 0 mode-detection** (INIT vs SYNC); avoid scanning an empty assumed root when configured or discovered roots conflict.
- Apply tech-agnostic/business-visibility criteria only to sections governed by the project’s declared spec policy and the active SDD contract; do not apply them indiscriminately to technical or derived artifacts.
- Verify only template, skill, validator, and test-carrier paths actually declared or found in this project. Do not assume a `README.{Feature}.md` format, a particular spec skill, a section number, or `TC-` IDs when a native profile exists.
- Sub-agent count = 2 (artifact structure/lifecycle + traceability/evidence).

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Mode obvious, skip Phase 0 detection" | Phase 0 mode detection is BLOCKING — INIT vs SYNC paths differ significantly |
| "Coverage Gaps not needed" | Coverage Gaps is a required section — omitting it hides maintenance debt |
| "A framework template is probably the project's template" | Verify configured/native owner artifacts and generators before documenting a path |
| "An ID grep proves test coverage" | Trace the owner + native ID + optional variant to the executing assertion |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own section extractions. |

### prompt-enhance
`/prompt-enhance <ref>/feature-spec-reference.md`

---

## Target: docs-index

- **doc:** `<ref>/docs-index-reference.md`
- **applies when:** the project has a documentation corpus and its project-init owner routes the docs index for refresh.
- **skip when:** no project-owned documentation corpus exists or the always-on docs-index owner confirms it is current.
- **description:** `[Documentation] Use when mapping an evidenced documentation corpus, its authority, relationships, and navigation.`
- **sub-agents:** 1 — a single fresh-eyes / zero-memory verification sub-agent spawned in **Phase 5**. This target is NOT structured as parallel "Agent 1/2/3": the MAIN agent performs the scanning (Phases 2-4), and only the Phase 5 verifier is a sub-agent.

### Phase 0 detection
- **Mode-detect (inline `init`/`sync` labels, lowercase):** read the doc → init (placeholder only) / sync (real content). In sync: note which sections exist + current file counts to diff.
- Resolve the project-config path and validate the declared config before reading optional `docsRoots`, `specRoots`, `referenceDocs`, or documentation-owner settings. Omitted optional properties do not imply a fixed directory; discover candidate doc roots from repository evidence. A declared malformed property blocks this target.
- Identify documentation sources from the configured roots, existing docs index/template, root instruction files, repository-owned documentation tooling, and verified in-repository links. Include external wiki/catalog sources only when project config or an owner doc declares them.
- Classify the observed organization (for example, topic folders, a flat collection, or source-adjacent READMEs) from files that actually exist. These are discovery examples, not a required layout.
- **Evidence gate:** If authority or organization is ambiguous, document verified locations and links, mark the unresolved owner `UNKNOWN`, and ask only when an unresolved owner decision changes the index and repository evidence cannot settle it.

### Think scopes (NO parallel Agent 1/2/3 — Phases 2-4 carry their own Think prompts, performed by the MAIN agent)

**Phase 2: Scan Documentation Sources** — write findings incrementally after each verified source group, NEVER batch.
- **Think (Coverage):** Which configured or repository-evidenced documentation roots exist, and which contain content, stubs, or generated files?
- **Think (Accuracy):** For each count the current index promises, does a fresh glob of its actual scope match? What is the delta?
- **Think (Completeness):** Are there in-scope documentation files outside the current index's categories or links? Include only source surfaces the project declares or uses as documentation.
- **Think (Discovery):** Which in-scope files are not assigned to an evidenced category or authority, and how should the index surface them without inventing ownership?
- Resolve configured roots (including custom `referenceDocs.filename` and `templatePath` values) from the valid project config. Use repository evidence for other actual doc sources. Exclude dependencies, build output, vendored material, generated artifacts, and unrelated source comments unless the project explicitly treats them as documentation.
- Group documents by the project's existing categories, authority model, or configured section roles. Preserve project-owned headings and generated metadata. Do not impose `docs/`, `docs/specs/`, `.claude/docs/`, `.claude/skills/`, fixed folder names, or a category whitelist on projects that do not use them.
- Verify counts with globs over the exact documented scope; NEVER estimate or copy counts. Compare the discovered in-scope set with the union of category/link sets and report uncategorized files rather than silently omitting them.

**Phase 3: Build Doc Relationship Map**
- **Think:** Which project documents serve as entry points, which are authoritative for a topic, which are referenced from multiple places, and which have no incoming links?
- Trace actual links and declarations among discovered docs and project instruction/config files. Describe only verified relationships; do not assume a `README` → guide chain or a particular host's files.

**Phase 4: Build Lookup Table** (no Think prompt)
- Map verified topics, terms, artifact types, and project roles to their authoritative doc paths. Use configured native identifiers and filenames when present; do not assume buckets, `README.{Feature}.md`, a spec root, or a specific reference-doc filename.

**Phase 5: Fresh-Eyes Verification** (one zero-memory verifier) — validate the complete set rather than a fixed sample:
1. Every documented path exists; every listed count matches a fresh glob of the documented scope.
2. Every in-scope file is represented by its configured/current category or clearly reported as uncategorized.
3. Lookup entries resolve to the correct existing authority and do not conflict or duplicate the same path under inconsistent topics.
4. Required sections, labels, paths, or formats from the project config, current template, and repository-owned checks remain satisfied; report the evidence for each local constraint.
5. No claims, authorities, relationships, or generated paths were inferred without evidence.

### Target Sections

| Section | Content |
| --- | --- |
The index follows the sections, authority labels, path format, and metadata declared by project config or its owner template. When neither provides a format, use a concise inventory of documented areas, authoritative sources, verified relationships, and topic-to-path lookup. Include counts only when useful to the project index or required by a local check, and derive each from a fresh glob.

Before writing, inspect repository-owned tests, sensors, and validators that consume the index. Preserve their verified local labels, path enumeration, counts, or line formats in this project; do not carry those local constraints into another project without equivalent evidence. Resolve configured roots for every emitted path, and keep cross-host instructions free of host-specific invocation prefixes.

### Content Rules / exceptions
- Any emitted count MUST be verified via a glob over its stated scope; never estimate or copy it from stale content.
- Discover documents dynamically within configured and repository-evidenced sources. Preserve local template, profile, and check contracts, but never hardcode a different project's roots, categories, application names, or spec format into the reusable scan procedure.
- Distinguish project-authored, framework-owned, generated, and external documentation when the evidence supports those owners. Never imply that an external or generated source was scanned when it was not.

### Special slivers
- **Coverage is scope-specific:** discover and diff only project-declared or repository-evidenced documentation sources; report out-of-category files instead of inventing their owner.
- **No fixed root/category whitelist:** candidate directories and labels are evidence, not framework defaults.
- **Fresh-eyes is required when writing or materially updating the index.** Verify paths, counts, coverage, lookup correctness, and each evidenced local tooling contract before finalizing.
- **Repository-owned check compatibility:** when tests, sensors, validators, or project-owned templates require an exact count row, named section, or path list, discover the source of that requirement and preserve it in this project. Do not make a guessed or framework-wide copy of the constraint.
- No technology-framework detection gate is needed. The target's branches depend on configured document ownership and observed repository structure.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Count looks right from existing doc, skip glob" | EVERY count requires fresh glob verification — no exceptions |
| "Only a few paths need verification" | Validate the complete listed set and count-bearing scopes — a sample can hide a stale link |
| "All files fit into existing categories" | Diff the evidence-backed documentation scope against its categories and report uncategorized files |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent's counts carry confirmation bias. |
| "The existing index has enough examples; skip a fresh completeness check" | Re-enumerate the configured/evidenced document scope and validate each project-owned check |
| "This folder/category pattern is standard" | Retain only roots and categories confirmed in this repository's config or files |

### prompt-enhance
`/prompt-enhance <ref>/docs-index-reference.md`

---

## Target: e2e-tests

- **doc:** `<ref>/e2e-test-reference.md`
- **applies when:** browser or end-to-end user-flow tests have evidenced test artifacts, runner/fixture setup, CI invocation, or a valid project capability declaration corroborated by source/configuration.
- **skip when:** no active browser/user-flow test capability is evidenced; record which config and repository surfaces were checked. A browser dependency or configured path alone is not proof of a harness.
- **description:** `[Documentation] Use when scanning E2E test architecture, configured or discovered test organization, shared helpers, step definitions, configuration, and framework patterns.`
- **sub-agents:** up to 3 conditional branches + a fresh-eyes verifier — Agent 1: Test Harness & Execution · Agent 2: Test Organization & Interactions · Agent 3: BDD & Test Patterns (only if BDD evidence exists). Dispatch only branches supported by the observed harness.

### Phase 0 detection — establish actual test capability and its limits before writing

Read the target doc and valid project config. If an optional `e2eTesting` section exists, treat its paths, framework, runner, and execution details as search hints; verify each against actual files/scripts. Omission is normal and must not block the scan. A configured object/page path does not establish that a page-object model is implemented.

Identify cases, browser fixtures, runner config, lifecycle hooks, package/build scripts, and CI invocations from repository evidence. The examples below are search cues, not an allowlist:

| Evidence | Finding | Branch |
| --- | --- | --- |
| Runner config or test script plus browser-driving cases (for example Playwright, Cypress, Selenium, WebdriverIO, Puppeteer, or another tool) | Verified runner and test organization | Run evidenced harness and organization branches. |
| Feature files plus step-binding/configuration evidence | BDD-style test capability, with framework named only when verified | Run Agent 3 as well as evidenced harness/organization branches. |
| Test cases/helpers without an identifiable runner | Runner `UNKNOWN`; artifacts remain evidence | Continue generic organization/assertion analysis; do not invent commands or framework patterns. |

Mode-detect:

| Mode | Condition | Action |
| --- | --- | --- |
| Init | Target doc is missing or a placeholder | Write evidenced applicable sections; state material unknowns. |
| Sync | Target doc has real content | Update only stale or newly evidenced sections; retain valid local conventions. |

When an optional execution profile exists (for example, `e2eTesting.execution`), verify its values and preserve the configured owner for startup, dependency, readiness, teardown, and evidence commands. If it links to a separate local-run or experience-verification section, cross-reference that owner instead of duplicating commands. Missing optional configuration is not an error and must not be scaffolded solely to complete this reference doc.

**Evidence gate:** If runner details cannot be identified, cite the files/config checked and mark only that dimension `UNKNOWN`. Continue generic analysis of evidenced cases/helpers. Do not infer a POM, BDD model, execution mode, command, or test partition from a dependency or empty path setting. Ask only when a material owner decision cannot be resolved from evidence.

### Sub-agent Think scopes (write incrementally per file, cite `file:line`, and keep reports free of volatile counts. Report → `tmp/reports/scan-e2e-tests-{YYMMDD}-{HHMM}-report.md`.)

**Agent 1: Test Harness & Execution** (run when a runner or execution setup is evidenced)
- **Think:** How do tests start, configure, isolate, and stop the browser/system under test? Which setup is shared, and what commands actually run it?
- Scan targets: verified test projects/directories, runner and browser lifecycle config, fixtures/hooks/startup, URL and timeout settings, environment and CI commands. **Secret safety:** never copy credential values; if a real credential or token is hardcoded in source, report a CRITICAL finding without repeating it.

**Agent 2: Test Organization & Interactions** (run when reusable test code or cases are evidenced)
- **Think:** Where does this project actually own shared browser behavior, waiting, data setup, and assertions? Which test-owned outcomes are protected?
- Scan targets: existing fixtures, helper functions, action wrappers, scoped locators, object/page models when present, selectors, navigation, waits/retries, assertion helpers, and test-data setup. Do not prescribe a POM, base class, or hierarchy when the repository does not use one.

**Agent 3: BDD & Test Patterns** (run only when feature files and binding/configuration evidence establish BDD)
- **Think:** How do scenarios, bindings, hooks, and shared state work together? Which conventions affect reuse and test isolation?
- Scan targets: feature/spec files, step or binding definitions, scenario context, lifecycle hooks, data setup, and environment configuration as they actually exist. Do not infer a BDD runner from `.feature` files alone.

### Target Sections

Write only sections supported by evidence; do not require a particular runner, directory partition, lifecycle mode, or organizational pattern.

| Section | Content |
| --- | --- |
| **Harness & Execution** | Verified runner, startup/lifecycle, browsers/devices, CI or local execution commands, and configured ownership where present. |
| **Test Organization & Reuse** | Actual case layout and shared fixtures/helpers/object models; omit absent patterns. |
| **Interactions, Waits & Assertions** | Observed selectors, navigation/waits/retries, and assertions on outcomes owned by the application. |
| **Configuration & Test Data** | Verified environment/profile, account, fixture, and data-safety conventions; never include secret values. |
| **Project Conventions** | Repeated, evidence-backed conventions useful to new tests. |

Conditional sections may cover a page/object model, BDD/scenario conventions, authentication/account fixtures, environment variants, or test-data lifecycle, but only when those capabilities are present and relevant.

### Content Rules / exceptions
- Do not write volatile file/test counts. If an existing valid config stores statistics, preserve its supported expression format rather than a hardcoded count.
- Every code example and command must come from an actual source/script and cite its location. List only modes the repository defines (for example, headed or CI only when configured).
- If real hardcoded test credentials are found, report severity and locations without reproducing values; distinguish secrets from obvious placeholders or synthetic fixture data.

### Special slivers
- Agent 3 and BDD-specific content run only when BDD is evidenced; absence of BDD does not block the E2E harness and organization scan.
- Treat optional `e2eTesting`, execution-profile, and experience-verification sections as optional. Do not create them just to write this reference doc; when an explicitly requested config update is in scope, use the supported schema and only source-backed values.
- Keep lifecycle commands at their verified project owner; cross-reference an existing local-run/experience-verification owner instead of duplicating it. Never invent run commands, partitions, authentication, or browser defaults.
- Verify every command, fixture/helper path, dependency version, and runner claim against its source. A fresh-eyes check revalidates citations and does not require additional rounds when the first pass is clean.
- **Secret safety:** never place credential/token values in the report or document. Flag a verified real credential in source without quoting it.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The familiar browser framework is obvious from dependencies" | Trace actual runner configuration, cases, scripts, and CI invocation; a dependency alone is not proof. |
| "`.feature` files prove this BDD framework" | Verify bindings/configuration before naming a BDD runner or writing its conventions. |
| "The configured page-object path means a POM is required" | Document a POM only when code uses one; describe the project's observed reuse pattern. |
| "All web tests have headed, CI, and filtered commands" | Record only commands/modes defined by source or valid config. |
| "Create the missing optional E2E config to finish the guide" | Omitted capability config is normal; document verified repository facts without scaffolding optional sections. |
| "A realistic test secret belongs in a code example" | Do not reproduce real credentials; report a redacted security finding. |

### prompt-enhance
`/prompt-enhance <ref>/e2e-test-reference.md`

---

## Target: integration-tests

- **doc:** `<ref>/integration-test-reference.md`
- **applies when:** test code/config demonstrates tests that exercise a real interaction boundary, such as persistence, a module/process contract, a network/API adapter, a queue, or an external system.
- **skip when:** no boundary-level test capability is evidenced; a unit-test project, dependency, or test directory alone is insufficient.
- **description:** `[Documentation] Use when recording evidenced boundary-test setup, isolation, helpers, and assertions.`
- **sub-agents:** up to 2 conditional branches — Agent 1: Test Harness & Boundary Setup · Agent 2: Test Behavior, Isolation & Assertions. Dispatch only branches supported by the observed test capability.

### Phase 0 detection — identify the test runner, exercised boundary, and setup from evidence

Read the target doc and valid project config. An optional `integrationTestVerify` or equivalent capability section is a source of search hints, not a requirement. Verify declared commands, paths, and policies against scripts, tests, and CI. Omission is normal; a declared malformed section is handled by project-config validation.

Detect the runner from actual manifests, commands, test files, and configuration. The examples below are search cues only; use repository-specific syntax for any other stack.

| Evidence | Inspect |
| --- | --- |
| Test manifest, runner config, command, or workflow | Actual setup/teardown markers and supported commands; if unknown, record runner `UNKNOWN` and continue with syntax visible in test sources. |
| Tests calling across a real persistence, process/module, API/network, message, or external-adapter boundary | Invoked boundary, owner, setup/teardown, and the outcome the test observes. A browser flow belongs here only when it tests such an integration contract; otherwise use the E2E target. |
| Containers, local service scripts, in-memory substitutes, database fixtures, migration setup, or other infrastructure configuration | Which dependencies are started or substituted, lifecycle and isolation behavior, and limits of the substitute. |
| Test data setup, fixture loaders, cleanup, and unique data patterns | Which owner creates data, what behavior is exercised, and how repeatability/collisions are handled. Direct storage setup is not automatically a defect; explain when it prepares state versus when it replaces the boundary under test. |
| Optional config for test verification | Only fields present in the valid project schema, verified against repository-owned commands and test behavior. Do not require fields that the project omits. |

Classify Init (missing/placeholder doc) or Sync (existing content). In Sync mode update only stale or newly evidenced material; do not count framework/base-class changes.

**Evidence gate:** If the runner, boundary, or infrastructure cannot be identified, mark only that dimension `UNKNOWN`, cite what was checked, and continue with verified facts. Do not invent a framework, run command, base class, database, or integration lane. Ask only when a material ownership choice cannot be resolved from repository evidence.

### Sub-agent Think scopes

**Agent 1: Test Harness & Boundary Setup** (run when shared setup or infrastructure evidence exists)
- **Think:** How is the boundary made available, configured, isolated, and cleaned up? What does the harness replace, and what does it exercise for real?
- Scan targets: actual runner/test bootstrap, fixtures/factories, infrastructure startup, migration/seed setup, environment configuration, test doubles/overrides, and lifecycle/parallelism constraints. Search base classes only if source uses them. **Secret safety:** never copy credential values; report a real hardcoded credential as CRITICAL without reproducing it.

**Agent 2: Test Behavior, Isolation & Assertions** (run when boundary-level cases are evidenced)
- **Think:** Which contract crosses the boundary, what outcome does the system own, and how do the tests prove it repeatably without relying on shared delivery bookkeeping?
- Scan targets: test input/state setup, boundary invocation, business/system-owned outcome assertions, polling/wait helpers, data uniqueness/cleanup, categories, and concurrency controls. Direct storage setup is appropriate when it prepares state; distinguish that from a test that bypasses the boundary it claims to cover.

### Target Sections

Include only sections that explain the tested boundary and are supported by evidence; do not require base classes, containers, databases, service modules, or a CI lane.

| Section | Content |
| --- | --- |
| **Boundary & Test Intent** | What components interact, which real boundary is exercised, and what contract/behavior is asserted. |
| **Harness & Infrastructure** | Actual runner, setup/teardown, fixtures, services, substitutions, and configuration. |
| **Isolation & Test Data** | Data owner, setup/cleanup, repeatability, parallel-safety, and lifecycle as verified in this project. |
| **Assertions & Helpers** | Helpers, waits, and assertions that establish a meaningful outcome owned by the system under test. |
| **Commands & Local Guidance** | Only commands and prerequisites found in scripts, config, or CI; mark missing dimensions unknown instead of inventing them. |

### Content Rules / exceptions
Follow shared `output-quality-principles`; sync surgically. Verify every example, class name, command, and path against source. Avoid volatile file/test counts. Report what was scanned and the evidence-backed limits; do not claim coverage gaps from a directory count.

### Special slivers
- Identify the runner and exercised boundary before writing; unknown dimensions do not block confirmed findings or require questions when evidence can resolve them.
- Optional `integrationTestVerify` or equivalent configuration may be absent. When present, read only supported declared fields and corroborate commands/policies against source; do not create or require this section to complete the reference doc.
- Describe repeatability, cleanup, transaction/reset behavior, and concurrency from actual test setup. Recommend reliable isolation and stable outcomes, but do not mandate a fixed number of runs or a reset policy that the repository does not use.
- Direct repository/database setup is not automatically a defect. Explain whether it creates fixture state or bypasses the interaction boundary the test claims to verify.
- Distinguish smoke/readiness tests from deeper integration assertions; describe each by its intent without presenting a health check as proof of untested behavior.
- **Secret safety:** never copy real credentials or tokens into the report/doc. Flag a verified hardcoded real credential as CRITICAL without repeating the value; distinguish it from placeholders and synthetic test data.
- Fresh-eyes verification checks cited setup, test behavior, boundary ownership, and final system-owned outcomes; no fixed coverage counts are required.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "This framework implies a particular integration runner" | Trace the repository's test files and commands; framework examples are search cues only. |
| "A database write in setup means the test is invalid" | Determine whether setup prepares data or replaces the boundary under test; report the actual behavior. |
| "A base class must exist" | Document a base class only if source defines and uses one. |
| "All integration tests need two runs without reset" | Describe the project's actual isolation and repeatability policy; do not add an arbitrary fixed-run requirement. |
| "A smoke test proves the full integration contract" | State exactly which readiness or behavior it verifies and which boundary behavior remains untested. |
| "Credential values make the example clearer" | Never reproduce real secrets; redact the value and report the security finding. |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |
| "Credential security flag not needed" | A verified real credential in source is a CRITICAL finding; report it without reproducing the value. |

### prompt-enhance
`/prompt-enhance <ref>/integration-test-reference.md`

---

## Target: seed-test-data

This target scans seeder and dev-data patterns into the seed-test-data reference doc.

- **doc:** `<ref>/seed-test-data-reference.md`
- **applies when:** an owned project/test data seeder, reusable fixture loader, or repeatable sample-data setup is evidenced in source/config.
- **skip when:** there is no seed/data-loading owner; ordinary inline test setup alone does not establish a seeder capability.
- **description:** `[Documentation] Use when recording evidenced seed and reusable sample-data setup.`
- **sub-agents:** the main agent performs the evidence scan; a fresh-eyes verifier re-checks cited examples. Do not dispatch optional test/data branches without a corresponding capability.

### Phase 0 detection — owner, purpose, safety, and mode

Read the target doc, required project config, and any optional seed/data capability section that exists, then classify mode:
- `<ref>/seed-test-data-reference.md`
- project-config's declared data/seed paths and settings, if present

| Mode | Condition | Behavior |
| --- | --- | --- |
| **Init** | missing or placeholder doc | write only evidence-backed applicable sections; note material unknowns |
| **Sync** | existing real content | update only stale or newly evidenced sections |

### Evidence scan

Start from verified source/config roots and locate possible seed owners, invocations, setup/teardown, sample-data assets, and repository-defined data-loading commands. Search terms such as `seed`, `fixture`, `sample data`, `bootstrap`, `loader`, `factory`, or `setup` are leads only; adapt them to the languages/frameworks found and follow callers to establish real use.

Distinguish persistent project/demo data, test fixtures, migrations, and one-shot administrative loaders. Record only patterns present in source: environment/tenant/permission guards, transaction or scope management, idempotency, cleanup, registration, cross-process synchronization, and data ownership. A script may have no base class or DI registration; those structures are never prerequisites.

Use a repository graph only when its database and supported trace command are available and verified; source definitions and callers remain the evidence authority. Do not execute seeders or mutate project data as part of this documentation scan.

Capture at minimum the evidenced entry point and purpose, who owns the data, where/when the loader runs, and how safety and repeatability/cleanup are handled when applicable. If a relevant safeguard cannot be established, state the evidence gap instead of inventing one.

### Target Sections

| Section | Content |
| --- | --- |
| **Seeder/Fixture Capability** | Actual owner, entry point, intent (project/demo/test), and verified invocation path. |
| **Safety & Scope** | Environment, data scope, authorization, and tenant boundaries only when present; identify destructive behavior and guardrails. |
| **Repeatability & Cleanup** | Idempotency or cleanup behavior where relevant; state explicitly when a loader is one-shot or no protection is established. |
| **Data Ownership & Persistence** | Data/schema owner and transaction/scope rules where evidenced. |
| **Registration & Cross-Boundary Effects** | Runtime registration, asynchronous convergence, or downstream effects only when present. |
| **Verified Risks** | Anti-patterns or safety gaps directly established by source; omit speculation. |

### Content Rules / exceptions
Follow shared `output-quality-principles`. Surgical sync only; every rule/example needs `file:line` proof. Preserve valid local section structure, include risk warnings only when verified, and prefer short snippets with source-path notes. Never include secret values or production records.

### Special slivers
- A base class, interface, dependency-injection container, scoped execution helper, count loop, environment key, or cross-service wait is optional. Document it only when source shows it.
- Treat the optional project-config seed/data capability as optional: do not create it merely to fill this reference doc. When a separate config update is requested, use only supported schema fields and evidence-backed values.
- Verify each invocation, guard, registration, owner, cleanup mechanism, and cited code example against its actual definition and call path. Graph analysis is optional, not a substitute for source checks.
- **Safety:** never copy secret values, tokens, connection strings with credentials, or production personal data into reports/docs. Record variable/reference names and mechanisms only.
- Report → `tmp/reports/seed-test-data-scan-{YYMMDD}-{HHMM}-report.md` (mode, evidence summary `file:line`, sections updated, open gaps).

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Every project seeder must use a base class/DI scope/count loop" | Trace the actual entry point and lifecycle; record only structures this project uses and flag a gap only when the data risk requires it. |
| "A familiar seed filename proves the loader is active" | Follow its invocation/registration path and verify its current purpose before documenting. |
| "The missing optional seed config makes this target invalid" | Optional capability config may be absent; document only source-backed behavior without scaffolding it. |
| "There is no safety issue because it is only test data" | Verify target environment, data scope, secret handling, and cleanup; distinguish placeholders from real sensitive data. |
| "Document the anti-pattern I expect to find" | Include risks only when verified in source. |
| "A full rewrite is cleaner" | Sync mode is surgical; preserve valid local sections and update stale claims only. |
| "Skip fresh-eyes verification after findings" | Recheck every cited entry point and safeguard after updating the doc. |

### prompt-enhance
`/prompt-enhance <ref>/seed-test-data-reference.md`

---

## Target: ui-system

This is an **orchestrator meta-target**, not a single-doc scanner: it checks selected UI child targets for applicability, runs only eligible ones, and summarizes (it writes no doc of its own).

- **kind:** orchestrator
- **doc:** _(none of its own)_ — selected children write their own configured target docs.
- **applies when:** an explicit request covers a project UI system and one or more child capabilities are evidenced and selected.
- **skip when:** no UI child target applies; report the evidence and launch no child scan.
- **description:** `[Documentation] Use to coordinate only selected, evidenced UI-reference scans; it does not imply a design system or Sass usage.`
- **children:** `design-system`, `scss-styling`, `frontend-patterns` (each is an optional standard target that self-checks applicability and owns its output doc).

### Orchestration Procedure (replaces the shared 4-phase engine)

**Phase 0 — Pre-Flight [BLOCKING]:**
1. Require valid project config and resolve `referenceDocs` through the runtime helper. When it is an explicit array, honor it exactly; when absent, use only resolver-selected capability docs. This invocation cannot add a child doc to an explicit selection.
2. Check each child independently using its `applies when` / `skip when` evidence and exact output filename. Frontend patterns require UI source; design-system requires an actual maintained token/component/documentation owner; Sass requires Sass source. A dependency or directory name alone is insufficient.
3. Run only children whose output is selected and whose evidence gate passes. If all children are absent, unselected, or fresh, report `SKIPPED` / `UNCHANGED` without asking a routine force-refresh question. Honor force only when the user explicitly requests a rebuild and the target supports it.
4. Pass optional `designSystem` config to that child only when the section is valid, and verify its paths against source.
5. If evidence conflicts materially, report the specific conflict and ask only for a missing owner decision that repository evidence cannot establish.

**Phase 1 — Plan:** Create work and verification items only for eligible children plus one summary item. Do not dispatch skipped targets.

**Phase 2 — Launch (parallel):** run eligible children simultaneously only when their output paths are distinct; each child remains self-contained:
- `/scan --target=design-system`
- `/scan --target=scss-styling`
- `/scan --target=frontend-patterns`

**Phase 3 — Verify outputs:** inspect each child result and its owned output. Accept `UPDATED` only when evidence checks pass; accept `UNCHANGED` when the child reports no write; preserve `SKIPPED` and `BLOCKED` with reasons. Never rerun a target only because a no-op stamp did not move.

**Phase 4 — Summarize** from verified results only: list each selected child, output path, status, evidence, and remaining gap. Do not report skipped or unselected children as scanned.

### Content Rules / exceptions
- Does NOT modify application code — only populates `<ref>/`.
- Summary fields come from verified child-doc content, never memory/estimate.

### Special slivers
- **Applicability is per child** — a UI project may use no Sass and no maintained design system; never infer those scans from frontend presence.
- **No selection bypass** — explicit invocation does not add output docs to an explicit `referenceDocs` array.
- **No forced breadth** — `--target=ui-system` never implies that every child applies or must be refreshed.
- **UI/UX clause coverage is child-owned** — each child writes its OWN **UI/UX Clause Coverage** section (`design-system` the token clauses `UI-2.5`/`UI-3.1`/`UI-3.2`/`UI-3.4`/`UI-4.1`/`UI-5.4`; `scss-styling` the spacing, breakpoint, type, and focus-ring clauses; `frontend-patterns` the interaction-state, state-feedback, form, and touch-target clauses). The orchestrator neither merges nor grades them: scans RECORD where the project deliberately deviates so the project's own doc becomes the recorded authority, while `ui-review` is the pass that enforces the clauses.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Frontend exists, so every UI child applies" | Each child has a separate capability and output-selection gate |
| "All docs are probably still fresh" | Check last-scanned date via actual file read — never assume freshness |
| "Children ran, so output must be there" | Verify each child doc content — placeholder ≠ populated |
| "Summary from memory is fine" | Summary must come from verified child docs — never fabricate findings |
| "Explicit orchestrator invocation means force every child" | Invocation requests an assessment; it does not override config selection or evidence |
| "Roll the children's clause coverage into one compliance verdict" | Children RECORD project conventions; the orchestrator summarizes verified doc content only. A compliance verdict is `ui-review`'s output, never a scan's |

### prompt-enhance
Each changed child follows its own enhancement rule. Do not enhance unchanged or skipped outputs.
