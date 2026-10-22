---
name: project-config
description: '[Utilities] Use when syncing the project-config file (default docs/project-config.json) with the current workspace structure. Not reference docs (scan) or CLAUDE.md (ai-context-refresh).'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. When a workflow step or another skill names a skill, read that file in full yourself (every line, with no line limit; in parts only when output is cut off): a skill whose implicit invocation is off is never loaded for you. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Keep the configured project-config file (default `docs/project-config.json`) valid and accurate while adding only optional project details supported by evidence.

**Summary:**

- The config file is required; the minimum valid content is `{"project":{"name":"<derived name>"}}`.
- A missing config gets a once-a-day notice and an invalid one adds a warning that its facts are unverified; neither blocks the prompt. Repair it with `$project-config` or `$project-init`.
- Read the schema and required project references, then select only the capability areas supported by the task or repository evidence.
- Omitted properties use documented defaults or evidence-backed skips. A declared but incomplete or unsupported section must be repaired or removed explicitly; never treat it as absent.
- Merge and validate selected changes; report omitted capabilities and follow-up work without inventing architecture or test cases.
- Inspect configured owners and conventions, apply the requested changes, then validate. Preserve unrelated project facts and native machine permissions.

**IMPORTANT MUST ATTENTION** follow Recon → Plan → Execute → Validate. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → identify supported capabilities → `$plan` → Execute selected phases (scan → merge → validate → fix) → applicable follow-up scans → self-review

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION ensure the configured project-config file exists and validates; `project.name` is the only required project property
- MUST ATTENTION route missing/invalid config through `$project-config` or `$project-init` before ordinary project-specific work
- MUST ATTENTION add optional properties only for a selected capability or direct repository evidence; omit absent capabilities instead of creating empty sections
- MUST ATTENTION one todo tracking per selected config section or explicit section group — NEVER scan everything in one pass
- MUST ATTENTION validate schema after each merge — `validateConfig(config)` returns PASSED or errors
- MUST ATTENTION review-and-fix after each phase — read back, spot-check paths, self-review
- MUST ATTENTION choose scan granularity and section grouping from repository size and evidence; ask only when product scope or an unresolved project decision is actually required
- Path regexes MUST ATTENTION use `[\\/]` for cross-OS separator matching
- Schema enforced by `.claude/hooks/lib/project-config-schema.cjs`
- MUST ATTENTION when the user asks for help, options, or "what can I configure", run **Help Mode** below and STOP — never start a scan

---

## Contents

- [Quick Summary](#quick-summary)
- [Help Mode (`--help`)](#help-mode---help)
- [⛔ Plan → Review → Execute Workflow](#-plan--review--execute-workflow)
- [Intermediate Workspace](#intermediate-workspace)
- [⛔ Local-Only Workflow Routing — `.claude/.ck.local.json`](#-local-only-workflow-routing--claudecklocaljson)
- [⛔ Schema Protection Rules](#-schema-protection-rules)
- [Deriving the Spec-System Config From Source (`specRoots` + `specArtifacts` + `docsRoots` + `techSpecScan`)](#deriving-the-spec-system-config-from-source-specroots--specartifacts--docsroots--techspecscan)
- [Phase 0: Setup](#phase-0-setup)
- [Phase 1: Read Current Config](#phase-1-read-current-config)
- [Phase 2: Evidence-Selected Config Areas](#phase-2-evidence-selected-config-areas)
- [Phase 3: Consolidate & Write](#phase-3-consolidate--write)
- [Phase 4: Verify (MANDATORY)](#phase-4-verify-mandatory)
- [Phase 5: Follow-Up Tasks](#phase-5-follow-up-tasks)
- [Phase 6: Enhance Selected Guidance (CONDITIONAL)](#phase-6-enhance-selected-guidance-conditional)
- [Phase 7: Self-Review Verification (MANDATORY)](#phase-7-self-review-verification-mandatory)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

## Help Mode (`--help`)

**Trigger:** `$ARGUMENTS` contains `--help`, `-h`, `help`, `options`, `what can I change`, `what does X do`, or any other request for the option surface rather than a config update.

**Help Mode is read-only and terminal.** Run the generator, present its output, answer the question, and STOP. Do NOT create tasks, do NOT scan the repository, and do NOT edit the config file. If the user then asks for a change, re-enter this skill in its normal workflow.

For framework switches with their effective values and owners (team-only versus personal), add
`node .claude/scripts/framework-features.cjs`; a personal preference never goes in the project config.

Read [references/help-mode.md](references/help-mode.md) when Help Mode triggers; it holds the help-generator commands, the question-to-flag table, what each listing shows, and the presentation rules (show the output verbatim and complete, then add the interpretation).

---

## ⛔ Plan → Review → Execute Workflow

### Step 1: Establish Identity and Capability Evidence

Read the configured project-config path and schema. If the file is absent, create the minimum schema-valid document with a non-empty `project.name`, derived from repository/package metadata or, when no metadata names the project, the repository-root directory. Do not infer language, architecture, framework, testing, UI, database, or product capabilities from the name.

Inventory only enough of the repository to answer the task and identify real manifests, source roots, tests, documentation, and configured tooling. Record repository size only when it helps group the selected work. Scale affects task grouping; it never creates a requirement to populate optional sections.

### Step 2: Create Plan (`$plan`)

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

### Step 3: Execute

Per selected phase: todo tracking → inspect evidence → merge → validate → spot-check → fix → next phase. Record a capability as skipped when evidence shows it does not apply; do not create placeholder sections to make a phase appear complete.

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

The configured project-config file (default `docs/project-config.json`) is **team-shared and committed**. Three routing settings have a portable developer-local override: `portability.workflowRouteMode` (`ask` | `auto` | `off`, how a matched workflow starts; the legacy boolean `portability.workflowAutoDetect` reads as `off`/`ask`), `portability.workflowRouteProtocol` (optional custom protocol text the runtime route hook appends), and `portability.workflowActivation` (per-project workflow activation tiers). Their local values belong in `.claude/.ck.local.json`, inside the copied framework bundle and ignored by `.claude/.gitignore`.

Read [references/local-workflow-routing.md](references/local-workflow-routing.md) when the request changes one of these three routing settings or asks for a personal or machine-local setting; it holds the who-is-it-for routing table (ask when ambiguous), the local-override write steps (confirm the file is git-ignored first, write only the overridden keys), the resolution cascade, the custom route protocol semantics and bounds, the activation tiers, and the rule that applying an override needs no `$ai-context-refresh` or `$sync-codex`.

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

Read the live schema before choosing fields: run `node .claude/hooks/lib/project-config-schema.cjs --describe`. It owns exact fields, nested requirements and capability semantics; do not maintain a second field inventory here. Preserve existing deprecated v1 data and omit deprecated sections in new projects as required above.

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

Read [references/spec-and-docs-roots-config.md](references/spec-and-docs-roots-config.md) when the task declares, changes or validates `specRoots`, `specArtifacts`, `docsRoots` or `techSpecScan`; it holds the per-field derivation tables, the five rules that bind every `docsRoots` key (validate on the fail-closed plane), and the `techSpecScan` two-capture-group contract with its check command.

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

Select only the config areas that the task requests or repository evidence supports. Each selected area becomes one todo tracking or a named child inside a compact group. Per task: investigate → record evidence → merge → validate. Record why an absent capability is skipped. Never scan or populate every schema section just because the schema supports it.

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

Read [references/windows-git-capability.md](references/windows-git-capability.md) when the task declares or changes `hooks.windowsGit` (§2v); it holds its defaults, the accepted Git-for-Windows root, the startup-only repair worker and its fail-closed boundaries.

### 2d. Framework Patterns

Declare `framework` only when the repository uses an identifiable framework or stable shared patterns worth routing to. Derive its name and search keywords from manifests, configuration, and repeated source usage; omit it for an unknown or absent framework.

### 2e. Context Groups

Declare `contextGroups[]` only for stable path-scoped conventions that materially improve work on those files. Every declared group needs a real matcher and evidence-backed rules/references; do not add an empty catch-all just to fill the section. Keep rules concise and checkable, and follow project-specific patterns instead of importing examples from another stack.

### 2f–2h. Design System, Styling, Component System

These are separate optional capabilities. Add `designSystem` only when the project owns maintained design tokens/components or a normative design guide; add `styling` only when there is a real styling technology and stable patterns; add `componentSystem` only when an established component convention helps route work. Omit unused sections and do not create placeholder docs or mappings.

Read [references/testing-e2e-config.md](references/testing-e2e-config.md) when the task configures `testing`, performance-test pointers, `e2eTesting` (including `execution`), `integrationTestVerify` or `experienceVerification` (§2i–2j); it holds their field shapes, the reference-only credential rule, the E2E execution discovery order and the web human-QC rules.

### 2k–2n. Databases, Messaging, API, Infrastructure

These top-level sections are optional. Configure a database, messaging, API, or infrastructure capability only when repository files, active task scope, or project-owned documentation confirm it. Do not add empty sections or guess a provider from a dependency name alone.

- `databases {}` (freeform)
- `messaging { broker, patterns[], consumerConvention }`
- `api { style, docsFormat, docsPath, authPattern }`
- `infrastructure { containerization, orchestration, cicd{ tool, configPath } }`

Read [references/graph-connectors-config.md](references/graph-connectors-config.md) when the repository has both frontend and backend capabilities and the task needs an API connection map (§2o), or source shows traceable producer/consumer relationships to declare as `graphConnectors.implicitConnections` (§2p); it holds the framework signal table, the matching algorithm, exact schema fields, detection heuristics and a correct example.

Read [references/spec-and-docs-roots-config.md](references/spec-and-docs-roots-config.md) when the task uses a documentation root or evidence shows one moved (§2s `docsRoots`); it holds the detect, declare-only-moved-roots and MANDATORY validate steps.

### 2q. Reference Docs — Optional Task-Specific Selection

`referenceDocs` is optional. If absent, let the resolver choose its portable baseline (which may be empty) plus references supported by configured or repository-evidenced capabilities. If present, the array is the authoritative task-specific selection, including an explicit empty array; preserve its selected subset and order. Never append a fixed catalog to an explicit selection or write the entire catalog into a project config. The catalog is metadata for valid scan targets and aliases, not a mandatory project-doc floor.

Each entry requires `filename` and `purpose`; `sections` and `templatePath` are optional. `filename` is a project-reference-root-relative POSIX path (nested folders are allowed); `templatePath` is project-root-relative. Reject absolute paths, backslashes, empty/dot/traversal segments, and unsafe physical symlink resolutions. Do not use a template outside the project or write a reference outside its configured root.

The optional `workflowPatterns.featureDocTemplate` destination is also project-root-relative. Schema validation rejects unsafe lexical paths, and SessionStart checks physical containment before copying the framework template.

`scanTarget` is optional. Built-in filenames use their framework-owned scan target and must omit this property. A custom filename defaults to `manual`, so it can be curated without automatic scan or freshness claims. `scanTarget: "generic"` opts that selected custom doc into `$scan --target=generic-reference-doc --filename="<filename>"`, using its configured purpose and optional sections. Generic docs receive conservative repository-wide source-impact routing; choose `manual` when only its project owner should update it. Any other explicit target is invalid; projects cannot register executable scanner names through config.

Project-init separately ensures the always-on `lessons.md` and `docs-index-reference.md` inputs at the configured project-reference root. They do not become implicit additions to a task-specific `referenceDocs` selection.

Use the normalizer only to inspect how the current setting resolves. Do not write its portable defaults back into an absent property, and do not change an explicit list into the full registry:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');const c=loadProjectConfig()||{};console.log(JSON.stringify({declared:Object.prototype.hasOwnProperty.call(c,'referenceDocs'),resolved:h.normalizeReferenceDocs(c.referenceDocs,c)},null,2))"
```

- Leave `referenceDocs` absent when the resolver's portable baseline plus capability-aware defaults are the desired behavior.
- For an explicit selection, configure only the docs the project wants the framework to select. Normalize aliases/deduplication only within that selection, preserving intentional `[]`; never infer a broader selection from files on disk alone.
- Keep `lessons.md` and `docs-index-reference.md` under the configured project-reference root through the independent project-init/bootstrap path, regardless of the task-specific selection.
- Generate a selected project reference only when its scan target applies and its source evidence exists. Do not create unselected docs, fabricate content, or rename/delete files merely to match the framework catalog.
- Write `purpose` for AI discovery: its first clause (up to the first `. ` or `; `) is rendered into the root context's Doc Lookup table — as the whole route for a custom doc, or as `Holds: …` after the framework trigger for a built-in doc outside the fixed docs-index, lessons and spec rows (those never render `purpose`). Avoid an abbreviation such as "e.g. " inside that first clause: it ends the clause early. Open a custom doc's purpose with the situation that should send an agent to it (e.g. "Before changing billing rules — invariants and owners"), not a bare topic name.
- Declare a selected doc the project does not use with `notApplicable: true` (or a purpose that opens with `N/A`) so generated context names it once as a skip instead of routing agents to it; incidental prose such as "mocks are not applicable" does not count.

Read [references/spec-and-docs-roots-config.md](references/spec-and-docs-roots-config.md) when a spec/test-artifact capability exists or is selected (§2t native `specArtifacts` profile); it holds the strict-default preservation rule, the supported v1 fields and closed carriers, many-to-many proof, and fail-closed validation.

Read [references/convention-classes.md](references/convention-classes.md) when useful context groups or opt-in convention injection are selected (§2r); it holds the detector commands and the additive merge, atomic write and opt-in-only rules.

---

## Phase 3: Consolidate & Write

Merge only selected properties. Preserve existing user-authored values; replace a value only with stronger source evidence. Do not add empty objects or arrays for skipped capabilities.

## Phase 4: Verify (MANDATORY)

1. Schema validation — MUST ATTENTION pass with zero errors for the configured file, including every declared optional section.
2. Spot-check each newly declared path or matcher against the repository; do not require service paths when the project has no services.
3. Run focused config/hook checks for the changed behavior and the project's normal verification for any generated output.

## Phase 5: Follow-Up Tasks

Queue only the scan targets selected by `referenceDocs` or supported by repository evidence. Use the scan catalog's trigger for each selected target; omit absent frontend, backend, styling, design-system, domain, test, seed-data, E2E, and spec capabilities. A selected target with no source evidence is a visible blocker or skip, not a fabricated reference.

Then update root AI context when this config change affects it. Run `$graph-code --mode=build` only when graph tooling is configured/available and the selected task needs a graph; otherwise record an evidence-backed skip.

## Phase 6: Enhance Selected Guidance (CONDITIONAL)

Run `$prompt-enhance` only on selected generated/updated project guidance when its instruction quality needs review; do not process unrelated or unselected reference docs.

## Phase 7: Self-Review Verification (MANDATORY)

Perform one additional read-only verification of the saved config against current source evidence. Repeat Phase 4's schema and path/matcher checks; confirm the required identity, selected capabilities, intentional omissions and preserved user-owned values. Record the evidence and result without creating another plan or re-invoking the whole skill.

If verification fails, mark the outcome blocked, return to the affected selected phase for a scoped correction, then validate and repeat this verification. If the same failure recurs without progress, stop and report the unresolved evidence or decision needed; never expand the scan or restart the full workflow to hide a failed check.

## Output

Report: required config path and project identity; optional sections updated; evidence and source paths for declared values; capability areas skipped with reasons; reference selection semantics used; profile-aware spec behavior when relevant; validation results; and applicable follow-up tasks.

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

## Closing Reminders

**MUST ATTENTION** selected review setup inspects classifiers/rules → previews assignments → merges only accepted proposals by exact ID → validates; preserve manual/edited policy and keep acquisition authority machine-local.

**IMPORTANT MUST ATTENTION Goal:** Keep the required project config schema-valid, with only evidence-backed optional capabilities via Plan → Review → Execute.

**IMPORTANT MUST ATTENTION** read the configured project-config file, docs index, `lessons.md`, task-required references, and exact schema before scanning; bootstrap missing config with a derived project name.
**IMPORTANT MUST ATTENTION** select scans from requested or evidenced capabilities; scale controls grouping only and never forces optional sections.
**IMPORTANT MUST ATTENTION** plan first — recon → `$plan` → execute. Plan review is explicit user opt-in, never automatic. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** config file and non-empty `project.name` are required; optional properties are omitted when unsupported or unevidenced.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one todo tracking per selected config section or explicit section group — NEVER scan everything in one pass.
**IMPORTANT MUST ATTENTION** keep absent `referenceDocs` distinct from explicit selection; an explicit array including `[]` stays exact, while lessons/index are initialized independently.
**IMPORTANT MUST ATTENTION** preserve valid `specArtifacts`; absence uses strict TC/Section-8 defaults, while an invalid declaration blocks spec setup.


**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
