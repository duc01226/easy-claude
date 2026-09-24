---
name: learn
description: '[Utilities] Use when teaching Claude a lesson that persists across sessions.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
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

## Quick Summary

**Goal:** Teach Claude lessons that persist across sessions by generalizing each lesson to its failure mode and routing it to the carrier a future session will actually read — the matching skill's project protocol when the lesson is skill-specific, otherwise the best-fit prose reference doc or `docs/project-config.json` when the lesson is really a machine-readable project fact.

**Summary:** read-this-if-nothing-else digest of the main steps —

- **Generalize before anything else** — climb from the incident to the reusable failure mode; a lesson naming this ticket's files/services/tools is not a lesson yet.
- **Triage (recurrence + auto-fix) BEFORE routing** — a lesson a review skill already catches is noise.
- **Skill-specific lessons use the project protocol route:** when a user asks to learn something during an active skill invocation, or a lesson arises from a task whose route matched a skill, treat it as a candidate overlay for that skill; call `$project-skill-protocol` with `add` for a new overlay or `update <exact-name>` only after exact-name resolution, never save only to generic lessons/prose.
- **Keep ordinary routing for ordinary lessons:** when the lesson is not skill-specific or no active/matching skill exists, use the existing FACT/RULE carrier route and confirmation flow.
- **Classify the carrier, don't default to prose:** a lesson stating a project FACT (path, run-command, module map, convention, tooling choice) belongs in `docs/project-config.json`, the machine-readable map every skill reads first; a lesson stating a RULE or pattern belongs in the matching `docs/project-reference/` doc. Both can apply — write the fact to config AND the rule to prose. To learn what the config holds and its exact field names, read the file or use `$project-config` (it runs `--describe`).
- **Delegate overlay correctness:** `$project-skill-protocol` retains its mode resolution, target/scope resolution, additive-only constraint, collision/contradiction handling, proposal/user-confirmation gate, three-write contract, and mirror-sync rule; Learn must not bypass or replace it.
- **Assess prevention depth** — doc/config update, prompt rule, static protocol lesson, hook, test, or skill update.
- **Confirm target with the user, save, then run the 3 mandatory end tasks** — Learn Review → `$why-review` → `$prompt-enhance`, then the AI-discovery gate on each modified carrier.

**Workflow:**

1. **Capture** -- Identify the lesson from user instruction or experience
2. **Route** -- Analyze lesson content against any active/matching skill, the Reference Doc Catalog, AND `docs/project-config.json`; select the project-protocol route for skill-specific lessons, otherwise the best target carrier (prose doc, config field, or both)
3. **Save** -- After the applicable confirmation gates, delegate skill-specific lessons to `$project-skill-protocol`; otherwise append the lesson to the selected file
4. **Confirm** -- Acknowledge what was saved and where
5. **Learn Review** -- Run the mandatory 2-step end gate (`Learn Review` + `$why-review`)
6. **Enhance** -- Run `$prompt-enhance` on modified file(s) to optimize AI attention anchoring, then the AI-discovery gate (carrier reachable from the docs index; anchors not padded)

**Key Rules:**

- **GENERALIZE FIRST (the #1 protocol):** Extract the GENERIC lesson that applies to many cases — NEVER save the specific case as-is. The user's words describe one incident; your job is to climb from that incident to the reusable rule. Strip every project/file/tool/domain name. If the saved text only helps on this exact ticket, you failed — abstract it up a level. (Enforced by the Lesson Quality Gate below.)
- Triggers on "remember this", "always do X", "never do Y"
- **Triage first:** pass Recurrence gate + Auto-fix gate BEFORE routing or saving
- Smart-route to the most relevant file, NOT always `lessons.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- **Consider `docs/project-config.json` on EVERY routing decision** — a lesson that is really a project fact (path, run-command, module map, tooling choice) belongs in the machine-readable map, not in prose; read it or use `$project-config` to know its schema before deciding
- Use exact config schema field names (`node .claude/hooks/lib/project-config-schema.cjs --describe`) and prefer an existing field — NEVER invent a key, and route config writes through `$project-config`
- Check for existing entries before creating duplicates
- Confirm target file with user before writing
- **Skill-specific route:** When a user asks to learn something during an active skill invocation, or a lesson is learned while performing a task whose route matched a skill, treat the lesson as a candidate extension of that skill's project protocol. Call `$project-skill-protocol add ...` for a new overlay; call `$project-skill-protocol update <exact-name> ...` only after exact-name resolution identifies an existing overlay. Do not save that candidate only to generic lessons/prose.
- **Protocol authority:** Preserve `$project-skill-protocol`'s mode resolution, target/scope resolution, additive-only constraint, target-collision and contradiction handling, proposal/user-confirmation gate, three-write contract, and mirror-sync rule. Learn must not bypass or replace any of them.
- **Confirmation remains required:** Keep Learn's existing user confirmation and mandatory end-task flow; delegating a skill-specific candidate does not waive the project protocol's own proposal/user-confirmation gate.
- **Ordinary-route fallback:** When no active/matching skill exists or the lesson is not skill-specific, keep the existing FACT/RULE classification, carrier routing, confirmation, save, and end-task flow.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Usage

### Add a lesson

```
$learn always use the validation framework fluent API instead of throwing ValidationException
$learn never call external APIs in command handlers - use Entity Event Handlers
$learn prefer async/await over .then() chains
```

### List lessons

```
$learn list
```

### Remove a lesson

```
$learn remove 3
```

### Clear all lessons

```
$learn clear
```

## Reference Doc Catalog (READ before routing)

Each file in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) is auto-initialized by `session-init-docs.cjs` hook and populated by `/scan-*` skills. Understanding their roles is **critical** for correct routing: routing is static — read the doc whose **Read Trigger** matches your task.

| File                             | Role & Content                                                                                   | Read Trigger (static)               | Scan Skill                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------- |
| `project-structure-reference.md` | Architecture, directory tree, tech stack, module registry, service map                           | New area / architecture work        | `$scan --target=project-structure` |
| `backend-patterns-reference.md`  | Backend/hook patterns: CJS modules, CQRS, repositories, validation, message bus, background jobs | Editing backend / CQRS / API files  | `$scan --target=backend-patterns`  |
| `seed-test-data-reference.md`    | Seed/dev-data patterns: environment gate, idempotency loop, DI scope safety, command-dispatch    | Seeder / DataSeeder file edits      | `$scan --target=seed-test-data` |
| `frontend-patterns-reference.md` | Frontend patterns: components, state mgmt, API services, styling conventions, directives         | Editing frontend / UI files         | `$scan --target=frontend-patterns` |
| `integration-test-reference.md`  | Test architecture: base classes, fixtures, helpers, service-specific setup, test runners         | Integration test file edits         | `$scan --target=integration-tests` |
| `feature-spec-reference.md`      | Feature doc templates, app-to-service mapping, doc structure conventions                         | Authoring / reading feature specs   | `$scan --target=feature-spec`      |
| `code-review-rules.md`           | Review rules, conventions, anti-patterns, decision trees, checklists                             | Any review skill activation         | `$scan --target=code-review-rules` |
| `lessons.md`                     | General lessons — fallback catch-all. Read on EVERY task (per project-reference-docs gate)       | Every task                          | Managed by `$learn`       |
| Configured styling reference | CSS/preprocessor conventions, naming, tokens, theming, responsive behavior | Styling edits | Follow the configured scan owner; generic custom docs use `scan --target=generic-reference-doc --filename=<configured-file>`; manual docs remain owner-maintained |
| `design-system/README.md`        | Design system: tokens overview, component inventory, app-to-doc mapping                          | Design / UI file edits              | `$scan --target=design-system`     |
| `e2e-test-reference.md`          | E2E test patterns: framework, page objects, config, best practices                               | E2E file edits                      | `$scan --target=e2e-tests`         |
| `domain-entities-reference.md`   | Domain entities, data models, DTOs, aggregate boundaries, ER diagrams, cross-service sync        | Backend / frontend domain work      | `$scan --target=domain-entities`   |
| `docs-index-reference.md`        | Documentation tree, file counts, doc relationships, keyword-to-doc lookup                        | Doc lookup / navigation             | `$scan --target=docs-index`        |

**Key insight:** `lessons.md` and `code-review-rules.md` are the highest-recurrence routing targets — read them on every relevant task. Place high-recurrence lessons where the matching **Read Trigger** guarantees a future session opens them.

### Also a routing destination: `docs/project-config.json` (machine-readable, NOT prose)

The catalog above is prose. `docs/project-config.json` is the project's **machine-readable map** — modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns — and it is what `CLAUDE.md` and the `docs/project-reference/**` docs are generated from. Every skill is told to read it BEFORE investigating, planning, or coding, so a fact recorded there reaches more sessions than the same fact written into one prose doc.

**Read Trigger:** every task, ahead of the prose docs. **Owned by:** `$project-config`.

**Learn its shape before routing anything into it** — either read `docs/project-config.json` directly, or invoke `$project-config`, which knows the schema and its exact field names:

```bash
node .claude/hooks/lib/project-config-schema.cjs --describe   # exact field names + per-field derivation notes
```

| Lesson really is…                                                                                          | Carrier                                             |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| A project **FACT** a schema field already models — a path, glob, run-command, module/service map, framework or tooling choice, doc root, test/E2E/integration setup, startup or health-check command | `docs/project-config.json` (via `$project-config`)  |
| A **RULE, pattern, or anti-pattern** an agent must reason with                                              | the matching doc in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)          |
| Both — a new fact AND the rule for using it                                                                 | write the fact to config AND the rule to prose      |

Rules:

- MUST check `docs/project-config.json` as a candidate on EVERY routing decision — why: a project fact written only as prose is invisible to the tooling that reads the config, and is silently overwritten the next time the generated docs regenerate from it.
- MUST use exact schema field names (`--describe`, copy verbatim) and prefer an EXISTING field over a new one — why: unknown keys are accepted as warnings (`project-config-schema.cjs` unknown-key warnings), so an invented key looks like it worked while no consumer ever reads it.
- No existing field fits → do NOT invent a top-level key silently. Route the lesson to prose and surface the gap to the user as a proposed schema addition — why: a schema change is a framework decision, not a side effect of `$learn`.
- Prefer routing the config write through `$project-config` (Plan → Review → Execute + validation) over hand-editing the JSON — why: it validates after each phase and knows the field names this skill would otherwise guess.
- Config carries FACTS, never prose lessons — NEVER paste a narrative lesson into a config string field. — why: the config is consumed by tooling and by every skill's prefetch; prose there bloats every session and belongs in a reference doc.

---

## Smart File Routing (CRITICAL)

### Lesson Triage Gate (MANDATORY — run FIRST, before routing or saving)

| Gate           | Question                                                                               | Pass           | Fail → Action                                        |
| -------------- | -------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| **Recurrence** | "Would this mistake recur in a future session WITHOUT this reminder?"                  | Yes → continue | No → skip `$learn`; mistake is situational           |
| **Auto-fix**   | "Could `$code-review`, `$code-simplifier`, `$security-review`, or a linter catch this automatically?" | No → continue  | Yes → skip `$learn`; update the review skill instead |

**Both gates must pass.** A lesson review skills already catch adds noise without value. A one-off situational mistake won't be prevented by a persisted rule.

---

### Skill-Specific Project-Protocol Route (BLOCKING)

Before applying the generic Routing Table, detect whether either condition holds:

- the user asks to learn something during an active skill invocation; or
- the lesson is learned while performing a task whose route matched a skill.

When either condition holds:

1. Identify the active/matching skill by its exact skill name.
2. Treat the lesson as a candidate extension of that skill's project protocol.
3. **MUST ATTENTION** Preserve Learn's existing confirmation before writing, then call `$project-skill-protocol add ...` for a new overlay or `$project-skill-protocol update <exact-name> ...` only after exact-name resolution identifies an existing overlay.
4. **MUST ATTENTION** Let `$project-skill-protocol` perform its own mode resolution, target/scope resolution, additive-only screen, target-collision and contradiction handling, proposal/user-confirmation gate, three-write contract, and mirror sync. Do not write overlay bodies, index rows, or the `CLAUDE.md` protocol block directly from Learn.
5. Do not save the candidate only to `lessons.md` or another generic prose carrier.

If neither condition holds, continue with the generic Routing Table and existing Learn confirmation flow.

---

### Routing Table

Route to the **most relevant file** based on lesson content. Every bare `*.md` filename in the `Route to` column resolves inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

| If lesson is about...                                                                                                                    | Route to                                                | Section hint                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Code review rules, anti-patterns, review checklists, YAGNI/KISS/DRY, naming conventions, review process                                  | `code-review-rules.md`           | Add to most relevant section (anti-patterns, rules, checklists) |
| Backend/hook patterns: modules, CQRS, repositories, entities, validation, message bus, background jobs, migrations, configured persistence | `backend-patterns-reference.md`  | Add to relevant section or Anti-Patterns section                |
| Frontend patterns: components, state stores, forms, API services, styling conventions, directives, pipes                                  | `frontend-patterns-reference.md` | Add to relevant section or Anti-Patterns section                |
| Integration/unit tests: test base classes, fixtures, test helpers, test patterns, assertions, test runners                               | `integration-test-reference.md`  | Add to relevant section                                         |
| E2E tests: Playwright, Cypress, Selenium, page objects, E2E config, browser automation, visual regression                                | `e2e-test-reference.md`          | Add to relevant section                                         |
| Domain entities, data models, DTOs, aggregates, entity relationships, cross-service data sync, ER diagrams                               | `domain-entities-reference.md`   | Add to Entity Catalog or Relationships section                  |
| Project structure, directory organization, module boundaries, tech stack choices, service architecture                                   | `project-structure-reference.md` | Add to relevant architecture section                            |
| Styling conventions selected by project config, including CSS/preprocessor rules, tokens, theming, and responsive design | Configured styling reference | Add to the relevant styling section or route it to the document owner |
| Design system, design tokens, component library, UI kit conventions, Figma-to-code patterns                                              | `design-system/README.md`        | Add to relevant design section                                  |
| Feature documentation, doc templates, doc structure conventions, app-to-service doc mapping                                              | `feature-spec-reference.md`      | Add to relevant conventions section                             |
| Documentation indexing, doc organization, doc-to-code relationships, doc lookup patterns                                                 | `docs-index-reference.md`        | Add to relevant section                                         |
| **Project FACTS the config models:** source/module paths, globs, service or app maps, framework + search keywords, test / E2E / integration run-commands, system startup or health-check commands, doc roots, design-system or styling locations, tooling choices | `docs/project-config.json` **via `$project-config`**    | Existing schema field, exact name from `--describe` — NEVER an invented key |
| General lessons, workflow tips, tooling, AI behavior, project conventions, anything not matching above                                   | `lessons.md`                     | Append as dated list entry                                      |

---

### Prevention Depth Assessment (MANDATORY before saving)

Before saving any lesson, critically evaluate whether a doc update alone is sufficient or a deeper prevention mechanism is needed:

| Prevention Layer                            | When to use                                                                   | Example                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Doc update only**                         | One-off awareness, rare edge case, team convention                            | "Always use fluent validation API" → `backend-patterns-reference.md` |
| **Project config field** (`docs/project-config.json`) | The lesson is a machine-readable project FACT every skill should ground on before acting | "Integration tests need the system started first" → `integrationTestVerify.startupScript` / `systemCheckCommand` via `$project-config` |
| **Prompt rule** (`development-rules.md`)    | Rule that ALL agents must follow on every task                                | "Grep after bulk edits" → `.claude/docs/development-rules.md`                               |
| **Static protocol lesson** (`sync-inline-versions.md`) | Universal AI mistake, high recurrence, silent failure, any project | "Re-read files after context compaction" → `.claude/skills/shared/sync-inline-versions.md` |
| **Hook** (`.claude/hooks/`)                 | Automated enforcement, must never be forgotten                                | "Dedup markers must match" → `lib/dedup-constants.cjs` + consistency test                   |
| **Test** (`.claude/hooks/tests/`)           | Regression prevention, verifiable invariant                                   | "All hooks import from shared module" → test in `test-all-hooks.cjs`                        |
| **Skill update** (`.claude/skills/`)        | Workflow step that should always include this check                           | "Review changes must check doc staleness" → skill SKILL.md update                           |

**Decision flow:**

1. **Capture** the lesson
2. **Ask:** "Could this mistake recur if the AI forgets this lesson?" If yes → needs more than a doc update
3. **Ask:** "Can this be caught automatically by a test or hook?" If yes → recommend hook/test
4. **Evaluate Static Protocol Lesson promotion** (see below)
5. **Present options to user** with ask the user directly:
    - "Doc update only" — save to the best-fit reference file (default for most lessons)
    - "Doc + prompt rule" — also add to `development-rules.md` so all agents see it
    - "Doc + Static Protocol Lesson" — also add to shared protocol lessons (see criteria below)
    - "Full prevention" — plan a hook, test, or shared module to enforce it automatically
6. **Execute** the chosen option. For "Full prevention", create a plan via `$plan` instead of just saving.

### Static Protocol Lesson Promotion (MANDATORY evaluation)

After generalizing a lesson, evaluate whether it qualifies as a **Static Protocol Lesson** in `.claude/skills/shared/sync-inline-versions.md`. Static protocol lessons are baked into `CLAUDE.md`, mirrored into `AGENTS.md`, and synced to Codex carriers through project-init/sync tooling.

**Qualification criteria (ALL must be true):**

1. **Universal** — Applies to ANY AI coding project, not just this codebase
2. **High recurrence** — AI agents make this mistake repeatedly across sessions without the reminder
3. **Silent failure** — The mistake produces no error/warning; it silently degrades output quality
4. **Not already covered** — No existing Static Protocol Lesson addresses the same root cause

> **Static Protocol Lessons** — Universal AI mistake prevention rules baked into static carriers. Stored in `.claude/skills/shared/sync-inline-versions.md` under the `ai-mistake-prevention` and `ai-mistake-prevention:full` SYNC blocks. Each must be universal, high-recurrence, and silent-failure.
> READ `.claude/skills/shared/sync-inline-versions.md` to check for duplicates before adding.

**If qualified:** Recommend "Doc + Static Protocol Lesson" option. On user approval, append the lesson as a new bullet to the relevant shared SYNC blocks, then run the project-init / sync pipeline so `CLAUDE.md`, `AGENTS.md`, and Codex carriers regenerate from the shared source.

**If NOT qualified:** Explain why (e.g., "Too project-specific", "Already covered by existing Static Protocol Lesson about X", "Low recurrence — only happens in rare edge cases"). Proceed with doc-only or prompt-rule option.

### Lesson Quality Gate (BLOCKING — generalize before you save)

> **CORE PROTOCOL — do not skip:** A `$learn` request always arrives as a SPECIFIC case ("don't migrate via the bus and spam Elasticsearch"). Saving it verbatim is the default failure mode. You MUST transform specific → generic BEFORE writing: name the underlying class of mistake, drop the incident's nouns, and write a rule that fires across many future cases ("migrations write the DB directly, never via message bus — applies to all migrations"). If you cannot state the lesson without naming this ticket's files/services/tools, it is NOT generic yet — climb one more abstraction level. When in doubt, save the MORE generic version; a too-specific lesson is dead weight injected on every prompt.

Every lesson MUST be **root-cause level and generic across any codebase**. Apply this 3-step extraction before saving:

**Step 1 — Name the FAILURE MODE, not the symptom:**

The failure mode is the reasoning or assumption that broke — not what the output looked like.

| Symptom (BAD — reject this)       | Failure mode (GOOD — save this)                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Used wrong enum value"           | "Generated code using an assumed API without verifying it exists in source"                                      |
| "Wrong namespace/import"          | "Assumed project setup from convention without reading project-specific config files first"                      |
| "Happy-path test failed in CI"    | "Wrote assertions without tracing what runtime infrastructure the code path requires"                            |
| "Set properties that don't exist" | "Assumed all types in a hierarchy share the same interface without reading the base class"                       |
| "Always read file X before Y"     | "Assumed execution context without reading the owning layer's contract — fixed at symptom site instead of cause" |

**Step 2 — Verify generality:**

Does this failure mode apply to ≥3 different contexts or codebases? If only one file or one specific case → go up one abstraction level. A good lesson prevents an entire _class_ of mistakes.

**Step 3 — Write as a universal rule:**

- Strip ALL project-specific names, file paths, class names, and tool names
- Must be useful on any codebase, any language, any task type
- If multiple mistakes share the same failure mode → consolidate to ONE lesson, not many
- Test: "Would an AI working in Java, Go, or Python on a different project benefit from this?" If yes → good. If no → rewrite.

**Anti-pattern examples:**

- BAD: "Always check `lib/dedup-constants.cjs` for marker strings" → project-specific path
- GOOD: "When consolidating modules, ensure shared constants are imported from a single source of truth — never define inline duplicates."
- BAD: "Update `.claude/docs/hooks/README.md` after deleting hooks" → project-specific file
- GOOD: "Deleting components causes documentation staleness cascades — map all referencing docs before removal."
- BAD: "Read GlobalUsings.cs before adding usings in \*.IntegrationTests" → project-specific file
- GOOD: "Before generating code that uses project conventions (imports, namespaces, annotations), read the project's bootstrap/configuration files for that layer — convention files override framework defaults silently."

### End-Phase Learn Review Gate (MANDATORY before marking complete)

Run these 2 tasks at the end of every `$learn` operation:

**Task 1 — Learn Review (value + generality + recurrence):**

- Keep only lessons with clear prevention value.
- Lesson must be either:
    - Universal across many projects/codebases, OR
    - A stable project-wide principle (architecture invariant, naming invariant, workflow invariant).
- Reject lessons that are:
    - Specific to the current ticket/change/file,
    - Rare edge cases with low recurrence,
    - Already covered by existing lessons or review skills.
- If target is `lessons.md` (injected on every prompt), apply stricter bar: high impact + high recurrence only.

**Task 2 — Run `$why-review` (adversarial challenge):**

- Use `$why-review` to challenge whether this lesson deserves persistent memory.
- Verify:
    - Why this lesson prevents repeated mistakes,
    - Why this should be a lesson instead of a one-time note,
    - Why auto-checks (`$code-review`, `$code-simplifier`, `$security-review`, linters, hook/test) are insufficient.
- If rationale is weak, rewrite at higher abstraction or skip `$learn`.

### Routing Decision Process

1. **Run Triage Gate** — recurrence + auto-fix filters; stop here if either fails
2. **Read the lesson text** — identify keywords and domain
3. **Apply Lesson Quality Gate** — analyze root cause, generalize, verify universality
4. **Detect skill-specific route.** If the active/matching skill condition holds, follow the Skill-Specific Project-Protocol Route and do not continue with the generic carrier steps below; otherwise continue.
5. **Classify the carrier — FACT vs RULE (do this BEFORE the generic Routing Table).** Ask: *"Is this a machine-readable project fact, or a rule an agent must reason with?"* Fact → `docs/project-config.json`; rule → a prose reference doc; both → both. To decide, read the config or use `$project-config` (`--describe`) so the judgment rests on the real schema, never on a guess about what the config holds. — why: skipping this step is how a project fact ends up as prose that no tooling reads and the next regeneration contradicts.
6. **Run Prevention Depth Assessment** — determine if doc/config-only or deeper prevention needed
7. **Match against the generic Routing Table** — pick the best-fit file (or config field)
8. **Tell the user:** "This lesson fits best in `docs/{file}`. Confirm? [Y/n]"
9. **On confirm** — read target file, find the right section, append the lesson (config target → route through `$project-config`)
10. **On reject** — ask user which file to use instead

### Format by Target File

**For `lessons.md`** (general lessons):

```markdown
- [YYYY-MM-DD] <lesson text>
```

**For pattern/rules files** (code-review-rules, backend-patterns, frontend-patterns, integration-test):

- Find the most relevant existing section in the file
- Append the lesson as a rule, anti-pattern entry, or code example
- Use the file's existing format (tables, code blocks, bullet lists)
- If no section fits, append to the Anti-Patterns or general rules section

## Budget Enforcement (MANDATORY for `lessons.md`)

`lessons.md` — resolved inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — is a static project-reference carrier read during project work. Token budget must be controlled.

**Hard limit:** 20000 characters (~6666 tokens). Check BEFORE saving any new lesson.

**Workflow when adding to `lessons.md`:**

1. Read file, count characters (run `wc -c` on the resolved `lessons.md` path)
2. If current + new lesson > 20000 chars → trigger **Budget Trim** before saving
3. If under budget → save normally

**Budget Trim process:**

1. Display all current lessons with char count each
2. Evaluate each lesson on two axes:
    - **Universality** — How often does this apply? (every session vs rare edge case)
    - **Recurrence risk** — How likely is the AI to repeat this mistake without the reminder?
3. Score each: **HIGH** (keep as-is), **MEDIUM** (candidate to condense), **LOW** (candidate to remove)
4. Present to user with ask the user directly: "Budget exceeded. Recommend removing/condensing these LOW/MEDIUM items: [list]. Approve?"
5. On approval: condense MEDIUM items (shorten wording), remove LOW items, then save new lesson
6. On rejection: ask user which to remove/condense

**Condensing rules:**

- Remove examples, keep the rule: `"Patterns like X break Y syntax"` → just state the rule
- Merge related lessons into one if they share the same root cause
- Target: each lesson ≤ 250 chars (one concise sentence + bold title)

**Does NOT apply to:** Other routing targets (`backend-patterns-reference.md`, `code-review-rules.md`, etc.) — those files have their own size and are injected contextually, not on every prompt.

## Behavior

1. **`$learn <text>`** — Run the existing triage and quality gates; for a skill-specific lesson, call `$project-skill-protocol add ...` or `$project-skill-protocol update <exact-name> ...` through the Skill-Specific Project-Protocol Route, otherwise route and append to the best-fit file (check budget if target is `lessons.md`)
2. **`$learn list`** — Read and display lessons from ALL 12 target files (show file grouping + char count for `lessons.md`)
3. **`$learn remove <N>`** — Remove lesson from `lessons.md` by line number
4. **`$learn clear`** — Clear all lessons from `lessons.md` only (confirm first)
5. **`$learn trim`** — Manually trigger Budget Trim on `lessons.md`
6. **File creation** — If target file doesn't exist, create with header only

## Auto-Inferred Activation

When Claude detects correction phrases in conversation (e.g., "always use X", "remember this", "never do Y", "from now on"), this skill auto-activates. When auto-inferred (not explicit `$learn`), **confirm with the user before saving**: "Save this as a lesson? [Y/n]". If the detection occurs during an active/matching skill route, use the Skill-Specific Project-Protocol Route; otherwise use ordinary routing.

## How Lessons Reach the AI

Lessons and pattern references are read statically, per the project-reference-docs gate in `CLAUDE.md`:

- `lessons.md` — read on **every** task (the gate always includes it).
- Pattern/rule references (`backend-patterns-reference.md`, `code-review-rules.md`, etc.) — read by their matching trigger (see the Reference Doc Catalog table above).

Because the routing is static prose, Claude and Codex load the same lessons and patterns whether their hooks are enabled, unavailable, or stale.

## Prompt Enhancement (MANDATORY final step)

After saving a lesson to any target file, run `$prompt-enhance` on the modified file(s) to optimize AI attention anchoring and token quality.

**When to run:**

- After EVERY successful lesson save (regardless of target file)
- Pass the specific file path(s) that were modified

**What it does:**

- Ensures the new lesson integrates with existing top/bottom summary anchoring
- Optimizes token usage — tightens prose, merges redundant content
- Verifies no content loss from the save operation

**Then run the AI-discovery gate (`SYNC:ai-discovery-doc-quality`) on each modified file:** a lesson reaches the file's top critical rules or closing reminders only when it outranks a rule already there (those anchors hold 1–3 rules; otherwise it stays in its section, stated once); the carrier stays reachable from the docs index or root context (a new carrier doc gets a trigger row there); an edited pointer to another doc is `read <path> when <situation>` with an existing target.

**How to invoke** — substitute the resolved reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

```
$prompt-enhance <reference-docs root>/<modified-file>.md
```

**Skip conditions (do NOT run prompt-enhance if):**

- The save was to `lessons.md` AND the file is under 1500 chars (too small to benefit)
- The user explicitly requests "save only, no enhance"

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.
>
> **Mandatory end tasks are ALWAYS (in order):**
>
> 1. "Run **Learn Review** (lesson value + generality + recurrence gate)."
> 2. "Run `$why-review` to challenge whether the lesson is worth persistent memory."
> 3. "Run `$prompt-enhance <modified-file>` to optimize lesson content for AI attention anchoring."
>
> Do NOT mark the skill complete until all 3 tasks run.

<!-- SYNC:ai-discovery-doc-quality -->

> **AI-Discovery Doc Quality** — Applies to every doc an AI agent reads to do its job: root instruction files (`CLAUDE.md`, `AGENTS.md`) and their templates, project-reference docs, the docs index, `lessons.md`, and prompt/protocol registries. Such a doc is a routing prompt: the agent must find the right fact fast and never miss a critical rule. Doc layouts differ per project — resolve roots from project config (framework default as fallback) and discover docs by glob; never assume a fixed file set.
>
> 1. **Top (primacy):** the first screen states the doc's purpose, when to read it, and its 1–3 most critical rules — before any detail.
> 2. **Bottom (recency):** a long doc (roughly >150 lines) or one carrying MUST/NEVER rules ends with closing reminders that repeat the goal and those critical rules.
> 3. **Navigate with triggers:** point to another doc as `read <path> when <situation>`, never a bare link or "see also". A root or index doc routes every question/task class to one doc; every AI-read doc is reachable from the root or index — no orphans.
> 4. **Existing targets only:** glob-verify every referenced path and drop dead rows; name a not-applicable doc once as a skip, never as a route.
> 5. **One owner per fact:** state a fact where it is owned and route elsewhere with a trigger. Generated sections and mirrors are fixed at their source (generator, template, config) and regenerated — never hand-edited.
> 6. **Token-efficient:** apply `$prompt-enhance` principles — compress prose, lead with the answer, no counts/trees/TOCs an agent can derive (unless a repository-owned check or ADR requires them, e.g. `<!-- COUNT:… -->` markers), one example per non-obvious rule. Never compress code, tables, paths, commands or evidence; never lower rule density.
> 7. **Truncating readers:** when a host reads only a byte budget, place routing and irreversible-action guardrails first and measure their offsets.
>
> **Final gate (each changed doc, before reporting done):** purpose + critical rules on the first screen · reminders at the end when long · every cross-doc pointer has a trigger and an existing target · no orphan doc · hand-owned doc enhanced with `$prompt-enhance` unless the owning skill records a documented skip (e.g. a stamp/count-only edit, or the user asked for no enhance); a generated doc → enhance its source or template, then regenerate. Surgical: apply to what the change touched plus the top/bottom anchors — never a license to rewrite a whole doc.

<!-- /SYNC:ai-discovery-doc-quality -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** GENERALIZE FIRST — extract the generic, many-cases rule; NEVER persist the specific incident as written. Strip all ticket/file/service/tool names before saving.

**IMPORTANT MUST ATTENTION** Skill-specific route: when a user asks to learn during an active skill invocation, or a lesson is learned during a task whose route matched a skill, treat it as a candidate project protocol extension and call `$project-skill-protocol` — `add` for a new overlay, `update <exact-name>` only after exact-name resolution — instead of saving only to generic lessons/prose.

**IMPORTANT MUST ATTENTION** Preserve `$project-skill-protocol`'s mode resolution, target/scope resolution, additive-only constraint, collision/contradiction handling, proposal/user-confirmation gate, three-write contract, and mirror-sync rule; Learn must not bypass or replace that protocol. Keep ordinary carrier routing when no active/matching skill exists or the lesson is not skill-specific.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — full bodies above are canonical):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** critical + sequential thinking, traced proof, confidence >80%, NEVER guess as fact.

**IMPORTANT MUST ATTENTION Goal:** Persist each lesson at its failure-mode level into the carrier a future session will actually read — the matching skill's project protocol when the lesson is skill-specific, otherwise the best-fit prose reference doc or `docs/project-config.json` when the lesson is really a machine-readable project fact.

**IMPORTANT MUST ATTENTION** main steps, in order: generalize → Triage Gate → Lesson Quality Gate → detect skill-specific route (**delegate to `$project-skill-protocol`**) OR **classify carrier (FACT → config · RULE → prose · both → both)** → Prevention Depth Assessment → confirm with user → save → Learn Review → `$why-review` → `$prompt-enhance` → AI-discovery gate (lesson reachable from a top/bottom anchor and from the docs index).
**IMPORTANT MUST ATTENTION** run Triage Gate FIRST — if recurrence is low OR review skills can catch it, skip `$learn` entirely
**IMPORTANT MUST ATTENTION** check Reference Doc Catalog to find the best target file — NOT always `lessons.md`
**IMPORTANT MUST ATTENTION** consider `docs/project-config.json` as a candidate carrier on EVERY routing decision, alongside the prose docs — read it directly or use `$project-config` to learn its sections and exact field names first — why: a project fact written only as prose is invisible to the tooling that reads the config and is contradicted the next time the generated docs regenerate from it.
**IMPORTANT MUST ATTENTION** when routing into the config, copy field names verbatim from `node .claude/hooks/lib/project-config-schema.cjs --describe`, prefer an EXISTING field, and route the write through `$project-config`; no field fits → surface a proposed schema addition to the user instead of inventing a key — why: unknown keys only warn (`project-config-schema.cjs` unknown-key warnings), so an invented key looks applied while no consumer reads it.
**IMPORTANT MUST ATTENTION** keep the config to FACTS — NEVER paste a narrative lesson into a config string field; the rule belongs in the matching prose reference doc.
**IMPORTANT MUST ATTENTION** mandatory end tasks are ALWAYS: `Learn Review` → `$why-review` → `$prompt-enhance <modified-file>` (in order)
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** prefer auto-injected files for high-recurrence lessons (higher visibility)

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| "It's a lesson, so it goes in a lessons doc"     | Classify FACT vs RULE first. A path, run-command, or module map is config data — prose hides it from every consumer that reads the config. |
| "I know roughly what the config holds"           | Read it or run `$project-config` (`--describe`). Routing on a guessed schema writes a field nobody reads. |
| "No field fits, I'll add a sensible key"         | Unknown keys only warn. Surface a proposed schema addition to the user — never invent one silently.   |
| "Saving the user's exact words is most faithful" | Verbatim is the default failure mode. Climb to the failure mode; strip this ticket's nouns.           |
| "Small lesson, skip the end gate"                | Learn Review → `$why-review` → `$prompt-enhance` run on every save, no exceptions.                    |

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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. A documented command, entry point, or wrapper script gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>` — a single-OS example is an incomplete protocol. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
