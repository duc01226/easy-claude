# `$docs-manager --mode=init` — reference-doc initialization reference

> Loaded by `docs-manager/SKILL.md`'s Mode Dispatch when invoked as `$docs-manager --mode=init`. This contract is the whole mode: first-time initialization or reconciliation of the project reference-doc set, delegating each applicable target to `scan`. It takes no other arguments.

## Quick Summary

**Goal:** Initialize or reconcile project reference documentation from optional validated project config, the repository's actual capabilities, and the configured document selection.

**Workflow:**

1. **Validate** -- Resolve optional config and validate it when present.
2. **Resolve** -- Separate project-init-owned always-on inputs from task-specific reference docs; resolve the effective selection.
3. **Select** -- Resolve selected built-in targets, explicitly generic custom targets, and manual custom docs; check capability evidence where a built-in target defines one.
4. **Populate** -- Run only applicable selected scans, then verify each changed or unchanged result.
5. **Discovery gate** -- Every initialized or changed doc leads with purpose + critical rules and routes to related docs by trigger; the docs index routes to each of them (Step 5).

**Key Rules:**

- `docs/project-config.json` (or its configured path) is OPTIONAL. When it is absent, initialize on the framework's portable defaults and derive project facts from repository evidence (manifests, lockfiles, scripts, CI definitions, directory layout) — an adopter with no config is a supported, first-class state, never a blocker. When it is present, the minimum valid config is a non-empty `project.name`; omitted capability properties use neutral defaults or cause that capability to be skipped, and a DECLARED but invalid section fails closed for that section rather than being silently replaced by a default.
- A declared but malformed or incomplete config section fails visibly. Repair it through `project-init` / `project-config` before scanning; do not infer replacement values.
- Let the configured docs owner create placeholders; do not hand-create generated scan output.
- The built-in target list is an option catalog, not a required document floor. Scan only a selected, applicable target.
- `lessons.md` and `docs-index-reference.md` are project-init-owned always-on inputs; they are ensured independently from the task-specific `referenceDocs` selection.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Validate Project Config

Read the configured project-config path through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`) and confirm its status is `valid`. The minimum valid shape is:

```json
{ "project": { "name": "Project name" } }
```

If the file is absent, use portable defaults and repository evidence without creating config solely to scan. If it is invalid, report the schema errors and repair through the config workflow. Do not continue with guessed stack, spec, test, UI, or architecture facts.

## Step 2: Resolve Always-On and Task-Specific Docs

Project initialization owns the always-on `lessons.md` and docs-index inputs. Confirm they exist at their configured owner paths; repair them through `project-init` if absent or stale. They are not added to the task-specific selection.

For task-specific docs, use the resolved `referenceDocs` selection from `.claude/hooks/lib/session-init-helpers.cjs`:

- If the property is absent, the resolver supplies the portable baseline plus only capability-supported docs.
- If it is an array, that selection is exact, including `[]`; never append the full registry or infer extra docs.
- `docsRoots.projectReference.path` relocates the reference-doc directory; otherwise it defaults to `docs/project-reference/` (a `docsRoots.projectReference.path` entry in `docs/project-config.json` relocates it).
- A custom doc is declared in `referenceDocs` with required `filename` and `purpose`, and optional `sections`, `templatePath`, and `scanTarget`. The filename is relative to the configured reference-doc root; `templatePath` is project-relative. Both paths use safe POSIX-relative segments and runtime containment checks.
- Built-in filenames use only the exact framework-owned target in `scan/references/targets.md`. A custom doc defaults to manual ownership; `scanTarget: "generic"` opts it into `$scan --target=generic-reference-doc --filename="<filename>"`. Never infer a built-in scanner from a basename.

Compare only selected task-specific docs plus the two always-on inputs against the resolved reference-doc root. Do not treat the target manifest or helper registry as a required-document floor.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each selected file. If it contains the placeholder sentinel, it needs its applicable scan or template owner. A missing optional capability doc is not a failure when it is unselected or unsupported by config/repository evidence.

## Step 3: Select Applicable Scans

Read the target manifest and resolve each selected task-specific doc by exact filename and configured `scanTarget`. Before launching a built-in target, [BLOCKING] read the head of its own file `.claude/skills/scan/references/targets/<key>.md` (its `applies when` and `skip when` lines) and verify that applicability using project config and repository evidence. A target entry is not proof that the project uses that stack or capability. Generic scans use the selected doc's `purpose` and optional `sections`; manual docs are initialized if absent but are not auto-scanned or freshness-tracked.

- Run clearly applicable selected scans without a routine user-choice gate.
- Record `SKIPPED` with the checked config/repository evidence when a selected target's capability is absent.
- Report custom manual docs as owner-managed; do not route them to a nearby built-in target.
- Ask only when real evidence conflicts or the owner/format cannot be determined safely. If no selected scan applies, report that result and stop without fabricating a document.

For each applicable target, invoke its registered built-in command or the exact generic command (for example, `$scan --target=backend-patterns` or `$scan --target=generic-reference-doc --filename="guides/architecture.md"`).

## Step 4: M1-M5/M7 Compliance Gate (BLOCKING)

Apply the shared SDD quality contract only when the selected scan produces or updates a project spec artifact or spec-specific reference. Resolve `specArtifacts` and `specRoots` from the valid project config first:

- A valid native `specArtifacts` profile owns its section roles, identifiers, and evidence carriers. Preserve its native format and trace intent to executable assertions.
- If `specArtifacts` is absent, use the portable strict-default spec contract. Do not apply its section names or ID prefixes to a declared native profile.
- A declared malformed profile is a configuration error; stop and repair it rather than guessing a fallback.
- Apply tech-agnostic/business-visibility rules only to artifact locations governed by the local spec policy, not every project-reference document. Keep claims testable, observable, and evidence-backed under the project's actual contract.

Run the exact verifier declared by the project/framework contract and resolve failures before reporting completion. Do not invent a verifier command; report when none is configured or applicable.

## Step 5: AI-Discovery Gate (final)

Apply the shared content-value and semantic-retention gate in `SYNC:ai-discovery-doc-quality` to each doc this run initialized or changed and to the docs index. Pass requires: purpose, when-to-read and critical rules on the first screen; closing reminders on a long or rule-bearing doc; every pointer to another doc written as `read <path> when <situation>` with an existing target; each selected doc reachable from the docs index or root context (no orphan). Route a failure back to the doc's owner (`$scan --target=<key>`, the docs-index target for index routing gaps, or a `referenceDocs` entry via `$project-config` for a root-context route) instead of patching generated output by hand; a placeholder-only doc still names its purpose and when to read it.

## Configuration

Reference-doc definitions are in the configured project-config file under `referenceDocs`; `.claude/hooks/lib/session-init-helpers.cjs` resolves the portable default selection and templates. The project config schema, not this skill, defines accepted properties.

---

> **[IMPORTANT]** Track multi-target initialization as small tasks with a final consistency review. Do not interrupt an otherwise clear initialization to ask which applicable configured scans to run.

## Mode protocols

The protocol below applies to this mode only; its full text is inline so this reference is self-contained. `docs-manager/SKILL.md` carries none, so `--mode=update` never loads this text.

<!-- SYNC:ai-discovery-doc-quality -->

> **AI-Discovery Doc Quality** — Shared content-value contract for agent guides, root context, reference templates, indexes and registries. Read when authoring, scanning, enhancing or reviewing these documents. Lead with purpose and read-when trigger; preserve action-changing conditions; keep one substantive owner per rule.
>
> 1. **Value:** Every retained section supports purpose/outcome, principle/invariant, actionable instruction, required protocol/decision sequence, exception/precondition, necessary rationale, or triggered navigation. Ask: “What decision or action would become worse if this content disappeared?” With no concrete answer, remove it or move supporting evidence to project-root `tmp/reports/` (disposable-report location); respect a configured disposable-report owner when declared.
> 2. **Authority:** Resolve declared owners, accepted conventions, canonical contracts, public abstractions and enforcing callers/tests. Frequency, proximity and recency do not establish intended practice. Check exemplar preconditions: scope, lifecycle, transaction ownership, host compatibility and trust boundary. Distinguish required practice, permitted exception, legacy implementation, intended migration direction and unresolved behavior. Surface contradictions; never turn an observation into a mandate.
> 3. **Guidance vs evidence:** Keep search transcripts, adoption/drift statistics, exhaustive inventories, incident chronology, repeated validation history, long copied implementations and unrelated audit findings in temporary reports. Preserve numbers that govern action: thresholds, limits, supported versions and machine values. Keep short rationale or examples when they prevent a likely mistake more efficiently than prose and navigation. No universal size, reduction, example or warning-keyword quotas; use readable sentences and visible priorities, not dense shorthand.
> 4. **Discovery:** Write `read <path> when <situation>` and identify the owner and decision/contract/mechanism to inspect. Verify paths, commands, public APIs and symbols; prefer stable owner paths/symbols to fragile line ranges. Use live registries and supported discovery commands instead of parallel inventories. Every guide is reachable from root/index; missing or not-applicable targets are reported once, never routed as usable sources.
> 5. **Retention:** Before substantial rewriting, inventory unique rules, protocols, exceptions/preconditions, safety/authority boundaries, lifecycle/state semantics, navigation and machine-consumed structures in the temporary report. Afterward map each to retained, consolidated into a named owner, replaced by sufficient triggered discovery, or removed with an obsolete/redundant/outside-purpose reason. A pointer replaces a rule only when reliably discoverable at the moment it matters.
> 6. **Ownership:** Inspect heading/anchor/frontmatter/table/header/parser consumers before changes. Preserve required syntax/data. Curated registries, historical audits and durable lessons keep their separate owner contracts; scan never silently edits lessons or operating authority. Fix generated output at its source and regenerate.
> 7. **Attention:** First screen: purpose, read-when and critical rules. Long or rule-bearing guides close with brief reminders of those priorities. For truncating hosts, put irreversible-action boundaries/routing first and measure offsets.
>
> **Final gate:** After enhancement, review decision value, intended practice, exceptions/rationale, discovery validity, semantic dispositions, ownership and readability against the baseline. Use existing structural validators for applicable contracts; section presence or fewer words alone proves nothing. Enhancement cannot reintroduce removed report bulk. Enhance changed hand-owned guides unless the owner records a supported skip; generated guides are enhanced at source. Apply surgically to the changed scope and attention anchors. Preserve action-changing conditions, verified discovery and canonical ownership.

<!-- /SYNC:ai-discovery-doc-quality -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read guides: purpose/read-when and priorities first; retain action-changing rules, exceptions and rationale; verify triggered discovery and parser contracts. Use the content-value and semantic-disposition gate after enhancement; keep evidence in temporary reports and fix generated output at its source.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI-Discovery Doc Quality:** purpose + critical rules on top, reminders at the bottom when long, trigger-based routing to existing docs, no orphan doc.

- **MANDATORY IMPORTANT MUST ATTENTION** finish with the Step 5 AI-discovery gate on every initialized or changed doc and the docs index
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.
