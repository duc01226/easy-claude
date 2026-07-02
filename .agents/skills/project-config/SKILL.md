---
name: project-config
description: '[Utilities] Use when you need to scan workspace and update docs/project-config JSON to match current project structure.'
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
## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Scan workspace, update `docs/project-config.json` with accurate values.

**IMPORTANT MUST ATTENTION** follow Plan → Review → Execute workflow. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → classify scale → `$plan` → `$plan-review` → Execute phases (scan → merge → validate → fix) → Follow-up scans → `$prompt-enhance`

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION execute every required config section for every project size; small projects do not skip, defer, or require user approval to combine work
- MUST ATTENTION one task tracking per config section or explicit section group — NEVER scan everything in one pass
- MUST ATTENTION validate schema after each merge — `validateConfig(config)` returns PASSED or errors
- MUST ATTENTION review-and-fix after each phase — read back, spot-check paths, self-review
- MUST ATTENTION do not ask the user to choose scan granularity, combination, section ordering, or optional confirmation; auto-select the evidence-backed route and continue
- Path regexes MUST ATTENTION use `[\\/]` for cross-OS separator matching
- Schema enforced by `.claude/hooks/lib/project-config-schema.cjs`

---

## ⛔ Plan → Review → Execute Workflow

### Step 1: Detect — Classify Project Scale

**MUST ATTENTION classify scale FIRST** — drives task granularity for all subsequent phases.

```bash
find . -path "*/node_modules" -prune -o -name "*.csproj" -print 2>/dev/null | wc -l
find . -path "*/node_modules" -prune -o -name "package.json" -print 2>/dev/null | wc -l
find . -path "*/node_modules" -prune -o -type f -name "{configured-source-file-glob}" -print 2>/dev/null | wc -l
find . -maxdepth 3 -type d -name "{candidate-source-dir-name}" 2>/dev/null
```

| Scale         | Signal              | Task Approach |
| ------------- | ------------------- | --- |
| Small (<5)    | Few modules         | Execute every section; use compact phase groups only for reporting, not for skipping or asking |
| Medium (5–20) | Moderate count      | Execute every section with one task per section where practical |
| Large (20+)   | Many service groups | Execute every section; split 2a/2b and other broad scans per service group when needed |

Project size controls task grouping and split depth only. It does NOT permit skipping required sections, stopping for user approval, or asking whether to combine work. For small projects, auto-select the compact full-pass plan and keep validating after each merge/review phase.

### Step 2: Create Plan (`$plan`)

Create `plans/{date}-project-config-scan.md`:

1. Record scale classification from Step 1
2. Group config sections into phases (≤5 tasks each) while preserving full section coverage
3. Include review-and-fix cycle after each phase
4. Include every Phase 2 section (2a–2q) as either its own task or a named task inside a compact group with explicit evidence for each section

**Phase template:**

```
Phase A: Setup & Metadata — validate config, read schema, scan project metadata
Phase B: Module Discovery — backend projects, frontend apps/libs, framework keywords
Phase C: Context & UI — context groups, design system, styling, component system
Phase D: Testing & Infra — testing, E2E, databases, messaging, API, infrastructure
Phase E: Graph Connectors — API endpoints, implicit connections, referenceDocs
Phase F: Final Review — consolidate, validate, hook tests, create /scan-* tasks
Phase G: Self-Review — re-invoke $project-config to verify all config matches source code
```

### Step 3: Review Plan (`$plan-review`)

Run `$plan-review` on the generated scan plan; resolve blocking findings before executing any phase.

### Step 4: Execute

Per phase: task tracking → scan → merge → validate → spot-check → fix → next phase.

### Review-and-Fix Cycle (MANDATORY per phase)

1. Read back updated config sections
2. Spot-check 2–3 paths against actual dirs
3. Run schema validation
4. Self-review: missing modules? Accurate descriptions? Correct regexes?
5. Fix before proceeding

---

## Intermediate Workspace

Medium/large projects: `mkdir -p.ai/workspace/project-config` — write phase reports before merging. Delete after consolidation.

---

## ⛔ Schema Protection Rules

**NEVER** rename/remove/restructure top-level sections. **NEVER** change field types. **NEVER** populate deprecated v1 sections for new projects. **NEVER** remove v1 data from existing projects.

**MAY** add entries to maps/arrays, update values, add optional schema fields, populate v2 sections.

### Schema Structure (v2)

```
docs/project-config.json
├── schemaVersion, project{ name, description, languages[], packageManagers[], monorepoTool }
├── modules[] — { name, kind, pathRegex, description, tags[], meta{} }
├── contextGroups[] — { name, pathRegexes[], fileExtensions[], guideDoc, patternsDoc, stylingDoc, designSystemDoc, rules[] }
├── styling — { technology, guideDoc, appMap{}, patterns[] }
├── designSystem — { docsPath, modernUiNote, appMappings[] }
├── componentSystem — { type, selectorPrefixes[], filePattern, layerClassification{} }
├── framework — { name, backendPatternsDoc, frontendPatternsDoc, codeReviewDoc, integrationTestDoc, searchPatternKeywords[] }
├── testing — { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }
├── e2eTesting — { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, ... }
├── databases{}, messaging{ broker, patterns[], consumerConvention }, api{ style, docsFormat, docsPath, authPattern }
├── infrastructure — { containerization, orchestration, cicd{ tool, configPath } }
├── graphConnectors — apiEndpoints{ enabled, frontend{ framework, paths[] }, backend{ framework, paths[], routePrefix } }
│   └── implicitConnections[] — { name, edgeKind, paths[], source{ filePattern, contentPattern, keyGroup }, target{...}, matchBy }
├── referenceDocs[] — { filename, purpose, sections[] }
├── integrationTestVerify — { guidance, referenceDocs[], quickRunCommand, testProjectPattern, testProjects[], systemCheckCommand, runScript, startupScript }
├── workflowPatterns — { architectureStyle, codeHierarchy, cssMethodology, stateManagement, crossModuleValidation, featureDocTemplate, reviewRulesDoc }
└── DEPRECATED: backendServices, frontendApps, scss, componentFinder, sharedNamespace
```

> MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` for exact field names.

### ⛔ Common AI Field Name Mistakes

| Wrong                                 | Correct                          |
| ------------------------------------- | -------------------------------- |
| `classPattern`, `pattern`, `regex`    | `contentPattern`                 |
| `keyExtractor`, `captureGroup`        | `keyGroup` (number, not regex)   |
| `pathRegex` singular (in appMappings) | `pathRegexes` (array)            |
| `designDoc`, `doc`                    | `docFile`                        |
| `name`, `file` (in referenceDocs)     | `filename`                       |
| `examples`                            | `scssExamples`                   |
| `"exact"`, `"contains"`               | `"key-equals"`, `"key-contains"` |
| `glob`, `fileGlob`                    | `filePattern`                    |

---

## Phase 0: Setup

```bash
# 0a. Validate current config
node -e "const{validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');const c=JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8'));console.log(formatResult(validateConfig(c)))"

# 0b. Read exact schema shapes (MANDATORY)
node .claude/hooks/lib/project-config-schema.cjs --describe

# 0c. Check CLAUDE.md
test -f CLAUDE.md && echo "EXISTS" || echo "MISSING"

# 0d. Create workspace
mkdir -p .ai/workspace/project-config
```

## Phase 1: Read Current Config

Read `docs/project-config.json`. Note populated vs skeleton sections.

---

## Phase 2: Section-by-Section Scans

**Each subsection = one task tracking or an explicit named child inside a compact group.** Per task: investigate → report → merge → validate. Small projects still cover every subsection; compact grouping is an execution convenience, not permission to skip or ask.

### 2a. Modules — Backend

```bash
find . -path "*/node_modules" -prune -o -name "*.csproj" -print | head -50
find . -name "pom.xml" -o -name "build.gradle" | head -50
find . -path "*/node_modules" -prune -o -name "package.json" -print | head -50
find . -name "go.mod" | head -50
```

Build `modules[]` entries: `{ name, kind, pathRegex, description, tags[], meta{} }`

- `kind`: `"backend-service"`, `"library"`, `"framework"`

### 2b. Modules — Frontend

```bash
find . -name "nx.json" -o -name "{frontend-framework-config}" -o -name "lerna.json" -o -name "turbo.json" 2>/dev/null | head -5
find . -maxdepth 5 -type d \( -name apps -o -name libs -o -name packages \) 2>/dev/null | head -30
```

Build entries: `kind: "frontend-app"` or `kind: "library"`.

### 2c. Project Metadata

Detect languages (`.cs`→csharp, `.ts`→typescript, `.py`→python, `.java`→java, `.go`→go), package managers, monorepo tool.
Build `project { name, description, languages[], packageManagers[], monorepoTool }`.

### 2d. Framework Patterns

Grep `abstract class`, `interface I`, most-imported symbols.
Build `framework { name, searchPatternKeywords[] }` from commonly used base classes.

### 2e. Context Groups

Build `contextGroups[]` with `pathRegexes[]`, `fileExtensions[]`, `patternsDoc`, `rules[]`.
Rules MUST ATTENTION be specific: "Use the service-specific repository (e.g. `OrderRepository`), not the generic repository base" not "follow best practices".

### 2f–2h. Design System, Styling, Component System

- `designSystem { docsPath, modernUiNote, appMappings[] }`
- `styling { technology, fileExtensions, guideDoc, appMap{}, patterns[] }`
- `componentSystem { type, selectorPrefixes[], filePattern, layerClassification{} }`

### 2i–2j. Testing & E2E

- `testing { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }`
- `e2eTesting { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, runCommands{}, tcCodeFormat, entryPoints[] }`
- `integrationTestVerify { guidance, referenceDocs[], runScript, startupScript, quickRunCommand, systemCheckCommand, testProjectPattern, testProjects[] }`
- `integrationTestVerify.referenceDocs[]` MUST contain project-specific docs that explain setup prerequisites before a verifier runs `systemCheckCommand` or test commands.

### 2k–2n. Databases, Messaging, API, Infrastructure

- `databases {}` (freeform)
- `messaging { broker, patterns[], consumerConvention }`
- `api { style, docsFormat, docsPath, authPattern }`
- `infrastructure { containerization, orchestration, cicd{ tool, configPath } }`

### 2o. Graph Connectors — API Endpoints

Only if project has BOTH frontend AND backend.

| Frontend  | Signal          | Backend   | Signal                             |
| --------- | --------------- | --------- | ---------------------------------- |
| `{configured-frontend-framework}` | configured package marker | `{configured-backend-framework}` | configured backend manifest marker |
| `react`   | `react`         | `spring`  | `spring-boot-starter-web`          |
| `vue`     | `vue`           | `express` | `express` in package.json          |
| `generic` | None            | `fastapi` | `fastapi` in requirements.txt      |

Route prefix: derive from configured backend framework and existing route declarations.

### 2p. Graph Connectors — Implicit Connections

#### ⛔ How implicitConnections Works (MUST ATTENTION UNDERSTAND)

Algorithm: scan source files → extract keys via `contentPattern` regex capture group `keyGroup` → scan target files → match keys via `matchBy` → create `edgeKind` edges.

#### Exact Schema Fields

| Field             | Type     | Required | Description                                                        |
| ----------------- | -------- | -------- | ------------------------------------------------------------------ |
| `name`            | string   | Yes      | Unique rule identifier                                             |
| `edgeKind`        | string   | Yes      | `"MESSAGE_BUS"`, `"TRIGGERS_EVENT"`, `"PRODUCES_EVENT"`, or custom |
| `paths`           | string[] | No       | Directories to scan                                                |
| `source`/`target` | object   | Yes      | `{ filePattern, contentPattern, keyGroup }`                        |
| `matchBy`         | string   | Yes      | `"key-equals"` (exact) or `"key-contains"` (substring)             |

**source/target fields:** `filePattern` (glob, e.g. `"*.cs"`), `contentPattern` (regex WITH capture group), `keyGroup` (1-based integer, default 1)

**⛔ NEVER use** `classPattern`, `keyExtractor`, `pattern`. **ALWAYS use** `contentPattern`, `keyGroup`.

#### Detection Heuristics

- **Configured runtime:** discover event, handler, publisher, and consumer base types from codebase grep and project-reference docs.
- **TypeScript:** Redux dispatch→reducer, NgRx createAction→ofType, EventEmitter emit→on
- **Python:** Celery task.delay→@app.task, Django signal.send→@receiver
- **Java:** publishEvent→@EventListener, KafkaTemplate→@KafkaListener

#### Example (correct format)

```json
{
    "name": "entity-to-event-handlers",
    "edgeKind": "MESSAGE_BUS",
    "paths": ["{configured-domain-source-root}/", "{configured-application-source-root}/{event-handler-folder}/"],
    "source": { "filePattern": "{configured-source-file-glob}", "contentPattern": "{configured-entity-pattern}", "keyGroup": 1 },
    "target": { "filePattern": "{configured-source-file-glob}", "contentPattern": "{configured-event-handler-pattern}", "keyGroup": 1 },
    "matchBy": "key-contains"
}
```

**IMPORTANT MUST ATTENTION** record detected rules in the plan/report before writing; do not pause for user approval. **IMPORTANT MUST ATTENTION** scope `paths` to relevant dirs (not repo root).

### 2q. Reference Docs — Canonical Floor (MUST normalize, NEVER raw-import)

⛔ Reference docs are the FRAMEWORK's canonical set, not whatever files happen to sit in `docs/project-reference/`. Do **NOT** build `referenceDocs[]` by listing on-disk files — that silently re-imports drift (legacy filenames like `feature-docs-reference.md`, missing canonical docs, wrong order). Normalize against the canonical floor instead:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');console.log(JSON.stringify(h.normalizeReferenceDocs((loadProjectConfig()||{}).referenceDocs),null,2))"
```

- Set `config.referenceDocs` = the returned **`normalized`** array (canonical docs + genuine project-specific extras, canonical order, legacy names resolved, canonical `templatePath`s preserved). Add project-specific reference docs only as EXTRA entries; **never** delete or rename a canonical entry.
- For each **`renames[]`** `{from,to}`: if `docs/project-reference/<from>` exists — `git mv` it to `<to>` when `<to>` is absent; if `<to>` already exists, `<from>` is a stale duplicate → confirm `<to>` holds the canonical content, then `git rm <from>`. Migrate every downstream textual reference (`docs-index-reference.md`, `project-structure-reference.md`) `<from>` → `<to>`.
- **`added[]`** are canonical docs missing on disk — the SessionStart hook (or the matching `$scan --target=<key>`) creates them. Do not hand-fabricate content; per-doc purpose/sections come from `DEFAULT_REFERENCE_DOCS`.
- Re-run the probe after merging; `changed:false` with empty `renames`/`added`/`removedLegacy` is the only PASS state.

---

## Phase 3: Consolidate & Write

Merge section-by-section. Overwrite only with concrete scan findings. Large projects: merge incrementally.

## Phase 4: Verify (MANDATORY)

1. Schema validation — MUST ATTENTION pass with zero errors
2. Spot-check 2–3 service paths — verify each path exists (`file:line` evidence)
3. Run hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

## Phase 5: Follow-Up Tasks

| Reference Doc                                                                 | Scan Skill                        |
| ----------------------------------------------------------------------------- | --------------------------------- |
| `project-structure-reference.md`                                              | `$scan --target=project-structure` (FIRST) |
| `backend-patterns-reference.md`                                               | `$scan --target=backend-patterns`          |
| `seed-test-data-reference.md`                                                 | `$scan --target=seed-test-data`   |
| `design-system/` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `$scan --target=ui-system`        |
| `integration-test-reference.md`                                               | `$scan --target=integration-tests`         |
| `feature-spec-reference.md`                                                   | `$scan --target=feature-spec`              |
| `code-review-rules.md`                                                        | `$scan --target=code-review-rules`         |
| `e2e-test-reference.md`                                                       | `$scan --target=e2e-tests`                 |
| `domain-entities-reference.md`                                                | `$scan --target=domain-entities`           |

Then: `$claude-md-init` (LAST). Optionally: `$graph-build`.

## Phase 6: Enhance Generated Docs (MANDATORY)

Run `$prompt-enhance` on all generated/updated docs and `CLAUDE.md`. One task per file, parallel OK.

## Phase 7: Self-Review Verification (MANDATORY)

Re-invoke skill: `$project-config Self review and verify everything again, ensure all is correct with current source code`. Catches regressions and issues missed in first pass.

## Output

Report: sections updated vs unchanged, new modules discovered, path mismatches, follow-up tasks created.
Include the project scale, the selected full-coverage task grouping, and confirmation that no required section was skipped because the project was small.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Scan workspace, update `docs/project-config.json` with accurate, schema-valid values via Plan → Review → Execute.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; trace every claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** classify project scale FIRST (Step 1) — drives all task granularity decisions.
**IMPORTANT MUST ATTENTION** plan first — recon → `$plan` → `$plan-review` → execute. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** execute all required sections for all project sizes; small projects get compact full-coverage grouping, never a permission question or skipped sections.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one task tracking per config section — NEVER monolithic scan.
**IMPORTANT MUST ATTENTION** Phase 7 self-review is MANDATORY — catches what every earlier phase missed.

**Anti-Rationalization:**

| Evasion                             | Rebuttal                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| "File looks simple, skip planning"  | Planning catches scale mistakes and regressions. Apply anyway.                 |
| "Already know the schema"           | Run `--describe` anyway — field names differ from memory. No proof = no check. |
| "Phase N looks fine, skip validate" | Schema errors compound across phases. Validate every phase, no exceptions.     |
| "Self-review is redundant"          | Phase 7 catches what every earlier phase missed. Never skip.                   |
| "Small project, skip task tracking" | Task tracking prevents drift on all project sizes. Always task tracking first.  |
| "Small project, ask before combining" | Do not ask. Auto-select compact full-coverage grouping and execute all sections with validation. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
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
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
