---
name: docs-init
version: 2.0.0
description: '[Documentation] Use when initializing project reference docs via hook + scan skills.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Initialize or reconcile project reference documentation from a valid required project config, the repository's actual capabilities, and the configured document selection.

**Workflow:**

1. **Validate** -- Confirm the configured project-config file exists and is schema-valid.
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

If the file is missing, run project initialization to create the minimum config first. If it is invalid, report the schema errors and repair through the config workflow. Do not continue with guessed stack, spec, test, UI, or architecture facts.

## Step 2: Resolve Always-On and Task-Specific Docs

Project initialization owns the always-on `lessons.md` and docs-index inputs. Confirm they exist at their configured owner paths; repair them through `project-init` if absent or stale. They are not added to the task-specific selection.

For task-specific docs, use the resolved `referenceDocs` selection from `.claude/hooks/lib/session-init-helpers.cjs`:

- If the property is absent, the resolver supplies the portable baseline plus only capability-supported docs.
- If it is an array, that selection is exact, including `[]`; never append the full registry or infer extra docs.
- `docsRoots.projectReference.path` relocates the reference-doc directory; otherwise it defaults to `docs/project-reference/` (a `docsRoots.projectReference.path` entry in `docs/project-config.json` relocates it).
- A custom doc is declared in `referenceDocs` with required `filename` and `purpose`, and optional `sections`, `templatePath`, and `scanTarget`. The filename is relative to the configured reference-doc root; `templatePath` is project-relative. Both paths use safe POSIX-relative segments and runtime containment checks.
- Built-in filenames use only the exact framework-owned target in `scan/references/targets.md`. A custom doc defaults to manual ownership; `scanTarget: "generic"` opts it into `/scan --target=generic-reference-doc --filename="<filename>"`. Never infer a built-in scanner from a basename.

Compare only selected task-specific docs plus the two always-on inputs against the resolved reference-doc root. Do not treat the target manifest or helper registry as a required-document floor.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each selected file. If it contains the placeholder sentinel, it needs its applicable scan or template owner. A missing optional capability doc is not a failure when it is unselected or unsupported by config/repository evidence.

## Step 3: Select Applicable Scans

Read the target manifest and resolve each selected task-specific doc by exact filename and configured `scanTarget`. Before launching a built-in target, verify its applicability using project config and repository evidence. A target entry is not proof that the project uses that stack or capability. Generic scans use the selected doc's `purpose` and optional `sections`; manual docs are initialized if absent but are not auto-scanned or freshness-tracked.

- Run clearly applicable selected scans without a routine user-choice gate.
- Record `SKIPPED` with the checked config/repository evidence when a selected target's capability is absent.
- Report custom manual docs as owner-managed; do not route them to a nearby built-in target.
- Ask only when real evidence conflicts or the owner/format cannot be determined safely. If no selected scan applies, report that result and stop without fabricating a document.

For each applicable target, invoke its registered built-in command or the exact generic command (for example, `/scan --target=backend-patterns` or `/scan --target=generic-reference-doc --filename="guides/architecture.md"`).

## Step 4: M1-M5/M7 Compliance Gate (BLOCKING)

Apply the shared SDD quality contract only when the selected scan produces or updates a project spec artifact or spec-specific reference. Resolve `specArtifacts` and `specRoots` from the valid project config first:

- A valid native `specArtifacts` profile owns its section roles, identifiers, and evidence carriers. Preserve its native format and trace intent to executable assertions.
- If `specArtifacts` is absent, use the portable strict-default spec contract. Do not apply its section names or ID prefixes to a declared native profile.
- A declared malformed profile is a configuration error; stop and repair it rather than guessing a fallback.
- Apply tech-agnostic/business-visibility rules only to artifact locations governed by the local spec policy, not every project-reference document. Keep claims testable, observable, and evidence-backed under the project's actual contract.

Run the exact verifier declared by the project/framework contract and resolve failures before reporting completion. Do not invent a verifier command; report when none is configured or applicable.

## Step 5: AI-Discovery Gate (final)

Apply `SYNC:ai-discovery-doc-quality` to each doc this run initialized or changed and to the docs index. Pass requires: purpose, when-to-read and critical rules on the first screen; closing reminders on a long or rule-bearing doc; every pointer to another doc written as `read <path> when <situation>` with an existing target; each selected doc reachable from the docs index or root context (no orphan). Route a failure back to the doc's owner (`/scan --target=<key>`, the docs-index target for index routing gaps, or a `referenceDocs` entry via `/project-config` for a root-context route) instead of patching generated output by hand; a placeholder-only doc still names its purpose and when to read it.

## Configuration

Reference-doc definitions are in the configured project-config file under `referenceDocs`; `.claude/hooks/lib/session-init-helpers.cjs` resolves the portable default selection and templates. The project config schema, not this skill, defines accepted properties.

---

> **[IMPORTANT]** Track multi-target initialization as small tasks with a final consistency review. Do not interrupt an otherwise clear initialization to ask which applicable configured scans to run.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Apply critical + sequential thinking; cite proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **AI-Discovery Doc Quality:** purpose + critical rules on top, reminders at the bottom when long, trigger-based routing to existing docs, no orphan doc.

- **MANDATORY IMPORTANT MUST ATTENTION** finish with the Step 5 AI-discovery gate on every initialized or changed doc and the docs index
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
