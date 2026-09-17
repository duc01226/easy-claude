---
name: project-config
description: '[Utilities] Use when scanning the workspace to update docs/project-config.json to match current structure.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Scan workspace, update `docs/project-config.json` with accurate values.

**IMPORTANT MUST ATTENTION** follow Plan → Review → Execute workflow. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → classify scale → `/plan` → `/plan-review` → Execute phases (scan → merge → validate → fix) → Follow-up scans → `/prompt-enhance`

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION execute every required config section for every project size; small projects do not skip, defer, or require user approval to combine work
- MUST ATTENTION one TaskCreate per config section or explicit section group — NEVER scan everything in one pass
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

### Step 2: Create Plan (`/plan`)

Create `{plans-root}/{date}-project-config-scan.md` in the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path:

1. Record scale classification from Step 1
2. Group config sections into phases (≤5 tasks each) while preserving full section coverage
3. Include review-and-fix cycle after each phase
4. Include every Phase 2 section (2a–2s) as either its own task or a named task inside a compact group with explicit evidence for each section

**Phase template:**

```
Phase A: Setup & Metadata — validate config, read schema, scan project metadata
Phase B: Module Discovery — backend projects, frontend apps/libs, framework keywords
Phase C: Context & UI — context groups, design system, styling, component system
Phase D: Testing & Infra — testing, E2E, databases, messaging, API, infrastructure
Phase E: Graph Connectors — API endpoints, implicit connections, referenceDocs
Phase F: Final Review — consolidate, validate, hook tests, create /scan-* tasks
Phase G: Self-Review — re-invoke /project-config to verify all config matches source code
```

### Step 3: Review Plan (`/plan-review`)

Run `/plan-review` on the generated scan plan; resolve blocking findings before executing any phase.

### Step 4: Execute

Per phase: TaskCreate → scan → merge → validate → spot-check → fix → next phase.

### Review-and-Fix Cycle (MANDATORY per phase)

1. Read back updated config sections
2. Spot-check 2–3 paths against actual dirs
3. Run schema validation
4. Self-review: missing modules? Accurate descriptions? Correct regexes?
5. Fix before proceeding

---

## Intermediate Workspace

Medium/large projects: `mkdir -p tmp/project-config` — write phase reports before merging. Delete after consolidation.

---

## ⛔ Local-Only Changes — `docs/project-config.local.json`

`docs/project-config.json` is **team-shared and committed**. Writing a personal preference into it
pushes that preference onto every teammate on the next pull. The git-ignored sibling
`docs/project-config.local.json` exists for exactly that case.

**MUST ATTENTION — route by who the change is for, and ask when it is ambiguous.**

| The user says | Write to |
| --- | --- |
| "turn X off **for me / on my machine / locally / just here / don't commit it**" | `docs/project-config.local.json` — **never** the team file |
| "turn X off **for this project / for the team / for everyone**" | `docs/project-config.json` (the normal scan/merge path) |
| A scan/merge run (Phases 0–7 below) | `docs/project-config.json` — scans describe the repository, which is a team fact |
| Neither is stated **and** the setting is a behavioural preference rather than a description of the repo (for example `portability.workflowAutoDetect`) | STOP and ask which scope they mean — guessing writes an unwanted file either way |

**Writing the local override:**

1. Confirm it is ignored before writing — `git check-ignore -v docs/project-config.local.json`.
   It is covered by the repo-root `.gitignore` rule `*.local.json`. If that command reports
   nothing, the file would be committed: STOP, tell the user, and add the ignore rule first.
   Never create an un-ignored `*.local.json`; that is the one outcome this whole path exists
   to prevent.
2. Write **only the overridden keys**, in the same nesting as the team file. It is a sparse
   overlay, not a copy — duplicating the whole config guarantees it rots against the team file.
3. Never delete or rewrite keys the user did not name, and never migrate settings out of the
   team file into the local one.
4. Report the absolute path you wrote, that it is git-ignored, and how to undo it (delete the
   file, or set the key back).

```jsonc
// docs/project-config.local.json — git-ignored, this machine only, sparse overlay
{
  "portability": { "workflowAutoDetect": false }
}
```

**Resolution contract** (`.claude/scripts/lib/workflow-routing-config.cjs` implements it for
`workflowAutoDetect`): framework default → team `docs/project-config.json` → local
`docs/project-config.local.json`, **later layer wins**. A layer that is absent, unparseable, or
simply silent on a key expresses no opinion and falls through to the layer below — so a missing
file never flips a setting, and the override works in BOTH directions (a developer can set `true`
locally to opt back in when the team set `false`). The local path is derived from the team config
path, so it follows a `.ck.json` `projectConfigPath` relocation automatically.

**⛔ SCOPE — why the tracked files do NOT change.** `CLAUDE.md`, `AGENTS.md` and
`.codex/CODEX_CONTEXT.md` are git-tracked. If a local preference rewrote them, it would appear as
modified tracked files and could be committed onto the team — defeating the whole point. So the
switch resolves at two scopes:

| Scope | Who resolves it | Layers applied |
| --- | --- | --- |
| `team` | every generator writing a **tracked** file (`generate-claude-md.cjs`, `sync-context-workflows.mjs`) | default + team config **only** |
| `effective` (default) | the **runtime** `UserPromptSubmit` carrier, which writes nothing | default + team + local override |

So a developer who disables routing locally gets it off **at runtime**, while the shared files keep
the team's content and the repository stays clean. Because those files still contain the gate, the
runtime carrier additionally states that it **overrides** them — so the model does not route from a
gate nothing contradicted.

**Do NOT tell the user to run `/ai-context-refresh` to "apply" a local override** — it is already
in effect at runtime, and regenerating would only rewrite tracked files. The generator prints a
notice explaining this. `--apply-local-routing` is the explicit escape hatch for a developer who
genuinely wants the local value baked into their working copy; it produces tracked-file changes
they must not commit, so only use it when they ask for exactly that.

---

## ⛔ Schema Protection Rules

**NEVER** rename/remove/restructure top-level sections. **NEVER** change field types. **NEVER** populate deprecated v1 sections for new projects. **NEVER** remove v1 data from existing projects.

**MAY** add entries to maps/arrays, update values, add optional schema fields, populate v2 sections.

### Schema Structure (v2)

```
docs/project-config.json
├── schemaVersion, project{ name, description, languages[], packageManagers[], monorepoTool }
├── modules[] — { name, kind, pathRegex, description, tags[], meta{} }
├── contextGroups[] — { name, pathRegexes[], pathGlobs[], fileNameRegexes[], excludePathRegexes[], excludePathGlobs[], fileExtensions[], priority, guideDoc, patternsDoc, stylingDoc, designSystemDoc, referenceDocs[], skills[], rules[], origin, detectedFingerprint }
├── conventionInjection — { enabled, maxChars, maxClassesPerEdit, reinjectAfterBytes, reinjectAfterMinutes, blindReinjectAfterMinutes, onRead, compactionMarkers[] }  (optional; per-file convention reminder)
├── styling — { technology, guideDoc, appMap{}, patterns[] }
├── designSystem — { docsPath, modernUiNote, appMappings[] }
├── componentSystem — { type, selectorPrefixes[], filePattern, layerClassification{} }
├── framework — { name, backendPatternsDoc, frontendPatternsDoc, codeReviewDoc, integrationTestDoc, searchPatternKeywords[] }
├── testing — { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }
├── e2eTesting — { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, execution{ surfaceIds[], auth{}, data{}, browser{}, evidence{}, convergence{} }, ... }
├── experienceVerification — { enabled, evidenceRoot, baselineRoot, acceptancePolicy, reviewOn[], surfaces[] }
├── databases{}, messaging{ broker, patterns[], consumerConvention }, api{ style, docsFormat, docsPath, authPattern }
├── infrastructure — { containerization, orchestration, cicd{ tool, configPath } }
├── graphConnectors — apiEndpoints{ enabled, frontend{ framework, paths[] }, backend{ framework, paths[], routePrefix } }
│   └── implicitConnections[] — { name, edgeKind, paths[], source{ filePattern, contentPattern, keyGroup }, target{...}, matchBy }
├── referenceDocs[] — { filename, purpose, sections[] }
├── integrationTestVerify — { guidance, referenceDocs[], quickRunCommand, testProjectPattern, testProjects[], systemCheckCommand, runScript, startupScript }
├── workflowPatterns — { architectureStyle, codeHierarchy, cssMethodology, stateManagement, crossModuleValidation, featureDocTemplate, reviewRulesDoc }
├── specRoots — { business{ path, authorship, m1Policy }, technical{ path, authorship, m1Policy } }  (drives /spec + /tech-spec)
├── docsRoots — { projectReference{ path }, adr{ path }, templates{ path }, plans{ path }, teamArtifacts{ path }, productRoadmap{ path } }  (relocatable doc roots; omit a sub-object to keep its default)
├── techSpecScan — { sourceRoot, fileExtensions[], annotationPattern }  (enables /tech-spec) | else _techSpecScanNote (deliberate-omission carrier)
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

## Deriving the Spec-System Config From Source (`specRoots` + `docsRoots` + `techSpecScan`)

> These two sections drive `/spec` (hand-authored business specs) and `/tech-spec` (derived technical specs). They are **optional in the schema but effectively required for any project that wants `/tech-spec`** — the generator exits non-zero when `techSpecScan` is absent. Derive each value from THIS project's own source; never copy another project's literals. `--describe` (Phase 0b) now emits a `#` derivation note per field — read it.

**`specRoots`** — declare each tree's location AND semantics:

| Field | Derive from | Typical value |
| --- | --- | --- |
| `business.path` | The hand-authored feature-spec dir (where `/spec` writes). | default `docs/specs`; this key in `docs/project-config.json` is what overrides it |
| `business.authorship` / `business.m1Policy` | Business tree is human-authored, tech-free prose. | `hand` / `strict` |
| `technical.path` | The generated technical-view dir (where `/tech-spec` writes). | e.g. `docs/tech-specs` |
| `technical.authorship` / `technical.m1Policy` | Technical tree is projected from code — naming code IS the point. | `derived` / `exempt` |

**`docsRoots`** — the six relocatable documentation roots, sibling to `specRoots` and sharing its exact shape and its exact rules. A project that keeps the framework layout declares NOTHING; every accessor then returns its documented default, byte-identically to a repo with no `docsRoots` at all. Declare a sub-object ONLY when that tree has actually moved, and derive its value from what is on disk — never copy another project's literals.

| Key (all six live under `docsRoots` in `docs/project-config.json`) | Source of truth (derive from) | Framework default | How to derive |
| --- | --- | --- | --- |
| `docsRoots.projectReference.path` in `docs/project-config.json` | The generated reference-doc tree `/scan` writes and every skill reads. | `docs/project-reference` | Locate the dir holding `docs-index-reference.md` / `lessons.md`; the `referenceDocs[]` FILENAMES are a canonical floor and never change — only this containing dir is configurable. |
| `docsRoots.adr.path` in `docs/project-config.json` | The Architecture Decision Record tree. | `docs/adr` | Find the dir of `NNNN-*.md` ADRs (or the one an existing ADR index points at). |
| `docsRoots.templates.path` in `docs/project-config.json` | The document-template tree. | `docs/templates` | Find the dir the project's doc/spec templates live in. |
| `docsRoots.plans.path` in `docs/project-config.json` | The implementation-plan tree `/plan` writes. | `plans/` | Find the dir of `{date}-{slug}/plan.md` plan folders. `.ck.json` `paths.plans` is a legacy fallback — this key WINS when both are set. |
| `docsRoots.teamArtifacts.path` in `docs/project-config.json` | The idea / PBI / story tree. | `team-artifacts` | Find the dir holding `ideas/`, `pbis/`, `stories/`. |
| `docsRoots.productRoadmap.path` in `docs/project-config.json` | The roadmap document. | `docs/product-roadmap.md` | A FILE path, not a dir — the single roadmap doc `/product-roadmap` maintains. |

Rules that bind every one of the six — identical to `specRoots`, and enforced by the schema, not by convention:

1. **A declared sub-object MUST carry its `path`.** A partial declaration (`"adr": {}`) is an **ERROR**, never a silent default — the same asymmetry `specRoots` already enforces. Absent = default; declared-but-invalid = build failure.
2. **Paths are repo-relative.** An absolute path or any `..` segment is rejected as repo-escaping.
3. **A declared path that does not exist on disk is a WARNING**, not an error — it lets `/project-init` seed the block before the tree is created.
4. **Validate on the fail-CLOSED plane before finishing.** The runtime accessors are fail-SOFT by design: a malformed, unreadable or absent config yields the documented DEFAULT and never throws, so a typo'd key is invisible at runtime. The ONLY surface that catches it is the validator — run it after every edit to this block:

   ```bash
   node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json
   ```

5. **Never invent a relocation.** If the tree sits at the default, OMIT the sub-object. A declared key restating the default is noise that later drifts from the code it was supposed to track.

**`techSpecScan`** — how `/tech-spec` finds annotated tests. Derive all three from the stack:

1. **`sourceRoot`** — the project's primary source dir (from `project.` layout / `modules[].pathRegex`), e.g. `src`.
2. **`fileExtensions`** — the source-language extensions (from `project.languages`), e.g. `[".cs"]`, `[".ts"]`, `[".java"]`.
3. **`annotationPattern`** — a regex matching THIS project's spec-annotation convention. **CONTRACT (hard): exactly two capture groups — group 1 = trait name (`TestSpec` or `TechnicalSpec`), group 2 = the non-empty spec id.** The generator validates both at parse time and refuses to run on a mismatch. Detect the convention by grepping existing tests, then build the pattern:

   | Stack / convention (illustrative) | Example annotation in source | `annotationPattern` |
   | --- | --- | --- |
   | C# xUnit `[Trait]` | `[Trait("TestSpec", "TC-001")]` | `\[Trait\("(TestSpec\|TechnicalSpec)"\s*,\s*"([^"]+)"\)\]` |
   | Java/Kotlin JUnit `@Tag` | `@Tag("TestSpec:TC-001")` | `@Tag\("(TestSpec\|TechnicalSpec):([^"]+)"\)` |
   | TS/JS test title tag | `describe('[TestSpec:TC-001] ...')` | `\[(TestSpec\|TechnicalSpec):([^\]]+)\]` |

   Adapt to whatever the project actually uses — the table is illustrative, not a fixed list. **Validate the 2-group contract before saving:**

   ```bash
   node -e "const p=/YOUR_PATTERN/; const c=(new RegExp(p.source+'|')).exec('').length-1; console.log('capture groups:', c, c===2?'OK':'FIX — must be exactly 2 (trait, id)')"
   ```

4. **No spec-annotation convention?** Do NOT invent one and do NOT leave `techSpecScan` half-filled. **Omit `techSpecScan` and set `_techSpecScanNote`** with a one-line reason — the generator then exits cleanly naming the missing key instead of reporting zero annotations, and the omission reads as a decision.

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
mkdir -p tmp/project-config
```

## Phase 1: Read Current Config

Read `docs/project-config.json`. Note populated vs skeleton sections.

---

## Phase 2: Section-by-Section Scans

**Each subsection = one TaskCreate or an explicit named child inside a compact group.** Per task: investigate → report → merge → validate. Small projects still cover every subsection; compact grouping is an execution convenience, not permission to skip or ask.

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
Each group is also a **convention class** (see 2r): include matchers (`pathRegexes` / `pathGlobs` / `fileNameRegexes` — at least one non-empty), optional excludes, `priority` band, and deliverable items (`rules[]`, `skills[]`, `referenceDocs[]`, `guideDoc`, `patternsDoc`).

### 2f–2h. Design System, Styling, Component System

- `designSystem { docsPath, modernUiNote, appMappings[] }`
- `styling { technology, fileExtensions, guideDoc, appMap{}, patterns[] }`
- `componentSystem { type, selectorPrefixes[], filePattern, layerClassification{} }`

### 2i–2j. Testing & E2E

- `testing { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }`
- `e2eTesting { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, runCommands{}, tcCodeFormat, entryPoints[], execution{ surfaceIds[], auth{}, data{}, browser{}, evidence{}, convergence{} } }`
- `e2eTesting.execution` is optional and E2E-specific. Link `surfaceIds[]` to `experienceVerification.surfaces[].id`; keep dependency/start/readiness/log/teardown commands in that surface's `localRun` object so there is one lifecycle owner. `auth` and `localRun.credentialsRef` store references only (`credentialsRef`/`storageStateRef`), never secret values; registration/seed commands must use environment, fixture, or secret-manager references for credentials. `data` records a verified seed/reference strategy; `browser` records the project runner/engine, visibility, optional human-QC action delay, and the shared wait-until policy; `evidence` records a project-relative root, capture kinds, and non-empty redaction reference when sensitive captures are enabled; `convergence` bounds the verify/fix loop. `--describe` is authoritative for exact nested field names and semantics.
- `integrationTestVerify { guidance, referenceDocs[], runScript, startupScript, quickRunCommand, systemCheckCommand, testProjectPattern, testProjects[] }`
- `integrationTestVerify.referenceDocs[]` MUST contain project-specific docs that explain setup prerequisites before a verifier runs `systemCheckCommand` or test commands.

### 2j. Experience verification

- `experienceVerification` is optional and project-neutral. Configure only user-facing or externally observable surfaces that the project can actually exercise and inspect: web, mobile, desktop, terminal, API, library, background service, generated output, or another evidence-backed kind.
- Each `surfaces[]` row records the project runner/tool, entry points, optional full/focused commands, impact triggers, evidence root, baseline root, and relevant states. Configuration is a routing contract, not proof that the environment can run it.
- Keep `acceptancePolicy` at `manual-acceptance-required` unless the project documents a named owner process. First-run evidence is candidate evidence; never promote a generated screenshot or current output automatically.
- If no applicable surface exists, use `enabled:false`, `surfaces:[]`, and an evidence-backed reason. If a relevant surface cannot run or be inspected, `/experience-review` records `ENVIRONMENT-BLOCKED`; it is not N/A or PASS.

#### E2E execution discovery order

When `e2eTesting.execution` is absent or partial, preserve every verified fact and discover missing facts in this order: (1) `docs/project-config.json` and the linked `experienceVerification.surfaces[].localRun`; (2) the E2E reference and existing runner config; (3) package/task scripts, compose/Make targets, CI workflows, fixtures/seed scripts, and auth setup docs; (4) a bounded repository scan for the configured framework's entry points. Record each discovered value with `file:line` evidence. A missing startup, readiness, auth, seed, browser, or evidence capability is `ENVIRONMENT-BLOCKED` for execution, not a guessed command or a silent pass. This profile does not turn the framework repository's own E2E N/A state into an adopter default.

For web human-QC, use the project's configured visible Playwright CLI path when the evidence supports it. Resolve or document one reusable bounded `waitUntil(condition, options)` policy: before every UI-control operation wait for readiness/actionability and applicable error-alert absence; after it wait for the expected positive/negative outcome, dropdown/options, selected state, or error-alert presence/absence; then require exactly **500ms** for actor pacing/presentation. The delay never replaces readiness or a real settle signal. Capture and read the configured screenshots, console/request logs, traces, or video, redact sensitive data, and keep accepted baselines human-owned.

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

### 2s. Documentation Roots — `docsRoots` (DETECT, then declare only what MOVED)

Run FIRST of the doc-root trio (**2s → 2q → 2r**): 2q normalizes `referenceDocs[]` INSIDE the reference-doc root, and 2r's detection only keeps docs that exist on disk — both read the wrong tree if a relocated root is still undeclared.

**Detect** — probe each of the 6 roots against what the repo actually has. The accessor returns the DEFAULT whenever nothing is declared, so a mismatch between the probe and the tree on disk is exactly the relocation you must record:

```bash
node -e "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const fs=require('fs');const keys=['projectReference','adr','templates','plans','teamArtifacts','productRoadmap'];console.log(JSON.stringify(keys.map(k=>{const p=l.getDocsRoot(k);return{key:k,resolved:p,exists:fs.existsSync(p)}}),null,2))"
```

- `exists:true` for every key ⇒ the project uses the framework layout. **Declare NOTHING.**
- `exists:false` for a key ⇒ glob the repo for that tree's signature (`docs-index-reference.md`/`lessons.md` for `projectReference`; `NNNN-*.md` for `adr`; `{date}-{slug}/plan.md` for `plans`; `ideas/`+`pbis/`+`stories/` for `teamArtifacts`; the roadmap FILE for `productRoadmap`). Found elsewhere ⇒ declare that sub-object with its repo-relative `path`. Not present at all ⇒ still declare nothing; the tree simply does not exist yet.

**Declare** — write only the moved sub-objects, each with its required `path` (a declared-but-pathless sub-object is an ERROR, not a default; see the `docsRoots` derivation section above for all six keys, their defaults, and their rules).

**Validate — MANDATORY, and the only surface that can catch a typo.** Runtime resolution is fail-SOFT (a bad config silently yields defaults); validation is fail-CLOSED:

```bash
node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json
```

Errors (missing `path`, absolute or `..`-escaping path) MUST be fixed before continuing. A "does not exist on disk" **warning** is acceptable only when `/project-init` is seeding a tree that is about to be created.

### 2q. Reference Docs — Canonical Floor (MUST normalize, NEVER raw-import)

⛔ Reference docs are the FRAMEWORK's canonical set, not whatever files happen to sit in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. Do **NOT** build `referenceDocs[]` by listing on-disk files — that silently re-imports drift (legacy filenames like `feature-docs-reference.md`, missing canonical docs, wrong order). Normalize against the canonical floor instead:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');console.log(JSON.stringify(h.normalizeReferenceDocs((loadProjectConfig()||{}).referenceDocs),null,2))"
```

- Set `config.referenceDocs` = the returned **`normalized`** array (canonical docs + genuine project-specific extras, canonical order, legacy names resolved, canonical `templatePath`s preserved). Add project-specific reference docs only as EXTRA entries; **never** delete or rename a canonical entry.
- For each **`renames[]`** `{from,to}`, inside the reference-doc root `<ref>` — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path: if `<ref>/<from>` exists — `git mv` it to `<to>` when `<to>` is absent; if `<to>` already exists, `<from>` is a stale duplicate → confirm `<to>` holds the canonical content, then `git rm <from>`. Migrate every downstream textual reference (`docs-index-reference.md`, `project-structure-reference.md`) `<from>` → `<to>`.
- **`added[]`** are canonical docs missing on disk — the SessionStart hook (or the matching `/scan --target=<key>`) creates them. Do not hand-fabricate content; per-doc purpose/sections come from `DEFAULT_REFERENCE_DOCS`.
- Re-run the probe after merging; `changed:false` with empty `renames`/`added`/`removedLegacy` is the only PASS state.

### 2r. Convention Classes — Detect & Merge (NEVER clobber)

Per-file convention classes tell the AI which rules, skill protocols and reference docs apply when it reads or edits a file (hook `file-convention-inject.cjs`; hookless fallback = CLAUDE.md "Automatic Skill Activation" table + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`). Run AFTER 2e/2i/2s/2q so detection sees the final `testing`, `e2eTesting`, `integrationTestVerify`, `specRoots`, `modules` and `framework` values. (`docsRoots` is deliberately NOT a detection input: no context group is keyed off a `docsRoots` value, so there is nothing for `convention-merge.cjs` to derive from it. 2s still runs first because detection drops docs that are not on disk, and a relocated-but-undeclared reference root makes every one of them look absent.):

```bash
node .claude/hooks/lib/convention-merge.cjs --detect --merge            # dry run: added / refreshed / kept
node .claude/hooks/lib/convention-merge.cjs --detect --merge --write --enable   # apply + conventionInjection.enabled=true
node .claude/hooks/lib/file-conventions.cjs --lookup <sample-path>      # verify what a file would receive
```

- Detection is stack-agnostic: it derives classes (`feature-spec`, `integration-test`, `e2e-test`, `test`, `backend`, `frontend`, `styling`, `general-code`) only from existing config keys and keeps only docs/skills that exist on disk.
- Merge is additive: a new class is ADDED with `origin: "detected"` + `detectedFingerprint`; a maintainer class (no/other origin) or an edited detected class (fingerprint no longer matches) is KEPT byte-identical; only an unedited detected class is REFRESHED. Nothing is ever removed.
- `--write` replaces the config atomically (temp + rename) and re-serializes it as 2-space JSON, so formatting may change even when no class did; content is unchanged unless the summary reports `added`, `refreshed` or a switch flip. Precedence: `priority` ascending (100 specific · 500 default · 900 general), ties by declaration order; earlier section wins on conflict.
- Opt-in only: `--enable` belongs to this explicit setup run; upgrades and hooks never flip it (absent `conventionInjection` ⇒ disabled, silent), and it never overrides a maintainer's explicit `enabled: false` (reported as `enableSkipped`).

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
| `project-structure-reference.md`                                              | `/scan --target=project-structure` (FIRST) |
| `backend-patterns-reference.md`                                               | `/scan --target=backend-patterns`          |
| `seed-test-data-reference.md`                                                 | `/scan --target=seed-test-data`   |
| `design-system/` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan --target=ui-system`        |
| `integration-test-reference.md`                                               | `/scan --target=integration-tests`         |
| `feature-spec-reference.md`                                                   | `/scan --target=feature-spec`              |
| `code-review-rules.md`                                                        | `/scan --target=code-review-rules`         |
| `e2e-test-reference.md`                                                       | `/scan --target=e2e-tests`                 |
| `domain-entities-reference.md`                                                | `/scan --target=domain-entities`           |

Then: `/ai-context-refresh` (LAST). Optionally: `/graph-build`.

## Phase 6: Enhance Generated Docs (MANDATORY)

Run `/prompt-enhance` on all generated/updated docs and `CLAUDE.md`. One task per file, parallel OK.

## Phase 7: Self-Review Verification (MANDATORY)

Re-invoke skill: `/project-config Self review and verify everything again, ensure all is correct with current source code`. Catches regressions and issues missed in first pass.

## Output

Report: sections updated vs unchanged, new modules discovered, path mismatches, follow-up tasks created.
Include the project scale, the selected full-coverage task grouping, and confirmation that no required section was skipped because the project was small.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (default `docs/project-reference/skill-protocols-reference.md`; a `referenceDocs` entry in `docs/project-config.json` overrides the path, and a `docsRoots.projectReference.path` entry relocates its containing directory), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Scan workspace, update `docs/project-config.json` with accurate, schema-valid values via Plan → Review → Execute.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; trace every claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** classify project scale FIRST (Step 1) — drives all task granularity decisions.
**IMPORTANT MUST ATTENTION** plan first — recon → `/plan` → `/plan-review` → execute. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** execute all required sections for all project sizes; small projects get compact full-coverage grouping, never a permission question or skipped sections.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one TaskCreate per config section — NEVER monolithic scan.
**IMPORTANT MUST ATTENTION** Phase 7 self-review is MANDATORY — catches what every earlier phase missed.

**Anti-Rationalization:**

| Evasion                             | Rebuttal                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| "File looks simple, skip planning"  | Planning catches scale mistakes and regressions. Apply anyway.                 |
| "Already know the schema"           | Run `--describe` anyway — field names differ from memory. No proof = no check. |
| "Phase N looks fine, skip validate" | Schema errors compound across phases. Validate every phase, no exceptions.     |
| "Self-review is redundant"          | Phase 7 catches what every earlier phase missed. Never skip.                   |
| "Small project, skip task tracking" | Task tracking prevents drift on all project sizes. Always `TaskCreate` first.  |
| "Small project, ask before combining" | Do not ask. Auto-select compact full-coverage grouping and execute all sections with validation. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
