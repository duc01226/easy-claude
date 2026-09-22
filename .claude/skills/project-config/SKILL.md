---
name: project-config
description: '[Utilities] Use when scanning the workspace to update the configured project-config file (default docs/project-config.json) to match current structure.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Keep the configured project-config file (default `docs/project-config.json`) valid and accurate while adding only optional project details supported by evidence.

**Summary:**

- The config file is required; the minimum valid content is `{"project":{"name":"<derived name>"}}`.
- Missing or invalid config blocks ordinary project-specific work until `/project-config` or `/project-init` repairs it.
- Read the schema and required project references, then select only the capability areas supported by the task or repository evidence.
- Omitted properties use documented defaults or evidence-backed skips. A declared but incomplete or unsupported section must be repaired or removed explicitly; never treat it as absent.
- Merge and validate selected changes; report omitted capabilities and follow-up work without inventing architecture or test cases.

**IMPORTANT MUST ATTENTION** follow Plan → Review → Execute workflow. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → identify supported capabilities → `/plan` → `/plan-review` → Execute selected phases (scan → merge → validate → fix) → applicable follow-up scans → self-review

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION ensure the configured project-config file exists and validates; `project.name` is the only required project property
- MUST ATTENTION route missing/invalid config through `/project-config` or `/project-init` before ordinary project-specific work
- MUST ATTENTION add optional properties only for a selected capability or direct repository evidence; omit absent capabilities instead of creating empty sections
- MUST ATTENTION one TaskCreate per selected config section or explicit section group — NEVER scan everything in one pass
- MUST ATTENTION validate schema after each merge — `validateConfig(config)` returns PASSED or errors
- MUST ATTENTION review-and-fix after each phase — read back, spot-check paths, self-review
- MUST ATTENTION choose scan granularity and section grouping from repository size and evidence; ask only when product scope or an unresolved project decision is actually required
- Path regexes MUST ATTENTION use `[\\/]` for cross-OS separator matching
- Schema enforced by `.claude/hooks/lib/project-config-schema.cjs`
- MUST ATTENTION when the user asks for help, options, or "what can I configure", run **Help Mode** below and STOP — never start a scan

---

## Help Mode (`--help`)

**Trigger:** `$ARGUMENTS` contains `--help`, `-h`, `help`, `options`, `what can I change`, `what does X do`, or any other request for the option surface rather than a config update.

**Help Mode is read-only and terminal.** Run the generator, present its output, answer the question, and STOP. Do NOT create tasks, do NOT scan the repository, and do NOT edit the config file. If the user then asks for a change, re-enter this skill in its normal workflow.

```bash
node .claude/skills/project-config/scripts/project-config-help.cjs            # orientation + most-consumed options
node .claude/skills/project-config/scripts/project-config-help.cjs --sections # every option, one line each
node .claude/skills/project-config/scripts/project-config-help.cjs --section=<name>
node .claude/skills/project-config/scripts/project-config-help.cjs --consumers        # who reads what, ranked
node .claude/skills/project-config/scripts/project-config-help.cjs --consumers=<key>  # name the skills/agents/hooks
node .claude/skills/project-config/scripts/project-config-help.cjs --docs     # reference docs: purpose + regenerating owner
node .claude/skills/project-config/scripts/project-config-help.cjs --roots    # relocatable roots, defaults, current values
node .claude/skills/project-config/scripts/project-config-help.cjs --skills   # skills that read project-config
node .claude/skills/project-config/scripts/project-config-help.cjs --current  # declared vs defaulted in THIS project
node .claude/skills/project-config/scripts/project-config-help.cjs --search=<term>
```

**Mode selection:**

| The user asks | Run |
|---|---|
| "what options are there", "help" | (no flag), then `--sections` if they want the full list |
| "what does `<section>` do / control" | `--section=<section>` |
| "how many skills use X", "what breaks if I change X" | `--consumers=<key>` |
| "which reference docs exist / what is each for" | `--docs` |
| "where do specs / plans / ADRs / templates live" | `--roots` |
| "what is configured for this project" | `--current` |
| anything by keyword | `--search=<term>` |

**Presentation rules:**

- Show the script output **verbatim and complete** — it is generated from `SCHEMA`, `PORTABILITY_TOKENS`, the reference-doc registry, and a live scan of `.claude/skills`, `.claude/agents`, `.claude/workflows`, and `.claude/hooks`. Do not summarise it away, and never retype a list from memory.
- THEN add the interpretation the script cannot: which change the user actually wants, what it will move, and the one command that applies it.
- Consumer counts are **name-reference counts**, not a call graph. A section with no named consumer may still be read indirectly through `project-config-loader.cjs`; say so rather than calling it unused.
- `--current` reports declared vs defaulted only. For a verdict on validity, run `node .claude/hooks/lib/project-config-schema.cjs --validate <configured path>`.
- For framework-wide help beyond the config file (skills, workflows, hooks, project architecture), route to `/project-help`. For init-time routing decisions, route to `/project-init --help`.

---

## ⛔ Plan → Review → Execute Workflow

### Step 1: Establish Identity and Capability Evidence

Read the configured project-config path and schema. If the file is absent, create the minimum schema-valid document with a non-empty `project.name`, derived from repository/package metadata or, when no metadata names the project, the repository-root directory. Do not infer language, architecture, framework, testing, UI, database, or product capabilities from the name.

Inventory only enough of the repository to answer the task and identify real manifests, source roots, tests, documentation, and configured tooling. Record repository size only when it helps group the selected work. Scale affects task grouping; it never creates a requirement to populate optional sections.

### Step 2: Create Plan (`/plan`)

Create `{plans-root}/{date}-project-config-scan.md` in the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path:

1. Record the required project identity and the source that supports its name
2. List only config areas selected by the request or supported by repository evidence; include the evidence and the fields to derive
3. Record absent capability areas as evidence-backed skips, not empty sections to populate
4. Group selected config areas into reviewable phases (≤5 tasks each when practical)
5. Include a review-and-fix cycle after each phase

**Phase template:**

```
Phase A: Required Identity — configured path, project name, schema, and existing values
Phase B: Selected Capabilities — one or more evidence-backed config areas, or record why none apply
Phase C: Merge & Validate — preserve existing user-authored values, validate declared sections, review the diff
Phase D: Follow-Up — queue only reference scans or config work for selected/evidenced capabilities
Phase E: Self-Review — confirm the required identity, declared capability evidence, and omissions
```

### Step 3: Review Plan (`/plan-review`)

Run `/plan-review` on the generated scan plan; resolve blocking findings before executing any phase.

### Step 4: Execute

Per selected phase: TaskCreate → inspect evidence → merge → validate → spot-check → fix → next phase. Record a capability as skipped when evidence shows it does not apply; do not create placeholder sections to make a phase appear complete.

### Review-and-Fix Cycle (MANDATORY per phase)

1. Read back updated config sections
2. Spot-check 2–3 paths against actual dirs
3. Run schema validation
4. Self-review: missing modules? Accurate descriptions? Correct regexes?
5. Fix before proceeding

---

## Intermediate Workspace

Medium/large projects: create `tmp/project-config` with `node -e "require('fs').mkdirSync('tmp/project-config',{recursive:true})"` when phase reports are useful. Delete the temporary reports after consolidation.

---

## ⛔ Local-Only Workflow Routing — `.claude/.ck.local.json`

The configured project-config file (default `docs/project-config.json`) is **team-shared and committed**. Two routing settings have a portable developer-local override: `portability.workflowAutoDetect` (the on/off switch) and `portability.workflowRouteProtocol` (optional custom protocol text the runtime route hook appends). Their local values belong in `.claude/.ck.local.json`, inside the copied framework bundle and ignored by `.claude/.gitignore`.

**MUST ATTENTION — route by who the change is for, and ask when it is ambiguous.**

| The user says | Write to |
| --- | --- |
| "turn workflow routing off/on **for me / on my machine / locally / just here / don't commit it**" | `.claude/.ck.local.json` — **never** the team file |
| "add/change the route protocol **for me / on my machine / locally / just here / don't commit it**" | `.claude/.ck.local.json` — **never** the team file |
| "turn workflow routing off/on **for this project / for the team / for everyone**" | The configured project-config file (the normal scan/merge path) |
| "add/change the route protocol **for this project / for the team / for everyone**" | The configured project-config file (the normal scan/merge path) |
| A scan/merge run (Phases 0–7 below) | The configured project-config file — scans describe the repository, which is a team fact |
| A local request for any other project-config field | Explain that no generic local overlay exists; keep repository facts in the team config |

**Writing the local override:**

1. Confirm it is ignored before writing — `git check-ignore -v .claude/.ck.local.json`.
   It is covered by the portable `.claude/.gitignore` rule `*.local.json`. If that command reports
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
// .claude/.ck.local.json — git-ignored, this machine only, sparse override
{
  "portability": { "workflowAutoDetect": false }
}
```

**Resolution contract** (`.claude/scripts/lib/workflow-routing-config.cjs` implements it for both
`workflowAutoDetect` and `workflowRouteProtocol`): framework default (`true` / none) → the configured
team project-config file → local `.claude/.ck.local.json`, **later valid layer wins**. A layer that is
absent, unparseable, or simply silent on a key expresses no opinion and falls through to the layer
below — so a missing file never flips a setting, and the override works in BOTH directions (a
developer can set `true`/a protocol locally to opt back in when the team set `false`/its own text).
The team path follows `.ck.json` `portability.projectConfigPath`; the local path remains
`.claude/.ck.local.json` so the portable framework carries its ignore rule to every consuming project.

### Custom route protocol (`portability.workflowRouteProtocol`)

Use this when the project wants the runtime route reminder to carry ADDITIONAL rules or a custom
protocol on top of the canonical route gate. The value is either:

- a **string** — inline markdown appended verbatim; or
- an **object** `{ "text": "...", "path": "..." }` — inline `text` and/or a **repo-relative** `path`
  to a markdown file read at runtime. Both may be supplied; `text` renders first, then the file body.
  Absolute paths and `..` segments are rejected (fail-closed in the schema; at runtime an unreadable
  or escaping path simply expresses no opinion and the cascade falls through).

```jsonc
// team (docs/project-config.json) — committed, applies to everyone
{ "portability": { "workflowRouteProtocol": { "path": "docs/project-protocols/route.md" } } }

// developer (git-ignored .claude/.ck.local.json) — local REPLACES the team value
{ "portability": { "workflowRouteProtocol": "Always prefer a targeted run over the full suite." } }
```

**Semantics.**

- The text is **additive** to the canonical gate and catalog, injected in its own marker block
  (`<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`) by `workflow-route-inject.cjs` at `UserPromptSubmit`. It is
  advisory context, never a blocking decision and never an authority escalation.
- Team and local layers do **not** concatenate: a valid local value **replaces** the team value, the
  same "later valid layer wins" rule the on/off switch uses. To extend the team protocol locally, copy
  its text into the local value (or point the local `path` at the shared file and add your lines).
- It is **runtime-only**. It is never stamped into tracked `CLAUDE.md` / `AGENTS.md` /
  `.codex/CODEX_CONTEXT.md` (those remain team-owned), so `/ai-context-refresh` and `$sync-codex` are
  never required to apply it.
- A protocol edit changes the delivery content hash, so the next `UserPromptSubmit` re-delivers it.
- **Safety and bounds.** A `path` naming a privacy-sensitive file (`.env`, credentials, secrets,
  `*.pem`/`*.key`) is refused — the validator errors and the runtime treats it as no opinion — because
  the hook would otherwise read that file into model context on every prompt. A file larger than the
  cap (20,000 bytes) is truncated with a visible marker; it is never injected unbounded.

**⛔ SCOPE — tracked defaults and runtime overrides.** `CLAUDE.md`, `AGENTS.md`, and
`.codex/CODEX_CONTEXT.md` carry the canonical default route gate. `workflow-route-inject.cjs`
resolves the effective default + team + local cascade at `UserPromptSubmit`, refreshes advisory
context when enabled (gate + catalog + optional `workflowRouteProtocol`), and otherwise stays
silent.

**Do NOT tell the user to run `/ai-context-refresh` or `$sync-codex` to apply an override.** The
next prompt resolves it at runtime. There is no option that bakes local routing or the custom
protocol into tracked files.

---

## ⛔ Schema Protection Rules

**NEVER** rename/remove/restructure top-level sections. **NEVER** change field types. **NEVER** populate deprecated v1 sections for new projects. **NEVER** remove v1 data from existing projects.

The config file is required. Its minimum valid document is:

```json
{
  "project": { "name": "<derived project name>" }
}
```

Only `project` and its non-empty `name` are required. Every other property is optional; add it only when the capability is requested or repository evidence supports it. Omit an absent capability instead of emitting empty arrays/objects. A declared section must satisfy its schema and be supported by evidence; a malformed or unsupported declaration is a validation error, not a signal to fall back silently.

**MAY** add evidence-backed entries to maps/arrays, update values, and declare optional schema sections when their capabilities apply.

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
├── e2eTesting — { framework, language, configFile, testsPath, pageObjectsPath? (only when a POM exists), fixturesPath, execution{ surfaceIds[], auth{}, data{}, browser{}, evidence{}, convergence{} }, ... }
├── experienceVerification — { enabled, evidenceRoot, baselineRoot, acceptancePolicy, reviewOn[], surfaces[] }
├── databases{}, messaging{ broker, patterns[], consumerConvention }, api{ style, docsFormat, docsPath, authPattern }
├── infrastructure — { containerization, orchestration, cicd{ tool, configPath } }
├── graphConnectors — apiEndpoints{ enabled, frontend{ framework, paths[] }, backend{ framework, paths[], routePrefix } }
│   └── implicitConnections[] — { name, edgeKind, paths[], source{ filePattern, contentPattern, keyGroup }, target{...}, matchBy }
├── referenceDocs[] — { filename, purpose, sections[] }
├── integrationTestVerify — { guidance, referenceDocs[], quickRunCommand, testProjectPattern, testProjects[], systemCheckCommand, runScript, startupScript }
├── workflowPatterns — { architectureStyle, codeHierarchy, cssMethodology, stateManagement, crossModuleValidation, featureDocTemplate, reviewRulesDoc }
├── specRoots — { business{ path, authorship, m1Policy }, technical{ path, authorship, m1Policy } }  (drives /spec + /tech-spec)
├── specArtifacts? — { version, kind, sections{ intent[], contracts[], evidence[] }, identifiers{ requirement{}, acceptance{}, scenario{} }, ownership, carriers[] } (native engineering-contract profile; omission preserves strict defaults)
├── docsRoots — { projectReference{ path }, adr{ path }, templates{ path }, plans{ path }, teamArtifacts{ path }, productRoadmap{ path } }  (relocatable doc roots; omit a sub-object to keep its default)
├── techSpecScan — { sourceRoot, fileExtensions[], annotationPattern }  (enables /tech-spec) | else _techSpecScanNote (deliberate-omission carrier)
├── hooks — { startupInstall{ enabled, packageManager, allowLifecycleScripts }, windowsGit{ enabled, autoRepair } }  (optional; hook behavior — omitted properties keep portable defaults)
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

## Deriving the Spec-System Config From Source (`specRoots` + `specArtifacts` + `docsRoots` + `techSpecScan`)

> The file is required, but all of these sections are optional. Add them only when the project has that documentation or tooling capability and the task requires its configuration. Derive each declared value from this project's own source; never copy another project's literals. A missing optional section means the documented default or an evidence-backed skip. A malformed declared section must fail validation visibly. `--describe` (Phase 0b) emits a `#` derivation note per field — read it.

**`specRoots`** — declare each tree's location AND semantics:

| Field | Derive from | Typical value |
| --- | --- | --- |
| `business.path` | The hand-authored feature-spec dir (where `/spec` writes). | default `docs/specs`; this key in `docs/project-config.json` is what overrides it |
| `business.authorship` / `business.m1Policy` | Business tree is human-authored, tech-free prose. | `hand` / `strict` |
| `technical.path` | The generated technical-view dir (where `/tech-spec` writes). | e.g. `docs/tech-specs` |
| `technical.authorship` / `technical.m1Policy` | Technical tree is projected from code — naming code IS the point. | `derived` / `exempt` |

**`specArtifacts`** — optional, versioned data contract for a project's established native requirement, case, and evidence structure. Omit it when the project uses the framework's strict business-spec and TestSpec defaults; never add a profile just to avoid adapting the corpus. Derive it from multiple canonical owner artifacts and their executing tests, not one convenient file.

| Field | Derive from | Rule |
| --- | --- | --- |
| `version`, `kind` | The supported normalized contract. | Use `1` and `engineering-contract`; read `--describe` for current schema details. |
| `sections.intent[]`, `sections.contracts[]`, `sections.evidence[]` | Exact headings in canonical owner artifacts. | Use literal aliases only; classify each stable heading once. Subheadings inherit their nearest configured parent. Missing or unmapped enforced content is UNKNOWN, never exempt. |
| `identifiers.requirement`, `identifiers.acceptance`, `identifiers.scenario` | Existing IDs in canonical specs and tests. | Each entry has a literal `prefix` and supported closed `grammar` (`decimal-lower-suffix` or `hyphen-tokens`); do not add regexes or custom parsers. |
| `ownership` | The source's stable owner and case relationship. | Current v1 supports `spec-path-and-case-id`; preserve owner path, case/scenario ID, and optional variant without creating another registry. |
| `carriers[]` | Real, executing test/spec carriers and their field names. | Use only supported `js-title-v1`, `js-keyed-cases-v1`, or `yaml-cases-v1` dialects; derive roots, extensions, call names, bindings, field mappings, and local YAML `acceptedStatuses` from source. Preserve many-to-many scenario/test cardinality when evidence shows it. |

The profile configures discovery and identity; it does not prove a test passes. Trace each row to its actual executor and inspected assertion. Validate every declared profile with `node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>`; obtain that path from `getConfiguredProjectConfigPath()` in `.claude/hooks/lib/project-config-loader.cjs`. Malformed profiles must fail visibly. The profile resolver is the canonical normalizer, not a second case registry.

**`docsRoots`** — the six relocatable documentation roots, sibling to `specRoots` and sharing its exact shape and its exact rules. A project that keeps the framework layout declares NOTHING; every accessor then returns its documented default, byte-identically to a repo with no `docsRoots` at all. Declare a sub-object ONLY when that tree has actually moved, and derive its value from what is on disk — never copy another project's literals.

| Key (all six live under `docsRoots` in `docs/project-config.json`) | Source of truth (derive from) | Framework default | How to derive |
| --- | --- | --- | --- |
| `docsRoots.projectReference.path` in `docs/project-config.json` | The generated reference-doc tree `/scan` writes and skills read. | `docs/project-reference` | Locate the configured reference root. The reference-doc catalog is metadata; selected filenames and task-specific references remain configurable. Always-on context inputs are resolved separately. |
| `docsRoots.adr.path` in `docs/project-config.json` | The Architecture Decision Record tree. | `docs/adr` | Find the dir of ADRs (or the one an existing ADR index points at). |
| `docsRoots.templates.path` in `docs/project-config.json` | The document-template tree. | `docs/templates` | Find the dir the project's doc/spec templates live in. |
| `docsRoots.plans.path` in `docs/project-config.json` | The implementation-plan tree `/plan` writes. | `plans/` | Find the dir of plan folders. `.ck.json` `paths.plans` is a legacy fallback — this key WINS when both are set. |
| `docsRoots.teamArtifacts.path` in `docs/project-config.json` | The idea / PBI / story tree. | `team-artifacts` | Find the dir holding the project's team artifacts. |
| `docsRoots.productRoadmap.path` in `docs/project-config.json` | The roadmap document. | `docs/product-roadmap.md` | A FILE path, not a dir — the single roadmap doc `/product-roadmap` maintains. |

Rules that bind every one of the six — identical to `specRoots`, and enforced by the schema, not by convention:

1. **A declared sub-object MUST carry its `path`.** A partial declaration (`"adr": {}`) is an **ERROR**, never a silent default — the same asymmetry `specRoots` already enforces. Absent = default; declared-but-invalid = build failure.
2. **Paths are repo-relative.** An absolute path or any `..` segment is rejected as repo-escaping.
3. **A declared path that does not exist on disk is a WARNING**, not an error — it lets `/project-init` seed the block before the tree is created.
4. **Validate on the fail-CLOSED plane before finishing.** The runtime accessors are fail-SOFT by design: a malformed, unreadable or absent config yields the documented DEFAULT and never throws, so a typo'd key is invisible at runtime. The ONLY surface that catches it is the validator — run it after every edit to this block:

   ```bash
   node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
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
# 0a. Resolve and inspect the configured project-config file. If absent, record that
#     this required file must be bootstrapped with project.name before normal work.
node -e "const fs=require('fs');const p=require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredProjectConfigPath();console.log(JSON.stringify({path:p,exists:fs.existsSync(p)},null,2))"

# 0b. Read exact schema shapes; use field names and requirements verbatim
node .claude/hooks/lib/project-config-schema.cjs --describe

# 0c. Validate an existing config before merging; missing config is repaired below
node -e "const fs=require('fs');const p=require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredProjectConfigPath();if(!fs.existsSync(p)){console.error('MISSING required project config: '+p);process.exitCode=1}else{const{validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(formatResult(validateConfig(JSON.parse(fs.readFileSync(p,'utf-8')))))}"

# 0d. Check CLAUDE.md without assuming a shell-specific `test` command
node -e "const fs=require('fs');console.log(JSON.stringify({path:'CLAUDE.md',exists:fs.existsSync('CLAUDE.md')}))"

# 0e. Optional: run this only when the scan benefits from temporary phase reports
node -e "require('fs').mkdirSync('tmp/project-config',{recursive:true})"
```

## Phase 1: Read Current Config

Read the configured file. Distinguish a missing/invalid required config from a valid minimal config: absence of optional sections does not make a valid config a skeleton. If the config is absent, bootstrap the required project identity first; if it is invalid, repair the reported errors before scanning. Preserve existing evidence-backed values.

---

## Phase 2: Evidence-Selected Config Areas

Select only the config areas that the task requests or repository evidence supports. Each selected area becomes one TaskCreate or a named child inside a compact group. Per task: investigate → record evidence → merge → validate. Record why an absent capability is skipped. Never scan or populate every schema section just because the schema supports it.

### 2a. Modules — Backend

Declare backend modules only when distinct services, packages, or libraries exist and their boundaries help route project work. Use manifests and source ownership as evidence; a repository may be a single application or library and need no `modules` property.

### 2b. Modules — Frontend

Declare frontend modules only when manifests and source show a frontend app or reusable UI package. Do not require a frontend section for a backend, CLI, service, or library project.

### 2c. Project Metadata

`project.name` is required and must be non-empty. Derive it from package/repository metadata; if no metadata names it, use the repository-root directory name. Add `description`, `languages[]`, and `monorepoTool` only when files or commands directly confirm them. `project.packageManagers` is a startup-install signal: omit it or use `[]` for no signal, or use exactly one string matching `^(npm|pnpm|yarn|bun)(?:@\d+\.\d+\.\d+)?$`. Malformed values or multiple entries fail closed; an exact `manager@major.minor.patch` entry must match the trusted external executable. Do not list every tool installed on the machine, and do not use this field as a precedence override. Do not infer a stack from the project name or directory labels.

### 2u. Hook Behavior — `hooks.startupInstall`

`hooks{ startupInstall{ enabled, packageManager, allowLifecycleScripts } }` is optional, and so is every property inside it. **Omit the whole section unless the project needs a non-default**: an omitted property keeps the portable default (`enabled: true`, `packageManager: "auto"`, `allowLifecycleScripts: false`), applied identically whether the property, the section, or the whole config file is absent — declaring the defaults records nothing and only adds a surface that can drift. Never invent a `packageManager` value: a non-`auto` value is one manager signal and never an override, so it must name the manager the root lockfile and manifest already agree on, or every startup install fails closed instead of installing. Declare `allowLifecycleScripts: true` only when the project documents that its root install needs dependency lifecycle scripts — and record WHY alongside it, because on its own the key does nothing: it is a repository request that takes effect only on a host that also sets `CK_STARTUP_INSTALL_TRUST=1`, so a reader who finds it with no rationale cannot tell whether the grant was ever intended. **PRESERVE an existing `hooks` section verbatim on regeneration** — it is maintainer-authored policy, is not derivable from repository evidence, and is never dropped, emptied, or normalized back to defaults by a scan.

Accepted startup-install example (there are no executable, argument, or path
fields):

```json
{
  "hooks": {
    "startupInstall": {
      "enabled": true,
      "packageManager": "auto",
      "allowLifecycleScripts": false
    }
  }
}
```

The section is still a repository request, not host authorization. Suppression
is removed only when the host also grants `CK_STARTUP_INSTALL_TRUST=1`; the same
grant controls whether ambient registry credentials may cross into the manager
child. `enabled: false` disables installation only: the integrity-first
`verify-install.cjs` SessionStart hook remains active. A missing project config
uses these portable defaults, an absent root `package.json` is a clean install
no-op, and invalid config skips installation with one diagnostic.

### 2v. Windows native Git/Git Bash capability

The optional `hooks.windowsGit{ enabled, autoRepair }` section is consumed by
the same `verify-install.cjs` SessionStart owner. Omitted values default to
`enabled: true` and `autoRepair: true`; `enabled: false` disables integration
and repair, while `autoRepair: false` retains a read-only probe. The hook accepts
only a canonical Git-for-Windows root containing working `git.exe`,
`git-bash.exe`, and `bash.exe`; WSL/System32 or a Windows App Execution Alias
is not native Git Bash. On explicit `startup` only, a missing/broken/incomplete
capability may launch the fixed, detached WinGet `Git.Git` repair worker after
the trusted App Installer boundary is validated. Other SessionStart sources
probe only, and unavailable WinGet/UAC/policy/ACL/process boundaries fail closed
without changing the host; the next startup re-probes.

The capability is published to children through `PATH`, `CK_GIT_EXE`,
`CK_GIT_BASH_EXE`, and `CK_GIT_BASH_PATH`. It cannot mutate the current parent
PowerShell/cmd environment. The repair worker has a private per-user OS-temp
resource lock and is bounded; PortableGit and generic installer fallbacks are
deferred. Keep this policy separate from `startupInstall`: it controls machine
capability repair, not package-manager selection or lifecycle trust.

### 2d. Framework Patterns

Declare `framework` only when the repository uses an identifiable framework or stable shared patterns worth routing to. Derive its name and search keywords from manifests, configuration, and repeated source usage; omit it for an unknown or absent framework.

### 2e. Context Groups

Declare `contextGroups[]` only for stable path-scoped conventions that materially improve work on those files. Every declared group needs a real matcher and evidence-backed rules/references; do not add an empty catch-all just to fill the section. Keep rules concise and checkable, and follow project-specific patterns instead of importing examples from another stack.

### 2f–2h. Design System, Styling, Component System

These are separate optional capabilities. Add `designSystem` only when the project owns maintained design tokens/components or a normative design guide; add `styling` only when there is a real styling technology and stable patterns; add `componentSystem` only when an established component convention helps route work. Omit unused sections and do not create placeholder docs or mappings.

### 2i–2j. Testing & E2E

- `testing { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }` is optional; configure only test lanes, tools, and commands found in manifests/scripts/configuration.
- `e2eTesting { framework, language, configFile, testsPath, pageObjectsPath?, fixturesPath, runCommands{}, tcCodeFormat?, entryPoints[], execution{ surfaceIds[], auth{}, data{}, browser{}, evidence{}, convergence{} } }` is optional; declare it only when an E2E/browser capability exists or is requested.
- Set `pageObjectsPath` only when source shows a real POM; it is a search hint, never proof that the project uses one. `tcCodeFormat` records an evidence-backed project convention only; when `specArtifacts` is declared, its identifier and carrier mappings govern native case identity.
- `e2eTesting.execution` is optional and E2E-specific. Link `surfaceIds[]` to `experienceVerification.surfaces[].id`; keep dependency/start/readiness/log/teardown commands in that surface's `localRun` object so there is one lifecycle owner. `auth` and `localRun.credentialsRef` store references only (`credentialsRef`/`storageStateRef`), never secret values; registration/seed commands must use environment, fixture, or secret-manager references for credentials. `data` records a verified seed/reference strategy; `browser` records the project runner/engine, visibility, optional human-QC action delay, and the shared wait-until policy; `evidence` records a project-relative root, capture kinds, and non-empty redaction reference when sensitive captures are enabled; `convergence` bounds the verify/fix loop. `--describe` is authoritative for exact nested field names and semantics.
- `integrationTestVerify { guidance, referenceDocs[], runScript, startupScript, quickRunCommand, systemCheckCommand, testProjectPattern, testProjects[] }` is optional and applies only where a project has a managed integration-test verifier.
- If an execution profile is explicitly declared but lacks a field needed for the requested verification, preserve the known facts and report the exact blocker; do not invent the runner, startup, auth, seed, or evidence behavior.

### 2j. Experience verification

- `experienceVerification` is optional and project-neutral. Configure it when an observable surface is in scope and there is evidence for what can be exercised and inspected: web, mobile, desktop, terminal, API, library, background service, generated output, or another kind.
- Each `surfaces[]` row records the project runner/tool, entry points, optional full/focused commands, impact triggers, evidence root, baseline root, and relevant states. Configuration is a routing contract, not proof that the environment can run it.
- Keep `acceptancePolicy` at `manual-acceptance-required` unless the project documents a named owner process. First-run evidence is candidate evidence; never promote a generated screenshot or current output automatically.
- If no applicable surface exists, omit the section or use its schema-supported disabled form only when a deliberate declaration is useful. If a relevant surface cannot run or be inspected, `/experience-review` records `ENVIRONMENT-BLOCKED`; it is not N/A or PASS.

#### E2E execution discovery order

When `e2eTesting.execution` is absent or partial, preserve every verified fact and discover missing facts in this order: (1) the configured project-config file and the linked `experienceVerification.surfaces[].localRun`; (2) the E2E reference and existing runner config; (3) package/task scripts, compose/Make targets, CI workflows, fixtures/seed scripts, and auth setup docs; (4) a bounded repository scan for the configured framework's entry points. Record each discovered value with `file:line` evidence. A missing startup, readiness, auth, seed, browser, or evidence capability is `ENVIRONMENT-BLOCKED` for execution, not a guessed command or a silent pass. This profile does not turn the framework repository's own E2E N/A state into an adopter default.

For web human-QC, use the project's configured visible browser path when the evidence supports it. Use the configured runner's native waits or an evidenced project helper for readiness/actionability and expected outcomes. Apply post-action pacing only when `e2eTesting.execution.browser.actionDelayMs` documents a project need; it never replaces readiness or a real settle signal. Capture and read configured screenshots, console/request logs, traces, or video, redact sensitive data, and keep accepted baselines human-owned.

### 2k–2n. Databases, Messaging, API, Infrastructure

These top-level sections are optional. Configure a database, messaging, API, or infrastructure capability only when repository files, active task scope, or project-owned documentation confirm it. Do not add empty sections or guess a provider from a dependency name alone.

- `databases {}` (freeform)
- `messaging { broker, patterns[], consumerConvention }`
- `api { style, docsFormat, docsPath, authPattern }`
- `infrastructure { containerization, orchestration, cicd{ tool, configPath } }`

### 2o. Graph Connectors — API Endpoints

Only when the repository has both frontend and backend capabilities and the task benefits from a configured connection map.

| Frontend  | Signal          | Backend   | Signal                             |
| --------- | --------------- | --------- | ---------------------------------- |
| `{configured-frontend-framework}` | configured package marker | `{configured-backend-framework}` | configured backend manifest marker |
| `react`   | `react`         | `spring`  | `spring-boot-starter-web`          |
| `vue`     | `vue`           | `express` | `express` in package.json          |
| `generic` | None            | `fastapi` | `fastapi` in requirements.txt      |

Route prefix: derive from configured backend framework and existing route declarations.

### 2p. Graph Connectors — Implicit Connections

Declare `graphConnectors.implicitConnections` only when the selected task or repository evidence contains traceable producer/consumer or other source-to-target relationships. A project without such relationships does not need graph-connector configuration.

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

### 2s. Documentation Roots — `docsRoots` (declare only evidenced relocations)

Inspect a docs root when the task uses it or repository evidence shows that it moved. Defaults apply when a root property is omitted; do not create directories or config objects just to populate the full root catalog. Resolve `projectReference` before scanning reference docs when it is relocated.

**Detect** — probe each of the 6 roots against what the repo actually has. The accessor returns the DEFAULT whenever nothing is declared, so a mismatch between the probe and the tree on disk is exactly the relocation you must record:

```bash
node -e "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const fs=require('fs');const keys=['projectReference','adr','templates','plans','teamArtifacts','productRoadmap'];console.log(JSON.stringify(keys.map(k=>{const p=l.getDocsRoot(k);return{key:k,resolved:p,exists:fs.existsSync(p)}}),null,2))"
```

- If a root used by this task exists outside its resolved default, locate its owner directory/file and declare only that moved sub-object with a repo-relative `path`.
- If the optional root is not used or does not exist, omit it. Do not create placeholder `adr`, plans, team-artifact, or roadmap roots merely to satisfy the schema catalog.

**Declare** — write only the moved sub-objects, each with its required `path` (a declared-but-pathless sub-object is an ERROR, not a default; see the `docsRoots` derivation section above for all six keys, their defaults, and their rules).

**Validate — MANDATORY, and the only surface that can catch a typo.** Runtime resolution is fail-SOFT (a bad optional config silently yields defaults); validation is fail-CLOSED. Pass the configured project-config path, including any `.claude/.ck.json` relocation:

```bash
node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
```

Errors (missing `path`, absolute or `..`-escaping path) MUST be fixed before continuing. A "does not exist on disk" **warning** is acceptable only when `/project-init` is seeding a tree that is about to be created.

### 2q. Reference Docs — Optional Task-Specific Selection

`referenceDocs` is optional. If absent, let the resolver choose its portable baseline (which may be empty) plus references supported by configured or repository-evidenced capabilities. If present, the array is the authoritative task-specific selection, including an explicit empty array; preserve its selected subset and order. Never append a fixed catalog to an explicit selection or write the entire catalog into a project config. The catalog is metadata for valid scan targets and aliases, not a mandatory project-doc floor.

Each entry requires `filename` and `purpose`; `sections` and `templatePath` are optional. `filename` is a project-reference-root-relative POSIX path (nested folders are allowed); `templatePath` is project-root-relative. Reject absolute paths, backslashes, empty/dot/traversal segments, and unsafe physical symlink resolutions. Do not use a template outside the project or write a reference outside its configured root.

The optional `workflowPatterns.featureDocTemplate` destination is also project-root-relative. Schema validation rejects unsafe lexical paths, and SessionStart checks physical containment before copying the framework template.

`scanTarget` is optional. Built-in filenames use their framework-owned scan target and must omit this property. A custom filename defaults to `manual`, so it can be curated without automatic scan or freshness claims. `scanTarget: "generic"` opts that selected custom doc into `/scan --target=generic-reference-doc --filename="<filename>"`, using its configured purpose and optional sections. Generic docs receive conservative repository-wide source-impact routing; choose `manual` when only its project owner should update it. Any other explicit target is invalid; projects cannot register executable scanner names through config.

Project-init separately ensures the always-on `lessons.md` and `docs-index-reference.md` inputs at the configured project-reference root. They do not become implicit additions to a task-specific `referenceDocs` selection.

Use the normalizer only to inspect how the current setting resolves. Do not write its portable defaults back into an absent property, and do not change an explicit list into the full registry:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');const c=loadProjectConfig()||{};console.log(JSON.stringify({declared:Object.prototype.hasOwnProperty.call(c,'referenceDocs'),resolved:h.normalizeReferenceDocs(c.referenceDocs,c)},null,2))"
```

- Leave `referenceDocs` absent when the resolver's portable baseline plus capability-aware defaults are the desired behavior.
- For an explicit selection, configure only the docs the project wants the framework to select. Normalize aliases/deduplication only within that selection, preserving intentional `[]`; never infer a broader selection from files on disk alone.
- Keep `lessons.md` and `docs-index-reference.md` under the configured project-reference root through the independent project-init/bootstrap path, regardless of the task-specific selection.
- Generate a selected project reference only when its scan target applies and its source evidence exists. Do not create unselected docs, fabricate content, or rename/delete files merely to match the framework catalog.

### 2t. Native Spec Artifact Profile — Derive Only from Stable Source

Run only when a spec/test-artifact capability already exists or is selected. Skip with evidence when the project has no such capability; do not create a spec profile or case corpus as part of generic setup. When selected, inspect the configured business root and applicable docs before convention detection.

1. Resolve `specRoots.business.path` (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides it) when configured or needed. Inspect representative canonical owner artifacts plus executing tests/case files; exclude derived technical projections. Trace native IDs and assertions to their executors before declaring a profile.
2. If no native profile is declared, strict business-spec and Section-8 TestSpec behavior applies by default, including TC IDs. Preserve this default; do not infer or add a native profile from one example.
3. For an established native format, declare only the supported v1 fields: `version: 1`, `kind: "engineering-contract"`, literal `sections` aliases for `intent`, `contracts`, and `evidence`; `identifiers` for `requirement`, `acceptance`, and `scenario` with a literal prefix + named grammar; `ownership: "spec-path-and-case-id"`; and one or more supported `carriers`.
4. Supported carriers are closed: `js-title-v1` maps literal suite/case call names; `js-keyed-cases-v1` maps a named binding and its `variant`, `scenario`, `requirements`, `rationale`, and `input` fields; `yaml-cases-v1` maps `scenario`, `status`, `requirements`, `acceptance`, `lists`, `variant`, `input`, and `expected`. For YAML, `acceptedStatuses` declares the local value(s) eligible for extraction; omitted values preserve the `approved` compatibility default. Derive roots, extensions, binding, call names, field names, and lifecycle values from source. Never add custom regexes, callbacks, parser plug-ins, or a second case registry.
5. Preserve real many-to-many coverage: one executor may assert several scenarios, and one scenario may have multiple variants/tests. Keep each owner + case/scenario ID + optional variant distinct, then inspect the assertion path for each claimed row. An aggregate result or ID grep alone is not evidence.
6. Validate with the exact schema description and fail-closed validator, using the configured config path:

   ```bash
   node .claude/hooks/lib/project-config-schema.cjs --describe
   node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
   ```

   Unknown versions, grammars, aliases, fields, or overlapping incompatible carriers are errors; correct the profile at its source rather than silently dropping it or falling back to TC defaults. An invalid declared profile blocks spec-related setup until corrected.

### 2r. Convention Classes — Detect & Merge (NEVER clobber)

Per-file convention classes tell the AI which rules, skill protocols and reference docs apply when it reads or edits a file (hook `file-convention-inject.cjs`; hookless fallback = CLAUDE.md "Automatic Skill Activation" table + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`). Run this optional detector only when useful context groups or opt-in convention injection are selected. If run, do so after the selected config areas so it sees their final evidence-backed values. (`docsRoots` is deliberately NOT a detection input: no context group is keyed off a `docsRoots` value.)

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

Merge only selected properties. Preserve existing user-authored values; replace a value only with stronger source evidence. Do not add empty objects or arrays for skipped capabilities.

## Phase 4: Verify (MANDATORY)

1. Schema validation — MUST ATTENTION pass with zero errors for the configured file, including every declared optional section.
2. Spot-check each newly declared path or matcher against the repository; do not require service paths when the project has no services.
3. Run focused config/hook checks for the changed behavior and the project's normal verification for any generated output.

## Phase 5: Follow-Up Tasks

Queue only the scan targets selected by `referenceDocs` or supported by repository evidence. Use the scan catalog's trigger for each selected target; omit absent frontend, backend, styling, design-system, domain, test, seed-data, E2E, and spec capabilities. A selected target with no source evidence is a visible blocker or skip, not a fabricated reference.

Then update root AI context when this config change affects it. Run `/graph-build` only when graph tooling is configured/available and the selected task needs a graph; otherwise record an evidence-backed skip.

## Phase 6: Enhance Selected Guidance (CONDITIONAL)

Run `/prompt-enhance` only on selected generated/updated project guidance when its instruction quality needs review; do not process unrelated or unselected reference docs.

## Phase 7: Self-Review Verification (MANDATORY)

Re-invoke skill: `/project-config Self review and verify everything again, ensure all is correct with current source code`. Catches regressions and issues missed in first pass.

## Output

Report: required config path and project identity; optional sections updated; evidence and source paths for declared values; capability areas skipped with reasons; reference selection semantics used; profile-aware spec behavior when relevant; validation results; and applicable follow-up tasks.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

**IMPORTANT MUST ATTENTION Goal:** Keep the required project config schema-valid, with only evidence-backed optional capabilities via Plan → Review → Execute.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; trace every claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** read the configured project-config file, docs index, `lessons.md`, task-required references, and exact schema before scanning; bootstrap missing config with a derived project name.
**IMPORTANT MUST ATTENTION** select scans from requested or evidenced capabilities; scale controls grouping only and never forces optional sections.
**IMPORTANT MUST ATTENTION** plan first — recon → `/plan` → `/plan-review` → execute. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** config file and non-empty `project.name` are required; optional properties are omitted when unsupported or unevidenced.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one TaskCreate per selected config section or explicit section group — NEVER scan everything in one pass.
**IMPORTANT MUST ATTENTION** keep absent `referenceDocs` distinct from explicit selection; an explicit array including `[]` stays exact, while lessons/index are initialized independently.
**IMPORTANT MUST ATTENTION** preserve valid `specArtifacts`; absence uses strict TC/Section-8 defaults, while an invalid declaration blocks spec setup.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "File looks simple, skip planning" | Plan the selected identity/capability changes and their evidence before editing. |
| "Already know the schema" | Run `--describe`; field names and nested requirements are schema-owned. |
| "Phase N looks fine, skip validate" | Validate every merge so declared optional sections cannot fail later. |
| "Optional section is absent, fill it with a guess" | Omit it until repository evidence or scope supports the capability. |
| "Reference docs are partial, restore the whole registry" | Preserve explicit selection; the registry is metadata, not a required floor. |
| "No spec profile, invent a native format" | Absence means strict TC/Section-8 defaults; only configure a stable evidenced native profile. |
| "Small project, skip task tracking" | Track the selected work regardless of project size. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
