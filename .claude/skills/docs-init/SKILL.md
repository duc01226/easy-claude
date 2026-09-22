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

## Configuration

Reference-doc definitions are in the configured project-config file under `referenceDocs`; `.claude/hooks/lib/session-init-helpers.cjs` resolves the portable default selection and templates. The project config schema, not this skill, defines accepted properties.

---

> **[IMPORTANT]** Track multi-target initialization as small tasks with a final consistency review. Do not interrupt an otherwise clear initialization to ask which applicable configured scans to run.

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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Apply critical + sequential thinking; cite proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
